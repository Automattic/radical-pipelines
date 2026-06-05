# Code Plan Review — APPROVED

**Artifact reviewed:** `3-plan/code-plan.md` (7 tasks, committed at 14822eb)
**Inputs:** `1-spec/spec.md`, `2-design-doc/design-doc.md`
**Verdict:** APPROVED
**Reviewer:** code-plan-reviewer (rejection iteration N would have been 1; none needed)

## Summary

The plan is complete, correctly ordered, concretely actionable, and faithfully
traceable to the spec and design. Every code/test/config aspect of the design is
covered; the three documentation surfaces deferred to the doc plan are correctly
excluded and nothing code-essential was misclassified as docs. All load-bearing
empirical claims the plan rests on were re-verified against the live worktree and
node 22.

## Completeness — all code/test/config aspects covered

- **Both workflows:** Task 6 (`changeset-gate.yml`) and Task 7 (`release.yml`),
  each authored exactly per design §3/§4 with the correct triggers, permissions
  (no `id-token`), concurrency, steps, and action wiring (`version: npm run
  release:version`, `publish: npx changeset tag`, never `changeset publish`).
- **The 3 `config.json` deltas:** Task 3 covers exactly the three deltas —
  `changelog` tuple with required `repo`, `privatePackages.tag: true` (keeping
  `version: true`), and the anchored `changedFilePatterns` allowlist — with all
  other keys held byte-identical.
- **Dependency-free validator + node:test suite:** Task 4 (validator) and Task 5
  (suite) specify the exact exported surface (`validateChangesetFile`, `main`,
  `isMainModule`), check order, messages, line numbers, and the full R12/§7
  matrix including the corrected bare-`@`-key rejection and the CLI smoke layer.
- **The three plan deltas:** Δ1 lockfile resync + `@changesets/changelog-github`
  devDep and Δ2 the exact `test` script are both in Task 2; Δ3 `.env`/`.env.local`
  in `.gitignore` is Task 1. All front-loaded.

## Ordering and dependencies — correct

- Lockfile + `test` script (Task 2) precede both `npm ci`/`npm test` workflows
  (Tasks 6, 7 both `Depends on: Task 2`). ✓
- The validator (Task 4) precedes the gate that invokes it (Task 6) and the suite
  that imports it (Task 5). ✓
- The `config.json` deltas (Task 3) precede the workflows that rely on the
  presence check and changelog generator (Tasks 6, 7), and Task 3 itself depends
  on Task 2 so the `changelog-github` devDep is installed before any tooling
  resolves the new config. ✓
- The test suite (Task 5) precedes the workflows so `npm test` passes there; it
  depends on Tasks 4 and 2. ✓
- Single-shared-tree serialization (Task 7 sequenced after Task 6 to avoid
  concurrent `.github/workflows/` edits despite logical independence) is stated
  and reasonable.

## Actionability and traceability

Every task carries Goal / Files / Changes / Depends on / Traces to / Acceptance.
Changes are concrete (exact strings, regexes, error messages, line numbers);
acceptance criteria are observable and testable. Each task traces to specific
design sections, invariants (J1–J7), requirements, and acceptance criteria. A
full requirement→task crosswalk confirms every code-reachable requirement
(R1–R18, plus the R22 first-release behavior, which is emergent from config +
workflow and correctly needs no separate code task) is covered.

## Scoping — docs correctly excluded, nothing code-essential misclassified

R19/R20/R21 (README, CONTRIBUTING.md, `.changeset/README.md`, AGENTS.md) are
documentation-only and correctly deferred to a later doc plan. The one cross-file
coupling — the validator hard-coding the anchor `CONTRIBUTING.md#pre-10-policy`
(invariant J7) — is shipped in code (Task 4) with the doc-phase obligation
explicitly flagged in both the plan Overview and Task 4. The validator's behavior
and its asserted test message do not depend on that file existing, so this is
correct scoping, not a misclassification.

## Load-bearing facts verified against the live repo / node 22

- **Lockfile drift (Δ1):** `package-lock.json` locks `@types/node@12.20.55`
  (lockfileVersion 3) — confirms `npm ci` would fail and the resync is required.
- **`package.json` baseline:** `release:version` is exactly
  `"changeset version && node scripts/sync-version.mjs"`; sole existing devDep is
  `@changesets/cli@^2.31.0`; version is `0.1.1`, `private: true`. Matches design.
- **`config.json` baseline:** `changelog: "@changesets/cli/changelog"`,
  `commit: false`, `access: "restricted"`, `$schema @changesets/config@3.1.4`,
  `privatePackages: { version: true, tag: false }`, `baseBranch: "trunk"`.
  Matches the three-delta plan exactly.
- **`.gitignore`** contains only `node_modules/` — matches Task 1.
- **Pending changesets:** two double-quoted-key `minor` changesets
  (changelog-and-version-sync, restructure-repository-layout); both bump
  0.1.1 → 0.2.0 as §9 states.
- **FENCE_RE** captures verified: normal → (front matter, body); `---\n---\n` and
  `---\n---` → ("",""); CRLF preserved; missing close fence → NO MATCH (line-1
  error path). Exactly as specified.
- **ENTRY_RE** verified: accepts double- and single-quoted keys; **rejects** the
  bare `@`-scoped key, a YAML list (`- foo`), and a bare scalar — matching the
  ST1 correction and what the real changesets parser consumes.
- **`node --test` form (Δ2):** reproduced on node v22.21.1 with a realistic
  fixture (a `.test.mjs` plus a non-test `helper.mjs`): bare-dir `scripts/test/`
  → `MODULE_NOT_FOUND` (fail); bare `node --test` → executes the non-test helper
  (its throw fired); the quoted `'scripts/test/**/*.test.mjs'` glob → discovers
  and passes only the intended test. Confirms the chosen `test` script is the
  correct form and the rationale is accurate.
- **Permission-model contrast:** the existing `deploy-website.yml` has
  `id-token: write` for Pages only; the design correctly treats it as a
  non-model, and neither new workflow requests `id-token`.

No completeness gaps, ordering errors, scoping errors, or inaccurate
load-bearing facts were found. The plan is ready for the code phase.
