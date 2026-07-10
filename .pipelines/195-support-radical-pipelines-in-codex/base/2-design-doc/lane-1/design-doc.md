# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension when they operate on a local repository. Codex will expose the same autonomous and assisted workflows as Claude Code without introducing a second pipeline model: branches, run families, worktrees, phases, lanes, artifacts, approvals, commits, tracker synchronization, completion predicates, and close-out remain tool-neutral and Git-backed.

The existing skill remains the orchestrator. A Codex convention adapter translates its preflight, agent-lifecycle, and health operations to a bundled MCP supervisor, which controls Codex app-server through newline-delimited JSON over stdio. The supervisor supplies consistent working-directory, provider, model, reasoning, sandbox, steering, interruption, recovery, and event behavior across all in-scope Codex surfaces. It owns machine-local runtime state; the skill continues to own pipeline decisions and treats committed artifacts and Git state as authoritative.

The design adds no Codex-only workflow, changes no shared branch or artifact contract, and excludes Codex surfaces without direct local-repository access.

## Approach

The project keeps one installed Radical Pipelines skill and one project convention file. The convention file contains `Shared conventions`, `Claude Code conventions`, and `Codex conventions`. A tool-neutral dispatcher obtains the active adapter key from the host environment and loads only `reference/conventions/<adapter-key>.md`. The generic loader and setup flow contain no tool table. Each dedicated adapter owns its host match, active-section completeness rules, setup actions, and lifecycle and health mapping. Loading applies the shared section plus the active adapter's section; setup adds or repairs only that section.

The distribution root gains a Codex plugin manifest beside the Claude manifest. The existing marketplace distributes both manifests and the shared skill. The Codex manifest registers a dependency-free Node MCP supervisor. `reference/conventions/codex.md` maps generic pre-mutation, lifecycle, and health vocabulary to the supervisor. `reference/conventions/claude-code.md` retains the existing Claude Code mappings.

Codex uses a two-stage completeness gate followed by activation. At convention load, its dedicated adapter validates the active `.rp.md` section and prerequisites that exist before a run identity: the Node executable and version, Codex executable and minimum version, MCP registration and launch, and setup-action results. Missing items enter the existing setup offer. Before a workflow mutates a branch, worktree, artifact, or existing run, `prepare_run` receives a planned run identity, an absolute checkout in the target local repository, the selected workflow, and its resolved runtime configuration. It validates run-scoped authentication, capabilities, runtimes, state, and authority, then returns a reservation. After the workflow creates or locates the run worktree, `open_run` validates that worktree against the reservation, activates the run, reconciles threads, and starts autonomous monitoring. A failed activation removes any branch and worktree created for the attempt before new artifact writes and releases the reservation; an existing run remains untouched until activation succeeds.

The shared workflows expose this as an adapter-neutral pre-mutation gate. Their read-only planning resolves the operation and identifiers first. The active adapter may request workflow mode and runtime choices early enough to run its gate. The Codex adapter does so; the Claude Code adapter returns ready and preserves its current setup, spawning, and monitoring behavior. Once a run is active, both tools enter the existing autonomous or assisted topology at the same point.

For autonomous execution, the parent skill preserves the existing phase topology and uses the supervisor to start agents in their assigned worktrees. Each agent receives its canonical root-level profile as app-server developer instructions and the exact conventions block plus task as its first turn. The parent remains responsible for issue and tracker operations, analyst/researcher relays, lane isolation, ordering writers that share a worktree, owner approval gates, Git verification, phase-completion predicates, and run close-out.

For assisted execution, the active Codex session performs the phase interaction and owner approval directly, as the existing assisted workflow requires; it creates no child threads or health monitor. The supervisor supplies prerequisite validation and single-controller ownership. The resulting research, final artifact, approval marker, commit, tracker state, and close-out use the same contracts and predicates as autonomous and Claude Code execution.

When a Codex surface lacks a native control, the convention adapter uses the supervisor operation that produces the required outcome. Surface-specific UI controls are optional; model and provider selection, worktree isolation, health monitoring, steering, interruption, and recovery remain part of the workflow.

### Acceptance coverage

