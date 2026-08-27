# Amending a Pipeline

An **amend** delivers a small, fully pinned change through a single `1-amend` phase instead of the full phase flow, with the same guarantees: a research pass before anything is written, a closed touch map, and an adversarial review of the whole diff that runs the gates.

An amend runs in two positions:

- **Layered** — a run added on a complete, unmerged run, where a revision would otherwise go. Created by this procedure.
- **Base** — a new pipeline's base run. Created per `create-pipeline.md`; the run becomes an amend when its phase 1 starts as `1-amend` (`pipeline-versioning.md`).

## Qualification

A change qualifies as an amend when all three hold:

- **The intent pins the target state** — what the result must be is already decided.
- **No design decision is left to later phases** — remaining unknowns are confirmations to verify, not choices to make.
- **The touch map is small and expected to close** — the set of touched surfaces is enumerable up front.

Behavior-preserving changes (renames, moves, deletions, doc edits) are the strong signal, not the gate: a pinned micro behavior change qualifies; a behavior-preserving change that leaves a design question open does not.

The orchestrator applies this test to the owner's request and recommends an amend when it passes; when it fails, the amend option is not offered. When the owner asks for an amend, the orchestrator answers whether it qualifies.

## The eject

When work in an amend surfaces a disqualifying discovery — a real design decision, a touch map that won't close — the run ends: the amend exceeds its scope. The `amend-lead` and the reviewers declare the eject with the statement "exceeds amend scope — run a revision"; a writer that hits the condition reports it as a blocker with the same effect. In every case the orchestrator stops the run with the normal close-out, and the committed artifacts — including any rejection carrying the eject — remain the run's record.

At close-out the orchestrator commits `1-amend/amend-ejected.md` — the statement, the discovery, and the follow-up route — making the ejected state durable (`pipeline-versioning.md`).

The follow-up starts from the tip the amend started from, reusing the amend's intent with the surfaced discovery recorded as an open assumption: for a layered amend, a revision at the family's next layered-run number (`revision-pipeline.md` — the ejected run does not block it); for a base amend, a fork cut at its `0-intent` re-run from phase 1 as a full pipeline (`fork-pipeline.md`), re-authoring the intent to record the discovery.

## Steps — layered amend

### 1. Confirm the preconditions

Re-verify all three gates here, independently of any menu:

- **(a) Complete.** The pipeline's latest non-ejected run is complete (its final phase satisfies the **Per-phase completion** predicate in `pipeline-versioning.md`). If it is not, steer the owner to **resume** (`resume-pipeline.md`), or to **fork** (`fork-pipeline.md`) to try a different approach.
- **(b) Unmerged.** The pipeline is unmerged, per the merged detection in `pipeline-versioning.md` ("Lineage"). If it is merged, the requested change is new work: handle it via `manage-issues.md`, not an amend.
- **(c) Qualified.** The request passes the qualification test above. If it fails, offer a revision (`revision-pipeline.md`) instead.

### 2. Create the amend run branch and worktree

Determine the run name `amend-<N>-<desc>` per the branch grammar (`pipeline-versioning.md`). Create the run branch at the previous run branch's tip, and its worktree per the **Worktree root** convention, each bracketed by its lifecycle hooks (`before-creating-branch`/`after-creating-branch`, `before-creating-worktree`/`after-creating-worktree`).

### 3. Create the run folder and author the intent

Create the run folder `<pipeline-family-folder>/amend-<N>-<desc>/` with its `0-intent/` subfolder in the worktree. Author the intent at `amend-<N>-<desc>/0-intent/intent.md` the same way a revision's is authored (`revision-pipeline.md` step 4): orchestrator-authored per `intent-format.md`, with the mandatory self-contained **Origin** section, any source assets in `0-intent/`, shown to the owner and written only on explicit approval. Then commit it per the **Commit format** convention and fire the `phase-completed` lifecycle hook.

### 4. Return to mode dispatch

Return to `work-on-an-issue.md` step 3 to pick the mode and dispatch the chosen workflow, which runs the `1-amend` phase in this run's folder on its branch.
