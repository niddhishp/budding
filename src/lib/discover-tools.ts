import type { Page } from '@/stores/appStore';
export function discoverTools(expecting: boolean): { page: Page; title: string; description: string }[] {
  const parent = { page: 'parent-space' as const, title: 'Room for you, too', description: 'A small reset, room to rest and a practical way to share the load.' };
  return expecting ? [
    { page: 'pregnancy', title: 'Your pregnancy space', description: 'Your preparations, appointment questions and support, for this expecting profile.' }, parent,
  ] : [
    { page: 'shop', title: 'Shop for Kids', description: 'Thoughtful finds for their age and your taste. Handpicked, with clear referral disclosures.' },
    { page: 'gifts', title: 'Gifts & little celebrations', description: 'Plan an occasion, recognise effort or give them something money cannot buy.' },
    { page: 'growth', title: 'A picture of their growth', description: 'A visual ruler, height, weight and BMI where age-appropriate. Your measurements, over time.' },
    { page: 'milestones', title: 'Notice the little changes', description: 'Observations and conversations matched to your child’s age, from early skills to growing independence.' },
    { page: 'interests', title: 'Make room for what they love', description: 'Notice their interests and find a small activity, game or tip in Today.' },
    parent,
    { page: 'play', title: 'Make room for play', description: 'Low-preparation invitations for movement, discovery and time together.' },
  ];
}
