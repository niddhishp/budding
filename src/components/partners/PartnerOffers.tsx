"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Child } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fieldClass, buttonClass } from "@/components/care/CareFrame";
import {
  FEE_LABELS, PARTNER_CONSENT_VERSION, partnerLabel, placementOffers, sharedPreview,
  type PartnerOffer, type Placement,
} from "@/lib/partner-services";

type Loaded = { ageBand: string | null; city: string | null; offers: PartnerOffer[] };

/** Offers for one child. Errors and loading show nothing: partner offers are never the point of a page. */
export function usePartnerOffers(child: Child) {
  const [data, setData] = useState<Loaded | null>(null);
  const born = !!child.dateOfBirth;
  useEffect(() => {
    if (!born) return;
    const controller = new AbortController();
    fetch(`/api/partner-offers?childId=${child.id}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: Loaded | null) => { if (!controller.signal.aborted && d && Array.isArray(d.offers)) setData(d); })
      .catch(() => { /* Nothing is shown when offers cannot load. */ });
    return () => controller.abort();
  }, [child.id, born, child.city]);
  return data;
}

export function PartnerOffers({ child, placement, heading, intro, track, className, footer }: {
  child: Child; placement: Placement; heading: string; intro?: string; track?: string; className?: string; footer?: ReactNode;
}) {
  const data = usePartnerOffers(child);
  if (!data) return null;
  const offers = placementOffers(data.offers, placement, { track });
  if (!offers.length) return null;
  return <PartnerOfferList offers={offers} child={child} ageBand={data.ageBand} city={data.city} heading={heading} intro={intro} compact={placement === "today"} className={className} footer={footer} />;
}

function seenViews(ids: string[]) {
  // One anonymous view per offer per browser session; storage may be unavailable.
  try {
    const key = "kahiye.partnerViews", seen = new Set<string>(JSON.parse(sessionStorage.getItem(key) ?? "[]"));
    const fresh = ids.filter(id => !seen.has(id));
    fresh.forEach(id => seen.add(id));
    sessionStorage.setItem(key, JSON.stringify([...seen].slice(-200)));
    return fresh;
  } catch { return []; }
}
function recordEvent(kind: "view" | "click", offerIds: string[]) {
  if (!offerIds.length) return;
  void fetch("/api/partner-offers", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, offerIds }) }).catch(() => {});
}

/** Presentational list; every offer carries the provider, its terms, the fee disclosure and a grievance route. */
export function PartnerOfferList({ offers, child, ageBand, city, heading, intro, compact = false, className = "", footer }: {
  offers: PartnerOffer[]; child: Pick<Child, "id" | "name">; ageBand: string | null; city: string | null;
  heading: string; intro?: string; compact?: boolean; className?: string; footer?: ReactNode;
}) {
  const [enquiring, setEnquiring] = useState<PartnerOffer | null>(null);
  const ids = offers.map(o => o.id).join(",");
  useEffect(() => { recordEvent("view", seenViews(ids.split(","))); }, [ids]);
  if (!offers.length) return null;
  const headingId = `partner-${child.id}-${heading.replace(/\W+/g, "-").toLowerCase()}`;
  return <section aria-labelledby={headingId} className={`rounded-2xl border border-slate-200 bg-surface p-6 ${className}`}>
    <p className="text-xs text-slate-500">Partner services</p>
    <h2 id={headingId} className="font-heading text-xl text-slate-850 mt-1">{heading}</h2>
    {intro && <p className="text-sm text-slate-600 mt-2">{intro}</p>}
    <ul className="mt-4 divide-y divide-slate-200">
      {offers.map(o => <li key={o.id} className="py-4 first:pt-0 last:pb-0">
        <p className="text-xs text-slate-500 leading-relaxed">{partnerLabel(o.provider)}</p>
        <h3 className="font-heading text-lg text-slate-850 mt-2">{o.title}</h3>
        {!compact && <p className="text-sm text-slate-700 mt-1 leading-relaxed">{o.summary}</p>}
        <p className="text-sm text-slate-600 mt-1">{[o.price_label, o.online ? "Online" : city].filter(Boolean).join(" · ")}</p>
        {o.cta === "link" && o.url
          ? <a href={o.url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordEvent("click", [o.id])} className="inline-block text-clay underline py-2 mt-1">Visit {o.provider} ↗</a>
          : <button type="button" onClick={() => setEnquiring(o)} className="text-clay underline py-2 mt-1 text-left">Ask {o.provider} to contact you</button>}
        <details className="text-xs text-slate-600 mt-1">
          <summary className="cursor-pointer py-1">Terms, fees and concerns</summary>
          <p className="mt-2 leading-relaxed">{o.provider} provides this service, sets its price and is responsible for it. You pay {o.provider} directly. Kahiye is paid {FEE_LABELS[o.fee_model]} by {o.provider}; fees never change what Kahiye shows.</p>
          <p className="mt-2"><a className="underline" href={o.terms_url} target="_blank" rel="noopener noreferrer">{o.provider}’s terms ↗</a></p>
          <p className="mt-2 leading-relaxed">A concern about the service: contact {o.provider} at <Contact value={o.grievance_contact} />. If it is not resolved, or it is about Kahiye, write to <Link className="underline" href="/privacy#grievance">Kahiye’s grievance officer</Link>.</p>
        </details>
      </li>)}
    </ul>
    {footer}
    <p className="text-xs text-slate-500 mt-4">Shown for {child.name}’s age{city ? " and your city" : ""}, never by fee. Nothing about your family is shared unless you send an enquiry.</p>
    {enquiring && <EnquiryDialog offer={enquiring} child={child} ageBand={ageBand} city={city} onClose={() => setEnquiring(null)} />}
  </section>;
}

function Contact({ value }: { value: string }) {
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return <a className="underline" href={`mailto:${value}`}>{value}</a>;
  if (/^https:\/\/\S+$/.test(value)) return <a className="underline" href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  return <span>{value}</span>;
}

/** Explicit per-enquiry consent: the parent sees exactly what the partner will receive before sending. */
export function EnquiryDialog({ offer, child, ageBand, city, onClose }: {
  offer: PartnerOffer; child: Pick<Child, "id" | "name">; ageBand: string | null; city: string | null; onClose: () => void;
}) {
  const email = useAppStore(s => s.userEmail);
  const [step, setStep] = useState<"details" | "confirm" | "sent">("details");
  const [form, setForm] = useState({ parentName: "", contactMethod: "phone" as "phone" | "email", contact: "", message: "" });
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const receipt = useRef(crypto.randomUUID());
  const shared = sharedPreview(form, { ageBand, city });
  const ready = form.parentName.trim().length >= 2 && form.contact.trim().length >= 3;
  const set = (key: "parentName" | "contact" | "message", value: string) => { setForm(f => ({ ...f, [key]: value })); setAgreed(false); };
  const method = (m: "phone" | "email") => { setForm(f => ({ ...f, contactMethod: m, contact: m === "email" ? email ?? "" : "" })); setAgreed(false); };
  async function send() {
    if (busy || !agreed) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/partner-offers/enquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: receipt.current, offerId: offer.id, childId: child.id, ...form, consent: true, consentVersion: PARTNER_CONSENT_VERSION }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Your enquiry was not sent. Please try again.");
      setStep("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your enquiry was not sent. Please try again.");
    } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="w-[calc(100%-1rem)] max-w-lg max-h-[95dvh] overflow-y-auto rounded-3xl bg-canvas p-5 sm:p-8 block">
      <DialogTitle className="font-heading text-2xl leading-tight pr-6">{step === "sent" ? `Sent to ${offer.provider}` : `Ask ${offer.provider} to contact you`}</DialogTitle>
      <DialogDescription className="text-sm text-slate-600 mt-2">{partnerLabel(offer.provider)}.</DialogDescription>
      {step === "details" && <form className="mt-5" onSubmit={e => { e.preventDefault(); if (ready) setStep("confirm"); }}>
        <p className="font-medium">{offer.title}</p>
        <label className="block text-sm mt-4">Your name<input className={fieldClass} value={form.parentName} maxLength={80} autoComplete="name" onChange={e => set("parentName", e.target.value)} required /></label>
        <fieldset className="mt-4"><legend className="text-sm">How should they contact you?</legend>
          <div className="flex gap-2 mt-2">{(["phone", "email"] as const).map(m => <button key={m} type="button" aria-pressed={form.contactMethod === m} onClick={() => method(m)} className={`flex-1 rounded-xl border px-3 py-3 ${form.contactMethod === m ? "border-clay bg-clay/10" : "border-slate-200 bg-white"}`}>{m === "phone" ? "Phone" : "Email"}</button>)}</div>
        </fieldset>
        <label className="block text-sm mt-4">{form.contactMethod === "phone" ? "Phone number" : "Email address"}<input className={fieldClass} value={form.contact} maxLength={254} type={form.contactMethod === "phone" ? "tel" : "email"} autoComplete={form.contactMethod === "phone" ? "tel" : "email"} onChange={e => set("contact", e.target.value)} required /></label>
        <label className="block text-sm mt-4">A short message (optional)<textarea className={fieldClass} rows={3} maxLength={500} value={form.message} onChange={e => set("message", e.target.value)} /></label>
        <p className="text-xs text-slate-600 mt-2">Please leave out {child.name}’s name, health details or notes. {offer.provider} only needs their age band, and can ask you directly.</p>
        <div className="flex flex-wrap gap-3 mt-6"><button className={buttonClass} disabled={!ready}>Review what will be shared</button><button type="button" className="underline py-3" onClick={onClose}>Cancel</button></div>
      </form>}
      {step === "confirm" && <div className="mt-5">
        <p className="font-medium">{offer.provider} will receive exactly this:</p>
        <dl className="mt-3 rounded-2xl bg-paper-deep p-4 text-sm space-y-2">{shared.map(([k, v]) => <div key={k} className="grid grid-cols-[9rem_1fr] gap-3"><dt className="text-slate-600">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>
        <p className="text-sm text-slate-700 mt-4">Not shared: {child.name}’s name, health diary, notes, your conversations with Kahiye, or anything else in your account.</p>
        <label className="flex gap-3 items-start mt-5 text-sm"><input type="checkbox" className="mt-1" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>I agree to Kahiye sending these details to {offer.provider} for this enquiry only. {offer.provider} will contact me and handle these details under its own terms.</span></label>
        <p className="text-xs text-slate-500 mt-2">Consent text version {PARTNER_CONSENT_VERSION}. Kahiye keeps a record of this enquiry; you can see it in your family export or delete it with your account.</p>
        {error && <p role="alert" className="text-sm text-red-700 mt-4">{error}</p>}
        <div className="flex flex-wrap gap-3 mt-6"><button className={buttonClass} disabled={!agreed || busy} onClick={send}>{busy ? "Sending…" : `Send to ${offer.provider}`}</button><button type="button" className="underline py-3" disabled={busy} onClick={() => setStep("details")}>Edit details</button></div>
      </div>}
      {step === "sent" && <div className="mt-5">
        <p>Kahiye passes your details to {offer.provider}, and they will contact you by {form.contactMethod}. Booking, payment and the service itself are between you and {offer.provider}.</p>
        <p className="text-sm text-slate-600 mt-3">Changed your mind? You do not have to reply or book. A concern later can go to {offer.provider} first, then to Kahiye’s grievance officer.</p>
        <button className={`${buttonClass} mt-6`} onClick={onClose}>Done</button>
      </div>}
    </DialogContent>
  </Dialog>;
}
