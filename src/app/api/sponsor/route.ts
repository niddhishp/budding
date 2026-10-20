import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireParentAccess } from '@/lib/access';
import { isSameOrigin } from '@/lib/access-policy';
import { getEntitlement } from '@/lib/billing';
import { REDEEM_MESSAGES, sponsorDate, type RedeemStatus } from '@/lib/sponsor';

const bodySchema = z.object({ code: z.string().trim().min(1).max(64) }).strict();
type Redemption = { status: RedeemStatus; already?: boolean; organisation?: string; until?: string };

// A parent redeems a code from their school, employer, clinic or community partner. The database
// function checks consent, the code, the contract, seats and the one-sponsorship rule under locks;
// it runs as the parent, so it can only ever create the parent's own sponsorship.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const { supabase, user } = access;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter the code exactly as it was given to you.' }, { status: 400 });

  const { data, error } = await supabase.rpc('redeem_sponsor_code', { input: parsed.data.code });
  if (error || !data) return NextResponse.json({ error: 'We could not check this code just now. Nothing has changed; please try again.' }, { status: 503 });
  const result = data as Redemption;
  if (result.status === 'other_sponsor') {
    return NextResponse.json({ code: result.status, error: `Your Kahiye Plus is already sponsored by ${result.organisation} until ${sponsorDate(result.until!)}. You can use a new code after that.` }, { status: 409 });
  }
  if (result.status !== 'redeemed') {
    return NextResponse.json({ code: result.status, error: REDEEM_MESSAGES[result.status] ?? REDEEM_MESSAGES.invalid }, { status: result.status === 'too_many_attempts' ? 429 : 422 });
  }
  let entitlement = null;
  try { entitlement = await getEntitlement(supabase, user.id); } catch { /* The sponsorship is saved; the app refreshes its allowance later. */ }
  return NextResponse.json({ sponsor: { name: result.organisation, until: result.until }, already: !!result.already, entitlement });
}
