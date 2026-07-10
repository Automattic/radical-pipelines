# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension when they operate on a local repository. Codex will share the existing pipeline protocol with Claude Code while using a Codex-specific distribution, configuration route, and autonomous-agent execution adapter. Parity means normal execution produces the same commits, artifacts, approvals, tracker state, phase outcomes, and close-out results; native controls may differ.

The Codex autonomous adapter will run every phase agent as a long-lived local Codex CLI child process. This contract supplies the selected model with `--model`, roots the agent in its assigned worktree with `--cd`, and addresses it through a process-specific terminal handle. It does not use in-session collaboration threads, custom-agent registration, mailbox-wide waits, or a native close operation. The canonical skill, role profiles, branch grammar, run layout, artifact formats, phase boundaries, approval gates, and completion predicates remain shared and unchanged. Existing inline Claude Code configuration remains valid. Health monitoring is conditional, and detached recovery is out of scope.

## Approach

The system has two layers:

1. The shared protocol defines issue and pipeline operations, autonomous and assisted workflows, roles, worktree isolation, guardrails, approvals, artifacts, commits, tracker synchronization, completion predicates, and close-out.
2. The active-tool adapter defines convention discovery, native prerequisites, profile delivery, agent execution, model selection, messaging, and optional runtime capabilities.

At invocation, Radical Pipelines identifies the active adapter and resolves a committed configuration view before creating pipeline state. The shared project file supplies tool-neutral conventions and may route the adapter to a separate committed file. An adapter may retain an inline fallback for existing configurations. Only the active tool participates in resolution. Committed completeness is validated before local overrides are applied; failure enters setup before branches, worktrees, tracker transitions, or pipeline artifacts are created.

Codex exposes the canonical skill to the invoking surface through native convention discovery. For autonomous work, the root orchestrator launches local Codex CLI processes rather than in-session collaboration agents. Each launch receives the absolute worktree, resolved model, and an initial prompt that directs the process to read one canonical `agents/<role>.md` profile completely, then supplies the task and conventions-passing block. `.codex/agents/*.toml` is not part of this phase-agent contract, so role instructions and model choices are not duplicated between native custom-agent files and `.rp.codex.md`.

Before autonomous pipeline mutation, the Codex adapter probes the actual child-process path from the current surface. It starts two concurrent, no-write CLI sessions, performs a process-specific request/reply round trip with each, verifies repository access and profile readability under `--cd`, verifies each configured model through `--model`, and shuts both sessions down. Additional distinct configured models receive a single no-write launch check. This observes effective authentication, project trust, model access, child-process concurrency, and terminal control after all native configuration layers have taken effect. The selected path does not use `features.multi_agent`, `agents.max_depth`, or `agents.max_threads`; their values, including an unset thread cap and its native default, do not participate in completeness.

Autonomous Spec and Design-doc phases retain one persistent analyst/researcher pair per lane, with the analyst deciding the Q&A. The Codex root owns both child processes and forwards the analyst's questions and researcher's answers verbatim between their process handles. Writers, reviewers, consolidators, plan agents, and task agents are fresh processes. Agents sharing a run worktree execute sequentially and commit before the next starts. Isolated lanes keep separate branches and worktrees and run in capacity-aware waves.

Assisted phases launch no phase agents. The orchestrator produces the same research and final artifacts, records owner approval, commits the predicate-bearing artifact set, updates the tracker, pushes, and closes the run. Pipeline listing, inspection, resumption, revision, and forking continue to derive state from existing branch and artifact contracts, so either tool can continue the other's work without migration. Resume creates fresh process handles and reconstructs progress from git evidence.

Health-monitor operations run only when the active adapter configures them. Claude Code retains its required monitor behavior; Codex may run without monitoring. Synchronous process errors, durable git evidence, and existing resume rules provide first-release failure visibility and recovery.

## Components

