import Link from "next/link";
import { ARTICLES, readingMinutes } from "@/data/articles";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Mic,
  ThumbsUp,
  Minus,
  ThumbsDown,
} from "lucide-react";
import {
  EyeLevelScene,
  ElderScene,
  NightScene,
  SproutMark,
} from "@/components/illustrations";
import { FREE_FEATURES, PLUS_FEATURES, PRICES } from "@/lib/plans";
import { HOME_FAQS, faqSchema, jsonLd, organizationSchema, websiteSchema } from "@/lib/seo";

/**
 * Scroll reveal in pure CSS (scroll-driven animation). Browsers without support, crawlers and
 * no-JS visitors simply see the content; nothing starts hidden in the HTML.
 */
function Reveal({
  children,
  className,
  hero = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  hero?: boolean;
}) {
  return (
    <div className={`${hero ? "" : "reveal"} ${className ?? ""}`}>
      {children}
    </div>
  );
}

const LANGUAGES = [
  "English",
  "हिन्दी",
  "മലയാളം",
  "தமிழ்",
  "मराठी",
  "বাংলা",
  "తెలుగు",
  "ಕನ್ನಡ",
  "ગુજરાતી",
];
const TYPES = [
  "A change of plan",
  "Meeting someone new",
  "One more try",
  "Time to leave",
  "A busy room",
  "Playing together",
  "A new place",
  "A quiet moment",
];
const STAGES = [
  {
    name: "Pregnancy",
    age: "Week by week",
    moment: "Is this tiredness normal at week 9?",
    color: "oklch(var(--turmeric))",
  },
  {
    name: "Baby",
    age: "0–2 years",
    moment: "She cries every time I put her down.",
    color: "oklch(var(--leaf))",
  },
  {
    name: "Little ones",
    age: "3–6 years",
    moment: "He hits his sister when she takes his toys.",
    color: "oklch(var(--clay))",
  },
  {
    name: "School years",
    age: "7–12 years",
    moment: "Every evening ends in a homework meltdown.",
    color: "oklch(var(--night-soft))",
  },
  {
    name: "Teens",
    age: "13–18 years",
    moment: "She slammed the door and won’t talk to me.",
    color: "oklch(var(--clay-deep))",
  },
];
const TILT = [-1.5, 1, -0.5, 1.5, -1, 0.5, -1.2, 0.8];
// Coloured paper tags: turmeric, clay, leaf and plain paper tints.
const TAG_TINTS = [
  "oklch(90% 0.07 82)",
  "oklch(89% 0.05 40)",
  "oklch(90% 0.045 150)",
  "oklch(99% 0.005 82)",
];

