'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase';
import { deleteAccount } from '@/lib/account-client';

export function PrivacyChoices({ accepted }: { accepted: boolean }) {
  const [active, setActive] = useState(accepted);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function withdraw() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/consent', { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setActive(false); setMessage('Consent withdrawn. New guidance and profile updates are paused.');
    } catch { setMessage('We could not save your choice. Please try again.'); }
    finally { setBusy(false); }
  }
  async function cancelRenewal() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const body = await response.json();
      setMessage(response.ok ? 'Renewal cancelled. Your paid period will finish on its scheduled date.' : body.error || 'Could not cancel. Please try again.');
    } catch { setMessage('We could not reach Kahiye. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="bg-surface rounded-3xl p-6 shadow-paper space-y-5">
    <p>{active ? 'You have agreed to the current privacy notice.' : 'You have not agreed to the current privacy notice.'}</p>
    <p className="text-slate-600">Withdrawing consent pauses new AI guidance, notes and profile updates across the app and WhatsApp. Work already in progress may finish. Your existing records remain in your account until you delete them.</p>
    <p className="text-slate-600">You can agree again when you return to the app. Withdrawing consent does not cancel a paid subscription. Deleting your account cancels it and removes your family records.</p>
    {active && <Button disabled={busy} variant="outline" onClick={withdraw}>{busy ? 'Saving…' : 'Withdraw consent'}</Button>}
    <p role="status">{message}</p>
    <Button disabled={busy} variant="outline" onClick={cancelRenewal}>Cancel paid renewal</Button>
    <Button disabled={busy} variant="outline" onClick={deleteAccount}>Delete account and data</Button>
    <Button variant="outline" onClick={async () => { await getSupabase().auth.signOut(); window.location.assign('/'); }}>Sign out</Button>
  </section>;
}
