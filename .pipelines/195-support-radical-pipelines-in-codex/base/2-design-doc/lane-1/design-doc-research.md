# Design Research: Codex support

## Research

### Existing architecture boundary

- The standalone skill defines workflow and phases without surface controls (`README.md:63-65`; `skills/radical-pipelines/SKILL.md:17-45`). Autonomous orchestration fixes phase order, roles, worktree ownership, review loops, blockers, and close-out (`skills/radical-pipelines/reference/autonomous-workflow.md:23-94`); assisted mode fixes owner-approved artifacts and commits without agents (`skills/radical-pipelines/reference/assisted-workflow.md:1-24`).
- Branch grammar, run/lane topology, artifact layout, completion predicates, and lineage are tool-neutral (`skills/radical-pipelines/reference/pipeline-versioning.md:5-84`). Listing, resumption, revision, and forking derive state from those contracts (`skills/radical-pipelines/reference/work-on-an-issue.md:21-55`; `skills/radical-pipelines/reference/create-pipeline.md:7-42`; `skills/radical-pipelines/reference/resume-pipeline.md:11-33`; `skills/radical-pipelines/reference/revision-pipeline.md:23-38`; `skills/radical-pipelines/reference/fork-pipeline.md:16-30`).
- Canonical role instructions live in `agents/`; the runtime seam is profile discovery, spawning/addressing, worktree seating, and model selection. The spawn prompt payload is already shared (`skills/radical-pipelines/reference/conventions/passing.md:1-26`).
- Distribution and setup are Claude-only today (`.claude-plugin/plugin.json:1-10`; `.claude-plugin/marketplace.json:8-14`; `README.md:67-102`; `skills/radical-pipelines/reference/conventions/setup.md:15-24`). `.rp.md:5-113` already separates shared conventions from Claude-specific spawning, models, and monitoring.
- The completeness gate stops before pipeline work and reports missing conventions (`skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/setup.md:3-13,191-204`). It must evaluate the active tool's adapter, profiles, and spawning configuration.

### Monitoring compatibility

Shared references currently require and unconditionally manage health monitoring (`skills/radical-pipelines/reference/conventions/load.md:16`; `skills/radical-pipelines/reference/conventions/setup.md:91-95`; `skills/radical-pipelines/reference/autonomous-workflow.md:35-39,88-94`; `skills/radical-pipelines/reference/resume-pipeline.md:7-10`). The approved spec instead makes monitoring and detached recovery optional for Codex. Shared lifecycle steps therefore need a capability condition; Claude's tool-specific rules can continue requiring its existing monitor (`skills/radical-pipelines/reference/conventions/claude-code.md:14-20`).

### Configuration and component boundary

- The loader, setup flow, artifact storage, local override, README, and repository configuration all define one committed `.rp.md` (`skills/radical-pipelines/reference/conventions/load.md:1-4,18,28-34`; `skills/radical-pipelines/reference/conventions/setup.md:118-139,191-224`; `.rp.md:5-113`; `README.md:104-118`). Shared conventions and tool sections are therefore identified by section-qualified names.
- Add `skills/radical-pipelines/reference/conventions/codex.md` as the sole skill reference for Codex-native profile discovery, spawn/address-by-returned-ID semantics, worktree seating, opaque model/settings values, optional monitoring, and native setup actions. A Codex-native distribution index exposes the shared skill and registers the 19 canonical root profiles without copying their bodies.
- Modify `skills/radical-pipelines/reference/conventions/load.md` and `setup.md` for active-tool selection, prerequisite checks, section-qualified local overrides, and surgical confirmed merges. Modify `conventions/claude-code.md`, `autonomous-workflow.md`, `resume-pipeline.md`, and `health-monitoring.md` to move monitor requiredness to tool rules and condition its lifecycle. Minimally change `skills/radical-pipelines/reference/autonomous-phases/1 - spec.md` and `2 - design-doc.md` so `Team spawning` owns persistent-pair topology: Claude keeps orchestrator-owned pairs; Codex uses analyst-owned researcher children. Append `## Codex conventions` to `.rp.md`.
- Update `README.md`, `package.json` description, `.changeset/config.json`, and `CONTRIBUTING.md` for Codex distribution and release relevance. The feature needs a minor changeset (`CONTRIBUTING.md:23-25,58-66`).
- Preserve all `agents/*.md`, `.claude-plugin/*`, shared phase/branch/artifact contracts, guardrails, passing conventions, and generic workflows outside the conditional monitor steps. README identifies the root profiles as canonical (`README.md:95-102`).
- Prefer Codex metadata without an independent version when its native format allows. If its manifest mandates a version, fan the root `package.json` version out through the existing sync/check scripts and tests; it never becomes a second source (`scripts/sync-version.mjs:32-38`; `scripts/check-version-sync.mjs:53-74`).

