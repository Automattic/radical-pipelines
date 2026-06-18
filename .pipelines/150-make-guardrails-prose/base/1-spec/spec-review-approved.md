# Spec Review — Approved

## Verdict: approved

## Summary

The revised `spec.md` is sound. It reads the narrow/coherent design correctly (command guardrails re-expressed as prose, a new judgment-guardrail kind, the `{scope}` fill lifecycle preserved, the binary approve/reject verdict and must-fix model preserved, exit-code framing stripped), stays on WHAT not HOW, and its acceptance criteria are Given/When/Then-testable. The unified-block design (req 4), the `agents:`-field reuse (req 5), the writer trichotomy preservation (req 10), the reviewer Checks-table broadening (req 7/9), and the setup capture semantics (req 12) all match the actual worktree files I verified.

Both prior rejections targeted the same defect class — a file named in the exit-code-removal enumeration that has nothing to remove and nothing to broaden. Both are genuinely resolved, and I found no further instance of that defect class.

## Verification of the two prior rejections

- **Review 1 (`autonomous-workflow.md` / "spawn block"):** Resolved. `grep` over the spec for `autonomous.workflow` and `spawn block` returns nothing in any enumeration; the spawn-time Guardrails block is now attributed to "the passing convention file (which carries the spawn-time Guardrails block)" in req 13 (line 45), the final AC (line 75), and req 9 (line 32). I confirmed `autonomous-workflow.md` carries no guardrail/exit-code/command framing (its `## Conventions` handling at lines 62-64 delegates to `passing.md`), and that the real spawn-time framing lives at `reference/conventions/passing.md:10` ("place the resolved command; a fixed gate's command passes literally").
- **Review 2 (the assisted plan phase):** Resolved. "the assisted plan phase" no longer appears in the removal enumeration. The assisted-phase validation now appears **only** in Out of Scope (line 53: "the plan-reviewer and assisted-phase 'did the command's runner resolve and terminate?' validation, are execution checks, not exit-code checks. They are preserved, not removed."), exactly as review 2 asked. I confirmed `reference/assisted-phases/3 - plan.md` carries none of the four named exit-code phrases.

## File-attribution check (the removal/broadening enumeration, req 13 line 45 and final AC line 75)

Both enumerations now name an identical list, and every named file genuinely carries removal or broadening work — verified against the worktree (`worktree-150-make-guardrails-prose`, HEAD `2f92100`):

- **guardrails reference** — `reference/guardrails.md:3` "judged pass/fail by exit code" (definition). ✓ removal
- **convention loader** — `reference/conventions/load.md:22` same phrase. ✓ removal
- **setup convention file** — `reference/conventions/setup.md:183-184` "exit 0" / "exit code" / "the bar is 'it executed,' not 'exit 0.'" ✓ removal (load-bearing meaning preserved per req 12)
- **passing convention file (spawn-time Guardrails block)** — `reference/conventions/passing.md:10` "place the resolved command; a fixed gate's command passes literally" — command-presupposing framing to broaden so a judgment guardrail (no command) fits. ✓ broadening (req 9)
- **two code writers** — `code-writer-tdd.md:37,44` and `code-writer-e2e.md:28,35` ("its command is written"; "exits non-zero"). ✓ removal + broadening
- **doc writer** — `doc-writer.md:40,47` (same). ✓ removal + broadening
- **two reviewers** — `code-reviewer.md:43,72,76,114` and `doc-reviewer.md:45,74,77,115` ("each command is written"; "exits non-zero"; skipped-row "literal command"; `| Command |` column; "runs and exits non-zero"). ✓ removal + broadening

No preserved-unchanged file appears in the removal list.

`passing.md` is correctly included and is **not** the rejected defect class: unlike `autonomous-workflow.md` (no guardrail content) and the assisted plan phase (only a preserved execution check), `passing.md` carries genuine command-presupposing framing that req 9 requires to "read as prose covering both kinds." The parenthetical "(which carries the spawn-time Guardrails block)" in both enumerations signals the real work there, so the listing does not misdirect.

## Feasibility / accuracy spot-checks

- **Req 4 / AC line 64** (unified block; judgment guardrail omits `{scope}` and fill-guidance "the way a fixed command guardrail already omits fill-guidance"): matches `guardrails.md:21` ("fill-guidance: <optional; scoped gates only>"). The `command:` line generalizing to a prose body is feasible. Accurate.
- **Req 12 / AC line 73** (setup accepts a runnable-but-currently-failing command, rejects only an unrunnable one; judgment guardrail not run-validated, matching commit-format prior art): matches `setup.md:183-184` exactly. Load-bearing meaning correctly slated for preservation. Accurate.
- **Req 6 / AC line 66** (`{scope}` fill lifecycle preserved, no exit-code framing): the fill lifecycle in `guardrails.md` and `passing.md:10` is exit-code-free already. Accurate.
- **Req 8 / AC line 70** (judgment-guardrail violation rejects via existing must-fix machinery): matches `code-reviewer.md:109` / `doc-reviewer.md:110` ("Every issue is must-fix") and the per-gate reject path. Accurate.
- **Req 7/9 / AC line 69** (Checks table broadens so a no-command guardrail produces a valid row): matches the per-row command presuppositions at `code-reviewer.md:72,76` / `doc-reviewer.md:74,77`. Accurate.
- **Req 14 / AC line 76** carry the project's authoring rules, including "prose, not software — no structural tests assert the content … of skill or agent files." Correct and consistent with `CLAUDE.md`.

## Notes (non-blocking)

- The final AC (line 75) is framed as "no exit-code framing … remains," which is vacuously true for `passing.md` in isolation (it never carried any of the four phrases). This is acceptable: `passing.md`'s real obligation is the broadening work, which req 9 states and the parenthetical flags. It is not the rejected defect class, and tightening this further is optional, not required.
- Out of Scope and the consolidated-requirements Out-of-Scope correctly preserve the plan-reviewer / assisted "runner resolve and terminate" execution checks. No over-reach into them. Good.