| Criterion | Design mechanism |
| --- | --- |
| 1. Surface coverage | The plugin-scoped MCP supervisor and Codex adapter expose one lifecycle interface in desktop, CLI, and IDE; shared contracts keep behavior identical. |
| 2. Autonomous workflow | The existing parent topology and predicates remain intact while the supervisor enforces each child's profile, worktree, provider/model/effort, sandbox, lifecycle, and four-signal health state. |
| 3. Assisted workflow | The active session retains the existing assisted research, artifact, approval, commit, tracker, and close-out path without child threads. |
| 4. Pipeline operations | Create, resume, revise, and fork add a pre-mutation adapter gate while retaining the existing versioning, branch, worktree, lane, artifact, and cleanup rules. |
| 5. Cross-tool continuation | Git branches and artifacts remain the sole pipeline state, so either tool recognizes and advances work from the other without migration. |
| 6. Configuration coexistence | Tool-neutral dispatch combines shared conventions with one adapter-owned section; setup modifies only that section, and both manifests distribute the same skill. |
| 7. Surface capability differences | Missing native controls map to supervisor operations rather than weakened or skipped outcomes. |
| 8. Incomplete setup | Adapter completeness and `prepare_run` finish static and run-scoped checks before pipeline mutation; activation failure rolls back a branch and worktree created for the attempt before new artifact writes. |
| 9. No Claude Code regression | The Claude adapter keeps its manifest, convention schema, setup actions, spawn and monitor mappings, artifacts, topology, and predicates without depending on the Codex supervisor. |

## Components

### Shared orchestration skill

The skill continues to own invocation, phase topology, agent roles, branch grammar, artifact paths and formats, phase predicates, approvals, pipeline operations, tracker synchronization, commits, and close-out. `reference/conventions/load.md` resolves an adapter key supplied by the active host, loads the same-named dedicated adapter, and combines its section with shared conventions. `reference/conventions/setup.md` invokes that adapter's completeness and setup sections. Neither generic file enumerates or names supported tools.

`reference/work-on-an-issue.md` invokes a tool-neutral pre-mutation gate after read-only operation planning. `create-pipeline.md`, `resume-pipeline.md`, `revision-pipeline.md`, and `fork-pipeline.md` identify their planned run branch, artifact folder, and source checkout before their first write. `autonomous-workflow.md` and `assisted-workflow.md` accept an already selected mode and active run handle when an adapter required early activation. These changes alter entry sequencing only; phase and agent topology remain unchanged.

### Project conventions

One `.rp.md` stores the shared, Claude Code, and Codex sections. Shared project policy has one source; each adapter defines the schema for its spawning, provider/model, reasoning, sandbox, monitoring, and fallback details. Convention completeness is evaluated for the active adapter and selected workflow. Setup merges only that section, preserving the other adapter's content byte-for-byte.

### Convention adapters

`reference/conventions/claude-code.md` owns Claude Code host detection, required active-section fields, canonical setup actions, team spawning, and health-monitor start/list/cancel mappings. Its existing mappings and generated convention content remain unchanged.

`reference/conventions/codex.md` owns the corresponding Codex host detection, required fields, setup actions, pre-mutation reservation, run activation, agent lifecycle, and health-monitor mappings. It maps to `prepare_run`, `open_run`, `spawn_agent`, `send_agent_input`, `report_health`, `poll_run`, `stop_agent`, and `close_run`. Canonical agent behavior stays in root-level agent profiles.

### Plugin packaging

`.codex-plugin/plugin.json` declares the Codex plugin beside the existing Claude manifest. `.claude-plugin/marketplace.json` remains the single marketplace catalog and points to the distribution root containing both manifests and the shared skill. `.mcp.json` launches the supervisor with `node`, `./codex/supervisor.mjs`, plugin-root `cwd`, bounded startup and tool timeouts, and parallel calls disabled.

Version synchronization, manifest drift checks, changeset relevance, README, package metadata, and contributor guidance cover the Codex manifest and runtime paths while retaining their Claude coverage.

### MCP supervisor

The dependency-free Node process is a transport, lifecycle, and health adapter. It:

- maintains a true stdio pipe to one child app-server process;
- correlates interleaved responses and notifications by request, thread, and turn IDs;
- injects canonical profiles and exact initial prompts;
- enforces worktree, branch context, provider, model, reasoning effort, approval policy, and sandbox inputs;
- normalizes all four health signals, recovery actions, retry occurrences, terminal output, and owner escalations;
- manages deterministic thread names, restart generations, monitor registrations, runtime state, and the run lease;
- suppresses the lifecycle MCP server in child configuration to prevent recursion.

It never reads pipeline artifacts to decide phase completion and never reports a phase complete on its own.

### Codex app-server

App-server provides stable thread start, naming, discovery, reading, resumption, archival, turn start, steering, interruption, model discovery, lifecycle events, and approval requests. The supervisor tolerates unknown fields and events but requires every behavior used by the adapter to pass preflight.

