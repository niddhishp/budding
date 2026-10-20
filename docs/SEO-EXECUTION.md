# Kahiye SEO execution report

Audit and implementation date: 20 October 2026.

## Scope and release status

Public marketing, educational and policy pages at https://www.kahiye.app. Family records, private photographs, authentication, billing gates, clinical logic and database schema are preserved. No production data writes or outreach sends were part of the SEO work.

Release validation and deployment results are recorded below as they complete. Do not read an implementation checklist as a promise of ranking, clinical approval or field performance.

## What changed

| Area | Before | Implementation |
| --- | --- | --- |
| Public crawl | 38 sitemap pages; four missing self-referencing canonicals. | 41 public pages, fixed production origin, individual metadata and canonicals. |
| Trust/identity | Collective byline without a dedicated identity/policy page. | New About and Editorial pages; linked Kahiye Editorial byline, source and AI-use disclosure, pending review status. No invented credentials. |
| Site hierarchy | Immediate support not in sitemap or homepage links. | Homepage/footer links, breadcrumbs, related reading and a sitemap entry for support. |
| Article catalogue | Client JavaScript imported all 32 full article bodies. | Server passes only title, summary, age, topic, slug and reading time. Background prefetch of every article disabled. |
| Rendering | Homepage lacked a main landmark; hero started with an opacity animation. | Main landmark, skip link, immediate hero visibility, optional font rendering, no unnecessary Hindi font preload. Shared CSS consolidated from three requests to two; homepage background route prefetch disabled. |
| Readability/mobile | Pale small text and a footer row prone to overflow. | Stronger secondary text contrast and wrapping footer links. |
| Copy | Unsupported competitor/completeness claims; temperament labels and misleading funding/pricing language. | Practical, warmer wording with no labels, no clinical promises, referral transparency and clear planned subscription status. |
| Structured data | Article markup only. | Organization, WebSite, visible FAQ, BreadcrumbList and an editorial AboutPage. Article author links to its real publishing byline. |
| Media | Five legacy public JPEG files. | Smaller WebP variants, permanent redirects for their old URLs, WebP social preview and brand mark, WebP for Next-optimised images. Originals preserved. |
| Regression protection | No generated-page SEO gate. | CI checks actual production HTML, metadata uniqueness, H1/main, canonicals, schema, public reachability and private indexing headers. |

The existing article slugs are descriptive and stable. They were retained to protect existing links, rather than renamed merely to add keywords. Existing substantive legal text and clinical article bodies were not rewritten to manufacture expertise or evade AI detection. Full published copy and metadata are in `SEO-PUBLISHED-COPY.md`; the separate pitch and authority plan are in `FORBES-OUTREACH.md`.

## Crawl, indexing and URL health

Baseline HTTP crawl: 38/38 sitemap pages returned 200, each had one H1, no accidental public noindex, and no broken internal links or orphan sitemap pages were found within the public crawl. Missing canonicals were `/`, `/quiz`, `/privacy`, `/terms`.

Baseline external checks: 25 of 27 unique linked URLs returned 200; two NSPCC source URLs returned 403 to the audit client. A 403 is an unverified destination, not proof of a broken link. The HealthyChildren source was changed to its final `www` URL to remove an unnecessary source-link redirect. The final crawl also covers external links on the newly linked support page.

No private path was opened to indexing. Login is crawlable so Google can read its `noindex`; authenticated app/admin/API/auth routes remain disallowed and have `X-Robots-Tag` protection. Robots directives are not authentication; the existing auth checks remain in force.

### Exact robots.txt output

```text
User-Agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /api/
Disallow: /auth/

Sitemap: https://www.kahiye.app/sitemap.xml
```

The sitemap contains canonical absolute URLs and a real article update date. It does not invent a fresh timestamp on every request or add meaningless priority/change-frequency values. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

### Routing configuration — Next.js on Vercel, not Apache

There is no `.htaccess` in this hosting stack. These are the deployed additions in `next.config.mjs`:

```js
async redirects() {
  return ['family_photo_strip', 'hero_ai_portrait', 'testimonial_1', 'testimonial_2', 'testimonial_3'].map(name => ({
    source: `/${name}.jpg`, destination: `/${name}.webp`, permanent: true,
  }));
},
images: {
  formats: ['image/webp'],
  remotePatterns: [],
},
```

