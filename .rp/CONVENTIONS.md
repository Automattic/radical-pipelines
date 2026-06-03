# Radical Pipelines project conventions

This file holds the conventions for this project. The shared section applies to every agentic coding tool used here; the per-tool sections add conventions specific to Claude Code and Pi. Read the shared section plus the section for the active tool at the start of any workflow.

## Shared conventions

### Managing tasks

All tasks are tracked in two mirrored trackers. **GitHub is the source of truth**; Linear mirrors it for status tracking only.

- **GitHub**: https://github.com/Automattic/radical-pipelines — accessed via the `gh` CLI.
- **Linear**: the Linear project with id `15a89be6fe3c` — accessed via the Linear MCP.

#### Creating an issue

1. Create the issue in GitHub first with `gh`.
2. Once the GitHub URL is known, create a matching Linear issue in the project above via the Linear MCP, with:
   - The same title.
   - A description containing **only** the GitHub issue URL.
   - The `radical-pipelines` label.

#### Modifying an issue

Edit the GitHub issue with `gh`. Do not touch the Linear copy — the GitHub URL in its description is enough for traceability.

#### Orchestrator updates during a run

In addition to the normal pipeline workflow, the orchestrator must keep the Linear issue in sync with pipeline activity and push the pipeline branch at the end of every run.

All Linear operations use the Linear MCP. To find the Linear issue that mirrors a given GitHub issue, search Linear via the MCP for the GitHub issue URL — it lives in the Linear issue's description.

- **At run start** — add the `running…` label to the Linear issue before launching anything.
- **At run end** — remove the `running…` label. This applies to every outcome: normal close-out, blockers, owner-cancelled runs, and failures.
- **Push at run close-out** — push the pipeline branch to the remote. This happens after the final commit of the run has landed locally and applies to every outcome: normal close-out, blockers, owner-cancelled runs, and failures.
- **When a phase finishes** — set the Linear issue status to match the phase that just satisfied its completion predicate: `0 - Prompt` after the pipeline is created, then `1 - Spec`, `2 - Design Doc`, `3 - Plan`, `4 - Code`, `5 - Docs` as each phase completes. Update the status **immediately when the phase finishes**, before launching the next phase — never wait until the end of the run.
- **Pipeline version label** — when starting work on a pipeline (creating, resuming, or forking), make sure the Linear issue carries exactly one version label matching the active pipeline (`v1`, `v2`, …). Remove any other version labels first, then add the current one if it isn't already present.

These updates apply to both autonomous and assisted runs.

### Pipeline slugs

Use `<issue-number>-<short-description>` where `issue-number` is the **GitHub** issue number. Even though a parallel Linear issue exists, the slug always keys off the GitHub id — never the Linear id.

### Artifact folders

Use `.rp/pipelines/<slug>`.

### Commit format

Use imperative mood, sentence case, no period at the end. Include the name of the agent in parenthesis.

Examples:

- `Add prompt (orchestrator)`
- `Add spec (spec-reviewer)`
- `Support for X (implementer)`

## Claude Code

These conventions apply when the active agentic coding tool is Claude Code.

### Claude Code worktrees

Folder: `.claude/worktrees/<pipeline-slug>`
Enter worktree: `EnterWorktree` with name: `<pipeline-slug>`
Exit worktree: `ExitWorktree` with name: `<pipeline-slug>`

### Branch names

Created automatically by `EnterWorktree`: `worktree-<pipeline-slug>`

### Team spawning

Use `TeamCreate`.

### Health monitoring

Use Claude Code's bundled `/loop` skill — no install required. Only the autonomous workflow launches the monitor; assisted runs do not.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `skills/radical-pipelines/reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.

The orchestrator starts the loop itself.

## Pi

These conventions apply when the active agentic coding tool is Pi.

### Pi prerequisites

This project requires the Radical Pipelines Pi package, which bundles `pi-teams`, `@zenobius/pi-worktrees`, and `@pi-agents/loop`. If it is missing, install it manually from the repository root:

```bash
pi install . -l
```

### Pi worktrees

This project uses the `@zenobius/pi-worktrees` plugin. Always use `/worktree` commands — never raw `git worktree` commands.

**One-time setup** (only needed once per machine, sets the worktree root for this project):

```
/worktree settings worktreeRoot .pi/worktrees
```

- **Create:** `/worktree create worktree-<pipeline-slug> --name <pipeline-slug>`
- **Remove:** `/worktree remove <pipeline-slug>`

### Pi branch names

Created as `worktree-<pipeline-slug>` (the branch argument passed to `/worktree create`).

### Pi team spawning

Use `pi-teams`.

When spawning a Pi teammate, prefer an explicit provider-qualified model (`provider/model`) from the owner's authenticated providers instead of an ambiguous bare model name.

If a spawned Pi teammate fails with a provider login or API-key error:

1. Treat the failed provider as unavailable for this retry unless the owner explicitly asked to use that provider.
2. Do not run `/login` or ask for credentials as the first recovery step.
3. Run `pi --list-models` from the same environment used to spawn teammates.
4. Choose a provider-qualified replacement model from authenticated providers. Prefer the owner's configured default provider/model when present; otherwise choose the closest suitable authenticated model for coding work.
5. Retry the spawn with the explicit `provider/model` value. Reusing the same teammate name is acceptable when `pi-teams` replaces or kills the failed teammate automatically; otherwise remove or rename the failed teammate before retrying.
6. If no authenticated model is available, stop and tell the owner which provider failed and that they need to authenticate a provider or pass an explicit provider-qualified model.

Keep this recovery provider-neutral. Do not hardcode any provider as the fallback default.

### Pi agent setup

Before launching a Pi team, verify the required phase agent definitions are discoverable by checking repository-local `.pi/agents/` first, then user-local/global `~/.pi/agent/agents/`.

For this repository, the canonical phase agent source files live in `agents/`. If required agents are missing from both Pi discovery locations, stop and ask the owner which Radical Pipelines agents to copy/paste and install, and whether to install them repository-locally in `.pi/agents/` or user-locally/globally in `~/.pi/agent/agents/`.

### Pi health monitoring

Use the `@pi-agents/loop` package, bundled by the Radical Pipelines Pi package. It ships the same `/loop` syntax as Claude Code's bundled skill, plus `/loop-list` and `/loop-kill`. Only the autonomous workflow launches the monitor; assisted runs do not.

- **Start:** `/loop 5m <prompt>` where `<prompt>` is the template from `skills/radical-pipelines/reference/health-monitoring.md`.
- **List active loops:** `/loop-list`.
- **Cancel:** `/loop-kill <id>` using the id returned at start.

The orchestrator starts the loop itself.
