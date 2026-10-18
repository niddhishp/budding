import { requireAdminAccess } from '@/lib/access';
import { contactSchema } from '@/lib/admin-operations';
import { adminError, adminJson } from '@/lib/admin-api';
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess({ roles: ['owner','operations','therapist'] });
  if (access.response) return access.response;
  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== (await context.params).id) return adminJson({ error: 'Choose a contact outcome and next follow-up time.' }, 400);
  const { error } = await access.supabase.rpc('record_consultation_contact', { payload: parsed.data });
  return error ? adminError(error) : adminJson({ ok: true });
}
