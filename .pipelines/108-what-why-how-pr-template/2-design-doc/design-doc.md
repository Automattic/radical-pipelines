# Design doc — Add a What/Why/How pull request template

## Overview

The `radical-pipelines` repository has no default GitHub pull-request template. The
PR description box opens empty, so contributors get no structure for the
information reviewers need. This change adds a single new file —
`.github/PULL_REQUEST_TEMPLATE.md` — that GitHub auto-fills into the PR
description box, prompting authors to describe their change with a **What / Why /
How** structure, link the issue with a `Closes #` stub, and (when relevant) add a
changeset.

The template is adapted from the Gutenberg PR template
(`WordPress/gutenberg` → `.github/PULL_REQUEST_TEMPLATE.md`) but stripped of all
Gutenberg/WordPress-specific content and re-pointed at this repo's own
conventions: a single visible changeset reminder is added because the repository
enforces a hard Changeset Gate in CI.

This is a pure, single-file content design. There is **no code, no build step, no
runtime, and no CI change**. GitHub renders `.github/PULL_REQUEST_TEMPLATE.md`
into the PR body by convention (AC1), so all of the design work is about the
*content and structure* of one static Markdown file, plus confirming it does not
disturb the Changeset Gate (AC9). The deliverable is the `radical-pipelines`
repository's own template only — not a template it generates for downstream
projects (AC10).

Grounding (verified against the live codebase this session): no PR template exists
today (`find .github -iname '*PULL_REQUEST*'` returns nothing); `.github/` already
exists, holding only `dependabot.yml` and `workflows/`; the default branch is
`trunk`; `CONTRIBUTING.md` exists at the repo root.

## Approach

Add exactly one file at the standard GitHub location, written as static
GitHub-flavored Markdown (GFM):

```
.github/PULL_REQUEST_TEMPLATE.md
```

GitHub's convention is that a file at this path pre-populates the PR description
box for every new pull request opened against the repository (AC1). No
registration, configuration, or workflow wiring is required — placing the file is
the entire mechanism.

The file's content is lean and maps element-for-element to the spec. Final
structure, top to bottom:

1. `## What?` — with a `Closes #` issue-linking stub directly under the heading,
   then an HTML-comment hint.
2. `## Why?` — HTML-comment hint.
3. `## How?` — HTML-comment hint.
4. `## Changeset` — a single **visible** prose reminder (footer section).

The three What/Why/How sections use **question-form** headings (matching the
Gutenberg source) and **HTML-comment-only** author hints (invisible in the
rendered PR, visible to the author in the edit box). The two deliberate visible
exceptions are the `Closes #` stub (a fill-in affordance) and the `## Changeset`
reminder (required to be visible by AC5). The optional `## Testing` section and
the optional AI-disclosure note are both omitted (rationale in Key Decisions).

The change is confined to `.github/**`, which is **not** a release-relevant path,
so the file adds no changeset of its own and does not trip the Changeset Gate
(AC9).

## Components

There is a single component: the static Markdown template file. There are no
modules, scripts, services, or configuration entries to add or change.

| Component | Path | Nature | Status |
|---|---|---|---|
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | New static GFM file | Added |

Adjacent files this design **reads from / depends on but does not modify**:

- `CONTRIBUTING.md` (repo root) — the authoritative home for the changeset /
  version-bump rules; the changeset reminder links here rather than restating
  them.
- `.changeset/config.json` — defines `changedFilePatterns`; establishes which
  paths are release-relevant.
- `.github/workflows/changeset-gate.yml` and `scripts/validate-changesets.mjs` —
  the Changeset Gate. Unchanged; relevant only to confirm the new file stays
  green (AC9).

## Interfaces and Data Flow

There is no programmatic interface. The "interface" is GitHub's PR-creation
convention and the rendering of GFM in a PR description. Two data flows matter:

**1. Template → PR description box (authoring time).**

```
Author clicks "New pull request"
        │
        ▼
GitHub reads .github/PULL_REQUEST_TEMPLATE.md
        │
        ▼
PR description edit box is pre-filled with the raw template
   • Headings (## What? / ## Why? / ## How? / ## Changeset) shown
   • HTML-comment hints VISIBLE here (raw Markdown) → guide the author (AC3)
   • Closes # stub VISIBLE → author appends the issue number
        │
        ▼
Author writes prose under each heading, fills Closes #<n>, runs `npx changeset`
if the PR touches a release-relevant path, then submits
```

