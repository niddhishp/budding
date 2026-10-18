import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, ARTICLE_UPDATED, readingMinutes } from "@/data/articles";
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES.find((a) => a.slug === slug);
  return a
    ? {
        title: `${a.title} | Kahiye`,
        description: a.summary,
        alternates: { canonical: `https://www.kahiye.app/articles/${a.slug}` },
      }
    : {};
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = ARTICLES.find((a) => a.slug === slug);
  if (!a) notFound();
  const related = ARTICLES.filter(
    (b) => b.slug !== slug && b.category === a.category,
  ).slice(0, 3);
  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-slate-850">
      <article className="max-w-2xl mx-auto">
        <Link href="/articles" className="text-clay underline">
          ← All guides
        </Link>
        <p className="text-clay mt-12 mb-4">
          {a.category} · {readingMinutes(a)} min read
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl leading-tight">
          {a.title}
        </h1>
        <p className="text-xl text-slate-600 mt-6">{a.summary}</p>
        <p className="text-sm text-slate-500 my-7">
          Kahiye editorial · Updated {ARTICLE_UPDATED}
          <br />
          {a.age}
        </p>
        {a.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-heading text-2xl mb-4">{s.heading}</h2>
            <p className="text-lg leading-8 text-slate-700">{s.body}</p>
          </section>
        ))}
        <aside className="border-t border-slate-300 mt-12 pt-6 text-sm">
          <h2 className="font-heading text-xl mb-3">Sources & care</h2>
          <ul className="space-y-3">
            {a.sources.map((s) => (
              <li key={s.url}>
                <a
                  className="text-clay underline"
                  href={s.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {s.title} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-5 leading-relaxed">
            General information, not a diagnosis or an individual care plan.
            These guides have not yet had independent clinical review. Ask your
            clinician about concerns or your child’s particular needs. If
            someone is seriously unwell, seek urgent local medical care.
          </p>
        </aside>
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-2xl mb-4">
              Another small question
            </h2>
            {related.map((b) => (
              <Link
                key={b.slug}
                href={`/articles/${b.slug}`}
                className="block text-clay underline py-3"
              >
                {b.title}
              </Link>
            ))}
          </section>
        )}
        <Link
          href="/app"
          className="inline-block rounded-full bg-clay text-white px-6 py-3 mt-10"
        >
          Return to your family space
        </Link>
      </article>
    </main>
  );
}
