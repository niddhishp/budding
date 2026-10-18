import "server-only";
export function launchStatus() {
  const billing =
    process.env.BILLING_LIVE_ENABLED === "true" &&
    process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") === true &&
    !!process.env.RAZORPAY_KEY_SECRET &&
    !!process.env.RAZORPAY_PLAN_MONTHLY &&
    !!process.env.RAZORPAY_PLAN_YEARLY &&
    !!process.env.RAZORPAY_WEBHOOK_SECRET;
  // Keep the existing sandbox integration dormant until verified delivery and provider onboarding are complete.
  const whatsapp = false;
  return {
    billing,
    whatsapp,
    operationsEmail:
      !!process.env.RESEND_API_KEY && !!process.env.EXPERT_NOTIFY_EMAIL,
  };
}
