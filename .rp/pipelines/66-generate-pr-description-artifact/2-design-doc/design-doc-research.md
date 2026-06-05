# Design Doc Research — Generate a PR description artifact

This document records the grounded design decisions for issue #66, produced by
iterative one-topic-at-a-time Q&A between the `design-doc-analyst` and the
`design-doc-researcher`. Each decision traces to a spec requirement (R1-R11) or
acceptance criterion (AC1-AC11) in `1-spec/spec.md`. The "implementation" here is
edits to this repo's own pipeline reference docs, agent definitions, conventions,
and `SKILL.md` — not application code.

## Research

### Phase-5 producer machinery (Topic 1)

- The phase-5 dispatch loop runs `doc-plan.md` tasks strictly sequentially, "in
  the order specified," waiting for each `doc-writer` to commit before the next
  (`5 - docs.md:32-35`). A task placed last with `Depends on` all earlier tasks
  is therefore guaranteed to run after every doc-writer has committed and can
  read the committed docs.
- Rejection is task-ID-based: the `doc-reviewer` reports "the deduplicated set of
  task IDs that have issues" (`doc-reviewer.md:87`) and the orchestrator
  "re-dispatches only those tasks" (`5 - docs.md:5,37`). Any producer that owns a
  real task ID rides this reject/redispatch loop for free — this is the machinery
  R8/AC7 already provides ("re-dispatched alongside any other flagged work... no
  separate approval or terminator").
- The `doc-writer` charter (`doc-writer.md:60`) enumerates HOST-project doc
  surfaces (READMEs, guides, examples, changelogs, contributor docs, internal
  conventions); `pr-description.md` is a pipeline artifact under `5-docs/`, not
  one of these, so a literal doc-writer could read its charter as excluding it.
  The strain is real but fixable with a small carve-out.
- A generic doc-writer's default instinct is to ADD resolvable cross-links
  (`doc-writer.md:31-36`, "Cross-links resolve"); `pr-description.md` requires the
  OPPOSITE — no links into the artifact folder, no fork-relative paths (R3/AC2,
  grounded in `setup.md:119,123`: the upstream PR viewer never sees the fork's
  artifacts). The negative constraint must live where the producer will read it.
- A generic doc-writer does not read the Issues convention today
  (`doc-writer.md:11-18` reads spec/design/code/host-doc-convention only). To link
  the originating issue tracker-agnostically (R4/AC3), the producer must be given
  the Issues convention (`setup.md:62-66`) or a pointer to it.
- `doc-plan-writer.md:63` ("Cover every relevant surface") is about sweeping the
  HOST repo for text that drifts with the change; `pr-description.md` is a NEW
  summarizing artifact, not a drift surface, so a doc-plan-writer following `:63`
  literally would not naturally emit the task — it must be told to. The
  `doc-plan-reviewer` feasibility check ("Flag references that won't be findable
  in phase 5," `doc-plan-reviewer.md:29`) would also flag a non-host Files target
  unless taught about this artifact.
- Ordering gap to carry forward: on re-dispatch the batch is only the flagged task
  IDs in plan order (`5 - docs.md:37`). If the reviewer flags an earlier DOC task
  but not the PR-description task, the PR description is not re-run even though its
  source content changed. A deliberate rule is needed (e.g. always re-run the
  PR-description task whenever any doc task in the batch is re-dispatched). RESOLVED
  in Topic 2 via the orchestrator rule in `5 - docs.md`.

### Host PR conventions and merged-PR prior art (Topic 3 input)

- There is NO PR template file in this repo (no `.github/PULL_REQUEST_TEMPLATE`), so
  under R5 the host convention for THIS repo resolves to the "observed/de-facto
  conventions" branch, not the "template" branch. (Researcher to confirm `.github/`
  before Topic 3 closes.)
- De-facto structure across recent merges (#85, #84, #82, #79): an optional leading
  one-line restatement; a GitHub `Closes #N` auto-close keyword at the very top
  (uniform — #85 `Closes #83`, #84 `Closes #70`, #82 `Closes #81`, #79 `Closes
  #75`); a summary section under varying names (`## Summary` / `## Why` / unlabeled
  lead — confirming R5/AC4 "no fixed section names"); a `## What changed` bulleted
  inventory (most consistent section); a verification/validation section (always
  present in some form); frequently scope/decisions/out-of-scope notes; a "Generated
  with Claude Code" trailer.
- R4 nuance: this repo's OWN host convention IS the GitHub `Closes #N` keyword, so a
  tracker-agnostic contract must PERMIT it while not HARD-CODING it for other hosts.
- R3 TENSION surfaced by prior art: #85/#84/#82 include a "How this was produced"
  provenance line that mentions the fork-relative artifacts path `.rp/pipelines/...`
  in prose. As plain text it does not break a link, but it IS a fork-relative path
  that would not resolve in `artifacts-in-fork` mode (upstream never sees `.rp/`).
  R3/AC2 forbid fork-relative paths. Must decide in Topic 3 whether the provenance
  line is dropped, reworded to avoid the path, or constrained. (This repo's own PRs
  are `artifacts-in-repo`, so the path resolves there — but the generic contract
  must hold in fork mode too.)

## Topics

### Topic 1 — Producer mechanism and how it enters the phase-5 dispatch loop

**Question.** Who produces `pr-description.md`, and how does its production enter
phase 5's plan/dispatch/review loop, given R6 (reflect the whole shipped change),
R7 (required for completion), and R8 (reviewed under the single existing gate)?

**Alternatives considered.**

- (A) Regular doc-plan task discovered by the `doc-plan-writer` and executed by an
  ordinary `doc-writer`. Rides the task-ID loop for free, but depends every run on
  the doc-plan-writer choosing to emit the task against the grain of
  `doc-plan-writer.md:63`, and on the doc-plan-reviewer not rejecting a non-host
  Files target (`doc-plan-reviewer.md:29`). Fragile for no mechanical benefit.
- (B) Orchestrator authors the file itself after the doc batch. Re-imposes the
  orchestrator context burden the prompt explicitly warns against (spec-research
  :15), and has NO existing reviewer→orchestrator send-back path (rejection is
  task-ID-based). Worst fit.
- (C) New dedicated `pr-description-writer` agent spawned outside the task loop.
  Cleanest charter fit and cleanest home for the R3/R4 constraints, but sits
  OUTSIDE the task-ID reject/redispatch loop, so honoring R8/AC7 requires
  inventing a synthetic task ID or a parallel redispatch path anyway — converging
  back toward (D)/(E) plus an extra agent file to maintain.
- (D) Fixed phase-5 step: `5 - docs.md` always dispatches one writer for
  `pr-description.md` after the doc batch, with a built-in task block, carrying a
  synthetic task ID so it rides the reject/redispatch loop. Localizes new surface
  to `5 - docs.md` + a small doc-writer carve-out; keeps the task out of
  `doc-plan.md`, a small deviation from "the batch = the doc-plan tasks"
  (`5 - docs.md:32`).
- (E) `doc-plan-writer.md` is amended so every doc-plan ends with a mandatory,
  standardized "produce `pr-description.md`" task (always last, `Depends on` all
  others). Guarantees the task exists every run without relying on the
  surface-sweeping instinct, while riding the normal task loop end to end. Keeps
  the task as a first-class, inspectable plan entry and preserves the invariant
  "the batch = the doc-plan tasks."

**Decision — LOCKED: (E).** The PR-description artifact is produced by an ordinary
`doc-writer` executing a MANDATORY, standardized FINAL task that the
`doc-plan-writer` appends to every doc plan — placed last, `Depends on` all prior
tasks. It is a first-class, inspectable `doc-plan.md` entry, so it carries a real
task ID and rides the existing writer → commit → review → task-ID-redispatch loop
with no synthetic-ID injection. (E) was chosen over (D) on the edit-site analysis:
(E) spreads five small edits, each landing in the file that semantically owns it
(plan-writer owns "what tasks exist," plan-reviewer owns "are tasks well-formed,"
doc-writer/reviewer own produce/verify, `5 - docs.md` owns the loop rule), and the
task ID is known to the reviewer for free and is "always last" for free. (D) was
fewer files (3) but concentrated a synthetic-ID generation + dual-injection
mechanism into the orchestrator's standing per-batch behavior — harder to keep
correct across the initial batch and every re-dispatch — and broke the clean
invariant "the batch = the doc-plan tasks" (`5 - docs.md:32`). (A) pure was
rejected because it relies every run on the doc-plan-writer *discovering* the task
against the grain of `doc-plan-writer.md:63`; (E) eliminates that fragility by
making the task FIXED/mandatory rather than discovered. (B)/(C) rejected per the
alternatives above.

**Deliberate deviation to state in the design doc:** a "mandatory fixed final task
that every doc-plan must contain" is a new shape for `doc-plan-writer` (every other
task it emits is feature-derived). State it consciously, analogous to the
two-file-predicate deviation (Topic 4).

**Unavoidable regardless of producer identity (traces noted):**
- The self-containment negative constraint (no artifact-folder/fork-relative
  links) must be authored where the producer reads it — R3/AC2.
- The producer must be given the Issues convention (`setup.md:62-66`) to link the
  originating issue tracker-agnostically — R4/AC3.
- Ordering: the producer must run at/after the doc-writers — R6 (kept implicit via
  `Depends on` / "always last").

### Topic 2 — Review under the single gate, and the re-dispatch ordering rule

**Question.** How is the PR description reviewed and rejected under the existing
single `docs-review-approved.md` gate (R8/AC7, no second terminator), and what rule
keeps it from going stale when only an upstream doc task is re-dispatched (R6)?

**Decision — review mechanics.** The existing `doc-reviewer` reviews the
PR-description artifact as part of its normal batch pass. No second approval, no
second terminator: a PR-description problem is reported as an issue tagged to the
PR-description task ID in the reviewer's normal rejection structure
(`doc-reviewer.md:71-81,87`), and the existing task-ID re-dispatch carries it. This
satisfies R8/AC7's "re-dispatched alongside any other flagged work... no separate
approval or terminator" with ZERO new rejection path. Under (E) the task ID is a
real plan ID, so it is in the reviewer's batch list for free (initial batch =
every `doc-plan.md` task; re-dispatch = flagged IDs).

