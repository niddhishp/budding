import { z } from "zod";
import { requireParentAccess } from "@/lib/access";
import { adminJson as json } from "@/lib/admin-api";
import { loadCatalog } from "@/lib/shop-server";
import { todayDate } from "@/lib/family-care";
import { amazonConfigured, getAmazonMedia } from "@/lib/amazon-creators";
const idsSchema = z
  .array(z.string().regex(/^[A-Z0-9]{10}$/))
  .min(1)
  .max(10);
export async function GET(request: Request) {
  const access = await requireParentAccess();
  if (access.response) return access.response;
  const parsed = idsSchema.safeParse(
    new URL(request.url).searchParams.get("asins")?.split(","),
  );
  if (!parsed.success)
    return json({ error: "Choose up to ten products." }, 400);
  try {
    const catalog = await loadCatalog();
    const allowed = new Set(
      catalog.flatMap((r) =>
        r.kind === "product" &&
        r.value.state === "published" &&
        r.value.reviewUntil &&
        r.value.reviewUntil >= todayDate()
          ? [r.value.asin]
          : [],
      ),
    );
    if (parsed.data.some((id) => !allowed.has(id)))
      return json(
        { error: "These products are not in the current collection." },
        404,
      );
    if (!amazonConfigured())
      return json({ status: "not_configured", items: [] });
    return json({ status: "ready", items: await getAmazonMedia(parsed.data) });
  } catch {
    return json(
      {
        status: "unavailable",
        items: [],
        error: "Pictures and prices are temporarily unavailable.",
      },
      503,
    );
  }
}
