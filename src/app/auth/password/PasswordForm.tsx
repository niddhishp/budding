'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/PasswordInput';
import { getSupabase } from '@/lib/supabase';
import { authErrorMessage, newPasswordError, safeAuthDestination } from '@/lib/auth-flow';

export function PasswordForm({ email, destination }: { email: string; destination: string }) {
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); const validation = newPasswordError(password, confirmation); setError(validation);
    if (validation) return;
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) { setError(authErrorMessage(updateError, 'update')); return; }
      setPassword(''); setConfirmation(''); setSaved(true);
    } catch { setError('Could not connect. Please try again.'); } finally { setBusy(false); }
  }
  if (saved) return <div role="status"><p className="mb-6">Password saved. Next time, sign in with your email and password.</p><Link className="inline-block rounded-full bg-clay text-primary-foreground px-6 py-3" href={safeAuthDestination(destination)}>Continue to Kahiye</Link></div>;
  return <><p className="text-muted-foreground mb-6 break-words">Use this password with {email} to sign in. Choose at least 12 characters; a few memorable words work well.</p><form onSubmit={save} className="space-y-5">
    <input autoComplete="username" name="username" type="email" value={email} readOnly tabIndex={-1} className="sr-only" aria-label="Account email" />
    <PasswordInput label="New password" value={password} onChange={setPassword} isNew disabled={busy} />
    <PasswordInput label="Confirm password" value={confirmation} onChange={setConfirmation} isNew disabled={busy} />
    {error && <div role="alert"><p className="text-sm text-destructive">{error}</p><Link className="text-sm text-clay underline" href={`/login?mode=reset&next=${encodeURIComponent(safeAuthDestination(destination))}`}>Request a fresh reset</Link></div>}
    <Button type="submit" disabled={busy} className="h-12 rounded-full">{busy ? 'Saving…' : 'Save password'}</Button>
  </form></>;
}
