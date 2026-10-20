import { useId } from "react";

/*
 * Example "prints" for an empty photo strip, in the cut-paper illustration style. They show a
 * parent what the strip becomes; they are never mixed with real photos and are always labelled.
 */
const SKIN = "oklch(60% 0.09 58)";
const ELDER = "oklch(56% 0.07 55)";
const HAIR = "oklch(22% 0.02 40)";

function Shadow({ id }: { id: string }) {
  return <filter id={id} x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="oklch(30% 0.05 45)" floodOpacity="0.26" />
  </filter>;
}
function Frame({ label, children }: { label: string; children: (shadow: string) => React.ReactNode }) {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 400 500" className="h-full w-full" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
    <defs><Shadow id={id} /></defs>
    {children(`url(#${id})`)}
  </svg>;
}

/** A first birthday: a small cake, one candle, bunting. */
function Birthday() {
  return <Frame label="Example: a first birthday cake with one candle">{s => <>
    <rect width="400" height="500" fill="oklch(93% 0.03 80)" />
    <path d="M0 70 Q 100 120 200 80 T 400 80" stroke="oklch(45% 0.05 40)" strokeWidth="2" fill="none" />
    {[30, 95, 160, 225, 290, 355].map((x, i) => <path key={x} d={`M${x} ${88 + (i % 2) * 6} l22 0 l-11 30 z`} className={i % 3 === 0 ? "fill-clay" : i % 3 === 1 ? "fill-turmeric" : "fill-leaf"} filter={s} />)}
    <rect x="0" y="400" width="400" height="100" fill="oklch(78% 0.05 60)" />
    <g filter={s}>
      <ellipse cx="200" cy="402" rx="128" ry="16" fill="oklch(96% 0.01 80)" />
      <rect x="110" y="300" width="180" height="96" rx="14" className="fill-clay" />
      <path d="M110 322 Q 140 342 170 322 T 230 322 T 290 322 L290 312 L110 312 Z" fill="oklch(96% 0.02 80)" />
      <rect x="194" y="246" width="12" height="54" rx="4" className="fill-turmeric" />
      <path d="M200 214 Q 214 234 200 246 Q 186 234 200 214 Z" fill="oklch(78% 0.16 70)" />
    </g>
  </>}</Frame>;
}
/** First steps: a small child walking towards outstretched hands. */
function FirstSteps() {
  return <Frame label="Example: a toddler's first steps towards a parent's hands">{s => <>
    <rect width="400" height="500" fill="oklch(90% 0.04 150)" />
    <circle cx="300" cy="120" r="70" className="fill-turmeric" />
    <path d="M0 380 C 120 350, 280 356, 400 372 L400 500 L0 500 Z" className="fill-leaf" filter={s} />
    <g filter={s}>
      <rect x="168" y="330" width="12" height="44" rx="6" fill={SKIN} />
      <rect x="190" y="334" width="12" height="40" rx="6" fill={SKIN} transform="rotate(-12 196 354)" />
      <path d="M160 260 Q 186 250 210 260 L 218 338 Q 186 348 154 338 Z" className="fill-clay" />
      <path d="M210 272 Q 236 262 254 248" stroke={SKIN} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M162 276 Q 140 270 128 254" stroke={SKIN} strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="186" cy="232" r="26" fill={SKIN} />
      <path d="M160 230 Q 162 204 188 204 Q 212 206 212 226 Q 198 214 182 218 Q 168 222 160 236 Z" fill={HAIR} />
    </g>
    <g filter={s}>
      <path d="M400 236 Q 330 232 300 250" stroke="oklch(52% 0.085 52)" strokeWidth="18" strokeLinecap="round" fill="none" />
      <circle cx="290" cy="252" r="12" fill="oklch(52% 0.085 52)" />
    </g>
  </>}</Frame>;
}
/** First day of school: a bag and a water bottle waiting by the door. */
function SchoolDay() {
  return <Frame label="Example: a school bag and water bottle by the door">{s => <>
    <rect width="400" height="500" fill="oklch(88% 0.04 60)" />
    <rect x="236" y="60" width="140" height="330" rx="6" className="fill-night-soft" filter={s} />
    <circle cx="262" cy="232" r="7" className="fill-turmeric" />
    <rect x="0" y="390" width="400" height="110" className="fill-clay" />
    <g filter={s}>
      <path d="M86 230 Q 86 196 128 196 Q 170 196 170 230" stroke="oklch(40% 0.06 240)" strokeWidth="12" fill="none" />
      <rect x="66" y="226" width="124" height="166" rx="26" fill="oklch(52% 0.09 245)" />
      <rect x="86" y="300" width="84" height="62" rx="14" fill="oklch(62% 0.09 245)" />
      <rect x="194" y="286" width="40" height="106" rx="14" className="fill-turmeric" />
      <rect x="202" y="270" width="24" height="20" rx="5" className="fill-leaf" />
    </g>
  </>}</Frame>;
}
/** With Dadi: an elder's hand holding a small hand. */
function WithDadi() {
  return <Frame label="Example: a grandparent holding a child's hand">{s => <>
    <rect width="400" height="500" fill="oklch(91% 0.03 30)" />
    <circle cx="90" cy="110" r="54" fill="oklch(80% 0.1 70)" />
    <g filter={s}>
      <path d="M-10 300 Q 120 250 196 262 Q 230 268 226 290 Q 222 312 190 306 Q 130 296 -10 350 Z" fill={ELDER} />
      <path d="M-10 286 Q 60 258 120 254 L 110 300 Q 50 306 -10 330 Z" fill="oklch(72% 0.14 72)" />
    </g>
    <g filter={s}>
      <path d="M410 250 Q 300 262 236 278 Q 214 284 218 300 Q 224 318 248 310 Q 320 290 410 300 Z" fill={SKIN} />
      <path d="M410 240 L 330 252 L 336 306 L 410 312 Z" className="fill-clay" />
    </g>
    <path d="M0 420 C 140 400, 260 404, 400 420 L400 500 L0 500 Z" className="fill-leaf" />
  </>}</Frame>;
}
/** An ordinary afternoon: a swing under a tree. */
function OrdinaryAfternoon() {
  return <Frame label="Example: a child on a swing on an ordinary afternoon">{s => <>
    <rect width="400" height="500" fill="oklch(92% 0.03 210)" />
    <circle cx="96" cy="96" r="46" className="fill-turmeric" />
    <g filter={s}>
      <rect x="300" y="40" width="26" height="420" rx="10" fill="oklch(42% 0.06 50)" />
      <path d="M150 70 Q 260 20 360 70 Q 300 110 160 100 Z" className="fill-leaf" />
      <path d="M150 92 L 316 92" stroke="oklch(42% 0.06 50)" strokeWidth="14" strokeLinecap="round" />
    </g>
    <path d="M200 98 L 176 300 M 250 98 L 240 300" stroke="oklch(40% 0.03 50)" strokeWidth="3" />
    <g filter={s}>
      <rect x="160" y="296" width="96" height="12" rx="5" className="fill-clay" />
      <path d="M184 226 Q 208 216 230 226 L 238 296 Q 208 304 178 296 Z" className="fill-night-soft" />
      <path d="M226 290 Q 262 300 282 286" stroke={SKIN} strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="208" cy="200" r="24" fill={SKIN} />
      <path d="M184 198 Q 186 174 210 174 Q 232 176 232 194 Q 218 184 204 188 Q 192 192 184 204 Z" fill={HAIR} />
    </g>
    <path d="M0 440 C 140 420, 260 424, 400 436 L400 500 L0 500 Z" className="fill-leaf" />
  </>}</Frame>;
}

export const MEMORY_EXAMPLES = [
  { id: "example-steps", title: "First steps", age: "1 yr", Art: FirstSteps },
  { id: "example-birthday", title: "A first birthday", age: "1 yr", Art: Birthday },
  { id: "example-dadi", title: "Sunday with Dadi", age: "2 yrs 3 mo", Art: WithDadi },
  { id: "example-school", title: "First day of school", age: "3 yrs 6 mo", Art: SchoolDay },
  { id: "example-swing", title: "An ordinary Tuesday", age: "4 yrs", Art: OrdinaryAfternoon },
] as const;
