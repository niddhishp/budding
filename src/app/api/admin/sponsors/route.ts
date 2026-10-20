import { z } from 'zod';
import { requireAdminAccess } from '@/lib/access';
import { isSameOrigin } from '@/lib/access-policy';
import { adminJson as json } from '@/lib/admin-api';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { generateSponsorCode, ORGANISATION_KINDS, ORGANISATION_STATUSES } from '@/lib/sponsor';

// Sponsored access for the team: owner/operations at AAL2. Writes go through service-role functions
// that re-check the member and session in the database and write an audit event. Sponsors' reports
// are aggregate only and suppress any figure from fewer than five families (sponsor_report).
const MANAGERS = ['owner', 'operations'] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-01.');
const optional = (max: number) => z.string().trim().max(max).nullable().optional();
const organisationSchema = z.object({
  name: z.string().trim().min(2, 'Add the organisation name.').max(120),
  kind: z.enum(Object.keys(ORGANISATION_KINDS) as [keyof typeof ORGANISATION_KINDS, ...(keyof typeof ORGANISATION_KINDS)[]]),
  contact_name: optional(120),
  contact_email: z.union([z.literal(''), z.string().trim().email('Check the contact email.').max(254)]).nullable().optional(),
  contract_signed_on: day.nullable().optional(),
  seats: z.number().int().min(1, 'Seats must be at least 1.').max(100000),
  starts_on: day,
  ends_on: day,
  status: z.enum(ORGANISATION_STATUSES),
  notes: optional(2000),
}).strict().refine(o => o.ends_on >= o.starts_on, { message: 'The end date must be on or after the start date.' });
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('organisation'), id: z.string().uuid(), revision: z.number().int().min(0), value: organisationSchema }).strict(),
  z.object({ action: z.literal('codes'), organisationId: z.string().uuid(), count: z.number().int().min(1).max(50), maxRedemptions: z.number().int().min(1).max(100000), expiresOn: day.nullable() }).strict(),
  z.object({ action: z.literal('code'), code: z.string().regex(/^[2-9ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/), active: z.boolean() }).strict(),
]);

type DbError = { code?: string; message: string };
function failure(error: DbError) {
  if (error.code === '42501') return json({ error: 'Your access has changed. Verify your session or contact the owner.' }, 403);
  if (error.code === '40001') return json({ error: 'This organisation changed. Reload before saving.' }, 409);
  if (error.code === 'P0002') return json({ error: 'This record is no longer available.' }, 404);
  if (error.code === '23514' || error.code === '22007' || error.code === '22008') return json({ error: 'Check the fields: dates, seats and limits must be valid.' }, 400);
  if (error.message === 'Organisation ended') return json({ error: 'This organisation has ended. Renew it before issuing codes.' }, 409);
  console.error('[admin sponsors]', error.code);
  return json({ error: 'Could not complete this action. Please retry.' }, 503);
}

export async function GET() {
  const access = await requireAdminAccess({ roles: MANAGERS });
  if (access.response) return access.response;
  try {
    const admin = getAdminSupabase();
    const { data, error } = await admin.rpc('sponsor_admin_overview');
    if (error) throw error;
    const rows = (data ?? []) as { organisation: { id: string } }[];
    const reports = await Promise.all(rows.map(row => admin.rpc('sponsor_report', { organisation: row.organisation.id })));
    const failed = reports.find(r => r.error);
    if (failed?.error) throw failed.error;
    return json({ organisations: rows.map((row, i) => ({ ...row, report: reports[i].data })) });
  } catch (error) {
    console.error('[admin sponsors]', (error as DbError)?.code);
    return json({ error: 'Sponsored access is unavailable. Please retry.' }, 503);
  }
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: 'Invalid origin.' }, 403);
  const access = await requireAdminAccess({ roles: MANAGERS });
  if (access.response) return access.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Check the fields.' }, 400);
  const claims = await access.supabase.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (!session) return json({ error: 'Verify your session again.' }, 403);
  const admin = getAdminSupabase(), actor = { actor: access.user.id, actor_session: session };
  const body = parsed.data;

  if (body.action === 'organisation') {
    const v = body.value;
    const { data, error } = await admin.rpc('save_organisation', { ...actor, target: body.id, expected: body.revision,
      content: { ...v, contact_name: v.contact_name || null, contact_email: v.contact_email || null, contract_signed_on: v.contract_signed_on || null, notes: v.notes || null } });
    return error ? failure(error) : json({ organisation: data });
  }
  if (body.action === 'code') {
    const { data, error } = await admin.rpc('set_sponsor_code_active', { ...actor, target: body.code, enabled: body.active });
    return error ? failure(error) : json({ code: data });
  }
  const codes: unknown[] = [];
  for (let i = 0; i < body.count; i++) {
    // About 49 bits per code: a collision is vanishingly rare, but a retry costs nothing.
    for (let attempt = 0; ; attempt++) {
      const { data, error } = await admin.rpc('create_sponsor_code', { ...actor, organisation: body.organisationId, new_code: generateSponsorCode(), maximum: body.maxRedemptions, expires: body.expiresOn });
      if (!error) { codes.push(data); break; }
      if (error.code !== '23505' || attempt >= 2) return codes.length ? json({ codes, error: 'Some codes could not be created. Please retry for the rest.' }, 207) : failure(error);
    }
  }
  return json({ codes });
}
