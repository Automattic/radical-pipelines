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

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, their approving reviews, the task reports so far (the done-set is work to build on, never redo), and the **Phase folder** files. **Input changes** on re-synthesis lists each changed input with `git diff <plan head> HEAD -- <path>`, then every unresolved trigger targeting the plan.
- Plan **Adjudicate**: the Synthesize materials plus `build-plan.md`, its **Tasks**, and `build-plan-research.md`, and one of **Review lanes** — every review in the complete closed wave (approving, rejecting, and unsatisfiable lanes); **Amendment** — a trigger targeting the plan; or **Task report** — one failed report and its task file.
- Plan review **Fresh**: the plan, record, tasks, and pinned-input package — the spec and design doc with their current approving reviews, adjudicated triggers, and production-lane inputs — plus the trigger under review. **Delta**: the Fresh materials, **Your previous review**, the **Diff** from its `head`, and the **Adjudication**.
- Worker: the **Task** file, its **Dependencies** (the task files it depends on), **Write your report to**; on a later attempt, **Your previous report**; for a corrective task or re-dispatch, the **Adjudication** and every **Review issue** attached to the task. The task's `Type` picks the profile: `tdd`, `edit`, `e2e`.
- Build review **Fresh**: the plan, its record and tasks, its **Pinned inputs** — the design doc and spec with their current approving reviews, every adjudicated trigger, and every production-lane input — every **Task report**, the triggering **Amendment** or **Task report** when present, and **Diff** — every change on the branch outside the pipelines folder since its base. **Delta**: the same with **Your previous review**, the **Diff** from its `head`, and the **Adjudication** — the record entries written since.

## Tasks

- Every task is a self-contained file: `Goal`, `Type`, `Files`, `Changes`, `Depends on`, `Verifies` (assumption ids or `—` with a reason), `Acceptance`; an e2e task carries the flows it automates. The plan lists the order.
- Fresh worker per attempt; the attempt number is the count of that task's reports plus one. Every task report names the task id and title.
