# Code Plan Review — Rejected (1)

> Reviews `3-plan/code-plan.md` (7 tasks) against `2-design-doc/design-doc.md` (KD-1…KD-12) and
> `1-spec/spec.md` (15 reqs + acceptance criteria). Verdict: **Rejected.** One blocking issue
> (a sanctioned scope creep that contradicts both the design's confinement and the plan's own
> ground rules), plus two minor observations to fold into the next iteration.

## Verdict

**Rejected.** The plan is strong overall — accurate file paths, faithful traceability, the right
altitude, no test or documentation planning — but Task 6 grants permission to edit a line that the
design deliberately placed out of scope, and that permission contradicts the plan's own Scope
ground rule. Because the entire design and the orchestrator's explicit instruction hinge on the
change being confined to `create-pipeline.md` **step 4**, a plan that opens a sanctioned door to
edit outside step 4 must be corrected before implementation.

## What I verified against the codebase (all confirmed accurate)

The plan's structural assumptions are real:

- `create-pipeline.md` step 4 is at lines 21–28 and step 5 ("Commit") at lines 30–32 — exactly as
  the plan cites. The line-level citations (`:25` "Adapt the issue content…", `:26` "Do not add
  requirements…" guardrail, `:27` asset download, `:28` self-contained) all match the file.
- `manage-issues.md` is a valid delegation target: it defines the canonical format
  (Title→H1 / `## Goal` required / `## Constraints` / `## Context` /
  `## Assumptions / directions to explore`, optional, omit-empty, no `N/A`) at its lines 14–22, the
  input→section classification rule at lines 50–54, and the content guardrails (Goal as outcome,
  hypotheses labeled open, never substitute a goal) at lines 17–20, 31, 58. Its line-14 description
  ("the orchestrator turns the issue into `0-intent/intent.md`") describes *that* it happens, not
  *how*, so it stays coherent after the rewrite — Task 7's claim holds.
- No existing reference file cross-references `manage-issues.md` — the plan's "first cross-reference"
  claim (Tasks 1, 5; KD-7) is correct.
- The **Issues** convention explicitly covers reading: `conventions/setup.md:64` — "the orchestrator
  needs a way to **read**, comment on, and update them." So the comments-read pointer (Task 5,
  Task 7) does not dangle, and KD-5/KD-12 are sound. `gh`/`--json` appear only in `.rp.md`, never in
  the skill body — the plan honors KD-5 by never baking in a concrete tracker command.
- `pipeline-versioning.md:27` sets the phase-0 predicate to `0-intent/intent.md`; lines 66 and 89–90
  establish `0-intent` as the byte-identical shared root. `fork-pipeline.md:42` copies `0-intent`
  with `cp -r`. All three "no approval file" reasons (KD-11) check out.
- `autonomous-workflow.md:39` and `assisted-workflow.md:17` carry phase 0 as "Already in place"; the
  autonomous "no questions" rule is scoped to after run-start (`autonomous-workflow.md:11`), so no
  carve-out is needed — Task 7 is right.
- The `**If all three hold**` / `**If any fails**` idiom matches the live
  `**If matches exist**` / `**If no matches exist**` bullets in `work-on-an-issue.md:28,39` (KD-1).

## Blocking issue

### B1 — Task 6 permits editing line 3 (the file intro), which is outside step 4 and outside the design's confinement

Task 6's Changes (plan lines 217–219):

> "Optionally, the step 4 header description (current line 23 area, **or the file's intro at line 3**)
> may gain a few words acknowledging that confirmation may occur — this stays within the file under
> edit. No other text in the file changes."

This is wrong on two counts:

1. **It contradicts the plan's own Scope ground rule.** Plan lines 11–13 state: "Every task below
   touches only that file's **step 4** (current lines 21–28), except Task 7, which … edits
   **nothing**." Line 3 of `create-pipeline.md` is the file-level summary
   ("Creates a new pipeline through phase 0 — sets up the worktree and artifacts folder, writes
   `intent.md`, and commits."), which is **not** step 4. Task 6 therefore sanctions an edit its own
   plan forbids two sentences earlier — an internal inconsistency a code-plan-writer would have no
   way to resolve except by guessing.

2. **It widens the design's confinement.** KD-12 (design lines 391–392) sanctions exactly one
   optional addition: "Edit only `create-pipeline.md` step 4 (**its header description** may gain a
   few words acknowledging the possible confirmation — still within the file under edit)." "Its
   header description" is the `### 4. Generate the initial intent` step header, *not* the file intro.
   The design's central thesis — and the orchestrator's explicit instruction — is that the change is
   "confined to a rewrite of `create-pipeline.md` step 4 only." Granting permission to touch line 3
   opens a path to edit outside step 4 that the design deliberately closed.

This is not a style nitpick: it is a sanctioned scope expansion beyond what the design traces to.
An "optional" permission in a plan is precisely the kind of latitude a code-plan-writer/implementer
acts on. Remove the "or the file's intro at line 3" clause; Task 6's optional edit must be confined
to the **step-4 header description** (the `### 4.` line's area), matching KD-12 verbatim — or drop
the optional edit entirely, since step 4's body already states confirmation may occur.

## Minor observations (fold in; not independently blocking)

- **M1 — Task 6 still cites "line 23 area" for the step-4 header description.** Line 23 is the lead
  *sentence* of step 4, not the `### 4.` *header* (line 21). KD-12's "header description" most
  naturally reads as the step header text. When you tighten B1, make the target unambiguous (the
  `### 4. Generate the initial intent` step header, e.g. line 21), so the writer doesn't re-introduce
  an out-of-scope edit by aiming at the wrong line.

- **M2 — Task 5's "no escape hatch" lives only in the prose, not the Acceptance bullet's testable
  core.** The Acceptance does end with "There is no escape hatch letting a synthesized result that
  resembles the body skip the gate," which is good and observable. No change strictly required, but
  consider making it parallel to req 10's framing ("a failing clause means judgment was exercised, and
  that judgment is what the owner verifies") so the implementer cannot misread it as a post-synthesis
  resemblance check (the very thing KD-6 forbids). This is a clarity nudge, not a defect.

## What is already correct (so the next writer preserves it)

- **Scope discipline (modulo B1).** Single edited file; step 5 left byte-identical; the inline
  `**If …**` idiom over sub-headings/tables/new files (KD-1); asset download hoisted once before the
  branch and stated for both paths, not duplicated (KD-2, req 14).
- **Delegation, not duplication.** Both clause A's heading taxonomy and the synthesis section-mapping
  point at `manage-issues.md` rather than re-listing it (KD-3, KD-7); the one synthesis-specific
  "not more authoritative than the body" note is correctly called out as net-new (KD-7).
- **Abstraction altitude.** All issue reads via the **Issues** convention; external URLs at
  "web-fetch capability" altitude with no concrete tool named; the one-level boundary stated
  positively (KD-5, KD-9).
- **The gate.** Declarative unordered conjunction with no separate "transforms the source?" check
  (KD-6, req 5); clause A four-point structural check with the title excluded, Goal-only passing, no
  near-miss tolerance (KD-3, req 6, OOS-6); clause B strict zero-count, mirrored comments excluded
  (KD-5, req 7, OOS-7); clause C body-only scan with the @-mention/`![…]`/repo-file exclusions
  (KD-4, req 8).
- **Confirmation & no-file.** Full proposed `intent.md` as the review surface, iterate-until-approved,
  commit only on explicit approval, and **no** approval/review file on either path — with the three
  load-bearing reasons (predicate, shared-root byte-identity, fork copy) all verified against the
  codebase (KD-10, KD-11, reqs 11–13, OOS-2).
- **No test or documentation planning.** Task 7 is a read-and-confirm coherence check mandated by
  KD-12, not test authoring; the rewrite of the reference file *is* the deliverable, correctly noted.
- **Coverage and traceability.** Every spec requirement (1–15) and every KD (1–12) maps to at least
  one task; every out-of-scope item is accounted for; ordering and per-task dependencies are sound.

## Required for approval

Fix **B1** (drop the "or the file's intro at line 3" permission; confine Task 6's optional edit to
the step-4 header description, or remove it). Folding in **M1** and **M2** would strengthen the plan
but is not independently blocking. Nothing else needs to change.
