# Design Research: Default output rules for generated code

This design promotes two always-on, enforced output rules into the Radical
Pipelines tool itself (issue #86):

- **Rule 1** — leave unchanged comments and unrelated prose untouched (R2).
- **Rule 2** — the host-project product is transparent to the pipeline (R3).

The host project here is Radical Pipelines itself; the "design" is a change to
the tool's own skill and agent prompts, not to runtime code. The decisions below
are about *where the rule text lives* and *how violations are detected and block
Code/Docs phase completion*.

## Research

### Architecture facts grounding the design (confirmed against the codebase)

Sources: `agents/*.md`, `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`,
`.../5 - docs.md`, `skills/radical-pipelines/reference/guardrails.md`,
`skills/radical-pipelines/reference/conventions/load.md`,
`skills/radical-pipelines/reference/conventions/passing.md`, `.rp.md`, `CLAUDE.md`.

- **Producing agents** (emit host-project product, then commit): `code-writer-tdd`,
  `code-writer-e2e` (Code phase), `docs-writer` (Docs phase). The spec's three agent
  names all match real profiles — no blocker on names.
- **Reviewers** (one fresh instance per batch, adversarial): `code-reviewer`,
  `docs-reviewer`.
- **How a phase reaches "complete":** *only* via reviewer approval. The reviewer
  writes `*-review-approved.md`; the orchestrator then checks a completion predicate
  (all changes + every `*-review-N-rejected.md` + `*-review-approved.md` + summary
  committed). There is no other gate. On rejection, only the flagged task IDs are
  re-dispatched; the loop repeats until approval. Reviewers are the natural seam
  for AC7 ("a violation blocks phase completion").
- **Enforcement layering today:** (1) writer self-checks before commit; (2) the
  per-batch reviewer rejects and returns affected task IDs.
- **Pre-existing narrower Rule 2** lives only at `agents/code-writer-tdd.md:33`:
  "Comments must be self-contained — never reference the spec, the plan, or any
  other artifact." `code-writer-e2e` and `docs-writer` have no equivalent. R7/AC8
  require replacing this with one consistent statement, with no overlapping versions.
- **Guardrails** (`reference/guardrails.md`) are *host-owned* exact commands judged
  by exit code, declared in `.rp.md`, optional. The tool cannot assume any specific
  guardrail exists, so a tool-default rule cannot be implemented as a guardrail gate.
- **Two CLAUDE.md constraints in tension for "state once" (R7/AC8):**
  1. "Agent profiles must not reference any skill file or `.rp.md`; an agent reads
     only its own profile and its initial prompt." → agents cannot share a rule by
     pointing at a common skill file.
  2. "If an instruction is repeated in multiple files, move it to a separate file
     the others reference" + "no duplication across reading paths." → the rule text
     should have a single canonical home, not be copy-pasted into 5 profiles.
  These resolve only at a level *above the agent profile* — the orchestrator inlines
  convention/prompt text into each agent's initial prompt (see `passing.md`), and the
  phase reference files are a single reading path for the orchestrator. See Topic:
  "Where the rules live / state-once mechanism".

### Precedent: how cross-cutting behavioral rules reach profiles today (analyst, pre-researcher)

The "stop and report blockers" / blocker protocol is the closest existing analog
to an always-on, tool-default behavioral rule that every producing/reviewing agent
must obey. Grep across `agents/*.md` shows it is **NOT** stated once in a canonical
file that profiles reference. Instead:

- Each profile **independently restates** the protocol, phrased to its own role,
  anchored by the shared phrase "per the workflow's blocker protocol" (e.g.
  `code-writer-tdd.md:63`, `docs-writer.md:67`, `code-reviewer.md:114`,
  `design-doc-writer.md:80`, and ~12 more). Each restatement carries the same
  required content (what is missing / which prior-phase artifact must change /
  smallest revision).
- This is forced by CLAUDE.md: "Agent profiles must not reference any skill file
  or `.rp.md`." A profile cannot point at a single shared definition, so the
  protocol's *operative content* is restated per profile, with a common phrase as
  the conceptual anchor.

Reading-path topology (confirmed): orchestrator reads SKILL.md → entry point →
autonomous-workflow → phase files; each agent reads only its own profile + its
orchestrator-built initial prompt. There is no agent-visible shared rules file.

**Implication for R7/AC8 "state once":** "once" must be read at the level where a
single reading path exists. Two candidate single-source homes:
1. **The agent-profile level**, accepting the project's established pattern: state
   the rules in the profiles, but consolidate to one consistent statement (and one
   anchoring concept) rather than the current ad-hoc narrower line in
   `code-writer-tdd.md:33`. "Once" = one consistent statement, no two *overlapping/
   conflicting* versions (matches AC8's exact wording: the narrower version "no
   longer exists as a separate, conflicting version").
2. **A skill-level single source** (phase files or a new reference file) that the
   orchestrator inlines into the producing/reviewing agents' initial prompts via
   the `## Conventions`-style block — keeping the canonical text in exactly one
   file, with agents receiving it at launch (not by reference). This satisfies both
   CLAUDE.md constraints (no profile→skill reference; no duplication across reading
   paths) most strictly. Pending researcher confirmation of the injection seam.

### Confirmed: the "state-once" delivery mechanism (researcher, this session)

The project has a clear, consistent precedent for an always-on, no-opt-out
behavioral rule that must reach multiple agents — the **blocker protocol**:

- **Canonical text lives once in a skill reference file the orchestrator reads**,
  not agents: `autonomous-workflow.md:66-80` ("## 6. Handle blockers") defines the
  protocol and its 3-field payload. Zero other "blocker" definitions exist in
  `skills/`.
- **The agent-facing obligation is restated in each profile that must act on it.**
  ~14 profiles each carry their own copy of the "stop and report a blocker"
  obligation + 3-field payload, phrased to the agent's role (e.g.
  `code-writer-tdd.md:63`, `docs-writer.md:67`, `code-reviewer.md:114`).
- **A shared name-handle ties the two halves together** without a profile pointing
  at a skill file: every profile says "per the workflow's blocker protocol." This
  is a named concept, not a path. `spec-consolidator.md:80` even documents an
  *exception* to "the standard blocker protocol" by name — proof the handle is a
  real shared referent.
- **Why not the `## Conventions` block?** That block is the *host-configurable*
  layer, sourced entirely from `.rp.md` (`load.md`, `passing.md`), and "Commit
  format" is omitted when undefined. The two rules are tool *constants* with no
  host config — they do not belong in the host-conventions channel. (`setup.md`
  has no "always-on, non-configurable" field; tool constants live in skill text +
  profiles.)

Launch-prompt standing-text surface for a producing/reviewing agent is exactly:
(a) the `## Conventions` block, and (b) the verbatim task block (+ on rejection,
the review-file path and scoped issues). Nothing else orchestrator-authored.

### Confirmed: Code and Docs are autonomous-only (analyst, assisted-workflow.md:21-22)

The assisted workflow can run **only** phases 1–3 (spec, design-doc, plan). Code
(phase 4) and Docs (phase 5) are explicitly "Can't be run in assisted workflow."
So the *only* path that produces host-project product runs through the autonomous
phase machinery and its agents. This bounds the design: the rules need to reach
exactly the autonomous Code/Docs producing agents + reviewers — the 5 profiles
`code-writer-tdd`, `code-writer-e2e`, `docs-writer`, `code-reviewer`,
`docs-reviewer`. There is no assisted producing path to also cover.

### Confirmed: the completion-predicate hook for AC7 (analyst, pipeline-versioning.md:36-51)

The phase-completion predicate is the mechanical hook AC7 attaches to:

| Phase    | Required-committed artifacts (the predicate)                       |
| -------- | ----------------------------------------------------------------- |
| 4 – Code | `4-code/code-review-approved.md` **and** `4-code/code-summary.md` |
| 5 – Docs | `5-docs/docs-review-approved.md` **and** `5-docs/docs-summary.md` |

`*-review-approved.md` and `*-summary.md` are written **only by the reviewer, only
on an approve verdict** (`code-reviewer.md:51-52,96`, `docs-reviewer.md:53-54,97`).
A writer's own commit never produces them. Therefore:

- **The sole path to "phase complete" is reviewer approval.** If a violation makes
  the reviewer reject, no approval file is written → predicate unsatisfied → phase
  cannot complete (AC7 satisfied *mechanically*, not by exhortation).
- The writer self-check is a first line of defense (catches violations before
  commit, fewer reject loops) but is **not** the gate — a writer can commit a
  violation; the reviewer is what stops the phase.

This makes the reviewer the load-bearing enforcement seam; the writer obligation is
prevention. See enforcement topic below.

### Confirmed: the project's "shared definition, referenced by name" pattern (analyst)

The skill hosts cross-cutting definitions in a single named reference file that
multiple orchestrator-read files point at by filename. Reference-by-name phrasing
is consistent: "per `pipeline-versioning.md`" (×11), "per `guardrails.md`" (×2),
"see `reference/health-monitoring.md`", "per `intent-format.md`". So the established
way to host one cross-phase definition is a dedicated `reference/<name>.md` pointed
at by name — not duplicating it into both phase files. This is the precedent for the
output-rules canonical home (favoring a single `reference/output-rules.md` over two
copies in `4 - code.md`/`5 - docs.md`). Profiles still cannot point at it (CLAUDE.md)
— they restate under a name-handle, exactly like the blocker protocol.

### Confirmed: the AC6 over-reach stress test exists in the real product (analyst)

Grep of the Radical-Pipelines product (the host that builds itself) shows the exact
content AC6/R4 protect, which a naive keyword or literal-path scan would wrongly
flag as a Rule 2 violation:

- `README.md` mentions "spec / design-doc / pipeline" ~40 times; `CHANGELOG.md` ~15;
  all legitimate product prose about the tool.
- `website/index.html` and `website/demo.js` literally contain the strings
  `spec.md`, `design-doc.md`, `code-plan.md`, `docs-plan.md`, `intent.md`, and even
  `.pipelines/` (e.g. `website/index.html:118-126,221,230`; `website/demo.js:12-65`)
  — as the host's own documentation/demo of the tool's artifact names.

None of these point at **this run's** artifacts (e.g. the literal path
`.pipelines/86-code-output-rules/base/1-spec/spec.md`); they are the host's own
legitimate vocabulary. This is the canonical AC6 test and the reason:
- a literal `<artifacts-folder>/...` path scan is *also* unsafe (it would hit
  `.pipelines/` in `website/index.html`), reinforcing the deterministic-check
  rejection; and