In the edit box the author sees raw Markdown, so the HTML-comment hints are
visible exactly when guidance is needed — this is why comment-only hints satisfy
AC3.

**2. Submitted PR body → rendered pull page (review time).**

```
Submitted PR body
        │
        ▼
GitHub renders GFM on the pull page
   • Headings render as <h2> (the `?` is displayed verbatim)
   • HTML comments are INVISIBLE in the render (AC8)
   • Closes #<n> becomes a working issue autolink + closing keyword
   • An un-filled `Closes #` renders as literal text "Closes #" (AC4/AC8)
   • The ## Changeset paragraph renders visibly with inline code and a working
     CONTRIBUTING.md link (AC5)
```

Critically, the template content is rendered in the **PR description** on the pull
page, which has no file base URL. This drives the link-target decision below: the
`CONTRIBUTING.md` link must be a full blob URL, not a relative path, so it
resolves correctly in the PR-description rendering context.

## Concrete deliverable — exact file content

The single file to add is `.github/PULL_REQUEST_TEMPLATE.md`. Exact content, end
to end:

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

Load-bearing layout constraints (carry these into the code phase verbatim):

- The file **starts at `## What?` on line 1** — no top intro comment, no leading
  blank line.
- In the What block, `Closes #` is on the line **directly under** `## What?` (no
  blank line between heading and stub), then the What hint comment, then a blank
  line where the author writes prose.
- One blank line separates each section block.
- `Closes #` has **no trailing whitespace** and **no trailing comment**. The
  author completes it as `Closes #108` (no space between `#` and the number) for
  the auto-close keyword to fire.
- The `## Changeset` reminder is a **single Markdown paragraph** (one logical
  prose line; it may soft-wrap in source for readability).
- The `CONTRIBUTING.md` link is the **full blob URL**
  `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`,
  not a relative path.
- The file ends with a single trailing newline (POSIX text-file convention;
  cosmetic).

## Key Decisions

Each decision traces to a Requirement (R) / Acceptance Criterion (AC). Nothing is
designed that the spec did not ask for.

### KD1 — Single static file at the standard path (R1/AC1, R10/AC10)
Add only `.github/PULL_REQUEST_TEMPLATE.md`. GitHub auto-fills the PR body from
this path by convention, so the file-add *is* the feature. No downstream/generated
template and no CI/workflow file is added or changed, satisfying the scope
constraint (AC10).

### KD2 — Question-form headings `## What?` / `## Why?` / `## How?` (R2/AC2)
The spec fixes three level-2 headings and the order What → Why → How; only
punctuation is open. Chosen: question-form, matching the Gutenberg source.
Rationale: because the section hints are comment-only (KD3), the heading is the
*only always-visible prompt* in the edit box, and a question (`## What?`)
reinforces the guidance intent at zero cost. The heading reads fine when merged
(it stays a section label that the author's prose answers). No tooling objection:
GitHub's heading slugger strips `?` (anchor `#what` is intact), and the repo has
**no markdownlint/prettier config** (verified: `CONTRIBUTING.md` states there is
no lint/typecheck step), so MD026 (no-trailing-punctuation-in-heading) cannot
fire. The added fourth `## Changeset` heading does **not** violate AC2, which
constrains only the three What/Why/How concepts and their order — the footer is
not one of those three.

### KD3 — HTML-comment-only section hints (R3/AC3, R8/AC8)
Each section carries its guidance as a single well-formed HTML comment, not visible
prose. Rationale: HTML comments are invisible in the rendered PR and, in practice,
authors delete/replace the comment scaffolding as they fill the template — leaving
**zero residue** in the merged PR body (which becomes changelog/commit context).
This was verified empirically against two real merged Gutenberg PRs whose saved
bodies contained only the author's prose with every `<!-- … -->` hint gone.
Visible-prose hints have the opposite failure mode (authors forget to delete
them, leaving permanent noise). Ergonomically, comment-only loses nothing: the
edit box shows raw Markdown, so the hint is visible to the author exactly when
needed (AC3), then vanishes on render (AC8). This is also the dominant idiom in
well-run repos (gutenberg, react, node, vite, next.js). The two visible exceptions
(`Closes #`, `## Changeset`) are deliberate and called out below.

### KD4 — Section hint wording (R3/AC3, R7/AC7)
Final comment contents:
- What: `What does this change do?`
- Why: `What problem does it solve, or why is it needed?`
- How: `How does it work? Key implementation details or approach.`

Rationale: each maps 1:1 to the intent the spec fixes (What = what the change
does; Why = problem/motivation; How = implementation approach), de-Gutenberged
(dropped "In a few words,", "the PR actually doing", "Note the" filler) and free
of WordPress wording, in the terse repo voice (`AGENTS.md`). The Why hint
deliberately **omits** Gutenberg's "Link any related issues or PRs" clause:
issue-linking is already provided once by the `Closes #` stub in the What section,
so repeating it in the Why hint would split one concern across two sections — the
cross-path duplication the repo's authoring guidance avoids.

### KD5 — Issue-linking stub: bare `Closes #` under `## What?` (R4/AC4, R8/AC8)
Ship the literal `Closes #` on its own line directly beneath the `## What?`
heading. It is a fill-in affordance: the author appends the issue number
(`Closes #108`), which activates GitHub's closing keyword. Rationale (render-tested
against GitHub's GFM API with this repo's context this session): an unfilled
`Closes #` renders as plain literal text `<p>Closes #</p>` — **no autolink
attempt, no broken/empty link** — which is exactly AC8's "un-filled stub is the
expected initial state, not a broken render"; a filled `Closes #108` renders a
working issue autolink. The bare form was chosen over Gutenberg's
`Closes <!-- #ISSUE-NUMBER or URL -->` because the comment form renders as a
dangling `<p>Closes </p>` (reads more like an unfinished fragment) and forces the
author to edit inside a comment rather than just type a number. Placing the stub
directly under the heading (no blank line) puts the single visible affordance where
the author's eye lands.

