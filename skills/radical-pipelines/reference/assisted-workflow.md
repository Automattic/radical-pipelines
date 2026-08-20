# Running the Assisted Workflow

This is the entry point of the **assisted workflow**. You drive a single phase directly with the owner — typically through Q&A — and write the artifacts yourself. No agents are spawned. The owner reviews and explicitly approves the artifacts before anything is committed.

The phase to run is the pipeline's **next phase** (see `pipeline-versioning.md`). Assisted mode covers the spec and design-doc phases: a pipeline's intent is already in place, and the build and document phases run in the autonomous workflow. If the next phase is `3-build` or `4-document`, tell the owner and offer the autonomous workflow.

## 1. Frame the conversation

Tell the owner explicitly that this is the assisted workflow, name the phase you are about to run, and explain that the two of you will work through it together — typically through Q&A — and that nothing is committed until the owner approves.

## 2. Identify the phase reference

Map the next phase to its reference file:

| Phase          | Subfolder      | Reference                           |
| -------------- | -------------- | ----------------------------------- |
| 1 - Spec       | `1-spec`       | `assisted-phases/1 - spec.md`       |
| 2 - Design doc | `2-design-doc` | `assisted-phases/2 - design-doc.md` |

## 3. Execute the phase

Create the phase subfolder inside the run folder (`<pipeline-family-folder>/<run>/<phase>` per `pipeline-versioning.md`) and run the phase per its reference.

The guardrails naming the phase's agents (`spec-*` or `design-doc-*`) apply to your work: surface them to the owner and satisfy them as the owner directs.

You write the artifacts yourself, in the run branch's worktree addressed by absolute path. After the owner explicitly approves the final artifact(s), write the per-phase **approval file** (`<artifact>-review-approved.md`) capturing the owner's approval as the reviewer-equivalent for assisted mode — see the phase reference for the exact filename(s) and template. Commit the final artifacts and the approval file(s) together in a single commit following the **Commit format** convention. The approval file is what makes the phase satisfy the completion predicate in `pipeline-versioning.md`, the same way an autonomous reviewer's `-approved.md` does.

## 4. Close out the run

Close-out fires whenever the run stops — the phase completed, an owner cancellation, or a failure:

1. Push the run branch.
2. Report the outcome; for a completed phase, which phase completed, where its artifacts live, and any notes worth surfacing.
3. Tell the owner that the assisted run has ended — continuing to a later phase happens in a separate session.
