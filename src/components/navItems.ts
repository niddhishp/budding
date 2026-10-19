import {
  LayoutDashboard,
  UserCircle,
  Sparkles,
  Moon,
  Compass,
  CalendarDays,
  ShieldCheck,
  Heart,
  Gift,
  Footprints,
  Sprout,
} from "lucide-react";
import type { Page } from "@/stores/appStore";
import type { Child } from "@/types";
import { familyNavigation } from "@/lib/family-navigation";

type NavItem = {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
};
export function navItemsForChild(
  child: Child | undefined,
  today?: string,
): NavItem[] {
  const relevant = familyNavigation(child, today);
  return [
    { id: "dashboard", label: "Today", icon: LayoutDashboard },
    { id: "family-plan", label: "Plan", icon: CalendarDays },
    { id: "ask-ai", label: "Decode", icon: Sparkles },
    ...(relevant.puberty
      ? [
          {
            id: "puberty" as const,
            label: "Puberty",
            icon: Sprout,
            highlight: true,
          },
        ]
      : []),
    ...(relevant.born
      ? [{ id: "safety" as const, label: "Safety", icon: ShieldCheck }]
      : []),
    { id: "parent-space", label: "Your Space", icon: Heart },
    ...(relevant.born
      ? [
          { id: "gifts" as const, label: "Gifts", icon: Gift },
          { id: "play" as const, label: "Play", icon: Footprints },
        ]
      : []),
    ...(relevant.stories
      ? [{ id: "stories" as const, label: "Stories", icon: Moon }]
      : []),
    { id: "discover", label: "Discover", icon: Compass },
    { id: "child-profile", label: "Child", icon: UserCircle },
  ];
}
