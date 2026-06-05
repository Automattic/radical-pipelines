# Design Doc Review — APPROVED

**Issue:** 83 — Automate releases with GitHub Actions (changeset gate + release workflow)
**Artifact reviewed:** `2-design-doc/design-doc.md` (committed at 9e7a9b4)
**Reviewer:** design-doc-reviewer
**Verdict:** APPROVED
**Rejection iteration N:** n/a (first review, approved)

## Summary

The design doc is sound, feasible, internally consistent, and standalone. It fully
covers the spec (R1–R22, acceptance criteria 1–17, N1–N5) and carries the
load-bearing invariants J1–J7. The two deliberately-corrected points (bare `@`-key
rejection, `v<version>` tag name) are handled correctly and I verified them
empirically against the real tooling rather than taking them on trust. Every
load-bearing external claim I could check resolved in the design's favor.

## Architecture soundness and feasibility

Two workflows partitioned cleanly by event type (`pull_request` gate vs. `push`
release) with no cross-trigger or double-fire — confirmed: a PR merge is a push,
not a `pull_request` event, so the gate does not run on merges and the release
workflow does not run on PR open/sync. The anti-recursion argument (R17) rests on
the documented GitHub behavior that `GITHUB_TOKEN`-driven pushes do not re-trigger
workflows, plus the human Version-PR merge being the only event that advances to
the tag/Release step; the action never auto-merges. The least-privilege permission
set (`contents: write` + `pull-requests: write`, no `id-token`) is correct and
matches R2/R15. Concurrency choices (cancel-in-progress on the disposable gate;
no-cancel serialization on the release to avoid an orphan tag) are well-reasoned.

## Spec coverage

The requirement→design matrix (§12) maps every R1–R22, N1–N5, and AC1–17 to a
concrete section. Spot-checking the load-bearing ones:

- **R7/R8 (gate actually enforces):** `changedFilePatterns` is the exact R8
  allowlist with an anchored `package.json` that does not match
  `package-lock.json` or nested manifests; `privatePackages.version: true` is kept
  so `changeset status` is not blind. Verified in CLI source (below).
- **R10/R11/R12 (validator):** dependency-free `.mjs` using only `node:fs`,
  mirroring `sync-version.mjs`; the fence regex, entry regex, check order, line
  numbers, messages, and full test matrix are all specified concretely. Verified
  the regexes behave as claimed (below).
- **R14 (tag + Release, private, idempotent):** `privatePackages.tag: true`,
  `publish: npx changeset tag` (never `changeset publish`), default
  `createGithubReleases: true`. Tag-name logic and idempotency confirmed in source.
- **R18/R22 (richer changelog + first-release token):** `changelog-github` with
  required `repo`; CI gets the token via the action's env propagation into the
  version subprocess; local runs need a token (documented). Graceful degradation on
  unresolvable commits confirmed in source, so the first release cannot throw in CI.
- **R19/R20/R21 (docs):** three stale "no git tags / no release CI" surfaces
  (README, `.changeset/README.md`, `AGENTS.md`) are all identified as edit targets;
  a slim no-npm `CONTRIBUTING.md` is the authoritative home; prerequisite buckets
  use the correct "verify enabled (currently satisfied)" phrasing.

## The two corrected points — verified empirically

These were the points I was asked to scrutinize. Both corrections are right.

**ST1 — bare `@`-key is rejected; both quoted styles accepted.** I ran the real
`@changesets/parse` against the three forms:
- bare `@automattic/radical-pipelines: minor` → **throws** "could not parse
  changeset - invalid YAML in frontmatter".
- `"@automattic/radical-pipelines": minor` → parses OK.
- `'@automattic/radical-pipelines': minor` → parses OK.

So the spec prose "must accept both bare and quoted keys" is indeed technically
inaccurate for an `@`-scoped name, and the design's decision (§6.3 / D3.3) to
accept both quoted styles and reject the bare `@`-key is the only behavior that
matches what the release pipeline can actually consume. I also ran the design's
proposed `ENTRY_RE`: it accepts both quoted `@`-keys, rejects the bare `@`-key,
accepts a bare non-`@` key (which then fails the unknown-package check), and
rejects YAML lists/scalars — exactly as §6.2/§6.3 describe.

