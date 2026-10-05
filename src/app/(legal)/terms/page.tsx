import type { Metadata } from 'next';
import { POLICY_VERSION } from '@/lib/consent';
import { FREE_DECODES_PER_WEEK, PLUS_DECODES_PER_DAY, PRICES } from '@/lib/plans';

export const metadata: Metadata = { title: 'Terms — Budding' };

// DRAFT — have counsel review before launch. Replace every [bracketed] placeholder.
export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-sm text-slate-500">Version {POLICY_VERSION}</p>

      <p>These terms are an agreement between you and [Company legal name] for your use of Budding.</p>

      <h2>What Budding is, and isn&apos;t</h2>
      <p>
        Budding provides general parenting guidance generated with AI and grounded in developmental psychology. It is
        not medical, psychological or legal advice, does not diagnose any condition, and is no substitute for your
        pediatrician or a qualified professional. Use your judgement; you remain responsible for your child&apos;s
        care. If anyone is in danger, call 112.
      </p>

      <h2>Your account</h2>
      <p>You must be 18 or older and the parent or legal guardian of any child you add. Keep your email account secure; anyone with access to it can sign in.</p>

      <h2>Plans and billing</h2>
      <ul>
        <li>Free: {FREE_DECODES_PER_WEEK} decodes per rolling 7 days.</li>
        <li>
          Plus: {PRICES.monthly.amount}/{PRICES.monthly.per} or {PRICES.yearly.amount}/{PRICES.yearly.per}, billed in advance
          through Razorpay and renewing automatically until cancelled. Fair use is {PLUS_DECODES_PER_DAY} decodes per day.
        </li>
        <li>Cancel anytime from the account menu. You keep Plus until the end of the period you paid for; we do not refund partial periods except where the law requires.</li>
        <li>We will give you at least 30 days&apos; notice of any price change.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t misuse the service, attempt to access other people&apos;s data, or use it to harm a child or anyone else.</p>

      <h2>Liability</h2>
      <p>
        Budding is provided &ldquo;as is&rdquo;. To the extent the law allows, our total liability is limited to the
        amount you paid us in the 12 months before the claim.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, with courts in [Mumbai] having jurisdiction.</p>

      <h2>Contact</h2>
      <p>[support email]</p>
    </>
  );
}
