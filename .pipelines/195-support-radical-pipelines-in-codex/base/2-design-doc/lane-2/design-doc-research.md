# Design Research: Codex support

## Research

### Existing execution boundary

The repository already separates a tool-neutral pipeline protocol from a Claude-specific adapter:

- `skills/radical-pipelines/SKILL.md:17-29,41-54` loads project conventions before entering issue operations.
- `skills/radical-pipelines/reference/conventions/load.md:3-34` enforces completeness and applies local overrides.
- `skills/radical-pipelines/reference/work-on-an-issue.md:13-57` and the create, resume, revision, and fork references select operations without naming a runtime.
- `skills/radical-pipelines/reference/autonomous-workflow.md:23-70,88-94` owns topology and phase orchestration while delegating spawn and model mechanics to project conventions.
- `skills/radical-pipelines/reference/assisted-workflow.md:3-28` writes and commits the same predicate-bearing artifacts without spawning phase agents.
- `skills/radical-pipelines/reference/pipeline-versioning.md:5-40,49-64` defines the interoperable branch, run, lane, artifact, and completion contracts in git and Markdown.

The root `agents/` profiles are runtime-neutral: a repository-wide search found no Claude, Codex, teammate, monitor-tool, MCP, or subagent terms. Claude-specific behavior is confined to its manifest, install documentation, `conventions/claude-code.md`, tool-specific project conventions, and unconditional health-monitor calls. Health monitoring is currently required by `conventions/load.md:14-18` and `conventions/setup.md:91-95`, then started or cancelled by `autonomous-workflow.md:35-39,88-93` and `resume-pipeline.md:7-10`.

### Configuration and component boundaries

`AGENTS.md:11-16` requires generic skill prose and confines tool names to conditionally loaded, tool-dedicated files. The current supported-tool table in `conventions/setup.md:15-24` is therefore a leak to remove rather than extend. `conventions/load.md` can own one generic resolution algorithm: read `.rp.md`, select the active tool's configured route, read that file, validate the committed merged view, then apply permitted `.rp.local.md` overrides. Setup can reuse that algorithm and conditionally load the matching adapter file without enumerating tools.

Current release metadata has one versioned secondary manifest: `.claude-plugin/plugin.json`. `scripts/sync-version.mjs:29-37` and `scripts/check-version-sync.mjs:43-74` enumerate it, while `package.json:1-17` introduces no runtime dependencies. A Codex-native manifest joins version synchronization only if its schema contains this project's version.

### Agent orchestration seams

The shared spec and design phase references currently prescribe that the root launches both persistent agents (`autonomous-phases/1 - spec.md:34-40`; `autonomous-phases/2 - design-doc.md:39-46`). Their real invariant is a persistent analyst/researcher pair per lane; ownership can be delegated to the active Team spawning convention. Build and Document writers already have a stronger durable boundary: agents sharing a run worktree execute sequentially and commit before the next starts (`autonomous-phases/3 - build.md:41-45`; `autonomous-phases/4 - document.md:42-46`). Git commits, not runtime task lists or agent IDs, remain the progress record.

Codex opaque IDs are runtime-only handles. The stable cross-session state remains the branch and committed artifacts used by `pipeline-versioning.md:49-64` and `resume-pipeline.md:15-29`. Isolated lanes require distinct branches, worktrees, and mutual blindness, but outcome parity does not require every lane to occupy a simultaneous runtime slot.

### Existing recovery and observability

Resume already treats git as authoritative: it derives the active phase from completion predicates, restarts incomplete Spec/Design work cleanly, and reconstructs approved-plan Build/Document progress from plans, commits, and diffs (`resume-pipeline.md:15-30`). The autonomous workflow stops on blockers with a structured payload and detects potentially repeating rejection cycles (`autonomous-workflow.md:61,72-94`). Project Issues conventions require tracker reconciliation and branch pushes at run boundaries (`.rp.md:26-39`). These mechanisms require no persisted runtime agent identity.

### Dependency surface

Codex support depends on the canonical skill and profiles, the new adapter/distribution metadata, project convention routing, raw git/worktrees, Markdown artifacts, and existing Issues and Guardrails conventions. Runtime prerequisites are a local Codex surface with repository, shell, subagent/profile, messaging, and model access (established by `spec-research.md:118-121`), plus project-selected tracker, remote, and guardrail access. Claude Code is needed only for bidirectional and regression verification. `package.json:2-17` remains private and currently has only Changesets development dependencies.

