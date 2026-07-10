# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension through a thin tool adapter around the existing tool-neutral workflow. The adapter supplies native discovery, profile resolution, model settings, agent lifecycle operations, opaque addressing, and worktree seating. Existing Git branches, worktrees, pipeline folders, artifacts, approval markers, commits, tracker transitions, phase boundaries, and completion predicates remain the durable workflow contract.

One `.rp.md` remains the project configuration. A run loads Shared conventions plus exactly one active-tool section, then applies permitted local overrides. Codex-native metadata exposes the canonical skill and canonical agent profiles rather than copying them. This lets Codex and Claude Code continue the same pipeline without migration and lets both configurations coexist without changing Claude Code behavior.

Parity means normal successful execution, committed artifacts, and phase outcomes. Native controls, scheduling, and lifecycle mechanics may differ by surface. Health monitoring is an optional adapter capability for Codex, and detached recovery is not part of the first release.

## Approach

The design separates durable pipeline state from tool-specific runtime state:

- The shared workflow owns issue and tracker behavior, branch grammar, pipeline family and run layout, worktree and lane isolation, artifact formats, approval gates, commits, cleanup, and phase-completion predicates.
- The active tool adapter owns discovery, setup actions, logical-profile resolution, native model arguments, spawn/follow-up/wait operations, returned runtime identities, assigned-worktree seating, and optional capabilities.
- Git branches and committed artifacts are the only cross-session and cross-tool state. Native agent and monitor handles live only for the current runtime session.

Before any issue or pipeline mutation, convention loading selects `Shared + active tool`, verifies the committed configuration and native prerequisites, and only then applies allowed `.rp.local.md` overrides. Missing items produce the existing completeness result and setup offer. Setup edits only Shared conventions when necessary and the selected tool section, preserves every unselected tool section byte-for-byte, shows native setup actions for owner confirmation, and reloads through the same completeness gate.

For an autonomous run, the shared workflow derives state from Git, creates the existing branches and worktrees, and asks the adapter to resolve and start each logical role in its assigned worktree. The adapter records each returned opaque ID in an in-memory map with its role, phase, lane, worktree, branch, and lifetime. Persistent analyst/researcher pairs keep their IDs through their phase; every fresh writer, reviewer, or consolidator instance receives a new ID. Messages are routed only by ID. The orchestrator advances only after checking the expected commit and phase predicate, then performs the existing tracker update and close-out. If native concurrency is smaller than the requested lane count, the adapter queues isolated lanes without changing lane topology, inputs, artifacts, or outcomes.

Assisted mode continues to run directly in the orchestrator. It uses the same active-tool completeness gate and Git-derived phase state, but no agent handles or model resolution. Research, owner approval, final artifacts, approval markers, commits, tracker updates, and close-out remain unchanged.

On resume or cross-tool continuation, the new runtime parses the existing branches and committed predicates and starts fresh native agents where work remains. It imports no runtime handle or model choice and performs no migration. Listing, revision, and forking likewise continue to operate on the existing Git and artifact contracts.

### Acceptance coverage

| Acceptance criterion | Design mechanism |
| --- | --- |
| 1. Surface coverage | One adapter contract exposes the canonical skill and profiles on every local Codex surface; each surface may map its native controls differently while producing the same commits and predicates. |
| 2. Autonomous workflow | The shared autonomous flow, logical roles and lifetimes, review gates, lanes, commits, tracker hooks, predicates, and close-out remain unchanged; only lifecycle calls cross the adapter boundary. |
| 3. Assisted workflow | Assisted mode stays orchestrator-owned and preserves its research, approval, artifact, marker, commit, tracker, and close-out contract. |
| 4. Pipeline operations | Listing, resumption, revision, forking, versioning, worktrees, lanes, and cleanup continue to use the existing Git grammar and artifact state. |
| 5. Cross-tool continuation | Both tools read and write the same branches, paths, formats, and predicates; runtime identities are never durable, so continuation requires no migration. |
| 6. Configuration coexistence | Loading selects Shared plus one tool section; setup preserves unselected sections, and Claude Code conventions and metadata remain active and unchanged when Claude Code is selected. |
| 7. Surface capability differences | The adapter normalizes outcomes, not native controls. Bounded concurrency may queue work, and monitoring may be absent, without changing required artifacts or outcomes. |
| 8. Incomplete setup | Shared, selected-tool, discovery, profile, and worktree prerequisites are checked before mutation; failure reports missing items and offers the supported confirmed setup path. |
| 9. Optional monitoring | Codex completeness accepts an absent monitoring capability and shared flows skip its start, cancel, and resume operations. Detached recovery is not required. |
| 10. No Claude Code regression | Claude Code keeps its current conventions, metadata, workflow contracts, and required monitoring behavior; the new selection logic prevents Codex settings from entering a Claude Code run. |

