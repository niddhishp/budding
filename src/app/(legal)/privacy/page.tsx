import { POLICY_VERSION } from "@/lib/consent";
import { LEGAL_IDENTITY, PENDING_CONTACT } from '@/lib/legal-identity';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata('Privacy policy | Kahiye', 'Understand what Kahiye collects, how family information is used and the choices available for consent, saved memories, account access and deletion.', '/privacy');

// Have counsel review before paid plans open. Operator details come from src/lib/legal-identity.ts.
export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Privacy policy', path: '/privacy' }]} />
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Version {POLICY_VERSION}</p>

      <p>
        Kahiye (&ldquo;we&rdquo;) is operated by {LEGAL_IDENTITY.operator}, {LEGAL_IDENTITY.address ?? 'India'}{LEGAL_IDENTITY.address ? ', India' : ''}. This policy explains what we collect when
        you use kahiye.app, why, and the choices you have. It is written to meet
        India&apos;s Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address.
        </li>
        <li>
          <strong>About your child:</strong> first name or nickname, date of
          birth or due date, and your answers about their temperament.
        </li>
        <li>
          <strong>Optional family records:</strong> growth measurements, your
          chosen chart reference, milestone observations and reminder
          preferences, saved play activities, pregnancy preparations and notes,
          vaccination and medication records, check-up dates, and your
          observations about interests and talents, and Handbook conversation
          status and follow-up dates. These records stay separate
          from AI memory and are not automatically sent to an AI provider or
          clinician.
        </li>
        <li>
          <strong>What you tell Kahiye:</strong> the situations you describe,
          notes you log, the guidance generated, and whether it worked.
        </li>
        <li>
          <strong>Payments:</strong> handled by Razorpay. We store your
          subscription status and renewal date, never your card or UPI details.
        </li>
        <li>
          <strong>Optional WhatsApp:</strong> when you connect it, your phone
          number, incoming messages, replies and delivery receipts are processed
          to provide the conversation. Send STOP or disconnect in the app to
          stop future queued replies. An already in-flight message may still
          arrive.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        When product pictures are available in Shop for Kids, your browser loads
        them directly from Amazon’s image service, which receives the usual
        network information such as your IP address. We do not send child
        records, preferences or your page address with those image requests.
        Product lookups send only catalogue product identifiers. Prices and
        image addresses are held briefly on our server; Amazon image files are
        not copied into our storage.
      </p>
      <p>
        Optional shopping preferences, product feedback and gift/reward plans
        are private to your account. Shop for Kids uses the child’s age and the
        shopping choices you enter to order reviewed products; health records,
        conversations, horoscope and savings amounts are excluded. You can undo
        feedback or reset preferences in the shop. Catalogue searches use broad
        age bands and editorial shopping topics, never your child’s identity.
        Some clearly marked retailer or financial partner links may earn a
        referral fee. Following one opens the provider’s site under its own
        privacy terms; no family record is included in the link. A click is not
        treated as a purchase.
      </p>
      <p>
        Your optional family plan stores dates, savings goals, balances you
        enter and calculation assumptions. Private photo memories store a
        resized photo, date, title and caption. We remove embedded photo
        metadata during processing. These records are not sent to AI services,
        merchants or other parents. Savings calculations do not connect to banks
        or move money.
      </p>
      <p>
        Your saved interest choices select age-appropriate activities in Today.
        Your recorded health dates, ongoing medication instructions and care
        notes appear in your private daily view. This does not send those
        records to an AI service or activate email or WhatsApp reminders.
      </p>
      <p>
        Only to give you parenting guidance tailored to your child, keep your
        history, run your subscription, and keep the service safe. We do not
        sell your data, provide it for targeted advertising by other companies,
        or share it with other parents.
      </p>

      <h2>Children&apos;s data</h2>
      <p>
        Kahiye is used by parents and legal guardians, not by children. You
        provide information about your child with your verifiable consent as
        their parent or guardian, recorded when you first use the app. We do not
        track children or build advertising profiles of them.
      </p>

      <h2>How Kahiye uses AI</h2>
      <p>
        Ask includes practical guidance, parent-facing chat and clearly labelled
        fictional rehearsal. Submitted messages and checked replies are saved
        under the selected child. Continuing a chat includes up to four earlier
        turns you chose to continue; starting fresh does not include those turns.
        Chat and rehearsal do not automatically create child memories. A practice
        reply is not a statement about what your actual child thinks or will say.
        If you choose to prepare for a saved family event, its title and date are
        shown in an editable prompt and are sent only when you submit it.
      </p>
      <p>
        Kahiye&apos;s custom-designed AI guidance combines research-informed
        parenting frameworks, age-specific context and safety checks to help you
        navigate everyday parenting situations.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>
          <strong>Supabase</strong>: secure database and sign-in.
        </li>
        <li>
          <strong>AI service providers</strong>: process your messages and
          relevant context to generate Kahiye&apos;s guidance. Your messages are
          not used to train these providers&apos; models.
        </li>
        <li>
          <strong>Razorpay</strong>: subscription payments.
        </li>
        <li>
          <strong>Vercel</strong>: hosting.
        </li>
        <li>
          <strong>Twilio and WhatsApp/Meta</strong>: delivery of conversations
          you choose to start on WhatsApp.
        </li>
        <li>
          <strong>Resend</strong>: minimal consultation alerts to the operations
          team and email delivery receipts. These alerts contain a request
          reference and protected workspace link, not your concern or child
          details.
        </li>
        <li>
          <strong>Partner services you contact</strong>: only when you send an
          enquiry and confirm the details on that screen. The partner receives
          your name, the phone number or email you choose, your child&apos;s age
          band, your city if you saved one, and any message you write. Never
          your child&apos;s name, health diary, notes or conversations. Each
          partner provides its service under its own terms; you can see every
          enquiry you sent in your family export.
        </li>
      </ul>
      <p>
        Some of these providers may process data outside India, under contracts
        that require them to protect it.
      </p>
      <p>
        If a school, employer, clinic or community pays for your access with a
        sponsor code, it sees only totals across its families, such as how
        many joined or used Kahiye in the last month. Totals below five
        families are hidden. It never sees your name, your child, your
        questions or your answers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Archived plans and photo memories remain available to restore; archiving
        is not deletion. Account erasure removes your private photo files and
        family records. A retry worker removes any upload that was already in
        flight during erasure after a short delay. Keep your original photos:
        Kahiye stores resized copies, not an original-quality backup.
      </p>
      <p>
        Transient WhatsApp transport records are kept for up to seven days;
        message text is cleared once a reply is prepared and reply text once
        sending finishes. Saved guidance follows your account history settings.
        Email webhook receipts retain provider identifiers and delivery status
        for up to seven days; consultation delivery status stays with its
        request. Providers maintain their own records under their policies.
      </p>
      <p>
        Optional family records remain until you clear them or delete the
        account. Archived growth measurements and health diary entries remain
        available for undo; archiving is not deletion. Interests and their notes
        can be cleared and saved in the child profile. Pregnancy notes can be
        cleared and observations reset in their respective tools. Account
        deletion removes these records through the same child and account
        erasure process.
      </p>
      <p>
        For as long as your account is open. When you delete your account, your
        profile, children, notes and history are deleted immediately; backups
        roll off within 30 days.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Access and correct your data in the app.</li>
        <li>
          Delete your account and all data from the account menu → &ldquo;Delete
          account &amp; data&rdquo;.
        </li>
        <li>Withdraw consent at any time by deleting your account.</li>
        <li>Nominate someone to exercise these rights on your behalf.</li>
      </ul>

      <h2 id="grievance">Grievance Officer</h2>
      <p>
        {LEGAL_IDENTITY.grievanceName && LEGAL_IDENTITY.grievanceEmail
          ? <>{LEGAL_IDENTITY.grievanceName}, <a href={`mailto:${LEGAL_IDENTITY.grievanceEmail}`}>{LEGAL_IDENTITY.grievanceEmail}</a>{LEGAL_IDENTITY.grievancePhone ? `, ${LEGAL_IDENTITY.grievancePhone}` : ''}.</>
          : <>Our Grievance Officer&apos;s contact details are {PENDING_CONTACT}.</>} We respond within 30 days. If you are not
        satisfied, you may approach the Data Protection Board of India.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Kahiye offers general guidance and does not diagnose or treat any
        condition. In an emergency in India, call 112.
      </p>
    </>
  );
}
