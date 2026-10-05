import { useAppStore } from '@/stores/appStore';
import { navItems } from './navItems';

export function BottomNav() {
  const { currentPage, setPage } = useAppStore();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'ask-ai' && currentPage === 'library');
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${isActive ? 'text-sage' : 'text-slate-500'}`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
