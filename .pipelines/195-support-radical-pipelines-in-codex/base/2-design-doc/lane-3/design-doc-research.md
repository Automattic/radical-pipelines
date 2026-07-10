# Design Research: Codex support

## Research

### Existing architecture and Codex extension points

Radical Pipelines already separates durable pipeline behavior from tool adapters. The shared skill defines workflows, branch/worktree topology, artifacts, approval and completion predicates, while `Team spawning`, `Agent models`, and `Health monitoring` are conventions supplied by the active tool. Pipeline state is reconstructed from Git and committed artifacts rather than runtime sessions. Sources: `skills/radical-pipelines/SKILL.md:17-45`, `skills/radical-pipelines/reference/conventions/load.md:5-18`, `skills/radical-pipelines/reference/autonomous-workflow.md:31-70`, `skills/radical-pipelines/reference/assisted-workflow.md:1-28`, `skills/radical-pipelines/reference/pipeline-versioning.md:49-64`.

Distribution currently consists of the canonical Agent Skills-compatible skill and root agent profiles, exposed through a Claude Code plugin; no npm package is published. Codex supports the same skill format and plugins installed through marketplaces across the desktop app, CLI, and IDE extension. A parallel Codex manifest can therefore expose the canonical skill without changing the Claude plugin. Sources: `README.md:63-102`, `package.json:2-17`, [Codex skills](https://developers.openai.com/codex/skills/), [Codex plugins](https://developers.openai.com/codex/plugins/), [Build Codex plugins](https://developers.openai.com/codex/build-plugins/).

Codex subagents are available across all three local surfaces and support persistent agents, messaging, waiting, and custom agent configuration. Desktop scheduled tasks are not cross-surface and cannot supply the parity health monitor. Sources: [Codex subagents](https://developers.openai.com/codex/subagents/), [Codex configuration reference](https://developers.openai.com/codex/config-reference/), [Codex scheduled tasks](https://developers.openai.com/codex/app/automations/).

Installed Codex plugins retain root sibling directories outside `skills/`. The installed Browser plugin's skill loads a root `scripts/` sibling, establishing that Radical Pipelines can keep `agents/*.md` at the plugin root and inject a selected profile into a child's initial prompt. This preserves the repository's single canonical profile tree and the rule that a child reads only its own profile and initial prompt. Sources: `README.md:95-102`, `AGENTS.md:14`, [Browser plugin skill](https://developers.openai.com/codex/plugins/), local installed Browser plugin `skills/control-in-app-browser/SKILL.md:23-35` and `.codex-plugin/plugin.json`.

The exposed Codex `spawn_agent` interface does not accept model, reasoning, sandbox, working directory, or custom-agent type. Project `.codex/agents/*.toml` custom agents provide exact model, reasoning, and sandbox settings across local Codex clients, but official documentation does not guarantee exact named-agent selection through the exposed spawn call. Custom agents have no working-directory field. Sources: current `spawn_agent` tool schema, [Codex subagents](https://developers.openai.com/codex/subagents/), [Codex configuration reference](https://developers.openai.com/codex/config-reference/), `skills/radical-pipelines/reference/autonomous-workflow.md:63-68`.

Worktree isolation can remain exact without child startup-CWD support: the orchestrator creates each raw worktree; the initial prompt supplies absolute `Worktree path` and `Branch name`; the child verifies the branch before its first write and targets every operation through the explicit worktree path. Sources: `skills/radical-pipelines/reference/conventions/passing.md:3-18`, `skills/radical-pipelines/reference/autonomous-workflow.md:35-40`, `agents/*.md` branch-verification rules.

`codex exec` is the current deterministic agent launch boundary: it accepts an exact model, configuration overrides, sandbox, and initial worktree; emits JSONL lifecycle events and a thread ID; supports schema-constrained final output; and resumes cleanly completed sessions. A supervised process-per-agent-turn design can route persistent Q&A by resuming the same thread. Process exit status alone is insufficient because embedded error events may accompany exit zero. Sources: [Codex non-interactive mode](https://developers.openai.com/codex/non-interactive-mode/), [Codex CLI reference](https://developers.openai.com/codex/cli/reference/), local `codex-cli 0.144.0-alpha.4` read-only JSONL experiment.

The present completeness check recognizes convention names without selecting the active tool's section. A Codex run could therefore mistake Claude-specific spawning and monitoring instructions for complete Codex setup. Codex support requires active-tool-aware loading and setup. Sources: `skills/radical-pipelines/reference/conventions/load.md:1-26`, `skills/radical-pipelines/reference/conventions/setup.md:15-29`.

The existing `.rp.md` structure already separates shared and Claude-specific sections. Keeping Codex beside Claude in that file avoids duplicating shared conventions and preserves the existing local-override merge. A prose router to separate `.rp.claude.md` and `.rp.codex.md` files would require new multi-file loading and either duplicate or further split shared content. Sources: `.rp.md:1-113`, `README.md:104-118`, `skills/radical-pipelines/reference/conventions/load.md:28-34`.

### Component placement and packaging

Codex plugins support root-relative skill directories, and skills support executable scripts when deterministic behavior is required. Codex copies installed plugins into its cache, so a supervisor must resolve profiles and schemas relative to its own installed location rather than repository CWD. A skill script is a smaller fit than an MCP server: it avoids an added server lifecycle, approval surface, and SDK dependency. Sources: [Build Codex plugins](https://learn.chatgpt.com/docs/build-plugins#plugin-structure), [Build Codex skills](https://learn.chatgpt.com/docs/build-skills), [Codex plugins permissions](https://learn.chatgpt.com/docs/plugins#how-permissions-and-data-sharing-work).

The repository already uses dependency-free Node scripts and Node's built-in test runner under Node 22. The version source is `package.json`; adding a versioned Codex manifest requires extending the sync, drift guard, fixtures, documentation, and release-relevant path configuration. Sources: `package.json:1-17`, `.github/workflows/changeset-gate.yml:24-37`, `scripts/sync-version.mjs:1-100`, `scripts/check-version-sync.mjs:43-148`, `.changeset/config.json:12`, `CONTRIBUTING.md:19-67`.

### Supervisor protocol evidence

Both initial `codex exec` and `exec resume` accept prompts on stdin; initial turns accept `-C`, model, sandbox, typed configuration overrides, JSON output, and an output schema. Resume accepts an explicit session ID, model, overrides, JSON, and schema but no `-C`; the supervisor must launch the resume process with the original worktree as OS CWD and reapply sandbox through configuration. Sources: [Codex non-interactive mode](https://developers.openai.com/codex/non-interactive-mode/), local `codex exec --help` and `codex exec resume --help` for `codex-cli 0.144.0-alpha.4`.

Current profiles use transport-neutral completion, message, and blocker language, while the foreground orchestrator owns phase sequencing and repository completion. One generic discriminated agent envelope can preserve those semantics without duplicating role-specific rules in software. Sources: `agents/*.md`, `skills/radical-pipelines/reference/autonomous-workflow.md:63-94`, `skills/radical-pipelines/reference/conventions/passing.md:1-26`.

### Failure and monitoring evidence

The existing monitor defines exactly four recoverable signals—no-output, message, login/API-key, and network—with a two-retry budget and a fixed escalation payload. Deterministic protocol, registry, worktree, configuration, or permission failures do not fit those signals and should stop immediately. Every run outcome still executes foreground close-out. Sources: `skills/radical-pipelines/reference/health-monitoring.md:15-78`, `skills/radical-pipelines/reference/autonomous-workflow.md:72-94`, `skills/radical-pipelines/reference/resume-pipeline.md:7-29`.

Current `codex exec` can emit a nonfatal embedded error followed by a valid completion and exit zero, while a missing schema can fail before JSONL begins. Correct classification must combine structured events, validated envelope, and process exit rather than treating any one as authoritative. Sources: local `codex-cli 0.144.0-alpha.4` read-only experiments; [Codex machine-readable output](https://developers.openai.com/codex/non-interactive-mode/#make-output-machine-readable).

Codex Scheduled tasks are desktop-only. A cross-surface recurring monitor therefore needs a supervisor-owned detached scheduler. Node supports detached children that outlive the parent when stdio is disconnected and the child is unreferenced. The scheduler can run a dedicated `codex exec` monitor agent on each tick: deterministic timing and action execution stay in software, while the existing self-contained monitor prompt retains recovery policy. Sources: [Codex scheduled tasks](https://developers.openai.com/codex/app/automations/), [Node detached processes](https://nodejs.org/api/child_process.html#optionsdetached), `skills/radical-pipelines/reference/health-monitoring.md:50-78`.

### Coverage audit

The unchanged shared entry points serve issue management, pipeline creation/listing/resumption/revision/forking, assisted work, phase topology, guardrails, approval artifacts, tracker updates, commits, and close-out. The Codex adapter replaces only autonomous agent transport and monitoring. Private supervisor state never participates in branch parsing, artifact formats, fork cuts, or completion. Sources: `skills/radical-pipelines/SKILL.md:41-54`, `skills/radical-pipelines/reference/work-on-an-issue.md`, `skills/radical-pipelines/reference/manage-issues.md`, `skills/radical-pipelines/reference/assisted-workflow.md`, `skills/radical-pipelines/reference/autonomous-workflow.md`, `skills/radical-pipelines/reference/pipeline-versioning.md`.

Tracker operations remain foreground responsibilities because connector handles do not propagate into child `codex exec` sessions. Completeness must verify every tool named by the active `Issues` convention before mutations; phase status changes immediately after predicates, and run-start/run-end updates apply to success, blocker, cancellation, and failure. Source: `.rp.md:7-39`.

## Topics

### Topic: Execution and configuration approach

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–9
- **Options:**
  1. Add a parallel Codex plugin, active-tool conventions, and a supervised `codex exec` autonomous-agent transport while retaining one canonical skill, profile tree, `.rp.md`, and pipeline model.
  2. Use native Codex subagents with thin custom-agent settings carriers.
  3. Use a hybrid transport selected per agent or configuration.
  4. Use the standalone skill only, separate convention files, or Codex-only project guidance.
- **Trade-offs:** Option 1 adds a supervisor and requires an authenticated compatible CLI from every local surface, but provides exact launch parameters, worktree CWD, structured events, persistence, and one lifecycle model. Option 2 has better built-in lifecycle controls, but exact named configuration and worktree CWD are absent from the exposed spawn contract. Option 3 splits persistence, messaging, monitoring, and recovery semantics. Option 4 weakens install/setup parity or fragments shared conventions.
- **Decision:** Ship a Codex plugin beside the Claude plugin. Keep the foreground orchestrator and assisted workflow native to the active Codex surface. Run every autonomous phase agent through one supervised `codex exec` transport: inject the canonical root profile and conventions; launch each turn with exact model/settings and worktree; capture its thread ID and structured result; resume clean turns for follow-up messages; reconstruct durable pipeline state only from Git and artifacts. Keep shared and per-tool conventions together in `.rp.md`, loaded and validated for the active tool.
- **Rationale:** This is the only evidenced cross-surface approach that preserves exact agent model configuration and literal worktree seating while leaving the shared branch, artifact, workflow, approval, and completion contracts unchanged. A single autonomous transport also gives monitoring and recovery one event model. The setup gate prevents partial runs when the CLI or broker prerequisites are absent.

### Topic: Component boundaries and dependencies

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–9
- **Options:**
  1. A dependency-free Node supervisor bundled as a skill script.
  2. A plugin-bundled MCP supervisor.
  3. A prose-only supervisor.
  4. A compiled cross-platform supervisor.
- **Trade-offs:** Option 1 is relocatable, deterministic, and fits the repository's existing Node tooling, but makes a compatible Node runtime a setup prerequisite. Option 2 offers native structured tools but adds server lifecycle, trust, and dependencies. Option 3 is smallest but leaves process and JSON state nondeterministic. Option 4 avoids Node but adds platform builds and release artifacts.
- **Decision:** Add `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json` at the repository root, both exposing the existing canonical `skills/` and `agents/` tree. Add `reference/conventions/codex.md` as the only Codex-specific skill instructions. Implement a dependency-free Node supervisor under `skills/radical-pipelines/scripts/codex-supervisor/`; it owns profile resolution, prompt composition, `codex exec` launch/resume, JSONL/schema handling, transient session/process state, bounded concurrency, recurring-monitor scheduling, status, and validated process actions. Recovery choices remain in the dedicated monitor agent's prompt; the supervisor does not own phase topology, Git topology, review policy, or completion predicates. Update active-tool convention loading/setup, repository `.rp.md`, version sync/drift tooling, release-relevant paths, package description, README, CONTRIBUTING, website, behavioral tests, and a minor changeset. Keep shared workflow/phase/profile files and Claude plugin behavior unchanged.
- **Rationale:** This isolates Codex process mechanics in testable software while leaving the existing generic skill and durable pipeline model intact. Node built-ins avoid a new package dependency. The manifest and marketplace provide the supported installation path across local Codex surfaces; the setup gate verifies Node, authenticated Codex CLI, supervisor execution, sandbox, and resume before pipeline work begins.

### Topic: Supervisor interfaces and data flow

- **Spec link:** Requirement 2 / Acceptance criteria 1–5 and 7–8
- **Options:**
  1. Versioned JSON requests on stdin with normalized JSONL events on stdout and a private registry.
  2. Flags and raw Codex JSONL passthrough.
  3. A long-lived daemon/MCP interface.
  4. In-memory or artifact-backed state.
- **Trade-offs:** Option 1 avoids shell quoting and process-list leakage, decouples the foreground from raw Codex events, and survives surface restarts, but requires registry locking and protocol versioning. Option 2 is simpler but unsafe for rich prompts and couples orchestration to Codex event details. Option 3 simplifies live calls but adds server lifecycle. Option 4 either loses restart recovery or pollutes canonical pipeline state.
- **Decision:** Expose `start`, `message`, `ack`, `restart`, `wait`, `status`, `cancel`, and `close`, plus `doctor` and `monitor start|list|cancel`. Every command reads one versioned JSON request from stdin and emits normalized JSONL. `start` accepts a logical agent ID, validated role, peer map, absolute worktree/branch seat, structured conventions, verbatim task, typed Codex model/settings/sandbox, and `persistent` or `one-shot`; the supervisor loads the canonical profile and writes the composed prompt to `codex exec -` using argv with `shell: false`. `message` resumes an idle persistent logical agent by its internal explicit session ID; immutable message IDs make replay idempotent, and `ack` durably records foreground consumption. `restart` creates a fresh generation from the retained launch record, optionally overriding model/settings. The schema-constrained turn envelope is discriminated as `message`, `complete`, or `blocked`; `blocked` carries the existing three-field blocker payload, and generic `body` preserves role-defined completion/review reports. Broker events cover queued, turn started, session bound, redacted activity, warning, turn finished/failed, message delivery/acknowledgement, cancellation, status, timeout, monitor ticks/actions/escalation, and close. Store the private registry under a configurable user-scoped state directory, keyed by real Git common directory, run branch, logical agent, and turn; use atomic lock-directory acquisition and atomic file replacement. Retain each recoverable agent's task, structured conventions, seat, settings, persistence, generation, and launch hash until it becomes terminal; retain no credentials, environment dumps, rendered full prompts, profile copies, reasoning, or canonical artifact state.
- **Rationale:** The contract preserves persistent Q&A through explicit session resume, one-shot freshness through ephemeral sessions, isolated-lane parallelism through unique logical IDs and bounded slots, and foreground restart through registry discovery. Logical IDs and normalized events insulate the generic workflow from Codex session/process details. Missing registry state safely degrades to Git/artifact reconstruction and fresh logical agents.

### Topic: Failure modes and observability

- **Spec link:** Requirements 1–2 and 5 / Acceptance criteria 1–4 and 7–9
- **Options:**
  1. Supervisor detects and executes typed mechanics; the monitor agent owns retry and escalation policy.
  2. Supervisor automatically retries all transport failures.
  3. Map every failure into the four monitor signals.
- **Trade-offs:** Option 1 preserves the existing prompt-defined policy and enables safe recovery across foreground restarts, but requires richer events, a detached scheduler, and a dedicated monitor agent. Option 2 centralizes mechanics but moves model choice, delivery safety, and retry budgets into software. Option 3 simplifies classification but causes futile or unsafe retries for deterministic failures.
- **Decision:** Gate all work on active Codex conventions, installed-plugin integrity, compatible Node and Codex CLI features, authentication/model access, strict config, policy/sandbox permission, private supervisor state, repository seating, foreground `Issues` tools, required child tools, and active-surface process control. The supervisor validates and classifies request, registry, lock, launch, JSONL, envelope, exit, authentication, network/rate-limit, permission/tool-init, seat, cancellation, stale-state, and restart facts; every failure carries a normalized code, stage, source, session integrity, optional monitor signal, transient exact upstream error for owner escalation, separately redacted persisted diagnostic, and last activity. Only proven `no_output`, `message`, `login`, or `network` signals enter the existing two-retry table. `monitor start` idempotently launches a detached per-run scheduler; every non-overlapping tick snapshots supervisor/worktree evidence and starts or cleanly resumes a dedicated monitor agent with the self-contained health prompt, retry ledger, and typed allowed actions. The agent chooses `healthy`, recovery actions, or escalation; the scheduler validates and executes `status`, idempotent resend, model override, fresh restart, or cancellation. `monitor list` reconciles registry, heartbeat, owner token, and PID identity; `monitor cancel` stops future ticks and owned active turns. Clean resume requires one valid envelope, `turn.completed`, exit zero, consistent seat/config/message acknowledgement, and no ambiguity; cancellation, failed/truncated output, invalid schema, conflicting evidence, delivery ambiguity, seat drift, orphan uncertainty, or corrupt state taints the session and requires a fresh generation. Treat orphan and stale-lock cleanup as automatic only with positive liveness/ownership proof; otherwise surface reconciliation. Emit privacy-preserving normalized events and bounded redacted diagnostics; delete acknowledged bodies promptly and registry/log state at close-out. The foreground preserves tracker updates and existing close-out for success, blocker, cancellation, or failure.
- **Rationale:** Separating deterministic process mechanics from prompt-defined recovery policy preserves the existing monitor contract while allowing recurrence across foreground restarts. Strict session-integrity and acknowledgement rules prevent duplicate work after interruption. Private normalized observability supports all local surfaces without making Codex runtime state part of the cross-tool pipeline.

### Topic: Requirement coverage, residual risks, and open questions

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–9
- **Options:**
  1. Complete the design with explicit monitor, acknowledgement, tracker, and compatibility rules.
  2. Leave those behaviors for build-time discovery.
- **Trade-offs:** Option 1 adds protocol and validation detail but closes requirements that otherwise depend on surface-specific behavior. Option 2 shortens the design but leaves autonomous monitoring, exactly-once delivery, setup completeness, and no-regression claims ungrounded.
- **Decision:** Requirements 1–5 and acceptance criteria 1–9 are served as follows: the parallel plugin and supervisor provide the same entry points on desktop, CLI, and IDE; unchanged shared workflow and phase references preserve autonomous/assisted topology, guardrails, approvals, commits, tracker synchronization, and close-out; exact `codex exec` launch parameters preserve worktree and model configuration; the detached scheduler and monitor agent preserve recurring recovery; Git/artifact reconstruction preserves create/list/resume/revise/fork and bidirectional cross-tool continuation; active-tool convention selection and additive setup preserve coexistence; and `doctor` stops before any tracker mutation, branch, worktree, or artifact when Codex or foreground-tool prerequisites are incomplete. Existing Claude-only `.rp.md` files load unchanged; adding Codex updates only the Codex section and preserves shared and Claude content unless the owner approves other edits; Claude completeness ignores Codex prerequisites, never invokes the supervisor, and retains its plugin, teammate, model, and `/loop` behavior. Cross-surface, full Intent-to-Document, assisted, pipeline-operation, cross-tool continuation, tracker, and legacy/mixed-configuration scenarios are required behavioral validation targets, not new design choices.
- **Rationale:** Every named parity capability now maps either to an unchanged shared component or a concrete Codex adapter mechanism. The design changes no branch grammar, artifact contract, phase boundary, role, approval point, or completion predicate, and introduces no Codex-only pipeline behavior. Missing environmental capability is handled by the existing completeness gate, so the approved spec remains feasible.

## Open Questions

None.

## Risks

- Supported Codex CLI events, errors, and flags may evolve; gate versions and test the adapter.
- Desktop or IDE sessions may not expose compatible `codex` and Node executables or permit detached descendants; `doctor` must prove them rather than fall back to weaker monitoring.
- Managed policy, repository trust, sandbox rules, or required tool initialization may block nested execution.
- Foreground tracker tools may differ by surface even when child transport succeeds.
- Provider rate limits and OS resources may constrain parallel lanes; supervisor capacity must be bounded.
- Detached-process survival, PID identity, process groups, and cancellation vary by operating system.
- Different surfaces may resolve different user state directories or `CODEX_HOME` values, preventing monitor/session discovery.
- Forced or ambiguous termination taints the session and may require redoing uncommitted agent work.
- Persistent Codex history retention is independent of supervisor-state cleanup.
- Optional plugin or hook errors may coexist with valid turns; classification must combine JSONL, envelope, and exit evidence.
