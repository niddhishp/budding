import { useAppStore } from '@/stores/appStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 content-scroll">
          <div className="max-w-6xl mx-auto page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
