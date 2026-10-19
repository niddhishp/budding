export const GUIDE_UPDATED = "2026-10-19";
export const GUIDE_BANDS = [
  "0–4 years",
  "5–7 years",
  "8–10 years",
  "11–13 years",
  "14–17 years",
] as const;
export type GuideBand = (typeof GUIDE_BANDS)[number];
export function guidesForProfile(topic: 'puberty' | 'safety', band: GuideBand | null, path?: 'girls' | 'boys' | null) {
  return PARENT_GUIDES.filter(g => g.topic === topic && band && g.bands.includes(band) && (topic === 'safety' || g.path === 'all' || g.path === path));
}
export function guideBand(months: number | null): GuideBand | null {
  if (months === null || months < 0 || months >= 216) return null;
  return GUIDE_BANDS[
    months < 60 ? 0 : months < 96 ? 1 : months < 132 ? 2 : months < 168 ? 3 : 4
  ];
}
const sources = {
  girls: {
    title: "AAP: physical development in girls",
    url: "https://www.healthychildren.org/English/ages-stages/gradeschool/puberty/Pages/Physical-Development-Girls-What-to-Expect.aspx",
  },
  boys: {
    title: "AAP: physical development in boys",
    url: "https://www.healthychildren.org/English/ages-stages/gradeschool/puberty/Pages/Physical-Development-Boys-What-to-Expect.aspx",
  },
  periods: {
    title: "NHS: starting periods",
    url: "https://www.nhs.uk/conditions/periods/starting-periods/",
  },
  pain: {
    title: "NHS: period problems",
    url: "https://www.nhs.uk/conditions/periods/period-problems/",
  },
  timing: {
    title: "NHS: early or delayed puberty",
    url: "https://www.nhs.uk/conditions/early-or-delayed-puberty/",
  },
  body: {
    title: "NSPCC: talking about body safety",
    url: "https://www.nspcc.org.uk/advice-for-families/pants-underwear-rule/",
  },
  grooming: {
    title: "NSPCC: recognising grooming",
    url: "https://www.nspcc.org.uk/keeping-children-safe/types-of-abuse/grooming/",
  },
  friends: {
    title: "AAP: supporting friendships",
    url: "https://www.healthychildren.org/English/family-life/power-of-play/Pages/what-parents-can-do-to-support-friendships.aspx",
  },
  substances: {
    title: "AAP: talking about drugs and alcohol",
    url: "https://www.healthychildren.org/English/ages-stages/teen/substance-abuse/Pages/Talk-to-Your-Teen-About-Drugs-And-Keep-Talking.aspx",
  },
};
export type ParentGuide = {
  slug: string;
  topic: "puberty" | "safety";
  path: "all" | "girls" | "boys";
  bands: readonly GuideBand[];
  title: string;
  summary: string;
  explain: string;
  say: string;
  practice: string;
  scenario: string;
  response: string;
  care: string;
  sources: { title: string; url: string }[];
};
export const PARENT_GUIDES: ParentGuide[] = [
  {
    slug: "before-puberty-small-conversations",
    topic: "puberty",
    path: "all",
    bands: ["0–4 years", "5–7 years"],
    title: "Before puberty: make questions welcome",
    summary:
      "Build a language for bodies, privacy and growing up, without a big serious talk.",
    explain:
      "For babies, this is a caregiver habit: explain care gently. As language grows, use accurate body-part names, including penis and vulva. Older children can hear that puberty means bodies gradually change towards adulthood. There is no need to describe every change at once.",
    say: "“You can ask me about any part of your body. If I don’t know, we can find a good answer together.”",
    practice:
      "Choose an ordinary moment, such as getting ready for a bath. Ask what they wonder about growing up; answer the actual question in one or two sentences.",
    scenario: "Your child asks a body question in front of relatives.",
    response:
      "“That is a good question. Let’s find a quiet place to talk.” Follow through, without laughing or making the question feel shameful.",
    care: "Age bands organise conversations; they do not predict physical development. Ask a clinician about changes that seem unusually early or cause concern.",
    sources: [sources.body, sources.timing],
  },
  {
    slug: "girls-puberty-first-changes",
    topic: "puberty",
    path: "girls",
    bands: ["8–10 years"],
    title: "Girls: getting ready for first changes",
    summary: "Breast changes, body hair and a calm introduction to periods.",
    explain:
      "Breast development often begins between 8 and 13. One side may start first and feel tender. Hair, sweat and body shape can change too. These are possibilities, not a checklist to inspect. A period is blood and tissue leaving the uterus through the vagina; it is not an injury or something dirty.",
    say: "“Your body has its own pace. You don’t have to compare it with anyone else’s. Would you like me to explain periods now, or find a book together?”",
    practice:
      "Offer comfortable underwear or a first bra if wanted. Put a pad and spare underwear in a small school pouch; explain where to ask for help.",
    scenario: "“Everyone will notice my body changing.”",
    response:
      "Acknowledge the worry. Offer choices about clothing and who they talk to; do not announce their changes to family.",
    care: "Ask a paediatrician about breast changes before 8, absent pubertal changes by 13, or any persistent pain or worry.",
    sources: [sources.girls, sources.periods],
  },
  {
    slug: "first-period-school-plan",
    topic: "puberty",
    path: "girls",
    bands: ["11–13 years"],
    title: "Girls: a period plan for school and home",
    summary:
      "Practical preparation for menstruation, leaks, comfort and asking for help.",
    explain:
      "First periods vary in timing and may look brown or red. Early cycles may be irregular. Explain how to use the chosen product, wash hands before and after changing it, and follow its instructions. Pads go in a bin, not the toilet. A leak is a laundry problem, never a character flaw.",
    say: "“If your period starts at school, you can ask your trusted teacher for the pouch. You can call me too. There is nothing to be embarrassed about.”",
    practice:
      "Let your child practise opening a pad and attaching it to spare underwear. Agree a discreet way to ask for supplies and keep them easy to reach at home.",
    scenario: "They want to skip school because of cramps.",
    response:
      "Listen to the pain rather than assuming avoidance. Offer comfort and ask a clinician about suitable treatment if pain disrupts normal activities.",
    care: "Seek medical advice for heavy bleeding, such as soaking products every 1–2 hours, or pain affecting daily life. Fainting or severe illness needs urgent care.",
    sources: [sources.periods, sources.pain],
  },
  {
    slug: "teen-girls-periods-privacy",
    topic: "puberty",
    path: "girls",
    bands: ["14–17 years"],
    title: "Girls: periods, privacy and taking charge of care",
    summary:
      "Help a teenager notice concerns and ask for care without monitoring every detail.",
    explain:
      "Offer a private paper record of period dates and symptoms if your teen finds it useful. Ask permission before looking at it. Do not use cycle dates to guess fertility or diagnose a condition. Make space for confidential questions with a qualified clinician.",
    say: "“Would you like help booking an appointment, or would you rather explain your questions yourself? I can support you either way.”",
    practice:
      "Together, make a practical plan for supplies on trips, sport days and exams. Let your teen choose what help they want.",
    scenario: "“I thought pain was just something I had to put up with.”",
    response:
      "Reassure them that disruptive pain deserves care. Help write down the symptoms and book an appointment.",
    care: "Arrange a medical review if periods have not started by 15, or by 13 without other signs of puberty. Heavy bleeding, persistent pain or periods stopping with concern also deserve review.",
    sources: [sources.periods, sources.pain],
  },
  {
    slug: "boys-puberty-preparing",
    topic: "puberty",
    path: "boys",
    bands: ["8–10 years"],
    title: "Boys: preparing without comparison",
    summary:
      "Introduce body changes, hygiene and privacy before they become a surprise.",
    explain:
      "Puberty can bring testicle and penis growth, body hair, increased sweat and later a deeper voice. Changes do not arrive in one fixed school year. Introduce the words without asking to inspect your child’s body.",
    say: "“Growing up happens at different speeds. You can ask me anything privately, and we can ask a doctor if something worries you.”",
    practice:
      "Give them a say in a simple wash-and-clean-clothes routine. Knock before entering a room where they change, and expect others to do the same.",
    scenario: "A relative jokes that they are still “a little boy”.",
    response:
      "End the comparison calmly: “We don’t measure growing up against other people.” Check in with your child later.",
    care: "Bring unusually early changes, pain or concerns about development to a paediatrician.",
    sources: [sources.boys, sources.timing],
  },
  {
    slug: "boys-voice-wet-dreams",
    topic: "puberty",
    path: "boys",
    bands: ["11–13 years"],
    title: "Boys: voice changes and unexpected moments",
    summary:
      "Plain words for voice breaks, erections and wet dreams, without teasing.",
    explain:
      "A voice may crack as it deepens. Erections can happen without a deliberate thought. Some boys release semen during sleep, called a wet dream; it is not bedwetting or wrongdoing. Not having wet dreams is not a test of development either.",
    say: "“Some changes can catch you by surprise. You haven’t done anything wrong. Clean clothes are here, and you can ask me privately.”",
    practice:
      "Make spare underwear and laundry access straightforward. Agree that body jokes are off limits at home.",
    scenario: "They are teased about their voice at school.",
    response:
      "Ask what happened and who could help. Practise “Leave it out” and a way to move towards a supportive friend or teacher.",
    care: "A clinician can answer concerns about timing or body changes. Do not ask for intimate photos or comparisons with classmates.",
    sources: [sources.boys, sources.friends],
  },
  {
    slug: "teen-boys-body-confidence",
    topic: "puberty",
    path: "boys",
    bands: ["14–17 years"],
    title: "Boys: body confidence and respectful independence",
    summary:
      "Make room for private questions, relationships and worries about being “behind”.",
    explain:
      "Comparison can make normal variation feel like failure. Keep conversations about comfort and wellbeing rather than size, muscles or masculinity. Growing physically does not remove a teenager’s need for guidance or emotional support.",
    say: "“You don’t have to prove you are grown up. What feels confusing right now? A doctor can also answer questions you’d rather not ask me.”",
    practice:
      "Offer time with a clinician for puberty and sexual-health questions. Discuss consent as freely chosen, specific and something anyone can change their mind about.",
    scenario: "A group says they must do something intimate to prove maturity.",
    response:
      "“You don’t owe anyone proof. You can leave, message me or ask another trusted adult for help.” Practise the exit together.",
    care: "If puberty seems delayed or development causes distress, arrange a paediatric review rather than judging from peers or online pictures.",
    sources: [sources.timing, sources.friends],
  },
  {
    slug: "body-safety-young-children",
    topic: "safety",
    path: "all",
    bands: ["0–4 years"],
    title: "Body safety begins with everyday care",
    summary:
      "Build body ownership through ordinary moments, without frightening a young child.",
    explain:
      "Explain nappy changes and washing. As understanding grows, teach names for body parts and offer choices about hugs. Avoid only “good touch” and “bad touch”: unsafe touch can feel confusing. Adults remain responsible for keeping children safe.",
    say: "“You can choose a wave instead of a hug. If a touch worries you, you can tell me, even if it is someone we know.”",
    practice:
      "Use a teddy to practise asking before a hug. For babies, practise respectful care yourself; there is no lesson or quiz for them to pass.",
    scenario: "A relative insists on a kiss.",
    response:
      "Step in: “A wave is fine.” Your action shows that the boundary has support.",
    care: "Care and medical help sometimes involve private parts; explain why and provide appropriate support. Secrecy, threats or coercion are never part of safe care.",
    sources: [sources.body],
  },
  {
    slug: "child-safety-check-first",
    topic: "safety",
    path: "all",
    bands: ["5–7 years"],
    title: "Check first, move away, find help",
    summary:
      "Practise what to do when someone asks a child to go somewhere or keep a worrying secret.",
    explain:
      "Teach a check-first rule before going with anyone, including someone familiar. Adults who need help can ask another adult. Avoid blanket rules that make children afraid to seek help when lost. Identify safe helpers and places together.",
    say: "“Check with me before going to a car, another room or a different place. You can say no to a request that feels wrong, even from someone older.”",
    practice:
      "Name several adults your child can approach. Rehearse staying in a visible place and asking a uniformed staff member for help if separated in a shop.",
    scenario: "“Come to my room to see a surprise. Don’t tell your parent.”",
    response:
      "Practise: “I need to check first.” Move towards a trusted adult and tell them. If the child could not leave or speak, it is still never their fault.",
    care: "Listen if a child shares a concern. Thank them, say you will help, and keep them away from the person or situation while seeking appropriate safeguarding support.",
    sources: [sources.body, sources.grooming],
  },
  {
    slug: "children-secrets-online-pressure",
    topic: "safety",
    path: "all",
    bands: ["8–10 years"],
    title: "Spot secrets, gifts and online pressure",
    summary:
      "Notice unsafe behaviour rather than relying on whether someone looks friendly.",
    explain:
      "Manipulation can come from someone known offline or through games and chats. Gifts, special attention or threats may be used to demand secrecy. A surprise has a happy ending that is soon shared; a secret that worries, pressures or isolates a child needs adult help.",
    say: "“A gift doesn’t mean you owe anyone a photo, a private meeting or a secret. If someone asks, you can tell me. I will help first.”",
    practice:
      "Walk through how to close a chat and reach a trusted adult. Agree not to move to private chats or meet an online contact without caregiver involvement.",
    scenario:
      "A gaming friend asks for a private photo in exchange for credits.",
    response:
      "Stop replying and tell a trusted adult. Help report the account. Do not download or forward intimate images of children.",
    care: "If a child has already shared something, avoid blame or threats to punish disclosure. Seek safeguarding support and keep the child safe from further contact.",
    sources: [sources.grooming],
  },
  {
    slug: "peer-pressure-preteens",
    topic: "safety",
    path: "all",
    bands: ["11–13 years"],
    title: "Belonging without giving in",
    summary:
      "Give a preteen usable words for dares, exclusion and pressure to vape or drink.",
    explain:
      "The need to belong can make a simple “no” difficult. Practise several exits instead of testing whether your child is strong enough. Friendship should leave room for disagreement, other friends and personal boundaries.",
    say: "“You can blame our family rule if that makes leaving easier. Message me our code word and I will help you get out.”",
    practice:
      "Rehearse three options: a short refusal, changing the activity, and leaving with a friend. Choose a real adult who will answer if you cannot.",
    scenario: "“Everyone is trying this vape. Don’t be boring.”",
    response:
      "“No thanks. I’m heading out.” Practise the line once, then the route to a safe adult or agreed pickup point.",
    care: "Ask calmly what they have seen or tried. Repeated threats, exclusion or pressure need adult support; the child should not have to manage it alone.",
    sources: [sources.friends, sources.substances],
  },
  {
    slug: "teen-safety-pressure-substances",
    topic: "safety",
    path: "all",
    bands: ["14–17 years"],
    title: "A way out of pressure, every time",
    summary:
      "Support safer decisions about substances, controlling relationships and difficult social situations.",
    explain:
      "State clear expectations about avoiding alcohol, nicotine and drugs while keeping help available. Manipulation can sound like “prove you love me”, demands for passwords, or threats to share private information. A relationship does not create an obligation to comply.",
    say: "“If you feel trapped, or you have already taken something, call me. Getting you safe comes first. We can talk about everything else afterwards.”",
    practice:
      "Agree a pickup plan, a backup adult and a code word. Discuss never riding with an impaired driver. Ask what makes refusal hardest in their own social circle.",
    scenario: "A friend is unresponsive after taking an unknown substance.",
    response:
      "Get emergency medical help immediately, stay with them if safe, and tell responders what is known. Do not leave them alone to sleep it off.",
    care: "Repeated substance use or difficulty stopping deserves qualified medical help, not shame. For threats or exploitation, help the teenager reach appropriate safeguarding support.",
    sources: [sources.substances, sources.grooming],
  },
];
