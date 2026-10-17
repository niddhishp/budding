import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-server';
import { safeAuthDestination } from '@/lib/auth-flow';
import { AdminMfa } from '@/app/admin/verify/AdminMfa';
import { PasswordForm } from './PasswordForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set password · Kahiye', robots: { index: false, follow: false } };
export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeAuthDestination((await searchParams).next);
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/login?mode=reset&next=${encodeURIComponent(next)}`);
  const [factors, assurance] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if (factors.error || assurance.error) return <main className="max-w-lg mx-auto px-6 py-16"><h1 className="font-heading text-3xl mb-4">Security settings unavailable</h1><p>Please reload this page before setting a password.</p></main>;
  const factor = factors.data.totp.find(f => f.status === 'verified');
  const needsMfa = assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2';
  return <main className="max-w-lg mx-auto px-6 py-16"><Link href={next} className="text-clay underline">Back to Kahiye</Link><h1 className="font-heading text-3xl mt-8 mb-4">{needsMfa ? 'Verify it’s you.' : 'Set your password.'}</h1>
    {needsMfa ? factor ? <><p className="text-muted-foreground mb-6">Verify your authenticator before changing your password.</p><AdminMfa factorId={factor.id} destination={`/auth/password?next=${encodeURIComponent(next)}`} /></> : <p role="alert">This account needs its enrolled second factor. Contact the account owner for help.</p> : <PasswordForm email={user.email ?? ''} destination={next} />}
  </main>;
}
