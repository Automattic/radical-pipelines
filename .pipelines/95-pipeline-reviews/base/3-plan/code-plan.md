# Code Plan: Reviews — re-run the whole pipeline as additional runs on the same branch

## Overview

This feature adds **reviews** to Radical Pipelines: a way for the owner to request an
incremental change to a finished, unmerged pipeline and apply it by running the whole phase
flow again (prompt → spec → design doc → plan → code → docs) as an additional **run** layered
on the **same branch and worktree**. The whole feature is realized as edits to the skill's own
markdown (this repository *is* the Radical Pipelines skill): a new **run** layer is inserted
into the artifact-folder model, the prompt format is single-sourced into a new file, a new
distributed `review-pipeline.md` procedure is written, and a small number of existing reference
files, a handful of orchestrator-side workflow lines (the autonomous agent-launch and
phase-subfolder lines and the assisted phase-subfolder line), six agent profiles, and the
project conventions file (`.rp.md`) are updated so the existing machinery — pointed at a per-run
folder — does the rest.

The artifact-folder layout changes from phase folders sitting directly under
`.pipelines/<slug>/` to phase folders sitting under a **run** folder:

```
.pipelines/<slug>/
  base/                              (the original run; base/0-prompt is the issue)
    0-prompt/ … 5-docs/
  review-1-<short-description>/      (the first review; its own prompt)
    0-prompt/ … 5-docs/
  review-2-<short-description>/
    0-prompt/ … 5-docs/
```

`base` is always the first run and is laid down eagerly at pipeline creation. Each review adds a
sibling `review-N-<short-description>` run folder driven by its own new prompt; the original
issue and base prompt are never rewritten. All runs share the one branch and worktree.

The plan is ordered so the two single-source anchors land first — `pipeline-versioning.md` (the
run model, run-aware state, base/-scoped listing/tree, and the reviewer base-ref rule) and the
new `prompt-format.md` (the shared prompt schema and discipline) — because every other file
references them. After the anchors come the files that consume them (`create-pipeline.md`,
`fork-pipeline.md`, `manage-issues.md`, the workflows, `resume-pipeline.md`, the two phase
references), then the new `review-pipeline.md` procedure that ties them together, then the
`work-on-an-issue.md` menu wiring, then the six bounded agent-profile corrections and the
`.rp.md` convention edit.

Throughout, paths use the existing `<artifacts-folder>` placeholder for the pipeline's own
folder (the same thing the spec calls `<pipeline-folder>`); run paths are written
`<artifacts-folder>/<run>/<phase>` (for the base run, `<artifacts-folder>/base/<phase>`). No
file may introduce any instruction, reference, or mention of how to handle a pipeline that
lacks a `base/` folder (legacy flat layout) — the skill stays silent on that shape.

## Tasks

### Task 1: Add the run model, run-aware state, base/-scoped listing & tree, and the reviewer base-ref rule to `pipeline-versioning.md`

- **Goal:** Make `pipeline-versioning.md` the single home for the run layer: define the run
  vocabulary and path shape, rebind the completion predicate to a run folder, make pipeline
  state follow the latest run (including the prompt-only-review case), scope cross-pipeline
  listing and tree reconstruction to each pipeline's `base/` run, add a run-chain rendering
  convention, and introduce the reviewer diff base-ref rule for both base and review runs.
- **Files to change:**
  `skills/radical-pipelines/reference/pipeline-versioning.md`
