# Design Doc Research: Reviews — re-run the whole pipeline as additional runs on the same branch

Running design record for issue #95. Source of truth for requirements: `../1-spec/spec.md`.

This skill IS Radical Pipelines; the feature extends the skill's own markdown procedures
(`skills/radical-pipelines/**`), agent profiles (`agents/**`), and the project conventions
file (`.rp.md`). Most decisions are about how to structure that markdown, plus git /
worktree / run-folder mechanics.

## Grounding: current skill structure (read 2026-06-09)

Live tree (worktree root `.../95-pipeline-reviews`):

- `skills/radical-pipelines/SKILL.md` — overview, phases table, entry-points table
  (Work on an issue → `work-on-an-issue.md`; Manage issues → `manage-issues.md`).
- `skills/radical-pipelines/reference/`
  - `work-on-an-issue.md` — the single entry point. Step 2 surfaces existing pipelines and
    branches to RESUME / FORK / (when phase 5 complete, no active phase) MERGE / REVIEW /
    CLOSE. **`review-pipeline.md` is referenced here (line 34) but does NOT exist yet** —
    this is the dangling hook (R6, R29). Merge/Close also dangle (out of scope; must not break).
  - `create-pipeline.md` — phase-0 creation: slug, worktree, artifact folder, write
    `0-prompt/prompt.md`, commit. Step 4 ("Generate the initial prompt") adapts the issue
    into the prompt but does NOT restate the prompt-format schema.
  - `resume-pipeline.md` — cancel monitor, re-attach branch/worktree, verify on-disk state
    vs completion predicate, roll back partial active phase. The re-attach logic R8 reuses.
  - `fork-pipeline.md` — new branch from main, seed inherited phase folders from parent,
    commit, continue. Operates at `<artifacts-folder>/<phase>` granularity (no run layer).
  - `pipeline-versioning.md` — THE central file for R20–R22. Defines: version model
    (v1 implicit, `-v<N>` suffix); **Per-phase completion** predicate table (phase →
    required committed artifacts); "Listing pipelines for an issue"; "Reconstructing the
    pipeline tree" (trie over per-phase tree SHAs, `0-prompt` = shared root); rendering.
    All keyed on `<artifacts-folder>/<phase>` — the run layer must be inserted here.
  - `manage-issues.md` — **the prompt-format prose lives here** ("The issue format" +
    "Constraints" sections): Title/Goal/Constraints/Context/Assumptions schema, omit-empty
    rendering, capture-don't-converge / outcome-not-solution / hypotheses-as-open discipline.
    "The issue body _is_ the phase-0 prompt." This is R13's single source today.
  - `autonomous-workflow.md` — collects run plan (next/target/per-phase decisions), launches
    health monitor, runs phases 1–5, handles blockers, closes out (stop monitor).
  - `assisted-workflow.md` — drives one phase directly; phases 4–5 "Can't be run in assisted
    workflow" (R17 assisted-only ⇒ incomplete).
  - `autonomous-phases/{1 spec … 5 docs}.md`, `assisted-phases/{1 spec, 2 design-doc, 3 plan}.md`
    — per-phase procedures. Code (4) and Docs (5) phases launch the reviewer "with … the
    base ref to diff against" (R16). **The skill never states HOW the orchestrator computes
    that base ref for a normal run** — it is just passed. (Confirmed: grep finds no base-ref
    computation rule anywhere.)
  - `health-monitoring.md` — monitor lifecycle; loop prompt template names
    `<artifact-folder>` and `team <pipeline-slug>` (R27 monitor re-point).
  - `conventions/{load,pi,claude-code,setup}.md` — convention loading + tool-specific rules.
- `agents/*.md` — 17 agent profiles. `code-reviewer.md` / `doc-reviewer.md` read "the base
  ref to diff against" from the orchestrator's launch prompt (R16: capability already exists).
- `.rp.md` — THIS project's conventions, incl. "Orchestrator updates during a run"
  (run-start `running…` label, run-end label removal, push-at-close-out, per-phase Linear
  status, version label) — these are the R27 run obligations for this project.

Key path note: spec task brief referenced `skills/radical-pipelines/skills/radical-pipelines/…`
but the real tree is single-nested: `skills/radical-pipelines/reference/…`.

## Design topics (open questions to resolve)

The spec pre-decides the OUTCOMES (R1–R29) but explicitly leaves several MECHANISM choices
to design. Each topic below is resolved via Q&A with `design-doc-researcher`, then locked.

- **T1. Run-layer insertion in `pipeline-versioning.md`** — how `<run>` is threaded through
  the artifact-folder model, completion predicate, listing, and tree reconstruction so that
  state follows the latest run (R20) and reviews are run metadata, not tree nodes (R22).
