# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension when they operate on a local repository. The shared Radical Pipelines skill remains the active orchestrator and retains ownership of pipeline topology, branches, worktrees, artifacts, phase-completion predicates, approvals, tracker synchronization, commits, and close-out. Codex adds plugin packaging and a Codex convention that maps existing orchestration responsibilities to Codex-native hierarchical subagents. The same pipeline model and Git contracts remain usable from Codex and Claude Code without migration.

The Codex hierarchy has two levels below the orchestrator. The orchestrator owns its analysts and all other phase agents; each persistent analyst owns its persistent researcher. A parent addresses and monitors only its direct children using the opaque IDs returned by native spawn operations. Git branches, commits, and committed artifacts are the only durable pipeline state. Agent IDs, messages, health counters, and other lifecycle data exist only in the live session. There is no external supervisor, detached scheduler, adapter-dispatch runtime, controller lease, repository identity service, or runtime state store.

## Approach

The active top-level agent identifies its native tool with the literal name `Codex` or `Claude Code`. A single static mapping used by convention setup and loading selects the corresponding tool convention. Codex loads the shared project conventions from `.rp.md`, then the Codex overlay from `.rp.codex.md`; Claude Code continues to load `.rp.md` through its existing convention. Codex setup writes only `.rp.codex.md` and Codex plugin files, so adding Codex support leaves existing Claude Code configuration and behavior unchanged.

Before mutating a run, Codex performs read-only inspection of the issue, Git repository, existing pipelines, and tracker. It resolves the requested operation, autonomous or assisted workflow, phase and lane topology, roles, models, planned branches, and absolute worktree paths, then computes peak native-agent capacity. Readiness requires:

- installed and discoverable Codex plugin and complete conventions;
- native hierarchical subagents and every tool needed by the resolved run;
- `agents.max_depth=2` and enough capacity for the peak hierarchy;
- `gpt-5.6-sol` for every Codex role; and
- a local permission mode, inherited unchanged by native subagents, that covers every assigned worktree and required tool.

Any failed check stops before branch, worktree, artifact, tracker, or resume-cleanup mutation. The owner receives the exact missing capability, setting, model, permission, path, or tool and the supported setup path.

After readiness, the shared workflow activates the selected operation using the ordering in this document. It then dispatches the existing phase topology. The orchestrator creates and verifies branches and worktrees, natively spawns each direct child in its assigned worktree, and supplies the role profile, task, conventions, absolute worktree, expected branch, and model. Each child verifies its branch before writing. A persistent analyst spawns one researcher, retains the returned opaque ID in live context, and sends all research questions and follow-ups to that same ID. The orchestrator communicates with the analyst rather than the researcher.

Autonomous workflows preserve the existing phase boundaries, agent roles, research relationships, review gates, artifacts, commits, tracker changes, and completion predicates through Document. Assisted workflows use the same phase contracts while keeping the owner approval point in the active Codex conversation. An approved assisted phase produces the same research record, final artifact, approval marker, commit, tracker update, and close-out result as the existing workflow. Native surface controls may differ, but no required workflow outcome is omitted; release fixtures must prove the outcome on every in-scope surface.

While a hierarchy is live, each parent monitors its direct children through native status, messaging, steering, and worktree progress. Recovery is limited to children the parent owns. If the top-level orchestrator stops executing, the live hierarchy ends; no component claims to replace or reattach it. Once the local surface is usable, the owner uses the normal resume entry flow. That flow reconstructs progress from Git, committed artifacts, and completion predicates and creates a fresh hierarchy with new opaque IDs.

## Components

### Shared orchestration skill

The shared skill remains the only pipeline orchestrator. It owns workflow selection, phase topology, branch and worktree operations, artifact contracts, approvals, tracker synchronization, completion checks, commits, resume cleanup, and close-out. Its generic setup/load path uses one explicit tool-to-convention mapping.

### Codex plugin package

The plugin manifest makes the shared skill and Codex convention discoverable on local Codex surfaces. It adds no lifecycle executable or controller service.

### Tool conventions

`reference/conventions/codex.md` translates the shared spawning, messaging, model, permission, worktree, and health conventions into native Codex actions. `.rp.codex.md` holds project-specific Codex values for those tool-dependent concerns. The existing Claude Code convention and `.rp.md` path remain independent and retain their current behavior.

