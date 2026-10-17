import type { Entitlement } from '@/lib/plans';

// Core platform types

export interface Child {
  id: string;
  name: string;
  /** ISO date; null while the child is not yet born. */
  dateOfBirth: string | null;
  /** ISO date; set during pregnancy. */
  dueDate: string | null;
  age: AgeInfo;
  temperament: TemperamentProfile;
  /** What the parent most wants help with right now (age-banded chips). */
  focusAreas: string[];
  /** Who shares the child's care / home (grandparents, helper, siblings…). */
  household: string[];
  homeLanguages: string[];
  profileNotes: string | null;
  /** Stage band the temperament answers were given for; null for legacy toddler-only intake. */
  intakeBand: string | null;
}

export type MemoryKind = 'fact' | 'observation' | 'pattern' | 'what_worked' | 'what_didnt' | 'preference' | 'milestone' | 'joy';
export type MemorySource = 'parent_said' | 'decode_outcome' | 'log' | 'ai_inferred';

/** One thing Kahiye remembers about a child: typed, attributed, confidence-scored, deletable. */
export interface Memory {
  id: string;
  childId: string;
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  confidence: number;
  sensitive: boolean;
  createdAt: string;
}

export interface AgeInfo {
  years: number;
  months: number;
  days: number;
  stage: DevelopmentalStage;
  /** Weeks of pregnancy, only when stage is 'pregnancy'. */
  pregnancyWeek?: number;
  /** Human-readable age, e.g. "3y 4m", "7 months", "Week 24". */
  label: string;
}

export type DevelopmentalStage =
  | 'pregnancy'
  | 'infancy'
  | 'early-childhood'
  | 'middle-childhood'
  | 'teenage';

export interface TemperamentProfile {
  curiosity: number;      // 0-100
  persistence: number;    // 0-100
  sensitivity: number;    // 0-100
  sociability: number;    // 0-100
  emotionalIntensity: number; // 0-100
  flexibility: number;    // 0-100
}

export interface Milestone {
  id: string;
  title: string;
  stage: DevelopmentalStage;
  ageRange: string;
  completed: boolean;
  completedDate?: string;
  category: 'physical' | 'cognitive' | 'social' | 'emotional' | 'language';
}

export interface EmotionalPattern {
  id: string;
  emotion: string;
  frequency: 'rare' | 'sometimes' | 'often' | 'frequent';
  triggers: string[];
  copingStrategies: string[];
  firstObserved: string;
}

export interface BehaviorLog {
  id: string;
  timestamp: string;
  description: string;
  context: string;
  interpretedNeed: string;
  parentResponse: string;
  outcome: string;
  stage: DevelopmentalStage;
  tags: string[];
}

export interface DailyFeedItem {
  id: string;
  type: 'insight' | 'script' | 'ritual' | 'reflection' | 'exercise' | 'alert';
  title: string;
  content: string;
  stage: DevelopmentalStage;
  childAge: string;
  emoji: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
}

/** Structured output of one decode, as returned by /api/analyze. */
export type EvidenceTierName = 'strong' | 'moderate' | 'consensus' | 'mixed' | 'heuristic';

/** A cited evidence card, resolved server-side from the curated card set. */
export interface EvidenceRef {
  id: string;
  tier: EvidenceTierName;
  label: string;
  claim: string;
  source: string;
}

export interface Hypothesis {
  text: string;
  likelihood: 'most likely' | 'possible' | 'less likely';
}

