import { useEffect, useState } from "react";
import { mediaIsFresh, type ProductMedia } from "@/lib/shop-media";
export function useShopMedia(asins: string) {
  const [data, setData] = useState<{
    key: string;
    items: ProductMedia[];
    status: string;
  }>({ key: "", items: [], status: "loading" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const earliest = Math.min(...data.items.map(i => Date.parse(i.expiresAt)));
    if (!Number.isFinite(earliest)) return;
    const timer = setTimeout(() => setTick(v => v + 1), Math.max(0, earliest - Date.now()) + 10);
    return () => clearTimeout(timer);
  }, [data]);
  useEffect(() => {
    if (!asins) return;
    const controller = new AbortController();
    fetch(`/api/shop/media?asins=${encodeURIComponent(asins)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json();
      })
      .then((p) => {
        if (!controller.signal.aborted)
          setData({ key: asins, items: p.items ?? [], status: p.status });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setData({ key: asins, items: [], status: "unavailable" });
      });
    // Expire the visible offer even when the parent leaves this page open.
    const timer = setInterval(() => setTick((v) => v + 1), 60000);
    const resume = () => setTick(v => v + 1);
    window.addEventListener('focus', resume);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', resume);
    };
  }, [asins, tick]);
  return {
    items: data.key === asins ? data.items.filter((v) => mediaIsFresh(v)) : [],
    status: data.key === asins ? data.status : "loading",
    refresh: () => setTick((v) => v + 1),
  };
}
