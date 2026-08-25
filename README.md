# Project Description

<img alt="Radical Pipelines" src="./website/assets/radical-pipelines.svg" width="600">

An agent orchestrator that runs teams of agents autonomously through a pipeline of defined phases, where each phase produces concrete, inspectable artifacts.

## The problem

Today, most of us use agents in what we'd call "assisted mode". We give them a rough idea, they start implementing, and we sit next to them correcting the course along the way. This works, but it's a workaround for two structural gaps, not a deliberate workflow.

**The first is the lack of requirements.** Without clear specs, the agent picks a direction and the human has to steer it in real time. But agents are already capable of implementing autonomously if the requirements are well-defined. Assisted mode is a workaround for missing requirements, not a limitation of the agents themselves.

**The second is the lack of determinism.** Agent output is non-deterministic. The same prompt, the same context, can produce a different result every time. So even when the human knows exactly what they want, they still assist because the agent might take a bad path this particular run.

Beyond that:

- **Assisted mode has no structure.** There's no systematic process that guarantees the right assets get produced. Whether tests, documentation, or other artifacts get generated depends entirely on the human remembering to ask for them.

- **Assisted mode is inherently local.** The context built up along the way, the decisions made, and the intermediate output only exist on the machine of the person doing the work. The final PR is the only thing the team gets to see, which makes it hard to coordinate or have multiple people work on the same task.

## The proposal

An agent orchestrator that runs teams of agents autonomously through a pipeline of defined phases. Each phase produces concrete, inspectable assets, and the pipeline can run partially or fully without human intervention.

The phases are:

- **Phase 0. Intent.** The initial idea or request.
- **Phase 1. Spec.** Requirements, acceptance criteria and out of scope.
- **Phase 2. Design doc.** Architecture and technical decisions.
- **Phase 3. Build.** The build plan, the code with the unit and end-to-end tests its tasks call for, behavior verification, plus a summary of what the phase produced.
- **Phase 4. Document.** The document plan, both internal and external documentation, plus a summary of what the phase produced.

Planning is not a separate phase: the Build and Document phases each begin by committing a plan and getting it approved.

The Spec and Design doc phases can run **multilane**: N lanes each take the phase's full machinery to an approved artifact, and a consolidator merges them into a single consolidated artifact that passes a final adversarial review. N=1 — the default — is the plain single flow.

The pipeline is **autonomous by default, assisted when needed.** It runs on its own, but humans can intervene at any checkpoint. For particularly complex tasks, specific phases can be run in assisted mode instead.

It is **inspectable and relaunchable.** Every phase produces artifacts your team can review. If the output at any point isn't what the team expected, anyone on the team can go back to the phase where the assumptions diverged, correct them, and relaunch the autonomous sequence from there.

It can add **determinism through redundancy.** For complex tasks, you should be able to spend more tokens on the same surface with multiple runs, validation checks, adversarial agents, and different models from different providers to converge on a more reliable output.

## What this unlocks

- **Parallel throughput.** Instead of assisting one agent at a time, a human can launch multiple autonomous pipelines and review their outputs when they're done. The constraint shifts from "how many agents can I supervise" to "how many can I review".
- **Compounding quality.** When a pipeline produces a bad result, the fix lives in a specific phase (a wrong assumption in the spec, a missing constraint in the design doc). That fix improves every future run that goes through the same pipeline, not just the one that failed.
- **Consistent assets.** Tests, documentation, and other artifacts that today depend on human diligence become a planned, reviewed part of every run.
- **Shareable work-in-progress.** Because every phase produces a concrete artifact, the state of a task becomes visible across the team long before a PR exists. Multiple people can review intermediate outputs and advance the same task through the pipeline, instead of only being able to react to the final result.

## Why now

