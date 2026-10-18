// Real route handlers, Next request cookies and local SQL through the disposable adapter.
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-only";

const { RequestCookies } =
  await import("next/dist/compiled/@edge-runtime/cookies/index.js");
const uid = "e0000000-0000-4000-8000-000000000001",
  childId = "e0000000-0000-4000-8000-000000000012";
const claims = {
  sub: uid,
  role: "authenticated",
  aal: "aal1",
  exp: Math.floor(Date.now() / 1000) + 3600,
};
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.synthetic-only`;
const user = {
  id: uid,
  email: "parent@example.invalid",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
};
const session = {
  access_token: token,
  refresh_token: "synthetic-only",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: claims.exp,
  user,
};
const cookie =
  "sb-127-auth-token=base64-" +
  Buffer.from(JSON.stringify(session)).toString("base64url");
const notebook =
    await import("../.next/server/app/api/profile-notebook/route.js"),
  care = await import("../.next/server/app/api/care/route.js");
async function run(module, method, path, payload, status = 200, auth = true) {
  module = module.default ?? module;
  const cookies = new RequestCookies(new Headers(auth ? { cookie } : {}));
  const r = await module.workAsyncStorage.run(
    { route: "/api/profile-notebook", isStaticGeneration: false },
    () =>
      module.workUnitAsyncStorage.run(
        {
          type: "request",
          phase: "action",
          cookies,
          userspaceMutableCookies: cookies,
        },
        () =>
          module.routeModule.userland[method](
            new Request("http://127.0.0.1:3011" + path, {
              method,
              ...(payload ? { body: JSON.stringify(payload) } : {}),
            }),
          ),
      ),
  );
  const b = await r.json();
  assert.equal(r.status, status, JSON.stringify(b));
  if (status === 200)
    assert.equal(r.headers.get("cache-control"), "private, no-store");
  return b;
}
await run(notebook, "GET", "/api/profile-notebook", null, 401, false);
await run(notebook, "GET", "/api/profile-notebook", null, 400);
await run(
  notebook,
  "GET",
  "/api/profile-notebook?childId=e0000000-0000-4000-8000-000000000099",
  null,
  404,
);
let saved = await run(
  notebook,
  "GET",
  `/api/profile-notebook?childId=${childId}`,
);
const health = {
  id: crypto.randomUUID(),
  kind: "checkup",
  title: "Synthetic annual check-up",
  status: "done",
  date: "2026-01-01",
  nextDate: "2027-01-01",
  instructions: "",
  note: "Synthetic record",
  referenceId: null,
  archived: false,
};
const payload = {
  childId,
  section: "health",
  revision: saved.health.revision,
  value: { entries: [health] },
};
const receipt = await run(notebook, "PUT", "/api/profile-notebook", payload);
assert.deepEqual(
  await run(notebook, "PUT", "/api/profile-notebook", payload),
  receipt,
);
await run(
  notebook,
  "PUT",
  "/api/profile-notebook",
  { ...payload, value: { entries: [] } },
  409,
);
await run(
  notebook,
  "PUT",
  "/api/profile-notebook",
  {
    ...payload,
    revision: receipt.revision,
    value: { entries: [{ ...health, date: "2099-01-01" }] },
  },
  400,
);
await run(
  notebook,
  "PUT",
  "/api/profile-notebook",
  {
    ...payload,
    revision: receipt.revision,
    value: { entries: [{ ...health, date: "2010-01-01" }] },
  },
  400,
);
const interests = {
  childId,
  section: "interests",
  revision: saved.interests.revision,
  value: {
    selected: ["art", "music"],
    answers: [["art"], [], ["music"]],
    note: "Likes making up songs",
    band: "preschool",
    updatedOn: "2026-10-18",
  },
};
await run(notebook, "PUT", "/api/profile-notebook", interests);
saved = await run(notebook, "GET", `/api/profile-notebook?childId=${childId}`);
assert.equal(saved.health.value.entries[0].id, health.id);
assert.deepEqual(saved.interests.value.selected, ["art", "music"]);
const sibling = await run(
  notebook,
  "GET",
  "/api/profile-notebook?childId=e0000000-0000-4000-8000-000000000011",
);
assert.equal(sibling.health.value.entries.length, 0);
assert.equal(sibling.interests.value.selected.length, 0);
const entry = {
  id: crypto.randomUUID(),
  child_id: childId,
  revision: 0,
  measured_on: "2026-10-01",
  length_cm: 110,
  weight_kg: 19,
  head_cm: null,
  method: "standing",
  note: "Synthetic record",
  archived: false,
};
const growth = await run(care, "POST", "/api/care", entry);
assert.equal(growth.entry.length_cm, 110);
await run(care, "POST", "/api/care", { ...entry, revision: 1, length_cm: 111 });
await run(
  care,
  "POST",
  "/api/care",
  { ...entry, revision: 1, length_cm: 112 },
  409,
);
await fetch("http://127.0.0.1:54329/__test/mode", {
  method: "POST",
  body: JSON.stringify({ mode: "care-save-failure" }),
});
await run(
  notebook,
  "PUT",
  "/api/profile-notebook",
  { ...payload, revision: saved.health.revision, value: { entries: [] } },
  400,
);
await fetch("http://127.0.0.1:54329/__test/mode", {
  method: "POST",
  body: JSON.stringify({ mode: "ordinary" }),
});
assert.equal(
  (await run(notebook, "GET", `/api/profile-notebook?childId=${childId}`))
    .health.value.entries.length,
  1,
);
console.log(
  "PASS: actual profile/care handlers, auth, persisted reload, sibling isolation, retry/conflict, invalid dates, edit and save failure. Disposable adapter rolls back fixtures on exit.",
);
