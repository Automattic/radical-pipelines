# Spec Research

## Rough Idea

# Keep package-lock version in sync with package.json automatically (via `npm install --package-lock-only`)

> Source: GitHub issue #145 — https://github.com/Automattic/radical-pipelines/issues/145.
> This file is self-contained; agents do not need to open the source issue.

**Goal**

The lockfile's recorded package version stays consistent with `package.json`, and the release process keeps it in sync automatically so it can't drift again.

**Constraints**

- The lockfile version sync **must be implemented by running `npm install --package-lock-only`** (e.g. as part of the release version step), not by a hand-written or structured JSON patch of the lockfile's version fields.

**Context**

- The version lives in three files: `package.json` (source of truth), `.claude-plugin/plugin.json`, and `package-lock.json` (which records it in two places — the top-level `.version` and the root `.packages[""].version`). Today `scripts/sync-version.mjs` (run by `npm run release:version`) propagates the version to `plugin.json` only, never the lockfile, so the lockfile's recorded version drifted out of sync.
- This version deliberately adopts the `npm install --package-lock-only` mechanism that a prior version of this issue rejected in favor of an offline structured patch. The owner wants the npm-driven approach evaluated and implemented here, accepting its trade-offs (registry / `node_modules` dependence in exchange for dependency-tree revalidation).

**Assumptions / directions to explore** _(open)_

- How and where to invoke `npm install --package-lock-only` so it runs reliably in the release flow and leaves only the intended changes (e.g. its ordering relative to `npm ci` and the version bump) — to be pinned down by research in later phases.
- Whether a CI check that catches version drift is still wanted alongside the npm-driven sync — open for the spec to decide.

## Q&A

### Q1: How does the release flow work today? Specifically: what does `npm run release:version` do, what does `scripts/sync-version.mjs` do step by step, where/how does the `package.json` version actually get bumped (e.g. changesets, `npm version`), and what does the project's `package.json` `scripts` section look like? I need to know the exact current sequence so I can define where in that flow the lockfile sync must occur and what observable end state it must produce.

**A:**

1. **`npm run release:version`** = `changeset version && node scripts/sync-version.mjs` (package.json:12), a fail-fast chain.
2. **Version bump** is done by **`changeset version`** (Changesets CLI) — NOT `npm version`. It consumes pending `.changeset/*.md`, computes the new semver, writes `version` into root `package.json`, updates `CHANGELOG.md`, deletes consumed changesets. `sync-version.mjs` never computes a bump — it reads the already-bumped root version and copies it outward. `.changeset/config.json` has `privatePackages.version=true`, allowing `changeset version` to bump this `private: true` package.
3. **`scripts/sync-version.mjs`:** `SOURCE_MANIFEST` = root package.json; `TARGET_MANIFESTS` = `[".claude-plugin/plugin.json"]` only. Reads root version, then per target reads → `JSON.parse` → set `.version` → re-serialize `JSON.stringify(obj,null,2)+"\n"` → write only if changed. Idempotent, preserves formatting, **only touches `plugin.json`, never `package-lock.json`** — that is the drift gap.
4. **Full `scripts` section** (package.json:11-14): only `release:version` and `test` (`node --test 'scripts/test/**/*.test.mjs'`). No prepare/pre/postinstall/lint/typecheck. The changeset validator is invoked directly in CI, not via an npm script.
5. **End-to-end CI release** (release.yml:18-37): checkout (fetch-depth 0) → setup-node 22 + `cache: npm` → `npm ci` → `npm test` → `changesets/action@v1.9.0` with `version: npm run release:version` and `publish: npx changeset tag`. The action runs the `version:` command when changesets are pending, commits the result, and opens/updates the "Version Packages" PR on `changeset-release/trunk`. **Manual escape hatch** (CONTRIBUTING.md:214-234): `npm ci` → `npm run release:version` → commit → push → `npx changeset tag` → push tag → release.

**Reasoning:** The natural insertion point for `npm install --package-lock-only` is **after** `changeset version` (alongside/after `sync-version.mjs`), so the lockfile records the new version; both `.version` and `.packages[""].version` must end equal to the bumped root version (currently both drifted `0.1.1` vs `0.4.0`). Whatever runs it must be reached on **both** the CI path and the manual escape hatch — simplest is folding it into the `release:version` script so every caller gets it. Trade-off: `--package-lock-only` may revalidate the whole dependency tree against the registry and could touch more of the lockfile than the two version fields (the registry/`node_modules` dependence the intent accepts).

