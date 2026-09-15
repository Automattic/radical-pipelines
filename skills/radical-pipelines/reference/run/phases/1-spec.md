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
- **Synthesize** additions: the phase folder's existing files; conditional **Lane inputs**; on re-synthesis, **Input changes** — every changed input's path and `git diff <spec.md's head> HEAD -- <input>`, plus every unresolved challenge targeting `spec.md`.
- **Adjudicate** additions: the phase folder's existing files; one of **Review lanes** — every review file of the closed wave — **Correction**, or **Task report** — one challenge and the files its `origin` chain leads through; when adjudicating a consolidation, **Lane folders**.
- **Consolidate** additions: the phase folder's existing files; **Lane candidates** — each read-only lane folder with its `spec.md`, `spec-research.md`, and approving reviews.
- Every review mode: `spec.md`, `spec-research.md`, and every file `spec.md` pins — intent, adjudicated challenges, lane inputs, and consolidation candidates; optional **Research**. A wave adjudicating a challenge also receives its **Correction** or **Task report**.
- **Consolidation** review addition: **Lane folders**.
- **Delta** review additions: the complete rejected-review history, **Your previous review**, **Diff** (from its `head`), and **Adjudication** — the record sections written for the wave; retain **Lane folders** when reviewing a consolidation.

## Lanes

Production lanes (policy) run `spec-producer` Synthesize per `../loop.md` § Production lanes, then `spec-producer` Consolidate and a Consolidation review wave.
