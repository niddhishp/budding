/**
 * Evidence cards — the ONLY sources the decode agent may cite.
 *
 * Each card states one claim at the strength the literature supports, graded honestly.
 * Sources are well-established, widely replicated or official-guideline references.
 * Adding a card requires reading the source; blueprint citations are leads, not facts.
 */

export type EvidenceTier = 'strong' | 'moderate' | 'consensus' | 'mixed' | 'heuristic';

export const TIER_LABEL: Record<EvidenceTier, string> = {
  strong: 'Strong research support',
  moderate: 'Moderate research support',
  consensus: 'Expert guidance',
  mixed: 'Mixed evidence',
  heuristic: 'Practitioner wisdom',
};

export interface EvidenceCard {
  id: string;
  tier: EvidenceTier;
  claim: string;
  source: string;
}

export const EVIDENCE_CARDS: EvidenceCard[] = [
  // Discipline, behaviour, parent training
  { id: 'phys-punishment-harm', tier: 'strong', claim: 'Physical punishment is linked to more aggression, worse mental health and a weaker parent–child relationship, with no benefit found.', source: 'Gershoff & Grogan-Kaylor, meta-analysis, 2016' },
  { id: 'aap-discipline', tier: 'consensus', claim: 'Paediatric guidance recommends against hitting, spanking and verbal shaming, and for teaching-focused discipline.', source: 'American Academy of Pediatrics policy, 2018' },
  { id: 'parent-training', tier: 'strong', claim: 'Structured parent-training approaches (specific praise, clear calm instructions, consistent follow-through, warmth) reduce child behaviour problems.', source: 'Sanders et al., Triple P meta-analysis, 2014' },
  { id: 'pcit', tier: 'strong', claim: 'Parent–Child Interaction Therapy, combining child-led play with clear consistent limits, substantially reduces disruptive behaviour in young children.', source: 'Thomas & Zimmer-Gembeck, meta-analysis, 2007' },
  { id: 'specific-praise', tier: 'moderate', claim: 'Praising specific effort and strategy builds persistence better than praising ability ("you\'re so smart").', source: 'Mueller & Dweck, 1998' },
  { id: 'rewards-motivation', tier: 'strong', claim: 'Expected tangible rewards can reduce interest in tasks a child already enjoys; praise and unexpected rewards do not.', source: 'Deci, Koestner & Ryan, meta-analysis, 1999' },
  { id: 'time-out', tier: 'moderate', claim: 'Brief, calm, predictable time-out used within a warm relationship is effective for young children and not shown to harm attachment.', source: 'Dadds & Tully, 2019' },
  { id: 'lying-punitive', tier: 'moderate', claim: 'Children in harshly punitive settings lie more readily and more skilfully; making honesty safe encourages truth-telling.', source: 'Talwar & Lee, 2011' },
  // Emotion and communication
  { id: 'emotion-coaching', tier: 'moderate', claim: 'Naming and accepting a child\'s feelings while still setting limits ("emotion coaching") supports better emotional regulation.', source: 'Gottman, Katz & Hooven, 1996; Havighurst et al., Tuning in to Kids trials' },
  { id: 'co-regulation', tier: 'consensus', claim: 'Young children regulate by borrowing an adult\'s calm; a regulated adult is the main tool for calming a dysregulated child.', source: 'Murray et al., self-regulation review for US ACF/OPRE, 2015' },
  { id: 'serve-return', tier: 'consensus', claim: 'Responsive back-and-forth interaction ("serve and return") builds early brain architecture and language.', source: 'Harvard Center on the Developing Child' },
  { id: 'motivational-interviewing', tier: 'moderate', claim: 'Open questions, reflections and respect for autonomy change behaviour more than lecturing, including with parents and teens.', source: 'Borrelli et al., meta-analysis, 2015' },
  { id: 'reflective-listening', tier: 'heuristic', claim: 'Reflecting what a child said before responding helps them feel heard and lowers escalation.', source: 'Faber & Mazlish, practitioner method' },
  // Temperament and development
  { id: 'temperament-dimensions', tier: 'consensus', claim: 'Temperament is best described as continuous tendencies (reactivity, sociability, self-control) that shift with age and context, not fixed types.', source: 'Rothbart & Bates, 2006' },
  { id: 'goodness-of-fit', tier: 'consensus', claim: 'Outcomes depend on the fit between a child\'s temperament and what their environment asks of them; adjusting the fit helps more than trying to change the child.', source: 'Thomas & Chess, New York Longitudinal Study' },
  { id: 'milestones-2022', tier: 'consensus', claim: 'Milestone checklists are set at the age most (75%) children reach a skill; a missed milestone is a reason to talk to a paediatrician, not a diagnosis.', source: 'Zubler et al., CDC/AAP milestones, 2022' },
  { id: 'adolescent-reward', tier: 'moderate', claim: 'Adolescent brains are especially sensitive to reward and peers, while self-control matures later; peer presence raises risk-taking.', source: 'Chein et al., 2011; Steinberg' },
  { id: 'resilience-ordinary', tier: 'consensus', claim: 'Resilience comes mostly from ordinary things: a caring relationship, problem-solving skills, self-regulation and belonging.', source: 'Masten, "Ordinary Magic", 2001' },
  // Sleep, eating, toileting
  { id: 'sleep-behavioural', tier: 'strong', claim: 'Consistent bedtime routines and behavioural sleep approaches improve young children\'s sleep.', source: 'Mindell et al., AASM review, 2006' },
  { id: 'sleep-no-harm', tier: 'moderate', claim: 'Graduated sleep approaches showed no harm to attachment or emotional health at five-year follow-up.', source: 'Price et al., 2012' },
  { id: 'bedtime-routine', tier: 'moderate', claim: 'A short, predictable, calm bedtime routine is linked with better sleep and fewer bedtime struggles.', source: 'Mindell & Williamson, 2018 review' },
  { id: 'food-exposure', tier: 'moderate', claim: 'Children often need many calm, pressure-free exposures to a new food before accepting it; pressure to eat backfires.', source: 'Wardle et al., 2003; feeding research reviews' },
  { id: 'toilet-readiness', tier: 'consensus', claim: 'Toilet learning goes best when it follows the child\'s readiness signs and avoids punishment for accidents.', source: 'AAP guidance' },
  // Learning, school, digital
  { id: 'learning-techniques', tier: 'strong', claim: 'Practice testing (recalling from memory) and spacing study over days are the most effective study techniques; re-reading and highlighting help little.', source: 'Dunlosky et al., 2013' },
  { id: 'learning-styles-myth', tier: 'strong', claim: 'Matching teaching to "visual/auditory/kinaesthetic learning styles" does not improve learning.', source: 'Pashler et al., 2008' },
  { id: 'habits-time', tier: 'moderate', claim: 'New habits take weeks to months (median about 66 days) and missing a day does not reset progress.', source: 'Lally et al., 2010' },
  { id: 'screens-iap', tier: 'consensus', claim: 'Indian paediatric guidance: no screens under 2, about an hour a day of supervised, quality screen time for ages 2–5, and screens off an hour before sleep.', source: 'Indian Academy of Pediatrics screen-time guidelines, 2022' },
  { id: 'screens-who', tier: 'consensus', claim: 'For children under 5, less sedentary screen time and more active play, reading and sleep support healthy development.', source: 'World Health Organization guidelines, 2019' },
  { id: 'social-media-mixed', tier: 'mixed', claim: 'Heavy social-media use is linked with poorer teen mental health, but cause and safe amounts are still debated; sleep and displaced activities matter most.', source: 'US Surgeon General advisory, 2023' },
  // Family systems and parent wellbeing
  { id: 'interparental-conflict', tier: 'moderate', claim: 'Hostile conflict between adults that involves the child harms children; calm disagreement followed by visible repair does not.', source: 'Cummings & Davies, emotional security research' },
  { id: 'sibling-differential', tier: 'moderate', claim: 'Siblings notice unequal treatment; one-on-one time and fairness based on need (not identical treatment) protect sibling relationships.', source: 'McHale et al., sibling research' },
  { id: 'parental-burnout', tier: 'moderate', claim: 'Parental burnout is common and is linked to more neglectful or harsh parenting; parent recovery is child-protection work.', source: 'Mikolajczak et al., 2019' },
  { id: 'repair', tier: 'heuristic', claim: 'Coming back after you have lost your temper ("I shouted. That wasn\'t okay. I\'m sorry.") rebuilds trust and models accountability.', source: 'Attachment-informed practice' },
  // Safety
  { id: 'asking-suicide-safe', tier: 'strong', claim: 'Asking directly about suicidal thoughts does not put the idea in someone\'s head and may reduce distress.', source: 'Dazzi et al., systematic review, 2014' },
];

export const CARD_IDS = EVIDENCE_CARDS.map((c) => c.id);
const BY_ID = new Map(EVIDENCE_CARDS.map((c) => [c.id, c]));
export const getCard = (id: string) => BY_ID.get(id);
