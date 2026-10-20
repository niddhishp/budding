import type { MetadataRoute } from 'next';
import { ARTICLES, ARTICLE_UPDATED } from '@/data/articles';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/seo';


export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PUBLIC_PAGES.map(path => ({ url: `${SITE_URL}${path}` })),
    ...ARTICLES.map(a => ({ url: `${SITE_URL}/articles/${a.slug}`, lastModified: ARTICLE_UPDATED })),
  ];
}
