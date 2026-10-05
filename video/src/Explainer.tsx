import type { CSSProperties, ReactNode } from 'react';
import {
  AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { loadFont as loadYoungSerif } from '@remotion/google-fonts/YoungSerif';
import { loadFont as loadAtkinson } from '@remotion/google-fonts/AtkinsonHyperlegibleNext';
import { loadFont as loadMukta } from '@remotion/google-fonts/Mukta';
import { EyeLevelScene, ElderScene, NightScene } from './illustrations';
import './theme.css';

const { fontFamily: SERIF } = loadYoungSerif('normal', { weights: ['400'], subsets: ['latin'] });
const { fontFamily: SANS } = loadAtkinson('normal', { weights: ['400', '600'], subsets: ['latin'] });
const { fontFamily: DEVA } = loadMukta('normal', { weights: ['400'], subsets: ['devanagari'] });

const C = {
  paper: 'oklch(96.8% 0.014 82)',
  paperDeep: 'oklch(93.5% 0.02 78)',
  surface: 'oklch(99.2% 0.005 82)',
  ink: 'oklch(21% 0.018 50)',
  inkSoft: 'oklch(45% 0.019 54)',
  clay: 'oklch(55% 0.135 38)',
  leaf: 'oklch(51% 0.085 152)',
  turmeric: 'oklch(80% 0.145 80)',
  night: 'oklch(27% 0.055 268)',
  moonText: 'oklch(94% 0.02 82)',
};
const SHADOW = '0 2px 2px oklch(30% 0.03 50 / 0.06), 0 24px 48px -16px oklch(30% 0.05 45 / 0.25)';
const EASE = Easing.bezier(0.25, 1, 0.5, 1);

// Scene timing (30 fps). Durations are tuned for reading speed at a glance.
export const SCENES = {
  night: { from: 0, dur: 150 },
  reframe: { from: 150, dur: 180 },
  tell: { from: 330, dur: 240 },
  say: { from: 570, dur: 270 },
  worked: { from: 840, dur: 180 },
  family: { from: 1020, dur: 210 },
  story: { from: 1230, dur: 210 },
  close: { from: 1440, dur: 210 },
};
export const TOTAL_FRAMES = 1650;

// ── helpers ──────────────────────────────────────────────────────────────────
const appear = (frame: number, start: number, dur = 18) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });

function Rise({ at, children, style, distance = 28 }: { at: number; children: ReactNode; style?: CSSProperties; distance?: number }) {
  const frame = useCurrentFrame();
  const p = appear(frame, at);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>;
}