- **Changes:**
  1. **New `### Runs within a pipeline` subsection** inside the `## Model` section, inserted
     after the Model bullets (after the current line 11, before `### Key concepts`). It must:
     - Define a **run** as one pass of the full phase flow recorded under a pipeline.
     - Name the path shape `<artifacts-folder>/<run>/<phase>`, where `<run>` is `base`,
       `review-1-<short-description>`, `review-2-<short-description>`, … State that
       `<artifacts-folder>` is the pipeline's own folder (the same thing the rest of the skill
       calls the artifact folder).
     - State that `base` is always the first run, always present, and never restructured or
       rewritten by a review; a review only ADDS a sibling run folder.
     - State that `<short-description>` is a kebab-case summary of the review's goal (lowercase,
       hyphens, no spaces), formatted like the pipeline-slug short description, and that `N` in
       `review-N-…` is a per-pipeline monotonic counter — the next integer after the existing
       `review-*` folders.
     - Negate, in one sentence, the four "a run is NOT" items: a run carries no `-v<N>` suffix,
       is not a slug/branch/worktree, and does not change the pipeline version; `base` and every
       review of a pipeline share its one branch and worktree.
     - State that reviews are added one at a time, on top of a complete run (sequential).
  2. **New `### Reviewer base ref` subsection** (placed in or immediately adjacent to the Runs
     subsection, since it is run-boundary knowledge). It must define the diff base ref keyed on
     "the start of the current run", captured once at run start and held constant for the whole
     run:
     - **Review run** → the **tip of the previous run** (`base` or `review-(N-1)`): the branch
       tip at the moment the review run begins, before the review's prompt is committed
       (equivalently, the parent of the review run's first commit, which is the prompt commit).
     - **Base run** → the **merge-base of the pipeline branch and main** (robust against main
       advancing).
     - State that the value is captured once when HEAD is still the prior-run tip and then passed
       unchanged to every code/docs reviewer invocation across all rejection/re-dispatch
       iterations; the diff is always `base-ref → current HEAD`.
  3. **Rebind the completion predicate to a run folder.** Do NOT change the six predicate rows.
     Insert ONE sentence after the predicate table (after the current line 32, before the
     "completed phase / active phase" paragraph) stating that the artifact paths in the table are
     relative to a run folder: a phase's predicate is evaluated at
     `<artifacts-folder>/<run>/<phase>` (for the base run, `<artifacts-folder>/base/<phase>`);
     the rows are unchanged, only their root is the run folder.
  4. **State follows the latest run.** Replace the current "completed phase / active phase"
     paragraph (current line 34) so that a pipeline's **completed phase** and **active phase** are
     those of its **latest run** — the highest-numbered `review-N` run, or `base` if there are no
     reviews — with the completed/active predicate evaluated WITHIN that run's folder. Add a
     follow-on paragraph that carries:
     - The two-notions distinction: overall **pipeline state** (the latest run's phase; drives
       resume) versus **per-run completion** (a run complete through phase 5; gates whether a new
       review may start). These coincide except while a review is in flight.
     - The prompt-only-review case, worded as: when a review run has only its
       `0-prompt/prompt.md` committed, the pipeline's **next phase** is that review's phase 1
       (spec) — its prompt is the input to phase 1, just as the base prompt is for `base`. (By the
       started-artifacts active-phase predicate the run has no active phase yet; resume therefore
       starts phase 1 from the committed prompt, with no rollback.) Use "next phase", NOT "active
       phase = phase 1", keeping "active phase" reserved for started-but-not-complete.
  5. **Base/-scope the lineage SHA path.** Change the `git rev-parse <ref>:<artifacts-folder>/<phase>`
     occurrence in "Deriving lineage from artifact content" (current line 41) to
     `git rev-parse <ref>:<artifacts-folder>/base/<phase>`. Append to the prose (current line 44) a
     clause stating tree SHAs are always computed over the pipeline's `base/` run, and reviews are
     not part of the cross-pipeline tree (lineage is a cross-fork comparison and forks inherit from
     `base/`, so only base phases are comparable).
  6. **Base/-scope the tree reconstruction.** Change the second
     `git rev-parse <ref>:<artifacts-folder>/<phase>` occurrence in "Reconstructing the pipeline
     tree" (current line 63) to `…/base/<phase>`. Update the loop description (current lines 61–62)
     from "each phase folder it carries … (`0-prompt`, `1-spec`, …)" to "each phase folder of its
     `base/` run … (`base/0-prompt`, `base/1-spec`, …)". Update the shared-root sentence (current
     line 66) so `0-prompt` becomes `base/0-prompt`, and add that each pipeline contributes one
     path through the tree from its `base/` run; a pipeline's reviews are not nodes.
  7. **Run-chain rendering convention.** In `### Rendering`, add ONE reading-convention bullet
     (after the `[merged]` bullet, current line 93) stating that a pipeline's runs are reported as
     a linear chain annotated on the pipeline — not as tree nodes:
     `base → review-1-<short-description> → review-2-<short-description> …`, each annotated with its
     own state; the tree positions a pipeline by its `base/` run only; reviews never add or move
     nodes; a pipeline with no reviews shows no run chain. Leave the existing example tree
     (current lines 74–84) unchanged.
- **Depends on:** none
- **Traces to:** R1 (run folders), R4 (a run is not a branch), R5 (legacy silent), R16 (diff
  base ref), R18 (sequential), R20 (state = latest run), R22 (fork tree at branch level), R23
  (forking unchanged). Spec acceptance criteria 1, 2, 8, 9, 10, 11, 12. Design decisions
  "Insert a single run layer…", "State follows the latest run…", "Lineage and the fork tree stay
  at the branch level…", "Introduce the reviewer base-ref derivation…".
- **Acceptance:**
  - A `### Runs within a pipeline` subsection exists under `## Model`, defining a run, the
    `<artifacts-folder>/<run>/<phase>` path shape, `base` as the always-present first run, the
    `review-N-<short-description>` naming with `N` as a per-pipeline monotonic counter, and the
    four "a run is NOT" negations.
  - The completion-predicate table's six rows are textually unchanged; exactly one new sentence
    after the table states the predicate is evaluated at `<artifacts-folder>/<run>/<phase>`.
  - The pipeline-state text reads state from the latest run, distinguishes pipeline state from
    per-run completion, and describes the prompt-only-review case using the phrase "next phase"
    (not "active phase") for phase 1.
  - Both `git rev-parse` lineage/tree paths read `<ref>:<artifacts-folder>/base/<phase>`, and the
    surrounding prose states the tree is built over `base/` only and reviews are not tree nodes.
  - A reviewer base-ref rule is present that resolves a review run to the prior-run tip and a base
    run to the merge-base with main, captured once at run start and held constant.
  - A rendering bullet describes the `base → review-1-… → …` run chain as per-pipeline metadata,
    not nodes.
  - The file contains no instruction, reference, or mention of a pipeline lacking a `base/`
    folder, dual-shape reading, grandfathering, or migration.

### Task 2: Create `prompt-format.md` as the single source of the prompt format

- **Goal:** Create the new shared `prompt-format.md` holding the prompt schema, rendering rules,
  and authoring discipline — the single source of truth the three prompt-authoring sites (issue
  creation, base-prompt generation, review-prompt generation) will reference instead of
  restating. It deliberately contains NO origin-reference hook.
- **Files to change:**
  `skills/radical-pipelines/reference/prompt-format.md` (new)
- **Changes:** Create the file with this structure:
  - **Title** `# The Prompt Format` and one introductory line stating the format describes a
    prompt — whether a tracker issue body, a base prompt, or a review prompt — and that the prompt
    is the input to phase 1.
  - **`## Schema and rendering`** — move here, verbatim in substance, the schema and rendering
    content currently in `manage-issues.md`:
    - The five sections: **Title** (concise), **Goal** (always present; the desired outcome stated
      as an outcome, not a solution, with the existing "Users can export their data as JSON" /
      "add a `format` param to `ExportController`" example), **Constraints** *(optional)*,
      **Context** *(optional)*, **Assumptions / directions to explore** *(optional, labeled open)*.
    - The rendering rule "render these sections and omit any that are empty — no `N/A`
      placeholders".
    - The "A vague idea yields just a Title and a Goal. That is a complete, valid [prompt]."
      sentence (generalized from "issue" to "prompt").
  - **`## Authoring discipline`** — move here, verbatim in substance, the four discipline bullets
    currently in `manage-issues.md`'s `## Constraints`: **Capture, don't converge** (short
    owner-led capture pass, not the spec phase; the `spec-analyst` does the requirements work in
    phase 1); **Lead with the goal, then invite — don't run a checklist**; **No requirements,
    design, or implementation** (acceptance criteria → phase 1, architecture → phase 2, task
    breakdown → phase 3); **Reflect hypotheses back as open** (recorded under Assumptions, not as
    requirements).
  - Do NOT include the tracker-only "Do not write to the tracker until the owner approves" bullet
    (that stays in `manage-issues.md`, Task 4). Do NOT include any Origin/origin-reference hook.
