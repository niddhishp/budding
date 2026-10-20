import { requireAdminAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { adminJson as json } from "@/lib/admin-api";
import { adminSaveSchema, leadStatusSchema } from "@/lib/partner-services";

// Partner services administration: owner or operations, AAL2. Every function re-checks the team
// member's role and MFA session in SQL, enforces activation gates and writes an audit event.
async function staff(req?: Request) {
  if (req && !isSameOrigin(req)) return { response: json({ error: "Invalid origin." }, 403) };
  const a = await requireAdminAccess({ roles: ["owner", "operations"] });
  if (a.response) return { response: a.response };
  const claims = await a.supabase.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (!session) return { response: json({ error: "Verify your session again." }, 403) };
  return { actor: a.user.id, session };
}

function failure(error: { code?: string; message: string }) {
  if (error.code === "42501") return json({ error: "Your access has changed. Verify your session or contact the owner." }, 403);
  if (error.code === "40001") return json({ error: "This record changed elsewhere. Reload, then make your change again." }, 409);
  if (error.code === "23514") return json({ error: gateMessage(error.message) }, 409);
  if (error.code === "P0002") return json({ error: "This record is no longer available." }, 404);
  if (error.code === "23503") return json({ error: "Choose an existing partner." }, 400);
  console.error("[partner admin]", error.code);
  return json({ error: "Could not save. Your draft is kept; check the fields and retry." }, 400);
}
function gateMessage(message: string) {
  if (/partners_health_fee/.test(message)) return "Health partners use a booking or listing fee, never a per-patient commission.";
  if (/partners_active_gates/.test(message)) return "This partner cannot be active yet: it needs a signed contract, terms link, contact and grievance details, and for child-contact services, police verification and insurance.";
  if (/Partner gates are not satisfied/.test(message)) return "This offer cannot be active until its partner is active with every gate satisfied.";
  if (/category must match/.test(message)) return "The offer category must match its partner’s category.";
  if (/contract/i.test(message)) return message + ".";
  return "Check the fields: a rule for this record was not met.";
}

export async function GET() {
  const s = await staff();
  if (s.response) return s.response;
  const { data, error } = await getAdminSupabase().rpc("partner_admin_overview", { actor: s.actor, actor_session: s.session });
  if (error) return failure(error);
  return json(data);
}

export async function PUT(req: Request) {
  const s = await staff(req);
  if (s.response) return s.response;
  const body = adminSaveSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: body.error.issues[0]?.message ?? "Check the fields." }, 400);
  const r = body.data;
  const { data, error } = await getAdminSupabase().rpc(r.kind === "partner" ? "save_partner" : "save_partner_offer", {
    target: r.id, actor: s.actor, actor_session: s.session, expected: r.revision, content: r.value,
  });
  if (error) return failure(error);
  return json({ record: data });
}

export async function PATCH(req: Request) {
  const s = await staff(req);
  if (s.response) return s.response;
  const body = leadStatusSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "Check the fields." }, 400);
  const { data, error } = await getAdminSupabase().rpc("set_partner_lead_status", {
    lead: body.data.leadId, actor: s.actor, actor_session: s.session, next_status: body.data.status,
  });
  if (error) return failure(error);
  return json({ lead: data });
}
