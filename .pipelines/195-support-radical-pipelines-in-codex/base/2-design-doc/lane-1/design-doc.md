# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension when they operate on a local repository. Codex will expose the same autonomous and assisted workflows as Claude Code without introducing a second pipeline model: branches, run families, worktrees, phases, lanes, artifacts, approvals, commits, tracker synchronization, completion predicates, and close-out remain tool-neutral and Git-backed.

The existing skill remains the orchestrator. A Codex convention layer translates its agent lifecycle and health operations to a bundled MCP supervisor, which controls Codex app-server through newline-delimited JSON over stdio. The supervisor supplies consistent working-directory, model, reasoning, sandbox, steering, interruption, recovery, and event behavior across all in-scope Codex surfaces. It owns runtime state only; the skill continues to own pipeline decisions and treats committed artifacts and Git state as authoritative.

The design adds no Codex-only workflow, changes no shared branch or artifact contract, and excludes Codex surfaces without direct local-repository access.

## Approach

The project keeps one installed Radical Pipelines skill and one project convention file. The convention file contains `Shared conventions`, `Claude Code conventions`, and `Codex conventions`. Convention loading always applies the shared section plus the section for the active tool. Setup adds or repairs only the selected tool section, so adding Codex support preserves existing shared and Claude Code configuration.

The distribution root gains a Codex plugin manifest beside the Claude manifest. The existing marketplace distributes both manifests and the shared skill. The Codex manifest registers a dependency-free Node MCP supervisor. `reference/conventions/codex.md` defines how the generic orchestration vocabulary maps to the supervisor's six lifecycle operations.

Every Codex workflow passes the existing convention-completeness gate before creating branches, worktrees, or artifacts. The Codex gate also opens the supervisor, validates the runtime capabilities needed by the selected workflow, and acquires exclusive control of the run. Failure reports the missing convention or prerequisite and offers the existing setup path without leaving partial pipeline state.

For autonomous execution, the parent skill preserves the existing phase topology and uses the supervisor to start agents in their assigned worktrees. Each agent receives its canonical root-level profile as app-server developer instructions and the exact conventions block plus task as its first turn. The parent remains responsible for issue and tracker operations, analyst/researcher relays, lane isolation, ordering writers that share a worktree, owner approval gates, Git verification, phase-completion predicates, and run close-out.

For assisted execution, the active Codex session performs the phase interaction and owner approval directly, as the existing assisted workflow requires; it creates no child threads. The supervisor still supplies the completeness and single-controller gate. The resulting research, final artifact, approval marker, commit, tracker state, and close-out use the same contracts and predicates as autonomous and Claude Code execution.

When a Codex surface lacks a native control, the convention layer uses the supervisor operation that produces the required outcome. Surface-specific UI controls are therefore optional; model/worktree selection, health monitoring, steering, interruption, and recovery are never removed from the workflow.

### Acceptance coverage

| Criterion | Design mechanism |
| --- | --- |
| 1. Surface coverage | The plugin-scoped MCP supervisor and tool convention expose one lifecycle interface in desktop, CLI, and IDE; shared contracts keep behavior identical. |
| 2. Autonomous workflow | The existing parent topology and predicates remain intact while the supervisor enforces each child's profile, worktree, model, effort, sandbox, lifecycle, and health state. |
| 3. Assisted workflow | The active session retains the existing assisted research, artifact, approval, commit, tracker, and close-out path without child threads. |
| 4. Pipeline operations | Listing, resumption, revision, and forking continue to use existing branch, version, worktree, lane, artifact, and cleanup rules; the supervisor does not implement them. |
| 5. Cross-tool continuation | Git branches and artifacts remain the sole pipeline state, so either tool recognizes and advances work from the other without migration. |
| 6. Configuration coexistence | The loader combines shared conventions with one tool section; setup modifies only the selected section, and both manifests distribute the same skill. |
| 7. Surface capability differences | Missing native controls map to supervisor operations rather than weakened or skipped outcomes. |
| 8. Incomplete setup | Convention and behavioral preflights fail through the existing completeness gate before visible pipeline mutations. |
| 9. No Claude Code regression | Claude Code keeps its manifest, convention section, orchestration path, artifacts, and predicates; Codex code is selected only for Codex. |

## Components

### Shared orchestration skill

The skill continues to own invocation, phase topology, agent roles, branch grammar, artifact paths and formats, phase predicates, approvals, pipeline operations, tracker synchronization, commits, and close-out. Its convention loader selects `Shared conventions` plus the active tool section. Its setup path recognizes Codex and delegates Codex-specific lifecycle and health actions through `reference/conventions/codex.md`.

### Project conventions

One `.rp.md` stores the shared, Claude Code, and Codex sections. Shared project policy has one source; each tool's spawning, model, reasoning, sandbox, and monitoring details remain isolated in its section. Convention completeness is evaluated for the active tool and selected workflow.

