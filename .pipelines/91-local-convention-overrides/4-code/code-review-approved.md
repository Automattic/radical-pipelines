# Code Review

## Verdict: approved

## Batch scope

Tasks reviewed (all 7 from `3-plan/code-plan.md`):

- Task 1: Create the canonical procedure doc `local-overrides.md`
- Task 2: Wire the loader gate to route to `local-overrides.md` on the PASS branch
- Task 3: Update the setup flow (gitignore entry, "only entry" reword, cross-reference, breadcrumb)
- Task 4: Extend the SKILL.md conventions blurb to mention `.rp.local.md`
- Task 5: Add a Configuration paragraph to README.md advertising the capability
- Task 6: Add `.rp.local.md` to the dogfood repo's root `.gitignore`
- Task 7: Add a changeset entry for the feature

Base ref: `f476478` → HEAD `c180681`. Seven files changed, exactly the seven the plan prescribes; nothing else touched.

## Summary

This is a documentation-as-code batch (skill-instruction Markdown read by the orchestrator LLM, plus the dogfood `.gitignore` and a changeset); there is no compiler or merge-logic test runner, so each task was judged against its Acceptance criteria as content/behavior assertions plus the runnable git checks the plan calls out. Every task's Acceptance is met. The canonical `local-overrides.md` contains all twelve required sections with every load-bearing fixed string exact (`dirname( git rev-parse --git-common-dir )`, the explicit `--show-toplevel` prohibition, the three mutually-exclusive reason substrings stated verbatim and exclusively, the batched summary block shape, the three overridability groups with exact members, the `(non-overridable)` marker at both granularities, the three worked examples, and the fail-soft / idempotency / assisted-inertness / confirm-before-write notes). The loader gate routes on PASS only and does not restate the mechanism; the table and FAIL branch are unchanged. Setup names both ignore entries with the never-committed rationale, cross-references the canonical doc, and offers the optional breadcrumb, with the fork reminder left intact. SKILL.md and README advertise the capability and preserve their existing pointers. The dogfood `.gitignore` gains the `.rp.local.md` line and `git check-ignore` exits 0 on the branch. Both scope guards are honored: no worktree-folder line was added, and the dogfood `.rp.md` Issues block is unchanged (and is absent from the diff). The changeset matches the repo precedent. No scope creep, no regressions, no contradictions across files.

## Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| Batch touches exactly the 7 planned files | `git diff --name-only f476478..HEAD` | Pass — 7 files, the exact set the plan names |
| Dogfood `.rp.md` unchanged (scope guard b) | `git diff --name-only f476478..HEAD -- .rp.md` | Pass — empty (not in diff); Issues block still uses `accessed via the \`gh\` CLI.` prose, no forced `**Access:**` |
| `.rp.local.md` ignored on the branch (Task 6 AC) | `git -C <worktree> check-ignore .rp.local.md` | Pass — exit 0; `.gitignore` has the line |
| No worktree-folder line added (scope guard a / Task 6 AC) | `git -C <worktree> check-ignore .claude/worktrees/` | Pass — exit 1 (not ignored); `.gitignore` has no `.claude/worktrees/` entry |
| load.md table + FAIL branch unchanged (Task 2 AC) | `git diff f476478..HEAD -- load.md` (removed-lines scan) | Pass — only removal is the old PASS sentence; 9-row table and FAIL wording byte-for-byte intact |
| Fixed reason substrings exact & exclusive (Task 1 AC) | grep req-15/16/17 substrings in `local-overrides.md` | Pass — all present verbatim with "and never ..." exclusivity clauses |
| Main-root recipe + `--show-toplevel` prohibition (Task 1 AC) | grep in `local-overrides.md` | Pass — `dirname( git rev-parse --git-common-dir )` and explicit "Do NOT use `git rev-parse --show-toplevel`" |
| README link target resolves (Task 5 AC) | `test -f .../local-overrides.md` | Pass |
| Changeset shape matches precedent (Task 7 AC) | compare to `.changeset/per-agent-model-config.md`; check `config.json` patterns | Pass — `"@automattic/radical-pipelines": minor`, `---`-delimited prose; `changedFilePatterns` covers `skills/**` and `README.md` |
| Branch working tree clean (all committed) | `git -C <worktree> status --porcelain` | Pass — empty |

