# Design Doc Review — APPROVED

Issue #71 — "Normalize issue content into the standard prompt format when creating a pipeline".

Reviewed: `2-design-doc/design-doc.md` against `1-spec/spec.md` (requirements 1–12, AC1–AC15), the iteration-1 rejection (`design-doc-review-1-rejected.md`), and the actual repo files. Review iteration N=2.

## Verdict

**APPROVED.** The single blocking defect from iteration 1 (B1 — scrambled, self-contradictory requirement-to-AC traceability) is fully and correctly fixed, and an independent re-verification confirms nothing substantive regressed. The design is standalone, faithful to the spec, grounded in verified repo facts, scope-disciplined, and AGENTS.md-compliant.

---

## Iteration-1 defect (B1) — confirmed fully fixed

Ground-truth requirement → AC mapping, re-derived directly from `spec.md` (not taken from the prior review):

| Spec R | Requirement | AC |
| --- | --- | --- |
| R1 | Single canonical format, single source | AC1 |
| R2 | Title + Goal/Constraints/Context/Assumptions, omit-empty | AC2, AC3 |
| R3 | Format referenced, not duplicated | AC4 |
| R4 | Prompt-file rendering documented | AC5 |
| R5 | Body + all comments | AC6 |
| R6 | One-hop directly-cited references | AC7, AC8 |
| R7 | Normalize, don't converge | AC9 |
| R8 | Conflicts surfaced | AC10 |
| R9 | Owner confirmation required before commit, always | AC11 |
| R10 | Full rendered prompt shown | AC12 |
| R11 | Revise-and-re-confirm loop | AC13 |
| R12 | Assets and self-containment | AC15 |

Every location flagged in B1 was checked and is now correct:

1. **R12 double-assignment removed.** D2 header (line 92) is now `(R4; AC5)`; the matrix rendering row (line 207) is `R4 / AC5`; the out-of-scope rendering note (line 238) now reads `(R4)`. R12 now denotes only assets/self-containment (D6 header line 165, matrix line 229 — both `R12 / AC15`).
2. **R3 double-assignment removed.** R3 now means only "referenced, not duplicated" — D1 header (line 84) and matrix (line 205) `R3 / AC4`, and the `manage-issues.md` table row (line 73) `R1, R3`. The confirmation gate no longer borrows R3.
3. **Confirmation-section matrix pairings corrected.** Line 222 `R9 / AC11`, line 223 `R10 / AC12`, line 224 `R11 / AC13` — each now matches ground truth (previously each was shifted by one).
4. **D5 header corrected** (line 149) to `(R8, R9, R10, R11; AC11, AC12, AC13, AC14)`; R3 is gone, R8 (conflicts-surfaced cross-cut) is in.
5. **File-by-file table re-tagged.** `setup.md` row (line 74) and `.rp.md` row (line 75) now `R5; AC6` (comment-reading is R5, not R6).

Mechanical verification across the whole document:
- All twelve R-tokens (R1–R12) and all fifteen AC-tokens (AC1–AC15) appear — full coverage, none missing.
- Every occurrence of each R-number denotes a single, consistent behavior; no R-number is applied to two behaviors. (The lone `R1–R12` on line 72 is the legitimate full-coverage range tag for the create-pipeline.md rewrite row, not a behavior assignment.)
- Every R↔AC pairing in the headers, the file-by-file table, and the "How the design satisfies…" matrix matches the ground-truth table above. ACs with no owning spec requirement (AC14) and ACs sharing a requirement (AC3 with R2; AC8 with R6) are correctly listed standalone.

The fix was a clean relabeling with no substantive design change, exactly as the iteration-1 review prescribed.

## Independent re-verification — no regression

I re-grounded the load-bearing claims against the live repo (not the prior review):

- **`create-pipeline.md`** — step 4 "Generate the initial prompt" at lines 21–28; "Adapt the issue content as a prompt" (line 25); no-converge seed (line 26); asset download "If the issue has screenshots…" (line 27); self-contained note (line 28); step 5 "Commit" (lines 30–32). All accurate.
- **`manage-issues.md`** — "The issue format" taxonomy at lines 12–22 (Title/Goal/Constraints/Context/Assumptions; omit-empty at line 14; minimal Title+Goal at line 22); line 14 confirms "the issue body _is_ the phase-0 prompt … both the issue template and the prompt format" (single source). Step 5 "Draft, confirm, write" at lines 60–62, gate-before-write at line 62. The wrapper is genuinely absent — the two-layers/two-homes split is sound.
- **Load-bearing cross-link** — `manage-issues.md` is referenced in `skills/` ONLY at `SKILL.md:55`; neither `create-pipeline.md` nor `work-on-an-issue.md` reads it. The new cross-link is therefore load-bearing and creates no on-path duplication. D1 is correct (satisfies AGENTS.md:8 and :11).
- **Step ordering / autonomous reconciliation** — `work-on-an-issue.md` step 2 (create pipeline, line 39) precedes step 3 (pick mode, line 41); `autonomous-workflow.md:25` reads per-phase `Decisions` only for in-run phases; `:39` shows "0 - Prompt → Already in place"; revise-loop idiom verbatim at `:29`. D5's "confirmation is upstream of mode selection; no `Decisions` section; unconditional gate" reasoning holds.
- **Capability model & grants** — orchestrator defined by role only (`SKILL.md:10`); `setup.md:64` capability sentence "read, comment on, and update them"; `.rp.md` has "Creating an issue" (line 14) / "Modifying an issue" (line 22) but no "Reading an issue" subsection, and names `gh` (line 24), so the R-generic exemption and the dogfood edit are correct. The researcher Web idiom "search and fetch documentation, references, discussions, and prior art" is verbatim at `agents/spec-researcher.md:15` and `agents/design-doc-researcher.md:15` (repo-root `agents/`); the design doc cites no wrong path for these.
- **AGENTS.md rules** — R-min/R-dup-path/R-neg/R-generic/R-dup-cross at lines 7–11, reproduced faithfully; the in-place confirm-loop justification (house style across 7+ files; sibling never-co-loaded entry points; differing subject + conflict-surfacing) is correct.

Substance otherwise unchanged and intact: standalone (line 5 holds — the doc reproduces the AGENTS rules, repo facts, motivating-drift table, and all decisions in-line); faithful to the spec (R1–R12 / AC1–AC15 all covered with correct mapping); scope-disciplined (no goal substitution, one-hop only, no PR review-thread ingestion, no requirements/AC/design in `prompt.md`, no new format); rendering decision (one shape resolving the five-way drift) and the gate-before-write / assets-first / no-approval-file sequencing all correct.

## Note (non-blocking, carried forward)

The research log (not the design doc) still cites the researcher agents under `skills/radical-pipelines/agents/`; they live at repo-root `agents/`. The cited idiom text is exact and no design reasoning depends on the path, so this remains a heads-up only, not a finding.
