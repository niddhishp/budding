import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, ARTICLE_UPDATED, readingMinutes } from "@/data/articles";
import { HANDBOOK } from "@/data/handbook";
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EditorialByline } from '@/components/seo/EditorialByline';
import { SITE_URL, EDITORIAL_URL, EDITORIAL_NAME, publicMetadata, jsonLd } from '@/lib/seo';
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES.find((a) => a.slug === slug);
  return a
    ? {
        ...publicMetadata(`${a.title} | Kahiye`, a.summary, `/articles/${a.slug}`),
        openGraph: {
          type: "article",
          title: a.title,
          description: a.summary,
          url: `https://www.kahiye.app/articles/${a.slug}`,
          modifiedTime: ARTICLE_UPDATED,
          images: [{ url: `${SITE_URL}/kahiye-social.webp`, width: 1200, height: 630, alt: 'Kahiye parenting guides' }],
        },
        alternates: { canonical: `https://www.kahiye.app/articles/${a.slug}` },
      }
    : {};
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = ARTICLES.find((a) => a.slug === slug);
  if (!a) notFound();
  const sameTopic = ARTICLES.filter(
    (b) => b.slug !== slug && b.category === a.category,
  );
  const handbookCards = (a.handbook ?? []).map((id) => HANDBOOK.find((c) => c.id === id)).filter((c) => !!c);
  const related = [...sameTopic, ...ARTICLES.filter(b => b.slug !== slug && b.category !== a.category)].slice(0, 3);
  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-slate-850">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.summary,
            dateModified: ARTICLE_UPDATED,
            author: { "@type": "Organization", name: EDITORIAL_NAME, url: EDITORIAL_URL },
            publisher: { "@type": "Organization", name: "Kahiye", url: SITE_URL },
            image: `${SITE_URL}/kahiye-social.webp`,
            mainEntityOfPage: `https://www.kahiye.app/articles/${a.slug}`,
          }),
        }}
      />
      <article className="max-w-2xl mx-auto">
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Parenting guides', path: '/articles' }, { name: a.title, path: `/articles/${a.slug}` }]} />
        <p className="text-clay mt-12 mb-4">
          {a.category} · {readingMinutes(a)} min read
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl leading-tight">
          {a.title}
        </h1>
        <p className="text-xl text-slate-600 mt-6">{a.summary}</p>
        <p className="text-sm text-slate-600 my-7">
          <Link href="/editorial" rel="author" className="underline">Kahiye Editorial</Link> · Updated <time dateTime={ARTICLE_UPDATED}>{ARTICLE_UPDATED}</time>
          <br />
          {a.age}
        </p>
        {a.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-heading text-2xl mb-4">{s.heading}</h2>
            <p className="text-lg leading-8 text-slate-700">{s.body}</p>
          </section>
        ))}
        {handbookCards.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-2xl mb-4">In the Kahiye Handbook</h2>
            <p className="text-lg leading-8 text-slate-700">
              Short words to say and one small thing to try, matched to your child&rsquo;s age:
            </p>
            <ul className="mt-3 list-disc pl-6 text-lg leading-8 text-slate-700">
              {handbookCards.map((card) => <li key={card.id}>{card.title}</li>)}
            </ul>
            <Link href="/app" className="inline-block text-clay underline py-3">
              Open these in your Handbook
            </Link>
          </section>
        )}
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
        <EditorialByline />
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
        <section className="mt-12 rounded-2xl bg-paper-deep p-6">
          <h2 className="font-heading text-2xl">Facing this with your child?</h2>
          <p className="mt-3 leading-7">
            Describe what is happening in Kahiye and get words to try, shaped to your child&rsquo;s age.
            Free to start, no card needed.
          </p>
          <Link href="/app" className="inline-block rounded-full bg-clay text-white px-6 py-3 mt-5">
            Find the words in Kahiye
          </Link>
        </section>
      </article>
    </main>
  );
}
