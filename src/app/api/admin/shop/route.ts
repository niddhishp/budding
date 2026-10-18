import { requireAdminAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { adminJson as json } from "@/lib/admin-api";
import { catalogSchema } from "@/lib/shop";
import { loadCatalog, shopError } from "@/lib/shop-server";
import { todayDate } from "@/lib/family-care";
import { amazonConfigured } from "@/lib/amazon-creators";
export async function GET() {
  const a = await requireAdminAccess({ roles: ["owner", "operations"] });
  if (a.response) return a.response;
  try {
    const [records, runs, demand] = await Promise.all([
      loadCatalog(),
      getAdminSupabase().from("shop_discovery_runs").select("*"),
      getAdminSupabase().rpc("shop_demand"),
    ]);
    if (runs.error || demand.error) throw runs.error ?? demand.error;
    return json({
      records,
      runs: runs.data,
      demand: demand.data,
      setup: {
        amazon: amazonConfigured(),
        links:
          process.env.AMAZON_LINKS_ENABLED === "true" &&
          !!process.env.AMAZON_ASSOCIATE_TAG,
        automatic: process.env.AMAZON_DISCOVERY_ENABLED === "true",
        finance: process.env.FINANCE_REFERRALS_ENABLED === "true",
      },
    });
  } catch {
    return json({ error: "Catalogue unavailable." }, 503);
  }
}
export async function PUT(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const a = await requireAdminAccess({ roles: ["owner", "operations"] });
  if (a.response) return a.response;
  const p = catalogSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return json(
      { error: p.error.issues[0]?.message ?? "Check the fields." },
      400,
    );
  const claims = await a.supabase.auth.getClaims();
  const session = claims.data?.claims.session_id;
  if (!session) return json({ error: "Verify your session again." }, 403);
  const r = p.data;
  if (
    (r.kind === "product" || r.kind === "finance") &&
    r.value.state === "published" &&
    (!r.value.reviewUntil || r.value.reviewUntil < todayDate())
  )
    return json({ error: "Publishing requires a current review date." }, 400);
  const { data, error } = await getAdminSupabase().rpc("save_shop_catalog", {
    target: r.id,
    actor: a.user.id,
    actor_session: session,
    record_kind: r.kind,
    expected: r.revision,
    content: r.value,
  });
  if (error) {
    const e = shopError(error.code);
    return json({ error: e.message }, e.status);
  }
  return json({ record: data });
}
