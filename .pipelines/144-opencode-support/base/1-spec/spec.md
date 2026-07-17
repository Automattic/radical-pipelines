# Spec: Support opencode as an agentic coding tool

## Overview

Radical Pipelines (RP) runs teams of agents autonomously through a pipeline of five phases (Intent, Spec, Design doc, Build, Document), each producing committed, inspectable artifacts. Today RP runs only on Claude Code, where its support is deliberately thin: RP ships a skill tree, agent profiles, and a packaging artifact, and consumes the coordination primitives — named-agent spawning seated in a worktree, directed inter-agent messaging, and a recurring health loop — from the tool itself. This feature adds opencode as a second supported tool: an owner using opencode can install RP — its agents, its skill, and the coordination layer it needs to run agent teams — and run pipelines end-to-end through all phases.

The target is opencode v2 (the public beta, `opencode2` binary, npm `next` tag), pinned to one exact build because the beta's APIs may break between builds. Research verified what v2 provides natively — session creation accepting an agent, a model, and an explicit working directory; SKILL.md skills with progressive disclosure, including scanning of `.claude/skills/`; on-disk agent profiles invokable by name — and what it lacks: no recurring-loop primitive, no in-process registration of agents or commands (a plugin can add tools and skill sources only), no CLI plugin install (config-only, with Git sources undocumented), and no plugin version reporting. The support therefore combines native opencode capabilities with an RP-owned layer supplying the missing coordination pieces, following RP's per-tool pattern: a conditionally-loaded opencode tool-convention file plus an opencode packaging artifact, while the generic skill stays tool-agnostic. The concrete distribution channel, plugin architecture, and session-ledger mechanics are design-phase decisions; this spec fixes the observable outcomes they must produce.

## Requirements

