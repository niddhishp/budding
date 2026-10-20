import 'server-only';

type Environment = Readonly<Record<string, string | undefined>>;
export type LaunchService = {
  id: string;
  name: string;
  state: 'closed' | 'incomplete' | 'configured';
  requirements: { label: string; met: boolean }[];
  verify: string;
};

/** Admin-only diagnostics: return labels and booleans, never configuration values. */
export function launchReadiness(env: Environment = process.env): LaunchService[] {
  const present = (name: string) => Boolean(env[name]?.trim());
  const required = (...names: string[]) => names.map(label => ({ label, met: present(label) }));
  const worker = { label: 'CRON_SECRET (at least 32 characters)', met: (env.CRON_SECRET?.length ?? 0) >= 32 };
  const amazon = [
    ...required('AMAZON_CREATORS_CLIENT_ID', 'AMAZON_CREATORS_CLIENT_SECRET'),
    { label: 'AMAZON_ASSOCIATE_TAG (valid Associates tag)', met: /^[a-zA-Z0-9_-]{2,80}$/.test(env.AMAZON_ASSOCIATE_TAG ?? '') },
    { label: 'AMAZON_CREATORS_VERSION (3.1, 3.2 or 3.3)', met: ['3.1', '3.2', '3.3'].includes(env.AMAZON_CREATORS_VERSION ?? '') },
  ];
  const service = (id: string, name: string, requirements: LaunchService['requirements'], verify: string, enabled = true): LaunchService => ({
    id, name, requirements, verify,
    state: !enabled ? 'closed' : requirements.every(item => item.met) ? 'configured' : 'incomplete',
  });
  return [
    service('billing', 'Live checkout', [
      { label: 'RAZORPAY_KEY_ID (live mode)', met: env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') === true },
      ...required('RAZORPAY_KEY_SECRET', 'RAZORPAY_PLAN_MONTHLY', 'RAZORPAY_PLAN_YEARLY', 'RAZORPAY_WEBHOOK_SECRET'),
      { label: 'BILLING_LIVE_ENABLED=true', met: env.BILLING_LIVE_ENABLED === 'true' },
    ], 'Verify merchant approval, both prices, a captured test payment, failed checkout, renewal failure, cancellation and signed webhook replay. Test keys alone cannot open production checkout.', env.BILLING_LIVE_ENABLED === 'true'),
    service('email', 'Consultation email alerts', [
      ...required('RESEND_API_KEY', 'RESEND_FROM', 'EXPERT_NOTIFY_EMAIL', 'RESEND_WEBHOOK_SECRET'), worker,
    ], 'Verify the sending domain and an owned test inbox, then delivered and bounced callbacks. Adding sending credentials can resume queued alerts even if receipt verification is missing. Authentication email is configured separately in Supabase.'),
    service('whatsapp', 'WhatsApp service', [
      ...required('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'),
      { label: 'TWILIO_WHATSAPP_FROM (international WhatsApp number)', met: /^whatsapp:\+[1-9]\d{7,14}$/.test(env.TWILIO_WHATSAPP_FROM ?? '') },
      { label: 'NEXT_PUBLIC_WHATSAPP_NUMBER matches the sender', met: present('NEXT_PUBLIC_WHATSAPP_NUMBER') && env.TWILIO_WHATSAPP_FROM === `whatsapp:${env.NEXT_PUBLIC_WHATSAPP_NUMBER}` },
      worker,
      { label: 'WHATSAPP_ENABLED=true', met: env.WHATSAPP_ENABLED === 'true' },
    ], 'Purchase and approve the business sender. With an owned test number, verify linking, a reply, delivery callbacks, STOP and duplicate callbacks. Daily outbound guidance is a separate, unfinished workflow.', env.WHATSAPP_ENABLED === 'true'),
    service('amazon', 'Shop pictures and prices', amazon,
      'Confirm approved Amazon API access, fetch a real item and review its image, INR offer and availability. Credentials do not publish products; review the catalogue in Curated shop.'),
    service('amazon-links', 'Amazon referral links', [
      { label: 'AMAZON_ASSOCIATE_TAG', met: /^[a-zA-Z0-9_-]{2,80}$/.test(env.AMAZON_ASSOCIATE_TAG ?? '') },
      { label: 'AMAZON_LINKS_ENABLED=true', met: env.AMAZON_LINKS_ENABLED === 'true' },
    ], 'Confirm site approval, referral disclosure and a reviewed product with the correct destination and tag. Commissions must not influence ranking.', env.AMAZON_LINKS_ENABLED === 'true'),
    service('discovery', 'Product discovery worker', [
      ...amazon, worker,
      { label: 'AMAZON_DISCOVERY_ENABLED=true', met: env.AMAZON_DISCOVERY_ENABLED === 'true' },
    ], 'Run a manual discovery recipe first. Check eligible family cohorts and resulting drafts in Curated shop before enabling the daily schedule. Discovery never publishes a product automatically.', env.AMAZON_DISCOVERY_ENABLED === 'true'),
    service('finance', 'Financial partner referrals', [
      { label: 'FINANCE_REFERRALS_ENABLED=true', met: env.FINANCE_REFERRALS_ENABLED === 'true' },
    ], 'Confirm approved partner arrangements, disclosures and allowed destinations in Curated shop. The savings-goal planner works without referrals; this switch does not verify a partner.', env.FINANCE_REFERRALS_ENABLED === 'true'),
    service('legal', 'Legal details on privacy and terms', [
      ...required('NEXT_PUBLIC_LEGAL_ADDRESS', 'NEXT_PUBLIC_GRIEVANCE_NAME', 'NEXT_PUBLIC_GRIEVANCE_EMAIL', 'NEXT_PUBLIC_SUPPORT_EMAIL'),
    ], 'Use the principal place of business from the GST registration (or a chosen office address). The grievance and support inboxes must be real, monitored mailboxes. Have counsel review both pages before paid plans open.'),
    service('auth-email', 'Sign-up and password emails', [
      { label: 'Supabase custom SMTP set to the verified kahiye.app sender (checked by a real sign-up)', met: env.AUTH_SMTP_VERIFIED === 'true' },
    ], 'Supabase’s built-in mailer is for testing only and sends very few emails an hour. Configure custom SMTP (Resend) in Supabase Auth settings, send a real sign-up and password reset to an owned inbox, then set AUTH_SMTP_VERIFIED=true as the record.'),
  ];
}
