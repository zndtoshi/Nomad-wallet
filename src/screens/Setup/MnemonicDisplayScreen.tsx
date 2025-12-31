/**
 * Mnemonic Display Screen
 * Shows the 12-word backup phrase to the user for safekeeping
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import {getBdkWallet} from '../../services/wallet/BdkWalletService';
import {COLORS} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'MnemonicDisplay'> & {
  mnemonic: string;
};

const MnemonicDisplayScreen: React.FC<Props> = ({navigation, route}) => {
  const mnemonic = route.params?.mnemonic || '';
  const words = mnemonic.trim().split(/\s+/);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const handleContinue = async () => {
    if (!hasConfirmed) {
      Alert.alert(
        'Please Confirm',
        'Please confirm that you have written down all 12 words before continuing.',
      );
      return;
    }

    try {
      const wallet = getBdkWallet();
      await wallet.markAsBackedUp();
      navigation.replace('Pair');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to proceed');
    }
  };

  const handleShowAgain = () => {
    setHasConfirmed(false);
    // Scroll to top
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Backup Your Wallet</Text>
        <Text style={styles.subtitle}>
          Write down these 12 words in order. You will need them to recover
          your wallet if you lose access to this device.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>
          • Write these words down on paper{'\n'}
          • Store them in a safe place{'\n'}
          • Never share them with anyone{'\n'}
          • Never store them digitally
        </Text>
      </View>

      <View style={styles.wordsContainer}>
        {words.map((word, index) => (
          <View key={index} style={styles.wordBox}>
            <Text style={styles.wordNumber}>{index + 1}</Text>
            <Text style={styles.wordText}>{word}</Text>
          </View>
        ))}
      </View>

      <View style={styles.confirmationBox}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setHasConfirmed(!hasConfirmed)}>
          <View
            style={[
              styles.checkboxInner,
              hasConfirmed && styles.checkboxChecked,
            ]}>
            {hasConfirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I have written down all 12 words in the correct order
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !hasConfirmed && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!hasConfirmed}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.showAgainButton}
          onPress={handleShowAgain}>
          <Text style={styles.showAgainButtonText}>Show Again</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
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
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  wordBox: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  wordNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginRight: 12,
    minWidth: 24,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    flex: 1,
  },
  confirmationBox: {
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.PRIMARY,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  showAgainButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  showAgainButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default MnemonicDisplayScreen;

