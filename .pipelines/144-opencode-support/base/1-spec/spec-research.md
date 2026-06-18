# Spec Research

## Rough Idea

> Source: GitHub issue Automattic/radical-pipelines#144 (https://github.com/Automattic/radical-pipelines/issues/144).

### Goal

Radical Pipelines can run on opencode, the same way it already runs on Claude Code and Pi. An owner using opencode can install RP — its agents, the skill, and a team layer — and run pipelines end-to-end through all phases.

### Constraints

- Support must follow the existing per-tool pattern: a conditionally-loaded tool-convention file plus a packaging artifact, mirroring the Pi support. The generic skill stays tool-agnostic and must not become opencode-aware.

### Context

- **opencode-ensemble** (`https://github.com/hueyexe/opencode-ensemble`, npm `@hueyexe/opencode-ensemble`) is an opencode plugin providing agent teams: parallel agents in their own sessions, peer-to-peer messaging, a shared task board with dependencies, per-agent model selection, and built-in supervision (stall detection, timeout watchdog, fast-idle auth-failure escalation, crash recovery, message redelivery, dashboard).
- opencode natively supports SKILL.md skills with progressive disclosure and also scans `.claude/skills/`, so RP's existing skill tree loads without changes.
- opencode custom agents live in `.opencode/agent/*.md` (or inline config) and are invokable by name; their frontmatter differs from Claude Code's.
- Enabling fact: ensemble's `team_spawn` takes a free-form `agent` string and passes it to opencode's session prompt, so RP's named agents (spec-writer, code-reviewer, …) can be spawned by name — not limited to opencode's built-in `build`/`explore`.
- opencode has no native recurring-loop/cron primitive (no `/loop` equivalent).

### Assumptions / directions to explore

_All open — later phases may confirm or overturn._

- Use ensemble as a coordination layer only (spawn-by-name, messaging, task board, supervision) and bypass its default per-teammate-worktree + squash-merge model by spawning with `worktree: false` and managing one git worktree per pipeline — preserving RP's one-branch-per-pipeline model, as the Pi convention already does.
- Health monitoring may be satisfied by ensemble's built-in supervision instead of a launched loop (since opencode lacks `/loop`), with the orchestrator handling auth-error model-swap reactively.
- Packaging may take the form of a single npm meta-plugin that re-exports ensemble and registers RP's agents + skill + a command via opencode's plugin `config` hook (one-entry install); an installer/repo bundle that copies files into `.opencode/` is a fallback.
- Ensemble defaults (timeout, stall threshold, rate limit, `mergeOnCleanup`) likely need RP-specific tuning written to `.opencode/ensemble.json`.
- Runtime requirement: ensemble needs Node ≥ 24 (for `node:sqlite`) or Bun.

## Q&A

### Q1: Does opencode-ensemble currently exist and provide the team-coordination primitives RP depends on?

RP's per-tool pattern requires, per `conventions/load.md`, a way to spawn a team of named agents that address each other directly (Team spawning), plus supervision for Health monitoring. The intent claims `@hueyexe/opencode-ensemble` provides: parallel agents in their own sessions, peer-to-peer messaging, a shared task board with dependencies, per-agent model selection, and built-in supervision. The linchpin enabling fact is that ensemble's `team_spawn` takes a free-form `agent` string passed to opencode's session prompt, so RP's named agents (spec-writer, code-reviewer, …) can be spawned by name rather than being limited to opencode's built-in `build`/`explore`.

Verify against the actual published package / repo as it exists today:

1. Does the package `@hueyexe/opencode-ensemble` (repo `https://github.com/hueyexe/opencode-ensemble`) exist and is it installable?
2. Does it expose a spawn-by-name mechanism (`team_spawn` or equivalent) that accepts a free-form agent identifier and routes to a named RP agent, not only opencode's built-ins?
3. Does it provide peer-to-peer messaging between spawned agents and a shared task board with dependencies?
4. Does it provide the built-in supervision the intent lists (stall detection, timeout watchdog, auth-failure escalation, crash recovery, message redelivery, dashboard)?

If any of these foundational claims is false, that is a blocker on the intent's premise.

**A:** YES on all four points — premise holds, no blocker. Verified against live npm + GitHub source.

