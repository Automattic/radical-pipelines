# Design review — Add a What/Why/How pull request template

## Verdict

**APPROVED.**

## Summary

The design specifies a single static deliverable —
`.github/PULL_REQUEST_TEMPLATE.md` — and nothing else. Every one of the 10
acceptance criteria and 9 requirements is served by a traceable decision
(KD1–KD11), no decision is orphaned, no alternative considered in the research is
silently dropped, and the scope holds exactly to the spec (no CI/workflow change,
no downstream/generated template, no issue template). Because the deliverable
*is* one Markdown file's content, specifying the exact bytes and the load-bearing
layout constraints is the correct altitude, not a plan leak: two implementers
given this doc would produce byte-identical files.

I treated the design adversarially and re-ran every empirically-checkable claim
against the live codebase this session. All of them hold:

- **Grounding.** No PR template exists today (`find .github -iname '*PULL_REQUEST*'`
  returns nothing); `.github/` holds only `dependabot.yml` and `workflows/`;
  default branch is `trunk`; `CONTRIBUTING.md` is at the repo root; remote owner is
  `Automattic/radical-pipelines` (so the blob URL owner is correct).
- **AC9 / Changeset Gate.** `.changeset/config.json` `changedFilePatterns` is
  exactly `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]`;
  `.github/**` is absent and is in `CONTRIBUTING.md`'s explicit "no changeset" list.
  `changeset-gate.yml` runs `npm test`, `node scripts/validate-changesets.mjs`, and
  `npx changeset status --since=origin/<base>`; the validator only checks changeset
  *shape* and never inspects `.github` paths, and `npm test` runs
  `node --test scripts/test/**` which does not touch `.github/**`. A `.github/`-only
  add cannot trip the gate.
- **AC5 wording.** `CONTRIBUTING.md` uses the exact command `npx changeset`
  (line 116), lists the same five paths with the "root `package.json`" qualifier
  (lines 59–65), and uses the terms "release-relevant"/"changeset". The reminder
  matches all four AC5 obligations and does not restate the bump-type rules.
- **No linter.** No markdownlint/prettier config exists (glob found nothing);
  `package.json` has only `test` and `release:version`; `CONTRIBUTING.md:19–20`
  states there is no lint/typecheck step. MD026 (trailing-`?`-in-heading) cannot
  fire, so the question-form headings are safe.
- **AC8 whole-file render (reproduced independently via `POST /markdown`,
  mode=gfm, context=`Automattic/radical-pipelines`).** Four `<h2>` headings render
  with the `?` shown; all three section-hint HTML comments are invisible; `Closes #`
  renders as plain literal text `<p>Closes #</p>` (no autolink attempt, no broken
  link); the Changeset paragraph renders visibly with the five paths and
  `npx changeset` as inline `<code>` and a working link to the correct
  `CONTRIBUTING.md` blob URL; no `- [ ]` items; no Gutenberg/WP content.
- **KD5 behavior (reproduced).** A filled `Closes #108` renders a working issue
  autolink to `Automattic/radical-pipelines/issues/108` (the API returned a real
  `data-id`, confirming issue #108 exists), activating the closing keyword. The
  rejected Gutenberg comment-form `Closes <!-- … -->` renders as the dangling
  `<p>Closes </p>`, exactly matching the rationale for preferring the bare form.

Traceability between the research doc and the design doc is faithful: KD1–KD11 map
cleanly onto Topics 1–7, the three design-deferred omissions (Testing, AI note,
top intro) are preserved with their full rationale, and risks R-1 through R-4
carry over verbatim. Dependencies are limited to stable platform conventions
(GitHub PR-template fill, GFM rendering) plus files the design reads but does not
modify; there are no hidden dependencies. Failure modes (malformed comment leak,
broken link, false gate failure, unfilled stub) are each given a mitigation and an
observability hook appropriate for a static content file.

## Issues

None blocking. Two non-blocking notes, recorded for the code phase — neither
changes the verdict:

- **N1 (cosmetic, non-blocking).** The voice yardstick the design cites,
  `AGENTS.md`'s "Rules when modifying **the skill**", is by its own wording scoped
  to the skill artifacts (`skills/**`), not to a `.github/` content file. The design
  uses it only as a general terseness / anti-duplication reference for one-line
  hints (and explicitly notes README is the wrong, fuller yardstick), and the prose
  it produced is verifiably terse and fully de-Gutenberged. This is a reasonable,
  non-load-bearing stylistic citation, not a requirement misapplication. No change
  required.

- **N2 (forward-looking, non-blocking).** KD7/R-1 pin `CONTRIBUTING.md` to the
  `trunk` branch in the blob URL. This is the correct call for a link rendered in a
  PR description (no file base URL) and is explicitly accepted as a low risk. Worth
  a one-line awareness note in the code phase only so a future `CONTRIBUTING.md`
  move/rename is known to require touching the template; no action now.