### Repository identity, runtime state, and diagnostics

`prepare_run` accepts `repository_checkout`, an absolute path to any existing checkout whose Git object store owns the planned pipeline branches. It validates the path as a working tree and runs `git -C <repository-checkout> rev-parse --path-format=absolute --git-common-dir`. It canonicalizes the result and uses that Git common directory for local Git operations, state, and locking.

The supervisor atomically creates or reads `<git-common-dir>/radical-pipelines/codex/repository.json`, which contains a validated random repository UUID. That UUID is the stable `repository_id` used in thread names and state records; it is distinct from the checkout and common-directory paths. Every main checkout and linked worktree resolves to the same common directory and UUID. In `artifacts-in-fork` mode, `repository_checkout` is a checkout of the pipeline-bearing fork; the upstream remote or a separate upstream checkout never owns the run lease or state.

Per-run state lives at `<git-common-dir>/radical-pipelines/codex/<run-key>/`, where `run-key` hashes `repository_id`, run branch, and artifact folder. The directory contains the controller lease, reservation, recoverable supervisor and monitor state, and rotated diagnostics; none is committed.

State records schema and runtime versions, `CODEX_HOME`, logical-agent/thread/turn mappings, restart generations, effective provider/model/effort selections, monitor registration and occurrence counters, statuses, and timestamps. It excludes prompts, replies, credentials, environment values, artifact contents, and completion claims. Same-directory temporary files, sync, atomic rename, owner-only permissions, and unknown-schema rejection protect state integrity.

The lease records owner, host, process, boot identity, and heartbeat expiry. Exclusive creation admits one controller. Conservative host, boot, process, and expiry checks permit stale recovery; ambiguous or foreign-host ownership requires explicit recovery.

### Existing Claude Code path

The Claude manifest, dedicated adapter, convention section, setup output, spawning mechanism, monitoring behavior, agent profiles, pipeline contracts, and completion predicates remain unchanged and do not depend on the Codex supervisor. The shared pre-mutation hook is a no-op for this adapter, and an already selected mode is reused if the entry flow has one.

## Interfaces and Data Flow

### Supervisor operations

All operations use logical run and job identities rather than phase-completion semantics. Responses carry normalized status, structured errors, and the identifiers required for correlation.

| Operation | Inputs and behavior | Result |
| --- | --- | --- |
| `prepare_run` | Absolute `repository_checkout`; planned run branch and artifact folder; operation (`create`, `resume`, `revise`, or `fork`); workflow mode and target; `CODEX_HOME`; resolved controller and role runtime profiles containing a primary `{provider, model, effort}` and ordered provider-qualified fallbacks; sandbox and health configuration. Derives and validates the Git common directory and `repository_id`, acquires the lease, validates state writes, starts app-server, and preflights authentication, required capabilities, controller switching, every selected runtime, instruction isolation, and child-supervisor suppression. | Reservation handle, `repository_id`, canonical Git common directory, pinned preflight fingerprint, and compatibility result. |
| `open_run` | Reservation handle, absolute run worktree, and expected branch. Verifies that the worktree resolves to the reserved common directory and branch, reconciles named threads and state, cancels any recovered monitor when resuming, and starts a fresh monitor for autonomous mode. | Run handle, reconciled agents, monitor registration or assisted-mode marker, health state, and event cursor. |
| `spawn_agent` | Run handle, logical job identity, canonical role, profile content, absolute worktree, branch, preflighted runtime profile and effective provider/model/effort selection, sandbox, and exact initial prompt. Starts and names a thread before starting its turn. | Logical agent, thread, turn, and generation IDs plus effective runtime and initial status. |
| `send_agent_input` | Logical agent and expected turn state, input, and either follow-up or steering intent. Starts a follow-up turn after completion or steers only the expected active turn. | Delivery acknowledgement or normalized message-failure occurrence and resulting turn identity. |
| `report_health` | A parent-observed signal or the result of a parent-owned recovery action, including subject, signal class, verbatim error, last progress, operation identity, and recovery token. | Occurrence identity, accepted result, next state, and any parent action to execute. |
| `poll_run` | Run handle, cursor, and bounded result limit. | Cursor-based events, terminal messages, agent snapshots, the active monitor registration, all non-terminal health occurrences, owner escalations, and next-poll interval. |
| `stop_agent` | Logical agent and expected active generation. Interrupts an active turn and waits for its terminal event. | Confirmed terminal state or an escalation. |
| `close_run` | Reservation or run handle and outcome (`complete`, `cancelled`, or `aborted`). Cancels the monitor, archives or retains threads according to outcome, flushes state and diagnostics, releases the lease, and stops app-server. | Close status and any unresolved recovery action. |