- **Agents have crossed the quality threshold.** They are already capable of executing autonomously and doing a very good job, as long as the requirements are well-defined.
- **Human attention is becoming the bottleneck.** As agent adoption grows, the limiting factor in development is no longer the agents' ability to write code, it's the human time spent assisting them. Every hour spent steering an agent in real time is an hour not spent on decisions that actually need a human. And even when agents go off track, it's more optimal to inspect where they deviated, correct the assumptions, and relaunch autonomously, rather than assisting them step by step.
- **The tooling is mature enough.** Tools like Claude Code already provide the necessary primitives (skills, teams of agents, agent definitions, hooks...) to build a pipeline like this without a large investment in custom infrastructure, and for this reason, whatever is built can evolve naturally alongside them as they improve.

## Success metrics

- **Human time per task.** For a set of representative tasks, measure the total human time spent when using the pipeline vs. assisting an agent directly. The pipeline should require significantly less human time per task.
- **Pipeline completion rate.** Percentage of tasks that make it from intent to finished implementation through all phases without requiring human intervention. A higher rate means the pipeline is genuinely autonomous, not just deferring work to the human at every checkpoint.
- **Relaunch efficiency.** When a human identifies a problem and corrects a specific phase, how many relaunch attempts does it take to reach an acceptable result? Fewer rounds means the pipeline is surfacing the right information for the human to make effective corrections.
- **Autonomy ratio.** For each task, the number of phases that ran autonomously vs. the number that required human intervention. Tracking this across tasks shows whether the pipeline is trending toward more autonomy over time, or whether certain phases consistently need a human.

# Project Usage

