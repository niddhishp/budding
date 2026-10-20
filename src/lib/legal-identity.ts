// Who operates Kahiye, shown on the privacy policy and terms. The operator is known; the address and
// contacts come from public environment settings so the owner can add them in Vercel without a code change.
// Until they are set, the pages say plainly that they are pending rather than showing bracketed placeholders.
const value = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const LEGAL_IDENTITY = {
  operator: 'Niddhish Puuzhakkal, sole proprietor of Light Seeker Films',
  address: value(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  grievanceName: value(process.env.NEXT_PUBLIC_GRIEVANCE_NAME),
  grievanceEmail: value(process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL),
  grievancePhone: value(process.env.NEXT_PUBLIC_GRIEVANCE_PHONE),
  supportEmail: value(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  jurisdiction: 'Mumbai',
};

export const PENDING_CONTACT = 'being finalised and will be published here before paid plans open';

/** Which legal details are still missing; shown in the admin launch checks. */
export function missingLegalDetails() {
  return (['address', 'grievanceName', 'grievanceEmail', 'supportEmail'] as const).filter(k => !LEGAL_IDENTITY[k]);
}
