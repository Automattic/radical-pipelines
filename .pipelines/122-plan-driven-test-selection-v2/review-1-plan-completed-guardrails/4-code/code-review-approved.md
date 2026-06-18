# Code Review — review-1 (Plan-completed guardrail commands)

**Verdict: APPROVED**

Batch: Tasks 1–11 of `code-plan.md`. Diffed `git diff 3adc5c9 HEAD`; every
verification claim below was confirmed against committed content via
`git show HEAD:<path>` (a known Edit/Write→disk desync occurred on this worktree,
so git was trusted over a Read view — and a desync check confirmed all ten files
match disk this time).

This pipeline edits the Radical Pipelines skill itself. The code plan's
`## Plan-completed guardrails` and `## E2E test plan` both read `None` (this repo
declares no guardrails and the skill has no runnable e2e surface), so verification
is the content/coherence inspection of the shipped Markdown across the ten files.

## Scope

The diff touches exactly the ten live skill files of spec R10 (`git diff --stat`):
`agents/code-plan-reviewer.md`, `agents/code-plan-writer.md`,
`agents/code-writer-e2e.md`, `agents/code-writer-tdd.md`,
`reference/conventions/setup.md`, `reference/conventions/load.md`,
`reference/autonomous-workflow.md`, `reference/autonomous-phases/3 - plan.md`,
`reference/autonomous-phases/4 - code.md`, `reference/assisted-phases/3 - plan.md`.
No eleventh skill file was edited.

## Acceptance criteria — all ten hold

1. **AC1/AC2 (setup.md captures the mark).** New per-gate capture item at
   setup.md:184 describes optional `plan-completed-for` as "a non-empty subset of
   the gate's agents (it may equal them)" with the code-plan-writer supplying the
   feature command per pipeline and absence leaving an ordinary gate; it states the
   full command is validated at setup and the feature command later at the plan
   phase by the code-plan-reviewer. The existing full-command validation paragraph
   ("Validate each command as you capture it", setup.md:188) is unchanged. The old
   reminder is trimmed to *when* only (per-task vs once-per-run cadence, slow gate in
   a large project, setup.md:185) and points at the mark. The unrelated
   validation-floor metaphor (setup.md:198, "the floor still catches the realistic
   failures") is intact.

2. **AC3 (load.md represents the mark).** The `## Local overrides` committed-only
   statement (load.md:38) is extended to note a gate may be plan-completed for some
   agents whose command comes per pipeline from `code-plan.md`, resolved before
   spawn — "the mark and the gate's full command are committed `.rp.md`; the feature
   command lives in `code-plan.md`, never in `.rp.md`". Committed-only is preserved
   and sharpened; no new section and no row added to the convention index table
   (verified: no table rows in the diff).

3. **AC4 (code-plan.md section).** code-plan-writer.md structure block (line 31)
   carries `## Plan-completed guardrails` with a `Gate | Command | Rationale` table,
   the floor-free comment (line 33, byte-matching the design's prescribed comment),
   and the bare-`None` rule. The old `## Required test commands` header, floor
   comment, and `Covers` column are gone. `## E2E test plan` and `## Tasks` headings
   in the structure block are unchanged.

4. **AC5 (writer learns the set, authors commands).** autonomous-workflow.md:66 adds
   the `Guardrails to complete:` field (marked gates: name + setup-fixed full command,
   passed only to code-plan-writer and code-plan-reviewer, glossed "complete rather
   than run", omit-when-empty). code-plan-writer.md gather-context reads it (line 14)
   and frames `None` as the default when no marked-gate set is received; the authoring
   guideline (line 83) directs a feature-scoped command (same runner, narrower scope)
   for exactly the passed gates and notes the writer owns the command but not the set.
   Assisted file fills the section directly with no spawn field (verified absent).

5. **AC6 (reviewer validates and binds).** code-plan-reviewer.md gather-context reads
   `Guardrails to complete:` as its only channel (line 15). The execute check
   (line 20) targets `## Plan-completed guardrails` and keeps the
   runner-resolves-and-terminates discipline verbatim. The coverage check (line 28)
   judges each feature command credibly completes its marked gate using the rationale;
   "credible floor, not exhaustive" framing is gone. A new bind check (line 29)
   requires every row's Gate to match a passed gate and every passed gate to have
   exactly one row, with unmarked/nonexistent rows and rowless marked gates as
   rejections and `None` valid when none passed. "No unit-test planning" (line 36)
   retargets to the new section, logic intact.

6. **AC7 (orchestrator resolves at code phase).** autonomous-workflow.md `Guardrails:`
   bullet (line 65) carries the resolution clause (for a marked gate, that line's
   command is the feature command resolved from `code-plan.md` before spawn) — the
   contract/algorithm stated once. 4-code.md (lines 34, 36) states *when* only:
   before each writer spawn and before the reviewer spawn the orchestrator substitutes
   the feature command from `## Plan-completed guardrails` into that agent's
   `Guardrails:` line. No binding/missing-row/assisted text added.

7. **AC8 (writers run one unified gate set).** Both writers' `### 3. Run the
   guardrails` are **byte-identical** (verified by diff) and match the shared
   writer/doc wording with the three-bullet sort, no floor branch, no
   "two command sets" language, no command-section read. The gather-context
   floor read is removed from both; the e2e writer keeps its `## E2E test plan`
   read. Self-containment input lists no longer name the Required test commands
   section (tdd: "The task block is your input"; e2e: "task block and the
   `## E2E test plan` section"). Each writer retains its own deliverable-confirmation
   line ("covered by a passing test"). The writers legitimately diverge from the
   doc-writer model only on the no-convention tail and the final confirmation line,
   exactly per design L389–391.

8. **AC9 (untouched set).** `git diff` of `code-reviewer.md`, `doc-writer.md`,
   `doc-reviewer.md`, `README.md` is empty. No `## E2E test plan` section heading was
   edited in any live file (all heading matches in the diff are inside `.pipelines/`
   artifact files or textual references in guideline prose).

9. **AC10 (scope discipline, contract-once, assisted parity, floor gone).**
   - Tree-wide sweep for "required test command", "required-test-commands", "floor",
     "two command set" across `agents/` and `reference/` returns exactly one match:
     the unrelated validation-floor metaphor at setup.md:198. All floor framing is gone.
   - Contract defined once: autonomous-workflow.md is the sole home; 3-plan.md states
     *when* only ("see `autonomous-workflow.md`") with no contract/omit/full-command
     restatement; 4-code.md states *when* only.
   - Assisted parity: single-driver "for each gate **you** marked" authority in both
     the constraint (line 30) and the combined self-check bullet (line 118, which folds
     the bind into the validate bullet with no separate coverage-judgment bullet); the
     skeleton `## Plan-completed guardrails` block is byte-identical to the
     code-plan-writer's; no `Guardrails to complete:` field invented.
   - No migration/back-compat/legacy/deprecation text anywhere (sweep clean).

## Commit ordering — no forward reference

The ten task commits land in dependency order. Task 6 (9728454, introduces
`## Plan-completed guardrails` in the producer) precedes Task 3 (200ea3f, 4-code.md
references that section). Verified at commit 200ea3f the section already existed in
code-plan-writer.md, so no forward reference exists at any commit. Task 1 (73640a7)
defining the spawn-field contract precedes all files that reference it.

## Verdict

All ten acceptance criteria hold against committed content with concrete evidence;
the skill is self-consistent and coherent across the ten files; the floor framing is
fully removed save the one unrelated metaphor; the by-design-untouched set is
untouched. **APPROVED.**
