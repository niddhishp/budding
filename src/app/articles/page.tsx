import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLibrary } from "@/components/ArticleLibrary";
export const metadata: Metadata = {
  title: "Parenting guides | Kahiye",
  description:
    "Practical, gentle guides for everyday baby care, development, play and family life.",
  alternates: { canonical: "https://www.kahiye.app/articles" },
};
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
        <p className="text-clay mb-4">A little clarity for everyday care</p>
        <h1 className="font-heading text-4xl sm:text-6xl max-w-2xl leading-tight">
          Small questions.
          <br />
          Thoughtful answers.
        </h1>
        <p className="max-w-2xl mt-6 text-lg text-slate-600">
          Practical reading for life with your baby. Take what helps, leave room
          for your family, and bring health concerns to your clinician.
        </p>
        <ArticleLibrary />
        <p className="text-sm text-slate-600 border-t pt-6 mt-10">
          Kahiye editorial guides, with source links. General information, not
          individual medical advice. These guides have not yet had independent
          clinical review.
        </p>
      </div>
    </main>
  );
}
