# Design Doc: Codex support

## Overview

Radical Pipelines will support the Codex desktop app, CLI, and IDE extension when they operate on a local repository. Codex will use its native convention-based discovery, configuration, agent, messaging, model, shell, and worktree mechanisms while sharing the existing pipeline protocol with Claude Code. Parity means normal successful execution produces the same commits, artifacts, approvals, tracker state, phase outcomes, and close-out results; it does not require identical runtime controls.

The design adds a Codex distribution/runtime adapter and routes project configuration to the active tool. Shared orchestration, roles, branch grammar, run layout, artifact formats, phase boundaries, approval gates, and completion predicates remain canonical and unchanged. Existing inline Claude Code configuration remains valid. Health monitoring is conditional, and detached recovery is not part of the first release.

## Approach

The system has two layers:

1. The shared protocol defines issue and pipeline operations, autonomous and assisted workflows, phase topology, agent roles, worktree isolation, guardrails, approvals, artifacts, commits, tracker synchronization, completion predicates, and close-out.
2. An active-tool adapter defines convention discovery, native prerequisites, profile binding, spawning and addressing, model selection, and optional runtime capabilities.

At invocation, Radical Pipelines identifies the active adapter and resolves a committed configuration view before creating pipeline state. The shared project file supplies tool-neutral conventions and may route the active adapter to a separate committed file. The adapter may provide a durable inline fallback for existing configurations. Only the active tool participates in resolution. Committed completeness is validated before local overrides are applied; any failure enters the existing setup path before branches, worktrees, or artifacts are created. For Codex, this gate also validates an effective `agents.max_depth` of at least 2 and a native concurrent-thread cap of at least 3, enough for the root, analyst, and researcher.

Codex exposes the canonical skill and `agents/<role>.md` profiles through native convention-based discovery. Its adapter translates shared orchestration requests into native spawns and keeps opaque runtime agent IDs in memory. Git remains the durable state boundary: the orchestrator verifies worktrees and branches before spawning, and verifies the expected commit, artifact, and completion predicate after an agent reports completion.

Autonomous Spec and Design-doc phases run one persistent analyst/researcher pair per lane, with the analyst owning Q&A for the pair. The shared protocol leaves launch ownership to the active adapter. Claude Code retains its current root-owned launch of both agents. Codex root spawns the analyst with a complete delegated-researcher descriptor; the analyst spawns exactly one researcher and addresses it by returned ID for the full Q&A. Writers, reviewers, consolidators, plan agents, and task agents are fresh instances. Agents that share a run worktree execute sequentially and commit before the next starts. Isolated lanes retain separate branches and worktrees and run independently in capacity-aware waves.

Assisted phases use no phase agents. The orchestrator produces the same research and final artifacts, records owner approval, commits the predicate-bearing artifact set, updates the tracker, pushes, and closes the run. Pipeline creation, listing, resumption, revision, and forking continue to derive state from the existing branch and artifact contracts, so either supported tool can continue the other's work without migration. Resume creates fresh runtime IDs and reconstructs progress from git evidence.

Health-monitor operations run only when the active adapter declares and configures them. Claude Code retains its required monitor behavior; Codex may run without monitoring. Normal synchronous execution, durable git evidence, and the existing resume rules provide first-release failure visibility and recovery. No detached state or recovery mechanism is added.

## Components