**Decision — three reviewer checks, authored in `doc-reviewer.md`.** The reviewer
gains a short carve-out: when the batch includes the PR-description artifact,
additionally verify (i) it reflects the whole shipped change (natural extension of
its existing accuracy spot-check, `doc-reviewer.md:36-37` — R6/AC5); (ii) it links
the originating issue per the Issues convention, tracker-agnostically (R4/AC3);
(iii) it is self-contained — no links into the artifact folder, no fork-relative
paths (R3/AC2). Author these in `doc-reviewer.md` for durability (standing
instructions apply every run); per-task Acceptance reinforces for run-specific
traceability. The reviewer does NOT read the Issues convention today
(`doc-reviewer.md:14-21`), so it must be supplied — see plumbing below.

**Decision — convention plumbing (producer AND reviewer).** Neither doc-writer nor
doc-reviewer reads `setup.md` itself; the orchestrator already loads conventions
and passes them into agent launch prompts (`autonomous-workflow.md:59-61` passes
Artifact folder + Commit format). The cleanest plumbing is the same: the
orchestrator additionally passes the Issues convention (or the originating issue's
tracker + identifier) into the producer's and reviewer's launch context for phase
5. This keeps agents from hard-coding `gh`/`Closes #N` (R4).

**Decision — re-dispatch ordering rule, in `5 - docs.md`.** To honor R6's "not
stale" at approval, `5 - docs.md` gains a deterministic orchestrator rule: the
PR-description task is ALWAYS part of any non-empty re-dispatch batch and ALWAYS
runs last. Because (E) places it last in plan order with `Depends on` all others,
and the per-task loop is strictly sequential (`5 - docs.md:33-37`, re-dispatch runs
"in plan order"), it re-reads the updated docs after the re-run doc tasks commit.
Rejected alternatives: (ii) "reviewer always lists the PR-description ID" pushes a
mechanical invariant into a judgment agent that is told "every issue is must-fix /
don't report what you don't think needs fixing" (`doc-reviewer.md:94`); (iii)
"reviewer re-checks on the clean pass" only CATCHES staleness (the reviewer doesn't
rewrite, `doc-reviewer.md:96`), forcing an extra loop. The orchestrator rule (i)
re-PRODUCES against the latest docs every iteration — strongest, least surface,
lives in the file that owns the dispatch loop.

