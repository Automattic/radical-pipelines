# Design Doc — Normalize issue content into the standard intent format when creating a pipeline

> Source spec: `1-spec/spec.md` (approved). This document is standalone: it can be read without the
> research record. The feature is a localized rewrite of one step in the radical-pipelines skill
> itself — `skills/radical-pipelines/reference/create-pipeline.md` step 4. That skill, its `agents/**`,
> `README.md`, and `.rp.md` are the codebase under change.

## Overview

Radical Pipelines is an orchestrator skill that takes a software issue through six sequential phases
(Intent → Spec → Design doc → Plan → Code → Docs), each producing an inspectable artifact. Phase 0
("Intent") turns the originating issue into `0-intent/intent.md`, the self-contained artifact that seeds
every later phase. That artifact is created by the pipeline-creation flow, whose reference procedure lives
in `skills/radical-pipelines/reference/create-pipeline.md`. Step 4 of that procedure ("Generate the
initial intent") is the only thing this feature changes.

Today step 4 says "Adapt the issue content into the intent" with no guaranteed output structure and no
owner-confirmation step. The shape of `intent.md` therefore tracks the shape of the originating issue: an
issue authored in this project's canonical format yields a clean artifact, while a free-form third-party
issue (prose, no headings, discussion spread across comments and links) yields a poorly structured one.
Downstream phases then start from inconsistent inputs.

This feature makes phase-0 creation **always** produce `intent.md` in the canonical
**Goal / Constraints / Context / Assumptions** format, regardless of the issue's original shape. The
orchestrator reads the full picture — the issue body, all comments, and the content of any linked or
external references — and synthesizes it into that format. Because synthesis is a judgment call, the owner
**confirms** the proposed `intent.md` before it is committed. The single exception: when the issue is
*already* canonical, carries *no* comments, and has *no* references in its body, there is nothing to
synthesize — the body maps to `intent.md` directly and confirmation is skipped.

The change is confined to step 4 of the creation flow. Forking, resuming, the issue-authoring flow, and
phases 1–5 are untouched. Phase 0 always runs with the owner present (it completes before any autonomous
run begins), so the confirmation is a plain interactive exchange needing no special handling for the
autonomous "no questions" rule.

## Approach

Rewrite `create-pipeline.md` step 4 in place, between the existing "generate" and "commit" actions, as a
two-branch conditional that stays within the file's terse "workflow-driver" altitude. The rewrite has four
ingredients:

1. **A canonical-format framing + file template.** Step 4 states up front that `intent.md` is always
   written in the canonical format and specifies the file scaffolding explicitly (H1 = issue title, a
   `> Source:` attribution blockquote, then the body sections). This applies to both paths.

2. **A path-independent asset note, hoisted out of the branch.** The existing screenshot/asset download
   (download into `0-intent/`, reference by relative path) is stated once before the branch so it visibly
   applies to both paths, rather than being duplicated inside each.

3. **A skip gate stated as a declarative three-clause conjunction.** Confirmation is skipped only when all
   three clauses hold: (A) the body is structurally canonical, (B) the issue has zero comments, (C) the
   body contains no references. No evaluation order is mandated.

4. **A two-branch block.** **If all three hold**, map the body's sections to `intent.md` unchanged and
   proceed to commit without confirmation. **If any fails**, synthesize the intent from the full picture
   (delegating section-mapping to the canonical format definition), then run an iterate-until-approved
   confirmation loop showing the full proposed `intent.md`, committing only on explicit approval. The
   confirmation writes **no** approval/review file.

The existing `### 5. Commit` step fires unconditionally on both paths and is left unchanged. No neighboring
file is edited; all are verified to remain coherent.

Why this shape: it matches the dominant idiom of the terse workflow-driver files in this skill
(`work-on-an-issue.md`, `resume-pipeline.md`, `fork-pipeline.md`), which express two-way branches as bolded
inline `**If X**` / `**If Y**` bullets and hoist shared parts out of the branch rather than duplicating
them. The longer, heavily-sub-headed phase-execution references (`assisted-phases/*`) are a different
cluster and are deliberately *not* the model here.

## Components

The feature is documentation-as-behavior: the "components" are the skill files involved. Only the first is
edited; the rest are dependencies the design relies on or has verified coherent.

- **`skills/radical-pipelines/reference/create-pipeline.md` (EDITED).** Five-step reference procedure for
  the creation flow. Only **step 4** ("Generate the initial intent") changes — it grows from ~8 to roughly
  ~18–22 lines, gaining the file-template framing, the skip-gate conjunction, and the two-branch
  skip/synthesize block. Step 5 ("Commit") is unchanged.

- **`skills/radical-pipelines/reference/manage-issues.md` (REFERENCED, not edited).** Defines the canonical
  issue/intent format — Title (→ H1) / `## Goal` (required) / `## Constraints` / `## Context` /
  `## Assumptions / directions to explore` (optional, in that order; omit empty sections; no `N/A`). It
  also carries the input→section classification rule and the content guardrails (Goal as outcome,
  hypotheses labeled open, never substitute a different goal). Step 4 adds the **first** cross-reference to
  this file from another reference file, delegating both the heading taxonomy (for clause A) and the
  section-mapping rule (for synthesis) to it so the two never drift. This is the authoring flow and is out
  of scope to change.

- **The `.rp.md` "Issues" convention (RELIED ON, not edited).** A project-defined convention naming the
  issue tracker and the access mechanism for reading, commenting on, and updating issues. In this project
  it resolves to GitHub via the `gh` CLI, with Linear mirroring status only. All issue reads in step 4 are
  phrased "via the **Issues** convention" — `gh` and `--json` never appear in the skill body, keeping it
  project-agnostic.

- **`reference/pipeline-versioning.md` (RELIED ON, not edited).** Establishes that the phase-0 completion
  predicate is `0-intent/intent.md` committed (and nothing else), and the shared-root byte-identity
  invariant that makes `0-intent` the shared root across all pipelines of an issue. Both constrain the
  design: no approval file may be added.

- **`reference/fork-pipeline.md` (RELIED ON, not edited).** Forks copy `0-intent/` verbatim (`cp -r`),
  which is a third reason no approval file may be written.

- **Verified-coherent neighbors (not edited):** `work-on-an-issue.md` (its pointer to `create-pipeline.md`
  picks up the rewrite automatically), `autonomous-workflow.md` / `assisted-workflow.md` (phase 0 stays
  "Already in place"; the "no questions" rule is scoped to *after* run-start, structurally after creation),
  `SKILL.md`, `README.md`, and all `agents/**` (every intent-touching agent consumes `intent.md` read-only;
  phase 0 has no agent profile).

## Interfaces and Data Flow

Step 4 is invoked from `work-on-an-issue.md` step 2 — always an interactive context, always with the owner
present, before the workflow-mode choice and before any autonomous run starts.

Inputs the orchestrator reads (all via the **Issues** convention's access mechanism, except external URLs):

- **Issue body** — the markdown body of the originating issue.
- **Issue comments** — all comments, counted for clause B and read in full for synthesis. Counted strictly
  against the GitHub issue (the source of truth); comments mirrored elsewhere (e.g. Linear) are not
  considered.
- **Referenced content** — for synthesis only: the content that references in the body or comments point
  to. External URLs are read via the active tool's web-fetch capability; GitHub cross-references via the
  **Issues** convention. References discovered *inside* fetched sources are **not** followed further
  (one level only).
- **Issue assets** — screenshots and attachments, downloaded into `0-intent/` and referenced by relative
  path, on both paths.

Output: `0-intent/intent.md` (plus any downloaded assets), committed by step 5. The source issue is never
modified.

### Control flow

```
Step 4: Generate the initial intent
  ├─ Create 0-intent/; the file is written in the canonical format with the standard
  │  H1 (issue title) + > Source: attribution + body sections.        [template — both paths]
  │
  ├─ Download any issue assets into 0-intent/, reference by relative path.  [hoisted — both paths]
  │
  ├─ Evaluate the skip gate (unordered conjunction):
  │     A: body is structurally canonical
  │     B: issue has zero comments
  │     C: body contains no references
  │
  ├─ If A AND B AND C all hold:
  │     map body sections → intent.md unchanged; NO synthesis; NO confirmation; proceed.
  │
  └─ If any of A, B, C fails:
        synthesize from body + all comments + referenced content (one level);
          sort each piece into its section per manage-issues.md;
          comment/reference material is not more authoritative than the body;
          add no requirements / technical direction / implementation details.
        show the FULL proposed intent.md to the owner (optional "what was drawn in" note);
          on a correction request → revise and show again; repeat;
        proceed only on explicit approval. Write NO approval/review file.

Step 5: Commit  — fires unconditionally on both paths; unchanged.
```

### The `intent.md` file template (both paths)

```
# <issue title>

> Source: <reference to the originating issue>. This file is self-contained;
> agents do not need to open the issue.

## Goal
<required, non-empty>

## Constraints          (optional)
## Context              (optional)
## Assumptions / directions to explore   (optional)
```

Empty sections are omitted; no `N/A` placeholders. A body of Goal alone is a complete, valid intent. On
the skip path the body sections are reproduced verbatim under this scaffolding; on the synthesis path they
are the synthesized result.

### Skip-clause evaluation detail

- **Clause A (canonical body) — a four-point structural check:** (i) a non-empty `## Goal`; (ii) every
  section present is one of the four headings spelled exactly as in `manage-issues.md`; (iii) sections in
  the prescribed order; (iv) nothing outside those sections (no preamble prose under the H1, no extra or
  unrecognized headings). The issue title is metadata (→ H1) and does not participate. A Goal-only body
  passes. Purely structural — no judgment of whether the Goal "reads as an outcome."

- **Clause B (no comments) — a strict zero-count** over GitHub comments via the **Issues** convention. Any
  comment, from any author, for any reason, fails it. Author and substance are not assessed.

- **Clause C (no references) — a body-only scan.** Counts as a reference: an external URL (`http(s)://…`)
  or a GitHub cross-reference to another issue/PR (short `#N`, long `owner/repo#N`, or a full GitHub
  issue/PR URL). Does **not** count: @-mentions, embedded images / attached assets (the `![…]` form,
  already handled by the asset-download step), and links to files in the repository. Evaluated against the
  body only.

## Key Decisions

Each decision states the Choice, the Alternatives considered, the Trade-offs, and what it Traces to.

### KD-1 — Rewrite step 4 in place within the terse workflow-driver idiom

- **Choice.** Keep step 4's single `### 4.` heading and one-sentence-bullet altitude. Express the two paths
  as bolded inline `**If …**` conditionals. Do **not** add `### Skip path` / `### Synthesis path`
  sub-headings.
- **Alternatives.** (a) Sub-headings per path; (b) a decision table; (c) splitting the logic into a new
  reference file.
- **Trade-offs.** The inline-conditional idiom is what the neighboring driver files use
  (`work-on-an-issue.md`, `resume-pipeline.md`, `fork-pipeline.md`); sub-headings belong to the longer
  phase-execution cluster and would read as out-of-band here. Tables are reserved for dispatch to named
  reference files, not for in-step branching. A new file would over-fragment an 8-line change. The cost is
  that step 4 carries more inline prose than its neighbors' steps, accepted because the altitude and idiom
  still match.
- **Traces to.** Req 14 (change sits in step 4, between generate and commit); the "reads like its
  surroundings" guardrail.

### KD-2 — Hoist shared concerns out of the conditional; do not duplicate

- **Choice.** State the asset/screenshot download once as a path-independent concern *before* the branch;
  leave the final commit as the already-separate step 5, reached by both paths. The conditional block
  covers only skip-evaluation and [synthesize + confirm].
- **Alternatives.** Repeat the asset step and the commit inside each branch; or cross-reference ("also do
  step X below").
- **Trade-offs.** Hoisting matches the established pattern (shared preamble stated once before a fork in
  `autonomous-workflow.md`; shared trailing clause after the fork in `resume-pipeline.md`). No file in this
  skill repeats a shared sub-step in both branches. The minor cost — the reader holds the shared parts in
  mind across the branch — is the prevailing convention.
- **Traces to.** Req 14 (asset download preserved unchanged on both paths); req 9–10 (a single commit gated
  by the path).

### KD-3 — Skip clause A is a four-point structural check against the four `manage-issues.md` headings

- **Choice.** A body is canonical iff: non-empty `## Goal`; every present section is one of the four exact
  headings from `manage-issues.md`; correct order; nothing outside those sections. Point at
  `manage-issues.md` as the heading source rather than re-listing the format. No tolerance for heading
  variants. Goal-only passes.
- **Alternatives.** (a) A semantic check (does the Goal "sound like an outcome?"); (b) tolerant matching of
  near-miss headings (e.g. `## Directions to explore`); (c) inlining the heading list into step 4.
- **Trade-offs.** Purely structural keeps the gate deterministic and matches the spec's explicit
  out-of-scope on semantic judgment; tolerant matching would blur the gate and risk skipping confirmation
  on a non-canonical body. Inlining the headings would let step 4 and `manage-issues.md` drift; delegating
  keeps a single source of truth. The cost of strictness: legacy non-canonical bodies (e.g. a
  `## Directions to explore` heading) correctly *fail* clause A and trigger synthesis — which is the
  desired behavior.
- **Traces to.** Req 6 (skip condition A); out-of-scope 6 (no semantic "already canonical" gate).

### KD-4 — Skip clause C is a body-only reference scan with structurally-checkable exclusions

- **Choice.** Count external URLs and GitHub issue/PR cross-references (`#N`, `owner/repo#N`, full URL) as
  references. Exclude @-mentions, embedded images/attached assets (`![…]`), and repo-file links. State this
  as design-altitude prose, not a literal regex. Body only.
- **Alternatives.** A literal regex in the skill body; or counting all links (including repo-file links and
  images) as references.
- **Trade-offs.** Excluding the `![…]` asset form keeps clause C orthogonal to the asset-download step (KD-2)
  — assets are downloaded unconditionally regardless of this clause. Excluding repo-file links avoids
  treating in-repo code pointers (which later phases read directly) as "external references" that force
  synthesis. Prose over regex matches the file's what-not-how altitude and stays robust to markdown
  variation; the cost is the implementer must translate the prose into a concrete check, accepted because
  the exclusions are all structurally distinguishable in GitHub-flavored markdown.
- **Traces to.** Req 8 (skip condition C).

### KD-5 — All issue reads go through the abstract Issues convention; the comments read is net-new

- **Choice.** Phrase the body read, the comment count (clause B), and the full-comment read (for synthesis)
  as "via the **Issues** convention" / "the access mechanism captured by the **Issues** convention." Never
  bake in `gh` or `--json`.
- **Alternatives.** Name `gh issue view --json comments` directly in the skill for concreteness.
- **Trade-offs.** The convention abstraction keeps the skill portable across trackers (the project's
  `.rp.md` supplies the concrete `gh` mechanism); naming `gh` would couple the generic skill to one project.
  Reading comments is net-new behavior (no comment-reading step exists anywhere in the skill today), but it
  is "more of the same" tracker read — the convention already covers reading, so the pointer does not
  dangle. The cost is one layer of indirection for the reader, consistent with how the file already phrases
  asset downloads.
- **Traces to.** Req 2 (read body + all comments + references); req 7 (clause B — strict zero-count, no
  author/substance filter); out-of-scope 7 (no author/automation comment filtering); the
  project-agnostic guardrail.

### KD-6 — The skip gate is a declarative unordered conjunction

- **Choice.** State the gate as "confirmation is skipped only when all three clauses hold." Prescribe no
  evaluation order. All three holding **is** the definition of "no transformation" — there is no separate,
  independently checked "does the result transform the source?" notion.
- **Alternatives.** A sequenced/short-circuit evaluation order; or a separate post-synthesis check that the
  output "doesn't transform the source in any way."
- **Trade-offs.** A declarative conjunction matches the multi-condition idiom elsewhere in the skill
  (`assisted-phases/1 - spec.md`, `pipeline-versioning.md`) and is the cleanest realization of the spec's
  "exactly one gate, three clauses define it" rule. A separate "transforms in any way" check would create a
  second, contradictory gate. (Emergent, not mandated: clause C is reachable only when comments are zero,
  so the skip check needs only a comment *count*, never a full comment *fetch* — recorded as an observation,
  not a sequencing rule.)
- **Traces to.** Req 5 (exactly one gate; all-three-holding is the definition of "no transformation"); req
  9–10 (no escape hatch).

### KD-7 — Synthesis delegates section-mapping to `manage-issues.md`; one synthesis-specific note added

- **Choice.** On the synthesis path, sort each piece of source material (from body, comments, and fetched
  references) into its canonical section per the format in `manage-issues.md`, which supplies both the
  input→section classification rule and the content guardrails (Goal as outcome; hypotheses labeled open;
  never substitute a different goal). Keep the existing "do not add requirements, technical directions, or
  implementation details" guardrail. Add **one** synthesis-specific note (absent from `manage-issues.md`):
  material from comments or referenced sources is sorted the same way and is not more authoritative than the
  body merely because it appears later.
- **Alternatives.** Inline the full classification rules and guardrails into step 4; or omit the
  "not more authoritative" note and rely on the reader to infer it.
- **Trade-offs.** Delegation avoids duplicating (and risking drift against) the format definition, and it
  introduces the first cross-reference to `manage-issues.md`, consistent with the established "per `<file>`"
  idiom. The "not more authoritative" rule is synthesis-specific and not present in `manage-issues.md`, so it
  must be stated explicitly. Cost: the reader must follow one pointer to see the full classification rule —
  acceptable at this altitude.
- **Traces to.** Req 3 (section mapping; comment/reference material not more authoritative); req 4
  (faithful synthesis; no added requirements; Goal stays an outcome; hypotheses labeled open).

### KD-8 — The `intent.md` template is specified explicitly (title-as-H1 + source attribution), on both paths — correcting a legacy deviation

- **Choice.** Document the file scaffolding explicitly and apply it on both paths: **H1 = the issue title**;
  a `> Source: <issue reference>. This file is self-contained; agents do not need to open the issue.`
  attribution blockquote; then the body sections.
- **This deliberately corrects a legacy deviation.** The scaffolding was previously undocumented and the
  on-disk artifacts are inconsistent: some use the issue title as H1, but the two *most-recent* phase-0
  artifacts use the **phase name** (`# Intent` / `# Prompt`) as the H1, which contradicts the spec. This is
  a deliberate correction in the spec's favor, **not** an accident or an oversight to be preserved — any
  implementer should treat the title-as-H1 template as authoritative and the legacy phase-name H1 as the
  thing being fixed.
- **Alternatives.** (a) Keep the most-recent `# Intent` phase-name H1 for "consistency with recent
  artifacts"; (b) leave the scaffolding undocumented and let each run improvise.
- **Trade-offs.** Following the recent artifacts would entrench a spec-violating pattern; leaving it
  undocumented perpetuates the inconsistency that motivated the feature. Specifying it explicitly is net-new
  documentation but makes the artifact self-contained and uniform across both paths. The `> Source:`
  blockquote is the most-informative of the existing attribution patterns.
- **Traces to.** Req 1 (always canonical; title → H1; source attribution included); req 9 (incidental
  formatting differences such as title-as-H1 and the added attribution are not a transformation); the
  self-containment rule.

### KD-9 — Reading referenced content is phrased at capability altitude with an explicit one-level boundary

- **Choice.** On the synthesis path, read the content references point to — external URLs via the active
  tool's web-fetch capability, GitHub cross-references via the **Issues** convention — without naming a
  concrete tool. State the no-recursion boundary positively: references found in the body or comments are
  read; references found *inside* those fetched sources are not followed further.
- **Alternatives.** Name a specific fetch tool; or leave recursion unspecified.
- **Trade-offs.** Capability-altitude phrasing matches the file's what-not-how style and the fact that no
  reference file currently has a URL-fetch idiom; naming a tool would couple the skill to one runtime. The
  positive one-level statement is clearer than a "do not recurse" prohibition and bounds the read work.
  Cost: the orchestrator must map "web-fetch capability" to whatever tool is actually available — acceptable
  and consistent with the rest of the skill.
- **Traces to.** Req 2 (read the content references point to); out-of-scope 8 (no recursive
  reference-following).

### KD-10 — Confirmation follows the `manage-issues.md` idiom: show the full proposed `intent.md`, iterate until approved

- **Choice.** On the synthesis path, show the owner the **full** proposed `intent.md` as the primary review
  surface (never a diff or a bare change-list). The exchange is iterate-until-approved: the owner approves,
  or requests a correction, in which case the orchestrator revises the proposed `intent.md` and shows it
  again, repeating until explicit approval. An optional brief note on what was drawn from comments/references
  may accompany the artifact but never replaces it.
- **Alternatives.** A single yes/no prompt; or showing a diff / change-summary instead of the full artifact.
- **Trade-offs.** Showing the full artifact matches every existing approval point in the skill
  (`manage-issues.md`, the assisted-phase reviews); diffs appear only inside autonomous reviewer agents as
  internal mechanics, never owner-facing in place of an artifact. Iterate-until-approved (vs. single yes/no)
  lets the owner shape the synthesis. The optional summary is net-new and kept lightweight (no existing
  change-summary idiom to match). Cost: showing the full file each iteration is more verbose than a diff,
  accepted because the artifact is short and review of the whole thing is the point.
- **Traces to.** Req 11 (present the full proposed `intent.md`; optional summary may accompany); req 12
  (iterate-until-approved, commit only on explicit approval).

### KD-11 — No approval/review file is written; the gate lives in step 4, step 5 stays unchanged

- **Choice.** Confirmation is a transient gate on the single existing commit of `intent.md`; it produces no
  `intent-review-approved.md` or any other file — explicitly **not** the assisted-phase `-review-approved.md`
  pattern. The confirmation loop is the final sub-step of step 4's synthesis branch (the skill puts the
  approval rule in the *producing* step). The skip branch writes `intent.md` and proceeds directly. Step 5
  ("Commit") fires unconditionally on both paths and is left unchanged — no guard clause, no file list.
- **Three load-bearing reasons no approval file is written:**
  1. **Predicate.** The phase-0 completion predicate is `0-intent/intent.md` committed and nothing else —
     phase 0 is the only phase whose predicate is a single content file with no companion approval file, by
     design (it has no separate reviewer role).
  2. **Shared-root byte-identity.** `0-intent` is the shared root across every pipeline of an issue, matched
     by byte-identical tree SHA. A synthesis-path pipeline with an approval file and a skip-path one without
     would get divergent `0-intent` tree SHAs and be wrongly split in the lineage.
  3. **Fork copy.** Forks copy `0-intent/` verbatim (`cp -r`); an approval file would be inherited by every
     fork as a stale artifact pointing at the parent's confirmation session.
- **Alternatives.** Write an `intent-review-approved.md` companion (mirroring phases 1–5); or add a guard
  clause to step 5.
- **Trade-offs.** A companion file would make phase 0 look uniform with later phases, but it would violate
  all three invariants above. Putting the gate in the producing step (not the commit step) matches how the
  skill already structures approvals. Cost: phase 0's approval is structurally different from phases 1–5's —
  but that difference is intentional and pre-existing.
- **Traces to.** Req 13 (no persisted approval/review artifact; phase-0 completion condition unchanged);
  out-of-scope 2 (no persisted approval artifact).

### KD-12 — The change is confined to `create-pipeline.md` step 4; all neighbors verified coherent

- **Choice.** Edit only `create-pipeline.md` step 4 (its header description may gain a few words
  acknowledging the possible confirmation — still within the file under edit). Touch no other file.
- **Alternatives.** Add a "reading" sub-clause to `.rp.md`'s Issues convention; add an interactivity note or
  a "no questions" carve-out to `create-pipeline.md` / the workflow files; update an agent.
- **Trade-offs.** Every neighbor stays coherent without an edit: `manage-issues.md`'s "turns the issue into
  `intent.md`" description still holds (it describes *that* it happens, not *how*); `work-on-an-issue.md`'s
  pointer picks up the rewrite automatically; the workflow tables' "Already in place" for phase 0 stays
  accurate; the "no questions" rule is scoped to after run-start (structurally after creation) and literally
  cannot be in effect during phase 0, so no carve-out is needed; no agent creates or validates `intent.md`.
  Editing `.rp.md` is out of scope (it is the project convention file; the convention already covers reading)
  and is at most a future quality-of-life note. Confining the change minimizes blast radius and keeps the
  spec's scope boundary. Cost: the comments-read relies on the convention pointer rather than an explicit
  `.rp.md` clause — accepted, since reading is already exercised today.
- **Traces to.** Req 15 (fresh-creation only; fork/resume/authoring/phases 1–5 unchanged; no autonomous
  "no questions" handling); out-of-scope 3 (no change to forking); out-of-scope 4 (no change to issue
  authoring); out-of-scope 5 (no change to phases 1–5); out-of-scope 1 (no source-issue write — step 4 only
  reads the issue and writes `intent.md`).

## Dependencies

- **The `.rp.md` "Issues" convention** must name a tracker and an access mechanism that can read an issue
  body, count and read comments, and read GitHub cross-references. For this project that is GitHub via `gh`.
  The design relies on this convention already covering "reading" issues; if a project's Issues convention
  documented only create/modify, the comments-read pointer would need that gap filled — out of scope here.
- **A web-fetch capability** in the active runtime, used on the synthesis path to read external URLs found
  in the body or comments. Phrased at capability altitude; no specific tool is named.
- **`manage-issues.md`** as the canonical source for the section taxonomy and classification rules — step 4
  delegates to it rather than duplicating the format. If `manage-issues.md`'s headings change, clause A and
  the synthesis mapping follow automatically.
- **`pipeline-versioning.md` and `fork-pipeline.md` invariants** (single-file phase-0 predicate, shared-root
  byte-identity, verbatim fork copy) — the design depends on these to justify writing no approval file.

## Failure Modes and Observability

This is a documentation/behavioral change to an orchestrator skill; "observability" is what the owner sees
in the interactive session and in the committed artifact.

- **Misclassified skip gate (false skip).** The orchestrator wrongly judges a non-canonical body as
  canonical, or misses a comment/reference, and skips confirmation when it should synthesize. Mitigation:
  clause A is a strict structural check against exact headings (no tolerant matching), clause B is a strict
  zero-count (any comment fails), and clause C enumerates exactly what counts. The conservative direction is
  built in — strictness pushes borderline cases toward synthesis + confirmation, which is the safe path.
  Detection: the committed `intent.md` is inspectable; an owner reviewing it can see a missed comment's
  content absent.

- **Misclassified skip gate (false synthesis).** A genuinely canonical, comment-free, reference-free issue
  is sent through synthesis + confirmation unnecessarily. Cost is only an extra confirmation exchange (the
  owner is present anyway) and an `intent.md` that may closely resemble the body — which is acceptable and
  spec-sanctioned (resemblance never bypasses the gate). Lowest-harm failure direction.

- **Unfaithful synthesis.** The orchestrator introduces a requirement, technical direction, or design the
  source did not contain, promotes a hypothesis to a requirement, or substitutes a different goal.
  Mitigation: the kept `:26` guardrail plus the inherited `manage-issues.md` content rules (Goal as outcome,
  hypotheses labeled open, never substitute a goal), and — crucially — the confirmation gate itself: the
  owner reviews the full proposed `intent.md` before commit and can request corrections. Detection: the
  owner-facing confirmation surface is the full artifact, exactly so unfaithful additions are visible.

- **Recursion / unbounded reference reading.** Following references discovered inside fetched sources could
  balloon the read work. Mitigation: the explicit one-level boundary (KD-9). Detection: bounded by design.

- **Accidental approval-file creation.** An implementer might mirror the phases-1–5 pattern and write
  `intent-review-approved.md`, corrupting shared-root identity and propagating through forks. Mitigation:
  KD-11 records the three load-bearing reasons explicitly; the design states no approval file is written.
  Detection: a phase-0 folder containing more than `intent.md` (plus assets) is the visible symptom — every
  existing phase-0 folder holds exactly one content file.

- **Confirmation skipped/short-circuited on the synthesis path.** A single yes/no instead of
  iterate-until-approved, or committing before approval. Mitigation: KD-10 specifies the loop and "commit
  only on explicit approval"; the gate lives in the producing step so it is reached before step 5.

## Risks and Open Questions

- **Risk: step 4 carries more inline prose than its neighbor steps.** The two-branch block plus the file
  template makes step 4 the densest step in `create-pipeline.md`. Accepted: the altitude and idiom still
  match the workflow-driver cluster (KD-1); the alternative (sub-headings or a new file) would deviate more.

- **Risk: clause-evaluation precision depends on the implementer.** The skip clauses are stated as
  design-altitude prose, not literal checks. The implementer (phase 4) must translate "no external URL or
  GitHub cross-reference, excluding @-mentions / `![…]` assets / repo-file links" into a concrete check.
  Mitigation: every inclusion and exclusion is structurally distinguishable in GitHub-flavored markdown, and
  the conservative failure direction is toward confirmation.

- **Accepted limitation (from the spec, not introduced here): divergent intent across non-fork pipelines.**
  Two pipelines created from the same issue at different times via fresh creation (not forking) may
  synthesize slightly different `intent.md` files. This is pre-existing and structurally rare — the
  supported way to make a second pipeline for an issue is forking, which copies `0-intent` verbatim. Not
  addressed here (out-of-scope 9).

- **Deferred, not blocking: an `.rp.md` "reading an issue and its comments" sub-clause.** The Issues
  convention currently documents create/modify and run-status; reading is exercised implicitly. A future
  quality-of-life note could document the read mechanism explicitly, but it is not part of this feature
  (KD-12) and the design does not depend on it.

- **No open design questions.** All five design questions (DQ1–DQ5) were resolved in the research phase; this
  document realizes the resulting decisions (KD-1…KD-12) with full coverage of the spec's 15 requirements
  and acceptance criteria.

## Appendix — Proposed shape of the rewritten step 4

A HOW sketch at the file's terse altitude (not final copy; exact wording is the implementer's job in phase
4). It realizes KD-1…KD-12.

```
### 4. Generate the initial intent

Create the phase 0 subfolder (`0-intent/`) and write `intent.md` in the canonical intent format
defined in `manage-issues.md`: an H1 that is the issue title, a `> Source:` attribution noting the
originating issue and that the file is self-contained, then the body sections — `## Goal` (required)
followed by any of `## Constraints`, `## Context`, `## Assumptions / directions to explore`, in that
order, omitting empty sections (no `N/A`).                                          [KD-3, KD-8]

If the issue has screenshots or other assets, download them (using the access mechanism captured by
the **Issues** convention) into `0-intent/` and reference them by relative path — on both paths
below.                                                              [KD-2; preserves current :27]

Skip owner confirmation only when all three of these hold:
  - the issue body is already canonical: a non-empty `## Goal`, only the four recognized sections,
    in the prescribed order, with nothing outside them (the title is metadata and does not count);
  - the issue has no comments at all (read via the **Issues** convention; any comment fails this);
  - the body contains no external URL and no GitHub cross-reference to another issue/PR (short `#N`,
    long `owner/repo#N`, or a full GitHub issue/PR URL) — @-mentions, embedded images/attached
    assets (the `![…]` form handled above), and links to repo files do not count.   [KD-3,4,5,6]

**If all three hold**, map the body's sections to `intent.md` unchanged (under the title/attribution
above), do not synthesize, and proceed to commit without confirmation.            [KD-6; req 9]

