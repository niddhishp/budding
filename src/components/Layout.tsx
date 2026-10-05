import { useAppStore } from '@/stores/appStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar: tablet and desktop only */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        <TopBar />
        <main className="flex-1 overflow-y-auto px-0 md:p-6 pb-24 md:pb-6 content-scroll">
          <div className="max-w-6xl mx-auto page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom tabs: phones */}
      <BottomNav />
    </div>
  );
}