### Plugin packaging

`.codex-plugin/plugin.json` declares the Codex plugin beside the existing Claude manifest. `.claude-plugin/marketplace.json` remains the single marketplace catalog and points to the distribution root containing both manifests and the shared skill. `.mcp.json` launches the supervisor with `node`, `./codex/supervisor.mjs`, plugin-root `cwd`, bounded startup and tool timeouts, and parallel calls disabled.

Version synchronization, manifest drift checks, changeset relevance, README, package metadata, and contributor guidance cover the Codex manifest and runtime paths while retaining their Claude coverage.

### Codex convention adapter

`reference/conventions/codex.md` maps the skill's lifecycle vocabulary to `open_run`, `spawn_agent`, `send_agent_input`, `poll_run`, `stop_agent`, and `close_run`. It contains tool-specific instructions only; canonical agent behavior stays in root-level agent profiles.

### MCP supervisor

The dependency-free Node process is a transport and lifecycle adapter. It:

- maintains a true stdio pipe to one child app-server process;
- correlates interleaved responses and notifications by request, thread, and turn IDs;
- injects canonical profiles and exact initial prompts;
- enforces worktree, branch context, model, reasoning effort, approval policy, and sandbox inputs;
- normalizes lifecycle events, health, retries, terminal output, and escalations;
- manages deterministic thread names, restart generations, runtime state, and the run lease;
- suppresses the lifecycle MCP server in child configuration to prevent recursion.

It never reads pipeline artifacts to decide phase completion and never reports a phase complete on its own.

### Codex app-server

App-server provides stable thread start, naming, discovery, reading, resumption, archival, turn start, steering, interruption, model discovery, lifecycle events, and approval requests. The supervisor tolerates unknown fields and events but requires all behaviors used by the adapter to pass preflight.

### Runtime state and diagnostics

Machine-local state lives at `<git-common-dir>/radical-pipelines/codex/<run-key>/`, shared by the repository's worktrees. `run-key` hashes the run branch and artifact folder. The directory contains the controller lease, recoverable supervisor state, and rotated diagnostics; none is committed.

State records schema and runtime versions, `CODEX_HOME`, logical-agent/thread/turn mappings, restart generations, statuses, retry counters, and timestamps. It excludes prompts, replies, credentials, environment values, artifact contents, and completion claims. Same-directory temporary files, sync, atomic rename, owner-only permissions, and unknown-schema rejection protect state integrity.

The lease records owner, host, process, boot identity, and heartbeat expiry. Exclusive creation admits one controller. Conservative host, boot, process, and expiry checks permit stale recovery; ambiguous or foreign-host ownership requires explicit recovery.

### Existing Claude Code path

The Claude manifest, Claude convention section, spawning mechanism, monitoring behavior, agent profiles, pipeline contracts, and completion predicates remain unchanged and do not depend on the Codex supervisor.

## Interfaces and Data Flow

### Supervisor operations

All operations use logical run and job identities rather than pipeline semantics. Responses carry normalized status, structured errors, and the identifiers required for correlation.

| Operation | Inputs and behavior | Result |
| --- | --- | --- |
| `open_run` | Repository identity, run branch, artifact folder, `CODEX_HOME`, and required model/effort configuration. Acquires the lease, validates state writes, initializes app-server, performs capability and instruction-isolation preflights, discovers prior named threads, reconciles state, and starts health timers. | Run handle, compatibility result, reconciled agents, health state, and event cursor. |
| `spawn_agent` | Run handle, logical job identity, canonical role, profile content, worktree, branch, model, reasoning effort, sandbox, and exact initial prompt. Starts and names a thread before starting its turn. | Logical agent, thread, turn, and generation IDs plus initial status. |
| `send_agent_input` | Logical agent and expected turn state, input, and either follow-up or steering intent. Starts a follow-up turn after completion or steers only the expected active turn. | Delivery status and resulting turn identity. |
| `poll_run` | Run handle, cursor, and bounded result limit. | Cursor-based normalized events, terminal messages, agent and health snapshots, escalations, and next-poll interval. |
| `stop_agent` | Logical agent and expected active generation. Interrupts an active turn and waits for its terminal event. | Confirmed terminal state or an escalation. |
| `close_run` | Run handle and pipeline outcome. Archives or retains threads according to the outcome, flushes state and diagnostics, releases the lease, and stops app-server. | Close status and any unresolved recovery action. |

### Runtime flow