- **Canonical skill and role profiles:** Remain the single source for shared workflow behavior and role instructions. The Codex distribution/configuration component exposes these sources through native discovery without copying their bodies.
- **Convention loader:** `skills/radical-pipelines/reference/conventions/load.md` selects the active adapter, resolves its route or fallback, merges shared and active-tool units, validates committed completeness, and then applies permitted local overrides.
- **Convention setup:** `skills/radical-pipelines/reference/conventions/setup.md` uses the same resolution model. After owner confirmation, it writes the shared file, active routed file, and route entry as one coherent change. Adapter selection is based on a normalized identifier rather than a hard-coded tool table.
- **Tool adapters:** `conventions/claude-code.md` owns Claude Code discovery, fallback, root-owned persistent-pair launch, spawn/model conventions, native prerequisites, and required monitoring. New `conventions/codex.md` owns Codex discovery, analyst-owned researcher launch, spawn/address/model conventions, native prerequisites, and optional monitoring. Its prerequisites include effective nesting depth of at least 2 and a native concurrent-thread cap of at least 3.
- **Project configuration:** `.rp.md` contains shared conventions and the route map. `.rp.claude.md` and `.rp.codex.md` contain committed tool-owned values. `.rp.local.md` remains the single uncommitted override file.
- **Codex distribution/configuration:** Native Codex metadata binds the canonical skill and profiles to each local Codex surface. Concrete filenames and schema follow the accepted Codex discovery convention selected during implementation. The effective native configuration exposes nesting depth and concurrent-thread capacity to completeness validation.
- **Shared autonomous and resume references:** Define one persistent analyst/researcher pair per lane, analyst-owned Q&A, lane isolation, scheduling outcomes, and monitor lifecycle without assigning launch ownership. Each adapter assigns launch ownership, and each spawning owner receives every required spawn input.
- **Health monitoring:** `health-monitoring.md` remains one shared policy whose operations are conditional on the active adapter's configured capability.
- **Release and documentation surfaces:** README, package description, website documentation, contributor guidance, and a minor changeset describe the new supported tool. A version-bearing Codex manifest, if selected, joins version synchronization, drift checks, release coverage, and behavioral tests.
- **Unchanged contracts:** Pipeline versioning, branch and worktree topology, artifacts, phase predicates, agent profiles, guardrails, Claude manifest behavior, dependencies, and release workflow retain their current semantics.

## Interfaces and Data Flow

### Project convention contract

The committed root `.rp.md` ends with a route map:

```markdown
## Tool conventions

`claude-code`: `.rp.claude.md`
`codex`: `.rp.codex.md`
```

Adapter IDs are stable. Route values are committed, repository-root-relative Markdown paths. Each active adapter contributes its expected route, any supported inline fallback, native prerequisites, canonical spawn/model conventions, and monitoring requirement.

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
5. Validate the committed merged view and native prerequisites, including Codex nesting depth and concurrent-thread capacity.
6. Apply flat whole-unit overrides, then more-specific active-adapter units, from the main-root `.rp.local.md`.

Inactive routes and files do not participate. Missing routes, files, units, or prerequisites invoke setup before any pipeline mutation. Local overrides cannot repair committed incompleteness.

### Agent spawn and addressing contract

Every spawn receives:

- the canonical `agents/<role>.md` profile through native binding or an explicit read-and-follow directive;
- the verbatim task payload and conventions-passing block;
- the role model override, otherwise `Default`, otherwise the native default, passed opaquely to the runtime;
- the assigned worktree and branch; and
- all role-specific delegated-spawn inputs.

The shared persistent-pair contract requires one analyst and one researcher per lane, kept available for the lane's Q&A, with the analyst owning that exchange. Launch ownership is adapter-specific. Claude Code keeps the current behavior in which root launches both agents. Codex uses root → analyst → researcher.

Codex records each successful spawn in memory as:

```text
{ role, lane, worktree, branch, opaqueAgentId, state }
```

Every message, follow-up, wait, and close targets `opaqueAgentId`. A missing ID is a failed spawn. IDs are never committed and never used for resume.

For a Codex persistent pair, root supplies the analyst with a delegated-researcher descriptor containing the exact researcher role/profile, resolved model/settings, task, and conventions. The analyst spawns one researcher from that descriptor and retains the returned ID throughout Q&A; it does not resolve project configuration itself. All non-persistent role invocations receive fresh IDs.

### Autonomous data flow

```text
active adapter
  -> committed convention completeness
  -> issue/run initialization and tracker reconciliation
  -> isolated phase worktrees and capacity-aware agent execution
  -> agent report
  -> commit + artifact + predicate verification
  -> required owner/reviewer gate
  -> tracker phase transition
  -> pushes, cleanup, summary, and run close-out
```

Codex completeness requires an effective `agents.max_depth` of at least 2 and a configured concurrent-thread cap of at least 3 before issue or pipeline state is created. After that gate passes, the orchestrator reserves live capacity for root, analyst, and researcher before starting a Codex persistent pair. Transient saturation queues work. Additional isolated lanes run in waves when capacity is constrained. Lane isolation, branch ownership, and mutual blindness are preserved regardless of scheduling.

### Assisted data flow

```text
active adapter
  -> committed convention completeness
  -> orchestrator-authored research and final artifact
  -> owner approval marker
  -> commit + predicate verification
  -> tracker update, push, and close-out
```

### Durable pipeline state

