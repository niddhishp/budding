## What and why

<!-- One paragraph: what parents or the team will notice, and why. -->

## Safety and data checklist

- [ ] No parenting text is shown before safety triage and the content checks (see docs/ARCHITECTURE.md, "Invariants").
- [ ] Nothing new diagnoses, suggests physical punishment, or shames. Hindi and Hinglish are covered by the lint.
- [ ] New family tables: RLS "own read", writes only through a consent- and ownership-checked function, and either exported or excluded with a reason in `src/lib/family-export.ts`.
- [ ] Migrations are additive and numbered. Edits to existing functions use the guarded text replacement.
- [ ] Admin metrics stay aggregate, with figures from fewer than 5 families suppressed.

## Verification

- [ ] `npm run check`
- [ ] Disposable database suite and route-handler tests
- [ ] Render check, build and SEO check
- [ ] Release record added in `docs/` and a line in `HANDOFF.md`