`prepare_run` keeps the app-server process, lease, configuration fingerprint, and validated runtime set alive until `open_run` or `close_run`; activation therefore repeats only repository-attachment checks. `spawn_agent` accepts the complete runtime profile so a recovery-selected provider/model reaches every restarted generation instead of remaining monitor-only state.

### Operation integration order

Each Codex path performs its existing questions and Git inspection first, then enters this exact order:

| Operation | Read-only planning and owner input | Reservation, mutation, and activation |
| --- | --- | --- |
| Create | Identify the issue; derive branch base, family folder, start ref, base run branch, and artifact folder; draft and obtain approval for `intent.md` in memory; select mode, target, and controller and role runtime profiles. | Call `prepare_run`; create the base branch and worktree; immediately call `open_run`; on activation failure remove that new worktree and branch and call `close_run(aborted)`; after success create the folder, write the approved intent, and commit it. |
| Resume | Enumerate the family; locate the latest run branch; inspect completion and active-phase state; obtain any required rollback confirmation; select mode, target, and controller and role runtime profiles. | Call `prepare_run`; recreate the run worktree if absent; call `open_run(operation: resume)`, which cancels the recovered monitor registration and starts a fresh autonomous monitor or records assisted mode; only after success cancel any adapter-external leftover monitor, revert or discard active-phase work, and delete aborted lane branches when the existing resume rules require it. |
| Revise | Recheck complete and unmerged gates; resolve advisories, revision count and boundaries; derive the revision name, branch, and artifact folder; draft and obtain approval for the revision intent in memory; select mode, target, and controller and role runtime profiles. | Call `prepare_run`; create the revision branch and worktree; immediately call `open_run`; roll back that new branch and worktree on activation failure; after success create the run folder, write the approved intent, and commit it. |
| Fork | Select the parent, cut run, inherited complete phase, and whether to continue after or rerun that phase; locate the cut commit; compute the new version, run branch, and artifact folder; select mode, target, and controller and role runtime profiles. | Call `prepare_run` against any checkout of the pipeline-bearing repository; create the fork branch and worktree at the cut; immediately call `open_run`; remove that new branch and worktree on activation failure; after success dispatch from the selected phase. |

For all four paths, setup or compatibility failure occurs in `prepare_run`, before mutation. New branches contain no new artifacts before `open_run`. Resume performs no cancellation, worktree cleanup, revert, or discard until reservation and activation succeed. Listing remains read-only and requires no run reservation. The Claude Code adapter requests no reservation, so its existing mode prompt and lifecycle calls remain in their current tool-specific path; moving resume discovery ahead of cancellation changes no observable Claude behavior.

### Active run flow

1. The active surface loads the shared skill, resolves one adapter by host key, combines shared conventions with that adapter's section, and runs the adapter's identity-independent completeness checks.
2. The selected operation follows the integration order above. `prepare_run` supplies the run-scoped completeness and reservation gate; `open_run` supplies run activation and monitoring.
3. The parent skill enters the existing autonomous or assisted transition. It calls lifecycle operations only when its topology requires an agent.
4. `spawn_agent` persists the thread mapping after thread naming and before turn start. App-server receives the canonical profile as developer instructions and the exact task as turn input.
5. The supervisor continuously drains app-server output. `poll_run` gives the parent bounded event batches, terminal messages, monitor state, health transitions, retry state, and escalations. The parent relays analyst/researcher questions or results with `send_agent_input` and preserves existing lane and sequencing rules.
6. Autonomous child turns use `approvalPolicy: never` and the configured least-privilege sandbox. The supervisor declines and surfaces unexpected approval requests. Owner approvals remain parent-level pipeline gates.
7. The parent verifies commits and artifact predicates directly. On target completion or interruption it performs existing tracker and close-out behavior, then calls `close_run`, which cancels monitoring and releases ownership.

### Health monitoring state machine

Autonomous `open_run` creates one monitor registration with the existing defaults: a five-minute interval and ten-minute no-output threshold, both owner-tunable. Assisted runs create none. The supervisor observes child output and lifecycle events directly; `send_agent_input` supplies message-delivery state; the parent reports orchestrator-level authentication or network failures through `report_health`.

