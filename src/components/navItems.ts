import { LayoutDashboard, UserCircle, Sparkles, Moon } from 'lucide-react';
import type { Page } from '@/stores/appStore';

// The core loop: today's guidance, decode a moment, tonight's story, the child's profile.
export const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'ask-ai', label: 'Decode', icon: Sparkles },
  { id: 'stories', label: 'Stories', icon: Moon },
  { id: 'child-profile', label: 'Child', icon: UserCircle },
];
