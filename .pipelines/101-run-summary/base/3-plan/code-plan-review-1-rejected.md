# Code Plan Review

## Verdict: rejected

## Summary

The plan is strong: every spec acceptance criterion and every design decision (D1–D7, C1–C7) maps to a task, the verified-against-the-live-skill claims are almost all accurate (step numbering, table shapes, `.rp.md` model tiers, changeset config), tasks are small and traceable, and the out-of-scope restatement matches the spec. It is rejected for a handful of specific defects in the pinned wording and ordering: the new phase-5 verify step as pinned would drop artifacts today's step 6 enumerates; the task order contradicts the plan's own cross-reference claim (Task 3 consumes a mechanism Task 6 defines); a `setup.md` heading example contradicts that file's actual convention (and the plan's verification claim about it is wrong); and several mandated wordings conflict with the skill-authoring constraints the plan itself imposes (mandated negative phrasing, an over-broad no-git rule, and a duplicated spawn-prompt statement). Each is small and locally fixable; none requires redesign.

## Issues

### Issue 1: The new final verify step drops artifacts today's step 6 enumerates

**What's wrong:** Today's step 6 in `5 - docs.md` verifies that "all documentation changes, every `docs-review-N-rejected.md`, and `docs-review-approved.md` are committed on the pipeline branch." Task 3 pins the replacement verify step as checking "`docs-review-approved.md` **and** `run-summary.md` committed on the pipeline branch," and its acceptance bullet repeats the two-item check. A code-writer following the plan literally would remove "all documentation changes" and "every `docs-review-N-rejected.md`" from the verification — a regression neither the spec nor the design asks for. The full-enumeration pattern is the house style: phase 1's step 6 enumerates `spec-research.md`, `spec.md`, every rejection file, and the approval file.
**Where in plan:** Task 3, Changes item 3 ("New final verify step") and Acceptance bullet 3.
**Suggestion:** Pin the verify step as extending today's enumeration, not replacing it: all documentation changes, every `docs-review-N-rejected.md`, `docs-review-approved.md`, **and** `run-summary.md` are committed on the pipeline branch. Update the acceptance bullet to match.
**Why it matters:** The verify step is phase 5's final safety net; the plan is the last artifact that pins exact skill text, and as written it weakens an existing check while only intending to relocate it.

### Issue 2: Task order contradicts the plan's own cross-reference claim — Task 3 consumes Task 6's mechanism

**What's wrong:** The Tasks intro states "the only content coupling is cross-references, all of which point at files created/edited in an earlier-or-equal task." But Task 3 (commit 3) has the phase-5 procedure launch the writer "with the **resolved summary format** (Task 6 / C4: project override else the skill default)" — the convention row and resolution rule that make "resolved" meaningful land in `load.md` only at Task 6 (commit 6). Between commits 3 and 6 the procedure references a resolution mechanism the skill does not yet define, and Task 3's own Depends-on acknowledges the coupling.
**Where in plan:** Tasks intro (ordering paragraph); Task 3, Changes item 3 and Depends-on; Task 6.
**Suggestion:** Move Task 6 to immediately after Task 1 (it depends only on Task 1) so the convention and resolution rule exist before any task references them. Alternatively, pin explicitly that `5 - docs.md` must not name the convention or the resolution rule — only "the resolved summary format" the orchestrator hands over — and correct the ordering claim.
**Why it matters:** Each task is meant to be independently committable; as ordered, commits 3–5 leave the skill referencing a mechanism it doesn't define, and the plan's stated ordering invariant is false, which undermines the code-writer's trust in the stated dependencies.

### Issue 3: Task 6's `setup.md` heading example contradicts the file's actual convention

