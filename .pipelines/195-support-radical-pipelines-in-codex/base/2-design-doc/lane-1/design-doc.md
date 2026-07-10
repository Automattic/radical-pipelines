# Design Doc: Codex support

## Overview

Radical Pipelines will support every Codex surface with direct local-repository access: the desktop app, CLI, and IDE extension. Support is an additive native adapter around the existing tool-neutral workflow. Codex will discover the shared skill and canonical role profiles through its conventions, use its native agent and owner controls, and produce the same branches, commits, Markdown artifacts, phase outcomes, approval gates, tracker transitions, and completion predicates as Claude Code.

Git and Markdown remain the durable cross-tool protocol. Runtime mechanisms such as agent identifiers, invocation controls, scheduling, and monitoring remain tool-specific and ephemeral. A Codex run and a Claude Code run can therefore inspect or continue each other's pipelines without artifact or branch migration. First-release parity covers normal successful execution and committed outcomes; health monitoring and detached recovery are optional for Codex.

## Approach

The shared skill continues to define issue management, pipeline operations, autonomous and assisted workflows, phase boundaries, roles, worktree isolation, guardrails, approval points, artifact contracts, commits, tracker synchronization, completion predicates, and close-out. Tool-specific rules bind those contracts to a runtime. The existing Claude Code binding remains intact; a new Codex binding supplies profile discovery, spawning and follow-up semantics, worktree seating, model/settings handling, optional monitoring behavior, and native setup actions.

Project configuration remains one committed `.rp.md`. Shared conventions stay in their existing sections, while `## Claude Code conventions` and the new `## Codex conventions` hold tool-specific values. Invocation loads `.rp.md` and `.rp.local.md`, selects the shared and active-tool sections, and validates their completeness before any pipeline branch, worktree, or artifact mutation. Setup proposes a confirmed, section-scoped merge that adds or repairs only the active tool's content.

Codex distribution metadata exposes the shared skill and registers all 19 canonical root profiles from `agents/` without copying their bodies. Exact native filenames are a build binding to Codex conventions, not a new Radical Pipelines protocol. All local Codex surfaces use this single adapter and profile set; their native controls may differ as long as the resulting workflow and durable state are identical.

Autonomous spawning retains the existing role prompt contract. Each spawn receives the exact profile name, absolute worktree and branch, conventions block, resolved tool-native model/settings when configured, and role-specific payload. Codex returns an opaque agent ID, and all later communication targets that ID. IDs live only for the active session and never enter artifacts.

Spec and design lanes retain one persistent analyst/researcher pair but allow tool-specific ownership. Claude Code keeps orchestrator-owned pairs. In Codex, the orchestrator spawns the analyst with an unchanged researcher spawn packet outside `## Conventions`; the analyst spawns exactly one researcher child, records its returned ID, and uses that ID for every research follow-up. The orchestrator records only the analyst ID. Fresh writers, reviewers, and build or document task agents keep their existing lifecycle and report contracts.

Pipeline state remains reconstructible from committed branches and artifacts. Listing, resumption, revision, and forking read the existing version, family, run, lane, lineage, artifact, approval-marker, and phase-completion rules. They never require a live agent or monitor handle. This makes bidirectional continuation between Codex and Claude Code a normal pipeline operation.

Monitoring is derived from active-tool rules and configuration. Tool rules mark `Health monitoring` required or optional. For an optional capability, an absent subsection means disabled; for a required capability, absence makes setup incomplete. A present subsection must define complete Start, List, and Cancel operations. Shared lifecycle rules invoke those operations only when monitoring is enabled. No committed run journal, polling requirement, recovery daemon, or detached-recovery contract is added.

Normal execution is validated behaviorally on the desktop app, CLI, and IDE extension. Coverage includes discovery and completeness, issue operations, pipeline create/list/resume/revise/fork, worktree-seated opaque-ID spawning, autonomous execution through Document, assisted approval flows, multilane isolation, guardrails, tracker updates, commits, close-out, bidirectional cross-tool continuation, and preflight failure before mutation. Claude Code regression coverage verifies its installation, configuration, persistent-pair topology, model handling, required monitoring, workflows, artifacts, predicates, and close-out remain unchanged.

### Acceptance coverage