- **Depends on:** none (the prose is self-contained; the actual removal from `manage-issues.md`
  happens in Task 4)
- **Traces to:** R13 (single-sourced prompt format). Spec acceptance criterion 13. Design
  decision "Single-source the prompt format into a new `prompt-format.md`…".
- **Acceptance:**
  - `skills/radical-pipelines/reference/prompt-format.md` exists with a `## Schema and rendering`
    subsection and a `## Authoring discipline` subsection.
  - The schema lists exactly Title, Goal (required), Constraints, Context, Assumptions, with the
    omit-empty / no-`N/A` rendering rule and the "vague idea → Title + Goal" sentence.
  - The authoring discipline contains the four discipline points (capture-don't-converge,
    lead-with-goal, no requirements/design/implementation, hypotheses-as-open).
  - The file contains no origin-reference hook and no tracker-write rule.

### Task 3: Lay `base/` down eagerly in `create-pipeline.md` and point its prompt authoring at `prompt-format.md`

- **Goal:** Make a brand-new pipeline lay its phase 0 under `base/` (so every pipeline carries the
  run layer from creation, never migrated later), and replace the in-file discipline restatement
  with a pointer to `prompt-format.md`.
- **Files to change:**
  `skills/radical-pipelines/reference/create-pipeline.md`
- **Changes:**
  1. **Step 3 (Create the artifact folder, current line 19)** — UNCHANGED; it creates
     `.pipelines/<slug>/` via the **Artifact folder** convention.
  2. **Step 4 (Generate the initial prompt, current line 23)** — replace the current "Create the
     phase 0 subfolder (`0-prompt/`) … Write the prompt to `<artifacts-folder>/0-prompt/prompt.md`."
     with text that: states phase folders live under a run folder and the first run is always
     `base` (cross-referencing "Runs within a pipeline" in `pipeline-versioning.md`); instructs to
     create the `base/` run folder and the phase 0 subfolder under it (`base/0-prompt/`) inside the
     artifact folder; and writes the prompt to `<artifacts-folder>/base/0-prompt/prompt.md`.
  3. **Step 4, first sub-bullet (current line 25)** — KEEP the issue→prompt transform instruction
     ("Adapt the issue content as a prompt directed at the agents…"); this is a base-site-specific
     instruction, not format prose. Reword it so it points the authoring at the shared format —
     e.g. "Adapt the issue content into the phase-0 prompt … following the schema and authoring
     discipline in `prompt-format.md`."
  4. **Step 4, second sub-bullet (current line 26, the discipline restatement "Do not add
     requirements, technical directions, or implementation details…")** — REMOVE it; it is the
     authoring discipline restated and is now covered by the `prompt-format.md` pointer in the
     reworded transform bullet.
  5. **Step 4, asset sub-bullet (current line 27)** — change `<artifacts-folder>/0-prompt/` to
     `<artifacts-folder>/base/0-prompt/` (both occurrences). Keep the self-contained sub-bullet
     (current line 28).
  6. **Step 5 (Commit, current line 32)** — UNCHANGED; it commits whatever was created, now under
     `base/`.
- **Depends on:** Task 1 (the "Runs within a pipeline" subsection it cross-references), Task 2
  (`prompt-format.md` must exist for the pointer to resolve)
- **Traces to:** R2 (eager base), R13 (single-sourced format). Spec acceptance criteria 1, 13.
  Design decisions "Lay `base/` down eagerly at creation…", "Single-source the prompt format…".
- **Acceptance:**
  - Step 4 instructs creation of `base/0-prompt/` and writes the prompt to
    `<artifacts-folder>/base/0-prompt/prompt.md`, cross-referencing "Runs within a pipeline" in
    `pipeline-versioning.md`.
  - The asset sub-bullet references `<artifacts-folder>/base/0-prompt/`.
  - The standalone discipline restatement is gone; the prompt authoring instead points to
    `prompt-format.md` for the schema and discipline.
  - The issue→prompt transform instruction (base-site-specific) is retained.
  - No flat (`<artifacts-folder>/0-prompt/`) path remains in the file.

### Task 4: Collapse the prompt-format prose in `manage-issues.md` to `prompt-format.md` pointers, keep the tracker-only rule, and update the issue↔prompt path

- **Goal:** Remove the duplicated prompt-format prose from `manage-issues.md` (now single-sourced
  in `prompt-format.md`), replacing it with pointers, while keeping the issue-site-specific
  pieces — the issue↔prompt relationship (path updated to `base/0-prompt/`) and the tracker-only
  "don't write until approved" rule.
- **Files to change:**
  `skills/radical-pipelines/reference/manage-issues.md`
- **Changes:**
  1. **`## The issue format` (current lines 12–22)** — keep the issue↔prompt relationship sentence
     (current line 14), updating the path so it reads that `create-pipeline.md` turns the issue into
     `base/0-prompt/prompt.md`. Remove the schema bullets (current lines 16–22) and the embedded
     omit-empty rendering rule. Replace them with a pointer: author the issue using the shared
     schema, rendering rules, and authoring discipline in `prompt-format.md`.
  2. **`## Constraints` (current lines 24–32)** — remove the four discipline bullets (current lines
     28–31, now in `prompt-format.md`). Replace the section body with a pointer that the authoring
     discipline in `prompt-format.md` applies across all steps below. **KEEP** the tracker-only
     bullet (current line 32): "Do not write to the tracker until the owner approves the rendered
     draft." This rule is tracker-specific and must NOT move to `prompt-format.md` (base/review
     prompts are committed to a run folder, not written to a tracker).
  3. **Steps 1–5 (current lines 36–62) and Close out (current lines 64–66)** — UNCHANGED; they name
     Goal/Constraints/etc. by use, not by restatement.
