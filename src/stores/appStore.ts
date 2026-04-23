import { create } from 'zustand';
import type { Child, DailyFeedItem, FamilyRoutine, ParentWellbeingEntry, AgentAnalysis } from '@/types';

interface AppState {
  // Navigation
  currentPage: string;
  setPage: (page: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Children
  children: Child[];
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  addChild: (child: Child) => void;
  
  // Daily Feed
  feed: DailyFeedItem[];
  markFeedRead: (id: string) => void;
  
  // Routines
  routines: FamilyRoutine[];
  toggleRoutine: (id: string) => void;
  
  // Wellbeing
  wellbeingEntries: ParentWellbeingEntry[];
  addWellbeingEntry: (entry: ParentWellbeingEntry) => void;
  
  // Behavior Analysis
  lastAnalysis: AgentAnalysis | null;
  setLastAnalysis: (analysis: AgentAnalysis | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  
  // UI
  showOnboarding: boolean;
  completeOnboarding: () => void;
}

const defaultChildren: Child[] = [
  {
    id: 'c1',
    name: 'Emma',
    dateOfBirth: '2023-01-15',
    age: { years: 3, months: 3, days: 7, stage: 'early-childhood' },
    temperament: {
      curiosity: 85,
      persistence: 60,
      sensitivity: 75,
      sociability: 80,
      emotionalIntensity: 70,
      flexibility: 55,
    },
    milestones: [],
    emotionalPatterns: [],
    behaviorLogs: [],
  },
  {
    id: 'c2',
    name: 'Noah',
    dateOfBirth: '2018-08-22',
    age: { years: 7, months: 8, days: 0, stage: 'middle-childhood' },
    temperament: {
      curiosity: 70,
      persistence: 80,
      sensitivity: 50,
      sociability: 65,
      emotionalIntensity: 45,
      flexibility: 70,
    },
    milestones: [],
    emotionalPatterns: [],
    behaviorLogs: [],
  },
];

const defaultRoutines: FamilyRoutine[] = [
  { id: 'r1', title: 'Morning gratitude', emoji: '🌅', frequency: 'daily', description: 'Share one thing you\'re grateful for', completed: true, streak: 12, lastCompleted: '2026-04-21' },
  { id: 'r2', title: 'Reading time', emoji: '📚', frequency: 'daily', description: '15 minutes of shared reading', completed: true, streak: 8, lastCompleted: '2026-04-21' },
  { id: 'r3', title: 'Emotion check-in', emoji: '💬', frequency: 'weekly', description: 'How is everyone feeling today?', completed: false, streak: 3 },
  { id: 'r4', title: 'Family walk', emoji: '🌿', frequency: 'weekly', description: '30-minute walk together', completed: false, streak: 1 },
  { id: 'r5', title: 'Bedtime ritual', emoji: '🌙', frequency: 'daily', description: 'Same calming routine every night', completed: true, streak: 15, lastCompleted: '2026-04-21' },
  { id: 'r6', title: 'Game night', emoji: '🎲', frequency: 'weekly', description: 'Play a board game together', completed: false, streak: 0 },
];

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  
  children: defaultChildren,
  selectedChildId: 'c1',
  selectChild: (id) => set({ selectedChildId: id }),
  addChild: (child) => set((s) => ({ children: [...s.children, child] })),
  
  feed: [],
  markFeedRead: (id) => set((s) => ({
    feed: s.feed.map((f) => f.id === id ? { ...f, read: true } : f),
  })),
  
  routines: defaultRoutines,
  toggleRoutine: (id) => set((s) => ({
    routines: s.routines.map((r) => r.id === id ? { ...r, completed: !r.completed } : r),
  })),
  
  wellbeingEntries: [],
  addWellbeingEntry: (entry) => set((s) => ({
    wellbeingEntries: [...s.wellbeingEntries, entry],
  })),
  
  lastAnalysis: null,
  setLastAnalysis: (analysis) => set({ lastAnalysis: analysis }),
  isAnalyzing: false,
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  
  showOnboarding: true,
  completeOnboarding: () => set({ showOnboarding: false }),
}));
