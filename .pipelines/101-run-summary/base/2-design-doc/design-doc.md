# Design Doc: Generic per-run pipeline summary artifact

## Overview

A Radical Pipelines pipeline executes as a sequence of runs on one branch: `base` first, then `review-1-<short-description>`, `review-2-<short-description>`, … — each run a full pass of the phase flow (phases 0–5). Reviews are by design agnostic to the runs before them; nothing today carries one run's outcome into the next. This work adds a single, generic, inspectable summary per run that selectively reintroduces that prior-run awareness without coupling the skill to GitHub, git, or any issue tracker.

The change is entirely in the skill (`skills/radical-pipelines/`) and a project's conventions; it ships no application code. Each run that completes its final phase (5 – Docs) produces exactly one `run-summary.md` at the run-folder root, written once by a new single-shot agent after docs approval. The phase-5 completion predicate is extended to require it, so the same predicate every completion check already reads now gates the summary too. When a review run starts, the orchestrator collects all prior runs' summaries in run order and feeds them into that review's phase 1. A skill-shipped default format defines the summary's structure (What / Why / How plus run-level context), and a project may override it through a new optional convention.

## Approach

The design rests on six settled decisions, each detailed under **Key Decisions** and mapped to the skill files it changes under **Components**:

1. **Fold the summary into phase 5, gated by the existing completion predicate.** The summary is the final step of phase 5, produced after `doc-reviewer` approval; the phase-5 row of the **Per-phase completion** table is extended to require `run-summary.md`. The phase's existing predicate verification moves to after the summary is committed, so it is checked once against the extended predicate. No new phase, no second run-completion condition. *(R2, R3; AC1, AC2)*
2. **Place the artifact at the run-folder root, with a constant filename.** `<artifacts-folder>/<run>/run-summary.md`, outside any phase folder. Run identity is carried by the `<run>/` path segment, never the filename — matching every existing artifact. This placement makes fork-exclusion (R10) and lineage-cleanliness structural rather than a special case. *(R1, R8, R10; AC1, AC7, AC8)*
3. **A new single-shot `run-summary-writer` agent produces it from the run's own artifacts.** Spawned by the orchestrator after docs approval, it reads only committed artifacts inside the run folder and the shipped code/docs as files; it is given no git base ref and never inspects a diff, keeping the mechanism git-free. *(R2, R4, R9; AC1, AC3, AC9)*
4. **The skill ships the default format; a new optional convention lets a project override it.** A new `reference/run-summary-format.md` defines the default structure; a new optional "Run summary format" convention lets a project name its own in `.rp.md`. The orchestrator resolves the winner (project override else skill default) and passes it to the writer in its spawn prompt. *(R4, R7, R9; AC3, AC6, AC9)*
5. **`review-pipeline.md` collects prior summaries as review-run input.** When a review run starts, the orchestrator collects the `run-summary.md` of every prior run in run order and makes the collected content part of the review run's phase-1 input. Summaries are passed as content, never as run-named paths, so phase-1 agents stay run-agnostic. *(R5, R6; AC4, AC5)*
6. **A fork that inherits `5-docs` produces its own summary.** Because the extended predicate now requires `run-summary.md`, and fork's copy loop never copies the run-level summary (decision 2), a fork inheriting phase 5 would otherwise land with phase 5 incomplete. `fork-pipeline.md` launches the `run-summary-writer` for the fork's `base` run when it inherits `5-docs`, so the fork produces its own summary from its own (inherited) artifacts — R10's "each pipeline's runs produce their own" — and lands complete. *(R3, R10; AC1, AC8)*

The summary is the **first input that ever crosses run boundaries** — every existing extra spawn-prompt input (the rejection-file path, the reviewer base ref) is within-run. That novelty is why decisions 2 and 5 pin *content* delivery and run-level placement rather than run-named paths or phase-folder placement.

## Components

All paths are under `skills/radical-pipelines/` unless noted. Project-side files (`agents/run-summary-writer.md`, the `.rp.md` model row) live in the consuming project, as for every agent.

### C1 — Phase-5 procedure: produce the summary as the final step (`reference/autonomous-phases/5 - docs.md`)

Today the `doc-reviewer` writes `docs-review-approved.md` on approval (step 4), and the existing step 6 is the phase's predicate-verification step: "On **approved**, verify the phase 5 completion predicate." The summary is produced after approval and before that verification, so the verification — now reading the **extended** predicate (C2) — can pass only once `run-summary.md` is committed.

