# Spec Research: Guardrail documentation split (review-3)

Re-baseline of review-2's "comprehensive `guardrails.md`" decision. The owner shipped a documentation-architecture change directly on the branch; behavior is unchanged. The spec must describe the **shipped** state as the desired outcome and must not contradict the shipped skill (notably review-2's Acceptance Criterion 1).

## Shipped state (grounding, from the worktree)

- `reference/guardrails.md` — slimmed to the **model only**: gate kinds (fixed/scoped), the per-gate `.rp.md` block, the fill lifecycle. Its old Validation, Resolve-and-run, and Spawn-fields sections are gone.
- `reference/conventions/passing.md` — the single home for the `## Conventions` spawn block, including the `Guardrails:` and `Guardrail scopes to fill:` fields, and the "resolved command after `{scope}` substitution" definition. References `guardrails.md` for the model.
- Validation lives where it is performed: the setup probe in `reference/conventions/setup.md` (validate fixed by running literally; validate scoped by substituting a realistic made-up `{scope}`); the plan-phase check in the plan-reviewers / phase 3.
- `AGENTS.md` rule: agent profiles are self-contained — they reference no skill file or `.rp.md`; an agent reads only its own profile and its initial prompt. Such references were removed from agent profiles.

## Open threads

- Reframe review-2's Acceptance Criterion 1 (currently: `guardrails.md` explains "how guardrails reach agents... without reading the agent files" — now false).
- Whether `passing.md`'s `Guardrails:` line should stay a passive description or become an active substitution instruction (intent open question).

## Q&A

### Q1 — Map of the shipped split (reading-path direction)

I had already read both files; the verbatim content is captured in "Shipped state" above. The researcher confirmed and surfaced two findings:

- **Naming drift.** `guardrails.md:32` names the doc-plan artifact `docs-plan.md`, but every other reference (30+ across skill and agents) calls it `doc-plan.md` (singular). A lone typo in the slimmed file.
- **Resolve-before-spawn step is missing from the orchestrator path.** review-2's design (`design-doc.md:27,57`) places a "resolve each running agent's scoped gates before spawn" step in phases 4 (code) and 5 (docs), but neither `4 - code.md` nor `5 - docs.md` contains a resolve/substitute step. The only orchestrator-path mention of substitution is `passing.md:10`, which describes the **content** of the `Guardrails:` field ("the resolved command after `{scope}` substitution"), **not the orchestrator action** that performs the substitution.

Reading-path direction: `passing.md` → `guardrails.md` (passing.md:10,13 reference guardrails.md for the model). guardrails.md does not reference passing.md. So `guardrails.md` is upstream (the model), `passing.md` is downstream (how the model reaches agents). The spawn fields and the resolved-command definition live in `passing.md` only — no duplication in this path.

### Q2 — Is `{scope}` substitution instructed as an orchestrator action, or only described?

**Verdict: (b), genuinely absent as an explicit instruction — present only as the field-content description at `passing.md:10`** — with (c) as the implicit closure mechanism (the orchestrator is generally expected to satisfy each `## Conventions` field by producing its stated content).

Traced spawn chain (autonomous): `autonomous-phases/4 - code.md:34` and `5 - docs.md:34` spawn the running agent with the verbatim task block and are **silent on guardrails entirely** (no substitute/resolve/scope/`Guardrails:` terms). The `## Conventions` block comes from the workflow: `autonomous-workflow.md:63` defers the whole block to `passing.md`. Terminus is `passing.md:10`, which **describes the end state** of the field ("that command is the resolved command after `{scope}` substitution") but contains no imperative to perform the substitution. `guardrails.md:32` says only that the plan **records** the value; it never tells the orchestrator to read it back and substitute at spawn.

