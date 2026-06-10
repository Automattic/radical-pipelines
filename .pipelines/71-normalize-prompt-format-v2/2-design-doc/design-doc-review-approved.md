# Design Doc Review — APPROVED

**Artifact reviewed:** `2-design-doc/design-doc.md`
**Reviewed against:** `1-spec/spec.md` (15 requirements, 9 out-of-scope, Given-When-Then acceptance criteria) and `2-design-doc/design-doc-research.md` (DQ1–DQ5, DD-1…DD-12).
**Feature under design:** a localized rewrite of `skills/radical-pipelines/reference/create-pipeline.md` step 4 — the radical-pipelines skill changing itself (issue #71). The skill's own files are the codebase verified against.

**Verdict: APPROVED.** The design doc has complete spec coverage, sound traceability, verified feasibility against the real skill files, genuine alternatives + trade-offs per decision, documented failure modes, and a clean scope boundary. Two implementers reading it would build the same thing. One non-blocking factual imprecision (in KD-8's supporting anecdote, not its decision) is noted below for opportunistic fixing — it does not affect what gets built and is not grounds to re-run the design phase.

---

## What I verified (and the evidence)

### Coverage — every requirement and criterion has a decision/component
- All 15 requirements map to a KD via the traceability table (design-doc.md:535–558), and I confirmed each mapping is substantive, not nominal. All 9 out-of-scope items map (incl. OOS 9 correctly carried as an accepted, unaddressed limitation). All 11 acceptance criteria map (design-doc.md:562–574), including the Goal-only-passes, @-mention/screenshot/repo-link exclusions, resemblance-still-confirms, and fork/resume-not-invoked cases.

### Traceability — each decision points back to a req/criterion
- KD-1…KD-12 each carry an explicit "Traces to" line. Spot-checked the load-bearing ones (KD-6 → req 5/9–10; KD-11 → req 13/OOS 2; KD-12 → req 15/OOS 1,3–5) and they hold.

### Feasibility — verified against the actual skill codebase
- **Idiom (KD-1, KD-2).** Confirmed `work-on-an-issue.md:28–39`, `resume-pipeline.md:15–16`, `fork-pipeline.md:42` use the bolded inline `**If X**`/`**If Y**` idiom and hoist shared parts; `create-pipeline.md` is in the terse workflow-driver cluster. The rewrite shape matches the file it edits.
- **Canonical format + delegation (KD-3, KD-7).** `manage-issues.md:14–22` defines the four headings and "omit empty, no `N/A`"; `:17` (Goal as outcome), `:20/:31` (hypotheses labeled open), `:58` (never silently substitute a goal) supply the inherited content rules. `grep` confirms there is currently **no** cross-reference to `manage-issues.md` from any other reference file, so KD-7's "first cross-reference" claim is accurate and clean to introduce.
- **No-approval-file invariants (KD-11).** All three load-bearing reasons verified: phase-0 predicate is `0-intent/intent.md` alone and uniquely has no `-review-approved.md` companion (`pipeline-versioning.md:25–32`); shared-root byte-identity via tree SHA (`:38`); `0-intent` is always the shared root (`:66`); forks `cp -r` `0-intent` verbatim (`fork-pipeline.md:42`).
- **Confirmation idiom (KD-10).** Matches `manage-issues.md:62` ("show it to the owner; do not write until the owner explicitly approves") and the assisted-phase show-full-artifact + "Repeat until the owner explicitly approves" loops (`assisted-phases/1 - spec.md:118`, `2 - design-doc.md:142`) — while correctly writing **no** approval file (those phases write `-review-approved.md`; phase 0 must not).
- **Issues-convention abstraction (KD-5).** `.rp.md` names GitHub + `gh` for create/modify and Linear-MCP for status; the skill body never bakes in `gh`. The "reading/comments" path is exercised today via the convention pointer (`work-on-an-issue.md:15`), so the net-new comments read does not dangle. `.rp.md` correctly left unedited.
- **Scope confinement (KD-12).** Verified every named neighbor stays coherent without an edit: `manage-issues.md:14` describes *that* the issue becomes the intent (unaffected by the new HOW); `work-on-an-issue.md:39` pointer picks up the rewrite; both workflow tables show phase 0 "Already in place" (`autonomous-workflow.md:39`, `assisted-workflow.md:17`); the "no questions" rule is scoped to "once the autonomous run/workflow starts" (`SKILL.md:24`, `autonomous-workflow.md:11`), structurally after creation, so no carve-out is needed; all four intent-touching agents read `intent.md` read-only as "the original idea" (`spec-writer.md:12`, `spec-analyst.md:24`) and none creates/validates it; `README.md:112` confirms phase 0 has no agent profile. No OOS creep.

### Alternatives, trade-offs, dependencies, failure modes
- Every KD states Choice / Alternatives / Trade-offs / Traces-to with real (not strawman) alternatives. Dependencies are enumerated (Issues convention reading capability, web-fetch capability, `manage-issues.md` taxonomy, versioning/fork invariants) with no hidden ones. Failure modes (false skip, false synthesis, unfaithful synthesis, unbounded recursion, accidental approval-file creation, short-circuited confirmation) each carry a mitigation and an owner-visible detection signal. The conservative failure direction (borderline → synthesize + confirm) is correctly built in.

### Altitude — design, not plan/code
- The doc stays at design altitude: a HOW sketch (Appendix) explicitly flagged "not final copy; exact wording is the implementer's job in phase 4." No task breakdown, no final prose copy. Correct.

### The specifically-scrutinized claim — KD-8 (title-as-H1 + `> Source:` attribution)
- **The decision is genuinely spec-required, not scope creep.** Spec req 1 (`spec.md:15`) states verbatim: "The issue title becomes the document's top-level heading (H1), and a source attribution to the originating issue is included so the artifact is self-contained." Title-as-H1 and source attribution are mandated by the spec; `manage-issues.md:16` lists Title as the first rendered section. Documenting the template explicitly and applying it on both paths is correct realization of req 1 + req 9 (incidental formatting is not a transformation) + the self-containment rule (`create-pipeline.md:28`). Not creep.
- **The "legacy deviation exists" substance is true and verified.** On disk, `.pipelines/107-.../0-prompt/prompt.md` and `.pipelines/90-.../0-prompt/prompt.md` use the **phase name** (`# Prompt`) as the H1, while `108/68/70/81/83/91` use the issue title. So the design's core observation — that some recent phase-0 artifacts deviate by using the phase name as the H1, and the spec overrides them — is accurate. Correcting it in the spec's favor is the right call.

---

## Non-blocking note (fix opportunistically; do not re-run design)

**KD-8 / DD-8 misidentify *which* artifacts deviate.** The doc says "the two *most-recent* phase-0 artifacts use the phase name (`# Intent` / `# Prompt`) as the H1," and the research names them `71` and `107`. Verified on disk:
- The phase-name-H1 deviants are `107` and `90` (both `# Prompt`). **No** on-disk artifact uses `# Intent` as a literal H1.
- There is no feature-subject-matter `71` phase-0 artifact on disk; the only `71` `0-intent/intent.md` is *this run's own workspace*, so citing `71` is circular/self-referential.

This is a factual imprecision in KD-8's *motivating anecdote* only. It is **non-load-bearing**: the decision (title-as-H1 + `> Source:`) flows from spec req 1, not from counting which historical artifacts deviated, and the doc already instructs the implementer to treat the title-as-H1 template as authoritative regardless. It does not change what gets built, does not affect feasibility, and does not touch traceability or scope — hence it is a note, not a rejection. The phase-4 implementer should ignore the specific artifact citation and build from req 1.

---

## Minor observations (no action required)
- **Clause C and full GitHub blob/tree URLs.** KD-4's body says "links to repo files do not count" without spelling out the `https://github.com/owner/repo/blob/...` form, which by surface looks like an "external URL." The research (DQ2.3) resolves this — a blob/tree URL is a repo-file link, not an issue/PR URL — and the exclusions are structurally distinguishable, so an implementer has enough. Worth keeping in mind when writing the final prose, but adequately specified.
- **Emergent count-not-fetch observation (KD-6).** Correctly recorded as an observation, not a mandated sequencing rule, so it does not contradict req 2's full-comment read on the synthesis path. Consistent.

The design doc is ready to advance to the planning phase.
