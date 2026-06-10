# @automattic/radical-pipelines

## 0.2.0
### Minor Changes



- [#85](https://github.com/Automattic/radical-pipelines/pull/85) [`9e8ae47`](https://github.com/Automattic/radical-pipelines/commit/9e8ae47eae620485fc713fe39ee231bdefb2f594) Thanks [@luisherranz](https://github.com/luisherranz)! - Automate releases with GitHub Actions. A PR-time **changeset gate** (`.github/workflows/changeset-gate.yml`) validates changeset shape and requires a changeset for release-relevant changes, and a post-merge **release** workflow (`.github/workflows/release.yml`) uses `changesets/action@v1` to open a "Version Packages" PR and, on merge, create a `v<version>` git tag and a GitHub Release. Adopts `@changesets/changelog-github` for richer changelog entries and adds a dependency-free changeset shape validator (`scripts/validate-changesets.mjs`) with tests. No npm publish; the package stays private and consumed direct-from-git. A new `CONTRIBUTING.md` documents the contributor and maintainer release mechanics.



- [#82](https://github.com/Automattic/radical-pipelines/pull/82) [`b9a72c7`](https://github.com/Automattic/radical-pipelines/commit/b9a72c7343d2fe589ffe48de0fafac68334ad5ec) Thanks [@luisherranz](https://github.com/luisherranz)! - Adopt Changesets to track every repository change in a generated `CHANGELOG.md` and keep the project version synchronized across all version-bearing files. The bundled version step propagates the root `package.json` version to `.claude-plugin/plugin.json`, so the version stays consistent everywhere.



- [#102](https://github.com/Automattic/radical-pipelines/pull/102) [`c180681`](https://github.com/Automattic/radical-pipelines/commit/c1806818f2ca089b850469b4dd36a12f6d6c38cf) Thanks [@luisherranz](https://github.com/luisherranz)! - Add local, per-developer overrides of a project's conventions. A developer can place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy: the local file wins per named unit and the committed file is inherited wherever the local file is silent. Because the file is git-ignored, it is never committed and never affects other contributors. The capability ships as skill documentation — a `Local overrides` step in the convention loader (`load.md`), a `README.md` note, and a `.gitignore` entry.



- [#97](https://github.com/Automattic/radical-pipelines/pull/97) [`b20cb8d`](https://github.com/Automattic/radical-pipelines/commit/b20cb8d936099c10540019be09829a384ef4f195) Thanks [@luisherranz](https://github.com/luisherranz)! - Add an optional per-agent model configuration convention. A project can now pin, per spawned agent and/or as a project-wide default, which model and model settings (such as reasoning `effort`) each agent runs on. The convention is authored per active tool — values are tool-native and passed verbatim to that tool's spawn mechanism with no translation — and is fully optional: a project that configures nothing keeps today's behavior in both the Claude Code and Pi runtimes. Configuration rides the spawn channel only, never editing an agent's profile, and the health monitor's recovery model swaps stay transient — applied only to the recovery re-spawn, never written back and never re-selecting the just-failed model — so the next fresh spawn runs on the configured model again. Setup, the README convention catalog, and this repository's dogfood `.rp.md` document and demonstrate the new `Agent models` block.



- [#93](https://github.com/Automattic/radical-pipelines/pull/93) [`0f402f0`](https://github.com/Automattic/radical-pipelines/commit/0f402f081b235be006ae59771ee10bfd494395f5) Thanks [@luisherranz](https://github.com/luisherranz)! - Recommend the standard `origin`/`upstream` remote names during `artifacts-in-fork` setup. After confirming which remote is the fork and which is the canonical repository — using `gh` fork/parent auto-detection to propose the assignment, and always falling back to asking the owner when detection is ambiguous or unavailable — setup now recommends naming the fork `origin` and the canonical `upstream`, matching GitHub's documented fork convention. The recommendation is decline-able and the orchestrator never renames a remote without the owner's explicit approval; already-standard remotes are left untouched. Whatever names end up in use — renamed or kept — are recorded as the resolved, authoritative remote names, which downstream operations resolve through when pushing the pipeline branch to the fork and the clean PR branch to the upstream. `artifacts-in-repo` mode is unaffected.



- [#109](https://github.com/Automattic/radical-pipelines/pull/109) [`8b58c53`](https://github.com/Automattic/radical-pipelines/commit/8b58c531893b8e72cb4bdc8963ca9f1a3cf0cc91) Thanks [@luisherranz](https://github.com/luisherranz)! - Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent".



- [#84](https://github.com/Automattic/radical-pipelines/pull/84) [`d1e5b65`](https://github.com/Automattic/radical-pipelines/commit/d1e5b65bd4a9b8d4fe91d18af69c47a79c7994e3) Thanks [@luisherranz](https://github.com/luisherranz)! - Restructure the repository to a flat, root-served layout. The skill now lives at its real path `skills/radical-pipelines/` and agents under `agents/`, served directly from the repository root with no install-time copying. A single root Pi manifest describes the plugin, project conventions live in a single `.rp.md`, and pipeline run state is consolidated under `.rp/pipelines/`. The previous install paths, symlinks, and duplicate manifest have been removed, along with the inert `teams.yaml` source file (no Pi tooling read it from the repository; `pi-teams` loads predefined teams only from `~/.pi/teams.yaml` or `.pi/teams.yaml`).