**Edit-site tally (E), recorded for the writer/planner phase:**
1. `doc-plan-writer.md` — mandatory standardized final PR-description task (last,
   `Depends on` all, fixed Goal/Audience/Files=`5-docs/pr-description.md`/Acceptance).
2. `doc-plan-reviewer.md` — feasibility carve-out so the non-host Files target and
   "summarize the whole change" task aren't flagged (`doc-plan-reviewer.md:29`);
   ideally also assert the mandatory task is present.
3. `doc-writer.md` — self-containment carve-out + issue identifier/Issues input.
4. `doc-reviewer.md` — the three checks above + Issues input.
5. `5 - docs.md` — the always-last / always-in-re-dispatch ordering rule.
(R11 enumeration edits — Outputs list, Produces table, predicate — are required
under any approach and are tracked separately under Topic 4/Topic 5.)

### Topic 3 — Content contract: discovery, issue link, provenance, generic fallback

**Question.** What content contract does the producer follow (R5/AC4), how does it
discover the host's PR conventions, how is the issue link expressed
tracker-agnostically (R4/AC3), and how is the R3 "no fork-relative paths" rule
reconciled with following observed host conventions?

**Confirmed.** No PR template exists in this repo (`.github/` holds only
`workflows/`; no `*PULL_REQUEST_TEMPLATE*`). For THIS host, R5/AC4 resolves to the
"observed/de-facto conventions" branch. The contract must still be generic
(template-first), it just falls through here.

