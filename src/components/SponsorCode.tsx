'use client';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { formatSponsorCode, isValidSponsorCode, sponsorDate } from '@/lib/sponsor';

// Kahiye Plus paid for by a school, employer, clinic or community partner. Shows the running
// sponsorship, or a field to redeem a code. A sponsor's link (/app?sponsor=CODE) fills the field in;
// nothing is redeemed until the parent presses the button.
export function SponsorCode({ className = '' }: { className?: string }) {
  const { entitlement, setEntitlement, refreshEntitlement } = useAppStore();
  const [code, setCode] = useState(() => (typeof window === 'undefined' ? '' : formatSponsorCode(new URLSearchParams(window.location.search).get('sponsor') ?? '')));
  const [open, setOpen] = useState(() => code !== '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<{ name: string; until: string } | null>(null);
  const sponsor = entitlement?.sponsor ?? redeemed;

  if (sponsor) {
    return <div className={className} role="status">
      <p className="font-semibold text-slate-800">Kahiye Plus, sponsored by {sponsor.name} until {sponsorDate(sponsor.until)}</p>
      <p className="text-sm text-slate-500 mt-1">{sponsor.name} sees only total numbers, never your family’s details.</p>
    </div>;
  }

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidSponsorCode(code)) { setError('Codes are 10 letters and numbers, like ABCDE-23456.'); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/sponsor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error || 'We could not check this code. Please try again.'); return; }
      setRedeemed(body.sponsor);
      if (body.entitlement) setEntitlement(body.entitlement); else void refreshEntitlement();
      const url = new URL(window.location.href);
      if (url.searchParams.has('sponsor')) { url.searchParams.delete('sponsor'); window.history.replaceState(null, '', url); }
    } catch { setError('We could not reach Kahiye. Please try again.'); }
    finally { setBusy(false); }
  };

  if (!open) {
    return <button type="button" className={`text-sm text-clay underline underline-offset-4 ${className}`} onClick={() => setOpen(true)}>Have a code from your school, employer or clinic?</button>;
  }
  return <form className={className} onSubmit={redeem}>
    <label htmlFor="sponsor-code" className="block text-sm font-semibold text-slate-700">Have a code from your school, employer or clinic?</label>
    <p className="text-xs text-slate-500 mt-1">Some organisations pay for Kahiye Plus for their families. They see only total numbers, never your family’s details.</p>
    <div className="flex gap-2 mt-3">
      <input id="sponsor-code" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={14}
        placeholder="ABCDE-23456" aria-invalid={!!error} aria-describedby={error ? 'sponsor-code-error' : undefined}
        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 h-12 font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-clay" />
      <button type="submit" disabled={busy || !code.trim()} className="rounded-full bg-slate-850 text-white px-5 h-12 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Checking" /> : 'Use code'}
      </button>
    </div>
    {error && <p id="sponsor-code-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </form>;
}
