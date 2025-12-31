/**
 * Home Screen - Main wallet dashboard
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {getNomadServer} from '../../services/nostr/NomadServer';
import {NostrService} from '../../services/nostr/NostrService';
import type {WalletBalance} from '../../types/wallet';
import {COLORS, SATOSHIS_PER_BTC} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPaired, setIsPaired] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  /**
   * Load wallet data (balance and address)
   */
  const loadWalletData = async () => {
    try {
      const wallet = getBdkWallet();

      // Verify wallet is initialized before attempting to get address
      if (!wallet.isInitialized()) {
        console.error('[HomeScreen] Wallet not initialized');
        setLoading(false);
        Alert.alert(
          'Wallet Not Ready',
          'Your wallet is not initialized. Please restart the app.',
          [{text: 'OK'}]
        );
        return;
      }

      // Get current address
      const currentAddress = await wallet.getNewAddress();
      setAddress(currentAddress);

      // Check if NomadServer is connected
      const server = getNomadServer();
      const connected = server.isConnected();
      setIsPaired(connected);

      if (connected) {
        // Get Nostr private key
        const nostrService = NostrService.getInstance();
        const keys = nostrService.getKeys();

        if (keys?.privateKey) {
          // Try to fetch balance, but don't fail if it times out
          try {
            const walletBalance = await wallet.getBalance(keys.privateKey);
            setBalance(walletBalance);
          } catch (balanceError: any) {
            console.warn('[HomeScreen] Failed to fetch balance:', balanceError);
            // Don't show error alert for balance failures - just leave balance as null
            // The UI will show 0 balance and "Not connected to server" message
            // This is expected if server is slow or unreachable
          }
        }
      }

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.error('[HomeScreen] Failed to load wallet data:', error);
      // Only show error for critical failures (like wallet not initialized)
      // Balance failures are handled above and don't need alerts
      if (error?.code === 'NOT_INITIALIZED') {
        Alert.alert(
          'Wallet Not Ready',
          'Your wallet is not initialized. Please restart the app.',
          [{text: 'OK'}]
        );
      }
    }
  };

  /**
   * Refresh balance (pull to refresh)
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  }, []);

  /**
   * Copy address to clipboard
   */
  const handleCopyAddress = () => {
    Clipboard.setString(address);
    Alert.alert('✅ Copied', 'Address copied to clipboard');
  };

  /**
   * Navigate to settings
   */
  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  /**
   * Handle refresh button press
   */
  const handleRefresh = async () => {
    setLoading(true);
    await loadWalletData();
  };

  /**
   * Format balance in BTC
   */
  const formatBTC = (sats: number): string => {
    return (sats / SATOSHIS_PER_BTC).toFixed(8);
  };

  /**
   * Test Nostr connection with a simple request
   */
  const handleTestNostrRequest = async () => {
    console.log('[HomeScreen] ===== TEST NOSTR REQUEST START =====');
    
    try {
      const server = getNomadServer();
      
      if (!server.isConnected()) {
        Alert.alert(
          'Not Connected',
          'NomadServer is not connected. Please pair with your server first.',
        );
        console.log('[HomeScreen] ❌ NomadServer not connected');
        return;
      }

      // Get Nostr private key
      const nostrService = NostrService.getInstance();
      const keys = nostrService.getKeys();

      if (!keys?.privateKey) {
        Alert.alert('Error', 'Nostr keys not available');
        console.log('[HomeScreen] ❌ Nostr keys not available');
        return;
      }

      console.log('[HomeScreen] Sending test bitcoin_lookup request...');
      console.log('[HomeScreen] Using address:', address || 'test-address');
      console.log('[HomeScreen] Server pubkey:', server.getServerPubkey());
      console.log('[HomeScreen] Relays:', server.getRelays());

      // Use a test address (you can use any Bitcoin address for testing)
      const testAddress = address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      
      Alert.alert(
        'Testing Request',
        `Sending test request for address:\n${testAddress}\n\nCheck console logs for details.`,
        [{text: 'OK'}],
      );

      const response = await server.getBalance([testAddress], keys.privateKey);
      
      console.log('[HomeScreen] ✅ Test request successful!');
      console.log('[HomeScreen] Response:', JSON.stringify(response, null, 2));
      
      Alert.alert(
        '✅ Success',
        `Test request successful!\n\nConfirmed: ${response.confirmedBalance} sats\nUnconfirmed: ${response.unconfirmedBalance} sats\nTransactions: ${response.transactions?.length || 0}\n\nCheck console for full details.`,
        [{text: 'OK'}],
      );
    } catch (error: any) {
      console.error('[HomeScreen] ❌ Test request failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error && error.stack 
        ? `\n\nStack:\n${error.stack.substring(0, 500)}...`
        : '';
      
      Alert.alert(
        '❌ Request Failed',
        `Error: ${errorMessage}${errorDetails}\n\nCheck console for full details.`,
        [{text: 'OK'}],
      );
    }

    console.log('[HomeScreen] ===== TEST NOSTR REQUEST END =====');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header with Settings */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NomadWallet</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshButton}
            disabled={loading}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : balance ? (
          <>
            <Text style={styles.balanceAmount}>
              ₿ {formatBTC(balance.total)}
            </Text>
            <View style={styles.balanceDetails}>
              <View style={styles.balanceDetail}>
                <Text style={styles.balanceDetailLabel}>Confirmed</Text>
                <Text style={styles.balanceDetailValue}>
                  {balance.confirmed.toLocaleString()} sats
                </Text>
              </View>
              {balance.unconfirmed > 0 && (
                <View style={styles.balanceDetail}>
                  <Text style={styles.balanceDetailLabel}>Unconfirmed</Text>
                  <Text style={styles.balanceDetailValue}>
                    {balance.unconfirmed.toLocaleString()} sats
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.connectionStatus}>
              <View style={styles.connectionStatusRow}>
                <View style={styles.connectionIndicatorConnected} />
                <Text style={styles.connectionStatusText}>
                  Connected to server
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.balanceAmount}>₿ 0.00000000</Text>
            <View style={styles.connectionStatus}>
              {isPaired ? (
                <View style={styles.connectionStatusRow}>
                  <View style={styles.connectionIndicatorConnected} />
                  <Text style={styles.connectionStatusText}>
                    Connected to server
                  </Text>
                </View>
              ) : (
                <View style={styles.connectionStatusRow}>
                  <View style={styles.connectionIndicatorDisconnected} />
                  <Text style={styles.connectionStatusText}>
                    Not connected to server
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Address Card */}
      <View style={styles.addressCard}>
        <Text style={styles.cardTitle}>Your Bitcoin Address</Text>
        <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
          {address || 'Loading...'}
        </Text>
        <View style={styles.addressButtons}>
          <TouchableOpacity
            style={styles.addressButton}
            onPress={handleCopyAddress}>
            <Text style={styles.addressButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addressButton}
            onPress={() => navigation.navigate('Receive')}>
            <Text style={styles.addressButtonText}>QR Code</Text>
          </TouchableOpacity>
        </View>
        
        {/* Test Nostr Connection Button (only show when paired) */}
        {isPaired && __DEV__ && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNostrRequest}>
            <Text style={styles.testButtonText}>🐛 Test Nostr Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.receiveButton]}
          onPress={() => navigation.navigate('Receive')}>
          <Text style={styles.actionButtonIcon}>📥</Text>
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.sendButton]}
          onPress={() => navigation.navigate('Send')}>
          <Text style={styles.actionButtonIcon}>📤</Text>
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions Section */}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📜</Text>
          <Text style={styles.emptyStateText}>No transactions yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Your transactions will appear here
          </Text>
        </View>
      </View>

      {/* Pull to Refresh Hint */}
      {!loading && (
        <View style={styles.refreshHint}>
          <Text style={styles.refreshHintText}>
            Pull down to refresh balance
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    fontSize: 24,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  balanceCard: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  balanceDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  balanceDetail: {
    alignItems: 'center',
  },
  balanceDetailLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  balanceDetailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  notPairedText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 8,
  },
  connectionStatus: {
    marginTop: 12,
    alignItems: 'center',
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionIndicatorConnected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Green
  },
  connectionIndicatorDisconnected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444', // Red
  },
  connectionStatusText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
  },
  addressCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  addressButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addressButton: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  addressButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  testButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0392B',
    borderStyle: 'dashed',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  receiveButton: {
    backgroundColor: COLORS.SUCCESS,
  },
  sendButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  transactionsSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    opacity: 0.7,
  },
  refreshHint: {
    alignItems: 'center',
    paddingTop: 16,
  },
  refreshHintText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    opacity: 0.6,
  },
});

export default HomeScreen;
