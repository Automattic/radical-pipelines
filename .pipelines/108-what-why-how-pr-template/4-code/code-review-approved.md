# Code review — Add a What/Why/How pull request template

**Verdict: APPROVED**

## Batch scope

- **Tasks reviewed:** Task 1 only — "Add `.github/PULL_REQUEST_TEMPLATE.md` with the
  exact What/Why/How content."
- **Diff range:** `3bc156f..HEAD` (batch commit `4344305` — "Add pull request
  template (code-writer)").
- **Files changed (both additions, nothing else):**
  - `.github/PULL_REQUEST_TEMPLATE.md` (new, 12 lines, 485 bytes)
  - `scripts/test/pull-request-template.test.mjs` (new, 156 lines, 18 tests)

## Summary

The batch delivers exactly what the approved plan and design specify: one static
GFM file at the standard GitHub path plus an offline test that pins its structural
and content invariants. The file is byte-for-byte the content fixed by the design
("Concrete deliverable — exact file content"): starts at `## What?` on line 1;
`Closes #` directly under the heading with no trailing whitespace and no trailing
comment; three comment-only section hints; one visible `## Changeset` footer with
the five release-relevant paths, `npx changeset`, and the full `CONTRIBUTING.md`
blob URL; single trailing newline. No scope creep — no CI/workflow, issue
template, downstream/generated template, or other `.github` community file is
touched.

All gates pass (`npm test`: 40/40). The GitHub GFM render confirms AC8 end to end.
Commit format is compliant. No regressions.

## Checks

| Check | Result | Evidence |
|---|---|---|
| Per-task Acceptance (plan) | PASS | Each acceptance bullet verified against the file (below). |
| Spec AC1–AC10 | PASS | See AC table below. |
| Design KD1–KD11 honored | PASS | File matches the design's exact-content block and all load-bearing layout constraints verbatim. |
| Scope (template + its test only) | PASS | `git diff --name-status 3bc156f..HEAD` → exactly the two additions; scope grep for `workflow\|ISSUE_TEMPLATE\|release\|dependabot` returns none. |
| Test quality | PASS | 18 offline tests map to AC2–AC7, AC9, AC10 invariants; AC8 covered by behavior-verification GFM render (intentional, acceptable). |
| Commit format | PASS | `Add pull request template (code-writer)` — imperative, sentence case, no trailing period, agent name in parens; `Co-Authored-By` trailer present. |
| Regressions | PASS | Full suite 40/40; the 9 pre-existing suites all pass. |

### Spec AC coverage

| AC | Result | Evidence |
|---|---|---|
| AC1 — auto-fills at standard path | PASS | File present at `.github/PULL_REQUEST_TEMPLATE.md` (GitHub auto-fill is platform convention; path is the entire mechanism). |
| AC2 — What→Why→How ordered, l2 | PASS | `cat -et` shows `## What?` / `## Why?` / `## How?` in order on line 1, 5, 8; test asserts `headings.slice(0,3)` deepEqual and first line `## What?`; 4th heading `## Changeset` after How. |
| AC3 — each section guides author | PASS | Three single-line comment hints present (lines 3, 6, 9); de-Gutenberged wording; test asserts each hint exactly once. |
| AC4 — `Closes #` stub | PASS | Line 2 is exactly `Closes #` (no trailing whitespace — `cat -et` shows `Closes #$`; no inline comment); test asserts `lines[1] === "Closes #"` + `doesNotMatch(/\s$/)` + `doesNotMatch(/<!--/)`. |
| AC5 — one visible changeset reminder | PASS | One visible `## Changeset` paragraph; `npx changeset` once; all five paths (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`) present as inline code; full blob URL link; no bump-rule restatement (test `doesNotMatch /\b(major|minor|patch)\b/i` and `/bump/i`). |
| AC6 — no checkbox checklist | PASS | `grep -nE '\- \[[ xX]\]'` returns none; test asserts `doesNotMatch(/^\s*-\s*\[[ xX]\]/m)`. |
| AC7 — no Gutenberg/WP content | PASS | Negative regexes for gutenberg/wordpress/block-editor/"Testing Instructions for Keyboard"/screencast/"AI Guidelines"; headings exact-list pins absence of extra Testing/AI sections. |
| AC8 — clean GFM render | PASS (behavior verification) | GitHub GFM API render — see below. |
| AC9 — Changeset Gate stays green | PASS | `.changeset/config.json changedFilePatterns` = `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]` (no `.github`); `CONTRIBUTING.md` lists `.github/` under "not release-relevant / need no changeset"; `npm test` 40/40 unaffected. |
| AC10 — repo's own template only | PASS | Only `.github/PULL_REQUEST_TEMPLATE.md` (+ its test) added; no downstream/generated template, no CI/release workflow changed. |

## Behavior verification

**Verification gate — `npm test`** (`node --test 'scripts/test/**/*.test.mjs'`):

```
# tests 40
# pass 40
# fail 0
```

New template suite in isolation (`node --test 'scripts/test/pull-request-template.test.mjs'`):
`# tests 18 / # pass 18 / # fail 0`.

**Behavior verification — rendered PR description (AC8).** Rendered the template
through GitHub's GFM API:

```
gh api --method POST /markdown -f mode=gfm -f context=Automattic/radical-pipelines \
  -f text="$(cat .github/PULL_REQUEST_TEMPLATE.md)"
```

Output (verbatim):

```html
<h2 dir="auto">What?</h2>
<p dir="auto">Closes #</p>

<h2 dir="auto">Why?</h2>

<h2 dir="auto">How?</h2>

<h2 dir="auto">Changeset</h2>
<p dir="auto">If this PR changes a release-relevant path (<code class="notranslate">skills/**</code>, <code class="notranslate">agents/**</code>, <code class="notranslate">.claude-plugin/**</code>, root <code class="notranslate">package.json</code>, or <code class="notranslate">README.md</code>), run <code class="notranslate">npx changeset</code> and commit it. See <a href="https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md">CONTRIBUTING.md</a> for details.</p>
```

Confirms every AC8 obligation:
- Four `<h2>` headings render with `?` shown verbatim (`What?`, `Why?`, `How?`, `Changeset`).
- The three section-hint HTML comments are invisible (no hint text appears in the render).
- Unfilled `Closes #` renders as literal text (`<p dir="auto">Closes #</p>`) — no autolink attempt, no broken/empty link.
- `## Changeset` shows `npx changeset` and all five paths as inline `<code>`, with a working link to the correct `CONTRIBUTING.md` blob URL.
- No checkboxes; no Gutenberg/WordPress content.

**Note on test layering:** AC8 is verified by the GFM render evidence above rather
than an offline assertion — this is intentional per the batch convention (an
offline string test cannot prove GFM render behavior). The offline suite covers
the render-relevant invariants it *can* (well-formed single-line comments: opener
count == closer count == 3; each `<!--`-bearing line matches `^<!--.*-->$`), which
is the right proxy. Acceptable.

## Issues

None. The batch is correct, in scope, fully tested at the offline layer, verified
at the behavior layer, and introduces no regressions.
