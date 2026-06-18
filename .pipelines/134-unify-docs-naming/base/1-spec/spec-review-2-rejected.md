# Spec Review — Rejected (iteration 2)

**Verdict:** Rejected
**Spec reviewed:** `1-spec/spec.md` (commit `c62cbdd`)
**Reason:** The acceptance-criteria absence-check (AC #5) still does not test all of Requirements 3–5. Iteration 1's fix correctly added the trailing-`s` plural inflection (`writers?`/`reviewers?`/`tasks?`), but the AC #5 patterns are **case-sensitive** on the leading token, so three in-scope, capitalized occurrences survive a passing AC #5. The spec's primary "done" test is therefore still satisfiable with the change incomplete — the same failure class as iteration 1, on a different facet of the same patterns.

---

## Blocking finding — AC #5 misses three capitalized in-scope occurrences

The four AC #5 patterns anchor the leading token as lowercase `doc` (`(?<!design-)\bdoc-…`, `\bdoc tasks?\b`). Two patterns — P2a (`(?<!Design )\b[Dd]oc [Pp]lan\b`) and P2b (`(?<!Design )\bDoc (Writer|Reviewer)\b`) — already tolerate the capital form. But P1 and P2c do not, so a capitalized leading `Doc` slips through. Three real, in-scope occurrences are missed:

1. **`Doc-writers`** (capital `D`, hyphen) — `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md:36`
   "…Wait for the doc-writer to commit before launching the next task. **Doc-writers** share the pipeline branch's single working tree…"
   Missed by P1 (lowercase `\bdoc-`). This is the *exact* occurrence the iteration-1 rejection listed under 5a, bullet 1; the iteration-1 fix addressed its plural `s` (`writers?`) but not its capital `D`.

2. **`Doc-plan`** (capital `D`, hyphen) — `agents/doc-reviewer.md:32`
   "- **Doc-plan adherence** — no scope creep beyond `doc-plan.md`…"
   Missed by P1 (lowercase `\bdoc-`) **and** by P2a (which requires a *space*, `[Dd]oc [Pp]lan`, not a hyphen). Genuinely uncovered by every pattern. Requirement 4/5 target: `Docs-plan adherence`.

3. **`Doc tasks`** (capital `D`, spaced) — `skills/radical-pipelines/reference/assisted-phases/3 - plan.md:27`
   "…Code tasks: observable behavior, scoped to the task. **Doc tasks**: drift-resistant coverage and outcomes…"
   Missed by P2c (lowercase `\bdoc tasks?\b`). Requirement 5 target: `Docs tasks`.

All three are unambiguously the documentation-phase concept (no `design-doc` context on any of the three lines), so all three are in scope under Requirements 3–5, which already name the plural targets ("Docs-writers", `docs-plan.md`/the docs-plan concept, "docs task"/"docs tasks").

**Consequence (same as iteration 1):** an implementer could fix everything the four patterns catch, leave these three capitalized forms singular, run the AC #5 searches, get **zero matches**, and conclude "done" — while Requirement 5 (which explicitly promises "Docs-writers") and the docs-plan/docs-tasks naming are still violated. The acceptance criterion does not fully test the requirements it is meant to test.

**Empirical confirmation (worktree at `c62cbdd`):**
- Full case-insensitive sweep of in-scope concept tokens, filtered to those starting with a capital `D`:
  `Doc Plan` (9), `Doc plan` (1) — **covered** by P2a; `Doc-plan` (1), `Doc-writers` (1), `Doc tasks` (1) — **NOT covered** by any of the four patterns.
- Direct test: feeding `Doc-writers`, `Doc-plan adherence`, and `Doc tasks: drift` to all four AC #5 patterns yields **no match** from any pattern.

### Required fix

Make the leading-token match case-insensitive across **all four** AC #5 patterns (today only P2a/P2b tolerate capital `Doc`). Equivalent options:

- Add `-i` to each `grep -roP` (and extend the lookbehinds to cover both cases, e.g. `(?<![Dd]esign-)` / `(?<![Dd]esign )`, so `Design-doc`/`Design Doc` stay excluded under `-i`); or
- Replace the lowercase leading literals with case-flexible classes in P1 and P2c, matching what P2a already does: `(?<![Dd]esign-)\b[Dd]oc-(…)\b` and `\b[Dd]oc tasks?\b`, and broaden P1's alternation so the hyphenated `Doc-plan` (no role suffix) and `Doc-writers` are caught (the current `plan` and `writers?` alternatives already cover the suffixes; only the leading-case anchor is the gap).

After adjusting, re-confirm the patterns still:
(a) return the catalogued occurrences before the change (now including the three capitalized ones);
(b) return zero after the change;
(c) do **not** match `design-doc-*`/`Design Doc …` (verify the `(?<![Dd]esign[- ])` anchoring holds under case-insensitivity — `design-doc-writer`/`design-doc-reviewer` must stay excluded);
(d) do **not** match already-plural `docs-*`/`Docs …` forms.

A `grep -i`-based variant was verified to catch all three missed occurrences while preserving the design-doc and already-plural exclusions.

Note: like iteration 1, this is a defect in the **acceptance criterion's testability**, not in the requirements' intent. Requirements 3–5 already name the plural/capitalized targets correctly; only the grep meant to verify them is still too narrow (now on the case axis rather than the inflection axis).

---

## What is now sound (for the record)

The iteration-1 blocking finding is **resolved on its own terms**: P1 now reads `…|writers?|reviewers?)\b` and P2c reads `\bdoc tasks?\b`, so the lowercase plural inflections `doc-writers` (3 lowercase occurrences) and `doc tasks` (3 occurrences) are caught. Verified:

- P1 (`(?<!design-)\bdoc-(plan-writer|plan-reviewer|plan-review|plan|writers?|reviewers?)\b`) now matches lowercase `doc-writers` (confirmed against the 3 lowercase occurrences in `doc-plan-reviewer.md:32`, `doc-plan-writer.md:6`, `doc-reviewer.md:103`).
- P2c (`\bdoc tasks?\b|…`) now matches lowercase `doc tasks` (confirmed against `assisted-phases/3 - plan.md:118,177` and `doc-plan-reviewer.md:28`).

Also re-verified and accurate:

- **Design-doc protection holds.** P1 matches nothing inside `agents/design-doc-writer.md`/`design-doc-reviewer.md`/`design-doc-analyst.md`/`design-doc-researcher.md`; the matched-string set for P1 is exactly `{doc-plan, doc-plan-review, doc-plan-reviewer, doc-plan-writer, doc-reviewer, doc-writers, doc-writer}` — no `design-` contamination.
- **No `docs-*` false positives.** The widened P1 still does not match any already-plural `docs-*` form.
- **The match-vs-line caveat** (count matches with `-o`, not lines, because `setup.md:48` and `doc-reviewer.md:115` each carry an in-scope `doc-plan.md` and a protected `design-doc.md` on one line) remains correct and is preserved in the AC.
- **Requirements 1–4, 6, 7, 8** and the **positive presence check** (AC: `agents/docs-writer.md` exists with `name: docs-writer`, etc.) rest on facts already verified in iteration 1 and unchanged here; the naming rule (leading noun → `docs`, suffix preserved) is stated correctly and consistently. The **Out of Scope** section is correct.

Once the AC #5 patterns are made case-insensitive on the leading token (catching `Doc-writers`, `Doc-plan`, and `Doc tasks` while keeping the `design-doc` and `docs-*` exclusions), the spec is approvable. No other gaps were found in an exhaustive case-and-inflection sweep of the in-scope trees.