### Native agent hierarchy

The orchestrator owns all depth-one agents: analysts, writers, reviewers, consolidators, and build or document agents required by the existing phase topology. Each persistent analyst owns its one depth-two researcher. Native opaque IDs are the only live addressing mechanism; names, roles, lanes, and thread labels are not derived into addresses.

### Git and artifact store

Existing branch grammar, pipeline family and run layout, artifact paths and formats, commits, and completion predicates remain unchanged. They are the sole durable recovery and cross-tool interoperability contract.

### Tracker integration

The existing tracker remains a synchronized projection of Git-backed pipeline state. Activation applies the running label, active pipeline version, and assignee in that order. Tracker values never become a resume authority.

### Cross-surface fixture suite

Disposable repository and worktree fixtures validate the effective Codex behavior on desktop, CLI, and IDE. A failing fixture blocks support for that surface instead of selecting a fallback architecture or weakening workflow behavior.

## Interfaces and Data Flow

### Convention selection

Setup and loading share this mapping:

| Active tool name | Tool convention | Project configuration |
| --- | --- | --- |
| `Codex` | `reference/conventions/codex.md` | `.rp.md` plus `.rp.codex.md` |
| `Claude Code` | `reference/conventions/claude-code.md` | `.rp.md` |

The active top-level agent is the producer of the literal tool name. The setup/load instruction is its delivery path into the mapping. No adapter key, host bootstrap field, or runtime dispatch interface is introduced.

### Spawn and ownership contract

Every native spawn receives:

- the canonical role profile and task;
- the applicable project conventions;
- the absolute assigned worktree and expected branch; and
- the required model, `gpt-5.6-sol`.

The native spawn returns an opaque agent ID to the spawning parent. That parent retains the ID in live context and uses it for status, messages, steering, and replacement decisions. Multiple analyst-to-researcher exchanges use the same researcher ID. A replacement has a new ID and a new ownership instance. Replacing an analyst ends its researcher ownership; the replacement analyst spawns a replacement researcher. Only an analyst replaces its researcher.

The admitted hierarchy has `agents.max_depth=2`: orchestrator children are depth one and analyst-owned researchers are depth two. Admission calculates the peak number of simultaneously active agents for the resolved phase and lane plan and requires sufficient capacity before mutation.

### Pre-mutation and activation flow

Read-only planning snapshots relevant tracker values and resolves all paths, roles, capacity, tools, and permissions. Readiness then either stops without run mutation or admits one of these flows:

| Operation | Exact order after readiness | Failure before dispatch |
| --- | --- | --- |
| Create | Stage source assets in a unique temporary directory mirroring their future `0-intent/` names. Render `intent.md` with final relative references resolved against that staging root and obtain owner approval. Create the run branch, worktree, and phase-0 folder; copy staged assets, write the approved intent, and commit them. Apply tracker activation in order: running label, active pipeline version, assignee. Dispatch after all three succeed. | Delete staging on every exit. Before tracker activation, remove the newly created worktree and branch. On tracker failure, restore prior tracker values in reverse order, then remove the new worktree and branch. |
| Resume | Confirm the resume decision during read-only planning. Recreate the run worktree only when needed. Apply tracker activation in the same order. Perform the confirmed active-phase cleanup under existing resume rules, then dispatch from the Git-derived resume point. | On tracker failure, restore prior values and remove only a worktree created by this attempt; preserve the existing branch and artifacts. On later cleanup failure, restore tracker values, stop, and report the Git state used by the existing resume procedure. |
| Revise | Stage and approve the revision intent and assets as for Create. Create the revision branch, worktree, and phase-0 folder; materialize and commit the approved phase-0 artifacts. Apply tracker activation in the same order, then dispatch. | Use Create cleanup and tracker rollback behavior for the new revision branch and worktree. |
| Fork | Create the fork branch and worktree at the approved cut. Apply tracker activation in the same order, then dispatch from the selected phase. Phase-0 assets remain inherited through committed history. | On tracker failure, restore prior values, then remove the new fork worktree and branch. |

