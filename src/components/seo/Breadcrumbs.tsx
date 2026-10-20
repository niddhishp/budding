import Link from 'next/link';
import { breadcrumbSchema, jsonLd } from '@/lib/seo';
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(items)) }} />
    <nav aria-label="Breadcrumb" className="text-sm text-slate-600 mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => <li key={item.path} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">/</span>}
          {i === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path} className="underline py-2">{item.name}</Link>}
        </li>)}
      </ol>
    </nav>
  </>;
}
