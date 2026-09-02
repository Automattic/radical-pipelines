# Phase 1 — Spec

Turns the intent into testable requirements: what the feature does, observably, and what stays unchanged.

## Artifacts

`1-spec/spec.md` (the artifact), `1-spec/spec-research.md` (its record), spec reviews. Complete when `spec.md` exists, is fresh, and every declared lane approved it.

## Profiles

| Profile         | Modes                               | Execution       |
| --------------- | ----------------------------------- | --------------- |
| `spec-producer` | Synthesize · Adjudicate · Consolidate | inspection only |
| `spec-reviewer` | Fresh · Consolidation · Delta       | inspection only |
| `researcher`    | —                                   | inspection only |

## Materials

- **Synthesize**: `0-intent/intent.md`; the phase folder's existing files, listed; on re-synthesis, **Input changes**: the changed inputs' paths and `git diff <old identity> <new>` of each, plus every unresolved trigger targeting `spec.md`.
- **Adjudicate**: **Review lanes** — every review file of the closed wave; or **Amendment** — one trigger (an external amendment, or an `unsatisfiable` review from a later phase) and the files its `origin` chain leads through.
- **Consolidate**: **Lane candidates** — each lane's `spec.md` and `spec-research.md`.
- **Fresh** review: `intent.md`, `spec.md`, `spec-research.md`.
- **Delta** review: **Your previous review**, **Diff** (`git diff` from the identities in its `reviewed` pins), **Adjudication** — the record sections written for the wave.
- **Consolidation** review: the Fresh materials plus **Lane folders**.

## Lanes

Production lanes (policy): each runs `spec-producer` Synthesize on `<slug>_1-spec-lane-<k>` in its own worktree and folder `1-spec/lane-<k>/`; one lane review each; then `spec-producer` Consolidate on the pipeline branch, then a Consolidation review wave. Single lane: none of this.

## Owner territory

Every `owner` attribution in `spec-research.md` and every intent item outside "Assumptions / directions to explore".
