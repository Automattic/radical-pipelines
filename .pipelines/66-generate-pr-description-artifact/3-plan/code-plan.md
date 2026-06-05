# Code Plan: Generate a PR description artifact

## Overview

This feature makes the Radical Pipelines pipeline produce its PR description as a
real, inspectable, self-contained Markdown artifact
(`<artifacts-folder>/5-docs/pr-description.md`) during the Docs phase (phase 5),
review it for accuracy under the phase's existing single approve/reject gate,
require it for phase-5 completion, and reconcile the one pre-existing dangling
reference to it. There is no application code: the "code" of this feature is a
fixed set of edits to this repo's own pipeline reference docs, agent definitions,
conventions, and `SKILL.md`. The artifact rides the phase-5 machinery that already
exists — it is "just another doc task" that is always present, always last, and
carries a few extra constraints — so the existing plan / dispatch / sequential
commit / review / task-ID re-dispatch / single-terminator / fork-resume mechanisms
carry it for free.

The plan executes the design doc's authoritative edit-site ledger directly:
mechanism edits M1-M6 (make the artifact get produced, reviewed, and gated),
enumeration edits E1-E4 (keep the pipeline's descriptions of phase-5 outputs from
going stale), and reconciliation edit C1 (keep the pre-existing consumer reference
honest). Each task below is keyed on the design's semantic anchor TEXT, not on a
line number; the prose may have shifted anchors by a line or two. Seven unique
files are touched; `5 - docs.md` carries THREE distinct edits (M5, E1, E2) that
must stay separate.

This plan covers the structural CODE-phase edits only. It does NOT plan tests, does
NOT plan documentation, and does NOT author the actual `pr-description.md` content
for any pipeline (that content is authored by a `doc-writer` at produce-time, per
the mechanism these edits install). Authoring `merge-pipeline.md` / the PR-opening
procedure (issue #57) is out of scope (see Task 11 / AC11 guard).

### Ledger-to-task map

| Ledger | File | Task |
| ------ | ---- | ---- |
| M1 | `agents/doc-plan-writer.md` | Task 1 |
| M2 | `agents/doc-plan-reviewer.md` | Task 2 |
| M3 | `agents/doc-writer.md` | Task 3 |
| M4 | `agents/doc-reviewer.md` | Task 4 |
| M6 | `skills/radical-pipelines/reference/autonomous-workflow.md` | Task 5 |
| M5 | `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` | Task 6 |
| E1 | `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` | Task 7 |
| E2 | `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` | Task 8 |
| E3 | `skills/radical-pipelines/SKILL.md` | Task 9 |
| E4 | `skills/radical-pipelines/reference/pipeline-versioning.md` | Task 10 |
| C1 | `skills/radical-pipelines/reference/conventions/setup.md` | Task 11 |

Ordering rationale: the mechanism edits (Tasks 1-6) install the machinery that
produces, reviews, gates, and re-runs the artifact; the enumeration edits
(Tasks 7-10) update the descriptions of what phase 5 produces (Task 8's step-6
self-check must agree with Task 10's strengthened predicate, so 10 is grouped with
the enumeration block); the reconciliation edit (Task 11) keeps the pre-existing
consumer reference honest. Tasks are independent edits to distinct anchors and can
be executed in any order; the numbering reflects the ledger's mechanism →
enumeration → reconciliation grouping. The three `5 - docs.md` edits (Tasks 6, 7,
8) target three distinct anchors in one file and must remain three separate edits.

## Tasks

### Task 1: Add the mandatory always-last PR-description doc-plan task to `doc-plan-writer` (M1)

- **File to change:** `agents/doc-plan-writer.md`
- **Anchors:** the `## Guidelines` "Cover every relevant surface" guideline; the
  task template block (`### Task 1: <title>` with Goal / Audience / Files /
  Sections-scope / Depends on / Traces to / Acceptance).
- **What to do:** Add durable instruction text that makes the `doc-plan-writer`
  emit, as the LAST entry of every `doc-plan.md` it produces, one mandatory,
  standardized PR-description task. The task must use the existing task template
  shape (Goal / Audience / Files / Sections-scope / Depends on / Traces to /
  Acceptance) and specify:
  - **Files:** `<artifacts-folder>/5-docs/pr-description.md`.
  - **Depends on:** all prior tasks (so it runs last and reads the committed docs).
  - **Acceptance:** follows the host project's PR conventions; self-contained (no
    links into the artifact folder, no fork-relative paths); links the originating
    issue; reflects the whole shipped change (spec intent, design rationale, code,
    and phase-5 documentation).
  Also add the explicit deliberate-deviation note (per the design's "deliberate new
  shape" decision): state consciously that a mandatory, fixed final task that every
  doc-plan must contain is a NEW shape for this agent — every other task it emits is
  feature-derived; this one is standardized and always present — so a reviewer or
  future maintainer does not mistake it for over-reach / scope creep or "fix" the
  agent to stop emitting it. Word the deviation so it does not contradict the
  existing "Cover every relevant surface" / "Do not invent documentation for
  features the spec did not ask for" guidelines (this fixed task is an explicit
  carve-out, not a discovered surface).
