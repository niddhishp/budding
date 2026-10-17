import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminAccess } from '@/lib/access';
import { AdminMfa } from './AdminMfa';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verify admin access · Kahiye', robots: { index: false, follow: false } };

export default async function VerifyAdminPage() {
  const access = await requireAdminAccess({ allowEnrollment: true });
  if (access.response) {
    if (access.response.status === 401) redirect('/login?next=/admin');
    return <main className="max-w-lg mx-auto px-6 py-20"><h1 className="font-heading text-3xl mb-4">Admin access unavailable</h1><p>An active team membership is required. If you already have one, try again shortly.</p><Link className="inline-block mt-6 text-clay underline" href="/app">Back to Kahiye</Link></main>;
  }
  if (access.session.aal === 'aal2') redirect('/admin');
  const { data, error } = await access.supabase.auth.mfa.listFactors();
  if (error) return <main className="max-w-lg mx-auto px-6 py-20">We could not load your security settings. Please try again.</main>;
  return <main className="max-w-lg mx-auto px-6 py-16">
    <Link href="/app" className="text-clay underline">Back to Kahiye</Link>
    <h1 className="font-heading text-3xl mt-8 mb-4">One more step to your team space</h1>
    <p className="text-slate-600 mb-8">Use an authenticator app to protect team access. Your email sign-in still comes first.</p>
    <AdminMfa factorId={data.totp.find(f => f.status === 'verified')?.id ?? null} />
  </main>;
}
