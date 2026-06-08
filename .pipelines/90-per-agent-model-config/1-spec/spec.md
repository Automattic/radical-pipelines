# Spec — Optional convention for per-agent model configuration

Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90) — "Optional convention for per-agent model configuration"

## Overview

Today the Radical Pipelines autonomous workflow is model-agnostic at the orchestration layer. The orchestrator spawns named phase agents (e.g. `spec-writer`, `code-reviewer`); each agent profile declares only `name` and `description` and carries no model information, and the orchestrator passes no model or model settings at spawn. As a result, every spawned agent inherits the runtime/session model and that model's default settings. A model can be overridden when an agent is spawned, but that choice is not recorded anywhere, so it does not persist across runs. Models are touched only transiently during failure recovery (e.g. a Pi provider login/API-key error triggers a swap to an authenticated model).

This feature lets a project decide, once, which model each spawned phase agent runs on — and tune model settings such as reasoning `effort` — and have those choices honored on every subsequent pipeline run, without baking any model or settings choice into the generic agent profile files. The choice is recorded as an optional project convention. A project that configures nothing is completely unaffected and keeps today's behavior in both supported runtimes.

The configuration targets two scopes: each individual spawned agent (the primary, finest unit), and an optional project-wide default that applies to any agent without its own entry. There is no per-phase scope: every phase spawns several distinct agents and each agent name belongs to exactly one phase, so per-agent already expresses anything a per-phase level could, at a finer grain.

Because the two supported runtimes (Claude Code and Pi) identify models differently and expose settings like `effort` differently, the configuration is expressed in the form the active runtime expects, and the orchestrator passes configured values to the runtime's spawn mechanism verbatim — without translating between runtimes and without pre-validating them. Model and settings are applied as parameters of the spawn itself, a separate channel from the convention instructions the orchestrator places in an agent's initial prompt; configuring a model therefore never changes an agent's behavior instructions. Invalid values are discovered by the runtime at spawn and surfaced to the owner through the existing escalation path rather than being silently dropped or auto-corrected.

The feature governs only the autonomous workflow's spawned agents. The assisted workflow spawns no sub-agents, so the configuration has no effect there. It does not govern the model the owner runs the orchestrator on.

## Requirements

Terminology: **the orchestrator** is the agent running the Radical Pipelines workflow; **agents** are the phase agents it spawns; **configured** means an entry is present in the optional per-agent model configuration. **Today's behavior** for an agent means it is spawned with no model or settings override, inheriting the runtime/session model and that model's default settings.

### Core configuration

1. A project can optionally declare, as a project convention, which model each spawned phase agent runs on, keyed by the agent's name (e.g. `spec-writer`, `code-reviewer`). When an agent has a configured model, the orchestrator spawns that agent on the configured model instead of the inherited runtime/session model.
2. A project can optionally declare a project-wide default model that applies to every spawned agent that has no agent-specific model entry. When both a project-wide default and an agent-specific entry are present, the agent-specific entry overrides the default for that agent.
3. A project can optionally declare model settings — at minimum reasoning `effort`, plus any other model settings the active runtime supports — for a specific agent and/or for the project-wide default. Settings use the same name-keying and the same "agent-specific overrides default" precedence as the model itself. The orchestrator applies the configured settings to that agent at spawn.
4. The configuration is recorded once as a project convention and is honored on every subsequent pipeline run without re-entering it; the choices persist across all runs.

### Optionality and default behavior

5. The configuration is optional. A project that declares no per-agent model configuration is completely unaffected: every agent is spawned with today's behavior, in both supported runtimes (Claude Code and Pi).
6. The absence of the configuration never blocks or interrupts the start of a workflow. The convention is treated as optional by the conventions-loading step, so a missing or empty configuration does not trigger the setup flow or any "missing convention" stop.
7. Within a present configuration, an agent that has neither a model/settings entry nor an applicable project-wide default is spawned with today's behavior. Partial configuration affects only the agents (and the default) it names; it does not change how any unconfigured agent is spawned.

### Per-tool expression

