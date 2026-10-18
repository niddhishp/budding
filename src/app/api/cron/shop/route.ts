import { validWorkerSecret } from "@/lib/provider-webhooks";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { amazonConfigured } from "@/lib/amazon-creators";
import { runDiscovery } from "@/lib/shop-discovery";
import { adminJson as json } from "@/lib/admin-api";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!validWorkerSecret(req.headers.get("authorization")))
    return json({ error: "Unauthorized" }, 401);
  if (process.env.AMAZON_DISCOVERY_ENABLED !== "true" || !amazonConfigured())
    return json({ status: "setup_pending" });
  const db = getAdminSupabase();
  const [recipes, runs] = await Promise.all([
    db
      .from("shop_catalog")
      .select("id")
      .eq("kind", "recipe")
      .eq("value->>enabled", "true"),
    db.from("shop_discovery_runs").select("recipe_id,attempted_at"),
  ]);
  if (recipes.error || runs.error)
    return json({ error: "Queue unavailable" }, 503);
  const times = new Map(runs.data.map((r) => [r.recipe_id, r.attempted_at]));
  const next = recipes.data.sort(
    (a, b) =>
      (times.get(a.id) ?? "").localeCompare(times.get(b.id) ?? "") ||
      a.id.localeCompare(b.id),
  )[0];
  if (!next) return json({ status: "no_enabled_recipes" });
  const r = await runDiscovery(next.id);
  return json(r, r.status);
}
