# Design Research: Codex support

## Research

### Authoritative inputs

The approved spec requires desktop, CLI, and IDE support; autonomous and assisted parity; unchanged pipeline contracts; additive tool conventions; complete setup before mutations; and no Claude Code regression. Sources: `1-spec/spec.md`, `1-spec/spec-research.md`.

The shared autonomous workflow owns branch/worktree topology, phase order, completion predicates, tracker updates, commits, and close-out. Git and committed artifacts reconstruct pipeline state. The current health policy watches no-output, message, login, and network failures, gives each occurrence two ordered retries, then escalates with the agent, exact error, last progress, and next step. Sources: `skills/radical-pipelines/reference/autonomous-workflow.md`, `skills/radical-pipelines/reference/health-monitoring.md`, `skills/radical-pipelines/reference/resume-pipeline.md`, `skills/radical-pipelines/reference/pipeline-versioning.md`.

The rejected design left its recovery actions incomplete, depended on unproven cross-surface processes, and called a repository marketplace path personal. Source: `design-doc-review-1-rejected.md`.

The owner resolves those issues as follows:

- Every local surface uses Codex-native hierarchical subagents.
- Each persistent analyst spawns, owns, monitors, and addresses its researcher by the opaque native agent ID returned at spawn.
- The orchestrator monitors its direct agents, including analysts; analysts monitor their researchers.
- Git and committed artifacts are the only durable pipeline state.
- Native subagents inherit the local surface's permissions. Readiness requires the configured permission mode to cover every assigned worktree and required tool; failure stops before run mutations.
- Cross-surface fixtures must verify plugin installation, `agents.max_depth=2`, capacity, nesting, persistent same-ID messaging, worktree isolation, steering, bounded recovery, Git-only resume, and model pinning to `gpt-5.6-sol`.

This is binding design input. No additional research is required.

### Consequences for the design

The runtime is the foreground Codex session and its native subagent tree. A live parent retains child IDs and retry counters in its conversation context. IDs, messages, retry counters, and agent status are transient. Restarts reconstruct the run from Git and committed artifacts and spawn a new tree.

The native hierarchy is also the health monitor. Each parent waits with the configured interval, observes its direct children, sends recovery instructions to their native IDs, and escalates after the existing two-retry budget. The orchestrator handles its own tool failures directly. This replaces a separate recurring monitor while preserving the four signals, ordered retries, escalation payload, and owner-tunable interval and threshold.

The Codex marketplace entry is repository-scoped at `$REPO_ROOT/.agents/plugins/marketplace.json`. Its source is the repository/plugin root (`../..` from that file), which contains `.codex-plugin/plugin.json`, the canonical skill, and agent profiles. Installation, documentation, versioning, and fixtures use this repository scope.

## Topics

### Topic: Native execution topology

- **Spec link:** Requirements 1–3 and 5 / Acceptance criteria 1–5, 7, and 9
- **Decision:** Use Codex-native hierarchical subagents on desktop, CLI, and IDE. The foreground orchestrator is depth 0. It spawns phase analysts, writers, reviewers, and other phase agents at depth 1. A persistent analyst spawns its researcher at depth 2 and remains that researcher's sole owner and message endpoint. Configure `agents.max_depth=2`.
- **Data flow:** The orchestrator creates every branch and worktree before spawn, then passes the agent profile, conventions, task, absolute worktree, and expected branch in the initial prompt. A persistent analyst does the same for its researcher. Researchers report only to their owning analyst; phase agents report to the orchestrator.
- **Capacity:** Readiness computes the planned peak tree, including concurrently live analyst/researcher pairs and isolated lanes, and requires sufficient native capacity before run mutations. Launches remain within that bound.
- **Trade-off:** Native ownership removes a second lifecycle and routing layer. The maximum live topology is constrained by native depth and capacity, so both are setup and fixture gates.
- **Rationale:** One native hierarchy supplies the same execution model on every named local surface and matches the pipeline's parent/child responsibility boundaries.

### Topic: Persistent identity, messaging, and steering

- **Spec link:** Requirement 2 / Acceptance criteria 2 and 7
- **Decision:** The owner of a child stores the opaque ID returned by native spawn in its live context. It uses that same ID for status requests, questions, answers, steering, waits, and cancellation throughout the child's live lifetime. A persistent analyst never finds or addresses its researcher by role name.
- **Lifecycle:** A message to a running child steers that child. A follow-up to an idle persistent child reactivates the same ID. The native delivery result plus the child's response acknowledges delivery. The parent advances only after the expected response, commit, or terminal report.
- **Restart integrity:** A successful same-ID interaction continues the live agent. A restart interrupts the old agent, records its terminal status, inspects the assigned worktree, and spawns a replacement with a new ID from the latest committed artifacts. The replacement reconciles any uncommitted files but does not treat them as durable progress. IDs are never written to pipeline artifacts.
- **Rationale:** Opaque native identity preserves persistent Q&A and active steering without a logical-ID registry or message protocol.