1. **Install.** An owner using opencode v2 can install RP — its agents, its skill, and the coordination layer it needs — by following a documented procedure that uses native opencode mechanisms only (no opencode-ensemble or other third-party team layer); following it on the pinned build yields a working installation.
2. **Pinned target.** RP declares one exact pinned opencode v2 build (CLI and plugin package versions) as its supported target; the documented install disables opencode auto-update; builds other than the pin are outside the verified surface.
3. **Pinned verification.** The declared pin is backed by integration tests that exercise RP's opencode layer against exactly that build and pass.
4. **Version discoverability.** After install, the owner can determine the installed RP version through an RP-provided surface (opencode reports plugin IDs, not versions).
5. **Update.** An owner can update an existing installation to a newer RP release via a documented procedure.
6. **Skill loads unchanged.** RP's existing skill tree loads under opencode with progressive disclosure, without modification to the generic skill files.
7. **Agents available.** After install, the full RP agent set is available under opencode by the same agent names as on Claude Code, with equivalent instructions governing each agent's behavior.
8. **Per-tool pattern.** The opencode support consists of a conditionally-loaded opencode tool-convention file (a new row in setup's Tool→Read table) plus an opencode packaging artifact; no opencode-specific content appears in the generic skill.
9. **Setup.** Running RP setup under opencode yields a committed `.rp.md` with the shared conventions plus an opencode per-tool section — Team spawning and Health monitoring required, Agent models optional — in opencode-native form; canonical per-tool conventions inform the owner rather than ask; the worktree root is git-ignored.
10. **Tool-mismatch guard.** Running RP under a tool that does not match the committed `.rp.md`'s per-tool section does not proceed under the other tool's conventions; the owner is informed and offered setup for the active tool.
11. **Team spawning.** During a run on opencode, the orchestrator can spawn each RP agent by name with an assigned model, seated in a specified worktree whose working directory stays fixed for the agent's lifetime, and receives a stable identifier for it plus a notification when it completes.
12. **Messaging.** Directed messages flow by identifier between the orchestrator and any spawned agent, and between agents (lead ↔ researcher), in both directions.
13. **Health loop.** RP provides on opencode a recurring health-loop facility with the same contract as on Claude Code: start with an interval and prompt, list active loops, cancel by identifier, fire only when the orchestrator is idle (no overlapping turns), and persist across orchestrator sessions so a leftover loop can be listed and cancelled from a new session.
14. **Liveness recovery.** The health monitor's observations and recovery actions are executable against RP agents under opencode: per-agent recent-output/idle state, message-delivery state, and auth/network error surfacing are observable; status ping, agent restart, message re-send, model-swap + re-spawn, and propagation of a changed identifier all work.
15. **End-to-end run.** On a pinned opencode v2 install, an owner can take an issue end-to-end: all five phases' required artifacts committed on the run branch, followed by close-out — health monitor stopped, run branch pushed, owner informed.
16. **Resume.** After an orchestrator interruption, the owner can resume the run per the skill's git-based resume: the leftover health loop is cancellable, the run worktree is recreatable from the branch, and the run continues from committed state to completion.

## Out of Scope

1. **opencode v1 support.** The intent targets v2 only; the owner's earlier v1-first targeting decision was explicitly superseded. RP under opencode v1 stays observably unsupported.
2. **opencode builds other than the declared pin.** Tracking the moving `next` tag is explicitly not the model; behavior on other builds is unverified, not promised.
3. **Adapting to a future v2 GA.** No GA exists or is dated; re-pinning and adapter simplification as v2 stabilizes are follow-up work.
4. **opencode-ensemble or any third-party team layer.** The integration rests on native opencode capabilities plus an RP-owned layer.
5. **Simultaneous multi-tool use of one repo.** One committed `.rp.md` serving two tools at once is un-contemplated by RP's design and not asked for; the mismatch case is covered by the guard in requirement 10, not by coexistence.
6. **Reattaching in-flight agent sessions across orchestrator restarts.** RP's resume is deliberately git-based — incomplete work re-runs from committed state.
7. **RP's behavior under Claude Code stays observably unchanged.** The generic skill gains no opencode awareness; the Claude Code install flow, conventions, and runtime behavior remain as they are.

## Acceptance Criteria

- Given a machine with the pinned opencode v2 build and no RP, when the owner follows the documented install procedure, then RP's skill is invokable, every RP agent is available by its RP name, and opencode auto-update is disabled per the procedure.
- Given an installed RP under opencode, when the owner consults the RP-provided version surface, then it reports the installed RP version.
- Given an installed RP under opencode in a repo with no `.rp.md`, when the owner runs RP setup, then a committed `.rp.md` exists containing the shared conventions and an opencode per-tool section with Team spawning and Health monitoring, the canonical per-tool values were informed rather than asked, and the worktree root is listed in `.gitignore`.
- Given a repo whose committed `.rp.md` carries another tool's per-tool section, when the owner runs RP under opencode, then the run does not proceed under that other tool's conventions and the owner is informed and offered setup for opencode.
- Given a set-up repo under opencode, when the orchestrator spawns an RP agent by name with an assigned model into a given worktree, then the agent runs with its working directory fixed to that worktree for its lifetime, the orchestrator holds a stable identifier for it, and the orchestrator is notified when it completes.
- Given a spawned agent, when the orchestrator or a peer agent sends it a directed message by identifier, then exactly that agent receives it and can reply — and lead ↔ researcher exchanges work the same way.
- Given a running autonomous run, when the health loop is started with an interval and prompt, then it appears in the loop list, fires only when the orchestrator is idle, and stops when cancelled by its identifier.
- Given a health loop left over from a previous orchestrator session, when a new session lists loops, then the leftover appears and can be cancelled before a new one is launched.
- Given an agent that has produced no output past the threshold, when the health monitor acts, then it can ping the agent for status and, on a second failure, restart it — and if the restart changes the agent's identifier, the agents that message it receive the new one.
- Given a spawned agent hitting a provider authentication error, when the health monitor acts, then it can swap to an authenticated provider-qualified model per the Agent models convention and re-spawn the agent on it.
- Given a pinned opencode v2 install and a test issue, when the owner runs an autonomous pipeline to the last phase, then every phase's required artifacts are committed on the run branch and close-out completes: health monitor stopped, run branch pushed, owner informed.
- Given a run interrupted mid-phase, when the owner resumes in a fresh orchestrator session, then the leftover health loop is cancelled, the run worktree is reused or recreated from the branch, and the run continues from committed state to completion.
- Given the pinned build, when RP's opencode integration tests run against it, then they pass.
- Given an existing Claude Code installation of RP, when it is used as before, then its install flow, conventions, and runtime behavior are unchanged.
