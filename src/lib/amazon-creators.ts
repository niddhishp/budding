import "server-only";
import { z } from "zod";
import { discoveryQuery, type Recipe } from "./shop";
import { MEDIA_TTL, type ProductMedia } from "./shop-media";
const endpoints = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
} as const;
let token: { key: string; value: string; expires: number } | null = null;
export function amazonConfigured() {
  return !!(
    process.env.AMAZON_CREATORS_CLIENT_ID &&
    process.env.AMAZON_CREATORS_CLIENT_SECRET &&
    process.env.AMAZON_ASSOCIATE_TAG &&
    /^[a-zA-Z0-9_-]{2,80}$/.test(process.env.AMAZON_ASSOCIATE_TAG) &&
    process.env.AMAZON_CREATORS_VERSION &&
    process.env.AMAZON_CREATORS_VERSION in endpoints
  );
}

// Only short-lived URLs and offer amounts; never persist Amazon image bytes.
const mediaCache = new Map<
  string,
  { expires: number; value: ProductMedia | null }
>();
let mediaConfig = "",
  nextMediaRequest = 0;
let mediaPending: Promise<void> | null = null;
const imageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});
const moneySchema = z.object({
  amount: z.number().finite().positive().max(100000000),
  currency: z.literal("INR"),
});
export function parseAmazonMedia(
  raw: unknown,
  requested: string[],
  now = Date.now(),
): ProductMedia[] {
  const container = z.object({ items: z.array(z.unknown()).max(10) });
  // Both names appear in Amazon's current curl and operation reference examples.
  const payload = z
    .object({
      itemResults: container.nullish(),
      itemsResult: container.nullish(),
    })
    .safeParse(raw);
  if (!payload.success) throw new Error("Unexpected Amazon product response.");
  const items =
    payload.data.itemsResult?.items ?? payload.data.itemResults?.items;
  if (!items) throw new Error("Unexpected Amazon product response.");
  return items.flatMap((item) => {
    const p = z
      .object({ asin: z.string(), images: z.unknown(), offersV2: z.unknown() })
      .safeParse(item);
    if (!p.success || !requested.includes(p.data.asin)) return [];
    const images = z
      .object({ primary: z.object({ large: z.unknown() }) })
      .safeParse(p.data.images);
    const im = imageSchema.safeParse(
      images.success ? images.data.primary.large : undefined,
    );
    let image: ProductMedia["image"] = null;
    if (im.success) {
      const url = new URL(im.data.url);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        [
          "m.media-amazon.com",
          "images-na.ssl-images-amazon.com",
          "images-eu.ssl-images-amazon.com",
        ].includes(url.hostname) &&
        url.pathname.startsWith("/images/")
      )
        image = im.data;
    }
    const offers = z
      .object({
        listings: z.array(
          z.object({
            violatesMAP: z.boolean().nullish(),
            price: z.object({ money: z.unknown() }).nullish(),
          }),
        ),
      })
      .safeParse(p.data.offersV2);
    const offer = offers.success ? offers.data.listings[0] : undefined;
    const money = moneySchema.safeParse(offer?.price?.money);
    return [
      {
        asin: p.data.asin,
        image,
        price:
          offer?.violatesMAP !== true && money.success
            ? money.data.amount
            : null,
        checkedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + MEDIA_TTL).toISOString(),
      },
    ];
  });
}
export async function getAmazonMedia(input: string[]): Promise<ProductMedia[]> {
  const ids = [
    ...new Set(
      z
        .array(z.string().regex(/^[A-Z0-9]{10}$/))
        .min(1)
        .max(10)
        .parse(input),
    ),
  ];
  if (!amazonConfigured()) return [];
  const config = `${process.env.AMAZON_CREATORS_CLIENT_ID}:${process.env.AMAZON_CREATORS_VERSION}:${process.env.AMAZON_ASSOCIATE_TAG}`;
  if (config !== mediaConfig) {
    mediaCache.clear();
    mediaConfig = config;
    nextMediaRequest = 0;
  }
  if (mediaPending) await mediaPending;
  const now = Date.now();
  for (const [id, entry] of mediaCache)
    if (entry.expires <= now) mediaCache.delete(id);
  const missing = ids.filter((id) => !mediaCache.has(id));
  if (missing.length && now >= nextMediaRequest) {
    nextMediaRequest = now + 2000;
    mediaPending = (async () => {
      try {
        const bearer = await accessToken();
        const res = await fetch(
          "https://creatorsapi.amazon/catalog/v1/getItems",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${bearer}`,
              "Content-Type": "application/json",
              "x-marketplace": "www.amazon.in",
            },
            body: JSON.stringify({
              marketplace: "www.amazon.in",
              partnerTag: process.env.AMAZON_ASSOCIATE_TAG,
              itemIds: missing,
              itemIdType: "ASIN",
              condition: "New",
              currencyOfPreference: "INR",
              resources: ["images.primary.large", "offersV2.listings.price"],
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!res.ok) {
          if (res.status === 401) token = null;
          throw new Error("Amazon product lookup unavailable.");
        }
        const values = parseAmazonMedia(await res.json(), missing);
        for (const id of missing) {
          const value = values.find((v) => v.asin === id) ?? null;
          if (mediaCache.size >= 1000)
            mediaCache.delete(mediaCache.keys().next().value!);
          mediaCache.set(id, {
            value,
            expires: value ? Date.parse(value.expiresAt) : Date.now() + 60000,
          });
        }
      } catch (error) {
        nextMediaRequest = Date.now() + 60000;
        throw error;
      }
    })();
    try {
      await mediaPending;
    } finally {
      mediaPending = null;
    }
  }
  return ids.flatMap((id) => {
    const entry = mediaCache.get(id);
    return entry?.value && entry.expires > Date.now() ? [entry.value] : [];
  });
}
async function accessToken() {
  const id = process.env.AMAZON_CREATORS_CLIENT_ID!,
    secret = process.env.AMAZON_CREATORS_CLIENT_SECRET!,
    version = process.env.AMAZON_CREATORS_VERSION as keyof typeof endpoints;
  if (!amazonConfigured())
    throw new Error(
      "Amazon setup is incomplete. Add Creators API credentials and the Associates tag in Vercel.",
    );
  const key = id + ":" + version;
  if (token?.key === key && token.expires > Date.now()) return token.value;
  const res = await fetch(endpoints[version], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
      scope: "creatorsapi::default",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new Error(
      "Amazon authentication failed. Check the credential version and approved API access.",
    );
  const p = z
    .object({
      access_token: z.string().min(1),
      expires_in: z.number().positive(),
    })
    .safeParse(await res.json());
  if (!p.success)
    throw new Error("Amazon returned an unexpected authentication response.");
  token = {
    key,
    value: p.data.access_token,
    expires: Date.now() + Math.min(p.data.expires_in - 60, 3300) * 1000,
  };
  return token.value;
}
export async function discoverAmazon(recipe: Recipe) {
  const bearer = await accessToken();
  const res = await fetch("https://creatorsapi.amazon/catalog/v1/searchItems", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      "x-marketplace": "www.amazon.in",
    },
    body: JSON.stringify({
      marketplace: "www.amazon.in",
      partnerTag: process.env.AMAZON_ASSOCIATE_TAG,
      keywords: discoveryQuery(recipe),
      searchIndex: "All",
      itemCount: 10,
      resources: ["itemInfo.title"],
      ...(recipe.budget ? { maxPrice: recipe.budget * 100 } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    if (res.status === 401) token = null;
    throw new Error(
      res.status === 429
        ? "Amazon rate limit reached. Retry after the next discovery window."
        : "Amazon search failed. Check marketplace approval and provider status.",
    );
  }
  const p = z
    .object({
      searchResult: z
        .object({
          items: z
            .array(z.object({ asin: z.string().regex(/^[A-Z0-9]{10}$/) }))
            .max(10),
        })
        .optional(),
    })
    .safeParse(await res.json());
  if (!p.success || !p.data.searchResult)
    throw new Error("Amazon returned no usable search results.");
  // Persist only ASINs, never API text/images/prices. Editors supply original copy.
  return [...new Set(p.data.searchResult.items.map((i) => i.asin))];
}
