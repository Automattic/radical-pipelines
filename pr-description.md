## What?

Closes #122.

Moves test selection and behavior verification inside the Radical Pipelines skill, and replaces the guardrails convention's per-agent model with a **fixed/scoped gate model**.

- **Phase-3 planning owns test selection.** `code-plan.md` carries an explicit **E2E test plan** (`### Flow N` specs) derived from the spec's acceptance criteria; the `code-plan-reviewer` executes the planned commands to confirm they *run* at plan time and judges coverage. Per-task **unit**-test selection stays with the TDD writer.
- **`code-writer` splits into `code-writer-tdd` and `code-writer-e2e`,** dispatched by a plan-declared task `Type`.
- **Behavior verification happens once, at the `code-reviewer`,** on the integrated feature: the free-form verification + evidence requirement is kept, and the reviewer now manually re-drives each planned e2e flow.
- **Scoped guardrails.** A guardrail gate is **fixed** (a literal command) or **scoped** (its command carries a `{scope}` placeholder filled per pipeline). The filler is derived from who runs the gate — code-run gates by the code plan, doc-run gates by the doc plan; the owner may attach optional `fill-guidance`; setup probes a scoped gate with a realistic made-up scope; the plan records the chosen value in `## Guardrail scopes`, which the orchestrator substitutes into the agent's `Guardrails:` line before spawn. The mechanism is symmetric across the code and docs phases. The model is centralized in `reference/guardrails.md`, with the spawn-time conventions in `reference/conventions/passing.md`.
- **Lockstep naming:** the phase-4 reference, `setup.md` gate enumeration, README roster, assisted phase-3, and the marketing website all move from `code-writer` to the two new writers.

## Why?

Test selection should be owned by phase-3 planning rather than each code-writer's judgment, and behavior verification should happen once, at the integrated-feature level — so every pipeline verifies the same way regardless of which writer ran which task. Writers run on limited models and mid-plan features are often incomplete, which made per-writer test selection and per-task behavior verification unreliable.

The guardrails half went through two iterations. review-1 modeled it as a `plan-completed-for` mark (a per-agent subset of a gate running a plan-supplied feature command). **review-2 replaced that** with the simpler scoped-gate model, documented the model once in a dedicated reference, and fixed the docs phase — which review-1 had left without the scope-resolve step the code phase has.

## How?

Built by the Radical Pipelines workflow as a **v2** fork (spec/design inherited from v1; plan/code/docs rebuilt on current `trunk`), across three runs under `.pipelines/122-plan-driven-test-selection-v2/`:

- **base** — the issue-122 feature: plan-driven test selection, the writer split, reviewer-side behavior verification.
- **review-1-plan-completed-guardrails** — the first guardrails model.
- **review-2-scoped-guardrails** — supersedes review-1's guardrails model with fixed/scoped gates and centralizes the docs (spec + design authored assisted with owner approval; plan / code / docs autonomous).

Every phase of every run passed adversarial review. `trunk` is merged into the branch (sole conflict — `load.md` — resolved to the scoped model). Structural tests that asserted the skill's own Markdown were removed and are now forbidden by `AGENTS.md` (the skill is prose, not software).

## Changeset

- [x] A changeset is included — `.changeset/plan-driven-test-selection.md`, describing the shipped fixed/scoped model.
