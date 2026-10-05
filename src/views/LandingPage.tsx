import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Mic, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { EyeLevelScene, ElderScene, NightScene, SproutMark } from '@/components/illustrations';
import { FREE_FEATURES, PLUS_FEATURES, PRICES } from '@/lib/plans';

/**
 * Scroll reveal in pure CSS (scroll-driven animation). Browsers without support, crawlers and
 * no-JS visitors simply see the content; nothing starts hidden in the HTML.
 */
function Reveal({ children, className, hero = false }: { children: ReactNode; delay?: number; className?: string; hero?: boolean }) {
  return <div className={`${hero ? 'page-enter' : 'reveal'} ${className ?? ''}`}>{children}</div>;
}

const LANGUAGES = ['English', 'हिन्दी', 'മലയാളം', 'தமிழ்', 'मराठी', 'বাংলা', 'తెలుగు', 'ಕನ್ನಡ', 'ગુજરાતી'];
const TYPES = [
  'The Big-Hearted Storm', 'The Quiet Noticer', 'The Bold Firecracker', 'The Steady Planner',
  'The Determined Explorer', 'The Social Spark', 'The Easy Breeze', 'The Balanced Builder',
];
const TILT = [-1.5, 1, -0.5, 1.5, -1, 0.5, -1.2, 0.8];
// Coloured paper tags: turmeric, clay, leaf and plain paper tints.
const TAG_TINTS = ['oklch(90% 0.07 82)', 'oklch(89% 0.05 40)', 'oklch(90% 0.045 150)', 'oklch(99% 0.005 82)'];

