import { useId } from 'react';

/*
 * Cut-paper illustration set. Flat organic shapes, featureless faces, a soft paper
 * shadow per layer. Colours come from the design tokens so the art and UI never drift.
 */

const SKIN_A = 'oklch(52% 0.085 52)';   // parent
const SKIN_B = 'oklch(60% 0.09 58)';    // child
const SKIN_C = 'oklch(56% 0.07 55)';    // elder
const HAIR = 'oklch(22% 0.02 40)';
const PALLU = 'oklch(72% 0.14 72)';

function PaperShadow({ id }: { id: string }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="1.6" floodColor="oklch(30% 0.05 45)" floodOpacity="0.28" />
    </filter>
  );
}

/** Hero: a parent kneels so their eyes meet the child's. Hands about to meet over a sprout. */
export function EyeLevelScene({ className }: { className?: string }) {
  const f = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 480 440" className={className} role="img" aria-label="A mother kneels to meet her daughter at eye level">
      <defs><PaperShadow id={f} /></defs>
      {/* sun */}
      <circle cx="350" cy="150" r="104" className="fill-turmeric" />
      {/* ground */}
      <path d="M0 362 C 110 330, 330 326, 480 352 L480 440 L0 440 Z" className="fill-leaf" filter={`url(#${f})`} />
      <path d="M0 400 C 140 384, 330 388, 480 404 L480 440 L0 440 Z" fill="oklch(45% 0.08 150)" />

      {/* parent — kneeling */}
      <g filter={`url(#${f})`}>
        <path d="M112 300 Q 112 344 158 348 L 226 348 Q 244 348 242 332 Q 240 318 222 316 L 168 310 Z" className="fill-night" />
        <path d="M138 194 Q 116 200 112 242 L 104 306 Q 150 322 196 306 L 188 242 Q 184 198 164 194 Z" className="fill-clay" />
        <path d="M136 197 Q 178 232 194 302 L 178 307 Q 166 248 124 210 Z" fill={PALLU} />
        <path d="M180 212 Q 216 230 238 256 Q 244 264 236 270 Q 228 274 221 266 Q 201 243 172 232 Z" className="fill-clay-deep" />
        <circle cx="236" cy="266" r="8" fill={SKIN_A} />
        <rect x="143" y="180" width="18" height="20" rx="6" fill={SKIN_A} />
        <circle cx="153" cy="166" r="27" fill={SKIN_A} />
        <path d="M128 166 Q 126 136 156 138 Q 178 140 180 158 Q 166 148 146 156 Q 136 162 134 178 Z" fill={HAIR} />
        <circle cx="124" cy="160" r="12" fill={HAIR} />
      </g>

      {/* child — standing, eyes level with parent's */}
      <g filter={`url(#${f})`}>
        <rect x="277" y="296" width="11" height="52" rx="5.5" fill={SKIN_B} />
        <rect x="296" y="296" width="11" height="52" rx="5.5" fill={SKIN_B} />
        <path d="M274 194 Q 292 186 310 194 L 334 302 Q 292 316 250 302 Z" className="fill-night-soft" />
        <path d="M258 286 Q 292 296 328 286 L 332 302 Q 292 314 254 302 Z" className="fill-turmeric" />
        <path d="M278 212 Q 256 228 248 254 Q 245 264 253 266 Q 260 268 263 259 Q 268 240 284 227 Z" fill={SKIN_B} />
        <circle cx="292" cy="170" r="22" fill={SKIN_B} />
        <path d="M270 168 Q 270 146 292 146 Q 314 146 314 168 Q 304 156 292 157 Q 280 156 270 168 Z" fill={HAIR} />
        <circle cx="268" cy="168" r="8.5" fill={HAIR} />
        <circle cx="316" cy="168" r="8.5" fill={HAIR} />
      </g>

      {/* sprout between them */}
      <g filter={`url(#${f})`}>
        <path d="M244 350 Q 243 326 246 306" stroke="oklch(42% 0.08 150)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M246 318 Q 228 300 214 306 Q 222 326 246 320 Z" fill="oklch(66% 0.11 145)" />
        <path d="M246 308 Q 262 288 278 294 Q 270 314 246 312 Z" fill="oklch(66% 0.11 145)" />
      </g>
    </svg>
  );
}