## Topics

### Topic: End-to-end approach

- **Spec link:** Requirements 1–5; acceptance criteria 1–10
- **Options:**
  1. Add a Codex-native distribution/runtime adapter around the shared skill and profiles, route `.rp.md` to active-tool convention files, and make optional runtime capabilities conditional.
  2. Keep all shared, Claude, and Codex conventions in one `.rp.md`.
  3. Copy the skill for Codex or introduce a new executable orchestration engine.
- **Trade-offs:** Option 1 adds explicit routing and precedence rules but isolates tool configuration and retains one protocol. Option 2 changes the file containing working Claude configuration and couples tool sections. Option 3 duplicates contracts or adds an unnecessary software layer and dependency surface.
- **Decision:** Use a native Codex distribution/runtime adapter with the existing shared orchestration protocol. New setup keeps shared conventions in `.rp.md` and routes active tools to `.rp.claude.md` or `.rp.codex.md`; adapters may declare a durable inline fallback for existing configurations. Completeness requires shared conventions plus the active tool's required conventions. Codex and Claude expose the canonical skill and role profiles through their native conventions. Run monitoring only when the active-tool configuration supplies it.
- **Rationale:** The shared phase, git, artifact, review, and completion machinery already delivers the required outcomes. Adapting only distribution, convention selection, agent spawning, models, and optional runtime capabilities minimizes regression and contract drift. It also realizes configuration coexistence without requiring identical runtime mechanics. Claude continues to supply and use its existing monitor; Codex may omit one in the first release. `pipeline-versioning.md` remains unchanged.

### Topic: Components and configuration ownership

- **Spec link:** Requirements 1, 4, and 5; acceptance criteria 1, 6, 8, and 10
- **Options:**
  1. Route shared `.rp.md` to separate committed tool files and keep one qualified `.rp.local.md`.
  2. Put all tool sections in `.rp.md`.
  3. Route committed files and add separate local override files per tool.
- **Trade-offs:** Option 1 adds a route map but isolates committed ownership and retains one override lookup. Option 2 is smaller but makes Codex setup edit the file containing working Claude values. Option 3 separates overrides further but adds lookup, ignore, and migration behavior without a requirement.
- **Decision:**
  - `conventions/load.md` owns the tool-neutral routing and precedence algorithm. It prefers the active route, then consults the active adapter's declared inline fallback. `conventions/setup.md` reuses the algorithm, selects the adapter by normalized active-tool identifier, and writes only the shared file, active routed file, and route entry after confirmation.
  - `conventions/claude-code.md` declares the `.rp.claude.md` route, today's inline Claude block as a durable fallback, canonical spawn/model/monitor content, required monitor, and native prerequisites. New `conventions/codex.md` declares the `.rp.codex.md` route, native profile/config discovery, spawn/address/worktree/model behavior, optional monitor, and setup actions. No other skill file names either tool.
  - New project `.rp.md` files contain shared conventions and a `Tool conventions` map. `.rp.claude.md` and `.rp.codex.md` contain their tool-owned values. Existing inline Claude configuration remains valid. One `.rp.local.md` keeps today's flat whole-unit overrides; an active-adapter-qualified unit may override its flat counterpart. Routing and Guardrails stay committed-only, and overrides apply only after committed completeness passes.
  - A new Codex-native distribution/config component exposes the canonical `skills/radical-pipelines/` and `agents/` sources without copying prompt bodies. Its native filename/schema is supplied by the Codex convention assumed by the approved design premise.
  - Modify autonomous/resume/health-monitor references to make monitor operations conditional. Make the autonomous Spec/Design persistent-pair and isolated-lane scheduling language mechanism-neutral, and assign spawn-input obligations to each spawning owner. Modify README, package description, website documentation, and changeset coverage for Codex. Add the Codex manifest to version sync, drift checks, contributor guidance, and their behavioral tests only when it carries a version.
  - Leave `SKILL.md`, `pipeline-versioning.md`, agent profiles, `conventions/passing.md`, `guardrails.md`, Claude manifest behavior, git topology, artifact contracts, dependencies, and release workflow unchanged. Record the backward-compatible feature with a minor changeset per `CONTRIBUTING.md:62-75`.