**What's wrong:** The plan's "Verified against the live skill" section claims `setup.md` has "one `### <Name> (required/optional)` entry per convention." In reality, required entries are suffixed `(required)` (`### Pipeline base slug (required)`), and optional entries are **unmarked** (`### Commit format`, `### Spawning teams of agents`, `### Agent models`) — no `(optional)` suffix exists anywhere in the file. Task 6's suggested heading `### Run summary format (optional)` would introduce a novel suffix style inconsistent with every existing optional entry.
**Where in plan:** "Verified against the live skill this session" (the `conventions/load.md` / `setup.md` bullet); Task 6, Changes item 3.
**Suggestion:** Pin the heading as `### Run summary format` (unmarked), matching the existing optional entries, and correct the verification claim.
**Why it matters:** The code-writer copies the plan's examples verbatim; the repo's skill rules demand consistency with existing structure, so this would surface as a defect in the produced skill text.

### Issue 4: Mandated wordings conflict with the plan's own skill-authoring constraints

**What's wrong:** Two conflicts between the "Skill-authoring constraints (apply to every task)" section and what individual tasks require:

1. The constraint says "no mention of any agentic coding tool, issue tracker, **git**, or GitHub in the skill files," yet Task 2 keeps "committed to the pipeline branch" in the predicate's context and Task 3's acceptance requires the procedure to state the writer "commits `run-summary.md`." Commit/branch vocabulary is pervasive in the skill (e.g. `pipeline-versioning.md` runs `git rev-parse`); R9 only requires the **summary's format and mechanism** to avoid git/GitHub/tracker-specific concepts (no base ref, no diff). A literal reading of the constraint forbids text other tasks' acceptance demands.
2. Task 3 mandates stating that the writer "is **not** part of the writer/reviewer rejection loop, and has **no** review gate," and its acceptance requires "ungated, and outside the rejection loop." That is negative phrasing the constraints section (and the project's skill rules) forbids unless strictly necessary — and it is not necessary here: "launched on **approved**, exactly once per run" plus the step structure already conveys it positively. The same applies to Task 6's "agents never read `.rp.md`" — nothing gives agents a reason to read it.

**Where in plan:** "Skill-authoring constraints" (the Stay generic bullet); Task 3, closing paragraph and Acceptance bullet 5; Task 6, Changes item 2.
**Suggestion:** Scope the genericity constraint to match R9 and the design: the new format file and the writer's mechanism reference no git/GitHub/tracker-specific concept (no base ref, never inspects a diff); the skill's established commit/branch vocabulary is unaffected. In Tasks 3 and 6, require only the positive statements (single-shot, launched once on approval; conventions are handed to agents in spawn prompts) and drop the mandated negatives, or state why each is strictly necessary.
**Why it matters:** The code-writer cannot satisfy both the blanket constraint and the per-task acceptance as written, forcing a mid-task judgment call; the mandated negatives would then be bounced by the repo's skill rules on review.

### Issue 5: The spawn-prompt-passing fact is stated twice on one reading path

**What's wrong:** Task 6's acceptance requires `load.md` to state that the resolved format "is passed to the writer in its spawn prompt," and Task 3 requires `5 - docs.md` to state the writer is launched with the resolved format "handed in its spawn prompt alongside Artifact folder and Commit format." That states the same fact in two files the orchestrator reads in sequence, and "alongside Artifact folder and Commit format" restates the universal spawn inputs `autonomous-workflow.md` step 5 already owns. The existing pattern is the opposite: consumption is stated at the point of use only — `load.md` says nothing about how the Agent models convention is consumed; phase files state only launch-specific extras (e.g. step 4's base ref).
**Where in plan:** Task 6, Changes item 2 and Acceptance bullet 2; Task 3, Changes item 3.
**Suggestion:** State the passing once, at the point of use: the phase-5 procedure (and the fork step via its reference to it) names the launch-specific extra input — the resolved summary format — following the step-4 base-ref precedent, without restating Artifact folder / Commit format. `load.md` keeps only the convention row and the resolution rule (project override else skill default).
**Why it matters:** The repo's skill rules forbid duplicate information on a reading path; as pinned, the duplication ships and the doc phase or a later skill review has to unwind it.
