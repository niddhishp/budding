import { useAppStore } from "@/stores/appStore";
import { pubertyGuideForChild } from "@/lib/child-profile";
import type { Child } from "@/types";

/** A summary only: the child's profile determines the guide, without a second choice. */
export function GuidePreference({ child }: { child: Child }) {
  const setEditingChild = useAppStore(s => s.setEditingChild);
  const path = pubertyGuideForChild(child);
  return <div>
    <p className="font-heading text-xl">{path ? `${child.name}’s ${path === 'girls' ? 'girls’' : 'boys’'} guide` : `About ${child.name}`}</p>
    <p className="text-sm text-slate-600 mt-2">{child.gender ? 'Matched automatically to their profile and age.' : path ? 'Your previously saved guide is still here. Profile details will take over when updated.' : 'Add Boy or Girl to their profile to see the matching guidance here automatically.'}</p>
    {!child.gender && <button onClick={() => setEditingChild(child.id)} className="text-clay underline text-sm mt-3 py-2">Update child profile</button>}
  </div>;
}
