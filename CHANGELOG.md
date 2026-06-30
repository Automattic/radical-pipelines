# @automattic/radical-pipelines

## 0.6.0
### Minor Changes



- [#166](https://github.com/Automattic/radical-pipelines/pull/166) [`ddfb2ba`](https://github.com/Automattic/radical-pipelines/commit/ddfb2ba82224b265f83b2032df9ed4f5d5ba181f) Thanks [@DAreRodz](https://github.com/DAreRodz)! - Hold every pipeline run's host-project output to two always-on rules, with no opt-out and no owner action. A change now leaves comments and prose it did not touch exactly as they were, and the product it ships — code, tests, documentation, and commit messages — reads as if written by hand, with no trace of the pipeline that produced it. Both rules are enforced at the existing per-phase review gate, where a violation is a must-fix issue that blocks the phase until it is resolved.

## 0.5.0
### Minor Changes



- [#161](https://github.com/Automattic/radical-pipelines/pull/161) [`b438113`](https://github.com/Automattic/radical-pipelines/commit/b4381136e4751eb2f6340ef20250050c101a6ece) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Rename the runs that follow a pipeline's `base` run from `review-N` to `revision-N`, and the activity that creates them from "review"/"reviewing" to "revise"/"revising", so "review" denotes the phase-auditing activity only. `base` keeps its name, and the phase-audit "review" terms (reviewer agents, `*-review-approved.md`, `*-review-N-rejected.md`) are preserved. The command file `reference/review-pipeline.md` is renamed to `reference/revision-pipeline.md` and the `Reviewer base ref` heading to `Revision base ref`. This is a going-forward convention change — existing on-disk `review-N` run folders are not migrated.



- [#135](https://github.com/Automattic/radical-pipelines/pull/135) [`5f13308`](https://github.com/Automattic/radical-pipelines/commit/5f133087f61e21e991d07f3186a1abb9cf6be0e5) Thanks [@luisherranz](https://github.com/luisherranz)! - BREAKING: rename the four documentation-phase agents from the singular `doc-*` to the plural `docs-*` (`docs-plan-writer`, `docs-plan-reviewer`, `docs-writer`, `docs-reviewer`), unifying the documentation concept on `docs` across the skill, agents, and plugin. Any reference to the old singular agent names must be updated.


### Patch Changes



- [#139](https://github.com/Automattic/radical-pipelines/pull/139) [`c1c284f`](https://github.com/Automattic/radical-pipelines/commit/c1c284f140f1b680446cdad9c5058dd885f0d531) Thanks [@luisherranz](https://github.com/luisherranz)! - Follow the issue create/modify workflow — the owner-led capture Q&A routed through the project's Issues convention — whenever the orchestrator creates or modifies an issue, including mid-session and mid-pipeline, rather than only at session start. A mid-run decision to author or revise an issue now re-enters that workflow instead of risking an ad-hoc issue authored outside it.



- [#148](https://github.com/Automattic/radical-pipelines/pull/148) [`24fb66b`](https://github.com/Automattic/radical-pipelines/commit/24fb66b57460009d4366e459bcf7c19c7d51222c) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Keep `package-lock.json`'s version fields in sync with the root package version: the release version step now also runs `npm install --package-lock-only` to reconcile the lockfile, the existing drift in the committed lockfile is corrected, and a CI drift check guards against future divergence.

## 0.4.0
### Minor Changes



- [#124](https://github.com/Automattic/radical-pipelines/pull/124) [`d019d49`](https://github.com/Automattic/radical-pipelines/commit/d019d496a6a357fb23251012bab42975aad1320c) Thanks [@luisherranz](https://github.com/luisherranz)! - A code- or doc-phase guardrail can now name the agents that run it — one or more of `code-writer`, `code-reviewer`, `doc-writer`, and `doc-reviewer` — so a project can scope an expensive gate to the agents where it pays off. A guardrail that names no agents runs for every gate-running agent.



- [#133](https://github.com/Automattic/radical-pipelines/pull/133) [`5690a1a`](https://github.com/Automattic/radical-pipelines/commit/5690a1a45cdbfacf192ecaaf047c74536a5e5796) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Add per-phase summaries for the code and docs phases: on approval the reviewer writes a human-friendly `code-summary.md` / `docs-summary.md` into the phase folder, so a run's artifact folder records what every phase produced.



- [#127](https://github.com/Automattic/radical-pipelines/pull/127) [`985ce53`](https://github.com/Automattic/radical-pipelines/commit/985ce53e198c940fd2e10916c1e20135ed46043e) Thanks [@luisherranz](https://github.com/luisherranz)! - A guardrail gate is now either fixed or scoped: a fixed gate is a literal command run as-is, while a scoped gate carries a `{scope}` placeholder filled per pipeline by the plan of the phase whose agents run the gate — applying the same way to the code and docs phases. Test selection is a planning duty: the plan turns the spec's acceptance criteria and edge cases into an explicit e2e test plan — so the suite a change must pass is decided up front rather than per writer. Behavior verification moves to the code-reviewer, which re-drives the planned e2e flows when reviewing a batch. The single `code-writer` agent is split into `code-writer-tdd` and `code-writer-e2e`, dispatched by a task's `Type`, so each task runs the writer suited to its work.


### Patch Changes



- [#129](https://github.com/Automattic/radical-pipelines/pull/129) [`4b47422`](https://github.com/Automattic/radical-pipelines/commit/4b47422c783b51aef4acfdf471cef01e81889412) Thanks [@luisherranz](https://github.com/luisherranz)! - Give each run its own uniquely named team. A new run no longer collides with a stale team left over from a prior run or session, and you no longer have to manually clean up leftover team state before starting a run.

## 0.3.0
### Minor Changes



- [#118](https://github.com/Automattic/radical-pipelines/pull/118) [`b40934a`](https://github.com/Automattic/radical-pipelines/commit/b40934af21bf332ee3c06f1e0a403f6165101980) Thanks [@luisherranz](https://github.com/luisherranz)! - Add a Guardrails convention: a project may now declare deterministic verification gates — each an exact command judged pass/fail solely by its exit code — that the code and doc phases must pass. Guardrails are optional and tool-agnostic: the conventions loader documents them, setup captures them per gate (name, exact command, applicable phase) and validates each command before writing, and the four phase agents read the guardrails applicable to their phase and run every one as mandatory. A declared command that cannot execute is a blocker; an absent or empty declaration runs nothing and never blocks or warns.



- [#119](https://github.com/Automattic/radical-pipelines/pull/119) [`c1ad0d6`](https://github.com/Automattic/radical-pipelines/commit/c1ad0d67c3a528295c4e58772d4b8e81e6233e7d) Thanks [@luisherranz](https://github.com/luisherranz)! - When creating a pipeline from an issue, the orchestrator now reads the full picture — the issue body, all of its comments, one-level in-tracker cross-references, and linked external pages — and synthesizes that material into the canonical intent format, showing the draft to the owner for explicit approval before writing the file; a standard two-line provenance header (source reference and self-containment assertion) is prepended to every issue-derived base intent in both the synthesis and passthrough cases; a fast-path passthrough skips synthesis and the confirmation gate when the issue body is already in the canonical format, there are no comments, no cross-references, no external links, and no binary attachments.



- [#106](https://github.com/Automattic/radical-pipelines/pull/106) [`45b4837`](https://github.com/Automattic/radical-pipelines/commit/45b4837ab7099caca316b6a41a642967b1afc7bc) Thanks [@SantosGuillamot](https://github.com/SantosGuillamot)! - Add pipeline reviews: layer an incremental change onto a complete, unmerged pipeline by re-running the phases as an additional run on the same branch. Phase folders now live under run folders: the original run is recorded as `base/` at pipeline creation and is never rewritten, and each review adds a sibling `review-N-<short-description>/` run.

## 0.2.0
### Minor Changes



- [#85](https://github.com/Automattic/radical-pipelines/pull/85) [`9e8ae47`](https://github.com/Automattic/radical-pipelines/commit/9e8ae47eae620485fc713fe39ee231bdefb2f594) Thanks [@luisherranz](https://github.com/luisherranz)! - Automate releases with GitHub Actions. A PR-time **changeset gate** (`.github/workflows/changeset-gate.yml`) validates changeset shape and requires a changeset for release-relevant changes, and a post-merge **release** workflow (`.github/workflows/release.yml`) uses `changesets/action@v1` to open a "Version Packages" PR and, on merge, create a `v<version>` git tag and a GitHub Release. Adopts `@changesets/changelog-github` for richer changelog entries and adds a dependency-free changeset shape validator (`scripts/validate-changesets.mjs`) with tests. No npm publish; the package stays private and consumed direct-from-git. A new `CONTRIBUTING.md` documents the contributor and maintainer release mechanics.



- [#82](https://github.com/Automattic/radical-pipelines/pull/82) [`b9a72c7`](https://github.com/Automattic/radical-pipelines/commit/b9a72c7343d2fe589ffe48de0fafac68334ad5ec) Thanks [@luisherranz](https://github.com/luisherranz)! - Adopt Changesets to track every repository change in a generated `CHANGELOG.md` and keep the project version synchronized across all version-bearing files. The bundled version step propagates the root `package.json` version to `.claude-plugin/plugin.json`, so the version stays consistent everywhere.



- [#102](https://github.com/Automattic/radical-pipelines/pull/102) [`c180681`](https://github.com/Automattic/radical-pipelines/commit/c1806818f2ca089b850469b4dd36a12f6d6c38cf) Thanks [@luisherranz](https://github.com/luisherranz)! - Add local, per-developer overrides of a project's conventions. A developer can place a git-ignored `.rp.local.md` alongside the committed `.rp.md` to override a restricted subset of conventions for their own working copy: the local file wins per named unit and the committed file is inherited wherever the local file is silent. Because the file is git-ignored, it is never committed and never affects other contributors. The capability ships as skill documentation — a `Local overrides` step in the convention loader (`load.md`), a `README.md` note, and a `.gitignore` entry.



- [#97](https://github.com/Automattic/radical-pipelines/pull/97) [`b20cb8d`](https://github.com/Automattic/radical-pipelines/commit/b20cb8d936099c10540019be09829a384ef4f195) Thanks [@luisherranz](https://github.com/luisherranz)! - Add an optional per-agent model configuration convention. A project can now pin, per spawned agent and/or as a project-wide default, which model and model settings (such as reasoning `effort`) each agent runs on. The convention is authored per active tool — values are tool-native and passed verbatim to that tool's spawn mechanism with no translation — and is fully optional: a project that configures nothing keeps today's behavior in both the Claude Code and Pi runtimes. Configuration rides the spawn channel only, never editing an agent's profile, and the health monitor's recovery model swaps stay transient — applied only to the recovery re-spawn, never written back and never re-selecting the just-failed model — so the next fresh spawn runs on the configured model again. Setup, the README convention catalog, and this repository's dogfood `.rp.md` document and demonstrate the new `Agent models` block.



- [#93](https://github.com/Automattic/radical-pipelines/pull/93) [`0f402f0`](https://github.com/Automattic/radical-pipelines/commit/0f402f081b235be006ae59771ee10bfd494395f5) Thanks [@luisherranz](https://github.com/luisherranz)! - Recommend the standard `origin`/`upstream` remote names during `artifacts-in-fork` setup. After confirming which remote is the fork and which is the canonical repository — using `gh` fork/parent auto-detection to propose the assignment, and always falling back to asking the owner when detection is ambiguous or unavailable — setup now recommends naming the fork `origin` and the canonical `upstream`, matching GitHub's documented fork convention. The recommendation is decline-able and the orchestrator never renames a remote without the owner's explicit approval; already-standard remotes are left untouched. Whatever names end up in use — renamed or kept — are recorded as the resolved, authoritative remote names, which downstream operations resolve through when pushing the pipeline branch to the fork and the clean PR branch to the upstream. `artifacts-in-repo` mode is unaffected.



- [#109](https://github.com/Automattic/radical-pipelines/pull/109) [`8b58c53`](https://github.com/Automattic/radical-pipelines/commit/8b58c531893b8e72cb4bdc8963ca9f1a3cf0cc91) Thanks [@luisherranz](https://github.com/luisherranz)! - Rename the phase-0 pipeline artifact, folder, and phase label from "prompt" to "intent".



- [#84](https://github.com/Automattic/radical-pipelines/pull/84) [`d1e5b65`](https://github.com/Automattic/radical-pipelines/commit/d1e5b65bd4a9b8d4fe91d18af69c47a79c7994e3) Thanks [@luisherranz](https://github.com/luisherranz)! - Restructure the repository to a flat, root-served layout. The skill now lives at its real path `skills/radical-pipelines/` and agents under `agents/`, served directly from the repository root with no install-time copying. A single root Pi manifest describes the plugin, project conventions live in a single `.rp.md`, and pipeline run state is consolidated under `.rp/pipelines/`. The previous install paths, symlinks, and duplicate manifest have been removed, along with the inert `teams.yaml` source file (no Pi tooling read it from the repository; `pi-teams` loads predefined teams only from `~/.pi/teams.yaml` or `.pi/teams.yaml`).