Phase-0 staging is outside the repository and contains only draft intent assets required for owner review. It is temporary, not pipeline state. Cancellation, failed activation, and success delete it. A process crash may leave temporary files, but a later session reconstructs the draft from its source rather than treating the staging directory as recovery state.

Tracker activation snapshots the prior running-label, active-version, and assignee values. If a later mutation fails, successful mutations are reversed in order: assignee, active version, running label. Failed rollback stops dispatch and surfaces a tracker-reconciliation blocker with the exact remaining divergence.

### Phase execution and completion

Once activation succeeds, agents operate only in their assigned branches and worktrees. The shared phase definitions determine agent topology, artifacts, owner gates, reviews, commits, tracker synchronization, and close-out. A phase is complete only when its existing committed-artifact predicate passes. Pipeline listing, inspection, resumption, revision, and forking continue to derive family, run, phase, lane, and completion state from the existing branch and artifact grammar.

Cross-tool continuation reads the same Git evidence. It never migrates a branch or artifact and never requires the runtime identity of the tool that created prior commits.

### Health state machine

Each live parent maintains occurrence counters for its direct children in session-local context. The existing two-retry budget applies:

| Signal | Retry 1 | Retry 2 | Exhaustion |
| --- | --- | --- | --- |
| No-output stall | Request status or steer the same opaque ID. | Stop and replace the direct child; give the replacement the same Git/artifact inputs and a new ID. | Parent escalates with the existing health payload. |
| Message failure | Verify status and resend to the same opaque ID. | Stop and replace the target; deliver the input to its new ID. | Parent escalates with the existing health payload. |
| Authentication failure | Retry the native action with `gpt-5.6-sol`. | Replace the affected child with the same pin. | Parent escalates; the model pin remains unchanged. |
| Network failure | Retry the failed tool action once. | Wait one health interval and retry once. | Parent escalates with the existing health payload. |

A successful recovery resets that occurrence's budget. The orchestrator monitors its depth-one children; each analyst monitors only its researcher. When the orchestrator itself cannot execute, in-band monitoring and escalation end. Recovery then occurs through a fresh owner-initiated resume from committed state.

### Durable state and resume

Durable pipeline state consists only of branches, commits, and committed artifacts. Native IDs, parent-child ownership, messages, health counters, steering history, capacity calculations, and pending work are session-local and are never written as pipeline state.

Resume applies the existing latest-run selection, branch grammar, artifact inspection, active-phase cleanup, and completion predicates. It creates a fresh native hierarchy and continues from the last committed point supported by those predicates. It does not locate or reattach prior native agents. Claude Code uses the same evidence when continuing a Codex-created run, and Codex uses it when continuing a Claude Code-created run.

### Cross-surface verification

The same fixture suite runs on the Codex desktop app, CLI, and IDE extension. Each surface must prove:

1. plugin installation and skill discovery;
2. `agents.max_depth=2`;
3. capacity for a representative peak hierarchy;
4. orchestrator-to-analyst-to-researcher nesting;
5. multiple messages delivered to the same opaque researcher ID;
6. writes and commits isolated to assigned worktrees and branches;
7. steering of a live owned child;
8. the two-attempt recovery and escalation boundary for stalls, messaging, authentication, and network failures;
9. termination of a native hierarchy followed by reconstruction from Git and committed artifacts only; and
10. effective model `gpt-5.6-sol` for every spawned role.

Runtime readiness repeats the checks observable from configuration and the active surface before each mutation. Tests exercise setup and workflow outcomes rather than profile or skill wording.

## Key Decisions

### Decision: Keep the shared skill as the native Codex orchestrator

- **Choice:** Run every local Codex surface through native hierarchical subagents owned by the shared skill's active orchestrator.
- **Alternatives:** An external supervisor, detached scheduler, app-server control plane, or adapter runtime controlling a separate hierarchy.
- **Trade-offs:** One native ownership model avoids an unimplementable second controller. The live hierarchy ends if its orchestrator ends and must be reconstructed from committed state.
- **Traces to:** Requirements 1, 2, and 5; acceptance criteria 1, 2, 3, 7, and 9.

### Decision: Select conventions through one explicit tool mapping

