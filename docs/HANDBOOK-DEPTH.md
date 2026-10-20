# Handbook depth: seven age layers

20 October 2026. This follows the owner's review request after the [Handbook and Ask](HANDBOOK-AND-ASK.md) release. Clinical status: **unreviewed** (see [CLINICAL-REVIEW.md](CLINICAL-REVIEW.md)).

## Why

The first Handbook had one card per topic for each of three wide bands: 3–5, 6–12 and 13–17. A 6-year-old and a 12-year-old got the same phone conversation, and a 13-year-old and a 17-year-old got the same consent conversation. Under-threes had four cards in total. "Coming up next" only appeared at the edge of these long bands. The owner's research atlas also named topics the Handbook did not cover: bullying, image-based threats, what teenagers see online, relationships, first money accounts, low mood and the handover at 18.

## What changed

- **Seven layers:** under 1, 1–2, 3–5, 6–8, 9–12, 13–15 and 16–17. From age 1, every layer has at least one conversation in each of the ten tracks. A few layers carry two cards in a track where the topic needs it (for example 13–15 school and safety).
- **Existing cards:** all 34 keep their IDs, text and saved progress. Sixteen have narrower age windows. A saved card outside the current window still shows the existing "from another age range" note.
- **33 new authored cards, 67 total:**

  | Layer | New cards |
  |---|---|
  | Under 1 | Home-language talk and song; a two-adult plan for crying that will not stop (including the no-shaking line) |
  | 1–2 | One per track: correct body names, "not today" at the shop, "I won't let you hit", shared reading, the stop game, video endings, side-by-side play, the same words from every caregiver, tooth brushing, "me do it" |
  | 3–8 | Goodnight words about today: an awake, specific bedtime ritual |
  | 6–8 | Where babies come from; hello before homework; choosing the stopping point |
  | 9–12 | Wants vs needs and in-game buys; mixed feelings; online requests for photos or meetings; bullying that keeps happening; fair is not always the same; not commenting on bodies; a first small trip alone |
  | 13–15 | Subject and stream choice; image-based threats (cybercrime.gov.in, 1930); what they may have seen online; cooking one meal |
  | 13–17 | Low mood that lasts (Tele-MANAS 14416, 112) |
  | 16–17 | Respect in relationships; a first account and budget; friends you worry about; getting ready for eighteen; speaking for themselves at the doctor |

- **Age labels:** "Under 1 year" replaces "0–0 years".

## The owner's bedtime-affirmation request

The owner asked for nightly empowering statements to a child, based on NLP sleep-suggestion practice. The constitution already forbids claiming that sleep-time messages teach values. The "Goodnight words about today" card keeps the owner's intent in a form the evidence supports. The parent says it at tuck-in, while the child is still awake, and names one real thing they noticed that day. It ends with an unconditional line: "I love you on good days and on hard days." The card leaves out whispering while the child sleeps and identity labels such as "good girl".

## Verification

- `npm run check`: lint, TypeScript, and all 107 unit and server tests pass. New tests cover:
  - distinct cards for ages 6, 11, 14 and 17
  - every track present from 12 months
  - a "coming up next" item in the final year of each layer
  - the new age labels
- `scripts/verify-handbook-render.tsx` passes for ages 1, 4, 11 and 16.
- `npm run build` passes.
- No schema changes, migrations or data writes.
- Sources are reused from the existing reviewed list; no new URLs were added.

## Limits

These are editorial examples written from the owner's research and the existing source list. They are not clinically reviewed. The safeguarding cards (crying plan, image threats, low mood, online requests, bullying) should be first in the clinical-review packet.
