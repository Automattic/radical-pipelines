# Design Doc: Support opencode as an agentic coding tool

## Overview

Radical Pipelines (RP) runs teams of agents through a five-phase pipeline. On Claude Code — its only supported tool today — RP ships just a skill tree, 17 agent profiles, and a plugin manifest, consuming the coordination primitives (named-agent spawning seated in a worktree, directed inter-agent messaging, a recurring health loop) from the tool itself. opencode v2 (the public beta, `opencode2` binary, npm `next` tag) provides sessions with an agent, a model, and a fixed working directory, plus SKILL.md skills and on-disk agent profiles — but no teammate layer, no cross-session messaging convention, and no recurring-loop primitive.

This design adds opencode as a second supported tool by pairing native opencode capabilities with one RP-owned **zero-dependency opencode plugin** that supplies the missing coordination layer as plugin-registered tools (`rp_spawn`, `rp_send`, `rp_loop_*`, `rp_status`), backed by opencode's own durable session store as the agent ledger and a small RP-owned loop registry. Distribution is a pinned GitHub specifier of this repository in the owner's opencode config; the skill loads by reference, unchanged; the agent profiles are materialized byte-for-byte into opencode's global agents directory by the plugin itself. The generic skill stays tool-agnostic: the per-tool surface is a new `opencode.md` convention file, one new row in setup's Tool→Read table, one tool-agnostic loader rule (the tool-mismatch guard), and the packaging artifact. Every load-bearing mechanism in this design was verified by live experiments against real v2 builds (`0.0.0-next-15757` in full; `0.0.0-next-15772` by smoke); the evidence record is `design-doc-research.md`.

## Approach

opencode v2 is client-server: a local HTTP server (background daemon at `127.0.0.1:4096` by default, or a standalone `serve` process) executes all sessions, protected by HTTP Basic auth (`opencode` / per-service password); `opencode2 api <method> <path>` auto-discovers and auto-authenticates against it. Session state is durable SQLite that survives server restarts; in-flight turns are per-process.

The mental model for the implementer:

1. **One plugin, two reach paths.** The RP plugin is a single zero-dependency JS module (`export default {id, setup(ctx)}` — the v2 `Plugin.define` is the identity function). Inside the server it registers RP's coordination tools, controls sessions via `ctx.session` (create/prompt/interrupt), and observes everything via `ctx.event.subscribe` (global across projects). What the restricted plugin ctx omits — session enumeration, `/wait`, `/active`, model switch — the orchestrator and the monitor reach over the public HTTP API via `opencode2 api` from the shell.
2. **The orchestrator is the owner's opencode session** with the RP skill loaded. RP agents are opencode sessions created by `rp_spawn` with an agent name, a parsed model, and an absolute worktree directory. The seat is fixed for the session's lifetime and cannot be moved by any agent-facing tool — the Claude Code `cd`-dance and `EnterWorktree` hazard have no opencode equivalent.
3. **The opencode session DB is the agent ledger.** Each spawned session durably carries its agent, model, directory, and timestamps; RP adds the logical name by setting the session title to `rp:<run-branch>:<agent-name>`. A module-singleton in-memory map serves live lookups; the title makes the ledger reconstructable from `GET /api/session` after any restart.
4. **Messages are cross-session prompt injections** with `delivery: "queue"` — durably admitted, never destructive to a running turn, observable in `/pending` until promoted. Sender attribution is derived by the plugin from the calling tool context, not from message content.
5. **The plugin module is imported once per daemon** (verified), while `setup(ctx)` re-runs per directory scope. All global concerns — the event listener that turns child `session.execution.succeeded/failed` into completion messages for the spawner, and the loop timers — live behind module-level singleton guards.
6. **The health loop is an in-daemon scheduler**: per-loop `setInterval` (drift-free in live tests), a durable registry file, and a per-tick idle check against `GET /api/session/active`; busy ticks are skipped, preserving the Claude Code `/loop` contract exactly (fire only when idle, no overlapping turns). The registry survives restarts; a project-scoped touch re-arms it.
7. **Everything is pinned.** RP declares one exact opencode build; installs disable auto-update; a hermetic integration suite exercises the RP layer against exactly the pinned CLI using an offline stub provider; `rp_status` compares the running build against the pin.

