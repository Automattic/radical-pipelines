# Design-Doc Research — Automate releases with GitHub Actions (changeset gate + release workflow)

This file is the design-phase working log. For each topic it records the
question put to `design-doc-researcher`, the evidence returned, and the design
**decision** reached (with rationale and trade-offs). The decisions here are the
contract handed to the planning phase; they must satisfy `1-spec/spec.md`
(R1–R22) and preserve the load-bearing invariants flagged in `spec-research.md`.

## Inputs and grounding (read at start)

- `1-spec/spec.md` — approved requirements R1–R22 + acceptance criteria 1–17.
- `1-spec/spec-research.md` — full Q&A (A1–A5), consolidated requirements,
  section I = six open design choices (DC1–DC6) with recommended defaults,
  section J = six load-bearing invariants.
- `0-prompt/prompt.md` — raw request (skillsmith PR #41 as the model).

### Repo facts confirmed by direct inspection in this worktree

- `package.json`: `@automattic/radical-pipelines`, `"private": true`, version
  `0.1.1`. Sole script `release:version = changeset version && node
  scripts/sync-version.mjs`. devDep: `@changesets/cli ^2.31.0` only (no
  `changelog-github`, no `tsx`, no `yaml`). `type: module`.
- `.changeset/config.json`: `changelog: "@changesets/cli/changelog"`,
  `commit: false`, `access: "restricted"`, `baseBranch: "trunk"`,
  `privatePackages: { version: true, tag: false }`. No `changedFilePatterns`
  key yet. `$schema` pinned to `@changesets/config@3.1.4`.
- `scripts/sync-version.mjs`: built-in modules only; `TARGET_MANIFESTS =
  [".claude-plugin/plugin.json"]`; exports `readRootVersion`,
  `syncManifestVersion`, `syncVersion`, `TARGET_MANIFESTS`; `isMainModule()`
  guard via `realpathSync`; CLI prints "Updated …" / "already in sync".
- `scripts/test/sync-version.test.mjs`: `node:test` (`describe`/`test`/
  `beforeEach`/`afterEach`), `node:assert/strict`, builds tmpdir fixtures with
  `mkdtempSync`. This is the convention the validator test must mirror.
- `.github/workflows/`: only `deploy-website.yml` (push:trunk on `website/**`;
  uses `actions/checkout@v4`, has `id-token: write` for Pages — NOT a model for
  release.yml permissions). No `changeset-gate.yml` / `release.yml` yet.
- Pending changesets: `.changeset/changelog-and-version-sync.md` (minor),
  `.changeset/restructure-repository-layout.md` (minor). `.changeset/README.md`
  is the cheat-sheet (excluded from validation).
- **Three doc surfaces currently assert "no git tags / no release CI"** and must
  be reconciled by the docs phase:
  1. `README.md` "Changelog and versioning" (lines ~169–210): "Cutting a version
     is an operator-run local action, not CI"; "There is no `npm publish`, no git
     tags, and no release CI."
  2. `AGENTS.md` changeset rule: points to "the README's changelog and versioning
     section for how to author one."
  3. `.changeset/README.md`: "In this repository there is no registry publish, no
     git tags, and no release CI: a maintainer runs the version step locally…"
  (spec-research only called out #1 and #2; #3 is an additional surface I am
  flagging here so the docs phase does not leave it stale.)

## Open design choices to resolve (from spec-research § I)

- DC1 — Tag NAME format: scoped `@automattic/radical-pipelines@<version>` (rec.)
  vs. plain `v<version>`.
- DC2 — `CONTRIBUTING.md` (rec.) vs. README-anchor-only for pre-1.0 policy +
  mechanics.
- DC3 — Keep `README.md` in `changedFilePatterns` + document `--empty` (rec.)
  vs. drop it.
- DC4 — First release creates `CHANGELOG.md` fresh at 0.2.0 (rec.) vs. seed a
  `## 0.1.1` baseline.
- DC5 — Adopt `@changesets/changelog-github` (rec.) vs. keep plain changelog.
- DC6 — Gate as a required status check via branch protection — explicitly
  deferred to a maintainer (out of scope); if chosen, R9 exemption becomes
  mandatory.

## Load-bearing invariants to preserve (from spec-research § J)

1. `privatePackages.version: true` (gate functions only with this) — R7.
2. `privatePackages.tag: true` (tags the private package) — R14.
3. release.yml uses `publish: npx changeset tag`, NOT `changeset publish` — R13.
4. Validator + tests dependency-free `.mjs`; no `tsx`/`yaml` — R10.
5. No `id-token: write`; release.yml needs `contents: write` +
   `pull-requests: write` — R15.
6. `sync-version.mjs` behavior unchanged; sole target
   `.claude-plugin/plugin.json` — R3.

---

## Design Q&A (in progress)

### Pre-Q0 — third stale doc surface (confirmed)

**Finding (analyst, confirmed by researcher).** Three doc surfaces currently
assert "no git tags / no release CI" and all must be reconciled by the docs
phase (spec-research had named only the first two):

1. `README.md` "Changelog and versioning" — "operator-run local action, not CI";
   "no git tags, and no release CI".
2. `AGENTS.md` — changeset/release rule + (R20) pointer to the new CONTRIBUTING
   anchors.
3. `.changeset/README.md` — literally "In this repository there is no registry
   publish, no git tags, and no release CI: a maintainer runs the version step
   locally."

**Researcher nuance.** `.changeset/README.md` is the changesets cheat-sheet; it
is created once by `changeset init` and is NOT regenerated by `changeset
version`. It has been hand-customized here (upstream's stock cheat-sheet has no
such sentence). So editing it is safe and won't be clobbered — it is a
hand-maintained file we own.

**Decision.** All three surfaces are in-scope edit targets for the documentation
topic (folds into R19/R20). Recorded now so it is not lost.

---

### Topic 1 — Release workflow (`release.yml`): full shape, triggers, permissions, action wiring

**Q1 (analyst).** Lock the COMPLETE `release.yml` as concrete YAML: (a) triggers
+ concurrency; (b) permissions; (c) job steps (skillsmith verbatim, then keep/drop
for this repo, incl. whether release runs the test suite); (d) the exact
`changesets/action@v1` `with:`/`env:` block and PROOF that `GITHUB_TOKEN` reaches
the `version` subprocess (R18/R22 hinge on it); (e) setup-node/cache + action refs.

**A1 (researcher) — evidence.**

**★ LEAD FINDING — tag name is `v<version>`, NOT scoped. Reverses spec-research
A2a NUANCE 2 and reframes DC1.** Verified empirically + at source:
- Both `changeset tag` (CLI `packages/cli/src/commands/tag/index.ts`) and the
  action's `runPublish` (`src/run.ts`) compute the tag as
  `tool !== "root" ? \`${name}@${ver}\` : \`v${ver}\``. `tool` comes from
  `@manypkg/get-packages` (pinned `^1.1.3` in both the CLI and the action).
- This repo is a BARE single-package repo: no `workspaces` field, no
  `pnpm-workspace.yaml`/`lerna.json`/`rush.json` (researcher `ls`-checked the live
  tree). manypkg therefore reports `tool === "root"` → the `v${ver}` branch.
- Empirical sandbox run (scoped private name, `privatePackages.tag: true`, config
  mirroring this repo, real git repo, version bumped to 0.2.0):
  `npx changeset tag` printed `🦋  New tag:  v0.2.0` and created git tag `v0.2.0`;
  re-run produced no output, exit 0, no duplicate tag (confirms R14 idempotent
  no-op).
- The action's `runPublish` root branch independently sets `tagName = \`v${version}\``
  and `createRelease({ name: tagName, tag_name: tagName, ... })`, reading the
  `## <version>` entry from CHANGELOG via `getChangelogEntry` as the body;
  `prerelease` is set from whether the version contains `-`.
- Skillsmith gets the scoped `@automattic/skillsmith@x.y.z` tag ONLY because it is
  a workspaces monorepo (`tool !== "root"`). That parity does not transfer.
- Edge: the action creates the Release only when `changeset tag` emits a fresh
  `New tag:` line. If a tag exists but its Release somehow does not, re-running the
  workflow will NOT backfill the Release — recovery is a manual `gh release create
  v<ver>`. (One-line note for the R20 recovery docs.)

**(a) Triggers + concurrency.**
- `push: branches: [trunk]` + `workflow_dispatch` (no `pull_request` — gate is a
  separate workflow). `workflow_dispatch` is additive and cannot loop (it only
  fires on a human click; it is exempt from anti-recursion but that is irrelevant
  since it is never machine-triggered).
- Concurrency: use a bare group, NO `cancel-in-progress` — skillsmith uses exactly
  `concurrency: ${{ github.workflow }}-${{ github.ref }}`. Cancelling a release
  mid-flight could interrupt between the tag push and Release creation (orphan
  tag) — serialize, do not cancel. (Contrast: the GATE uses
  `cancel-in-progress: true`, correct there since a superseded PR check is
  disposable.)

**(b) Permissions (workflow-level, mirroring skillsmith):**
```yaml
permissions:
  contents: write       # push bump commit to changeset-release/trunk; push tag; create Release
  pull-requests: write  # open/update the Version Packages PR
```
DROP `id-token: write` (skillsmith has it only for npm OIDC — N/A, and R15
forbids it). No `issues: write` needed (the action never opens issues; the Version
PR body is covered by `pull-requests: write`).

**(c) Job steps.** Skillsmith verbatim: checkout@v6 (fetch-depth 0) → setup-node@v6
(node 22, cache npm) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm test`
→ `changesets/action@v1`.
- DROP `npm run lint` / `npm run typecheck` — those scripts do NOT exist here
  (package.json has only `release:version`); including them would hard-fail.
- `npm test`: researcher recommends adding a `"test"` script as part of this work
  (e.g. `node --test scripts/test/`) and running `npm test` in BOTH gate and
  release. The only release-time code paths are `release:version` (changeset
  version + sync-version) and `changeset tag`; the sync-version + validator tests
  guard exactly that correctness. Defensible alternative: tests gate-only (the
  Version-PR-merge commit is not itself gate-checked while trunk is unprotected),
  but researcher leans run-in-both.

**(d) Action `with:`/`env:` + env-propagation PROOF.**
```yaml
- id: changesets
  uses: changesets/action@v1
  with:
    version: npm run release:version   # MUST set this: default `changeset version` would skip sync-version.mjs → R3 break
    publish: npx changeset tag         # creates v<ver> tag; action then creates the GitHub Release; no-op if tag exists
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
- We set BOTH `version:` and `publish:` (skillsmith sets only `publish:` and lets
  `version` default). We MUST override `version` because our step also runs
  `sync-version.mjs`; the default `changeset version` would not (R3).
- PROVEN env propagation (R18/R22 hinge): step-level `env: GITHUB_TOKEN` →
  `src/index.ts`: `githubToken = process.env.GITHUB_TOKEN || core.getInput(...)`.
  The action injects it into BOTH subprocesses in `src/run.ts`: `runVersion` does
  `const env = { ...process.env, GITHUB_TOKEN: githubToken }; await exec(script,
  undefined, { cwd, env })`; `runPublish` does the same with `getExecOutput`. So
  `changelog-github`/`get-github-info` reads `process.env.GITHUB_TOKEN` during the
  VERSION step in CI with zero extra wiring → R18 CI-cost is zero, R22 first-run
  token present.

**(e) setup-node + cache + refs.** node 22 fine (built-ins only; `node --test`
stable 18+; matches skillsmith). `cache: npm` works as-is (resolves root
`package-lock.json`, no `cache-dependency-path`). Refs: `actions/checkout@v6`
(fetch-depth 0 — needed for changeset history/tag ops), `actions/setup-node@v6`,
floating major tags for `@v1`/`@v6` per skillsmith convention (SHA-pinning only if
the team raises supply-chain hardening as a goal — not a spec goal).

**Snag flagged (pre-existing, Code-phase concern).** `npm ci` currently FAILS in
this worktree — `package-lock.json` is out of sync (`@types/node@12.20.55` locked
vs `@types/node@25.9.1` resolved). Both release.yml and the gate run `npm ci`, so
the Code phase MUST resync the lockfile (`npm install`), especially after adding
the `@changesets/changelog-github` devDep (R18). Researcher did NOT modify the
lockfile. Source: changesets/action `src/index.ts`, `src/run.ts`, `action.yml`;
CLI `tag/index.ts`; `@manypkg/get-packages@1.1.3`; sandbox run; live worktree `ls`.

**DECISIONS (Topic 1):**

- **D1.1 — release.yml triggers.** `on: push: branches: [trunk]` + `workflow_dispatch: {}`.
  Ship the `push:trunk` trigger LIVE from this PR (satisfies R1/R16 "driven by
  CI"; worst first-merge case is a harmless human-reviewed Version PR — no
  irreversible external side-effect unlike skillsmith's npm publish).
- **D1.2 — concurrency.** `concurrency: ${{ github.workflow }}-${{ github.ref }}`,
  NO `cancel-in-progress`. Rationale: never cancel a release mid-flight (orphan-tag
  risk); serialize instead.
- **D1.3 — permissions (workflow-level).** `contents: write` + `pull-requests:
  write` only. NO `id-token: write` (R2/R15). Preserves invariant J5.
- **D1.4 — job steps (minimal correct set).** checkout@v6 (fetch-depth 0) →
  setup-node@v6 (node 22, cache npm) → `npm ci` → `npm test` → changesets/action@v1.
  DROP lint/typecheck (no such scripts). INCLUDE `npm test` — and add a `"test"`
  script (`node --test scripts/test/`) as part of this work, run in BOTH gate and
  release. Rationale: cheap insurance over exactly the bump/sync/validator
  correctness a release depends on; the Version-PR-merge commit is not otherwise
  gate-checked (trunk unprotected). [Cross-ref D-test below; finalize the script
  shape in the validator topic.]
- **D1.5 — action wiring.** `version: npm run release:version` (MUST override the
  default to keep sync-version — R3/J6); `publish: npx changeset tag` (NOT
  `changeset publish` — J3); `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` at
  step level (proven to propagate to both subprocesses → R18/R22). Keep
  `createGithubReleases` at its default true (R14; false also suppresses tag push
  — changesets/action#547).
- **D1.6 — tag name = `v<version>` (resolves DC1).** Accept the natural
  `changeset tag` output for a bare single-package repo: plain `v<version>` (e.g.
  `v0.2.0`), no custom config, no `gh release create`. This is the conventional/
  desirable form. DC1's "scoped, for skillsmith-parity" recommendation is
  UNAVAILABLE via this path and unnecessary; the alternative `v<version>` is what
  we get for free. The GitHub Release is named/tagged `v0.2.0` with the `## 0.2.0`
  changelog entry as its body. ⚠️ **Spec reconciliation flag:** spec.md N5 says
  "tags are the scoped `@automattic/radical-pipelines@<version>` form `changeset
  tag` produces" — factually WRONG for this repo (it produces `v<version>`).
  Design doc will note the correction; this does not require reopening the spec
  (the OUTCOME — a tag + Release with the changelog body, no custom naming work —
  is unchanged and N5's intent "don't do custom tag naming" still holds), but the
  prose is wrong and the docs/plan must use `v<version>`.
- **D1.7 — recovery-doc note.** R20 recovery section must note: re-running the
  workflow will NOT backfill a missing Release for an already-existing tag;
  recovery is a manual `gh release create v<ver> --notes-file <entry>`.
- **D1.8 — lockfile resync (hand-off to plan/code).** `npm ci` currently fails
  (lockfile drift). The plan MUST include resyncing `package-lock.json` (via `npm
  install`) so gate + release CI pass; this also absorbs the new
  `@changesets/changelog-github` devDep (R18/D5).

---

### Topic 2 — Changeset gate workflow (`changeset-gate.yml`): full shape, `--since`, bot exemption, steps

**Q2 (analyst).** Lock the full gate YAML: (a) trigger/permissions/concurrency;
(b) PROOF `--since=origin/<base>` resolves under fetch-depth 0; (c) bot-PR
exemption — `head_ref` population, job-vs-step `if:`, and the
skipped-required-check gotcha (ties to DC6), plus confirm the Version PR branch
name; (d) two-step independence/order/continue-on-error; (e) whether `npm ci` is
needed.

**A2 (researcher) — evidence.**

**(a) Full YAML (skillsmith-parity, adapted).**
```yaml
name: Changeset Gate
on:
  pull_request:
    branches: [trunk]
permissions:
  contents: read
  pull-requests: read
concurrency:
  group: changeset-gate-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
jobs:
  changeset:
    runs-on: ubuntu-latest
    if: github.head_ref != 'changeset-release/trunk'   # bot-PR exemption
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Validate changeset shape
        run: node scripts/validate-changesets.mjs
      - name: Require a changeset for release-relevant changes
        run: npx changeset status --since=origin/${{ github.event.pull_request.base.ref }}
```
- Trigger: `pull_request` with no explicit `types:` defaults to
  opened/synchronize/reopened — exactly what we want; do NOT add `types:` (risks
  narrowing). `branches: [trunk]` scopes to PRs targeting trunk.
- Permissions: `contents: read` + `pull-requests: read` is sufficient.
  `changeset status` makes NO GitHub API calls (pure local git + filesystem,
  traced through `@changesets/git` `getChangedPackagesSinceRef`); the validator is
  pure local Node. The job's pass/fail is its own check-run conclusion (no extra
  scope). No `pull-requests: write` (that is release-only).
- Concurrency: gate USES `cancel-in-progress: true` (opposite of release) — a
  superseded PR check is disposable. Group `${{ github.head_ref || github.ref }}`.

**(b) `--since=origin/trunk` under fetch-depth 0 — EMPIRICALLY CONFIRMED.**
Researcher built a real git sandbox (bare remote + working repo, `origin/trunk`
pushed, feature branches off trunk, `@changesets/cli` installed) and ran `npx
changeset status --since=origin/trunk`:
- S1 release-relevant (`skills/a.md`), no changeset → exit 1 + "Some packages have
  been changed but no changesets were found… run `changeset add --empty`". (AC3 ✓)
- S2 internal-only (`website/index.html`), no changeset → exit 0 "NO packages to
  be bumped". (AC4 ✓)
- S3 `package-lock.json` only, no changeset → exit 0 (anchored `package.json`
  pattern does NOT match the lockfile). (AC5 ✓ — confirms R8 anchoring)
- S4 `skills/` change WITH a valid minor changeset → exit 0. (AC7 ✓)
`actions/checkout@v6` with `fetch-depth: 0` fetches all history AND all remote
refs, so `origin/<base.ref>` is present — NO extra `git fetch` step needed.
Skillsmith's gate has no extra fetch step.

**(c) Bot-PR exemption — RESOLVED, and it unblocks DC6.**
1. `github.head_ref` is set only on `pull_request`/`pull_request_target` events;
   the gate triggers only on `pull_request`, so it is always populated → the `if:`
   is reliable. (GitHub Docs "Contexts".)
2. **JOB-level `if:` is correct AND future-proof for a required check.** Per
   GitHub's official "Troubleshooting required status checks" doc, verbatim: "If…
   a job within a workflow is skipped due to a conditional, it will report its
   status as 'Success.'" The infamous stays-Pending-and-blocks gotcha applies ONLY
   to WORKFLOW-level (`on:`) path/branch/commit-message filtering, NOT to a job
   `if:`. ⇒ Put `if: github.head_ref != 'changeset-release/trunk'` on the JOB; a
   skipped job reports SUCCESS, so it does NOT block a required check. The "job
   always runs, steps no-op" alternative is unnecessary. This resolves the DC6
   concern: the exemption and a required-check are compatible. (Skillsmith ships NO
   exemption — relies on a maintainer merging past a red X; we do better.)
3. Version PR head branch = `changeset-release/trunk` confirmed in action
   `src/run.ts` `runVersion`: `versionBranch = \`changeset-release/${branch}\``,
   `branch = ref.replace("refs/heads/", "")` = `trunk`. The `if:` literal matches.

**(d) Two steps — independence/order/continue-on-error.** Two independent `run:`
steps in one job. Default (`continue-on-error: false`): a failing validator (step
1) fails the job and skips the status step (step 2) — still satisfies R6 ("fails
if either fails"). Order: shape-validator FIRST, then presence-check (skillsmith
order) — a malformed changeset is the more fundamental error. Researcher
recommends KEEPING the simple fail-fast default (no continue-on-error, no
aggregation step): shape errors and missing-changeset errors are usually mutually
exclusive (a malformed changeset still counts as "present" for the presence
check), so the marginal "report both at once" UX gain is not worth the machinery.

**(e) `npm ci` IS required** — the presence step runs `npx changeset status`,
which needs `@changesets/cli` (+ deps) installed; `npm ci` gives the pinned,
lockfile-resolved CLI. The validator runs via `node scripts/validate-changesets.mjs`
(NOT `npx`) and is dependency-free, so it needs no install of its own (it just
happens to run after `npm ci`). Our `.mjs` port drops skillsmith's `tsx` need, but
`npm ci` stays for the status step.

**★ BONUS finding — schema enforces `tag:true ⟹ version:true` (strengthens J1/J2).**
Researcher reproduced live against `@changesets/config`:
- `version:false, tag:false` (pre-this-work default) → gate is BLIND (changesets#863
  reproduced: `changeset status` exits 0 on an unaccompanied release-relevant
  change).
- `version:false, tag:true` → config load THROWS: "ValidationError: The
  `privatePackages.tag` option is set to `true` but `privatePackages.version` is
  set to `false`. This is not allowed."
- `version:true, tag:true` (this work's target) → gate works AND tagging works.
⇒ Because R14 forces `tag: true` and the schema forbids `tag:true + version:false`,
setting `tag:true` MECHANICALLY guarantees `version:true`. J1 and J2 are mutually
reinforcing: the gate cannot be silently defeated by flipping `version:false` —
that either also disables tagging/releases (obvious: no releases) or hard-errors at
config load. Sources: GitHub Docs (Events, Contexts, Troubleshooting required
status checks — verbatim quotes); changesets/action `src/run.ts`; `@changesets/git`;
`@changesets/config`; live sandbox runs.

**DECISIONS (Topic 2):**

- **D2.1 — gate trigger.** `on: pull_request: branches: [trunk]`, NO explicit
  `types:` (default opened/synchronize/reopened is correct). (R5)
- **D2.2 — gate permissions.** `contents: read` + `pull-requests: read` only.
  (R5; sufficient because `changeset status` + validator make no API/writes.)
- **D2.3 — gate concurrency.** `group: changeset-gate-${{ github.head_ref ||
  github.ref }}`, `cancel-in-progress: true` (disposable PR check).
- **D2.4 — gate steps.** checkout@v6 (fetch-depth 0 — REQUIRED so `origin/<base>`
  resolves) → setup-node@v6 (node 22, cache npm) → `npm ci` → "Validate changeset
  shape" `node scripts/validate-changesets.mjs` → "Require a changeset…" `npx
  changeset status --since=origin/${{ github.event.pull_request.base.ref }}`. Two
  independent fail-fast steps; validator first. (R6) [Note: per D1.4 the gate
  ALSO runs `npm test`; insert it after `npm ci`, before the two gate-specific
  steps — finalized in the validator/test topic.]
- **D2.5 — bot-PR exemption (resolves R9, unblocks DC6).** JOB-level `if:
  github.head_ref != 'changeset-release/trunk'`. SHIP IT. Because a job skipped by
  a conditional reports "Success", this is safe even if/when the gate becomes a
  required check — so DC6 (gate-as-required-check) carries NO hidden blocker from
  the exemption. Scope to the release branch ONLY (Dependabot etc. stay gated).
- **D2.6 — invariants strengthened.** Record the schema guarantee: `tag:true ⟹
  version:true` is enforced by `@changesets/config`, so R14's `tag:true`
  mechanically pins R7's `version:true`. The gate cannot be silently turned off.

---

### Topic 3 — Shape validator (`scripts/validate-changesets.mjs`) + tests

**Q3 (analyst).** Nail the dependency-free `.mjs` port to design precision:
(a) fence regex + capture behavior for all empty forms; (b) the dependency-free
frontmatter parser (validate the proposed regex against REAL `@changesets/cli`
output + the real YAML parser; non-mapping detection; bare-vs-quoted keys);
(c) check order + exact messages + line numbers incl. the pre-1.0 anchor; (d) the
CLI `main()`; (e) the full test matrix; (f) the export surface (mirror
sync-version.mjs).

**A3 (researcher) — evidence.**

**★ CRITICAL FINDING — a BARE unquoted `@`-scoped key is INVALID YAML and MUST be
REJECTED; spec-research A3c's proposed regex wrongly ACCEPTS it.** Tested against
both the real `yaml` lib (skillsmith's) AND `@changesets/parse` (js-yaml, used by
`changeset status`/`version`):
- A bare `@automattic/radical-pipelines: minor` makes BOTH real parsers throw
  (`yaml`: "Plain value cannot start with reserved character @"; `@changesets/parse`:
  "invalid YAML in frontmatter"). Researcher reproduced live: a `.changeset/*.md`
  with a bare `@`-key makes real `changeset version`/`status` CHOKE.
- Root cause: YAML reserves `@` and `` ` `` as indicator chars — a PLAIN scalar
  cannot start with them. That is exactly why `@changesets/cli`/`@changesets/write`
  ALWAYS emit the DOUBLE-QUOTED key form.
- The spec-research regex's bare alt `[^:#\s]+` accepts the bare `@`-key (wrong).
  CORRECTED bare alt: `[^@\`!&*?|>%#"'\s][^:#\s]*` (first char excludes YAML
  reserved indicators). Re-ran the full matrix with the fix → ALL pass, and it now
  matches the real parser's accept/reject on every tested case.
- **R12 "bare-vs-quoted" reframed:** the meaningful real-world assertion is —
  double-quoted accepted, single-quoted accepted, bare-`@` REJECTED (malformed
  YAML, which the release pipeline itself cannot parse). A "bare key accepted"
  positive case is only possible with a NON-`@` name, which then fails the
  unknown-package check anyway. ⚠️ See spec-tension flag ST1 below.

**Real `@changesets/cli` output (exact bytes, grounds the parser).**
- `changeset add --empty` → exactly `"---\n---\n"` (8 bytes) — canonical empty WITH
  trailing newline (the B2 case).
- `@changesets/write` for a minor → exactly
  `---\n"@automattic/radical-pipelines": minor\n---\n\nAdd a feature.\n` — DOUBLE-
  QUOTED key, `: `, bump. Matches this repo's two existing changesets verbatim and
  skillsmith's fixtures. Real-world frontmatter is always the double-quoted
  single-line form.

**(a) Fence regex — CONFIRMED verbatim-portable.** Skillsmith's exact:
`const FENCE_RE = /^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/;` (identical to
A3c). Captures (verified): normal → g1=`"@…": minor`, g2=`\nBody.\n`; canonical
empty `---\n---\n` → g1=`""`, g2=`""`; no-trailing-newline `---\n---` → g1=`""`,
g2=`""` (the `---\r?\n?` makes the final newline optional); CRLF → g1=`"@…":
minor`, g2=`\r\nBody.\r\n`. Both empty forms (with/without trailing newline) trim
to "" → canonical-empty accepted.

**(b) Dependency-free frontmatter parser (no `yaml`) — corrected + parity-checked.**
- ENTRY regex (corrected): `/^\s*(?:"([^"]+)"|'([^']+)'|([^@\`!&*?|>%#"'\s][^:#\s]*))\s*:\s*(\S+)\s*$/`
  (alt1 double-quoted; alt2 single-quoted; alt3 legal-bare; group4 bump).
- Non-mapping detection WITHOUT a parser (R11 step 4): parse line-by-line, skip
  blank lines; if ANY non-blank line fails ENTRY_RE → reject whole front matter as
  non-mapping (line 2); if NO entries found at all → also non-mapping (line 2).
  Correctly rejects a list (`- foo`), bare scalar (`just text`), bare-`@` key,
  malformed lines; accepts one or more legal `key: bump` lines.
- Multiple entries: collect all into a `{name: bump}` map; validate each
  independently (2-entry test with one bad name flags it at line 2).
- Bare vs quoted: double-quoted ✓, single-quoted ✓, bare-`@` ✗ (matches real YAML).
- PARITY PROOF: 16 inputs run through both the corrected `.mjs` parser and
  skillsmith's `yaml`-based logic → identical accept/reject + identical error line
  on all 16. Dependency-free port is behaviorally equivalent (R10 satisfied, no
  `yaml` dep).

**(c) Check order + messages + line numbers (skillsmith verbatim + our 2 adaptations).**
1. FENCE missing/unterminated → line 1: `"missing or unterminated front matter
   (expected two '---' fences)"` (early return).
2. CANONICAL EMPTY (g1.trim()==="" && g2.trim()==="") → valid, return [].
3. EMPTY BODY w/ front matter (g2.trim()==="") → line 4: `"empty body (changeset
   has front matter but no summary)"`. Line 4 is the canonical body line
   (1=`---`, 2=frontmatter, 3=`---`, 4=body); a literal `line: 4` in the .ts, not
   computed.
4. NON-MAPPING → line 2. Skillsmith has two line-2 paths (YAML throw → "YAML parse
   error: <msg>"; parsed-but-not-object → "front matter must be a YAML mapping of
   package name to bump"). **Adaptation (i):** our parser has no YAML lib to throw,
   so COLLAPSE both into the single line-2 message `"front matter must be a YAML
   mapping of package name to bump"` (early return).
5. PER ENTRY (line 2 each):
   - unknown name → `unknown package "<name>" (expected "@automattic/radical-pipelines")`.
   - invalid bump → `invalid bump "<bump>" (expected one of patch, minor, major, none)`.
   - pre-1.0 major (version starts "0." AND bump==="major") → skillsmith literal:
     `'major' is forbidden while pre-1.0 (version=${version}). Use 'minor' with a
     'BREAKING:' prefix; see CONTRIBUTING.md#pre-10-policy.` Skillsmith's anchor is
     literally `CONTRIBUTING.md#pre-10-policy`. **Adaptation (ii):** the anchor
     string depends on DC2 (CONTRIBUTING.md vs README anchor) — see Topic 5; the
     test asserts whatever anchor we choose.
Only TWO changes from skillsmith: collapse the two non-mapping messages; the
anchor per DC2. Expected package name is `@automattic/radical-pipelines`.

**(d) CLI `main()` — confirmed verbatim.** Reads `{name, version}` from CWD
`package.json`; `readdirSync(".changeset").filter(n => n.endsWith(".md") && n !==
"README.md")`; validates each; prints `.changeset/<file>:<line>: <msg>` per error
to stderr; returns 1 if any errors else 0; nothing on stdout. It reads `version`
to drive the pre-1.0 guard, so a fixture can toggle `0.1.0` vs `1.0.0`. Port to
`.mjs` with `node:fs`.

**(e) Test matrix (node:test, mirrors sync-version.test.mjs).** Unit (import pure
`validateChangesetFile(file, raw, pkgName, version)` → assert `Err[]`): B1 valid
minor→[]; B2a canonical empty WITH trailing newline→[]; B2b WITHOUT→[]; B3 missing
closing fence→err "missing or unterminated front matter"; B4 invalid bump
"superminor"→err `invalid bump "superminor"`; B5 wrong package→err `unknown
package "some-other-package"` + `expected "@automattic/radical-pipelines"`; B6
empty body→err "empty body"; B7a major@0.1.0→err "'major' is forbidden while
pre-1.0" + anchor; B7b major@1.0.0→[]; CRLF valid→[]; KEYS double-quoted→[];
KEYS single-quoted→[]; **KEYS bare-`@` REJECTED→err line 2 "front matter must be a
YAML mapping…"** (the corrected R12 case); `none` bump→[]; (optional) non-mapping
list/scalar→err line 2.
CLI smoke (spawn the file): **simplification win** — NO tsx gymnastics; spawn
`spawnSync(process.execPath, [VALIDATOR_PATH], { cwd: tmpDir, encoding: "utf8" })`
where VALIDATOR_PATH = `fileURLToPath(new URL("../validate-changesets.mjs",
import.meta.url))`. Tmpdir fixture needs BOTH a `package.json` (name+version) AND a
`.changeset/` dir. Fail case (bad changeset)→exit 1, stderr matches
`/\.changeset\/[^:]+:\d+: invalid bump/`, stdout==="". Pass case→exit 0,
stderr==="".

**(f) Export surface — mirror sync-version.mjs.** ESM named exports +
`isMainModule()` guard:
- `export function validateChangesetFile(file, raw, pkgName, version)` → `Err[]`
  (`Err = {file, line, msg}`) — the unit-test contract.
- `export function main()` → exit code 0/1 (reads CWD package.json + .changeset,
  prints stderr).
- `isMainModule()` copying sync-version.mjs's `realpathSync(fileURLToPath(
  import.meta.url)) === realpathSync(process.argv[1])` form (handles macOS
  symlinked tmpdirs the CLI smoke relies on); when main → `process.exit(main())`.
Reads exactly like sync-version.mjs.

Researcher also recommends adding a root `"test": "node --test scripts/test/"`
script so `npm test` runs both this and sync-version's tests in CI (gate + release).

**DECISIONS (Topic 3):**

- **D3.1 — fence regex (verbatim).** Port `FENCE_RE = /^---\r?\n([\s\S]*?)(?:\r?
  \n)?---\r?\n?([\s\S]*)$/` exactly. Empty-detection: g1.trim()==="" &&
  g2.trim()==="" → canonical-empty valid (covers both trailing-newline forms).
- **D3.2 — frontmatter parser (corrected, dependency-free).** Use the CORRECTED
  ENTRY regex with the bare alt `[^@\`!&*?|>%#"'\s][^:#\s]*` that REJECTS a bare
  `@`-key. Non-mapping = any non-blank line failing ENTRY_RE, or zero entries →
  line-2 "front matter must be a YAML mapping of package name to bump". No `yaml`
  dep (R10/J4). Parser is general over multiple entries + blank lines.
- **D3.3 — bare-`@`-key is REJECTED (resolves the R12 bare-key case correctly).**
  The validator rejects a bare unquoted `@`-scoped key as non-mapping, matching
  what the real `@changesets/parse` does (it would otherwise choke the release
  pipeline). Test cases: double-quoted accepted, single-quoted accepted, bare-`@`
  rejected. ⚠️ Raises spec-tension ST1 (below).
- **D3.4 — check order, messages, line numbers.** As A3(c): fence@1; canonical-
  empty valid; empty-body@4; non-mapping@2 (single collapsed message); per-entry
  unknown-name@2 / invalid-bump@2 / pre-1.0-major@2. Expected name
  `@automattic/radical-pipelines`. Valid bump set {patch, minor, major, none}.
  Pre-1.0 guard active (version starts "0."). The pre-1.0 message's anchor is
  pinned in Topic 5 (DC2).
- **D3.5 — CLI main().** Verbatim behavior: read name+version from CWD
  package.json; enumerate `.changeset/*.md` minus `README.md`; stderr
  `.changeset/<file>:<line>: <msg>`; exit 1 if any errors else 0; empty stdout.
- **D3.6 — export surface (mirror sync-version.mjs).** `export
  validateChangesetFile(file, raw, pkgName, version) -> Err[]`; `export main() ->
  0|1`; `isMainModule()` guard (realpathSync form) → `process.exit(main())` when
  run directly. Test file `scripts/test/validate-changesets.test.mjs` imports the
  pure fn for unit cases and spawns the `.mjs` for the CLI smoke (no tsx).
- **D3.7 — test matrix.** Adopt the A3(e) matrix verbatim (B1–B7 + CRLF + quoted/
  single/bare-`@` + `none` + CLI smoke fail/pass). CLI smoke uses
  `spawnSync(process.execPath, [VALIDATOR_PATH], {cwd: tmpDir})`, no tsx loader.
- **D3.8 — add a `test` script (CORRECTED form per A6 — see below).** Add
  `"test": "node --test 'scripts/test/**/*.test.mjs'"` (quoted, node-expanded
  recursive glob) to package.json so `npm test` runs sync-version + validator tests
  in gate + release (closes the D1.4 open item). ⚠️ NOT the bare-directory form
  `node --test scripts/test/` — that FAILS on node 22 with MODULE_NOT_FOUND
  (empirically verified in A6), and the no-arg `node --test` form would execute
  any non-test helper that happens to live in a `test/` dir. The explicit
  `*.test.mjs` glob restricts to the two intended files. [Cross-ref Topic 4
  package.json changes; finalized in D6.4 below.]

**⚠️ SPEC-TENSION FLAG ST1 (R11/R12 wording vs. reality — NOT a blocker, resolved
in design; record for spec reconciliation).** R11 says the validator "must accept
both bare and quoted package-name keys in front matter," and R12 lists "bare-vs-
quoted front-matter keys" among accept cases. For THIS repo's `@`-scoped package
name, a truly BARE key is INVALID YAML that the real changesets parser rejects —
so "accept a bare key" is impossible/wrong for the actual package name. The spec's
intent (be liberal about quoting style the CLI might emit) is satisfied by
accepting BOTH quoted styles (double — what the CLI writes — and single); the
correct behavior for a bare `@`-key is REJECTION. Design resolves R11/R12 by:
accept double-quoted + single-quoted; reject bare-`@`. This is an OUTCOME-
preserving clarification (the validator still rejects exactly what the pipeline
can't consume), not a contradiction that blocks design — but the spec's "must
accept … bare … keys" sentence is technically inaccurate for an `@`-scoped name
and should be corrected to "accept both quoted styles; reject a bare `@`-scoped
key as malformed YAML." Will mention to team-lead in the completion summary.

---

### Topic 4 — `.changeset/config.json` + changelog-github (DC5) + first-release bootstrap (DC4)

**Q4 (analyst).** (a) the exact final config.json (tag:true, changedFilePatterns,
changelog tuple) + schema/cli support + commit/access; (b) DC5 changelog-github
adoption (devDep version, required `repo`, local-token + scopes, `.env` ignore);
(c) DC4 first-release with changelog-github — does enriching the PRE-EXISTING
changesets throw? seed or not? does getChangelogEntry find `## 0.2.0`?; (d) does
tag:true affect version/status?

**A4 (researcher) — evidence.**

**(a) Final `.changeset/config.json` (3 deltas only; everything else byte-identical):**
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "Automattic/radical-pipelines" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "trunk",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "prettier": false,
  "privatePackages": { "version": true, "tag": true },
  "changedFilePatterns": ["skills/**", "agents/**", ".claude-plugin/**", "package.json", "README.md"]
}
```
- $SCHEMA: NO bump. Researcher fetched `@changesets/config@3.1.4/schema.json` live;
  its `properties` already include BOTH `changedFilePatterns` AND `privatePackages`
  ({tag, version} booleans). 3.1.4 validates the target file as-is.
- CLI: `@changesets/cli@2.31.0` honors both `changedFilePatterns` (A2 sandbox) and
  `privatePackages.tag` (A1 sandbox). No cli bump.
- `commit: false` stays — CORRECT. With it, `changeset version` does NOT git-commit
  ("All files have been updated. Review them and commit at your leisure" — observed
  verbatim); the action handles commit/push to `changeset-release/trunk`. `commit:
  true` would fight the action. Leave false.
- `access: "restricted"` — irrelevant/harmless; only governs npm publish (never
  done — R2). Leave as-is.

**(b) DC5 — changelog-github: ADOPT. Pinned.**
- DEVDEP: `"@changesets/changelog-github": "^0.7.0"` (installs clean alongside cli
  2.31.0; resolves 0.7.0). Pulls `@changesets/get-github-info@^0.8.0` AND
  `dotenv@^8.1.0` TRANSITIVELY — no separate devDeps needed.
- `repo` REQUIRED — confirmed empirically; omitting it THROWS ("Please provide a
  repo to this changelog generator…"). Value `Automattic/radical-pipelines`.
- LOCAL-TOKEN — confirmed: `changeset version` WITHOUT `GITHUB_TOKEN` THROWS (asks
  to create a PAT with `read:user` + `repo:status`) and ESCAPES CLEANLY ("no files
  should have been affected"; version stayed 0.1.1). So local `release:version` /
  manual escape hatch MUST have a token.
  - SCOPES: classic PAT `read:user` + `repo:status` per the error. For a PRIVATE
    repo (this is private), the classic token needs the broader `repo` scope to
    read commits/PRs via GraphQL (repo:status alone won't read private content —
    standard PAT behavior; researcher flags for docs). Fine-grained PAT: scope to
    `Automattic/radical-pipelines` with Contents:Read + Pull requests:Read +
    Metadata:Read. Docs (R20) give both; for the private case document classic
    `repo` + `read:user` to be safe.
  - `.env` WORKS LOCALLY: changelog-github calls `dotenv.config()` at module load,
    so a gitignored `.env` with `GITHUB_TOKEN=…` is picked up.
- ⚠️ `.env` IS NOT GITIGNORED — `.gitignore` currently contains ONLY
  `node_modules/`. The plan MUST add `.env` (and ideally `.env.local`) to
  `.gitignore` so a token file can't be committed.
- CI cost: zero — the action injects `GITHUB_TOKEN` into the version subprocess
  (A1 proof); default `secrets.GITHUB_TOKEN` has the needed scopes for its own
  repo. CI never sees the throw.

**(c) DC4 — first-release bootstrap WITH changelog-github SUCCEEDS cleanly; NO throw
risk.** Researcher traced + tested:
- Commit-attachment: `@changesets/apply-release-plan` →
  `getCommitsThatAddChangesets` → `git.getCommitsThatAddFiles([".changeset/<id>.md"])`
  attaches each changeset's add-commit SHA (independent of `config.commit`).
- changelog-github `getReleaseLine`: `const commitToFetchFrom = commitFromSummary
  || changeset.commit; if (commitToFetchFrom) { getInfo(...) } else { return
  {commit:null, pull:null, user:null} }` → NO commit ⇒ plain entry, NO throw, NO
  token needed (graceful degrade built in). A SHA not on the remote returns
  `object: null` (not `data.errors`) ⇒ `getInfo` does NOT throw. The loader throws
  only on `data.errors` (auth/transport) — not applicable in CI.
- THIS repo's first release: the two pending changesets' add-commits ARE on trunk
  and pushed, so in CI (real token, real commits) `getInfo` resolves them FULLY →
  proper PR/commit/author links. No throw scenario.
- End-to-end bootstrap (plain changelog, two minors, token-free) confirmed:
  0.1.1 → 0.2.0; CHANGELOG.md created FRESH with `# @automattic/radical-pipelines`
  / `## 0.2.0` / `### Minor Changes` / the two entries. `getChangelogEntry` finds
  the `## 0.2.0` heading on the first run → Release body works, no special-casing.
- DC4 recommendation: create CHANGELOG.md fresh at 0.2.0; do NOT seed a `## 0.1.1`
  baseline. No-seed downside: NONE — 0.1.x were never released as tags/Releases, so
  seeding a 0.1.1 entry would invent a release that never shipped (misleading).
  No-seed is simpler AND more honest.
- R22 docs note: with changelog-github adopted, the FIRST `release:version` (and
  any local run) needs `GITHUB_TOKEN`; CI provides it.

**(d) `privatePackages.tag: true` is ORTHOGONAL to version/status.** `tag` is read
ONLY by `changeset tag` (`allowPrivatePackages = config.privatePackages.tag`).
`changeset version` and `changeset status` read `allowPrivatePackages =
config.privatePackages.VERSION`. Flipping tag false→true changes nothing about the
gate or the bump (proven in A2 sandbox). PLUS the schema forbids `tag:true +
version:false`, so tag:true mechanically KEEPS version:true. Side-effect-free
beyond enabling tagging.

**DECISIONS (Topic 4):**

- **D4.1 — final `.changeset/config.json`.** Adopt the file above. Three edits:
  (1) `changelog` → `["@changesets/changelog-github", { "repo":
  "Automattic/radical-pipelines" }]`; (2) `privatePackages.tag` false→true;
  (3) add `changedFilePatterns` = the R8 allowlist. Keep `$schema` (3.1.4 supports
  both), `commit: false`, `access: "restricted"`, all other keys unchanged.
  Preserves J1 (version:true) and satisfies J2 (tag:true), R8, R14.
- **D4.2 — DC5 RESOLVED: ADOPT `@changesets/changelog-github` (R18).** Add devDep
  `"@changesets/changelog-github": "^0.7.0"` (pulls get-github-info + dotenv
  transitively). The richer entries (PR/commit links + author attribution) also
  enrich the GitHub Release bodies. Accept the documented local-token cost.
- **D4.3 — `.gitignore` add `.env` (+ `.env.local`).** Concrete plan deliverable
  tied to R18/R20 — currently only `node_modules/` is ignored; a maintainer's local
  token file must not be committable.
- **D4.4 — DC4 RESOLVED: NO seeding.** Let the first release create `CHANGELOG.md`
  fresh at 0.2.0 (two pending minors under `## 0.2.0`); do NOT seed a `## 0.1.1`
  baseline (it would invent an unshipped release). `getChangelogEntry` finds
  `## 0.2.0` for the first Release body with no special-casing (R22).
- **D4.5 — first-release is safe in CI.** The pre-existing changesets do NOT cause
  a throw: changelog-github degrades gracefully on unresolvable commits and the
  two changesets' add-commits are on trunk, so CI enrichment resolves fully. Local
  first run needs a token (R18/R22). No mitigation/special-casing required.
- **D4.6 — token-scope guidance for docs (feeds R20).** Private-repo classic PAT:
  `repo` + `read:user`; OR fine-grained PAT scoped to the repo with Contents:Read
  + Pull requests:Read + Metadata:Read. `.env` (gitignored) works via dotenv.
  Public-repo lighter form `read:user,repo:status` noted but we are private.

---

### Topic 5 — Documentation (R19–R21): CONTRIBUTING (DC2), README-in-allowlist (DC3), anchor, prereqs, recovery, stale surfaces

**Q5 (analyst).** (a) DC2 CONTRIBUTING vs README-anchor + the verified `#pre-10-policy`
slug + the doc split; (b) DC3 keep README.md + `--empty`; (c) the exact no-npm
manual release escape-hatch commands; (d) the three prerequisite buckets with
"verify enabled" phrasing; (e) surgical edits to the three stale surfaces;
(f) pre-1.0 bump-guidance semantics consistent with the validator message.

**A5 (researcher) — evidence.**

**(a) DC2 — ADD a slim no-npm CONTRIBUTING.md. Anchor VERIFIED. Split defined.**
- ★ Anchor verified with the real `github-slugger` lib: `"Pre-1.0 policy"` →
  `#pre-10-policy` (lowercased; the `.` dropped so `1`+`0` → `10`). `"Pre-1.0
  Policy"` also → `#pre-10-policy`. `"Adding a changeset"` → `#adding-a-changeset`;
  `"Release process"` → `#release-process`. So skillsmith's literal validator
  string `CONTRIBUTING.md#pre-10-policy` is correct for a `## Pre-1.0 policy`
  heading. **Cross-file invariant:** the Code phase MUST title the heading exactly
  "Pre-1.0 policy" (any casing of "Policy"); renaming breaks the validator's link.
- Recommended slim CONTRIBUTING.md outline (npm fully stripped from skillsmith's
  ~250-line version): `# Contributing`; `## Running tests and checks locally` (just
  `npm test`); `## Versioning policy`; `## Adding a changeset` → `### When a
  changeset is required` (the changedFilePatterns allowlist + exclusions), `###
  Bump types`, `### Pre-1.0 policy` (→ #pre-10-policy), `### How to add a changeset`,
  `### Empty changesets` (`npx changeset --empty` for prose-only README edits),
  `### Summary format conventions` (the `BREAKING:` prefix), `### What this looks
  like in CHANGELOG.md` (changelog-github enriched form); `## Release process`
  (Version PR → maintainer merge → CI tags `v<version>` + GitHub Release, NO npm);
  `## Manual release escape hatch` (no-npm, (c)); `## "I forgot a changeset"
  recovery`; `## Re-running a failed release` (re-run the job; `changeset tag`
  idempotent); `## Dependency-bump PRs` (Dependabot stays gated); `## Repo
  configuration prerequisites` (the three buckets). DROP skillsmith's npm sections
  entirely (manual publish, rollback/unpublish/dist-tag, `npm publish --dry-run`,
  npm trusted-publisher prereq).
- Split: AGENTS.md keeps its two terse rules; only its pointer changes ("See the
  README's changelog and versioning section…" → "See
  [CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset)…").
  README "Changelog and versioning" stays the consumer overview but its "Cutting a
  version" subsection is rewritten to the CI flow and cross-links CONTRIBUTING;
  README's "Adding a changeset" subsection shrinks to a pointer (avoid
  duplication). CONTRIBUTING is the authoritative home for mechanics (gate, bump
  table, pre-1.0 policy, authoring, release process, prereqs, recovery). Don't
  duplicate the bump table — authoritative copy in CONTRIBUTING.

**(b) DC3 — KEEP README.md in changedFilePatterns; document `--empty`. CONFIRMED.**
AGENTS.md mandates a README update on every code change, so README.md is in nearly
every PR diff; keeping it in the allowlist makes the gate ENFORCE what AGENTS.md
already requires (alignment, not a false positive). The only caveat — a prose-only
README edit warranting no release entry — is handled by `npx changeset --empty`
(writes `---\n---\n`, accepted as canonical-empty by the validator (D3.1), and
consumed by `changeset version` without bumping). There is NO path-discrimination
alternative (can't distinguish prose vs contract within one file). Excluding
README.md would weaken the gate and contradict AGENTS.md. Docs MUST document the
`--empty` escape and note it's the mechanism for prose-only README edits.

**(c) Manual no-npm release escape hatch (produces the SAME `v<version>` tag +
Release as CI):**
```bash
# 0. On trunk, clean tree, gh authenticated; GITHUB_TOKEN set (changelog-github throws without it).
git checkout trunk && git pull --ff-only
npm ci
export GITHUB_TOKEN=<PAT>            # private repo: repo + read:user — or a gitignored .env (dotenv)
# 1. Consume changesets: bump, regenerate CHANGELOG, sync plugin.json.
npm run release:version             # inspect; `git restore .` to abort
# 2. Commit the bump (config commit:false → manual).
git commit -am "Version Packages" && git push origin trunk
# 3. Create the tag (idempotent; no-op if it exists).
npx changeset tag
git push origin "v$(node -p "require('./package.json').version")"   # or git push --tags
# 4. Create the GitHub Release with the changelog entry as the body.
gh release create "v$(node -p "require('./package.json').version")" \
  --title "v$(node -p "require('./package.json').version")" \
  --notes-file CHANGELOG.md         # ideally extract just the latest `## <version>` section
```
Same `v<version>` tag + changelog-bodied Release as CI (CI uses the same `changeset
tag` → `v<version>` and the action's createRelease with the per-version entry). Docs
should note: ideally extract the top `## <version>` section for the Release body to
match CI's per-version body. NO npm anywhere. For a MISSING Release on an existing
tag, recovery is just `gh release create v<version> …` (the A1 edge: re-running the
workflow won't backfill it).

**(d) Three prerequisite buckets (R21) — npm item dropped, "verify enabled" phrasing.**
- BUCKET 1 (verify enabled; currently satisfied): "Allow GitHub Actions to create
  and approve pull requests" — **currently ENABLED** (live `gh api`:
  default_workflow_permissions=write, can_approve_pull_request_reviews=true); phrase
  "Verify this is enabled (currently satisfied)" (NOT skillsmith's "off by
  default / enable it"). Bot can push the release branch — currently satisfied
  because trunk is unprotected; no allowance needed today.
- BUCKET 2 (must-do for happy path): NONE. (Repo-specific win: no npm
  trusted-publisher, no blocking PR setting — works with zero further repo-settings
  changes.)
- BUCKET 3 (optional hardening; document, do NOT enforce — branch protection is a
  repo setting a code change cannot make): branch protection on trunk (required
  reviews + the gate as a required status check); IF adopted → allow
  `github-actions[bot]` to push `changeset-release/trunk`, keep human review on the
  Version PR, prohibit self-approval. Phrase R9's exemption as: "already shipped
  (the job-level `if:`), and because a skipped job reports Success it is what makes
  gate-as-required-check safe — no extra work if you later require the check."
  Optional `@changesets/bot` GitHub App for non-blocking educational PR comments
  (complements, does not replace, the gate). DROP skillsmith's npm
  trusted-publisher bullet.

**(e) Three stale doc surfaces — surgical edits.**
1. README.md "## Changelog and versioning" (~169–210): rewrite "### Cutting a
   version" body (line ~195 "operator-run local action, not CI") to the CI flow
   (changesets → Version Packages PR → maintainer merge → CI `v<version>` tag +
   GitHub Release; manual hatch lives in CONTRIBUTING); rewrite line ~206 "no `npm
   publish`, no git tags, and no release CI" → keep the no-npm claim, DELETE "no git
   tags, and no release CI", state releases now produce a `v<version>` tag + GitHub
   Release via CI; adjust "How consumers get new versions" (~210) to add the
   tag/Release while keeping the direct-from-git point; reframe the two
   `release:version` steps (201–204) as "what the Version Packages PR runs in CI"
   and add the R18 local-token note; shrink "### Adding a changeset" (173–183) to a
   CONTRIBUTING pointer.
2. `.changeset/README.md` line 10 ("no registry publish, no git tags, and no release
   CI: a maintainer runs the version step locally"): rewrite to "no registry publish
   (the package is private), but releases are CI-driven: merging the Version
   Packages PR creates a `v<version>` git tag and a GitHub Release. See the root
   README's 'Changelog and versioning' section and CONTRIBUTING.md." Lines 1–8
   (upstream boilerplate) untouched.
3. AGENTS.md line 8: rule text stays accurate; change ONLY the pointer to
   `[CONTRIBUTING.md#adding-a-changeset](./CONTRIBUTING.md#adding-a-changeset)`
   (optionally also point the bump rule at #pre-10-policy). No other change.

**(f) Pre-1.0 bump guidance (validator-consistent).** While `version` starts `0.`:
a BREAKING change is recorded as `minor` (NEVER `major`) with a `BREAKING:` prefix
on the summary; the validator HARD-REJECTS `major` pre-1.0 (D3.4) and points at
`#pre-10-policy`. Features → `minor`; fixes → `patch`. So pre-1.0 the ladder is
effectively patch/minor; `major` is reserved for the deliberate `1.0.0` cut (a
maintainer hand-writes the 1.0.0 entry and removes the guard). Rationale: semver §4
(pre-1.0 "anything MAY change") + avoiding Changesets' default 0.x→1.0.0 jump on a
major (the validator IS the opt-out). Pin the `BREAKING:` summary-prefix convention
in "Summary format conventions". Consistent with the validator message.

**DECISIONS (Topic 5):**

- **D5.1 — DC2 RESOLVED: ship a slim no-npm `CONTRIBUTING.md`.** It is the home for
  the new contributor/maintainer mechanics (R20) and the target of the validator's
  pre-1.0 message. Adopt the A5(a) outline; strip all npm. (R20)
- **D5.2 — anchor invariant (cross-file).** The pre-1.0 heading MUST read exactly
  "Pre-1.0 policy" so GitHub slugs it to `#pre-10-policy`, matching the validator
  message string `CONTRIBUTING.md#pre-10-policy` (D3.4). Validator message ⇔
  CONTRIBUTING heading is a load-bearing pairing; record it. (R11/R18/R20)
- **D5.3 — DC3 RESOLVED: KEEP `README.md` in `changedFilePatterns`.** Document the
  `npx changeset --empty` escape for prose-only README edits (validator accepts
  canonical-empty; `changeset version` consumes without bump). No path
  discrimination; keep-it aligns the gate with AGENTS.md. (R8/R9/R20)
- **D5.4 — doc split + cross-links.** AGENTS.md = rules (repoint changeset line to
  CONTRIBUTING#adding-a-changeset); README "Changelog and versioning" = consumer
  overview (rewrite "Cutting a version" to the CI flow, shrink "Adding a changeset"
  to a pointer); CONTRIBUTING = authoritative mechanics. Bump table lives once, in
  CONTRIBUTING. (R19/R20)
- **D5.5 — manual no-npm release escape hatch.** Document the A5(c) sequence
  (`release:version` with GITHUB_TOKEN → commit+push → `changeset tag` → push tag →
  `gh release create v<version>` with the per-version changelog entry). Produces the
  same `v<version>` tag + Release as CI; NO npm. Include the missing-Release
  recovery one-liner (D1.7). (R20)
- **D5.6 — three prerequisite buckets (R21).** Document per A5(d): Bucket 1 "verify
  enabled (currently satisfied)" (Actions create/approve PRs ON; bot push OK while
  trunk unprotected); Bucket 2 NONE; Bucket 3 optional hardening (branch protection
  + gate-as-required-check, with the R9 exemption already making it safe; optional
  `@changesets/bot`). Drop the npm trusted-publisher item. Document, do NOT enforce
  (N3). (R21)
- **D5.7 — surgical edits to the three stale surfaces.** Apply the A5(e) edit list
  to README "Changelog and versioning", `.changeset/README.md` line 10, and
  AGENTS.md line 8. All three must no longer assert "no git tags / no release CI";
  all must keep the no-npm claim. (R19/R20)
- **D5.8 — pre-1.0 bump guidance.** Document per A5(f): pre-1.0 breaking → `minor`
  with `BREAKING:` prefix (major rejected by the validator); features → minor;
  fixes → patch; `major` reserved for the deliberate 1.0.0 cut. Consistent with the
  validator message. (R11/R20)

---

### Topic 6 — Consolidation: anti-recursion (R17), no cross-trigger, gap sweep

**Q6 (analyst).** (a) Pin R17 anti-recursion + no-PAT + no-auto-merge + the future
`push: tags` caveat; (b) confirm no cross-trigger/double-fire between the two
workflows on any event; (c) gap-sweep R1–R22 + the 17 ACs + invariants for anything
unaddressed, incl. R3/N2 (sync-version untouched), AC2, gate concurrency/perms, and
the `npm test` script form.

**A6 (researcher) — evidence.**

**(a) Anti-recursion / no-PAT (R17) — CONFIRMED (verbatim GitHub Docs).** "When you
use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the
`GITHUB_TOKEN` will not create a new workflow run, with the following exceptions:
`workflow_dispatch` and `repository_dispatch`…". So the action's bump commit to
`changeset-release/trunk` and `changeset tag`'s tag push (both via GITHUB_TOKEN) do
NOT re-trigger release.yml; the HUMAN merge of the Version PR (a push under the
human's identity) DOES trigger release.yml → that run runs `changeset tag` → tag +
Release. Default `secrets.GITHUB_TOKEN`, no PAT/App needed.
- Caveat (docs note): because GITHUB_TOKEN tag pushes don't trigger workflows, a
  FUTURE separate `on: push: tags:` workflow would NOT fire for the changeset-
  created tag. Not relevant now (Release is created in the same run as the tag);
  pin a one-liner so nobody later builds a tag-triggered workflow expecting it.
- Action NEVER auto-merges — CONFIRMED from `changesets/action` `src/run.ts`
  `runVersion`: it only `pulls.create`s or GraphQL-updates the PR; there is NO
  `pulls.merge` anywhere. The Version PR is always human-merged.

**(b) No cross-trigger / no double-fire — CONFIRMED.** changeset-gate.yml is
`pull_request`-only; a PR MERGE is a PUSH (not a pull_request event) → the gate does
NOT run on the merge. release.yml is `push: [trunk]` → the merge triggers ONLY
release.yml. Partitioned cleanly by event type: feature-PR open/sync → gate only;
feature-PR merge → release.yml only (opens/updates Version PR); Version-PR merge →
release.yml only (runs `changeset tag`). Concurrency domains are per-workflow and
do not interact.

**(c) Gap sweep — one real gap (the `npm test` form); everything else clean.**
- R3/N2: CLEAN. The design touches `scripts/sync-version.mjs` ZERO times;
  `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` untouched; no `.pi-extension/`
  added. Only package.json edits: add the changelog-github devDep + a `test`
  script — neither touches sync-version. Config edits don't touch it either.
- AC2: CONFIRMED — `release:version` stays EXACTLY `changeset version && node
  scripts/sync-version.mjs`; the action's `version:` points at it precisely so
  sync still runs; plugin.json still synced on every bump (verified end-to-end in
  A4).
- Gate concurrency/perms: fully pinned in D2.2/D2.3/D2.5; nothing outstanding.
- ⚠️ GAP — `npm test` script form (empirically tested on node 22.21.1):
  `node --test scripts/test/` (and `scripts/test`, `./scripts/test/`) → FAILS with
  MODULE_NOT_FOUND (node 22 treats the positional as a module specifier, not a
  discovery dir). Bare `node --test` (no path) → default recursive discovery runs
  files matching the test pattern AND any file inside a `test/` dir (it EXECUTED a
  non-test `helper.mjs` placed there). `node --test scripts/test/*.test.mjs` (shell
  glob) and `node --test 'scripts/test/**/*.test.mjs'` (quoted, node-expanded) →
  BOTH CLEAN (only `*.test.mjs`, ignore helpers). FIX: use the explicit glob;
  researcher recommends the quoted node-expanded recursive form for maximum
  portability (no shell-glob dependence).

**DECISIONS (Topic 6):**

- **D6.1 — R17 anti-recursion (pinned).** The flow uses ONLY the default
  `secrets.GITHUB_TOKEN`; no PAT, no GitHub App. Bot/GITHUB_TOKEN pushes (bump
  commit, tag push) do not re-trigger; the human Version-PR merge advances the flow
  to the tag/Release step. The action never auto-merges (no `pulls.merge`). No
  infinite loop. (R17/J5)
- **D6.2 — future `push: tags` caveat (docs).** Document that GITHUB_TOKEN tag
  pushes will not fire any future `on: push: tags:` workflow; do not build one
  expecting it. (R17)
- **D6.3 — no cross-trigger (recorded).** The gate (`pull_request`) and release
  (`push: trunk`) never both fire on one event; the Version-PR merge triggers only
  release.yml; the gate does not run on merges. No special handling needed.
- **D6.4 — `npm test` script (FINAL form).** `"test": "node --test
  'scripts/test/**/*.test.mjs'"`. Run it in BOTH the gate and release (after `npm
  ci`, before the gate-specific steps / the changesets action). Avoids the node-22
  bare-dir failure and runs exactly the two `*.test.mjs` files. (Supersedes the
  initial D3.8 form.) This is the canonical `test` script the gate's D2.4 and
  release's D1.4 both invoke.
- **D6.5 — gap sweep clean.** No other unaddressed requirement, acceptance
  criterion, or invariant. R3/N2/AC2 confirmed: sync-version is untouched and the
  `release:version` string is unchanged.

---

## CONSOLIDATED DESIGN (hand-off contract for the planning phase)

The Q&A above (Topics 1–6, decisions D1.x–D6.x) settles the architecture and all
six open design choices. This section is the authoritative summary the plan
implements. Where a concrete decision and the spec's recommended default diverge,
the decision here wins (with the spec-reconciliation flags called out at the end).

### Architecture (the end-to-end flow)

Two GitHub Actions workflows, partitioned by event type, plus config + a validator:

1. **PR time** — `changeset-gate.yml` (`on: pull_request: [trunk]`) runs two
   independent fail-fast checks: the dependency-free shape validator (`node
   scripts/validate-changesets.mjs`) and the presence check (`npx changeset status
   --since=origin/<base>`). The Version-PR branch (`changeset-release/trunk`) is
   exempted by a job-level `if:` (skipped job reports "Success", so it is
   required-check-safe).
2. **Post-merge to trunk** — `release.yml` (`on: push: [trunk]` +
   `workflow_dispatch`) runs `changesets/action@v1` with `version: npm run
   release:version` and `publish: npx changeset tag`. With pending changesets it
   opens/updates the "Version Packages" PR (bump + CHANGELOG + sync-version). When a
   human merges that PR (changesets consumed), the next push runs `changeset tag` →
   creates the `v<version>` tag → the action creates the GitHub Release with the
   `## <version>` changelog entry as the body. Idempotent (no-op if the tag exists).
3. **Anti-recursion** — only the default `GITHUB_TOKEN`; bot pushes don't
   re-trigger; the human merge advances the flow; the action never auto-merges. No
   loop, no PAT/App.

No npm publish, no OIDC, anywhere.

### File inventory (what the plan creates / edits)

**New files:**
- `.github/workflows/changeset-gate.yml` — D2.1–D2.5 (+ `npm test` per D6.4).
- `.github/workflows/release.yml` — D1.1–D1.5.
- `scripts/validate-changesets.mjs` — D3.1–D3.6 (dependency-free ESM, mirrors
  sync-version.mjs export+isMainModule shape).
- `scripts/test/validate-changesets.test.mjs` — D3.7 (node:test, mirrors
  sync-version.test.mjs).
- `CONTRIBUTING.md` — D5.1, D5.5–D5.8 (slim, no-npm; `## Pre-1.0 policy` heading →
  `#pre-10-policy`, the validator anchor — D5.2).

**Edited files:**
- `.changeset/config.json` — D4.1: changelog → changelog-github tuple; tag:true;
  add changedFilePatterns. (3 edits; no `$schema` bump.)
- `package.json` — D4.2 (add `@changesets/changelog-github@^0.7.0` devDep) + D6.4
  (add `"test": "node --test 'scripts/test/**/*.test.mjs'"`). `release:version`
  string UNCHANGED.
- `package-lock.json` — D1.8: resync (`npm install`) to fix the pre-existing drift
  and absorb the new devDep so `npm ci` passes in CI.
- `.gitignore` — D4.3: add `.env` (+ `.env.local`).
- `README.md` "## Changelog and versioning" — D5.4/D5.7 (rewrite "Cutting a
  version" to the CI flow; drop "no git tags/no release CI"; shrink "Adding a
  changeset" to a CONTRIBUTING pointer; local-token note).
- `.changeset/README.md` line 10 — D5.7 (rewrite the stale "no git tags/no release
  CI" sentence; keep no-npm).
- `AGENTS.md` line 8 — D5.4/D5.7 (repoint the changeset pointer to
  CONTRIBUTING#adding-a-changeset).

**Untouched (explicitly):** `scripts/sync-version.mjs` and its targets (R3/N2),
`scripts/test/sync-version.test.mjs`, `.github/workflows/deploy-website.yml`,
`.claude-plugin/*`, the two pending `.changeset/*.md` (consumed by the first
release, not edited).

### Resolved open design choices (DC1–DC6)

- **DC1 — tag name = `v<version>`** (D1.6). NOT scoped. Empirically: a bare
  single-package repo makes `changeset tag` emit `v<version>`. ⚠️ corrects spec.md
  N5.
- **DC2 — ship a slim no-npm `CONTRIBUTING.md`** (D5.1) with the `#pre-10-policy`
  anchor.
- **DC3 — keep `README.md` in `changedFilePatterns`** (D5.3) + document the
  `--empty` escape.
- **DC4 — no seeding; first release creates `CHANGELOG.md` fresh at 0.2.0** (D4.4).
- **DC5 — adopt `@changesets/changelog-github`** (D4.2) with the documented
  local-token cost.
- **DC6 — gate-as-required-check stays a documented optional maintainer action**
  (D2.5/D5.6); the job-level exemption already makes it safe (skipped job =
  "Success"). Out of this issue's file scope (N3).

### Load-bearing invariants (carried into plan/code)

- J1 `privatePackages.version: true` (gate functions) — preserved (D4.1).
- J2 `privatePackages.tag: true` (tags the private package) — set (D4.1); and the
  schema enforces `tag:true ⟹ version:true`, so J1 and J2 are mutually reinforcing
  (D2.6) — the gate cannot be silently disabled.
- J3 `publish: npx changeset tag`, never `changeset publish` (D1.5).
- J4 validator + tests dependency-free `.mjs`; no tsx/yaml (D3.1–D3.7).
- J5 no `id-token: write`; release has `contents: write` + `pull-requests: write`
  only (D1.3); R17 default-token-only (D6.1).
- J6 sync-version unchanged; sole target `.claude-plugin/plugin.json` (D6.5).
- J7 (new, cross-file) the validator's pre-1.0 message string
  `CONTRIBUTING.md#pre-10-policy` ⇔ the CONTRIBUTING heading "Pre-1.0 policy"
  (D5.2) — renaming the heading breaks the link.

### Requirement → decision coverage matrix

| Req | Covered by |
|----|----|
| R1 (CI-driven flow) | D1.1, D1.5, whole architecture |
| R2 (no npm/OIDC) | D1.3 (no id-token), D1.5 (changeset tag not publish), J5 |
| R3 (preserve sync-version; no .pi-extension) | D6.5, J6 (untouched) |
| R4 (build on existing foundation) | D4.1 (3 edits only), no foundation rework |
| R5 (gate on PR→trunk, fetch-depth 0) | D2.1, D2.4 |
| R6 (two independent checks) | D2.4 (validator + status, fail-fast) |
| R7 (gate enforces; version:true) | D4.1, D2.6 (J1) |
| R8 (allowlist) | D4.1 changedFilePatterns; AC3/4/5 verified empirically (A2) |
| R9 (exempt the release PR) | D2.5 (job-level `if:`) |
| R10 (dependency-free .mjs validator) | D3.1–D3.6, J4 |
| R11 (validator checks/order/messages) | D3.2–D3.5 (+ ST1 bare-`@` correction) |
| R12 (validator tests) | D3.7 (full matrix incl. corrected bare-`@` case) |
| R13 (Version Packages PR) | D1.5 (version: release:version) |
| R14 (tag + Release on merge; private; idempotent) | D1.5, D1.6, D4.1 (tag:true) |
| R15 (least privilege, no OIDC) | D1.3 |
| R16 (live trigger from landing) | D1.1 (push:trunk live) |
| R17 (no loop, default creds) | D6.1, D6.3 |
| R18 (richer changelog) | D4.2 (changelog-github); local-token D4.6/D5.5 |
| R19 (README rewrite) | D5.4, D5.7 |
| R20 (contributor/maintainer docs) | D5.1, D5.3, D5.5, D5.8 (CONTRIBUTING) |
| R21 (document prereqs, don't enforce) | D5.6 (three buckets) |
| R22 (first release bootstraps) | D4.4, D4.5 |
| N1 (no npm ops) | D1.3, D1.5 |
| N2 (no sync-version change/.pi-extension) | D6.5, J6 |
| N3 (no branch-protection change) | D5.6 (documented optional only) |
| N4 (no foundation rework) | D4.1 |
| N5 (no custom tag naming) | D1.6 (accept default `v<version>`; ⚠️ N5 prose corrected) |

Acceptance criteria 1–17 all map through the above (AC3/4/5/7 additionally
verified by the researcher's live `changeset status` sandbox in A2; AC2 by the
unchanged `release:version`; AC10/16 by the A1/A4 tag + bootstrap sandboxes).

### Spec-reconciliation flags (for team-lead; NOT design blockers)

- **ST1 — R11/R12 "accept both bare and quoted keys."** For the `@`-scoped package
  name a BARE key is invalid YAML that the real changesets parser rejects; the
  validator therefore accepts both QUOTED styles and REJECTS a bare-`@` key
  (matching what the pipeline can actually consume). The spec sentence "must accept
  … bare … keys" is technically inaccurate for an `@`-scoped name and should read
  "accept both quoted styles; reject a bare `@`-scoped key as malformed YAML."
  Resolved in design (D3.3); outcome-preserving.
- **ST2 — N5 tag-name prose.** spec.md N5 states tags are "the scoped
  `@automattic/radical-pipelines@<version>` form `changeset tag` produces" — this
  is factually wrong for this bare single-package repo; `changeset tag` produces
  `v<version>` (empirically proven, A1). N5's INTENT ("don't do custom tag-naming
  work") still holds — we accept the tool's default — but the prose should say
  `v<version>`. Resolved in design (D1.6); the docs/plan use `v<version>`.

Both are wording corrections to prior-phase artifacts that the design has already
resolved consistently; neither requires reopening the spec to proceed.

---

## Status: DESIGN COMPLETE

All six topics decided; DC1–DC6 resolved; invariants J1–J7 carried; R1–R22 + the
17 acceptance criteria + N1–N5 mapped to decisions. Two spec-reconciliation
wording flags (ST1, ST2) recorded for team-lead. Researcher confirmed the gap
sweep is clean. Ready for the planning phase.