- **Traces to:** Spec R1, R5, R6 (carrier for R3, R4, R7); AC1, AC5; design Key
  Decision "Produce via a mandatory standardized final doc-plan task" and "The
  mandatory final task is a deliberate new shape for doc-plan-writer"; ledger M1.
- **Acceptance:**
  - `agents/doc-plan-writer.md` instructs the agent to append a mandatory,
    standardized PR-description task as the LAST entry of every doc plan.
  - That task is specified with `Files = <artifacts-folder>/5-docs/pr-description.md`,
    `Depends on` all prior tasks, and `Acceptance` enumerating: host PR conventions,
    self-contained, links the issue, reflects the whole shipped change.
  - The deliberate-new-shape note is present and explains that the task is fixed and
    always present (not discovered/feature-derived), reconciled against the existing
    "Cover every relevant surface" and "stay within spec and design" guidelines so
    they do not read as contradicting it.
  - No other behavior of the agent is changed; the existing task template and
    guidelines remain intact.

### Task 2: Add the feasibility carve-out and presence assertion to `doc-plan-reviewer` (M2)

- **File to change:** `agents/doc-plan-reviewer.md`
- **Anchor:** the Feasibility check item ("do the referenced files and sections
  exist in the host project... Flag references that won't be findable in phase 5").
- **What to do:** Add a carve-out so the reviewer does NOT flag the mandatory
  PR-description task's non-host `Files` target
  (`<artifacts-folder>/5-docs/pr-description.md`, an artifact the pipeline creates,
  not a pre-existing host file) or its "summarize the whole change" goal as
  "won't be findable in phase 5" / drift-prone / scope creep. Additionally, instruct
  the reviewer to assert the mandatory final PR-description task IS present in every
  doc plan it reviews, and to reject the plan if that task is missing or malformed
  (wrong Files target, not last, missing the required Acceptance elements).
- **Traces to:** Spec R1, R11; AC10 (indirectly — keeps the producer mechanism from
  being rejected so the enumerated artifact actually gets produced); design Key
  Decision "Produce via a mandatory standardized final doc-plan task" (Failure Mode:
  "Plan reviewer rejects the legitimate non-host task"); ledger M2.
- **Acceptance:**
  - The reviewer's feasibility guidance explicitly exempts the PR-description task's
    `5-docs/pr-description.md` Files target and its whole-change summarizing goal
    from the "won't be findable" / drift / scope-creep checks.
  - The reviewer is instructed to assert the mandatory always-last PR-description
    task is present and well-formed, and to reject the plan if it is absent or
    malformed.
  - No other review check is weakened; the carve-out is scoped to this one task.

### Task 3: Add the produce-time PR-description content contract to `doc-writer` (M3)

- **File to change:** `agents/doc-writer.md`
- **Anchors:** the "host project's documentation convention" read step; the
  "Cross-links resolve" accuracy item; the doc-surface enumeration / "Do NOT touch
  source code" guideline.
- **What to do:** Add a durable carve-out (applies every run) that governs how a
  `doc-writer` produces `pr-description.md` when assigned the PR-description task.
  It must specify three things:
  1. **(i) Host-PR-convention discovery, at produce-time.** Structure follows the
     host project's PR conventions, discovered exactly as the agent already
     discovers the host documentation/verification conventions: use a PR template if
     the host provides one; otherwise the host's observed/de-facto conventions
     discovered by inspecting recent merged pull/merge-requests in the host's
     tracker; otherwise a sensible generic PR body. Do NOT mandate fixed section
     names. Express the generic fallback as content CATEGORIES (a short summary of
     what shipped and why; a breakdown of the concrete changes; how it was verified;
     the issue reference), not as required headings.
  2. **(ii) Self-containment, with the R3-over-R5 precedence rule.** The artifact's
     entire content is used verbatim as a PR body, so it must be self-contained: no
     references into the pipeline's artifact folder and no fork-relative paths (in
     `artifacts-in-fork` mode the upstream PR viewer never sees the fork's `.rp/`
     tree, so such links break). It MAY link to publicly-resolvable targets (the
     originating issue, an absolute "Generated with Claude Code"-style URL).
     Author the explicit precedence rule: where the host's observed PR conventions
     include a reference to the artifact folder or any fork-relative path (e.g. a
     "How this was produced" line citing a `.rp/pipelines/...` path), **R3 takes
     precedence — keep the provenance mention, strip the fork-relative path.**
  3. **(iii) Tracker-agnostic issue link.** Reference the originating issue in the
     form the host's PR conventions and tracker use: where the tracker supports an
     auto-close keyword and the host uses it, use it (e.g. a GitHub `Closes #N`);
     otherwise a plain link or identifier that resolves in the host's tracker. Do
     NOT hard-code a GitHub-specific keyword. Source the issue identifier from
     `<artifacts-folder>/0-prompt/prompt.md` (the "Source issue: ...#N" line), which
     every pipeline inherits.
  Frame these as constraints that apply specifically when the assigned task is the
  PR-description task; the agent's existing single-task / accuracy / convention
  behavior is otherwise unchanged.
