import LandingPage from '@/views/LandingPage';
import { publicMetadata, SITE_DESCRIPTION } from '@/lib/seo';
export const metadata = publicMetadata('Parenting guidance for every age | Kahiye', SITE_DESCRIPTION, '/');

export default function Page() {
  return <LandingPage />;
}
