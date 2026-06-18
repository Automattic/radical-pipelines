# Design Doc Review: Unify the documentation concept on plural "docs" — APPROVED

**Verdict:** Approved (terminator).
**Design doc under review:** `2-design-doc/design-doc.md` (committed `91caeba`).
**Inputs:** approved spec `1-spec/spec.md` (re-approved `370c84b`); design research `2-design-doc/design-doc-research.md` (`89f47f5`).
**Reviewer:** fresh `design-doc-reviewer`, phase 2.

## Summary

The design doc describes the rename as a fixed three-step procedure — (1) four manual Requirement-8 rewords, (2) one anchored case-preserving `perl` substitution over the in-scope files via a null-safe `find -print0` loop, (3) four `git mv` renames — proven complete by a per-match grep oracle going 164 → 0. I did not rubber-stamp the doc's "dry-run-verified" claim: I re-ran the complete recipe end-to-end on a scratch copy of the in-scope trees and tested the `git mv` step non-destructively in the live worktree. Every load-bearing claim holds. The design is complete, sound, internally consistent, and faithfully aligned with the approved spec. No blocking issues.

## Independent end-to-end verification

I copied the six in-scope paths (`skills agents .rp.md website .changeset README.md`) to a scratch tree, ran Steps 1–2 verbatim from the doc, simulated Step 3's renames, and ran the full acceptance suite. The `git mv` `R`-staging claim I tested in the real worktree and reverted (tree confirmed pristine afterward).

### The oracle and corruption invariants
- Baseline oracle (six paths) — **164** (160 across the five non-README paths + 4 README:112 agent-name tokens). Matches the doc.
- After Step 1 (four rewords) — **157** spec-scope / **161** with README. Matches the doc's "after step 1 the oracle reads 157".
- After Step 2 (substitution) — **0** in both scopes. Matches.
- After a *second* Step 2 run (idempotency) — oracle **0**, `docss` **0**, `design-docs` **0**. The `(?![Ss])` guard makes re-running a clean no-op, as claimed.
- `docss` over-pluralization — **0**. `[Dd]esign[- ]docs` corruption — **0**. Both the scope-independent invariants the doc relies on.
- `design-doc`/`Design Doc` — **239 → 240** (the single Req-8 disambiguation in `design-doc-reviewer.md`; no `design-doc` token consumed). `document`/`documentation` — **118 → 118** (unchanged). Matches the doc's non-corruption counts exactly.

### The four rewords (Step 1) landed verbatim
"the design doc faithfully", "who the surface is for", "a reference page may", "a reader-facing page" — all four present; all four old strings gone. The fourth ("a reader-facing doc") is a bare end-of-token `doc` the oracle never matched, so it does not move the count, exactly as the doc and research state.

### Per-match independence and the enumerated edge cases
Each shared-line edge case behaved as the doc/research predicted:
- `.changeset/agent-scoped-guardrails.md:5` — fires on exactly `doc-phase`, `doc-writer`, `doc-reviewer` → `docs-phase`/`docs-writer`/`docs-reviewer`; the bare `code-` before "or" and the `code-writer`/`code-reviewer` names untouched.
- `setup.md:48` — only `doc-plan.md` → `docs-plan.md`; `design-doc.md` (lookbehind) and `code-plan.md` untouched.
- `doc-reviewer.md:3` description — `doc-writer`/`doc plan` pluralized; the trailing "design doc" untouched (lookbehind).
- `5 - docs.md` Mermaid — `B[Docs Writer]`, `D[Docs Reviewer]`, edge `commits docs updates`. Produced by Step 2 as ordinary `[D]oc␣`-led tokens; no manual Mermaid step needed (Req 4 satisfied).
- `website/demo.js` — only agent/artifact-name strings changed; the five `document.*` DOM calls intact (zero `docsument`), confirming the `(?!ument)` guard.
- `README.md:112` — the four concept agents pluralized; `spec-*`, `design-doc-*`, `code-*` profiles untouched. README's already-plural mentions (line 32 "Docs", line 157 `docs-summary.md`) untouched.

### Renames (Step 3) and the discovery contract
- `git mv` of the four files (run live, reverted) stages clean renames; with the content edit applied first it stages as `RM`, as the research shows. History-preserving, auditable.
- Post-rename: all four of `agents/docs-{plan-writer,plan-reviewer,writer,reviewer}.md` exist with a matching `name:`; all four old `doc-*` files are gone (positive-existence and old-names-gone checks both pass).

### Completeness of the file set
The substitution changed exactly **17 files** (4 concept agents + 2 code-plan agents + `design-doc-reviewer.md` for the step-1 reword + 6 skill files + `.rp.md` + `website/demo.js` + `README.md` + `.changeset`), all balanced insertions/deletions (pure substitutions, no spurious add/remove). Each one is enumerated in the doc's Components / Approach sections; the diff contains no false positive and no missed concept token. An independent whole-repo sweep (excluding `.git`/`node_modules`/`.pipelines`/`CHANGELOG`) surfaced no concept-bearing file outside the doc's enumerated scope — the broad `doc-writer`/`doc-reviewer` substring matches in `design-doc-analyst.md`, `design-doc-writer.md`, and the two `2 - design-doc.md` phase files carry **zero** leading-noun oracle matches and are correctly the protected phase-2 concept, not missed phase-5 tokens.

## Spec alignment

Every spec requirement (1–9) and every acceptance criterion maps to a verified part of the mechanism: agent-name pluralization and file renames (R1, R2; Step 2 + Step 3), plan-artifact identifiers incl. the completion predicate (R3; verified `pipeline-versioning.md:47` reads `3-plan/docs-plan-review-approved.md`), display labels and Mermaid (R4; Step 2), lowercase prose (R5; Step 2), derived copies in `.rp.md`/`website/demo.js`/README (R6; Step 2), the changeset `docs-phase` (R7; Step 2), the four disambiguating rewords (R8; Step 1), and the untouched `design-doc` concept (R9; lookbehind, 240 with the single sanctioned addition). The README scope amendment is correctly carried into the design's `find` list and oracle scope.

## Minor, non-blocking observations (not defects)

- The "Experiment leftover" risk note (design-doc.md:185) says the shelved experiment "remains as `git stash@{0}`". The live `git stash list` now shows four #134-related stashes, with the named "wip-134-substitution-experiment" at `stash@{3}`, not `{0}`. This is harmless staleness in a risk note — every stash is off-tree, the implementation reproduces the result from the recipe (not the stash), and the baseline oracle is the documented 164. No action required; flagged only for the record.

## Conclusion

The rename mechanism does exactly what the doc claims — it does not corrupt `design-doc`/`document(ation)`/already-plural `docs`, is idempotent, handles the two space-named phase files and README, and drives the acceptance suite 164 → 0 with positive existence, old-names-gone, and zero-corruption all passing. The design is complete, sound, internally consistent, faithfully aligned with the approved spec, and ready to implement. Approved.
