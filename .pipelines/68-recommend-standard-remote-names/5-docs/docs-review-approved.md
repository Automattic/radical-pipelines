# Docs review — Approved

Batch: D1 (README accuracy check) and D2 (Changesets entry), from `3-plan/doc-plan.md`.
Base ref diffed against: `a04af35` (last Phase-4 commit). Doc batch commit under review: `0f402f0` (D2). `.rp/**` artifacts excluded from the product diff.

## Verdict

**Approved.** Both doc tasks are correct. The product diff (excluding `.rp/**`) contains exactly one new file — the changeset — and no other doc surface changed.

## Checks

| Check | Command / method | Result |
| ----- | ---------------- | ------ |
| Changeset shape validator | `node scripts/validate-changesets.mjs` | PASS (exit 0) |
| Test suite (incl. validate-changesets CLI tests) | `npm test` | PASS — 22 pass / 0 fail (exit 0) |
| Product diff scope (excl. `.rp/**`) | `git diff --stat a04af35 HEAD -- . ':(exclude).rp/**'` | Only `.changeset/recommend-standard-remote-names.md` (1 file, +5) |
| Markdown linter | n/a | None ships in repo |

## D2 — Changeset entry (`.changeset/recommend-standard-remote-names.md`)

Front matter / packaging:
- Keys `@automattic/radical-pipelines`, matching `package.json` `name` exactly.
- Bump `minor`, matching all three existing entries (`automate-releases.md`, `restructure-repository-layout.md`, `changelog-and-version-sync.md`, all `minor`) and the pre-1.0 policy for a backward-compatible feature addition (new recommendation + opt-in rename + resolved-name capture; no convention removed; `artifacts-in-repo` untouched — a feature, not a `patch` fix).
- Single new file; no existing changeset modified.
- Hand-named slug (`recommend-standard-remote-names.md`), matching the repo's existing convention.

Body accuracy vs shipped `setup.md` (the artifacts-in-fork "Recommend the standard remote names" + Capture blocks):
- "Recommend the standard `origin`/`upstream` remote names during `artifacts-in-fork` setup" — matches setup.md recommend step (R1).
- "`gh` fork/parent auto-detection to propose the assignment, and always falling back to asking the owner when detection is ambiguous or unavailable" — matches the auto-detect-to-propose-with-owner-confirmation floor (R6); correctly frames detection as proposing, never gating.
- "decline-able and the orchestrator never renames a remote without the owner's explicit approval" — matches the explicit-approval / never-silent rule (R3). Does NOT claim a silent rename.
- "already-standard remotes are left untouched" — matches the no-op case (R8).
- "Whatever names end up in use — renamed or kept — are recorded as the resolved, authoritative remote names, which downstream operations resolve through when pushing the pipeline branch to the fork and the clean PR branch to the upstream" — matches the resolved-name capture + authoritative role→name resolution for both downstream pushes (R4, R5).
- "`artifacts-in-repo` mode is unaffected" — matches spec O4 / setup.md.

Register and altitude: single user-outcome prose paragraph, matching the existing entries' register; no line-by-line diff recap; scoped to this change only; references no unrelated work.

No claim in the body contradicts the shipped `setup.md` behavior. The two highest-risk points (no silent rename; resolved/authoritative name capture) are stated accurately.

## D1 — README accuracy (verified no change needed)

Independently confirmed against the full README. Every passage touching setup / artifact storage / fork mode / push behavior (the Configuration section, lines ~151–167, including the `.rp.md` shared-section topic list that names "push behavior") sits strictly ABOVE remote-naming altitude. The README never mentions remotes, `origin`/`upstream`, remote naming, the identify-the-remotes step, or the fork's push targets at a level the shipped change could contradict.

The shipped change adds detail BELOW the README's altitude (a step inside the fork-mode setup flow). No README statement is now inaccurate or misleadingly incomplete. D1's deliberate no-edit outcome is correct: adding remote-naming detail would lift `setup.md` mechanics into the README and create a new drift surface — which D1 explicitly forbids. No stale passage left behind.

## Scope

Product diff (excluding `.rp/**`) = exactly `.changeset/recommend-standard-remote-names.md`. `setup.md` was not touched by this batch (its Phase-4 edits predate the base `a04af35`). No other doc surface changed; no out-of-scope file touched.
