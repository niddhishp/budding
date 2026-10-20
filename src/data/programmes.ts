/**
 * Guided programmes: short, structured plans a parent runs with one child for a serious stage.
 * Authored educational examples, version-controlled like the Handbook. Sources inform the
 * principles; they have not validated these scripts. Clinical review is pending.
 * Every source URL must already appear in src/data/handbook.ts or src/data/articles.ts
 * (tests/programmes.test.ts enforces it).
 */
import { HANDBOOK_SOURCES } from "./handbook";

export const PROGRAMMES_VERSION = "2026-10-21";

export type ProgrammeStep = {
  /** Short heading for the day or session. */
  title: string;
  /** Film for this step. Empty until the founder supplies films; the slot is hidden while null. */
  film: string | null;
  /** Words the parent can say, in their own way. */
  words: string;
  /** One short thing to do with the child. */
  activity: string;
  /** Optional prompt that opens Ask in fictional practice mode. */
  practice?: string;
  /** What to leave out. */
  avoid: string;
};

export type Programme = {
  id: string;
  title: string;
  summary: string;
  /** Age window in completed months, inclusive, as for Handbook cards. */
  minMonths: number;
  maxMonths: number;
  /** "girls" programmes are shown unless the profile says Boy. */
  audience: "all" | "girls";
  /** Days run one a day; sessions can be spread out. */
  unit: "day" | "session";
  /** Early access: everything is free. Switch to "plus" here later; no other code changes needed. */
  included: "free" | "plus";
  why: string;
  /** A note to read before starting. */
  before: string;
  /** "Talk to a doctor or professional if…" where relevant. */
  seekHelp: string | null;
  /** One 1–5 question asked at the start and the finish. 1 is easy, 5 is very hard. {name} is the child's name. */
  question: string;
  sources: readonly { title: string; url: string }[];
  steps: readonly ProgrammeStep[];
};

export const RATING_LABELS = ["Easy", "Mostly easy", "Somewhat hard", "Hard", "Very hard"] as const;

const src = {
  potty: { title: "AAP: potty training", url: "https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/default.aspx" },
  constipation: { title: "NHS: constipation in children", url: "https://www.nhs.uk/baby/health/constipation-in-children/" },
  bedwetting: { title: "NHS: bedwetting in children", url: "https://www.nhs.uk/conditions/bedwetting/" },
  under5: { title: "WHO: guidelines on physical activity, sedentary behaviour and sleep for children under 5", url: "https://www.who.int/publications/i/item/9789241550536" },
  tantrums: { title: "NHS: temper tantrums", url: "https://www.nhs.uk/baby/babys-development/behaviour/temper-tantrums/" },
  periods: { title: "NHS: starting periods", url: "https://www.nhs.uk/conditions/periods/starting-periods/" },
  periodProblems: { title: "NHS: period problems", url: "https://www.nhs.uk/conditions/periods/period-problems/" },
  girls: { title: "AAP: physical development in girls", url: "https://www.healthychildren.org/English/ages-stages/gradeschool/puberty/Pages/Physical-Development-Girls-What-to-Expect.aspx" },
  boys: { title: "AAP: physical development in boys", url: "https://www.healthychildren.org/English/ages-stages/gradeschool/puberty/Pages/Physical-Development-Boys-What-to-Expect.aspx" },
  timing: { title: "NHS: early or delayed puberty", url: "https://www.nhs.uk/conditions/early-or-delayed-puberty/" },
  pants: { title: "NSPCC: talking about body safety", url: "https://www.nspcc.org.uk/advice-for-families/pants-underwear-rule/" },
  grooming: { title: "NSPCC: recognising grooming", url: "https://www.nspcc.org.uk/keeping-children-safe/types-of-abuse/grooming/" },
} as const;

const step = (title: string, words: string, activity: string, avoid: string, practice?: string): ProgrammeStep =>
  ({ title, film: null, words, activity, avoid, ...(practice ? { practice } : {}) });

const SAFETY_HELP = "If your child tells you someone touched them in a way that worried them, asked them to keep a secret about touching, or asked for photos: stay calm, thank them for telling you, keep them away from that person and get help. In India, call Child Helpline 1098, or 112 in an emergency.";

