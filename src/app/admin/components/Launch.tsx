import { ProviderDelivery } from './ProviderDelivery';
export function LaunchReadiness() {
  return (
    <>
      <h1 className="font-heading text-4xl">Launch readiness</h1>
      <p className="text-muted-foreground mt-4 mb-8 max-w-2xl">
        Configuration checks are read-only. They do not make a service
        clinically reviewed, legally approved or commercially ready.
      </p>
      <ProviderDelivery />
      <section className="border-t mt-6 pt-6">
        <h2 className="font-heading text-2xl">Owner’s release checklist</h2>
        <ul className="list-disc pl-5 mt-5 space-y-4 max-w-2xl">
          <li>
            Clinical review is pending. Have a named clinician review articles, pregnancy guidance,
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
            For WhatsApp, register the purchased number as an approved business
            sender. Verify linking, a reply, STOP, duplicate webhooks and delivery
            callbacks with an owned test number before opening the channel.
          </li>
          <li>
            Review the product catalogue and financial partners before opening
            referrals. Provider access and a configured switch do not verify
            suitability, stock, partner approval or disclosures.
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
