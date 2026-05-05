# Project Description

<img alt="Radical Pipelines" src="./assets/radical-pipelines.png" width="600">

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

- **Phase 0. Prompt.** The initial idea or request.
- **Phase 1. Spec.** Requirements, acceptance criteria and out of scope.
- **Phase 2. Design doc.** Architecture and technical decisions.
- **Phase 3. Implementation plan.** Step-by-step breakdown of the work.
- **Phase 4. Implementation.** The actual code, including unit and end-to-end tests.
- **Phase 5. Documentation.** Both internal and external docs.

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
- **Pipeline completion rate.** Percentage of tasks that make it from prompt to finished implementation through all phases without requiring human intervention. A higher rate means the pipeline is genuinely autonomous, not just deferring work to the human at every checkpoint.
- **Relaunch efficiency.** When a human identifies a problem and corrects a specific phase, how many relaunch attempts does it take to reach an acceptable result? Fewer rounds means the pipeline is surfacing the right information for the human to make effective corrections.
- **Autonomy ratio.** For each task, the number of phases that ran autonomously vs. the number that required human intervention. Tracking this across tasks shows whether the pipeline is trending toward more autonomy over time, or whether certain phases consistently need a human.

# Project Usage

The repository ships a Pi package and an [agent skill](https://agentskills.io) that capture the methodology, so a compatible agent can run a task through the pipeline.

## Pi package install

For Pi, the recommended install is the package after it is published:

```bash
pi install npm:@automattic/radical-pipelines-pi
```

For a project-local/shared install, use:

```bash
pi install npm:@automattic/radical-pipelines-pi -l
```

The package installs:

- the `radical-pipelines` skill;
- six phase agent profiles: `prompt-writer`, `spec-writer`, `designer`, `planner`, `implementer`, and `documenter`;
- `radical-pipelines` and `radical-pipelines-spec` pi-teams templates;
- bundled `pi-teams` and `@zenobius/pi-worktrees` Pi resources.

During package development in this repository, install dependencies first and then install the local path:

```bash
cd packages/pi
npm install
cd ../..
pi install ./packages/pi -l
```

## Pi usage

After installing the Pi package in a repository:

1. Start with `/skill:radical-pipelines` or by asking Pi to run Radical Pipelines.
2. Use pi-teams predefined team creation with the `radical-pipelines` or `radical-pipelines-spec` templates.

Validation for the local package has verified `npm pack --dry-run`, `pi install ./packages/pi -l`, `pi list`, `/skill:radical-pipelines`, predefined team discovery, and spawning the `radical-pipelines-spec` team. The local validation used print mode rather than a full manual interactive UI.

## Dependency bundling

`packages/pi/package.json` is a Pi package (`pi-package` keyword). It declares Radical Pipelines-owned resources under the `pi` manifest and references bundled third-party Pi resources through package-local `node_modules/...` paths. Normal runtime package dependencies include `pi-teams`, `@zenobius/pi-worktrees`, and `@sinclair/typebox`; these are also bundled so their Pi resources are available from the wrapper package. Pi core packages are wildcard peer dependencies and are not bundled.

## Fallback skill install

Fallback skill-only install with the [Skills command-line tool](https://github.com/vercel-labs/skills):

```bash
npx skills add Automattic/radical-pipelines
```

The fallback only installs the skill. It does not install Pi extensions, `pi-teams`, `@zenobius/pi-worktrees`, or predefined team files, and skill install paths can vary across CLIs, symlinks, and home-relative setups. Use the Pi package when you want automated Pi setup.

## Configuration

The skill is generic — each project defines its own conventions for things like the task source, existing work checks, pipeline slug format, worktree commands, branch naming, artifact folder location, and how teams of agents are spawned. These conventions can live in any of these places (checked in order):

1. Shared project instructions in the project-root `AGENTS.md`.
2. A dedicated conventions skill (e.g., `rp-conventions`).
3. A Radical Pipelines `rp.md` file in the active CLI's config folder — `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

If required conventions are missing when a workflow starts, Radical Pipelines stops before running the pipeline and offers an interactive setup flow. Setup asks for the missing convention details, explains which answers are shared project guidance and which are CLI-specific Radical Pipelines guidance, and can write a reusable Markdown conventions file for the active CLI after confirmation. Pi setup writes `.pi/rp.md`; Claude Code setup writes `.claude/rp.md`.

Shared cross-agent project instructions should live in `AGENTS.md`. CLI-specific Radical Pipelines conventions should live in `.pi/rp.md` or `.claude/rp.md`. `CLAUDE.md` may be a thin pointer to `AGENTS.md` (for example, `@AGENTS.md`); setup preserves that pattern and should not duplicate shared `AGENTS.md` content into `CLAUDE.md`.

See this repository's own [`.claude/rp.md`](./.claude/rp.md) and [`.pi/rp.md`](./.pi/rp.md) for examples. Pi projects should define the pipeline artifact folder convention (for example `.pipelines/<pipeline-slug>`), worktree root setup (for example `/worktree settings worktreeRoot .pi/worktrees`), and pi-teams spawning conventions.

## Current status and limitations

CLIs:

- Claude Code
- Pi

Phases:

- It only supports phase 1 (spec generation).

Pi package limitations:

- pi-teams currently reads predefined agents/templates from global or project-local locations, not package-local files, so project-local `.pi/agents/*.md` and `.pi/teams.yaml` may need to be set up before predefined Radical Pipelines teams are visible.
- Local validation on Node v20.14.0 produced npm `EBADENGINE` warnings from transitive dependencies and two moderate `npm audit` findings.
- Open PRs may change nearby guidance later: PR #6 may improve pi-teams examples, PR #10 may change convention setup, and PR #12 may add orchestration safeguards. This package does not depend on those PRs being merged.