The repository ships a Claude Code plugin, an opencode plugin, and a standalone [agent skill](https://agentskills.io). All three capture the same methodology so a compatible agent can run a task through the pipeline. The two plugins install per tool — see [Claude Code plugin install](#claude-code-plugin-install) and [opencode plugin install](#opencode-plugin-install).

## Claude Code plugin install

Claude Code installs plugins through marketplaces. This repository ships an `automattic` marketplace catalog (`.claude-plugin/marketplace.json`) that currently lists only the Radical Pipelines plugin (`.claude-plugin/plugin.json` at the repo root). Naming the marketplace `automattic` rather than `radical-pipelines` anticipates a future move to a centralized `Automattic/claude-plugins` repo without changing the install command users have memorized.

To install from the public repository:

```text
/plugin marketplace add Automattic/radical-pipelines
/plugin install radical-pipelines@automattic
```

To install from a local checkout instead — useful for verifying that a local edit to `marketplace.json` is well-formed before pushing — point `marketplace add` at the directory:

```text
/plugin marketplace add ./radical-pipelines
/plugin install radical-pipelines@automattic
```

This installs the plugin into Claude Code's cache the same way the public-repository install does.

For active local development, skip the marketplace flow entirely and load the plugin directly from a checkout with Claude Code's `--plugin-dir` flag:

```bash
claude --plugin-dir ./radical-pipelines
```

This reads the plugin from the working tree on each start (no cache copy), so edits in `skills/radical-pipelines/` are picked up without reinstalling.

The plugin currently bundles:

- the `radical-pipelines` skill, a real directory at `skills/radical-pipelines/`.
- agent profiles in the root `agents/` directory.

Plugin skills are namespaced by the plugin name in Claude Code (not by the marketplace name). After installing, invoke the skill with `/radical-pipelines:radical-pipelines` or ask Claude Code to run Radical Pipelines.

The skill at `skills/radical-pipelines/` and the agent profiles in `agents/` are the real sources, served directly from the repository root: the directories the Claude Code plugin reads are the canonical sources themselves, with no hidden source directory and no mirror-symlink scheme.

## opencode plugin install

opencode installs plugins from its global config rather than from a marketplace. Radical Pipelines is distributed as a pinned Git specifier that opencode resolves through its own npm resolver, so installing it is a config edit followed by one restart. The target is opencode v2 (the public beta, the `opencode2` binary), verified against one exact pinned build recorded in [`opencode/pin.json`](./opencode/pin.json).

Add RP to the `plugins` array in your global `~/.config/opencode/opencode.json`, pinned to a release tag, and disable opencode's auto-update:

```jsonc
{
  "plugins": ["github:Automattic/radical-pipelines#v<X.Y.Z>"],
  "autoupdate": false
}
```

Replace `v<X.Y.Z>` with the RP release tag to install; RP tags every release `v<version>`. Then restart the opencode service once:

```bash
opencode2 service restart
```

A single restart is enough — the plugin finishes its setup before opencode scans agents, so the skill and every agent are usable as soon as the service is back. After the restart:

- The `radical-pipelines` skill is invokable — the plugin registers the packaged skill tree as a skill source by reference, unmodified.
- Every RP agent is available by its RP name — the plugin materializes the agent profiles into opencode's global agents directory (`~/.config/opencode/agents/`), where each agent's id matches its RP name.
- Every agent spawned with `rp_spawn` receives the opencode messaging protocol and its spawner's session ID automatically, so its required reports and messages are routed with `rp_send` rather than left in its transcript.
- `rp_terminate` deletes a finished agent's session so it cannot linger or receive more work.
- Health-loop ticks skip recently active sessions, steer into sessions with no activity for two intervals, and remain observable through `rp_status`. A tick never duplicates a prompt whose predecessor is still undelivered or unanswered — a parked queue copy facing a running session is promoted to steer delivery in place; each injection is judged by the turn that answers it, and when that turn only fails (network outage, provider quota exhaustion) the loop backs off exponentially — up to ~8 intervals between probes — while still inspecting the target every tick and resuming normal cadence on the first success; and a target stuck on a dead provider stream — a frozen tool call with no raw provider-response bytes (observed by teeing every provider response) and no progress events for a ten-minute confirmation window — is interrupted exactly once across all loops, with any parked monitor copy made steerable first, so the monitor prompt reaches the freed session on the next delivery; a stream still producing bytes is never interrupted, however long it runs.
- opencode's auto-update is disabled, holding the installation on the verified build.

`autoupdate: false` matters because RP verifies against one exact opencode build, not the moving `next` tag. That build lives in [`opencode/pin.json`](./opencode/pin.json), which pins both the `@opencode-ai/cli` build the `opencode2` binary comes from and the `@opencode-ai/plugin` package version the plugin is written against. Any opencode build other than the pin is outside RP's verified surface.

### Updating

To move to a newer RP release, change the pinned tag in the same `plugins` entry to the newer `v<version>` release tag — keeping `autoupdate: false` — and restart:

```bash
opencode2 service restart
```

opencode resolves the new tag into its own cache entry and the plugin refreshes the materialized agents during setup, so the newer skill and agents take effect after the restart. Only a pinned tag refreshes this way: a moving ref (a branch name in place of a `v<version>` tag) resolves once and never refreshes, which is why the procedure always pins a tag.

### Checking the installed version

opencode reports plugin ids, not versions, so RP surfaces its own version:

- Run the `rp_status` tool: its `pluginVersion` reports the running plugin as `radical-pipelines@<version>`, where `<version>` is the installed RP version; its `pin` field compares the running opencode build against `opencode/pin.json` — `match` when they are equal, `outside the verified surface` when the running build differs from the pin, and `not determinable` when the running build cannot be read; and `recentLoopTicks` retains recent health-loop outcomes separately from `recentErrors`.
- opencode's HTTP API reports the same id: `opencode2 api GET /api/plugin` returns the `radical-pipelines@<version>` plugin id.

## Configuration

The skill is generic — each project defines its own conventions for things like where issues are tracked, the branch name base, the pipeline family folder location, the worktree root, commit rules, and how teams of agents are spawned. A project's shared conventions live in a committed `.rp.md` file, populated by the interactive setup flow; an individual developer can optionally layer local overrides on top of it (see below).

If required conventions are missing when a workflow starts, Radical Pipelines stops before running the pipeline and offers an interactive setup. Setup separates shared project guidance from guidance specific to the active agentic coding tool, and writes `.rp.md` only after the owner confirms the proposed content.

Shared project conventions include issue tracking, the branch name base, the pipeline family folder, the worktree root, commit rules, artifact storage, an optional `PR format` convention for the pipeline's PR title and description, an optional `Guardrails` convention declaring rules agents must satisfy, and an optional `Lifecycle hooks` convention attaching prose instructions the orchestrator runs at defined pipeline moments — run started, phase completed, run ended, the pipeline's PR opened, and so on (see the [lifecycle hooks reference](./skills/radical-pipelines/reference/lifecycle-hooks.md)); see the [convention loader](./skills/radical-pipelines/reference/conventions/load.md) and [setup conventions](./skills/radical-pipelines/reference/conventions/setup.md) for how to author them. Worktrees are raw `git worktree` checkouts under a project-chosen root — the orchestrator creates every branch and worktree — removing lane branches and worktrees when their lanes are done — and seats each agent in its worktree per the per-tool team-spawning convention; agents only occupy the worktrees prepared for them. The per-tool section supplies team spawning, health monitoring, and an optional `Agent models` convention pinning which model (and settings) each spawned agent runs on, each in the active tool's native form. Under Claude Code that is teammate spawning and shutdown plus the bundled `/loop` health monitor; under opencode it is the `rp_spawn` and `rp_terminate` lifecycle tools, the `rp_loop_*` health-monitor tools, permission mediation (an agent's read outside its worktree is auto-redirected to the worktree copy when one exists, and otherwise held for the orchestrator to answer via `rp_permission_reply`), and — for `Agent models` — opencode-native `provider/model[#variant]` strings passed verbatim to `rp_spawn`. The `Agent models` block is optional; see the [setup conventions](./skills/radical-pipelines/reference/conventions/setup.md) for how to author it.

