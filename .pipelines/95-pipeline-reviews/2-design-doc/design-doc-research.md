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
"no agent profile is rewritten" claim is reported honestly as "very nearly so." Researcher
confirmed (A)-safety crux: an agent handed `.../review-1/1-spec/` cannot see base's approved
file (never walks above its handed folder; rejection counter is folder-local), so there is NO
functional ambiguity either way — (B) is chosen purely for truthfulness.

### T3 — Eager `base/` at creation + fork-copy scoped to `base/` (R2, R5, R23)

Decided 2026-06-09 with researcher. Both `create-pipeline.md` and `fork-pipeline.md` read in full.

- **Layout is NOT a convention concern.** The **Artifact folder** convention (`setup.md:46-52`)
  defines only the pipeline FOLDER (`.pipelines/<slug>/`) and is silent on internal layout. So
  `base/` is laid down by the phase-creating steps, the convention stays UNCHANGED, and the run
  layout is single-sourced to `pipeline-versioning.md`'s Runs subsection (T1.1).

- **`create-pipeline.md` (R2):**
  - Step 3 ("Create the folder following the **Artifact folder** convention", line 19) —
    UNCHANGED; it creates `.pipelines/<slug>/`.
  - Step 4 (line 23) — EXPLICIT base creation folded into the phase-0 step (not a new standalone
    step; step 3 is convention-bound and shouldn't grow run vocabulary). Replace line 23 with:
    "Phase folders live under a run folder; the first run is always `base` (see 'Runs within a
    pipeline' in `pipeline-versioning.md`). Create the `base/` run folder and the phase 0
    subfolder under it (`base/0-prompt/`) inside the artifact folder. Write the prompt to
    `<artifacts-folder>/base/0-prompt/prompt.md`." (Cross-references the run definition rather
    than re-explaining `base`.)
  - Step 4 asset bullet (line 27): `<artifacts-folder>/0-prompt/` → `<artifacts-folder>/base/0-prompt/`
    (relative refs inside prompt.md unaffected).
  - Step 5 (Commit, line 32) — UNCHANGED; commits whatever was created, now under `base/`.