### KD6 — Single visible `## Changeset` footer reminder (R5/AC5)
A dedicated visible footer section after How:

> If this PR changes a release-relevant path (`skills/**`, `agents/**`,
> `.claude-plugin/**`, root `package.json`, or `README.md`), run `npx changeset`
> and commit it. See [CONTRIBUTING.md](…/blob/trunk/CONTRIBUTING.md) for details.

Rationale (satisfies AC5's four obligations): (a) uses the exact command
`npx changeset` (matches `CONTRIBUTING.md`); (b) names all five release-relevant
paths, matching `.changeset/config.json` `changedFilePatterns`
(`["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`,
confirmed live); (c) points to `CONTRIBUTING.md` for detail and does **not**
restate the bump-type/version rules; (d) reuses `CONTRIBUTING.md`'s own terms
("release-relevant", "changeset"). "root `package.json`" mirrors `CONTRIBUTING.md`'s
own one-word qualifier for the anchored pattern (it would otherwise restate the
nested-package rule, which (c) forbids). It is visible prose (not a comment), and
there is exactly one such reminder — both required by AC5. A dedicated footer
section separates the process reminder from the What/Why/How narrative; the
singular heading `## Changeset` matches `CONTRIBUTING.md`'s section nouns.

### KD7 — `CONTRIBUTING.md` link is a full blob URL (R5/AC5)
Use `https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md`,
not a relative or root-absolute path. Rationale: the template renders inside the
**PR description** on the pull page, which has no file base URL. A relative
`../CONTRIBUTING.md` resolves against `.github/` only when the file is viewed
directly; in a PR description it resolves against the pull URL and does not reliably
reach the root file. A root-absolute `/CONTRIBUTING.md` resolves against the site
host (→ 404). The full blob URL resolves correctly in **both** contexts. Verified:
the default branch is `trunk` and `CONTRIBUTING.md` exists at the repo root, so the
URL is valid. Pinning `trunk` (a branch, not a SHA) tracks the latest content.

### KD8 — Omit the optional `## Testing` section (Out of Scope, design-deferred)
Omitted. Rationale: this repo has no UI / manual-test surface — changes are
skills/agents/docs (Markdown prompt artifacts) plus minor tooling, and the only
objective check, `npm test` (`node --test scripts/test/**`), already runs in CI on
every PR via the Changeset Gate, so a reviewer sees it green/red without the author
pasting "I ran npm test." A Testing prompt would also restate `CONTRIBUTING.md`'s
"Running tests and checks locally" section (already linked from the `## Changeset`
footer) — cross-path duplication the repo voice avoids — and a usually-unfilled
fourth section is the low-value scaffolding adjacent in spirit to the checkbox
checklist that R6/AC6 already forbids. A change that genuinely needs a verification
note can put it in How.

### KD9 — Omit the optional AI-disclosure note (Out of Scope, design-deferred)
Omitted (the stronger omit). Rationale: the repo *is* an autonomous AI-agent
pipeline, so AI authorship is the norm, not an exception — a note flagging "AI may
have been involved" is contentless here. Gutenberg's "Use of AI Tools" note anchors
to the WordPress AI Guidelines (banned by R7/AC7) and assigns review responsibility
in a large human-contributor project; this repo has no in-repo AI policy doc to
link instead, so a de-Gutenberged version would be a bare, policy-less sentence. If
AI accountability were ever wanted, the vehicle is a `CONTRIBUTING.md` policy
section — out of scope for this change.

### KD10 — Drop the top intro comment (R7/AC7, design-deferred adornment)
The file starts at `## What?` on line 1 with no Gutenberg-style intro comment.
Rationale: an intro maps to no requirement; the only useful payload it could carry
(a `CONTRIBUTING` pointer) is already provided by the `## Changeset` footer, so a
second pointer is duplication. A link-less "Thanks for contributing!" greeting is
contentless filler. R7/AC7 bans the *Gutenberg* CONTRIBUTING link specifically;
dropping the intro entirely sidesteps even the appearance of carrying over the
Gutenberg intro pattern and reduces comment count (helping AC8's render
cleanliness).

### KD11 — No checkbox checklist (R6/AC6)
No `- [ ]` task-list items anywhere. The changeset and testing obligations are
enforced by the Changeset Gate CI and documented in `CONTRIBUTING.md`; a cosmetic,
perpetually-unchecked box is intentionally excluded.

## Dependencies

- **GitHub PR-template convention.** GitHub must read
  `.github/PULL_REQUEST_TEMPLATE.md` and pre-fill the PR description box. This is a
  stable, documented platform behavior; no configuration is required.
- **GitHub-flavored Markdown rendering.** The PR description box renders GFM:
  `<h2>` headings, inline code, links, invisible HTML comments, and `#<number>`
  issue autolinks / closing keywords.
- **`CONTRIBUTING.md` at the repo root on `trunk`.** The changeset reminder links
  here (KD7). Verified present; the link pins the `trunk` branch.
- **`.changeset/config.json` `changedFilePatterns`.** Determines that `.github/**`
  is not release-relevant (AC9). The reminder's path list mirrors this config.

No npm packages, no scripts, no workflow steps are added or required. The change
has no build or runtime dependency.

## Failure Modes and Observability

This is a static content file with no runtime, so "failure modes" are
content/rendering and CI-interaction concerns rather than operational ones.

- **Malformed HTML comment leaks into the render.** The only realistic way a
  comment becomes visible is a malformed one (unterminated `<!--` or a stray
  `-->`), which can swallow or expose following content. *Mitigation:* every hint
  is a well-formed, self-contained single-line comment; no comment spans a heading.
  *Observability:* visible in the PR-description preview the moment the file is
  authored — the whole-file render was verified via GitHub's GFM API this session
  (see below).
- **`Closes #` mis-rendered as a broken link.** Addressed by KD5: an unfilled
  `Closes #` renders as literal text (verified), not a broken/empty link, which is
  the expected initial state per AC4/AC8.
- **`CONTRIBUTING.md` link unreachable from a PR description.** Addressed by KD7
  (full blob URL). *Observability:* the link is clickable in any rendered PR
  description; a 404 would be immediately visible.
- **False Changeset-Gate failure (AC9).** The gate runs
  `npx changeset status --since=origin/<base>` (presence) and
  `node scripts/validate-changesets.mjs` (shape), plus `npm test`. *Why this file is
  safe:* `.github/**` is absent from `.changeset/config.json` `changedFilePatterns`
  and is explicitly listed under `CONTRIBUTING.md`'s "**no** changeset" set, so a
  `.github/`-only change is not release-relevant and `changeset status` will not
  demand a changeset. `npm test` runs `node --test scripts/test/**`, which does not
  touch `.github/**`, so adding the file cannot change the test outcome.
  *Observability:* the gate's pass/fail status is reported on the PR.

**Whole-file render verification (AC8).** The assembled template was rendered
through GitHub's GFM API (`POST /markdown`, mode=gfm,
context=`Automattic/radical-pipelines`) during design. Result: four `<h2>` headings
(`What?`, `Why?`, `How?`, `Changeset`) render with the `?` shown; all three
section-hint HTML comments are invisible; `Closes #` renders as plain literal text;
the changeset paragraph shows the five paths and `npx changeset` as inline code and
a working link to the correct `CONTRIBUTING.md` blob URL; no `- [ ]` items and no
Gutenberg/WordPress content. End-to-end AC8 confirmed.

