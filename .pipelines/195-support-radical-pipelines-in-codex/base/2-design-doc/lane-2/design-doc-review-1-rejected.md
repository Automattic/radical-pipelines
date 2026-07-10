# Design Doc Review

## Verdict: rejected

## Summary

The design correctly treats health monitoring and detached recovery as optional and defines parity by durable workflow outcomes. It is not yet implementable as written because its nested Codex topology omits required native depth and capacity prerequisites, and it does not consistently distinguish that Codex topology from the shared persistent-pair contract recorded in the research.

## Issues

### Issue 1: Nested spawning omits required Codex prerequisites

**What's wrong:** The chosen flow is root (depth 0) → analyst (depth 1) → researcher (depth 2), but Codex defaults `agents.max_depth` to 1, which prevents a direct child from spawning a descendant. The configured thread cap can also be too low for the three live instances this flow requires. The design names generic Team spawning and capacity checks but never makes depth ≥ 2 and sufficient concurrent capacity Codex completeness requirements. It therefore allows configuration to pass, pipeline state to be created, and the first persistent pair to fail at spawn time, contrary to acceptance criterion 8. The native constraints are documented in [Codex subagent global settings](https://learn.chatgpt.com/docs/agent-configuration/subagents#global-settings).

**Where in design doc:** Approach; Components — Tool adapters and Codex distribution/configuration; Agent spawn and addressing contract; Failure Modes and Observability — Capacity shortage; Risks and Open Questions — Nested capacity

**Suggestion:** Either require the Codex adapter to validate nesting depth ≥ 2 and capacity for the root plus both agents during committed completeness/setup on every in-scope surface, or choose a topology that does not require child spawning. Keep the surface smoke as acceptance evidence, not as the first check of a known prerequisite.

**Why it matters:** Autonomous Spec and Design-doc cannot execute normally with Codex's default nesting depth, and a missing prerequisite would be detected after partial pipeline work instead of at the required setup gate.

### Issue 2: Persistent-pair launch ownership is inconsistently scoped

**What's wrong:** The research keeps the shared invariant at “one persistent analyst/researcher pair” and assigns launch topology to the active adapter; it describes analyst-owned nested spawning specifically for Codex. The design likewise says adapters own spawning, but its Approach, persistent-pair interface, and key decision prescribe root → analyst → researcher without a Codex qualifier. Current shared phase references launch both agents from the root. Two implementers could therefore either change Claude Code to nested spawning or keep the current Claude topology and scope nesting to Codex.

**Where in design doc:** Approach; Components — Shared autonomous and resume references; Agent spawn and addressing contract; Key Decision — Delegate the persistent researcher with complete spawn inputs

**Suggestion:** State the shared pair and Q&A invariants independently of launch ownership. Put the delegated descriptor and analyst-owned researcher spawn in the Codex adapter, and explicitly retain Claude Code's current root-owned launch unless a separately justified and verified cross-tool change is intended.

**Why it matters:** The ambiguity can cause an unintended Claude Code topology change, conflicts with the committed research, and leaves acceptance criterion 10 without a deterministic implementation.
