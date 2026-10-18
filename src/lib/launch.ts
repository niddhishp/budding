import "server-only";
export function launchStatus() {
  const billing =
    process.env.BILLING_LIVE_ENABLED === "true" &&
    process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") === true &&
    !!process.env.RAZORPAY_KEY_SECRET &&
    !!process.env.RAZORPAY_PLAN_MONTHLY &&
    !!process.env.RAZORPAY_PLAN_YEARLY &&
    !!process.env.RAZORPAY_WEBHOOK_SECRET;
  const whatsapp = process.env.WHATSAPP_ENABLED === 'true' &&
    !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN &&
    /^whatsapp:\+[1-9]\d{7,14}$/.test(process.env.TWILIO_WHATSAPP_FROM ?? '') &&
    process.env.TWILIO_WHATSAPP_FROM === `whatsapp:${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}` &&
    (process.env.CRON_SECRET?.length ?? 0) >= 32;
  return {
    billing,
    whatsapp,
    operationsEmail:
      !!process.env.RESEND_API_KEY && !!process.env.EXPERT_NOTIFY_EMAIL && !!process.env.RESEND_FROM,
  };
}
