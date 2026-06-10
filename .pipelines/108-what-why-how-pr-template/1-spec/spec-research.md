# Spec research — Add a What/Why/How pull request template

## Rough idea (from `0-prompt/prompt.md`)

# Add a What/Why/How pull request template

## Goal

Contributors opening a pull request in the `radical-pipelines` repository are
presented with a PR template that guides them to describe their change using a
**What / Why / How** structure.

## Constraints

- Scope is the `radical-pipelines` repo's _own_ pull-request template — not a
  template that radical-pipelines generates for downstream projects that use it.

## Assumptions / directions to explore

_Open — later phases may confirm or revise these._

- Use the **What / Why / How** format.
- Take inspiration from — and possibly base it on — the Gutenberg PR template
  (`WordPress/gutenberg` → `.github/PULL_REQUEST_TEMPLATE.md`).

_Source issue: https://github.com/Automattic/radical-pipelines/issues/108_

## Q&A

### Q1 — What does the current Gutenberg PR template actually contain, and which parts transfer to radical-pipelines?

**Answer.** The Gutenberg template uses **question-form level-2 headings**, not bare words: `## What?`, `## Why?`, `## How?`, then `## Testing Instructions` (with a `### Testing Instructions for Keyboard` subsection), `## Screenshots or screencast`, and `## Use of AI Tools`. There is **no checkbox checklist**, no "types of change" list, and no changelog/i18n section. Each section is mostly HTML-comment hints guiding the author. Verbatim structure:

- Top: generic `<!-- Thanks for contributing … CONTRIBUTING.md -->` comment.
- `## What?` — hint to link the issue with a keyword, plus a literal fill-in stub `Closes <!-- #ISSUE-NUMBER or URL -->`, plus "In a few words, what is the PR actually doing?".
- `## Why?` — hint for problem/motivation; reference prior issues/PRs with a short summary.
- `## How?` — hint for implementation details.
- `## Testing Instructions` — hint + commented-out example steps (block-editor specific: "Open a post or page", "Insert a heading block").
- `### Testing Instructions for Keyboard` — accessibility, required for UI changes.
- `## Screenshots or screencast` — Before/After markdown table scaffold.
- `## Use of AI Tools` — AI-disclosure section linking the WordPress AI Guidelines (added 2026-03-12).

**Gutenberg-specific cruft to drop/adapt for a Node/Claude-Code-plugin repo with no UI:** the Gutenberg CONTRIBUTING link; the block-editor testing example steps; the entire `### Testing Instructions for Keyboard` accessibility subsection; the Screenshots/screencast Before/After table; the WordPress-specific AI Guidelines URL.

**Reasoning.** The clean transferable core is the three What?/Why?/How? sections (exactly what the issue asks for). A slimmed Testing section with a repo-appropriate hint and an adapted AI-disclosure note are optional extras worth weighing — an AI-disclosure note is arguably *more* relevant here since radical-pipelines is itself an AI-pipeline tool. Everything UI/accessibility/screenshot/WordPress-link related does not apply.

**Sources.** `WordPress/gutenberg` → `.github/PULL_REQUEST_TEMPLATE.md`, fetched 2026-06-09 via `gh api repos/WordPress/gutenberg/contents/...`; repo HEAD `eae11ab`, file last touched by commit `a9b4b0d` (2026-03-12, "Include AI tools disclosure in PR template (#76425)"). Raw URL: https://github.com/WordPress/gutenberg/blob/trunk/.github/PULL_REQUEST_TEMPLATE.md

### Q2 — Should the template be bare What?/Why?/How?, or also carry a lightweight contributor reminder (changeset, issue link)? What's the GitHub convention and the checkbox-vs-comment tradeoff?

**Answer.** A single lightweight changeset reminder earns its place; a heavyweight checkbox checklist does not fit a small repo. Key findings:

- **GitHub's own guidance** does not prescribe checklists. It only suggests a PR template may ask for: a reference to a related issue, a description of the changes, and @mentions of reviewers. Checklists are a community convention, not an official recommendation. (`.github/PULL_REQUEST_TEMPLATE.md` is the standard location.)
- **HTML comment vs. real `- [ ]` checkbox.** HTML comments are invisible in the rendered PR — they guide the author while editing, then leave no trace. Task-list checkboxes render as clickable, persistent boxes but are purely honor-system/cosmetic: checking one does NOT gate merge. (The advanced "tasklist tracking" auto-completion is issue-only and has been retired in favor of sub-issues; plain `- [ ]` still renders fine in PR bodies.) The real gate here is the Changeset Gate CI workflow, not any checkbox.
- **Convention across comparable repos** splits three ways: (1) prose-only — Gutenberg, and Knip (a Node/TS changesets tooling lib whose template is just an HTML comment pointing to docs/CI); (2) prose + inline changeset reminder, no checkbox — **Astro** literally writes "Don't forget a changeset! Run `pnpm changeset`." with a guide link; (3) full checkbox checklist with a changeset item — Backstage and Cloudflare workers-sdk, both large monorepos. The Astro-style single reminder is the best-fitting precedent for a small private repo: it nudges without ceremony and without a perpetually-unchecked box in every PR.
- **Changesets-using repos do put reminders in templates** (Astro inline prose, Backstage checkbox) rather than relying solely on the changesets bot. The bot itself only leaves a *non-blocking* comment; radical-pipelines instead has a *hard* CI gate, and per its own CONTRIBUTING.md the soft `@changesets/bot` is listed under "optional hardening (documented, not done)" — i.e. **not installed**. Verified locally: there is **no** PR template today, **no** changesets-bot config in `.changeset/`, and the changeset command is `npx changeset` (CONTRIBUTING.md and package.json expose only `release:version` = `changeset version`; there is no `npm run changeset` alias). With no soft bot, a contributor's first signal of a missing changeset is a red CI check — so a visible template reminder fills a real gap.

