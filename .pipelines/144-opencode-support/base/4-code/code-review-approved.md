# Code Review — opencode support (batch: Tasks 1–7) — APPROVED

**Verdict:** Approved
**Base ref:** `1601199` → `HEAD` (`8589230`)
**Scope reviewed:** the 7 code-plan tasks only (pipeline artifact commits under `.pipelines/144-opencode-support/` excluded per the batch scoping note).

## What was reviewed

The full diff `1601199 → HEAD`, restricted to the code files:

- `skills/radical-pipelines/reference/conventions/setup.md` (Tasks 1, 2)
- `skills/radical-pipelines/reference/health-monitoring.md` (Task 3)
- `skills/radical-pipelines/reference/conventions/opencode.md` — new (Task 4)
- `packages/opencode/{package.json,src/plugin.ts,src/ensemble.d.ts,build.mjs,.gitignore}` — new (Tasks 5, 6)
- `package.json`, `scripts/sync-version.mjs`, `.changeset/config.json` (Task 7)
- `scripts/test/opencode-package.test.mjs`, `scripts/test/opencode-build.test.mjs` — new

Against `code-plan.md`, `design-doc.md`, and `spec.md`. The build was exercised end-to-end (`node packages/opencode/build.mjs`), version-sync was run twice for idempotence, and the full test suite was run.

## Scope boundary held exactly

Non-artifact files changed: exactly the two authorized generic edits (`setup.md`, `health-monitoring.md`), the one new conditionally-loaded convention file (`opencode.md`), the sub-package (`packages/opencode/**`), the three tooling files (root `package.json`, `sync-version.mjs`, `.changeset/config.json`), and the two new tests. No CC/Pi convention file, no other generic skill file, and no `agents/*.md` body or source frontmatter was touched (Req 17–19, design Components). The changeset validator (`scripts/validate-changesets.mjs`, `EXPECTED_NAME = "@automattic/radical-pipelines"`) is correctly unedited — the sub-package is version-synced, not changeset-targeted.

## Per-task acceptance verification

**Task 1 — setup.md context-window clause.** "each tool's own auto-compaction" → "each tool's own mechanism" (`setup.md:103`). Names no fixed tool set, asserts nothing about opencode; only that sentence changed. Met.

**Task 2 — setup.md supported-tools row.** `| opencode | opencode.md |` added in order Claude Code → Pi → opencode. CC/Pi rows unchanged; no opencode-specific branching introduced (Step 3 already auto-discovers Setup actions). Met.

**Task 3 — health-monitoring.md tool-agnostic lifecycle.** `## When to launch` and `## Stopping the monitor` reworded to defer start/cancel to the active tool's convention and explicitly allow an always-on tool to have nothing to start/cancel; no fixed convention-file list named. Context-window note's full sentence (including the trailing "…so the monitor would only react after the tool has already handled it" clause) replaced with "handled by each tool's own mechanism, not by the monitor." Watched signals, 2-retry recovery table, escalation payload, "assisted runs use no monitor," and the Loop prompt template are all still present; the template got the intended light framing touch ("works from a self-contained prompt … lists what to check" / "each time it checks"). CC/Pi `/loop` behavior is unchanged — the mechanics are simply deferred to their conventions, which still carry start/list/cancel. Met.

