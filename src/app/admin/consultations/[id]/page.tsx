import { Workspace } from '../../Workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultation · Kahiye', robots: { index: false, follow: false } };
export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) { return <Workspace section="consultations" requestId={(await params).id} />; }