Concrete edits:

- Add `run-summary-writer` to the **Required agents** table: one fresh instance per run, non-persistent, "Writes the run summary after docs approval."
- Add `<artifacts-folder>/run-summary.md` to the **Outputs** list (note the run-folder-root path, not `5-docs/`).
- Change step 6's "On **approved**" outcome so it no longer verifies in place: on approval, launch a fresh single-shot `run-summary-writer` with the resolved summary format (C4); have it read the run's committed artifacts and shipped code/docs and commit `run-summary.md` at the run-folder root.
- Add the predicate verification as the new final step, after the summary is committed: verify the extended phase-5 predicate (`docs-review-approved.md` **and** `run-summary.md`) per `pipeline-versioning.md`. The predicate is verified once, at this point — not before the summary exists.

The writer runs only after approval, exactly once per run; it is not part of the writer/reviewer rejection loop and has no review gate (the spec excludes one). *(R1, R2, R3; AC1)*

### C2 — Completion predicate: require the summary (`reference/pipeline-versioning.md`)

The phase-5 row of the **Per-phase completion** table gains `run-summary.md` alongside `docs-review-approved.md`:

```
| 5 – Docs | `5-docs/docs-review-approved.md` and `run-summary.md` |
```

Because `run-summary.md` is at the run-folder root rather than inside a phase folder, two co-located sentences in this file that currently pin **all** artifacts to `<run>/<phase>` must be generalized so a run-level path is valid in the table:

- The **Runs within a pipeline** layout sentence: "Artifacts live at `<artifacts-folder>/<run>/<phase>`…" — generalize to allow run-level artifacts (most artifacts live under `<run>/<phase>`; the run summary lives at the `<run>/` root).
- The **Per-phase completion** evaluation sentence: "a phase's predicate is evaluated at `<artifacts-folder>/<run>/<phase>`…" — generalize so a predicate entry may name a path relative to the run folder, of which `<phase>/…` is the common case and `run-summary.md` the run-level case.

Exact wording is an implementation choice (see **Risks and Open Questions**); the constraint is that the phase-5 row can legitimately name the run-level `run-summary.md`. Extending this one row gates run completion **everywhere at once**, because both moments that evaluate completion — end-of-phase (`autonomous-workflow.md`) and the review-start gate (`review-pipeline.md` step 1a) — read this same table. Resume (`resume-pipeline.md`) delegates to the same predicate, so a run with docs approved but no summary automatically has phase 5 as its active phase and re-runs it. *(R2, R3; AC1, AC2)*

### C3 — The `run-summary-writer` agent (skill role + project definition)

A new agent, defined skill-side only as a role (the **Required agents** row in C1) and project-side as the concrete `agents/run-summary-writer.md` plus an "Agent models" row in `.rp.md`, exactly like every other agent. Its contract:

- **Single-shot, one run.** Written exactly once for its run; never iterates. Launched after docs approval when the run executes phase 5 (C1), or after seeding when a fork inherits a complete `5-docs` (C6) — either way, once, from the run's committed artifacts.
- **Sources, all inside the run folder and committed before the writer runs** (by end of phase 5 in C1, or by the seed commit in C6): what changed — `1-spec/spec.md`, `3-plan/code-plan.md` + `doc-plan.md`, the shipped code/docs read as files; why — `spec.md`, `2-design-doc/design-doc.md`; key decisions — `design-doc.md`; rejected approaches — `design-doc.md` alternatives plus the `*-review-N-rejected.md` files of phases 1–5; known limitations — `design-doc.md` risks, `spec.md` out-of-scope.
- **No git.** Given no base ref; never inspects a diff. It reads shipped code/docs as files (an established writer pattern), so the mechanism references no git/GitHub/tracker concept.
- **Writes and commits** `run-summary.md` at the run-folder root, per the Commit format convention.

No existing phase-5 agent can absorb this: `doc-reviewer` is review-only and may iterate; each `doc-writer` is contractually scoped to a single doc task. The orchestrator cannot author it either — the autonomous workflow's rule is that agents author and commit their own artifacts. *(R2, R4, R9; AC1, AC3, AC9)*

### C4 — Default format and the override convention (`reference/run-summary-format.md`, `conventions/load.md`, `conventions/setup.md`)

