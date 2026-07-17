# Spec Research: Support opencode as an agentic coding tool

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

## Q&A

### Q1: What does RP's existing Claude Code support consist of, concretely — and what capabilities does RP consume from Claude Code to run a pipeline?

Enumerate, with file paths: (a) the conditionally-loaded tool-convention file for Claude Code and what it documents; (b) the packaging artifact and how an owner installs RP on Claude Code today (steps, what lands where, version reporting if any); (c) every capability the orchestrator and agents consume from the tool during a run — agent spawning/addressing by name, inter-agent messaging, worktree/branch handling, the `/loop` (or equivalent) health-loop contract, skill loading, permissions — as observable behaviors. This is the parity baseline the opencode support must match.

**A:** RP's Claude Code support is deliberately thin: RP ships only a skill tree, agent profiles, and two plugin manifests. It ships no coordination layer of its own — teammate spawning, worktree seating, inter-agent messaging, and the recurring loop are all consumed from the tool. Details:

(a) **Tool-convention file:** `skills/radical-pipelines/reference/conventions/claude-code.md` (21 lines), the only per-tool file in `skills/radical-pipelines/reference/conventions/`. Loaded only during the setup flow: `setup.md` step 1 has a Tool→Read table (currently one row: Claude Code → claude-code.md) keyed off the active tool inferred from the conversation; setup step 3 re-consults it for an optional "Setup actions" section (claude-code.md has none). At run time only `.rp.md` is read (`load.md`) — the per-tool conventions are baked into `.rp.md` at setup. The file documents: canonical-form conventions (inform the owner, don't ask), worktree root must be inside the repo, and the canonical `.rp.md` blocks for **Team spawning** and **Health monitoring**.

(b) **Packaging + install:** `.claude-plugin/plugin.json` (name `radical-pipelines`, version 0.10.0) and `.claude-plugin/marketplace.json` (catalog `automattic`, single plugin, `source: "./"`). The plugin bundles the skill at `skills/radical-pipelines/` and 17 agent profiles at `agents/`. Install (README.md:63-102): `/plugin marketplace add Automattic/radical-pipelines` + `/plugin install radical-pipelines@automattic` (lands in Claude Code's per-version cache); local-checkout and `--plugin-dir` dev variants exist. Skill invoked as `/radical-pipelines:radical-pipelines`. Version: `package.json` is the source of truth; CI (`scripts/sync-version.mjs`) syncs `plugin.json`, which is what `/plugin` displays.

(c) **Capabilities consumed from the tool, as observable behaviors:**
1. *Agent spawning + addressing*: spawn each agent as a named teammate; spawn result includes an identifier used to address messages (claude-code.md:12; autonomous-workflow.md:63-68).
2. *Seating in a worktree at spawn*: a teammate starts in the orchestrator's shell cwd; the orchestrator seats it by `cd` worktree → spawn → `cd` back. Claude Code's session-wide worktree tools (`EnterWorktree`/`ExitWorktree`) are explicitly forbidden during a run (claude-code.md:12). opencode v2 session creation taking an explicit working directory removes this hazard.
3. *Inter-agent messaging*: directed messages by identifier, both directions; leads drive researcher Q&A via a passed identifier; agents report completion to the orchestrator.
4. *Worktree/branch handling*: raw `git worktree`, orchestrator-owned topology, one branch per pipeline — git-native, ports unchanged.
5. *Health loop*: what the skill actually specifies (claude-code.md:14-20; this repo's `.rp.md:105-111`): start via `/loop <interval> <prompt>`, list via `CronList`, cancel via `CronDelete`; leftover loops from a previous session must be cancelled before launching a new one (health-monitoring.md:79). "No overlapping turns" is NOT in the skill text — it is a property of the underlying loop primitive ("Loops only fire when the agent is idle"), verified in the bundled loop package's SKILL.md. Parity contract: start / list / cancel + fire-only-when-idle + cancel-leftovers-before-restart.
6. *Skill loading*: SKILL.md + on-demand `reference/**` (progressive disclosure); agent profiles registered as invokable agent types by frontmatter `name`.
7. *Permissions*: not a documented dependency; RP assumes agents have broad, non-interactive tool access (shell/git, file I/O, web, spawn/message/loop primitives). Only permission mention in the skill is setup.md:213 (asking the owner before appending a `.gitignore` line).
8. *Other*: `## Conventions` block passed at spawn (tool-agnostic, ports unchanged); guardrail gate commands run via shell (tool-agnostic); the Agent-models convention passes a tool-native model string verbatim at spawn — values are per-tool opaque, mechanism unchanged; underpins health-monitor login-error recovery (health-monitoring.md:34).

Net parity checklist derived by the researcher: (1) spawn a named agent with an assigned model seated in a specified working directory; (2) stable per-agent handle for directed messages; (3) completion notifications; (4) raw git worktree use; (5) recurring loop with start/list/cancel firing only when idle; (6) SKILL.md progressive-disclosure loading + agent-profile registration; (7) broad non-interactive tool access. Items 1, 2, 3, 5 are the ones opencode lacks natively per the intent; 4, 6, 7 largely port as-is.

**Reasoning:** The skill's tool-specific surface is confined to setup (`setup.md` Tool→Read table) and the canonical `.rp.md` blocks; agent profiles never name a tool primitive (project rule), so parity is achieved at the convention/packaging layer, not by editing agents or the generic skill.

### Q2: Is opencode v1 support out of scope, and what does "compatible with opencode v2" mean as an observable outcome — support for one pinned `0.0.0-next-*` build, or tracking the moving beta?

The intent's constraint says "Must be compatible with opencode v2 (the public beta, `opencode2`)" and its assumptions lean toward pinning an exact build with auto-update disabled. Check issue Automattic/radical-pipelines#144 (body and comments) for the owner's explicit direction: (a) whether v1 support was considered and rejected/deferred, and why; (b) whether "compatible with v2" was framed as a single pinned build RP declares and is verified against, with newer beta builds explicitly best-effort; (c) any stated expectation about what happens when v2 GA arrives.

**A:** Grounded in the owner's comments on issue #144 (body + 6 comments; comments 2–6 by the owner). Framing caveat: the issue BODY is stale — it describes the superseded Ensemble-based plan; current direction lives in comments #4 (native-first design) and #6 (v2-first pivot), from which intent.md was synthesized.

(a) **v1:** considered — initially recommended as the baseline (comment #4: "The supported baseline should be the latest stable release, currently `v1.18.3`") — then explicitly superseded (comment #6: "This comment supersedes the **V1-first targeting decision**, not the V1 findings or the verified V1 GitHub-install behavior"). v1's residual status is a conditional fallback: "A thin V1 adapter is justified only if Radical Pipelines needs production-stable OpenCode support before V2 is ready." The issue is silent on an explicit "v1 out of scope" or "v1 must keep working" statement; the affirmative scope in intent.md names only v2.

(b) **"Compatible with v2" = pin-and-verify, not tracking the beta.** Comment #6: "A reproducible RP spike should pin the exact CLI and plugin versions and set global `\"autoupdate\": false`"; "the new implementation should be **V2-first, without Ensemble**, and advertise a pinned minimum beta build until V2 stabilizes"; "The plugin entrypoints and session contracts may still break between `0.0.0-next-*` builds. RP needs an explicit compatibility matrix and pinned integration tests." The best-effort-vs-unsupported status of builds newer than the pin is not explicitly drawn.

(c) **GA:** silent — no GA date exists; the pin is framed as temporary ("until V2 stabilizes") and the adapter should shrink as upstream matures ("delegate/remove custom pieces when OpenCode eventually exposes them"), but no explicit GA-triggered work item is stated.

**Reasoning:** The owner's later comments supersede the issue body; intent.md is the authoritative synthesis. Where the owner is silent, the boundary is the lead's decision, recorded as such.

**Sources:** Issue Automattic/radical-pipelines#144 body and comments #2–#6 (read via `gh`), quotes verbatim; intent.md Constraints and Assumptions.

**Evidence:**
- v1-first was superseded — comment #6 quote: "This comment supersedes the V1-first targeting decision" → confirmed verbatim.
- Pin-and-verify with auto-update off — comment #6 quotes: pin exact CLI+plugin versions, `"autoupdate": false`, "advertise a pinned minimum beta build until V2 stabilizes", compatibility matrix + pinned integration tests → confirmed verbatim.
- Silence on explicit v1-out-of-scope, newer-build status, and GA plan — full read of body + all comments → no such statements found.

**Lead's scope decisions from Q2 (recorded as lead decisions, not owner statements):**
1. opencode v1 support is out of scope — the intent's affirmative constraint targets v2 only, the v1-first decision was superseded, and v1's fallback condition (needing production-stable support before v2 is ready) is asserted nowhere.
2. "Compatible with v2" is specced as: RP declares one exact pinned v2 build (CLI and plugin package versions) it is verified against, with auto-update disabled in the documented install; builds other than the pin are outside the verified surface (unverified, not promised).
3. Adapting to a future v2 GA (re-pin, simplification as upstream matures) is out of scope for this feature — follow-up work when v2 stabilizes.

### Q3: What, per the skill, is the observable lifecycle an owner goes through from install to completed pipeline — and what must setup produce?

Enumerate from the skill (not from tool docs): (a) the full set of conventions `setup.md` writes into `.rp.md` (required vs optional), so the spec can state what a completed opencode setup must yield; (b) the pipeline phases by name and the artifacts each produces; (c) any definition of pipeline/run completion the skill states (when is a pipeline "done", what happens at the end — merge, PR, cleanup); (d) whether the skill contemplates one repo being used with more than one tool (e.g., `.rp.md` committed with one tool's conventions while another owner runs a different tool) — how `.rp.md` relates to the repo vs the owner. This grounds the end-to-end success criteria and tells me whether multi-tool coexistence needs a requirement or an exclusion.

**A:**

(a) **Setup output.** `.rp.md` conventions (loader table `reference/conventions/load.md:7-18`; shared/per-tool split `README.md:118`): required — Issues, Branch name base, Pipeline family folder, Worktree root, Artifact storage (shared) + Team spawning, Health monitoring (per-tool); optional — Commit format, Guardrails (shared) + Agent models (per-tool). Per-tool conventions with a tool-fixed canonical form are not owner-authored — setup pulls them from the tool rules file and informs the owner (setup.md:29). A completed opencode setup must observably yield: (1) a committed `.rp.md` on the artifact-bearing main branch (setup.md:202-207) with the shared section plus an opencode per-tool section (Team spawning + Health monitoring required, Agent models optional) in opencode-native form; (2) a `.gitignore` entry for the worktree root (setup.md:209-215); (3) any one-time actions from a "Setup actions" section in the opencode rules file, if present (setup.md:183-189); (4) fork remotes/formats only under `artifacts-in-fork` (setup.md:149-181).

(b) **Phases and required artifacts** (SKILL.md:33-39; completion table `reference/pipeline-versioning.md:53-59`): 0 Intent → `intent.md`; 1 Spec → `spec-research.md`, `spec.md`, `spec-review-approved.md`; 2 Design doc → `design-doc-research.md`, `design-doc.md`, `design-doc-review-approved.md`; 3 Build → `build-plan.md`, `build-plan-review-approved.md`, `build-review-approved.md`, `build-summary.md` (plus actual code + tests per SKILL.md:38); 4 Document → `document-plan.md`, `document-plan-review-approved.md`, `document-review-approved.md`, `document-summary.md`. Artifacts live at `<pipeline-family-folder>/<run>/<phase>` (pipeline-versioning.md:34-40).

(c) **Completion.** A phase is complete when all its required artifacts are committed (pipeline-versioning.md:49-64); no separate "pipeline done" flag beyond phase 4's predicate on the latest run. A run stops at the owner-chosen target phase (default: last) or on blocker/cancel/failure (autonomous-workflow.md:18-22). Close-out (autonomous-workflow.md:89-95): stop the health monitor; push the run branch and remaining lane branches; tell the owner. No auto-merge/auto-PR in the generic close-out; branches remain (lane branches are merged into the run branch and deleted at lane approval — pipeline-versioning.md:32). Run-worktree teardown is implied by the general "remove worktrees when their work is done" (autonomous-workflow.md:40), not scripted in close-out.

(d) **Multi-tool in one repo: un-contemplated.** `.rp.md` is committed (artifacts-in-repo) and carries exactly ONE per-tool section for "the active tool" (README.md:118; `.rp.md:75`). `load.md` checks required-convention presence only — nothing verifies the per-tool section matches the tool RP is running under; with all required conventions present, setup is skipped (setup.md:222) and the orchestrator would follow the wrong tool's instructions (e.g., "Spawn each agent as a Claude Code teammate", `CronList`/`CronDelete`) under opencode. No tool-switch logic exists in setup re-runs (setup.md:197-200). `.rp.local.md` can locally override most conventions (load.md:28-34) but is per-working-copy and not presented as a multi-tool mechanism.

**Reasoning:** The completion predicate and close-out steps are stated once in the skill and identical across workflow modes, so the end-to-end criterion can be stated as artifact presence plus close-out actions. The mismatch gap in (d) only becomes reachable when a second tool exists — it is a consequence of this feature.

**Sources:** `skills/radical-pipelines/SKILL.md`, `reference/conventions/load.md`, `reference/conventions/setup.md`, `reference/pipeline-versioning.md`, `reference/autonomous-workflow.md`, `reference/autonomous-phases/1 - spec.md`, `2 - design-doc.md`, `README.md:106-118`, `.rp.md`.

**Evidence:**
- Required/optional convention set — load.md:7-18 table → confirmed by file read.
- Shared vs per-tool split — README.md:118 verbatim; `.rp.md:5` / `.rp.md:75` section headers → confirmed.
- Phase completion predicate and artifact table — pipeline-versioning.md:49-64 → confirmed.
- Close-out steps — autonomous-workflow.md:89-95 → stop monitor, push branches, tell owner; no merge/PR step.
- No tool-match guard — load.md:1-26 checks presence only; setup.md:222 skips setup when required conventions present; grep found no detection logic → confirmed.

**Lead's decisions from Q3:**
1. "End-to-end through all phases" is specced as: all five phases' required artifacts committed on the run branch, followed by close-out (health monitor stopped, run branch pushed, owner informed).
2. Simultaneous multi-tool use of one repo (one committed `.rp.md` serving two tools at once) is out of scope — un-contemplated by the design and not asked for by the intent.
3. The tool-mismatch edge case becomes reachable only once a second tool exists, so it belongs to this feature: running RP under a tool that does not match `.rp.md`'s per-tool section must not silently proceed under the wrong tool's conventions — the owner is informed and offered setup for the active tool. Outcome-level requirement; mechanism is design's choice.

### Q4: What does the skill's health-monitoring contract observably do during a run, and does the skill define any recovery/resume behavior for an interrupted run beyond cancelling leftover loops?

From `reference/health-monitoring.md` (and anything it references): (a) what the recurring health check observes and what actions it takes (stalled agents, failed agents, login errors, etc.) — the observable liveness contract the opencode support must be able to satisfy; (b) whether the skill defines resuming an interrupted run (orchestrator session restart mid-run, dead agents on return) — what an owner does, and what must survive the interruption for that to work. This decides whether the spec needs an explicit recovery requirement for opencode or whether run-liveness is fully covered by the health-monitoring + spawning + messaging parity requirements.

**A:**

(a) **Liveness contract** (health-monitoring.md; autonomous mode only — assisted mode uses no monitor, :6). Launched at run start after the run worktree exists (:8-10); defaults 5-min interval / 10-min no-output threshold, owner-tunable (:12). Observes four signals (:16-25): no-output stall, message failure (failed/errored/undelivered), login/API-key error (agent or orchestrator), transient network failure — reading worktrees (last commits, agent logs if available) and messaging state (:25). Acts with a 2-retry budget per issue occurrence, then escalates (:27-38): stall → ping with status request, then restart the agent; message failure → re-send, then restart the target; login error → swap to an authenticated provider-qualified model (per Agent models), then re-spawn on it; network failure → retry once, then wait an interval and retry. When a restart/re-spawn changes an agent's identifier, the new one is sent to the agents that message it (:66). Escalation to owner carries agent name, error verbatim, last-known progress, suggested next step (:40-48). So the opencode layer must make observable, per spawned agent: recent-output/idle state, message-delivery state, auth-error and network-error surfacing; and must support the actions: status ping, restart, re-send, model-swap + re-spawn, identifier propagation.

(b) **Resume is defined — owner-initiated and git-based, not session reattachment** (`resume-pipeline.md`, entered from `work-on-an-issue.md:27,33`). In a fresh session the owner picks Resume: (1) cancel any leftover health monitor — "a loop from a previous session persists until cancelled" (:7-9); (2) locate the latest run branch, reuse its worktree or recreate it from the branch (:11-13); (3) evaluate per-phase completion predicates and read active-phase artifacts (:15-17); (4) resume point (:19-30): next phase, or investigative re-dispatch from the last complete task (build/document with approved plan; "The commits and the diff are the only record of task progress", :23), or clean restart of the phase after owner confirmation. Only git-committed state must survive: the pushed run branch + committed artifacts + branch namespace. The skill is silent on reattaching in-flight agent sessions — dead agents are not reattached; incomplete work re-runs from committed state. The only cross-session mechanics named: the health loop persists and must be cancellable from the next session (resume-pipeline.md:9), and spawning must work "across orchestrator sessions" (setup.md:73).

**Reasoning:** Within-run liveness maps onto spawning/messaging/loop parity plus the recovery actions; cross-session resume is git-native by design, so no reattachment requirement exists to port. The one opencode-specific property resume depends on is a health loop that is durable across sessions and cancellable from a new session.

**Sources:** `skills/radical-pipelines/reference/health-monitoring.md`, `resume-pipeline.md`, `work-on-an-issue.md`, `conventions/setup.md:73`.

**Evidence:**
- Four observed signals and the recovery table — health-monitoring.md:16-25, :30-35 → confirmed by file read.
- Identifier propagation after restart — health-monitoring.md:66 → confirmed.
- Assisted mode has no monitor — health-monitoring.md:6 → confirmed.
- Resume flow and its git-only survival requirement — resume-pipeline.md:7-30 → confirmed; uncommitted work discarded, worktree recreated from branch.
- No session-reattach concept — search across `skills/` for reattach/rehydrate/resume-session → only the git-based resume flow found.

**Lead's decisions from Q4:**
1. Run-liveness on opencode is covered by the parity requirements plus one explicit outcome: the health monitor's observations and recovery actions (status ping, restart, re-send, model-swap + re-spawn, identifier propagation) must be executable against RP agents running under opencode.
2. Explicit requirement: the health loop is durable across orchestrator sessions and cancellable from a new session — resume depends on it, and opencode has no native loop.
3. No "reattach in-flight agent sessions" requirement — the skill's resume is deliberately git-based; reattachment is recorded as out of scope.

**Sources:** `skills/radical-pipelines/reference/conventions/claude-code.md`, `setup.md`, `load.md`, `passing.md`, `skills/radical-pipelines/reference/health-monitoring.md`, `autonomous-workflow.md`, `create-pipeline.md`, `guardrails.md`, `agents/*.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md:63-137`, `package.json`, `scripts/sync-version.mjs`, `.rp.md`, `~/.claude/plugins/cache/automattic/radical-pipelines/` (installed-cache layout), bundled `@pi-agents/loop` SKILL.md (0.6.0 cache).

**Evidence:**
- claude-code.md is the only per-tool convention file — `ls skills/radical-pipelines/reference/conventions/` → `claude-code.md`, `load.md`, `passing.md`, `setup.md`.
- The convention file is read only at setup, keyed off the active tool — setup.md:15-24 (Tool→Read table) and setup.md:183-189 (Setup actions re-read); load.md reads only `.rp.md` → confirmed by file reads.
- RP bundles no coordination runtime — `package.json` lines 10-18: only `@changesets/*` devDeps, no runtime deps; `plugin.json` has no extensions/hooks → confirmed.
- Install lands per-version in the plugin cache — `ls ~/.claude/plugins/cache/automattic/radical-pipelines/` → versions 0.6.0…0.10.0 present.
- Health-loop contract is start/list/cancel + cancel-leftovers — claude-code.md:14-20, `.rp.md:105-111`, health-monitoring.md:79 → confirmed by file reads.
- "No overlapping turns" comes from the loop primitive, not the skill — grep "overlap"/"turn"/"concurrent" across `skills/` → no hits; bundled loop SKILL.md states "Loops only fire when the agent is idle (not streaming)".
- Permissions are not a skill-level dependency — grep permission/allowlist/sandbox/tool-access across `skills/` and `agents/` → single hit at setup.md:213 (.gitignore consent).
- Version flow — README.md:130-137 + `scripts/sync-version.mjs`; all four version-bearing spots read 0.10.0 → confirmed.

## Research

### Current state of opencode v2 vs. the parity checklist (requested after Q1)

_Request:_ Verify, against opencode as it exists today, each Context claim the intent rests on and each item of the Q1 parity checklist: (1) current status of v1 and the v2 beta (`opencode2` binary, npm `next` tag) — versions, any prerelease/GA change; (2) whether v2's plugin API registers agents, skills, commands, and tools in-process; (3) whether v2's public session creation accepts an agent, a model, and an explicit working directory; (4) whether SKILL.md progressive-disclosure loading and `.claude/skills/` scanning hold in v2; (5) opencode agent-profile format (frontmatter, invocation by name) and where profiles live; (6) absence of a native recurring-loop/cron primitive; (7) the direct-from-Git plugin install mechanism under v2, including refresh of a moving ref and version reporting. Use the preserved findings in issue Automattic/radical-pipelines#144's comments as a starting point, but verify current state independently — the intent may predate API changes.

_Findings (verified 2026-07-17; canonical repo is now `anomalyco/opencode`, default branch `dev`, v2 work on branch `v2`; v2 docs at https://v2.opencode.ai/):_

1. **v1/v2 status — CONFIRMED.** npm `opencode-ai@latest` = 1.18.3 (bin `opencode`); GitHub newest release v1.18.3 (2026-07-16). v2 beta: npm `@opencode-ai/cli@next` = `0.0.0-next-15718` (published 2026-07-17, bin `opencode2`), coexisting with v1 as a separate package+binary. No GA or tagged prerelease: repo has only v1.x tags; npm only `0.0.0-*` snapshots. v2 docs carry an explicit beta warning ("we may wipe your data… APIs, configuration, and plugin APIs may change"; "During beta, the binary is called `opencode2`"). Caveat: npm `@beta`/`@dev` dist-tags are NOT v2 (bin `lildax`, a different lineage — the `opencode-beta` desktop app); only `@next` maps to `opencode2`.
2. **Plugin API in-process registration — CONTRADICTED AS STATED.** The intent's Context says v2's plugin API "can register agents, skills, commands, and tools in-process." Reality (verified in `packages/plugin/src/v2/effect/*.ts` on branch `v2` and the API table at https://v2.opencode.ai/build/plugins.md): only TOOLS (`ToolDraft.add`) and SKILL SOURCES (`SkillDraft.source`) can be added in-process. `AgentDraft` = list/get/default/update/remove — no `add`; `CommandDraft` = list/get/update/remove — no `add`. Agents and commands must exist as on-disk files that opencode discovers; a plugin can transform but not create them. Also: npm `@opencode-ai/plugin@latest` is still the v1 hooks API; the v2 `Plugin.define`/`ctx.*.transform` API exists only on the beta build — the plugin package must be pinned to the matching `0.0.0-next-*` build.
3. **Session creation with agent + model + directory — CONFIRMED.** Public `session.create` accepts `agent?`, `model?`, `location?` with `{ directory: AbsolutePath, workspaceID? }` (`packages/protocol/src/groups/session.ts`, `packages/schema/src/location.ts`; https://v2.opencode.ai/api-reference/session/create-session). Open limitations (design constraints, already known to the issue): `session.create` has no `parentID`; `session.fork` takes no location (inherits parent directory) — no linked child in a different worktree via public API (anomalyco/opencode#36605 OPEN, updated 2026-07-13). Plugin `ctx.session` is a restricted subset omitting wait/active/resume/fork/list/remove and job ops (#34957 OPEN); child→parent completion durability across restart open (#36349). Native `subagent` tool takes only agent/description/prompt/background and inherits parent location — confirming RP needs its own spawn wrapper, consistent with the intent.
4. **SKILL.md + `.claude/skills/` scanning — CONFIRMED.** One directory per skill with SKILL.md; advertisement is id/name/description only, supporting files read on demand (progressive disclosure). v2 scans global `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills` and project `.opencode/skills`, `.claude/skills`, `.agents/skills` (walked up to the git worktree); opt-out env `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`. RP's existing skill tree loads unchanged if placed under a scanned path (`packages/core/src/skill/discovery.ts`; https://v2.opencode.ai/skills.md).
5. **Agent-profile format — CONFIRMED, with an asymmetry flag.** Profiles live at project `.opencode/agents/<name>.md` or global `~/.config/opencode/agents/<name>.md`; agent name/ID derives from the FILENAME/path (nested path namespaces the ID) — there is NO `name` frontmatter field. v2 frontmatter: `description`, `mode` (primary/subagent/all), `model`, `system`, `color`, `steps`, `permissions` (legacy v1 fields discouraged). Invocation: subagents by `@` mention; primary agents via Tab-cycling. **Asymmetry:** v2 scans `.claude/skills/` but NOT `.claude/agents/` (repo search: zero hits) — Claude Code agent profiles do NOT auto-load; RP's agents must be emitted into `.opencode/agents/` in opencode's format (https://v2.opencode.ai/agents.md; `packages/web/src/content/docs/agents.mdx`).
6. **No native loop/cron — CONFIRMED.** No loop/cron/schedule tool or CLI command in the v2 tree (built-in tools: edit, execute, glob, grep, mcp, patch, question, read, read-filesystem, shell, skill, subagent, webfetch, websearch, write; CLI handlers: api, auth, console, debug, mcp, migrate, mini, pair, run, serve, service). Only third-party `ByBrawe/opencode-loop` exists — confirming the gap. RP must supply its own scheduler.
7. **Direct-from-Git plugin install — CONTRADICTED/STRONGER THAN STATED.** v2 has NO `opencode plugin <url>` CLI command (no `plugin` handler in `packages/cli/src/commands/handlers/`, branch `v2`). Install is config-only via the `plugins` array in `opencode.json(c)`: package specifier or local path (`./`, `../`, absolute, `file://`). Git/`git+`/github specifiers are undocumented — untested whether they pass through to the npm resolver. Moving-ref refresh for git sources: undocumented; docs say restart after changing an npm package version. Version reporting: plugin VERSIONS still not reported; v2 adds enumeration of active plugin IDs via `opencode2 api get /api/plugin` (IDs only). Docs note: "Match the plugin package version to the OpenCode release you target." The v1 "raw GitHub URL + restart" story does not transfer; the distribution channel (npm publish vs local path vs untested git specifier) is an open design question.

**Evidence:**
- v1/v2 versions and tags — `npm view @opencode-ai/cli dist-tags/bin/time`, `npm view opencode-ai dist-tags/bin`, https://github.com/anomalyco/opencode/releases, https://v2.opencode.ai/ → v1.18.3 stable, `@next` = 0.0.0-next-15718 (bin `opencode2`), no 2.0 tag.
- `@beta`/`@dev` are not v2 — `npm view` bin fields → `lildax`; corroborated against `anomalyco/opencode-beta`.
- Plugin API surface — `packages/plugin/src/v2/effect/*.ts` (branch `v2`) + https://v2.opencode.ai/build/plugins.md → ToolDraft has `add`, SkillDraft has `source`; AgentDraft/CommandDraft have no `add`.
- session.create signature — `packages/protocol/src/groups/session.ts`, `packages/schema/src/location.ts` (branch `v2`) + API reference → accepts agent, model, location{directory}.
- No parent linking with location — `session.fork` has no location param; anomalyco/opencode#36605 open (2026-07-13).
- Skills scanning paths and progressive disclosure — `packages/core/src/skill/discovery.ts` + https://v2.opencode.ai/skills.md → confirmed, incl. `.claude/skills` and `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`.
- Agents not scanned from `.claude/agents` — repo-wide search for `.claude/agents` → zero hits; agents doc silent on it.
- Agent frontmatter and filename-derived names — https://v2.opencode.ai/agents.md + `packages/web/src/content/docs/agents.mdx` → confirmed.
- No native loop — tree search loop|cron|schedul|recur|interval|timer over branch `v2` → only the LLM tool-call loop; CLI handler list has no loop/schedule.
- No CLI plugin install in v2 — `packages/cli/src/commands/handlers/` listing (branch `v2`) → no `plugin` handler; docs describe config `plugins` array only.
- Plugin version reporting — v2 docs + `opencode2 api get /api/plugin` → active plugin IDs, no versions.

**Assessment adopted by the lead:** Items 1, 3, 4, 5, 6 confirm the intent. Item 2 corrects a Context sentence (in-process registration covers tools and skill sources only; agents/commands are on-disk) — the goal does not depend on that mechanism, since RP's agents can ship as on-disk profiles exactly as they do on Claude Code, so this is a recorded premise correction, not a blocker; no requirement may lean on in-process agent/command registration. Item 7 invalidates the specific "direct-from-Git" distribution assumption (which the intent itself marked as open and needing retest) — the requirement stays at the outcome level (an owner can install RP on opencode v2 via a documented procedure using native opencode mechanisms) and the channel choice moves to the design phase with a mandatory empirical spike.

## Out of Scope

1. **opencode v1 support.** The intent's affirmative constraint targets v2 only; the owner's v1-first targeting decision was explicitly superseded, and v1's fallback condition (needing production-stable support before v2 is ready) is asserted nowhere. RP under opencode v1 stays observably unsupported. (Q2)
2. **opencode builds other than the declared pin.** RP is verified against one exact pinned v2 build; tracking the moving `next` tag is explicitly not the model ("pin the exact CLI and plugin versions", auto-update disabled). Behavior on other builds is unverified, not promised. (Q2)
3. **Adapting to a future v2 GA.** No GA exists or is dated; the pin is framed as temporary "until V2 stabilizes." Re-pinning and adapter simplification are follow-up work. (Q2)
4. **opencode-ensemble or any third-party team layer.** Intent constraint; the integration rests on native opencode capabilities plus an RP-owned layer. (Intent Constraints; Research: opencode v2 state)
5. **Simultaneous multi-tool use of one repo.** One committed `.rp.md` serving two tools at once is un-contemplated by the design and not asked for by the intent; what this feature adds for the mismatch case is the guard in requirement 10, not coexistence. (Q3)
6. **Reattaching in-flight agent sessions across orchestrator restarts.** The skill's resume is deliberately git-based — incomplete work re-runs from committed state; no reattachment behavior exists to port. (Q4)
7. **RP's behavior under Claude Code stays observably unchanged.** The generic skill stays tool-agnostic and gains no opencode awareness; the Claude Code install flow, conventions, and runtime behavior remain as they are. (Intent Constraints; Q1)

## Consolidated Requirements

1. An owner using opencode v2 can install RP — its agents, its skill, and the coordination layer it needs — by following a documented procedure that uses native opencode mechanisms only; following it on the pinned build yields a working installation. (Intent Goal/Constraints; Q1; Research: items 1, 7)
2. RP declares one exact pinned opencode v2 build (CLI and plugin package versions) as its supported target; the documented install disables opencode auto-update; builds other than the pin are outside the verified surface. (Q2)
3. The declared pin is backed by integration tests that exercise RP's opencode layer against exactly that build and pass. (Q2 — owner's "explicit compatibility matrix and pinned integration tests")
4. After install, the owner can determine the installed RP version through an RP-provided surface (opencode reports plugin IDs, not versions). (Q1; Research: item 7)
5. An owner can update an existing installation to a newer RP release via a documented procedure. (Q1; Research: item 7)
6. RP's existing skill tree loads under opencode with progressive disclosure, without modification to the generic skill files. (Intent Constraints; Research: item 4)
7. After install, the full RP agent set is available under opencode by the same agent names as on Claude Code, with equivalent instructions governing each agent's behavior. (Q1; Research: items 2, 5)
8. The opencode support follows the per-tool pattern: a conditionally-loaded opencode tool-convention file (a new row in setup's Tool→Read table) plus an opencode packaging artifact; no opencode-specific content appears in the generic skill. (Intent Constraints; Q1)
9. Running RP setup under opencode yields a committed `.rp.md` with the shared conventions plus an opencode per-tool section — Team spawning and Health monitoring required, Agent models optional — in opencode-native form; canonical per-tool conventions inform the owner rather than ask; the worktree root is git-ignored. (Q3)
10. Running RP under a tool that does not match the committed `.rp.md`'s per-tool section does not proceed under the other tool's conventions; the owner is informed and offered setup for the active tool. (Q3)
11. During a run on opencode, the orchestrator can spawn each RP agent by name with an assigned model, seated in a specified worktree whose working directory stays fixed for the agent's lifetime, and receives a stable identifier for it plus a notification when it completes. (Q1; Research: item 3)
12. Directed messages flow by identifier between the orchestrator and any spawned agent, and between agents (lead ↔ researcher), in both directions. (Q1)
13. RP provides on opencode a recurring health-loop facility with the same contract as on Claude Code: start with an interval and prompt, list active loops, cancel by identifier, fire only when the orchestrator is idle (no overlapping turns), and persist across orchestrator sessions so a leftover loop can be listed and cancelled from a new session. (Q1; Q4; Research: item 6)
14. The health monitor's observations and recovery actions are executable against RP agents under opencode: per-agent recent-output/idle state, message-delivery state, and auth/network error surfacing are observable; status ping, agent restart, message re-send, model-swap + re-spawn, and propagation of a changed identifier all work. (Q4)
15. On a pinned opencode v2 install, an owner can take an issue end-to-end: all five phases' required artifacts committed on the run branch, followed by close-out — health monitor stopped, run branch pushed, owner informed. (Intent Goal; Q3)
16. After an orchestrator interruption, the owner can resume the run per the skill's git-based resume: the leftover health loop is cancellable, the run worktree is recreatable from the branch, and the run continues from committed state to completion. (Q4)

## Review Adjudications

### Round 1 (spec-review-1-rejected.md, reviewed revision cbee2b9)

- **Issue 1 — ADOPTED.** Acceptance criteria omitted requirement 5 (update) entirely and covered only two of requirement 14's four recovery paths. Fix: three criteria added to spec.md — the documented update procedure (version surface reports the newer release, updated skill and agents in effect); message-failure recovery (delivery failure observable → re-send → restart target on second failure); network-failure recovery (failure observable → retry once → wait one interval and retry before escalating). Requirements and record unchanged — the gap was coverage in spec.md only.
- Reviewer's verification-log observations noted without action: npm `@next` moved 15718 → 15756 within a day (strengthens the pin rationale recorded in Q2); the skills-scanning code cited in Research item 4 has moved on today's `v2` tree while the documented behavior holds (illustrates the same moving-beta premise).
