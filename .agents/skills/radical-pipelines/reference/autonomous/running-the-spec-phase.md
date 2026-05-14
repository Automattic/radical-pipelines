# Running the Spec Phase (Phase 1, Autonomous Workflow)

This is the phase-1 step of the **autonomous workflow**. It advances the pipeline from phase 0 (`prompt.md`) to phase 1 (`requirements.md` and `spec.md`) and assumes phase 0 has already finished, the worktree is set up, and the autonomous run plan was confirmed during `running-the-autonomous-workflow.md`.

The autonomous spec phase has two stages:

1. **Requirements Q&A** — a persistent spec-analyst and researcher run an iterative one-question-at-a-time loop, routed through you, that produces `requirements.md`.
2. **Spec generation** — either a writer/reviewer revision loop (`single` mode) or a fan-out/consolidate flow (`multi` mode) produces `spec.md`.

Inputs:

- `<artifacts-folder>/prompt.md`

Outputs:

- `<artifacts-folder>/requirements.md`
- `<artifacts-folder>/spec.md`
- Intermediate artifacts depending on mode (`spec-review-N.md`, `spec-draft-K.md`).

## Decisions

These are the choices the orchestrator collects during planning (see `running-the-autonomous-workflow.md`) before launching this phase as part of the autonomous run.

- **Generation mode** (default: `single`):
  - `single` — one `spec-writer` drafts the spec; one `spec-reviewer` reviews adversarially. The writer revises until the reviewer approves or the iteration cap is reached.
  - `multi` — N parallel `spec-writer` instances each produce a draft. A `spec-consolidator` merges them into the final spec.
- **Multi count** (default: `3`) — only relevant when `Generation mode` is `multi`. The number of parallel writers.
- **Q&A iteration cap** (default: `unlimited`) — maximum number of spec-analyst↔researcher rounds before you stop the loop and report. Use a finite cap if you want a hard ceiling on token spend; the default trusts the spec-analyst's "requirements complete" signal.
- **Spec iteration cap** (default: `3`) — only relevant when `Generation mode` is `single`. Maximum writer/reviewer rounds before you stop and report.

## Required agents

The skill assumes the project's team-spawning convention provides these agents by name:

- `spec-analyst` — persistent. Drives the Q&A.
- `researcher` — persistent. Answers the spec-analyst's questions.
- `spec-writer` — used in both modes.
- `spec-reviewer` — used in `single` mode.
- `spec-consolidator` — used in `multi` mode.

## Steps

### 1. Verify the input

Confirm `<artifacts-folder>/prompt.md` exists. If it does not, stop and report — phase 1 cannot run without phase 0's output.

### 2. Run the requirements Q&A loop

Use the project's **Spawning teams of agents** convention to launch the persistent agents. Verify the convention's exact operational semantics before invoking it (see `SKILL.md` → "Tool-backed conventions"). Every spawn prompt must begin with the standard agent spawn context — see `../agent-spawn-context.md`.

1. Launch `spec-analyst` and `researcher` together as persistent agents. Both must stay alive for the full Q&A.
2. The spec-analyst reads `prompt.md`, creates `<artifacts-folder>/requirements.md` with the rough idea at the top, and asks its first question.
3. Forward each spec-analyst question to the researcher and forward each researcher answer back to the spec-analyst. Do not paraphrase, summarize, or filter the messages — relay them verbatim. Humans never enter this loop.
4. The spec-analyst appends every question and answer to `requirements.md` as the loop runs.
5. The loop stops when the spec-analyst signals **requirements complete** (it appends a `## Consolidated Requirements` section and commits `requirements.md` with the agent name `spec-analyst`).
6. If the **Q&A iteration cap** is set and reached before the spec-analyst signals completion, stop the loop and report to the owner with the partial `requirements.md`.

After the loop ends, terminate the persistent agents.

### 3. Launch the chosen spec generation mode

Every spawn prompt in the modes below must begin with the standard agent spawn context — see `../agent-spawn-context.md`.

#### `single` mode

1. Launch `spec-writer` with `prompt.md` and `requirements.md` as input. The writer produces `<artifacts-folder>/spec.md` and commits it with the agent name `spec-writer`.
2. Launch `spec-reviewer`. It reads `prompt.md`, `requirements.md`, and `spec.md`, then writes `<artifacts-folder>/spec-review-N.md` (N starts at 1) and commits it with the agent name `spec-reviewer`.
3. If the review approves, the spec is final.
4. If the review rejects, relaunch `spec-writer` with the latest `spec-review-N.md` referenced in the prompt. The writer revises `spec.md` and commits the revision with the agent name `spec-writer`. Go back to step 2 with N+1.
5. Stop after the **Spec iteration cap** (default `3` writer/reviewer rounds). If the cap is reached without convergence, stop the workflow and report to the owner with the latest `spec.md` and `spec-review-N.md`.

#### `multi` mode

1. Launch N `spec-writer` instances in parallel, where N is the **Multi count** decision. Tell each writer to write to `<artifacts-folder>/spec-draft-K.md` (K = 1..N) instead of the default `spec.md`. Each draft is committed with the agent name `spec-writer`.
2. Launch `spec-consolidator`. It reads `prompt.md`, `requirements.md`, and all `spec-draft-K.md`, then writes `<artifacts-folder>/spec.md` and commits it with the agent name `spec-consolidator`. If the consolidator surfaces TODOs it could not resolve, include them when reporting.
