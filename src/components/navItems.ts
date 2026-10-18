import { LayoutDashboard, UserCircle, Sparkles, Moon, Compass, CalendarDays } from 'lucide-react';
import type { Page } from '@/stores/appStore';

// The core loop: today's guidance, decode a moment, tonight's story, the child's profile.
export const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'family-plan', label: 'Plan', icon: CalendarDays },
  { id: 'ask-ai', label: 'Decode', icon: Sparkles },
  { id: 'stories', label: 'Stories', icon: Moon },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'child-profile', label: 'Child', icon: UserCircle },
];
