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
await db.query("update public.children set memory_enabled=false where id=$1", [child]);
await db.query("insert into public.subscriptions(user_id,interval,status,razorpay_subscription_id,paid_through) values($1,'monthly','active','sub_handbook_fixture',now()+interval '1 day')", [uid]);
const staffSession = "f4000000-0000-4000-8001-000000000002";
await db.query(
  "insert into auth.sessions(id,user_id,aal) values($1,$2,'aal2')",
  [staffSession, other],
);
await db.query(
  "insert into public.admin_memberships(user_id,role) values($1,'operations')",
  [other],
);
const objects = new Map(), signRequests = [];
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
      // Batch link signing for the family export: service role only, private keys, one hour at most.
      if (path.startsWith("/storage/v1/object/sign/") && req.method === "POST") {
        assert.equal(token, "synthetic-service-only");
        const bucket = path.replace("/storage/v1/object/sign/", ""), p = JSON.parse(bytes);
        assert(["family-photos", "story-audio"].includes(bucket));
        assert(p.expiresIn > 0 && p.expiresIn <= 3600, "Export links last at most one hour");
        signRequests.push({ bucket, ...p });
        send(p.paths.map(key => ({ path: key, error: null, signedURL: `/object/sign/${bucket}/${key}?token=synthetic-${p.expiresIn}` })));
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
        if (path === "/rest/v1/rpc/reserve_guidance") {
          const p = JSON.parse(bytes);
          result = (await db.query("select public.reserve_guidance($1,$2,$3,$4,$5,$6,$7) value", [p.p_id, p.p_user, p.p_child, p.p_kind, p.p_fingerprint, p.p_refines, p.p_free])).rows[0].value;
        } else if (path === "/rest/v1/rpc/complete_guidance") {
          const p = JSON.parse(bytes);
          result = (await db.query("select public.complete_guidance($1,$2,$3) value", [p.p_id, p.p_lease, p.p_payload])).rows[0].value;
        } else if (path === "/rest/v1/rpc/save_child_care") {
          const p = JSON.parse(bytes);
          result = (await db.query("select public.save_child_care($1,$2,$3) value", [p.target, p.expected, p.content])).rows[0].value;
        } else if (path === "/rest/v1/rpc/shop_demand") {
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
              "child_care_state",
              "growth_entries",
              "decodes",
              "reports",
              "context_logs",
              "subscriptions",
              "guidance_requests",
              "safety_events",
              "shop_records",
              "shop_catalog",
              "shop_discovery_runs",
              // Family export reads, each filtered by user_id under RLS.
              "consent_events", "whatsapp_links", "memories", "stories", "expert_requests",
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
                "safety_category", "risk_level", "refines", "created_at", "lease", "state", "analysis->conversation->>mode", "analysis->conversation", "or", "share_language",
              ].includes(key),
            );
            // Usage excludes later messages in a chat or practice conversation.
            if (key === "or" && value === "(continuation_of.is.null,analysis->conversation.is.null)") { where.push("(continuation_of is null or analysis->'conversation' is null)"); continue; }
            if (key === "share_language" && value === "not.is.null") { where.push("share_language is not null"); continue; }
            if (key === "kind" && value === "in.(feedback,preferences)") {
              where.push("kind in ('feedback','preferences')");
              continue;
            }
            if (key === "safety_category" && value === "in.(none,parent_distress)") { where.push("safety_category in ('none','parent_distress')"); continue; }
            if (key === "risk_level" && value === "in.(none,low)") { where.push("risk_level in ('none','low')"); continue; }
            if (key === "refines" && value === "is.null") { where.push("refines is null"); continue; }
            if (key === "analysis->conversation" && value === "is.null") { where.push("analysis->'conversation' is null"); continue; }
            if (key === "created_at" && value.startsWith("gte.")) { values.push(value.slice(4)); where.push(`created_at >= $${values.length}`); continue; }
            assert(value.startsWith("eq."));
            values.push(value.slice(3));
            where.push(`${key === "analysis->conversation->>mode" ? "analysis->'conversation'->>'mode'" : key}=$${values.length}`);
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
          } else if (req.method === "POST") {
            assert.equal(table, "safety_events"); assert.equal(token, "synthetic-service-only");
            const p = JSON.parse(bytes);
            result = (await db.query("insert into public.safety_events(user_id,child_id,channel,level,category,reason) values($1,$2,$3,$4,$5,$6) returning *", [p.user_id,p.child_id,p.channel,p.level,p.category,p.reason])).rows;
          } else if (req.method === "PATCH" && table === "guidance_requests") {
            assert.equal(token, "synthetic-service-only");
            const p = JSON.parse(bytes);
            // Share language is recorded on the leased reservation; nothing else may be patched this way.
            if (Object.keys(p).join() === "share_language") result = (await db.query(`update public.guidance_requests set share_language=$${values.length + 1}${condition} returning *`, [...values, p.share_language])).rows;
            else result = (await db.query(`update public.guidance_requests set state=$${values.length + 1},updated_at=$${values.length + 2}${condition} returning *`, [...values,p.state,p.updated_at])).rows;
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
          if (req.method === "HEAD") res.setHeader("content-range", `0-${Math.max(0, result.length - 1)}/${result.length}`);
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
process.env.ANTHROPIC_API_KEY = "synthetic-provider-only";
process.env.ANTHROPIC_BASE_URL = base;
const originalFetch = globalThis.fetch;
let amazonFixture = false, amazonCalls = 0;
let aiCalls = 0, rejectAiReview = false, lastShareInput = "";
globalThis.fetch = (input, init) => {
  const target = String(input);
  if (target.startsWith(base + "/v1/messages")) {
    aiCalls++;
    const payload = JSON.parse(String(init.body)), props = payload.output_config.format.schema.properties;
    const text = props.level ? { level: "none", category: "none", reason: "Synthetic routine question" }
      : props.approved ? { approved: !rejectAiReview }
      // Caregiver share messages: record what the model was given so the card source can be checked.
      : props.message ? (lastShareInput = payload.messages[0].content, { message: "Synthetic caregiver message." })
      : { reply: "We can take this one step at a time. What would help today?", practiceReply: JSON.parse(payload.messages[0].content).mode === "rehearse" ? "But my friends can do it." : "", feedback: [] };
    assert(payload.system[0].cache_control);
    return Promise.resolve(Response.json({ id: "msg_fixture", type: "message", role: "assistant", model: "fixture", content: [{ type: "text", text: JSON.stringify(text) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 20, output_tokens: 30 } }));
  }
  if (amazonFixture && target === 'https://api.amazon.co.uk/auth/o2/token') return Promise.resolve(Response.json({ access_token: 'fixture-token', expires_in: 3600 }));
  if (amazonFixture && target === 'https://creatorsapi.amazon/catalog/v1/getItems') {
    amazonCalls++;
    const payload = JSON.parse(String(init.body));
    assert.deepEqual(payload.itemIds, ['B012345678']);
    assert.equal(payload.marketplace, 'www.amazon.in');
    return Promise.resolve(Response.json({ itemsResult: { items: [{ asin: 'B012345678', images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/fixture.jpg', width: 500, height: 500 } } }, offersV2: { listings: [{ price: { money: { amount: 799.5, currency: 'INR' } } }] } }] } }));
  }
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
  query = "",
) {
  const cookies = new RequestCookies(
    new Headers(owner ? { cookie: cookie(owner) } : {}),
  );
  const req = new Request("http://localhost/api/test" + query, {
    method,
    headers: { origin: "http://localhost" },
    ...(payload
      ? {
          body: payload instanceof FormData ? payload : JSON.stringify(payload),
        }
      : {}),
  });
  const response = await workAsyncStorage.run(
    { route: "/api/test", isStaticGeneration: false, afterContext: { after() { /* Job is durably queued; worker has separate tests. */ } } },
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
  const analyze = await import("../src/app/api/analyze/route.ts");
  const message = { childId: child, scenario: "Can we talk about a small parenting worry?", mode: "talk", requestId: crypto.randomUUID() };
  await run(analyze, "POST", message, 401, null);
  await run(analyze, "POST", message, 404, other);
  assert.equal(aiCalls, 0);
  const events = async payload => (await (await run(analyze, "POST", payload)).text()).trim().split("\n").map(line => JSON.parse(line));
  const first = await events(message), done = first.find(e => e.type === "done");
  assert(done, JSON.stringify(first));
  assert.equal(done.decode.analysis.conversation.mode, "talk");
  assert.equal(aiCalls, 3);
  assert(!first.some(e => e.type === "delta"));
  const repeated = await events(message);
  assert.equal(repeated.find(e => e.type === "done").decode.id, done.decode.id);
  assert.equal(aiCalls, 4, "Retry only rechecks safety, not generation");
  const continued = await events({ ...message, scenario: "Starting homework has been hard.", requestId: crypto.randomUUID(), continues: done.decode.id });
  assert(continued.some(e => e.type === "done"), JSON.stringify(continued));
  // The conversation used one Ask turn when it started; the continued message is included.
  const opening = (await db.query("select charged from public.guidance_requests where id=$1", [message.requestId])).rows[0];
  assert.equal(opening?.charged, true, "Starting a conversation uses one Ask turn");
  const continuedCharge = (await db.query("select g.charged from public.guidance_requests g join public.decodes d on d.id=g.result_id where d.id=$1", [continued.find(e => e.type === "done").decode.id])).rows[0];
  assert.equal(continuedCharge?.charged, false, "A continued conversation message is included in its starting turn");
  assert.equal(continued.find(e => e.type === "done").entitlement.used, done.entitlement.used, "Included messages do not change the parent's visible usage");
  await run(analyze, "POST", { ...message, requestId: crypto.randomUUID(), mode: "rehearse", continues: done.decode.id }, 422);
  const practice = await events({ ...message, scenario: "Help me practise a phone conversation.", requestId: crypto.randomUUID(), mode: "rehearse", cardId: "digital-phone" });
  assert(practice.some(e => e.type === "done" && e.decode.analysis.conversation.practiceReply));
  const practiceId = practice.find(e => e.type === "done").decode.id;
  const outcomes = await import("../src/app/api/decodes/[id]/outcome/route.ts");
  await run(outcomes, "POST", { outcome: "worked" }, 422, uid, practiceId);
  const share = await import("../src/app/api/share/route.ts");
  await run(share, "POST", { decodeId: practiceId, language: "English", audience: "partner" }, 422);
  // Free families get a monthly allowance of messages in other languages; the sixth is refused before any work.
  const freeChild = crypto.randomUUID();
  await db.query("insert into public.children(id,user_id,name,dob) values($1,$2,'Synthetic free child','2021-01-01')", [freeChild, other]);
  for (let i = 0; i < 5; i++) await db.query("insert into public.guidance_requests(id,user_id,child_id,kind,fingerprint,state,share_language) values($1,$2,$3,'share','fixture','complete','Hindi')", [crypto.randomUUID(), other, freeChild]);
  const beforeShare = aiCalls, sharesBefore = (await db.query("select count(*)::int n from public.guidance_requests where user_id=$1", [other])).rows[0].n;
  const refused = await run(share, "POST", { decodeId: practiceId, language: "Hindi", audience: "grandparent" }, 402, other);
  assert.equal((await refused.json()).code, "upgrade_required");
  assert.equal(aiCalls, beforeShare, "A refused share makes no model call");
  assert.equal((await db.query("select count(*)::int n from public.guidance_requests where user_id=$1", [other])).rows[0].n, sharesBefore, "A refused share reserves nothing");
  await db.query("update public.guidance_requests set created_at=now()-interval '31 days' where user_id=$1 and kind='share'", [other]);
  // Older than 30 days no longer counts; the request proceeds past the allowance check (and fails only on the other family's decode).
  await run(share, "POST", { decodeId: practiceId, language: "Hindi", audience: "grandparent" }, 404, other);
  // Handbook cards share through the same route, checks and allowance, for the parent's own selected child.
  const { HANDBOOK } = await import("../src/data/handbook.ts");
  const shopCard = HANDBOOK.find(c => c.id === "tantrum-shop");
  const beforeCard = aiCalls;
  const cardShare = await run(share, "POST", { cardId: "tantrum-shop", childId: child, language: "English", audience: "grandparent" });
  const cardBody = await cardShare.json();
  assert.equal(cardBody.message, "Synthetic caregiver message.");
  assert.equal(cardBody.translatedLeft, undefined, "English is not counted");
  assert(aiCalls > beforeCard);
  for (const part of [shopCard.title, shopCard.words, shopCard.avoid, shopCard.response]) assert(lastShareInput.includes(part), `card share input includes: ${part}`);
  assert.deepEqual((await db.query("select state, share_language from public.guidance_requests where user_id=$1 and child_id=$2 and kind='share'", [uid, child])).rows, [{ state: "complete", share_language: null }]);
  const callsBeforeRejected = aiCalls, rowsBeforeRejected = (await db.query("select count(*)::int n from public.guidance_requests where kind='share'")).rows[0].n;
  await run(share, "POST", { cardId: "tantrum-shop", childId: freeChild, language: "English", audience: "grandparent" }, 404);
  await run(share, "POST", { cardId: "not-a-real-card", childId: child, language: "English", audience: "grandparent" }, 400);
  await run(share, "POST", { cardId: "tantrum-shop", language: "English", audience: "grandparent" }, 400);
  await run(share, "POST", { decodeId: practiceId, cardId: "tantrum-shop", childId: child, language: "English", audience: "grandparent" }, 400);
  assert.equal(aiCalls, callsBeforeRejected, "Rejected card shares make no model call");
  assert.equal((await db.query("select count(*)::int n from public.guidance_requests where kind='share'")).rows[0].n, rowsBeforeRejected, "Rejected card shares reserve nothing");
  // A Free family's card share in Hindi uses the same 30-day allowance and records its language.
  const hindiCard = await run(share, "POST", { cardId: "bedtime-stalling", childId: freeChild, language: "Hindi", audience: "grandparent" }, 200, other);
  assert.equal((await hindiCard.json()).translatedLeft, 4);
  assert.equal((await db.query("select count(*)::int n from public.guidance_requests where user_id=$1 and child_id=$2 and kind='share' and state='complete' and share_language='Hindi' and created_at>now()-interval '1 day'", [other, freeChild])).rows[0].n, 1);
  console.log("PASS: Handbook card sharing in English and Hindi, cross-family child rejection, unknown card and ambiguous bodies refused before any model call or reservation. AI transport simulated.");
  const report = await import("../src/app/api/report/route.ts");
  const beforeReport = aiCalls;
  const reportResponse = await run(report, "POST", { childId: child }, 422);
  assert.equal((await reportResponse.json()).code, "not_enough_data");
  assert.equal(aiCalls, beforeReport, "Chats and rehearsal are not real weekly report observations");
  const count = (await db.query("select count(*)::int n from public.decodes where user_id=$1", [uid])).rows[0].n;
  rejectAiReview = true;
  const rejected = await events({ ...message, requestId: crypto.randomUUID(), scenario: "A different synthetic routine question." });
  rejectAiReview = false;
  assert(rejected.some(e => e.type === "error"));
  assert(!rejected.some(e => e.type === "done" || e.type === "delta"));
  assert.equal((await db.query("select count(*)::int n from public.decodes where user_id=$1", [uid])).rows[0].n, count);
  const callsBeforeEmergency = aiCalls;
  const emergency = await events({ ...message, requestId: crypto.randomUUID(), scenario: "My child is not breathing" });
  assert(emergency.some(e => e.type === "support"));
  assert.equal(aiCalls, callsBeforeEmergency);
  assert.equal((await db.query("select count(*)::int n from public.decodes where user_id=$1", [uid])).rows[0].n, count);
  console.log("PASS: actual chat/rehearsal route, SQL receipt replay, tenant isolation, explicit continuation, mode isolation, content rejection without charge, and emergency bypass. AI transport simulated.");
  const handbook = await import("../src/app/api/handbook/route.ts");
  const care = await import("../src/app/api/care/route.ts");
  const { DEFAULT_CARE } = await import("../src/lib/family-care.ts");
  const q = `?childId=${child}`;
  await run(handbook, "GET", null, 401, null, "unused", q);
  await run(handbook, "GET", null, 404, other, "unused", q);
  const before = await (await run(handbook, "GET", null, 200, uid, "unused", q)).json();
  assert.equal(before.revision, 0);
  const entry = { status: "saved", followUp: "2026-11-01", updatedOn: "2026-10-20" };
  const update = { childId: child, revision: 0, cardId: "money-goal", entry };
  await run(handbook, "PATCH", update, 404, other);
  const h = await (await run(handbook, "PATCH", update)).json();
  assert.deepEqual(h.progress["money-goal"], entry);
  await run(handbook, "PATCH", update, 409);
  await run(care, "PATCH", { childId: child, revision: h.revision, settings: { ...DEFAULT_CARE, favourites: ["existing-play"] } });
  const retained = await (await run(handbook, "GET", null, 200, uid, "unused", q)).json();
  assert.deepEqual(retained.progress["money-goal"], entry);
  await run(handbook, "PATCH", { ...update, revision: retained.revision, entry: null });
  const preserved = await (await run(care, "GET", null, 200, uid, "unused", q)).json();
  assert.deepEqual(preserved.settings.favourites, ["existing-play"]);
  console.log("PASS: actual Handbook/care handlers preserve each other's records, reject cross-parent and stale saves, and remove only chosen progress.");
  const shop = await import("../src/app/api/shop/route.ts");
  const media = await import("../src/app/api/shop/media/route.ts");
  await run(media, "GET", null, 401, null);
  await run(media, "GET", null, 400);
  await run(media, "GET", null, 404, uid, "unused", "?asins=B012345678");
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
  const mediaResult = await run(
    media,
    "GET",
    null,
    200,
    uid,
    "unused",
    "?asins=B012345678",
  );
  assert.equal(mediaResult.headers.get("cache-control"), "private, no-store");
  assert.equal((await mediaResult.json()).status, "not_configured");
  await run(
    media,
    "GET",
    null,
    400,
    uid,
    "unused",
    "?asins=" + Array(11).fill("B012345678").join(","),
  );
  amazonFixture = true;
  Object.assign(process.env, { AMAZON_CREATORS_CLIENT_ID: 'route-fixture', AMAZON_CREATORS_CLIENT_SECRET: 'fixture', AMAZON_ASSOCIATE_TAG: 'fixture-21', AMAZON_CREATORS_VERSION: '3.2' });
  const withMedia = await (await run(media, 'GET', null, 200, uid, 'unused', '?asins=B012345678')).json();
  assert.equal(withMedia.status, 'ready'); assert.equal(withMedia.items[0].price, 799.5); assert(withMedia.items[0].image);
  await run(media, 'GET', null, 200, uid, 'unused', '?asins=B012345678'); assert.equal(amazonCalls, 1);
  for (const key of ['AMAZON_CREATORS_CLIENT_ID', 'AMAZON_CREATORS_CLIENT_SECRET', 'AMAZON_ASSOCIATE_TAG', 'AMAZON_CREATORS_VERSION']) delete process.env[key];
  amazonFixture = false;
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
  await run(media, "GET", null, 404, uid, "unused", "?asins=B012345678");
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
  // The memory strip's thumbnail: made once, kept privately beside the photo, reused, never served to another family.
  const thumb = await run(image, "GET", null, 200, uid, memory.id, "?size=thumb");
  assert.equal(thumb.headers.get("cache-control"), "private, max-age=3600");
  const thumbMeta = await sharp(Buffer.from(await thumb.arrayBuffer())).metadata();
  assert.equal(thumbMeta.format, "webp");
  assert(thumbMeta.width <= 640);
  assert.equal(objects.size, 2, "The thumbnail is stored beside the photo");
  assert([...objects.keys()].some(k => k.includes(`${uid}/${memory.id}-`) && k.endsWith("-thumb.webp")), "Thumbnail stays in the owner's private folder");
  assert.equal((await sharp(Buffer.from(await (await run(image, "GET", null, 200, uid, memory.id, "?size=thumb")).arrayBuffer())).metadata()).format, "webp");
  assert.equal(objects.size, 2, "A stored thumbnail is reused");
  await run(image, "GET", null, 404, other, memory.id, "?size=thumb");
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
  // Family export: actual handler, parent RLS reads, private photo links, isolation and erasure inventory.
  const exporter = await import("../src/app/api/account/export/route.ts");
  const { FAMILY_EXPORT_TABLES, FAMILY_EXPORT_EXCLUSIONS } = await import("../src/lib/family-export.ts");
  const otherChild = "f4000000-0000-4000-8000-000000000012";
  await db.query("insert into public.children(id,user_id,name,dob) values($1,$2,'Other family child','2016-01-01')", [otherChild, other]);
  await db.query("insert into public.context_logs(child_id,user_id,content,log_type) values($1,$2,'Other family secret','observation')", [otherChild, other]);
  await db.query("insert into public.stories(child_id,user_id,theme,language,title,body,audio_path) values($1,$2,'courage','en','Synthetic story','Once upon a time',$3)", [child, uid, `${uid}/story.mp3`]);
  await db.query("insert into public.memories(child_id,user_id,kind,content,source,confidence,archived) values($1,$2,'fact','Archived synthetic memory','parent_said',1,true)", [child, uid]);
  await db.query("insert into public.expert_requests(user_id,child_id,concern,phone) values($1,$2,'Synthetic sleep concern','+910000000001')", [uid, child]);
  await db.query("insert into public.whatsapp_links(user_id,phone) values($1,'+910000000002')", [uid]);
  await run(exporter, "GET", null, 401, null);
  signRequests.length = 0;
  const download = await run(exporter, "GET", null);
  assert.match(download.headers.get("content-disposition"), /^attachment; filename="kahiye-family-records-\d{4}-\d{2}-\d{2}\.json"$/);
  assert.equal(download.headers.get("cache-control"), "no-store");
  const exportText = await download.text(), records = JSON.parse(exportText);
  assert.equal(records.children.length, 1);
  const exported = records.children[0];
  assert.equal(exported.profile.id, child);
  assert(exported.guidance.some(g => g.type === "chat") && exported.guidance.some(g => g.type === "practice"), "Chat and practice history is exported");
  assert(exported.memories.some(m => m.archived === true && m.content === "Archived synthetic memory"));
  assert.equal(exported.photo_timeline.find(p => p.id === memory.id).photo.url.includes(`/family-photos/${uid}/${memory.id}-`), true);
  assert.match(exported.stories[0].narration.url, /story-audio/);
  assert.equal(exported.expert_requests[0].concern, "Synthetic sleep concern");
  assert.equal(records.account.whatsapp.linked, true);
  assert.equal(records.account.subscription.status, "active");
  assert(exported.gifts_and_shop.length > 0 && exported.notes !== undefined);
  for (const leak of ["Other family", "sub_handbook_fixture", "photoHash", '"lease"', '"fingerprint"', '"attempts"', '"embedding"', '"model"', '"reviewer_note"'])
    assert(!exportText.includes(leak), `Export leaked ${leak}`);
  assert.deepEqual(signRequests.map(r => r.bucket).sort(), ["family-photos", "story-audio"]);
  assert(signRequests.every(r => r.paths.every(key => key.startsWith(`${uid}/`))), "Only the parent's own storage keys are signed");
  const erased = (await db.query(`with recursive fk as (select conrelid::regclass::text child, confrelid::regclass::text parent from pg_constraint where contype='f' and confdeltype='c'),
    reach(tbl) as (select child from fk where parent='auth.users' union select fk.child from fk join reach on fk.parent=reach.tbl)
    select tbl from reach where tbl not like 'auth.%'`)).rows.map(r => r.tbl.replace(/^public\./, ""));
  const uncovered = erased.filter(t => !FAMILY_EXPORT_TABLES.includes(t) && !(t in FAMILY_EXPORT_EXCLUSIONS));
  assert.deepEqual(uncovered, [], `Erased tables missing from the export inventory: ${uncovered.join(", ")}`);
  console.log(`PASS: family export handler, parent-only reads, chat/practice history, archived memories, one-hour photo and narration links, family isolation and erasure inventory (${erased.length} erased tables covered).`);
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