## Components

**New:**

- **opencode plugin module** (the packaging artifact, in this repo, referenced as the package entry point in `package.json`): zero-dependency single file. Registers tools (`rp_spawn`, `rp_send`, `rp_loop_start`, `rp_loop_list`, `rp_loop_cancel`, `rp_status`); registers the repo's `skills/` directory as a skill source (by reference, resolved from `import.meta.url`); materializes `agents/*.md` byte-for-byte into `~/.config/opencode/agents/` at setup (idempotent; overwrites only RP-owned files, reports collisions instead of clobbering foreign ones); hosts the singleton event listener and loop scheduler; id = `radical-pipelines@<version>` read from `package.json` at load.
- **`skills/radical-pipelines/reference/conventions/opencode.md`**: the conditionally-loaded per-tool convention file — canonical `.rp.md` blocks (below), the worktree-root-inside-the-repo constraint, and a Setup actions section that verifies the plugin is installed before conventions referencing `rp_*` tools are written.
- **Pin manifest** (inside the packaging artifact): the exact `@opencode-ai/cli` build string and the `@opencode-ai/plugin` package version whose API surface was verified. Consumed by the README install procedure, the integration suite, and `rp_status`.
- **opencode integration suite**: a dedicated script (not part of the default offline `npm test`) running the RP layer against exactly the pinned CLI in a fully XDG-isolated sandbox.
- **Loop registry**: `$XDG_DATA_HOME/radical-pipelines/loops.json` (fallback `~/.local/share/radical-pipelines/`).
- **README opencode section**: the documented install, update, and version procedures.

**Modified:**

- **`skills/radical-pipelines/reference/conventions/setup.md`**: one new Tool→Read row (opencode → `opencode.md`).
- **`skills/radical-pipelines/reference/conventions/load.md`**: one tool-agnostic rule — a convention under a per-tool section counts as present only when that section's tool matches the active tool; when this makes required conventions unavailable, the explanation names the mismatch and offers setup for the active tool.
- **`package.json`**: gains the plugin entry point (`main`/`exports`). Version sync is untouched — the plugin reads its version from `package.json` at runtime.