Assisted path: no running-agent path exists. `assisted-workflow.md:21-22` mark phases 4 and 5 "Can't be run in assisted workflow"; assisted covers phases 1–3 and spawns no agents. The `assisted-phases/3 - plan.md:118,211` substitution is **plan-time validation** (the assisted equivalent of the plan-reviewers' check), not resolve-and-pass.

**The lifecycle asymmetry (key insight):** fill (explicit — plan-writer profiles say "Fill the guardrail scopes…", code-plan-writer.md:82, doc-plan-writer.md:68) → record value (explicit — guardrails.md:32) → **[GAP: resolve at spawn — only described at passing.md:10, never instructed]** → run (explicit — running-agent profiles). The FILL half has an explicit owner+verb; the RESOLVE half does not. review-2's design assigned the resolve step to phases 4/5 (design-doc.md:27,57), but the shipped phase files don't carry it.

### Q3 — review-2 reframe targets + AGENTS.md self-containment

**Part A — review-2 statements now contradicting the shipped split (reframe targets):**

1. review-2 `spec.md:9` (Requirement 1): "A single dedicated reference explains the guardrail model end-to-end: the gate kinds, the per-pipeline fill lifecycle, and **how guardrails reach agents**." FALSE: "how guardrails reach agents" now lives in `passing.md`, not `guardrails.md`. (R1's *second* sentence — convention-passing in its own reference — survives and became the whole truth.)
2. review-2 `spec.md:37` (Acceptance Criterion 1): "…when they open the dedicated guardrails reference, then it explains the gate kinds, the fill lifecycle (setup → plan → resolve → run), and **how guardrails reach agents, without their needing to read setup, the workflow, or the agent files**." Three falsehoods: (a) shipped `guardrails.md` fill lifecycle covers only fill + record-value, not setup/resolve/run; (b) "how guardrails reach agents" moved to passing.md; (c) "without reading setup/workflow/agent files" is false by design now — that's the whole point of the refactor.
3. review-2 `design-doc.md:18` (guardrails.md component): "orchestrator-facing model: gate kinds, the fill lifecycle, **the spawn fields**." FALSE: spawn fields are in passing.md (L10,13); guardrails.md no longer mentions them.
4. review-2 `design-doc.md:61-66` (Decision "Two references, not one"): framed guardrails.md as the comprehensive model incl. resolve-and-run, passing.md as only the generic block. SUPERSEDED: shipped split moved both the guardrail spawn fields and the resolved-command definition into passing.md and stripped Validation/Resolve-and-run/Spawn-fields out of guardrails.md.
5. review-2 `design-doc.md:57` (Flow line): "…in phase 4/5 the orchestrator substitutes each value into the `.rp.md` template…". FALSE per Q2 — phases 4/5 carry no substitute step; this is the resolve-gap overlap.

Core reframe targets: 1–4. Item 5 is the resolve-gap. Not contradicted: R1's second sentence and the existence of `passing.md` — they became the whole design.

**Part B — AGENTS.md self-containment: PASS (fully realized).**

- Rule verbatim, `AGENTS.md:14`: "Agent profiles must not reference any skill file or `.rp.md`; an agent reads only its own profile and its initial prompt." Single-sourced: `CLAUDE.md` is a **symlink to `AGENTS.md`** (identical content, no divergence). The intent's "Added an `AGENTS.md` rule" is accurate.
- Violation hunt across all of `agents/`: **clean** — grep for `reference/|conventions/|*-phases|pipeline-versioning|guardrails.md|passing.md|SKILL.md|.rp.md` returns no matches across all 18 profiles. (No `code-writer.md`; only `-tdd` and `-e2e` variants.)
- Running-agent "Run the guardrails" step is self-contained — operates purely on "the guardrails convention" (the `Guardrails:` field received), no skill-file ref. E.g. `code-writer-tdd.md:35-37`; same pattern in code-writer-e2e, doc-writer, and reviewers' step 4.

## Consolidated Requirements

This review re-bases the guardrail **documentation architecture** to match what the owner shipped on the branch. Behavior is unchanged; the owner's shipped wording stands. The pipeline's spec and design must describe the shipped split and must not contradict the shipped skill. This run **supersedes** review-2's "comprehensive single `guardrails.md`" decision.

### One home per concern (the shipped split)

1. **`guardrails.md` is the model only.** It explains the guardrail model — gate kinds (fixed/scoped), the per-gate `.rp.md` block, and the fill lifecycle (who fills `{scope}`, per-phase filling for spanning gates, the plan recording the chosen scope value). It does not document validation, resolve-and-run/`{scope}` substitution, or the spawn fields.
2. **`passing.md` is the single home for how guardrails reach agents.** It owns the `## Conventions` spawn fields `Guardrails:` and `Guardrail scopes to fill:` and the definition of a scoped gate's resolved command (the command after `{scope}` substitution). It references `guardrails.md` for the model.
3. **Validation is documented where it is performed,** not in `guardrails.md`: the setup probe in `setup.md` (validate a fixed gate by running it literally; validate a scoped gate by substituting a realistic made-up `{scope}` and running that) and the plan-phase check in the plan-reviewers / phase 3.
4. **Single reading path, no duplication.** `passing.md → guardrails.md` is the only direction (`guardrails.md` references nothing back). The model lives only in `guardrails.md`; the spawn fields and resolved-command definition live only in `passing.md`. Files outside this path (setup, workflow, plan/code/docs phases) defer to these references rather than restating them.

### Agent self-containment

5. **Agent profiles are self-contained.** The `AGENTS.md` rule states an agent reads only its own profile and its initial prompt — no skill-file or `.rp.md` reference. No agent profile references a skill file or `.rp.md`. (`CLAUDE.md` is a symlink to `AGENTS.md`; the rule is single-sourced.) The running agents' "Run the guardrails" step operates purely on the `Guardrails:` field they receive.

### Resolve is documented as an active orchestrator instruction (gap closed)

6. **The resolve step has an explicit owner.** The fill→record→resolve→run lifecycle must be documented end-to-end without a silent gap. Today the FILL half is an explicit instruction (plan-writer profiles) and RUN is explicit (running-agent profiles), but RESOLVE exists only as the field-content *description* at `passing.md:10` — no line instructs the orchestrator to read the plan's `## Guardrail scopes` value, substitute it into the `.rp.md` command template, and place the result in the running agent's `Guardrails:` field. `passing.md`'s `Guardrails:` line must become an **active instruction** that performs this substitution (the docs-clarity equivalent review-2's design assigned to phases 4/5). This is a documentation change, not a behavior change — the orchestrator already had to produce that resolved field content. Resolve must be documented in exactly one home (`passing.md`), with no duplication on the reading path.

### Supersede the out-of-sync review-2 statements

7. **No acceptance criterion or design statement contradicts the shipped skill.** The pipeline's spec and design must reframe the following review-2 statements so they describe the shipped split (not revert it):
   - review-2 Requirement 1 (`spec.md:9`) — drop "and how guardrails reach agents" from what the single guardrails reference covers; that concern is `passing.md`'s.
   - review-2 Acceptance Criterion 1 (`spec.md:37`) — reframe so the guardrails reference is checked for the **model** (gate kinds + fill lifecycle as shipped), and "how guardrails reach agents" / validation are checked against `passing.md`, `setup.md`, and the plan-reviewers respectively — removing the "without reading setup, the workflow, or the agent files" claim.
   - review-2 design `guardrails.md` component (`design-doc.md:18`) — remove "the spawn fields" from guardrails.md's scope.
   - review-2 design Decision "Two references, not one" (`design-doc.md:61-66`) — reframe to the shipped split: `guardrails.md` = model, `passing.md` = how guardrails reach agents (spawn fields + resolved-command definition).
   - review-2 design Flow line (`design-doc.md:57`) — align with Requirement 6 (resolve documented in `passing.md` as an active instruction).
   What is **not** reframed: review-2 R1's second sentence (convention-passing in its own reference) and the existence of `passing.md` — those became the whole design.

### Correctness fix

8. **Artifact-name drift.** `guardrails.md:32` writes `docs-plan.md`; the rest of the skill uses `doc-plan.md` (singular). Correct it to `doc-plan.md`.

### Out of scope

- **Behavior.** The fixed/scoped gate mechanism and the agent-side run protocol stay exactly as shipped. Requirement 6 only makes the existing resolve obligation explicit in docs; it changes no behavior.
- **Reverting the owner's edits.** The shipped wording is the baseline; this run refines and documents it, never rolls it back.
- **The fixed/scoped model itself,** capture, fill semantics, per-phase filling, symmetry across phases — all unchanged from review-2 and not reopened here.
- **Structural tests over skill or agent prose** (the project rule forbids them).

