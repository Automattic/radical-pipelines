# Design Research — Normalize issue content into the standard intent format when creating a pipeline

> Source spec: `1-spec/spec.md` (approved — 15 requirements, 9 out-of-scope, Given-When-Then criteria).
> Background: `1-spec/spec-research.md`, `0-intent/intent.md`.
> This document records the design-phase Q&A and research used to derive the design decisions. Every
> decision traces to a spec requirement/criterion. The artifact under design is the radical-pipelines
> skill itself — specifically `skills/radical-pipelines/reference/create-pipeline.md` step 4.

## What the spec settled (design must realize, not relitigate)

- **ONE confirmation gate.** Confirmation is REQUIRED before `intent.md` is committed UNLESS all three
  skip clauses hold: (A) canonical body structure, (B) zero GitHub comments, (C) no body references
  (URLs / `#N` / `owner/repo#N`). All three holding **is the definition** of "no transformation" — there
  is no separate post-synthesis "transforms in any way" check. (spec req 5–10)
- **No new approval artifact.** Confirmation is a transient interactive gate on the single `intent.md`
  commit; the phase-0 completion predicate stays `0-intent/intent.md` committed. (spec req 13)
- **Change localized to `create-pipeline.md` step 4**, between generate and commit. Fork / resume /
  manage-issues / phases 1–5 untouched. Phase 0 always runs with the owner present, so the confirmation
  needs no special handling for the autonomous "no questions" rule. (spec req 14–15)

## Codebase facts established before the design Q&A (sources cited inline)

