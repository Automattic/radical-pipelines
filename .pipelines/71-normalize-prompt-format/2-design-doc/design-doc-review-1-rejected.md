# Design Doc Review 1 — REJECTED

Issue #71 — "Normalize issue content into the standard prompt format when creating a pipeline".

Reviewed: `2-design-doc/design-doc.md` against `1-spec/spec.md` (requirements 1–12, AC1–AC15) and the actual repo files. Review iteration N=1.

## Verdict

**REJECTED** — one blocking defect: the design's requirement-to-AC traceability is internally self-contradictory and inconsistent with the approved spec's numbering. The design's *substance* is sound and covers every requirement and AC; the defect is in the labels, but it sits in the one section whose job is verifiable traceability, in the artifact the plan phase consumes. It must be corrected before approval.

Everything else verified as correct (see "What checks out" below). The fix is mechanical relabeling — no design rework.

---

## Blocking finding

### B1 — The requirement numbering is scrambled and self-contradictory; it does not match the approved spec

The spec numbers its requirements **1–12** with a fixed requirement→AC pairing. The design re-uses R-numbers inconsistently: some R-numbers are applied to the wrong behavior, some are double-assigned to two different behaviors, and the "How the design satisfies each requirement" matrix (lines 199–229) pairs several R-numbers with the wrong AC.

Spec ground truth (requirement → AC), from `spec.md`:

| Spec R | Requirement | AC |
| --- | --- | --- |
| R1 | Single canonical format, single source | AC1 |
| R2 | Title + Goal/Constraints/Context/Assumptions, omit-empty | AC2, AC3 |
| R3 | Format **referenced**, not duplicated | AC4 |
| **R4** | **Prompt-file rendering documented** | **AC5** |
| R5 | Body + all comments | AC6 |
| R6 | One-hop directly-cited references | AC7, AC8 |
| R7 | Normalize, don't converge | AC9 |
| R8 | Conflicts surfaced | AC10 |
| R9 | Owner confirmation required before commit, always | AC11 |
| R10 | Full rendered prompt shown | AC12 |
| R11 | Revise-and-re-confirm loop | AC13 |
| **R12** | **Assets and self-containment** | **AC15** |

The design's errors against that table:

1. **R12 is double-assigned** — used for "prompt-file rendering" (D2 header line 92; matrix line 207 "R12 / AC5"; out-of-scope line 238 "the prompt-file rendering wrapper (R12)") AND for "assets/self-containment" (D6 header line 165; matrix line 229 "R12 / AC15"). Rendering is spec **R4**, not R12. The same number cannot mean two requirements.

2. **R3 is double-assigned** — used correctly for "referenced, not duplicated" (D1 header line 84; matrix line 205 "R3 / AC4") AND incorrectly for "commit gated on confirmation" (D5 header line 149 "R3, R9, R10, R11"; matrix line 222 "R3 / AC11"). Confirmation-required is spec **R9**, not R3.

3. **Confirmation-section pairings are each shifted by one** in the matrix:
   - Line 222 "R3 / AC11" → should be **R9 / AC11**.
   - Line 223 "R9 / AC12" → should be **R10 / AC12** (R9 is confirmation-required, not full-prompt-shown).
   - Line 224 "R10 / AC13" → should be **R11 / AC13** (R10 is full-prompt-shown, not revise-loop).

4. **D5 header (line 149)** lists "(R3, R9, R10, R11; AC11, AC12, AC13, AC14)". The R-set for the confirmation gate + revise loop should be **R8, R9, R10, R11** (R8 conflicts-surfaced is the cross-cut the section also carries) and the ACs AC11–AC14. R3 (referencing) does not belong here.

5. **D2 header (line 92)** "(R12; AC5)" → should be **(R4; AC5)**.

6. **File-by-file table** mis-tags two rows:
   - `manage-issues.md` row (line 73) "R1, R11; AC1, AC4" → the second requirement is the **referencing** requirement, spec **R3**, not R11 (revise loop). Should be "R1, R3; AC1, AC4".
   - `setup.md` row (line 74) "R6; AC6" → comment-reading is spec **R5** (R6 is one-hop references). Should be "R5; AC6". The `.rp.md` row (line 75) has the same "R6; AC6" error → should be "R5".
   - D3 header (line 119) "(R5, R6; AC6, AC7, AC8)" is correct as written — keep it; it is the matrix and headers around the confirmation/rendering/assets cluster that are wrong.

This is not a coherent alternative numbering — it is self-contradictory (R12 and R3 each denote two different requirements), so it cannot be reconciled by reading the design under its own scheme. Because the "How the design satisfies each requirement and acceptance criterion" section exists precisely to be the verifiable bridge from spec to design (and onward to the plan and AC-verification phases), a scrambled key defeats that section's only purpose and will mislead the plan agent cross-referencing against the spec.

