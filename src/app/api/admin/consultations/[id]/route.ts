import { z } from 'zod';
import { requireAdminAccess } from '@/lib/access';
import { isSameOrigin } from '@/lib/access-policy';
import { consultationSchema } from '@/lib/admin-operations';
import { adminError, adminJson } from '@/lib/admin-api';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const access = await requireAdminAccess({ roles: ['owner', 'operations', 'therapist'] });
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return adminJson({ error: 'Request not found.' }, 404);
  const { data, error } = await access.supabase.rpc('admin_consultation', { target: id });
  return error ? adminError(error) : adminJson({ request: data });
}
export async function PATCH(request: Request, context: Context) {
  if (!isSameOrigin(request)) return adminJson({ error: 'Invalid request origin.' }, 403);
  const access = await requireAdminAccess({ roles: ['owner', 'operations', 'therapist'] });
  if (access.response) return access.response;
  const { id } = await context.params;
  const parsed = consultationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.id !== id) return adminJson({ error: 'Check the status, expert and session time.' }, 400);
  const { error } = await access.supabase.rpc('update_consultation', { payload: parsed.data });
  return error ? adminError(error) : adminJson({ ok: true });
}
