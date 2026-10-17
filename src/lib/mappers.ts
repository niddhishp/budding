import { computeAge } from '@/lib/age';
import type { AgentAnalysis, Child, Decode, DecodeOutcome, Memory, MemoryKind, MemorySource, RiskLevel, Story, TemperamentProfile } from '@/types';

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
  focus_areas?: string[] | null;
  household?: string[] | null;
  home_languages?: string[] | null;
  profile_notes?: string | null;
  intake_band?: string | null;
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
  'id, name, dob, due_date, curiosity, persistence, sensitivity, sociability, emotional_intensity, flexibility, focus_areas, household, home_languages, profile_notes, intake_band';
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
    focusAreas: row.focus_areas ?? [],
    household: row.household ?? [],
    homeLanguages: row.home_languages ?? [],
    profileNotes: row.profile_notes ?? null,
    intakeBand: row.intake_band ?? null,
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

export interface MemoryRow {
  id: string;
  child_id: string;
  kind: MemoryKind;
  content: string;
  source: MemorySource;
  confidence: number;
  sensitive: boolean;
  created_at: string;
}

export const MEMORY_COLUMNS = 'id, child_id, kind, content, source, confidence, sensitive, created_at';

export function memoryFromRow(row: MemoryRow): Memory {
  return {
    id: row.id,
    childId: row.child_id,
    kind: row.kind,
    content: row.content,
    source: row.source,
    confidence: row.confidence,
    sensitive: row.sensitive,
    createdAt: row.created_at,
  };
}
