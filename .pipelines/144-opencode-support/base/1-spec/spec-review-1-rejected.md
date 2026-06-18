# Spec Review

## Verdict: rejected

## Summary

The spec is well-organized, faithfully tracks the consolidated requirements, holds the WHAT-not-HOW line cleanly, and writes mostly testable Given-When-Then criteria. It is close. But it is rejected on one load-bearing scope error that would mislead the design phase: Requirements 17 and 18 (and their acceptance criteria) assert that registering opencode changes **exactly two** generic skill files — `setup.md` and `health-monitoring.md` — and that every other generic file stays unchanged and tool-agnostic. That assertion is false against the actual skill tree. The launch-and-cancel health-monitor lifecycle that opencode's always-on supervision cannot satisfy is woven through at least three other generic files (`autonomous-workflow.md`, `resume-pipeline.md`, `review-pipeline.md`), none of which the spec accounts for. The spec inherited this blind spot from its research (Q6 grepped only for tool *names*, not for the launch/cancel lifecycle verbs that name no tool). Secondary issues: a generic statement in `health-monitoring.md` that names exactly the two existing tools and goes stale on a third, and two acceptance criteria that are not objectively verifiable as written.

## Issues

### Issue 1: "Exactly two generic files change" is false — the monitor launch/cancel lifecycle lives in at least three more generic files

**What's wrong:** Requirement 17, Requirement 18, and the first two "Scope boundary" acceptance criteria all assert that exactly two existing generic files change (`setup.md` supported-tools row + `health-monitoring.md` lifecycle wording) and that no other generic file gains opencode-relevant change. This contradicts the codebase. The orchestrator's instruction to **start** and **cancel** the recurring monitor — which the research itself establishes opencode cannot honor (supervision is always-on; there is nothing to launch or cancel) — is hard-coded in generic files beyond `health-monitoring.md`:

- `reference/autonomous-workflow.md:38` — "Start a recurring health monitor for the run per `reference/health-monitoring.md`."
- `reference/autonomous-workflow.md:88` — "Once the target phase has been reported, stop the health monitor (see `reference/health-monitoring.md` for the cancellation command) ..."
- `reference/resume-pipeline.md:7,9` — "Cancel any leftover health monitor" / "Leftover loops from a previous session persist and must be cancelled before the workflow launches a new one ..."
- `reference/review-pipeline.md:25,54` — "Cancel any leftover health monitor" / "an autonomous review follows the normal monitor lifecycle (cancel any leftover monitor, launch a fresh one) ...".

On opencode there is no monitor to start, no loop to cancel, and no leftover loop to clean up before resuming or reviewing. So either (a) these generic files also need a tool-agnostic wording flex (which breaks the "exactly two files" claim and must be enumerated and bounded by the spec), or (b) the spec must state how the always-on model satisfies these existing "start"/"cancel"/"cancel-leftover-before-relaunch" instructions verbatim with zero edits — and it must be one or the other, decided here, because the count is itself a hard requirement and an acceptance criterion.

**Where in spec:** Requirements 17 and 18; "Scope boundary" acceptance criteria (the "exactly two existing generic files changed" criterion and the "any generic file other than the two permitted edits ... contains no ... tool-specific awareness" criterion).

**Suggestion:** Re-derive the true set of generic files whose monitor-lifecycle wording must flex to stay tool-agnostic (grep for the launch/cancel verbs, not tool names: e.g. `health monitor`, `cancel`, `launch`, `leftover loop`, `stop the health monitor`). Then either widen Requirement 17 to that enumerated set with the same "tool-agnostic, CC/Pi behavior unchanged" constraint applied to each, or — if the design intends these sentences to stand unedited — make Requirement 17 state explicitly that the always-on supervision is treated as a no-op "start" and a no-op "cancel" so the generic prose remains literally true, and add an acceptance criterion proving CC/Pi behavior is unchanged for each such file. Do not assert a file count the codebase contradicts.

**Why it matters:** Requirement 17 is the spec's central scope contract and is itself testable ("exactly two existing generic files changed"). As written, an implementer who touches only `setup.md` and `health-monitoring.md` ships an opencode that, on resume and on review, instructs the orchestrator to cancel and relaunch a monitor that does not exist — directly contradicting Requirement 7 ("without the orchestrator launching or cancelling any separate monitor"). The design phase will build to the wrong scope boundary, and the scope-boundary acceptance criterion will pass against an incomplete change.

