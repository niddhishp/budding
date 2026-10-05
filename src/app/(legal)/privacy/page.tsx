import type { Metadata } from 'next';
import { POLICY_VERSION } from '@/lib/consent';

export const metadata: Metadata = { title: 'Privacy Policy — Kahiye' };

// DRAFT — have counsel review before launch. Replace every [bracketed] placeholder.
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Version {POLICY_VERSION}</p>

      <p>
        Kahiye (&ldquo;we&rdquo;) is operated by [Company legal name], [registered address], India. This policy explains
        what we collect when you use kahiye.app, why, and the choices you have. It is written to meet India&apos;s
        Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> your email address.</li>
        <li><strong>About your child:</strong> first name or nickname, date of birth or due date, and your answers about their temperament.</li>
        <li><strong>What you tell Kahiye:</strong> the situations you describe, notes you log, the guidance generated, and whether it worked.</li>
        <li><strong>Payments:</strong> handled by Razorpay. We store your subscription status and renewal date, never your card or UPI details.</li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        Only to give you parenting guidance tailored to your child, keep your history, run your subscription, and keep
        the service safe. We do not sell your data, use it for advertising, or share it with other parents.
      </p>

      <h2>Children&apos;s data</h2>
      <p>
        Kahiye is used by parents and legal guardians, not by children. You provide information about your child
        with your verifiable consent as their parent or guardian, recorded when you first use the app. We do not track
        children or build advertising profiles of them.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li><strong>Supabase</strong>: secure database and sign-in.</li>
        <li><strong>Anthropic</strong>: the AI model that writes your guidance. Your messages are sent to it to generate a response and are not used to train its models.</li>
        <li><strong>Razorpay</strong>: subscription payments.</li>
        <li><strong>Vercel</strong>: hosting.</li>
      </ul>
      <p>Some of these providers may process data outside India, under contracts that require them to protect it.</p>

      <h2>How long we keep it</h2>
      <p>For as long as your account is open. When you delete your account, your profile, children, notes and history are deleted immediately; backups roll off within [30] days.</p>

      <h2>Your rights</h2>
      <ul>
        <li>Access and correct your data in the app.</li>
        <li>Delete your account and all data from the account menu → &ldquo;Delete account &amp; data&rdquo;.</li>
        <li>Withdraw consent at any time by deleting your account.</li>
        <li>Nominate someone to exercise these rights on your behalf.</li>
      </ul>

      <h2>Grievance Officer</h2>
      <p>
        [Name], [email], [phone]. We respond within 30 days. If you are not satisfied, you may approach the Data
        Protection Board of India.
      </p>

      <h2>Not medical advice</h2>
      <p>Kahiye offers general guidance and does not diagnose or treat any condition. In an emergency in India, call 112.</p>
    </>
  );
}