## Acceptance Criteria coverage

| AC | Met by |
|---|---|
| **AC1** — template auto-fills on a new PR | KD1: file at `.github/PULL_REQUEST_TEMPLATE.md`; GitHub auto-fills the PR body by convention. Pure file-add (no template exists today, verified). |
| **AC2** — What/Why/How present & ordered | KD2: exactly three l2 headings `## What?` → `## Why?` → `## How?` in fixed order. The fourth `## Changeset` footer is not one of the three concepts, so it does not violate AC2. |
| **AC3** — each section guides the author | KD3 + KD4: one HTML-comment hint per section, visible in the edit box, Gutenberg/WP-free; comment-only is sufficient per spec. |
| **AC4** — issue-linking stub present | KD5: bare `Closes #` directly under `## What?`; fill-in affordance; unfilled is the expected initial state (renders as literal text). |
| **AC5** — exactly one visible changeset reminder | KD6 + KD7: single visible `## Changeset` paragraph — `npx changeset`, all five release-relevant paths, links `CONTRIBUTING.md` (full blob URL), CONTRIBUTING-consistent terms, no bump-rule restatement; exactly one, not in a comment. |
| **AC6** — no checkbox checklist | KD11: no `- [ ]` items anywhere; confirmed in the assembled render. |
| **AC7** — no Gutenberg/WP-specific content | KD4 (de-Gutenberged hints), KD8 (no Testing/keyboard steps), KD9 (no AI-Guidelines link), KD10 (no Gutenberg CONTRIBUTING intro); no Screenshots Before/After table carried. |
| **AC8** — clean GFM render | KD3/KD5 + whole-file GFM-API render verification: headings + visible reminder display, all comments invisible, unfilled `Closes #` is literal text (not a broken render). |
| **AC9** — Changeset Gate stays green | Confined to `.github/**`, absent from `changedFilePatterns` and in CONTRIBUTING's "no changeset" list (verified); `changeset status` won't demand a changeset and `npm test` is unaffected. |
| **AC10** — repo's own template only | KD1: single added file is `.github/PULL_REQUEST_TEMPLATE.md`; no downstream/generated template and no CI/workflow added or changed. |

