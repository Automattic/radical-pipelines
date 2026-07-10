# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension whenever they can operate directly on a local repository. A Codex plugin will expose the existing canonical skill and agent profiles. The foreground Codex session will continue to own workflow selection, approvals, phase sequencing, tracker synchronization, commits, and close-out. Autonomous phase agents and recurring health monitoring will use a dependency-free Node supervisor around `codex exec`, giving every local surface the same model selection, worktree isolation, structured lifecycle, and recovery behavior.

The design adds a Codex adapter without changing the pipeline model. Git branches and committed artifacts remain the only durable pipeline state, with the same grammar, layout, formats, phase predicates, roles, and approval points used by Claude Code. Codex-specific conventions live beside Claude-specific conventions in `.rp.md`; the completeness gate loads and validates only the active tool's section plus shared conventions. This lets either tool continue the other's pipelines without migration and preserves existing Claude Code behavior.

## Approach

### Distribution and configuration

Add a Codex plugin manifest at `.codex-plugin/plugin.json` and a personal marketplace entry at `.agents/plugins/marketplace.json`. The plugin exposes the repository's canonical `skills/` and `agents/` trees instead of maintaining Codex copies. Installed code resolves profiles, schemas, and scripts relative to the plugin root so plugin-cache placement does not depend on the repository working directory.

The project conventions loader will identify the active tool, merge project-local overrides as it does today, and require:

- shared conventions for both tools;
- Claude Code conventions only for Claude Code runs;
- Codex conventions only for Codex runs.

Codex conventions remain in a dedicated section of `.rp.md`, beside the existing shared and Claude Code sections. Existing Claude-only files remain valid. Adding Codex configuration preserves shared and Claude Code content unless the owner explicitly approves another edit.

Before any tracker mutation, branch, worktree, or artifact creation, the Codex completeness gate invokes the supervisor's `doctor` operation. It verifies plugin integrity, compatible Node and Codex CLI features, authentication and model access, strict agent configuration, sandbox and policy permissions, private-state access, repository seating, process control from the active surface, foreground issue-management tools, and child tool requirements. A failure names the missing prerequisite and offers the supported setup path through the existing setup flow; no partial run begins.

### Workflow execution

All existing Radical Pipelines entry points remain shared. The foreground Codex session reconstructs pipeline state from Git and committed artifacts and applies the existing create, list, resume, revise, fork, assisted, autonomous, and issue-management workflows.

Assisted phases run in the foreground Codex session. The surface may express prompts and approvals through different native controls, but the workflow still produces the same research artifact, final artifact, approval marker, commit, tracker update, phase predicate, and close-out result.

For autonomous phases, the foreground sends a structured `start` request to the supervisor for each logical agent. The request identifies the role, peers, task, conventions, exact worktree and branch, model, settings, sandbox, and persistence mode. The supervisor loads the canonical role profile, composes the initial prompt, and starts `codex exec` with argv-based process creation, prompt input on stdin, the requested model and settings, the worktree as the initial working directory, JSONL output, and a schema-constrained final envelope. The child also receives the absolute worktree and branch and performs the profile's pre-write branch check.

Persistent agents keep their bound Codex thread for review conversations and other follow-up messages. A follow-up resumes that explicit thread from the original worktree as the process working directory and reapplies its sandbox configuration. One-shot agents receive fresh sessions. Logical agent IDs, rather than Codex thread or process IDs, are the orchestration identity, so isolated lanes can run concurrently within a configured capacity limit.

The foreground consumes normalized supervisor events and validated agent envelopes. It remains responsible for phase topology, worktree and branch topology, artifact acceptance, completion predicates, review gates, tracker synchronization, commits, and final cleanup. Child sessions do not receive foreground connector handles, so tracker actions stay in the foreground. Every success, blocker, cancellation, and failure passes through the existing tracker and close-out behavior.

### Monitoring and recovery

The supervisor starts one idempotent detached monitor scheduler per run. Each non-overlapping tick collects supervisor and worktree evidence, then starts or cleanly resumes a dedicated monitor agent with the existing self-contained health policy, current retry ledger, and a typed set of allowed actions. The monitor chooses `healthy`, a recovery action, or escalation; the scheduler validates and performs status checks, idempotent resend, model override, fresh restart, or cancellation.

