import Link from "next/link";
import { useAppStore } from "@/stores/appStore";
import { useTodayDate } from "./useTodayDate";
import { ageMonths } from "@/lib/shop";
import { guideBand, PARENT_GUIDES } from "@/data/parent-guides";
import type { Child } from "@/types";
export function ParentGuideLinks({ child }: { child: Child }) {
  const setPage = useAppStore((s) => s.setPage);
  const today = useTodayDate();
  const band = guideBand(ageMonths(child.dateOfBirth, today));
  const guide = PARENT_GUIDES.find(
    (g) => g.topic === "safety" && band && g.bands.includes(band),
  );
  return (
    <section className="border-y py-7 my-7">
      <p className="text-sm text-clay mb-3">Growing up, together</p>
      <h2 className="font-heading text-2xl">
        {guide?.title ?? "A little preparation for bigger conversations"}
      </h2>
      {guide && <p className="text-slate-600 leading-7 mt-3">{guide.say}</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-4 mt-5">
        <button
          className="text-clay underline"
          onClick={() => setPage("safety")}
        >
          Safety & boundaries →
        </button>
        <button
          className="text-clay underline"
          onClick={() => setPage("puberty")}
        >
          Guide to Puberty →
        </button>
        <Link className="text-clay underline" href="/articles">
          All parenting articles →
        </Link>
      </div>
    </section>
  );
}