- **Target file: `skills/radical-pipelines/reference/create-pipeline.md`.** Five steps; step 4 ("Generate
  the initial intent", `create-pipeline.md:21–28`) is the only one that changes. Step 4 today:
  (a) creates `0-intent/`, writes `intent.md`; (b) "Adapt the issue content into the intent"; (c) "Do not
  add requirements, technical directions, or implementation details"; (d) downloads screenshots/assets
  via the **Issues** convention and references them by relative path; (e) requires the folder be
  self-contained. Step 5 (`:30–32`) commits via the **Commit format** convention.
- **Canonical format is defined in `manage-issues.md:14–22`** ("The issue format"): Title (→ H1) / Goal
  (required) / Constraints / Context / Assumptions / directions to explore (optional, in that order);
  omit empty sections, no `N/A`. "A vague idea yields just a Title and a Goal. That is a complete, valid
  issue" (`:22`). Section taxonomy + content rules for synthesis live at `manage-issues.md:17–20, 52–54,
  28–31, 58`. The same file is the authoring flow — out of scope to change, but it is the canonical
  reference the design points at for the section taxonomy.
- **Issues convention is project-defined in `.rp.md`**, not hardcoded in the skill. `.rp.md:9–11`: GitHub
  is the source of truth, accessed via the `gh` CLI; Linear mirrors status only. `setup.md:62–66` frames
  the convention generically ("which tracker … and how to access it (CLI like `gh`, MCP, API token)").
  Design implication: the skill body must phrase reads/scans in terms of the **Issues** convention's
  access mechanism, not bake in `gh` literally — `.rp.md` supplies `gh` for this project.
- **Phase-0 completion predicate = `0-intent/intent.md` committed** (`pipeline-versioning.md:27`); no
  approval file (unlike phases 1–5). Confirmed empirically: every existing phase-0 folder holds exactly
  one file (e.g. `.pipelines/68-…/0-prompt/prompt.md`). Adding an approval file would also break the
  shared-root byte-identity invariant (`pipeline-versioning.md:38,66`) and fork copy
  (`fork-pipeline.md` `cp -r`). (spec req 13; spec-research Q6c)
- **Folder/file naming note:** existing artifact folders on disk are `0-prompt/prompt.md` (pre-#109
  rename); the working-tree `create-pipeline.md` already says `0-intent/intent.md` (post-#109). The
  design targets the current working-tree naming (`0-intent/intent.md`).
- **Confirmation is a plain interactive exchange.** `create-pipeline.md`'s only caller is
  `work-on-an-issue.md` step 2 (`:39`), which runs before the workflow-mode choice (step 3) and before
  any autonomous run starts (step 4). Phase 0 is "Already in place" in both workflow tables
  (`autonomous-workflow.md:39`, `assisted-workflow.md:17`). (spec req 15; spec-research Q1)
- **Existing approval idioms to match in tone:** `manage-issues.md:60–62` ("Render … show it to the
  owner. Do not write … until the owner explicitly approves"); `assisted-phases/1 - spec.md:118` and
  `2 - design-doc.md:142` ("Iterate … Repeat until the owner explicitly approves"). The phase-0 gate
  reuses this idiom but writes NO approval file (it is creation-time, not a reviewer verdict).

## Design questions (all resolved — see Q&A and Design Decisions below)

- DQ1 — Step 4 control-flow shape so it reads like the surrounding reference prose. → DD-1, DD-2. ✓
- DQ2 — How each skip clause is concretely evaluated (reads/scans) and ordering. → DD-3,4,5,6. ✓
- DQ3 — Synthesis-path procedure (full-picture read, section-mapping, file template) and asset placement.
  → DD-7,8,9; DD-2 reaffirmed. ✓
- DQ4 — Confirmation interaction shape and the no-artifact commit gating. → DD-10, DD-11. ✓
- DQ5 — Scope boundary: only `create-pipeline.md` vs. neighbouring-file coherence. → DD-12. ✓

## Q&A

### DQ1 — Control-flow shape of the rewritten step 4 (so it reads like the surrounding reference prose)

**Answer (design-doc-researcher): match the terse "workflow driver" cluster; use bolded inline `If X / If Y` conditionals; hoist shared parts out of the branch; no `###` sub-headings inside the step.**

- **(a) Dominant 2-branch idiom = bolded inline `**If X**` / `**If Y**` bullets**, not sub-headings or
  tables. Closest comparator is `work-on-an-issue.md:28–39` (step 2): `**If matches exist**, … :` with
  sub-bullets under the longer branch, then `**If no matches exist**, …`. Same idiom in
  `resume-pipeline.md:15–16` and `fork-pipeline.md:41–44`. Decision tables (`work-on-an-issue.md:52–56`)
  are used ONLY for dispatch to named reference files — not our case. `###` sub-headings appear only at
  the step level, never to label branches inside a step. Inline numbered sub-items (1., 2., 3.) for a
  short sub-procedure are attested at `resume-pipeline.md:31–36`.
- **(b) Altitude norm:** `create-pipeline.md` (32 lines) sits in the terse "workflow driver" cluster with
  `assisted-workflow.md` (32), `resume-pipeline.md` (42), `fork-pipeline.md` (51), `work-on-an-issue.md`
  (57). The long structured files (`assisted-phases/*` 138–272 lines) are phase-execution references — a
  DIFFERENT cluster, NOT the comparator. Step 4 should grow from ~8 to ~18–22 lines using inline
  conditionals + a short numbered confirmation loop, and NOT sprout `### Skip path` / `### Synthesis path`
  headings (out of band for this cluster).
- **(c) Shared parts hoisted out of the branch, never duplicated or cross-referenced.** Existing pattern:
  shared preamble stated once before a fork (`autonomous-workflow.md:35`); shared trailing clause after
  (`resume-pipeline.md:40–42`). No file repeats a shared sub-step in both branches or says "also do step
  X below." → **Decision:** asset/screenshot download is a path-independent concern stated outside the
  branch; the final commit stays the already-separate `### 5. Commit` shared tail; the conditional block
  covers only skip-evaluation + [synthesize + confirm].

**Design takeaway:** Rewrite step 4 as: (i) a short framing of what the step produces; (ii) the
path-independent asset-download note; (iii) a `**If all three skip conditions hold**` / `**If any
fails**` two-branch block, the synthesis branch carrying a small numbered confirmation loop; (iv) commit
handled by the existing step 5. Keep one-sentence bullets; no new sub-headings. → DD-1, DD-2.

### DQ2 — How each skip clause is evaluated; the reads; ordering; phrasing without baking in `gh`

**Answer (design-doc-researcher): all reads go through the abstract Issues convention (never `gh`); clause A is a net-new 4-point structural test against the four `manage-issues.md` headings; clause C is a net-new body scan with structurally-checkable exclusions; state the three clauses as an unordered conjunction.**

- **(1) Issues-convention abstraction is absolute — `gh` never appears in a `reference/*.md` file.** Every
  read delegates to the **Issues** convention: `work-on-an-issue.md:15` ("capture its content"),
  `create-pipeline.md:25,27`, `manage-issues.md:5,42`. `gh` is named only in `.rp.md:16,24` (create/modify
  sections), never in the skill. `.rp.md` does NOT document how to READ the body or enumerate comments —
  only create/modify (`gh`) and run-status (Linear MCP). Reading comments is confirmed net-new (zero
  comment-reading steps anywhere in `skills/**`/`agents/**`; `gh issue view --json comments` appears only
  in `spec-research.md:133`, a research note). → **Decision:** the design phrases the comments read and
  body read as "via the **Issues** convention" / "the access mechanism captured by the **Issues**
  convention" (mirroring `create-pipeline.md:27`); it does NOT bake in `gh` or `--json`. Whether `.rp.md`'s
  Issues convention should grow a documented "reading" sub-clause is a neighboring-file question → DQ5.
- **(2) Clause A — net-new 4-point structural test.** No existing skill/agent prose validates markdown
  section structure (zero hits). The four recognized headings, spelled exactly as in `manage-issues.md:15–20`:
  `## Goal` (required, non-empty), `## Constraints`, `## Context`, `## Assumptions / directions to explore`.
  Artifact survey: the full-length Assumptions heading is the canonical form across `68/81/83/90/91/107/108`
  and `71` itself; one artifact adds a `(open)` suffix (`90-…`), two legacy pre-canonical artifacts use a
  different heading (`70-…` `## Directions to explore`; `8-…` free-form) — those correctly FAIL clause A
  and trigger synthesis, which is desirable. → **Decision:** clause A = (i) a non-empty `## Goal`; (ii) every
  section present is one of the four exact headings; (iii) sections in the prescribed order; (iv) nothing
  outside those sections (no preamble prose under the H1, no extra/unrecognized headings). Title excluded
  (it is metadata → H1). No tolerance for heading variants — the check uses the exact `manage-issues.md`
  spellings. Goal-only body passes (spec req 6).
- **(3) Clause C — net-new body scan; exclusions are structurally checkable.** No existing reference
  enumeration. Rule IN: external URL (`http(s)://…`); GitHub cross-ref to another issue/PR in short
  (`#N`), long (`owner/repo#N`), or full-URL form. Rule OUT, distinguishable in GFM: @-mentions (`@name`
  with no URL); embedded images / attached assets (`![…]` markup — already downloaded unconditionally by
  `create-pipeline.md:27`, so clause C simply ignores the `!`-prefixed form and the two concerns stay
  orthogonal); repo-file links (`[text](path)` or a GitHub blob/tree URL, NOT an issue/PR URL — they point
  at code later phases read). → **Decision:** design-altitude prose, no literal regex: *"The body contains
  no external URL and no GitHub cross-reference to another issue or pull request (short form `#N`, long form
  `owner/repo#N`, or a full GitHub issue/PR URL). @-mentions, embedded images and attached assets (the
  `![…]` form handled by the asset-download step), and links to files in the repository do not count."*
- **(4) Ordering — declarative unordered conjunction is the skill idiom.** Multi-condition gates elsewhere
  are stated as conjunctions without prescribed order (`assisted-phases/1 - spec.md:72` "when the owner
  says it is AND your self-check…"; `pipeline-versioning.md:23` "complete when all of these are committed").
  No reference file sequences condition evaluation. → **Decision:** state the gate as "confirmation is
  skipped only when all three hold" — no mandated evaluation order. The fact that clause C is reachable only
  when comments are zero (so the skip check needs no comment FETCH, only a count) is recorded as an emergent
  observation, not a sequencing rule.

**Design takeaway:** → DD-3 (clause A), DD-4 (clause C), DD-5 (reads via Issues convention; comments-read
is net-new at convention-pointer altitude), DD-6 (declarative conjunction). The `.rp.md` "read comments"
documentation gap is carried to DQ5.

### DQ3 — Synthesis-path procedure: full-picture read, section-mapping delegation, H1/attribution template, reference-read altitude, asset scope

**Answer (design-doc-researcher): delegate section-mapping to `manage-issues.md` (first cross-ref in that direction); specify the undocumented H1/attribution template explicitly (title-as-H1 per spec, overriding inconsistent legacy artifacts); phrase reference-reads at capability altitude with an explicit one-level boundary; keep the asset bullet path-independent and source-agnostic.**

- **(1a) `manage-issues.md:17–20` and `:52–54` are complementary, not redundant.** `:17–20` = the format
  definition (what each section holds, incl. Goal "outcome not solution" and Assumptions "labeled open").
  `:52–54` = the classification rule (input → section: binding must/must-not → Constraints; links/prior
  decisions/motivation → Context; beliefs about cause/state/approach → Assumptions). `:52–54` omits Goal
  (already established) and the "outcome not solution" qualifier. Synthesis needs BOTH: `:52–54` for the
  one-to-one input→section mapping, `:17–20` for the Goal framing + "labeled open" qualifier.
- **(1b) No existing cross-reference to `manage-issues.md` from any other reference file** (grep: empty).
  `create-pipeline.md` step 4 would be the FIRST such pointer — clean to introduce, consistent with the
  established "per `<file>`" idiom (`work-on-an-issue.md:39`, `resume-pipeline.md:42`). Delegation formula:
  *"sort each piece of source material into its section per the format in `manage-issues.md`."*
- **(1c) The existing `create-pipeline.md:26` guardrail ("Do not add requirements, technical directions, or
  implementation details") covers the "add nothing" direction only.** Spec req 4's other guardrails (Goal
  stays an outcome; hypotheses labeled open; never silently substitute a different goal; comment/reference
  material not more authoritative than the body) are inherited transitively by the `manage-issues.md`
  pointer (`:17,20,31,58`), EXCEPT the "not more authoritative" rule, which is synthesis-specific and not
  in `manage-issues.md`. → **Decision:** keep `:26`, add the `manage-issues.md` delegation pointer, and add
  one short synthesis note that comment/reference material is sorted the same way and is not more
  authoritative than the body merely for appearing later (spec req 3). No inline restatement of the rest.
- **(2a/2b) The H1 + source-attribution scaffolding is UNDOCUMENTED and INCONSISTENT in the artifacts.**
  Variation found: H1 = issue title (`83/91/68/81`) vs. H1 = phase name `# Intent`/`# Prompt` (the two
  MOST-RECENT artifacts `71`, `107`); attribution = `> Source:` blockquote (`71/107/83`) vs. `_Source:_`
  italic (`91`) vs. absent (`68/81`). Neither `create-pipeline.md` nor `manage-issues.md` documents it.
  Spec req 1 mandates H1 = issue title — so the recent `# Intent`/`# Prompt` artifacts are pre-spec
  DEVIATIONS the spec overrides. → **Decision:** the design specifies the `intent.md` file template
  explicitly (net-new documentation), applied on BOTH paths: H1 = issue title; a `> Source: <issue
  reference> … This file is self-contained; agents do not need to open the issue.` attribution blockquote
  (the most-informative existing pattern, used by `71`/`107`); then the body sections. This resolves the
  inconsistency in the spec's favor. (Note for design-doc-writer: flag that this overrides the legacy
  phase-name-as-H1 pattern — it is a deliberate correction, not an accident.)
- **(3a) No skill-prose precedent for fetching URLs / reading linked content.** Only the researcher AGENTS
  mention web fetch (`spec-researcher.md:15`, `design-doc-researcher.md:15` — "search and fetch
  documentation, references"); no `reference/*.md` does. The Issues convention covers tracker ops, not
  arbitrary web. → **Decision:** phrase reference-reading at capability altitude, mirroring the
  what-not-how style of `create-pipeline.md:27`: read the content references point to — external URLs via
  the active tool's web-fetch capability, GitHub cross-references via the **Issues** convention — without
  naming a concrete tool.
- **(3b) No existing recursion/depth/transitive language anywhere** (grep: empty). → **Decision:** state
  the one-level boundary positively (spec out-of-scope 8): *"References found in the issue body or comments
  are read; references found inside those fetched sources are not followed further."*
- **(4) Asset bullet stays path-independent and source-agnostic.** Spec req 14 (`spec.md:53`) says "issue
  assets … MUST be preserved unchanged and applies on both the skip path and the synthesis path" — NOT
  scoped to body-only. Current `create-pipeline.md:27` ("If the issue has screenshots or other assets")
  is already unscoped. → **Decision:** the asset-download bullet stays as a path-independent concern
  outside the branch, unchanged in substance; on the synthesis path it naturally covers assets surfaced
  in comments too (the orchestrator is already reading them). Clause C ignores `![…]` markup as "handled
  by the asset-download step." No narrowing, no new wording beyond clarifying it applies to both paths.

**Design takeaway:** → DD-7 (section-mapping delegation + synthesis guardrails), DD-8 (intent.md file
template, title-as-H1, both paths — corrects legacy deviation), DD-9 (reference-read altitude + one-level
boundary), DD-2 reaffirmed for assets (source-agnostic, both paths).

### DQ4 — Confirmation interaction shape, and making unmistakable that NO approval artifact is written

**Answer (design-doc-researcher): phase-0 confirmation follows the `manage-issues.md` render→show→approve→single-write idiom (NO file), explicitly NOT the assisted-phase `-review-approved.md` idiom; the approval gate lives in step 4's synthesis branch; step 5 stays unchanged.**

- **(1) Two distinct idioms, contrasted.** `manage-issues.md:60–62` (+ `:32`) = render the full artifact,
  show it, "Do not write … until the owner explicitly approves," then a single write — NO approval file.
  `assisted-workflow.md:28` + `assisted-phases/1 - spec.md:116–138` (and `:24`) = show artifact →
  "Repeat until the owner explicitly approves" → write `<artifact>-review-approved.md` → commit artifact +
  approval file together (the approval file is what satisfies the phases-1–5 completion predicate). → Phase 0
  follows the manage-issues idiom: iterate-until-approved (spec req 12, taking the assisted "repeat until
  approved" loop wording) but a single write of `intent.md` with NO companion file.
- **(2) Why NO approval file — three load-bearing reasons, re-verified live:**
  (a) **Phase-0 predicate is `0-intent/intent.md` alone** (`pipeline-versioning.md:25–27` table); phase 0 is
  the ONLY phase whose predicate is a single content file with no companion `-review-approved.md` — by
  design, it has no separate reviewer role (spec req 13).
  (b) **Shared-root byte-identity** (`pipeline-versioning.md:38` "a phase folder is the same in two pipelines
  if its content is byte-identical … tree object SHA"; `:66` "`0-intent` is identical across every pipeline
  of an issue (it is the issue), so it is always the shared root"). A confirm-path pipeline with an approval
  file and a skip-path one without would get divergent `0-intent` tree SHAs and be wrongly split in the
  lineage trie.
  (c) **Fork copies `0-intent/` verbatim** (`fork-pipeline.md:42` `cp -r … <phase> …`): an approval file would
  be inherited by every fork as a stale artifact pointing at the parent's confirmation session.
  (d) **Empirical baseline:** all nine existing `0-*/` folders contain exactly one file; none has an
  approval file. → **Decision:** the design states "no approval or review file is written" with these three
  reasons as rationale (predicate, shared-root, fork-copy).
- **(3) Show the FULL artifact, never a diff; optional summary is net-new and lightweight.** Every existing
  approval point shows the named artifact in full (`manage-issues.md:62`; `assisted-phases/1 - spec.md:116`,
  `2 - design-doc.md:142`, `3 - plan.md:158`). Diffs appear ONLY in autonomous reviewer agents
  (`code-reviewer.md`, `doc-reviewer.md`) as agent-internal mechanics — never owner-facing instead of an
  artifact. No existing "what changed" summary idiom. → **Decision:** primary review surface = the full
  proposed `intent.md`; an optional brief note on what was drawn from comments/references MAY accompany it
  but never replaces it; no diff (spec req 11).
- **(4) Gate in step 4's synthesis branch; step 5 unchanged.** Current `### 5. Commit` is a generic one-liner
  ("Commit the newly created artifacts following the **Commit format** convention", `create-pipeline.md:30–32`)
  with no guard. The skill puts the "don't proceed until approved" rule in the PRODUCING step, not the commit
  step (`manage-issues.md:62`; `assisted-phases/1 - spec.md:24`). → **Decision:** the confirmation loop is the
  final sub-step of step 4's synthesis branch ("show full `intent.md`; on a correction request revise and
  show again; proceed only on explicit approval"); the skip branch writes `intent.md` and proceeds directly;
  step 5 fires unconditionally on both paths and stays a clean one-liner. No guard clause added to step 5.

**Design takeaway:** → DD-10 (confirmation = manage-issues idiom, full artifact, iterate-until-approved,
optional summary), DD-11 (NO approval file — three load-bearing reasons; gate in step 4, step 5 unchanged).

### DQ5 — Scope boundary: is the change confined to `create-pipeline.md`, or do neighbors need a coherence touch?

**Answer (design-doc-researcher): the edit is strictly confined to `create-pipeline.md` step 4. Every neighboring file stays coherent with no edit. No `.rp.md` edit, no "no questions" carve-out, no agent change.**

- **(1) `.rp.md` "read comments" gap — no edit needed; out of scope.** `.rp.md`'s Issues convention
  documents create/modify (`gh`) + Linear status, with no "read" sub-clause — but reading is already
  exercised today (`work-on-an-issue.md:15` "capture its content") and `setup.md:64` explicitly states the
  Issues convention covers "a way to **read**, comment on, and update" issues. So the convention pointer
  does NOT dangle: comment-reading is "more of the same" tracker read via the configured access mechanism.
  `.rp.md` is the project's convention file, not the generic skill; the spec/intent never mention editing
  it. → **Decision:** leave `.rp.md` untouched; rely on the generic "via the **Issues** convention" pointer.
  A future `.rp.md` "reading an issue and its comments" sub-clause is at most an optional quality-of-life
  note, not part of this feature.
- **(2) No neighboring file becomes stale.** Surveyed every mention of `0-intent`/phase 0/`intent.md`:
  `SKILL.md:35` (phase-table label), `manage-issues.md:14` ("turns the issue into `0-intent/intent.md`" —
  describes THAT it happens, unaffected by the new HOW), `fork-pipeline.md` (structural `0-intent`
  refs + `cp -r`, unchanged), `pipeline-versioning.md` (predicate/lineage mechanics, unchanged),
  `autonomous-workflow.md:39` / `assisted-workflow.md:17` ("Already in place" — still accurate),
  `autonomous-phases/1 - spec.md` & `assisted-phases/1 - spec.md` (read `intent.md` as input),
  `setup.md:64`, `README.md:27,112` (high-level phase description + "input rather than agent-produced
  artifact" — both remain true). `work-on-an-issue.md:39` ("create the pipeline per `create-pipeline.md`")
  is a pointer that picks up the rewrite automatically. → **Decision:** no coherence edit to any neighbor.
- **(3) "Always interactive / owner present" — no note needed in `create-pipeline.md`, no carve-out in the
  "no questions" rule.** `create-pipeline.md` is reached ONLY from `work-on-an-issue.md` step 2, always
  interactive; like `manage-issues.md`, it issues owner-facing instructions with no "owner is present"
  disclaimer — adding one would over-explain for the terse cluster. The "no questions" rule
  (`SKILL.md:24`, `autonomous-workflow.md:11`) is scoped to "once the autonomous run starts," which begins
  at `autonomous-workflow.md` step 5 (phase 1) — structurally AFTER creation in `work-on-an-issue.md` step
  2. The rule literally cannot be in effect during phase 0; no carve-out or sentence is required anywhere.
  → **Decision:** no interactivity note in `create-pipeline.md`; no edit to the "no questions" rule.
- **(4) Orchestrator-only — no agent change.** Zero agent files reference `create-pipeline.md`. The four
  intent-touching agents (`spec-analyst`, `spec-writer`, `spec-reviewer`, `spec-consolidator`) all consume
  `0-intent/intent.md` as a READ-ONLY input ("the original idea"); none creates or validates it.
  `README.md:112` confirms phase 0 "has no agent profile." → **Decision:** no `agents/**` edit.

**Design takeaway:** → DD-12 (scope confinement: only `create-pipeline.md` step 4 changes; `.rp.md`,
workflow files, `SKILL.md`, `README.md`, `pipeline-versioning.md`, `fork-pipeline.md`, `manage-issues.md`,
`work-on-an-issue.md`, and all agents are unchanged and verified coherent).

## Design Decisions

> Filled incrementally as questions resolve. Each decision cites the spec requirement(s) it realizes and
> the DQ/codebase evidence behind the HOW.

### DD-1 — Step 4 is rewritten in place; structure stays within the terse workflow-driver idiom

Realizes spec req 14 (change sits in step 4, between generate and commit) and the "reads like its
surroundings" guardrail. Step 4 keeps its single `### 4.` heading and one-sentence-bullet altitude; it
does NOT gain `### Skip path` / `### Synthesis path` sub-headings (those belong to the phase-execution
cluster, not this file — DQ1b). The two paths are expressed as bolded inline `**If …**` conditionals,
the idiom used at `work-on-an-issue.md:28–39`, `resume-pipeline.md:15–16`, `fork-pipeline.md:41–44`.

### DD-2 — Shared concerns are hoisted out of the conditional, not duplicated

Realizes spec req 14 (asset download preserved unchanged on BOTH paths) and req 9–10 (single commit
gated by the path). The screenshot/asset download (current `create-pipeline.md:27`) is stated once as a
path-independent concern before/outside the skip-vs-synthesis branch; the final commit remains the
already-separate `### 5. Commit` step, reached by both paths. This matches the hoist-shared-part pattern
at `autonomous-workflow.md:35` and `resume-pipeline.md:40–42` (DQ1c) and avoids duplicating the shared
sub-steps inside each branch.

### DD-3 — Skip clause A: a four-point structural check against the four `manage-issues.md` headings

Realizes spec req 6. The check is purely structural (no semantic "is this an outcome?" judgment — spec
out-of-scope 6) and net-new (no existing prose validates markdown structure — DQ2.2). A body is canonical
iff: (i) it has a non-empty `## Goal`; (ii) every section present is one of the four headings spelled
exactly as in `manage-issues.md:15–20` — `## Goal`, `## Constraints`, `## Context`,
`## Assumptions / directions to explore`; (iii) those sections appear in the prescribed order; (iv) there
is no content outside them (no preamble prose under the H1, no extra/unrecognized headings). The issue
title does not participate (it is metadata that becomes the H1). A Goal-only body satisfies the check.
The design points at `manage-issues.md` as the canonical heading source rather than re-listing the format,
so the two never drift.

### DD-4 — Skip clause C: a body-only reference scan with structurally-checkable exclusions

Realizes spec req 8. Net-new (no existing reference enumeration — DQ2.3). The body must contain no
external URL and no GitHub cross-reference to another issue/PR (short `#N`, long `owner/repo#N`, or a full
GitHub issue/PR URL). Not counted: @-mentions; embedded images and attached assets (the `![…]` form,
already handled by the asset-download step, so the two concerns stay orthogonal — DD-2); and links to
files in the repository. Stated as design-altitude prose, not a literal regex, but precise enough to be
unambiguous. Evaluated against the body only.

### DD-5 — All reads go through the abstract Issues convention; the comments read is net-new

Realizes spec req 2, 7 and the project-agnostic guardrail. The body read, the comment count (clause B,
spec req 7), and the full-comment read used for synthesis (spec req 2) are all phrased "via the **Issues**
convention" / "the access mechanism captured by the **Issues** convention" — the exact formula already at
`create-pipeline.md:27`. `gh` / `--json` never appear in `create-pipeline.md` (DQ2.1). Clause B is a strict
zero-count over GitHub comments (any comment fails it; no author/substance filtering — spec req 7,
out-of-scope 7).

### DD-6 — The gate is a declarative unordered conjunction

Realizes spec req 5. Confirmation is skipped only when clauses A AND B AND C all hold; any failing clause
requires synthesis + confirmation. No evaluation order is prescribed — matching the conjunction idiom at
`assisted-phases/1 - spec.md:72` and `pipeline-versioning.md:23` (DQ2.4). All three clauses holding IS the
definition of "no transformation"; there is no separate post-synthesis "transforms in any way" check
(spec req 5, 9–10). (Emergent, not mandated: clause C is reachable only when comments are zero, so the
skip check needs only a comment count, never a full comment fetch.)

### DD-7 — Synthesis delegates section-mapping to `manage-issues.md`; one added synthesis-specific note

Realizes spec req 3–4. The synthesis path sorts each piece of source material (from body, comments, and
fetched references) into its canonical section per the format in `manage-issues.md` — the first
cross-reference to that file from another reference file, consistent with the "per `<file>`" idiom
(DQ3.1b). `manage-issues.md` supplies both the classification rule (`:52–54`) and the content guardrails
(`:17` Goal as outcome; `:20,31` Assumptions labeled open; `:58` never substitute a different goal), so
they are inherited rather than restated. The existing `create-pipeline.md:26` "do not add requirements /
technical directions / implementation details" guardrail stays. ONE synthesis-specific note is added (not
in `manage-issues.md`): material drawn from comments or referenced sources is sorted the same way and is
not treated as more authoritative than the body merely because it appears later (spec req 3).

### DD-8 — The `intent.md` file template is specified explicitly (title-as-H1 + source attribution), on both paths

Realizes spec req 1 and 9, and the self-containment rule (`create-pipeline.md:28`). The scaffolding is
currently UNDOCUMENTED and the artifacts are INCONSISTENT — the two most-recent (`71`, `107`) use the
phase name (`# Intent`/`# Prompt`) as the H1, which contradicts spec req 1. The design documents the
template explicitly and applies it on both the skip and synthesis paths: H1 = the issue title; a
`> Source: <issue reference> … This file is self-contained; agents do not need to open the issue.`
attribution blockquote (the most-informative existing pattern); then the body sections (verbatim on the
skip path, synthesized on the synthesis path). This deliberately CORRECTS the legacy phase-name-as-H1
deviation in favor of the spec (flag for the design-doc-writer so it is not mistaken for an accident).

### DD-9 — Reading referenced content is phrased at capability altitude with an explicit one-level boundary

Realizes spec req 2 and out-of-scope 8. No `reference/*.md` has any URL-fetch idiom (only the researcher
agents mention web fetch — DQ3.3a), so the design phrases it what-not-how, mirroring `create-pipeline.md:27`:
on the synthesis path, read the content the references point to — external URLs via the active tool's
web-fetch capability, GitHub cross-references via the **Issues** convention — without naming a concrete
tool. The no-recursion boundary is stated positively (DQ3.3b): references found in the body or comments
are read; references found inside those fetched sources are not followed further.

### DD-10 — Confirmation follows the `manage-issues.md` idiom: show the full proposed `intent.md`, iterate-until-approved

Realizes spec req 11–12. On the synthesis path, the orchestrator shows the owner the FULL proposed
`intent.md` as the primary review surface (matching `manage-issues.md:62` and the assisted-phase
show-the-artifact idiom — never a diff, which exists only in autonomous reviewer agents). The exchange is
iterate-until-approved (spec req 12): the owner approves, or requests a correction, in which case the
orchestrator revises the proposed `intent.md` and shows it again, repeating until explicit approval. An
optional brief note on what was drawn from comments/references MAY accompany the artifact but never
replaces it (spec req 11; net-new — no existing change-summary idiom to match, kept lightweight).

### DD-11 — NO approval/review file is written; the gate lives in step 4, step 5 stays unchanged

Realizes spec req 13 and out-of-scope 2. Confirmation is a transient gate on the single existing commit of
`intent.md`; it produces no `intent-review-approved.md` or any other file — explicitly NOT the
assisted-phase `-review-approved.md` pattern (`assisted-workflow.md:28`). Three load-bearing reasons the
design records as rationale: (a) the phase-0 completion predicate is `0-intent/intent.md` alone
(`pipeline-versioning.md:25–27`) and phase 0 has no separate reviewer role; (b) the shared-root
byte-identity invariant (`pipeline-versioning.md:38,66`) — an approval file on only the synthesis path
would diverge the `0-intent` tree SHA and corrupt lineage; (c) fork's verbatim `cp -r` of `0-intent/`
(`fork-pipeline.md:42`) would propagate a stale approval file. Placement: the confirmation loop is the
final sub-step of step 4's synthesis branch (the skill puts the approval rule in the producing step, per
`manage-issues.md:62` and `assisted-phases/1 - spec.md:24`); the skip branch writes `intent.md` and
proceeds directly; the existing `### 5. Commit` one-liner fires unconditionally on both paths and is left
unchanged (no guard clause, no file list).

### DD-12 — The change is confined to `create-pipeline.md` step 4; all neighbors verified coherent and unchanged

Realizes spec req 15 and out-of-scope 3–5. Only `create-pipeline.md` step 4 is edited (step 4's header
description may also gain a few words acknowledging the possible confirmation, but that is within the file
under edit). No edit to: `.rp.md` (convention pointer already covers reading; project file, out of scope),
`manage-issues.md` (its "turns the issue into intent.md" description stays accurate; it is the referenced
taxonomy source, not copied), `work-on-an-issue.md` (pointer picks up the rewrite), `autonomous-workflow.md`
/ `assisted-workflow.md` ("Already in place" stays accurate; "no questions" rule is scoped to run-start,
structurally after creation), `SKILL.md`, `pipeline-versioning.md`, `fork-pipeline.md`, `README.md`, or any
`agents/**` file (all intent-touching agents consume `intent.md` read-only). The orchestrator's
phase-0 confirmation needs no special handling for the autonomous "no questions" rule (DQ5.3).

## Proposed shape of the rewritten step 4 (for the design-doc-writer)

This is the design's concrete target — a HOW sketch at the file's terse altitude, not final copy. It
realizes DD-1…DD-12. The design-doc-writer should treat this as the structure to document; exact wording
is the implementer's (phase 4) job.

```
### 4. Generate the initial intent

Create the phase 0 subfolder (`0-intent/`) and write `intent.md` in the canonical intent format
defined in `manage-issues.md`: an H1 that is the issue title, a `> Source:` attribution noting the
originating issue and that the file is self-contained, then the body sections — `## Goal` (required)
followed by any of `## Constraints`, `## Context`, `## Assumptions / directions to explore`, in that
order, omitting empty sections (no `N/A`).            [DD-3, DD-8]

If the issue has screenshots or other assets, download them (using the access mechanism captured by
the **Issues** convention) into `0-intent/` and reference them by relative path — on both paths
below.                                                 [DD-2; preserves current :27]

Skip owner confirmation only when all three of these hold:
  - the issue body is already canonical: a non-empty `## Goal`, only the four recognized sections,
    in the prescribed order, with nothing outside them (the title is metadata and does not count);
  - the issue has no comments at all (read via the **Issues** convention; any comment fails this);
  - the body contains no external URL and no GitHub cross-reference to another issue/PR (short `#N`,
    long `owner/repo#N`, or a full GitHub issue/PR URL) — @-mentions, embedded images/attached
    assets (the `![…]` form handled above), and links to repo files do not count.   [DD-3,4,5,6]

**If all three hold**, map the body's sections to `intent.md` unchanged (under the title/attribution
above), do not synthesize, and proceed to commit without confirmation.             [DD-6, spec req 9]

**If any fails**, synthesize the intent from the full picture — the issue body, all of its comments,
and the content any references in the body or comments point to (external URLs via the active tool's
web-fetch capability, GitHub cross-references via the **Issues** convention; references found inside
those fetched sources are not followed further). Sort each piece into its section per the format in
`manage-issues.md`; material from comments or references is sorted the same way and is not more
authoritative than the body merely for appearing later. Do not add requirements, technical
directions, or implementation details. Then show the owner the full proposed `intent.md` (a brief
note on what was drawn in may accompany it); on a correction request, revise and show it again;
proceed to commit only after the owner explicitly approves. Write no approval or review file — the
confirmation gates the single commit of `intent.md`.        [DD-7,9,10,11; spec req 1–4,10–13]

The phase 0 subfolder must be self-contained.          [preserves current :28]
```

`### 5. Commit` is unchanged.

## Requirement → design-decision traceability

| Spec req | Realized by | Notes |
|---|---|---|
| 1 (always canonical; title→H1; attribution) | DD-3, DD-8 | template specified explicitly; corrects legacy `# Intent` H1 |
| 2 (read full picture: body+comments+references) | DD-5, DD-9 | reads via Issues convention; URLs via web-fetch capability; one-level boundary |
| 3 (section mapping; not more authoritative) | DD-7 | delegate to `manage-issues.md`; one added synthesis note |
| 4 (faithful; no added reqs; Goal=outcome; hypotheses open) | DD-7 | keep `:26` guardrail + inherit `manage-issues.md` rules |
| 5 (one gate; predicate = "no transformation") | DD-6 | declarative conjunction; no separate "transforms" check |
| 6 (skip clause A — canonical body) | DD-3 | 4-point structural check; exact `manage-issues.md` headings |
| 7 (skip clause B — no comments) | DD-5 | strict zero-count via Issues convention; no author/substance filter |
| 8 (skip clause C — no references) | DD-4 | body-only scan; structurally-checkable exclusions |
| 9 (all three hold → map verbatim, skip, commit) | DD-6, DD-8 | incidental formatting/H1/attribution not a transformation |
| 10 (any fails → synthesize + confirm; no escape hatch) | DD-6, DD-10 | failing clause = judgment exercised |
| 11 (show full proposed `intent.md`; optional summary) | DD-10 | full artifact primary; no diff |
| 12 (iterate-until-approved) | DD-10 | manage-issues idiom + assisted "repeat until approved" loop |
| 13 (no persisted artifact; predicate unchanged) | DD-11 | three load-bearing reasons recorded |
| 14 (placement in step 4; assets preserved both paths) | DD-1, DD-2 | gate between generate and commit; asset bullet hoisted |
| 15 (fresh-creation only; fork/resume/phases 1–5 unchanged; no autonomous handling) | DD-12 | every neighbor verified coherent |
| Out-of-scope 1 (no source-issue write — incl. no write-back of the synthesized "upgrade") | DD-12 / DQ5.4 | `create-pipeline.md` only reads the issue; it has no tracker-write step; synthesis writes only `intent.md` |
| Out-of-scope 2 (no persisted approval artifact) | DD-11 | confirmation is a transient gate; predicate unchanged |
| Out-of-scope 3–5 (no change to fork / manage-issues authoring / phases 1–5) | DD-12 | every neighbor verified coherent and unchanged |
| Out-of-scope 6 (no semantic "already canonical" gate) | DD-3 | clause A is purely structural |
| Out-of-scope 7 (no author/automation comment filtering) | DD-5 | strict zero-count; any comment fails |
| Out-of-scope 8 (no recursive reference-following) | DD-9 | one-level boundary stated positively |
| Out-of-scope 9 (divergent intent across non-fork pipelines) | n/a — accepted limitation | not addressed; supported multi-pipeline path is fork (copies `0-intent` verbatim) |
