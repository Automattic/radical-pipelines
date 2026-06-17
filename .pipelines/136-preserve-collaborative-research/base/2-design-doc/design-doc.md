# Design Doc: Preserve collaborative research across the assisted phases

## Overview

This change modifies the Radical Pipelines skill itself. In assisted mode, the
orchestrator drives one phase per session through dialogue with a human owner,
recording its work in that phase's research artifact (`spec-research.md`,
`design-doc-research.md`, `plan-notes.md`). The substantive collaborative
exploration in those sessions — candidate solutions, the problems with each,
trade-offs weighed together, and the owner's own questions and the explanatory
exchanges that resolve them — is often the most valuable output of a phase, yet
today it can be lost to the chat. Two gaps cause this: the recording instruction
relies on the aspirational "in real time, not in batches" with no concrete moment
that reliably fires; and in the spec phase the research artifact has no documented
section where owner-initiated and design-adjacent exploration can land.
Additionally, when a phase's discussion drifts into the next phase's territory
there is no mechanism to carry that exploration forward, because each phase reads
only the prior phase's standalone artifact.

The design touches the three assisted-mode phase references and adds one shared
reference file beside them:

- `skills/radical-pipelines/reference/assisted-phases/1 - spec.md`
- `skills/radical-pipelines/reference/assisted-phases/2 - design-doc.md`
- `skills/radical-pipelines/reference/assisted-phases/3 - plan.md`
- a new shared reference file under `skills/radical-pipelines/reference/assisted-phases/`

It makes collaborative research reliably preserved within each assisted phase and
carried across the phase boundary so the next assisted phase can use it. It does
not change the autonomous (agent-driven) phases, the analyst agent definitions,
the artifact filenames, the phase ordering, the approval-file mechanism, the
completion predicate, or any other versioning machinery.

This is a documentation-engineering change: the "code" is skill prose, and the
governing constraints are the skill-authoring rules (minimalist, no duplication
within a reading path, generic, no unnecessary negatives, describe the system as
designed). The design below specifies the architecture of the edits and the
decisions behind them, not the final wording (phase 3 and beyond).

## Approach

The change rests on five coordinated moves, each anchored to a spec requirement:

1. **One concrete recording trigger, shared.** Replace sole reliance on "in real
   time, not in batches" with a concrete, settled-thread trigger: when a thread of
   exploration settles (a question or topic is resolved), before moving to the
   next, append the distilled entry. The design-doc and plan phases already carry
   this trigger *implicitly* in their topic loops (append the distilled entry after
   the owner decides); the design promotes it to an explicit rule and brings the
   spec phase — which today appends raw per-question Q&A with no distillation — to
   parity.

2. **A spec-phase home for collaborative exploration.** Add a `## Topics` section to
   `spec-research.md`, the spec-phase parallel of the design-doc/plan `## Topics`,
   holding owner-initiated questions, the explanatory exchanges that resolve them,
   and design-adjacent collaborative exploration as distilled per-settled-thread
   entries. The spec phase's Q&A guidance is updated to name owner-initiated
   dialogue as research worth preserving and route it into this new home.

3. **Advocate-vs-record carve-out.** Reword the "don't do the next phase's job"
   rules so they constrain *advocating for or committing to* a later-phase choice,
   while making clear that *recording* design-adjacent (or plan-adjacent)
   exploration that arose collaboratively with the owner is preserved.

4. **Forward-drift flag.** In the spec and design-doc phases, when discussion
   drifts into the next phase's territory, flag it to the owner and recommend
   running the next assisted phase once the current phase completes, while context
   is fresh. The plan phase carries no such flag — its next phase has no assisted
   form.

5. **Carry-across by research-file input.** The next assisted phase reads the prior
   phase's *research artifact* directly, added as a supplementary input. The
   assisted design-doc phase adds `1-spec/spec-research.md`; the assisted plan
   phase adds `2-design-doc/design-doc-research.md`. The prior standalone artifact
   remains the authoritative statement of intent; the research file is supplementary
   collaborative context.

