# Code Review — APPROVED (iteration 1)

**Batch:** Tasks 1, 2, 3, 4 of `code-plan.md` (the whole Code phase).
**Base ref:** `1601199` → `HEAD`. Source changes confined to `skills/radical-pipelines/SKILL.md` and `skills/radical-pipelines/reference/manage-issues.md`; everything else in the diff is this run's own `.pipelines/` artifacts.

## Verdict

The shipped diff satisfies the spec's acceptance criteria and the design. It is behavioral-only prose — no test files, no structural assertions over skill content. Approved.

## What shipped (re-derived against the live skill)

Three prose edits across two files:

1. **`SKILL.md:16`** — one new `## Rules` bullet: *"Whenever you create or modify an issue — at session start or mid-session — follow `reference/manage-issues.md`."* (T1)
2. **`SKILL.md:51`** — Entry points preamble changed from "When the owner starts a new session, determine which entry point applies from the table below." to "At session start, pick an entry point from the table below." (T2)
3. **`manage-issues.md:3` and `:54`** — framing de-positionalized (kept the scope boundary, dropped "entry point / front door / upstream of `work-on-an-issue.md`" and the "advancing it into a pipeline" forward-only commitment); close-out replaced the forward-only pointer with the situation-neutral "Control returns to the situation that invoked this workflow, which decides what happens next." (T3)

T4 was read-only behavioral verification (no commit), independently re-derived below.

## Acceptance-criteria trace

- **AC1 (R1) — mid-session routing.** The new standing `## Rules` bullet (`SKILL.md:16`) fires whenever the orchestrator creates or modifies an issue, at session start or mid-session, routing the operation into `manage-issues.md` (capture Q&A + Issues-convention routing) rather than ad hoc. It is a general statement, not limited to the merged-pipeline case. PASS.
- **AC2 (R2) — stated once, no per-procedure patches.** The complete create/modify-site set is `manage-issues.md` (the workflow) + `review-pipeline.md:12` (the lone pointer). A repo-wide grep confirms no new per-procedure pointer was added anywhere; the other "create/modify issue" mentions (`intent-format.md` provenance header, `conventions/setup.md` slug determinism) are untouched and unrelated. PASS.
- **AC3 (R4) — `manage-issues.md` hard-codes no single next step.** Read as if entered mid-session, the close-out (`:54`) forces neither fresh pipeline work nor a return; it hands the decision to the invoking situation. The scope boundary (`:3`) survives with its one necessary negative. PASS.
- **AC4 (R5) — merged-pipeline hand-off.** `review-pipeline.md:12` is **byte-for-byte unchanged** (empty diff in the run range, verified). It now relies on the new Rules bullet for routing and the situation-neutral close-out for return; reads consistently with the general rule, no contradiction, no redundant restatement. Its triggering condition (merged-pipeline change = new work) is unchanged. PASS.
- **AC5 (out-of-scope unchanged).** The only source files changed are `SKILL.md` and `manage-issues.md` (verified via `git diff --name-only`). Untouched and verified: phase files, `autonomous-workflow.md`, `assisted-workflow.md`, `create-pipeline.md`, `work-on-an-issue.md`, `conventions/load.md`, `intent-format.md`, `conventions/setup.md`, and the `.rp.md` run-time metadata convention. The absent `merge-pipeline.md` / `close-pipeline.md` remain absent (unrelated pre-existing gap). PASS.
- **AC6 (authoring rules).** Minimalist (the preamble edit is shorter than the original; the close-out adds one clause). Generic — no agentic-tool or issue-tracker-platform specifics in any edit. No duplication across reading paths (the recognition rule lives once in `## Rules`; the preamble does not restate it). No unnecessary negatives — the only retained negative ("does not create or run pipelines") is a necessary scope statement. Existing terms reused ("Issues" convention, the `reference/manage-issues.md` file reference, "work on an issue"); no new proper noun coined (the spec literal "Managing Issues workflow" appears nowhere in the skill, confirmed by grep). PASS.

## Out-of-Scope items (all five hold)

1. Run-time tracker metadata — the rule's "create or modify an issue" wording cannot reach status/labels/assignee/version/push; `.rp.md` untouched. ✓
2. No new recognition triggers — the merged-pipeline triggering condition is unchanged; no new "spin off an issue" moment added. ✓
3. No spawned-agent behavior changes — no phase/workflow file touched. ✓
4. The absent `merge-pipeline.md` / `close-pipeline.md` — still absent, not addressed. ✓
5. (The intent's "route every tracker operation through the Issues convention" framing) — not folded into the workflow as a metadata directive; the Issues-convention routing line (`:5`) is unchanged. ✓

## Project-rule and worktree-discipline checks

- **Prose-not-software / no structural tests.** The diff contains only markdown prose; no test file asserts skill sections, wording, or ordering. There are no guardrail gates for this project, so behavioral verification (reading the reading paths) is the correct and only verification mode. PASS.
- **Worktree discipline.** Toplevel is `…/.claude/worktrees/137-managing-issues-mid-session`; branch is `worktree-137-managing-issues-mid-session`. Review and commit performed only here.
