/**
 * Restore Screen - Restore wallet from mnemonic
 */

import React, {useState} from 'react';
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
import {COLORS} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Restore'>;

const RestoreScreen: React.FC<Props> = ({navigation}) => {
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Validate mnemonic input
   */
  const validateMnemonic = (text: string): {valid: boolean; error?: string} => {
    const words = text.trim().toLowerCase().split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      return {
        valid: false,
        error: 'Mnemonic must be 12 or 24 words',
      };
    }

    // Check for empty words
    if (words.some(word => word.length === 0)) {
      return {
        valid: false,
        error: 'Invalid mnemonic format',
      };
    }

    return {valid: true};
  };

  /**
   * Restore wallet from mnemonic
   */
  const handleRestore = async () => {
    // Validate input
    const validation = validateMnemonic(mnemonic);
    if (!validation.valid) {
      Alert.alert('Invalid Mnemonic', validation.error);
      return;
    }

    setLoading(true);
    try {
      const wallet = getBdkWallet();

      // Restore wallet
      await wallet.restoreWallet(mnemonic.trim().toLowerCase());

      setLoading(false);

      Alert.alert(
        '✅ Wallet Restored',
        'Your wallet has been successfully restored!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('Pair'),
          },
        ],
      );
    } catch (error: any) {
      setLoading(false);

      let errorMessage = 'Failed to restore wallet. ';
      if (error.code === 'INVALID_MNEMONIC') {
        errorMessage += 'The backup phrase is invalid. Please check and try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      Alert.alert('Restore Failed', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Restore Wallet</Text>
          <Text style={styles.subtitle}>
            Enter your 12 or 24-word backup phrase to restore your wallet
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Backup Phrase</Text>
          <TextInput
            style={styles.input}
            value={mnemonic}
            onChangeText={setMnemonic}
            placeholder="word1 word2 word3 ..."
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            editable={!loading}
          />
          <Text style={styles.hint}>
            Separate words with spaces. All lowercase.
          </Text>

          {mnemonic.length > 0 && (
            <View style={styles.wordCount}>
              <Text style={styles.wordCountText}>
                {mnemonic.trim().split(/\s+/).filter(w => w.length > 0).length}{' '}
                words
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.restoreButton,
            (!mnemonic.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleRestore}
          disabled={!mnemonic.trim() || loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Wallet</Text>
          )}
        </TouchableOpacity>

        <View style={styles.warning}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Make sure you're in a private place. Never share your backup phrase
            with anyone.
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
    padding: 24,
    paddingTop: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.TEXT,
    backgroundColor: COLORS.CARD,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
  },
  wordCount: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  wordCountText: {
    fontSize: 13,
    color: '#93C5FD',
    fontWeight: '600',
  },
  restoreButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  warning: {
    flexDirection: 'row',
    backgroundColor: '#78350F',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#92400E',
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 20,
  },
});

export default RestoreScreen;

