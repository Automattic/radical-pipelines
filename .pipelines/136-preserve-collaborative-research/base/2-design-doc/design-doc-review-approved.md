# Design Doc Review

## Verdict: approved

## Reviewer

design-doc-reviewer (adversarial review, phase 2)

## Summary

The design doc is complete, sound, feasible against the actual skill source, and
faithful to the spec. Every spec requirement and acceptance criterion (AC1-AC10)
maps to a traceable design decision, and the scope guarantee (AC10 — assisted
reading path only) holds.

## Verification against the skill source

Every load-bearing claim was checked against the real skill, not just the
research record:

- **Phase files and structures** match the cited sections and line numbers in
  `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`,
  `2 - design-doc.md`, and `3 - plan.md`.
- **Cross-file reference idiom is real and idiomatic.** The phase files reference
  `pipeline-versioning.md` by inline name and the orchestrator reads it on demand
  (`work-on-an-issue.md` "Read `pipeline-versioning.md` first"; phase files at
  `1:122`, `2:146`, `3:238`). The skill loads reference files via "Read `X.md`" /
  "see `X.md`" / "per `X.md`" instructions. A new shared file under
  `assisted-phases/`, referenced by name from all three phase files, reuses
  exactly this mechanism — buildable, no new machinery.
- **Standalone-guarantee fan-out is substantiated.** `spec.md` and
  `design-doc.md` are read by a large out-of-scope fan-out (13 agent definitions
  read `spec.md`; 10 read `design-doc.md`) plus the autonomous path, and the
  standalone guarantee is asserted across the assisted path, the autonomous
  writer rows, and the agent definitions. This firmly justifies the central
  decision (read the prior research file as a supplementary input) over folding
  research into the standalone artifact.
- **Carry-across is a genuinely new cross-phase read.** The autonomous
  `design-doc-writer` reads its OWN research file (`agents/design-doc-writer.md`),
  but no phase reads a PRIOR phase's research file today. The design correctly
  frames the new input as additive and supplementary, not a second source of
  truth.
- **Recording-trigger asymmetry is real.** The design-doc and plan topic loops
  already carry the implicit "append the distilled entry after the owner decides,
  before the next topic" trigger (step 3.3 → 3.4 in both). The spec phase's loop
  (step 2: formulate → present → append answer per-question) has no
  settled-thread distillation. Promoting the implicit trigger to an explicit rule
  and bringing the spec phase to parity is the correct fix.
- **Spec-phase home claims hold.** `## Topics` already exists in design-doc/plan,
  so the parity and term-reuse claims are valid; the spec phase's `## Research` is
  genuinely pinned to the orchestrator's own cited codebase reads, so broadening
  it (rejected Alternative b) would correctly blur its meaning.

## Authoring-rule compliance

- **De-duplication within the reading path** is satisfied by extracting only the
  genuinely identical core (recording trigger + advocate-vs-record principle) into
  one shared file referenced by name. The existing triple "in real time" line is
  correctly identified as latent de-dup debt, not a licence to add more copies.
- **No forced negative carve-outs.** The forward-drift flag stays inline in the
  two phases where it applies (spec + design-doc), avoiding a "plan: not
  applicable" carve-out that would have introduced unnecessary negative phrasing
  in the shared file. The shared file holds nothing phase-specific.
- **Generic.** No tool-specific or issue-tracker-specific content is introduced.
- **System as designed.** The design fixes architecture and defers wording/naming
  (shared-file filename, spec `## Topics` entry shape, full-vs-partial read of the
  carried file) to later phases as open questions — appropriate at the WHAT level.

## Acceptance-criteria coverage

AC1 settled-thread trigger; AC2 distilled unit; AC3 spec `## Topics` home; AC4
owner-initiated dialogue named recordable (correctly distinguished from AC3 — met
by the Q&A-loop guidance change, not the heading alone); AC5 advocate-vs-record
carve-out; AC6 forward-drift flag in spec + design-doc, absent in plan; AC7
carry-across by research-file input; AC8 hybrid extraction + spec parity; AC9
shared file for the identical core; AC10 only the three assisted files plus one
new `assisted-phases/` addition (sanctioned by spec Out of Scope 4), standalone
artifacts and autonomous path untouched. All ten are covered with traceable
decisions.

## Notes

The autonomous-path divergence (assisted and autonomous recording instructions
will differ after this change) is intentional per the spec's scoping and is
explicitly flagged as a transparency risk, not an oversight. No mitigation
needed.