Every detected issue becomes an occurrence keyed by signal, subject, failed operation, and error fingerprint. Its states are `detected`, `retry-1`, `retry-2`, `recovered`, or `escalated`. The supervisor applies retry 1 and verifies its signal-specific success condition. Failure advances to retry 2; a second failure escalates. Success records `recovered`, resets the retry count, and closes the occurrence. A later recurrence starts at zero, including within the same session. An escalated occurrence receives no further recovery, while the monitor continues watching every other occurrence.

| Signal | Detection and success | Retry 1 | Retry 2 |
| --- | --- | --- | --- |
| No-output stall | An active logical agent has no output beyond the threshold. Any new output or terminal progress succeeds. | Ping the agent with a status request through expected-turn steering. | Interrupt it, increment the deterministic restart generation, and respawn the same job with its profile, prompt, worktree, branch, sandbox, and effective runtime. |
| Message failure | A `send_agent_input` request errors, lacks delivery acknowledgement, or times out. A delivery acknowledgement succeeds. | Verify absence, then resend the exact message once. | Restart the target agent in a new generation with the same job context and deliver the unresolved message. |
| Login / API-key error | App-server or the parent reports an authentication failure. A verified authenticated turn on the replacement runtime succeeds. | Select the first preflighted authenticated provider-qualified fallback, update the agent's effective runtime, and retry the failed turn on it. | Respawn the agent in a new generation on that provider/model and resume the unresolved job. |
| Network failure | App-server or the parent reports a transient network failure for an identified tool or protocol operation. Successful completion of that exact operation succeeds. | Retry the exact tool call once in its owning layer. | Wait one monitor interval, then retry that call once more. |

Supervisor-owned recovery actions execute directly. For a parent-owned tool call, `poll_run` returns the action and opaque recovery token; the parent performs it once and reports the result through `report_health`, preserving the same counter and wait sequence. For an orchestrator authentication occurrence, the Codex adapter applies retry 1 through the active surface's preflighted controller-runtime switch and retry 2 by restarting the controller turn on that fallback and reattaching the run handle; a surface that cannot perform both actions fails `prepare_run`. Every agent restart increments `generation`, retains the canonical role and Git context, and uses the occurrence's effective provider/model/effort selection. Before resuming incomplete work, an agent or controller inspects Git and artifacts; those remain the source of progress.

On escalation, `poll_run` returns the affected agent name or `orchestrator`, the error verbatim, last-known commit/message/artifact progress, and the smallest suggested owner action. The monitor stops recovery for that occurrence and continues watching other signals.

Monitor registration, timing, occurrence states, effective runtimes, and counters are persisted atomically. `poll_run` lists the active registration. After a supervisor restart, the registration is re-armed and elapsed timestamps are evaluated before new work is accepted. `open_run(operation: resume)` cancels the prior registration and creates a fresh one with empty occurrence budgets, matching resume semantics. Every `close_run` outcome cancels it. An unclean process exit leaves the registration in state for restart or resume reconciliation.

### Runtime recovery

App-server thread records may survive a supervisor restart, but an in-flight computation does not survive app-server process loss. After restart, the supervisor correlates named threads and persisted mappings; the parent re-inspects Git and artifacts before deciding whether work is already complete. Incomplete work starts a fresh deterministic generation. A `CODEX_HOME` change invalidates thread continuity and follows the same Git-first recovery path.

Deterministic thread names include `repository_id`, run branch, phase, lane or root scope, role, logical job, and restart generation. This supports discovery without making thread state authoritative.

## Key Decisions

### Decision: Retain one tool-neutral pipeline model

- **Choice:** Keep branch grammar, pipeline families, run layout, artifact contracts, roles, phases, approvals, predicates, and completion state in the existing shared skill and Git artifacts.
- **Alternatives:** Fork the skill or translate branches and artifacts when work changes tools.
- **Trade-offs:** Tool adapters must conform to existing contracts, but cross-tool continuation requires no migration and Claude Code behavior remains isolated from Codex mechanics.
- **Traces to:** Requirements 2–5; acceptance criteria 2–6 and 9.

### Decision: Use an MCP supervisor over Codex app-server