- **Canonical skill and role profiles:** Remain the source of shared workflow behavior and role instructions. Codex phase processes read the assigned canonical profile from the repository.
- **Convention loader:** `skills/radical-pipelines/reference/conventions/load.md` selects the active adapter, resolves its route or fallback, merges shared and active-tool units, validates committed completeness, then applies permitted local overrides.
- **Convention setup:** `skills/radical-pipelines/reference/conventions/setup.md` uses the same resolution model. After owner confirmation, it writes the shared file, active routed file, and route entry as one coherent change. Adapter selection uses a normalized identifier rather than a tool table.
- **Tool adapters:** `conventions/claude-code.md` owns Claude Code discovery, spawning, models, native prerequisites, fallback, and required monitoring. New `conventions/codex.md` owns Codex discovery, CLI child-process execution, models, process messaging, preflight, setup actions, and optional monitoring.
- **Project configuration:** `.rp.md` contains shared conventions and the route map. `.rp.claude.md` and `.rp.codex.md` contain committed tool-owned values. `.rp.local.md` remains the single uncommitted override file.
- **Codex distribution:** Native Codex metadata exposes the canonical skill to each local surface. Phase-agent roles remain canonical repository files and require no generated custom-agent definitions.
- **Codex process adapter:** Resolves role models, launches each child with `--model` and `--cd`, delivers the profile/task prompt, frames messages, tracks process handles, reads process-specific output, and ends terminal sessions.
- **Codex capability preflight:** Exercises the selected child-process contract without repository writes before an autonomous workflow creates pipeline state.
- **Shared autonomous and resume references:** Define role lifetimes, Q&A ownership, lane isolation, scheduling outcomes, git verification, and monitor lifecycle. Tool adapters own runtime mechanics.
- **Health monitoring:** `health-monitoring.md` remains one shared policy whose operations depend on the active adapter's configured capability.
- **Release and documentation surfaces:** README, package description, website documentation, contributor guidance, and a minor changeset describe Codex support. A version-bearing Codex manifest, if selected, joins version synchronization, drift checks, release coverage, and behavioral tests.
- **Unchanged contracts:** Pipeline versioning, branch and worktree topology, artifacts, phase predicates, guardrails, Claude manifest behavior, dependencies, and release workflow retain their current semantics.

## Interfaces and Data Flow

### Project convention contract

The committed root `.rp.md` ends with a route map:

```markdown
## Tool conventions

`claude-code`: `.rp.claude.md`
`codex`: `.rp.codex.md`
```

Adapter IDs are stable. Route values are committed, repository-root-relative Markdown paths. Each adapter contributes its expected route, supported inline fallback, native prerequisites, canonical Team spawning and model conventions, and monitoring requirement.

New local overrides use this shape:

```markdown
## Shared overrides

<!-- Whole shared convention units. -->

## Tool overrides

### codex

<!-- Whole Codex convention units. -->
```

A legacy flat convention unit remains valid. When both forms override the same active-tool unit, the adapter-qualified unit wins. Routing and Guardrails remain committed-only.

Configuration resolution is:

1. Normalize the active adapter ID.
2. Use its single configured route, or its declared inline fallback when no route exists.
3. Require a routed target to be readable and inside the repository.
4. Merge shared and active-tool units, rejecting duplicate unit names.
5. Validate the committed merged view and the adapter's static prerequisites.
6. Apply flat whole-unit overrides, then more-specific active-adapter units, from the main-root `.rp.local.md`.
7. Before autonomous mutation, run the active adapter's effective-capability preflight.

Inactive routes and files do not participate. Local overrides cannot repair committed incompleteness.

### Codex agent execution contract

The Codex adapter starts one long-lived CLI process per role invocation with this launch contract:

```text
codex --model <resolved-model> --cd <absolute-worktree>
```

Model resolution is the role override, then `Default`, then the CLI's native default. The adapter omits `--model` only for the native-default case. The initial prompt includes:

- a directive to read and follow the exact canonical `agents/<role>.md` file;
- the verbatim task payload and conventions-passing block;
- the expected absolute worktree and branch;
- a unique run/lane/role nonce and message-framing rules; and
- the required pre-write worktree, branch, HEAD, and status verification.

