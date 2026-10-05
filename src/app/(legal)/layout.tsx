import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-canvas px-5 py-10">
      <article className="max-w-2xl mx-auto text-slate-700 leading-relaxed [&_h1]:font-heading [&_h1]:text-4xl [&_h1]:text-slate-900 [&_h1]:mb-2 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1.5 [&_a]:underline">
        <Link href="/" className="inline-block mb-10 font-heading font-bold text-xl text-slate-900 no-underline">Budding.</Link>
        {children}
      </article>
    </main>
  );
}