- **Choice:** Put Codex agent lifecycle and health mechanics in a bundled MCP supervisor using stable app-server APIs.
- **Alternatives:** Native Codex subagents with in-band polling; a `codex exec` process runner; direct app-server JSONL manipulation in prose.
- **Trade-offs:** The supervisor adds a runtime process and state, but supplies explicit worktree and runtime controls, steering, approvals, persistent thread discovery, event correlation, health continuity, and one cross-surface interface. Native subagents lack verified per-spawn controls; `codex exec` has weaker steering and approval handling; direct prose control lacks a durable process and ownership contract.
- **Traces to:** Requirements 1 and 2; acceptance criteria 1–4 and 7.

### Decision: Reserve before mutation and activate after worktree creation

- **Choice:** Split Codex startup into adapter completeness, `prepare_run`, which completes run-scoped checks and reserves the planned run before mutation, and `open_run`, which attaches the created or existing run worktree before artifact or cleanup mutations.
- **Alternatives:** Open after workflow-mode dispatch and accept prior pipeline writes; create the branch first and run one combined preflight afterward.
- **Trade-offs:** Operation planning and mode selection occur earlier on the Codex path, and failed activation needs empty-branch rollback. Missing setup cannot leave a pipeline branch, worktree, artifact, revert, or cleanup behind, while the existing execution topology remains intact.
- **Traces to:** Requirement 5; acceptance criteria 4, 8, and 9.

### Decision: Derive repository scope from an absolute checkout

- **Choice:** Accept an absolute checkout path, derive its canonical Git common directory, and persist a repository UUID there as the stable identity. Validate every activated worktree against both.
- **Alternatives:** Let callers supply an undefined repository identity; key state by the plugin working directory, remote URL, or individual worktree path.
- **Trade-offs:** First use writes a small machine-local identity record, but main checkouts, linked worktrees, moved repositories, and artifact-bearing fork checkouts share one unambiguous lease and state scope.
- **Traces to:** Requirements 2, 3, and 5; acceptance criteria 2, 4, 5, and 8.

### Decision: Dispatch convention adapters without a tool table

- **Choice:** Resolve `reference/conventions/<adapter-key>.md` from the host-provided key and let each dedicated adapter own detection, completeness, setup, lifecycle, and health mappings.
- **Alternatives:** Add supported tool names to generic load/setup tables; place lifecycle recognition in the shared skill; maintain separate complete skills.
- **Trade-offs:** Each host integration must supply a stable adapter key and a complete dedicated file. The generic reading path stays tool-neutral, adding a tool requires no shared dispatch edit, and existing Claude Code mappings remain isolated.
- **Traces to:** Requirements 4 and 5; acceptance criteria 5, 6, 8, and 9.

### Decision: Preserve the four-signal health contract

- **Choice:** Normalize stalls, message failures, authentication failures, and network failures into per-occurrence two-retry state machines, with exact ordered actions, success reset, generation changes, provider/model fallback, and owner escalation.
- **Alternatives:** Use generic process restarts; share one run-wide retry budget; omit parent-reported failures or provider fallback.
- **Trade-offs:** The supervisor and parent need a health-report handshake and persisted occurrence state. Autonomous Codex runs retain the existing recovery budget, escalation payload, and monitor lifecycle instead of stopping earlier.
- **Traces to:** Requirement 2; acceptance criteria 2 and 7.

### Decision: Keep configuration shared and adapter-selective

- **Choice:** Store one shared section and separate Claude Code and Codex sections in `.rp.md`; load shared plus the active adapter section and modify only that section during setup.
- **Alternatives:** Separate complete convention files per tool; replace Claude conventions when Codex is installed.
- **Trade-offs:** Adapter schemas must be independently complete, while shared policy has one source and either tool can coexist without overwriting the other.
- **Traces to:** Requirements 3–5; acceptance criteria 5, 6, 8, and 9.

### Decision: Inject canonical profiles at thread creation

- **Choice:** Supply the selected root-level agent profile as app-server developer instructions and the exact conventions and task as first-turn input; preflight repository-guidance suppression.
- **Alternatives:** Generate Codex custom-agent files; let child threads discover repository guidance in addition to their profiles.
- **Trade-offs:** Runtime injection requires a behavioral preflight, but avoids duplicated agent definitions and preserves the same role and instruction boundary across tools.
- **Traces to:** Requirement 2; acceptance criteria 2, 3, 5, and 9.

### Decision: Keep assisted execution in the active session

- **Choice:** Use the existing owner-facing session for assisted phases and use the supervisor only for prerequisite validation and ownership; assisted mode starts no child threads or health monitor.
- **Alternatives:** Model assisted phases as background child agents or omit unsupported interactions on some surfaces.
- **Trade-offs:** Assisted phases retain direct owner interaction while their artifacts and gates remain identical to Claude Code; the active session must stay available until the phase reaches its approval boundary.
- **Traces to:** Requirements 1 and 2; acceptance criteria 1, 3, and 7.