### Stable data protocol and runtime handles

1. Invocation loads `.rp.md` plus `.rp.local.md`, resolves shared and active-tool conventions, and validates native prerequisites before any branch, worktree, or artifact mutation (`skills/radical-pipelines/SKILL.md:41-45`; `skills/radical-pipelines/reference/conventions/load.md:1-34`). Setup uses the existing action hook and explicit write confirmation to add only approved active-tool content (`skills/radical-pipelines/reference/conventions/setup.md:183-204`).
2. Issue lookup and pipeline operations dispatch through the existing mode and Git flow (`skills/radical-pipelines/reference/work-on-an-issue.md:13-55`). Tracker actions remain defined by the shared `Issues` convention (`.rp.md:26-39`).
3. Autonomous spawn inputs remain the exact profile name, absolute worktree/branch, conventions block, resolved model/settings, and role payload (`skills/radical-pipelines/reference/autonomous-workflow.md:63-70`; `skills/radical-pipelines/reference/conventions/passing.md:1-26`). Codex native spawn returns an opaque agent ID; every follow-up targets that ID. IDs are ephemeral and never enter artifacts.
4. For each spec/design lane, the Codex analyst owns one persistent researcher. Its initial prompt includes a researcher spawn packet outside `## Conventions`: exact profile name, complete child prompt with the existing conventions fields, resolved researcher model/settings when configured, and instructions to spawn exactly one child, record the returned opaque ID, and use it for every Q&A follow-up. The analyst submits the packet unchanged. The orchestrator records only the analyst ID. Shared phase wording delegates pair topology to `Team spawning`; Claude retains orchestrator-owned pairs (`skills/radical-pipelines/reference/autonomous-phases/1 - spec.md:22-40`; `skills/radical-pipelines/reference/autonomous-phases/2 - design-doc.md:29-47`).
5. Fresh writers/reviewers and build/document task agents retain the current prompt payloads and report contracts. Each new instance gets a new opaque ID; Git predicates, rather than success messages, establish completion.
6. Lane worktrees, artifacts, approval markers, commits, blockers, tracker transitions, and close-out keep their current contracts (`skills/radical-pipelines/reference/pipeline-versioning.md:5-84`; `skills/radical-pipelines/reference/autonomous-workflow.md:72-94`). List/resume/revise/fork reconstruct state only from committed Git and Markdown, so cross-tool continuation needs no session migration.

Monitoring state is derived from active-tool rules and configuration:

- Tool rules mark `Health monitoring` required or optional.
- Absent subsection means disabled when optional and incomplete when required.
- A complete subsection with Start/List/Cancel operations means enabled.
- A present but incomplete subsection fails preflight.
- Monitor handles remain ephemeral; start/list/cancel run only when enabled.

### Dependencies and surface contract

