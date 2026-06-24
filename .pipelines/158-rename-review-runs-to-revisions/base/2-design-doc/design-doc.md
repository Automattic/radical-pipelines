# Design Doc: Rename "review runs" to "revisions"

## Overview

In the Radical Pipelines skill, the runs that follow a pipeline's `base` run are
currently called "reviews" (`review-1`, `review-2`, …). The word "review" is overloaded:
it names these follow-up runs *and* it names unrelated phase-auditing concepts — the
reviewer agents (`spec-reviewer`, `code-reviewer`, …), the per-phase approval/rejection
artifacts (`*-review-approved.md`, `*-review-N-rejected.md`), and the phase-audit reviewing
prose. The sharpest collision is between a run number (`review-2`) and a rejection-iteration
number (`spec-review-2-rejected.md`), where the same digit means two different things.

The chosen approach is a **scoped, mechanical rename** of the follow-up run and the activity
that creates it to the noun **revision** and verb **revise**, executed as per-file precision
edits over a closed, independently verified occurrence set, plus one file rename
(`review-pipeline.md` → `revision-pipeline.md`). The phase-auditing meaning of "review" is
preserved byte-for-byte. After the change, every remaining "review" in `skills/`, `agents/`,
and `.rp.md` denotes phase-auditing only. This is a vocabulary / naming-convention change to
the skill's going-forward instructions; it does not change how pipelines actually run, and it
does not migrate existing on-disk run folders.

## Approach

The corpus (`skills/`, `agents/`, `.rp.md`) contains **252** case-insensitive `review` lines
and **32** `revis` lines. The design partitions every one of those lines into four buckets:

- **Bucket A — rename (run-creation "review"):** 35 lines across exactly **5 files**. These name
  the follow-up run, the act of creating it, the command document, the route, the intent, the
  dispatch label, and the base-ref convention. They become "revision"/"revise".
