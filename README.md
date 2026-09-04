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

- **Phase 0. Intent.** The initial request and any external amendments.
- **Phase 1. Spec.** Requirements, acceptance criteria and out of scope.
- **Phase 2. Design doc.** Architecture and technical decisions.
- **Phase 3. Build.** The build plan and its tasks, the code with the unit and end-to-end tests the tasks call for, and behavior verification.
- **Phase 4. Document.** The document plan and its tasks, and both internal and external documentation.

Planning is not a separate phase: the Build and Document phases each begin by committing a plan and getting it approved.

In this model (see the [glossary](./docs/glossary.md)), a pipeline is a converging set of artifacts: it is done when every artifact through the target phase exists, is approved, is fresh with respect to its inputs, its tasks are executed, and every commit the pipeline made outside its folder is claimed by a task report. State is computed from the tree, and external corrections become amendments whose changed identities make downstream pins stale and drive a cascade. When an artifact cannot satisfy a false input, the contradiction travels as an `unsatisfiable` verdict to that target and, if necessary, up to the owner. A task report ends `completed`, `failed` — the product observed and contradicting the task, with reproducible evidence — or `blocked`: the product not observed, the report naming what prevented it, for the orchestrator to restore before the next attempt.

The Spec and Design doc phases can run **multilane**: named production lanes, each with its own brief and model, produce and review a candidate — in parallel, or one after another to diverge from what came before — then a producer in Consolidate mode merges the candidates into one canonical artifact for final adversarial review. Without lanes, the plain single flow.

The pipeline is **autonomous by default, assisted when needed.** After triage, an autonomous run proceeds without questions until an owner escalation or the valve. The Spec and Design doc phases can instead run in assisted mode.

It is **inspectable.** Every phase produces artifacts your team can review before the final PR.

It can add **determinism through redundancy.** For complex tasks, you should be able to spend more tokens on the same surface with multiple runs, validation checks, adversarial agents, and different models from different providers to converge on a more reliable output.

## What this unlocks

- **Parallel throughput.** Instead of assisting one agent at a time, a human can launch multiple autonomous pipelines and review their outputs when they're done. The constraint shifts from "how many agents can I supervise" to "how many can I review".
- **Compounding quality.** When a pipeline produces a bad result, the correction targets the artifact where it diverged (a wrong assumption in the spec, a missing constraint in the design doc). Its effects cascade through every downstream artifact, not just the output that exposed it.
- **Consistent assets.** Tests, documentation, and other artifacts that today depend on human diligence become a planned, reviewed part of every run.
- **Shareable work-in-progress.** Because every phase produces a concrete artifact, the state of a task becomes visible across the team long before a PR exists. Multiple people can review intermediate outputs and advance the same task through the pipeline, instead of only being able to react to the final result.

## Why now

- **Agents have crossed the quality threshold.** They are already capable of executing autonomously and doing a very good job, as long as the requirements are well-defined.
- **Human attention is becoming the bottleneck.** As agent adoption grows, the limiting factor in development is no longer the agents' ability to write code, it's the human time spent assisting them. Every hour spent steering an agent in real time is an hour not spent on decisions that actually need a human. And even when agents go off track, it's more optimal to inspect where they deviated, supply the correction, and let the pipeline converge autonomously, rather than assisting them step by step.
- **The tooling is mature enough.** Tools like Claude Code already provide the necessary primitives (skills, teams of agents, agent definitions, hooks...) to build a pipeline like this without a large investment in custom infrastructure, and for this reason, whatever is built can evolve naturally alongside them as they improve.

## Success metrics

