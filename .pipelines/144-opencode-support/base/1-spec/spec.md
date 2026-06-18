# Spec: opencode support (via opencode-ensemble)

## Overview

Radical Pipelines (RP) currently runs on two agentic coding tools — Claude Code and Pi — using a per-tool pattern: a conditionally-loaded tool-convention file plus a packaging artifact, while the generic skill stays tool-agnostic. Owners who use **opencode** cannot run RP today.

This feature adds opencode as a third supported tool, reaching parity with Claude Code and Pi. An owner whose active tool is opencode can install RP (its agents, its skill, and a team-coordination layer), select opencode during setup, and run pipelines end-to-end through every phase in both the autonomous and assisted workflows — producing the same set of inspectable artifacts RP produces on the other tools. The team layer is provided by the `opencode-ensemble` plugin, which supplies spawn-by-name, peer-to-peer messaging, a shared task board with dependencies, per-agent model selection, and always-on supervision. The work is confined to opencode-specific additions plus minimal, behavior-preserving edits to two generic skill files; every other generic file stays literally true on opencode without edits because opencode's always-on supervision satisfies the generic monitor-lifecycle instructions as no-ops. Claude Code and Pi behavior is unchanged.

## Requirements

### Core support

1. An owner whose active agentic coding tool is opencode can run RP end-to-end — every phase (Intent → Spec → Design doc → Plan → Code → Docs), in both the autonomous and assisted workflows — producing the same set of inspectable artifacts (same filenames, same per-phase folder structure) RP produces on Claude Code and Pi.
2. opencode is a selectable, supported tool: when RP's setup flow runs, opencode appears in the supported-tools list alongside Claude Code and Pi, and selecting it loads an opencode-specific convention file.
3. A team of RP's named agents (every RP agent, e.g. spec-writer, code-reviewer) can be spawned on opencode, and each spawned agent behaves with full fidelity to its RP agent definition — it runs that agent's instructions rather than opencode's generic built-in behavior.
4. Spawned agents on opencode address each other directly — peer-to-peer messaging and a shared task board with dependencies — while the orchestrator only spawns, monitors, and waits, intervening to recover only when an inter-agent exchange fails. This is the same collaboration model RP uses on Claude Code and Pi.

### One worktree, one branch per pipeline

5. All work for a pipeline on opencode happens in a single git worktree on a single branch, shared by the orchestrator and every spawned agent. The team layer never creates per-agent worktrees and never squash-merges or otherwise rewrites the pipeline's one-branch history; agents commit directly to the pipeline's single branch.
6. The pipeline branch on opencode follows RP's branch-naming convention (`worktree-<pipeline-slug>`), consistent with the other supported tools.

### Health monitoring

7. During an autonomous run on opencode, the run is continuously monitored for stalls, failed inter-agent messages, provider authentication/login failures, and network failures, without the orchestrator launching or cancelling any separate monitor. Supervision is always-on, and these conditions surface to the orchestrator as they occur.
8. When a spawned agent fails to start or operate due to a provider authentication/login failure, the orchestrator learns of it and recovers by re-spawning the agent on a different authenticated provider-qualified model — not via interactive login, and distinct from the agent's configured model — or escalates to the owner if no authenticated model is available.
9. On opencode the recovery budget is the same as on the other tools — **2 recovery attempts per issue occurrence before escalation** — and it is owned by the orchestrator, which applies it reactively to the conditions always-on supervision surfaces. When 2 recovery attempts for a given condition do not resolve it, the orchestrator escalates to the owner on the 3rd, with the affected agent's name, the verbatim error, the agent's last-known progress, and a suggested next step — the same escalation contract RP uses on the other tools. Assisted runs use no monitor; the owner is already in the loop.

### Per-agent model selection

10. Each RP agent can run on a per-agent-configured model on opencode, with a project-wide default, expressed in opencode's provider-qualified `provider/model` form, mirroring the existing per-tool Agent-models convention.

### Installation and packaging

11. An owner can install RP for opencode and obtain all three pieces it needs — RP's agents, RP's skill, and the team-coordination layer — and then run pipelines. An owner whose repository does not already contain RP's skill tree still obtains it through the install.
12. Installing RP for opencode is delivered through a packaging artifact analogous to the Pi packaging artifact (an opencode plugin package). The generic skill remains tool-agnostic — it gains no opencode-specific awareness or branching.
13. The opencode runtime prerequisite (Node ≥ 24, or Bun) is surfaced to the owner at install/setup time, and setup does not declare opencode ready when the prerequisite is unmet.
14. opencode's team-coordination layer is tuned for RP — including supervision thresholds and the no-merge-on-cleanup behavior — via opencode-side configuration, so default behaviors that conflict with RP's one-worktree/one-branch model are neutralized.