- **Bucket B — keep (phase-audit "review"):** 217 lines. Reviewer agent names,
  `*-review-approved.md`, `*-review-N-rejected.md`, phase-audit reviewing prose ("review-style
  check", "review file"), `# Spec Review` / `# Code Review` artifact headings, and generic
  owner-review-of-artifacts. Unchanged.
- **Bucket C — file rename:** `review-pipeline.md` → `revision-pipeline.md`, with its single
  in-scope inbound filename reference updated.
- **Bucket D — keep (generic "revise"/"revision"):** all 32 `revis` lines (e.g. "the smallest
  revision that would unblock you"; a fork that "revised the spec/intent"). Unchanged.

The implementer works the bucket-A map line by line — **not** a blanket
`sed s/review/revision/`, because three files mix rename and keep tokens on adjacent or even the
same line (`pipeline-versioning.md`, `.rp.md`, and `review-pipeline.md:39`). After editing, the
implementer re-runs the same greps that defined the map to prove the bucket boundaries held (see
Failure Modes and Observability). The mental model is: **the rename surface is a closed set of 5
files / 35 lines; everything else is provably out of scope, and the proof is a re-grep.**

A standing disambiguation rule governs all bucket-A prose: the run is always written as a
**"revision run"** or as **`revision-N`**, never as a bare "revision". This keeps the run sense
distinct from the pre-existing generic-English "revise"/"revision" already living in bucket D
(req 5).

## Components

This is a documentation change; "components" are skill files and their roles.

**Modified (bucket A — run-creation rename):**

- `skills/radical-pipelines/reference/pipeline-versioning.md` — defines the run-folder naming
  convention, the `Reviewer base ref` heading (renamed to `Revision base ref`), the `Review run`
  convention term (→ `Revision run`), and the latest-run / next-number rules. 8 of its 15
  review-lines are bucket A; the rest are keep (see below).
- `skills/radical-pipelines/reference/review-pipeline.md` → **renamed** to `revision-pipeline.md`
  (bucket C). The run-creation command document. All 20 of its review-lines are bucket A except
  the within-line "a PR review" keep on `:39`.
- `skills/radical-pipelines/reference/work-on-an-issue.md` — the entry-point dispatcher. Carries
  the **Revise** dispatch label, the same-issue-action advisory, and the sole in-scope inbound
  reference to the renamed command-document filename.
- `skills/radical-pipelines/reference/intent-format.md` — names the **revision intent** type.
- `.rp.md` — the project conventions file. Carries orchestrator-update prose for a revision run
  and the action-list verb "revising".

**Modified (bucket A — single base-ref heading reference each):**

- `skills/radical-pipelines/reference/autonomous-workflow.md`
- `skills/radical-pipelines/reference/autonomous-phases/4 - code.md`
- `skills/radical-pipelines/reference/autonomous-phases/5 - docs.md`

These three each contain exactly one in-scope token — the `**Reviewer base ref**` reference —
and (for the two phase files) it sits embedded in otherwise phase-audit prose. Only the
heading-reference substring changes.

**Untouched-but-relevant (must not move):**

- All 6 reviewer agent profiles (`agents/spec-reviewer.md`, `design-doc-reviewer.md`,
  `code-plan-reviewer.md`, `docs-plan-reviewer.md`, `code-reviewer.md`, `docs-reviewer.md`) and
  every reference to them. `agents/` contains **only** phase-audit "review" (all 105 hits) — **the
  rename touches no agent profile.**
- `SKILL.md` — its "review" hits (`:15` "review, revise, and relaunch"; `:29` "owner reviews and
  approves") are generic owner-review-of-artifacts. Its entry-point table lists only
  `work-on-an-issue.md` and `manage-issues.md`, so it does not enumerate the renamed file and needs
  no change for reachability.
- All per-phase artifact lists, mermaid nodes, and `# … Review` headings that name phase-audit
  "review".

## Interfaces and Data Flow

The only "interfaces" here are documentary conventions; no code signature, schema, or wire format
changes, and no data flow at runtime changes. The conventions that change are:

- **Run-folder naming convention:** `revision-N-<short-description>` (was
  `review-N-<short-description>`). `base` is unchanged. The `<short-description>` kebab-case
  pipeline-slug formatting rule and the `N` monotonic-counter rule (next integer after existing
  follow-up runs) are unchanged in substance.
- **Command-document filename:** `revision-pipeline.md` (was `review-pipeline.md`), reachable via
  (a) the dispatcher reference in `work-on-an-issue.md:36` and (b) the in-file direct route phrase.
- **Convention heading:** `### Revision base ref` (was `### Reviewer base ref`), referenced by name
  from 4 inbound sites that update in lockstep.
- **Convention term:** `**Revision run**` (was `**Review run**`). `**Base run**` is unchanged.
- **Intent type name:** "revision intent" (was "review intent"); its mandatory **Origin** section
  keeps its name.
- **Dispatch label / route phrase:** the menu label and same-issue advisory read **"Revise"**; the
  direct route phrase reads **"revise this pipeline"**.

**Reachability data flow (the renamed file).** Two paths reach the command document, and both are
preserved:

1. The dispatcher: `work-on-an-issue.md:36` (`**Revise** read `revision-pipeline.md``).
2. The direct route: the in-file `"revise this pipeline"` phrase at `revision-pipeline.md:9`, which
   bypasses the dispatcher and re-verifies the hard gates independently.

A repo-wide search confirms every other `review-pipeline` hit lives under `.pipelines/`
(historical artifacts, out of scope), so no other in-scope path references the filename.

**Base-ref reference data flow (the renamed heading).** The heading is defined once
(`pipeline-versioning.md:21`) and referenced by name from 4 inbound sites, all of which must
resolve to the renamed heading after the change (req 9 is an invariant on inbound references):

| Site | Role |
| ---- | ---- |
| `pipeline-versioning.md:21` | Definition: `### Reviewer base ref` → `### Revision base ref` |
| `autonomous-workflow.md:39` | Inbound `**Reviewer base ref**` reference |
| `revision-pipeline.md:29` | Inbound `**Reviewer base ref**` reference (renamed file) |
| `autonomous-phases/4 - code.md:37` | Inbound `**Reviewer base ref**` reference, embedded in phase-audit prose |
| `autonomous-phases/5 - docs.md:37` | Inbound `**Reviewer base ref**` reference, embedded in phase-audit prose |

### Authoritative rename map (bucket A)

The map below is the binding completeness artifact. It was produced by an independent live
`grep -rni 'review'` / `grep -rni 'revis'` over `skills/`, `agents/`, `.rp.md`, classifying every
hit, and re-verified against the live tree while writing this doc. Two independent passes agree.

**`pipeline-versioning.md` (8 bucket-A lines):**

| Line | Token (current) | Target |
| ---- | --------------- | ------ |
| :15 | run names `review-1-<short-description>`, `review-2-…` | `revision-1-<short-description>`, `revision-2-…` |
| :17 | "rewritten by a review; a review only ADDS…the review's goal…`review-N-…`…existing `review-*` folders" | review→revision throughout; keep `N` monotonic-counter + kebab `<short-description>` rules in substance |
| :19 | "every review of a pipeline…Reviews are added one at a time" | revision / Revisions |
| :21 | `### Reviewer base ref` (heading definition) | `### Revision base ref` |
| :25 | `**Review run**`…`review-(N-1)`…"the review run begins…the review's intent…the review run's first commit" | `**Revision run**`…`revision-(N-1)`…"revision run" / "revision's intent" (never bare "revision") |
| :53 | "highest-numbered `review-N` run…no reviews" | `revision-N`…no revisions |
| :55 | "a new review may start…a review is in flight…a review run has only…that review's phase 1" | revision throughout |
| :65 | "reviews are not part of the cross-pipeline tree" | revisions |
| :117 | chain `base → review-1-<short-description> → review-2-…` | `base → revision-1-… → revision-2-…` |

Keep in this file: `:28` "code/docs reviewer invocation" (phase-audit); `:45-49` completion table
`*-review-approved.md` rows (phase-audit); `:112` "v4…revised the spec…revised the intent" (generic
edit — a fork editing an artifact, not a revision run).

**`review-pipeline.md` → `revision-pipeline.md` (all 20 review-lines are bucket A):** title `:1`
"Reviewing a Pipeline" → "Revising a Pipeline"; `:3,7,11,12,14,18,19,21,33,35,37,39,40,42,50,52,54`
review→revision / reviewing→revising; `:9` direct route `"review this pipeline"` → `"revise this
pipeline"`; `:18` "**Fork vs. review.**" → "**Fork vs. revision.**" (the word "fork" is kept);
`:29` inbound base-ref reference `**Reviewer base ref**` → `**Revision base ref**`. **Within-line
keep on `:39`:** "a PR review" stays verbatim (see Decision: within-line precision below); only the
run-creation "review" tokens on that line ("MANDATORY for reviews", "this review intent") rename.
Keep elsewhere in the file: "fork", "tracker issue", "health monitor".

**`work-on-an-issue.md` (both review-lines):** `:36` "**Review** read `review-pipeline.md`" →
"**Revise** read `revision-pipeline.md`" (dispatch label + filename reference); `:40` "**Review** —
layer an incremental change…" → "**Revise** —…" (same-issue-action advisory).

**`intent-format.md` (both review-lines):** `:3` "or a review intent" → "or a revision intent";
`:33` "Review intents carry their mandatory **Origin** section…" → "Revision intents carry…" (the
**Origin** name is kept).

**`.rp.md` (3 of its 10 review-lines):** `:35` "For a review run…not on a review's intent" →
"revision run…not on a revision's intent" (the phase labels `1 - Spec`…`5 - Docs` are kept); `:36`
and `:37` action-list verb "creating, resuming, forking, or reviewing" → "…or revising". Keep:
`:56` commit example `(spec-reviewer)`; `:83,87,89,91,93,95` reviewer model-table rows.

## Key Decisions

### Decision: Rename the run-creation activity and its command, not only the run folders

- **Choice:** Rename the follow-up run, the act of creating it, the command document, the route,
  the intent, the dispatch label, and the base-ref convention to "revision"/"revise" — not just the
  `review-N` folder name.
- **Alternatives:** A folder-only rename (change `review-N` → `revision-N` and stop).
- **Trade-offs:** A folder-only rename would leave the run-creation activity still called "review",
  so "review" would remain overloaded and the stated goal would not be met. Renaming the activity is
  larger but is what actually frees "review" for the phase-auditing sense.
- **Traces to:** Requirements 3, 6, 7, 8, 10; the global invariant acceptance criterion that no run
  or run-creation concept is named "review".

### Decision: Per-file precision edits over a blanket substitution

- **Choice:** Edit the closed 35-line / 5-file map line by line; never a global
  `sed s/review/revision/`.
- **Alternatives:** A corpus-wide find-and-replace.
- **Trade-offs:** A blanket replace is faster but would corrupt the 217 phase-audit lines and the 32
  generic-`revis` lines, and would mis-handle the three files that mix buckets on adjacent or same
  lines. Precision edits are more work but are the only way to honor both the named-token target
  wordings and the keep-invariants.
- **Traces to:** Requirements 4–10 (named-token target wordings) and invariants 11, 12 (no
  collateral damage to phase-audit "review" or generic "revise").

### Decision: Rename the command file with `git mv` and update its one inbound reference

- **Choice:** `git mv skills/radical-pipelines/reference/review-pipeline.md
  skills/radical-pipelines/reference/revision-pipeline.md`, update the in-file title/body, and update
  the sole in-scope inbound filename reference at `work-on-an-issue.md:36`.
- **Alternatives:** Create a new file and delete the old (loses history); leave the filename as
  `review-pipeline.md` and rename only the title.
- **Trade-offs:** `git mv` preserves the file's history. Leaving the filename would violate req 6's
  "reachable under a `revision`-named filename". The inbound-reference set is closed (verified
  repo-wide: exactly 1 in-scope reference), so the rename cannot strand any reachable path.
- **Traces to:** Requirement 6 (command document titled "Revising a Pipeline", reachable under a
  `revision`-named filename, every previous reference continues to reach it).

### Decision: The base-ref heading has 4 inbound references, all updated in lockstep

- **Choice:** Rename the heading definition (`pipeline-versioning.md:21`) and update all 4 inbound
  references (`autonomous-workflow.md:39`, `revision-pipeline.md:29`, `autonomous-phases/4 -
  code.md:37`, `autonomous-phases/5 - docs.md:37`) to `Revision base ref`.
- **Alternatives:** Trust the spec-phase draft's count of 2 inbound references.
- **Trade-offs:** The draft count (2) was illustrative and missed the two per-phase references. Req 9
  is an invariant on inbound references — completeness binds, not the count — so the design
  re-enumerated from a live grep. Updating fewer than 4 would leave a dangling reference.
- **Traces to:** Requirement 9 / the invariant acceptance criterion that every reference to the
  heading resolves to the renamed heading, none left dangling.

### Decision: Within-line precision — keep "a PR review" on `revision-pipeline.md:39`

- **Choice:** On `:39`, rename the run-creation "review" tokens ("MANDATORY for reviews", "this
  review intent") to "revision" but keep "a PR review" verbatim.
- **Alternatives:** Blanket-replace every "review" on the line (would produce "a PR revision").
- **Trade-offs:** "a PR review" names an external source the change came from — a code-review-platform
  PR review, i.e. generic owner-review-of-artifacts — not a pipeline run. Renaming it would be wrong:
  it would land the run sense on a non-run concept.
- **Traces to:** Invariant 11 (generic owner-review-of-artifacts preserved) and invariant 12 (no
  "revision" term lands on a non-run / phase-audit concept); req 4 (the revision intent itself).

### Decision: Two run-folder globs flip to `revision-*` only — no dual-recognition

- **Choice:** The two prose globs in `pipeline-versioning.md` — `:17` "next integer after the
  existing `review-*` folders" and `:53` "highest-numbered `review-N` run" — change to `revision-*` /
  `revision-N` **only**. No `review-* OR revision-*` dual-glob is added. Nothing under `.pipelines/`
  is touched.
- **Alternatives:** Add transitional dual-recognition so the orchestrator still counts legacy
  `review-N` folders; migrate or rename existing `review-N-*` folders under `.pipelines/`.
- **Trade-offs:** Dual-recognition would avoid a mis-count for legacy pipelines but would encode a
  migration leftover in the skill, which the project rules forbid and the spec puts out of scope. The
  spec accepts the documented mis-count consequence. Both globs are already inside the bucket-A map
  (`:17`, `:53`), so no extra surface is introduced. A live grep confirms these are the **only** two
  `review-*`/`review-N` run-folder globs in the skill; other run-reasoning files
  (`resume-pipeline.md`, `work-on-an-issue.md`, `fork-pipeline.md`) refer to "latest run" abstractly
  and delegate the folder pattern to `pipeline-versioning.md`, so they need no change.
- **Traces to:** Out of Scope (no migration; no transitional dual-recognition; no behavioral change to
  pipeline execution).

### Decision: Always write "revision run" / `revision-N`, never a bare "revision"

- **Choice:** In all run-creation prose, the run appears as "revision run" or `revision-N`.
- **Alternatives:** Allow a bare "revision" as the run noun.
- **Trade-offs:** "revise"/"revision" already exists as generic English in 32 sites (bucket D). A bare
  "revision" for the run would collide with that generic sense; the qualified form keeps the two
  senses distinct.
- **Traces to:** Requirement 5.

## Dependencies

- **Internal:** `git mv` (history-preserving file rename). No new internal module relationships are
  created — the edits stay within `skills/radical-pipelines/reference/` and `.rp.md`.
- **External:** None. No external libraries, services, or systems.
- **New dependencies:** None. This is a prose-only change.

## Failure Modes and Observability

Failure modes are authoring errors, not runtime faults. There are three, and each is detected by a
re-grep that re-runs the analysis that defined the map:

1. **Collateral rename** — a phase-audit (bucket B) or generic-`revis` (bucket D) token is changed by
   mistake. Detected by: `grep -rni 'revision' skills/ agents/ .rp.md` must show every new
   "revision"/"revise" token on a run/run-creation concept; the 32-line generic `revis` baseline must
   be unchanged; diffing the KEEP files must show zero change except the single base-ref substring on
   the two phase files.
2. **Missed rename** — a run-creation token left as "review". Detected by: `grep -rni 'review'
   skills/ agents/ .rp.md` — every remaining hit must be phase-audit. A corpus-wide regex for
   run-creation tokens (`review run|review intent|new review|review-[0-9]+-<short`) excluding the 5
   rename files must return zero hits.
3. **Dangling reference** — a reference left pointing at the old filename or heading. Detected by:
   `grep -rn 'review-pipeline' skills/ agents/ .rp.md` → zero; `grep -rn 'Reviewer base ref'` → zero;
   `grep -rn 'Revision base ref'` → 1 definition + 4 inbound.

Additional verification, mapping directly to the acceptance criteria:

- No `revision-N` run name collides with a rejection-iteration name (e.g. `revision-2` vs
  `spec-review-2-rejected.md` are unambiguously different) — automatic once runs are `revision-N`.
- The 6 reviewer agent names, `*-review-approved.md`, and `*-review-N-rejected.md` are byte-unchanged
  — confirmed by diffing the KEEP files to zero change.

These re-greps are the observability surface for this change. The downstream design-doc-reviewer and
code/docs reviewers provide the human-style audit.

## Risks and Open Questions

**Risks**

- **Precision-surgery lines (highest risk).** `autonomous-phases/4 - code.md:37` and
  `autonomous-phases/5 - docs.md:37` each contain exactly one in-scope token (`**Reviewer base
  ref**`) embedded in otherwise phase-audit prose that names `code-reviewer`/`docs-reviewer`,
  `code-review-N-rejected.md`, `code-review-approved.md`. A blanket replace here would corrupt
  phase-audit names (invariant 11) and/or land "revision" on a phase-audit concept (invariant 12).
  Mitigation: the map calls these out; only the heading-reference substring changes; the KEEP-files
  diff catches a slip.
- **Same-line mixed tokens in `revision-pipeline.md:39`** — "MANDATORY for reviews"/"this review
  intent" rename, but "a PR review" keeps. Mitigation: per-token edit plus the `revision` re-grep.
- **Same-file mixed buckets.** `pipeline-versioning.md` (`:112` generic "revised" must survive while
  `:15–65` run-creation review renames) and `.rp.md` (`:35–37` rename vs. `:56,83–95` keep).
  Mitigation: the map enumerates keep-lines explicitly.
- **Accepted behavioral seam (out of scope, owner-confirmed).** After the globs flip to `revision-*`
  only, a pre-existing pipeline whose runs are legacy `review-N` (e.g. under `.pipelines/95-*`,
  `.pipelines/121-*`), if later resumed or revised, would be mis-counted / mis-identified because the
  skill no longer recognizes the legacy names. The spec accepts this consequence and adds no
  dual-recognition. Flagged for downstream awareness, not for resolution.
- **Generic-`revis` reverse collision (soft).** The writer must not "tidy" any of the 32 generic
  `revis` sites into the run sense, nor introduce a bare "revision" for the run (req 5).

**Open Questions (deferred to the code phase; no design impact)**

- **Natural-English re-reading of multi-token sentences.** A few lines carry several "review" tokens
  in one sentence (e.g. `pipeline-versioning.md:17,19`, `revision-pipeline.md:54`). The implementer
  must re-read each rewritten sentence for natural English (e.g. "a revision only ADDS a sibling run
  folder"), not just swap tokens.
- **Section-heading wording inside `revision-pipeline.md`** (e.g. `:7` "Confirm review
  preconditions"). The map renames review→revision; the exact heading phrasing is an authoring choice
  the writer makes. No requirement pins it.