**Sources:** package.json:11-14; scripts/sync-version.mjs:27,30,37,45-48,62-72,85-98,118-127; release.yml:18-37; README.md:181-192; CONTRIBUTING.md:178-234; .changeset/config.json; intent.md:16.

### Q2: Experiment request — what is the exact observable lockfile diff when `npm install --package-lock-only` runs after a version bump? In a throwaway copy/worktree: (a) confirm the current drift (`package.json` version vs the lockfile's `.version` and `.packages[""].version`); (b) set `package.json` to a new version, run `npm install --package-lock-only`, and report `git diff package-lock.json` — does it change ONLY the two version fields, or does it also revalidate/rewrite other parts of the tree (resolved/integrity/lockfileVersion/added-removed packages)? (c) run it a second time with no further changes and confirm it is a no-op (idempotent). I need this to decide whether the requirement should say "lockfile version fields match package.json" (accepting incidental revalidation changes) vs "only the version fields change."

**A:**

**Environment:** node v20.20.1, npm 10.8.2 (CI uses node 22). `npm install --package-lock-only` does NOT install `node_modules`, works from cache; npm may contact the registry (audit/funding noise) but the **lockfile output was identical** warm-cache, `--offline`, or with `node_modules` present.

- **(a) Current drift confirmed:** package.json = `0.4.0`; lockfile top-level `.version` = `0.1.1`; `.packages[""].version` = `0.1.1` (lockfileVersion 3).
- **(b) The diff is EXACTLY the two root version fields — nothing else** (4 scenarios, all identical: bump from drifted state, with `--offline`, after `npm ci`, and from an in-sync state). Hard verification on in-sync `0.4.0 → 0.5.0`: only `.version` and `.packages[""].version` change (2−/2+), total lines 4294→4294, `lockfileVersion` 3→3, package count 330→330, no resolved/integrity churn, no reordering.
- **(c) Idempotent confirmed:** committing the result and re-running produced an EMPTY diff.

**Reasoning:** The minimal-diff result holds **because the lockfile's dep tree is already consistent with `package.json`'s deps.** `--package-lock-only` revalidates the dep tree; if deps had drifted (someone edited a range without relocking), the same command would ALSO rewrite the affected dependency entries — by design (the "dependency-tree revalidation" the intent accepts). So a spec assertion of "the command changes ONLY the two version fields, never anything else" would be **too strong** (falsifiable by a legitimately out-of-sync dep tree). Safer framing: the **observable end state** is that the lockfile's `.version` and `.packages[""].version` equal the bumped `package.json` version, the command is idempotent, and there are no spurious changes beyond what dep-tree revalidation legitimately requires — which in the normal release flow (deps unchanged) reduces to exactly the two-field diff. Robustly testable criterion: "after the sync, both lockfile version fields match package.json, and re-running yields no diff."

**Sources:** live experiment (temp dirs, removed); worktree package.json (0.4.0) / package-lock.json (lockfileVersion 3, 0.1.1); intent.md:17 (accepted trade-off).

### Q3: Scope of the existing drift. The lockfile is ALREADY drifted (`0.1.1` vs package.json `0.4.0`), and there are no pending changesets that would trigger the next bump. Does this feature require correcting that existing drift now — i.e. this change should leave the committed lockfile in sync at `0.4.0` (a one-time backfill) — or is it scoped only to PREVENTING future drift, leaving the current `0.1.1` to be corrected by the next release that runs the new flow? Are there pending changesets in `.changeset/` right now, and is the `0.4.0` version published/tagged such that the lockfile fields ideally already matched it? I need this to set the acceptance criteria and an explicit scope boundary.

**A:**

- **(b) Pending changesets — NONE.** `.changeset/` has only `README.md` and `config.json`; zero changeset `.md` files. No version bump is imminent until a new changeset lands.
- **(c) Is 0.4.0 published/tagged? — YES, fully released; the lockfile should already have matched it.** `v0.4.0` git tag exists (github-actions[bot], at trunk merge 5bc2335); `gh release view v0.4.0` → published. CHANGELOG top entry is `## 0.4.0`. The lockfile was stale at EVERY release: `git show vX:package-lock.json` shows version fields = `0.1.1` at v0.2.0, v0.3.0, AND v0.4.0 — frozen at 0.1.1, never bumped by any release.
- **(a) Correct the drift NOW? — YES** (strong inference + direct precedent).