8. The configuration is expressed per active runtime. Because the two supported runtimes identify models differently — Claude Code uses bare aliases or first-party IDs such as `opus` / `claude-opus-4-8`, while Pi uses provider-qualified `provider/model` such as `anthropic/claude-opus-4-8` — and because settings like `effort` are runtime-specific, a configured value is given in the form the active runtime expects. The same logical choice may require a different value string for Claude Code than for Pi.
9. The orchestrator applies configured model and settings values to the active runtime's spawn mechanism verbatim, as opaque pass-through. It does not translate values between runtimes, and it does not pre-validate them against any model-capability matrix (such as which models accept which `effort` values).

### Application channel

10. Configured model and settings are applied as parameters of the spawn itself — the channel the runtime uses to set a spawned agent's model and settings — distinct from the convention information the orchestrator places in an agent's initial prompt (such as the artifact folder path and commit format). Configuring a model neither requires nor causes any change to the agent's own behavior instructions or to its generic profile file.

### Error behavior

11. When the active runtime rejects a configured value at spawn time — for example, an `effort` value the chosen model does not support, an unknown or mistyped model string, or a configured provider that is not authenticated — the orchestrator does not silently ignore the setting and does not silently substitute a different one. The failure surfaces to the owner through the existing escalation path, identifying the affected agent, the rejected configured value, and the runtime's verbatim error.

### Interaction with failure recovery

12. A configured model takes effect at an agent's initial spawn.
13. When the existing failure-recovery path swaps to a different model after a login/API-key failure, that swap applies only to the recovery re-spawn of the affected agent. The retried agent may therefore run on a model other than the configured one for that recovery attempt.
14. Failure-recovery model swaps are transient and do not change the persisted configuration. Each subsequent fresh agent spawn re-reads the configuration and runs on the configured model again.
15. Failure recovery never re-selects, for the same agent, the exact model that just failed authentication. The per-agent configuration (which governs the initial spawn) and recovery's fallback choice (which governs what to use when the configured/previous model fails to authenticate) remain distinct, so recovery cannot loop on the failed model.

## Out of Scope

- **Assisted workflow.** The assisted workflow spawns no sub-agents, so per-agent model configuration has no effect there. The feature governs only the autonomous workflow's spawned agents.
- **A separate per-phase configuration level.** Granularity is per-agent plus the project-wide default. Phase-level targeting is not provided: because every phase spawns multiple distinct agents and each agent name belongs to exactly one phase, per-agent already subsumes anything a per-phase level would express.
- **Name-pattern / glob grouping** (e.g. `spec-*`) for phase-style convenience. Considered and deferred; it may be revisited in the design phase but is not a requirement here.
- **Pre-validation of configured values** against a model / `effort` / provider capability matrix. The runtime is the authority on validity; invalid values are discovered at spawn and surfaced per requirement 11, not pre-checked by the orchestrator.
- **Redesigning the existing failure-recovery mechanism.** The exact recovery precedence ordering and any edits to the recovery text are left to the design phase; this spec fixes only the observable invariants in requirements 12–15.
- **Configuring the orchestrator's own session model.** The feature governs the models of spawned agents, not the model the owner runs the orchestrator on.

## Acceptance Criteria

### Core configuration

**AC1 — Agent-specific model is applied at spawn**
- **Given** a project configures a model for the agent named `spec-writer`,
- **When** the orchestrator spawns `spec-writer` in the autonomous workflow,
- **Then** `spec-writer` runs on the configured model instead of the inherited runtime/session model.

**AC2 — Project-wide default applies to unconfigured agents**
- **Given** a project configures a project-wide default model and no agent-specific model entry for `code-reviewer`,
- **When** the orchestrator spawns `code-reviewer`,
- **Then** `code-reviewer` runs on the project-wide default model.

**AC3 — Agent-specific entry overrides the project-wide default**
- **Given** a project configures both a project-wide default model and a different agent-specific model for `spec-writer`,
- **When** the orchestrator spawns `spec-writer`,
- **Then** `spec-writer` runs on the agent-specific model, not the project-wide default.

**AC4 — Configured settings (e.g. effort) are applied with the same precedence**
- **Given** a project configures reasoning `effort` (and/or other runtime-supported settings) for an agent and/or for the project-wide default,
- **When** the orchestrator spawns an agent,
- **Then** the orchestrator applies the effective settings for that agent at spawn, with an agent-specific settings entry overriding the project-wide default for that agent.