- **Choice:** The active top-level agent supplies `Codex` or `Claude Code` to the shared setup/load mapping; Codex adds `.rp.codex.md` as an overlay.
- **Alternatives:** An adapter key supplied by an undefined host interface or adapter-owned detection that requires selecting the adapter first.
- **Trade-offs:** The mapping explicitly names supported tools, but it has a defined producer and requires no bootstrap protocol. The overlay isolates Codex values while preserving shared conventions.
- **Traces to:** Requirements 3, 4, and 5; acceptance criteria 5, 6, 8, and 9.

### Decision: Match messaging ownership to the native hierarchy

- **Choice:** The orchestrator owns depth-one agents; each persistent analyst owns and repeatedly addresses its researcher by the returned opaque ID at depth two.
- **Alternatives:** Flat orchestrator ownership of all agents or derived researcher addresses based on role, lane, or name.
- **Trade-offs:** Persistent Q&A keeps one native identity, while depth and capacity become hard readiness requirements. Replacement necessarily starts a new identity.
- **Traces to:** Requirements 1, 2, and 3; acceptance criteria 1, 2, 4, 5, and 7.

### Decision: Gate every Codex operation before run mutation

- **Choice:** Resolve the entire run and validate plugin, conventions, hierarchy, capacity, model, permissions, tools, branches, and worktrees before run, tracker, or cleanup mutation.
- **Alternatives:** Discover unsupported capabilities after creating a branch, worktree, artifact, or tracker state.
- **Trade-offs:** Codex must resolve mode and topology earlier, but failed setup leaves no partial pipeline work or tracker activation.
- **Traces to:** Requirements 1, 2, 4, and 5; acceptance criteria 1, 2, 3, 4, 6, 7, 8, and 9.

### Decision: Stage phase-0 assets before activation and transact tracker projection

- **Choice:** Create and Revise render and approve self-contained intent drafts in temporary staging, then commit them before ordered tracker activation. All operations snapshot, order, and roll back tracker mutations before dispatch.
- **Alternatives:** Approve intent text without resolvable local assets, or mutate tracker state before readiness without rollback.
- **Trade-offs:** Temporary staging requires cleanup and may leave non-authoritative files after a process crash. It guarantees that approval sees final relative references and that activation failures do not leave partial Git or tracker state.
- **Traces to:** Requirements 2, 4, and 5; acceptance criteria 2, 4, 6, 8, and 9.

### Decision: Limit live recovery to owned children

- **Choice:** Each parent monitors, steers, retries, and replaces only its direct children. Orchestrator loss ends the live run and is recovered by normal Git-backed resume.
- **Alternatives:** A child or external service replaces the active top-level orchestrator or reattaches its caller without a native control interface.
- **Trade-offs:** Child failures retain bounded native recovery, while orchestrator failure loses in-flight messages and uncommitted work. The boundary reflects actual ownership on every surface.
- **Traces to:** Requirements 1, 2, and 5; acceptance criteria 1, 2, 7, 8, and 9.

### Decision: Use Git and committed artifacts as the only durable state

- **Choice:** Resume and cross-tool continuation reconstruct state solely from existing branches, commits, artifacts, and completion predicates.
- **Alternatives:** Persist opaque agent IDs, controller leases, retry state, repository UUIDs, thread registries, or runtime recovery files.
- **Trade-offs:** Git remains one interoperable authority, but session-local identities, counters, conversations, and uncommitted work cannot be recovered.
- **Traces to:** Requirements 2, 3, and 5; acceptance criteria 2, 4, 5, 8, and 9.

### Decision: Gate support on cross-surface behavioral fixtures

- **Choice:** Require all three local Codex surfaces to prove installation, hierarchy, identity, capacity, worktree isolation, steering, bounded recovery, Git-only resume, and effective model pinning.
- **Alternatives:** Treat configuration presence as sufficient evidence or add surface-specific fallback runtimes.
- **Trade-offs:** Fixture execution adds release cost and may block a surface whose native behavior is incomplete. It prevents capability differences from silently weakening the workflow.
- **Traces to:** Requirements 1, 2, 3, 4, and 5; acceptance criteria 1, 2, 5, 6, 7, 8, and 9.

## Dependencies