- **T2. Where the run abstraction is defined / named** — new section vs new file; the
  `<pipeline-folder>/<run>/<phase>` vocabulary and the "the artifact folder handed to agents
  is the per-run folder" framing (R3) that keeps agents run-agnostic.
- **T3. `create-pipeline.md` eager-base change** — minimal edit so new pipelines lay phases
  under `base/` (R2) without restructuring later.
- **T4. The `review-pipeline.md` procedure** — its steps (precondition checks R7/R9, advisories
  R19/R24, re-attach R8, author review prompt R10–R12, create run folder, dispatch mode R17,
  run obligations R27, version re-assert R28), and how it is distributed across existing
  building blocks rather than monolithic (R29). Includes the RESUME/REVIEW/FORK decision rule
  (R25) and where it lives in `work-on-an-issue.md`.
- **T5. Prompt-format single-sourcing (R13)** — extract the schema/rendering/discipline out of
  `manage-issues.md` into a shared location referenced by issue creation, base-prompt
  generation (`create-pipeline.md`), and review-prompt generation (`review-pipeline.md`);
  plus the review-only origin reference (R12). One file vs split is open.
- **T6. Base-ref for the diff (R16)** — what "tip of the previous run" resolves to in git
  terms, who computes it, and where that instruction is written so it reaches the code/docs
  reviewers — given the skill currently never states base-ref computation at all.
- **T7. Run-aware state across workflows** — how `autonomous-workflow.md` /
  `assisted-workflow.md` / `resume-pipeline.md` learn that "the artifact folder" is now a
  per-run folder, and how the latest-run selection (R20) and resume target (R21) are phrased.
- **T8. Run obligations & monitor for a review (R27)** — confirming the `.rp.md` obligations
  re-fire per review run and the monitor re-points to the review run folder, with slug/team
  unchanged; how much of this is generic-skill text vs project-convention text.
- **T9. Abandoned prompt-only review run recovery (R20/R21)** — resume-from-prompt vs removal
  for a review run that has only `0-prompt/prompt.md`.

## Decisions

### T1 — Run layer in `pipeline-versioning.md` (R4, R5, R20, R22, R23)

Decided 2026-06-09 with researcher. Smallest self-consistent edit set; all edits assume
`base/` always exists (R2) and never mention a no-`base/` shape (R5).

