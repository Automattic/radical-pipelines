# Design Doc Review 1 — Rejected

**Verdict:** Rejected.

**Scope reviewed:** `2-design-doc/design-doc.md` against `1-spec/spec.md` and
`2-design-doc/design-doc-research.md`, with the named edit sites verified
firsthand against the live skill files.

The design is strong overall: the run-layer model is coherent, the
single-anchor-in-`pipeline-versioning.md` approach is sound, the
composition-not-reimplementation framing is faithful to the spec, every
named edit site exists exactly as described (verified line by line), and the
research's nine topics are reflected without inventing new decisions. The
honest reporting of "very nearly so" agent edits and of R16 closing a
pre-existing gap is exactly right. It is rejected for one concrete coverage
gap (blocking) plus one minor clarity item (fix while you're in there).

---

## Blocking

### B1. R12's origin-reference is under-realized in the design doc — two MUST facets are dropped

R12 has three mandatory facets:

1. mandatory for reviews, absent from issue/base prompts;
2. **self-contained** — it carries the *substance* of the request (a direct
   quote or faithful paraphrase) **plus** a convenience link, so a later
   phase reading only the review prompt understands what prompted it; and
3. any **source assets** are placed in the review's `0-prompt/` folder and
   referenced relatively, the same as for issue/base prompts.

The design doc realizes only facet (1). The three-sites table (line 110) and
the decisions/approach prose (lines 33, 45, 158) name the Origin reference as
"mandatory" and "review-only" and locate its specification in
`review-pipeline.md` step 5 — but the design doc itself never states facets
(2) or (3):

- **Self-containment (substance + link)** is nowhere in the design doc. This
  is the facet acceptance criterion 3 tests directly ("a mandatory origin
  reference describing where the review came from **with enough substance to
  stand alone**"). A plan author reading only the design doc would know to add
  an Origin section but not that it must carry a quote/paraphrase rather than
  a bare link — so the artifact does not demonstrably realize criterion 3.
- **Review-source asset placement** (`0-prompt/`, relative refs) is dropped
  entirely. The design doc covers base-prompt assets (via the
  `create-pipeline.md` step-4 reference) but is silent on review-prompt
  assets, which R12 explicitly requires.

The research (`design-doc-research.md`, T5, the Origin-reference paragraph and
the 3×4 site-local contract) fully specifies both facets. The design doc must
faithfully reflect the research and realize every requirement/acceptance
criterion; here it dropped two requirement-level outcomes the research had
resolved. These are not step-level minutiae — self-containment and asset
handling are observable outcomes the spec pre-decides and criterion 3 checks.

**Smallest fix:** In the design doc's "Prompt format and the three sites"
section (and/or the corresponding Key Decision), state that the review-only
Origin section is (a) self-contained — substance as a direct quote or faithful
paraphrase plus a convenience link — and (b) that review-source assets are
placed in the review's `0-prompt/` and referenced relatively, the same as
issue/base prompts. One or two sentences; no structural change.

---

## Minor (fix while addressing B1)

### M1. Decision-rule block placement is imprecise relative to the menu structure

The design doc says the RESUME/REVIEW/FORK decision-rule block is "inserted
after the menu" (line 55) / "after the menu" (line 125). In the live
`work-on-an-issue.md`, the menu ends at line 35, which is the **Close**
sub-bullet — indented inside the phase-5-only sub-block (lines 32–35). Taken
literally, "after line 35" would nest the chooser inside that sub-block, where
it cannot see Resume/Fork (which are always-offered top-level bullets at lines
30–31). The research (T4, the R25 paragraph) correctly specifies "at the
top-level bullet indent, so it can see all three actions" — but the design doc
omits this detail, leaving room for two implementers to place the block
differently.

**Smallest fix:** Note in the design doc that the decision-rule block sits at
the top-level bullet indent (sibling to Resume/Fork), not inside the phase-5
sub-block, so it can reference all three same-issue actions.

---

## Verified and accepted (no action needed)

- All named edit sites exist and match: `work-on-an-issue.md` (lines 30–35
  menu, Resume/Fork already carry "then continue to step 3"),
  `pipeline-versioning.md` (Model/Runs insertion point, predicate table,
  state paragraph, lineage/tree SHA paths, Rendering section),
  `create-pipeline.md` step 4 + asset bullet, `fork-pipeline.md` step 5 `cp`
  line (and the confirmed correctness fix: after eager `base/`, the parent's
  prompt is at `<parent>/base/0-prompt`, so the current `<parent>/0-prompt`
  source path would fail — the `base/` prefix is load-bearing),
  `manage-issues.md` (line 14 rendering rule, schema bullets, discipline
  bullets, line 32 tracker-only rule), `resume-pipeline.md` (the two cited
  headings "Cancel any leftover health monitor" / "Re-attach to the branch and
  worktree" exist verbatim; steps 3/4), both workflows (autonomous `:60`
  handoff, `:48` subfolder, assisted `:26` subfolder), `4 - code.md` /
  `5 - docs.md` reviewer-launch lines ("the base ref to diff against"), and the
  six reviewer "per pipeline" parentheticals at the exact named lines.
- `review-pipeline.md`, `prompt-format.md`, `merge-pipeline.md`,
  `close-pipeline.md` are all absent as claimed; Review/Merge/Close dangle.
- `.rp.md` version-label trigger (line 36, "creating, resuming, or forking")
  and per-phase status ladder (line 35, `0 - Prompt` keyed on creation) match
  the design's claims; the "or reviewing" edit and optional status-ladder note
  are coherent.
- The reviewer base-ref derivation is feasible and internally consistent:
  reviewers already accept "the base ref to diff against" as a launch-prompt
  input and diff `base-ref → current HEAD` (`code-reviewer.md:14,19`,
  `doc-reviewer.md:14,20`). The dual capture points (`review-pipeline.md`
  step 3 vs. autonomous-workflow run loop) are not contradictory: the
  review-run value is *defined* recoverably (parent of the prompt commit, i.e.
  the review run's first commit) and the base-run merge-base is intrinsically
  stable, so re-derivation at phase-4/5 yields the same value. No gap.
- Coverage: every R1–R29 maps to a Key Decision with a `Traces to`; all 17
  acceptance criteria are referenced. R14/R15 are correctly framed as emergent
  (the Approach synthesis + untouched worktree-scoped agent wording). Scope is
  disciplined — merge/close, cleanup, legacy migration, reviewed-run forking,
  and parallel reviews are explicitly excluded and stay out. Altitude is right:
  decisions and edit-site responsibilities, not a step-by-step plan or code.
