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

### Q1 — Inventory every mid-session point where the orchestrator creates/modifies an issue (or should)

**A1 (spec-researcher), summarized with citations:**

Part 1 — explicit routes to `manage-issues.md` / "create-or-modify issue" mid-session:
- Only TWO references to `manage-issues.md` exist in the whole skill.
  - `SKILL.md:55` — the "Entry points" table, framed at `SKILL.md:50` as **"When the owner starts a new session"** — i.e. the new-session front door, NOT a mid-session route.
  - `review-pipeline.md:12` — the ONE genuine mid-session route: if a requested change targets an already-merged pipeline, "the requested change is new work: handle it as a NEW issue via `manage-issues.md`, not a review." It only *names* the file; it does not restate the capture Q&A.
- No other place routes to `manage-issues.md` or instructs creating/modifying an issue mid-session. The gap is real.

Part 2 — tracker touches during a run NOT via `manage-issues.md`, split into two categories:
- **(A) Create/modify the issue (= the goal's target).** The Issues convention (project `.rp.md`) defines exactly two issue-mutating ops: "Creating an issue" and "Modifying an issue." In the skill these are reached only through `create-pipeline.md` (reads the issue, never writes — `create-pipeline.md:25-36`) and `manage-issues.md` (the only writer). Nothing else writes issue bodies.
- **(B) Non-authoring tracker ops during a run (status-mirroring, different kind).** Project `.rp.md` "Orchestrator updates during a run": run-start label, per-phase status, version label, assignee, branch push at run end. `review-pipeline.md:54` abstracts these as "every orchestrator-update obligation the project's conventions define for a run" and states "The review operates on the pipeline's existing tracker issue and creates no new one." `create-pipeline.md:25` and `work-on-an-issue.md:15` are read-only. The autonomous/assisted phase files touch the tracker not at all — **all tracker ops are the orchestrator's; no spawned agent ever touches the tracker.**
- Researcher's scope read: goal is narrowly about creating/modifying an issue (A); category B (labels/status/assignee/branch) is tracker activity but not issue authoring — appears out of scope, worth confirming as a deliberate exclusion.

Part 3 — spots where a follow-up/spun-off issue would naturally arise mid-session but the skill is SILENT:
1. Blocker handling (`autonomous-workflow.md:70-84`) — a blocker that is genuinely *separate work* (not a prior-phase gap) is a "spin off a new issue" moment; skill only offers re-run-prior-phase or stop.
2. Review "Split" advisory (`review-pipeline.md:19`) — splits unrelated changes into separate *reviews*; never considers an unrelated change might warrant a NEW issue.
3. Review "Fork vs. review" advisory (`review-pipeline.md:18`) — drastic change diverts to fork; never considers drastic/unrelated work could be a new issue.
4. Merge/Close terminal actions (`work-on-an-issue.md:33,35`) reference `merge-pipeline.md` and `close-pipeline.md` — **neither file exists** (confirmed). Merging/closing is the natural moment to *modify* the issue (close it, link the PR). Pre-existing structural gap; in-scope-for-#137 is a judgment call.
5. Assisted/autonomous phase scope questions (`assisted-phases/2 - design-doc.md:22`, `assisted-phases/3 - plan.md:33`) — agents log out-of-scope items as open questions / send owner back to revise; no "this might be a separate issue" off-ramp. (Lower confidence in scope, since the intent frames the actor as the orchestrator, not agents.)

Bottom line: structural cause is that `manage-issues.md` is presented purely as a new-session entry point (`SKILL.md:50-55`), with no general rule that mid-session issue authoring re-enters it. The only existing mid-session link is `review-pipeline.md:12`.

**Analyst's working conclusions from A1:**
- The actor is always the **orchestrator** (no agent touches the tracker). The fix lives in orchestrator-facing reference text.
- The behavior to guarantee is: *whenever the orchestrator, mid-session, decides to create or modify a tracker issue, it follows `manage-issues.md` (capture Q&A + Issues-convention routing), the same as from the entry point.*
- Category B (labels/status/assignee/branch) is out of scope (issue metadata mirroring, not issue authoring). To confirm with owner.