Only the existing `no_output`, `message`, `login`, and `network` signals receive the existing two-retry policy. Registry, protocol, configuration, permission, worktree, and other deterministic failures stop immediately. This keeps recovery policy in the monitor profile while software owns timing, process mechanics, evidence collection, and action validation. The detached scheduler supplies the same recurring monitoring outcome on all local surfaces without depending on a surface-specific automation feature.

### Interoperability and scope boundaries

Supervisor state is private runtime state and never affects branch parsing, artifact formats, fork cuts, phase completion, or cross-tool discovery. If that state is absent, the foreground reconstructs the pipeline from Git and artifacts and creates fresh logical agents when needed. Claude Code never loads Codex prerequisites or invokes the supervisor. Codex cloud or web surfaces without direct local-repository access remain out of scope, as do Codex-only workflows and changes to shared pipeline contracts.

### Acceptance coverage

| Criterion | Design coverage |
| --- | --- |
| 1. Surface coverage | One Codex plugin exposes the same skill on desktop, CLI, and IDE; `doctor` proves each surface can provide the common process capabilities. |
| 2. Autonomous workflow | The supervisor runs the existing agent topology with exact seats and models; the foreground retains reviews, artifacts, predicates, tracker updates, commits, and close-out. |
| 3. Assisted workflow | Assisted phases stay in the foreground and use the unchanged research, approval, artifact, commit, tracker, and completion contracts. |
| 4. Pipeline operations | Shared Git/artifact discovery and existing versioning, worktree, lane, fork, and cleanup rules remain authoritative. |
| 5. Cross-tool continuation | Both tools read the same branches and artifacts; private Codex state is optional and requires no migration. |
| 6. Configuration coexistence | `.rp.md` retains shared, Claude Code, and Codex sections; loading selects shared plus the active tool. |
| 7. Surface capability differences | The common supervisor supplies autonomous process and monitoring outcomes; a surface that cannot support them fails completeness instead of weakening the workflow. |
| 8. Incomplete setup | Active-tool-aware loading and `doctor` stop before any pipeline mutation and route the owner to setup. |
| 9. No Claude Code regression | Claude Code ignores Codex conventions and retains its plugin, agent transport, model, monitor, workflows, and completion predicates. |

## Components

| Component | Responsibility |
| --- | --- |
| Codex plugin manifests | Expose the canonical skill, profiles, and supervisor through the supported Codex installation path; carry the repository version. |
| Shared skill and profiles | Continue to define workflows, roles, topology, artifacts, approvals, completion, and close-out for both tools. |
| Codex convention reference | Describe the Codex transport, model, sandbox, monitor, and setup conventions loaded only for Codex. |
| Convention loader and setup flow | Select shared plus active-tool conventions, merge local overrides, and enforce completeness before mutations. |
| Foreground orchestrator | Own pipeline discovery and state, assisted work, phase sequencing, approvals, artifacts, trackers, commits, and close-out. |
| Codex supervisor | Resolve profiles, compose prompts, launch and resume `codex exec`, validate output, normalize events, bound concurrency, and expose lifecycle actions. It does not own pipeline or recovery policy. |
| Private registry | Persist recoverable launch records, session bindings, message acknowledgement, generations, locks, scheduler ownership, and redacted diagnostics outside the repository. |
| Monitor scheduler and agent | Run recurring evidence-based health checks; apply the existing retry and escalation policy through validated supervisor actions. |
| Version and release tooling | Keep the Codex manifest synchronized with `package.json`, detect version drift, treat Codex plugin paths as release-relevant, and carry a minor feature changeset. |
| Documentation and behavioral tests | Document Codex installation, setup, and parity; validate cross-surface workflows, interoperability, configuration coexistence, tracking, and legacy Claude Code behavior. |

The existing Git branch grammar, pipeline directories, artifact contracts, phase predicates, shared agent profiles, Claude Code manifest, and Claude Code runtime integration remain unchanged but are relevant inputs to the foreground orchestrator.

## Interfaces and Data Flow

### Supervisor command protocol

The supervisor is a plugin-relative script with a versioned JSON request on stdin and normalized JSONL events on stdout. Rich prompts and conventions never enter shell command strings or process lists. Its command surface is:

| Command | Contract |
| --- | --- |
| `doctor` | Validate the active surface, installation, executables, authentication, configuration, permissions, state directory, repository, and required tools without mutating pipeline state. |
| `start` | Create a logical agent generation and launch its first turn. |
| `message` | Deliver an immutable message to an idle persistent agent by resuming its explicit session; replay of the same message ID is idempotent. |
| `ack` | Record that the foreground durably consumed a delivered message or terminal envelope. |
| `restart` | Create a fresh generation from the retained launch record, optionally overriding model or settings. |
| `wait` | Wait for selected logical-agent activity or a timeout without changing its lifecycle. |
| `status` | Return normalized agent, turn, session-integrity, and last-activity facts. |
| `cancel` | Stop an owned active turn or logical agent and report the result. |
| `close` | Remove terminal run state and bounded diagnostics after foreground close-out. |
| `monitor start` | Idempotently create or reconcile the detached per-run scheduler. |
| `monitor list` | Reconcile registered monitors with heartbeat, owner token, and process identity. |
| `monitor cancel` | Stop future ticks and cancel monitor-owned active turns. |

A `start` request contains:

- protocol version and logical agent ID;
- validated role and logical peer map;
- real Git common directory and run branch;
- absolute worktree path and expected branch;
- structured shared and Codex conventions;
- verbatim task text;
- typed Codex model, reasoning/settings, and sandbox configuration;
- `persistent` or `one-shot` lifecycle mode.

The supervisor produces a schema-constrained turn envelope discriminated as:

- `message`, carrying the role-defined communication body and destination;
- `complete`, carrying the role-defined completion or review report;
- `blocked`, carrying what is missing or contradictory, which approved artifact must change, and the smallest identifiable revision.

Normalized broker events cover queueing, turn start, session binding, redacted activity, warning, turn completion or failure, delivery and acknowledgement, cancellation, status, timeout, monitor ticks and actions, escalation, and close. Consumers depend on these stable events rather than raw Codex JSONL.

### Registry contract

The registry lives in a configurable user-scoped private state directory. Records are keyed by real Git common directory, run branch, logical agent, and turn. Lock directories serialize updates, and atomic file replacement makes registry writes crash-safe.

For a recoverable agent, the registry retains its task, structured conventions, seat, settings, persistence mode, generation, launch hash, internal session ID, message IDs, acknowledgements, retry facts, and last activity until terminal close-out. It stores no credentials, environment dumps, rendered full prompts, profile copies, model reasoning, or canonical pipeline artifacts. A transient exact upstream error may be surfaced to the owner; persisted diagnostics are redacted and bounded. Acknowledged message bodies are deleted promptly, and run state is removed at close-out.

### End-to-end data flow

1. The foreground loads shared and active-tool conventions and invokes `doctor`.
2. It reconstructs the pipeline from Git and committed artifacts and applies the selected shared workflow.
3. For each autonomous role, it sends a `start` request. The supervisor resolves the canonical profile, launches the turn in its worktree, binds the returned thread, validates JSONL plus the final envelope and exit, and emits normalized events.
4. The foreground accepts agent output, routes persistent messages through immutable IDs and acknowledgements, and applies existing artifact, approval, predicate, tracker, and commit rules.
5. The monitor scheduler independently snapshots health and executes only typed actions selected by the monitor agent.
6. The foreground completes the existing success, blocker, cancellation, or failure close-out, then calls `close`; committed Git state remains available to either tool.

## Key Decisions

### Decision: Preserve one pipeline model behind a parallel Codex plugin

- **Choice:** Expose the canonical skill and profiles through a Codex manifest while keeping branches, artifacts, workflows, roles, approvals, and completion predicates shared.
- **Alternatives:** A standalone copied skill, Codex-only project guidance, or separate Codex pipeline contracts.
- **Trade-offs:** A parallel manifest and release integration add packaging work, but avoid behavioral drift, migration, and duplicate maintenance.
- **Traces to:** Requirements 1, 3–5; Acceptance criteria 1, 4–6, 9

### Decision: Use one supervised `codex exec` transport for autonomous agents

- **Choice:** Launch every autonomous role through the supervisor with exact model/settings, sandbox, worktree, structured output, and persistent-thread support.
- **Alternatives:** Native Codex subagents, a native/supervised hybrid, or foreground-only execution.
- **Trade-offs:** The choice requires compatible local Node and Codex CLI executables, but supplies one evidenced contract for exact agent configuration, seating, messaging, monitoring, and recovery on all local surfaces.
- **Traces to:** Requirements 1–2, 5; Acceptance criteria 1–2, 4, 7–8

