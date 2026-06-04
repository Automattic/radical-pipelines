# Spec Research — Automate releases with GitHub Actions (changeset gate + release workflow)

## Rough idea

Make release-relevant changes flow automatically from changesets into a version
bump, a generated `CHANGELOG.md`, a git tag, and a GitHub Release — driven by CI
rather than hand edits. Add a CI gate on pull requests that reminds contributors
to include a changeset when they touch release-relevant code and rejects
malformed changesets before they reach a release. Model on skillsmith PR #41,
adapted to this repo's no-npm / GitHub-Release-only flow.

Source issue: [Automattic/radical-pipelines#83](https://github.com/Automattic/radical-pipelines/issues/83).
Foundation already landed in #81 (PR #82): `.changeset/config.json`,
`@changesets/cli`, `scripts/sync-version.mjs` wired through `release:version`.

### Initial repo facts established by direct inspection (pre-Q&A)

- `package.json`: `@automattic/radical-pipelines`, `"private": true`, version
  `0.1.1`. Only script is `release:version` =
  `changeset version && node scripts/sync-version.mjs`. `@changesets/cli` is a
  devDependency. `pi.skills = ["skills", ...]`.
- `.changeset/config.json`: `changelog: "@changesets/cli/changelog"` (plain),
  `commit: false`, `access: "restricted"`, `baseBranch: "trunk"`,
  `privatePackages: { version: true, tag: false }`.
- `scripts/sync-version.mjs` targets **only** `.claude-plugin/plugin.json`
  (`TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`). There is **no**
  `.pi-extension/` directory in the repo. The prompt's constraint referencing
  `.pi-extension/package.json` appears stale/incorrect — POTENTIAL BLOCKER /
  contradiction to confirm.
- `scripts/test/sync-version.test.mjs` exists (the test the prompt references as
  living under `scripts/test/`).
- `.github/workflows/` currently contains only `deploy-website.yml` (push to
  `trunk` on `website/**`). No `changeset-gate.yml` or `release.yml` yet.
- `.claude-plugin/` contains `plugin.json` (has `version`) and `marketplace.json`
  (no version field, `source: "./"`).
- `AGENTS.md` mandates: every code change updates `README.md`, and every change
  records a changeset. README's "Changelog and versioning" section currently
  documents the release as an **operator-run local action** with explicitly
  "no git tags, and no release CI" — this issue changes that, so README must be
  updated.
- Default/base branch is `trunk`.

## Q&A

### Settled before Q&A (confirmed by spec-researcher from both source + target sides)

- **`.pi-extension/package.json` is stale in the prompt.** The issue's Constraints
  say sync must propagate to `.claude-plugin/plugin.json` AND
  `.pi-extension/package.json`, but `scripts/sync-version.mjs` hard-codes
  `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` only; the test fixture
  iterates exactly that one-element list; there is no `.pi-extension/` dir
  post-restructure. **Decision: preserve current sync-version behavior as-is**
  (this issue is about release automation, not changing sync targets). The
  release flow must keep `release:version` working unchanged.
- **README "Changelog and versioning" section (lines ~193-210) currently says**
  "Cutting a version is an operator-run local action, not CI" and "There is no
  `npm publish`, no git tags, and no release CI". This issue adds release CI +
  tags + GitHub Releases (still no npm), so the docs phase must rewrite that
  section.

### Live Q&A

**Q1 — End-to-end release MECHANICS for this private/no-npm repo.** Should we keep
skillsmith's `changesets/action@v1` publish-driven model (Version Packages PR +
publish step creates tag/Release), or a different pattern? What does
`changeset publish`/the action actually do for tags/Releases in a private repo?
What's skillsmith's exact release.yml publish path? What triggers at bootstrap?

