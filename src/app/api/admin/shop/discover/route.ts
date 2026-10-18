import { z } from "zod";
import { requireAdminAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/access-policy";
import { adminJson as json } from "@/lib/admin-api";
import { runDiscovery } from "@/lib/shop-discovery";
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Invalid origin." }, 403);
  const a = await requireAdminAccess({ roles: ["owner", "operations"] });
  if (a.response) return a.response;
  const p = z
    .object({ id: z.uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Choose a saved recipe." }, 400);
  const r = await runDiscovery(p.data.id);
  return json(r, r.status);
}