`--cd` establishes the process working directory before the agent acts. The pre-write handshake confirms the repository root and branch. All file references in the task are absolute or worktree-relative. A mismatch stops the process before writes.

Each live process has an in-memory record:

```text
{ role, lane, worktree, branch, model, processHandle, nextSequence, state }
```

The adapter writes framed messages to that process's stdin and reads only that process's stdout/stderr. Frames carry the nonce and a monotonic sequence so interleaved terminal output cannot be attributed to another role. Waiting means polling or reading the selected process handle; the mailbox-wide in-session wait is unused. On terminal role output, the orchestrator first verifies the expected commit, artifact, and predicate, then sends the process an exit/EOF request and waits for process exit. If it remains live, the adapter interrupts that process and reports cleanup. No native collaboration close operation is assumed. Process handles are never committed or used for resume.

For a persistent Spec or Design-doc pair, root launches both processes. The analyst emits a framed research request; root forwards its payload unchanged to the researcher, then forwards the framed response unchanged to the analyst. Root transports messages but does not participate in Q&A. All other role invocations receive a fresh process and handle.

### Effective-capability preflight

The preflight runs after configuration resolution and before issue lookup changes tracker state or git creates pipeline branches, worktrees, or artifacts. It performs these bounded, read-only checks from the invoking desktop, CLI, or IDE surface:

1. Resolve the Codex CLI executable and confirm that it can start an authenticated local session.
2. Start two sessions concurrently with `--cd <repository-root>` and configured model flags. Keep both live while each receives a nonce-tagged follow-up and returns the matching response through its own process handle.
3. Require each probe to report the expected repository root and branch and to read its assigned canonical profile without modifying the worktree.
4. Launch a read-only probe for every remaining distinct configured model and require successful model acceptance.
5. Request clean exit, confirm process termination, and confirm unchanged git status.

Successful evidence is the invoked executable and flags, process handles, nonce/sequence round trips, reported root and branch, profile-read acknowledgements, exit statuses, and before/after git status. Because this probes the effective child sessions, an authentication or trust prompt, rejected model, unavailable persistent terminal, cross-wired output, concurrency failure, timeout, or dirty result fails completeness regardless of which native configuration layer caused it.

The selected process adapter does not call native multi-agent spawning. `features.multi_agent`, `agents.max_depth`, and `agents.max_threads` therefore cannot accept or reject a run. An unset thread cap needs no special handling; lane concurrency is controlled by the number of child processes the adapter starts, and the two-session probe establishes the minimum root/analyst/researcher topology.

### Autonomous data flow

```text
active adapter
  -> committed convention completeness
  -> effective child-process preflight
  -> issue/run initialization and tracker reconciliation
  -> isolated worktrees and capacity-aware child processes
  -> framed process report
  -> commit + artifact + predicate verification
  -> required owner/reviewer gate
  -> tracker phase transition
  -> process cleanup, pushes, summary, and close-out
```

The orchestrator reserves capacity for an analyst and researcher process before starting a persistent pair. Additional isolated lanes run in waves. Lane isolation, branch ownership, and mutual blindness are preserved regardless of scheduling.

### Assisted data flow

```text
active adapter
  -> committed convention completeness
  -> orchestrator-authored research and final artifact
  -> owner approval marker
  -> commit + predicate verification
  -> tracker update, push, and close-out
```

Assisted mode does not require the child-process preflight because it launches no phase processes.

### Durable pipeline state

Branches, pipeline-family/run/lane layout, artifact paths and formats, commits, approval markers, and completion predicates remain the only cross-session and cross-tool state. Process handles, message sequences, terminal state, and native controls are transient. Listing, inspection, resume, revision, and fork therefore operate on identical evidence in Codex and Claude Code.

Incomplete Spec or Design work and unapproved-plan work restart cleanly after confirmation. Approved-plan Build or Document work is investigated from plans, commits, and diffs. Resume first reconciles incomplete tracker, push, process cleanup, or configured-monitor cleanup, then runs any required preflight and assigns fresh process handles.

## Key Decisions

### Decision: Keep one shared protocol behind runtime adapters

