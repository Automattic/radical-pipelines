# Design Doc: Codex support

## Overview

Radical Pipelines will run on the Codex desktop app, CLI, and IDE extension when the surface has direct access to a local repository. Codex will expose the same autonomous and assisted workflows as Claude Code while reusing the existing branch grammar, pipeline and lane layout, artifacts, phase topology, approval gates, tracker behavior, commits, and completion predicates. Cross-tool continuation therefore remains state reconstruction from Git rather than migration.

Codex support adds a thin plugin and one tool-specific runtime seam. The plugin exposes the canonical skill on every local Codex surface. A Codex convention adapter validates configuration, then a detached local supervisor launches role sessions through `codex exec`, enforces model and worktree settings, monitors workers, and coordinates transient monitor ownership with Claude Code. Shared workflow prose and durable pipeline state remain tool-neutral.

## Approach

### Distribution and configuration

The repository becomes a Codex plugin through `.codex-plugin/plugin.json`, whose `skills` entry points to the existing skill tree, and `.agents/plugins/marketplace.json`, whose entry points to the repository root. Installation and project setup remain separate: the plugin must be installed and enabled before Radical Pipelines can run its setup flow. Release version synchronization and drift checks include the Codex manifest, and release qualification verifies the installed package rather than assuming repository-root files survive plugin caching.

Projects retain one committed `.rp.md` with Shared conventions and separate Claude Code and Codex convention sections. The active tool reads Shared plus its own section. Codex requires semantic Team spawning and Health monitoring units; Agent models remains optional. Existing unscoped tool-specific values retain their Claude Code meaning.

Codex applies two ordered readiness gates before every issue or pipeline operation:

1. The committed `.rp.md` must contain complete Shared and Codex semantic units.
2. After that succeeds, Codex merges only the Codex namespace from the common-Git-root `.rp.local.md`, resolves machine-local values, and proves local runtime readiness.

Local overrides can supply paths and replace machine-specific values, but cannot make a missing committed semantic unit complete. Runtime readiness verifies the installed profiles and supervisor, Node and Codex executables, authentication and configured models, strict Codex configuration, session persistence, registry and lease access, process detachment and cancellation, Git and the configured worktree root, and sufficient independent-process capacity. Failure leaves setup incomplete and creates no pipeline or phase-0 work.

### Session and worktree execution

The Codex Team spawning convention uses `codex exec` because its callable interface can apply an exact model, reasoning effort, and initial working directory on every in-scope surface. For each role, the adapter reads the canonical `agents/<role>.md`, prepends the existing `## Conventions` block, appends the assignment and any verbatim evidence, and supplies the assembled prompt on standard input to:

```text
codex exec --json -C <absolute-worktree> -m <model> \
  -c model_reasoning_effort=<effort> \
  -c features.multi_agent=false -
```

Team spawning defines a portable default model and effort, an authenticated fallback, and independent-process capacity. Optional Agent models conventions override the default by role or difficulty tier. Every initial session records the exact Codex thread ID, settings, worktree, branch, and HEAD. A persistent role resumes only that thread ID with the same settings; a fresh role starts a new session. The root orchestrator relays persistent-role questions and answers verbatim and remains the sole owner of branches, worktrees, and phase topology.

Immediately before a worker launch, the adapter verifies that the assigned directory exists, is a Git worktree, has the expected branch and HEAD, appears in `git worktree list`, and is disjoint from sibling lanes. The child profile retains its own worktree and branch check before writing. For `L` isolated lanes, readiness reserves capacity for the `2L` persistent analyst/researcher peak and the `L` writer or reviewer peak; insufficient capacity blocks the run instead of changing isolated-lane concurrency.

### Supervisor and health monitoring

`runtime/codex/supervisor.mjs` is a Node 22, built-in-only process supervisor used by both Team spawning and Health monitoring. The adapter derives the installed plugin root from the loaded skill locator, verifies the enclosing manifest and payload hashes, then invokes the absolute Node executable and supervisor path with argument arrays. The supervisor inherits the resolved Codex executable's user profile, `CODEX_HOME`, authentication, proxy, and environment; it stores no credentials.

