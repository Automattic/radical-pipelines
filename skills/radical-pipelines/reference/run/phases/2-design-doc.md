# Phase 2 — Design doc

Decides how the spec is satisfied: architecture, mechanisms, decisions and trade-offs — each a verified or assumed claim.

## Artifacts

`2-design-doc/design-doc.md`, `2-design-doc/design-doc-research.md`, design-doc reviews.

## Profiles

| Profile               | Modes                                 |
| --------------------- | ------------------------------------- |
| `design-doc-producer` | Synthesize · Adjudicate · Consolidate |
| `design-doc-reviewer` | Fresh · Consolidation · Delta         |
| `researcher`          | —                                     |

## Materials

Use the mode packages in `1-spec.md`, substituting `design-doc.md` and `design-doc-research.md` for the artifact and record. Their standing upstream inputs are `0-intent/intent.md`, `1-spec/spec.md`, `1-spec/spec-research.md`, and current approving spec reviews. Synthesis includes conditional **Lane inputs**; consolidation receives read-only **Lane candidates**; adjudicating a consolidation includes **Lane folders**. **Input changes** lists every changed input with its diff and every unresolved trigger targeting `design-doc.md`.

A design-doc review receives the artifact, its record, and every file the artifact pins — the intent, spec, current approving spec reviews, adjudicated triggers, lane inputs, and consolidation candidates. A wave adjudicating a trigger also receives its **Amendment** or **Task report**.

## Lanes

As in `1-spec.md`, with `design-doc-producer` and `design-doc-reviewer`.

## Assumptions

The design doc accounts for every open assumption of the spec: closed by inspection with a citation, or carried into its own register. The reviewer checks the accounting.
