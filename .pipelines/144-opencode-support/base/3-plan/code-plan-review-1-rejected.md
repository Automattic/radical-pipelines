# Code Plan Review 1 — opencode support (via opencode-ensemble)

## Verdict

**Rejected.**

## Summary

The plan is well-traced and covers every spec acceptance criterion and every key design decision. I verified the codebase against its assumptions and the two non-obvious writer claims hold:

- **`scripts/validate-changesets.mjs` correctly needs no edit.** It enforces the single name `@automattic/radical-pipelines` (`EXPECTED_NAME`, line 35) and `main()` reads name/version only from the root `package.json` — it never enumerates sub-package manifests. The sub-package is version-synced (`sync-version.mjs` `TARGET_MANIFESTS`), not a changeset target, so the validator stays unedited. Confirmed.
- **The four other monitor-lifecycle files correctly need no task.** Verified each defers its mechanics to the Health monitoring convention and stays literally true as a no-op on opencode: `autonomous-workflow.md:38` ("Start a recurring health monitor … per `reference/health-monitoring.md`") and `:88` ("stop the health monitor … for the cancellation command"); `resume-pipeline.md:9`; `review-pipeline.md:54` (guarded by "If the project runs a health monitor"); and the conventions-table row at `skills/radical-pipelines/reference/conventions/load.md:21` ("How to launch and cancel the recurring run-health loop"). None is a hard assertion that breaks under "nothing to cancel."

Scope held (two generic files — `setup.md` two sites, `health-monitoring.md`; tooling flagged non-generic), no test tasks, no documentation tasks, `package.json`/`sync-version.mjs`/`.changeset/config.json`/`.claude-plugin/` all present and behave as assumed, 17 agents confirmed.

Rejection rests on one executable-blocking defect in the Task 5 / Task 7 packaging split: the dependency graph is not a DAG and one concrete deliverable (the root `workspaces` field) has two owners. The remaining items are accuracy fixes to correct in the same pass.

## Issues

### 1. (Blocking) Task 5 ↔ Task 7 circular dependency — the plan is not topologically orderable

- Task 5 **Depends on: Task 7** (code-plan.md:101).
- Task 7 **Depends on: Task 5** (code-plan.md:137).

A code-writer executing tasks in dependency order cannot order these — the graph has a 2-cycle. The Overview/prose tries to resolve it ("author the sub-package files first, then complete Task 7's root/workspace edits; treat Task 7 as completing the wiring"), but the formal `Depends on` fields directly contradict each other and contradict that prose. The dependency fields are what an executor sorts on; they must form a DAG.

**Fix:** Pick one real order and make the `Depends on` fields express it. The natural order is 5 → 7: Task 5 authors only the sub-package's own files (its `package.json`, the meta-plugin entry) and depends on nothing; Task 7 then does all root/workspace wiring (the `workspaces` declaration, `sync-version.mjs`, `.changeset/config.json`) and depends on Task 5. Remove Task 5's `Depends on: Task 7`.

### 2. (Blocking) The root `workspaces` field has two owners

The same single deliverable — the `workspaces` declaration in the root `package.json` — is claimed by both tasks:

- Task 5 (code-plan.md:96): "this task **may add** the `workspaces` field if Task 7 has not."
- Task 7 (code-plan.md:130, :134, and acceptance :140): "**add** the `workspaces` declaration … The root `package.json` declares a `workspaces` field …"

This is a hidden coordination decision deferred to run time. Two code-writers each run their task; either both edit the root `workspaces` field (double-edit / conflict) or each assumes the other did it. Which task owns the field is undefined, and Task 7's acceptance asserts the field exists without owning its creation unambiguously.

**Fix:** Give the root `package.json` workspace edits a single owner. Make Task 7 the sole owner of every root-`package.json` change (workspaces field + keeping `private: true`); delete the "this task may add the `workspaces` field" clause from Task 5 so Task 5 touches only files under `packages/opencode/`. (Issues 1 and 2 are fixed by the same re-scoping.)

### 3. (Accuracy) Task 1's quoted `old_string` does not match the file

Task 1 (code-plan.md:21) instructs replacing the sentence `Context-window limits are handled by **each tool's own auto-compaction**, not by the monitor.` — i.e. with `**…**` bold markers around "each tool's own auto-compaction." The actual `setup.md:102` has **no** bold markers: `Context-window limits are handled by each tool's own auto-compaction, not by the monitor.` The design carries the same wrong-with-bold quote (design-doc.md Decision 5 and Components → edit site 2). The task's acceptance is outcome-based ("attributes handling to 'each tool's own mechanism'"), so this is not fatal — but a literal exact-string replacement would fail.

**Fix:** Correct the quoted source text in Task 1 (and ideally note the design quote is off) to match the file's actual unbolded sentence.

### 4. (Accuracy) Task 4 mis-attributes the shared-task-list caution to "CC/Pi"

Task 4 (code-plan.md:68) says to include the shared-task-board note "mirroring the **CC/Pi** shared-task-list caution." That caution exists only in `claude-code.md:33`; `pi.md` carries no such sentence. The instruction to author the note in `opencode.md` is correct and design-backed (Interfaces → Shared task board, design-doc.md:92); only the precedent attribution is loose.

**Fix:** Attribute the precedent to `claude-code.md` (or drop the "CC/Pi" qualifier).

### Non-blocking observation (no change required)

`autonomous-workflow.md:88` reads "stop the health monitor (see `reference/health-monitoring.md` for the cancellation command)". After Task 3 rewords `health-monitoring.md`'s Stopping-the-monitor section to "nothing to cancel" on an always-on tool, this cross-reference points at a section that says there is no cancellation command — slightly imprecise on opencode but still true ("stop" resolves as a no-op; the pointer leads to the cancellation guidance, which answers "nothing to cancel"). Editing it would breach the two-generic-file boundary, so the writer's decision to leave it is correct. Recorded only so the writer knows it was considered.
