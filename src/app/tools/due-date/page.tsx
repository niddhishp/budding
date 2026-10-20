import { SiteHeader } from '@/views/LandingPage';
import { DueDateCalculator } from './DueDateCalculator';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata('Due date calculator — when is my baby due? | Kahiye', 'Estimate your due date from your last period, conception date or IVF transfer. See your pregnancy week and trimester. Free, with no account needed.', '/tools/due-date');

export default function DueDatePage() {
  return (
    <main className="min-h-[100dvh] bg-canvas">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-24">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Due date calculator', path: '/tools/due-date' }]} />
        <p className="text-sm font-semibold text-clay tracking-wide mb-4">Free tool</p>
        <h1 className="font-heading text-[clamp(2.3rem,5vw,3.6rem)] leading-[1.05] text-slate-900">When is your baby due?</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-xl">
          Enter one date. We&rsquo;ll work out your due date, how far along you are, and what usually comes next.
        </p>
        <DueDateCalculator />
        <section className="mt-16 max-w-2xl text-slate-700 leading-relaxed space-y-4">
          <h2 className="font-heading text-2xl text-slate-900">How this is calculated</h2>
          <p>
            From your last period, we add 280 days (40 weeks), adjusted for your usual cycle length. From conception, we add
            266 days. For IVF, we count from the transfer date and embryo age.
            A due date is an estimate, not a prediction of the day your baby will arrive.
          </p>
          <p className="text-sm text-slate-600">
            General information, not medical advice. Your doctor may adjust your due date after an ultrasound scan.
          </p>
        </section>
      </div>
    </main>
  );
}