- **Depends on:** Task 2 (`prompt-format.md` must exist for the pointers to resolve)
- **Traces to:** R13 (single-sourced format). Spec acceptance criterion 13. Design decision
  "Single-source the prompt format…".
- **Acceptance:**
  - `manage-issues.md` no longer restates the prompt schema, the omit-empty rendering rule, or the
    four authoring-discipline bullets; instead it points to `prompt-format.md`.
  - The issue↔prompt relationship sentence remains and references `base/0-prompt/prompt.md`.
  - The tracker-only "do not write to the tracker until the owner approves" rule remains in
    `manage-issues.md`.
  - Steps 1–5 and Close out are unchanged.
  - No prompt-format prose is restated in both `manage-issues.md` and `prompt-format.md` (no
    duplication across the two files).

### Task 5: Scope fork-copy to `base/` on source and destination in `fork-pipeline.md`

- **Goal:** Make forking correct and reviews-scoped under the eager-`base/` layout: a fork seeds
  its own `base/` run from the parent's `base/` run (source path now exists), and never inherits
  the parent's reviews.
- **Files to change:**
  `skills/radical-pipelines/reference/fork-pipeline.md`
- **Changes:**
  1. **Step 4 (Create the artifact folder, current line 34)** — append a clause stating the fork's
     phases live under its own `base/` run, seeded from the parent's `base/` run (next step); a
     fork starts a fresh `base/` and never inherits the parent's reviews (cross-reference "Runs
     within a pipeline" in `pipeline-versioning.md`).
  2. **Step 5 intro (current line 38)** — scope the copy to `base/` in prose: copy only the phase
     folders being inherited, from the parent's `base/` run into the new pipeline's `base/` run —
     `base/0-prompt` up to and including the inherited phase agreed in step 1; only `base/` is
     copied, and the parent's `review-*` runs (if any) are never inherited.
  3. **Step 5, worktree-exists bullet (current line 42) — the load-bearing edit.** Add the `base/`
     prefix to BOTH source and destination in the `cp -r` command so it reads
     `cp -r <parent-worktree>/<parent-artifact-folder>/base/<phase> <artifacts-folder>/base/<phase>`,
     and reword the surrounding "for every phase folder `0-prompt`, `1-spec`, …" to iterate the
     parent's `base/` phase folders into the new pipeline's `base/`.
  4. **Step 5, worktree-absent bullet (current line 43)** — change "copy as above" to "copy as
     above (from the parent's `base/` run)".
  5. **Step 7 (Continue, current line 51)** — append "Work continues in the fork's `base/` run."
     for run-layer symmetry with `create-pipeline.md` step 4.
- **Depends on:** Task 1 (the "Runs within a pipeline" subsection it cross-references), Task 3
  (the parent's prompt is at `<parent>/base/0-prompt` only once eager `base/` is in effect — the
  base/-prefixed copy path depends on that being the layout)
- **Traces to:** R23 (forking unchanged — base-only inheritance), R5 (no legacy handling). Spec
  acceptance criterion 12. Design decision "Scope fork-copy to `base/` on both source and
  destination".
- **Acceptance:**
  - The `cp -r` command in step 5 has the `base/` prefix on both the source
    (`<parent-worktree>/<parent-artifact-folder>/base/<phase>`) and the destination
    (`<artifacts-folder>/base/<phase>`).
  - Step 4 and step 5 prose state the fork seeds a fresh `base/` from the parent's `base/` and
    never inherits the parent's reviews.
  - No `review-*` run is copied; only `base/` phase folders are iterated.
  - The file contains no legacy no-`base/` handling.

### Task 6: Bind the agent handoff to the active run's folder in the workflows and add the base-ref capture-at-start note

- **Goal:** Make the orchestrator hand each agent the active run's folder as "the artifact
  folder" (keeping agents run-agnostic with zero behavioral agent edits), make BOTH workflows
  create their phase subfolders inside the active run's folder (the autonomous orchestrator
  creates the subfolder itself before launching the phase agent, and assisted creates it
  directly), and record that the run's base ref is captured at run start before launching the
  phase-4/5 reviewers.
- **Files to change:**
  `skills/radical-pipelines/reference/autonomous-workflow.md`,
  `skills/radical-pipelines/reference/assisted-workflow.md`
