# Docs review — Add a What/Why/How pull request template

## Verdict

**APPROVED.**

## Batch scope

- **Tasks in batch:** Task 1 only — "Note the new PR template in `CONTRIBUTING.md`
  (discoverability pointer)".
- **Diff reviewed:** `61e20bf..HEAD` (batch doc commit `5d5fa9a`,
  "Note PR template in contributing guide (doc-writer)").
- **Source of truth for concrete claims:** the shipped
  `.github/PULL_REQUEST_TEMPLATE.md` (code commit `4344305`).
- **Doc gates enumerated by host project:** none (no markdown lint, no link
  checker, no doc tests). The accuracy spot-check below is therefore the sole
  gate.

## Summary

The doc-writer added a single 9-line `## Opening a pull request` section to
`CONTRIBUTING.md`, inserted between the intro and the existing
`## Running tests and checks locally` section. The diff is **insertion-only**
(0 deletions verified), confined to `CONTRIBUTING.md`. The new section tells a
contributor that opening a PR pre-fills the repo's default template at its real
path with What?/Why?/How? sections, an issue-linking stub, and a release-relevant
changeset reminder, then cross-links the existing `## Adding a changeset` rules as
the authoritative source. It summarizes rather than reproduces the template's
prompts, introduces no second copy of the changeset rules, adds no checkbox
checklist, and carries no Gutenberg/WordPress content. Every concrete claim
matches the shipped template, and the cross-link anchor resolves to a real
heading.

## Checks table

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Contributor can learn opening a PR pre-fills a What/Why/How template + prompts issue-linking + changeset | PASS | New section names all three (What?/Why?/How? sections, "a stub to link the issue", "a reminder to add a changeset"). `CONTRIBUTING.md:14-19` |
| 2 | Does NOT reproduce the template's prompts/exact wording | PASS | Summarizes the sections by name; does not paste the HTML-comment hints or the `Closes #`/`npx changeset` prose verbatim. |
| 3 | Does NOT duplicate the changeset rules | PASS | Cross-links `[Adding a changeset](#adding-a-changeset)` as "the authoritative source"; no path list, command, or bump rules restated in the new text. |
| 4 | References the template by its real role/location matching the shipped file | PASS | "GitHub pre-fills the repo's default template (`.github/PULL_REQUEST_TEMPLATE.md`)" — path and role match the shipped file. |
| 5 | Adds no checkbox checklist | PASS | grep for `- [ ]` in the added lines: no match. |
| 6 | Adds no Gutenberg/WordPress content | PASS | grep for gutenberg/wordpress/screenshot/keyboard in added lines: no match. |
| 7 | Does not alter existing changeset/release sections beyond the insertion | PASS | `git diff` shows 0 deletions; section ordering after `## Adding a changeset` (line 40) unchanged. |
| 8 | Confined to `CONTRIBUTING.md` (non-release-relevant) | PASS | `git diff --stat`: only `CONTRIBUTING.md` changed, +9/-0. |
| 9 | Keeps Changeset Gate green (no changeset demanded) | PASS | `CONTRIBUTING.md` absent from `.changeset/config.json` `changedFilePatterns` (`skills/**`, `agents/**`, `.claude-plugin/**`, `package.json`, `README.md`); CONTRIBUTING's own "no changeset" list confirms meta files are exempt. |
| 10 | No second copy of, or contradiction with, the template's changeset footer | PASS | New text says the reminder "points back to" the rules; the shipped footer indeed links to `CONTRIBUTING.md` — reciprocal and consistent. |
| 11 | No other doc surface named by the plan left stale | PASS | grep for PR-template references across `README.md`, `AGENTS.md`, `.changeset/README.md`: no match (plan disposition of "no change needed" holds). |

## Accuracy spot-check

Cross-checked every concrete claim in the new text against the shipped
`.github/PULL_REQUEST_TEMPLATE.md`:

- **Path** `.github/PULL_REQUEST_TEMPLATE.md` — file exists at that path. ✓
- **`## What?` / `## Why?` / `## How?` headings** — present in the shipped
  template at lines 1, 5, 8. ✓ (The new text's "**What? / Why? / How?**" matches
  the question-form headings exactly.)
- **`Closes #` issue-linking stub** — present at template line 2; the new text's
  "a stub to link the issue it closes" describes it accurately without pasting it. ✓
- **Changeset reminder** — template line 12 uses `npx changeset` and links
  `CONTRIBUTING.md`; the new text's "a reminder to add a changeset when your change
  is release-relevant … points back to" is accurate. ✓
- **Cross-link anchor** `[Adding a changeset](#adding-a-changeset)` — resolves to
  the real `## Adding a changeset` heading at `CONTRIBUTING.md:40` (GitHub slug of
  "Adding a changeset" = `adding-a-changeset`). ✓

## Issues

None. Task 1's acceptance criteria are fully met. The pointer aids discovery,
references the template by its real role/location, restates neither the template
prompts nor the changeset rules, adds no checkbox/Gutenberg content, leaves the
existing changeset/release sections untouched beyond the insertion, and stays
confined to the non-release-relevant `CONTRIBUTING.md` — so the Changeset Gate
stays green.