**Reasoning:**
- Intent **Goal**: "stays consistent ... AND ... keeps it in sync automatically so it can't drift again" — the "stays consistent" clause is the desired present state, not just future behavior (intent.md:8). **Context** names the present defect as the thing to fix (intent.md:16).
- `sync-version.mjs` docstring (:13-14): the script is designed to "serve both normal propagation AND one-time drift correction" — one-time correction is explicitly in scope for the existing targets; applies equally to the lockfile.
- Direct precedent: the prior (v1) line of this issue has commit `3968e39 "Correct package-lock version drift to 0.4.0"` (diff = exactly the two version fields 0.1.1→0.4.0). Not on trunk / not in v2's history, but confirms the owner's established reading treats the one-time backfill as in scope.

**Researcher's recommendation:** Scope = BOTH — (1) one-time backfill so the committed lockfile lands at 0.4.0, AND (2) prevent recurrence via the release flow syncing the lockfile (using `npm install --package-lock-only` per the v2 mandate). With no pending changesets, the next release isn't imminent, so a "prevent-only" spec would leave the lockfile wrong at 0.4.0 indefinitely — strengthening the case for an explicit backfill now.

**Sources:** intent.md:8,13-14,16; scripts/sync-version.mjs:13-14; `.changeset/` listing; `git tag -l`; `git show v0.4.0:package-lock.json` (0.1.1) vs `:package.json` (0.4.0); `gh release view v0.4.0`; CHANGELOG.md; v1 precedent 3968e39.

### Q4: CI drift-check guard — wanted or out of scope? The intent leaves open (intent.md:22) whether a CI check that catches version drift is still wanted alongside the npm-driven sync. To decide: (a) What CI workflows exist today besides release.yml, and do any run on PRs/pushes (e.g. a CI/test workflow)? (b) Does any existing CI step already fail when the lockfile is out of sync — e.g. `npm ci` (which fails if package.json and lockfile disagree), or a "git diff --exit-code after install" check? (c) Is there an existing convention in this repo for "validation that fails CI on drift" (like the changeset validator) that a version-drift check would naturally mirror? (d) Would the existing release flow's auto-commit already keep the three files consistent once the new sync is in place, making a separate guard redundant? I want to recommend either "add a lightweight drift check" or "rely on the release flow + npm ci; no separate guard" and justify it from existing conventions rather than adding net-new machinery without cause.

**A:**

- **(a) CI workflows:** three — `release.yml` (push to trunk; `npm ci`→`npm test`→changesets action), **`changeset-gate.yml`** (on `pull_request`→trunk — the PR-gating workflow: `npm ci`→`npm test`→`node scripts/validate-changesets.mjs`→`npx changeset status`; exempts bot branch `changeset-release/trunk`), and `deploy-website.yml` (website-only, no install/test).
- **(b) Does any existing CI step FAIL on a stale lockfile version? — NO (confirmed by experiment).** `npm ci` against the current drifted state (pkg 0.4.0, lock 0.1.1, deps consistent) → **EXIT 0**, and did not modify the lockfile (so a hypothetical "git diff after install" guard would also pass — and none exists). `npm ci` validates the dependency tree, NOT the recorded `version` fields. A real dependency-range mismatch → `npm ci` EXIT 1. So `npm ci` catches *dependency* drift but is blind to *version-field* drift — exactly this issue's drift.
- **(c) Existing convention to mirror:** YES — `scripts/validate-changesets.mjs` (built-in-Node, no deps/network, exits non-zero with `file:line: msg`), wired as a direct CI step `run: node scripts/validate-changesets.mjs` (changeset-gate.yml:33-34); its `main()`→exit-code/`isMainModule()` shape mirrors `sync-version.mjs`. A version-drift check would slot in identically + a paired `scripts/test/*.test.mjs`.
- **(d) Can drift reappear without a guard?** Through the release flow + auto-commit, the three files stay consistent — guard redundant *for that path*. But realistic re-drift paths exist: nothing *enforces* that the version only changes via `release:version` (a hand-edit to package.json's version, or a partial manual escape-hatch run, wouldn't be caught by npm ci/test — proven in (b)). The current drift is itself proof: it sat unnoticed across v0.2.0→v0.4.0 because nothing flagged it. A guard also acts as a regression test for the sync mechanism.

