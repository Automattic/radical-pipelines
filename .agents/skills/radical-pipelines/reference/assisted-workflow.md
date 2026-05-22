# Running the Assisted Workflow

This is the entry point of the **assisted workflow**. You drive a single phase directly with the owner — typically through Q&A — and write the artifacts yourself. No agents are spawned. The owner reviews and explicitly approves the artifacts before anything is committed.

The phase to run is the **next phase** (the phase after the current phase).

## 1. Frame the conversation

Tell the owner explicitly that this is the assisted workflow, name the phase you are about to run, and explain that the two of you will work through it together — typically through Q&A — and that nothing is committed until the owner approves.

## 2. Identify the phase reference

Map the next phase to its reference file:

| Phase          | Subfolder      | Reference                           |
| -------------- | -------------- | ----------------------------------- |
| 0 - Prompt     | `0-prompt`     | Already in place                    |
| 1 - Spec       | `1-spec`       | `assisted-phases/1 - spec.md`       |
| 2 - Design doc | `2-design-doc` | `assisted-phases/2 - design-doc.md` |
| 3 - Plan       | `3-plan`       | `assisted-phases/3 - plan.md`       |
| 4 - Code       | `4-code`       | Can't be run in assisted workflow   |
| 5 - Docs       | `5-docs`       | Can't be run in assisted workflow   |

## 4. Execute the phase

Create the phase subfolder inside the artifacts folder. Creating the folder marks the phase as **in progress**; completion is determined separately by the **Per-phase completion** predicate in `pipeline-versioning.md`. Run the phase per its reference.

You write the artifacts yourself. After the owner explicitly approves the final artifact(s), write the per-phase **approval file** (`<artifact>-review-approved.md`) capturing the owner's approval as the reviewer-equivalent for assisted mode — see the phase reference for the exact filename(s) and template. Commit the final artifacts and the approval file(s) together in a single commit following the **Commit format** convention. The approval file is what makes the phase satisfy the completion predicate in `pipeline-versioning.md`, the same way an autonomous reviewer's `-approved.md` does.

## 5. Report and close out

Once the phase's completion predicate is satisfied, give the owner a short report: which phase completed, where its artifacts live, and any notes worth surfacing. Then tell the owner that the assisted run is complete — continuing to a later phase happens in a separate session.