The supervisor owns all `codex exec` worker processes and their JSONL streams. It remains independent of the root task so recurring checks, list and cancel operations, recovery, and close-out continue to function if that task disappears. Its public command surface is:

- `start`: create the monitor for a run and acquire its lease generation.
- `launch`: create a fresh role session.
- `resume`: continue an exact persistent session.
- `follow`: stream ordered worker, recovery, escalation, and completion events.
- `list --json`: return independently inspectable monitor and worker state.
- `cancel --wait`: request shutdown and wait for worker-tree termination and acknowledgment.

The versioned protocol identifies a run by canonical Git common directory, run branch, and artifact folder. Monitor records include schema version, monitor UUID, lease generation, process ID and start time, heartbeat, timing and capacity settings, platform adapter, plugin/state/executable roots, and ordered event state. Worker records include role, profile hash, prompt and delivery identity, worktree/branch/HEAD, lane and phase, model/effort/fallback/config, exact thread ID, process identity, last progress/error/commit, retry occurrence, and timestamps. Delivery IDs, generation checks, and event sequence numbers make file-backed commands idempotent.

Transient registry state uses `RADICAL_PIPELINES_STATE_DIR` when set, otherwise the operating system's user-local state directory. It is permission-restricted, schema-tagged, atomically written, and kept outside repositories, worktrees, plugin caches, and `.pipelines/`. It never contributes to a phase predicate.

The monitor detects silence, message failures, authentication and network errors, process death, worktree drift, and stale or corrupt state. For a live but silent `codex exec` turn, the first bounded recovery gracefully interrupts the process and resumes the exact thread with a status request. The second replaces it with a new explicitly seeded session. Failures that remain after the permitted recoveries produce a structured escalation and remain visible in the registry.

POSIX hosts use detached process groups and group signals. Windows first requests graceful child-tree interruption and uses `taskkill.exe /PID <pid> /T /F` only after the cancellation deadline. Close-out calls `cancel --wait` before pushing so no worker or monitor can mutate the run after completion.

### Cross-tool continuation

Git remains the durable source of truth. Either tool discovers pipeline families and runs from the existing branches, artifact paths, formats, commits, and completion predicates. No Codex marker, registry entry, or artifact migration is required to inspect, list, resume, revise, or fork a Claude Code run, and Claude Code uses the same rules for a Codex-created run.

A small tool-neutral monitor lease under the canonical Git common directory protects the only cross-tool state that is not reconstructed from Git. A new adapter atomically requests cancellation of the current lease generation and waits for acknowledgment or bounded expiry before acquiring the next generation. A supervisor that observes a generation mismatch stops its workers and exits. A Claude Code monitor identifies its scheduled task through the UUID embedded in its prompt, deletes that task, and acknowledges. Every lease expires, so a monitor abandoned in another clone eventually loses authority and self-cancels on its next check. No new committed Claude Code convention is required.

### Workflow behavior and acceptance coverage

- **AC1 — Surface coverage:** the installed plugin exposes the same canonical skill on desktop, CLI, and IDE; the common exec/supervisor adapter supplies a surface-independent runtime. Each host type must pass installed-package and readiness qualification.
- **AC2 — Autonomous workflow:** the shared autonomous workflow and agent topology remain authoritative through Document and later phases. The adapter supplies role sessions, lane concurrency, worktree isolation, monitoring, recovery, and exact model settings; existing gates, artifacts, commits, tracker updates, and completion predicates determine progress.
- **AC3 — Assisted workflow:** Codex follows the unchanged assisted workflow, including research, the final artifact, owner approval marker, commit, tracker update, and close-out. Full readiness still precedes the operation so assisted success cannot mask missing autonomous prerequisites.
- **AC4 — Pipeline operations:** create, list, resume, revise, and fork use the existing version, branch, run, lane, worktree, artifact, and cleanup contracts. Codex adds no alternate operation semantics.
- **AC5 — Cross-tool continuation:** shared Git state and predicates permit exact continuation without migration; acknowledged, expiring monitor leases prevent a prior tool's local worker from acting concurrently.
- **AC6 — Configuration coexistence:** `.rp.md` retains Shared, Claude Code, and Codex sections. Active-tool selection and namespaced local overrides add Codex values without rewriting or disabling Claude Code values.
- **AC7 — Surface capability differences:** `codex exec` and the supervisor provide model binding, working-directory control, persistence, concurrency, recurring monitoring, recovery, list, and cancel even when a host surface has no equivalent native control.
- **AC8 — Incomplete setup:** committed semantic completeness and local runtime readiness both finish before phase-0 creation. A failure identifies the missing convention or prerequisite and routes the owner to the existing setup path.
- **AC9 — No Claude Code regression:** shared workflows, artifact contracts, branch grammar, predicates, agent profiles, and plugin discovery remain unchanged. Backward-compatible convention and lease handling plus legacy behavior tests protect prior Claude Code outcomes.

