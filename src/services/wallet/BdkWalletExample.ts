/**
 * BDK Wallet Usage Examples
 * 
 * Complete examples demonstrating how to use the BdkWalletService
 * for Bitcoin wallet operations in NomadWallet.
 */

import {getBdkWallet} from './BdkWalletService';
import {getNomadServer} from '../nostr/NomadServer';

/**
 * Example 1: Create New Wallet
 * Generate a new wallet and show mnemonic to user for backup
 */
export async function createNewWallet() {
  try {
    const wallet = getBdkWallet();

    // Create new wallet (generates 12-word mnemonic)
    const mnemonic = await wallet.createWallet();

    console.log('✅ Wallet created successfully!');
    console.log('🔐 Mnemonic (SHOW TO USER FOR BACKUP):');
    console.log(mnemonic);
    console.log('⚠️  User MUST write this down and store safely!');

    // Get first receiving address
    const address = await wallet.getNewAddress();
    console.log('📬 First address:', address);

    return {mnemonic, address};
  } catch (error) {
    console.error('❌ Failed to create wallet:', error);
    throw error;
  }
}

/**
 * Example 2: Restore Wallet from Mnemonic
 * Restore an existing wallet from backup
 */
export async function restoreExistingWallet(mnemonic: string) {
  try {
    const wallet = getBdkWallet();

    // Restore wallet from mnemonic
    await wallet.restoreWallet(mnemonic);

    console.log('✅ Wallet restored successfully!');

    // Get addresses
    const addresses = await wallet.getAllAddresses(10);
    console.log(`📬 Restored ${addresses.length} addresses`);

    return addresses;
  } catch (error) {
    console.error('❌ Failed to restore wallet:', error);
    throw error;
  }
}

/**
 * Example 3: Load Existing Wallet on App Start
 * Load wallet from storage when app launches
 */
