# Code plan review — APPROVED

Reviewer: `code-plan-reviewer` (phase 3, adversarial review). Input: `code-plan.md`, checked against the approved design (`base/2-design-doc/design-doc.md`), the design review notes (`design-doc-review-approved.md`), the approved spec (`base/1-spec/spec.md`), and the actual skill source files.

## Verdict

**Approved.** The plan covers the full approved design — all four deliverable files (`create-pipeline.md` step 4, `conventions/setup.md` Issues verb clause, `intent-format.md` third H2, the `minor` changeset) map one-to-one onto Tasks 1–4, with Task 5 as a whole-set consistency gate. Tasks are independently verifiable, each with concrete acceptance criteria and runnable grep/diff checks. No missing tasks, no scope creep, no ordering hazards.

## What was verified against the source

- **Line-number grounding is accurate.** `create-pipeline.md` step 4 is lines 21–27 with the intro prose at `:23`, the adapt sentence at `:25`, the asset bullet at `:26`, and the self-containment rule at `:27` — exactly as the plan's retention map states. `setup.md:64` is the single capability verb clause ("a way to read, comment on, and update them") and `:66` is the ask-the-owner line with the only tolerated tracker parenthetical. `intent-format.md` has exactly two H2s ("Schema and rendering" at `:5`, "Authoring discipline" at `:17`), so "new third H2" is correct.
- **Design-review note 1 (no `#NN`/PR/tracker names) is honored.** The plan's "Hard constraints" section calls the design's "(`#NN`, linked PRs/issues)" parenthetical out as reader-facing shorthand that must NOT land in skill text, mandates "in-tracker cross-references" as the literal wording, repeats the constraint per-task (Tasks 1–4 acceptance criteria), and backs it with greps. This directly resolves the review's note 1.
- **Design-review note 2 (no italic meta-labels) is honored.** The plan states textual distinctness is achieved "purely by bullet ordering and a standalone sentence, not by labels or headings," lists the labels not to carry over, and Task 5 re-checks for leaked meta-labels.
- **Design-review note 3/4 (cosmetic/overstatement)** required no plan action; the plan correctly does not propagate either inaccuracy.
- **Verbatim phrase preserved.** Task 1 requires the exact phrase "following the schema and authoring discipline in `intent-format.md`" in a standalone authoring bullet, uninterrupted by fetch mechanics, with a dedicated grep; Task 5 re-confirms `review-pipeline.md:37` (verified present in the source: "the `create-pipeline.md` step-4 pattern") still resolves with `review-pipeline.md` absent from the diff.
- **Minimal diff enforced twice**: the do-not-edit list in the constraints section, and Task 5's exact-four-files `git status --porcelain` check. Step 4 stays a single numbered step; step 5 stays "Commit"; zero renumbering — matching the design's central structural decision.
- **Spec coverage**: the plan's step-4 structure (gather → If/Otherwise → fetch/author/assets/gate → self-containment) plus the both-branch provenance pointer, the one-level bound, the unreadable-reference note, the non-owner-proposals-as-open-Assumptions clause, the transient-gate statement, and the passthrough predicates as the exact complement of the gate condition together cover all 14 spec requirements; Task 5 closes the loop by re-reading the design's requirement table against the landed text.
- **Changeset**: `.changeset/` currently holds only `README.md`, `config.json`, `pipeline-reviews.md`, so the suggested `normalize-issue-intent.md` does not collide; the `minor` bump for `@automattic/radical-pipelines` and the format mirroring `pipeline-reviews.md` match the existing changeset.
- **Ordering**: Task 3 → 1 → 2 → 4 → 5 is sound (the step-4 pointer references the header Task 3 defines; Task 5 must run last) and the plan correctly notes Tasks 1–4 are otherwise independent.
- **AGENTS.md grounding**: lines 10 and 12 confirm the no-negative-phrasing and no-tracker-platform constraints the plan cites.

## Minor non-blocking notes (for the implementer)

1. **Task 2's quote of `setup.md:64` adds bold that is not in the file.** The actual line has no `**…**` markup around "a way to read, comment on, and update them" — the bold is quote-emphasis inherited from the design. Do not introduce bold markup into the extended clause; keep the line's existing plain style.
2. **Task 1's parenthetical rationale is implementer guidance, not skill prose.** Phrases like "parallel to how the skill never names a tracker tool" and "(Passthrough does not skip the gather; it degenerates to …)" explain intent; author the actual skill wording in the house idiom rather than transcribing these explanations. The plan signals this for meta-labels and `#NN`; the same reading applies to all its explanatory parentheticals.
3. **Cosmetic**: Task 5's tracker-leakage grep duplicates `GitLab|GitLab` in the pattern; harmless.
4. Task 1's acceptance criterion "no … negative phrasing beyond what the existing step already uses" should be read with `AGENTS.md:10`'s carve-out: the confirmation gate's "do not write `intent.md` until the owner explicitly approves" is operationally necessary negative phrasing and is expected.

None of these block implementation; the plan is ready to execute as written.
