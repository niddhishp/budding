import type { Metadata } from 'next';

// Search identity is fixed to the public host, never a preview or localhost origin.
export const SITE_URL = 'https://www.kahiye.app';
export const EDITORIAL_URL = `${SITE_URL}/editorial`;
export const EDITORIAL_NAME = 'Kahiye Editorial';
export const EDITORIAL_BIO = 'Kahiye Editorial publishes practical guides for everyday parenting, with links to the sources behind each topic. The guides include AI-assisted drafting and are not presented as independently clinically reviewed. Use them to prepare a conversation or a question for your clinician, not to diagnose your child.';
export const SITE_DESCRIPTION = 'Find words for tricky parenting moments, prepare for the next stage and keep family plans together. Age-aware guidance from pregnancy to the teenage years.';
export const PUBLIC_PAGES = [
  '/', '/articles', '/about', '/editorial', '/quiz', '/tools/due-date', '/help-now', '/privacy', '/terms',
] as const;
export function publicMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Kahiye', type: 'website', images: [{ url: `${SITE_URL}/kahiye-social.webp`, width: 1200, height: 630, alt: 'Kahiye — a parenting handbook, with help for the moment you are in' }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/kahiye-social.webp`] },
  };
}
export const PRIVATE_ROBOTS = { index: false, follow: false, nocache: true } as const;
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: SITE_URL + item.path })) };
}
export const organizationSchema = {
  '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#organization`,
  name: 'Kahiye', url: SITE_URL, description: SITE_DESCRIPTION,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/kahiye-mark.webp`, width: 256, height: 256 },
};
export const websiteSchema = {
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`,
  name: 'Kahiye', alternateName: 'कहिए', url: SITE_URL, publisher: { '@id': `${SITE_URL}/#organization` },
};
export const HOME_FAQS = [
  { question: 'What can I use Kahiye for?', answer: 'Ask for help with a difficult moment, practise a conversation or read a guide before a new stage begins. You can also keep your child’s growth records, care dates, interests, savings goals and private photo memories together.' },
  { question: 'Which ages does Kahiye cover?', answer: 'Kahiye is built for parents from pregnancy through the teenage years. When you select a child, their date of birth helps choose the relevant guidance. Age is a starting point, not a deadline for development.' },
  { question: 'Is the parenting quiz a test?', answer: 'No. It offers four everyday situations and asks what feels familiar. There is no score or right answer, and you can skip it entirely.' },
  { question: 'Is Kahiye a therapist or a medical service?', answer: 'No. The chat offers AI support, not a human conversation or diagnosis. Independent clinical review of the guides is pending. For health concerns, speak to a qualified clinician; in an emergency, contact local emergency services.' },
  { question: 'Can I try Kahiye without paying?', answer: 'Yes. You can start with the free plan without a payment card. Paid subscriptions are planned, but checkout is not open yet. The public articles and due date calculator do not require an account.' },
  { question: 'How does Kahiye earn money?', answer: 'The business model includes subscriptions, selected product referrals and partnerships. Referral links are labelled. Kahiye does not run display ads, and commissions are not used to rank product recommendations.' },
] as const;
export const faqSchema = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
};
