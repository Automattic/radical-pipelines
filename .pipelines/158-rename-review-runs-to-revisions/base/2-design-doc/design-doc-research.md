# Design Research: Rename "review runs" to "revisions"

This is a documentation/skill rename. The design is the precise **execution plan for the
rename** — translating the spec's WHAT (the invariants and named-token target wordings) into
HOW (the exhaustive, verified occurrence set; the file renames and their inbound references;
the must-not-touch phase-audit boundary; the `.pipelines/` historical-data boundary; and the
verification method). The spec deliberately left the token-by-token map as HOW; the spec-phase
`spec-research.md` (Q3 A–F) has a first draft that this phase must independently re-verify and
complete against the current codebase, because the invariants bind on completeness, not on the
draft's counts.

## Research

<!-- Non-trivial findings from the design-doc-researcher, with sources cited. -->

### Footprint inventory (analyst-verified, live grep)

Total `review` (case-insensitive) hits across `skills/`, `agents/`, `.rp.md`: **252**. Total
`revis` hits (the generic edit-an-artifact baseline that must stay unchanged): **32**. The vast
majority of the 252 are phase-audit (KEEP); the run-creation surface is a small subset confined
to a few `reference/` files plus `.rp.md`. (Source: `grep -rni 'review'` / `grep -rni 'revis'`.)

Key structural facts the analyst confirmed independently (not from the spec-research draft):

- **`agents/` contains only phase-audit "review".** All 105 `review` hits in `agents/` are
  reviewer-agent names, approval/rejection artifacts, or generic owner/critique prose. None is
  run-creation. **The rename touches no agent profile.** The rename surface is entirely within
  `skills/radical-pipelines/reference/` plus `.rp.md`. (Source: `grep -rni review agents/`.)
- **`Reviewer base ref` heading: 1 definition + 4 inbound references** (corrects spec-research's
  "2"). Def: `pipeline-versioning.md:21`. Inbound: `autonomous-workflow.md:39`,
  `review-pipeline.md:29`, `autonomous-phases/4 - code.md:37`, `autonomous-phases/5 - docs.md:37`.
  The two per-phase inbound refs sit on lines otherwise dense with phase-audit tokens
  (`code-reviewer`/`docs-reviewer`, `code-review-N-rejected.md`, `code-review-approved.md`) — a
  precision-surgery zone (see Risks). (Source: `grep -rn 'Reviewer base ref'`.)
- **`review-pipeline.md` filename: exactly 1 inbound reference in scope** —
  `work-on-an-issue.md:36`. Every other `review-pipeline` hit repo-wide is under `.pipelines/`
  (historical artifacts, out of scope). `SKILL.md` does not enumerate the file (its entry-point
  table lists only `work-on-an-issue.md` and `manage-issues.md`), so no SKILL.md change is needed
  for the rename. (Source: repo-wide `grep -rln 'review-pipeline'`.)
- **Direct route phrase `"review this pipeline"`: exactly 1 occurrence** —
  `review-pipeline.md:9`. No separate route registry maps the phrase, so requirement 7 is a single
  in-file edit. (Source: `grep -rni 'this pipeline'`.)
- **`Review run` term: definition at `pipeline-versioning.md:25`** (`**Review run**`), plus prose
  "review run" at `review-pipeline.md:3,40,54`, `pipeline-versioning.md:55`, `.rp.md:35`. The
  bolded convention term `**Review run**` (def) → `**Revision run**`; the prose "review run"
  instances → "revision run". `**Base run**` (`:26`) stays. (Source: `grep -rni 'review run'`.)
