# Spec Review 1 — Rejected

## Verdict: rejected

## Summary

The spec is strong overall: it reads the narrow/coherent reading correctly (command guardrails re-expressed as prose, a new judgment-guardrail kind, the `{scope}` fill lifecycle preserved, the binary approve/reject verdict preserved, exit-code framing stripped), it stays on WHAT not HOW, and its acceptance criteria are mostly Given/When/Then-testable. The unified-block design (req 4), the `agents:`-field reuse (req 5), the writer trichotomy preservation (req 10), and the setup capture semantics (req 12) all match the actual worktree files I verified.

It is rejected for one load-bearing inaccuracy in its file enumeration that makes the central acceptance criterion partly unsatisfiable/misdirecting, plus a smaller related precision gap. Both stem from a stale source-line attribution carried over from `spec-research.md`. They are quick to fix and do not require reopening any design decision.

## Issues

### Issue 1 (must-fix): The spec names "the autonomous-workflow spawn block" as an exit-code-removal site, but that block — and any exit-code framing — does not exist in `autonomous-workflow.md`

**Where:** Requirement 13 (line 45) and the final acceptance criterion (line 75) both enumerate "the autonomous-workflow spawn block" as a place where exit-code / command-presupposing framing must be removed. Requirement 13's prose: "...across the guardrails reference, the convention loader, the setup and passing convention files, **the autonomous-workflow spawn block**, the assisted plan phase...". The final AC repeats it in its file list.

**What's wrong:** I read the entire `skills/radical-pipelines/reference/autonomous-workflow.md` (85 lines). It contains **no spawn-time Guardrails block and no guardrail/exit-code/command wording at all** — `grep -niE "exit|exact command|resolved command|pass/fail|gate|guardrail"` over it returns nothing. Line 66 (the line `spec-research.md` repeatedly cites as "the spawn block — 'a name and its exact command'") is the `## 6. Handle blockers` heading. The file's only contact with guardrails is line 63, which delegates the `## Conventions` block to `reference/conventions/passing.md`.

The actual spawn-time Guardrails block lives entirely in **`passing.md:10`** ("place the gates naming this agent... place the resolved command; a fixed gate's command passes literally"). That is genuine command-presupposing framing that this change must broaden — and the spec *does* reach it via the generic phrase "the passing convention files." So the substance is covered by `passing.md`, but the enumeration additionally points implementers at the wrong file under a name ("autonomous-workflow spawn block") that has nothing to edit.

**Why it matters (testability):** The final acceptance criterion — "Given the full set of guardrail-related files (... the autonomous-workflow spawn block ...), when an owner reads them, then no exit-code framing remains" — is the spec's central verification gate. For the autonomous-workflow file it is vacuously true (there was never any framing there), and it misdirects the reader away from `passing.md`, where the broadening actually has to happen. A spec whose whole purpose is "remove the framing from exactly these files" must enumerate the right files.

**Expected:** Drop "the autonomous-workflow spawn block" from the file list in requirement 13 and in the final acceptance criterion, and ensure the spawn-time Guardrails block is attributed to **`passing.md`** (e.g. "the passing convention file, which carries the spawn-time Guardrails block"). If the spec wants to keep naming the spawn block explicitly, name it at its real home (`passing.md`), not `autonomous-workflow.md`.

### Issue 2 (must-fix): "passing convention files" (plural) overstates the footprint and leaves the spawn block under-identified

**Where:** Requirement 13 (line 45): "the setup and **passing convention files**".

**What's wrong:** There is a single passing convention file — `reference/conventions/passing.md`. The plural, combined with Issue 1's misattribution of the spawn block to `autonomous-workflow.md`, leaves the one file that actually contains the spawn-time Guardrails framing (`passing.md:10`) named only obliquely and in the plural. After fixing Issue 1, this is the place the spawn-block edit must be anchored, so it should name `passing.md` precisely (singular) and make clear it is where the spawn-time Guardrails block lives.

**Expected:** Use the singular and tie the spawn-time Guardrails block to it — e.g. "the setup and passing convention files (the latter carries the spawn-time Guardrails block)". This also closes Issue 1's gap.

## Notes (not blocking, optional to address)

- The Consolidated Requirements (requirement 13, research line 232) and the spec's Out-of-Scope correctly preserve the plan-reviewer / assisted "did the command's runner resolve and terminate?" execution checks (`assisted-phases/3 - plan.md:118,211`) — I verified those lines exist and are execution, not exit-code, framing. Good. No change needed; flagged only to confirm the spec did not over-reach into them.
- Requirement 4's claim that "a fixed command guardrail already omits fill-guidance" matches `guardrails.md:21` ("fill-guidance: <optional; scoped gates only>"). Accurate.
- The exit-code inventory in requirement 13 (guardrails reference, convention loader, setup, the two writers, the e2e writer, the doc writer, the two reviewers) matches my `grep` across the worktree exactly. The only enumeration error is the autonomous-workflow/passing attribution above.
