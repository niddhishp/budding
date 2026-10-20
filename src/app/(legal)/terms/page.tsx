import { POLICY_VERSION } from '@/lib/consent';
import { LEGAL_IDENTITY, PENDING_CONTACT } from '@/lib/legal-identity';
import { CONVERSATION_MESSAGE_LIMIT, FREE_DECODES_PER_WEEK, PLUS_DECODES_PER_DAY, PRICES } from '@/lib/plans';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata('Terms of use | Kahiye', 'Read the terms for using Kahiye, including account responsibilities, guidance limits, subscription terms and how the service handles parenting information.', '/terms');

// Have counsel review before paid plans open. Operator details come from src/lib/legal-identity.ts.
export default function TermsPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Terms of use', path: '/terms' }]} />
      <h1>Terms of Use</h1>
      <p className="text-sm text-slate-500">Version {POLICY_VERSION}</p>

      <p>These terms are an agreement between you and {LEGAL_IDENTITY.operator}{LEGAL_IDENTITY.address ? `, ${LEGAL_IDENTITY.address}` : ''} for your use of Kahiye.</p>

      <h2>What Kahiye is, and isn&apos;t</h2>
      <p>
        Kahiye provides general parenting guidance generated with AI and grounded in developmental psychology. It is
        not medical, psychological or legal advice, does not diagnose any condition, and is no substitute for your
        pediatrician or a qualified professional. Use your judgement; you remain responsible for your child&apos;s
        care. If anyone is in danger, call 112.
      </p>

      <h2>Your account</h2>
      <p>You must be 18 or older and the parent or legal guardian of any child you add. Keep your email account secure; anyone with access to it can sign in.</p>

      <h2>Plans and billing</h2>
      <ul>
        <li>Free: {FREE_DECODES_PER_WEEK} Ask turns per rolling 7 days, shared across practical guidance, chat and practice. A chat or practice conversation uses one Ask turn when it starts and includes up to {CONVERSATION_MESSAGE_LIMIT} messages.</li>
        <li>
          Plus: {PRICES.monthly.amount}/{PRICES.monthly.per} or {PRICES.yearly.amount}/{PRICES.yearly.per}, billed in advance
          through Razorpay and renewing automatically until cancelled. Fair use is {PLUS_DECODES_PER_DAY} Ask turns per rolling day, shared across practical guidance, chat and practice, with the same conversation rule.
        </li>
        <li>Cancel anytime from the account menu. You keep Plus until the end of the period you paid for; we do not refund partial periods except where the law requires.</li>
        <li>We will give you at least 30 days&apos; notice of any price change.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t misuse the service, attempt to access other people&apos;s data, or use it to harm a child or anyone else.</p>

      <h2>Liability</h2>
      <p>
        Kahiye is provided &ldquo;as is&rdquo;. To the extent the law allows, our total liability is limited to the
        amount you paid us in the 12 months before the claim.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, with courts in {LEGAL_IDENTITY.jurisdiction} having jurisdiction.</p>

      <h2>Contact</h2>
      <p>{LEGAL_IDENTITY.supportEmail ? <a href={`mailto:${LEGAL_IDENTITY.supportEmail}`}>{LEGAL_IDENTITY.supportEmail}</a> : <>Our support email is {PENDING_CONTACT}.</>}</p>
    </>
  );
}
