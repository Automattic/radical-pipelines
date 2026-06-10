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

Create the phase 0 subfolder (`0-intent/`) inside the artifact folder. Write `intent.md` to `<artifacts-folder>/0-intent/intent.md`.

`intent.md` is **always** written in the canonical intent format defined in `manage-issues.md` — that file is the source for the heading taxonomy; do not re-list the sections here. Scaffold the file as:

- An **H1 equal to the issue title** — never a phase name (not `# Intent`, not `# Prompt`).
- A `> Source:` attribution blockquote naming the originating issue and stating the phase 0 subfolder is self-contained, so once committed agents do not need to open the issue or reach back to its source to understand it.
- The body sections: `## Goal` (required, non-empty) followed by any of `## Constraints`, `## Context`, `## Assumptions / directions to explore`, in that order. Omit empty sections — no `N/A` placeholders. A body of Goal alone is a complete, valid intent.

If the issue has screenshots or other assets, download them — on both paths below — using the access mechanism captured by the **Issues** convention, into `<artifacts-folder>/0-intent/`, and reference them by relative path in `intent.md`.

Skip owner confirmation only when **all three** of these hold (in any order — they are an unordered conjunction, and all three holding *is* what "no transformation" means; do not add a separate check of whether the result transforms the source):

- **A — the issue body is structurally canonical.** A purely structural check: (i) a non-empty `## Goal`; (ii) every section present is one of the four recognized headings, spelled exactly as in `manage-issues.md` (the heading taxonomy lives there — do not re-list it); (iii) the sections appear in the prescribed order; (iv) nothing outside those sections — no preamble prose under the H1, no extra or unrecognized headings. The issue title is metadata that becomes the H1 and does **not** participate in this check; a body of `## Goal` alone passes. Structural only — do not judge whether the Goal reads as an outcome. Allow no tolerant matching of near-miss headings: e.g. `## Directions to explore` fails.
- **B — the issue has no comments.** A strict zero-count read via the **Issues** convention: any comment at all — from any author, for any reason — fails this, with author and substance unassessed. Count against the issue that is the source of truth; comments mirrored elsewhere (e.g. Linear) are not considered.
- **C — the body contains no references.** A body-only scan. Counts as a reference: an external URL (`http(s)://…`) or a GitHub cross-reference to another issue/PR (short `#N`, long `owner/repo#N`, or a full GitHub issue/PR URL). Does **not** count: @-mentions, embedded images / attached assets (the `![…]` form, already handled by the asset step above), and links to files in the repository. Apply it as prose against the body only — not a literal regex.

- **If all three hold**, map the body's sections to `intent.md` unchanged — under the issue-title H1 and `> Source:` attribution above — do not synthesize, and proceed to commit without confirmation. The incidental, format-level differences this produces — the title becoming the H1, the added source attribution, whitespace, a trailing newline — are not a transformation and do not require confirmation. Write no approval or review file; reach the commit via step 5 below.

- **If any fails**, synthesize the intent from the full picture, then confirm it with the owner before committing. A failing clause is the trigger: the orchestrator had to look beyond the bare body and exercise judgment, and that judgment is what the owner verifies — so the confirmation is owed even if the synthesized result happens to resemble the body. Never re-inspect the result for resemblance to decide whether to skip; there is no escape hatch.
  - **Read the full picture.** Synthesize from the issue body, **all** of its comments (read via the **Issues** convention), and the content any references in the body or comments point to — external URLs through the active tool's **web-fetch capability**, GitHub cross-references through the **Issues** convention. The boundary is one level: references found in the body or comments are read; references found *inside* those fetched sources are not followed further.
  - **Sort each piece into its canonical section** per the format in `manage-issues.md` — that file supplies both the input→section classification rule and the content guardrails (Goal as an outcome, hypotheses labeled open, never substitute a different goal); do not re-list them here. Material drawn from comments or referenced sources is sorted the same way and is **not** more authoritative than the body merely because it appears later in the conversation.
  - **Stay faithful to the source.** Do not add requirements, technical directions, design, or implementation details the source did not contain — agents do their own research in later phases. Keep the Goal an outcome, not a solution, and keep hypotheses or proposed approaches labeled open rather than promoted to requirements.
  - **Confirm before committing.** Show the owner the **full proposed `intent.md`** as the thing to review — never a diff or a bare list of changes; a brief optional note on what was drawn from comments or references may accompany it but never replaces it. On a correction request, revise the proposed `intent.md` and show it again; repeat until the owner explicitly approves. Commit only on explicit approval, following the render→show→approve idiom of `manage-issues.md`; reach the commit via step 5 below. This confirmation gates the single commit of `intent.md` and writes no approval or review file.

### 5. Commit

Commit the newly created artifacts following the **Commit format** convention.
