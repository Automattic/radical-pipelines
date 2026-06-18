# Spec Review

## Verdict: approved

## Summary

The revised spec (Requirements 1–19) resolves all four issues from the first review without introducing new defects. It is well-organized, tracks the consolidated requirements faithfully, holds the WHAT-not-HOW line, and writes testable Given-When-Then acceptance criteria. I verified the scope claims against the live skill tree: the only generic files that reference the monitor lifecycle are the four the spec enumerates (`autonomous-workflow.md`, `resume-pipeline.md`, `review-pipeline.md`, the `load.md` conventions table) plus `health-monitoring.md`, and the only fixed-pair tool enumerations ("Claude Code and Pi", "claude-code.md or pi.md") live entirely inside `health-monitoring.md` — the file the spec authorizes editing. The "exactly two edited files" contract is accurate.

## Resolution of prior issues

- **Issue 1 (false "exactly two files" claim).** Resolved. Requirement 17 now narrows the two textual edits to the two files that genuinely need them (`setup.md` supported-tools row + `health-monitoring.md` lifecycle/context-window rewording), and 17(a) defers start/cancel *mechanics* to the active tool's convention so always-on supervision satisfies them as no-ops. Requirement 18 then explicitly enumerates the four other monitor-lifecycle references and states they stay literally true with no edit because they resolve through the Health monitoring convention (opencode: "nothing to launch, list, or cancel"). I checked each reference against the file text and the chain holds — including the weakest link, `autonomous-workflow.md:88`'s "(see `health-monitoring.md` for the cancellation command)", which is a pointer that lands on the reworded deferral rather than a standalone assertion that a command exists. Acceptance criteria (the four "Scope boundary" bullets) test this directly, including a bullet asserting CC/Pi still resolve to launching/cancelling a `/loop` monitor.

- **Issue 2 (auto-compaction names exactly two tools).** Resolved. Requirement 17(b) folds the context-window note into the authorized `health-monitoring.md` edit, rewording it to attribute handling to "each tool's own mechanism" rather than naming a fixed pair. Out of Scope explicitly records that opencode's context-window behavior is unverified in research and deferred to design as a non-blocking question, and the spec relies on no guarantee about it. A dedicated acceptance criterion checks the file names no fixed tool set for either the lifecycle or the context-window note.

- **Issue 3 (undefined "same artifacts" oracle).** Resolved. Both end-to-end acceptance criteria now define the oracle concretely — the same *set* of artifact files in the same per-phase subfolder structure (with named examples like `0-intent/intent.md`, `1-spec/spec.md`) — and explicitly exempt tool-native value formats (provider-qualified models, install destinations) from any "same content" expectation. Pass/fail is now judgeable.

- **Issue 4 (untestable recovery budget).** Resolved. Requirement 9 fixes the number: "2 recovery attempts per issue occurrence before escalation," owned by the orchestrator and applied reactively to the conditions always-on supervision surfaces. The matching acceptance criterion makes it drivable — two attempts fail, the condition recurs a third time, the orchestrator stops and escalates with the full payload (agent name, verbatim error, last-known progress, suggested next step). This matches the generic `health-monitoring.md` 2-retry budget and the per-tool auth-recovery rule.

## Issues

None blocking.

Two observations for the design phase (not spec defects):

- The literal-truth-as-no-op reading of `autonomous-workflow.md:88`'s "for the cancellation command" parenthetical depends on the `health-monitoring.md` rewording deferring cancel mechanics to the tool convention. The spec is explicit about this; design should confirm the reworded `health-monitoring.md` cleanly absorbs lines 13, 24, and 79 so the pointer resolves to "nothing to cancel" on opencode and still to `/loop-kill` on CC/Pi.
- `setup.md:104` ("Try to document the commands to start, list, and cancel this monitoring") is soft enough to remain literally true on a tool with always-on supervision and needs no edit; the spec's scope claim is unaffected, but design should keep the opencode convention's Health-monitoring answer ("always-on; nothing to launch, list, or cancel") aligned with this.

Feasibility was sanity-checked against the repo: 17 agents under `agents/`, per-tool `.rp.md` sections, an existing plugin package directory, and the Pi convention's check-then-install / auth-recovery / no-relay structure that opencode's setup mirrors. The spec is sound and ready for design.
