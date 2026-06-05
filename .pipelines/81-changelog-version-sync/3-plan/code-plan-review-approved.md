# Code-plan review — APPROVED

**Issue:** #81 — Changelog with Changesets and version synchronization
**Artifact reviewed:** `3-plan/code-plan.md`
**Verdict:** **APPROVED**
**Reviewer:** code-plan-reviewer

---

## Summary

The plan correctly scopes the **CODE** half of the design (components C1–C5 plus the
`prettier: false` verification from OQ-4), cleanly defers the documentation/metadata
obligations (C6, C7, R6, R13, AC8 and the per-issue `.changeset/*.md`) to the Docs
phase, and plans **no tests** (TDD is the code-writer's job) and **no documentation
tasks**. Tasks are well ordered with explicit dependencies, each has a concrete,
inspectable acceptance check, and every task traces to specific requirements / ACs /
design components. I verified the plan's load-bearing technical claims against the
real worktree and they hold.

## Baseline claims — verified against the worktree

- Root `package.json`: `@automattic/radical-pipelines`, `version: "0.1.1"` (line 3),
  `"private": true`, `"type": "module"`, **no `scripts` block**. ✓
- `.claude-plugin/plugin.json`: `version: "0.1.0"` (line 3). ✓
- `.pi-extension/package.json`: `version: "0.1.0"` (line 3), has `bundledDependencies`. ✓
- `.pi-extension/package-lock.json`: `lockfileVersion: 3`; top-level `version` (line 3)
  and `packages[""].version` (line 9) both `0.1.0`. ✓
- No `.changeset/`, no root `CHANGELOG.md`, no `scripts/`, no root `package-lock.json`,
  no `.cs-sandbox*` directories. ✓ Working tree clean. ✓
- Default branch is **`trunk`** (`origin/HEAD -> origin/trunk`), so `baseBranch: "trunk"`
  is correct. ✓
- `.claude-plugin/marketplace.json` has **no version field** (correctly excluded, R10/AC6);
  only workflow is `.github/workflows/deploy-landing.yml` (AC9). ✓

## Feasibility — the high-risk mechanisms were executed and confirmed

1. **Zero-dependency JSON round-trip (Task 3 / C2).** `JSON.stringify(obj, null, 2) + "\n"`
   round-trips **byte-identical** for all three manifests (root, plugin.json,
   pi-extension/package.json) — confirmed by running it. So the sync script needs no
   format-preserving dependency, exactly as the design asserts. ✓
2. **Offline in-place lockfile regen (Tasks 4/5/6, C4, FM-2).** I ran the plan's exact
   command — `npm --prefix .pi-extension install --package-lock-only` — from a repo-like
   root against a copy whose manifest was bumped to `0.1.1`. Result: exit 0; lockfile
   lines 3 and 9 updated `0.1.0` → `0.1.1`; **diff is exactly those two version lines and
   nothing else** (bundle/`inBundle`/formatting intact); **no `node_modules` created**;
   succeeds without network. Confirmed both with and without an explicit `--offline` flag,
   because every dep is integrity-pinned in a `lockfileVersion: 3` lockfile. The design's
   "edit in place, never delete-then-regenerate" mechanism is real and works as written. ✓
   (The temp copies were removed; the worktree is clean.)

## Design coverage and traceability

- **C1** → Tasks 1, 2 (dev dep + `.changeset/config.json` with `baseBranch: "trunk"`,
  default formatter, `prettier: false`, default `privatePackages`). ✓
- **C2** → Task 3 (zero-dep ESM sync script). ✓
- **C3** → Task 4 (single `&&`-chained run-script named `release:version`, **not**
  `version` — honors K2/FM-3). ✓
- **C4** → Task 5. ✓  **C5** → Task 6 (drift correction by re-running the same mechanism
  at `0.1.1`, no `changeset version`, no changelog entry, no special-case path). ✓
- The `prettier: false` / OQ-4 carry-forward is set in Task 2 and its limits are honestly
  described in the Notes (no `changeset version` is actually run in this plan, so the
  concrete check is config-validity + Prettier-independence of the sync/lockfile path). ✓

## AC coverage

AC1 (T1,T2), AC4 (T3,T4,T6), AC5 (T4,T5,T6), AC6 (T6,T7), AC7 (T6), AC9 (T4,T7) are all
delivered and concretely checkable in this plan. AC2, AC8, and the README/contributor-docs
parts are correctly routed to the Docs phase (they are documentation/metadata, not code).
AC3's changelog generation is *enabled* by config + the `changeset version` step in the
run-script but is not *executed* in this plan — defensible, since there is no changeset to
consume yet and authoring is a Docs-phase duty. The plan states this boundary explicitly.

## Scope, granularity, ordering

- **No test tasks, no documentation tasks** — confirmed. The plan says so explicitly and
  no task violates it. ✓
- Task 0 (pre-flight, no edits) and Task 7 (invariant verification, no edits) are
  legitimate guard/verification steps, not padding. ✓
- Dependencies are correct: 2→1, 4→{1,2,3}, 6→{3,5}, and the independence of Task 3 from
  1–2 is accurate. ✓
- Granularity is appropriate (each task is one coherent, separately-verifiable change). ✓

## Minor, non-blocking notes (for the code-writer; not required to change the plan)

- The design's optional hardening (CI drift-check, `engines.node`/`.nvmrc`) is correctly
  **omitted** here — it was explicitly optional and is net-new CI; leaving it out keeps
  AC9 clean.
- Task 4's command value should be a single one-line JSON string; the plan already says so.
  Keep the three commands `&&`-chained in the stated order so fail-fast holds (FM-5).

No blocking issues found. The plan is faithful to the design, satisfies the in-scope ACs,
plans no tests and no docs, and its load-bearing mechanisms were empirically verified
against this worktree. Ready for the code phase.
