# opencode Rules

When the active agentic coding tool is opencode, use the opencode-specific worktree, team, model, and supervision mechanics below.

## Canonical `.rp.md` content for opencode

```markdown
## Worktrees

Create and enter the worktree with plain git: `git worktree add -b worktree-<pipeline-slug> <path> <base>`.

An opencode instance's working directory is fixed at process launch and immutable for the session, so the session that created the worktree at the main checkout cannot become the worktree-rooted lead. After creating the worktree, launch a fresh opencode instance rooted inside it — `opencode <path>` for the interactive TUI, `opencode run --dir <path>` for automation. That instance is the lead/orchestrator, and every spawned teammate uses the worktree as `cwd`, never the main checkout.

Remove the worktree at close-out with `git worktree remove <path>`.

## Branch names

Use `worktree-<pipeline-slug>`; this is the branch argument passed to `git worktree add -b`.

## Team spawning

Use one ensemble team per pipeline. Spawn each agent with `team_spawn({ name, agent, prompt, model, worktree: false })`. Pass `worktree: false` for every agent type, unconditionally: it neutralizes ensemble's per-teammate worktree and squash-merge. Ensemble's read-only auto-detection only matches the literal agent strings `plan` and `explore`, which no Radical Pipelines agent satisfies.

Agents address each other directly via `team_message` (direct) and `team_broadcast` (all). When a phase reference says two agents exchange messages, the orchestrator does not relay between them by default. It only spawns, monitors, and waits for completion signals. If an exchange fails — the target agent is unreachable, errors out, or stops responding — the orchestrator steps in to repair it; once the exchange is healthy again, the agents resume talking directly.

The team includes a shared task board (`team_tasks_add` / `team_tasks_list` / `team_tasks_complete` / `team_claim`, with `depends_on` for dependencies). Idle teammates may be nudged to claim unassigned, unblocked tasks from it, so track phase progress in the per-phase artifact subfolders, never on the board.

On an auth/login or fast-idle escalation for a spawned agent, do not run interactive login (`opencode auth login` / `opencode providers login`): run `opencode models`, pick an authenticated `provider/model` **other than the one that just failed**, and re-spawn with that model and `worktree: false`. This recovery model is distinct from the per-agent **Agent models** config. If no authenticated alternative is available, escalate to the owner.

## Agent models

Use provider-qualified `provider/model` strings. The orchestrator reads each value from this `.rp.md`'s Agent-models table and passes it as the `model` argument of `team_spawn` — the highest-precedence path in ensemble's model resolution. When no per-agent value is set, fall back to the project-wide default.

## Health monitoring

Ensemble supervision is always-on for spawned teammates (stalls, message failures, auth/login, network); there is nothing to launch, list, or cancel. Conditions surface to the lead session; the orchestrator reacts within the 2-retry budget in `reference/health-monitoring.md` and escalates on the 3rd occurrence. Supervision thresholds live in `.opencode/ensemble.json`.

Two conditions fall outside this supervision: the lead session's own auth/network failures are not auto-supervised — they surface in the owner's own session — and the hard-timeout path aborts and toasts but does not message the lead, so the orchestrator covers that detection by monitoring completion signals.
```

## Setup actions

opencode requires the Radical Pipelines agent definitions and skill tree to be discoverable, and ensemble to be tuned for Radical Pipelines. Step 3 of `setup.md` performs these after conventions have been collected.

### Runtime prerequisite check

Check first for Node ≥ 24 (for `node:sqlite`) or Bun ≥ 1.0. If neither is met, surface the prerequisite to the owner and do not declare opencode ready.

### Check existing agent installations

Check whether the required agents (for the target phase and execution mode) are already discoverable by opencode. Report which are present and which are missing. If all required agents are present, this step is a no-op.

### Install missing agents

Ask the owner whether to install the missing agents. Confirm the destination before writing.

Choose the install location based on the **Artifact storage** convention:

- **`artifacts-in-repo`** — recommend the committed `.opencode/agent/` (team picks them up on clone). Offer `~/.config/opencode/agent/` as a per-user fallback.
- **`artifacts-in-fork`** — recommend `.opencode/agent/` in the fork (committed to fork branches; cherry-picks to upstream exclude them). Offer `~/.config/opencode/agent/` for solo contributors who do not want to push agents to the fork.

### Install the bundled skill tree

Install the bundled skill tree to `.opencode/skill/radical-pipelines/` (committed) or `~/.config/opencode/skill/radical-pipelines/` (per-user), matching the agent destination, so an owner whose repo lacks the skill tree obtains it.

### Write `.opencode/ensemble.json`

Tune ensemble for Radical Pipelines: `mergeOnCleanup: false`, `stallThresholdMs: 300000`, and `timeoutMs: 1800000`.

### Plugin configuration

List only the Radical Pipelines meta-plugin in opencode's plugin configuration, never ensemble alongside it. Listing both double-initializes ensemble — two watchdogs and a dashboard port collision.

### Verify discovery

After installation, direct the owner to verify the agents are discoverable by opencode before proceeding.
