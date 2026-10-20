import { requireAdminAccess } from '@/lib/access';
import { adminJson } from '@/lib/admin-api';
import { getAdminSupabase } from '@/lib/supabase-admin';
// Aggregate-only parent outcome metrics. Owner/operations at AAL2; the function is service-role only.
export async function GET() {
  const access = await requireAdminAccess({ roles: ['owner', 'operations'] });
  if (access.response) return access.response;
  try {
    const admin = getAdminSupabase();
    const [usage, checkins, programmes] = await Promise.all([admin.rpc('parent_outcome_metrics'), admin.rpc('parent_checkin_metrics'), admin.rpc('programme_metrics')]);
    if (usage.error) throw usage.error;
    if (checkins.error) throw checkins.error;
    if (programmes.error) throw programmes.error;
    return adminJson({ ...usage.data, checkins: checkins.data, programmes: programmes.data?.programmes ?? [] });
  } catch (error) {
    console.error('[outcome metrics]', (error as { code?: string })?.code);
    return adminJson({ error: 'Outcome metrics are unavailable. Please retry.' }, 503);
  }
}
