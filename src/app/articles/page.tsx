import Link from "next/link";
import { ArticleLibrary } from "@/components/ArticleLibrary";
import { ARTICLES, readingMinutes } from '@/data/articles';
import { publicMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
export const metadata = publicMetadata('Parenting guides: baby care, puberty & safety | Kahiye', 'Find practical answers to everyday parenting questions, from baby care and sleep to periods, body safety and peer pressure. Read free, with source links.', '/articles');
export default function ArticlesPage() {
  return (
    <main className="min-h-screen bg-canvas text-slate-850 px-5 py-8">
      <div className="max-w-4xl mx-auto">
        <nav
          aria-label="Guide navigation"
          className="flex justify-between mb-14"
        >
          <Link href="/" className="font-heading text-2xl">
            Kahiye.
          </Link>
          <Link className="underline text-clay py-2" href="/app">
            Your family space →
          </Link>
        </nav>
        <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Parenting guides', path: '/articles' }]} />
        <p className="text-clay mb-4">A little clarity for everyday care</p>
        <h1 className="font-heading text-4xl sm:text-6xl max-w-2xl leading-tight">
          Parenting guides for the stage you’re in.
        </h1>
        <p className="max-w-2xl mt-6 text-lg text-slate-600">
          Some questions arrive at bedtime. Others come up on the way to school.
          Find a clear explanation, something you can try and words to help you
          start the conversation.
        </p>
        <ArticleLibrary articles={ARTICLES.map(a => ({ slug: a.slug, category: a.category, title: a.title, summary: a.summary, age: a.age, minutes: readingMinutes(a) }))} />
        <p className="text-sm text-slate-600 border-t pt-6 mt-10">
          Kahiye editorial guides, with source links. General information, not
          individual medical advice. These guides have not yet had independent
          clinical review.
          {' '}<Link href="/editorial" className="underline">How these guides are made →</Link>
        </p>
      </div>
    </main>
  );
}