## Components

### New components

- `.codex-plugin/plugin.json`: exposes the existing skill tree as a versioned Codex plugin.
- `.agents/plugins/marketplace.json`: makes the repository-root plugin installable on local Codex surfaces.
- `skills/radical-pipelines/reference/conventions/codex.md`: defines Codex Team spawning, Health monitoring, defaults, fallback, capacity, readiness, and runtime invocation.
- `runtime/codex/supervisor.mjs`: owns Codex sessions, process trees, registry state, monitoring, recovery, events, and lease participation.
- Behavioral tests and a Node 22 Ubuntu, macOS, and Windows workflow: qualify supervisor behavior, packaged payload access, configuration coexistence, cross-tool compatibility, phase predicates, and runtime portability.

### Modified components

- Convention loading and setup select Shared plus the active tool, enforce committed completeness before local overrides, collect Codex conventions, and run Codex readiness checks.
- Shared health-monitoring guidance defines the tool-neutral lease and backward-compatible Claude Code cancellation acknowledgment.
- `.rp.md` gains this repository's Codex section while retaining its Shared and Claude Code values.
- README, CONTRIBUTING, GLOSSARY, package metadata, test scripts, and version sync/drift tooling describe and release the Codex distribution and runtime. Changeset configuration treats the Codex distribution and runtime paths as release-relevant.

### Unchanged but relevant components

- `skills/radical-pipelines/SKILL.md`, phase workflows, prompt-passing rules, and `agents/*.md` remain canonical for both tools.
- Tracker synchronization, guardrails, owner approvals, commits, and close-out retain their current semantics.
- Branch grammar, pipeline/run/lane layout, artifact formats and paths, and phase-completion predicates remain the interoperability contract.
- Claude Code plugin discovery and workflow behavior remain unchanged apart from normal release-version propagation and lease compatibility.

## Interfaces and Data Flow

### Convention interface

The convention loader receives the active tool and returns Shared plus that tool's conventions. Codex Team spawning supplies the supervisor and Codex executable paths, default model and effort, authenticated fallback, capacity, and allowed configuration. Codex Health monitoring supplies interval, silence threshold, recovery, cancellation, and lease-expiry values. Machine paths belong in the Codex namespace of `.rp.local.md`; committed units define shared project behavior.

### Runtime bootstrap interface

The loaded skill's absolute locator is the required `skill_root` bootstrap value. The adapter resolves the enclosing plugin manifest, verifies the canonical role profiles and supervisor payload, resolves absolute Node and Codex executables, and starts the supervisor. Missing or mismatched payloads are setup failures rather than deferred worker errors.

### Prompt and session interface

The root passes each worker the canonical profile, unchanged conventions block, assignment, and verbatim inter-role evidence. The supervisor binds that prompt to the expected worktree, branch, HEAD, model, effort, and fallback. A fresh launch returns an exact thread ID; persistent delivery uses that ID and an idempotency key. The root never uses an implicit “last session” selector.

### State and event interface

The user-local registry is the supervisor's observable runtime state; the common-directory lease is the cross-tool ownership record; Git branches and `.pipelines/` artifacts are the durable workflow state. JSONL worker events become monotonically ordered supervisor events. `follow` exposes progress and terminal events to the root, while `list --json` provides recovery after root loss. Commits and artifact predicates, not supervisor events, authorize phase completion.

### End-to-end data flow

