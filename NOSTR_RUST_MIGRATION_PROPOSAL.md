# React Native Rust nostr-sdk Integration Proposal

## Problem Statement

The current React Native implementation uses `nostr-tools` JavaScript library, which has WebSocket URL normalization issues in React Native's JavaScript environment. Despite multiple patching attempts, the `normalizeURL` function continues to fail with "Invalid URL" errors when processing WebSocket URLs like `wss://relay.damus.io`.

## Solution: Native Rust SDK Integration

Replace `nostr-tools` with the native Rust `nostr-sdk` library (same approach as `android-balancebridge`), exposed via React Native's Native Modules API.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Layer                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TypeScript: NostrClient.ts / BalanceBridge.ts        │  │
│  │  (Same API surface, calls native module)              │  │
│  └──────────────────┬────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────┘
                      │ NativeModules API
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Native Android Layer                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Kotlin: NostrNativeModule.kt                         │  │
│  │  (Wraps Rust SDK, exposes React Native methods)       │  │
│  └──────────────────┬────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────┘
                      │ JNI/UNIFFI
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Rust SDK Layer                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  org.rust-nostr:nostr-sdk:0.44.1                      │  │
│  │  (Same library as android-balancebridge)              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Approach

### Option 1: Native Module with Rust SDK (RECOMMENDED)

**Pros:**
- ✅ Uses proven Rust SDK (same as android-balancebridge)
- ✅ No JavaScript WebSocket/URL issues
- ✅ Better performance and reliability
- ✅ Direct reuse of android-balancebridge patterns

**Cons:**
- ⚠️ Requires Android native code (Kotlin/Java)
- ⚠️ iOS support would need separate implementation
- ⚠️ More complex build setup

**Steps:**
1. Add Rust SDK dependency to Android Gradle
2. Create Kotlin native module wrapping Rust SDK
3. Expose methods via React Native NativeModules
4. Create TypeScript wrapper maintaining current API
5. Migrate NostrClient and BalanceBridge implementations

### Option 2: UniFFI Bindings (Alternative)

**Pros:**
- ✅ Direct Rust bindings without Kotlin wrapper
- ✅ Potential for iOS support

**Cons:**
- ⚠️ More complex setup (requires Rust build system)
- ⚠️ Limited React Native support
- ⚠️ Not well-documented for React Native

**Verdict:** Option 1 is recommended because:
- android-balancebridge already proves this approach works
- We can directly reuse existing Kotlin patterns
- Simpler implementation and maintenance
- iOS is not a current requirement

## Required API Surface

Based on current implementation analysis:

### NostrClient API (to maintain compatibility)
```typescript
class NostrClient {
  connect(relays: string[]): Promise<void>
  publish(event: UnsignedEvent, privateKey: string): Promise<void>
  subscribe(filter: Filter, onEvent: Function, onError?: Function): Promise<string>
  unsubscribe(subId: string): void
  unsubscribeAll(): void
  disconnect(): Promise<void>
  setPrivateKey(privateKey: string): void
  getRelayStatuses(): RelayStatus[]
  getConnectedRelays(): string[]
  isClientConnected(): boolean
  getRelays(): string[]
}
```

### BalanceBridge API (to maintain compatibility)
```typescript
class BalanceBridge {
  initialize(qrPayload: BalanceBridgeQRPayload): Promise<void>
  getBalance(addresses: string[], privateKey: string): Promise<BalanceResponse>
  getUTXOs(addresses: string[], privateKey: string): Promise<UTXOResponse>
  broadcastTx(txHex: string, privateKey: string): Promise<BroadcastResponse>
  getFeeEstimates(privateKey: string): Promise<FeeResponse>
  disconnect(): Promise<void>
  getState(): BalanceBridgeState
  isConnected(): boolean
  getServerPubkey(): string | null
  getRelays(): string[]
  getConnectedRelays(): string[]
}
```

## Implementation Plan

### Phase 1: Native Module Setup

1. **Update Android build.gradle**
   ```gradle
   dependencies {
       // Add Rust SDK (same as android-balancebridge)
       implementation("org.rust-nostr:nostr-sdk:0.44.1")
   }
   ```

2. **Create Kotlin Native Module**
   - `android/app/src/main/java/com/nomadwallet/NostrNativeModule.kt`
   - Wrap Rust SDK: `Client`, `Keys`, `NostrSigner`, `EventBuilder`, `Filter`
   - Implement React Native `NativeModule` interface
   - Expose async methods via `Promise`

3. **Package Registration**
   - `android/app/src/main/java/com/nomadwallet/NostrNativePackage.kt`
   - Register module in `MainApplication.kt`

### Phase 2: TypeScript Wrapper

1. **Create Native Module Interface**
   - `src/services/nostr/NostrNativeModule.ts`
   - TypeScript definitions matching native methods
   - Uses `NativeModules` from `react-native`

2. **Refactor NostrClient**
   - Replace `nostr-tools` imports with native module calls
   - Maintain same public API
   - Handle event callbacks via native events

3. **Update BalanceBridge**
   - Minimal changes (uses NostrClient)
   - Verify all methods work correctly

