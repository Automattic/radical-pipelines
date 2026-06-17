# Design Research: Preserve collaborative research across the assisted phases

> Domain: this pipeline edits the Radical Pipelines skill itself — the three
> assisted-phase references under `skills/radical-pipelines/reference/assisted-phases/`
> (`1 - spec.md`, `2 - design-doc.md`, `3 - plan.md`). Every design choice is
> anchored in a spec requirement / acceptance criterion and honors the
> skill-authoring rules in `CLAUDE.md` (minimalist, no duplication within a
> reading path, generic, avoid unnecessary negatives, describe the system as
> designed).

## Research

(Findings from reads of the skill source. Cite file:line.)

- The three assisted phase references and their current shapes:
  - `1 - spec.md`: `## Constraints` (lines 15-26) + steps. `spec-research.md`
    sections are `## Q&A`, `## Research`, `## Out of Scope`,
    `## Consolidated Requirements` (init skeleton lines 33-45). Recording is
    per-question (step 2 loop, lines 51-56): formulate→present→append answer.
    `## Research` is scoped to the orchestrator's *own* codebase reads
    (constraint line 25; step 2 line 68). The "in real time, not in batches"
    timing line is the constraint at line 22. "Standalone — reader should not
    need `spec-research.md`" at line 110.
  - `2 - design-doc.md`: `## Constraints` (lines 15-29) + steps.
    `design-doc-research.md` sections `## Research`, `## Topics`,
    `## Open Questions`, `## Risks` (init lines 36-46). Topic entry shape lines
    50-62 (Spec link / Options / Trade-offs / Decision / Rationale). Topic loop
    step 3 (lines 72-77): frame→propose→present+iterate until owner decides→
    **append** the distilled entry. "In real time, not in batches" at line 25.
    "Standalone" at line 135. Input is only `spec.md` (line 7).
  - `3 - plan.md`: `## Constraints` (lines 18-38) + steps. `plan-notes.md`
    sections `## Research`, `## Code Plan Topics`, `## Doc Plan Topics`,
    `## Open Questions`, `## Risks` (init lines 45-57). Topic entry shape lines
    63-73. Two topic loops: code-plan step 3 (lines 87-92), doc-plan step 7
    (lines 164-169), both frame→propose→present+iterate→append. "In real time,
    not in batches" at line 34. "Standalone" at line 148. Inputs are `spec.md` +
    `design-doc.md` (lines 7-8).

- Per-phase completion is committed-artifact-based and identical across modes
  (`pipeline-versioning.md` lines 40-49); the assisted phases each commit their
  research artifact with the phase (spec step 8 line 138; design-doc step 7
  line 162; plan step 11 line 272). The artifacts folder persists across
  sessions, so a committed research artifact from phase N is on disk when phase
  N+1 runs in a separate session (`assisted-workflow.md` line 32: continuing to
  a later phase happens in a separate session).

- Assisted and autonomous are SEPARATE reading paths, never loaded together
  (`work-on-an-issue.md` routes a run to either `autonomous-workflow.md` or
  `assisted-workflow.md`; per spec-research Q5). The autonomous analyst agents
  (`agents/spec-analyst.md`, `agents/design-doc-analyst.md`) carry their own
  parallel recording instructions — explicitly out of scope (spec Out of Scope 1).

- No shared constraints file exists today: each assisted phase carries its own
  self-contained `## Constraints` block and format skeleton; the "in real time,
  not in batches" line is written out three times (spec-research Q5c). Cross-file
  references from the assisted phase files go only to `pipeline-versioning.md`
  (completion predicate) and to the **Commit format** convention.