**Untouched but relevant:** the generic skill tree (loads unchanged under opencode's native SKILL.md progressive disclosure — id/name/description advertised, `reference/**` read on demand); the 17 agent profiles (copied byte-for-byte; opencode ignores the `name:` frontmatter key and derives the agent id from the filename, which already equals the RP name); `claude-code.md` and all Claude Code behavior; the health-monitoring loop-prompt template and recovery table (tool-agnostic).

## Interfaces and Data Flow

**Plugin tools** (registered via `ctx.tool.transform`, JSON-schema args, available in every session including spawned worktree sessions):

- `rp_spawn {name, agent, model, directory, prompt, run}` → validates `agent` against `ctx.agent.list()` (create does not validate — a typo would make a dead session); parses `model` from the convention's `provider/model[#variant]` string into `Model.Ref {providerID, id, variant?}` (the API rejects the string form); `ctx.session.create({agent, model, location:{directory}})`; records `sessionID → {name, run}` in the in-memory ledger map; posts the initial prompt; returns the **session ID — the stable identifier** for all addressing. The durable title `rp:<run>:<name>` is asserted by the completion listener after the first turn (opencode auto-generates a title on the first turn, overwriting earlier renames; titles set after the first turn persist).
- `rp_send {to: sessionID, message}` → resolves the sender from `toolCtx.sessionID` (unspoofable) via the ledger; delivers `ctx.session.prompt({sessionID: to, text: "[from <name> (<sid>)] " + message, delivery: "queue"})`, omitting `agents`/`resume`; a 404 (`SessionNotFoundError`) for a dead target returns synchronously as the tool result. The receiver sees a user-role message and replies with its own `rp_send`; its execution always runs under its own persisted agent+model.
- `rp_loop_start {interval, prompt}` (target defaults to the calling session) → registry entry + guarded `setInterval`; returns the loop id. Per tick: `GET /api/session/active`; target running → skip the tick; idle → inject the prompt (queue). `rp_loop_list` reads the registry; `rp_loop_cancel {id}` clears the timer and deletes the entry.
- `rp_status` → plugin version, pin vs running build (via `opencode2 --version` / the service record), ledger entries (name, session ID, agent, model, directory, `time.updated`, running?, pending count), and a bounded in-memory log of recent structured errors captured by the listener.

**Completion notifications:** the singleton listener (module-guarded `ctx.event.subscribe`, global across projects and worktrees) maps `session.execution.succeeded`/`.failed` on ledger sessions to their spawner and injects a completion message (queue delivery) into the spawner's session — plus re-asserts the child's durable title on its first terminal event.

**HTTP surface used by the orchestrator/monitor via `opencode2 api`:** `GET /api/session` (ledger reconstruction, `time.updated` liveness), `GET /api/session/active` (running-now), `GET /api/session/{id}/pending` (undelivered inputs), `POST /api/session/{id}/model` (`{model: Model.Ref}` — same-session model switch; applies from the next turn, non-disruptive mid-execution), `POST /api/session/{id}/interrupt` (non-destructive; session remains usable), `GET /api/plugin` (version surface).

**Install configuration** (owner's global `~/.config/opencode/opencode.json`):

```jsonc
{
  "plugins": ["github:Automattic/radical-pipelines#v<X.Y.Z>"],
  "autoupdate": false
}
```

then `opencode2 service restart`. One restart suffices: plugin `setup()` is awaited during scope init before agents are scanned, so materialized agents are usable immediately — and always before the orchestrator can spawn. Update = bump the tag, restart (the new spec installs to its own cache dir; the plugin refreshes materialized agents). Moving refs never refresh — only pinned tags are documented.

**Canonical `.rp.md` blocks** (written by setup from `opencode.md`, inform-not-ask; section heading `## opencode conventions`):

- *Team spawning:* spawn each agent with `rp_spawn` (name, agent, `provider/model[#variant]` string, absolute worktree path, initial prompt, run branch); the session's working directory is fixed for its lifetime; the result's session ID is the identifier for addressing messages; message via `rp_send`; completion notifications arrive automatically.
- *Health monitoring:* start `rp_loop_start` with the interval and the monitor prompt; list `rp_loop_list`; cancel `rp_loop_cancel` with the loop id.
- *Agent models (optional):* opencode-native `provider/model[#variant]` strings, passed verbatim to `rp_spawn`.

## Key Decisions

### Decision: Plugin-centered hybrid coordination layer

- **Choice:** one RP opencode plugin (v2 `Plugin.define` shape) supplying tools, in-process session control, and event observation — with the public HTTP API (via `opencode2 api`) for what the restricted plugin ctx omits (enumeration, `/active`, `/wait`, model switch).
- **Alternatives:** a pure external layer (shell/HTTP scripts + detached watcher processes, no plugin); a sidecar daemon; the legacy hooks-API plugin (eliminated: it silently fails to load on the target build).
- **Trade-offs:** first-class tools give the orchestrator Claude Code-parity call ergonomics, and in-process events avoid the discovery/auth/SSE-reconnect failure modes an external watcher would put under the health monitor's most critical duties; the cost is exposure to the beta's most unstable API surface (bounded by pin-and-verify) and a second reach path for the omitted surfaces.
- **Traces to:** Requirements 1, 11, 12, 13, 14.

### Decision: Distribute the repository itself via a pinned GitHub specifier

- **Choice:** `github:Automattic/radical-pipelines#v<X.Y.Z>` in the owner's global config `plugins` array; the repo gains a package entry point; the installed package carries plugin, skill tree, and agent profiles. Verified: git specifiers install through opencode's npm resolver into a spec-keyed cache (exact pinning; versions coexist); RP tags every release.
- **Alternatives:** publishing a dedicated npm package (cleanest resolver semantics, but new publish infrastructure and a second distribution artifact — remains available later without design change); clone + local path (kept as the development variant, parallel to Claude Code's `--plugin-dir`).
- **Trade-offs:** keeps RP's established single-artifact philosophy (Claude Code installs from this same repo) with zero new infrastructure; moving refs never refresh, which is harmless because the procedure only ever pins tags — the behavior req 2 demands anyway.
- **Traces to:** Requirements 1, 2, 5, 8.

### Decision: Skill by reference; agents materialized byte-for-byte by the plugin

- **Choice:** the plugin registers the packaged `skills/` directory as a skill source (`ctx.skill.source({type:"directory", path})`) — no copy, no modification, progressive disclosure native (req 6); agents — which opencode can only load from fixed directories, with no by-reference mechanism and no in-process registration — are copied byte-for-byte into `~/.config/opencode/agents/` at plugin setup (idempotent; only RP-owned files overwritten; collisions reported, never clobbered).
- **Alternatives:** copying the skill into a scanned path (a second tree to keep in sync); project-scoped agents in `.opencode/agents/` written by RP setup (pollutes owners' repos, per-project drift); an owner-invoked install tool for agents (more steps, same result — kept as fallback).
- **Trade-offs:** the one platform-forced copy is owned by the component that already runs at install/update time, keeping the owner's procedure config-edit + restart; identical bytes make req 7's "equivalent instructions" exact (filename-derived ids equal RP names; the extra `name:` key is ignored).
- **Traces to:** Requirements 6, 7; supports 1 and 5.

### Decision: The opencode session DB is the ledger; the session ID is the identifier

- **Choice:** no RP state file for agents. Live lookups: module-singleton in-memory map written by `rp_spawn`. Durable key: session title `rp:<run-branch>:<agent-name>`, asserted after the first turn (auto-title fires only on turn 1); agent/model/directory/timestamps are already persisted by create and survive restarts. The orchestrator addresses agents by session ID; a re-spawn yields a new ID that is explicitly propagated (per the health contract) — never silently re-bound.
- **Alternatives:** an RP-owned ledger file (duplicates what the DB stores; must itself survive restarts and teardowns); in-worktree state (dies exactly when resume recreates worktrees); RP-controlled custom session ids (verified accepted; kept as fallback — charset constraints for name encoding unverified).
- **Trade-offs:** one source of truth, enumerable over the verified HTTP path by the monitor and any fresh orchestrator session; the auto-title interaction costs a two-tier scheme (map + deferred title) whose failure mode is only cosmetic DB garbage, self-healed by the monitor re-asserting missing `rp:` titles.
- **Traces to:** Requirements 11, 12, 14, 16.

### Decision: Queue delivery and derived attribution for all messaging

- **Choice:** all injections — directed messages and completion notifications — use `delivery: "queue"`; attribution is computed from `toolCtx.sessionID`, never from message content.
- **Alternatives:** `steer` (default) delivery; sender-declared attribution.
- **Trade-offs:** queue is durably admitted (observable in `/pending` until promoted — never silently lost) and contracts to run strictly after the current step, so it cannot destructively interrupt a turn; steer's interrupt semantics are governed by an open upstream issue and buy RP nothing. Derived attribution is unspoofable and free.
- **Traces to:** Requirement 12; supports 11 and 14.

### Decision: In-daemon scheduler with a durable registry for the health loop

- **Choice:** per-loop module-singleton `setInterval` in the daemon; registry at `$XDG_DATA_HOME/radical-pipelines/loops.json`; per tick, check `GET /api/session/active` and skip the tick when the target is running; re-arm from the registry at plugin setup (triggered by the first project-scoped touch after a restart — which a resuming orchestrator performs by opening a session in the run repo).
- **Alternatives:** a detached RP scheduler process or OS cron (re-introduce process babysitting and cannot check opencode idle state cheaply); event-pairing idle tracking (empty after restarts); queueing into a busy target (folds the monitor prompt into the current turn — an overlap by another name).
- **Trade-offs:** exactly reproduces the Claude Code `/loop` contract (verified: drift-free ticks, one execution per idle tick, four consecutive busy-skips then a single injection, leftover listed and cancelled from a fresh session); the known nuance — leftovers stay dormant until the repo scope is next touched — lands precisely on resume's first action.
- **Traces to:** Requirement 13; supports 16.

### Decision: Same-session model switch as the auth-recovery first retry

- **Choice:** on a login/API-key error, retry 1 switches the existing session's model (`POST /model` with the authenticated provider-qualified `Model.Ref`) and re-prompts; retry 2 re-spawns on the new model.
- **Alternatives:** re-spawn on both retries (fully verified fallback).
- **Trade-offs:** the switch preserves the agent's accumulated context (least-destructive verified action; applies from the next turn, non-disruptive mid-execution) while the contract's escalation order is kept intact.
- **Traces to:** Requirement 14.

### Decision: Tool-mismatch guard as a presence rule in the loader

- **Choice:** `load.md` gains one tool-agnostic rule — per-tool conventions count as present only when their section heading matches the active tool. A mismatch thereby reduces to the existing missing-conventions flow (stop, explain — naming the mismatch — and offer setup for the active tool).
- **Alternatives:** a separate mismatch step in `load.md` (duplicates the existing flow); a guard in `setup.md` (unreachable — setup is skipped when conventions are present, which is precisely the mismatch case); detection in the per-tool files (not read at run time).
- **Trade-offs:** the smallest possible generic-skill change, no new flow, zero tool-specific content; Claude Code behavior is preserved whenever the section matches.
- **Traces to:** Requirement 10; respects requirement 8 and Out of Scope 5, 7.

### Decision: Pin manifest + hermetic integration suite; the build number is fixed at Build kickoff

- **Choice:** one pin manifest in the packaging artifact (exact `@opencode-ai/cli` build string; the verified `@opencode-ai/plugin` API-surface version) consumed by the README procedure, the integration suite, and `rp_status` (which warns when the running build differs). The suite runs against exactly the pinned CLI: fully XDG-isolated sandbox (all four vars set on every invocation — an unset invocation leaks a log line), `serve --port <fixed>` + `OPENCODE_PASSWORD`, an offline OpenAI-compatible stub provider for all core flows (verified: streaming-SSE stub + mandatory dummy `apiKey`; turns run with the stub's text verbatim at zero cost), deterministic failure injectors (bogus key → `provider.auth`; bogus model → `provider.no-route`), and coverage of plugin load, skill registration, agent materialization, spawn/seat/ledger, send/attribution/failure chain, loop lifecycle, interrupt, model switch, and the pin assertion. A network smoke path (free `opencode/*` models; github-specifier channel install) runs at release cadence. The exact pinned number is chosen at Build kickoff by re-running the recorded 5-minute mechanics smoke on the then-latest build (`next` moved twice during this phase; two builds already pass — 15757 in full, 15772 by smoke).
- **Alternatives:** pin values duplicated across docs and tests (drift); free-model-only tests (network-dependent core suite); opencode-free mocks (would not exercise the real build — fails req 3); freezing the number today (stale before Build).
- **Trade-offs:** the single manifest makes the declared pin and the tested pin provably the same value; hermeticity makes the core suite deterministic while still driving the real pinned binary end-to-end.
- **Traces to:** Requirements 2, 3; supports 4.

## Dependencies

- **opencode v2, pinned:** exact `@opencode-ai/cli` build (bin `opencode2`); the `@opencode-ai/plugin` package version pinned as documentation of the verified plugin-API surface — it is **not** a runtime dependency (the plugin is a plain-object export using node builtins only). Version skew is real: the `next`-tag packages advance independently, so the pin names each version exactly.
- **No new npm dependencies** in RP; no build step (plain runnable JS, matching RP's zero-build philosophy).
- **git** (worktrees, branches) — unchanged.
- **opencode's hosted free models** (network smoke path only) and the local stub provider (hermetic core suite).
- **Upstream open issues shaping the design, none blocking:** restricted plugin session subset (#34957 — covered by the HTTP path), steer/interrupt semantics (#32157 — avoided by queue), subagent parent-completion durability (#36349 — irrelevant: RP does not use the native subagent tool or session parenting).

## Failure Modes and Observability

- **Spawn failures:** `session.create` validates neither agent nor model — `rp_spawn` validates the agent name up front and parses/validates the model string; residual failures surface as `session.execution.failed` on the child's first turn, which the completion listener reports to the spawner.
- **Message failures (three observable stages):** synchronous 404 at send (dead target — returned to the sender as the tool result); admitted-but-never-promoted input lingering in `/pending` (never delivered); post-promotion `session.execution.failed` with structured error (delivered but failed). These map one-to-one onto the health monitor's message-failure signal and its re-send → restart-target recovery.
- **Auth and network errors:** structured errors on `session.execution.failed`/`session.step.failed` — auth is `type: "provider.auth"` with the provider's HTTP body verbatim in `message` (live-verified; ready for the escalation payload's error-verbatim field); non-auth types (live-verified sibling: `provider.no-route`) are treated as the transient class with retry-once semantics that do not depend on the exact type string.
- **Stalls:** per-agent last activity via `time.updated` on the session list, running state via `/active`, plus worktree git state — the monitor's stall signal; recovery = `rp_send` status ping, then interrupt (verified non-destructive) + re-spawn + identifier propagation.
- **SSE/event volatility:** the in-process listener is the notification path, but no signal depends on events alone — every observable has a durable HTTP counterpart (`/session`, `/active`, `/pending`), and the monitor polls them each tick. The listener's in-memory error log is lost on daemon restart, which is acceptable: in-flight turns died with the process, staleness shows in `time.updated`, and resume re-runs from committed state.
- **Daemon restart:** sessions and titles persist (durable SQLite); loop registry persists and re-arms on the first project-scoped touch; materialized agents persist on disk; the plugin re-imports and re-subscribes once.
- **Install-time collisions:** materialization overwrites only RP-owned files in the global agents directory and reports a collision with a pre-existing same-named foreign agent instead of clobbering it.
- **Pin drift:** `rp_status` compares the running build to the pin manifest and warns — "outside the verified surface" is observable, not silent.

## Risks and Open Questions

**Risks (accepted, with mitigations):**

- **Beta plugin-API instability.** The v2 plugin surface already broke once within the beta (the legacy hooks API silently stops loading). Mitigated by pin-and-verify: exact versions, integration tests against the pin, `rp_status` drift warning; re-pinning as v2 stabilizes is explicitly follow-up work (spec Out of Scope 3).
- **`next`-tag version skew.** CLI and sdk/plugin packages advance independently under one tag; the pin names every package version individually.
- **Global agents-directory collisions.** Flat RP agent filenames land in the owner's global agents dir; mitigation is ownership-tracked materialization with collision reporting.

**Open questions (deferred, verifier named, deferral safe):**

- **Interactive TUI as daemon client.** All coordination paths were verified process-agnostically over the same HTTP/plugin surface, but the TUI itself was never driven (headless environment). Verified by: the Build phase's first manual smoke on the pinned build. Safe: every mechanic is demonstrated against the same server the TUI targets, and `--server`/`--standalone` can tie a client to a chosen server explicitly if the default topology differs.
- **Exact pinned build number.** Chosen at Build kickoff via the recorded mechanics smoke; verified by that smoke plus the full suite. Safe: two builds already pass, and the mechanism (manifest + consumers) is fixed here.
- **Auto-title race.** Whether first-turn auto-titling can land after the listener's title re-assert. Verified by: an integration test (spawn → first turn → check title). Safe: the in-memory map is authoritative live, and the monitor self-heals missing `rp:` titles within one interval.
- **Network-error type string.** The transient-class structured-error `type` was not reproduced live (auth and no-route siblings were). Verified by: integration tests or first occurrence. Safe: the surfacing channel is live-verified and the recovery action does not depend on the string.
- **Exhaustive steer/interrupt semantics** (upstream #32157). Not needed: RP uses only queue delivery; documented for completeness.