### Issue 2: The `health-monitoring.md` auto-compaction sentence names exactly the two existing tools and goes stale with a third

**What's wrong:** Requirement 17 scopes the `health-monitoring.md` change to "a lifecycle wording change." But `health-monitoring.md:24` contains a separate generic claim — "Both Claude Code and Pi auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it" — that enumerates exactly the two currently-supported tools. Adding a third tool either makes this sentence incomplete/misleading (it now silently excludes opencode) or requires an edit the spec has not authorized under its "lifecycle wording change" framing. The research (and therefore the spec) does not establish whether opencode auto-compacts context, so the spec cannot currently say whether this line is in scope or whether context-window handling on opencode is a gap.

**Where in spec:** Requirement 17 (the `health-monitoring.md` edit is characterized only as a "lifecycle wording change"); related: the acceptance criterion asserting non-permitted generic files contain "no ... tool-specific ... awareness."

**Suggestion:** Either fold this line into the permitted `health-monitoring.md` edit and state the intended tool-agnostic rewording (e.g. that context-window limits are handled by each tool's own mechanism, not the monitor), or add an explicit requirement/out-of-scope line stating opencode's context-window behavior is unchanged and why this sentence needs no edit. Resolve whether opencode auto-compacts; if unknown, surface it as a design-phase question rather than leaving it implicit.

**Why it matters:** A generic file that names "Claude Code and Pi" as an exhaustive pair is, after this feature, factually a tool-aware enumeration that excludes the newly supported tool. Left unaddressed it either violates the spec's own "no tool-specific awareness in other generic content" guarantee or quietly under-specifies opencode context handling.

### Issue 3: "Same inspectable artifacts" acceptance criteria are not objectively verifiable as written

**What's wrong:** Two acceptance criteria assert outcomes a tester cannot judge pass/fail without a defined oracle: "it completes every phase ... and produces **the same inspectable artifacts** RP produces on Claude Code and Pi" and "each phase produces **the same inspectable artifacts as on the other tools**." "The same artifacts" is undefined — same filenames? same folder layout? byte-identical content? The phase artifacts are partly tool-influenced (e.g. the captured Agent-models values are provider-qualified on opencode and bare aliases on CC, per Requirement 10), so "the same" cannot mean identical content.

**Where in spec:** "Tool selection and end-to-end runs" acceptance criteria (autonomous and assisted bullets).

**Suggestion:** Make the oracle concrete: e.g. "produces the same set of artifact files (same names and per-phase folder structure: `intent.md`, `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`, ... under the per-phase subfolders) as defined by the generic phase references," and explicitly exempt tool-native value formats (provider-qualified models, install destinations) from the "same content" expectation.

**Why it matters:** These are the headline end-to-end criteria. As written they cannot be turned into a passing/failing test, so "opencode reaches parity" becomes an unfalsifiable claim.

### Issue 4: The recovery-budget escalation criterion is not testable against the actual mechanism

**What's wrong:** Requirement 9 and its acceptance criterion state escalation happens "when a monitored condition cannot be auto-resolved **within RP's recovery budget**." The research (Q3) establishes that opencode's ensemble does **not** implement RP's per-issue 2-retry ladder — ensemble does one nudge (stalls) or mark/abort/report, and the retry-budget/ladder semantics "live with the orchestrator." The spec never resolves whether, on opencode, the 2-retry budget is enforced by the orchestrator, reduced, or effectively bypassed (ensemble reports after one shot). Without that, "within RP's recovery budget" has no defined value on opencode and the criterion cannot be tested (how many retries before escalation?).

**Where in spec:** Requirement 9 and the matching "Health monitoring" acceptance criterion ("cannot be auto-resolved within the recovery budget").

**Suggestion:** State, as an observable requirement, what the recovery budget *is* on opencode — e.g. the orchestrator owns and applies the same 2-retry budget reactively on the escalations ensemble surfaces, or it is explicitly reduced/different and that difference is named. The criterion should fix the number of recovery attempts before escalation so a test can drive a failure N times and assert escalation on attempt N+1.

**Why it matters:** Requirement 9 promises "the same escalation contract RP uses on the other tools," but the underlying mechanism differs materially on opencode. An undefined budget makes the contract untestable and risks the design silently dropping RP's retry semantics.