Installation resolves marketplace entry → plugin manifest → shared skill. Invocation resolves active-tool conventions → committed semantic completeness → Codex local overrides → static readiness. Autonomous execution resolves run state from Git → acquires the monitor lease → starts the supervisor → launches or resumes exact role sessions → follows events through the unchanged phase topology → verifies committed predicates → performs tracker updates → cancels and waits → pushes. Assisted execution uses the same readiness, shared artifact and approval predicates, tracker update, and close-out without replacing owner interaction. Cross-tool continuation first settles the prior monitor lease, then reconstructs the run solely from Git.

## Key Decisions

### Decision: Reuse the canonical pipeline model through a thin Codex plugin

- **Choice:** Point a Codex plugin at the existing skill and keep workflow logic, roles, branches, artifacts, approvals, tracker behavior, commits, and predicates shared.
- **Alternatives:** Duplicate the workflow or role model in Codex-native project configuration; create Codex-specific pipeline contracts.
- **Trade-offs:** Reuse minimizes drift and enables migration-free continuation, but Codex-specific execution controls must fit behind the existing convention seam and installed payload access must be qualified.
- **Traces to:** Requirements 1–5 / Acceptance criteria 1–6 and 9

### Decision: Keep one sectioned project convention file with ordered readiness gates

- **Choice:** Store Shared, Claude Code, and Codex conventions in `.rp.md`; validate committed Shared + Codex semantics before merging only Codex local overrides and running readiness.
- **Alternatives:** Split conventions into tool files; store Codex behavior in native `.codex/` configuration.
- **Trade-offs:** One file preserves existing setup, storage, fork, and commit rules and avoids permanent format precedence, but convention loading must be section-aware. Native configuration would model some Codex settings but not the required pipeline-specific spawning and monitoring units.
- **Traces to:** Requirements 4–5 / Acceptance criteria 6, 8, and 9

### Decision: Launch roles through exact `codex exec` sessions

- **Choice:** Use fresh and persisted `codex exec` sessions with explicit model, effort, worktree, configuration, and thread identity.
- **Alternatives:** Prompt native subagents; add project-scoped custom-agent profiles; mix native and exec sessions by surface.
- **Trade-offs:** Exec sessions provide the required deterministic controls on every surface, at the cost of a CLI/authentication prerequisite, external process capacity, JSONL handling, and root-relayed persistent Q&A. Native agents offer stronger host UI integration but do not expose equivalent callable worktree and model controls.
- **Traces to:** Requirements 1–2 / Acceptance criteria 1, 2, 4, and 7

### Decision: Use a detached Node supervisor for spawning and health monitoring

- **Choice:** Ship a Node 22 built-in-only supervisor that owns worker processes, sessions, monitoring, recovery, list/cancel operations, and structured events.
- **Alternatives:** Monitor inline in the root task; use a persistent monitor session; use Goal mode, hooks, or Scheduled work; ship native binaries; use MCP, App Server, or the SDK.
- **Trade-offs:** A detached supervisor satisfies recurring and post-root-loss behavior with no npm runtime dependency, but adds Node and OS process-control prerequisites plus cross-platform runtime tests. The alternatives lack timers, silence detection, process ownership, exact launch controls, or require a larger build and protocol surface.
- **Traces to:** Requirements 1, 2, and 5 / Acceptance criteria 1, 2, 7, 8, and 9

### Decision: Separate transient runtime state from durable pipeline state

- **Choice:** Keep registry state user-local, use an acknowledged expiring lease under the Git common directory, and leave completion predicates dependent only on existing Git artifacts and commits.
- **Alternatives:** Store monitor state in `.pipelines/`; rely on uncoordinated per-tool monitors; use only in-memory ownership.
- **Trade-offs:** Separation preserves artifact interoperability and predicate stability while making state cleanup and cross-tool ownership explicit. It adds atomic file, permission, expiry, and generation handling outside the repository worktree.
- **Traces to:** Requirements 3 and 5 / Acceptance criteria 5 and 9

### Decision: Make packaging, platform behavior, and compatibility observable contracts

