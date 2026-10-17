import type { SupabaseClient } from '@supabase/supabase-js';

export type PasswordAuthMode = 'signin' | 'signup' | 'reset';
/** Only app destinations are accepted; browser URL parsing normalizes dot segments. */
export function safeAuthDestination(value: unknown, fallback = '/app') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(c => c.charCodeAt(0) <= 32)) return fallback;
  try {
    const url = new URL(value, 'https://kahiye.invalid');
    if (url.origin !== 'https://kahiye.invalid') return fallback;
    if (!/^\/(app|admin)(\/[a-zA-Z0-9_-]+)*$/.test(url.pathname) && url.pathname !== '/auth/password') return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function newPasswordError(password: string, confirmation: string) {
  if (password.length < 12) return 'Use at least 12 characters. A few memorable words work well.';
  if (new TextEncoder().encode(password).length > 72) return 'That password is too long. Try a shorter passphrase.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}
export function authErrorMessage(error: { code?: string; status?: number }, mode: PasswordAuthMode | 'update') {
  if (error.status === 429 || error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') return 'Too many attempts. Please wait a few minutes and try again.';
  if (error.code === 'weak_password') return 'Choose a stronger password with at least 12 characters.';
  if (error.code === 'email_not_confirmed') return 'Confirm your email using the account verification email, then sign in.';
  if (error.code === 'same_password') return 'Choose a different password from your current one.';
  if (error.code === 'insufficient_aal') return 'Verify your authenticator, then try again.';
  if (error.code === 'reauthentication_needed') return 'For security, sign in again or request a fresh password reset, then retry.';
  if (error.code === 'invalid_credentials') return 'Email or password not recognised. Try again, or use “Forgot or set password”.';
  if (mode === 'signin') return 'Sign-in is unavailable right now. Please try again.';
  if (mode === 'reset') return 'We could not request a reset. Please try again shortly.';
  return 'We could not save your password. Please try again.';
}

// The SDK sends passwords directly to Supabase Auth. Application APIs never store or log them.
export async function submitPasswordAuth(auth: Pick<SupabaseClient['auth'], 'signInWithPassword' | 'signUp' | 'resetPasswordForEmail'>, input: {
  mode: PasswordAuthMode; email: string; password: string; origin: string; next: string;
}): Promise<{ destination?: string; notice?: 'confirmation' | 'reset' }> {
  const next = safeAuthDestination(input.next);
  const email = input.email.trim();
  if (input.mode === 'signin') {
    const { data, error } = await auth.signInWithPassword({ email, password: input.password });
    if (error) throw new Error(authErrorMessage(error, 'signin'));
    if (!data.session) throw new Error('Sign-in did not finish. Please try again.');
    return { destination: next };
  }
  if (input.mode === 'reset') {
    const target = `/auth/password?next=${encodeURIComponent(next)}`;
    const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${input.origin}/auth/callback?next=${encodeURIComponent(target)}` });
    if (error) throw new Error(authErrorMessage(error, 'reset'));
    return { notice: 'reset' };
  }
  const { data, error } = await auth.signUp({ email, password: input.password,
    options: { emailRedirectTo: `${input.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) throw new Error(authErrorMessage(error, 'signup'));
  return data.session ? { destination: next } : { notice: 'confirmation' };
}