The existing security headers remain. The indexing additions to `headers()` are:

```js
...['/app/:path*', '/admin/:path*', '/api/:path*', '/auth/:path*', '/login', '/quiz/result'].map(source => ({
  source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
})),
...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
  ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }]
  : []),
```

HTTPS and apex-to-www redirects are managed by Vercel. Baseline:

```text
https://kahiye.app/articles       → 308 → https://www.kahiye.app/articles → 200
http://www.kahiye.app/articles    → 308 → https://www.kahiye.app/articles → 200
https://www.kahiye.app/articles/  → 308 → https://www.kahiye.app/articles → 200
http://kahiye.app/articles       → 308 → https://kahiye.app/articles
                                 → 308 → https://www.kahiye.app/articles → 200
```

The HTTP apex has a two-hop platform redirect. All published internal links use the canonical host/path, so normal site navigation avoids it. This remaining platform chain must not be described as eliminated. Do not add middleware redirects that duplicate Vercel's TLS/host handling.

## Structured data — exact representative output

Homepage organization:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.kahiye.app/#organization",
  "name": "Kahiye",
  "url": "https://www.kahiye.app",
  "description": "Find words for tricky parenting moments, prepare for the next stage and keep family plans together. Age-aware guidance from pregnancy to the teenage years.",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.kahiye.app/kahiye-mark.webp",
    "width": 256,
    "height": 256
  }
}
```

Homepage website:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.kahiye.app/#website",
  "name": "Kahiye",
  "alternateName": "कहिए",
  "url": "https://www.kahiye.app",
  "publisher": { "@id": "https://www.kahiye.app/#organization" }
}
```

