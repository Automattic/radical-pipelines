# Creating a Pipeline

Creates a new pipeline through phase 0 — sets up the worktree and artifacts folder, writes `intent.md`, and commits.

## Steps

### 1. Determine the pipeline base slug

Generate the pipeline base slug following the **Pipeline base slug** convention. For `v1` this is also the pipeline's versioned slug.

### 2. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

All work happens inside the worktree — never modify files in the main working directory.

### 3. Create the artifact folder

Create the folder following the **Artifact folder** convention.

### 4. Generate the initial intent

Phase folders live under a run folder, and the first run is always `base` (see **Runs within a pipeline** in `pipeline-versioning.md`). Create the `base/` run folder and the phase 0 subfolder under it (`base/0-intent/`) inside the artifact folder. Write the intent to `<artifacts-folder>/base/0-intent/intent.md`.

Read the issue in full through the **Issues** convention: body, all comments, in-tracker cross-references, external links, and attachments.

**If** the body is already in the canonical format of `intent-format.md` and the issue has nothing else — no comments, references, links, or attachments: write it to `intent.md` adding only the provenance header (per `intent-format.md`) and proceed to step 5.

**Otherwise:**

- **Fetch external links** with the orchestrator's own web-access tooling. Follow references one level only — deeper exploration belongs to phase 1. Note unreadable references in the draft (e.g. under Context).
- **Synthesize** the material into the intent following the schema and authoring discipline in `intent-format.md`: fold in the substance of comments, references, and pages (links remain convenience pointers), capture the latest agreed state of the conversation, and record unsettled proposals from any participant as open Assumptions.
- **Download screenshots or other assets** into `<artifacts-folder>/base/0-intent/` and reference them in `intent.md` by relative path.
- **Show the rendered draft** (with provenance header) to the owner and write `intent.md` only on explicit approval.

The phase 0 subfolder must be self-contained — once committed, agents must not need to reach back to the issue source to understand the issue.

### 5. Commit

Commit the newly created artifacts following the **Commit format** convention.
