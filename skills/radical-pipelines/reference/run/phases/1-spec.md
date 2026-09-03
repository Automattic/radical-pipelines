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

- **Synthesize**: `0-intent/intent.md`; the phase folder's existing files, listed; on re-synthesis, **Input changes**: the changed inputs' paths and `git diff <spec.md's head> HEAD -- <input>` for each, plus every unresolved trigger targeting `spec.md`.
- **Adjudicate**: **Review lanes** — every review file of the closed wave; **Amendment** — one trigger (an external amendment, or an `unsatisfiable` review from a later phase) and the files its `origin` chain leads through; or **Refutation** — the review that refuted a claim the spec raised.
- **Consolidate**: **Lane candidates** — each lane's `spec.md` and `spec-research.md`.
- **Fresh** review: `intent.md`, `spec.md`, `spec-research.md`.
- **Delta** review: the Fresh materials, **Your previous review**, **Diff** (from its `head`), **Adjudication** — the record sections written for the wave.
- **Consolidation** review: the Fresh materials plus **Lane folders**.

## Lanes

Production lanes (policy) run `spec-producer` Synthesize per `../loop.md` § Production lanes, then `spec-producer` Consolidate and a Consolidation review wave.