- **Choice:** Add a Codex distribution/runtime adapter around the canonical skill and profiles. Keep tool-specific discovery, agent execution, models, and optional capabilities in adapters.
- **Alternatives:** Combine all conventions in `.rp.md`; copy the skill for Codex; introduce a new shared orchestration engine.
- **Trade-offs:** Adapters add routing and precedence while avoiding duplicated pipeline contracts and tool-specific leakage into shared prose.
- **Traces to:** Requirements 1–5; acceptance criteria 1–10.

### Decision: Route committed tool configuration with a legacy fallback

- **Choice:** Store shared conventions in `.rp.md`, route new tool-owned values to `.rp.claude.md` or `.rp.codex.md`, and preserve the Claude adapter's existing inline fallback. Prefer the route when both exist.
- **Alternatives:** Put both tools in `.rp.md`; require migration; add separate local override files per tool.
- **Trade-offs:** A route map adds configuration structure. It lets Codex setup preserve working Claude values, keeps inactive configuration irrelevant, and retains one override lookup.
- **Traces to:** Requirements 4 and 5; acceptance criteria 6, 8, and 10.

### Decision: Run Codex agents as CLI child processes

- **Choice:** Use a long-lived local Codex CLI process for every phase-agent invocation. Select its model with `--model`, root it with `--cd`, load its role by direct canonical-profile instruction, and communicate through its terminal handle.
- **Alternatives:** Use in-session collaboration threads; register duplicated native custom agents; build a new executable service.
- **Trade-offs:** Every surface needs authenticated CLI and persistent terminal control, and root must frame terminal messages. In return, the design uses exposed controls for per-role models, worktrees, targeted messaging, waiting, and cleanup without custom-agent drift.
- **Traces to:** Requirements 1, 2, 4, and 5; acceptance criteria 1, 2, 4, 6–8, and 10.

### Decision: Keep Codex persistent-pair transport root-owned

- **Choice:** Root launches the analyst and researcher processes and forwards their framed Q&A verbatim while the analyst owns the questions.
- **Alternatives:** Require nested in-session spawning; let agents discover project configuration; replace the pair with one role.
- **Trade-offs:** Root performs message transport, but role ownership, persistence, model selection, and worktree isolation remain explicit without native nesting.
- **Traces to:** Requirements 2 and 5; acceptance criteria 2, 7, and 10.

### Decision: Probe the effective execution path before mutation

- **Choice:** Use concurrent, read-only child sessions to verify authentication, trust, model access, worktree rooting, profile access, process messaging, capacity, and shutdown after native precedence has resolved.
- **Alternatives:** Infer capability from committed files; reconstruct every native configuration layer; discover failure during the first phase.
- **Trade-offs:** Preflight adds startup time and local sessions. It observes the selected path directly, accepts valid native defaults, and fails before partial pipeline work.
- **Traces to:** Requirements 1, 2, and 5; acceptance criteria 1, 2, 4, 7, 8, and 10.

### Decision: Keep git and predicate-bearing artifacts authoritative

- **Choice:** Preserve branch grammar, run layout, artifact formats, commits, approvals, and completion predicates as durable state. Resume assigns fresh process handles.
- **Alternatives:** Persist terminal state; introduce cross-tool migration.
- **Trade-offs:** Uncommitted runtime progress is disposable, while cross-session and cross-tool operations remain deterministic.
- **Traces to:** Requirements 2 and 3; acceptance criteria 2–5.

### Decision: Preserve assisted semantics without phase agents

- **Choice:** Have the orchestrator produce and commit the same predicate-bearing artifacts after owner approval, with no assisted phase-agent processes.
- **Alternatives:** Force assisted mode through autonomous execution; define Codex-only outcomes.
- **Trade-offs:** Native interaction differs from autonomous mode, but the durable phase result is identical.
- **Traces to:** Requirement 2; acceptance criterion 3.

### Decision: Make monitoring conditional and omit detached recovery

