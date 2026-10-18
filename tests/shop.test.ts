import test from "node:test";
import assert from "node:assert/strict";
import {
  ageMonths,
  amazonLink,
  emptyPreferences,
  emptyProduct,
  rankProducts,
  productSchema,
  financeSchema,
  giftSchema,
  emptyGift,
  safePartnerUrl,
  discoveryQuery,
  type PublicProduct,
  type ShopRecord,
} from "../src/lib/shop";
const product = (
  id: string,
  extra: Partial<PublicProduct> = {},
): PublicProduct =>
  ({
    ...emptyProduct,
    id,
    asin: "B012345678",
    title: "Original choice",
    reason: "Thoughtful editorial reason",
    safety: "Check small parts and supervise",
    evidence: undefined,
    state: "published",
    reviewUntil: "2026-12-01",
    url: "https://www.amazon.in/dp/B012345678",
    plainUrl: "https://www.amazon.in/dp/B012345678",
    affiliate: false,
    ...extra,
  }) as PublicProduct;
test("shop rejects invalid dates and has exact birthday/18-year boundaries", () => {
  assert.equal(ageMonths("2015-10-19", "2026-10-18"), 131);
  assert.equal(ageMonths("2015-10-18", "2026-10-18"), 132);
  assert.equal(ageMonths("2026-02-30", "2026-10-18"), null);
  assert.deepEqual(
    rankProducts([product("a")], 216, emptyPreferences, [], "2026-10-18"),
    [],
  );
  assert.deepEqual(
    rankProducts([product("a")], null, emptyPreferences, [], "2026-10-18"),
    [],
  );
});
test("ranking enforces age, expiry, materials, then taste; fees have no role", () => {
  const products = [
    product("a", { interests: ["music"] }),
    product("b", { interests: ["art"] }),
    product("c", { materials: ["wool"] }),
    product("d", { minMonths: 144 }),
    product("e", { state: "paused" }),
    product("f", { reviewUntil: "2026-01-01" }),
  ];
  const ranked = rankProducts(
    products,
    132,
    { ...emptyPreferences, interests: ["art"], avoid: ["wool"] },
    [],
    "2026-10-18",
  );
  assert.deepEqual(
    ranked.map((r) => r.id),
    ["b", "a"],
  );
  assert.match(ranked[0].match, /art/);
});
test("feedback applies only to its product, not-now expires and undo restores", () => {
  const f: ShopRecord = {
    id: "10000000-0000-4000-8000-000000000001",
    childId: "10000000-0000-4000-8000-000000000002",
    revision: 1,
    kind: "feedback",
    value: {
      productId: "10000000-0000-4000-8000-000000000003",
      choice: "not_now",
      reason: "Later",
      until: "2026-10-19",
    },
  };
  const products = [product(f.value.productId), product("b")];
  assert.equal(
    rankProducts(products, 100, emptyPreferences, [f], "2026-10-18").length,
    1,
  );
  assert.equal(
    rankProducts(products, 100, emptyPreferences, [f], "2026-10-20").length,
    2,
  );
  assert.equal(
    rankProducts(products, 100, emptyPreferences, [], "2026-10-18").length,
    2,
  );
});
test("catalogue publication requires evidence; expired records remain editable", () => {
  assert.equal(
    productSchema.safeParse({
      ...emptyProduct,
      asin: "B012345678",
      state: "published",
    }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({
      ...emptyProduct,
      asin: "B012345678",
      title: "A title",
      reason: "A long reason here",
      safety: "Safety checked here",
      evidence: "Checked by a reviewer",
      state: "published",
      reviewUntil: "2020-01-01",
    }).success,
    true,
  );
  assert.equal(
    financeSchema.safeParse({ title: "Partner", state: "published" }).success,
    false,
  );
  assert.equal(
    giftSchema.safeParse({ ...emptyGift, title: "Reward", kind: "reward" })
      .success,
    false,
  );
});
test("direct retailer links contain no identity; finance URLs reject spoofed hosts", () => {
  assert.equal(
    amazonLink("B012345678", "example-21"),
    "https://www.amazon.in/dp/B012345678?tag=example-21",
  );
  assert.equal(amazonLink("../bad"), null);
  for (const [url, host] of [
    ["https://trusted.in.evil.com", "trusted.in"],
    ["https://user@trusted.in", "trusted.in"],
    ["http://trusted.in", "trusted.in"],
    ["https://127.0.0.1", "127.0.0.1"],
    ["https://partner.in/{child}", "partner.in"],
  ])
    assert.equal(safePartnerUrl(url, host), false);
  assert.equal(
    safePartnerUrl("https://partner.in/info?ref=kahiye", "partner.in"),
    true,
  );
});
test("discovery sends only coarse editorial context", () => {
  assert.equal(
    discoveryQuery({
      title: "Internal label",
      category: "clothing",
      interest: "art",
      ageBand: "school",
      style: "simple",
      budget: 1500,
      enabled: true,
    }),
    "clothing art simple children 6 to 11 years",
  );
});
test("saved picks can improve similar suggestions and learning can be disabled", () => {
  const products = [
    product("a", { category: "music" }),
    product("b", { category: "art" }),
    product("c", { category: "art" }),
  ];
  const feedback: ShopRecord = {
    id: "10000000-0000-4000-8000-000000000001",
    childId: "10000000-0000-4000-8000-000000000002",
    kind: "feedback",
    revision: 1,
    value: { productId: "c", choice: "saved", reason: "", until: null },
  };
  assert.deepEqual(
    rankProducts(products, 120, emptyPreferences, [feedback], "2026-10-18").map(
      (p) => p.id,
    ),
    ["c", "b", "a"],
  );
  assert.deepEqual(
    rankProducts(
      products,
      120,
      { ...emptyPreferences, learnFromSaved: false },
      [feedback],
      "2026-10-18",
    ).map((p) => p.id),
    ["c", "a", "b"],
  );
});
