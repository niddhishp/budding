import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { billingEventSchema, billingEventArgs } from "@/lib/billing-events";
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 100000)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET,
    signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!secret)
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !validateWebhookSignature(raw, signature, secret)
  )
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    value &&
    typeof value === "object" &&
    "event" in value &&
    typeof value.event === "string" &&
    !value.event.startsWith("subscription.")
  )
    return NextResponse.json({ ok: true });
  const parsed = billingEventSchema.safeParse(value),
    id = req.headers.get("x-razorpay-event-id");
  if (!parsed.success || !id || id.length > 200)
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const { data, error } = await getAdminSupabase().rpc(
    "record_billing_event",
    billingEventArgs(id, parsed.data),
  );
  if (error) {
    console.error("[billing] event persistence failed", { code: error.code });
    return NextResponse.json({ error: "Please retry" }, { status: 503 });
  }
  // Retry a checkout persistence race; never create ownership from event notes.
  if (data === "unmatched")
    return NextResponse.json(
      { error: "Subscription reconciliation required" },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}
