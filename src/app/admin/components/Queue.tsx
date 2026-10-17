'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CONSULTATION_STATUSES, STATUS_LABELS, type Overview, type RequestSummary } from '@/lib/admin-operations';
import { Heading, LoadState, Status, formatTime, useRemote } from './shared';

export function DashboardOverview({ manager }: { manager: boolean }) {
  const remote = useRemote<Overview>('/api/admin/overview');
  return <>
    <Heading eyebrow="Care, carried through" title={manager ? 'A clear next step for every family.' : 'Your consultations'} description={manager ? 'Keep requests moving, match the right expert, and close the loop with parents.' : 'Only requests assigned to your linked expert profile appear here.'} />
    <LoadState {...remote} />
    {remote.data && <>
      <section aria-label="Consultation overview" className="border-y border-border divide-y sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-3 mb-10">
        {(['new', 'contacted', 'scheduled'] as const).map(status => <Link href={`/admin/consultations?status=${status}`} key={status} className="block py-6 sm:px-6 first:pl-0 hover:text-clay"><span className="block text-sm mb-2">{STATUS_LABELS[status]}</span><strong className="font-heading font-normal text-4xl">{remote.data!.counts[status]}</strong><span className="block text-xs text-muted-foreground mt-3">Open requests →</span></Link>)}
      </section>
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 mb-10"><section><h2 className="font-heading text-2xl mb-5">Needs a little attention</h2>
        <p className="mb-3">{remote.data.counts.needs_follow_up} {remote.data.counts.needs_follow_up === 1 ? 'request needs' : 'requests need'} follow-up.</p><p className="text-sm text-muted-foreground mb-5">New requests waiting over 24 hours, or scheduled sessions whose time has passed.</p><p className="text-sm mb-3">{remote.data.counts.safety} open requests came through a safety prompt. Review these promptly; this queue is not an emergency service.</p><Link className="text-clay underline underline-offset-4 text-sm" href="/admin/consultations">Review the queue →</Link>
      </section><section className="bg-paper-deep rounded-2xl p-6"><h2 className="font-heading text-2xl mb-4">{manager ? 'The people behind the care' : 'Keep the loop closed'}</h2>{manager ? <><p className="mb-5">{remote.data.ready_experts} active experts with credentials reviewed.</p><Link href="/admin/experts" className="text-clay underline underline-offset-4 text-sm">Manage experts →</Link></> : <p className="text-sm">Record completion after a session. Use notes for coordination, and keep clinical records in your approved clinical system.</p>}</section></div>
      <p className="text-sm text-muted-foreground border-t pt-5">All time: {remote.data.counts.completed} completed · {remote.data.counts.cancelled} cancelled. <button className="underline ml-2" onClick={remote.reload}>Refresh overview</button></p>
    </>}
  </>;
}

export function ConsultationQueue() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const remote = useRemote<{ requests: RequestSummary[]; total: number }>(`/api/admin/consultations?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}&page=${page}`);
  return <>
    <Heading eyebrow="From first call to follow-through" title="Consultations" description="New requests appear first, with safety-related requests first within that group. Open a request to match an expert and arrange a session." />
    <form className="grid sm:grid-cols-[1fr_200px_auto] gap-4 items-end mb-7" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
      <label>Find a request<input type="search" maxLength={100} placeholder="Parent email, phone or request ID" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All requests</option>{CONSULTATION_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label><Button type="submit" variant="outline" className="h-12">Search</Button>
    </form><LoadState {...remote} />
    {remote.data && <>
      <div className="flex justify-between text-sm mb-3"><p>{remote.data.total} {remote.data.total === 1 ? 'request' : 'requests'}</p><button onClick={remote.reload} className="underline">Refresh</button></div>
      <ul className="divide-y border-y border-border">{remote.data.requests.map(request => <li key={request.id}><Link href={`/admin/consultations/${request.id}`} className="block py-5 hover:bg-paper-deep/50 px-2 rounded-lg"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold break-all mb-2">{request.parent_email}</p><p className="text-sm text-muted-foreground">{request.preferred_language} · Requested {formatTime(request.created_at)}</p></div><Status value={request.status} /></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span>{request.expert_name || 'Expert not assigned'}</span>{request.scheduled_at && <span>{formatTime(request.scheduled_at)}</span>}{request.source === 'safety' && <span className="text-clay-deep">Safety-related request</span>}<span className="ml-auto text-clay">Open request →</span></div></Link></li>)}</ul>
      {remote.data.requests.length === 0 && <div className="py-12 max-w-lg"><h2 className="font-heading text-2xl mb-3">{query || status ? 'No matching requests' : 'Ready for the first conversation'}</h2><p className="text-muted-foreground">{query || status ? 'Try another search or status.' : 'When a parent requests an expert conversation in Kahiye, it will appear here. Add your experts so the team is ready to make a match.'}</p></div>}
      <div className="flex justify-between items-center gap-4 mt-6"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm">Page {page} of {Math.max(1, Math.ceil(remote.data.total / 25))}</span><Button variant="outline" disabled={page * 25 >= remote.data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
  </>;
}