- **Traces to:** Spec R2, R3, R4, R5, R6; AC2, AC3, AC4, AC5; design Key Decisions
  "R3-over-R5 precedence on the provenance line", "Host-PR-convention discovery is
  implicit", "Tracker-agnostic issue link sourced from 0-prompt/prompt.md"; ledger
  M3 (i / ii / iii).
- **Acceptance:**
  - `doc-writer.md` contains a PR-description produce-time contract covering host-PR
    convention discovery (template → observed → generic, no fixed section names,
    fallback expressed as categories not headings).
  - The self-containment constraint is present AND states the R3-over-R5 precedence
    rule explicitly: keep the provenance mention, strip the fork-relative path; no
    links into the artifact folder; publicly-resolvable links are permitted.
  - The tracker-agnostic issue-link constraint is present, forbids hard-coding a
    GitHub-specific keyword, permits (does not mandate) an auto-close keyword, and
    sources the identifier from `0-prompt/prompt.md`.
  - The carve-out is scoped to the PR-description task and does not alter the agent's
    other behavior or its "do NOT touch source code" boundary.

### Task 4: Add the three artifact-accuracy checks and the issue-identifier input to `doc-reviewer` (M4)

- **File to change:** `agents/doc-reviewer.md`
- **Anchors:** the "Gather context" reads (steps 1-7, where the Issues identifier
  input is added); the existing "Accuracy spot-check" / accuracy-against-shipped-code
  checks (the whole-change check extends this); the rejection structure (Issues
  section, "Always tag the task" guideline) — the artifact's issues ride the
  existing task-ID rejection path.
- **What to do:** Add, for when the reviewed batch includes the PR-description task,
  three accuracy checks plus the issue-identifier input:
  1. **Whole-change accuracy** — the artifact summarizes the spec intent, design
     rationale, the code, and the phase-5 documentation, and every claim corresponds
     to an actual change (nothing invented, nothing stale). Frame this as a natural
     extension of the existing accuracy checks.
  2. **Issue link** — the artifact references the originating issue per the Issues
     convention, tracker-agnostically (no hard-coded GitHub-specific keyword
     required by the contract).
  3. **Self-containment** — the artifact contains no links into the pipeline's
     artifact folder and no fork-relative paths, INCLUDING the R3-over-R5 provenance
     path rule (a "How this was produced" line that reintroduces a `.rp/...`
     fork-relative path is a defect; the mention may stay, the path must be
     stripped).
  Add the issue identifier as an input (read from `0-prompt/prompt.md` and/or the
  Issues convention passed in the launch context) so the reviewer can verify the
  link. Specify that any problem with the artifact is reported as an issue tagged to
  the PR-description task's ID in the reviewer's NORMAL rejection structure — there
  is NO second approval and NO second terminator file for the PR description.
  Do NOT add `pr-description.md` to any terminator/owned-file list in this agent (the
  `doc-writer` writes it, not the reviewer).
- **Traces to:** Spec R3, R4, R6, R8; AC2, AC3, AC5, AC7; design Key Decision
  "Review under the single existing gate via the task-ID loop, with three added
  reviewer checks"; ledger M4 (i / ii / iii).
