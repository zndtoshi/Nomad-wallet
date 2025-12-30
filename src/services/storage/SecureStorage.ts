/**
 * Secure Storage Service
 * Handles encrypted storage of sensitive data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../../utils/constants';

export class SecureStorage {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      // TODO: Add encryption layer
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      // TODO: Add decryption layer
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from storage:', error);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Wallet specific methods
  static async saveMnemonic(mnemonic: string): Promise<void> {
    return this.setItem(STORAGE_KEYS.WALLET_MNEMONIC, mnemonic);
  }

  static async getMnemonic(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.WALLET_MNEMONIC);
  }

  static async saveNostrKeys(privateKey: string, publicKey: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.NOSTR_PRIVATE_KEY, privateKey);
    await this.setItem(STORAGE_KEYS.NOSTR_PUBLIC_KEY, publicKey);
  }

  static async getNostrKeys(): Promise<{privateKey: string; publicKey: string} | null> {
    const privateKey = await this.getItem(STORAGE_KEYS.NOSTR_PRIVATE_KEY);
    const publicKey = await this.getItem(STORAGE_KEYS.NOSTR_PUBLIC_KEY);
    
    if (!privateKey || !publicKey) {
      return null;
    }
    
    return {privateKey, publicKey};
  }
}