| Criterion | Design coverage |
| --- | --- |
| 1. Surface coverage | One Codex adapter and canonical profile set serve desktop, CLI, and IDE; behavioral validation checks equal committed artifacts and phase outcomes. |
| 2. Autonomous workflow | Shared autonomous contracts remain authoritative; Codex binds role spawning, persistent research pairs, worktree seating, reviews, commits, tracker updates, and predicates. |
| 3. Assisted workflow | Assisted research, owner approval, final artifact, approval marker, commit, tracker update, and close-out stay in the shared workflow. |
| 4. Pipeline operations | Existing versioning, branch, worktree, lane, artifact, lineage, and cleanup rules remain the only implementation of list, resume, revise, and fork. |
| 5. Cross-tool continuation | Durable state consists only of the unchanged Git and Markdown contracts; runtime IDs and monitor handles are excluded. |
| 6. Configuration coexistence | `.rp.md` retains shared and Claude Code sections and gains a section-scoped Codex configuration; setup preserves inactive sections. |
| 7. Surface capability differences | Only semantic runtime operations are required; invocation controls, scheduling, and optional monitoring may differ by surface. |
| 8. Incomplete setup | Active-tool preflight reports missing conventions and prerequisites and offers confirmed setup before creating pipeline state. |
| 9. Optional monitoring | Codex monitoring and detached recovery are not conformance requirements; normal unmonitored execution remains valid. |
| 10. No Claude Code regression | Claude metadata, profiles, behavior, and durable contracts remain intact and receive behavioral regression coverage. |

## Components

### New components

- `skills/radical-pipelines/reference/conventions/codex.md`: the sole skill reference for Codex-native profile discovery, spawn and returned-ID addressing, nested analyst/researcher ownership, worktree seating, opaque model/settings values, monitoring capability, and native setup actions.
- Codex-native distribution index: exposes the shared skill and registers the 19 root `agents/*.md` profiles by their canonical names. Its exact path and syntax follow Codex conventions.
- `.rp.md` `## Codex conventions`: stores project-approved Codex-specific spawning, model, monitoring, and setup values beside existing shared and Claude Code conventions.

### Modified components

- `skills/radical-pipelines/reference/conventions/load.md`: selects shared plus active-tool conventions, applies section-qualified local overrides, and validates the active adapter and profiles before mutation.
- `skills/radical-pipelines/reference/conventions/setup.md`: detects active-tool gaps and performs explicit, surgical section merges while preserving shared and inactive-tool configuration.
- `skills/radical-pipelines/reference/conventions/claude-code.md`: states Claude Code's existing monitor requirement and tool-specific persistent-pair behavior.
- `skills/radical-pipelines/reference/autonomous-workflow.md`, `resume-pipeline.md`, and `health-monitoring.md`: condition monitor start, list, and cancel operations on the selected tool capability.
- `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md` and `2 - design-doc.md`: delegate persistent-pair ownership to `Team spawning` while preserving roles, prompts, artifacts, and review flow.
- `README.md` and root package metadata: document Codex distribution, supported local surfaces, configuration coexistence, and the optional-monitoring boundary.
- Release configuration and contributor guidance: recognize the Codex-native distribution as release-relevant. If native metadata carries a version, existing sync and drift checks fan out the root `package.json` version to it.

### Preserved components

- All canonical `agents/*.md` profile bodies.
- `.claude-plugin/*` and existing Claude Code configuration.
- Branch grammar; pipeline family, version, run, and lane topology; artifact paths and formats; lineage; approval markers; and phase-completion predicates.
- Shared issue, tracker, guardrail, commit, merge, push, cleanup, blocker, and close-out contracts.
- Assisted workflow semantics and generic autonomous phase behavior outside the monitor and persistent-pair runtime seams.

## Interfaces and Data Flow

### Convention loading and setup

1. Invocation loads committed `.rp.md` and optional `.rp.local.md`.
2. The loader resolves shared conventions and the section for the active tool. Override identities are section-qualified so equal subsection names cannot collide across tools.
3. Preflight validates required conventions, native distribution discovery, canonical profiles, commands, external access, configured models when detectable, and monitoring completeness.
4. Any gap stops before pipeline mutation, reports the missing items, and offers the existing setup action.
5. After explicit owner confirmation, setup merges only the approved shared or active-tool section and leaves all other content unchanged.

### Agent spawning and addressing

The stable spawn input is:

- canonical profile name;
- absolute worktree path and branch;
- the existing `## Conventions` fields;
- resolved tool-native model/settings when configured; and
- the role's existing initial payload.

Codex native spawn returns an opaque ID. Persistent follow-ups use that exact ID; fresh roles receive fresh IDs. An absent optional model convention uses native defaults. Configured values remain opaque and are never translated from Claude Code aliases. A detectably invalid value fails preflight; a later native rejection stops the spawn without silent substitution.

For a Codex spec or design analyst, the initial payload also carries a complete researcher spawn packet outside `## Conventions`: researcher profile name, complete child prompt with the same conventions fields, and resolved researcher model/settings. The analyst submits the packet unchanged, owns the child ID, and uses it for every follow-up. This changes runtime ownership only; the researcher role and research artifact contract remain shared.

### Durable pipeline flow

