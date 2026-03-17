import { getSupabaseClient } from './supabase.js';

export async function login(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: { message: 'Supabase nicht konfiguriert.' } };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function isAdmin() {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}
