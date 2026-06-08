# Spec Review — Approved

Spec: `1-spec/spec.md` — "Optional convention for per-agent model configuration"
Source issue: [Automattic/radical-pipelines#90](https://github.com/Automattic/radical-pipelines/issues/90)
Verdict: **Approved**

## Summary

The spec is complete, internally consistent, feasible against the actual codebase, and disciplined about staying at the WHAT level. Its 15 requirements map cleanly to the 15 consolidated requirements in `spec-research.md`, every acceptance criterion is observable, and scope is drawn precisely with a well-reasoned Out-of-Scope section. I reviewed adversarially and found no blocking issue.

## What I verified

### Feasibility (checked against the codebase, not taken on faith)

- **Agent profiles are genuinely model-agnostic.** Every file in `agents/` declares only `name` and `description`; `grep -rniE "^model:|effort|^settings:" agents/` returns nothing. The core constraint — "model/settings must not live in the profile files" — is satisfied by the current state, so the feature's "spawn-channel, not profile" requirement (R10) is consistent with reality.
- **`.rp.md` is the single config surface with a shared section plus per-tool Claude Code / Pi sections** (`.rp.md:1-3,58-146`; `README.md:153-167`), so the spec's per-runtime expression (R8) and persistence (R4) requirements land on existing machinery without inventing a new surface. The spec correctly keeps the requirement at "project convention" altitude and does not name `.rp.md` — good WHAT-not-HOW discipline.
- **Optional conventions already exist and never block startup.** `load.md:15,19` mark Commit format and Team spawning `Required? = No`; `load.md:24-28` gates the setup-blocking path on *required* conventions only. So R6/AC7 ("absent configuration never triggers the setup flow or a missing-convention stop") is achievable with no special-casing.
- **The escalation path the spec reuses exists with the exact payload it cites.** `health-monitoring.md:42-48` defines the escalation payload (agent name, error verbatim, last-known progress, suggested next step), and the "Login / API-key error" recovery row (`:36`) plus Pi recovery (`.rp.md:121-130`) are real. R11/AC12 ("rejected value surfaces via the existing escalation path, identifying affected agent, rejected value, verbatim error") maps onto this without redesign.
- **The spawn channel vs. prompt channel distinction is real.** The orchestrator passes only Artifact folder and Commit format in an agent's initial prompt (`autonomous-workflow.md:59-61`) and passes no model today; model/effort are spawn-mechanism parameters. R10/AC11's two-channel claim is grounded.
- **Per-agent granularity is justified by a true 1:1 name→phase mapping.** The required-agents tables across `autonomous-phases/1–5` confirm 16 phase agents (4+4+4+2+2) with zero reuse across phases; `spec-consolidator` (17th profile) is not a required agent in any phase table. This substantiates the Out-of-Scope rejection of a separate per-phase level.
- **Assisted workflow spawns no agents** (`assisted-workflow.md:3`; each `assisted-phases/*.md` line 3 says "No agents are spawned"), confirming the Out-of-Scope no-op claim.

### Completeness

All 15 consolidated requirements from `spec-research.md` are present in `spec.md` with no dropped requirement and no orphan requirement added. Each of the four research Q&As is reflected: granularity + default (Q1 → R1–R2, R7), per-tool/opaque pass-through (Q2 → R8–R9), location/optionality (Q3 → R4–R6, R10), and error + recovery interaction (Q4 → R11–R15).

### Consistency

- "Today's behavior" is defined once in the Terminology block (line 19) and used consistently in R5, R7, AC6, AC8.
- Precedence ("agent-specific overrides project-wide default") is stated identically for model (R2) and settings (R3) and matched in AC3/AC4.
- The apparent tension between Out-of-Scope ("Redesigning the existing failure-recovery mechanism… recovery precedence and text edits left to design") and R15 (an invariant on recovery) resolves cleanly: R12–R15 are explicitly fixed as *observable invariants* while the *mechanism/precedence/text* is deferred. No contradiction.
- R15's "never re-selects the exact model that just failed authentication" is a *weaker* invariant than the existing Pi recovery, which excludes the whole failed *provider* (`.rp.md:123,126`). Excluding the provider implies excluding the model, so the existing behavior already satisfies R15 — consistent, not conflicting.

### Acceptance-criteria testability

Every AC is in Given/When/Then form and observable:

- AC1–AC3, AC8, AC13–AC15 are behavioral (which model an agent actually runs on) — directly observable.
- AC6 ("today's behavior, no override, in both runtimes") and AC7 ("no setup-flow / missing-convention stop; workflow proceeds") are observable at startup.
- AC11 ("rides the spawn channel, not the prompt; instructions and profile unchanged") is verifiable by inspection: the initial prompt and the profile file are both inspectable artifacts, and the positive ("applied as a spawn parameter") is observable via AC1's behavioral result.
- AC10 ("verbatim, no translation, no capability-matrix pre-check") and AC12 ("rejected value surfaces with affected agent + rejected value + verbatim error") are observable from the pass-through value and the escalation payload.
- AC16 ("recovery does not re-select the model that just failed auth") is observable from the recovery re-spawn's model.

### Scope / WHAT-not-HOW

The Out-of-Scope section is precise and each exclusion is justified (assisted workflow, per-phase level, glob grouping, pre-validation, recovery redesign, orchestrator's own session model). The model-string examples (`opus`, `claude-opus-4-8`, `anthropic/claude-opus-4-8`) and the references to a "conventions-loading step / setup flow / missing-convention stop" describe *inherent observable properties* of the feature and the existing mechanism it integrates with — not implementation prescriptions. The spec does not name `.rp.md`, `TeamCreate`, `pi-teams`, `--model`, `--effort`, `load.md`, or `setup.md`. Altitude is correct for a phase-1 spec.

## Minor, non-blocking observations (for the design phase, not reasons to reject)

1. **Settings-without-model combination.** R3/AC4 allow configuring `effort` (or other settings) for an agent that has no configured model, in which case the setting applies to the inherited session model. The general precedence language covers this, but the design phase may want to make the "settings ride along even when model is inherited" case explicit, since that is the combination most likely to hit a runtime rejection (e.g. `effort` on an inherited model that does not support it — which then flows through R11/AC12).
2. **Effort is model-conditional (from research Q2).** This is correctly left to the runtime per R9 (no pre-validation) and surfaces via R11, so it needs no spec change. Flagging only so the design phase keeps the "valid `effort` depends on the chosen model" fact in view when shaping the config's documentation/examples.

Neither observation affects an acceptance criterion or leaves a requirement ambiguous, so neither blocks approval.

## Verdict

**Approved.** The spec is ready to advance to the design-doc phase.
