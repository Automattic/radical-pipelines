# Design research — Issue #81: Changelog with Changesets + version sync

This document records the design investigation for the work specified in
`../1-spec/spec.md`. It settles the design-shaping decisions the spec left open
(D1, D2, D3, and the propagation mechanism), traces each decision to a spec
requirement / acceptance criterion, and captures options, trade-offs,
rationale, open questions, and risks. The downstream `design-doc-writer`
synthesizes the design doc from this material.

## Inputs and grounding

- **Spec (authoritative intent):** `../1-spec/spec.md` (R1–R13, AC1–AC9).
- **Spec research:** `../1-spec/spec-research.md` (Q1–Q3 + consolidated R1–R15,
  open decisions D1–D3).
- **Working tree (verified on disk, this worktree):**
  - Root `package.json:3` → `0.1.1`, `name @automattic/radical-pipelines`,
    `"private": true`, **no `scripts` block**.
  - `.claude-plugin/plugin.json:3` → `0.1.0`.
  - `.pi-extension/package.json:3` → `0.1.0`,
    `name @automattic/radical-pipelines-pi`, has `bundledDependencies`.
  - `.pi-extension/package-lock.json` → top-level `version` `0.1.0`
    (lines 3 and 9), `lockfileVersion: 3`.
  - No `.changeset/`, no `CHANGELOG.md`, no `scripts/` directory.
  - Pipeline has a **Docs phase** (agents `doc-writer.md`, `doc-plan-writer.md`,
    `doc-reviewer.md`, `doc-plan-reviewer.md`) that owns documentation output —
    relevant to D2.

> Note: the current on-disk drift is exactly root `0.1.1` / plugin `0.1.0` /
> pi-extension `0.1.0` / lockfile `0.1.0`, matching the spec's stated pre-work
> state (AC7). The drift correction target is `0.1.1` (R11).

## Design topics (status)

All five topics are SETTLED. (Sections below appear in the order they were
recorded — T1, T3, T4, T2, T5 — not numeric order.)

- **T1 — Propagation mechanism** (sync script vs. wrapped `changeset version`):
  SETTLED → custom zero-dep ESM sync script + non-`version` npm run-script
  chaining `changeset version` → sync → `--package-lock-only`.
- **T2 — D1** (version step local/manual vs. Changesets CI action): SETTLED →
  local/manual (also fixed by spec Out-of-Scope).
- **T3 — D2** (which pipeline phase authors the changeset): SETTLED → Docs phase
  (phase 5) authors it; the version step that consumes it is a separate operator
  action.
- **T4 — D3** (changelog formatter): SETTLED → default `@changesets/cli/changelog`
  (changelog-github hard-aborts the tokenless local version step).
- **T5 — One-time drift correction to `0.1.1`** (sequencing and method): SETTLED
  → run the sync mechanism once at root `0.1.1`, before the first
  `changeset version`.

---

## T1 — Propagation mechanism (settled)

**Decision:** A **custom, zero-dependency ESM Node sync script** (e.g.
`scripts/sync-version.mjs`) reads the root `package.json` version and writes it
into `.claude-plugin/plugin.json` and `.pi-extension/package.json`; the
`.pi-extension` lockfile is then regenerated **in place** with
`npm install --package-lock-only` run in `.pi-extension/`. The whole version
step is chained as a **single npm run-script named NOT `version`** (to avoid an
npm lifecycle name collision) — e.g.
`"release:version": "changeset version && node scripts/sync-version.mjs && npm --prefix .pi-extension install --package-lock-only"`.

**Traces to:** R7 (identical version across the three files), R8 (automatic
propagation as part of the version step), R9 (lockfile stays in sync), AC4, AC5.

**Evidence — all verified hands-on by the researcher** (node v22.21.1, npm
10.9.4, in a throwaway sandbox; tracked files left clean):

1. **No first-class Changesets feature can do this.** Changesets only mutates
   `version` (and internal dep ranges) in packages it manages and writes
   `CHANGELOG.md` via changelog-functions; changelog-functions return Markdown
   strings only and **cannot write arbitrary JSON files** like `plugin.json` or
   the lockfile. A custom sync step is genuinely required (option (c)
   eliminated).
