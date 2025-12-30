/**
 * NomadWallet - Bitcoin Wallet with Nostr Integration
 * Main Application Entry Point
 */

import React, {useState, useEffect} from 'react';
import {StatusBar, ActivityIndicator, View, StyleSheet, Text, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getBdkWallet} from './src/services/wallet/BdkWalletService';
import {NostrService} from './src/services/nostr/NostrService';

// Screens - Setup Flow
import SetupScreen from './src/screens/Setup/SetupScreen';
import RestoreScreen from './src/screens/Setup/RestoreScreen';
import PairScreen from './src/screens/Setup/PairScreen';

// Screens - Main App
import HomeScreen from './src/screens/Home/HomeScreen';
import SendScreen from './src/screens/Send/SendScreen';
import ReceiveScreen from './src/screens/Receive/ReceiveScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';

import {COLORS} from './src/utils/constants';
import {runRuntimeTests} from './src/tests/RuntimeTest';

// Navigation Types
export type RootStackParamList = {
  Setup: undefined;
  Restore: undefined;
  Pair: undefined;
  Home: undefined;
  Send: undefined;
  Receive: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Storage keys
const STORAGE_KEY_PAIRED = '@nomadwallet:paired';

// Debug version - increment this each time code changes
const DEBUG_VERSION = 'v.010';

function AppContent(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Setup');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize app and determine initial route
   */
  const initializeApp = async () => {
    console.log('[App] Starting initialization...');
    
    // Run runtime tests in development
    if (__DEV__) {
      console.log('[App] Running runtime tests (DEV mode)...');
      try {
        const testResult = await runRuntimeTests();
        if (!testResult.success) {
          console.error('[App] ⚠️ Runtime tests failed, but continuing anyway');
        }
      } catch (error) {
        console.error('[App] Runtime test error:', error);
      }
    }
    
    try {
      console.log('[App] Step 1: Initializing Nostr service...');
      // Initialize Nostr service
      const nostrService = NostrService.getInstance();
      await nostrService.initialize();
      console.log('[App] Nostr service initialized successfully');

      console.log('[App] Step 2: Checking wallet existence...');
      // Check if wallet exists
      const wallet = getBdkWallet();
      const walletExists = await wallet.walletExists();
      console.log(`[App] Wallet exists: ${walletExists}`);

      if (!walletExists) {
        // No wallet - show setup
        console.log('[App] No wallet found, showing setup screen');
        setInitialRoute('Setup');
        setIsLoading(false);
        return;
      }

      console.log('[App] Step 3: Loading wallet...');
      // Load existing wallet
      await wallet.loadWallet();
      console.log('[App] Wallet loaded successfully');

      console.log('[App] Step 4: Checking pairing status...');
      // Check if paired with server
      const paired = await AsyncStorage.getItem(STORAGE_KEY_PAIRED);
      console.log(`[App] Paired status: ${paired}`);

      if (!paired || paired === 'false') {
        // Wallet exists but not paired - show pair screen
        console.log('[App] Not paired, showing pair screen');
        setInitialRoute('Pair');
      } else {
        // Wallet exists and paired (or skipped) - show home
        console.log('[App] Paired, showing home screen');
        setInitialRoute('Home');
      }

      console.log('[App] Initialization complete');
      setIsLoading(false);
    } catch (error) {
      console.error('[App] ❌ Initialization error:', error);
      console.error('[App] Error details:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('[App] Error stack:', error.stack);
      }
      // On error, show setup
      setInitialRoute('Setup');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: COLORS.PRIMARY,
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}>
          {/* Setup Flow */}
          <Stack.Screen
            name="Setup"
            component={SetupScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Restore"
            component={RestoreScreen}
            options={{
              title: 'Restore Wallet',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Pair"
            component={PairScreen}
            options={{
              title: 'Connect to Node',
              headerBackTitle: 'Back',
              headerLeft: () => null, // Prevent going back after wallet creation
            }}
          />

          {/* Main App */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerShown: false,
              gestureEnabled: false, // Prevent swiping back
            }}
          />
          <Stack.Screen
            name="Send"
            component={SendScreen}
            options={{
              title: 'Send Bitcoin',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Receive"
            component={ReceiveScreen}
            options={{
              title: 'Receive Bitcoin',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      {/* Debug Version Indicator */}
      <View style={[styles.versionIndicator, {top: insets.top + 8}]} pointerEvents="none">
        <Text style={styles.versionText}>{DEBUG_VERSION}</Text>
      </View>
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  versionIndicator: {
    position: 'absolute',
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 99999,
    elevation: 20, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  versionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
});

export default App;
