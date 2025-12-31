/**
 * TypeScript wrapper for Rust Nostr SDK native module
 * Bridges React Native JavaScript to Kotlin/Rust nostr-sdk
 */

import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { NostrNativeModule } = NativeModules;

if (!NostrNativeModule) {
  throw new Error(
    'NostrNativeModule not found. Did you rebuild the app after adding the native module?'
  );
}

// Create event emitter - pass null if module doesn't support addListener/removeListeners
const eventEmitter = new NativeEventEmitter(
  NostrNativeModule.addListener ? NostrNativeModule : null
);

export interface NostrEvent {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
  sig?: string;
}

export interface NostrKeys {
  publicKey: string;
  secretKey: string;
}

/**
 * Native Nostr Client wrapper
 * Provides a TypeScript interface to the Rust nostr-sdk via React Native bridge
 */
export class NostrNativeClient {
  private eventListeners: Map<string, EmitterSubscription> = new Map();

  /**
   * Initialize keys (generate new or load existing)
   */
  async initializeKeys(secretKeyHex?: string): Promise<NostrKeys> {
    return NostrNativeModule.initializeKeys(secretKeyHex || null);
  }

  /**
   * Connect to Nostr relays
   */
  async connect(relays: string[]): Promise<void> {
    return NostrNativeModule.connect(relays);
  }

  /**
   * Publish an event
   */
  async publishEvent(
    kind: number,
    content: string,
    tags: string[][]
  ): Promise<void> {
    return NostrNativeModule.publishEvent(kind, content, tags);
  }

  /**
   * Subscribe to events matching a filter
   */
  async subscribe(
    filter: { kinds: number[]; authors?: string[]; limit?: number },
    onEvent: (event: NostrEvent) => void
  ): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Parse incoming event JSON from native module
    const listener = eventEmitter.addListener('NostrEvent', (data: any) => {
      try {
        // The native module sends event as JSON string
        const eventJson = data.json;
        if (!eventJson) {
          console.warn('[NostrNative] Received event without JSON');
          return;
        }

        const event: NostrEvent = JSON.parse(eventJson);
        onEvent(event);
      } catch (error) {
        console.error('[NostrNative] Error parsing event:', error);
      }
    });

    this.eventListeners.set(subscriptionId, listener);

    // Convert filter to JSON string for native module
    const filterJson = JSON.stringify(filter);
    await NostrNativeModule.subscribe(filterJson);

    return subscriptionId;
  }

  /**
   * Unsubscribe from a subscription
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const listener = this.eventListeners.get(subscriptionId);
    if (listener) {
      listener.remove();
      this.eventListeners.delete(subscriptionId);
    }
    return NostrNativeModule.unsubscribe(subscriptionId);
  }

  /**
   * Disconnect from all relays
   */
  async disconnect(): Promise<void> {
    // Remove all event listeners
    this.eventListeners.forEach(listener => listener.remove());
    this.eventListeners.clear();

    return NostrNativeModule.disconnect();
  }

  /**
   * Check if connected
   */
  async isConnected(): Promise<boolean> {
    return NostrNativeModule.isConnected();
  }

  /**
   * Get relay URLs
   */
  async getRelays(): Promise<string[]> {
    return NostrNativeModule.getRelays();
  }
}

export const nostrNativeClient = new NostrNativeClient();