- **Acceptance:**
  - `doc-reviewer.md` adds, scoped to a batch containing the PR-description task,
    the three checks: whole-change accuracy, tracker-agnostic issue link, and
    self-containment (the self-containment check explicitly includes the provenance
    fork-relative-path case).
  - The reviewer reads/receives the originating issue identifier so it can verify
    the issue link.
  - Artifact problems are routed through the existing task-ID-tagged rejection
    structure; the text states there is no separate approval and no second
    terminator file for the PR description.
  - `pr-description.md` is NOT added to any reviewer-owned/terminator file list.

### Task 5: Thread the Issues convention into the phase-5 agent launch context in `autonomous-workflow.md` (M6)

- **File to change:** `skills/radical-pipelines/reference/autonomous-workflow.md`
- **Anchor:** the "include the following project conventions in its initial prompt"
  list (currently: Artifact folder, Commit format).
- **What to do:** Extend the orchestrator's standing per-agent launch-context
  convention list to include the **Issues convention** (the host's issue tracker
  plus how to access it) for phase-5 agents, so the `doc-writer` can discover host
  PR conventions by inspecting recent merged PRs and link the issue
  tracker-agnostically, and the `doc-reviewer` can verify that link. Add it in a way
  consistent with the existing list's framing (a convention name plus what it
  carries — tracker plus access). Keep it scoped so it serves the phase-5 producer
  and reviewer; do not author any PR-opening behavior here.
- **Traces to:** Spec R4, R6; AC3, AC5; design Key Decision "Convention plumbing"
  / "Tracker-agnostic issue link" (tracker ACCESS enables the observed-PR
  discovery); ledger M6.
- **Acceptance:**
  - The orchestrator's launch-context convention list names the Issues convention
    (tracker plus access) as passed into phase-5 agents' initial prompts, alongside
    Artifact folder and Commit format.
  - The edit adds no merge/PR-opening behavior; it only supplies a convention to
    agents.

### Task 6: Add the always-last re-dispatch ordering rule to `5 - docs.md` (M5)

- **File to change:**
  `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Anchor:** the sequential dispatch / re-dispatch loop (Steps 3-5, specifically
  the "build the next batch from the deduplicated list of task IDs the reviewer
  reported" / re-dispatch behavior in Steps 3 and 5).
- **What to do:** Add a deterministic orchestrator rule: the PR-description task is
  ALWAYS part of any non-empty re-dispatch batch and ALWAYS runs last. Because the
  task is last in plan order with `Depends on` all others and the per-task loop is
  strictly sequential and runs the batch in plan order, this guarantees the
  description is re-produced against the latest committed docs every re-dispatch
  iteration, so it is never stale at approval — even when only an upstream doc task
  was flagged. State the rule on the orchestrator's standing per-batch behavior so it
  applies to every re-dispatch, not just the initial batch.
- **Traces to:** Spec R6 ("nothing stale"); AC5; design Key Decision "Always-last
  re-dispatch rule in the orchestrator" (Failure Mode: re-dispatch staleness gap);
  ledger M5. **Keep this edit separate from Tasks 7 (E1) and 8 (E2) in the same
  file.**
- **Acceptance:**
  - `5 - docs.md` states that any non-empty re-dispatch batch always includes the
    PR-description task and runs it last.
  - The rule is on the orchestrator's per-batch re-dispatch behavior (applies to
    every rejection iteration), so the description is re-produced against the latest
    docs each iteration.
  - This is a distinct edit from the Outputs-list entry (Task 7) and the step-6
    self-check (Task 8); all three coexist as separate edits.

### Task 7: Enumerate `pr-description.md` in the phase-5 Outputs list in `5 - docs.md` (E1)

- **File to change:**
  `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Anchor:** the `Outputs:` block (currently lists documentation updates, the
  `docs-review-N-rejected.md` files, and `docs-review-approved.md`).