1. Shared issue conventions locate or modify the issue and set the tracker start state before dispatch.
2. Existing Git rules create or select the pipeline family, version, run, phase, lane branches, and isolated worktrees.
3. The active-tool adapter dispatches the shared roles in those worktrees.
4. Agents commit the existing Markdown artifacts and approval markers. Review artifacts retain guardrail outcomes and blocker handling.
5. The orchestrator verifies Git and artifact predicates instead of treating success messages as completion.
6. Tracker phase state advances only after the predicate commits. Lane merge, push, cleanup, and run close-out use existing rules.
7. A later invocation in either tool reconstructs state from branches, commits, artifacts, and lineage and can list, resume, revise, or fork without migration.

Agent IDs and monitor handles are live runtime handles only. They are excluded from branch names, artifacts, configuration, completion predicates, and cross-tool continuation.

### Monitoring capability

| Tool rule | Configuration subsection | State | Lifecycle behavior |
| --- | --- | --- | --- |
| Optional | Absent | Disabled | Run normally without start, list, cancel, or detached recovery. |
| Optional | Complete | Enabled | Use configured Start, List, and Cancel operations. |
| Required | Absent | Incomplete | Fail preflight and offer setup. |
| Required or optional | Present but incomplete | Incomplete | Fail preflight and report missing operations. |

## Key Decisions

### Decision: Add a native adapter around one shared protocol

- **Choice:** Expose the existing skill and canonical profiles through Codex-native conventions, with tool-specific rules for runtime mechanics and unchanged shared workflow contracts.
- **Alternatives:** Split the project protocol into separate Claude Code and Codex files; copy the skill and profiles into a Codex implementation.
- **Trade-offs:** One protocol minimizes artifact drift and migration risk but requires explicit adapter seams and careful conditional behavior. Separate or copied implementations isolate mechanics but duplicate or rewrite durable contracts.
- **Traces to:** Requirements 1-5; Acceptance criteria 1-7 and 10.

### Decision: Keep one additive project configuration

- **Choice:** Retain `.rp.md`, append `## Codex conventions`, resolve section-qualified local overrides, and merge setup changes only into the selected section.
- **Alternatives:** Route from `.rp.md` to separate tool files; implicitly discover adjacent tool files.
- **Trade-offs:** A single file preserves the established loader and existing projects, while setup must protect shared and inactive-tool sections. Multiple files provide physical separation at the cost of a new configuration and migration protocol.
- **Traces to:** Requirements 4 and 5; Acceptance criteria 6, 8, and 10.

### Decision: Keep Git and Markdown as the only durable runtime protocol

- **Choice:** Persist only existing branches, commits, artifacts, lineage, approval markers, and predicates; keep agent IDs and monitor handles ephemeral.
- **Alternatives:** Persist agent/session handles; add a committed run journal or external recovery store.
- **Trade-offs:** Durable state stays fully interoperable and reconstructible, but a resumed run cannot reconnect to an old native session. Persisted runtime state could aid detached recovery but would create a new tool-coupled contract outside first-release scope.
- **Traces to:** Requirements 2 and 3; Acceptance criteria 2-5 and 7.

### Decision: Delegate persistent-pair ownership to tool rules

- **Choice:** Preserve one analyst and one researcher per spec/design lane; Claude Code keeps orchestrator ownership, while a Codex analyst spawns and addresses its researcher from a complete supplied packet.
- **Alternatives:** Require identical orchestrator-owned topology on every tool; change the phase role or artifact model.
- **Trade-offs:** Tool-specific ownership fits native spawning while preserving visible roles and outputs. It makes the orchestrator's live agent graph differ by tool, so prompt construction and ID ownership must be explicit.
- **Traces to:** Requirements 1, 2, and 5; Acceptance criteria 1, 2, 7, and 10.

### Decision: Derive monitoring from tool capability and subsection completeness

- **Choice:** Mark monitoring required or optional in tool rules and invoke lifecycle operations only when a complete enabled subsection exists. Codex may run normally without it; Claude Code retains its current required monitor.
- **Alternatives:** Require monitoring on every surface; remove monitoring from all tools; add mandatory polling, a daemon, or detached recovery.
- **Trade-offs:** Capability gating preserves first-release surface coverage and Claude behavior, but an unmonitored silent stall requires native foreground status or owner intervention.
- **Traces to:** Requirements 1, 2, and 5; Acceptance criteria 1, 7, 9, and 10.

### Decision: Use native Codex capabilities without a wrapper runtime

