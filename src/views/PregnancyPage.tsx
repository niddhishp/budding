"use client";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { ageDays, todayDate } from "@/lib/family-care";
import {
  CareFrame,
  CareError,
  fieldClass,
  buttonClass,
} from "@/components/care/CareFrame";
import { useCare } from "@/components/care/useCare";
const preparations = [
  ["team", "Know how to reach my maternity team, including after hours"],
  ["appointments", "Keep appointment dates and questions together"],
  ["support", "Choose who can help with meals, transport and rest"],
  ["bag", "Prepare documents, prescribed medicines and a hospital bag"],
  ["home", "Arrange a safe sleep space and the journey home"],
  ["after", "Plan support for feeding, recovery and emotional wellbeing"],
];
const trimesters = [
  {
    title: "Finding your footing",
    text: "Early pregnancy can bring uncertainty as well as excitement. Arrange antenatal care, review medicines and supplements with your clinician, and make room for rest. You do not have to announce the pregnancy or feel a particular way on a deadline.",
    questions: [
      "Who should I contact between appointments?",
      "Which medicines and supplements are right for me?",
      "What screening choices and appointments are coming up?",
    ],
  },
  {
    title: "Making room for change",
    text: "Use appointments to ask about your own wellbeing as well as the baby. Comfortable movement, food you can manage and practical support can all belong in the plan. If movement becomes uncomfortable or your pregnancy has specific risks, ask your maternity team what to adapt.",
    questions: [
      "What do my results mean for my care?",
      "What should I know as I begin noticing my baby’s movements?",
      "What work, travel or activity adjustments would help?",
    ],
  },
  {
    title: "Preparing with support",
    text: "Make a practical plan for getting to care, support during labour and the first days at home. A birth preference is a conversation with your team, with room for circumstances to change. Arrange help for your recovery, not only things for the baby.",
    questions: [
      "When should I call or come in, and where do I go?",
      "What are my pain relief and support options?",
      "What is our plan if the due date passes?",
    ],
  },
];
export function PregnancyPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  return child ? <PregnancyChild key={child.id} child={child} /> : null;
}
function PregnancyChild({ child }: { child: import("@/types").Child }) {
  const care = useCare(child.id);
  const edit = useAppStore((s) => s.setEditingChild);
  const [draft, setDraft] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const due = child.dueDate;
  const days = due ? 280 + ageDays(due, todayDate()) : null;
  const week = days === null ? null : Math.max(0, Math.floor(days / 7));
  const trimester = week === null ? 0 : week < 14 ? 0 : week < 28 ? 1 : 2;
  const guide = trimesters[trimester];
  const settings = care.data?.settings;
  return (
    <CareFrame
      title="Room for you, too"
      intro="Pregnancy is more than a countdown. A place for your questions, practical preparations and the people who will support you."
    >
      <CareError
        error={care.error}
        reload={() => {
          setDraft(null);
          care.reload();
        }}
      />
      {child.dateOfBirth ? (
        <div className="bg-paper-deep p-5 rounded-xl">
          This profile has a birth date. Your pregnancy notes remain here to
          revisit.
        </div>
      ) : (
        <>
          <section className="border-y py-6 mb-8">
            <p className="text-clay">
              {week === null
                ? "Your pregnancy space"
                : `About ${week} weeks${days !== null ? ` + ${Math.max(0, days % 7)} days` : ""} · Trimester ${trimester + 1}`}
            </p>
            <h2 className="font-heading text-3xl mt-3">{guide.title}</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">{guide.text}</p>
            <p className="text-sm mt-4">
              {due
                ? `Estimated due date: ${due}. Dating is based on the date in your profile; your maternity team’s dating takes priority.`
                : "Add your clinician’s estimated due date in the profile for week-based guidance."}
            </p>
            {week !== null && week >= 40 && (
              <p className="mt-4 font-medium">
                At or beyond your estimated due date: follow your maternity
                team’s agreed follow-up plan. This app does not monitor your
                pregnancy.
              </p>
            )}
            <button
              className="text-clay underline py-3 mt-2"
              onClick={() => edit(child.id)}
            >
              Update due date or record the birth
            </button>
          </section>
          <h2 className="font-heading text-2xl mb-4">
            Questions for your next appointment
          </h2>
          <ul className="list-disc pl-5 space-y-3 mb-8">
            {guide.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </>
      )}
      <aside className="border-l-4 border-clay bg-paper-deep p-5 my-8">
        <h2 className="font-heading text-xl">When to contact care promptly</h2>
        <p className="mt-3 leading-relaxed">
          Contact your maternity team urgently for bleeding, severe or
          persistent pain, a severe headache or vision changes, fever, or
          feeling seriously unwell. Seek emergency care for severe breathing
          difficulty, collapse or heavy bleeding. This is not an exhaustive
          list.
        </p>
        <p className="mt-3 leading-relaxed">
          Once you are noticing your baby’s movements, a reduction or change
          from their usual pattern needs immediate contact with your maternity
          team. Do not wait until the next day or use an app or home heartbeat
          device for reassurance.
        </p>
        <a
          className="block underline text-clay mt-3"
          href="https://www.nhs.uk/pregnancy/common-symptoms/pregnancy-symptoms-you-need-to-get-help-for/"
          target="_blank"
          rel="noreferrer"
        >
          Read NHS guidance on symptoms needing help ↗
        </a>
        <a
          className="block underline text-clay mt-2"
          href="https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/"
          target="_blank"
          rel="noreferrer"
        >
          Read about changes in baby movements ↗
        </a>
      </aside>
      {!care.data && !care.error && (
        <p role="status">Loading your preparations…</p>
      )}
      {settings && (
        <>
          <h2 className="font-heading text-2xl mt-10 mb-4">
            A few useful preparations
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Choose what helps. These are personal reminders, not a medical care
            schedule.
          </p>
          <div className="divide-y">
            {preparations.map(([id, label]) => (
              <label key={id} className="flex gap-3 py-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={care.busy}
                  checked={settings.pregnancyChecklist.includes(id)}
                  onChange={(e) =>
                    void care
                      .save({
                        ...settings,
                        pregnancyChecklist: e.target.checked
                          ? [...settings.pregnancyChecklist, id]
                          : settings.pregnancyChecklist.filter((v) => v !== id),
                      })
                      .catch(() => {})
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <form
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              void care
                .save({
                  ...settings,
                  pregnancyNotes: draft ?? settings.pregnancyNotes,
                })
                .then(() => {
                  setDraft(null);
                  setMessage("Your notes are saved.");
                })
                .catch(() => {});
            }}
          >
            <label className="font-heading text-2xl">
              Your questions & support plan
              <textarea
                className={`${fieldClass} font-sans text-base h-44`}
                value={draft ?? settings.pregnancyNotes}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setMessage("");
                }}
                maxLength={3000}
                placeholder="Questions for the team, who can help, what would make the next few weeks easier…"
              />
            </label>
            <p className="text-sm text-slate-500 my-3">
              Private to your account. Not added to AI memory or sent to your
              maternity team. Avoid storing passwords or full medical documents
              here.
            </p>
            <button
              disabled={care.busy || draft === null}
              className={buttonClass}
            >
              {care.busy ? "Saving…" : "Save my notes"}
            </button>
            <p role="status" className="text-sm text-leaf mt-3">
              {message}
            </p>
          </form>
        </>
      )}
      <section className="border-t mt-10 pt-6">
        <h2 className="font-heading text-2xl mb-4">
          Keep a trusted reference nearby
        </h2>
        <ul className="space-y-4 text-clay underline">
          <li>
            <a
              href="https://www.nhs.uk/pregnancy/your-pregnancy-care/your-antenatal-care-and-appointments/"
              target="_blank"
              rel="noreferrer"
            >
              Antenatal appointments: questions and what to expect ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nhs.uk/start-for-life/pregnancy/preparing-for-labour-and-birth/hospital-bag-checklist/"
              target="_blank"
              rel="noreferrer"
            >
              Planning a hospital bag ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.nhs.uk/pregnancy/keeping-well/exercise/"
              target="_blank"
              rel="noreferrer"
            >
              Movement during pregnancy ↗
            </a>
          </li>
        </ul>
        <p className="text-sm text-slate-500 mt-5">
          These UK public-health references provide general information; your
          local maternity team determines your appointments and care. Kahiye’s
          editorial guidance has not yet had independent clinical review.
        </p>
      </section>
    </CareFrame>
  );
}
