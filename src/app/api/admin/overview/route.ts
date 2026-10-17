import { requireAdminAccess } from '@/lib/access';
import { adminError, adminJson } from '@/lib/admin-api';
export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner', 'operations', 'therapist'] });
  if (access.response) return access.response;
  const { data, error } = await access.supabase.rpc('admin_overview');
  return error ? adminError(error) : adminJson(data);
}
