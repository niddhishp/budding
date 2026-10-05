import { create } from 'zustand';
import { getSupabase } from '@/lib/supabase';
import { CHILD_COLUMNS, childFromRow, temperamentToRow, type ChildRow } from '@/lib/mappers';
import { POLICY_VERSION } from '@/lib/consent';
import type { Entitlement } from '@/lib/plans';
import type { Child, FamilyRoutine, ParentWellbeingEntry, TemperamentProfile } from '@/types';

export type Page =
  | 'dashboard' | 'ask-ai' | 'library' | 'child-profile' | 'development' | 'emotional-lab'
  | 'parent-coach' | 'family-hub' | 'life-skills' | 'community' | 'wellbeing' | 'stories';

export interface NewChildInput {
  name: string;
  dateOfBirth: string | null;
  dueDate: string | null;
  temperament: TemperamentProfile;
}

interface AppState {
  // Session
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  userEmail: string | null;
  load: () => Promise<void>;
  signOut: () => Promise<void>;

  // Plan & paywall
  entitlement: Entitlement | null;
  setEntitlement: (e: Entitlement) => void;
  refreshEntitlement: () => Promise<void>;
  paywall: { open: boolean; reason: string | null };
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;

  // Expert consultation request sheet
  expert: { open: boolean; source: 'menu' | 'safety' | 'report'; concern: string | null };
  openExpert: (source: 'menu' | 'safety' | 'report', concern?: string) => void;
  closeExpert: () => void;

  // DPDP consent
  consentNeeded: boolean;
  giveConsent: () => Promise<void>;

  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Children
  children: Child[];
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  addChild: (input: NewChildInput) => Promise<Child>;

  // Onboarding: shown automatically when a parent has no children, or on demand.
  addingChild: boolean;
  setAddingChild: (val: boolean) => void;

  // Local-only modules (not yet persisted)
  routines: FamilyRoutine[];
  toggleRoutine: (id: string) => void;
  wellbeingEntries: ParentWellbeingEntry[];
  addWellbeingEntry: (entry: ParentWellbeingEntry) => void;
}

const SELECTED_CHILD_KEY = 'budding.selectedChild';

function rememberSelection(id: string) {
  try { localStorage.setItem(SELECTED_CHILD_KEY, id); } catch { /* storage unavailable */ }
}
function recallSelection(): string | null {
  try { return localStorage.getItem(SELECTED_CHILD_KEY); } catch { return null; }
}

const defaultRoutines: FamilyRoutine[] = [
  { id: 'r1', title: 'Morning gratitude', emoji: '🌅', frequency: 'daily', description: 'Share one thing you\'re grateful for', completed: false, streak: 0 },
  { id: 'r2', title: 'Reading time', emoji: '📚', frequency: 'daily', description: '15 minutes of shared reading', completed: false, streak: 0 },
  { id: 'r3', title: 'Emotion check-in', emoji: '💬', frequency: 'weekly', description: 'How is everyone feeling today?', completed: false, streak: 0 },
  { id: 'r4', title: 'Family walk', emoji: '🌿', frequency: 'weekly', description: '30-minute walk together', completed: false, streak: 0 },
  { id: 'r5', title: 'Bedtime ritual', emoji: '🌙', frequency: 'daily', description: 'Same calming routine every night', completed: false, streak: 0 },
  { id: 'r6', title: 'Game night', emoji: '🎲', frequency: 'weekly', description: 'Play a board game together', completed: false, streak: 0 },
];

export const useAppStore = create<AppState>((set, get) => ({
  status: 'loading',
  error: null,
  userEmail: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?next=/app';
        return;
      }
      const [{ data, error }, consentRes] = await Promise.all([
        supabase.from('children').select(CHILD_COLUMNS).order('created_at', { ascending: true }).returns<ChildRow[]>(),
        supabase.from('consents').select('policy_version').eq('user_id', user.id).maybeSingle(),
      ]);
      if (error) throw error;
      get().refreshEntitlement();

      const children = (data ?? []).map(childFromRow);
      const remembered = recallSelection();
      const selectedChildId = children.find((c) => c.id === remembered)?.id ?? children[0]?.id ?? null;
      set({
        status: 'ready',
        userEmail: user.email ?? null,
        children,
        selectedChildId,
        addingChild: children.length === 0,
        consentNeeded: consentRes.data?.policy_version !== POLICY_VERSION,
      });
    } catch (err) {
      console.error('[store] load failed', err);
      set({ status: 'error', error: 'We could not load your family profile. Check your connection and try again.' });
    }
  },

  signOut: async () => {
    await getSupabase().auth.signOut();
    window.location.href = '/';
  },

  entitlement: null,
  setEntitlement: (entitlement) => set({ entitlement }),
  refreshEntitlement: async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) set({ entitlement: (await res.json()).entitlement });
    } catch { /* non-critical; the server enforces limits regardless */ }
  },
  paywall: { open: false, reason: null },
  openPaywall: (reason) => set({ paywall: { open: true, reason: reason ?? null } }),
  closePaywall: () => set({ paywall: { open: false, reason: null } }),

  expert: { open: false, source: 'menu', concern: null },
  openExpert: (source, concern) => set({ expert: { open: true, source, concern: concern ?? null } }),
  closeExpert: () => set((s) => ({ expert: { ...s.expert, open: false } })),

  consentNeeded: false,
  giveConsent: async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase
      .from('consents')
      .upsert({ user_id: user.id, policy_version: POLICY_VERSION, agreed_at: new Date().toISOString() });
    if (error) throw error;
    set({ consentNeeded: false });
  },

  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  children: [],
  selectedChildId: null,
  selectChild: (id) => {
    rememberSelection(id);
    set({ selectedChildId: id });
  },
  addChild: async (input) => {
    const { data, error } = await getSupabase()
      .from('children')
      .insert({
        name: input.name.trim(),
        dob: input.dateOfBirth,
        due_date: input.dueDate,
        ...temperamentToRow(input.temperament),
      })
      .select(CHILD_COLUMNS)
      .single<ChildRow>();
    if (error) throw error;

    const child = childFromRow(data);
    rememberSelection(child.id);
    set({ children: [...get().children, child], selectedChildId: child.id, addingChild: false });
    return child;
  },

  addingChild: false,
  setAddingChild: (val) => set({ addingChild: val }),

  routines: defaultRoutines,
  toggleRoutine: (id) => set((s) => ({
    routines: s.routines.map((r) => r.id === id ? { ...r, completed: !r.completed } : r),
  })),
  wellbeingEntries: [],
  addWellbeingEntry: (entry) => set((s) => ({ wellbeingEntries: [...s.wellbeingEntries, entry] })),
}));
