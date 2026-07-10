# Design Doc Review

## Verdict: rejected

## Summary

The revision gives concrete answers to the four prior findings, but two of those answers still rely on interfaces that neither the research nor the codebase defines: no component produces the adapter key, and the child-thread supervisor cannot control the active orchestrator session. The new operation ordering also omits user-visible tracker mutations and phase-0 assets, while the research record still describes the superseded six-operation design. These gaps leave configuration selection, health parity, and the no-partial-work guarantee non-deterministic.

## Issues

### Issue 1: The adapter key has no defined producer

**What's wrong:** The design says the generic loader obtains `<adapter-key>` from the host environment, then loads the adapter that owns host detection. No existing convention, manifest field, skill input, or verified host interface supplies that key. Putting detection inside each adapter is circular because the key is already needed to choose which adapter to read. The current codebase instead selects from a table in `reference/conventions/setup.md`, so the proposed replacement cannot be implemented without inventing a new contract or reintroducing tool knowledge into the generic path.
**Where in design doc:** Approach; Components → Shared orchestration skill and Convention adapters; Key Decisions → Dispatch convention adapters without a tool table
**Suggestion:** Define the exact producer, value, and delivery path for the adapter key before the generic loader runs, with verified mappings for both supported hosts. If selection needs a tool-specific entrypoint or manifest-owned bootstrap, name that component and show how the shared skill receives the result.
**Why it matters:** Configuration coexistence and Claude Code isolation depend on selecting exactly one adapter. An undefined selector leaves two implementers with incompatible dispatch mechanisms and does not fully resolve prior Issue 4.

### Issue 2: The supervisor cannot perform the claimed orchestrator recovery

**What's wrong:** The supervisor starts and controls child app-server threads, while the existing Codex session remains the parent orchestrator. The design nevertheless says `prepare_run` preflights controller switching and that an orchestrator authentication occurrence switches the active surface's runtime, restarts the controller turn on retry 2, and reattaches the run handle. None of the eight operations creates or identifies a controller thread or gives the supervisor the host session's thread ID; the defined app-server flow therefore controls only threads that the supervisor starts or resumes. The design names no cross-surface mechanism by which an MCP server can replace its caller's active turn or surface an escalation after that caller has failed.
**Where in design doc:** Approach; Interfaces and Data Flow → Supervisor operations and Health monitoring state machine; Risks and Open Questions → Monitor process lifetime
**Suggestion:** Either place autonomous controller execution under a supervisor-managed app-server thread and define the owner-interaction bridge, or document a verified controller switch/restart/reattachment mechanism for every in-scope surface. Include how monitoring reaches the owner when the active orchestrator cannot poll.
**Why it matters:** The existing health contract explicitly covers orchestrator authentication and network failures. Without control of the orchestrator, Codex cannot preserve that recovery behavior across desktop, CLI, and IDE, so requirements 1–2 and acceptance criteria 1, 2, and 7 remain unmet.

### Issue 3: The pre-mutation order omits tracker state and phase-0 assets

**What's wrong:** The operation table orders branches, worktrees, and intent Markdown around `prepare_run` and `open_run`, but it never places the existing run-start tracker mutations: the running label, active pipeline version, and assignee. Applying them at the current "run start" before `prepare_run` leaves user-visible partial state when setup fails; applying them later is an unstated behavior change. Create and revise also claim their intent is approved "in memory," although `create-pipeline.md` and `revision-pipeline.md` require downloaded attachments or source assets in the phase-0 folder and require the approved intent to reference those local files. The design provides no staging or cleanup contract for those files before activation.
**Where in design doc:** Approach; Interfaces and Data Flow → Operation integration order
**Suggestion:** Extend each operation's exact order to cover tracker mutations and their failure behavior. Define where phase-0 assets are staged before approval, how the rendered draft resolves them, when they move into the run folder, and how failed preparation or activation cleans the staging area.
**Why it matters:** Tracker synchronization and self-contained intent artifacts are existing user-visible capabilities. Their undefined ordering can either violate acceptance criterion 8 or change Claude Code/workflow behavior, contrary to requirement 5 and acceptance criterion 9.

### Issue 4: The research record contradicts the revised architecture

**What's wrong:** `design-doc-research.md` still decides on six operations and assigns complete pre-mutation validation, locking, and initialization to `open_run`. The design now relies on eight operations, a `prepare_run` reservation, `report_health`, a repository UUID, host-provided dispatch, controller-runtime recovery, and a detailed parent/supervisor health handshake. Those load-bearing additions have no corresponding researched options, evidence, trade-offs, or revised decision, and several are the unresolved interfaces above.
**Where in design doc:** Approach; Components; Interfaces and Data Flow; Key Decisions
**Suggestion:** Update the research record with the evidence and alternatives behind the revised operation split, dispatch bootstrap, controller recovery, repository identity, and health handshake, then align the design with the resulting decisions and residual risks.
**Why it matters:** The reviewer cannot verify that the current architecture follows the complete research record, and the unresearched additions carry the design's correctness for acceptance criteria 1, 2, 7, and 8.
