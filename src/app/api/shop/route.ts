import { requireParentAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { adminJson as json } from "@/lib/admin-api";
import { amazonLink, shopRecordSchema } from "@/lib/shop";
import {
  loadCatalog,
  loadShopRecords,
  cleanShopRow,
  shopError,
} from "@/lib/shop-server";
import { todayDate } from "@/lib/family-care";
export async function GET() {
  const a = await requireParentAccess();
  if (a.response) return a.response;
  try {
    const [catalog, records] = await Promise.all([
      loadCatalog(),
      loadShopRecords(a.user.id),
    ]);
    const current = catalog.filter(
      (r) =>
        (r.kind === "product" || r.kind === "finance") &&
        r.value.state === "published" &&
        !!r.value.reviewUntil &&
        r.value.reviewUntil >= todayDate(),
    );
    const tag = process.env.AMAZON_ASSOCIATE_TAG;
    const affiliate =
      process.env.AMAZON_LINKS_ENABLED === "true" &&
      !!tag &&
      /^[a-zA-Z0-9_-]{2,80}$/.test(tag);
    return json({
      records,
      products: current.flatMap((r) => {
        if (r.kind !== "product") return [];
        const { evidence: _, ...v } = r.value;
        void _;
        return [
          {
            ...v,
            id: r.id,
            url: amazonLink(v.asin, affiliate ? tag : undefined),
            plainUrl: amazonLink(v.asin),
            affiliate,
          },
        ];
      }),
      partners:
        process.env.FINANCE_REFERRALS_ENABLED === "true"
          ? current.flatMap((r) =>
              r.kind === "finance"
                ? [
                    {
                      id: r.id,
                      title: r.value.title,
                      description: r.value.description,
                      registration: r.value.registration,
                      disclosure: r.value.disclosure,
                      url: r.value.url,
                    },
                  ]
                : [],
            )
          : [],
      affiliate,
    });
  } catch {
    return json({ error: "The shop could not load. Please try again." }, 503);
  }
}
export async function PUT(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const a = await requireParentAccess();
  if (a.response) return a.response;
  const p = shopRecordSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return json(
      { error: p.error.issues[0]?.message ?? "Check the fields." },
      400,
    );
  const r = p.data;
  if (r.kind === "feedback" && r.value.choice === "not_now") {
    const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    r.value.until = day;
  } else if (r.kind === "feedback") r.value.until = null;
  const { data, error } = await getAdminSupabase().rpc("save_shop_record", {
    target: r.id,
    owner: a.user.id,
    child: r.childId,
    record_kind: r.kind,
    expected: r.revision,
    content: r.value,
  });
  if (error) {
    const e = shopError(error.code);
    return json({ error: e.message }, e.status);
  }
  return json({ record: cleanShopRow(data) });
}
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const a = await requireParentAccess();
  if (a.response) return a.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !Number.isInteger(body.revision))
    return json({ error: "Invalid record." }, 400);
  // Parent-controlled removal of feedback/preferences; gift history is archived instead.
  const { data, error } = await getAdminSupabase()
    .from("shop_records")
    .delete()
    .eq("id", body.id)
    .eq("user_id", a.user.id)
    .eq("revision", body.revision)
    .in("kind", ["feedback", "preferences"])
    .select("id");
  return error
    ? json({ error: "Could not remove this choice." }, 503)
    : !data.length
      ? json({ error: "This choice changed. Reload before removing it." }, 409)
      : json({ ok: true });
}
