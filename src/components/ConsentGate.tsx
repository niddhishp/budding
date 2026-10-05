import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';

// DPDP Act 2023: explicit, recorded consent before processing information about a child.
export function ConsentGate() {
  const giveConsent = useAppStore((s) => s.giveConsent);
  const signOut = useAppStore((s) => s.signOut);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agree = async () => {
    setSaving(true);
    setError(null);
    try {
      await giveConsent();
    } catch {
      setError('We could not save your consent. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-canvas/90 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-200/50 p-6 sm:p-10">
        <div className="w-12 h-12 rounded-full bg-clay/10 flex items-center justify-center mb-6">
          <Shield className="w-6 h-6 text-clay" />
        </div>
        <h2 id="consent-title" className="font-heading text-3xl text-slate-850 mb-3">Your family's data, your call.</h2>
        <ul className="text-slate-600 leading-relaxed space-y-2 mb-6 text-[15px]">
          <li>• You share details about your child so Kahiye can tailor its guidance.</li>
          <li>• It is stored securely, used only to help you, and never sold or used for ads.</li>
          <li>• Your messages are processed by our AI provider to generate guidance.</li>
          <li>• You can delete everything, anytime, from your account menu.</li>
        </ul>
        <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-clay"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            I am the parent or legal guardian, and I agree to the{' '}
            <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link> and{' '}
            <Link href="/terms" target="_blank" className="underline">Terms</Link>.
          </span>
        </label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <Button onClick={agree} disabled={!checked || saving} className="mt-6 w-full h-12 rounded-full bg-slate-850 hover:bg-slate-800 text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agree and continue'}
        </Button>
        <button onClick={() => signOut()} className="mt-4 w-full text-sm text-slate-500 hover:text-slate-800">
          Not now, sign out
        </button>
      </div>
    </div>
  );
}
