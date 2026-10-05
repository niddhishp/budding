// Shared between server (enforcement) and client (display). Prices are display copy;
// the charged amount is whatever the Razorpay plan behind RAZORPAY_PLAN_* is set to.

export type PlanId = 'free' | 'plus';
export type BillingInterval = 'monthly' | 'yearly';

export const FREE_DECODES_PER_WEEK = Number(process.env.NEXT_PUBLIC_FREE_DECODES_PER_WEEK || 3);
export const PLUS_DECODES_PER_DAY = Number(process.env.NEXT_PUBLIC_PLUS_DECODES_PER_DAY || 10);

export const PRICES: Record<BillingInterval, { amount: string; per: string; note?: string }> = {
  monthly: { amount: '₹299', per: 'month' },
  yearly: { amount: '₹1,999', per: 'year', note: 'Save 44% · ₹167/month' },
};

export const PLUS_FEATURES = [
  'Unlimited decodes, whenever a hard moment hits',
  'Share scripts with grandparents and caregivers in Hindi, Malayalam, Tamil and 6 more languages',
  'Guidance that learns from what worked for your child',
  'A weekly pattern report for each child, ready to show your pediatrician',
  'Profiles for every child in the family',
];

export const FREE_FEATURES = [
  `${FREE_DECODES_PER_WEEK} decodes a week`,
  'Daily guidance for your child',
  'Share scripts in English',
];

export interface Entitlement {
  plan: PlanId;
  /** Decodes used in the current window (rolling week on Free, rolling day on Plus). */
  used: number;
  limit: number;
  window: 'week' | 'day';
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export const FREE_STORIES_LIFETIME = 1;
export const PLUS_STORIES_PER_DAY = 3;
export const STORY_LANGUAGES = [
  'English', 'Hindi', 'Malayalam', 'Tamil', 'Marathi', 'Bengali', 'Telugu', 'Kannada', 'Gujarati',
] as const;

/** Display copy for the concierge expert service; confirmed by phone, paid outside the app at first. */
export const EXPERT_SESSION = { price: '₹1,499', minutes: 30 };
