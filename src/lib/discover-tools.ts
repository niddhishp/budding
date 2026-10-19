import type { Page } from "@/stores/appStore";
export function discoverTools(
  expecting: boolean,
): { page: Page; title: string; description: string }[] {
  return expecting
    ? [
        {
          page: "pregnancy",
          title: "Your pregnancy space",
          description:
            "Your preparations, appointment questions and support, for this expecting profile.",
        },
      ]
    : [
        {
          page: "shop",
          title: "Shop for Kids",
          description:
            "Thoughtful finds for their age and your taste. Handpicked, with clear referral disclosures.",
        },
        {
          page: "growth",
          title: "A picture of their growth",
          description:
            "A visual ruler, height, weight and BMI where age-appropriate. Your measurements, over time.",
        },
        {
          page: "milestones",
          title: "Notice the little changes",
          description:
            "Observations and conversations matched to your child’s age, from early skills to growing independence.",
        },
        {
          page: "interests",
          title: "Make room for what they love",
          description:
            "Notice their interests and find a small activity, game or tip in Today.",
        },
      ];
}
