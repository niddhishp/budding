import { z } from 'zod';
import { requireAdminAccess } from '@/lib/access';
import { adminJson } from '@/lib/admin-api';
import { processConsultationAlert } from '@/lib/consultation-delivery';
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess({ roles: ['owner','operations'] });
  if (access.response) return access.response;
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return adminJson({ error: 'Request unavailable.' }, 404);
  const visible = await access.supabase.from('consultation_alerts').select('request_id').eq('request_id', id.data).maybeSingle();
  if (visible.error) return adminJson({ error: 'Could not check the alert.' }, 503);
  if (!visible.data) return adminJson({ error: 'No alert is queued for this request.' }, 404);
  try { await processConsultationAlert(id.data); return adminJson({ ok: true }); }
  catch { return adminJson({ error: 'Could not confirm the alert result. Reload its status before retrying.' }, 503); }
}