export default function LandingPage() {
  return (
    <div className="bg-canvas text-slate-850 overflow-x-clip">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to content</a>
      <SiteHeader />
      <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([organizationSchema, websiteSchema, faqSchema]) }} />
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 pt-6 pb-24 md:pt-10 md:pb-32">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-14 lg:gap-14 items-center">
          <Reveal hero>
            <p className="text-sm font-semibold text-clay tracking-wide mb-5">
              For parents of children aged 3 to 8
            </p>
            <h1 className="font-heading text-[clamp(2.5rem,5.2vw,4.1rem)] leading-[1.04] text-slate-900">
              The words for the shoe rack, the park and the bedtime fight.
            </h1>
            <p className="mt-7 text-lg md:text-xl leading-relaxed text-slate-600 max-w-[34rem]">
              Describe the moment and get words to try, shaped to your
              child&rsquo;s age. Send the same words to Dadi or the nanny in
              Hindi, Tamil and seven more languages. Kahiye grows with your
              child, from pregnancy to eighteen.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link prefetch={false}
                href="/app"
                className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-clay text-white text-lg font-semibold shadow-paper transition-colors duration-200 hover:bg-clay-deep"
              >
                Start free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link prefetch={false}
                href="/quiz"
                className="text-lg font-semibold text-slate-800 underline decoration-clay/40 decoration-2 underline-offset-[6px] hover:decoration-clay"
              >
                Try four little moments
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Start free. No card needed. You choose what to share.
            </p>
          </Reveal>

          <Reveal hero className="relative [animation-delay:120ms]">
            <div className="paper-grain rounded-[2.5rem] bg-paper-deep overflow-hidden">
              <EyeLevelScene className="w-full h-auto" />
            </div>
            <SayThisSlip className="absolute -bottom-10 left-4 right-10 sm:left-8 sm:right-auto sm:max-w-sm" />
          </Reveal>
        </div>
      </section>

      <section
        className="px-5 sm:px-8 py-16 border-t border-slate-200"
        aria-labelledby="reading-title"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-clay mb-4">
            The reading room · Free, for every parent
          </p>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2
              id="reading-title"
              className="font-heading text-3xl md:text-4xl max-w-xl"
            >
              For the questions that grow with them.
            </h2>
            <Link prefetch={false} href="/articles" className="text-clay underline py-2">
              Explore all parenting articles →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-10">
            {[
              "first-period-school-plan",
              "peer-pressure-preteens",
              "newborn-bonding-activities",
            ]
              .map((slug) => ARTICLES.find((a) => a.slug === slug))
              .filter((a) => !!a)
              .map((a) => (
                <article key={a.slug} className="border-t border-clay/30 pt-5">
                  <p className="text-sm text-clay">
                    {a.category} · {readingMinutes(a)} min read
                  </p>
                  <h3 className="font-heading text-2xl mt-4">
                    <Link prefetch={false}
                      href={`/articles/${a.slug}`}
                      className="hover:text-clay underline decoration-clay/30 underline-offset-4"
                    >
                      {a.title}
                    </Link>
                  </h3>
                  <p className="text-slate-600 leading-7 mt-4">{a.summary}</p>
                  <p className="text-xs text-slate-600 mt-4">{a.age}</p>
                </article>
              ))}
          </div>
        </div>
      </section>
      {/* ── All eighteen years ─────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-16 md:py-20 border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="font-heading text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] text-slate-900 max-w-3xl">
              From the first days to the teenage years, the questions keep changing.
            </h2>
          </Reveal>
          <ol className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10">
            {STAGES.map((st, i) => (
              <li key={st.name} className="reveal relative pt-7">
                <span
                  className="absolute top-0 left-0 w-3 h-3 rounded-full"
                  style={{ background: st.color }}
                  aria-hidden
                />
                {i < STAGES.length - 1 && (
                  <span
                    className="hidden md:block absolute top-[5px] left-5 right-[-1.5rem] h-px bg-slate-300"
                    aria-hidden
                  />
                )}
                <p className="font-heading text-xl text-slate-900">{st.name}</p>
                <p className="mt-1 text-sm text-slate-600">{st.age}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  &ldquo;{st.moment}&rdquo;
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="px-5 sm:px-8 py-20 md:py-28 scroll-mt-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900 max-w-2xl">
              Start with what happened.
            </h2>
          </Reveal>

          <ol className="mt-16 space-y-16 md:space-y-20">
            <Step
              n="1"
              title="Tell Kahiye what’s happening"
              body="A few sentences are enough. Choose your child’s profile and describe what happened. Add the details you think matter."
            >
              <div className="flex md:justify-end">
                <div className="max-w-sm rounded-[1.5rem] rounded-br-md bg-surface shadow-paper px-5 py-4">
                  <p className="text-slate-800 leading-relaxed">
                    Aarav hit his little sister when she took his blocks.
                    He&rsquo;s still screaming.
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <Mic className="w-3.5 h-3.5" /> or just speak
                  </p>
                </div>
              </div>
            </Step>
            <Step
              n="2"
              title="Find words you can try"
              body="Get a possible way to begin, a few practical steps and something to watch out for. Read it, adjust it and use your own judgment."
            >
              <div className="rounded-[1.75rem] bg-surface shadow-paper p-6 md:p-7 max-w-md">
                <p className="text-xs font-semibold tracking-wide text-clay mb-2">
                  Say this
                </p>
                <p className="font-heading text-2xl leading-snug text-slate-900">
                  &ldquo;You&rsquo;re so angry. I won&rsquo;t let you hit.
                  Let&rsquo;s stamp our feet together.&rdquo;
                </p>
                <ol className="mt-5 space-y-2 text-slate-700">
                  <li className="flex gap-3">
                    <span className="w-4 flex-shrink-0 font-heading text-clay [font-variant-numeric:lining-nums]">
                      1
                    </span>
                    Move between them, calmly, before you speak.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-4 flex-shrink-0 font-heading text-clay [font-variant-numeric:lining-nums]">
                      2
                    </span>
                    Give the blocks a home for two minutes.
                  </li>
                </ol>
                <p className="mt-5 pt-4 border-t border-slate-200 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Avoid:</span>{" "}
                  asking him to say sorry while he&rsquo;s still flooded.
                </p>
              </div>
            </Step>
            <Step
              n="3"
              title="Tell it what worked"
              body="Leave a little feedback. With memory enabled, it can help shape future suggestions. You can review, change or pause what Kahiye remembers."
            >
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-leaf text-white px-5 py-2.5 font-semibold">
                  <ThumbsUp className="w-4 h-4" /> It worked
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-600">
                  <Minus className="w-4 h-4" /> Partly
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-600">
                  <ThumbsDown className="w-4 h-4" /> Didn&rsquo;t
                </span>
              </div>
            </Step>
          </ol>
        </div>
      </section>

      {/* ── Family ───────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28 bg-paper-deep">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <Reveal className="relative order-2 md:order-1">
            <ElderScene className="w-full max-w-md mx-auto h-auto" />
            <div className="absolute right-0 sm:right-4 top-2 max-w-[16.5rem] rounded-[1.25rem] rounded-tl-md bg-[oklch(93%_0.05_150)] shadow-paper px-4 py-3">
              <p
                className="text-[15px] leading-relaxed text-slate-800"
                lang="hi"
              >
                अम्मा, आरव गुस्से में हो तो पहले उसके पास बैठिए और कहिए:
                &ldquo;तुम्हें बहुत गुस्सा आ रहा है। मैं यहीं हूँ।&rdquo;
              </p>
              <p className="mt-1 text-right text-[11px] text-slate-600">
                9:12 pm ✓✓
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="order-1 md:order-2">
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">
              Help the adults around your child work together.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 max-w-lg">
              Agree on a small plan with your partner, Dadi, Nani or another
              caregiver. Read the suggested message, adjust it and share it
              yourself on WhatsApp. You choose the words and who receives them.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Languages">
              {LANGUAGES.map((l) => (
                <li
                  key={l}
                  className="rounded-full bg-surface px-4 py-1.5 text-slate-700 shadow-xs"
                >
                  {l}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Bedtime stories ─────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28 bg-night text-[oklch(94%_0.02_82)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-12 md:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-semibold text-turmeric tracking-wide mb-4">
              Bedtime stories
            </p>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.1]">
              Make room for a story together.
            </h2>
            <p className="mt-6 text-lg leading-[1.75] text-[oklch(82%_0.03_82)] max-w-lg">
              For younger children, a made-up adventure can be a lovely way to
              spend a few minutes together. Choose a familiar theme, read the
              story first, then settle in and see where their questions take you.
            </p>
            <blockquote className="mt-8 font-heading text-xl leading-relaxed text-[oklch(90%_0.03_82)] max-w-md">
              &ldquo;Aarav put his bravest thing in his pocket, a small red
              pebble, and walked up to the big blue gate&hellip;&rdquo;
            </blockquote>
          </Reveal>
          <Reveal delay={0.1}>
            <NightScene className="w-full h-auto" />
          </Reveal>
        </div>
      </section>

      {/* ── Free tools ──────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <p className="reveal text-sm font-semibold text-clay tracking-wide mb-4">
            Free, no sign-up
          </p>
          <Reveal className="max-w-2xl">
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">
              Everyday moments. A little more understanding.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Four everyday scenes, matched to their age. Choose what feels
              familiar and take away a small idea. No score, no right answers.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-10 flex flex-wrap gap-3">
              {TYPES.map((t, i) => (
                <li
                  key={t}
                  className="rounded-2xl shadow-paper px-5 py-3 font-heading text-lg text-slate-850"
                  style={{
                    rotate: `${TILT[i]}deg`,
                    background: TAG_TINTS[i % TAG_TINTS.length],
                  }}
                >
                  {t}
                </li>
              ))}
            </ul>
            <Link prefetch={false}
              href="/quiz"
              className="mt-10 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-slate-850 text-white font-semibold transition-colors hover:bg-slate-700"
            >
              Take the free quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <Reveal className="mt-16">
            <Link prefetch={false}
              href="/tools/due-date"
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2rem] bg-paper-deep px-7 py-7 sm:px-10 transition-colors hover:bg-[oklch(91%_0.025_78)]"
            >
              <div>
                <p className="font-heading text-2xl text-slate-900">
                  Expecting? Work out your due date.
                </p>
                <p className="mt-1 text-slate-600">
                  From your last period, conception or IVF transfer, with what
                  usually comes next.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 font-semibold text-clay whitespace-nowrap">
                Due date calculator{" "}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="px-5 sm:px-8 py-20 md:py-28 bg-paper-deep scroll-mt-6"
      >
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">
              Try Kahiye at your own pace.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Start with the free plan. Plus is planned; paid checkout is not
              open yet. The prices below show the intended subscription options.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12 grid md:grid-cols-2 gap-5">
              <div className="flex flex-col rounded-[2rem] bg-surface p-8 md:p-10">
                <p className="font-semibold text-slate-600">Free</p>
                <p className="mt-2 font-heading text-5xl text-slate-900 [font-variant-numeric:lining-nums]">
                  ₹0
                </p>
                <ul className="mt-8 mb-10 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-slate-700">
                      <Check className="w-5 h-5 mt-0.5 text-slate-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link prefetch={false}
                  href="/app"
                  className="mt-auto pt-0 flex items-center justify-center h-12 rounded-full border border-slate-300 font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                >
                  Start free
                </Link>
              </div>
              <div className="flex flex-col rounded-[2rem] bg-surface p-8 md:p-10 ring-2 ring-clay shadow-lift">
                <p className="font-semibold text-clay">Plus</p>
                <p className="mt-2 font-heading text-5xl text-slate-900 [font-variant-numeric:lining-nums]">
                  {PRICES.yearly.amount}
                  <span className="font-sans text-lg text-slate-600">
                    {" "}
                    / year
                  </span>
                </p>
                <p className="mt-1 text-slate-600">
                  or {PRICES.monthly.amount} a month
                </p>
                <ul className="mt-8 mb-10 space-y-3">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-slate-700">
                      <Check className="w-5 h-5 mt-0.5 text-clay flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link prefetch={false}
                  href="/app"
                  className="mt-auto flex items-center justify-center h-12 rounded-full bg-clay text-white font-semibold transition-colors hover:bg-clay-deep"
                >
                  Start with the free plan
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Care ────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {[
            [
              "Useful, with clear limits",
              "Research informs the guidance, but AI can make mistakes. Independent clinical review is pending. Bring health concerns to a clinician who knows your child.",
            ],
            [
              "Safety comes first",
              "Urgent concerns need human help. Immediate support contacts are available without signing in. Kahiye is not an emergency service.",
            ],
            [
              "Clear about referrals",
              "No display ads. The business model includes subscriptions, labelled referrals and partnerships. Referral commissions are not used to rank products.",
            ],
          ].map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="pt-6 border-t border-slate-300">
                <h3 className="font-heading text-xl text-slate-900">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-20" aria-labelledby="faq-title">
        <div className="max-w-3xl mx-auto">
          <h2 id="faq-title" className="font-heading text-3xl sm:text-4xl mb-8">A few things you might be wondering.</h2>
          {HOME_FAQS.map(({ question, answer }) => <details key={question} className="border-t border-slate-300 py-5">
            <summary className="cursor-pointer text-lg font-semibold text-slate-900">{question}</summary>
            <p className="mt-4 leading-relaxed text-slate-700">{answer}</p>
          </details>)}
          <p className="mt-6 text-slate-700">Read our <Link prefetch={false} href="/editorial" className="underline">editorial approach</Link> or find <Link prefetch={false} href="/help-now" className="underline">immediate support</Link>.</p>
        </div>
      </section>
      {/* ── Close ───────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 pb-24 md:pb-32">
        <Reveal className="relative overflow-hidden max-w-6xl mx-auto rounded-[2.5rem] bg-clay text-white px-8 py-14 md:px-16 md:py-20 paper-grain">
          <svg
            viewBox="0 0 200 220"
            aria-hidden
            className="hidden md:block absolute right-10 lg:right-20 bottom-0 w-56 lg:w-72 h-auto"
          >
            <path
              d="M100 220 Q 96 160 104 112"
              stroke="oklch(var(--clay-deep))"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M102 150 Q 50 104 12 122 Q 34 176 102 160 Z"
              fill="oklch(var(--clay-deep))"
            />
            <path
              d="M104 118 Q 140 46 194 62 Q 182 128 106 128 Z"
              fill="oklch(var(--turmeric))"
            />
          </svg>
          <h2 className="font-heading text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.06] max-w-3xl">
            You don&rsquo;t need all the answers today.
          </h2>
          <Link prefetch={false}
            href="/app"
            className="mt-10 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-[oklch(97%_0.012_82)] text-clay-deep text-lg font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          >
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>
      </section>
      </main>
      <footer className="px-5 sm:px-8 py-10 border-t border-slate-200 text-sm text-slate-600">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 justify-between">
          <span>
            © {new Date().getFullYear()} Kahiye · <span lang="hi">कहिए</span>,
            Hindi for &ldquo;please, say it&rdquo; · General guidance, not
            medical advice.
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-4">
            <Link prefetch={false} href="/about" className="hover:text-slate-900">About</Link>
            <Link prefetch={false} href="/editorial" className="hover:text-slate-900">Editorial approach</Link>
            <Link prefetch={false} href="/help-now" className="hover:text-slate-900">Immediate support</Link>
            <Link prefetch={false} href="/quiz" className="hover:text-slate-900">
              Everyday moments quiz
            </Link>
            <Link prefetch={false} href="/tools/due-date" className="hover:text-slate-900">
              Due date calculator
            </Link>
            <Link prefetch={false} href="/articles" className="hover:text-slate-900">
              Parenting guides
            </Link>
            <Link prefetch={false} href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link prefetch={false} href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="px-5 sm:px-8 py-5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
        <Link prefetch={false}
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Kahiye home"
        >
          <SproutMark className="w-8 h-8" />
          <span className="font-heading text-2xl text-slate-900">kahiye</span>
        </Link>
        <nav className="flex items-center gap-6 text-[15px]">
          <Link prefetch={false} href="/articles" className="text-slate-600 hover:text-clay">
            Articles
          </Link>
          <Link prefetch={false}
            href="/quiz"
            className="hidden md:inline text-slate-600 hover:text-slate-900"
          >
            Free quiz
          </Link>
          <Link prefetch={false}
            href="/#how"
            className="hidden md:inline text-slate-600 hover:text-slate-900"
          >
            How it works
          </Link>
          <Link prefetch={false}
            href="/#pricing"
            className="hidden md:inline text-slate-600 hover:text-slate-900"
          >
            Pricing
          </Link>
          <Link prefetch={false}
            href="/login?next=/app"
            className="font-semibold text-slate-800 hover:text-clay"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Step({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Reveal className="grid md:grid-cols-[1fr_1.1fr] gap-8 md:gap-16 items-center">
        <div className="flex gap-6">
          <span
            className="font-heading text-6xl leading-none text-clay/80 [font-variant-numeric:lining-nums]"
            aria-hidden
          >
            {n}
          </span>
          <div>
            <h3 className="font-heading text-2xl md:text-3xl text-slate-900">
              {title}
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-slate-600 max-w-md">
              {body}
            </p>
          </div>
        </div>
        <div>{children}</div>
      </Reveal>
    </li>
  );
}

function SayThisSlip({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-[1.5rem] bg-surface shadow-lift px-6 py-5 rotate-[-1.5deg] ${className ?? ""}`}
    >
      <p className="text-xs font-semibold tracking-wide text-clay mb-1.5">
        Say this to Ira
      </p>
      <p className="font-heading text-xl leading-snug text-slate-900">
        &ldquo;You wanted to stay longer. Two more slides, then shoes. Hop or
        march?&rdquo;
      </p>
    </div>
  );
}
