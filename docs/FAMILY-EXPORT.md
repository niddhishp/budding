# Family records export

Implementation record: 20 October 2026. Branch `claude/family-export`; not pushed, merged or deployed. No migration and no schema or data changes.

Kahiye already let a parent erase their account. Before this, it could not hand their records back. This change backs the deck's "Family records stay portable" claim and the portability expectation under India's DPDP Act.

## What the parent sees

`/app/privacy` has a **Download my family's records** button above **Delete account and data**. One sentence explains what the file contains and that photo links expire after one hour. While the file is being prepared the button reads "Preparing your download…" and the other buttons are disabled. Errors appear in the page's existing status line.

## Endpoint

`GET /api/account/export` returns `kahiye-family-records-YYYY-MM-DD.json` (UTC date) as an attachment, with `Cache-Control: no-store` and `nosniff`.

- **Sign-in only, no consent check.** This follows account deletion, not the ordinary parent routes. `/app/privacy` must keep working after a parent withdraws consent. Getting your own data back is not processing that consent covers, so requiring it would block a parent who has withdrawn.
- **Table reads run as the parent.** Every read uses the parent's own Supabase client under RLS, adds an explicit `user_id` filter, and pages through results 1,000 rows at a time with a unique sort order. One table is capped at 50,000 rows; past that the export fails rather than truncating.
- **The service role only signs storage links.** It never reads a table. It signs `family-photos` and `story-audio` keys, and only after each key is rebuilt from, or checked against, the parent's own `user_id/` prefix. Both buckets are private.
- **If any table read fails, nothing is returned.** The parent gets a 503 with "We could not gather all your records just now. Nothing was changed. Please try again." A partial file could be mistaken for a complete one.
- **A failed link signing does not fail the export.** The photo or narration gets `url: null` and a plain note pointing to the timeline or story in the app.

## File layout

```
format, version, exported_at
about       – contents, link expiry time, not_included (the exclusion list with reasons)
account     – email, consent {current, history}, subscription, whatsapp {linked, phone, linked_at}
children[]  – profile, care_settings, handbook_progress, health_notebook, interests, growth,
              notes, guidance (type: guidance | chat | practice), memories (incl. archived),
              stories (+ narration link), reports, family_plan, photo_timeline (+ photo link),
              gifts_and_shop, expert_requests
family      – family_plan entries not tied to a child, and expert requests whose child was removed
```

## Inventory

The source of truth is what erasure removes. `POST /api/account/delete` deletes the auth user, and every table reachable from `auth.users` through `ON DELETE CASCADE` goes with it, either directly or through `children`, `decodes` or `expert_requests`. There is no separate SQL erase function. Erasure also removes two storage prefixes, `family-photos/<uid>/` and `story-audio/<uid>/`.

The lists live in `src/lib/family-export.ts`: `FAMILY_EXPORT_TABLES`, `FAMILY_EXPORT_EXCLUSIONS` and `FAMILY_EXPORT_FILES`.

### Exported (16 tables + 2 storage buckets)

| Table | Fields left out |
|---|---|
| children | `user_id` |
| consents, consent_events | `user_id`, event `id` |
| subscriptions | `razorpay_subscription_id`, `event_created_at`, `event_priority` |
| whatsapp_links | `last_child_id` (routing state) |
| context_logs (notes) | `embedding`, `user_id` |
| decodes (guidance, chat, practice) | `model` (product copy never names the AI vendor) |
| memories (all, with `archived`) | `revision` |
| stories | `model`, `audio_path` (replaced by a signed narration link) |
| reports | `model` |
| growth_entries | `revision` |
| child_care_state | `revision`; `value.handbook` is split out as `handbook_progress` |
| child_profile_notebooks (health, interests) | `revision` |
| family_entries (dates, savings goals, photo memories) | `revision`, `photo_ready`, `value.photoHash` |
| shop_records (preferences, gifts, feedback) | `revision` |
| expert_requests | `expert_id`, `version`, `next_follow_up_at` (team scheduling) |
| storage `family-photos`, `story-audio` | bytes are not inlined; each file gets a signed link that lasts one hour |

