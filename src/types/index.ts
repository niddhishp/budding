// Core platform types

export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  age: AgeInfo;
  temperament: TemperamentProfile;
  milestones: Milestone[];
  emotionalPatterns: EmotionalPattern[];
  behaviorLogs: BehaviorLog[];
}

export interface AgeInfo {
  years: number;
  months: number;
  days: number;
  stage: DevelopmentalStage;
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

export interface AgentAnalysis {
  stage: string;
  developmentalThemes: string[];
  behaviorInterpretation: string;
  emotionalNeed: string;
  suggestedReframe: string;
  responsePlan: string;
  whatNotToDo: string;
  skillBeingBuilt: string;
  confidence: number;
}

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