export async function loadWalletOnStartup() {
  try {
    const wallet = getBdkWallet();

    // Try to load existing wallet
    const exists = await wallet.loadWallet();

    if (exists) {
      console.log('✅ Wallet loaded from storage');
      
      const state = wallet.getState();
      console.log('Network:', state.network);
      console.log('Has backup:', state.hasBackup);
      
      return true;
    } else {
      console.log('ℹ️  No wallet found - user needs to create or restore');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to load wallet:', error);
    throw error;
  }
}

/**
 * Example 4: Check Wallet Balance
 * Query balance using NomadServer
 */
export async function checkWalletBalance(userNostrPrivateKey: string) {
  try {
    const wallet = getBdkWallet();

    // Get balance from NomadServer
    const balance = await wallet.getBalance(userNostrPrivateKey);

    console.log('💰 Wallet Balance:');
    console.log(`  Confirmed: ${balance.confirmed} sats`);
    console.log(`  Unconfirmed: ${balance.unconfirmed} sats`);
    console.log(`  Total: ${balance.total} sats`);

    // Convert to BTC
    const btcBalance = balance.total / 100_000_000;
    console.log(`  Total: ${btcBalance.toFixed(8)} BTC`);

    return balance;
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    throw error;
  }
}

/**
 * Example 5: Get All UTXOs
 * Fetch UTXOs for potential spending
 */
export async function getSpendableUTXOs(userNostrPrivateKey: string) {
  try {
    const wallet = getBdkWallet();

    // Get UTXOs from NomadServer
    const utxos = await wallet.getUTXOs(userNostrPrivateKey);

    console.log(`💎 Found ${utxos.length} UTXOs:`);
    
    let totalValue = 0;
    utxos.forEach((utxo, index) => {
      console.log(`  ${index + 1}. ${utxo.txid.slice(0, 16)}...`);
      console.log(`     Amount: ${utxo.value} sats`);
      console.log(`     Confirmations: ${utxo.confirmations}`);
      console.log(`     Address: ${utxo.address}`);
      totalValue += utxo.value;
    });

    console.log(`💰 Total UTXO value: ${totalValue} sats`);

    return utxos;
  } catch (error) {
    console.error('❌ Failed to get UTXOs:', error);
    throw error;
  }
}

/**
 * Example 6: Generate New Receiving Address
 * Create a new address for receiving payments
 */
export async function generateReceivingAddress() {
  try {
    const wallet = getBdkWallet();

    const address = await wallet.getNewAddress();

    console.log('📬 New receiving address:', address);
    console.log('✅ Share this address to receive Bitcoin');

    return address;
  } catch (error) {
    console.error('❌ Failed to generate address:', error);
    throw error;
  }
}

/**
 * Example 7: Build and Broadcast Transaction
 * Send Bitcoin to an address
 */
export async function sendBitcoin(
  recipientAddress: string,
  amountSats: number,
  userNostrPrivateKey: string,
) {
  try {
    const wallet = getBdkWallet();
    const server = getNomadServer();

    // Check balance first
    const balance = await wallet.getBalance(userNostrPrivateKey);
    
    if (balance.confirmed < amountSats) {
      throw new Error('Insufficient confirmed balance');
    }

    console.log('🔨 Building transaction...');

    // Get fee estimate
    const feeEstimates = await server.getFeeEstimates(userNostrPrivateKey);
    console.log(`💸 Fee rate: ${feeEstimates.medium} sat/vB`);

    // Build transaction
    const psbt = await wallet.buildTransaction(
      recipientAddress,
      amountSats,
      feeEstimates.medium,
      userNostrPrivateKey,
    );

    console.log('✅ Transaction built');

    // Sign transaction
    // TODO: This is not yet implemented in BDK service
    // const signedTx = await wallet.signTransaction(psbt);
    // console.log('✅ Transaction signed');

    // Broadcast transaction
    // const txid = await wallet.broadcastTransaction(signedTx, userNostrPrivateKey);
    // console.log('✅ Transaction broadcast!');
    // console.log(`📡 TXID: ${txid}`);

    // return txid;

    console.log('⚠️  Transaction signing not yet implemented');
    return null;
  } catch (error) {
    console.error('❌ Failed to send Bitcoin:', error);
    throw error;
  }
}

/**
 * Example 8: Display Mnemonic for Backup
 * Show mnemonic to user for backup (settings screen)
 */
export async function showMnemonicForBackup() {
  try {
    const wallet = getBdkWallet();

    const mnemonic = await wallet.getMnemonic();

    if (!mnemonic) {
      throw new Error('Mnemonic not found');
    }

    console.log('🔐 WALLET BACKUP (12 WORDS):');
    console.log('═'.repeat(50));
    
    const words = mnemonic.split(' ');
    words.forEach((word, index) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${word}`);
    });
    
    console.log('═'.repeat(50));
    console.log('⚠️  NEVER share these words with anyone!');
    console.log('⚠️  Anyone with these words can access your Bitcoin!');

    return mnemonic;
  } catch (error) {
    console.error('❌ Failed to get mnemonic:', error);
    throw error;
  }
}

/**
 * Example 9: Complete Wallet Setup Flow
 * Full flow from initialization to first transaction
 */
export async function completeWalletSetupFlow(userNostrPrivateKey: string) {
  console.log('🚀 Starting complete wallet setup flow...\n');

  try {
    // Step 1: Check if wallet exists
    console.log('📋 Step 1: Checking for existing wallet...');
    const wallet = getBdkWallet();
    const exists = await wallet.walletExists();

    if (exists) {
      console.log('✅ Wallet found, loading...');
      await wallet.loadWallet();
    } else {
      console.log('❌ No wallet found, creating new one...');
      const mnemonic = await wallet.createWallet();
      console.log('✅ Wallet created!');
      console.log(`🔐 Mnemonic: ${mnemonic}`);
    }

    // Step 2: Initialize NomadServer
    console.log('\n📋 Step 2: Connecting to NomadServer...');
    const server = getNomadServer();
    
    if (!server.isConnected()) {
      console.log('⚠️  NomadServer not connected - skipping network queries');
      return;
    }

    // Step 3: Get receiving address
    console.log('\n📋 Step 3: Generating receiving address...');
    const address = await wallet.getNewAddress();
    console.log(`✅ Address: ${address}`);

    // Step 4: Check balance
    console.log('\n📋 Step 4: Checking balance...');
    const balance = await wallet.getBalance(userNostrPrivateKey);
    console.log(`✅ Balance: ${balance.total} sats`);

    // Step 5: Get UTXOs
    console.log('\n📋 Step 5: Fetching UTXOs...');
    const utxos = await wallet.getUTXOs(userNostrPrivateKey);
    console.log(`✅ UTXOs: ${utxos.length}`);

    console.log('\n🎉 Wallet setup complete!');
    console.log('═'.repeat(50));
    console.log('📬 Receiving address:', address);
    console.log('💰 Balance:', balance.total, 'sats');
    console.log('💎 UTXOs:', utxos.length);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Wallet setup failed:', error);
    throw error;
  }
}

/**
 * Example 10: Delete Wallet (Factory Reset)
 * Remove wallet from device - DESTRUCTIVE!
 */
export async function deleteWalletWarning() {
  console.log('⚠️  WARNING: DESTRUCTIVE OPERATION!');
  console.log('═'.repeat(50));
  console.log('This will PERMANENTLY delete your wallet from this device.');
  console.log('You will LOSE ACCESS to your Bitcoin unless you have');
  console.log('backed up your 12-word mnemonic phrase!');
  console.log('═'.repeat(50));
  console.log('');
  console.log('To delete wallet, user must:');
  console.log('1. Confirm they have written down their mnemonic');
  console.log('2. Confirm they understand this is irreversible');
  console.log('3. Type "DELETE" to confirm');
  console.log('');
  console.log('Then call: await wallet.deleteWallet()');
}

/**
 * Example 11: Error Handling
 * Proper error handling patterns
 */
export async function errorHandlingExample(userNostrPrivateKey: string) {
  const wallet = getBdkWallet();

  try {
    // This will fail if wallet not initialized
    const balance = await wallet.getBalance(userNostrPrivateKey);
    return balance;
  } catch (error: any) {
    if (error.code === 'NOT_INITIALIZED') {
      console.error('🔌 Wallet not initialized - please create or restore wallet');
    } else if (error.code === 'INVALID_MNEMONIC') {
      console.error('🔐 Invalid mnemonic phrase provided');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('💸 Not enough Bitcoin to complete transaction');
    } else if (error.code === 'BROADCAST_FAILED') {
      console.error('📡 Failed to broadcast transaction to network');
    } else {
      console.error('❌ Unknown error:', error.message);
    }
    throw error;
  }
}

