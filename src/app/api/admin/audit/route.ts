import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/access';

export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner'] });
  if (access.response) return access.response;
  const { data, error } = await access.supabase.from('admin_audit_events')
    .select('id, actor_id, target_id, action, details, occurred_at').order('occurred_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Could not load the access history.' }, { status: 503 });
  return NextResponse.json({ events: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