## Components

### New components

- `skills/radical-pipelines/reference/conventions/codex.md` is the sole skill reference for Codex-specific discovery, setup actions, profile and model resolution, spawn/follow-up/wait behavior, opaque-ID lifetime, assigned-worktree seating, and optional capabilities.
- Codex-native distribution/configuration metadata exposes the canonical `skills/radical-pipelines/` tree and logical `agents/*.md` profiles to the desktop app, CLI, and IDE extension. The native path and schema are implementation details under the accepted Codex discovery/configuration premise.
- A feature changeset records the release-relevant addition.

### Modified components

- `skills/radical-pipelines/reference/conventions/load.md` selects Shared plus the active-tool `.rp.md` section, loads that tool's conventions reference, evaluates capability-aware completeness, and retains the local-overlay step.
- `skills/radical-pipelines/reference/conventions/setup.md` dispatches Codex setup, merges only Shared and the selected tool section, preserves other sections, confirms native actions, and re-runs canonical loading.
- `skills/radical-pipelines/reference/autonomous-workflow.md` starts and cancels monitoring only when the selected adapter provides it. Artifact-based orchestration stays unchanged.
- `skills/radical-pipelines/reference/resume-pipeline.md` performs monitor discovery or cancellation only when that capability exists. Git-based state reconstruction stays unchanged.
- Root `.rp.md` retains its Shared and Claude Code sections and adds the repository's Codex team-spawning and model conventions.
- `README.md` describes installation, configuration coexistence, supported local Codex surfaces, and outcome-based parity.
- `package.json`, `.changeset/config.json`, and `CONTRIBUTING.md` include the Codex-native metadata in packaging and release-relevant path rules.
- If the chosen native metadata schema contains a product version, version synchronization, drift checks, their behavior tests, and release documentation include that field.

### Unchanged components

- `skills/radical-pipelines/SKILL.md`, phase references, prompt passing, creation, versioning, listing, resumption, revision, forking, guardrails, artifact formats, approval points, and completion predicates remain the generic workflow contract.
- Canonical `agents/*.md` profiles remain shared. Native seating must start each child inside its assigned worktree. If a required surface cannot set child working directory, every canonical profile receives the same generic absolute-Worktree-path startup invariant; no Codex-specific profile copies are introduced.
- Claude Code conventions, plugin metadata, workflows, and artifacts retain their existing behavior. Its adapter continues to require and use its configured health monitor.
- Tests assert executable metadata, versioning, and runtime behavior rather than skill or profile prose structure.

## Interfaces and Data Flow

These are prose contracts interpreted by the orchestrator, not new software APIs.

```text
loadConventions(repoRoot, activeTool)
  -> CompleteConventions
  | MissingSetup { conventions[], prerequisites[] }
```

`loadConventions` reads `.rp.md` as Shared plus exactly `section(activeTool)`. Shared required units remain Issues, Branch name base, Pipeline family folder, Artifact storage, and Worktree root. Team spawning and canonical profile/configuration discovery are active-tool prerequisites. Commit format, Agent models, and Guardrails remain optional. Health monitoring is required only when the selected adapter declares it. Tool sections cannot override shared branch or artifact contracts. Committed completeness is established before permitted `.rp.local.md` values are applied.

```text
setup(activeTool, existingRp)
  -> ProposedWrite { sharedEdits?, selectedToolSection, setupActions[] }
  -> OwnerConfirm
  -> UpdatedRp | Cancelled
```

