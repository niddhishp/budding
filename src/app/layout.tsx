import type { Metadata, Viewport } from 'next';
import { Young_Serif, Atkinson_Hyperlegible_Next, Mukta } from 'next/font/google';
import '../index.css';
import '../App.css';

// Display: a soft, bookish serif — the voice of a calm elder. One weight; never faux-bolded.
const display = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
// Body: designed for legibility at low vision — kind to tired eyes at 9pm.
const body = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-body', display: 'swap', adjustFontFallback: false });
// Devanagari (Hindi, Marathi) so Indic scripts look as considered as English.
const deva = Mukta({ weight: ['400', '600'], subsets: ['devanagari'], variable: '--font-deva', display: 'swap' });

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
  themeColor: '#F7F1E6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${deva.variable} antialiased`}>
      <body className="min-h-screen bg-canvas" suppressHydrationWarning>
        <div className="grain-overlay" />
        {children}
      </body>
    </html>
  );
}