export default function LandingPage() {
  return (
    <div className="bg-canvas text-slate-850 overflow-x-clip">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 pt-6 pb-24 md:pt-10 md:pb-32">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-14 lg:gap-14 items-center">
          <Reveal hero>
            <p className="text-sm font-semibold text-clay tracking-wide mb-5">For parents, from pregnancy to eighteen</p>
            <h1 className="font-heading text-[clamp(2.5rem,5.2vw,4.1rem)] leading-[1.04] text-slate-900">
              Your child isn&rsquo;t being difficult. They&rsquo;re telling you something.
            </h1>
            <p className="mt-7 text-lg md:text-xl leading-relaxed text-slate-600 max-w-[34rem]">
              Describe the moment, in English, Hindi or Hinglish. Budding gives you the exact words to say, tuned to your
              child&rsquo;s age, temperament and what has worked before.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-clay text-white text-lg font-semibold shadow-paper transition-colors duration-200 hover:bg-clay-deep"
              >
                Start free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/quiz" className="text-lg font-semibold text-slate-800 underline decoration-clay/40 decoration-2 underline-offset-[6px] hover:decoration-clay">
                Find your child&rsquo;s type
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">Free to start. No card needed. Private by design.</p>
          </Reveal>

          <Reveal hero className="relative [animation-delay:120ms]">
            <div className="paper-grain rounded-[2.5rem] bg-paper-deep overflow-hidden">
              <EyeLevelScene className="w-full h-auto" />
            </div>
            <SayThisSlip className="absolute -bottom-10 left-4 right-10 sm:left-8 sm:right-auto sm:max-w-sm" />
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="px-5 sm:px-8 py-20 md:py-28 scroll-mt-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900 max-w-2xl">
              Three steps, right in the middle of the moment.
            </h2>
          </Reveal>

          <ol className="mt-16 space-y-16 md:space-y-20">
            <Step n="1" title="Tell Budding what’s happening" body="Type it or say it, the way you’d tell a friend. Budding already knows your child’s age and temperament.">
              <div className="flex md:justify-end">
                <div className="max-w-sm rounded-[1.5rem] rounded-br-md bg-surface shadow-paper px-5 py-4">
                  <p className="text-slate-800 leading-relaxed">Aarav hit his little sister when she took his blocks. He&rsquo;s still screaming.</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Mic className="w-3.5 h-3.5" /> or just speak</p>
                </div>
              </div>
            </Step>
            <Step n="2" title="Get the words to say" body="Not an article. The sentence to say right now, two or three things to do, and the one thing to avoid with this particular child.">
              <div className="rounded-[1.75rem] bg-surface shadow-paper p-6 md:p-7 max-w-md">
                <p className="text-xs font-semibold tracking-wide text-clay mb-2">Say this</p>
                <p className="font-heading text-2xl leading-snug text-slate-900">
                  &ldquo;You&rsquo;re so angry. I won&rsquo;t let you hit. Let&rsquo;s stamp our feet together.&rdquo;
                </p>
                <ol className="mt-5 space-y-2 text-slate-700">
                  <li className="flex gap-3"><span className="w-4 flex-shrink-0 font-heading text-clay [font-variant-numeric:lining-nums]">1</span>Move between them, calmly, before you speak.</li>
                  <li className="flex gap-3"><span className="w-4 flex-shrink-0 font-heading text-clay [font-variant-numeric:lining-nums]">2</span>Give the blocks a home for two minutes.</li>
                </ol>
                <p className="mt-5 pt-4 border-t border-slate-200 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Avoid:</span> asking him to say sorry while he&rsquo;s still flooded.
                </p>
              </div>
            </Step>
            <Step n="3" title="Tell it what worked" body="One tap afterwards. Next time, Budding starts from what actually works for your child, not for children in general.">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-leaf text-white px-5 py-2.5 font-semibold"><ThumbsUp className="w-4 h-4" /> It worked</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-600"><Minus className="w-4 h-4" /> Partly</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-600"><ThumbsDown className="w-4 h-4" /> Didn&rsquo;t</span>
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
              <p className="text-[15px] leading-relaxed text-slate-800" lang="hi">
                अम्मा, आरव गुस्से में हो तो पहले उसके पास बैठिए और कहिए: &ldquo;तुम्हें बहुत गुस्सा आ रहा है। मैं यहीं हूँ।&rdquo;
              </p>
              <p className="mt-1 text-right text-[11px] text-slate-500">9:12 pm ✓✓</p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="order-1 md:order-2">
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">Same words, every caregiver.</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 max-w-lg">
              Children settle when every adult responds the same way. Send the plan to Dadi, Nani, your partner or your
              nanny on WhatsApp, written warmly for them, in their language.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Languages">
              {LANGUAGES.map((l) => (
                <li key={l} className="rounded-full bg-surface px-4 py-1.5 text-slate-700 shadow-xs">{l}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Bedtime stories ─────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28 bg-night text-[oklch(94%_0.02_82)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-12 md:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-semibold text-turmeric tracking-wide mb-4">Bedtime stories</p>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.1]">Tonight, Aarav is the hero.</h2>
            <p className="mt-6 text-lg leading-[1.75] text-[oklch(82%_0.03_82)] max-w-lg">
              A story written for what&rsquo;s on his mind: a new school, a new sibling, the dark. The hero feels the same
              worry and finds a small, brave way through. Read it yourself, or let Budding read it aloud.
            </p>
            <blockquote className="mt-8 font-heading text-xl leading-relaxed text-[oklch(90%_0.03_82)] max-w-md">
              &ldquo;Aarav put his bravest thing in his pocket, a small red pebble, and walked up to the big blue gate&hellip;&rdquo;
            </blockquote>
          </Reveal>
          <Reveal delay={0.1}>
            <NightScene className="w-full h-auto" />
          </Reveal>
        </div>
      </section>

      {/* ── Quiz teaser ─────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl">
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">
              What&rsquo;s your child&rsquo;s temperament type?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Six questions, sixty seconds, free. Find out why they react the way they do, and what tends to work.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-10 flex flex-wrap gap-3">
              {TYPES.map((t, i) => (
                <li key={t} className="rounded-2xl shadow-paper px-5 py-3 font-heading text-lg text-slate-850" style={{ rotate: `${TILT[i]}deg`, background: TAG_TINTS[i % TAG_TINTS.length] }}>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/quiz" className="mt-10 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-slate-850 text-white font-semibold transition-colors hover:bg-slate-700">
              Take the free quiz <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-5 sm:px-8 py-20 md:py-28 bg-paper-deep scroll-mt-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] text-slate-900">Less than a cup of chai a week.</h2>
            <p className="mt-4 text-lg text-slate-600">Start free. Upgrade when Budding has earned it.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12 grid md:grid-cols-2 gap-5">
              <div className="flex flex-col rounded-[2rem] bg-surface p-8 md:p-10">
                <p className="font-semibold text-slate-600">Free</p>
                <p className="mt-2 font-heading text-5xl text-slate-900 [font-variant-numeric:lining-nums]">₹0</p>
                <ul className="mt-8 mb-10 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-slate-700"><Check className="w-5 h-5 mt-0.5 text-slate-400 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/app" className="mt-auto pt-0 flex items-center justify-center h-12 rounded-full border border-slate-300 font-semibold text-slate-800 transition-colors hover:bg-slate-100">
                  Start free
                </Link>
              </div>
              <div className="flex flex-col rounded-[2rem] bg-surface p-8 md:p-10 ring-2 ring-clay shadow-lift">
                <p className="font-semibold text-clay">Plus</p>
                <p className="mt-2 font-heading text-5xl text-slate-900 [font-variant-numeric:lining-nums]">
                  {PRICES.yearly.amount}<span className="font-sans text-lg text-slate-500"> / year</span>
                </p>
                <p className="mt-1 text-slate-500">or {PRICES.monthly.amount} a month</p>
                <ul className="mt-8 mb-10 space-y-3">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-slate-700"><Check className="w-5 h-5 mt-0.5 text-clay flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/app" className="mt-auto flex items-center justify-center h-12 rounded-full bg-clay text-white font-semibold transition-colors hover:bg-clay-deep">
                  Try free, then upgrade
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
            ['Grounded, not guessed', 'Every answer draws on developmental psychology and attachment research, then on what has worked for your child.'],
            ['Safety comes first', 'If something sounds serious, Budding says so plainly and puts Childline 1098, Tele-MANAS 14416 and 112 one tap away.'],
            ['Private by design', "Your family's details are never sold or used for ads. Delete everything, anytime, in one step."],
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

      {/* ── Close ───────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 pb-24 md:pb-32">
        <Reveal className="relative overflow-hidden max-w-6xl mx-auto rounded-[2.5rem] bg-clay text-white px-8 py-14 md:px-16 md:py-20 paper-grain">
          <svg viewBox="0 0 200 220" aria-hidden className="hidden md:block absolute right-10 lg:right-20 bottom-0 w-56 lg:w-72 h-auto">
            <path d="M100 220 Q 96 160 104 112" stroke="oklch(var(--clay-deep))" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M102 150 Q 50 104 12 122 Q 34 176 102 160 Z" fill="oklch(var(--clay-deep))" />
            <path d="M104 118 Q 140 46 194 62 Q 182 128 106 128 Z" fill="oklch(var(--turmeric))" />
          </svg>
          <h2 className="font-heading text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.06] max-w-3xl">
            The next hard moment is coming. Have the words ready.
          </h2>
          <Link href="/app" className="mt-10 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-[oklch(97%_0.012_82)] text-clay-deep text-lg font-semibold transition-transform duration-200 hover:-translate-y-0.5">
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
        </Reveal>
      </section>

      <footer className="px-5 sm:px-8 py-10 border-t border-slate-200 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-between">
          <span>© {new Date().getFullYear()} Budding.live · General guidance, not medical advice.</span>
          <nav className="flex gap-6">
            <Link href="/quiz" className="hover:text-slate-900">Temperament quiz</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
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
        <Link href="/" className="flex items-center gap-2.5" aria-label="Budding home">
          <SproutMark className="w-8 h-8" />
          <span className="font-heading text-2xl text-slate-900">budding</span>
        </Link>
        <nav className="flex items-center gap-6 text-[15px]">
          <Link href="/quiz" className="hidden md:inline text-slate-600 hover:text-slate-900">Free quiz</Link>
          <Link href="/#how" className="hidden md:inline text-slate-600 hover:text-slate-900">How it works</Link>
          <Link href="/#pricing" className="hidden md:inline text-slate-600 hover:text-slate-900">Pricing</Link>
          <Link href="/login?next=/app" className="font-semibold text-slate-800 hover:text-clay">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

function Step({ n, title, body, children }: { n: string; title: string; body: string; children: ReactNode }) {
  return (
    <li>
      <Reveal className="grid md:grid-cols-[1fr_1.1fr] gap-8 md:gap-16 items-center">
        <div className="flex gap-6">
          <span className="font-heading text-6xl leading-none text-clay/80" aria-hidden>{n}</span>
          <div>
            <h3 className="font-heading text-2xl md:text-3xl text-slate-900">{title}</h3>
            <p className="mt-3 text-lg leading-relaxed text-slate-600 max-w-md">{body}</p>
          </div>
        </div>
        <div>{children}</div>
      </Reveal>
    </li>
  );
}

function SayThisSlip({ className }: { className?: string }) {
  return (
    <div className={`rounded-[1.5rem] bg-surface shadow-lift px-6 py-5 rotate-[-1.5deg] ${className ?? ''}`}>
      <p className="text-xs font-semibold tracking-wide text-clay mb-1.5">Say this to Ira</p>
      <p className="font-heading text-xl leading-snug text-slate-900">
        &ldquo;You wanted to stay longer. Two more slides, then shoes. Hop or march?&rdquo;
      </p>
    </div>
  );
}
