// Shared between server (enforcement) and client (display). Prices are display copy;
// the charged amount is whatever the Razorpay plan behind RAZORPAY_PLAN_* is set to.

export type PlanId = 'free' | 'plus';
export type BillingInterval = 'monthly' | 'yearly';

// Early access: raised from 3 while paid plans are not open. Revisit when checkout opens.
export const FREE_DECODES_PER_WEEK = 10;
export const PLUS_DECODES_PER_DAY = 10;
/** A chat or practice conversation uses one Ask turn and may continue up to this many messages. */
export const CONVERSATION_MESSAGE_LIMIT = 10;
/**
 * A free quick follow-up (answering an Ask clarifying question) is accepted for this long after the
 * original answer. Must match `interval '30 minutes'` in reserve_guidance (supabase/012).
 */
export const CLARIFY_WINDOW_MS = 30 * 60 * 1000;
/** Free families: caregiver messages per rolling 30 days in a language other than English. */
export const FREE_TRANSLATED_SHARES_PER_MONTH = 5;

export const PRICES: Record<BillingInterval, { amount: string; per: string; note?: string }> = {
  monthly: { amount: '₹299', per: 'month' },
  yearly: { amount: '₹1,999', per: 'year', note: 'Save 44% · ₹167/month' },
};

export const PLUS_FEATURES = [
  `${PLUS_DECODES_PER_DAY} Ask turns per rolling day — guidance, chat or practice (a whole conversation of up to ${CONVERSATION_MESSAGE_LIMIT} messages is one turn)`,
  'Scripts for grandparents and caregivers in Hindi, Malayalam, Tamil and 6 more languages, with no 30-day limit',
  'Guidance that learns from what worked for your child',
  'A weekly pattern report for each child, ready to show your pediatrician',
  'Profiles for every child in the family',
];

export const FREE_FEATURES = [
  `${FREE_DECODES_PER_WEEK} Ask turns a week — guidance, chat or practice (a whole conversation of up to ${CONVERSATION_MESSAGE_LIMIT} messages is one turn)`,
  'Daily guidance for your child',
  `Share scripts in English, plus ${FREE_TRANSLATED_SHARES_PER_MONTH} messages every 30 days in Hindi and 8 more languages`,
];

export interface Entitlement {
  canCancel?: boolean;
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
