import { useState } from "react";
import { categories, styles, materials, type Preferences } from "@/lib/shop";
import { fieldClass, buttonClass } from "./CareFrame";
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <fieldset className="my-5">
      <legend className="text-sm font-medium mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((t) => (
          <label
            key={t}
            className="border rounded-full px-3 py-2 text-sm flex gap-2 items-center"
          >
            <input
              type="checkbox"
              checked={value.includes(t)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, t]
                    : value.filter((v) => v !== t),
                )
              }
            />
            {t.replaceAll("_", " ")}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function ShopPreferences({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Preferences;
  busy: boolean;
  onSave: (v: Preferences) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [v, set] = useState(initial);
  return (
    <form
      className="bg-paper-deep rounded-2xl p-5 my-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(v)) onCancel();
      }}
    >
      <h2 className="font-heading text-2xl">Their taste, your choices</h2>
      <p className="text-sm text-slate-600 mt-2">
        Only these shopping choices shape the selection. Health notes,
        conversations and savings stay separate.
      </p>
      <Choices
        label="Shopping interests"
        options={categories}
        value={v.interests}
        onChange={(interests) => set({ ...v, interests })}
      />
      <Choices
        label="Styles you enjoy"
        options={styles}
        value={v.styles}
        onChange={(styles) => set({ ...v, styles })}
      />
      <Choices
        label="Materials to leave out"
        options={materials}
        value={v.avoid}
        onChange={(avoid) => set({ ...v, avoid })}
      />
      <label className="flex gap-3 text-sm my-4">
        <input
          type="checkbox"
          checked={v.learnFromSaved}
          onChange={(e) => set({ ...v, learnFromSaved: e.target.checked })}
        />
        Use saved and purchased picks to suggest similar categories and styles
      </label>
      <label className="block text-sm my-4">
        Comfortable budget per gift (₹; 0 = no limit set)
        <input
          type="number"
          min="0"
          max="1000000"
          step="1"
          className={fieldClass}
          value={v.budget}
          onChange={(e) => set({ ...v, budget: Number(e.target.value) })}
        />
      </label>
      <p className="text-xs text-slate-600">
        Kept as your planning guide. Check current prices at the retailer before
        buying.
      </p>
      <label className="block text-sm my-4">
        Clothing size to remember
        <input
          maxLength={80}
          className={fieldClass}
          value={v.size}
          onChange={(e) => set({ ...v, size: e.target.value })}
        />
      </label>
      <p className="text-xs text-slate-600">
        Sizes differ between brands; check the product’s size guide.
      </p>
      <div className="flex gap-4 mt-5">
        <button disabled={busy} className={buttonClass}>
          Save preferences
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