/** Structured output of one decode. v2 fields are optional so older stored decodes still render. */
export interface AgentAnalysis {
  /** Single calm instruction for this second when the moment is happening now; empty otherwise. */
  rightNow?: string;
  /** The exact words to say — 1 to 3 short sentences. */
  sayThis: string;
  /** 2–4 concrete steps for the next few minutes. */
  doThis: string[];
  /** The single most likely mistake to avoid with this child. */
  avoid: string;
  /** Ranked possibilities for what is going on (v2). */
  hypotheses?: Hypothesis[];
  /** Short synthesis of what the behaviour most likely means (derived from hypotheses in v2). */
  interpretation: string;
  /** The need underneath the behaviour. */
  emotionalNeed: string;
  /** What to do or teach later, once everyone is calm. */
  afterwards: string;
  /** What to watch over the coming days (v2). */
  watchFor?: string;
  /** When to talk to a professional, concretely (v2). */
  seekHelpIf?: string;
  /** The skill this moment is building. */
  skillBeingBuilt: string;
  /** Why this is developmentally expected at this age. */
  developmentalContext: string;
  /** Why the suggested approach works, in plain language (v2). */
  whyItWorks?: string;
  /** Evidence behind the approach, resolved from cited card ids (v2). */
  evidence?: EvidenceRef[];
  /** One question whose answer would materially change the advice (v2). */
  clarify?: { question: string; options: string[] } | null;
  /** Doctrine modules the router selected (v2, for analytics/eval). */
  modules?: string[];
}

export type RiskLevel = 'none' | 'low' | 'elevated' | 'urgent';
export type DecodeOutcome = 'worked' | 'partly' | 'did_not_work';

export type SafetyCategory =
  | 'none'
  | 'parent_distress'
  | 'parent_harm_risk'
  | 'child_self_harm'
  | 'abuse'
  | 'medical'
  | 'violence'
  | 'missing_child'
  | 'exam_distress'
  | 'wellbeing_concern';

export interface SafetyNotice {
  level: RiskLevel;
  category: SafetyCategory;
  /** 1 = parent distress, 2 = risk to the child, 3 = imminent danger. */
  tier: 1 | 2 | 3;
  message: string;
  /** Protocol steps specific to the category, shown before any other guidance. */
  steps: string[];
  helplines: { name: string; number: string; note: string }[];
}

export interface Decode {
  id: string;
  childId: string;
  scenario: string;
  analysis: AgentAnalysis | null;
  riskLevel: RiskLevel;
  outcome: DecodeOutcome | null;
  createdAt: string;
}

export type DecodeStreamEvent =
  | { type: 'safety'; safety: SafetyNotice | null }
  | { type: 'delta'; text: string }
  | { type: 'done'; decode: Decode; entitlement: Entitlement }
  | { type: 'error'; error: string };

export type { Entitlement } from '@/lib/plans';

export interface EQExercise {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  category: 'self-awareness' | 'empathy' | 'regulation' | 'social-skills';
  stage: DevelopmentalStage;
  steps: string[];
  completed: boolean;
}

export interface CommunicationScript {
  id: string;
  situation: string;
  stage: DevelopmentalStage;
  avoidSaying: string;
  sayInstead: string;
  why: string;
  context: string;
}

export interface FamilyRoutine {
  id: string;
  title: string;
  emoji: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  description: string;
  completed: boolean;
  streak: number;
  lastCompleted?: string;
}

export interface LifeSkill {
  id: string;
  title: string;
  description: string;
  ageRange: string;
  category: string;
  progress: number; // 0-100
  steps: string[];
}

export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  title: string;
  content: string;
  replies: number;
  verified: boolean;
  tags: string[];
  timestamp: string;
  likes: number;
}

export interface ParentWellbeingEntry {
  id: string;
  date: string;
  stressLevel: number; // 1-10
  sleepQuality: number; // 1-10
  supportNeeded: string;
  gratitudeNote: string;
}

export interface ProductRecommendation {
  id: string;
  title: string;
  category: string;
  description: string;
  ageRange: string;
  whyRecommended: string;
  image?: string;
}

export interface RiskFlag {
  id: string;
  level: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  recommendation: string;
  timestamp: string;
}

/** AI-written summary of one child's week: patterns across logs, decodes and outcomes. */
export interface WeeklyReport {
  headline: string;
  patterns: { title: string; detail: string }[];
  whatsWorking: string[];
  tryThisWeek: string[];
  /** Empty when nothing warrants a professional's attention. */
  watchFor: string;
  encouragement: string;
}

export interface Report {
  id: string;
  childId: string;
  periodStart: string;
  periodEnd: string;
  report: WeeklyReport;
  createdAt: string;
}

export interface Story {
  id: string;
  childId: string;
  theme: string;
  language: string;
  title: string;
  body: string;
  moral: string | null;
  hasAudio: boolean;
  createdAt: string;
}
