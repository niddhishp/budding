import Link from "next/link";
import { useAppStore } from "@/stores/appStore";
import { discoverTools } from '@/lib/discover-tools';
import { CareFrame } from "@/components/care/CareFrame";
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
          The reading room · Early-years collection
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
        {discoverTools(child?.age.stage === 'pregnancy').map((t, index) => (
            <button
              key={t.page}
              className="w-full text-left grid grid-cols-[36px_1fr_20px] gap-4 py-7 group"
              onClick={() => setPage(t.page)}
            >
              <span className="text-sm text-clay pt-1">{String(index + 1).padStart(2, '0')}</span>
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