- **Choice:** Depend on convention-based discovery/configuration and native profile, spawn, follow-up, worktree, command, and owner-interaction capabilities across local Codex surfaces.
- **Alternatives:** Generate adapter copies; introduce a wrapper CLI, daemon, or MCP service to normalize surfaces.
- **Trade-offs:** Native integration adds no process, package, authentication, or service lifecycle, while exact filenames and invocation fixtures must be bound during the build. A wrapper could normalize mechanics but would duplicate accepted platform capabilities and expand failure modes.
- **Traces to:** Requirements 1, 4, and 5; Acceptance criteria 1, 6-8, and 10.

### Decision: Validate outcomes behaviorally across surfaces and tools

- **Choice:** Test the same semantic workflow matrix on Codex desktop, CLI, and IDE, plus bidirectional continuation and Claude Code regression.
- **Alternatives:** Treat one Codex surface as representative; verify only metadata or prose structure.
- **Trade-offs:** Behavioral coverage is more expensive and may need surface-specific fixtures, but it tests the required artifacts and outcomes rather than implementation shape. Prose-structure tests would mirror documentation without proving behavior.
- **Traces to:** Requirements 1-5; Acceptance criteria 1-10.

## Dependencies

- Codex convention-based discovery and configuration for the shared skill and canonical profiles.
- Native Codex operations for fresh and nested spawn, opaque returned IDs, ID-addressed follow-ups, worktree seating, local commands, and owner interaction.
- Local filesystem and shell access plus Git branch, commit, merge, push, and worktree operations.
- Project-declared issue and tracker operations, including start, per-phase, and run-end transitions.
- Project-declared guardrail commands, evaluated by exit code and recorded through existing review artifacts.
- Optional, project-approved tool-native model identifiers and settings.

No third-party library, generated profile copy, wrapper CLI, daemon, MCP server, external state store, or custom orchestration runtime is added. The root `package.json` remains the sole version source if Codex-native metadata requires a version field.

## Failure Modes and Observability

- **Incomplete configuration or prerequisites:** Preflight reports missing shared or active-tool conventions, profiles, commands, models when detectable, external access, and monitoring operations. It stops before creating branches, worktrees, or artifacts and offers the supported setup path.
- **Discovery, model, or spawn failure:** Stop dispatch and report the role, phase/lane/task, returned ID if any, native error, and last durable branch and artifact state. Invalid configured model values are never silently replaced.
- **Worktree or seating mismatch:** Each writing agent verifies its absolute path and branch before its first write. Failure reports expected and actual state and preserves worktrees until cleanup is known safe.
- **Agent rejection or blocker:** Existing blocker payloads, review-loop limits, and close-out behavior apply. Foreground native errors and agent messages are live signals; committed predicates remain completion truth.
- **Silent stall without monitoring:** The native surface or owner cancellation is the only first-release signal. This is a known limit, not a conformance failure or a promise of detached recovery.
- **Guardrail or phase-predicate failure:** Guardrail results remain in review artifacts. The orchestrator checks committed artifacts and predicates after each phase and does not advance from an agent success message alone.
- **Tracker failure:** A start transition failure prevents dispatch. A phase transition failure after a valid commit prevents the next phase; resume derives desired tracker state from Git and reconciles before dispatch. Run-end tracker failure leaves committed phase outcomes valid but external close-out incomplete.
- **Merge, push, or cleanup failure:** Preserve local refs, tips, worktrees, and valid merged artifacts. Report exact refs, paths, and native errors, and retry before later dispatch or on resume rather than rolling back durable progress solely for cleanup failure.
- **Optional monitor failure:** Absence is valid. Failure to start a complete optional monitor is reported and execution continues unmonitored; failure of a required monitor stops. Cancel failure reports the live handle and error without changing artifact predicates.
- **Close-out after failure:** Best-effort close-out reports the failed operation and verbatim error; last durable commits and artifacts; branch/worktree, tracker, push, and cleanup state; and whether setup, resume, or a fork below a named phase is the next supported action. This report is owner-facing and does not create a new artifact format.

## Risks and Open Questions

- Setup merging must preserve shared and inactive-tool sections byte-for-byte outside the confirmed change.
- Exact Codex-native distribution and configuration filenames remain a build binding to accepted platform conventions; they do not affect the architecture or durable protocol.
- If native metadata mandates a version, sync, drift checks, release relevance, and tests must include it while retaining root `package.json` as the sole source.
- Codex model identifiers/settings remain optional, opaque, and owner-approved; concrete repository values are a setup decision.
- Desktop, CLI, and IDE invocation fixtures are build/test bindings. Each must exercise the same behavioral matrix despite different controls or scheduling.
- Without enabled monitoring, silent stalls require foreground surface or owner intervention. Mandatory stall detection and detached recovery remain out of scope.
- Tracker, push, or cleanup failures can leave committed local progress ahead of external state; resume must reconcile it before new work.

These are implementation bindings and operational risks, not unresolved architecture or spec blockers.
