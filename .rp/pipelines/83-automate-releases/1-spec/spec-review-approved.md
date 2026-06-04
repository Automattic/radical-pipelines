# Spec Review — APPROVED

**Document under review:** `1-spec/spec.md` (committed at f9889ce)
**Reviewer:** spec-reviewer
**Verdict:** APPROVED
**Iteration:** N = 0 rejections (approved on first review)

## Summary

`spec.md` is faithful to the prompt and research, complete, internally
consistent, testable, and pitched at the correct altitude (observable outcomes,
not design/implementation). I verified its load-bearing claims against the live
repository and found no blocking defects.

## Review criteria — findings

### Faithfulness to prompt + research

- **Stale `.pi-extension/package.json` constraint — correctly handled.** R3 and
  N2 explicitly state the path does not exist post-restructure, that the original
  request's mention is stale, and that the sole sync target stays
  `.claude-plugin/plugin.json` and MUST NOT be expanded. Verified against the
  repo: there is no `.pi-extension/` directory, and `scripts/sync-version.mjs`
  hard-codes `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` only. Acceptance
  #2 verifies it.
- **No npm / no OIDC** — threaded through R2, R15, and N1, verified by Acceptance
  #1. Faithful to the prompt's hard constraint.
- **Allowlist (R8)** matches the prompt's proposed `changedFilePatterns` exactly
  (`skills/**`, `agents/**`, `.claude-plugin/**`, `package.json`, `README.md`),
  preserves the deliberate exclusions, and keeps the anchored-`package.json`
  (lockfile-excluded) nuance — verified by Acceptance #4 and #5.
- **Gate-vs-Version-PR wrinkle** (the prompt's "open wrinkle") is captured by R9
  and Acceptance #12, scoped to the release branch only (Dependabot stays gated).
- **changelog-github adoption** (prompt floated it) is R18, correctly a SHOULD
  with a documented fallback and local-token caveat.
- **Maintainer prerequisites** are R21, documented (not enforced) in the
  three-bucket form the research established.

### Completeness

All prompt deliverables map to requirements: gate workflow (R5–R9), shape
validator + tests (R10–R12), release workflow (R13–R17), changelog quality
(R18), documentation (R19–R21), and first-release bootstrapping (R22). Scope
boundaries are explicit (N1–N5). Open design decisions are deferred without
being dropped.

### Testability / measurability

Every requirement has a corresponding, measurable acceptance criterion (the
17-item list traces back to the R-numbers). The CI-behavioral requirements
(R13/R14/R16/R17/R9) are expressed as outcomes an observer would see; the spec
does not over-claim local testability. The validator requirements (R11/R12) and
their acceptance criteria (#6–#8) enumerate concrete accept/reject inputs.

### Altitude — no design/implementation leakage

- R11 expresses validator behavior as accept/reject outcomes with line
  references; it does **not** embed the literal fence regex or parser internals
  (those live only in the research). Correct altitude.
- R5 abstracts "fetch-depth: 0" as "enough git history"; R6 abstracts the exact
  `changeset status --since=...` invocation as a "presence check." These are
  strengths, not gaps — they state outcomes, leaving the command/flag choices to
  design.
- R7 states the gate-effectiveness outcome ("the private package must not be
  silently skipped → the gate must fail on a missing changeset") without naming
  the `privatePackages.version: true` mechanism. Acceptance #3 verifies it.

### Internal consistency

No contradictions found. SHOULD requirements (R9, R16, R18) carry explicit
fallbacks; conditional acceptance criteria (#13, #17) are gated on those choices
consistently. Out-of-scope items (N1–N5) align with the corresponding
requirements.

## Repository facts verified during review

- `package.json`: `@automattic/radical-pipelines`, `private: true`, version
  `0.1.1`, sole script `release:version`, devDep `@changesets/cli` only.
- `.changeset/config.json`: `changelog: "@changesets/cli/changelog"`,
  `privatePackages: { version: true, tag: false }`, `baseBranch: "trunk"`.
- `scripts/sync-version.mjs`: `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`.
- No `.pi-extension/` directory exists.
- `.github/workflows/` contains only `deploy-website.yml`.
- Two pending non-README changesets present (`changelog-and-version-sync.md`,
  `restructure-repository-layout.md`).

All corroborate the spec's stated baseline and load-bearing claims.

## Verdict

APPROVED — no blocking issues. The spec is a sound hand-off contract for the
design phase.