- **Rationale:** Each value has one owner: generic files define selection, tool adapters define native requirements and canonical tool conventions, project files hold configured values, and shared protocol files define outcomes. Setup can add the Codex route and `.rp.codex.md` without altering existing inline Claude values; new projects use routed files. The inactive routed file may be absent and never blocks the active tool. If both an active route and fallback exist, the route wins.

### Topic: Interfaces and data flow

- **Spec link:** Requirements 2–4; acceptance criteria 2–8
- **Options:**
  1. Use an explicit stable-adapter-ID route map and opaque-ID agent records; make shared orchestration state invariants mechanism-neutral.
  2. Infer tool files from filenames and route agents by reusable role names.
  3. Persist runtime agent IDs as pipeline state.
- **Trade-offs:** An explicit route map makes missing or conflicting setup inspectable. Opaque IDs avoid ambiguity across fresh review iterations but require each spawning owner to retain an in-memory record. Persisting IDs would couple resumable git state to transient sessions. Capacity-aware lane waves can take longer than full parallel launch but preserve isolation and outcomes on constrained surfaces.
- **Decision:**
  - `.rp.md` ends with `## Tool conventions`, mapping stable adapter IDs such as `` `claude-code`: `.rp.claude.md` `` and `` `codex`: `.rp.codex.md` ``. Values are committed repository-root-relative Markdown paths.
  - New local overrides use `## Shared overrides` for shared convention units and `## Tool overrides` with one `### <adapter-id>` subsection for each tool's units. A legacy flat convention unit remains valid; for the active view, its adapter-qualified counterpart wins. Routes and Guardrails cannot appear in local overrides.
  - Resolution is: identify the active adapter ID; use its single configured route when present, otherwise use its adapter-declared inline fallback; require a readable in-repository routed target; merge shared and active-tool units with duplicate names rejected; validate committed shared plus adapter prerequisites; then apply flat whole-unit overrides and any more-specific active-adapter unit from the main-root `.rp.local.md`. Inactive routes never participate. Any failure enters setup before pipeline creation.
  - Shared phase references say to start one persistent analyst/researcher pair per lane through the active Team spawning convention. The analyst owns Q&A; tool adapters choose launch topology. `autonomous-workflow.md` assigns profile, prompt, conventions, model, worktree, and branch obligations to each agent's spawning owner.
  - Codex uses an in-memory `{ role, lane, worktree, branch, opaqueAgentId, state }` record for every instance. Every follow-up, message, wait, or close targets the returned ID. A missing ID is a failed spawn. IDs are never committed or used for resume.
  - For Codex persistent pairs, root spawns the analyst with an adapter-owned delegated-researcher descriptor containing the exact researcher role/profile, resolved model/settings, and conventions block. The analyst spawns exactly one researcher from that descriptor, records its ID, and uses that ID through the entire Q&A; it never reads project tool configuration or infers spawn inputs. Fresh writers, reviewers, consolidators, plan agents, and task agents receive a new ID on every invocation. Their reports trigger verification of the expected commit/artifact; reports are not completion evidence themselves.
  - Spawn profiles resolve to canonical `agents/<role>.md`; native discovery may bind them directly, with an explicit read-and-follow directive as fallback. The initial prompt carries the verbatim task payload and `conventions/passing.md` block. Model selection is role override, then `Default`, then native default, passed opaquely at spawn.
  - The orchestrator creates and verifies worktrees before spawning. Codex requires capacity for root, analyst, and researcher; above that minimum, isolated lanes run independently in capacity-aware waves. Each keeps its branch/worktree and cannot read sibling outputs. Shared-run-worktree writers remain sequential and commit before the next spawn.
  - Assisted mode spawns no phase agents. The orchestrator writes the research/final artifact, records owner approval, commits the same predicate-bearing set, updates the tracker, pushes, and closes (`assisted-workflow.md:3-28`; `assisted-phases/2 - design-doc.md:141-163`).
- **Rationale:** The interfaces preserve semantic roles, worktree isolation, approval gates, committed artifacts, and completion predicates while letting each runtime choose its agent topology and scheduling. A one-lane autonomous design flow therefore moves from root → analyst ID → researcher child ID → committed research → fresh writer ID → fresh reviewer IDs → committed approval, while the assisted flow reaches the same three committed artifacts without agents.

### Topic: Failure modes and observability