Branches, pipeline-family/run/lane layout, artifact paths and formats, commits, approval markers, and completion predicates remain the only cross-session and cross-tool state. Runtime task lists, native controls, and opaque agent IDs are transient. Listing, inspection, resume, revision, and fork therefore operate on identical evidence in Codex and Claude Code.

Incomplete Spec or Design work and unapproved-plan work restart cleanly after confirmation. Approved-plan Build or Document work is investigated from plans, commits, and diffs. Resume first reconciles incomplete tracker, push, or configured-monitor cleanup, then assigns fresh runtime IDs.

## Key Decisions

### Decision: Keep one shared protocol behind runtime adapters

- **Choice:** Add a Codex-native distribution/runtime adapter around the canonical skill and profiles. Keep tool-specific discovery, spawning, models, and optional capabilities in adapters.
- **Alternatives:** Combine all conventions in `.rp.md`; copy the skill for Codex; introduce a new executable orchestration engine.
- **Trade-offs:** Adapters add explicit routing and precedence, but avoid duplicated contracts, runtime dependencies, and tool-specific leakage into shared prose.
- **Traces to:** Requirements 1–5; acceptance criteria 1–10.

### Decision: Route committed tool configuration with a legacy fallback

- **Choice:** Store shared conventions in `.rp.md`, route new tool-owned values to `.rp.claude.md` or `.rp.codex.md`, and preserve the Claude adapter's existing inline configuration as a fallback. Prefer the route when both exist.
- **Alternatives:** Put both tools in `.rp.md`; require migration to routed files; add separate local override files per tool.
- **Trade-offs:** A route map adds configuration structure. It lets Codex setup avoid rewriting working Claude values, keeps inactive configuration irrelevant, and retains one local override lookup.
- **Traces to:** Requirements 4 and 5; acceptance criteria 6, 8, and 10.

### Decision: Use Codex convention-based discovery for canonical sources

- **Choice:** Bind the existing skill and role profiles through Codex-native repository conventions, using a read-and-follow directive when direct file binding is unavailable.
- **Alternatives:** Embed or copy prompt bodies into Codex metadata; maintain Codex-specific profiles.
- **Trade-offs:** Native binding depends on the selected schema but preserves one source of truth and prevents profile drift.
- **Traces to:** Requirements 1, 4, and 5; acceptance criteria 1, 6, 8, and 10.

### Decision: Address agents by transient opaque ID

- **Choice:** Keep an in-memory record for each instance and target every operation by its returned ID. Use commits and artifacts, not reports or IDs, as completion evidence.
- **Alternatives:** Route by reusable role name; persist runtime IDs as pipeline state.
- **Trade-offs:** The spawning owner must retain more runtime state, but fresh iterations remain unambiguous and resume stays independent of transient sessions.
- **Traces to:** Requirement 2; acceptance criteria 2, 4, 5, and 7.

### Decision: Keep persistent-pair ownership adapter-specific

- **Choice:** The shared protocol defines one persistent analyst/researcher pair and analyst-owned Q&A while each adapter owns launch topology. Claude Code keeps root-owned launch of both roles. Codex root supplies a fully resolved descriptor to the analyst, which launches and owns exactly one researcher for the lane's complete Q&A.
- **Alternatives:** Require one launch topology for both tools; let the Codex analyst rediscover project configuration; replace the pair with one agent.
- **Trade-offs:** Adapter-specific ownership adds two launch paths. It preserves the shared role/Q&A invariant, fits Codex opaque-ID addressing, and avoids changing Claude Code behavior.
- **Traces to:** Requirements 2 and 5; acceptance criteria 2, 7, and 10.

### Decision: Validate Codex nesting before capacity-aware scheduling

- **Choice:** During completeness, require effective Codex nesting depth of at least 2 and a concurrent-thread cap of at least 3. After validation, reserve the root/analyst/researcher minimum, run additional isolated lanes independently as capacity permits, and keep shared-worktree agents sequential.
- **Alternatives:** Discover insufficient nesting at the first researcher spawn; require every lane to run simultaneously; relax lane isolation.
- **Trade-offs:** The preflight adds native configuration validation and waves may extend elapsed time. Known prerequisites fail before pipeline mutation while required roles, isolation, commits, and outcomes remain intact.
- **Traces to:** Requirements 1, 2, and 5; acceptance criteria 1, 2, 4, 7, 8, and 10.

### Decision: Keep git and predicate-bearing artifacts authoritative