- **Carry-across blast radius (load-bearing for Topic 1).** The standalone
  artifacts `spec.md` / `design-doc.md` are read by a large downstream fan-out
  that spans both reading paths and the agent definitions (out of scope):
  - `spec.md` readers: `agents/design-doc-analyst.md:26`, `design-doc-writer.md:12`,
    `design-doc-reviewer.md:13`, `code-plan-writer.md:12`, `code-plan-reviewer.md:14`,
    `code-reviewer.md:17`, `doc-plan-writer.md:14`, `doc-plan-reviewer.md:15`,
    `doc-writer.md:13`, `doc-reviewer.md:17` (plus the assisted plan phase,
    `assisted-phases/3:7`).
  - `design-doc.md` readers: `agents/code-plan-writer.md:13`, `code-plan-reviewer.md:13`,
    `code-reviewer.md:16`, `doc-plan-writer.md:15`, `doc-plan-reviewer.md:14`,
    `doc-writer.md:14`, `doc-reviewer.md:16`.
  - The "standalone — reader should not need the research/prior artifact"
    guarantee is asserted in ~10 places across all three paths:
    assisted `1:110`, `2:135`, `3:148`/`3:224`; autonomous writer rows
    `autonomous-phases/1:26,33`, `2:26,33`; agent defs `spec-writer.md:19,56`,
    `design-doc-writer.md:19,73`, `code-plan-writer.md:19,56`,
    `doc-plan-writer.md:22,60`, `spec-consolidator.md:31,61`.
  - Implication: folding collaborative research INTO the standalone artifact
    would expose it to that entire fan-out and contradict every standalone
    guarantee — including in the out-of-scope autonomous path. The research
    file is committed with its phase and persists across sessions, so a later
    assisted phase CAN read the prior research file directly without touching
    the standalone artifact or the autonomous path.

