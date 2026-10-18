import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useShop } from "@/components/care/useShop";
import {
  CareFrame,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import { ageMonths, emptyGift, giftIdeas, type ShopRecord } from "@/lib/shop";
import { nextBirthday } from "@/lib/family-planner";
import { useTodayDate } from "@/components/care/useTodayDate";
type GiftRecord = Extract<ShopRecord, { kind: "gift" }>;
export function GiftsPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const { children, selectedChildId, setPage } = useAppStore(),
    child = children.find((c) => c.id === selectedChildId);
  const { data, error, busy, reload, save } = useShop();
  const [draft, setDraft] = useState<GiftRecord | null>(null),
    [archived, setArchived] = useState(false);
  const today = useTodayDate();
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [draft?.id]);
  if (!child) return null;
  const records = data?.records.filter((r) => r.childId === child.id) ?? [],
    pref = records.find((r) => r.kind === "preferences");
  const ideas = giftIdeas(
    ageMonths(child.dateOfBirth, today),
    pref?.kind === "preferences" ? pref.value.interests : [],
  );
  function newGift(idea = "") {
    if (!child || !data) return;
    setDraft({
      id: crypto.randomUUID(),
      childId: child.id,
      revision: 0,
      kind: "gift",
      value: {
        ...emptyGift,
        idea,
        budget: pref?.kind === "preferences" ? pref.value.budget : 0,
      },
    });
  }
  return (
    <CareFrame
      title="Gifts & little celebrations"
      intro={`For ${child.name}: thoughtful occasions, shared experiences and encouragement that feels good.`}
    >
      <div className="bg-paper-deep rounded-2xl p-6">
        <p className="text-clay text-sm">
          {child.dateOfBirth
            ? `Next birthday · ${nextBirthday(child.dateOfBirth, today)}`
            : "Something to look forward to"}
        </p>
        <h2 className="font-heading text-2xl mt-3">
          Time together belongs on the list.
        </h2>
        <div className="divide-y mt-4">
          {ideas.map((idea) => (
            <div className="py-4" key={idea}>
              <p>{idea}</p>
              <button
                className="underline text-clay text-sm mt-2"
                onClick={() => newGift(idea)}
              >
                Make this a plan
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-5 my-7">
        <button className={buttonClass} onClick={() => newGift()}>
          Plan a gift or reward
        </button>
        <button className="text-clay underline" onClick={() => setPage("shop")}>
          Browse Shop for Kids →
        </button>
      </div>
      <p className="text-sm text-slate-600">
        Celebrate effort with a small, agreed step and a choice of recognition.
        Keep food, weight, grades, affection and feelings out of reward targets.
        Gifts never depend on using our referral links.
      </p>
      {error && (
        <div role="alert" className="border p-4 mt-5">
          {error}
          <button
            className="block underline mt-2"
            onClick={() => void reload()}
          >
            Reload saved records; keep my draft
          </button>
        </div>
      )}
      {draft && (
        <form
          ref={formRef}
          className="border rounded-2xl p-5 my-7"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await save(draft)) setDraft(null);
          }}
        >
          <h2 className="font-heading text-2xl">A thoughtful plan</h2>
          <label className="block text-sm my-4">
            What are you celebrating?
            <input
              required
              maxLength={100}
              className={fieldClass}
              value={draft.value.title}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  value: { ...draft.value, title: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm my-4">
            Kind
            <select
              className={fieldClass}
              value={draft.value.kind}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  value: {
                    ...draft.value,
                    kind: e.target.value as "occasion" | "reward",
                  },
                })
              }
            >
              <option value="occasion">An occasion or just because</option>
              <option value="reward">An agreed effort to recognise</option>
            </select>
          </label>
          <div className="sm:grid grid-cols-2 gap-4">
            <label className="block text-sm my-4">
              Date (optional)
              <input
                type="date"
                className={fieldClass}
                value={draft.value.date ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, date: e.target.value || null },
                  })
                }
              />
            </label>
            <label className="block text-sm my-4">
              Budget (₹; free is welcome)
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                className={fieldClass}
                value={draft.value.budget}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, budget: Number(e.target.value) },
                  })
                }
              />
            </label>
          </div>
          <label className="block text-sm my-4">
            Gift or experience idea
            <textarea
              className={fieldClass}
              maxLength={500}
              value={draft.value.idea}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  value: { ...draft.value, idea: e.target.value },
                })
              }
            />
          </label>
          {draft.value.kind === "reward" && (
            <label className="block text-sm my-4">
              The small step and recognition you agreed together
              <textarea
                required
                className={fieldClass}
                maxLength={500}
                placeholder="For example: put art materials away after three sessions; choose our next park outing."
                value={draft.value.agreement}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, agreement: e.target.value },
                  })
                }
              />
            </label>
          )}
          <label className="block text-sm my-4">
            Status
            <select
              className={fieldClass}
              value={draft.value.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  value: {
                    ...draft.value,
                    status: e.target.value as typeof draft.value.status,
                  },
                })
              }
            >
              {["considering", "planned", "given", "archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button disabled={busy} className={buttonClass}>
            Save plan
          </button>
          <button
            disabled={busy}
            type="button"
            className="ml-5"
            onClick={() => setDraft(null)}
          >
            Cancel
          </button>
        </form>
      )}
      <label className="flex gap-2 text-sm mt-8">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Show archived plans
      </label>
      {!data && !error && (
        <p role="status" className="my-5">
          Loading your plans…
        </p>
      )}
      {data &&
        records.filter(
          (r) =>
            r.kind === "gift" && (r.value.status === "archived") === archived,
        ).length === 0 && (
          <p className="my-8 text-slate-600">
            Your next thoughtful idea can start here.
          </p>
        )}
      {records
        .filter(
          (r): r is GiftRecord =>
            r.kind === "gift" && (r.value.status === "archived") === archived,
        )
        .sort((a, b) =>
          (a.value.date ?? "9999").localeCompare(b.value.date ?? "9999"),
        )
        .map((r) => (
          <article key={r.id} className="border-b py-6">
            <p className="text-sm text-clay">
              {r.value.date ?? "Whenever it feels right"} · {r.value.status} · ₹
              {r.value.budget.toLocaleString("en-IN")}
            </p>
            <h2 className="font-heading text-2xl mt-2">{r.value.title}</h2>
            <p className="mt-3">{r.value.idea}</p>
            {r.value.kind === "reward" && (
              <p className="text-sm mt-2">Our agreement: {r.value.agreement}</p>
            )}
            <button
              className="text-clay underline mt-3"
              onClick={() => setDraft(r)}
            >
              Edit plan
            </button>
          </article>
        ))}
    </CareFrame>
  );
}
