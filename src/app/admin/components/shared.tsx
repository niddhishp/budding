'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { STATUS_LABELS, type ConsultationStatus } from '@/lib/admin-operations';
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load this page. Please try again.');
  return data;
}
export function useRemote<T>(url: string | null) {
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const key = `${url}:${revision}`;
  const reload = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    requestJson<T>(url, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch(e => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: e instanceof Error ? e.message : 'Could not load this page.' });
    });
    return () => controller.abort();
  }, [url, key]);
  return { data: result?.key === key ? result.data : null, error: result?.key === key ? result.error : '', loading: Boolean(url) && result?.key !== key, reload };
}
export function LoadState({ loading, error, reload }: { loading: boolean; error: string; reload: () => void }) {
  return loading ? <p role="status" className="py-10 text-muted-foreground">Loading…</p> : error ? <div role="alert" className="py-8"><p className="mb-4">{error}</p><div className="flex gap-4 items-center"><Button variant="outline" onClick={reload}>Try again</Button><a className="underline text-sm" href="/admin/verify">Verify access</a></div></div> : null;
}
export function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="mb-8"><p className="text-sm text-clay mb-3">{eyebrow}</p><h1 className="font-heading text-3xl sm:text-4xl mb-4">{title}</h1>{description && <p className="text-muted-foreground max-w-2xl leading-relaxed">{description}</p>}</div>;
}
export function Status({ value }: { value: ConsultationStatus }) {
  return <span className={`inline-block text-xs px-2.5 py-1 rounded-full ${value === 'completed' ? 'bg-leaf/10 text-leaf' : value === 'cancelled' ? 'bg-paper-deep text-muted-foreground' : 'bg-clay/10 text-clay-deep'}`}>{STATUS_LABELS[value]}</span>;
}
export function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)) + ' IST' : 'Not scheduled';
}
