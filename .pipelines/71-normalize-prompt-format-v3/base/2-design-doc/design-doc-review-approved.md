# Design doc review — APPROVED

Reviewer: `design-doc-reviewer` (phase 2, adversarial review). Input: `design-doc.md`, checked against the approved spec (`base/1-spec/spec.md`), the design research (`design-doc-research.md`), and the actual skill source files.

## Verdict

**Approved.** The design is standalone, internally consistent, technically sound, and faithful to the spec. Every claim I checked against the skill source holds, and all 14 spec requirements are covered by concrete, correctly grounded file-level changes. The four-file edit set (`create-pipeline.md` step 4, `conventions/setup.md` Issues verb-list, `intent-format.md` third H2, `minor` changeset) is complete and correctly scoped; nothing else goes stale.

## What was verified against the source

- **Step-4 anatomy** (`create-pipeline.md:21-27`): intro folder mechanics at `:23`, adapt sentence at `:25`, asset bullet at `:26` (which already routes through the Issues convention — the in-step tracker-access precedent the design leans on), self-containment rule at `:27`. Retention map is accurate.
- **Sole caller / sole numbered cross-reference**: repo-wide grep confirms `create-pipeline.md` is invoked only from `work-on-an-issue.md:43`, and `review-pipeline.md:37` is the only reference to a numbered create-pipeline step. Keeping step 4 a single step with a standalone authoring-discipline sentence retaining the verbatim phrase "following the schema and authoring discipline in `intent-format.md`" preserves that reference with zero edits to `review-pipeline.md` — the design's central structural decision is sound and meets spec requirement 3.
- **Gate feasibility**: `work-on-an-issue.md` step 2 (pipeline creation) precedes step 3 (mode choice), so the owner is present at intent-write time on every creation path, as claimed.
- **Gate precedent**: `manage-issues.md` step 5 ("Draft, confirm, write") packs draft→confirm→write into one titled step — the single-step precedent is real.
- **Issues convention**: `setup.md:64` is the single verb-clause capability statement quoted; the in-place extension is house-consistent; `load.md:16` is indeed a loose purpose summary, and no capability-level validation exists anywhere (`load.md` checks presence only), so additive-no-migration is correct. This project's `.rp.md` binds Issues generically, confirming the additive claim.
- **Intent format**: `intent-format.md` has exactly two H2s ("Schema and rendering", "Authoring discipline"); a new scope-named third H2 is the right placement, and `manage-issues.md:14,18` and `review-pipeline.md:37` point only at the shared schema/discipline — the scope-named heading suffices to keep the header out of issue bodies and review intents. Requirements 6 and 10 genuinely need no schema edits (`intent-format.md:12,13,22` already admit the content).
- **Provenance header form**: the #71 base intent confirms the two-line blockquote after the H1; nothing in the skill parses `intent.md`'s leading lines.
- **Forks**: `fork-pipeline.md` step 5 is a literal copy of inherited phase folders — the non-goal is correctly grounded.
- **Changeset**: `.changeset/config.json` lists `skills/**` in `changedFilePatterns`; package is `@automattic/radical-pipelines`; CONTRIBUTING's pre-1.0 bump table maps a backwards-compatible feature to `minor`. Correct.
- **Passthrough/gate complementarity**: the branch predicates in §1b are the exact complement of the gate condition (spec requirements 11/13), including the canonical-issue-plus-trivial-comment edge case and attachment/bare-cross-ref disqualifiers.

## Non-blocking notes (for the plan/implementation phase)

1. **`#NN` notation in the prospective step-4 text.** §1a and §1c describe the step-4 content with the parenthetical "(`#NN`, linked PRs/issues)", while the design's own hard constraint (§2, echoing `AGENTS.md:12`) and its Risks verification forbid `#NN` tokens in new skill text. The parentheticals are evidently reader-facing explanation borrowed from the spec's phrasing, not literal skill text — but an implementer transcribing §1a verbatim would violate the constraint the design itself states. The plan should make the tracker-agnostic phrasing of the actual skill text explicit.
2. **Italic part-labels in §1c are design organization, not skill text.** Labels like "*Fetch mechanics (issue-specific — not part of the borrowed pattern)*" would be odd meta-commentary if copied into `create-pipeline.md` (and would strain the skill's minimalism rules). The required "textual distinctness" is achievable through bullet ordering and the standalone authoring sentence alone; the implementation should not carry the meta-labels.
3. **Cosmetic**: the Background section says step 4 "today is three bullets (`create-pipeline.md:23-27`)" and then lists four items including `:23`, which is intro prose, not a bullet. The File-level changes section describes it correctly ("keeps the `:23` folder-mechanics intro").
4. **Slight overstatement**: "first mention of web-fetching anywhere in skill text" — two agent-role tables mention researchers investigating "the web" (`autonomous-phases/1 - spec.md:25`, `2 - design-doc.md:25`). The substantive point holds (no orchestrator web-fetch instruction exists anywhere), but the claim is not literally the first "web" mention.

None of these affect the design's decisions or its spec coverage; they are wording clarifications the plan phase can absorb.