- **`SKILL.md` "review" hits (`:15` "review, revise, and relaunch", `:29` "owner reviews and
  approves") are generic owner-review-of-artifacts → KEEP** (invariant 11). (Source: read.)

### Same-file mixed cases (rename vs. keep collisions in one file)

`pipeline-versioning.md` is the trickiest file: it carries run-creation "review" (rename) AND
generic "revised" (keep) AND phase-audit "review" (keep):
- Rename (run-creation): `:15,17,19,25,53,55,65,117` (run-folder convention, `**Review run**`
  heading term, "a review only ADDS", "every review of a pipeline", "a new review may start",
  "reviews are not part of the cross-pipeline tree", the `base → review-1 → review-2` chain).
- Keep (generic edit): `:112` "v4 forked from v1 and revised the spec" / "it revised the intent" —
  these describe a fork editing an artifact, NOT a revision run. Must stay verbatim.
- Keep (phase-audit): the per-phase completion table `:45-49` (`*-review-approved.md` rows),
  `:28` "code/docs reviewer invocation".

## Topics

<!-- One decision per topic, each tracing to a spec requirement / acceptance criterion. -->

### Topic 1: The exhaustive, verified occurrence set (authoritative token map)

- **Spec link:** Invariants 3, 11, 12; global acceptance criteria (completeness). This is the
  load-bearing HOW the spec deliberately left out — the spec binds on "every occurrence", and the
  implementer is responsible for independently locating the full set.
- **Why re-verify, not trust the draft:** `spec-research.md` Q3 (A–F) has a first-draft map, but
  it undercounted the inbound references to the `Reviewer base ref` heading (draft said 2; live
  count is 4 — it missed `autonomous-phases/4 - code.md:37` and `autonomous-phases/5 - docs.md:37`).
  Invariants bind on completeness, not on the draft's counts, so the design re-enumerated from a
  live `grep -rni 'review'` / `grep -rni 'revis'` over `skills/`, `agents/`, `.rp.md` and
  classified every hit. Both the researcher and the analyst ran the grep; the two passes agree.

**Decision — the authoritative rename map is 36 lines across exactly 5 files; everything else is
KEEP.** Reconciliation: 252 `review` lines total = 36 bucket-A (rename) + 216 bucket-B
(phase-audit, keep); plus 32 `revis` lines, all bucket-D (generic edit, keep). The 5 rename files
are the entire surface. No agent profile is touched.

**Rename file 1 — `pipeline-versioning.md` (9 of its 15 review-lines):**

| Line | Token (current) | Target |
| ---- | --------------- | ------ |
| :15 | run names `review-1-<short-description>`, `review-2-…` | `revision-1-<short-description>`, `revision-2-…` |
| :17 | "rewritten by a review; a review only ADDS…the review's goal…`review-N-…`…existing `review-*` folders" | review→revision throughout; KEEP `N` monotonic-counter + kebab `<short-description>` rules in substance (spec req 2) |
| :19 | "every review of a pipeline…Reviews are added one at a time" | revision / Revisions |
| :21 | `### Reviewer base ref` (heading DEF) | `### Revision base ref` (spec req 9) |
| :25 | `**Review run**`…`review-(N-1)`…"the review run begins…the review's intent…the review run's first commit" | `**Revision run**`…`revision-(N-1)`…"revision run"/"revision's intent" (spec req 9 + req 5: never bare "revision") |
| :53 | "highest-numbered `review-N` run…no reviews" | `revision-N`…no revisions |
| :55 | "a new review may start…a review is in flight…a review run has only…that review's phase 1" | revision throughout |
| :65 | "reviews are not part of the cross-pipeline tree" | revisions |
| :117 | chain `base → review-1-<short-description> → review-2-…` | `base → revision-1-… → revision-2-…` |

KEEP in this file: `:28` "code/docs reviewer invocation" (phase-audit); `:45-49` completion table
`*-review-approved.md` rows (phase-audit); `:112` "v4…revised the spec…revised the intent"
(generic edit — a fork editing an artifact, NOT a revision run).

**Rename file 2 — `review-pipeline.md` → renamed to `revision-pipeline.md` (all 20 review-lines
are run-creation):** title `:1` "Reviewing a Pipeline" → "Revising a Pipeline" (spec req 6);
`:3,7,11,12,14,18,19,21,33,35,37,39,40,42,50,52,54` review→revision / reviewing→revising; `:9`
direct route `"review this pipeline"` → `"revise this pipeline"` (spec req 7); `:18`
"**Fork vs. review.**" → "**Fork vs. revision.**" (KEEP word "fork"); `:29` inbound ref
`**Reviewer base ref**` → `**Revision base ref**` (spec req 9 lockstep). KEEP within the file:
`:39` "a PR review" example (see FLAG-1 below); "fork", "tracker issue", "health monitor".

**Rename file 3 — `work-on-an-issue.md` (both review-lines):** `:36` "**Review** read
`review-pipeline.md`" → "**Revise** read `revision-pipeline.md`" (dispatch label spec req 8 +
filename ref spec req 6); `:40` "**Review** — layer an incremental change…" → "**Revise** —…"
(same-issue-action advisory spec req 8).

**Rename file 4 — `intent-format.md` (both review-lines):** `:3` "or a review intent" → "or a
revision intent"; `:33` "Review intents carry their mandatory **Origin** section" → "Revision
intents carry…" (KEEP "Origin"). Spec req 4.

