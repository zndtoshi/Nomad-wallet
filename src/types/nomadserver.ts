/**
 * NomadServer Protocol Types
 * Protocol for Bitcoin wallet communication with NomadServer over Nostr
 */

// ============================================================================
// QR Code Pairing
// ============================================================================

/**
 * QR code payload for pairing with NomadServer
 */
export interface NomadServerQRPayload {
  version: number; // Always 1
  app: string; // Always "nomad-server"
  nodePubkey: string; // Server's Nostr pubkey (hex format)
  relays: string[]; // Array of Nostr relay URLs
}

// ============================================================================
// Nostr Event Kinds
// ============================================================================

/**
 * Custom Nostr event kind for NomadServer requests
 */
export const NOMAD_SERVER_REQUEST_KIND = 30078;

/**
 * Custom Nostr event kind for NomadServer responses
 */
export const NOMAD_SERVER_RESPONSE_KIND = 30079;

// ============================================================================
// Request Types
// ============================================================================

/**
 * Base request structure for all NomadServer requests
 */
export interface NomadServerRequest {
  type: 'bitcoin_lookup' | 'get_utxos' | 'broadcast_tx' | 'get_fee_estimates';
}

/**
 * Request to query balance and transactions for addresses
 */
export interface BitcoinLookupRequest extends NomadServerRequest {
  type: 'bitcoin_lookup';
  addresses: string[]; // Bitcoin addresses to query
}

/**
 * Request to get UTXOs for specific addresses
 */
export interface GetUTXOsRequest extends NomadServerRequest {
  type: 'get_utxos';
  addresses: string[]; // Bitcoin addresses to query UTXOs for
}

/**
 * Request to broadcast a signed transaction
 */
export interface BroadcastTxRequest extends NomadServerRequest {
  type: 'broadcast_tx';
  txHex: string; // Raw transaction in hex format
}

/**
 * Request to get current fee estimates
 */
export interface GetFeeEstimatesRequest extends NomadServerRequest {
  type: 'get_fee_estimates';
}

/**
 * Union type of all request types
 */
export type NomadServerRequestType =
  | BitcoinLookupRequest
  | GetUTXOsRequest
  | BroadcastTxRequest
  | GetFeeEstimatesRequest;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Base response structure for all NomadServer responses
 */
export interface NomadServerResponse {
  req: string; // Request ID that this response corresponds to
}

/**
 * Transaction details in balance response
 */
export interface Transaction {
  txid: string;
  confirmations: number;
  value: number; // Amount in satoshis
  blockHeight?: number;
  timestamp?: number;
  fee?: number;
}

/**
 * Response to bitcoin_lookup request
 */
export interface BalanceResponse extends NomadServerResponse {
  req: string;
  confirmedBalance: number; // Balance in satoshis
  unconfirmedBalance: number; // Unconfirmed balance in satoshis
  transactions: Transaction[]; // Array of transactions
}

/**
 * UTXO (Unspent Transaction Output) details
 */
export interface UTXO {
  txid: string; // Transaction ID
  vout: number; // Output index
  value: number; // Amount in satoshis
  confirmations: number; // Number of confirmations
  scriptPubKey?: string; // Script pubkey (hex)
  address?: string; // Bitcoin address
}

/**
 * Response to get_utxos request
 */
export interface UTXOResponse extends NomadServerResponse {
  req: string;
  utxos: UTXO[]; // Array of UTXOs
}

/**
 * Response to broadcast_tx request
 */
export interface BroadcastResponse extends NomadServerResponse {
  req: string;
  success: boolean;
  txid?: string; // Transaction ID if successful
  error?: string; // Error message if failed
}

/**
 * Fee estimates for different priority levels
 */
export interface FeeEstimates {
  fast: number; // sat/vB for fast confirmation (~10 min)
  medium: number; // sat/vB for medium confirmation (~30 min)
  slow: number; // sat/vB for slow confirmation (~1 hour)
}

/**
 * Response to get_fee_estimates request
 */
export interface FeeResponse extends NomadServerResponse {
  req: string;
  fast: number; // Fee rate in sat/vB
  medium: number; // Fee rate in sat/vB
  slow: number; // Fee rate in sat/vB
}

/**
 * Union type of all response types
 */
export type NomadServerResponseType =
  | BalanceResponse
  | UTXOResponse
  | BroadcastResponse
  | FeeResponse;

// ============================================================================
// Connection State
// ============================================================================

/**
 * NomadServer connection state
 */
export interface NomadServerState {
  isConnected: boolean;
  serverPubkey: string | null;
  relays: string[];
  connectedRelays: string[];
  lastActivity: number | null;
}

/**
 * Configuration for NomadServer client
 */
export interface NomadServerConfig {
  serverPubkey: string;
  relays: string[];
  requestTimeout?: number; // Timeout in milliseconds (default: 30000)
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * NomadServer-specific error
 */
export class NomadServerError extends Error {
  constructor(
    message: string,
    public code:
      | 'TIMEOUT'
      | 'NOT_CONNECTED'
      | 'INVALID_RESPONSE'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR',
  ) {
    super(message);
    this.name = 'NomadServerError';
  }
}

