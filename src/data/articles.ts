import { PARENT_GUIDES, GUIDE_UPDATED } from "./parent-guides";
export type Article = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  age: string;
  sections: { heading: string; body: string }[];
  sources: { title: string; url: string }[];
};
const source = (title: string, url: string) => ({ title, url });
const section = (heading: string, body: string) => ({ heading, body });
export const ARTICLES: Article[] = [
  ...PARENT_GUIDES.map((g) => ({
    slug: g.slug,
    category: g.topic === "puberty" ? "Puberty" : "Safety",
    title: g.title,
    summary: g.summary,
    age: g.bands.join(" / "),
    sections: [
      section("What to know", g.explain),
      section("Words you can borrow", g.say),
      section("Try together", g.practice),
      section("A small practice moment", `${g.scenario} ${g.response}`),
      section("Care and support", g.care),
    ],
    sources: g.sources,
  })),
  {
    slug: "babys-first-shoes",
    category: "Development",
    title: "Baby’s First Shoes: When They Need Them and How to Choose",
    age: "Babies and new walkers",
    summary:
      "When shoes become useful, what flexible fit looks like, and how often to check fast-growing feet.",
    sections: [
      section(
        "Start with where your baby walks",
        "A first pair of shoes is a practical purchase, not a milestone deadline. A baby who is being carried or playing on a clean, safe floor usually does not need structured shoes. Once your child walks outside, protection from rough ground and weather becomes useful. Indoors, make room for barefoot movement where the surface is safe; keep sharp objects and very hot surfaces out of reach.",
      ),
      section(
        "Try them on together",
        "Choose a light, flexible pair with secure fastenings and space for the toes. Have both feet checked, then let your child take a few steps. Watch for slipping heels, curling toes or a fastening that presses into the skin. Shoes should feel comfortable now, rather than after a promised period of breaking them in. Bring the socks your child will actually wear.",
      ),
      section(
        "Make a small checking routine",
        "Check fit regularly as feet grow, and sooner if shoes become difficult to put on or leave marks. A quick look while getting dressed is more useful than relying only on the size printed inside. Persistent pain, swelling or a new limp deserves a clinician’s assessment. You do not need to buy a special corrective shoe without individual advice.",
      ),
    ],
    sources: [
      source(
        "NHS: children’s feet and shoes",
        "https://www.nhs.uk/baby/health/leg-and-foot-problems-in-children/",
      ),
    ],
  },
  {
    slug: "traveling-with-a-baby",
    category: "Family Life",
    title: "Traveling With a Baby: A Practical Planning Guide",
    age: "Birth onwards",
    summary:
      "A practical checklist for transport, feeding, sleep, health supplies, accommodation, and flexible routines.",
    sections: [
      section(
        "Plan the essential parts first",
        "Begin with transport, a safe sleep space and feeding. For car journeys, arrange an appropriate rear-facing child seat and check that it can be installed correctly in the actual vehicle. A lap or carrier is not a substitute. Ask accommodation providers specific questions about the cot rather than assuming “baby friendly” includes a suitable sleep setup. For flights, check the airline’s current child-restraint and baggage rules before booking.",
      ),
      section(
        "Pack for the journey you have",
        "Keep changes of clothes, nappies, feeding supplies and a familiar comfort item within reach. Split the essentials between bags so one missing bag does not leave you without everything. Carry prescribed medicines in their original packaging and a brief list of relevant medical information. Ask your clinician about destination-specific health needs well before travel; medicine choices and vaccine timing depend on your baby and destination.",
      ),
      section(
        "Give the day some slack",
        "Choose fewer activities and leave room for feeding, changing and rest stops. Agree who handles bags and who watches the baby during transfers. At arrival, check the room from floor level for cords, loose objects and accessible balconies. Keep familiar small rituals where possible, while accepting that naps and mealtimes may shift. A successful trip can simply mean arriving safely and spending time together.",
      ),
    ],
    sources: [
      source(
        "AAP: choosing and using car seats",
        "https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/Car-Safety-Seats-Information-for-Families.aspx",
      ),
    ],
  },
  {
    slug: "baby-carrier-safety",
    category: "Safety",
    title: "Baby Carrier Safety: Fit, Airway, and Everyday Use",
    age: "Follow the carrier’s age and weight limits",
    summary:
      "How to protect the airway, check fit and fasteners, move safely, and follow carrier limits every time.",
    sections: [
      section(
        "Check the baby, then the carrier",
        "Read the instructions for your exact model, including minimum size and any newborn insert. Before each use, inspect seams, buckles and fabric. Ask a clinician for individual advice if your baby was premature, has low birth weight or has breathing difficulties. A product being marketed for newborns does not establish that it suits every newborn.",
      ),
      section(
        "Keep breathing easy to see",
        "Your baby’s face should remain visible, with the nose and mouth clear and the chin away from the chest. Support their position so they cannot slump deep into fabric. Recheck after walking, feeding or adjusting clothing. Take your baby out of the carrier for a feed, then check fit and airway again before using it. Do not cover the face to make a dark sleeping space.",
      ),
      section(
        "Move with a different centre of balance",
        "Practise putting the carrier on over a safe surface with another adult nearby. Bend at your knees rather than folding over your baby, and keep hot drinks and cooking away from them. Follow the manufacturer’s limits on activity and position. If the baby slips, their breathing changes or the fit cannot be maintained, stop and take them out. Difficulty breathing or unusual unresponsiveness needs immediate emergency help.",
      ),
    ],
    sources: [
      source(
        "AAP: baby carrier safety",
        "https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/Baby-Carriers.aspx",
      ),
    ],
  },
  {
    slug: "high-chair-safety",
    category: "Safety",
    title: "High Chair Safety: A Practical Checklist for Every Meal",
    age: "When ready for supported seated meals",
    summary:
      "A quick checklist for stability, harness use, placement, supervision, and safer meals at home or away.",
    sections: [
      section(
        "Before your baby sits down",
        "Check that the chair is stable, fully opened and locked, with no broken parts. Follow its age, size and sitting-readiness guidance. Position it away from cords, hot items and surfaces the child can push against. At a café or relative’s home, take the same moment to inspect the chair; familiarity with the setting does not replace checking the equipment.",
      ),
      section(
        "Buckle for every meal",
        "Use the provided harness, including the strap between the legs, according to the instructions. A tray is not a restraint. Sit close enough to respond and keep the child upright while eating. Prepare food in a suitable shape and texture for your child, and avoid walking away to answer a door or fetch something. If you need to leave, take the child with you.",
      ),
      section(
        "Make the ending predictable",
        "Have a cloth and a place for the used bowl ready before the meal. Remove the child before moving or folding the chair. Keep siblings from climbing or hanging on it. If your baby repeatedly slips or cannot stay in a supported position, pause and review the setup instead of improvising restraints. Mealtimes can be messy and relaxed while these few safety steps stay consistent.",
      ),
    ],
    sources: [
      source(
        "AAP: high chair safety",
        "https://www.healthychildren.org/English/safety-prevention/at-home/Pages/High-Chair-Safety-Tips.aspx",
      ),
    ],
  },
  {
    slug: "teaching-baby-to-drink-from-cup",
    category: "Nutrition",
    title: "Teaching a Baby to Drink From a Cup: A Calm, Mess-Friendly Guide",
    age: "Around six months onwards",
    summary:
      "Readiness cues, safe positioning, and simple practice with an open or straw cup from around six months.",
    sections: [
      section(
        "Think of it as practice",
        "Around the start of complementary foods, offer a small amount of water with a meal in an open or free-flow cup. Breast milk or infant formula remains the main drink during the first year. This is a new coordination task, so spilling, touching the rim and taking just one sip all count as exploring. Choose a time when your baby is alert and comfortably supported upright.",
      ),
      section(
        "Keep the amount and pace small",
        "Put a little water in the cup and help your baby hold it. Tip gently, letting them set the pace; do not pour liquid into their mouth. A straw cup can also offer practice, provided it is suitable and cleaned as instructed. Stay close, pause when your baby turns away and avoid chasing a particular volume. Protecting a small area with a cloth can make you more comfortable with the mess.",
      ),
      section(
        "Build a familiar moment",
        "Offer the cup at an ordinary meal rather than turning it into a lesson. Keep drinks plain and avoid sweetened drinks. Wash the cup and its parts thoroughly between uses. If drinking repeatedly causes coughing, choking, distress or a wet-sounding voice, stop and discuss it with your clinician. Your baby does not need to master every cup type on a timetable.",
      ),
    ],
    sources: [
      source(
        "NHS: drinks and cups for babies",
        "https://www.nhs.uk/baby/weaning-and-feeding/drinks-and-cups-for-babies-and-young-children/",
      ),
    ],
  },
  {
    slug: "baby-nap-transitions",
    category: "Sleep",
    title: "Baby Nap Transitions: Moving Between Nap Schedules Gently",
    age: "Babies and toddlers",
    summary:
      "Signs a nap schedule is changing, how to adjust gradually, and ways to protect bedtime and safe sleep.",
    sections: [
      section(
        "Look for a pattern, not one difficult day",
        "Sleep changes with age, illness, feeding and the day around a baby. Several days of a consistently difficult nap may invite a closer look, but a single missed sleep does not establish that your child is ready to drop it. Note when they seem rested and when they struggle. There is no universal nap timetable that every family needs to match.",
      ),
      section(
        "Change one thing gently",
        "Try a slightly different nap opportunity or a quieter lead-in, then watch how the whole day feels. Avoid deliberately exhausting your baby to force a longer night. During a transition, some days may still need the old pattern and others may not. Keep a simple familiar cue, such as a short song, and leave room for an earlier bedtime after a difficult afternoon.",
      ),
      section(
        "Keep the sleep space safe",
        "For every sleep, put your baby on their back in a clear, flat, firm sleep space. In the first six months, keep their sleep space in the same room as you. Do not add pillows or positioners to solve a nap problem. Speak with a clinician about breathing concerns, unusual sleepiness, feeding difficulties or a marked change in wellbeing. If you are exhausted, ask someone safe to help you get a protected rest.",
      ),
    ],
    sources: [
      source(
        "NHS: helping your baby sleep",
        "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/",
      ),
    ],
  },
  {
    slug: "co-regulation-for-babies",
    category: "Wellbeing",
    title: "Co-Regulation for Babies: Helping Calm Grow Through Connection",
    age: "Birth onwards",
    summary:
      "How babies borrow calm from a familiar adult through voice, rhythm, touch, and predictable care.",
    sections: [
      section(
        "Start with the immediate need",
        "A baby’s crying is communication, not a test of your parenting. Check feeding, temperature, a nappy and signs of discomfort before adding more soothing. A familiar voice, gentle holding and a quieter setting can help. You may need to try one thing, wait and notice the response rather than quickly switching between many techniques.",
      ),
      section(
        "Make the moment smaller",
        "Imagine the last few minutes of a busy family visit. You can step into a quieter room, soften your voice and use the same short phrase: “I’m here.” You do not need to feel perfectly calm. A predictable rhythm and a responsive adult matter more than a polished performance. If touch seems unwelcome, pause and try being nearby without adding more stimulation.",
      ),
      section(
        "Include your own support",
        "Agree a simple handover phrase with another caregiver before a hard evening. If you feel overwhelmed, place your baby safely in their cot and take a brief pause while arranging support. Never shake a baby. Persistent unusual crying, difficulty breathing, poor feeding or a baby who is hard to wake needs medical advice urgently. Connection is built across many ordinary moments, including the times you stop, regroup and try again.",
      ),
    ],
    sources: [
      source(
        "UNICEF: ways to soothe a baby",
        "https://www.unicef.org/parenting/child-care/how-soothe-baby",
      ),
    ],
  },
  {
    slug: "baby-overstimulation-signs",
    category: "Wellbeing",
    title: "Baby Overstimulation Signs: How to Notice and Help",
    age: "Birth onwards",
    summary:
      "Common signs that your baby needs less input, plus calm ways to reset without blaming yourself.",
    sections: [
      section(
        "Notice a change in your baby",
        "Turning away, becoming fussy or finding it harder to settle can be a cue to reduce input. These signs are not a diagnosis: hunger, tiredness, discomfort and illness can look similar. Compare the moment with your baby’s usual way of responding, and check basic needs before deciding that stimulation is the only explanation.",
      ),
      section(
        "Try less, then watch",
        "Turn off background sound, stop passing the baby between people and move to a calmer spot. Offer familiar comfort without insisting on eye contact or play. For example, after a noisy outing you might put the toys aside and simply hold your baby while sitting quietly. Let their response guide whether to continue, change position or give them more space.",
      ),
      section(
        "Plan a kinder next outing",
        "Think about one practical adjustment: a shorter visit, a quieter arrival time or a place to retreat. Tell relatives what helps without making the baby’s behaviour a problem to fix. Keep an eye on feeding and general wellbeing. If distress is intense, persistent or accompanied by concerning symptoms, seek clinical advice. Some busy days will still be difficult; noticing and responding is already useful care.",
      ),
    ],
    sources: [
      source(
        "UNICEF: responding to a baby’s need for comfort",
        "https://www.unicef.org/parenting/child-care/how-soothe-baby",
      ),
    ],
  },
  {
    slug: "baby-hearing-development",
    category: "Development",
    title: "Baby Hearing Development: What Babies Notice and How to Respond",
    age: "Birth onwards",
    summary:
      "What babies may notice at different ages, playful listening ideas, and when to ask for a hearing check.",
    sections: [
      section(
        "Let everyday sound be enough",
        "Your voice, a familiar song and ordinary conversation give your baby plenty to listen to. Talk during a nappy change and pause as though waiting for a reply. As your baby grows, you may notice changes in how they attend to voices or look towards a sound. Responses vary with alertness and the environment; one moment cannot measure hearing.",
      ),
      section(
        "Play without testing",
        "Sit nearby and sing a short song with a pause before the last line. Notice any movement, expression or sound, then answer it warmly. Avoid making sudden loud noises near the ears to check a reaction. Keep background television down when talking together. Listening games are shared time, not a substitute for a hearing assessment.",
      ),
      section(
        "Follow up on concerns",
        "Newborn hearing screening helps identify babies who may need further assessment. A screening result does not rule out later hearing changes, so keep follow-up appointments and raise new concerns even after an earlier reassuring result. Tell your clinician what you have noticed, when it happens and whether responses have changed. You do not need to wait for a speech delay before asking about hearing.",
      ),
    ],
    sources: [
      source(
        "NHS: newborn hearing screening and follow-up",
        "https://www.nhs.uk/baby/newborn-screening/hearing-test/",
      ),
    ],
  },
  {
    slug: "newborn-bonding-activities",
    category: "Development",
    title: "Newborn Bonding Activities: Gentle Ways to Build Connection",
    age: "Newborns",
    summary:
      "Simple ways to build connection through touch, voice, feeding, eye contact, and responsive everyday care.",
    sections: [
      section(
        "Connection can grow slowly",
        "Bonding does not have to arrive as an instant rush of feeling. Recovery, birth experiences, worry and lack of sleep can all shape the early days. Start with ordinary care: saying hello before picking your baby up, noticing how they like to be held and responding when they need comfort. Familiarity grows through repetition.",
      ),
      section(
        "Use moments already in your day",
        "During a feed, settle yourself comfortably and notice your baby without requiring eye contact. At a change, describe one thing you are doing in a gentle voice. When your baby is awake and interested, hold your face nearby and pause for their response. Skin-to-skin time can be comforting when done safely with an awake, attentive adult and the baby’s airway clear.",
      ),
      section(
        "Share the relationship work",
        "Another caregiver can build their own familiar ritual, such as a song or a calm change after waking. Stop an activity when your baby turns away or needs something else. If you feel persistently detached, low or overwhelmed, tell someone you trust and seek professional support. Getting help supports the relationship; it does not mean you have failed at it. A difficult start does not decide the whole story.",
      ),
    ],
    sources: [
      source(
        "NHS: building a close relationship with your baby",
        "https://www.nhs.uk/best-start-in-life/baby/baby-basics/bonding-with-your-baby/building-a-close-relationship-with-your-baby/",
      ),
    ],
  },
  {
    slug: "screen-free-activities-for-babies",
    category: "Play",
    title:
      "Screen-Free Activities for Babies: Simple Play for Everyday Moments",
    age: "Birth to two years",
    summary:
      "Songs, books, floor play, household helpers, and low-preparation ideas for connected baby time.",
    sections: [
      section(
        "Choose a tiny invitation",
        "You do not need to fill every waking minute. Try one song while getting dressed, one page of a sturdy book or a few minutes together on a clear floor. Let your baby watch, reach or turn away. The useful part is shared attention and room to explore, rather than finishing an activity or producing a visible result.",
      ),
      section(
        "Use what is safely available",
        "Offer a large, smooth, unbreakable bowl and a baby-safe object to put inside. Show it once, then wait. With a younger baby, make a face and pause for any response. With a mobile baby, place a suitable toy a short comfortable distance away on a safe floor. Check every object for small parts, sharp edges and damage, and stay within reach.",
      ),
      section(
        "Make a small menu for hard days",
        "Keep three options in mind: a song, a book and a simple floor game. Rotate between them instead of searching for something new every day. A caregiver can also narrate an ordinary task while the baby is safely nearby. Stop when your child seems tired or uninterested. Quiet observation and rest belong in the day too; screen-free time does not need to become another standard to meet perfectly.",
      ),
    ],
    sources: [
      source(
        "NHS: baby and toddler play ideas",
        "https://www.nhs.uk/baby/babys-development/play-and-learning/baby-and-toddler-play-ideas/",
      ),
    ],
  },
  {
    slug: "babyproofing-by-room",
    category: "Safety",
    title: "Babyproofing Checklist by Room: A Practical Home Safety Guide",
    age: "Before mobility, then revisit regularly",
    summary:
      "A room-by-room safety check that makes space for exploration while reducing preventable hazards.",
    sections: [
      section(
        "Look from the floor upwards",
        "Start in the room where your baby spends the most time. Secure furniture that can tip, keep blind cords inaccessible and remove small objects, button batteries and magnets. Check windows and stairs, using appropriate barriers installed as directed. Repeat the check as your child starts reaching, crawling and climbing; yesterday’s inaccessible shelf may not stay inaccessible.",
      ),
      section(
        "Check kitchens, bathrooms and sleeping spaces",
        "Lock medicines, cleaning products and sharp tools away; high shelves alone may not be enough. Keep hot drinks and pan handles out of reach. Stay within arm’s reach around water and empty containers after use. Keep the baby’s sleep space clear, with a firm flat mattress and no loose pillows or soft toys. Follow local electrical safety guidance and choose appropriate protective equipment.",
      ),
      section(
        "Make shared spaces everyone’s job",
        "Ask visitors to keep bags, medicines and coins out of reach. Do a brief floor sweep after older children play, and show other caregivers how gates and locks work. At another home, create one manageable safe area first. No checklist makes supervision unnecessary, but a thoughtful environment means fewer urgent interruptions and more room for your baby to explore. Review product recalls and replace damaged safety equipment.",
      ),
    ],
    sources: [
      source(
        "AAP: home safety guidance",
        "https://www.healthychildren.org/English/safety-prevention/at-home/Pages/home-safety-heres-how.aspx",
      ),
    ],
  },
  {
    slug: "baby-gestures-and-pointing",
    category: "Communication",
    title: "Baby Gestures and Pointing: Early Ways Babies Share Meaning",
    age: "Later infancy onwards",
    summary:
      "Notice, answer, and gently encourage gestures as part of your baby’s early communication.",
    sections: [
      section(
        "Treat small signals as conversation",
        "A reach, a look towards an object or hands lifted to be picked up can be a way of sharing meaning. Follow what your baby seems interested in and put a few simple words alongside it: “You want the cup.” You do not have to know exactly what every gesture means; responding and allowing another turn keeps the exchange open.",
      ),
      section(
        "Model without making a test",
        "Wave when someone leaves, point to something interesting on a walk and show a familiar object while naming it. Pause rather than repeatedly asking your baby to copy. Looking at a picture book together gives you a chance to follow their attention instead of moving through every page. Use the languages that feel natural in your family.",
      ),
      section(
        "Bring observations to a conversation",
        "Notice how your baby combines looks, sounds and gestures across ordinary days. If you are concerned about communication, hearing or a loss of skills, share specific examples with a clinician. Milestone lists can help you describe what you see, but they cannot diagnose your child. The aim at home is a responsive conversation, not accumulating a required number of gestures.",
      ),
    ],
    sources: [
      source(
        "NHS: helping your baby learn to talk",
        "https://www.nhs.uk/baby/babys-development/play-and-learning/help-your-baby-learn-to-talk/",
      ),
    ],
  },
  {
    slug: "cause-and-effect-play",
    category: "Learning",
    title:
      "Cause and Effect Play for Babies: Simple Games That Invite Discovery",
    age: "Later infancy, adapted to your baby",
    summary:
      "Safe drop, fill, shake, and repeat games that give a curious baby room to discover what happens next.",
    sections: [
      section(
        "Begin with one safe action",
        "Choose a large baby-safe object and an unbreakable container. Show how the object goes in, then offer it to your baby. They may put it in, mouth it, drop it or watch you instead. Keep all pieces too large to choke on, inspect them for damage and stay close. One object is enough to make a satisfying experiment.",
      ),
      section(
        "Let repetition do its work",
        "A baby who drops the same toy again may be exploring what happens, not trying to annoy you. You can name the action once, return the object and allow another turn. If repeated picking up is tiring, move the game onto a floor mat where you can both reach. Change just one feature, such as the container, when interest fades.",
      ),
      section(
        "Follow interest, not performance",
        "Try softly tapping two suitable objects or rolling a large soft ball a short distance. Leave pauses for your baby’s own action, and stop if they look away or become frustrated. These games offer exploration; they do not prove a developmental level or guarantee faster learning. If you have a concern about movement or interaction, bring it to a clinician alongside examples from everyday life.",
      ),
    ],
    sources: [
      source(
        "CDC: nine-month development and play ideas",
        "https://www.cdc.gov/act-early/milestones/9-months.html",
      ),
    ],
  },
  {
    slug: "object-permanence-games",
    category: "Learning",
    title: "Object Permanence Games for Babies: Peekaboo and Beyond",
    age: "Later infancy",
    summary:
      "Peekaboo and hide-and-find games that support curiosity without rushing a milestone.",
    sections: [
      section(
        "Start with yourself",
        "Hide your own face briefly behind your hands, then reappear with a familiar greeting. Keep the pause short and watch whether your baby enjoys it. Avoid putting cloth over their face or leaving loose fabric in a sleep space. Some babies prefer a very predictable game, and some are not interested today; both responses are useful information.",
      ),
      section(
        "Make finding easy",
        "Place a familiar, large toy partly behind another safe object while your baby watches. Leave enough visible to invite attention, and reveal it together. Later, you can hide a little more. There is no need to withhold the toy until your baby performs a particular action. The shared surprise can be enjoyable even when you do most of the finding.",
      ),
      section(
        "Use ordinary departures kindly",
        "A game is not training for being left alone. When you need to leave your baby with a caregiver, use a predictable goodbye and a thoughtful transition. Keep hide-and-find play short, supervised and separate from sleep. If your baby becomes upset, bring yourself or the toy back into view and offer comfort. Curiosity grows best when the experience stays manageable.",
      ),
    ],
    sources: [
      source(
        "CDC: nine-month development and play ideas",
        "https://www.cdc.gov/act-early/milestones/9-months.html",
      ),
    ],
  },
  {
    slug: "outdoor-activities-for-babies",
    category: "Play",
    title: "Outdoor Activities for Babies: Simple Ways to Explore Together",
    age: "Birth onwards, with suitable protection",
    summary:
      "Easy outdoor ideas for curiosity, connection, movement, and a calmer family rhythm.",
    sections: [
      section(
        "Make the outing small",
        "A shaded doorway, a short walk or a few minutes on a clean mat can be enough. Describe one thing you notice, such as leaves moving or a bird calling, and pause. You do not need a destination or special equipment to share the world with your baby. Choose a time and place that feels manageable for you as well.",
      ),
      section(
        "Plan for the conditions",
        "Check heat, air quality and weather before leaving. Use shade, suitable clothing and age-appropriate sun protection; keep young babies out of direct sun. Never cover a pram with a blanket that traps heat or blocks airflow. Bring the feeding supplies your baby needs and return indoors if either of you is uncomfortable. Avoid making outdoor time a goal to meet in unsafe conditions.",
      ),
      section(
        "Keep exploration within reach",
        "Inspect the ground for sharp objects, animal waste and small choking hazards. Let your baby look and touch safe things with you, while preventing leaves, stones and soil from going into their mouth. Stay within reach around water, roads and animals. On returning home, notice what held their attention; that one familiar detail can become the starting point for another simple outing.",
      ),
    ],
    sources: [
      source(
        "AAP: sun safety for babies and children",
        "https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Sun-Safety.aspx",
      ),
    ],
  },
  {
    slug: "baby-massage-guide",
    category: "Connection",
    title: "Baby Massage Guide: Gentle Touch, Cues, and Simple Routines",
    age: "Ask for individual advice for medical or skin concerns",
    summary:
      "A small, cue-led routine for calm moments, with clear signs to pause or stop.",
    sections: [
      section(
        "Invite, rather than begin automatically",
        "Choose a warm, calm place and a time when your baby is awake and comfortable, not hungry or just after a large feed. Wash your hands, remove jewellery and tell your baby what you are about to do. Start with a still hand on a leg and watch the response. Turning away, stiffening or crying is a reason to pause, not something to work through.",
      ),
      section(
        "Keep touch light and the routine short",
        "Try a few gentle strokes on a leg or arm, keeping your baby supported on a safe surface. Avoid strong pressure, stretching or manipulating joints. You do not need scented products or essential oils. Ask a clinician about suitable products if there are skin problems or medical needs, and stop if irritation appears. A minute of comfortable contact is enough.",
      ),
      section(
        "Let the baby end it",
        "Finish while your baby is comfortable, or sooner if they have had enough. Wrap up with ordinary care, such as getting dressed or having a cuddle. Massage is optional shared time, not a treatment for illness or a promise of better sleep. If your baby appears in pain, has a rash you are worried about or is unwell, get clinical advice rather than trying to massage the problem away.",
      ),
    ],
    sources: [
      source(
        "NHS Norfolk: baby massage",
        "https://www.justonenorfolk.nhs.uk/pregnancy-early-days/new-baby/baby-massage/",
      ),
    ],
  },
  {
    slug: "baby-diaper-rash-prevention",
    category: "Baby Care",
    title: "Baby Diaper Rash Prevention: Gentle Everyday Care",
    age: "Babies wearing nappies",
    summary:
      "Gentle diaper care for everyday comfort, with signs that deserve a clinician’s advice.",
    sections: [
      section(
        "Keep changes gentle and frequent",
        "Change wet or soiled nappies promptly. Clean with water or suitable fragrance-free, alcohol-free wipes, and pat the skin dry rather than rubbing. Keep your supplies within reach before starting so your baby is never left alone on a raised surface. A change on a safe floor mat can be easier when your baby becomes more mobile.",
      ),
      section(
        "Reduce rubbing and trapped moisture",
        "Check that the nappy fits comfortably. A little nappy-free time on a washable mat may help when it is practical and supervised. Ask a pharmacist about a suitable barrier product and use it as directed. Avoid talc, antiseptics and strongly scented products. Trying several new products at once makes it harder to notice what is helping or irritating the skin.",
      ),
      section(
        "Know when home care is not enough",
        "Seek advice if the rash worsens, spreads, is very painful or does not improve with gentle care. A baby with fever or who seems unwell needs prompt clinical advice. Not every rash is simple irritation, and some need specific treatment. Take note of when it started and any new products or medicines, so you can give the clinician a clear account without having to remember everything in the moment.",
      ),
    ],
    sources: [
      source(
        "NHS: nappy rash care and when to seek help",
        "https://www.nhs.uk/baby/caring-for-a-newborn/nappy-rash/",
      ),
    ],
  },
  {
    slug: "starting-daycare-with-baby",
    category: "Family Life",
    title: "Starting Daycare With a Baby: A Gentle Transition Plan",
    age: "Babies starting childcare",
    summary:
      "A calm plan for first days, familiar routines, short goodbyes, and communication with caregivers.",
    sections: [
      section(
        "Share the details that help",
        "Before the first day, tell the caregiver how your baby shows hunger, tiredness and a need for comfort. Share feeding arrangements, safe sleep needs, allergies and emergency contacts through the setting’s agreed process. Ask how they settle an upset baby and how updates will reach you. A brief written note can be more useful than trying to explain everything at a busy drop-off.",
      ),
      section(
        "Build a predictable handover",
        "Where possible, arrange familiarisation visits and a gradual start with the setting. Choose a short goodbye phrase and use it consistently. Let your baby see that you are leaving rather than slipping away unnoticed. A familiar object may help if the setting allows it, but keep unsafe loose items out of infant sleep spaces. Agree who takes over so the handover feels clear.",
      ),
      section(
        "Review the whole day",
        "Ask about feeding, rest and moments of engagement, not only whether there were tears at goodbye. Reconnection at home can be simple: a cuddle, a quiet feed or time together on the floor. If distress remains intense or the setting cannot respond to your concerns, arrange a fuller conversation. Transitions affect parents too; leave a little space for your own feelings and practical support.",
      ),
    ],
    sources: [
      source(
        "NHS: separation anxiety and support",
        "https://www.nhs.uk/baby/babys-development/behaviour/separation-anxiety/",
      ),
    ],
  },
  {
    slug: "baby-first-tooth-care",
    category: "Oral Care",
    title: "Baby First Tooth Care: Brushing, Feeding, and First Dental Visits",
    age: "From the first tooth",
    summary:
      "A gentle routine for first teeth, bedtime brushing, and planning your baby’s first dental visit.",
    sections: [
      section(
        "Start when the first tooth appears",
        "Use a small soft toothbrush and a smear of fluoride toothpaste for a child under three. NHS guidance recommends at least 1,000 ppm fluoride; check the label and ask your dentist about individual needs. Brush twice daily, including last thing at night. An adult should do the brushing and keep toothpaste out of reach.",
      ),
      section(
        "Make the routine familiar",
        "Choose a position where your baby is supported and you can see the teeth. Use a short song or the same simple words each time. If they resist, pause and try a calmer approach rather than using force. Letting them hold a second brush may make the moment less unfamiliar, while you remain responsible for cleaning. Avoid sweetened drinks and do not put sugary foods into a bottle.",
      ),
      section(
        "Introduce dental care early",
        "Arrange a dental visit when teeth begin to appear, following local availability and your dentist’s advice. Ask about brushing technique, fluoride and feeding patterns without feeling you need perfect habits before attending. Pain, swelling, a damaged tooth or concern about decay deserves assessment. Keeping a small daily routine and having somewhere to ask questions is more useful than waiting until a problem becomes obvious.",
      ),
    ],
    sources: [
      source(
        "NHS: looking after baby teeth",
        "https://www.nhs.uk/baby/babys-development/teething/looking-after-your-babys-teeth/",
      ),
    ],
  },
];
// Editorial byline, related reading and source-link update; not a clinical review date.
export const ARTICLE_UPDATED = GUIDE_UPDATED > '2026-10-20' ? GUIDE_UPDATED : '2026-10-20';
export function readingMinutes(article: Article) {
  return Math.max(
    1,
    Math.ceil(
      article.sections
        .map((s) => s.body)
        .join(" ")
        .split(/\s+/).length / 180,
    ),
  );
}
