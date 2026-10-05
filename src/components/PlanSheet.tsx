import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { FREE_FEATURES, PLUS_FEATURES, PRICES, type BillingInterval } from '@/lib/plans';

// Razorpay Checkout is loaded only when a parent decides to pay.
type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};
type RazorpayCheckout = new (options: Record<string, unknown>) => { open: () => void };

function loadCheckout(): Promise<RazorpayCheckout> {
  const existing = (window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve((window as unknown as { Razorpay: RazorpayCheckout }).Razorpay);
    script.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(script);
  });
}

export function PlanSheet() {
  const { paywall, closePaywall, entitlement, setEntitlement } = useAppStore();
  const [interval, setBillingInterval] = useState<BillingInterval>('yearly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!paywall.open) return null;
  const isPlus = entitlement?.plan === 'plus';

  const close = () => {
    setError(null);
    setSuccess(false);
    closePaywall();
  };

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);

      const Razorpay = await loadCheckout();
      new Razorpay({
        key: body.keyId,
        subscription_id: body.subscriptionId,
        name: 'Budding Plus',
        description: `${PRICES[interval].amount} per ${PRICES[interval].per}`,
        prefill: { email: body.email },
        theme: { color: '#3ECF8B' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment: RazorpayHandlerResponse) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment),
          });
          const result = await verify.json();
          setBusy(false);
          if (!verify.ok) {
            setError(result.error);
            return;
          }
          setEntitlement(result.entitlement);
          setSuccess(true);
        },
      }).open();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error && err.message ? err.message : 'Checkout could not start. Please try again.');
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel Budding Plus? You keep access until the end of the period you have paid for.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/billing/cancel', { method: 'POST' });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) setError(body.error);
    else setEntitlement(body.entitlement);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        className="relative w-full sm:max-w-lg max-h-[100dvh] overflow-y-auto bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 sm:p-8"
      >
        <button onClick={close} aria-label="Close" className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-clay/10 flex items-center justify-center mb-5">
              <Sparkles className="w-8 h-8 text-clay" />
            </div>
            <h2 id="plan-title" className="font-heading text-3xl text-slate-850 mb-2">Welcome to Plus.</h2>
            <p className="text-slate-500 mb-8">Unlimited decodes and family sharing are on.</p>
            <Button onClick={close} className="rounded-full bg-slate-850 text-white px-8 h-12">Continue</Button>
          </div>
        ) : isPlus ? (
          <>
            <h2 id="plan-title" className="font-heading text-3xl text-slate-850 mb-2">Budding Plus</h2>
            <p className="text-slate-500 mb-6">
              {entitlement?.cancelAtPeriodEnd
                ? `Cancelled. Access continues until ${formatDate(entitlement.renewsAt)}.`
                : entitlement?.renewsAt ? `Renews on ${formatDate(entitlement.renewsAt)}.` : 'Active.'}
            </p>
            <FeatureList items={PLUS_FEATURES} />
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {!entitlement?.cancelAtPeriodEnd && (
              <button onClick={cancel} disabled={busy} className="mt-8 text-sm text-slate-500 hover:text-red-600 underline underline-offset-4">
                {busy ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-clay uppercase tracking-wider mb-2">Budding Plus</p>
            <h2 id="plan-title" className="font-heading text-3xl text-slate-850 mb-2 pr-8">
              {paywall.reason ?? 'The right words, every time you need them.'}
            </h2>
            <p className="text-slate-500 mb-6">Less than a cup of chai a week.</p>

            <div className="grid grid-cols-2 gap-2 mb-6" role="radiogroup" aria-label="Billing period">
              {(['monthly', 'yearly'] as const).map((value) => {
                const selected = interval === value;
                return (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBillingInterval(value)}
                    className={`relative text-left p-4 rounded-2xl border-2 transition-colors ${selected ? 'border-clay bg-clay/5' : 'border-slate-200'}`}
                  >
                    {value === 'yearly' && (
                      <span className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase tracking-wider bg-clay text-white px-2 py-0.5 rounded-full">Best value</span>
                    )}
                    <span className="block text-sm text-slate-500 capitalize">{value}</span>
                    <span className="block font-heading text-2xl text-slate-850">{PRICES[value].amount}</span>
                    <span className="block text-xs text-slate-500">{PRICES[value].note ?? `per ${PRICES[value].per}`}</span>
                  </button>
                );
              })}
            </div>

            <FeatureList items={PLUS_FEATURES} />

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <Button onClick={upgrade} disabled={busy} className="mt-6 w-full h-14 rounded-full bg-slate-850 hover:bg-slate-800 text-white text-lg">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : `Get Plus · ${PRICES[interval].amount}`}
            </Button>
            <p className="mt-3 text-xs text-center text-slate-400">UPI, cards and netbanking via Razorpay. Cancel anytime.</p>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Free plan</p>
              <FeatureList items={FREE_FEATURES} muted />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function FeatureList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className={`flex gap-3 text-sm leading-relaxed ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${muted ? 'text-slate-300' : 'text-clay'}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}
