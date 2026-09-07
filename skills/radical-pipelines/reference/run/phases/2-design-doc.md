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

Use every mode package in `1-spec.md`, substituting `design-doc.md` and `design-doc-research.md` for the artifact and record; `0-intent/intent.md`, `1-spec/spec.md`, `1-spec/spec-research.md`, and current approving spec reviews for standing upstream inputs; and `design-doc.md` for the **Input changes** target.

## Lanes

As in `1-spec.md`, with `design-doc-producer` and `design-doc-reviewer`.

## Assumptions

The design doc accounts for every open assumption of the spec: closed by inspection with a citation, or carried into its own register. The reviewer checks the accounting.