- **Spec link:** Requirements 2 and 5; acceptance criteria 2–5 and 7–10
- **Options:**
  1. Keep shared health-monitoring behavior but invoke it only when configured; use synchronous failures and git evidence otherwise.
  2. Require an equivalent Codex monitor before allowing autonomous work.
  3. Remove or duplicate monitoring per tool.
- **Trade-offs:** Conditional monitoring preserves Claude behavior and permits Codex conformance, but silent Codex stalls may need owner interruption and later resume. Requiring it contradicts the approved first-release boundary. Removing it regresses Claude; duplicating it creates drift in generic recovery policy.
- **Decision:**
  - Retain one generic `health-monitoring.md`. Its behavior applies only when the active adapter declares and configures Health monitoring. Claude continues to require and use its current monitor. Codex may omit it; autonomous start, resume cleanup, and close-out skip monitor operations when absent. Add no detached state or recovery mechanism.
  - Configuration route-or-fallback, file, unit, or native-prerequisite failures stop before branches, worktrees, or pipeline artifacts are created. Surface the adapter ID, path, failed check/error, exact missing items, and setup action. A valid adapter fallback satisfies configuration lookup; local overrides cannot repair committed completeness.
  - Capacity saturation queues work. Reserve capacity for an analyst/researcher pair before launching the analyst; run isolated lanes in waves. A spawn error or missing opaque ID stops the active run.
  - A failed ID-targeted message/wait, agent failure, cancellation, lost ID, wrong pre-write worktree/branch, or completion report without the expected commit/artifact stops the run. Surface role/ID/lane, expected and actual worktree/branch/HEAD/status, last successful message/commit/artifact, error verbatim, predicate result, and next safe action. Never fall back to role-name routing or infer success.
  - Work committed on an unintended ref is preserved and requires owner-directed cleanup; automatic commit movement could mutate unrelated work. An agent blocker retains the existing verbatim blocker/fork path. Rejection loops retain the existing every-three-rejections inspection.
  - A run-start tracker failure stops before phase agents. A phase-status failure stops before the next phase while leaving the completed predicate intact. During close-out, attempt monitor cancellation, tracker cleanup, pushes, and reporting independently; report each result and retain local commits if any side effect fails.
  - Resume always assigns fresh runtime IDs and uses existing git recovery: restart incomplete Spec/Design or unapproved-plan work after confirmation; investigate approved-plan Build/Document work from commits and diff. It first reconciles any failed tracker, push, or configured-monitor cleanup before dispatch.
- **Rationale:** Normal successful Codex execution retains all required outcomes without introducing an optional capability as a prerequisite. Failures remain inspectable through synchronous native errors plus durable branches, commits, artifacts, rejection records, approval markers, summaries, and completion predicates. The same evidence supports cross-session and cross-tool resume.

### Topic: Dependencies and compatibility verification

- **Spec link:** Requirements 1–5; acceptance criteria 1–10
- **Options:**
  1. Reuse the existing dependency-free prose/config architecture and prove behavior with repository checks plus real surface runs.
  2. Add an executable adapter/service and automated prompt-structure tests.
- **Trade-offs:** Option 1 requires a substantial manual acceptance matrix but verifies the actual agentic surfaces and durable results. Option 2 could automate mechanics yet adds an unnecessary runtime layer and violates the repository rule against tests that assert skill/profile wording or structure.
- **Decision:** Add no package, daemon, database, hosted service, mandatory MCP server, monitor, detached recovery, or lockfile dependency. Codex-native metadata/configuration binds existing sources to native runtime capabilities.

  Automated verification runs `npm test`, changeset validation, version drift checks, and the native manifest loader/validator available to the implementation. If the Codex manifest is version-bearing, extend the version-sync/drift implementation and behavioral temp-repository/end-to-end tests; otherwise keep that machinery unchanged. Add its distribution paths to release-relevant changeset coverage.

  Manual black-box verification records transcripts, surface/runtime version, role/opaque-ID/model records, worktree and branch listings, logs and SHAs, committed artifacts via `git show`, guardrail output, tracker state, pushes, and close-out results. It covers:

  1. Desktop, CLI, and IDE autonomous runs through Document, each exercising multi-agent execution and at least one multilane phase; distribute divergent, isolated, and capacity-waved cases across the three. Verify persistent pairs, fresh review/task agents, model overrides, guardrails, rejections, approvals, trackers, commits, summaries, pushes, and close-out.
  2. Assisted Spec and Design-doc on every surface, with no subagents and with owner approval markers satisfying the same predicates.
  3. Issue operations plus create/list/resume/revise/fork, including clean pre-plan phase restart and investigative approved-plan Build resume.
  4. Claude-created pipelines listed/resumed/revised/forked by Codex and the reverse, with matching state and no migration commit or artifact rewrite.
  5. Adding routed Codex configuration to a working Claude project, verifying verbatim Claude values, active-only routing/local overrides, then successful runs in both tools.
  6. Missing route, file, Team spawning, and native profile prerequisite cases, each stopping before new pipeline state.
  7. Codex runs without Health monitoring on all surfaces.
  8. Unchanged Claude install/invocation, autonomous and assisted outcomes, and configured monitor behavior.
