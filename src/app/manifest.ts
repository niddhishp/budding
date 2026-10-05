import type { MetadataRoute } from 'next';

// Installable on Android/iOS home screens: parents reach for Kahiye mid-meltdown, one tap away.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kahiye — the words to say',
    short_name: 'Kahiye',
    description: 'The exact words to say in hard moments with your child, tuned to their temperament.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F1E6',
    theme_color: '#B4532F',
    categories: ['parenting', 'lifestyle', 'education'],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
