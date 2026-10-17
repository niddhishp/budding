import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminAccess } from '@/lib/access';
import { canManageStaff } from '@/lib/access-policy';
import { AdminTeam } from './AdminTeam';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team access · Kahiye', robots: { index: false, follow: false } };

export default async function AdminPage() {
  const access = await requireAdminAccess({ allowEnrollment: true });
  if (access.response) {
    if (access.response.status === 401) redirect('/login?next=/admin');
    return <main className="max-w-lg mx-auto px-6 py-20"><h1 className="font-heading text-3xl mb-4">Admin access unavailable</h1><p>This account needs an active team membership. Contact the owner if you need access.</p><Link href="/app" className="inline-block mt-6 text-clay underline">Back to Kahiye</Link></main>;
  }
  if (access.session.aal !== 'aal2') redirect('/admin/verify');
  return <main className="max-w-4xl mx-auto px-6 py-12">
    <Link href="/app" className="text-clay underline">Back to Kahiye</Link>
    <p className="mt-8 text-sm text-slate-500">Kahiye team · {access.session.role.replace('_',' ')}</p>
    <h1 className="font-heading text-4xl mt-2 mb-4">A trusted team, with clear access.</h1>
    <p className="text-slate-600 mb-8">Team access is protected with an authenticator. Each role will receive only the tools it needs.</p>
    {canManageStaff(access.session) ? <AdminTeam /> :
      <section className="rounded-3xl bg-surface p-6 shadow-paper"><h2 className="font-heading text-2xl mb-3">Your access is ready</h2><p>Expert scheduling, assigned consultations and content review will be added in their planned phases. This role does not yet provide access to family records.</p></section>}
  </main>;
}
