/**
 * Settings Screen - App settings and wallet management
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {getNomadServer} from '../../services/nostr/NomadServer';
import {COLORS, APP_CONFIG} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const [isPaired, setIsPaired] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [network, setNetwork] = useState('testnet');

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load settings from storage
   */
  const loadSettings = async () => {
    try {
      const paired = await AsyncStorage.getItem('@nomadwallet:paired');
      setIsPaired(paired === 'true');

      const backup = await AsyncStorage.getItem('WALLET_HAS_BACKUP');
      setHasBackup(backup === 'true');

      const wallet = getBdkWallet();
      const currentNetwork = wallet.getNetwork();
      setNetwork(currentNetwork);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  /**
   * Show backup phrase
   */
  const handleShowBackup = async () => {
    Alert.alert(
      'Show Backup Phrase?',
      'Your backup phrase will be displayed on the next screen. Make sure you are in a private place.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Show',
          onPress: async () => {
            try {
              const wallet = getBdkWallet();
              const mnemonic = await wallet.getMnemonic();

              if (mnemonic) {
                const words = mnemonic.split(' ');
                const formattedMnemonic = words
                  .map((word, i) => `${i + 1}. ${word}`)
                  .join('\n');

                Alert.alert(
                  '🔐 Your Backup Phrase',
                  formattedMnemonic +
                    '\n\n⚠️ NEVER share these words with anyone!',
                  [
                    {
                      text: 'I saved it',
                      onPress: async () => {
                        await wallet.markAsBackedUp();
                        setHasBackup(true);
                      },
                    },
                  ],
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to retrieve backup phrase');
            }
          },
        },
      ],
    );
  };

  /**
   * Handle pairing
   */
  const handlePair = () => {
    navigation.navigate('Pair');
  };

  /**
   * View connection status
   */
  const handleConnectionStatus = async () => {
    const server = getNomadServer();
    const connected = server.isConnected();
    const relays = server.getRelays();
    const connectedRelays = await server.getConnectedRelays();

    Alert.alert(
      'Connection Status',
      `Status: ${connected ? '✅ Connected' : '❌ Disconnected'}\n\nConfigured Relays: ${relays.length}\nConnected Relays: ${connectedRelays.length}\n\nRelays:\n${relays.map(r => `• ${r}`).join('\n')}`,
    );
  };

  /**
   * Delete wallet
   */
  const handleDeleteWallet = () => {
    Alert.alert(
      '⚠️ Delete Wallet',
      'This will permanently delete your wallet from this device. Make sure you have backed up your 12-word phrase!\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Deletion',
              'Type "DELETE" to confirm',
              async text => {
                if (text === 'DELETE') {
                  try {
                    const wallet = getBdkWallet();
                    await wallet.deleteWallet();
                    await AsyncStorage.clear();

                    Alert.alert(
                      'Wallet Deleted',
                      'Your wallet has been deleted. The app will now restart.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            // In a real app, you'd restart or navigate to setup
                            navigation.replace('Setup');
                          },
                        },
                      ],
                    );
                  } catch (error) {
                    Alert.alert('Error', 'Failed to delete wallet');
                  }
                } else {
                  Alert.alert('Cancelled', 'Wallet was not deleted');
                }
              },
              'plain-text',
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Wallet Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WALLET</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleShowBackup}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Backup Phrase</Text>
            <Text style={styles.settingDescription}>
              View your 12-word backup
            </Text>
          </View>
          <View style={styles.settingRight}>
            {hasBackup && <Text style={styles.checkmark}>✅</Text>}
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Network</Text>
            <Text style={styles.settingDescription}>{network}</Text>
          </View>
        </View>
      </View>

      {/* Connection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONNECTION</Text>

        <TouchableOpacity style={styles.settingItem} onPress={handlePair}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Pair with Node</Text>
            <Text style={styles.settingDescription}>
              {isPaired ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <View style={styles.settingRight}>
            {isPaired && <Text style={styles.statusDot}>🟢</Text>}
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleConnectionStatus}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Connection Status</Text>
            <Text style={styles.settingDescription}>View relay status</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>{APP_CONFIG.VERSION}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Network</Text>
          <Text style={styles.settingValue}>{APP_CONFIG.DEFAULT_NETWORK}</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>
          DANGER ZONE
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, styles.dangerItem]}
          onPress={handleDeleteWallet}>
          <Text style={styles.dangerLabel}>Delete Wallet</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          NomadWallet - Your Bitcoin, Your Keys
        </Text>
        <Text style={styles.footerSubtext}>Built with BDK & Nostr</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  dangerTitle: {
    color: COLORS.ERROR,
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  settingArrow: {
    fontSize: 24,
    color: COLORS.TEXT_SECONDARY,
  },
  checkmark: {
    fontSize: 16,
  },
  statusDot: {
    fontSize: 12,
  },
  dangerItem: {
    borderColor: COLORS.ERROR,
  },
  dangerLabel: {
    fontSize: 16,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    opacity: 0.7,
  },
});

export default SettingsScreen;
