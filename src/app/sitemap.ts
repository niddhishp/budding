import type { MetadataRoute } from 'next';
import { ARTICLES, ARTICLE_UPDATED } from '@/data/articles';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kahiye.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {url:`${SITE}/articles`,lastModified:ARTICLE_UPDATED,changeFrequency:'weekly',priority:0.8},
    ...ARTICLES.map(a=>({url:`${SITE}/articles/${a.slug}`,lastModified:ARTICLE_UPDATED,changeFrequency:'monthly' as const,priority:0.6})),
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/quiz`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/tools/due-date`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