### Topic: Worktree seating, permissions, and readiness

- **Spec link:** Requirements 1–2 and 5 / Acceptance criteria 1–4, 7–8
- **Decision:** Keep the orchestrator's existing branch/worktree ownership. Every child receives one absolute worktree path and expected branch, verifies both before its first write, and scopes all file and Git operations to that seat. Native children inherit the permission mode configured on the local surface.
- **Readiness checks:** Before tracker, branch, worktree, or artifact mutations, verify:
  1. The repository-scoped plugin is installed and its skill and profiles load.
  2. Native spawning, messaging, waiting, steering, interruption, and nesting are enabled.
  3. `agents.max_depth=2` and native capacity covers the planned tree.
  4. Every role is pinned to `gpt-5.6-sol`.
  5. The configured permission mode covers the repository, worktree-root paths needed by the plan, Git operations, and each foreground or child tool required by the active conventions and roles.
- **Failure:** A missing or unsupported permission, tool, depth, capacity, model, or plugin prerequisite invokes the existing setup path and stops before run mutations. Readiness cannot redefine desktop, CLI, or IDE as out of scope; fixture failure on one of them blocks acceptance.
- **Rationale:** One inherited permission boundary plus explicit seats preserves isolation and prevents a partially supported run.

### Topic: Hierarchical health monitoring and recovery

- **Spec link:** Requirements 1–2 and 5 / Acceptance criteria 1–2 and 7–9
- **Decision:** Every parent monitors its direct children while they are live. The orchestrator monitors depth-1 agents; each persistent analyst monitors its depth-2 researcher. A parent waits at the configured interval, checks native activity and the assigned worktree, and owns the two-retry ledger for each issue occurrence. Success resets that occurrence. Two failed retries produce the existing four-field owner escalation and stop recovery for that occurrence while other children remain monitored.
- **Start/list/cancel:** Monitoring starts with each native spawn. Native agent-tree status lists live monitored agents. Close-out asks each analyst to drain or interrupt its researcher, waits for acknowledgement, then interrupts remaining direct agents. Fixture coverage must prove nested cancellation leaves no live run agent.
- **Recovery contract:**

| Issue | Detection and owner | Retry 1 | Retry 2 | Acknowledgement and integrity |
| --- | --- | --- | --- | --- |
| No-output stall | A direct child has no native activity or worktree progress beyond the threshold; its parent owns recovery. | Send a status request to the active child's same opaque ID. | Interrupt it, then spawn a replacement from committed Git/artifact state with a new ID. | A status response acknowledges retry 1. Retry 2 continues no old session state; the replacement reconciles the seat before work. |
| Message failure | Native delivery fails or the expected child response does not arrive; the sender owns recovery. | Re-send the same message to the same target ID. | Interrupt and replace the target, then deliver the task and unresolved message to the new ID. | The native delivery result and expected response acknowledge the attempt. Ambiguous application is reconciled against committed artifacts before further work. |
| Login / API-key error | The native operation returns the authentication error; the parent handling that operation owns recovery. | Retry the failed native operation once with the pinned `gpt-5.6-sol` configuration. | Re-spawn the affected child with the same pinned model and retry the operation. | Success acknowledges recovery. The model remains pinned; exhaustion escalates the exact authentication error rather than switching provider or model. |
| Network failure | The agent that issued the tool call reports the transient error; that agent retries under its parent's supervision. | Retry that exact failed tool call once in the same live agent. | Wait one configured interval, then retry that exact call again in the same live agent. | The tool result acknowledges each attempt. An ambiguous side-effect outcome escalates instead of repeating an operation whose completion is unknown. |

- **Root failures:** The orchestrator applies the same login and network rows directly to its own failed operations. A lost surface session resumes from Git and artifacts; it does not recover an old native tree.
- **Rationale:** Active agents can receive status and retry instructions through their same native IDs, and the original failing agent can retry its exact tool call. New IDs mark real restarts, preventing a restart from being presented as a same-session retry.

### Topic: Durable state and resume

- **Spec link:** Requirement 3 / Acceptance criteria 4–5
- **Decision:** Branches and committed pipeline artifacts are the complete durable state. Native IDs, agent trees, retry ledgers, delivery state, prompts, and permission observations remain live-session data only.
- **Resume:** On a new surface session, reconstruct the active pipeline and completed phases from Git and committed artifacts, recreate required worktrees from existing branches, recompute readiness, and spawn a fresh native tree. Never require a previous agent ID or runtime record.
- **Cross-tool continuation:** Codex and Claude Code continue to use the existing branch grammar, artifact paths and formats, and completion predicates. Neither tool migrates the other's pipeline.
- **Trade-off:** Uncommitted agent context can be lost after interruption. Phase completion already requires committed artifacts, so loss cannot create a false completed phase.
- **Rationale:** Git-only resume keeps local surfaces and tools interoperable and makes runtime loss bounded and inspectable.

