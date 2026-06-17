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

### Q2 — What cross-cutting-rule idioms does the skill use, and is `manage-issues.md` mid-session-ready?

**A2 (spec-researcher), summarized with citations:**

1. The skill uses BOTH rule mechanisms, for different jobs:
   - **(a) Central general rules** — `SKILL.md:12-16` "Rules": cross-cutting invariants stated once, globally, never restated (`SKILL.md:14` "Humans only talk with you, never with the other agents."; `SKILL.md:15` artifacts invariant). This is the home for a truly cross-cutting orchestrator invariant.
   - **(b) Central pointer to a shared file** — `SKILL.md:42-46` "Project conventions" points to `conventions/load.md` (the DRY mechanism CLAUDE.md prescribes).
   - **(c) Per-entry-point repeated pointer** — the exact line "Before executing these steps, make sure project conventions are loaded (see `conventions/load.md`)." appears ONLY at the two entry points: `work-on-an-issue.md:7` and `manage-issues.md:5` (the latter continues "Every tracker operation — reading, creating, modifying an issue — goes through the **Issues** convention."). It is NOT carried by `create-pipeline.md`/`fork-pipeline.md`/`resume-pipeline.md`/`review-pipeline.md` — those are reached from within `work-on-an-issue.md` after conventions are loaded, so restating would be forbidden duplication. Discipline: the pointer sits at the reading-path root and everything reachable inherits it silently.
   - **Style verdict:** the skill favors "state the rule once at the right altitude" over "patch each silent spot." Patching the Part-3 silent spots individually would violate CLAUDE.md ("when a general rule already covers a case, state it once at that general level — don't add special-case restatements"). **Idiomatic fix = ONE general rule, not five edits.**