**If any fails**, synthesize the intent from the full picture — the issue body, all of its comments,
and the content any references in the body or comments point to (external URLs via the active tool's
web-fetch capability, GitHub cross-references via the **Issues** convention; references found inside
those fetched sources are not followed further). Sort each piece into its section per the format in
`manage-issues.md`; material from comments or references is sorted the same way and is not more
authoritative than the body merely for appearing later. Do not add requirements, technical
directions, or implementation details. Then show the owner the full proposed `intent.md` (a brief
note on what was drawn in may accompany it); on a correction request, revise and show it again;
proceed to commit only after the owner explicitly approves. Write no approval or review file — the
confirmation gates the single commit of `intent.md`.            [KD-7,9,10,11; req 1–4,10–13]

The phase 0 subfolder must be self-contained.                            [preserves current :28]
```

`### 5. Commit` is unchanged.

## Requirement → design-decision traceability

| Spec req | Realized by | Notes |
|---|---|---|
| 1 (always canonical; title→H1; attribution) | KD-3, KD-8 | template specified explicitly; corrects legacy `# Intent` H1 |
| 2 (read full picture: body+comments+references) | KD-5, KD-9 | reads via Issues convention; URLs via web-fetch capability; one-level boundary |
| 3 (section mapping; not more authoritative) | KD-7 | delegate to `manage-issues.md`; one added synthesis note |
| 4 (faithful; no added reqs; Goal=outcome; hypotheses open) | KD-7 | keep `:26` guardrail + inherit `manage-issues.md` rules |
| 5 (one gate; predicate = "no transformation") | KD-6 | declarative conjunction; no separate "transforms" check |
| 6 (skip clause A — canonical body) | KD-3 | four-point structural check; exact `manage-issues.md` headings |
| 7 (skip clause B — no comments) | KD-5 | strict zero-count via Issues convention; no author/substance filter |
| 8 (skip clause C — no references) | KD-4 | body-only scan; structurally-checkable exclusions |
| 9 (all three hold → map verbatim, skip, commit) | KD-6, KD-8 | incidental formatting/H1/attribution not a transformation |
| 10 (any fails → synthesize + confirm; no escape hatch) | KD-6, KD-10 | failing clause = judgment exercised |
| 11 (show full proposed `intent.md`; optional summary) | KD-10 | full artifact primary; no diff |
| 12 (iterate-until-approved) | KD-10 | manage-issues idiom + "repeat until approved" loop |
| 13 (no persisted artifact; predicate unchanged) | KD-11 | three load-bearing reasons recorded |
| 14 (placement in step 4; assets preserved both paths) | KD-1, KD-2 | gate between generate and commit; asset bullet hoisted |
| 15 (fresh-creation only; fork/resume/phases 1–5 unchanged; no autonomous handling) | KD-12 | every neighbor verified coherent |
| Out-of-scope 1 (no source-issue write) | KD-12 | step 4 only reads the issue; synthesis writes only `intent.md` |
| Out-of-scope 2 (no persisted approval artifact) | KD-11 | confirmation is a transient gate; predicate unchanged |
| Out-of-scope 3–5 (no change to fork / authoring / phases 1–5) | KD-12 | every neighbor verified coherent and unchanged |
| Out-of-scope 6 (no semantic "already canonical" gate) | KD-3 | clause A is purely structural |
| Out-of-scope 7 (no author/automation comment filtering) | KD-5 | strict zero-count; any comment fails |
| Out-of-scope 8 (no recursive reference-following) | KD-9 | one-level boundary stated positively |
| Out-of-scope 9 (divergent intent across non-fork pipelines) | n/a — accepted limitation | not addressed; supported multi-pipeline path is fork |

