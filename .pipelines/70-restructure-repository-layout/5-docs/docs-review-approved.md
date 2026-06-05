# Docs review — APPROVED

Batch: D1–D5 for issue #70 (restructure repository layout). Iteration N = 1.
Diff reviewed: `git diff fd2b61f..HEAD -- README.md` (4 commits: 7aa1499 D1,
8802165 D2, 38674ac D3, 42ba8ff D4). Source of truth: the shipped restructured
repo.

## Verdict

All documentation tasks are accepted. Every concrete claim spot-checks clean
against the shipped code, the mandated drift greps pass, there is no scope creep,
and D5 is correctly a documented no-op.

## Per-task acceptance coverage and accuracy

### D1 — install/usage/dependency-bundling rewrite (AC8)
- Claude Code plugin section: symlink/`.agents/` source-of-truth framing removed;
  bullets now describe a real `skills/radical-pipelines/` directory and root
  `agents/`. Verified against shipped layout — `skills/radical-pipelines/` and
  `agents/` are real directories at the repo root (no `.agents/`, no symlinks).
- Pi package install: local-development block is now `npm install` then
  `pi install . -l` (the `cd .pi-extension` dance is gone). The manifest is
  described as the single root `package.json` resolving the skill from root
  `skills/`. Verified: shipped `package.json` has `pi.skills[0] = "skills"`.
- Pi usage: validation note repointed to `pi install . -l`.
- Dependency bundling (highest-risk): the false "root manifest declares the same
  bundled dependencies directly" claim is gone and the dual-layer framing is
  replaced. The new text states "Dependency delivery is not a `bundledDependencies`
  mechanism" and that the declared `dependencies` are installed via Pi's post-clone
  `npm install`, with bundled third-party resources referenced through
  `node_modules/...` paths. **Verified against shipped root `package.json`**: it has
  a `dependencies` block (`@pi-agents/loop`, `@sinclair/typebox`,
  `@zenobius/pi-worktrees`, `pi-teams`) and **no** `bundledDependencies` key
  (`grep bundledDependencies package.json` → exit 1). The TRUE mechanism is stated.
- Final canonical-sources paragraph rewritten: "skills/radical-pipelines/ and
  agents/ are the real sources … no mirror-symlink scheme."
- Fallback section: the only remaining "symlink" mention (line 149) is the general
  cross-CLI path-variability caveat the plan explicitly allowed to stay; no
  repo-specific stale path leaks in.

### D2 — Configuration → single merged conventions file (AC8 + AC6 narrative)
- Section names the merged file at `.rp/CONVENTIONS.md` for both the "conventions
  live in" and the "setup writes" sentences. The three-file split paragraph is
  fully rewritten to the single merged file with shared + per-tool sections and the
  single-CLI vs. multi-CLI (this repo dogfoods both) distinction.
- The in-README link `[`.rp/CONVENTIONS.md`](./.rp/CONVENTIONS.md)` resolves — the
  file exists on disk. No broken links to `.rp.md` / `.claude/.rp.md` / `.pi/.rp.md`
  (drift grep for `.rp.md` is empty; those files are gone from disk).
- Multi-CLI claim verified against the shipped file: `.rp/CONVENTIONS.md` contains a
  `## Shared conventions` section plus both a `## Claude Code` and a `## Pi`
  per-tool section.

### D3 — teams.yaml repoint (AC8 + KD9)
- The in-repo template source is now named as the root `teams.yaml` (lines 113, 128),
  while the global `~/.pi/teams.yaml` registration target is preserved (lines 128,
  243). The two `teams.yaml` references are correctly distinguished. Verified: root
  `teams.yaml` exists; no `.pi-extension/` reference remains.
- Line 243's `.pi/agents/` agent-discovery path is a genuine Pi runtime location and
  is correctly left in place (per the plan).

### D4 — versioning → single sync target (AC8)
- "The single source of truth" bullet list now contains only
  `.claude-plugin/plugin.json`; the two `.pi-extension/...` bullets are removed.
- "Cutting a version" is reduced to a two-step description (`changeset version`
  then `node scripts/sync-version.mjs` targeting `.claude-plugin/plugin.json`); the
  lockfile-regeneration step is gone. The closing "result is" sentence names only
  the root `package.json` and `.claude-plugin/plugin.json`.
- **Verified against shipped code**: `package.json` `scripts.release:version` is
  `changeset version && node scripts/sync-version.mjs` (no `--prefix .pi-extension`
  step), and `scripts/sync-version.mjs` `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`.

### D5 — README image + landing OG (NO-OP, OD4 declined)
- Correctly a no-op. `README.md:3` header `<img>` still points at
  `./assets/radical-pipelines.png`, root `assets/radical-pipelines.png` is present,
  and `landing/` is untouched. OD4 (code Task 18) was declined, so the pre-existing
  landing `og:image` dimension inconsistency is intentionally out of scope. Not a
  defect.

## Mandated drift sweep (recorded)

- `grep -nE '\.agents/|\.pi-extension|\.rp\.md|bundled dependencies declared|reads the same' README.md`
  → **no matches** (no stale layout/dependency claims).
- `grep -n 'teams.yaml' README.md` → in-repo source named as root `teams.yaml`;
  global `~/.pi/teams.yaml` registration target preserved.
- Conventions links resolve → references `.rp/CONVENTIONS.md` (exists); no deleted
  `.rp.md` link targets.
- Versioning section → names only `.claude-plugin/plugin.json` and the shipped
  `release:version` / `TARGET_MANIFESTS`.

## Doc-plan adherence

No scope creep. The non-findings the plan recorded (AGENTS.md, CLAUDE.md,
`.changeset/README.md`, the landing demo's fictional `.pipelines/issue-1234/`
props) are correctly left untouched. D5 is correctly a documented no-op tied to the
declined OD4. Audience fit and rationale are faithful throughout.

## Result

Approved — no issues for D1, D2, D3, or D4.
