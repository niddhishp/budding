"use client";
import { useState } from "react";
import { PLAY } from "@/data/play";
import { ageMonths } from "@/lib/shop";
import { useTodayDate } from "@/components/care/useTodayDate";
import { useAppStore } from "@/stores/appStore";
import { useCare } from "@/components/care/useCare";
import { CareFrame, CareError, fieldClass } from "@/components/care/CareFrame";
export function PlayPage() {
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === s.selectedChildId),
  );
  return child ? <PlayChild key={child.id} child={child} /> : null;
}
function PlayChild({ child }: { child: import("@/types").Child }) {
  const care = useCare(child.id);
  const setEditingChild = useAppStore((s) => s.setEditingChild);
  const [kind, setKind] = useState("All"),
    [saved, setSaved] = useState(false);
  const today = useTodayDate();
  const months = ageMonths(child.dateOfBirth ?? null, today);
  const items = PLAY.filter(
    (p) =>
      (kind === "All" || p.kind === kind) &&
      (months !== null && months >= p.min && months <= p.max) &&
      (!saved || care.data?.settings.favourites.includes(p.id)),
  );
  return (
    <CareFrame
      title="A little room to play"
      intro={`Simple invitations for ${child.name}, with things you may already have. Follow their interest and abilities; there is nothing to finish or get right.`}
    >
      <CareError error={care.error} reload={care.reload} />
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          Energy today
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={fieldClass}
          >
            {["All", "Quiet", "Movement", "Explore", "Outdoor"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <div>
          <p className="font-heading text-xl">For {child.name}’s age</p>
          <p className="text-sm text-slate-600 mt-2">
            Based on the date of birth in their profile. Activities update
            automatically as they grow.
          </p>
        </div>
      </div>
      <label className="flex gap-3 mt-6">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        Only my saved activities
      </label>
      <p role="status" className="text-sm text-slate-500 mt-4">
        {items.length} {items.length===1?'invitation':'invitations'}
      </p>
      <div className="divide-y mt-5">
        {items.map((p) => {
          const favourite = care.data?.settings.favourites.includes(p.id);
          return (
            <article key={p.id} className="py-8">
              <p className="text-sm text-clay">
                {p.kind} · {p.time} · {p.min >= 72 ? `${Math.floor(p.min / 12)}–${Math.floor(p.max / 12)} years` : `${p.min}–${p.max} months`}
              </p>
              <h2 className="font-heading text-3xl mt-2">{p.title}</h2>
              <p className="mt-4 text-slate-600">Bring: {p.materials}</p>
              <ol className="list-decimal pl-5 mt-4 space-y-2">
                {p.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="text-sm text-slate-600 bg-paper-deep rounded-xl p-4 mt-5">
                <strong>Stay close:</strong> {p.safety}
              </p>
              <button
                aria-pressed={!!favourite}
                disabled={!care.data || care.busy}
                className="text-clay underline py-3 mt-2 disabled:opacity-50"
                onClick={() => {
                  if (care.data)
                    void care
                      .save({
                        ...care.data.settings,
                        favourites: favourite
                          ? care.data.settings.favourites.filter(
                              (id) => id !== p.id,
                            )
                          : [...care.data.settings.favourites, p.id],
                      })
                      .catch(() => {});
                }}
              >
                {favourite ? "Remove from saved" : "Save this activity"}
              </button>
            </article>
          );
        })}
      </div>
      {!items.length && (
        <div className="py-10">
          {months === null
            ? <>
                <p>Add or check the date of birth in {child.name}’s profile so we can show activities for their age.</p>
                <button className="text-clay underline mt-3" onClick={() => setEditingChild(child.id)}>Update child profile</button>
              </>
            : <p>{saved
                ? `No saved activities match ${child.name}’s age and this energy filter. Turn off “Only my saved activities” or try another energy level. Your other saved activities are still kept.`
                : `No activities match ${child.name}’s age and this energy filter yet. Try another energy level.`}</p>}
        </div>
      )}
      <p className="text-sm text-slate-500 border-t pt-5">
        Kahiye play invitations, informed by{" "}
        <a
          href="https://www.nhs.uk/baby/babys-development/play-and-learning/baby-and-toddler-play-ideas/"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          NHS play guidance
        </a>
        . They support shared time, not a promise of faster development. Always
        supervise and adapt to your child’s needs.
      </p>
    </CareFrame>
  );
}