### Setup actions (opencode-specific, mirroring Pi)

15. When setting up opencode, RP checks whether its agents are already discoverable, reports which are present and which are missing, and installs the missing ones only after confirming the destination — choosing the destination based on the project's artifact-storage mode (committed vs. per-user), the same way Pi's setup does.
16. After installing agents for opencode, the owner is directed to verify that the agents are discoverable by opencode before proceeding.

### Scope boundary (what changes vs. what stays)

17. Registering opencode requires textual edits to exactly two existing generic skill files, both kept tool-agnostic (no opencode-specific awareness or branching), and both leaving Claude Code and Pi behavior unchanged:
    - the setup supported-tools list — one new entry pointing at the opencode convention file;
    - the health-monitoring file — reworded so (a) the monitor lifecycle is stated as a tool-agnostic outcome whose start/cancel mechanics are deferred to the active tool's convention (allowing a tool whose supervision is always-on to treat start and cancel as no-ops), and (b) the context-window note attributes auto-handling to "each tool's own mechanism" rather than naming a fixed pair of tools.
18. Every other generic skill file that references the monitor lifecycle — the autonomous-workflow run-start "start a recurring health monitor" and close-out "stop the health monitor" steps, the resume "cancel any leftover health monitor" step, the review "cancel any leftover monitor, launch a fresh one" step, and the conventions table's "launch and cancel" description — stays literally true on opencode with no edit, because opencode's always-on supervision is a no-op "start," a no-op "cancel," and a no-op "cancel-leftover-before-relaunch." These instructions resolve through the **Health monitoring** convention, which on opencode answers "always-on; nothing to launch, list, or cancel."
19. All opencode-specific behavior is confined to the new conditionally-loaded opencode convention file plus the packaging artifact. No generic skill file other than the two in Requirement 17, and no tool-agnostic convention (pipeline slug, artifact folder, issues, guardrails, artifact storage), gains opencode-specific content beyond the tool-native value formats the conventions already provide for.

## Out of Scope

- Changing how RP behaves on Claude Code or Pi; their conventions and behavior stay as-is.
- Making the generic skill aware of, or branch on, opencode (or any specific tool).
- Adopting opencode's team-layer native per-teammate-worktree + squash-merge model in place of RP's one-worktree/one-branch-per-pipeline model.
- Building a bespoke recurring health-monitor loop for opencode. opencode has no loop primitive; always-on supervision plus reactive orchestrator handling replaces it.
- Specifying or changing opencode's context-window handling. The health monitor does not watch context-window limits on any tool; each tool handles them by its own mechanism. Whether opencode auto-compacts context is unverified in the research and is not relied on by this feature — the reworded health-monitoring note attributes context-window handling to "each tool's own mechanism" without naming or guaranteeing opencode's specific behavior. Confirming opencode's mechanism is deferred to the design phase as a non-blocking question.
- Supervising orchestrator-level (lead-session) auth/network failures via the team layer. These surface in the owner's own session, which the owner is watching; only spawned-teammate conditions are auto-supervised. (See the acceptance note below rather than a guarantee.)
- A required standalone orchestrator command/slash entry. The orchestrator is launched by plain skill invocation as on the other tools; any such command would be optional discoverability sugar, not required.

## Acceptance Criteria

### Tool selection and end-to-end runs

- Given an owner whose active tool is opencode runs RP setup, when the supported-tools list is shown, then opencode appears alongside Claude Code and Pi, and selecting it loads the opencode convention file.
- Given opencode is the selected, set-up tool, when the owner runs a pipeline in the autonomous workflow, then it completes every phase (Intent → Spec → Design doc → Plan → Code → Docs) and produces the same set of artifact files — the same filenames in the same per-phase subfolder structure that the generic phase references define (e.g. `0-intent/intent.md`, `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-plan/code-plan.md`, `5-docs/doc-plan.md`, under the per-phase subfolders) — as RP produces on Claude Code and Pi. Tool-native value formats inside those artifacts (provider-qualified model strings, opencode install destinations) may differ; the oracle is the set of files and the per-phase folder layout, not byte-identical content.
- Given opencode is the selected, set-up tool, when the owner runs a pipeline in the assisted workflow, then each phase produces the same set of artifact files in the same per-phase subfolder structure as on the other tools (tool-native value formats exempt, as above), with no health monitor running.

### Named agents and collaboration

