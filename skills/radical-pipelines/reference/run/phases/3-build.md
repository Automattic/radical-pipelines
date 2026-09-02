# Phase 3 — Build

Plans the work as tasks, executes them, verifies the result against the plan, the design doc, and the spec.

## Artifacts

`3-build/build-plan.md`, `3-build/build-plan-research.md`, plan reviews, `3-build/tasks/task-<id>-<attempt>.md`, the code on the branch, build reviews. Complete when the plan is fresh and approved, every task is in the done-set, and the latest build review is `approved` and fresh.

## Profiles

| Profile               | Modes                       | Execution       |
| --------------------- | --------------------------- | --------------- |
| `build-plan-producer` | Synthesize · Adjudicate     | inspection only |
| `build-plan-reviewer` | Fresh · Delta               | inspection only |
| `build-worker-tdd`, `build-worker-edit`, `build-worker-e2e` | — | full            |
| `build-reviewer`      | Fresh · Delta               | full            |
| `researcher`          | —                           | inspection only |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, the approving design-doc reviews, the task reports so far (the done-set is work to build on, never redo). **Input changes** on re-synthesis, plus unresolved triggers targeting the plan.
- Plan **Adjudicate**: **Review lanes**; or **Amendment** (a trigger from outside or from below — an `unsatisfiable` build review); or **Task report** — one failed report and the task's block.
- Worker: the plan, the task's block, **Write your report to**. The worker's `Type` picks the profile: `tdd`, `edit`, `e2e`.
- Build review **Fresh**: the plan, `design-doc.md`, `spec.md`, every task report, **Diff** — the code commits since the plan landed (`git diff <plan landing commit> HEAD -- . ':(exclude)<pipelines folder root>'`). **Delta**: plus **Your previous review** and the diff since its `head`.

## Tasks

- Every task block: `T<n>`, `Goal`, `Type`, `Files`, `Changes`, `Depends on`, `Verifies` (assumption ids or `—` with a reason), `Acceptance`.
- Dispatch in dependency order, one worker at a time, fresh worker per attempt; the attempt number is the count of that task's reports plus one.
- A failed report is a trigger on the plan; the next check dispatches `build-plan-producer` Adjudicate before any other task.
- Done work is never redone: an upstream change reaches completed tasks through corrective tasks the plan adds.

## Build review

Reviews the whole code diff against the plan, the design doc, and the spec; runs the tests and the acceptance checks; maps commits to tasks through the task reports. Its `head` is the commit it reviewed. On approval it writes `3-build/build-summary.md`.

## Owner territory

Inherited from the spec and design-doc records; the plan phase records no owner statements.
