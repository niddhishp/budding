import type { Metadata } from 'next';
import { PRIVATE_ROBOTS } from '@/lib/seo';

export const metadata: Metadata = { title: 'Sign in | Kahiye', robots: PRIVATE_ROBOTS };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