- **New skill format file `reference/run-summary-format.md`** — the second skill-owned format after `intent-format.md`, and the first overridable one. It defines the default structure (C-format below), with an HTML-comment placeholder per section, omit-empty-sections discipline (no `N/A`), and standalone-document discipline.
- **New optional "Run summary format" convention** added to the `conventions/load.md` table (Required? = **No**) and given a matching `setup.md` entry whose suggested default is the skill file. Optional so `load.md`'s missing-required-conventions block never fires on a silent project.
- **Resolution.** The orchestrator reads `.rp.md`: where the project names a format, it wins; where silent, the skill default (`run-summary-format.md`) applies — the same inherit-or-override semantics `.rp.local.md` already uses. The orchestrator passes the resolved format to the `run-summary-writer` in its spawn prompt, alongside Artifact folder and Commit format. Agents never read `.rp.md`.

A project override **replaces the format wholesale**, so the R4 content guarantees (key decisions, rejected approaches, known limitations) hold for the default format; AC6 sanctions this and the override is the project's choice. *(R4, R7, R9; AC3, AC6, AC9)*

**C-format — the default structure** (confirmed from the What/Why/How hypothesis, extended with R4 content as sibling sections):

```markdown
# Run Summary

## What
<!-- What this run changed: the shipped change, concisely. -->

## Why
<!-- Why the change was made: the problem and the goal it serves. -->

## How
<!-- How the change was realized: the approach the run took. -->

## Key decisions
<!-- Decisions taken during the run that a later review benefits from knowing. -->

## Rejected approaches
<!-- Approaches considered and not taken, and why. -->

## Known limitations
<!-- Limitations of what this run shipped. -->
```

The H1 is run-name-free (the writer is run-agnostic). R4's decisions / rejected approaches / limitations earn their own H2 sections rather than burial under "How," matching the house style's section-per-concern. *(R4, R7; AC3)*

### C5 — Review-run input: collect prior summaries (`reference/review-pipeline.md`)

`review-pipeline.md` gains a single collection rule and feeds the result into the review run's phase 1. The natural place is alongside the existing run-start work (after the run folder and intent are created, step 5, and before mode dispatch, step 7), since this file is the only one that knows run names.

- **Collection rule (stated once):** the prior runs of `review-N` are `base, review-1, …, review-(N-1)`, in that order; collect each one's `run-summary.md`. Order is derivable from the existing **Runs within a pipeline** definitions (monotonic `N`, linear `base → review-1 → …` chain); this is the first step that collects across *all* prior runs rather than just the latest, so the rule is made explicit.
- **Delivery, mode-independent.** Collection happens before mode dispatch, so both modes get it. In an autonomous review the collected summaries (in run order) are passed as **content** in the phase-1 spawn prompts; in an assisted review the orchestrator reads them directly while it authors the phase-1 artifacts. Either way they are passed as content, **never** as run-named paths, so phase-1 agents stay run-agnostic.
- **Scope.** "When a review run starts" = phase 1, the review's first phase and where its scope is set. Phases 2–5 are unchanged: they work from the review run's own artifacts, into which phase 1 has already absorbed the prior context. Re-feeding summaries downstream would re-introduce cross-run input the later phases don't need.

The intent is deliberately **not** the carrier: its Origin section captures what prompted the review, and `intent-format.md`'s capture-don't-converge discipline argues against folding pipeline history in; R5/AC4 also frame the summaries as inputs in their own right. *(R5; AC4)*

### C6 — Fork that inherits `5-docs`: produce the fork's own summary (`reference/fork-pipeline.md`)

Fork's copy loop (step 5) touches only `<phase>` folders, so the run-level `run-summary.md` is **structurally never copied** — satisfying R10 with no negative exclusion (D2). But that same exclusion means a fork inheriting `5-docs` seeds a `base/` run with `5-docs/docs-review-approved.md` and no `run-summary.md`. Under the extended predicate (C2) the fork's phase 5 is then **incomplete** the moment it is seeded: its completed phase is 4 and its active phase is 5. Left unaddressed, the pipeline tree would render the fork's `5-docs` "(in progress)", the review-start gate would block any review of the fork, and a resume would treat phase 5 as active and roll back the single seed commit (all inherited artifacts).

The fix keeps run-level placement and reuses the writer C3 already introduces: when the inherited phase is `5-docs`, `fork-pipeline.md` launches a `run-summary-writer` for the fork's `base` run after seeding, so the fork produces its **own** summary from its own (inherited) artifacts and lands complete.

Concrete edits:

- Add a step after step 6 (where the seeded folders are committed) and before step 7 (continue normal phase work): **if the inherited phase is `5-docs`**, launch a fresh `run-summary-writer` for the fork's `base` run — with the resolved summary format (C4), exactly as in C1 — to write and commit `run-summary.md` at the fork's `base/` run-folder root. Placing it after step 6 means the inherited artifacts are already committed, so C3's "committed before the writer runs" holds. For any inherited phase below `5-docs`, the fork has no completed phase 5 yet and runs phase 5 (and the writer) itself later, so this step does not apply.

This is the only path by which a fork's `base` run gets a summary without executing the full phase-5 procedure; it produces the summary from the inherited artifacts, which is exactly R10's "each pipeline's runs produce their own." *(R3, R10; AC1, AC8)*

### C7 — Phase table: name the run summary as a phase-5 output (`SKILL.md`)

`SKILL.md`'s **Phases** table lists what each phase produces; its phase-5 "Produces" cell reads "Documentation (both internal and external)". The run summary is a new phase-5 output and now gates run completion, so it belongs in that cell at the same altitude as the rest of the table (one short phrase per phase, not a file list).

Concrete edit:

- Extend the phase-5 "Produces" cell to name the run summary, e.g. "Documentation (both internal and external) and the run summary".

This keeps the table's one-line-per-phase altitude; the run-level placement, predicate, and producer are specified in C1–C2, not here. *(R3; AC1)*

### Explicitly untouched

- **`reference/resume-pipeline.md`** — delegates entirely to the **Per-phase completion** predicate, which C2 extends; no resume-specific change is needed. Resume's rollback reverts the active phase's commits; since the summary is the single last file of phase 5, re-running phase 5 simply rewrites `run-summary.md` (see Risks). *(R2; AC2)*
- **`reference/health-monitoring.md`** — reads the artifact folder generically (signals, not layout); nothing to change.
- **The lineage / tree-SHA logic** in `pipeline-versioning.md` — hashes `base/<phase>` folder trees only; a run-level file stays out of lineage comparison and never pollutes a phase-5 tree SHA (summaries differ per run). No change needed; correctness comes free from D2.
- **`reference/autonomous-workflow.md`** — operates on "the active run's folder" with deliberate run-agnosticism; the run-aware collection lives in `review-pipeline.md` (C5), not here.

## Interfaces and Data Flow

**File contract.** Each run produces exactly one `<artifacts-folder>/<run>/run-summary.md` — a constant filename at the run-folder root, with `<run>` ∈ {`base`, `review-N-<short-description>`}. Run identity is read from the `<run>/` path segment; the filename never embeds it. The `run-` prefix makes the name read as a single run's summary, not a pipeline-level one. *(R1, R8; AC1, AC7)*

**Producer flow (per run, end of phase 5).**

```
doc-reviewer approves → writes 5-docs/docs-review-approved.md
        │
        ▼
orchestrator launches run-summary-writer
   (spawn prompt: Artifact folder + Commit format + resolved summary format)
        │  reads run-folder artifacts + shipped code/docs as files; no git base ref
        ▼
run-summary-writer writes & commits <run>/run-summary.md
        │
        ▼
phase-5 predicate satisfied: docs-review-approved.md AND run-summary.md committed
        → run complete
```

**Fork-completion flow (orchestrator, in `fork-pipeline.md`, when the inherited phase is `5-docs`).**

```
fork seeds base/0-intent … base/5-docs (copy loop; no run-summary.md copied)
        │
        ▼
inherited phase == 5-docs?
   ├─ no  → fork runs phase 5 itself later (producer flow above)
   └─ yes → orchestrator launches run-summary-writer for the fork's base run
                 │  reads the fork's inherited base/ artifacts; no git base ref
                 ▼
            writes & commits base/run-summary.md → fork's phase 5 complete
```

**Format-resolution flow (orchestrator, before spawning the writer).**

```
.rp.md "Run summary format"?
   ├─ named  → project format wins
   └─ silent → skill default reference/run-summary-format.md
                 └─► passed to run-summary-writer in its spawn prompt
```

**Review-run input flow (orchestrator, at review-run start, in `review-pipeline.md`).**

```
starting review-N
   → collect run-summary.md of base, review-1, …, review-(N-1)  (run order)
        ├─ autonomous: pass collected content into phase-1 spawn prompts
        └─ assisted:   orchestrator reads it while authoring phase-1 artifacts
   (delivered as content, never as run-named paths)
        ▼
review-N phase 1 (spec) absorbs prior context; phases 2–5 use review-N's own artifacts
```

