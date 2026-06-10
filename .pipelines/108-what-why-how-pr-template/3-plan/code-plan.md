# Code plan — Add a What/Why/How pull request template

## Overview

Add a single new static file, `.github/PULL_REQUEST_TEMPLATE.md`, so GitHub
auto-fills the PR description box with a **What / Why / How** structure, a
`Closes #` issue-linking stub, and a single visible changeset reminder. The file
is adapted from the Gutenberg PR template but stripped of all
Gutenberg/WordPress-specific content and re-pointed at this repo's conventions.

This is a pure, single-file content change. There is **no code, no build step, no
runtime, and no CI change**. GitHub renders `.github/PULL_REQUEST_TEMPLATE.md`
into the PR body by convention, so the entire deliverable is the content and
exact layout of one static GitHub-flavored Markdown (GFM) file. The change is
confined to `.github/**`, which is not a release-relevant path, so it needs no
changeset of its own and does not disturb the Changeset Gate.

Verified against the live codebase this session: no PR template exists today
(`find .github -iname '*PULL_REQUEST*'` returns nothing); `.github/` already
exists, holding only `dependabot.yml` and `workflows/`; the default branch is
`trunk`; `CONTRIBUTING.md` exists at the repo root and uses the terms
"release-relevant", "changeset", and `npx changeset`; `.changeset/config.json`
`changedFilePatterns` is exactly `["skills/**", "agents/**", ".claude-plugin/**",
"package.json", "README.md"]`; and `.github/` is explicitly listed in
`CONTRIBUTING.md` under the paths that need **no** changeset.

The plan is a single task: create the file with the exact content and layout the
design fixes. That one task carries every spec acceptance criterion (AC1–AC10).

## Tasks

### Task 1 — Add `.github/PULL_REQUEST_TEMPLATE.md` with the exact What/Why/How content

**Goal:** Create the repository's own default pull-request template at the
standard GitHub path so that opening a new PR pre-fills the description box with
the fixed What → Why → How structure, a `Closes #` stub, comment-only section
hints, and one visible `## Changeset` footer reminder.

**Files to change:**
- `.github/PULL_REQUEST_TEMPLATE.md` (new file — created; `.github/` already
  exists)

**Changes:**

Create the file with this exact content, end to end (no other content, no other
sections, no checkbox items):

```markdown
## What?
Closes #
<!-- What does this change do? -->

## Why?
<!-- What problem does it solve, or why is it needed? -->

## How?
<!-- How does it work? Key implementation details or approach. -->

## Changeset
If this PR changes a release-relevant path (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, or `README.md`), run `npx changeset` and commit it. See [CONTRIBUTING.md](https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md) for details.
```

Load-bearing layout constraints (apply verbatim — these are functional, not
cosmetic, and are required by the design):

- The file **starts at `## What?` on line 1** — no top intro comment, no leading
  blank line.
- In the What block, `Closes #` is on the line **directly under** `## What?`
  (no blank line between the heading and the stub), followed by the What hint
  comment, then one blank line (where the author writes prose).
- `Closes #` has **no trailing whitespace** and **no trailing comment**. The
  author completes it as `Closes #108` (no space between `#` and the number) so
  the auto-close keyword fires.
- The three section hints are **HTML-comment-only**, each a single well-formed,
  self-contained comment (`<!-- … -->`) on one line; no comment spans a heading.
  Exact comment text:
  - What: `What does this change do?`
  - Why: `What problem does it solve, or why is it needed?`
  - How: `How does it work? Key implementation details or approach.`
- The three What/Why/How headings use **question form** (`## What?` / `## Why?`
  / `## How?`) and appear in that fixed order; the fourth `## Changeset` heading
  is the footer (it is not one of the three What/Why/How concepts).
- One blank line separates each section block.
- The `## Changeset` reminder is a **single Markdown paragraph** (one logical
  prose line; it may soft-wrap in source for readability) and is **visible
  prose**, not an HTML comment. There is exactly **one** such reminder.
