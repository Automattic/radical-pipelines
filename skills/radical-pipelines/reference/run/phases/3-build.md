# Phase 3 — Build

Plans the work as tasks, executes them, verifies the result against the plan, the design doc, and the spec.

## Artifacts

`3-build/build-plan.md` with `3-build/tasks/T<n>.md`, `3-build/build-plan-research.md`, plan reviews, `3-build/tasks/T<n>-report-<k>.md`, the code on the branch, build reviews.

## Profiles

| Profile               | Modes                   |
| --------------------- | ----------------------- |
| `build-plan-producer` | Synthesize · Adjudicate |
| `build-plan-reviewer` | Fresh · Delta           |
| `build-worker-tdd`, `build-worker-edit`, `build-worker-e2e` | — |
| `build-reviewer`      | Fresh · Delta           |
| `researcher`          | —                       |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, their approving reviews, the task reports so far (the done-set is work to build on, never redo). **Input changes** on re-synthesis, plus unresolved triggers targeting the plan.
- Plan **Adjudicate**: the Synthesize materials plus `build-plan.md` and `build-plan-research.md`, and one of **Review lanes** — plan reviews, or a `rejected` build review whose findings become corrective tasks; **Amendment** — a trigger targeting the plan; or **Task report** — one failed report.
- Worker: the **Task** file, its **Dependencies** (the task files it depends on), **Write your report to**; on a later attempt, **Your previous report**, and the **Adjudication** when it adjudicated a failed one. The task's `Type` picks the profile: `tdd`, `edit`, `e2e`.
- Build review **Fresh**: the plan, its record and tasks, `design-doc.md`, `spec.md`, every report, **Diff** — every change on the branch outside the pipelines folder since its base. **Delta**: the same with **Your previous review**, the **Diff** from its `head`, and the **Adjudication** — the record entries written since.

## Tasks

- Every task is a self-contained file: `Goal`, `Type`, `Files`, `Changes`, `Depends on`, `Verifies` (assumption ids or `—` with a reason), `Acceptance`; an e2e task carries the flows it automates. The plan lists the order.
- Fresh worker per attempt; the attempt number is the count of that task's reports plus one.
