# Spec Research — Normalize issue content into the standard intent format when creating a pipeline

> Source intent: `0-intent/intent.md` (GitHub issue [#71](https://github.com/Automattic/radical-pipelines/issues/71))
> This document records the spec-phase Q&A and research used to derive the consolidated requirements.

## Rough idea (from intent)

When a pipeline is created from an issue, `intent.md` should **always** be written in the canonical
**Goal / Constraints / Context / Assumptions** format, regardless of the issue's original shape.

The orchestrator reads the full picture — the issue body, all comments, any linked or external
references, and the participants' conversation — and synthesizes it into that standard format.

- When the synthesis **transforms** the source in any way, the owner **confirms** it before
  `intent.md` is written (the synthesis is not written silently).
- When the issue is **already** in the canonical format **and** has **no comments** **and** has **no
  linked or external references**, it maps to `intent.md` unchanged and **no confirmation** is needed.

Outcome: every downstream phase starts from the same canonical input, whether the originating issue
was written in this project's format or as a free-form third-party discussion.

### Owner's assumptions / directions (open, to validate)

- The change likely lives in the orchestrator's pipeline-creation flow (`create-pipeline.md`, and
  possibly `work-on-an-issue.md`).
- The owner-confirmation step is driven by the orchestrator (assisted Q&A), not by a spawned agent.
- External links and references in the issue/comments should be fetched and read as part of the synthesis.

### Key codebase facts established before Q&A

- The canonical intent format already exists and is documented in `manage-issues.md` ("The issue
  format"): **Title / Goal / Constraints (optional) / Context (optional) / Assumptions (optional)**,
  omitting empty sections, no `N/A` placeholders. The issue body _is_ the phase-0 intent.
- `create-pipeline.md` step 4 ("Generate the initial intent") currently says to "adapt the issue
  content into the intent" with no canonical-structure guarantee and no owner-confirmation step.
- Pipeline creation (phase 0) runs inside `work-on-an-issue.md` **step 2**, which is **before** the
  workflow mode (autonomous vs assisted) is chosen in **step 3**. So phase 0 currently runs
  identically regardless of mode, and it always runs interactively with the owner present.
- The autonomous workflow's defining rule (SKILL.md, `autonomous-workflow.md` step 1) is: once it
  starts, "do not ask the owner additional questions until the target phase finishes." But that
  workflow starts in `work-on-an-issue.md` step 4 — _after_ pipeline creation. In both
  `autonomous-workflow.md` and `assisted-workflow.md`, phase 0 is listed as "Already in place."
- The **Issues** convention (`.rp.md`) for this project: GitHub via `gh` CLI is the source of truth;
  Linear mirrors status only. Issue #71 itself has 0 comments and is already roughly canonical.

## Research

Findings established by the spec-analyst directly from the codebase (sources cited inline).
These supplement the `spec-researcher`'s investigations.

- **Only `create-pipeline.md` originates a fresh intent via synthesis.** Tracing every intent-origination
  path in the skill:
  - `create-pipeline.md` step 4 ("Generate the initial intent") writes `0-intent/intent.md` from the
    issue. This is the path issue #71 targets.
  - `fork-pipeline.md` step 5 ("Seed the inherited phase folders from the parent") copies the parent
    pipeline's `0-intent` folder **verbatim** (`cp -r …/0-intent …`). It does NOT re-run synthesis —
    the intent was already synthesized in the parent. So forking is out of the new behavior's scope
    (the intent is inherited, not re-derived from the issue).
  - `resume-pipeline.md` never re-runs phase 0 — it re-attaches to an existing worktree/branch and
    resumes from the active or next phase. Phase 0 is never re-originated on resume.
  - Conclusion: the change is localized to `create-pipeline.md` step 4. `work-on-an-issue.md` step 2
    invokes `create-pipeline.md` only on the "no existing pipelines" branch.

- **Phase 0 completion predicate = `0-intent/intent.md` committed** (`pipeline-versioning.md:27`). No
  approval/review artifact is part of the phase-0 predicate (unlike phases 1–5, which require a
  `*-review-approved.md`). This is relevant to Q6c (whether confirmation needs a persisted artifact).

- **Lineage derivation assumes `0-intent` is byte-identical across a pipeline family** (to flag, factored
  into Q7). `pipeline-versioning.md:38` derives shared phases by byte-identical folder content (tree SHA),
  and `:66` hard-states "`0-intent` is identical across every pipeline of an issue (it is the issue), so it
  is always the shared root." Reconciliation: forks COPY `0-intent` from the parent (`fork-pipeline.md:38–42`),
  so a fork family stays byte-identical regardless of synthesis determinism. The only way two pipelines of
  one issue get different `0-intent` is if BOTH were created fresh via `create-pipeline.md` (not forked) at
  different times — already possible today and not made worse in principle, but synthesis/owner-edits make
  non-determinism more likely. Needs an explicit out-of-scope or assumption statement in the spec.

## Q&A

### Q1 — Is phase-0 pipeline creation always interactive (owner present)? Does the new confirmation need to coexist with the autonomous "no questions" rule?

**Answer (spec-researcher): Yes, always interactive; no coexistence problem.** Pipeline creation
(`create-pipeline.md`) always runs with the owner present. There is no non-interactive/batch/scheduled
path, and it is never called from inside an autonomous run after the "no questions" rule is in effect.

- The **only** caller of `create-pipeline.md` is `work-on-an-issue.md` step 2 ("If no matches exist,
  create the pipeline…") — `work-on-an-issue.md:39`.
- `work-on-an-issue.md` is reached only from (a) the SKILL.md entry point "Work on an issue"
  (owner-initiated) and (b) the tail of `resume-pipeline.md` ("Return to work-on-an-issue.md").
  Both are owner-initiated and interactive.
- The autonomous workflow starts at `work-on-an-issue.md` **step 4**, AFTER creation in step 2. Both
  workflows list phase 0 as "Already in place" (`autonomous-workflow.md:39`). The "no questions" rule
  applies only from when the autonomous run starts — i.e. after `intent.md` is already committed.
- `fork-pipeline.md` does not call `create-pipeline.md` (it copies parent phase folders) and is also
  owner-interactive. No agent files reference `create-pipeline.md` (grep: zero hits in `agents/`).

**Implication for the spec:** The owner-confirmation step is simply an interactive Q&A exchange inside
phase 0 (`create-pipeline.md` step 4), before `intent.md` is committed. It needs no special handling
for autonomous mode. This validates the owner's assumption that confirmation is orchestrator-driven
(assisted Q&A), not delegated to a spawned agent.

### Q2 — What is the precise, testable definition of "already written in the canonical format"?

**Answer (spec-researcher): a purely STRUCTURAL test; title excluded; Goal-only body counts.**

The skill defines the format only structurally (`manage-issues.md:14–22`). Recommended definition of the
first skip clause — a body is "already canonical" iff:
1. It contains a `## Goal` section that is present and non-empty.
2. Every section present is one of `## Goal`, `## Constraints`, `## Context`,
   `## Assumptions / directions to explore`.
3. Those sections appear in the prescribed order (Goal first, then any subset of the optional ones in
   order).
4. No content exists outside those sections — no preamble prose under the H1, no extra headings.

- **(a) Structural, not semantic.** The "Goal stated as an outcome, not a solution" note
  (`manage-issues.md:17`) is writer guidance applied when *creating* an issue, not a gate applied when
  *reading* one. The skill provides no semantic-validation mechanism, and a subjective "is this really
  an outcome?" check would be unreliable and would risk wrongly triggering synthesis on well-formed
  issues. Structural is the most defensible and consistent reading.
- **(b) Title does NOT participate.** The GitHub issue title is separate metadata, not a body section.
  The body starts at the first `## Goal` heading; the title becomes the document H1 in `intent.md`.
  Confirmed by existing artifacts (e.g. `.pipelines/68-…/0-prompt/prompt.md:1`,
  `.pipelines/81-…/0-prompt/prompt.md:1` — title as H1, `## Goal` follows).
- **(c) Goal-only body IS canonical.** `manage-issues.md:22`: "A vague idea yields just a Title and a
  Goal. That is a complete, valid issue." Constraints/Context/Assumptions are explicitly optional
  (`manage-issues.md:18–20`). The skip predicate must NOT require them; a Goal-only body passes the
  structural check and (absent comments/references) skips confirmation.

### Q3 — What is the precise, testable definition of "no comments"?

**Answer (spec-researcher): a strict mechanical zero-count, over GitHub comments only; reading comments is net-new behavior.**

- **(a) Strict zero-count, no substantive judgment.** "No comments" means the `comments` array from
  `gh issue view --json comments` is empty (`len == 0`). Any comment, from any author, for any reason,
  fails the predicate. Rationale tied to the intent: the skip applies only when the issue "maps to
  `intent.md` unchanged with no transformation" (`intent.md:17–18`); the intent's own "full picture"
  explicitly includes "all of its comments … and the participants' conversation." The moment any
  comment exists, the full picture exceeds the body, and the orchestrator cannot rule out a
  transformation without reading it — so synthesis + confirmation are warranted. A bot/automation
  filter is rejected as underspecified and fragile: orchestrator-authored comments appear in GitHub's
  model as ordinary human `MEMBER` comments with no bot marker (`gh` exposes no `is_bot`/automation flag
  on the comment object).
- **(b) GitHub only; Linear out of scope.** Per `.rp.md:9`, "GitHub is the source of truth; Linear
  mirrors it for status tracking only." Linear issue descriptions carry only the GitHub URL
  (`.rp.md:17–24`) and the Linear MCP is used only for status/labels. The predicate keys off GitHub
  issue comments exclusively.
- **(c) Net-new behavior.** No part of the current skill reads issue comments. `work-on-an-issue.md:15`
  ("capture its content") and `create-pipeline.md:23–29` ("Adapt the issue content"; handles
  screenshots/assets) reference only the body; `manage-issues.md:14–22` defines only body structure;
  grep across all skill files shows zero comment-reading steps. Both the count check and the full
  comment read for synthesis are additions this feature introduces.

### Q4 — What is the precise, testable definition of "no linked or external references"?

**Answer (spec-researcher): a body-only text scan for URLs and GitHub cross-references; one unified condition; net-new behavior.**

- **(a) What counts.** A reference defeats the skip when the orchestrator would have to leave the body's
  own prose to get the full picture. **Rule in:** plain external URLs (`https?://…`); GitHub
  cross-references to other issues/PRs in short form (`#42`) and long form (`owner/repo#42` or full
  GitHub URLs). **Rule out:** @-mentions (a notification mechanism, not a document pointer; repo scan
  shows only package-scope `@scope/...` code identifiers, never human-user refs); embedded
  images/screenshots/assets (already handled unconditionally by `create-pipeline.md:27`, orthogonal to
  the skip); markdown links to repo files (point to code agents read in later phases, not the intent
  picture). Real examples confirming live refs in issue bodies: #83 (`https://github.com/Automattic/skillsmith/pull/41`,
  `#81`, `#82`), #101 (`#95`, `#66`, `#92`), #51 (`#18`).
- **(b) "Linked" vs "external" collapse into ONE checkable condition.** "Linked" (intra-tracker `#N` /
  GitHub issue-PR URLs) and "external" (arbitrary web URLs) share the same consequence — the pointed-to
  content is not in the body. Single predicate: **the issue body contains at least one URL (`https?://…`)
  OR at least one GitHub cross-reference (`#\d+` or `owner/repo#\d+`).** Any match defeats the skip.
- **(c) Skip predicate examines the BODY ONLY — confirmed.** The "no references" clause is evaluated
  only on the empty-comments branch (Q3 fails the skip the moment any comment exists). So by
  construction there are no comments when this clause runs; references inside comments are unreachable
  by the skip decision. References-in-comments matter only for the **synthesis** step (read comment
  bodies, follow their links), never for the skip. This makes the skip check a pure text scan of
  `gh issue view --json body`, with no comment fetch needed.
- **(d) No prior art beyond screenshot download.** `create-pipeline.md:27` (download screenshots/assets)
  is the only existing content-fetch line. Grep across all skill and agent files for URL fetching /
  link resolution / cross-ref following returns zero hits. Empirical: issue #83 had an external URL +
  cross-refs in its body, yet its phase-0 `prompt.md` is byte-identical to the body (no phase-0 fetch);
  the URL was fetched only later in the spec phase. Following references at creation time is net-new.

### Q5 — Are the two confirmation phrasings ("skip when predicate holds" vs "confirm if transformed in any way") one gate or two?

**Answer (spec-researcher): ONE gate. The three-clause predicate is the sole authoritative check; "transforms in any way" is descriptive, not a second condition.**

- **(a) When the predicate holds, the predicate wins — DEFINE it as "no transformation."** The intent's
  **normative** rule lives in its Constraints section (`intent.md:26–30`): confirm "**except** when [the
  issue is canonical and has no comments and no references]. **In that case** the issue maps directly …
  **with no transformation**." "In that case … no transformation" *characterizes* the predicate-holding
  situation; it is not a separate byte-diff to run. The Goal-section phrase "transforms in any way"
  (`intent.md:15–18`) is motivating description. Incidental scaffolding when mapping directly — the H1
  from the issue title, the source blockquote, a trailing newline — is the `intent.md` file format
  itself, not the governed "synthesis." Confirmed by issue #68's `prompt.md`: body sections verbatim,
  H1 + source attribution layered as template scaffolding. So when all three clauses hold, map the body
  sections verbatim (plus standard scaffolding) and skip confirmation, regardless of incidental
  formatting differences.
- **(b) When the predicate fails, confirmation is ALWAYS required — no "ended up identical" escape
  hatch.** A failing clause means the orchestrator had to read beyond the bare body (read a comment,
  fetch a reference, or restructure a non-canonical body) and form a judgment. Skipping confirmation
  because the output happens to resemble the body would silently substitute the orchestrator's "nothing
  material here" judgment for the owner's verification — exactly what "the synthesis is not written
  silently" (`intent.md:26`) forbids. The Constraints "except" clause is exhaustive: the predicate is
  the only exception.
- **(c) The spec states ONE rule; "transforms in any way" is dropped as a separate checkable
  condition.** Single gate: *"Confirmation is required unless all three clauses hold (canonical body AND
  no comments AND no references in the body). When all three hold, the issue maps to `intent.md`
  verbatim (body sections plus standard file scaffolding) and confirmation is skipped — this is the
  definition of 'no transformation.'"* This is also the only implementable design: "transforms in any
  way" can't be evaluated without first synthesizing, which would defeat the cheap pre-synthesis
  predicate. Empirical illustration of what "transformation" means: issue #71's own body has 2 sections
  (Goal + Assumptions) while its `intent.md` has 4 (Goal + Constraints + Context + Assumptions) — the
  feature author saw this synthesis when writing the intent. No codebase signal treats "transforms in
  any way" as a finer-grained post-synthesis gate.

