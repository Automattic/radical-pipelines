# Reviews: re-run the whole pipeline as additional runs (base + review-N) on the same branch

> Source: GitHub issue [Automattic/radical-pipelines#95](https://github.com/Automattic/radical-pipelines/issues/95).
> This document is the self-contained prompt for the pipeline. It captures the raw request as the owner framed it. The goal, constraints, and context below are the owner's current thinking, explicitly open for the later phases to confirm or revise through their own research — they are not settled requirements or design decisions.

## Goal

The owner can request a **review** of a pipeline and have the requested changes applied by running the **whole pipeline again** (prompt → spec → design doc → plan → code → docs) as an additional run layered on top of the existing work, on the **same branch and worktree**.

## Constraints

- A review re-runs the **entire pipeline from scratch**: a new prompt → a new spec (from that prompt) → a new design doc (from that spec) → a new plan (from that design doc) → code and docs (from that plan). The agent profiles stay the same (or very nearly so).
- The **only** difference from the base run is that the branch/worktree already contains the previous runs, so agents build on top of existing code rather than an empty tree. Reviews stay on the **same branch and worktree** as the pipeline — never a new branch (this is what distinguishes a review from a fork).
- The original issue and the base prompt are **never** rewritten. Each review is driven by its **own new prompt**, generated the same way an issue is (Goal/Context/Constraints/…).
- The new prompt must also include a reference to where the review came from to provide context — for example, if it was a conversation with a user or if it came from a GitHub comment or review, etc.
- Artifacts are organized into sibling **run folders** at the root of the pipeline's artifact folder: `base`, then `review-1-<short-description>`, `review-2-<short-description>`, … Each run folder holds the full phase structure (`0-prompt` … `5-docs`). `base/0-prompt` is the issue; `review-N-<short-description>/0-prompt` is that review's prompt.
- Reviews run **sequentially**, not in parallel. (Parallel runs would require extra worktrees and are out of scope here.)
- The prompt format and its generation are now shared between issue creation, base-prompt-generation and review-prompt generation, so the shared parts must be **factored into common files with no duplication in the skill**.
- **Naming:** `reviews` is the user-facing concept ("I want a review of this pipeline"); the first run folder is `base` and subsequent ones are `review-N-<short-description>` (the `-<short-description>` suffix mirrors the pipeline slug naming).
- **Prior-run awareness:** a review is agnostic to previous runs.
- **Orchestrator judgment:** for drastic changes the orchestrator may recommend a from-scratch fork instead of a review.

## Context

- The elegance is that **almost nothing changes in the agents**. A review is just the pipeline run again, except its branch already carries prior runs — so the same spec → design → plan → code → docs flow naturally produces only the incremental change.
- **Splitting one input into multiple reviews:** if the owner surfaces several apparently unrelated changes at once, the orchestrator can suggest capturing them in **separate reviews (one per change)** to run **sequentially** (`review-1-<short-description>`, then `review-2-<short-description>`), so unrelated changes can be inspected separately.
- **Consolidation at close-out:** a pipeline ends up with several prompts/specs/design-docs/plans. This is out of scope for this issue and will be added once we add the cleanup phase.

## Related

- Supersedes #58 (`review-pipeline.md` reference) — reviews are a whole way of working, not a single reference file.
