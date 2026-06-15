# Code Plan: Fresh, working team per run

## Overview

The change replaces the fixed slug team name with a per-creation unique name `<pipeline-slug>-<random-token>`, and aligns the two places that reference the team name. All edits are to skill instruction files plus this repo's deployed convention file; no runtime code is involved. Three tasks: define the naming rule (in both the canonical convention and the deployed `.rp.md`), correct the review procedure's reuse wording, and make the health-monitor prompt use the actual created team name. Worktree and branch naming are deliberately left untouched.

## Tasks

### Task 1: Define the unique team-naming rule (canonical convention + deployed `.rp.md`)

- **Goal:** Replace the slug-as-team-name rule with a per-creation unique, slug-traceable name, stated identically in the canonical convention and the deployed convention file.
- **Files to change:**
  - `skills/radical-pipelines/reference/conventions/claude-code.md` (Team spawning section, line ~27)
  - `.rp.md` (Team spawning section, line ~72)
- **Changes:**
  - In the canonical convention, change `TeamCreate({ name: "<pipeline-slug>" })` so the team name is `<pipeline-slug>-<random-token>`: the pipeline slug as a prefix plus a short random token generated fresh at each creation. State that the name must be unique to each creation (so a new run never collides with a team left by a prior run/session) and that the slug prefix keeps an orphaned team attributable to its pipeline. Do not add clash-detection/regeneration — probabilistic uniqueness via the random token is sufficient.
  - Mirror the same rule into the deployed `.rp.md` Team spawning section (currently only "Use `TeamCreate`.") so both copies agree.
  - Honor the skill's editing rules: minimal wording, no duplication across reading paths, keep tool-specific detail within the Claude Code convention.
- **Depends on:** none
- **Traces to:** Design decisions 1, 2, 3; Acceptance criteria 1, 2, 3
- **Acceptance:**
  - The Claude Code Team spawning convention instructs creating the team with a name of the form `<pipeline-slug>-<random-token>` (slug prefix + a random component), generated fresh per creation.
  - The convention states the name is unique per creation and never reuses/collides with a prior run's team, and that no clash-detection is required.
  - The deployed `.rp.md` Team spawning section states the same rule, consistent with the canonical convention.
  - Worktree and branch naming text in `claude-code.md` is unchanged (still `<pipeline-slug>` / `worktree-<pipeline-slug>`).

### Task 2: Correct the review procedure's team-reuse wording

- **Goal:** Stop the review procedure from implying a team is reused across runs.
- **Files to change:** `skills/radical-pipelines/reference/review-pipeline.md` (line ~54)
- **Changes:** Reword the clause "with the pipeline slug and team unchanged" so it no longer says the team is unchanged. A review, like any run, creates its own (uniquely named) team; only the pipeline slug — and therefore the worktree and branch — are unchanged.
- **Depends on:** none
- **Traces to:** Requirement 5; Acceptance criterion 4
- **Acceptance:**
  - `review-pipeline.md` no longer states or implies the team is reused/unchanged across runs.
  - The retained meaning is that the pipeline slug (worktree/branch) is unchanged, while the team is freshly created for the review run.

### Task 3: Make the health-monitor prompt use the actual team name

- **Goal:** The monitor is told the real team name the orchestrator created, not the bare slug.
- **Files to change:** `skills/radical-pipelines/reference/health-monitoring.md` (monitor prompt template, line ~57)
- **Changes:** Replace the literal `team <pipeline-slug>` in the prompt template with a reference to the actual team name created for the run (the `<pipeline-slug>-<random-token>` value the orchestrator generated), so the monitor watches the correct team.
- **Depends on:** none (logically consistent with Task 1's naming rule)
- **Traces to:** Requirement 4; Acceptance criterion 1
- **Acceptance:**
  - The monitor prompt template references the run's actual created team name rather than the bare pipeline slug.
  - The instruction is consistent with the naming rule defined in Task 1.