**Rename file 5 — `.rp.md` (3 of its 10 review-lines):** `:35` "For a review run…not on a
review's intent" → "revision run…not on a revision's intent" (KEEP phase labels `1 - Spec`…
`5 - Docs`); `:36` and `:37` action-list verb "creating, resuming, forking, or reviewing" →
"…or revising". Spec req 10. KEEP: `:56` commit example `(spec-reviewer)`; `:83,87,89,91,93,95`
reviewer model-table rows.

**KEEP set (everything else):** all 6 reviewer agent profiles and references; `*-review-approved.md`
and `*-review-N-rejected.md` artifacts; per-phase artifact lists / mermaid nodes / `# Spec Review`
etc. headings; "review-style check", "review file"; generic owner-review (`SKILL.md:15,29`,
`assisted-workflow.md`); and all 32 generic `revis` sites (the "smallest revision that would
unblock you" blocker lines, fork "revised the spec/intent", etc.). Invariants 11, 12.

- **Rationale:** The map is the binding completeness artifact. Confining the rename to 5 files and
  36 lines makes the change auditable: the writer edits a closed set, and verification (Topic 5)
  re-runs the same greps to prove the bucket boundaries held.
- **Closure proof (two independent passes agree).** A corpus-wide regex for run-creation tokens
  (`review run|review intent|new review|review-N-<short|review-[0-9]+-<short`) over `skills/`,
  `agents/`, `.rp.md` **excluding the 5 bucket-A files returns zero hits** — no run/run-creation
  "review" token exists outside the 5 rename files. The 3 highest non-A counts
  (`autonomous-phases/3 - plan.md` 16, `assisted-phases/3 - plan.md` 16, `code-plan-writer.md` 3)
  were line-checked: all phase-audit (`*-plan-review-N-rejected.md` / `*-plan-review-approved.md`
  artifacts, reviewer-agent rows, "review-style check", "# … Plan Review" headings), zero
  run-creation. Invariants 3/11/12 hold under the 36-line / 5-file partition. (Source: live regex,
  this session, run by both researcher and analyst.)

### Topic 1a — FLAG-1: `review-pipeline.md:39` "a PR review" (within-line keep)

- **Spec link:** Invariant 11 (generic owner-review-of-artifacts preserved); req 4 (revision intent).
- **Context:** Line 39 describes the Origin section's content as "a direct quote or faithful
  paraphrase of the owner's change, a PR comment, a PR review, etc". The line otherwise renames
  ("a review intent carries these review-only additions" → revision). But "a PR review" names a
  kind of external source the change came from — a code-review-platform PR review, i.e. generic
  owner-review-of-artifacts — not a pipeline run or the run-creation activity.
- **Decision:** KEEP "a PR review" verbatim; rename only the run-creation "review" tokens on that
  line. This is a within-line precision edit, not a blanket replace.
- **Rationale:** Invariant 11 preserves generic owner-review; invariant 12 forbids landing
  "revision" on a non-run concept. "a PR revision" would be wrong — it would rename an external
  artifact-review into the pipeline run sense.

### Topic 1b — FLAG-2: `Reviewer base ref` has 4 inbound references, not 2

- **Spec link:** Req 9 (invariant on inbound references — every reference resolves to the renamed
  heading, none left dangling).
- **Decision:** The heading `### Reviewer base ref` (def at `pipeline-versioning.md:21`) → `###
  Revision base ref`, and all **4** inbound references update in lockstep: `review-pipeline.md:29`,
  `autonomous-workflow.md:39`, `autonomous-phases/4 - code.md:37`, `autonomous-phases/5 - docs.md:37`.
- **Rationale:** Spec req 9 is an invariant; the count in the draft (2) was illustrative and wrong.
  Two of the four (`4 - code.md:37`, `5 - docs.md:37`) sit inside otherwise-KEEP phase-audit lines
  (they also mention `code-reviewer`/`docs-reviewer`, `code-review-N-rejected.md`,
  `code-review-approved.md`) — the writer renames only the `**Reviewer base ref**` substring on
  those lines. Highest-risk spot in the change (see Risks).

### Topic 2: Approach — the end-to-end mental model for the rename

- **Spec link:** Overview; all requirements (this is the execution shape).
- **Decision:** A scoped, mechanical find-and-replace executed as **per-file precision edits over a
  closed 5-file / 36-line set**, plus **one file rename** (`review-pipeline.md` →
  `revision-pipeline.md`) and **one inbound filename-reference update** (`work-on-an-issue.md:36`).
  Not a blanket `sed s/review/revision/` — the corpus has 252 `review` lines of which only 36 are
  in scope, and three files (`pipeline-versioning.md`, `.rp.md`, and within `review-pipeline.md`
  line 39) mix rename and keep tokens on adjacent or same lines. The implementer works the Topic 1
  map line by line, then verifies by re-grep (Topic 5).
- **Rationale:** The named-token requirements fix exact target wordings and the invariants forbid
  collateral damage to phase-audit "review" and generic "revise"; both demand surgical edits, not
  a global substitution.

### Topic 3: File rename mechanism and reachability

- **Spec link:** Req 6 ("reachable under a `revision`-named filename"; "every place that
  referenced its previous name continues to reach it").
- **Decision:** Rename `skills/radical-pipelines/reference/review-pipeline.md` →
  `revision-pipeline.md` with `git mv` (preserve history), update its in-file title and body per
  the Topic 1 map, and update the sole in-scope inbound filename reference at
  `work-on-an-issue.md:36`. No other in-scope file references the filename; `SKILL.md`'s
  entry-point table does not list it (it lists only `work-on-an-issue.md` and `manage-issues.md`),
  so reachability is preserved by the single `work-on-an-issue.md` edit. The direct route phrase
  `"revise this pipeline"` (`revision-pipeline.md:9`) is the other reachability path and is in-file.
- **Rationale:** `git mv` keeps the file's history attached; the closed inbound-reference set
  (verified repo-wide: 1 in-scope ref) means the rename cannot strand any reachable path.

### Topic 4: The `.pipelines/` historical-data boundary (no migration, no dual-recognition)

- **Spec link:** Out of Scope (migration; transitional dual-recognition; behavioral change).
- **Decision:** Touch nothing under `.pipelines/`. The hundreds of `review-pipeline` /
  `review-N-*` hits there are committed historical artifacts and stay verbatim. The skill's two
  prose globs in `pipeline-versioning.md` (`:17` "next integer after the existing `review-*`
  folders"; `:53` "highest-numbered `review-N` run") change to `revision-*` / `revision-N`
  **only** — no `review-* OR revision-*` dual-glob is added. These two globs are already inside
  the Topic 1 rename set (`:17`, `:53`), so no extra surface is introduced.
- **Rationale:** The project rule (CLAUDE.md/AGENTS.md line 15) forbids encoding migration
  leftovers or transient dual-handling in the skill; the spec accepts the documented mis-count
  consequence for any legacy `review-N`-bearing pipeline later resumed/revised (see Risks).
- **Run-folder-reader completeness (analyst-verified):** A live grep for run-folder pattern reads
  (`review-[0-9]`, `review-N`, `review-*`, "latest run", "highest-numbered", "next integer")
  confirms the two `review-*`/`review-N` run-folder globs live **only** in `pipeline-versioning.md`
  (`:17`, `:53`), both already in the rename set. Other files that reason about runs
  (`resume-pipeline.md:20,27`, `work-on-an-issue.md:27,39`, `fork-pipeline.md:14`) refer to "latest
  run"/"completed phase" **abstractly and delegate** the run-folder pattern to
  `pipeline-versioning.md`'s rules — they hardcode no `review-*` glob, so they need no change.
  Distinct and untouched: the many `*-review-N-rejected.md` matches in phase files / reviewer
  agents are rejection-**iteration** counters (phase-audit), not run counters — exactly the
  `review-2`-run vs `spec-review-2-rejected.md`-iteration collision the rename dissolves. (Source:
  `grep -rniE 'review-[0-9]|review-n|review-\*|highest-numbered|next integer|latest run'`.)

### Topic 5: Verification method

- **Spec link:** All invariants and global acceptance criteria.
- **Decision:** Verify by re-running the same greps that defined the map and asserting the bucket
  boundaries held:
  1. `grep -rni 'review' skills/ agents/ .rp.md` — every remaining hit must be phase-audit
     (the 216 KEEP lines); zero run/run-creation "review" tokens remain (invariant 3 / AC).
  2. `grep -rn 'review-pipeline' skills/ agents/ .rp.md` — zero hits (file renamed, sole inbound
     ref updated).
  3. `grep -rn 'Reviewer base ref' skills/ agents/ .rp.md` — zero hits; `grep -rn 'Revision base
     ref'` — 1 def + 4 inbound (req 9 invariant, none dangling).
  4. `grep -rni 'revision' skills/ agents/ .rp.md` — every new "revision"/"revise" token is on a
     run/run-creation concept; cross-check the 32-line generic `revis` baseline is unchanged
     (invariants 11/12, req 5).
  5. Confirm no `revision-N` collides with a rejection-iteration name (e.g. `revision-2` vs
     `spec-review-2-rejected.md` are unambiguously different) — automatic once runs are
     `revision-N`.
  6. Confirm the 6 reviewer agent names, `*-review-approved.md`, `*-review-N-rejected.md` are
     byte-unchanged (diff the KEEP files; they should show no change).
- **Rationale:** The greps that establish completeness are the same greps that prove it; making
  verification a re-grep keeps the binding invariant checkable rather than asserted.

### Topic 6: Components, interfaces, dependencies, failure modes

- **Spec link:** Whole spec (documentation change — these dimensions are thin but stated for
  completeness).
- **Components:** Modified — `pipeline-versioning.md`, `review-pipeline.md` (renamed),
  `work-on-an-issue.md`, `intent-format.md`, `.rp.md`, plus single-token edits to
  `autonomous-workflow.md`, `autonomous-phases/4 - code.md`, `autonomous-phases/5 - docs.md` (the
  base-ref heading refs). Untouched-but-relevant — all 6 reviewer agent profiles, `SKILL.md`,
  per-phase artifact lists (they reference phase-audit "review", which must not move).
- **Interfaces / data flow:** The only "interface" is documentary: the run-folder naming
  convention (`revision-N-<short-description>`), the command-document filename
  (`revision-pipeline.md`), the convention heading (`Revision base ref`), the intent type name
  ("revision intent"), the dispatch label/route ("Revise" / "revise this pipeline"). No code
  signature, schema, or wire format changes. No new dependency — purely prose edits.
- **Failure modes / observability:** Failure modes are authoring errors, not runtime faults:
  (a) collateral rename of a phase-audit or generic-`revis` token; (b) a missed run-creation
  token left as "review"; (c) a dangling reference to the renamed heading or filename. All three
  are detected by the Topic 5 re-greps, which are the observability surface for this change. The
  downstream design-doc-reviewer and code/docs reviewers are the human-style audit.

## Open Questions

- **Phrasing of run-creation prose that currently reads naturally with "review" as a noun.** The
  map fixes target wording per token, but a few lines (e.g. `pipeline-versioning.md:17,19`,
  `review-pipeline.md:54`) carry several "review" tokens in one sentence. The implementer must
  re-read each rewritten sentence for natural English (e.g. "a revision only ADDS a sibling run
  folder"), not just swap tokens. Deferred to the code phase; no design impact.
- **Section-heading wording inside `revision-pipeline.md`** (e.g. `:7` "Confirm review
  preconditions"). The map says rename review→revision; the exact heading phrasing ("Confirm
  revision preconditions") is an authoring choice left to the writer. No requirement pins it.

## Risks

- **Precision-surgery lines (highest risk).** `autonomous-phases/4 - code.md:37` and
  `autonomous-phases/5 - docs.md:37` each contain exactly one in-scope token (`**Reviewer base
  ref**`) embedded in otherwise phase-audit prose that names `code-reviewer`/`docs-reviewer`,
  `code-review-N-rejected.md`, `code-review-approved.md`. A blanket replace here would corrupt
  phase-audit names (invariant 11) and/or land "revision" on a phase-audit concept (invariant 12).
  Mitigation: the Topic 1 map calls these out explicitly; the writer changes only the heading-ref
  substring; the Topic 5 re-grep (KEEP files diff to zero except the one substring) catches a slip.
- **Same-line mixed tokens in `review-pipeline.md:39`** ("a review intent carries…" renames, but
  "a PR review" keeps — FLAG-1). Same mitigation: per-token edit + verification.
- **Same-file mixed buckets in `pipeline-versioning.md`** (`:112` generic "revised" must survive
  while `:15-65` run-creation review renames) and `.rp.md` (`:35-37` rename vs. `:56,83-95` keep).
  Mitigation: map enumerates keep-lines explicitly.
- **Accepted behavioral seam (out of scope, owner-confirmed).** After the globs flip to
  `revision-*` only, a pre-existing pipeline whose runs are legacy `review-N` (e.g. under
  `.pipelines/95-*`, `.pipelines/121-*`), if later resumed or revised, would be mis-counted /
  mis-identified by the orchestrator because the skill no longer recognizes the legacy names. The
  spec accepts this consequence (Out of Scope) and adds no dual-recognition. Flagged here for the
  downstream phases' awareness, not for resolution.
- **Generic-`revis` reverse collision (soft).** "revision"/"revise" already exists as generic
  English in 32 sites; the new run sense is disambiguated by always writing "revision run" /
  `revision-N` (never bare "revision") per req 5. The writer must not "tidy" any of the 32 generic
  sites into the run sense, nor introduce a bare "revision" for the run.