**Required fix:** renumber every R-reference in the design to match the spec's 1–12 scheme — decision headers (D2, D5), the file-by-file table rows (`manage-issues.md`, `setup.md`, `.rp.md`), the out-of-scope rendering note (line 238), and the full "How the design satisfies…" matrix (lines 199–229). After the fix, every R↔AC pair must match the ground-truth table above, and no R-number may appear against two different behaviors. No substantive design change is needed.

---

## What checks out (verified against the repo — do not change)

The design's architecture and every grounding claim I could check are accurate. These are confirmed so the revision does not disturb them:

- **`create-pipeline.md` line references** — step 4 at `:21-28`, "Adapt the issue content" at `:25`, no-converge seed at `:26`, asset download at `:27`, self-contained note at `:28`, step 5 "Commit" at `:30-32`. All accurate.
- **`manage-issues.md`** — "The issue format" taxonomy at `:12-22` (bullets: Title/Goal/Constraints/Context/Assumptions, omit-empty at `:14`, minimal Title+Goal at `:22`); step 5 "Draft, confirm, write" at `:60-62`. Accurate. It owns the taxonomy; the wrapper is genuinely absent from it.
- **Load-bearing cross-link** — `grep` confirms `manage-issues.md` is referenced in `skills/` ONLY at `SKILL.md:55` (entry-point table), and neither `create-pipeline.md` nor `work-on-an-issue.md` reads it today (the only existing link is the one-way `manage-issues.md:14` → `create-pipeline.md`). So the new `create-pipeline.md` → `manage-issues.md` ("The issue format") link is load-bearing and creates no on-path duplication. The D1 reasoning is sound and correctly satisfies AGENTS.md R-dup-path / R-dup-cross.
- **Reading-path / step ordering** — `work-on-an-issue.md` step 2 (create pipeline, `:39`) precedes step 3 (pick mode, `:41`); `create-pipeline.md` is reached only from `work-on-an-issue.md:39`. The "confirmation is upstream of mode selection, so it does not violate the autonomous 'no further questions once the run starts' rule" reconciliation (D5) is correct.
- **Decisions-section reasoning** — `autonomous-workflow.md:25` reads per-phase `Decisions` only for phases in the run; the phase table (`:39`) shows "0 - Prompt → Already in place", confirming phase-0 creation predates the run and correctly has no `Decisions` section. Accurate.
- **Revise-loop idiom** — `autonomous-workflow.md:29` "If the owner accepts, proceed. If they want changes, revise and confirm again." Verified verbatim; D5's mirror is faithful.
- **AGENTS.md rules** — R-min/R-dup-path/R-neg/R-generic/R-dup-cross at `:7-11`. Reproduced accurately; the compliance check is sound. The in-place confirm-loop (not extracted) is justified: the pattern is house style (in-place in 7+ files) and the two loops sit on sibling, never-co-loaded entry points (`SKILL.md` table), and differ in subject + conflict-surfacing.
- **Capability model** — orchestrator defined by role only at `SKILL.md:10`; no web-fetch capability exists anywhere in `skills/` (`grep` = zero hits); no author-attribution idiom exists (`grep` = zero hits), confirming attribution phrasing is correctly net-new. The "plain instruction, no capability layer" decision (D3) and the access-split (GitHub-internal via **Issues** convention vs. external via generic web fetch) are well-grounded in the asset-download precedent (`create-pipeline.md:27`) and the researcher Web idiom (verified verbatim at `agents/design-doc-researcher.md:15` and `agents/spec-researcher.md:15` — note these live at the repo-root `agents/`, not `skills/radical-pipelines/agents/` as the research log states; the idiom text itself is exact).
- **Capability grants** — `setup.md` "Issues (required)" capability sentence "read, comment on, and update them" at `:64` (accurate); `.rp.md` has "Creating an issue" / "Modifying an issue" but no "Reading an issue" subsection, and already names `gh` (`:11,:16,:24`), so the dogfood edit and the R-generic exemption are correct.
- **Rendering decision (D2)** — picking one shape (`# Prompt` H1 + `> Source:` blockquote + self-contained note + body sections, omit-empty) to resolve the documented five-way artifact drift is the right call and squarely satisfies the rendering requirement / AC5. The minimal specimen (`# Prompt` + source line + `## Goal`) correctly satisfies AC3.
- **Confirmation/assets sequencing (D5, D6)** — gate before the *write* (not just commit), assets downloaded before the draft so relative links resolve, no phase-0 approval artifact (AC14). All correct and consistent with the spec's "never written or committed silently."
- **Scope discipline** — no goal substitution, one-hop only, no PR review-thread ingestion, no requirements/AC/design in `prompt.md`, no new format. Faithful to the spec's out-of-scope; no invented scope, no dropped or weakened requirement (substantively — the only defect is the labels).

## Note (non-blocking, for the writer's awareness)

The research log cites the researcher agents as `skills/radical-pipelines/agents/spec-researcher.md` / `agents/design-doc-researcher.md`; they actually live at the **repo-root** `agents/`. The cited idiom text is exact and the design's reasoning is unaffected, so this is not a finding — just a heads-up if any future edit needs to touch those files.
