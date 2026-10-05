import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase-server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { getEntitlement } from '@/lib/billing';
import { narrate, narrationAvailable } from '@/lib/narration';

export const maxDuration = 120;

const BUCKET = 'story-audio';
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Studio narration (Plus). Narrates once, stores the MP3 privately, and returns a short-lived URL.
 * Responds `{ fallback: 'device' }` when narration isn't available so the client reads aloud itself.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  // RLS: only the owner's story is visible.
  const { data: story } = await supabase
    .from('stories')
    .select('id, title, body, moral, audio_path')
    .eq('id', id.data)
    .maybeSingle<{ id: string; title: string; body: string; moral: string | null; audio_path: string | null }>();
  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  const admin = getAdminSupabase();

  if (story.audio_path) {
    const { data } = await admin.storage.from(BUCKET).createSignedUrl(story.audio_path, SIGNED_URL_SECONDS);
    if (data?.signedUrl) return NextResponse.json({ url: data.signedUrl });
  }

  const entitlement = await getEntitlement(supabase, user.id);
  if (entitlement.plan !== 'plus' || !narrationAvailable()) {
    return NextResponse.json({ fallback: 'device' });
  }

  try {
    const text = [story.title, story.body, story.moral].filter(Boolean).join('\n\n');
    const audio = await narrate(text);
    const path = `${user.id}/${story.id}.mp3`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) throw uploadError;
    const { error: updateError } = await admin.from('stories').update({ audio_path: path }).eq('id', story.id);
    if (updateError) throw updateError;

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data) throw error ?? new Error('No signed URL');
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('[stories] narration failed', error);
    // Degrade gracefully: the device voice still works.
    return NextResponse.json({ fallback: 'device' });
  }
}
