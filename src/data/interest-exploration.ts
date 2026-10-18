import type { InterestId, InterestsBook } from "@/lib/profile-notebook";
type Band = NonNullable<InterestsBook["band"]>;
export const interestAreas: {
  id: InterestId;
  label: string;
  invitation: string;
  ideas: Record<Band, string>;
}[] = [
  {
    id: "art",
    label: "Art & imagination",
    invitation: "Colours, pictures, clay, make-believe",
    ideas: {
      baby: "Look at a simple picture together. Follow what catches their eye; there is no need to teach or test.",
      preschool:
        "Offer chunky crayons and paper. Ask about their picture without correcting what it should look like.",
      school:
        "Let them choose a small drawing or making project. Keep a few attempts so they can see their own progress.",
      teen: "Invite them to choose a medium and a short project. Offer materials, an exhibition visit or feedback only if wanted.",
    },
  },
  {
    id: "movement",
    label: "Movement, sport & dance",
    invitation: "Moving, balancing, dancing, playing outdoors",
    ideas: {
      baby: "Make space for supervised floor movement while awake. Follow their pace and comfortable abilities.",
      preschool:
        "Try a stop-and-go dance or a simple movement game. Let them invent a move and take breaks.",
      school:
        "Try different forms of movement before committing to one class. Notice enjoyment, not just winning.",
      teen: "Let them choose dance, sport or another form of movement. Agree on a routine that leaves room for rest and school.",
    },
  },
  {
    id: "music",
    label: "Music & rhythm",
    invitation: "Songs, beats, sounds, instruments",
    ideas: {
      baby: "Sing a familiar song softly and pause for their response. Turn the volume down if they turn away.",
      preschool:
        "Clap a short rhythm and let them answer with their own. Use safe, age-suitable instruments.",
      school:
        "Explore singing or an instrument through a short trial. A few enjoyable minutes of practice can be enough.",
      teen: "Support a song, performance or recording they choose. Help find constructive feedback without making every session an exam.",
    },
  },
  {
    id: "patterns",
    label: "Numbers & patterns",
    invitation: "Puzzles, sorting, strategy, mathematical questions",
    ideas: {
      baby: "Explore safe large objects with different shapes during supervised play. No counting drills are needed.",
      preschool:
        "Make a colour or movement pattern together and let them change the rule.",
      school:
        "Offer a puzzle, recipe or strategy game that uses numbers. Ask how they thought about it, not how fast they finished.",
      teen: "Explore a question they care about through maths, a puzzle or a small data project. Look for a supportive club if they want one.",
    },
  },
  {
    id: "making",
    label: "Building, science & coding",
    invitation: "Taking ideas apart, building, experimenting",
    ideas: {
      baby: "Use age-safe stacking cups or large blocks together. Keep small parts out of reach.",
      preschool:
        "Build with large blocks or give each other simple pretend-robot instructions. Keep it hands-on.",
      school:
        "Try a cardboard invention, supervised experiment or age-appropriate coding activity together. Let them choose what it should do.",
      teen: "Help scope a small app, game, experiment or invention. Break it into achievable steps and celebrate revisions as well as results.",
    },
  },
  {
    id: "words",
    label: "Words & storytelling",
    invitation: "Reading, telling stories, acting, languages",
    ideas: {
      baby: "Talk about what you are doing and share a short picture book. Follow their sounds and attention.",
      preschool:
        "Make up a story with toys and take turns adding a small part. Let silly endings happen.",
      school:
        "Invite a comic, short story, skit or book swap. Let them choose the language and audience.",
      teen: "Support writing, theatre, debate or learning a language if it interests them. Let them decide whether to share their work.",
    },
  },
  {
    id: "nature",
    label: "Nature & curiosity",
    invitation: "Animals, plants, exploring, asking why",
    ideas: {
      baby: "Notice leaves and everyday sounds from a safe spot together. Keep plants and small objects out of their mouth.",
      preschool:
        "Take a short noticing walk. Compare leaf shapes without picking unknown plants or touching unfamiliar animals.",
      school:
        "Keep a small nature sketchbook or care for a plant together. Model looking up answers when neither of you knows.",
      teen: "Support a nature journal, local project or supervised volunteering opportunity chosen by them. Start with a manageable commitment.",
    },
  },
  {
    id: "other",
    label: "Something else",
    invitation: "Their own surprising combination",
    ideas: {
      baby: "Notice what brings a relaxed, interested response. Write down one moment without turning it into a label.",
      preschool:
        "Let them lead a safe play activity. Describe what you noticed and ask what they would like to try again.",
      school:
        "Ask what they would love to try if there were no marks or prizes. Make one small opportunity for it.",
      teen: "Ask what matters to them right now. Support one experiment with their agreement, without attaching a career expectation.",
    },
  },
];
export const scenes: Record<Exclude<Band, "baby">, string[]> = {
  preschool: [
    "A free afternoon. What do they drift towards?",
    "When they say “again!”, what are they usually doing?",
    "What would they enjoy trying with you next?",
  ],
  school: [
    "School is done. What would they choose with no homework or prizes?",
    "What do they return to, even when it takes a few tries?",
    "If they could pick a small project this weekend, what might it be?",
  ],
  teen: [
    "Ask them: what do you enjoy doing when nobody is grading it?",
    "What skill or project would you choose to get a little better at?",
    "What would you like support or space to explore next?",
  ],
};
