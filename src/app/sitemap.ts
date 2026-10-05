import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://budding.live';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/quiz`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/tools/due-date`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