### Decision: Implement the adapter as a dependency-free plugin script

- **Choice:** Use Node built-ins for process control, JSONL/schema handling, registry locking, concurrency, and scheduling.
- **Alternatives:** An MCP server, prose-only orchestration, or a compiled cross-platform broker.
- **Trade-offs:** Node becomes a verified prerequisite and operating-system process behavior needs tests; no server lifecycle, SDK, package dependency, or platform build is added.
- **Traces to:** Requirements 1–2, 5; Acceptance criteria 1–2, 7–8

### Decision: Select additive conventions by active tool

- **Choice:** Keep shared, Claude Code, and Codex sections in `.rp.md`; load shared plus the active tool and validate that exact combination.
- **Alternatives:** Separate tool files, duplicated complete configurations, or rewriting Claude Code conventions during Codex setup.
- **Trade-offs:** The loader gains active-tool awareness, while shared values remain single-source and legacy Claude-only projects continue unchanged.
- **Traces to:** Requirements 4–5; Acceptance criteria 6, 8–9

### Decision: Keep runtime state private and protocol-driven

- **Choice:** Use versioned stdin JSON, normalized stdout JSONL, logical IDs, and a private restart-discoverable registry; keep Git and committed artifacts authoritative.
- **Alternatives:** Raw flag and JSONL passthrough, a long-lived daemon, in-memory-only state, or supervisor artifacts inside the pipeline.
- **Trade-offs:** Protocol versioning and crash-safe locking add implementation complexity, but avoid shell leakage, raw-event coupling, lost foreground state, and cross-tool contamination.
- **Traces to:** Requirements 2–3; Acceptance criteria 2, 4–5

### Decision: Require acknowledgement and conservative session integrity

- **Choice:** Make message IDs immutable, replay idempotent, consumption explicit, and resume conditional on a fully consistent prior turn; ambiguous sessions restart as fresh generations.
- **Alternatives:** Treat process exit, one JSONL event, or a final body alone as authoritative; resume after interrupted or ambiguous delivery.
- **Trade-offs:** Some uncommitted agent work may be repeated after uncertainty, but duplicate delivery and unsafe continuation are avoided.
- **Traces to:** Requirement 2; Acceptance criteria 2, 4

### Decision: Use a detached scheduler with monitor-owned policy

- **Choice:** Run one supervised scheduler per run; let the existing monitor agent choose from typed recovery actions using the existing signals and two-retry budget.
- **Alternatives:** Surface-specific scheduled tasks, supervisor-defined automatic retries, or weakening monitoring where native automation is absent.
- **Trade-offs:** Detached process ownership and reconciliation are platform-sensitive, but monitoring semantics stay uniform and recovery policy remains in the agent profile.
- **Traces to:** Requirements 1–2, 5; Acceptance criteria 1–2, 7, 9

### Decision: Keep durable workflow and tracker ownership in the foreground

- **Choice:** The foreground orchestrator continues to own assisted work, pipeline state, approvals, artifacts, predicates, tracker calls, commits, and close-out; the supervisor owns only Codex process mechanics.
- **Alternatives:** Move phase policy or tracker mutations into child sessions or the supervisor.
- **Trade-offs:** The foreground must remain active for orchestration and connector access, but shared behavior and completion ordering stay unchanged.
- **Traces to:** Requirements 2–3, 5; Acceptance criteria 2–5, 9

### Decision: Fail completeness before pipeline mutation

- **Choice:** `doctor` and active-tool convention validation must prove the complete Codex execution path before any tracker, Git, worktree, or artifact change.
- **Alternatives:** Start with partial capabilities or discover prerequisites during a phase.
- **Trade-offs:** A surface with inadequate process control cannot run until fixed, but no incomplete or weakened pipeline state is created.
- **Traces to:** Requirement 5; Acceptance criteria 7–9

## Dependencies

