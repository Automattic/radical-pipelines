# Running the Spec Phase (Phase 1, Autonomous Workflow)

This is the phase-1 step of the **autonomous workflow**. It advances the pipeline from phase 0 (`prompt.md`) to phase 1 (`spec.md`) and assumes phase 0 has already finished, the worktree is set up, and the autonomous run plan was confirmed during `running-the-autonomous-workflow.md`.

Inputs:

- `<artifacts-folder>/prompt.md`

Output:

- `<artifacts-folder>/spec.md`

## Decisions

These are the choices the orchestrator collects during planning (see `running-the-autonomous-workflow.md`) before launching this phase as part of the autonomous run.

- **Generation mode** (default: `single`):
  - `single` — one `spec-writer` drafts the spec; one `spec-reviewer` reviews adversarially. The writer revises until the reviewer approves or the iteration cap is reached.
  - `multi` — N parallel `spec-writer` instances each produce a draft. A `spec-consolidator` merges them into the final spec.
- **Multi count** (default: `3`) — only relevant when `Generation mode` is `multi`. The number of parallel writers.

## Required agents

The skill assumes the project's team-spawning convention provides these agents by name:

- `spec-writer`
- `spec-reviewer` — used in `single` mode.
- `spec-consolidator` — used in `multi` mode.

## Steps

### 1. Verify the input

Confirm `<artifacts-folder>/prompt.md` exists. If it does not, stop and report — phase 1 cannot run without phase 0's output.

### 2. Launch the chosen mode

Use the project's **Spawning teams of agents** convention to launch the agents. Verify the convention's exact operational semantics before invoking it (see `SKILL.md` → "Tool-backed conventions").

Every agent launch prompt must include the resolved pipeline slug, the resolved artifact folder path, the exact input and output artifact paths for that role, and the role-specific conventions named in the agent profile. Reviewer launch prompts must also include the current review iteration number and exact review artifact path. Do not ask phase agents to infer artifact locations from a generic folder pattern.

#### `single` mode

1. Launch `spec-writer` with `prompt.md` as input. The writer produces `<artifacts-folder>/spec.md`.
2. Launch `spec-reviewer` with the current review iteration number and review artifact path. It reads `prompt.md` and `spec.md`, then writes `<artifacts-folder>/spec-review-N.md` (N starts at 1).
3. If the review approves, the spec is final.
4. If the review rejects, relaunch `spec-writer` with the review feedback. The writer revises `spec.md`. Go back to step 2 with N+1.
5. Stop after a reasonable iteration cap (default 3 writer/reviewer rounds). If the cap is reached without convergence, stop the workflow and report to the owner.

#### `multi` mode

1. Launch N `spec-writer` instances in parallel, where N is the **Multi count** decision. Each writer produces `<artifacts-folder>/spec-draft-K.md` (K = 1..N).
2. Launch `spec-consolidator`. It reads all drafts and `prompt.md`, then writes `<artifacts-folder>/spec.md`.

### 3. Commit

Commit the phase-1 artifacts following the project's **Commits** convention. The agent name in the commit message reflects the agent that produced the final `spec.md`:

- `single` mode: `spec-writer`.
- `multi` mode: `spec-consolidator`.

Intermediate artifacts (`spec-review-N.md`, `spec-draft-K.md`) are committed using their respective agent names. Whether they share the same commit as the final `spec.md` or get separate commits is governed by the project's **Commits** convention.

### 4. Report

Tell the owner:

- Which mode ran and any non-default choices applied.
- Where `spec.md` was written.
- Any intermediate artifacts produced (drafts, reviews).
- Whether the autonomous run continues to the next phase or stops here, per the plan.
