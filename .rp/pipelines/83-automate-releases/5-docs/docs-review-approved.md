# Docs review — iteration 2: APPROVED

Re-reviewed the single re-done task from iteration 1 — **Doc Task 1
(`CONTRIBUTING.md`, re-done at commit c4e5bdd)** — against the shipped
`.github/workflows/changeset-gate.yml` and `scripts/validate-changesets.mjs`,
and re-confirmed the load-bearing cross-doc invariants. Doc Tasks 2–4
(`README.md`, `.changeset/README.md`, `AGENTS.md`) were not modified and
already passed in iteration 1.

## Verdict

**APPROVED.** The iteration-1 blocking finding is resolved and nothing
regressed.

## The fix (Doc Task 1 — resolves iteration-1 blocking finding, R20/AC15)

`CONTRIBUTING.md` now has a dedicated `### The changeset gate (CI)` section
(lines 37–52) that explains the PR-time gate. Verified against the shipped
`.github/workflows/changeset-gate.yml`:

- **Workflow name + path** — doc: "**Changeset Gate** workflow
  (`.github/workflows/changeset-gate.yml`)"; yml `name: Changeset Gate`. ✓
- **Trigger** — doc: "runs on every pull request to `trunk`"; yml
  `on: pull_request: branches: [trunk]`. ✓
- **Two checks, in order** — doc: (1) Shape `node scripts/validate-changesets.mjs`,
  (2) Presence `npx changeset status --since=origin/<base>`; yml steps
  "Validate changeset shape" (`node scripts/validate-changesets.mjs`) then
  "Require a changeset…" (`npx changeset status --since=origin/${{ github.event.pull_request.base.ref }}`). ✓
- **Fails if either fails** — doc states this explicitly; matches sequential
  `run:` steps. ✓
- **Bot-PR exemption via job-level `if:`** — doc: "`changeset-release/trunk`…
  is exempt (the job-level `if:` condition skips it)"; yml
  `if: github.head_ref != 'changeset-release/trunk'`. ✓
- **Dependabot gated normally** — doc cross-links `#dependency-bump-prs`,
  consistent with the exemption being scoped to `changeset-release/trunk`. ✓
- **Cross-reference repointed** — the "Adding a changeset" intro (line 35) now
  reads "CI enforces this (see [The changeset gate (CI)](#the-changeset-gate-ci))",
  pointing at the new gate section rather than the post-merge `#release-process`.
  This was the exact misdirection flagged in iteration 1; now correct. ✓

(Note, non-blocking: the workflow also runs `npm test` before the two checks.
The spec/doc-plan framed the gate as "shape validator + presence check," so
documenting those two as the changeset-enforcement checks is faithful; `npm test`
is a general test step already documented separately under "Running tests and
checks locally." Not a defect.)

## No regressions in `CONTRIBUTING.md`

- **Invariant J7** — `### Pre-1.0 policy` → slug `#pre-10-policy`, matching the
  validator error string verbatim (`scripts/validate-changesets.mjs:153`:
  `…see CONTRIBUTING.md#pre-10-policy.`). ✓
- **No-npm invariant** — only `npm test`, `npm ci`, `npm run release:version`;
  all `npm publish` mentions are negative claims. No OIDC/trusted-publishing. ✓
- **Tag form** — `v<version>` throughout. ✓
- **Five-entry allowlist** — `skills/**`, `agents/**`, `.claude-plugin/**`,
  anchored root `package.json`, `README.md`, with exclusions/carve-out intact. ✓
- **CI release flow** — Version Packages PR → human merge → `v<version>` tag via
  `npx changeset tag` + GitHub Release; default `GITHUB_TOKEN`; bot pushes don't
  re-trigger. ✓
- **Sole sync target** — `.claude-plugin/plugin.json`. ✓
- **R18 local-token** — `## Local GITHUB_TOKEN` documents the
  `@changesets/changelog-github` requirement, gitignored `.env`, PAT scopes, CI
  cost zero. ✓
- **R21 prerequisite buckets** — Bucket 1 "verify enabled (currently satisfied)",
  Bucket 2 "None", Bucket 3 optional hardening not done. ✓

## Tasks 2–4 (unchanged — spot confirmation)

`AGENTS.md` links `./CONTRIBUTING.md#adding-a-changeset` and
`./CONTRIBUTING.md#pre-10-policy` both resolve to real CONTRIBUTING headings
(`## Adding a changeset`, `### Pre-1.0 policy`). No regression.
