import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://budding.live';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/quiz', '/tools/', '/privacy', '/terms'], disallow: ['/app', '/api/', '/auth/', '/login'] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