A developer can override conventions for their own working copy by placing a git-ignored `.rp.local.md` alongside the committed `.rp.md`: the local file wins per named unit, and the committed file is inherited wherever the local file is silent. Because `.rp.local.md` is git-ignored, it is never committed and never affects other contributors. See the [Local overrides](./skills/radical-pipelines/reference/conventions/load.md#local-overrides) section of the convention loader for details.

The orchestrator loads and verifies conventions before launching phase agents. When it spawns a phase agent, it passes a `## Conventions` block with the run's artifact folder, the agent's phase folder, worktree path and branch name, the commit format, and any guardrails naming that agent. Phase agents report a blocker when required context is missing instead of inferring paths from generic examples.

Each phase commits inspectable artifacts into the pipeline family folder, identical across forks. The phase folders do not sit directly under the pipeline family folder; they live under a **run** folder: artifacts live at `<pipeline-family-folder>/<run>/<phase>`, where `<run>` is `base` (the original run) or `rev-<N>-<desc>` (a revision run layered on a complete previous run). A pipeline is a chain of **run branches** — each run's branch starts at the tip of the previous run's, and the latest run branch is what merges to main. Multilane phases write each lane's artifacts in a `lane-<K>` subfolder of the phase folder: isolated lanes work on **lane branches** forked from the run branch and merged back on approval, while divergent lanes run sequentially on the run branch itself. A fork of a pipeline is a new version created by branching at the **cut commit** in the parent's history — the inherited history carries the inherited work itself, with no copying. In autonomous mode, reviewer agents write rejected iterations as `<artifact>-review-N-rejected.md` (N = 1, 2, 3, …) and a single `<artifact>-review-approved.md` on approval; in assisted mode, the orchestrator writes the `<artifact>-review-approved.md` file capturing the owner's explicit approval (assisted runs produce no rejection files because the owner iterates with the orchestrator before any commit). The build and document phases each gate on a committed plan first — `build-plan.md` / `document-plan.md` with their own review files — and each leaves a human-readable summary of what the phase produced (`3-build/build-summary.md`, `4-document/document-summary.md`), written by the phase reviewer on approval and committed alongside the approval marker. `reference/pipeline-versioning.md` documents the run model and the per-phase completion predicates the orchestrator evaluates uniformly across both modes: a phase is complete only when all its required artifacts are committed in the run folder on the run branch, so build and document complete only once their summary is committed too, not on the approval marker alone.

A project's committed [`.rp.md`](./.rp.md) is organized as a shared section (issues, branch name base, pipeline family folder, artifact storage, commit format, PR format, worktree root, guardrails, lifecycle hooks) followed by a per-tool section covering only what depends on the active tool (team spawning, agent models, health monitoring). This repository's own `.rp.md` carries the shared section plus the Claude Code section. Because the per-tool section names one tool, running under a different tool leaves the tool-dependent conventions unmet: Radical Pipelines does not proceed under the committed section's conventions, and instead informs the owner and offers setup for the active tool.

## Changelog and versioning

The repository tracks every change in a changelog and keeps a single project version in sync across the files that declare it. It uses [Changesets](https://github.com/changesets/changesets) to record changes and drive version bumps, and a small sync step to propagate the bumped version to every version-bearing file. The configuration lives in `.changeset/config.json` and `@changesets/cli` is a development dependency of the root `package.json`.

### Adding a changeset

Per the repository's standing rule — alongside the README-update rule — every change to the repository records a changeset. A changeset is a committed `.changeset/*.md` file that describes the change and declares its bump type (`patch`, `minor`, or `major`). It travels with the pull request and accumulates on `trunk` until a release is cut; it is not consumed when the PR merges. The matching rule lives in [`AGENTS.md`](./AGENTS.md).

For how to author a changeset, choose its bump type, and when one is required, see [`CONTRIBUTING.md`](./CONTRIBUTING.md#adding-a-changeset).

### The single source of truth

The `version` field in the root `package.json` is authoritative. The other version-bearing locations are kept identical to it and are never edited independently:

- `.claude-plugin/plugin.json`
- `package-lock.json` — in two fields, the top-level `version` and the root package's `packages[""].version`.

`.claude-plugin/marketplace.json` carries no version field — it references the plugin by `source: "./"` — so it is intentionally left out of version sync.

### Cutting a version

Releases are driven by CI (`.github/workflows/release.yml`), not by a local operator action. Changesets accumulate on `trunk` until a release is cut; the flow is:

1. **Changesets land on `trunk`.** As pull requests merge, their `.changeset/*.md` files pile up on `trunk`.
2. **CI opens a "Version Packages" PR.** With pending changesets, the Release workflow runs `npm run release:version` and surfaces the result as a "Version Packages" pull request. In one fail-fast invocation that script: (a) runs `changeset version` to consume the pending `.changeset/*.md` files, write or update the root `CHANGELOG.md`, and bump the `version` in the root `package.json`; (b) runs `node scripts/sync-version.mjs` to copy the new root version into `.claude-plugin/plugin.json`; (c) reconciles `package-lock.json` so its two recorded-version fields match the bumped root version. After it runs, all version-bearing locations — `package.json`, `.claude-plugin/plugin.json`, and the two `package-lock.json` fields — read the same string.
3. **A maintainer merges the Version Packages PR.** The human merge is what advances the flow.
4. **CI creates the tag and Release.** The next run creates the `v<version>` git tag and a matching GitHub Release.

There is no `npm publish` — the root package is `"private": true` and both artifacts are consumed direct-from-git — but a release now produces a `v<version>` git tag and a GitHub Release via CI.

The full maintainer procedure, the manual escape hatch for cutting a release locally, and the `GITHUB_TOKEN` a local `npm run release:version` requires (because `@changesets/changelog-github` needs it) live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).
