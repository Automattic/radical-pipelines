# Phase 3 — Build

Plans the work as tasks, executes them, verifies the result against the plan, the design doc, and the spec.

## Artifacts

`3-build/build-plan.md`, `3-build/build-plan-research.md`, plan reviews, `3-build/tasks/task-<id>-<attempt>.md`, the code on the branch, build reviews.

## Profiles

| Profile               | Modes                   |
| --------------------- | ----------------------- |
| `build-plan-producer` | Synthesize · Adjudicate |
| `build-plan-reviewer` | Fresh · Delta           |
| `build-worker-tdd`, `build-worker-edit`, `build-worker-e2e` | — |
| `build-reviewer`      | Fresh · Delta           |
| `researcher`          | —                       |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, the approving design-doc reviews, the task reports so far (the done-set is work to build on, never redo). **Input changes** on re-synthesis, plus unresolved triggers targeting the plan.
- Plan **Adjudicate**: the Synthesize materials plus `build-plan.md` and `build-plan-research.md`, and one of **Review lanes** — plan reviews, or a `rejected` build review whose findings become corrective tasks; **Amendment** — a trigger targeting the plan; or **Task report** — one failed report.
- Worker: the plan, the task's block, **Write your report to**. The worker's `Type` picks the profile: `tdd`, `edit`, `e2e`.
- Build review **Fresh**: the plan, `design-doc.md`, `spec.md`, every task report, **Diff** — the code since the plan's `head`, excluding the pipelines folder. **Delta**: the same with **Your previous review** and the **Diff** from its `head`.

## Tasks

- Every task block: `T<n>`, `Goal`, `Type`, `Files`, `Changes`, `Depends on`, `Verifies` (assumption ids or `—` with a reason), `Acceptance`.
- Fresh worker per attempt; the attempt number is the count of that task's reports plus one.

## Build review

On approval it writes `3-build/build-summary.md`.
