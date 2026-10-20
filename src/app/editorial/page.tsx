import Link from 'next/link';
import { SiteHeader } from '@/views/LandingPage';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EDITORIAL_BIO, EDITORIAL_NAME, EDITORIAL_URL, SITE_URL, jsonLd, publicMetadata } from '@/lib/seo';
export const metadata = publicMetadata('Kahiye Editorial | Sources, authorship & review status', 'See how Kahiye’s parenting guides use sources and AI-assisted drafts, what clinical review is still pending, and how to flag an error or concern.', '/editorial');
export default function EditorialPage() {
  return <><SiteHeader /><main className="max-w-3xl mx-auto px-5 py-10 pb-20 text-slate-700">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@type': 'AboutPage', url: EDITORIAL_URL, name: 'Kahiye editorial approach', mainEntity: { '@type': 'Organization', name: EDITORIAL_NAME, url: EDITORIAL_URL, parentOrganization: { '@type': 'Organization', name: 'Kahiye', url: SITE_URL } } }) }} />
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Editorial approach', path: '/editorial' }]} />
    <h1 className="font-heading text-4xl sm:text-5xl text-slate-900">Who is behind the words?</h1>
    <p className="text-xl leading-8 mt-7">{EDITORIAL_BIO}</p>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">A byline you can understand.</h2>
      <p className="leading-8">“Kahiye Editorial” is the site’s publishing byline. It does not identify a licensed clinician or imply that a named expert has approved the text. Individual author and reviewer biographies will be added when their roles and qualifications are confirmed.</p></section>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">Sources you can follow.</h2>
      <p className="leading-8">Each guide links to the source material used for its topic, including public health and child-protection organisations. A source link does not mean that organisation endorses Kahiye. Advice and services may differ by country, and a clinician who knows your child can help you apply it.</p>
      <p className="leading-8">The date on a guide reflects a content or presentation update. It is not a clinical approval date. We avoid presenting age ranges as deadlines or a short quiz as a diagnosis.</p></section>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">How AI is involved.</h2>
      <p className="leading-8">AI assists with drafting and editing, and generates personalised responses in Ask. Automated checks can catch some problems, but they do not replace human editorial judgment, safeguarding expertise or clinical review. We do not describe this material as entirely human-authored or clinically validated.</p></section>
    <section className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">Review still to come.</h2>
      <p className="leading-8">Independent clinical and safeguarding review is pending. Named reviewers, their relevant qualifications and the scope of each completed review will be published when available. Until then, use these guides for general orientation and bring health or safety concerns to an appropriate professional.</p></section>
    <section id="corrections" className="mt-10 space-y-4"><h2 className="font-heading text-2xl text-slate-900">If something looks wrong.</h2>
      <p className="leading-8">A public corrections inbox is being set up. We will publish the address here once it is ready to receive and respond to messages. Please do not send private health details through public comments or social media. For an urgent health or safety concern, contact an appropriate professional directly.</p>
      <p className="leading-8">We keep source changes and editorial revisions in version control. The published page will show an updated date when its content changes.</p></section>
    <div className="flex flex-wrap gap-5 mt-10"><Link href="/articles" className="underline py-2">Parenting guides</Link><Link href="/about" className="underline py-2">About Kahiye</Link><Link href="/help-now" className="underline py-2">Immediate support</Link></div>
  </main></>;
}