- **Human time per task.** For a set of representative tasks, measure the total human time spent when using the pipeline vs. assisting an agent directly. The pipeline should require significantly less human time per task.
- **Pipeline completion rate.** Percentage of tasks that make it from intent through the target phase without requiring human intervention. A higher rate means the pipeline is genuinely autonomous, not just deferring work to the human at every checkpoint.
- **Correction efficiency.** When a human supplies an amendment, how many review waves does it take to reach an acceptable result? Fewer rounds mean the pipeline is surfacing the right information for the human to make effective corrections.
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
- Every agent spawned with `rp_spawn` receives the opencode messaging protocol and its spawner's session ID automatically, so its required reports and messages — including its completion declaration, which always goes to the spawner — are routed with `rp_send` rather than left in its transcript. The same protocol tells it that an ended turn is a stop: only a message resumes the session — a reply it awaits, or the completion notice of a background command it gave a `timeout` (background commands carry none by default, so a hung one never reports back) — and anything else it waits on holds its turn, with foreground commands that have a timeout and progress compared between checks, instead of parking on detached work nothing can wake it for.
- A spawned agent's failed turn is announced to the spawner with its cause, unless `rp_terminate` has successfully deleted that agent's session — every terminal event for a deleted session is suppressed.
- `rp_terminate` deletes a finished agent's session so it cannot linger or receive more work.
- `rp_status` reports each spawned session with its `run` and its liveness facts: `activity` (the latest of `updated`, which opencode moves only when the session receives input, the session's last observed tool or model progress event, and its last raw provider byte), `lastTurn` (`succeeded`, `failed`, or `interrupted`) and `turns`, `lastSend` (its last `rp_send` and recipient), and `lastText` (its newest assistant text, or how many messages were searched without finding one) — enough to tell a working, a waiting, and a stopped agent apart. `lastTurn`, `turns`, and `lastSend` live in the daemon's memory: after a restart they are absent until observed again — unknown, not never — and `activity` falls back to `updated` until progress is observed; `run`, `lastText`, and the rest are read back from the durable session store.
- Health-loop ticks skip recently active sessions, steer into sessions with no activity for two intervals, and remain observable through `rp_status`. A tick never duplicates a prompt whose predecessor is still undelivered or unanswered — a parked queue copy facing a running session is promoted to steer delivery in place; each injection is judged by the turn that answers it, and when that turn only fails (network outage, provider quota exhaustion) the loop backs off exponentially — up to ~8 intervals between probes — while still inspecting the target every tick and resuming normal cadence on the first success; and a target stuck on a dead provider stream — a frozen tool call, with no tool executing anywhere in the message, whose own response (identified by its provider call id in the teed bytes of each location's provider responses) produced no bytes and no progress events for a one-hour confirmation window (an accepted, documented heuristic: silence cannot prove death, so a totally silent live stream outlasting the window would be interrupted — a case beyond observed provider behavior) — is interrupted exactly once across all loops, with any parked monitor copy made steerable first, so the monitor prompt reaches the freed session on the next delivery. Under the plugin's single-observer assumption (no other plugin consumes through its tee and then substitutes the response without cancelling it), a stream whose response identity is established is never interrupted while it produces bytes — bounded only by the instant between the final revalidation and the session-scoped interrupt request, the tightest window the pinned API offers. Traffic whose identity cannot be established — never observed, or observed but with the projected tool id unmatched in its consumed bytes — is unknown coverage and is never escalated.
- Health-loop server requests time out after 10 seconds. A tick still pending after two minutes records `timeout` in `rp_status` and re-arms; cancelling a loop returns as soon as it is disarmed instead of waiting for its active tick.
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

The skill is generic: each project records its conventions in a committed `.rp.md`. Its frontmatter carries `conventions: 1`, the version of the conventions format, so the loader can migrate older files or ask the owner to update the skill when a file is newer. If the file is absent or required conventions are missing, the interactive setup writes it only after the owner confirms the proposed content.

| Convention            | What it covers                                                                                     | Required |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| Issues                | Issue storage, operations, and the canonical issue reference                                       | Yes      |
| Branch naming         | How a pipeline branch name and slug derive from its issue                                           | Yes      |
| Pipelines folder root | Where pipeline folders live                                                                        | No       |
| Artifact storage      | Whether artifacts live in the project's repository or a fork, and the artifact base branch          | No       |
| Worktree folder root  | Where worktrees live                                                                                | Yes      |
| Commit format         | How agents write commits                                                                            | No       |
| PR format             | How pull request titles and descriptions are written                                                | No       |
| Guardrails            | Rules the project's agents must satisfy                                                             | No       |
| Lifecycle hooks       | Prose instructions run at defined pipeline moments                                                  | No       |
| Agents                | Model per profile and the lanes it adds, with their briefs and materials                             | No       |
| Thresholds            | Audit and valve thresholds                                                                          | No       |

A developer can override conventions for their own working copy with a git-ignored `.rp.local.md` alongside `.rp.md`: the local file wins per named unit, and the committed file supplies everything else. The active tool's mechanics — spawning, agent IDs, messaging, seating, termination, health monitoring, and model values — live in the skill's [`tools/`](./skills/radical-pipelines/tools/) files; the active tool section in `.rp.md` overrides or extends them. See the [convention loader](./skills/radical-pipelines/reference/conventions/load.md) and [setup flow](./skills/radical-pipelines/reference/conventions/setup.md) for the full procedure.

Agents reserve blockers for malformed materials, unreadable inputs, and broken environments found before their first write; a worker that cannot observe the product mid-task reports a `blocked` outcome instead.

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