The design depends on the existing shared Radical Pipelines skill, phase definitions, branch and artifact contracts, Git and worktree support, tracker integration, project conventions, and completion predicates. Codex adds a plugin manifest, a Codex convention, and `.rp.codex.md`. It depends on native hierarchical subagents, status, messaging, steering, model selection, inherited local permissions, and sufficient agent capacity on each in-scope Codex surface.

There is no new lifecycle executable, SDK, MCP supervisor, detached process, network service, lock service, or runtime-state dependency. Claude Code packaging and conventions remain unchanged.

## Failure Modes and Observability

- **Incomplete setup:** Readiness stops before mutation and names the missing plugin, convention, capability, capacity, model, permission, path, or tool with the supported setup route.
- **Branch or worktree mismatch:** The assigned agent verifies its expected branch before writing. A mismatch stops that agent and is visible to its parent.
- **Insufficient hierarchy or capacity:** Admission fails before activation and reports the required depth and peak capacity.
- **Child stall, message, authentication, or network failure:** The owning parent records the occurrence, performs the two defined recovery attempts, and escalates the existing health payload on exhaustion.
- **Child replacement:** The parent reports the old and new opaque IDs in live context and resupplies durable Git/artifact inputs. Replacing an analyst also replaces its researcher hierarchy.
- **Orchestrator failure:** Native status and escalation cease with the live session. The owner observes the stopped surface and resumes through the normal entry flow; Git reveals the last durable completion point.
- **Phase failure:** Missing artifacts, commits, approvals, or completion predicates leave the phase incomplete. Resume uses existing cleanup rules and restarts from committed evidence.
- **Tracker activation failure:** Applied tracker mutations are rolled back in reverse order. Rollback failure blocks dispatch and reports the exact tracker divergence for reconciliation.
- **Activation failure:** Newly created branches and worktrees are removed according to the operation table. Existing Resume branches and artifacts remain intact.
- **Temporary staging residue:** Every handled exit removes staging. Crash residue has no authority and is ignored by resume.
- **Cross-surface capability failure:** The failing fixture identifies the surface and unmet behavior and blocks Codex release for that surface.

## Acceptance Coverage

| Acceptance criterion | Design coverage |
| --- | --- |
| 1. Surface coverage | One Codex convention and shared workflow are behaviorally verified on desktop, CLI, and IDE; readiness prevents unsupported runs. |
| 2. Autonomous workflow | The existing topology, gates, artifacts, commits, tracker synchronization, completion predicates, and close-out run through the native hierarchy. |
| 3. Assisted workflow | The active Codex conversation retains owner approval while agents produce the same research, artifact, approval marker, commit, tracker, and close-out outputs. |
| 4. Pipeline operations | Create, Resume, Revise, and Fork retain existing version, branch, worktree, lane, artifact, cleanup, and tracker contracts with explicit activation order. |
| 5. Cross-tool continuation | Both tools derive state from unchanged Git grammar, committed artifacts, and completion predicates without migration or runtime identity. |
| 6. Configuration coexistence | Codex adds plugin files and `.rp.codex.md`; Claude Code keeps `.rp.md` and its existing convention path. |
| 7. Surface capability differences | Required outcomes are gated by readiness and cross-surface fixtures; no missing native control silently removes a capability. |
| 8. Incomplete setup | Readiness reports the exact prerequisite and setup path before branch, worktree, artifact, tracker, or cleanup mutation. |
| 9. No Claude Code regression | Shared Git contracts and Claude Code configuration remain unchanged; Codex-specific selection and values stay in the Codex convention and overlay. |

## Risks and Open Questions

- A Codex surface that cannot pass native nesting, capacity, worktree, permission, steering, recovery, or model fixtures blocks support because the design has no fallback runtime.
- Orchestrator loss ends in-band monitoring. Resume restores only committed Git and artifact progress; live IDs, messages, counters, and uncommitted work are lost.
- Replacing a persistent agent loses its live conversation. The replacement receives the durable record and task and establishes new child IDs.
- Tracker rollback can fail independently of Git cleanup. Dispatch remains blocked until the reported divergence is reconciled.
- A process crash can leave an operating-system temporary staging directory. It contains no authoritative state and is never consulted by resume.

There are no open design questions. Fixture failures are release blockers, not triggers for a different architecture.