- Add no third-party library, daemon, wrapper CLI, MCP server, or custom orchestration runtime. The adapter is native metadata/configuration plus prose rules.
- The shared runtime dependencies remain local filesystem/shell access and Git/worktrees (`skills/radical-pipelines/reference/conventions/setup.md:57-61`; `skills/radical-pipelines/reference/create-pipeline.md:15-18`; `skills/radical-pipelines/reference/pipeline-versioning.md:66-84`). Issue create/modify and access stay shared and project-declared (`skills/radical-pipelines/reference/manage-issues.md:1-15,43-53`; `skills/radical-pipelines/reference/conventions/setup.md:51-55`); this repository uses `gh` and Linear MCP (`.rp.md:7-39`). Guardrails stay literal project commands judged by exit code (`skills/radical-pipelines/reference/guardrails.md:1-32`).
- Codex must natively discover the skill and every canonical profile, apply opaque native model/settings, spawn fresh and persistent agents, return opaque IDs, target follow-ups by ID, support nested analyst/researcher ownership, seat agents in local worktrees, run local commands, and interact with the owner. The accepted premise and upstream research establish these semantic capabilities across desktop, CLI, and IDE (`1-spec/spec-research.md:118-121`).
- Use one adapter/profile set across all local surfaces. Invocation controls and scheduling may vary. Surface-specific branches in shared phase logic are unnecessary; a surface may queue isolated lanes while preserving lane branches, worktrees, blindness, commits, and outcomes.
- Model identifiers remain tool-native opaque values (`skills/radical-pipelines/reference/conventions/setup.md:77-89`). Codex never translates Claude aliases. An absent optional model convention uses native defaults; an invalid configured value fails preflight when detectable or stops at spawn without silent substitution.
- Validate each surface behaviorally for discovery/completeness; issue create/modify; pipeline create/list/resume/revise/fork; opaque-ID spawn and seating; autonomous execution through Document; assisted spec/design approval; multilane isolation; tracker/guardrail/commit/close-out outcomes; Claude-to-Codex and Codex-to-Claude continuation without migration; and preflight failure before mutation. Run Claude behavioral regression for install/config, pair topology, models, required `/loop` monitor, workflows, operations, artifacts, predicates, and close-out. Existing unit tests remain for release tooling; prose-structure tests are outside the repository's rules.

### Failure detection and reporting

- Preflight reports missing shared/active-tool conventions, profiles, models when detectable, commands, and external access before pipeline mutation (`skills/radical-pipelines/reference/conventions/load.md:20-26`; `skills/radical-pipelines/reference/conventions/setup.md:3-13,97-116,191-224`). Unexpected discovery or spawn failures stop and close out the run; report the role, phase/lane/task, returned ID if any, native error, and last durable branch/artifact state.
- Every writing agent verifies its assigned path and branch before its first write (for example, `agents/design-doc-analyst.md:8-10`). Worktree or seating failure reports expected/actual state and preserves worktrees until safe cleanup is known.
- Agent blockers retain the shared payload, rejection-loop guard, and close-out behavior (`skills/radical-pipelines/reference/autonomous-workflow.md:59-61,72-94`). Without monitoring, foreground native status or owner cancellation is the signal for a silent agent failure; first release makes no background stall-detection promise.
- After every phase, the orchestrator verifies committed artifact predicates rather than trusting an agent message (`skills/radical-pipelines/reference/autonomous-workflow.md:50-59`; `skills/radical-pipelines/reference/pipeline-versioning.md:49-64`). Guardrail outcomes remain in committed review artifacts.
- A tracker start failure prevents agent dispatch. A phase-status failure after a predicate commits prevents the next phase; resume derives desired tracker state from Git and reconciles before dispatch. Run-end tracker failure is reported as incomplete external close-out without invalidating committed phase outcomes (`.rp.md:26-39`).
- Push, lane merge, or cleanup errors preserve local refs/worktrees and report exact refs, tips, paths, and native errors. Retry push/cleanup before later dispatch or at resume. Never roll back valid merged artifacts solely because cleanup failed.
- On every stop, best-effort close-out reports the failed operation, verbatim error, last durable commits/artifacts, branch/worktree state, tracker/push/cleanup state, and whether setup, resume, or a fork below a named phase is next (`skills/radical-pipelines/reference/resume-pipeline.md:11-33`). This is an owner-facing report, not a new artifact.
- An absent optional monitor is valid and silent. An incomplete section fails preflight. If a complete optional monitor fails to start, report and continue unmonitored; failure of a required monitor stops. Cancel failure reports the live handle/error but does not change artifact predicates.

## Topics

### Topic: End-to-end approach

- **Spec link:** Requirements 1–5; Acceptance criteria 1–10
- **Question:** Where are the existing tool-neutral workflow contracts and tool-specific runtime seams, and what credible approaches can add Codex while preserving cross-tool artifacts and Claude Code behavior?
- **Options:**
  1. Add a native Codex adapter that discovers the canonical skill and `agents/` profiles, plus a Codex-specific project-convention section.
  2. Turn `.rp.md` into a router for separate `.rp.claude.md` and `.rp.codex.md` files.
  3. Copy the skill and role profiles into a Codex-specific implementation.
