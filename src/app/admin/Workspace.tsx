import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminAccess } from '@/lib/access';
import { AdminTeam } from './AdminTeam';
import { DashboardOverview, ConsultationQueue } from './components/Queue';
import { ExpertDirectory } from './components/Experts';
import { ConsultationDetail } from './components/ConsultationDetail';
import './admin.css';
import { LaunchReadiness } from './components/Launch';
import { ShopAdmin } from './components/ShopAdmin';

export type AdminSection = 'overview' | 'experts' | 'consultations' | 'team' | 'launch' | 'shop';
export async function Workspace({ section, requestId }: { section: AdminSection; requestId?: string }) {
  const access = await requireAdminAccess({ allowEnrollment: true });
  if (access.response) {
    if (access.response.status === 401) redirect(`/login?next=${encodeURIComponent(requestId ? `/admin/consultations/${requestId}` : section === 'overview' ? '/admin' : `/admin/${section}`)}`);
    return <main className="max-w-lg mx-auto px-6 py-20"><h1 className="font-heading text-3xl mb-4">Team access unavailable</h1><p>{access.response.status === 503 ? 'We could not verify access. Please try again shortly.' : 'This account needs an active team membership. Contact the owner if you need access.'}</p><Link href="/app" className="inline-block mt-6 text-clay underline">Back to Kahiye</Link></main>;
  }
  if (access.session.aal !== 'aal2') redirect('/admin/verify');
  const role = access.session.role;
  const manager = role === 'owner' || role === 'operations';
  const permitted = section === 'team' ? role === 'owner' : section === 'experts' || section === 'launch' || section === 'shop' ? manager : role !== 'content_reviewer';
  const links = [
    {id:'shop',href:'/admin/shop',label:'Curated shop',show:manager},
    {id:'launch',href:'/admin/launch',label:'Launch readiness',show:manager},
    { id: 'overview', href: '/admin', label: 'Overview', show: true },
    { id: 'consultations', href: '/admin/consultations', label: role === 'therapist' ? 'My consultations' : 'Consultations', show: role !== 'content_reviewer' },
    { id: 'experts', href: '/admin/experts', label: 'Experts', show: manager },
    { id: 'team', href: '/admin/team', label: 'Team access', show: role === 'owner' },
  ];
  return <div className="admin-workspace min-h-screen">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:p-4">Skip to content</a>
    <header className="border-b border-border"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex justify-between items-center gap-4"><Link href="/admin" className="font-heading text-2xl">Kahiye <span className="font-sans text-sm text-muted-foreground ml-2">team space</span></Link><Link href="/app" className="text-sm underline underline-offset-4">Parent app ↗</Link></div></header>
    <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[200px_minmax(0,1fr)] gap-10 px-5 sm:px-8">
      <aside className="lg:py-10 border-b lg:border-b-0 lg:border-r border-border lg:pr-6"><nav aria-label="Team workspace" className="flex overflow-x-auto lg:flex-col gap-1 py-4 lg:py-0">{links.filter(l => l.show).map(link => <Link key={link.id} href={link.href} aria-current={section === link.id ? 'page' : undefined} className={`whitespace-nowrap px-4 py-3 rounded-lg text-sm ${section === link.id ? 'bg-paper-deep text-foreground font-semibold' : 'text-muted-foreground hover:bg-paper-deep/60'}`}>{link.label}</Link>)}</nav><p className="hidden lg:block text-xs text-muted-foreground mt-10 leading-relaxed">Signed in as {role.replace('_', ' ')}.<br />Authenticator protected.</p><Link href="/auth/password?next=/admin" className="inline-block text-xs text-clay underline my-4 lg:mt-4">Set or change password</Link></aside>
      <main id="admin-main" className="min-w-0 py-8 sm:py-10 pb-20">{!permitted ? <><h1 className="font-heading text-3xl mb-4">Your team space</h1><p>This section is not available for your role. Content review tools will be added separately.</p></> : section === 'shop' ? <ShopAdmin /> : section === 'launch' ? <LaunchReadiness /> : section === 'team' ? <><h1 className="font-heading text-4xl mb-8">Team access</h1><AdminTeam /></> : section === 'experts' ? <ExpertDirectory /> : section === 'consultations' ? requestId ? <ConsultationDetail id={requestId} manager={manager} /> : <ConsultationQueue manager={manager} /> : <DashboardOverview manager={manager} />}</main>
    </div>
  </div>;
}
