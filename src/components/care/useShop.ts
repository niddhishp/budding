import { useCallback, useEffect, useRef, useState } from "react";
import type { ShopRecord, PublicProduct } from "@/lib/shop";
export interface ShopData {
  records: ShopRecord[];
  products: PublicProduct[];
  partners: {
    id: string;
    title: string;
    description: string;
    registration: string;
    disclosure: string;
    url: string;
  }[];
  affiliate: boolean;
}
export function useShop() {
  const [data, setData] = useState<ShopData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    controller = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    try {
      const r = await fetch("/api/shop", {
        cache: "no-store",
        signal: c.signal,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      setError("");
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => controller.current?.abort();
  }, [reload]);
  async function mutate(method: "PUT" | "DELETE", value: ShopRecord) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/shop", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "DELETE"
            ? { id: value.id, revision: value.revision }
            : value,
        ),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData((old) =>
        old
          ? {
              ...old,
              records:
                method === "DELETE"
                  ? old.records.filter((v) => v.id !== value.id)
                  : [j.record, ...old.records.filter((v) => v.id !== value.id)],
            }
          : old,
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    data,
    error,
    busy,
    reload,
    save: (v: ShopRecord) => mutate("PUT", v),
    remove: (v: ShopRecord) => mutate("DELETE", v),
  };
}
