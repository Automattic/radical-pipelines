# Code Plan Review — APPROVED

**Artifact reviewed:** `3-plan/code-plan.md` (commit c36f548)
**Verdict:** Approved (iteration 1)
**Reviewer:** code-plan-reviewer

## Summary

The code plan is complete, feasible, and faithful to both the spec and the design doc. It decomposes the per-occurrence prompt→intent rename into 14 independent, individually-verifiable tasks, quotes every trunk-verbatim target exactly, correctly resolves the two deferred wording calls per the design doc's Key Decisions, and ships a grep-based acceptance suite that mirrors the spec's eight acceptance criteria. I verified every load-bearing claim against the actual repository (branch `worktree-95-pipeline-reviews`, format file still at `prompt-format.md`) and against trunk via `git show trunk:<path>` / `diff`. An implementer can execute this plan completely and verify the result.

## Verification performed (every claim checked against the repo, not taken on trust)

All per-line targets and trunk-verbatim quotes are accurate:

- **Task 1 — `prompt-format.md` rename + body.** File exists at the stated path; lines 1, 3, 15, 21 read exactly as quoted. The three discipline bullets to leave alone (19, 20, 22) carry no phase-0 token. Confirmed.
- **Task 2 — `SKILL.md` (non-mechanical #1).** Full `diff trunk vs branch` shows the ONLY differences are the L3 description and the entire phases table (L33–40); the branch table has wider column padding ("Prompt"/"0-prompt"/"The raw request…" are longer), so the instruction to copy the whole re-aligned trunk table is correct and necessary. The trunk row `| 0   | Intent     | \`0-intent\`     | The input |` is quoted exactly. After this task the file is byte-identical to trunk — the plan's pure-take-trunk acceptance check is achievable.
- **Task 3 — four `spec-*` agents.** `diff trunk vs branch` for each confirms the diffs are purely phase-0 terminology, at exactly the lines the plan lists (spec-analyst 6/16/18×2/22/24/25/94; spec-consolidator 14/61/80; spec-reviewer 14; spec-writer 6/12/56/61). The one non-phase-0 divergence — `spec-reviewer.md:34` "in this artifact folder" vs trunk "per pipeline" — is correctly identified and left untouched per the per-occurrence rule. The generic occurrences in these files (`spec-writer.md:15`, `spec-consolidator.md:8`) are identical on trunk and correctly excluded.
- **Task 4 — `manage-issues.md:14/18` (non-mechanical #4, conflict file).** Branch L14/L18 read exactly as quoted. Trunk genuinely (a) reworded the agent clause to "When the pipeline is created, the orchestrator turns the issue into `0-intent/intent.md`", (b) inlined the schema ("So this is both the issue template and the intent format. Render these sections…"), and (c) used a flat path. The plan correctly takes only trunk's *naming/agent-clause* (lowercase "when" per the design-doc target), keeps #106's `base/0-intent/intent.md` path and extracted-`intent-format.md` pointer, and does NOT re-inline. Internally consistent with the design doc's Key Decision #2.
- **Task 5 — `pipeline-versioning.md`.** Grep confirms phase-0 occurrences at exactly the listed lines (25, 44, 55, 82, 87, 91, 96, 110, 111); the ASCII tree (L94–105) contains exactly one `0-prompt` root (L96); all `base/…` phrasing and the L115 linear-chain prose carry no phase-0 token and are correctly preserved.
- **Task 6 — phase docs.** Grep confirms assisted-1 (3/7/36/110), assisted-2 (106/135, with L66 generic "intent" correctly excluded), assisted-3 (124), autonomous-1 (3 "phase 0 (prompt)", 7) — all accurate.
- **Task 7 — workflow docs.** Trunk rows verified: assisted L17 and autonomous L39 both read `| 0 - Intent     | \`0-intent\`     | Already in place …|`. "Prompt"/"Intent" and "0-prompt"/"0-intent" are identical widths, so the "re-pad cells" note is a harmless no-op. The autonomous-workflow L61 generic "initial prompt" is correctly preserved. (The whole-file diff also shows a #106 non-phase-0 wording change at assisted-workflow L26 — the plan correctly leaves it and does not claim pure-take-trunk for this file.)
- **Task 8 — `setup.md`.** Lines 48, 64, 113 verified.
- **Task 9 — `create-pipeline.md` (non-mechanical #3).** Branch L3/L21/L23/L25/L26 read as quoted. Trunk collapsed to a flat `0-intent/` path AND added a separate "Do not add requirements…" bullet. The plan correctly keeps #106's `base/…` structure, takes trunk's "into the intent that seeds the subsequent phases" verb phrasing WITH the `intent-format.md` pointer retained, and does NOT add the extra bullet. Consistent with Key Decision #1.
- **Task 10 — `fork-pipeline.md`.** Phase-0 occurrences at exactly L14/38/42; `base/` model preserved.
- **Task 11 — `review-pipeline.md`.** Grep confirms phase-0 occurrences at exactly 3/31/37/39/41/42/44/52; generic "orchestrator-authored" and the L41 "what prompted it" verb usage are correctly preserved; the format reference repoints to `intent-format.md`.
- **Task 12 — `README.md` (non-mechanical #2).** Trunk L27/56/112 verified: L112 trunk reads "phase 0 is the **intent**" — "raw" is genuinely DROPPED. Branch reads "the raw prompt". The plan correctly forbids "the raw intent". The #106 run-folder paragraph (actually ~L157, not the plan's "~152/~155" estimate, but identified by content) carries no phase-0 token and is correctly left.
- **Task 13 — `website/`.** `index.html` has exactly one `prompt.md` span at L119 (the plan's stated line). demo.js lines 12/23/140/276/281 verified; L281 trunk genuinely KEEPS "raw" (contrast README:112) — the plan's intentional split is correct. `cc-prompt` (271), SEO keyword (12), "Same prompt" (153) preserved.
- **Task 14 — acceptance suite.** All grep patterns are well-formed and execute without error. The SKILL check-6 grep (literal `|` in plain `grep`) matches on trunk as a near-fixed-string. The "in the prompt" check (spec AC2) resolves correctly: the only "in the prompt" in shipped files is `prompt-format.md:21`, renamed by Task 1 to "in the intent".

**Independent completeness sweep.** I ran `grep -rniE 'prompt'` over all shipped files and audited every hit: each phase-0 occurrence maps to a task, and each generic occurrence (loop/launch/spawn/initial prompt, `/loop <prompt>`, `cc-prompt`, "prompt engineering", "Same prompt", `code-writer.md:62`) is correctly preserved. No phase-0 occurrence is missed; no generic occurrence is wrongly renamed. The out-of-scope boundaries (`.rp.md`, frozen `base/`/`.pipelines/` artifacts, `conventions/load.md`, the 6 reviewer agents, `.changeset`) are respected.

## Alignment with spec and design doc

- The coverage map (spec req → task) is correct and complete: every spec requirement (1–11) and all four non-mechanical edits map to a concrete task; acceptance criteria 1–8 map to Task 14's eight checks.
- Both deferred wording calls are encoded exactly as the design doc decided (Key Decisions #1 and #2), and the plan explicitly tells the implementer not to re-open them.
- The per-occurrence rule and the phase-0/generic boundary are stated up front and applied consistently, including the subtle README:112-drops-"raw" / demo.js:281-keeps-"raw" split.

## Minor, non-blocking observations (for the implementer; none impair execution)

1. **Task 14 check 3** enumerates the expected generic residuals but omits `README.md:13` ("The same prompt, the same context…", identical on trunk and correctly never touched) and does not individually name the agents' "orchestrator's prompt cited a review file" lines (it covers them under the general "launch/spawn prompt" category). When inspecting the check-3 residual list, the implementer should recognize `README.md:13` as a legitimate generic occurrence and NOT "fix" it. This is a verification-enumeration gap, not a defect in any rename instruction.
2. **Task 7's** "re-pad cells to keep the table aligned" is a no-op (Prompt↔Intent and 0-prompt↔0-intent are equal widths); copying the trunk row verbatim is sufficient.
3. **Task 12** estimates the README run-folder paragraph at "~L152/~L155"; it is actually ~L157. The plan identifies it by content, so it remains findable.

None of these change what gets renamed or preserved; they are cosmetic notes on the verification step. The plan is approved.
