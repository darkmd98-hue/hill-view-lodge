import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Returns the Supabase client singleton.
 * Lazily initialized so the build doesn't crash when env vars aren't set
 * (they're only needed at runtime in the browser).
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Copy .env.local.example to .env.local and fill in your Supabase URL and anon key. ' +
        'Find them at: Supabase Dashboard → Settings → API'
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}
