import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type BackendConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'request_in_progress' 
  | 'request_failed' 
  | 'uncertain';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

const STORAGE_KEY_URL = 'cuemaster_supabase_url';
const STORAGE_KEY_KEY = 'cuemaster_supabase_key';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const url = storedUrl || envUrl;
  const anonKey = storedKey || envKey;

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-id') &&
    url.startsWith('https://')
  );

  return { url, anonKey, isConfigured };
}

export function saveCustomSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigHash = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  const hash = `${config.url}_${config.anonKey}`;
  if (!supabaseInstance || currentConfigHash !== hash) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentConfigHash = hash;
  }

  return supabaseInstance;
}

/**
 * Actively checks connectivity to Supabase or network endpoint.
 * Returns true if real backend is reachable.
 */
export async function checkBackendReachable(): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    // When no Supabase cloud credentials are provided yet, we probe local backend availability
    return navigator.onLine;
  }

  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const { error } = await client.from('settings').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timeoutId);

    if (error && error.code !== 'PGRST116') {
      // Any database response (even empty) confirms reachable backend
      if (error.message && (error.message.includes('FetchError') || error.message.includes('Failed to fetch'))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
