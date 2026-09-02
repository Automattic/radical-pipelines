# Phase 2 — Design doc

Decides how the spec is satisfied: architecture, mechanisms, decisions and trade-offs — each a verified or assumed claim.

## Artifacts

`2-design-doc/design-doc.md`, `2-design-doc/design-doc-research.md`, design-doc reviews. Complete when `design-doc.md` exists, is fresh, and every declared lane approved it.

## Profiles

| Profile               | Modes                                 | Execution       |
| --------------------- | ------------------------------------- | --------------- |
| `design-doc-producer` | Synthesize · Adjudicate · Consolidate | inspection only |
| `design-doc-reviewer` | Fresh · Consolidation · Delta         | inspection only |
| `researcher`          | —                                     | inspection only |

## Materials

As in `1-spec.md`, with these inputs: `0-intent/intent.md`, `1-spec/spec.md`, the approving spec reviews (they carry the verification log and non-blocking findings), and the phase folder's files. **Input changes** lists the changed inputs and their diffs plus every unresolved trigger targeting `design-doc.md`.

## Lanes

As in `1-spec.md`, on `<slug>_2-design-doc-lane-<k>` and `2-design-doc/lane-<k>/`.

## Owner territory

Every `owner` attribution in `design-doc-research.md`. A claim whose target is such an entry is an owner escalation, however it was raised.

## Assumptions

The design doc accounts for every open assumption of the spec: closed by inspection with a citation, or carried into its own register. The reviewer checks the accounting.
