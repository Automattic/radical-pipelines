# Code Plan Review

## Verdict: rejected

## Summary

The plan is strong overall: it is well-ordered (the two single-source anchors —
`pipeline-versioning.md` and `prompt-format.md` — land before their consumers), its
Files/Changes name real files and real, verifiable edit points (I confirmed every cited
line against the live skill files), its task acceptance criteria are concrete, and its
cross-cutting checks are a genuine consistency net. Coverage of the spec requirements and
acceptance criteria is otherwise complete, and scope matches the design with no
out-of-scope work and no re-litigated design decisions.

It is rejected for one real, executable coverage gap: **Task 6 misses
`autonomous-workflow.md:48`**, the autonomous orchestrator's own phase-subfolder-creation
step. As written, a fresh code-writer executing the plan would leave the autonomous loop
creating flat phase folders (`<artifacts-folder>/<phase>`) at the pipeline level while the
agent it then launches writes into the run folder (`<artifacts-folder>/<run>/<phase>`) —
a path mismatch that also misplaces the "in progress" marker relative to the run-scoped
completion predicate Task 1 introduces. This contradicts R2/R20 and the design's own
run-folder model. One issue, but a load-bearing one.

## Issues

### Issue 1: Task 6 does not bind the autonomous orchestrator's phase-subfolder creation (`autonomous-workflow.md:48`) to the active run's folder

**What's wrong:**
The autonomous workflow has the orchestrator create the phase subfolder itself, before
launching the phase agent. `autonomous-workflow.md:48` (step 1 under "For each phase")
reads:

> "Create the phase subfolder inside the artifacts folder. Creating the folder marks the
> phase as **in progress**; completion is determined separately by the **Per-phase
> completion** predicate in `pipeline-versioning.md`."

This is the *identical* phrasing to `assisted-workflow.md:26`, which Task 6 (change #3)
correctly rewords to "the active run's folder (the artifacts folder for this run)". But
Task 6 leaves the autonomous line at 48 untouched. Task 6 only edits:
- `autonomous-workflow.md:60` (the agent-prompt **Artifact folder** bullet → hand the run folder), and
- adds the base-ref capture line near line 35, and
- `assisted-workflow.md:26`.

Its acceptance criteria enumerate exactly those three edits and never mention line 48.

The consequence is concrete. After Task 6 + Task 1 land:
- The orchestrator at line 48 creates the phase subfolder "inside the artifacts folder" —
  unqualified, naturally read as the pipeline folder — i.e. `<artifacts-folder>/1-spec`.
- The orchestrator then hands the agent `<artifacts-folder>/<run>/` (e.g.
  `<artifacts-folder>/base/`) as "the artifact folder" (line 60), so the agent writes to
  `<artifacts-folder>/base/1-spec`.
- Task 1 rebinds the **Per-phase completion** predicate to evaluate at
  `<artifacts-folder>/<run>/<phase>`. So the "in progress" folder the orchestrator creates
  at line 48 (`<artifacts-folder>/1-spec`) sits at the wrong level and is invisible to the
  rebound predicate, while a flat phase folder is created at the pipeline level —
  precisely the layout R2/R20 and the design forbid.

I confirmed there are exactly two "Create the phase subfolder inside the artifacts folder"
instructions in the skill (autonomous:48 and assisted:26), that the phase reference files
contain no folder-creation step (so line 48 is the load-bearing creation point in
autonomous mode, not redundant), and that line 48 is in the orchestrator's loop and runs
before the agent is launched (step 1, ahead of "Read its phase reference" at step 2 and
"Run the phase" at step 3). So the gap is real and not compensated elsewhere.

**Where in plan:** Task 6 (Files/Changes and Acceptance) — and the plan Overview's "two
agent-launch lines" framing, which omits this third, non-agent-launch orchestrator line.

**Suggestion:**
Add a fourth change to Task 6 that rewords `autonomous-workflow.md:48` symmetrically with
the assisted edit — e.g. "Create the phase subfolder inside the active run's folder (the
artifacts folder for this run)" — and add a matching acceptance bullet. This mirrors the
assisted change #3 and keeps the orchestrator-created "in progress" folder aligned with
both the agent's write target and Task 1's run-scoped completion predicate. (The acceptance
criterion stating "No agent profile file is changed by this task; the only edits are to the
two workflow files" still holds — this is a third edit within `autonomous-workflow.md`, not
a new file.)

**Why it matters:**
Without it, every autonomous run — including `base` for a brand-new pipeline — would create
its phase folders flat at the pipeline level, breaking acceptance criterion 1 ("phase
folders live under `base/` … and not directly under the pipeline folder") and the run-scoped
state model the rest of the plan depends on. It is the kind of mismatch the code-reviewer
would catch, but the plan should not ship a code-writer into it.
