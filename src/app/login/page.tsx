'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sprout, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase';

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    params?.get('error') ? 'error' : 'idle',
  );
  const [message, setMessage] = useState(params?.get('error') ? 'That sign-in link has expired. Request a new one.' : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const next = params?.get('next') ?? '/app';
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-8 sm:p-10">
      <div className="w-12 h-12 rounded-2xl bg-sage flex items-center justify-center mb-8">
        <Sprout className="w-6 h-6 text-white" />
      </div>

      {status === 'sent' ? (
        <>
          <h1 className="font-heading text-3xl text-slate-850 mb-3">Check your inbox.</h1>
          <p className="text-slate-500 leading-relaxed">
            We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>. Open it on this device to continue.
          </p>
          <button onClick={() => setStatus('idle')} className="mt-8 text-sm font-medium text-sage hover:underline">
            Use a different email
          </button>
        </>
      ) : (
        <>
          <h1 className="font-heading text-3xl text-slate-850 mb-3">Sign in to Budding</h1>
          <p className="text-slate-500 leading-relaxed mb-8">No password. We'll email you a one-tap sign-in link.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-850 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                />
              </div>
            </label>
            {status === 'error' && <p className="text-sm text-red-600">{message}</p>}
            <Button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="w-full h-12 rounded-xl bg-slate-850 hover:bg-slate-800 text-white font-medium"
            >
              {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Email me a sign-in link'}
            </Button>
          </form>
          <p className="mt-6 text-xs text-slate-400 leading-relaxed">
            Budding offers general guidance, not medical or psychological diagnosis. In an emergency in India, call 112.
          </p>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Budding.live
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
