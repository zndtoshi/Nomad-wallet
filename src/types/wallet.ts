/**
 * Wallet Types - BDK & Bitcoin Types
 * All types for local Bitcoin wallet management
 */

// ============================================================================
// Network Types
// ============================================================================

/**
 * Bitcoin network types
 */
export enum Network {
  TESTNET = 'testnet',
  MAINNET = 'bitcoin',
  REGTEST = 'regtest',
}

// ============================================================================
// Balance Types
// ============================================================================

/**
 * Wallet balance (all amounts in satoshis)
 */
export interface WalletBalance {
  confirmed: number; // Confirmed balance in satoshis
  unconfirmed: number; // Unconfirmed balance in satoshis
  total: number; // Total balance (confirmed + unconfirmed) in satoshis
}

// ============================================================================
// Address Types
// ============================================================================

/**
 * Bitcoin address with derivation index
 */
export interface Address {
  address: string; // Bitcoin address (bech32 format)
  index: number; // Derivation index
}

/**
 * Address type for derivation
 */
export enum AddressType {
  EXTERNAL = 'external', // Receiving addresses
  INTERNAL = 'internal', // Change addresses
}

// ============================================================================
// UTXO Types
// ============================================================================

/**
 * Unspent Transaction Output (UTXO)
 */
export interface UTXO {
  txid: string; // Transaction ID
  vout: number; // Output index
  value: number; // Amount in satoshis
  address: string; // Address
  confirmations: number; // Number of confirmations
  scriptPubKey?: string; // Script pubkey (hex)
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Transaction details
 */
export interface Transaction {
  txid: string; // Transaction ID
  received: number; // Amount received in satoshis
  sent: number; // Amount sent in satoshis
  fee?: number; // Fee paid in satoshis
  confirmations?: number; // Number of confirmations
  blockHeight?: number; // Block height
  timestamp?: number; // Unix timestamp
}

/**
 * Transaction recipient for sending
 */
export interface TransactionRecipient {
  address: string; // Destination address
  amount: number; // Amount in satoshis
}

/**
 * Transaction build options
 */
export interface TransactionOptions {
  recipients: TransactionRecipient[]; // One or more recipients
  feeRate?: number; // Fee rate in sat/vB (optional)
  subtractFeeFrom?: number[]; // Indices of recipients to subtract fee from
}

// ============================================================================
// Wallet State Types
// ============================================================================

/**
 * Wallet initialization state
 */
export interface WalletState {
  isInitialized: boolean; // Is wallet initialized
  network: Network; // Current network
  hasBackup: boolean; // Has user backed up mnemonic
  lastSync: number | null; // Last sync timestamp
}

/**
 * Wallet info
 */
export interface WalletInfo {
  network: Network;
  descriptors: {
    external: string; // External descriptor
    internal: string; // Change descriptor
  };
  fingerprint?: string; // Master key fingerprint
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Wallet-specific error
 */
export class WalletError extends Error {
  constructor(
    message: string,
    public code:
      | 'NOT_INITIALIZED'
      | 'ALREADY_EXISTS'
      | 'INVALID_MNEMONIC'
      | 'INSUFFICIENT_FUNDS'
      | 'INVALID_ADDRESS'
      | 'TRANSACTION_BUILD_FAILED'
      | 'TRANSACTION_SIGN_FAILED'
      | 'BROADCAST_FAILED'
      | 'STORAGE_ERROR'
      | 'BDK_ERROR',
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Satoshis per Bitcoin
 */
export const SATOSHIS_PER_BTC = 100_000_000;

/**
 * Default fee rates (sat/vB)
 */
export const DEFAULT_FEE_RATES = {
  FAST: 6,
  MEDIUM: 3,
  SLOW: 1,
};

/**
 * Minimum relay fee (sat/vB)
 */
export const MIN_RELAY_FEE = 1;

/**
 * Dust threshold (satoshis)
 */
export const DUST_THRESHOLD = 546;
