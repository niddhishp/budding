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
        <li><strong>Optional family records:</strong> growth measurements, your chosen chart reference, milestone observations and reminder preferences, saved play activities, and pregnancy preparations and notes. These records stay separate from AI memory and are not automatically sent to an AI provider or clinician.</li>
        <li><strong>What you tell Kahiye:</strong> the situations you describe, notes you log, the guidance generated, and whether it worked.</li>
        <li><strong>Payments:</strong> handled by Razorpay. We store your subscription status and renewal date, never your card or UPI details.</li>
        <li><strong>Optional WhatsApp:</strong> when you connect it, your phone number, incoming messages, replies and delivery receipts are processed to provide the conversation. Send STOP or disconnect in the app to stop future queued replies. An already in-flight message may still arrive.</li>
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

      <h2>How Kahiye uses AI</h2>
      <p>
        Kahiye&apos;s custom-designed AI guidance combines research-informed parenting frameworks, age-specific
        context and safety checks to help you navigate everyday parenting situations.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li><strong>Supabase</strong>: secure database and sign-in.</li>
        <li><strong>AI service providers</strong>: process your messages and relevant context to generate Kahiye&apos;s guidance. Your messages are not used to train these providers&apos; models.</li>
        <li><strong>Razorpay</strong>: subscription payments.</li>
        <li><strong>Vercel</strong>: hosting.</li>
        <li><strong>Twilio and WhatsApp/Meta</strong>: delivery of conversations you choose to start on WhatsApp.</li>
        <li><strong>Resend</strong>: minimal consultation alerts to the operations team and email delivery receipts. These alerts contain a request reference and protected workspace link, not your concern or child details.</li>
      </ul>
      <p>Some of these providers may process data outside India, under contracts that require them to protect it.</p>

      <h2>How long we keep it</h2>
      <p>Transient WhatsApp transport records are kept for up to seven days; message text is cleared once a reply is prepared and reply text once sending finishes. Saved guidance follows your account history settings. Email webhook receipts retain provider identifiers and delivery status for up to seven days; consultation delivery status stays with its request. Providers maintain their own records under their policies.</p>
      <p>Optional family records remain until you clear them or delete the account. Archived growth measurements remain available for undo; archiving is not deletion. Pregnancy notes can be cleared and observations reset in their respective tools. Account deletion removes these records through the same child and account erasure process.</p>
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
