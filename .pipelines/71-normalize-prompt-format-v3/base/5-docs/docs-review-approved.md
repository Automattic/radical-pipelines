# Docs review: APPROVED

Issue #71 — Normalize issue content into the standard intent format when creating a pipeline.

Reviewed diff (source only, `.pipelines/**` ignored): `git diff 1cacde8..HEAD -- skills .changeset`.
Changed files: `create-pipeline.md` (step 4), `conventions/setup.md` (Issues clause),
`intent-format.md` (provenance H2), new `.changeset/normalize-issue-intent.md`.

## Verdict

**Approved.** The no-additional-work conclusion of the approved doc-plan holds, and the
D1–D4 doc-acceptance (readability/coherence) lens passes on all four shipped edits. No
genuinely-needed documentation update is missing, and no shipped doc reads incorrectly.

## D1–D4 doc-acceptance lens

- **D1 — `create-pipeline.md` step 4.** Reads as coherent house-idiom prose. The
  passthrough/synthesis branch (`**If** … **Otherwise:**`) is unambiguous; the
  provenance-header references read as delegations to `intent-format.md` ("applied per
  `intent-format.md`", "with the provenance header") rather than a duplicated template — the
  two-line blockquote is defined once, in `intent-format.md`. The borrowed authoring sentence
  ("following the schema and authoring discipline in `intent-format.md`") survives as a
  self-standing discipline, so `review-pipeline.md:37`'s "`create-pipeline.md` step-4 pattern"
  reference stays documentation-coherent (verified at `review-pipeline.md:37`). The
  self-containment sentence is retained verbatim at the step's close. PASS.

- **D2 — `intent-format.md` provenance H2.** The scope-naming heading ("Provenance header
  (intents created from an issue)") plus the explicit applies/does-not-apply paragraph at
  line 35 is unambiguous to a reader arriving from any of the three intent flows: it states the
  header applies to base intents from an issue (both passthrough and synthesis cases), is
  **not** added to issue bodies via `manage-issues.md`, and is **not** added to review intents
  (which carry their **Origin** section instead — matches `review-pipeline.md:39`). The
  `> Source:` template is explicitly tracker-agnostic. No mis-application risk. PASS.

- **D3 — `conventions/setup.md` Issues clause.** Reads as a clear tracker-agnostic capability
  statement; a setup author binding a new tracker can tell from the clause alone that
  "read all of its comments" and "follow its in-tracker cross-references" are required
  capabilities. Coherent with the surrounding "Ask the owner which issue tracker is used…"
  prose. PASS.

- **D4 — changeset.** Self-contained, reads as a changelog entry (not internal skill prose),
  tracker-agnostic, and distinct from the README (which describes phase 0 only as "The initial
  idea or request"). Front matter (`"@automattic/radical-pipelines": minor`) matches the
  sibling `pipeline-reviews.md` changeset and passes `node scripts/validate-changesets.mjs`
  (exit 0). PASS.

## No-change conclusion (N1–N10) — highest-risk claims spot-checked against live files

- **N1 — SKILL.md.** Verified `skills/radical-pipelines/SKILL.md`. Phase table row
  (`0 | Intent | 0-intent | The input`) and entry-point routing
  (`Work on an issue → reference/work-on-an-issue.md`) stay true: the change alters *how* the
  input is synthesized inside the create flow, not the routing or phase model. No change needed.
- **N2 — README.md.** Verified line 27 ("Phase 0. Intent. The initial idea or request.")
  remains accurate; mechanics correctly stay out of the vision doc. No change needed.
- **N4 — work-on-an-issue.md.** Verified step 1 ("verify the issue exists and capture its
  content") and the create/resume/fork/review branch are untouched and remain correct — the
  full-picture read is anchored in `create-pipeline.md` step 4, not here. No change needed.
- **N5 — manage-issues.md / review-pipeline.md.** `manage-issues.md:14` ("The issue body _is_
  the phase-0 intent…") still reads correctly as the one-time transform. `review-pipeline.md:37`
  keeps borrowing the step-4 pattern and its Origin-section provenance (line 39) is untouched;
  the scope-named H2 correctly excludes review intents. Both kept coherent *by* the edits, not a
  separate touch. No change needed.
- **N6 / N7 — CHANGELOG.md / CONTRIBUTING.md.** CHANGELOG is changeset-generated, not
  hand-edited; CONTRIBUTING's changeset workflow and bump table are followed (hence `minor`),
  not modified. The new changeset passes the validator that CONTRIBUTING's changeset gate
  describes. No change needed.
- **N9 — conventions/load.md.** Verified the Issues purpose-summary row ("Where to find the
  project issues and how to create/modify them") is a loose summary, not a capability
  enumeration; it remains true after the setup.md clause extension. No change needed.

## Minor, non-blocking notes

- The `setup.md` Issues clause deliberately enumerates only tracker-side capabilities (body,
  comments, comment, update, in-tracker cross-references) and omits external links and binary
  attachments. This is correct and coherent with step 4, which routes external URLs through the
  orchestrator's own web tooling (a separate channel) and downloads attachments via the same
  Issues access mechanism already implied by "read." No action required.
- "Binary attachments" appears as a passthrough-blocking condition in both step 4 and the
  changeset, consistently. No action required.

## Conclusion

The four code-plan edits carry the complete documentation surface for this change. No
additional documentation file needs creation or editing. Approved.
