# Code review — APPROVED

**Pipeline:** 70-restructure-repository-layout
**Batch:** `git diff 8f51d36..HEAD` (18 commits, `e620001..44fb592`)
**Tasks reviewed:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19
**Task 18:** intentionally DECLINED (owner-gated OD4 asset merge) — root `assets/` and `README.md:3` unchanged is the correct, expected state, not a defect.
**Verdict:** APPROVED.

## Scope note

This is a repository-restructuring meta-task. All documentation edits (README rewrite,
README `teams.yaml`/image repoints, landing-site copy) are deferred to phase 5 per the
code plan and are explicitly out of scope here. The single residual `.pi-extension`
reference in `README.md` is therefore expected and NOT a defect for this batch. Only
non-doc reference correctness, file moves/deletes, manifest/script/.gitignore/changeset
edits were reviewed.

## Structural / verification checks (Task 19)

| Check | Command | Result |
| --- | --- | --- |
| No symlinks remain | `git ls-files -s \| grep '^120000'` | empty — PASS |
| No `.agents/` under skill | `grep -rn '\.agents/' skills/` | empty — PASS |
| No `.rp.md` under skill | `grep -rn '\.rp\.md' skills/` | empty — PASS |
| Removed tracked paths absent | `git ls-files` for `.agents .pi .pi-extension .rp.md .pipelines .claude/.rp.md` | all empty — PASS |
| Real skill present | `git ls-files skills/radical-pipelines/SKILL.md` | present — PASS |
| Real agents present | `git ls-files 'agents/*.md' \| wc -l` | 17 — PASS |
| Merged conventions present | `git ls-files .rp/CONVENTIONS.md` | present — PASS |
| `CLAUDE.md` imports AGENTS | `cat CLAUDE.md` | `@AGENTS.md` — PASS |
| Restructure changeset present | `git ls-files .changeset/` | `restructure-repository-layout.md` present — PASS |
| sync-version test green | `node --test scripts/test/sync-version.test.mjs` | 6 pass, 0 fail — PASS |
| sync-version targets only plugin.json | `node scripts/sync-version.mjs` | "Version 0.1.1 already in sync"; `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]` — PASS |
| Self-move slugs intact | `git ls-files '.rp/pipelines/*'` | all 4 slugs (incl. this pipeline) under `.rp/pipelines/`, no top-level `.pipelines/` — PASS |
| Claude anchors unchanged | `git diff 8f51d36..HEAD -- .claude-plugin/` | empty — PASS |
| `teams.yaml` moved to root | `git ls-files teams.yaml` / `.pi-extension/teams.yaml` | root present, old gone — PASS |

**AC2 (Claude plugin load)** and **AC3 (Pi install)** are documented-deferred (interactive
Claude CLI / `pi` not installed). Layout-based confirmation accepted: `marketplace.json`
`source: "./"` unchanged with real `skills/radical-pipelines/SKILL.md` + flat `agents/`;
`package.json` `pi.skills[0] == "skills"` with real `skills/radical-pipelines/`. Both must
be confirmed empirically in a later phase.

## Per-task findings

- **Task 1** — `skills/radical-pipelines/` is a real dir; `SKILL.md` + full `reference/`
  subtree present as real files; symlink gone; plural-container shape preserved. PASS.
- **Task 2** — `agents/` real flat dir with all 17 profile `.md` files; symlink gone. PASS.
- **Task 3** — All four remaining mirror symlinks and the hidden `.agents/` gone; no
  `120000` entries remain. PASS.
- **Task 4** — `package.json` `pi.skills[0] == "skills"`; two trailing `node_modules/...`
  entries unchanged; no `.pi-extension/skills` reference. PASS.
- **Task 5** — `teams.yaml` moved to root; `.pi-extension/` (manifest, lockfile, README,
  teams.yaml) entirely gone; exactly one root Pi manifest. PASS.
- **Task 6** — `release:version` is exactly
  `"changeset version && node scripts/sync-version.mjs"`; no `.pi-extension` in
  `package.json`. PASS.
- **Task 7** — `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`; sync-version test
  green; script references no `.pi-extension` path. PASS.
- **Task 8** — `health-monitoring.md` recovery-table reference is skill-relative
  (`reference/health-monitoring.md`); no `.agents/`; separate commit (`436adcb`). PASS.
- **Task 9** — Atomic single commit (`5a6d8ce`) touching exactly the 4 conventions files
  (load.md ×1, setup.md ×9, claude-code.md ×1, pi.md ×1 = 12 lines); read path (load.md)
  and write path (setup.md:176) both name `.rp/CONVENTIONS.md`; zero `.rp.md` left under
  `skills/`. PASS.
- **Task 10** — `setup.md:52` suggested default reads `.rp/pipelines/<pipeline-slug>/`;
  single-line, separate commit (`44f0c36`); still phrased as a suggested default. PASS.
- **Task 11** — `.pi/.rp.md` and `.pi/settings.json` removed; no tracked `.pi/...`; Pi
  runtime conventions preserved in merged file. PASS.
- **Task 12** — dogfood `.claude/.rp.md` removed; Claude Code runtime conventions
  preserved in merged file; active worktree runtime untouched. PASS.
- **Task 13** — Single merged `.rp/CONVENTIONS.md` with shared + Claude Code + Pi
  sections; root `.rp.md` gone. No per-tool-file pointer, no `.pi/settings.json`
  auto-install text, no symlink-exposure claim, no `.agents/` path. Pi local-install reads
  `pi install . -l`; artifact-folder reads `.rp/pipelines/<slug>`; Pi agent setup names
  real `agents/`; health-monitoring reference repointed to real shipped path. Location
  matches the skill's Task 9 read/write paths. PASS.
- **Task 14** — `.gitignore` is exactly `node_modules/`; the three removed-path entries
  gone. PASS.
- **Task 15** — Pending changeset body now names only `.claude-plugin/plugin.json`; drops
  `.pi-extension/package.json` and the "regenerates the extension lockfile" clause; YAML
  front matter unchanged (`minor`). PASS.
- **Task 16** — New `.changeset/restructure-repository-layout.md`; front matter
  `"@automattic/radical-pipelines": minor`; body describes flat layout, single root Pi
  manifest, single `.rp/CONVENTIONS.md`, consolidated `.rp/pipelines/`, removed install
  paths/symlinks/duplicate manifest. A follow-up commit (`44fb592`) corrected the body to
  reference the `.rp/pipelines/` path. PASS.
- **Task 17** — `git mv .pipelines .rp/pipelines`; all four slugs intact under
  `.rp/pipelines/` (including this running pipeline); no standalone `.pipelines/`;
  `CONVENTIONS.md` and `pipelines/` coexist under `.rp/`. PASS.
- **Task 19** — All runnable checks pass (table above); AC2/AC3 honestly recorded as
  deferred with layout-based confirmation. PASS.

## Convention compliance

- All 18 commit messages are imperative, sentence case, no trailing period, agent name in
  parens — conform to the project format.
- Moves used `git mv` / deletions `git rm` (history-preserving renames visible in diff
  stat).
- No scope creep: no documentation files edited; no test file edited (sync-version test
  loops generically over `TARGET_MANIFESTS` and stays green).

## Conclusion

Every in-scope task's acceptance criteria and the traced spec ACs (AC1, AC4, AC5, AC6,
AC7, AC9, AC10) are satisfied; AC2/AC3 are correctly deferred with layout confirmation.
No defects found. Approved.
