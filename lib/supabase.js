import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase URL and Anon Key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase Client Instance
 * Configured with AsyncStorage for session persistence
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable Supabase Auth since we're using custom authentication
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Use AsyncStorage for any client-side storage needs
  global: {
    headers: {
      'X-Client-Info': 'stock-app-mobile',
    },
  },
});

// Export URL for potential direct API calls
export const SUPABASE_URL = supabase.supabaseUrl;
export const SUPABASE_KEY = supabase.supabaseKey;

export default supabase;
