# Design Research: Codex support

## Research

### Existing architecture and distribution

- The canonical workflow is tool-neutral. `skills/radical-pipelines/SKILL.md:17-29,41-54` selects autonomous or assisted mode after loading project conventions. Branch grammar, run and lane layout, artifact paths, state reconstruction, and phase predicates are centralized in `skills/radical-pipelines/reference/pipeline-versioning.md:5-84`; create, resume, revise, and fork reuse them in `reference/create-pipeline.md:7-42`, `resume-pipeline.md:11-33`, `revision-pipeline.md:23-38`, and `fork-pipeline.md:16-30`.
- Tool-specific behavior has a convention seam. `skills/radical-pipelines/reference/conventions/load.md:5-18` makes Team spawning and Health monitoring required and Agent models optional. `conventions/setup.md:71-95` treats model values as opaque tool-native values. `README.md:104-118` and `.rp.md:75-113` place shared and tool-specific conventions together.
- The loader does not explicitly scope duplicate convention headings to the active tool (`skills/radical-pipelines/reference/conventions/load.md:20-34`). Codex therefore needs committed Shared + Codex semantic completeness before merging Codex-only local overrides and checking runtime readiness. Local values may replace machine-specific values but cannot supply missing committed semantic units.
- The repository exposes the canonical skill and Markdown profiles through its current plugin (`README.md:63-102`). A Codex plugin can expose the existing skill tree on the desktop app, CLI, and IDE extension. Sources: [Codex skills](https://developers.openai.com/codex/skills/), [building Codex plugins](https://developers.openai.com/codex/plugins/build/), [using Codex plugins](https://developers.openai.com/codex/plugins/).
- Codex native subagents support nested agents and persistent follow-ups through opaque spawn IDs. The owner selected this native hierarchy for every local surface. Source: [Codex multi-agent documentation](https://developers.openai.com/codex/multi-agent/).

### Distribution and configuration boundaries

- Add `.codex-plugin/plugin.json` with the existing skill tree and `.agents/plugins/marketplace.json` with the plugin root. Plugin installation precedes project setup; setup cannot repair an absent plugin.
- Keep one committed `.rp.md` with Shared, Claude Code, and Codex sections. Claude Code loads Shared + Claude Code; Codex loads Shared + Codex. Apply the same namespace selection to `.rp.local.md`; legacy unscoped local tool units retain their Claude Code meaning.
- A versioned Codex manifest expands release synchronization, drift checks, package metadata, changeset paths, and public distribution documentation. Every implementation change records its changeset.

### Native agent topology and messaging

- The Codex root orchestrator spawns every role through native subagents. It owns and monitors its direct children by the opaque IDs returned at spawn.
- Each persistent analyst spawns its own researcher, retains that opaque ID in live task context, sends every research question to that same ID, and monitors the researcher. The researcher returns evidence directly to its analyst. The orchestrator communicates with the analyst and never relays analyst/researcher turns.
- The hierarchy is root at depth 0, analysts and other root-owned roles at depth 1, and each analyst-owned researcher at depth 2. Codex setup requires `agents.max_depth=2` and capacity for the configured lane topology. Insufficient depth or capacity stops before run mutations; isolated lanes are not silently serialized.
- Spawn prompts use the canonical `agents/<role>.md` profile, the existing conventions block, and the role assignment. Persistent follow-ups use the original opaque ID. Fresh roles and recovered roles receive new IDs. IDs remain live execution handles and never enter pipeline artifacts or committed state.
- Agent model conventions remain the shared public configuration. The cross-surface qualification fixture pins `gpt-5.6-sol` and verifies that every spawned fixture role uses that model.

### Execution authority and readiness

- The active local surface is the authority boundary. Native subagents inherit its configured permission mode, approval behavior, rules, hooks, repository access, and tool access. The design adds no child-specific authority layer.
- Before creating phase-0 or other run mutations, readiness verifies that the configured permission mode covers every assigned worktree, required tool, and required network access. It also verifies plugin installation, the configured model, native nesting, depth, capacity, persistent messaging, and worktree seating.
- Per-spawn readiness verifies the assigned worktree, branch, HEAD, Git membership, and lane isolation before the role may write. A surface that cannot inherit or prove the required permissions reports incomplete setup and stops. It does not weaken the workflow, request an unsupported child-side escalation, or fall back to another runtime.

### Monitoring, recovery, and continuation

- Monitoring follows native ownership. The orchestrator monitors analysts and other direct children; each analyst monitors its researcher. Parents use native status, messaging, steering, interruption, and cancellation controls while the task tree is active.
- Recovery is bounded. The first recovery steers the same opaque ID with a status and continuation request. The second interrupts that child and starts a replacement from the latest committed Git state. Replacing an analyst creates a new analyst-owned researcher; replacing a researcher updates only the analyst's live researcher ID. Exhausted recovery produces the existing escalation outcome.
- Close-out waits for or cancels the native descendants before the final push. A surface must pass the fixture for steering, cancellation, and bounded recovery before autonomous runs are enabled.
- Git branches, commits, artifacts, and phase predicates are the only durable pipeline state. A new root task or another tool reconstructs the run from Git and spawns a new native hierarchy for the next incomplete work. Opaque IDs, parent monitoring state, and recovery counters are not resumed.
- Cross-tool continuation makes no active-monitor or cross-clone exclusion claim. Concurrent clones remain independent Git writers and encounter the existing Git synchronization and conflict behavior. Continuation safety means resuming from committed Git state without artifact migration, not coordinating live tasks between clones.

### Component, flow, and dependency map

- **New:** `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `skills/radical-pipelines/reference/conventions/codex.md`, cross-surface fixture coverage, and a feature changeset.
- **Modified:** convention loading and setup; this repository's `.rp.md`; README, CONTRIBUTING, GLOSSARY, package metadata, changeset paths, version synchronization and drift checks; and behavioral tests.
- **Unchanged:** canonical agent profiles; shared workflows, prompt fields, health outcomes, tracker and guardrail rules, branch and artifact grammar, phase predicates, `.gitignore`, and Claude Code convention mechanics except normal release metadata.
- **Tool ownership:** shared health guidance states tool-neutral outcomes. `conventions/codex.md` owns native spawning, parent-child monitoring, steering, cancellation, recovery, permission readiness, and prompt overlay mechanics. `conventions/claude-code.md` retains Claude Code mechanics. Generic skill files contain no Codex-specific behavior.
- **Install flow:** marketplace → installed plugin → manifest → shared skill → Codex convention completeness → native readiness.
- **Autonomous flow:** validate readiness and capacity → create the existing topology → root spawns and monitors analysts → each analyst spawns, addresses, and monitors its researcher → complete existing gates and predicates → stop descendants → update and push through the existing close-out.
- **Continuation flow:** reconstruct committed state from Git → identify the next incomplete phase with existing predicates → create a fresh native task tree → continue without migration.
- **Dependencies:** existing Git, Markdown profiles, and artifact contracts plus the local surface's native subagent controls. The design adds no external supervisor, detached scheduler, `codex exec` routing protocol, cross-clone lease, adapter-dispatch runtime, registry, or runtime package.

### Qualification and coverage

- Run the same fixture on every in-scope local surface. It verifies plugin installation, `agents.max_depth=2`, peak capacity, analyst-owned researcher nesting, multiple follow-ups to the same opaque ID, worktree isolation, steering, bounded recovery, resume from Git, and model pinning to `gpt-5.6-sol`.
- **R1 / AC1, AC7:** the installed plugin and qualification fixture gate identical native behavior on desktop, CLI, and IDE.
- **R2 / AC2-4:** native roles retain the existing topology, profiles, lanes, worktrees, gates, artifacts, commits, tracker updates, and close-out.
- **R3 / AC5:** Git and committed artifacts alone reconstruct state across tools. No local execution handle participates in continuation.
- **R4 / AC6:** one `.rp.md` selects Shared + active-tool conventions; local overrides follow the same namespace.
- **R5 / AC8-9:** completeness and native readiness finish before mutations; Claude Code compatibility and predicate-invariance fixtures guard existing behavior.
- **Rejected review issue 1:** analyst-owned researchers and same-ID native messaging supply the executable persistent-role contract without root relay.
- **Rejected review issue 2:** inherited local authority plus pre-mutation permission and tool checks define the execution-authority contract.
- **Rejected review issue 3:** Git is the only durable continuation authority; the design removes the lease and its cross-clone exclusion claim.
- **Rejected review issue 4:** Codex mechanics live only in `conventions/codex.md`; shared health guidance remains tool-neutral.

## Topics

### Topic: End-to-end approach

- **Spec link:** Requirements 1-5 / Acceptance criteria 1-9
- **Options:**
  1. Reuse the canonical skill and run every role through Codex-native hierarchical subagents.
  2. Add an external session-routing and monitoring runtime.
- **Trade-offs:** Option 1 preserves native task ownership and direct role messaging but requires every local surface to pass the same depth, capacity, permission, persistence, recovery, isolation, and model fixtures. Option 2 adds a second execution model and non-Git runtime state.
- **Decision:** Choose option 1 on every local surface. Stop at readiness when a surface cannot satisfy it.
- **Rationale:** It realizes the existing persistent topology directly and keeps Git and committed artifacts as the complete durable model.

### Topic: Persistent role ownership and messaging

- **Spec link:** Requirement 2 / Acceptance criteria 1, 2, 4, and 7
- **Options:**
  1. The root owns analysts; each analyst owns its researcher and uses its returned opaque ID for every follow-up.
  2. The root owns both roles and relays typed messages.
- **Trade-offs:** Option 1 matches direct analyst/researcher Q&A and uses native lifecycle ownership. Option 2 requires a new routing protocol and changes the role relationship.
- **Decision:** Choose option 1. Keep IDs only in the owning parent's live context; new task trees receive new IDs.
- **Rationale:** Direct same-ID messaging satisfies the existing profiles without a relay envelope, delivery registry, or profile rewrite.

### Topic: Permissions and model enforcement

- **Spec link:** Requirements 1, 2, and 5 / Acceptance criteria 1, 2, 7, and 8
- **Options:**
  1. Inherit the local surface's configured authority and reject insufficient modes before mutations.
  2. Add a worker-specific sandbox and approval layer.
- **Trade-offs:** Option 1 keeps native rules, hooks, approvals, tools, and repository grants coherent across the task tree. Option 2 creates another authority boundary and surface-specific runtime.
- **Decision:** Choose option 1. Readiness must cover assigned worktrees and required tools, and qualification pins `gpt-5.6-sol` across the fixture hierarchy.
- **Rationale:** The run either has one sufficient native authority boundary or remains incomplete; children never silently receive weaker or broader authority.

### Topic: Health monitoring and bounded recovery

- **Spec link:** Requirements 1 and 2 / Acceptance criteria 1, 2, and 7
- **Options:**
  1. Monitor through the native parent-child hierarchy.
  2. Use a detached supervisor or scheduler.
- **Trade-offs:** Option 1 ties observation and recovery to the parent that owns the child. Option 2 creates live state outside the native task tree.
- **Decision:** Choose option 1. First steer the same ID; then interrupt and replace from committed Git; then escalate.
- **Rationale:** Native ownership supplies direct status and control while preserving bounded recovery and Git-only durability.

### Topic: Continuation and clone scope

- **Spec link:** Requirement 3 / Acceptance criteria 4 and 5
- **Options:**
  1. Resume only from committed Git and make no cross-clone monitor-exclusion claim.
  2. Coordinate active clones through a separate lease authority.
- **Trade-offs:** Option 1 preserves the existing interoperable state model; simultaneous clones retain normal Git conflict behavior. Option 2 requires durable state outside Git visible to every clone.
- **Decision:** Choose option 1. A resumed surface creates a fresh hierarchy from the next incomplete committed state.
- **Rationale:** AC5 requires artifact-compatible continuation, not live-task transfer or cross-clone scheduling.

### Topic: Tool-specific component ownership

- **Spec link:** Requirements 4 and 5 / Acceptance criteria 6 and 9
- **Options:**
  1. Keep generic outcomes shared and put Codex mechanics in the conditionally loaded Codex convention.
  2. Add native cancellation and recovery details to shared health guidance.
- **Trade-offs:** Option 1 preserves generic shared prose and isolates compatibility risk. Option 2 makes shared guidance tool-aware.
- **Decision:** Choose option 1. Leave Claude Code mechanics in its dedicated convention.
- **Rationale:** Each tool owns its native implementation while sharing the same observable workflow contract.

## Open Questions

None. Failure of a required cross-surface fixture leaves Codex setup incomplete; it does not select an external fallback.

## Risks

- **Surface capability variance:** a surface may fail nesting, same-ID messaging, steering, recovery, worktree isolation, permission inheritance, capacity, or model pinning. Mitigation: qualify the complete fixture before run mutations.
- **Ephemeral execution loss:** a root task loss discards native IDs and incomplete role context. Mitigation: resume from the latest committed phase state and create a fresh hierarchy.
- **Concurrent clones:** independent clones may advance the same run concurrently. Mitigation: retain existing Git synchronization, conflict, and completion-predicate behavior; claim no live cross-clone exclusion.
- **Capacity pressure:** isolated lane topology may exceed native capacity. Mitigation: reject the run plan before mutation rather than serialize lanes.
- **Claude Code regression:** active-tool convention selection changes shared loading. Mitigation: test legacy `.rp.md` and `.rp.local.md`, unchanged Claude Code workflows, cross-tool continuation, and predicate invariance.
