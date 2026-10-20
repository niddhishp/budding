import { ageMonths } from "./shop";
import type { Child } from "@/types";
import type { Page } from "@/stores/appStore";

/** Editorial navigation windows, not assessments of development or puberty. */
export function familyNavigation(
  child: Pick<Child, "dateOfBirth"> | undefined,
  today?: string,
) {
  const months = ageMonths(child?.dateOfBirth ?? null, today);
  return {
    born: months !== null,
    puberty: months !== null && months >= 96 && months < 216,
    stories: months !== null && months < 156,
  };
}

export function pageAfterChildSwitch(page: Page, child: Child): Page {
  const relevant = familyNavigation(child);
  if (page === "puberty" && !relevant.puberty) return "dashboard";
  if (page === "stories" && !relevant.stories) return "dashboard";
  if (page === "pregnancy" && relevant.born) return "dashboard";
  if (["safety", "play", "gifts"].includes(page) && !relevant.born)
    return "dashboard";
  return page;
}

export function activeNavigation(page: Page): Page {
  if (["growth", "health", "interests", "photo-timeline", "family-plan", "shop", "gifts", "milestones", "development"].includes(page))
    return "child-profile";
  if (["puberty", "safety", "play", "stories", "discover", "pregnancy", "emotional-lab", "parent-coach", "family-hub", "life-skills", "community"].includes(page))
    return "handbook";
  if (page === "wellbeing") return "parent-space";
  if (page === "library") return "ask-ai";
  return page;
}
