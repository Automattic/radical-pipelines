# Design Research: Codex support

## Research

### Accepted inputs

- The shared skill owns pipeline topology, branches, worktrees, artifacts, completion predicates, approvals, tracker synchronization, and close-out. Project conventions provide tool-dependent spawning, models, and health behavior. Sources: `skills/radical-pipelines/SKILL.md`, `skills/radical-pipelines/reference/conventions/load.md`, `skills/radical-pipelines/reference/autonomous-workflow.md`, `skills/radical-pipelines/reference/pipeline-versioning.md`.
- Setup already identifies the active tool from the current conversation and selects its dedicated convention file from an explicit table. No adapter key exists. Source: `skills/radical-pipelines/reference/conventions/setup.md`.
- Spec and design phases pair a persistent analyst with a persistent researcher. Writers, reviewers, and consolidators are fresh agents. Sources: `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md`, `skills/radical-pipelines/reference/autonomous-phases/2 - design-doc.md`.
- The health contract watches stalls, message failures, authentication failures, and network failures, with two recovery attempts before escalation. Source: `skills/radical-pipelines/reference/health-monitoring.md`.
- Create and revise require self-contained phase-0 folders: downloaded assets live beside `intent.md`, the intent uses relative references, and the owner approves the rendered intent before it is written. Sources: `skills/radical-pipelines/reference/create-pipeline.md`, `skills/radical-pipelines/reference/revision-pipeline.md`.
- Resume derives progress from Git, committed artifacts, and completion predicates. Source: `skills/radical-pipelines/reference/resume-pipeline.md`.
- Review 2 identified four gaps to resolve: an undefined adapter-key producer, impossible supervisor control of the active orchestrator, omitted tracker and phase-0 ordering, and a research record that described a superseded architecture. Source: `design-doc-review-2-rejected.md`.

### Binding owner decision

This alignment uses the following owner decision as its design authority; it requires no further factual investigation:

- Every local Codex surface uses Codex-native hierarchical subagents.
- The orchestrator owns and monitors its direct children. Each persistent analyst spawns, owns, addresses, and monitors its researcher through the opaque agent ID returned by the native spawn.
- Git and committed artifacts are the only durable pipeline state.
- Local surface permissions are inherited by native subagents. Readiness requires the configured permission mode to cover every assigned worktree and required tool before run mutation.
- Cross-surface fixtures must prove plugin installation, `agents.max_depth=2`, capacity, nesting, persistent same-ID messaging, worktree isolation, steering, bounded recovery, Git-only resume, and model pinning to `gpt-5.6-sol`.

The design has no external supervisor, detached scheduler, `codex exec` routing protocol, app-server control plane, cross-clone lease, repository UUID, runtime state store, adapter key, or adapter-dispatch runtime. The earlier supervisor operations and health handshake are superseded.

## Topics

### Topic: End-to-end approach and components

- **Spec link:** Requirements 1–5; Acceptance criteria 1–9
- **Options:**
  1. Use the native hierarchy on every local Codex surface.
  2. Retain the rejected supervisor and adapter runtime.
- **Trade-offs:** Native orchestration has one ownership model and no second controller, but native agent IDs and in-flight conversations end with the session. The supervisor design attempted detached continuity but could not control or replace its caller.
- **Decision:** Keep the shared skill as the active orchestrator. Add Codex plugin packaging and `reference/conventions/codex.md`, which maps existing team-spawning, model, permission, worktree, messaging, and health conventions directly to native subagent actions. The orchestrator creates branches and worktrees, dispatches the existing phase topology, verifies Git and artifacts, performs tracker operations, and handles owner interaction. The Codex convention adds no executable lifecycle service.
- **Rationale:** This is the owner-selected architecture and removes the control boundary rejected in Issue 2. Git contracts remain identical across tools, and the Claude Code convention and runtime path remain independent.

### Topic: Convention selection and configuration coexistence

- **Spec link:** Requirements 3–5; Acceptance criteria 5, 6, 8, 9
- **Options:**
  1. Obtain an adapter key from an unspecified host interface.
  2. Use the existing prose selection contract: the active top-level agent identifies its native surface and follows one explicit tool-to-convention mapping.
