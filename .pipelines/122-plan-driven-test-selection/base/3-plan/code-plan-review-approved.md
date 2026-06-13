# Code Plan Review

## Verdict: approved

## Summary

The code plan faithfully executes the approved design's §1–§8 deliverable map and covers spec AC1–AC8 with seven well-scoped, individually-traceable tasks. Every line/anchor citation in the plan matches the LIVE files on the stacked-on-#121 branch (verified via `git show HEAD:<file>`). The writer-split task correctly deletes `agents/code-writer.md` and creates both `code-writer-tdd.md` and `code-writer-e2e.md` with the right tdd/e2e division; the lockstep trio (load.md ⇄ setup.md ⇄ README roster) is one coordinated task; the code-reviewer task preserves the evidence text byte-identical and adds only the re-drive sentence; and the run-specific "None" floor / no-Flow-blocks content is correctly distinguished from the full schemas the tasks author into the skill files. Nothing strays outside scope — the project `.rp.md` self-edit is correctly excluded as an operational follow-up, not a skill task.

## Verification performed

**Citations vs. LIVE HEAD (`worktree-122…`, HEAD `66f3c91`).** Every anchor the plan cites was checked against `git show HEAD:<file>`:

- `agents/code-plan-writer.md` — structure block L23-47, L60 actor clause ("the code-writer turns them into tests in the RED phase of TDD"), and L64 "**Do NOT plan tests.**" with the exact "derived from browser verification" phrase: all present as quoted.
- `agents/code-plan-reviewer.md` — step order (1 Gather / 2 Review / 3 Write / 4 Commit), L28 "**No test planning**" with the "derived from browser verification" phrase, and the L67 internal cross-reference "the file you wrote in step 3": all present. The renumber (insert at 2 → 3 Review, 4 Write, 5 Commit) and the explicit "update any internal step cross-references" instruction correctly capture the L67 "step 3"→"step 4" fix.
- `agents/code-writer.md` — 6 live steps (Gather / Implement / Behavior verification / Derive e2e / Run guardrail selection / Commit), the L24 "added in step 4" and L46 behavior-verification back-references, the L38 UI-conventions duty inside the removed step, the L51-54 two-question outcome bullets, and the L65 self-containment guideline: all present; all internal step refs to be removed/renumbered are explicitly handled by the task.
- `agents/code-reviewer.md` — L33-35 "### 3. Behavior verification" single-paragraph body ending in the exact evidence sentence used as the insertion anchor, L29 Test quality check, and the L81/L110 byte-identical targets: all present.
- `reference/autonomous-phases/4 - code.md` — L3 overview, L25 single `code-writer` row ("…with TDD, verifies behavior, validates, commits."), L30 step 1, L33 launch parenthetical, L34/L35 generic plurals, mermaid node: all present.
- `reference/conventions/load.md` L30 and `setup.md` L183/L189: enumeration, option list, and `typecheck` example row all present as quoted.
- `README.md` L112: single shipped-agent roster hit listing `code-writer`.
- `reference/assisted-phases/3 - plan.md` — L30 constraint, L117 self-check, L152 synthesis guideline (all with exact text), the L126-146 skeleton, the L109 coverage self-check, and the abstract `code-writer` role mentions at L25/L59/L96/L114 left untouched: all confirmed.

**Design §1–§8 → task coverage.** §1→T1, §2→T2, §3→T3, §4→T4, §5→T5, §6→T6, §7→T6, §8→T7. Complete.

**Spec AC1–AC8 → task coverage.** AC1→T1+T2 (phrase removed in both files), AC2→T2, AC3→T3, AC4→T4, AC5→T6, AC6→T5, AC7→T6+T7+the no-contradiction sweep, AC8→T6+T7. Complete.

**Writer split (T3).** Deletes `code-writer.md`; creates both new files with correct `name:` frontmatter; collapses 6→4 steps removing behavior-verification and derive-e2e; UI-conventions duty moves to **tdd only** (conditional phrasing), explicitly absent from e2e; e2e reads the E2E test plan section (self-containment carve-out names both shared sections); both "Run the gates" steps run guardrail selection AND the required-test-commands floor under one shared two-question model; both guardrail-read lines name the correct agent. Matches §3 exactly.

**Lockstep & reviewer.** T6 moves load.md, setup.md, and README together to the same five-agent set (two views agree). T4 keeps the free-form body and evidence sentence byte-identical, inserting the re-drive sentence before the evidence sentence, and leaves template (L81) and guideline (L110) untouched — only the L29 tie-to-plan rephrase, which §4 authorizes.

**Required-test-commands floor (execute/resolve discipline).** This repo is a prose Markdown skill with no executable build/test/lint suite, so the run's own floor of "None" is correct and legitimate (mirrors setup.md's "'None' is a complete, valid answer"); there are no commands to resolve-and-terminate, so the validation is vacuously satisfied. Critically, the plan correctly distinguishes the run's content (floor = None; no `### Flow N` blocks; all tasks typed `tdd`) from the **schemas** the tasks author into the skill files: T1 and T7 author the full `| Name | Command | Covers |` table and `### Flow N` block templates into the agent/reference files regardless of this run's empty content. The schemas are specified.

**Scope.** The project `.rp.md` is correctly excluded (operational follow-up, not a skill AC). No migration/backward-compatibility text is introduced (T6/T7). Each task has verifiable, read-the-Markdown acceptance.

**AC7 no-contradiction sweep.** A full `git grep code-writer` over live files (excluding `.pipelines/` and `.rp.md`) surfaces hits the plan does not touch: `agents/code-reviewer.md` (description + "every code-writer in the batch" / "fresh code-writers"), `.changeset/agent-scoped-guardrails.md` (#121 release note), `website/demo.js` (illustrative task/commit strings), `agents/doc-writer.md:64`, and assisted-2 L48/L81/L100. Each is a generic writer-role/plural usage true of both new writers, a historical release-note artifact, or a purely illustrative example — none is a shipped-agent roster or dispatch claim presenting `code-writer` as a current agent. These are consistent with the design's own rule (kept for the §5 generic plurals) and fall under AC7's explicit non-violation carve-out, so leaving them is correct. (Observation only: the design's "Untouched (confirmed)" list does not individually enumerate code-reviewer.md, the changeset, or demo.js; the plan inherits that scope and is not defective for it, since none contradicts the split.)