- **What to do:** Add a bullet enumerating
  `<artifacts-folder>/5-docs/pr-description.md` as a phase-5 output, phrased as a
  descriptive NOUN (the PR-description artifact / the PR body content). Do NOT add
  any merge or PR-opening verb ("used to open the PR", "then open the PR", "ready to
  merge") — this is an output enumeration only.
- **Traces to:** Spec R11; AC10; design "Interfaces and Data Flow" enumeration E1
  and Key Decision "Strengthen the predicate / enumerate descriptively" (noun-not-verb
  guardrail); ledger E1. **Keep separate from Tasks 6 (M5) and 8 (E2).**
- **Acceptance:**
  - The `Outputs:` block in `5 - docs.md` lists
    `<artifacts-folder>/5-docs/pr-description.md` as a phase-5 output.
  - The new entry is a descriptive noun phrase and introduces no merge/PR-opening
    behavior.

### Task 8: Strengthen the step-6 completion self-check in `5 - docs.md` to name `pr-description.md` (E2)

- **File to change:**
  `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Anchor:** Step 6 ("On **approved**, verify the phase 5 completion predicate...:
  all documentation changes, every `docs-review-N-rejected.md`, and
  `docs-review-approved.md` are committed on the pipeline branch").
- **What to do:** Update the step-6 self-check so it ALSO requires
  `<artifacts-folder>/5-docs/pr-description.md` to be committed on the pipeline
  branch, matching the strengthened phase-5 completion predicate (Task 10). Without
  this, the orchestrator's own self-check could pass while the strengthened
  predicate is unsatisfied. **This is the easily-missed enumeration site — it must
  not be skipped.** Phrase it as an existence/completion check (a noun in the
  predicate), not as a merge/PR-opening step.
- **Traces to:** Spec R7, R11; AC6, AC10; design enumeration E2 (flagged "THE
  EASILY-MISSED ONE") and Key Decision "Strengthen the predicate"; ledger E2. **Keep
  separate from Tasks 6 (M5) and 7 (E1).**
- **Acceptance:**
  - Step 6 of `5 - docs.md` names `<artifacts-folder>/5-docs/pr-description.md` among
    the artifacts that must be committed for phase-5 completion.
  - The self-check now agrees with the strengthened predicate in
    `pipeline-versioning.md` (Task 10): both require `pr-description.md` in addition
    to `docs-review-approved.md`.
  - The wording is an existence/completion check and adds no merge/PR-opening
    behavior.

### Task 9: Enumerate the PR-description artifact in the `SKILL.md` Produces table (E3)

- **File to change:** `skills/radical-pipelines/SKILL.md`
- **Anchor:** the per-phase Produces table, row 5
  (`| 5 | Docs | `5-docs` | Documentation (both internal and external) |`).
- **What to do:** Add a noun phrase to the phase-5 Produces cell naming the PR
  description artifact (e.g. "Documentation (both internal and external); PR
  description artifact"). Keep it a descriptive noun; do NOT add merge/PR-opening
  language. Preserve the Markdown table alignment/formatting.
- **Traces to:** Spec R11; AC10; design enumeration E3; ledger E3.
- **Acceptance:**
  - The phase-5 row of the `SKILL.md` Produces table names the PR description
    artifact as a phase-5 output.
  - The addition is a descriptive noun phrase with no merge/PR-opening verb, and the
    table remains well-formed.

### Task 10: Strengthen the phase-5 completion predicate in `pipeline-versioning.md` (E4)

- **File to change:** `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Anchor:** the "Per-phase completion" predicate table, row "5 – Docs"
  (currently `5-docs/docs-review-approved.md`).
- **What to do:** Change the row-5 Required artifacts cell to
  `5-docs/docs-review-approved.md` and `5-docs/pr-description.md`, mirroring the
  existing "X and Y" two-artifact format already used by row 3 ("3 – Plan"). Keep the
  en-dash in the "5 – Docs" label exactly as it is. This is the only edit in this
  file. (Per the design, this is mechanically inert for the lineage/active/completed
  machinery, which treats the predicate as a pure AND over committed artifacts and
  never inspects file type; no other text in this file changes — the tree-rendering
  examples key on tree SHAs, not predicate filenames.)
- **Traces to:** Spec R7, R11; AC6, AC10; design Key Decision "Strengthen the
  phase-5 completion predicate to require both files"; ledger E4.
- **Acceptance:**
  - The "5 – Docs" predicate row reads
    `5-docs/docs-review-approved.md` and `5-docs/pr-description.md` in the existing
    "X and Y" format.
  - The "5 – Docs" en-dash label is unchanged, and no other content in
    `pipeline-versioning.md` is modified (no edits to the tree-rendering examples).

### Task 11: Reconcile the pre-existing `setup.md` consumer reference (C1)

- **File to change:** `skills/radical-pipelines/reference/conventions/setup.md`
- **Anchor:** step 5 of the `artifacts-in-fork` PR-open list (currently: "Opens the
  PR in `upstream` from that clean branch, using `pr-description.md` as the body.").
- **What to do:** Replace exactly that one step with the design's authoritative
  AFTER text, so the reference resolves to the artifact's canonical fork-side
  location and no longer describes a path-less, producer-less file:
  - BEFORE: "5. Opens the PR in `upstream` from that clean branch, using
    `pr-description.md` as the body."
  - AFTER: "5. Opens the PR in `upstream` from that clean branch, using the content
    of the phase-5 PR-description artifact
    (`<artifacts-folder>/5-docs/pr-description.md` in the fork) as the body."
  Leave steps 1-4 and the following "viewers of the PR never see the fork" line
  unchanged. Do NOT add any new PR-opening behavior or repo-mode consumer reference.
  ("in the fork" and "phase-5" are load-bearing: the cherry-pick excludes artifacts,
  so the file lives only in the fork, and "phase-5" cures the "producer-less" defect
  in three words. Naming a fork-relative path HERE is correct and is NOT an R3
  violation — R3 governs the artifact's own published content, whereas this
  convention is the orchestrator-only pointer at the artifact and is never
  published.)
- **Traces to:** Spec R10; AC9, AC11; design Key Decision "Reconcile setup.md:122 as
  a path-honesty, fork-side reference"; ledger C1.
- **Acceptance:**
  - `setup.md` step 5 reads the design's AFTER text verbatim, naming
    `<artifacts-folder>/5-docs/pr-description.md` (in the fork) and "the content of"
    the artifact as the PR body.
  - Steps 1-4 and the "viewers never see the fork" line are unchanged.
  - No new PR-opening flow, `gh pr create` invocation, PR-title composition, or
    repo-mode consumer reference is introduced (AC11 guard).

## Out of scope for this plan (guards)

- **Tests and documentation.** This plan plans neither. The `pr-description.md`
  CONTENT for any given pipeline is authored by a `doc-writer` at produce-time via
  the mechanism these edits install — it is not authored here.
- **Issue #57 / PR-opening procedure (AC11).** No task authors `merge-pipeline.md`,
  `review-pipeline.md`, or `close-pipeline.md`; none adds a new `artifacts-in-repo`
  PR-opening flow, a `gh pr create` (or equivalent) invocation, or PR-title
  composition; none changes the `artifacts-in-fork` upstream transformation steps
  1-4. The only consumer-side touch is C1 (Task 11), framed as reference-honesty.
- **Untouched-but-relevant surfaces (verified non-edits — do not chase):** the
  `5 - docs.md` mermaid diagram; the `autonomous-workflow.md` /
  `assisted-workflow.md` Phase/Subfolder/Reference tables; the
  `pipeline-versioning.md` tree-rendering examples; the `work-on-an-issue.md` Merge
  gate (benefits from the strengthened predicate automatically); the
  `doc-reviewer.md` terminator list (the doc-writer writes `pr-description.md`, so it
  must NOT be added there); repo-mode `.rp.md` / setup consumer references.

## Acceptance-criterion coverage

| Spec AC | Covered by |
| ------- | ---------- |
| AC1 (artifact exists after phase 5) | Task 1 (M1) + Task 10 (E4, predicate gates completion) |
| AC2 (usable verbatim, self-contained) | Task 3 (M3.i/ii) + Task 4 (M4.iii) |
| AC3 (links issue tracker-agnostically) | Task 3 (M3.iii) + Task 4 (M4.ii) + Task 5 (M6) |
| AC4 (follows host PR conventions, no fixed sections) | Task 3 (M3.i) + Task 4 |
| AC5 (reflects whole change accurately) | Task 1 (M1) + Task 3 (M3) + Task 4 (M4.i) + Task 6 (M5, anti-staleness) |
| AC6 (phase 5 cannot complete without it) | Task 8 (E2) + Task 10 (E4) |
| AC7 (gated by the existing single approval) | Task 4 (M4) + existing task-ID loop (no new terminator) |
| AC8 (forks and resumes with phase 5) | By construction — artifact lives in `5-docs/` (no edit; Task 10 reinforces by gating a complete phase 5) |
| AC9 (pre-existing reference reconciled) | Task 11 (C1) |
| AC10 (output descriptions enumerate it) | Task 7 (E1) + Task 8 (E2) + Task 9 (E3) + Task 10 (E4) |
| AC11 (merge procedure / sibling guides not authored) | Out-of-scope guards; respected by every task, asserted in Task 11 |
