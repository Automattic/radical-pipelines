# Doc Plan: Generate a PR description artifact

## Overview

The code phase makes the Radical Pipelines pipeline produce its PR description as
a real, inspectable, self-contained Markdown artifact
(`<artifacts-folder>/5-docs/pr-description.md`) during the Docs phase (phase 5):
a `doc-writer` produces it as a mandatory always-last doc-plan task, the existing
`doc-reviewer` reviews it for accuracy under the phase's single approve/reject
gate, and phase 5 cannot complete without it. Those edits land in the pipeline's
own reference docs, agent definitions, conventions, and `SKILL.md` (planned in
`code-plan.md`). This doc plan covers the project's HUMAN-FACING narrative
documentation that must be brought back in sync once those edits land: the
project README's phase-5 descriptions (a brief one-liner and a detailed
walkthrough), and the standing per-change record (a changeset) that this
repository's contributor rules require for every change. It does NOT cover the
structural reference edits themselves (those are code tasks) and it does NOT
cover authoring any pipeline's `pr-description.md` content (that is authored by a
`doc-writer` at produce-time via the mechanism the code phase installs, not a
doc-plan task here). The audience throughout is human readers of the project:
newcomers and contributors reading the README to understand what each phase
produces, and reviewers/maintainers reading the changeset/changelog history.

## Tasks

### Task 1: Update the brief phase-5 description in the README phase list

- **Goal:** Keep the README's one-line summary of what phase 5 produces honest
  now that phase 5 produces a PR-description artifact in addition to internal and
  external documentation. A newcomer scanning the phase list should learn that
  the Docs phase also yields the pull-request description, without needing to read
  the deeper walkthrough.
- **Audience:** Newcomers and evaluators skimming the README's "The proposal" /
  phase-list section to understand the pipeline's shape and outputs.
