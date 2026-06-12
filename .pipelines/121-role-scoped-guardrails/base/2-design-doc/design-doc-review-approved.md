# Design Doc Review

## Verdict: approved

## Summary

The design doc is complete, sound, and aligned with the binding spec. All 11 acceptance criteria map to a concrete, file-grounded decision (D1–D4), the four-file confinement demanded by AC11 is justified per non-edit rather than asserted, and every claim about the current state of the four touched files was verified against the live tree and is accurate.

## What was checked

### Grounding (section 3 vs. the live tree)

Every cited location matches the actual files:

- `load.md` — Guardrails ¶1 definition (:26), absent-is-valid ¶2 (:28), selection rule ¶3 (:30), committed-only line (:46), and the file's silence on malformed phase targets. All confirmed.
- `setup.md` — three-field "Capture per gate" list (:179-183), "None is valid" (:185), command-execution-only validation block (:187-203) with no level-relevant text. Confirmed.
- `code-writer.md` — guardrail touchpoints at :13, :36 (disclaimer, unchanged), :44-55, :73. Confirmed.
- `code-reviewer.md` — touchpoints at :18, :32, :36, the `Check | Command | Result` template (:60-64), and the two Guidelines bullets (:97, :98-101). Confirmed there is no existing fail-fast/early-exit semantics and no `skipped` Result value; the step ordering is presentational today, as the design states.

### Spec alignment (all requirements and ACs)

- **R1/AC1** — D1's ¶1 sentence defines the level (`writer`/`reviewer`, absent = both); the committed-only line at `load.md:46` scopes the whole declaration, so the level inherits it with zero edits. Correct.
- **R2/AC2** — D1's ¶3 role filter (writer = writer+unscoped, reviewer = reviewer+unscoped, after the phase filter) entails neither role runs the other's leveled gates.
- **R3/AC3** — the docs-never-consults-level sentence, including the both-phase-gate case, lives in the selection rule, exactly where the AC requires it.
- **R4/AC4** — D3 narrows only the set the writer's obligations range over; "every gate, exactly as written, all pass before commit, no bypass" survives verbatim in form.
- **R5/AC5** — D4 makes the ordering load-bearing (judgment checks → behavior verification → guardrail step) with the bridging sentence resolving the spec's "judgment-based checks" spanning two file steps. Fail-fast is a permission ("may"), uniform over the whole selection, matching the spec.
- **AC6** — the Checks-table contract delivers the three-way distinction: present row with `pass`/`fail`, present row with `skipped` (command shown, not run), absent row = forgotten.
- **R6/AC7** — the approval guarantee (every selection gate run and passed in the same iteration) is stated together with fail-fast as the two halves of one rule; per-iteration with no cross-iteration state, matching the fresh-per-batch reviewer.
- **R7/AC8** — D2's fourth capture bullet (code-applicable gates only, default unscoped) plus the one-clause motivation, in register with the capture step's existing motivational prose. Validation text correctly untouched (verified level-agnostic).
- **R8/AC9** — absent = both is a load rule decoupled from serialization, so no Guardrails section, no Level column, and a blank cell all resolve identically.
- **R9/AC10** — no malformed-level text; verified `load.md` is likewise silent on unrecognized phase targets, so the mirroring claim is accurate.
- **AC11** — section 6 justifies each non-edit. Verified against `4 - code.md` (guardrails are not in the reviewer launch payload; agents self-read `.rp.md`) and the doc agents' phase-only wording, which stays literally true.

### Soundness probes

- **Skipping writer-leveled gates at review (§4.3)** — verified against `4 - code.md:34`: code-writers are strictly sequential on the pipeline branch's single working tree, so the review-time HEAD is the last writer's commit, a tree against which that writer ran the full writer selection. The argument holds, including on rejection iterations.
- **Drift guard vs. fail-fast** — a skipped gate is never attempted, so fail-fast cannot manufacture a false drift blocker; the design states this and it is consistent with the blocker's trigger condition in both agent files.
- **Empty selection** — the existing run-none-and-proceed rule is preserved over the role-filtered selection; the approval guarantee is vacuously satisfiable.
- **Serialization decision** — the spec deferred the storage syntax to design; the design decides it (prose field, one illustrative `Name | Command | Phase | Level` table, recommended not mandated), consistent with the established Guardrails-shape precedent and with the skill's no-parser stance.

## Non-blocking notes

- The research record adopted the drift-guard precision tweak ("a gate of your selection") explicitly for both agent files; the design doc states it explicitly only in D3 for `code-writer.md`, while D4 says the reviewer's drift-guard prose needs "no change beyond the upstream selection phrase". Substance is identical either way; the plan phase should just word the reviewer's blocker text consistently with whichever selection phrasing it lands on.
- A leveled both-phase gate will appear in `.rp.md` with a Level value the doc agents never consult; the authoritative inert-in-docs rule lives in `load.md` per AC3/AC11. This residual reading-path asymmetry is mandated by the spec's confinement, not a design defect — noted only so the docs phase can consider it when updating prose.
