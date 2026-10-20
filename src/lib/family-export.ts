import type { SupabaseClient } from '@supabase/supabase-js';
import { photoPath } from './family-photo';

// Portability record for a parent's own family data. Every table that account erasure
// removes (auth.users ON DELETE CASCADE, directly or through children/decodes/requests)
// must appear in exactly one of the two lists below; tests/family-export.test.ts and the
// disposable-database route test fail otherwise. See docs/FAMILY-EXPORT.md.
export const FAMILY_EXPORT_TABLES = [
  'children', 'consents', 'consent_events', 'subscriptions', 'whatsapp_links',
  'context_logs', 'decodes', 'memories', 'stories', 'reports', 'growth_entries',
  'child_care_state', 'child_profile_notebooks', 'family_entries', 'shop_records', 'expert_requests',
  'family_checkins', 'sponsored_access',
] as const;

export const FAMILY_EXPORT_EXCLUSIONS: Readonly<Record<string, string>> = {
  guidance_requests: 'Delivery bookkeeping: leases, request fingerprints and attempt counters. The guidance itself is exported.',
  guidance_jobs: 'Background worker queue: leases and attempt counters.',
  safety_events: 'Internal safety review queue with reviewer notes, which parents cannot read. The safety level and category shown with each piece of guidance are exported on that guidance.',
  billing_event_receipts: 'Payment provider event and receipt IDs. Subscription status, plan and period are exported.',
  billing_checkout_attempts: 'Short-lived checkout reservation tokens.',
  whatsapp_jobs: 'WhatsApp delivery queue: provider message IDs, leases and attempts. Guidance asked on WhatsApp is exported with channel "whatsapp".',
  whatsapp_link_codes: 'One-time linking codes. A security secret, not a family record.',
  consultation_events: 'Team-only consultation notes and actions. Your own request and its status are exported.',
  consultation_alerts: 'Team notification queue: provider IDs and attempt counters.',
  admin_memberships: 'Kahiye team access, not a family record.',
  sponsor_code_attempts: 'Security counter of refused sponsor-code attempts, used only to slow down guessing. Sponsorships you redeemed are exported.',
};

/** Private storage objects removed by erasure. Bytes are never inlined; each gets a short-lived link. */
export const FAMILY_EXPORT_FILES = { photos: 'family-photos', narration: 'story-audio' } as const;
export const EXPORT_LINK_SECONDS = 60 * 60;
const PAGE = 1000, MAX_ROWS = 50_000;
// Stable, unique ordering so paged reads never skip or repeat a row.
const ORDER: Partial<Record<(typeof FAMILY_EXPORT_TABLES)[number], readonly string[]>> = {
  consents: ['user_id'], subscriptions: ['user_id'], whatsapp_links: ['user_id'],
  child_care_state: ['child_id'], child_profile_notebooks: ['child_id', 'section'],
};

export type LinkSigner = (bucket: string, paths: string[], seconds: number) => Promise<Map<string, string>>;
type Row = Record<string, unknown>;
type ExportUser = { id: string; email?: string | null };
export class ExportUnavailable extends Error {}

export const exportFilename = (now = new Date()) => `kahiye-family-records-${now.toISOString().slice(0, 10)}.json`;

const pick = (row: Row, keys: readonly string[]): Row => Object.fromEntries(keys.filter(k => k in row).map(k => [k, row[k] ?? null]));
const obj = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {});
const str = (v: unknown) => (typeof v === 'string' ? v : null);

