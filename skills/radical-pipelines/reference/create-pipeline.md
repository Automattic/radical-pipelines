# Creating a Pipeline

Creates a new pipeline through phase 0 — sets up the worktree and artifacts folder, writes `prompt.md`, and commits.

## Steps

### 1. Determine the pipeline base slug

Generate the pipeline base slug following the **Pipeline base slug** convention. For `v1` this is also the pipeline's versioned slug.

### 2. Create and enter the worktree

Create and enter the worktree following the **Worktrees** convention. The corresponding branch is created as described in the **Branch names** convention.

All work happens inside the worktree — never modify files in the main working directory.

### 3. Create the artifact folder

Create the folder following the **Artifact folder** convention.

### 4. Generate the initial prompt

Create the phase 0 subfolder (`0-prompt/`) inside the artifact folder. The prompt lives at `<artifacts-folder>/0-prompt/prompt.md`; synthesize it from the issue and show it to the owner, writing and committing only once they approve.

**Gather the inputs.** Read the issue body and every comment, noting each comment's author. Fetch and read references cited directly in the body or any comment — GitHub-internal references through the access mechanism captured by the **Issues** convention, other references through a web fetch. Follow one hop only: references found inside a fetched reference are not crawled. This is best-effort — note any reference you cannot reach and proceed on the accessible material.

**Download assets.** Download screenshots and other assets from the issue, any comment, or a cited reference (using the access mechanism captured by the **Issues** convention) into `<artifacts-folder>/0-prompt/`, before showing the draft so its links resolve. Reference them from `prompt.md` using relative paths. The phase 0 subfolder is self-contained — the committed `prompt.md` plus its assets let an agent understand the issue without reaching back to the body, the comments, or the references.

**Synthesize into the canonical format.** Reorganize the gathered material into the canonical format defined in `manage-issues.md` ("The issue format"), preserving the participants' stated intent. File hypotheses, proposed directions, and beliefs about cause or current state under **Assumptions / directions to explore**, labeled open. Keep to what the source holds: add no requirements, acceptance criteria, technical directions, design, or implementation — agents do their own research in later phases — and never substitute a different goal. When the body and comments conflict, or a later comment revises the original ask, reflect your best current reading and surface the conflict to the owner at confirmation rather than silently choosing or dropping content.

Render `prompt.md` in this wrapper: a top `# Prompt` heading; a `> Source:` blockquote pointing to the originating issue and noting the file is self-contained; then the canonical body sections as `## ` headings, empty ones omitted. Goal is always present; Constraints, Context, and Assumptions appear only when they have content.

```
# Prompt

> Source: <originating issue reference>. This file is self-contained; agents do not need to open the issue.

## Goal

<outcome>

## Constraints        ← only if present
## Context            ← only if present
## Assumptions / directions to explore   ← only if present
```

The minimal prompt is `# Prompt`, the source line, and `## Goal`.

**Confirm, then write and commit.** Show the owner the full rendered `prompt.md` text — the exact content to be written, not a summary — together with any surfaced conflicts. If they request changes, revise and show again. On explicit approval, write `prompt.md` and commit it, in that order, following the **Commit format** convention. Nothing is written to disk before approval.
