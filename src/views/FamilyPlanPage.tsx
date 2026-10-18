import { FinancialPartners } from "@/components/care/FinancialPartners";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useFamilyPlan } from "@/components/care/useFamilyPlan";
import {
  FamilyEntryForm,
  SavingsResult,
  actionClass,
  fieldClass,
} from "@/components/care/FamilyEntryForm";
import {
  blankValue,
  inr,
  nextBirthday,
  savingsProjection,
  type FamilyEntry,
} from "@/lib/family-planner";
import { useTodayDate } from "@/components/care/useTodayDate";

export function FamilyPlanPage() {
  const { children, setPage, selectChild } = useAppStore();
  const { data, error, busy, reload, save } = useFamilyPlan();
  const today = useTodayDate();
  const [filter, setFilter] = useState(""),
    [days, setDays] = useState(30),
    [showAmounts, setShowAmounts] = useState(false),
    [archive, setArchive] = useState(false),
    [draft, setDraft] = useState<FamilyEntry | null>(null),
    [notice, setNotice] = useState("");
  const end = new Date(Date.parse(today + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
  const who = (id: string | null) =>
    children.find((c) => c.id === id)?.name ?? "Whole family";
  const entries = (data?.entries ?? []).filter(
    (e) =>
      e.kind !== "memory" &&
      (!filter || e.child_id === filter || e.child_id === null),
  );
  const goals = entries.filter(
    (e) => e.kind === "goal" && e.value.archived === archive,
  );
  const dates = [
    ...entries
      .filter((e) => e.kind === "event" && e.value.archived === archive)
      .map((e) => ({
        id: e.id,
        child: e.child_id,
        title: e.value.title,
        date: e.value.date,
        source: "Added by you",
        entry: e,
      })),
    ...(!archive
      ? (data?.health ?? [])
          .filter((e) => !filter || e.child_id === filter)
          .map((e) => ({
            id: "health-" + e.id,
            child: e.child_id,
            title: e.title,
            date: e.date,
            source: "From your health diary",
            entry: null,
          }))
      : []),
    ...(!archive
      ? children
          .filter((c) => c.dateOfBirth && (!filter || c.id === filter))
          .map((c) => ({
            id: "birthday-" + c.id,
            child: c.id,
            title: `${c.name}’s birthday`,
            date: nextBirthday(c.dateOfBirth!, today),
            source: "Calculated from birth date",
            entry: null,
          }))
      : []),
    ...(!archive
      ? goals.map((e) => ({
          id: "goal-" + e.id,
          child: e.child_id,
          title: `Savings target: ${e.value.title}`,
          date: e.value.date,
          source: "Your savings goal",
          entry: e,
        }))
      : []),
  ]
    .filter((e) => archive || e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  function add(kind: "event" | "goal") {
    const value = blankValue();
    if (kind === "goal") {
      const nextYear = new Date(today + "T00:00:00Z");
      nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
      value.date = nextYear.toISOString().slice(0, 10);
    }
    setDraft({
      id: crypto.randomUUID(),
      child_id: filter || null,
      kind,
      revision: 0,
      value,
    });
    setNotice("");
  }
  async function archiveEntry(e: FamilyEntry) {
    try {
      await save({ ...e, value: { ...e.value, archived: !e.value.archived } });
      setNotice(
        e.value.archived
          ? "Restored."
          : "Archived. Turn on Show archived to restore it.",
      );
    } catch {
      /* Hook displays error */
    }
  }
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-28">
      <p className="text-clay text-sm">A little looking ahead</p>
      <h1 className="font-heading text-4xl mt-3">Your family, in view</h1>
      <div className="flex flex-wrap gap-5 text-sm text-clay my-5"><button className="underline" onClick={()=>setPage('gifts')}>Gifts & rewards →</button><button className="underline" onClick={()=>setPage('shop')}>Shop for Kids →</button></div>
      <p className="text-slate-600 mt-4 max-w-xl">
        Make room for the dates that matter and the things you’re saving
        towards. One family, at your pace.
      </p>
      <div className="flex flex-wrap gap-4 items-end my-7">
        <label className="grow">
          Whose plans?
          <select
            className={fieldClass}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Whole family overview</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} + shared plans
              </option>
            ))}
          </select>
        </label>
        <label>
          Look ahead
          <select
            className={fieldClass}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={365}>A year</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={actionClass}
          disabled={!data || busy || !!draft}
          onClick={() => add("event")}
        >
          Add a family date
        </button>
        <button
          className="px-5 py-3 rounded-full border border-clay text-clay disabled:opacity-50"
          disabled={!data || busy || !!draft}
          onClick={() => add("goal")}
        >
          Start a savings goal
        </button>
      </div>
      {error && (
        <div role="alert" className="my-5 text-red-700">
          <p>{error}</p>
          <button disabled={busy} onClick={reload} className="underline py-3">
            Reload saved records (keep draft)
          </button>
        </div>
      )}
      {!data && !error && (
        <p role="status" className="my-5">
          Loading your family plan…
        </p>
      )}
      {notice && (
        <p role="status" className="my-5">
          {notice}
        </p>
      )}
      {draft && (
        <FamilyEntryForm
          key={draft.id}
          initial={draft}
          children={children}
          busy={busy}
          latest={data?.entries.find((e) => e.id === draft.id)}
          onCancel={() => setDraft(null)}
          onSave={async (e) => {
            await save(e);
            setDraft(null);
            setNotice("Saved to your family plan.");
          }}
        />
      )}
      {data && (
        <>
          <div className="flex flex-wrap gap-5 mt-8 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={archive}
                onChange={(e) => setArchive(e.target.checked)}
              />
              Show archived
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAmounts}
                onChange={(e) => setShowAmounts(e.target.checked)}
              />
              Show savings amounts on this screen
            </label>
          </div>
          <section className="mt-9">
            <h2 className="font-heading text-2xl">
              {archive ? "Archived dates" : "Coming up & dates to review"}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Only dates you recorded or birthdays calculated from your
              profiles. Past planned dates remain here until you update or
              archive them.
            </p>
            {!dates.length && (
              <p className="py-8 text-slate-600">
                No saved dates in this view. Add a school event, a class or a
                celebration when you’re ready.
              </p>
            )}
            <ol className="mt-5 divide-y">
              {dates.map((d) => (
                <li
                  key={d.id}
                  className="py-5 flex flex-wrap gap-3 justify-between"
                >
                  <div className="min-w-0 break-words">
                    <p className="text-xs text-clay">
                      {d.date}
                      {d.date < today
                        ? " · Past planned date"
                        : d.date === today
                          ? " · Today"
                          : ""}
                    </p>
                    <h3 className="font-heading text-xl mt-1">{d.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {who(d.child)} · {d.source}
                    </p>
                    {d.entry?.value.note && (
                      <p className="text-sm whitespace-pre-wrap mt-2">
                        {d.entry.value.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {d.entry ? (
                      <>
                        <button
                          disabled={busy || !!draft}
                          className="text-clay underline py-2"
                          onClick={() => setDraft(d.entry)}
                        >
                          Edit
                        </button>
                        <button
                          disabled={busy}
                          className="underline py-2"
                          onClick={() => archiveEntry(d.entry!)}
                        >
                          {archive ? "Restore" : "Archive"}
                        </button>
                      </>
                    ) : (
                      d.id.startsWith("health-") && (
                        <button
                          className="text-clay underline py-2"
                          onClick={() => {
                            selectChild(d.child!);
                            setPage("health");
                          }}
                        >
                          Open diary
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-10">
            <h2 className="font-heading text-2xl">
              {archive
                ? "Archived savings goals"
                : "Little by little, for their future"}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              INR · Manual records, kept private. No bank connection or money
              movement.
            </p>
            {!goals.length && (
              <p className="py-8 text-slate-600">
                A course, a bicycle, future fees—start with one thing that
                matters. You choose the budget.
              </p>
            )}
            {goals.map((e) => (
              <article key={e.id} className="border-y py-6 mt-5">
                <p className="text-xs text-clay">
                  {who(e.child_id)} · Target {e.value.date}
                </p>
                <h3 className="font-heading text-2xl mt-2 break-words">
                  {e.value.title}
                </h3>
                {showAmounts ? (
                  <div className="mt-4">
                    <p className="text-sm mb-3">
                      Already saved: {inr(e.value.saved)} · Monthly plan:{" "}
                      {inr(e.value.monthly)}
                    </p>
                    <SavingsResult value={savingsProjection(e.value, today)} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-3">
                    Amounts hidden. Enable them above or edit this goal.
                  </p>
                )}
                <div className="flex gap-5 mt-4">
                  <button
                    disabled={busy || !!draft}
                    onClick={() => setDraft(e)}
                    className="text-clay underline py-2"
                  >
                    Edit goal / update saved amount
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => archiveEntry(e)}
                    className="underline py-2"
                  >
                    {archive ? "Restore" : "Archive"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      <SavingsGuide />
      <FinancialPartners />
    </div>
  );
}
function SavingsGuide() {
  return (
    <details className="border-y py-6 mt-10">
      <summary className="font-heading text-xl cursor-pointer">
        Understanding ways to save
      </summary>
      <p className="text-sm text-slate-600 my-4">
        An educational starting point for Indian families, reviewed 18 October
        2026. Match access to money, risk and maturity to your goal. Check
        current terms; no product or fund is selected for you.
      </p>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium">
            Savings account / recurring or fixed deposit
          </dt>
          <dd>
            Compare access, withdrawal penalties and the deposit terms. Keep
            near-term needs separate from money you can leave untouched.
          </dd>
        </div>
        <div>
          <dt className="font-medium">PPF / Sukanya Samriddhi</dt>
          <dd>
            Check eligibility, maturity and withdrawal rules before using a
            long-term scheme for a dated goal. Sukanya has age and other opening
            conditions; don’t assume eligibility from a profile or name.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Mutual funds and SIPs</dt>
          <dd>
            Values can rise or fall. A SIP is a way to contribute regularly, not
            a guaranteed-return product. Compare risk, costs and time horizon;
            personalised investment choices need an appropriate regulated
            adviser.
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-5 text-sm mt-5 text-clay underline">
        <a
          target="_blank"
          rel="noreferrer"
          href="https://investor.sebi.gov.in/moneymatters-budandfinangoal.html"
        >
          SEBI: goals and budgeting ↗
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://www.indiapost.gov.in/banking-services/savings"
        >
          India Post: current scheme details ↗
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://investor.sebi.gov.in/investment_advisor.html"
        >
          Understanding investment advisers ↗
        </a>
      </div>
    </details>
  );
}
