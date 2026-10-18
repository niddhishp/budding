"use client";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import {
  MILESTONES,
  milestoneUrl,
  milestoneWindow,
  milestoneReminders,
} from "@/data/milestones";
import { CareFrame, CareError, fieldClass } from "@/components/care/CareFrame";
import { useCare } from "@/components/care/useCare";
import type { Child } from "@/types";
import { growingBand } from '@/data/growing-changes';
import { GrowingChanges } from '@/components/care/GrowingChanges';
import { useTodayDate } from '@/components/care/useTodayDate';
export function MilestonesPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  if (!child) return null;
  if (!child.dateOfBirth) return <CareFrame title="A new chapter ahead" intro="Observations about your child become available after birth."><p>Your pregnancy preparations are in your parent space.</p></CareFrame>;
  return growingBand(child.dateOfBirth) ? <GrowingChanges key={child.id} child={child} historyView={<MilestoneChild child={child} />} /> : <MilestoneChild key={child.id} child={child} />;
}
export function MilestoneChild({ child }: { child: Child }) {
  const care = useCare(child.id);
  const window = child.dateOfBirth ? milestoneWindow(child.dateOfBirth) : null;
  const [month, setMonth] = useState(
    window?.current?.month ?? window?.next?.month ?? 2,
  );
  const selected = MILESTONES.find((m) => m.month === month)!;
  const settings = care.data?.settings;
  return (
    <CareFrame
      title="Notice the little changes"
      intro={`A place for your observations about ${child.name}. No scores, no race. These are a few age-based examples, not a developmental assessment.`}
    >
      <p className="border-l-2 border-clay pl-4 mb-7 text-sm leading-relaxed">
        CDC checklists describe skills most children show by an age. They do not
        replace validated developmental screening. If a skill is missing, your
        child loses a skill, or something worries you, talk with your clinician
        without waiting for the next reminder. Premature birth may change how
        age is interpreted.
      </p>
      <CareError error={care.error} reload={care.reload} />
      {!care.data && !care.error && (
        <p role="status">Loading your observations…</p>
      )}
      {settings && (
        <>
          <label className="flex gap-3 p-5 bg-paper-deep rounded-xl">
            <input
              type="checkbox"
              checked={settings.reminders}
              disabled={care.busy || !child.dateOfBirth}
              onChange={(e) =>
                void care
                  .save({ ...settings, reminders: e.target.checked })
                  .catch(() => {})
              }
            />
            <span>
              Show milestone reminders for {child.name}
              <span className="block text-sm text-slate-500 mt-1">
                Optional notices inside Kahiye, based on their birth date. No
                email or phone notifications.{" "}
                {child.dateOfBirth ? "" : "Available after birth."}
              </span>
            </span>
          </label>
          {settings.reminders && child.dateOfBirth && (
            <div className="my-6 space-y-4">
              {milestoneReminders(child.dateOfBirth, settings.dismissed).map(
                ({ kind, item }) => (
                  <div
                    key={kind}
                    className="border-b pb-4 flex flex-wrap gap-4 justify-between"
                  >
                    <button
                      onClick={() => setMonth(item.month)}
                      className="text-clay underline"
                    >
                      {kind === "current" ? "Ready to revisit" : "Coming up"}:
                      the {item.month}-month checklist
                    </button>
                    <button
                      disabled={care.busy}
                      className="text-sm underline"
                      onClick={() =>
                        void care
                          .save({
                            ...settings,
                            dismissed: [
                              ...settings.dismissed,
                              `${kind}-${item.month}`,
                            ],
                          })
                          .catch(() => {})
                      }
                    >
                      Dismiss {kind} reminder
                    </button>
                  </div>
                ),
              )}
              {settings.dismissed.length > 0 && (
                <button
                  disabled={care.busy}
                  className="text-sm underline"
                  onClick={() =>
                    void care
                      .save({ ...settings, dismissed: [] })
                      .catch(() => {})
                  }
                >
                  Restore dismissed reminders
                </button>
              )}
            </div>
          )}
          <label className="block mt-8">
            Explore an age
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={fieldClass}
            >
              {MILESTONES.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month} months
                  {m.month >= 24 ? ` (${m.month / 12} years)` : ""}
                </option>
              ))}
            </select>
          </label>
          {child.dateOfBirth && !window?.current && !window?.next && (
            <p className="mt-4 text-sm">
              These checklists stop at five years. You can revisit earlier
              observations; discuss older-child development with your clinician.
            </p>
          )}
          <div className="divide-y mt-6">
            {selected.examples.map((text, i) => {
              const key = `${month}-${i}`;
              return (
                <label key={key} className="block py-6">
                  <span className="text-lg">{text}</span>
                  <select
                    aria-label={`Observation: ${text}`}
                    disabled={care.busy}
                    value={settings.observations[key] ?? ""}
                    className={fieldClass}
                    onChange={(e) => {
                      const observations = { ...settings.observations };
                      if (e.target.value)
                        observations[key] = e.target.value as
                          | "noticed"
                          | "not_yet"
                          | "discuss";
                      else delete observations[key];
                      void care
                        .save({ ...settings, observations })
                        .catch(() => {});
                    }}
                  >
                    <option value="">No observation saved</option>
                    <option value="noticed">I’ve noticed this</option>
                    <option value="not_yet">Not noticed yet</option>
                    <option value="discuss">I’d like to discuss this</option>
                  </select>
                </label>
              );
            })}
          </div>
          <a
            href={milestoneUrl(selected.slug)}
            target="_blank"
            rel="noreferrer"
            className="block text-clay underline py-5"
          >
            Read the full CDC {month}-month checklist and guidance ↗
          </a>
          <p className="text-xs text-slate-500">
            Selections save to this child’s private record. They are not shared
            with AI or automatically reviewed by a clinician. Last source check:
            18 October 2026.
          </p>
        </>
      )}
    </CareFrame>
  );
}
export function MilestoneNotice({ child }: { child: Child }) {
  const care = useCare(child.id);
  const date = useTodayDate();
  const setPage = useAppStore((s) => s.setPage);
  const s = care.data?.settings;
  const band = growingBand(child.dateOfBirth, date);
  if (band && s?.reminders) {
    const day = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
    const prompt = band.prompts[day % band.prompts.length];
    return <aside className="mb-7 p-5 rounded-xl bg-paper-deep"><p className="text-sm text-clay">Notice the little changes · {band.label}</p><p className="mt-3">{prompt[2]}</p><button className="text-clay underline mt-3" onClick={() => setPage('milestones')}>A little support for this conversation →</button></aside>;
  }
  const reminder =
    child.dateOfBirth && s?.reminders
      ? milestoneReminders(child.dateOfBirth, s.dismissed, date)[0]
      : null;
  if (!reminder) return null;
  return (
    <aside className="mb-7 p-5 rounded-xl bg-paper-deep">
      <p className="text-sm text-slate-600">
        A small invitation for {child.name}
      </p>
      <button
        onClick={() => setPage("milestones")}
        className="text-clay underline mt-2"
      >
        {reminder.kind === "current" ? "Revisit" : "Look ahead to"} the{" "}
        {reminder.item.month}-month checklist →
      </button>
    </aside>
  );
}
