import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from './supabase-server';
import { hasCurrentConsent, parseAdminSession, type AdminRole } from './access-policy';

export async function checkUserConsent(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('consents').select('policy_version').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Consent verification unavailable');
  return hasCurrentConsent(data?.policy_version);
}

export async function requireParentAccess() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  try {
    if (!await checkUserConsent(supabase, user.id)) {
      return { response: NextResponse.json({ error: 'Please review and accept the current privacy notice in the app.', code: 'CONSENT_REQUIRED' }, { status: 403 }) };
    }
  } catch {
    return { response: NextResponse.json({ error: 'We could not check your privacy choices. Please try again.' }, { status: 503 }) };
  }
  return { supabase, user };
}

export async function requireAdminAccess(options: { allowEnrollment?: boolean; roles?: readonly AdminRole[] } = {}) {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) };
  const { data, error: sessionError } = await supabase.rpc('admin_session');
  if (sessionError) return { response: NextResponse.json({ error: 'Admin access verification is unavailable.' }, { status: 503 }) };
  // The database validates the JWT session against auth.sessions and current membership.
  const session = parseAdminSession(data);
  if (!session) return { response: NextResponse.json({ error: 'Admin access is not available for this account.' }, { status: 403 }) };
  if (!options.allowEnrollment && session.aal !== 'aal2') {
    return { response: NextResponse.json({ error: 'Verify your authenticator code first.', code: 'MFA_REQUIRED' }, { status: 403 }) };
  }
  if (options.roles && !options.roles.includes(session.role)) {
    return { response: NextResponse.json({ error: 'Your role does not allow this action.' }, { status: 403 }) };
  }
  return { supabase, user, session };
}
