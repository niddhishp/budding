// Export the complete visible public copy from the verified build for editorial review.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = '.next/server/app', read = path => readFileSync(path, 'utf8');
const urls = [...read(join(root, 'sitemap.xml.body')).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&nbsp;', ' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const plain = html => decode(html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, label) => `${label} (${url})`)
  .replace(/<h([1-6])\b[^>]*>/gi, (_, level) => '\n\n' + '#'.repeat(Number(level) + 2) + ' ')
  .replace(/<(?:p|section|article|details|nav|footer|header|div|ul|ol)\b[^>]*>/gi, '\n\n')
  .replace(/<li\b[^>]*>/gi, '\n- ').replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')).trim();
let output = `# Kahiye public copy — editorial review pack\n\nDate: 20 October 2026. Generated from the production build, not from private family records.\n\n## Authorship and scope\n\nThe homepage, marketing/trust language, public metadata and article-library introduction were revised; About and Editorial are new. The article bodies, quiz interactions and substantive legal text are reproduced for review, not represented as fully rewritten or independently reviewed. Clinical source material was not rephrased simply to evade detection. This is AI-assisted work and needs human editorial sign-off before it can be described as human-reviewed. No AI-detector or ranking guarantee is made.\n\nThis file includes the full visible copy and metadata for all ${urls.length} public sitemap pages, including navigation and recurring source/review notes. Private app copy is outside this public SEO change. Legal placeholders remain unresolved and must be completed with real details.\n`;
for (const url of urls) {
  const path = new URL(url).pathname;
  const html = read(join(root, path === '/' ? 'index.html' : `${path.slice(1)}.html`));
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '';
  output += `\n\n---\n\n## ${url}\n\n**Search title:** ${title}\n\n**Meta description:** ${description}\n\n${plain(body)}\n`;
}
writeFileSync('docs/SEO-PUBLISHED-COPY.md', output);
console.log(`Exported ${urls.length} complete public pages to docs/SEO-PUBLISHED-COPY.md.`);