**Task 4 — opencode.md.** Mirrors `pi.md`'s shape: one-line intro, fenced canonical `.rp.md` block with `##` Worktrees / Branch names / Team spawning / Agent models / Health monitoring, then a **Setup actions** section. All acceptance points present: worktree via plain `git worktree add -b worktree-<slug> <path> <base>` with the launch-rooted-in-worktree hand-off (`opencode <path>` TUI / `opencode run --dir <path>` automation) and `git worktree remove <path>`; teammates use the worktree as cwd; `team_spawn({ name, agent, prompt, model, worktree: false })` with `worktree: false` stated unconditional for every agent type and the `plan`/`explore` auto-detection caveat; peer-to-peer `team_message`/`team_broadcast` with orchestrator-repair-only; shared task board `team_tasks_*`/`team_claim` with `depends_on` and the "track progress in artifact subfolders, not the board" caution; auth-recovery via `opencode models` picking a different authenticated `provider/model`, never interactive login (`opencode auth login` / `opencode providers login`), escalate if none, distinct from Agent-models config; provider-qualified `provider/model` from `.rp.md` with project-wide-default fallback; always-on supervision with nothing to launch/list/cancel, 2-retry budget + 3rd-occurrence escalation via `reference/health-monitoring.md`, thresholds in `.opencode/ensemble.json`, plus both accepted observability notes (lead-session failures not auto-supervised; hard-timeout does not message the lead). Setup actions: Node ≥ 24 / Bun ≥ 1.0 prerequisite checked first and blocks declaring opencode ready; present/missing agent reporting; install only after destination confirmation keyed to artifact-storage mode (committed `.opencode/agent/` vs. per-user `~/.config/opencode/agent/`) with the fork-mode note; bundled skill install to the matching destination; `.opencode/ensemble.json` with `mergeOnCleanup: false`, `stallThresholdMs: 300000`, `timeoutMs: 1800000`; "list only the meta-plugin, never ensemble alongside"; verify-discovery before proceeding. No per-agent-worktree or squash-merge instruction. Met.

**Task 5 — sub-package manifest + meta-plugin entry.** `packages/opencode/package.json` is non-private (no `private` field), `type: "module"`, `engines: { node: ">=24", bun: ">=1.0" }`, version `0.3.0` = root, deps on `@hueyexe/opencode-ensemble` pinned exact (`0.15.1`, no range prefix) plus `@opencode-ai/plugin` and `@opencode-ai/sdk`. `src/plugin.ts` imports ensemble, initializes it once (`await ensemble(input)`), and exports `{ ...ensembleHooks, ...RP }` with `RP = {}` (minimal, documented extension point) — listing only this meta-plugin delivers one watchdog / one dashboard. The hand-written `src/ensemble.d.ts` typing the untyped ensemble default export as `Plugin` is a reasonable, contained type shim. Task touched only files under `packages/opencode/`; root `package.json` untouched here. Met.

**Task 6 — bundle converted agents + skill.** `build.mjs` emits, for each of the 17 `agents/<name>.md`, a published `<name>.md` with `description` carried verbatim (exact source line, never re-serialized), `mode: subagent` added, and `name`/`model`/`permission` absent — body byte-identical (offset-based slice past the closing `---`, round-trips exactly). Verified end-to-end: 17 agents emitted, `code-reviewer.md` frontmatter converted as specified and body diff empty; skill tree bundled verbatim under `skills/radical-pipelines/`. Source `agents/*.md` and `skills/` unchanged; build output gitignored (not committed). Met.

**Task 7 — workspace root + version lockstep.** Root `package.json` adds `"workspaces": ["packages/*"]` and keeps `private: true`; no opencode runtime dep added to root. `sync-version.mjs` `TARGET_MANIFESTS` adds `packages/opencode/package.json` — running it writes the root version into the sub-package and a second run is a no-op (verified). `.changeset/config.json` `changedFilePatterns` adds `packages/**`. The single-package changeset validator is unedited. Met.

## Behavior verification (code tasks)

- `node packages/opencode/build.mjs` → "Built 17 opencode agents and bundled the skill tree." 17 files emitted; skill tree present.
- `code-reviewer.md`: converted frontmatter exactly `description` (verbatim) + `mode: subagent`; body diff against source empty.
- `node scripts/sync-version.mjs` twice → "already in sync; no changes." both times; sub-package version `0.3.0` = root.
- `node --test 'scripts/test/**/*.test.mjs'` → **33 pass, 0 fail** (opencode-package, opencode-build, sync-version parametrized over `TARGET_MANIFESTS`, validate-changesets, plus existing suites).

## Convention compliance

Prose tasks (1–4) correctly ship no structural tests (the repo's "skill is prose, not software" rule); their acceptance is satisfied by the prose, verified by reading. Code/config tasks (5–7) carry dependency-free `node:test` tests. The new convention file is concise, mirrors `pi.md` without duplicating generic content, names no issue-tracker, and confines all opencode-specific behavior to the conditionally-loaded file + packaging artifact.

No issues found. Approved.
