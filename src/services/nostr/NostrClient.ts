/**
 * Nostr Client
 * Generic Nostr protocol client for connecting to relays and managing events
 * Uses native Rust nostr-sdk via React Native bridge
 */

import { nostrNativeClient, NostrEvent as NativeNostrEvent } from './NostrNative';

// Re-export Event type for compatibility
export interface Event {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
  sig?: string;
}

export interface Filter {
  kinds?: number[];
  authors?: string[];
  ids?: string[];
  '#e'?: string[];
  '#p'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

export interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at?: number;
}

export interface NostrClientConfig {
  relays: string[];
  privateKey?: string;
}

export interface RelayStatus {
  url: string;
  connected: boolean;
  lastSeen: number | null;
}

export type NostrEventCallback = (event: Event) => void;
export type NostrErrorCallback = (error: Error, relay?: string) => void;

/**
 * NostrClient - Handles connections to Nostr relays
 * Uses native Rust nostr-sdk for reliable WebSocket connections
 */
export class NostrClient {
  private relays: string[];
  private privateKey: string | null;
  private subscriptions: Map<string, string>; // subId -> nativeSubId
  private relayStatuses: Map<string, RelayStatus>;
  private isConnected: boolean;
  private nativeKeysInitialized: boolean;

  constructor(config?: NostrClientConfig) {
    this.relays = config?.relays || [];
    this.privateKey = config?.privateKey || null;
    this.subscriptions = new Map();
    this.relayStatuses = new Map();
    this.isConnected = false;
    this.nativeKeysInitialized = false;

    // Initialize relay statuses
    this.relays.forEach(relay => {
      this.relayStatuses.set(relay, {
        url: relay,
        connected: false,
        lastSeen: null,
      });
    });
  }

  /**
   * Ensure keys are initialized in native module
   */
  private async ensureKeysInitialized(): Promise<void> {
    if (this.nativeKeysInitialized) {
      return;
    }

    try {
      await nostrNativeClient.initializeKeys(this.privateKey || undefined);
      this.nativeKeysInitialized = true;
      console.log('[NostrClient] ✅ Keys initialized in native module');
    } catch (error) {
      console.error('[NostrClient] Failed to initialize keys:', error);
      throw error;
    }
  }

