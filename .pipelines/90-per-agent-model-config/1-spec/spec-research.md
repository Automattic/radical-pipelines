# Spec Research

## Rough Idea

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

### Goal

A project using Radical Pipelines should be able to decide which model each agent runs on — and tune model settings such as reasoning `effort` — and have those choices persist across all pipeline runs, without baking any of it into the agent profile files. Projects that don't configure anything keep today's behavior (agents inherit the runtime/session model and its default settings).

### Constraints

- The agent profile files must stay generic/model-agnostic — model and settings choices must not live in them.
- The mechanism must be optional — a project that sets nothing is unaffected.

### Context

- Today the pipeline is model-agnostic at the orchestration layer: agent profiles in `agents/` declare only `name`/`description` (no `model:` field), and there's no per-phase/per-agent model config. Models are only swapped during failure recovery (e.g. Pi login/API-key errors).
- This came out of a discussion about whether a model can be chosen per agent: it *can* be overridden at spawn time, but that choice doesn't persist — there's no declarative place to record it.

### Assumptions / directions to explore (open)

These are the owner's current hypotheses, not settled requirements. Validate them through research and decide what the requirements actually are.

- Add it as a project convention (alongside the others in `.rp.md`) plus a configuration that maps agents — and possibly phases — to a model and/or model settings (e.g. `effort`, and whatever else the runtime supports), which the orchestrator reads and applies when spawning each agent.

## Q&A

### Q1: At what granularity should a project be able to target model/settings configuration — per individual agent (e.g. `spec-writer`), per phase (e.g. phase 1 / spec), both, or some broader scope (e.g. a project-wide default)? If more than one level is allowed, what is the precedence/override order, and is there evidence in the codebase or the owner's discussion that any particular level is actually needed?

