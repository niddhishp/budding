'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SproutMark } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/PasswordInput';
import { getSupabase } from '@/lib/supabase';
import { newPasswordError, safeAuthDestination, submitPasswordAuth, type PasswordAuthMode } from '@/lib/auth-flow';

function LoginForm() {
  const params = useSearchParams();
  const next = safeAuthDestination(params.get('next'));
  const [mode, setMode] = useState<PasswordAuthMode>(params.get('mode') === 'reset' ? 'reset' : 'signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'confirmation' | 'reset' | null>(null);
  const [error, setError] = useState(params.get('error') ? 'That verification link could not be used. Sign in with your password, or request a fresh reset. Open reset links in the same browser where you requested them.' : '');
  function changeMode(value: PasswordAuthMode) { setMode(value); setError(''); setNotice(null); setPassword(''); setConfirmation(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (mode === 'signup') { const message = newPasswordError(password, confirmation); if (message) { setError(message); return; } }
    setBusy(true);
    try {
      const result = await submitPasswordAuth(getSupabase().auth, { mode, email, password, origin: window.location.origin, next });
      setPassword(''); setConfirmation('');
      if (result.destination) { window.location.assign(result.destination); return; }
      setNotice(result.notice ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="w-full max-w-md bg-surface rounded-[2rem] shadow-paper p-8 sm:p-10">
    <SproutMark className="w-12 h-12 mb-8" />
    {notice ? <>
      <h1 className="font-heading text-3xl mb-3">{notice === 'reset' ? 'Check your inbox once.' : 'Confirm your email once.'}</h1>
      <p className="text-muted-foreground leading-relaxed">{notice === 'reset' ? 'If this email belongs to an account, you’ll receive a link to set a password. Open it in this browser. After that, sign in with your email and password.' : 'Check your email for the account verification link and open it in this browser. Future sign-ins use your password. If you already have an account, sign in or reset your password instead.'}</p>
      <button className="mt-7 text-sm text-clay underline" onClick={() => changeMode('signin')}>Back to sign in</button>
    </> : <>
      <h1 className="font-heading text-3xl mb-3">{mode === 'signin' ? 'Sign in to Kahiye' : mode === 'signup' ? 'Make yourself at home.' : 'Set a password, or reset it.'}</h1>
      <p className="text-muted-foreground leading-relaxed mb-7">{mode === 'signin' ? 'Your email is your username. Enter your password to continue.' : mode === 'signup' ? 'Create your account with an email and password. We’ll verify your email once.' : 'We’ll email you a one-time reset link. You won’t need an email link for everyday sign-in.'}</p>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium">Email (username)<input name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={320} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="block mt-2 w-full h-12 px-4 rounded-xl border border-border bg-paper focus:outline-none focus:ring-2 focus:ring-clay/30" /></label>
        {mode !== 'reset' && <PasswordInput value={password} onChange={setPassword} isNew={mode === 'signup'} disabled={busy} />}
        {mode === 'signup' && <><p className="text-xs text-muted-foreground">Use at least 12 characters. A few memorable words work well.</p><PasswordInput label="Confirm password" value={confirmation} onChange={setConfirmation} isNew disabled={busy} /></>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full h-12 rounded-full">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send password reset'}</Button>
      </form>
      {mode === 'signin' ? <div className="mt-6 space-y-5 text-sm"><button disabled={busy} className="text-clay underline underline-offset-4" onClick={() => changeMode('reset')}>Forgot or set password</button><p className="text-muted-foreground">New to Kahiye? <button disabled={busy} className="text-clay underline underline-offset-4" onClick={() => changeMode('signup')}>Create an account</button></p></div> : <button disabled={busy} className="mt-6 text-sm text-clay underline" onClick={() => changeMode('signin')}>Back to sign in</button>}
      {mode === 'reset' && <p className="mt-5 text-sm text-muted-foreground">Already signed in? <Link className="text-clay underline" href={`/auth/password?next=${encodeURIComponent(next)}`}>Set your password here.</Link></p>}
      <p className="mt-7 text-xs text-muted-foreground">Team accounts also verify an authenticator code when accessing the admin workspace.</p>
    </>}
  </div>;
}

export default function LoginPage() {
  return <main className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center px-4 py-12"><Link href="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Kahiye</Link><Suspense fallback={<p role="status">Loading sign-in…</p>}><LoginForm /></Suspense></main>;
}
