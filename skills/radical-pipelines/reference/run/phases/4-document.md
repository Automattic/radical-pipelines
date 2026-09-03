# Phase 4 — Document

Plans and writes the documentation the shipped code needs — internal and external — and verifies it against the code, the design doc, and the spec.

## Artifacts

`4-document/document-plan.md`, `4-document/document-plan-research.md`, plan reviews, `4-document/tasks/task-<id>-<attempt>.md`, the documentation on the branch, document reviews. Complete when the plan is fresh and approved, every task is in the done-set, and the latest document review is `approved` and fresh.

## Profiles

| Profile                  | Modes                   | Execution       |
| ------------------------ | ----------------------- | --------------- |
| `document-plan-producer` | Synthesize · Adjudicate | inspection only |
| `document-plan-reviewer` | Fresh · Delta           | inspection only |
| `document-worker`        | —                       | full            |
| `document-reviewer`      | Fresh · Delta           | full            |
| `researcher`             | —                       | inspection only |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-build/build-summary.md`, the approving build review, the shipped code (the branch), the task reports so far. **Input changes** on re-synthesis, plus unresolved triggers targeting the plan.
- Plan **Adjudicate**: **Review lanes**; **Amendment**; **Refutation**; or **Task report**.
- Worker: the plan, the task's block, **Write your report to**.
- Document review **Fresh**: the plan, `design-doc.md`, `spec.md`, `build-summary.md`, every task report, **Diff** — the documentation commits since the plan landed. **Delta**: plus **Your previous review** and the diff since its `head`.

## Tasks

- Every task block: `T<n>`, `Goal`, `Surface` (the documentation location it serves), `Files`, `Changes`, `Depends on`, `Acceptance`.
- Dispatch in dependency order, one worker at a time, fresh worker per attempt.
- A failed report is a trigger on the plan; the next check dispatches `document-plan-producer` Adjudicate before any other task.

## Drift

Code that contradicts the design doc on a point the documentation must cover is a contradiction, not a documentation task: the plan pair raises `Contradicts-input` against the artifact that is wrong — the design doc when the code is right, the build plan when the code is.

## Document review

Reviews the whole documentation diff against the plan, the code, the design doc, and the spec; sweeps the shipped public surfaces for anything undocumented. Its `head` is the commit it reviewed. On approval it writes `4-document/document-summary.md`.