**A:** Two levels: **per-agent (primary, finest unit) plus an optional project-wide default**, with per-agent overriding the default. Do **not** add a separate "per-phase" level — it buys nothing here and adds ambiguity. Optional name-pattern/prefix matching (e.g. `spec-*`) on the same per-agent map can give phase-ish grouping for free, but treat that as a design-phase nicety, not a spec requirement. Precedence (most specific wins): **exact agent name > (optional) name-pattern/prefix > project-wide default > unset (today's behavior: inherit runtime/session model + default settings).**

**Reasoning:**
- **Per-agent is the natural unit** because the orchestrator spawns *named agents*, not "phases," and there is **zero agent reuse across phases** — every agent name maps to exactly one phase. So per-agent is strictly finer-grained than per-phase: anything per-phase could express, per-agent can too; the reverse is false.
- **"Phase" is not a clean unit.** Most phases spawn multiple distinct agents with very different workloads (phase 1 spawns 4: analyst, researcher, writer, reviewer; phases 2 and 3 spawn 4; phases 4 and 5 spawn 2 each). A per-phase knob would force a cheap reviewer and a heavy writer onto the same model. The cost/quality axis the owner cares about (tuning `effort`) splits *within* a phase, so per-agent is the granularity that serves the goal. Phase 3 even spans two name prefixes (`code-plan-*` and `doc-plan-*`), so a single prefix ≠ a phase there.
- **The issue gives no concrete reason for a separate per-phase level.** `prompt.md` lists per-phase only as an open hypothesis ("maps agents — and possibly phases"), explicitly flagged as not-settled; the GitHub issue has no comments adding a phase-specific use case.
- **A project-wide default keeps config DRY:** the common case is "run the whole pipeline on model X" without repeating X across 16 agent entries; per-agent entries override the default for the few agents that differ.
- **Two scope flags surfaced:** (a) the **assisted workflow spawns no sub-agents** (`assisted-workflow.md`, each `assisted-phases/*.md` says no agents are spawned), so per-agent model config only bites in the **autonomous** workflow — worth a scope note. (b) `spec-consolidator` is **not a required agent** in any current autonomous/assisted phase reference (only mentioned in a blocker note), so the effectively-targetable roster is the 16 phase agents.

**Sources:** `0-prompt/prompt.md:19-24`; `gh issue view 90 … --json comments` → `[]`; `agents/*.md` (17 profiles / 17 names, all model-agnostic); 1:1 name→phase mapping verified by grepping each name across `reference/autonomous-phases/*.md`; per-phase agent counts in each `autonomous-phases/*.md` "Required agents" table; `reference/autonomous-phases/{1 - spec,2 - design-doc,3 - plan,4 - code,5 - docs}.md`; `reference/assisted-workflow.md:3` and `assisted-phases/*.md:3` (no agents spawned in assisted mode).

### Q2: Is choosing a model — and tuning settings like reasoning `effort` — even expressible at spawn time in BOTH supported runtimes (Claude Code team/subagent spawning and Pi `pi-teams`)? Specifically: (a) can the orchestrator set a per-spawned-agent model in each runtime, (b) can it set `effort` (or analogous settings) per spawned agent, and (c) do the two runtimes name/identify models the same way or differently (e.g. Claude Code aliases vs Pi `provider/model`)? This determines whether the observable config is one uniform schema or must accommodate runtime differences.

**A:** Model is settable per spawned agent in **both** runtimes; `effort` is a first-class per-agent knob in Claude Code but **model-conditional**; the two runtimes name models **differently**, so a single project-authored value is **not portable** and the config must be expressed **per-tool**, with the orchestrator treating values as **opaque pass-through** to the active CLI.

- **(a) Model per spawned agent — YES in both.**
  - *Claude Code:* `claude --help` exposes `--model <alias|full-id>` and `claude agents --help` exposes `--model` as the "Default model for sessions dispatched from agent view" — i.e. model is settable per dispatched session, independent of the orchestrator's own session. (CC subagent frontmatter also has a `model:` field, but the prompt forbids putting model in the profile, so the orchestrator must set it at **spawn time** via the tool surface, not via frontmatter. An open CC bug report claims frontmatter `model:` is ignored — unverified — which further argues for the spawn-time path. The spec should say "applied by the orchestrator at spawn" and stay agnostic about the exact CC mechanism.)
  - *Pi:* genuine per-teammate model selection via `provider/model`, already documented for `pi-teams` spawning (`.rp.md:119`, `:125-127`; `conventions/pi.md:30`). Today it's only used during failure recovery; this feature makes the choice **declarative/persistent**.
- **(b) `effort` per spawned agent — YES in Claude Code, but model-conditional.**
  - *Claude Code:* `claude --help` shows `--effort {low,medium,high,xhigh,max}` and `claude agents --help` shows `--effort` as the per-dispatched-agent default — same path as model. **Verified this session.**
  - **Model-conditional (from the bundled `claude-api` skill reference — first-party reference, not a live API check this session):** effort works on Opus 4.5/4.6/4.7/4.8 and Sonnet 4.6; **errors on Sonnet 4.5 and Haiku 4.5**; `max` is Opus-tier only; `xhigh` added on Opus 4.7. So `effort` is **not a universally-available knob** — its validity depends on the chosen model. Setting `effort` on an agent pinned to Haiku would error. CC's own default effort is `xhigh` on Opus 4.7/4.8.
  - *Pi:* documented spawn knob is the `provider/model` string; no repo evidence of a separate per-teammate effort flag (would need a live `pi`/pi-teams check, which was unavailable — `pi not found` in this env).
  - **Realistic scope of "whatever else the runtime supports":** in CC the per-dispatched-agent knobs are `--model`, `--effort`, `--permission-mode`, plus MCP/settings/dirs — but model + effort are the two that map to issue #90's intent. Recommend scoping the spec to **model + effort as named settings**, with an open-ended "and other runtime-supported model settings" escape hatch rather than enumerating more.
- **(c) Model identity / naming — NOT portable across tools.**
  - *Claude Code:* bare aliases (`opus`/`sonnet`/`haiku`) or full first-party IDs (`claude-opus-4-8`), **no provider prefix**. Verified from `claude --help`.
  - *Pi:* **provider-qualified** `provider/model`, explicitly preferred over a bare name (`.rp.md:119`); Pi spans multiple providers and has an auth/`--list-models` model CC lacks.
  - So the same logical choice needs different strings per tool ("strongest Anthropic model" = `opus`/`claude-opus-4-8` in CC vs `anthropic/claude-opus-4-8` in Pi). No single portable token; effort's value space is CC-specific.
- **(d) Unset = today's behavior in both.** CC subagent `model:` defaults to `inherit`; Pi without a configured model falls back to its session/owner default. Confirmed.

**Implications for the spec:**
1. **Config must be per-tool, not one universal schema** — mirror the existing `.rp.md` structure (shared notion + per-tool sections holding tool-native values), matching how `.rp.md` and the conventions system already separate Claude Code and Pi.
2. **Orchestrator treats configured values as opaque pass-through** — reads the agent→{model, settings} map for the active tool and hands values to the spawn call verbatim; it does NOT translate a CC alias into a Pi `provider/model` or validate effort against the model (avoids encoding a model-capability matrix that goes stale).
3. **`effort` is best-effort, model-dependent** — optional; valid values depend on the chosen model/runtime; misconfiguration surfaces as a runtime error from the CLI, not something the orchestrator pre-validates (unless we add a requirement that it surfaces such failures cleanly).
4. **Unset → unaffected, in both tools.**

**Sources:** `claude --help` and `claude agents --help` run this session (CC v2.1.168) — `--model`, `--effort {low,medium,high,xhigh,max}`, agent-view "default for dispatched sessions" flags (directly verified); CC subagent frontmatter `model:` (alias/full-ID/`inherit`, default `inherit`) — official docs https://code.claude.com/docs/en/sub-agents; frontmatter-`model`-ignored caveat — GitHub issue anthropics/claude-code#44385 (unverified whether current/fixed); effort model-conditionality and CC naming — bundled `claude-api` skill reference (first-party reference, model/skill knowledge, not an independent live-API check); Pi `provider/model` per-teammate spawning + multi-provider + `pi --list-models` — `.rp.md:119-128`, `conventions/pi.md:30`, `health-monitoring.md:36` (repo-documented; `pi` CLI not installed in this env).

### Q3: Where should the configuration live, and what is its required-vs-optional status in the conventions-loading machinery? Specifically: (a) does it extend `.rp.md` (per-tool sections, matching the per-tool finding from Q2) or live in a separate file the orchestrator reads; (b) does it become a new row in the `load.md` conventions table, and is it **optional** so a project that configures nothing is not blocked at workflow start and is unaffected; (c) how does the absence of any config produce exactly today's behavior (no convention present → orchestrator spawns with no model/settings override)?

**A:** Put it in **`.rp.md`, extending the per-tool sections** (Claude Code / Pi). Add **one new optional row** to the `load.md` conventions table (`Required? = No`). "No config present" already maps to today's behavior with **no new default-to-nothing branch** needed — the feature is purely additive and gated on the config being present.

- **(a) Location — extend `.rp.md`'s per-tool sections.** Three pieces of existing machinery point the same way: (1) `.rp.md` is the single config surface, already holding shared + per-tool CC/Pi sections (`.rp.md:58-146`; `README.md:167` describes the hand-maintained dual-tool `.rp.md`) — and per-tool, non-portable values (Q2) belong in those per-tool sections, not a shared block; (2) setup writes only `.rp.md` (`setup.md:176-178`), so a separate file would invent a second write target/read path; (3) `load.md` reads `.rp.md` at workflow start (`load.md:5-7`), which is exactly what satisfies the prompt's "persist across all pipeline runs" — anything in `.rp.md` is loaded every run for free. Map shape (inline vs. large block) is a design-phase formatting choice; it doesn't change the "lives in `.rp.md`" decision.
- **(b) Conventions table / optionality — new row, `Required? = No`.** There's clean precedent for optional conventions: **Commit format** (`load.md:15`) and **Team spawning** (`load.md:19`) are both already `No`. The setup-blocking path keys **only off required conventions** — `load.md:24` ("If all **required** conventions are available, continue… unchanged"), `load.md:26` ("If one or more **required** conventions are missing, do not proceed… Read `setup.md`"). An absent optional convention never reaches the "missing → block" branch. So marking the new row `No` guarantees the prompt's "optional — a project that sets nothing is unaffected" at the loader level with zero special-casing.
- **(c) Absence → today's behavior, no new branch.** Today the orchestrator passes exactly two conventions in each agent's initial prompt — **Artifact folder** and **Commit format** (`autonomous-workflow.md:59-61`); **model is not passed at all**, so agents inherit the runtime/session model and defaults. The per-tool Team-spawning blocks don't hardcode a model either (`conventions/claude-code.md:26-31` = just `TeamCreate`; Pi's `provider/model` at `conventions/pi.md:24-30` / `.rp.md:116-130` is preference/recovery, not a mandatory per-spawn value; with nothing configured Pi falls back to the owner's session/default). The "do nothing" branch **is** the current path. The feature adds: *if* the optional config has an entry for the agent being spawned, the orchestrator applies that tool's model/settings at spawn; *if not*, it spawns exactly as today.

**Key subtlety for the spec:** model/settings are **not** passed in the agent's *initial prompt* the way Artifact folder / Commit format are (those are instructions to the agent). Model/effort are **spawn parameters** the orchestrator gives the team-spawning tool (`--model`/agent-view for CC; the `provider/model` arg for pi-teams) — a **different channel** than the prompt-embedded conventions. So the requirement is "the orchestrator applies the configured model/settings via the spawn mechanism," distinct from "include these conventions in the agent's prompt." State this so the design phase doesn't conflate the two channels.

**Sources:** `.rp.md:58-146`; `README.md:167`; `setup.md:176-178`; `load.md:5-7`, `:11-20` (Commit format `:15` and Team spawning `:19` already `No`), `:24-28`; `autonomous-workflow.md:56-63`; `conventions/claude-code.md:26-31`; `conventions/pi.md:24-30`; `.rp.md:116-130`; `assisted-workflow.md:3` (assisted spawns no agents).

### Q4: What is the observable behavior when (a) a configured model/effort value is rejected by the runtime (e.g. `effort` on a model that doesn't support it, an unknown model string, an unauthenticated Pi provider), and (b) how does a persisted per-agent model interact with the existing failure-recovery model-swap path (Pi login/API-key recovery in `.rp.md:121-130`; the health-monitor login-error swap in `health-monitoring.md:36`)? Concretely: does the configured model take precedence at spawn; does recovery override it for the retry; and after a recovery swap, do subsequent spawns return to the configured model or stick with the recovery model? Should the spec require the orchestrator to surface a clean error on rejection, or is pre-validation explicitly out of scope and left to existing recovery?

**A:** **Pre-validation is out of scope.** A configured value the runtime *rejects at spawn* must surface through the **existing escalation payload** (affected agent, the rejected value, the runtime's verbatim error) rather than being silently ignored or silently auto-corrected — that is the minimum observable requirement and it reuses machinery that already exists. The configured value is the **stable default each fresh spawn re-reads from `.rp.md`**; failure-recovery model swaps are **transient** (they apply to the recovery re-spawn only) and **do not mutate** the persisted config, so later fresh spawns return to the configured value.

- **(a) Rejection / misconfiguration — surface via existing escalation, no new pre-validation.** Pre-validating a model/effort value would force the orchestrator to encode and maintain a per-tool capability matrix (effort↔model validity, tool-native model strings, Pi multi-provider auth) — exactly the "goes stale" trap rejected in Q2's opaque-pass-through stance. The CLI is the authority on validity; a bad value is discovered *at spawn*, by the runtime. The three named cases map cleanly onto current machinery: `effort` on an unsupporting model and unknown/typo'd model strings are spawn failures the health monitor already watches and, when unrecoverable, escalates with **agent name + error verbatim + last-known progress + suggested next step** (`health-monitoring.md:41-48`); an unauthenticated Pi provider is *literally* the existing "Login / API-key error" row (`health-monitoring.md:36`; Pi recovery `.rp.md:121-130`). So the spec requirement is just: the orchestrator must not silently drop/ignore a rejected configured value — it surfaces to the owner via the normal escalation path, identifying the affected agent, the rejected value, and the verbatim runtime error. Auto-correcting, falling back to inherit, or pre-flight checks are explicitly out of scope.
- **(b) Interaction with the existing model-swap-on-failure path** (spec-level invariants only; recovery *mechanism* stays design-phase):
  1. **Configured model takes effect at the initial spawn** — the core requirement.
  2. **A recovery model-swap overrides the configured value for that recovery re-spawn only** — by definition, since recovery swaps *because* the configured/previous model failed to authenticate; the retried agent may run on a different model than configured. (One sentence so this isn't read as violating "configured model takes precedence.")
  3. **Subsequent fresh spawns return to the configured model** — the important invariant. The config lives in `.rp.md` and is re-read per spawn; recovery is an in-run action that does **not** write `.rp.md`, so it mutates the running agent instance, not the persisted config. The next fresh agent (e.g. a new per-task `code-writer`) spawns on the configured model again. This is consistent with "persist across all pipeline runs."
  4. **Per-agent config and recovery's "preferred default" are distinct concerns** — the per-agent config governs the *initial* spawn; recovery's preference (`.rp.md:126`, "prefer the owner's configured default provider/model") governs *what to fall back to when the configured/previous model fails to authenticate*. They must not be conflated such that recovery re-tries the very model that just failed (that would loop). Observable invariant: recovery must not re-select the model that just failed authentication. The exact recovery precedence ordering and any edits to `.rp.md:121-130` recovery text are design-phase.

**Out-of-scope items confirmed by this Q&A (state explicitly in the spec):** (i) the **assisted workflow** — it spawns no sub-agents, so the config is a no-op there; (ii) **pre-validation / capability-matrix checking** of configured values; (iii) **name-pattern/glob matching** for phase-style grouping — a genuinely-optional nicety considered and deferred to the design phase, not a requirement.

**Sources:** `health-monitoring.md:30-39` (2-retry recovery budget; "Login / API-key error" row swaps to an authenticated provider-qualified model and re-spawns) and `:41-48` (escalation payload) — verified this session; `autonomous-workflow.md:64-78` (blocker handling surfaces unrecoverable gaps verbatim) — verified; `.rp.md:121-130` (Pi failure-recovery; prefers owner's configured default) — verified; effort↔model validity being runtime-determined — carries from Q2 (`claude --help` verified; effort↔model support from `claude-api` reference, model/skill knowledge); config persists in `.rp.md` and is re-read each run — from Q3 (`load.md:5-7`, `setup.md:176-178`) — verified.

## Consolidated Requirements

Each requirement is phrased as an observable outcome. "The orchestrator" is the agent running the Radical Pipelines workflow; "agents" are the phase agents it spawns; "configured" means an entry present in the optional per-agent model configuration.

### Core configuration

1. A project can optionally declare, as a project convention, which model each spawned phase agent runs on, keyed by the agent's name (e.g. `spec-writer`, `code-reviewer`). When an agent has a configured model, the orchestrator spawns that agent on the configured model instead of the inherited runtime/session model.
2. A project can optionally declare a project-wide default model that applies to every spawned agent that has no agent-specific model entry. When both are present, an agent-specific entry overrides the project-wide default for that agent.
3. A project can optionally declare model settings (at minimum reasoning `effort`, plus any other model settings the active runtime supports) for an agent and/or for the project-wide default, using the same keying and the same agent-specific-overrides-default precedence as the model itself. The orchestrator applies the configured settings to that agent at spawn.
4. The configuration is recorded once, in the project's `.rp.md` conventions file, and is honored on every subsequent pipeline run without re-entering it — the choices persist across all runs.

### Optionality and default behavior

5. The configuration is optional. A project that declares no per-agent model configuration is completely unaffected: every agent is spawned exactly as it is today, inheriting the runtime/session model and that model's default settings, in both supported runtimes (Claude Code and Pi).
6. The absence of the configuration never blocks or interrupts the start of a workflow. The convention is treated as optional by the conventions-loading step, so a missing/empty configuration does not trigger the setup flow or any "missing convention" stop.
7. Within a present configuration, an agent that has no model/settings entry (and no applicable project-wide default) is spawned with today's behavior for that agent — partial configuration only affects the agents it names.

### Per-tool expression

8. Because the two supported runtimes identify models differently (Claude Code uses bare aliases or first-party IDs such as `opus` / `claude-opus-4-8`; Pi uses provider-qualified `provider/model` such as `anthropic/claude-opus-4-8`) and settings like `effort` are runtime-specific, the configuration is expressed per active runtime. A project's configured value is given in the form the active runtime expects; the same logical choice may require a different value string for Claude Code than for Pi.
9. The orchestrator applies configured model/settings values to the active runtime's spawn mechanism verbatim, as opaque pass-through. It does not translate values between runtimes and does not pre-validate them against a model-capability matrix.

### Application channel

10. Configured model/settings are applied as parameters of the spawn itself (the channel the runtime uses to set an agent's model/settings), distinct from the existing convention information the orchestrator places in an agent's initial prompt (such as the artifact folder path and commit format). Configuring a model does not require, and does not cause, any change to the agent's own behavior instructions.

### Error behavior

11. When the active runtime rejects a configured value at spawn time (for example, an `effort` value the chosen model does not support, an unknown or mistyped model string, or a configured provider that is not authenticated), the orchestrator does not silently ignore the setting or silently substitute a different one. The failure surfaces to the owner through the existing escalation path, identifying the affected agent, the rejected configured value, and the runtime's verbatim error.

### Interaction with failure recovery

12. A configured model takes effect at an agent's initial spawn.
13. When the existing failure-recovery path swaps to a different model after a login/API-key failure, that swap applies only to the recovery re-spawn of the affected agent; the retried agent may therefore run on a model other than the configured one for that recovery attempt.
14. Failure-recovery model swaps are transient and do not change the persisted configuration. Each subsequent fresh agent spawn re-reads the configuration and runs on the configured model again.
15. Failure recovery never re-selects the exact model that just failed authentication for the same agent; the per-agent configuration (which governs the initial spawn) and recovery's fallback choice (which governs what to use when the configured/previous model fails to authenticate) remain distinct so recovery cannot loop on the failed model.

### Out of scope

- **Assisted workflow.** The assisted workflow spawns no sub-agents, so per-agent model configuration has no effect there; it governs only the autonomous workflow's spawned agents.
- **A separate per-phase configuration level.** Granularity is per-agent (plus the project-wide default). Phase-level targeting is not provided; because every phase spawns multiple distinct agents and each agent name belongs to exactly one phase, per-agent already subsumes anything a per-phase level would express.
- **Name-pattern / glob grouping** (e.g. `spec-*`) for phase-style convenience. Considered and deferred; it can be revisited in the design phase but is not a requirement.
- **Pre-validation of configured values** against a model/effort/provider capability matrix. The runtime is the authority on validity; invalid values are discovered at spawn and surfaced per requirement 11, not pre-checked.
- **Redesigning the existing failure-recovery mechanism.** The exact recovery precedence ordering and any edits to the recovery text are left to the design phase; the spec fixes only the observable invariants in requirements 12–15.
- **Configuring the orchestrator's own session model.** The feature governs the models of spawned agents, not the model the owner runs the orchestrator on.