export const PROGRAMMES: readonly Programme[] = [
  {
    id: "potty-training",
    title: "Potty training, together",
    summary: "Seven calm days to get ready: signs, the toilet you have at home, accidents, and why nights can wait.",
    minMonths: 24, maxMonths: 47, audience: "all", unit: "day", included: "free",
    why: "Most children learn to use the potty somewhere between two and four years old, each at their own pace. This week is about getting ready together: noticing the signs, making the toilet familiar and keeping it calm. If it is not working, pausing for a few weeks is part of the plan, not a step back.",
    before: "Choose an ordinary week, not one with a new baby, a move or travel. Tell everyone who looks after your child, such as grandparents, a helper or the crèche, the words you will use, so they stay the same everywhere.",
    seekHelp: "Talk to your doctor if pooing hurts, poos are hard or have blood in them, your child holds in poo for days, weeing hurts or happens very often, or they were dry for a long time and have started having accidents again.",
    question: "How hard is potty time with {name} this week?",
    sources: [src.potty, src.constipation, src.bedwetting, HANDBOOK_SOURCES.communication],
    steps: [
      step("Notice the signs",
        "Your body tells you when a wee or a poo is coming. When you feel it, tell me.",
        "Today, just watch. Notice if they stay dry for an hour or two, go quiet or hide to poo, pull at a wet nappy, or tell you after they have gone. Note the times they usually poo. If you see few of these signs, it is fine to wait a few weeks and look again.",
        "Starting because a relative says it is time, or because another child the same age is already trained.",
        "Help me practise explaining to a grandparent, kindly, that we are waiting for our toddler's own signs before starting potty training."),
      step("Meet the potty or toilet",
        "This is where wees and poos go. You can sit on it with your clothes on, just to try.",
        "Let them sit on the potty, or on the toilet with a small child seat and a stool for their feet, fully dressed. If your home has an Indian-style toilet, a potty kept beside it can be easier at first; later they can practise squatting over the toilet while you hold their hands. Read a book or sing while they sit for a minute.",
        "Holding them on the seat, or making them sit until something happens."),
      step("Same times each day",
        "We've had breakfast. Let's sit on the potty for a little while.",
        "Offer the potty at the same times: after waking, after meals, before a bath and before going out. Keep each sit to a few minutes. If nothing happens, that is fine: \"Not now. We'll try again later.\"",
        "Asking \"Do you need to go?\" again and again, or long sits with a phone or screen to keep them there."),
      step("Words and washing",
        "Wee, poo, flush, wash hands. Your body did its job.",
        "Use the same words everyone at home uses, in your home language. Show the steps: pants down, sit or squat, wash with water or wipe from front to back, pants up, wash hands with soap. Let them do the parts they can, like pouring water or rubbing their hands.",
        "Words that make wees and poos sound disgusting, or doing every step for them."),
      step("When accidents happen",
        "Oops, you got wet. That's okay. Let's get clean clothes.",
        "Keep spare clothes, a cloth and a bag ready, at home and when you go out. Clean up without fuss and let them help if they want to. Accidents are part of learning. They say nothing about how clever or how good your child is.",
        "Scolding, punishment, or talking about accidents in front of them to other people.",
        "Help me practise staying calm when my toddler has a potty accident and a relative starts scolding them."),
      step("Pants and going out",
        "Before we leave, let's try the potty. Then shoes!",
        "If they use the potty most of the time, try cotton underwear at home during the day. Before outings, offer a toilet trip and pack spare clothes. When you arrive somewhere new, find the toilet together. A nappy for long journeys and naps is fine.",
        "Switching between pants and nappies as a reward or a threat."),
      step("Nights can wait, and look back",
        "You've learned so much this week. Your body will learn about night-time too, when it's ready.",
        "Keep a nappy at night for now. Staying dry at night often comes months, or even years, after the day. Look back at the week: what helped? If potty time has turned into a fight, put the potty away for two or three weeks and try again.",
        "Waking them in the night to wee, or cutting drinks so they go to bed thirsty."),
    ],
  },
  {
    id: "screen-off",
    title: "Screen-off without tears",
    summary: "A week to make stopping predictable: warnings, choosing the stop, something to go to, and a plan for the whole family.",
    minMonths: 36, maxMonths: 107, audience: "all", unit: "day", included: "free",
    why: "Stopping something fun is hard at every age. Tears and arguing when the screen goes off are common, and they do not mean something is wrong with your child. For children under five, the WHO suggests no more than an hour a day of sitting with screens, and less is better. This week builds a stop that is expected, shared and followed by something else to do.",
    before: "Pick the one screen moment that is hardest right now, such as the evening cartoon or the phone at dinner, and work on that one first. Tell other adults at home what you are trying, so the plan is the same for everyone.",
    seekHelp: "Talk to your doctor or a counsellor if screen use has been getting in the way of sleep, eating, school or friends for several weeks, or if stopping often leads to outbursts that worry you.",
    question: "How hard is switching the screen off with {name} this week?",
    sources: [src.under5, HANDBOOK_SOURCES.digital, src.tantrums, HANDBOOK_SOURCES.parenting],
    steps: [
      step("Watch what happens",
        "Show me what you like about this.",
        "Today, change nothing. Sit with them for a few minutes while they watch or play. Notice what they enjoy, when they usually use a screen, and what makes stopping hardest, like being tired, hungry or in the middle of something.",
        "Starting new rules on the first day, or making fun of what they enjoy."),
      step("A warning before the end",
        "Five more minutes, then the screen goes off. I'll tell you when it's time.",
        "Give a warning a few minutes before the end and another just before. For younger children, use something they can see, like a sand timer or \"two more songs\". When time is up, go to them, get down to their level and switch it off together.",
        "Switching it off suddenly, or calling out from another room."),
      step("Let them choose the stop",
        "Do you want to stop at the end of this episode, or after this level?",
        "Offer two stopping points that both fit your limit. Stopping at a natural break is easier than stopping in the middle. Let them press the off button themselves if they want to.",
        "Offering a choice you won't keep, or adding more time to stop the crying.",
        "Help me practise offering my child a choice about when the screen stops, and staying calm when they ask for five more minutes."),
      step("Something to go to",
        "Screen's off. Now it's the ball or the colouring. Which one?",
        "Have the next thing ready before the screen stops: a snack, a walk downstairs, helping in the kitchen, blocks or a book. Make a short list together of after-screen things they like, and keep it where you can both see it.",
        "Leaving them with nothing to do the moment the screen stops."),
      step("When tears come anyway",
        "You're cross that it ended. That's okay. The screen is finished for now, and I'm staying with you.",
        "Stay close and calm, say very little and wait. You don't need to explain again. When they settle, move to the next thing. If a grandparent or helper gives the phone back to stop the crying, agree together what you will all do next time.",
        "Giving the screen back to stop the crying, threats, or using screens as the main reward or punishment.",
        "Help me practise what to say when my child cries after the screen goes off, without giving it back."),
      step("A family screen plan",
        "Let's make our family screen plan. When are screens on, and when are they off for everyone?",
        "Write or draw a simple plan together: when screens are used, where phones and tablets stay at night, and screen-free times like meals and the hour before bed. Include the adults at home too. Put it where everyone can see it.",
        "Rules only for the child, or a plan so strict that no one can follow it."),
      step("Our own phones, and look back",
        "I'm putting my phone away now, so I can be with you.",
        "For one day, notice your own phone use around your child. Choose one time to put your phone away, such as meals or bedtime stories. Then look back at the week together: what made stopping easier?",
        "Scrolling while asking them to stop, or comparing their screen time with other children's."),
    ],
  },
  {
    id: "first-period",
    title: "Getting ready for the first period",
    summary: "Seven short sessions, at your pace: what a period is, supplies, a school plan, pain and when to see a doctor, privacy, and how both parents can help.",
    minMonths: 108, maxMonths: 167, audience: "girls", unit: "session", included: "free",
    why: "A first period can come any time from about 8 to 16 years old. A girl who knows what to expect, has supplies and has a plan is far less likely to be frightened when it starts. These seven short sessions can be spread over a few weeks. Any parent or trusted caregiver can lead them, and fathers can help too.",
    before: "In many homes, periods are not talked about openly. You can choose to talk about them calmly and plainly. If one parent feels less comfortable, they can still learn the basics and help with supplies, so she knows she can go to either of you.",
    seekHelp: "Talk to a doctor if periods have not started by 15, or by 13 with no other signs of puberty; if bleeding is very heavy, such as soaking a pad every one to two hours; or if pain stops her doing everyday things. Fainting or feeling very unwell needs urgent care.",
    question: "How hard does talking about periods with {name} feel right now?",
    sources: [src.periods, src.periodProblems, src.girls, src.timing],
    steps: [
      step("Start with what she knows",
        "Your body will change as you grow, and one change is getting your period. What have you heard about it so far?",
        "Choose a calm, private moment, side by side, such as a walk or while cooking. Listen to what she already knows, including things from friends or online. Gently correct anything untrue. Keep it short, and end by saying she can ask you anything.",
        "A long lecture, talking about it in front of siblings or relatives, or laughing at her questions."),
      step("What a period is",
        "Every month or so, the lining of the uterus comes out through the vagina as a little blood. It's a healthy part of growing up, and it doesn't mean you are hurt.",
        "Use the correct words: uterus, vagina, period. A simple book or diagram made for her age can help. Explain that the first periods may be brown or red, light or heavier, and may not come regularly at first.",
        "Calling periods impure or unclean, or using words that make her feel embarrassed about her body."),
      step("Supplies, hands-on",
        "Let's look at pads together, so you know exactly what to do.",
        "Buy a pack of pads and let her open one and stick it on to spare underwear. Show how to change it, wrap the used pad in its wrapper or paper, and put it in a bin, not the toilet. Wash hands before and after. If she wants to know about other products later, talk about them together.",
        "Choosing everything for her without explaining, or making her feel awkward for asking."),
      step("A school plan",
        "If your period starts at school, you can go to a teacher you trust and ask for help. You can call me too.",
        "Make a small pouch for her school bag with a pad, spare underwear and a small bag. Agree which teacher or staff member she can go to, and find out where the school keeps pads. Agree a simple way to ask, even just: \"Can I go to the washroom? It's urgent.\"",
        "Telling her to stay home from school because of her period.",
        "Help me practise explaining to my daughter what to do if her period starts at school, and answering her worries about it."),
      step("Pain and comfort",
        "Some girls get tummy cramps or backache with their period. Tell me if it hurts, and we'll find what helps.",
        "Talk about what can help: a warm water bottle on the tummy, gentle movement, rest and drinking water. If pain is strong, ask a doctor or pharmacist which medicine suits her age; don't guess. Tell her when you would see a doctor together.",
        "\"Every girl goes through it, just bear it\", or ignoring pain that stops her doing everyday things."),
      step("Privacy, and both parents",
        "This is your body, and you choose who you talk to about it. Both of us are here for you.",
        "Ask her who she would like to know when her period starts, and respect it. If one parent has been leading, let the other join in. A father can say: \"I know about periods too. You can ask me for pads or help any time.\" Keep pads where she can reach them without asking.",
        "Announcing it to relatives without asking her, or rules that make her feel unclean or left out."),
      step("A question box, and look back",
        "You can ask me anything about growing up, today or any day. If it's easier to write it down, that's fine too.",
        "Leave a notebook or small box where she can write questions for you to answer privately. Go over the plan together: where the pads are, the school pouch and who she can talk to. Ask what still worries her.",
        "Treating this as one talk that is now finished."),
    ],
  },
  {
    id: "body-talk-young",
    title: "The body talk: early years",
    summary: "Seven small conversations: real names, privacy, choosing touch, safe and unsafe secrets, and who to tell.",
    minMonths: 36, maxMonths: 95, audience: "all", unit: "day", included: "free",
    why: "Children who know the real names for their body parts, and know their body belongs to them, find it easier to tell an adult when something feels wrong. These are small, calm conversations that fit into bath time and everyday life, not one big talk.",
    before: "You don't need to talk about abuse or frighten them. Use the same ordinary, calm voice you use for brushing teeth. If a word feels awkward to say, practise it once on your own first.",
    seekHelp: SAFETY_HELP,
    question: "How hard does it feel to talk with {name} about bodies and safety?",
    sources: [src.pants, src.grooming, HANDBOOK_SOURCES.bodies],
    steps: [
      step("Real names",
        "Every part of your body has a real name, including your private parts: penis, vulva and bottom.",
        "During bath time or while dressing, name body parts calmly, including private parts, in your home language and in English if that helps. Use the same voice for \"knee\" as for \"vulva\".",
        "Nicknames that suggest shame, or reacting with shock when they say the words."),
      step("Private parts are private",
        "Your private parts are the parts covered by your underwear. They belong to you.",
        "Talk about privacy in everyday moments, like closing the toilet door or changing clothes. Explain when someone may need to see or touch private parts: a parent helping them wash, or a doctor with a parent there. They will always be told why.",
        "Making private parts sound bad, or saying no one may ever help with them, even for care."),
      step("My body, my choice",
        "Would you like to give a hug, a high-five or a wave?",
        "Let them choose how to greet relatives and friends, and tell family about it kindly beforehand. In tickle games, stop the moment they say \"stop\", so they learn that their \"no\" works.",
        "Making them hug or kiss someone to be polite, or teasing them for saying no."),
      step("Surprises and secrets",
        "A surprise is fun because everyone finds out soon, like a present. A secret that makes you feel worried or uncomfortable is one you should always tell me.",
        "Play a quick sorting game, \"surprise or tell?\", with easy examples: a gift for Dadi is a surprise; someone saying \"don't tell your mum\" is a tell. Keep it light and short.",
        "Scary stories, or saying that danger only comes from strangers."),
      step("Who you can tell",
        "If anything worries you, you can tell me. You won't be in trouble. If I'm not there, who else could you tell?",
        "Together, name two or three trusted adults, such as a parent, a grandparent or a teacher. You could draw a helping hand with one trusted person on each finger. Explain: if one person doesn't listen, tell another.",
        "Promising to keep any secret, or getting angry when they tell you something.",
        "Help me practise what to say, calmly, if my young child tells me something worrying about another person."),
      step("Answering body questions",
        "That's a good question. Let me tell you.",
        "When questions come, such as \"Where do babies come from?\", give a short, true answer, like \"A baby grows in a part of the body called the uterus\", and ask what made them wonder. If it's a busy moment, say you'll answer later, and then do.",
        "Made-up stories they will have to unlearn, or making questions feel rude."),
      step("Keep it going",
        "You can always talk to me about your body, any time.",
        "Look back at the week: which words come easily now? Repeat the body rules now and then, in the car or at bath time. Read a picture book about body safety made for their age together.",
        "Treating this as one talk that is done, or quizzing them to check they remember."),
    ],
  },
  {
    id: "body-talk-preteen",
    title: "The body talk: growing up",
    summary: "Seven conversations for the years before and around puberty: changes, privacy, consent, online pressure and where to get help.",
    minMonths: 96, maxMonths: 155, audience: "all", unit: "day", included: "free",
    why: "Between eight and twelve, bodies start to change and children meet more of the world, at school and online. Children who can talk to a parent about bodies, privacy and pressure find it easier to ask for help when they need it. This week builds that habit.",
    before: "You don't need every answer. \"I'm not sure. Let's find out together\" is a good reply. Use the profile-matched Puberty guide in Kahiye if you want help with the details.",
    seekHelp: `${SAFETY_HELP} Talk to your doctor about body changes that start before eight, or that worry you or your child.`,
    question: "How hard does it feel to talk with {name} about bodies, growing up and safety?",
    sources: [src.girls, src.boys, src.timing, src.pants, src.grooming, HANDBOOK_SOURCES.bodies, HANDBOOK_SOURCES.digital],
    steps: [
      step("Opening the door",
        "Bodies change as we grow up, and everyone's timing is different. What have you heard or wondered about?",
        "Pick a calm moment side by side, like a walk or a drive. Ask what they already know, and listen more than you talk. Say clearly that no question is too embarrassing.",
        "Teasing about crushes or body changes, especially in front of family."),
      step("Puberty basics",
        "Puberty is when a body slowly changes from a child's to an adult's. It happens to everyone, at different times.",
        "Go over the basics for all bodies: growing taller, body hair, sweat and spots, breasts developing, periods, voice changes, erections and wet dreams. Use the correct words. Let them know that girls and boys both go through changes, and that none of it is wrong.",
        "Comparing their body with siblings, cousins or classmates."),
      step("Privacy and respect",
        "Your body belongs to you. Nobody should touch it, or ask to see it, in a way that makes you uncomfortable, even someone you know.",
        "Agree some privacy at home, like knocking before coming in and changing alone. Talk about how the rule works both ways: they respect other people's bodies and privacy too.",
        "Walking in without knocking, or remarks about their size or shape."),
      step("Saying no, and hearing no",
        "You can say no to touch, even from family. And when someone says no or stop to you, you stop.",
        "Talk through a made-up situation, like a relative who insists on a kiss, or a friend who keeps tickling after \"stop\". Practise a short reply together: \"No. I don't like that.\"",
        "Making them give affection to keep relatives happy.",
        "Help me practise talking with my preteen about consent, using a made-up situation where a friend keeps going after they said stop."),
      step("Secrets and pressure online",
        "If anyone, online or in person, asks you for photos, asks you to keep a secret from me, or wants to meet, come to me. You won't be in trouble.",
        "Go through how to block and report in the apps and games they use. Agree that they never meet an online contact without you. In India you can report online harm at cybercrime.gov.in or call 1930.",
        "Taking away every device because they told you something, or asking to see the photos.",
        "Help me practise what to say if my preteen tells me someone online asked them for a photo, so I stay calm and helpful."),
      step("Where to get help",
        "If something happens and you don't want to tell me, tell another adult you trust. I'd rather you told someone.",
        "List trusted adults together, inside and outside the family. Share Child Helpline 1098 as a number children in India can call. Tell them what you will do if they come to you: stay calm, believe them and help.",
        "Promising to keep a worrying secret, or blaming them for not saying no."),
      step("Keep the conversation open",
        "Thank you for talking with me this week. You can come back to any of this, any time.",
        "Ask what was useful and what felt awkward. Agree an easy way for them to bring up a hard topic, like a note, a message or \"Can we talk in the car?\"",
        "Treating this as one talk that is now done."),
    ],
  },
];
