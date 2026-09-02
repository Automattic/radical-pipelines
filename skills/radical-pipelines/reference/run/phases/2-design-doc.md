# Phase 2 — Design doc

The phase's specifics; the machine is `../loop.md`.

## Artifacts

`2-design-doc/design-doc.md` and `2-design-doc/design-doc-research.md` — produced together, reviewed together (`design-doc-research.md` is the artifact under review; `design-doc.md` is checked for fidelity to it). Reviews land in `2-design-doc/` as `design-doc-review-…`.

Pins per `../state.md`: `design-doc.md` pins the intent, `spec.md`, and absorbed amendments; the record carries none.

## Profiles

- `design-doc-producer` — modes Synthesize / Adjudicate / Consolidate.
- `design-doc-reviewer` — modes Fresh / Consolidation / Delta.
- `researcher` — serves both.

## Register duty

The design doc accounts for every open assumption in `spec.md`'s register: closed by reading (with citation) or carried into its own register. The reviewer checks the accounting.

## Production lanes

Default: a single producer. Lanes as in phase 1, producing into `2-design-doc/lane-<k>/`, then Consolidate + Consolidation review.

## Escalation targets

The design's direct inputs are the spec artifacts and the intent. A claim that a spec clause is unsatisfiable is an exhaustion claim: only this phase's pair can originate it, and only with every mechanism class closed by reading or by recorded failed attempts. It routes as an amendment to the spec, whose wave adjudicates it; when the spec clause rests on the intent or a recorded owner statement and the spec's wave grants the claim, the orchestrator escalates to the owner with the dossier.
