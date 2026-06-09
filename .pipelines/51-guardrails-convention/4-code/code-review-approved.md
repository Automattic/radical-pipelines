# Code review — Guardrails convention (#51), Phase 4 (Code): APPROVED

**Verdict: APPROVED.** All of Task 2–Task 10 are accepted. Every spec acceptance
criterion (AC1–AC12) holds in the shipped files, the code-plan's post-edit acceptance
sweep passes in full, and both declared gates pass.

- **Base:** `a831f6d` → **HEAD:** `8bb3a41` (confirmed via `git rev-parse`).
- **Review iteration:** N = 1.
- **Scope:** documentation-only; "behavior" = prose correctness, verified by reading
  and grepping the shipped files.

## Gates run (commands + results)

| Gate | Command | Result |
| --- | --- | --- |
| Changeset shape | `node scripts/validate-changesets.mjs` | exit **0** ✓ |
| Unit tests | `node --test scripts/test/*.test.mjs` | **22/22 pass**, exit **0** ✓ |

(Bare `npm test` exits 1 only due to the Node 20.19 `**` glob — not a regression, as
noted in the dispatch. The two declared guardrails both pass, which is the relevant
signal: this PR satisfies its own dogfooded gates.)

## Acceptance criteria — all satisfied

- **AC1 / AC12 (`.rp.md` structure + worked example).** Exactly two top-level sections:
  `## Conventions` (`.rp.md:5`) then `## Guardrails` (`.rp.md:82`), siblings, in order.
  No `## Shared conventions` remains. All eight `###` children preserved verbatim
  (Managing tasks, Pipeline slugs, Artifact folders, Commit format, Worktrees, Branch
  names, Team spawning, Health monitoring). H1 broadened to
  `# Radical Pipelines project configuration`; intro rewritten to name conventions +
  guardrails and drop the false "per-tool sections exist in this file" claim
  (D2/must-address #2). Worked-example table declares exactly the two real gates
  (`npm test` → `code`; `node scripts/validate-changesets.mjs` → `code, docs`) with the
  correct phase mapping per design §4. No new tooling invented.
- **AC2.** Each guardrail row states Name, exact Command (backticked), and Phases drawn
  from `code`/`docs`.
- **AC3.** No tool column or per-tool variant anywhere — tool-agnosticism is structural.
- **AC4 (completeness check).** `load.md`'s conventions table is unchanged and has no
  Guardrails row; `## Missing conventions` (operates only on the `Required?` column) is
  untouched, so a project with no guardrails passes by construction.
- **AC5 (optionality, no blocker).** `load.md:38` states absent/empty = valid, complete,
  never a blocker. code-writer.md:51 adds the positive optionality sentence; doc-writer.md:44
  reads explicitly "not a blocker — run none and proceed"; both reviewers' "no guardrails
  apply → spot-check is the sole validation" paths preserved.
- **AC6 (loader).** `load.md` `## Guardrails` (line 31) sits after `## Missing conventions`
  (23) and before `## Local overrides` (45) — design D4 reading order. Defines a guardrail
  (exact command, exit-code pass/fail), the Name|Command|Phases shape, tool-agnosticism,
  the verbatim selection phrase, optionality, and the **D5 committed-only** sentence
  (load.md:43). Not a conventions-table row.
- **AC7 (setup).** `## 3. Capture guardrails (optional)` inserted as a sibling of step 2;
  marked optional in heading + prose; elicits per-gate name/command/phase(s); notes
  tool-agnosticism; distinct from conventions. Clean renumber 3→8; the two write steps
  carry the `## Guardrails` section.
- **AC8.** `grep "verification convention"` across all four agents → **zero hits**. No
  residual "the convention" / "verification gate" / "verification gates" command-gate
  back-references remain (verified by grep). All Risk-4 surfaces re-anchored:
  code-writer.md:48; code-reviewer.md:32 + :97; doc-writer.md:42/44; doc-reviewer.md:33/:98.
- **AC9.** Every command-gate reference selects the agent's phase guardrails using the
  canonical phrase "the guardrails applicable to the [code|docs] phase" (load.md,
  code-writer:44–48, code-reviewer:18/32/97, doc-writer:38–42, doc-reviewer:33/98).
- **AC10.** No-bypass language preserved verbatim except gate→guardrail
  (code-writer.md:50, doc-writer.md:43). No "unrunnable = blocker" rule reintroduced; the
  old missing/unrunnable-convention blocker lines are deleted (code-writer.md, doc-writer.md)
  and the in-list "verification convention is undefined/missing" clauses struck from all
  four blocker lists.
- **AC11.** Behavior verification (code agents) and accuracy verification (doc agents)
  remain separate, self-contained, evidence-naming steps; "behavior verification" removed
  from the code-writer gate enumeration (Risk 3 — the easiest-to-miss R15 edit, done at
  code-writer.md:46). All R16-protected references intact and unchanged:
  code-writer 29/38/42/56/68; code-reviewer 30/31/84; doc-writer 17/27/59/62 (line shift
  from a net deletion; content verbatim); doc-reviewer 6/19/32.

## Post-edit acceptance sweep (code-plan "Notes for the code phase") — all six pass

1. `grep "verification convention"` across the four agents → zero hits naming the
   command-gate source. ✓
2. Behavior/accuracy verification remains a separate evidence-based step in each. ✓
3. Every command-gate reference selects the agent's phase guardrails with the canonical
   phrase (incl. all non-literal Risk-4 back-references). ✓
4. No-bypass language preserved (gate→guardrail). ✓
5. No-guardrails-is-not-a-blocker holds; no "unrunnable = blocker" rule reintroduced. ✓
6. All R16-protected references untouched. ✓

## Other authoritative checks

- **`load.md`** intro broadened to "conventions and guardrails"; canonical definition,
  selection phrase, never-a-blocker optionality, and D5 committed-only all present;
  conventions table + completeness check unchanged (no guardrail row).
- **`pi.md`** reference is now number-free and resolves to the right step:
  "the **Apply agentic coding tool setup actions** step of `setup.md`" (D7).
- **Changeset** (`.changeset/guardrails-convention.md`) is well-formed:
  `"@automattic/radical-pipelines": minor`, non-empty imperative summary ("Add the
  Guardrails convention…") matching the existing feature-changeset register
  (`local-convention-overrides.md`, `per-agent-model-config.md`). Passes the shape
  validator.

## Deliberate non-change — judged acceptable

- The generic-prose word "gate" survives at **code-writer.md:56** and the parallel
  **doc-writer.md:49** ("Only commit when every gate passes") and **doc-writer.md:64**
  ("Failing doc gates are not blockers"). The dispatch flagged only code-writer.md:56;
  the two doc-writer twins are the same generic-umbrella usage and the plan's per-task
  change lists did not enumerate them. Design §10 explicitly resolves this: renaming
  prose "gates" → "guardrails" is recommended but **"gates" is tolerable**. Critically,
  none of these name a guardrail *source* (the AC8 concern) — they are umbrella references
  in commit-step and blocker-tail prose, and `grep "verification convention"` is clean.
  The parallel sentence at code-writer.md:68 ("Failing tests or broken builds are not
  blockers") was likewise left generic. Consistent treatment; not an inconsistency.

## Minor observation (non-blocking, not a rejection)

- The changeset summary's lead phrase "the Guardrails **convention**" uses "convention"
  colloquially (the established feature/practice), not in the technical `## Conventions`
  taxonomy sense the spec separates guardrails from. The body immediately frames it
  correctly as "a sibling of `## Conventions`," and the pipeline names the work
  "Guardrails convention" throughout (issue #51, spec/design/plan titles). This is a
  user-facing release-note register choice, not a contradiction of the structural
  separation, and it is the docs-phase's surface to refine if desired. Recorded, not
  actioned.

**No tasks to re-dispatch. Phase 4 (Code) is approved.**
