import { useState } from "react";
import {
  Gift,
  Shirt,
  BookOpen,
  Palette,
  Puzzle,
  Music,
  Footprints,
  Wrench,
  Leaf,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useShop } from "@/components/care/useShop";
import { ShopPreferences } from "@/components/care/ShopPreferences";
import {
  CareFrame,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import {
  ageMonths,
  emptyPreferences,
  feedbackChoices,
  rankProducts,
  type ShopRecord,
} from "@/lib/shop";
import { useTodayDate } from "@/components/care/useTodayDate";
const icons = {
  clothing: Shirt,
  books: BookOpen,
  art: Palette,
  games: Puzzle,
  movement: Footprints,
  music: Music,
  making: Wrench,
  nature: Leaf,
};
export function ShopPage() {
  const { children, selectedChildId, setPage } = useAppStore(),
    child = children.find((c) => c.id === selectedChildId);
  const { data, error, busy, reload, save, remove } = useShop();
  const today = useTodayDate();
  const [preferences, setPreferences] = useState<Extract<
      ShopRecord,
      { kind: "preferences" }
    > | null>(null),
    [feedback, setFeedback] = useState<{
      id: string;
      recordId: string;
      revision: number;
      choice: (typeof feedbackChoices)[number];
      reason: string;
    } | null>(null),
    [savedOnly, setSavedOnly] = useState(false),
    [notice, setNotice] = useState("");
  if (!child) return null;
  const records = data?.records.filter((r) => r.childId === child.id) ?? [],
    pref = records.find((r) => r.kind === "preferences"),
    p = pref?.kind === "preferences" ? pref.value : emptyPreferences;
  const ranked = rankProducts(
    data?.products ?? [],
    ageMonths(child.dateOfBirth, today),
    p,
    records,
    today,
  ).filter(
    (v) =>
      !savedOnly ||
      records.some(
        (r) =>
          r.kind === "feedback" &&
          r.value.productId === v.id &&
          r.value.choice === "saved",
      ),
  );
  async function recordFeedback() {
    if (!feedback || !child) return;
    if (
      await save({
        id: feedback.recordId,
        childId: child.id,
        revision: feedback.revision,
        kind: "feedback",
        value: {
          productId: feedback.id,
          choice: feedback.choice,
          reason: feedback.reason,
          until: null,
        },
      })
    ) {
      setFeedback(null);
      setNotice("Saved. You can undo this in Your choices below.");
    }
  }
  return (
    <CareFrame
      title="Shop for Kids"
      intro={`A few useful things for ${child.name}, chosen with care. There is no need to buy something to make a good day.`}
    >
      <div className="bg-paper-deep rounded-2xl p-6 flex items-start gap-5">
        <Gift className="text-clay shrink-0 mt-1" size={32} />
        <div>
          <h2 className="font-heading text-2xl">
            A little thought goes a long way
          </h2>
          <p className="text-sm mt-2 text-slate-600">
            Start with the occasion, their interests and a budget that feels
            comfortable.
          </p>
          <button
            className="text-clay underline mt-4"
            onClick={() => setPage("gifts")}
          >
            Plan a gift or a small celebration →
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-5 items-center my-6">
        <button
          className={buttonClass}
          disabled={!data || busy}
          onClick={() =>
            setPreferences(
              pref?.kind === "preferences"
                ? pref
                : {
                    id: crypto.randomUUID(),
                    childId: child.id,
                    kind: "preferences",
                    revision: 0,
                    value: p,
                  },
            )
          }
        >
          Edit shopping preferences
        </button>
        <label className="text-sm flex gap-2">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
          />
          Saved ideas only
        </label>
      </div>
      <p className="text-sm text-slate-600">
        {p.budget
          ? `Your guide: up to ₹${p.budget.toLocaleString("en-IN")}. `
          : ""}
        {p.size ? `Size note: ${p.size}. ` : ""}Age suitability comes first,
        then your shopping interests and style. Referral fees never affect this
        order.
      </p>
      {error && (
        <div role="alert" className="border border-clay p-4 my-4">
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
      {preferences && (
        <ShopPreferences
          initial={preferences.value}
          busy={busy}
          onCancel={() => setPreferences(null)}
          onSave={(v) => save({ ...preferences, value: v })}
        />
      )}
      {!data && !error && (
        <p role="status" className="py-10">
          Finding the collection…
        </p>
      )}
      {data && ranked.length === 0 && (
        <div className="py-12 border-y my-8">
          <p className="font-heading text-2xl">
            Good things take a little choosing.
          </p>
          <p className="text-slate-600 mt-3">
            {savedOnly
              ? "No saved ideas match the current selection."
              : "There are no reviewed products matching this age and these choices yet. Your preferences are ready for the next collection."}
          </p>
          <button
            className="text-clay underline mt-4"
            onClick={() => setPage("gifts")}
          >
            Explore gifts that don’t need a purchase →
          </button>
        </div>
      )}
      <div className="divide-y mt-8">
        {ranked.map((v) => {
          const Icon = icons[v.category];
          return (
            <article
              key={v.id}
              className="py-8 sm:grid sm:grid-cols-[100px_1fr] gap-7"
            >
              <div className="bg-paper-deep rounded-2xl w-20 h-20 flex items-center justify-center text-clay mb-4">
                <Icon size={38} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-clay">
                  {v.category} ·{" "}
                  {v.minMonths / 12 >= 1
                    ? `${Math.floor(v.minMonths / 12)}+ years`
                    : `${v.minMonths}+ months`}
                </p>
                <h2 className="font-heading text-2xl mt-2">{v.title}</h2>
                <p className="mt-3">{v.reason}</p>
                <p className="text-sm text-slate-600 mt-2">{v.match}</p>
                <details className="text-sm mt-3">
                  <summary className="cursor-pointer underline">
                    Before choosing this
                  </summary>
                  <p className="mt-3">{v.safety}</p>
                  <p className="mt-2">{v.sizeNotes}</p>
                  <p className="mt-2">
                    Review valid through {v.reviewUntil}. Check price, fit,
                    seller, delivery and returns on Amazon.
                  </p>
                </details>
                <div className="flex flex-wrap gap-5 mt-5">
                  <a
                    href={v.url}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="text-clay underline"
                  >
                    View on Amazon ↗ {v.affiliate ? "(paid link)" : ""}
                  </a>
                  {v.affiliate && (
                    <a
                      href={v.plainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      Without referral
                    </a>
                  )}
                  <button
                    className="underline text-sm"
                    onClick={() => {
                      const old = records.find(
                        (r) =>
                          r.kind === "feedback" && r.value.productId === v.id,
                      );
                      setFeedback({
                        id: v.id,
                        recordId: old?.id ?? crypto.randomUUID(),
                        revision: old?.revision ?? 0,
                        choice: "saved",
                        reason: "",
                      });
                    }}
                  >
                    Save or tell us what you think
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {feedback && (
        <form
          className="border border-clay rounded-2xl p-5 my-6"
          onSubmit={(e) => {
            e.preventDefault();
            void recordFeedback();
          }}
        >
          <h2 className="font-heading text-xl">How does this fit?</h2>
          <label className="block text-sm mt-4">
            Your choice
            <select
              className={fieldClass}
              value={feedback.choice}
              onChange={(e) =>
                setFeedback({
                  ...feedback,
                  choice: e.target.value as typeof feedback.choice,
                })
              }
            >
              {feedbackChoices.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm mt-4">
            Why? (optional)
            <textarea
              className={fieldClass}
              maxLength={300}
              value={feedback.reason}
              onChange={(e) =>
                setFeedback({ ...feedback, reason: e.target.value })
              }
            />
          </label>
          <p className="text-xs mt-3 text-slate-600">
            This applies to this product only. “Not now” rests it for 30 days.
            Use shopping preferences for broader changes.
          </p>
          <button disabled={busy} className={buttonClass + " mt-4"}>
            Save choice
          </button>
          <button
            type="button"
            className="ml-5"
            onClick={() => setFeedback(null)}
          >
            Cancel
          </button>
        </form>
      )}
      <details className="border-y py-5 my-8">
        <summary className="cursor-pointer font-heading text-xl">
          Your choices · review & undo
        </summary>
        <p className="text-sm text-slate-600 my-3">
          Nothing is marked purchased unless you tell us. Removing a choice lets
          that product return if it still fits.
        </p>
        {records
          .filter((r) => r.kind === "feedback")
          .map(
            (r) =>
              r.kind === "feedback" && (
                <div key={r.id} className="py-3 border-t text-sm">
                  <p>
                    {data?.products.find((p) => p.id === r.value.productId)
                      ?.title ?? "Previously reviewed product"}{" "}
                    · {r.value.choice.replaceAll("_", " ")}
                  </p>
                  <p className="text-slate-600">
                    {r.value.reason}
                    {r.value.until ? ` · Until ${r.value.until}` : ""}
                  </p>
                  <button
                    disabled={busy}
                    className="underline text-clay mt-2"
                    onClick={() => void remove(r)}
                  >
                    Undo choice
                  </button>
                </div>
              ),
          )}
        {pref && (
          <button
            disabled={busy}
            className="underline text-clay mt-4"
            onClick={() => void remove(pref)}
          >
            Reset shopping preferences
          </button>
        )}
      </details>
      {data?.affiliate && (
        <p className="text-xs text-slate-600">
          As an Amazon Associate I earn from qualifying purchases. Paid links
          may earn Kahiye a referral fee. We do not sell placements in this
          collection.
        </p>
      )}
    </CareFrame>
  );
}
