# Code Plan Review: Make guardrails prose

## Verdict: approved

## Summary

The plan is a coordinated prose edit across exactly the **nine in-scope files**, ordered so the
canonical model (`reference/guardrails.md`) is rewritten first and the five dependent files follow.
I verified every cited file and line against the worktree, traced all sixteen acceptance criteria to
tasks, and swept all nine files for the exit-code framing and "gate" terminology the change must
remove. Every exit-code occurrence and every "gate"-as-noun occurrence maps to a task that removes
it, the two byte-identical code-writer sections are correctly mandated to stay identical, the four
plan agents and `assisted-phases/3 - plan.md` are correctly excluded, and the reviewers' two
intentional differences and doc-writer's no-convention fallback are preserved. This being a pure
skill/markdown prose change, the empty E2E plan and the read-driven (no structural test) verification
are correct per the project "prose, not software" rule — not defects. The plan is implementable,
fully traceable, and correctly scoped.

## Scope-validation step

`## Guardrail scopes` renders as `None` (this project defines no Guardrails convention, so no scoped
gates were passed to this phase). That is the valid rendering; there is nothing to execute in the
scope-validation step.

## What I verified

### Feasibility against real paths

- All nine in-scope files exist at the paths the plan's Files-to-change lists cite:
  `skills/radical-pipelines/reference/guardrails.md`,
  `skills/radical-pipelines/reference/conventions/load.md`,
  `skills/radical-pipelines/reference/conventions/passing.md`,
  `skills/radical-pipelines/reference/conventions/setup.md`,
  `agents/code-writer-tdd.md`, `agents/code-writer-e2e.md`, `agents/doc-writer.md`,
  `agents/code-reviewer.md`, `agents/doc-reviewer.md`. The agent profiles live at the repo-root
  `agents/` directory, which matches the plan's `agents/...` paths.
- The four plan agents (`code-plan-writer.md`, `code-plan-reviewer.md`, `doc-plan-writer.md`,
  `doc-plan-reviewer.md`) and `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
  exist and appear in **no** task's Files list. The assisted-phase file still carries
  `| Gate | Scope |`, "scoped gate," and the "did the command's runner resolve and terminate?"
  execution check — correctly retained per design ("Deliberately not changed" and the
  "Scope-boundary terminology mismatch" risk).
- Cited section/line anchors are accurate: `guardrails.md` definition (3), `## Gate kinds` (5),
  `## The .rp.md per-gate block` (12), `## The fill lifecycle` (26); `load.md` Guardrails row (22);
  `passing.md` Guardrails field (10) and scopes-to-fill (13); `setup.md` 173/175/177/179/186;
  the reviewer step-4 / Checks-table / guideline anchors; doc-writer step-3 (35) and step-4 (38–48).

### Exit-code-framing coverage (sweep of all nine files)

I grepped every in-scope file for `exit 0 | exit code | exits non-zero | pass/fail | non-zero |
judged pass`. Every hit maps to a task that removes it:

- `guardrails.md:3` → Task 1; `load.md:22` → Task 2; `setup.md:183–184` → Task 4;
  `code-writer-tdd:44` / `code-writer-e2e:35` / `doc-writer:47` ("exits non-zero") → Task 5;
  `code-reviewer:43,74,114` and `doc-reviewer:45,76,115` → Task 6 (the step-4 "A gate that exits
  non-zero" replacement, the Checks-table `pass/fail` legend swap, and the normal-finding-list
  "a gate that runs and exits non-zero" replacement are each named explicitly).

No exit-code occurrence in any in-scope file is left unaddressed.

### "gate"-terminology sweep (five agent profiles)

I enumerated every `gate` occurrence in the five profiles. All fall inside a rewritten "Run the
guardrails" section, or are named explicitly (code-writers' step-commit "every gate passes" and
blocker parenthetical; doc-writer's step-3 "If a gate covers doc tests," line-67 "Failing doc
gates," and other mentions via the catch-all instruction; the reviewers' Checks-table comment,
"Run the guardrails" guideline, and blocker guideline). Each task carries an acceptance criterion
asserting no "gate"/"Gate" survives as the noun for a guardrail in its files, which closes the sweep.

### Byte-identity and intentional differences

- The two code-writer "Run the guardrails" section bodies are byte-identical today (confirmed by
  diff). Task 5 mandates one replacement applied identically to both, plus an acceptance criterion
  asserting post-edit byte-identity. Correct.
- doc-writer's no-convention fallback "the step-3 accuracy verification is your only validation"
  (line 45) is real and preserved by Task 5.
- The reviewers' two pre-existing intentional differences are real and preserved by Task 6:
  code-reviewer "To finally approve" (43) / "your step-2/3 judgment stands" (45); doc-reviewer
  "To approve" (45) / "the step-3 accuracy spot-check is your only evidence" (47).

### Coverage, ordering, granularity, scope

- All sixteen acceptance criteria trace to tasks (see the non-blocking note below on R5/AC5).
- Ordering is sound: Task 1 (model, depends on none) precedes Tasks 2–6, which each depend on Task 1
  because every file reuses the model's vocabulary and points at `guardrails.md`. No circular or
  forward dependencies.
- No hidden design decisions: the deferred wording calls (the prose body-field label `rule:`, the
  judgment-guardrail prompt wording) are explicitly flagged non-load-bearing and match the design
  doc's stated open question; the plan adds no kind flag and no second body field (design decision 3).
- Scope is exactly the nine files; the `{scope}` lifecycle, the plan agents, the assisted-phase file,
  and the binary-verdict machinery are correctly left untouched.

## Non-blocking observations (do not require revision)

- **R5/AC5 not explicitly traced.** Spec R5 / its acceptance criterion (the `agents:` field confines
  a judgment guardrail to reviewers so writers never receive it) is not named in any task's
  "Traces to." It is nonetheless satisfied: Task 1 keeps `agents:` unchanged and Task 3 keeps the
  "place each guardrail naming this agent" placement and the five-agent list — the exact mechanism
  R5/AC5 describes — and the design doc covers it fully (Interfaces step 4; Failure Modes). This is a
  preserved-behavior requirement covered by explicit "keep unchanged" instructions, so it is a
  traceability-annotation nit, not a coverage gap.
- **One-line off-by-one in a line citation.** Task 5 cites the code-writer-tdd guardrail section as
  "lines 36–45"; the section header is line 35 and the body runs 37–45 (line 36 is blank). The
  section is unambiguously identified by name and the byte-identity constraint is captured correctly,
  so this is a cosmetic annotation imprecision with no effect on implementation.

These observations are informational; neither blocks the plan.
