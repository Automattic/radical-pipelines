# Code Review — Approved

Pipeline: 150 — Make guardrails prose (base run)
Tasks reviewed: 1, 2, 3, 4, 5, 6 (every task in `code-plan.md`)
Diff reviewed: `5bc233540d565e9b02fb6eb650454d74ca155fa8` → `HEAD`
Verdict: **approved**

## Verdict

Approved. This is a pure skill/Markdown prose change across the nine in-scope files. Per the project authoring rule "the skill is prose, not software — do not write structural tests that assert the content, sections, wording, or ordering of skill or agent files," no tests were written and none should exist; the design's E2E plan is intentionally empty. Verification is by reading the edited prose against the spec acceptance criteria and each task's per-task Acceptance — which is the means of verification the design prescribes. Every load-bearing property holds and no acceptance criterion is missed.

## What was verified (by reading)

### Task 1 — `reference/guardrails.md`

- **Definition (line 3).** Now a single positive sentence: "A guardrail is a prose rule an agent must satisfy." No "deterministic verification gate", "exact command", or exit-code framing; no "don't" clause.
- **Kinds (`## Guardrail kinds`).** Two labelled bullets — **command guardrail** (body tells the agent to run a command and confirm the check it describes is satisfied) and **judgment guardrail** (a prose rule the named agent satisfies by its own assessment, no command). **Fixed**/**Scoped** are nested sub-bullets under the command-guardrail bullet; the fact "Fixed/scoped is a property of command guardrails only; a judgment guardrail is neither" is stated in exactly one place (line 12).
- **The block (`## The `.rp.md` per-guardrail block`).** The `command:` field is renamed to a single kind-neutral `rule:` body field; `agents:` unchanged; `fill-guidance:` retained and tagged "optional; scoped command guardrails only". No second body field, no kind flag. Line 29 states a judgment guardrail's block is name + `rule` + `agents`, omitting `{scope}` and `fill-guidance`, the way a fixed command guardrail already omits `fill-guidance`.
- **Fill lifecycle.** Behavior unchanged; terminology-only ("scoped command guardrail", "guardrail → scope value"); `## Guardrail scopes` / `code-plan.md` / `doc-plan.md` references and per-phase independent-fill semantics intact.

### Task 2 — `reference/conventions/load.md`

- Guardrails-row "What it covers" cell now reads "The prose rules — command or judgment — a project's agents must satisfy" — covers both kinds, no exit-code/"deterministic"/"pass/fail" wording. `Required?` stays `No`; table shape unchanged. `## Local overrides` committed-only line untouched.

### Task 3 — `reference/conventions/passing.md`

- Guardrails field places each guardrail naming the agent **by its body**; for a scoped command guardrail substitutes the resolved `{scope}` into the body and places the resolved body; any other guardrail's body passes literally. `See reference/guardrails.md for the model.` pointer kept; five guardrail-running agents listed; "omit when … no guardrails" semantics kept. "Guardrail scopes to fill" is terminology-only ("scoped command guardrails"), still targeting only the plan agents, with no judgment-guardrail broadening. No exit-code framing.

### Task 4 — `reference/conventions/setup.md`

- "Why they matter" reframed as backpressure covering both kinds, no exit-code vocabulary, no "every guardrail is a command" implication.
- "What kinds to consider" keeps the command examples and adds a **generic** judgment-guardrail prompt ("a style or content rule an agent satisfies by its own assessment, with no command to run") — names no project-specific convention file (no `AGENTS.md`) and nothing tool- or tracker-specific.
- "Capture per guardrail" / "per-guardrail block"; pointer to `reference/guardrails.md` kept.
- Run-time validation scoped to **command guardrails**; judgment guardrails captured verbatim with the explicit commit-format analogy. Two outcomes stated without exit-code vocabulary: **runs ⇒ write it** (a command whose check currently fails is still written), **does not run ⇒ do NOT write it** (error surfaced to the owner; "and exit code" dropped). "did the command execute?" → "did the command run?". Side-effects and environment-parity guidance preserved in command-guardrail terms.

### Task 5 — `code-writer-tdd.md`, `code-writer-e2e.md`, `doc-writer.md`

- Each writer runs every **command** guardrail exactly as written, gates the commit on every guardrail's check being satisfied, keeps the no-bypass line, and uses the three-way sort with the two failure entries named "A command guardrail …" (so a commandless judgment body matches neither and raises no spurious blocker). The runs-but-not-satisfied case is stated without "exits non-zero"/"exit code". The per-task-Acceptance confirmation line is kept.
- Surrounding mentions updated: step-4 "Only commit when every guardrail's check is satisfied"; blocker parenthetical "a command guardrail cannot run"; "Failing tests or broken builds are not blockers" kept.
- **The two code writers' `### 3. Run the guardrails` sections are byte-identical** (verified with a direct diff — identical).
- doc-writer preserves its no-convention fallback "the step-3 accuracy verification is your only validation" (line 45), updates its step-3 sweep item to "If a command guardrail covers doc tests" (line 35), and its other guardrail mentions ("Failing doc guardrails are not blockers", blocker parenthetical), meanings preserved.

### Task 6 — `code-reviewer.md`, `doc-reviewer.md`

- Step 4 reject-path preserved (skip; record each guardrail **skipped**). Approve-path now tells the reviewer to **evaluate every guardrail** — run a command guardrail's command and check whether its check is satisfied, or assess a judgment guardrail's rule — recording a per-guardrail result; to approve, every guardrail must be evaluated and satisfied. The "exits non-zero is a rejection finding" line is replaced with the kind-neutral unsatisfied-finding rule that drives the verdict to reject and may leave remaining guardrails unevaluated (skipped). No-bypass line kept.
- Checks table relabelled `| Check | Guardrail | Result |` with legend **satisfied | unsatisfied | skipped**; the HTML comment is kind-neutral and states the middle column holds the body (command or rule) so a commandless row is valid — no new column.
- Blocker guideline: normal finding broadened to "a guardrail the reviewer finds unsatisfied" (both kinds); the cannot-run blocker stays command-guardrail-only ("a declared command guardrail cannot run"). "Run the guardrails" guideline updated to "evaluate every guardrail per step 4 and approve only if all are satisfied".
- **Both intentional differences preserved per reviewer:** code-reviewer keeps "To finally approve" and "your step-2/3 judgment stands"; doc-reviewer keeps "To approve" and "the step-3 accuracy spot-check is your only evidence". Cross-checked that neither reviewer leaked the other's phrasing.

## Skill-wide sweep

- **No "gate"/"Gate" remains as the noun for a guardrail** in any of the nine files. The only surviving "Gate" occurrences are the verb "Gate your commit on every guardrail's check being satisfied" in the three writers — verb usage prescribed by the plan, not the guardrail noun.
- **No exit-code framing** ("exit 0", "exit code", "exits non-zero", "judged pass/fail by exit code", "pass/fail") remains in any of the nine files. The single "deterministic" hit in `setup.md` is in the unrelated issue-slug section, outside the Guardrails scope.
- **Out-of-scope files correctly retain** "gate"/"scoped gate" terminology and the `| Gate | Scope |` header — `code-plan-writer.md`, `code-plan-reviewer.md`, `doc-plan-writer.md`, `doc-plan-reviewer.md`, and `reference/assisted-phases/3 - plan.md` are unchanged by this run (confirmed: empty `git diff --name-only` for them across `5bc23354 → HEAD`). This is the deliberate scope boundary, not a missed edit.
- **No tool-, tracker-, or project-specific mentions** were introduced into any guardrail prose; the judgment example is generic.
- **No structural tests** were added, correct per "prose, not software".

## Checks

This project defines no Guardrails convention, so there are no gates to run in step 4; the step-2/3 reading judgment above stands.

| Check | Guardrail | Result |
| ----- | --------- | ------ |
| —     | —         | None   |

No guardrails convention — nothing runnable to record.
