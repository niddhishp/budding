// Public HTTP crawl only. No browser session, family records, provider calls or writes.
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const base = option('--base', 'https://www.kahiye.app').replace(/\/$/, '');
const canonicalOrigin = 'https://www.kahiye.app';
const output = option('--output', '.playwright-mcp/seo-crawl.json');
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? '';
const privatePath = path => /^\/(?:app|admin|api|auth|login)(?:\/|$)/.test(path) || path === '/quiz/result';
async function get(url) {
  const start = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Kahiye-Public-Link-Audit/1.0' } });
    return { status: response.status, finalUrl: response.url, ms: Math.round(performance.now() - start), text: await response.text(), headers: response.headers };
  } catch (error) { return { status: 0, finalUrl: url, ms: Math.round(performance.now() - start), text: '', error: error.name }; }
}
async function mapLimit(values, run) {
  const results = [];
  for (let i = 0; i < values.length; i += 4) results.push(...await Promise.all(values.slice(i, i + 4).map(run)));
  return results;
}
const sitemap = await get(`${base}/sitemap.xml`);
if (sitemap.status !== 200) throw new Error('Sitemap unavailable');
const urls = [...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const external = new Set(), internal = new Set(), edges = new Map();
const pages = await mapLimit(urls, async url => {
  const path = new URL(url).pathname;
  const page = await get(base + path);
  const tags = page.text.match(/<(?:meta|link)\b[^>]*>/gi) ?? [];
  const links = [...page.text.matchAll(/<a\b[^>]*>/gi)].map(m => attr(m[0], 'href').replaceAll('&amp;', '&'));
  const neighbours = [];
  for (const href of links) {
    if (!href || /^(?:mailto|tel|javascript):/.test(href)) continue;
    const target = new URL(href, canonicalOrigin + path);
    if (!['http:', 'https:'].includes(target.protocol)) continue;
    if (target.origin === canonicalOrigin) {
      if (!privatePath(target.pathname)) { internal.add(target.pathname); neighbours.push(target.pathname); }
    } else external.add(target.href);
  }
  edges.set(path, neighbours);
  const schemas = [];
  let invalidSchema = false;
  for (const m of page.text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { schemas.push(JSON.parse(m[1])); } catch { invalidSchema = true; }
  }
  return {
    path, status: page.status, finalUrl: page.finalUrl, responseMs: page.ms,
    title: page.text.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '',
    description: attr(tags.find(t => attr(t, 'name') === 'description') ?? '', 'content'),
    h1: (page.text.match(/<h1\b/gi) ?? []).length,
    canonical: attr(tags.find(t => attr(t, 'rel') === 'canonical') ?? '', 'href'),
    robots: attr(tags.find(t => attr(t, 'name') === 'robots') ?? '', 'content'),
    robotsHeader: page.headers?.get('x-robots-tag') ?? '',
    schemas, invalidSchema,
    images: [...page.text.matchAll(/<img\b[^>]*>/gi)].map(m => ({ src: attr(m[0], 'src'), hasAlt: /\balt=/.test(m[0]), width: attr(m[0], 'width'), height: attr(m[0], 'height') })),
    htmlBytes: Buffer.byteLength(page.text),
    scripts: [...page.text.matchAll(/<script\b[^>]*src="([^"]+)"/gi)].map(m => m[1]),
  };
});
const known = new Set(pages.map(p => p.path));
const otherInternal = await mapLimit([...internal].filter(p => !known.has(p)), async path => {
  const r = await get(base + path); return { path, status: r.status, finalUrl: r.finalUrl };
});
const externalResults = args.includes('--external') ? await mapLimit([...external], async url => {
  const r = await get(url); return { url, status: r.status, finalUrl: r.finalUrl };
}) : [];
const reachable = new Set(['/']), queue = ['/'];
while (queue.length) for (const target of edges.get(queue.shift()) ?? []) if (!reachable.has(target)) { reachable.add(target); queue.push(target); }
const issues = pages.flatMap(p => [
  ...(p.status !== 200 ? [`${p.path}: HTTP ${p.status}`] : []),
  ...(p.h1 !== 1 ? [`${p.path}: ${p.h1} H1 elements`] : []),
  ...(!p.title || !p.description ? [`${p.path}: title/description missing`] : []),
  ...(!p.canonical || new URL(p.canonical, canonicalOrigin).href !== new URL(p.path, canonicalOrigin).href ? [`${p.path}: canonical missing or different`] : []),
  ...(/noindex/i.test(p.robots + p.robotsHeader) ? [`${p.path}: noindex`] : []),
  ...(p.invalidSchema ? [`${p.path}: invalid JSON-LD`] : []),
  ...(!reachable.has(p.path) ? [`${p.path}: not reachable from home via crawled public links`] : []),
  ...(p.images.some(i => !i.hasAlt) ? [`${p.path}: image missing alt`] : []),
]);
for (const link of otherInternal) if (link.status === 404 || link.status >= 500 || link.status === 0) issues.push(`${link.path}: internal HTTP ${link.status}`);
const report = { checkedAt: new Date().toISOString(), base, pages, otherInternal, external: externalResults, issues };
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pages: pages.length, extraInternal: otherInternal.length, external: externalResults.length, issues, externalNeedsReview: externalResults.filter(r => r.status !== 200), output }, null, 2));
if (args.includes('--check') && issues.length) process.exitCode = 1;
