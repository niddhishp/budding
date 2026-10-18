"use client";
import { useState } from "react";
import type { Child } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { useCare } from "./useCare";
import { GrowthVisual } from "./GrowthVisual";
import { GrowthForm } from "./GrowthForm";
import { CareError, buttonClass } from "./CareFrame";
export function GrowthSnapshot({ child }: { child: Child }) {
  const care = useCare(child.id),
    setPage = useAppStore((s) => s.setPage),
    [adding, setAdding] = useState(false);
  if (!child.dateOfBirth) return null;
  return (
    <div className="mb-8">
      <CareError error={care.error} reload={care.reload} />
      {!care.data && !care.error && (
        <p role="status">Loading growth records…</p>
      )}
      {care.data && (
        <>
          <GrowthVisual
            compact
            child={child}
            entries={care.data.growth}
            settings={care.data.settings}
          />
          <div className="flex flex-wrap gap-4">
            <button className={buttonClass} onClick={() => setAdding(true)}>
              Add measurement
            </button>
            <button
              className="text-clay underline px-2"
              onClick={() => setPage("growth")}
            >
              See growth & BMI →
            </button>
          </div>
          {adding && (
            <GrowthForm
              childId={child.id}
              born={child.dateOfBirth}
              entry={null}
              onCancel={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                care.reload();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
