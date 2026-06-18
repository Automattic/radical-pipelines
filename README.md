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
- **Phase 3. Plan.** Code plan and documentation plan.
- **Phase 4. Code.** The actual code, including unit and end-to-end tests, plus a summary of what the phase produced.
- **Phase 5. Docs.** Both internal and external documentation, plus a summary of what the phase produced.

The pipeline is **autonomous by default, assisted when needed.** It runs on its own, but humans can intervene at any checkpoint. For particularly complex tasks, specific phases can be run in assisted mode instead.

It is **inspectable and relaunchable.** Every phase produces artifacts your team can review. If the output at any point isn't what the team expected, anyone on the team can go back to the phase where the assumptions diverged, correct them, and relaunch the autonomous sequence from there.

It can add **determinism through redundancy.** For complex tasks, you should be able to spend more tokens on the same surface with multiple runs, validation checks, adversarial agents, and different models from different providers to converge on a more reliable output.

## What this unlocks

- **Parallel throughput.** Instead of assisting one agent at a time, a human can launch multiple autonomous pipelines and review their outputs when they're done. The constraint shifts from "how many agents can I supervise" to "how many can I review".
- **Compounding quality.** When a pipeline produces a bad result, the fix lives in a specific phase (a wrong assumption in the spec, a missing constraint in the design doc). That fix improves every future run that goes through the same pipeline, not just the one that failed.
- **Consistent assets.** Tests, documentation, and other artifacts that today depend on human diligence become a guaranteed part of every run.
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

