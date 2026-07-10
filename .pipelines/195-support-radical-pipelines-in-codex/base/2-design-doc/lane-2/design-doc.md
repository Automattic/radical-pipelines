# Design Doc: Codex support

## Overview

Radical Pipelines will expose its canonical skill and agent profiles as a Codex plugin on the desktop app, CLI, and IDE extension. Codex will use native hierarchical subagents for every role while retaining the existing workflows, topology, phase boundaries, lanes, worktrees, gates, artifacts, commits, tracker behavior, close-out rules, and completion predicates.

Git branches, commits, and pipeline artifacts remain the complete durable state. Native agent IDs and monitoring state exist only within the active task tree. Codex and Claude Code therefore continue the same runs without migration, while each tool keeps its execution mechanics in its conditionally loaded convention.

## Approach

The installed Codex plugin points to the existing skill tree. Invocation loads Shared plus Codex conventions from `.rp.md`, overlays only the Codex namespace from `.rp.local.md`, and validates committed semantic completeness before applying machine-local values. Legacy unscoped local tool units retain their Claude Code meaning.

Codex then validates native readiness before phase-0 creation or any other run mutation. The check covers plugin installation, the configured model, permission inheritance, required repository, tool, and network access, persistent follow-ups, `agents.max_depth=2`, worktree seating, and enough capacity for the configured lane topology. Isolated lanes retain their declared concurrency. A failed check reports incomplete setup and offers the existing setup path.

The root orchestrator owns analysts and all other root-level roles. Each analyst owns its researcher. A parent retains the opaque ID returned by native spawn, sends every later turn to that ID, and monitors that child through native status and lifecycle controls. Analyst/researcher questions and evidence therefore travel directly between those roles; the root neither interprets nor relays them. Fresh and recovered roles receive new IDs.

Autonomous and assisted workflows otherwise follow the canonical skill. Autonomous execution preserves the existing phase topology through Document and later phases. Assisted execution preserves research, the final artifact, owner approval marker, commit, tracker update, and close-out. Create, list, resume, revise, and fork continue to use the shared version, branch, worktree, lane, artifact, cleanup, and predicate rules.

The design satisfies the acceptance criteria as follows:

- **AC1 and AC7:** the same installed plugin, native hierarchy, readiness contract, and qualification fixture gate desktop, CLI, and IDE behavior. A missing native capability blocks setup instead of weakening the workflow.
- **AC2 and AC3:** the canonical autonomous and assisted workflows retain their roles, gates, artifacts, commits, tracker updates, approvals, predicates, and close-out.
- **AC4:** all pipeline operations retain the shared versioning, branch, worktree, lane, artifact, and cleanup contracts.
- **AC5:** both tools reconstruct the next incomplete work from the same committed Git state and create a fresh tool-native task tree without artifact migration.
- **AC6:** active-tool namespace selection lets Shared, Claude Code, and Codex conventions coexist in one project.
- **AC8:** semantic completeness and native readiness finish before pipeline mutations.
- **AC9:** Claude Code mechanics, shared workflow contracts, agent profiles, artifacts, and predicates remain unchanged; compatibility fixtures detect regressions.

## Components

### New components

- `.codex-plugin/plugin.json` exposes the existing skill tree as a versioned Codex plugin.
- `.agents/plugins/marketplace.json` identifies the plugin root for installation.
- `skills/radical-pipelines/reference/conventions/codex.md` defines native spawning, parent-child ownership, prompt composition, model application, permission readiness, monitoring, steering, cancellation, and recovery.
- Cross-surface qualification fixtures exercise the complete native contract on the desktop app, CLI, and IDE extension.
- A feature changeset records the release-visible addition.

### Modified components

- Convention loading and setup select Shared plus the active tool, validate committed semantics before local overrides, and invoke the active tool's readiness checks.
- `.rp.md` gains Codex conventions beside its retained Shared and Claude Code sections.
- README, CONTRIBUTING, GLOSSARY, package metadata, changeset paths, release synchronization, and drift checks include the Codex distribution.
- Behavioral coverage adds native topology, continuation, namespace selection, surface parity, and predicate-invariance fixtures.

### Unchanged but relevant components

- `skills/radical-pipelines/SKILL.md`, canonical agent profiles, phase workflows, prompt fields, and shared health outcomes remain tool-neutral.
- `skills/radical-pipelines/reference/conventions/claude-code.md` retains Claude Code execution mechanics.
- Issue management, tracker synchronization, guardrails, approval gates, commits, and run close-out retain their current semantics.
- Branch grammar, pipeline-family and run layout, artifact paths and formats, and phase-completion predicates remain the interoperability contract.

## Interfaces and Data Flow

### Installation and convention interface

The installation path is marketplace entry → Codex plugin manifest → canonical skill. Project setup begins only after plugin installation.