- **Trade-offs:** An adapter key would require a new producer and delivery contract. A single static mapping names supported tools but is already the repository's setup mechanism and needs no runtime dispatch.
- **Decision:** Remove the adapter key. The producer is the active top-level agent, the value is its literal native tool name (`Codex` or `Claude Code`), and the delivery path is the setup/load instruction that selects the matching row in one static mapping. That mapping resolves `Codex` to `reference/conventions/codex.md` and `Claude Code` to `reference/conventions/claude-code.md`; setup and load share this one mapping rather than duplicate it.

  Keep the existing `.rp.md` valid for Claude Code. Codex setup adds `.rp.codex.md`, an overlay containing only tool-dependent spawning, model, permission, and health values. Codex loads `.rp.md` plus `.rp.codex.md`; Claude Code continues to load `.rp.md`. Setup changes only `.rp.codex.md` and plugin files.
- **Rationale:** This defines the producer, exact values, and path requested by Issue 1 without a host interface, manifest bootstrap, adapter key, or adapter-dispatch runtime. Adding Codex leaves existing Claude configuration and behavior intact.

### Topic: Native hierarchy, identity, worktree, and model flow

- **Spec link:** Requirements 1–3; Acceptance criteria 1, 2, 4, 5, 7
- **Options:**
  1. Have the orchestrator spawn and address every agent, including researchers.
  2. Match conversation ownership to the native hierarchy: the orchestrator owns direct children and each analyst owns its researcher.
- **Trade-offs:** Flat ownership avoids nesting but breaks the persistent analyst/researcher conversation boundary. Hierarchical ownership requires depth two and sufficient capacity, which become readiness and fixture gates.
- **Decision:** The orchestrator prepares each assigned branch and worktree, then natively spawns analysts, writers, reviewers, consolidators, and build/document agents as its direct children. It supplies the canonical profile, exact conventions, absolute worktree, branch, task, and configured model in the initial prompt.

  A persistent analyst natively spawns one researcher after it starts. It records the returned opaque agent ID in its live context, sends every research question and follow-up to that same ID, monitors that ID, and receives the answers directly. The orchestrator communicates with the analyst and never derives a researcher address from a role, name, lane, or thread. A replacement spawn returns a new ID and starts a new ownership instance.

  Codex agent depth is exactly `agents.max_depth=2`: orchestrator children occupy depth one and analyst-owned researchers depth two. The requested lane and phase plan is admitted only when native capacity covers its peak hierarchy. Each spawn is seated in its assigned worktree using the Codex native convention; agents address Git and files through that absolute worktree and verify the expected branch before writing.

  Every Codex role is pinned to `gpt-5.6-sol`. Readiness rejects a missing or different pin. The release fixtures verify the effective model in spawned agents rather than treating configuration text alone as proof.
- **Rationale:** Opaque same-ID messaging preserves the persistent Q&A relationship without a routing protocol. Depth, capacity, worktree seating, and model behavior are explicit support gates rather than unverified assumptions.

### Topic: Pre-mutation readiness and operation ordering

- **Spec link:** Requirements 1, 2, 4, 5; Acceptance criteria 1–4, 6–9
- **Options:**
  1. Create or modify run state and then discover unsupported permissions or native capabilities.
  2. Resolve the full run plan and pass Codex readiness before branch, worktree, artifact, tracker, or resume-cleanup mutation.
