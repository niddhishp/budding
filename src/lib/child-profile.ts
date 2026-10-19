import type { Child } from '@/types';

/** Profile detail wins; retain legacy reading preferences without inferring identity. */
export function pubertyGuideForChild(child: Pick<Child, 'gender' | 'pubertyGuide'> | undefined) {
  if (child?.gender === 'girl') return 'girls';
  if (child?.gender === 'boy') return 'boys';
  return child?.pubertyGuide ?? null;
}

/** Omitted means unchanged. Explicit clearing also clears the old guide preference. */
export function profileGenderUpdate(gender: Child['gender']): { gender?: Child['gender']; puberty_guide?: Child['pubertyGuide'] } {
  if (gender === undefined) return {};
  return { gender, puberty_guide: gender === 'girl' ? 'girls' : gender === 'boy' ? 'boys' : null };
}
