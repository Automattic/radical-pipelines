# Architecture Plan — Working Document

Working document for the Radical Pipelines architecture overhaul. Captures the decisions
made in the planning conversation (Luis + Claude, July 2026) so the effort survives session
restarts. Updated as each workstream closes. Not part of the skill.

**Status legend:** ✅ locked · 🔶 in discussion · ⬜ pending

---

## Origin and triage

The effort started from a full review of the project (skill, agents, conventions, dogfood
config, open issues). Findings were triaged by Luis:

- **Issues opened** (independent of architecture work): A1 (`<artifacts-folder>` run-folder
  ambiguity), A3 (batch re-review semantics), A4 (rejection-loop iteration caps), A8
  (completion predicates missing primary artifact), A10 (spec-reviewer blocker protocol).
- **Absorbed into this architecture effort:** A2 (fork inheritance), A5 (merged-state
  determination), A6 (stale spec-consolidator), A7 (merge/close tail), B1 (revision
  right-sizing), B4 (multi-worktree model).
- **Dropped for now:** A9 (approval-file authorship / agent trust), B2/B3 (orchestrator
  monitoring, monitor capabilities), B5 (cross-machine concurrency), B6 agent-trust part.
- **Kept as amendment:** on #150 (guardrails as prose), exit-code gates remain a distinct
  kind, not dissolved into prose.
- **B7** (code gates on docs phases): a host-project convention concern, not RP's.
- **C/D findings** (dogfood drift, self-rule violations): consistency pass after the
  architecture changes land.

## Workstreams