- **Trade-offs:** Option 1 preserves one protocol source and adds the least coexistence risk, but setup merging and capability-gated monitoring need care. Option 2 isolates tool configuration but rewrites every existing project's configuration shape and still needs shared monitoring changes. Option 3 maximizes runtime independence but duplicates contracts and risks cross-tool drift.
- **Decision:** Use an additive native Codex adapter around the shared skill and canonical role profiles. Keep branch, artifact, phase, role, gate, and completion semantics shared. Put discovery, spawning/addressing, worktree seating, model values, and monitoring capability in tool-specific rules and project conventions. Make shared monitoring lifecycle steps conditional on the active tool capability.
- **Rationale:** The existing repository already separates the durable workflow protocol from Claude-native runtime mechanics. Reusing that seam gives all local Codex surfaces the same outcomes and artifacts without migrating existing Claude configuration or requiring identical machinery.

### Topic: Component map and configuration shape

- **Spec link:** Requirements 1, 4, and 5; Acceptance criteria 1, 6, 8, and 10
- **Question:** Which repository components are new, modified, or preserved, and how should shared and tool-specific project conventions coexist?
- **Options:**
  1. Keep one `.rp.md` with shared and per-tool top-level sections.
  2. Make `.rp.md` a router to `.rp.claude.md` and `.rp.codex.md`.
  3. Retain shared `.rp.md` and implicitly discover adjacent tool files.
- **Trade-offs:** Option 1 matches every current loader, setup, local-override, and storage assumption but requires section-qualified identities. Option 2 physically isolates tools but rewrites existing configuration and expands the config protocol. Option 3 avoids rewriting `.rp.md` but adds implicit multi-file discovery and merge complexity.
- **Decision:** Keep one `.rp.md`. Append `## Codex conventions`; resolve required conventions and `.rp.local.md` overrides by shared or active-tool section. Setup proposes only the missing/updated active-tool section and preserves other sections after explicit confirmation. Add a Codex rules reference and native distribution index that register the existing root profiles. Modify shared files for active-tool loading/setup, monitor capability, and tool-defined persistent-pair topology. Leave canonical profiles, Claude distribution, and durable workflow contracts untouched.
- **Rationale:** This is the repository's established configuration schema and the only option that adds Codex without migrating or replacing working Claude configuration.

### Topic: Interfaces and data flow

- **Spec link:** Requirements 2–5; Acceptance criteria 2–8 and 10
- **Question:** What stable interfaces connect setup, configuration loading, role spawning, phase artifacts, commits, tracker updates, and cross-tool continuation?
- **Options:**
  1. Derive required and optional capabilities from active-tool rules plus section presence.
  2. Add an explicit `Capabilities` configuration block.
  3. Probe all native capabilities at every invocation.
- **Trade-offs:** Option 1 is deterministic and reuses existing configuration semantics. Option 2 duplicates subsection presence and stores surface-local facts in project configuration. Option 3 adapts dynamically but can turn incomplete setup into nondeterministic mid-run failures.
- **Decision:** Preserve Git/Markdown as the only durable protocol. Add active-tool rule selection, native profile-name registration, spawn/follow-up by opaque returned ID, and monitoring derived from active-tool rules plus subsection completeness. Keep agent and monitor handles in live memory only. Let the Codex analyst own and address its one persistent researcher; delegate that runtime topology through `Team spawning` while preserving role and artifact contracts.
- **Rationale:** Cross-tool state is already fully reconstructible from branches, commits, artifact paths, and predicates. Ephemeral runtime handles should not extend the interoperable file format.

### Topic: Dependencies and surface capability mapping

- **Spec link:** Requirements 1, 2, 4, and 5; Acceptance criteria 1, 2, 6, 8, and 10
- **Question:** Which internal and external dependencies does Codex support require, and how are surface differences validated without changing workflow contracts?
- **Options:**
  1. Use native Codex configuration and runtime operations only.
  2. Generate adapter copies from canonical profiles with a Node build script.
  3. Add a wrapper runtime or MCP server that normalizes all surfaces.
