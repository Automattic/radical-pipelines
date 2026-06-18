# Design Doc Review — APPROVED

Issue 122: Plan-driven test selection and reviewer-side behavior verification (BASE run, skill self-edit, branch stacked on #121).

## Verdict

Approved. The design fully and correctly satisfies spec R1–R10 and AC1–AC8, is internally consistent and implementable, grounds every per-file edit in the actual current branch state, respects scope, and captures the lockstep obligations.

## Verification performed

All load-bearing file/line claims were checked against `git show HEAD:<file>` on `worktree-122-plan-driven-test-selection`:

- **`agents/code-plan-writer.md`** — "Do NOT plan tests" + "derived from browser verification" at L64 ✓; "the code-writer turns them into tests in the RED phase" actor at L60 ✓; plan structure `## Overview`→`## Tasks` with task block fields (`Goal` first) ✓.
- **`agents/code-plan-reviewer.md`** — "No test planning" + "derived from browser verification" at L28 ✓; Coverage L21, Feasibility L27 ✓; step order (1 Gather / 2 Review / 3 Write) confirms the new execute step inserts cleanly as step 2 ✓; reviewer already explores the worktree (L15), grounding the "better parity than setup.md" claim ✓.
- **`agents/code-writer.md`** — L13 guardrail-read, L20 "unit tests derived…" (the still-true usage left untouched), L24 e2e-not-in-RED, L26-32 doc block, L34/L36 verification body, L38 UI-conventions (inside the removed step 3), L40-42 derive-e2e step, L44 step-5 rename target, L46 back-ref, L51-54 outcome model, L65 self-containment — every line claim in §3/research matches ✓.
- **`agents/code-reviewer.md`** — L29 test-quality, L33 heading, L35 verification body + evidence sentence, L79/L81 template, L110 guideline — all match ✓.
- **`reference/conventions/load.md`** L30 enumeration; **setup.md** L183 option list, L189 example row, L193 "None is valid", L195-211 owner-driven validate-by-executing pattern (grounds the assisted §8 mapping) — all match ✓.
- **`reference/autonomous-phases/4 - code.md`** — L3 overview, L25 `code-writer` row ("verifies behavior, validates"), L30 step 1, L33 launch + parenthetical, L34/L35 generic plural, mermaid node — all match ✓.
- **`reference/assisted-phases/3 - plan.md`** — L25/L59/L96/L114 abstract role mentions; L30 constraint, L117 self-check, L152 narrowing; L109 coverage self-check; L135 `Goal` for Type insertion; skeleton L127-145; "No agents are spawned" L3 — all match ✓.
- **`reference/assisted-phases/2 - design-doc.md`** — L48/L81/L100 abstract role mentions ✓.
- **`README.md`** L112 — sole `code-writer` roster hit ✓.
- **Untouched confirmed:** `SKILL.md:39` (behavior verification stays a phase-4 output), `doc-writer.md:64` (incidental example, not a roster/dispatch claim), `autonomous-phases/3 - plan.md` (no test-planning content), inert-guardrail rule (no migration text).
- A full `git grep` for `code-writer` across the skill tree (excluding `.pipelines/`) confirms the design's reference inventory is complete — no live contradicting hit is missed.

## Spec satisfaction

- **R1/AC1** — pure-data `## Required test commands` table (`Name | Command | Covers`), floor, "none" valid, two-question discipline left at the consumers; keeps the artifact standalone. ✓
- **R2/AC1** — `## E2E test plan` as `### Flow N` blocks (Steps/Expected/Traces to), concrete for both consumers; standalone section (reviewer reads it directly). ✓
- **R3/AC1** — prohibition inverted in lockstep across code-plan-writer (L64), code-plan-reviewer (L28), assisted (L30/L117/L152); false phrase removed; unit-TDD boundary preserved; unit-test planning not mandated. ✓
- **R4/AC2** — execute-each-command step (did-it-resolve-and-terminate; zero/missing tests legitimate at plan time; unrunnable rejects; per-command independent; destructive caveat), plus coverage + e2e-coverage checks, plus reworked "No unit-test planning". Restated inline, no setup.md path link. ✓
- **R5/AC3** — old file deleted; two files with correct `name:` frontmatter; `Type: tdd | e2e` enum mapping literally to agent names; dispatch at launch with the verbatim block (no new slicing); each writer selects guardrails naming it plus no-agent guardrails AND runs the floor before commit. ✓
- **R6/AC3** — verification + e2e-self-derivation removed with back-refs; UI-conventions duty preserved in the tdd writer only (sound: e2e drives already-built UI). ✓
- **R7/AC4** — step-3 free-form verification + evidence text kept byte-identical; re-drive sentence inserted before the evidence sentence so the evidence requirement closes over both; template/guideline byte-identical; L29 light tie-to-plan correctly scoped as in-bounds. ✓
- **R8/AC5** — load.md L30 ⇄ setup.md L183 carry the same five-agent set (two views); L189 example updated; no migration text. ✓
- **R9/AC6** — two writer rows, "verifies behavior" dropped, "validates"→"runs the gates", type-conditional launch, Type added to the field list; generic plural + mermaid retained as not-dispatch-target. ✓
- **R10/AC7** — assisted gains both sections + Type + inverted rules; command-execution validation maps to setup.md's existing owner-driven driver-executes-and-surfaces pattern (assisted spawns no agents, so dropping it would ship unvalidated commands — correctly rejected); README roster updated; abstract role mentions correctly left. ✓
- **AC8** — no migration/backward-compat text; inert-guardrail rule (load.md L30) covers a guardrail naming a now-gone agent. ✓

## Scope and standalone discipline

- `.rp.md` self-edit correctly held out as an operational follow-up, not a skill deliverable.
- Unit-test selection stays with the TDD writer; reviewer evidence text stays byte-identical with only the re-drive sentence added.
- Lockstep trio (load.md ⇄ setup.md ⇄ README roster) captured; the e2e-writer self-containment carve-out is reconciled with the existing "other tasks" scoping and serves both consumers from one standalone section.
- The matched-pair check (plan-reviewer executes the floor ⇒ writer-time unrunnable = drift) is well-founded and makes the floor's drift rule sound.
- Planner ordering obligation for an e2e command in the floor is correctly flagged as the planner's duty (per R1), not a seam of this design.

## Non-blocking note (for the code phase, no revision required)

§4 labels the insertion point as "the end of L34's paragraph, BEFORE the L35 evidence sentence." The behavior-verification body and its evidence sentence are in fact a single line (L35); L34 is blank. The insertion target and ordering are nonetheless unambiguous from the content anchor ("before the evidence sentence … capturing evidence as above"), and the byte-identical constraint is on the evidence *text*, which is preserved. This is a line-label imprecision, not a design defect.