**Decision — discovery is IMPLICIT (produce-time), not a setup convention.** The
producer discovers host PR conventions at produce-time, exactly as the doc agents
already discover the host "documentation convention" (`doc-writer.md:17`) and
"verification convention" — neither of which is a `setup.md` section. This keeps PR
conventions in the same "discovered, not configured" tier (matching `SKILL.md:44`
and R5's framing), adds least surface, and never goes stale relative to the repo
(unlike a recorded template path). An EXPLICIT optional setup convention is named as
a DEFERRED, out-of-scope future extension (matches Out-of-Scope item 3), not
foreclosed. Authored in BOTH places: a durable standing clause in `doc-writer.md`
("when producing the PR-description artifact, follow the host's PR conventions —
template if present, else observed conventions via recent merged PRs, else a generic
body; no fixed section names") and a run-specific echo in the (E) task block
authored by `doc-plan-writer`. The agent-file clause is load-bearing. Observed
conventions are discovered tracker-agnostically by "inspect recent merged
pull/merge requests in the host's tracker," riding the same Issues-convention
tracker access plumbed in Topic 2 (phrased as a capability, not a `gh` command).

**Decision — tracker-agnostic issue link.** Contract wording: "Reference the
originating issue in the form the host project's PR conventions and issue tracker
use: where the tracker supports an auto-close keyword and the host uses it, use it
(e.g. a GitHub `Closes #N`); otherwise a plain link or identifier that resolves to
the issue in the host's tracker. Do not hard-code a GitHub-specific keyword." This
PERMITS `Closes #N` (this repo's uniform observed convention) without MANDATING it
(R4/AC3). The issue identifier is sourced from `0-prompt/prompt.md:3` ("Source
issue: ...#66"), which is inherited by every pipeline and identical across an
issue's pipelines (`pipeline-versioning.md:66`) — the lowest-coupling source, so the
producer does not depend on the orchestrator remembering to inject it.

**Boundary (AC11).** How the issue reference RESOLVES against the upstream repo at
PR-open time in `artifacts-in-fork` mode (upstream numbering) is the merge
procedure's concern (#57), NOT this artifact's. #66's contract says only "the
artifact references the originating issue tracker-agnostically." A one-line
out-of-scope note belongs in the design doc.

**Decision — R3-over-R5 precedence on the provenance line (the sharpest tension).**
The observed host bodies (#85/#84/#82) include a "How this was produced" line citing
the fork-relative artifacts path `.rp/pipelines/...`. R5 ("follow observed
conventions") and R3 ("no fork-relative paths") collide on exactly this line.
Resolution: option (b) — the provenance MENTION is allowed (it carries no path and
matches host convention), but the fork-relative/artifact-folder PATH is forbidden
(R3 wins). Explicit precedence rule authored in BOTH the producer contract and the
reviewer self-containment check (Topic 2 check iii): "Where observed conventions
include a reference to the artifact folder or any fork-relative path, R3 takes
precedence — keep the provenance mention, strip the path." The "Generated with
Claude Code" trailer is R3-clean (absolute, publicly-resolvable URL — the R3 "MAY
link to publicly resolvable targets" carve-out); whether to require it is a host
convention question, not a #66 mandate.

**Decision — generic fallback as CONTENT CATEGORIES, not headings.** When the host
has neither a template nor observable PR history: "a short summary of what shipped
and why, a breakdown of the concrete changes, how it was verified, and the issue
reference — suggested CONTENTS, not required section names." This matches the
observed skeleton (summary / `## What changed` / verification / `Closes #N`) at the
category level while honoring R5/AC4's ban on fixed section names (the four observed
PRs prove names are fluid while categories are stable).

### Topic 4 — Phase-5 completion predicate (R7) and R11 enumeration surfaces

**Question.** What is the predicate shape, and what is the complete, airtight set of
surfaces that enumerate phase-5 outputs (R11/AC10), edited descriptively without
adding merge/PR-opening behavior (AC11)?

**Decision — predicate.** `pipeline-versioning.md:32` row 5 becomes
"`5-docs/docs-review-approved.md` and `5-docs/pr-description.md`" (mirroring phase
3's "X and Y" format at `:30`; keep the en-dash "5 – Docs"). This is the ONLY edit
in `pipeline-versioning.md` — the `:23` prose ("all of these") already covers a
multi-file row, and the rendering examples and lineage prose key on folder tree
SHAs, never on predicate filenames.

**Two-file shape is mechanically inert (state as a doc nuance).** Phase 3 is direct
precedent for a two-artifact AND predicate. The genuine difference: phase 5 becomes
the first phase to AND a review TERMINATOR with a non-terminator CONTENT artifact.
But the completed-phase (`:34`), active/in-progress (`:21`), and lineage (`:38-44`)
machinery treat the predicate as a pure AND over committed artifacts and never
inspect file TYPE — so adding `pr-description.md` is clean. Phase 0's `prompt.md`
(`:26`) is ALREADY a non-terminator required artifact, so "predicate = required
artifacts, not only terminators" is already true at phase 0. Design-doc note: phase
5 reintroduces it after four terminator-shaped phases; nothing behavioral changes.
The R9/AC8 fork/resume guarantee falls out for free (the artifact is just another
blob in the `5-docs/` tree).

**Mode/assisted safety.** The strengthened predicate is mode-agnostic in principle
but only ever evaluated for autonomous runs: assisted caps at phase 3
(`assisted-workflow.md:20,22`), never creates `5-docs/`, so it never strands.
Autonomous always produces the artifact under (E). One half-sentence in the design
doc prevents a reviewer thinking the change strands assisted mode.

**Decision — airtight R11 enumeration edit-site list (file:line, required).**
1. `5 - docs.md:12-16` — the Outputs list. Add a bullet for
   `<artifacts-folder>/5-docs/pr-description.md`.
2. `5 - docs.md:38` — step-6, the phase reference's OWN completion-predicate
   self-check ("...and `docs-review-approved.md` are committed"). MUST also name
   `pr-description.md`, else the self-check passes without it, contradicting the
   strengthened predicate. THE EASILY-MISSED ONE — flag loudly for the writer.
3. `SKILL.md:40` — the per-phase "Produces" table row 5. Add a noun phrase (e.g.
   "Documentation (internal and external); PR description artifact").
4. `pipeline-versioning.md:32` — the predicate (the R7 change above).

**Verified NON-edit sites (so the writer doesn't chase them):**
`autonomous-workflow.md:37-44` and `assisted-workflow.md:15-22` are Phase|Subfolder|
Reference tables (no output enumeration); `pipeline-versioning.md:74-91` tree
examples label by folder; `work-on-an-issue.md:32` (Merge gate) benefits from R7
automatically (a phase 5 missing the artifact is not "complete," so Merge is not
offered — AC6) but must NOT be edited (would drift into #57's Merge territory);
`doc-reviewer.md:43-44` names the terminators it WRITES — do NOT add
`pr-description.md` there (the doc-writer writes it, not the reviewer).

**AC11 guardrail — keep edits descriptive (nouns, not verbs).** Every enumeration
edit states what phase 5 PRODUCES; none may add "...used to open the PR" / "...then
open the PR" / "...ready to merge." Predicates are existence checks (structurally
incapable of PR-opening behavior). The only legitimate consumer-side touch #66 owns
is the R10 `setup.md:122` reconciliation (Topic 5) — a reference-honesty edit, not a
behavior edit.

**Mechanism edits from Topics 1-2 that also land in `5 - docs.md`** (tracked
separately from R11): the always-last re-dispatch rule and the expectation that the
doc-plan carries a mandatory PR-description task; the mermaid (`:40-49`) is
optional-skip (it depicts the review loop, not the output inventory).

### Topic 5 — Reconciling the pre-existing `setup.md:122` reference (R10/AC9)

**Question.** How is the single pre-existing fork-mode reference reconciled to the
artifact's canonical location and de-misdescribed (no longer path-less,
producer-less) WITHOUT authoring/altering the open-a-PR procedure (AC11)?

**Decision — path-honesty.** Step 2 (`setup.md:119`) cherry-picks only code commits
to the clean upstream branch, EXCLUDING artifacts; step 5 opens the PR from that
branch. So `.rp/` (and `pr-description.md`) do NOT exist on the upstream branch the
PR is opened from; the file lives in the FORK. The orchestrator (fork checked out)
READS the body TEXT from the fork-side file and supplies that text to the PR-open
call. The reconciled line therefore names the fork-side canonical location and says
"the content of ... as the body" (text supplied, not file attached). "in the fork"
is load-bearing. `<artifacts-folder>/` (the placeholder used throughout the
pipeline) keeps it generic.

**R3 non-conflict (state explicitly so the reviewer doesn't false-positive).** R3
governs what the ARTIFACT CONTAINS (its content becomes the published PR body, where
fork paths would break). `setup.md:122` is a different surface: the CONVENTION that
POINTS AT the artifact, read by the orchestrator, never published. Naming a fork
path here is correct — a location-pointer must name a real location. Different
surface, different audience (orchestrator vs PR viewer), no R3 conflict.

**Decision — producer/timing minimalism.** Cure "producer-less" with the single
descriptor "phase-5" ("the phase-5 PR-description artifact") — three words that
attribute producer + kind without restating phase-5 mechanics. The "already exists
by PR-open time" guarantee is left IMPLICIT: it is enforced structurally by the
completion predicate (R7, `pipeline-versioning.md:32`) gating the Merge action
(`work-on-an-issue.md:32`). Restating it here would bloat the convention and edge
into #57's Merge precondition.

**Decision — mode-symmetry (no stray into #57).** PRODUCTION is mode-independent
(same phase 5 in both modes; the predicate is "same regardless of workflow mode,"
`pipeline-versioning.md:23`), so `pr-description.md` is produced in repo mode too.
But #66 touches ONLY the one pre-existing fork-mode consumer reference. It does NOT
add a repo-mode consumer reference, because none exists (`setup.md:110` "no further
information needed"; no `gh pr create` repo-wide) and adding one would be authoring a
repo-mode PR-opening flow — explicitly #57's (AC11). The consumer-side mode
asymmetry is intentionally left for #57; the design doc states this so a reviewer
does not flag the untouched repo-mode side as an oversight.

**Decision — exact before/after for `setup.md:122` step 5.**
- BEFORE: "5. Opens the PR in `upstream` from that clean branch, using
  `pr-description.md` as the body."
- AFTER: "5. Opens the PR in `upstream` from that clean branch, using the content of
  the phase-5 PR-description artifact (`<artifacts-folder>/5-docs/pr-description.md`
  in the fork) as the body."
- Steps 1-4 (`setup.md:118-121`) and line 123 are UNCHANGED (AC11). Line 123 already
  supplies the rationale (upstream viewers never see the fork) that makes the AFTER
  line coherent — leave it as supporting context.

### Topic 6 — R9/AC8 fork and resume (confirmation), and the edit-site ledger

**R9/AC8 — satisfied by construction, no design action.** Confirmed with evidence:
- FORK: `fork-pipeline.md` seeds inherited phases by whole-folder copy (`cp -r
  <phase> <artifacts-folder>/<phase>`), so `pr-description.md` rides the `5-docs/`
  copy byte-for-byte with zero new logic; fork only inherits COMPLETE phases, and
  the strengthened predicate (Topic 4) makes a complete phase 5 necessarily include
  the artifact — predicate and fork rule reinforce each other.
- RESUME: `resume-pipeline.md` rolls back only the ACTIVE phase; a phase-5-complete
  pipeline has no active phase, so resume never touches the completed `5-docs/`.
- LINEAGE: `pr-description.md` is a blob in the `5-docs/` tree, so it folds into the
  folder's tree SHA automatically (`pipeline-versioning.md:38-44`); two
  phase-5-complete pipelines share the node iff the whole folder (artifact included)
  is byte-identical — correct semantics, no special handling.
The only design action is placing the file in `5-docs/`, which (E) does.

**Authoritative edit-site ledger (line numbers verified current).** 7 unique files;
R = required, O = optional. Mechanism (M), Enumeration (E), Reconciliation (C).

Mechanism:
- M1 `agents/doc-plan-writer.md` (anchors `:63-64`, template `:37-50`) — mandatory
  always-last PR-description task (Files=`5-docs/pr-description.md`, `Depends on`
  all, Acceptance = host conventions / self-contained / links issue / whole change).
  R1,R5,R6; carrier for R3/R4/R7. REQUIRED.
- M2 `agents/doc-plan-reviewer.md` (anchor `:29`) — feasibility carve-out so the
  non-host Files target isn't flagged + assert the mandatory task is present.
  R1,R11. REQUIRED.
- M3 `agents/doc-writer.md` (anchors `:17,:36,:60`) — (i) produce-time host-PR-
  convention discovery; (ii) self-containment incl. stripping `.rp/...` provenance
  path (R3-over-R5); (iii) tracker-agnostic issue link from `0-prompt/prompt.md`.
  R3,R4,R5,R6. REQUIRED.
- M4 `agents/doc-reviewer.md` (anchors `:19,:29,:32`) — three checks (whole change /
  issue link / self-contained incl. provenance path) + issue input. R6,R8,R3,R4.
  REQUIRED.
- M5 `5 - docs.md` (anchors `:33-37`) — always-last re-dispatch rule (re-run the
  PR-description task whenever any task is re-dispatched). R6,R8. REQUIRED.
- M6 `autonomous-workflow.md` (anchor `:59-61`) — pass the Issues convention
  (tracker + access) into phase-5 launch context. R4,R6. REQUIRED (tracker ACCESS
  is needed for "inspect recent merged PRs" discovery; the issue IDENTIFIER alone is
  also readable from `0-prompt/prompt.md`, so the identifier dependency degrades
  gracefully, but access keeps M6 required).

Enumeration (R11, descriptive nouns only — no merge/PR-opening verbs):
- E1 `5 - docs.md:12-16` — Outputs list: add `5-docs/pr-description.md`. R11.
  REQUIRED.
- E2 `5 - docs.md:38` — step-6 self-check must also name `pr-description.md` (the
  easily-missed one). R7,R11. REQUIRED.
- E3 `SKILL.md:40` — Produces row 5: add "PR description artifact" noun. R11.
  REQUIRED.
- E4 `pipeline-versioning.md:32` — predicate row 5: "`docs-review-approved.md` and
  `pr-description.md`" (en-dash kept). R7,R11. REQUIRED.

Reconciliation:
- C1 `setup.md:122` — step 5 body-source reconciliation (Topic 5 before/after);
  steps 1-4 and `:123` untouched. R10. REQUIRED.

Verified NON-edits (do not chase): `5 - docs.md:40-49` mermaid (O-skip);
`autonomous-workflow.md:37-44` / `assisted-workflow.md:15-22` tables;
`pipeline-versioning.md:74-91` tree examples; `work-on-an-issue.md:32` Merge gate
(benefits from R7 automatically, editing risks #57 drift); `doc-reviewer.md:43-44`
(the reviewer does NOT write `pr-description.md`); repo-mode `.rp.md`/setup (adding a
consumer reference would author PR-opening behavior — #57).

Note: `5 - docs.md` carries THREE distinct edits (M5 + E1 + E2) — keep them separate.

**Requirement → edit coverage (all 11 served or by-construction):** R1→M1(+E4);
R2→M3.i/ii; R3→M3.ii/M4.iii(+C1 design note); R4→M3.iii/M4.ii/M6; R5→M3.i/M4;
R6→M1/M3/M4.i/M5; R7→E4/E2; R8→M4 + existing task-ID loop (no new terminator);
R9→by construction (no edit); R10→C1; R11→E1/E2/E3/E4.

## Open Questions

- **Explicit optional PR-body setup convention (deferred, not foreclosed).** This
  design chooses IMPLICIT produce-time discovery of host PR conventions (Topic 3).
  An optional `setup.md` PR-body convention (template path / required sections,
  captured into `.rp.md`) remains a possible future extension — explicitly out of
  scope here (matches spec Out-of-Scope item 3). Decider: a future issue, if owners
  ask to pin PR conventions at setup time.

- **M6 required vs. optional.** If a future revision prefers minimal orchestrator
  change, M6 could be downgraded and the issue link anchored solely on
  `0-prompt/prompt.md`. Kept REQUIRED here because "inspect recent merged PRs"
  discovery (M3.i) needs tracker ACCESS, which the orchestrator must supply. The
  design-doc-writer should present M6 as required with this rationale.

- **Upstream-numbering resolution of `Closes #N` (deferred to #57).** In
  `artifacts-in-fork` mode the PR targets `upstream`, so how the issue reference
  resolves against upstream numbering at PR-open time is the merge procedure's
  concern (#57), not this artifact's (AC11). #66's contract only requires a
  tracker-agnostic reference to the originating issue. No design action here.

## Risks

- **R5-vs-R3 provenance-path collision (the sharpest internal tension).** The host's
  own observed PR convention (this repo's merged PRs) includes a "How this was
  produced" line citing the fork-relative `.rp/pipelines/...` path. R5 says "follow
  observed conventions"; R3 forbids fork-relative paths. A producer that faithfully
  copies observed conventions WILL reintroduce the path and break R3. Mitigation:
  the contract states an explicit R3-over-R5 precedence (Topic 3) — keep the
  provenance mention, strip the path — authored in BOTH the producer (M3.ii) and the
  reviewer self-containment check (M4.iii). The design doc must name this collision
  and its precedence rule prominently so it is not lost.

- **Re-dispatch staleness gap (R6 "not stale").** Re-dispatch reruns only flagged
  task IDs in plan order; an upstream doc task re-running without the PR-description
  task would leave the description stale at approval. Mitigation: the always-last
  re-dispatch rule (M5) in `5 - docs.md` — the file that owns the loop — re-produces
  the description against the latest docs every iteration. Rejected the alternatives
  that push the invariant into the adversarial reviewer's judgment.

- **Two-file predicate misread as "terminators only."** Phase 5's predicate becomes
  the first to AND a review terminator with a content artifact. Phase 3 is precedent
  for the SHAPE; phase 0's `prompt.md` is precedent for a non-terminator required
  artifact. The machinery (completed-phase/active/lineage) treats the predicate as a
  pure AND and is unaffected. Mitigation: a one-sentence design-doc nuance so a
  reader does not infer "predicate column = only `-approved.md` terminators."

- **Mandatory fixed final task is a new shape for `doc-plan-writer`.** Every other
  task it emits is feature-derived; this one is standardized and always present.
  Mitigation: state it as a deliberate, conscious deviation (analogous to the
  two-file predicate), so it is not mistaken for an over-reach or scope creep.

- **AC11 drift in enumeration edits.** Each enumeration edit is one keystroke away
  from importing consumer behavior (e.g. "...used to open the PR"). Mitigation: the
  ledger fixes each edit as a descriptive NOUN; the design doc states the
  noun-not-verb guardrail; the only legitimate consumer-side touch is C1, framed as
  reference-honesty, not behavior.