/** Fades the whole scene in and out so cuts feel like turning a page. */
function Scene({ dur, bg, children }: { dur: number; bg: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(appear(frame, 0, 12), interpolate(frame, [dur - 12, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return <AbsoluteFill style={{ background: bg, opacity }}>{children}</AbsoluteFill>;
}

function useLayout() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const u = Math.min(width, height) / 1080; // 1 at 1080p, so sizes stay proportional
  return { vertical, u, width, height };
}

function Grain() {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.06 }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

function StepLabel({ n, text, at }: { n: string; text: string; at: number }) {
  const { u } = useLayout();
  return (
    <Rise at={at} style={{ display: 'flex', alignItems: 'baseline', gap: 22 * u }}>
      <span style={{ fontFamily: SERIF, fontSize: 92 * u, color: C.clay, lineHeight: 1, fontVariantNumeric: 'lining-nums' }}>{n}</span>
      <span style={{ fontFamily: SERIF, fontSize: 54 * u, color: C.ink }}>{text}</span>
    </Rise>
  );
}

// ── scenes ───────────────────────────────────────────────────────────────────
function NightOpen() {
  const { u } = useLayout();
  const lines = ['He’s screaming.', 'She’s crying.', 'And you’re out of words.'];
  return (
    <Scene dur={SCENES.night.dur} bg={C.night}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${140 * u}px`, color: C.moonText, fontFamily: SERIF }}>
        <Rise at={4}><p style={{ fontFamily: SANS, fontSize: 34 * u, color: C.turmeric, margin: 0 }}>9:12 pm</p></Rise>
        {lines.map((l, i) => (
          <Rise key={l} at={28 + i * 26}>
            <p style={{ fontSize: (i === 2 ? 92 : 76) * u, lineHeight: 1.12, margin: `${14 * u}px 0 0` }}>{l}</p>
          </Rise>
        ))}
      </AbsoluteFill>
    </Scene>
  );
}

function Reframe() {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const art = spring({ frame: frame - 30, fps: 30, config: { damping: 200 } });
  return (
    <Scene dur={SCENES.reframe.dur} bg={C.paper}>
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 70 * u, padding: 110 * u }}>
        <div style={{ flex: vertical ? 'none' : 1.15, fontFamily: SERIF, color: C.ink }}>
          <Rise at={6}><p style={{ fontSize: 96 * u, lineHeight: 1.04, margin: 0 }}>Your child isn’t being difficult.</p></Rise>
          <Rise at={48}><p style={{ fontSize: 96 * u, lineHeight: 1.04, margin: `${18 * u}px 0 0`, color: C.clay }}>They’re telling you something.</p></Rise>
        </div>
        <div style={{ flex: vertical ? 'none' : 1, width: vertical ? '82%' : undefined, opacity: art, transform: `translateY(${(1 - art) * 60}px)`, borderRadius: 56 * u, overflow: 'hidden', background: C.paperDeep }}>
          <EyeLevelScene />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

function Tell() {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const msg = 'Aarav hit his little sister when she took his blocks. He’s still screaming.';
  const typed = msg.slice(0, Math.floor(interpolate(frame, [50, 170], [0, msg.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const caret = frame < 175 && Math.floor(frame / 8) % 2 === 0;
  return (
    <Scene dur={SCENES.tell.dur} bg={C.paper}>
      <AbsoluteFill style={{ padding: 120 * u, justifyContent: 'center', gap: 70 * u }}>
        <StepLabel n="1" text="Tell Kahiye what’s happening" at={4} />
        <Rise at={26} style={{ alignSelf: 'flex-end', maxWidth: 1000 * u }}>
          <div style={{ background: C.surface, boxShadow: SHADOW, borderRadius: `${40 * u}px ${40 * u}px ${10 * u}px ${40 * u}px`, padding: `${36 * u}px ${44 * u}px`, fontFamily: SANS, fontSize: 46 * u, lineHeight: 1.45, color: C.ink, minHeight: 150 * u }}>
            {typed}<span style={{ opacity: caret ? 1 : 0, color: C.clay }}>|</span>
          </div>
          <p style={{ fontFamily: SANS, fontSize: 28 * u, color: C.inkSoft, textAlign: 'right', margin: `${18 * u}px ${10 * u}px 0` }}>
            Type it, or just speak · English, Hindi, Hinglish
          </p>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
}

function Say() {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const words = '“You’re so angry. I won’t let you hit. Let’s stamp our feet together.”'.split(' ');
  const shown = Math.floor(interpolate(frame, [40, 130], [0, words.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const steps = ['Move between them, calmly, before you speak.', 'Give the blocks a home for two minutes.'];
  return (
    <Scene dur={SCENES.say.dur} bg={C.paper}>
      <AbsoluteFill style={{ padding: 120 * u, justifyContent: 'center', gap: 56 * u }}>
        <StepLabel n="2" text="Get the words to say" at={4} />
        <Rise at={22}>
          <div style={{ background: C.surface, boxShadow: SHADOW, borderRadius: 48 * u, padding: `${52 * u}px ${60 * u}px`, maxWidth: 1400 * u }}>
            <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28 * u, color: C.clay, margin: 0 }}>Say this to Aarav</p>
            <p style={{ fontFamily: SERIF, fontSize: 66 * u, lineHeight: 1.25, color: C.ink, margin: `${14 * u}px 0 0` }}>
              {words.map((w, i) => (
                <span key={i} style={{ opacity: i < shown ? 1 : 0.08, transition: 'none' }}>{w} </span>
              ))}
            </p>
            {steps.map((s, i) => (
              <Rise key={s} at={150 + i * 18} distance={14}>
                <p style={{ fontFamily: SANS, fontSize: 36 * u, color: C.inkSoft, margin: `${(i ? 10 : 34) * u}px 0 0`, display: 'flex', gap: 20 * u }}>
                  <span style={{ fontFamily: SERIF, color: C.clay, fontVariantNumeric: 'lining-nums' }}>{i + 1}</span>{s}
                </p>
              </Rise>
            ))}
            <Rise at={200} distance={14}>
              <p style={{ fontFamily: SANS, fontSize: 32 * u, color: C.inkSoft, margin: `${34 * u}px 0 0`, paddingTop: 26 * u, borderTop: `2px solid oklch(91% 0.012 74)` }}>
                <b style={{ color: C.ink }}>Avoid:</b> asking him to say sorry while he’s still flooded.
              </p>
            </Rise>
          </div>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
}

function Worked() {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const tap = spring({ frame: frame - 70, fps: 30, config: { damping: 14, stiffness: 180 } });
  const selected = frame >= 70;
  const chip = (label: string, active: boolean): CSSProperties => ({
    fontFamily: SANS, fontWeight: 600, fontSize: 38 * u, padding: `${22 * u}px ${42 * u}px`, borderRadius: 999,
    background: active ? C.leaf : 'transparent', color: active ? C.surface : C.inkSoft,
    border: `3px solid ${active ? C.leaf : 'oklch(84% 0.014 70)'}`,
  });
  const grow = spring({ frame: frame - 78, fps: 30, config: { damping: 18, stiffness: 70 } });
  return (
    <Scene dur={SCENES.worked.dur} bg={C.paper}>
      <svg viewBox="0 0 200 320" aria-hidden style={{ position: 'absolute', right: 150 * u, bottom: 0, width: 420 * u, height: 'auto' }}>
        <ellipse cx="100" cy="312" rx="90" ry="14" fill="oklch(45% 0.08 150)" />
        <g style={{ transformOrigin: '100px 310px', transform: `scaleY(${0.35 + 0.65 * grow})` }}>
          <path d="M100 310 Q 96 220 104 120" stroke="oklch(42% 0.08 150)" strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>
        <g style={{ transformOrigin: '102px 250px', transform: `scale(${0.4 + 0.6 * grow})` }}>
          <path d="M102 250 Q 50 205 14 222 Q 36 276 102 262 Z" fill="oklch(62% 0.11 145)" />
        </g>
        <g style={{ transformOrigin: '104px 170px', transform: `scale(${grow})`, opacity: grow }}>
          <path d="M104 172 Q 140 100 192 116 Q 180 182 106 182 Z" fill="oklch(66% 0.11 145)" />
          <path d="M103 136 Q 66 92 40 104 Q 54 146 103 146 Z" fill="oklch(var(--turmeric))" />
        </g>
      </svg>
      <AbsoluteFill style={{ padding: 120 * u, justifyContent: 'center', gap: 60 * u }}>
        <StepLabel n="3" text="Tell it what worked" at={4} />
        <Rise at={24} style={{ display: 'flex', gap: 22 * u, flexWrap: 'wrap' }}>
          <span style={{ ...chip('It worked', selected), transform: `scale(${1 + 0.08 * tap * (1 - tap)})` }}>✓ It worked</span>
          <span style={chip('Partly', false)}>Partly</span>
          <span style={chip('Didn’t', false)}>Didn’t</span>
        </Rise>
        <Rise at={96}>
          <p style={{ fontFamily: SERIF, fontSize: 62 * u, lineHeight: 1.18, color: C.ink, margin: 0, maxWidth: 1300 * u }}>
            Next time, Kahiye starts from <span style={{ color: C.clay }}>what works for Aarav.</span>
          </p>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
}

function Family() {
  const { u, vertical } = useLayout();
  const langs = ['English', 'हिन्दी', 'മലയാളം', 'தமிழ்', 'मराठी', 'বাংলা', 'తెలుగు', 'ಕನ್ನಡ', 'ગુજરાતી'];
  return (
    <Scene dur={SCENES.family.dur} bg={C.paperDeep}>
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 60 * u, padding: 100 * u }}>
        <div style={{ position: 'relative', flex: vertical ? 'none' : 1, width: vertical ? '78%' : undefined }}>
          <Rise at={4}><ElderScene /></Rise>
          <Rise at={40} style={{ position: 'absolute', right: -20 * u, top: 0, maxWidth: 520 * u }}>
            <div style={{ background: 'oklch(93% 0.05 150)', boxShadow: SHADOW, borderRadius: `${10 * u}px ${32 * u}px ${32 * u}px ${32 * u}px`, padding: `${24 * u}px ${30 * u}px`, fontFamily: DEVA, fontSize: 32 * u, lineHeight: 1.5, color: C.ink }}>
              अम्मा, आरव गुस्से में हो तो पहले उसके पास बैठिए और कहिए: “तुम्हें बहुत गुस्सा आ रहा है। मैं यहीं हूँ।”
            </div>
          </Rise>
        </div>
        <div style={{ flex: vertical ? 'none' : 1.05 }}>
          <Rise at={16}><p style={{ fontFamily: SERIF, fontSize: 84 * u, lineHeight: 1.06, color: C.ink, margin: 0 }}>Same words, every caregiver.</p></Rise>
          <Rise at={34}><p style={{ fontFamily: SANS, fontSize: 36 * u, lineHeight: 1.5, color: C.inkSoft, margin: `${28 * u}px 0 0` }}>Send the plan to Dadi, Nani or your nanny on WhatsApp, in their language.</p></Rise>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 * u, marginTop: 40 * u }}>
            {langs.map((l, i) => (
              <Rise key={l} at={70 + i * 6} distance={16}>
                <span style={{ display: 'inline-block', background: C.surface, borderRadius: 999, padding: `${12 * u}px ${26 * u}px`, fontFamily: `${SANS}, ${DEVA}, sans-serif`, fontSize: 30 * u, color: C.ink }}>{l}</span>
              </Rise>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

function Story() {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const line = '“Aarav put his bravest thing in his pocket, a small red pebble, and walked up to the big blue gate…”';
  const typed = line.slice(0, Math.floor(interpolate(frame, [60, 170], [0, line.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  return (
    <Scene dur={SCENES.story.dur} bg={C.night}>
      <AbsoluteFill style={{ flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 70 * u, padding: 110 * u, color: C.moonText }}>
        <div style={{ flex: vertical ? 'none' : 1 }}>
          <Rise at={4}><p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30 * u, color: C.turmeric, margin: 0 }}>Bedtime stories</p></Rise>
          <Rise at={14}><p style={{ fontFamily: SERIF, fontSize: 88 * u, lineHeight: 1.06, margin: `${16 * u}px 0 0` }}>Tonight, Aarav is the hero.</p></Rise>
          <p style={{ fontFamily: SERIF, fontSize: 42 * u, lineHeight: 1.5, color: 'oklch(86% 0.03 82)', margin: `${40 * u}px 0 0`, minHeight: 200 * u }}>{typed}</p>
        </div>
        <Rise at={24} style={{ flex: vertical ? 'none' : 1.1, width: vertical ? '90%' : undefined }}><NightScene /></Rise>
      </AbsoluteFill>
    </Scene>
  );
}

function Close({ domain }: { domain?: string }) {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const mark = spring({ frame: frame - 6, fps: 30, config: { damping: 200 } });
  return (
    <Scene dur={SCENES.close.dur} bg={C.clay}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: C.surface, gap: 34 * u, padding: 100 * u }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 * u, transform: `scale(${0.9 + 0.1 * mark})`, opacity: mark }}>
          <svg viewBox="0 0 32 32" style={{ width: 124 * u, height: 124 * u }} aria-hidden>
            <rect width="32" height="32" rx="9" fill={C.surface} />
            <path d="M16 25 Q 15.6 19 16.4 14.5" stroke={C.clay} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M16.2 18 Q 11 13 7.5 15 Q 10 20 16.2 18.6 Z" fill={C.clay} />
            <path d="M16.4 15.2 Q 20.5 9.5 24.8 11.2 Q 22.6 16.6 16.6 16 Z" fill={C.clay} />
          </svg>
          <span style={{ fontFamily: SERIF, fontSize: 132 * u, lineHeight: 1 }}>kahiye</span>
        </div>
        <Rise at={36}><p style={{ fontFamily: SERIF, fontSize: 64 * u, margin: 0 }}>The words to say, when it matters.</p></Rise>
        <Rise at={62}>
          <p style={{ fontFamily: SANS, fontSize: 34 * u, margin: 0, color: 'oklch(92% 0.04 60)' }}>
            From pregnancy to eighteen · Free to start{domain ? ` · ${domain}` : ''}
          </p>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
}

export function Explainer({ domain }: { domain?: string }) {
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence from={SCENES.night.from} durationInFrames={SCENES.night.dur}><NightOpen /></Sequence>
      <Sequence from={SCENES.reframe.from} durationInFrames={SCENES.reframe.dur}><Reframe /></Sequence>
      <Sequence from={SCENES.tell.from} durationInFrames={SCENES.tell.dur}><Tell /></Sequence>
      <Sequence from={SCENES.say.from} durationInFrames={SCENES.say.dur}><Say /></Sequence>
      <Sequence from={SCENES.worked.from} durationInFrames={SCENES.worked.dur}><Worked /></Sequence>
      <Sequence from={SCENES.family.from} durationInFrames={SCENES.family.dur}><Family /></Sequence>
      <Sequence from={SCENES.story.from} durationInFrames={SCENES.story.dur}><Story /></Sequence>
      <Sequence from={SCENES.close.from} durationInFrames={SCENES.close.dur}><Close domain={domain} /></Sequence>
      <Grain />
    </AbsoluteFill>
  );
}