- **Changes:**
  1. **`autonomous-workflow.md`, step 5 agent-prompt bullet (current line 60, "**Artifact folder**
     — the absolute and full path to this pipeline's artifact folder.")** — reword to hand the
     agent "the active run's folder (`<artifacts-folder>/<run>/`, e.g. `<artifacts-folder>/base/`);
     this is what the agent treats as its artifact folder; the agent is run-agnostic and never sees
     the run name." This is an orchestrator-facing workflow edit, not an agent-profile edit.
  2. **`autonomous-workflow.md`, step 5 "For each phase" step 1 (current line 48, "Create the phase
     subfolder inside the artifacts folder")** — reword to "Create the phase subfolder inside the
     active run's folder (the artifacts folder for this run)", symmetric with the assisted edit
     (change #4). The autonomous orchestrator creates this subfolder ITSELF before launching the
     phase agent (it is "For each phase" step 1, ahead of "Read its phase reference" and "Run the
     phase"), so this is the load-bearing creation point in autonomous mode and must be bound to the
     run folder so the orchestrator-created "in progress" folder lands at
     `<artifacts-folder>/<run>/<phase>` — aligned with both the run folder the agent is handed
     (change #1) and the run-scoped **Per-phase completion** predicate rebound in Task 1. Leave the
     rest of the line (the "in progress" / completion-predicate wording) unchanged. This is the
     second edit within `autonomous-workflow.md`, not a new file or an agent-profile edit.
  3. **`autonomous-workflow.md`, step 5 (the run-execution section, around current line 35 where the
     health monitor and phase loop are introduced)** — add ONE line that the orchestrator captures
     the run's base ref at run start, per the **Reviewer base ref** rule in `pipeline-versioning.md`,
     before launching the phase-4/5 reviewers, and holds it constant for the whole run. Place it so
     it reads as run-wide setup (alongside or just before the phase loop), not inside a single
     phase's steps.
  4. **`assisted-workflow.md`, step "Execute the phase" (current line 26, "Create the phase
     subfolder inside the artifacts folder")** — reword to "Create the phase subfolder inside the
     active run's folder (the artifacts folder for this run)". This is assisted's only run-binding
     site, since it spawns no agents.
- **Depends on:** Task 1 (the run model and the **Reviewer base ref** rule it references)
- **Traces to:** R2 (phase folders under the run folder — the orchestrator-created subfolder
  lands under the run, not flat), R3 (agents run-agnostic), R16 (diff base ref captured at run
  start), R17 (both modes). Spec acceptance criteria 1, 7, 8. Design decisions "Keep agents
  run-agnostic with zero behavioral agent edits", "Introduce the reviewer base-ref derivation…".
- **Acceptance:**
  - In `autonomous-workflow.md`, the **Artifact folder** agent-prompt bullet hands the agent the
    active run's folder (`<artifacts-folder>/<run>/`) and states the agent never sees the run name.
  - In `autonomous-workflow.md`, the "For each phase" step-1 "Create the phase subfolder" line names
    the active run's folder (the artifacts folder for this run), symmetric with the assisted edit,
    so the orchestrator-created "in progress" folder lands at `<artifacts-folder>/<run>/<phase>`;
    the "in progress" / completion-predicate wording on that line is otherwise unchanged.
  - `autonomous-workflow.md` contains a single base-ref capture-at-start line referencing the
    **Reviewer base ref** rule in `pipeline-versioning.md`, positioned as run-wide setup.
  - In `assisted-workflow.md`, the "Create the phase subfolder" line names the active run's folder.
  - No agent profile file is changed by this task; the only edits are to the two workflow files.

### Task 7: Make `resume-pipeline.md` read and target the latest run

- **Goal:** Scope resume's on-disk state read and its rollback target to the pipeline's latest
  run, so resume operates on the latest run's active phase on the same branch/worktree, while the
  re-attach mechanics stay unchanged (and their headings remain stable for `review-pipeline.md` to
  cite).
- **Files to change:**
  `skills/radical-pipelines/reference/resume-pipeline.md`
- **Changes:**
  1. **Headings 1 and 2 (`### 1. Cancel any leftover health monitor`, `### 2. Re-attach to the
     branch and worktree`)** — UNCHANGED in wording (they are a dependency contract cited by name
     from `review-pipeline.md` in Task 9). Do not rename or renumber them.
  2. **Step 3 (Verify on-disk state, current line 20)** — append a clause that the state is
     confirmed against the **Per-phase completion** predicate in `pipeline-versioning.md`,
     evaluated WITHIN the pipeline's latest run, and that the completed/active-phase artifacts are
     read inside that run's folder. (Pointing the file-reading at the right run folder; state is
     still defined by `pipeline-versioning.md`.)
  3. **Step 4 (Determine the resume point, current line 27)** — insert "the latest run's" before
     "completed phase" so the resume point is "the phase **after** the latest run's completed
     phase". Rollback mechanics (reverting only the active-phase commits) are otherwise unchanged.
- **Depends on:** Task 1 (the latest-run state rule in `pipeline-versioning.md`)
- **Traces to:** R20 (state = latest run), R21 (resume targets the latest run). Spec acceptance
  criteria 9, 10. Design decision "State follows the latest run…", "Recover an abandoned
  prompt-only review via the existing resume flow".
- **Acceptance:**
  - Step 3 states the state read is evaluated within the pipeline's latest run and reads artifacts
    inside that run's folder.
  - Step 4 scopes the resume point to "the latest run's completed phase".
  - The two re-attach headings ("Cancel any leftover health monitor", "Re-attach to the branch and
    worktree") are unchanged in text.
  - The rollback step still reverts only the active phase's commits and never reaches into a prior
    run.

### Task 8: Reference the `pipeline-versioning.md` base-ref rule from the code and docs phase references

- **Goal:** Make the two reviewer-launch sites tell the orchestrator where the diff base ref comes
  from, so a review's code/docs review diffs against the prior run's tip (and a base run against
  the merge-base) symmetrically, with no duplicated derivation and no agent capability added.
- **Files to change:**
  `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`,
  `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`
- **Changes:**
  1. **`4 - code.md`, the `code-reviewer` launch step (step 4, where it passes "the base ref to
     diff against")** — change "the base ref to diff against" to reference the rule, e.g. "the base
     ref to diff against (the start of the current run — see the **Reviewer base ref** rule in
     `pipeline-versioning.md`)".
  2. **`5 - docs.md`, the `doc-reviewer` launch step (step 4, where it passes "the base ref to diff
     against")** — make the identical change so code and docs stay symmetric.
- **Depends on:** Task 1 (the **Reviewer base ref** rule)
- **Traces to:** R16 (diff against prior-run tip; docs symmetric). Spec acceptance criterion 8.
  Design decision "Introduce the reviewer base-ref derivation…".
- **Acceptance:**
  - Both `4 - code.md` and `5 - docs.md` reference the **Reviewer base ref** rule in
    `pipeline-versioning.md` at the point they pass the base ref to the reviewer.
  - Neither file restates the derivation; each only points to the shared rule.
  - The reviewer agents' inputs are otherwise unchanged (they still receive "the base ref to diff
    against").

### Task 9: Write the new `review-pipeline.md` distributed procedure

- **Goal:** Create the new `review-pipeline.md`: a seven-step distributed procedure that gates on
  the two hard preconditions, runs the non-gating advisories, re-attaches by citing resume's named
  sections, creates the run folder, authors and commits the review prompt (with the mandatory
  origin reference), re-asserts the version, and returns to the mode dispatch — delegating to
  existing building blocks rather than re-implementing a run.
- **Files to change:**
  `skills/radical-pipelines/reference/review-pipeline.md` (new)
- **Changes:** Create the file with a title and seven steps. It must DELEGATE (cite the owning
  files) and must NOT restate the prompt format, monitor handling, tracker obligations, or
  re-attach mechanics.
  1. **Step 1 — Confirm review preconditions.** Re-verify BOTH hard gates at the top (not relying
     on the menu, because the direct "review this pipeline" route bypasses the menu):
     - Gate (a) completeness: the pipeline's latest run is complete through phase 5 (predicate
       evaluated within the latest run per `pipeline-versioning.md`). On failure, steer the owner
       to **resume** (`resume-pipeline.md`) to finish it, or **fork** (`fork-pipeline.md`) to try a
       different approach — do not start a review.
     - Gate (b) unmerged: the pipeline is not merged into main (per the merged-state determination
       in `pipeline-versioning.md`, "Listing pipelines for an issue" / the `[merged]` annotation).
       A merged pipeline → handle the requested change as a NEW issue via `manage-issues.md`, not a
       review.
     - State explicitly that these two are the ONLY preconditions and that the fork-vs-review and
       split advisories (next step) never gate a review the owner chooses.
  2. **Step 2 — Advisories (non-gating).** Run the fork-vs-review advisory (if the change is
     drastic — would not layer cleanly onto the existing implementation, reworks the architecture,
     invalidates most existing code, or is "redo this differently" — the orchestrator MAY recommend
     a fork via `fork-pipeline.md`; advisory only, the owner decides, the orchestrator never
     unilaterally redirects). Run the split advisory (if several apparently unrelated changes are
     surfaced at once, MAY suggest splitting into separate sequential reviews — one per change).
     Confirm the final count and boundaries with the owner BEFORE creating any run folder. State
     that an accepted fork diverts to `fork-pipeline.md` entirely. Reviews run strictly
     sequentially.
  3. **Step 3 — Re-attach to the branch and worktree, and capture the base ref.** Cite resume's
     two named sections BY NAME: "Cancel any leftover health monitor" and "Re-attach to the branch
     and worktree" (`resume-pipeline.md`). Explicitly DO NOT perform resume's rollback step — the
     latest run is already complete, so there is nothing to roll back — and NEVER create a new
     branch. While HEAD is still the prior-run tip (before the review prompt is committed), capture
     the review's base ref = the prior-run tip, per the **Reviewer base ref** rule in
     `pipeline-versioning.md`.
  4. **Step 4 — Determine and create the run folder.** Determine the run name
     `review-N-<short-description>` per the **Runs within a pipeline** rule in
     `pipeline-versioning.md` (N = next integer after existing `review-*`; `<short-description>` =
     kebab-case summary of the review goal) and create it as a sibling of `base/`. Do not restate
     the naming rule; cite it.
  5. **Step 5 — Author and commit the review prompt.** Author the review prompt at
     `review-N-<short-description>/0-prompt/prompt.md`, the same way the base prompt is
     orchestrator-authored (the `create-pipeline.md` step-4 pattern), following the schema and
     authoring discipline in `prompt-format.md` (do NOT restate the format). Add the review-only
     requirements specified here, NOT in the shared schema:
     - An **Origin** section, MANDATORY for reviews, that is **self-contained**: it carries the
       substance of the request (a direct quote or faithful paraphrase of the owner's change,
       GitHub comment, or PR review) PLUS a convenience link, so a later phase reading only the
       review prompt understands what prompted it without following the link.
     - Any source assets (e.g. images from the source) are placed in THIS review run's
       `0-prompt/` folder and referenced relatively, the same as issue/base prompts.
     - State that the Origin section is unique to reviews and absent from issue/base prompts.
     - The original issue and `base/0-prompt` are never rewritten.
     Then commit the review prompt per the **Commit format** convention.
  6. **Step 6 — Re-assert the version.** Re-assert (confirm, do not change) the existing `v<N>`
     version label per `pipeline-versioning.md` ("Model") — same branch, same pipeline, so the
     version is unchanged.
  7. **Step 7 — Return to mode dispatch, and apply run obligations.** Return to
     `work-on-an-issue.md` step 3 to pick the mode and dispatch the chosen workflow for phases 1–5;
     the review prompt is phase 0 and is mode-independent; phases run in the review run folder. Note
     that an assisted review advances only through phase 3, so an assisted-only review is itself
     incomplete and cannot satisfy the completeness precondition for a later review until finished
     autonomously through phases 4–5. Carry the generic R27 obligations pointer (do NOT name
     Linear/push/version specifics): a review is a normal run — apply every orchestrator-update
     obligation the project's conventions define for a run, fired afresh for this review run
     (run-start and run-end actions for every outcome; any per-phase or per-run progress restarted
     to reflect this review's phases rather than continuing the prior run's); the review operates on
     the pipeline's existing tracker issue and creates no new one; if the project runs a health
     monitor, an autonomous review follows the normal monitor lifecycle (cancel any leftover
     monitor, launch a fresh one) pointed at this review run's folder with the pipeline slug and
     team unchanged, and an assisted review launches no monitor.
  - End the file like resume does: "Return to `work-on-an-issue.md`."
  - Do NOT add any "prompt-only review resumes at phase 1" recovery note — recovery is resume's
    job and rides on the state rule; this file is about STARTING a review.
- **Depends on:** Task 1 (Runs subsection, latest-run state, merged-state, base-ref rule), Task 2
  (`prompt-format.md`), Task 7 (resume's named re-attach sections it cites; resume's latest-run
  scoping for the recovery path), and references `create-pipeline.md`, `fork-pipeline.md`,
  `manage-issues.md`, `work-on-an-issue.md`
- **Traces to:** R6 (single entry point), R7 (completeness gate), R8 (same branch / re-attach),
  R9 (unmerged gate), R10 (own new prompt), R11 (orchestrator authors), R12 (origin reference),
  R17 (both modes), R18 (sequential), R19 (split advisory), R24 (fork-vs-review advisory), R25
  (decision rule — referenced; the rule block itself is Task 10), R26 (advisories never gate),
  R27 (review = normal run), R28 (version unchanged), R29 (wire Review, distributed). Spec
  acceptance criteria 2, 3, 4, 5, 6, 14, 15, 16. Design decisions "Make `review-pipeline.md` a
  distributed procedure…", "Re-verify both hard gates…", "Run advisories before re-attach…",
  "Re-attach by citing resume's named sections", "A review is a normal run…".
- **Acceptance:**
  - `skills/radical-pipelines/reference/review-pipeline.md` exists with seven ordered steps in the
    sequence: preconditions → advisories → re-attach (+ base-ref capture) → create run folder →
    author+commit review prompt → re-assert version → return to mode dispatch.
  - Step 1 re-checks both completeness and unmerged gates, steers to resume/fork on completeness
    failure and to a new issue on merged, and states these are the only preconditions.
  - Step 2 runs the fork-vs-review and split advisories as non-gating, confirms count/boundaries
    before creating any run folder.
  - Step 3 cites resume's two re-attach headings by name, explicitly skips rollback, never creates
    a branch, and captures the prior-run-tip base ref before the prompt commit.
  - Step 5 authors the prompt at `review-N-<short-description>/0-prompt/prompt.md` via a
    `prompt-format.md` pointer (not a restatement) and specifies a mandatory, self-contained Origin
    section plus the review-source asset-placement rule, noting Origin is review-only.
  - Step 6 re-asserts (does not change) the version; Step 7 returns to `work-on-an-issue.md`
    step 3, notes the assisted-only incompleteness, and carries the generic R27 obligations pointer
    (no Linear/push/version specifics) including the existing-issue / no-new-issue and monitor
    lifecycle statements.
  - The file does not restate the prompt-format schema, the re-attach mechanics, monitor handling,
    or concrete tracker obligations — it cites the owning files.
  - The file contains no legacy no-`base/` handling and no recovery note.

### Task 10: Wire the Review menu action and insert the RESUME / REVIEW / FORK decision rule in `work-on-an-issue.md`

- **Goal:** Make the previously dangling Review action live (now that `review-pipeline.md` exists)
  by making its return-to-dispatch flow legible, and add a decision-rule block so an unsure owner
  can choose among resume, review, and fork — without removing or breaking the sibling Merge and
  Close actions.
- **Files to change:**
  `skills/radical-pipelines/reference/work-on-an-issue.md`
- **Changes:**
  1. **Review menu bullet (current line 34, "**Review** read `review-pipeline.md`.")** — append
     "then continue to step 3" so it mirrors the Resume and Fork bullets (current lines 30–31) and
     makes the post-review return-to-step-3 flow legible. No other text change is needed (the file
     now exists, so the reference is live).
  2. **Merge bullet (current line 33) and Close bullet (current line 35)** — UNCHANGED. They keep
     no "continue to step 3" (correctly signaling they are terminal/dangling, out of scope), and
     their target files stay absent.
  3. **Insert a RESUME / REVIEW / FORK decision-rule block** after the menu (after current line 35),
     at the **top-level bullet indent** — a sibling of the always-offered Resume and Fork bullets,
     NOT nested inside the phase-5-only sub-block that contains Review/Merge/Close — so it can
     reference all three same-issue actions. Phrase it as a "when the owner is unsure, apply this
     rule" block:
     - **Resume** = finish an incomplete latest run, same branch.
     - **Review** = layer an incremental change on a complete run, same branch, build on existing
       code.
     - **Fork** = diverge onto a fresh branch from main.
     - State the sharpest discriminator: same-branch-build-on-existing (review) vs.
       new-branch-from-main-diverge (fork); resume is the option for an incomplete run.
- **Depends on:** Task 9 (`review-pipeline.md` must exist for the Review action to be live)
- **Traces to:** R6 (single entry point), R25 (RESUME/REVIEW/FORK decision rule), R29 (wire
  Review, distributed; don't break Merge/Close). Spec acceptance criterion 16. Design decisions
  "Make `review-pipeline.md` a distributed procedure…", "Menu and decision rule (entry points)".
- **Acceptance:**
  - The Review bullet reads `review-pipeline.md` then continues to step 3.
  - The Merge and Close bullets are present and textually unchanged (still unwired, not broken).
  - A RESUME / REVIEW / FORK decision-rule block exists at the top-level bullet indent (not nested
    in the phase-5 sub-block) with the three definitions and the same-branch-build-on-existing vs.
    new-branch-from-main discriminator.

### Task 11: Apply the bounded "per pipeline" → "in this artifact folder" correction to the six reviewer agent profiles

- **Goal:** Correct a now-false factual statement in the six reviewer profiles: under reviews the
  approved file is one per RUN, not one per pipeline, so the parenthetical "only one ever exists
  per pipeline" is false at the pipeline level. Substitute the only noun the agent already knows
  (its handed folder), keeping agent behavior, inputs, outputs, and role unchanged and avoiding
  leaking the run concept into agent vocabulary.
- **Files to change:**
  `agents/spec-reviewer.md`, `agents/design-doc-reviewer.md`, `agents/code-plan-reviewer.md`,
  `agents/doc-plan-reviewer.md`, `agents/code-reviewer.md`, `agents/doc-reviewer.md`
- **Changes:** In each of the six files, in the **Approved** bullet that writes the
  `…-review-approved.md` file, change the trailing parenthetical "(no number; only one ever exists
  **per pipeline**)" to "(no number; only one ever exists **in this artifact folder**)". This is
  the identical two-word substitution in all six; make no other change. Do NOT use "per run" (that
  would leak the run concept into the agent's vocabulary). Specifically:
  - `agents/spec-reviewer.md` (the `1-spec/spec-review-approved.md` bullet, current line 34)
  - `agents/design-doc-reviewer.md` (the `2-design-doc/design-doc-review-approved.md` bullet,
    current line 36)
  - `agents/code-plan-reviewer.md` (the `3-plan/code-plan-review-approved.md` bullet, current
    line 38)
  - `agents/doc-plan-reviewer.md` (the `3-plan/doc-plan-review-approved.md` bullet, current
    line 39)
  - `agents/code-reviewer.md` (the `4-code/code-review-approved.md` bullet, current line 43)
  - `agents/doc-reviewer.md` (the `5-docs/docs-review-approved.md` bullet, current line 44)
  Leave the rejection-count wording (folder-scoped, self-correcting) and every other line in
  these profiles untouched.
- **Depends on:** none
- **Traces to:** R3 (agents run-agnostic — corrected without leaking the run concept). Spec
  acceptance criterion 7. Design decision "Keep agents run-agnostic with zero behavioral agent
  edits" (reported honestly as "very nearly so": six bounded two-word corrections).
- **Acceptance:**
  - All six reviewer profiles read "(no number; only one ever exists in this artifact folder)" in
    their Approved bullet; none reads "per pipeline".
  - None of the six uses the phrase "per run".
  - No other line in any of the six profiles is changed; no other agent profile is changed.

### Task 12: Add "or reviewing" to the version-label trigger and the review status-ladder note in `.rp.md`

- **Goal:** Make the project conventions treat a review as a normal run: the version label is
  re-asserted when reviewing (the one required edit), and clarify that a review's per-phase status
  re-cycles from `1 - Spec` (not `0 - Prompt`).
- **Files to change:**
  `.rp.md`
- **Changes:**
  1. **Version-label bullet (under "Orchestrator updates during a run", the "**Pipeline version
     label**" bullet, current line 36)** — change the trigger list "when starting work on a pipeline
     (creating, resuming, or forking)" to "(creating, resuming, forking, or reviewing)". This is the
     one required `.rp.md` edit; it makes a review re-assert (confirm, not change) the version.
  2. **Per-phase status bullet ("**When a phase finishes**", current line 35)** — append a
     one-sentence clarity note: for a review run, the status re-cycles from `1 - Spec` through
     `5 - Docs` as the review's phases complete; `0 - Prompt` is set only when the pipeline is first
     created, not on a review's prompt.
  3. Leave the run-start `running…` label, run-end label removal, push-at-close-out, and the
     "applies to both autonomous and assisted runs" lines UNCHANGED — they already re-fire correctly
     for a review because they are run-scoped.
- **Depends on:** none (it is a project-convention edit independent of the skill anchors; it pairs
  with Task 9's generic R27 pointer but does not require it to land first)
- **Traces to:** R27 (review behaves like a normal run), R28 (version unchanged — re-asserted).
  Spec acceptance criterion 14. Design decision "A review is a normal run for tracker/monitor/
  version obligations".
- **Acceptance:**
  - The version-label trigger list in `.rp.md` includes "reviewing".
  - The per-phase status bullet carries the one-sentence note that a review's status re-cycles from
    `1 - Spec` and that `0 - Prompt` fires only at pipeline creation.
  - The run-start/run-end/push/both-modes lines are unchanged.

## Cross-cutting acceptance (verify after all tasks)

These are whole-feature consistency checks a reviewer can run once all tasks land. They do not
add scope; they confirm the tasks above compose correctly.

- **No prompt-format duplication (R13 / acceptance 13).** The prompt schema, the omit-empty
  rendering rule, and the four authoring-discipline points appear in exactly one place
  (`prompt-format.md`). `manage-issues.md`, `create-pipeline.md`, and `review-pipeline.md` each
  only POINT to it; no two of them restate the same format prose.
- **All new cross-references resolve.** Every `pipeline-versioning.md` section name cited
  elsewhere ("Runs within a pipeline", "Reviewer base ref", "Per-phase completion", "Model",
  "Listing pipelines for an issue") exists with that heading; `prompt-format.md` and
  `review-pipeline.md` exist; `review-pipeline.md`'s citations of resume's two re-attach headings
  match the headings in `resume-pipeline.md` verbatim.
- **The Review hook is wired and Merge/Close are intact (R29 / acceptance 16).**
  `work-on-an-issue.md` routes Review to `review-pipeline.md` and continues to step 3; the Merge
  and Close bullets are still present and unchanged; `merge-pipeline.md` and `close-pipeline.md`
  remain absent (dangling, unbroken).
- **The skill stays silent on the legacy no-`base/` shape (R5 / acceptance 17).** No file under
  `skills/radical-pipelines/` or in the six edited agent profiles or `.rp.md` mentions a pipeline
  lacking a `base/` folder, dual-shape reading, grandfathering, or migration of flat pipelines.
- **Agents stay run-agnostic (R3 / acceptance 7).** No agent profile names a run, says "per run",
  or constructs the artifact-folder path; the only agent-profile edits are the six bounded
  "per pipeline" → "in this artifact folder" corrections; the run binding lives only on the
  orchestrator side (the workflow lines edited in Task 6).
- **Base path is consistent everywhere (R2).** Every phase-0 / inherited-phase path that used to
  read `<artifacts-folder>/<phase>` for creation/fork now reads `<artifacts-folder>/base/<phase>`;
  no flat creation/fork path remains in `create-pipeline.md` or `fork-pipeline.md`. Both workflows'
  phase-subfolder-creation steps (`autonomous-workflow.md` "For each phase" step 1 and
  `assisted-workflow.md` "Execute the phase") name the active run's folder, so the orchestrator
  never creates a flat `<artifacts-folder>/<phase>` folder at the pipeline level.
