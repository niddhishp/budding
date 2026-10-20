import { useAppStore } from "@/stores/appStore";
import { navItemsForChild } from "./navItems";
import { activeNavigation } from "@/lib/family-navigation";
export function BottomNav() {
  const { currentPage, setPage } = useAppStore();
  return <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t border-slate-200 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
    <div className="grid grid-cols-5">{navItemsForChild().map(item => {
      const Icon = item.icon, active = activeNavigation(currentPage) === item.id;
      return <button key={item.id} onClick={() => setPage(item.id)} aria-current={active ? "page" : undefined}
        className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-clay bg-clay/5" : "text-slate-600"}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />{item.label}
      </button>;
    })}</div>
  </nav>;
}