- **Trade-offs:** Early readiness moves Codex mode and phase choices ahead of activation, but prevents incomplete setup from leaving pipeline or tracker state. Claude Code retains its current entry order.
- **Decision:** Codex first performs read-only issue, Git, pipeline, and tracker inspection; resolves the operation, workflow mode, phase/lane choices, role/model plan, planned branches, and absolute worktrees; and computes peak native capacity. It then checks:

  - Codex plugin and conventions are complete;
  - native hierarchical subagents and required tools are available;
  - `agents.max_depth=2` and capacity cover the plan;
  - every role is pinned to `gpt-5.6-sol`;
  - the active local permission mode, inherited unchanged by subagents, covers every assigned worktree and required tool.

  A failed or unsupported check stops before run branch, worktree, artifact, tracker, or resume-cleanup mutation and reports the exact missing capability, configuration, permission, path, or tool.

  After readiness, operations use this order:

  | Operation | Exact order after readiness | Failure before dispatch |
  | --- | --- | --- |
  | Create | Stage source assets in a unique temporary directory that mirrors the future `0-intent/` names. Render `intent.md` with its final relative references resolved against that staging root and obtain owner approval. Create the run branch, worktree, and phase-0 folder; copy the staged assets, write the approved intent, and commit them. Apply tracker activation in order: running label, active pipeline version, assignee. Dispatch only after all three succeed. | Remove the staging directory on every exit. Before tracker activation, remove the newly created worktree and branch. On tracker failure, restore prior tracker values in reverse order, then remove the new worktree and branch. |
  | Resume | Confirm the existing resume decision during read-only planning. Recreate the run worktree only if needed. Apply tracker activation in the same order. Perform the confirmed active-phase cleanup under the existing resume rules, then dispatch from the Git-derived resume point. | On tracker failure, restore prior values and remove only a worktree created by this attempt; leave the existing branch and artifacts untouched. On later cleanup failure, restore tracker values, stop, and report the Git state for the existing resume procedure. |
  | Revise | Stage and approve the revision intent and assets exactly as for Create. Create the revision branch, worktree, and phase-0 folder; materialize and commit the approved phase-0 artifacts. Apply tracker activation in the same order, then dispatch. | Use the Create cleanup and tracker rollback behavior for the new revision branch and worktree. |
  | Fork | Create the fork branch and worktree at the approved cut. Apply tracker activation in the same order, then dispatch from the selected phase. Inherited phase-0 assets remain in committed history. | On tracker failure, restore prior values, then remove the new fork worktree and branch. |

  Tracker state is a synchronized projection, not a recovery source. Each activation snapshots the prior running-label, active-version, and assignee values. Successful mutations are reversed if a later tracker mutation fails. A failed rollback becomes an explicit tracker-reconciliation blocker; no agents dispatch.

  Temporary phase-0 staging is outside the repository and contains only the draft assets needed for owner review. It is never pipeline state. Cancellation, failed Git activation, failed tracker activation, and success all delete it; a later session recreates it from the source if needed.
- **Rationale:** This answers every ordering and cleanup question in Issue 3. Unsupported setup produces no partial run or tracker mutation, approved intents resolve real local assets before activation, and Claude Code's path does not change.

### Topic: Health ownership, bounded recovery, and observability

- **Spec link:** Requirements 1, 2, 5; Acceptance criteria 1, 2, 7–9
- **Options:**
  1. Use an external monitor to supervise the native orchestrator and children.
  2. Keep monitoring in the live native ownership hierarchy and use Git-only resume when that hierarchy ends.
- **Trade-offs:** In-band monitoring can steer and replace children it owns, but no child can replace a failed parent or deliver an escalation after the orchestrator stops. An external monitor would reintroduce the rejected controller problem and non-Git runtime state.
- **Decision:** Every live parent monitors its direct children using native status, messaging, steering, and worktree progress. The orchestrator monitors analysts and its other direct children. Each analyst monitors only its researcher by returned opaque ID. Health occurrence counters remain in the live parent context and use the existing two-retry budget:

  | Signal | Retry 1 | Retry 2 | Exhaustion |
  | --- | --- | --- | --- |
  | No-output stall | Send a status request or steer the same opaque ID. | Stop and replace that direct child; the replacement receives the same Git/artifact inputs and a new ID. | Parent escalates with the existing payload. |
  | Message failure | Verify target status and resend to the same opaque ID. | Stop and replace the target child, then deliver the input to its new ID. | Parent escalates with the existing payload. |
  | Authentication failure | Retry the native action with the required `gpt-5.6-sol` pin. | Replace the affected child with the same pin. | Parent escalates; model pinning is never weakened. |
  | Network failure | Retry the failed tool action once. | Wait one health interval and retry once. | Parent escalates with the existing payload. |

  Replacing an analyst also ends its researcher ownership; the new analyst spawns and owns a new researcher. Replacing a researcher is performed only by its analyst. Successful recovery resets that occurrence's budget.

  If the orchestrator itself can no longer execute, no design component claims to switch, restart, reattach, or escalate for it. The live run ends at that boundary. After the local surface is usable, the owner resumes through the normal entry flow, which reconstructs state from branches, commits, artifacts, and completion predicates and creates a fresh native hierarchy.