**Immutability.** A run's `run-summary.md` is written only by that run's own `run-summary-writer`, within that run's folder. A review never restructures or rewrites a prior run; it only adds a sibling run folder. Prior runs' summaries are therefore byte-identical before and after any later run, with no summary-specific rule needed (the general rule already covers it). *(R6; AC5)*

## Key Decisions

### D1 — Fold the summary into phase 5, gated by the existing predicate

**Choice:** Produce `run-summary.md` as the final step of phase 5 after docs approval, and extend the phase-5 row of the **Per-phase completion** table to require it.
**Alternatives:** A new dedicated phase 6 (the summary); a separate run-completion condition in the orchestrator's run close-out.
**Trade-offs:** A phase 6 contradicts the spec's fixed final phase (5 – Docs) and brings a writer/reviewer/folder apparatus the spec excludes (no review gate). A separate close-out condition would split "run complete" into two conditions defined in different places, forcing a restatement on every path that checks completion. Folding into phase 5 keeps one completion source: both evaluation moments already read the predicate table, so extending one row gates completion everywhere with no duplication. Mode-independence is fine since only autonomous runs reach phase 5.
**Traces to:** R2, R3; AC1, AC2.

### D2 — Run-level placement with a constant filename

**Choice:** `<artifacts-folder>/<run>/run-summary.md`, outside any phase folder, constant filename.
**Alternatives:** Inside the phase folder (`<run>/5-docs/run-summary.md`); a dedicated run-level pseudo-phase subfolder (`<run>/summary/`).
**Trade-offs:** A file inside `5-docs/` would be copied by a fork inheriting phase 5 (fork copies every inherited `<phase>` folder), violating R10 unless a special-case negative exclusion is added; it would also pollute the `5-docs` lineage tree SHA. A pseudo-phase subfolder is heavier with no benefit. Run-level placement costs only the wording generalization in C2 (three co-located edits in one file) and makes fork-exclusion and lineage-cleanliness structural — fork's phase-folder-only copy never touches a run-level file. This satisfies R10's **no-copying** leg structurally; R10's other leg — "each pipeline's runs produce their own" — interacts with the extended predicate (C2) and is handled in D7/C6 (a fork inheriting `5-docs` produces its own summary so it lands complete). The constant filename matches the universal naming convention (run-agnostic agents never see the run name, so the filename cannot embed it); the `run-` prefix makes it read as a per-run summary.
**Traces to:** R1, R8, R10; AC1, AC7, AC8.

### D3 — A new single-shot `run-summary-writer`, artifacts-only

**Choice:** A new single-shot agent writes and commits the summary from the run's committed artifacts and shipped files, with no git base ref.
**Alternatives:** The orchestrator writes it (the phase-0 intent pattern); an existing phase-5 agent (`doc-reviewer` on approval, or the last `doc-writer`) absorbs it.
**Trade-offs:** Orchestrator authorship breaks the autonomous-workflow rule that agents author and commit their own artifacts (the intent exception is phase-0-specific and predates the team, and phase 0 is orchestrator-authored for a different reason). Overloading an existing agent breaks its contract: `doc-reviewer` is review-only and may iterate; each `doc-writer` is single-task-scoped; the summary is written exactly once, after approval, ungated. A new agent follows the exact pattern every phase uses to add a role (one table row + one step + one outputs line skill-side; one agent file + one model row project-side), and since there is no review gate it needs no writer/reviewer loop — one agent, one shot. Grounding it in artifacts only (no diff) keeps the mechanism generic.
**Traces to:** R2, R4, R9; AC1, AC3, AC9.

### D4 — Skill default format + new optional override convention

**Choice:** Ship `reference/run-summary-format.md` as the default; add an optional "Run summary format" convention so a project can override it in `.rp.md`; the orchestrator resolves the winner and passes it in the writer's spawn prompt.
**Alternatives:** Format inline in `5 - docs.md`; format only in the project-side `agents/run-summary-writer.md`.
**Trade-offs:** A format only in the project agent fails R7 — the skill would define no default. Inline in the procedure file mixes a format spec into a procedure and offers no override hook; `intent-format.md` establishes that formats get their own reference file. A dedicated file plus the existing inherit-or-override semantics composes two established precedents with the least new surface. The convention is **optional** so `load.md`'s missing-required block never fires on a silent project, satisfying AC6's no-override leg. The override replaces the format wholesale, so the R4 content guarantees hold for the default; this is deliberate and AC6 permits it.
**Traces to:** R4, R7, R9; AC3, AC6, AC9.