1. The active surface loads the shared skill and selects shared plus Codex conventions.
2. The completeness gate verifies project conventions, Node and Codex versions, authentication, required stable app-server behaviors, requested models and efforts, profile-only instruction loading, child supervisor suppression, writable atomic state, and lease availability.
3. `open_run` reconciles named app-server threads with runtime state. For a new pipeline, this finishes before any branch, worktree, or artifact mutation.
4. The parent skill inspects Git and artifacts, chooses the existing workflow transition, and calls lifecycle operations only when its topology requires an agent.
5. `spawn_agent` persists the thread mapping after thread naming and before turn start. App-server receives the canonical profile as developer instructions and the exact task as turn input.
6. The supervisor continuously drains app-server output. `poll_run` gives the parent bounded event batches, terminal messages, health transitions, retry state, and escalation data. The parent relays analyst/researcher questions or results with `send_agent_input` and preserves existing lane and sequencing rules.
7. Autonomous child turns use `approvalPolicy: never` and the configured least-privilege sandbox. The supervisor declines and surfaces unexpected approval requests. Owner approvals remain parent-level pipeline gates.
8. The parent verifies commits and artifact predicates directly. On phase or run completion it performs existing tracker and close-out behavior, then calls `close_run`.

### Recovery flow

App-server thread records may survive a supervisor restart, but an in-flight computation does not survive app-server process loss. After restart, the supervisor correlates named threads and persisted mappings; the parent re-inspects Git and artifacts before deciding whether work is already complete. Incomplete work starts a fresh deterministic generation. A `CODEX_HOME` change invalidates thread continuity and follows the same Git-first recovery path.

Deterministic thread names include repository identity, run branch, phase, lane or root scope, role, logical job, and restart generation. This supports discovery without making thread state authoritative.

## Key Decisions

### Decision: Retain one tool-neutral pipeline model

- **Choice:** Keep branch grammar, pipeline families, run layout, artifact contracts, roles, phases, approvals, predicates, and completion state in the existing shared skill and Git artifacts.
- **Alternatives:** Fork the skill or translate branches and artifacts when work changes tools.
- **Trade-offs:** Tool adapters must conform to existing contracts, but cross-tool continuation requires no migration and Claude Code behavior remains isolated from Codex mechanics.
- **Traces to:** Requirements 2–5; acceptance criteria 2–6 and 9.

### Decision: Use an MCP supervisor over Codex app-server

- **Choice:** Put Codex agent lifecycle and health mechanics in a bundled MCP supervisor using stable app-server APIs.
- **Alternatives:** Native Codex subagents with in-band polling; a `codex exec` process runner; direct app-server JSONL manipulation in prose.
- **Trade-offs:** The supervisor adds a runtime process and state, but supplies explicit worktree/model controls, steering, approvals, persistent thread discovery, event correlation, health continuity, and one cross-surface interface. Native subagents lack verified per-spawn controls; `codex exec` has weaker steering and approval handling; direct prose control lacks a durable process and ownership contract.
- **Traces to:** Requirements 1 and 2; acceptance criteria 1–4 and 7.

### Decision: Keep configuration shared and tool-selective

- **Choice:** Store one shared section and separate Claude Code and Codex sections in `.rp.md`; load shared plus the active tool section and modify only that tool section during setup.
- **Alternatives:** Separate complete convention files per tool; replace Claude conventions when Codex is installed.
- **Trade-offs:** The loader must understand section selection, while shared policy has one source and either tool can coexist without overwriting the other.
- **Traces to:** Requirements 3–5; acceptance criteria 5, 6, 8, and 9.

### Decision: Inject canonical profiles at thread creation

- **Choice:** Supply the selected root-level agent profile as app-server developer instructions and the exact conventions and task as first-turn input; preflight repository-guidance suppression.
- **Alternatives:** Generate Codex custom-agent files; let child threads discover repository guidance in addition to their profiles.
- **Trade-offs:** Runtime injection requires a behavioral preflight, but avoids duplicated agent definitions and preserves the same role and instruction boundary across tools.
- **Traces to:** Requirement 2; acceptance criteria 2, 3, 5, and 9.

### Decision: Keep assisted execution in the active session

- **Choice:** Use the existing owner-facing session for assisted phases and use the supervisor only for completeness and ownership; assisted mode starts no child threads.
- **Alternatives:** Model assisted phases as background child agents or omit unsupported interactions on some surfaces.
- **Trade-offs:** Assisted phases retain direct owner interaction while their artifacts and gates remain identical to Claude Code; the active session must stay available until the phase reaches its approval boundary.
- **Traces to:** Requirements 1 and 2; acceptance criteria 1, 3, and 7.

### Decision: Treat Git as authoritative and runtime state as recoverable metadata