### Decision: Treat Git as authoritative and runtime state as recoverable metadata

- **Choice:** Store only repository identity, thread mappings, lifecycle and health state, timestamps, diagnostics, and a single-controller lease under the Git common directory. Reconcile recovery against Git and artifacts.
- **Alternatives:** Commit Codex thread state; infer phase completion from app-server; keep no restart state or lease.
- **Trade-offs:** Lost thread history may require a fresh agent generation, but runtime loss cannot corrupt pipeline state or create false completion, and all worktrees share one ownership boundary.
- **Traces to:** Requirements 2, 3, and 5; acceptance criteria 2, 4, 5, 8, and 9.

### Decision: Ship a dependency-free Node supervisor

- **Choice:** Implement the supervisor with Node standard-library APIs and require Node 22 or a newer supported LTS release.
- **Alternatives:** Use a TypeScript or Python Codex SDK; ship platform-specific native binaries or bundled runtimes.
- **Trade-offs:** Node becomes a setup prerequisite and cross-platform launch behavior needs release validation. The plugin requires no package installation, duplicate Codex runtime, per-platform binary selection, or SDK compatibility layer.
- **Traces to:** Requirements 1 and 5; acceptance criteria 1, 7, and 8.

### Decision: Fail closed on compatibility and authority

- **Choice:** Establish a tested minimum Codex version, behaviorally preflight required stable methods and isolation, reject unknown state schemas, and require an unambiguous run lease before visible pipeline work.
- **Alternatives:** Rely on version strings alone; continue with partial capabilities; recover locks optimistically.
- **Trade-offs:** Some environments stop for setup or explicit recovery, but no run starts with weakened controls, incompatible schemas, recursive supervision, or concurrent owners.
- **Traces to:** Requirements 1, 2, and 5; acceptance criteria 1, 2, 7, and 8.

### Decision: Distribute both tool manifests from one marketplace

- **Choice:** Add the required Codex manifest beside the existing Claude manifest and retain one marketplace entry for the shared distribution root.
- **Alternatives:** Publish a second marketplace; replace the existing manifest; rely indefinitely on legacy Codex compatibility with the Claude manifest.
- **Trade-offs:** Release checks must synchronize both manifests, while users install one shared package and existing Claude installations retain their current path.
- **Traces to:** Requirements 4 and 5; acceptance criteria 6 and 9.

## Dependencies

- Git and the repository's existing branch, worktree, artifact, tracker, and commit conventions.
- The existing Radical Pipelines skill, canonical agent profiles, setup flow, four-signal health contract, approval gates, and completion predicates.
- A Codex release at or above the oldest version that passes the required stable app-server lifecycle matrix. Release validation establishes and encodes that floor.
- Codex app-server with stdio JSONL, provider/model discovery and selection, thread and turn lifecycle, steering, interruption, events, and approval requests.
- Node 22 or a newer supported LTS release available to the plugin MCP launcher.
- A writable Git common directory with atomic same-directory rename and owner-only permission support.

There is no Codex SDK, generated custom-agent configuration, package-install step, database, or service dependency.

Release verification covers unit and integration behavior for JSONL correlation, malformed input, all eight operations, two-stage reservation and rollback, checkout/common-directory validation, repository UUID creation, main and linked worktrees, artifact-in-fork ownership, capability preflight, state and schema handling, lock recovery, every health transition and reset, parent health acknowledgements, provider/model fallback propagation, monitor start/list/cancel/resume, redaction and rotation, `CODEX_HOME` changes, instruction isolation, and recursion suppression. A real-app-server matrix covers the encoded minimum and current Codex versions. Plugin installation and relative launch behavior are exercised on desktop, CLI, and IDE across supported macOS, Linux, and Windows environments. End-to-end tests run autonomous and assisted flows, all pipeline operations, incomplete-setup failures before mutation, and bidirectional Claude Code/Codex continuation. Tests assert executable behavior rather than skill or profile wording.

## Failure Modes and Observability

