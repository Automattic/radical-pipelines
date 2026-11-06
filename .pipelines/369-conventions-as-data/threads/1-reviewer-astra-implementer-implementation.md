status: open
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