- **Choice:** Store only thread mappings, lifecycle state, retries, timestamps, diagnostics, and a single-controller lease under the Git common directory. Reconcile recovery against Git and artifacts.
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
- The existing Radical Pipelines skill, canonical agent profiles, setup flow, health budget, approval gates, and completion predicates.
- A Codex release at or above the oldest version that passes the required stable app-server lifecycle matrix. Release validation establishes and encodes that floor.
- Codex app-server with stdio JSONL, model discovery, thread and turn lifecycle, steering, interruption, events, and approval requests.
- Node 22 or a newer supported LTS release available to the plugin MCP launcher.
- A writable Git common directory with atomic same-directory rename and owner-only permission support.

There is no Codex SDK, generated custom-agent configuration, package-install step, database, or service dependency.

Release verification covers unit and integration behavior for JSONL correlation, malformed input, all six operations, capability preflight, state and schema handling, lock recovery, retries, redaction and rotation, worktrees, `CODEX_HOME` changes, instruction isolation, and recursion suppression. A real-app-server matrix covers the encoded minimum and current Codex versions. Plugin installation and relative launch behavior are exercised on desktop, CLI, and IDE across supported macOS, Linux, and Windows environments. End-to-end tests run autonomous and assisted flows, pipeline operations, and bidirectional Claude Code/Codex continuation. Tests assert executable behavior rather than skill or profile wording.

## Failure Modes and Observability

| Failure | Behavior | Surface signal |
| --- | --- | --- |
| Missing conventions, Node, Codex capability, authentication, model, effort, state permissions, instruction isolation, or recursion suppression | Stop at the completeness gate before pipeline mutation and offer the supported setup path. | Missing item, failed check, detected versions, and corrective action. |
| A live controller owns the run | Reject `open_run`; preserve the existing lease and state. | Owner, host, process, heartbeat age, and safe next action. |
| Lease liveness is ambiguous or owned by another host | Require explicit recovery; never take ownership automatically. | Lease evidence and recovery requirement. |
| State is malformed, has an unknown schema, or cannot be written atomically | Fail closed without altering pipeline state. | State path, schema/runtime version, integrity result, and corrective action. |
| App-server exits, violates framing, or loses the protocol stream | Restart within the existing health budget, reconcile named threads and mappings, then inspect Git before starting a fresh generation. | Process/request/thread/turn IDs, retry count, health transition, and escalation. |
| Connection, stream, overload, or other classified transient turn failure | Retry within the configured wait; verify delivery before resending. | Structured failure class, attempt count, elapsed budget, and terminal status. |
| Agent stops making progress | Steer once, then interrupt and respawn a new generation within the health budget. | Last progress time, steering and interruption events, generation, and escalation. |
| Context is lost or `CODEX_HOME` changes | Invalidate thread continuity, inspect Git and artifacts, and start fresh generations only for incomplete jobs. | Old/new runtime identity, reconciliation result, and new generation IDs. |
| Unexpected child approval request | Decline and escalate without broadening permissions. | Request type, agent and turn IDs, configured policy, and parent action required. |
| Policy, sandbox, compatibility, lock, state-integrity, or recursive-supervisor failure | Stop or escalate immediately; no permissive retry. | Stable error class and actionable diagnostic. |
| App-server adds unknown fields or events | Ignore or retain them safely while known lifecycle correlation continues; fail preflight if a required behavior disappears. | Compatibility warning or failed required-capability check. |

`poll_run` returns bounded snapshots and cursor-based events so callers can monitor long runs without replaying unbounded history. Structured diagnostics record supervisor and app-server lifecycle, lock and state changes, request/thread/turn IDs, health progress, retries, versions, timestamps, sanitized bounded errors, and escalation fields. Diagnostics rotate, use stderr for human-readable logs, reserve MCP stdout for JSON-RPC, and omit prompts, reasoning, environment values, credentials, artifact contents, and full agent output.

## Risks and Open Questions

- **Minimum Codex version:** The oldest release that passes the required lifecycle matrix is not yet known. Release validation must establish and encode it before shipping.
- **Cross-surface launch behavior:** Plugin-relative MCP working directories and child lifecycle-MCP suppression must pass desktop, CLI, IDE, OS, and worktree tests before release.
- **Instruction isolation:** Suppressing repository guidance for child threads has been demonstrated but is not an explicit app-server contract. Behavioral preflight must continue to fail setup if the child receives extra instruction sources.
- **Protocol drift:** App-server exposes no protocol-version negotiation. A tested floor, behavioral preflight, tolerant parsing, and actionable failures contain but cannot remove this risk.
- **Thread continuity:** Thread history belongs to one `CODEX_HOME`, and app-server process loss cannot resume an in-flight computation. Git-first reconciliation and fresh generations preserve correctness at the cost of repeated agent work.
- **Lease limits:** File leases cannot rule out split brain on unreliable shared filesystems. Ambiguous foreign-host ownership remains an explicit recovery case.
- **Managed environments:** Node absence, MCP restrictions, or policies that prevent Git-directory writes make autonomous Codex support unavailable until setup resolves them; the completeness gate prevents partial execution.