Setup reports found and missing items, preserves every unselected section byte-for-byte, and shows both the `.rp.md` diff and native setup actions. After confirmation it writes the selected changes and reloads them through `loadConventions`. Decline or cancellation leaves the repository without partial pipeline work.

```text
resolveProfile(logicalAgentName)
  -> NativeProfileRef { canonicalInstructions: agents/<logicalAgentName>.md }
  | MissingPrerequisite

resolveModel(logicalAgentName, runChoice, agentModels?)
  -> NativeSpawnSettings | ToolDefault
```

Logical role names and role lifetimes are stable. Native filenames, installed identifiers, fields, and model strings remain adapter details. Model configuration is resolved for each spawn and is not written to pipeline artifacts.

```text
spawnAgent({
  logicalAgentName,
  nativeProfileRef,
  nativeSpawnSettings?,
  worktreePath: absolute,
  branchName,
  initialPrompt
}) -> AgentHandle { id: opaque }
```

The worktree and assigned branch must exist before spawn. The child loads the canonical profile and standard conventions prompt, runs inside that worktree, and verifies path and branch before its first write. The returned ID identifies only that instance. An in-session map associates it with role, phase, lane, worktree, branch, and lifetime; IDs never enter `.rp.md`, plans, commits, artifacts, or tracker data.

```text
HealthMonitoring? {
  start(runPrompt) -> MonitorHandle?
  list?() -> MonitorHandle[]
  cancel(MonitorHandle)
}
```

An absent capability is valid for Codex and removes monitor operations from start, resume, and close-out. When present, the existing monitoring procedure and retry policy apply. Monitor handles remain session-local.

The resulting data flow is:

1. Select and validate conventions and native prerequisites before mutation.
2. Derive pipeline identity and phase state from Git branches and committed artifacts.
3. In autonomous mode, create existing isolation structures, optionally start monitoring, resolve native profiles/models, and route instances by returned ID. In assisted mode, keep work in the orchestrator.
4. Receive runtime completion, review, or blocker messages while agents commit only the existing durable artifacts.
5. Verify the expected commit and phase predicate before updating the tracker or advancing.
6. Close out every started-run outcome with independent monitor cancellation when available, branch pushes, tracker cleanup, handle release, and owner reporting.

## Key Decisions

### Decision: Use a thin Codex adapter over the shared workflow

- **Choice:** Keep all pipeline semantics generic and confine Codex differences to native distribution, convention selection, profile/model resolution, lifecycle operations, addressing, worktree seating, and optional capabilities.
- **Alternatives:** Split shared and tool configurations into separate router files; copy the skill and profiles into a Codex-specific tree; add Codex branches throughout phase references.
- **Trade-offs:** One canonical configuration and source tree minimize drift and migration, but the adapter must satisfy the normalized lifecycle and seating contract on every local surface.
- **Traces to:** Requirements 1–5 / Acceptance criteria 1–7 and 10

### Decision: Select one active-tool configuration beside Shared conventions

- **Choice:** Keep `.rp.md` canonical, load Shared plus exactly one tool section, preserve unselected sections during setup, and apply permitted local overrides after committed completeness.
- **Alternatives:** Merge all tool sections with precedence; replace `.rp.md` with per-tool files.
- **Trade-offs:** Selection prevents incompatible native commands from leaking across tools and preserves existing projects, at the cost of explicit active-tool dispatch in loading and setup.
- **Traces to:** Requirements 4 and 5 / Acceptance criteria 6, 8, and 10

### Decision: Keep Git as the only durable orchestration state

- **Choice:** Preserve existing branches, layouts, artifacts, formats, commits, and predicates; keep native IDs and model settings in memory and reconstruct state from Git with fresh agents.
- **Alternatives:** Persist native handles for reconnection; encode native metadata in pipeline artifacts; migrate pipelines between tools.
- **Trade-offs:** Cross-tool continuation stays deterministic and portable, while reconnecting to detached native instances is unavailable in the first release.
- **Traces to:** Requirements 2 and 3 / Acceptance criteria 2–5

### Decision: Preserve logical roles and isolation while allowing native scheduling differences