2. Where a "any create/modify routes through `manage-issues.md`" rule attaches:
   - `SKILL.md` Rules — most idiomatic *home* for the canonical statement, but on its own shares the out-of-view-over-a-long-run fragility the intent flags. Necessary-but-maybe-not-sufficient.
   - Entry-points table framing (`SKILL.md:50` "When the owner starts a new session") — this framing IS the bug; it scopes `manage-issues.md` to session start. Broadening it fixes the *framing* defect but not the *retrieval* defect (still in SKILL.md).
   - `manage-issues.md` own opening — only on the path if something already routed you there; can't be the trigger, it's the destination.
   - **Issues-convention description (`load.md:16`, `setup.md:62-66`)** — STRONG: `load.md` is re-read at the start of any workflow (`load.md:6` "Read it at the start of any workflow"; `load.md:7` "load and verify it before starting any workflow"), so it is more reliably in-view over a long run than SKILL.md Rules. The Issues convention is the abstraction every tracker op already routes through; co-locates with `manage-issues.md:5`.
   - **Design tension (researcher's flag):** placement isn't just "where it reads best once," but "where it's reliably re-encountered when the orchestrator acts." The skill already has a re-read discipline for conventions (`load.md`) but NOT for SKILL.md. So a lone SKILL.md line is weak against the intent's context-loss hypothesis. (This is largely a phase-2 design decision; spec should state the durability requirement, not the exact file.)

3. `manage-issues.md` mid-session fitness — mostly self-contained, but TWO bits assume a fresh session-start entry and would read wrong mid-run:
   - **Opening `manage-issues.md:3`** — "This is the **front door**: it is upstream of `work-on-an-issue.md` and stops once the issue exists — it does **not** create or run pipelines." The front-door/upstream framing presumes a fresh start flowing forward into work-on-an-issue.md; entered mid-session the orchestrator is already downstream (inside a run, pipeline may already exist).
   - **Close out `manage-issues.md:52-54`** — "The issue now exists; advancing it into a pipeline happens separately through `work-on-an-issue.md`." Assumes the next step is to START pipeline work; mid-session the orchestrator typically needs to RETURN to what it was doing (finish the review, resume the run, report the blocker), not advance the new issue.
   - Everything else (capture Q&A steps 1-5, modify→read-first branch line 30, approval gate lines 20/50, "report the issue reference" line 53) is situation-neutral and reusable as-is. So the body is reusable; only the front-door framing and forward-only Close out need a mid-session-aware adjustment (e.g. a "return to where you were" off-ramp).

**Analyst's working conclusions from A2:**
- Fix shape = a single general rule ("any time the orchestrator creates or modifies an issue, it does so through `manage-issues.md`"), placed at an altitude where it stays reliably in view mid-run; PLUS a small adjustment to `manage-issues.md`'s front-door framing and Close out so a mid-session entry returns the orchestrator to what it was doing. NOT per-spot patches of the Part-3 silent moments.
- The spec must state the durability requirement (rule stays in view / is re-encountered when the orchestrator acts mid-run) without pinning the exact file — that placement is a phase-2 design choice.
- Open scope decisions for the owner (via team-lead): (i) confirm category B exclusion; (ii) whether the fix is purely the behavior guarantee (Option A, matches intent wording) or also adds proactive recognition of the Part-3 silent spots (Option B); (iii) whether the missing `merge-pipeline.md`/`close-pipeline.md` files are in scope.

### Scope decisions (resolved by team-lead, per the intent — autonomous run)

1. **Scope = issue create/modify (the issue body/intent) only.** Run-time tracker metadata (status, labels, assignee, branch push) is governed by the separate "Orchestrator updates during a run" project conventions, NOT the Managing Issues workflow. The intent's phrase "routing every tracker operation through the Issues convention" describes how the Managing Issues workflow itself behaves; it is not a directive to fold run-time metadata into that workflow. **Metadata operations are out of scope.**
2. **Option A.** The intent's Goal is explicitly conditional ("Whenever the orchestrator creates or modifies an issue partway through…"). Option B would substitute a larger, different goal (teaching new spin-off triggers), forbidden by intent-format discipline absent evidence a premise is false. **Guarantee the behavior when the orchestrator decides to create/modify an issue; do NOT add new recognition triggers** for the Part-3 silent spots.
3. **Missing `merge-pipeline.md` / `close-pipeline.md` are out of scope** — a pre-existing structural gap unrelated to #137's goal. Record as a noted known gap (e.g. under Out of Scope), do not fold in.

**Ground rule (team-lead):** the intent is ground truth. If research surfaces concrete evidence a premise is false (e.g. the entry point is NOT actually lost mid-session), STOP and report it as a blocker rather than silently changing the goal.

### Q3 — Return/re-entry mechanics and whether the lone precedent returns correctly

**A3 (spec-researcher), summarized with citations:**

1. The skill has TWO one-way jump idioms; **no general suspend-and-resume primitive exists**:
   - **(i) "read X, then continue to step N"** — caller dispatches into a sub-procedure and names the landing point: `work-on-an-issue.md:30` (resume → step 3), `:31` (fork → step 3), `:34` (review → step 3), `:43` (no matches → create → step 3). (`:33,:35` Merge/Close are terminal, no "continue", and the files don't exist.)
   - **(ii) "Return to X"** — callee closes by pointing back: `resume-pipeline.md:42` "Return to `work-on-an-issue.md`."; `review-pipeline.md:50` "Return to `work-on-an-issue.md` step 3…"; `review-pipeline.md:58` footer; `fork-pipeline.md:51` softer "Continue from the phase that follows…".
   - Intra-file step loops ("return to step N") exist within the assisted phase files but are not cross-file detours.
   - **Key finding:** idioms (i) and (ii) are complementary halves of one round-trip, but only between `work-on-an-issue.md` and the pipeline-action files. Every existing return hard-codes ONE fixed destination (`work-on-an-issue.md`, usually step 3). There is NO generic "do sub-procedure X, then resume wherever you were" primitive. A mid-session detour into `manage-issues.md` from an arbitrary point (blocker mid-run, review advisory, merge) has no existing variable-return pattern to inherit.

2. **The lone precedent (`review-pipeline.md:12`) has NO explicit return — it is itself incomplete.** It is a bare hand-off ("handle it as a NEW issue via `manage-issues.md`"); it does not say "then return here." After it, `manage-issues.md`'s Close out (`:52-54`) points the orchestrator toward `work-on-an-issue.md` to start fresh pipeline work. For the merged-pipeline case that happens to be coherent (a review IS the wrong tool there, fresh pipeline work IS the right next step), so line 12 isn't broken — but it succeeds *by luck*: its desired return coincides with the callee's hard-coded forward-only exit. The gap appears the moment the same hand-off is reused from a call site whose desired return is NOT "go start pipeline work" (e.g. a blocker where you want to resume the run). **Conclusion: line 12 is a precedent for the route IN, not for return behavior. The fix must make return-behavior explicit rather than copy line 12's bare hand-off.**

3. **No mid-session entry-point re-determination exists.** `SKILL.md:50` "When the owner starts a new session, determine which entry point applies…" is a once-at-session-start decision. Nothing in the skill re-runs it or re-reads the Entry-points table mid-run. `manage-issues.md` is reached only from the table at session start (`SKILL.md:55`) or the single hand-off at `review-pipeline.md:12`. So there is NO re-entry hook to lean on — the fix must establish the route.

**Analyst's working conclusions from A3:**
- **Return-behavior must be a stated requirement.** A general "mid-session create/modify → `manage-issues.md`" rule, entered from arbitrary points, cannot inherit the existing single-fixed-destination return; the orchestrator must end up back at whatever it was doing (resume the run / finish the review / report the blocker), not be force-funneled toward starting fresh pipeline work.
- The specific spot that hard-codes the wrong return for a mid-session caller is `manage-issues.md` Close out (`:52-54`), reinforced by its front-door framing (`:3`). The fix's mid-session-aware adjustment lives there.
- The fix establishes a route that does not exist; it is not merely re-wording an existing hook.

### On the intent's open premise (no blocker)

The intent's open assumption — "the skill's entry point gets lost over a long session" — is **refined, not falsified**, by the research, so no blocker per the ground rule. There are two contributing causes pointing to the same fix:
- **Framing defect:** `manage-issues.md` is scoped to session start (`SKILL.md:50` "When the owner starts a new session"); the skill never frames it as applying mid-session. The orchestrator may not realize the Managing Issues workflow applies at all mid-run.
- **Retrieval defect:** even the framing lives in SKILL.md, which (unlike `conventions/load.md`) has no re-read discipline, so it can fall out of context over a long run — matching the intent's stated hypothesis.
Both point at the same behavioral goal (mid-session issue authoring re-enters `manage-issues.md`), so the goal stands unchanged.