**Reasoning / recommended shape.** Keep the template centered on `## What?` / `## Why?` / `## How?` (exactly what the issue asks), optionally a short Testing prose section, a free "Closes #issue" stub (the one thing GitHub itself recommends), and ONE visible (not HTML-commented) changeset reminder line — Astro-style, using `npx changeset` and naming the release-relevant paths from CONTRIBUTING.md — because the gate is a hard fail and a surprise red check is worth pre-empting. Avoid a `- [ ]` checklist: it is cosmetic, the gate already enforces it, and it would sit perpetually unchecked.

**Sources** (all fetched 2026-06-09): GitHub PR-template docs https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository ; task-list docs https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-task-lists ; changesets bot README https://github.com/changesets/bot ; example templates: Astro https://github.com/withastro/astro/blob/main/.github/PULL_REQUEST_TEMPLATE.md , Knip https://github.com/webpro-nl/knip/blob/main/.github/PULL_REQUEST_TEMPLATE.md , Backstage https://github.com/backstage/backstage/blob/master/.github/PULL_REQUEST_TEMPLATE.md , Cloudflare workers-sdk https://github.com/cloudflare/workers-sdk/blob/main/.github/pull_request_template.md ; repo-local verification: `find` (no existing template), `ls .changeset/` (no bot config), `grep changeset package.json`, and CONTRIBUTING.md §"optional hardening".

## Consolidated Requirements

Observable outcomes the implementation must satisfy. ("PR template" = the radical-pipelines repo's own default GitHub pull-request template.)

1. A new default PR template file exists at `.github/PULL_REQUEST_TEMPLATE.md` in the radical-pipelines repo and is automatically pre-filled into the description box when a contributor opens a new pull request against the repo.
2. The template contains three primary sections, in order, structured around the What / Why / How format: a **What** section, a **Why** section, and a **How** section, each a level-2 markdown heading. Heading style follows the Gutenberg inspiration's question form (`## What?`, `## Why?`, `## How?`); a non-question form (`## What`) is an acceptable design-phase variation but the three concepts and their order are fixed.
3. Each of the three sections includes a short author-guidance hint (HTML comment and/or brief prose) conveying its intent: **What** = what the change actually does; **Why** = the problem/motivation it solves; **How** = the implementation approach/details. Hints are concise and free of Gutenberg/WordPress-specific wording.
4. The template provides an issue-linking affordance — a "Closes #" stub (e.g. within or just under the What section) — so contributors link the PR to its issue using a GitHub closing keyword. This is the one element GitHub's own template guidance recommends.
5. The template includes exactly one visible (not HTML-comment-hidden) changeset reminder line that tells contributors to run `npx changeset` for release-relevant changes and names the release-relevant paths (`skills/**`, `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`). Wording matches CONTRIBUTING.md terminology and the actual command (`npx changeset`); it points readers to CONTRIBUTING.md for detail rather than restating the bump table.
6. The template does NOT include a `- [ ]` checkbox checklist (the changeset/test obligations are enforced by the Changeset Gate CI and documented in CONTRIBUTING.md; a cosmetic, perpetually-unchecked box is excluded by design).
7. The template excludes all Gutenberg/WordPress-specific content with no analogue in this repo: the Gutenberg CONTRIBUTING link, block-editor testing example steps, the "Testing Instructions for Keyboard" accessibility subsection, the Screenshots/screencast Before/After table, and the WordPress AI Guidelines link/section.
8. Scope boundary: the deliverable is the radical-pipelines repo's OWN PR template only. It does NOT add, generate, or modify any PR template that radical-pipelines produces for downstream projects, and does NOT change the release/changeset CI workflows themselves.
9. The template is valid GitHub-flavored Markdown that renders cleanly in the PR description box (headings and hints display as intended; HTML comments stay invisible in the rendered PR).
10. Because the change is confined to `.github/**` (not a release-relevant path), it requires no changeset of its own per CONTRIBUTING.md, so the new file must not, by itself, trip the Changeset Gate.

### Deferred to the design phase (genuine open choices, not blockers)

- **Optional Testing section.** Whether to add a short, repo-appropriate `## Testing` prose hint (e.g. "run `npm test`" / how to exercise the pipeline). Recommended as a light optional section; precise wording and inclusion left to design.
- **Optional AI-disclosure note.** Whether to adapt Gutenberg's "Use of AI Tools" concept into a brief repo-appropriate note (no WordPress link). Arguably relevant since the project is itself an AI tool; inclusion and wording left to design.
- **Exact hint phrasing and heading punctuation** (`## What?` vs `## What`), and whether the changeset reminder sits in its own short footer section or under How/Testing.
