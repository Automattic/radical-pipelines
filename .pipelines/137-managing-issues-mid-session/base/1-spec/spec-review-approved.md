# Spec Review — APPROVED (iteration 1)

**Reviewer:** spec-reviewer
**Subject:** `…/base/1-spec/spec.md`
**Verdict:** APPROVED

## What was reviewed

The spec was reviewed adversarially against:

- Intent: `…/base/0-intent/intent.md`
- Requirements research: `…/base/1-spec/spec-research.md`
- The actual skill it modifies (`skills/radical-pipelines/`), to independently confirm every factual claim the requirements lean on.
- The project's `CLAUDE.md` skill-authoring rules — in particular the prose-not-software rule.

## Verification of the spec's factual claims against the skill

Every load-bearing claim in the spec was confirmed against the live skill:

- `manage-issues.md:3` is the front-door framing ("upstream of `work-on-an-issue.md`… does not create or run pipelines"); `:52-54` is the forward-only Close out ("advancing it into a pipeline happens separately through `work-on-an-issue.md`"). Both are the spots R4/AC3 target.
- `SKILL.md:50` frames Entry points as a once-at-session-start decision ("When the owner starts a new session…"); `:55` routes to `manage-issues.md`. This is the framing+retrieval cause the Overview describes.
- `review-pipeline.md:12` is the only mid-session route into `manage-issues.md`, and it is a bare hand-off with no explicit return. `review-pipeline.md:54` confirms a review "operates on the pipeline's existing tracker issue and creates no new one" (the metadata/run-update side that R5/Out-of-Scope rely on).
- `work-on-an-issue.md:33,35` reference `merge-pipeline.md`/`close-pipeline.md`; the file listing confirms neither exists — supporting the "noted gap, not addressed" Out-of-Scope bullet.
- `conventions/load.md:5-7` carries the re-read discipline ("Read it at the start of any workflow… load and verify it before starting any workflow") that `SKILL.md` lacks — substantiating R3's durability framing without forcing a placement.
- No spawned-agent file touches the tracker; `autonomous-workflow.md:70-84` blocker handling offers only re-run-prior-phase or stop, confirming the Part-3 silent spot and the "no spawned-agent behavior changes" Out-of-Scope bullet.

## Findings against each review dimension

**Completeness & testability.** AC1–AC6 are each behavioral and verifiable by reading the skill and tracing its reading paths. AC1 routes mid-session create/modify into the workflow (object scoped explicitly to the issue create/modify op, so it cannot be misread as dragging in metadata). AC2 tests the anti-duplication property (silent spots not separately patched). AC3 tests the no-hard-coded-next-step property in both directions. AC4 covers route+return correctness and consistency of the lone precedent. AC5 is a clean non-regression list. AC6 is conformance to the writing rules. No criterion is vacuous or untestable.

**Scope alignment.** The Out of Scope section matches the three locked scope decisions exactly: (1) run-time metadata excluded with the correct rationale that the intent's "routing every tracker operation through the Issues convention" describes the workflow's own behavior, not a directive to fold in metadata; (2) Option A — behavior guarantee only, no new recognition triggers; (3) missing merge/close files noted as a pre-existing gap, not folded in. The fourth bullet (no spawned-agent changes) is faithful to the research. R1 mirrors the intent goal precisely and does not silently expand it.

**Durability without pinning phase-2.** R3 states the durability requirement (the rule must be reliably re-encountered mid-run and must not depend solely on the session-start framing) and explicitly defers the exact file/section to phase 2. No AC asserts a specific placement.

**The resolved R4/AC3 contradiction holds.** The spec correctly requires that `manage-issues.md` hard-code *no* single next step — neither forward-only nor universal-return — with control returning to the invoking situation. This preserves the merged-pipeline caller's correct forward path (`review-pipeline.md:12` → `manage-issues.md:53`) while not force-funneling other callers. R4 and AC3 are mutually consistent, and the precedent's behavior is correctly characterized.

**No unresolved duplication tension.** R2's no-restatement/reliance clause, R5's scoping to route+return (explicitly excluding the trigger), and R4's callee-behavior adjustment sit at three distinct altitudes; none restates another. This mirrors the skill's established conventions-loaded-pointer pattern.

**Prose-not-software compliance (critical).** The spec's AC preamble states none of the criteria assert sections, wording, or ordering, and the criteria honor it. AC2 tests an absence-of-duplication property, AC3 tests a behavioral property of `manage-issues.md` (what it makes the orchestrator do, not its structure), AC4 tests routing/return behavior, and AC5 is non-regression. Naming a file as the locus of a behavioral check does not constitute a structural assertion. AC6 conformance is allowed. Compliant.

**Standalone readability.** The spec is self-contained: the Overview restates the structural cause, the lone precedent, and the goal; the Requirements, Out of Scope, and Acceptance Criteria do not require the research to be understood.

## Conclusion

The spec is complete, testable, faithfully aligned with the intent and the locked scope, states the durability requirement without pinning the phase-2 file decision, and complies with the prose-not-software rule and the rest of `CLAUDE.md`. No rejectable defect found.