**Researcher's recommendation:** **add a minimal drift check** to `changeset-gate.yml` mirroring the changeset-validator pattern (fail with `file:line: msg` if package.json, plugin.json, and the two lockfile version fields disagree) — most consistent with the repo's "validation fails CI on drift" convention and directly prevents recurrence (the npm sync handles the happy path; the guard catches every other path). Defensible either way; intent.md:22 leaves it open.

**Sources:** changeset-gate.yml:4-5,18,27-37; release.yml:27-37; deploy-website.yml:3-8; validate-changesets.mjs:17,168-207; package.json:13; intent.md:22; live `npm ci` experiments (exit 0 on stale version, exit 1 on dep mismatch).

## Research

_(No standalone research topics beyond the experiments captured inline under Q2 and Q4.)_

## Consolidated Requirements

Each requirement is phrased as an observable outcome.

### Mechanism (fixed by intent)

1. The lockfile's recorded version is brought into sync by running `npm install --package-lock-only`, not by a hand-written or structured JSON edit of the lockfile's version fields. This is the sole write path for the lockfile version (binding intent constraint, intent.md:16).
2. The sync runs automatically as part of the release version step (`npm run release:version`), positioned after the version bump (`changeset version`) so the lockfile records the just-bumped version. No manual step is required to keep the lockfile in sync during a release.
3. The sync is reached by every path that performs a release version bump — both the automated CI path (changesets action invoking `release:version` in `release.yml`) and the documented manual escape hatch (CONTRIBUTING.md) — so neither path leaves the lockfile drifted.

### Observable end state

4. After the release version step completes, the lockfile's top-level `.version` and its root `.packages[""].version` both equal the version recorded in `package.json`.
5. After the release version step completes, all three version-bearing locations agree: `package.json` (source of truth), `.claude-plugin/plugin.json`, and the two lockfile version fields all carry the same version (the existing `plugin.json` propagation via `sync-version.mjs` continues to hold).
6. The sync is idempotent: running the release version step (or the lockfile sync command) again with no new version change produces no further change to the lockfile (an empty diff).
7. In the normal release flow (project dependencies unchanged), the only change the sync makes to the lockfile is the two version fields; it does not reorder, add, remove, or rewrite dependency entries. (Caveat: if the dependency tree is independently out of sync, `npm install --package-lock-only` will also revalidate and rewrite the affected dependency entries — an accepted trade-off of this mechanism, intent.md:17. So the guaranteed invariant is requirement 4, not "only the version fields ever change.")

### One-time backfill of existing drift

8. The change lands the committed `package-lock.json` in sync at the current released version (`0.4.0`): both lockfile version fields read `0.4.0`, matching `package.json`. (The lockfile is currently frozen at `0.1.1` and has been stale across v0.2.0–v0.4.0.)
9. The backfill is produced via the same `npm install --package-lock-only` mechanism (requirement 1), not by hand-editing the lockfile's version fields.

### Drift guard (spec decision on intent's open question, intent.md:22)

10. A version-drift check fails CI on the pull-request gate (`changeset-gate.yml`) when the version is inconsistent across `package.json`, `.claude-plugin/plugin.json`, and the two lockfile version fields; it passes when all four agree. (Rationale: `npm ci` is blind to version-field drift — it exits 0 on the current drifted state — so without this guard, drift introduced outside the release flow, e.g. a hand-edited `package.json` version, would go uncaught, as it did across three releases.)
11. The drift check follows the repo's existing validation convention (mirroring `scripts/validate-changesets.mjs`): a dependency-free, network-free Node script wired as a direct CI step, exiting non-zero on drift with an actionable `file:line: message`, and covered by a paired test under `scripts/test/`.

### Accepted trade-offs / non-requirements (explicitly out of scope)

12. Offline / no-registry-access operation is NOT a requirement. Registry and `node_modules` dependence (and full dependency-tree revalidation) by `npm install --package-lock-only` are accepted (intent.md:17). No requirement may demand the sync work without registry access.
13. Changing the version-bump mechanism is out of scope: `changeset version` remains the source of the bump; this feature only propagates the bumped version into the lockfile.
14. Updating dependency versions / relocking the dependency tree is not a goal of this feature; any dependency-tree change is only the incidental, accepted side effect noted in requirement 7.
15. Enforcing that the version may only ever be changed via `release:version` is out of scope; the drift guard (requirements 10–11) detects inconsistency rather than preventing manual edits.
