/**
 * NomadServer Client
 * Handles Bitcoin wallet communication with NomadServer via Nostr
 */

import {NostrClient, Event, UnsignedEvent} from './NostrClient';
import {
  NomadServerQRPayload,
  NomadServerConfig,
  NomadServerState,
  NomadServerError,
  BalanceResponse,
  UTXOResponse,
  BroadcastResponse,
  FeeResponse,
  BitcoinLookupRequest,
  GetUTXOsRequest,
  BroadcastTxRequest,
  GetFeeEstimatesRequest,
  NOMAD_SERVER_REQUEST_KIND,
  NOMAD_SERVER_RESPONSE_KIND,
} from '../../types/nomadserver';

/**
 * Generate a unique request ID (UUID v4 format)
 */
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * NomadServer Client
 */
export class NomadServer {
  private nostrClient: NostrClient;
  private config: NomadServerConfig | null;
  private state: NomadServerState;
  private pendingRequests: Map<
    string,
    {
      resolve: (response: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >;

  constructor() {
    this.nostrClient = new NostrClient();
    this.config = null;
    this.state = {
      isConnected: false,
      serverPubkey: null,
      relays: [],
      connectedRelays: [],
      lastActivity: null,
    };
    this.pendingRequests = new Map();
  }

  /**
   * Initialize NomadServer from QR code payload
   */
  async initialize(qrPayload: NomadServerQRPayload): Promise<void> {
    // Validate QR payload
    if (qrPayload.version !== 1) {
      throw new NomadServerError(
        'Unsupported NomadServer version',
        'INVALID_RESPONSE',
      );
    }

    if (qrPayload.app !== 'nomad-server') {
      throw new NomadServerError(
        'Invalid NomadServer app identifier',
        'INVALID_RESPONSE',
      );
    }

    if (!qrPayload.nodePubkey || qrPayload.nodePubkey.length !== 64) {
      throw new NomadServerError(
        'Invalid server public key',
        'INVALID_RESPONSE',
      );
    }

    if (!qrPayload.relays || qrPayload.relays.length === 0) {
      throw new NomadServerError('No relays provided', 'INVALID_RESPONSE');
    }

    // Create configuration
    this.config = {
      serverPubkey: qrPayload.nodePubkey,
      relays: qrPayload.relays,
      requestTimeout: 30000, // 30 seconds default
    };

    try {
      // Connect to Nostr relays
      await this.nostrClient.connect(this.config.relays);

      // Subscribe to responses from server
      await this.subscribeToResponses();

      // Update state
      const connectedRelays = await this.nostrClient.getConnectedRelays();
      this.state = {
        isConnected: true,
        serverPubkey: this.config.serverPubkey,
        relays: this.config.relays,
        connectedRelays: connectedRelays,
        lastActivity: Date.now(),
      };

      console.log('[NomadServer] Initialized successfully');
      console.log(`[NomadServer] Server pubkey: ${this.config.serverPubkey}`);
      console.log(`[NomadServer] Relays: ${this.config.relays.join(', ')}`);
    } catch (error) {
      console.error('[NomadServer] Initialization error:', error);
      
      // Preserve the original error message if available
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to initialize NomadServer';
      
      throw new NomadServerError(
        errorMessage,
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * Initialize from config object directly
   */
  async initializeFromConfig(config: NomadServerConfig): Promise<void> {
    this.config = {
      ...config,
      requestTimeout: config.requestTimeout || 30000,
    };

    try {
      await this.nostrClient.connect(this.config.relays);
      await this.subscribeToResponses();

      const connectedRelays = await this.nostrClient.getConnectedRelays();
      this.state = {
        isConnected: true,
        serverPubkey: this.config.serverPubkey,
        relays: this.config.relays,
        connectedRelays: connectedRelays,
        lastActivity: Date.now(),
      };

      console.log('[NomadServer] Initialized from config');
    } catch (error) {
      throw new NomadServerError(
        'Failed to initialize NomadServer',
        'NETWORK_ERROR',
      );
    }
  }

  /**
   * Subscribe to response events from server
   */
  private async subscribeToResponses(): Promise<void> {
    if (!this.config) {
      throw new NomadServerError('Not initialized', 'NOT_CONNECTED');
    }

    // Subscribe to kind 30079 events from server
    await this.nostrClient.subscribe(
      {
        kinds: [NOMAD_SERVER_RESPONSE_KIND],
        authors: [this.config.serverPubkey],
      },
      (event: Event) => {
        this.handleResponse(event);
      },
      (error: Error) => {
        console.error('[NomadServer] Subscription error:', error);
      },
    );
  }

  /**
   * Handle incoming response event
   */
  private handleResponse(event: Event): void {
    try {
      // Parse response content
      const response = JSON.parse(event.content);

      // Extract request ID from tags or response
      let requestId: string | null = null;

      // Check for "req" tag
      const reqTag = event.tags.find(tag => tag[0] === 'req');
      if (reqTag && reqTag[1]) {
        requestId = reqTag[1];
      } else if (response.req) {
        // Fallback to req field in content
        requestId = response.req;
      }

      if (!requestId) {
        console.warn('[NomadServer] Response missing request ID');
        return;
      }

      // Find pending request
      const pending = this.pendingRequests.get(requestId);
      if (!pending) {
        console.warn(`[NomadServer] No pending request for ID: ${requestId}`);
        return;
      }

      // Clear timeout
      clearTimeout(pending.timeout);

      // Remove from pending
      this.pendingRequests.delete(requestId);

      // Update last activity
      this.state.lastActivity = Date.now();

      // Resolve with response
      pending.resolve(response);

      console.log(`[NomadServer] Response received for request: ${requestId}`);
    } catch (error) {
      console.error('[NomadServer] Error handling response:', error);
    }
  }

  /**
   * Send a request to the server and wait for response
   */
  private async sendRequest<T>(
    requestData: any,
    privateKey: string,
  ): Promise<T> {
    if (!this.config) {
      throw new NomadServerError('Not initialized', 'NOT_CONNECTED');
    }

    if (!this.state.isConnected) {
      throw new NomadServerError('Not connected to relays', 'NOT_CONNECTED');
    }

    // Generate unique request ID
    const requestId = generateRequestId();

    // Create promise for response
    const responsePromise = new Promise<T>((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(
          new NomadServerError('Request timeout', 'TIMEOUT'),
        );
      }, this.config!.requestTimeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });
    });

    try {
      // Add request ID to request data
      const requestWithId = {
        ...requestData,
        req: requestId,
      };

      // Create Nostr event
      const event: UnsignedEvent = {
        kind: NOMAD_SERVER_REQUEST_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['req', requestId], // Request ID tag
          ['p', this.config.serverPubkey], // Server pubkey tag
        ],
        content: JSON.stringify(requestWithId),
      };

      // Publish event
      await this.nostrClient.publish(event, privateKey);

      console.log(`[NomadServer] Sent request: ${requestData.type} (${requestId})`);

      // Wait for response
      return await responsePromise;
    } catch (error) {
      // Clean up pending request
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);
      }

      throw error;
    }
  }

  /**
   * Get balance and transactions for addresses
   */
  async getBalance(
    addresses: string | string[],
    privateKey: string,
  ): Promise<BalanceResponse> {
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];

    const request: BitcoinLookupRequest = {
      type: 'bitcoin_lookup',
      addresses: addressArray,
    };

    try {
      const response = await this.sendRequest<BalanceResponse>(
        request,
        privateKey,
      );

      console.log(`[NomadServer] Balance: ${response.confirmedBalance} sats`);

      return response;
    } catch (error) {
      console.error('[NomadServer] Get balance error:', error);
      throw error;
    }
  }

  /**
   * Get UTXOs for addresses
   */
  async getUTXOs(
    addresses: string | string[],
    privateKey: string,
  ): Promise<UTXOResponse> {
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];

    const request: GetUTXOsRequest = {
      type: 'get_utxos',
      addresses: addressArray,
    };

    try {
      const response = await this.sendRequest<UTXOResponse>(request, privateKey);

      console.log(`[NomadServer] UTXOs: ${response.utxos.length}`);

      return response;
    } catch (error) {
      console.error('[NomadServer] Get UTXOs error:', error);
      throw error;
    }
  }

  /**
   * Broadcast a signed transaction
   */
  async broadcastTx(
    txHex: string,
    privateKey: string,
  ): Promise<BroadcastResponse> {
    const request: BroadcastTxRequest = {
      type: 'broadcast_tx',
      txHex,
    };

    try {
      const response = await this.sendRequest<BroadcastResponse>(
        request,
        privateKey,
      );

      if (response.success) {
        console.log(`[NomadServer] Transaction broadcast: ${response.txid}`);
      } else {
        console.error(`[NomadServer] Broadcast failed: ${response.error}`);
      }

      return response;
    } catch (error) {
      console.error('[NomadServer] Broadcast transaction error:', error);
      throw error;
    }
  }

  /**
   * Get current fee estimates
   */
  async getFeeEstimates(privateKey: string): Promise<FeeResponse> {
    const request: GetFeeEstimatesRequest = {
      type: 'get_fee_estimates',
    };

    try {
      const response = await this.sendRequest<FeeResponse>(request, privateKey);

      console.log(
        `[NomadServer] Fee estimates - Fast: ${response.fast}, Medium: ${response.medium}, Slow: ${response.slow} sat/vB`,
      );

      return response;
    } catch (error) {
      console.error('[NomadServer] Get fee estimates error:', error);
      throw error;
    }
  }

  /**
   * Parse QR code payload
   */
  static parseQRCode(qrData: string): NomadServerQRPayload {
    try {
      const payload = JSON.parse(qrData);

      // Check if it's just a hex string (public key only)
      if (typeof payload === 'string' && /^[0-9a-fA-F]{64}$/.test(payload)) {
        throw new Error(
          'This looks like just a public key. Please paste the full pairing JSON from the NomadServer web interface (visit /pairing endpoint).',
        );
      }

      // Validate required fields
      const missing: string[] = [];
      if (!payload.version) missing.push('version');
      if (!payload.app) missing.push('app');
      if (!payload.nodePubkey) missing.push('nodePubkey');
      if (!payload.relays) missing.push('relays');

      if (missing.length > 0) {
        throw new Error(
          `Missing required fields: ${missing.join(', ')}. Please paste the complete pairing JSON from the NomadServer /pairing endpoint.`,
        );
      }

      // Validate field types
      if (typeof payload.version !== 'number') {
        throw new Error('Invalid format: "version" must be a number');
      }
      if (typeof payload.app !== 'string') {
        throw new Error('Invalid format: "app" must be a string');
      }
      if (typeof payload.nodePubkey !== 'string') {
        throw new Error('Invalid format: "nodePubkey" must be a string');
      }
      if (!Array.isArray(payload.relays)) {
        throw new Error('Invalid format: "relays" must be an array');
      }

      return payload as NomadServerQRPayload;
    } catch (error) {
      if (error instanceof NomadServerError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new NomadServerError(
          'Invalid JSON format. Please check that you copied the complete pairing JSON from the NomadServer /pairing endpoint.',
          'INVALID_RESPONSE',
        );
      }
      if (error instanceof Error) {
        throw new NomadServerError(error.message, 'INVALID_RESPONSE');
      }
      throw new NomadServerError(
        'Failed to parse QR code. Please ensure you copied the complete pairing JSON from the NomadServer web interface.',
        'INVALID_RESPONSE',
      );
    }
  }

  /**
   * Get current connection state
   */
  getState(): NomadServerState {
    return {...this.state};
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    try {
      // Clear all pending requests
      this.pendingRequests.forEach(pending => {
        clearTimeout(pending.timeout);
        pending.reject(
          new NomadServerError('Client disconnected', 'NOT_CONNECTED'),
        );
      });
      this.pendingRequests.clear();

      // Disconnect Nostr client
      await this.nostrClient.disconnect();

      // Reset state
      this.state = {
        isConnected: false,
        serverPubkey: null,
        relays: [],
        connectedRelays: [],
        lastActivity: null,
      };

      console.log('[NomadServer] Disconnected');
    } catch (error) {
      console.error('[NomadServer] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get server public key
   */
  getServerPubkey(): string | null {
    return this.state.serverPubkey;
  }

  /**
   * Get configured relays
   */
  getRelays(): string[] {
    return [...this.state.relays];
  }

  /**
   * Get connected relays
   */
  async getConnectedRelays(): Promise<string[]> {
    return await this.nostrClient.getConnectedRelays();
  }
}

// Export singleton instance
let nomadServerInstance: NomadServer | null = null;

export function getNomadServer(): NomadServer {
  if (!nomadServerInstance) {
    nomadServerInstance = new NomadServer();
  }
  return nomadServerInstance;
}

