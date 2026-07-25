import { createClient } from '@supabase/supabase-js';

/**
 * Returns a server-only Supabase client initialized with the SERVICE_ROLE_KEY.
 * This client bypasses RLS and should NEVER be exposed to the browser.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase Service Role configuration. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local.'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