The convention loader takes the active tool and returns Shared plus that tool's committed conventions. It then applies the matching local namespace. Local values may replace machine-specific values, but cannot supply a missing committed semantic unit. Agent model values remain opaque tool-native values and are applied to native spawns.

### Readiness and execution-authority interface

The active local Codex surface is the authority boundary. Every native descendant inherits the root task's permission mode, approval behavior, rules, hooks, repository access, tool access, and network access. There is no separate worker authority configuration.

Pre-mutation readiness proves that this inherited authority covers every assigned worktree and its Git operations, each required tool, and required network access. It also proves that the configured model, nesting, depth, peak capacity, persistent messaging, steering, interruption, and cancellation are available. A mode that requires an unavailable child-side approval, or a surface that cannot inherit or prove the required grants, is incomplete setup.

Before each spawn, the parent verifies the assigned worktree, branch, HEAD, Git membership, and lane isolation. The role may write only after those values match the run plan.

### Spawn and persistent-message interface

Each spawn receives the canonical `agents/<role>.md` profile, the existing conventions block, and the role assignment. The native spawn result supplies an opaque child ID which the owning parent keeps in live task context.

The hierarchy is:

```text
root orchestrator (depth 0)
├── analyst or other root-owned role (depth 1)
│   └── analyst-owned researcher (depth 2)
└── other root-owned role (depth 1)
```

The analyst sends every research question as a native follow-up to its researcher's original ID. The researcher returns evidence through the same parent-child channel. Native child status distinguishes an active turn, an idle child available for follow-up, successful completion, interruption, and failure; canonical profiles determine whether role content is evidence, completion, or a blocker. Because the parent-child edge identifies both parties, no routing envelope, recipient registry, root relay, or session selector is required.

Opaque IDs never enter prompts for unrelated roles, artifacts, commits, or pipeline state. Reconstructed and replacement task trees always use newly returned IDs.

### Monitoring and recovery interface

Monitoring follows ownership: the root monitors its direct children, and each analyst monitors its researcher. Parents use native status, messaging, steering, interruption, and cancellation while the task tree is active.

Recovery is bounded. The first recovery steers the same ID with a status and continuation request. The second interrupts that child and spawns a replacement from the latest committed Git state. Replacing a researcher changes only its analyst's live researcher ID. Replacing an analyst creates a new analyst and a new analyst-owned researcher. An interrupted delivery follows the same sequence; committed artifacts determine what may be repeated. Exhaustion produces the existing escalation outcome.

Before the final push, close-out waits for successful descendants or cancels the active task tree. Native IDs and recovery counters are then discarded.

### Continuation interface

Listing and state reconstruction inspect only the canonical branches, commits, artifact paths, and completion predicates. Resume identifies the next incomplete committed work and creates a fresh native hierarchy. Claude Code follows the same durable state, so continuation in either direction requires no marker, conversion, or runtime-state transfer.

There is no cross-clone monitor lease. Separate clones remain independent Git writers and retain the existing synchronization, push-conflict, and completion-predicate behavior. Continuation safety means migration-free reconstruction from committed Git state; it does not claim live-task exclusion across clones.

## Key Decisions

### Decision: Reuse the canonical pipeline through a Codex plugin

- **Choice:** Expose the existing skill and profiles through a Codex plugin and keep all durable pipeline contracts shared.
- **Alternatives:** Duplicate workflows or introduce Codex-specific branches, artifacts, or predicates.
- **Trade-offs:** Reuse prevents contract drift and enables migration-free continuation, while installed plugin contents and native capabilities must be qualified on every local surface.
- **Traces to:** Requirements 1–5 / Acceptance criteria 1–6 and 9

### Decision: Use native hierarchical subagents

- **Choice:** The root owns analysts and other root-level roles; each analyst owns and directly messages one persistent researcher by opaque ID.
- **Alternatives:** Relay analyst/researcher turns through the root; add an external session-routing runtime.
- **Trade-offs:** Native ownership realizes the canonical role relationship without a routing protocol, but requires depth-two nesting, persistent follow-ups, sufficient capacity, and a live parent task.
- **Traces to:** Requirement 2 / Acceptance criteria 1, 2, 4, and 7

### Decision: Inherit one native execution-authority boundary

- **Choice:** Descendants inherit the active surface's permission, approval, rule, hook, repository, tool, and network configuration; readiness rejects insufficient authority before mutation.
- **Alternatives:** Give workers separate sandbox or approval configuration; rely on child-side escalation.
- **Trade-offs:** One boundary keeps behavior coherent across the hierarchy and surfaces, but the run cannot start when the surface cannot prove all required grants.
- **Traces to:** Requirements 1, 2, and 5 / Acceptance criteria 1, 2, 7, and 8

### Decision: Monitor and recover through native ownership

