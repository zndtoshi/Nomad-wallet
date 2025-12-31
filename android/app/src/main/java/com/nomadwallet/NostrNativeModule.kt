package com.nomadwallet

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import rust.nostr.sdk.*
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * React Native Native Module for Nostr SDK (Rust)
 * 
 * Wraps the Rust nostr-sdk library and exposes it to React Native JavaScript layer.
 * Based on android-balancebridge's NostrManager implementation.
 */
@ReactModule(name = "NostrNativeModule")
class NostrNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val TAG = "NostrNativeModule"

    // Rust SDK instances
    private var client: Client? = null
    private var signer: NostrSigner? = null
    private var keys: Keys? = null

    // Connection state
    private var isConnected = false
    private var relayUrls: List<String> = emptyList()
    private val subscriptions = ConcurrentHashMap<String, String>() // subId -> rustSubId
    private val pendingRequests = ConcurrentHashMap<String, Promise>()

    // Event listeners (JavaScript callbacks)
    private val eventListeners = ConcurrentHashMap<String, (Event) -> Unit>()
    private val errorListeners = ConcurrentHashMap<String, (String) -> Unit>()

    override fun getName(): String = "NostrNativeModule"

    /**
     * Initialize keys (generate new or load existing)
     */
    @ReactMethod
    fun initializeKeys(secretKeyHex: String?, promise: Promise) {
        scope.launch {
            try {
                keys = if (!secretKeyHex.isNullOrBlank()) {
                    Keys.parse(secretKeyHex)
                } else {
                    Keys.generate()
                }
                signer = NostrSigner.keys(keys!!)
                
                val pubkeyHex = keys!!.publicKey().toHex()
                Log.i(TAG, "Keys initialized. Pubkey: $pubkeyHex")
                
                val result = Arguments.createMap().apply {
                    putString("publicKey", pubkeyHex)
                    putString("secretKey", keys!!.secretKey().toHex())
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "initializeKeys failed", e)
                promise.reject("INIT_KEYS_ERROR", e.message ?: "Failed to initialize keys", e)
            }
        }
    }

    /**
     * Connect to Nostr relays
     */
    @ReactMethod
    fun connect(relays: ReadableArray, promise: Promise) {
        try {
            // Parse relays synchronously (fast operation)
            val relayList = mutableListOf<String>()
            for (i in 0 until relays.size()) {
                relayList.add(relays.getString(i))
            }

            if (relayList.isEmpty()) {
                promise.reject("INVALID_RELAYS", "No relays provided")
                return
            }

            relayUrls = relayList
            
            // Resolve promise immediately - don't wait for connection
            isConnected = true
            Log.i(TAG, "Connection process started for ${relayList.size} relay(s) (non-blocking)")
            promise.resolve(null)
            
            // Do actual connection work in background
            scope.launch {
                try {
                    // Ensure keys and signer exist
                    if (keys == null || signer == null) {
                        Log.i(TAG, "Generating keys for connection...")
                        keys = Keys.generate()
                        signer = NostrSigner.keys(keys!!)
                        Log.i(TAG, "Keys generated")
                    }

                    // Create client if needed
                    if (client == null) {
                        Log.i(TAG, "Creating client...")
                        client = Client(signer = signer!!)
                        
                        // Register notification handler
                        client!!.handleNotifications(object : HandleNotification {
                            override suspend fun handleMsg(relayUrl: RelayUrl, msg: RelayMessage) {
                                Log.d(TAG, "Relay message from $relayUrl: $msg")
                            }

                            override suspend fun handle(relayUrl: RelayUrl, subscriptionId: String, event: Event) {
                                Log.d(TAG, "handle() called: relay=$relayUrl, subId=$subscriptionId, kind=${event.kind()}, pubkey=${event.author().toHex()}")
                                onIncomingEvent(relayUrl, subscriptionId, event)
                            }
                        })
                        Log.i(TAG, "Client created")
                    }

                    // Add relays
                    val clientRef = client!!
                    for (url in relayList) {
                        Log.i(TAG, "Adding relay: $url")
                        try {
                            clientRef.addRelay(RelayUrl.parse(url))
                            Log.i(TAG, "Successfully added relay: $url")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to add relay: $url", e)
                            // Continue with other relays
                        }
                    }

                    // Connect with timeout
                    Log.i(TAG, "Connecting to relays...")
                    try {
                        withTimeout(15000) { // 15 second timeout
                            clientRef.connect()
                        }
                        Log.i(TAG, "Successfully connected to ${relayList.size} relay(s)")
                    } catch (e: TimeoutCancellationException) {
                        Log.w(TAG, "Connection timeout after 15 seconds - connections may still be establishing in background")
                    } catch (e: Exception) {
                        Log.e(TAG, "Connection error (non-fatal)", e)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Background connection setup failed", e)
                    // Don't fail the promise - it's already resolved
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "connect failed", e)
            promise.reject("CONNECT_ERROR", e.message ?: "Failed to connect to relays", e)
        }
    }

    /**
     * Publish an event
     */
    @ReactMethod
    fun publishEvent(
        kind: Int,
        content: String,
        tags: ReadableArray,
        promise: Promise
    ) {
        scope.launch {
            try {
                val c = client
                if (c == null || !isConnected) {
                    promise.reject("NOT_CONNECTED", "Client not connected")
                    return@launch
                }

                val kindObj = Kind(kind.toUShort())
                val tagList = mutableListOf<Tag>()
                
                for (i in 0 until tags.size()) {
                    val tagArray = tags.getArray(i)
                    val tagValues = mutableListOf<String>()
                    for (j in 0 until tagArray.size()) {
                        tagValues.add(tagArray.getString(j))
                    }
                    tagList.add(Tag.parse(tagValues))
                }

                val builder = EventBuilder(kind = kindObj, content = content)
                    .tags(tagList)

                Log.i(TAG, "Publishing event kind=$kind")
                c.sendEventBuilder(builder)
                
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "publishEvent failed", e)
                promise.reject("PUBLISH_ERROR", e.message ?: "Failed to publish event", e)
            }
        }
    }

    /**
     * Subscribe to events
     */
    @ReactMethod
    fun subscribe(filterJson: String, promise: Promise) {
        scope.launch {
            try {
                val c = client
                if (c == null || !isConnected) {
                    promise.reject("NOT_CONNECTED", "Client not connected")
                    return@launch
                }

                // Parse filter from JSON
                val filterObj = JSONObject(filterJson)
                
                // Build filter step by step, ensuring each method's return value is captured
                // The Rust SDK Filter API uses a builder pattern where methods may return new Filter instances
                var filter = Filter()

                // Parse and add kinds - MUST reassign to capture returned filter
                if (filterObj.has("kinds")) {
                    val kindsArray = filterObj.getJSONArray("kinds")
                    val kinds = mutableListOf<Kind>()
                    for (i in 0 until kindsArray.length()) {
                        kinds.add(Kind(kindsArray.getInt(i).toUShort()))
                    }
                    filter = filter.kinds(kinds)
                }

                // Parse and add authors - THIS IS CRITICAL for filtering noise from public relays
                // MUST reassign to capture returned filter
                if (filterObj.has("authors")) {
                    val authorsArray = filterObj.getJSONArray("authors")
                    val authors = mutableListOf<PublicKey>()
                    for (i in 0 until authorsArray.length()) {
                        val authorHex = authorsArray.getString(i)
                        try {
                            authors.add(PublicKey.parse(authorHex))
                            Log.d(TAG, "Added author filter: $authorHex")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to parse author pubkey: $authorHex", e)
                        }
                    }
                    if (authors.isNotEmpty()) {
                        filter = filter.authors(authors)
                        Log.i(TAG, "Subscription filter includes ${authors.size} author(s)")
                    }
                }

                // Add limit if present
                // Note: limit() method might not be available in all Rust SDK versions
                // Commenting out for now - can be added if SDK supports it
                // if (filterObj.has("limit")) {
                //     val limit = filterObj.getInt("limit")
                //     filter = filter.limit(limit.toUInt())
                //     Log.d(TAG, "Subscription filter limit: $limit")
                // }

                // Subscribe with properly configured filter
                val subId = UUID.randomUUID().toString()
                
                // Log filter details for debugging
                val kindsArray = filterObj.optJSONArray("kinds")
                val authorsArray = filterObj.optJSONArray("authors")
                val kindsStr = if (kindsArray != null) {
                    (0 until kindsArray.length()).joinToString(",") { kindsArray.getInt(it).toString() }
                } else "none"
                Log.i(TAG, "Subscribing with filter: kinds=[$kindsStr], authors=${authorsArray?.length() ?: 0}, limit=${filterObj.optInt("limit", -1)}")
                
                c.subscribe(filter)  // ✅ Now uses the properly configured filter
                subscriptions[subId] = subId // Store subscription
                
                Log.i(TAG, "Subscribed with ID: $subId")
                promise.resolve(subId)
            } catch (e: Exception) {
                Log.e(TAG, "subscribe failed", e)
                promise.reject("SUBSCRIBE_ERROR", e.message ?: "Failed to subscribe", e)
            }
        }
    }

    /**
     * Unsubscribe from a subscription
     */
    @ReactMethod
    fun unsubscribe(subscriptionId: String, promise: Promise) {
        scope.launch {
            try {
                subscriptions.remove(subscriptionId)
                Log.i(TAG, "Unsubscribed: $subscriptionId")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "unsubscribe failed", e)
                promise.reject("UNSUBSCRIBE_ERROR", e.message ?: "Failed to unsubscribe", e)
            }
        }
    }

    /**
     * Disconnect from all relays
     */
    @ReactMethod
    fun disconnect(promise: Promise) {
        scope.launch {
            try {
                client?.disconnect()
                client = null
                isConnected = false
                subscriptions.clear()
                Log.i(TAG, "Disconnected from all relays")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "disconnect failed", e)
                promise.reject("DISCONNECT_ERROR", e.message ?: "Failed to disconnect", e)
            }
        }
    }

    /**
     * Handle incoming events from Rust SDK
     */
    private fun onIncomingEvent(relayUrl: RelayUrl, subscriptionId: String, event: Event) {
        try {
            Log.i(TAG, "onIncomingEvent: relay=$relayUrl, subId=$subscriptionId, kind=${event.kind()}, pubkey=${event.author().toHex().substring(0, 16)}...")
            
            // Get event as JSON string (simplest approach, matches android-balancebridge)
            val eventJson = try {
                event.asJson()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to serialize event to JSON", e)
                ""
            }

            if (eventJson.isEmpty()) {
                Log.w(TAG, "Event JSON is empty, skipping")
                return
            }

            val eventMap: WritableMap = Arguments.createMap().apply {
                putString("json", eventJson)
                putString("subscriptionId", subscriptionId)
                putString("relayUrl", relayUrl.toString())
            }

            // Emit event to JavaScript
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("NostrEvent", eventMap)

            Log.i(TAG, "✅ Emitted event to JavaScript: kind=${event.kind()}, pubkey=${event.author().toHex().substring(0, 16)}..., JSON length=${eventJson.length}")
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming event", e)
        }
    }

    /**
     * Get connection status
     */
    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(isConnected)
    }

    /**
     * Get relay URLs
     */
    @ReactMethod
    fun getRelays(promise: Promise) {
        val array: WritableArray = Arguments.createArray()
        for (url in relayUrls) {
            array.pushString(url)
        }
        promise.resolve(array)
    }
}

