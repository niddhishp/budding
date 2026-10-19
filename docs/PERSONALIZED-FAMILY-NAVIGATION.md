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

Pending hosted CI, additive production migration, deployment and live visual verification.
