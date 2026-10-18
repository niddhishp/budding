import test from "node:test";
import assert from "node:assert/strict";
import {
  amazonConfigured,
  discoverAmazon,
} from "../../src/lib/amazon-creators";
test("Creators API uses approved endpoints, caches OAuth token and fails closed without setup", async () => {
  const names = [
    "AMAZON_CREATORS_CLIENT_ID",
    "AMAZON_CREATORS_CLIENT_SECRET",
    "AMAZON_CREATORS_VERSION",
    "AMAZON_ASSOCIATE_TAG",
  ];
  const old = names.map((k) => process.env[k]);
  const fetcher = globalThis.fetch;
  try {
    for (const k of names) delete process.env[k];
    assert.equal(amazonConfigured(), false);
    const recipe = {
      title: "Test",
      category: "books",
      interest: "books",
      ageBand: "school",
      style: "any",
      budget: 1500,
      enabled: true,
    } as const;
    await assert.rejects(discoverAmazon(recipe), /setup/);
    Object.assign(process.env, {
      AMAZON_CREATORS_CLIENT_ID: "synthetic-id",
      AMAZON_CREATORS_CLIENT_SECRET: "synthetic-secret",
      AMAZON_CREATORS_VERSION: "3.2",
      AMAZON_ASSOCIATE_TAG: "synthetic-21",
    });
    let auth = 0,
      calls = 0,
      fail = false;
    globalThis.fetch = async (input, init) => {
      const url = String(input),
        body = JSON.parse(String(init?.body));
      if (url === "https://api.amazon.co.uk/auth/o2/token") {
        auth++;
        assert.equal(body.scope, "creatorsapi::default");
        return Response.json({
          access_token: "synthetic-token",
          expires_in: 3600,
        });
      }
      assert.equal(url, "https://creatorsapi.amazon/catalog/v1/searchItems");
      assert.equal(body.maxPrice, 150000);
      assert.equal(body.marketplace, "www.amazon.in");
      assert.equal(body.keywords, "books children 6 to 11 years");
      assert.deepEqual(body.resources, ["itemInfo.title"]);
      calls++;
      return fail
        ? Response.json({}, { status: 429 })
        : Response.json({
            searchResult: {
              items: [
                { asin: "B012345678", itemInfo: { title: "Discard this" } },
                { asin: "B012345678" },
              ],
            },
          });
    };
    assert.deepEqual(await discoverAmazon(recipe), ["B012345678"]);
    await discoverAmazon(recipe);
    assert.equal(auth, 1);
    assert.equal(calls, 2);
    fail = true;
    await assert.rejects(discoverAmazon(recipe), /rate limit/);
  } finally {
    globalThis.fetch = fetcher;
    names.forEach((k, i) => {
      if (old[i] === undefined) delete process.env[k];
      else process.env[k] = old[i];
    });
  }
});
