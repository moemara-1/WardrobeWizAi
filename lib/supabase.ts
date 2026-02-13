import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// SecureStore has a 2048-byte limit per key. Supabase session tokens
// often exceed this, so we split large values across multiple keys.
const CHUNK_SIZE = 1800; // leave headroom below the 2048 limit

const ChunkedSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    // Check if we stored a chunk count for this key
    const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) return null; // corrupted — treat as missing
        parts.push(chunk);
      }
      return parts.join('');
    }
    // Fallback: read the value directly (small values / legacy)
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    // Clean up any previous chunks first
    await ChunkedSecureStoreAdapter.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      // Small enough — store directly
      await SecureStore.setItemAsync(key, value);
    } else {
      // Split into chunks
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      // Write all chunks
      await Promise.all(
        chunks.map((chunk, i) =>
          SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk),
        ),
      );
      // Write the count last so getItem knows to reassemble
      await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length));
    }
  },

  async removeItem(key: string): Promise<void> {
    // Remove a possible chunk count
    const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_chunk_${i}`),
        ),
      );
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    // Also remove the plain key (handles legacy / small values)
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? ChunkedSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
