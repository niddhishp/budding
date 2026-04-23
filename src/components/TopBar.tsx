import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Sparkles } from 'lucide-react';

export function TopBar() {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200/60 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search insights, tips, topics..."
            className="w-full h-9 pl-9 pr-4 rounded-full bg-slate-100/80 border-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Active Child Badge */}
        {selectedChild && (
          <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 bg-sage-light text-sage border-0">
            <Sparkles className="w-3 h-3" />
            {selectedChild.name}, {selectedChild.age.years}y {selectedChild.age.months}m
          </Badge>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative w-9 h-9 rounded-full">
          <Bell className="w-[18px] h-[18px] text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
        </Button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <span className="text-xs font-medium text-white">P</span>
        </div>
      </div>
    </header>
  );
}
