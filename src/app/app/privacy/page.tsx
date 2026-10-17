import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasCurrentConsent } from '@/lib/access-policy';
import { PrivacyChoices } from './PrivacyChoices';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy choices · Kahiye', robots: { index: false, follow: false } };

export default async function PrivacyChoicesPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/app/privacy');
  const { data, error } = await supabase.from('consents').select('policy_version').eq('user_id',user.id).maybeSingle();
  return <main className="max-w-lg mx-auto px-6 py-16">
    <Link href="/app" className="text-clay underline">Back to Kahiye</Link>
    <h1 className="font-heading text-3xl mt-8 mb-4">Your privacy choices</h1>
    {error ? <p role="alert">We could not load your choices. Please try again.</p> : <PrivacyChoices accepted={hasCurrentConsent(data?.policy_version)} />}
    <Link href="/privacy" className="inline-block mt-8 text-clay underline">Read the privacy policy</Link>
  </main>;
}
