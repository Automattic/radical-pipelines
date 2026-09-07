# Phase 1 — Spec

Turns the intent into testable requirements: what the feature does, observably, and what stays unchanged.

## Artifacts

`1-spec/spec.md` (the artifact), `1-spec/spec-research.md` (its record), spec reviews.

## Profiles

| Profile         | Modes                                 |
| --------------- | ------------------------------------- |
| `spec-producer` | Synthesize · Adjudicate · Consolidate |
| `spec-reviewer` | Fresh · Consolidation · Delta         |
| `researcher`    | —                                     |

## Materials

- Every producer mode: `0-intent/intent.md`, `spec.md`, `spec-research.md`; optional **Research**.
- **Synthesize** additions: the phase folder's existing files; conditional **Lane inputs**; on re-synthesis, **Input changes** — every changed input's path and `git diff <spec.md's head> HEAD -- <input>`, plus every unresolved trigger targeting `spec.md`.
- **Adjudicate** additions: the phase folder's existing files; exactly one correction: **Review lanes** — every review file of the closed wave — an **Amendment**, or a **Task report** — one trigger and the files its `origin` chain leads through; when adjudicating a consolidation, **Lane folders**.
- **Consolidate** additions: the phase folder's existing files; **Lane candidates** — each lane's `spec.md`, `spec-research.md`, and approving reviews.
- Every review mode: `spec.md`, `spec-research.md`, and every file `spec.md` pins — intent, adjudicated triggers, lane inputs, and consolidation candidates; optional **Research**. A wave adjudicating a trigger also receives its **Amendment** or **Task report**.
- **Consolidation** review addition: **Lane folders**.
- **Delta** review additions: the complete rejected-review history, **Your previous review**, **Diff** (from its `head`), and **Adjudication** — the record sections written for the wave; retain **Lane folders** when reviewing a consolidation.

## Lanes

Production lanes (policy) run `spec-producer` Synthesize per `../loop.md` § Production lanes, then `spec-producer` Consolidate and a Consolidation review wave.
