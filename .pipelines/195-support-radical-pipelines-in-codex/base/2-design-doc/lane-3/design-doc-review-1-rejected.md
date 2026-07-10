# Design Doc Review

## Verdict: rejected

## Summary

The design correctly applies outcome-based parity, keeps health monitoring and detached recovery optional for the first Codex release, preserves cross-tool artifacts, and treats convention-based Codex discovery/configuration as an accepted premise. It is not yet internally implementable as written because its component inventory omits a shared reference whose current unconditional contract contradicts optional Codex monitoring.

## Issues

### Issue 1: The shared health-monitoring contract remains unconditional

**What's wrong:** The design makes monitor start, resume, and close-out conditional, but its modified-component list omits `skills/radical-pipelines/reference/health-monitoring.md`. That file currently states that every autonomous workflow launches a recurring monitor, that the orchestrator launches it at run start, and that leftover loops must be cancelled. Leaving it unchanged conflicts with the design's Overview, Acceptance criterion 9 mapping, `HealthMonitoring?` interface, and monitoring decision.

**Where in design doc:** Components → Modified components; Interfaces and Data Flow → `HealthMonitoring?`; Key Decisions → “Make Codex monitoring optional and omit detached recovery”

**Suggestion:** Add `skills/radical-pipelines/reference/health-monitoring.md` to the modified components and scope it as the procedure used when the active adapter provides monitoring. Preserve its launch, retry, escalation, and cancellation behavior for adapters that provide the capability.

**Why it matters:** An implementer following the component inventory would leave contradictory canonical instructions and could still require or launch monitoring on Codex, violating the approved optional-monitoring boundary and Acceptance criterion 9.
