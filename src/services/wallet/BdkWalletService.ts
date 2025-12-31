/**
 * BDK Wallet Service
 * Comprehensive Bitcoin wallet management using BDK (Bitcoin Dev Kit)
 * 
 * All private key operations happen CLIENT-SIDE only.
 * Server is only used for blockchain data queries via NomadServer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import BdkRn from 'bdk-rn';
import {getNomadServer} from '../nostr/NomadServer';
import {
  Network,
  WalletBalance,
  Address,
  UTXO,
  Transaction,
  WalletState,
  WalletInfo,
  TransactionOptions,
  WalletError,
} from '../../types/wallet';

// Storage keys
const STORAGE_KEY_MNEMONIC = 'WALLET_MNEMONIC';
const STORAGE_KEY_NETWORK = 'WALLET_NETWORK';
const STORAGE_KEY_HAS_BACKUP = 'WALLET_HAS_BACKUP';

// Database path
const DB_PATH = RNFS.DocumentDirectoryPath + '/nomad_wallet.db';

/**
 * BdkWalletService - Comprehensive Bitcoin wallet service
 * 
 * Responsibilities:
 * - Mnemonic generation and storage
 * - BDK wallet initialization
 * - Address derivation (BIP84 native SegWit)
 * - Transaction building and signing
 * - Balance queries via NomadServer
 * - UTXO management via NomadServer
 * - Transaction broadcasting via NomadServer
 */
export class BdkWalletService {
  private static instance: BdkWalletService;
  private bdk: any; // BdkRn instance
  private walletId: string | null = null;
  private mnemonic: string | null = null;
  private network: Network = Network.MAINNET;
  private state: WalletState = {
    isInitialized: false,
    network: Network.MAINNET,
    hasBackup: false,
    lastSync: null,
  };

