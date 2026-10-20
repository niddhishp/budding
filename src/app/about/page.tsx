import Link from 'next/link';
import { SiteHeader } from '@/views/LandingPage';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata('About Kahiye | A handbook for everyday parenting', 'Meet Kahiye: a parenting handbook with help for hard moments, age-aware conversation guides and private family tools. See what it can and cannot do.', '/about');
export default function AboutPage() {
  return <><SiteHeader /><main className="max-w-3xl mx-auto px-5 py-10 pb-20 text-slate-700">
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'About Kahiye', path: '/about' }]} />
    <h1 className="font-heading text-4xl sm:text-5xl text-slate-900">A little help with the job that keeps changing.</h1>
    <p className="text-xl leading-8 mt-7">One year you’re learning a baby’s cries. A few years later, you’re trying to explain friendship, privacy or why a phone has to wait. Parenting keeps handing you conversations you haven’t had before.</p>
    <p className="text-lg leading-8 mt-5">Kahiye brings a handbook and a place to ask into the same space. Prepare for what’s coming, or describe the moment you’re in and find a small next step.</p>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">Built around your child, with room for you.</h2>
      <p className="leading-8">Choose a child’s profile to find relevant conversations and activities. Keep care dates, interests, growth measurements, savings goals and private photo memories together. Your own space offers ways to pause, ask for help and share the load.</p>
      <p className="leading-8">The vision spans pregnancy to eighteen. Age helps organise the guidance; it does not tell us everything about your child or set a timetable they must meet.</p></section>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">What to expect from the advice.</h2>
      <p className="leading-8">Kahiye uses AI to help with wording, reflection and practice. It can miss context or make mistakes. It cannot assess your child, diagnose a condition or replace a qualified professional. Clinical review of the public guides and guidance remains pending.</p>
      <p className="leading-8">If you ask for a professional conversation, the request goes to the coordination team. It is not an instant appointment or emergency response.</p>
      <Link href="/editorial" className="inline-block underline text-clay py-2">Read our editorial approach →</Link></section>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">A clear business model.</h2>
      <p className="leading-8">Kahiye’s model combines subscriptions, selected product referrals and partnerships. We do not run display ads. Referral links are labelled, and commissions do not decide which products rank first. Paid checkout and provider connections open only after their setup and acceptance checks.</p>
      <p className="leading-8">You choose what to share and can manage saved memories and family records. Read the privacy policy before adding information about your family.</p>
      <div className="flex flex-wrap gap-5"><Link href="/privacy" className="underline py-2">Privacy and your choices</Link><Link href="/articles" className="underline py-2">Browse the guides</Link><Link href="/help-now" className="underline py-2">Immediate support</Link></div></section>
    <Link href="/app" className="inline-block mt-10 rounded-full bg-clay px-7 py-3 text-white">Find your next small step</Link>
  </main></>;
}
