# Code plan — Generic per-run pipeline summary artifact

## Overview

This change is **documentation-and-orchestration only**: it edits the
`radical-pipelines` skill and adds one project-side agent definition plus one
`.rp.md` row. **No application code, build step, runtime, or CI behavior
changes.** The skill is a set of Markdown procedure files the orchestrator and
agents read; the deliverable is the exact wording and structure of those files.

The feature adds **one `run-summary.md` per run** (`base`, `review-N-…`),
written once at the end of phase 5 by a new single-shot `run-summary-writer`
agent, gated by the existing **Per-phase completion** predicate. Review runs are
fed all prior runs' summaries as input at their phase 1; a fork that inherits a
complete `5-docs` produces its own summary so it lands complete. The skill ships
a default summary format that a project may override through a new optional
convention.

The design fixes every decision (D1–D7) and maps each to specific files
(C1–C7). This plan turns those into ordered, independently-committable tasks.
There are **no open design choices left to the implementer** except the two
wording choices the design explicitly delegates (OQ-1 generalized layout
sentences in `pipeline-versioning.md`; OQ-2 spawn-prompt phrasing) — both
constrained here, both wording-only.

### Verified against the live skill this session

- The phase-5 procedure (`reference/autonomous-phases/5 - docs.md`) has a
  **Required agents** table (`doc-writer`, `doc-reviewer`), an **Outputs** list,
  and a step 6 that today reads "On **approved**, verify the phase 5 completion
  predicate per `pipeline-versioning.md`". There are 6 numbered steps; the
  mermaid block follows.
