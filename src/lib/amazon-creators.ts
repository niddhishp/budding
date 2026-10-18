import "server-only";
import { z } from "zod";
import { discoveryQuery, type Recipe } from "./shop";
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
