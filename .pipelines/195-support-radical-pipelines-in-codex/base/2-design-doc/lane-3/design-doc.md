# Design Doc: Codex support

## Overview

Radical Pipelines will run on the Codex desktop app, CLI, and IDE extension through one repository-scoped Codex plugin and Codex-native hierarchical subagents. The foreground Codex session is the orchestrator. It creates the existing branches and worktrees, starts phase agents in their assigned seats, preserves phase and approval policy, and owns tracker updates, commits, and close-out. Persistent analysts own their researcher subagents, matching the pipeline's existing two-level agent topology.

The design adds a Codex runtime without changing the pipeline model. Git branches and committed artifacts remain the only durable state, so Codex and Claude Code can inspect and continue each other's runs without migration. Native agent IDs, messages, retry counters, and statuses exist only in the live Codex session. A new session reconstructs the run from Git and committed artifacts and starts a fresh native tree.

## Approach

### Distribution and configuration

The repository contains `.codex-plugin/plugin.json` and the repository-scoped `$REPO_ROOT/.agents/plugins/marketplace.json`. The marketplace source is `$REPO_ROOT`, expressed as `../..` from the marketplace file. That root contains the Codex manifest, canonical Radical Pipelines skill, and agent profiles. Repository installation, discovery, updates, version synchronization, documentation, and fixtures use this scope and source.

Shared project conventions remain common to both tools. Codex adds tool-specific conventions for native spawning, `gpt-5.6-sol` model pinning, inherited permission readiness, and hierarchical health monitoring. Each tool loads the shared conventions plus its own tool-specific conventions. Adding Codex configuration leaves Claude Code configuration and runtime behavior unchanged.

### Readiness and setup

Before any tracker, branch, worktree, or artifact mutation, Codex readiness verifies:

1. The repository plugin is installed and its skill and profiles load.
2. Native spawning, messaging, waiting, steering, interruption, and nested spawning are enabled.
3. `agents.max_depth=2` is effective.
4. Native capacity covers the planned peak tree, including concurrent analyst/researcher pairs and isolated lanes.
5. Every spawned role is pinned to `gpt-5.6-sol`.
6. The surface's configured permission mode covers the repository, every planned worktree root, required Git operations, and all foreground and child tools required by the selected workflow and active conventions.

A failed check identifies the missing prerequisite, invokes the existing setup path, and stops before run mutations. Readiness handles local misconfiguration; it cannot exclude desktop, CLI, or IDE from support.

### Native execution topology

The native tree has these ownership boundaries:

```text
foreground orchestrator (depth 0)
├── phase agent (depth 1)
├── persistent analyst (depth 1)
│   └── researcher owned by that analyst (depth 2)
└── phase agent or isolated-lane agent (depth 1)
```

The orchestrator creates all required branches and worktrees before spawning agents. Each depth-1 agent receives its profile, shared and Codex conventions, task, absolute worktree path, expected branch, and pinned model. Before its first write, the agent verifies that its working directory is inside the assigned worktree and `HEAD` is the expected branch; all file and Git operations stay within that seat.

A persistent analyst spawns its own researcher with the corresponding profile, conventions, task, absolute worktree, expected branch, and pinned model. The analyst is the researcher's sole message and lifecycle owner. Researchers report to their analyst; depth-1 phase agents report to the orchestrator. Launches never exceed the capacity validated for the planned tree.

The foreground retains the shared autonomous and assisted entry points, issue management, pipeline creation and discovery, list/resume/revise/fork operations, phase sequencing, multilane execution, guardrails, owner approvals, artifact acceptance, phase-completion predicates, tracker synchronization, commits, and run close-out. Autonomous phases use the native tree; supported assisted phases remain foreground workflows. Both preserve existing phase boundaries, roles, approval points, artifacts, and completion rules. The native hierarchy supplies execution, communication, steering, and monitoring without redefining shared policy.

### Persistent identity and communication