### D5 — Default structure: What / Why / How + run-level context

**Choice:** `# Run Summary`, then `## What`, `## Why`, `## How`, `## Key decisions`, `## Rejected approaches`, `## Known limitations`; each with an HTML-comment placeholder; omit-empty sections (no `N/A`); standalone document; run-name-free H1.
**Alternatives:** What/Why/How only, with R4's decisions/rejected/limitations folded into "How."
**Trade-offs:** Folding the three context concerns under "How" buries them; promoting each to its own H2 matches the house style's section-per-concern and makes them legible to the consumer (a later review run reads the summary with no other prior-run context, hence the standalone discipline).
**Traces to:** R4, R7; AC3.

### D6 — `review-pipeline.md` collects prior summaries; no new immutability rule

**Choice:** `review-pipeline.md` states the collection rule once (`base, review-1, …, review-(N-1)`, in order) and feeds the collected summary **content** into the review run's phase-1 input, mode-independently, before mode dispatch. No summary-specific immutability rule.
**Alternatives:** Fold prior-summary context into the review intent; have the shared `autonomous-workflow.md` detect review runs and gather siblings itself.
**Trade-offs:** Folding into the intent fails R5/AC4 (summaries would no longer be inputs in their own right) and bloats the intent past its capture-the-request discipline. Putting collection in the shared workflow breaks that workflow's deliberate run-agnosticism (it has no run branching). `review-pipeline.md` is the only file that already knows run names and already uses the extra-spawn-input channel (rejection-file path, base ref precedents). Passing content rather than run-named paths preserves agent run-agnosticism. R6/AC5 are already covered by the general "a review only ADDS a sibling run folder, never rewrites prior runs" rule, so a summary-specific immutability sentence would duplicate it.
**Traces to:** R5, R6; AC4, AC5.

### D7 — A fork inheriting `5-docs` produces its own summary

**Choice:** When `fork-pipeline.md` inherits `5-docs`, it launches the `run-summary-writer` for the fork's `base` run after seeding, so the fork produces its own `run-summary.md` from the inherited artifacts and lands complete.
**Alternatives:** Constrain the inheritable phases to `4-code` so a fork always runs phase 5 (and the writer) itself; or define an inherited-`5-docs` state with a bespoke non-destructive completion path; or do nothing and let the run-level copy-exclusion stand alone.
**Trade-offs:** Doing nothing regresses a state the skill explicitly supports: under the extended predicate (C2) a fork that inherits `5-docs` lands phase-5-incomplete, which surfaces as a "(in progress)" tree node, a blocked review-start gate, and a resume that rolls back the single seed commit — the cross-file interaction this design exists to settle. Constraining inheritance to `4-code` removes a capability `fork-pipeline.md` currently offers (inheriting a complete `5-docs`) that the spec does not ask to drop. A bespoke completion path adds new state semantics for no gain. Launching the writer reuses the agent C3 already defines and matches R10's "each pipeline's runs produce their own": the fork's summary is authored by the fork's own writer from the fork's own (inherited) artifacts, not copied from the parent — so R10's no-copying leg (D2) and its produce-its-own leg are both satisfied. Cost is one conditional step in `fork-pipeline.md` (C6).
**Traces to:** R3, R10; AC1, AC8.

## Dependencies

- **`reference/pipeline-versioning.md`** — the **Per-phase completion** predicate (extended, C2) and the artifact-layout wording (generalized, C2). The single source of truth every completion/resume/review-gate check reads.
- **`reference/autonomous-phases/5 - docs.md`** — the phase where the writer is launched (C1).
- **`reference/review-pipeline.md`** — the only run-name-aware file; carries the prior-summary collection (C5).
- **`reference/fork-pipeline.md`** — launches the writer for the fork's `base` run when it inherits `5-docs` (C6).
- **`SKILL.md`** — the Phases table's phase-5 "Produces" cell, extended to name the run summary (C7).
- **`reference/conventions/load.md` and `reference/conventions/setup.md`** — the convention table and setup entry for the new optional "Run summary format" (C4).
- **Project side** — `agents/run-summary-writer.md` (the concrete agent) and an "Agent models" row in `.rp.md`, supplied by the consuming project as for every agent (C3).
- **No new external libraries, services, or runtime dependencies.** The mechanism is documentation/orchestration only; no application code ships.

