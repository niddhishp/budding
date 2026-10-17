/**
 * Domain modules: the "specialist agents" expressed as doctrine, composed into one generation
 * by the router. Each module is the active ingredients of its evidence base, the moves to avoid,
 * when to escalate, and the evidence cards it may cite.
 */

export interface DomainModule {
  id: string;
  label: string;
  /** Router hint: when this module applies. */
  when: string;
  /** Fallback keyword routing if the router is unavailable. */
  keywords: RegExp;
  principles: string[];
  avoid: string[];
  escalate?: string;
  cards: string[];
}

export const MODULES: DomainModule[] = [
  {
    id: 'meltdown',
    label: 'Tantrums and meltdowns',
    when: 'crying, screaming, tantrum, meltdown, losing control, overwhelm in the moment',
    keywords: /tantrum|meltdown|scream|crying|cries|rolling on|throws? (a )?fit|losing it|out of control|ro raha|chilla/i,
    principles: [
      'During: safety first, few words, calm body; the adult\'s regulation is the tool (co-regulation).',
      'Name the feeling and hold the limit in the same breath; do not negotiate or teach mid-storm.',
      'After: reconnect first, then a short teach ("next time you can stamp your feet").',
      'Prevention matters most: sleep, hunger, warnings before transitions, predictable routines.',
    ],
    avoid: ['Reasoning at length with a flooded child', 'Giving in to stop the noise, which teaches that tantrums work', 'Shaming or threats to leave them'],
    escalate: 'Frequent, intense tantrums after about age 5, or tantrums with self-injury, warrant a paediatrician conversation.',
    cards: ['co-regulation', 'emotion-coaching', 'parent-training'],
  },
  {
    id: 'aggression',
    label: 'Hitting, biting, aggression',
    when: 'hitting, biting, kicking, throwing at people, hurting a sibling or parent',
    keywords: /\bhit(s|ting)?\b|\bbit(e|es|ing)\b|kick|punch|push(ed|es)? (his|her)|hurt(s|ing)? (his|her) (sister|brother)|maar|throws? .* at/i,
    principles: [
      'Stop the hurting first: block or move calmly, "I won\'t let you hit."',
      'Attend to the hurt child first so aggression does not win attention.',
      'Then name the feeling and give a replacement action (stamp, squeeze a cushion, use words).',
      'Look for the pattern: trigger, time of day, tiredness, crowding.',
    ],
    avoid: ['Hitting back "so they know how it feels"', 'Long lectures in the moment', 'Labelling the child as violent or bad'],
    escalate: 'Aggression causing injury, increasing over weeks, or toward animals warrants professional input.',
    cards: ['phys-punishment-harm', 'pcit', 'co-regulation'],
  },
  {
    id: 'defiance',
    label: 'Defiance, power struggles, not listening',
    when: '"won\'t listen", refusing, arguing, back-talk, power struggles, rudeness',
    keywords: /won'?t listen|doesn'?t listen|refus|defian|argu|back.?talk|rude|talks back|disrespect|nahi sunta|ziddi|stubborn/i,
    principles: [
      'Clarify the real goal: safety, cooperation, a routine, respect, or a skill.',
      'Fewer, clearer instructions: get close, say it once, then follow through calmly.',
      'Offer real choices within the limit; give autonomy where it costs nothing.',
      'Notice and specifically praise cooperation when it happens.',
    ],
    avoid: ['Threats you will not or cannot carry out', 'Repeating the instruction ten times', 'Optimising only for instant obedience'],
    cards: ['parent-training', 'specific-praise', 'motivational-interviewing'],
  },
  {
    id: 'transitions',
    label: 'Transitions and routines',
    when: 'leaving the park, stopping play, getting ready, mornings, bedtime routine, switching activities',
    keywords: /leav(e|ing)|time to go|get(ting)? ready|morning|stop playing|switch|routine|late for school|transition/i,
    principles: ['Countdown warnings ("two more slides, then shoes").', 'Give a role or a choice in the transition.', 'Make routines visible and the same every day.'],
    avoid: ['Abrupt switches without warning for sensitive or intense children'],
    cards: ['goodness-of-fit', 'parent-training'],
  },
  {
    id: 'sleep',
    label: 'Sleep and bedtime',
    when: 'bedtime refusal, night waking, sleep problems, co-sleeping questions',
    keywords: /sleep|bedtime|night|wak(e|ing)|nap|won'?t go to bed|so nahi/i,
    principles: [
      'A short, predictable, calm bedtime routine at a consistent time.',
      'Present options across the comfort spectrum (from gradual to more direct) without shaming any family\'s choice, including co-sleeping.',
      'Screens off about an hour before sleep.',
    ],
    avoid: ['Shaming co-sleeping or sleep training', 'Changing approach every night'],
    escalate: 'Loud nightly snoring, pauses in breathing, or extreme daytime sleepiness go to the paediatrician.',
    cards: ['sleep-behavioural', 'sleep-no-harm', 'bedtime-routine', 'screens-iap'],
  },
  {
    id: 'eating',
    label: 'Eating and mealtimes',
    when: 'picky eating, refusing food, mealtime battles, snacks, feeding',
    keywords: /eat(ing)?|food|meal|picky|khana|vegetable|sabzi|feed(ing)?|won'?t eat|snack/i,
    principles: ['Parent decides what and when; child decides whether and how much.', 'Many calm exposures without pressure; serve a safe food alongside.', 'Family meals without screens; involve the child in preparing food.'],
    avoid: ['Forcing, bribing or punishing around food', 'Screen-feeding'],
    escalate: 'Weight loss, falling growth, gagging on most textures, or refusing whole food groups go to the paediatrician.',
    cards: ['food-exposure', 'screens-iap'],
  },
  {
    id: 'toileting',
    label: 'Toilet learning and accidents',
    when: 'potty training, accidents, bedwetting',
    keywords: /potty|toilet|accident|bedwet|wet(ting)? the bed|nappy|diaper/i,
    principles: ['Follow readiness signs; keep it low-pressure and matter-of-fact.', 'Accidents are learning, not misbehaviour.'],
    avoid: ['Punishment or shaming for accidents'],
    escalate: 'Regression after being dry for months, pain, or bedwetting beyond about age 7 is worth a paediatrician visit.',
    cards: ['toilet-readiness'],
  },
  {
    id: 'fears',
    label: 'Fears, worry and separation',
    when: 'fear of the dark, separation, clinginess, school worry, anxiety-like worry',
    keywords: /scared|afraid|fear|dark|clingy|separation|anxious|worr(y|ies)|nervous|dar lagta/i,
    principles: ['Validate the feeling without confirming the danger.', 'Small brave steps with support (gradual exposure), not avoidance.', 'Predictable goodbyes: short, warm, and you always come back.'],
    avoid: ['Sneaking away', 'Over-reassuring or removing every fear trigger (over-accommodation)', 'Mocking the fear'],
    escalate: 'Worry that stops school, sleep or friendships for weeks warrants professional input.',
    cards: ['emotion-coaching', 'resilience-ordinary'],
  },
  {
    id: 'lying',
    label: 'Lying and honesty',
    when: 'lying, stealing small things, hiding things, blaming others',
    keywords: /\blie(s|d)?\b|lying|jhooth|steal|stole|hid(e|ing)|sneak/i,
    principles: ['Make telling the truth safe: smaller consequence when they own it.', 'Don\'t set traps by asking questions you know the answer to.', 'Focus on repair (fixing what happened) over confession.'],
    avoid: ['Harsh punishment, which teaches better lying', 'Calling the child a liar'],
    cards: ['lying-punitive', 'repair'],
  },
  {
    id: 'siblings',
    label: 'Siblings',
    when: 'sibling fights, jealousy, new baby, fairness',
    keywords: /sibling|sister|brother|bhai|behen|didi|new baby|jealous|fight(ing)? with/i,
    principles: ['Fair means each gets what they need, not identical treatment.', 'Regular one-on-one time with each child.', 'Coach both to problem-solve instead of judging who started it.'],
    avoid: ['Comparing siblings', 'Making the older child a parent'],
    cards: ['sibling-differential', 'interparental-conflict'],
  },
  {
    id: 'family',
    label: 'Grandparents, co-parents and caregivers',
    when: 'grandparents, in-laws, partner disagreement, nanny, inconsistency between adults, joint family',
    keywords: /grand(ma|pa|mother|father|parent)|dadi|nani|dada|nana|in-?law|husband|wife|partner|nanny|maid|ayah|joint family/i,
    principles: [
      'Alignment without erasure: protect the elder relationship while holding the parents\' chosen lines.',
      'Agree on two or three non-negotiables; let small differences go.',
      'Repair in front of the child after adult conflict ("we disagreed, we worked it out, it wasn\'t about you").',
      'Offer exact words for the adult conversation too.',
    ],
    avoid: ['Taking sides or assigning blame between caregivers', 'Criticising grandparents in front of the child'],
    cards: ['interparental-conflict', 'goodness-of-fit'],
  },
  {
    id: 'school',
    label: 'Homework, learning and school',
    when: 'homework battles, studying, marks, attention at school, teachers',
    keywords: /homework|study|studies|school|marks|grades|teacher|exam|test|padhai|tuition|class/i,
    principles: ['Child owns the plan; parent is a consultant, not the enforcer.', 'Short focused blocks, recall practice, spacing over days.', 'Praise effort and strategy; decouple love from marks.'],
    avoid: ['Sitting over every problem', 'Comparison with cousins or classmates', 'Learning-styles advice'],
    cards: ['learning-techniques', 'learning-styles-myth', 'specific-praise', 'habits-time'],
  },
  {
    id: 'exam_pressure',
    label: 'Exam and results pressure',
    when: 'board exams, JEE, NEET, results, coaching, fear of failing, comparison',
    keywords: /board|jee|neet|result|rank|coaching|kota|fail(ing|ed)?|percentage|cut-?off/i,
    principles: [
      'Make love unconditional and say so explicitly, especially around results.',
      'Watch function: sleep, eating, withdrawal, hopeless statements.',
      'Help them plan the next step if results disappoint, together.',
    ],
    avoid: ['Threats tied to marks', 'Public comparison'],
    escalate: 'Any hopelessness, talk of being a burden, or self-harm hints means call Tele-MANAS 14416 now.',
    cards: ['learning-techniques', 'resilience-ordinary'],
  },
  {
    id: 'screens',
    label: 'Screens, gaming and phones',
    when: 'screen time, gaming, phone, YouTube, tablet, first phone',
    keywords: /screen|phone|mobile|tablet|ipad|youtube|game|gaming|video|tv|reels|instagram/i,
    principles: [
      'Follow Indian paediatric guidance by age; focus on what screens displace (sleep, play, family time).',
      'Agree rules together in advance; warnings before switching off; no devices in bedrooms overnight.',
      'Parents model the rules.',
    ],
    avoid: ['"Brain rot" or "dopamine detox" framing', 'Surprise confiscation as the only tool'],
    cards: ['screens-iap', 'screens-who', 'social-media-mixed'],
  },
  {
    id: 'teen',
    label: 'Teen connection, autonomy and privacy',
    when: 'teen withdrawal, secrecy, mood, rules, curfew, relationships, social media, identity',
    keywords: /teen|teenager|room|door|won'?t talk|secret|curfew|party|boyfriend|girlfriend|social media|attitude/i,
    principles: [
      'Connection before correction; side-by-side conversations (car, cooking).',
      'Curiosity without verdict; listen more than talk.',
      'Negotiate limits; explain the why; grow autonomy as trust grows.',
    ],
    avoid: ['Interrogation openers', 'Secret monitoring as a first resort', 'Lectures about consequences'],
    escalate: 'Persistent withdrawal, hopelessness, self-harm signs or substance use warrant prompt professional help.',
    cards: ['adolescent-reward', 'motivational-interviewing', 'social-media-mixed'],
  },
  {
    id: 'parent',
    label: 'Parent stress, guilt and repair',
    when: 'parent overwhelm, shouting, guilt, burnout, "I lost my temper"',
    keywords: /i (shout|yell|scream)ed|lost my (temper|cool)|guilt|exhausted|burn(ed|t)? out|can'?t cope|tired of|overwhelm|i hit (him|her)/i,
    principles: [
      'Validate without excusing harm; parents are allowed to be human.',
      'Repair is the skill: name what happened, apologise, reconnect.',
      'One micro-step for the parent\'s own regulation now (step away, breathe, water).',
      'Parent support is child support; Tele-MANAS 14416 is for parents too.',
    ],
    avoid: ['Automatic "you\'re doing great"', 'Shaming the parent'],
    cards: ['repair', 'parental-burnout', 'co-regulation'],
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy and postpartum',
    when: 'pregnancy, expecting, birth, postpartum, newborn worries',
    keywords: /pregnan|expecting|trimester|due date|delivery|postpartum|post-?natal|newborn|breastfeed/i,
    principles: ['Emotional and practical preparation; involve the partner and family.', 'Medical questions always go to their doctor.', 'Normalise postpartum feelings while watching for persistent low mood.'],
    avoid: ['Medical advice, dosages or diagnosis'],
    escalate: 'Bleeding, severe headache, reduced baby movements, or thoughts of self-harm after birth: call the doctor or 112 now.',
    cards: ['serve-return', 'parental-burnout'],
  },
  {
    id: 'development',
    label: 'Development and milestones',
    when: 'is this normal, milestones, speech, walking, development worries',
    keywords: /normal\??|milestone|not talking|speech|walk(ing)?|develop|behind|delay|crawl/i,
    principles: ['Describe the typical range, not a deadline.', 'Give words for the paediatrician conversation.', 'Never diagnose; describe what to observe.'],
    avoid: ['Naming conditions', 'False age precision'],
    escalate: 'Loss of skills already gained (regression) at any age goes to the paediatrician promptly.',
    cards: ['milestones-2022', 'serve-return'],
  },
  {
    id: 'emotions',
    label: 'Emotions and emotional skills',
    when: 'big feelings, anger, sadness, jealousy, frustration, building emotional skills',
    keywords: /angry|anger|sad|upset|frustrat|jealous|emotion|feelings|mood|gussa/i,
    principles: ['Name feelings to tame them; widen emotional vocabulary.', 'All feelings are allowed; not all behaviours.', 'Teach calming tools when calm, use them when upset.'],
    avoid: ['"Stop crying" or "big boys don\'t cry"'],
    cards: ['emotion-coaching', 'co-regulation'],
  },
  {
    id: 'chores',
    label: 'Responsibility, chores and habits',
    when: 'chores, responsibility, habits, independence, getting them to help',
    keywords: /chore|help(ing)? at home|responsib|habit|clean(ing)? (up|room)|independen|lazy/i,
    principles: ['Contribution, not payment, for family tasks; age-appropriate jobs.', 'Habits take weeks; missing a day doesn\'t reset progress.', 'Start small and specific; praise the effort.'],
    avoid: ['Paying for intrinsic interests', 'Streak-shaming'],
    cards: ['habits-time', 'rewards-motivation', 'specific-praise'],
  },
];

export const MODULE_IDS = MODULES.map((m) => m.id);
const BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const getModule = (id: string) => BY_ID.get(id);

/** Keyword fallback when the router is unavailable: up to three matching modules. */
export function keywordRoute(text: string): string[] {
  const hits = MODULES.filter((m) => m.keywords.test(text)).map((m) => m.id);
  return hits.length ? hits.slice(0, 3) : ['emotions'];
}