Native spawn returns an opaque agent ID. The parent retains that ID in live context and uses it for status requests, task questions and answers, steering, waits, follow-ups, interruption, and cancellation for the child's lifetime. A running child's message steers that child; a follow-up to an idle persistent child reactivates the same ID. The native delivery result and expected child response acknowledge delivery. The parent advances only after the required response, commit, or terminal report.

A same-ID response proves continuation of the live agent. Restart first interrupts the old agent and records its terminal status. The parent then inspects the assigned worktree and spawns a replacement from committed Git and artifact state; the replacement receives a new opaque ID and reconciles uncommitted files before proceeding. Uncommitted files may inform reconciliation but are not durable progress. Agent IDs are never written to pipeline artifacts.

### Hierarchical monitoring and recovery

Every parent monitors its direct children. The orchestrator monitors depth-1 agents, including analysts; each persistent analyst monitors its researcher. Monitoring begins at spawn. At the owner-configured interval, the parent checks native activity and the assigned worktree. It keeps a transient two-retry ledger for each issue occurrence. Successful recovery clears that occurrence. Two failed retries stop recovery for that occurrence and escalate to the pipeline owner with the agent, exact error, last progress, and next step while monitoring of other agents continues.

The recovery contract is:

| Issue | Detection and owner | Retry 1 | Retry 2 | Acknowledgement and integrity |
| --- | --- | --- | --- | --- |
| No-output stall | A direct child has neither native activity nor worktree progress beyond the configured threshold. Its parent owns recovery. | Send a status request to the active child's same opaque ID. | Interrupt the child and spawn a replacement from committed Git and artifacts with a new ID. | The status response acknowledges retry 1. The replacement acknowledges retry 2 and reconciles its seat without continuing old session state. |
| Message failure | Native delivery fails or the expected response does not arrive. The sender owns recovery. | Re-send the same message to the same target ID. | Interrupt and replace the target, then send the original task and unresolved message to the new ID. | Native delivery plus the expected response acknowledges an attempt. Before more work, ambiguous application is reconciled against committed artifacts. |
| Login or API-key error | A native operation returns an authentication error. The parent handling that operation owns recovery. | Retry the failed native operation once with `gpt-5.6-sol`. | Re-spawn the affected child with `gpt-5.6-sol` and retry the operation. | Success acknowledges recovery. Exhaustion escalates the exact authentication error without changing model or provider. |
| Network failure | The agent that made the tool call reports a transient network error. That agent retries under its parent's supervision. | Retry that exact failed tool call once in the same live agent. | Wait one configured interval, then retry that exact call again in the same live agent. | The tool result acknowledges each retry. An ambiguous side effect is escalated instead of replayed. |

The orchestrator applies the login and network rows directly to failures from its own operations. A lost foreground session cannot recover its former native tree and instead follows Git-only resume.

Native tree status provides the live monitored-agent list. At close-out, the orchestrator asks each analyst to drain or interrupt its researcher and waits for acknowledgement before interrupting any remaining direct agents. Close-out completes only after no run agent remains live.

### Durable state, resume, and interoperability

Branches and committed pipeline artifacts are the complete durable state. Agent IDs, tree shape at runtime, messages, prompts, retry ledgers, delivery state, status, and permission observations remain transient.

On resume in a new session or tool, the foreground discovers the run and completed phases from existing Git branches and committed artifacts, recreates required worktrees from their existing branches, repeats readiness, and spawns a new native tree. Resume never requires a previous agent ID or private runtime record. Existing branch grammar, family and run layout, artifact paths and formats, phase predicates, versioning rules, fork cuts, lane rules, and cleanup behavior remain unchanged.

### Cross-surface acceptance gate

Codex support is complete only after fixture repositories pass on desktop, CLI, and IDE with direct local-repository access. Each surface must prove:

1. Repository marketplace discovery and plugin installation.
2. Effective `agents.max_depth=2` and capacity for depth-1 agents plus a nested researcher.
3. Analyst-owned researcher nesting and opaque-ID ownership.
4. Multiple persistent messages, follow-ups, and active steering to the same live ID.
5. Absolute-worktree and expected-branch isolation across concurrent lanes.
6. All four recovery rows, acknowledgements, two-retry limits, replacement ID changes, four-field escalation, and nested cancellation.
7. Session loss followed by reconstruction from Git and committed artifacts with fresh IDs.
8. Effective `gpt-5.6-sol` pinning for every spawned role.
9. Permission-readiness failure before any tracker or repository mutation.

A fixture failure blocks the feature and requires correction in the native design or implementation. Per-run readiness cannot turn such a failure into a supported surface exemption.

### Acceptance coverage

| Criterion | Design coverage |
| --- | --- |
| 1. Surface coverage | One repository plugin, one native execution model, and mandatory native-subagent fixtures on desktop, CLI, and IDE provide the same workflow outcomes. |
| 2. Autonomous workflow | A run through Document uses depth-0 orchestration, depth-1 phase agents, analyst-owned depth-2 researchers, hierarchical monitoring, and unchanged gates, artifacts, commits, tracker updates, and close-out. |
| 3. Assisted workflow | Foreground execution retains the existing research, final artifact, approval marker, commit, tracker, completion, and close-out behavior. |
| 4. Pipeline operations | Create, list, resume, revise, and fork use existing Git discovery, branches, worktrees, versioning, lanes, artifacts, fork cuts, and cleanup. |
| 5. Cross-tool continuation | Both tools reconstruct state solely from shared Git branches and committed artifacts. |
| 6. Configuration coexistence | Each tool combines shared conventions with its additive tool-specific conventions. |
| 7. Surface capability differences | Every named surface must pass the same topology, messaging, monitoring, permission, isolation, and model fixtures. |
| 8. Incomplete setup | Plugin, native capability, depth, capacity, model, permission, and tool checks stop before mutations and route to setup. |
| 9. No Claude Code regression | Claude Code configuration and runtime remain separate, and all shared pipeline contracts remain unchanged. |

## Components

| Component | Responsibility |
| --- | --- |
| `.codex-plugin/plugin.json` | Declares the repository's Codex plugin and exposes its canonical resources. |
| `.agents/plugins/marketplace.json` | Provides repository-scoped discovery with plugin source `../..`, the repository root. |
| Canonical skill and agent profiles | Define shared workflows, roles, artifacts, gates, completion rules, and agent responsibilities for both tools. |
| Codex convention instructions | Define native hierarchy, model pinning, inherited permission checks, and hierarchical monitoring. |
| Convention loader and setup flow | Select shared plus active-tool conventions and enforce readiness before mutation. |
| Foreground orchestrator | Own shared pipeline policy, create branches and worktrees, spawn and monitor depth-1 agents, route approvals, accept artifacts, synchronize trackers, commit, and close out. |
| Persistent analyst | Own, address, monitor, recover, and stop its depth-2 researcher. |
| Native subagent runtime | Supply opaque IDs, nested spawn, messaging, follow-up, steering, wait, status, interruption, and inherited permissions. |
| Git branches and committed artifacts | Store all durable pipeline state and support cross-session and cross-tool reconstruction. |
| Version, documentation, and fixture integration | Keep repository plugin metadata synchronized, document repository installation and setup, and enforce cross-surface acceptance. |

The existing branch grammar, pipeline directories, artifact contracts, phase predicates, Claude Code manifest, and Claude Code runtime are relevant but unchanged.

## Interfaces and Data Flow

### Spawn contract

Every native spawn supplies:

- the agent's canonical profile and task;
- shared and Codex conventions;
- an absolute worktree path and expected branch;
- `gpt-5.6-sol` as the required model;
- whether the role remains persistent for follow-up work.

Spawn returns the opaque native ID used by that parent for the child's live lifecycle. The parent's transient record associates the ID with the role, worktree, branch, expected response, and per-occurrence retry counts. Only the parent that spawned a child addresses it.