Breadcrumb example (the final item changes with the page):

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.kahiye.app/" },
    { "@type": "ListItem", "position": 2, "name": "Parenting guides", "item": "https://www.kahiye.app/articles" }
  ]
}
```

The FAQ is generated from the same six entries shown in visible, keyboard-operable `<details>` elements:

```ts
export const faqSchema = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map(({ question, answer }) => ({
    '@type': 'Question', name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
```

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLd([organizationSchema, websiteSchema, faqSchema]) }}
/>
```

The JSON escaping protects the HTML script boundary. No fake reviews, qualifications, clinical endorsements, offers or corporate legal identity were added.

**Current Google limitation:** FAQ rich results stopped appearing on May 7, 2026. FAQPage remains useful semantic markup, but this release does not promise FAQ snippets. [Google's update log](https://developers.google.com/search/updates). Organization and breadcrumb markup follow the relevant [organization](https://developers.google.com/search/docs/appearance/structured-data/organization) and [breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) documentation; valid markup does not guarantee a search feature.

## Performance and media

Baseline mobile [PageSpeed report](https://pagespeed.web.dev/analysis/https-www-kahiye-app/6e9l8m6sx6?form_factor=mobile), 20 October 2026, 19:40 IST, Lighthouse 13.5.0, Moto G Power/slow 4G:

| Measurement | Before | After |
| --- | ---: | ---: |
| Performance | 87 | Pending release measurement |
| Accessibility | 94 | Pending release measurement |
| Best practices | 100 | Pending release measurement |
| SEO | 100 | Pending release measurement |
| FCP | 1.4 s | Pending release measurement |
| LCP | 3.7 s | Pending release measurement |
| CLS | 0 | Pending release measurement |
| TBT | 0 ms | Pending release measurement |
| Speed index | 4.5 s | Pending release measurement |

The baseline LCP element was the header wordmark, with a large rendering delay. Changes target font rendering and hero visibility, rather than hiding content. Article catalogue payload is reduced by excluding full bodies from the client bundle. All public content remains rendered in the initial HTML.

The first hosted retest on `ce86fbf` scored 91 performance and 100 accessibility, best practices and SEO, with LCP 3.038 s, FCP 1.698 s, CLS 0, TBT 0 ms and speed index 4.399 s. [Initial release measurement](https://pagespeed.web.dev/analysis/https-www-kahiye-app/ndw7uz5j70?form_factor=mobile). Its remaining blocking CSS requests justified one further pass: merge the tiny shared App.css rules into the existing stylesheet and stop background prefetch from homepage links. No experimental CSS inlining was enabled; Next's documentation still labels it unsuitable for production.

There is no CrUX field data available for this origin in the baseline report. A lab test does not establish real-user INP, universal two-second loading or a field CWV pass. Google's good thresholds are assessed at the 75th percentile: LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1. The requested <2 s target is stricter; report observed results rather than promise it for every connection. [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds).

The five legacy JPEG assets total 449,638 bytes; their WebP variants total 305,234 bytes (about 32% smaller). They are not used by the current public landing page, so those byte savings are not claimed as a homepage speed improvement. Originals are preserved and old asset URLs redirect.

Inline SVG illustrations remain SVG: they are resolution-independent, have viewBox dimensions and descriptive accessible labels, and avoid extra network requests. PNG app icons remain for compatibility; private family uploads, generated QR codes and licensed Amazon media are not destructively transcoded. This is therefore not a claim that every image anywhere in the private application is WebP. New public raster previews and optimised image output are WebP.

## Content and E-E-A-T

The main copy is warmer and more precise: “Parenting changes. Find your next small step.” replaces an absolute statement about a child's intent. The site explains what a parent can do, avoids labelling a child after a short quiz, and distinguishes AI support from a human or clinical service.

The default author is **Kahiye Editorial**, explicitly a publishing byline rather than a fabricated clinician. AI assistance and pending clinical review are stated. No founder name, clinical qualification, support email or real-world outcome has been invented.

Natural writing is not proof of human authorship. This work is AI-assisted and cannot fulfil an “entirely human-authored” claim. A human editor needs to sign off the copy, verify claims and add genuine author/reviewer biographies. Content was optimised for usefulness and accuracy, not for an AI-detector score. [Google's people-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

The full copy pack includes retained article text so reviewers can assess it alongside the new front-facing language. It is not presented as 32 newly clinically reviewed or fully rewritten articles. Avoid mass expansion into health/finance topics before accountable review is available.

## Search Console submission

1. Sign in to Google Search Console using the owner's Google account.
2. Add a **Domain property** for `kahiye.app`. Copy Google's verification TXT record into the domain's DNS settings, preserving existing DNS records.
3. Verify ownership after the TXT record resolves. No verification token is fabricated or embedded in this release.
4. In **Sitemaps**, submit `https://www.kahiye.app/sitemap.xml`.
5. Inspect the homepage, article library, editorial page and two representative articles. Run the live test and request indexing for those genuinely new or changed pages; do not automate repeated requests.
6. Check Google's selected canonical against `https://www.kahiye.app/...`, and inspect any “blocked”, “duplicate”, “soft 404” or “crawled — currently not indexed” examples individually.
7. Track impressions, queries, clicks and indexed pages after recrawling. Review Core Web Vitals when enough real-user data exists. Field windows take time; an immediate lab improvement is not a Search Console field result.

Search Console submission and ownership verification have not been performed in this session. Google controls indexing and ranking.

## Remaining launch inputs and priorities

1. **Trust/legal:** real company legal name/address, grievance contact, monitored corrections/support mailbox, human editorial owner and legal review. Existing legal placeholders remain visible until real details are supplied.
2. **Clinical/safeguarding:** qualified reviewers, a defined review scope and published reviewer credentials once approved. Kept pending at the user's request.
3. **Search operations:** owner completes Search Console DNS verification and sitemap submission.
4. **Delivery/commercial activation:** previous payment, email, WhatsApp and Amazon provider acceptance requirements remain. This SEO release does not activate them.
5. **Authority:** approve factual founder materials and the separate targeted outreach draft. No message will be sent without instruction.

For email, a monitored existing Gmail address can be temporary if the owner wants it public. A professional `support@kahiye.app` mailbox can be created through [Google Workspace](https://workspace.google.com/solutions/business-email/) or [Zoho Mail](https://www.zoho.com/mail/custom-domain-email.html). The domain is already owned; an inbox service and DNS configuration are what remain. Do not publish the address before send/receive tests pass.

## Verification record

- Baseline crawl: `.playwright-mcp/seo-before.json`.
- Baseline script payload inventory: `.playwright-mcp/seo-bundles-before.json`.
- Existing lint, TypeScript and 106 unit/server tests: passed during implementation.
- Production build: passed during implementation.
- Generated HTML SEO gate: passed for 41 pages.
- `scripts/audit-seo.mjs` provides repeatable, anonymous public HTTP validation.
- CI, hosted crawl, responsive browser checks and post-release PageSpeed results: to be appended after deployment.
