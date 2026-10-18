"use client";
import { useState } from "react";
import type { Child } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { useNotebook } from "@/components/care/useNotebook";
import {
  CareFrame,
  CareError,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import {
  interestBand,
  type InterestsBook,
  type InterestId,
} from "@/lib/profile-notebook";
import { todayDate } from "@/lib/family-care";
import { interestAreas, scenes } from "@/data/interest-exploration";
export function InterestsPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  return child ? <InterestChild key={child.id} child={child} /> : null;
}
function InterestChild({ child }: { child: Child }) {
  const book = useNotebook(child.id);
  return (
    <CareFrame
      title={`${child.name}’s interests & talents`}
      intro="Notice what lights them up. Give it space to grow, and leave room for something new."
    >
      <CareError error={book.error} reload={book.reload} />
      {!child.dateOfBirth ? (
        <p>
          After birth, this space can hold the things your child enjoys
          exploring.
        </p>
      ) : book.data ? (
        <InterestEditor
          key={`${child.id}-${book.data.interests.revision}`}
          child={child}
          saved={book.data.interests.value}
          busy={book.busy}
          save={(value) => book.save("interests", value)}
        />
      ) : !book.error ? (
        <p role="status">Loading their interests…</p>
      ) : null}
    </CareFrame>
  );
}
function InterestEditor({
  child,
  saved,
  busy,
  save,
}: {
  child: Child;
  saved: InterestsBook;
  busy: boolean;
  save: (v: InterestsBook) => Promise<unknown>;
}) {
  const band = interestBand(child.age.years),
    [selected, setSelected] = useState(saved.selected),
    [answers, setAnswers] = useState<InterestId[][]>(saved.answers),
    [note, setNote] = useState(saved.note),
    [step, setStep] = useState<number | null>(null),
    [error, setError] = useState("");
  function toggle(id: InterestId) {
    setSelected((s) =>
      s.includes(id) ? s.filter((v) => v !== id) : [...s, id],
    );
  }
  async function persist() {
    setError("");
    try {
      await save({ selected, answers, note, band, updatedOn: todayDate() });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div>
      <section className="bg-paper-deep rounded-[1.75rem] p-6 sm:p-8 mb-8">
        <p className="text-sm text-clay mb-3">
          {band === "baby"
            ? "A season of discovery"
            : "A little exploration, no right answers"}
        </p>
        <h2 className="font-heading text-3xl mb-3">
          {band === "baby"
            ? "Follow their curiosity."
            : "What do they love coming back to?"}
        </h2>
        <p className="text-slate-600 leading-relaxed">
          {band === "baby"
            ? "Babies do not need a talent test. Notice what they enjoy and offer varied, safe play."
            : "This is a conversation about interests, not an aptitude test or a prediction of innate talent. Choose more than one, skip anything, and change your mind later."}
        </p>
        {band !== "baby" && (
          <button
            className={`${buttonClass} mt-5`}
            onClick={() => setStep(0)}
            disabled={busy}
          >
            Explore together · 3 playful prompts
          </button>
        )}
      </section>
      {saved.updatedOn && (
        <p className="text-sm text-slate-600 mb-5" role="status">
          Saved {saved.updatedOn}.
          {saved.band && saved.band !== band
            ? " They are in a new age stage; revisit what feels right now."
            : " Interests can change. Come back whenever you like."}
        </p>
      )}
      {step !== null && band !== "baby" ? (
        <section className="border border-clay rounded-2xl p-5 sm:p-7 mb-8">
          <p className="text-sm text-clay mb-3">
            {step + 1} of 3 · pick any that fit
          </p>
          <h2 className="font-heading text-2xl mb-5">{scenes[band][step]}</h2>
          <Choices
            selected={answers[step] ?? []}
            disabled={busy}
            toggle={(id) =>
              setAnswers((a) => {
                const next = Array.from({ length: 3 }, (_, i) => a[i] ?? []);
                next[step] = next[step].includes(id)
                  ? next[step].filter((v) => v !== id)
                  : [...next[step], id];
                return next;
              })
            }
          />
          <div className="flex flex-wrap gap-4 mt-6">
            {step > 0 && (
              <button className="underline" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button
              className={buttonClass}
              onClick={() => {
                if (step < 2) setStep(step + 1);
                else {
                  setSelected([...new Set(answers.flat())]);
                  setStep(null);
                }
              }}
            >
              {step < 2 ? "Next invitation" : "See activity ideas"}
            </button>
            <button
              className="underline"
              onClick={() => {
                const next = Array.from({ length: 3 }, (_, i) =>
                  i === step ? [] : (answers[i] ?? []),
                );
                setAnswers(next);
                if (step < 2) setStep(step + 1);
                else {
                  setSelected([...new Set(next.flat())]);
                  setStep(null);
                }
              }}
            >
              Skip this one
            </button>
            <button className="underline" onClick={() => setStep(null)}>
              Close prompts
            </button>
          </div>
        </section>
      ) : (
        <>
          <h2 className="font-heading text-2xl mb-2">Enjoying right now</h2>
          <p className="text-sm text-slate-600 mb-5">
            Choose together when possible. These choices describe interests you
            have noticed, not measured ability.
          </p>
          <Choices selected={selected} toggle={toggle} disabled={busy} />
          <label className="block mt-6">
            A moment you noticed, a class they enjoy, or their own words
            <textarea
              rows={3}
              className={fieldClass}
              maxLength={1500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="What did they choose? What would they like to try next?"
            />
          </label>
          <div className="flex flex-wrap gap-5 mt-5">
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => void persist()}
            >
              {busy ? "Saving…" : "Save interests"}
            </button>
            <button
              className="underline"
              disabled={busy}
              onClick={() => {
                setSelected([]);
                setAnswers([]);
                setNote("");
              }}
            >
              Clear draft choices
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Changes are saved only when you choose Save interests.
          </p>
          {error && (
            <p role="alert" className="text-red-800 mt-4">
              {error}
            </p>
          )}
          <section className="mt-10">
            <h2 className="font-heading text-2xl mb-5">
              Make a little room for it
            </h2>
            {selected.length ? (
              interestAreas
                .filter((a) => selected.includes(a.id))
                .map((a) => (
                  <article key={a.id} className="border-t py-5">
                    <h3 className="font-heading text-xl">{a.label}</h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                      {a.ideas[band]}
                    </p>
                  </article>
                ))
            ) : (
              <p className="text-slate-600">
                No favourites yet is fine. Try a little art, movement, music,
                making and outdoor time, then notice what they ask to do again.
              </p>
            )}
            <p className="text-sm mt-5 text-slate-600">
              Keep practice short enough to stay enjoyable. Ask whether they
              want help, company or space. Rest and changing interests are
              welcome; avoid comparing siblings.
            </p>
          </section>
        </>
      )}
      <p className="text-xs text-slate-500 mt-8">
        Private to this child’s profile. These observations are not added to AI
        memory automatically.
      </p>
    </div>
  );
}
function Choices({
  selected,
  toggle,
  disabled,
}: {
  selected: InterestId[];
  toggle: (id: InterestId) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {interestAreas.map((a) => (
        <button
          key={a.id}
          aria-pressed={selected.includes(a.id)}
          disabled={disabled}
          onClick={() => toggle(a.id)}
          className={`text-left rounded-xl border p-4 transition-colors ${selected.includes(a.id) ? "border-clay bg-clay/10" : "border-slate-300 bg-paper hover:border-clay"}`}
        >
          <span className="block font-medium">
            {selected.includes(a.id) ? "✓ " : ""}
            {a.label}
          </span>
          <span className="block text-sm text-slate-600 mt-1">
            {a.invitation}
          </span>
        </button>
      ))}
    </div>
  );
}
