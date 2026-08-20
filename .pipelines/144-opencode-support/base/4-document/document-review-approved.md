# Document Review

## Verdict: approved

## Batch scope

Expected new work:

- Task 1: README — opencode install, update, and version-surface section
- Task 2: README — reflect two supported tools in Project Usage and Configuration
- Task 3: CONTRIBUTING — opencode integration suite, changeset paths, and distribution wording
- Task 4: Website — present opencode as a second supported tool
- Task 5: package.json — describe RP as an opencode plugin too

Diff reviewed: `b44117c` (parent of the plan commit `7e83309`) → `03a55e3` HEAD — the phase's whole work. Touched surfaces: `README.md`, `CONTRIBUTING.md`, `website/index.html`, `package.json` (plus this phase's own plan/review artifacts). No files outside the four planned surfaces were changed.

## Summary

Every task in the batch meets its per-task Acceptance criteria, and every concrete claim I spot-checked resolves against the shipped code: `rp_status`'s `pluginVersion`/`pin` field names and the three literal pin-comparison outcome strings, the `radical-pipelines@<version>` plugin id surfaced by `GET /api/plugin`, the `~/.config/opencode/agents/` materialization target, the pinned-specifier + `autoupdate: false` + `opencode2 service restart` install/update procedure, the `pin.json` `cli`/`plugin` fields, the `test:opencode` → `scripts/opencode-integration/run.mjs` script, the temp-dir version-keyed CLI cache, the `--network-smoke` network requirements, the `opencode/**` changeset path, and the `main`/`exports` entry point. The opencode-conventions prose and the tool-mismatch sentence match `opencode.md` and `load.md`. Website in-page and cross-repo anchor links (`#claude-code-plugin-install`, `#opencode-plugin-install`) resolve to real README headings, and the website install block mirrors the README procedure. No scope creep, no invented rationale, and all commit messages are software-only (no task/requirement/AC/artifact citations). The README Why-now note at L54 ("Tools like Claude Code…") was optional per Task 2 and remains accurate as an illustrative, non-exclusive phrasing, so leaving it is not drift.

## Checks

No Guardrails field is present in this phase's Conventions block, and `document-plan.md`'s Guardrail scopes section binds `None` (the repo's only gate, `tests`, is scoped to the build-writer/build-reviewer agents). There are therefore no gates to run for the document phase; the accuracy spot-check below is the review evidence.

| Check | Command | Result |
| ----- | ------- | ------ |
| No guardrail gates in scope for the document phase | — | n/a |

## Accuracy spot-check

- **Task 1 (`README.md` opencode section):**
  - `rp_status` claims — `shapeStatus` (`opencode/plugin.mjs:1139-1155`) returns `pluginVersion` (set to `PLUGIN_ID = radical-pipelines@<version>`, L1181) and `pin` (the `pinComparison`). `comparePinnedBuild` (L1063-1068) returns exactly `"match"`, `"outside the verified surface"`, `"not determinable"` under the conditions the README states. Field names and outcome strings match verbatim.
  - `GET /api/plugin` id — the default export is `{ id: PLUGIN_ID, setup }` (`opencode/plugin.mjs:1513`), `PLUGIN_ID = radical-pipelines@<version>`; matches the design's `/api/plugin` version surface.
  - Materialization target — `resolveAgentsTargetDir` (L966-969) resolves to `~/.config/opencode/agents` (default), matching the README's `~/.config/opencode/agents/`.
  - Install/update procedure — pinned `github:Automattic/radical-pipelines#v<X.Y.Z>` + `autoupdate: false` + `opencode2 service restart` matches the design "Install configuration" block; `pin.json` carries `cli` and `plugin` (`0.0.0-next-15772`), matching the README's "pins both the `@opencode-ai/cli` build … and the `@opencode-ai/plugin` package version."
- **Task 2 (`README.md` Configuration):** the opencode conventions named — `rp_spawn`, `rp_loop_*`, and `Agent models` as `provider/model[#variant]` passed verbatim to `rp_spawn` — match `opencode.md:12-24`. The tool-mismatch sentence ("does not proceed … informs the owner and offers setup for the active tool") matches `load.md:22-28`.
- **Task 3 (`CONTRIBUTING.md`):** `test:opencode` → `node scripts/opencode-integration/run.mjs` (`package.json:15`); cache is `join(tmpdir(), "rp-opencode-integration-cache", pin.cli)` under the OS temp dir keyed by exact version (`scripts/opencode-integration/lib/sandbox.mjs:70`); `--network-smoke` gates the github-specifier install and hosted free-model turns needing GitHub + `opencode/*` network access (`run.mjs:47,82`; `checks/network-smoke.mjs:43,93-97`); `opencode/**` is present in `.changeset/config.json:12`; the opencode entry point `opencode/plugin.mjs` matches `main`/`exports` (`package.json:10-11`).
- **Task 4 (`website/index.html`):** the two install-note links target `#claude-code-plugin-install` and `#opencode-plugin-install`, which slugify from the real README headings `## Claude Code plugin install` (`README.md:67`) and `## opencode plugin install` (`README.md:105`); the opencode install block (`{ "plugins": ["github:Automattic/radical-pipelines#v<X.Y.Z>"], "autoupdate": false }` then `opencode2 service restart`) mirrors the README procedure; meta keywords now include `opencode`.
- **Task 5 (`package.json`):** the `description` now names a Claude Code plugin, an opencode plugin, and a standalone agent skill, consistent with `main`/`exports` → `opencode/plugin.mjs`; the diff confirms only the `description` line changed.

## Issues

None.
