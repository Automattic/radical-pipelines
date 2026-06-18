# Code Review: Guardrail documentation split (review-3) — APPROVED

**Batch:** Tasks 1, 2, 3 from `3-plan/code-plan.md`.
**Base ref:** `2e88eb7` (parent of the intent commit). Reviewed `git diff 2e88eb7..HEAD -- skills/ agents/ AGENTS.md`.
**Change class:** documentation-architecture re-baseline (skill prose; behavior unchanged).

## Verdict

Approved. The two genuine edits (Tasks 1 and 2) match the plan exactly and do not over-reach; the re-baseline premise (Task 3) holds against the live tree at HEAD.

## Diff under review

Two files, both on the guardrails reading path:

- `skills/radical-pipelines/reference/guardrails.md` (commit `91be728`) — Task 1.
- `skills/radical-pipelines/reference/conventions/passing.md` (commit `6a4ec86`) — Task 2.

`git diff --name-only 2e88eb7..HEAD -- skills/ agents/ AGENTS.md` lists exactly these two files. No third file changed.

## Task 1 — `docs-plan.md → doc-plan.md` typo fix

- The diff changes exactly one token on the fill-lifecycle line (`~line 32`): `docs-plan.md` → `doc-plan.md`. Nothing else in the file changed.
- Tree-wide `grep -rn "docs-plan.md" skills/ agents/` returns zero matches.
- The rest of `guardrails.md` (gate kinds, the `.rp.md` per-gate block, the fill-lifecycle prose) is byte-for-byte as shipped; the file still names only `.rp.md` and the plan artifacts — no reference edges.

All three acceptance criteria met. Traces to spec req 8 / AC 8.

## Task 2 — `Guardrails:` bullet upgraded to an active resolve instruction

New bullet (`passing.md:10`):

> **Guardrails:** place the gates naming this agent. For a scoped gate, read its chosen scope value from the plan's `## Guardrail scopes` section, substitute it into the gate's `{scope}` command, and place the resolved command; a fixed gate's command passes literally. See `reference/guardrails.md` for the model.

Against the per-task acceptance:

- Imperative addressed to the orchestrator at spawn (not the prior passive field-content description). Met.
- Scoped gate: instructs read of the plan's `## Guardrail scopes` value, substitution into the `{scope}` command, and placing the resolved command. Met.
- Substitution guarded to scoped gates; a fixed gate's command described as passing literally with no read/substitute. Met.
- Resolved-command definition folded into this one bullet ("place the resolved command"), not stated separately; still defers to `reference/guardrails.md` for the model and restates none of it. Met.
- The bullet's `Agents:` applicability line and omit rule are unchanged (diff touches only line 10; lines 11–12 untouched). The `## Conventions` preamble and the **Artifact folder:**, **Commit format:**, and **Guardrail scopes to fill:** bullets are unchanged. Met.
- No resolve/`{scope}`-substitution wording appears in `guardrails.md`, phases 4/5, or any other reading-path file — resolve appears only on this bullet (sweep below). Met.

Wording-quality note (not a defect): the bullet says "the gate's `{scope}` command" where the design prose says "`{scope}` command template." This is the skill's intended terseness; the plan's acceptance text uses the same shorter phrasing, and "the gate's `{scope}` command" is unambiguous. The bullet reads in the same terse single-line style as its neighbors.

Traces to spec reqs 2, 6 / AC 2, 6.

## Task 3 — verification of the re-baseline premise (live-tree sweep at HEAD)

Every claim the design relies on was confirmed by observation:

- **`guardrails.md` = model only.** Gate kinds, the `.rp.md` block, the fill lifecycle; no validation, no resolve/`{scope}`-substitution verbs, no spawn-field labels. It names only `.rp.md` and the plan artifacts — references nothing back (sink). Single reading path `passing.md → guardrails.md` holds.
- **`passing.md` = how guardrails reach agents.** Sole home of both spawn fields plus the folded-in resolved-command definition; references `guardrails.md` for the model. The spawn-field labels (`Guardrails:`, `Guardrail scopes to fill:`) appear nowhere else on the path.
- **Validation homes.** The fixed/scoped capture-time probe is in `setup.md:179`; the substitute-and-execute filled-command check is in `code-plan-reviewer.md` and `doc-plan-reviewer.md` (identical "Validate the `## Guardrail scopes`" step) and mirrored by the assisted `3 - plan.md` self-checks (lines 118, 211). None of this is in `guardrails.md`.
- **Resolve in exactly one home.** A `resolve|substitut|{scope}` sweep across `skills/` finds the only guardrail-resolve instruction on `passing.md:10`. Other hits are either the model's own `{scope}` mentions in `guardrails.md`, the validation homes above, or unrelated generic English ("resolve" in `autonomous-workflow.md`'s Agent-models line, `health-monitoring.md`, `load.md`; "substitute" in `manage-issues.md`). No stray resolve line on the path.
- **Phases 4/5.** `4 - code.md` and `5 - docs.md` contain no resolve/substitution/`{scope}` step (grep exit 1).
- **Agent self-containment.** `AGENTS.md:14` states the rule verbatim ("an agent reads only its own profile and its initial prompt"; profiles must not reference any skill file or `.rp.md`). All five running-agent profiles (`code-writer-tdd`, `code-writer-e2e`, `code-reviewer`, `doc-writer`, `doc-reviewer`) contain no skill-file or `.rp.md` reference; each names "the guardrails convention" / the `Guardrails:` field it receives.
- **No stray edits.** Only `guardrails.md` and `passing.md` changed in this pipeline.

All six acceptance criteria met. Traces to spec reqs 1–5 / AC 1–5.

## Test quality / E2E

The plan's E2E test plan is `None`, which is correct: this pipeline edits skill Markdown only — there is no runnable feature surface and no e2e suite. The project rule forbids structural tests over skill/agent prose, so there are (correctly) no such tests. Nothing in the test plan is missing.

## Behavior verification

This change is documentation-only (skill prose). It introduces and changes no runtime, no executable feature surface, and no user-observable behavior:

- Task 1 corrects a one-word typo in reference prose.
- Task 2 rewrites the `Guardrails:` field's documentation from a passive description into an active imperative. The spec and design establish — and the code confirms — that this writes down an obligation the orchestrator already had: for any scoped gate to run at all, the `{scope}` substitution must already happen orchestrator-side before spawn, because running agents receive only the resolved command and act solely on what they receive. No field, artifact, phase step, or who/when/what-the-agent-receives changes.
- Task 3 changes no files.

There is therefore nothing to exercise end-to-end and no observable runtime to drive — the conclusion is reached by reasoning about the nature of the change (prose with no executable surface), not by skipping the step. The E2E `None` and the absence of behavior verification are both correct.

## Guardrails

This project's `.rp.md` defines no guardrails; there are no `Guardrails:` gates to run for this batch.
