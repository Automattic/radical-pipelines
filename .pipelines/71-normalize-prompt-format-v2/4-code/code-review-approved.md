# Code Review — Normalize issue content into the standard intent format (phase-4 batch)

## Verdict

**Approved.** All 7 tasks of the code-plan are implemented faithfully, the spec's 15
requirements and every acceptance criterion hold against the rewritten step 4, the change is
confined to the planned scope, and the test suite (the repo's content-invariant TDD pattern)
genuinely exercises each task's Acceptance without brittle word-matching. `npm test` passes (99/99).

## Batch scope

- **Tasks reviewed:** 1, 2, 3, 4, 5, 6, 7 (the full code-plan; all committed).
- **Base ref:** `b28212a~1` (= 54f5d26, last phase-3 commit). **HEAD:** fa131db.
- **Files changed (exactly 3, as planned):**
  - `skills/radical-pipelines/reference/create-pipeline.md` (step 4 rewrite, +27/-5)
  - `scripts/test/create-pipeline-step4.test.mjs` (new, 814 lines)
  - `scripts/test/create-pipeline-neighbors.test.mjs` (new, 197 lines)
- `git diff --name-only b28212a~1..HEAD` lists ONLY those three; no neighbor file was edited.

## Summary

Step 4 ("Generate the initial intent") was rewritten in place from an 8-line open-ended block
into a cohesive ~23-line passage that (1) frames `intent.md` as always written in the canonical
format defined in `manage-issues.md` with an explicit title-as-H1 + `> Source:` template;
(2) hoists the asset/screenshot download once, before the branch, "on both paths"; (3) states the
three-clause skip gate as a declarative unordered conjunction whose holding *is* the definition of
"no transformation"; (4) adds an inline `**If all three hold**` skip arm (map verbatim, no
synthesis, no confirmation) and (5) an inline `**If any fails**` synthesis arm (read full picture
→ delegate section-mapping → faithfulness guardrail → iterate-until-approved confirmation loop),
both reaching the unchanged step 5 commit and writing no approval/review file. Step 5 and the
file intro are byte-identical to the base. No neighbor was edited; their coherence is locked by a
dedicated test suite.

## Checks

| Check | Command | Result |
|---|---|---|
| Full suite passes (the only gate) | `npm test` | PASS — `# tests 99 / # pass 99 / # fail 0` |
| New step-4 + neighbor suites pass | `node --test scripts/test/create-pipeline-step4.test.mjs scripts/test/create-pipeline-neighbors.test.mjs` | PASS — 77 tests, 0 fail (10 suites, one per task area) |
| Scope confined to 3 files | `git diff --name-only b28212a~1..HEAD` | Only create-pipeline.md + the two test files |
| No skill file but create-pipeline.md edited | `git diff --name-only b28212a~1..HEAD -- skills/ \| grep -v create-pipeline.md` | empty — no other skill file |
| No `gh` / `--json` in skill body | `grep -nE '\bgh\b\|--json\|gh issue\|gh pr' create-pipeline.md` | NO MATCHES |
| `gh`/`--json` appear only in negative test assertions | `grep -rnE '\bgh\b\|--json' <skill+2 tests> \| grep -v doesNotMatch \| grep -v 'must not'` | only in code comments; never in skill prose |
| Step 5 byte-unchanged | `git show b28212a~1:…create-pipeline.md` vs HEAD (step 5 slice) | identical 2-line commit step |
| File intro (line 3) byte-unchanged | `sed -n '3p'` vs base | identical |
| No `### Skip/### Synthesis` sub-heading or decision table (KD-1) | `sed -n '21,46p' \| grep -E '^####\|^### (Skip\|Synthesis)\|^\|'` | None — idiom is two inline `**If …**` bullets |
| Exactly two `**If …**` arms | `grep -c -E '^\s*-?\s*\*\*If '` | 2 |
| Load-bearing neighbor strings exist (no stale assertions) | `grep` for `Once the autonomous run starts`, `Draft, confirm, write`, `## The issue format`, `never silently substitute` | all present in the real neighbor files |
| No stale-artifact-anecdote language in skill/test | `grep -i 'legacy\|anecdote\|most-recent\|deviat'` | only a test code comment; skill prose grounds H1 in the rule itself |

## Behavior verification (prose deliverable — read end-to-end)

There is no executable app/CLI for a markdown instruction file; behavior verification is a
coherent end-to-end read of the rewritten step 4 against the spec's acceptance criteria. The
passage reads as one flow (template → hoisted assets → gate → skip arm → synth arm → step 5).
Each Given/When/Then acceptance criterion was traced:

- Canonical + no comments + no refs → skip arm: write, no confirm, commit. ✓ (lines 33, 39)
- Canonical + ≥1 comment → clause B fails → synth + confirm. ✓ (line 36 → 41–45)
- Canonical + URL/`#42`/`owner/repo#42` → clause C fails → read refs, synth, confirm. ✓ (line 37 → 42)
- Non-canonical body → clause A fails → restructure + confirm. ✓ (line 35 → 41)
- Goal-only body → "a body of `## Goal` alone passes" → skip. ✓ (lines 35, 29)
- Only @-mention/screenshot/repo-file link → clause C exclusions → all skip; assets still downloaded
  (hoisted, path-independent). ✓ (lines 37, 31)
- Correction request → revise, re-show, repeat until approval, then commit. ✓ (line 45)
- Synthesized result resembles body → still confirm (no escape hatch). ✓ (line 41)
- Either path → only `intent.md` (+assets) committed, no approval file, issue unmodified. ✓
  (lines 39/45; step 4 only reads the issue)
- Synthesis adds nothing; Goal stays an outcome; hypotheses labeled open. ✓ (line 44)
- Fork/resume → phase 0 not re-derived. ✓ (neighbor suite locks fork verbatim-copy + resume
  never re-runs phase 0)

### The ONE confirmation-gate model (req 5 + req 10) — scrutinized

The gate is a single declarative unordered conjunction. Line 33 states "all three holding *is*
what 'no transformation' means; do not add a separate check of whether the result transforms the
source" — this kills the second/contradictory gate (req 5). Line 41 makes the trigger the
*failing clause*, not a post-synthesis resemblance test: "A failing clause is the trigger… the
confirmation is owed even if the synthesized result happens to resemble the body. Never re-inspect
the result for resemblance to decide whether to skip; there is no escape hatch" (req 10). Skip is
gated solely by "all three hold"; there is no escape hatch and no post-synthesis resemblance test.
The step-4 test (lines 244–259, 683–714) enforces both directions: it requires the "no separate
transform check" disclaimer and forbids a *positive* `if … resembles … skip` directive within a
single sentence while explicitly permitting the correct negated framing — verified non-brittle
against the actual prose.

### Task-by-task acceptance + test coverage

- **Task 1 (framing + template).** "always" + "canonical" + "intent format" co-occur; format
  delegated to `manage-issues.md` (not re-listed); H1 = issue title, never a phase name; `> Source:`
  self-containment; four sections in prescribed order; Goal required, empties omitted, no `N/A`;
  Goal-only valid; old "Adapt the issue content" bullet removed. 10 tests, all genuine.
- **Task 2 (hoisted asset).** Asset-download line appears exactly once (a real discriminator — the
  count is 1; clause C's "attached assets … already handled by the asset step above" does not match
  the download+screenshot/asset filter), states "both paths," mechanism unchanged (Issues convention
  → `0-intent/` → relative path), positioned after the framing. 4 tests.
- **Task 3 (gate).** Single all-three conjunction, no evaluation order, "no transformation"
  definition + disclaimer; clause A four-point structural check delegating headings, title excluded,
  Goal-only passes, no tolerant matching (`## Directions to explore` fails); clause B strict
  zero-count via Issues convention, author/substance unassessed, mirrored excluded; clause C body-only
  scan, URL/`#N`/`owner/repo#N`/full-URL counted, @-mentions/`![…]`/repo-file links excluded, prose
  not regex. ~20 tests.
- **Task 4 (skip arm).** Bolded `**If all three hold**`, maps body unchanged under H1/`> Source:`,
  no synthesis, no confirmation, reaches commit via step 5 (no duplicated Commit-format convention),
  writes no approval file, incidental-formatting-is-not-a-transformation point present.
- **Task 5 (synth arm).** Bolded `**If any fails**`; full-picture read (body + **all** comments +
  one-level referenced content) with comments via Issues convention and external URLs via a
  web-fetch capability (no concrete tool — `gh`/`--json`/`WebFetch` all forbidden by assertion);
  one-level boundary stated positively; section-mapping delegated (no re-listed table); "not more
  authoritative than the body" note explicit; faithfulness guardrail kept; iterate-until-approved
  loop showing the full proposed `intent.md` (never diff-only), commit only on explicit approval,
  render→show→approve delegated to `manage-issues.md`; no approval file; resemblance no-escape-hatch.
- **Task 6 (convergence).** Step 5 asserted byte-for-byte equal to the canonical two-line step (no
  guard clause, no file list); Commit-format convention named exactly once (only in step 5); both
  arms hand off via "step 5"; line 3 byte-unchanged; no approval file on either path; optional header
  wording confined within step 4 (neighbors 3 and 5 locked).
- **Task 7 (neighbor coherence, no edits).** Dedicated suite locks the delegation targets in
  `manage-issues.md` (`## The issue format`, the four `**Goal/Constraints/Context/Assumptions**`
  headings, the input→section classification arrows, the content guardrails, the
  `Draft, confirm, write` render→show→approve step), the `work-on-an-issue.md` pointer, both
  workflow files' "Already in place" + after-run-start scoping of "no questions", the
  `pipeline-versioning.md` single-file phase-0 predicate + byte-identity shared-root invariant, the
  `fork-pipeline.md` verbatim copy, `resume-pipeline.md` never re-running phase 0, and no `gh`/`--json`
  or `# Prompt` leakage into any neighbor. Confirmed these assertions match the real current neighbor
  text (not stale strings).

### Task 6 dedup decisions (lead's specific flag)

Traced both original step-4 bullets into the rewrite:

- **Self-containment** (original `:28`) was folded into the `> Source:` attribution bullet (line 28):
  "stating the phase 0 subfolder is self-contained, so once committed agents do not need to open the
  issue or reach back to its source to understand it." It lives in the shared scaffolding, so it
  applies on **both** paths. Invariant preserved.
- **Faithfulness guardrail** (original `:26`) was folded into the synthesis arm (line 44) and
  slightly strengthened (adds "design"; adds Goal-as-outcome + hypotheses-labeled-open). Correct
  placement: faithfulness is a synthesis concern — the skip path maps verbatim, so there is nothing
  to be unfaithful about. The guardrail still applies on the synthesis path. No invariant dropped.

### KD-8 H1-template grounding (design reviewer's non-blocking flag)

The code grounds the title-as-H1 template in the rule itself — "An **H1 equal to the issue title** —
never a phase name (not `# Intent`, not `# Prompt`)" (line 27) — i.e. in spec req 1's title-as-H1
mandate, with no reference to any stale on-disk artifact anecdote. The only "legacy" mention is a
test code comment explaining the guard. Flag resolved.

## Issues

None. The batch is approved.
