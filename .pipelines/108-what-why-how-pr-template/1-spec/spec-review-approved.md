# Spec review (approved) — Add a What/Why/How pull request template

## Verdict

**Approved.**

This is iteration 2. The single blocking defect from iteration 1 (Issue 1 — the
AC3 hint-form ambiguity and its latent conflict with AC8) is genuinely resolved,
the minor Issue 2 ("Closes #" stub fill-in affordance) is also resolved, and a
fresh adversarial pass over the whole spec surfaced no new real problems. Every
load-bearing factual claim was re-verified against the live codebase and the
upstream Gutenberg source; all hold. The spec has complete requirement coverage,
correct WHAT-not-HOW altitude, and testable Given-When-Then acceptance criteria.

## Resolution of prior issues

### Issue 1 (was BLOCKER) — AC3 hint-form ambiguity vs AC8 conflict — RESOLVED

The revised spec fixes this exactly as the prior review prescribed, at the
WHAT level, without imposing a HOW:

- **Requirement 3** (spec.md lines 39-48) now states the hint "MAY take the form
  of an HTML comment, brief visible prose, or both — the form is a design-phase
  choice," and pins the evaluation surface: "The hint is evaluated against the
  template as it appears in the PR description edit box (where HTML comments are
  visible to the author guiding them as they write), so a comment-only hint
  satisfies this requirement; this is consistent with the rendered-output
  invisibility of HTML comments in Requirement 8."
- **AC3** (lines 139-147) re-anchors its Given to "the template content as it
  appears in the PR description edit box (where HTML comments are visible to the
  author)" and concludes "a comment-only hint satisfies this criterion (it is
  visible in the edit box) and remains consistent with AC8."

Two reasonable verifiers now reach the same verdict on a comment-only hint: it
passes. The latent AC3/AC8 conflict is gone, and the form remains a genuine
design choice. Resolved.

### Issue 2 (was MINOR) — "Closes #" stub fill-in expectation — RESOLVED

The fill-in semantics are now explicit in three coherent places:

- **Requirement 4** (lines 50-55): "The stub is a fill-in affordance: the author
  supplies the issue number. An un-filled stub (shipped before the author edits
  it) is therefore the expected initial state, not a broken or empty render."
- **AC4** (lines 149-156): same framing, with a cross-reference to AC8.
- **AC8** (lines 180-186): "An un-filled 'Closes #' stub (before the author
  supplies the issue number; see AC4) is the expected initial state and does not
  count as a broken or empty render."

A verifier will no longer flag the un-filled stub as a clean-render failure.
Resolved. The exact stub syntax remains correctly deferred to design.

## Verification performed (all claims hold)

- **No existing PR template.** `find .github -type f` returns only
  `dependabot.yml`, `workflows/release.yml`, `workflows/deploy-website.yml`,
  `workflows/changeset-gate.yml`. A case-insensitive search for any
  `*pull_request_template*` finds nothing. R1/AC1 premise confirmed.
- **Release-relevant paths exact match.** `.changeset/config.json`
  `changedFilePatterns` is `["skills/**", "agents/**", ".claude-plugin/**",
  "package.json", "README.md"]` — exactly the five paths the spec names in
  R5/AC5 (root, anchored `package.json`). Correct.
- **Command.** `package.json` exposes only `release:version`
  (`changeset version && node scripts/sync-version.mjs`); there is no
  `npm run changeset` alias. CONTRIBUTING.md documents `npx changeset`
  (lines 46, 115). R5/AC5 correct.
- **Changeset Gate behavior.** `changeset-gate.yml` runs `npm test`,
  `validate-changesets.mjs`, then `npx changeset status --since=origin/<base>`.
  CONTRIBUTING.md §"When a changeset is required" explicitly lists `.github/`
  under paths that are **not** release-relevant and need **no** changeset
  (lines 66-74). A `.github/**`-only change yields no release-relevant change,
  so `changeset status` exits 0. AC9's narrowly-scoped claim ("does not fail
  *for a missing changeset* on account of this change") is correct.
- **README/AGENTS prose-rule drift is not this spec's concern.** README line 165
  states a higher-level "standing rule — every change records a changeset" and
  points to AGENTS.md, but AGENTS.md contains no changeset rule (a pre-existing
  doc drift). The spec correctly anchors AC9 to CONTRIBUTING.md (the
  authoritative "when required" source) and to the actual CI enforcement
  mechanism, which keys off `changedFilePatterns`. AC9 is accurate regardless of
  the README prose; the spec does not need to touch that drift.
- **Pre-1.0.** `package.json` version is `0.1.1`; consistent with CONTRIBUTING.
- **Gutenberg exclusions are real (re-confirmed in iteration 1).** All five AC7
  exclusion items genuinely exist in the current upstream template.

## Requirement → AC coverage

Every consolidated research requirement maps to a spec requirement and an
acceptance criterion: R1→AC1, R2→AC2, R3→AC3, R4→AC4, R5→AC5, R6→AC6, R7→AC7,
R8 (scope)→AC10, R9 (clean render)→AC8, R10 (gate)→AC9. No requirement is dropped
or invented. The two design-deferred research items (optional Testing section,
optional AI-disclosure note) are carried into the spec's Out of Scope as genuine
design choices, not requirements.

## Altitude (WHAT not HOW)

The spec fixes only observable WHATs — the standard file path (load-bearing for
the auto-fill mechanism, so legitimately fixed), level-2 headings, the three
What/Why/How concepts and their order, the literal `npx changeset` and the five
release-relevant paths, "exactly one visible changeset reminder", "no checkbox
checklist", and the five named WP-content exclusions. Every genuine HOW choice
(heading punctuation, exact hint phrasing, hint form, "Closes #" stub syntax,
footer placement, optional Testing/AI sections) is correctly deferred to design
via Out of Scope. Good.

## Fresh adversarial pass — no remaining defects

- **AC1** is mechanism-based and feasible: GitHub auto-fills
  `.github/PULL_REQUEST_TEMPLATE.md` into a new PR description. Testable.
- **AC2** ("no other ordering of these three is present") is slightly terse but
  unambiguous and testable — each appears once, in What→Why→How order.
- **AC5 vs AC8** are consistent: the reminder is required to be *visible* prose,
  so it has no source-vs-rendered ambiguity; AC8's invisibility clause applies
  only to HTML comments.
- **AC9's narrow scope is a strength**, not a gap: it asserts only that the gate
  does not fail *for a missing changeset on account of this change*, which is
  exactly what the CI mechanism guarantees.
- **AC10** scopes the merged change to the repo's own template with no
  downstream/generated template and no CI/workflow modification — directly
  testable by inspecting the merged diff.

No internal contradictions among the ACs, no untestable criteria, no scope creep,
and no factual inaccuracy. The spec is genuinely solid and ready for the design
phase.
