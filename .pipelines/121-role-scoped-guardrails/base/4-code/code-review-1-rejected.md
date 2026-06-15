# Code Review

## Verdict: rejected

## Batch scope

Tasks reviewed:

- Task 1: Define the level and role-filter the selection rule in `load.md`
- Task 2: Capture the level during guardrail setup in `setup.md`
- Task 3: Narrow `code-writer.md` to the writer guardrail selection
- Task 4: Restructure `code-reviewer.md` — guardrails become their own step with fail-fast

## Summary

The batch is close to done. Tasks 1, 3, and 4 satisfy every per-task Acceptance criterion and the spec criteria they trace to: `load.md` now owns the level vocabulary and the two-filter selection rule with the empty-selection rule preserved; `code-writer.md` narrows to the writer selection with the R4 obligations unchanged in form and all cross-references accurate; `code-reviewer.md` promotes the guardrail run to its own step 4 carrying the runs-after bridge, the fail-fast permission ("may", with `skipped` recording), and the per-iteration approval guarantee, with the Checks template's three-way distinction and both renumbered cross-references (step-3 disclaimer → step 4; commit step → step 5) correct. Scope is confined to the four files; the doc agents are untouched and their wording stays literally true; each task is one commit in the project's commit format. Task 2 is structurally complete (fourth bullet, motivating clause, illustrative framing, validation block untouched) but its example table teaches the inverse of the decision criterion stated in the bullet directly above it, and its formatting breaks the file's table convention — both must-fix.

## Checks

<!-- One row per gate in the reviewer's selection. Result: pass | fail | skipped. -->

| Check | Command | Result |
| ----- | ------- | ------ |

The reviewer's selection is empty: `.rp.md` declares no Guardrails section, so no code-phase gates exist for either role. Run none and proceed.

## Behavior verification

The deliverable is instruction text, so verification means checking the shipped prose against each task's Acceptance and the spec/design. Evidence gathered:

- `load.md:26` defines the optional level (`writer`/`reviewer`, no level = both roles) with no storage-syntax coupling; `load.md:30` applies the role filter after the phase filter, states docs never consults level and that a leveled both-phase gate still runs for both doc agents, and preserves "empty selection means run none and proceed"; the committed-only line at `load.md:46` is unchanged; no malformed-level text was added (spec AC1–3, 9, 10).
- `agents/code-writer.md:13` reads the writer selection; step 5 (`:44-55`) is retitled "Run the writer guardrail selection" with the run-every/all-pass/no-bypass obligations and the two-question outcome model intact over the narrowed selection; the step-3 disclaimer (`:36`) still points at step 5 correctly; the blocker guideline (`:73`) names a gate in the writer's selection (spec AC4).
- `agents/code-reviewer.md:18` reads the reviewer selection; the step-2 guardrail bullet is gone with the seven judgment checks intact; new step 4 (`:37-45`) states once the selection obligation, the runs-after bridge, fail-fast as "may" with `skipped` recording, and the per-iteration stateless approval guarantee; the Checks template comment (`:71-74`) documents `pass | fail | skipped` and the every-gate-gets-a-row rule (absent row vs. skipped row vs. pass/fail row); the step-3 disclaimer points at step 4 and Commit and report names step 5; the Guidelines bullets are reconciled and the drift guard triggers only on an attempted gate (spec AC5–7).
- `agents/doc-writer.md` and `agents/doc-reviewer.md` are untouched; the batch diff touches only the four planned files plus pipeline artifacts (spec AC11).
- `setup.md:184` adds the fourth optional level bullet (code-applicable only, default both roles, with the motivating clause) and `setup.md:186-192` adds the illustrative three-row table; the validation block (`:196-212`) is unchanged (spec AC8) — but see the issues below.

## Issues

### Issue 1: The example table inverts the decision criterion it illustrates

**Task:** Task 2: Capture the level during guardrail setup in `setup.md`
**What's wrong:** The level bullet (`setup.md:184`) gives the owner's decision criterion: "Leveling an expensive suite `reviewer` runs it on the reviewer's side instead of on every writer commit." The table immediately below it levels `tests` as `writer` and `typecheck` as `reviewer` (`setup.md:190-191`) — the inverse assignment. In this project's own canon (spec and design: "Writers run cheap gates (lints, typechecks) on every commit; expensive suites run on the reviewer's side"), a typecheck is the archetypal cheap writer-side gate and the test suite the archetypal expensive reviewer-side one. The only concrete model the owner sees demonstrates the configuration the feature exists to avoid: the expensive suite on every writer commit and the cheap gate deferred to review.
**Where:** `skills/radical-pipelines/reference/conventions/setup.md:190-191`
**Expected:** The row assignments match the decision criterion — e.g. `typecheck` (or another canonically cheap gate) leveled `writer` and `tests` leveled `reviewer`, keeping the third both-phase row's blank Level cell as the unscoped anchor. Commands stay generic placeholders.

### Issue 2: Table cell not pipe-aligned, breaking the file's table formatting

**Task:** Task 2: Capture the level during guardrail setup in `setup.md`
**What's wrong:** The `typecheck` cell is written `| typecheck|` with no padding before the pipe, while every other table in `setup.md`, `load.md`, and the rest of the repo's markdown uses space-padded, column-aligned cells.
**Where:** `skills/radical-pipelines/reference/conventions/setup.md:191`
**Expected:** All cells in the example table padded and aligned consistently with the file's other tables.
