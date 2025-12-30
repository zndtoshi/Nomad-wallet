/**
 * Nostr Service - Nostr Protocol Implementation
 * High-level service for Nostr identity and key management
 */

import type {NostrEvent, NostrKeys, NostrRelay} from '../../types/nostr';
import {SecureStorage} from '../storage/SecureStorage';
import {DEFAULT_NOSTR_RELAYS} from '../../utils/constants';
import {NostrClient} from './NostrClient';
import {nostrNativeClient} from './NostrNative';

/**
 * NostrService - Manages Nostr identity and integrates with NostrClient
 */
export class NostrService {
  private static instance: NostrService;
  private keys: NostrKeys | null = null;
  private relays: NostrRelay[] = [];
  private nostrClient: NostrClient;

  private constructor() {
    this.nostrClient = new NostrClient();
  }

  static getInstance(): NostrService {
    if (!NostrService.instance) {
      NostrService.instance = new NostrService();
    }
    return NostrService.instance;
  }

  /**
   * Initialize Nostr service
   */
  async initialize(): Promise<void> {
    try {
      // Load existing keys or generate new ones
      const savedKeys = await SecureStorage.getNostrKeys();

      if (savedKeys) {
        this.keys = savedKeys;
      } else {
        await this.generateKeys();
      }

      // Initialize relay connections
      this.relays = DEFAULT_NOSTR_RELAYS.map(url => ({
        url,
        read: true,
        write: true,
      }));

      // Connect NostrClient to relays
      const relayUrls = this.relays.map(r => r.url);
      await this.nostrClient.connect(relayUrls);

      // Set private key for signing
      if (this.keys?.privateKey) {
        this.nostrClient.setPrivateKey(this.keys.privateKey);
      }

      console.log('[NostrService] Initialized successfully');
    } catch (error) {
      console.error('[NostrService] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Generate new Nostr keypair using native Rust SDK
   */
  async generateKeys(): Promise<NostrKeys> {
    try {
      // Generate keys using native module
      const keys = await nostrNativeClient.initializeKeys();
      
      this.keys = {
        privateKey: keys.secretKey,
        publicKey: keys.publicKey,
      };

      await SecureStorage.saveNostrKeys(this.keys.privateKey, this.keys.publicKey);

      console.log('[NostrService] Generated new Nostr keys via native Rust SDK');
      console.log(`[NostrService] Public key: ${this.keys.publicKey}`);

      return this.keys;
    } catch (error) {
      console.error('[NostrService] Error generating Nostr keys:', error);
      throw error;
    }
  }

  /**
   * Import existing private key using native Rust SDK
   */
  async importPrivateKey(privateKey: string): Promise<void> {
    try {
      // Initialize keys in native module with existing private key
      const keys = await nostrNativeClient.initializeKeys(privateKey);
      
      this.keys = {
        privateKey: keys.secretKey,
        publicKey: keys.publicKey,
      };

      await SecureStorage.saveNostrKeys(this.keys.privateKey, this.keys.publicKey);

      // Update NostrClient with new key
      this.nostrClient.setPrivateKey(privateKey);

      console.log('[NostrService] Imported Nostr private key via native Rust SDK');
    } catch (error) {
      console.error('[NostrService] Error importing private key:', error);
      throw error;
    }
  }

  /**
   * Get public key
   */
  getPublicKey(): string | null {
    return this.keys?.publicKey || null;
  }

  /**
   * Get private key (use carefully!)
   */
  getPrivateKey(): string | null {
    return this.keys?.privateKey || null;
  }

  /**
   * Get keys
   */
  getKeys(): NostrKeys | null {
    return this.keys ? {...this.keys} : null;
  }

  /**
   * Check if keys are initialized
   */
  hasKeys(): boolean {
    return this.keys !== null;
  }

  /**
   * Publish event using NostrClient
   */
  async publishEvent(event: Partial<NostrEvent>): Promise<void> {
    try {
      if (!this.keys) {
        throw new Error('Nostr keys not initialized');
      }

      // TODO: Implement event publishing using NostrClient
      // This requires creating a proper UnsignedEvent structure
      console.log('[NostrService] Publishing event:', event);
    } catch (error) {
      console.error('[NostrService] Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to events using NostrClient
   */
  async subscribeToEvents(
    filter: any,
    callback: (event: NostrEvent) => void,
  ): Promise<string> {
    try {
      // Subscribe using NostrClient and convert Event to NostrEvent
      const subId = await this.nostrClient.subscribe(filter, (event) => {
        const nostrEvent: NostrEvent = {
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          kind: event.kind,
          tags: event.tags,
          content: event.content,
          sig: event.sig || '', // Ensure sig is always a string
        };
        callback(nostrEvent);
      });

      console.log('[NostrService] Subscribed to events:', filter);

      return subId;
    } catch (error) {
      console.error('[NostrService] Error subscribing to events:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subId: string): Promise<void> {
    await this.nostrClient.unsubscribe(subId);
  }

  /**
   * Get relays
   */
  getRelays(): NostrRelay[] {
    return [...this.relays];
  }

  /**
   * Add relay
   */
  async addRelay(url: string): Promise<void> {
    const relay: NostrRelay = {url, read: true, write: true};
    this.relays.push(relay);

    // TODO: Update NostrClient with new relays
    console.log('[NostrService] Added relay:', url);
  }

  /**
   * Remove relay
   */
  async removeRelay(url: string): Promise<void> {
    this.relays = this.relays.filter(relay => relay.url !== url);

    // TODO: Update NostrClient with new relays
    console.log('[NostrService] Removed relay:', url);
  }

  /**
   * Get NostrClient instance for advanced usage
   */
  getClient(): NostrClient {
    return this.nostrClient;
  }

  /**
   * Disconnect from all relays
   */
  async disconnect(): Promise<void> {
    await this.nostrClient.disconnect();
  }
}
