# Spec review — APPROVED

**Spec:** Track changes with a changelog and keep the project version in sync
(issue #81)

**Verdict:** Approved. The spec is complete, clear, feasible, internally
consistent, scoped to WHAT (not HOW), and backed by testable acceptance
criteria. No blocking issues found.

## What I verified against the real repository

Every factual claim in the spec was checked against the working tree and holds:

- **Three version-bearing files and their current drift.** Confirmed:
  - `package.json:3` → `0.1.1` (name `@automattic/radical-pipelines`,
    `"private": true`).
  - `.claude-plugin/plugin.json:3` → `0.1.0`.
  - `.pi-extension/package.json:3` → `0.1.0` (name
    `@automattic/radical-pipelines-pi`).
- **Derived lockfile.** `.pi-extension/package-lock.json` carries the version
  at both line 3 (top-level) and line 9 (inside `packages.""`), value `0.1.0`.
- **Marketplace manifest carries no version** and references the plugin by
  `"source": "./"` — supports R10/AC6.
- **Greenfield state for the tooling.** No `.changeset/` directory, no
  `CHANGELOG.md`, and no `scripts` block in the root `package.json` — so R1/R4
  and the "wired into the version step" mechanism are net-new (feasible).
- **Default branch is `trunk`** (`git symbolic-ref refs/remotes/origin/HEAD`
  → `refs/remotes/origin/trunk`) — confirms the one load-bearing config
  non-default in R2/AC1.
- **Zero git tags**, and the only workflow is `.github/workflows/deploy-landing.yml`
  — supports the "no tags / no release CI / deploy-landing untouched" scope
  (R14, AC9).
- **The standing README rule exists** in `AGENTS.md:7` ("Whenever any task is
  performed that changes the code … the README.md must be updated"), which
  R6/R13 correctly mirror.

## Review dimensions

- **Completeness.** All 15 consolidated requirements from `spec-research.md`
  are carried into the spec (R1–R13 plus the Out of Scope items), with no
  silent drops. The research's out-of-scope R13/R14 map to the spec's
  "Out of Scope" section; research R15 maps to spec R13.
- **Clarity / WHAT-not-HOW.** The spec stays on observable outcomes. It names
  Changesets and "the version step" only because Changesets is a hard
  constraint from the prompt; it deliberately does NOT choose between a wrapped
  npm command vs. a standalone sync script (correctly deferred to design).
- **Feasibility.** Grounded in the research findings: `changeset version` on a
  single `private: true` package bumps + writes `CHANGELOG.md` by default
  (privatePackages default `version:true, tag:false`); only `baseBranch:"trunk"`
  is a required non-default; propagation to the two non-Changesets files plus
  lockfile regeneration is a known, achievable design step.
- **Consistency.** No internal contradictions. The `0.1.1` baseline (R11) is
  consistent with AC7; "next version not pinned" (R12) is consistent with AC7's
  closing clause; R10's exclusion of `marketplace.json` is consistent with AC6
  and Out of Scope.
- **Acceptance criteria.** AC1–AC9 are each verifiable by inspecting files or
  running the version step, and each traces back to requirements. AC9 adds
  adversarial coverage of the negative scope (no publish/tags/CI).
- **Scope.** No HOW leakage; release-CI and changelog-formatter choices are
  correctly left out / deferred.

## Non-blocking observations (for the design phase, not defects)

1. **Lockfile has the version in two places.** AC5/R9 speak of "the top-level
   version" in `.pi-extension/package-lock.json`, but the lockfile actually
   carries it at line 3 and line 9. Because R9 mandates regeneration via npm
   (not hand-editing), npm updates both automatically, so correctness holds.
   The "top-level" wording is slightly narrow but not wrong; design should just
   ensure the regeneration step actually runs `npm install` rather than editing
   one line.
2. **Changeset-authoring ownership is intentionally unspecified.** The research
   floated decision D2 (which pipeline phase authors the changeset). The spec
   correctly leaves this to process/design by saying "a contributor (human or
   pipeline agent)" in R5 and documenting it as a per-change obligation in
   R6/R13 — appropriate for a WHAT-level spec.

Neither observation changes any required outcome; both are design-phase
considerations.