- **Placeholder convention (resolved open choice a):** use the SINGLE existing placeholder
  `<artifacts-folder>` everywhere; run paths are written `<artifacts-folder>/<run>/<phase>`
  (for the base run, `<artifacts-folder>/base/<phase>`). `<pipeline-folder>` (spec's term in
  R1/R20) and `<artifacts-folder>` (the skill's term everywhere) denote the same thing — the
  pipeline's own folder; the design doc states this once and the skill uses `<artifacts-folder>`
  for consistency with `autonomous-workflow.md` and all phase files.

- **T1.1 Vocabulary anchor.** Add a `### Runs within a pipeline` subsection to the existing
  `## Model` section, inserted between the Model bullets (ends line 11) and `### Key concepts`
  (line 13). It defines a run as one pass of the full phase flow recorded under a pipeline,
  names the path shape `<artifacts-folder>/<run>/<phase>`, states `base` is always the first
  run and later runs are `review-N-<short-description>` (N = next after existing `review-*`;
  kebab-case short description), and negates the four "a run is NOT" items in one sentence:
  carries no `-v<N>` suffix, is not a branch or worktree, does not change the version; `base`
  and every review share the one branch/worktree; reviews added one at a time on top of a
  complete run (R4, R18). "Run" is not new vocabulary — `conventions/setup.md:101` ("one
  folder per pipeline run") and `SKILL.md:19` ("at the start of each run") already use it.

- **T1.2 Per-phase completion (R20).** Do NOT edit the six predicate rows. Insert ONE sentence
  after the table (after line 32, before the "completed/active phase" paragraph) rebinding the
  table's root: the artifact paths are relative to a run folder; a phase's predicate is
  evaluated at `<artifacts-folder>/<run>/<phase>` (base run: `<artifacts-folder>/base/<phase>`);
  rows unchanged, only their root is the run folder.

- **T1.3 Pipeline state = latest run (R20).** Replace the line-34 "completed/active phase"
  paragraph so state is read from the **latest run** — the highest-numbered `review-N` run, or
  `base` if none — with completed/active phase evaluated WITHIN that run's folder. Append a
  follow-on paragraph carrying: the two-notions distinction (pipeline state drives resume;
  per-run completion = a run complete through phase 5, gates whether a new review may start,
  R7) and the prompt-only-review case (a review run with only `0-prompt/prompt.md` is already
  the latest run; pipeline active phase = that review's phase 1, prompt is the phase-1 input).

- **T1.4 Listing & tree stay at branch level (R22, R23).** The trie is built ONLY over each
  pipeline's `base/` run:
  - 4a. Both `git rev-parse <ref>:<artifacts-folder>/<phase>` occurrences (lines 41, 63) →
    `<ref>:<artifacts-folder>/base/<phase>`. Append to the line-44 prose a clause: tree SHAs
    are always computed over the pipeline's `base/` run; reviews are not part of the
    cross-pipeline tree. (Why `base/`: lineage is a cross-fork comparison and forks inherit
    from `base/`, R23, so only base phases are comparable.)
  - 4b. Loop description (lines 61–62) "each phase folder it carries … (`0-prompt`, `1-spec`,
    …)" → "each phase folder of its `base/` run … (`base/0-prompt`, `base/1-spec`, …)". The
    line-66 shared-root sentence: `0-prompt` → `base/0-prompt`, plus "Each pipeline contributes
    one path through the tree from its `base/` run; a pipeline's reviews are not nodes."
  - 4c. Rendering: add ONE reading-convention bullet (after the `[merged]` bullet, line 93)
    stating runs are reported as a linear chain annotated on the pipeline, not as nodes:
    `base → review-1-<short-description> → review-2-<short-description> …`, each with its own
    state; the tree positions a pipeline by its `base/` run only; reviews never add/move nodes;
    a pipeline with no reviews shows no run chain. (Satisfies acceptance criterion 11.)
  - **Worked example (resolved open choice b):** LEAVE the existing example tree (lines 74–84)
    unchanged — it shows no reviews and the new bullet already demonstrates the chain syntax
    concretely. Avoids bloat; reversible doc choice the writer may revisit.

- **T1.5 R5 silence — confirmed.** No edit introduces dual-shape/grandfathering/no-`base`
  language. The flat shape was only ever IMPLICIT in the SHA paths (no named "flat layout"
  prose exists), so 4a simply moves from flat-only to base-only and the flat layout stops
  being mentioned — exactly R5's "stays silent." Leave untouched: line 44's "merged,
  branch-deleted pipeline" (about merge state, orthogonal to runs; R9-consistent). Add NO text
  about forking from a reviewed run (out of scope, R23) — the tree reads `base/` only, full stop.

**Edit-site summary for `pipeline-versioning.md`:** (1) new `### Runs within a pipeline` after
line 11; (2) one rebinding sentence after line 32; (3) replace line 34 + one follow-on
paragraph; (4) paths at lines 41/63 → `/base/`, clause at line 44, loop wording at lines 61–62,
shared-root at line 66, one new Rendering bullet after line 93. No legacy text anywhere.

### T2 — Agents stay run-agnostic; the run-agnostic contract has one home (R3)

Decided 2026-06-09 with researcher (full survey of all 17 `agents/*.md` + both workflow files).

- **R3 holds with ZERO agent-profile edits — verified.** No agent constructs/derives the
  artifact-folder path (`grep` for `.pipelines`, `<slug>`, "pipeline folder", "directly under"
  across `agents/` → zero matches). Every one of the 17 profiles treats `<artifacts-folder>` as
  an opaque absolute path it is GIVEN and only ever appends `/<phase>/<file>`. Handing an agent
  `.../<slug>/base/` instead of `.../<slug>/` therefore Just Works — it reads/writes
  `.../<slug>/base/<phase>/...`. The agent never needs to know the last segment is a run.

- **The run-agnostic contract is single-homed, split by role:**
  - DEFINE the run concept + path shape `<artifacts-folder>/<run>/<phase>` ONCE in
    `pipeline-versioning.md`'s new `### Runs within a pipeline` subsection (T1.1).
  - BIND it to the agent handoff with a MINIMAL edit to the ONE existing orchestrator line
    `autonomous-workflow.md:60`: "the absolute and full path to this pipeline's artifact folder"
    → "the absolute and full path to the **active run's folder** (`<artifacts-folder>/<run>/`,
    e.g. `<artifacts-folder>/base/`); this is what the agent treats as its artifact folder; the
    agent is run-agnostic and never sees the run name." This is an ORCHESTRATOR-facing workflow
    edit, NOT an agent-profile edit — so it does not violate R3. R3 needs this ONE orchestrator
    line touched and ZERO agent profiles touched.
  - This line is also the ONLY spot in the skill where `<artifacts-folder>` is used in two
    senses at once (reads literally as pipeline-folder, but its purpose is to give the agent its
    phase-container) — the one-word disambiguation resolves it and prevents mis-routing.

- **Assisted mode needs no handoff edit** — it spawns no agents (`assisted-workflow.md:3`); the
  orchestrator writes artifacts itself. Once "the artifacts folder" means the run folder (via
  pipeline-versioning.md), `assisted-workflow.md:26` ("Create the phase subfolder inside the
  artifacts folder") naturally writes to `<run>/<phase>`. OPTIONAL belt-and-suspenders: a
  parenthetical "(the active run's folder)" at line 26 mirroring the autonomous edit. **Decision:
  add the parenthetical** — it is one phrase, costs nothing, and removes any doubt for the
  assisted path where the orchestrator (not an agent) must place files in the run folder.

- **Dual-sense audit (orchestrator-facing pipeline-folder uses of `<artifacts-folder>` that
  combine with a phase, handled by other topics):** `pipeline-versioning.md:16,41,44,52,63`
  (T1); `fork-pipeline.md:42` copy loop `<...>/<phase> → <artifacts-folder>/<phase>` must become
  `/base/<phase>` (→ T3 fork scope, R2/R23); `create-pipeline.md:23` `0-prompt` → `base/0-prompt`
  (→ T3, R2); `health-monitoring.md:26` "reads from the artifact folder" → review run's folder
  (→ T8, R27). `conventions/setup.md:101` ("one folder per pipeline run") is already run-aware.

- **Cross-topic flag carried forward:** the code/doc reviewers already take the diff base as a
  launch-prompt INPUT (`code-reviewer.md:14,19`; `doc-reviewer.md:14,20`), so R16 is also a
  zero-agent-edit change — the orchestrator just passes a different base ref (→ T6).

- **RESOLVED — the "per pipeline" reviewer phrasing: option (B), six surgical edits.** Six
  reviewer profiles say the approved file is "(no number; only one ever exists **per pipeline**)".
  Under reviews it is one-per-RUN, so the literal words are now false at the pipeline level
  (`base/1-spec/spec-review-approved.md` AND `review-1/1-spec/spec-review-approved.md` both exist
  for one pipeline). **Decision:** correct the trailing parenthetical in all six —
  `per pipeline` → **`in this artifact folder`** (identical substitution in all six). Lines:
  `spec-reviewer.md:34`, `design-doc-reviewer.md:36`, `code-plan-reviewer.md:38`,
  `doc-plan-reviewer.md:39`, `code-reviewer.md:43`, `doc-reviewer.md:44`.
  - **Phrasing rationale (key insight):** use "in this artifact folder", NOT "per run". "Per
    run" would leak the run concept into the agent's vocabulary, violating R3's core property
    ("agents neither know nor care whether it is `base` or `review-N`"). "In this artifact
    folder" states the same scope using the only noun the agent already knows (the folder it was
    handed) — the most R3-faithful wording.
  - **Why (B) does NOT violate R3/R29 "no agent profile is rewritten":** R3 protects the agent's
    BEHAVIOR/ROLE — its inputs, procedure, outputs. This is a two-word factual correction inside
    a parenthetical aside; the agent still writes exactly one approved file in its handed folder
    by the same procedure. It corrects a statement of fact about the world, not the agent's
    definition — squarely "very nearly so." (A) would leave a now-false statement in the skill
    and force a longer explanatory note in the design doc; (B) is self-documenting and aligns
    with R13's spirit of internal truthfulness. So the design doc states: **reviews touch six
    agent profiles with a single bounded two-word substitution each (behavior-preserving); no
    agent's inputs, procedure, outputs, or role change.**

- **Deeper agent-wording survey — these are the COMPLETE set; nothing else needs touching:**
  - Rejection-count wording in four reviewers ("count existing `<artifact>-review-*-rejected.md`
    files and add 1; starts at 1 if none" — `spec-reviewer.md:33`, `design-doc-reviewer.md:35`,
    `code-plan-reviewer.md:37`, `doc-plan-reviewer.md:38`) is FOLDER-scoped, so it self-corrects:
    `review-1`'s rejection count starts at 1 again, independent of `base` — exactly R20's
    "per-phase progress restarts for the review." LEAVE untouched. (code/doc reviewers take N
    from the launch prompt — also fine.)
  - "Sweep the entire codebase / repository end-to-end" (`doc-plan-writer.md:63`) is
    WORKTREE-scoped, not artifact-folder-scoped; under a review the worktree already carries the
    prior runs' code/docs, so this is exactly what makes a review BUILD ON existing work (R15).
    LEAVE untouched — touching it would be wrong.
  - No other pipeline-absolute or greenfield-assuming wording exists in any agent (grep: exactly
    six "per pipeline" matches, no "first pipeline"/"from scratch"/"empty tree" in agents).

**Net for T2:** R3 holds with the agents' BEHAVIOR untouched. Reviews touch ONE orchestrator
workflow line (`autonomous-workflow.md:60`) + one optional assisted parenthetical
(`assisted-workflow.md:26`), and apply ONE bounded two-word substitution to SIX agent profiles
(`per pipeline` → `in this artifact folder`). The design doc must state this precisely so the
"no agent profile is rewritten" claim is reported honestly as "very nearly so."

## Open questions / blockers

(None open.)
