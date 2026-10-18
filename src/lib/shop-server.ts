import "server-only";
import { getAdminSupabase } from "./supabase-admin";
import {
  catalogSchema,
  shopRecordSchema,
  type CatalogRecord,
  type ShopRecord,
} from "./shop";
export function cleanShopRow(row: {
  id: string;
  kind: string;
  child_id?: string;
  revision: number;
  value: unknown;
}): ShopRecord | null {
  const v = shopRecordSchema.safeParse({
    id: row.id,
    childId: row.child_id,
    kind: row.kind,
    revision: row.revision,
    value: row.value,
  });
  return v.success ? v.data : null;
}
export async function loadCatalog() {
  const result: CatalogRecord[] = [];
  for (let offset = 0; offset < 3000; offset += 500) {
    const { data, error } = await getAdminSupabase()
      .from("shop_catalog")
      .select("id,kind,revision,value")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Catalogue unavailable");
    for (const r of data ?? []) {
      const p = catalogSchema.safeParse({
        id: r.id,
        kind: r.kind,
        revision: r.revision,
        value: r.value,
      });
      if (p.success) result.push(p.data);
    }
    if (!data || data.length < 500) break;
  }
  return result;
}
export async function loadShopRecords(userId: string) {
  const result: ShopRecord[] = [];
  for (let offset = 0; offset < 2000; offset += 500) {
    const { data, error } = await getAdminSupabase()
      .from("shop_records")
      .select("id,child_id,kind,revision,value")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Choices unavailable");
    for (const r of data ?? []) {
      const v = cleanShopRow(r);
      if (v) result.push(v);
    }
    if (!data || data.length < 500) break;
  }
  return result;
}
export function shopError(code?: string) {
  return code === "40001" || code === "23505"
    ? {
        message:
          "This changed elsewhere. Your draft is kept. Reload saved records, then cancel this draft and reopen the saved version before editing again.",
        status: 409,
      }
    : {
        message:
          "Could not save. Your draft is kept; check the fields and retry.",
        status: 400,
      };
}
