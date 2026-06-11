# Doc plan: Normalize issue content into the standard intent format when creating a pipeline

## Orientation

This issue changes the **Radical Pipelines orchestrator skill itself**. The deliverable
(per the approved code plan) is four file edits: a rewrite of `create-pipeline.md` step 4,
an in-place extension of the Issues convention in `conventions/setup.md`, a new scope-named
H2 in `intent-format.md`, and a `minor` changeset. Three of those four files *are* the
skill's own reference documentation — they are both the "code" and the canonical docs for
this behavior. The changeset is the user-facing release note.

The central question for this plan is therefore **not** "what new docs must be written" but
**"does any documentation beyond the code-plan edit set need to change, and where is the
no-change conclusion load-bearing enough to state explicitly?"** The honest answer is:
**no additional documentation files need to be created or edited.** The code plan's four
edits carry the entire documentation surface for this change. This plan records that
conclusion, validates the design's coherence sweep for documentation purposes, and lists the
"no doc change needed" items with rationale so a later phase does not silently expand the
change or assume a doc gap exists.

Audiences referenced below:
- **Skill consumers / orchestrator runtime** — the agent(s) that read the reference docs to
  execute the create-pipeline flow. Served by `create-pipeline.md`, `intent-format.md`,
  `conventions/setup.md`.
- **Skill maintainers / contributors** — humans editing the skill. Served by `AGENTS.md`,
  `CONTRIBUTING.md`, `README.md`.
- **Release / changelog readers** — anyone reading what changed between versions. Served by
  the changeset (which feeds `CHANGELOG.md`).

---

## Documentation carried by the code-plan edit set (no *additional* doc work)

These are the only documentation surfaces this change touches, and each is already a code-plan
task. They are listed here for completeness and to assign the audience/acceptance lens, **not**
as new work for a doc phase — implementing the code plan satisfies them. No separate doc edit
is required on top of the code plan.

### D1. `create-pipeline.md` step 4 — the create-flow reference (code-plan Task 1)

