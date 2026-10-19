"use client";
import { useState } from "react";
import { PLAY } from "@/data/play";
import { ageMonths } from "@/lib/family-care";
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
  const [kind, setKind] = useState("All"),
    [age, setAge] = useState("child"),
    [saved, setSaved] = useState(false);
  const months = child.dateOfBirth ? ageMonths(child.dateOfBirth) : null;
  const items = PLAY.filter(
    (p) =>
      (kind === "All" || p.kind === kind) &&
      (age === "all" ||
        (months !== null && months >= p.min && months <= p.max)) &&
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
        <label>
          Age range
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={fieldClass}
          >
            <option value="child">For {child.name}’s age</option>
            <option value="all">Explore all ages</option>
          </select>
        </label>
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
        <p className="py-10">
          {months === null
            ? "Baby play starts after birth. Choose Explore all ages to look ahead."
            : "Nothing here yet. Try another filter or explore all ages and adapt together."}
        </p>
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
