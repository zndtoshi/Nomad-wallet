/**
 * Send Screen - Send Bitcoin to an address
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {getNomadServer} from '../../services/nostr/NomadServer';
import {NostrService} from '../../services/nostr/NostrService';
import type {WalletBalance} from '../../types/wallet';
import {COLORS, SATOSHIS_PER_BTC} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Send'>;

type FeeSpeed = 'slow' | 'medium' | 'fast';

const SendScreen: React.FC<Props> = ({navigation}) => {
  const [address, setAddress] = useState('');
  const [amountBTC, setAmountBTC] = useState('');
  const [amountSats, setAmountSats] = useState('');
  const [feeSpeed, setFeeSpeed] = useState<FeeSpeed>('medium');
  const [feeRate, setFeeRate] = useState(3);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    loadBalance();
    loadFeeEstimates();
  }, []);

  /**
   * Load wallet balance
   */
  const loadBalance = async () => {
    try {
      const server = getNomadServer();
      if (!server.isConnected()) {
        setLoadingBalance(false);
        return;
      }

      const nostrService = NostrService.getInstance();
      const keys = nostrService.getKeys();

      if (keys?.privateKey) {
        const wallet = getBdkWallet();
        const walletBalance = await wallet.getBalance(keys.privateKey);
        setBalance(walletBalance);
      }
      setLoadingBalance(false);
    } catch (error) {
      setLoadingBalance(false);
      console.error('Failed to load balance:', error);
    }
  };

  /**
   * Load fee estimates from server
   */
  const loadFeeEstimates = async () => {
    try {
      const server = getNomadServer();
      if (!server.isConnected()) return;

      const nostrService = NostrService.getInstance();
      const keys = nostrService.getKeys();

      if (keys?.privateKey) {
        const estimates = await server.getFeeEstimates(keys.privateKey);
        // Use medium as default
        setFeeRate(estimates.medium);
      }
    } catch (error) {
      console.error('Failed to load fee estimates:', error);
    }
  };

  /**
   * Handle BTC amount input
   */
  const handleBTCInput = (text: string) => {
    setAmountBTC(text);
    if (text) {
      const btc = parseFloat(text);
      if (!isNaN(btc)) {
        setAmountSats(Math.floor(btc * SATOSHIS_PER_BTC).toString());
      }
    } else {
      setAmountSats('');
    }
  };

  /**
   * Handle sats amount input
   */
  const handleSatsInput = (text: string) => {
    setAmountSats(text);
    if (text) {
      const sats = parseInt(text, 10);
      if (!isNaN(sats)) {
        setAmountBTC((sats / SATOSHIS_PER_BTC).toFixed(8));
      }
    } else {
      setAmountBTC('');
    }
  };

  /**
   * Validate form inputs
   */
  const validateInputs = (): {valid: boolean; error?: string} => {
    if (!address.trim()) {
      return {valid: false, error: 'Please enter a recipient address'};
    }

    if (!amountSats || parseInt(amountSats, 10) <= 0) {
      return {valid: false, error: 'Please enter a valid amount'};
    }

    const amount = parseInt(amountSats, 10);

    if (balance && amount > balance.confirmed) {
      return {valid: false, error: 'Insufficient confirmed balance'};
    }

    if (amount < 546) {
      return {valid: false, error: 'Amount too small (dust limit: 546 sats)'};
    }

    return {valid: true};
  };

  /**
   * Build and send transaction
   */
  const handleSend = async () => {
    const validation = validateInputs();
    if (!validation.valid) {
      Alert.alert('Invalid Input', validation.error);
      return;
    }

    // Confirm transaction
    Alert.alert(
      'Confirm Transaction',
      `Send ${amountSats} sats to:\n${address.slice(0, 20)}...?\n\nFee Rate: ${feeRate} sat/vB`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: () => executeSend(),
          style: 'default',
        },
      ],
    );
  };

  /**
   * Execute the send transaction
   */
  const executeSend = async () => {
    setLoading(true);
    try {
      const wallet = getBdkWallet();
      const nostrService = NostrService.getInstance();
      const keys = nostrService.getKeys();

      if (!keys?.privateKey) {
        throw new Error('Nostr keys not available');
      }

      // Build transaction
      const psbt = await wallet.buildTransaction(
        address,
        parseInt(amountSats, 10),
        feeRate,
        keys.privateKey,
      );

      // TODO: Sign transaction (not yet implemented in BdkWalletService)
      // const signedTx = await wallet.signTransaction(psbt);

      // TODO: Broadcast transaction
      // const txid = await wallet.broadcastTransaction(signedTx, keys.privateKey);

      setLoading(false);

      // For now, show that transaction was built successfully
      Alert.alert(
        '⚠️ Transaction Built',
        'Transaction building succeeded, but signing is not yet implemented.\n\nThe PSBT has been created successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddress('');
              setAmountBTC('');
              setAmountSats('');
            },
          },
        ],
      );
    } catch (error: any) {
      setLoading(false);

      let errorMessage = 'Failed to send transaction. ';
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient funds.';
      } else if (error.code === 'TRANSACTION_BUILD_FAILED') {
        errorMessage += 'Transaction building failed.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      Alert.alert('Send Failed', errorMessage);
    }
  };

  /**
   * Set maximum amount
   */
  const handleMaxAmount = () => {
    if (balance) {
      const maxSats = balance.confirmed;
      setAmountSats(maxSats.toString());
      setAmountBTC((maxSats / SATOSHIS_PER_BTC).toFixed(8));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {loadingBalance ? (
            <ActivityIndicator color={COLORS.PRIMARY} />
          ) : balance ? (
            <>
              <Text style={styles.balanceAmount}>
                {balance.confirmed.toLocaleString()} sats
              </Text>
              <Text style={styles.balanceBTC}>
                ₿ {(balance.confirmed / SATOSHIS_PER_BTC).toFixed(8)}
              </Text>
            </>
          ) : (
            <Text style={styles.balanceAmount}>Not connected</Text>
          )}
        </View>

        {/* Recipient Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={address}
              onChangeText={setAddress}
              placeholder="bc1q... or tb1q..."
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount</Text>
            {balance && (
              <TouchableOpacity onPress={handleMaxAmount}>
                <Text style={styles.maxButton}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={amountBTC}
            onChangeText={handleBTCInput}
            placeholder="0.00000000"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            keyboardType="decimal-pad"
            editable={!loading}
          />
          <Text style={styles.inputSublabel}>BTC</Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={amountSats}
            onChangeText={handleSatsInput}
            placeholder="0"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={styles.inputSublabel}>satoshis</Text>
        </View>

        {/* Fee Selection */}
        <View style={styles.feeSection}>
          <Text style={styles.label}>Transaction Speed</Text>
          <View style={styles.feeButtons}>
            <TouchableOpacity
              style={[
                styles.feeButton,
                feeSpeed === 'slow' && styles.feeButtonActive,
              ]}
              onPress={() => {
                setFeeSpeed('slow');
                setFeeRate(1);
              }}>
              <Text
                style={[
                  styles.feeButtonText,
                  feeSpeed === 'slow' && styles.feeButtonTextActive,
                ]}>
                🐌 Slow
              </Text>
              <Text style={styles.feeButtonSub}>~1 hour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feeButton,
                feeSpeed === 'medium' && styles.feeButtonActive,
              ]}
              onPress={() => {
                setFeeSpeed('medium');
                setFeeRate(3);
              }}>
              <Text
                style={[
                  styles.feeButtonText,
                  feeSpeed === 'medium' && styles.feeButtonTextActive,
                ]}>
                🚶 Medium
              </Text>
              <Text style={styles.feeButtonSub}>~30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feeButton,
                feeSpeed === 'fast' && styles.feeButtonActive,
              ]}
              onPress={() => {
                setFeeSpeed('fast');
                setFeeRate(6);
              }}>
              <Text
                style={[
                  styles.feeButtonText,
                  feeSpeed === 'fast' && styles.feeButtonTextActive,
                ]}>
                🚀 Fast
              </Text>
              <Text style={styles.feeButtonSub}>~10 min</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.feeRate}>{feeRate} sat/vB</Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading || !address || !amountSats}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send Bitcoin</Text>
          )}
        </TouchableOpacity>

        {/* Warning */}
        <View style={styles.warning}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Double-check the recipient address. Bitcoin transactions cannot be
            reversed.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  balanceBTC: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  maxButton: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: COLORS.TEXT,
    backgroundColor: '#fff',
  },
  inputFlex: {
    flex: 1,
  },
  inputSublabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: COLORS.PRIMARY,
    width: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: {
    fontSize: 24,
  },
  feeSection: {
    marginBottom: 24,
  },
  feeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  feeButtonActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: '#FFF3E0',
  },
  feeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  feeButtonTextActive: {
    color: COLORS.PRIMARY,
  },
  feeButtonSub: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
  feeRate: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  warning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
  },
});

export default SendScreen;