- **Choice:** Each parent monitors its children, first steers the same ID, then interrupts and replaces from committed Git state, then escalates.
- **Alternatives:** Add a detached scheduler; use unbounded retries.
- **Trade-offs:** Native controls keep live state inside the task tree and recovery bounded, while root-task loss discards uncommitted role context and requires a fresh hierarchy.
- **Traces to:** Requirements 1 and 2 / Acceptance criteria 1, 2, and 7

### Decision: Keep Git as the sole continuation authority

- **Choice:** Persist only canonical Git and artifact state; create a new native hierarchy on continuation and retain existing Git conflict behavior across clones.
- **Alternatives:** Persist native IDs; coordinate clones through a separate lease authority.
- **Trade-offs:** Git-only durability preserves cross-tool interoperability and avoids a second state model, but does not prevent independent clones from advancing the same run concurrently.
- **Traces to:** Requirement 3 / Acceptance criteria 4 and 5

### Decision: Isolate tool mechanics in active-tool conventions

- **Choice:** Keep Codex spawning, messaging, monitoring, cancellation, recovery, and readiness in `conventions/codex.md`; retain Claude Code mechanics in `conventions/claude-code.md` and tool-neutral outcomes in shared guidance.
- **Alternatives:** Put Codex or Claude Code lifecycle mechanics in shared skill files.
- **Trade-offs:** Conditional ownership protects the shared workflow and Claude Code behavior, while convention loading must select namespaces precisely.
- **Traces to:** Requirements 4 and 5 / Acceptance criteria 6 and 9

### Decision: Gate every local surface with one qualification fixture

- **Choice:** On desktop, CLI, and IDE, verify installation, `agents.max_depth=2`, peak capacity, analyst-owned researcher nesting, repeated same-ID follow-ups, worktree isolation, permission inheritance, steering, bounded recovery, Git reconstruction, and model application. The qualification fixture pins `gpt-5.6-sol` for every spawned fixture role.
- **Alternatives:** Qualify surfaces independently or skip unavailable native controls.
- **Trade-offs:** One fixture makes parity observable, but any surface missing a required capability remains incomplete until it can pass.
- **Traces to:** Requirements 1, 2, and 5 / Acceptance criteria 1, 2, 7, 8, and 9

## Dependencies

- Existing Git branch, worktree, artifact, and completion-predicate contracts.
- The installed Codex plugin containing the canonical skill and agent profiles.
- Native local-surface controls for nested spawning, persistent follow-ups, status, steering, interruption, cancellation, model application, and inherited authority.
- Sufficient native depth and capacity for the configured lane topology.

No external supervisor, scheduler, session registry, cross-clone lease, adapter runtime, or runtime package is introduced.

## Failure Modes and Observability

- **Missing plugin or committed convention:** completeness names the missing prerequisite and offers the existing setup path before pipeline work begins.
- **Insufficient native capability or authority:** readiness reports the failed model, depth, capacity, messaging, lifecycle-control, permission, tool, network, or worktree check before mutation.
- **Invalid spawn seat:** per-spawn validation reports expected and observed worktree, branch, HEAD, Git membership, or lane isolation.
- **Child silence or failure:** the owning parent observes native status, records recovery occurrence in live context, applies bounded steering and replacement, then surfaces the existing escalation outcome.
- **Interrupted message:** the owner retains the child ID, checks native status, and applies bounded recovery. The latest committed Git state bounds replacement work.
- **Root-task loss:** native handles and uncommitted role context are lost. A new invocation reconstructs committed state and starts a fresh hierarchy.
- **Capacity pressure:** readiness rejects the declared topology before mutation; isolated lanes are not serialized.
- **Concurrent clones:** normal fetch, push, merge, and predicate conflicts expose competing Git writers. No local monitor state is presented as cross-clone exclusion.
- **Close-out with active descendants:** the final push waits until the current native descendants finish or are canceled.
- **Claude Code regression:** legacy convention, unchanged-workflow, cross-tool continuation, and predicate-invariance fixtures expose behavior drift.

Pipeline artifacts and Git history remain the observable durable record. Native status, opaque IDs, and recovery counts are live diagnostics only and never authorize phase completion.

## Risks and Open Questions

- **Surface capability variance:** any surface may lack required nesting, messaging, lifecycle, model, isolation, or authority behavior. The full qualification fixture gates enablement.
- **Ephemeral execution loss:** task loss discards work not represented by committed artifacts. Continuation restarts from the latest completed predicate.
- **Concurrent clones:** independent writers may duplicate work before Git detects conflict. The design preserves existing synchronization semantics and makes no exclusion claim.
- **Capacity pressure:** configured isolated lanes may exceed native limits. The run remains incomplete until sufficient capacity is available.
- **Shared loader regression:** active-tool namespace selection touches a shared seam. Legacy Claude Code and predicate-invariance coverage protect existing behavior.

There are no open design questions. Failure of a required surface fixture leaves Codex setup incomplete rather than selecting another runtime.
