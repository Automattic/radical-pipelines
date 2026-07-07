# Creating a Pipeline

Creates a new pipeline through phase 0 — the base run branch and worktree, the artifact folder, and a committed `intent.md`.

## Steps

### 1. Determine the family identifiers

Derive the `<branch-base>` per the **Branch names** convention and the artifact folder per the **Artifact folder** convention. Both are deterministic from the issue.

### 2. Determine the start ref

The start ref is the project's main branch. When the owner stacks on unmerged work, it is that pipeline's run-branch tip (see "Start refs" in `pipeline-versioning.md`); ask which one only in that case.

### 3. Create the base run branch and worktree

Create the base run branch — named `<branch-base>` (`v1` and `base` implicit) — at the start ref, and its worktree per the **Worktrees** convention. Operate from where you are: address the worktree by absolute path and run git through `git -C <worktree>`.

### 4. Create the artifact folder

Inside the worktree, create the artifact folder containing:

- `pipeline.md` — the identity file: `version: v1` and `start: <commit>` (the start ref's resolved commit).
- `base/0-intent/` — the base run's phase-0 folder.

### 5. Author the intent

Read the issue in full through the **Issues** convention: body, all comments, in-tracker cross-references, external links, and attachments.

**If** the body is already in the canonical format of `intent-format.md` and the issue has nothing else — no comments, references, links, or attachments: write it to `<artifact-folder>/base/0-intent/intent.md` adding only the provenance header (per `intent-format.md`) and proceed to step 6.

**Otherwise:**

- **Fetch external links** with your own web-access tooling. Follow references one level only — deeper exploration belongs to phase 1. Note unreadable references in the draft (e.g. under Context).
- **Synthesize** the material into the intent following the schema and authoring discipline in `intent-format.md`: fold in the substance of comments, references, and pages (links remain convenience pointers), capture the latest agreed state of the conversation, and record unsettled proposals from any participant as open Assumptions.
- **Download screenshots or other assets** into `<artifact-folder>/base/0-intent/` and reference them in `intent.md` by relative path.
- **Show the rendered draft** (with provenance header) to the owner and write `intent.md` only on explicit approval.

The phase-0 folder must be self-contained — once committed, agents must not need to reach back to the issue source to understand the issue.

### 6. Commit

Commit the newly created artifacts following the **Commit format** convention.
