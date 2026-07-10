# Design Doc Review

## Verdict: rejected

## Summary

The revision resolves both prior issues by making nested launch Codex-specific and gating depth and capacity before pipeline mutation. The design remains incomplete because its native Codex spawn contract assumes controls the selected collaboration path does not expose, and its completeness gate does not define how to establish effective native prerequisites across Codex configuration layers and surfaces.

## Issues

### Issue 1: The Codex spawn contract assumes unavailable per-spawn controls

**What's wrong:** The design requires every spawn to receive an exact role/profile, model/settings, worktree, and branch, then requires every wait and close to target the returned opaque ID. The current Codex collaboration interface exposes `spawn_agent` with only a task name, message, and context-fork choice; it has no role, model, settings, or working-directory parameter. Its wait operation is mailbox-wide, and it exposes no close operation. The Codex CLI has root-process `--model` and `--cd` flags, but that is a different execution path without the selected in-session opaque-ID messaging contract. [Official custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents) put instructions and model settings in `.codex/agents/*.toml`; the design defers that binding and does not explain how `.rp.codex.md` model choices select or update those native agents without duplicated configuration. A read-and-follow prompt can load a profile, but it cannot select the spawned thread's model or seat the thread in a worktree.

**Where in design doc:** Components — Codex distribution/configuration; Agent spawn and addressing contract; Key Decisions — Use Codex convention-based discovery for canonical sources and Address agents by transient opaque ID; Dependencies

**Suggestion:** Choose one implementable native execution contract in the design. If using in-session collaboration, define the supported custom-agent registration and deterministic role selection, how project model overrides reach the spawned agent, how all worktree operations are rooted when spawn has no working-directory parameter, and how mailbox-wide wait and absent close map to the state record. If using separate CLI processes, redesign addressing and messaging around that path. Validate the chosen contract on all three surfaces before approval.

**Why it matters:** Requirement 2 explicitly includes agent model configuration, multi-agent orchestration, and worktree isolation. The current contract cannot deterministically deliver those outcomes, so acceptance criteria 1, 2, 4, and 7 remain unimplementable as designed.

### Issue 2: The completeness gate cannot establish effective Codex prerequisites

**What's wrong:** The design states that native configuration exposes effective nesting depth and thread capacity, but it defines neither the source nor a capability probe that the orchestrator can use on every surface. [Codex configuration precedence](https://learn.chatgpt.com/docs/config-file/config-basic#configuration-precedence) includes invocation overrides, trusted project layers, profiles, user and system files, and built-in defaults. An untrusted project skips project `.codex` layers, `features.multi_agent` can be disabled, `agents.max_depth` defaults to 1, and `agents.max_threads` defaults to 6. The design names only depth and capacity, alternates between an effective and an explicitly configured thread cap, and does not account for trust or multi-agent enablement. Reading committed files alone therefore can both accept an unusable session and reject a valid default-capacity session.

**Where in design doc:** Approach; Project convention contract — resolution step 5; Autonomous data flow; Failure Modes and Observability — Configuration failure and Capacity shortage; Acceptance Verification — criterion 8; Risks and Open Questions — Nested capacity

**Suggestion:** Define one pre-mutation check that observes the actual session on desktop, CLI, and IDE: either a native effective-config diagnostic with its precedence/default rules or a bounded nested-spawn and capacity probe. Include project trust, multi-agent enablement, effective `agents.max_depth`, and effective `agents.max_threads`; state that an unset thread cap uses the native default. Name the evidence and setup action for each failure.

**Why it matters:** Acceptance criterion 8 requires missing prerequisites to stop at setup before creating partial pipeline work. Without a deterministic effective-capability check, the gate cannot guarantee that behavior.