- **Choice:** Invoke monitor operations only when the active adapter configures Health monitoring. Preserve Claude Code's monitor and allow Codex to omit it.
- **Alternatives:** Require a Codex monitor; remove monitoring globally; build detached recovery.
- **Trade-offs:** Unmonitored stalls may require owner interruption and git-based resume, but optional capabilities do not block first-release conformance or regress Claude Code.
- **Traces to:** Requirements 2 and 5; acceptance criteria 7, 9, and 10.

### Decision: Keep repository runtime dependencies unchanged

- **Choice:** Use the installed Codex CLI, terminal control, existing git, and Markdown contracts. Automate executable metadata checks and verify orchestration through black-box surface runs.
- **Alternatives:** Add a daemon, database, hosted service, mandatory integration server, or prompt-structure tests.
- **Trade-offs:** Surface evidence is expensive, but it tests the product boundary without adding repository runtime packages or brittle prose tests.
- **Traces to:** Requirements 1–5; acceptance criteria 1–10.

## Dependencies

The design depends on:

- the canonical Radical Pipelines skill and role profiles;
- native Codex repository discovery for the invoking surface;
- an authenticated local Codex CLI supporting `--model` and `--cd`;
- surface terminal control that can keep two child processes live, address their stdin/stdout separately, poll them, and interrupt them;
- raw git branches, commits, and worktrees;
- Markdown configuration and pipeline artifacts;
- existing project-selected Issues, Guardrails, tracker, remote, and approval conventions; and
- Claude Code only for bidirectional interoperability and regression verification.

The repository adds no package or lockfile dependency, daemon, database, hosted service, mandatory integration server, custom-agent profile copy, health monitor, or detached recovery service. A selected Codex distribution manifest participates in version synchronization only if its schema stores the project version.

## Failure Modes and Observability

- **Committed configuration failure:** A missing or duplicate route, unreadable or out-of-repository file, conflicting unit, or incomplete committed convention stops before mutation. The error identifies the adapter, path, missing item, and setup action. Local overrides cannot mask it.
- **Executable or authentication failure:** A missing CLI or failed authenticated launch reports the executable resolution and native error, then directs setup to install or sign in to Codex.
- **Trust or repository-access failure:** A trust prompt, wrong root, unreadable profile, or rejected repository access reports the expected and observed root/branch and directs setup to trust the project or correct its Codex repository access.
- **Model failure:** Rejection of a configured role or default model identifies the convention unit, role, requested model, command result, and setup action to choose an accessible model.
- **Terminal-contract failure:** Missing persistent-process control, crossed nonce/sequence replies, failed stdin/stdout routing, timeout, or failed clean exit reports both process records and native output. Setup identifies the missing surface capability. A reproducible failure on a required surface blocks release conformance.
- **Probe mutation:** Changed git status after preflight fails completeness, preserves the diff, and requires owner-directed cleanup before retry.
- **Runtime capacity shortage:** The preflight establishes two concurrent child sessions. Later transient saturation queues work. Failure to reserve a persistent pair stops before launching either role.
- **Process failure:** Unexpected exit, failed write/read, lost handle, cancellation, or interrupt failure stops the active run. Diagnostics include role, handle, lane, model, expected and actual worktree/branch/HEAD/status, last sequence, native output, commit, artifact, predicate result, and next safe action.
- **Worktree/ref mismatch:** Each process verifies its worktree and branch before writing. A mismatch stops it. Commits on an unintended ref are preserved for owner-directed cleanup.
- **False completion:** A terminal report is followed by verification of the expected commit, artifact, and predicate. Missing evidence stops progression.
- **Tracker failure:** Run-start failure stops before phase processes. Phase-status failure stops before the next phase while preserving the completed predicate. Resume reconciles tracker state before dispatch.
- **Push or close-out failure:** Process cleanup, configured-monitor cancellation, tracker cleanup, pushes, and reporting are attempted independently. Every result is surfaced, and local commits remain intact.
- **Agent blocker or rejection cycle:** Existing blocker/fork behavior remains. Every third rejection triggers the existing repetition inspection.
- **Unmonitored Codex stall:** The owner may interrupt and resume from git. Monitoring absence does not change completion evidence.

