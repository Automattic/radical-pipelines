# Code Plan Review — APPROVED

_Pipeline: `121-role-scoped-guardrails`, review run `review-1-agent-scoped-guardrails`. Reviewed `3-plan/code-plan.md` against `1-spec/spec.md` (AC1–AC13) and `2-design-doc/design-doc.md` (§9 deliverable map, decisions D1–D5)._

## Verdict: approved

The plan fully covers the design's §9 deliverable map and AC1–AC13, stays strictly within the six in-scope files, has accurate line/anchor citations verified against the live tree, and has sound ordering and verifiable acceptance criteria.

## Verification performed

All anchors were checked against the LIVE files via `git show HEAD:<file>` on branch `worktree-121-role-scoped-guardrails` (the base-run state — confirmed `HEAD` carries the base-run changes the design depends on).

**`load.md`** — loader-table row `:22`, ¶1 `:26`, ¶2 `:28`, ¶3 `:30`, committed-only `:46`: all match the plan's T1 anchors and quoted text exactly.

**`setup.md`** — section intro `:173`, "Capture per gate" name/command/phase/level bullets `:181`/`:182`/`:183`/`:184`, example table `:186-192`, "None" line `:194`, validation block `:196-213`: all match T2.

**`code-writer.md`** (already level-keyed by the base run) — step 1.2 read `:13`, step 5 already titled "Run the writer guardrail selection" `:44-55`, blocker bullet `:73`: confirmed. The plan correctly recognizes the level phrasing survives at `:13` only and that step 5's body already uses the agent-agnostic "writer guardrail selection" wording.

**`code-reviewer.md`** (already restructured by the base run) — guardrail-read `:18`, dedicated step 4 `:37-45` (bridge `:39`, run `:41`, fail-fast/skipped `:43`, approval/stateless `:45`), Checks comment block `:71-77`, Guidelines run-guardrails bullet `:110`, two-question bullet `:111-114`, drift-guard blocker `:115`: all confirmed. The plan correctly treats this as a vocabulary re-key only, with the three level occurrences at `:18`/`:41`/`:110`.

**`doc-writer.md`** (trunk state) — step 3 `:35`, step 4 `:38-48` (title `:38`, intro `:40`, obligations `:42-43`, two-question `:44-47`, empty-selection `:45`), Guidelines blocker `:67`: all match T5.

**`doc-reviewer.md`** (trunk/pre-base state) — 5-step structure confirmed (Gather `:12` → Review `:22` → Accuracy spot-check `:35` → Write review `:39` → Commit `:83`); guardrail bullet to remove at `:33`; Checks template `:63-65`; Accuracy spot-check section `:67-69`; commit step reference "step 4" at `:85`; Guidelines `:89-99`. The target 6-step structure in T6 correctly mirrors `code-reviewer.md`'s confirmed 6-step shape (with the documented doc-specific deviations: Accuracy spot-check in place of Behavior verification, bridge ¶ naming both judgment checks), and the renumbering (Write review 4→5, Commit 5→6, reference "step 4"→"step 5") parallels code-reviewer's "step 5" commit reference at `:97`.

## Adversarial checks that passed

- **Grounding error guard.** The prior-phase grounding concern (design misdescribing code-writer/code-reviewer current state) does not propagate: the plan's anchors reflect the already-level-keyed `code-writer.md` (step 5 pre-titled, level phrasing at `:13` only) and the already-restructured `code-reviewer.md` (dedicated step 4, Checks comment block, three level occurrences), both verified against `git show HEAD`.
- **Hidden step reference in doc-reviewer.** `doc-reviewer.md:33` also carries a "step 3" reference, but that bullet is removed entirely by T6.2, so it needs no renumbering — the only surviving reference to update is `:85` ("step 4"→"step 5"), which T6.6 covers. No dangling reference left behind.
- **Setup section-intro phase phrasing.** The design's §9/D2 names only `load.md:22` for the "phases must pass" phrase, but setup.md's section intro (`:173`) carries the same phase phrasing. T2.1 correctly catches and re-words it — in-scope (still within setup.md) and required by AC11/R8 ("no phase dimension in the Guardrails section"). A sound catch, not scope creep.
- **Scope confinement.** Each of the six tasks owns exactly one file; no task touches `.rp.md`, the changeset, README, CHANGELOG, runbooks, or the serialization syntax. AC13 satisfied; AC12 correctly deferred to the docs phase with no code task.
- **Ordering/independence.** Tasks touch disjoint files and are correctly marked parallel-safe. T6 templates on `code-reviewer.md`'s committed base-run structure (live tree), not T4's output; since T4 is a vocabulary re-key preserving structure, the template is stable regardless of order. The shared cross-file contract is the documented wording convention, not a runtime dependency.
- **AC4 serialization-decoupling.** T1 captures the "no Agents column / blank Agents cell both resolve to all-agents" semantics decoupled from serialization, and the ¶1/¶2 scope distinction (a guardrail naming no agents vs. an absent declaration) is preserved with no conflation.

## Minor, non-blocking notes (writer matches on quoted text, so these do not affect execution)

- T6.5 cites the doc-reviewer Checks template as `:62-65`; the table proper is `:63-65` with `## Checks` at `:61` and a blank `:62`. Orientation-only off-by-one; the quoted `Check | Command | Result` text and the "clone the comment block from `code-reviewer.md:71-74`" instruction are unambiguous.

No findings rise to the level of rejection. The plan is approved.
