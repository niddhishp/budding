import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { collectFamilyExport, exportFilename, type LinkSigner } from '@/lib/family-export';

export const runtime = 'nodejs';
export const maxDuration = 60;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Right to portability: the parent's own records as one JSON download. Like account
// erasure, this stays available after consent withdrawal, so it checks sign-in only.
// Every table read runs as the parent under RLS. The service role only signs private
// storage links for keys under the parent's own prefix; it never reads a table.
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: 'Please sign in again.' }, 401);
  const sign: LinkSigner = async (bucket, paths, seconds) => {
    const { data, error: signError } = await getAdminSupabase().storage.from(bucket).createSignedUrls(paths, seconds);
    if (signError) throw signError;
    return new Map((data ?? []).flatMap(d => (d.path && d.signedUrl && !d.error ? [[d.path, d.signedUrl] as [string, string]] : [])));
  };
  let records;
  try {
    records = await collectFamilyExport(supabase, sign, user);
  } catch (cause) {
    console.error('[account] export failed', cause instanceof Error ? cause.message : 'unknown');
    return json({ error: 'We could not gather all your records just now. Nothing was changed. Please try again.' }, 503);
  }
  return new NextResponse(JSON.stringify(records, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFilename(new Date(records.exported_at))}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