## Failure Modes and Observability

- **FM-1 — Resume after a partial phase 5 (docs approved, no summary).** The extended predicate (C2) means such a run has phase 5 as its active phase, so resume re-runs phase 5 and **rewrites** `run-summary.md`. This is correct: R6 immutability applies to *completed* runs' summaries, not to a summary being (re)written by its own still-incomplete run. The design states this explicitly so resume's single-phase-folder rollback assumption holds (the summary is the single last file written in the phase).
- **FM-2 — Run-name leakage into agents.** Prior summaries are the first cross-run input; delivering them as run-named paths (`base/run-summary.md`) would leak run identity into otherwise run-agnostic agents. **Mitigation:** D6/C5 pin content delivery — collected summary *content* in run order, never paths.
- **FM-3 — Override drops the R4 content guarantees.** A project override replaces the format wholesale, so the key-decisions/rejected-approaches/known-limitations guarantees hold only for the skill default. **Mitigation:** accepted and AC6-sanctioned; the override is the project's deliberate choice, documented in C4/D4.
- **FM-4 — Summary accuracy is ungated.** The spec excludes a content review gate, so an inaccurate summary could mislead a later review run. **Mitigation (only):** the writer reads the full committed run record (all phase artifacts plus the rejection files and shipped code/docs), maximizing grounding; accuracy is otherwise accepted as out of scope.
- **FM-5 — Silent project with no override.** A project that never sets the "Run summary format" convention must still get a summary. **Mitigation:** the convention is optional with the skill file as fallback (C4/D4), so `load.md`'s missing-required block never fires and the default format applies.
- **FM-6 — Fork inheriting `5-docs` lands phase-5-incomplete.** The run-level copy-exclusion (D2) means a fork inheriting `5-docs` seeds no `run-summary.md`, so under the extended predicate (C2) its phase 5 is incomplete — a "(in progress)" tree node, a blocked review-start gate, and a resume that would roll back the seed commit. **Mitigation:** D7/C6 — `fork-pipeline.md` launches the `run-summary-writer` for the fork's `base` run when it inherits `5-docs`, so the fork produces its own summary and lands complete.

**Observability.** Verification is by inspection of committed artifacts: exactly one `<run>/run-summary.md` exists at the run-folder root and is committed once the run is complete (AC1); a run with docs approved but no summary is not complete because the phase-5 predicate is unsatisfied (AC2); the summary's sections describe what changed and why and record key decisions, rejected approaches, and known limitations (AC3); on a review-N start the orchestrator's collected input contains the prior runs' summaries in run order (AC4); prior summaries are byte-identical before and after a later run (AC5); a project override yields the project's format and silence yields the default (AC6); the filename `run-summary.md` reads as a single run's summary (AC7); a fork copies no `run-summary.md` because the copy loop touches only phase folders, and a fork that inherits `5-docs` has its own freshly written `run-summary.md` and lands complete (AC8); the default format and the writer reference no GitHub/git/tracker concept (AC9).

## Risks and Open Questions

**Risks** (all addressed above): resume rewriting an incomplete run's summary (FM-1, by design); run-name leakage if delivered as paths (FM-2, mitigated by content delivery); override dropping R4 guarantees (FM-3, AC6-sanctioned); ungated summary accuracy (FM-4, spec out-of-scope, mitigated by full-record grounding); fork inheriting `5-docs` landing incomplete (FM-6, resolved by D7/C6).

**Open questions for the implementation plan** — both are wording choices already constrained here, not design gaps:

- **OQ-1 — Exact generalized wording** for the two `pipeline-versioning.md` sentences that pin artifacts to `<run>/<phase>` (the layout sentence and the predicate-evaluation sentence). **Constraint:** the generalization must let the phase-5 predicate row name the run-level `run-summary.md` while keeping `<phase>/…` the common case. Both edits are co-located in one file with the table change (C2).
- **OQ-2 — Exact spawn-prompt phrasing** for handing the resolved summary format to the `run-summary-writer` (C4) and the collected prior summaries to phase-1 agents (C5). **Constraints fixed here:** the format is resolved by the orchestrator (project override else skill default) and passed like Artifact folder / Commit format; the summaries are passed as content in run order, without run names.
