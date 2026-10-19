import test from "node:test";
import assert from "node:assert/strict";
import {
  guideBand,
  GUIDE_BANDS,
  PARENT_GUIDES,
} from "../src/data/parent-guides";
import { ARTICLES } from "../src/data/articles";
test("parent guides cover each age band, both puberty paths and public articles", () => {
  assert.equal(guideBand(null), null);
  assert.equal(guideBand(-1), null);
  assert.equal(guideBand(216), null);
  for (const [months, band] of [
    [0, 0],
    [59, 0],
    [60, 1],
    [95, 1],
    [96, 2],
    [131, 2],
    [132, 3],
    [167, 3],
    [168, 4],
    [215, 4],
  ])
    assert.equal(guideBand(months), GUIDE_BANDS[band]);
  for (const band of GUIDE_BANDS) {
    assert(
      PARENT_GUIDES.some((g) => g.topic === "safety" && g.bands.includes(band)),
    );
    for (const path of ["girls", "boys"])
      assert(
        PARENT_GUIDES.some(
          (g) =>
            g.topic === "puberty" &&
            g.bands.includes(band) &&
            (g.path === path || g.path === "all"),
        ),
      );
  }
  assert.equal(new Set(ARTICLES.map((a) => a.slug)).size, ARTICLES.length);
  for (const g of PARENT_GUIDES) {
    assert(ARTICLES.some((a) => a.slug === g.slug && a.sources.length > 0));
    assert(g.scenario && g.response && g.say && g.care);
  }
});
