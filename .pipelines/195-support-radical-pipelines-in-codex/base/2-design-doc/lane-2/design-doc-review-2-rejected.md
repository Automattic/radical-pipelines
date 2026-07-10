# Design Doc Review

## Verdict: rejected

## Summary

The revision resolves the prior authority, cross-clone, and component-ownership findings, and native same-ID follow-ups provide a credible direct analyst/researcher channel. The native hierarchy is still incomplete: it is not wired into the unchanged phase instructions, its spawn contract does not seat or model-bind agents as the canonical workflow requires, and parent-only observation does not implement the existing recurring health monitor or its recovery behavior.

## Issues

### Issue 1: The recurring health monitor has been replaced with narrower parent observation

**What's wrong:** The canonical autonomous workflow starts a recurring monitor at run start and requires start, list, cancel, resume cleanup, root-level observation, and signal-specific recovery for silence, message failure, authentication failure, and network failure. The design instead has each parent observe only its children while the native task tree is alive. It defines no recurring monitor, interval or silence threshold, list/cancel interface, leftover-monitor handling, or observer for root-task stalls. Its generic steer-then-replace sequence also omits the existing authenticated-model swap and network-call retry paths. Root-task loss explicitly discards the only monitoring state. This contradicts the claims that health outcomes and autonomous behavior remain unchanged.
**Where in design doc:** Components — Unchanged but relevant components; Interfaces and Data Flow — Monitoring and recovery interface; Failure Modes and Observability — Child silence or failure and Root-task loss
**Suggestion:** Define the Codex Health monitoring convention end to end against `reference/autonomous-workflow.md`, `reference/health-monitoring.md`, and `reference/resume-pipeline.md`: the recurring observer, who observes the root, start/list/cancel and resume cleanup, timing, every signal-specific retry, escalation persistence, and behavior after root loss. Verify that the mechanism exists on desktop, CLI, and IDE without weakening a shared outcome.
**Why it matters:** Health monitoring is an explicit parity capability in Requirement 2 and part of AC2. The current design cannot detect or recover a stalled root and changes observable recovery behavior.

### Issue 2: Native spawning does not implement model binding or worktree seating

**What's wrong:** The shared autonomous workflow requires every model and setting to be applied as parameters of the spawn itself and every agent to start inside its assigned worktree. The design's native spawn interface passes only profile text, conventions, and an assignment. Pre-spawn checks prove that a target worktree exists, but never make it the child's effective working root. Likewise, the design names no native spawn field or custom-agent configuration that binds the resolved opaque model value and effort. Current Codex documents model binding through custom agent configuration, while the described component set adds no `.codex/agents/*.toml` layer; the callable native spawn contract also exposes no working-directory parameter. The qualification fixture asserts model pinning and worktree isolation without an implementation mechanism.
**Where in design doc:** Approach; Components — New components; Interfaces and Data Flow — Readiness and execution-authority interface and Spawn and persistent-message interface; Key Decisions — Gate every local surface with one qualification fixture
**Suggestion:** Specify the exact native configuration and spawn fields that bind role, model, effort, working root, writable roots, branch, and HEAD for each instance, including concurrent isolated lanes and nested researcher spawns. Add every generated or committed configuration surface to the component and setup maps. If a required field is unavailable, revise the architecture; a fixture that permanently fails an in-scope surface does not provide the required support.
**Why it matters:** Without deterministic seating, isolated lanes can operate from the shared root or wrong branch. Without deterministic model application, the existing Agent models capability and the fixture's model assertion cannot be implemented, breaking Requirement 2 and AC1, AC2, AC4, and AC7.

### Issue 3: Analyst-owned researcher creation is not wired into the unchanged workflow

**What's wrong:** The shared spec and design-doc phase references tell the root orchestrator to launch the analyst and researcher as persistent peers. The analyst profiles say to message a researcher, but never tell the analyst to spawn one or how to compose its profile, conventions, worktree assignment, model, and first turn. The design simultaneously marks phase workflows and profiles unchanged and says every analyst owns and spawns its researcher. `conventions/codex.md` is assigned prompt composition in general, but the interface never defines the initial overlay that transfers this responsibility and the researcher launch inputs to the analyst. The same-ID follow-up contract therefore starts only after an unspecified and contradictory creation step.
**Where in design doc:** Approach; Components — New components and Unchanged but relevant components; Interfaces and Data Flow — Spawn and persistent-message interface
**Suggestion:** Define how the Codex convention specializes the canonical peer-launch instruction: the root's analyst prompt, the source and exact composition of the researcher prompt, which parent applies conventions and model settings, how the first question is delivered, and which files must change if unchanged profiles cannot carry that contract. Keep tool mechanics in the Codex-specific path.
**Why it matters:** This is the unresolved creation half of prior Issue 1. One implementer can follow the shared workflow and create siblings while another follows the design and create a nested child, producing different topology, capacity, monitoring, and messaging behavior.
