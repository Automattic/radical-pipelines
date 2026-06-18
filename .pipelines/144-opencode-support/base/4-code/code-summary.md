# Code Summary — opencode support (via opencode-ensemble)

## What

Added opencode as a third supported agentic coding tool at parity with Claude Code and Pi, following the established per-tool pattern exactly. The phase produced:

- **Two minimal, behavior-preserving generic edits.** `setup.md` gains one supported-tools row (`opencode → opencode.md`) and has its Health-monitoring context-window clause generalized to "each tool's own mechanism." `health-monitoring.md` is reworded so the monitor lifecycle is a tool-agnostic outcome (start/cancel mechanics deferred to the active tool's convention, satisfiable as no-ops by an always-on tool) and its context-window note names no fixed tool pair.
- **One new conditionally-loaded convention file** — `reference/conventions/opencode.md`, mirroring `pi.md`: a fenced canonical `.rp.md` block (Worktrees, Branch names, Team spawning, Agent models, Health monitoring) plus a Setup actions section.
- **One new publishable workspace sub-package** — `packages/opencode/`: a non-private manifest depending on a pinned `@hueyexe/opencode-ensemble` (`0.15.1`) plus `@opencode-ai/plugin`/`@opencode-ai/sdk`; a meta-plugin entry (`src/plugin.ts`) that re-exports ensemble as the single team-layer plugin; a local type shim for the untyped ensemble export; and a `build.mjs` that bundles the 17 shared agents (frontmatter converted for opencode, bodies byte-identical) and the skill tree into the published tarball.
- **Build/release tooling** — the repo becomes a workspace root (`workspaces: ["packages/*"]`, still `private: true`); `sync-version.mjs` and `.changeset/config.json` are extended to keep the sub-package version in lockstep with the root.
- **Dependency-free tests** for the genuine code/config: `opencode-package.test.mjs`, `opencode-build.test.mjs`, and the already-parametrized `sync-version.test.mjs`.

## Why

Owners whose active tool is opencode could not run RP. This change lets them install RP, select opencode at setup, and run pipelines end-to-end through every phase in both workflows, producing the same inspectable artifacts as on Claude Code and Pi — while keeping the generic skill tool-agnostic and CC/Pi behavior unchanged (spec Req 1–19).

## How

- **Team coordination** is delegated to `@hueyexe/opencode-ensemble`, used strictly as a coordination layer (spawn-by-name, peer-to-peer messaging, shared task board, per-agent model selection, always-on supervision). Its native per-teammate-worktree + squash-merge behavior is structurally neutralized by passing `worktree: false` unconditionally on every `team_spawn`.
- **One worktree / one branch** is preserved by creating the worktree with plain `git worktree add -b worktree-<slug>` and launching a fresh opencode instance rooted inside it as the lead (opencode's instance directory is immutable for the session), then spawning all teammates `worktree: false`.
- **Agents** install as `<name>.md` with converted frontmatter (`description` verbatim, `mode: subagent`; no `name`/`model`/`permission`) and byte-identical bodies — the shared root `agents/` stays the single edit point, transformed at build time.
- **Per-agent model** is the provider-qualified `provider/model` string read from `.rp.md` and passed as the `team_spawn({ model })` arg.
- **Health monitoring** is ensemble's always-on supervision; the orchestrator reacts within the same 2-retry budget and escalates on the 3rd occurrence — nothing to launch/list/cancel. Thresholds live in `.opencode/ensemble.json`.
- **Packaging** is a publishable meta-plugin re-exporting ensemble (`{ ...ensembleHooks, ...RP }`, RP empty today); agents and the skill tree are delivered file-based via the Setup action, with destinations keyed to artifact-storage mode, exactly as Pi does.

## Key decisions

- **Follow the existing per-tool pattern** rather than making the generic skill opencode-aware — one convention file + one packaging artifact + the two authorized generic edits, keeping every other generic file literally true as no-ops. (Alternatives: tool-branching the generic skill; a bespoke opencode monitor loop — both rejected as adding forbidden coupling with no opencode primitive to build on.)
- **`worktree: false` unconditional on every spawn** — ensemble's read-only auto-detection only matches the literal `plan`/`explore` agent strings (which no RP agent satisfies), so omitting it on any spawn silently arms a per-agent worktree + squash-merge.
- **Re-export ensemble as the single meta-plugin entry** — listing ensemble alongside it double-initializes (two watchdogs, dashboard port collision), so the install rule is "list only the meta-plugin."
- **Pin ensemble exactly** — opencode caches unpinned plugins.
- **Sub-package version-synced, not changeset-targeted** — `sync-version.mjs` copies the root version outward (idempotent), so the single-package changeset validator needs no edit.

## Known limitations

- Two observability gaps are accepted by design and documented in `opencode.md`: the lead session's own auth/network failures are not auto-supervised (they surface in the owner's own session), and ensemble's hard-timeout path aborts/toasts but does not message the lead (the orchestrator covers detection by monitoring completion signals).
- The recovery rule names `opencode models` as the documented mechanism; its command/output surface could shift across opencode releases, while the rule's intent (enumerate authenticated models, pick a different one) remains primary.
