import {
  LayoutDashboard,
  UserCircle,
  MessageCircle,
  BookOpen,
  Heart,
} from "lucide-react";
import type { Page } from "@/stores/appStore";
import type { Child } from "@/types";

type NavItem = {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
};
export function navItemsForChild(
  _child?: Child,
  _today?: string,
): NavItem[] {
  void _child; void _today; // Compatibility for shared navigation callers; the five items are stable.
  return [
    { id: "dashboard", label: "Today", icon: LayoutDashboard },
    { id: "ask-ai", label: "Ask", icon: MessageCircle },
    { id: "handbook", label: "Handbook", icon: BookOpen },
    { id: "child-profile", label: "Child", icon: UserCircle },
    { id: "parent-space", label: "You", icon: Heart },
  ];
}