- **Choice:** Verify installed payload access on desktop, CLI, and IDE hosts; test Node 22 process behavior on Ubuntu, macOS, and Windows; behaviorally cover autonomous-through-Document, assisted mode, operations, cross-tool continuation, legacy conventions, namespace precedence, and predicate invariance.
- **Alternatives:** Treat installed-root access and platform process behavior as implementation details; redesign both tool distributions around a new manifest-declared runtime component.
- **Trade-offs:** Explicit qualification adds smoke-test hosts and a cross-platform matrix, but turns missing runtime capabilities into completeness failures and protects Claude behavior. A distribution redesign would duplicate or relocate canonical sources.
- **Traces to:** Requirements 1–5 / Acceptance criteria 1–9

## Dependencies

- Existing Git branch, worktree, artifact, and predicate contracts.
- An installed and enabled Codex plugin containing the canonical skill, role profiles, and supervisor payload.
- Node 22, using built-in modules only.
- An exact authenticated Codex CLI executable with access to configured models and strict configuration validation.
- Permission to use the selected user-local state directory and the canonical Git common directory.
- POSIX process-group control or Windows child-tree interruption and `taskkill.exe` fallback.
- Sufficient external-process capacity for the selected lane topology.

No npm runtime package, MCP server, SDK, App Server, native binary, new tracker service, or new durable artifact format is introduced.

## Failure Modes and Observability

- **Incomplete committed conventions:** the semantic completeness gate names the missing Shared or Codex unit and offers the existing setup path. No local override or pipeline work is accepted.
- **Missing or altered installed payload:** bootstrap reports the manifest, profile, or supervisor mismatch and leaves Codex setup incomplete.
- **Unavailable runtime:** missing Node/Codex executables, authentication, models, strict config, state permissions, process controls, or capacity fail readiness before phase-0 creation.
- **Invalid worktree topology:** a missing worktree, branch/HEAD mismatch, absent Git membership, or sibling overlap blocks that launch and reports the expected and observed values.
- **Worker silence or transport failure:** heartbeat and JSONL timestamps identify the affected role and thread. Bounded resume and replacement recoveries are recorded; exhaustion produces a structured escalation.
- **Root-task loss:** the supervisor continues monitoring. A later invocation discovers it with `list --json`, follows pending events, or cancels it independently.
- **Stale or foreign monitor:** PID/start-time/heartbeat validation detects stale local records. Lease generations request acknowledged cancellation; mismatch or expiry makes the old monitor terminate its worker tree before further action.
- **Registry interruption or duplicate delivery:** atomic writes, schema versions, locks, monotonic sequences, generation checks, and idempotency IDs prevent partial state from authorizing duplicate work; invalid state is surfaced and archived.
- **Process-tree shutdown failure:** graceful cancellation precedes platform-specific forced termination. `cancel --wait` reports any process that survives the deadline, and close-out cannot push while cancellation remains unacknowledged.
- **Claude Code regression:** legacy `.rp.md` and `.rp.local.md`, unchanged autonomous and assisted outcomes, cross-tool continuation, and predicate-invariance suites expose behavior drift.

Supervisor events expose monitor/run identity, role and thread, process state, last progress, error, commit, retry occurrence, and timestamps. Unresolved recoveries and escalations persist in the registry. Transient telemetry never marks a phase complete.

## Risks and Open Questions

- **Installed payload variance:** a surface may omit undeclared root files. Setup and surface smoke tests hash and read every required profile and runtime before permitting an operation.
- **Nested CLI environment:** desktop or IDE hosts may lack a separately authenticated executable, model, proxy, or filesystem grant. Every invocation checks the exact resolved environment.
- **Stale workers across tools or clones:** acknowledged cancellation, bounded expiry, deterministic generation mismatch, idempotent delivery, and worker-tree shutdown limit concurrent mutation.
- **Process portability:** detachment and termination differ across operating systems. Real subprocess-tree tests exercise graceful and forced paths in the Node 22 platform matrix.
- **Protocol or state corruption:** crashes and PID reuse can misidentify ownership. Schema versions, atomic locking, PID start times, heartbeats, monotonic events, and stale archival mitigate this risk.
- **Claude Code regression:** convention selection and lease support touch shared seams. Legacy configuration, workflow parity, cross-tool continuation, and predicate-invariance tests protect existing behavior.

There are no open design questions. If installed-package or platform qualification disproves the selected transport assumptions, changing transport requires a new approved design.
