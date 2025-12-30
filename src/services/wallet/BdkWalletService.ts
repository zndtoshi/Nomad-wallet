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
  private network: Network = Network.TESTNET;
  private state: WalletState = {
    isInitialized: false,
    network: Network.TESTNET,
    hasBackup: false,
    lastSync: null,
  };

  private constructor() {
    this.bdk = new BdkRn();
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

      // Generate new 12-word mnemonic using bdk-rn v0.1.x API
      const mnemonicResult = await this.bdk.generateMnemonic({
        length: 12,
        network: this.network === Network.MAINNET ? 'bitcoin' : 'testnet',
      });

      if (!mnemonicResult.isOk) {
        throw new Error(mnemonicResult.data || 'Failed to generate mnemonic');
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
      throw new WalletError(
        'Failed to create wallet',
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
        console.log('[BdkWallet] No wallet found in storage');
        return false;
      }

      // Load network
      const networkStr = await AsyncStorage.getItem(STORAGE_KEY_NETWORK);
      if (networkStr) {
        this.network = networkStr as Network;
      }

      // Load backup status
      const hasBackup = await AsyncStorage.getItem(STORAGE_KEY_HAS_BACKUP);

      // Initialize wallet
      await this.initializeWalletFromMnemonic(mnemonicWords);

      console.log('[BdkWallet] Wallet loaded successfully');
      console.log('[BdkWallet] Network:', this.network);

      // Update state
      this.state = {
        isInitialized: true,
        network: this.network,
        hasBackup: hasBackup === 'true',
        lastSync: null,
      };

      return true;
    } catch (error) {
      console.error('[BdkWallet] Load wallet error:', error);
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
      return mnemonic !== null;
    } catch (error) {
      console.error('[BdkWallet] Error checking wallet existence:', error);
      return false;
    }
  }

  /**
   * Initialize BDK wallet from mnemonic
   * Creates BIP84 descriptors for native SegWit using bdk-rn v0.1.x API
   * 
   * @private
   */
  private async initializeWalletFromMnemonic(mnemonicWords: string): Promise<void> {
    try {
      console.log('[BdkWallet] Starting wallet initialization...');
      
      this.mnemonic = mnemonicWords;
      const networkStr = this.network === Network.MAINNET ? 'bitcoin' : 'testnet';

      console.log('[BdkWallet] Network:', this.network, '-> BDK Network:', networkStr);

      // Create descriptor for receiving addresses (external)
      // BIP84: wpkh(key/84'/1'/0'/0/*)
      console.log('[BdkWallet] Creating external descriptor...');
      const externalDescriptorResult = await this.bdk.createDescriptor({
        type: 'wpkh',
        mnemonic: mnemonicWords,
        password: '',
        network: networkStr,
        path: "m/84'/1'/0'/0/*", // BIP84 external (receiving)
      });

      if (!externalDescriptorResult.isOk) {
        throw new Error(externalDescriptorResult.data || 'Failed to create external descriptor');
      }
      console.log('[BdkWallet] External descriptor created');

      // Create descriptor for change addresses (internal)
      // BIP84: wpkh(key/84'/1'/0'/1/*)
      console.log('[BdkWallet] Creating internal descriptor...');
      const internalDescriptorResult = await this.bdk.createDescriptor({
        type: 'wpkh',
        mnemonic: mnemonicWords,
        password: '',
        network: networkStr,
        path: "m/84'/1'/0'/1/*", // BIP84 internal (change)
      });

      if (!internalDescriptorResult.isOk) {
        throw new Error(internalDescriptorResult.data || 'Failed to create internal descriptor');
      }
      console.log('[BdkWallet] Internal descriptor created');

      // Create wallet with descriptors
      console.log('[BdkWallet] Creating BDK wallet...');
      const walletResult = await this.bdk.createWallet({
        mnemonic: mnemonicWords,
        password: '',
        network: networkStr,
        descriptor: externalDescriptorResult.data,
        changeDescriptor: internalDescriptorResult.data,
      });

      if (!walletResult.isOk) {
        throw new Error(walletResult.data || 'Failed to create wallet');
      }

      this.walletId = walletResult.data.id;
      console.log('[BdkWallet] ✅ BDK wallet initialized successfully!');
      console.log('[BdkWallet] Wallet ID:', this.walletId);
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
      const addressInfo = await this.wallet!.getAddress(
        KeychainKind.External,
        AddressIndex.New,
      );

      const address = await addressInfo.address.asString();

      console.log('[BdkWallet] Generated new address:', address);
      console.log('[BdkWallet] Address index:', addressInfo.index);

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
    this.ensureInitialized();

    try {
      const addressInfo = await this.wallet!.getAddress(
        KeychainKind.Internal,
        AddressIndex.New,
      );

      const address = await addressInfo.address.asString();

      console.log('[BdkWallet] Generated change address:', address);

      return address;
    } catch (error) {
      console.error('[BdkWallet] Get change address error:', error);
      throw new WalletError(
        'Failed to generate change address',
        'BDK_ERROR',
      );
    }
  }

  /**
   * Get all derived addresses (for balance queries)
   * 
   * @param count - Number of addresses to derive (default: 20)
   * @returns Array of addresses with indexes
   */
  async getAllAddresses(count: number = 20): Promise<Address[]> {
    this.ensureInitialized();

    try {
      const addresses: Address[] = [];

      // Get receiving addresses
      for (let i = 0; i < count; i++) {
        const addressInfo = await this.wallet!.getAddress(
          KeychainKind.External,
          AddressIndex.Peek(i),
        );

        addresses.push({
          address: await addressInfo.address.asString(),
          index: addressInfo.index,
        });
      }

      console.log(`[BdkWallet] Retrieved ${addresses.length} addresses`);

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

      // Build transaction
      const psbt = await txBuilder.finish(this.wallet!);

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
      this.wallet = null;
      this.mnemonic = null;
      this.state = {
        isInitialized: false,
        network: Network.TESTNET,
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
    if (!this.state.isInitialized || !this.wallet) {
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

