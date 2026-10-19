# Profile-driven puberty guidance

The parent requested Boy/Girl in the child profile and clarified that there must be no second guide choice. Add/Edit child now provides an optional Boy/Girl field. The profile displays the saved value. Puberty automatically chooses the corresponding content; the separate girls/boys guide buttons and save action are removed.

`children.gender` is nullable, constrained to `boy`/`girl`, and parent-supplied. Migration 023 is additive and leaves all existing rows unset. A legacy reading preference is preserved as a fallback, never converted into a gender. New profile values take precedence and also update the compatibility reading-preference field. Unrelated edits omit the new field; explicitly clearing it also clears the legacy fallback. The value does not change growth-chart references, medical measurements, shopping preferences or AI prompts.

The owner has already identified Advika as his daughter and explicitly wants automatic guidance without choosing again. After deployment, save Girl on that existing profile through the authenticated UI, then verify that girls' content opens and persists after reload. This is the requested real profile update, not a production test fixture. Other existing profiles remain unchanged.

Validation includes automatic girls/boys filtering, precedence over conflicting legacy choices, legacy preservation without identity inference, mapper round trips, omission versus explicit clearing, SQL constraints, owner access, consent and anonymous/cross-family denial. Existing shop, family-plan, private-photo and provider contracts remain in the regression suite.

Release verification pending. Rollback can retain the nullable column and compatibility preference; do not remove parent data.