Observable evidence consists of preflight commands and process handles, nonce/sequence frames, native output and exit statuses, branch/worktree state, commits and SHAs, artifacts, guardrail output, rejection records, approval markers, summaries, tracker state, pushes, cleanup results, and predicate evaluations. No process identity is needed after the session.

## Acceptance Verification

| Criterion | Verification evidence |
| --- | --- |
| 1. Surface coverage | Desktop, CLI, and IDE each pass the child-process preflight and complete an autonomous run through Document with committed artifacts and matching phase outcomes. |
| 2. Autonomous workflow | A run through Document records the analyst/researcher processes and Q&A frames, fresh role processes, model flags, worktrees, reviews, approvals, guardrails, commits, tracker transitions, predicates, pushes, summaries, and close-out. |
| 3. Assisted workflow | Assisted Spec and Design-doc on every surface launch no phase processes and commit research, final artifact, approval marker, tracker result, and close-out evidence. |
| 4. Pipeline operations | Create/list/resume/revise/fork scenarios verify existing versioning, branch, worktree, lane, artifact, restart, investigation, and cleanup behavior; resumed agents receive fresh process handles. |
| 5. Cross-tool continuation | Each tool lists, resumes, revises, and forks pipelines created by the other with matching state and no migration commit or artifact rewrite. |
| 6. Configuration coexistence | Add routed Codex configuration to a working Claude project, preserve Claude values verbatim, exercise active-only routing and overrides, then run both tools successfully. |
| 7. Surface capability differences | Distribute divergent topology, multilane isolation, model override, and capacity-wave cases across the surfaces while comparing durable outcomes rather than controls. |
| 8. Incomplete setup | Missing route/file, CLI/authentication, trust/repository access, model access, profile access, persistent terminal control, two-process capacity, message round trip, or clean shutdown each fails before new pipeline state and reports its setup action. Native multi-agent/depth/thread settings do not affect the selected path. |
| 9. Optional monitoring | Run Codex without Health monitoring on every surface and complete normally. |
| 10. No Claude Code regression | Verify unchanged install/invocation, autonomous and assisted outcomes, artifacts, predicates, and configured monitor behavior. |

Automated verification runs the existing test suite, changeset validation, version drift checks, and the selected native manifest validator. If the Codex manifest stores the project version, version synchronization and drift tests cover it. Manual records include surface/runtime and child CLI versions, executable and flags, process handles, message frames, model choices, worktrees and branches, native output, exit statuses, SHAs, committed artifacts, guardrail output, tracker state, pushes, and close-out results. Every surface runs failure probes for trust, authentication, model selection, and process messaging, confirms unchanged git state, then completes the two-process probe and an autonomous nested-role-equivalent analyst/researcher flow.

## Risks and Open Questions

- **CLI availability across surfaces:** Each surface must expose an authenticated CLI and process-specific terminal control. The three-surface release matrix validates this. A surface that cannot run the contract returns the design for revision rather than reducing surface scope or role parity.
- **Terminal protocol robustness:** Native output may include unframed logs or prompts. Nonce/sequence framing and process-specific streams separate messages; any ambiguity stops the run and preserves git evidence.
- **Legacy configuration regression:** A route-only loader would break existing projects. Preserve the adapter fallback and flat local overrides, then verify an unchanged legacy project before and after Codex installation.
- **Canonical profile access:** Child processes load repository profiles directly. A profile-read failure is a setup failure; prompt bodies are not copied into custom-agent configuration.
- **Partially applied setup:** An interrupted route/file update could leave mixed configuration. Confirm and apply the complete set together, then validate both active tools before setup succeeds.
- **Silent stalls without monitoring:** Codex may require owner interruption followed by git-based resume. This is accepted for the first release.
- **Cross-tool drift:** Keep branch, artifact, and predicate contracts single-sourced and require bidirectional continuation evidence without migrations.
- **Manual evidence cost:** Record surface/runtime versions, process transcripts, refs, SHAs, artifacts, tracker state, and close-out results so the matrix remains reproducible.