### End-to-end data flow

1. The foreground loads the repository plugin and shared plus Codex conventions, computes the planned peak tree, and completes readiness without pipeline mutations.
2. It discovers or creates the pipeline using existing Git and artifact rules, then creates required branches and worktrees.
3. It spawns depth-1 phase agents into their seats. A persistent analyst spawns and owns its depth-2 researcher.
4. Children verify their seats, perform role work, commit required artifacts under existing completion rules, and report through their native parent relationship. Parents use returned IDs for all live interaction and monitor their direct children.
5. The foreground applies unchanged review, owner approval, completion, tracker, commit, and close-out rules. Assisted phases remain foreground workflows with their existing approval points.
6. Close-out drains the tree from depth 2 upward and leaves only canonical committed pipeline state.
7. A later Codex or Claude Code session reconstructs from Git and artifacts, repeats active-tool readiness, and continues without migration.

## Key Decisions

### Decision: Use one native hierarchical runtime on every local Codex surface

- **Choice:** Use a depth-0 foreground orchestrator, depth-1 phase agents, and analyst-owned depth-2 researchers on desktop, CLI, and IDE; configure `agents.max_depth=2`.
- **Alternatives:** An external supervisor, detached monitor processes, a surface-specific transport, or foreground-only execution.
- **Trade-offs:** Native ownership removes a second lifecycle and routing layer. Native depth and capacity become readiness and cross-surface fixture gates.
- **Traces to:** Requirements 1–3 and 5; Acceptance criteria 1–5, 7, and 9

### Decision: Use opaque native IDs for live identity

- **Choice:** Each parent retains and addresses the ID returned at spawn for messaging, steering, waiting, follow-up, status, and interruption; a replacement always receives a new ID.
- **Alternatives:** Role-name lookup, logical-ID registries, or a custom message protocol.
- **Trade-offs:** Live Q&A and steering preserve native session identity without extra state, while a lost session cannot recover uncommitted context.
- **Traces to:** Requirement 2; Acceptance criteria 2 and 7

### Decision: Make the native hierarchy the health monitor

- **Choice:** Each parent monitors and recovers its direct children with the existing four signals, two ordered retries, acknowledgements, and escalation payload; agents retry their own exact network tool calls.
- **Alternatives:** A detached scheduler, a separate monitor agent outside the ownership tree, whole-turn retry for network failures, or reduced monitoring on some surfaces.
- **Trade-offs:** Recovery can address an active child and preserve exact tool-call semantics. Retry ledgers disappear with the live session, while committed progress remains intact.
- **Traces to:** Requirements 1–2 and 5; Acceptance criteria 1–2 and 7–9

### Decision: Gate permissions, topology, capacity, model, and tools before mutation

- **Choice:** Validate the complete planned Codex path and inherited permission coverage before tracker or repository changes.
- **Alternatives:** Discover prerequisites during execution or run a reduced topology.
- **Trade-offs:** Setup may stop earlier, but no partial pipeline work or weakened workflow is created.
- **Traces to:** Requirements 1–2 and 5; Acceptance criteria 1–4 and 7–8

### Decision: Keep Git and committed artifacts as the only durable state

- **Choice:** Reconstruct every new session from existing branches and committed artifacts; keep IDs, messages, retry state, and native status transient.
- **Alternatives:** Persist agent registries, sessions, delivery records, or runtime metadata.
- **Trade-offs:** Interruptions may lose uncommitted reasoning or edits, but cannot create false phase completion or a cross-tool migration requirement.
- **Traces to:** Requirement 3; Acceptance criteria 4–5

### Decision: Distribute through the repository marketplace

