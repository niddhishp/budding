import { requireAdminAccess } from '@/lib/access';
import { isSameOrigin } from '@/lib/access-policy';
import { expertSchema } from '@/lib/admin-operations';
import { adminError, adminJson } from '@/lib/admin-api';

export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner', 'operations'] });
  if (access.response) return access.response;
  const { data, error } = await access.supabase.rpc('admin_experts');
  return error ? adminError(error) : adminJson({ experts: data });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return adminJson({ error: 'Invalid request origin.' }, 403);
  const access = await requireAdminAccess({ roles: ['owner', 'operations'] });
  if (access.response) return access.response;
  const parsed = expertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJson({ error: parsed.error.issues[0]?.message || 'Check the expert details.' }, 400);
  const { data, error } = await access.supabase.rpc('save_expert', { payload: parsed.data });
  return error ? adminError(error) : adminJson({ id: data });
}
