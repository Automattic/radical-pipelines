# Code Plan: Reconcile docs-naming with the merged trunk

## Overview

This is a prose-only identifier/wording rename with no runtime or behavior change. Trunk added two new skill reference files the base run never saw — `skills/radical-pipelines/reference/guardrails.md` and `skills/radical-pipelines/reference/conventions/passing.md` — and they still spell the documentation-phase concept in the singular. The work is to pluralize the **10** remaining singular documentation-phase concept tokens in those 2 files, all `doc` → `docs`, via a single anchor-relaxed `perl` substitution that mirrors the acceptance oracle. The documentation-phase concept is the pipeline's phase-5 documentation work and the phase-3 plan that feeds it (the `docs-*` agents and the `docs-plan.md` artifact); it is distinct from the phase-2 `design-doc` concept and from the English word `document(ation)`, both of which stay singular by design and are protected by the pattern. The substitution is the only step, so there is a single task.

## Tasks

### Task 1: Pluralize the 10 documentation-phase concept tokens in the 2 new skill reference files

- **Goal:** Convert the 10 surviving singular documentation-phase concept tokens (`doc` → `docs`) in the two trunk-introduced skill reference files, using the design's single anchor-relaxed substitution that mirrors the acceptance oracle. Leave every protected form (`design-doc`, `document(ation)`, already-plural `docs`) and every `code-*` token untouched.

- **Files to change:**
  - `skills/radical-pipelines/reference/guardrails.md` (5 tokens)
  - `skills/radical-pipelines/reference/conventions/passing.md` (5 tokens)

- **Changes:** Apply the design's single substitution — the acceptance oracle's pattern plus a capture/replacement, with the trailing anchor relaxed (the oracle drops its trailing `[- ]`; the substitution drops its corresponding trailing `(?=[- ])`) in lockstep — over exactly the two named files:

  ```sh
  PAT='(?<![Dd]esign[- ])\b([Dd]oc)(?![Ss])(?!ument)\b'
  for f in skills/radical-pipelines/reference/guardrails.md \
           skills/radical-pipelines/reference/conventions/passing.md; do
    perl -i -pe "s/$PAT/\${1}s/g" "$f"
  done
  ```

  The replacement must be written `\${1}s` so the shell passes a literal `$1` to perl (the design's documented failure mode: an unescaped `${1}` lets the shell drop the capture, corrupting e.g. `` `doc-plan-writer` `` into `` `s-plan-writer` ``). Relaxing the trailing anchor is required and load-bearing: with the anchor in place the lookahead fails on the trailing backtick of `` `doc` `` (`passing.md`), leaving that straggler singular; dropping it in both the oracle and the substitution keeps them mirror images and fixes all 10 tokens by construction, adding exactly one scope-wide match (the backtick) and zero elsewhere. The 10 expected results, by file:

  - `skills/radical-pipelines/reference/guardrails.md`:
    - agent roster `doc-writer, doc-reviewer` → `docs-writer, docs-reviewer`
    - phrase `doc-run gates by the doc plan` → `docs-run gates by the docs plan` (2 tokens — the compound `doc-run` and the spaced phrase `doc plan`)
    - artifact `doc-plan.md` → `docs-plan.md`
  - `skills/radical-pipelines/reference/conventions/passing.md`:
    - agent roster `` `doc-writer` ``, `` `doc-reviewer` `` → `` `docs-writer` ``, `` `docs-reviewer` ``
    - planning agents `` `doc-plan-writer` `` and `` `doc-plan-reviewer` `` → `` `docs-plan-writer` `` and `` `docs-plan-reviewer` ``
    - backtick-bounded `` `doc` `` (in `` for the scoped gates of `doc` agents ``) → `` `docs` ``, making it parallel to the line directly above it (`` for the scoped gates of `code` agents ``)

  No other files are touched. No renames (`git mv`) are performed — the four `docs-*` agent files already exist post-merge. No single-document rewords are performed — neither in-scope file contains a single-document "doc"; all 10 tokens are concept references requiring only pluralization.

- **Depends on:** none

- **Traces to:** Spec requirements 1, 2, 3; all spec Acceptance Criteria (In-scope fix, Acceptance oracle → 0, Corruption invariants, Positive existence, `pr-description.md` exclusion load-bearing). Design "Mechanism: one substitution over the 2 named files" and "Central decision: relax the trailing anchor in lockstep".

- **Acceptance:**
  - The Option-B acceptance oracle reports **0** over the in-scope tree (it reported 10 before — 5 in `guardrails.md`, 5 in `passing.md`):
    ```sh
    git ls-files | grep -vE '^\.pipelines/' | grep -vE '^(CHANGELOG\.md|pr-description\.md)$' \
      | while IFS= read -r f; do grep -oiP '(?<![Dd]esign[- ])\b[Dd]oc(?![Ss])(?!ument)\b' "$f"; done | wc -l
    ```
  - In `skills/radical-pipelines/reference/guardrails.md` and `skills/radical-pipelines/reference/conventions/passing.md`, every documentation-phase concept token is plural: `docs-writer`, `docs-reviewer`, `docs-run`, `docs plan`, `docs-plan.md`, `docs-plan-writer`, `docs-plan-reviewer`, and the backtick `` `docs` `` (`` for the scoped gates of `docs` agents ``).
  - In those same two files, every `code-*` token is byte-identical to before (no `code` → `codes`): `code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `code-run`, `code plan`, `code-plan.md`, the three `code-*` agents on `passing.md`, and the `` `code` `` line.
  - Over the same in-scope file set (all tracked except `.pipelines/`, `CHANGELOG.md`, `pr-description.md`), `docss` returns **0** matches and `design-docs` returns **0** matches.
  - The four base-run agent files `agents/docs-plan-writer.md`, `agents/docs-plan-reviewer.md`, `agents/docs-writer.md`, and `agents/docs-reviewer.md` all still exist, each with its matching `name:` frontmatter.
  - With *only* the `pr-description.md` exclusion dropped from the oracle (excluding `.pipelines/` and `CHANGELOG.md` only), the oracle returns **2** — the two frozen `doc-run` / `doc plan` stragglers inside `pr-description.md` — confirming the exclusion, not a fix, accounts for them and that `pr-description.md` is intentionally left untouched.
  - No file outside the two named in-scope files is modified.

## Guardrail scopes: None

This project defines no guardrail gates, so there are no scoped gates whose `{scope}` this plan must supply.

## E2E test plan

None. This is a documentation-prose identifier/wording rename with no runtime, UI, or end-to-end user flow — there is no application behavior to drive. Acceptance is the deterministic oracle/invariant suite above (the Option-B match-counting oracle landing on 0, the corruption invariants `docss`/`design-docs` at 0, the four `docs-*` agent files still present with matching frontmatter, the `pr-description.md`-exclusion load-bearing check returning 2, and the byte-identical `code-*` tokens), not an e2e flow.
