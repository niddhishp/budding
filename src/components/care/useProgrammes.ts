"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ENROLMENT_COLUMNS, enrolmentSchema, type Enrolment } from "@/lib/programmes";

type Reply = { status?: string; enrolment?: unknown };
const NOT_SAVED = "That was not saved. Please try again.";

/**
 * The parent's own programme enrolments for one child, read under RLS. Every write is an RPC
 * from supabase/031_guided_programmes.sql that checks consent, ownership and the revision.
 */
export function useProgrammes(childId: string) {
  const [enrolments, setEnrolments] = useState<Enrolment[] | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const lock = useRef(false), mounted = useRef(true);
  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    setEnrolments(null); setError("");
    getSupabase().from("programme_enrolments").select(ENROLMENT_COLUMNS).eq("child_id", childId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setError("Your programmes could not be loaded."); setEnrolments([]); return; }
        setEnrolments((data ?? []).flatMap(row => { const parsed = enrolmentSchema.safeParse(row); return parsed.success ? [parsed.data] : []; }));
      }, () => { if (!cancelled) { setError("Your programmes could not be loaded."); setEnrolments([]); } });
    return () => { cancelled = true; mounted.current = false; };
  }, [childId, tick]);

  /** Runs one write; keeps the returned row whatever the status, so a conflict shows the latest state. */
  async function write(fn: string, args: Record<string, unknown>, ok: string[]): Promise<Enrolment | null> {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError("");
    try {
      const { data, error } = await getSupabase().rpc(fn, args);
      const reply = (data ?? {}) as Reply, parsed = enrolmentSchema.safeParse(reply.enrolment);
      if (parsed.success && mounted.current) setEnrolments(list => [parsed.data, ...(list ?? []).filter(e => e.id !== parsed.data.id)]);
      if (error || !reply.status || !ok.includes(reply.status)) {
        if (mounted.current) setError(reply.status === "conflict" ? "This changed on another device. We've loaded the latest; please check and try again." : NOT_SAVED);
        return null;
      }
      return parsed.success ? parsed.data : null;
    } catch {
      if (mounted.current) setError(NOT_SAVED);
      return null;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return {
    enrolments, error, busy, reload,
    start: (programme: string, rating: number) =>
      write("start_programme", { target: childId, receipt: crypto.randomUUID(), programme, rating }, ["saved", "active"]),
    mark: (enrolment: Enrolment, day: number, done: boolean) =>
      write("mark_programme_day", { enrolment: enrolment.id, day, done, expected: enrolment.revision }, ["saved"]),
    finish: (enrolment: Enrolment, rating: number) =>
      write("finish_programme", { enrolment: enrolment.id, rating, expected: enrolment.revision }, ["saved"]),
    stop: (enrolment: Enrolment) => write("stop_programme", { enrolment: enrolment.id }, ["stopped"]),
  };
}
