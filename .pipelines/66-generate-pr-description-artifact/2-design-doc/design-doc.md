# Design Doc: Generate a PR description artifact

## Overview

When a Radical Pipelines run finishes and a pull request is opened, the PR body
has no documented source. The only place the pipeline names one today is a single
reference in the `artifacts-in-fork` setup convention (`setup.md:122`), which
tells the orchestrator to open the PR "using `pr-description.md` as the body."
That reference is dangling: it names a bare filename with no path, no producer,
and no content contract, and nothing in the pipeline ever creates that file. As a
result, anyone opening a PR for a finished pipeline must re-derive the description
from scratch by reading the full diff.

This design makes the pipeline produce the PR description as a real, inspectable,
self-contained Markdown artifact, `<artifacts-folder>/5-docs/pr-description.md`,
during the Docs phase (phase 5). Phase 5 is the natural home: it is the first and
only point where spec intent, design rationale, code, and documentation coexist
and have been reviewed together, so the description can be written once against
real sources instead of being reconstructed later. The artifact is produced by an
ordinary `doc-writer` executing a mandatory, standardized final task that the
`doc-plan-writer` appends to every doc plan, reviewed for accuracy by the existing
`doc-reviewer` under the phase's single approve/reject gate, and required for
phase-5 completion. The pipeline's own descriptions of what phase 5 produces are
updated to enumerate it, and the pre-existing `setup.md:122` reference is
reconciled so the pipeline no longer contradicts itself. The "implementation" here
is edits to this repo's own pipeline reference docs, agent definitions,
conventions, and `SKILL.md` — not application code. Authoring the procedure that
consumes the artifact to open a PR (`merge-pipeline.md`, issue #57) is explicitly
out of scope.

## Approach

The artifact rides the phase-5 machinery that already exists, with the smallest
set of edits that make a `pr-description.md` task a first-class member of the doc
plan rather than a bolt-on. The mental model for the implementer is: **the PR
description is just another doc task — one that is always present, always last,
and carries a few extra constraints — so every existing mechanism (plan, dispatch,
sequential commit, review, task-ID re-dispatch, single approval terminator,
fork/resume) carries it for free.**

The phase-5 dispatch loop runs `doc-plan.md` tasks strictly sequentially, "in the
order specified," waiting for each `doc-writer` to commit before launching the
next (`5 - docs.md`, Steps 3). Rejection is task-ID-based: the `doc-reviewer`
reports the deduplicated set of task IDs that have issues, and the orchestrator
re-dispatches only those tasks. Any producer that owns a real task ID therefore
rides the reject/redispatch loop with no new machinery — which is exactly the
"re-dispatched alongside any other flagged work... no separate approval or
terminator" behavior the spec mandates (R8/AC7).

End-to-end, the design works as follows:

1. **Plan.** The `doc-plan-writer` appends one mandatory, standardized
   PR-description task to every doc plan it produces. The task is placed last and
   `Depends on` all prior tasks, so by construction it runs after every other
   doc-writer has committed and can read the committed docs. Because it is a
   normal `doc-plan.md` entry, it carries a real task ID and is part of the
   reviewer's batch list for free.

2. **Plan review.** The `doc-plan-reviewer` is taught about this one task so its
   feasibility check does not reject the non-host `Files` target
   (`5-docs/pr-description.md`) or the "summarize the whole change" goal, and so it
   can assert the mandatory task is present.

3. **Produce.** An ordinary `doc-writer`, launched fresh for the final task,
   writes `pr-description.md`. A durable carve-out in its charter tells it to (a)
   follow the host project's PR conventions discovered at produce-time, (b) keep
   the artifact self-contained (no links into the artifact folder, no
   fork-relative paths), and (c) link the originating issue tracker-agnostically.

4. **Review.** The existing `doc-reviewer` reviews the artifact as part of its
   normal batch pass, with three added checks (whole-change accuracy, issue link,
   self-containment). A problem is reported as an issue tagged to the
   PR-description task ID in the reviewer's normal rejection structure; the
   existing task-ID re-dispatch carries it. There is no second approval and no
   second terminator.

5. **Re-dispatch ordering.** `5 - docs.md` gains a deterministic orchestrator
   rule: the PR-description task is always part of any non-empty re-dispatch batch
   and always runs last. This guarantees the description is re-produced against the
   latest docs every iteration, so it is never stale at approval even when only an
   upstream doc task was flagged.

6. **Completion and enumeration.** The phase-5 completion predicate is strengthened
   to require both `docs-review-approved.md` and `pr-description.md`. The three
   surfaces that enumerate phase-5 outputs (the phase reference's Outputs list and
   its step-6 self-check, the `SKILL.md` Produces table, and the
   `pipeline-versioning.md` predicate) are updated to name the artifact.

7. **Reconciliation.** The pre-existing `setup.md:122` reference is rewritten to
   name the artifact's canonical fork-side location and to say "the content of"
   the artifact is used as the body.

Fork and resume require no design action: the artifact lives in `5-docs/` and is
copied/preserved with that folder by construction (see Failure Modes /
Fork-and-resume).

## Components

The change touches the pipeline's own reference material. No application code and
no runtime is involved. The components below are the markdown surfaces that own
each behavior; the precise edit-site ledger (file plus semantic anchor) is
preserved in **Interfaces and Data Flow** so the plan phase has zero discovery
work.

**Modified components**

- **`doc-plan-writer` agent (`agents/doc-plan-writer.md`).** Gains a mandatory,
  standardized always-last PR-description task that every doc plan must contain.
  This is a new *shape* for the plan-writer — every other task it emits is
  feature-derived; this one is fixed and always present (stated as a deliberate
  deviation, see Key Decisions).

- **`doc-plan-reviewer` agent (`agents/doc-plan-reviewer.md`).** Gains a
  feasibility carve-out so the non-host `Files` target and the summarizing goal are
  not flagged, and ideally asserts the mandatory task's presence.

- **`doc-writer` agent (`agents/doc-writer.md`).** Gains the produce-time content
  contract for `pr-description.md`: host-PR-convention discovery, the
  self-containment negative constraint (including the R3-over-R5 provenance-path
  rule), and the tracker-agnostic issue link sourced from `0-prompt/prompt.md`.

- **`doc-reviewer` agent (`agents/doc-reviewer.md`).** Gains three accuracy checks
  for the artifact (whole-change, issue link, self-containment) plus the issue
  identifier input.

- **Phase-5 reference (`5 - docs.md`).** Gains the always-last re-dispatch ordering
  rule, the Outputs-list enumeration entry, and the strengthened step-6 self-check.
  (Three distinct edits in one file — keep them separate.)

- **Skill overview (`SKILL.md`).** The per-phase "Produces" table row for phase 5
  gains a noun phrase naming the PR description artifact.

- **Pipeline versioning (`pipeline-versioning.md`).** The phase-5 completion
  predicate gains `pr-description.md` alongside `docs-review-approved.md`.

- **Setup convention (`setup.md`).** The `artifacts-in-fork` PR-open step-5
  reference is reconciled to the artifact's canonical fork-side location.

**Modified-but-only-via-launch-context component**

- **Autonomous workflow (`autonomous-workflow.md`).** The orchestrator's standing
  "include these conventions in each agent's initial prompt" list gains the Issues
  convention (tracker plus access), so the producer and reviewer can link the issue
  tracker-agnostically and inspect recent merged PRs for host conventions.

**Untouched-but-relevant components (verified non-edits — do not chase)**

- `5 - docs.md` mermaid diagram (depicts the review loop, not the output
  inventory).
- `autonomous-workflow.md` and `assisted-workflow.md` Phase/Subfolder/Reference
  tables (no output enumeration).
- `pipeline-versioning.md` tree-rendering examples (label by folder, key on tree
  SHAs, never on predicate filenames).
- `work-on-an-issue.md` Merge gate (benefits from the strengthened predicate
  automatically — a phase 5 missing the artifact is not "complete," so Merge is not
  offered; editing it would drift into #57's territory).
- `doc-reviewer.md` terminator list (names the files the *reviewer* writes; the
  doc-writer writes `pr-description.md`, so it must not be added there).
- Repo-mode `.rp.md` / setup (adding a repo-mode consumer reference would author
  PR-opening behavior, which is #57's).

## Interfaces and Data Flow

### The artifact (file format)

`<artifacts-folder>/5-docs/pr-description.md` is a single self-contained Markdown
file whose entire content can be used verbatim as a pull-request body — no
assembly, concatenation, or templating (R2/AC2). Its content contract:

- **Structure follows host PR conventions, discovered at produce-time
  (R5/AC4).** Template if the host provides one; otherwise the host's
  observed/de-facto conventions discovered by inspecting recent merged
  pull/merge-requests in the host's tracker; otherwise a sensible generic body. No
  fixed section names are mandated. For *this* host there is no PR template
  (`.github/` holds only `workflows/`), so the contract falls through to the
  observed-conventions branch. The generic fallback is expressed as content
  *categories*, not headings: a short summary of what shipped and why, a breakdown
  of the concrete changes, how it was verified, and the issue reference.

- **Self-contained (R3/AC2).** No references into the pipeline's artifact folder
  and no fork-relative paths (in `artifacts-in-fork` mode the upstream PR viewer
  never sees the fork's `.rp/` tree, so such links would be broken). It MAY link to
  publicly-resolvable targets such as the originating issue or a "Generated with
  Claude Code" absolute URL.

- **Issue link, tracker-agnostic (R4/AC3).** References the originating issue in
  the form the host's PR conventions and tracker use: where the tracker supports an
  auto-close keyword and the host uses it, use it (e.g. a GitHub `Closes #N`);
  otherwise a plain link or identifier that resolves in the host's tracker. No
  GitHub-specific keyword is hard-coded. The issue identifier is read from
  `0-prompt/prompt.md` ("Source issue: ...#N"), which every pipeline inherits and
  which is identical across an issue's pipelines.

- **Whole-change accuracy (R6/AC5).** Summarizes spec intent, design rationale,
  the code, and the phase-5 documentation. Every claim corresponds to an actual
  change — nothing invented, nothing stale.

### The mandatory final doc-plan task (message shape)

The `doc-plan-writer` emits this as the last entry of every `doc-plan.md`, using
the existing task template (Goal / Audience / Files / Sections-scope / Depends on /
Traces to / Acceptance):

- **Files:** `<artifacts-folder>/5-docs/pr-description.md`
- **Depends on:** all prior tasks (so it runs last and reads committed docs)
- **Acceptance:** follows host PR conventions / self-contained / links the issue /
  reflects the whole shipped change

The agent-file clauses are load-bearing and durable (they apply every run); the
per-task `Acceptance` echo reinforces them for run-specific traceability.

### Convention plumbing (data flow into agents)

Neither `doc-writer` nor `doc-reviewer` reads `setup.md` directly. The orchestrator
already loads conventions and passes a fixed set into each agent's launch prompt
(`autonomous-workflow.md`: Artifact folder, Commit format). This design adds the
**Issues convention** (tracker plus access) to that pass for phase 5. Tracker
*access* is what enables the "inspect recent merged PRs" discovery; the issue
*identifier* alone is also readable from `0-prompt/prompt.md`, so the identifier
dependency degrades gracefully, but access keeps the plumbing edit required.

### Re-dispatch ordering rule (control flow)

`5 - docs.md` carries a deterministic rule on the orchestrator's standing per-batch
behavior: the PR-description task is **always** part of any non-empty re-dispatch
batch and **always** runs last. Because the task is last in plan order with
`Depends on` all others, and the per-task loop is strictly sequential and runs
re-dispatch in plan order, the re-run reads the updated docs after the re-run doc
tasks commit, then re-produces the description.

### Authoritative edit-site ledger (preserved verbatim for the plan phase)

Line numbers are semantic anchors verified live against the current tree; the doc
prose may shift them by a line or two, so the implementer keys on the anchor text,
not the exact number. R = required, O = optional. Mechanism (M), Enumeration (E),
Reconciliation (C). All seven unique files below were confirmed present and the
anchors confirmed live during this design.

**Mechanism:**

- **M1 `agents/doc-plan-writer.md`** (anchors: "Cover every relevant surface"
  guideline `:63`; task template `:37-50`) — mandatory always-last PR-description
  task (`Files=5-docs/pr-description.md`, `Depends on` all, `Acceptance` = host
  conventions / self-contained / links issue / whole change). Serves R1, R5, R6;
  carrier for R3/R4/R7. REQUIRED.

- **M2 `agents/doc-plan-reviewer.md`** (anchor: Feasibility "Flag references that
  won't be findable in phase 5" `:29`) — feasibility carve-out so the non-host
  `Files` target isn't flagged, plus assert the mandatory task is present. Serves
  R1, R11. REQUIRED.

- **M3 `agents/doc-writer.md`** (anchors: doc-convention read `:17`; "Cross-links
  resolve" `:36`; doc-surface enumeration / "Do NOT touch source code" `:60`) —
  (i) produce-time host-PR-convention discovery; (ii) self-containment including
  stripping the `.rp/...` provenance path (R3-over-R5); (iii) tracker-agnostic
  issue link from `0-prompt/prompt.md`. Serves R3, R4, R5, R6. REQUIRED.

- **M4 `agents/doc-reviewer.md`** (anchors: context reads `:14-21`; the existing
  accuracy spot-check `:36-37`; rejection structure `:71-81,87`) — three checks
  (whole change / issue link / self-contained including provenance path) plus
  Issues input. Serves R6, R8, R3, R4. REQUIRED.

- **M5 `5 - docs.md`** (anchors: sequential dispatch / re-dispatch loop, Steps
  3-5) — always-last re-dispatch rule (re-run the PR-description task whenever any
  task is re-dispatched). Serves R6, R8. REQUIRED.

- **M6 `autonomous-workflow.md`** (anchor: "include the following project
  conventions in its initial prompt" `:59-61`) — pass the Issues convention
  (tracker plus access) into phase-5 launch context. Serves R4, R6. REQUIRED
  (tracker access is needed for "inspect recent merged PRs" discovery; the issue
  identifier alone is readable from `0-prompt/prompt.md`, so the identifier
  dependency degrades gracefully, but access keeps M6 required — see Open
  Questions).

**Enumeration (R11, descriptive nouns only — no merge/PR-opening verbs):**

- **E1 `5 - docs.md`** (Outputs list, the block beginning "Outputs:") — add a
  bullet for `<artifacts-folder>/5-docs/pr-description.md`. Serves R11. REQUIRED.

- **E2 `5 - docs.md`** (step-6 self-check: "...and `docs-review-approved.md` are
  committed on the pipeline branch") — must also name `pr-description.md`, else the
  self-check passes without it, contradicting the strengthened predicate. **THE
  EASILY-MISSED ONE — flag loudly for the implementer.** Serves R7, R11. REQUIRED.

- **E3 `SKILL.md`** (per-phase Produces table, row 5: "Documentation (both internal
  and external)") — add a noun phrase, e.g. "...; PR description artifact". Serves
  R11. REQUIRED.

- **E4 `pipeline-versioning.md`** (predicate table, row "5 – Docs":
  "`5-docs/docs-review-approved.md`") — becomes
  "`5-docs/docs-review-approved.md` and `5-docs/pr-description.md`", mirroring phase
  3's "X and Y" format; keep the en-dash "5 – Docs". This is the only edit in this
  file. Serves R7, R11. REQUIRED.

**Reconciliation:**

- **C1 `setup.md`** (step 5 of the `artifacts-in-fork` PR-open list, currently
  "Opens the PR in `upstream` from that clean branch, using `pr-description.md` as
  the body.") — reconcile to the canonical fork-side location and "the content
  of...". Steps 1-4 and the following "viewers never see the fork" line are
  unchanged. Serves R10. REQUIRED. Exact before/after:
  - BEFORE: "5. Opens the PR in `upstream` from that clean branch, using
    `pr-description.md` as the body."
  - AFTER: "5. Opens the PR in `upstream` from that clean branch, using the content
    of the phase-5 PR-description artifact
    (`<artifacts-folder>/5-docs/pr-description.md` in the fork) as the body."

**Note:** `5 - docs.md` carries THREE distinct edits (M5 + E1 + E2) — keep them
separate.

**Requirement → edit coverage (all 11 served or by construction):**
R1→M1 (+E4); R2→M3.i/ii; R3→M3.ii / M4.iii (+C1 design note); R4→M3.iii / M4 /
M6; R5→M3.i / M4; R6→M1 / M3 / M4.i / M5; R7→E4 / E2; R8→M4 + existing task-ID
loop (no new terminator); R9→by construction (no edit); R10→C1; R11→E1 / E2 / E3 /
E4.

## Key Decisions

### Decision: Produce via a mandatory standardized final doc-plan task executed by an ordinary doc-writer (option E)

- **Choice:** The PR-description artifact is produced by an ordinary `doc-writer`
  executing a MANDATORY, standardized FINAL task that the `doc-plan-writer` appends
  to every doc plan — placed last, `Depends on` all prior tasks. It is a
  first-class, inspectable `doc-plan.md` entry, so it carries a real task ID and
  rides the existing writer → commit → review → task-ID-redispatch loop with no
  synthetic-ID injection.
- **Alternatives:** (A) a regular doc-plan task *discovered* by the plan-writer —
  rejected because it relies every run on the plan-writer emitting the task against
  the grain of its "Cover every relevant surface" guideline (which is about
  sweeping the host repo for drift, not new summarizing artifacts) and on the
  plan-reviewer not flagging a non-host `Files` target; fragile for no mechanical
  benefit. (B) the orchestrator authors the file itself after the doc batch —
  re-imposes the orchestrator context burden the prompt warns against and has no
  existing reviewer→orchestrator send-back path. (C) a new dedicated
  `pr-description-writer` agent outside the task loop — cleanest charter fit but
  sits outside the task-ID reject/redispatch loop, so honoring the single-gate
  requirement needs a synthetic task ID or a parallel redispatch path anyway,
  converging back toward (D)/(E) plus an extra agent file to maintain. (D) a fixed
  phase-5 step in `5 - docs.md` with a built-in task block carrying a synthetic task
  ID — fewer files (3) but concentrates synthetic-ID generation plus dual injection
  into the orchestrator's standing per-batch behavior (hard to keep correct across
  the initial batch and every re-dispatch) and breaks the clean invariant "the
  batch = the doc-plan tasks."
- **Trade-offs:** (E) spreads five small edits, each landing in the file that
  semantically owns it (plan-writer owns "what tasks exist," plan-reviewer owns "are
  tasks well-formed," doc-writer/reviewer own produce/verify, `5 - docs.md` owns the
  loop rule). The task ID is known to the reviewer for free and is "always last"
  for free via `Depends on`. The cost is the new task *shape* (see next decision).
  (E) preserves the invariant "the batch = the doc-plan tasks" that (D) breaks, and
  eliminates (A)'s every-run discovery fragility by making the task fixed rather
  than discovered.
- **Traces to:** R1, R6, R7, R8; AC1, AC5, AC6, AC7.

### Decision: The mandatory final task is a deliberate new shape for doc-plan-writer

- **Choice:** State consciously, in the design and in the plan-writer's charter,
  that "a mandatory fixed final task that every doc-plan must contain" is a new
  shape for `doc-plan-writer` — every other task it emits is feature-derived; this
  one is standardized and always present.
- **Alternatives:** Leave it implicit and let it read as one more discovered task —
  rejected because a reviewer or future maintainer could mistake it for an
  over-reach or scope creep, or could "fix" the plan-writer to stop emitting it.
- **Trade-offs:** A one-paragraph deliberate-deviation note (analogous to the
  two-file-predicate deviation) costs a little prose but prevents a category of
  misreading and future regression.
- **Traces to:** R1, R6 (the producer mechanism that satisfies them).

### Decision: Review under the single existing gate via the task-ID loop, with three added reviewer checks

- **Choice:** The existing `doc-reviewer` reviews `pr-description.md` as part of its
  normal batch pass. A problem is reported as an issue tagged to the PR-description
  task ID in the reviewer's normal rejection structure, and the existing task-ID
  re-dispatch carries it — no second approval, no second terminator. The reviewer
  gains three checks when the batch includes the artifact: (i) it reflects the whole
  shipped change (a natural extension of its existing accuracy spot-check); (ii) it
  links the originating issue per the Issues convention, tracker-agnostically; (iii)
  it is self-contained (no links into the artifact folder, no fork-relative paths).
  These live in `doc-reviewer.md` for durability; the per-task `Acceptance`
  reinforces them.
- **Alternatives:** A separate PR-description approval or terminator file — rejected
  outright by the spec (R8/AC7 mandate a single gate with no second terminator).
- **Trade-offs:** Reusing the task-ID loop adds zero new rejection path; the only
  cost is supplying the Issues convention to the reviewer, which the reviewer does
  not read today (handled by M6).
- **Traces to:** R3, R4, R6, R8; AC2, AC3, AC5, AC7.

### Decision: Always-last re-dispatch rule in the orchestrator (mitigates re-dispatch staleness)

- **Choice:** `5 - docs.md` gains a deterministic orchestrator rule: the
  PR-description task is always part of any non-empty re-dispatch batch and always
  runs last, so it is re-produced against the latest docs every iteration.
- **Alternatives:** (ii) "the reviewer always lists the PR-description ID in its
  rejection set" — rejected because it pushes a mechanical invariant into a judgment
  agent that is told "every issue is must-fix / don't report what you don't think
  needs fixing." (iii) "the reviewer re-checks the description on the clean pass" —
  rejected because it only *catches* staleness (the reviewer doesn't rewrite),
  forcing an extra loop.
- **Trade-offs:** The orchestrator rule re-PRODUCES against the latest docs every
  iteration — strongest, least surface, and lives in the file that owns the dispatch
  loop. The cost is one extra writer launch per re-dispatch iteration, which is
  cheap and deterministic.
- **Traces to:** R6 ("nothing stale"); AC5.

### Decision: R3-over-R5 precedence on the provenance line (the sharpest internal tension — flagged prominently)

- **Choice:** Where the host's observed PR conventions include a reference to the
  artifact folder or any fork-relative path (this repo's recent merged PRs include a
  "How this was produced" line citing the fork-relative `.rp/pipelines/...` path),
  **R3 takes precedence — keep the provenance mention, strip the path.** This
  precedence rule is authored in BOTH the producer contract (`doc-writer.md`, M3.ii)
  and the reviewer self-containment check (`doc-reviewer.md`, M4.iii).
- **Alternatives:** (a) drop the provenance line entirely — rejected because the
  mention itself matches host convention and carries no path; dropping it would
  needlessly diverge from observed conventions. (c) keep the path verbatim —
  rejected because it directly violates R3 (the path would not resolve in
  `artifacts-in-fork` mode, where upstream never sees `.rp/`).
- **Trade-offs:** Option (b) — keep the mention, strip the path — honors both R5
  (the convention's intent) and R3 (the hard constraint) at the cost of a small
  divergence from the literal observed line. The "Generated with Claude Code"
  trailer is R3-clean (an absolute, publicly-resolvable URL covered by R3's "MAY
  link to publicly resolvable targets" carve-out); whether to require it is a host
  convention question, not a #66 mandate. **This collision is the single most
  important thing for the implementer not to lose:** a producer that faithfully
  copies observed conventions WILL reintroduce the path and break R3 unless the
  precedence rule is explicit in both the producer and the reviewer.
- **Traces to:** R3, R5; AC2, AC4.

### Decision: Host-PR-convention discovery is implicit (produce-time), not a setup convention

- **Choice:** The producer discovers host PR conventions at produce-time — exactly
  as the doc agents already discover the host "documentation convention" and
  "verification convention," neither of which is a `setup.md` section: a template if
  present, else observed conventions via recent merged PRs, else a generic body. No
  fixed section names. An explicit optional `setup.md` PR-body convention is named
  as a DEFERRED, out-of-scope future extension, not foreclosed.
- **Alternatives:** Capture host PR conventions in a new optional setup convention
  recorded into `.rp.md` — rejected as out of scope (the spec's Out-of-Scope item 3
  defers "whether the host's PR conventions are discovered at produce-time or
  captured via a new optional setup convention" to the design phase, and recording a
  template path risks going stale relative to the repo).
- **Trade-offs:** Implicit discovery adds the least surface and never goes stale
  relative to the host, keeping PR conventions in the same "discovered, not
  configured" tier as the existing doc/verification conventions. The cost is that
  discovery needs tracker access at produce-time (supplied by M6).
- **Traces to:** R5; AC4.

### Decision: Tracker-agnostic issue link sourced from 0-prompt/prompt.md

- **Choice:** Contract wording: "Reference the originating issue in the form the
  host project's PR conventions and issue tracker use: where the tracker supports an
  auto-close keyword and the host uses it, use it (e.g. a GitHub `Closes #N`);
  otherwise a plain link or identifier that resolves to the issue in the host's
  tracker. Do not hard-code a GitHub-specific keyword." The identifier is read from
  `0-prompt/prompt.md` ("Source issue: ...#N").
- **Alternatives:** Hard-code `Closes #N` — rejected (R4/AC3 forbid baking in a
  GitHub-specific keyword). Inject the identifier solely via the orchestrator —
  rejected as the sole source because it makes the producer depend on the
  orchestrator remembering to inject it; `0-prompt/prompt.md` is the lowest-coupling
  source (inherited by every pipeline, identical across an issue's pipelines).
- **Trade-offs:** This wording PERMITS `Closes #N` (this repo's uniform observed
  convention) without MANDATING it. Tracker access from M6 is still needed for the
  observed-PR discovery, so M6 remains required even though the bare identifier is
  available from the prompt.
- **Traces to:** R4; AC3.

### Decision: Strengthen the phase-5 completion predicate to require both files (R7), enumerate descriptively (R11)

- **Choice:** `pipeline-versioning.md` row "5 – Docs" becomes
  "`5-docs/docs-review-approved.md` and `5-docs/pr-description.md`" (mirroring phase
  3's "X and Y" format; keep the en-dash). The other three enumeration surfaces
  (Outputs list E1, step-6 self-check E2, `SKILL.md` Produces row E3) are updated to
  name the artifact. Every enumeration edit states what phase 5 PRODUCES as a NOUN —
  none adds "...used to open the PR" / "...then open the PR" / "...ready to merge".
- **Alternatives:** A separate terminator file for the PR description — rejected
  (R8 forbids a second terminator; the predicate ANDs the existing terminator with a
  content artifact instead). Editing the Merge gate or adding a repo-mode consumer —
  rejected as #57 territory (AC11).
- **Trade-offs:** Phase 5 becomes the first phase to AND a review terminator with a
  non-terminator content artifact, but this is mechanically inert: phase 3 is
  precedent for the two-artifact AND shape, phase 0's `prompt.md` is precedent for a
  non-terminator required artifact, and the completed-phase / active / lineage
  machinery treats the predicate as a pure AND over committed artifacts and never
  inspects file TYPE. The noun-not-verb guardrail keeps each enumeration edit from
  importing consumer behavior.
- **Traces to:** R7, R11; AC6, AC10, AC11.

### Decision: Reconcile setup.md:122 as a path-honesty, fork-side reference

- **Choice:** Rewrite `setup.md` step 5 to name the canonical fork-side location and
  say "the content of...the phase-5 PR-description artifact
  (`<artifacts-folder>/5-docs/pr-description.md` in the fork) as the body." "in the
  fork" and "phase-5" are load-bearing: the cherry-pick step excludes artifacts, so
  `.rp/` (and `pr-description.md`) do not exist on the upstream branch the PR is
  opened from; the file lives in the fork, and the orchestrator (fork checked out)
  reads the body TEXT from it and supplies that text to the PR-open call. "phase-5"
  cures "producer-less" in three words without restating phase-5 mechanics.
- **Alternatives:** Name an upstream-relative path — wrong, the artifact is never on
  upstream. Restate the "already exists by PR-open time" guarantee — rejected as
  bloat that edges into #57's Merge-precondition territory; the guarantee is enforced
  structurally by the strengthened predicate gating the Merge action. Add a repo-mode
  consumer reference for symmetry — rejected because none exists and adding one would
  author a repo-mode PR-opening flow (#57/AC11).
- **Trade-offs:** This is a reference-honesty edit, not a behavior edit — the only
  legitimate consumer-side touch #66 owns. There is no R3 conflict: R3 governs what
  the ARTIFACT contains (its content becomes the published PR body, where fork paths
  would break); `setup.md:122` is a different surface — the convention that POINTS AT
  the artifact, read by the orchestrator and never published — so naming a fork path
  there is correct (a location-pointer must name a real location). State this
  explicitly so the reviewer does not false-positive an R3 violation.
- **Traces to:** R10; AC9, AC11.

## Dependencies

- **Existing phase-5 dispatch/review machinery** (`5 - docs.md`): strictly
  sequential per-task dispatch, task-ID-based rejection, deduplicated re-dispatch in
  plan order, single `docs-review-approved.md` terminator. The whole design rides
  this; it adds no parallel machinery.
- **The doc-plan task template** (`doc-plan-writer.md`) and the doc-writer/reviewer
  charters: the mandatory final task and the content/review constraints attach to
  these existing surfaces.
- **The orchestrator's launch-context convention pass** (`autonomous-workflow.md`):
  the Issues convention (tracker plus access) is threaded through this existing
  mechanism — a NEW dependency of phase-5 agents on the Issues convention, called
  out explicitly (M6).
- **`0-prompt/prompt.md`** as the low-coupling source of the originating issue
  identifier (inherited by every pipeline, identical across an issue's pipelines).
- **Fork/resume/lineage machinery** (`fork-pipeline.md`, `resume-pipeline.md`,
  `pipeline-versioning.md`): depended on only by construction — the artifact is a
  blob in `5-docs/` and needs no special handling (see Failure Modes).
- **No new external libraries, services, or runtimes.** The host's issue tracker is
  accessed via the same capability the pipeline already uses (phrased as a
  capability — "inspect recent merged pull/merge requests" — not a `gh` command).

## Failure Modes and Observability

This design adds no runtime; "failure modes" are the ways the pipeline could fail to
produce, review, or carry the artifact correctly, and how the existing inspectable
artifacts surface them.

- **Producer omits the task / writes nothing.** Mitigated by making the task
  MANDATORY in `doc-plan-writer` (not discovered) and by M2 ideally asserting its
  presence in plan review. Surfaced because the artifact's absence makes the phase-5
  predicate false (R7), so the phase is not "complete" and Merge is not offered
  (AC6) — a missing artifact is structurally visible, not silently skipped.

- **Description goes stale on re-dispatch.** This is the **re-dispatch staleness
  gap**: re-dispatch reruns only flagged task IDs in plan order, so an upstream doc
  task re-running without the PR-description task would leave the description stale
  at approval. Mitigated by the always-last re-dispatch rule (M5), which re-produces
  the description against the latest docs every iteration. Detected, in the worst
  case, by the reviewer's whole-change accuracy check (M4.i) on the next pass.

- **Producer reintroduces the fork-relative provenance path.** The **R5-vs-R3
  provenance-path collision** (flagged prominently in Key Decisions): a producer
  faithfully copying observed conventions WILL reintroduce `.rp/pipelines/...` and
  break R3. Mitigated by the explicit R3-over-R5 precedence rule authored in BOTH
  the producer (M3.ii) and the reviewer self-containment check (M4.iii) — keep the
  mention, strip the path. Detected by M4.iii on review; rejected via the task-ID
  loop.

- **Producer hard-codes a GitHub keyword on a non-GitHub host.** Mitigated by the
  tracker-agnostic contract wording (M3.iii) and the orchestrator supplying the
  Issues convention (M6). Detected by the reviewer's issue-link check (M4.ii).

- **Plan reviewer rejects the legitimate non-host task.** Mitigated by the M2
  feasibility carve-out so `5-docs/pr-description.md` and the summarizing goal are
  not flagged as "won't be findable in phase 5."

- **Self-check passes without the artifact.** The step-6 self-check (E2) is the
  easily-missed enumeration site: if it is not updated to name `pr-description.md`,
  the orchestrator's own completion self-check could pass while the strengthened
  predicate is unsatisfied. Mitigated by treating E2 as REQUIRED and flagging it
  loudly.

- **Enumeration edit imports consumer behavior.** Each enumeration edit is one
  keystroke from "...used to open the PR." Mitigated by the noun-not-verb guardrail
  (predicates are existence checks, structurally incapable of PR-opening behavior;
  the only consumer-side touch is C1, framed as reference-honesty).

**Fork and resume (satisfied by construction — no design action, R9/AC8).**
`fork-pipeline.md` seeds inherited phases by whole-folder copy (`cp -r <phase> ...`),
so `pr-description.md` rides the `5-docs/` copy byte-for-byte; fork only inherits
COMPLETE phases, and the strengthened predicate makes a complete phase 5 necessarily
include the artifact (predicate and fork rule reinforce each other).
`resume-pipeline.md` rolls back only the ACTIVE phase; a phase-5-complete pipeline
has no active phase, so resume never touches the completed `5-docs/`. For lineage,
`pr-description.md` is a blob in the `5-docs/` tree, so it folds into the folder's
tree SHA automatically; two phase-5-complete pipelines share the node iff the whole
folder (artifact included) is byte-identical. The only design action is placing the
file in `5-docs/`, which option (E) does.

**Mode/assisted safety.** The strengthened predicate is mode-agnostic in principle
but only ever evaluated for autonomous runs: the assisted workflow caps at phase 3
and never creates `5-docs/`, so it never strands on a missing `pr-description.md`.
Autonomous always produces the artifact under (E). Production is mode-independent
(the same phase 5 runs in both autonomous fork and repo modes; the predicate is the
same regardless of workflow mode), so `pr-description.md` is produced in repo mode
too — but #66 touches only the one pre-existing fork-mode consumer reference (C1)
and intentionally leaves the repo-mode consumer side for #57, because no repo-mode
consumer reference exists today and adding one would author a repo-mode PR-opening
flow (AC11).

## Risks and Open Questions

### Risks

- **R5-vs-R3 provenance-path collision (the sharpest internal tension).** The
  host's own observed PR convention includes a "How this was produced" line citing
  the fork-relative `.rp/pipelines/...` path. R5 says "follow observed conventions";
  R3 forbids fork-relative paths. A producer that faithfully copies observed
  conventions WILL reintroduce the path and break R3. Mitigation: the explicit
  R3-over-R5 precedence rule (keep the provenance mention, strip the path), authored
  in BOTH the producer (M3.ii) and the reviewer self-containment check (M4.iii). The
  implementer must not lose this collision or its precedence rule — it is the single
  most fragile point in the design.

- **Re-dispatch staleness gap (R6 "not stale").** Re-dispatch reruns only flagged
  task IDs in plan order; an upstream doc task re-running without the PR-description
  task would leave the description stale at approval. Mitigation: the always-last
  re-dispatch rule (M5) in `5 - docs.md` re-produces the description against the
  latest docs every iteration. The alternatives that push the invariant into the
  adversarial reviewer's judgment were rejected.

- **Two-file predicate misread as "terminators only."** Phase 5's predicate becomes
  the first to AND a review terminator with a content artifact. Phase 3 is precedent
  for the SHAPE; phase 0's `prompt.md` is precedent for a non-terminator required
  artifact; the completed-phase / active / lineage machinery treats the predicate as
  a pure AND and is unaffected. Mitigation: a one-sentence design nuance so a reader
  does not infer "predicate column = only `-approved.md` terminators."

- **Mandatory fixed final task is a new shape for `doc-plan-writer`.** Every other
  task it emits is feature-derived; this one is standardized and always present.
  Mitigation: state it as a deliberate, conscious deviation (analogous to the
  two-file predicate) so it is not mistaken for over-reach or scope creep, nor
  "fixed" away by a future maintainer.

- **AC11 drift in enumeration edits.** Each enumeration edit is one keystroke from
  importing consumer behavior (e.g. "...used to open the PR"). Mitigation: the ledger
  fixes each edit as a descriptive NOUN; the noun-not-verb guardrail is stated; the
  only legitimate consumer-side touch is C1, framed as reference-honesty.

### Open Questions (deferred, not foreclosed — none blocks the plan phase)

- **Explicit optional PR-body setup convention.** This design chooses IMPLICIT
  produce-time discovery of host PR conventions. An optional `setup.md` PR-body
  convention (template path / required sections, captured into `.rp.md`) remains a
  possible future extension — explicitly out of scope here (matches spec Out-of-Scope
  item 3). Decider: a future issue, if owners ask to pin PR conventions at setup
  time.

- **M6 required vs. optional.** If a future revision prefers minimal orchestrator
  change, M6 (passing the Issues convention into phase-5 launch context) could be
  downgraded and the issue link anchored solely on `0-prompt/prompt.md`. It is kept
  REQUIRED here because the "inspect recent merged PRs" discovery (M3.i) needs
  tracker ACCESS, which the orchestrator must supply; the issue IDENTIFIER alone
  degrades gracefully to the prompt, but access keeps M6 required.

- **Upstream-numbering resolution of `Closes #N` (deferred to #57).** In
  `artifacts-in-fork` mode the PR targets `upstream`, so how the issue reference
  resolves against upstream numbering at PR-open time is the merge procedure's
  concern (#57), not this artifact's (AC11). #66's contract only requires a
  tracker-agnostic reference to the originating issue. No design action here.