- **Choice:** Resolve canonical profiles per logical role, honor persistent and fresh lifetimes, seat each instance in its assigned worktree, route by opaque ID, and queue isolated lanes when capacity is bounded.
- **Alternatives:** Share instances between roles or lanes; reduce lane count; identify instances by non-unique logical names; require identical parallel scheduling on every surface.
- **Trade-offs:** Required artifacts, review independence, and phase outcomes remain stable, though wall-clock behavior may vary by surface.
- **Traces to:** Requirements 1 and 2 / Acceptance criteria 1, 2, 4, and 7

### Decision: Define parity by successful outcomes rather than native controls

- **Choice:** Require each local Codex surface to produce the same committed artifacts, gates, tracker transitions, predicates, and close-out while allowing different discovery and lifecycle mechanisms.
- **Alternatives:** Require identical UI controls or runtime machinery; support only the surface with the closest existing lifecycle model.
- **Trade-offs:** All in-scope surfaces can conform through their native capabilities, so behavioral verification must cover each surface independently.
- **Traces to:** Requirements 1 and 2 / Acceptance criteria 1–3 and 7

### Decision: Make Codex monitoring optional and omit detached recovery

- **Choice:** Model monitoring as an adapter capability. Its absence passes Codex completeness and skips monitor calls; its presence uses the existing procedure. Claude Code retains its current requirement.
- **Alternatives:** Require a scheduler on every Codex surface; install a no-op monitor; persist runtime handles for detached recovery.
- **Trade-offs:** Normal-success parity has no scheduler dependency, but silent-stall detection, background retry, and detached reconnection are not guaranteed.
- **Traces to:** Requirement 2 / Acceptance criteria 7 and 9

### Decision: Integrate Codex metadata into the existing single release

- **Choice:** Bundle thin native metadata with canonical sources, keep `package.json.version` authoritative, classify the metadata as release-relevant, and synchronize it only if its native schema is version-bearing.
- **Alternatives:** Generate or copy profile bodies per project; create a separate adapter package and version; invent a version field when the schema has none.
- **Trade-offs:** Installation remains atomic and sources remain canonical, while final version-sync changes depend on the selected native schema.
- **Traces to:** Requirements 1, 4, and 5 / Acceptance criteria 1, 6, 8, and 10

### Decision: Recover from durable evidence with narrow retries

- **Choice:** Fail fast on deterministic faults, inspect Git before retrying ambiguous operations, retry only explicitly idempotent non-applied operations, preserve branches and artifacts, and use existing resume or fork flows with fresh instances.
- **Alternatives:** Retry every native operation automatically; persist messages and handles in a recovery store.
- **Trade-offs:** The system may stop on more transient faults without monitoring, but avoids duplicate messages or writes and keeps recovery interoperable.
- **Traces to:** Requirements 2, 3, and 5 / Acceptance criteria 2–5 and 7–10

## Dependencies

Internal dependencies are the canonical Radical Pipelines skill/reference tree, canonical root agent profiles, `.rp.md`, the new Codex conventions reference, thin Codex-native metadata, and existing Git workflows. Tracker access remains selected by Shared project conventions.

External capabilities are direct local repository, filesystem, shell, and Git access; native skill/profile discovery; spawn, follow-up, wait, and opaque-ID routing; assigned-worktree operation; native model settings; owner confirmation; and the project-selected tracker connection. These are completeness prerequisites for the workflows that use them.

No new library, hosted service, daemon, scheduler, database, or execution engine is required. A native scheduler may back optional monitoring when available. There is no separate Codex adapter version.

## Failure Modes and Observability

