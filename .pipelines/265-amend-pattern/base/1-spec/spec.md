# Spec: The amend pattern

## Overview

The skill gains a second, reduced way to run a pipeline: the **amend**. It serves small changes whose target state is already pinned in the intent — no open design decisions — and delivers them with the same quality guarantees a full pipeline provides (a genuine research pass, a closed touch map, gates, an adversarial review of the whole diff) at a fraction of the time and tokens: one phase instead of four, two review loops instead of five, one research pass instead of three.

An amend is available in two positions: layered on a complete, unmerged run of an existing pipeline (where today only revisions and forks exist) and as a new pipeline's base run (a small, fully pinned change landing on the project's main branch). The same qualification test governs both. When the work turns out to exceed amend scope, the run ejects: it stops and the change re-enters as a normal revision or full pipeline.

The pattern introduces no new phase vocabulary: an amend run holds `0-intent/` and a single `1-amend/` phase whose internal file grammar is the build phase's — a plan with its review loop, writer commits, a final review with its approval file, and a summary — with the plan artifact widened to carry the spec/design substance and documentation work handled as ordinary tasks.

Alongside the new profiles this requires, the two existing researcher profiles — near-verbatim duplicates — merge into a single researcher serving the spec, design-doc, and amend phases.

## Requirements

1. **The amend run kind exists.** A run whose folder contains `0-intent/` and a single `1-amend/` phase with the build phase's file grammar: `amend-plan-research.md`, `amend-plan.md` (spec/design substance and the task list in one artifact), `amend-plan-review-N-rejected.md` / `amend-plan-review-approved.md` (the plan loop), writer commits on the run branch, `amend-review-N-rejected.md` / `amend-review-approved.md` (the final review), and `amend-summary.md`. Documentation work is ordinary tasks inside the phase; no separate document phase exists.

2. **Two entry points, one qualification test.** An amend either layers on a complete, unmerged run — a peer of revising in the same-issue menu — or serves as a new pipeline's base run. The qualification test is identical at both.

3. **Qualification hinges on open decisions and size, not behavior.** A change qualifies when the intent pins the target state, no design decision is left to later phases, and the touch map is small and expected to close. Behavior-preserving is a strong signal, not the gate.

4. **The orchestrator applies the test; the owner can invoke it.** The orchestrator recommends an amend when the test is met and never offers one otherwise. When the owner requests an amend, the orchestrator answers whether it qualifies.

5. **Naming shares the family counter.** Layered amend runs are named `amend-<N>-<desc>` on the family's single strictly sequential run counter, the prefix carrying the kind: `rev-1`, `amend-2`, `rev-3`. A base amend keeps the base run's identifiers — folder `base/`, branch `<branch-base>`, `v1` implicit — differing only in the phases inside.

6. **The phase runs as two loops.** First the plan loop: a plan lead drives research through per-question researchers (the ramification sweeps and the semantic verification of the pinned target), writes `amend-plan.md`, and a reviewer adjudicates it until approved. Then execution: one fresh writer per task in plan order, followed by a final adversarial review of the whole diff against the plan, the gates running there rather than at plan time; on rejection only the flagged tasks re-dispatch; on approval the reviewer writes the approval file and the summary. The research pass and the whole-diff final review are the non-negotiable guarantee-bearing steps.

7. **Both workflow modes apply.** Autonomous runs the phase end-to-end. Assisted covers the plan half only: the orchestrator drives the plan directly with the owner, whose approval stands in for the plan review; execution then runs autonomous.

8. **The eject.** When a disqualifying discovery surfaces — a real design decision, a touch map that won't close — the run stops with the normal close-out and remains in the family as its record. The plan lead and the reviewers eject explicitly; a writer that hits the condition reports it as a blocker with the same effect. The follow-up is a revision at the next shared number (for a layered amend) or a full pipeline (for a base amend), reusing the amend's intent with the surfaced decision recorded as an open assumption.

9. **A complete amend is a full peer.** Its completion predicate is its own artifacts — approved plan review, approved final review, committed summary. It satisfies "latest run complete" for the same-issue menu; revisions, amends, and forks layer on it; the pipeline tree renders it; closure actions treat it like any complete run.

10. **Profiles: new lead and reviewer(s), merged researcher, reused writers.** The plan lead and the reviewer role(s) are new profiles (whether one reviewer profile serves both loops or two is settled by design). One merged researcher profile replaces `spec-researcher` and `design-doc-researcher`, serving the spec, design-doc, and amend phases; the spec and design-doc phase references update to name it. The build and document writers execute amend tasks unchanged.

11. **Repository rules hold.** The change records a changeset, and README.md is updated where it describes behavior this changes.

## Out of Scope

1. **In-place upgrade of an ejected run** — an eject always ends the run; the follow-up is a new run.
2. **Full-assisted execution** — assisted mode covers the plan half only.
3. **Merging any profiles beyond the two researchers.**
4. **Changes to the full pipeline's phase structure** — the spec and design-doc references change only where they name the researcher profile.
5. **`manage-issues.md` and the issue-authoring flow** — qualification is applied when work starts, not when issues are written.
6. **Lanes in the amend phase** — the amend plan runs single-lane; no lane-count decision, no consolidator.
7. **Fixing the reviewer profile count** — one vs. two reviewer profiles is a design-phase decision.
8. **Per-project convention updates** — projects adopt model rows or guardrails for the new profiles on their own.

## Acceptance Criteria

- Given an owner request layered on a complete, unmerged run whose target state is pinned with no open design decisions and a small closed touch map, when the orchestrator applies the qualification test, then it recommends an amend alongside the existing same-issue actions.
- Given a request that leaves a design decision open or whose touch map is not expected to close, when the orchestrator evaluates it, then no amend is offered — and if the owner explicitly asks for an amend, the orchestrator answers that it does not qualify and why.
- Given a new issue that qualifies, when a pipeline is created for it, then the base run can be an amend: folder `base/`, branch `<branch-base>`, containing `0-intent/` and `1-amend/` only.
- Given a family whose latest run is `rev-1`, when an amend layers on it, then the run is `amend-2-<desc>`, and a subsequent revision is `rev-3-<desc>` — one shared counter, the prefix naming the kind.
- Given an autonomous amend run, when the phase executes, then the plan loop produces `amend-plan-research.md`, `amend-plan.md`, and a terminating `amend-plan-review-approved.md`; the execution loop produces the tasks' commits, `amend-review-approved.md`, and `amend-summary.md`; and the gates run in the final review, not at plan time.
- Given an assisted amend run, when the plan half completes with owner approval, then the approval file records the owner as reviewer-equivalent and execution proceeds autonomous.
- Given a disqualifying discovery during plan research, plan review, execution, or final review, when it surfaces, then the run stops with the normal close-out, the record stays in the family, and the orchestrator names the follow-up route: a revision at the next shared number for a layered amend, a full pipeline for a base amend, reusing the intent with the discovery as an open assumption.
- Given a complete amend run, when the owner returns to the issue, then the same-issue menu offers resume/revise/amend/fork over it and the closure actions apply to it exactly as to a complete revision.
- Given the merged researcher profile, when the spec, design-doc, or amend phase requests research, then the same profile serves all three, and no reference names `spec-researcher` or `design-doc-researcher` any longer.
- Given the repository after the change, when it is reviewed, then a changeset is present and README.md reflects the amend pattern wherever it describes pipeline behavior.