- The canonical Radical Pipelines skill, agent profiles, shared workflow references, branch grammar, and artifact contracts.
- Git and a local repository worktree.
- A compatible Node runtime; implementation uses built-in modules only and adds no npm runtime dependency.
- A compatible authenticated Codex CLI with `exec`, JSONL events, output schemas, explicit model/settings, sandbox configuration, worktree selection, thread IDs, and session resume.
- Operating-system process creation, detached scheduling, process identity, signaling, atomic rename, and directory locking.
- The active surface's ability to invoke the supervisor and control child processes.
- Foreground tools named by the active `Issues` convention and any tools required by child roles.
- Codex model access, authentication, and network availability.

New distribution dependencies are the Codex plugin manifest and personal marketplace metadata. Version sync, drift checks, changeset configuration, documentation, and tests must include them. No new service, MCP server, or package dependency is introduced.

## Failure Modes and Observability

| Failure | Detection and behavior |
| --- | --- |
| Missing convention or prerequisite | Active-tool loading or `doctor` fails before mutation, identifies the gap, and invokes the existing setup path. |
| Invalid request, role, path, configuration, or registry data | Schema and invariant validation emits a deterministic failure; no retry is attempted. |
| Authentication, model, network, or rate-limit failure | JSONL, envelope, exit, and upstream evidence produce a normalized code. Only proven `login` or `network` signals enter the existing retry policy. |
| No output or undelivered monitor message | Last activity and delivery facts produce `no_output` or `message`; the monitor may apply at most two configured retries before escalation. |
| Permission, sandbox, tool initialization, or seating failure | The supervisor reports the stage and source and stops. Branch or worktree drift taints the session. |
| Invalid/truncated envelope, failed turn, nonzero exit, or conflicting evidence | The turn fails and its session is tainted. A later attempt uses a fresh generation rather than resume. |
| Delivery ambiguity or lost acknowledgement | Immutable message IDs permit idempotent replay; unresolved ambiguity taints the session and surfaces reconciliation instead of assuming consumption. |
| Corrupt state, stale lock, or orphan process | Automatic cleanup occurs only with positive ownership and liveness proof; otherwise `status` or `monitor list` reports reconciliation facts. |
| Scheduler death, duplicate scheduler, or PID reuse | Heartbeat, owner token, and process identity are reconciled by idempotent `monitor start` and `monitor list`. |
| Capacity exhaustion | Starts queue within the configured bound and emit queue/status events; they do not silently exceed the limit. |
| Cancellation or foreground loss | Owned process groups are cancelled where identity is proven; ambiguous sessions are tainted. Foreground restart discovers the registry and Git state. |

Every failure event includes a normalized code, stage, source, session-integrity state, last activity, and optional monitor signal. An exact upstream error may be shown transiently to the owner for escalation; persisted events and diagnostics are bounded and redacted. Credentials, full prompts, environment dumps, profile copies, and reasoning are never persisted. Normalized lifecycle events make queueing, progress, session binding, warnings, delivery, retries, cancellation, escalation, and cleanup visible without exposing raw Codex internals.

Regardless of outcome, the foreground performs the existing tracker and repository close-out. Successful close removes acknowledged bodies, private registry records, and monitor state while retaining only canonical committed pipeline artifacts.

## Risks and Open Questions

There are no open design questions. The build must validate these risks:

- Codex CLI flags, JSONL events, schemas, and error shapes may evolve; `doctor` must gate supported versions and behavioral tests must cover the adapter contract.
- Desktop or IDE environments may not expose compatible `codex` and Node executables or permit detached descendants; they must fail completeness rather than fall back to weaker behavior.
- Managed policy, repository trust, sandbox rules, or tool initialization may block nested execution.
- Foreground issue-management tools may differ by surface even when autonomous transport works.
- Provider limits and operating-system resources may restrict parallel lanes; supervisor capacity must remain bounded.
- Detached-process survival, process groups, PID identity, and cancellation differ across operating systems.
- Different surfaces may resolve different user state directories or `CODEX_HOME` values, preventing private-state discovery until configuration is aligned.
- Forced or ambiguous termination may require repeating uncommitted agent work from a fresh generation.
- Codex session-history retention is independent of supervisor-state cleanup.
- Optional plugin or hook errors may coexist with a valid turn, so classification must continue to combine JSONL, envelope, and exit evidence.

Behavioral validation must cover all three local surfaces; an autonomous run from Intent through Document; assisted phases; create, list, resume, revise, and fork operations; bidirectional cross-tool continuation; tracker ordering and close-out on every outcome; mixed shared/Claude/Codex configuration; and unchanged legacy Claude Code workflows.
