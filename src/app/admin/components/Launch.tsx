import { launchStatus } from "@/lib/launch";
export function LaunchReadiness() {
  const status = launchStatus();
  const checks = [
    [
      "Live checkout",
      status.billing,
      "Requires explicit live enablement, live Razorpay credentials, plans and webhook secret. Configuration is not proof of a successful payment.",
    ],
    [
      "Consultation email alerts",
      status.operationsEmail,
      "Requires Resend and an operations recipient. Verify sender-domain delivery before relying on email; the admin queue remains authoritative.",
    ],
    [
      "WhatsApp service",
      status.whatsapp,
      "Not open for use. The existing sandbox integration needs verified business onboarding and durable inbound/outbound delivery before activation.",
    ],
  ] as const;
  return (
    <>
      <h1 className="font-heading text-4xl">Launch readiness</h1>
      <p className="text-muted-foreground mt-4 mb-8 max-w-2xl">
        Configuration checks are read-only. They do not make a service
        clinically reviewed, legally approved or commercially ready.
      </p>
      <div className="divide-y">
        {checks.map(([name, ready, note]) => (
          <section key={name} className="py-6">
            <h2 className="font-heading text-2xl">{name}</h2>
            <p className="font-semibold mt-2">
              {ready ? "Configured · verify delivery" : "Not enabled"}
            </p>
            <p className="text-muted-foreground mt-2 max-w-2xl">{note}</p>
          </section>
        ))}
      </div>
      <section className="border-t mt-6 pt-6">
        <h2 className="font-heading text-2xl">Owner’s release checklist</h2>
        <ul className="list-disc pl-5 mt-5 space-y-4 max-w-2xl">
          <li>
            Have a named clinician review articles, pregnancy guidance,
            growth-chart interpretation and milestone wording. The public
            library currently discloses that clinical review is pending.
          </li>
          <li>
            Confirm the operating entity, support contact, privacy/grievance
            handling, consent records and refund/cancellation terms with your
            advisers.
          </li>
          <li>
            Verify custom authentication email delivery, password recovery, MFA
            recovery and the account-deletion process.
          </li>
          <li>
            Complete merchant KYC and verify plan prices, successful and failed
            payments, cancellations, webhook replay and reconciliation in the
            provider’s test environment before enabling live checkout.
          </li>
          <li>
            Rehearse consultation assignment, overdue escalation and absence
            cover with the real team. Verify credentials, contact permission and
            available capacity.
          </li>
          <li>
            For WhatsApp, complete business verification and build durable
            delivery with replay protection, retry visibility and atomic account
            linking before opening the channel.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mt-6">
          These checks require human verification. No completion is inferred
          from the presence of a key or a checkbox.
        </p>
      </section>
    </>
  );
}