### Acceptance-criterion coverage

| Acceptance criterion (Given …) | Covered by |
|---|---|
| Canonical body, no comments, no references → write, no confirm, commit | KD-3, KD-6, KD-8 (skip path) |
| Canonical, no references, but ≥1 comment → synthesize, show, confirm | KD-5 (clause B fails), KD-10 |
| Canonical, no comments, but body has URL / `#42` / `owner/repo#42` → read, synthesize, confirm | KD-4 (clause C fails), KD-9, KD-10 |
| Non-canonical body, no comments/references → restructure, show, confirm | KD-3 (clause A fails), KD-7, KD-10 |
| Body of only `## Goal` → treated as canonical, no confirm, commit | KD-3 (Goal-only passes), KD-6 |
| Body with only @-mention / screenshot / repo-file link → not references, all skip, commit (assets still downloaded) | KD-4 (exclusions), KD-2 (asset hoist) |
| Synthesis required + owner requests correction → revise, re-show, repeat, then commit | KD-10 |
| Synthesized text resembles original body → confirmation still requested | KD-6 (failing clause = no escape hatch) |
| Either path → only `intent.md` (+ assets) committed; no approval file; issue unmodified | KD-11, KD-12 |
| Synthesis path → adds nothing beyond source; Goal stays outcome; hypotheses labeled open | KD-7 |
| Fork or resume → phase 0 not re-derived; skip eval and gate not invoked | KD-12 |
