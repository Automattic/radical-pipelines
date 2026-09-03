# Phase 4 — Document

Plans and writes the documentation the shipped code needs — internal and external — and verifies it against the code, the design doc, and the spec.

## Artifacts

`4-document/document-plan.md`, `4-document/document-plan-research.md`, plan reviews, `4-document/tasks/task-<id>-<attempt>.md`, the documentation on the branch, document reviews.

## Profiles

| Profile                  | Modes                   |
| ------------------------ | ----------------------- |
| `document-plan-producer` | Synthesize · Adjudicate |
| `document-plan-reviewer` | Fresh · Delta           |
| `document-worker`        | —                       |
| `document-reviewer`      | Fresh · Delta           |
| `researcher`             | —                       |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-build/build-summary.md`, the approving build review, the shipped code (the branch), the task reports so far. **Input changes** on re-synthesis, plus unresolved triggers targeting the plan.
- Plan **Adjudicate**: **Review lanes** — plan reviews, or a `rejected` document review whose findings become corrective tasks; **Amendment**; **Refutation**; or **Task report**.
- Worker: the plan, the task's block, **Write your report to**.
- Document review **Fresh**: the plan, `design-doc.md`, `spec.md`, `build-summary.md`, every task report, **Diff** — the documentation commits since the plan landed. **Delta**: plus **Your previous review** and the diff since its `head`.

## Tasks

- Every task block: `T<n>`, `Goal`, `Surface` (the documentation location it serves), `Files`, `Changes`, `Depends on`, `Acceptance`.
- Fresh worker per attempt.

## Document review

On approval it writes `4-document/document-summary.md`.
