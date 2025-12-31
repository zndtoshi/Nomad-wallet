/**
 * Receive Screen - Display QR code and address for receiving Bitcoin
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  Share,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {COLORS} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>;

const ReceiveScreen: React.FC<Props> = () => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddress();
  }, []);

  /**
   * Load current receiving address
   */
  const loadAddress = async () => {
    try {
      const wallet = getBdkWallet();
      
      // Verify wallet is initialized before attempting to get address
      if (!wallet.isInitialized()) {
        console.error('[ReceiveScreen] Wallet not initialized');
        setLoading(false);
        Alert.alert(
          'Wallet Not Ready',
          'Your wallet is not initialized. Please go back to setup.',
          [{text: 'OK'}]
        );
        return;
      }
      
      const currentAddress = await wallet.getNewAddress();
      setAddress(currentAddress);
      setLoading(false);
    } catch (error: any) {
      console.error('[ReceiveScreen] Failed to generate address:', error);
      setLoading(false);
      const errorMessage = error?.message || 'Failed to generate address';
      Alert.alert(
        'Error',
        errorMessage,
        [{text: 'OK'}]
      );
    }
  };

  /**
   * Copy address to clipboard
   */
  const handleCopy = () => {
    Clipboard.setString(address);
    Alert.alert('✅ Copied', 'Address copied to clipboard');
  };

  /**
   * Share address using Share API
   */
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Send Bitcoin to: ${address}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  /**
   * Generate new address
   */
  const handleNewAddress = async () => {
    Alert.alert(
      'Generate New Address?',
      'A new address will be generated. The current address will still work.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            await loadAddress();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Generating address...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Receive Bitcoin</Text>
        <Text style={styles.subtitle}>
          Share this address to receive Bitcoin
        </Text>
      </View>

      {/* QR Code Placeholder */}
      <View style={styles.qrContainer}>
        <View style={styles.qrCode}>
          <Text style={styles.qrPlaceholder}>📱</Text>
          <Text style={styles.qrText}>QR Code</Text>
          <Text style={styles.qrSubtext}>
            QR code will be rendered here
          </Text>
          <Text style={styles.qrAddress}>{address}</Text>
        </View>
      </View>

      {/* Address Display */}
      <View style={styles.addressSection}>
        <Text style={styles.addressLabel}>Your Bitcoin Address</Text>
        <View style={styles.addressBox}>
          <Text style={styles.address} selectable>
            {address}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCopy}>
          <Text style={styles.buttonIcon}>📋</Text>
          <Text style={styles.primaryButtonText}>Copy Address</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleShare}>
          <Text style={styles.buttonIcon}>↗️</Text>
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.newAddressButton}
        onPress={handleNewAddress}>
        <Text style={styles.newAddressButtonText}>
          🔄 Generate New Address
        </Text>
      </TouchableOpacity>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>💡</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>About Bitcoin Addresses</Text>
          <Text style={styles.infoText}>
            • This address can be used multiple times{'\n'}
            • A new address is generated after each use{'\n'}
            • All your addresses are linked to your wallet
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCode: {
    width: 280,
    height: 280,
    backgroundColor: COLORS.CARD,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    padding: 20,
  },
  qrPlaceholder: {
    fontSize: 48,
    marginBottom: 12,
  },
  qrText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  qrSubtext: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  qrAddress: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  addressSection: {
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  addressBox: {
    backgroundColor: COLORS.CARD,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  address: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: COLORS.CARD,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  buttonIcon: {
    fontSize: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  newAddressButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  newAddressButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93C5FD',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#93C5FD',
    lineHeight: 20,
  },
});

export default ReceiveScreen;
