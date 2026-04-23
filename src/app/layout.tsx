import type { Metadata } from 'next';
import '../index.css';
import '../App.css';

export const metadata: Metadata = {
  title: 'Budding - The Anti-Anxiety Parenting Platform',
  description: 'Agentic, hyper-personalized parenting intelligence.',
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
