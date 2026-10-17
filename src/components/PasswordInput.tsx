'use client';
import { useId, useState } from 'react';

export function PasswordInput({ label = 'Password', value, onChange, isNew = false, disabled = false }: {
  label?: string; value: string; onChange: (value: string) => void; isNew?: boolean; disabled?: boolean;
}) {
  const id = useId(); const [visible, setVisible] = useState(false);
  return <div><label htmlFor={id} className="block text-sm font-medium mb-2">{label}</label><div className="relative">
    <input id={id} name={isNew ? 'new-password' : 'password'} type={visible ? 'text' : 'password'} required
      autoComplete={isNew ? 'new-password' : 'current-password'} minLength={isNew ? 12 : undefined} maxLength={isNew ? 72 : 256}
      value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
      className="w-full h-12 pl-4 pr-20 rounded-xl border border-border bg-paper focus:outline-none focus:ring-2 focus:ring-clay/30" />
    <button type="button" disabled={disabled} aria-controls={id} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(v => !v)} className="absolute right-3 top-0 h-12 text-sm text-clay px-1">{visible ? 'Hide' : 'Show'}</button>
  </div></div>;
}
