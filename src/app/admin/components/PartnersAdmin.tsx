"use client";
import { useRef, useState } from "react";
import { fieldClass, buttonClass } from "@/components/care/CareFrame";
import { interestIds } from "@/lib/profile-notebook";
import { TRACKS } from "@/data/handbook";
import {
  CATEGORY_LABELS, CITY_OPTIONS, FEE_LABELS, HEALTH_CATEGORIES, MOMENT_LABELS, NEEDS_VETTING, feeModels, moments, partnerCategories, partnerGateProblems,
  type OfferInput, type PartnerCategory, type PartnerInput,
} from "@/lib/partner-services";
import { Heading, LoadState, formatTime, useRemote } from "./shared";

type Row<T> = T & { id: string; revision: number };
type PartnerRow = Row<{ [K in keyof PartnerInput]: PartnerInput[K] | null }> & { ready: boolean; updated_at: string };
type OfferRow = Row<Omit<OfferInput, "url"> & { url: string | null }> & { visible: boolean; reviewed_by: string | null; reviewed_on: string | null };
type Lead = { id: string; offer_title: string; provider_name: string; shared: Record<string, string>; consent_version: string; status: "new" | "sent" | "closed"; created_at: string };
type Month = { month: string; partner_id: string; partner: string; fee_model: keyof typeof FEE_LABELS; views: number; clicks: number; leads: number };
type Overview = { partners: PartnerRow[]; offers: OfferRow[]; leads: Lead[]; monthly: Month[] };
type Draft = { kind: "partner"; id: string; revision: number; value: PartnerInput } | { kind: "offer"; id: string; revision: number; value: OfferInput };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const emptyPartner: PartnerInput = { name: "", legal_name: "", category: "tuition", website: "", terms_url: "", contact_email: "", grievance_contact: "", contract_signed_on: "", contract_expires_on: "", fee_model: "listing_fee", fee_note: "", police_verification_confirmed: false, insurance_confirmed: false, status: "draft" };
const SHARED_LABELS: Record<string, string> = { parent_name: "Name", contact_method: "Contact by", phone: "Phone", email: "Email", child_age_band: "Child’s age band", city: "City", message: "Message" };
const ageLabel = (m: number) => m % 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m / 12}y`;

function partnerValue(p: PartnerRow): PartnerInput {
  return Object.fromEntries(Object.keys(emptyPartner).map(k => [k, p[k as keyof PartnerInput] ?? (typeof emptyPartner[k as keyof PartnerInput] === "boolean" ? false : "")])) as PartnerInput;
}
function offerValue(o: OfferRow): OfferInput {
  const { partner_id, title, summary, category, min_months, max_months, cities, moment, trigger_value, price_label, cta, url, status } = o;
  return { partner_id, title, summary, category, min_months, max_months, cities, moment, trigger_value, price_label, cta, url: url ?? "", status };
}

export function PartnersAdmin() {
  const remote = useRemote<Overview>("/api/admin/partners");
  const [tab, setTab] = useState<"partners" | "offers" | "enquiries" | "counts">("partners");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const data = remote.data;
  async function send(method: "PUT" | "PATCH", body: unknown) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/admin/partners", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Could not save.");
      setNotice("Saved."); remote.reload(); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  const partnerName = (id: string) => data?.partners.find(p => p.id === id)?.name ?? "Unknown partner";
  return <>
    <Heading eyebrow="Facilitator, not seller" title="Partner services" description="Partners provide services under their own contracts and terms; parents pay them directly. Offers reach parents only through a parenting moment, are always labelled, and are never ranked by fee. An offer is shown only while its partner is active with every gate satisfied." />
    <LoadState {...remote} />
    {data && <>
      <nav aria-label="Partner services" className="flex flex-wrap gap-2 mb-8">{([["partners", `Partners (${data.partners.length})`], ["offers", `Offers (${data.offers.length})`], ["enquiries", `Enquiries (${data.leads.filter(l => l.status === "new").length} new)`], ["counts", "Monthly counts"]] as const).map(([id, label]) =>
        <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setDraft(null); }} className={`rounded-full border px-4 py-2 text-sm ${tab === id ? "bg-paper-deep border-clay" : ""}`}>{label}</button>)}</nav>
      {error && <p role="alert" className="border border-clay rounded-xl p-4 mb-5">{error}</p>}
      <p role="status" className="text-leaf mb-4">{notice}</p>

      {tab === "partners" && !draft && <section>
        <button className={buttonClass} onClick={() => setDraft({ kind: "partner", id: crypto.randomUUID(), revision: 0, value: { ...emptyPartner } })}>Add partner</button>
        {!data.partners.length ? <p className="mt-6 text-muted-foreground">No partners yet. Nothing is shown to parents until a partner and an offer are both active.</p>
          : <table className="w-full text-sm border-t border-border mt-6"><thead><tr className="text-left text-muted-foreground"><th className="py-3 font-normal">Partner</th><th className="py-3 font-normal">Category</th><th className="py-3 font-normal">Status</th><th className="py-3 font-normal">Shown to parents</th><th /></tr></thead>
            <tbody>{data.partners.map(p => <tr key={p.id} className="border-t border-border align-top">
              <td className="py-3 pr-3"><span className="font-semibold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.legal_name} · {FEE_LABELS[p.fee_model ?? "listing_fee"]}</span></td>
              <td className="py-3 pr-3">{CATEGORY_LABELS[p.category as PartnerCategory]}</td><td className="py-3 pr-3">{p.status}</td>
              <td className="py-3 pr-3">{p.ready ? "Yes" : "No"}{p.contract_expires_on && <span className="block text-xs text-muted-foreground">Contract to {p.contract_expires_on}</span>}</td>
              <td className="py-3"><button className="underline" onClick={() => setDraft({ kind: "partner", id: p.id, revision: p.revision, value: partnerValue(p) })}>Edit</button></td>
            </tr>)}</tbody></table>}
      </section>}

      {tab === "offers" && !draft && <section>
        <button className={buttonClass} disabled={!data.partners.length} onClick={() => { const p = data.partners[0]; setDraft({ kind: "offer", id: crypto.randomUUID(), revision: 0, value: { partner_id: p.id, title: "", summary: "", category: p.category as PartnerCategory, min_months: 0, max_months: 216, cities: ["online"], moment: "always", trigger_value: null, price_label: "", cta: "enquiry", url: "", status: "draft" } }); }}>Add offer</button>
        {!data.partners.length && <p className="mt-3 text-sm text-muted-foreground">Add a partner first.</p>}
        {!!data.offers.length && <table className="w-full text-sm border-t border-border mt-6"><thead><tr className="text-left text-muted-foreground"><th className="py-3 font-normal">Offer</th><th className="py-3 font-normal">Moment</th><th className="py-3 font-normal">Status</th><th className="py-3 font-normal">Shown</th><th /></tr></thead>
          <tbody>{data.offers.map(o => <tr key={o.id} className="border-t border-border align-top">
            <td className="py-3 pr-3"><span className="font-semibold">{o.title}</span><span className="block text-xs text-muted-foreground">{partnerName(o.partner_id)} · {ageLabel(o.min_months)}–{ageLabel(o.max_months)} · {o.cities.join(", ")}</span></td>
            <td className="py-3 pr-3">{MOMENT_LABELS[o.moment]}{o.trigger_value ? `: ${o.trigger_value}` : ""}</td><td className="py-3 pr-3">{o.status}{o.reviewed_on && <span className="block text-xs text-muted-foreground">Reviewed {o.reviewed_on}</span>}</td>
            <td className="py-3 pr-3">{o.visible ? "Yes" : o.status === "active" ? "No: partner gates" : "No"}</td>
            <td className="py-3"><button className="underline" onClick={() => setDraft({ kind: "offer", id: o.id, revision: o.revision, value: offerValue(o) })}>Edit</button></td>
          </tr>)}</tbody></table>}
      </section>}

      {draft?.kind === "partner" && <PartnerForm draft={draft} busy={busy} onChange={value => setDraft({ ...draft, value })} onCancel={() => setDraft(null)} onSave={async () => { if (await send("PUT", draft)) setDraft(null); }} />}
      {draft?.kind === "offer" && <OfferForm draft={draft} partners={data.partners} busy={busy} onChange={value => setDraft({ ...draft, value })} onCancel={() => setDraft(null)} onSave={async () => { if (await send("PUT", draft)) setDraft(null); }} />}

      {tab === "enquiries" && <section>
        <p className="text-sm text-muted-foreground max-w-2xl mb-5">Automatic delivery to partners is not configured. Forward each new enquiry to the partner’s contact email yourself, with exactly these fields and nothing else, then mark it sent. Parents confirmed this list on a consent screen.</p>
        {!data.leads.length ? <p>No enquiries yet.</p> : <ul className="divide-y divide-border border-y border-border">{data.leads.map(l => <li key={l.id} className="py-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div><p className="font-semibold">{l.provider_name} · {l.offer_title}</p><p className="text-xs text-muted-foreground">{formatTime(l.created_at)} · consent {l.consent_version} · {l.status}</p>
            <dl className="mt-2 text-sm grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">{Object.entries(l.shared).filter(([k]) => k !== "contact_method").map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{SHARED_LABELS[k] ?? k}</dt><dd className="break-words">{v}</dd></div>)}</dl></div>
          <div className="flex gap-3 items-start">{(["sent", "closed"] as const).filter(s => s !== l.status).map(s => <button key={s} disabled={busy} className="underline text-sm" onClick={() => send("PATCH", { leadId: l.id, status: s })}>{s === "sent" ? "Mark sent" : "Close"}</button>)}</div>
        </li>)}</ul>}
      </section>}

      {tab === "counts" && <section>
        <p className="text-sm text-muted-foreground max-w-2xl mb-5">Views, clicks and enquiries per partner per month, India time, for the last 12 months. Events carry no family or child identifier. Clicks are indicative; invoice commissions and booking fees against bookings the partner confirms, as the contract sets out.</p>
        {!data.monthly.length ? <p>No activity yet.</p> : <table className="w-full text-sm border-t border-border"><thead><tr className="text-left text-muted-foreground"><th className="py-3 font-normal">Month</th><th className="py-3 font-normal">Partner</th><th className="py-3 font-normal">Fee model</th><th className="py-3 font-normal text-right">Views</th><th className="py-3 font-normal text-right">Clicks</th><th className="py-3 font-normal text-right">Enquiries</th></tr></thead>
          <tbody>{data.monthly.map(m => <tr key={`${m.month}-${m.partner_id}`} className="border-t border-border"><td className="py-3">{m.month}</td><td className="py-3">{m.partner}</td><td className="py-3">{FEE_LABELS[m.fee_model]}</td><td className="py-3 text-right tabular-nums">{m.views}</td><td className="py-3 text-right tabular-nums">{m.clicks}</td><td className="py-3 text-right tabular-nums">{m.leads}</td></tr>)}</tbody></table>}
      </section>}
      <p className="text-sm text-muted-foreground border-t pt-5 mt-10">Rules and contract checklist: docs/PARTNER-SERVICES.md. <button className="underline ml-2" onClick={remote.reload}>Refresh</button></p>
    </>}
  </>;
}

function Text({ label, value, onChange, type = "text", max = 200, hint }: { label: string; value: string; onChange: (v: string) => void; type?: string; max?: number; hint?: string }) {
  return <label className="block text-sm my-4">{label}{type === "textarea"
    ? <textarea className={fieldClass} rows={3} maxLength={max} value={value} onChange={e => onChange(e.target.value)} />
    : <input className={fieldClass} type={type} maxLength={max} value={value} onChange={e => onChange(e.target.value)} />}
    {hint && <span className="block text-xs text-muted-foreground mt-1">{hint}</span>}</label>;
}

function PartnerForm({ draft, busy, onChange, onSave, onCancel }: { draft: Extract<Draft, { kind: "partner" }>; busy: boolean; onChange: (v: PartnerInput) => void; onSave: () => void; onCancel: () => void }) {
  const v = draft.value, set = <K extends keyof PartnerInput>(k: K, value: PartnerInput[K]) => onChange({ ...v, [k]: value });
  const problems = partnerGateProblems(v, today()), health = HEALTH_CATEGORIES.includes(v.category), vetting = NEEDS_VETTING.includes(v.category);
  return <form className="max-w-2xl" onSubmit={e => { e.preventDefault(); onSave(); }}>
    <h2 className="font-heading text-2xl mb-2">{draft.revision ? `Edit ${v.name}` : "New partner"}</h2>
    <fieldset disabled={busy}>
      <Text label="Public name" value={v.name} onChange={x => set("name", x)} max={120} />
      <Text label="Legal name (as on the contract)" value={v.legal_name} onChange={x => set("legal_name", x)} />
      <label className="block text-sm my-4">Category<select className={fieldClass} value={v.category} onChange={e => { const c = e.target.value as PartnerCategory; onChange({ ...v, category: c, fee_model: HEALTH_CATEGORIES.includes(c) && v.fee_model === "commission" ? "booking_fee" : v.fee_model }); }}>{partnerCategories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></label>
      <Text label="Website" type="url" value={v.website} onChange={x => set("website", x)} max={300} />
      <Text label="Partner’s own terms (https link)" type="url" value={v.terms_url} onChange={x => set("terms_url", x)} max={300} hint="Shown on every offer. Parents contract with the partner under these terms." />
      <Text label="Partner contact email (for forwarding enquiries)" type="email" value={v.contact_email} onChange={x => set("contact_email", x)} max={254} />
      <Text label="Partner grievance contact (email, phone or link)" value={v.grievance_contact} onChange={x => set("grievance_contact", x)} hint="Shown to parents beside Kahiye’s own grievance route." />
      <div className="grid sm:grid-cols-2 gap-x-4"><Text label="Contract signed on" type="date" value={v.contract_signed_on} onChange={x => set("contract_signed_on", x)} /><Text label="Contract expires on (optional)" type="date" value={v.contract_expires_on} onChange={x => set("contract_expires_on", x)} /></div>
      <label className="block text-sm my-4">How Kahiye is paid<select className={fieldClass} value={v.fee_model} onChange={e => set("fee_model", e.target.value as PartnerInput["fee_model"])}>{feeModels.map(f => <option key={f} value={f} disabled={health && f === "commission"}>{FEE_LABELS[f]}{health && f === "commission" ? " (not for health partners)" : ""}</option>)}</select>
        <span className="block text-xs text-muted-foreground mt-1">Parents always pay the partner directly. Health partners pay a booking or listing fee, never a per-patient commission.</span></label>
      <Text label="Fee note (internal)" type="textarea" value={v.fee_note} onChange={x => set("fee_note", x)} max={500} />
      <fieldset className="my-5 rounded-xl border border-border p-4"><legend className="text-sm px-1">Child safety {vetting ? "(required for this category)" : "(not required for this category)"}</legend>
        <label className="flex gap-3 items-start text-sm my-2"><input type="checkbox" className="mt-1" checked={v.police_verification_confirmed} onChange={e => set("police_verification_confirmed", e.target.checked)} />Police verification confirmed for every person who meets children, with evidence on file</label>
        <label className="flex gap-3 items-start text-sm my-2"><input type="checkbox" className="mt-1" checked={v.insurance_confirmed} onChange={e => set("insurance_confirmed", e.target.checked)} />Professional liability insurance confirmed and current</label>
      </fieldset>
      <label className="block text-sm my-4">Status<select className={fieldClass} value={v.status} onChange={e => set("status", e.target.value as PartnerInput["status"])}><option value="draft">Draft</option><option value="active" disabled={problems.length > 0}>Active{problems.length ? " (gates incomplete)" : ""}</option><option value="paused">Paused (hides every offer)</option></select></label>
      {problems.length > 0 && <div className="rounded-xl bg-paper-deep p-4 text-sm"><p className="font-semibold">Before this partner can be active</p><ul className="list-disc pl-5 mt-2 space-y-1">{problems.map(p => <li key={p}>{p}</li>)}</ul></div>}
      <div className="flex gap-4 mt-6"><button className={buttonClass}>{busy ? "Saving…" : "Save partner"}</button><button type="button" className="underline" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}

function OfferForm({ draft, partners, busy, onChange, onSave, onCancel }: { draft: Extract<Draft, { kind: "offer" }>; partners: PartnerRow[]; busy: boolean; onChange: (v: OfferInput) => void; onSave: () => void; onCancel: () => void }) {
  const v = draft.value, set = <K extends keyof OfferInput>(k: K, value: OfferInput[K]) => onChange({ ...v, [k]: value });
  const partner = partners.find(p => p.id === v.partner_id);
  const [cities, setCities] = useState(v.cities.join(", "));
  return <form className="max-w-2xl" onSubmit={e => { e.preventDefault(); onSave(); }}>
    <h2 className="font-heading text-2xl mb-2">{draft.revision ? `Edit ${v.title}` : "New offer"}</h2>
    <p className="text-sm text-muted-foreground">Write an original, plain description. No urgency, no claims of outcomes, nothing addressed to the child.</p>
    <fieldset disabled={busy}>
      <label className="block text-sm my-4">Partner<select className={fieldClass} value={v.partner_id} onChange={e => { const p = partners.find(x => x.id === e.target.value); if (p) onChange({ ...v, partner_id: p.id, category: p.category as PartnerCategory }); }}>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <span className="block text-xs text-muted-foreground mt-1">Category: {CATEGORY_LABELS[v.category]} (follows the partner).{partner && !partner.ready ? " This partner is not shown to parents yet, so the offer cannot be active." : ""}</span></label>
      <Text label="Title" value={v.title} onChange={x => set("title", x)} max={120} />
      <Text label="Summary" type="textarea" value={v.summary} onChange={x => set("summary", x)} max={600} />
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Text label={`From age, months (${ageLabel(v.min_months)})`} type="number" value={String(v.min_months)} onChange={x => set("min_months", Number(x) || 0)} />
        <Text label={`Up to, not including, months (${ageLabel(v.max_months)})`} type="number" value={String(v.max_months)} onChange={x => set("max_months", Number(x) || 0)} />
      </div>
      <Text label="Cities" value={cities} onChange={x => { setCities(x); set("cities", x.split(",").map(c => c.trim()).filter(Boolean)); }} max={600} hint={`Comma-separated. Use “online” for anywhere. Parents choose from: ${CITY_OPTIONS.join(", ")}, or type their own.`} />
      <label className="block text-sm my-4">Parenting moment<select className={fieldClass} value={v.moment} onChange={e => onChange({ ...v, moment: e.target.value as OfferInput["moment"], trigger_value: e.target.value === "interest" ? "art" : e.target.value === "handbook_track" ? "school" : null })}>{moments.map(m => <option key={m} value={m}>{MOMENT_LABELS[m]}</option>)}</select>
        <span className="block text-xs text-muted-foreground mt-1">Today shows at most one offer, and only for a due vaccination or check-up. Tuition appears beside the Handbook’s Learning & school topic with guidance on pressure.</span></label>
      {v.moment === "interest" && <label className="block text-sm my-4">Interest<select className={fieldClass} value={v.trigger_value ?? ""} onChange={e => set("trigger_value", e.target.value)}>{interestIds.map(i => <option key={i} value={i}>{i}</option>)}</select></label>}
      {v.moment === "handbook_track" && <label className="block text-sm my-4">Handbook topic<select className={fieldClass} value={v.trigger_value ?? ""} onChange={e => set("trigger_value", e.target.value)}>{TRACKS.map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>}
      {v.moment === "exam_season" && <Text label="Exam months (optional, e.g. 2,3)" value={v.trigger_value ?? ""} onChange={x => set("trigger_value", x.trim() || null)} max={20} hint="Default: February and March." />}
      {v.moment === "programme" && <Text label="Programme name" value={v.trigger_value ?? ""} onChange={x => set("trigger_value", x || null)} max={60} />}
      <Text label="Price label (as the partner states it)" value={v.price_label} onChange={x => set("price_label", x)} max={80} />
      <label className="block text-sm my-4">Next step for parents<select className={fieldClass} value={v.cta} onChange={e => set("cta", e.target.value as OfferInput["cta"])}><option value="enquiry">Enquiry with consent screen</option><option value="link">Link to the partner’s page</option></select></label>
      {v.cta === "link" && <Text label="Partner link (https)" type="url" value={v.url} onChange={x => set("url", x)} max={500} hint="Kahiye adds ref=kahiye; no family detail is ever added." />}
      <label className="block text-sm my-4">Status<select className={fieldClass} value={v.status} onChange={e => set("status", e.target.value as OfferInput["status"])}><option value="draft">Draft</option><option value="active" disabled={!partner?.ready}>Active (records you as reviewer)</option><option value="paused">Paused</option></select></label>
      <div className="flex gap-4 mt-6"><button className={buttonClass}>{busy ? "Saving…" : "Save offer"}</button><button type="button" className="underline" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
