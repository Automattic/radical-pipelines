# Design Doc Review

## Verdict: rejected

## Summary

The design is thorough and largely traceable, but its central parity claim is not yet supported by an executable health-recovery contract or by evidence that the chosen supervisor and detached scheduler can run on every named local Codex surface. It also contradicts the documented Codex marketplace scopes, leaving distribution behavior ambiguous.

## Issues

### Issue 1: The supervisor cannot perform the existing health-recovery policy

**What's wrong:** The design says the existing recovery policy is preserved, but its command and action contracts omit required operations. `message` can address only an idle persistent agent, while the current no-output policy first pings the stalled active agent. The scheduler's listed actions—status, resend, model override, fresh restart, and cancellation—also provide no way to retry the failed tool call required by both network retries. Restarting a whole turn is not the same operation and can repeat uncommitted work. The design therefore silently replaces parts of `skills/radical-pipelines/reference/health-monitoring.md:28-37` while claiming unchanged monitoring semantics.
**Where in design doc:** Monitoring and recovery; Supervisor command protocol; Decision: Use a detached scheduler with monitor-owned policy; Failure Modes and Observability
**Suggestion:** Map every cell of the existing recovery table to a concrete supervisor operation, including how an active turn receives a status ping and how the failed network tool call is retried after the required delay. Define the operation's lifecycle, acknowledgement, idempotency, and session-integrity effects. If exact operations are impossible, document and justify an equivalent policy that still satisfies the spec rather than claiming the existing policy is unchanged.
**Why it matters:** Workflow parity and acceptance criteria 2 and 7 explicitly require health monitoring to remain available without being skipped or weakened. The current interface cannot execute the promised first and second retries.

### Issue 2: Cross-surface process feasibility remains a load-bearing open risk

**What's wrong:** The supervisor and detached scheduler are the only mechanisms offered for autonomous agents and recurring monitoring, yet the research record says desktop or IDE sessions may not expose compatible `codex` and Node executables or permit detached descendants. The design resolves that uncertainty only by making `doctor` reject the run and deferring cross-surface validation to the build. Detection is not feasibility evidence: if either named surface can access a local repository but cannot host this process model, the architecture fails the spec's surface-coverage and capability-difference requirements. The design gives no reason why deferring this architecture-invalidating question is safe.
**Where in design doc:** Distribution and configuration; Monitoring and recovery; Acceptance coverage criteria 1 and 7; Risks and Open Questions
**Suggestion:** Ground the chosen transport with verified evidence for desktop, CLI, and IDE execution of the installed plugin-relative supervisor and detached scheduler under supported permission modes. Otherwise choose a viable surface-specific mechanism that preserves the same workflow outcomes. Record what remains for build validation and why a failure there would not invalidate the architecture.
**Why it matters:** Requirements 1-2 and acceptance criteria 1 and 7 cover every named local surface. A completeness failure can handle a missing installable prerequisite; it cannot make an otherwise in-scope surface unsupported because the selected architecture depends on an unavailable process capability.

### Issue 3: The marketplace path and declared scope contradict each other

**What's wrong:** The design calls `.agents/plugins/marketplace.json` a personal marketplace entry. Current Codex plugin documentation defines `$REPO_ROOT/.agents/plugins/marketplace.json` as repo-scoped and `~/.agents/plugins/marketplace.json` as personal. The research record repeats the same contradiction, so an implementer cannot tell whether installation is meant to be repository-local or user-local, nor which source-path and cache-update lifecycle to implement.
**Where in design doc:** Distribution and configuration; Components — Codex plugin manifests
**Suggestion:** Choose and name the intended scope. For repository distribution, specify the repo marketplace entry and its plugin-root source path. For personal distribution, specify the home-scoped marketplace and how installation material reaches the personal plugin directory. Align the manifest, documentation, release tooling, and setup flow with that choice.
**Why it matters:** Distribution is the entry point for all three surfaces. Using the wrong marketplace scope changes discovery, installation, ownership, and update behavior, undermining acceptance criterion 1.
