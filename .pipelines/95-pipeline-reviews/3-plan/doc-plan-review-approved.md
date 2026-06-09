# Doc Plan Review — APPROVED

**Reviewer:** doc-plan-reviewer
**Verdict:** Approved
**Plan reviewed:** `3-plan/doc-plan.md` (Reviews feature, issue #95)

## Summary

The doc plan is approved. It scopes documentation to the correct external
surfaces, is complete for what the reviews feature genuinely changes, lets
nothing out-of-scope creep in, and every task is self-contained with a
concrete, verifiable Acceptance pointing at real targets. I verified each claim
against the live repository, the spec, the design doc, and the code plan.

## What I checked, firsthand

- **Inputs read in full:** `doc-plan.md`, `spec.md`, `design-doc.md`,
  `code-plan.md`.
- **Documentation surfaces explored firsthand:** `README.md`, `AGENTS.md`,
  `CONTRIBUTING.md`, `.changeset/` (config + every existing changeset),
  `.changeset/config.json` `changedFilePatterns`, `website/index.html`,
  `website/demo.js`, and the live project version.

## Scope correctness and completeness

- **Scope boundary respected.** The plan correctly treats the skill's
  reference-file and agent-profile edits as CODE (owned by `code-plan.md`) and
  excludes them. Documentation is limited to external surfaces.

- **Both genuinely-stale README surfaces are covered.**
  - D1 (entry points): `README.md:213`'s "Work on an issue" bullet lists only
    **resume** and **fork** for a same-issue action — **review** is missing.
    Confirmed firsthand. D1 adds it as a peer.
  - D2 (artifact layout): `README.md:165`'s "Each phase commits inspectable
    review artifacts…" paragraph describes the artifact folder with no run
    layer (no `base/` / `review-N`). Confirmed firsthand. D2 adds the run
    layer. Both cited anchor line numbers (165, 213) are accurate.

- **Changeset (D3) is correctly required and correctly typed.** The change
  touches `skills/**` and `agents/**`, both in `.changeset/config.json`'s
  `changedFilePatterns`, so the standing rule applies. The project version is
  `0.1.1` (pre-1.0), and per `CONTRIBUTING.md#bump-types` + pre-1.0 policy a new
  feature is a `minor` bump with no `BREAKING:` prefix — exactly what D3
  specifies. The acceptance references real tooling: `scripts/validate-changesets.mjs`
  exists; the front-matter shape matches the existing `.changeset/*.md` files
  (`"@automattic/radical-pipelines": minor`).

- **Website (D4) is correctly OPTIONAL and non-gating.** `website/**` is excluded
  from `changedFilePatterns` and `CONTRIBUTING.md` lists it as needing no
  changeset. The flat pre-reviews demo tree genuinely exists
  (`website/index.html` hero `term-body` lines 118–131, the demo card title
  `.pipelines/issue-1234/` at line 221, and the `pendingTree` flat file list in
  `website/demo.js`). The plan's characterization — cosmetic/illustrative,
  reconstructed demo, not a behavior contract, skippable — matches the on-page
  caption ("Reconstructed log of a real pipeline run, sped up"). The
  conditional `demo.js` inclusion ("only if the change affects them") is
  accurate.

- **Nothing out-of-scope crept in.**
  - No code-plan duplication: D1/D2 explicitly stay at README altitude and
    forbid copying procedure-level detail or restating the skill's run-model
    prose.
  - No consolidation/cleanup docs (correctly excluded per spec out-of-scope).
  - No legacy-flat-layout / migration docs: every task that touches the layout
    (D2, D4) explicitly forbids legacy/no-`base/`/migration wording, honoring R5.
  - No task for `AGENTS.md` or `CONTRIBUTING.md`: verified firsthand that
    `AGENTS.md` is purely skill-authoring rules and `CONTRIBUTING.md` is release
    mechanics — reviews change neither, so excluding them is correct.

## Task quality

- Each task names a real **Files** target and real **Sections-scope** anchors,
  verified against the files.
- Each **Acceptance** is concrete and verifiable (named filenames, named
  sections, the run-layer naming, the `minor`/no-`BREAKING:` constraints, the
  no-legacy guard).
- **Audience** is correctly differentiated per task (README readers for D1/D2,
  maintainers/changelog readers for D3, website visitors for D4) and excludes
  agents/contributors where appropriate.
- Cross-references resolve: D1 points to `reference/review-pipeline.md` (created
  by code-plan Task 9) and D2 points to `reference/pipeline-versioning.md`
  (run model added by code-plan Task 1, and already referenced at `README.md:165`).
  Dependencies on those code-plan tasks are noted.

## Minor observations (non-blocking)

- D3's `npx changeset status` acceptance is environment-sensitive (it depends on
  a base-branch diff), but the plan softens the binding requirement to
  "well-formed and present," which `scripts/validate-changesets.mjs` checks
  deterministically. Acceptable as written.
- The `README.md:165` sentence "a single `<artifact>-review-approved.md` on
  approval" describes per-phase-completion behavior (one approved file per
  phase), not a per-pipeline uniqueness claim, so it does not go stale the way
  the agent profiles' "only one ever exists per pipeline" parenthetical does.
  D2's instruction to keep that filename/per-phase description accurate under
  the run layer is the right treatment — no extra task needed.

## Verdict

Approved. The doc plan is ready to execute.
