# Doc Plan: Unify the documentation concept on plural "docs"

## Overview

This change renames the documentation-phase concept from singular `doc` to plural
`docs` across the skill, agent definitions, and the derived name copies (`.rp.md`,
`website/demo.js`, the pending changeset, and `README.md`). The mechanical rename of
every in-scope identifier is fully handled by the code plan's three-step procedure
(rewords → substitution → renames); this doc plan does **not** restate that work.

What the rename does **not** produce is a release record for the change. The PR
touches `skills/**` and `agents/**`, both release-relevant paths under
`.changeset/config.json`'s `changedFilePatterns`, so the Changeset Gate CI workflow
requires a changeset to be present for this PR (presence check:
`npx changeset status`). The one in-repo changeset the rename edits
(`.changeset/agent-scoped-guardrails.md`) describes a *different, already-pending*
feature (agent-scoped guardrails) and only happens to mention the renamed agents; it
cannot serve as this change's release entry. The single genuine documentation
deliverable is therefore a **new changeset fragment** that announces this rename and
satisfies the gate. After an end-to-end sweep, every other candidate documentation
surface is either already covered by the code rename or carries no documentation-phase
concept reference at all; those are enumerated under "Surfaces deliberately excluded"
with the reason each needs no doc task.

## Tasks

### Task 1: Add a changeset for the docs-naming rename

- **Goal:** Add a new changeset fragment recording this rename so the PR passes the
  Changeset Gate's presence check and the change appears in the next release's
  changelog with an accurate description.
- **Audience:** Package consumers and maintainers reading `CHANGELOG.md` / the
  GitHub Release notes to understand what changed between versions, and the
  Changeset Gate CI workflow that enforces changeset presence on release-relevant PRs.
- **Files to change:** one new file under `.changeset/` (a new `.md` fragment;
  use the changesets CLI, e.g. `npx changeset` or `npx changeset --empty`, so the
  front matter is in the canonical form the validator accepts — do not hand-write
  a malformed fragment). Do **not** repurpose or fold this into the existing
  `.changeset/agent-scoped-guardrails.md`; that fragment is a separate pending
  feature.
- **Sections / scope:** The changeset front matter names the package
  (`@automattic/radical-pipelines`) with a bump type, and (for a non-empty bump) a
  one-paragraph body describing the change.
  - **Bump-type decision rule (drift-resistant — the doc-writer applies it against
    the shipped change and the project's versioning policy):** This is a rename of
    internal identifiers (agent names/filenames, plan-artifact names, display labels,
    prose) with no change to any behavior a package consumer invokes — agents are
    discovered by filename and a consumer simply uses the renamed profiles going
    forward. Per CONTRIBUTING.md's "Empty changesets" guidance, a prose-only edit to
    release-relevant files that should not trigger a version bump uses an **empty**
    changeset (`npx changeset --empty`), which satisfies the presence gate without a
    release. Choose the bump type by that rule: prefer the empty changeset unless the
    shipped change turns out to carry a consumer-observable behavior change, in which
    case follow the project's pre-1.0 bump policy (no `major` pre-1.0). Confirm the
    chosen form passes the shape validator (`node scripts/validate-changesets.mjs`).
  - **Body (only if a non-empty bump is chosen):** Describe the rename in the
    repository's changeset summary style — that the documentation-phase concept is now
    spelled plural `docs` everywhere it is named (the four agents, the phase-3 plan
    artifacts, display labels, and the derived copies), aligning the inputs to phase 5
    with phase 5's already-plural outward identity. Keep it consistent with the
    *shipped* new names the doc-writer reads from the merged code (do not invent or
    re-list names from this plan). State that the phase-2 `design-doc` concept and the
    word "documentation" are unchanged.
- **Depends on:** the code rename being complete on the branch (the doc-writer reads
  the shipped new names and the final scope to describe them accurately). No
  dependency on other doc tasks.
- **Traces to:** Spec Acceptance criterion that the PR's release-relevant changes are
  recorded; the CI Changeset Gate presence requirement on `skills/**` + `agents/**`
  changes; Code-plan Tasks 1–3 (the rename this changeset announces). (The rename of
  the *existing* `.changeset/agent-scoped-guardrails.md` is Code-plan Task 2 and is
  out of scope for this doc plan.)
- **Acceptance:**
  - A new `.changeset/*.md` fragment exists (distinct from
    `agent-scoped-guardrails.md`) and passes the shape validator
    (`node scripts/validate-changesets.mjs` reports no errors for it).
  - With the fragment present, the changeset presence check
    (`npx changeset status`) no longer reports the PR as a release-relevant change
    missing a changeset.
  - The fragment's bump type matches the bump-type decision rule above for the change
    as actually shipped (empty for a pure prose/identifier rename; otherwise a
    non-`major` bump per the pre-1.0 policy).
  - If a body is present, it describes *this* rename (the docs-naming unification)
    using the new names as they actually shipped, and does not describe the unrelated
    agent-scoped-guardrails feature.

## Surfaces deliberately excluded

Each candidate below was checked end-to-end and needs no documentation task, for the
stated reason.

- **The pending changeset `.changeset/agent-scoped-guardrails.md`.** It mentions the
  renamed agents/phase, but updating it to the plural names is a pure rename fully
  handled by Code-plan Task 2 (the substitution). It is not a new doc deliverable, and
  it cannot double as this change's release entry because it describes a different
  feature.
- **`README.md` (the project's most-read narrative).** Its only documentation-concept
  agent reference is the Pi-package install list at line 112, already renamed by
  Code-plan Task 2. README's already-plural mentions — the "Docs" phase label
  (Phase 5, line ~32) and `docs-summary.md` (line ~157) — are correct as-is and are
  out of scope per the spec. No other README narrative names the four concept agents or
  the plan artifacts, so no narrative doc update is needed.
- **The project website beyond `demo.js`** (`website/index.html`, `styles.css`,
  `assets/`, `robots.txt`, `sitemap.xml`). Swept for documentation-concept references:
  none. `website/demo.js` is the only website file that carries the concept, and its
  rename is Code-plan Task 2. The narrative homepage copy does not name the concept
  agents or plan artifacts. No website doc work.
- **`CHANGELOG.md` and the changeset cheat-sheet `.changeset/README.md`.** The
  published `CHANGELOG.md` is a historical release record (out of scope per spec) and
  is regenerated by `changeset version`; this change introduces no new versioning or
  changeset convention, so the cheat-sheet needs no edit.
- **Contributor-facing guides** (`CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`). They
  carry no documentation-phase concept reference (spec "Out of Scope"), and this rename
  changes no contributor workflow, release mechanic, or convention they describe.
- **The skill and agent definitions themselves.** Every concept reference in
  `skills/**` and `agents/**` (prose, frontmatter, display labels, Mermaid labels,
  template headings) is renamed by Code-plan Tasks 1–3. The skill is the source of
  truth that the rename edits directly, not a separate downstream surface that needs a
  doc-writer to re-describe it. Per the project rule, the skill is prose, not software,
  so no structural test or restatement of it is added.
