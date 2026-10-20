# Parent moments: sharing, Ask, Today and trust

20 October 2026. This work follows the owner's decisions after reading the market research, the investor deck, the persona critique and the leader-lens review. The launch cohort is ages 3–8. Hindi sharing gets a free monthly quota. The horoscope gets the hide-bug fix only. All of the next builds were prioritised by the CTO. Data export and outcome metrics are built separately; see FAMILY-EXPORT.md and PARENT-OUTCOME-METRICS.md once merged.

## What changed for parents

**Sharing in the family's language (migration 026).**
- Before, a Free family could share only in English, and Hindi or other languages hit a paywall while checkout was closed. That was the homepage's showpiece, and nobody could use it.
- Free families now get **5 messages per rolling 30 days** in Hindi and the 8 other languages (`FREE_TRANSLATED_SHARES_PER_MONTH`). English stays free and Plus has no monthly limit. Plus's existing daily cap of 20 shares is unchanged.
- The share sheet opens in the child's home language and shows how many messages are left.
- The server counts only completed non-English shares, which now record `share_language`, and refuses the sixth before reserving anything or calling a model.
- **Limit:** two concurrent requests could exceed the quota by one, which is acceptable for a soft allowance.

**Ask, the in-the-moment answer.**
- The page scrolls to the answer when it arrives, and to a saved answer when one is opened.
- "Send the same words to grandparents or caregivers" now sits directly under "Say this". It only appears for ordinary guidance, which is the only kind the server allows sharing for.
- "Avoid" becomes "Leave out", in calm paper styling instead of error red, matching the Handbook.
- The parent's own text moves below the answer, as a collapsible "Your moment".
- The "turns left" line moves below the answer area. Near the input, a note appears only when one or no free turns remain.
- Status wording is now "Reading what you shared…" and then "Finding the words, and checking them for you…".
- Voice input listens in the child's first non-English home language (for example `hi-IN`), with a one-tap switch to English. Before, it followed the phone's language.
- The frosted-glass text box is now solid, since `.impeccable.md` lists glassmorphism as an anti-reference.

**Today.**
- The header line becomes the promise: "The words to say, when it matters."
- A new **"How did it go?"** card appears a few hours to a week after ordinary guidance that has no rating yet. It offers one tap (It helped, Partly, Not this time) or "Didn't get to try it", which hides the card in that browser. A rating uses the existing outcome route and memory rules.
- Safety, puberty, play, family dates and savings, Room for you, Growth at a glance and "Something you shared" move into one quiet **"More for {name}"** list. Nothing is removed.
- Time-bound items stay where they were: family dates, birthday (with gifts and shop), health reminders and the horoscope.

**Horoscope.** The Child page now respects "Hide". Once hidden it shows only a "Show the just-for-fun horoscope" button. Today is unchanged: on by default, hideable.

**Trust.** A visible "How Kahiye writes this guidance" panel now sits at the top of the Handbook and under every Ask answer. It covers:
- AI-assisted drafts from linked sources
- automatic checks before an answer is shown
- urgent routing
- the independent review that hasn't happened yet
- a link to /editorial

**Public site.**
- Homepage eyebrow: "For parents of children aged 3 to 8".
- Homepage headline: "The words for the shoe rack, the park and the bedtime fight."
- The supporting line now mentions caregiver sharing in Hindi, Tamil and seven more languages, and the pregnancy-to-18 span.
- Article pages end with "Facing this with your child?", with a call to action into Ask, instead of "Return to your family space".

## Verification

- **`npm run check`:** lint, TypeScript, and all 109 unit and server tests pass.
- **Disposable database:** a fresh bootstrap through migrations 025 and 026 passes all 17 suites. A new check rejects `share_language` on anything but a share.
- **Route handlers against real SQL** (4 suites pass). A Free family with five Hindi shares this month is refused (402), with no model call and no new reservation. Once those shares are older than 30 days, the request passes the allowance check.
- **Provider routes and race suites** pass.
- **Real-component render check** for ages 1, 4, 11 and 16 now also asserts the Today promise line, the "More for" grouping, and no more than four emphasised links.
- **`npm run build`** passes, as does the SEO build check (41 public pages).
- **The homepage at 390px**, checked on a local production server, keeps the call to action on the first screen.
- **Not verified:** the signed-in screens were checked by rendering the real components, not in a signed-in browser. No real family data was used.

## Rollback

Revert the application commit. Migration 026 can stay, since it's a nullable column and index. With the old code the share route ignores it, and non-English sharing becomes Plus-only again.
