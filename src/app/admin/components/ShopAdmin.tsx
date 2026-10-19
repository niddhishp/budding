"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  catalogSchema,
  categories,
  styles,
  materials,
  emptyProduct,
  discoveryQuery,
  amazonLink,
  type CatalogRecord,
} from "@/lib/shop";
import { fieldClass, buttonClass } from "@/components/care/CareFrame";
import { Choices } from "@/components/care/ShopPreferences";
type AdminData = {
  records: CatalogRecord[];
  demand: {
    age_band: "baby" | "preschool" | "school" | "teen";
    interest: (typeof categories)[number];
    families: number;
  }[];
  runs: {
    recipe_id: string;
    attempted_at: string;
    finished_at: string | null;
    added: number;
    error: string | null;
  }[];
  setup: {
    amazon: boolean;
    links: boolean;
    automatic: boolean;
    finance: boolean;
  };
};
const labels = {
  product: "Products",
  recipe: "Discovery recipes",
  finance: "Financial partners",
  settlement: "Referral settlements",
};
function newRecord(kind: CatalogRecord["kind"]): CatalogRecord {
  const base = { id: crypto.randomUUID(), revision: 0 };
  switch (kind) {
    case "product":
      return { ...base, kind, value: { ...emptyProduct } };
    case "recipe":
      return {
        ...base,
        kind,
        value: {
          title: "",
          category: "books",
          ageBand: "school",
          interest: "books",
          style: "any",
          budget: 0,
          enabled: false,
        },
      };
    case "finance":
      return {
        ...base,
        kind,
        value: {
          title: "",
          url: "",
          host: "",
          registration: "",
          arrangement: "",
          description: "",
          disclosure: "",
          state: "draft",
          reviewUntil: null,
          evidence: "",
        },
      };
    case "settlement":
      return {
        ...base,
        kind,
        value: {
          title: "",
          period: new Date().toISOString().slice(0, 10),
          gross: 0,
          refunds: 0,
          paid: 0,
          reference: "",
          note: "",
        },
      };
  }
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  max = 1500,
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  max?: number;
  required?: boolean;
}) {
  return (
    <label className="block text-sm my-4">
      {label}
      {type === "textarea" ? (
        <textarea
          className={fieldClass}
          value={value}
          maxLength={max}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={fieldClass}
          value={value}
          type={type}
          maxLength={max}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "any" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function ShopAdmin() {
  const formRef = useRef<HTMLFormElement>(null);
  const [data, setData] = useState<AdminData | null>(null),
    [kind, setKind] = useState<CatalogRecord["kind"]>("product"),
    [draft, setDraft] = useState<CatalogRecord | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const reload = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/admin/shop", { cache: "no-store", signal });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      setError("");
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : "Could not load.");
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void reload(c.signal);
    return () => c.abort();
  }, [reload]);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [draft?.id]);
  async function send(path: string, method: string, body: unknown) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setNotice(
        path.endsWith("discover")
          ? `${j.added} new ASIN candidates added as drafts. Write original copy and review before publishing.`
          : "Saved.",
      );
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function change(key: string, value: unknown) {
    setDraft((d) =>
      d
        ? ({ ...d, value: { ...d.value, [key]: value } } as CatalogRecord)
        : null,
    );
  }
  return (
    <>
      <p className="text-sm text-clay">
        Editorial choices · transparent referrals
      </p>
      <h1 className="font-heading text-4xl mt-2">The curated shop</h1>
      <p className="text-slate-600 mt-4 max-w-2xl">
        Find candidates, check them carefully, then publish. Discovery never
        publishes automatically. Commission is not a ranking input.
      </p>
      <details className="border-y py-5 mt-7" open={!data?.setup.amazon}>
        <summary className="cursor-pointer font-medium">
          Provider setup & operating method
        </summary>
        <div className="text-sm space-y-3 mt-4">
          <p>
            Amazon API:{" "}
            {data?.setup.amazon
              ? "configured; live access still needs verification"
              : "setup pending"}{" "}
            · Referral links: {data?.setup.links ? "enabled" : "off"} · Daily
            discovery: {data?.setup.automatic ? "enabled" : "off"} · Financial
            referrals: {data?.setup.finance ? "enabled" : "off"}
          </p>
          <p>
            In Vercel, add AMAZON_ASSOCIATE_TAG, AMAZON_CREATORS_CLIENT_ID,
            AMAZON_CREATORS_CLIENT_SECRET and AMAZON_CREATORS_VERSION (3.1, 3.2
            or 3.3 from your credentials). After site/API approval and a
            successful manual search, set AMAZON_LINKS_ENABLED=true and
            optionally AMAZON_DISCOVERY_ENABLED=true. Never paste credentials
            into catalogue fields.
          </p>
          <p>
            Daily discovery runs one enabled recipe at 09:00 India time,
            rotating oldest searches first. Use age bands and shopping
            interests; never enter a child’s identity or private notes.
            Duplicate ASINs are skipped. Searches are limited to ten candidates,
            one per minute and one per recipe per hour.
          </p>
          <p>
            Only ASINs are imported. Open the Amazon listing to verify age,
            safety, sizing, seller and returns, then write original editorial
            copy. Product pictures and INR prices load inside the parent shop
            after API setup, with a ten-minute refresh. Image files and reviews
            are never copied into storage. Publish a reviewed product to check
            the complete display. Review dates expire the listing automatically.
          </p>
          <p>
            Financial partners need registration verification, a professionally
            reviewed arrangement, clear fees/risks and an approved destination
            domain. Then enable FINANCE_REFERRALS_ENABLED=true. Savings
            projections do not recommend partners or transfer parent details.
          </p>
          <p>
            Record retailer statements in Referral settlements. Gross minus
            refunds is expected net revenue; paid is the actual amount received.
            These are manual reconciliation records, not tracked conversions. Do
            not include customer identities.
          </p>
        </div>
      </details>
      <div
        role="tablist"
        aria-label="Catalogue section"
        className="flex flex-wrap gap-2 my-6"
      >
        {Object.entries(labels).map(([k, v]) => (
          <button
            role="tab"
            aria-selected={kind === k}
            key={k}
            className={`px-4 py-3 rounded-full text-sm ${kind === k ? "bg-clay text-white" : "border"}`}
            onClick={() => setKind(k as CatalogRecord["kind"])}
          >
            {v}
          </button>
        ))}
      </div>
      <button
        className={buttonClass}
        disabled={!data || !!draft}
        onClick={() => setDraft(newRecord(kind))}
      >
        Add {kind === "finance" ? "financial partner" : kind}
      </button>
      {kind === "recipe" && (
        <section className="border-y py-5 mt-6">
          <h2 className="font-heading text-xl">
            What families are looking for
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Shopping interests are grouped by age band only when at least three
            families share them. Create a recipe from a group, review it, then
            enable daily discovery. No individual profiles leave Kahiye.
          </p>
          {data?.demand.length === 0 && (
            <p className="text-sm mt-3">
              Not enough shared shopping choices yet. You can create editorial
              recipes now.
            </p>
          )}
          {data?.demand.map((d) => (
            <button
              key={d.age_band + d.interest}
              disabled={!!draft || busy}
              className="border rounded-xl p-3 mr-3 mt-3 text-sm disabled:opacity-50"
              onClick={() =>
                setDraft({
                  id: crypto.randomUUID(),
                  revision: 0,
                  kind: "recipe",
                  value: {
                    title: `${d.age_band} · ${d.interest}`,
                    category: d.interest,
                    interest: d.interest,
                    ageBand: d.age_band,
                    style: "any",
                    budget: 0,
                    enabled: false,
                  },
                })
              }
            >
              {d.age_band} · {d.interest} · {d.families} families → Create
              recipe
            </button>
          ))}
        </section>
      )}
      {error && (
        <div role="alert" className="border border-clay p-4 my-5">
          {error}
          <button
            className="block underline mt-2"
            onClick={() => void reload()}
          >
            Reload saved records; keep my draft
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="my-4 text-clay">
          {notice}
        </p>
      )}
      {draft && (
        <form
          ref={formRef}
          className="bg-paper-deep p-5 sm:p-7 rounded-2xl my-7"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = catalogSchema.safeParse(draft);
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? "Check fields.");
              return;
            }
            if (await send("/api/admin/shop", "PUT", parsed.data))
              setDraft(null);
          }}
        >
          <h2 className="font-heading text-2xl">
            {draft.revision ? "Edit" : "New"} {draft.kind}
          </h2>
          <Field
            label={
              draft.kind === "product"
                ? "Original editorial title (not copied from Amazon)"
                : "Name"
            }
            value={draft.value.title}
            max={100}
            required
            onChange={(v) => change("title", v)}
          />
          {draft.kind === "product" && (
            <>
              <Field
                label="Amazon India ASIN (10 characters)"
                value={draft.value.asin}
                max={10}
                required
                onChange={(v) => change("asin", v.toUpperCase())}
              />
              {amazonLink(draft.value.asin) && (
                <a
                  href={amazonLink(draft.value.asin)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-clay underline text-sm"
                >
                  Inspect the Amazon listing ↗
                </a>
              )}
              <label className="block text-sm my-4">
                Category
                <select
                  className={fieldClass}
                  value={draft.value.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="sm:grid grid-cols-2 gap-5">
                <Field
                  label="Minimum age (months, inclusive)"
                  type="number"
                  value={draft.value.minMonths}
                  onChange={(v) => change("minMonths", Number(v))}
                />
                <Field
                  label="Maximum age (months, exclusive)"
                  type="number"
                  value={draft.value.maxMonths}
                  onChange={(v) => change("maxMonths", Number(v))}
                />
              </div>
              <Choices
                label="Shopping interests"
                options={categories}
                value={draft.value.interests}
                onChange={(v) => change("interests", v)}
              />
              <Choices
                label="Style"
                options={styles}
                value={draft.value.styles}
                onChange={(v) => change("styles", v)}
              />
              <Choices
                label="Materials present (check the listing)"
                options={materials}
                value={draft.value.materials}
                onChange={(v) => change("materials", v)}
              />
              <Field
                label="Why we chose it"
                type="textarea"
                max={600}
                value={draft.value.reason}
                onChange={(v) => change("reason", v)}
              />
              <Field
                label="Safety, supervision and suitability notes"
                type="textarea"
                max={600}
                value={draft.value.safety}
                onChange={(v) => change("safety", v)}
              />
              <Field
                label="Sizing, seller and returns notes"
                type="textarea"
                max={300}
                value={draft.value.sizeNotes}
                onChange={(v) => change("sizeNotes", v)}
              />
            </>
          )}
          {draft.kind === "finance" && (
            <>
              <Field
                label="Parent-facing description (no return promises)"
                type="textarea"
                max={600}
                value={draft.value.description}
                onChange={(v) => change("description", v)}
              />
              <Field
                label="Approved destination URL (HTTPS)"
                max={1000}
                value={draft.value.url}
                onChange={(v) => change("url", v)}
              />
              <Field
                label="Exact approved host (for example partner.in)"
                max={200}
                value={draft.value.host}
                onChange={(v) => change("host", v)}
              />
              <Field
                label="Registration authority and number"
                max={200}
                value={draft.value.registration}
                onChange={(v) => change("registration", v)}
              />
              <Field
                label="Internal: referral agreement, legal review and commission terms"
                type="textarea"
                value={draft.value.arrangement}
                onChange={(v) => change("arrangement", v)}
              />
              <Field
                label="Parent-facing referral fee, risks and charges disclosure"
                max={600}
                type="textarea"
                value={draft.value.disclosure}
                onChange={(v) => change("disclosure", v)}
              />
            </>
          )}
          {(draft.kind === "product" || draft.kind === "finance") && (
            <>
              <Field
                label="Internal: evidence checked, reviewer and review date"
                type="textarea"
                value={draft.value.evidence}
                onChange={(v) => change("evidence", v)}
              />
              <Field
                label="Review valid through"
                type="date"
                value={draft.value.reviewUntil ?? ""}
                onChange={(v) => change("reviewUntil", v || null)}
              />
              <label className="block text-sm my-4">
                Publication state
                <select
                  className={fieldClass}
                  value={draft.value.state}
                  onChange={(e) => change("state", e.target.value)}
                >
                  <option value="draft">Draft — hidden</option>
                  <option value="published">
                    Published — only while review is current
                  </option>
                  <option value="paused">Paused — hidden immediately</option>
                </select>
              </label>
            </>
          )}
          {draft.kind === "recipe" && (
            <>
              <label className="block text-sm my-4">
                Age band
                <select
                  className={fieldClass}
                  value={draft.value.ageBand}
                  onChange={(e) => change("ageBand", e.target.value)}
                >
                  {["baby", "preschool", "school", "teen"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {(["category", "interest"] as const).map((k) => (
                <label key={k} className="block text-sm my-4">
                  {k}
                  <select
                    className={fieldClass}
                    value={draft.value[k]}
                    onChange={(e) => change(k, e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="block text-sm my-4">
                Style
                <select
                  className={fieldClass}
                  value={draft.value.style}
                  onChange={(e) => change("style", e.target.value)}
                >
                  {["any", ...styles].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Maximum search price (₹; 0 = none)"
                type="number"
                value={draft.value.budget}
                onChange={(v) => change("budget", Number(v))}
              />
              <label className="flex gap-3 my-5 text-sm">
                <input
                  type="checkbox"
                  checked={draft.value.enabled}
                  onChange={(e) => change("enabled", e.target.checked)}
                />
                Include in daily discovery after provider activation
              </label>
              <p className="text-sm">
                Search sent to Amazon: {discoveryQuery(draft.value)}
              </p>
            </>
          )}
          {draft.kind === "settlement" && (
            <>
              <Field
                label="Statement period ending"
                type="date"
                value={draft.value.period}
                onChange={(v) => change("period", v)}
              />
              {(["gross", "refunds", "paid"] as const).map((k) => (
                <Field
                  key={k}
                  label={`${k} (₹)`}
                  type="number"
                  value={draft.value[k]}
                  onChange={(v) => change(k, Number(v))}
                />
              ))}
              <Field
                label="Statement/reference identifier"
                max={200}
                required
                value={draft.value.reference}
                onChange={(v) => change("reference", v)}
              />
              <Field
                label="Reconciliation note (no parent identities)"
                max={1000}
                type="textarea"
                value={draft.value.note}
                onChange={(v) => change("note", v)}
              />
            </>
          )}
          <div className="flex gap-5 mt-6">
            <button className={buttonClass} disabled={busy}>
              Save {draft.kind}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {!data && !error && (
        <p role="status" className="my-8">
          Loading catalogue…
        </p>
      )}
      {data && !data.records.some((r) => r.kind === kind) && (
        <p className="my-10 text-slate-600">
          No {labels[kind].toLowerCase()} yet. Add the first one when ready.
        </p>
      )}
      <div className="divide-y mt-6">
        {data?.records
          .filter((r) => r.kind === kind)
          .map((r) => {
            const run = data.runs.find((x) => x.recipe_id === r.id);
            return (
              <article key={r.id} className="py-6">
                <h2 className="font-heading text-2xl">
                  {r.value.title ||
                    (r.kind === "product"
                      ? `Review candidate ${r.value.asin}`
                      : "Untitled")}
                </h2>
                {(r.kind === "product" || r.kind === "finance") && (
                  <p className="text-sm mt-2">
                    {r.value.state} · Review through{" "}
                    {r.value.reviewUntil ?? "not set"}
                    {r.value.reviewUntil &&
                    r.value.reviewUntil < new Date().toISOString().slice(0, 10)
                      ? " · Expired, hidden from parents"
                      : ""}
                  </p>
                )}
                {r.kind === "settlement" && (
                  <p className="text-sm mt-3">
                    Expected net ₹
                    {(r.value.gross - r.value.refunds).toLocaleString("en-IN")}{" "}
                    · Paid ₹{r.value.paid.toLocaleString("en-IN")} · Outstanding
                    ₹
                    {(
                      r.value.gross -
                      r.value.refunds -
                      r.value.paid
                    ).toLocaleString("en-IN")}
                  </p>
                )}
                {r.kind === "recipe" && (
                  <>
                    <p className="text-sm mt-2">
                      {discoveryQuery(r.value)} ·{" "}
                      {r.value.enabled
                        ? "Daily rotation enabled"
                        : "Manual only"}
                    </p>
                    {run && (
                      <p className="text-sm mt-2">
                        Last attempt{" "}
                        {new Date(run.attempted_at).toLocaleString("en-IN")} ·{" "}
                        {run.error ??
                          (run.finished_at
                            ? `${run.added} drafts added`
                            : "In progress; retry available after one hour")}
                      </p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-5 mt-4">
                  <button
                    disabled={!!draft || busy}
                    className="text-clay underline disabled:opacity-50"
                    onClick={() => setDraft(r)}
                  >
                    Edit
                  </button>
                  {r.kind === "recipe" && (
                    <button
                      disabled={busy || !data.setup.amazon}
                      className="text-clay underline disabled:opacity-50"
                      onClick={() =>
                        void send("/api/admin/shop/discover", "POST", {
                          id: r.id,
                        })
                      }
                    >
                      Find candidates now
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </>
  );
}
