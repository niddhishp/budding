import "server-only";
import { getAdminSupabase } from "./supabase-admin";
import { amazonConfigured, discoverAmazon } from "./amazon-creators";
import { emptyProduct, recipeSchema } from "./shop";
export async function runDiscovery(id: string) {
  const db = getAdminSupabase();
  if (!amazonConfigured())
    return {
      error:
        "Amazon setup is incomplete. Credentials can be added later in Vercel.",
      status: 409,
    };
  const recipe = await db
    .from("shop_catalog")
    .select("value")
    .eq("id", id)
    .eq("kind", "recipe")
    .maybeSingle();
  const p = recipeSchema.safeParse(recipe.data?.value);
  if (recipe.error || !p.success)
    return { error: "Discovery recipe unavailable.", status: 404 };
  const claim = await db.rpc("claim_shop_discovery", { target: id });
  if (claim.error)
    return { error: "Discovery queue unavailable.", status: 503 };
  if (!claim.data)
    return {
      error:
        "A search ran recently. Allow one minute between searches and one hour per recipe.",
      status: 429,
    };
  try {
    const asins = await discoverAmazon(p.data),
      bounds = {
        baby: [0, 36],
        preschool: [36, 72],
        school: [72, 144],
        teen: [144, 216],
      }[p.data.ageBand];
    let added = 0;
    const count = await db
      .from("shop_catalog")
      .select("id", { count: "exact", head: true });
    if (
      count.error ||
      count.count === null ||
      count.count + asins.length > 3000
    )
      throw new Error(
        "Catalogue limit reached. Review existing entries first.",
      );
    for (const asin of asins) {
      const insert = await db
        .from("shop_catalog")
        .insert({
          id: crypto.randomUUID(),
          kind: "product",
          value: {
            ...emptyProduct,
            asin,
            category: p.data.category,
            minMonths: bounds[0],
            maxMonths: bounds[1],
            interests: [p.data.interest],
            styles: p.data.style === "any" ? [] : [p.data.style],
          },
        });
      if (!insert.error) added++;
      else if (insert.error.code !== "23505")
        throw new Error("Could not save discovery candidates. Retry later.");
    }
    const end = await db
      .from("shop_discovery_runs")
      .update({ finished_at: new Date().toISOString(), added, error: null })
      .eq("recipe_id", id);
    if (end.error) throw new Error("Could not record discovery completion.");
    return { added, status: 200 };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Discovery unavailable.";
    await db
      .from("shop_discovery_runs")
      .update({
        finished_at: new Date().toISOString(),
        error: error.slice(0, 300),
      })
      .eq("recipe_id", id);
    return { error, status: 503 };
  }
}