### Topic: Distribution and configuration scope

- **Spec link:** Requirements 1, 4–5 / Acceptance criteria 1, 6, and 8–9
- **Decision:** Add `.codex-plugin/plugin.json` and the repository-scoped `$REPO_ROOT/.agents/plugins/marketplace.json`. The marketplace entry's plugin source is `$REPO_ROOT` (`../..` relative to the marketplace file). The installed plugin exposes the canonical Radical Pipelines skill and agent profiles plus Codex-specific convention instructions.
- **Lifecycle:** Repository installation, discovery, updates, version sync, release-relevant paths, documentation, and fixtures all use the repository marketplace. No personal marketplace or personal plugin-copy lifecycle is part of this design.
- **Configuration:** Keep shared and tool-specific conventions additive. Codex conventions define native team spawning, `gpt-5.6-sol` model pinning, inherited permission readiness, and hierarchical health monitoring. Claude Code loads only its conventions and retains its current runtime behavior.
- **Rationale:** Naming the repository scope and source path removes installation ambiguity while preserving one canonical skill and profile tree.

### Topic: Cross-surface fixture gate

- **Spec link:** Requirements 1–2 and 5 / Acceptance criteria 1–2 and 7–9
- **Decision:** The implementation is incomplete until fixture runs pass on Codex desktop, CLI, and IDE with direct access to fixture repositories. Each surface must verify:
  1. Repository marketplace discovery and plugin installation.
  2. `agents.max_depth=2` and sufficient capacity for depth-1 agents plus a depth-2 researcher.
  3. Analyst-owned researcher nesting and opaque-ID ownership.
  4. Multiple persistent messages and steering to the same live ID.
  5. Absolute-worktree and expected-branch isolation across concurrent lanes.
  6. The four recovery rows, two-retry limits, acknowledgements, restart ID changes, escalation, and nested cancellation.
  7. Session loss followed by reconstruction from Git and committed artifacts with fresh IDs.
  8. Effective model pinning to `gpt-5.6-sol` for every spawned role.
  9. Permission readiness failure before any tracker or repository mutation.
- **Failure:** A fixture failure is architecture-blocking for the feature. It must be fixed in the native design or implementation; the named surface cannot be excluded by readiness.
- **Rationale:** The fixtures are the acceptance evidence for cross-surface native feasibility. Per-run readiness handles local misconfiguration only after that feasibility is established.

### Topic: Acceptance coverage

- **Spec link:** Requirements 1–5 / Acceptance criteria 1–9
- **Decision:** Preserve shared workflow entry points and map criteria as follows:

| Criterion | Decision coverage |
| --- | --- |
| 1. Surface coverage | Repository plugin plus mandatory desktop, CLI, and IDE native-subagent fixtures. |
| 2. Autonomous workflow | Depth-0 orchestrator, depth-1 phase agents, analyst-owned depth-2 researchers, native monitoring, existing artifacts, gates, commits, trackers, and close-out. |
| 3. Assisted workflow | Foreground execution retains the existing research, approval, artifact, commit, tracker, and completion behavior. |
| 4. Pipeline operations | Existing Git branches, worktrees, versioning rules, artifacts, and cleanup remain authoritative. |
| 5. Cross-tool continuation | Resume uses only shared Git and committed artifacts. |
| 6. Configuration coexistence | Shared conventions remain common; each tool loads only its additive tool section. |
| 7. Surface capability differences | Every named surface must pass the same native topology, messaging, monitoring, permission, isolation, and model fixtures. |
| 8. Incomplete setup | Plugin, depth, capacity, model, permission, and tool readiness stop before mutations and route to setup. |
| 9. No Claude Code regression | Claude Code configuration and runtime remain separate; shared pipeline contracts do not change. |

- **Rationale:** Every acceptance criterion maps to either unchanged shared behavior or a native Codex decision with a fixture or readiness gate.

## Open Questions

None.

## Risks

- A named surface failing the native fixture suite blocks the feature; readiness cannot downgrade its scope.
- Native capacity may be lower than a planned multilane tree; detect it before mutations.
- A restart can lose uncommitted agent reasoning or edits; reconcile the worktree and trust only commits and committed artifacts.
- A network failure with an ambiguous side effect is unsafe to retry automatically; escalate it with the exact error and last-known progress.
- Nested cancellation and permission inheritance must pass on every named surface before acceptance.