- **Shared-content patterns the skill already uses (load-bearing for Topic 2).**
  Two idioms exist for content that must be identical across files:
  1. **Named convention** — referenced by name (e.g. "the **Commit format**
     convention") and defined once. But conventions are *project-specific*,
     stored in `.rp.md` and registered in `conventions/load.md` (lines 11-22);
     they are not the home for skill-authored cross-phase instructions.
  2. **Cross-file reference by filename** — the assisted phase files already
     point at `pipeline-versioning.md` by name for the completion predicate
     (`assisted-phases/1:122`, `2:146`, `3:238`). This is the idiomatic home for
     a skill-authored rule shared across the three assisted files: a new
     reference file under `assisted-phases/` that all three reference by name.
  - The three assisted files have no shared `## Constraints` source today; the
    "in real time, not in batches" line is written out three times
    (`1:22`, `2:25`, `3:34`). A rule that must apply identically to all three
    (the recording trigger, Req 1; the design-adjacent carve-out, Req 3) is a
    candidate for extraction into a shared reference file (CLAUDE.md de-dup rule
    + spec Req 7 / AC9). The next-phase-drift flag (Req 4) is NOT identical
    across all three (absent in plan), so it is a partial case, not a clean
    shared rule.

- **No research/notes file is currently a cross-phase input anywhere.** Assisted
  design-doc input is only `spec.md` (`assisted-phases/2:7`); assisted plan
  inputs are only `spec.md` + `design-doc.md` (`assisted-phases/3:7-8`). The
  within-phase autonomous writer reads its OWN research file (autonomous
  `design-doc-writer` synthesizes from `spec.md` AND `design-doc-research.md`,
  `autonomous-phases/2:26,33`; `agents/design-doc-writer.md:13`), but no phase
  reads a PRIOR phase's research file. So adding the prior research file as a
  next-phase input is a new, additive cross-phase read.

- **Coverage map (spec requirement / acceptance criterion → topic).** Every spec
  requirement and acceptance criterion maps to a design decision:
  - Req 1 / AC1, AC2 → Topic: Recording-trigger formulation.
  - Req 2 / AC3, AC4 → Topic: Spec-phase home for collaborative exploration
    (AC3 = the section; AC4 = the explicit naming of owner-initiated dialogue as
    recordable in the step-2 guidance).
  - Req 3 / AC5 → Topic: Advocate-vs-record distinction.
  - Req 4 / AC6 → Topic: Next-phase-drift flag (spec + design-doc only, absent in
    plan).
  - Req 5 / AC7 → Topic: Carry-across mechanism.
  - Req 6 / AC8 → satisfied jointly by the Topic 2 hybrid (extract identical core,
    keep per-phase specifics inline → consistency without flattening asymmetry),
    Topic 3 (spec phase reaches parity), and Topics 4-5 (one trigger / one
    advocate-vs-record principle across all three).
  - Req 7 / AC9 → Topic 2 (no duplication: shared file for the identical core) +
    threaded through every topic (generic, minimalist, no unnecessary negatives,
    system-as-designed); the design adds no tool- or issue-tracker-specific
    content.
  - AC10 (scoped to assisted only) → guaranteed by the Topic 1 decision (research
    stays in the assisted reading path; standalone artifacts and the autonomous
    path untouched) and by the change set touching only the three assisted phase
    files plus one new `assisted-phases/` shared reference file; artifact
    filenames, phase ordering, approval-file mechanism, and completion predicate
    are unchanged. AC10's "only the three assisted phase references are modified"
    is honored: the new shared file is an ADDITION within the assisted reading
    path, explicitly sanctioned by spec Out of Scope item 4 ("a new shared
    `assisted-phases/`-level file referenced by all three"); no out-of-scope file
    (autonomous references, analyst agent definitions) is touched.

## Topics

(One entry per design decision worked through with the owner. Shape: Spec link /
Options / Trade-offs / Decision / Rationale.)

### Topic: Carry-across mechanism

- **Spec link:** Requirement 5 / Acceptance criterion 7.
- **Options:**
  1. The next assisted phase reads the prior phase's **research artifact**
     directly — add it as an input to the assisted phase only (assisted
     design-doc adds `1-spec/spec-research.md`; assisted plan adds
     `2-design-doc/design-doc-research.md`).
  2. Fold the carried research INTO the standalone artifact the next phase
     already reads (a section in `spec.md` / `design-doc.md`).
  3. A dedicated hand-off file distinct from both the research and the standalone
     artifact.
- **Trade-offs:**
  - (1) Confined to the in-scope assisted reading path; zero change to standalone
    artifacts or the autonomous path; carries the full distilled research
    losslessly. Cost: a second input file at phase start, a new cross-phase read
    shape (no phase reads a prior phase's research file today).
  - (2) No new input, but contradicts the ~10 "standalone" guarantees and leaks
    research to the entire downstream fan-out including the out-of-scope
    autonomous writers/reviewers (spec Out of Scope 1). Pollutes the clean
    standalone artifacts.
  - (3) Keeps standalone artifacts clean but introduces new artifact machinery
    (against spec Out of Scope 6) and duplicates the research file that already
    holds this material.
- **Decision:** _pending owner_ (recommended: Option 1).
- **Rationale:** Option 1 is the only mechanism that stays inside the in-scope
  reading path, respects the standalone guarantees, leaves the autonomous path
  untouched, and carries the research losslessly. Word the new input as
  *supplementary collaborative context*; the prior standalone artifact remains
  the authoritative statement of intent so the research file is not mistaken for
  a second source of truth.

### Topic: Home for the shared cross-phase rules (shared file vs per-file restatement)

- **Spec link:** Requirement 7 / Acceptance criterion 9 (no duplication across a
  single reading path); Requirement 1, Requirement 3 (the rules that must be
  consistent across the three phases).
- **Options:**
  1. **Shared reference file** under `assisted-phases/` (e.g.
     `assisted-phases/recording.md`) holding the rules identical across all three
     phases; each phase file references it by name, the way the phase files
     already reference `pipeline-versioning.md` and the **Commit format**
     convention. Each phase still states its phase-specific specifics (its unit
     name and section).
  2. **Per-file restatement** — write the rule into each of the three
     `## Constraints` blocks, matching the existing self-contained precedent
     (today the "in real time, not in batches" line is restated three times).
  3. **Hybrid** — extract only the genuinely identical core (the recording
     trigger; the advocate-vs-record distinction) to a shared file, and leave
     phase-specific specifics (unit name, section name, the particular
     later-phase choices each phase must not advocate) inline.
- **Trade-offs:**
  - (1)/(3) Honor the CLAUDE.md de-dup rule directly ("an instruction repeated
    in multiple files must be moved to a separate file the others reference")
    and the "state a general rule once at the general level" rule. Cost: one
    extra conditional read per assisted run; the rule lives a hop away from the
    phase steps that apply it.
  - (2) Keeps each phase file fully self-contained (matches today's precedent),
    but reproduces the same instruction three times — exactly the divergent-copy
    risk spec Req 7 / AC9 and CLAUDE.md forbid within one reading path. The
    existing triple "in real time" line is itself a latent de-dup debt, not a
    licence to add more.
- **Decision:** _pending owner_ (recommended: Option 3, hybrid — extract the
  identical core into a shared `assisted-phases/` reference file; keep each
  phase's unit/section/later-phase specifics inline).
- **Rationale:** The recording trigger's identical core ("when a thread of
  exploration settles, before moving to the next question/topic, append the
  distilled entry") and the advocate-vs-record distinction are genuinely
  identical across the three phases; the de-dup rule mandates extracting them.
  The specifics that legitimately differ (spec records a Q&A-style settled-thread
  entry, design/plan record `## Topics` entries; spec must not advocate design OR
  implementation, design must not advocate the plan, plan must not advocate
  tests/code/docs) stay inline because they are not duplication. This is the only
  option that satisfies Req 7 / AC9 without flattening the real per-phase
  asymmetry the spec tells us to preserve (Req 6 / AC8).

### Topic: Spec-phase home for collaborative exploration

- **Spec link:** Requirement 2 / Acceptance criterion 3, Acceptance criterion 4;
  parity with Requirement 6 / Acceptance criterion 8.
- **Source facts** (`assisted-phases/1 - spec.md`): `## Q&A` (skeleton line 38,
  step-2 loop lines 51-56) is strictly orchestrator-question → owner-answer, and
  it is the requirements-oriented transcript that, with `## Out of Scope`, feeds
  `## Consolidated Requirements` (step 5, line 92) and thence `spec.md`.
  `## Research` (line 40; constraint line 25; step 2 line 68) is pinned to the
  orchestrator's own codebase reads with sources cited. `spec.md` is
  requirements-only — "No implementation details" (line 112).
- **Options:**
  1. **Reframe `## Q&A`** to be two-directional (accommodate owner-initiated
     questions + explanatory exchanges) and per-settled-thread.
  2. **Add a new section** to `spec-research.md`, the spec-phase parallel of
     design-doc/plan's `## Topics`, holding owner-initiated questions, the
     explanatory exchanges that resolve them, and design-adjacent collaborative
     exploration — recorded as distilled per-settled-thread entries. Reuse the
     existing `## Topics` name and `### Topic:` entry shape (CLAUDE.md: reuse
     defined terms), adapted to a lighter spec-phase shape (frame / exploration /
     outcome) since spec threads are not always multi-option decisions.
  3. **Broaden `## Research`** to also hold collaborative exploration.
- **Trade-offs:**
  - (2) Reaches true parity with design-doc/plan using the term the skill
    already defines; keeps `## Q&A` clean as the requirements transcript and
    `## Research` clean as codebase reads; gives the carried-across material
    (Topic 1) a precise home. The new section feeds collaborative context, not
    `spec.md` synthesis, so design-adjacent exploration recorded there does not
    leak into the requirements-only `spec.md` (line 112). Cost: a fourth/fifth
    section in `spec-research.md`.
  - (1) Overloads `## Q&A`: it both feeds requirements synthesis AND would carry
    design-adjacent exploration, risking leakage of out-of-scope exploration into
    `spec.md` and muddying the requirements transcript.
  - (3) Blurs `## Research`'s clean "codebase reads, sources cited" meaning;
    collaborative exploration is not a cited codebase finding.
- **Decision:** _pending owner_ (recommended: Option 2).
- **Rationale:** Option 2 gives the spec phase the missing home at parity with
  design-doc/plan (Req 2, Req 6 / AC3, AC8), reuses the skill's existing
  `## Topics` term, and keeps the two requirement-feeding sections (`## Q&A`,
  `## Research`) clean so design-adjacent exploration cannot leak into the
  requirements-only `spec.md`. It is also the section the carry-across mechanism
  (Topic 1) hands to the design-doc phase.
- **Also covers AC4 (owner-initiated dialogue named as recordable).** Beyond
  providing the section, the spec phase's step-2 guidance must explicitly NAME
  questions the owner raises, and the explanatory exchanges that resolve them, as
  research worth preserving — alongside the orchestrator's own questions — so the
  orchestrator knows to route them into the new `## Topics` home. This is a
  guidance change in the spec phase's Q&A-loop step, not just a new section
  heading. The recording trigger (Topic 4) then fires on these owner-initiated
  threads the same way it fires on the orchestrator's.

### Topic: Recording-trigger formulation

- **Spec link:** Requirement 1 / Acceptance criterion 1, Acceptance criterion 2;
  consistency Requirement 6 / Acceptance criterion 8.
- **Source facts:** Today each phase has TWO timing instructions — (1) the loose
  `## Constraints` "in real time, not in batches" line (`1:22`, `2:25`, `3:34`),
  and (2) the step-loop ordering. In design-doc (step 3, lines 72-77) and plan
  (step 3 lines 87-92 / step 7 lines 164-169) the loop already carries a concrete
  IMPLICIT trigger: append the distilled Topic entry AFTER the owner decides,
  before the next topic. The spec phase's step-2 loop (lines 51-56) appends each
  answer per-question with no distillation and no settled-thread trigger — the
  asymmetry that makes the spec phase "sharpest" for lost research.
- **Options:**
  1. **Make the implicit loop trigger explicit and add it to the spec phase** —
     state, as the recording rule, "when a thread of exploration settles (a
     question/topic is resolved), before moving to the next, append the distilled
     entry." Replace the lone "in real time, not in batches" reliance with this.
     This rule is the shared-file core from Topic 2.
  2. **Per-reply trigger** — record before every reply (most reliable, but noisy;
     produces a raw transcript, which AC2 forbids).
  3. **Keep "in real time" and only add distillation guidance** — minimal change,
     but leaves the no-concrete-moment failure the spec calls out unfixed
     (AC1 requires replacing sole reliance on "in real time").
- **Trade-offs:**
  - (1) Ties recording to a concrete, noticeable moment (AC1) and records a
    distilled per-settled-thread unit, not a transcript (AC2); promotes the
    design/plan implicit trigger to an explicit rule and brings the spec phase to
    parity (AC8). Pairs with Topic 2 (the shared-file home) and the spec phase's
    new `## Topics` home (Topic 3 — the spec phase needs a settled-thread unit to
    append, which Topic 3 provides).
  - (2) Reliable but violates AC2 (raw transcript) and adds noise.
  - (3) Fails AC1.
- **Decision:** _pending owner_ (recommended: Option 1).
- **Rationale:** Option 1 directly satisfies AC1 + AC2, unifies the three phases
  on one trigger (AC8), and reuses the concrete moment design/plan already carry
  implicitly. The "in real time, not in batches" phrase is no longer the sole
  timing guidance; it may remain as a secondary nudge or be dropped — a wording
  call for the writer, not a design fork.

### Topic: Advocate-vs-record distinction in the "don't do the next phase's job" rules

- **Spec link:** Requirement 3 / Acceptance criterion 5; consistency Requirement
  6 / Acceptance criterion 8.
- **Source facts:** The rules today are flat prohibitions: spec `1:21` "You MUST
  NOT propose design or implementation choices — those belong to later phases"
  (the only one; spec lumps design AND implementation); design-doc `2:24` "MUST
  NOT write the implementation plan…" + `2:23` "MUST NOT write production code.
  Interface sketches and small illustrative snippets are fine." (already a
  doing-vs-light-touch carve-out precedent); plan `3:30` "MUST NOT plan tests in
  the code plan…", `3:32` "MUST NOT write code or documentation content." The
  word "record" in the spec phase appears only in the codebase-reads sense.
- **Options:**
  1. **Reword each rule to constrain advocating/committing only**, and make the
     identical advocate-vs-record principle a shared-file rule (Topic 2): "these
     rules forbid advocating for or committing to a later-phase choice; recording
     design-adjacent (or plan-adjacent) exploration that arose with the owner is
     preserved." Each phase keeps its specific later-phase targets inline.
  2. **Add a separate sentence** to each rule explicitly permitting recording,
     leaving the prohibition wording as-is.
  3. **Leave the rules; rely on the new recording sections** to imply recording
     is allowed (no change to the prohibitions).
- **Trade-offs:**
  - (1) Satisfies AC5 cleanly (the rule itself constrains advocacy, not
    recording) and AC8 (one principle, stated once at the general level per
    CLAUDE.md); follows the existing `2:23` carve-out precedent. Removes the
    standing contradiction where a flat "MUST NOT propose design" reads as
    forbidding the recording the spec now requires.
  - (2) Works but risks two adjacent clauses that can drift; more words.
  - (3) Fails AC5 — the prohibition still "reads as forbidding the recording."
- **Decision:** _pending owner_ (recommended: Option 1).
- **Rationale:** AC5 requires the rule itself to permit recording; only Option 1
  changes the rule's meaning rather than bolting on an exception. The shared
  principle is identical across phases, so it belongs in the Topic 2 shared file;
  the phase-specific later-phase targets stay inline.

### Topic: Next-phase-drift flag

- **Spec link:** Requirement 4 / Acceptance criterion 6 (present in spec and
  design-doc; absent in plan).
- **Source facts:** No existing "flag to owner + recommend a forward action"
  pattern. design-doc `2:22` and plan `3:33` have a SCOPE-drift handler that
  routes BACKWARD ("log it as an open question or send the owner back to revise
  the spec/design doc"); the spec phase has no analogous handler. The drift flag
  is a NEW variant that routes FORWARD. `assisted-workflow.md:32`: continuing to
  a later phase happens in a SEPARATE session — so the recommendation is a
  cross-session handoff. The plan phase's next phase (code) has no assisted form
  (`assisted-workflow.md:21-22`), so the flag stops at plan (Req 4, AC6, spec Out
  of Scope 5).
- **Options:**
  1. **A new constraint/step instruction in the spec and design-doc phases
     only:** when discussion drifts into the next phase's territory, flag it to
     the owner and recommend running the next assisted phase once this phase
     completes (while context is fresh). Modeled on the existing "when X
     surfaces, do Y" shape (`2:22`/`3:33`) but routing forward. NOT placed in a
     shared file, because it is not identical across all three (absent in plan).
  2. **Put it in the Topic 2 shared file with a "plan phase: not applicable"
     carve-out.**
  3. **Fold it into the existing scope-drift handler** (`2:22`) as an extra
     branch.
- **Trade-offs:**
  - (1) Matches the spec's "spec + design-doc only, absent in plan" shape (AC6)
    exactly; lives where it applies; reuses the established when-X-do-Y idiom.
  - (2) Forcing a two-of-three rule into the shared file then carving plan out
    adds negative phrasing the skill avoids, and the shared file is meant for
    rules identical to all three (Topic 2). Worse fit.
  - (3) The scope-drift handler is about scope (spec didn't ask for it) routing
    backward; phase-drift is a topic belonging to the NEXT phase routing forward.
    Conflating them muddies two distinct rules (spec-research Q4b).
- **Decision:** _pending owner_ (recommended: Option 1).
- **Rationale:** The drift flag is genuinely a two-phase rule, not a three-phase
  one, so it belongs inline in the spec and design-doc phases — keeping it out of
  the Topic 2 shared file (which is reserved for rules identical across all
  three). It is a distinct rule from the backward scope-drift handler. AC6 is
  satisfied: present in spec + design-doc, absent in plan.

## Open Questions

- Exact filename/title for the new shared `assisted-phases/` reference file
  (Topic 2) — a wording/naming call deferred to the plan/code phases, governed by
  the skill-authoring rules. Design only fixes that it is a single shared file
  referenced by name from all three assisted phase files.
- Exact entry shape of the spec phase's new `## Topics` home (Topic 3) — whether
  it mirrors the design/plan `### Topic:` fields verbatim or uses a lighter
  frame/exploration/outcome shape. Design fixes the section name (`## Topics`) and
  its purpose; the precise field list is a wording call for later phases.
- Whether the carried-across prior research file (Topic 1) is read in full or the
  next phase is told to mine only its collaborative-exploration section. Design
  recommends reading it as supplementary collaborative context; the exact framing
  is a wording call.

## Risks

- **Standalone-guarantee regression.** If the carry-across (Topic 1) is ever
  implemented by folding research into the standalone artifact, it would
  contradict the ~10 "standalone" guarantees and leak into the out-of-scope
  autonomous path. Mitigation: Option 1 (research-file-as-input) keeps the
  standalone artifacts and the autonomous path untouched. Flag for the code phase.
- **Shared-file over-extraction.** Pulling phase-specific specifics (unit names,
  per-phase later-phase targets) into the shared file would flatten the
  asymmetry the spec tells us to preserve (Req 6 / AC8) and create a file that
  needs per-phase carve-outs. Mitigation: the hybrid decision (Topic 2) extracts
  only the genuinely identical core.
- **Spec-phase leakage into `spec.md`.** Design-adjacent exploration recorded in
  the spec phase's new `## Topics` must not feed `spec.md` synthesis (which is
  requirements-only, `1:112`). Mitigation: the new section is collaborative
  context, separate from `## Q&A`/`## Consolidated Requirements`, which are the
  synthesis sources. Flag for the code phase to keep synthesis sources unchanged.
- **Autonomous-path drift.** The autonomous analyst agents carry parallel
  recording instructions left untouched (spec Out of Scope 1). After this change
  the assisted and autonomous recording instructions will differ; this is
  intentional, but a future reader may mistake it for an oversight. Acceptable
  per the spec's explicit scoping; noted for transparency.
