# Code Review — Agent-scoped guardrails (APPROVED)

_Pipeline `121-role-scoped-guardrails`, review run `review-1-agent-scoped-guardrails`. Batch: T1–T6. Base ref diffed: `278d5e97bd1aeabb628c94885caf6489abf267ce..HEAD`. Prose-only change to this repo's own skill; no test suite, no project guardrails — acceptance verified by reading the resulting Markdown._

## Verdict: approved

Every task's Acceptance bullets are met, spec AC1–AC13 are satisfied, and the feature change stays within exactly the six in-scope files. No guardrail-dimension `phase`/`level`/`leveled`/`unscoped`/`code-phase`/`docs-phase` phrasing remains; the canonical selection phrase is used consistently; the doc-reviewer 6-step restructure is internally consistent.

## Scope confinement (AC13)

Non-`.pipelines` files changed since base: the six in-scope files plus `.rp.md`. The six feature commits are one-per-task, authored `(code-writer)`, each touching exactly its one owned file:

- `d96fa28` load.md (T1) · `9873eaa` setup.md (T2) · `4ff6798` code-writer.md (T3) · `b9aa227` code-reviewer.md (T4) · `9fe4a8a` doc-writer.md (T5) · `c1f7c60` doc-reviewer.md (T6)

The `.rp.md` change (three commits, all authored `(orchestrator)`: `cf28c47`, `4a00330`, `cc629d4`) is pipeline run-configuration — model-tier reassignments for the agents running this pipeline — not a guardrails-feature edit. It does not touch the Guardrails surface (`.rp.md` declares no guardrails). It is outside the AC13 "convention and agent edits span exactly six files" claim, which scopes itself to feature edits and explicitly leaves `.rp.md` untouched by the feature. Not a scope violation.

## Per-task acceptance

- **T1 (load.md).** Guardrails section is four paragraphs. ¶1 (`:26`) defines the optional agents field, states "a guardrail that names no agents runs for every gate-running agent," decoupled from serialization ("whether no Agents column exists or an Agents cell is blank … all agents"); the phase-target and level sentences are deleted; "mandatory within the phase(s)" rephrased to "mandatory for every gate-running agent that selects it." ¶2 (`:28`) byte-identical to base. ¶3 (`:30`) enumerates exactly the four gate-running agents (load-bearing), states name-membership selection, "Phase plays no part," the empty-selection rule, and the inert forward-declaration with no error/blocker/warning. ¶4 (`:32`) states both archetypes + the commits-vs-reviews mapping rule, carries no Checks-table vocabulary/step mechanics and no forward pointer. Loader-table row (`:22`) drops the "code/doc phases must pass" phrase. Committed-only line unchanged (moved `:46`→`:48` by the added ¶4 only; content identical). AC1–AC6 met.
- **T2 (setup.md).** "Capture per gate" list is exactly three bullets (name, exact command, optional agents); phase+level bullets collapsed. Agents bullet: asked for every gate, names the four agents, surfaces the "unset = every gate-running agent, doc agents included" default, carries the "name only `code-reviewer`" criterion; the "ask only for code phase(s)" conditional dropped. Section intro re-worded to drop phase. Example table is `Name | Command | Agents` with rows typecheck→`code-writer`, tests→`code-reviewer`, lint→blank, under the unchanged illustrative-not-mandated framing. "None is valid" line and the full validation block (`:195`–`:211`) unchanged. AC11 met.
- **T3 (code-writer.md).** Step 1.2 (`:13`) reads the canonical phrase. Step 5 title and run-every/all-pass-before-commit/no-bypass obligations and the two-question outcome model unchanged in form. Guidelines blocker bullet (`:73`) re-worded to "a gate of your selection." No `code-phase`/`leveled`/`level`/`or unscoped` remains. AC7 met.
- **T4 (code-reviewer.md).** Vocabulary re-key only at the three selection-naming spots (`:18` read, `:41` step-4 run ¶, `:110` Guidelines bullet) to the canonical phrase. Dedicated step 4 (bridge naming step-2 review + step-3 behavior verification / run / fail-fast-skipped / approval-stateless), Checks template + absent-vs-skipped comment block, and Guidelines two-question + drift-guard bullets unchanged in form. Step 3 still "Behavior verification." AC8 met.
- **T5 (doc-writer.md).** Step 3 (`:35`) re-keyed to "a guardrail in your selection." Step 4 retitled "Run the writer guardrail selection," intro and obligations re-keyed to the canonical phrase, two-question outcome model re-keyed, doc-specific empty-selection note ("the step-3 accuracy verification is your only validation; proceed") preserved. Guidelines blocker (`:67`) re-keyed. No `docs-phase`/`tagged for documentation` selection phrasing remains. AC9 met.
- **T6 (doc-reviewer.md).** Freshly restructured from the pre-base 5-step shape (trunk: 5 steps, 8 step-2 bullets, verified) to the 6-step reviewer archetype: 1 Gather context (gains the guardrail-read item at `:20`, before diff inspection) → 2 Review the changes (guardrail bullet removed; 7 judgment bullets remain, verified) → 3 Accuracy spot-check (unchanged) → 4 Run the reviewer guardrail selection (NEW; four ¶, bridge names **both** the step-2 review and the step-3 accuracy spot-check) → 5 Write the review → 6 Commit and report. Step numbering consistent; commit/report references "step 5." Checks comment block cloned with Result ∈ {pass, fail, skipped} and the absent-vs-skipped distinction. Accuracy spot-check review-template section retained. Guidelines reconciled to three bullets (back-reference guardrail bullet keeping the doc-specific empty-selection note; standalone two-question bullet with three re-keyed sub-cases; rewritten blocker bullet). Selection always named by agent, never "leveled." AC10 met.

## Spec AC verification

AC1–AC6 → T1 ✓. AC7 → T3 ✓. AC8 → T4 ✓. AC9 → T5 ✓. AC10 → T6 ✓. AC11 → T2 ✓. AC12 (changeset reword) is a docs-phase obligation, no code task — correctly absent here. AC13 (exactly six feature files) ✓.

## Grounding-error check

The §3.4/§3.5 design grounding (code-reviewer already in the dedicated-step reviewer shape with `leveled` phrasing at `:18`/`:41`/`:110`; code-writer already step-5-titled with `leveled` only at `:13`) was verified against the base ref `278d5e9` and matches. The realized edits re-keyed exactly those occurrences and changed no structure. The flagged prior-phase grounding concern does not manifest in the realized edits.

## Forbidden-phrasing scan

A scan of the six files for `leveled`, `unscoped`, level-as-dimension, `code-phase guardrail`, `docs-phase guardrail`, `phase(s)`, `both-phase`, `code/doc` returned no guardrail-dimension hits (only unrelated words like "project-level" and legitimate pipeline-phase references such as "phase 4" / "prior phase" / "Docs phase ownership"). The canonical phrase "the guardrails that name `<agent>` or name no agents" is used consistently across all five agent-naming files; load.md ¶3 states the generic form ("the guardrails that name it plus the guardrails that name no agents").
