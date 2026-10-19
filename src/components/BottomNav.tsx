import { useState } from "react";
import { Menu } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { navItemsForChild } from "./navItems";
import { activeNavigation } from "@/lib/family-navigation";
import { useTodayDate } from "@/components/care/useTodayDate";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function BottomNav() {
  const { currentPage, setPage, children, selectedChildId } = useAppStore();
  const [open, setOpen] = useState(false);
  const today = useTodayDate();
  const child = children.find((c) => c.id === selectedChildId);
  const items = navItemsForChild(child, today);
  const primary = items.filter((item) =>
    ["dashboard", "family-plan", "ask-ai", "child-profile"].includes(item.id),
  );
  const active = activeNavigation(currentPage);
  const secondaryActive = !primary.some((item) => item.id === active);
  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                aria-current={active === item.id ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${active === item.id ? "text-clay" : "text-slate-500"}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${secondaryActive ? "text-clay" : "text-slate-500"}`}
          >
            <Menu className="w-5 h-5" />
            Menu
          </button>
        </div>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[85dvh] overflow-y-auto rounded-3xl bg-canvas p-6">
          <DialogTitle className="font-heading text-3xl pr-8">
            Your family menu
          </DialogTitle>
          <DialogDescription>
            {child
              ? `For ${child.name}, and for you.`
              : "Find your family’s spaces."}
          </DialogDescription>
          <nav
            aria-label="Family sections"
            className="grid grid-cols-2 gap-2 mt-2"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setOpen(false);
                  }}
                  aria-current={active === item.id ? "page" : undefined}
                  aria-label={item.label}
                  className={`min-h-20 p-3 rounded-xl text-left border ${active === item.id ? "border-clay bg-clay/10 text-clay" : "border-slate-200 bg-white"}`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  {item.highlight && (
                    <span className="block text-xs text-leaf mt-1">
                      For this age
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
