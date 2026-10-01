import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const appConfig = require('../../app.json');
const supabaseUrl = appConfig?.expo?.extra?.supabaseUrl;
const supabaseAnonKey = appConfig?.expo?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] URL ou clé anon manquante dans app.json extra');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