1. **Exists / installable.** `@hueyexe/opencode-ensemble` is on npm, latest **0.15.0** (0.15.1 by Q5). Repo is real and active. Engines: `node >=24, bun >=1.0` (matches the intent's runtime note). Installed as an opencode plugin via `opencode.json`: `{ "plugin": ["@hueyexe/opencode-ensemble@0.15.0"] }`. README recommends **pinning the version** (opencode has a known bug caching unpinned plugins).
2. **Spawn-by-name with free-form agent string — CONFIRMED, not limited to `build`/`explore`.** Tool is `team_spawn`, signature `{ name, agent, prompt, model?, claim_task?, worktree?, plan_approval? }`. The `agent` string is free-form (not enum-validated); it flows into `session.create({ title: "<name> (@<agent> teammate)" })` and into the teammate context (`Your agent type is "<agent>"`). Only `agent === "plan" || "explore"` are special-cased as read-only. Bonus: the same `agent` string keys per-agent model selection via `config.modelsByAgent[agentType]` — so RP's **Agent models** convention maps onto ensemble's `modelsByAgent`.
3. **Peer-to-peer messaging + shared task board with dependencies — CONFIRMED.** Messaging: `team_message` (direct) + `team_broadcast` (all). Task board: `team_tasks_add` / `team_tasks_list` / `team_tasks_complete` / `team_claim`. Dependencies confirmed: `team_tasks_add` accepts `depends_on?: string[]`; a task with unresolved deps is inserted as `status="blocked"` and becomes claimable only once all `depends_on` tasks are `completed`/`cancelled`.
4. **Built-in supervision — 5 of 6 confirmed exactly; auth-failure reframed (later CONFIRMED real in Q3).** Confirmed via source: stall detection (`Watchdog`, default `stallThresholdMs` 5min, escalates to lead), timeout watchdog (`timeoutMs` default 30min, env override `OPENCODE_ENSEMBLE_TIMEOUT`), crash recovery (`recoverStaleMembers()` — stale `busy`→`error`, branches preserved before abort; `recoverOrphanedWorktrees()`), message redelivery (`getUndeliveredMessages()`/`markDelivered()`), dashboard (`http://localhost:4747`, `dashboardPort` config, `0` disables). Auth-failure escalation initially not found as a dedicated feature; Q3 later confirmed it exists (fast-idle detection). The orchestrator must own auth-error model-swap reactively — as the intent's assumption anticipates.

**Reasoning / caveats for design phase:**
- `team_spawn` routes via opencode's `session.create` + `promptAsync`, NOT via opencode's `.opencode/agent/*.md` registry. The `agent` arg sets the session title/context label. **How RP's agent definitions/personas actually load into the spawned session is an open question** (resolved in Q2).
- `team_spawn` supports `worktree: false` as a first-class arg (currently auto-applied to read-only agents). Default is per-teammate worktree + `team_merge`/squash on cleanup. RP would spawn with `worktree: false` and manage its own pipeline worktree — enabling the intent's one-branch-per-pipeline plan.

**Sources:** `npm view @hueyexe/opencode-ensemble version|dist-tags|engines`; `gh api` reads of `src/tools/team-spawn.ts`, `team-create.ts`, `team-tasks-add.ts`, `src/messaging.ts`, `src/watchdog.ts`, `src/recovery.ts`, `src/rate-limit.ts`; README.md (dashboard ~141-165, tools + Reliability 264-302, config defaults + env overrides 370-424).

### Q2: How does an RP named agent's definition (its instructions/persona) actually get loaded when ensemble spawns it by name?

Q1 established that `team_spawn`'s `agent` string is free-form and only sets the session title + a "Your agent type is X" context line. RP's Goal requires each spawned agent to actually behave as `spec-writer`, `code-reviewer`, etc. — running with that agent's full instruction body from `agents/<name>.md`. So: when ensemble spawns `team_spawn({ agent: "spec-writer", ... })`, what makes the resulting session load and follow the `spec-writer` definition? (1) Does opencode resolve the `agent` name against registered agents in `.opencode/agent/<name>.md`, or does ensemble bypass the registry and require injection via the prompt? (2) opencode's registration mechanism + frontmatter schema, and how it differs from Claude Code's. (3) For RP's 17 agents, where must files live and is conversion required?

**A:** Ensemble does NOT bypass opencode's agent registry. `team_spawn` forwards the `agent` string to opencode's `session.promptAsync({ agent })`, and **opencode itself resolves that name against its registered agents and loads the matching persona** (frontmatter → config, Markdown body → system prompt). So for RP's agents to behave correctly they must be **registered with opencode** as named agents. opencode's agent frontmatter differs from Claude Code's, so **the existing `agents/*.md` cannot be reused as-is for full fidelity** (model + tool scoping need conversion); the body is reusable verbatim.

1. **opencode resolves by name, loads the persona.** `team-spawn.ts:363-369` calls `promptAsync({ agent: args.agent })`; the `parts` text is ensemble's coordination boilerplate, not RP's persona. opencode loads agents from disk (`packages/opencode/src/config/agent.ts:11-32`): glob `{agent,agents}/**/*.md`, **filename → agent name**, **frontmatter → config**, **Markdown body → the agent's system prompt (`prompt`)**. When a session runs with `agent: "spec-writer"`, opencode applies that agent's body + model/permission — exactly the fidelity RP needs, **but only if a `spec-writer` agent is registered**. If the name isn't registered, opencode falls back to the default agent (`build`) and RP's persona is absent.
2. **Registration mechanism + frontmatter.** Agents live under `{agent,agents}/**/*.md` (opencode accepts both singular and plural; `.opencode/agent/` is valid). Search roots: `~/.config/opencode` (global) and every `.opencode` dir walking up to the worktree root (project). **opencode does NOT scan `.claude/agents/` for agents — `.claude` compatibility is skills-only** (`skill/index.ts:21`, pattern `skills/**/SKILL.md`). So RP's skill tree under `.claude/skills/` loads unchanged, but **agents get no `.claude` free ride.** Frontmatter schema (`packages/core/src/v1/config/agent.ts`): **all fields optional** (name comes from filename). Fields: `model` (`provider/model-id`), `description`, `mode` (`subagent`/`primary`/`all`), `prompt`, `temperature`/`top_p`, `permission` (object — modern tool-access control), `tools` (deprecated, maps onto `permission`), `disable`, `hidden`, `steps`, `color`, `variant`, `options`. Agents may also be defined inline in `opencode.json` under the `agent` key. **Differences vs Claude Code:** CC requires `name`+`description`; opencode requires none (name=filename). CC `model` is a bare alias (`opus`); opencode is provider-qualified (`anthropic/claude-opus-4-8`). CC scopes tools with `tools:`/`disallowedTools:` strings; opencode uses a `permission:` object. Both use the Markdown body as the system prompt.
3. **What RP must do for its 17 agents.** RP's `agents/*.md` are `name` + `description` frontmatter (confirmed across all 17) + plain-Markdown body. **Body: reusable as-is.** `name:` frontmatter is ignored (identity = filename, which already matches). `description:` is valid. A **minimal port (drop files into `.opencode/agent/`) would work for behavior**, but to carry RP's per-agent model config and read-only tool scoping you add opencode-format fields: `model: <provider/model>` (note: `.rp.md`'s "Agent models" currently uses Claude bare aliases — opencode needs provider-qualified, and per `setup.md` these values are tool-native, so they differ per tool) and optionally `permission` for read-only agents (researchers/reviewers/analysts). This is a **frontmatter rewrite, not a body rewrite.** **Delivery (Pi-analog Setup action), two options:** (a) **file install** — copy converted agent `.md` into `.opencode/agent/` (committed; recommend for `artifacts-in-repo`) or `~/.config/opencode/agent/` (per-user fallback) — direct analog to Pi's `.pi/agents/` vs `~/.pi/agent/agents/`; (b) **meta-plugin inline registration** — opencode's plugin `config` hook (`packages/plugin/src/index.ts:225`) can mutate `Config.agent`, so a meta-plugin re-exporting ensemble can inject RP's agents inline (the intent's one-entry install). Feasible per schema + loader.

**Reasoning / flag for design:** The meta-plugin inline `config`-hook registration was confirmed against schema + loader but NOT live-tested end-to-end — worth a design-phase spike.

**Sources:** ensemble `src/tools/team-spawn.ts:363-369`, `src/index.ts:388`; opencode (`sst/opencode` @ HEAD) `packages/opencode/src/config/agent.ts:11-32`, `config/paths.ts:23-41`, `skill/index.ts:21`, `packages/core/src/v1/config/agent.ts`, `permission.ts`, `config.ts:80-106`, `packages/plugin/src/index.ts:70-74,225`, `packages/core/src/config/plugin/agent.ts`; opencode docs (agents, config, skills); Claude Code agent spec (code.claude.com/docs/en/sub-agents).

### Q3: Does ensemble's built-in supervision satisfy RP's Health-monitoring contract, and what must the orchestrator still own?

Health monitoring is a *required* convention. RP's contract (`reference/health-monitoring.md`): a recurring monitor (CC/Pi launch via `/loop`) watching (a) no-output stall, (b) message failure, (c) login/API-key error, (d) network failure; a **2-retry recovery budget per issue** with an action ladder; and **escalates to the owner** with a payload (agent name, error verbatim, last-known progress, suggested next step). opencode has no `/loop`; the intent's assumption is ensemble's always-on supervision replaces the launched loop, with the orchestrator handling auth-error model-swap reactively.

**A:** Ensemble's supervision is **always-on** — started at plugin init via an internal `setInterval` (default 60s). It IS a recurring monitor, just internal and not launched by the orchestrator. It detects all 4 RP signals and **surfaces every unresolved issue to the lead's session as a persisted system `team_message`** (plus TUI toast + dashboard), so the owner/orchestrator finds out. The opencode health-monitoring shape is **"always-on ensemble supervision + orchestrator reacts to escalations as they surface in its own session," NOT "launch a loop."** There is **no recurring orchestrator action and nothing to launch or cancel.** The intent's assumption is confirmed.

1. **Signal-by-signal** (escalation-to-lead = `sendMessage(from:"system", to:"lead")`, delivered into the orchestrator's own conversation):
   - **No-output stall** — `Watchdog.checkStalled()` (token-stall or time-stall past `stallThresholdMs`). Nudges the teammate **+ messages the lead**. One-shot per session (`markReported`); **no 2-retry ladder, no auto-restart.**
   - **Hard timeout** — `Watchdog.check()` TTL (`timeoutMs`, default 30min): preserves branch → marks member `error`/`timed_out` → **aborts session**. Toast only; **does not message the lead** (gap — visible via dashboard/member status).
   - **Message failure** — messages persist `delivered=0`; `recoverUndeliveredMessages()` redelivers automatically; a hard delivery error surfaces via `session.error` → lead.
   - **Login/API-key error** — two paths, both message the lead with the **verbatim** provider error (see item 2). **No auto model-swap** — ensemble only reports.
   - **Network/transient** — opencode SDK auto-retries internally; ensemble shows a rate-limit toast. Auto-handled; no lead message unless it escalates to `session.error`.
   - **Key difference from RP's spec:** ensemble does **not** implement a per-issue 2-retry action ladder or auto-restart. One nudge (stalls) → otherwise mark/abort/report, leaving the *decision* (restart, shutdown, model-swap, re-spawn) to the lead. So the **retry budget + action ladder live with the orchestrator** on opencode.
2. **Auth-failure path — the intent's "fast-idle auth escalation" is REAL.** Two mechanisms, both message the lead: (a) **`session.error` event** (`index.ts:291` → `hooks.ts handleSessionErrorEvent`) — handler's own comment names "auth failure, tool failure, model error"; sends the lead the **verbatim** provider error. (b) **Fast-idle detection** (`index.ts:152-172`) — a teammate idle within **15s of spawn with zero messages** triggers a lead message naming authentication error / invalid model / provider issue as the likely cause and "check your API key… then retry the spawn." **Observable outcome:** on a spawned-agent auth failure, the orchestrator receives a system message in its own session. So **"orchestrator handles auth-error model-swap reactively"** = on that lead message, pick an authenticated `provider/model` other than the failed one and re-spawn — identical in spirit to Pi's recovery fallback.
3. **Net gap analysis:**
   - **Ensemble COVERS** (no orchestrator loop needed): continuous detection of all 4 signals; stall nudge; automatic message redelivery; network/transient retry; and durably surfacing unresolved issues to the lead session.
   - **The ORCHESTRATOR must own reactively:** auth-error model-swap + re-spawn; restart/re-spawn decisions; assembling the full escalation payload (ensemble gives agent name + verbatim error + suggested step, but RP also wants **last-known progress**); and the **2-retry budget/ladder semantics**.
   - **Recurring orchestrator action needed?** **No.** Ensemble's internal `setInterval` is the recurring engine; the orchestrator is **event-driven**. Nothing to launch, list, or cancel. Tune `.opencode/ensemble.json` (`stallThresholdMs` 300000, `timeoutMs` 1800000, `mergeOnCleanup` true) to RP's needs.

**Reasoning / two design-relevant implications:**
- **Generic `health-monitoring.md` framing must flex (without becoming opencode-aware).** It currently hard-frames a launched-and-cancelled loop. The fix: the generic file states the tool-agnostic outcome ("a recurring health monitor watches the run for the duration of the autonomous workflow"); the 4 signals / recovery intent / 2-retry budget / escalation payload stay generic; the **launch/cancel lifecycle moves down into the per-tool convention files** (CC/Pi: start `/loop`, cancel at close-out; opencode: always-on, nothing to launch/cancel).
- **Ensemble supervises teammates, not the lead.** If the orchestrator itself hits an auth/network error, ensemble won't catch it; on opencode that surfaces in the orchestrator's own TUI session (the human is watching it). Worth an explicit acceptance note.

**Sources:** ensemble @ HEAD — `src/watchdog.ts:96-150,180-235`, `src/index.ts:135,152-172,289-296,195-228`, `src/hooks.ts`, `src/recovery.ts`, `src/config.ts:37-50`. RP — `reference/health-monitoring.md`, `conventions/{claude-code,pi}.md`, `conventions/load.md`.

### Q4: Worktrees & branch names — how does the one-pipeline-worktree model work on opencode, and what must be neutralized in ensemble?

Worktrees and Branch names are both *required* conventions. RP's model is **one worktree + one branch per pipeline**, shared by every spawned agent as `cwd` (CC: `EnterWorktree`; Pi: `@zenobius/pi-worktrees`). The intent's plan: spawn with `worktree: false` and manage one git worktree per pipeline. Pin down: (1) create/enter/remove on opencode; (2) shared cwd for `worktree:false` agents; (3) neutralizing merge/cleanup; (4) branch name derivation.

**A:** `worktree: false` structurally neutralizes BOTH ensemble's per-teammate worktree and its squash-merge — every merge/preserve/worktree-removal path is gated on a non-null `worktree_branch`/`worktree_dir`, which `worktree:false` agents don't have. `mergeOnCleanup: false` is belt-and-suspenders. The one-worktree model works by **running the opencode instance (orchestrator session) inside the pipeline worktree**: a `worktree:false` child session inherits the instance's directory, so all agents share that worktree as cwd. Branch naming is fully RP's choice.

1. **Create/enter/remove — plain `git worktree`, orchestrator-driven.** opencode HAS a native worktree primitive (`packages/opencode/src/worktree/index.ts`, a `git worktree` wrapper exposed via SDK as `client.worktree.*`), but it's opencode's **per-session isolation machinery** (binds a session to an isolated dir via `workspaceID`) — what ensemble itself calls to give each teammate a worktree, NOT a project-level "enter and run the pipeline here" tool, and there's no CLI verb to drive it like CC's `EnterWorktree`. So RP uses **plain `git worktree add/remove` via the orchestrator's shell** (the generic `setup.md` default), removing at close-out. Ensemble exposes **no reusable worktree helper** — its worktree logic is purely internal.
2. **Shared cwd — `worktree:false` agents inherit the instance directory.** In `team-spawn.ts:88-90,179-183`, `worktree:false` leaves `worktreeDir`/`worktreeBranch`/`workspaceId` null, so `session.create` is called with **no `workspaceID` and no `directory`**. opencode resolves cwd from the instance context — `session.ts:722,738` create with `directory: ctx.directory` (the `InstanceState` directory). **Net: a `worktree:false` teammate runs in the opencode instance's working directory.** **Observable requirement:** RP must ensure **the opencode instance (and thus the orchestrator/lead session) runs inside the pipeline worktree**; then every `worktree:false` agent shares that directory automatically. The orchestrator does NOT pass a worktree path per-spawn.
3. **Neutralizing merge/cleanup — already neutralized by `worktree:false`; set `mergeOnCleanup:false` defensively.** `team_cleanup`'s safety-net merge filters `members.filter(m => m.worktree_branch !== null)` then merges only `if (unmerged.length > 0 && mergeOnCleanup)`. With `worktree:false` every `worktree_branch` is null ⇒ no merge runs; removal loop gated on null fields ⇒ no-ops. `team_merge` is **explicit lead-invoked only**. `team_shutdown`/recovery/watchdog branch-preservation all gated on `worktree_branch`/`worktree_dir` ⇒ no-ops. **So nothing in ensemble squash-merges or mutates RP's one-branch history; agents commit directly to RP's single branch (normal git flow).** Required: spawn all agents `worktree: false` + `.opencode/ensemble.json: { "mergeOnCleanup": false }` (defensive).
4. **Branch name derivation — fully RP's choice.** With plain `git worktree add -b <branch> <path>`, no opencode/ensemble constraint applies. Recommendation: match the existing RP convention `worktree-<pipeline-slug>`.

**Reasoning / one ergonomic unknown flagged for design:** The exact mechanics of "make the opencode instance's cwd the pipeline worktree" (launch-from-worktree vs. mid-session switch) could NOT be fully pinned from source — a **design-phase spike**.

**Sources:** ensemble @ HEAD — `src/tools/team-spawn.ts:88-90,179-183`, `team-cleanup.ts`, `index.ts:545`, `team-shutdown.ts`, `merge-helper.ts`/`team-merge.ts`, `config.ts:37-50`. opencode — `packages/opencode/src/worktree/index.ts`, `session/session.ts:722,738`. RP — `.rp.md`, `setup.md`, `conventions/pi.md`/`claude-code.md`.

### Q5: Packaging — how does an opencode owner install RP (agents + skill + team layer + orchestrator entry), and what is the packaging artifact?

The constraint requires "a packaging artifact, mirroring the Pi support"; the Goal is the owner can "install RP — its agents, the skill, and a team layer." Pi's artifact is the repo's `package.json` `pi` block. The intent proposes a single npm meta-plugin (one-entry install) with a file-copy bundle as fallback.

**A:** A single npm plugin entry in `opencode.json`'s `plugin: []` CAN deliver the team layer + agents + skill + a command, but the delivery *mechanism* splits by piece and confidence. **Verified-feasible** for the whole feature: meta-plugin re-exports ensemble's tools (team layer active from one entry) + ships agents and skill as **bundled files** installed into `.opencode/` (or `.claude/skills/`). **Needs-a-spike (not load-bearing):** registering agents/skill *purely* via the plugin `config` hook — the hook is invoked as a notification whose result is ignored. So the feature is deliverable regardless; the spike only decides how slick the install is.

1. **Install entry / owner action.** Plugins load via `opencode.json` `{ "plugin": ["<npm-pkg>@<version>"] }` (auto-installed; also auto-loads local plugins from `.opencode/plugin/` and `~/.config/opencode/plugin/`). One entry CAN deliver everything if RP ships its own npm plugin (e.g. `@automattic/radical-pipelines-opencode`) that depends on + re-exports ensemble, registers RP tools/command, and points opencode at bundled skill+agent dirs. **Fallback (Pi-style, fully verified):** a bundle/installer copies converted agents into `.opencode/agent/` and the skill into `.opencode/skill/` (or `.claude/skills/`), and lists ensemble directly in `plugin: []`.
2. **The three pieces:**
   - **Team layer (ensemble) — VERIFIED.** ensemble (now **0.15.1**) default-exports a `Plugin` fn returning `{ event, tool, config, … }`. A meta-plugin imports ensemble, calls `ensemble(input)`, and merges its hooks. **Critical load-order caveat:** opencode resolves the plugin list once from `cfg.plugin_origins` at init, *before* hooks run — so a meta-plugin **cannot** add ensemble to `plugin: []` via its `config` hook; it must import-and-merge ensemble's hooks (re-export) OR the owner lists both packages. Re-export is structurally sound (minor smoke test: no double-init).
   - **Agents — file-based VERIFIED; config-hook injection NEEDS A SPIKE.** Verified: ship the 17 converted agent `.md` into `.opencode/agent/` or `~/.config/opencode/agent/`; opencode globs them and `team_spawn({ agent })` resolves them. Spike: inline `config: cfg => cfg.agent[...] = {…}` — the hook is `(hook).config?.(cfg)` with the result `Effect.ignore`d under "Notify plugins of current config." **Verdict: default the design to file-based agent install; adopt inline injection only if a spike proves agents become `team_spawn`-selectable.**
   - **Skill — file-based VERIFIED; plugin-set path feasible (milder spike).** opencode discovers skills from `.opencode/skill(s)/**/SKILL.md`, `.claude/skills/**/SKILL.md`, globals, AND `config.skills.paths`. An owner whose repo lacks RP's skill gets it via (a) bundle the skill in the npm package and push its absolute path into `config.skills.paths` (same config-hook uncertainty), or (b) file-copy the skill into `.opencode/skill/radical-pipelines/` (fully verified). RP's skill "loads without changes" under `.claude/skills/` only if the repo already has it.
   - **Orchestrator entry ("a command") — minimal, likely NOT required.** opencode commands are file-based prompt templates. But the orchestrator is the RP **skill**: the owner says "work on issue X", opencode loads `radical-pipelines/SKILL.md`, and the orchestrator drives everything. **Orchestrator-launch UX = plain skill invocation, same as CC/Pi.** A `/radical-pipelines` command is optional sugar.
3. **Packaging artifact identity.** Pi's artifact = the `pi` block in this repo's `package.json` (`private:true`, installed from git/local). opencode analog = **a publishable npm plugin package** (entry exporting the `Plugin` fn, deps `@hueyexe/opencode-ensemble` + `@opencode-ai/plugin` + `@opencode-ai/sdk`, `files: [dist, agent, skill, command]`, `engines: { node: ">=24" }`). This repo's `package.json` is a **private Pi package** with a conflicting dep set, so the cleanest shape is a **separate publishable package** (sibling monorepo or its own wrapper); the agent `.md` files and skill tree are **shared source**. The monorepo-split-vs-separate decision is design-phase; the constraint "mirroring the Pi support" is satisfied by a conditionally-loaded `conventions/opencode.md` + a packaging artifact (the npm plugin).
4. **Runtime prerequisite (Node ≥24 / Bun).** Surface in all three: (1) the plugin package's `engines: { node: ">=24", bun: ">=1.0" }` (hard gate); (2) a setup-time check in opencode.md's Setup actions; (3) docs/README. ensemble fails at runtime without `node:sqlite` ≥24.

**Verified-vs-spike summary:** VERIFIED — one `plugin:[]` entry + npm auto-install; meta-plugin re-export of ensemble's tools; file-based agent install; file-based skill; `config.skills.paths` exists; commands file-based/optional; orchestrator UX = skill invocation; `engines` Node≥24. NEEDS SPIKE — config-hook `Config.agent[...]` selectability; plugin-set `config.skills.paths` honoring a package-bundled path. Both are *programmatic one-entry* niceties; the file-based equivalents are verified, so the feature is deliverable regardless.

**Sources:** ensemble `package.json` + `src/index.ts:47,137,368,600`; opencode `packages/plugin/src/index.ts:222-`, `packages/opencode/src/plugin/index.ts:100-248`, `install.ts`/`loader.ts`, `core/v1/config/config.ts:41,44,56,93,121`, `config/skills.ts`, `config/command.ts`, `skill/index.ts:211-222`; opencode docs (plugins); RP `package.json`, `.claude-plugin/{plugin,marketplace}.json`.

### Q6: Exactly which generic-skill files must change to register opencode, and which conventions are tool-agnostic?

The core constraint is the generic skill stays tool-agnostic and must not become opencode-aware. To set the spec's scope boundary precisely, enumerate the generic touch-points vs. purely-new opencode-specific content.

**A:** Exhaustive grep of `skills/radical-pipelines/` shows **only TWO generic files name a specific tool**, both only by pointing at the per-tool convention files — **zero tool-branching logic in any generic file.** Registering opencode = (a) one row in the `setup.md` supported-tools table, (b) a minimal wording flex of `health-monitoring.md`'s loop lifecycle, plus the new `conventions/opencode.md` and the packaging artifact.

1. **Complete generic touch-points:**
   - `conventions/setup.md` Step-1 supported-tools table — **edit: add `| opencode | opencode.md |`.** Only place opencode is registered as selectable.
   - `health-monitoring.md` lines 13 and 79 — the only other generic tool mentions, via "see `conventions/claude-code.md` or `conventions/pi.md`"; these also hard-assume a launched/cancellable loop (item 2).
   - **Confirmed clean (no tool name, no branch):** `SKILL.md`, `conventions/load.md`, `work-on-an-issue.md`, `create-pipeline.md`, `fork-pipeline.md`, `resume-pipeline.md`, `review-pipeline.md`, `manage-issues.md`, `pipeline-versioning.md`, `intent-format.md`, `summary-format.md`, all `autonomous-phases/*`, `assisted-phases/*`, `autonomous-workflow.md`, `assisted-workflow.md`.
   - **`setup.md` Step 3 is ALREADY generic** ("Consult the active tool's rules file for a Setup actions section… perform the actions described") — **no edit**; it auto-picks up opencode.md's Setup actions.
2. **Health-monitoring flex — minimal, CC/Pi unchanged.** Loop-lifecycle sentences that hard-assume launch/cancel: L5, L7 heading, L9, L13, L77-79. **Minimal flex:** keep the 4 signals, the 2-retry ladder, the escalation payload, and "no monitor in the assisted workflow" generic; soften the *lifecycle* to a tool-agnostic outcome ("a recurring health monitor watches the run for the duration of the autonomous workflow; the active tool's rules describe how it is provided and, if applicable, started and stopped"). CC/Pi keep `/loop` + `/loop-kill` in their own files; opencode says always-on. **CC/Pi behavior unchanged.** No load.md edit.
3. **Tool-agnostic conventions — confirmed NO opencode-specific behavior (only value formats).** Pipeline base slug, Artifact folder, Issues, Guardrails, Artifact storage run identically under opencode. **Agent models** value format is tool-native (provider-qualified `provider/model` → ensemble `modelsByAgent`), captured at setup as `setup.md` already designs. Artifact storage's only opencode touch is *where agents install* (lives in opencode.md's Setup actions, keyed off `artifacts-in-repo`/`artifacts-in-fork`). No generic change.
4. **`conventions/opencode.md` completeness vs. the REAL pi.md.** pi.md structure: a fenced **`## Canonical .rp.md content for Pi`** block + a separate **`## Setup actions`** section. **opencode.md should follow pi.md (not the lighter claude-code.md) since opencode — like Pi — needs an install step.** My listed content is correct **plus** these pi.md-parity items to add:
   - **Canonical `.rp.md` block wrapper** — package worktrees/branch/team-spawning/health-monitoring as the fenced `.rp.md` block (with `##` sub-headers), like pi.md/cc.md.
   - **Agent-discovery verification step** — after installing agents, direct the owner to verify they're discoverable (opencode `/agents` listing / autocomplete shows `spec-writer` etc.).
   - **Check-existing-then-install structure keyed off artifact-storage** — check `.opencode/agent/` + `~/.config/opencode/agent/`, report found/missing, install missing keyed off mode; plus skill delivery and the Node≥24/Bun prerequisite check.
   - **pi.md-style auth-recovery rule (in team-spawning section)** — on the lead receiving an auth/fast-idle escalation, pick an authenticated `provider/model` other than the failed one and re-spawn (not interactive login, distinct from per-agent Agent-models config). (Spike: the opencode analog of `pi --list-models`.)
   - **No-relay + orchestrator-intervention paragraph** — the shared rule pi.md/cc.md carry, with opencode's `team_message`/`team_broadcast` as the mechanism.
   - **Shared-task-list awareness note** — cc.md's "track phase progress in the phase subfolders, never on the task list," since ensemble's `team_tasks_*`/`team_claim` board is exactly such a list with idle-claim nudging.
   - **opencode.md will be slightly larger than pi.md** because it uniquely must neutralize a team layer (per-teammate worktree + merge) that CC/Pi's layers don't impose — the `team_spawn({worktree:false})` rule + `.opencode/ensemble.json` `mergeOnCleanup:false` are opencode-only and correctly belong here.
   - (Skill-hygiene flag for the writer, not a requirement: the no-relay+intervention paragraph is triple-duplicated across cc.md/pi.md/opencode.md — per the repo's anti-duplication rule it could be extracted to a shared file referenced by all three.)

**Net (locks Requirements vs Out-of-Scope):** Generic edits = `setup.md` +1 table row + `health-monitoring.md` lifecycle flex. New tool file = `conventions/opencode.md` mirroring pi.md. Packaging = npm meta-plugin + bundled agents/skill. Out of scope = all other generic files, all tool-agnostic conventions (only value formats differ), setup.md Step 3.

**Sources:** exhaustive grep of `skills/radical-pipelines/` (only `setup.md:21-24` + `health-monitoring.md:13,79` name tools generically); `health-monitoring.md:5,7,9,13,77-79`; `setup.md:201-207`; `conventions/pi.md` (canonical block + Setup actions structure); `conventions/claude-code.md` (canonical block only); `load.md`. Plus Q1–Q5.

## Research

(No standalone research topics beyond the Q&A above — all investigation was driven through the questions.)

## Consolidated Requirements

Each requirement is an observable outcome (the WHAT). Mechanism details (the HOW) live in the Q&A above as design input.

### Core support

1. An owner whose active agentic coding tool is opencode can run Radical Pipelines end-to-end — every phase (Intent → Spec → Design doc → Plan → Code → Docs), in both the autonomous and assisted workflows — producing the same inspectable artifacts RP produces on Claude Code and Pi.
2. opencode is a selectable, supported tool: when RP's setup flow runs, opencode appears in the supported-tools list alongside Claude Code and Pi, and selecting it loads an opencode-specific convention file.
3. A team of RP's named agents (spec-writer, code-reviewer, and all other RP agents) can be spawned on opencode, and each spawned agent behaves with full fidelity to its RP agent definition (it runs that agent's instructions, not opencode's generic built-in behavior).
4. Spawned agents on opencode address each other directly (peer-to-peer messaging and a shared task board with dependencies); the orchestrator only spawns, monitors, and waits, stepping in to recover only when an inter-agent exchange fails — the same collaboration model RP uses on Claude Code and Pi.

### One worktree, one branch per pipeline

5. All work for a pipeline on opencode happens in a single git worktree on a single branch, shared by the orchestrator and every spawned agent; opencode's team layer never creates per-agent worktrees and never squash-merges or otherwise rewrites the pipeline's one-branch history.
6. The pipeline branch on opencode follows RP's branch-naming convention (`worktree-<pipeline-slug>`), consistent with the other supported tools.

### Health monitoring

7. During an autonomous run on opencode, the run is continuously monitored for stalls, failed inter-agent messages, provider auth/login failures, and network failures, without the orchestrator launching or cancelling any separate monitor — supervision is always-on and these conditions surface to the orchestrator as they occur.
8. When a spawned agent fails to start or operate due to a provider authentication/login failure, the orchestrator learns of it and recovers by re-spawning the agent on a different authenticated provider-qualified model (not by interactive login, and distinct from the agent's configured model), or escalates to the owner if no authenticated model is available.
9. When a monitored condition cannot be auto-resolved, it is escalated to the owner with the affected agent's name, the verbatim error, the agent's last-known progress, and a suggested next step — the same escalation contract RP uses on the other tools. (Assisted runs use no monitor; the owner is already in the loop.)

### Per-agent model selection

10. Each RP agent can run on a per-agent-configured model on opencode (with a project-wide default), expressed in opencode's provider-qualified `provider/model` form, mirroring the existing per-tool Agent-models convention.

### Installation and packaging

11. An owner can install Radical Pipelines for opencode and obtain all three pieces it needs — RP's agents, RP's skill, and the team-coordination layer — and then run pipelines; an owner whose repository does not already contain RP's skill tree still obtains it through the install.
12. Installing RP for opencode is delivered through a packaging artifact analogous to the Pi packaging artifact (an opencode plugin package), and the generic skill remains tool-agnostic — it gains no opencode-specific awareness or branching.
13. The opencode runtime prerequisite (Node ≥ 24, or Bun) is surfaced to the owner at install/setup time, and setup does not declare opencode ready when the prerequisite is unmet.
14. opencode's team-coordination layer is tuned for RP (e.g. supervision thresholds and the no-merge-on-cleanup setting) via opencode-side configuration, so default behaviors that conflict with RP's model are neutralized.

### Setup actions (opencode-specific, mirroring Pi)

15. When setting up opencode, RP checks whether its agents are already discoverable, reports which are present and which are missing, and installs the missing ones only after confirming the destination — choosing the destination based on the project's artifact-storage mode (committed vs. per-user), the same way Pi's setup does.
16. After installing agents for opencode, the owner is directed to verify the agents are discoverable by opencode before proceeding.

### Scope boundary (what changes vs. what stays)

17. Registering opencode requires changes to exactly two existing generic skill files — the setup supported-tools list (one new entry) and the health-monitoring file (a lifecycle wording change that keeps it tool-agnostic) — and these changes leave Claude Code and Pi behavior unchanged.
18. All opencode-specific behavior is confined to the new conditionally-loaded opencode convention file plus the packaging artifact; no other generic skill file and no tool-agnostic convention (pipeline slug, artifact folder, issues, guardrails, artifact storage) gains opencode-specific content beyond tool-native value formats already provided for.

### Out-of-scope candidates

- Changing how RP behaves on Claude Code or Pi (their conventions and behavior stay as-is).
- Making the generic skill aware of, or branch on, opencode (or any specific tool).
- Removing or altering RP's one-worktree/one-branch-per-pipeline model to adopt opencode's team layer's native per-teammate-worktree + squash-merge model.
- Building a bespoke recurring health-monitor loop for opencode (opencode has no loop primitive; always-on supervision + reactive orchestrator handling replaces it).
- Supervising orchestrator-level (lead-session) auth/network failures via the team layer — these surface in the owner's own session, which the owner is watching; only spawned-teammate conditions are auto-supervised. (Worth an explicit acceptance note rather than a guarantee.)
- A required standalone orchestrator "command"/slash entry — the orchestrator is launched by plain skill invocation as on the other tools; any `/radical-pipelines` command is optional discoverability sugar, not required.

### Design-phase spikes (deferred, not spec blockers — feature is deliverable via verified file-based paths regardless)

- Whether agents/skill can be registered purely via the opencode plugin `config` hook (the slick one-entry install) vs. the verified file-based install; the config hook is invoked as a notification whose result is ignored, so config mutation reaching opencode's loaders is unconfirmed.
- The exact ergonomics of making the opencode instance's working directory be the pipeline worktree (launch-from-worktree vs. mid-session directory switch).
- The opencode analog of `pi --list-models` for enumerating authenticated provider-qualified models during auth-error recovery.
- A smoke test that a meta-plugin re-exporting the team layer does not double-initialize it.
