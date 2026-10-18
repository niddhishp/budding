# BMI interpretation and optional sun-sign reflection

18 October 2026. No database migration or provider activation.

## Changes

- Today, Child and growth history share an age/reference-aware BMI explanation. Interpret unrounded z values, preserve existing incomplete/unsupported-record guards, and distinguish the healthy-weight reference range from overall health. Outside-range results invite measurement checks and an appropriate clinician review; no diets, target weights or product recommendations.
- Child shows the conventional Western sun sign calculated from the existing birth date. The user explicitly selected a simple date-based sign, not a Vedic birth chart. Calendar boundaries are approximate.
- Daily reflection is optional per child, off by default, with a labelled browser-local preference. It can be enabled in Child and hidden from Today. Authored reflections rotate by India-calendar day. They are entertainment/reflection, not predictions, and do not feed health, talent, financial or product guidance.
- No family record is rewritten. No additional birth data, AI call, outbound message or tracking service is introduced. The preference does not sync between devices.

## Verification

- `npm run check`: lint, TypeScript, 41 unit tests and 21 server tests passed (62 total). Added coverage for BMI percentile boundaries, extreme/unsupported cases, all sun-sign boundaries, leap dates, future/invalid dates and stable daily rotation.
- `npm run build`: passed. Existing non-blocking Browserslist freshness and ESLint Next-plugin notices remain.
- [GitHub CI 39104361533](https://github.com/niddhishp/budding/actions/runs/39104361533) passed for code `49747f1cd323c489748520cc00ef79db44c07253`, including disposable SQL security checks, provider integration checks and production build. Main was fast-forwarded only after this passed.
- React review: stable external-store subscription and server snapshot, listener cleanup, child-keyed state, accessible checkbox, visible storage failure, no effect-triggered state synchronisation, plain-text output and shared growth component.
- No local Next server was started; the previously recorded automatic-review restriction was respected. No new persistence handler was introduced.

## Earlier failed notification

Run `39101528105` at `5be6b7e` failed on the CDC BMI source-file checksum after Git normalised CSV line endings. Commit `f577a0e` preserves those source bytes through `.gitattributes`; later CI passed. The old SHA is an ancestor of main, and the subsequent fixes and daily-guidance release were already deployed. This was a failed verification run, not missing application changes.

## Production verification

- Vercel deployment `dpl_9Kbwahkx8KqYsS9Qamqecwj4gDXf` is Ready, exact code SHA `49747f1cd323c489748520cc00ef79db44c07253`, at https://budding-onqz26sb5-reactic.vercel.app. Both www.kahiye.app and kahiye.app aliases verified.
- Signed-in Today and Child rendered the existing measurement with the new healthy-weight reference explanation. No growth or profile values were changed.
- Child calculated the expected sign. The preference started off, enabling it displayed the single line in Today, reload retained it, and Hide horoscope removed it and restored the unchecked Child preference. The original off state was restored after verification. Only the browser-local preference was exercised.
- Desktop 1280×720 and mobile 390×844 inspected. Mobile document width/scroll width were both 390; main width/scroll width both 382. No horizontal overflow or captured browser errors. Temporary viewport reset and verification tab closed; original user tab retained.
- Screenshots: `kahiye-sun-sign-live.png` and `kahiye-bmi-guidance-mobile.png` in the task visualization directory. The horoscope screenshot shows the enabled test preview; the preference was subsequently returned to off.
- No production database writes, migrations, provider sends or transactions. A rollback affects presentation only and leaves family data intact.

## Planned next programme

The family overview, savings planner, gifting, curated shop and referral operations are proposed in [Family planning and trusted referrals](FAMILY-PLANNING-AND-REFERRALS.md). They are not implemented by this release. Existing payment/provider launch gates still apply.
