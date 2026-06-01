/**
 * Server-side Supabase client with elevated privileges.
 * Uses the service role key if available, otherwise falls back to the anon key.
 *
 * WARNING: bypasses Row Level Security. Use only in trusted server-side code
 * (API routes, server actions). Never expose this to the browser.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  // Prefer the service role key (full admin). Fall back to anon if not configured.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  }

  if (!serviceKey) {
    console.warn(
      '[supabase/admin] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. ' +
        'Server-side admin operations will be subject to RLS.'
    );
  }

  _admin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _admin;
}
