# Phase 1 — Spec

Turns the intent into testable requirements: what the feature does, observably, and what stays unchanged.

## Artifacts

`1-spec/spec.md` (the artifact), `1-spec/spec-research.md` (its record), spec reviews.

## Profiles

| Profile         | Modes                                 |
| --------------- | ------------------------------------- |
| `spec-producer` | Converge · Consolidate |
| `spec-reviewer` | Fresh · Consolidation · Delta         |
| `helper`        | —                                     |

## Materials

- Every producer mode: `0-intent/intent.md`, `spec.md`, `spec-research.md`; optional **Help**.
- **Converge** additions: the phase folder's existing files and, each when it applies, **Lane inputs**; **Input changes** — every changed input's path and `git diff <spec.md's head> HEAD -- <input>`; **Review lanes** — every review file of the closed wave; a **Correction** or **Task report** per pending challenge targeting `spec.md`, with the files its `origin` chain leads through; **Lane folders** when converging a consolidation.
- **Consolidate** additions: the phase folder's existing files; **Lane candidates** — each read-only lane folder with its `spec.md`, `spec-research.md`, and approving reviews.
- Every review mode: `spec.md`, `spec-research.md`, and every file `spec.md` pins — intent, adjudicated challenges, lane inputs, and consolidation candidates; optional **Help**. A wave adjudicating a challenge also receives its **Correction** or **Task report**.
- **Consolidation** review addition: **Lane folders**.
- **Delta** review additions: the complete rejected-review history, **Your previous review**, **Diff** (from its `head`), and **Adjudication** — the record sections written for the wave; retain **Lane folders** when reviewing a consolidation.

## Lanes

Production lanes (policy) run `spec-producer` Converge per `../loop.md` § Production lanes, then `spec-producer` Consolidate and a Consolidation review wave.
