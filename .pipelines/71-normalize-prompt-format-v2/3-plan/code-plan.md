# Code Plan — Normalize issue content into the standard intent format when creating a pipeline

> Source spec: `1-spec/spec.md` (15 requirements). Source design: `2-design-doc/design-doc.md`
> (KD-1…KD-12). This plan is standalone. The feature is a localized rewrite of **one step** in the
> radical-pipelines skill itself: `skills/radical-pipelines/reference/create-pipeline.md` step 4
> ("Generate the initial intent"). No other file is edited. This plan does not cover tests or
> documentation (the skill's reference files *are* the deliverable; their wording is the change).

## Scope and ground rules (read before any task)

- **Exactly one file is edited:** `skills/radical-pipelines/reference/create-pipeline.md`. Every task
  below touches only that file's **step 4** (current lines 21–28), except Task 7, which verifies the
  neighbors stay coherent and edits **nothing**.
- **Step 5 ("Commit", current lines 30–32) is left unchanged** — it fires unconditionally on both paths
  and must keep no guard clause and no file list.
- **Stay at the file's terse "workflow-driver" altitude (KD-1).** Express the two paths as bolded inline
  `**If …**` bullets, matching the `**If matches exist**` / `**If no matches exist**` idiom in
  `work-on-an-issue.md` and the `**If …**` bullets in `resume-pipeline.md` / `fork-pipeline.md`. Do
  **not** introduce `### Skip path` / `### Synthesis path` sub-headings, a decision table, or a new file.
- **All issue reads go through the abstract Issues convention (KD-5).** The skill body must never name
  `gh`, `--json`, or any concrete tracker command. External-URL reads are phrased at "web-fetch
  capability" altitude (KD-9), naming no specific tool.
- **Section-mapping and the canonical format are delegated to `manage-issues.md`, not copied (KD-3,
  KD-7).** Step 4 points at it for the heading taxonomy and the input→section classification rule so the
  two files never drift.
- **Confirmation writes NO file (KD-11).** The phase-0 completion predicate stays `0-intent/intent.md`
  committed and nothing else (`pipeline-versioning.md` line 27); `0-intent` must stay byte-identical as
  the shared root (lines 66, 90); forks copy `0-intent/` verbatim (`fork-pipeline.md` step 5). No
  `intent-review-approved.md` (the phases-1–5 companion pattern) or any other approval/review file.
- **Whole-step coherence:** the eight current lines are being rewritten into one cohesive step; the tasks
  below are the logical pieces of that single rewrite, ordered so each builds on the last. Implement them
  in order and read the whole step after, so the bullets flow as one passage rather than stitched fragments.

---

## Tasks

### Task 1 — Reframe step 4 with the canonical-format + file-template scaffolding (both paths)

- **Goal.** Replace the current open-ended "Adapt the issue content into the intent" framing with an
  explicit statement that `intent.md` is **always** written in the canonical intent format, plus the file
  scaffolding (H1 = issue title, a `> Source:` attribution blockquote, then the body sections). This
  applies on both the skip path and the synthesis path.
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — the `### 4. Generate the
  initial intent` step (current lines 21–25; the lead sentence on line 23 and the "Adapt the issue
  content…" bullet on line 25).
- **Changes.**
  - Keep "Create the phase 0 subfolder (`0-intent/`) … write `intent.md` to `<artifacts-folder>/0-intent/intent.md`".
  - State that `intent.md` is always written in the canonical intent format **defined in
    `manage-issues.md`** — delegate the format, do not re-list it. Add the **first** cross-reference from
    a reference file to `manage-issues.md` for the format/heading source.
  - Specify the file scaffolding explicitly: an **H1 equal to the issue title**; a `> Source:` attribution
    blockquote that names the originating issue and states the file is self-contained (e.g. "agents do not
    need to open the issue"); then the body sections — `## Goal` (required, non-empty) followed by any of
    `## Constraints`, `## Context`, `## Assumptions / directions to explore`, in that order, omitting empty
    sections, with no `N/A` placeholders. A body of Goal alone is a complete, valid intent.
  - The H1 is the **issue title**, never a phase name (`# Intent` / `# Prompt`). This is grounded in spec
    requirement 1 ("The issue title becomes the document's top-level heading (H1)"). Do not preserve any
    legacy phase-name H1.
  - Remove the now-superseded "Adapt the issue content into the intent that seeds the subsequent phases"
    bullet (current line 25); its intent is absorbed into the framing here and the two-branch block (Tasks 4–5).
- **Depends on.** None (first task; establishes the framing the later tasks attach to).
- **Traces to.** Spec req 1, req 9 (incidental formatting — title-as-H1, added attribution — is not a
  transformation); KD-3, KD-8. (KD-8 carry-forward: ground the H1 template in spec req 1 itself; ignore
  KD-8's anecdote about which past artifacts deviated.)
- **Acceptance.** Step 4's opening states `intent.md` is always written in the canonical format and points
  to `manage-issues.md` as the format source rather than re-listing the sections. The file scaffolding is
  spelled out: H1 = issue title, a `> Source:` attribution line, then `## Goal` (required) and the three
  optional sections in the prescribed order with empties omitted and no `N/A`. No instruction anywhere in
  the step produces a phase-name H1. The old "Adapt the issue content…" bullet no longer appears.

### Task 2 — Hoist the asset/screenshot download as a path-independent concern before the branch

- **Goal.** State the existing screenshot/asset download once, before the two-branch block, so it visibly
  applies to **both** paths, rather than being duplicated inside either branch. Preserve its current
  behavior exactly: download via the Issues convention's access mechanism into `0-intent/` and reference
  by relative path.
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — the asset bullet (current
  line 27) within step 4.
- **Changes.**
  - Keep the bullet's substance verbatim in meaning: if the issue has screenshots or other assets,
    download them (using the access mechanism captured by the **Issues** convention) into `0-intent/` and
    reference them by relative path in `intent.md`.
  - Position it **after** the template framing (Task 1) and **before** the skip gate (Task 3) so it reads
    as a shared, path-independent step. Make it explicit that this applies on both paths (e.g. a short
    "— on both paths below" or equivalent), matching the hoist-before-the-fork pattern used in
    `autonomous-workflow.md` and the shared-trailing-clause pattern in `resume-pipeline.md`.
  - Do not duplicate this bullet inside the skip branch or the synthesis branch.
- **Depends on.** Task 1 (the asset bullet sits between the template framing and the branch).
- **Traces to.** Spec req 14 (asset/screenshot download preserved unchanged, applies on both paths); KD-2.
- **Acceptance.** The asset-download instruction appears exactly once, positioned before the skip
  gate/branch, and is stated to apply on both paths. Its mechanism is unchanged (Issues-convention access,
  download into `0-intent/`, reference by relative path). It is not repeated inside either branch.

### Task 3 — State the three-clause skip gate as a declarative unordered conjunction

- **Goal.** Express the confirmation-skip condition as "skip owner confirmation only when **all three** of
  these hold," listing clauses A, B, C, with no evaluation order mandated. All three holding **is** the
  definition of "no transformation" — there is no separate, independently checked "does the result
  transform the source?" notion.
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — within step 4, after the
  hoisted asset bullet (Task 2) and before the two-branch block (Tasks 4–5).
- **Changes.** Add a declarative gate introduced as "Skip owner confirmation only when all three of these
  hold:", followed by three clauses:
  - **Clause A — body is structurally canonical.** A four-point structural check: (i) a non-empty
    `## Goal`; (ii) every section present is one of the four recognized headings spelled exactly as in
    `manage-issues.md`; (iii) the sections appear in the prescribed order; (iv) nothing outside those
    sections — no preamble prose under the H1, no extra or unrecognized headings. State that the issue
    title is metadata (→ H1) and does **not** participate in this check, and that a Goal-only body passes.
    State that the check is purely structural — the orchestrator does not judge whether the Goal "reads as
    an outcome." Point at `manage-issues.md` for the heading taxonomy rather than re-listing it; allow no
    tolerant matching of near-miss headings (e.g. `## Directions to explore` fails).
  - **Clause B — issue has no comments.** A strict zero-count read via the **Issues** convention: any
    comment at all — from any author, for any reason — fails it. Author and substance are not assessed.
    Counted against the issue that is the source of truth (the design's "GitHub issue"); comments mirrored
    elsewhere (e.g. Linear) are not considered.
  - **Clause C — body contains no references.** A body-only scan. Counts as a reference: an external URL
    (`http(s)://…`) or a GitHub cross-reference to another issue/PR (short `#N`, long `owner/repo#N`, or a
    full GitHub issue/PR URL). Explicitly does **not** count: @-mentions, embedded images / attached assets
    (the `![…]` form, already handled by the hoisted asset step), and links that point to files in the
    repository. Stated as design-altitude prose, not a literal regex; evaluated against the body only.
- **Depends on.** Task 2 (gate follows the hoisted asset bullet).
- **Traces to.** Spec req 5 (exactly one gate; all-three-holding is the definition of "no transformation"),
  req 6 (clause A), req 7 (clause B), req 8 (clause C); out-of-scope 6 (no semantic canonical gate),
  out-of-scope 7 (no comment author/automation filtering); KD-3, KD-4, KD-5, KD-6.
- **Acceptance.** Step 4 contains a single skip gate phrased as "all three hold," listing clauses A, B, C
  with no prescribed evaluation order and no separate "does the result transform the source?" check.
  Clause A is the four-point structural check (non-empty Goal; only the four `manage-issues.md` headings;
  prescribed order; nothing outside the sections), explicitly purely structural, with the title excluded
  and Goal-only passing, and no tolerance for near-miss headings. Clause B is a strict zero-count read via
  the Issues convention where any comment fails, with author/substance unassessed and mirrored comments
  excluded. Clause C is a body-only scan counting external URLs and GitHub `#N` / `owner/repo#N` / full-URL
  cross-references, explicitly excluding @-mentions, `![…]` assets, and repo-file links.

### Task 4 — Write the skip branch (`**If all three hold**`): map body verbatim, no synthesis, no confirmation

- **Goal.** Add the first arm of the two-branch block: when clauses A, B, C all hold, map the body's
  sections to `intent.md` unchanged (under the title/attribution scaffolding from Task 1), perform no
  synthesis, skip confirmation, and proceed to commit (step 5).
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — within step 4, immediately
  after the skip gate (Task 3).
- **Changes.** Add a bolded inline `**If all three hold**` bullet: reproduce the body's sections verbatim
  under the H1/`> Source:` scaffolding, do not synthesize, do not confirm, and proceed to commit. Make
  clear (per Task 1's framing) that the incidental, format-level differences — title becoming the H1, the
  added source attribution, whitespace, a trailing newline — are not a transformation and do not require
  confirmation. Do not write any approval/review file. Reach step 5 (Commit) via the existing unconditional
  step, not a duplicated commit instruction.
- **Depends on.** Task 1 (uses the template scaffolding), Task 3 (this is the gate's "all hold" arm).
- **Traces to.** Spec req 9 (all three hold → map verbatim, skip confirmation, commit; incidental
  formatting is not a transformation); KD-6, KD-8.
- **Acceptance.** A bolded `**If all three hold**` arm exists that reproduces the body's sections unchanged
  under the standard H1/attribution, performs no synthesis and no confirmation, writes no approval/review
  file, and proceeds to the existing commit step. The incidental-formatting-is-not-a-transformation point
  is present (either here or in Task 1's framing) so a reader sees that H1/attribution/whitespace changes
  on this path are expected, not a violation of "map unchanged."

### Task 5 — Write the synthesis branch (`**If any fails**`): synthesize from the full picture, then iterate-until-approved

- **Goal.** Add the second arm: when **any** clause fails, synthesize the intent from the full picture
  (body + all comments + referenced content, one level), sorting each piece into its canonical section per
  `manage-issues.md`, keeping the faithfulness guardrails, then run an iterate-until-approved confirmation
  loop showing the **full** proposed `intent.md`, committing only on explicit approval, and writing no
  approval/review file.
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — within step 4, immediately
  after the skip branch (Task 4).
- **Changes.** Add a bolded inline `**If any fails**` bullet covering, in order:
  - **Read the full picture.** Synthesize from the issue body, **all** of its comments (read via the
    **Issues** convention), and the content any references in the body or comments point to — external URLs
    via the active tool's **web-fetch capability** (no specific tool named), GitHub cross-references via the
    **Issues** convention. State the one-level boundary positively: references found in the body or comments
    are read; references found **inside** those fetched sources are **not** followed further.
  - **Section-mapping (delegated).** Sort each piece of source material into its canonical section **per the
    format in `manage-issues.md`** (which supplies both the input→section classification rule and the
    content guardrails: Goal as outcome, hypotheses labeled open, never substitute a different goal). Do not
    re-list the classification rule.
  - **The one synthesis-specific note** (absent from `manage-issues.md`, so stated explicitly): material
    drawn from comments or referenced sources is sorted the same way and is **not** more authoritative than
    the body merely because it appears later in the conversation.
  - **Faithfulness guardrail (kept from current line 26):** do not add requirements, technical directions,
    design, or implementation details the source did not contain; keep the Goal an outcome; keep hypotheses
    labeled open.
  - **The confirmation loop.** Show the owner the **full proposed `intent.md`** as the primary review
    surface (never a diff or a bare change-list); a brief optional note on what was drawn from
    comments/references may accompany it but never replaces it. On a correction request, revise the proposed
    `intent.md` and show it again; repeat until the owner explicitly approves. Proceed to commit only on
    explicit approval. Follow the render→show→approve idiom of `manage-issues.md`.
  - **No approval file.** State that the confirmation gates the single commit of `intent.md` and writes no
    approval or review file.
- **Depends on.** Task 1 (scaffolding), Task 3 (this is the gate's "any fails" arm), Task 4 (the paired
  `**If …**` arm it sits beside).
- **Traces to.** Spec req 1–4 (always canonical; full-picture read; section mapping with comment/reference
  material not more authoritative; faithful synthesis), req 10 (any fails → synthesize + confirm; no escape
  hatch — a resemblance to the body does not bypass the gate), req 11 (full proposed `intent.md`; optional
  summary), req 12 (iterate-until-approved; commit only on explicit approval); out-of-scope 8 (no recursive
  reference-following); KD-7, KD-9, KD-10.
- **Acceptance.** A bolded `**If any fails**` arm exists that: instructs synthesis from body + all comments
  + one-level referenced content, with comments read via the Issues convention and external URLs via a
  web-fetch capability (no concrete tool named) and the no-recursion boundary stated positively; delegates
  section-mapping to `manage-issues.md` rather than re-listing it; states the "not more authoritative than
  the body" note explicitly; keeps the "no added requirements/technical directions/implementation details,
  Goal stays an outcome, hypotheses labeled open" guardrail; runs an iterate-until-approved loop that shows
  the full proposed `intent.md` (optional accompanying summary, never a diff-only review), revises and
  re-shows on a correction request, and commits only on explicit approval; and writes no approval/review
  file. There is no escape hatch letting a synthesized result that resembles the body skip the gate.

### Task 6 — Confirm step 4's two-branch block reaches the unchanged step 5 commit on both paths

- **Goal.** Ensure both arms converge on the existing `### 5. Commit` step with no change to step 5 — no
  guard clause, no file list — and that no commit instruction is duplicated inside step 4. This guarantees
  the single-commit, single-content-file phase-0 predicate is preserved.
- **Files to change.** `skills/radical-pipelines/reference/create-pipeline.md` — verify step 4's branches
  hand off to the existing step 5 (current lines 30–32); confirm step 5's text is untouched. Adjust step 4
  wording only if a branch implies its own commit rather than reaching step 5.
- **Changes.**
  - Confirm both `**If …**` arms (Tasks 4–5) end by "proceeding to commit" via the existing step 5 rather
    than by issuing their own commit.
  - Optionally, the step 4 header description (current line 23 area, or the file's intro at line 3) may gain
    a few words acknowledging that confirmation may occur — this stays within the file under edit. No other
    text in the file changes.
  - Leave `### 5. Commit` exactly as-is: it fires unconditionally on both paths, with no guard clause and no
    file list, so it commits whatever `0-intent/` contains (just `intent.md` plus any downloaded assets).
- **Depends on.** Task 4, Task 5 (both branches must exist to confirm convergence).
- **Traces to.** Spec req 13 (no persisted approval/review artifact; phase-0 completion condition
  unchanged), req 14 (the gate sits in step 4, between generate and commit); out-of-scope 2 (no persisted
  approval artifact); KD-11.
- **Acceptance.** Step 4 contains no commit instruction of its own; both branches reach the existing,
  unmodified `### 5. Commit`. Step 5's text is byte-for-byte unchanged (no guard clause, no file list). The
  only artifact the flow can produce for phase 0 is `intent.md` (plus any downloaded assets) — no
  `intent-review-approved.md` or any other approval/review file is written on either path.

### Task 7 — Verify the neighbors stay coherent; confirm no other file needs editing

- **Goal.** Confirm — without editing them — that every file the design flagged stays coherent after the
  step-4 rewrite, so the change truly remains confined to `create-pipeline.md` step 4. This is a
  read-and-confirm task; it produces no edits.
- **Files to change.** **None.** Read-only verification of: `manage-issues.md` (its "turns the issue into
  `intent.md`" description and the canonical format/classification rules it now sources for step 4),
  `work-on-an-issue.md` (its step-2 pointer to `create-pipeline.md`), `autonomous-workflow.md` /
  `assisted-workflow.md` (phase 0 stays "Already in place"; the autonomous "no questions" rule is scoped to
  after run-start, structurally after creation), `fork-pipeline.md` (forks copy `0-intent/` verbatim),
  `resume-pipeline.md` (never re-runs phase 0), `pipeline-versioning.md` (phase-0 predicate =
  `0-intent/intent.md` and the shared-root byte-identity invariant), and `.rp.md` (the Issues convention
  already covers reading).
- **Changes.** None. Confirm:
  - `manage-issues.md` still reads correctly as the canonical-format source now that `create-pipeline.md`
    step 4 cross-references it (the first such cross-reference from another reference file). The taxonomy and
    classification rules step 4 delegates to are present and unchanged.
  - `work-on-an-issue.md`'s pointer to `create-pipeline.md` picks up the rewrite automatically; no edit.
  - The workflow files' "Already in place" for phase 0 and the after-run-start scoping of "no questions"
    remain accurate; no carve-out is needed.
  - `fork-pipeline.md` (verbatim `0-intent/` copy), `resume-pipeline.md` (no phase-0 re-run), and
    `pipeline-versioning.md` (single-content-file phase-0 predicate, shared-root byte-identity) stay
    consistent with writing no approval file.
  - `.rp.md`'s Issues convention already covers reading issues, so the comments-read pointer does not dangle;
    no `.rp.md` edit is in scope.
- **Depends on.** Tasks 1–6 (verification runs against the finished step-4 rewrite).
- **Traces to.** Spec req 15 (fresh-creation only; fork/resume/authoring/phases 1–5 unchanged; no
  autonomous "no questions" handling); out-of-scope 1 (no source-issue write — step 4 only reads the issue
  and writes `intent.md`), out-of-scope 3 (no change to forking), out-of-scope 4 (no change to issue
  authoring), out-of-scope 5 (no change to phases 1–5); KD-12.
- **Acceptance.** No file other than `create-pipeline.md` is modified. Each listed neighbor is confirmed to
  still read coherently with the rewritten step 4: `manage-issues.md` is a valid delegation target,
  `work-on-an-issue.md`'s pointer needs no change, the workflow files need no "no questions" carve-out, and
  the fork/resume/versioning invariants are consistent with the no-approval-file decision. The source issue
  is only read, never written.

---

## Coverage check

**Every spec requirement is covered by at least one task:**

| Spec req | Task(s) |
|---|---|
| 1 (always canonical; title→H1; attribution) | 1 |
| 2 (read full picture: body + all comments + references) | 5 |
| 3 (section mapping; comment/reference not more authoritative) | 5 |
| 4 (faithful; no added reqs; Goal=outcome; hypotheses open) | 5 |
| 5 (exactly one gate; all-three = "no transformation") | 3 |
| 6 (skip clause A — canonical body) | 3 |
| 7 (skip clause B — no comments) | 3 |
| 8 (skip clause C — no references) | 3 |
| 9 (all three hold → map verbatim, skip, commit) | 4 (with framing from 1) |
| 10 (any fails → synthesize + confirm; no escape hatch) | 5 |
| 11 (show full proposed `intent.md`; optional summary) | 5 |
| 12 (iterate-until-approved; commit on explicit approval) | 5 |
| 13 (no persisted artifact; predicate unchanged) | 6 |
| 14 (placement in step 4; assets preserved both paths) | 2, 6 |
| 15 (fresh-creation only; neighbors unchanged; no autonomous handling) | 7 |

**Every design decision is covered by at least one task:**

| KD | Task(s) |
|---|---|
| KD-1 (terse workflow-driver idiom; inline `**If …**`) | ground rules + 4, 5 |
| KD-2 (hoist shared asset concern; don't duplicate) | 2 |
| KD-3 (clause A — four-point structural check vs. `manage-issues.md` headings) | 1, 3 |
| KD-4 (clause C — body-only reference scan with exclusions) | 3 |
| KD-5 (all reads via Issues convention; comments read is net-new) | 3, 5 |
| KD-6 (declarative unordered conjunction; no separate "transforms" check) | 3, 4 |
| KD-7 (synthesis delegates section-mapping; one synthesis note) | 5 |
| KD-8 (explicit template: title-as-H1 + `> Source:`) | 1 |
| KD-9 (referenced-content read at capability altitude; one-level boundary) | 5 |
| KD-10 (confirmation: full artifact, iterate-until-approved) | 5 |
| KD-11 (no approval/review file; gate in step 4; step 5 unchanged) | 5, 6 |
| KD-12 (change confined to step 4; neighbors verified coherent) | 7 |

**Out-of-scope items honored:** OOS-1 (no source-issue write) → Task 7; OOS-2 (no approval artifact) →
Task 6; OOS-3/4/5 (no change to fork / authoring / phases 1–5) → Task 7; OOS-6 (no semantic canonical
gate) → Task 3; OOS-7 (no comment author/automation filtering) → Task 3; OOS-8 (no recursive
reference-following) → Task 5; OOS-9 (divergent intent across non-fork pipelines) → accepted limitation,
not implemented.
