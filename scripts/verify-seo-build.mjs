// Validate the actual production HTML, without starting a server or touching user data.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = '.next/server/app';
const origin = 'https://www.kahiye.app';
const read = path => readFileSync(path, 'utf8');
const xml = read(join(root, 'sitemap.xml.body'));
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert(urls.length >= 41, 'Public sitemap lost pages');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
for (const path of ['/about', '/editorial', '/help-now']) assert(urls.includes(origin + path));
const attr = (html, tag, attribute, value, target) => {
  const nodes = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
  return nodes.filter(node => node.includes(`${attribute}="${value}"`)).map(node => node.match(new RegExp(`\\b${target}="([^"]*)"`))?.[1]);
};
const titles = new Set(), descriptions = new Set(), pages = new Map();
for (const url of urls) {
  assert(url.startsWith(origin + '/'), `Wrong sitemap origin: ${url}`);
  const path = new URL(url).pathname;
  assert(!/^\/(app|admin|api|auth|login)(\/|$)/.test(path) && path !== '/quiz/result', 'Private page in sitemap');
  const file = join(root, path === '/' ? 'index.html' : `${path.slice(1)}.html`);
  const html = read(file); pages.set(path, html);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${path}: exactly one H1`);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1, `${path}: main landmark`);
  assert.deepEqual(attr(html, 'link', 'rel', 'canonical', 'href').map(value => new URL(value).href), [new URL(url).href], `${path}: one self-referencing canonical`);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = attr(html, 'meta', 'name', 'description', 'content');
  assert(title && !titles.has(title), `${path}: unique nonempty title`); titles.add(title);
  assert.equal(description.length, 1); assert(description[0] && !descriptions.has(description[0]), `${path}: unique description`); descriptions.add(description[0]);
  assert(!attr(html, 'meta', 'name', 'robots', 'content').some(v => /noindex/.test(v)), `${path}: public noindex`);
  assert(html.includes('kahiye-social.webp'), `${path}: social preview`);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].flatMap(m => JSON.parse(m[1]));
  for (const schema of schemas) {
    assert.equal(schema['@context'], 'https://schema.org');
    if (schema['@type'] === 'BreadcrumbList') {
      schema.itemListElement.forEach((item, i) => {
        assert.equal(item.position, i + 1); assert(item.item.startsWith(origin));
        assert(urls.includes(item.item), `${path}: breadcrumb target in sitemap`);
      });
    }
  }
  if (path.startsWith('/articles/')) {
    const article = schemas.find(s => s['@type'] === 'Article');
    assert.equal(article?.author?.url, origin + '/editorial');
    assert.equal(article?.mainEntityOfPage, url);
    assert(html.includes('independent clinical review'), `${path}: review status`);
  }
  if (path === '/') {
    assert(attr(html, 'link', 'rel', 'stylesheet', 'href').length <= 2, 'Homepage blocking CSS request budget');
    assert(schemas.some(s => s['@type'] === 'Organization'));
    assert(schemas.some(s => s['@type'] === 'WebSite'));
    const faq = schemas.find(s => s['@type'] === 'FAQPage');
    assert.equal((html.match(/<details\b/g) ?? []).length, faq.mainEntity.length);
    for (const item of faq.mainEntity) {
      const escaped = value => value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      assert(html.includes(`<summary class="cursor-pointer text-lg font-semibold text-slate-900">${escaped(item.name)}</summary>`));
      assert(html.includes(escaped(item.acceptedAnswer.text)));
    }
  }
  for (const image of html.match(/<img\b[^>]*>/g) ?? []) assert(/\balt=/.test(image), `${path}: missing alt`);
}
const reachable = new Set(['/']), queue = ['/'];
while (queue.length) {
  const page = queue.shift();
  for (const match of pages.get(page)?.matchAll(/<a\b[^>]*href="([^"]+)"/g) ?? []) {
    const target = new URL(match[1].replaceAll('&amp;', '&'), origin + page);
    if (target.origin === origin && pages.has(target.pathname) && !reachable.has(target.pathname)) {
      reachable.add(target.pathname); queue.push(target.pathname);
    }
  }
}
for (const path of pages.keys()) assert(reachable.has(path), `Orphan: ${path}`);
const robots = read(join(root, 'robots.txt.body'));
assert(robots.includes('Allow: /') && !robots.includes('Disallow: /\n'));
assert(robots.includes('Disallow: /app') && robots.includes('Disallow: /admin'));
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
const manifest = JSON.parse(read('.next/routes-manifest.json'));
for (const route of ['/login', '/quiz/result', '/app/:path*', '/admin/:path*', '/api/:path*', '/auth/:path*']) {
  assert(manifest.headers.some(h => h.source === route && h.headers.some(v => v.key === 'X-Robots-Tag' && v.value.includes('noindex'))), `Private indexing header: ${route}`);
}
for (const asset of ['kahiye-social', 'kahiye-mark', 'family_photo_strip', 'hero_ai_portrait', 'testimonial_1', 'testimonial_2', 'testimonial_3']) {
  assert(existsSync(`public/${asset}.webp`) && statSync(`public/${asset}.webp`).size > 0);
}
assert(!pages.get('/editorial').includes('mailto:'), 'Do not invent a corrections inbox');
console.log(`SEO build checks passed: ${pages.size} public pages, metadata, H1/main, structured data, reachability, assets and private indexing headers.`);
