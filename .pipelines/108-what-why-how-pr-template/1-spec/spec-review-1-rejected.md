# Spec review 1 — Add a What/Why/How pull request template

## Verdict

**Rejected.**

The spec is strong: complete coverage of every consolidated requirement, the
right WHAT-not-HOW altitude (genuine HOW choices correctly deferred to design),
and testable Given-When-Then acceptance criteria. I verified every factual claim
against the live codebase and the upstream source and they all hold (details in
the Summary). It is rejected for one real, narrow defect: an unresolved
ambiguity about whether section hints may be delivered as HTML comments, which
creates a latent conflict between AC3 and AC8 and leaves AC3 not reliably
testable. This is fixable with a one-clause clarification; everything else can
stand.

## Summary

### Verification performed (all claims hold)

- **No existing PR template.** `find .github -type f` shows only
  `dependabot.yml`, `workflows/changeset-gate.yml`, `workflows/deploy-website.yml`,
  `workflows/release.yml`. No `.github/PULL_REQUEST_TEMPLATE.md` (any case).
  Requirement 1 / AC1 premise confirmed.
- **Release-relevant paths.** `.changeset/config.json` `changedFilePatterns` is
  exactly `["skills/**", "agents/**", ".claude-plugin/**", "package.json",
  "README.md"]` — matching the five paths the spec names in R5/AC5 (root,
  anchored `package.json`). Correct.
- **Command.** `package.json` exposes only `release:version`
  (`changeset version && …`); there is no `npm run changeset` alias. The
  documented command is `npx changeset` (CONTRIBUTING.md). R5/AC5 correct.
- **Changeset Gate.** `changeset-gate.yml` runs `npm test`,
  `validate-changesets.mjs`, then `npx changeset status --since=origin/<base>`.
  CONTRIBUTING.md explicitly lists `.github/` as **not** release-relevant, so a
  `.github/**`-only change yields no release-relevant change and `changeset
  status` exits 0. AC9's narrow claim ("does not fail *for a missing changeset*")
  is correct.
- **Pre-1.0.** `package.json` version is `0.1.1`; consistent with CONTRIBUTING.
- **Gutenberg exclusions are real, not phantom.** Re-fetched
  `WordPress/gutenberg` → `.github/PULL_REQUEST_TEMPLATE.md` via `gh api`. All
  five AC7 exclusion items genuinely exist in the current template: the Gutenberg
  CONTRIBUTING link (top comment), block-editor example steps ("Open a post or
  page", "Insert a heading block"), `### Testing Instructions for Keyboard`, the
  Screenshots Before/After table, and the WordPress AI Guidelines link. AC7 is
  accurate.

### Requirement → AC coverage

Every consolidated requirement (research R1–R10) maps to a spec requirement and
an acceptance criterion: R1→AC1, R2→AC2, R3→AC3, R4→AC4, R5→AC5, R6→AC6, R7→AC7,
R8→AC10, R9→AC8, R10→AC9. No requirement is dropped or invented.

### Altitude

The spec correctly fixes only observable WHATs (file path — required for the
auto-fill mechanism; heading level; the five paths; the literal `npx changeset`;
"no checkbox"; "no WP content") and defers genuine HOW (heading punctuation,
exact phrasing, footer placement, optional Testing/AI sections) to design via
Out of Scope. Good.

## Issues

### Issue 1 (blocking) — AC3 is ambiguous about HTML-comment hints, and conflicts with AC8 as written

This is the single defect that drives the rejection.

**The problem.** Requirement 3 / AC3 require that each section "includes a
concise hint conveying its intent" and AC3 frames the test as: *When a
contributor reads any of the three sections, Then that section includes a
concise hint…*. But the spec never states **what form** the hint may take, and
two facts make the form decisive:

1. The Gutenberg inspiration (and the research's recommended shape) delivers
   these hints as **HTML comments** (`<!-- In a few words, what is the PR
   actually doing? -->`), and the research's R3 explicitly allowed "HTML comment
   and/or brief prose." The spec dropped that parenthetical, so it is now silent.
2. **AC8** states that "any HTML comments are invisible in the rendered output."

So if the design delivers a section's hint purely as an HTML comment — which the
spec appears to permit, since AC8 anticipates HTML comments and AC5 explicitly
distinguishes "visible (not hidden inside an HTML comment)" reminders from
others — then under AC8 that hint is **invisible in the rendered PR**, yet AC3
demands the section "includes a concise hint conveying its intent." AC3 does not
say whether it is evaluated against the **template as edited** (where HTML
comments *are* visible to the author in the description box) or the **rendered**
output (where they are not). A verifier checking the rendered PR would mark a
comment-only hint as failing AC3; a verifier checking the edit box would pass it.
Two reasonable readers reach opposite verdicts on the same artifact — i.e. AC3 is
not reliably testable, and it is in latent conflict with AC8.

Note this is *not* a problem for AC5: the changeset reminder is explicitly
required to be **visible** prose, so it has no source-vs-rendered ambiguity. The
gap is specific to the section hints in R3/AC3.

**Why it matters.** A PR template's hints are functionally meant to be read in
the *edit* box (HTML comments are the conventional, Gutenberg-native way to do
exactly that). The spec almost certainly *intends* to allow comment-form hints —
but as written, AC3 + AC8 can be read to forbid them, and AC3's "reads" is
undefined. This will surface as an implementer/verifier disagreement at code or
verify time.

**Suggested fix (WHAT-level, no HOW imposed).** State explicitly that a section
hint MAY be an HTML comment, brief visible prose, or both (mirroring research
R3), and pin AC3's evaluation surface to the **template as authored/edited in the
description box** (where HTML comments are visible to the author), so that a
comment-only hint satisfies AC3 while remaining consistent with AC8's
rendered-output invisibility clause. (Do not mandate a particular form — that
remains a design choice; only resolve the ambiguity.)

### Issue 2 (minor / non-blocking) — "Closes #" stub: clarify the visible-vs-fill-in expectation

Not blocking on its own; flagged so the design phase resolves it deliberately.

Requirement 4 / AC4 require a "Closes #" stub and AC8 requires clean rendering.
The Gutenberg-native form is `Closes <!-- #ISSUE-NUMBER or URL -->`, which
renders (before the author fills it in) as a bare, dangling "Closes" with no
issue number — arguably not "clean" and not yet a valid closing keyword until
edited. The spec correctly defers the exact stub syntax to design, but it would
strengthen testability to note in AC4/AC8 that the stub is a *fill-in
affordance* (the author supplies the number) rather than a pre-satisfied closing
keyword, so a verifier does not flag the un-filled stub as a broken/empty render.
This is consistent with the spec's existing altitude and can be folded into the
design-deferred note for the stub.

---

Fixing Issue 1 is required for approval. Issue 2 is a recommendation that can be
addressed alongside it or explicitly left to design.
