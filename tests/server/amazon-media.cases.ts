import test from "node:test";
import assert from "node:assert/strict";
import {
  getAmazonMedia,
  parseAmazonMedia,
} from "../../src/lib/amazon-creators";
import { MEDIA_TTL, mediaIsFresh } from "../../src/lib/shop-media";
const asin = "B012345678";
const item = {
  asin,
  images: {
    primary: {
      large: {
        url: "https://m.media-amazon.com/images/I/sample.jpg",
        width: 500,
        height: 400,
      },
    },
  },
  offersV2: {
    listings: [{ price: { money: { amount: 499.5, currency: "INR" } } }],
  },
};
test("Amazon media maps ASINs, INR decimal amounts, nullable resources and both documented envelopes", () => {
  const now = Date.now();
  const values = parseAmazonMedia(
    {
      itemsResult: { items: [item, { ...item, asin: "B099999999" }] },
      errors: [{ code: "ItemNotAccessible" }],
    },
    [asin],
    now,
  );
  assert.equal(values.length, 1);
  assert.equal(values[0].price, 499.5);
  assert(values[0].image);
  assert(mediaIsFresh(values[0], now));
  assert(!mediaIsFresh(values[0], now + MEDIA_TTL));
  const partial = parseAmazonMedia(
    { itemResults: { items: [{ ...item, offersV2: null }] } },
    [asin],
  );
  assert(partial[0].image);
  assert.equal(partial[0].price, null);
  assert.throws(() => parseAmazonMedia({ errors: [] }, [asin]));
});
test("Amazon media rejects hostile images, wrong currency and hidden advertising prices", () => {
  for (const url of [
    "http://m.media-amazon.com/images/I/x.jpg",
    "https://m.media-amazon.com.evil.test/images/I/x.jpg",
    "https://user:password@m.media-amazon.com/images/I/x.jpg",
    "https://127.0.0.1/images/I/x.jpg",
    "https://m.media-amazon.com/not-an-image",
  ]) {
    const raw = {
      ...item,
      images: { primary: { large: { ...item.images.primary.large, url } } },
    };
    assert.equal(
      parseAmazonMedia({ itemResults: { items: [raw] } }, [asin])[0].image,
      null,
    );
  }
  for (const listing of [
    { violatesMAP: true, price: item.offersV2.listings[0].price },
    { price: { money: { amount: 499, currency: "USD" } } },
    { price: { money: { amount: -1, currency: "INR" } } },
  ]) {
    assert.equal(
      parseAmazonMedia(
        {
          itemResults: {
            items: [{ ...item, offersV2: { listings: [listing] } }],
          },
        },
        [asin],
      )[0].price,
      null,
    );
  }
});
test("Amazon media batches, deduplicates concurrent calls, expires cache and backs off errors without real requests", async () => {
  const names = [
    "AMAZON_CREATORS_CLIENT_ID",
    "AMAZON_CREATORS_CLIENT_SECRET",
    "AMAZON_CREATORS_VERSION",
    "AMAZON_ASSOCIATE_TAG",
  ];
  const previous = names.map((k) => process.env[k]);
  const originalFetch = globalThis.fetch,
    clock = Date.now;
  let now = clock();
  Date.now = () => now;
  try {
    names.forEach((k) => delete process.env[k]);
    globalThis.fetch = async () => {
      throw new Error("Must not fetch without configuration");
    };
    assert.deepEqual(await getAmazonMedia([asin]), []);
    await assert.rejects(getAmazonMedia(Array(11).fill(asin)));
    Object.assign(process.env, {
      AMAZON_CREATORS_CLIENT_ID: "media-fixture",
      AMAZON_CREATORS_CLIENT_SECRET: "fixture",
      AMAZON_CREATORS_VERSION: "3.2",
      AMAZON_ASSOCIATE_TAG: "fixture-21",
    });
    let calls = 0,
      fail = false;
    globalThis.fetch = async (url, options) => {
      if (String(url).includes("/auth/o2/token"))
        return Response.json({ access_token: "fixture", expires_in: 3600 });
      calls++;
      assert.equal(
        String(url),
        "https://creatorsapi.amazon/catalog/v1/getItems",
      );
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.itemIds, [asin]);
      assert.equal(body.currencyOfPreference, "INR");
      assert.equal(body.condition, "New");
      assert.deepEqual(body.resources, [
        "images.primary.large",
        "offersV2.listings.price",
      ]);
      assert.equal(options?.cache, "no-store");
      return fail
        ? Response.json({}, { status: 429 })
        : Response.json({ itemsResult: { items: [item] } });
    };
    const pair = await Promise.all([
      getAmazonMedia([asin]),
      getAmazonMedia([asin]),
    ]);
    assert.equal(calls, 1);
    assert.equal(pair[0][0].price, 499.5);
    assert.deepEqual(pair[0], pair[1]);
    await getAmazonMedia([asin]);
    assert.equal(calls, 1);
    now += MEDIA_TTL + 1;
    fail = true;
    await assert.rejects(getAmazonMedia([asin]));
    assert.equal(calls, 2);
    assert.deepEqual(await getAmazonMedia([asin]), []);
    assert.equal(calls, 2);
    now += 60001;
    fail = false;
    assert.equal((await getAmazonMedia([asin])).length, 1);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = clock;
    names.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
  }
});