- **Choice:** Preserve the existing branch grammar, run layout, artifact formats, commits, approvals, and completion predicates as durable state. Resume assigns fresh runtime IDs.
- **Alternatives:** Persist native runtime state; introduce a migration layer between tools.
- **Trade-offs:** Runtime progress before a commit is intentionally disposable, while cross-session and cross-tool operations remain deterministic and interoperable.
- **Traces to:** Requirements 2 and 3; acceptance criteria 2–5.

### Decision: Preserve assisted semantics without phase agents

- **Choice:** Have the orchestrator produce and commit the same predicate-bearing artifacts after owner approval, with no assisted phase-agent spawns.
- **Alternatives:** Force assisted mode through autonomous topology; define Codex-only assisted outcomes.
- **Trade-offs:** Native interaction differs from autonomous mode, but the durable phase result remains identical.
- **Traces to:** Requirement 2; acceptance criterion 3.

### Decision: Make monitoring conditional and omit detached recovery

- **Choice:** Invoke shared monitor operations only when the active adapter configures Health monitoring. Preserve Claude Code's monitor and allow Codex to omit it.
- **Alternatives:** Require a Codex monitor; remove monitoring globally; build detached recovery for Codex.
- **Trade-offs:** Unmonitored stalls may require owner interruption and resume from git, but optional capabilities do not block normal first-release conformance or regress Claude Code.
- **Traces to:** Requirements 2 and 5; acceptance criteria 7, 9, and 10.

### Decision: Keep the runtime dependency-free and verify outcomes on real surfaces

- **Choice:** Use prose/config adapters plus existing git and Markdown contracts. Automate executable metadata checks and verify orchestration through black-box surface runs.
- **Alternatives:** Add a daemon, database, hosted service, mandatory integration server, or prompt-structure tests.
- **Trade-offs:** Manual surface evidence is expensive, but it tests the actual product boundary. Automated checks remain focused on executable manifests, releases, and version drift rather than duplicating prose in brittle tests.
- **Traces to:** Requirements 1–5; acceptance criteria 1–10.

## Dependencies

The design depends on:

- the canonical Radical Pipelines skill and role profiles;
- Codex convention-based repository discovery and native local agent, messaging, model, shell, worktree, depth-2 nested-spawn, and three-thread capabilities;
- raw git branches, commits, and worktrees;
- Markdown configuration and pipeline artifacts;
- existing project-selected Issues, Guardrails, tracker, remote, and approval conventions; and
- Claude Code only for bidirectional interoperability and regression verification.

It adds no package, lockfile dependency, daemon, database, hosted service, mandatory integration server, health monitor, or detached recovery service. A selected Codex manifest participates in version synchronization only if its schema stores the project version.

## Failure Modes and Observability

- **Configuration failure:** A missing/duplicate route, unreadable or out-of-repository file, conflicting unit, incomplete committed convention, missing native prerequisite, Codex `agents.max_depth` below 2, or Codex concurrent-thread cap below 3 stops before pipeline mutation. The error identifies the adapter ID, path or native setting, effective value, required value, exact missing items, and setup action. Local overrides cannot mask it.
- **Setup interruption:** Setup confirms the complete write set and treats the shared file, route, and active tool file as one change. Existing inline Claude values remain available until the routed configuration validates.
- **Capacity shortage:** A configured cap below the Codex three-thread minimum fails completeness. With valid configuration, transient saturation waits until root plus an analyst/researcher pair can run. A required surface that cannot honor valid depth and capacity settings fails its release smoke rather than narrowing roles or surface coverage.
- **Spawn/address failure:** A spawn error, missing opaque ID, failed ID-targeted operation, lost ID, cancellation, or agent failure stops the active run. Diagnostics include role, ID, lane, expected and actual worktree/branch/HEAD/status, last successful message, commit, artifact, native error, predicate result, and next safe action.
- **Worktree/ref mismatch:** Every agent verifies its worktree and branch before writing. A mismatch stops the agent. Commits on an unintended ref are preserved for owner-directed cleanup.
- **False completion:** An agent report is followed by verification of the expected commit, artifact, and predicate. Missing evidence stops progression.
- **Tracker failure:** Run-start failure stops before phase agents. Phase-status failure stops before the next phase while preserving the completed predicate. Resume reconciles tracker state before dispatch.
- **Push or close-out failure:** Monitor cancellation when configured, tracker cleanup, pushes, and reporting are attempted independently. Each result is surfaced, and local commits remain intact.
- **Agent blocker or rejection cycle:** Existing verbatim blocker/fork behavior remains. Every third rejection triggers the existing repetition inspection.
- **Unmonitored Codex stall:** The owner may interrupt and resume from git. Its absence does not change completion evidence or require detached recovery.

