import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAccess } from '@/lib/access';
import { ADMIN_ROLES, isSameOrigin } from '@/lib/access-policy';

export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner'] });
  if (access.response) return access.response;
  const { data, error } = await access.supabase.rpc('admin_staff');
  if (error) return NextResponse.json({ error: 'Could not load team access.' }, { status: 503 });
  return NextResponse.json({ members: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

const membership = z.object({ email: z.email().max(320), role: z.enum(ADMIN_ROLES), active: z.boolean() });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const access = await requireAdminAccess({ roles: ['owner'] });
  if (access.response) return access.response;
  const parsed = membership.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and role.' }, { status: 400 });
  const { error } = await access.supabase.rpc('set_admin_membership', {
    target_email: parsed.data.email, desired_role: parsed.data.role, enabled: parsed.data.active,
  });
  if (error) {
    const expected = ['Person must sign in and verify their email first', 'Keep at least one active owner'];
    return NextResponse.json({ error: expected.includes(error.message) ? error.message : 'Team access could not be updated.' }, { status: error.code === '42501' ? 403 : 409 });
  }
  return NextResponse.json({ ok: true });
}