- **Choice:** Use `$REPO_ROOT/.agents/plugins/marketplace.json` with source `../..` and `.codex-plugin/plugin.json` at the repository root.
- **Alternatives:** A home-scoped marketplace or copied personal plugin installation.
- **Trade-offs:** Installation and updates are repository-owned and reproducible; each repository must expose its marketplace entry.
- **Traces to:** Requirements 1 and 4–5; Acceptance criteria 1, 6, and 8–9

### Decision: Preserve additive tool configuration and shared pipeline contracts

- **Choice:** Load shared conventions plus only the active tool's conventions while retaining one branch grammar, artifact model, workflow policy, and completion model.
- **Alternatives:** Duplicate whole configurations, rewrite Claude Code configuration, or create Codex-specific pipeline contracts.
- **Trade-offs:** The loader must select and validate an active-tool section, but both tools remain independently configured and interoperable.
- **Traces to:** Requirements 3–5; Acceptance criteria 4–6 and 8–9

### Decision: Require cross-surface native fixtures for acceptance

- **Choice:** Treat desktop, CLI, and IDE fixture success as a feature gate, including nested execution, persistent interaction, recovery, cancellation, isolation, model, permission, and Git-only resume checks.
- **Alternatives:** Infer support from one surface or treat architectural failure as local incomplete setup.
- **Trade-offs:** Acceptance depends on all named surfaces, matching the required scope and preventing readiness from masking an unsupported architecture.
- **Traces to:** Requirements 1–2 and 5; Acceptance criteria 1–2 and 7–9

## Dependencies

- The canonical Radical Pipelines skill, agent profiles, workflows, branch grammar, artifact formats, and completion predicates.
- Git and direct access to a local repository and its worktrees.
- Codex-native spawn, nested spawn, opaque IDs, messaging, follow-up, steering, waiting, status, interruption, and inherited permission behavior on desktop, CLI, and IDE.
- Effective `agents.max_depth=2` and capacity for the planned peak tree.
- Access to `gpt-5.6-sol` for every spawned role.
- Foreground and child tools required by active conventions, including the configured tracker integration.
- The repository-scoped Codex plugin manifest and marketplace entry.

No supervisor, daemon, detached scheduler, private registry, separate service, or new runtime library is required.

## Failure Modes and Observability

| Failure | Detection and behavior |
| --- | --- |
| Missing plugin, convention, native capability, depth, capacity, model, permission, or tool | Readiness reports the exact gap, offers the supported setup path, and stops before run mutations. |
| Worktree or branch mismatch | The child detects the mismatch before its first write and reports a blocker to its parent. |
| No-output, message, login, or network issue | The direct owner applies the corresponding recovery row, records acknowledgements and retry counts in live context, and escalates after two failed retries. |
| Ambiguous network side effect | The failing operation is not replayed; the owner receives the exact error and last-known progress for reconciliation. |
| Interrupted or replaced child | Native status exposes termination; the parent inspects the seat and committed artifacts, then uses a new ID for any replacement. |
| Lost foreground session | A new session reconstructs from Git and committed artifacts, repeats readiness, and creates a fresh native tree. |
| Nested cancellation failure | Close-out remains incomplete and reports the live agent; fixtures require cancellation to leave no run agent active. |
| Cross-surface fixture failure | Feature acceptance is blocked; the surface is not removed from scope. |

During a live run, native tree status, delivery results, child responses, worktree progress, tool results, terminal reports, and replacement IDs expose execution and recovery. Each exhausted occurrence escalates the agent, exact error, last progress, and next step. Durable observability remains the existing Git history and committed artifacts; transient runtime details are not added to pipeline state.

## Risks and Open Questions

There are no open design questions. The build must validate these risks:

- A named surface may fail the required native topology or lifecycle fixtures; that blocks the feature.
- Available native capacity may be lower than a multilane plan; readiness must detect it before mutations.
- Restart can lose uncommitted reasoning or edits; reconciliation must trust commits and committed artifacts as durable progress.
- A network failure may have an ambiguous side effect; automatic recovery must escalate rather than risk duplication.
- Nested cancellation and permission inheritance must pass on every named surface.
