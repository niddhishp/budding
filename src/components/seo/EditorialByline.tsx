import Link from 'next/link';
import { EDITORIAL_BIO, EDITORIAL_NAME } from '@/lib/seo';
export function EditorialByline() {
  return <aside aria-label="About this guide" className="border-t border-slate-300 mt-10 pt-6 text-sm text-slate-700">
    <h2 className="font-heading text-xl mb-3"><Link href="/editorial" rel="author" className="text-clay underline">{EDITORIAL_NAME}</Link></h2>
    <p className="leading-7">{EDITORIAL_BIO}</p>
    <Link href="/editorial#corrections" className="inline-block underline py-3">Sources, corrections and review status →</Link>
  </aside>;
}