The genuinely identical core of moves 1 and 3 (the recording trigger and the
advocate-vs-record principle) is extracted into a single new shared reference file
that all three phase files reference by name — the way they already reference
`pipeline-versioning.md`. Everything that legitimately differs per phase (the
recording unit and section name, the specific later-phase choices each phase must
not advocate, the forward-drift flag, the carry-across input) stays inline in the
phase files. This satisfies the de-duplication rule without flattening the
per-phase asymmetry the spec tells us to preserve.

## Components

The system here is a set of skill reference files in one reading path. The
"components" are those files and the new shared file.

### New: shared recording-and-record reference file

A new reference file under `skills/radical-pipelines/reference/assisted-phases/`,
referenced by name from all three assisted phase files. It holds exactly the two
rules that are identical across all three phases:

- **The recording trigger** — when a thread of exploration settles (a question or
  topic is resolved), before moving to the next, append the distilled entry; the
  recorded unit is a distilled per-settled-thread entry capturing the exploration
  and its outcome, not a raw transcript of every reply.
- **The advocate-vs-record principle** — the "don't do the next phase's job" rules
  constrain advocating for or committing to a later-phase choice; recording
  design-adjacent (or plan-adjacent) exploration that arose with the owner is
  preserved.

It holds nothing phase-specific: not the per-phase recording unit name, not the
section it lands in, not the particular later-phase targets each phase must not
advocate, and not the forward-drift flag.

### Modified: `1 - spec.md` (assisted spec phase)

- **`spec-research.md` structure** gains a `## Topics` section — the spec-phase
  parallel of the design-doc/plan `## Topics` — holding owner-initiated questions,
  the explanatory exchanges that resolve them, and design-adjacent collaborative
  exploration, recorded as distilled per-settled-thread entries. It reuses the
  skill's existing `## Topics` name and `### Topic:` entry shape, adapted to a
  lighter spec-phase shape (frame / exploration / outcome) since spec threads are
  not always multi-option decisions. `## Q&A` stays the requirements-oriented
  transcript and `## Research` stays the orchestrator's cited codebase reads.
- **Q&A-loop guidance** is updated to name questions the owner raises, and the
  explanatory exchanges that resolve them, as research worth preserving alongside
  the orchestrator's own questions, and to route them into the new `## Topics`
  home.
