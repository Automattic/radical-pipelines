# Support opencode (via opencode-ensemble) as an agentic coding tool

> Source: GitHub issue Automattic/radical-pipelines#144 (https://github.com/Automattic/radical-pipelines/issues/144).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Radical Pipelines can run on opencode, the same way it already runs on Claude Code and Pi. An owner using opencode can install RP — its agents, the skill, and a team layer — and run pipelines end-to-end through all phases.

## Constraints

- Support must follow the existing per-tool pattern: a conditionally-loaded tool-convention file plus a packaging artifact, mirroring the Pi support. The generic skill stays tool-agnostic and must not become opencode-aware.

## Context

- **opencode-ensemble** (`https://github.com/hueyexe/opencode-ensemble`, npm `@hueyexe/opencode-ensemble`) is an opencode plugin providing agent teams: parallel agents in their own sessions, peer-to-peer messaging, a shared task board with dependencies, per-agent model selection, and built-in supervision (stall detection, timeout watchdog, fast-idle auth-failure escalation, crash recovery, message redelivery, dashboard).
- opencode natively supports SKILL.md skills with progressive disclosure and also scans `.claude/skills/`, so RP's existing skill tree loads without changes.
- opencode custom agents live in `.opencode/agent/*.md` (or inline config) and are invokable by name; their frontmatter differs from Claude Code's.
- Enabling fact: ensemble's `team_spawn` takes a free-form `agent` string and passes it to opencode's session prompt, so RP's named agents (spec-writer, code-reviewer, …) can be spawned by name — not limited to opencode's built-in `build`/`explore`.
- opencode has no native recurring-loop/cron primitive (no `/loop` equivalent).

## Assumptions / directions to explore

_All open — later phases may confirm or overturn._

- Use ensemble as a coordination layer only (spawn-by-name, messaging, task board, supervision) and bypass its default per-teammate-worktree + squash-merge model by spawning with `worktree: false` and managing one git worktree per pipeline — preserving RP's one-branch-per-pipeline model, as the Pi convention already does.
- Health monitoring may be satisfied by ensemble's built-in supervision instead of a launched loop (since opencode lacks `/loop`), with the orchestrator handling auth-error model-swap reactively.
- Packaging may take the form of a single npm meta-plugin that re-exports ensemble and registers RP's agents + skill + a command via opencode's plugin `config` hook (one-entry install); an installer/repo bundle that copies files into `.opencode/` is a fallback.
- Ensemble defaults (timeout, stall threshold, rate limit, `mergeOnCleanup`) likely need RP-specific tuning written to `.opencode/ensemble.json`.
- Runtime requirement: ensemble needs Node ≥ 24 (for `node:sqlite`) or Bun.
