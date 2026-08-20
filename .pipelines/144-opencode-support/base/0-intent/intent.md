# Support opencode as an agentic coding tool

> Source: Automattic/radical-pipelines#144 — https://github.com/Automattic/radical-pipelines/issues/144.
> This file is self-contained; agents do not need to open the source issue.

## Goal

Radical Pipelines can run on opencode, the same way it already runs on Claude Code. An owner using opencode can install RP — its agents, the skill, and the coordination layer it needs to run agent teams — and run pipelines end-to-end through all phases.

## Constraints

- Support must follow the existing per-tool pattern: a conditionally-loaded tool-convention file plus a packaging artifact, mirroring the existing Claude Code support. The generic skill stays tool-agnostic and must not become opencode-aware.
- Must not depend on opencode-ensemble. The integration is built on native opencode capabilities plus an RP-owned layer.
- Must be compatible with opencode v2 (the public beta, `opencode2`).

## Context

- opencode ships a stable v1 (currently v1.18.3) and a public v2 beta (`opencode2` binary, npm `next` tag); the two coexist. v2 is explicitly beta — data, config, server and plugin APIs may change, and there is no tagged prerelease or GA date.
- v2's plugin API can register agents, skills, commands, and tools in-process, and its public session creation accepts an agent, a model, and an explicit working-directory location — removing PR #147's hardest packaging problem and supplying the two parameters v1's native task tool lacked.
- opencode natively supports SKILL.md skills with progressive disclosure and also scans `.claude/skills/`, so RP's existing skill tree loads without changes.
- opencode custom agents live in tool-specific profile files, invokable by name; their frontmatter differs from Claude Code's.
- opencode has no native recurring-loop/cron primitive (no `/loop` equivalent).
- PR #147 was the first opencode spike, built on opencode-ensemble. It is superseded and being closed. Its v1 findings, the verified v1 GitHub-install behavior, and the v2 investigation are preserved in this issue's comments as reference.

## Assumptions / directions to explore

_All open — later phases may confirm or overturn._

- Pin an exact `0.0.0-next-*` v2 build with auto-update disabled, and de-risk with a short pinned feasibility spike before the full build, since v2 is a moving beta.
- Build the pieces opencode lacks as an RP-owned opencode plugin rather than a third-party team layer: spawn RP's named agents over native v2 sessions, each seated in an RP-created run/lane worktree, with a durable logical-name→session ledger and recovery, preserving RP's one-branch-per-pipeline model.
- Add an RP-specific health-loop scheduler matching the Claude Code `/loop` contract (start, list, cancel; no overlapping turns), since opencode has no native loop.
- Distribute via opencode's direct-from-Git plugin install; retest install, moving-ref refresh, and version reporting under the v2 service, since v2's plugin loading and caching differ from v1.