/** Night: a child asleep under a clay quilt, moon and stars above. */
export function NightScene({ className }: { className?: string }) {
  const f = useId().replace(/:/g, '');
  const star = (x: number, y: number, s: number) =>
    `M${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`;
  return (
    <svg viewBox="0 0 420 320" className={className} role="img" aria-label="A child asleep under a quilt beneath the moon">
      <defs><PaperShadow id={f} /></defs>
      <g filter={`url(#${f})`}>
        <path d="M318 42 A 46 46 0 1 0 352 120 A 38 38 0 1 1 318 42 Z" className="fill-turmeric" />
        <path d={star(96, 70, 9)} className="fill-turmeric" opacity="0.9" />
        <path d={star(210, 40, 6)} className="fill-turmeric" opacity="0.75" />
        <path d={star(160, 118, 5)} className="fill-turmeric" opacity="0.6" />
        <path d={star(390, 170, 6)} className="fill-turmeric" opacity="0.7" />
      </g>
      <g filter={`url(#${f})`}>
        {/* bed */}
        <rect x="40" y="250" width="340" height="40" rx="14" fill="oklch(38% 0.06 50)" />
        {/* pillow + head */}
        <ellipse cx="102" cy="226" rx="52" ry="22" fill="oklch(93% 0.02 80)" />
        <circle cx="112" cy="210" r="21" fill={SKIN_B} />
        <path d="M92 214 Q 90 190 112 189 Q 130 189 133 204 Q 118 198 104 204 Q 96 208 92 214 Z" fill={HAIR} />
        {/* quilt */}
        <path d="M120 232 Q 150 196 220 204 Q 300 212 372 236 Q 384 252 372 262 L 128 262 Q 112 252 120 232 Z" className="fill-clay" />
        <path d="M168 210 L 176 262 M 228 206 L 232 262 M 290 216 L 290 262" stroke="oklch(var(--clay-deep))" strokeWidth="2" strokeDasharray="5 6" />
      </g>
    </svg>
  );
}

/** Family: a grandmother reading a message on her phone. */
export function ElderScene({ className }: { className?: string }) {
  const f = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 360 380" className={className} role="img" aria-label="A grandmother reading a message on her phone">
      <defs><PaperShadow id={f} /></defs>
      <circle cx="186" cy="176" r="132" fill="oklch(88% 0.055 76)" />
      <g filter={`url(#${f})`}>
        {/* rug */}
        <rect x="34" y="318" width="300" height="34" rx="17" className="fill-clay" />
        <path d="M58 335 L 310 335" stroke="oklch(var(--turmeric))" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
        {/* chair */}
        <path d="M70 250 Q 70 214 104 210 L 270 210 Q 300 214 300 250 L 300 330 L 70 330 Z" fill="oklch(48% 0.07 45)" />
        {/* body + saree */}
        <path d="M128 168 Q 100 178 98 236 L 96 330 L 268 330 L 262 236 Q 258 178 230 168 Z" className="fill-leaf" />
        <path d="M130 170 Q 196 210 236 330 L 206 330 Q 176 236 114 196 Z" fill={PALLU} />
        {/* arms holding phone */}
        <path d="M118 206 Q 140 250 186 252 L 186 268 Q 128 270 104 222 Z" fill="oklch(44% 0.08 152)" />
        <rect x="178" y="214" width="34" height="56" rx="7" className="fill-night" transform="rotate(-12 195 242)" />
        <rect x="183" y="220" width="24" height="40" rx="4" fill="oklch(85% 0.06 150)" transform="rotate(-12 195 242)" />
        <path d="M244 206 Q 236 246 206 252 L 204 268 Q 254 266 262 222 Z" fill="oklch(44% 0.08 152)" />
        {/* head */}
        <rect x="168" y="146" width="22" height="26" rx="8" fill={SKIN_C} />
        <circle cx="179" cy="122" r="32" fill={SKIN_C} />
        <path d="M148 120 Q 146 86 180 86 Q 212 86 211 116 Q 196 102 178 106 Q 158 108 148 120 Z" fill="oklch(86% 0.01 70)" />
        <circle cx="210" cy="104" r="14" fill="oklch(86% 0.01 70)" />
        {/* glasses */}
        <circle cx="168" cy="126" r="8" fill="none" stroke={HAIR} strokeWidth="2.5" />
        <circle cx="190" cy="126" r="8" fill="none" stroke={HAIR} strokeWidth="2.5" />
        <path d="M176 126 L 182 126" stroke={HAIR} strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/** Brand mark: two leaves from one stem. */
export function SproutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-clay" />
      <path d="M16 25 Q 15.6 19 16.4 14.5" stroke="oklch(98% 0.01 82)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16.2 18 Q 11 13 7.5 15 Q 10 20 16.2 18.6 Z" fill="oklch(98% 0.01 82)" />
      <path d="M16.4 15.2 Q 20.5 9.5 24.8 11.2 Q 22.6 16.6 16.6 16 Z" fill="oklch(98% 0.01 82)" />
    </svg>
  );
}
