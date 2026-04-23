import { useAppStore } from '@/stores/appStore';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AskAIPage } from '@/pages/AskAIPage';
import { ChildProfilePage } from '@/pages/ChildProfilePage';
import { DevelopmentTimelinePage } from '@/pages/DevelopmentTimelinePage';
import { EmotionalLabPage } from '@/pages/EmotionalLabPage';
import { ParentCoachPage } from '@/pages/ParentCoachPage';
import { FamilyHubPage } from '@/pages/FamilyHubPage';
import { LifeSkillsPage } from '@/pages/LifeSkillsPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { WellbeingPage } from '@/pages/WellbeingPage';


import { QuickLog } from '@/components/QuickLog';
import { GenomeOnboarding } from '@/components/GenomeOnboarding';

function PlatformApp() {
  const currentPage = useAppStore((s) => s.currentPage);
  const showOnboarding = useAppStore((s) => s.showOnboarding);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'ask-ai': return <AskAIPage />;
      case 'library': return <AskAIPage />;
      case 'child-profile': return <ChildProfilePage />;
      case 'development': return <DevelopmentTimelinePage />;
      case 'emotional-lab': return <EmotionalLabPage />;
      case 'parent-coach': return <ParentCoachPage />;
      case 'family-hub': return <FamilyHubPage />;
      case 'life-skills': return <LifeSkillsPage />;
      case 'community': return <CommunityPage />;
      case 'wellbeing': return <WellbeingPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas">
      {showOnboarding && <GenomeOnboarding />}
      <div className="grain-overlay" />
      <Layout>{renderPage()}</Layout>
      <QuickLog />
    </div>
  );
}

export default PlatformApp;
