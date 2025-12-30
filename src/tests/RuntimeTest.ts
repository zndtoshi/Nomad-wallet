/**
 * Runtime Test - Verify all modules can be imported without errors
 * Run this to check for import/initialization issues
 */

export async function runRuntimeTests(): Promise<{success: boolean; errors: string[]}> {
  const errors: string[] = [];
  
  console.log('[RuntimeTest] Starting runtime tests...');

  // Test 1: Check React Native modules
  try {
    console.log('[RuntimeTest] Test 1: React Native core modules');
    const RN = require('react-native');
    if (!RN.AppRegistry || !RN.View || !RN.Text) {
      errors.push('React Native core modules missing');
    }
    console.log('[RuntimeTest] ✅ React Native core modules OK');
  } catch (error) {
    errors.push(`React Native import error: ${error}`);
    console.error('[RuntimeTest] ❌ React Native error:', error);
  }

  // Test 2: Check AsyncStorage
  try {
    console.log('[RuntimeTest] Test 2: AsyncStorage');
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    if (!AsyncStorage.default) {
      errors.push('AsyncStorage not available');
    }
    console.log('[RuntimeTest] ✅ AsyncStorage OK');
  } catch (error) {
    errors.push(`AsyncStorage error: ${error}`);
    console.error('[RuntimeTest] ❌ AsyncStorage error:', error);
  }

  // Test 3: Check react-native-fs
  try {
    console.log('[RuntimeTest] Test 3: React Native FS');
    const RNFS = require('react-native-fs');
    if (!RNFS.DocumentDirectoryPath) {
      errors.push('React Native FS not properly configured');
    }
    console.log('[RuntimeTest] ✅ React Native FS OK');
  } catch (error) {
    errors.push(`React Native FS error: ${error}`);
    console.error('[RuntimeTest] ❌ React Native FS error:', error);
  }

  // Test 4: Check BDK-RN
  try {
    console.log('[RuntimeTest] Test 4: BDK-RN');
    const BDK = require('bdk-rn');
    if (!BDK.Mnemonic || !BDK.Wallet) {
      errors.push('BDK-RN modules not available');
    }
    console.log('[RuntimeTest] ✅ BDK-RN OK');
  } catch (error) {
    errors.push(`BDK-RN error: ${error}`);
    console.error('[RuntimeTest] ❌ BDK-RN error:', error);
  }

  // Test 5: Check nostr-tools
  try {
    console.log('[RuntimeTest] Test 5: nostr-tools');
    const nostrTools = require('nostr-tools');
    if (!nostrTools.generatePrivateKey || !nostrTools.getPublicKey) {
      errors.push('nostr-tools not properly loaded');
    }
    console.log('[RuntimeTest] ✅ nostr-tools OK');
  } catch (error) {
    errors.push(`nostr-tools error: ${error}`);
    console.error('[RuntimeTest] ❌ nostr-tools error:', error);
  }

  // Test 6: Check react-native-get-random-values
  try {
    console.log('[RuntimeTest] Test 6: react-native-get-random-values');
    require('react-native-get-random-values');
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      errors.push('crypto.getRandomValues not available');
    }
    console.log('[RuntimeTest] ✅ react-native-get-random-values OK');
  } catch (error) {
    errors.push(`react-native-get-random-values error: ${error}`);
    console.error('[RuntimeTest] ❌ react-native-get-random-values error:', error);
  }

  // Test 7: Check React Navigation
  try {
    console.log('[RuntimeTest] Test 7: React Navigation');
    const NavNative = require('@react-navigation/native');
    const NavStack = require('@react-navigation/native-stack');
    if (!NavNative.NavigationContainer || !NavStack.createNativeStackNavigator) {
      errors.push('React Navigation not properly configured');
    }
    console.log('[RuntimeTest] ✅ React Navigation OK');
  } catch (error) {
    errors.push(`React Navigation error: ${error}`);
    console.error('[RuntimeTest] ❌ React Navigation error:', error);
  }

  // Test 8: Check Safe Area Context
  try {
    console.log('[RuntimeTest] Test 8: Safe Area Context');
    const SafeArea = require('react-native-safe-area-context');
    if (!SafeArea.SafeAreaProvider) {
      errors.push('Safe Area Context not available');
    }
    console.log('[RuntimeTest] ✅ Safe Area Context OK');
  } catch (error) {
    errors.push(`Safe Area Context error: ${error}`);
    console.error('[RuntimeTest] ❌ Safe Area Context error:', error);
  }

  // Test 9: Check our services
  try {
    console.log('[RuntimeTest] Test 9: BdkWalletService');
    const {getBdkWallet} = require('../services/wallet/BdkWalletService');
    const wallet = getBdkWallet();
    if (!wallet) {
      errors.push('BdkWalletService not initialized');
    }
    console.log('[RuntimeTest] ✅ BdkWalletService OK');
  } catch (error) {
    errors.push(`BdkWalletService error: ${error}`);
    console.error('[RuntimeTest] ❌ BdkWalletService error:', error);
  }

  // Test 10: Check NostrService
  try {
    console.log('[RuntimeTest] Test 10: NostrService');
    const {NostrService} = require('../services/nostr/NostrService');
    const nostrService = NostrService.getInstance();
    if (!nostrService) {
      errors.push('NostrService not initialized');
    }
    console.log('[RuntimeTest] ✅ NostrService OK');
  } catch (error) {
    errors.push(`NostrService error: ${error}`);
    console.error('[RuntimeTest] ❌ NostrService error:', error);
  }

  // Test 11: Check NomadServer
  try {
    console.log('[RuntimeTest] Test 11: NomadServer');
    const {getNomadServer} = require('../services/nostr/NomadServer');
    const server = getNomadServer();
    if (!server) {
      errors.push('NomadServer not initialized');
    }
    console.log('[RuntimeTest] ✅ NomadServer OK');
  } catch (error) {
    errors.push(`NomadServer error: ${error}`);
    console.error('[RuntimeTest] ❌ NomadServer error:', error);
  }

  // Test 12: Check screen imports
  try {
    console.log('[RuntimeTest] Test 12: Screen imports');
    require('../screens/Setup/SetupScreen');
    require('../screens/Setup/RestoreScreen');
    require('../screens/Setup/PairScreen');
    require('../screens/Home/HomeScreen');
    require('../screens/Send/SendScreen');
    require('../screens/Receive/ReceiveScreen');
    require('../screens/Settings/SettingsScreen');
    console.log('[RuntimeTest] ✅ All screens OK');
  } catch (error) {
    errors.push(`Screen import error: ${error}`);
    console.error('[RuntimeTest] ❌ Screen import error:', error);
  }

  console.log('[RuntimeTest] Tests complete');
  console.log(`[RuntimeTest] Total errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error('[RuntimeTest] ❌ FAILED with errors:');
    errors.forEach((err, i) => {
      console.error(`  ${i + 1}. ${err}`);
    });
  } else {
    console.log('[RuntimeTest] ✅ ALL TESTS PASSED');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

