'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { safeAuthDestination } from '@/lib/auth-flow';

export function AdminMfa({ factorId, destination = '/admin' }: { factorId: string | null; destination?: string }) {
  const [factor, setFactor] = useState(factorId);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function enroll() {
    setBusy(true); setError('');
    try {
      const auth = getSupabase().auth;
      const { data: factors, error: listError } = await auth.mfa.listFactors();
      if (listError) throw listError;
      // A reload can leave an unverified enrollment; discard only those stale drafts.
      for (const draft of factors.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified')) {
        const { error } = await auth.mfa.unenroll({ factorId: draft.id });
        if (error) throw error;
      }
      const { data, error } = await auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Kahiye admin' });
      if (error) throw error;
      setFactor(data.id); setSetup({ qr: data.totp.qr_code, secret: data.totp.secret });
    } catch { setError('We could not set up your authenticator. Please try again.'); }
    finally { setBusy(false); }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault(); if (!factor) return;
    setBusy(true); setError('');
    try {
      const { error } = await getSupabase().auth.mfa.challengeAndVerify({ factorId: factor, code });
      if (error) { setError('That code did not work. Try the latest code from your authenticator.'); return; }
      setSetup(null); setCode('');
      window.location.assign(safeAuthDestination(destination, '/admin'));
    } catch { setError('Verification is unavailable. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-3xl bg-surface p-6 shadow-paper space-y-5">
    {setup && <div className="space-y-4">
      <p>Scan this code with your authenticator app, then enter its six-digit code below.</p>
      {/* Supabase provides a data URI; it stays in this component and is never logged. */}
      <img src={setup.qr} width={200} height={200} alt="Authenticator setup QR code" />
      <details><summary className="cursor-pointer text-clay">Enter a setup key instead</summary><code className="block mt-3 break-all select-all">{setup.secret}</code></details>
    </div>}
    {!factor ? <Button disabled={busy} onClick={enroll}>{busy ? 'Setting up…' : 'Set up authenticator'}</Button> :
      <form onSubmit={verify} className="space-y-4">
        <label className="block">Authenticator code
          <input className="block mt-2 w-full rounded-xl border border-slate-300 p-3 text-lg tracking-widest" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
        </label>
        <Button disabled={busy || code.length !== 6} type="submit">{busy ? 'Verifying…' : 'Verify and continue'}</Button>
      </form>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <p className="text-sm text-slate-500">Lost access to your authenticator? Contact the account owner for identity verification and recovery.</p>
  </section>;
}
