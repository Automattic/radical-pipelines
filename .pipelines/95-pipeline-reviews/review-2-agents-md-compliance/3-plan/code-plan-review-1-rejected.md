# Code Plan Review — Rejected (iteration 1)

Verdict: **rejected** — one material finding in task 10's CI verification step. Everything else in the plan was verified against the spec, the design doc, and the current working tree and is accurate; the fix is small and localized.

## What was checked and passed

- **Coverage.** Spec requirements 1–9 map one-to-one to tasks 1–9; requirements 10–13 and acceptance criteria 10–11 are carried by task 10's three verification layers. No requirement or acceptance criterion is unaddressed; the out-of-scope list (README:167 stale pointer, `agents/`, `.pipelines/`, `website/`, `.rp.md`) is respected.
- **Anchor fidelity.** Every quoted pre-edit anchor in tasks 1–9 was checked against the current files and matches exactly: `fork-pipeline.md:34/38/43`, `review-pipeline.md:14/16/18/29/31/48`, `pipeline-versioning.md:51/87/115`, `work-on-an-issue.md:40`, `autonomous-workflow.md:37`, `.changeset/pipeline-reviews.md` body.
- **Wording fidelity.** Every replacement string matches the design doc's decided wording verbatim (Decisions 1–9), including the task-6 "review's" → "run's" normalization and the task-9 changeset body.
- **Untouchables.** The plan correctly fences `README.md` (incl. line 157), the `4 - code.md:35` / `5 - docs.md:36` parentheticals (verified present and as quoted), the canonical **Reviewer base ref** rule at `pipeline-versioning.md:21–28`, and `intent-format.md`.
- **Grep expectations.** Each deletion-target sentence ("shows no run chain", "The rows are unchanged", "sharpest discriminator", "never unilaterally redirects", "reviews are not nodes", "the prior-run tip, per the") occurs **only** at its named edit site in the current tree, so task 10's "expect no hits" checks are sound post-edit. The surviving canonical statements (`pipeline-versioning.md:65`, the line-115 sentence-1 gloss) do not match those patterns.

## Finding (must fix)

### Task 10, layer 3 misstates the Changeset Gate mechanism, leaving the gate's changeset checks unrun

The plan says:

> Run `npm ci` then `npm test` (which runs `validate-changesets` and `changeset status`). Expect green: … neither `scripts/validate-changesets.mjs` … nor `changeset status` … can break on the body reword.

This is factually wrong about the repository. `package.json` defines `"test": "node --test 'scripts/test/**/*.test.mjs'"` — `npm test` runs only the node test suite and does **not** invoke `validate-changesets` or `changeset status`. The actual gate (`.github/workflows/changeset-gate.yml`) runs **four separate steps**: `npm ci`, `npm test`, `node scripts/validate-changesets.mjs`, and `npx changeset status --since=origin/<base>`. Both the spec (requirement 12) and the design doc ("Dependencies") list them as separate components; the plan collapsed them into one incorrectly.

Why this is material: task 10 is the only safety net for this change (there is no prose oracle), and the two steps the plan's commands skip are exactly the only automated checks the task-9 changeset edit could conceivably affect. An implementer following the plan verbatim — which the plan itself mandates — would run only `npm ci && npm test`, never exercise the changeset validators locally, and report acceptance criterion 11 ("the Changeset Gate CI … passes") as verified when the relevant checks were not run.

**Fix:** in task 10 layer 3, replace the parenthetical claim with the gate's actual four steps, run locally as:

1. `npm ci`
2. `npm test`
3. `node scripts/validate-changesets.mjs`
4. `npx changeset status --since=origin/trunk` (the workflow uses `--since=origin/<PR base ref>`; for PR #106 the base is `trunk`)

The structural argument for why these stay green (front matter byte-identical, body non-empty, `scripts/test/**` untouched) is correct and can stay as-is.

## Notes (no action required)

- Task 10's `git -C <worktree> diff --stat` check implies verification runs on the uncommitted working tree (before the task-10 commit). That ordering is consistent with the task's acceptance ("The change is committed … " as the final step) — fine as written, just sequence the commit after the checks.
