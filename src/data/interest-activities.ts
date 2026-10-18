import type { InterestId } from '@/lib/profile-notebook';

// Small editorial invitations, not treatment or an assessment. Adapt to comfort and ability.
export const interestActivities: Record<InterestId, { young: string[]; older: string[] }> = {
  art: {
    young: ['Choose two large, age-safe objects with different colours. Look at them together and follow what catches their attention.', 'Look at a picture book together. Pause at the picture they return to and describe one thing you notice.'],
    older: ['Five-minute sketch: choose one everyday object and draw it in three different ways. Let your child choose their favourite detail, without grading it.', 'Make a tiny comic with three panels: a surprise, a problem and an unexpected ending. Stick figures count.'],
  },
  movement: {
    young: ['Copy one comfortable movement your child makes, then pause for their response. Keep the space clear and the pace gentle.', 'Play a familiar song softly. Try a small seated or standing movement together, with breaks whenever they want.'],
    older: ['Invent a short sequence of three comfortable dance moves. Take turns adding one move; seated movements work too. Stop with discomfort.', 'Choose a familiar sport skill or dance step to practise gently for a few minutes. Ask what felt enjoyable rather than counting wins. Follow any clinician activity limits.'],
  },
  music: {
    young: ['Sing one familiar line softly, then pause. Notice their sounds, gaze or movement without expecting a performance.', 'Tap a quiet rhythm with your hands. Leave space for any response, then let your child set the pace.'],
    older: ['Rhythm echo: tap a four-beat pattern, copy each other, then change just one beat. Take turns leading.', 'Choose a favourite song and listen for one instrument. Try humming or tapping its part softly, or invent a new ending.'],
  },
  patterns: {
    young: ['Place two large, age-safe objects side by side and describe their shapes. Let exploration lead; keep small pieces out of reach.', 'Try a repeating clap-and-pause game. Follow your child’s attention and stop before it becomes a drill.'],
    older: ['Secret rule: write a short number sequence and let each other invent a rule that fits. More than one answer can work.', 'Pick a recipe and work out what would change for twice as many people. Sketch or calculate together; accuracy is something to explore, not a race.'],
  },
  making: {
    young: ['Stack age-safe large cups or blocks together, then let your child decide what happens next. Stay close and keep small parts away.', 'Explore putting a large, age-safe toy into and out of an open container. Follow their pace and curiosity.'],
    older: ['Pretend-robot challenge: write instructions for drawing a square. Follow them literally, then debug one confusing step together.', 'Design a tiny game on paper: a goal, two rules and a way to finish. If they already code, invite them to implement just one rule.'],
  },
  words: {
    young: ['Look at a favourite picture together. Name one thing, pause, and answer whatever sound or gesture comes back.', 'Tell a tiny story about an everyday routine using familiar names. Let your child interrupt, join in or move on.'],
    older: ['Write or tell a six-sentence story with an ordinary object as the hero. Let your child choose the language and whether to share it.', 'Choose a character and interview them: what do they want, what worries them, and what might they do next? Swap roles if you like.'],
  },
  nature: {
    young: ['Watch a tree or the sky from a comfortable, safe spot. Name one sound or movement and follow their gaze.', 'Look at an animal picture and gently imitate its sound. Keep real unfamiliar animals at a safe distance.'],
    older: ['From a safe place, sketch or describe one plant. Write one question about it and look for an answer together; leave unknown plants untouched.', 'Keep a tiny weather log today: what you see, how it feels and one prediction. Tomorrow, compare what happened without treating it as a test.'],
  },
  other: {
    young: ['Follow their lead in a familiar, safe activity for a few minutes. Notice what they return to without assigning a label.', 'Offer two safe, age-suitable play options. Let a look, gesture or movement guide your choice together.'],
    older: ['Let your child choose one tiny experiment in something they enjoy. Ask what materials or company they need, then leave room for their approach.', 'Ask them to teach you one thing they like doing. Be the beginner and let them decide what to show next.'],
  },
};
