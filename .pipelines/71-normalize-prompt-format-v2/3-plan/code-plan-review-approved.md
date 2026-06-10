# Code Plan Review — Approved

> Re-reviews `3-plan/code-plan.md` (7 tasks, revised in commit `eeb96f7`) against
> `2-design-doc/design-doc.md` (KD-1…KD-12) and `1-spec/spec.md` (15 reqs + acceptance criteria).
> Confirms the one blocking issue (B1) and both minor observations (M1, M2) from
> `code-plan-review-1-rejected.md` are genuinely resolved, and applies a fresh adversarial pass over
> the whole plan. Verdict: **Approved.**

## Verdict

**Approved.** The single blocking issue from the prior review — Task 6's sanctioned permission to edit
line 3 (the file-level summary), outside step 4 and outside the design's confinement — is fully removed,
and the optional edit is now confined to step 4's `### 4.` header with an explicit prohibition on touching
line 3 and an observable acceptance clause. Both minor observations are also folded in. A fresh pass over
coverage, traceability, ordering, granularity, feasibility, scope, and the no-test/no-doc-planning
discipline surfaces only one new *minor* (non-blocking) observation. The plan is ready for implementation.

## Confirmation that the prior review's issues are resolved

I diffed the revision (`git show eeb96f7`) and re-read the affected tasks and the actual skill file.

### B1 (blocking) — RESOLVED

The prior review required: drop the "or the file's intro at line 3" permission; confine Task 6's optional
edit to the step-4 header description (matching KD-12 verbatim), or remove it.

The revised Task 6 (plan lines 222–227) now reads:

> "Optionally, the step-4 **header description** — the `### 4. Generate the initial intent` step header at
> current line 21 — may gain a few words acknowledging that confirmation may occur, exactly as sanctioned by
> KD-12. This stays within step 4 (the file under edit, step 4 only). Do **not** touch line 3 (the file-level
> summary) or any other line outside step 4; the file intro is out of scope. This optional touch is not
> required … No other text in the file changes."

Confirmed against the codebase:

- The "or the file's intro at line 3" clause is **gone**.
- The optional edit is confined to **step 4's `### 4.` header (line 21)** — matching KD-12's "its header
  description" (design lines 391–392).
- An explicit prohibition was added: "Do **not** touch line 3 (the file-level summary) or any other line
  outside step 4."
- The line references are unambiguous. I verified against `create-pipeline.md`: **line 3** is the
  file-level summary ("Creates a new pipeline through phase 0 — … writes `intent.md`, and commits."); **line
  21** is the `### 4. Generate the initial intent` header. The plan's citations are correct.
- The Acceptance bullet (plan lines 234–239) now carries an **observable** clause asserting nothing outside
  step 4 is touched: "Any optional wording added under this task lives only within step 4 (the `### 4.`
  header description at current line 21) — line 3 (the file-level summary) and every line outside step 4 are
  untouched." This is the testable assertion the prior review found missing.

The internal contradiction with the plan's own Scope ground rule (plan lines 11–13, "Every task below
touches only that file's **step 4**") is eliminated.

### M1 (minor) — RESOLVED

The ambiguous "line 23 area" target is gone; Task 6 now names "the `### 4. Generate the initial intent`
step header at current line 21," so an implementer cannot re-introduce an out-of-scope edit by aiming at
the wrong line.

### M2 (minor) — RESOLVED

Task 5's "no escape hatch" is lifted from prose into the **Acceptance bullet's testable core** (plan lines
206–209) and made parallel to req 10's framing: "The gate is triggered by a *failing skip clause* (the
orchestrator had to look beyond the bare body and exercise judgment, and that judgment is what the owner
verifies — mirroring spec req 10's framing), not by re-inspecting the synthesized output: there is no escape
hatch whereby a synthesized result that happens to resemble the body skips the gate, and no post-synthesis
resemblance test is performed." The Traces-to line (plan lines 193–195) gained the same framing. This
removes any room to misread the gate as a post-synthesis resemblance check (which KD-6 forbids).

## Fresh adversarial pass (whole plan, not only the three fixes)

I re-verified every structural assumption against the live skill files; all hold:

- `create-pipeline.md` step 4 = lines 21–28, step 5 ("Commit") = lines 30–32; line 3 = file-level summary.
  The line-level citations the plan relies on (`:25` "Adapt the issue content…", `:26` guardrail, `:27`
  asset download, `:28` self-contained) all match the file.
- `manage-issues.md` is a valid delegation target: canonical format at lines 14–22 (Title→H1 / `## Goal`
  required / `## Constraints` / `## Context` / `## Assumptions / directions to explore`, optional,
  omit-empty, no `N/A`), the input→section classification rule at lines 50–54, and the content guardrails
  (Goal as outcome, hypotheses labeled open, never substitute a goal) at lines 17–20, 31, 58. Its line-14
  description ("the orchestrator turns the issue into `0-intent/intent.md`") describes *that* it happens, not
  *how* — so it stays coherent after the rewrite (Task 7 holds).
- No existing reference file cross-references `manage-issues.md` — the plan's "first cross-reference" claim
  (Tasks 1, 5; KD-7) is correct.
- The **Issues** convention covers reading: `conventions/setup.md:64` — "the orchestrator needs a way to
  **read**, comment on, and update them." The comments-read pointer (Tasks 3, 5, 7) does not dangle. No
  `gh issue` / `gh pr` / `--json` appears anywhere in the skill body (grep exit=1); concrete `gh` usage is
  confined to `.rp.md` (lines 11, 16, 24). KD-5's project-agnostic abstraction is honored.
