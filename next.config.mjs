/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] },
    ...['/app/:path*', '/admin/:path*', '/api/:path*', '/auth/:path*', '/login', '/quiz/result'].map(source => ({
      source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
    })),
    ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
      ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }]
      : []),
    ];
  },
  async redirects() {
    return ['family_photo_strip', 'hero_ai_portrait', 'testimonial_1', 'testimonial_2', 'testimonial_3'].map(name => ({
      source: `/${name}.jpg`, destination: `/${name}.webp`, permanent: true,
    }));
  },
  images: {
    formats: ['image/webp'],
    remotePatterns: [],
  },
};

export default nextConfig;
