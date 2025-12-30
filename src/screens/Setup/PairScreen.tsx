/**
 * Pair Screen - QR code scanning for NomadServer pairing
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  TextInput,
  ScrollView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getNomadServer, NomadServer} from '../../services/nostr/NomadServer';
import type {NomadServerQRPayload} from '../../types/nomadserver';
import {COLORS} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Pair'>;

const STORAGE_KEY_PAIRED = '@nomadwallet:paired';

const PairScreen: React.FC<Props> = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  /**
   * Handle QR code scan (simulated for now)
   * TODO: Implement actual QR scanning with react-native-vision-camera
   */
  const handleScanQR = async () => {
    setScanning(true);
    setManualEntry(false);
    // TODO: Implement actual QR scanning
    Alert.alert(
      'QR Scanner',
      'QR code scanning will be implemented soon. Use "Manual Entry" to paste the pairing JSON.',
      [
        {
          text: 'OK',
          onPress: () => setScanning(false),
        },
      ],
    );
  };

  /**
   * Toggle manual entry mode
   */
  const handleToggleManualEntry = () => {
    setManualEntry(!manualEntry);
    setJsonInput('');
    setJsonError(null);
    setScanning(false);
  };

  /**
   * Handle manual JSON input submission
   */
  const handleSubmitManualEntry = async () => {
    if (!jsonInput.trim()) {
      setJsonError('Please paste the pairing JSON');
      return;
    }

    setJsonError(null);
    setLoading(true);

    try {
      // Parse and validate JSON
      const payload = NomadServer.parseQRCode(jsonInput.trim());
      await initializePairing(payload);
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Invalid JSON format. Please check the pairing data.';
      setJsonError(errorMessage);
    }
  };

  /**
   * Initialize NomadServer with QR payload
   */
  const initializePairing = async (payload: NomadServerQRPayload) => {
    setLoading(true);
    try {
      const server = getNomadServer();

      // Initialize NomadServer
      await server.initialize(payload);

      // Store pairing status
      await AsyncStorage.setItem(STORAGE_KEY_PAIRED, 'true');
      await AsyncStorage.setItem(
        '@nomadwallet:server_pubkey',
        payload.nodePubkey,
      );
      await AsyncStorage.setItem(
        '@nomadwallet:relays',
        JSON.stringify(payload.relays),
      );

      setLoading(false);

      Alert.alert(
        '✅ Connected',
        'Successfully connected to your NomadServer!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('Home'),
          },
        ],
      );
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to connect to server. Please try again.';
      console.error('[PairScreen] Initialization error:', error);
      Alert.alert(
        'Connection Failed',
        errorMessage,
      );
    }
  };

  /**
   * Skip pairing for testing
   */
  const handleSkip = async () => {
    Alert.alert(
      'Skip Pairing?',
      'You can test the wallet without connecting to a server, but you won\'t be able to check balance or send transactions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            await AsyncStorage.setItem(STORAGE_KEY_PAIRED, 'skipped');
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  /**
   * Request camera permission and open settings if needed
   */
  const requestCameraPermission = async () => {
    // TODO: Implement with react-native-permissions
    Alert.alert(
      'Camera Permission',
      'Camera permission is needed to scan QR codes. Please enable it in Settings.',
      [
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📡</Text>
          <Text style={styles.title}>Connect to Your Node</Text>
          <Text style={styles.subtitle}>
            Scan the QR code from your NomadServer to connect
          </Text>
        </View>

        {scanning ? (
          <View style={styles.scannerPlaceholder}>
            <Text style={styles.scannerText}>Camera View</Text>
            <Text style={styles.scannerSubtext}>
              QR Scanner will be implemented here
            </Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScanning(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : manualEntry ? (
          <View style={styles.manualEntryContainer}>
            <View style={styles.manualEntryHeader}>
              <Text style={styles.manualEntryTitle}>Manual Entry</Text>
              <Text style={styles.manualEntrySubtitle}>
                Copy the pairing JSON from your NomadServer web
                interface and paste it below
              </Text>
              <Text style={styles.helperText}>
                💡 Get the pairing JSON from: http://your-server-ip:3829/pairing
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.jsonInput,
                  jsonError ? styles.jsonInputError : null,
                ]}
                value={jsonInput}
                onChangeText={text => {
                  setJsonInput(text);
                  setJsonError(null);
                }}
                placeholder='{"version":1,"app":"nomad-server","nodePubkey":"...","relays":[...]}'
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {jsonError && (
                <Text style={styles.errorText}>{jsonError}</Text>
              )}
            </View>

            <View style={styles.manualEntryButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSubmitManualEntry}
                disabled={loading || !jsonInput.trim()}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Connect</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleToggleManualEntry}
                disabled={loading}>
                <Text style={styles.secondaryButtonText}>Back to QR Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.instructions}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Open NomadServer on your node
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Generate a pairing QR code or copy the JSON
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Scan QR code or paste JSON manually
              </Text>
            </View>
          </View>
        )}

        {!manualEntry && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleScanQR}
              disabled={loading || scanning}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
              <Text style={styles.primaryButtonText}>Scan QR Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.manualButton]}
              onPress={handleToggleManualEntry}
              disabled={loading || scanning}>
              <Text style={styles.manualButtonText}>📝 Manual Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
              disabled={loading || scanning}>
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 You can always pair later in Settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  instructions: {
    paddingVertical: 32,
    minHeight: 200,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT,
    lineHeight: 22,
  },
  scannerPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  scannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  scannerSubtext: {
    color: '#999',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  secondaryButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  manualEntryContainer: {
    paddingVertical: 16,
  },
  manualEntryHeader: {
    marginBottom: 24,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  manualEntrySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 20,
  },
  jsonInput: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.TEXT,
    minHeight: 200,
    maxHeight: 300,
    textAlignVertical: 'top',
  },
  jsonInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  manualEntryButtons: {
    gap: 12,
    paddingTop: 8,
  },
  manualButton: {
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.9,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PairScreen;

