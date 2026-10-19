import { GuidePreference } from "@/components/care/GuidePreference";
import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/appStore";
import { CareFrame, fieldClass } from "@/components/care/CareFrame";
import { useTodayDate } from "@/components/care/useTodayDate";
import { ageMonths } from "@/lib/shop";
import {
  GUIDE_BANDS,
  GUIDE_UPDATED,
  guidesForProfile,
  guideBand,
  type GuideBand,
} from "@/data/parent-guides";
export function ParentGuidesPage({ topic }: { topic: "puberty" | "safety" }) {
  const { children, selectedChildId } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  const today = useTodayDate();
  const recommended = guideBand(ageMonths(child?.dateOfBirth ?? null, today));
  const [chosen, setChosen] = useState<GuideBand | "">("");
  const path = child?.pubertyGuide ?? null;
  const band = chosen || recommended;
  const guides = guidesForProfile(topic, band, path);
  return (
    <CareFrame
      title={topic === "puberty" ? (child ? `${child.name}’s puberty guide` : "Guide to Puberty") : (child ? `Safety for ${child.name}` : "Safety")}
      intro={
        topic === "puberty"
          ? "Small, honest conversations about changing bodies. Prepare together, leave room for questions, and let your child grow at their own pace."
          : "Help them notice pressure, practise a boundary and find support. Keeping children safe is an adult responsibility; a child is never to blame for abuse."
      }
    >
      <div className="border-y py-6 mb-8 grid sm:grid-cols-2 gap-6">
        <label>
          Conversation age{" "}
          <select
            className={fieldClass}
            value={band ?? ""}
            onChange={(e) => setChosen(e.target.value as GuideBand)}
          >
            <option value="" disabled>
              Choose an age group
            </option>
            {GUIDE_BANDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <span className="block text-xs text-slate-500 mt-2">
            {recommended && !chosen
              ? "Starts with the selected child’s age. Explore another age anytime."
              : "Choose the language and level of detail that fit your child."}
          </span>
        </label>
        {topic === "puberty" && child && <GuidePreference key={child.id} child={child} />}
      </div>
      {!band && (
        <p className="py-10">
          Choose an age group to begin. You can explore without adding a birth
          date.
        </p>
      )}
      <div className="space-y-12">
        {guides.map((g) => (
          <article key={g.slug} className="border-b pb-10">
            <p className="text-sm text-clay mb-3">
              {band} · A conversation, not a checklist
            </p>
            <h2 className="font-heading text-3xl leading-tight">{g.title}</h2>
            <p className="text-slate-600 mt-5 leading-7">{g.explain}</p>
            <div className="bg-paper-deep rounded-2xl p-6 my-6">
              <p className="text-xs uppercase tracking-wider text-clay mb-3">
                Words you can borrow
              </p>
              <p className="font-heading text-2xl leading-relaxed">{g.say}</p>
            </div>
            <h3 className="font-heading text-xl mb-2">Try together</h3>
            <p className="leading-7">{g.practice}</p>
            <div className="border border-slate-300 rounded-2xl p-5 mt-6">
              <h3 className="font-heading text-xl">A small practice moment</h3>
              <p className="mt-3 leading-7">{g.scenario}</p>
              <details className="mt-4">
                <summary className="text-clay underline cursor-pointer py-2">
                  Explore a response
                </summary>
                <p className="pt-3 leading-7">{g.response}</p>
              </details>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-600">{g.care}</p>
            <Link
              href={`/articles/${g.slug}`}
              className="inline-block text-clay underline mt-5"
            >
              Read or share this guide, with sources →
            </Link>
          </article>
        ))}
      </div>
      {topic === "safety" && (
        <aside className="bg-paper-deep rounded-2xl p-6 mt-8">
          <h2 className="font-heading text-2xl">
            If your child tells you something happened
          </h2>
          <p className="mt-3 leading-7">
            Stay calm, listen without leading questions, and thank them for
            telling you. Say it was not their fault, including if they froze,
            could not say no or accepted a gift. Do not promise secrecy. Keep
            them safe from further contact and seek local child-protection or
            medical support. Immediate danger needs local emergency help.
          </p>
          <Link
            href="/help-now"
            className="inline-block text-clay underline mt-4"
          >
            Find immediate support →
          </Link>
        </aside>
      )}
      <p className="text-xs text-slate-500 mt-8 leading-6">
        Kahiye editorial · Sources checked {GUIDE_UPDATED}. General parent
        education; independent clinical and safeguarding review is still
        pending. Age groups guide conversation, not diagnosis. Your guide preference is saved to this child’s profile. Exploring another age stays on this screen. Neither changes health measurements or shopping preferences.
      </p>
    </CareFrame>
  );
}
