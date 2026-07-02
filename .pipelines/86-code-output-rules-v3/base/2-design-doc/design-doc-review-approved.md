# Design Doc Review

## Verdict: approved

## Summary

The design is complete, sound, faithful to the research, and factually accurate against the codebase. It realizes the rule as a prose-only edit to exactly the five profiles that write host-project output (three producers get a Guidelines disposition, two reviewers get a detection checklist item), enforced on the existing per-phase review gate with zero new machinery. Every requirement (R1–R10) and acceptance criterion (AC1–AC7) is traceably served by a Key Decision or component, each with credible alternatives and explained trade-offs. The three load-bearing constraints the review must guard are all honored explicitly: the rule wording names only concrete referents and never uses "pipeline" (R4/AC5); the reviewer's detection is a referent judgment, not a token/keyword/path scan (R5); and the shared text is duplicated across profiles rather than extracted to a referenced file (this repo's CLAUDE.md). Scope is respected — the deferred Rule 1, authorship policy, earlier-phase agents, new enforcement machinery, vocabulary bans, and branch/tag names all stay out. The design fixes strategy, placement, and the discriminator while deferring only exact wording downstream, which is the correct altitude for the design phase.

## Verification performed

Factual claims were checked against the worktree and all hold:

- **The one deletion target is real and unique.** `agents/code-writer-tdd.md:33` (*"Comments must be self-contained — never reference the spec, the plan, or any other artifact."*) is the only true output-reference-avoidance precedent line across all 18 profiles. The sourcing lines (`code-writer-tdd.md:55`, `docs-writer.md:26`) are about inputs, correctly left untouched. Its placement inside the "Document every public symbol…" list under `### 2. Implement with TDD` matches the design's "narrower line in a workflow step" description, and removing it is correctly justified by R7 and the CLAUDE.md "state a general rule once" convention.
- **The `<artifacts-folder>` boundary-token asymmetry is real.** `code-writer-tdd` and `code-writer-e2e` do not use the token; `docs-writer` (lines 13–14) and both reviewers (6 uses each) do. This grounds the design's decision to phrase the boundary in referent terms for the two code-writers and via the placeholder elsewhere (R10/AC7).
- **The commit-format agent-name tag is convention-added.** `.rp.md:51` and `setup.md:60` (`<commit-description> (<agent-name>)`) confirm the tag is appended by convention, so the exemption (R6/AC3) is correctly grounded and profiles need not hardcode it.
- **Component selection is complete.** The five targets are exactly the agents that write host-project output; the other 13 profiles (spec-*, design-doc-*, *-plan-*) write only artifacts under the artifacts folder and are correctly excluded (spec Out of Scope).
- **Reviewer checklist structure matches.** Both reviewers hold the `### 2. Review the changes` → "Check, for the tasks in this batch:" list with the bold-label "— does …?" house style the detection bullet must match, and the must-fix / reject-liberally posture the enforcement wording rides on (R8/R9).

## Notes for downstream (non-blocking)

These do not affect the verdict; they are wording-level items the design already routes to the Plan/Code phase, recorded here so the downstream writer keeps them in view:

- The illustrative producer sketch embeds specimen strings (`task3Helper`, "per R9", "as the design doc specifies") *inside the profile text itself*. Because `agents/*.md` is host-project output in this self-hosting repo, those specimens are exactly the "illustrative/example artifact reference" not-a-violation case (research row j) — allowed by the design's own discriminator. The final wording should keep such examples unmistakably in specimen form so a future reviewer reads them as examples, not as pointers the profile asserts about its own creation.
- The design's own "single most important" risk — false positives on this repo's product vocabulary read as violations — is correctly identified as the primary wording constraint. The Plan/Code phase must keep the rule referent-based with explicit not-a-violation examples, never a word-list.