- **Where:** `skills/radical-pipelines/reference/create-pipeline.md`, step 4.
- **Audience:** orchestrator runtime (the executable doc for the create flow).
- **Doc acceptance (beyond Task 1's code criteria):** step 4 reads as coherent prose in the
  skill's house idiom; the one-line provenance-header pointer reads as a delegation to
  `intent-format.md` (not a duplicated template); the borrowed authoring sentence still reads
  as a self-standing discipline so `review-pipeline.md:37`'s "step-4 pattern" reference stays
  documentation-coherent.
- **Note:** no *additional* doc edit beyond Task 1.

### D2. `intent-format.md` — provenance-header documentation (code-plan Task 3)

- **Where:** `skills/radical-pipelines/reference/intent-format.md`, new third H2.
- **Audience:** orchestrator runtime — read by **all three** intent consumers (issue bodies via
  `manage-issues.md`, base intents via `create-pipeline.md`, review intents via
  `review-pipeline.md`), which is exactly why the scoping statement is the load-bearing
  documentation here.
- **Doc acceptance (beyond Task 3's code criteria):** the scope-naming heading and explicit
  "applies to issue-derived base intents; **not** to issue bodies; **not** to review intents"
  statement are unambiguous to a reader arriving from any of the three flows, so the
  `> Source:` line is not mis-applied. This is a documentation-correctness requirement, already
  fully specified by Task 3.
- **Note:** no *additional* doc edit beyond Task 3.

### D3. `conventions/setup.md` — Issues convention capability clause (code-plan Task 2)

- **Where:** `skills/radical-pipelines/reference/conventions/setup.md:64`.
- **Audience:** orchestrator runtime + consuming-project setup authors (the convention
  documents what a project's Issues binding must satisfy).
- **Doc acceptance (beyond Task 2's code criteria):** the extended verb clause reads as a
  tracker-agnostic capability statement; a setup author binding a new tracker can tell from the
  clause alone that "read comments" and "follow cross-references" are required capabilities.
- **Note:** no *additional* doc edit beyond Task 2.

### D4. Changeset — release note (code-plan Task 4)

- **Where:** new `.changeset/<name>.md`.
- **Audience:** release / changelog readers. This is the only **user-facing** (non-reference,
  human-narrative) documentation the change produces; it flows into `CHANGELOG.md` on release.
- **Doc acceptance (beyond Task 4's code criteria):** the one-paragraph body is self-contained,
  reads as a changelog entry (not as internal skill prose), is tracker-agnostic, and does not
  duplicate the README. Already fully specified by Task 4.
- **Note:** no *additional* doc edit beyond Task 4. `CHANGELOG.md` itself is **not** hand-edited
  — it is generated from changesets by the release tooling (see "No doc change needed" item N6).

---

## Genuinely additional documentation work

**None.** After reading SKILL.md, README.md, AGENTS.md, CONTRIBUTING.md, the website, and the
reference docs in the create-flow reading path, no documentation file outside the code-plan
edit set needs to be created or updated for this change. The cross-references that matter
(`review-pipeline.md:37` → step-4 pattern; `manage-issues.md` / `review-pipeline.md` →
`intent-format.md`'s shared schema) are preserved by the code-plan edits themselves and require
no separate documentation touch. The items below record why each candidate surface needs no
change.

---

## No doc change needed (validated, with rationale)

Each item was checked against the actual file. "No change" is the explicit, intended outcome.

- **N1. `SKILL.md` — no change.** Its entry-point table routes "Work on an issue" →
  `work-on-an-issue.md` and its phases table describes phase 0 as "The input". Both stay true:
  this change alters *how* the input is synthesized inside the create flow, not the routing or
  the phase model. The table abstraction (`0 | Intent | 0-intent | The input`) is deliberately
  above the synthesis mechanics. No mention of normalization, the confirmation gate, or
  provenance belongs at this altitude. **Audience:** orchestrator + maintainers. **Rationale:**
  adding flow detail here would violate the skill's minimalism and no-duplication rules
  (`AGENTS.md:7-8,13`) since the detail lives in `create-pipeline.md`.

- **N2. `README.md` — no change.** The README describes phase 0 only as
  "**Phase 0. Intent.** The initial idea or request." (line 27) and never documents the
  issue→intent transformation mechanics. That conceptual description remains accurate
  regardless of this change. **Audience:** prospective users / external readers. **Rationale:**
  the change is an internal refinement of the create flow; it does not alter the product
  proposal, the phase list, or any success metric the README presents. Surfacing
  confirmation-gate / passthrough detail in the README would push implementation mechanics into
  a vision document where they do not belong.

- **N3. `AGENTS.md` — no change.** This is the skill's authoring-rules doc (tracker-agnostic,
  no-negative-phrasing, minimalism, no-duplication). It governs *how* the code-plan edits are
  written but is not itself described by them. No new authoring rule is introduced by this
  change. **Audience:** skill maintainers. **Rationale:** the constraints this change must honor
  already exist in `AGENTS.md:10,12`; nothing new to document.

- **N4. `work-on-an-issue.md` — no change.** Its step 1 ("capture its content") and step 2
  (branch to create/resume/fork/review) are unchanged: the design anchors the full-picture read
  in `create-pipeline.md` step 4, deliberately **not** in `work-on-an-issue.md` step 1, so the
  caller doc stays as-is. **Audience:** orchestrator runtime. **Rationale:** the design's
  sole-caller anchoring decision means a step-1 edit would be wasted on every non-creation entry;
  the doc correctly continues to describe a lightweight capture there.

- **N5. `manage-issues.md` and `review-pipeline.md` — no change.** `manage-issues.md`'s
  "the issue body _is_ the phase-0 intent" reads as the one-time issue→intent transform per spec
  requirement 2; it is not extended. `review-pipeline.md:37` keeps borrowing "the
  `create-pipeline.md` step-4 pattern" and its Origin-section provenance is untouched. Both are
  preserved *by* the code-plan edits (verbatim authoring phrase retained; provenance header
  scope-named to exclude them), not by a separate doc edit. **Audience:** orchestrator runtime.
  **Rationale:** the scope-named H2 and retained authoring sentence are exactly what keep these
  two docs coherent without editing them.

- **N6. `CHANGELOG.md` — no manual change.** It is generated from changesets by the release
  tooling, not hand-edited. The changeset (D4 / code-plan Task 4) is the correct and only place
  to record the user-facing change. **Audience:** release readers. **Rationale:** hand-editing
  `CHANGELOG.md` would conflict with the changesets workflow described in `CONTRIBUTING.md`.

- **N7. `CONTRIBUTING.md` — no change.** It documents the contribution/versioning workflow
  (including the pre-1.0 bump table that maps a backwards-compatible feature to `minor`). This
  change *follows* that workflow (hence the `minor` changeset) but does not modify it.
  **Audience:** contributors. **Rationale:** no process change; the existing bump table already
  prescribes the `minor` choice this change makes.

- **N8. `website/index.html` — no change.** The marketing site shows phase 0 only as a
  committed `intent.md` artifact in an example tree (`.pipelines/issue-1234/base/intent.md`); it
  documents no synthesis mechanics. The artifact it depicts is unchanged in shape. **Audience:**
  external visitors. **Rationale:** the change does not alter the existence, location, or
  committed nature of `intent.md`, which is all the site asserts.

- **N9. `conventions/load.md` — no change.** Its purpose-summary row for the Issues convention
  ("Where to find the project issues and how to create/modify them") is a loose summary, not a
  capability enumeration, and remains true after the `setup.md` capability clause is extended.
  The design explicitly chose to leave it unsynced to keep the diff minimal. **Audience:**
  orchestrator runtime. **Rationale:** syncing a loose purpose summary to a detailed capability
  list would be a cosmetic change that the design deliberately declined.

- **N10. Phase docs (`autonomous-phases/*`, `assisted-phases/*`, phase agent profiles in
  `/agents`) — no change.** Every downstream phase treats `intent.md` as opaque input; none
  parses its leading lines or its provenance header, and none documents the issue→intent
  transform. The provenance blockquote is new content *inside* `intent.md` but no phase doc
  describes `intent.md`'s internal layout. **Audience:** orchestrator runtime / phase agents.
  **Rationale:** the design verified nothing downstream parses the intent's structure, so no
  phase documentation goes stale.

---

## Summary

- **Additional documentation to create or edit beyond the code plan: none.**
- The four code-plan edits (`create-pipeline.md` step 4, `intent-format.md` provenance H2,
  `conventions/setup.md` Issues clause, the `minor` changeset) carry the complete documentation
  surface for this change; the changeset is the sole user-facing narrative artifact.
- Ten candidate surfaces (SKILL.md, README, AGENTS.md, work-on-an-issue.md, manage-issues.md /
  review-pipeline.md, CHANGELOG.md, CONTRIBUTING.md, website, load.md, and all phase docs/agent
  profiles) are validated as **no-change**, each with rationale, confirming the design's
  coherence sweep for documentation purposes.
- The only "doc acceptance" beyond the code plan's own criteria is the readability/coherence
  lens on D1–D4 (house idiom, unambiguous scoping, self-contained changelog entry), which the
  code-plan tasks already require.
