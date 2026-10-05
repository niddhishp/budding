import { computeAge } from '@/lib/age';
import type { AgentAnalysis, Child, Decode, DecodeOutcome, RiskLevel, Story, TemperamentProfile } from '@/types';

export interface ChildRow {
  id: string;
  name: string;
  dob: string | null;
  due_date: string | null;
  curiosity: number;
  persistence: number;
  sensitivity: number;
  sociability: number;
  emotional_intensity: number;
  flexibility: number;
}

export interface DecodeRow {
  id: string;
  child_id: string;
  scenario: string;
  analysis: AgentAnalysis | null;
  risk_level: RiskLevel;
  outcome: DecodeOutcome | null;
  created_at: string;
}

export const CHILD_COLUMNS =
  'id, name, dob, due_date, curiosity, persistence, sensitivity, sociability, emotional_intensity, flexibility';
export const DECODE_COLUMNS = 'id, child_id, scenario, analysis, risk_level, outcome, created_at';

export function childFromRow(row: ChildRow): Child {
  return {
    id: row.id,
    name: row.name,
    dateOfBirth: row.dob,
    dueDate: row.due_date,
    age: computeAge(row.dob, row.due_date),
    temperament: {
      curiosity: row.curiosity,
      persistence: row.persistence,
      sensitivity: row.sensitivity,
      sociability: row.sociability,
      emotionalIntensity: row.emotional_intensity,
      flexibility: row.flexibility,
    },
  };
}

export function temperamentToRow(t: TemperamentProfile) {
  return {
    curiosity: t.curiosity,
    persistence: t.persistence,
    sensitivity: t.sensitivity,
    sociability: t.sociability,
    emotional_intensity: t.emotionalIntensity,
    flexibility: t.flexibility,
  };
}

export function decodeFromRow(row: DecodeRow): Decode {
  return {
    id: row.id,
    childId: row.child_id,
    scenario: row.scenario,
    analysis: row.analysis,
    riskLevel: row.risk_level,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

export interface StoryRow {
  id: string;
  child_id: string;
  theme: string;
  language: string;
  title: string;
  body: string;
  moral: string | null;
  audio_path: string | null;
  created_at: string;
}

export const STORY_COLUMNS = 'id, child_id, theme, language, title, body, moral, audio_path, created_at';

export function storyFromRow(row: StoryRow): Story {
  return {
    id: row.id,
    childId: row.child_id,
    theme: row.theme,
    language: row.language,
    title: row.title,
    body: row.body,
    moral: row.moral || null,
    hasAudio: !!row.audio_path,
    createdAt: row.created_at,
  };
}
