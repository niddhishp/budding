import { requireAdminAccess } from '@/lib/access';
import { adminError, adminJson } from '@/lib/admin-api';
import { CONSULTATION_STATUSES } from '@/lib/admin-operations';
export async function GET(request: Request) {
  const access = await requireAdminAccess({ roles: ['owner', 'operations', 'therapist'] });
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const status = params.get('status') || ''; const search = params.get('q') || ''; const page = Number(params.get('page') || 1);
  if ((status && !CONSULTATION_STATUSES.some(s => s === status)) || search.length > 100 || !Number.isInteger(page) || page < 1 || page > 100000) return adminJson({ error: 'Invalid filter.' }, 400);
  const { data, error } = await access.supabase.rpc('admin_consultations', { filter_status: status, search_text: search, page_number: page });
  return error ? adminError(error) : adminJson(data);
}