- **Rationale:** This directly resolves Issue 2 by limiting recovery to agents a live parent actually controls. It preserves bounded child recovery and steering while stating the honest orchestrator-failure boundary.

### Topic: Durable state and Git-only resume

- **Spec link:** Requirements 2, 3, 5; Acceptance criteria 2, 4, 5, 8, 9
- **Options:**
  1. Persist agent IDs, retry state, controller identity, or leases outside Git.
  2. Treat all native lifecycle data as session-local and reconstruct only from committed pipeline state.
- **Trade-offs:** External state can retain runtime hints but creates a second authority and cross-surface reconciliation. Git-only recovery loses in-flight messages and uncommitted work when a session ends.
- **Decision:** Branches, commits, and committed artifacts are the only durable pipeline state. Opaque IDs, parent/child ownership, health counters, steering history, capacity reservations, and pending messages are live-session data and are never written as pipeline state. There is no controller lease, cross-clone coordination, repository UUID, thread registry, or runtime recovery file.

  Resume uses the existing branch grammar, latest-run selection, artifact inspection, completion predicates, and active-phase cleanup. It never searches for or reattaches an old native agent. A new session creates fresh IDs and resumes from the last committed predicate-supported point. Cross-tool continuation uses the same Git evidence.
- **Rationale:** This implements the owner's durable-state boundary and removes every superseded mechanism named by Issue 4.

### Topic: Packaging, dependencies, and verification

- **Spec link:** Requirements 1–5; Acceptance criteria 1, 2, 5–9
- **Options:**
  1. Accept configuration presence as sufficient support evidence.
  2. Gate release and runtime admission on observable native behavior.
- **Trade-offs:** Fixture runs cost release time but prevent unsupported surface assumptions from entering the design. Runtime readiness adds an early stop but avoids partial pipeline work.
- **Decision:** Add the Codex plugin manifest, the Codex convention file, and the single shared tool-selection mapping. Add no lifecycle executable, SDK, MCP supervisor, detached process, or new runtime-state dependency. Keep Claude packaging and conventions independent.

  Run the same fixture suite on the Codex desktop app, CLI, and IDE extension against disposable repositories and worktrees. Each surface must prove:

  1. plugin installation and skill discovery;
  2. `agents.max_depth=2`;
  3. capacity for the representative peak hierarchy;
  4. orchestrator → analyst → researcher nesting;
  5. multiple analyst messages delivered to the same opaque researcher ID;
  6. writes and commits isolated to each assigned worktree and branch;
  7. steering of a live owned child;
  8. the two-attempt recovery and escalation boundary for child stalls, message failures, authentication failures, and network failures;
  9. termination of the native hierarchy followed by reconstruction from Git and committed artifacts only;
  10. effective model `gpt-5.6-sol` for every spawned role.

  A failed fixture blocks Codex support rather than adding a surface adapter or weakening behavior. Runtime readiness repeats the checks available from configuration and the active surface before mutation. Tests cover executable setup and workflow outcomes, not skill/profile wording.
- **Rationale:** These fixtures are required proofs, not unverified capability claims. They cover every owner-directed cross-surface property and the acceptance criteria carried by the removed supervisor design.

## Open Questions

None. The owner decision closes the architecture. Fixture failures are release blockers, not prompts to select a fallback architecture.

## Risks

- A local surface that cannot pass native nesting, capacity, worktree, permission, steering, recovery, or model fixtures blocks the feature because the design has no adapter fallback.
- Orchestrator loss ends in-band monitoring. Resume recovers only committed Git/artifact progress; live messages, IDs, counters, and uncommitted work are intentionally non-durable.
- Replacing a persistent agent loses its live conversation. The replacement receives the durable record and current task, then establishes new child IDs.
- Tracker rollback can fail independently of Git cleanup. Such failure stops dispatch and surfaces the exact tracker divergence for reconciliation.
- A process crash can leave an OS temporary staging directory. It contains no authoritative state; resume recreates assets from their source.
