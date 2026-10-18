// Actual route handlers and RLS/RPCs against disposable SQL; storage transport is simulated.
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createServer } from "node:http";
import pg from "pg";
import sharp from "sharp";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl || !["localhost", "127.0.0.1"].includes(new URL(dbUrl).hostname))
  throw Error("Disposable local SQL required");
const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
await db.query("begin");
const uid = "f4000000-0000-4000-8000-000000000001",
  child = "f4000000-0000-4000-8000-000000000011",
  other = "f4000000-0000-4000-8000-000000000002";
await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [
  uid,
  "family-route@example.invalid",
  other,
  "family-other@example.invalid",
]);
await db.query(
  "insert into public.consents(user_id,policy_version) values($1,'2026-10-05'),($2,'2026-10-05')",
  [uid, other],
);
await db.query(
  "insert into public.children(id,user_id,name,dob) values($1,$2,'Synthetic child','2015-01-01')",
  [child, uid],
);
const staffSession = "f4000000-0000-4000-8001-000000000002";
await db.query(
  "insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2')",
  [staffSession, other],
);
await db.query(
  "insert into public.admin_memberships(user_id,role) values($1,'operations')",
  [other],
);
const objects = new Map();
let failUpload = false,
  queue = Promise.resolve();
const server = createServer((req, res) => {
  queue = queue
    .then(async () => {
      const u = new URL(req.url, "http://test"),
        path = u.pathname,
        token = (req.headers.authorization ?? "").replace("Bearer ", "");
      const owner =
        token === "synthetic-service-only"
          ? null
          : JSON.parse(
              Buffer.from(token.split(".")[1] ?? "e30", "base64url").toString(),
            ).sub;
      const send = (body, status = 200) =>
        res
          .writeHead(status, { "content-type": "application/json" })
          .end(JSON.stringify(body));
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      if (path === "/auth/v1/user") {
        send({
          id: owner,
          aud: "authenticated",
          role: "authenticated",
          email: "synthetic@example.invalid",
          app_metadata: {},
          user_metadata: {},
        });
        return;
      }
      if (path.startsWith("/storage/v1/object/")) {
        const key = path
          .replace("/storage/v1/object/authenticated/", "")
          .replace("/storage/v1/object/", "");
        if (req.method === "POST") {
          if (failUpload) {
            send({ message: "Synthetic storage outage" }, 503);
            return;
          }
          if (objects.has(key)) {
            send({ message: "Duplicate" }, 409);
            return;
          }
          objects.set(key, bytes);
          send({ Key: key });
          return;
        }
        const photo = objects.get(key);
        if (!photo) {
          send({ message: "Missing" }, 404);
          return;
        }
        res.writeHead(200, { "content-type": "image/jpeg" }).end(photo);
        return;
      }
      await db.query("savepoint request");
      try {
        await db.query(
          owner
            ? "set local role authenticated"
            : "set local role service_role",
        );
        await db.query("select set_config('request.jwt.claims',$1,true)", [
          JSON.stringify({
            sub: owner,
            session_id: owner === other ? staffSession : null,
            aal: "aal2",
            role: owner ? "authenticated" : "service_role",
          }),
        ]);
        let result;
        if (path === "/rest/v1/rpc/shop_demand") {
          result = (await db.query("select * from public.shop_demand()")).rows;
        } else if (path === "/rest/v1/rpc/admin_session") {
          result = (await db.query("select public.admin_session() value"))
            .rows[0].value;
        } else if (path === "/rest/v1/rpc/save_shop_catalog") {
          const p = JSON.parse(bytes);
          result = (
            await db.query(
              "select public.save_shop_catalog($1,$2,$3,$4,$5,$6) value",
              [
                p.target,
                p.actor,
                p.actor_session,
                p.record_kind,
                p.expected,
                p.content,
              ],
            )
          ).rows[0].value;
        } else if (path === "/rest/v1/rpc/save_shop_record") {
          const p = JSON.parse(bytes);
          result = (
            await db.query(
              "select public.save_shop_record($1,$2,$3,$4,$5,$6) value",
              [
                p.target,
                p.owner,
                p.child,
                p.record_kind,
                p.expected,
                p.content,
              ],
            )
          ).rows[0].value;
        } else if (path === "/rest/v1/rpc/save_family_entry") {
          const p = JSON.parse(bytes);
          result = (
            await db.query(
              "select public.save_family_entry($1,$2,$3,$4,$5) value",
              [p.target, p.child, p.entry_kind, p.expected, p.content],
            )
          ).rows[0].value;
        } else {
          const table = path.split("/").at(-1);
          assert(
            [
              "consents",
              "children",
              "family_entries",
              "child_profile_notebooks",
              "shop_records",
              "shop_catalog",
              "shop_discovery_runs",
            ].includes(table),
          );
          const values = [],
            where = [];
          for (const [key, value] of u.searchParams) {
            if (["select", "order", "limit", "offset"].includes(key)) continue;
            assert(
              [
                "id",
                "user_id",
                "child_id",
                "kind",
                "section",
                "revision",
              ].includes(key),
            );
            if (key === "kind" && value === "in.(feedback,preferences)") {
              where.push("kind in ('feedback','preferences')");
              continue;
            }
            assert(value.startsWith("eq."));
            values.push(value.slice(3));
            where.push(`${key}=$${values.length}`);
          }
          const condition = where.length ? " where " + where.join(" and ") : "";
          if (req.method === "DELETE") {
            assert.equal(table, "shop_records");
            assert.equal(token, "synthetic-service-only");
            result = (
              await db.query(
                `delete from public.shop_records${condition} returning id`,
                values,
              )
            ).rows;
          } else if (req.method === "PATCH") {
            assert.equal(table, "family_entries");
            assert.equal(token, "synthetic-service-only");
            result = (
              await db.query(
                `update public.family_entries set photo_ready=true${condition} returning *`,
                values,
              )
            ).rows;
          } else
            result = (
              await db.query(
                `select * from public.${table}${condition}`,
                values,
              )
            ).rows;
          if (
            (req.headers.accept ?? "").includes(
              "application/vnd.pgrst.object+json",
            )
          )
            result = result[0] ?? null;
        }
        await db.query("reset role");
        await db.query("release savepoint request");
        send(result);
      } catch (e) {
        await db.query("rollback to savepoint request");
        await db.query("reset role");
        send(
          { code: e.code ?? "TEST_ERROR", message: e.message },
          e.code === "40001" ? 409 : 400,
        );
      }
    })
    .catch((e) => {
      res.writeHead(500).end(String(e));
    });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
process.env.NEXT_PUBLIC_SUPABASE_URL = base;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-only";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-only";
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  assert.equal(
    new URL(input instanceof Request ? input.url : String(input)).origin,
    base,
    "No external test traffic",
  );
  return originalFetch(input, init);
};
const { RequestCookies } =
  await import("next/dist/compiled/@edge-runtime/cookies/index.js");
const { workAsyncStorage } =
  await import("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } =
  await import("next/dist/server/app-render/work-unit-async-storage.external.js");
const plan = await import("../src/app/api/family-plan/route.ts"),
  photo = await import("../src/app/api/family-photos/route.ts"),
  image = await import("../src/app/api/family-photos/[id]/route.ts");
function cookie(owner) {
  const claims = {
    sub: owner,
    session_id: owner === other ? staffSession : null,
    aal: "aal2",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const access_token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.c3ludGhldGlj`;
  return (
    "sb-127-auth-token=base64-" +
    Buffer.from(
      JSON.stringify({
        access_token,
        refresh_token: "synthetic",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: claims.exp,
        user: {
          id: owner,
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
        },
      }),
    ).toString("base64url")
  );
}
async function run(
  module,
  method,
  payload,
  status = 200,
  owner = uid,
  id = "unused",
) {
  const cookies = new RequestCookies(
    new Headers(owner ? { cookie: cookie(owner) } : {}),
  );
  const req = new Request("http://localhost/api/test", {
    method,
    headers: { origin: "http://localhost" },
    ...(payload
      ? {
          body: payload instanceof FormData ? payload : JSON.stringify(payload),
        }
      : {}),
  });
  const response = await workAsyncStorage.run(
    { route: "/api/test", isStaticGeneration: false },
    () =>
      workUnitAsyncStorage.run(
        {
          type: "request",
          phase: "action",
          cookies,
          userspaceMutableCookies: cookies,
        },
        () => module[method](req, { params: Promise.resolve({ id }) }),
      ),
  );
  assert.equal(
    response.status,
    status,
    `${method}: ${await response.clone().text()}`,
  );
  return response;
}
try {
  const shop = await import("../src/app/api/shop/route.ts");
  const shopAdmin = await import("../src/app/api/admin/shop/route.ts");
  const { emptyPreferences, emptyProduct } = await import("../src/lib/shop.ts");
  await run(shop, "GET", null, 401, null);
  await run(shopAdmin, "GET", null, 403);
  await run(shopAdmin, "GET", null, 200, other);
  await run(
    shopAdmin,
    "PUT",
    {
      id: crypto.randomUUID(),
      revision: 0,
      kind: "recipe",
      value: {
        title: "Synthetic recipe",
        category: "books",
        interest: "books",
        ageBand: "school",
        style: "any",
        budget: 0,
        enabled: false,
      },
    },
    200,
    other,
  );
  const catalogId = crypto.randomUUID();
  await db.query(
    "insert into public.shop_catalog(id,kind,value) values($1,$2,$3)",
    [
      catalogId,
      "product",
      {
        ...emptyProduct,
        asin: "B012345678",
        title: "Synthetic editorial title",
        reason: "Original review reasoning",
        safety: "Supervision and safety advice",
        evidence: "Private evidence must never leak",
        state: "published",
        reviewUntil: "2099-01-01",
      },
    ],
  );
  const shopPayload = {
    id: crypto.randomUUID(),
    childId: child,
    revision: 0,
    kind: "preferences",
    value: { ...emptyPreferences, budget: 1500 },
  };
  const shopSaved = (await (await run(shop, "PUT", shopPayload)).json()).record;
  assert.equal(shopSaved.revision, 1);
  assert.equal(
    (await (await run(shop, "PUT", shopPayload)).json()).record.revision,
    1,
  );
  await run(
    shop,
    "PUT",
    { ...shopPayload, value: { ...shopPayload.value, budget: 2000 } },
    409,
  );
  await run(
    shop,
    "PUT",
    { ...shopSaved, value: { ...shopSaved.value, budget: -1 } },
    400,
  );
  await run(shop, "PUT", shopPayload, 400, other);
  const shopGet = await (await run(shop, "GET")).json();
  assert.equal(shopGet.records.length, 1);
  assert.equal(shopGet.products.length, 1);
  assert.equal(shopGet.products[0].evidence, undefined);
  assert.equal(shopGet.products[0].url, "https://www.amazon.in/dp/B012345678");
  assert.equal(
    (await (await run(shop, "GET", null, 200, other)).json()).records.length,
    0,
  );
  const feedback = {
    id: crypto.randomUUID(),
    childId: child,
    revision: 0,
    kind: "feedback",
    value: {
      productId: catalogId,
      choice: "not_now",
      reason: "Later please",
      until: null,
    },
  };
  const feedbackSaved = (await (await run(shop, "PUT", feedback)).json())
    .record;
  assert(feedbackSaved.value.until > new Date().toISOString().slice(0, 10));
  await run(shop, "DELETE", feedbackSaved, 409, other);
  await run(shop, "DELETE", feedbackSaved);
  await db.query(
    "update public.shop_catalog set value=jsonb_set(value,'{state}','\"paused\"') where id=$1",
    [catalogId],
  );
  assert.equal((await (await run(shop, "GET")).json()).products.length, 0);
  console.log(
    "PASS: actual shop routes preserve revisions, validate choices, isolate families, redact evidence, pause products and undo feedback.",
  );
  const { blankValue } = await import("../src/lib/family-planner.ts");
  let e = {
    id: crypto.randomUUID(),
    child_id: child,
    kind: "goal",
    revision: 0,
    value: {
      ...blankValue(),
      title: "Synthetic education goal",
      date: "2099-01-01",
      cost: 120000,
    },
  };
  await run(plan, "GET", null, 401, null);
  e = (await (await run(plan, "PUT", e)).json()).entry;
  assert.equal(e.revision, 1);
  await run(
    plan,
    "PUT",
    { ...e, revision: 0, value: { ...e.value, cost: 130000 } },
    400,
  ); // strict schema rejects returned transport fields
  const clean = ({ id, child_id, kind, revision, value }) => ({
    id,
    child_id,
    kind,
    revision,
    value,
  });
  await run(
    plan,
    "PUT",
    { ...clean(e), revision: 0, value: { ...e.value, cost: 130000 } },
    409,
  );
  assert.equal((await (await run(plan, "GET")).json()).entries.length, 1);
  assert.equal(
    (await (await run(plan, "GET", null, 200, other)).json()).entries.length,
    0,
  );
  await run(
    plan,
    "PUT",
    { ...clean(e), value: { ...e.value, saved: 12000 } },
    400,
    other,
  );
  const png = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#b56545" },
  })
    .png()
    .toBuffer();
  const memory = {
    id: crypto.randomUUID(),
    child_id: child,
    kind: "memory",
    revision: 0,
    value: { ...blankValue(), title: "Synthetic photo", date: "2026-01-01" },
  };
  const form = () => {
    const f = new FormData();
    f.set("entry", JSON.stringify(memory));
    f.set("photo", new File([png], "synthetic.png", { type: "image/png" }));
    return f;
  };
  failUpload = true;
  await run(photo, "POST", form(), 503);
  failUpload = false;
  const saved = (await (await run(photo, "POST", form())).json()).entry;
  assert(saved.photo_ready);
  const again = (await (await run(photo, "POST", form())).json()).entry;
  assert.equal(again.revision, 1);
  assert.equal(objects.size, 1);
  const response = await run(image, "GET", null, 200, uid, memory.id);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(
    (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format,
    "jpeg",
  );
  await run(image, "GET", null, 404, other, memory.id);
  const archived = (
    await (
      await run(plan, "PUT", {
        ...clean(saved),
        value: { ...saved.value, archived: true },
      })
    ).json()
  ).entry;
  assert(archived.value.archived);
  const restored = (
    await (
      await run(plan, "PUT", {
        ...clean(archived),
        value: { ...archived.value, archived: false },
      })
    ).json()
  ).entry;
  assert.equal(restored.revision, 3);
  await run(
    plan,
    "PUT",
    {
      ...clean(restored),
      value: { ...restored.value, photoHash: "b".repeat(64) },
    },
    400,
  );
  console.log(
    "PASS: actual family plan/photo handlers, SQL persistence, tenant isolation, stale revisions, upload outage/retry, immutable photos, private image delivery and archive/restore. Storage transport simulated; no production records.",
  );
} finally {
  globalThis.fetch = originalFetch;
  await queue;
  await new Promise((resolve) => server.close(resolve));
  await db.query("rollback");
  await db.end();
}
