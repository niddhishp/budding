import { computeAge } from '@/lib/age';
import type { AgentAnalysis, Child, Decode, DecodeOutcome, Memory, MemoryKind, MemorySource, RiskLevel, Story, TemperamentProfile } from '@/types';

export interface ChildRow {
  gender?: 'boy' | 'girl' | null;
  puberty_guide?: 'girls' | 'boys' | null;
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
  intake_answered?: (keyof TemperamentProfile)[] | null;
  memory_enabled?: boolean;
  city?: string | null;
}

export interface DecodeRow {
  id: string;
  child_id: string;
  scenario: string;
  analysis: AgentAnalysis | null;
  risk_level: RiskLevel;
  safety_category?: Decode['safetyCategory'];
  outcome: DecodeOutcome | null;
  created_at: string;
  continuation_of?: string | null;
  refines?: string | null;
}

export const CHILD_COLUMNS =
  'id, name, dob, due_date, curiosity, persistence, sensitivity, sociability, emotional_intensity, flexibility, focus_areas, household, home_languages, profile_notes, intake_band, intake_answered, memory_enabled, puberty_guide, gender';
/** The parent's own app shell also loads the optional city. Guidance, stories and reports use CHILD_COLUMNS, so the city never enters AI context. */
export const PARENT_CHILD_COLUMNS = `${CHILD_COLUMNS}, city`;
export const DECODE_COLUMNS = 'id, child_id, scenario, analysis, risk_level, safety_category, outcome, created_at, continuation_of, refines';

export function childFromRow(row: ChildRow): Child {
  return {
    id: row.id,
    gender: row.gender ?? null,
    pubertyGuide: row.puberty_guide ?? null,
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
    intakeAnswered: row.intake_answered ?? null,
    memoryEnabled: row.memory_enabled ?? true,
    ...(row.city !== undefined ? { city: row.city } : {}),
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
    safetyCategory: row.safety_category,
    outcome: row.outcome,
    createdAt: row.created_at,
    continuationOf: row.continuation_of ?? null,
    refines: row.refines ?? null,
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
  archived?: boolean;
  confirmed_at?: string | null;
  expires_at?: string | null;
  edited_at?: string | null;
  revision?: number;
  decode_id?: string | null;
}

export const MEMORY_COLUMNS = 'id, child_id, kind, content, source, confidence, sensitive, created_at, archived, confirmed_at, expires_at, edited_at, revision, decode_id';

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
    archived: row.archived ?? false,
    confirmedAt: row.confirmed_at ?? null,
    expiresAt: row.expires_at ?? null,
    editedAt: row.edited_at ?? null,
    revision: row.revision ?? 1,
    decodeId: row.decode_id ?? null,
  };
}