- **Files to change:** `README.md` (the bulleted phase list under "The proposal",
  the `Phase 5. Docs.` bullet — currently the one-liner "Both internal and
  external documentation.").
- **Sections / scope:** Only the phase-5 bullet in that list. Do not restructure
  the list or touch other phase bullets.
- **Depends on:** none
- **Traces to:** Spec R11 / AC10 (phase-5 output descriptions enumerate the
  artifact); design "Enumeration"; code-plan Tasks 7/9 (the in-repo enumeration
  surfaces this narrative mirrors).
- **Acceptance:**
  - The phase-5 bullet conveys that phase 5 produces the PR-description artifact
    in addition to the internal/external documentation it already names.
  - The bullet stays a short, descriptive summary of what the phase PRODUCES — it
    introduces no merge or PR-opening behavior (no "then open the PR" / "ready to
    merge" framing), consistent with the spec's noun-not-verb constraint and the
    AC11 out-of-scope boundary.
  - The reader leaves the phase list knowing the PR description is a phase-5
    output, with no other phase bullet altered.

### Task 2: Update the detailed phase-5 walkthrough in the README

- **Goal:** Bring the README's in-depth phase-5 description in sync with the
  shipped mechanism: phase 5 now also produces the PR-description artifact as part
  of the doc-writer batch, the `doc-reviewer` reviews it for accuracy under the
  same single gate, and the phase's completion now additionally requires the
  artifact. A reader studying how phase 5 works should understand that the PR
  description is produced and reviewed by the same machinery as the rest of the
  docs, not by a separate flow, and that it is required for the phase to complete.
- **Audience:** Contributors and technically-minded readers reading the README's
  detailed per-phase walkthrough to understand exactly how phase 5 operates.
- **Files to change:** `README.md` (the detailed "**Phase 5 (Docs)** ..."
  walkthrough paragraph describing the `doc-writer` / `doc-reviewer` dispatch,
  review, and re-dispatch loop).
- **Sections / scope:** Only the phase-5 walkthrough paragraph. Reflect what the
  shipped agent/reference edits actually say; do not duplicate the spec or design
  doc. Read the landed edits to `agents/doc-writer.md`, `agents/doc-reviewer.md`,
  `agents/doc-plan-writer.md`, and `5 - docs.md` and describe them at the README's
  existing level of detail.
- **Depends on:** Task 1
- **Traces to:** Spec R1, R6, R7, R8, R11 / AC1, AC5, AC6, AC7, AC10; design
  Approach + Key Decisions (produce via mandatory final doc-plan task; single-gate
  review; strengthened completion predicate); code-plan Tasks 1, 3, 4, 6, 8, 10.
- **Acceptance:**
  - The walkthrough states that phase 5 produces the PR-description artifact as
    part of the doc-writer batch (a standardized always-last task), so the reader
    understands it rides the existing dispatch/commit/review machinery rather than
    a separate flow.
  - It conveys that the artifact is reviewed for accuracy under the SAME single
    approve/reject gate as the rest of phase 5 (no second approval or terminator),
    and that phase 5 cannot complete unless the artifact is present.
  - Every claim it makes matches what the shipped reference/agent edits actually
    say (drift-checked against the landed files, not against this plan), and it
    introduces no merge or PR-opening behavior beyond producing/reviewing the
    artifact (respecting the AC11 boundary; the procedure that consumes the
    artifact to open a PR remains out of scope / unmentioned here).
  - The paragraph remains at the README's existing altitude and does not restate
    the spec or design doc verbatim.

### Task 3: Record a changeset for this change

- **Goal:** Satisfy this repository's standing contributor rule that every change
  records a committed `.changeset/*.md` declaring the change and its semver bump,
  so the generated `CHANGELOG.md` and the release flow account for the new
  PR-description artifact behavior. A reader of the changelog/release history
  should be able to learn that the pipeline now produces a PR-description artifact
  in phase 5.
- **Audience:** Maintainers and downstream consumers reading the changeset now and
  the generated changelog/release notes later.
- **Files to change:** a new `.changeset/*.md` file (follow the existing changeset
  files' front-matter and prose shape, e.g. `.changeset/restructure-repository-layout.md`
  and `.changeset/changelog-and-version-sync.md`; authoring guidance lives in
  `CONTRIBUTING.md#adding-a-changeset` and the rule in `AGENTS.md`).
- **Sections / scope:** One changeset entry for this feature. Choose the bump type
  by semver per the repository's policy (a backward-compatible feature that adds a
  new phase-5 output is a feature-level change; apply the pre-1.0 policy referenced
  in `CONTRIBUTING.md`). Summarize the user-visible change, not the internal edit
  list.
- **Depends on:** none
- **Traces to:** Repository standing rule in `AGENTS.md` (every change records a
  changeset) and `CONTRIBUTING.md` changeset policy; the feature itself (Spec
  overview / R1).
- **Acceptance:**
  - A new committed `.changeset/*.md` exists with valid front-matter naming the
    package and a bump type chosen per the repository's semver/pre-1.0 policy.
  - Its prose describes the user-visible change — that the pipeline now produces a
    PR-description artifact in phase 5 — at the same altitude and style as the
    existing changeset entries, without enumerating the internal edit-site ledger.
  - The bump type is justifiable under the documented policy for a
    backward-compatible feature addition.

## Verified non-surfaces (swept, intentionally not tasked)

These were checked end-to-end and do NOT need a task; tasking them would invent
scope or drift into out-of-scope territory.

- **`website/index.html` and `website/demo.js`.** The landing page speaks about
  phases generically ("each phase produces an inspectable artifact") and never
  enumerates phase 5's specific output inventory; `demo.js` is a fictional
  illustrative animation (a sample `orchestrator.ts` pipeline), not a literal
  reference to phase-5's output contract. Neither names `pr-description.md` nor
  claims an exhaustive phase-5 output list, so adding it would invent scope.
- **`CONTRIBUTING.md`.** Its PR references are about the repo's own CI/merge gating
  and changeset/release policy, not about what a pipeline's phase 5 produces; no
  reference to the pipeline's PR-description artifact exists to keep in sync.
- **`.rp.md` and `work-on-an-issue.md` Merge gate.** These describe the
  post-phase-5 Merge action / consumer flow, which is issue #57's territory and
  explicitly out of scope (AC11); they benefit from the strengthened completion
  predicate automatically and must not be edited here.
- **The per-pipeline `pr-description.md` content.** Authored by a `doc-writer` at
  produce-time via the installed mechanism — not a doc-plan task in this plan.
