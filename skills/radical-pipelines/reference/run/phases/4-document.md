# Phase 4 — Document

Plans and writes the documentation the shipped code needs — internal and external — and verifies it against the code, the design doc, and the spec.

## Artifacts

`4-document/document-plan.md` with `4-document/tasks/T<n>.md`, `4-document/document-plan-research.md`, plan reviews, `4-document/tasks/T<n>-report-<k>.md`, the documentation on the branch, document reviews.

## Profiles

| Profile                  | Modes                   |
| ------------------------ | ----------------------- |
| `document-plan-producer` | Synthesize · Adjudicate |
| `document-plan-reviewer` | Fresh · Delta           |
| `document-worker`        | —                       |
| `document-reviewer`      | Fresh · Delta           |
| `researcher`             | —                       |

## Materials

- Plan **Synthesize**: `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-build/build-plan.md` with its tasks and reports, their approving reviews, the approving build review, the shipped code (the branch), the task reports so far, and the **Phase folder** files. **Input changes** on re-synthesis lists each changed input with `git diff <plan head> HEAD -- <path>`, then every unresolved trigger targeting the plan.
- Plan **Adjudicate**: the Synthesize materials plus `document-plan.md`, its **Tasks**, and `document-plan-research.md`, and one of **Review lanes** — every review in the complete closed wave (approving, rejecting, and unsatisfiable lanes); **Amendment**; or **Task report** — one failed report and its task file.
- Plan review **Fresh**: the plan, record, tasks, reports, and pinned-input package — the spec, design doc, and build package with their current approving reviews, adjudicated triggers, and production-lane inputs — plus the trigger under review. **Delta**: the Fresh materials, **Your previous review**, the **Diff** from its `head`, and the **Adjudication**.
- Worker: the **Task** file, its **Dependencies**, `1-spec/spec.md` and `2-design-doc/design-doc.md` (the rationale), the named **Existing documentation**, the project's **Documentation conventions**, and **Write your report to**; on a later attempt, **Your previous report**; for a corrective task or re-dispatch, the **Adjudication** and every **Review issue** attached to the task.
- Document review **Fresh**: the plan, its record and tasks, the project's **Documentation conventions**, its **Pinned inputs** — the design doc, spec, and complete build package with their current approving reviews, every adjudicated trigger, and every production-lane input — every **Task report**, the triggering **Amendment** or **Task report** when present, and **Diff** — every change on the branch outside the pipelines folder since its base. **Delta**: the same with **Your previous review**, the **Diff** from its `head`, and the **Adjudication** — the record entries written since.

## Tasks

- Every task is a file with `Goal`, `Surface` (the documentation location it serves), `Audience`, `Sections` (the exact sections and scope), `Files`, `Changes`, `Depends on`, `Acceptance`; the plan lists the order.
- Fresh worker per attempt. Every task report names the task id and title.
