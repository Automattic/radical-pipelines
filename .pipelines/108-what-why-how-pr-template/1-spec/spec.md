# Spec — Add a What/Why/How pull request template

## Overview

The `radical-pipelines` repository has no default GitHub pull-request template
today. As a result, the PR description box opens empty and contributors get no
guidance on how to structure the information reviewers need.

This change adds a default pull-request template to the repository so that, when
a contributor opens a new pull request, the description box is pre-filled with a
structure that prompts them to describe their change using a **What / Why / How**
format. The template draws inspiration from the Gutenberg PR template
(`WordPress/gutenberg` → `.github/PULL_REQUEST_TEMPLATE.md`) but is adapted to a
Node / Claude-Code-plugin repository with no UI: Gutenberg/WordPress-specific
content is dropped, and a single visible changeset reminder is added because the
repository enforces a hard Changeset Gate in CI.

The deliverable is the `radical-pipelines` repository's **own** PR template only.
It is not a template that `radical-pipelines` generates for downstream projects.

## Requirements

1. **Default PR template exists and auto-fills.** A default pull-request template
   exists in the repository at the standard GitHub location
   (`.github/PULL_REQUEST_TEMPLATE.md`) and is automatically pre-filled into the
   PR description box when a contributor opens a new pull request against the
   repository.

2. **What / Why / How structure.** The template contains three primary sections,
   in this fixed order, structured around the What / Why / How format:
   - a **What** section — what the change actually does,
   - a **Why** section — the problem or motivation it addresses,
   - a **How** section — the implementation approach / details.

   Each is a level-2 Markdown heading. The three concepts and their order are
   fixed by this spec. (Exact heading punctuation — e.g. `## What?` vs `## What` —
   is a design-phase choice; see Out of Scope.)

3. **Author-guidance hints.** Each of the three sections includes a short
   author-guidance hint that conveys the section's intent (What = what the change
   does; Why = the problem/motivation; How = the implementation approach). A hint
   MAY take the form of an HTML comment, brief visible prose, or both — the form
   is a design-phase choice (see Out of Scope). The hint is evaluated against the
   template as it appears in the PR description edit box (where HTML comments are
   visible to the author guiding them as they write), so a comment-only hint
   satisfies this requirement; this is consistent with the rendered-output
   invisibility of HTML comments in Requirement 8. Hints are concise and free of
   Gutenberg/WordPress-specific wording.

4. **Issue-linking affordance.** The template provides a way for contributors to
   link the PR to its issue using a GitHub closing keyword — a "Closes #" stub
   placed within or near the What section. The stub is a fill-in affordance: the
   author supplies the issue number. An un-filled stub (shipped before the author
   edits it) is therefore the expected initial state, not a broken or empty
   render. (The exact stub syntax is a design-phase choice; see Out of Scope.)

5. **Single visible changeset reminder.** The template includes exactly one
   visible (not hidden inside an HTML comment) changeset reminder that tells
   contributors to run `npx changeset` for release-relevant changes, names the
   release-relevant paths (`skills/**`, `agents/**`, `.claude-plugin/**`, the
   root `package.json`, and `README.md`), and points readers to `CONTRIBUTING.md`
   for detail rather than restating the version-bump rules. Its wording is
   consistent with `CONTRIBUTING.md` terminology and uses the actual command
   (`npx changeset`).

6. **No checkbox checklist.** The template does not include a `- [ ]` task-list /
   checkbox checklist. The changeset and testing obligations are enforced by the
   Changeset Gate CI and documented in `CONTRIBUTING.md`; a cosmetic,
   perpetually-unchecked box is intentionally excluded.

7. **No Gutenberg/WordPress-specific content.** The template excludes all
   Gutenberg/WordPress-specific content that has no analogue in this repository,
   including: the Gutenberg `CONTRIBUTING.md` link, block-editor testing example
   steps, the "Testing Instructions for Keyboard" accessibility subsection, the
   Screenshots/screencast Before/After table, and the WordPress AI Guidelines
   link.

8. **Valid, clean-rendering Markdown.** The template is valid GitHub-flavored
   Markdown that renders cleanly in the PR description box: headings and visible
   hints display as intended, and any HTML comments stay invisible in the
   rendered PR.

9. **Does not trip the Changeset Gate.** Because the change is confined to
   `.github/**` (not a release-relevant path), adding the template requires no
   changeset of its own per `CONTRIBUTING.md`, and the new file must not, by
   itself, cause the Changeset Gate to fail.

## Out of Scope

- **Downstream / generated templates.** This change does not add, generate, or
  modify any PR template that `radical-pipelines` produces for downstream
  projects that use it. Scope is limited to the `radical-pipelines` repository's
  own template.

