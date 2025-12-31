/**
 * Setup Screen - First-run wallet setup
 * Shown when no wallet exists
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {NostrClient} from '../../services/nostr/NostrClient';
import {COLORS} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

const SetupScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);

  /**
   * Create new wallet with mnemonic
   */
  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      const wallet = getBdkWallet();

      // Generate new wallet
      const mnemonic = await wallet.createWallet();

      setLoading(false);

      // Navigate to mnemonic display screen
      navigation.navigate('MnemonicDisplay', {mnemonic});
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Error',
        error.message || 'Failed to create wallet. Please try again.',
      );
    }
  };

  /**
   * Navigate to restore screen
   */
  const handleRestoreWallet = () => {
    navigation.navigate('Restore');
  };

  /**
   * Navigate to Umbrel pairing screen
   */
  const handleConnectUmbrel = () => {
    navigation.navigate('Pair');
  };

  /**
   * Debug: Test Nostr connection with hardcoded pairing
   */
  const handleTestNostrConnection = async () => {
    // NOTE: Replace with actual Umbrel server pubkey when available
    const TEST_PAIRING = {
      version: 1,
      app: 'nomad-server',
      nodePubkey: 'REPLACE_WITH_ACTUAL_PUBKEY', // TODO: Get from server
      relays: [
        'wss://relay.damus.io',
        'wss://nostr.wine',
      ],
    };

    console.log('[SetupScreen] ===== DEBUG TEST CONNECTION START =====');
    console.log('[SetupScreen] Test pairing config:', JSON.stringify(TEST_PAIRING, null, 2));

    try {
      Alert.alert(
        'Debug Test',
        `Testing connection to:\n${TEST_PAIRING.relays.join('\n')}\n\nCheck console logs for details.`,
        [{text: 'OK'}],
      );

      const client = new NostrClient();
      console.log('[SetupScreen] Created NostrClient instance');

      console.log('[SetupScreen] Attempting to connect...');
      await client.connect(TEST_PAIRING.relays);
      
      console.log('[SetupScreen] ✅ Connection successful!');
      Alert.alert(
        '✅ Success',
        `Successfully connected to ${TEST_PAIRING.relays.length} relay(s)!\n\nCheck console for detailed logs.`,
        [{text: 'OK'}],
      );
    } catch (error: any) {
      console.error('[SetupScreen] ❌ Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error && error.stack 
        ? `\n\nStack:\n${error.stack.substring(0, 500)}...`
        : '';
      
      Alert.alert(
        '❌ Connection Failed',
        `Error: ${errorMessage}${errorDetails}\n\nCheck console for full details.`,
        [{text: 'OK'}],
      );
    }

    console.log('[SetupScreen] ===== DEBUG TEST CONNECTION END =====');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🛡️</Text>
        <Text style={styles.title}>True Self-Custody Bitcoin Wallet</Text>
        <Text style={styles.subtitle}>
          Complete control. Complete privacy.
        </Text>
      </View>

      {/* Self-Custody Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>
          🔐 Your Keys, Your Bitcoin
        </Text>
        <View style={styles.bulletPoints}>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Your keys stay on your device - never shared
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Connect to YOUR Umbrel node only
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              No third-party servers or APIs
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Private and sovereign by design
            </Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          NomadWallet connects to your self-hosted Umbrel node to query the 
          Bitcoin blockchain. Your private keys and wallet data never leave 
          your device.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateWallet}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create New Wallet</Text>
              <Text style={styles.buttonSubtext}>
                Generate a new 12-word backup phrase
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleRestoreWallet}
          disabled={loading}>
          <Text style={styles.secondaryButtonText}>Restore Wallet</Text>
          <Text style={[styles.buttonSubtext, styles.secondarySubtext]}>
            I already have a backup phrase
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.umbrelButton]}
          onPress={handleConnectUmbrel}
          disabled={loading}>
          <Text style={styles.umbrelButtonText}>⚡ Connect to Umbrel</Text>
          <Text style={[styles.buttonSubtext, styles.umbrelSubtext]}>
            Scan QR code to connect to your node
          </Text>
        </TouchableOpacity>

        {/* Debug Test Button (always visible for testing) */}
        <TouchableOpacity
          style={[styles.button, styles.debugButton]}
          onPress={handleTestNostrConnection}
          disabled={loading}>
          <Text style={styles.debugButtonText}>🐛 Debug: Test Nostr Connection</Text>
          <Text style={[styles.buttonSubtext, styles.debugSubtext]}>
            Test WebSocket connection to relays
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your keys, your Bitcoin. Not your keys, not your coins.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Explanation Box
  explanationBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  bulletPoints: {
    gap: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT,
    lineHeight: 20,
  },
  // Info Box
  infoBox: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#004085',
    lineHeight: 20,
  },
  // Buttons
  buttonContainer: {
    gap: 14,
    marginBottom: 24,
  },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  secondaryButton: {
    backgroundColor: COLORS.CARD,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  secondaryButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  secondarySubtext: {
    color: COLORS.PRIMARY,
    opacity: 0.8,
  },
  // Umbrel Button (highlighted)
  umbrelButton: {
    backgroundColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  umbrelButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  umbrelSubtext: {
    color: '#fff',
    opacity: 0.9,
  },
  // Debug Button (dev only)
  debugButton: {
    backgroundColor: '#E74C3C',
    borderWidth: 2,
    borderColor: '#C0392B',
    borderStyle: 'dashed',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  debugSubtext: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 11,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SetupScreen;