2. **`changeset version` does NOT fire npm's version lifecycle** (re-confirmed
   live: a bump 0.1.1→0.1.2 ran and wrote CHANGELOG.md while printing none of
   the `preversion`/`version`/`postversion` probes). So a naive npm
   `version`/`postversion` hook must NOT be relied on (matches spec R8's caveat).
3. **Zero-noise JSON rewrite is achievable with plain Node.** All four JSON
   files use 2-space indent + trailing `\n`, and
   `JSON.parse(file)` → `JSON.stringify(obj, null, 2) + "\n"` **round-trips
   byte-identical** for both `plugin.json` and `.pi-extension/package.json`
   (verified `round === orig` → true). So the sync script needs **no
   format-preserving dependency** — pure `fs` + `JSON`. The repo is
   `"type": "module"`, so the script is ESM (`import`).
4. **Sync script shape:** read root `package.json` → `JSON.parse` → take
   `.version`; for each target: read → parse → set `.version` →
   `writeFileSync(JSON.stringify(obj, null, 2) + "\n")`. It must treat the root
   version as the single source of truth and never compute its own bump — making
   it **idempotent and re-runnable** (this is also what enables the T5 drift
   correction to reuse it).
5. **Lockfile regeneration — `npm install --package-lock-only` in
   `.pi-extension/` is the winner.** With the version already bumped in
   `.pi-extension/package.json` and the EXISTING lockfile in place, it changed
   **exactly the two top-level version lines** (`:3` and `:9`), nothing else:
   identical line count (4162), `bundleDependencies` block and all `inBundle`
   entries untouched, no formatting drift, ~0.3s. It did **not** hit the registry
   ("up to date") because every dep is integrity-pinned in the lockfile, and it
   created **no `node_modules`**. Adding `--offline` makes the no-network
   guarantee explicit and yields the identical 2-line diff.
   - **CRITICAL failure mode:** this only works as an **in-place** edit. If the
     lockfile is DELETED first and regenerated with `--package-lock-only
     --offline`, it FAILS with `ENOTCACHED` (must re-resolve every dep from the
     registry). So the design must do an **in-place version edit, never a
     from-scratch regen.** Plain `npm install` (no flag) is wrong here — it
     builds `node_modules` with no benefit.

**npm run-script NAME collision (important footgun):** npm fires
`pre<name>`/`post<name>` around ANY `npm run <name>`, not just lifecycle names.
Verified live: naming the wrapper `"version"` caused `npm run version` to run
`preversion`→`version`→`postversion`. Today there are no pre/post scripts so
nothing breaks, but **naming it `"version"` is a latent footgun** (a future
`preversion`/`postversion` would fire unexpectedly). Use a non-colliding name
like `"release:version"`. Root currently has **no `scripts` block at all**, so
this work adds one.

**Ordering / atomicity (single invocation):**
1. `changeset version` — consume `.changeset/*.md` → bump root `package.json`
   + write/update `CHANGELOG.md` → delete consumed changeset files.
2. `node scripts/sync-version.mjs` — copy root version into `plugin.json` +
   `.pi-extension/package.json`.
3. `npm install --package-lock-only` in `.pi-extension/` — sync lockfile `:3`/
   `:9`.

Chain with `&&` so any non-zero exit aborts the rest (fail-fast, prevents
partial application).

**Failure modes & guards:**
- (i) Operator runs step 1 alone → silent drift. **This is literally how the
  repo reached its current `0.1.0`-vs-`0.1.1` state.** Guard: bundle all three
  steps into ONE script command so step 1 cannot be run in isolation.
- (ii) The sync script reading root as the single source of truth makes it
  idempotent/re-runnable.
- (iii) `&&` is fail-fast but not transactional (no rollback). The real backstop
  against an inconsistent COMMITTED state is a **CI drift-check** that asserts
  `plugin.json.version === .pi-extension/package.json.version === root version
  === lockfile top-level versions`, failing the build on mismatch. **NOTE for
  the writer:** a *read-only* drift-CHECK in CI is NOT the same as a Changesets
  release action and does NOT violate AC9 / the "no release CI" out-of-scope
  rule (it neither versions, publishes, tags, nor opens a "Version Packages"
  PR). It is optional hardening; the writer should flag it as such and confirm
  it does not collide with the out-of-scope constraint. (My read: it's
  compatible, but it IS net-new CI, so treat as an explicitly-optional
  recommendation, not a requirement.)

**Toolchain / provenance:** node + npm are the assumed, **unpinned** toolchain —
no `engines` field, no `.nvmrc` anywhere. The mechanism works on node 22. The
design MAY optionally add `engines.node` / `.nvmrc` for determinism, but that is
hardening, not required by the spec.

**Options considered:**

| Option | Verdict |
|---|---|
| Custom zero-dep ESM sync script + single non-`version` npm run-script chaining the 3 steps (RECOMMENDED) | Chosen — verified zero-noise diff, no deps, fail-fast, bundles steps so drift can't recur |
| Standalone sync script run manually after `changeset version` | Viable but inferior — same script, but not bundled, so step 1 can be run alone → re-introduces drift risk |
| npm `version`/`postversion` lifecycle hook | Rejected — `changeset version` does not fire it (verified) |
| First-class Changesets feature / changelog-function | Rejected — cannot write JSON files (verified) |
| Naming the wrapper `"version"` | Rejected — npm pre/post run-script collision footgun |
| Lockfile from-scratch regen (`--package-lock-only --offline` after deleting lockfile) | Rejected — fails `ENOTCACHED` offline; must be in-place |

**Open questions for the writer:**
- Decide whether to recommend the optional CI drift-check (flagged compatible
  with AC9 but net-new CI) and whether to add `engines.node`/`.nvmrc` (optional
  hardening). Neither is required by the spec; present as optional.
- The exact script filename (`scripts/sync-version.mjs`) and run-script name
  (`release:version`) are illustrative; the design fixes behavior, the plan/code
  phase can finalize names — but the **non-`version` naming constraint is
  load-bearing** and must be stated.

---

## T3 — D2: Which pipeline phase authors the changeset file

**Decision:** The **Docs phase (phase 5)** authors the `.changeset/*.md` file via
its `doc-writer` agent. The change is RESOLVED in favor of the spec-research
recommendation, on the following evidence.

**Traces to:** R5 (changeset authored per change), R6 (per-change obligation
documented), AC2 (committed `.changeset/*.md` travels with the PR), AC8
(obligation documented).

**Evidence (grounded in the pipeline's own phase references):**

- The `doc-writer` agent profile
  (`.agents/agents/doc-writer.md:60`) explicitly enumerates **"changelogs"**
  among the external documentation surfaces it owns: "You own external
  documentation surfaces (READMEs, guides, examples, configuration
  descriptions, **changelogs**, contributor docs, internal conventions)…"
- The Docs phase reference
  (`reference/autonomous-phases/5 - docs.md:14`) lists **"changelogs"** in the
  phase's Outputs. So a changeset file (the changelog's input record) is a
  natural fit for this phase's ownership.
- The Docs phase is **phase 5 — the last phase** of the pipeline
  (`autonomous-workflow.md:44`). Authoring the changeset here means the bump
  type (patch/minor/major) is decided once the full, shipped scope of the change
  is known — code has already landed in phase 4. Authoring it earlier (e.g. in
  the Code phase) would force the bump-type call before the change is complete.
- The Docs phase already carries the **per-change README-update duty** for the
  repo (`AGENTS.md` standing rule), so adding a per-change changeset-authoring
  duty in the same phase keeps all per-change documentation obligations in one
  place — directly satisfying R6/AC8's "mirror the README-update rule" framing.

**Key boundary clarification (authoring vs. consuming):**

- **Authoring** the changeset (writing a `.changeset/*.md` that declares the
  change + bump type, committing it) is what the Docs phase does. The file is
  COMMITTED and TRAVELS WITH THE PR — it is NOT consumed inside the pipeline run
  (R5/AC2 require it to live on the branch and travel with the PR).
- **Consuming** the changeset — running `changeset version` to fold it into
  `CHANGELOG.md`, bump the root version, and propagate — is the *version step*.
  Crucially, **the autonomous workflow has no version-step phase**: it ends at
  phase 5 (Docs) and "closes out the run" (`autonomous-workflow.md:80-82`)
  without ever running `changeset version`. This is consistent with D1
  (local/manual version step, see T2): the version step is an
  operator/maintainer action run at merge/release time, OUTSIDE the per-issue
  pipeline run, not by any phase agent.
- Consequence for the design: the Docs phase authors + commits the changeset;
  the changeset accumulates on `trunk` as PRs merge; the operator runs the
  version step (manually/locally) when they choose to cut a version, consuming
  all pending changesets at once. This cleanly separates "record the change"
  (per-PR, automated by the phase) from "cut a version" (operator-initiated).

**Caveat / nuance to flag for the writer:** a Changesets `.changeset/*.md` file
is not purely documentation — it encodes a **semver bump-type decision**
(patch/minor/major), which is a versioning judgment. The doc-writer authoring it
must choose that bump type. This is within the doc-writer's competence (it has
read the spec, design doc, and shipped code, so it knows the change's nature),
but the design doc / contributor docs should give brief guidance on choosing the
bump type (e.g. behavior-preserving fix → patch; backward-compatible feature →
minor; breaking change → major) so the call is consistent. No conflict with the
"doc-writer must NOT touch source code" rule (`doc-writer.md:60`): a
`.changeset/*.md` file is documentation/metadata, not source code.

**Options considered:**

| Option | Verdict |
|---|---|
| Docs phase (phase 5) authors it (RECOMMENDED) | Chosen — owns changelogs, runs last, already owns per-change README duty |
| Code phase (phase 4) authors it | Rejected — bump type decided before change is complete; code phase owns code/tests, not changelog metadata |
| A dedicated new phase | Rejected — over-engineering; spec adds no new phase, and the pipeline has a fixed six-phase shape |
| Operator authors it manually outside the pipeline | Rejected as the default — defeats R6's "per-change obligation" automation, though the operator CAN always add ad-hoc changesets too |

**Open question for the writer:** the design doc should state plainly that the
Docs phase's per-change duty now includes authoring a changeset, AND that the
version step is a separate operator action — so a reader does not assume the
pipeline bumps the version itself.

---

## T4 — D3: Changelog formatter (default vs. `@changesets/changelog-github`)

**Decision (settled):** Use the **default formatter**
(`@changesets/cli/changelog`). Do NOT add `@changesets/changelog-github`.

**Traces to:** R4 (changelog generated by Changesets), AC3 (version step
generates the changelog).

**Evidence (grounded in repo + spec):**

- The version step is **local/manual** (D1 — see T2), so there is **no
  CI-provided `GITHUB_TOKEN`** at version-step time. The only CI in the repo is
  `deploy-landing.yml`, a GitHub Pages deploy that uses `contents: read` /
  `pages: write` / `id-token: write` permissions
  (`.github/workflows/deploy-landing.yml:11-14`) and never runs the changelog
  step. So adopting the GitHub formatter would require the operator to provision
  and export a token by hand on every version step.
- `@changesets/changelog-github` requires a GitHub token (the docs/package read
  `process.env.GITHUB_TOKEN`) to call the GitHub API and resolve PR/commit
  author links. Its only added value is **PR/commit hyperlinks** in
  `CHANGELOG.md` — a cosmetic nicety, not a spec requirement. Spec R4/AC3 only
  require that a changelog is generated/updated by Changesets; link decoration
  is not required.
- It also adds a second dependency (`@changesets/changelog-github`) and a config
  block (`["@changesets/changelog-github", { "repo":
  "Automattic/radical-pipelines" }]`), increasing surface area for no required
  benefit.

**No-token failure mode — verified hands-on by the researcher** (@changesets/cli
2.31.0, @changesets/changelog-github 0.7.0, @changesets/get-github-info 0.8.0,
node v22.21.1). The behavior is NOT graceful degradation in the case that
matters — it **throws and aborts atomically**:

- **Case A — a changeset with NO commit and NO `pr:`/`commit:`/`author:`
  directive in its summary:** `changeset version` SUCCEEDS with no token; the
  changelog is written as plain text (no links), exit 0. (The GitHub API is only
  called when there's a PR/commit to resolve.)
- **Case B — a changeset that has a commit attached OR a `pr:`/`commit:`
  directive — i.e. the NORMAL case, and the very reason one would adopt
  changelog-github:** `changeset version` **THROWS and ABORTS the entire version
  step.** Verified literal error (token absent, summary contained `pr: 81`):
  `Please create a GitHub personal access token … and add it as the GITHUB_TOKEN
  environment variable`, **exit 1**. The failure is **atomic**: version stayed
  `0.1.1`, no `CHANGELOG.md` written, the changeset `.md` was NOT consumed. So a
  no-token run leaves the tree untouched (no partial corruption) but **the bump
  simply does not happen** until a token is provided. (Throw source:
  `@changesets/get-github-info` — `if (!GITHUB_TOKEN) { throw … }`.)
- **Network even WITH a token:** YES — at `changeset version` time it POSTs to
  `https://api.github.com/graphql` with `Authorization: Token <GITHUB_TOKEN>` to
  resolve PR numbers, SHAs, and author handles. So changelog-github needs BOTH a
  token AND network egress at version time whenever a changeset references a
  PR/commit. It also pulls in `dotenv` and reads a `.env` for `GITHUB_TOKEN`.

**Implication:** for a LOCAL/MANUAL version step with no CI-provided
`GITHUB_TOKEN`, changelog-github is **fragile** — the moment an author adds a
`pr:`/`commit:` link directive, the whole version step hard-fails and refuses to
bump. The default `@changesets/cli/changelog` has zero token/network dependency
and always produces a plain-text changelog. changelog-github only pays off once
the bump runs in CI with `GITHUB_TOKEN` in the environment — which D1/T2
explicitly rules out. The default is the robust choice. This is now firmly
settled, not preliminary.

**Options considered:**

| Option | Verdict |
|---|---|
| Default `@changesets/cli/changelog` (RECOMMENDED) | Chosen — zero extra deps, no token, no network, never aborts the local version step |
| `@changesets/changelog-github` | Rejected — hard-aborts the version step (exit 1, atomic) without a token whenever a changeset has a PR/commit link; needs token + network egress; only adds cosmetic PR links; extra deps (`changelog-github`, `get-github-info`, `dotenv`); pays off only with CI + `GITHUB_TOKEN`, which D1 excludes |

**Open question for the writer:** none — settled. If the repo ever adopts a CI
version step with a token (a future change, out of scope here), revisiting
changelog-github would be reasonable; the writer may note that as a future
option but must not adopt it now.

---

## T2 — D1: Version step local/manual vs. a Changesets CI action

**Decision:** **Local/manual** version step. Do NOT add a Changesets GitHub
Action or an automated "Version Packages" PR. RESOLVED per the spec-research
recommendation, reinforced by direct evidence.

**Traces to:** Out-of-scope "No release CI added by default" (spec lines
108-109), R14 (spec-research), AC9 (no Changesets GitHub Action, no automated
"Version Packages" PR, `deploy-landing.yml` unchanged).

**Evidence:**

- **The spec already fixes this in Out of Scope:** "No release CI added by
  default. No Changesets GitHub Action and no automated 'Version Packages' pull
  request are introduced. The version step is run locally / via the pipeline."
  (`spec.md:108-110`) and AC9 makes it verifiable. So D1 is effectively settled
  by the spec; the design doc just records the rationale and the mechanism.
- **The pipeline has no version-step phase** (`autonomous-workflow.md:44, 80-82`
  — the run ends at Docs/phase 5 and closes out). Combined with T3, this means
  the version step is an operator action run outside the per-issue pipeline,
  consuming accumulated changesets when the operator chooses to cut a version.
- **The repo's operating model** is single-operator, trunk-based, worktree-per-
  issue (see `reference/` workflow docs) — it lacks the many-contributors-
  merging-continuously signal that the Changesets `changesets/action` CI model
  is designed for.
- **The only existing workflow** (`deploy-landing.yml`) is a Pages deploy and
  must stay untouched (AC9). Adding release CI would be net-new infra the spec
  explicitly excludes.

**Mechanism:** the operator runs the version step locally (an `npm run …`
script — exact name and contents pending T1) which invokes `changeset version`
plus the propagation + lockfile-regeneration steps, then commits the result
following the repo's `.rp.md` commit format (Changesets `commit: false` default
keeps Changesets from auto-committing, preserving the repo's commit convention —
confirmed against spec-research Q3(1)).

**Options considered:**

| Option | Verdict |
|---|---|
| Local/manual version step (RECOMMENDED) | Chosen — matches spec Out-of-Scope, no CI exists, single-operator model |
| Changesets GitHub Action + auto "Version Packages" PR | Rejected — explicitly out of scope (AC9); wrong fit for single-operator repo; net-new infra |

**Open question for the writer:** none material — the spec already mandates
this. The writer should still document (per R15/README) that the version step is
operator-run and how to run it.

---

## T5 — One-time drift correction to `0.1.1` (sequencing and method)

**Decision:** As a one-time correction in THIS work, bring
`.claude-plugin/plugin.json`, `.pi-extension/package.json`, and
`.pi-extension/package-lock.json` UP from `0.1.0` to **`0.1.1`** to match the
root source of truth. Do this **before / independent of the first
`changeset version`**, by running the same propagation mechanism (sync script +
lockfile regeneration) once against the current root value `0.1.1` — i.e. the
drift correction is just "run the sync step with the root already at 0.1.1," not
a special-case code path.

**Traces to:** R11 (drift corrected to single `0.1.1` baseline), R12 (next
version not pinned), AC7 (the three files all read `0.1.1`, lockfile matches).

**Evidence (verified in this worktree's git history + working tree):**

- The drift is genuine accidental drift: commit `ad43963` ("Refactor spec and
  design phases…", a 19-file unrelated change) bumped ONLY root `package.json`
  `0.1.0`→`0.1.1` (confirmed via `git show ad43963 -- package.json`: the diff is
  `-  "version": "0.1.0"` / `+  "version": "0.1.1"`), with no changelog and no
  propagation to the other two files. Plugin and pi-extension have only ever
  been `0.1.0`.
- Current on-disk state matches the spec's stated pre-work state (AC7): root
  `0.1.1`, plugin `0.1.0`, pi-extension `0.1.0`, lockfile `0.1.0`.
- **Direction is fixed by SemVer:** the source of truth (root) is already at the
  highest value `0.1.1` and must not regress; therefore plugin and pi-extension
  are brought UP to `0.1.1` (not root brought down to `0.1.0`). Matches R11.

**Why correct the drift BEFORE the first `changeset version` (sequencing):**

- `changeset version` only reads/writes the root package it manages; it computes
  the next root version from root's CURRENT value (`0.1.1`) and is oblivious to
  the other two files. If the drift is not corrected first, the two lagging
  files stay at `0.1.0` until the sync step runs.
- Normalizing all three to `0.1.1` up front (via the sync step, root unchanged)
  makes the pre-Changesets baseline coherent and **decouples "fix the existing
  drift" from "cut the first new version."** Either ordering converges to the
  same end state, but normalize-first is lower-risk and easier to verify
  (reviewer can confirm AC7's `0.1.1`-everywhere baseline as a discrete,
  inspectable step) and keeps R12 honest — no next version is pinned by the
  correction itself.

**Method — reuse the propagation mechanism, do not hand-edit:**

- The cleanest design is: the same sync script that propagates a bumped version
  (T1) is run once with root at its current `0.1.1`. It copies `0.1.1` into the
  two target files and regenerates the lockfile (R9). This proves the mechanism
  works AND fixes the drift in one motion — no separate one-off editing logic.
- R12 is preserved: the correction lands everyone on `0.1.1` and pins nothing
  beyond it; the next version is whatever a future changeset's bump type yields
  on top of `0.1.1` (patch→`0.1.2`, minor→`0.2.0`, …).

**Note on `CHANGELOG.md` and the baseline:** the drift correction is a
versioning hygiene fix, not a feature change. The design should decide whether
the `0.1.1` baseline gets a `CHANGELOG.md` entry. Since R4 says the changelog is
generated by the version step (not hand-maintained) and R12 says no next version
is pinned, the cleanest reading is: the `0.1.1` normalization is a pre-Changesets
baseline (no changelog entry for it), and the FIRST changelog entry appears when
the first real changeset is consumed by the first `changeset version`. The
writer should state this explicitly so a reviewer is not surprised by an empty/
absent changelog at the `0.1.1` baseline. (Flag for the writer; not a hard
requirement of the spec.)

**Options considered:**

| Option | Verdict |
|---|---|
| Run the sync mechanism once at root `0.1.1` to correct drift (RECOMMENDED) | Chosen — reuses the propagation path, single inspectable step, no special-case code |
| Hand-edit the two files + lockfile to `0.1.1` | Rejected — bypasses the mechanism, risks lockfile drift, not repeatable |
| Fold the drift correction into the first `changeset version` | Rejected — couples drift-fix with first version cut, harder to verify AC7's baseline, risks confusion about R12 |

**Open question for the writer:** confirm the changelog-at-baseline framing
above (no entry for the `0.1.1` normalization; first entry on first real
changeset).

---

## Consolidated `.changeset/config.json` settings (for the writer)

Grounded in spec-research Q3(1) (Changesets official config docs) + the repo.
Only ONE non-default is load-bearing:

- `"baseBranch": "trunk"` — **the single required non-default**. The repo's
  default branch is `trunk`, not the tool's `master`. Maps to R2/AC1.
- `"changelog": "@changesets/cli/changelog"` — the default formatter (T4). Keep
  the default; do NOT use `@changesets/changelog-github`.
- `privatePackages`: leave at the Changesets default
  `{ "version": true, "tag": false }` — do NOT set to `false`. This versions +
  changelogs the private root package but never tags it (R2/AC1). `private:
  true` only blocks PUBLISH, not the version step (spec-research Q3(1),
  confirmed).
- `"commit": false` — keep the default so Changesets does NOT auto-commit;
  commits follow the repo's `.rp.md` agent-name commit format (D1/T2).
- `"access": "restricted"` — default, fine (never publish anyway).
- `"prettier"`: default `true`; may be set `false` since the repo has no
  Prettier dependency — minor/optional, the writer can decide. (Low risk either
  way; if left `true` and no Prettier is installed, confirm Changesets falls
  back gracefully — flag as a minor verification item for the code phase.)

`@changesets/cli` is declared as a **dev dependency** (R1/AC1). This work adds a
root `scripts` block (none today) for the version-step run-script (T1).

## End-to-end flow (synthesis for the writer)

1. **Per change (Docs phase / phase 5, T3):** the `doc-writer` authors a
   `.changeset/*.md` declaring the change + bump type, commits it. The file
   TRAVELS WITH THE PR; it is not consumed in the pipeline run.
2. **One-time, this work (T5):** correct the existing drift by running the sync
   mechanism once with root at `0.1.1`, bringing `plugin.json`,
   `.pi-extension/package.json`, and the lockfile to `0.1.1`. No changelog entry
   for this baseline.
3. **Version step (operator/local, T1 + T2 + D1):** when the operator cuts a
   version, a single non-`version`-named npm run-script chains
   `changeset version` → `node scripts/sync-version.mjs` →
   `npm install --package-lock-only` in `.pi-extension/` (with `&&` fail-fast).
   This consumes pending changesets, writes `CHANGELOG.md`, bumps root, and
   propagates the new version to the two targets + lockfile. The operator
   commits per `.rp.md` format.
4. **Optional hardening (flagged, not required):** a read-only CI drift-CHECK
   asserting the four versions match; `engines.node` / `.nvmrc` for determinism.
   Both compatible with AC9 but net-new — present as optional.

## Risks and open questions roundup (for the writer)

- **R-1 Silent re-drift** (the failure that created today's mess): mitigated by
  bundling all three version-step commands into ONE run-script (T1) so
  `changeset version` cannot be run alone. Optional CI drift-check is the
  belt-and-suspenders backstop.
- **R-2 Lockfile from-scratch regen fails offline** (`ENOTCACHED`): the design
  MUST do an in-place `--package-lock-only` edit with the existing lockfile
  present; never delete-then-regenerate (T1).
- **R-3 Run-script name collision:** must NOT name the wrapper `"version"` (npm
  pre/post run-script footgun, T1). Use e.g. `release:version`.
- **R-4 changelog-github hard-abort:** do not adopt it; it aborts the local
  version step without a token whenever a changeset references a PR/commit (T4).
- **OQ-1 (writer):** recommend the optional CI drift-check and/or
  `engines.node`/`.nvmrc`? Both optional, both compatible with AC9.
- **OQ-2 (writer):** confirm the changelog-at-baseline framing (no entry for the
  `0.1.1` normalization; first entry on the first real changeset) (T5).
- **OQ-3 (writer):** give brief bump-type guidance for the doc-writer authoring
  changesets (patch/minor/major) so the call is consistent (T3).
- **OQ-4 (writer/code phase):** `prettier` config default vs. `false` given no
  Prettier dep — minor verification item.

All factual blockers are cleared; the spec is internally consistent and
feasible. The design can proceed to synthesis.
