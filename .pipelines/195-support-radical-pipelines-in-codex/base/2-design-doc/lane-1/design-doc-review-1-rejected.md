# Design Doc Review

## Verdict: rejected

## Summary

The design chooses a credible app-server supervisor boundary and covers the acceptance criteria at a high level, but it leaves four load-bearing integration decisions unresolved. The claimed pre-mutation completeness gate cannot fit the current workflow ordering, the supervisor cannot locate the repository state it is supposed to own from its defined inputs, the existing health-recovery contract is not preserved, and tool selection is assigned to a shared skill path without respecting the repository's tool-isolation rule.

## Issues

### Issue 1: The pre-mutation gate cannot run at the claimed point

**What's wrong:** The design says every Codex workflow opens the supervisor and completes workflow-specific preflight before any branch, worktree, or artifact mutation. The current entry point loads conventions before an issue or run is known, then creates a new pipeline in `work-on-an-issue.md` step 2, and only selects autonomous or assisted mode in step 3. `open_run` needs the run branch, artifact folder, and required model/effort configuration, so it cannot run during convention loading; if it runs after mode selection, `create-pipeline.md` has already created and committed pipeline state. Revision and fork paths have the same unaddressed ordering dependency. This also contradicts the claim that the existing parent topology remains intact.
**Where in design doc:** Approach; Interfaces and Data Flow → Supervisor operations and Runtime flow
**Suggestion:** Define the exact integration order for create, resume, revise, and fork. Either resolve run identity and workflow configuration before mutation and call `open_run` there, or split prerequisite preflight from run opening and show how both stages preserve the no-partial-work guarantee. Name every shared workflow change needed and how the Claude Code path retains its current behavior.
**Why it matters:** Acceptance criterion 8 requires incomplete Codex setup to stop before partial pipeline work. The proposed order cannot enforce that criterion against the current workflow.

### Issue 2: `open_run` cannot locate the Git common directory from its interface

**What's wrong:** The supervisor process starts with the plugin root as its working directory, while runtime state and the lease live under the target repository's Git common directory. `open_run` accepts an undefined “repository identity” but no absolute checkout path or Git common-directory path. `spawn_agent` supplies a worktree only later, and a new pipeline has no run worktree before the gate. Two implementers could treat repository identity as a path, a URL, or a hash, with different locking and recovery behavior.
**Where in design doc:** Components → Plugin packaging and Runtime state and diagnostics; Interfaces and Data Flow → Supervisor operations
**Suggestion:** Define an explicit absolute repository-checkout input for `open_run`, how the supervisor derives and validates the canonical Git common directory and repository identity, and how this works for main checkouts, existing worktrees, and artifact-in-fork mode. Keep the stable identity distinct from the path used for local Git operations.
**Why it matters:** Without a repository path contract, the supervisor cannot reliably acquire the correct lease, write shared state, or reconcile threads, so the central lifecycle design is not implementable as specified.

### Issue 3: Health monitoring drops existing recovery semantics

**What's wrong:** The existing health contract defines four signals and an exact two-retry sequence per occurrence: stalled output, message failure, login/API-key failure, and network failure. It includes target-agent restart after a second message failure, authenticated provider/model fallback for login failure, and budget reset after recovery. The design specifies process restart, transient retry, and one stall sequence, but it does not define the message or authentication sequences, per-occurrence reset, monitor persistence/list/cancel behavior, or how a replacement provider/model reaches `spawn_agent`. The lifecycle interface exposes model and effort but no provider or fallback configuration.
**Where in design doc:** Components → MCP supervisor; Interfaces and Data Flow → Supervisor operations and Runtime flow; Failure Modes and Observability
**Suggestion:** Specify the normalized health state machine against every signal and recovery action in `reference/health-monitoring.md`, including retry accounting, successful-reset behavior, provider/model selection, restart generation behavior, owner escalation, and monitor lifecycle across resume and close-out. Extend the operation inputs wherever that contract needs provider or fallback data.
**Why it matters:** Health monitoring is an explicit workflow-parity requirement. Different retry and authentication behavior would make Codex runs observably weaker and can stop autonomous execution before the existing recovery budget is exhausted.

### Issue 4: Tool dispatch is not reconciled with the repository's generic-skill rule

**What's wrong:** The design assigns Codex recognition to the shared setup path while also saying tool-specific instructions live only in `reference/conventions/codex.md`. The current setup file uses a hard-coded tool table, so the obvious implementation is to add another Codex reference there. That conflicts with `AGENTS.md`, which permits agentic-tool mentions only in dedicated files loaded conditionally, and with the design's claim that the shared skill remains tool-neutral.
**Where in design doc:** Approach; Components → Shared orchestration skill and Codex convention adapter
**Suggestion:** Define a tool-neutral dispatch mechanism for the generic loader and setup flow, and state which dedicated files own tool detection, completeness, setup actions, and lifecycle mapping. Include any refactor needed to remove hard-coded tool names from the generic reading path while preserving the existing Claude Code behavior.
**Why it matters:** Without this boundary, implementing the design either violates repository rules or leaves tool selection ambiguous, risking configuration coexistence and no-regression criteria.
