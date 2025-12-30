/**
 * @format
 */

// Setup global error handlers first
console.log('[index] Starting NomadWallet app...');

// Log any unhandled promise rejections
const originalPromiseRejection = global.Promise.prototype.catch;
global.Promise.prototype.catch = function(onRejected) {
  return originalPromiseRejection.call(this, function(error) {
    console.error('[index] Unhandled promise rejection:', error);
    if (onRejected) {
      return onRejected(error);
    }
    throw error;
  });
};

// Import polyfills FIRST - TextEncoder/TextDecoder for various libraries
console.log('[index] Importing text-encoding polyfill...');
import 'text-encoding-polyfill';

console.log('[index] Importing react-native-get-random-values...');
import 'react-native-get-random-values';

console.log('[index] Importing React Native...');
import {AppRegistry} from 'react-native';

console.log('[index] Importing App component...');
import App from './App';

console.log('[index] Importing app.json...');
import {name as appName} from './app.json';

console.log(`[index] Registering component: ${appName}`);
AppRegistry.registerComponent(appName, () => App);

console.log('[index] Component registered successfully');

