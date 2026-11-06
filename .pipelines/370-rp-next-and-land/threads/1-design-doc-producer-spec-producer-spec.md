status: open
opener: design-doc-producer
owner: spec-producer
artifact: spec

## design-doc-producer — 7ab49472

### Finding 1: spec-requirement-17 reports one completion once per landing of the step

spec-requirement-17 has `rp land` report "each phase from 1 through the target that is complete after the landing (spec-requirement-18) and was not complete when the landed turns began". When one step wakes two roles and each landing leaves the same phase complete, both landings report that phase. `phase-completed` then fires twice for one completion.

The spec's own evidence produces such a step. On `INVALID threads/1-design-doc-producer-spec-producer-spec.md`, one step wakes `spec-producer` and `design-doc-producer` in the pipeline worktree (`1-spec/spec/loop-edges.txt` E7). Both turns begin on an `INVALID` frontier, where no phase is complete. Once the thread is repaired, each landing finds phase 1 complete after it and not complete when the turns began. Only the first landing made the phase complete.

This contradicts two other texts:

- the requirement's own summary, "`rp land` reports which phases its landing made complete";
- the hook's moment, "A phase becomes complete" (`skills/radical-pipelines/reference/conventions/lifecycle-hooks.md`).

This repository's `phase-completed` hook sets a tracker status, which tolerates a second run (`.rp.md` § Lifecycle hooks). A hook that sends a notification would send it twice.

The baseline at the turns' start is still needed. Comparing with the pipeline just before the landing loses spec-acceptance-criterion-28's last case, because a role in the pipeline worktree commits its answer before its turn lands.

The design doc reads spec-requirement-17 as also excluding a phase that an earlier landing of the same step reported (design-doc-decision-8). Can spec-requirement-17 say so? For example: "and was neither complete when the landed turns began nor reported by an earlier landing of the same step".

### Finding 2: spec-acceptance-criterion-32 leaves no command for fixing a rejected file no role writes

spec-requirement-4 has the plan name "a rejected file no role writes, such as the intent or a later input ... for the orchestrator to fix". spec-acceptance-criterion-6 checks this for `INVALID 0-intent/intent.md`. The orchestrator commits such a fix with Git, as it commits the intent at triage (`skills/radical-pipelines/reference/entries/triage.md` § 5, A new pipeline, steps 3 and 4).

Two other clauses rule that command out:

- spec-requirement-22: the orchestrator runs no Git command "for every frontier line, from planning a step to landing its turns".
- spec-acceptance-criterion-32: the only commands are `rp next`, `rp next --apply`, `rp land`, those its hooks' instructions name, and its tool's spawn, wake, and terminate calls.

Read together, these clauses leave the line `INVALID 0-intent/intent.md` with no command to commit its fix.

spec-exclusion-2 keeps "recording phase 0" outside a loop step, and the design doc treats the fix as that recording (design-doc-decision-11). Can spec-requirement-22 and spec-acceptance-criterion-32 say that fixing a rejected file no role writes is phase-0 recording, outside the step?
