# Phase 4 — Document

Plans and writes the documentation the shipped code needs — internal and external — and verifies it against the code, the design doc, and the spec.

## Artifacts

`4-document/document-plan.md` with `4-document/tasks/T<n>.md`, `4-document/document-plan-research.md`, plan reviews, `4-document/tasks/T<n>-report-<k>.md`, the documentation on the branch, document reviews, `4-document/document-summary.md`.

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
- Plan **Adjudicate**: the Synthesize materials plus `document-plan.md` and `document-plan-research.md`, and one of **Review lanes** — plan reviews, or a `rejected` document review whose findings become corrective tasks; **Amendment**; or **Task report**.
- Worker: the **Task** file, the **Plan**, **Write your report to**.
- Document review **Fresh**: the plan and its tasks, `design-doc.md`, `spec.md`, `build-summary.md`, every report, **Diff** — the documentation since the plan's `head`. **Delta**: the same with **Your previous review** and the **Diff** from its `head`.

## Tasks

- Every task is a file with `Goal`, `Surface` (the documentation location it serves), `Files`, `Changes`, `Depends on`, `Acceptance`; the plan lists the order.
- Fresh worker per attempt.

## Document review

On approval it writes `4-document/document-summary.md`.