- **Rationale:** The repository's product is prose-driven orchestration, so real conversations and git/tracker outcomes are the acceptance boundary. Automated checks remain appropriate for executable release metadata and manifest validity, while structural tests of skill or agent wording would be brittle and prohibited by `AGENTS.md:17`.

### Topic: Residual risks and completeness

- **Spec link:** Requirements 1–5; acceptance criteria 1–10
- **Options:**
  1. Correct compatibility/topology contradictions and carry native syntax plus nested-capacity checks as explicit release gates.
  2. Treat legacy configuration as a migration requirement or defer required surfaces until native details are known.
- **Trade-offs:** Option 1 adds a durable Claude fallback and manual release evidence but satisfies coexistence and no-regression. Option 2 would simplify canonical configuration while violating approved acceptance criteria.
- **Decision:** Preserve legacy inline Claude and flat local configuration, make shared pair/scheduling prose mechanism-neutral, pass delegated spawn inputs explicitly, and validate native packaging plus minimum nested capacity on every required surface before release. With these corrections, every requirement and acceptance criterion is served. Native syntax remains an implementation selection under the accepted premise; a surface that cannot sustain the required nested pair returns the design for revision rather than narrowing scope.
- **Rationale:** Compatibility applies to already configured projects, not only newly generated configuration. Required roles and outcomes can remain shared while adapters select ownership and scheduling. The remaining unknowns concern native binding syntax and verified capacity, not product semantics.

## Open Questions

- **Codex native adapter syntax:** Which repository paths, manifest/profile schemas, and install/discovery commands expose the canonical skill and `agents/<role>.md` profiles on each local surface, and does any manifest carry the project version? Resolve during build with the native loader/validator and three-surface install smoke. The accepted design premise settles availability; this selects syntax and version-sync wiring.
- **Nested capacity validation:** Do the desktop app, CLI, and IDE extension each permit an analyst child to spawn its researcher and keep at least three live instances: root, analyst, and researcher? Validate before release. Failure blocks conformance and returns to design; it does not change researcher ownership or exclude a required surface.

## Risks

- **Legacy configuration regression:** A route-only loader would stop existing Claude projects. Keep the Claude adapter's durable inline fallback, preserve flat `.rp.local.md`, prefer routes when present, and test an unchanged legacy project before and after Codex installation.
- **Nested-agent capacity differs by surface:** The Codex topology needs three live instances. Gate release on nested-spawn/capacity smoke tests for desktop, CLI, and IDE; use capacity-aware lane waves above that minimum.
- **Native packaging cannot reference canonical profiles directly:** Native schema may prefer embedded instructions, risking drift. Prefer native file references; otherwise use an initial read-and-follow directive to canonical `agents/<role>.md`. If neither preserves canonical sources, return to design rather than create prompt copies.
- **Setup partially changes a working project:** Route/file writes could leave mixed configuration after interruption. Confirm the complete write set, apply it atomically in one commit, retain inline Claude fallback, and validate both active tools before declaring setup complete.
- **Optional Codex monitoring leaves silent stalls undetected:** An owner may interrupt and resume from git. Monitoring and detached recovery remain optional; Claude retains its configured monitor.
- **Cross-tool interpretation drifts:** Keep branch grammar, artifact formats, and completion predicates single-sourced and unchanged; gate release on bidirectional list/resume/revise/fork evidence without migration commits.
- **Manual surface evidence is expensive and runtime versions change:** Record surface/runtime versions, transcripts, IDs/models, refs, SHAs, artifacts, tracker state, and close-out results so failures are reproducible and later releases can rerun the same behavioral matrix.
