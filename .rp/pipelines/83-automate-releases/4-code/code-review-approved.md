# Code Review — APPROVED

**Issue:** 83 — Automate releases with GitHub Actions (changeset gate + release workflow)
**Base ref diffed against:** `34268e6`
**Batch:** Tasks 1–7 (commits `d58baef`, `543801f`, `a6f30fb`, `d391f15`, `1589a65`, `21b0ea3`, `9da615b`)
**Verdict:** APPROVED

## Scope reviewed

Cumulative diff `git diff 34268e6..HEAD` plus the two new scripts and two new
workflows. Files touched: `.gitignore`, `package.json`, `package-lock.json`,
`.changeset/config.json`, `scripts/validate-changesets.mjs`,
`scripts/test/validate-changesets.test.mjs`,
`.github/workflows/changeset-gate.yml`, `.github/workflows/release.yml`
(8 files, +552/−18).

## Behavior verified (not just read)

- `npm ci` against the committed lockfile: **succeeds** (321 packages, no
  EUSAGE/out-of-sync error — pre-existing `@types/node` drift is resolved).
- `npm test`: **22 tests pass, 0 fail** across both suites (sync-version +
  validator). Suite uses only `node:test`/`node:assert/strict` and `node:`
  built-ins; no `tsx`/YAML lib (R10/J4).
- `node_modules/@changesets/changelog-github` resolves at `0.7.0`; lockfile adds
  exactly the expected tree (changelog-github, get-github-info, node-fetch,
  dotenv) plus the @types/node drift correction — no stray additions.
- Validator sanity run on representative inputs — all match the spec/design:
  - bare `@`-scoped key → line 2 "front matter must be a YAML mapping…" (R11/ST1).
  - double- and single-quoted keys → `[]`.
  - pre-1.0 `major` (v0.1.0) → line 2 with the verbatim substring
    `CONTRIBUTING.md#pre-10-policy` (J7).
  - `major` at `1.0.0` → `[]`.
  - YAML list / bare scalar → non-mapping error line 2.
  - missing closing fence → line 1.
  - no-trailing-newline canonical empty → `[]`.
  - multi-entry with one bad entry → per-entry errors collected.
- `npx changeset status --since=origin/trunk`: real exit code **1** (config
  loads cleanly under the new `changelog` tuple / `privatePackages` /
  `changedFilePatterns`; the presence check is effective — `version: true` keeps
  the gate from being silently blind, R7/J1).
- Both workflow YAMLs parsed with `js-yaml`: structurally valid.

## Load-bearing invariants — all hold

- **`release:version` byte-unchanged:** `"changeset version && node scripts/sync-version.mjs"` (R3/J6). `sync-version.mjs` and its `TARGET_MANIFESTS=[".claude-plugin/plugin.json"]` untouched.
- **Release action wiring:** `version: npm run release:version`, `publish: npx changeset tag` (never `changeset publish`, J3), `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, `id: changesets`. No `createGithubReleases: false`. No npm publish step.
- **No OIDC:** no `id-token` in either new workflow. (The only `id-token: write` in the repo is the pre-existing `deploy-website.yml`, explicitly out of scope per design §2.)
- **Permissions least-privilege:** gate `contents: read` + `pull-requests: read`; release `contents: write` + `pull-requests: write` only (J5).
- **`privatePackages` = `{version: true, tag: true}`** (J1/J2/R14).
- **`changedFilePatterns`** = exact 5-entry allowlist `["skills/**","agents/**",".claude-plugin/**","package.json","README.md"]` with anchored `package.json` (R8/AC5).
- **`changelog`** = `["@changesets/changelog-github", {"repo": "Automattic/radical-pipelines"}]` (R18).
- **Tag form `v<version>`** via default `changeset tag` on a bare single-package repo (D1.6/ST2); no custom tag naming.
- **Concurrency:** gate cancels-in-progress; release does not (never cancel a release mid-flight). Bot-PR exemption `if: github.head_ref != 'changeset-release/trunk'` at job level (required-check-safe).
- **`.gitignore`** adds `.env`/`.env.local`, keeps `node_modules/`.

## Per-task acceptance

- **T1** `.gitignore`: ✓ `.env`/`.env.local` added, `node_modules/` kept.
- **T2** `package.json` + lockfile: ✓ devDep added, `test` script is the exact node-glob form, `release:version` unchanged, `npm ci`/`npm test` pass.
- **T3** config deltas: ✓ exactly the three deltas; all other keys (`commit:false`, `access:"restricted"`, `$schema` pin, `baseBranch`) unchanged; config loads.
- **T4** validator: ✓ named exports `validateChangesetFile`/`main`, only `node:` built-ins, all check-order/message/line-number behaviors match §6.4 including the load-bearing anchor and bare-`@` rejection.
- **T5** tests: ✓ full R12/§7 matrix (B1–B7b, CRLF, double/single-quoted keys, bare-`@`, `none`) plus CLI fail/pass smoke; all pass.
- **T6** gate workflow: ✓ trigger, permissions, concurrency, job `if:`, step order (checkout fetch-depth 0 → setup-node 22 → npm ci → npm test → shape → presence with `--since=origin/<base.ref>`).
- **T7** release workflow: ✓ triggers (`push:trunk` + `workflow_dispatch`), permissions, bare concurrency without cancel-in-progress, step order, action wiring.

## Traceability

Acceptance criteria 1–12 and 16–17 are satisfied by this code+test batch and
were verified behaviorally where runnable (AC8 by the passing suite; AC3/4/5/7
by `changeset status` + validator runs; AC1/2 by string/byte checks). AC13–15
(documentation: README, CONTRIBUTING, prerequisites) are explicitly out of this
code batch's scope (handled by the separate doc phase); the cross-file J7 anchor
contract is honored on the code side.

No findings. Approved.