| WS | Theme | Status | Absorbs |
|----|-------|--------|---------|
| 1 | Branch architecture | ✅ locked | A2, A5, B4, Mario's revision-grouping request, #153-adjacent |
| 2 | Phase structure | ✅ locked | #165, #87, #136, B1, A7-interface |
| 3 | Multilane | ✅ locked | #76 (superseded, rewrite), A6 |
| 4 | Blocker protocol & control flow | ⏸ future session | #80, acceptance-failure handling |
| 5 | Behavior verification | ⏸ future session | part of #165's verification axis |
| 6 | Deferred bucket (Integrate, quality tags, consistency pass, #150 amendment) | ⏸ future session | A7, #57, #59, #154, #163 |

Dependency spine: **WS1 → WS3** and **WS2 → WS3**; WS4/WS5 loosely coupled, land after WS2
settles names and shapes.

---

## WS1 — Branch architecture ✅ LOCKED

### 1a. Artifact folder: one per issue-pipeline family

- A single artifact folder per issue-pipeline family, produced by the **Artifact folder**
  convention from the base slug (e.g. the default `.pipelines/<slug>/`), **identical across
  all forks**. No version in the folder name; no copy, no move on fork.
- Cross-fork comparison = constant path, varying ref:
  `git show <ref>:<artifact-folder>/base/1-spec/spec.md`.
- A one-line **`pipeline.md` identity file** inside the folder records the pipeline version.
  The fork's first commit updates it — it is the legible fork marker in history and the way
  a merged, branch-deleted pipeline's version is recovered from main.

### 1b. Branches: two kinds, no pipeline-level branch

There is **no pipeline branch**. Branches exist at exactly two levels:

- **Run branches** — chained: each run branch starts at the tip of the previous run's branch
  (base starts at the start ref — see 1e). The pipeline's tip *is* its latest run branch;
  that is what merges to main. Nothing merges "back" into anything.
- **Lane branches** — forked off the run branch at phase start (spec / design-doc multilane).
  **Never merged**; they are the permanent, inspectable record of parallel work. Every lane
  writes to the *same canonical artifact path* on its own branch — lane identity lives in
  the ref, not the path. The consolidator reads all lane branches
  (`git show <lane-ref>:<path>`) and commits the consolidated artifact on the run branch.
  Lane worktrees are removed after consolidation; the branches stay (pushed).

**Naming grammar.** The **Branch names** convention produces the `<branch-base>` (project's
choice; may contain slashes for namespacing; **must not contain `_`**). Everything after it
is hardcoded skill grammar, with `_` as the structural separator (segments are kebab-case
internally, so `_` is unambiguous):

```
<branch-base>[_v<N>][_rev-<N>-<desc>][_<phase>-lane-<K>]
```

**`v1` and `base` are implicit** (omitted segments = defaults):

```
123-fix-checkout                                    v1 base
123-fix-checkout_rev-1-fix-something                v1 rev-1
123-fix-checkout_1-spec-lane-2                      v1 base, spec lane 2
123-fix-checkout_v2                                 v2 base
123-fix-checkout_v2_rev-1-fix-copy                  v2 rev-1
123-fix-checkout_v2_rev-1-fix-copy_1-spec-lane-2    v2 rev-1, spec lane 2
```

Parsing is deterministic: segment shapes are reserved (`v<digits>` = version, `rev-<N>-…` =
run, `<phase>-lane-<K>` = lane); omitted version → v1, omitted run → base. Implicit v1 also
matches today's unsuffixed v1 branches (less migration friction). Enumeration:
`git branch --list '<branch-base>*'`.

### 1c. Revision commit grouping (Mario's requirement)

The run branch *is* the grouping: all commits of revision N =
`git log <rev-N-branch> ^<previous-run-branch>`. Reviewer diff bases become **derivable and
stateless**: base = `git merge-base <run-branch> <previous-run-branch>`. This **replaces**
the captured "Revision base ref" bookkeeping in `pipeline-versioning.md` (no state carried
across re-dispatches; any reviewer recomputes the same answer).

### 1d. Worktrees: raw `git worktree`; orchestrator owns topology

- **Raw `git worktree` everywhere.** `EnterWorktree` / tool-specific enter-worktree
  mechanisms retired from the architecture.
- **The orchestrator owns all git topology; agents only occupy it.** The orchestrator
  creates every branch and worktree (including lane worktrees before lane agents spawn) and
  removes worktrees at the end (branches stay).
- **The orchestrator never changes directory.** It operates from wherever the session
  started, treats its cwd as read-only context, and addresses everything explicitly:
  `git -C <worktree> …`, absolute paths for reads/writes, `git show <ref>:<path>` for any
  branch. Its own writes (intent.md, run obligations) also go through absolute worktree
  paths — never its cwd. Inspectability needs addressing, not presence.
- **Agent placement, two tiers** (placement is asserted from the prompt, never assumed from
  where the agent wakes up):
  - *Tier 1:* spawn-time cwd where the tool supports it (per-tool **Team spawning**
    convention).
  - *Tier 2 (universal fallback):* the agent's step 0 is to move to the assigned worktree —
    its one sanctioned directory change, to an absolute path it was given — then never move
    again.
- **Anchors + verification:** every agent's Conventions block (`passing.md`) gains two
  required fields — **Worktree path** (absolute) and **Branch** — plus the standing rule:
  before the first write and before every commit, verify `pwd` is under the worktree and
  `HEAD` equals the branch; mismatch = stop-and-report, never cd-and-continue. (This is the
  concrete fix for #153.)
- Optional per-tool hardening (e.g. hooks mechanically rejecting writes outside the assigned
  worktree) may be noted in per-tool convention files; the generic model does not depend on
  it.

### 1e. Start refs: stacking and forks are first-class

The owner names the start ref; **default main**. A v1 base may start at main or at another
pipeline's run-branch tip (**stacking** — already done in practice, now legitimate). A
fork's base starts at the **cut commit** in the parent's history: the commit that added the
inherited phase's terminal artifact (the same per-phase completion predicate, addressed in
history). "Always branch from main" is deleted. Fork = branch-at-commit; A2 (inherited
phase-4/5 markers without the code) dissolves structurally because inherited history carries
the work itself.

### 1f. Lineage: ancestry primary, content as annotation

Two layers, answering two different questions:

- **Ancestry** (fork cut-points via `git merge-base`) answers *"what did this pipeline start
  from?"* — permanent and exact, even after either side rewrites the inherited artifact.
  This is the primary lineage record and the tree structure.
- **Content** (tree SHAs at the canonical artifact path, trivial thanks to 1a's uniform
  paths) answers *"what is still identical right now?"* — rendered as per-phase annotations
  on the tree: `inherited-identical` / `inherited-modified` / `parent-diverged`.

This **replaces** the content-only trie in `pipeline-versioning.md`. "Derived-from" is only
expressible via ancestry; content alone can say "different," never "modified from."
**Merged detection:** `git merge-base --is-ancestor <run-tip> <main>` (resolves A5).

### WS1 knock-ons (for the design/implementation phase)

- `pipeline-versioning.md` is rewritten by both WS1 and WS2 — land them as **one coordinated
  change**, not two passes.
- Resume, completion predicates, and per-run obligations (tracker updates, push at
  close-out) get re-expressed against **run branches** ("the pipeline's one branch and
  worktree" no longer exists as a stable single thing).
- `fork-pipeline.md` loses the temp-worktree copy procedure entirely.
- #104 (assisted revision of completed phases) becomes natural: fork at the cut commit,
  revise the inherited phase.
- Worktree naming/location conventions updated for multiple simultaneous worktrees per
  pipeline (run + lanes).

---

## WS2 — Phase structure ✅ LOCKED

Decided in principle by Luis:

- **Plans fold into their phases:** code plan moves into the Build phase, docs plan into the
  Document phase, as committed sub-checkpoints (plan + plan review) inside each phase. The
  standalone Plan phase disappears. Pipeline becomes
  **Intent → Spec → Design → Build → Document**.
- Rides together with **#165** (code→build, docs→document generalization + rename): same
  blast radius, one migration.
- **Integrate** (closure) liked as the eventual tail phase name; whether it is a phase at
  all is deferred — Luis to retrieve prior closure-phase notes.

### 2a. Migration posture ✅ LOCKED

**New pipelines only, skill written as if the old architecture never existed** (consistent
with the AGENTS.md no-transient-states rule). Old folders/branches remain inert history;
in-flight pipelines finish on the old skill version or are recreated.

### 2b. Plan-as-sub-checkpoint; no task-progress mechanism ✅ LOCKED

Explored and **rejected**: commit trailers (pollute the owner's commit convention,
complicate fork-mode cleaning), commit counting (fragile inference), and an
orchestrator-written task ledger (would be the system's first *derived* state artifact —
a restatement of facts git already holds; dual records invite desynchronization, a failure
class the project has deliberately never had).

Resolution — **files and commits, i.e. the work itself, remain the only source of truth**:

- **Plan approval:** `build-plan.md` / `document-plan.md` + their `-review-approved.md` are
  files in the phase folder — the existing predicate machinery as an inner gate. (These are
  primary artifacts, not derived state.)
- **Task progress: no dedicated mechanism.** Mid-phase resume is the orchestrator's
  research job: inspect the plan, the commits, and the diff; judge how far the phase got
  ("first two tasks done, third partial"); revert partial-task work; re-dispatch from there.
  Rare enough that investigative resume is acceptable; commit messages stay pure owner
  convention.
- Runtime task-list tools remain display, never state.
- Guardrail scope-filling duty moves with the planners into their phases (`passing.md`
  wiring).

### 2c. Research continuity ✅ LOCKED

The spec phase's consolidator produces a **consolidated `spec-research.md`** alongside the
consolidated `spec.md` — same filename as the N=1 case, so downstream is uniform: the design
phase always reads `spec.md` + `spec-research.md`, never knowing how many lanes produced
them. Absorbs #136's autonomous-side gap (assisted mode uses the same artifact).

### 2d. Self-sizing phases ✅ LOCKED

Not agent-judgment sizing — no agent ever decides "this is small." Three properties:

1. **No step is ever skipped; only prose volume varies.** Every phase runs research →
   artifact → adversarial review identically. Size is an *output of the evidence* (the sweep
   finds the forty doc references, or finds nothing), never an input from owner or agent.
2. **Reviewers gate minimal artifacts against the research record:** a minimal conclusion
   must be backed by a recorded, empty-handed sweep — a short artifact without the evidence
   trail is a rejection. The lazy path ("declare trivial, skip the sweep") is caught by the
   reviewer's independent codebase exploration. Zero new trust surface: it is the same
   coverage check that already catches silently dropped requirements, pointed the other way.
3. **The skill change is removing pressure toward length:** "omit empty sections" extends to
   all artifacts; "2–3 options" becomes "when real alternatives exist." A design doc saying
   "mechanical rename; no design decisions arose; no risks found" is legitimate *iff* the
   research record shows the work behind each "none."

Cost honesty: small tasks still pay full phase loops — cheaper than today (no separate plan
phase, shorter artifacts) but not build-only cheap. Deliberate price of the quality bar.
Absorbs #87 and B1 (revisions also state what their phases spec/design against).

### 2e. Run-level acceptance ✅ LOCKED — deferred to Integrate

Belongs to the future Integrate phase, designed **jointly with the blocker protocol (WS4)**:
its failure action *is* the backtrack-or-stop question, so the alarm shouldn't be designed
before deciding who answers it. Drift risk is real but low-likelihood — not urgent. Neither
the Document nor (for now) the Build reviewer takes it on.

---

## WS3 — Multilane ✅ LOCKED

Luis's notes (summarized): spec and design-doc phases can run as N **lanes**. Spec lanes are
**fully isolated** independent generations from the same intent (union of edge cases → more
complete spec). Design-doc lanes have two modes: isolated, or **sequential-divergent** (each
lane reads the previous designs and must produce a *different* one). Multilane is the
**internal default architecture** of both phases; today's behavior is the N=1 degenerate
case. WS1 provides isolation structurally: lane branches + lane worktrees; the consolidator
reads all lane branches; nothing is hidden by convention or deleted.

### The locked phase shape (both spec and design)

- **Each lane** runs the phase's full existing machinery independently on its lane branch
  (spec: analyst + researcher + writer + reviewer; design: same pattern) to a
  **lane-approved artifact** — same filenames as the run-branch case (`spec.md`,
  `spec-research.md`, `spec-review-approved.md`); lane identity lives only in the ref.
- **Consolidator** (one per phase: `spec-consolidator`, `design-doc-consolidator`; rebuilt
  from scratch — 3d) reads all approved lane artifacts *and their research records* off the
  lane branches; writes the consolidated artifact **and consolidated research** (2c pattern;
  applies to `design-doc-research.md` identically) on the **run branch**.
- **Final adversarial review** of the consolidated artifact on the run branch produces the
  phase's `-review-approved.md` (consolidation can introduce contradictions). On rejection
  the consolidator is relaunched with the rejection file (writer role in that loop).
- **Completion predicate unchanged in shape and location:** approved artifact on the run
  branch.
- **3a — N=1:** the lane branch *is* the run branch; consolidation skipped; the lane review
  *is* the phase review. One procedure, degenerate case. Today's behavior falls out exactly.
- **3b — per-lane review in BOTH phases** (Luis).
- **3c — divergent mode = same machinery, one different input rule** (chosen for internal
  simplicity, per Luis's delegation): lanes always fork from the run branch; isolated =
  parallel + empty input; divergent = sequential + earlier lanes' approved designs in the
  prompt with a must-differ instruction (read from their branches, never merged).
- **Decisions mechanism:** lane count (and isolated-vs-divergent for design) are per-phase
  Decisions collected at run start — the mechanism's original purpose.
- **Lean for the design phase to confirm:** drop the old TODO-marker exception in the
  consolidator rebuild — per-lane review makes unfillable gaps rare; the standard blocker
  protocol (WS4) covers the consolidator uniformly, removing the one carve-out in the
  workflow's blocker section.
- **3e:** #76 will be closed and superseded by a new issue **when the master plan is
  assembled** (not now).

---

## WS4 — Blocker protocol & control flow ⏸ FUTURE SESSION

**Resume point:** nothing decided yet; the three open decisions below, with Claude's leans
recorded. Should be settled before the Integrate phase is designed (2e depends on it), and
after it the consolidator's TODO-exception lean (WS3) gets confirmed.

- **4a. Taxonomy:** missing/contradictory input · false premise discovered downstream ·
  corrupted/unresumable pipeline · unreachable satisfactory endpoint (incl. failed
  run-level acceptance and exhausted iteration caps from the A4 issue).
- **4b. Backtracking policy** (the big one): always-stop-for-human vs. autonomous backtrack.
  Lean: **bounded autonomous backtrack** — a blocker naming the prior phase and smallest
  revision triggers a re-run of that phase with the blocker payload as revision input, at
  most once per phase transition per run; second occurrence escalates to the owner.
  Mechanically close to a revision run of an earlier phase.
- **4c.** Fold #80: protocol defined once, injected into spawn prompts (compatible with the
  profiles-don't-reference-files rule).

---

## WS5 — Behavior verification ⏸ FUTURE SESSION

**Resume point:** nothing decided; starts with Luis describing the pain points observed in
real runs. Guessed axes: evidence quality (screenshots/transcripts weak or skipped), living
only in the reviewer (should writers verify too?), collision with #165's
verification-chosen-by-artifact.

---

## WS6 — Deferred bucket ⏸ FUTURE SESSION (keep visible, don't design now)

- **Integrate / closure phase:** A7, #57, #59, #154, #163. Luis to retrieve prior notes.
  Architecturally low-coupling; can land after the sprint.
- **Conditional quality dimensions** (security / performance / migration) — no new phases.
  Sketch to keep: (1) spec/design phases **tag** the work when research shows a sensitive
  axis; (2) downstream reviewers get conditional review dimensions keyed off tags; (3)
  guardrails gain an optional tag scope (a gate runs only for pipelines carrying its tag).
  Tags flow through artifacts, staying inspectable.
- **Consistency pass** over the C/D findings (dogfood `.rp.md` drift, README drift,
  loader-table gaps, genericity-rule violations) after the architecture changes land.
- **#150 amendment:** exit-code gates stay a distinct guardrail kind.

## Canonical vocabulary (interface contract for all work packages)

**The vocabulary lives in `/GLOSSARY.md` (repo root) — the single source.** Every work
package uses EXACTLY those names; no synonyms. Agents propose glossary additions/changes in
their final reports; the orchestrator curates the file (never edit it from a work package).

Scope calls that accompany the vocabulary:

- **Phase reference files:** `autonomous-phases/1 - spec.md`, `2 - design-doc.md`,
  `3 - build.md`, `4 - document.md`; `assisted-phases/1 - spec.md`, `2 - design-doc.md`.
  Assisted mode covers ONLY spec and design-doc in v2 (the old assisted plan guide is
  dropped — assisted build-planning is a future follow-up issue). Approved by Luis.
- **`work-on-an-issue.md` options in v2:** resume / fork / revise only (merge and close are
  WS6; no dangling references). Approved by Luis.
- **Canonical cross-cutting texts** (anchor rule, self-sizing reviewer check, blocker
  payload) are appended below by work package #1 and copied VERBATIM by packages 4–7 into
  their agent profiles.

## Execution log (single PR plan)

Branch `architecture-v2` off trunk; one commit per work package; changeset + README in
package 8; Wave 4 = adversarial coherence pass; PR at the end references the epic issue.
Level 0: Fable/xhigh orchestrator (this session, reviews every diff, commits). Level 1:
Fable/high package writers (edit only, never git). Level 2: Opus research where available.

## Pending inputs from Luis

- Stamps on WS4 open decisions (4a–4c) — future session.
- Behavior-verification pain points (WS5) — future session.
- Prior closure/Integrate-phase notes (WS6) — future session.

## Master plan (the epic)

**Principle:** the skill is one prose document-web, so parallelism follows **file
ownership**, not concepts. Disjoint file sets per issue → clean merges; one shared core
defines the vocabulary; one final coherence pass kills the seams.

**Critical path: 1 → {2…7 in parallel} → 8 → 9.**

- **Wave 1 — #1 Core model rewrite** (blocks everything): `pipeline-versioning.md`,
  `SKILL.md`, `autonomous-workflow.md`, `assisted-workflow.md`. WS1+WS2 as one coordinated
  change: branch grammar, run chains, lane model, two-layer lineage, merged detection,
  five phases (`0-intent, 1-spec, 2-design-doc, 3-build, 4-document`), predicates,
  derivable diff bases, canonical wording of cross-cutting rules (anchor rule, self-sizing
  review check, blocker payload) that phase issues duplicate into profiles. Absorbs A1, A5,
  A8. Spec/design ≈ this document.
- **Wave 2 — six parallel issues, stacked on #1's unmerged tip (decision 1e), disjoint
  file ownership:**
  - **#2 Pipeline operations** — create/resume/fork/revision/work-on-an-issue. Absorbs A2,
    #104, investigative resume (2b).
  - **#3 Conventions & agent anchoring** — `conventions/*`, `health-monitoring.md`.
    Absorbs #153, #160, B4.
  - **#4 Spec phase multilane** — `1-spec` phase refs + `spec-*` agents incl. rebuilt
    `spec-consolidator`. Absorbs A6, A10, #136.
  - **#5 Design phase multilane + divergent mode** — `2-design-doc` phase refs +
    `design-doc-*` agents incl. new `design-doc-consolidator`. Absorbs #76 content.
  - **#6 Build phase** — new `3-build` phase ref + `build-plan-writer/reviewer`,
    `build-writer-tdd/e2e`, `build-reviewer`. Absorbs #165 code-side, A3. Out of scope:
    judgment-verification axis (needs #150 → WS6).
  - **#7 Document phase** — new `4-document` phase ref + `document-plan-writer/reviewer`,
    `document-writer/reviewer`. Absorbs #165 docs-side.
- **Wave 3 — #8 Repo & packaging** (small): `.rp.md`, README, `.claude-plugin` metadata,
  delete dead profiles, close superseded issues (#76, #160, #153, #136, A1/A3/A8/A10).
- **Wave 4 — #9 Coherence pass** (non-negotiable): fresh adversarial pass over the merged
  whole hunting cross-file contradictions, dangling references, terminology drift. Six
  parallel authors WILL leave seams; this is where they die.
- **Placeholders filed, not worked:** WS4 (blocker protocol), WS5 (behavior verification),
  WS6 (Integrate + quality tags + #150 amendment + C/D consistency pass).

Execution notes: run today's pipelines on the OLD installed skill (2a: new-pipelines-only;
don't update the installed skill mid-flight). #1 can run assisted (context already lives in
this session/doc) or autonomous-high; #2–#7 are ideal autonomous material — sharply scoped,
spec-ready, disjoint.

## Canonical cross-cutting texts (copy verbatim into agent profiles)

### Worktree/branch anchor rule (every agent profile)

Your prompt's `## Conventions` block includes your **Worktree path** (absolute) and
**Branch**. If you did not start inside your worktree, your first action is to move there —
once. Before your first write and before every commit, verify that your working directory is
under the worktree path and that `HEAD` equals the branch; on mismatch, stop and report —
never change directory or switch branches to fix it.

### Self-sizing review check (reviewer profiles)

A minimal artifact is legitimate only when the research record shows the investigation that
came back empty. For each "none" the artifact claims — no risks, no alternatives, no
affected areas — find the recorded sweep behind it; reject a minimal conclusion that lacks
that evidence.

### Blocker payload (every agent profile)

When a required input is missing, contradictory, or would force a choice that belongs to a
prior phase, stop and report a blocker with: what is missing or contradictory; which
prior-phase artifact must change to unblock you; and, if identifiable, the smallest revision
that would do so.
