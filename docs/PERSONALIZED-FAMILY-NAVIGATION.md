# Personalised family navigation

## Scope

- Safety, Your Space, Gifts and Play are first-class desktop navigation destinations, removed from Discover. Mobile retains Today, Plan, Decode and Child, with an accessible Menu dialog for all sections. Desktop navigation and the family selector scroll independently on short screens.
- Puberty receives a “For this age” menu highlight from the eighth birthday until the eighteenth. This is an editorial preparation/support window, not a diagnosis. Today and Child use the same eligibility rule.
- Stories stays in primary navigation until the thirteenth birthday. The Child profile always retains its story library for born children; saved stories and generation are preserved for older children. Age 13 is a product navigation choice, not a developmental claim.
- A nullable `children.puberty_guide` stores an explicit girls/boys educational preference. Existing profiles remain null; nothing is inferred from a name, growth-chart sex or medical information. One tap in Puberty saves the choice; Edit profile can change or clear it. Shared material remains available, while the other path is excluded. This field is not used by growth, health, AI prompts or commerce.
- Safety and puberty conversation ages start with the selected child's age. Reading another age is temporary. Switching children remounts guide state and exits inappropriate age-specific destinations.
- Five original low-preparation activities give older children meaningful Play choices: comics, rhythm, a paper robot, a soundtrack and an observation walk. Existing saved activities are preserved.

## Data and validation

Migration `022_child_guide_profile.sql` was created with the Supabase CLI and moved into the repository's numbered migration convention. It adds one nullable constrained column, retaining existing owner and consent RLS. No backfill or removal. Old application versions ignore it.

Local checks: lint, TypeScript, 82 unit/server tests, fresh schema bootstrap, database security/consent/isolation/regression checks, provider signature/concurrency checks, actual shop/family/photo route-handler tests, and Next production build passed. New tests cover birthday boundaries, unknown/future DOB, pregnancy, guide filtering, profile mapping, cross-family/anonymous/unconsented writes, invalid values, editing/clearing choices and unrelated-field preservation.

Provider transport remains mocked in automated tests; no messages, purchases or charges are sent. No production test family records should be created for visual verification. Current preview authentication configuration is absent, so authenticated verification uses disposable SQL and the production session.

## Release evidence

Deployed 2026-10-19. Application commit `511b6ee63046be5526ff33662046084e7ae4e560` on main. Exact-commit branch CI `39203948985` and main CI `39204174385` succeeded. Vercel production `dpl_75YPyH34XvUsPar1nq8hezWDae9T` is Ready on both `www.kahiye.app` and `kahiye.app`. Protected preview homepage returned 200. Local final production build also passed.

Migration 022 applied with a transaction, lock/statement timeouts, advisory migration lock and before/after fingerprints of existing public application, auth users/identities/sessions and storage-object rows. All fingerprints matched (excluding the newly added null column and migration ledger). A separate disposable database containing an existing family profile also passed this exact migration wrapper. The migration ledger and existing owner RLS were confirmed afterwards. All existing guide preferences remain unset, including after live verification.

Live checks: desktop direct Puberty/Safety/Your Space/Gifts/Play destinations; Advika's 11–13 guide default and age badge; six age-relevant Play invitations; promoted tools absent from Discover; Child's retained story-library link; editable girls/boys/choose-later profile field; cancelling an unsaved girls' selection preserved the existing unset state. No production preferences, profiles, stories, plans or activities were saved by the agent. Actual preference persistence and tenant isolation were exercised in disposable SQL, rather than by altering a real child's profile.

Phone viewport 390×844: all menu destinations visible in a scrollable dialog, Puberty highlighted, direct Play selection closes the dialog, close returns focus to Menu, and no horizontal overflow. Desktop navigation does not overlap the child selector. No Kahiye browser console errors. Public home/articles returned 200; anonymous care/shop-media/stories endpoints returned 401. Original user tab untouched; temporary verification tab closed and viewport reset.

Screenshots: `C:/Users/Admin/.codex/visualizations/2026/10/17/01a14a81-9a08-7f22-ab03-d2a79055ac2f/family-navigation-desktop.png` and `family-navigation-mobile.png` in the same folder.

Database advisors were checked: existing public-schema extensions, disabled leaked-password protection, RLS planning and index notices remain outside this additive change. Service-only tables intentionally have no client RLS policies. Follow the existing security backlog; [extension guidance](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and [RLS planning](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan). No new table, policy, index or provider configuration was introduced.

Rollback: redeploy the previous application commit and leave the nullable column and any parent-saved preferences intact. Do not drop or backfill child data. Clinical/safeguarding review remains pending, as disclosed in the guides.