### Phase 3: Migration & Testing

1. **Remove nostr-tools dependency**
   - Remove from `package.json`
   - Remove patches from `patches/` directory
   - Clean up unused code

2. **Testing**
   - Test pairing with BalanceBridge server
   - Test all BalanceBridge operations (balance, UTXOs, broadcast, fees)
   - Verify error handling
   - Test reconnection scenarios

3. **Cleanup**
   - Remove unused URL normalization code
   - Update documentation

## File Structure

```
nomad-wallet/
├── android/
│   └── app/
│       └── src/main/java/com/nomadwallet/
│           ├── NostrNativeModule.kt          (NEW)
│           ├── NostrNativePackage.kt         (NEW)
│           ├── MainActivity.kt               (UPDATE: register package)
│           └── MainApplication.kt            (UPDATE: register package)
├── src/
│   └── services/
│       └── nostr/
│           ├── NostrNativeModule.ts          (NEW: TypeScript wrapper)
│           ├── NostrClient.ts                (REFACTOR: use native module)
│           └── BalanceBridge.ts              (MINOR UPDATE: verify compatibility)
└── package.json                              (UPDATE: remove nostr-tools)
```

## Kotlin Native Module API Design

Based on android-balancebridge's `NostrManager.kt`:

```kotlin
@ReactModule(name = "NostrNativeModule")
class NostrNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    // Native SDK instances
    private var client: Client? = null
    private var signer: NostrSigner? = null
    private var keys: Keys? = null
    
    // Initialize with relays
    @ReactMethod
    fun connect(relays: ReadableArray, promise: Promise)
    
    // Generate or load keys
    @ReactMethod
    fun initializeKeys(secretKeyHex: String?, promise: Promise)
    
    // Publish event
    @ReactMethod
    fun publishEvent(
        kind: Int,
        content: String,
        tags: ReadableArray,
        promise: Promise
    )
    
    // Subscribe to events
    @ReactMethod
    fun subscribe(
        filterJson: String,  // JSON string of filter
        promise: Promise     // Returns subscription ID
    )
    
    // Send event (used for BalanceBridge requests)
    @ReactMethod
    fun sendEvent(
        kind: Int,
        content: String,
        tags: ReadableArray,
        promise: Promise
    )
    
    // Disconnect
    @ReactMethod
    fun disconnect(promise: Promise)
    
    // Event listener (sends events to JS via EventEmitter)
    // Note: React Native NativeModules can emit events
}
```

## Key Implementation Details

### Event Handling

React Native NativeModules support event emission:

```kotlin
// Send event to JavaScript
sendEvent(reactContext, "NostrEvent", Arguments.createMap().apply {
    putString("subscriptionId", subId)
    putString("eventJson", event.asJson())
})
```

TypeScript side:
```typescript
import { NativeEventEmitter, NativeModules } from 'react-native';

const { NostrNativeModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(NostrNativeModule);

eventEmitter.addListener('NostrEvent', (event) => {
  // Handle incoming event
});
```

### Key Management

- Keys can be generated in Rust SDK or loaded from hex string
- Store in AsyncStorage (TypeScript side) or SharedPreferences (Kotlin side)
- Same approach as android-balancebridge

### Filter Serialization

- Convert TypeScript `Filter` object to JSON string
- Parse in Kotlin and create Rust SDK `Filter` object
- Maintain compatibility with current Filter interface

## Migration Strategy

1. **Incremental Migration**
   - Keep existing code working
   - Add native module alongside nostr-tools
   - Feature flag to switch between implementations
   - Gradually migrate features

2. **Testing Strategy**
   - Unit tests for native module (Kotlin)
   - Integration tests for TypeScript wrapper
   - End-to-end tests with BalanceBridge server
   - Compare behavior with android-balancebridge

3. **Rollback Plan**
   - Keep old code in git history
   - Feature flag to revert to nostr-tools
   - Monitor error rates

## Estimated Effort

- **Native Module Implementation**: 2-3 days
- **TypeScript Wrapper**: 1-2 days
- **Migration & Testing**: 2-3 days
- **Total**: 5-8 days

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Native module crashes | High | Thorough testing, error handling, crash reporting |
| API incompatibility | Medium | Feature flag, gradual migration, extensive testing |
| Build complexity | Low | Follow android-balancebridge patterns, document setup |
| Performance issues | Low | Rust SDK is optimized, native code is fast |
| iOS support needed | Medium | Can add iOS implementation later if needed |

## Next Steps

1. **Approve approach** (this document)
2. **Create Kotlin native module** (Phase 1)
3. **Create TypeScript wrapper** (Phase 2)
4. **Test and migrate** (Phase 3)
5. **Remove nostr-tools** (cleanup)

## References

- android-balancebridge: `C:\Users\zndtoshi\Projects\0-android-balancebridge\app\src\main\java\com\nomadwallet\balancebridge\NostrManager.kt`
- Rust SDK: `org.rust-nostr:nostr-sdk:0.44.1`
- React Native Native Modules: https://reactnative.dev/docs/native-modules-android