const CHILD = ['id', 'name', 'dob', 'due_date', 'gender', 'puberty_guide', 'curiosity', 'persistence', 'sensitivity', 'sociability', 'emotional_intensity', 'flexibility', 'focus_areas', 'household', 'home_languages', 'profile_notes', 'intake_band', 'intake_at', 'intake_answered', 'memory_enabled', 'created_at'];
const NOTE = ['id', 'log_type', 'content', 'created_at'];
const DECODE = ['id', 'channel', 'scenario', 'analysis', 'risk_level', 'safety_category', 'outcome', 'outcome_at', 'refines', 'continuation_of', 'created_at'];
const MEMORY = ['id', 'kind', 'content', 'source', 'confidence', 'sensitive', 'archived', 'decode_id', 'created_at', 'confirmed_at', 'edited_at', 'expires_at'];
const STORY = ['id', 'theme', 'language', 'title', 'body', 'moral', 'created_at'];
const REPORT = ['id', 'period_start', 'period_end', 'report', 'created_at'];
const CHECKIN = ['id', 'hard_evenings', 'confidence', 'created_at'];
const GROWTH = ['id', 'measured_on', 'weight_kg', 'length_cm', 'head_cm', 'method', 'note', 'archived', 'created_at', 'updated_at'];
const REQUEST = ['id', 'concern', 'phone', 'preferred_language', 'preferred_time', 'status', 'source', 'scheduled_at', 'duration_minutes', 'created_at', 'updated_at'];
const SUBSCRIPTION = ['plan', 'interval', 'status', 'current_period_end', 'paid_through', 'cancel_at_period_end', 'updated_at'];
const SPONSORSHIP = ['organisation_name', 'code', 'redeemed_at', 'access_until'];

/** Reads every page as the signed-in parent. RLS limits rows to their own; the user_id filter is belt and braces. */
async function owned(supabase: SupabaseClient, table: (typeof FAMILY_EXPORT_TABLES)[number], userId: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    for (const column of ORDER[table] ?? ['id']) query = query.order(column);
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error || !data) throw new ExportUnavailable(table);
    rows.push(...(data as Row[]));
    if (data.length < PAGE) return rows;
  }
  throw new ExportUnavailable(`${table}: too many rows`);
}