## Risks and Open Questions

**Open questions:** none. All design topics are resolved; every requirement and AC
is served by a decision; feasibility is verified against the live codebase; the
assembled template renders cleanly.

**Risks** (all low / very low — this is one static Markdown file with no code,
runtime, or CI impact):

- **R-1 (low) — the `CONTRIBUTING.md` link hard-codes `trunk`.** The full blob URL
  pins the `trunk` branch. *Accepted:* `trunk` is the stable default branch
  (verified), `CONTRIBUTING.md` is not moving, and a branch link (not a SHA) tracks
  the latest content. This is the standard approach for template links rendered in
  PR descriptions and is robust across both render contexts (KD7).
- **R-2 (low) — relative-link resolution not live-tested in a real PR.** The
  full-blob-URL decision rests on documented GitHub relative-link resolution (the
  GFM API passes hrefs verbatim; resolution is display-time). *Neutralized:* the
  full-blob-URL choice is correct regardless of how relative links resolve, so the
  decision already removes the risk.
- **R-3 (very low) — author leaves the unfilled `Closes #` in a merged PR.** By
  design this is the expected initial state and renders as harmless literal text
  (AC4/AC8), not a broken render; real merged-PR behavior shows authors typically
  fill or delete it. No mitigation needed; noted for reviewer awareness.
- **R-4 (very low) — a future maintainer adds markdownlint and trips MD026** on the
  `?` headings. Today there is no linter (verified: no markdownlint/prettier config;
  CONTRIBUTING states there is no lint/typecheck step). If one is ever added,
  MD026's `punctuation` option or a PR-template exception covers it; not a concern
  for this change (KD2).
