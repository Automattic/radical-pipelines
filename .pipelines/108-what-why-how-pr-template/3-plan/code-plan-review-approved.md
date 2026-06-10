# Code plan review — Add a What/Why/How pull request template

## Verdict

**Approved.**

The plan is executable verbatim by a code-writer with zero remaining design
decisions. Its single task creates exactly one static file at an exact path with
content that is byte-identical to the design doc's "Concrete deliverable" block.
Every spec acceptance criterion (AC1–AC10) is covered, each task constraint
traces to a spec requirement and a design Key Decision, and the per-task
acceptance criteria are observable file/render properties rather than
test prescriptions.

## Summary

This is a pure, single-file content change: add
`.github/PULL_REQUEST_TEMPLATE.md`. The plan correctly models this as one task
with no dependencies. I verified the plan against the spec (requirements + ACs),
the design doc (architecture + exact deliverable content), and the live
codebase.

Live-codebase verification performed this session (all confirmed):

- No PR template exists today (`find .github -iname '*PULL_REQUEST*'` returns
  nothing).
- `.github/` already exists, holding only `dependabot.yml` and `workflows/`.
- Default branch is `trunk` (`refs/remotes/origin/trunk`); remote is
  `Automattic/radical-pipelines` — so the blob URL
  `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`
  is correct.
- `CONTRIBUTING.md` exists at the repo root and uses "release-relevant",
  "changeset", and `npx changeset`; it lists `.github/` under the paths that
  need **no** changeset (line 74), and phrases the package pattern as "the
  **root** `package.json`" (lines 62–63), matching the plan's "root
  `package.json`".
- `.changeset/config.json` `changedFilePatterns` is exactly
  `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`.
- No markdownlint/prettier config exists; the only check is the `test` script
  `node --test 'scripts/test/**/*.test.mjs'` — confirming the design's MD026
  rationale and the AC9 claim that `npm test` is unaffected by a `.github/`-only
  change.

I diffed the plan's exact-content block (code-plan.md lines 48–61) against the
design doc's "Concrete deliverable" block (design-doc.md lines 139–152): they
are **identical**. The code-writer can copy it directly.

## Checks performed

- **AC coverage.** All ten ACs (AC1–AC10) are explicitly traced in the task's
  "Traces to" list and re-asserted as observable conditions in the "Acceptance"
  list. No AC is unaddressed.
- **Traceability.** Every load-bearing constraint in the plan maps to a design
  Key Decision (KD1–KD11) or an explicit design layout constraint: file starts
  at `## What?` (KD10), question-form headings + footer (KD2), comment-only
  hints / single well-formed comments (KD3, Failure Modes), hint wording (KD4),
  bare `Closes #` placement with no trailing whitespace/comment (KD5), single
  visible `## Changeset` paragraph naming all five paths via `npx changeset`
  without restating bump rules (KD6), full blob URL (KD7), omitted Testing/
  AI-note/intro (KD8/KD9/KD10), no checkboxes (KD11), single trailing newline
  (design line 170). Nothing in the plan exceeds or contradicts the design.
- **Ordering/granularity.** A single static file is correctly one task with
  "Depends on: none." No ordering hazard.
- **No design decisions left open.** Heading punctuation, hint phrasing, stub
  form, link target, blank-line layout, and trailing newline are all fixed
  verbatim; the content block is copy-ready.
- **No invented scope.** The plan's "Do not add" list (intro comment, Testing
  section, AI-disclosure, extra visible hints, checkboxes, Gutenberg/WordPress
  content, any CI/workflow/issue/other `.github` file) mirrors the design's
  omissions and the spec's Out-of-Scope and AC7/AC10.
- **Acceptance criteria are WHAT, not which-test.** The acceptance bullets
  describe observable artifact/render properties (first line, heading order and
  form, stub placement, exactly one changeset reminder, zero `- [ ]` items,
  GFM render behavior). The AC9 bullet references the pre-existing Changeset
  Gate and `npm test` as the spec's own observable condition for AC9 — it does
  not instruct the code-writer to author any test. No test/doc planning is
  leaked into the plan.

## Issues

None blocking. The plan is approved as written.

Minor, non-blocking observation (not a defect, no change required): the AC8
acceptance bullet asserts the rendered changeset paragraph shows "the five paths
as inline code." The exact-content block does render `skills/**`, `agents/**`,
`.claude-plugin/**`, `package.json`, and `README.md` as inline code, but the
qualifier word "root" before `package.json` is plain prose (as intended and as
in CONTRIBUTING.md). The bullet's phrasing is accurate as written; flagged only
so the code-writer does not over-read it into code-fencing the word "root".