- The changeset reminder names all five release-relevant paths
  (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`,
  `README.md`), uses the literal command `npx changeset`, points to
  `CONTRIBUTING.md` for detail, and does **not** restate the bump-type/version
  rules.
- The `CONTRIBUTING.md` link is the **full blob URL**
  `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`,
  not a relative or root-absolute path (it must resolve from the PR-description
  render context, which has no file base URL).
- The file ends with a **single trailing newline** (POSIX text-file
  convention).

Do **not** add: a top intro/greeting comment, a `## Testing` section, an
AI-disclosure note, any visible section hints beyond `Closes #` and the
`## Changeset` paragraph, any `- [ ]` task-list/checkbox items, or any
Gutenberg/WordPress-specific content (no Gutenberg `CONTRIBUTING.md` link, no
block-editor testing steps, no "Testing Instructions for Keyboard" subsection,
no Screenshots/screencast Before/After table, no WordPress AI Guidelines link).

Do **not** add, modify, or generate any CI/release workflow, any downstream or
generated template, any issue template, or any other `.github` community-health
file. This task touches exactly one file.

**Depends on:** none (first and only task).

**Traces to:**
- Spec req R1 / AC1 — file at the standard path
  `.github/PULL_REQUEST_TEMPLATE.md`; GitHub auto-fills the PR body by
  convention. (Design KD1.)
- Spec req R2 / AC2 — exactly three level-2 headings `## What?` → `## Why?` →
  `## How?` in fixed order; question form is the chosen punctuation. (Design
  KD2.)
- Spec req R3 / AC3 — one concise HTML-comment hint per section, visible to the
  author in the edit box, free of Gutenberg/WordPress wording. (Design KD3,
  KD4.)
- Spec req R4 / AC4 — bare `Closes #` stub on its own line directly under
  `## What?`; fill-in affordance, unfilled is the expected initial state.
  (Design KD5.)
- Spec req R5 / AC5 — single visible `## Changeset` footer paragraph naming all
  five release-relevant paths, using `npx changeset`, linking `CONTRIBUTING.md`
  via the full blob URL, in CONTRIBUTING-consistent terms, without restating
  bump rules. (Design KD6, KD7.)
- Spec req R6 / AC6 — no `- [ ]` checkbox checklist anywhere. (Design KD11.)
- Spec req R7 / AC7 — no Gutenberg/WordPress-specific content (de-Gutenberged
  hints, no Testing/keyboard steps, no AI-Guidelines link, no Gutenberg
  CONTRIBUTING intro, no Screenshots table). (Design KD4, KD8, KD9, KD10.)
- Spec req R8 / AC8 — valid GFM that renders cleanly: well-formed single-line
  HTML comments stay invisible; an unfilled `Closes #` renders as literal text,
  not a broken render. (Design KD3, KD5.)
- Spec req R9 / AC9 — change confined to `.github/**`, which is absent from
  `changedFilePatterns` and listed in `CONTRIBUTING.md`'s "no changeset" set, so
  the Changeset Gate does not demand a changeset and `npm test` is unaffected.
  (Design overview; verified live.)
- Spec req R10 / AC10 — the only added/modified template is the repo's own
  `.github/PULL_REQUEST_TEMPLATE.md`; no downstream/generated template and no
  CI/release workflow added or changed. (Design KD1.)

**Acceptance (observable, testable):**

- The file `.github/PULL_REQUEST_TEMPLATE.md` exists in the repository and is the
  only added or modified file in this change; no CI/workflow file, downstream
  template, issue template, or other `.github` community file is added or
  changed. (AC1, AC10)
- Reading the file top to bottom, the first line is `## What?`, and the three
  level-2 headings appear in the order What → Why → How, each in question form
  (`## What?`, `## Why?`, `## How?`); no other ordering of these three is
  present. A fourth heading `## Changeset` appears after `## How?`. (AC2)
- Directly under `## What?` (no intervening blank line) is the line `Closes #`
  with no trailing whitespace and no trailing comment, followed by the
  single-line HTML comment `<!-- What does this change do? -->`. (AC3, AC4)
- The Why section contains the single-line HTML comment
  `<!-- What problem does it solve, or why is it needed? -->`, and the How
  section contains `<!-- How does it work? Key implementation details or
  approach. -->`; each section's hint conveys its intent and contains no
  Gutenberg/WordPress wording. (AC3, AC7)
- Exactly one visible (non-comment) changeset reminder is present, as a single
  `## Changeset` paragraph that: contains the literal `npx changeset`; names all
  five paths `skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`,
  and `README.md`; links to
  `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`;
  and does not restate version-bump rules. (AC5)
- The file contains zero `- [ ]` task-list/checkbox items. (AC6)
- The file contains none of: the Gutenberg `CONTRIBUTING.md` link, block-editor
  testing example steps, a "Testing Instructions for Keyboard" subsection, a
  Screenshots/screencast Before/After table, or a WordPress AI Guidelines link.
  (AC7)
- Rendered as GFM, all four headings display (with the `?` shown verbatim on the
  three question-form headings), the three section-hint HTML comments are
  invisible, the unfilled `Closes #` shows as literal text (not a broken or empty
  link), and the `## Changeset` paragraph shows `npx changeset` and the five
  paths as inline code with a working link to `CONTRIBUTING.md`. (AC8)
- The change is confined to `.github/**`; running the Changeset Gate against the
  PR that adds this file does not fail for a missing changeset, and the
  `npm test` step's outcome is unchanged by the file's presence. (AC9)
