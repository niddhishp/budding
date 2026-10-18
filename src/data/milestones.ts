import { ageMonths } from "@/lib/family-care";
export const MILESTONES = [
  {
    month: 2,
    slug: "2-months",
    examples: [
      "Shares a smile when you interact",
      "Makes sounds beyond crying",
      "Lifts their head briefly during awake tummy time",
    ],
  },
  {
    month: 4,
    slug: "4-months",
    examples: [
      "Uses smiles to invite your attention",
      "Makes cooing sounds in an exchange",
      "Holds their head steady when held",
    ],
  },
  {
    month: 6,
    slug: "6-months",
    examples: [
      "Recognises familiar people",
      "Takes turns making sounds with you",
      "Reaches towards a toy they want",
    ],
  },
  {
    month: 9,
    slug: "9-months",
    examples: [
      "Looks when you call their name",
      "Looks for a dropped object",
      "Sits without another person supporting them",
    ],
  },
  {
    month: 12,
    slug: "1-year",
    examples: [
      "Waves during a goodbye",
      "Uses a special name for a parent",
      "Pulls up to a standing position",
    ],
  },
  {
    month: 15,
    slug: "15-months",
    examples: [
      "Brings an interesting object to show you",
      "Points to request something or get help",
      "Takes a few independent steps",
    ],
  },
  {
    month: 18,
    slug: "18-months",
    examples: [
      "Points to share something interesting",
      "Tries several words beyond names for parents",
      "Walks without holding another person or object",
    ],
  },
  {
    month: 24,
    slug: "2-years",
    examples: [
      "Notices when another person seems upset",
      "Combines at least two words",
      "Runs during play",
    ],
  },
  {
    month: 30,
    slug: "30-months",
    examples: [
      "Plays beside other children and sometimes joins them",
      "Uses objects in pretend play",
      "Jumps with both feet leaving the ground",
    ],
  },
  {
    month: 36,
    slug: "3-years",
    examples: [
      "Joins other children in play",
      "Has a conversation with at least two back-and-forth exchanges",
      "Uses a fork when eating",
    ],
  },
  {
    month: 48,
    slug: "4-years",
    examples: [
      "Takes a character role in pretend play",
      "Talks about something from their day",
      "Catches a large ball most of the time",
    ],
  },
  {
    month: 60,
    slug: "5-years",
    examples: [
      "Takes turns or follows rules in games with other children",
      "Tells a story containing at least two events",
      "Hops on one foot",
    ],
  },
];
export const milestoneUrl = (slug: string) =>
  `https://www.cdc.gov/act-early/milestones/${slug}.html`;
export function milestoneWindow(birth: string, date?: string) {
  const months = ageMonths(birth, date);
  if (months > 60) return { current: null, next: null };
  return {
    current: [...MILESTONES].reverse().find((m) => m.month <= months) ?? null,
    next: MILESTONES.find((m) => m.month > months) ?? null,
  };
}
export function milestoneReminders(
  birth: string,
  dismissed: string[],
  date?: string,
) {
  const { current, next } = milestoneWindow(birth, date);
  return [
    { kind: "current", item: current },
    { kind: "upcoming", item: next },
  ].filter(
    (v): v is { kind: string; item: (typeof MILESTONES)[number] } =>
      !!v.item && !dismissed.includes(`${v.kind}-${v.item.month}`),
  );
}