Observable evidence consists of native errors and logs, branch/worktree state, commits and SHAs, committed artifacts, guardrail output, rejection records, approval markers, summaries, tracker state, pushes, cleanup results, and completion-predicate evaluations. No runtime agent identity is needed after the session.

## Acceptance Verification

| Criterion | Verification evidence |
| --- | --- |
| 1. Surface coverage | Complete autonomous runs through Document on desktop, CLI, and IDE, with committed artifacts and identical phase outcomes. |
| 2. Autonomous workflow | A run from an issue through Document records required roles, persistent pairs, reviews, approvals, guardrails, commits, tracker transitions, predicates, pushes, summaries, and close-out. |
| 3. Assisted workflow | Assisted Spec and Design-doc on every surface use no phase agents and commit research, final artifact, approval marker, tracker result, and close-out evidence. |
| 4. Pipeline operations | Create/list/resume/revise/fork scenarios verify existing versioning, branch, worktree, lane, artifact, restart, investigation, and cleanup behavior. |
| 5. Cross-tool continuation | Each tool lists, resumes, revises, and forks pipelines created by the other with matching state and no migration commit or artifact rewrite. |
| 6. Configuration coexistence | Add routed Codex configuration to a working Claude project, preserve Claude values verbatim, exercise active-only routing and overrides, and run both tools successfully. |
| 7. Surface capability differences | Distribute divergent topology, multilane isolation, and capacity-wave cases across the three surfaces while comparing durable outcomes rather than controls. |
| 8. Incomplete setup | Missing route, file, Team spawning, native profile, Codex depth-2 nesting, or Codex three-thread capacity each stops before new pipeline state and surfaces the setup path. |
| 9. Optional monitoring | Run Codex without Health monitoring on every surface and complete normally. |
| 10. No Claude Code regression | Verify unchanged install/invocation, root-owned persistent-pair launch, autonomous and assisted outcomes, artifacts, predicates, and configured monitor behavior. |

Automated verification runs the existing test suite, changeset validation, version drift checks, and the selected native manifest validator. If the Codex manifest stores the project version, version synchronization and drift tests cover it. Manual records include surface/runtime version, effective nesting/thread settings, transcripts, role/ID/model records, worktree and branch listings, logs, SHAs, artifacts read from commits, guardrail output, tracker state, pushes, and close-out results. Each Codex surface verifies that depth or thread settings below the minimum fail before pipeline mutation, then completes the nested-pair smoke with valid settings.

## Risks and Open Questions

- **Native binding selection:** The concrete Codex repository paths, manifest/profile schema, and install/discovery commands are an implementation choice under the accepted convention-based discovery premise. Validate the chosen binding on all three local surfaces and determine whether its manifest stores the project version.
- **Nested capacity:** Every Codex invocation checks effective `agents.max_depth` of at least 2 and a concurrent-thread cap of at least 3 before pipeline mutation. Desktop, CLI, and IDE smoke tests then confirm each surface honors valid settings. A configuration mismatch enters setup; a surface that cannot honor them blocks release rather than changing role ownership or scope.
- **Legacy configuration regression:** A route-only loader would break existing projects. Preserve the adapter fallback and flat local overrides, and verify an unchanged legacy project before and after Codex installation.
- **Canonical profile binding:** If native metadata cannot reference source files, use explicit read-and-follow instructions. If neither mechanism preserves canonical sources, return to design instead of copying prompt bodies.
- **Partially applied setup:** An interrupted route/file update could leave mixed configuration. Confirm and apply the complete set together, then validate both active tools before setup succeeds.
- **Silent stalls without monitoring:** Codex may require owner interruption followed by git-based resume. This is accepted for the first release; monitoring and detached recovery remain optional.
- **Cross-tool drift:** Any duplicated branch, artifact, or predicate contract risks divergence. Keep these contracts single-sourced and require bidirectional continuation evidence without migrations.
- **Manual evidence cost:** Surface behavior changes with runtime versions. Record versions, transcripts, IDs/models, refs, SHAs, artifacts, tracker state, and close-out results so the matrix is reproducible.
