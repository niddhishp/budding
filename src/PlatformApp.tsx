import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { DashboardPage } from '@/views/DashboardPage';
import { AskAIPage } from '@/views/AskAIPage';
import { ChildProfilePage } from '@/views/ChildProfilePage';
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
const DiscoverPage=dynamic(()=>import('@/views/DiscoverPage').then(m=>m.DiscoverPage));
const ShopPage=dynamic(()=>import('@/views/ShopPage').then(m=>m.ShopPage));
const GiftsPage=dynamic(()=>import('@/views/GiftsPage').then(m=>m.GiftsPage));
const FamilyPlanPage=dynamic(()=>import('@/views/FamilyPlanPage').then(m=>m.FamilyPlanPage));
const PhotoTimelinePage=dynamic(()=>import('@/views/PhotoTimelinePage').then(m=>m.PhotoTimelinePage));
const HealthPage=dynamic(()=>import('@/views/HealthPage').then(m=>m.HealthPage));
const InterestsPage=dynamic(()=>import('@/views/InterestsPage').then(m=>m.InterestsPage));
const GrowthPage=dynamic(()=>import('@/views/GrowthPage').then(m=>m.GrowthPage));
const MilestonesPage=dynamic(()=>import('@/views/MilestonesPage').then(m=>m.MilestonesPage));
const PlayPage=dynamic(()=>import('@/views/PlayPage').then(m=>m.PlayPage));
const PregnancyPage=dynamic(()=>import('@/views/PregnancyPage').then(m=>m.PregnancyPage));
const ParentSpacePage=dynamic(()=>import('@/views/ParentSpacePage').then(m=>m.ParentSpacePage));

function PlatformApp() {
  const { status, error, load, currentPage, addingChild, editingChildId, children, consentNeeded, expert, selectedChildId } = useAppStore();
  const editChild = children.find((c) => c.id === editingChildId);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-canvas flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-6 h-6 text-clay animate-spin mx-auto" /><Link href="/help-now" className="block mt-6 text-clay underline">Immediate support</Link></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-600 max-w-sm">{error}</p><Link href="/help-now" className="text-clay underline">Immediate support</Link>
        <Button onClick={load} className="rounded-full bg-slate-850 text-white px-6">Try again</Button>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'shop': return <ShopPage key={selectedChildId} />;
      case 'gifts': return <GiftsPage key={selectedChildId} />;
      case 'family-plan': return <FamilyPlanPage />;
      case 'photo-timeline': return <PhotoTimelinePage key={selectedChildId} />;
      case 'ask-ai':
      case 'library': return <AskAIPage />;
      case 'child-profile': return <ChildProfilePage />;
      case 'development':
      case 'milestones': return <MilestonesPage />;
      case 'discover': return <DiscoverPage />;
      case 'growth': return <GrowthPage />;
      case 'health': return <HealthPage />;
      case 'interests': return <InterestsPage />;
      case 'play': return <PlayPage />;
      case 'pregnancy': return <PregnancyPage />;
      case 'parent-space': return <ParentSpacePage />;
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
    <div className="relative min-h-[100dvh] bg-canvas"><Link href="/help-now" className="fixed bottom-20 left-4 md:bottom-3 md:left-auto md:right-24 z-[60] bg-paper px-3 py-2 rounded-full text-xs text-clay underline">Immediate support</Link>
      {consentNeeded ? <ConsentGate /> : editChild ? <GenomeOnboarding key={editChild.id} editChild={editChild} /> : addingChild && <GenomeOnboarding />}
      <PlanSheet />
      {expert.open && <ExpertSheet key={expert.concern ?? 'blank'} />}
      <div className="grain-overlay" />
      {children.length > 0 && (
        <>
          <Layout key={selectedChildId}>{renderPage()}</Layout>
          <QuickLog />
        </>
      )}
    </div>
  );
}

export default PlatformApp;