- **CI / release workflow changes.** This change does not modify the
  release/changeset CI workflows (e.g. the Changeset Gate) or any other
  workflow. It only adds the template file.

- **Issue templates and other community-health files.** Only the pull-request
  template is in scope; issue templates and other `.github` community files are
  not addressed.

- **Optional Testing section (design-deferred).** Whether to include a short,
  repo-appropriate `## Testing` prose hint (e.g. how to run `npm test` or
  exercise the pipeline) is a design-phase decision, not a requirement of this
  spec. If included, it must be repo-appropriate and free of Gutenberg
  block-editor example steps (see Requirement 7).

- **Optional AI-disclosure note (design-deferred).** Whether to adapt the
  Gutenberg "Use of AI Tools" concept into a brief repo-appropriate note is a
  design-phase decision, not a requirement of this spec. If included, it must
  not link to the WordPress-specific AI Guidelines (see Requirement 7).

- **Exact wording, heading punctuation, hint form, and layout (design-deferred).**
  The precise hint phrasing, the form each hint takes (HTML comment, brief visible
  prose, or both — Requirement 3), the exact "Closes #" stub syntax (Requirement
  4), the choice between question-form (`## What?`) and bare (`## What`) headings,
  and whether the changeset reminder sits in its own short footer section or
  alongside another section are left to the design phase. The fixed constraints
  are the three What/Why/How concepts and their order (Requirement 2), the
  presence of the issue-linking stub (Requirement 4), and the single visible
  changeset reminder (Requirement 5).

## Acceptance Criteria

### AC1 — Template auto-fills on a new PR
- **Given** the change is merged into the repository,
- **When** a contributor opens a new pull request against the repository,
- **Then** the PR description box is pre-filled with the template content from
  `.github/PULL_REQUEST_TEMPLATE.md`.

### AC2 — What / Why / How sections present and ordered
- **Given** the template content,
- **When** it is read top to bottom,
- **Then** it contains a What section, then a Why section, then a How section, in
  that order, each as a level-2 Markdown heading, and no other ordering of these
  three is present.

### AC3 — Each section guides the author
- **Given** the template content as it appears in the PR description edit box
  (where HTML comments are visible to the author),
- **When** a contributor reads any of the three sections,
- **Then** that section includes a concise hint conveying its intent (What = what
  the change does; Why = the problem/motivation; How = the implementation
  approach), with no Gutenberg/WordPress-specific wording. The hint MAY be an HTML
  comment, brief visible prose, or both; a comment-only hint satisfies this
  criterion (it is visible in the edit box) and remains consistent with AC8.

### AC4 — Issue-linking stub is present
- **Given** the template content,
- **When** it is inspected,
- **Then** there is a "Closes #" stub (within or near the What section) that lets
  the author link the PR to its issue via a GitHub closing keyword. The stub is a
  fill-in affordance — the author supplies the issue number — so an un-filled stub
  is the expected initial state and is not treated as a broken or empty render
  (see AC8).

### AC5 — Exactly one visible changeset reminder
- **Given** the rendered PR description,
- **When** it is viewed,
- **Then** exactly one changeset reminder is visible (not hidden in an HTML
  comment); it instructs the contributor to run `npx changeset` for
  release-relevant changes, names the release-relevant paths (`skills/**`,
  `agents/**`, `.claude-plugin/**`, root `package.json`, `README.md`), and points
  to `CONTRIBUTING.md` for detail.

### AC6 — No checkbox checklist
- **Given** the template content,
- **When** it is inspected for `- [ ]` task-list items,
- **Then** none are present.

### AC7 — No Gutenberg/WordPress-specific content
- **Given** the template content,
- **When** it is inspected,
- **Then** it contains none of: the Gutenberg `CONTRIBUTING.md` link,
  block-editor testing example steps, a "Testing Instructions for Keyboard"
  subsection, a Screenshots/screencast Before/After table, or a WordPress AI
  Guidelines link.

### AC8 — Renders cleanly as GitHub-flavored Markdown
- **Given** the template content,
- **When** it is rendered in a GitHub PR description box,
- **Then** all headings and visible hints display as intended and any HTML
  comments are invisible in the rendered output. An un-filled "Closes #" stub
  (before the author supplies the issue number; see AC4) is the expected initial
  state and does not count as a broken or empty render.

### AC9 — Changeset Gate stays green
- **Given** the pull request that adds the template (touching only `.github/**`),
- **When** the Changeset Gate CI runs,
- **Then** it does not fail for a missing changeset on account of this change.

### AC10 — Scope is the repo's own template only
- **Given** the merged change,
- **When** the repository is inspected,
- **Then** the only added/modified template is the repository's own
  `.github/PULL_REQUEST_TEMPLATE.md`; no downstream/generated template and no CI
  or release workflow has been added or modified.
