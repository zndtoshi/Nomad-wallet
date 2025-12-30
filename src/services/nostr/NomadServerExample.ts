/**
 * NomadServer Usage Example
 * 
 * This file demonstrates how to use the NomadServer client
 * to communicate with an Umbrel server via Nostr protocol.
 */

import {getNomadServer} from './NomadServer';
import {NomadServerQRPayload} from '../../types/nomadserver';

/**
 * Example 1: Initialize from QR Code
 */
export async function initializeFromQRCode(qrCodeData: string, userPrivateKey: string) {
  try {
    // Parse QR code
    const qrPayload = JSON.parse(qrCodeData) as NomadServerQRPayload;

    // Get NomadServer instance
    const server = getNomadServer();

    // Initialize with QR payload
    await server.initialize(qrPayload);

    console.log('✅ Connected to NomadServer server');
    console.log('Server:', server.getServerPubkey());
    console.log('Relays:', server.getRelays());

    return server;
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
    throw error;
  }
}

/**
 * Example 2: Get Balance for Address
 */
export async function checkBalance(address: string, userPrivateKey: string) {
  try {
    const server = getNomadServer();

    if (!server.isConnected()) {
      throw new Error('NomadServer not connected');
    }

    // Query balance
    const response = await server.getBalance(address, userPrivateKey);

    console.log('Balance Information:');
    console.log(`  Confirmed: ${response.confirmedBalance} sats`);
    console.log(`  Unconfirmed: ${response.unconfirmedBalance} sats`);
    console.log(`  Total: ${response.confirmedBalance + response.unconfirmedBalance} sats`);
    console.log(`  Transactions: ${response.transactions.length}`);

    return response;
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    throw error;
  }
}

/**
 * Example 3: Get UTXOs for Spending
 */
export async function getSpendableUTXOs(addresses: string[], userPrivateKey: string) {
  try {
    const server = getNomadServer();

    // Query UTXOs
    const response = await server.getUTXOs(addresses, userPrivateKey);

    console.log(`Found ${response.utxos.length} UTXOs:`);
    
    response.utxos.forEach((utxo, index) => {
      console.log(`  ${index + 1}. ${utxo.txid}:${utxo.vout}`);
      console.log(`     Amount: ${utxo.value} sats`);
      console.log(`     Confirmations: ${utxo.confirmations}`);
    });

    return response.utxos;
  } catch (error) {
    console.error('❌ Failed to get UTXOs:', error);
    throw error;
  }
}

/**
 * Example 4: Broadcast Transaction
 */
export async function broadcastTransaction(txHex: string, userPrivateKey: string) {
  try {
    const server = getNomadServer();

    // Broadcast transaction
    const response = await server.broadcastTx(txHex, userPrivateKey);

    if (response.success) {
      console.log('✅ Transaction broadcast successful!');
      console.log(`TXID: ${response.txid}`);
    } else {
      console.error('❌ Transaction broadcast failed:', response.error);
    }

    return response;
  } catch (error) {
    console.error('❌ Failed to broadcast:', error);
    throw error;
  }
}

/**
 * Example 5: Get Fee Estimates
 */
export async function getCurrentFees(userPrivateKey: string) {
  try {
    const server = getNomadServer();

    // Get fee estimates
    const response = await server.getFeeEstimates(userPrivateKey);

    console.log('Fee Estimates (sat/vB):');
    console.log(`  🚀 Fast (~10 min): ${response.fast}`);
    console.log(`  🚶 Medium (~30 min): ${response.medium}`);
    console.log(`  🐌 Slow (~1 hour): ${response.slow}`);

    return response;
  } catch (error) {
    console.error('❌ Failed to get fees:', error);
    throw error;
  }
}

/**
 * Example 6: Complete Workflow
 */
export async function completeWorkflowExample() {
  // Example QR code from Umbrel NomadServer
  const exampleQRCode = JSON.stringify({
    version: 1,
    app: 'nomad-server',
    nodePubkey: 'abc123...', // 64-char hex pubkey
    relays: [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
    ],
  });

  // User's Nostr private key (hex format)
  const userPrivateKey = 'your_private_key_here';

  try {
    // 1. Initialize
    console.log('📡 Initializing NomadServer...');
    await initializeFromQRCode(exampleQRCode, userPrivateKey);

    // 2. Get fee estimates
    console.log('\n💰 Getting fee estimates...');
    await getCurrentFees(userPrivateKey);

    // 3. Check balance
    console.log('\n💵 Checking balance...');
    const address = 'bc1q...'; // Your Bitcoin address
    await checkBalance(address, userPrivateKey);

    // 4. Get UTXOs
    console.log('\n🔍 Getting UTXOs...');
    await getSpendableUTXOs([address], userPrivateKey);

    // 5. Broadcast transaction (if needed)
    // const txHex = '01000000...'; // Signed transaction hex
    // await broadcastTransaction(txHex, userPrivateKey);

    console.log('\n✅ Workflow completed successfully!');
  } catch (error) {
    console.error('\n❌ Workflow failed:', error);
  }
}

/**
 * Example 7: Error Handling
 */
export async function exampleWithErrorHandling(address: string, userPrivateKey: string) {
  const server = getNomadServer();

  try {
    const response = await server.getBalance(address, userPrivateKey);
    return response;
  } catch (error: any) {
    if (error.code === 'TIMEOUT') {
      console.error('⏱️ Request timed out - server may be offline');
    } else if (error.code === 'NOT_CONNECTED') {
      console.error('🔌 Not connected to server - please initialize first');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('🌐 Network error - check your internet connection');
    } else {
      console.error('❌ Unknown error:', error.message);
    }
    throw error;
  }
}

/**
 * Example 8: Disconnect
 */
export async function disconnectExample() {
  try {
    const server = getNomadServer();
    
    await server.disconnect();
    
    console.log('👋 Disconnected from NomadServer');
  } catch (error) {
    console.error('❌ Disconnect error:', error);
  }
}