**AC5 — Configuration persists across runs without re-entry**
- **Given** a project recorded a per-agent model configuration in a previous run and has not changed it,
- **When** the owner starts any subsequent pipeline run,
- **Then** the same configuration is honored at spawn without the owner re-entering it.

### Optionality and default behavior

**AC6 — No configuration means today's behavior, in both runtimes**
- **Given** a project declares no per-agent model configuration,
- **When** the orchestrator spawns any agent under either Claude Code or Pi,
- **Then** the agent is spawned with today's behavior — no model or settings override, inheriting the runtime/session model and that model's default settings.

**AC7 — Absent configuration does not block workflow start**
- **Given** a project has no per-agent model configuration (the convention is absent or empty),
- **When** the conventions-loading step runs at the start of a workflow,
- **Then** the missing configuration does not trigger the setup flow or a "missing convention" stop, and the workflow proceeds.

**AC8 — Partial configuration affects only named agents**
- **Given** a present configuration that names some agents but neither names `doc-writer` nor declares an applicable project-wide default,
- **When** the orchestrator spawns `doc-writer`,
- **Then** `doc-writer` is spawned with today's behavior, while the named agents are spawned on their configured models/settings.

### Per-tool expression

**AC9 — Configured value is given in the active runtime's form**
- **Given** the same logical model choice configured for both runtimes (e.g. a bare alias or first-party ID such as `opus` / `claude-opus-4-8` for Claude Code, and a provider-qualified `anthropic/claude-opus-4-8` for Pi),
- **When** the orchestrator spawns an agent under a given active runtime,
- **Then** it uses the value expressed for that runtime, accepting that the same logical choice may require a different value string per runtime.

**AC10 — Values are passed through verbatim, without translation or pre-validation**
- **Given** a configured model and/or settings value for the active runtime,
- **When** the orchestrator spawns the agent,
- **Then** it passes the value to the runtime's spawn mechanism verbatim, without translating it to the other runtime's form and without checking it against any model-capability matrix.

### Application channel

**AC11 — Model/settings ride the spawn channel, not the prompt, and don't change instructions**
- **Given** a configured model and/or settings for an agent,
- **When** the orchestrator spawns that agent,
- **Then** the model/settings are applied as parameters of the spawn itself (separate from the convention instructions placed in the agent's initial prompt, such as artifact folder and commit format), and the agent's behavior instructions and generic profile file are unchanged.

### Error behavior

**AC12 — Rejected value surfaces via the existing escalation path**
- **Given** a configured value the active runtime rejects at spawn (e.g. an `effort` value the chosen model does not support, an unknown/mistyped model string, or a configured provider that is not authenticated),
- **When** the orchestrator attempts the spawn and the runtime returns an error,
- **Then** the orchestrator does not silently ignore the setting or silently substitute another, and the failure surfaces to the owner through the existing escalation path, identifying the affected agent, the rejected configured value, and the runtime's verbatim error.

### Interaction with failure recovery

**AC13 — Configured model takes effect on the initial spawn**
- **Given** a configured model for an agent,
- **When** the orchestrator performs that agent's initial spawn,
- **Then** the agent runs on the configured model.

**AC14 — A recovery swap applies only to the recovery re-spawn**
- **Given** an agent configured on model X whose spawn hits a login/API-key failure, and failure recovery swaps to an authenticated model Y,
- **When** recovery re-spawns that affected agent,
- **Then** the recovery re-spawn runs on model Y (the retried agent may run on a model other than the configured one for that attempt).

**AC15 — Recovery does not mutate the persisted configuration**
- **Given** a recovery model swap occurred during a run,
- **When** the orchestrator next performs a fresh spawn of the agent,
- **Then** it re-reads the configuration and spawns the agent on the configured model again; the persisted configuration is unchanged.

**AC16 — Recovery never loops on the model that just failed**
- **Given** an agent whose configured/previous model just failed authentication,
- **When** failure recovery selects a fallback model for the same agent,
- **Then** it does not re-select the exact model that just failed authentication, keeping the per-agent configuration and recovery's fallback choice distinct.