  /**
   * Connect to configured Nostr relays using native Rust SDK
   */
  async connect(relays?: string[]): Promise<void> {
    console.log('[NostrClient] ===== CONNECT START (Native Rust SDK) =====');
    console.log('[NostrClient] Input relays:', relays);
    
    if (relays) {
      this.relays = relays;
      this.relayStatuses.clear();
      relays.forEach(relay => {
        this.relayStatuses.set(relay, {
          url: relay,
          connected: false,
          lastSeen: null,
        });
      });
    }

    if (this.relays.length === 0) {
      console.error('[NostrClient] No relays configured!');
      throw new Error('No relays configured');
    }

    try {
      // Initialize keys first
      await this.ensureKeysInitialized();

      console.log(`[NostrClient] Connecting to ${this.relays.length} relay(s) via native Rust SDK`);
      console.log('[NostrClient] Relay URLs:', this.relays);
      
      // Connect using native module
      await nostrNativeClient.connect(this.relays);
      
      this.isConnected = true;
      
      // Update relay statuses
      this.relays.forEach(relay => {
        const status = this.relayStatuses.get(relay);
        if (status) {
          status.connected = true;
          status.lastSeen = Date.now();
        }
      });
      
      console.log('[NostrClient] ✅ Connected via native Rust SDK');
      console.log('[NostrClient] ===== CONNECT END =====');
    } catch (error) {
      console.error('[NostrClient] ❌ Connection error:', error);
      console.error('[NostrClient] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        relays: this.relays,
      });
      console.log('[NostrClient] ===== CONNECT END (ERROR) =====');
      throw error;
    }
  }

  /**
   * Publish an event to all connected relays using native Rust SDK
   */
  async publish(event: UnsignedEvent, privateKey?: string): Promise<void> {
    console.log('[NostrClient] ===== PUBLISH START (Native Rust SDK) =====');
    console.log('[NostrClient] Event kind:', event.kind);
    console.log('[NostrClient] Event content preview:', event.content?.substring(0, 100));
    console.log('[NostrClient] Event tags:', event.tags);
    
    if (!this.isConnected) {
      console.error('[NostrClient] ❌ Not connected to any relays');
      throw new Error('Not connected to any relays');
    }

    // Update private key if provided
    if (privateKey) {
      this.privateKey = privateKey;
      this.nativeKeysInitialized = false; // Force re-initialization
    }

    if (!this.privateKey) {
      console.error('[NostrClient] ❌ No private key available');
      throw new Error('No private key available for signing');
    }

    try {
      // Ensure keys are initialized with current private key
      await this.ensureKeysInitialized();

      console.log('[NostrClient] Publishing via native Rust SDK...');
      
      // Native module handles signing automatically
      await nostrNativeClient.publishEvent(
        event.kind,
        event.content,
        event.tags || []
      );

      // Update relay statuses
      this.relays.forEach(relay => {
        const status = this.relayStatuses.get(relay);
        if (status) {
          status.connected = true;
          status.lastSeen = Date.now();
        }
      });

      console.log(`[NostrClient] ✅ Published event kind ${event.kind} via native Rust SDK`);
      console.log('[NostrClient] ===== PUBLISH END =====');
    } catch (error) {
      console.error('[NostrClient] ❌ Publish error:', error);
      console.error('[NostrClient] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        eventKind: event.kind,
        relays: this.relays,
        isConnected: this.isConnected,
      });
      console.log('[NostrClient] ===== PUBLISH END (ERROR) =====');
      throw error;
    }
  }

  /**
   * Subscribe to events matching a filter using native Rust SDK
   */
  async subscribe(
    filter: Filter,
    onEvent: NostrEventCallback,
    onError?: NostrErrorCallback,
  ): Promise<string> {
    console.log('[NostrClient] ===== SUBSCRIBE START (Native Rust SDK) =====');
    console.log('[NostrClient] Filter:', JSON.stringify(filter, null, 2));
    console.log('[NostrClient] Target relays:', this.relays);
    
    if (!this.isConnected) {
      console.error('[NostrClient] ❌ Not connected to any relays');
      throw new Error('Not connected to any relays');
    }

    try {
      // Generate subscription ID
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      console.log('[NostrClient] Generated subscription ID:', subId);

      console.log('[NostrClient] Creating subscription via native Rust SDK...');
      
      // Convert Filter to native format
      const nativeFilter: { kinds: number[]; authors?: string[] } = {
        kinds: filter.kinds || [],
      };
      
      if (filter.authors && filter.authors.length > 0) {
        nativeFilter.authors = filter.authors;
      }

      // Subscribe using native module
      const nativeSubId = await nostrNativeClient.subscribe(
        nativeFilter,
        (event: NativeNostrEvent) => {
          console.log(`[NostrClient] 📨 Received event for subscription ${subId}:`);
          console.log(`[NostrClient] Event kind: ${event.kind}`);
          console.log(`[NostrClient] Event ID: ${event.id}`);
          console.log(`[NostrClient] Event pubkey: ${event.pubkey}`);
          console.log(`[NostrClient] Event content preview: ${event.content?.substring(0, 100)}`);
          
          // Convert native event to Event format
          const convertedEvent: Event = {
            id: event.id,
            pubkey: event.pubkey,
            kind: event.kind,
            content: event.content,
            created_at: event.created_at,
            tags: event.tags,
            sig: event.sig,
          };
          
          onEvent(convertedEvent);
        }
      );

      // Store subscription mapping
      this.subscriptions.set(subId, nativeSubId);
      console.log('[NostrClient] ✅ Subscription created successfully');
      console.log('[NostrClient] Subscription stored. Total subscriptions:', this.subscriptions.size);

      console.log(`[NostrClient] ✅ Subscribed with filter:`, JSON.stringify(filter, null, 2));
      console.log(`[NostrClient] ✅ Using relays:`, this.relays);
      console.log('[NostrClient] ===== SUBSCRIBE END =====');
      
      return subId;
    } catch (error) {
      console.error('[NostrClient] ❌ Subscribe error:', error);
      console.error('[NostrClient] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        filter: JSON.stringify(filter, null, 2),
        relays: this.relays,
        isConnected: this.isConnected,
      });
      
      if (onError) {
        console.log('[NostrClient] Calling onError callback');
        onError(error as Error);
      }
      
      console.log('[NostrClient] ===== SUBSCRIBE END (ERROR) =====');
      throw error;
    }
  }

  /**
   * Unsubscribe from a subscription
   */
  async unsubscribe(subId: string): Promise<void> {
    const nativeSubId = this.subscriptions.get(subId);
    if (nativeSubId) {
      await nostrNativeClient.unsubscribe(nativeSubId);
      this.subscriptions.delete(subId);
      console.log(`[NostrClient] Unsubscribed: ${subId}`);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  async unsubscribeAll(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.entries()).map(
      async ([subId, nativeSubId]) => {
        await nostrNativeClient.unsubscribe(nativeSubId);
        console.log(`[NostrClient] Unsubscribed: ${subId}`);
      }
    );
    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
  }

  /**
   * Disconnect from all relays
   */
  async disconnect(): Promise<void> {
    try {
      // Close all subscriptions
      await this.unsubscribeAll();

      // Disconnect native client
      await nostrNativeClient.disconnect();

      this.isConnected = false;

      console.log('[NostrClient] Disconnected from all relays');
    } catch (error) {
      console.error('[NostrClient] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Set private key for signing
   */
  setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey;
  }

  /**
   * Get relay statuses
   */
  getRelayStatuses(): RelayStatus[] {
    return Array.from(this.relayStatuses.values());
  }

  /**
   * Get connected relay URLs
   */
  async getConnectedRelays(): Promise<string[]> {
    // Try to get from native module first
    try {
      const nativeRelays = await nostrNativeClient.getRelays();
      if (nativeRelays.length > 0) {
        return nativeRelays;
      }
    } catch (error) {
      console.warn('[NostrClient] Failed to get relays from native module:', error);
    }
    
    // Fallback to relay statuses
    return Array.from(this.relayStatuses.values())
      .filter(status => status.connected)
      .map(status => status.url);
  }

  /**
   * Check if connected to any relays
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current relays
   */
  getRelays(): string[] {
    return [...this.relays];
  }
}

