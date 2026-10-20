import { requireAdminAccess } from '@/lib/access';
import { adminJson } from '@/lib/admin-api';
import { getAdminSupabase } from '@/lib/supabase-admin';
// Aggregate-only parent outcome metrics. Owner/operations at AAL2; the function is service-role only.
export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner', 'operations'] });
  if (access.response) return access.response;
  try {
    const { data, error } = await getAdminSupabase().rpc('parent_outcome_metrics');
    if (error) throw error;
    return adminJson(data);
  } catch (error) {
    console.error('[outcome metrics]', (error as { code?: string })?.code);
    return adminJson({ error: 'Outcome metrics are unavailable. Please retry.' }, 503);
  }
}