| Failure | Detection and response | Durable state |
| --- | --- | --- |
| Incomplete conventions or native discovery | Detect before mutation; report found and missing Shared/selected-tool items and unresolved profiles; offer confirmed setup and stop on decline. | No pipeline work is created. |
| Profile or model resolution | Preflight required roles; use the native default only when Agent models are absent; report the role, redacted settings, and native error. | No unprofiled fallback is started. |
| Spawn or worktree seating | Verify path and branch before spawn and again before the child's first write. Repair a clean worktree with a fresh instance; inspect Git first if writes may exist. | Report expected/observed path and branch plus any returned ID. |
| Routing or wait ambiguity | Observe native status, results, messages, and commits. Resend only after explicit non-delivery; inspect status and Git after ambiguous delivery. Replace a dead instance only after checking its artifacts. | Runtime IDs remain live diagnostics only. |
| Agent blocker | Surface the missing or conflicting input, artifact that must change, smallest revision, and partial work; close out and direct the owner to fork below the affected phase. | Preserve branches, commits, and artifacts. |
| Reviewer rejection | Treat a committed rejection as normal iteration, pass issues verbatim to a fresh writer or consolidator, and inspect every third consecutive rejection for non-convergence. | Review artifacts remain the iteration record. |
| Guardrail failure | Record the literal gate and result. A non-zero result drives iteration; an unrunnable required gate is a blocker. | Guardrail evidence remains in the review artifact. |
| Completion or commit mismatch | Compare the runtime message with Git status, log, tree, branch, folder, and exact predicate. Keep the phase in progress until the committed predicate is true. | Tracker phase state does not advance. |
| Lane merge or consolidation | Verify each lane approval and path scope. Preserve lane refs, worktrees, and conflict evidence on topology or merge failure; clean up only after success. | Partial evidence remains inspectable. |
| Tracker operation | Report the issue, intended state, connector error, and local predicate. Stop before agents on start failure and before the next phase on a post-predicate update failure. | Git completion remains authoritative locally. |
| Close-out or push | Independently attempt optional monitor cancellation, pushes, tracker cleanup, handle release, and owner report on every started-run outcome. | Report local commits, unpushed refs, and pending external state. |
| Cross-tool resume | Parse branches and predicates, inspect active commits and diffs, and apply existing clean-restart or task-level resume rules with fresh native agents. | No runtime ID or model value is imported. |
| Optional monitor | Absence is valid. When configured, use the existing retry and escalation policy; a monitor failure does not invalidate a committed phase predicate. | Monitor handles are never pipeline artifacts. |

Without monitoring, observability still includes native operation results; agent completion, rejection, and blocker messages; Git refs, worktrees, status, log, diff, and merge state; inspectable artifacts and predicates; guardrail tables; phase reports; tracker and push responses; and resume reconstruction. Automatic time-based silent-stall detection and background retry are optional.

A terminal report identifies the outcome; phase, lane, logical role, and live opaque ID when applicable; branch, worktree, and artifact path; failed operation and error; last message, commit, or artifact; predicate state and missing files; close-out results; and a safe setup, retry, resume, or fork action.

## Risks and Open Questions

The remaining questions select native syntax or a generic seating fallback; they do not reopen the architecture or the accepted premise that Codex conventions can expose the canonical configuration and profiles.

1. **Codex metadata and versioning:** Select the native manifest/configuration path, fields, source-reference mechanism, and install scope. If the schema carries a semantic version, add it to root-version propagation, drift checks, behavior tests, and release documentation; otherwise Git tags version the bundled metadata.
2. **Assigned-worktree seating:** Verify whether desktop, CLI, and IDE can start every child inside its assigned worktree. If any cannot, update all canonical profiles with the same generic absolute-Worktree-path startup invariant while retaining pre-write branch verification.

Residual risks are:

- Native profile discovery, lifecycle calls, working-directory control, or configuration visibility may differ across surfaces. Each local surface needs the same normal-success conformance coverage.
- Incorrect worktree seating can stop an agent or place writes on the wrong branch. Both parent and child checks remain mandatory.
- Native capacity may be lower than requested lane concurrency. Queuing must retain blind-lane isolation and every requested lane.
- Setup could overwrite an existing tool section. Selected-section diffs, byte-preservation of unselected sections, confirmation, and coexistence verification mitigate this.
- Capability selection or the generic profile fallback could regress Claude Code. Its monitor requirement and existing assisted/autonomous predicates require comparison coverage.
- Native metadata can drift if it copies canonical content or carries an unsynchronized version. It references canonical sources and joins version sync only when version-bearing.
- Logical role names can collide across lanes and iterations. Routing uses returned IDs and the in-memory instance map exclusively.
- Prose tests cannot prove orchestration parity. Behavioral conformance must cover autonomous execution through Document, assisted approval, pipeline operations, bidirectional continuation, incomplete setup, normal Codex execution without monitoring, bounded lane scheduling, configuration coexistence, and unchanged Claude Code behavior.