- `.rp.md:9` ("GitHub is the source of truth; Linear mirrors it for status tracking only") backs clause B's
  "comments mirrored elsewhere (e.g. Linear) are not considered."
- `pipeline-versioning.md:27` sets the phase-0 predicate to `0-intent/intent.md`; the tree section
  establishes `0-intent` as identical across every pipeline and "always the shared root."
  `fork-pipeline.md:42` copies `0-intent` via `cp -r`. `resume-pipeline.md` re-enters the worktree and never
  re-runs phase 0. All three "no approval file" reasons (KD-11) check out.
- `autonomous-workflow.md:39` and `assisted-workflow.md:17` carry phase 0 as "Already in place"; the
  autonomous "no questions" rule is scoped to after run-start (`autonomous-workflow.md:11`), so no carve-out
  is needed — Task 7 is right.
- The `**If all three hold**` / `**If any fails**` idiom matches the live `**If matches exist**` /
  `**If no matches exist**` bullets in `work-on-an-issue.md:28,39` (KD-1).

**Coverage and traceability.** Every spec requirement (1–15) maps to at least one task (plan table lines
283–299); every KD (1–12) maps to at least one task (lines 303–316); every out-of-scope item is accounted
for (lines 318–322). Spot-checked the load-bearing rows — all accurate.

**Ordering and granularity.** Task order (1 framing → 2 hoisted asset → 3 gate → 4 skip arm → 5 synth arm →
6 convergence → 7 neighbor verification) is sound; per-task `Depends on` lines are correct (e.g. Task 2
depends on 1; Tasks 4–5 depend on 1 and 3; Task 6 depends on 4 and 5; Task 7 depends on 1–6). Granularity
is appropriate — each task is a coherent piece of the single step-4 rewrite, with the ground-rule note
(plan lines 30–32) correctly framing them as logical pieces of one cohesive passage.

**Feasibility.** Every task is implementable from the plan alone: the gate clauses (Task 3) are stated as
design-altitude prose with structurally-distinguishable inclusions/exclusions; the synthesis branch (Task 5)
delegates to `manage-issues.md` rather than re-listing; the confirmation loop follows the existing
`manage-issues.md` render→show→approve idiom.

**Scope.** Held to a single edited file (`create-pipeline.md` step 4), step 5 byte-identical, Task 7 edits
nothing. No new file, no sub-headings, no decision table (KD-1).

**No test or documentation planning.** Confirmed — the rewrite of the reference file *is* the deliverable;
Task 7 is a read-and-confirm coherence check mandated by KD-12, not test authoring.

## Minor observation (non-blocking; for the implementer to resolve deliberately)

- **The fate of current line 28 (the standalone "phase 0 subfolder must be self-contained" bullet) is
  under-specified.** Task 1 folds self-containment into the `> Source:` attribution blockquote (plan line 53,
  "states the file is self-contained"), but no task states whether the *separate* line-28 bullet is dropped
  as now-redundant or kept. The design is itself ambiguous: its **template** (design lines 161–172) puts
  self-containment only in the `> Source:` line and shows **no** separate bullet, while its **appendix
  sketch** keeps it (design line 528: `The phase 0 subfolder must be self-contained. [preserves current
  :28]`). Because the design's authoritative template omits the standalone bullet and Task 1 follows the
  template, the plan's reading is defensible and the self-containment requirement (spec req 1's
  "self-contained") is satisfied either way — so this is **not** blocking. Noted only so the implementer
  decides consciously rather than by accident; either resolution is within the design's latitude.

## What is correct (so the implementer preserves it)

- **Scope discipline.** Single edited file; step 5 byte-identical; inline `**If …**` idiom over
  sub-headings/tables/new files (KD-1); asset download hoisted once before the branch, stated for both
  paths, not duplicated (KD-2, req 14); the optional step-4 header touch now correctly confined (KD-12).
- **Delegation, not duplication.** Clause A's heading taxonomy and the synthesis section-mapping both point
  at `manage-issues.md` (KD-3, KD-7); the one synthesis-specific "not more authoritative than the body" note
  is correctly called out as net-new.
- **Abstraction altitude.** All issue reads via the **Issues** convention; external URLs at "web-fetch
  capability" altitude with no concrete tool named; the one-level boundary stated positively (KD-5, KD-9).
- **The gate.** Declarative unordered conjunction with no separate "transforms the source?" check (KD-6, req
  5); clause A four-point structural check, title excluded, Goal-only passing, no near-miss tolerance (KD-3,
  req 6, OOS-6); clause B strict zero-count, mirrored comments excluded (KD-5, req 7, OOS-7); clause C
  body-only scan with the @-mention/`![…]`/repo-file exclusions (KD-4, req 8).
- **Confirmation & no-file.** Full proposed `intent.md` as the review surface, iterate-until-approved,
  commit only on explicit approval, no approval/review file on either path — with the three load-bearing
  reasons (predicate, shared-root byte-identity, fork copy) all verified against the codebase (KD-10, KD-11,
  reqs 11–13, OOS-2).
- **Gate trigger.** Now unambiguously the *failing skip clause*, not a post-synthesis resemblance test
  (KD-6, req 10) — both in Task 5's prose and its Acceptance core.

## Conclusion

The code plan is **approved** and ready for implementation. The blocking scope issue and both minor
observations from the prior iteration are fully resolved; the fresh pass surfaces only one non-blocking
under-specification (line-28 self-containment bullet) that sits within the design's own latitude.
