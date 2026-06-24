# Code Plan Review

## Verdict: rejected

## Summary

On substance the plan is strong: it covers all twelve spec requirements and the design's key decisions, its structural anchors are accurate against the real profiles (the narrower line is exactly `code-writer-tdd.md:33` and exists nowhere else in `agents/` or `skills/`; the commit steps and step-2 reviewer checklists are where the tasks say they are), the canonical-block / narrower-line-removal / product-commit-no-provenance / reviewer-enforcement-plus-product-commit-inspection chain is complete, the `## Guardrail scopes` `None` rendering binds correctly (the launch prompt passed no scoped gates and `.rp.md` declares no guardrails convention), and the inspection-flow framing is a reasonable substitute for an absent runnable suite. It is rejected for one blocking defect: every task is typed `tdd`, which dispatches a `code-writer-tdd` whose profile is hard-wired to a unit-test contract the plan itself forbids these tasks from satisfying, making every task un-dispatchable without a blocker. Two secondary issues compound it (pure-verification tasks with no testable product; Req 1 untraced from any task).

## Issues

### Issue 1: Every task is `Type: tdd`, but a `code-writer-tdd` cannot execute a prose-only profile edit without violating either its own profile or CLAUDE.md

**What's wrong:** All eight tasks carry `Type: tdd` (lines 88, 109, 122, 135, 150, 165, 182, 199). The `code-writer-tdd` profile is hard-wired and gives the writer no escape hatch: step 2 (`agents/code-writer-tdd.md:17-23`) mandates "Follow red / green / refactor for **unit tests** … Write unit tests derived from the task's Acceptance criteria. The Acceptance list IS the test contract: every Acceptance criterion must be exercised by at least one test. Run them and confirm they fail … You write **unit tests only**." Step 3 (`:45`) adds "Confirm every per-task Acceptance criterion is covered by a passing test before declaring the task done," and a Guideline (`:56`) repeats "Acceptance is the test contract. Drive RED from it."

But every task's product is **Markdown agent-profile prose**, and every per-task Acceptance criterion is a property of that prose (e.g. Task 1: "The canonical block states Rule 1 keyed to the touched-vs-untouched axis…"; Task 8: "byte-identical across all five carrying profiles"). The only "unit test" that can exercise such a criterion is a structural test asserting the content of an agent file — which is forbidden three times over: by `CLAUDE.md:17` ("The skill is prose, not software. Do not write structural tests that assert the content of skill or agent files…"), by the plan's own Overview (line 9: "**no task writes structural tests that assert the content, sections, wording, or ordering of any profile or skill file**"), and by Task 8 (line 200).

The plan's Overview cannot resolve this for the writer. A `code-writer-tdd` follows **its own profile**, not narrative prose in the plan's Overview; the task block it receives contains Goal/Files/Changes/Depends/Traces/Acceptance, and its profile says to drive RED from that Acceptance with a unit test. Faced with a task whose Acceptance is testable only by a forbidden structural test, the writer hits its own contradiction clause (`:55`: "If the task as delivered is … contradictory, or forces you to make a design decision, stop and report a blocker") and blocks. So every task either (a) produces a forbidden structural test, or (b) raises a blocker. Neither is a clean execution.

**Where in plan:** All tasks (`Type: tdd`, lines 88/109/122/135/150/165/182/199); the contradiction is between those and the Overview (line 9) / Task 8 (line 200).

**Suggestion:** This is a dispatch-model mismatch the plan cannot paper over by tagging `tdd`. The only two available Types (`tdd | e2e`, per the plan template) both assume a runnable product with automated tests; this feature has neither. That mismatch is a prior-phase decision the plan-writer should surface as a blocker (per `code-plan-writer.md:81`): the spec/design frame a no-code, instructions-only change, but the available writer roles both presuppose code-plus-tests, so there is no writer role that can execute a prose-only profile edit verified by inspection. The smallest revision that would unblock is a decision — owned by the design or the orchestration model, not inventable inside the plan — establishing how an inspection-verified, prose-only task is dispatched and to which agent. Absent that, the plan should report the blocker rather than emit eight `tdd` tasks that each force the writer into a contradiction.

**Why it matters:** A plan that cannot be dispatched without inducing a blocker on every task is not executable. The whole point of the plan is that "a group of code-writers can execute [it] without making further design decisions" — here, the very first writer of every task must either break a hard repo rule or stop and escalate.

### Issue 2: Tasks 3 and 8 are pure-verification tasks with no testable product, which a `tdd` writer cannot satisfy

**What's wrong:** Task 3 ("Files to change: light prose fixups only, if integration reveals an awkward seam; no behavioral change", line 123) and Task 8 ("Files to change: None expected", line 200) are verification/consistency passes, not production tasks. Their Acceptance criteria assert states that already hold if the prior tasks were done correctly ("reads coherently," "byte-identical across all five copies," "the narrower line exists nowhere"). A `code-writer-tdd` is required to write a failing unit test, then code to make it pass — there is no product to write and no admissible test to write (the only test would be the forbidden structural/diff assertion). These tasks have no RED phase available and no passing-test deliverable, so they cannot be "declared done" under the writer's own step-3 gate.

**Where in plan:** Task 3 (lines 119-130), Task 8 (lines 196-210).

**Suggestion:** Fold the byte-identity and narrower-line-absence verification into the reviewer's enforcement path (the `code-reviewer` already re-drives Flow 9, which checks exactly this) rather than into standalone writer tasks, or otherwise rework them so they are not dispatched to a unit-test-driven writer with no testable product. This depends on the Issue 1 resolution.

**Why it matters:** Even if Issue 1 is resolved, a verification-only task handed to a producing writer has no work the writer's contract recognizes; it will be reported as under-specified.

### Issue 3: Req 1 (always-on, no opt-out) is not traced from any task

**What's wrong:** Req 1 / Acceptance "Always-on application" is named only in **Flow 1** (line 27), an inspection flow — no task's `Traces to` lists Req 1. The requirement is in fact satisfied implicitly (Tasks 1/4/5/6/7 install the canonical block as unconditional standing prose, and no task adds an opt-out), so coverage exists; but no task is explicitly accountable for the "no opt-out / unconditional" property, which the guideline "Cover every acceptance criterion … by at least one task" expects to be visible in a task's trace.

**Where in plan:** Task Traces-to lines (97, 114, 127, 141, 156, 172, 189, 206) — none include Req 1; only Flow 1 (line 27) does.

**Suggestion:** Add Req 1 / "Always-on application" to the Traces-to of the tasks that install the canonical block (at least Task 1, and the producer/reviewer install tasks), and make at least one task's Acceptance assert that the block is unconditional standing text with no enable/disable/override guard.

**Why it matters:** Traceability is the plan's audit surface. An acceptance criterion no task claims can be silently dropped during execution or revision, even when today it happens to be covered.
