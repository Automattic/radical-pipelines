# Code plan — Per-phase summaries for the code and docs phases

## Overview

This change makes the code and docs phases each leave a human-friendly summary in
its phase folder, written by the reviewer that approves the phase:
`4-code/code-summary.md` (by the `code-reviewer`) and `5-docs/docs-summary.md`
(by the `doc-reviewer`). The summary format is defined once in a new skill
reference file and reaches both reviewers through the orchestrator's launch
prompt; the per-phase completion predicate is extended so a phase is complete
only when both its approval marker and its summary are committed.

This is a **pure prompt- and markdown-level change inside the skill and agent
definitions**. There is no code, no test framework, no build step, and no runtime
involved — the deliverable is the content of skill/agent Markdown files plus the
changeset that releases them. Verified against the live worktree this session:

- `skills/radical-pipelines/reference/summary-format.md` does **not** exist yet
  (it is created by Task 1).
- No `run-summary` / "run summary" remnants survive in `skills/` or `agents/` —
  the superseded #101 run-level approach was fully removed, so this change builds
  on a clean slate with no stale wording to reconcile.
- The reviewer agents (`agents/code-reviewer.md`, `agents/doc-reviewer.md`) today
  read **all** their inputs — including the guardrails — from the orchestrator's
  launch prompt, never from a skill `reference/` path. The summary format reaches
  them the same proven way.
- The change touches `skills/**` and `agents/**`, both **release-relevant**
  paths per `.changeset/config.json` (`changedFilePatterns` =
  `["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]`),
  so the Changeset Gate requires a changeset. This is a new user-facing feature,
  so the bump is `minor` per the pre-1.0 policy in `CONTRIBUTING.md` (Task 7).

The architectural boundary this plan must respect (from the design's Key
Decisions and Risks): **the summary format content lives only in
`summary-format.md`.** The phase reference files and the agent files reference
the format and the "covered on approval" behavior; they never restate the format
schema, the omit-empty rule, the asset convention, or the coverage statement. The
coverage statement ("what its phase produced in the current run as a whole") in
particular must appear **once**, verbatim, in `summary-format.md`, and must not be
echoed into either agent file.

### Requirements that need no task

Two spec requirements are satisfied structurally and carry **no** task, by design:

- **Run isolation (req 7 / AC5).** The orchestrator passes each reviewer
  `<artifacts-folder>/<run>/` as its artifact folder; agents are run-agnostic and
  never see the run name. A reviewer writing `code-summary.md` / `docs-summary.md`
  into `4-code/` or `5-docs/` is therefore writing into the current run's own
  folder, so a review run's summaries land under its own run folder and a prior
  run's summaries are byte-unchanged. The reviewers already isolate their approval
  markers this exact way (design Key Decision "Run isolation by structural
  placement, no new mechanism"). Adding a guard would restate a property the
  architecture already enforces.
- **Fork seeding inheritance.** Fork seeding copies whole phase folders
  recursively, so a summary inside `4-code/` or `5-docs/` rides along with no fork
  edit. Per-phase placement inside the phase folder is what keeps `fork-pipeline`,
  `resume-pipeline`, and `review-pipeline` untouched — they delegate to the
  completion predicate (Task 6) and inherit the extended rows. These files are
  load-bearing but unedited; no task touches them.

### Task graph and ordering

Seven tasks. Task 1 creates the single source of format truth; every later task
references it but does not restate it, so Task 1 should land first. Tasks 2–6 are
independent edits to six distinct files and may be dispatched in any order after
Task 1. Task 7 (the changeset) is content-independent and may land any time. The
plan lists them in a natural reading order.

| Task | File | Nature |
| ---- | ---- | ------ |
| 1 | `skills/radical-pipelines/reference/summary-format.md` (new) | Create the shared format definition |
| 2 | `agents/code-reviewer.md` | Write-summary-on-approval + commit-together |
| 3 | `agents/doc-reviewer.md` | Same two changes, mirrored |
| 4 | `skills/radical-pipelines/reference/autonomous-phases/4 - code.md` | Outputs + launch-prompt item + step 6 |
| 5 | `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` | Same three changes, mirrored |
| 6 | `skills/radical-pipelines/reference/pipeline-versioning.md` + `skills/radical-pipelines/SKILL.md` | Predicate table rows + Produces cells |
| 7 | `.changeset/*.md` (new) | `minor` changeset releasing the feature |

## Tasks

### Task 1 — Create `summary-format.md`, the single shared summary-format definition

**Goal:** Add the one place the per-phase summary format is defined — its schema,
its omit-empty rendering rule, its coverage statement, its asset convention, and
its authoring discipline — so both reviewers can be handed the resolved content
and neither agent file ever restates it.

**Files to change:**
- `skills/radical-pipelines/reference/summary-format.md` (new file;
  `skills/radical-pipelines/reference/` already exists)

**Changes:**

Create the file with exactly this content:

```markdown
# The Summary Format

This describes a per-phase summary — a self-contained, human-friendly record of
what its phase produced in the current run as a whole. The code phase renders it
as `4-code/code-summary.md` (H1 `# Code Summary`); the docs phase renders it as
`5-docs/docs-summary.md` (H1 `# Docs Summary`). The section skeleton below is
identical for both.

## Schema and rendering

Render these sections and **omit any that are empty** — no `N/A` placeholders:

- **What** — what the phase produced in the current run as a whole.
- **Why** — the purpose it serves.
- **How** — how it was realized.
- **Key decisions** _(optional)_ — notable decisions, with rejected alternatives
  worth recording folded in here.
- **Known limitations** _(optional)_ — gaps or caveats a reader should know.

Screenshots or other assets live in the same phase folder and are referenced by
relative path.

## Authoring discipline

- **Cover the whole run, not the last batch.** The summary records what the phase
  produced across the entire run — every rejected iteration's surviving work, not
  only the final approved batch. The reviewer's base-ref → HEAD diff already spans
  this scope.
- **Record, don't re-argue.** State what was produced and why; do not re-litigate
  the spec, design, or plan, which the prior phases already settled.
- **Write for a human reader of the artifact folder** — and for a project building
  run-level outputs from the per-phase summaries. Be concrete and concise.
```

The template above is authoritative: create the file with exactly that content.
It already honors the project's minimalist writing rules (from `CLAUDE.md`) —
fewest words that convey the meaning, no negative phrasing unless strictly
necessary, no duplication — and matches the tone and density of
`intent-format.md` (the file this is shaped after).

The load-bearing content constraints below restate which parts of that template
the design fixes, so a reviewer can check them directly; they do not license
rephrasing the template:

- The H1 is exactly `# The Summary Format`.
- The omit-empty rule line is **byte-identical** to the one in
  `intent-format.md`: `Render these sections and **omit any that are empty** — no
  `N/A` placeholders:` (em dash, backticked `N/A`). This is the project's
  established shared rule; it must read identically across format files.
- The five section names are exactly **What / Why / How / Key decisions / Known
  limitations**, in that order, with **Key decisions** and **Known limitations**
  marked `_(optional)_` and the first three unmarked. There is **no** separate
  "Rejected approaches" section — rejected alternatives fold into **Key
  decisions** (design Key Decision: "Five-section summary format, no separate
  'Rejected approaches' section").
- The coverage statement **"what its phase produced in the current run as a
  whole"** (and the equivalent "what the phase produced in the current run as a
  whole" in the **What** bullet) lives **here and only here**. It is the single
  source for requirement 3 and must not be repeated in any agent or phase
  reference file (design Risk: "The coverage statement in particular lives once").
- The asset line states the convention once, mirroring the intent convention:
  assets live in the same phase folder and are referenced by relative path
  (requirement 4).
- Both rendered H1s are named: `# Code Summary` for `4-code/code-summary.md`,
  `# Docs Summary` for `5-docs/docs-summary.md`.
- The file ends with a single trailing newline.

**Depends on:** none (first task; the source the others reference).

**Traces to:**
- Spec req 6 / Design Key Decision "Define the format once in a skill reference
  file" — a single standalone reference file holds the format, shared by both
  phases.
- Spec req 3 / AC4 — the coverage statement lives here, once, stating the summary
  covers the whole run not just the final batch.
- Spec req 4 — the asset convention (assets in the phase folder, referenced by
  relative path) is stated here.
- Spec req 6 / Design "Five-section summary format" decision — What / Why / How /
  Key decisions / Known limitations, no separate Rejected approaches section.

**Acceptance (observable, testable):**
- `skills/radical-pipelines/reference/summary-format.md` exists with H1
  `# The Summary Format`.
- It contains exactly five schema sections named, in order, **What**, **Why**,
  **How**, **Key decisions** _(optional)_, **Known limitations** _(optional)_, and
  no "Rejected approaches" section.
- It contains the omit-empty rule line byte-identical to the one in
  `intent-format.md`.
- It contains the coverage statement "what its phase produced in the current run
  as a whole" (and the **What** bullet's "what the phase produced in the current
  run as a whole"), and it names both rendered H1s `# Code Summary` and
  `# Docs Summary`.
- It states the asset convention (assets in the same phase folder, referenced by
  relative path).
- A repository-wide search confirms this coverage statement does **not** appear in
  `agents/code-reviewer.md` or `agents/doc-reviewer.md`.

### Task 2 — `code-reviewer`: write the summary on approval and commit it with the approval marker

**Goal:** On an approved verdict, have the `code-reviewer` write
`4-code/code-summary.md` (in addition to the approval marker) following the
summary format it received in its launch prompt, and commit both files in the
single existing approval commit. The rejected branch is untouched.

**Files to change:**
- `agents/code-reviewer.md`

**Changes:**

Three edits, all within the existing workflow steps (no new step, no shape change):

1. **Step 1 ("Gather context") — name the summary format as a launch-prompt
   input.** Today step 1 item 1 enumerates the batch metadata the reviewer reads
   from the launch prompt (task IDs, base ref, iteration number N), and item 5
   separately names the guardrails as another launch-prompt input on its own line.
   The summary format is a new launch-prompt input the reviewer consumes in step 4,
   so it must appear in this enumeration too, or the file tells the reviewer what
   its launch prompt carries and omits the one item step 4 relies on. Add a new
   enumerated item naming the summary format — one short phrase (e.g. "the summary
   format to follow when writing the summary on approval"), mirroring how the
   guardrails input gets its own line. Name it only; do **not** restate the format
   schema, the omit-empty rule, the coverage statement, or the asset convention —
   those live solely in `summary-format.md`.

2. **Step 4 ("Write the review") — add a write-the-summary-on-approval
   instruction.** Today step 4 has the reviewer pick the filename by verdict and
   write the review file using the given structure. Add an instruction that, on
   an **approved** verdict only, in addition to writing
   `code-review-approved.md`, the reviewer also writes
   `<artifacts-folder>/4-code/code-summary.md` following the summary format from
   its launch prompt. The existing "Approved" / "Rejected" verdict split already
   scopes this to approval, so no separate sentence about rejected iterations is
   needed. Reference the format as "the summary format from your launch prompt";
   do **not** restate the format schema (including the rendered H1), the
   omit-empty rule, the coverage statement, or the asset convention here — the
   launch-prompt format already determines all of them. Place this as a short
   instruction at the end of step 4, after the review-structure template, so the
   verdict-then-write flow reads naturally.

3. **Step 5 ("Commit and report") — commit both files together on approval.**
   Today step 5.1 reads "Commit the file you wrote in step 4 using the host
   project's commit format." Change it so that on an approved verdict the reviewer
   commits **both** the approval marker and `code-summary.md` (and any assets it
   referenced) **together in one commit** using the host project's commit format;
   on a rejected verdict it commits the single rejection file exactly as today.
   Steps 5.2 (approved → message orchestrator) and 5.3 (rejected → report task
   IDs) are unchanged.

Constraints:
- Minimalist wording per `CLAUDE.md`: add only the words needed. The coverage
  statement and the format schema must **not** appear in this file — reference the
  launch-prompt format instead (design Risk: coverage statement lives once).
- The single-commit coupling is load-bearing (design Key Decision "Graft the
  summary onto the reviewer's approval path, in one commit"): the wording must
  make clear both markdown files land in the **same** commit, so there is never a
  committed state with the approval marker but no summary.
- The three edits above (the new step 1 enumerated item, the end of step 4, step
  5.1) are the only changes. Do not alter the review-file structure template, the
  verdict/filename rules, the guardrail/blocker guidance, the existing
  gather-context items, or any other step.

**Depends on:** Task 1 (the format this step references must exist).

**Traces to:**
- Spec req 1, 2 / AC1 — the approving `code-reviewer` writes
  `4-code/code-summary.md`, committed alongside `code-review-approved.md`.
- Spec req 2 — written on approval only; rejected iterations produce no summary.
- Design Key Decision "Graft the summary onto the reviewer's approval path, in one
  commit" — step 4 gains a write-on-approved instruction; step 5 commits both
  files in one commit.

**Acceptance (observable, testable):**
- `agents/code-reviewer.md` step 1's launch-prompt enumeration names the summary
  format as a launch-prompt input the reviewer reads, alongside the existing batch
  metadata and the guardrails input.
- Step 4 instructs the reviewer, on an approved verdict only, to also write
  `<artifacts-folder>/4-code/code-summary.md` following the summary format from its
  launch prompt. The instruction names only the file path and defers everything
  else to the launch-prompt format; it adds no separate rejected-verdict sentence
  (the existing verdict split already scopes it to approval).
- Step 5 instructs the reviewer, on approval, to commit the approval marker and
  `code-summary.md` together in a single commit using the host project's commit
  format; the rejected path commits the single rejection file as before.
- The file does **not** restate the summary format schema (including the rendered
  H1), the omit-empty rule, the coverage statement, or the asset convention; it
  references the launch-prompt format instead.
- No step or guidance bullet other than the new step 1 enumerated item, the end of
  step 4, and step 5.1 is changed.

### Task 3 — `doc-reviewer`: write the summary on approval and commit it with the approval marker

**Goal:** The same three changes as Task 2, mirrored for the docs phase: name the
summary format as a launch-prompt input in the gather-context step, and on
approval have the `doc-reviewer` write `5-docs/docs-summary.md` following the
launch-prompt format and commit it together with `docs-review-approved.md` in one
commit.

**Files to change:**
- `agents/doc-reviewer.md`

**Changes:**

Mirror Task 2 exactly, against `doc-reviewer.md`'s equivalent steps:

1. **Step 1 ("Gather context"), launch-prompt enumeration** — name the summary
   format as a launch-prompt input the reviewer reads, one short phrase mirroring
   how the guardrails input is named, alongside the existing batch metadata. Name
   it only; do not restate schema, omit-empty rule, coverage statement, or asset
   convention.
2. **Step 4 ("Write the review")** — add the write-on-approval instruction: on an
   approved verdict only, also write `<artifacts-folder>/5-docs/docs-summary.md`
   following the summary format from the launch prompt. The existing verdict split
   already scopes this to approval, so no separate rejected-verdict sentence is
   needed. Reference the launch-prompt format; do not restate schema (including
   the rendered H1), omit-empty rule, coverage statement, or asset convention.
3. **Step 5 ("Commit and report"), step 5.1** — on approval commit
   `docs-review-approved.md` and `docs-summary.md` (and any assets) together in
   one commit; on rejection commit the single rejection file as today. Steps 5.2
   and 5.3 unchanged.

Constraints: identical to Task 2 — minimalist wording, no restatement of the
format or coverage statement, single-commit coupling explicit; the three edits
above are the only changes, no other step altered.

**Depends on:** Task 1.

**Traces to:**
- Spec req 1, 2 / AC2 — the approving `doc-reviewer` writes
  `5-docs/docs-summary.md`, committed alongside `docs-review-approved.md`.
- Spec req 2 — written on approval only.
- Design Modified component `agents/doc-reviewer.md` — "the same two changes,
  mirrored for the docs phase."

**Acceptance (observable, testable):**
- `agents/doc-reviewer.md` step 1's launch-prompt enumeration names the summary
  format as a launch-prompt input the reviewer reads, alongside the existing batch
  metadata.
- Step 4 instructs the reviewer, on an approved verdict only, to also write
  `<artifacts-folder>/5-docs/docs-summary.md` following the launch-prompt format.
  The instruction names only the file path and defers everything else to the
  launch-prompt format; it adds no separate rejected-verdict sentence.
- Step 5 instructs committing `docs-review-approved.md` and `docs-summary.md`
  together in one commit on approval; the rejected path is unchanged.
- The file does not restate the format schema (including the rendered H1),
  omit-empty rule, coverage statement, or asset convention.
- No step or guidance bullet other than step 1's launch-prompt enumeration, the
  end of step 4, and step 5.1 is changed.

### Task 4 — Phase 4 reference: add the summary to Outputs, the launch prompt, and the completion predicate

**Goal:** Extend `autonomous-phases/4 - code.md` so the orchestrator (a) lists
`4-code/code-summary.md` as a phase output, (b) carries the resolved summary
format in every `code-reviewer` launch prompt alongside the existing batch
metadata, and (c) requires the summary in the step 6 completion-predicate check.

**Files to change:**
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`

**Changes:**

Three edits:

1. **Outputs list** — add a bullet for `<artifacts-folder>/4-code/code-summary.md`
   (the summary written by the `code-reviewer` on approval). Place it with the
   review-file outputs; describe it as written on approval, one per run.

2. **Step 4 (launch the `code-reviewer`)** — today step 4 launches the reviewer
   "with the list of task IDs in the batch, the base ref to diff against …, and
   the rejection iteration number N." Add one launch-prompt item: **the resolved
   content of `summary-format.md`** (read by the orchestrator and passed as
   resolved content, the same way every other resolved item reaches an agent),
   included on every reviewer launch alongside the base ref and iteration number.
   Mandate only that operational content — the resolved format is a launch-prompt
   item on every launch; do not add a rationale clause explaining why (e.g.
   "because the verdict is not known in advance"), and do not restate the format
   itself.

3. **Step 6 (completion predicate)** — today step 6 lists "every
   `code-review-N-rejected.md`, and `code-review-approved.md` are committed." Add
   `4-code/code-summary.md` to that committed-artifacts list, joined with "and",
   so the phase is complete only when the summary is committed too. Keep it
   consistent with the `pipeline-versioning.md` "Per-phase completion" row (Task
   6).

Constraints:
- Reference `summary-format.md` by name as the resolved content the orchestrator
  passes; do not inline or paraphrase the format. The orchestrator reading a skill
  `reference/` file and passing resolved content is the established mechanism
  (mirrors how guardrails/conventions reach agents); the wording should read like
  the existing resolved-content delivery, not introduce a new notion.
- Minimalist wording per `CLAUDE.md`.
- Do not touch steps 1, 2, 3, 5, the mermaid diagram, the Decisions section, or
  the Required-agents table.

**Depends on:** Task 1 (the file the launch-prompt item references).

**Traces to:**
- Spec req 1 — `4-code/code-summary.md` is a phase-4 output.
- Spec req 6 / Design "deliver it via the launch prompt" decision — the resolved
  format reaches the reviewer through the launch prompt.
- Spec req 5 / AC3 — step 6 completion prose requires the summary.
- Design Modified component `autonomous-phases/4 - code.md` — "adds
  `4-code/code-summary.md` to the Outputs list, extends the reviewer-launch step
  (step 4) to carry the resolved summary format, and adds the summary to the step
  6 completion-predicate prose."

**Acceptance (observable, testable):**
- The Outputs list in `4 - code.md` includes `<artifacts-folder>/4-code/code-summary.md`.
- Step 4 instructs the orchestrator to include the resolved content of
  `summary-format.md` in every `code-reviewer` launch prompt, alongside the task
  IDs, base ref, and iteration number; it adds no rationale clause explaining why
  the format is sent on every launch.
- Step 6's committed-artifacts list includes `4-code/code-summary.md`, joined by
  "and".
- The file does not inline or paraphrase the summary format schema; it references
  `summary-format.md`.
- Steps 1–3, 5, the mermaid diagram, the Decisions section, and the agents table
  are unchanged.

### Task 5 — Phase 5 reference: add the summary to Outputs, the launch prompt, and the completion predicate

**Goal:** The same three edits as Task 4, mirrored for the docs phase in
`autonomous-phases/5 - docs.md` — `5-docs/docs-summary.md` in Outputs, the
resolved format in every `doc-reviewer` launch prompt, and the summary in the
step 6 predicate.

**Files to change:**
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`

**Changes:**

Mirror Task 4 against `5 - docs.md`:

1. **Outputs list** — add `<artifacts-folder>/5-docs/docs-summary.md` (written by
   the `doc-reviewer` on approval, one per run).
2. **Step 4 (launch the `doc-reviewer`)** — add the resolved content of
   `summary-format.md` as a launch-prompt item, included on every launch alongside
   the existing task IDs, base ref, and iteration number. Mandate only that
   operational content; do not add a rationale clause explaining why it is sent on
   every launch.
3. **Step 6 (completion predicate)** — add `5-docs/docs-summary.md` to the
   committed-artifacts list, joined with "and."

Constraints: identical to Task 4 — reference `summary-format.md`, do not inline
it; minimalist wording; leave steps 1–3, 5, the mermaid diagram, the Decisions
section, and the agents table untouched.

**Depends on:** Task 1.

**Traces to:**
- Spec req 1 — `5-docs/docs-summary.md` is a phase-5 output.
- Spec req 6 / Design "deliver it via the launch prompt" decision.
- Spec req 5 / AC3 — step 6 completion prose requires the summary.
- Design Modified component `autonomous-phases/5 - docs.md` — "the same three
  changes, mirrored for the docs phase."

**Acceptance (observable, testable):**
- The Outputs list in `5 - docs.md` includes `<artifacts-folder>/5-docs/docs-summary.md`.
- Step 4 instructs the orchestrator to include the resolved content of
  `summary-format.md` in every `doc-reviewer` launch prompt, alongside the task
  IDs, base ref, and iteration number; it adds no rationale clause explaining why
  the format is sent on every launch.
- Step 6's committed-artifacts list includes `5-docs/docs-summary.md`, joined by
  "and".
- The file references `summary-format.md` and does not inline the format.
- Steps 1–3, 5, the mermaid diagram, the Decisions section, and the agents table
  are unchanged.

### Task 6 — Extend the completion predicate table and the SKILL Produces cells

**Goal:** Make the per-phase completion predicate — the single source of truth
that resume and review gating delegate to — require both files for phases 4 and
5, and reflect the new summaries in the SKILL phase table's Produces cells.

**Files to change:**
- `skills/radical-pipelines/reference/pipeline-versioning.md`
- `skills/radical-pipelines/SKILL.md`

**Changes:**

1. **`pipeline-versioning.md` — "Per-phase completion" table.** The phase 4 row's
   Required-artifacts cell is `4-code/code-review-approved.md`; change it to
   `4-code/code-review-approved.md` and `4-code/code-summary.md`. The phase 5 row
   is `5-docs/docs-review-approved.md`; change it to
   `5-docs/docs-review-approved.md` and `5-docs/docs-summary.md`. Use the exact
   "<file> and <file>" join already used by the phase 3 row
   (`3-plan/code-plan-review-approved.md` and `3-plan/doc-plan-review-approved.md`)
   so the two-file rows read consistently. No other table cell, and no surrounding
   prose, changes — every downstream consumer (resume, review gating, fork) reads
   this table and inherits the extension with no further edit.

2. **`SKILL.md` — Phases table Produces cells.** Phase 4's Produces cell is "Code
   changes, unit and end-to-end tests, behavior verification"; phase 5's is
   "Documentation (both internal and external)". Append the per-phase summary to
   each cell (e.g. add "and a code summary" / "and a docs summary", or the
   minimalist equivalent that fits the cell's style). Keep the additions short and
   consistent with the terse cell style; change nothing else in the table or the
   surrounding sections.

Constraints:
- Minimalist wording per `CLAUDE.md`. The predicate is the single source of
  truth; do **not** restate the extended file lists anywhere else (the phase
  reference files' step 6 prose, edited in Tasks 4/5, mirror this row by design,
  which is the one intended echo — there is no other).
- Do not alter any other row, the lineage/rendering sections of
  `pipeline-versioning.md`, or any other part of `SKILL.md`.

**Depends on:** none on file content (the predicate names the artifacts whether
or not Tasks 2–5 have landed). May land independently; listed after 4/5 only for
reading order.

**Traces to:**
- Spec req 5 / AC3 — phase 4 is not complete without `code-summary.md`; phase 5
  not without `docs-summary.md`.
- AC6 — every phase has a human-readable record; the predicate enforces the
  summary's presence.
- Design Key Decision "Extend the completion predicate; let downstream consumers
  inherit" and Modified components `pipeline-versioning.md`, `SKILL.md`.

**Acceptance (observable, testable):**
- The "Per-phase completion" table in `pipeline-versioning.md` shows the phase 4
  row as `4-code/code-review-approved.md` **and** `4-code/code-summary.md`, and
  the phase 5 row as `5-docs/docs-review-approved.md` **and**
  `5-docs/docs-summary.md`, using the same "and" join as the phase 3 row.
- The SKILL phase table's phase 4 and phase 5 Produces cells each name the
  per-phase summary.
- No other table row, no lineage/rendering prose in `pipeline-versioning.md`, and
  no other part of `SKILL.md` is changed.

### Task 7 — Add the changeset releasing the per-phase-summaries feature

**Goal:** Satisfy the Changeset Gate for this release-relevant change (it touches
`skills/**` and `agents/**`) with a `minor` changeset describing the new feature.

**Files to change:**
- `.changeset/<descriptive-kebab-name>.md` (new file, e.g.
  `.changeset/per-phase-summaries.md`)

**Changes:**

Create a changeset file with the canonical front matter and a one-line imperative
summary, following `CONTRIBUTING.md` ("Adding a changeset"):

```markdown
---
"@automattic/radical-pipelines": minor
---

Add per-phase summaries for the code and docs phases: on approval the reviewer
writes a human-friendly `code-summary.md` / `docs-summary.md` into the phase
folder, so a run's artifact folder records what every phase produced.
```

Constraints:
- Bump type is `minor` — this is a new feature, and the pre-1.0 policy in
  `CONTRIBUTING.md` maps features to `minor`. It is not breaking, so no
  `BREAKING:` prefix.
- The package name in the front matter is exactly `@automattic/radical-pipelines`
  (from root `package.json`).
- The summary is imperative-mood, one logical line (it may soft-wrap in source).
- Use a descriptive kebab-case filename under `.changeset/`.

**Depends on:** none (content-independent; gate only requires a valid changeset is
present alongside the release-relevant change).

**Traces to:**
- Project release convention (`CONTRIBUTING.md` "When a changeset is required" /
  "Bump types" / "Pre-1.0 policy") — a PR touching `skills/**` and `agents/**`
  must include a changeset; a feature is `minor` pre-1.0. (No spec requirement;
  this is the host project's commit/release convention the change must satisfy to
  merge.)

**Acceptance (observable, testable):**
- A new `.changeset/*.md` file exists with front matter
  `"@automattic/radical-pipelines": minor` and a non-empty imperative summary
  describing the per-phase-summaries feature.
- `node scripts/validate-changesets.mjs` accepts the file (well-formed front
  matter, known bump type, not a pre-1.0 `major`).
- With this changeset present, the Changeset Gate's presence check
  (`npx changeset status`) is satisfied for the change.
```

