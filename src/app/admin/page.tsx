import { Workspace } from './Workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team overview · Kahiye', robots: { index: false, follow: false } };
export default function AdminPage() { return <Workspace section="overview" />; }
