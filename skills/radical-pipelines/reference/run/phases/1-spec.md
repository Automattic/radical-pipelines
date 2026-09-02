# Phase 1 — Spec

The phase's specifics; the machine is `../loop.md`.

## Artifacts

`1-spec/spec.md` and `1-spec/spec-research.md` — produced together, reviewed together (`spec-research.md` is the artifact under review; `spec.md` is checked for fidelity to it). Reviews land in `1-spec/` as `spec-review-…`, named per the wave naming in `../loop.md`.

## Profiles

- `spec-producer` — modes Synthesize / Adjudicate / Consolidate.
- `spec-reviewer` — modes Fresh / Consolidation / Delta.
- `researcher` — serves both.

## Dispatch materials

- Synthesize: Intent `0-intent/intent.md`; Phase folder `1-spec/`; on re-synthesis, Input changes (amendment record + upstream diff refs).
- Adjudicate: Review lanes (this wave's review files); Amendment (when a claim from a later phase targets the spec); Lane folders (consolidations).
- Reviewer Fresh/Consolidation/Delta: per the template; you compute the Diff refs from the review's `reviewed` pins.

## Production lanes

Default: a single producer. When the run policy declares production lanes, seed each lane's branch from the same commit; each lane produces into `1-spec/lane-<k>/`; run each lane's review wave; then dispatch a producer in mode Consolidate with the lane candidates, followed by a Consolidation review of the result.

## Escalation targets

The spec's only direct input is the intent: an `unsatisfiable` claim from this phase targets `0-intent/intent.md`, and granting it is always an owner escalation.
