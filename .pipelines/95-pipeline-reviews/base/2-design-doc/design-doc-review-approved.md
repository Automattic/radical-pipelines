# Design Doc Review — Approved

**Verdict:** Approved.

**Scope reviewed:** `2-design-doc/design-doc.md` (revised) against
`1-spec/spec.md` and `2-design-doc/design-doc-research.md`, plus the prior
rejection `2-design-doc/design-doc-review-1-rejected.md`. All named edit sites
were verified firsthand against the live skill files. This is a re-review after
a revision; the prior rejection's two issues were re-checked AND the doc was
re-reviewed as a whole.

---

## Prior rejection (review-1) — both issues fully resolved

### B1 (blocking) — R12 origin-reference self-containment + review-source assets — RESOLVED

R12's three mandatory facets are now all realized in the design doc itself, not
only deferred to `review-pipeline.md`:

1. mandatory for reviews, absent from issue/base prompts — stated at lines 33,
   45, 110, 112, 158, 160.
2. **self-contained** (substance as a direct quote or faithful paraphrase
   **plus** a convenience link, so a later phase reading only the review prompt
   stands alone) — now explicit at line 112 ("not a bare link … carries the
   *substance* of the request … plus a convenience link … without following the
   link") and restated in the Key Decision at line 160. This is exactly what
   acceptance criterion 3 ("with enough substance to stand alone") tests.
3. **review-source assets** placed in the review run's own `0-prompt/` folder
   and referenced relatively, the same as issue/base prompts — now explicit at
   line 112 ("Any **source assets** … are placed in the review run's own
   `0-prompt/` folder and referenced relatively, exactly as issue and base
   prompts handle their assets") and at lines 114 and 160.

The two facets the prior review found dropped (self-containment, review-source
asset placement) are present and faithful to the research (T5 Origin-reference
paragraph and the 3×4 site-local contract). Resolved.

### M1 (minor) — Decision-rule block placement — RESOLVED

The decision-rule placement is now specified precisely at both mention sites
(lines 55 and 127): "at the **top-level bullet indent** (sibling to the
always-offered Resume and Fork bullets, not nested inside the phase-5-only
sub-block that contains Review/Merge/Close), so it can reference all three
same-issue actions." This matches the live `work-on-an-issue.md`, where Resume
(line 30) and Fork (line 31) are top-level bullets and Review/Merge/Close (lines
33–35) sit in the phase-5-only sub-block. The earlier ambiguity ("after the
menu" / literal "after line 35") is now disambiguated by the explicit indent
specification. Resolved.

---

## Whole-doc review (not a rubber stamp)

- **Coverage.** Every requirement R1–R29 maps to a Key Decision carrying a
  `Traces to`; all 17 acceptance criteria (1–17) are referenced across the
  decisions (verified by extraction). R14/R15 are correctly framed as emergent
  properties (Approach synthesis at line 37 + untouched worktree-scoped agent
  wording), not as edits.
- **Traceability.** Each decision states requirement and criterion traces; the
  research's requirements-coverage map (R1–R29 → topic) is honored without
  inventing new decisions.
- **Alternatives / trade-offs.** Substantive on every decision (e.g. rejecting a
  second placeholder, rejecting "last commit touching `review-(N-1)/`" as
  fragile, rejecting splitting schema/discipline, rejecting an Origin hook in the
  shared schema). Real options with reasons, not strawmen.
- **Feasibility — verified firsthand against the live skill files.** All named
  edit sites exist exactly as described: the six reviewer "per pipeline"
  parentheticals (`spec-reviewer.md:34`, `design-doc-reviewer.md:36`,
  `code-plan-reviewer.md:38`, `doc-plan-reviewer.md:39`, `code-reviewer.md:43`,
  `doc-reviewer.md:44`); the base-ref launch lines ("the base ref to diff
  against") at `4 - code.md:35` / `5 - docs.md:36` and the matching reviewer
  inputs (`code-reviewer.md:14`, `doc-reviewer.md:14`); the autonomous handoff
  line ("the absolute and full path to this pipeline's artifact folder") and the
  assisted "Create the phase subfolder inside the artifacts folder" line;
  resume's two cited headings exist verbatim; `create-pipeline.md` step 4 + asset
  bullet; `fork-pipeline.md` step 5 `cp` line (and the load-bearing correctness
  fix: after eager `base/`, the parent prompt is at `<parent>/base/0-prompt`, so
  the current `<parent>/0-prompt` source path would fail); `manage-issues.md`
  schema/discipline/tracker-only bullet; `pipeline-versioning.md` Model/Runs
  insertion point, predicate table, state paragraph, SHA paths, Rendering
  section; `.rp.md` version-label trigger ("creating, resuming, or forking") and
  the `0 - Prompt` status-ladder clause keyed on creation. `review-pipeline.md`,
  `prompt-format.md`, `merge-pipeline.md`, `close-pipeline.md` are all absent as
  claimed. The "no edit" claims hold too: `setup.md:101` already says "one folder
  per pipeline run" and its Artifact-folder convention is layout-silent;
  `SKILL.md:19` already uses "at the start of each run"; `health-monitoring.md:57`
  is a fill-in template; both workflows' "next phase" lines already delegate to
  `pipeline-versioning.md`; assisted mode spawns no agents and has only phases
  1–3 (so the base-ref rule is correctly N/A there).
- **Dependencies.** Keystone ordering (`pipeline-versioning.md` first), the
  resume-heading citation contract, `prompt-format.md` referencing, and the
  `.rp.md` project-convention dependency are all identified; no new external
  libraries/services.
- **Failure modes / observability.** Six concrete failure modes (incomplete run,
  merged pipeline, second-review-in-flight, abandoned prompt-only run, stale base
  ref across rejection iterations, fork-copy source-missing) plus an
  observability paragraph (run-chain listing, tracker status re-cycle, monitor
  re-point). Matches the spec's edge cases.
- **Scope.** Out-of-scope items (merge/close procedures, consolidation/cleanup,
  legacy migration, forking from a reviewed run, parallel reviews) match the
  spec exactly and are reiterated in Risks; they are kept out of the plan.
- **Design-altitude.** The doc stays at decisions and edit-site responsibilities
  (file + section + nature of edit, e.g. "two-word substitution", "one rebinding
  sentence after the table") without writing final prose or code — correct
  design-doc altitude.
- **Clarity / honesty.** The two honesty calls are reported precisely and
  consistently: "zero *behavioral* agent edits" is explicitly distinguished from
  "six profiles receive a bounded two-word *factual correction*" (lines 31, 67,
  151, 155, 264 — never claimed as zero where it would mislead), and R16 is
  reported as introducing the base-ref derivation for the first time for both
  normal and review runs (lines 214–219, 265), not as a review-only tweak. The
  "next phase" vs "active phase" wording reconciliation (line 195) keeps "active
  phase" single-sensed against the skill's strict predicate. No contradictions
  found.

The design is coherent, faithful to the spec and research, feasible against the
real skill files, and disciplined in scope and altitude. Both prior issues are
fully resolved with no regressions. Approved.