- **Trade-offs:** Option 1 has no new process or package lifecycle and preserves canonical sources. Option 2 may help only if native discovery cannot consume profiles directly, but adds generated drift. Option 3 normalizes mechanics at the cost of installation, versioning, authentication, and process failures the spec does not require.
- **Decision:** Use native configuration only, with no new library or service dependency. Preflight project-declared Git, tracker, guardrail, model, and profile prerequisites. Require the same semantic operations on desktop, CLI, and IDE while allowing native controls and scheduling to differ.
- **Rationale:** The accepted Codex premise already supplies the runtime seam. Additional machinery would duplicate it without improving committed artifacts, phase outcomes, or interoperability.

### Topic: Failure modes and observability

- **Spec link:** Requirements 2 and 5; Acceptance criteria 2, 4, and 7–10
- **Question:** How are configuration, spawning, agent, Git, tracker, guardrail, and cleanup failures detected and surfaced without mandatory monitoring or detached recovery?
- **Options:**
  1. Await foreground native operations and use Git/artifact predicates as durable truth.
  2. Poll live agent IDs during the session.
  3. Add a committed run journal or external recovery daemon.
- **Trade-offs:** Option 1 preserves all existing contracts but cannot proactively detect a silent stall. Option 2 improves stall visibility but is optional monitoring with surface-specific cost. Option 3 adds a new cross-tool state contract or runtime dependency and targets explicitly optional recovery.
- **Decision:** Use foreground native errors, agent/blocker messages, committed review artifacts, Git predicates, external tracker state, and explicit close-out reports. Add no journal, polling requirement, daemon, or detached recovery. Put general preflight, predicate verification, tracker reconciliation, and best-effort close-out in shared workflow rules; keep native discovery, ID, model, seating, and status interpretation in Codex rules.
- **Rationale:** This provides inspectable normal execution and recoverable failures on every surface while respecting the approved first-release boundary.

### Topic: Acceptance coverage and residual risk

- **Spec link:** Requirements 1–5; Acceptance criteria 1–10
- **Question:** Does the design serve every approved outcome, remain feasible in the current repository, and isolate all unresolved implementation facts without expanding first-release scope?
- **Options:**
  1. Close the issue-operation, nested-spawn, and phase-reference gaps, then hand off.
  2. Defer those gaps to the writer or build phase.
  3. Reopen the approved spec.
- **Trade-offs:** Option 1 completes the design without changing scope. Option 2 risks losing model fidelity, Claude topology, or acceptance coverage. Option 3 has no contradictory or missing requirement to resolve.
- **Decision:** Explicitly preserve shared issue management and all pipeline operations; pass the complete researcher spawn packet to Codex analysts; delegate pair topology through `Team spawning` while codifying Claude and Codex behavior separately; require bidirectional continuation and Claude regression validation. Treat exact native filenames, optional model values, manifest version syntax, and surface test mechanics as build bindings. The record is ready for design-doc synthesis.
- **Rationale:** Every requirement and acceptance criterion now maps to a component, interface, or behavioral validation. Remaining unknowns do not alter architecture, durable contracts, or approved outcomes.

## Open Questions

- Which exact Codex-native files expose the shared skill, profiles, and tool rules? The accepted design premise establishes this capability, but repository evidence does not establish filenames. Bind the component to the platform convention rather than inventing a path.
- Does the required native manifest mandate a version field? If so, add it to root-version fan-out and checks; otherwise leave release scripts unchanged.
- Which Codex-native model identifiers/settings should this repository configure? Keep values optional, opaque, and owner-approved.
- Which native invocation steps and fixtures implement the decided desktop, CLI, and IDE behavioral matrix?

## Risks

- Setup must merge active-tool conventions while preserving shared and inactive-tool sections.
- A version-bearing Codex manifest would need version-sync, release, and changeset-gate integration; a manifest without its own version would not.
- Without configured monitoring, a silent native agent stall requires foreground surface or owner intervention.
- Tracker, push, or cleanup failures can leave committed local progress ahead of external state; resume must reconcile before new work.
