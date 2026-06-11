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

Read the issue body and enumerate its comments, its in-tracker cross-references, its external links, and its binary attachments — all tracker-side reads through the **Issues** convention. This enumeration is what the branch below is evaluated against.

**If** the issue body is already in the canonical format of `intent-format.md` (H1 title present; `## Goal` present; only the allowed optional H2s; nothing else — and synthesis would be a no-op) **and** there are no comments, no in-tracker cross-references, no external links, and no binary attachments: write the body to `intent.md` unchanged apart from the provenance header (applied per `intent-format.md`), with no owner confirmation, and proceed to step 5.

**Otherwise:**

- **Read all comments** and the substance of in-tracker cross-references through the **Issues** convention; fetch external URLs using the orchestrator's own web-access tooling (a separate channel from the Issues convention); follow references one level only — deeper exploration belongs to phase 1; a reference that cannot be read (unreachable, deleted, private, or auth-walled) is noted visibly in the draft (e.g. under Context) rather than dropped.
- **Synthesize** the gathered material into the intent, following the schema and authoring discipline in `intent-format.md` — fold the substance of comments, references, and pages into `intent.md` with links kept only as convenience pointers; capture the latest agreed state of the conversation; record unsettled proposals — including proposals from participants other than the owner — as open Assumptions per `intent-format.md`.
- **If the issue has screenshots or other assets,** download them (using the access mechanism captured by the **Issues** convention) and place them in `<artifacts-folder>/base/0-intent/`. Reference them explicitly in `intent.md` using relative paths.
- **Render the draft intent** (with the provenance header) and show it to the owner — surfacing any unresolved references — and do not write `intent.md` until the owner explicitly approves; write the file on approval. This is a transient interactive gate: no approval artifact is produced.

The phase 0 subfolder must be self-contained — once committed, agents must not need to reach back to the issue source to understand the issue.

### 5. Commit

Commit the newly created artifacts following the **Commit format** convention.