- `reference/pipeline-versioning.md` holds the **Per-phase completion** table
  (phase-5 row = `5-docs/docs-review-approved.md`), the **Runs within a
  pipeline** layout sentence ("Artifacts live at
  `<artifacts-folder>/<run>/<phase>`…"), and the evaluation sentence ("a phase's
  predicate is evaluated at `<artifacts-folder>/<run>/<phase>`…"). All three are
  co-located in this one file.
- `reference/review-pipeline.md` has numbered steps 1–7; step 5 authors/commits
  the review intent, step 6 re-asserts the version, step 7 returns to mode
  dispatch. It is the only file that knows run names.
- `reference/fork-pipeline.md` has numbered steps 1–7; step 5 is the copy loop
  (phase folders only), step 6 commits the seeded folders, step 7 continues
  normal phase work.
- `reference/conventions/load.md` has a **Conventions** table with a
  `Required?` column; `setup.md` has a `## 2. Collect required conventions`
  section with one `### <Name>` entry per convention. Required entries are
  suffixed `(required)` (e.g. `### Pipeline base slug (required)`); optional
  entries are **unmarked** (`### Commit format`, `### Spawning teams of agents`,
  `### Agent models`) — no `(optional)` suffix exists in the file.
- `reference/intent-format.md` is the existing skill-owned format file — the
  precedent for `run-summary-format.md`.
- `SKILL.md`'s **Phases** table phase-5 "Produces" cell =
  "Documentation (both internal and external)".
- The autonomous-workflow spawn contract (`reference/autonomous-workflow.md`,
  step 5 "Important") passes **Artifact folder** (the run folder, run name
  hidden) and **Commit format** to every agent and resolves the model via the
  **Agent models** convention. This is the channel the resolved summary format
  rides on.
- Project side: `agents/` holds one `<agent>.md` per agent (front-matter
  `name`/`description` + role body; see `doc-writer.md`); `.rp.md` has an
  **Agent models** table with one row per agent.
- `skills/**` and `agents/**` are both in `.changeset/config.json`
  `changedFilePatterns`, so this change is release-relevant and **needs a
  changeset** (verified: `["skills/**", "agents/**", ".claude-plugin/**",
  "package.json", "README.md"]`).

### Files touched (and why)

| File | C | Change |
| ---- | - | ------ |
| `skills/radical-pipelines/reference/run-summary-format.md` | C4 | **New** skill default format file |
| `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md` | C1 | Add writer to Required agents + Outputs; split step 6 into produce-then-verify |
| `skills/radical-pipelines/reference/pipeline-versioning.md` | C2 | Extend phase-5 predicate row; generalize two layout sentences |
| `skills/radical-pipelines/reference/conventions/load.md` | C4 | Add optional "Run summary format" convention row |
| `skills/radical-pipelines/reference/conventions/setup.md` | C4 | Add matching optional convention entry |
| `skills/radical-pipelines/reference/review-pipeline.md` | C5 | Collect prior summaries; feed into phase-1 input |
| `skills/radical-pipelines/reference/fork-pipeline.md` | C6 | Launch writer for fork's `base` when inheriting `5-docs` |
| `skills/radical-pipelines/SKILL.md` | C7 | Name the run summary in the phase-5 "Produces" cell |
| `agents/run-summary-writer.md` | C3 | **New** project-side agent definition |
| `.rp.md` | C3 | Add `run-summary-writer` to the **Agent models** table |
| `.changeset/<name>.md` | — | **New** changeset (release-relevant skill/agent change) |

### Skill-authoring constraints (apply to every task)

Per the project's skill-modification rules, every edit must:

- Be **minimalist** — minimum words for the same meaning; match the current
  file's tone; remove any word that can go without losing meaning.
- Not **duplicate** information already reachable on the reading path (state a
  shared rule once, at the most general level; reference it elsewhere).
- Avoid **negative phrasing** ("don't do X") unless strictly necessary for
  operation.
- Keep the **new format and the writer's mechanism** generic per R9: they
  reference no git/GitHub/tracker-specific concept (no base ref, never inspect a
  diff). This scopes R9 to the summary's format and production mechanism; it does
  **not** touch the skill's established commit/branch vocabulary (e.g.
  "committed on the pipeline branch", `pipeline-versioning.md`'s `git rev-parse`),
  which stays as-is. No mention of any agentic coding tool or issue tracker in
  the skill files (the project-side `agents/run-summary-writer.md` and `.rp.md`
  row are project files and follow the project's own conventions).
- Reuse the skill's existing terms (`run`, `base`, `review-N-<short-description>`,
  `<artifacts-folder>`, "Per-phase completion", "Required agents", "Outputs")
  rather than inventing notation.

## Tasks

The order below is the recommended commit order. The new format file (Task 1),
the override convention that resolves it (Task 2), and the predicate change
(Task 3) are referenced by later tasks, so they land first; in particular the
override convention precedes the phase-5 and fork procedures (Tasks 4, 6) that
consume the **resolved** format, so the resolution rule exists before any task
references it. Tasks are otherwise independent edits to distinct files; the only
content coupling is cross-references, all of which point at files created/edited
in an earlier-or-equal task.

---

### Task 1 — Add the default summary format file `reference/run-summary-format.md`

**Goal:** Ship the skill-owned default summary structure as a standalone
reference file (the second skill format after `intent-format.md`, and the first
overridable one), so the `run-summary-writer` has a default to follow and a
project has something concrete to override.

**Files to change:**
- `skills/radical-pipelines/reference/run-summary-format.md` (new file)

**Changes:**

Create the file. It must define the **C-format** default structure verbatim
(this exact heading set and order; HTML-comment placeholder per section), and
carry the format's authoring discipline in the minimalist tone of
`intent-format.md`. The fixed structure is:

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

Load-bearing constraints (from C4 / D5 — functional, not cosmetic):

- The H1 is `# Run Summary` and is **run-name-free** (the writer is
  run-agnostic and never sees the run name).
- The six H2 sections appear in this fixed order: What, Why, How, Key decisions,
  Rejected approaches, Known limitations. The three R4 context concerns get
  their **own H2 sections** — not folded under "How".
- **Omit-empty-sections discipline:** a section with nothing to say is omitted —
  no `N/A` placeholder (mirror `intent-format.md`'s "omit any that are empty —
  no `N/A` placeholders").
- **Standalone-document discipline:** the summary is read by a later review run
  with no other prior-run context, so it must stand alone (state this the way
  the skill states standalone discipline for other artifacts).
- Each section carries a one-line HTML-comment placeholder describing what goes
  in it (the comments above are the intended content; keep them concise).

Keep the file minimal: the structure block plus the few discipline lines.
Do not mention git, GitHub, any tracker, or any agentic coding tool. Do not
embed the run name anywhere.

**Depends on:** none (first task; later tasks reference this file by path).

**Traces to:**
- R7 / AC3 — skill defines a default format with the R4 content sections.
  (Design C4, D5.)
- R4 — the default format's sections guarantee key decisions, rejected
  approaches, and known limitations. (Design C4, D5.)
- R9 / AC9 — the format references no git/GitHub/tracker concept. (Design C4.)

**Acceptance (observable, testable):**
- `reference/run-summary-format.md` exists and contains, in order, an H1
  `# Run Summary` and the six H2s What → Why → How → Key decisions → Rejected
  approaches → Known limitations, each with a one-line HTML-comment placeholder.
- The H1 contains no run name (`base`, `review`, `N`).
- The file states omit-empty (no `N/A`) and standalone-document discipline.
- The file contains no occurrence of git, GitHub, any issue tracker, or any
  agentic coding tool name.

---

### Task 2 — Add the optional "Run summary format" override convention (`reference/conventions/load.md` and `setup.md`)

**Goal:** Let a project override the default summary format in `.rp.md` through a
new **optional** convention, resolved by the orchestrator (project override else
skill default) — without making `load.md`'s missing-required block fire on a
silent project. Landing this before the procedures (Tasks 4, 6) that consume the
**resolved** format means the resolution rule exists before any task references
it.

**Files to change:**
- `skills/radical-pipelines/reference/conventions/load.md`
- `skills/radical-pipelines/reference/conventions/setup.md`

**Changes:**

1. **`load.md` — Conventions table:** add a row

   ```
   | Run summary format | The structure of each run's run-summary.md | No |
   ```

   `Required? = No` so the missing-required-conventions block never fires when a
   project is silent. Match the table's existing wording density.

2. **`load.md` — resolution:** the inherit-or-override semantics are already
   stated for `.rp.local.md` ("where it names a convention its value wins, where
   it is silent the committed value is inherited"). State, minimally and once,
   that for the summary format the **skill default**
   (`reference/run-summary-format.md`) applies where the project is silent — the
   same inherit-or-override shape, with the skill file as the silent fallback. Do
   not duplicate the generic inherit-or-override rule — extend it by naming the
   skill-file fallback. The mechanics of handing the resolved format to the
   writer live at the point of use (Task 4); `load.md` states only the resolution
   rule.

3. **`setup.md` — collect entry:** add an optional entry under
   `## 2. Collect required conventions`, headed `### Run summary format`
   (unmarked, matching the file's existing optional entries — required entries
   carry `(required)`, optional ones are unmarked), whose suggested default is
   the skill file `reference/run-summary-format.md`. Keep it to the few lines the
   other optional entries use; state that a project may name its own format file
   and that the skill default applies otherwise.

Keep both edits minimal and generic. Do not restate the C-format structure
here — `setup.md`/`load.md` reference the format file, they do not embed it
(single source: Task 1).

**Depends on:** Task 1 (the skill default file the convention points at as the
silent fallback).

**Traces to:**
- R4, R7 / AC6 — project override yields the project's format; silence yields
  the default. (Design C4, D4.)
- R9 / AC9 — convention/resolution reference no git/GitHub/tracker concept.
  (Design C4.)

**Acceptance (observable, testable):**
- `load.md`'s **Conventions** table has a "Run summary format" row with
  `Required? = No`.
- `load.md` states the resolved format is project-override-else-skill-default,
  without duplicating the generic inherit-or-override rule.
- `setup.md` has an optional "Run summary format" entry headed `### Run summary
  format` (unmarked, like the other optional entries) whose suggested default is
  `reference/run-summary-format.md`.
- Neither edit embeds the C-format structure or names a tracker / agentic coding
  tool.

---

### Task 3 — Extend the phase-5 completion predicate and generalize the layout wording (`reference/pipeline-versioning.md`)

**Goal:** Make `run-summary.md` part of the phase-5 completion predicate so that
gating the run on the summary happens **everywhere at once** (every
completion/resume/review-gate check reads this one table), and generalize the
two co-located sentences that currently pin all artifacts to `<run>/<phase>` so
a run-level path is valid in the table.

**Files to change:**
- `skills/radical-pipelines/reference/pipeline-versioning.md`

**Changes:**

1. **Extend the phase-5 row** of the **Per-phase completion** table so it
   requires `run-summary.md` alongside the existing approval file. The row
   becomes (exact artifact set; keep the table's existing column shape):

   ```
   | 5 – Docs       | `5-docs/docs-review-approved.md` and `run-summary.md` |
   ```

   `run-summary.md` is named **without** a `<phase>/` prefix because it lives at
   the run-folder root — that distinction is what the next two edits make legal.

2. **Generalize the layout sentence** in **Runs within a pipeline** (OQ-1).
   Today: "Artifacts live at `<artifacts-folder>/<run>/<phase>`…". Generalize so
   most artifacts live under `<run>/<phase>` **and** a run-level artifact at the
   `<run>/` root is valid — the run summary being that run-level case. Keep
   `<run>/<phase>` the common case; do not drop the existing `<run>` definitions
   (`base`, `review-1-<short-description>`, …) that follow in the same sentence.

3. **Generalize the predicate-evaluation sentence** (OQ-1). Today: "a phase's
   predicate is evaluated at `<artifacts-folder>/<run>/<phase>`…". Generalize so
   a predicate entry may name a path **relative to the run folder**, of which
   `<phase>/…` is the common case and a run-level file (`run-summary.md`) the
   run-level case. The phase-5 row's two-path predicate must read cleanly under
   the new wording (one path under `5-docs/`, one at the run root).

Wording for edits 2–3 is the implementer's choice (OQ-1) under one hard
constraint: **the phase-5 row can legitimately name the run-level
`run-summary.md` while `<phase>/…` stays the common case.** Keep both sentences
minimal and in the file's current tone; do not restructure surrounding prose.

Do **not** touch the lineage / tree-SHA logic (it hashes `base/<phase>` folder
trees only — a run-level file stays out of it by construction; see design
"Explicitly untouched"). Do **not** add any resume-specific or review-specific
wording here — those files delegate to this table unchanged.

**Depends on:** none (the predicate string `run-summary.md` is self-contained;
the file name is fixed by the design).

**Traces to:**
- R2, R3 / AC1, AC2 — the summary gates run completion; a run with docs approved
  but no summary is not complete. (Design C2, D1.)
- R1, R8 / AC1, AC7 — run-level `run-summary.md` named in the predicate, run
  identity carried by `<run>/`, not the filename. (Design C2, D2.)

**Acceptance (observable, testable):**
- The **Per-phase completion** table's phase-5 row requires both
  `5-docs/docs-review-approved.md` and `run-summary.md`.
- The **Runs within a pipeline** layout sentence admits a run-level artifact at
  the `<run>/` root while keeping `<run>/<phase>` the common case.
- The predicate-evaluation sentence admits a predicate entry naming a path
  relative to the run folder (both `<phase>/…` and a run-level file).
- No other completion/resume/review-gate wording in the file changed, and the
  lineage/tree-SHA section is untouched.

---

### Task 4 — Produce the summary as the final step of phase 5 (`reference/autonomous-phases/5 - docs.md`)

**Goal:** Fold producing `run-summary.md` into phase 5 as its final step —
launched after `doc-reviewer` approval, before the predicate verification — so
the same predicate (now extended in Task 3) is checked once, after the summary
is committed.

**Files to change:**
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`

**Changes:**

1. **Required agents table** — add a `run-summary-writer` row:
   one fresh instance per run, **Persistent? = No**, role "Writes the run
   summary after docs approval." Match the table's existing column shape and
   terse role wording.

2. **Outputs list** — add `<artifacts-folder>/run-summary.md`, with a note that
   it lives at the **run-folder root**, not under `5-docs/` (so a reader does
   not assume the phase-folder path the other outputs use).

3. **Split today's step 6 into two steps** — produce, then verify:

   - **New produce step (was the "On approved" action):** on **approved**,
     launch a fresh single-shot `run-summary-writer` with the **resolved summary
     format** (Task 2 / C4: project override else the skill default
     `reference/run-summary-format.md`) as the launch-specific extra input,
     following the step-4 base-ref precedent for naming a per-launch extra
     (OQ-2). The writer reads the run's committed artifacts and the shipped
     code/docs as files and commits `run-summary.md` at the run-folder root.
     This is the single point at which the resolved format is handed to the
     writer; name the extra here, not the universal spawn inputs
     `autonomous-workflow.md` already owns.
   - **New final verify step:** verify the **extended** phase-5 predicate per
     `pipeline-versioning.md` ("Per-phase completion"). Extend today's
     enumeration rather than replacing it: all documentation changes, every
     `docs-review-N-rejected.md`, `docs-review-approved.md`, **and**
     `run-summary.md` are committed on the pipeline branch. The predicate is
     verified **once, here**, after the summary is committed — not before it
     exists. Replace today's in-place "verify the phase 5 completion predicate"
     wording so verification no longer happens before the summary.

4. **Mermaid diagram** — extend the terminal path so approval flows to the
   `run-summary-writer` and then to "Phase complete", keeping the diagram
   consistent with the new step split. Keep it minimal and in the existing
   diagram's style.

State once that the writer runs **only after approval, exactly once per run**
(this single-shot, launched-on-approval framing carries that it is ungated and
outside the rejection loop, so no negative restatement is needed). Do not
duplicate the writer's source list or mechanism here — those live in the agent
definition (Task 8) and the agent's general spawn contract; reference, do not
restate.

**Depends on:**
- Task 1 (the default format path `reference/run-summary-format.md` is named as
  the fallback).
- Task 2 (the resolution rule this step's "resolved summary format" refers to).
- Task 3 (the extended predicate this step verifies against).

**Traces to:**
- R1, R2, R3 / AC1 — exactly one summary per run, produced at run completion,
  gating completion. (Design C1, D1.)
- R9 / AC9 — writer reads files only; the mechanism references no
  git/GitHub/tracker concept. (Design C1, C3.)

**Acceptance (observable, testable):**
- The **Required agents** table lists `run-summary-writer` (non-persistent, one
  per run, "Writes the run summary after docs approval.").
- The **Outputs** list names `<artifacts-folder>/run-summary.md` at the
  run-folder root.
- On approval the procedure launches the `run-summary-writer` (with the resolved
  format) **before** the predicate-verification step; the predicate-verification
  step is the **final** step and verifies the full enumeration — all
  documentation changes, every `docs-review-N-rejected.md`,
  `docs-review-approved.md`, **and** `run-summary.md`.
- The mermaid diagram routes approval through the run-summary writer to phase
  complete.
- The procedure states the writer is single-shot and launched once on approval,
  without restating the writer's source list.

---

### Task 5 — Collect prior runs' summaries as review-run input (`reference/review-pipeline.md`)

**Goal:** When a review run starts, collect the `run-summary.md` of every prior
run in run order and feed the collected **content** into the review run's phase-1
input — mode-independently, before mode dispatch — so a review builds on an
accurate picture of the runs before it while phase-1 agents stay run-agnostic.

**Files to change:**
- `skills/radical-pipelines/reference/review-pipeline.md`

**Changes:**

Add a single collection rule and its delivery, placed **between step 6
(re-assert the version) and step 7 (return to mode dispatch)** — i.e. after the
run folder and intent exist and before mode dispatch, since this is the only
file that knows run names and dispatch is where both modes branch.

- **Collection rule (stated once):** the prior runs of `review-N` are
  `base, review-1, …, review-(N-1)`, in that order; collect each one's
  `run-summary.md`. State that the order is derivable from the existing **Runs
  within a pipeline** definitions (monotonic `N`, linear
  `base → review-1 → …` chain). This is the first step that collects across
  **all** prior runs rather than just the latest, which is why the rule is made
  explicit.
- **Delivery, mode-independent (OQ-2):** collection happens before mode
  dispatch, so both modes receive it. In an **autonomous** review the collected
  summaries (in run order) are passed as **content** in the phase-1 spawn
  prompts; in an **assisted** review the orchestrator reads them directly while
  authoring the phase-1 artifacts. Either way they are passed as **content**,
  never as run-named paths, so phase-1 agents stay run-agnostic.
- **Scope:** "when a review run starts" = phase 1 only. State that phases 2–5 are
  unchanged — they work from the review run's own artifacts, into which phase 1
  has already absorbed the prior context — so the summaries are not re-fed
  downstream.

Do **not** route this through the review intent (its Origin section captures
what prompted the review; `intent-format.md`'s capture-don't-converge discipline
argues against folding pipeline history in, and R5/AC4 frame the summaries as
inputs in their own right). Do **not** add a summary-specific immutability
sentence — the existing "a review only ADDS a sibling run folder, never rewrites
prior runs" rule already covers R6/AC5. Keep the addition minimal and in the
file's numbered-step tone; renumber the following step if needed.

**Depends on:** none structurally (it references `run-summary.md` by its fixed
name and the existing **Runs within a pipeline** rule). Logically it presumes
prior runs have summaries, which Task 3's predicate guarantees for any complete
run (a run cannot be complete — and thus cannot be a *prior complete run* of a
review — without its summary).

**Traces to:**
- R5 / AC4 — prior runs' summaries, in run order, are part of a review run's
  input. (Design C5, D6.)
- R6 / AC5 — no new immutability rule; the general add-a-sibling rule covers it.
  (Design C5, D6.)

**Acceptance (observable, testable):**
- `review-pipeline.md` states the collection rule once: prior runs of `review-N`
  are `base, review-1, …, review-(N-1)` in order, each contributing its
  `run-summary.md`.
- The rule sits before mode dispatch and specifies content delivery for both
  autonomous (phase-1 spawn prompts) and assisted (orchestrator reads directly)
  reviews.
- Delivery is by **content**, never run-named paths; scope is phase 1 only,
  phases 2–5 explicitly unchanged.
- No summary-specific immutability sentence was added; the intent is not used as
  the carrier.

---

### Task 6 — Produce the fork's own summary when it inherits `5-docs` (`reference/fork-pipeline.md`)

**Goal:** A fork that inherits a complete `5-docs` seeds no `run-summary.md`
(the copy loop touches only phase folders), so under the extended predicate
(Task 3) its phase 5 would be incomplete. Launch the `run-summary-writer` for the
fork's `base` run after seeding so the fork produces its **own** summary from its
own (inherited) artifacts and lands complete.

**Files to change:**
- `skills/radical-pipelines/reference/fork-pipeline.md`

**Changes:**

Add a step **after step 6 (commit the seeded folders) and before step 7
(continue normal phase work)**:

- **If the inherited phase is `5-docs`**, launch a fresh `run-summary-writer`
  for the fork's `base` run — with the **resolved summary format** (Task 2 / C4),
  exactly as in the phase-5 procedure (Task 4) — to write and commit
  `run-summary.md` at the fork's `base/` run-folder root. Placing it after step 6
  means the inherited artifacts are already committed, so the writer's
  "committed before the writer runs" contract holds.
- State that **for any inherited phase below `5-docs`**, this step does not apply
  — the fork has no completed phase 5 yet and runs phase 5 (and the writer)
  itself later via the normal flow.

Note in the step that the run-level `run-summary.md` is structurally never
copied by step 5's phase-folder-only loop (so R10's no-copying leg holds with no
explicit exclusion), and that this step produces the fork's own summary — R10's
"each pipeline's runs produce their own". Keep it to one conditional step in the
file's numbered tone; renumber the following step.

**Depends on:**
- Task 1 (default format path, as the fallback).
- Task 2 (the resolution rule this step's "resolved summary format" refers to).
- Task 3 (the extended predicate that makes this step necessary).
- Task 4 establishes the writer-launch shape this step mirrors (resolved format
  as the launch-specific extra input); reference it rather than restating the
  writer's contract.

**Traces to:**
- R3, R10 / AC1, AC8 — a fork inheriting `5-docs` produces its own summary from
  its own artifacts and lands complete; no summary is copied on fork. (Design
  C6, D7, D2.)

**Acceptance (observable, testable):**
- A new conditional step sits between today's step 6 and step 7.
- When the inherited phase is `5-docs`, it launches a `run-summary-writer` for
  the fork's `base` run (with the resolved format) to write/commit
  `base/run-summary.md`.
- It states the step does not apply for inherited phases below `5-docs`.
- It does not add a negative copy-exclusion to step 5 (the phase-folder-only
  loop already excludes run-level files structurally).

---

### Task 7 — Name the run summary in the phase-5 "Produces" cell (`SKILL.md`)

**Goal:** Surface the run summary as a phase-5 output in the top-level **Phases**
table, at the table's one-phrase-per-phase altitude.

**Files to change:**
- `skills/radical-pipelines/SKILL.md`

**Changes:**

Extend the phase-5 "Produces" cell from
"Documentation (both internal and external)" to name the run summary, e.g.
"Documentation (both internal and external) and the run summary". Keep the cell
to one short phrase — do not list files, paths, the predicate, or the producer
(those live in C1–C2 / Tasks 2–3). Preserve the table's column alignment.

**Depends on:** none.

**Traces to:**
- R3 / AC1 — the run summary is a phase-5 output. (Design C7.)

**Acceptance (observable, testable):**
- The phase-5 row's "Produces" cell names the run summary alongside
  documentation, as a single short phrase.
- No file path, predicate, or producer detail was added to the cell, and the
  table's alignment is preserved.

---

### Task 8 — Add the project-side `run-summary-writer` agent definition (`agents/run-summary-writer.md`)

**Goal:** Define the concrete `run-summary-writer` agent the orchestrator
launches in Tasks 3 and 5: a single-shot agent that writes and commits
`run-summary.md` from the run's committed artifacts and shipped files, with no
git base ref, following the resolved summary format handed to it.

**Files to change:**
- `agents/run-summary-writer.md` (new file)

**Changes:**

Create the agent definition in the house style of the other `agents/*.md`
files (YAML front-matter `name: run-summary-writer` and a one-line
`description`, then a role body). Its contract, per C3:

- **Single-shot, one run.** Written exactly once for its run; never iterates.
  Launched after docs approval (phase 5) or after seeding when a fork inherits a
  complete `5-docs` — either way once, from the run's committed artifacts.
- **Sources (all inside the run folder, committed before the writer runs):**
  - *What changed* — `1-spec/spec.md`, `3-plan/code-plan.md` + `doc-plan.md`,
    and the shipped code/docs **read as files**.
  - *Why* — `spec.md`, `2-design-doc/design-doc.md`.
  - *Key decisions* — `design-doc.md`.
  - *Rejected approaches* — `design-doc.md` alternatives plus the
    `*-review-N-rejected.md` files of phases 1–5.
  - *Known limitations* — `design-doc.md` risks, `spec.md` out-of-scope.
- **No git.** Given no base ref; never inspects a diff. Reads shipped code/docs
  as files (the established writer pattern), so the mechanism references no
  git/GitHub/tracker concept.
- **Follows the resolved summary format** handed to it in its spawn prompt
  (the skill default `run-summary-format.md` unless the project overrode it),
  including its omit-empty and standalone-document discipline.
- **Writes and commits** `run-summary.md` at the **run-folder root** (the
  Artifact folder the orchestrator passes is the run folder; the agent is
  run-agnostic and never sees the run name), per the project's **Commit format**.
- **Blocker protocol:** follow the same stop-and-report blocker protocol the
  other writer agents follow if a required input is missing or contradictory.

Because this is a project file (not the generic skill), it may reference the
project's own tooling conventions exactly as the sibling agent files do. Match
the length and structure of an existing single-task writer (e.g. `doc-writer.md`)
— do not over-specify.

**Depends on:** Task 1 (the format the agent follows by default; its discipline
must align with `run-summary-format.md`).

**Traces to:**
- R2, R4, R9 / AC1, AC3, AC9 — single-shot artifacts-only writer, no git, full
  run-record grounding, produces all R4 content sections. (Design C3, D3.)

**Acceptance (observable, testable):**
- `agents/run-summary-writer.md` exists with front-matter `name:
  run-summary-writer` and a role body in the house style.
- The body specifies: single-shot/once-per-run; the source list above; no git
  base ref / no diff; follow the resolved format passed in the spawn prompt;
  write/commit `run-summary.md` at the run-folder root per Commit format; the
  blocker protocol.
- The agent never embeds the run name and reads shipped code/docs as files.

---

### Task 9 — Register `run-summary-writer` in the project's Agent models (`.rp.md`)

**Goal:** Give the new agent a model assignment so the orchestrator can resolve
its model when spawning it, exactly as for every other agent.

**Files to change:**
- `.rp.md`

**Changes:**

Add a `run-summary-writer` row to the **Agent models** table. Use a model
consistent with the project's existing writer choices — the other single-shot
*writer* agents that synthesize from artifacts (`spec-writer`, `code-plan-writer`,
`doc-plan-writer`, `design-doc-writer`) run on `opus`; assign `run-summary-writer`
`opus` to match that writer tier. Preserve the table's existing column shape and
ordering convention (place it near the other phase-5 / writer rows).

**Depends on:** Task 8 (the agent must exist to be registered; the row name must
match the agent's `name`).

**Traces to:**
- (Mechanism) the orchestrator resolves the writer's model via the **Agent
  models** convention when launching it (Tasks 3, 5). (Design C3, Dependencies.)

**Acceptance (observable, testable):**
- The **Agent models** table in `.rp.md` has a `run-summary-writer` row.
- The row's agent name exactly matches the `name` in
  `agents/run-summary-writer.md`.

---

### Task 10 — Add a changeset for the release-relevant skill/agent change

**Goal:** Record this release-relevant change in a changeset so the changeset
gate passes and the package version bumps, matching the repo's changeset
convention.

**Files to change:**
- `.changeset/<descriptive-name>.md` (new file)

**Changes:**

Add a changeset that bumps `@automattic/radical-pipelines`. Use a **minor** bump
(this adds a new user-visible capability — a per-run summary artifact and a new
optional convention — consistent with the `minor` bump the `pipeline-reviews`
changeset used for a comparable run-level feature; it is not a breaking change).
Format exactly like the existing `.changeset/pipeline-reviews.md`:

```markdown
---
"@automattic/radical-pipelines": minor
---

<one short paragraph describing the change in user terms: every run now produces
a single run-summary.md at run completion, gated by phase 5; review runs receive
prior runs' summaries as input; the skill ships a default What/Why/How + context
format that a project can override via a new optional convention.>
```

Keep the description to one tight paragraph in the changelog's user-facing voice
(what changed and why it matters), not an implementation list.

**Depends on:** Tasks 1–9 (the changeset describes the whole change). Land it
last.

**Traces to:**
- (Process) release-relevant paths `skills/**` and `agents/**` are touched, so a
  changeset is required by the repo convention. (Verified against
  `.changeset/config.json`.)

**Acceptance (observable, testable):**
- A new `.changeset/*.md` exists with front-matter
  `"@automattic/radical-pipelines": minor` and a one-paragraph user-facing
  description of the run-summary feature.
- The changeset format matches the existing changeset files.

---

## Out of scope (per the spec, restated so no task introduces it)

- **Consuming the artifact** — opening/updating/pushing a PR, etc. No task may
  add PR-description or push behavior; the summary is a generic run artifact.
- **A review gate on the summary's content** — no reviewer, no rejection loop,
  no `run-summary-review-approved.md`. The writer runs once, ungated (Task 4).
- **Editing prior runs' summaries** — no task adds rewrite behavior; immutability
  comes free from the general add-a-sibling-run rule (Task 5 adds no immutability
  sentence).
- **Copying summaries on fork** — no task adds a copy of `run-summary.md` to the
  fork's copy loop; exclusion is structural (Task 6).
- **Application code / runtime / CI** — every task edits Markdown only
  (skill files, the project agent file, `.rp.md`, a changeset).

## Acceptance-criteria coverage map

| AC | Covered by |
| -- | ---------- |
| AC1 (one committed summary per completed run) | Tasks 3, 4 (and 6 for forks) |
| AC2 (no summary ⇒ run not complete) | Task 3 |
| AC3 (summary content: what/why + decisions/rejected/limitations) | Tasks 1, 8 |
| AC4 (review-N receives prior summaries in order) | Task 5 |
| AC5 (prior summaries byte-identical after a later run) | Task 5 (no new rule; general rule) |
| AC6 (project override vs. default format) | Tasks 1, 2 |
| AC7 (name reads as a single run's summary) | Tasks 1, 3 (`run-summary.md` at `<run>/` root) |
| AC8 (no summary copied on fork; fork inheriting 5-docs lands complete) | Task 6 |
| AC9 (format + mechanism reference no git/GitHub/tracker) | Tasks 1, 2, 8 |
