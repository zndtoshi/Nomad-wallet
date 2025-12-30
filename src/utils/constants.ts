/**
 * Application Constants
 */

// Network Configuration
export const NETWORKS = {
  BITCOIN: 'bitcoin',
  TESTNET: 'testnet',
  REGTEST: 'regtest',
} as const;

// Default Blockchain URLs
export const BLOCKCHAIN_URLS = {
  BITCOIN: 'ssl://electrum.blockstream.info:50002',
  TESTNET: 'ssl://electrum.blockstream.info:60002',
  REGTEST: 'tcp://localhost:50001',
} as const;

// Default Nostr Relays
export const DEFAULT_NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
] as const;

// Storage Keys
export const STORAGE_KEYS = {
  WALLET_MNEMONIC: '@nomadwallet:mnemonic',
  WALLET_NETWORK: '@nomadwallet:network',
  NOSTR_PRIVATE_KEY: '@nomadwallet:nostr_privkey',
  NOSTR_PUBLIC_KEY: '@nomadwallet:nostr_pubkey',
  USER_SETTINGS: '@nomadwallet:settings',
  NOMAD_SERVER_CONFIG: '@nomadwallet:nomadserver_config',
  FIRST_RUN: '@nomadwallet:first_run',
} as const;

// Bitcoin Units
export const SATOSHIS_PER_BTC = 100_000_000;

// Fee Rates (sat/vB)
export const FEE_RATES = {
  SLOW: 1,
  NORMAL: 3,
  FAST: 6,
} as const;

// App Configuration
export const APP_CONFIG = {
  NAME: 'NomadWallet',
  VERSION: '1.0.0',
  MIN_ANDROID_API: 24,
  DEFAULT_NETWORK: NETWORKS.TESTNET,
  AUTO_SYNC_INTERVAL: 60000, // 1 minute
} as const;

// NomadServer Configuration
export const NOMAD_SERVER_CONFIG = {
  DEFAULT_SYNC_INTERVAL: 300000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
} as const;

// UI Constants
export const COLORS = {
  PRIMARY: '#F97316', // Orange
  SECONDARY: '#1E293B', // Dark Slate
  SUCCESS: '#10B981', // Green
  ERROR: '#EF4444', // Red
  WARNING: '#F59E0B', // Amber
  BACKGROUND: '#FFFFFF',
  TEXT: '#1F2937',
  TEXT_SECONDARY: '#6B7280',
  BORDER: '#E5E7EB',
} as const;

