import Link from 'next/link';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata('Immediate support in India | Kahiye', 'Find direct emergency, mental health and child protection contacts in India. Available without signing in. Do not wait for an app response in an emergency.', '/help-now');
export default function ImmediateSupport() {
  return <main className="max-w-2xl mx-auto px-6 py-12 text-foreground">
    <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Immediate support', path: '/help-now' }]} />
    <h1 className="font-heading text-4xl mt-10 mb-5">Support when it cannot wait.</h1>
    <p className="text-lg mb-8">If anyone is in immediate danger, contact emergency services now. Do not wait for an app response or a consultation callback.</p>
    <div className="space-y-6">
      <section className="border-l-4 border-clay pl-5"><h2 className="font-heading text-2xl">Emergency help in India</h2><p className="my-2">Police, fire and medical emergencies.</p><a className="inline-block py-3 text-xl font-semibold underline" href="tel:112">Call 112</a><p><a href="https://112.gov.in/" className="text-sm underline">Official emergency service</a></p></section>
      <section className="border-l-4 border-leaf pl-5"><h2 className="font-heading text-2xl">Mental health support</h2><p className="my-2">Tele-MANAS offers free, round-the-clock support.</p><a className="inline-block py-3 text-xl font-semibold underline" href="tel:+9114416?oai_link_source=model_response_hotline">14416</a><p><a className="text-sm underline" href="https://telemanas.mohfw.gov.in/home?oai_link_source=model_response_hotline">https://telemanas.mohfw.gov.in/home</a></p></section>
      <section className="border-l-4 border-turmeric pl-5"><h2 className="font-heading text-2xl">A child needs protection</h2><a className="inline-block py-3 text-xl font-semibold underline" href="tel:1098">Child Helpline 1098</a><p><a className="text-sm underline" href="https://www.spniwcd.wcd.gov.in/child-helpline">Official child protection service</a></p></section>
    </div>
    <p className="mt-10 text-muted-foreground">Outside India, contact your local emergency service. Kahiye is not an emergency service and does not monitor this page or arrange urgent intervention. These contacts are available without an account, subscription or child profile.</p>
    <Link className="inline-block mt-8 underline text-clay" href="/app">Back to Kahiye</Link>
  </main>;
}
