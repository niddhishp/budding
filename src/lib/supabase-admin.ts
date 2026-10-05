import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — use only for writes no parent may perform
 * themselves (subscription state, account deletion), and only after verifying the caller.
 */
export function getAdminSupabase(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. See .env.example.');
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
