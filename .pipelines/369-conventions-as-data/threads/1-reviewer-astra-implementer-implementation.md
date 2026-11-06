status: approved
opener: reviewer-astra
owner: implementer
artifact: implementation

## reviewer-astra — 3e7cf7b4c04444444b20925d89d890366cf8ea05

### [P2] Remove assertions that freeze the assignment templates' prose structure

`scripts/test/rp/assign.test.mjs:81,97–98,158,287,497–498` hard-code the templates' headings and their order, including exact lists of Seat fields. These assertions restate the skill's prose structure rather than test assignment-generation behavior. For example, moving Resources before Guardrails in a template would fail these tests even though both conventions still reach the role unchanged and every named section remains available to its profile.

`AGENTS.md` explicitly prohibits structural tests of skill or agent files' sections, wording, or ordering. Testing the rendered copy instead of the source does not remove this coupling. Remove the exact heading/order assertions; retain the behavioral checks for selected modes, material paths, convention selection, expansion, model inheritance, and omitted optional content. Test the renderer's syntax with independent fixture templates where needed, rather than making legitimate prose edits require matching test edits.

### Guardrail outcomes

- **tests — pass:** Ran `npm test`; all 553 tests passed, with no failures or skips.
- **documentation — needs changes:** Reviewed `AGENTS.md`, `docs/glossary.md`, and the changed documentation. The structural-test finding above violates `AGENTS.md`. The vocabulary, migration instructions, and documentation otherwise reflect the new assignment-generation behavior.

No other blocking finding from this review.

## implementer — 54487fd763a80f9ec20da10494d7a219f786eb86

### [P2] Remove assertions that freeze the assignment templates' prose structure: changed in 0009b0f5

`scripts/test/rp/assign.test.mjs` now runs `rp` from a copied skill folder beside templates the test owns. Each of them echoes every value `rp assign` fills under its own name: the mode and its flags, the seat, the materials, the threads, the malformed files, the carried conventions, and the vocabulary. The tests assert those values, so a template can be reworded or reordered without a test edit.

The heading, Seat-field, and Materials-key assertions are gone, along with `PROFILE_HEADINGS` and `partOf`, which read the delivered templates' wording.

The renderer's syntax is tested on its own fixture templates:

- how lists, parts, and flags render;
- each way a template can break the syntax.

One test remains on the delivered templates. It writes every role's assignment for every kind of turn from this repository's `.rp.md`. It checks only that each fills, and that each holds the values the turn gives it.

Whether the delivered templates keep the headings and field names the profiles refer to is now an inspection, not a test: `3-implementation/notes/profile-names.txt`.

`npm test` passes: 560 tests.

## reviewer-astra — 62264fce249ab655f2a24e6015f1944a2673d733

Approved. The structural-test finding is resolved: test-owned templates exercise assignment values and rendering syntax without freezing the delivered templates' headings or ordering. The remaining delivered-template checks verify that turn values reach the assignment.

Reviewed the other changes since my last message, including brief expansion, the Base vocabulary value, review-thread selection, and the repair request. No new blocking finding.

### Guardrail outcomes

- **tests — pass:** Ran `npm test`; all 561 tests passed, with no failures or skips.
- **documentation — pass:** Checked the revisions against `AGENTS.md` and the canonical vocabulary in `docs/glossary.md`. The previous violation is resolved, and the changed documentation covers the revised behavior.
