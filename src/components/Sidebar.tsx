import { useAppStore } from '@/stores/appStore';
import {
  LayoutDashboard, MessageSquare, UserCircle, LineChart,
  Heart, MessageCircleHeart, Users, GraduationCap,
  MessagesSquare, Brain, Sprout, PanelLeft, PanelRight, BookOpen
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'child-profile', label: 'Child Profile', icon: UserCircle },
  { id: 'library', label: 'Library', icon: BookOpen },
];

export function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200/60 z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        <button
          onClick={() => setPage('dashboard')}
          className={`flex items-center gap-2.5 ${!sidebarOpen && 'justify-center w-full'}`}
        >
          <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center flex-shrink-0">
            <Sprout className="w-4.5 h-4.5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-heading font-semibold text-sm text-slate-850">Budding.live</span>
          )}
        </button>
        {sidebarOpen && (
          <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-slate-100">
            <PanelLeft className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Toggle button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="w-full flex justify-center py-3 hover:bg-slate-50 border-b border-slate-100"
        >
          <PanelRight className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Nav Items */}
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sage-light text-sage'
                  : 'text-slate-550 hover:bg-slate-50 hover:text-slate-700'
              } ${!sidebarOpen && 'justify-center'}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-sage' : ''}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Child Selector (when expanded) */}
      {sidebarOpen && <ChildSelector />}
    </aside>
  );
}

function ChildSelector() {
  const { children, selectedChildId, selectChild } = useAppStore();

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-100 bg-white/80 backdrop-blur">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">Your Children</p>
      <div className="space-y-1">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => selectChild(child.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
              selectedChildId === child.id
                ? 'bg-slate-100'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              selectedChildId === child.id
                ? 'bg-sage text-white'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {child.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{child.name}</p>
              <p className="text-[11px] text-slate-400">
                {child.age.years}y {child.age.months}m
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