- Given a pipeline running on opencode, when the orchestrator spawns RP's named agents (e.g. spec-writer, code-reviewer), then each spawned agent runs its own RP agent definition rather than opencode's generic built-in behavior.
- Given two spawned agents in the same pipeline on opencode, when a phase requires them to exchange messages, then they communicate directly (peer-to-peer messaging and the shared task board), and the orchestrator does not relay between them by default.
- Given an inter-agent exchange fails on opencode, when the orchestrator detects the failure, then it steps in to recover, and once the exchange is healthy the agents resume communicating directly.

### One worktree, one branch

- Given a pipeline running on opencode, when any spawned agent does work, then it operates in the single pipeline worktree on the single pipeline branch shared by the orchestrator and all agents, and no per-agent worktree is created.
- Given a pipeline on opencode completes or is cleaned up, when the team layer's cleanup runs, then the pipeline's one-branch history is not squash-merged or otherwise rewritten by the team layer; all commits remain on the single pipeline branch.
- Given a pipeline is created on opencode, when its branch is named, then the name follows `worktree-<pipeline-slug>`.

### Health monitoring

- Given an autonomous run on opencode, when the team is spawned, then monitoring for stalls, failed inter-agent messages, auth/login failures, and network failures is active without the orchestrator launching a separate monitor, and nothing must be cancelled at close-out.
- Given a spawned agent on opencode fails due to a provider authentication/login failure, when the orchestrator is notified, then it re-spawns the agent on a different authenticated provider-qualified model (not via interactive login, and not the failed model); and if no authenticated model is available, it escalates to the owner.
- Given a monitored condition on opencode that the orchestrator's 2 recovery attempts do not resolve, when the same condition recurs a 3rd time, then the orchestrator stops retrying and escalates to the owner with the affected agent's name, the verbatim error, the agent's last-known progress, and a suggested next step. (The recovery budget is 2 attempts per issue occurrence — the same number RP uses on the other tools — owned by the orchestrator and applied reactively.)
- (Acceptance note, not a guarantee) Given an orchestrator-level (lead-session) auth or network failure on opencode, when it occurs, then it surfaces in the owner's own session rather than being auto-supervised by the team layer.

### Per-agent model selection

- Given the Agent-models convention is configured for opencode, when an agent is spawned, then it runs on its per-agent-configured provider-qualified `provider/model` (falling back to the project-wide default when no per-agent value is set).

### Installation and packaging

- Given an owner installs RP for opencode through its packaging artifact, when installation completes, then the owner has RP's agents, RP's skill, and the team-coordination layer available, and can run pipelines.
- Given an owner's repository does not already contain RP's skill tree, when they install RP for opencode, then they still obtain the skill tree through the install.
- Given the opencode runtime prerequisite (Node ≥ 24 or Bun) is not met, when setup runs, then the prerequisite is surfaced to the owner and setup does not declare opencode ready.
- Given RP is set up for opencode, when the team-coordination layer runs, then it operates with RP-tuned configuration (supervision thresholds and no-merge-on-cleanup) so conflicting team-layer defaults are neutralized.

### Setup actions

- Given opencode setup runs, when the agent-discovery check executes, then RP reports which required agents are already present and which are missing.
- Given some required agents are missing, when RP installs them, then it installs only after confirming the destination, and the destination is chosen by the artifact-storage mode (committed vs. per-user) the same way Pi's setup does.
- Given RP has installed agents for opencode, when the setup step completes, then the owner is directed to verify the agents are discoverable by opencode before proceeding.

### Scope boundary

- Given the opencode support is added, when the generic skill is inspected, then exactly two existing generic files have textual edits — the setup supported-tools list (one new entry) and the health-monitoring file (a tool-agnostic lifecycle rewording plus the context-window note attributing handling to "each tool's own mechanism") — and all opencode-specific behavior lives in the new opencode convention file and the packaging artifact.
- Given the reworded health-monitoring file, when it is inspected, then it names no fixed set of supported tools for either the monitor lifecycle or the context-window note, and its start/cancel mechanics are deferred to the active tool's convention so a tool with always-on supervision can satisfy them as no-ops.
- Given the opencode support is added, when each other generic file that references the monitor lifecycle is inspected (autonomous-workflow start/close-out steps, resume cancel-leftover step, review cancel-then-relaunch step, conventions-table description), then it is unchanged and remains literally true on opencode because the always-on supervision resolves its "start"/"cancel"/"cancel-leftover" instructions as no-ops through the Health monitoring convention.
- Given the opencode support is added, when RP is run on Claude Code or on Pi, then their behavior is unchanged — including every generic monitor-lifecycle instruction, which still resolves to launching and cancelling a `/loop` monitor as before.
- Given the generic skill after opencode support is added, when any generic file other than the two edited files is inspected, then it contains no opencode-specific (or any tool-specific) awareness or branching, and no tool-agnostic convention gains opencode-specific content beyond the tool-native value formats the conventions already provide for.
