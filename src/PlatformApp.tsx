import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { DashboardPage } from '@/views/DashboardPage';
import { AskAIPage } from '@/views/AskAIPage';
import { ChildProfilePage } from '@/views/ChildProfilePage';
import { DevelopmentTimelinePage } from '@/views/DevelopmentTimelinePage';
import { EmotionalLabPage } from '@/views/EmotionalLabPage';
import { ParentCoachPage } from '@/views/ParentCoachPage';
import { FamilyHubPage } from '@/views/FamilyHubPage';
import { LifeSkillsPage } from '@/views/LifeSkillsPage';
import { CommunityPage } from '@/views/CommunityPage';
import { WellbeingPage } from '@/views/WellbeingPage';
import { StoriesPage } from '@/views/StoriesPage';
import { QuickLog } from '@/components/QuickLog';
import { GenomeOnboarding } from '@/components/GenomeOnboarding';
import { ConsentGate } from '@/components/ConsentGate';
import { PlanSheet } from '@/components/PlanSheet';
import { ExpertSheet } from '@/components/ExpertSheet';

function PlatformApp() {
  const { status, error, load, currentPage, addingChild, children, consentNeeded, expert } = useAppStore();

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-canvas flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-sage animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-600 max-w-sm">{error}</p>
        <Button onClick={load} className="rounded-full bg-slate-850 text-white px-6">Try again</Button>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'ask-ai':
      case 'library': return <AskAIPage />;
      case 'child-profile': return <ChildProfilePage />;
      case 'development': return <DevelopmentTimelinePage />;
      case 'emotional-lab': return <EmotionalLabPage />;
      case 'parent-coach': return <ParentCoachPage />;
      case 'family-hub': return <FamilyHubPage />;
      case 'life-skills': return <LifeSkillsPage />;
      case 'community': return <CommunityPage />;
      case 'wellbeing': return <WellbeingPage />;
      case 'stories': return <StoriesPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-canvas">
      {consentNeeded ? <ConsentGate /> : addingChild && <GenomeOnboarding />}
      <PlanSheet />
      {expert.open && <ExpertSheet key={expert.concern ?? 'blank'} />}
      <div className="grain-overlay" />
      {children.length > 0 && (
        <>
          <Layout>{renderPage()}</Layout>
          <QuickLog />
        </>
      )}
    </div>
  );
}

export default PlatformApp;