| Failure | Behavior | Surface signal |
| --- | --- | --- |
| Missing active convention, Node or Codex executable/version, MCP launch, or setup action | Stop in adapter completeness before run planning and offer the supported setup path. | Missing item, failed check, detected version, and corrective action. |
| Missing authentication, app-server capability, primary or fallback runtime, state permission, instruction isolation, or recursion suppression | Reject `prepare_run` before pipeline mutation and offer the supported setup path. | Missing item, failed check, affected role, and corrective action. |
| A live controller owns the planned run | Reject `prepare_run`; preserve the existing lease and state. | Owner, host, process, heartbeat age, and safe next action. |
| Lease liveness is ambiguous or owned by another host | Require explicit recovery before reservation. | Lease evidence and recovery requirement. |
| State or repository identity is malformed, has an unknown schema, or cannot be written atomically | Reject preparation without altering pipeline state. | State path, schema/runtime version, integrity result, and corrective action. |
| Activated worktree resolves to another common directory or branch | Reject `open_run`, remove only a branch/worktree created for this attempt, and release the reservation. Existing run state remains untouched. | Expected and actual checkout, common directory, branch, and cleanup result. |
| App-server exits, violates framing, or loses the protocol stream | Restart it, reconcile named threads and mappings, inspect Git, and start a fresh generation only for an incomplete job. Health occurrences continue with their persisted counters. | Process/request/thread/turn IDs, generation, reconciliation result, and health transition. |
| No-output stall | Apply status ping, then restart generation, then escalate for that occurrence. | Last output time, threshold, attempts, generation, and escalation payload. |
| Message failure | Resend the exact message, then restart the target generation and deliver it, then escalate. | Delivery state, message operation ID, attempts, generation, and escalation payload. |
| Login / API-key failure | Switch to a preflighted authenticated provider/model, then respawn on it, then escalate. | Provider/model transition, authentication result, attempts, generation, and escalation payload. |
| Network failure | Retry the exact call, then wait one interval and retry, then escalate. | Operation ID, owning layer, wait deadline, attempts, and escalation payload. |
| A health retry succeeds | Close the occurrence and reset its budget; a recurrence starts at zero. | Recovery action, verification evidence, and reset timestamp. |
| Context is lost or `CODEX_HOME` changes | Invalidate thread continuity, inspect Git and artifacts, and start fresh generations only for incomplete jobs. | Old/new runtime identity, reconciliation result, and new generation IDs. |
| Unexpected child approval request | Decline and escalate without broadening permissions. | Request type, agent and turn IDs, configured policy, and parent action required. |
| Policy, sandbox, compatibility, lock, state-integrity, or recursive-supervisor failure | Stop or escalate immediately. | Stable error class and actionable diagnostic. |
| App-server adds unknown fields or events | Retain or ignore them safely while known lifecycle correlation continues; fail preflight if a required behavior disappears. | Compatibility warning or failed required-capability check. |

`poll_run` returns bounded snapshots and cursor-based events so callers can monitor long runs without replaying unbounded history. Structured diagnostics record supervisor and app-server lifecycle, repository and lock state, request/thread/turn IDs, monitor registration, health occurrences and resets, runtime selection, versions, timestamps, sanitized bounded errors, and escalation fields. Diagnostics rotate, use stderr for human-readable logs, reserve MCP stdout for JSON-RPC, and omit prompts, reasoning, environment values, credentials, artifact contents, and full agent output.

## Risks and Open Questions

- **Minimum Codex version:** The oldest release that passes the required lifecycle matrix is not yet known. Release validation must establish and encode it before shipping.
- **Cross-surface launch behavior:** Plugin-relative MCP working directories and child lifecycle-MCP suppression must pass desktop, CLI, IDE, OS, and worktree tests before release.
- **Instruction isolation:** Suppressing repository guidance for child threads has been demonstrated but is not an explicit app-server contract. Behavioral preflight must fail setup if the child receives extra instruction sources.
- **Protocol drift:** App-server exposes no protocol-version negotiation. A tested floor, behavioral preflight, tolerant parsing, and actionable failures contain but cannot remove this risk.
- **Thread continuity:** Thread history belongs to one `CODEX_HOME`, and app-server process loss cannot resume an in-flight computation. Git-first reconciliation and fresh generations preserve correctness at the cost of repeated agent work.
- **Monitor process lifetime:** Each supported surface must keep the plugin MCP process alive for an active autonomous run. A surface that stops it while the parent remains active fails the release matrix; persisted timing and occurrence state cover process crashes and restarts.
- **Lease limits:** File leases cannot rule out split brain on unreliable shared filesystems. Ambiguous foreign-host ownership remains an explicit recovery case.
- **Managed environments:** Node absence, MCP restrictions, or policies that prevent Git-directory writes make Codex support unavailable until setup resolves them; `prepare_run` prevents partial execution.