The repository ships a Claude Code plugin, a Pi package, an opencode package, and a standalone [agent skill](https://agentskills.io). All capture the same methodology and run the same pipeline, so a compatible agent can run a task through it on any of the three tools (Claude Code, Pi, opencode) or from the standalone skill.

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
- agent profiles in the root `agents/` directory, shared with the Pi package.

Plugin skills are namespaced by the plugin name in Claude Code (not by the marketplace name). After installing, invoke the skill with `/radical-pipelines:radical-pipelines` or ask Claude Code to run Radical Pipelines.

## Pi package install

For Pi, install from the GitHub repository with Pi's `git:` source:

```bash
pi install git:github.com/Automattic/radical-pipelines
```

This routes through the single Pi manifest (`package.json` at the repo root), whose `pi` block resolves the skill from the root `skills/` directory.

The package installs:

- the `radical-pipelines` skill;
- phase agent profiles for the shipped phases and phase pairs: `spec-analyst`, `spec-researcher`, `spec-writer`, `spec-reviewer`, `spec-consolidator`, `design-doc-analyst`, `design-doc-researcher`, `design-doc-writer`, `design-doc-reviewer`, `code-plan-writer`, `code-plan-reviewer`, `doc-plan-writer`, `doc-plan-reviewer`, `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer` (phase 0 is the intent, an input rather than an agent-produced artifact, so it has no agent profile);
- bundled `pi-teams`, `@zenobius/pi-worktrees`, and `@pi-agents/loop` Pi resources.

During package development in this repository, install dependencies once from the repository root and then install the local path:

```bash
npm install
pi install . -l
```

## Pi usage

After installing the Pi package in a repository:

1. Start with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
2. Ensure the phase agent profiles are discoverable by `pi-teams` — repository-local in `.pi/agents/`, or user-local/global in `~/.pi/agent/agents/`. The skill's setup flow installs them.

The orchestrator creates one `pi-teams` team per pipeline and spawns the phase agents at runtime, following the project conventions.

Validation for the local package has verified `pi install . -l`, `pi list`, and `/skill:radical-pipelines`. The local validation used print mode rather than a full manual interactive UI.

## opencode package install

For opencode, install the published `@automattic/radical-pipelines-opencode` package. It is a meta-plugin: a single `plugin:[]` entry that re-exports the third-party [`@hueyexe/opencode-ensemble`](https://www.npmjs.com/package/@hueyexe/opencode-ensemble) coordination layer (spawn-by-name, peer-to-peer messaging, the shared task board, per-agent model selection, and always-on supervision) as the team layer the orchestrator runs on. The package pins the ensemble version it ships against, and bundles the same `agents/` profiles and `radical-pipelines` skill tree that the Claude Code plugin and Pi package use.

Running opencode requires Node ≥ 24 (for `node:sqlite`) or Bun ≥ 1.0; setup surfaces this prerequisite and will not declare opencode ready until it is met.

List **only** the meta-plugin in opencode's plugin configuration — never `@hueyexe/opencode-ensemble` alongside it. Listing both double-initializes ensemble, which arms a second watchdog and collides on the dashboard port.

## opencode usage

After listing the meta-plugin and asking opencode to run Radical Pipelines, the skill's setup flow installs RP's agents and skill tree so opencode can discover them. The install location is keyed to the project's **Artifact storage** convention — the committed `.opencode/agent/` and `.opencode/skill/radical-pipelines/` so a team picks them up on clone, or `~/.config/opencode/` for a per-user install. Setup also writes `.opencode/ensemble.json` to tune ensemble for Radical Pipelines.

The orchestrator runs one ensemble team per pipeline and spawns the phase agents at runtime, following the project conventions. See the [opencode conventions](./skills/radical-pipelines/reference/conventions/opencode.md) for the worktree, team-spawning, model, and supervision mechanics.

## Dependency bundling

The repository ships two publishable packages. The first is the Pi manifest: the root `package.json` (`pi-package` keyword). It declares Radical Pipelines-owned resources under its `pi` block — the skill resolves from the root `skills/` directory — and references bundled third-party Pi resources through `node_modules/...` paths. Its runtime `dependencies` are `pi-teams`, `@zenobius/pi-worktrees`, `@pi-agents/loop`, and `@sinclair/typebox`. Pi core packages are wildcard peer dependencies and are not declared as runtime dependencies. The second is the opencode package at `packages/opencode/` (`@automattic/radical-pipelines-opencode`), whose dependencies pin `@hueyexe/opencode-ensemble` and the `@opencode-ai/*` plugin and SDK packages.

Dependency delivery is not a `bundledDependencies` mechanism. Both Pi install paths resolve this same root manifest — the `git:` install at the cloned repo root, `pi install . -l` at the local path — and Pi runs `npm install` against it after the clone, so the declared `dependencies` (and their `node_modules/...` resources referenced from the `pi` block) are present at runtime.

The skill at `skills/radical-pipelines/` and the agent profiles in `agents/` are the real sources, served directly from the repository root. There is no hidden source directory and no mirror-symlink scheme: the directories the Claude Code plugin and the Pi package read are the canonical sources themselves. The opencode package shares that same single source: a build step (`packages/opencode/build.mjs`, run on `prepack`) populates the package's published `agents/` and `skills/` trees from the root, converting each agent's frontmatter for opencode and copying the skill tree verbatim. The root `agents/` + `skills/` stay the single edit point — the build copies and transforms, it never forks content.

## Configuration

The skill is generic — each project defines its own conventions for things like the task source, existing work checks, pipeline slug format, worktree commands, branch naming, artifact folder location, and how teams of agents are spawned. A project's shared conventions live in a committed `.rp.md` file, populated by the interactive setup flow; an individual developer can optionally layer a restricted subset of local overrides on top of it (see below).

If required conventions are missing when a workflow starts, Radical Pipelines stops before running the pipeline and offers an interactive setup. Setup separates shared project guidance from guidance specific to the active agentic coding tool, and writes `.rp.md` only after the owner confirms the proposed content.

Shared project conventions include task tracking, pipeline slug format, artifact folder location, commit rules, and an optional `Guardrails` convention declaring the deterministic verification gates (exact commands judged pass/fail by exit code); see the [convention loader](./skills/radical-pipelines/reference/conventions/load.md) and [setup conventions](./skills/radical-pipelines/reference/conventions/setup.md) for how to author them. Claude Code conventions add worktree commands (`EnterWorktree` / `ExitWorktree`), automatic branch naming, team spawning (`TeamCreate`), the bundled `/loop` health monitor, and an optional `Agent models` convention pinning which model (and settings) each spawned agent runs on. Pi conventions add `@zenobius/pi-worktrees` setup, `pi-teams` spawning, provider/model recovery, the `@pi-agents/loop` health monitor, Pi agent discovery rules, and the same optional `Agent models` convention. [opencode conventions](./skills/radical-pipelines/reference/conventions/opencode.md) add plain `git worktree` commands, team spawning through the ensemble team layer, always-on health supervision, and the same optional `Agent models` convention. The `Agent models` block is per-tool and optional; see the [setup conventions](./skills/radical-pipelines/reference/conventions/setup.md) for how to author it. A given project uses one set; the active CLI determines which.

A developer can override a restricted subset of conventions for their own working copy by placing a git-ignored `.rp.local.md` alongside the committed `.rp.md`: the local file wins per named unit, and the committed file is inherited wherever the local file is silent. Because `.rp.local.md` is git-ignored, it is never committed and never affects other contributors. See the [Local overrides](./skills/radical-pipelines/reference/conventions/load.md#local-overrides) section of the convention loader for details.

For Pi, setup also verifies that the required phase agent definitions are discoverable before the pipeline starts. It checks repository-local agents first (`.pi/agents/<agent>.md` or `.pi/agents/<agent>/SKILL.md`), then user-local/global agents (`~/.pi/agent/agents/<agent>.md` or `~/.pi/agent/agents/<agent>/SKILL.md`). If none of the required agents are available, setup stops and asks which Radical Pipelines agents the user wants to copy/paste and install, and whether to install them repository-locally or user-locally/globally.

Shared cross-agent project instructions should live in `AGENTS.md`. `CLAUDE.md` may be a thin pointer to `AGENTS.md` (for example, `@AGENTS.md`); setup preserves that pattern and should not duplicate shared `AGENTS.md` content into `CLAUDE.md`.

The orchestrator loads and verifies conventions before launching phase agents. When it spawns a phase agent or team, it passes the resolved pipeline slug, artifact folder path, exact artifact paths for that role, and the role-specific host-project conventions listed in the agent profile. Phase agents report a blocker when required context is missing instead of inferring paths from generic examples.

Each phase commits inspectable review artifacts into the task's artifact folder. The phase folders do not sit directly under the pipeline folder; they live under a **run** folder. Every pipeline carries a `base/` run from creation — the original run, never rewritten — and each review adds a sibling `review-N-<short-description>/` run on the same branch. `reference/pipeline-versioning.md` documents the run model. In autonomous mode, reviewer agents write rejected iterations as `<artifact>-review-N-rejected.md` (N = 1, 2, 3, …) and a single `<artifact>-review-approved.md` on approval; in assisted mode, the orchestrator writes the `<artifact>-review-approved.md` file capturing the owner's explicit approval (assisted runs produce no rejection files because the owner iterates with the orchestrator before any commit). On top of those approval and rejection markers, the code and docs phases each leave a human-readable summary of what the phase produced in the run — `4-code/code-summary.md` and `5-docs/docs-summary.md`, written by the reviewer on approval and committed alongside the `<artifact>-review-approved.md` marker — so every phase's artifact folder records its output rather than only that it was approved. The autonomous-phase and assisted-phase references list the exact filenames per phase, and `reference/pipeline-versioning.md` documents how the orchestrator uses them to detect phase completion uniformly across both modes, within a run folder — and that the code and docs phases complete only once their summary is committed too, not on the approval marker alone.

A project's committed [`.rp.md`](./.rp.md) is organized as a shared section (issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior, guardrails) followed by a per-tool section covering only what depends on the active tool (worktrees, branch names, team spawning, agent models, health monitoring). A normal single-CLI consumer carries just the shared section plus the one tool block its CLI uses. This repository is the unusual case: as the only multi-CLI consumer of Radical Pipelines, it dogfoods both CLIs at once, so its `.rp.md` is hand-maintained to carry the shared section plus both the Claude Code and the Pi per-tool sections side-by-side.

## Changelog and versioning

The repository tracks every change in a changelog and keeps a single project version in sync across the files that declare it. It uses [Changesets](https://github.com/changesets/changesets) to record changes and drive version bumps, and a small sync step to propagate the bumped version to every version-bearing file. The configuration lives in `.changeset/config.json` and `@changesets/cli` is a development dependency of the root `package.json`.

### Adding a changeset

Per the repository's standing rule — alongside the README-update rule — every change to the repository records a changeset. A changeset is a committed `.changeset/*.md` file that describes the change and declares its bump type (`patch`, `minor`, or `major`). It travels with the pull request and accumulates on `trunk` until a release is cut; it is not consumed when the PR merges. The matching rule lives in [`AGENTS.md`](./AGENTS.md).

For how to author a changeset, choose its bump type, and when one is required, see [`CONTRIBUTING.md`](./CONTRIBUTING.md#adding-a-changeset).

### The single source of truth

The `version` field in the root `package.json` is authoritative. The other version-bearing files are kept identical to it and are never edited independently:

- `.claude-plugin/plugin.json`

`.claude-plugin/marketplace.json` carries no version field — it references the plugin by `source: "./"` — so it is intentionally left out of version sync.

### Cutting a version

Releases are driven by CI (`.github/workflows/release.yml`), not by a local operator action. Changesets accumulate on `trunk` until a release is cut; the flow is:

1. **Changesets land on `trunk`.** As pull requests merge, their `.changeset/*.md` files pile up on `trunk`.
2. **CI opens a "Version Packages" PR.** With pending changesets, the Release workflow runs `npm run release:version` and surfaces the result as a "Version Packages" pull request. In one fail-fast invocation that script: (a) runs `changeset version` to consume the pending `.changeset/*.md` files, write or update the root `CHANGELOG.md`, and bump the `version` in the root `package.json`; (b) runs `node scripts/sync-version.mjs` to copy the new root version into `.claude-plugin/plugin.json` — so `package.json` and `.claude-plugin/plugin.json` read the same string.
3. **A maintainer merges the Version Packages PR.** The human merge is what advances the flow.
4. **CI creates the tag and Release.** The next run creates the `v<version>` git tag and a matching GitHub Release.

There is no `npm publish` — the root package is `"private": true` and both artifacts are consumed direct-from-git — but a release now produces a `v<version>` git tag and a GitHub Release via CI.

The full maintainer procedure, the manual escape hatch for cutting a release locally, and the `GITHUB_TOKEN` a local `npm run release:version` requires (because `@changesets/changelog-github` needs it) live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).