- **The "don't do the next phase's job" rule** ("MUST NOT propose design or
  implementation choices") is reworded to constrain advocating/committing only; the
  shared advocate-vs-record principle comes from the new shared file, while the
  spec phase keeps its specific later-phase targets inline (design and
  implementation).
- **A forward-drift flag** is added: when discussion drifts into design territory,
  flag it to the owner and recommend running the assisted design-doc phase once the
  spec phase completes.
- **A reference to the new shared file** is added, alongside the existing reference
  to `pipeline-versioning.md`.

### Modified: `2 - design-doc.md` (assisted design-doc phase)

- **Inputs** gain `<artifacts-folder>/1-spec/spec-research.md` as supplementary
  collaborative context, beside the existing authoritative input `spec.md`.
- **The recording trigger** is sourced from the new shared file; the existing
  implicit topic-loop trigger is made consistent with it. The recorded unit stays
  the distilled `## Topics` entry.
- **The "don't do the next phase's job" rule** ("MUST NOT write the implementation
  plan") is reworded to constrain advocating/committing only, with the shared
  advocate-vs-record principle from the new shared file and its specific later-phase
  target (the implementation plan) inline.
- **A forward-drift flag** is added: when discussion drifts into plan territory,
  flag it to the owner and recommend running the assisted plan phase once the
  design-doc phase completes. This is distinct from, and sits alongside, the
  existing backward scope-drift handler (which routes the owner back to revise the
  spec).
- **A reference to the new shared file** is added, alongside the existing reference
  to `pipeline-versioning.md`.

### Modified: `3 - plan.md` (assisted plan phase)

- **Inputs** gain `<artifacts-folder>/2-design-doc/design-doc-research.md` as
  supplementary collaborative context, beside the existing authoritative inputs
  `spec.md` and `design-doc.md`.
- **The recording trigger** is sourced from the new shared file; the existing
  implicit triggers in both topic loops (code-plan and doc-plan) are made
  consistent with it. The recorded unit stays the distilled `## Topics` entry.
- **The "don't do the next phase's job" rules** ("MUST NOT write code or
  documentation content") are reworded to constrain advocating/committing only,
  with the shared advocate-vs-record principle from the new shared file and the
  specific later-phase targets (tests, code, and documentation content) inline.
- **No forward-drift flag.** The plan phase's next phase (code) has no assisted
  form, so the flag naturally stops here.
- **A reference to the new shared file** is added, alongside the existing reference
  to `pipeline-versioning.md`.

### Untouched (by design)

The autonomous phase references, the analyst agent definitions
(`agents/spec-analyst.md`, `agents/design-doc-analyst.md`, and the rest), the
standalone artifacts `spec.md` / `design-doc.md` / `code-plan.md` / `doc-plan.md`,
the artifact filenames, the phase ordering, the approval-file mechanism, and the
completion predicate in `pipeline-versioning.md`. Autonomous mode is a separate
reading path, never loaded with the assisted path, and is structurally protected
from this failure mode; its parallel recording instructions are knowingly left as
they are.

## Interfaces and Data Flow

The interfaces in this domain are the cross-file references between skill files and
the inputs each phase reads.

### Shared-file reference (the cross-file "interface")

The three phase files already point at `pipeline-versioning.md` by name for the
completion predicate. The new shared file uses the same idiom: each phase file
references it by name, and reads it conditionally when the assisted phase runs. The
shared file is the single source for the recording trigger and the
advocate-vs-record principle; the phase files supply the phase-specific specifics
inline. Project-specific conventions (stored in `.rp.md`) are deliberately *not*
used as the home for these rules — they are skill-authored, not project-authored.

### Carry-across data flow (the new cross-phase read)

```
spec phase (session A)
  └─ writes spec-research.md  ──┐ committed with phase 1, persists on disk
     writes spec.md            │
                               │
design-doc phase (session B)   │
  ├─ reads spec.md           ◀─┘  (authoritative input — unchanged)
  ├─ reads spec-research.md  ◀─────(NEW supplementary collaborative context)
  └─ writes design-doc-research.md ─┐ committed with phase 2, persists
     writes design-doc.md           │
                                     │
plan phase (session C)               │
  ├─ reads spec.md, design-doc.md ◀──┘ (authoritative inputs — unchanged)
  └─ reads design-doc-research.md ◀────(NEW supplementary collaborative context)
```

Each research artifact is committed with its phase and the artifacts folder
persists across sessions, so the prior phase's research file is reliably on disk
when the next assisted phase runs in its own session. The new input is read as
supplementary collaborative context — the prior standalone artifact remains the
authoritative statement of intent, and the research file is not a second source of
truth.

### Recording trigger (the within-phase control flow)

Inside each phase's topic/Q&A loop, the trigger fires at the resolution of a
settled thread: explore the thread with the owner → the thread settles → append the
distilled entry to the phase's recording section → move to the next thread. In the
spec phase the settled thread may be an orchestrator question, an owner-initiated
question, or a design-adjacent exploration; the first lands in `## Q&A`, the latter
two land in the new `## Topics`. In the design-doc and plan phases the settled
thread is a topic and the entry lands in `## Topics` (or `## Code Plan Topics` /
`## Doc Plan Topics`).

## Key Decisions

### Decision: Carry-across by research-file input

- **Choice:** The next assisted phase reads the prior phase's *research artifact*
  directly, added as a supplementary input to the assisted phase only. The assisted
  design-doc phase adds `1-spec/spec-research.md`; the assisted plan phase adds
  `2-design-doc/design-doc-research.md`. The input is framed as supplementary
  collaborative context; the prior standalone artifact remains authoritative.
- **Alternatives:** (a) Fold the carried research into the standalone artifact the
  next phase already reads. (b) Introduce a dedicated hand-off file distinct from
  both the research and standalone artifacts.
- **Trade-offs:** Folding into the standalone artifact needs no new input but
  contradicts the standalone guarantee asserted in ~10 places across all three
  reading paths and leaks research into the out-of-scope autonomous writers and
  reviewers — the standalone artifacts are read by a large downstream fan-out
  spanning both reading paths and the agent definitions. A dedicated hand-off file
  keeps the standalone artifacts clean but introduces new artifact machinery
  (against the spec's scope) and duplicates material the research file already
  holds. Reading the research file directly stays entirely inside the in-scope
  assisted reading path, leaves the standalone artifacts and the autonomous path
  untouched, and carries the full distilled research losslessly; its only cost is a
  second input file at phase start and a new cross-phase read shape (no phase reads
  a prior phase's research file today).
- **Traces to:** Requirement 5 / Acceptance criterion 7. The scope guarantee
  (Acceptance criterion 10) is upheld because the standalone artifacts and the
  autonomous path are not touched.

### Decision: One shared file for the identical cross-phase rules (hybrid extraction)

- **Choice:** Extract only the genuinely identical core — the recording trigger and
  the advocate-vs-record principle — into one new shared reference file under
  `assisted-phases/`, referenced by name from all three phase files. Each phase file
  keeps its own specifics inline (its recording unit and section name, and the
  particular later-phase choices it must not advocate).
- **Alternatives:** (a) Restate the rules in each of the three files (matching
  today's precedent, where "in real time, not in batches" is written out three
  times). (b) Extract everything, including phase-specific specifics, into the
  shared file.
- **Trade-offs:** Per-file restatement keeps each file fully self-contained but
  reproduces the same instruction three times — exactly the divergent-copy risk the
  skill-authoring rules forbid within one reading path; the existing triple "in real
  time" line is latent de-dup debt, not a licence to add more. Extracting everything
  would flatten the real per-phase asymmetry the spec requires preserving and force
  per-phase carve-outs into the shared file (e.g. a "plan phase: not applicable"
  note), adding negative phrasing. Hybrid extraction honors the de-duplication rule
  for the identical core while keeping the legitimate differences inline; its cost
  is one extra conditional read per assisted run and the rule living a hop away from
  the steps that apply it.
- **Traces to:** Requirement 7 / Acceptance criterion 9 (no duplication across a
  single reading path), in service of Requirement 1 and Requirement 3 (the rules
  that must be consistent across the three phases); supports Requirement 6 /
  Acceptance criterion 8 (consistency without flattening asymmetry).

### Decision: Spec-phase `## Topics` home for collaborative exploration

- **Choice:** Add a `## Topics` section to `spec-research.md`, the spec-phase
  parallel of the design-doc/plan `## Topics`, holding owner-initiated questions,
  the explanatory exchanges that resolve them, and design-adjacent collaborative
  exploration as distilled per-settled-thread entries. Reuse the existing `## Topics`
  name and `### Topic:` entry shape, adapted to a lighter spec-phase shape
  (frame / exploration / outcome). `## Q&A` stays the requirements transcript and
  `## Research` stays the cited codebase reads.
- **Alternatives:** (a) Reframe `## Q&A` to be two-directional and
  per-settled-thread. (b) Broaden `## Research` to also hold collaborative
  exploration.
- **Trade-offs:** Reframing `## Q&A` overloads it — it both feeds requirements
  synthesis and would carry design-adjacent exploration, risking leakage of
  out-of-scope exploration into the requirements-only `spec.md` and muddying the
  requirements transcript. Broadening `## Research` blurs its clean "codebase reads,
  sources cited" meaning, since collaborative exploration is not a cited codebase
  finding. A dedicated `## Topics` section reaches true parity with design-doc/plan
  using a term the skill already defines, keeps both requirement-feeding sections
  clean so design-adjacent exploration cannot leak into `spec.md`, and gives the
  carried-across material a precise home; its cost is one more section in
  `spec-research.md`.
- **Traces to:** Requirement 2 / Acceptance criterion 3 (a documented home) and
  Acceptance criterion 4 (owner-initiated dialogue named as recordable — met by the
  updated Q&A-loop guidance, not only the new heading); parity per Requirement 6 /
  Acceptance criterion 8.

### Decision: Explicit settled-thread recording trigger across all three phases

- **Choice:** Make the settled-thread trigger explicit and apply it to all three
  phases: when a thread of exploration settles (a question or topic is resolved),
  before moving to the next, append the distilled entry. This replaces sole reliance
  on "in real time, not in batches" and is the shared-file core. The recorded unit
  is a distilled per-thread entry, not a raw transcript.
- **Alternatives:** (a) A per-reply trigger (record before every reply). (b) Keep
  "in real time" and only add distillation guidance.
- **Trade-offs:** A per-reply trigger is the most reliable but produces a raw
  transcript and adds noise, which the spec forbids. Keeping "in real time" as the
  sole timing guidance leaves the no-concrete-moment failure unfixed. The explicit
  settled-thread trigger ties recording to a concrete, noticeable moment, records a
  distilled unit, promotes the implicit design/plan trigger to an explicit rule, and
  brings the spec phase to parity. "In real time, not in batches" is no longer the
  sole timing guidance; whether it remains as a secondary nudge or is dropped is a
  wording call for later phases, not a design fork.
- **Traces to:** Requirement 1 / Acceptance criterion 1 (concrete moment) and
  Acceptance criterion 2 (distilled unit, not a transcript); consistency per
  Requirement 6 / Acceptance criterion 8.

### Decision: Advocate-vs-record carve-out in the "don't do the next phase's job" rules

- **Choice:** Reword the rules so they constrain advocating for or committing to a
  later-phase choice, and place the identical advocate-vs-record principle in the
  shared file: recording design-adjacent (or plan-adjacent) exploration that arose
  with the owner is preserved. Each phase keeps its specific later-phase targets
  inline (spec: design and implementation; design-doc: the implementation plan;
  plan: tests, code, and documentation content).
- **Alternatives:** (a) Add a separate sentence to each rule explicitly permitting
  recording, leaving the prohibition wording as-is. (b) Leave the rules unchanged
  and rely on the new recording sections to imply recording is allowed.
- **Trade-offs:** Adding a separate permission sentence works but creates two
  adjacent clauses that can drift, and costs more words. Leaving the rules unchanged
  fails the requirement — the flat prohibition still reads as forbidding the
  recording the spec now requires. Rewording the rule itself changes its meaning
  rather than bolting on an exception, removes the standing contradiction, and lets
  the identical principle live once at the general level (the shared file), per the
  de-duplication rule. It follows the existing design-doc carve-out precedent ("MUST
  NOT write production code. Interface sketches and small illustrative snippets are
  fine").
- **Traces to:** Requirement 3 / Acceptance criterion 5; consistency per
  Requirement 6 / Acceptance criterion 8.

### Decision: Forward-drift flag in spec and design-doc, absent in plan

- **Choice:** Add a new inline instruction to the spec and design-doc phases only:
  when discussion drifts into the next phase's territory, flag it to the owner and
  recommend running the next assisted phase once the current phase completes, while
  context is fresh. The plan phase carries no such flag. The flag is kept out of the
  shared file and is distinct from the existing backward scope-drift handler.
- **Alternatives:** (a) Put it in the shared file with a "plan phase: not
  applicable" carve-out. (b) Fold it into the existing backward scope-drift handler
  as an extra branch.
- **Trade-offs:** Putting it in the shared file forces a two-of-three rule into a
  file meant for rules identical to all three, then needs a carve-out that adds
  negative phrasing — a worse fit. Folding it into the scope-drift handler conflates
  two distinct rules: the scope-drift handler is about scope the spec didn't ask for
  and routes the owner *backward*; the forward-drift flag is about a topic belonging
  to the *next* phase and routes *forward* (a cross-session recommendation, since
  continuing to a later phase happens in a separate session). A new inline
  instruction in the two phases where it applies matches the spec's "spec +
  design-doc only, absent in plan" shape exactly and reuses the established
  when-X-do-Y idiom.
- **Traces to:** Requirement 4 / Acceptance criterion 6 (present in spec and
  design-doc, absent in plan).

## Dependencies

- **Internal, structural:** All three phase files already reference
  `pipeline-versioning.md` by name; the new shared file reuses that same
  reference idiom, so no new mechanism is introduced — only a new file at the same
  level and three new by-name references to it.
- **The persistence guarantee:** The carry-across relies on each research artifact
  being committed with its phase and the artifacts folder persisting across
  sessions. This is existing pipeline behavior, not a new dependency to build.
- **The reading-path separation:** The design depends on the assisted and
  autonomous paths never being loaded together, which is how the skill routes runs
  today. No new dependency; the design must not violate it.
- **No external libraries, services, or runtime dependencies.** This is a skill-prose
  change.

## Failure Modes and Observability

This is documentation, so "failure modes" are ways the edits could violate the
skill's design or its authoring rules. Each is a regression to guard against in
review (phases 3-5), not a runtime condition.

- **Standalone-guarantee regression.** If carry-across were ever implemented by
  folding research into the standalone artifact, it would contradict the ~10
  standalone guarantees and leak into the out-of-scope autonomous path. *Guarded by:*
  the research-file-as-input decision keeps the standalone artifacts and the
  autonomous path untouched. The edits must add the research file only as an
  assisted-phase input, never as content inside a standalone artifact.
- **Shared-file over-extraction.** Pulling phase-specific specifics (unit names,
  per-phase later-phase targets, the forward-drift flag) into the shared file would
  flatten the asymmetry the spec requires preserving and force per-phase carve-outs.
  *Guarded by:* the hybrid decision — the shared file holds only the genuinely
  identical core; everything phase-specific stays inline.
- **Spec-phase leakage into `spec.md`.** Design-adjacent exploration recorded in the
  spec phase's new `## Topics` must not feed `spec.md` synthesis, which is
  requirements-only. *Guarded by:* the new section is collaborative context,
  separate from `## Q&A` and `## Consolidated Requirements`, which remain the only
  synthesis sources. The edits must leave the spec synthesis sources unchanged.
- **Duplication / divergent copies within the reading path.** Restating the shared
  rules inline in any phase file (instead of referencing the shared file) would
  recreate the divergent-copy risk the authoring rules forbid. *Guarded by:* the
  single shared file plus by-name references.
- **Detectability.** Each failure mode is observable by reading the resulting skill
  text against the acceptance criteria — the change has no runtime behavior to log
  or monitor. Review against the spec's acceptance criteria is the observability
  surface.

## Risks and Open Questions

### Risks

- **Autonomous-path divergence is intentional but may read as oversight.** The
  autonomous analyst agents carry parallel recording instructions left untouched (in
  scope only for assisted). After this change the assisted and autonomous recording
  instructions will differ; this is deliberate per the spec's scoping, but a future
  reader could mistake it for an inconsistency. Acceptable and noted for
  transparency; no mitigation needed beyond the explicit scoping.

### Open Questions (deferred to later phases — wording/naming calls, not design forks)

- **The shared file's filename and title.** Design fixes that it is a single shared
  file under `assisted-phases/` referenced by name from all three phase files; the
  exact name is a skill-authoring wording call for phase 3/4.
- **The exact entry shape of the spec phase's new `## Topics` home.** Design fixes
  the section name (`## Topics`) and its purpose; whether it mirrors the
  design/plan `### Topic:` fields verbatim or uses the lighter
  frame/exploration/outcome shape is a wording call for later phases.
- **How the carried-across research file is read.** Design fixes that it is read as
  supplementary collaborative context (not a second source of truth); whether the
  next phase reads it in full or is told to mine only its collaborative-exploration
  section is a wording call for later phases.