### Q6 — What does the confirmation interaction look like, and does it persist an artifact?

**Answer (spec-researcher): show the full proposed `intent.md`; iterate-until-approved; NO new artifact; gate sits between create-pipeline steps 4 and 5, synthesis path only.**

- **(a) Show the full proposed `intent.md` (the artifact itself), not a diff.** Consistent with
  `manage-issues.md:60–62` ("Render … and show it to the owner. Do not write … until the owner
  explicitly approves"), `assisted-workflow.md:3` ("owner reviews and explicitly approves the artifacts
  before anything is committed"), and the self-containment rule `create-pipeline.md:28` (a diff would
  force the owner to hold the raw issue in mind). A "what changed" summary MAY be offered as an optional
  supplement, but the primary review surface is the full proposed `intent.md`.
- **(b) Iterate-until-approved, not single yes/no.** Matches the explicit loops in
  `assisted-phases/1 - spec.md:117–118` and `2 - design-doc.md:142` ("Iterate … Repeat until the owner
  explicitly approves"). The owner may correct a mis-synthesis; the orchestrator revises and re-shows;
  commit only on explicit approval. Not over-engineered — it is the skill's baseline approval idiom.
- **(c) NO persisted approval artifact — confirmation is a transient gate; phase-0 predicate unchanged.**
  Phase-0 completion predicate is `0-intent/intent.md` committed, full stop (`pipeline-versioning.md:27`).
  Adding an approval file would break three things: (1) the **shared-root invariant** — `0-intent` must be
  byte-identical across an issue's pipelines (`pipeline-versioning.md:38,66`); a confirm-path pipeline with
  an approval file and a skip-path pipeline without one would get divergent `0-intent` tree SHAs and be
  wrongly split in the lineage trie; (2) **fork copy** — `fork-pipeline.md:42` `cp -r`'s the whole
  `0-intent/`, so a fork would inherit a bogus approval file referring to the parent's confirmation;
  (3) **role model** — phases 1–5 have a distinct reviewer role that the `-review-approved.md` file
  records; phase 0 has no such separate role (orchestrator synthesizes, owner approves in the same
  interaction), so confirmation is a gate on creation, not a reviewer verdict (cf. `manage-issues.md:62`).
  All existing `0-intent/`/`0-prompt/` folders contain exactly one file. **Decision: confirmation gates
  the existing single commit of `intent.md`; no new file; predicate unchanged.**
- **(d) Placement.** Confirmation lands between `create-pipeline.md` step 4 (generate intent) and step 5
  (commit), and only on the synthesis path. Flow: step 4 evaluates the skip predicate — if all three
  clauses hold, map body→`intent.md` verbatim and go straight to commit; if any clause fails, read the
  full picture (comments + references), synthesize, show, iterate-until-approved, then commit. The
  screenshot/asset download (`create-pipeline.md:27`) is a path-independent sub-bullet of step 4 and is
  unaffected.

### Q7 — Synthesis content rules, issue-write boundary, lineage determinism, and out-of-scope boundaries

**Answer (spec-researcher): existing guardrails govern synthesis content; the source issue is never written; non-deterministic intent across non-fork pipelines is a known limitation (no mitigation); fork/manage-issues/phases 1–5 are out of scope, plus two adjacent traps.**

- **(a) Synthesis content guardrails (complete set, two files).** From `create-pipeline.md:25–26`: adapt
  the issue content; "Do not add requirements, technical directions, or implementation details." From
  `manage-issues.md` (the format definition that doubles as the content taxonomy): Goal = outcome not
  solution (`:17`); Constraints = binding must/must-not the owner owns, NOT the full out-of-scope list
  (`:18`); Context = links/prior decisions/motivation (`:19`); Assumptions = hypotheses/proposed
  direction **labeled open** (`:20`); "Reflect hypotheses back as open … recorded under Assumptions, not
  as a requirement" (`:31`); "Capture, don't converge" (`:28`); "No requirements, design, or
  implementation" (`:30`); "never silently substitute a different goal" (`:58`). **Section-mapping rule
  (required):** map each piece of source material to the right section per `manage-issues.md:52–54` —
  binding must/must-not → Constraints; links/prior decisions/motivation → Context; beliefs about
  cause/current state/proposed approach → Assumptions (labeled open); desired outcome → Goal. This
  applies equally to material from comments and fetched references; comment content is NOT more
  authoritative than the body merely because it is later. No other file adds content rules.
- **(b) The source issue is NEVER modified.** `create-pipeline.md` only reads the issue and downloads
  assets (`:27`); it has no tracker-write step and produces only `intent.md`. Issue creation/modification
  is exclusively `manage-issues.md` (`:3`; `.rp.md:22–24`). **Out-of-scope statement:** synthesis writes
  only `intent.md` in the artifact folder; the GitHub/Linear issue is left untouched.
- **(c) Non-deterministic `intent.md` across independently-created (non-fork) pipelines = known
  limitation, no mitigation.** It is already possible today (`create-pipeline.md:25` "adapt" already
  permits judgment) and merely made more pronounced. It is also structurally rare: `work-on-an-issue.md:28–39`
  only creates a fresh pipeline when listing finds NO existing pipeline, and listing checks both branches
  AND artifact folders (`pipeline-versioning.md:50–52`) — so a second fresh creation requires the owner to
  have destroyed both the branch and the artifact history outside the skill. The supported multi-pipeline
  path is forking, which copies `0-intent/` verbatim (`fork-pipeline.md:42`) and preserves the shared-root
  invariant (`pipeline-versioning.md:66`). **Spec treatment:** state as a known limitation; no mitigation.
  (Aside: `merge-pipeline.md`/`close-pipeline.md` are referenced in `work-on-an-issue.md:33,35` but do not
  yet exist; any future "close" that deletes artifact history is a separate concern, out of scope here.)
- **(d) Out-of-scope boundaries (state explicitly).** No changes to: `fork-pipeline.md` (inherits intent
  by `cp -r`, re-synthesis at fork would be wrong); `manage-issues.md` issue-authoring flow (defines the
  format but is a different flow; issues authored there are already canonical and pass the skip predicate);
  phases 1–5 (they read `0-intent/intent.md` as a self-contained input — contract unchanged). **Two adjacent
  traps also out of scope:** (1) writing the synthesized intent BACK to the GitHub issue body (a separate,
  consent-bearing `manage-issues.md`-style modification, not this feature); (2) RECURSIVE reference-following
  (the intent says references in the issue/comments — `intent.md:13–14` — with no transitive-traversal
  language; recursion has depth/cycle risk and would be a separate feature).

## Out of Scope

Confirmed exclusions (each maps to a Q&A finding above):

1. **No modification of the source issue.** The flow reads the issue (body, comments, references) but
   never writes back to GitHub or Linear. Issue authoring/modification remains exclusively in
   `manage-issues.md`. (Q7b)
2. **No persisted approval/review artifact in `0-intent/`.** Confirmation is a transient interactive
   gate; only `intent.md` is committed. The phase-0 completion predicate (`0-intent/intent.md`
   committed) is unchanged. (Q6c)
3. **No changes to `fork-pipeline.md`.** Forks inherit `0-intent/` by verbatim copy; intent is not
   re-synthesized at fork time. (Q7d)
4. **No changes to the `manage-issues.md` issue-authoring flow.** It defines the canonical format but is
   a separate flow; this feature does not alter how issues are written. (Q7d)
5. **No changes to phases 1–5.** They consume `0-intent/intent.md` as a self-contained input; their
   contract is unchanged. (Q7d)
6. **No semantic quality gate on "already canonical."** The canonical check is purely structural; the
   orchestrator does not judge whether a Goal "sounds like an outcome vs a solution" when reading an
   existing issue. (Q2a)
7. **No bot/automation filtering of comments.** Any comment at all defeats the skip; comment author or
   substance is not assessed for the skip decision. (Q3a)
8. **No recursive reference-following.** Only references appearing directly in the issue body/comments
   are fetched; references found inside fetched targets are not transitively followed. (Q7d)
9. **No writing of the synthesized intent back to the issue body.** "Upgrading" the tracker issue to
   canonical form is a separate, consent-bearing feature. (Q7d)
10. **No mitigation for non-deterministic intent across independently-created (non-fork) pipelines.**
    Accepted as a known limitation; the supported multi-pipeline path (fork) preserves the shared-root
    invariant by copying. (Q7c)

## Consolidated Requirements

Distilled from the Q&A and Research above. Each requirement cites the supporting finding.

**Synthesis into the canonical format**

1. When a pipeline is created from an issue (`create-pipeline.md` step 4), `intent.md` MUST always be
   written in the canonical format defined by `manage-issues.md`: a document whose body consists of
   `## Goal` (required) and any subset of `## Constraints`, `## Context`,
   `## Assumptions / directions to explore` (optional, in that order), with empty sections omitted and
   no `N/A` placeholders. The issue title becomes the document H1; a source attribution is included as
   standard scaffolding. (intent Goal; `manage-issues.md:14–22`; Q2, Q5a, Q6d)
2. To synthesize, the orchestrator MUST read the full picture: the issue body, ALL of the issue's
   comments, and any linked or external references found in the body or comments, fetching and reading
   those references' content. (intent Goal; Q3c, Q4, Q7a)
3. Synthesis MUST map each piece of source material to the correct canonical section: desired outcome →
   Goal; binding must/must-not the owner owns → Constraints; links / prior decisions / motivation →
   Context; beliefs about cause, current state, or proposed approach → Assumptions (labeled open).
   Comment/reference material is mapped the same way and is not treated as more authoritative than the
   body merely for appearing later. (Q7a; `manage-issues.md:52–54`)
4. Synthesis MUST NOT add requirements, technical directions, design, or implementation details, and
   MUST NOT silently substitute a different goal; the Goal stays an outcome and hypotheses stay labeled
   open. (Q7a; `create-pipeline.md:26`; `manage-issues.md:28–31,58`)

**The confirmation gate (single authoritative rule)**

5. There is exactly ONE gate. Owner confirmation is REQUIRED before `intent.md` is committed UNLESS all
   three skip clauses hold; when they all hold, confirmation is SKIPPED. The three clauses holding is the
   definition of a no-transformation mapping; "transforms in any way" is NOT a separate, independently
   checkable condition. (intent Constraints; Q5)
6. **Skip clause A — canonical body (structural test):** the issue body contains a non-empty `## Goal`;
   every section present is one of the four recognized sections; sections appear in the prescribed order;
   and no content exists outside those sections (no preamble prose, no extra headings). The issue title
   does not participate. A Goal-only body satisfies this clause. (Q2)
7. **Skip clause B — no comments:** `gh issue view --json comments` returns an empty array (strict
   zero-count, GitHub source-of-truth only; Linear comments are out of scope; no author/substance
   filtering). (Q3)
8. **Skip clause C — no references in the body:** the issue body contains no URL (`https?://…`) and no
   GitHub cross-reference (`#\d+` or `owner/repo#\d+`). @-mentions, embedded images/assets, and links to
   repo files do NOT count. This clause scans the BODY only (by construction comments are empty when it
   is evaluated). (Q4)
9. When all three clauses hold, the orchestrator maps the issue body to `intent.md` verbatim (the body
   sections, plus standard H1/source scaffolding), performs no synthesis, skips confirmation, and
   commits — incidental formatting/whitespace/title-as-H1 differences do not require confirmation. (Q5a)
10. When ANY clause fails, the orchestrator MUST synthesize (per requirements 2–4) and MUST obtain owner
    confirmation before committing — with NO "the output happened to look unchanged" escape hatch. (Q5b)

**Confirmation interaction**

11. At confirmation, the orchestrator MUST show the owner the full proposed `intent.md` (the artifact
    itself) as the primary review surface; a "what changed" summary MAY be offered as an optional
    supplement. (Q6a)
12. Confirmation MUST be iterate-until-approved: the owner may approve or request corrections; the
    orchestrator revises and re-shows; the commit happens only on the owner's explicit approval. (Q6b)
13. Confirmation MUST NOT produce any persisted artifact; it gates the existing single commit of
    `intent.md`. The phase-0 completion predicate (`0-intent/intent.md` committed) is unchanged. (Q6c)

**Placement and interaction with existing behavior**

14. The skip-predicate evaluation and (on failure) the synthesis+confirmation MUST sit inside
    `create-pipeline.md` step 4, between generating the intent and the existing step 5 commit. The
    existing screenshot/asset download is path-independent and MUST remain unaffected on both the skip
    and synthesis paths. (Q6d)
15. The change applies only to `create-pipeline.md` (the sole intent-origination-via-synthesis path).
    `work-on-an-issue.md`, `fork-pipeline.md`, `resume-pipeline.md`, and phases 1–5 require no behavioral
    change. Because phase 0 always runs with the owner present and completes before any autonomous run
    begins, the confirmation is a plain interactive Q&A and needs no special handling for the autonomous
    "no questions" rule. (Q1; Research)

