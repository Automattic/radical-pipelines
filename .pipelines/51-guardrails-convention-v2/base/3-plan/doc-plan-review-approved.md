# Doc Plan Review — APPROVED

_Issue: [Automattic/radical-pipelines#51](https://github.com/Automattic/radical-pipelines/issues/51). Pipeline: `51-guardrails-convention-v2`. Artifact reviewed: `3-plan/doc-plan.md`. Reviewer: doc-plan-reviewer. Iteration: N=1 (no prior rejection). Inputs: approved binding `1-spec/spec.md`, approved `2-design-doc/design-doc.md`, approved `3-plan/code-plan.md` (T1–T7)._

## Verdict: APPROVED

The doc plan is complete, drift-resistant, and aligned with the binding spec and the approved code plan. Every factual claim it rests on was verified against the live tree in this worktree. It is scoped to exactly one task — reflecting the new Guardrails convention in the human-facing README convention overview — which is precisely the surface the spec assigns to the docs phase (OOS 7) and the only live documentation surface the code plan leaves out of sync.

## What was verified

**README claims (the task's whole basis) — all confirmed.**
- `README.md:147` is the shared-conventions enumeration ("Shared project conventions include task tracking, pipeline slug format, artifact folder location, and commit rules.") — verbatim as the plan quotes; it omits Guardrails. The same paragraph carries the per-tool "Claude Code conventions add… / Pi conventions add…" lists, confirming the plan's insistence that Guardrails go in the **shared** clause, not either per-tool list.
- `README.md:159` is the `.rp.md`-structure sentence whose shared-section parenthetical ("issue tracking, pipeline slug format, artifact folder, commit format, Linear updates, push behavior") omits Guardrails — verbatim as quoted. Adding `guardrails` here is correct because code-plan T7 lands `### Guardrails` under `## Shared conventions` in `.rp.md` (verified: that file's shared section holds `### Commit format`, `### Agent models`, `### Health monitoring` — the tool-agnostic peers).
- The plan correctly hedges both line numbers as approximate ("currently around") and instructs the doc-writer to author against the shipped text, not the plan's strings.

**Whole-repository sweep ("Surfaces deliberately not given a task") — confirmed accurate.**
- `website/` — grep for convention/guardrail/`.rp.md`/verification gate/lint/typecheck returns **zero** matches. Marketing-only, no surface. Matches the #90/#91 conclusions.
- `CONTRIBUTING.md` — its only "convention" references are the changeset **summary format** (`BREAKING:` prefix), not a convention catalog and no `.rp.md` reference. Nothing goes stale.
- `AGENTS.md` — no convention-catalog or `.rp.md` references; its rules govern *how* the prose is written, not a surface to edit. Correct.
- `load.md` / `setup.md` / four agent profiles / dogfood `.rp.md` / changeset — all owned by code-plan T1–T7; correctly referenced, not duplicated.

**Precedent cited (#90, #91) — both exist and were approved**, and both treated the README Configuration section as a reflect-not-restate coherence surface with a single README task plus the same whole-repo sweep. The plan faithfully follows this established pattern.

## The strongest point in the plan's favor: the changeset boundary

Unlike the #90 and #91 doc plans, which **did** own the mandatory changeset as a docs-phase task, this plan explicitly and repeatedly declines to author it — because spec req 27 and code-plan **T7** own the `minor` changeset as a code-phase deliverable here. The plan flags this divergence in three places (Overview blockquote, "Surfaces deliberately not given a task," and the phase-5 notes) and warns that duplicating it would risk two competing changeset files. This is exactly right and is the plan's most important anti-drift feature: a doc-writer pattern-matching to the #90/#91 precedent would otherwise author a second changeset. The plan pre-empts that bug.

## Spec / code-plan alignment

- **Spec OOS 7** (README/website owned by docs phase, not the spec) and **spec Overview** (human-facing README owned by docs phase) — the task is squarely inside this boundary; nothing the spec reserves for phase 4 is re-tasked here.
- **Spec req 4 / 10** (Guardrails is shared / tool-agnostic, authored under `## Shared conventions`) — the plan's repeated "shared side, never per-tool" placement guard is correct and load-bearing; getting it wrong would misrepresent the convention.
- **Spec req 5** (optional) — the plan requires the README to state optionality.
- **Anti-drift / `AGENTS.md` no-duplication** — the plan forbids restating the guardrail definition, three-field shape, exit-code rule, phase-selection rule, setup-validation semantics, and blocker split into the README, directing a reference to the canonical `load.md`/`setup.md` instead. This keeps the single-source-of-truth discipline the design and `AGENTS.md` demand.
- **Canonical-name discipline** — the plan instructs the doc-writer to use the exact shipped name (expected `Guardrails`) read from the landed phase-4 text, treating any wording-level difference as non-blocking drift rather than a hard string.

## Acceptance criteria

The task's six acceptance criteria are concrete and checkable: presence in both enumerations, shared-not-per-tool placement, voice match, no restatement of the mechanism, no contradiction of other README claims, and no edits outside `## Configuration`. They map cleanly onto what a reviewer can confirm by reading the diff.

## Minor, non-blocking observations (no rejection warranted)

1. The plan twice frames the README's terse "what a guardrail is" clause as mirroring "the loader row's one-liner" (Sections/scope, Traces-to D1). That is the right altitude; the doc-writer should simply ensure the final clause does not drift into the loader **body**'s fuller definition. The plan already says exactly this, so it is a non-issue — noted only for the doc-writer's attention.
2. Line numbers 147/159 are stable today (README is 190 lines) but the plan rightly treats them as approximate and authored-after-phase-4; no action needed.

None of these rise to a defect. The plan is approved as written.
