import { CONFIG } from './config.js';

export function getSupabaseClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey || !window.supabase) return null;
  return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}