**A1 (key finding — skillsmith's publish model does NOT transfer):**

- **Why it breaks:** `changeset publish` checks each package against npm and
  **skips private packages** (`private: true`) entirely — publishes nothing,
  emits no `New tag:` line. `changesets/action@v1` only creates git tags +
  GitHub Releases by scanning the publish command's stdout for `New tag:` lines
  (regex in `src/run.ts`); with no match it sets `published=false` and creates
  NO tag and NO Release. So porting skillsmith's `publish: 'npx changeset
  publish'` would silently produce nothing here. (changesets/action #68, #269;
  changesets RFC #1689.)
- **Skillsmith's exact publish path (verbatim):** single `release` job on
  `workflow_dispatch` (push:trunk commented out at bootstrap); permissions
  `contents: write`, `pull-requests: write`, `id-token: write` (OIDC, npm-only);
  checkout fetch-depth 0 → setup-node 22 → `npm ci` → lint → typecheck → test →
  `changesets/action@v1` with `publish: ${{ !inputs.skip_publish && 'npx
  changeset publish' || '' }}`. NO separate `gh release create` /
  `softprops/action-gh-release` step — it relies entirely on the action's
  publish side-effect (works for skillsmith only because it's a PUBLIC npm pkg).
- **The lever for us:** `changeset tag` creates git tags WITHOUT publishing and
  honors `privatePackages.tag` (`allowPrivatePackages: config.privatePackages.tag`),
  so flipping our config's `tag: false → true` makes the private package
  taggable. (Confirms the prompt's instinct.) But relying on `changeset tag`'s
  stdout to satisfy the action's `New tag:` parser is undocumented/hacky
  (community recipe literally `echo "New tag:"` to fool it — #269). Avoid.
- **RECOMMENDED model (Option A — explicit, no hacks):** Keep the two-step
  "Version Packages PR" half (package-manager-agnostic: bumps version,
  regenerates CHANGELOG, runs sync-version) via `changesets/action@v1` with ONLY
  `version: npm run release:version` (NO `publish:`). Then a SEPARATE explicit
  step, guarded on "version bump just merged" (the version-only mode outputs),
  runs `npx changeset tag` → `git push --tags` → `gh release create <tag>
  --notes <changelog-entry>` (or softprops/action-gh-release). Tag + Release
  become first-class, not a publish side-effect.
  - Option B (keep `publish:` pointed at a shim that tags + creates release and
    echoes a fake `New tag:`) is closer to skillsmith's surface but carries the
    dummy-echo smell; rejected.
- **Permissions:** DROP `id-token: write` (npm-OIDC only). Keep `contents: write`
  (push tags + create releases) and `pull-requests: write` (open Version PR).
- **Triggers at bootstrap:** Recommend shipping `push: branches: [trunk]` LIVE
  from this PR (optionally + `workflow_dispatch`). Skillsmith staged its trigger
  only because merging would immediately npm-publish (irreversible external side
  effect) — that risk doesn't exist here; worst first-merge case is a harmless
  human-reviewed Version PR. Shipping live matches the issue's "driven by CI"
  goal. (Conservative `workflow_dispatch`-only is defensible but leaves README's
  "no release CI" effectively unchanged — contrary to the issue.)
- **Net flow:** contributors drop changesets → push to trunk auto-opens/updates
  a Version Packages PR (bump + CHANGELOG + sync-version) → maintainer merges →
  CI auto-creates git tag + GitHub Release. No npm anywhere. Replaces README's
  current manual `npm run release:version` local flow.
- **OPEN VERIFICATION GAP (to close in a follow-up Q):** the EXACT
  `changesets/action@v1` output(s) + `if:` condition to distinguish "just opened
  the Version PR" from "Version PR just merged → now tag+release" in version-only
  mode. (Researcher tentatively cited `hasChangesets`; needs nailing down.)
- Sources: skillsmith release.yml via `gh api`; changesets/action README;
  src/run.ts; issues #68, #269, #547; changesets RFC #1689; changesets
  command-line-options docs; cli `tag/index.ts`.

**Q2a — release gating recipe (corrected); Q2b — changelog generator.**

**A2a (SUPERSEDES A1's Option A — the clean answer is `publish: npx changeset
tag`):**
- `changesets/action@v1` exposes outputs `published`, `publishedPackages`,
  `hasChangesets`, `pullRequestNumber`. Its core is a 3-way switch on
  `(hasChangesets, hasPublishScript)` (src/index.ts):
  1. `!hasChangesets && !hasPublishScript` → logs "No changesets… not
     publishing" and **returns early** (does nothing).
  2. `!hasChangesets && hasPublishScript` → **runPublish** (runs the publish cmd).
  3. `hasChangesets` → **runVersion** (opens/updates Version PR, sets
     `pullRequestNumber`).
- **Why version-only + separate gated step is WRONG:** with no publish cmd, the
  Version-PR-merge push hits case 1 and returns early (no tag logic). And a
  separate step gated on `hasChangesets == 'false'` would fire on EVERY
  changeset-free push (docs-only, internal commits), not just the merge.
- **CORRECT canonical pattern — give `publish: npx changeset tag`:**
  - Push WITH pending changesets → case 3 → opens/updates Version Packages PR. No
    tagging.
  - Push that MERGES the Version PR (changesets consumed, version bumped) → case
    2 → runs `npx changeset tag`. The changeset-consumed state IS the signal; no
    separate gating `if:` needed.
  - Any other changeset-free push → also case 2 → `changeset tag` runs but is a
    **no-op when the tag already exists** (checks `allExistingTags`, logs skip).
    Idempotent by design.
- **Tag AND GitHub Release both get created:** `changeset tag` (cli
  tag/index.ts) emits literal `log("New tag: ", tag)` per NEW tag. The action
  parses stdout for `New tag:\s+...@...`, populates `releasedPackages`, sets
  `published=true`, and (since `createGithubReleases` defaults true) creates a
  GitHub Release per matched package with `getChangelogEntry(changelog, version)`
  as the body. So `publish: npx changeset tag` + `privatePackages.tag: true`
  yields BOTH the git tag and the GitHub Release for our private package — no `gh
  release create`, no dummy-echo hack, no gating `if:`.
- **NUANCE 1 (CHANGELOG coupling):** `getChangelogEntry` matches the `## <version>`
  heading in CHANGELOG.md and THROWS if absent. `changeset version` produces that
  heading (both plain and changelog-github), so it works — but the coupling means
  CHANGELOG.md must have the matching version heading.
- **NUANCE 2 (tag NAME format):** `changeset tag` names tags from the package →
  `@automattic/radical-pipelines@<version>` (matches skillsmith's
  `@automattic/skillsmith@x.y.z`). A plain `v<version>` tag is NOT possible via
  this path; it would require dropping the action's publish path for a manual
  `gh release create`. **Recommendation: accept the scoped-name tag** (simplest,
  skillsmith-parity). [Design phase to ratify; flagged as the one real
  user-visible choice in tag naming.]
- **Recommended release.yml core step:**
  ```yaml
  - id: changesets
    uses: changesets/action@v1
    with:
      version: npm run release:version   # changeset version && sync-version
      publish: npx changeset tag         # tags + (via action) GitHub Release; no-op if tag exists
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  ```
  permissions: `contents: write` + `pull-requests: write` only (DROP
  `id-token: write`). Triggers: `push: [trunk]` (+ optional workflow_dispatch).
  KEEP `createGithubReleases` default-true (false also suppresses tag push — #547).
- Sources: action.yml (output names); src/index.ts (3-way switch, early return,
  setOutput); cli tag/index.ts (`log("New tag: ", tag)` + existing-tag skip);
  src/run.ts (`New tag:` regex, createGithubReleases, getChangelogEntry);
  changesets/action #547.

**A2b (ADOPT `@changesets/changelog-github`, with documented local-token caveat):**
- **Adds per entry:** PR link, commit link, and `Thanks [@user](...)!` author
  attribution; linkifies bare `#123` issue refs. (changelog-github
  src/index.ts `getReleaseLine`.)
- **Config required:** `"changelog": ["@changesets/changelog-github", { "repo":
  "Automattic/radical-pipelines" }]`. Omitting `repo` THROWS.
- **Needs `GITHUB_TOKEN` at `changeset version` time:** calls
  `@changesets/get-github-info` `getInfo`, which reads `process.env.GITHUB_TOKEN`
  and THROWS if missing (needs `read:user` + `repo:status` scopes). `commit:false`
  in our config does NOT reliably dodge this — community reports (#940, #1657)
  confirm `changeset version` errors without a token. It calls `dotenv.config()`,
  so a gitignored `.env` with `GITHUB_TOKEN` works locally.
- **devDependency:** add `@changesets/changelog-github` (skillsmith uses `^0.7.0`).
- **CI:** free — `secrets.GITHUB_TOKEN` is auto-provided; the action already
  passes it as env to both version and tag steps. Default workflow token covers
  the needed scopes. Rich entries with zero extra setup.
- **LOCAL `npm run release:version`:** DEGRADED/BROKEN without a token — a
  maintainer running the manual escape hatch needs `GITHUB_TOKEN=<PAT>` in env or
  `.env`. This is a behavior change vs. plain `@changesets/cli/changelog` (which
  needs no token, runs offline). In the CI-driven steady state this friction
  mostly evaporates (CI does the cut), but docs MUST note the local-token
  requirement.
- **Private-repo note:** link resolution works fine with the token; generated
  links are followable only by people with repo access — fine for a
  private/internal repo (audience already has access).
- **Recommendation: ADOPT.** Richer entries are exactly what the prompt floats,
  they make the GitHub Release bodies (generated from the changelog entry, per
  A2a) far more useful, matches skillsmith. Cost: document the manual-local
  escape-hatch token requirement; ensure CI passes `GITHUB_TOKEN` to the version
  step (the action already does).
- Sources: changelog-github src/index.ts (repo-required throw, link/author
  assembly); get-github-info src/index.ts (token read + throw, scopes);
  changesets #940, #1657; skillsmith config.json + package.json.

**Q3a — gate mechanics; Q3b — bot-PR exemption; Q3c — validator .mjs port.**

**A3a (gate source of truth = `changeset status`, gated by a load-bearing
config invariant):**
- Skillsmith's `changeset-gate.yml` (verbatim): `on: pull_request: branches:
  [trunk]` (no explicit `types` → opened/synchronize/reopened); `permissions:
  contents: read, pull-requests: read`; concurrency group on head_ref,
  cancel-in-progress. Job: checkout `fetch-depth: 0` (REQUIRED so
  `--since=origin/<base>` resolves) → setup-node 22 → `npm ci` → step "Validate
  changeset shape" (`npx tsx scripts/validate-changesets.ts`) → step "Require a
  changeset…" (`npx changeset status --since=origin/${{
  github.event.pull_request.base.ref }}`). TWO independent checks.
- **Source of truth for "needs a changeset" = `changeset status` itself, NOT a
  workflow path filter.** Traced: `changeset status` →
  `getVersionableChangedPackages(config, {ref})` → if `changedPackages.length>0
  && changesets.length===0` it prints "Some packages have been changed but no
  changesets were found…" and `process.exit(1)`. `getChangedPackagesSinceRef`
  uses `micromatch(changedPackageFiles, config.changedFilePatterns)`. So the
  proposed `changedFilePatterns` list IS the allowlist and `changeset status`
  honors it natively (incl. glob/`!`-negation semantics via micromatch).
- **LOAD-BEARING INVARIANT — `privatePackages.version: true`:** there is a known
  bug (changesets#863) where `changeset status` exits 0 even when a PRIVATE
  package changed w/o a changeset, because it skips private packages.
  `shouldSkipPackage` skips only when `packageJson.private &&
  !allowPrivatePackages`, and `allowPrivatePackages = config.privatePackages
  .version`. This repo sets `version: true`, so our private package is NOT
  skipped → the gate WORKS. **If anyone flips `privatePackages.version` to false,
  the gate silently becomes a no-op (always green).** Spec must pin this.
- Sources: cli status/index.ts, versionablePackages.ts, git/src/index.ts
  (micromatch), should-skip-package/src/index.ts; changesets#863;
  config-file-options.md.

**A3b (bot-PR exemption — the wrinkle is REAL; add an explicit guard):**
- Version PR head branch = `changeset-release/<baseBranch>` → here
  **`changeset-release/trunk`** (action default
  `changeset-release/{{github.ref_name}}`).
- The wrinkle is real: on the Version PR the pending changesets are
  consumed/deleted, so `changesets.length===0`, while package.json/plugin.json
  (allowlisted) DID change → `changeset status` would EXIT 1 and fire on the
  bot's own PR. Skillsmith's gate has NO explicit exemption — it likely relies on
  the maintainer merging past a non-required failing check; do NOT rely on that.
- **RECOMMENDED: add `if: github.head_ref != 'changeset-release/trunk'` to the
  gate job** (precise — only the release branch). Do NOT blanket-exempt all
  `github-actions[bot]` PRs (that would let Dependabot through ungated). This is
  the prompt's own suggested resolution. **MANDATORY if the gate is a REQUIRED
  status check** (a required failing check blocks the merge button even for
  maintainers). Flag for design: decide whether the gate is a required check
  (ties to the branch-protection question — Q4).
- Sources: changesets/action README + PR #370 (branch name); cli status logic
  (consumed-changeset state).

**A3c (port validator + tests to dependency-free `.mjs`; do NOT add tsx/yaml):**
- Skillsmith's `validateChangesetFile` checks, in order:
  1. **Fence:** must match `/^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/`
     (opening `---` line 1, closing `---`; CRLF tolerated). Else line-1 error
     "missing or unterminated front matter (expected two '---' fences)".
  2. **Canonical empty:** front matter AND body both empty (trimmed) → VALID
     (the `npx changeset --empty` `---\n---` escape hatch). Returns [].
  3. **Non-empty body:** front matter present but body empty → line-4 error
     "empty body (changeset has front matter but no summary)".
  4. **YAML parse:** front matter parsed; parse failure → line-2 "YAML parse
     error"; non-mapping → line-2 "front matter must be a YAML mapping".
  5. **Per entry (name→bump):** name must equal `package.json:name` else line-2
     `unknown package "<name>" (expected "<pkgName>")`; bump ∈
     {patch,minor,major,none} else line-2 `invalid bump "<bump>"`; **pre-1.0
     guard:** version starts "0." AND bump==="major" → line-2 `'major' is
     forbidden while pre-1.0 (version=<v>). Use 'minor' with a 'BREAKING:'
     prefix…`.
  - CLI `main()`: reads name+version from cwd `package.json`, enumerates
    `.changeset/*.md` excluding README.md, prints `.changeset/<file>:<line>:
    <msg>` to stderr, exits 1 if any errors else 0.
- **Test cases to preserve (node:test, like sync-version.test.mjs):** B1 valid
  minor→[]; B2 canonical empty (with/without trailing newline)→[]; B3 missing
  closing fence; B4 invalid bump "superminor"; B5 wrong package name; B6 empty
  body w/ front matter; B7 major pre-1.0 (0.1.0) errors / major at 1.0.0→[];
  CRLF valid→[]; B8 CLI smoke fail (exit 1, stderr matches
  `/\.changeset\/[^:]+:\d+: invalid bump/`, empty stdout) + CLI smoke pass (exit
  0, empty stderr). ADD bare-vs-quoted-key cases.
- **PORT to `.mjs`, dependency-free.** Repo has NO TS toolchain; skillsmith's
  validator needs `tsx` (run .ts) + `yaml` (parse) devDeps. That clashes with
  this repo's convention (sync-version.mjs: "built-in Node modules only; no
  external dependencies"). Gate step becomes `node
  scripts/validate-changesets.mjs` (no tsx).
- **No `yaml` dep needed.** Frontmatter is a trivial one-line `"pkg": bump` map.
  After the (verbatim-portable) fence regex, parse frontmatter by splitting
  lines and matching e.g.
  `/^\s*(?:"([^"]+)"|'([^']+)'|([^:#\s]+))\s*:\s*(\S+)\s*$/` → {name: bump}.
  Covers quoted (as changesets writes) and bare keys; malformed lines → the
  "must be a YAML mapping"/parse-error path. CLI smoke test spawns `node
  …validate-changesets.mjs` with `cwd` = tmpdir — no tsx loader gymnastics.
- **Keep `none` in the valid set** (needed for `--empty`/starter changesets;
  action treats `none` as non-empty → still triggers Version PR). The `--empty`
  hatch writes `---\n---` (no frontmatter) = canonical-empty pass (#2), distinct
  from a `: none` entry; both valid.
- **Pre-1.0 guard active** (repo at 0.1.1). Error message should point at THIS
  repo's docs (README "Changelog and versioning" or a new CONTRIBUTING.md anchor
  — open question: does this repo want a CONTRIBUTING.md like skillsmith, or keep
  policy in README+AGENTS.md? → Q5).
- Sources: skillsmith validate-changesets.ts + .test.ts (verbatim); changesets
  cli status logic; should-skip-package.

**THREE LOAD-BEARING INVARIANTS flagged by researcher:**
1. `privatePackages.version: true` REQUIRED for the gate to function.
2. Bot-PR exemption `if: github.head_ref != 'changeset-release/trunk'` needed
   (mandatory if gate is a required check).
3. Port validator + tests to dependency-free `.mjs`; do NOT introduce tsx/yaml.

**Q4a — prerequisites w/ unprotected trunk; Q4b — gate-as-required-check scope;
Q4c — anti-recursion.**

**A4a (NO branch-protection change required for the happy path — confirmed):**
- (i) Version PR creation: needs "Allow GH Actions to create and approve PRs"
  (ALREADY ENABLED, confirmed live) + `pull-requests: write` (in-workflow).
- (ii) Action committing the bump to `changeset-release/trunk`: `contents:
  write` + GITHUB_TOKEN; bot branch is NEW (not protected), trunk unprotected →
  no branch-protection allowance needed.
- (iii) `changeset tag` pushing tag + creating Release: `contents: write`
  authorizes both ref/tag push AND the Releases API.
- **CONCLUSION: with trunk UNPROTECTED, the end-to-end happy path works with ZERO
  further manual repo-settings changes.** Only repo-level dependency ("Allow GH
  Actions to create/approve PRs") is already on. Everything else is in-workflow
  `permissions` this PR ships.
- Sources: GitHub Docs "Automatic token authentication" (contents:write → push
  refs/tags + Releases; pull-requests:write + Actions setting → Version PR);
  live `gh api` repo state.

**A4b (gate-as-required-check is OUT of scope for this issue — document, don't
enforce):**
- Today trunk is unprotected → NO required checks → the gate runs and reports
  pass/fail but does NOT block merge (advisory).
- **Adding branch protection is NOT in this issue's scope.** The issue's
  deliverables are FILES (workflows, validator, config, docs); branch protection
  is a GitHub repo-SETTING a pipeline cannot commit — inherently a maintainer
  action. Skillsmith treats it the same (CONTRIBUTING lists it as a maintainer
  audit/enable step, not PR-enforced).
- **A3b exemption reclassified:** `if: github.head_ref !=
  'changeset-release/trunk'` is NOT load-bearing TODAY (gate isn't required), but
  **SHIP IT anyway** — free, future-proofs the moment the gate becomes required,
  and stops a confusing red X on the bot's Version PR.
- **THREE-BUCKET prerequisite classification:**
  1. **Already satisfied (no action):** "Allow GH Actions to create/approve PRs"
     (ON); bot can push (trunk unprotected).
  2. **Must be set by maintainer for the flow to WORK: NONE.** (Repo-specific
     win: unlike skillsmith, no npm-OIDC and no blocking PR-setting.)
  3. **Optional hardening to DOCUMENT (not enforce):** branch protection on trunk
     (required reviews + gate as required status check); if added → allow
     github-actions[bot] to push `changeset-release/trunk`, keep human review on
     the Version PR, prohibit self-approval, and the A3b exemption becomes
     MANDATORY. Optionally install `@changesets/bot` App for educational
     non-blocking PR comments.
- **Docs phrasing note:** skillsmith says the PR-creation setting is "Off by
  default in some Automattic-managed repos" — for THIS repo it's already ON, so
  docs should say "verify it's enabled (currently satisfied)", not "enable it".
- skillsmith CONTRIBUTING "Repo configuration prerequisites" to adapt (DROP the
  npm trusted-publisher item entirely): the PR-creation setting; branch
  protection w/ bot push allowance + human review + no self-approval; optional
  `@changesets/bot` App.

**A4c (NO infinite re-trigger; no PAT/App token needed — confirmed):**
- **Guarantee:** GitHub does not start a new workflow run from events triggered
  by GITHUB_TOKEN (except `workflow_dispatch`/`repository_dispatch`) — explicit
  anti-recursion. So the action's commit to `changeset-release/trunk` and
  `changeset tag`'s tag push (both via GITHUB_TOKEN) do NOT re-trigger
  release.yml.
- **The nuance that makes the flow ADVANCE:** the action does NOT auto-merge the
  Version PR — a HUMAN merges it, producing a push to trunk under the HUMAN's
  identity, which DOES re-trigger release.yml. On that run changesets are
  consumed + publish script present → `changeset tag` → tag + GitHub Release.
- **State machine:** contributor merges feature PR (human push, changeset lands)
  → release.yml opens Version PR (bot push, suppressed) → human merges Version PR
  (human push) → release.yml runs `changeset tag` → tag + Release. Every
  state-advancing push is human-initiated; every bot push is suppressed → no
  loop, **no PAT/App token needed** (default GITHUB_TOKEN is exactly right).
- **Edge to note (design):** because GITHUB_TOKEN tag pushes don't trigger
  workflows, a future SEPARATE `push: tags` workflow would NOT fire off the
  release tag. Not relevant now (Release is created in the same run as the tag);
  one-line caveat so nobody later builds a tag-triggered workflow expecting it.
- Sources: GitHub Docs "Triggering a workflow" / "Automatic token
  authentication"; changesets/action README (no auto-merge); community
  discussions #25702/#37103/#65321.

**Q5a — CONTRIBUTING.md?; Q5b — allowlist + README tension; Q5c — CHANGELOG
bootstrap.**

**A5a (ADD a slim, no-npm CONTRIBUTING.md; preserve the doc split):**
- Skillsmith's CONTRIBUTING.md (~180 lines) is heavily npm-flavored (escape
  hatch, deprecate/unpublish/dist-tag rollback, OIDC/provenance, npm dry-run).
- This repo's doc topology: AGENTS.md = terse RULES home (update README + record
  changeset on every change); README "Changelog and versioning" = consumer how-to;
  no CONTRIBUTING.md.
- **RECOMMENDATION: add a SLIM no-npm CONTRIBUTING.md** (not a full port). Put the
  NEW contributor/maintainer mechanics there: when a changeset is required (the
  `changedFilePatterns` rationale + the `--empty` escape for prose-only README
  edits), bump-type guidance, **pre-1.0 policy with a `#pre-10-policy` anchor**
  (validator error points here), how to author (interactive/direct/empty), CI
  gate explanation, release process (Version PR → tag → GitHub Release),
  maintainer prerequisites (A4 bucket 3), and a SLIM recovery section (re-run
  failed job; forgot-a-changeset; local `release:version` + `GITHUB_TOKEN` note
  from A2b). **Replace** skillsmith's "manual publish escape hatch" with a
  "manual RELEASE escape hatch" = `changeset version` + commit + `changeset tag`
  + `gh release create` locally (no npm). DROP all npm sections.
- Preserve the split: AGENTS.md (rules) / README (consumer) / CONTRIBUTING
  (contributor+maintainer mechanics); cross-link, don't duplicate. Mirror
  skillsmith's AGENTS.md pointer to `CONTRIBUTING.md#adding-a-changeset` /
  `#pre-10-policy` once CONTRIBUTING exists.
- Fallback if design wants zero new top-level files: point the validator at a
  README anchor instead. Researcher (and I) lean CONTRIBUTING.md.

**A5b (KEEP the proposed allowlist incl. README.md; document the `--empty`
escape):**
- **micromatch semantics (traced):** single-package repo rooted at repo root →
  `pkg.dir` = root → patterns match against root-relative paths exactly as
  written. `"package.json"` is anchored → matches ONLY root `package.json` (not
  nested, not `package-lock.json`). The prompt's deliberate lockfile exclusion
  holds with no extra negation.
- **List validated against actual layout:** `skills/**` ✅, `agents/**` ✅,
  `.claude-plugin/**` ✅ (covers version-bearing `plugin.json` + `marketplace.json`;
  the bot-edit concern is handled by the A3b bot-branch exemption, NOT by
  excluding the dir), `package.json` ✅ (bare root). Exclusions all correct
  (`website/**`, `scripts/**`, `.pi/`, `.rp/`, `.changeset/`, `.github/`, meta).
  List is COMPLETE and CORRECT for the current root-served structure; no wrongly
  included entries; no `.pi-extension/` pattern needed (dir doesn't exist).
- **README.md tension — KEEP IT.** AGENTS.md mandates README updates on every
  code change, so README.md is in nearly every PR diff. Including it in the
  allowlist makes the CI gate ENFORCE what AGENTS.md already mandates (every
  change → changeset) — alignment, not a false positive. The ONE real caveat
  (prose-only README typo PRs with no code change) is solved by the documented
  `npx changeset --empty` escape hatch (the validator's canonical-empty case),
  NOT by excluding README — you cannot path-discriminate prose vs. contract
  within one file. Skillsmith does exactly this ("gate fires on the whole file;
  cosmetic prose-only edits use the empty-changeset escape"). Docs MUST document
  the escape. Fallback if `--empty` friction proves annoying: drop README.md and
  rely on AGENTS.md's social rule (weaker CI enforcement) — recommend keep-it.

**A5c (let `changeset version` create CHANGELOG.md fresh at 0.2.0; no
bootstrapping blocker):**
- Current state: NO CHANGELOG.md. Two pending NON-README changesets:
  `changelog-and-version-sync.md` (minor) + `restructure-repository-layout.md`
  (minor). (`.changeset/README.md` is the cheat-sheet, ignored.)
- First `changeset version`: CREATES CHANGELOG.md from scratch (H1
  `# @automattic/radical-pipelines`, H2 `## <version>`, `### Minor Changes`).
  Highest bump = minor → **0.1.1 → 0.2.0**; both entries roll into one
  `## 0.2.0` section. sync-version then propagates 0.2.0 to plugin.json.
- `getChangelogEntry(changelog, version)` scans headings
  (`/^(#{1,6})\s(.*)$|^(\`{3,})/gm`) and finds the `## 0.2.0` heading the same
  run produced → GitHub Release body works on first run. No special-casing; would
  only throw if the heading were absent (can't happen).
- Notes: first GitHub Release will be **0.2.0** (not 0.1.x), body = the two minor
  entries. With changelog-github (A2b), the FIRST `release:version` run
  especially needs `GITHUB_TOKEN` present (CI provides it) since it tries to
  enrich the pre-existing changesets' commits — intersects the A2b local-token
  caveat precisely on the first run.
- No seeded-CHANGELOG requirement. **Recommend: let it create fresh at 0.2.0**
  (simpler; the two pending changesets are real content). Fallback: seed a
  `## 0.1.1` baseline entry. Design choice.

**THREE DESIGN-CHOICE FLAGS from A5 (with recommendations):**
1. Slim no-npm CONTRIBUTING.md (recommended) vs. README-anchor-only.
2. Keep README.md in allowlist + document `--empty` escape (recommended) vs.
   drop it.
3. Let first release create CHANGELOG.md fresh at 0.2.0 (recommended) vs. seed a
   0.1.1 baseline.

**Q&A COMPLETE — proceeding to Consolidated Requirements.**

## Research

### Baseline groundwork from spec-researcher (before Q&A)

**Skillsmith source (PR #41, merged):** Researcher has full text of
`changeset-gate.yml`, `release.yml`, `.changeset/config.json`,
`scripts/validate-changesets.ts` + its unit/CLI tests, `CONTRIBUTING.md`,
`.changeset/README.md`, `CHANGELOG.md`, package.json scripts/devDeps. Notable:
- `release.yml` shipped **workflow_dispatch-only at bootstrap** (push:trunk
  added in a later follow-up PR).
- Uses `changesets/action@v1` with the inverted-ternary publish guard.
- Publishes to npm via OIDC (NOT applicable here — radical-pipelines is private).
- Gate uses `npx changeset status --since=origin/<base.ref>` plus the shape
  validator.

**Target repo (this worktree):** confirms pre-Q&A facts. devDep is
`@changesets/cli` ONLY (no `changelog-github`, no `tsx`/`yaml`). No
`changedFilePatterns` yet. `sync-version.mjs` targets only
`.claude-plugin/plugin.json`; `.pi-extension/package.json` does NOT exist
post-restructure (prompt constraint is stale).

**Live repo-settings findings (via `gh api`):**
- Actions workflow permissions: `default_workflow_permissions=write`,
  `can_approve_pull_request_reviews=true` → "Allow GH Actions to create and
  approve PRs" is **ALREADY enabled**.
- Branch `trunk` is currently **NOT protected** (404 from branch-protection API).

### Per-question research

The per-question findings (A1–A5) are recorded inline under `## Q&A` above, each
with its sources. They are the authoritative research record for this spec.

## Consolidated Requirements

This section is the hand-off contract for the design phase. Requirements are
grouped; each is testable. "MUST" = required for the issue to be done; "SHOULD" =
strong recommendation with a noted fallback; "DESIGN CHOICE" = a decision left to
the design phase with a recommended default. Open design choices are listed last.

### A. Scope & goal

- **R1 (MUST).** Deliver CI-driven release automation for this repo so that
  release-relevant changes flow from changesets → version bump → generated
  `CHANGELOG.md` → git tag → GitHub Release, plus a PR-time changeset gate. This
  is the follow-up to the changeset foundation already landed (#81/#82).
- **R2 (MUST — no npm, ever).** The release process MUST NOT include npm
  publishing or npm OIDC/trusted-publishing. The package is `private: true` and
  consumed direct-from-git (Pi package + Claude Code plugin via marketplace
  `source: "./"`). No `id-token: write` permission anywhere.
- **R3 (MUST — preserve sync-version).** `scripts/sync-version.mjs` and the
  `release:version` script (`changeset version && node scripts/sync-version.mjs`)
  MUST keep working unchanged. sync-version targets ONLY
  `.claude-plugin/plugin.json` (its sole `TARGET_MANIFESTS` entry). The prompt's
  reference to `.pi-extension/package.json` is STALE — that path does not exist
  post-restructure; do NOT add it. (Settled before Q&A; corroborated both sides.)
- **R4 (MUST).** Build on the existing `.changeset/config.json` +
  `@changesets/cli` foundation; do not re-litigate it.

### B. Changeset gate (`.github/workflows/changeset-gate.yml`)

- **R5 (MUST).** Add a `changeset-gate.yml` workflow triggered on
  `pull_request` targeting `trunk` (default activity types
  opened/synchronize/reopened). Permissions: `contents: read`,
  `pull-requests: read`. Use checkout with `fetch-depth: 0` (REQUIRED so
  `--since=origin/<base>` resolves) and setup-node with `npm ci`.
- **R6 (MUST).** The gate runs TWO independent checks:
  (a) the shape validator (R10–R12), and
  (b) `npx changeset status --since=origin/${{ github.event.pull_request.base.ref
  }}`, which fails the PR when a release-relevant change has no changeset.
- **R7 (MUST — load-bearing config invariant).** `.changeset/config.json` MUST
  keep `privatePackages.version: true`. The gate ONLY functions because of this;
  if it were `false`, `changeset status` would silently skip the private package
  and the gate would always pass (changesets#863). The spec pins this as an
  invariant; any change to it breaks the gate.
- **R8 (MUST).** Set `.changeset/config.json` `changedFilePatterns` to the
  allowlist (this is the gate's source of truth; `changeset status` honors it
  natively via micromatch against root-relative paths in this single-package
  repo):
  ```json
  "changedFilePatterns": [
    "skills/**",
    "agents/**",
    ".claude-plugin/**",
    "package.json",
    "README.md"
  ]
  ```
  `"package.json"` is anchored (matches only root `package.json`, NOT
  `package-lock.json`, NOT nested). Deliberately excluded (internal/non-shipped):
  `website/**`, `scripts/**`, `.pi/`, `.rp/`, `.changeset/`, `.github/`, and meta
  files (`.rp.md`, `package-lock.json`, `AGENTS.md`, `LICENSE`, `.gitignore`). No
  `!`-negations needed (no tests nested in product dirs). List validated complete
  and correct against the actual layout.
- **R9 (SHOULD — bot-PR exemption).** Add `if: github.head_ref !=
  'changeset-release/trunk'` to the gate job to exempt the Changesets "Version
  Packages" PR (whose branch is `changeset-release/trunk`), which otherwise trips
  the gate (it edits `package.json`/`plugin.json` while the changesets it
  consumes are deleted → zero changesets). Scope to the release branch ONLY (do
  NOT blanket-exempt all `github-actions[bot]` PRs — Dependabot must stay gated).
  Not load-bearing TODAY (gate is advisory; trunk unprotected) but ship it: it is
  free, future-proofs the gate becoming a required check, and avoids a confusing
  red X on the Version PR. BECOMES MANDATORY if the gate is made a required
  status check.

### C. Changeset shape validator (`scripts/validate-changesets.mjs` + test)

- **R10 (MUST — dependency-free `.mjs` port).** Port skillsmith's
  `validate-changesets.ts` to `scripts/validate-changesets.mjs`, plain Node ESM,
  built-in modules only — matching the repo convention (`sync-version.mjs`). Do
  NOT introduce `tsx` or `yaml` devDeps. The gate step is `node
  scripts/validate-changesets.mjs`. Frontmatter is parsed dependency-free (a
  trivial one-line `"pkg": bump` map; no general YAML parser needed).
- **R11 (MUST — validator checks, in order).**
  1. Fence: match `/^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/`
     (CRLF-tolerant); else line-1 "missing or unterminated front matter (expected
     two '---' fences)".
  2. Canonical empty: front matter AND body both empty → VALID (the `changeset
     --empty` `---\n---` case).
  3. Non-empty body: front matter present but body empty → line-4 "empty body…".
  4. Front matter must parse as a mapping; else line-2 "YAML parse error" /
     "front matter must be a YAML mapping".
  5. Per entry: name MUST equal `package.json:name`
     (`@automattic/radical-pipelines`) else line-2 `unknown package "<name>"`;
     bump ∈ {patch, minor, major, none} else line-2 `invalid bump "<bump>"`;
     pre-1.0 guard: version starts "0." AND bump === "major" → line-2 `'major' is
     forbidden while pre-1.0 (version=<v>)` referencing the docs anchor (R18).
  - CLI: read name+version from cwd `package.json`, enumerate `.changeset/*.md`
    excluding `README.md`, print `.changeset/<file>:<line>: <msg>` to stderr,
    exit 1 if any errors else 0.
  - Keep `none` in the valid set (needed for `--empty`/starter changesets;
    `changeset version`/action treats `none` as non-empty).
- **R12 (MUST — tests).** Add `scripts/test/validate-changesets.test.mjs` using
  `node:test` (like `sync-version.test.mjs`), porting cases B1–B8 + CRLF (valid
  minor; canonical empty with/without trailing newline; missing closing fence;
  invalid bump; wrong package name; empty body; pre-1.0 major rejected & major at
  1.0.0 accepted; CLI smoke fail exit-1 + pass exit-0). ADD cases for bare-vs-
  quoted frontmatter keys. CLI smoke spawns `node scripts/validate-changesets.mjs`
  with `cwd` = tmpdir (no tsx loader gymnastics).

### D. Release workflow (`.github/workflows/release.yml`)

- **R13 (MUST — release model).** Use `changesets/action@v1` with BOTH:
  `version: npm run release:version` and `publish: npx changeset tag`. Do NOT use
  `changeset publish` (it skips private packages → no tag, no Release —
  changesets#68/#1689). Do NOT use a dummy-`echo "New tag:"` shim. Env:
  `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
  - On a push WITH pending changesets → action opens/updates the "Version
    Packages" PR (runs `release:version`: bump + CHANGELOG + sync-version).
  - On the push that MERGES the Version PR (changesets consumed) → action runs
    `npx changeset tag`, which (with R14) creates the git tag, emits `New tag:`,
    and the action then creates the GitHub Release with the changelog entry as
    the body. `changeset tag` is idempotent (no-op if the tag already exists), so
    it is safe on any changeset-free push.
- **R14 (MUST).** Set `.changeset/config.json` `privatePackages.tag: true` so
  `changeset tag` tags the private package (`allowPrivatePackages =
  privatePackages.tag`). KEEP `createGithubReleases` at its default (true);
  setting it false also suppresses tag pushes (changesets/action#547).
- **R15 (MUST — permissions).** release.yml permissions: `contents: write` (push
  the version-bump commit, the tag, and create the GitHub Release) and
  `pull-requests: write` (open the Version PR). DROP `id-token: write`.
- **R16 (SHOULD — triggers).** Ship `release.yml` with `push: branches: [trunk]`
  LIVE from this PR (optionally plus `workflow_dispatch` for manual re-runs).
  Unlike skillsmith (which staged the trigger to avoid an immediate npm publish),
  there is no irreversible external side-effect here — worst first-merge case is a
  harmless, human-reviewed Version PR — and shipping live is required to satisfy
  the issue's "driven by CI rather than hand edits" goal. Fallback (conservative):
  `workflow_dispatch`-only, but that leaves README's "no release CI" effectively
  unchanged, contrary to the issue.
- **R17 (MUST — no auto-merge / no recursion; document the guarantee).** The
  action does NOT auto-merge the Version PR; a human merges it. Bot/GITHUB_TOKEN
  pushes (the version-bump commit, the tag) do NOT re-trigger workflows (GitHub
  anti-recursion), while the human merge of the Version PR DOES re-trigger
  release.yml to run the tag step. The flow therefore cannot infinitely
  re-trigger, and NO PAT or GitHub App token is needed. The spec records this as
  a guarantee, and that GITHUB_TOKEN tag pushes will not fire any future
  `push: tags` workflow (none exists today).

### E. Changelog generator

- **R18 (SHOULD — adopt `@changesets/changelog-github`).** Switch
  `.changeset/config.json` `changelog` from `@changesets/cli/changelog` to
  `["@changesets/changelog-github", { "repo": "Automattic/radical-pipelines" }]`
  (the `repo` option is REQUIRED or it throws), and add
  `@changesets/changelog-github` as a devDependency (skillsmith uses `^0.7.0`).
  This adds PR links + commit links + author attribution to each entry, which
  also enriches the GitHub Release bodies (generated from the changelog entry).
  - CI cost: zero — `secrets.GITHUB_TOKEN` is auto-provided and already passed to
    the action's version+tag steps; default token scopes suffice.
  - LOCAL cost (MUST document): `changeset version` (and thus a local `npm run
    release:version`) THROWS without `GITHUB_TOKEN` in env or a gitignored `.env`.
    Docs MUST state the manual-local escape hatch requires `GITHUB_TOKEN`.
  - Fallback: keep plain `@changesets/cli/changelog` (no token, offline) if the
    local-token friction is judged unacceptable. Recommend adopting.

### F. Documentation (issue deliverable)

- **R19 (MUST — README rewrite).** Update README's "Changelog and versioning"
  section: it currently states release is "an operator-run local action, not CI"
  with "no git tags, and no release CI". Rewrite to describe the new CI-driven
  flow (contributor changesets → Version PR → maintainer merge → CI tag + GitHub
  Release), still with no npm. (AGENTS.md mandates README track every change.)
- **R20 (DESIGN CHOICE — recommended: add a slim, no-npm CONTRIBUTING.md).**
  Add `CONTRIBUTING.md` containing the new contributor/maintainer mechanics:
  when a changeset is required (the `changedFilePatterns` rationale + the
  `changeset --empty` escape for prose-only README edits), bump-type guidance,
  the pre-1.0 policy under a `#pre-10-policy` anchor (R11's validator message
  links here), how to author a changeset, the CI gate explanation, the release
  process, the maintainer prerequisites (G/R21), a slim recovery section, and a
  "manual RELEASE escape hatch" (`changeset version` + commit + `changeset tag` +
  `gh release create`, with the `GITHUB_TOKEN` note from R18). DROP all
  npm-specific sections from skillsmith's version. Preserve the doc split:
  AGENTS.md = rules, README = consumer, CONTRIBUTING = contributor/maintainer
  mechanics; cross-link, don't duplicate; update AGENTS.md's changeset pointer to
  target the new anchors. Fallback: keep policy in README + AGENTS.md and point
  the validator message at a README anchor instead.
- **R21 (MUST — document maintainer prerequisites, do NOT enforce).** Document
  (in CONTRIBUTING/README) the prerequisite buckets. Phrase the
  already-satisfied items as "verify enabled (currently satisfied)":
  - Already satisfied: "Allow GH Actions to create and approve PRs" (enabled);
    bot can push (trunk unprotected).
  - Must-do for the flow to work: NONE (happy path works as-is).
  - Optional hardening (document, do not enforce — branch protection is a repo
    SETTING a pipeline cannot commit; out of this issue's file-deliverable
    scope): branch protection on trunk with required reviews + the gate as a
    required status check; if added, allow `github-actions[bot]` to push
    `changeset-release/trunk`, keep human review on the Version PR, prohibit
    self-approval, and R9's exemption becomes mandatory. Optional
    `@changesets/bot` GitHub App for non-blocking educational PR comments.

### G. First release / bootstrapping

- **R22 (MUST-aware; recommended: no seeding).** There is no `CHANGELOG.md` yet
  and two pending minor changesets (`changelog-and-version-sync.md`,
  `restructure-repository-layout.md`). The first release will create
  `CHANGELOG.md` fresh and bump 0.1.1 → **0.2.0**, with both entries under a
  `## 0.2.0` heading; `getChangelogEntry` finds that heading for the Release
  body on the first run (no special-casing). Recommend letting it create fresh
  (don't seed a `## 0.1.1` baseline). With R18 adopted, the FIRST
  `release:version` run especially must have `GITHUB_TOKEN` present (CI provides
  it).

### H. Out of scope / non-goals

- N1. npm publishing / OIDC / provenance / registry rollback — excluded (R2).
- N2. Changing `sync-version.mjs` targets or adding `.pi-extension/` — excluded
  (R3); the prompt's mention of it is stale.
- N3. Enabling/modifying branch protection or required checks as part of this PR
  — out of scope; documented as optional maintainer hardening (R21).
- N4. Re-litigating the changeset foundation (#81/#82) — excluded (R4).
- N5. Custom `vX.Y.Z` tag names — out of scope; tags are the scoped
  `@automattic/radical-pipelines@<version>` form `changeset tag` produces (the
  one DESIGN CHOICE below if the team wants otherwise).

### I. Open design choices (recommendation in parentheses)

- DC1. Tag NAME format: scoped `@automattic/radical-pipelines@<version>` from
  `changeset tag` (recommended, skillsmith-parity) vs. plain `v<version>` (would
  require dropping the action's publish path for a manual `gh release create`).
- DC2. `CONTRIBUTING.md` (recommended) vs. README-anchor-only for the pre-1.0
  policy + mechanics (R20).
- DC3. Keep `README.md` in `changedFilePatterns` + document the `--empty` escape
  (recommended) vs. drop it and rely on AGENTS.md's social rule (R8/R9 caveat).
- DC4. Let the first release create `CHANGELOG.md` fresh at 0.2.0 (recommended)
  vs. seed a `## 0.1.1` baseline entry (R22).
- DC5. Adopt `@changesets/changelog-github` (recommended) vs. keep plain
  `@changesets/cli/changelog` to avoid the local-token requirement (R18).
- DC6. Make the gate a required status check via branch protection — explicitly
  deferred to a maintainer (R21); if chosen, R9's exemption becomes mandatory.

### J. Load-bearing invariants (must survive into design/code)

1. `.changeset/config.json` `privatePackages.version: true` (gate functions only
   with this) — R7.
2. `.changeset/config.json` `privatePackages.tag: true` (tags the private
   package) — R14.
3. release.yml uses `publish: npx changeset tag`, NOT `changeset publish` — R13.
4. Validator + tests are dependency-free `.mjs`; no `tsx`/`yaml` — R10.
5. No `id-token: write`; release.yml needs `contents: write` +
   `pull-requests: write` — R15.
6. `sync-version.mjs` behavior unchanged; sole target `.claude-plugin/plugin.json`
   — R3.
