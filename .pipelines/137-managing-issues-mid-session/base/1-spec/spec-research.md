# Spec Research — Managing Issues mid-session

> Phase 1 (Spec) running Q&A between `spec-analyst` and `spec-researcher`.
> Subject: the Radical Pipelines skill itself (`skills/radical-pipelines/`).

## Intent recap

**Goal:** Whenever the orchestrator creates or modifies an issue partway through a "work on an issue" session (which includes running a pipeline), it reliably follows the Managing Issues workflow — the short owner-led capture Q&A, and routing every tracker operation through the Issues convention — the same way it does when a session starts at that entry point.

**Open assumption (from intent):** The cause is likely that the skill's entry point gets lost over a long session, so by the time an issue needs to be opened the orchestrator no longer has the Managing Issues steps in view.

## Orientation (analyst's reading of the skill, before Q&A)

Key facts established by reading the skill:

- `manage-issues.md` is an **entry point**, reached only via the SKILL.md "Entry points" table at the *start* of a session ("When the owner starts a new session, determine which entry point applies").
- `manage-issues.md` describes the front door: owner-led capture Q&A (frame, ask goal, invite extras, reflect hypotheses, draft/confirm/write), the issue format (= phase-0 intent per `intent-format.md`), and the rule that **every tracker operation goes through the Issues convention** and **nothing is written until the owner approves the rendered draft**.
- There is **already one mid-session precedent** in the skill: `review-pipeline.md:12` says if a pipeline is already merged, "the requested change is new work: handle it as a NEW issue via `manage-issues.md`, not a review." So the skill already routes back to `manage-issues.md` from inside a session — but only in this one spot, and only by file reference.
- Nothing in `work-on-an-issue.md`, `autonomous-workflow.md`, or `assisted-workflow.md` describes the orchestrator creating or modifying an issue mid-pipeline (e.g. spinning off discovered follow-up work). The reading path that loads `manage-issues.md` is the session-start entry-point table only.

Initial hypothesis to validate: the gap is that issue creation/modification is only documented as a session-start entry point, so mid-session the orchestrator (a) may not realize the Managing Issues workflow applies, and (b) even if it remembers, may have lost the steps from its context over a long run.

## Q&A log

(running, one question at a time)