## Behavior verification

The one runnable, user-observable check in this batch is the req-18 / Task-6 gitignore guarantee. Verified directly against the branch state:

- From the worktree (where the branch change lives): `git check-ignore .rp.local.md` → prints `.rp.local.md`, exit `0` (ignored / safe). Worktree `.gitignore` is `node_modules/ / .env / .env.local / .rp.local.md`.
- `git check-ignore .claude/worktrees/` → exit `1` (correctly NOT ignored — scope guard a honored; the pre-existing worktree-folder gap is left untouched).

Note: running `git check-ignore .rp.local.md` from the project main checkout (`/Users/luisherranz/Code/radical-pipelines`, branch `trunk`, HEAD `4bca9eb`) returns exit `1`, because the feature branch is not yet merged into `trunk`, so the main checkout's committed `.gitignore` has no `.rp.local.md` line yet. This is expected and correct — Task 6's acceptance is a property of the branch's committed state, which holds. It is not a defect.

## Per-task acceptance notes

- **Task 1** — All sixteen Acceptance bullets satisfied: file exists; filename/location stated; main-root recipe + `--show-toplevel` prohibition; read-from-main-root / merged-in-memory / never-copied-into-worktree; idempotent re-resolution; fail-soft (no setup, no hard-stop); three unit shapes + wholesale-replace; unmatched-entry → warn-and-ignore; three overridability groups with the exact members and the cadence-vs-`/loop` note; `(non-overridable)` marker at whole-convention and single-unit granularity, distinct from inherent locks; batched present-only summary with Applied/Ignored/Warning and the one-line template; the three reason substrings verbatim and exclusive; absent → emit nothing / clean → header+Applied; `git check-ignore` from main root, functional and merge-independent; three worked examples consistent with the design doc; confirm-before-write (show content, explicit confirmation, never overwrite without approval) + hand-authoring + optional-mention; assisted-inertness note.
- **Task 2** — `## Local overrides` section is positioned after `## Missing conventions`; fires only on PASS and runs strictly after the completeness check; routes to `local-overrides.md` and explicitly does not restate the mechanism ("the merge mechanism is not restated here"); the finality guard sentence is present; the 9-row table and the FAIL-branch wording are unchanged.
- **Task 3** — Artifact-storage explainer names `.rp.local.md` as a second always-required entry; step 6 drops "the only entry Radical Pipelines requires", names both entries with the never-committed rationale, instructs appending `.rp.local.md`, and cross-references `local-overrides.md`; step 5 has the optional breadcrumb framed asked-not-forced; prose is generic to any conforming consumer (does not present this repo's `.gitignore` as the exemplar); the fork reminder line is unchanged.
- **Task 4** — The `## Project conventions` sentence gains a one-clause mention of the git-ignored `.rp.local.md` restricted-subset override; mechanism is not restated; the existing `reference/conventions/load.md` pointer is preserved.
- **Task 5** — New standalone Configuration paragraph placed right after the `Agent models` paragraph; states filename + alongside-`.rp.md` location, the merge rule (local-wins per named unit, committed inherits, map-merge for keyed lists), the overridable subset vs shared/tool-forced conventions, git-ignored / never-affects-others; links the canonical doc; surrounding paragraphs unchanged.
- **Task 6** — Root `.gitignore` gains a `.rp.local.md` line; `git check-ignore` exits 0 on the branch; no `.claude/worktrees/` entry added.
- **Task 7** — New `.changeset/local-convention-overrides.md` with `"@automattic/radical-pipelines": minor`; prose describes the capability, the overridable subset, the merge rule, the never-committed guarantee, and the post-completeness gating; shape matches the existing `.changeset/` entries.

## Spec / design alignment

Spec requirements 1–24 traced to this batch are realized without contradiction. The three reason-string families are discriminable as the design's "load-bearing for tests" risk demands. The fail-soft, idempotency, read-from-main-root, match-only-off-names, closed-in-scope-subset, batched-summary, and confirm-before-write decisions from the design doc are all honored in `local-overrides.md`. No deviation from the approved plan or design was found; the plan and design themselves were not re-evaluated.
