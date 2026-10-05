import type { Metadata, Viewport } from 'next';
import '../index.css';
import '../App.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://budding.live'),
  title: 'Budding — The words to say, when it matters',
  description: 'Describe a hard moment with your child and get the exact words to say, tuned to their age, temperament and history. From pregnancy to 18.',
  openGraph: {
    title: 'Budding — The words to say, when it matters',
    description: 'Parenting guidance tuned to your child, not the average child.',
    siteName: 'Budding.live',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F9FAFB',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased font-sans">
      <body className="min-h-screen bg-canvas" suppressHydrationWarning>
        <div className="grain-overlay" />
        {children}
      </body>
    </html>
  );
}
