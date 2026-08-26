# Spec Research: The amend pattern

# Add an `amend` pattern: a reduced pipeline for small, fully pinned changes

> Source: GitHub issue [Automattic/radical-pipelines#265](https://github.com/Automattic/radical-pipelines/issues/265).
> This file is self-contained; agents do not need to open the source issue.

## Goal

A small change whose target state is already pinned in its intent — no open design decisions — can land with the same quality guarantees a full revision provides (ramification research, a closed touch map, gates, an adversarial final review of the whole diff) at a fraction of the time and tokens: one phase instead of four, two review loops instead of five, one research pass instead of three.

## Constraints

- The two guarantee-bearing steps are non-negotiable: a genuine research pass before writing (ramification sweeps, semantic verification of the pinned target) and a final adversarial review of the full diff against the plan, with gates run once.
- Qualification hinges on open decisions and size, not on behavior: the intent pins the target state, no design decision is left to later phases, and the touch map is small and expected to close. Behavior-preserving is a strong signal, not the gate.
- The plan reviewer holds eject authority: if research surfaces a real design decision, it rejects with "exceeds amend scope — run a revision."
- The structure introduces no new phase vocabulary: a run folder `amend-<N>-<desc>` containing `0-intent/` and a single `1-amend/` phase that reuses the build phase's internal grammar — `amend-plan-research.md`, `amend-plan.md` (spec/design content and tasks in one artifact), `amend-plan-review-*`, writer commits, `amend-review-*`, `amend-summary.md`. Documentation work is ordinary tasks; there is no separate document phase.

## Context

- Motivating case: WooCommerce `billow-78-in-cart-count` fork v5 rev-8 — a utility relocation plus a four-line docs trim, fully pinned by the owner, produced ~1,700 lines of artifacts across five review loops, with the design phase re-executing the spec review's checks and the document phase re-deriving edits the build plan had already spelled out verbatim.
- Base rate: a survey of all 12 revisions run to date found 3–4 would qualify (~25–33%), concentrated in the late-PR-review polish stage (renames, moves, doc sweeps) — the stage where the full pipeline's overhead ratio is worst. Early-life revisions (redesigns, new mechanisms) don't qualify and shouldn't.
- What must not be lost, evidenced by rev-8: its spec research caught that the reference implementation the owner pointed at (fork 4's utility) silently differed from the shipped rule (missing `quantity` skipped vs. counted as 0) — the amend's research pass and final review both preserve that catch.
- Related: [#163](https://github.com/Automattic/radical-pipelines/issues/163) (pr-review origin — amends will often originate there), [#233](https://github.com/Automattic/radical-pipelines/issues/233) (token-cost pressure).

## Assumptions / directions to explore

- *(open)* Whether existing agent profiles are reused under amend prompts (spec-lead/spec-researcher for the plan, build-writers, a reviewer profile for both loops) or dedicated `amend-*` profiles are authored.
- *(open)* How amends sit in pipeline lineage and numbering alongside revisions (`rev-N` vs `amend-N` sequencing in the same family), and what "latest run complete" means when the latest run is an amend.
- *(open)* Whether an amend is only a variant of revising (layered on a complete, unmerged run) or can also serve as the first run of a trivially small issue.

## Q&A

### Q1: Is an amend only a way of revising an existing complete run, or can it also serve as a pipeline's base run for a trivially small issue?

The intent's third open assumption. The answer determines the entry points (`work-on-an-issue.md`'s same-issue menu vs. also pipeline creation), the preconditions (revision's "complete + unmerged" gates vs. none), and where the run sits in a family (always layered on a run branch tip vs. possibly first at a cut commit).

**A1: Both.** The owner relayed his colleagues' input, which he endorses:

> **Mario Santos:** It makes sense to me to have that mechanism. […] Something I was wondering is if this could be not only for "amends" but a way to run the pipeline. I mean, imagine you wanted to do the same change but in trunk and not on a WIP PR. Maybe it makes sense to have that possibility as well?
>
> **darerodz:** Yup, I agree with Mario. For example, let's say we have a small change to do on trunk, like a small bug for a case that wasn't covered in a recently merged PR. If the bug were identified before merging the changes, that would have been fixed with an "amend". So, it could make sense to have that possibility. […] I guess the same "amend" or "not amend" inference could be applied at the beginning of a pipeline, and use a single phase instead of four in the first case.

An amend is therefore available in two positions: layered on a complete, unmerged run (the revision-like case) and as a pipeline's base run for a small, fully pinned issue (the trunk case). The same qualification test applies at both entry points.

### Q2: For layered amends, does `amend-<N>` share the family's run counter with `rev-<N>`, or count on its own?

A family's layered runs today are `rev-1`, `rev-2`, … strictly sequential. With amends interleaved, either (a) one shared counter where the prefix names the run's kind (`rev-1`, `amend-2`, `rev-3` — total order self-evident from the names), or (b) two independent counters (`rev-1`, `rev-2`, `amend-1` — the ordering between kinds must be recovered from branch topology). For a base-run amend, the run presumably stays `base` (the folder and implicit branch name today), with the amend shape only changing what phases exist inside it — noted as a working assumption to confirm.

**A2: Shared counter.** The prefix names the run's kind: `rev-1`, `amend-2`, `rev-3` — one strictly sequential family counter, total order self-evident from the names. The base-run assumption (a base amend stays `base`) was not objected to; it remains noted for confirmation at consolidation.

### Q3: Who decides a run is an amend, and how is the choice offered?

The intent pins the qualification criteria (pinned target, no open decisions, small closed touch map) and the reviewer's eject authority, but not the entry-point mechanics: whether the orchestrator recommends amend when the criteria look met (advisory + owner choice, like today's fork-vs-revision advisory), whether the owner can request it directly, and whether the same applies at pipeline creation (darerodz's "inference at the beginning of a pipeline").

**A3 (owner, translated from Spanish):** "That's it: the orchestrator applies the qualification and recommends the amend. It never asks the owner whether they want an amend when it doesn't apply. The owner can also request it — and then the orchestrator tells them whether it applies or not. Nothing more is needed; the rest can stay implicit."

### Q4: What happens after the reviewer's eject — how does the stopped amend become a revision (or full pipeline)?

The intent pins the eject ("exceeds amend scope — run a revision") but not what follows: whether the amend run stops with the normal close-out and remains in the family as its record (the blocker-stop precedent), and whether the follow-up run starts fresh from the previous run's tip reusing the amend's intent.

**A4: Yes.** The eject follows the blocker-stop precedent: the amend run halts with the normal close-out and stays in the family as its own record (rejected plan review committed). The follow-up is a normal revision at the next shared-counter number — or a fresh full pipeline when a base amend is ejected — starting from the same tip, reusing the amend's intent with the surfaced design decision recorded as an open assumption. No in-place upgrade of the run.

### Q5: Does an amend support the assisted workflow, or is it autonomous-only?

Assisted mode today covers the spec and design-doc phases; build and document run autonomous. The amend's single phase mixes both natures: a plan half (spec-like, Q&A-able with the owner) and an execution half (writers + review, autonomous today). The natural mapping would be: autonomous end-to-end as the default, with assisted covering the plan half only (the orchestrator drives the amend plan with the owner, approval replaces the plan review, execution then runs autonomous).

**A5: Both modes, as described.** Autonomous end-to-end is the norm. Assisted covers the plan half only: the orchestrator drives `amend-plan.md` with the owner through Q&A, the owner's approval stands in for the plan review, and the execution half (writers + final review) always runs autonomous.

### Q6: Is a complete amend run a full peer of other complete runs — can revisions, amends, and forks layer on it, and do closure actions treat it identically?

The intent's second open assumption asks what "latest run complete" means when the latest run is an amend. The consistent reading: a complete amend satisfies the same completion predicate shape (approved plan, approved final review, summary), so the family's same-issue menu (resume/revise/amend/fork), lineage, and closure actions (open/merge/close the PR) treat it exactly like a complete `rev-<N>` — including an amend layered on an amend, qualification permitting.

**A6: Yes.** A complete amend is a full peer: it satisfies "latest run complete" via its own predicate (approved plan, approved final review, summary), revisions/amends/forks layer on it like on any complete run, and closure actions treat it identically.

### Q7: Agent profiles — do you already hold a position on reuse vs. dedicated `amend-*` profiles, or does the design phase settle it?

The intent's first open assumption. Reuse means existing profiles (spec-researcher, build-writers, a reviewer) serve under amend prompts and project conventions keyed to profile names (agent models, guardrails) apply unchanged; dedicated profiles mean new `amend-*` files authored for the combined plan artifact and the widened final review, and project conventions gain rows for them. The skill's rules also bear on this: profiles are self-contained (no skill-file references), with shared instructions duplicated per profile.

**A7: A mix — reuse what fits, author the rest.** Reuse the researcher (the owner suspects spec-researcher and design-doc-researcher are near-duplicates and may deserve merging into a single researcher profile — see R1) and the build/document writers. The plan lead and the reviewer(s) are new: they generate and review an artifact kind that doesn't exist today. Whether one reviewer profile serves both loops (plan review and final review) or two remains open for design.

### Q8: Does merging the two researchers into one profile belong to this issue's scope, or to a separate issue?

R1 shows the merge is nearly free (one altitude clause to reconcile) and that the amend phase is best served by the merged, guardless form. Folding it in means this issue also touches the spec and design-doc phase references (their profile tables name the researcher); keeping it out means the amend reuses an existing researcher as-is for now and the merge becomes its own issue.

**A8: Merge now, in this issue.** A7's final form: one merged researcher profile replaces `spec-researcher` and `design-doc-researcher` and serves the spec, design-doc, and amend phases (the spec and design-doc phase references update accordingly); build/document writers are reused for amend tasks; the plan lead and the reviewer(s) are new profiles, with the one-or-two-reviewers split left to design.

### Q9: Confirm the base-amend naming — the run stays `base`, the branch stays `<branch-base>`?

Carried from Q2 as a working assumption: a base-run amend keeps today's base-run identifiers (folder `base/`, branch `<branch-base>`, `v1` implicit); being an amend changes only the phases inside the run (`0-intent/` + `1-amend/`).

**A9: Confirmed** (owner: "i guess so"). Base-run amends keep today's base identifiers; only the run's internal phases differ.

### Q10: Can the eject fire at any point in the run, not only at plan review?

A4 pinned the eject's consequences. The trigger side: the intent names the plan reviewer's authority, but the disqualifying discovery — a real design decision, a touch map that won't close — can also surface during plan research, during a writer's execution (as a blocker), or in the final review. The consistent reading: wherever it surfaces, the run stops blocker-style with the same follow-up (revision / full pipeline per A4); the plan reviewer is simply the actor with the explicit adjudication duty.

**A10: Yes — lead and reviewers hold the authority; writers route through blockers.** The eject can fire wherever the disqualifying discovery happens: the plan lead (during research and synthesis) and the reviewers (plan review, final review) eject explicitly; a writer that hits the condition reports it as a blocker, which stops the run the same way. Same consequences in every case (A4).

## Research

### R1: The two researcher profiles are near-identical

`agents/spec-researcher.md` (44 lines) and `agents/design-doc-researcher.md` (43 lines) diverge only in: the name/description lines; the placement (not substance) of the blocker-protocol paragraph; "requirement" vs. "decision" in one sentence; and one real clause — spec-researcher's altitude guard ("Alternatives at this altitude are about observable behavior and scope; for a question of mechanism, report the facts that bear on it — the option set and its ranking belong to the design phase."), which design-doc-researcher lacks. Everything else is verbatim identical.

Bearing on the amend: amend-plan research spans both altitudes in one phase — behavior/scope questions and mechanism/option-set questions — so spec-researcher's altitude guard would misfire there, while design-doc-researcher's guardless form fits. A single merged researcher profile would serve all three phases.

## Out of Scope

Confirmed by the owner:

1. In-place upgrade of an ejected run — an eject always ends the run; the follow-up is a new run.
2. Full-assisted execution — assisted mode covers the plan half only; the execution half always runs autonomous.
3. Merging any profiles beyond the two researchers.
4. Changes to the full pipeline's phase structure — the spec and design-doc references change only where they name the researcher profile.
5. `manage-issues.md` and the issue-authoring flow — qualification is applied when work starts, not when issues are written.
6. Lanes in the amend phase — the amend plan runs single-lane; no lane-count decision, no consolidator.
7. Fixing the reviewer profile count (one vs. two) — deliberately left to the design phase.
8. Per-project convention updates (model rows, guardrails for the new profiles) — each project adopts them on its own.

## Consolidated Requirements

1. **The amend run kind.** A run containing `0-intent/` and a single `1-amend/` phase whose file grammar mirrors the build phase's: `amend-plan-research.md`, `amend-plan.md` (spec/design substance and the task list in one artifact), `amend-plan-review-N-rejected.md` / `amend-plan-review-approved.md`, writer commits on the run branch, `amend-review-N-rejected.md` / `amend-review-approved.md`, `amend-summary.md`. Documentation work is ordinary tasks; there is no separate document phase.
2. **Two entry points, one qualification test.** An amend layers on a complete, unmerged run (the revision-like position) or serves as a pipeline's base run (the trunk position). (A1)
3. **Qualification.** The intent pins the target state, no design decision is left open, and the touch map is small and expected to close. Behavior-preserving is a strong signal, not the gate. (Intent)
4. **Entry mechanics.** The orchestrator applies the test and recommends an amend when it is met; it never offers an amend otherwise. The owner may request one and receives a qualifies/doesn't verdict. (A3)
5. **Naming and lineage.** Layered amends share the family's strictly sequential run counter, the prefix naming the kind (`rev-1`, `amend-2`, `rev-3`). A base amend keeps the base run's identifiers (`base/`, `<branch-base>`, implicit `v1`). (A2, A9)
6. **The phase flow.** Plan loop: a plan lead researches through per-question researchers, writes the plan, a reviewer adjudicates until approved. Execution: one fresh writer per task in plan order, then a final adversarial review of the whole diff against the plan, with the gates run once; on rejection only flagged tasks re-dispatch; on approval the reviewer writes the approval file and summary. The two non-negotiable guarantee-bearing steps: the research pass before writing, and the final whole-diff review. (Intent, A7)
7. **Modes.** Autonomous runs the phase end-to-end. Assisted covers the plan half only — the orchestrator drives the plan with the owner, owner approval replaces the plan review — and execution then runs autonomous. (A5)
8. **Eject.** When a disqualifying discovery surfaces — a real design decision, a touch map that won't close — the run stops blocker-style: the plan lead and the reviewers eject explicitly, a writer reports it as a blocker with the same effect. Follow-up: a revision at the next shared number (layered) or a full pipeline (base), reusing the amend's intent with the surfaced decision as an open assumption. (A4, A10)
9. **Peer status.** A complete amend run satisfies the same-issue menu's "latest run complete" via its own predicate (approved plan review, approved final review, summary); revisions, amends, and forks layer on it; closure actions treat it identically. (A6)
10. **Profiles.** New: the plan lead and the reviewer role(s) (count settled by design). Merged: one researcher profile replaces `spec-researcher` and `design-doc-researcher` and serves spec, design-doc, and amend research; both existing phase references update. Reused: the build and document writers execute amend tasks. (A7, A8, R1)
11. **Repository rules.** The change records a changeset and updates README.md where it describes pipeline behavior.