- the correct discriminator is **referent-based**: forbidden iff the reference's
  *referent is this run's actual pipeline process/artifacts/agents*, which the
  reviewer can check because it holds the run's concrete `<artifacts-folder>` path
  and reads the R4/AC6 carve-out. See the R4/AC6 topic below.

## Topics

### Topic: Approach — the end-to-end mental model (all requirements)

- **Spec link:** the whole feature; anchors R1/R7/R8.
- **Decision (the implementer's mental model):** This is a *prompt/skill* change to
  Radical Pipelines, not runtime code. Two always-on tool-default rules are promoted
  into the tool by:
  1. **One canonical statement** of both rules in the skill (a single shared,
     referenced-by-name home — see canonical-home topic), defining each rule, its
     reach, the R4/AC6 carve-out, and the R6 commit-message clause.
  2. **Restated obligations in the 5 Code/Docs profiles** under a shared name-handle
     (mirroring the blocker protocol), split by role:
     - Writers (`code-writer-tdd`, `code-writer-e2e`, `docs-writer`): *obey + self-
       check before commit*, and *write product commit messages with no pipeline-
       naming provenance* (R6).
     - Reviewers (`code-reviewer`, `docs-reviewer`): an **"Output rules"** check in
       step-2 that inspects the batch diff (Rule 1: untouched comments/prose; Rule
       2: this-run references in code/identifiers/strings/logs/docs) **and** the
       batch's product commit messages (R6), turning any violation into a must-fix,
       task-tagged rejection.
  3. **Remove** the narrower Rule-2 line at `code-writer-tdd.md:33` (AC8).
  4. **Reconcile the commit-format convention** (`setup.md`) so the `(agent-name)`
     provenance tag is documented as belonging to artifact-only commits, not product
     commits (R6/AC9).
- **Enforcement flow (AC7), reusing the existing gate unchanged:** writer commits →
  per-batch reviewer runs the Output-rules check → on violation, writes
  `*-review-N-rejected.md` with the issue tagged to the task → orchestrator
  re-dispatches only flagged tasks → loop until the reviewer approves and writes
  `*-review-approved.md`. Because the completion predicate requires the approved
  file, the phase cannot complete while a violation stands.
- **Rationale:** Adds nothing to the runtime architecture — no new gate type, no new
  artifact, no new completion predicate. It expresses the rules as tool defaults the
  way the project already expresses cross-cutting obligations, and enforces them
  through the one gate that already governs phase completion.

### Topic: Components — what changes, what is reused (R5, R7, R8, AC8)

- **Spec link:** R7 (across producing phases), R5 (surfaces), R8/AC7 (enforcement),
  AC8 (one statement, narrower removed).
- **Components and responsibilities:**
  - **NEW — `skills/radical-pipelines/reference/output-rules.md`** (canonical home,
    referenced by name). Holds the one authoritative statement of both rules:
    definitions, total reach (R3/R5), the R4/AC6 referent-based carve-out, the R6
    product-commit clause, and the enforcement note (reviewers gate on it).
  - **MODIFIED — producing profiles** `agents/code-writer-tdd.md`,
    `agents/code-writer-e2e.md`, `agents/docs-writer.md`: add the obey + self-check
    obligation (consistent wording, name-handle) and the product-commit-message R6
    clause. `code-writer-tdd.md` *also* loses its narrower line 33 (replaced).
  - **MODIFIED — reviewer profiles** `agents/code-reviewer.md`,
    `agents/docs-reviewer.md`: add the "Output rules" step-2 check (Rule 1 + Rule 2
    over content, R6 over the batch's product commit messages), flowing into the
    existing Issues/reject/re-dispatch machinery.
  - **MODIFIED — commit-format convention** `reference/conventions/setup.md` (and
    any `.rp.md` example): provenance/agent tag on artifact-only commits, none on
    product commits. (`.rp.md` in this repo may also need its commit-format example
    reconciled — flagged as a sub-question.)
  - **MODIFIED — phase files** `autonomous-phases/4 - code.md`, `5 - docs.md`: gain
    a by-name pointer to `output-rules.md` in the reviewer-dispatch step, the way
    `summary-format.md` is already passed to reviewers (step 4 of each). This anchors
    the reviewer's Output-rules check to the canonical statement without the profile
    referencing a file.
  - **UNTOUCHED but relevant:** the completion predicate (`pipeline-versioning.md`)
    and the reviewer→orchestrator→re-dispatch loop (`4 - code.md`, `5 - docs.md`
    steps 4-6) are *reused as-is* — the enforcement needs no change there. The
    assisted workflow needs nothing (Code/Docs are autonomous-only). Planners,
    plan-reviewers, spec/design agents are untouched: they emit only pipeline
    artifacts, so AC9 lets their commits keep the agent tag and Rule 2 does not reach
    their output.
- **Rationale:** Minimal, precedent-aligned surface; every enforcement mechanism is
  reused, only the rule text and one convention are added/edited.

### Topic: Where the two output rules live — the "state once" home (R7, AC8)

- **Spec link:** R7 (rules stated once and consistently, replacing the narrower
  `code-writer-tdd.md:33` version), AC8 (one consistent statement; the conflicting
  narrower version no longer exists). Also R1/AC1 (always-on, every run).
- **Options:**
  1. **Conventions-block field** — inject the rules as an always-present field in
     the `## Conventions` block the orchestrator builds. Rejected: that block is
     the host-configurable layer (sourced from `.rp.md`); a tool constant there
     breaks the block's meaning and would imply host-overridability, which R1/Out-
     of-scope-3 forbid.
  2. **Skill-file reference the profiles point at** — one rules file all 5 profiles
     read. Rejected outright: CLAUDE.md forbids profiles from referencing any skill
     file or `.rp.md`; an agent reads only its own profile + initial prompt.
  3. **Profile-restatement under a shared name-handle, mirroring the blocker
     protocol** (chosen) — name the two rules ("the output rules" / give each a
     short handle), state the obligation in each of the 5 producing/reviewing
     profiles consistently (identical operative wording adapted to role), and put
     any orchestrator/enforcement-side canonical text once in a skill reference
     file the orchestrator reads. Remove the narrower `code-writer-tdd.md:33` line.
- **Trade-offs:** Option 3 physically repeats the rule text across 5 profiles, but
  that is the project's *established and accepted* norm for cross-cutting tool
  defaults (CLAUDE.md's no-duplication rule governs the skill's own reading paths,
  not the separate per-profile reading path). It is the only option compatible with
  "profiles read only their own profile," and it is exactly how every other always-
  on obligation is delivered. Options 1–2 violate explicit constraints.
- **Decision:** Adopt **Option 3**. Define the two rules as named tool defaults.
  State them consistently across the three producing profiles (`code-writer-tdd`,
  `code-writer-e2e`, `docs-writer`) — the obey + self-check side — and the two
  reviewer profiles (`code-reviewer`, `docs-reviewer`) — the enforce side. Replace
  the narrower Rule-2 statement at `code-writer-tdd.md:33` with the consistent
  wording so no overlapping version survives (AC8). Keep a single canonical
  statement of the rules (and the enforcement obligation) in the skill where the
  orchestrator/reviewers' shared understanding lives — see the enforcement topic
  for which file — under a shared name-handle (e.g. "the output rules").
- **Rationale:** Directly mirrors the blocker-protocol precedent, the project's
  proven pattern for an always-on obligation spanning many agents. Satisfies AC8's
  literal test ("stated once and consistently; the narrower version no longer
  exists as a separate, conflicting version") — "once" = one authoritative wording,
  as the blocker protocol is "one protocol" despite 14 restatements. Honors both
  CLAUDE.md constraints: no profile→skill reference, and the skill's own files keep
  a single canonical copy (no cross-path duplication within the skill).

### Topic: Canonical skill home for the rule text (R7, AC8)

- **Spec link:** R7/AC8 (one consistent statement, no overlapping versions), the
  CLAUDE.md no-cross-path-duplication rule.
- **Options:**
  1. **Both phase files** (`4 - code.md` + `5 - docs.md`) carry the statement.
     Rejected: that is two copies across two reading paths — the exact duplication
     CLAUDE.md forbids; the project's own answer to this is to extract a shared file.
  2. **A single new `reference/output-rules.md`** holding the canonical statement,
     pointed at by name (chosen). Matches the dominant established pattern —
     `pipeline-versioning.md` (referenced from ~15 files), `guardrails.md`,
     `intent-format.md`, and especially `summary-format.md`, which is *already*
     pulled into BOTH phase reviewers (`4 - code.md:37`, `5 - docs.md:37`) — the
     exact structural twin of "one definition, both producing-phase reviewers anchor
     to it."
  3. **Fold into `autonomous-workflow.md`** near the blocker protocol. Rejected:
     weaker precedent — that file is the orchestrator-loop *procedure*; the blocker
     protocol lives there because it is an orchestrator-loop concern. The output
     rules are a property of agent output enforced by reviewers, not an orchestrator-
     loop concern; co-locating them mixes concerns, and the project's habit is a
     dedicated named file per cross-cutting concept.
- **Decision:** Create **`skills/radical-pipelines/reference/output-rules.md`** as
  the single canonical statement of both rules (definitions, total reach per R3/R5,
  the R4/AC6 referent-based carve-out, the R6 product-commit clause, and the
  enforcement note that reviewers gate on it). Reference it **by name** from the
  orchestrator-read context that hands reviewers their job — at minimum the two
  phase files point reviewers at it the way `summary-format.md` already is (the
  orchestrator passes/anchors its content for the reviewers' Output-rules check).
  The 5 agent profiles do **not** reference the file; they restate the obligation
  under the shared name-handle "the output rules" (blocker-protocol device).
- **Rationale:** Single canonical copy in the skill (no cross-path duplication),
  reached by the orchestrator/reviewers exactly the way every other cross-cutting
  definition is, while the profile-level "state once" is satisfied by the name-handle
  + consistent restatement. Note: "state once" lands at two coordinated levels — one
  canonical skill file (`output-rules.md`) and one consistent restatement per profile
  tied to it by name. This is identical to the blocker protocol (canonical text in
  one file + per-profile restatement under "the workflow's blocker protocol").

### Topic: Rule 2 over-reach — the this-run discriminator (R4, AC6, AC4)

- **Spec link:** R4 (Rule 2 targets *this run's* process, not a vocabulary; must not
  flag legitimate host content, incl. the Radical-Pipelines repo itself), AC6
  (legitimate host content not flagged), AC4 (the forbidden cases in code content),
  Out-of-scope #2 (no general vocabulary ban).
- **The problem:** A token-based check (keyword or even literal `<artifacts-folder>`
  path scan) over-reaches catastrophically on this very repo, the canonical AC6
  fixture. Confirmed real, legitimate content a naive check would wrongly flag:
  - `README.md:5` "a **pipeline** of defined **phases** ... produces ... **artifacts**";
  - `README.md:43` "a wrong assumption in the **spec**, a missing constraint in the
    **design doc**" — uses AC4's exact phrasings, legitimately;
  - `README.md:112` literally lists all 18 agent names (`code-writer-tdd`,
    `docs-writer`, ...) as product documentation;
  - literal `spec.md`/`design-doc.md`/`code-plan.md`/`.pipelines/` strings in
    `website/index.html` and `website/demo.js`, and across the skill's own docs, as
    type-level documentation of the tool's own artifact *types*.
  ~1637 vocabulary occurrences across `skills/`+`agents/`+`README.md`.
- **Decision — referent-based discriminator (no options; this is the only sound
  framing the spec allows).** Rule 2 forbids a reference whose **referent is *this
  run's* pipeline process, artifacts, or agents**, specifically:
  1. a pointer to *this run's actual* artifact files or artifacts-folder path
     (e.g. the concrete `.pipelines/<this-slug>/.../spec.md`);
  2. a reference to a phase or plan-task *of this run* ("implements task 4.2 of this
     code plan", "in the Docs phase");
  3. narration of the *writing agent's own* task/process (a comment explaining code
     in terms of the task the agent was given);
  4. any claim the output was produced by the pipeline or its agents (incl. an
     agent-name provenance tag).
  It explicitly does **not** flag the tool's vocabulary, nor a host project (incl.
  the Radical Pipelines repo) documenting pipeline concepts or its own artifact
  *types* in general.
- **Why it is checkable:** the reviewer holds three anchors — (i) the run's concrete
  `<artifacts-folder>` path (from the `## Conventions` block) to test "is this *this
  run's* instance?"; (ii) the spec's R4/AC6 carve-out; (iii) the diff, which makes
  process/provenance narration (cases 3-4) detectable regardless of vocabulary,
  because "the agent that wrote this" is intrinsically this-run. The README is the
  AC6 regression fixture: every example above fails the this-run-referent test (they
  are type-level / about the tool in general), so they correctly pass Rule 2; a
  comment like "// added per task 3 of the code plan" passes the referent test and is
  correctly flagged.
- **Rationale:** Only a referent-based rule satisfies R4/AC6 and Out-of-scope #2
  simultaneously; a token-based rule cannot (it flags the fixture). The rule text in
  `output-rules.md` and the profile restatements must encode the referent test and
  name the this-run anchor, and should cite the type-level-vs-this-run distinction so
  the writer/reviewer applies it consistently.

### Topic: Enforcement mechanism — deterministic vs reviewer-style vs hybrid (R8, AC7)

- **Spec link:** R8 (compliance enforced, not advised; a violation blocks the
  phase from completing), AC7 (a Rule 1 or Rule 2 violation is detected and blocks
  Code/Docs completion until resolved). The spec explicitly defers this choice.
- **Options:**
  1. **Deterministic check (a tool-shipped command gate).** Rejected on two
     independent grounds. (a) *No mechanism:* all guardrail gates are host-declared,
     optional (`load.md:22` Required?=No), authored as `.rp.md` blocks
     (`guardrails.md:13-22`), and only passed down when the host declared them
     naming the agent (`passing.md:10`). There is no channel for the *tool* to ship
     a mandatory gate independent of host config; adding one is a new architectural
     concept. (b) *Not command-decidable:* Rule 1's live line is "gratuitous tidy
     of untouched content" vs "comment legitimately updated because its own code
     changed" (AC3) — a semantic judgment a diff cannot make. Rule 2's line is
     "pointer to *this run's* spec.md" vs "the host's legitimate word 'spec'"
     (R4/AC6, incl. Radical-Pipelines-as-host) — also semantic. A literal
     `<artifacts-folder>/...` path scan would catch only the narrowest slice and
     still has no mechanism to run.
  2. **Reviewer-style check** (chosen). The `code-reviewer` and `docs-reviewer`
     already are the *sole* gate to phase completion (approval is the only path to
     `*-review-approved.md`; no approve → predicate unsatisfied → phase blocked).
     They already inspect the batch diff base→HEAD (`code-reviewer.md:20`,
     `docs-reviewer.md:21`) — so Rule 1's changed-vs-unchanged hunks are visible;
     already read the spec and know `<artifacts-folder>` — so Rule 2's run-specific
     scoping and the R4/AC6 carve-out are in hand; and already turn any finding into
     a must-fix, task-tagged rejection that re-dispatches only the flagged tasks
     (`code-reviewer.md:84-93,102,109-110`). An output-rules violation is just
     another finding on the same machinery. This is the *same* enforcement style the
     project already trusts for every semantic check (Acceptance coverage, design
     alignment, scope creep, convention compliance) — none of which is a command.
  3. **Hybrid (reviewer + deterministic assist).** Rejected as the primary
     architecture: the deterministic half has no mechanism to run as a tool default
     (see option 1a), so it cannot be relied on. A host *may* add its own guardrail
     that happens to scan for artifact paths, but the tool cannot ship or assume it.
- **Trade-offs:** Reviewer-style is judgment-based, so it inherits the reviewer's
  fallibility (a violation could slip past a given review pass) — but that is true
  of every check the gate already performs, and the adversarial "reject liberally"
  posture is the project's accepted answer. It reuses 100% of existing
  infrastructure (no new mechanism, no new artifact, no new completion predicate).
  Deterministic would be objective where it applied, but it cannot exist here and
  could not decide the rules' hard cases even if it did.
- **Decision:** **Reviewer-style enforcement, with a writer-side self-check as
  prevention.** Two layers, mirroring how the project already works:
  1. **Prevention (writers):** `code-writer-tdd`, `code-writer-e2e`, `docs-writer`
     obey both rules and self-check their own output before committing (this is the
     obey side of the Topic-1 profile statement). Prevention reduces reject loops
     but is *not* the gate.
  2. **Enforcement (reviewers, load-bearing):** `code-reviewer` and `docs-reviewer`
     each gain an **"Output rules"** check in their step-2 "Review the changes"
     checklist, covering Rule 1 and Rule 2. A violation is a must-fix issue tagged
     to the offending task, producing a reject; the orchestrator re-dispatches the
     flagged tasks; the phase cannot reach `*-review-approved.md` until the
     violation is gone. This *is* the AC7 blocking mechanism, reusing the sole
     existing gate.
- **Rationale:** It is the only option that is both feasible (a tool-default
  deterministic gate does not exist in this architecture) and correct for the rules'
  inherently semantic decisions (AC3, R4/AC6). It rides entirely on the existing
  gate-to-completion path, satisfying AC7 mechanically (no approval file ⇒ no
  completion) without inventing a new enforcement concept. The two-layer
  writer-prevent / reviewer-enforce split matches the project's established pattern
  (writer self-checks + adversarial batch reviewer).

### Topic: Commit-message provenance — R6 vs the host commit-format convention (R6, AC9)

- **Spec link:** R6 (a product commit's message must not reference the pipeline,
  phases, artifacts, or agents — *including any provenance tag that would name
  them*; boundary holds in both fork and in-repo modes), AC9 (artifact-only commits
  are exempt and may carry the provenance tag).
- **Findings (researcher, this session):** The commit-format convention's *default*
  is `<commit-description> (<agent-name>)`, passed verbatim to every agent
  (`setup.md:54-60`). So every product commit on the pipeline branch reads e.g.
  `Add parser (code-writer-tdd)` — the parenthetical literally names a pipeline
  agent, the exact thing R6 forbids on a product commit. The `artifacts-in-fork`
  upstream transform strips attribution, but *only at PR time and only in fork mode*
  (`setup.md:129-135,150-160`); `artifacts-in-repo` has no transform
  (`setup.md:106-122`), so the tagged commit is the permanent product commit.
  R6 says the boundary "holds the same whether ... a separate fork or directly in
  the upstream repository" (spec:62) — so the fork transform alone cannot satisfy
  R6. Reviewers do not read product commit messages today (`code-reviewer.md:31`
  only checks *conformance* to the host format).
- **Options:**
  1. **Rely on the fork transform.** Rejected: refuted by R6:62 (must hold in
     in-repo mode, which has no transform) and it leaves fork-branch product commits
     tagged.
  2. **Reviewer checks product commit messages for R6 only**, leaving the host
     format untouched. Problem: if the host's configured format injects
     `(agent-name)` on every commit, the reviewer would have to reject every run for
     faithfully following the host's own commit-format convention — two tool
     instructions in direct conflict. Insufficient alone.
  3. **The two output rules + R6 govern product-commit message *content*; the
     provenance tag is confined to artifact-only commits** (chosen). Rule 2 already
     reaches "the commit message of any commit that introduces host-project product"
     (R6). The design states, as part of the output rules, that a **product commit's
     message carries no pipeline-naming provenance** (no agent tag, no phase/artifact
     reference), while an **artifact-only commit may** (AC9). The producing agents
     write product commits, so their commit-message guidance must drop the agent
     parenthetical for product commits; reviewers/planners write artifact-only
     commits and keep it. The commit-format convention guidance (`setup.md`) is
     reconciled so its default no longer mandates the agent tag on product commits —
     i.e. the provenance tag is documented as belonging to artifact-only commits.
     Enforcement: the reviewer's "Output rules" check (Topic above) extends to the
     product commit messages in its batch (it already commits in-format and inspects
     the batch; reading the batch's product commit messages is a small, in-seam
     addition).
- **Trade-offs:** Option 3 touches more surface (the commit-format convention text
  + producing-agents' commit step + the reviewer check), but it is the only option
  that satisfies R6 in *both* storage modes and removes the standing
  default-format-vs-R6 conflict at its source. It preserves AC9 (artifact-only
  commits keep the tag) and preserves provenance where the spec allows it.
- **Decision:** Adopt **Option 3**. Treat "no pipeline-naming provenance in a
  product commit message" as part of Rule 2's reach (R6), enforced by the reviewer
  alongside the other output-rules content; confine the `(agent-name)` provenance
  tag to artifact-only commits; reconcile the commit-format convention so its
  guidance does not put the agent tag on product commits.
- **Rationale:** R6 is unambiguous that the boundary holds in in-repo mode, where no
  transform exists — so the only durable fix is to keep the provenance out of the
  product commit message at authoring time, exactly along AC9's product-vs-artifact
  line. Folding it into the output-rules/reviewer machinery avoids inventing a
  separate commit-message gate.
- **Open sub-question (logged below):** the precise wording the commit-format
  convention should use to express "agent tag on artifact-only commits, none on
  product commits," and whether the in-repo upstream/PR step needs any analogous
  note. Deferred to the implementation/plan phase.

### Topic: Interfaces and data flow — how the rule text reaches agents and how a violation flows (R7, R8, AC7)

- **Spec link:** R7 (consistent across agents), R8/AC7 (enforcement loop).
- **The "interfaces" here are prompt contracts, not code APIs.** Two delivery
  channels, both already used by the codebase:
  - **Skill → reviewer (orchestrator-inlined content).** Precedent: the orchestrator
    passes "the resolved content of `summary-format.md`" into each reviewer's launch
    prompt (`4 - code.md:37`, `5 - docs.md:37`); the reviewer profile then refers to
    "the summary format from your launch prompt" (`code-reviewer.md:18,96`) and never
    references the skill file. The output rules use the identical channel: the
    orchestrator inlines the resolved content of `output-rules.md` when launching
    `code-reviewer`/`docs-reviewer`, and the profile refers to "the output rules"
    (name-handle). This is the rule for keeping a profile free of skill-file
    references while still anchoring it to the single canonical statement.
  - **Profile-resident obligation (restated text).** The obey + self-check text in
    the three writer profiles and the "Output rules" check in the two reviewer
    profiles are written directly into the profiles (the blocker-protocol device),
    consistent wording, tied together by the "the output rules" name-handle.
- **Violation data flow (reuses the existing loop verbatim):**
  1. Writer emits product + commits (ideally clean after self-check).
  2. Reviewer's step-2 Output-rules check inspects: the batch diff (Rule 1: untouched
     comments/prose; Rule 2: this-run references in code/identifiers/strings/logs/
     inline+external docs) and the batch's product commit messages (R6).
  3. On any violation → a must-fix issue in the rejection file, **tagged to the
     offending task** (existing Issues schema, `code-reviewer.md:84-93`), verdict
     reject, file `*-review-N-rejected.md`.
  4. Reviewer reports the deduped flagged task IDs; orchestrator re-dispatches only
     those; the fresh writer reads the scoped issues and fixes them.
  5. Loop until the reviewer approves → writes `*-review-approved.md` + summary →
     completion predicate satisfiable. No approval file while a violation stands ⇒
     AC7.
- **Rule statement shape (the content interface of `output-rules.md`):** for each
  rule — name, the obligation, the reach (R5 surfaces), the carve-out (Rule 1: AC3
  "content the change did touch" is exempt; Rule 2: R4/AC6 referent test + this-run
  anchor), and the commit-message clause (Rule 2/R6). Writers read it as "what to
  produce / self-check"; reviewers read it as "what to flag."
- **Decision/Rationale:** Use the summary-format channel for skill→reviewer delivery
  and the blocker-protocol device for profile-resident text; reuse the existing
  reject/re-dispatch loop untouched. No new interface is invented.

### Topic: Dependencies (all requirements)

- **Spec link:** feasibility of the whole design.
- **Decision:** The design depends only on **existing, internal** mechanisms:
  the agent-profile reading path, the orchestrator's launch-prompt assembly
  (`passing.md`, phase files step 4), the reviewer→re-dispatch loop, the
  completion-predicate (`pipeline-versioning.md`), and the commit-format convention
  (`setup.md`/`.rp.md`). The shared-reference-file pattern (`output-rules.md`) reuses
  the `summary-format.md`/`pipeline-versioning.md` precedent. **No new external
  libraries, services, runtime code, tools, or new architectural concepts** (no new
  gate type, artifact, or predicate). This is purely prose changes to the skill and
  agent profiles.
- **Rationale:** Keeps the change feasible and low-risk; nothing new to install or
  build.

### Topic: Failure modes and observability (R8, AC7, AC6, AC3)

- **Spec link:** R8/AC7 (must reliably block), AC6 (must not over-flag), AC3 (must
  not over-flag Rule 1).
- **Failure modes:**
  1. **False negative — reviewer misses a violation** (judgment check; a subtle
     this-run reference or a tidy-of-untouched-comment slips through). Detection &
     surfacing: the standard pipeline mechanisms — the rejection/approval files are
     committed inspectable artifacts; a human can audit; the adversarial "reject
     liberally" posture and an explicit, anchored rule statement minimize misses.
     Residual risk accepted (same as every semantic check the gate already does).
  2. **False positive — reviewer flags legitimate host vocabulary** (AC6),
     especially Radical-Pipelines-as-host. Mitigation: the referent-based
     discriminator + the README/website fixture cited in `output-rules.md` so the
     reviewer applies the type-level-vs-this-run test; the rejection file names the
     specific finding, so a wrong flag is visible and correctable on the next pass.
  3. **Rule 1 over-reach** (flagging a comment legitimately updated with its code,
     AC3). Mitigation: the rule's carve-out is stated explicitly; the reviewer has
     the diff to see whether the comment's *own* code changed.
  4. **Commit-format conflict** (host's configured format still injects the agent tag
     on product commits). Mitigation: the convention reconciliation (commit-message
     topic) removes the conflict at the source; until a host updates `.rp.md`, the
     reviewer check would flag it — surfaced as a normal rejection, not a silent
     pass.
- **Observability:** No new logging surface; the pipeline's existing inspectable
  artifacts are the record — `*-review-N-rejected.md` (each violation, tagged to a
  task) and `*-review-approved.md` (clean gate). The Checks/Issues sections of the
  review files are where an output-rules finding appears.
- **Decision/Rationale:** Lean on the pipeline's existing artifact-based
  observability and the adversarial reviewer; the explicit anchored rule + fixture is
  the primary defense against both over- and under-flagging.

### Spec coverage map (every requirement & AC traces to a decision/component)

| Spec item | Served by |
| --------- | --------- |
| R1 / AC1 (always-on, no owner action, no opt-out) | Rules are tool defaults restated in profiles + canonical `output-rules.md`; not in the host-configurable conventions block. (state-once, canonical-home topics) |
| R2 / AC2 / AC3 (Rule 1: untouched comments/prose; carve-out for touched content) | Rule 1 statement in `output-rules.md` with AC3 carve-out; reviewer Output-rules check over the diff; writer self-check. (Rule statement shape, enforcement, failure-modes) |
| R3 / AC4 (Rule 2 total reach over code content) | Rule 2 statement (reach R5); reviewer inspects code/identifiers/strings/logs/inline docs. (over-reach, enforcement topics) |
| R4 / AC6 (this-run, not vocabulary; RP-as-host) | Referent-based discriminator + README fixture. (Rule 2 over-reach topic) |
| R5 (surfaces incl. external docs) | Reach in rule statement; docs-writer/docs-reviewer covered. (components, interfaces) |
| R6 / AC9 (commit messages; provenance tag; artifact-only exempt) | Commit-message provenance topic: tag confined to artifact-only commits, R6 part of Rule 2, reviewer checks product commit messages, convention reconciled. |
| R7 / AC8 (stated once, consistently; narrower line removed) | state-once (profile restatement + name-handle) + canonical-home (`output-rules.md`); remove `code-writer-tdd.md:33`. |
| R8 / AC7 (enforced; blocks completion) | Reviewer-style enforcement via the sole gate; no approval file while a violation stands. (enforcement topic, completion-predicate finding) |

## Open Questions

<!-- Unresolved sub-questions deferred to the implementation phases. -->

- **Commit-format convention rewording (R6).** Exact phrasing for "the
  provenance/agent tag belongs on artifact-only commits, not on product commits"
  in `reference/conventions/setup.md` (and any `.rp.md` example), without breaking
  the existing default for the many artifact-only commits. The decision (confine
  the tag to artifact-only commits) is settled; the minimal wording is a writer/
  plan-phase detail.
- **Naming of the rules.** Whether to give the two rules short handles (e.g.
  "Rule 1 / Rule 2", "the output rules") used consistently across the 5 profiles +
  the canonical skill statement. Recommended for the shared name-handle pattern;
  exact names are a writer-phase choice.
- **Exact orchestrator-pass wording in the phase files.** Whether `output-rules.md`
  content is passed to the reviewer as "resolved content" (like `summary-format.md`)
  or the reviewer is told to apply "the output rules" with content inlined — pick the
  phrasing that mirrors `summary-format.md` most closely. Writer/plan-phase detail.
- **Whether writers also need the canonical content inlined.** Writers must obey +
  self-check; their profile restatement may suffice, or the orchestrator may also
  inline `output-rules.md` content at writer launch (no current precedent for passing
  a skill-doc to writers beyond conventions). Lean on profile restatement;
  confirm in planning.

## Risks

<!-- Anything worth flagging to the design-doc-writer and downstream phases. -->

- **Judgment-based enforcement is inherently fallible (R8/AC7).** Both rules are
  decided by the reviewer's reading, not a deterministic gate (a tool-default gate is
  impossible here, and the rules are not command-decidable). A subtle violation can
  pass a given review. This is the accepted trade-off — it is how every semantic
  check in the pipeline already works — but downstream phases should not over-promise
  "guaranteed" detection; the guarantee is "the gate is instructed to detect and
  reject, and a violation cannot be approved once seen."
- **The "state once" / AC8 self-application.** R7/AC8 require ONE consistent
  statement. The chosen design intentionally restates per profile (blocker-protocol
  pattern); a reviewer of *this* feature could misread "stated once" as "one physical
  copy." The design-doc must explain that "once" = one canonical skill statement +
  consistent name-handled restatements, and that AC8's literal test (the narrower
  `code-writer-tdd.md:33` no longer exists as a *conflicting* version) is met. Risk:
  inconsistency drift between the 5 restatements over time — mitigated by the single
  canonical `output-rules.md` they all track and by the same name-handle.
- **Commit-format convention is host-owned (R6).** The fix reconciles the *tool's*
  guidance (`setup.md` default), but a host that has already configured a format with
  `(agent-name)` on product commits would, until it updates `.rp.md`, trip the
  reviewer's R6 check on every product commit. The design-doc should be explicit that
  the provenance tag is reframed as artifact-only, and that this is a change to the
  commit-format convention's *meaning*, not just the default string. For the Radical
  Pipelines repo itself (this host), `.rp.md`'s commit-format convention
  (`.rp.md:49-58`: "Include the name of the agent in parenthesis", e.g.
  `Add intent (orchestrator)`) needs the same reconciliation or the tool would flag
  its own product commits.
- **AC6 over-flagging on the self-hosting repo.** Because Radical Pipelines builds
  itself, the README/website/skill legitimately contain every flaggable token. If the
  referent-based discriminator is stated weakly, the reviewer will reject legitimate
  content and stall the phase. The README is the canonical regression fixture; the
  rule text must carry the type-level-vs-this-run distinction and the concrete
  this-run anchor. High-attention item for the writer and code/docs phases.
- **Scope boundary of Rule 1 "prose" in docs files (R2/R5).** Rule 1 covers
  "unrelated prose sections of a documentation file the change edits" — the
  docs-reviewer must distinguish the prose the task legitimately rewrote from
  untouched prose merely reflowed. The diff supports this, but the rule wording must
  make the "did the change touch this section" line clear to avoid AC3-style
  over-reach in docs.
