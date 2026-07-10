# Design Doc Review

## Verdict: rejected

## Summary

The revision resolves the prior tracker/phase-0 ordering gap and replaces the impossible supervisor with a coherent opaque-ID ownership hierarchy, but it still does not satisfy the approved parity contract. Orchestrator health recovery is explicitly weakened, configurable agent models and authentication fallback are removed, and the nested spawn and Codex runtime setup contracts are incomplete. The shared tool mapping also still violates the repository's generic-skill rule.

## Issues

### Issue 1: Orchestrator failure is still outside the health contract

**What's wrong:** The existing monitor watches authentication and network failures affecting the orchestrator as well as spawned agents and keeps monitoring after an escalation. The design instead ends monitoring and escalation when the orchestrator stops, relies on the owner to notice the stopped surface, and requires an owner-initiated resume. Its fixtures exercise child recovery and Git reconstruction, not detection, recovery, escalation, or close-out for an orchestrator failure. This is the limitation prior review Issue 2 required the design to solve, now stated as a trade-off rather than resolved.
**Where in design doc:** Approach; Interfaces and Data Flow → Health state machine; Key Decisions → Limit live recovery to owned children; Failure Modes and Observability
**Suggestion:** Define and verify, on every in-scope surface, a native mechanism that preserves the existing orchestrator-level health outcome. If the binding native-only decision makes that impossible, reconcile that decision with the approved parity requirement in the prior artifact rather than claiming acceptance coverage here.
**Why it matters:** Requirement 2 includes health monitoring, acceptance criterion 7 forbids weakening an outcome because a native control is absent, and orchestrator loss also prevents the existing tracker cleanup and run close-out behavior.

### Issue 2: The fixed model removes model configuration and authentication fallback

**What's wrong:** The spec expressly includes agent model configuration in Claude Code parity. Existing setup accepts project-specific per-agent or per-tier tool-native models, and the existing health table responds to an authentication failure by selecting an authenticated provider-qualified model. The design rejects every Codex configuration except `gpt-5.6-sol` and retries authentication with the same pin. Verifying that behavior in fixtures proves the new restriction, not parity. The binding model decision therefore conflicts with the approved spec and with `reference/health-monitoring.md`.
**Where in design doc:** Approach → Readiness; Interfaces and Data Flow → Spawn and ownership contract and Health state machine; Cross-surface verification
**Suggestion:** Make `gpt-5.6-sol` a default if desired while preserving the existing project-configurable agent-model contract and an authenticated fallback sequence. If a fixed model with no fallback is required, revise the approved requirements before using it as design authority.
**Why it matters:** Codex would lose a named Radical Pipelines capability and would stop on an authentication failure that the existing workflow attempts to recover.

### Issue 3: The nested researcher spawn has no complete bootstrap contract

**What's wrong:** The current spec and design phase definitions tell the orchestrator to launch both persistent agents, while the analyst profiles assume a researcher already exists and only describe sending it questions. The design changes ownership but does not identify the conditional phase/profile changes or define how the analyst receives the researcher's canonical profile, task, conventions, worktree, branch, and effective model before it performs the nested spawn. This is especially load-bearing because repository rules say an agent reads only its own profile and initial prompt. The replacement path says to resupply the same inputs without defining which parent retained them.
**Where in design doc:** Approach; Components → Native agent hierarchy; Interfaces and Data Flow → Spawn and ownership contract; Health state machine
**Suggestion:** Define the exact prompt/configuration handoff for the analyst-owned spawn and replacement, name the shared phase and profile surfaces that change, and show the conditional path that leaves Claude Code's flat launch behavior unchanged. Include how the nested child is seated and how its effective role model is selected.
**Why it matters:** Two implementers cannot derive the same hierarchy from the current phase files, and an analyst without the researcher's complete bootstrap inputs cannot create the required persistent same-ID relationship.

### Issue 4: Setup cannot establish the runtime configuration readiness requires

**What's wrong:** The design says Codex setup writes only `.rp.codex.md` and plugin files, but `agents.max_depth`, `agents.max_threads`, custom-agent models, and project permission profiles are Codex runtime configuration, not Markdown conventions or plugin-manifest fields. Official Codex configuration places depth/thread limits in `.codex/config.toml`, role model settings in custom agent configuration or the spawn prompt, and permissions in active or managed configuration. The design neither adds those setup actions nor defines precedence and validation across project, user, surface-selected, and managed settings. It also calls the thread limit generic “capacity” rather than naming the setting admission must inspect.
**Where in design doc:** Approach; Components → Codex plugin package and Tool conventions; Interfaces and Data Flow → Spawn and ownership contract; Failure Modes and Observability → Incomplete setup
**Suggestion:** Define the concrete Codex configuration artifacts or owner actions that establish `agents.max_depth=2`, sufficient `agents.max_threads`, role models, permissions, and required features on all three surfaces; define their precedence and the readiness probes. Keep `.rp.codex.md` for conventions rather than treating it as runtime configuration.
**Why it matters:** As written, setup can report a missing prerequisite but cannot provide the promised supported path to make the run admissible, so acceptance criterion 8 is incomplete.

### Issue 5: The static tool mapping still violates the generic-skill rule

**What's wrong:** The design puts the literal names `Codex` and `Claude Code` in a mapping used by the shared setup/load path. `AGENTS.md` requires the shared skill to remain generic and permits agentic-tool names only in dedicated tool files loaded conditionally. Reusing an existing hard-coded table does not make extending that violation compliant, and the design simultaneously calls this path generic.
**Where in design doc:** Approach; Components → Shared orchestration skill; Interfaces and Data Flow → Convention selection; Key Decisions → Select conventions through one explicit tool mapping
**Suggestion:** Put tool detection and naming behind dedicated tool entrypoints or a project-provided tool-neutral reference, and let the shared loader consume the selected convention path without enumerating tools. Define one non-duplicated dispatch source while preserving the current Claude Code path.
**Why it matters:** This leaves prior review Issue 4 unresolved and makes the proposed implementation violate a repository rule even if the runtime behavior works.