### Excluded (10 tables), with the reason carried in the file

| Table | Why |
|---|---|
| guidance_requests | Leases, request fingerprints, attempt counters. The guidance itself is exported. |
| guidance_jobs | Worker queue: leases, attempts. |
| safety_events | Service-only review queue with reviewer notes, which the parent cannot read. The safety level and category shown with each piece of guidance (`decodes.risk_level` / `safety_category`) are exported on that guidance. |
| billing_event_receipts | Provider event and receipt IDs. |
| billing_checkout_attempts | Short-lived checkout tokens. |
| whatsapp_jobs | Delivery queue: provider message IDs, leases. WhatsApp guidance is exported with `channel: "whatsapp"`. |
| whatsapp_link_codes | One-time linking secrets. |
| consultation_events | Team-only notes and actions. |
| consultation_alerts | Team notification queue. |
| admin_memberships | Kahiye team access, not a family record. |

Also outside the export: Supabase-managed `auth.*` rows (only the account email is exported), and rows that erasure does not delete. These are `admin_audit_events`, `experts`, `week_guides` and `consultation_events.actor_id`, which are set to null, and `family_photo_cleanup`, a service queue of storage keys.

### Guard

- `tests/family-export.test.ts` reads the same migrations the database suite applies (`schema.sql` + numbered files, without `ALL_IN_ONE.sql`). It strips function bodies, builds the `ON DELETE CASCADE` graph from `auth.users` and fails if any reachable table is neither exported nor excluded. It also fails on overlap or on stale entries.
- `scripts/test-family-plan-routes.mjs` runs the same check against the live disposable schema through `pg_constraint`. That covers anything the text parser could miss. At the time of writing, 26 erased public tables were covered.

A new table that erasure removes now forces a deliberate export decision.

## Rate limiting

The app has no per-user rate-limit mechanism to reuse. The only throttling is Supabase Auth's own rate limits and quotas such as guidance allowances, so none was added. Each export costs a bounded set of reads: 16 paged queries plus at most two signing calls. If abuse appears, add a per-user limit, for example a small `export_requests` table checked in a private function, in a new migration (next free number after 027).

## Verification (20 October 2026)

- `npm run check`: lint, types, 69 unit tests and 44 server tests pass (113, up from 109). New tests are the inventory guard, the filename date, collection/redaction/organisation by child, own-prefix-only signing, a link outage giving a note, and a table outage failing the export.
- Disposable database `pgvector/pgvector:pg17` was bootstrapped from the repository migrations, and the full security suite passed.
- `npx tsx --conditions=react-server scripts/test-family-plan-routes.mjs` passes, including the new export block. It checks:
  - the real handler: 401 when signed out, and the attachment filename and no-store headers
  - reads under RLS as the parent
  - chat and practice history, and archived memories
  - signed photo and narration links of at most one hour, service-role only, own prefix only
  - another family's child and notes absent
  - no leases, fingerprints, attempts, embeddings, model IDs, provider subscription IDs or reviewer notes in the output
  - the `pg_constraint` inventory check
- The fake PostgREST layer was extended narrowly: five table names (all read with `user_id=eq.` only) and a service-role-only batch signing endpoint that asserts `expiresIn <= 3600`.
- `npm run build` passes.
- No production requests, Supabase or Vercel calls, or credentials were used.

## Limits

- Signed links are bearer URLs for one hour. Anyone holding the file in that hour can open the photos. The page copy and `about.links` say so in plain words.
- Story narration audio is linked the same way. Text is always included.
- The whole file is built in memory, which is fine at current family sizes. Very large accounts (above 50,000 rows in one table) fail closed with the retry message. They would need a streamed or background export.
- The format is Kahiye's own JSON (`format: "kahiye-family-records", version: 1`). It does not yet use an interchange standard.
