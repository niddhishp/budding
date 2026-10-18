import Link from "next/link";
import { useAppStore, type Page } from "@/stores/appStore";
import { CareFrame } from "@/components/care/CareFrame";
const tools: {
  page: Page;
  title: string;
  description: string;
  number: string;
}[] = [
  {
    page: "growth",
    title: "A picture of their growth",
    description:
      "Height, weight and head measurements, kept together. WHO infant reference charts where supported.",
    number: "01",
  },
  {
    page: "milestones",
    title: "Notice what is changing",
    description:
      "Save small observations and choose gentle milestone reminders, from infancy to five years.",
    number: "02",
  },
  {
    page: "play",
    title: "Make room for play",
    description:
      "Low-preparation invitations for movement, discovery and time together.",
    number: "03",
  },
  {
    page: "pregnancy",
    title: "Your pregnancy space",
    description:
      "Week and trimester context, questions for appointments and a practical support plan.",
    number: "04",
  },
];
export function DiscoverPage() {
  const { children, selectedChildId, setPage } = useAppStore();
  const child = children.find((c) => c.id === selectedChildId);
  return (
    <CareFrame
      title="For the days in between"
      intro={`A little reading, a little play, a place to notice ${child?.name ?? "your child"} growing. Explore at your own pace.`}
    >
      <Link
        href="/articles"
        className="block bg-paper-deep rounded-2xl p-6 sm:p-8 mb-8 group"
      >
        <p className="text-sm text-clay mb-3">
          The reading room · 20 practical guides
        </p>
        <h2 className="font-heading text-3xl">
          Small questions.
          <br />
          Thoughtful answers. ↗
        </h2>
        <p className="mt-4 text-slate-600 max-w-xl">
          From first shoes and cups to naps, connection and starting daycare.
          Browse by topic or find what you need today.
        </p>
      </Link>
      <div className="divide-y">
        {[...tools]
          .sort((a, b) =>
            child?.age.stage === "pregnancy"
              ? a.page === "pregnancy"
                ? -1
                : b.page === "pregnancy"
                  ? 1
                  : 0
              : 0,
          )
          .map((t) => (
            <button
              key={t.page}
              className="w-full text-left grid grid-cols-[36px_1fr_20px] gap-4 py-7 group"
              onClick={() => setPage(t.page)}
            >
              <span className="text-sm text-clay pt-1">{t.number}</span>
              <span>
                <span className="font-heading text-2xl group-hover:text-clay">
                  {t.title}
                </span>
                <span className="block mt-2 text-slate-600 leading-relaxed">
                  {t.description}
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
      </div>
      <p className="text-xs text-slate-500 mt-8">
        Growth records, observations and pregnancy notes are private to your
        account. They do not enter AI memory automatically.
      </p>
    </CareFrame>
  );
}