**ST2 — tag is `v<version>`, not the scoped form.** Confirmed directly in the
installed `@changesets/cli@2.31.0` source: the tag is computed as
`tool !== "root" ? \`${name}@${newVersion}\` : \`v${newVersion}\``. This repo is a
bare single-package repo (no `workspaces`), so `tool === "root"` and the tag is
`v<version>`. The design accepts the tool default (no custom naming work), so N5's
intent holds while its prose is corrected. Sound.

## Other technical claims verified against the live repo / tooling

- **Repo facts** match the design: `package.json` (`@automattic/radical-pipelines`,
  `private: true`, `0.1.1`, sole `release:version` script, `@changesets/cli` only
  devDep), `.changeset/config.json` (`changelog: "@changesets/cli/changelog"`,
  `commit: false`, `access: "restricted"`, `baseBranch: "trunk"`,
  `privatePackages: { version: true, tag: false }`, no `changedFilePatterns`),
  `scripts/sync-version.mjs` (`TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`,
  the export + `isMainModule()` shape the validator must mirror),
  `scripts/test/sync-version.test.mjs`, `.gitignore` = only `node_modules/`,
  `.github/workflows/` = only `deploy-website.yml`, the two pending minor
  changesets (both double-quoted key form), and the three stale doc surfaces.
- **Config schema 3.1.4** already defines both `changedFilePatterns` and
  `privatePackages` → no `$schema` bump needed (confirmed by fetching the schema).
- **`tag:true ⟹ version:true` is enforced** (J2 mutual-reinforcement): confirmed in
  `@changesets/config` source — `version === false && tag === true` throws
  "The `privatePackages.tag` option is set to `true` but `privatePackages.version`
  is set to `false`. This is not allowed." So the gate cannot be silently disabled.
- **`changelog-github@^0.7.0`** resolves to 0.7.0 and pulls `get-github-info` +
  `dotenv` transitively; `repo` is required (throws otherwise); `dotenv.config()`
  runs at module load (so a gitignored `.env` works locally); `getReleaseLine`
  returns `{ commit: null, pull: null, user: null }` with no commit (no throw,
  satisfying R22's no-throw-in-CI claim).
- **GitHub settings (R21 Bucket 1):** `default_workflow_permissions=write`,
  `can_approve_pull_request_reviews=true`, and trunk has no branch protection —
  exactly the "currently satisfied" / "unprotected" state the design documents.
- **`npm test` script form:** confirmed on node v22.21.1 that the bare-dir form
  `node --test scripts/test/` fails with MODULE_NOT_FOUND (exit 1) while the chosen
  quoted glob `node --test 'scripts/test/**/*.test.mjs'` runs only the `.test.mjs`
  files and ignores helpers. Δ2 is justified.
- **Fence regex** behaves as §6.1 claims for empty (with/without trailing newline),
  normal, CRLF, and missing-fence inputs.

## Standalone and actionable

The doc is self-contained (no need to open the research log): it carries the full
file inventory (new + edited + explicitly-untouched), concrete YAML for both
workflows, the validator's regexes/check-order/messages/export surface, the full
test matrix, the exact config deltas, the documentation outline, and three explicit
plan deltas (Δ1 lockfile resync, Δ2 test-script form, Δ3 `.gitignore` `.env`). The
plan phase can act on it directly.

## Minor, non-blocking observations (no action required)

- §8.1's CONTRIBUTING exclusion list summarizes the spec's full R8 meta-file set
  (`.rp.md`, `LICENSE`, `AGENTS.md`, `.gitignore`, `package-lock.json`) as "meta
  files". Because `changedFilePatterns` is an allowlist, anything not matching is
  excluded automatically, so the design is correct; the docs phase may simply want
  to enumerate the meta files for reader clarity. Not a design defect.
- The "body present but empty front matter" case (`---\n---\nBody.\n`) is not
  canonical-empty (g2 non-empty) and falls to the non-mapping check (line 2) — a
  consistent, sensible outcome. Worth a test case but the §7 matrix already
  exercises the adjacent cases; optional.

## Verdict

APPROVED. The architecture is correct, the spec is fully and faithfully covered,
the two known correctness points are handled exactly right (and independently
verified against the real parser, CLI, config, and changelog-github source), and
the document is standalone and ready for the plan phase.