- **`fork-pipeline.md` (R23) — the line-42 edit is BOTH a correctness fix AND reviews-scoping:**
  - Step 4 (line 34) — append (ADOPTED optional touch): "The fork's phases live under its own
    `base/` run, seeded from the parent's `base/` run (next step); a fork starts a fresh `base/`
    and never inherits the parent's reviews (see 'Runs within a pipeline' in
    `pipeline-versioning.md`)." States R23's "own base, inherit parent's base, reviews excluded"
    without describing reviewed-run forking (out of scope).
  - Step 5 intro (line 38): scope the copy to base in prose — "Copy only the phase folders being
    inherited, from the parent's `base/` run into the new pipeline's `base/` run — `base/0-prompt`
    up to and including the inherited phase agreed in step 1. Only `base/` is copied; the parent's
    `review-*` runs, if any, are never inherited."
  - Step 5 cp (line 42) — THE load-bearing edit. Source AND destination gain the `base/` prefix:
    `cp -r <parent-worktree>/<parent-artifact-folder>/base/<phase> <artifacts-folder>/base/<phase>`.
    **Critical correctness note:** after R2 the parent's prompt is at `<parent>/base/0-prompt`, so
    the CURRENT cp (`<parent>/0-prompt`) would FAIL (source missing). The `base/` prefix on the
    source fixes the broken path; it also inherently scopes to `base/` and never touches
    `<parent>/review-*`. Reviews were never at accidental-inclusion risk because the loop iterates
    phase NAMES (`0-prompt`, `1-spec`, …), not a glob — `review-*` are not phase names.
  - Step 5 worktree-absent (line 43) — ADOPTED optional tightening: "copy as above" → "copy as
    above (from the parent's `base/` run)" to remove any doubt about which run is copied.
  - Step 6 (Commit, line 47) — UNCHANGED.
  - Step 7 (Continue, line 51) — ADOPTED optional touch: append "Work continues in the fork's
    `base/` run." for end-to-end run-layer visibility and symmetry with create-pipeline step 4.

- **R5 silence + R23 scope — confirmed.** No "if no `base/`" text in either file; both assume
  `base/` exists. No forking-from-reviewed-run capability is described — the step-4 clause states
  only what the COPY takes (base only, reviews excluded), which is the correct framing.

**Edit-site summary:** `create-pipeline.md` lines 23, 27 (steps 3 and 5 unchanged);
`fork-pipeline.md` lines 34, 38, 42 (load-bearing), 43, 51. `setup.md` convention unchanged.

### T4 — `review-pipeline.md` procedure + menu wiring (R6–R12, R17, R18, R19, R24–R29)

Decided 2026-06-09 with researcher. Confirmed `merge-pipeline.md`, `close-pipeline.md`, AND
`review-pipeline.md` are ALL absent today; Review is the one this work creates, Merge/Close stay
dangling (out of scope). The procedure is DISTRIBUTED — it mostly delegates to existing files.

**Structural findings that shape the design:**
- The health-monitor lifecycle is owned by `autonomous-workflow.md` (launch line 35, cancel
  line 82) and `resume-pipeline.md` step 1 (cancel leftover) — NOT by an entry-procedure file.
  So `review-pipeline.md` never re-implements monitor handling; it inherits it via re-attach
  (cancel leftover) + the dispatched workflow (fresh launch). (R27 detail → T8.)
- There is no standalone "tracker run-obligations" file: tracker work goes through the **Issues**
  convention (`manage-issues.md:5`); the autonomous workflow owns monitor + close-out. So R27's
  run obligations are largely INHERITED by dispatching to the workflow + reusing Issues — review-
  pipeline.md NAMES them, T8 details them. No obligation prose is duplicated in review-pipeline.md.

**Precondition gating (R7, R9, R26):** BOTH hard gates re-verified at the TOP of
review-pipeline.md, NOT relied on from the menu — because the direct route ("review this
pipeline", R6) bypasses the menu's phase-5 guard (`work-on-an-issue.md:32`), and the merged gate
(R9) isn't enforced by the menu at all (line 32 keys only on phase-5 completion). This is
correctness, not redundancy.
- Gate (a) completeness: latest run complete through phase 5 (predicate evaluated WITHIN the
  latest run per T1's state rule). On failure, steer to **resume** (`resume-pipeline.md`) or
  **fork** (`fork-pipeline.md`) — R7's exact remedy.
- Gate (b) unmerged: per the merged-state determination in `pipeline-versioning.md` ("Listing
  pipelines for an issue" / the `[merged]` annotation). A merged pipeline → handled as a new
  issue via `manage-issues.md`, not a review — R9's exact remedy.
- R26 anchor sentence at the gate: these two are the ONLY preconditions; the fork-vs-review and
  split advisories never gate a review the owner chooses.

**Procedure skeleton (refined from straw man; advisories BEFORE re-attach):**
1. **Confirm review preconditions** — the two gates above; steer to resume/fork or new-issue on
   failure; advisories never gate (R26). [delegates: pipeline-versioning.md state/merged-state;
   resume/fork/manage-issues as remedies]
2. **Advisories** — fork-vs-review (R24, drastic ⇒ MAY recommend fork) + split (R19, several
   unrelated changes ⇒ MAY suggest separate sequential reviews, R18). Confirm final count and
   boundaries with the owner BEFORE creating any run folder; non-gating (R26). Placed BEFORE
   re-attach because an accepted fork diverts to `fork-pipeline.md` entirely and R19 requires
   settling count "before creating any run folder" — so nothing is re-attached/created first.
   [delegates: fork-pipeline.md if owner forks]
3. **Re-attach to branch/worktree** — REUSE resume's logic (R8): follow `resume-pipeline.md`
   steps 1–2 (cancel leftover monitor, re-enter worktree or recreate from branch). NO rollback
   (latest run already complete — explicitly do NOT perform resume's step-4 rollback); NEVER a
   new branch. [delegates: resume-pipeline.md steps 1–2] — **FLAG → T7:** the "do steps 1–2 of
   that file" pointer is brittle; T7 will decide whether to factor resume's steps 1–2 into a
   named shared "Re-attach to branch and worktree" anchor that both resume and review cite.
   Leaning toward factoring (R8 says "reusing … rather than reinventing").
4. **Determine + create the run folder** `review-N-<short-description>` (R4): N = next after
   existing `review-*`; kebab short description of the review goal; sibling of `base/`. [delegates:
   pipeline-versioning.md Runs subsection for the NAME RULE — not restated]
5. **Author + commit the review prompt** at `review-N-…/0-prompt/prompt.md` (R10–R12), the same
   way the base prompt (phase 0) is orchestrator-authored (`create-pipeline.md` step 4 pattern),
   using the shared prompt format + mandatory origin reference. [delegates: create-pipeline.md
   step 4; T5 for format + origin reference] — review-pipeline.md does NOT restate the format.
6. **Re-assert the version label** `v<N>`, unchanged (R28) — confirm, do not change; same branch,
   same pipeline. [delegates: pipeline-versioning.md "Model"]
7. **Return to `work-on-an-issue.md` step 3** to pick mode + dispatch the chosen workflow for
   phases 1–5 (R17). The review prompt is phase 0 and mode-independent. Phases run in the review
   run folder [T7]. Assisted review advances only through phase 3 ⇒ itself incomplete until
   finished autonomously through 4–5, so it can't yet satisfy R7 for a later review. Run-start/
   run-end obligations + monitor fire via the dispatched workflow (R27; detail T8). Ends like
   resume ("Return to work-on-an-issue.md"). [delegates: work-on-an-issue.md steps 3–4;
   autonomous/assisted-workflow.md; T8]
- **Run-start obligations (R27) fire** after Step 5 (prompt committed = the run exists), folded
  into the dispatch (Step 7) — inherited from the workflow + Issues convention, not duplicated.

**RESUME / REVIEW / FORK decision rule (R25):** lives INLINE in `work-on-an-issue.md` step 2 (a
reader opening review-pipeline.md has already chosen review — too late for a discriminator). Insert
a non-nested "When the owner is unsure, apply this rule" block AFTER line 35 (at the top-level
bullet indent, so it can see all three actions — Review is offered only in the phase-5 sub-block
while Resume/Fork are always offered, which is consistent: review requires a complete run). Phrasing
lifts R25: resume = finish INCOMPLETE latest run, same branch; review = layer incremental change on
a COMPLETE run, same branch, build on existing code; fork = diverge onto a FRESH branch from main.
Sharpest discriminator: same-branch-build-on-existing (review) vs new-branch-from-main (fork);
resume = incomplete run. Existing menu bullets (lines 30–35) stay exactly as-is; the new block is
the chooser. review-pipeline.md's Step 2 handles the in-review fork-vs-review nuance (R24).

**Wiring without breaking Merge/Close (R29) — confirmed:**
- Creating `review-pipeline.md` and leaving the Merge (line 33) and Close (line 35) bullets EXACTLY
  as-is satisfies R29. Merge/Close target files are absent today and stay absent (dangling, inert,
  unbroken). No edit to those two lines.
- Line 34 ("**Review** read `review-pipeline.md`") needs NO text change to become live (the file now
  exists). ADOPTED one-clause addition: append "then continue to step 3" to mirror Resume/Fork
  (lines 30–31) and make the post-review return-to-step-3 flow legible. Merge/Close bullets keep NO
  "continue to step 3" — correctly signaling they're terminal/dangling, not workflow-dispatching.

**Edit-site summary:** NEW file `review-pipeline.md` (7 steps above). `work-on-an-issue.md`: line 34
append "then continue to step 3"; insert R25 decision-rule block after line 35; Merge/Close lines
untouched.

### T5 — Prompt-format single-sourcing + review origin reference (R10, R11, R12, R13)

Decided 2026-06-09 with researcher. `manage-issues.md` read in full; the format prose lives there
today (interleaved with issue-front-door specifics).

- **Shared format home: NEW file `reference/prompt-format.md` (option a).** A neutrally-named file
  is where any of the three sites' readers will look; (b) "host in manage-issues.md" leaves the
  canonical format buried in the tracker front-door file and creates a host/borrow asymmetry that
  invites drift. **Schema and discipline are NOT split** (rejected option c) — they're short and
  tightly coupled (the discipline explains the schema's shape); keep them in one file with two
  subsections: `## Schema and rendering` and `## Authoring discipline`. This satisfies R13's "each
  element in exactly one location" without two-file sync overhead.

- **Extraction line map (clean — the interleaving is one sentence):**
  - MOVE to `prompt-format.md`: the schema bullets `manage-issues.md:16–22` (Title/Goal/Constraints/
    Context/Assumptions + "A vague idea yields just a Title and a Goal"); the rendering rule embedded
    in line 14 ("omit any that are empty — no `N/A` placeholders"); the four authoring-discipline
    bullets `:28–31` (capture-don't-converge, lead-with-goal, no-requirements/design/impl,
    hypotheses-as-open — these reference phases/`spec-analyst`, which are pipeline-wide truths, not
    issue-front-door specifics, so they belong with the shared discipline).
  - STAYS in `manage-issues.md`: line 14's FIRST clause ("The issue body _is_ the phase-0 prompt —
    `create-pipeline.md` turns the issue into `0-prompt/prompt.md`" → update to `base/0-prompt/`) is
    the issue↔prompt RELATIONSHIP, issue-site-specific; line 32 ("Do not write to the tracker until
    the owner approves the rendered draft") is TRACKER-specific and MUST NOT move (base/review
    prompts are committed to a run folder, not written to a tracker — key separation point); all of
    Steps 1–5 (`:36–62`) and Close out (`:64–66`) untouched (they name Goal/Constraints/etc. by use,
    not restatement).

- **`prompt-format.md` shape:** "# The Prompt Format" + one line ("a tracker issue body, a base
  prompt, or a review prompt; it is the input to phase 1") + `## Schema and rendering` (moved
  schema+rendering) + `## Authoring discipline` (moved four bullets). NO origin-reference hook (see
  below).

- **Three site pointers (no restatement):**
  - ISSUE (`manage-issues.md`): "## The issue format" body → issue↔prompt sentence + "Author it using
    the shared schema, rendering rules, and authoring discipline in `prompt-format.md`." "## Constraints"
    → "The authoring discipline in `prompt-format.md` applies across all steps below." + keep ONLY the
    tracker-only bullet (line 32).
  - BASE (`create-pipeline.md` step 4): KEEP the issue→prompt TRANSFORM (line 25 "Adapt the issue
    content as a prompt directed at the agents…" — distinct base-site instruction, not format prose).
    REPLACE the discipline restatement (line 26 "Do not add requirements, technical directions, or
    implementation details…") with a pointer to `prompt-format.md`. **RESOLVED open choice — TRIM to a
    pure pointer (override researcher's lean-to-keep-the-gloss):** acceptance criterion 13 is strict
    ("no two … restate the same format prose"); the gloss IS the discipline restated and is exactly
    what an acceptance test would flag. Proposed: "Adapt the issue content into the phase-0 prompt at
    `<artifacts-folder>/base/0-prompt/prompt.md`, following the schema and authoring discipline in
    `prompt-format.md`." Asset bullet (line 27) and self-contained bullet (line 28) stay (base-site
    specifics). (Researcher preferred keeping a short gloss for safety-against-skipping; I override for
    strict R13 compliance — the pointer is unambiguous and the discipline is one click away.)
  - REVIEW (`review-pipeline.md` step 5): "Author the review prompt at
    `review-N-<short-description>/0-prompt/prompt.md` following the schema and authoring discipline in
    `prompt-format.md`, plus the review-only origin reference below."

- **3×4 site-local contract (writer must NOT factor these out):**
  | Element | ISSUE | BASE | REVIEW |
  |---|---|---|---|
  | Destination | the tracker (Issues convention) | `<artifacts-folder>/base/0-prompt/prompt.md` | `review-N-<short-description>/0-prompt/prompt.md` |
  | Source | short owner-led Q&A (Steps 1–5) | the existing issue, transformed | owner's requested change / GitHub comment / PR review / conversation (mostly transcribed when written) |
  | Trigger | owner creates/modifies an issue | a new pipeline is created (phase 0) | a review is started (review-pipeline.md step 5) |
  | Origin reference | absent | absent | MANDATORY (R12) |
  Plus: issue-only tracker "don't write until approved"; base-only asset-download + self-contained;
  review-only assets-into-`0-prompt/` + origin reference.

- **Origin reference (R12): review-ONLY, specified in `review-pipeline.md` step 5 — NOT in the shared
  schema.** Putting it in `prompt-format.md` would pollute the schema with something two of three
  sites never use and require "optional everywhere except mandatory in review" conditional prose —
  exactly the cross-site coupling R13 avoids. The shared schema needs NO hook: omit-empty rendering
  already tolerates an extra section, and a hook would invite schema erosion. Exact phrasing in
  review-pipeline.md step 5 (after the prompt-format pointer): an **Origin** section, MANDATORY for
  reviews, self-contained (substance = direct quote or faithful paraphrase + a convenience link), with
  source assets placed in this review run's `0-prompt/` and referenced relatively (same as issue/base);
  explicitly noting the Origin section is unique to reviews and absent from issue/base prompts.

**Edit-site summary:** NEW `reference/prompt-format.md` (schema+rendering + authoring discipline,
moved from `manage-issues.md:14,16–22,28–31`). `manage-issues.md`: "## The issue format" + "##
Constraints" collapse to pointers + keep the tracker-only bullet (line 32; update line 14 path to
`base/0-prompt/`); Steps untouched. `create-pipeline.md` step 4: keep transform (line 25), replace
discipline restatement (line 26) with a pure `prompt-format.md` pointer. `review-pipeline.md` step 5:
pointer + Origin-reference requirement. `prompt-format.md` needs NO origin hook.

### T6 — Reviewer diff base ref (R16, R17)

Decided 2026-06-09 with researcher. Verified firsthand: NO base-ref derivation exists in the skill
today (grep over the whole skill + agents).

- **NOTABLE FINDING the design doc must own:** R16 is framed in the spec as supplying the prior-run
  tip "as the base ref they already accept; no agent capability is added." That is accurate for the
  AGENT side (reviewers already read "the base ref to diff against" from the launch prompt —
  `code-reviewer.md:14,19`, `doc-reviewer.md:14,20`; T2). But on the ORCHESTRATOR side, the base ref
  is **derived nowhere today** — the two launch sites (`4 - code.md:35`, `5 - docs.md:36`) treat it
  as an opaque value handed to the reviewer. So R16 forces **introducing** the base-ref derivation
  for the FIRST time, for BOTH the normal and review cases. The design doc reports this honestly:
  "R16 surfaces a pre-existing gap (the normal-run base ref was never written down) and closes it for
  both cases" — not a pure review-only addition. Still a small, well-contained change; zero agent edits.

- **Derivation — unified rule keyed on "start of the current run":**
  - **Review run** → the **tip of the previous run** (`base` or `review-(N-1)`): the **branch tip at
    the moment the review run begins, before its prompt is committed** (equivalently, the parent of
    the review run's first commit — the prompt commit per T4 step 5). This needs ZERO new
    bookkeeping. Rejected alternative (y) "last commit touching `review-(N-1)/`" is FRAGILE: code/docs
    commits touch the WORKTREE source files, not the run's artifact folder, so it would point at the
    prior run's phase-3 artifact commit, not its true tip.
  - **Base run** → the point the pipeline **branched from main** = the **merge-base of the pipeline
    branch and main** (robust against main advancing — NOT "main's current tip"). The review then
    sees the whole pipeline's delta.
  - **CRITICAL: capture ONCE at run start, hold constant.** By phase 4 the review run has already
    added its own spec/design/plan/code commits on top of the prior-run tip; the base ref must remain
    the prior-run tip (frozen at review start) so the code review sees the review's full delta (R16
    "only the run's incremental change"). It is captured at review start (when HEAD is still the
    prior-run tip) and passed unchanged to every code-reviewer and doc-reviewer in the run, across all
    rejection/re-dispatch iterations. The diff is always prior-run-tip → current HEAD.

- **Placement (avoids code/docs duplication):** DEFINE the unified rule ONCE in `pipeline-versioning.md`
  (it is run-model knowledge — about run boundaries on the branch — alongside the Runs subsection from
  T1; a short `### Reviewer base ref` subsection or folded into Runs). Both `4 - code.md:35` and
  `5 - docs.md:36` change "the base ref to diff against" → "the base ref to diff against (the start of
  the current run — see `pipeline-versioning.md`)", guaranteeing code/docs symmetry with no duplicated
  derivation. `review-pipeline.md` step 3 captures the prior-run-tip value at review start (HEAD before
  the prompt commit) — the review-side hook into the shared rule. OPTIONAL: one line in
  `autonomous-workflow.md` §5 noting "capture the run's base ref per `pipeline-versioning.md` before
  launching the phase-4/5 reviewers." **Decision: include the autonomous-workflow.md §5 line** — it is
  where the run-wide value is actually held during execution, and it makes the capture-at-start timing
  explicit for the normal run too (which has no review-pipeline.md to host it).

- **Assisted mode (R17) — not applicable, no edit.** Assisted runs advance only through phase 3
  (`assisted-phases/` has only 1-spec, 2-design-doc, 3-plan); the code/docs reviewers never run in
  assisted mode, so there is no base ref to derive there. The rule lives entirely in the autonomous
  path; `assisted-workflow.md` is untouched.

**Edit-site summary:** `pipeline-versioning.md` — new unified Reviewer-base-ref rule (in/near the Runs
subsection). `4 - code.md:35` and `5 - docs.md:36` — reference that rule. `review-pipeline.md` step 3 —
capture prior-run tip at review start. `autonomous-workflow.md` §5 — one capture-at-start line.
`assisted-workflow.md` — untouched. Agents — untouched (reviewers already accept the base ref).

### T7 — Run-aware workflows + resume + re-attach anchor (R8, R20, R21, R27)

Decided 2026-06-09 with researcher. Heavy lifting is T1.3 (pipeline-versioning.md); the execution
files mostly INHERIT latest-run semantics through their existing delegations.

- **"Next phase" lines ride on pipeline-versioning.md — NO edit.** Both `autonomous-workflow.md:7`
  and `assisted-workflow.md:5` already delegate completed/active-phase definition to
  pipeline-versioning.md; after T1.3 "the active phase" means "the latest run's active phase" at
  these sites with no wording change. No workflow sentence hard-codes a pipeline-relative (non-run)
  phase path: `autonomous-workflow.md:69`'s blocker-payload example `<artifacts-folder>/2-design-doc/…`
  is phase-container sense and rebinds to the run folder via the T2 contract — NO edit.

- **"Create the phase subfolder" — autonomous rides on T2, assisted gets the one binding edit:**
  - `autonomous-workflow.md:48` ("create the phase subfolder inside the artifacts folder") — NO
    edit; rides on the already-decided T2 `:60` handoff ("the active run's folder") + the run model.
  - `assisted-workflow.md:26` — **RECONCILES + UPGRADES the T2 "optional" parenthetical to
    RECOMMENDED:** assisted mode has NO agent-handoff line (no `:60` equivalent — the orchestrator is
    the writer), so `:26` is the ONLY place the run binding can be made visible in the assisted path.
    Without it, assisted never names the run folder anywhere. Edit: "Create the phase subfolder inside
    the artifacts folder" → "Create the phase subfolder inside the active run's folder (the artifacts
    folder for this run)". This is assisted's counterpart to the autonomous `:60` edit.

- **Resume targets the latest run (R21) — two thin edits; rollback mechanics unchanged:**
  - Step 3 (`resume-pipeline.md:20`): append a read-within-latest-run clause — "…confirm the state
    against the **Per-phase completion** predicate in `pipeline-versioning.md`, evaluated within the
    pipeline's latest run; read the completed and active phase artifacts inside that run's folder." (Not
    redefining state — pipeline-versioning.md owns that — just pointing the file-reading at the right
    run folder, which matters operationally.)
  - Step 4 (`resume-pipeline.md:27`): add "the latest run's" before "completed phase" ("the resume
    point is the phase **after** the latest run's completed phase"). Line 35 ("returns to the
    completed-phase state") then reads correctly off it. **Rollback is already structurally safe** and
    needs no further scoping: reverting ONLY the active-phase commits returns the branch to the latest
    run's completed-phase state and CANNOT reach into a prior run, because the latest run's completed
    phase commit is a strict floor above all prior runs. The one-word qualifier is a clarity/safety
    touch on a destructive op, not a mechanism change. Re-attach steps 1–2 UNCHANGED (R21).

- **Re-attach as a shared building block (R8) — option (b2): cite resume's named sections.**
  - The skill's cross-reference idiom is FILE + NAMED SECTION, never step numbers (e.g.
    `work-on-an-issue.md:19`, `fork-pipeline.md:9` cite pipeline-versioning.md sections by name;
    `resume-pipeline.md:20` cites "Per-phase completion"). ZERO precedent for "do steps 1–2 of file X."
  - resume's steps 1–2 ALREADY have headings ("### 1. Cancel any leftover health monitor",
    "### 2. Re-attach to the branch and worktree"). `review-pipeline.md` step 3 cites them BY NAME:
    "Cancel any leftover health monitor and re-attach to the branch and worktree exactly as resume does
    (`resume-pipeline.md`, 'Cancel any leftover health monitor' and 'Re-attach to the branch and
    worktree')." Renumber-proof, idiomatic, ZERO refactor of resume. (Rejected: b1/b3 fuse or renumber
    resume's steps — more disruptive for no gain. Rejected (a): step-number pointer, foreign to the idiom.)
  - No third citer needs only one of the two steps (resume is only entered whole from
    `work-on-an-issue.md:30`), so the two stay separate; review cites both by name. **This resolves the
    T4-step-3 carried-forward flag.**

- **Monitor lifecycle composes (R27 cross-check) — confirmed.** Autonomous review: CANCEL leftover
  comes from the reused re-attach (resume step 1, keyed on the pipeline slug); FRESH LAUNCH comes from
  the dispatched autonomous workflow (`autonomous-workflow.md:35`). No monitor logic added to
  review-pipeline.md — it inherits both ends; slug/team stay the same (R27). Assisted review launches
  no monitor (`conventions/claude-code.md:35`). The "fresh monitor points at the review RUN folder"
  detail is T8.

**Edit-site summary:** `autonomous-workflow.md` — no new edits beyond T2's `:60`. `assisted-workflow.md:26`
— add "the active run's folder" clause (upgrades T2 optional → recommended). `resume-pipeline.md` —
line 20 append latest-run read clause; line 27 add "the latest run's" qualifier; re-attach steps 1–2
unchanged. `review-pipeline.md` step 3 — cite resume's two named sections (b2).

## Open questions / blockers

(None open.)