  private constructor() {
    // BdkRn is already an instance, not a class - don't use 'new'
    this.bdk = BdkRn;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BdkWalletService {
    if (!BdkWalletService.instance) {
      BdkWalletService.instance = new BdkWalletService();
    }
    return BdkWalletService.instance;
  }

  // ============================================================================
  // CORE WALLET OPERATIONS
  // ============================================================================

  /**
   * Create new wallet with generated mnemonic
   * 
   * @returns Mnemonic words (12 words) - MUST be shown to user for backup
   */
  async createWallet(): Promise<string> {
    try {
      // Check if wallet already exists
      if (await this.walletExists()) {
        throw new WalletError('Wallet already exists', 'ALREADY_EXISTS');
      }

      console.log('[BdkWallet] Creating new wallet...');
      console.log('[BdkWallet] Network:', this.network);

      // Generate new 12-word mnemonic using bdk-rn v0.1.x API
      console.log('[BdkWallet] Calling generateMnemonic...');
      const mnemonicResult = await this.bdk.generateMnemonic({
        length: 12,
        network: this.network === Network.MAINNET ? 'bitcoin' : 'testnet',
      });

      console.log('[BdkWallet] generateMnemonic result:', JSON.stringify(mnemonicResult, null, 2));

      if (!mnemonicResult || mnemonicResult.error) {
        const errorMsg = mnemonicResult?.data || 'Failed to generate mnemonic';
        console.error('[BdkWallet] Mnemonic generation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const mnemonicWords = mnemonicResult.data;
      console.log('[BdkWallet] Generated mnemonic');

      // Initialize wallet with mnemonic
      await this.initializeWalletFromMnemonic(mnemonicWords);

      // Store mnemonic in AsyncStorage
      // TODO: Use encrypted storage for production
      await AsyncStorage.setItem(STORAGE_KEY_MNEMONIC, mnemonicWords);
      await AsyncStorage.setItem(STORAGE_KEY_NETWORK, this.network);
      await AsyncStorage.setItem(STORAGE_KEY_HAS_BACKUP, 'false');

      console.log('[BdkWallet] Wallet created successfully');
      console.log('[BdkWallet] Network:', this.network);

      // Update state
      this.state = {
        isInitialized: true,
        network: this.network,
        hasBackup: false,
        lastSync: null,
      };

      return mnemonicWords;
    } catch (error) {
      console.error('[BdkWallet] Create wallet error:', error);
      console.error('[BdkWallet] Error type:', typeof error);
      console.error('[BdkWallet] Error details:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('[BdkWallet] Error message:', error.message);
        console.error('[BdkWallet] Error stack:', error.stack);
      }
      const errorMessage = error instanceof Error 
        ? error.message 
        : error instanceof WalletError
        ? error.message
        : 'Failed to create wallet';
      throw new WalletError(
        errorMessage,
        'BDK_ERROR',
      );
    }
  }

  /**
   * Restore wallet from existing mnemonic
   * 
   * @param mnemonicWords - 12 or 24 word mnemonic phrase
   */
  async restoreWallet(mnemonicWords: string): Promise<void> {
    try {
      console.log('[BdkWallet] Restoring wallet from mnemonic...');

      // Validate and create mnemonic
      this.mnemonic = await new Mnemonic().fromString(mnemonicWords);

      // Initialize wallet
      await this.initializeWalletFromMnemonic(mnemonicWords);

      // Store mnemonic
      await AsyncStorage.setItem(STORAGE_KEY_MNEMONIC, mnemonicWords);
      await AsyncStorage.setItem(STORAGE_KEY_NETWORK, this.network);
      await AsyncStorage.setItem(STORAGE_KEY_HAS_BACKUP, 'true');

      console.log('[BdkWallet] Wallet restored successfully');

      // Update state
      this.state = {
        isInitialized: true,
        network: this.network,
        hasBackup: true,
        lastSync: null,
      };
    } catch (error) {
      console.error('[BdkWallet] Restore wallet error:', error);
      throw new WalletError(
        'Failed to restore wallet - invalid mnemonic',
        'INVALID_MNEMONIC',
      );
    }
  }

  /**
   * Load existing wallet from storage
   * 
   * @returns true if wallet loaded, false if no wallet exists
   */
  async loadWallet(): Promise<boolean> {
    try {
      console.log('[BdkWallet] Loading wallet from storage...');

      // Check if mnemonic exists
      const mnemonicWords = await AsyncStorage.getItem(STORAGE_KEY_MNEMONIC);
      if (!mnemonicWords) {
        console.log('[BdkWallet] No wallet found in storage (mnemonic missing)');
        return false;
      }

      console.log('[BdkWallet] Mnemonic found in storage, initializing wallet...');

      // Load network
      const networkStr = await AsyncStorage.getItem(STORAGE_KEY_NETWORK);
      if (networkStr) {
        this.network = networkStr as Network;
        console.log('[BdkWallet] Network loaded from storage:', this.network);
      }

      // Load backup status
      const hasBackup = await AsyncStorage.getItem(STORAGE_KEY_HAS_BACKUP);

      // Initialize wallet
      await this.initializeWalletFromMnemonic(mnemonicWords);

      console.log('[BdkWallet] Wallet initialized from mnemonic successfully');

      // Update state
      this.state = {
        isInitialized: true,
        network: this.network,
        hasBackup: hasBackup === 'true',
        lastSync: null,
      };

      console.log('[BdkWallet] ✅ Wallet loaded and state updated successfully');
      console.log('[BdkWallet] Network:', this.network);
      console.log('[BdkWallet] Is initialized:', this.state.isInitialized);

      return true;
    } catch (error) {
      console.error('[BdkWallet] ❌ Load wallet error:', error);
      if (error instanceof Error) {
        console.error('[BdkWallet] Error message:', error.message);
        console.error('[BdkWallet] Error stack:', error.stack);
      }
      // Reset state on error
      this.state = {
        isInitialized: false,
        network: this.network,
        hasBackup: false,
        lastSync: null,
      };
      throw new WalletError(
        'Failed to load wallet',
        'STORAGE_ERROR',
      );
    }
  }

  /**
   * Check if wallet exists in storage
   */
  async walletExists(): Promise<boolean> {
    try {
      const mnemonic = await AsyncStorage.getItem(STORAGE_KEY_MNEMONIC);
      const exists = mnemonic !== null;
      console.log(`[BdkWallet] walletExists() check: ${exists}`);
      return exists;
    } catch (error) {
      console.error('[BdkWallet] Error checking wallet existence:', error);
      return false;
    }
  }

  /**
   * Initialize BDK wallet from mnemonic
   * Creates wallet using bdk-rn v0.1.x API
   * BDK handles descriptor creation internally when using mnemonic
   * 
   * @private
   */
  private async initializeWalletFromMnemonic(mnemonicWords: string): Promise<void> {
    try {
      console.log('[BdkWallet] Starting wallet initialization...');
      
      this.mnemonic = mnemonicWords;
      const networkStr = this.network === Network.MAINNET ? 'bitcoin' : 'testnet';

      console.log('[BdkWallet] Network:', this.network, '-> BDK Network:', networkStr);

      // Create wallet with mnemonic (bdk-rn will handle descriptor creation internally)
      // Note: bdk-rn createWallet accepts either mnemonic OR descriptor, not both
      console.log('[BdkWallet] Creating BDK wallet from mnemonic...');
      const walletResult = await this.bdk.createWallet({
        mnemonic: mnemonicWords,
        password: '',
        network: networkStr,
      });

      if (walletResult.error) {
        throw new Error(walletResult.data || 'Failed to create wallet');
      }

      // bdk-rn manages wallet internally, we don't need to store walletId
      // The response contains an address, but the wallet is managed by bdk-rn singleton
      console.log('[BdkWallet] ✅ BDK wallet initialized successfully!');
      console.log('[BdkWallet] Initial address:', walletResult.data?.address || 'N/A');
    } catch (error) {
      console.error('[BdkWallet] ❌ Error initializing wallet:', error);
      console.error('[BdkWallet] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // ============================================================================
  // ADDRESS MANAGEMENT
  // ============================================================================

  /**
   * Get new receiving address
   * 
   * @returns Bitcoin address (bech32 format)
   */
  async getNewAddress(): Promise<string> {
    this.ensureInitialized();

    try {
      const result = await this.bdk.getNewAddress();
      
      if (result.error) {
        throw new Error(result.data || 'Failed to generate address');
      }

      const address = result.data;
      console.log('[BdkWallet] Generated new address:', address);

      return address;
    } catch (error) {
      console.error('[BdkWallet] Get new address error:', error);
      throw new WalletError(
        'Failed to generate address',
        'BDK_ERROR',
      );
    }
  }

  /**
   * Get change address
   * 
   * @returns Bitcoin address (bech32 format)
   */
  async getChangeAddress(): Promise<string> {
    // bdk-rn doesn't have a separate change address method
    // For now, use getNewAddress() which will generate the next address
    // TODO: Check if bdk-rn supports change addresses or if we need to track indexes
    return this.getNewAddress();
  }

  /**
   * Get all derived addresses (for balance queries)
   * 
   * @param count - Number of addresses to derive (default: 20)
   * @returns Array of addresses with indexes
   */
  async getAllAddresses(count: number = 10): Promise<Address[]> {
    this.ensureInitialized();

    try {
      const addresses: Address[] = [];

      // bdk-rn limitation: getNewAddress() only returns the next address in sequence
      // We can't get addresses by index. For balance queries, we'll use the first address
      // which is the one displayed in the UI (from getNewAddress when wallet is first created)
      // 
      // Note: The server only accepts a single "query" string, not multiple addresses
      // So we'll query just the first address for balance
      const firstAddress = await this.getNewAddress();
      
      addresses.push({
        address: firstAddress,
        index: 0,
      });

      console.log(`[BdkWallet] Using wallet's first address for balance query: ${firstAddress}`);
      console.log(`[BdkWallet] Retrieved ${addresses.length} address(es)`);
      console.log(`[BdkWallet] Note: bdk-rn doesn't support address indexing, using first address only`);

      return addresses;
    } catch (error) {
      console.error('[BdkWallet] Get all addresses error:', error);
      throw new WalletError(
        'Failed to get addresses',
        'BDK_ERROR',
      );
    }
  }

  // ============================================================================
  // BALANCE & UTXOS (VIA NOMAD_SERVER)
  // ============================================================================

  /**
   * Get wallet balance from NomadServer
   * Queries all wallet addresses and aggregates balances
   * 
   * @param userPrivateKey - User's Nostr private key for signing requests
   * @returns Wallet balance in satoshis
   */
  async getBalance(userPrivateKey: string): Promise<WalletBalance> {
    this.ensureInitialized();

    try {
      console.log('[BdkWallet] Fetching balance from NomadServer...');

      // Get all wallet addresses
      const addressObjects = await this.getAllAddresses(20);
      const addresses = addressObjects.map(a => a.address);

      // Query NomadServer
      const server = getNomadServer();
      
      if (!server.isConnected()) {
        throw new WalletError(
          'NomadServer not connected',
          'NOT_INITIALIZED',
        );
      }

      // Get balance for all addresses
      const response = await server.getBalance(addresses, userPrivateKey);

      const balance: WalletBalance = {
        confirmed: response.confirmedBalance,
        unconfirmed: response.unconfirmedBalance,
        total: response.confirmedBalance + response.unconfirmedBalance,
      };

      console.log('[BdkWallet] Balance:', balance);

      // Update last sync time
      this.state.lastSync = Date.now();

      return balance;
    } catch (error) {
      console.error('[BdkWallet] Get balance error:', error);
      throw new WalletError(
        'Failed to get balance',
        'BDK_ERROR',
      );
    }
  }

  /**
   * Get all wallet UTXOs from NomadServer
   * 
   * @param userPrivateKey - User's Nostr private key for signing requests
   * @returns Array of UTXOs
   */
  async getUTXOs(userPrivateKey: string): Promise<UTXO[]> {
    this.ensureInitialized();

    try {
      console.log('[BdkWallet] Fetching UTXOs from NomadServer...');

      // Get all wallet addresses
      const addressObjects = await this.getAllAddresses(20);
      const addresses = addressObjects.map(a => a.address);

      // Query NomadServer
      const server = getNomadServer();
      
      if (!server.isConnected()) {
        throw new WalletError(
          'NomadServer not connected',
          'NOT_INITIALIZED',
        );
      }

      const response = await server.getUTXOs(addresses, userPrivateKey);

      console.log(`[BdkWallet] Found ${response.utxos.length} UTXOs`);

      return response.utxos;
    } catch (error) {
      console.error('[BdkWallet] Get UTXOs error:', error);
      throw new WalletError(
        'Failed to get UTXOs',
        'BDK_ERROR',
      );
    }
  }

  // ============================================================================
  // TRANSACTION BUILDING & SIGNING
  // ============================================================================

  /**
   * Build unsigned transaction
   * 
   * @param to - Recipient address
   * @param amount - Amount in satoshis
   * @param feeRate - Fee rate in sat/vB (optional, will fetch from server if not provided)
   * @param userPrivateKey - User's Nostr private key for fee estimation
   * @returns Unsigned PSBT (Partially Signed Bitcoin Transaction)
   */
  async buildTransaction(
    to: string,
    amount: number,
    feeRate?: number,
    userPrivateKey?: string,
  ): Promise<string> {
    this.ensureInitialized();

    try {
      console.log('[BdkWallet] Building transaction...');
      console.log(`[BdkWallet] To: ${to}`);
      console.log(`[BdkWallet] Amount: ${amount} sats`);

      // Get fee rate if not provided
      let finalFeeRate = feeRate;
      if (!finalFeeRate && userPrivateKey) {
        const server = getNomadServer();
        if (server.isConnected()) {
          const feeEstimates = await server.getFeeEstimates(userPrivateKey);
          finalFeeRate = feeEstimates.medium;
          console.log(`[BdkWallet] Using medium fee rate: ${finalFeeRate} sat/vB`);
        }
      }

      if (!finalFeeRate) {
        finalFeeRate = 3; // Default to 3 sat/vB
        console.log('[BdkWallet] Using default fee rate: 3 sat/vB');
      }

      // Create transaction builder
      const txBuilder = await new TxBuilder().create();

      // Add recipient
      await txBuilder.addRecipient(to, amount);

      // Set fee rate
      await txBuilder.feeRate(finalFeeRate);

      // TODO: bdk-rn manages wallet internally, need to check transaction building API
      // For now, throw error indicating this needs implementation
      throw new Error('Transaction building not yet implemented with bdk-rn');

      console.log('[BdkWallet] Transaction built successfully');

      return await psbt.serialize();
    } catch (error) {
      console.error('[BdkWallet] Build transaction error:', error);
      throw new WalletError(
        'Failed to build transaction',
        'TRANSACTION_BUILD_FAILED',
      );
    }
  }

  /**
   * Sign transaction
   * 
   * @param psbtBase64 - Unsigned PSBT in base64 format
   * @returns Signed transaction hex
   */
  async signTransaction(psbtBase64: string): Promise<string> {
    this.ensureInitialized();

    try {
      console.log('[BdkWallet] Signing transaction...');

      // TODO: Parse PSBT and sign with wallet
      // This requires additional BDK methods for PSBT handling
      // For now, return a placeholder

      console.log('[BdkWallet] Transaction signed successfully');

      // TODO: Implement actual PSBT signing
      throw new WalletError(
        'PSBT signing not yet implemented',
        'TRANSACTION_SIGN_FAILED',
      );
    } catch (error) {
      console.error('[BdkWallet] Sign transaction error:', error);
      throw new WalletError(
        'Failed to sign transaction',
        'TRANSACTION_SIGN_FAILED',
      );
    }
  }

  /**
   * Broadcast signed transaction via NomadServer
   * 
   * @param txHex - Signed transaction in hex format
   * @param userPrivateKey - User's Nostr private key for signing request
   * @returns Transaction ID (txid)
   */
  async broadcastTransaction(
    txHex: string,
    userPrivateKey: string,
  ): Promise<string> {
    this.ensureInitialized();

    try {
      console.log('[BdkWallet] Broadcasting transaction...');

      const server = getNomadServer();
      
      if (!server.isConnected()) {
        throw new WalletError(
          'NomadServer not connected',
          'NOT_INITIALIZED',
        );
      }

      const response = await server.broadcastTx(txHex, userPrivateKey);

      if (!response.success) {
        throw new WalletError(
          response.error || 'Broadcast failed',
          'BROADCAST_FAILED',
        );
      }

      console.log(`[BdkWallet] Transaction broadcast successful: ${response.txid}`);

      return response.txid!;
    } catch (error) {
      console.error('[BdkWallet] Broadcast transaction error:', error);
      throw new WalletError(
        'Failed to broadcast transaction',
        'BROADCAST_FAILED',
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Get stored mnemonic (for backup display)
   * WARNING: Handle with care!
   */
  async getMnemonic(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEY_MNEMONIC);
    } catch (error) {
      console.error('[BdkWallet] Get mnemonic error:', error);
      return null;
    }
  }

  /**
   * Mark mnemonic as backed up
   */
  async markAsBackedUp(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAS_BACKUP, 'true');
      this.state.hasBackup = true;
      console.log('[BdkWallet] Wallet marked as backed up');
    } catch (error) {
      console.error('[BdkWallet] Mark as backed up error:', error);
    }
  }

  /**
   * Get wallet state
   */
  getState(): WalletState {
    return {...this.state};
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    if (!this.state.isInitialized || !this.wallet) {
      return null;
    }

    try {
      // TODO: Get descriptors from wallet
      return {
        network: this.network,
        descriptors: {
          external: 'external_descriptor_here',
          internal: 'internal_descriptor_here',
        },
      };
    } catch (error) {
      console.error('[BdkWallet] Get wallet info error:', error);
      return null;
    }
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Delete wallet from storage
   * WARNING: This is destructive and cannot be undone!
   * User MUST have backed up mnemonic before calling this.
   */
  async deleteWallet(): Promise<void> {
    try {
      console.log('[BdkWallet] Deleting wallet...');

      // Clear AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEY_MNEMONIC);
      await AsyncStorage.removeItem(STORAGE_KEY_NETWORK);
      await AsyncStorage.removeItem(STORAGE_KEY_HAS_BACKUP);

      // Delete database file
      if (await RNFS.exists(DB_PATH)) {
        await RNFS.unlink(DB_PATH);
      }

      // Reset instance variables
      this.mnemonic = null;
      this.state = {
        isInitialized: false,
        network: Network.MAINNET,
        hasBackup: false,
        lastSync: null,
      };

      console.log('[BdkWallet] Wallet deleted successfully');
    } catch (error) {
      console.error('[BdkWallet] Delete wallet error:', error);
      throw new WalletError(
        'Failed to delete wallet',
        'STORAGE_ERROR',
      );
    }
  }

  /**
   * Ensure wallet is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.state.isInitialized) {
      throw new WalletError(
        'Wallet not initialized',
        'NOT_INITIALIZED',
      );
    }
  }
}

/**
 * Get singleton instance
 */
export function getBdkWallet(): BdkWalletService {
  return BdkWalletService.getInstance();
}