export async function collectFamilyExport(supabase: SupabaseClient, sign: LinkSigner, user: ExportUser, now = new Date()) {
  const [children, consents, consentEvents, subscriptions, whatsapp, notes, decodes, memories, stories, reports, growth, care, notebooks, entries, shop, requests, checkins, sponsorships] =
    await Promise.all(FAMILY_EXPORT_TABLES.map(table => owned(supabase, table, user.id)));
  // Storage keys are always rebuilt or checked against the parent's own prefix before signing.
  const mine = (path: string | null) => (path && path.startsWith(`${user.id}/`) && !path.includes('..') ? path : null);
  const photoKeys = new Map<string, string>(), audioKeys = new Map<string, string>();
  for (const e of entries) {
    const hash = str(obj(e.value).photoHash);
    if (e.kind === 'memory' && e.photo_ready === true && hash && /^[a-f0-9]{64}$/.test(hash)) photoKeys.set(String(e.id), photoPath(user.id, String(e.id), hash));
  }
  for (const s of stories) { const path = mine(str(s.audio_path)); if (path) audioKeys.set(String(s.id), path); }
  const signed = async (bucket: string, keys: Map<string, string>) => {
    if (!keys.size) return new Map<string, string>();
    try { return await sign(bucket, [...keys.values()], EXPORT_LINK_SECONDS); } catch { return new Map<string, string>(); }
  };
  const [photoLinks, audioLinks] = await Promise.all([signed(FAMILY_EXPORT_FILES.photos, photoKeys), signed(FAMILY_EXPORT_FILES.narration, audioKeys)]);
  const linksExpireAt = new Date(now.getTime() + EXPORT_LINK_SECONDS * 1000).toISOString();
  const file = (keys: Map<string, string>, links: Map<string, string>, id: string, missing: string) => {
    const key = keys.get(id);
    if (!key) return null;
    const url = links.get(key);
    return url ? { url, expires_at: linksExpireAt } : { url: null, note: missing };
  };

  type Link = ReturnType<typeof file>;
  const entry = (e: Row): Row & { photo?: Link } => {
    const value = { ...obj(e.value) };
    delete value.photoHash; // Internal content fingerprint for immutable uploads.
    return { id: e.id, kind: e.kind, ...value, updated_at: e.updated_at ?? null,
      ...(e.kind === 'memory' ? { photo: e.photo_ready === true ? file(photoKeys, photoLinks, String(e.id), 'We could not create a link for this photo. Open the photo timeline in Kahiye to view it.') : null } : {}) };
  };
  const guidance = (d: Row) => {
    const mode = str(obj(obj(d.analysis).conversation).mode);
    return { type: mode === 'talk' ? 'chat' : mode === 'rehearse' ? 'practice' : 'guidance', ...pick(d, DECODE) };
  };
  const story = (s: Row): Row & { narration: Link } => ({ ...pick(s, STORY), narration: file(audioKeys, audioLinks, String(s.id), 'We could not create a link for this narration. Open the story in Kahiye to play it.') });
  const byChild = (rows: Row[], id: unknown) => rows.filter(r => r.child_id === id);
  const plan = (rows: Row[]) => sorted(rows.map(entry), 'date');
  const sorted = <T extends Row>(rows: T[], key: string) => [...rows].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')));

  const sub = subscriptions[0];
  const link = whatsapp[0];
  const childIds = new Set(children.map(c => c.id));
  return {
    format: 'kahiye-family-records', version: 1, exported_at: now.toISOString(),
    about: {
      contents: 'Everything Kahiye keeps for your family, organised by child. Dates and times are in UTC.',
      links: `Photo and narration links are private and stop working at ${linksExpireAt}, one hour after this file was made. Download what you want to keep before then, or export again for fresh links.`,
      not_included: FAMILY_EXPORT_EXCLUSIONS,
    },
    account: {
      email: user.email ?? null,
      consent: { current: consents[0] ? pick(consents[0], ['policy_version', 'agreed_at']) : null, history: sorted(consentEvents, 'occurred_at').map(c => pick(c, ['policy_version', 'action', 'occurred_at'])) },
      subscription: sub ? pick(sub, SUBSCRIPTION) : null,
      // Kahiye Plus paid for by a school, employer, clinic or community partner.
      sponsorships: sorted(sponsorships, 'redeemed_at').map(s => pick(s, SPONSORSHIP)),
      whatsapp: link ? { linked: true, phone: link.phone ?? null, linked_at: link.linked_at ?? null } : { linked: false },
    },
    children: sorted(children, 'created_at').map(c => {
      const state = obj(care.find(s => s.child_id === c.id)?.value);
      const { handbook = {}, ...settings } = state;
      const notebook = (section: string) => obj(notebooks.find(n => n.child_id === c.id && n.section === section)?.value);
      return {
        profile: pick(c, CHILD),
        care_settings: settings,
        handbook_progress: handbook,
        health_notebook: notebook('health'),
        interests: notebook('interests'),
        growth: sorted(byChild(growth, c.id), 'measured_on').map(g => pick(g, GROWTH)),
        checkins: sorted(byChild(checkins, c.id), 'created_at').map(k => pick(k, CHECKIN)),
        notes: sorted(byChild(notes, c.id), 'created_at').map(n => pick(n, NOTE)),
        guidance: sorted(byChild(decodes, c.id), 'created_at').map(guidance),
        memories: sorted(byChild(memories, c.id), 'created_at').map(m => pick(m, MEMORY)),
        stories: sorted(byChild(stories, c.id), 'created_at').map(story),
        reports: sorted(byChild(reports, c.id), 'period_start').map(r => pick(r, REPORT)),
        family_plan: plan(byChild(entries, c.id).filter(e => e.kind !== 'memory')),
        photo_timeline: plan(byChild(entries, c.id).filter(e => e.kind === 'memory')),
        gifts_and_shop: sorted(byChild(shop, c.id), 'id').map(s => ({ id: s.id, kind: s.kind, ...obj(s.value), updated_at: s.updated_at ?? null })),
        expert_requests: sorted(byChild(requests, c.id), 'created_at').map(r => pick(r, REQUEST)),
      };
    }),
    family: {
      // Shared dates and goals not tied to one child, and requests whose child profile was removed.
      family_plan: plan(entries.filter(e => !e.child_id || !childIds.has(e.child_id))),
      expert_requests: sorted(requests.filter(r => !r.child_id || !childIds.has(r.child_id)), 'created_at').map(r => pick(r, REQUEST)),
    },
  };
}
