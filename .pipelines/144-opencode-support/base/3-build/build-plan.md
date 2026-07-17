# Build Plan: Support opencode as an agentic coding tool

## Overview

This plan adds opencode v2 as a second supported agentic coding tool alongside Claude Code. The work is one RP-owned **zero-dependency opencode plugin** (the packaging artifact) that supplies the coordination layer opencode lacks — registered tools `rp_spawn`, `rp_send`, `rp_loop_start`/`rp_loop_list`/`rp_loop_cancel`, and `rp_status` — backed by opencode's durable session store as the agent ledger and an RP-owned loop registry, plus the per-tool convention surface the generic skill exposes (a new `opencode.md`, one new `setup.md` Tool→Read row, and one tool-agnostic `load.md` mismatch rule) and a hermetic integration suite that exercises the plugin against exactly the pinned opencode build. Build order: first the pin manifest and the plugin's pure, offline-testable logic (model parsing, ledger/attribution/title, loop registry, agent materialization, status/pin comparison); then the plugin module that wires those into `setup(ctx)` and the six tools; then the package entry point; then the three skill-surface prose changes; then the integration suite; and finally the changeset. Every non-prose task is unit-tested offline under the fixed `npm test` gate (`node --test 'scripts/test/**/*.test.mjs'`) using pure functions plus a fake `ctx`; the integration suite lives outside `scripts/test/` so it never runs under `npm test`, and is executed against the pinned binary by the Build-phase manual smoke.

Investigation behind the scope (verified by direct reads in this worktree at `144-opencode-support`):
- The repo is greenfield for opencode: no `opencode/` directory, no plugin JS module, no pin manifest, and no integration harness exist today (`ls`, `find` came back empty). The only per-tool convention file is `skills/radical-pipelines/reference/conventions/claude-code.md`; `setup.md`'s Tool→Read table has exactly one row (Claude Code).
- `load.md` has no tool-match guard — its "Missing conventions" section checks required-convention *presence* only; with all present, setup is skipped (`setup.md:222`). This is requirement 10's gap.
- `npm test` = `node --test 'scripts/test/**/*.test.mjs'` (root `package.json`). Only files under `scripts/test/**` matching `*.test.mjs` run; anything elsewhere is invisible to the gate — this is what keeps the network-dependent integration suite out of the fixed gate.
- Version flow: root `package.json` `.version` (0.10.0) is the single source of truth; `scripts/sync-version.mjs` `TARGET_MANIFESTS = [".claude-plugin/plugin.json"]`; `scripts/check-version-sync.mjs` validates package.json / plugin.json / package-lock.json only. The pin manifest holds **opencode** versions, not the RP version, so it is deliberately **not** a version-sync target; the plugin reads the RP version from `package.json` at load (design "Version sync is untouched"). Confirmed no version-sync change is needed and none of the version-sync tests are affected by adding `main`/`exports` to `package.json`.
- The 17 agent profiles in `agents/` are copied byte-for-byte by the plugin (filename = agent id = RP name); no profile is edited, so no profile task exists.
- Changeset config `.changeset/config.json` `changedFilePatterns` lists `.claude-plugin/**` but not the new plugin directory; the changeset task extends it so the new artifact is changeset-gated, matching the repo's "every change records a changeset" rule.
- The README opencode install/update/version *procedures* are documentation (design lists them as a component, but RP's Document phase owns README). They are **excluded from this build plan** and deferred to the Document phase; the build delivers only the *mechanics* those procedures describe (install channel, plugin id version surface, materialization refresh). `opencode.md`'s Setup-actions section may reference the future README section by name.

## Guardrail scopes

The build guardrail is the fixed gate `npm test`; no scoped gates were passed to this plan.

| Gate | Scope |
| ---- | ----- |
| (none) | None |

## E2E test plan

Two classes of flow. **Automated (hermetic integration suite)** flows are implemented by the build-writer-e2e in the opencode integration suite (Task 12): they run against exactly the pinned opencode CLI in an XDG-isolated sandbox with an offline OpenAI-compatible stub provider (and free `opencode/*` models only on the release-cadence network smoke path), and are **not** part of `npm test`. **Manual smoke** flows are owner/orchestrator-level behaviors that require a live orchestrator session with the RP skill loaded on a pinned install; they are documented here for the Build-phase manual smoke and for the reviewer to re-drive, and are satisfied by the shipped plugin plus the skill-surface prose (Tasks 7–11).

### Flow 1: Install on the pinned build (manual smoke)

- **Steps:** On a machine with the pinned opencode v2 build and no RP, add the pinned github specifier to the owner's global `~/.config/opencode/opencode.json` `plugins` array with `"autoupdate": false`; run `opencode2 service restart`; open a session.
- **Expected:** `opencode2 api get /api/plugin` reports `radical-pipelines@<version>`; the RP skill is invokable (advertised id/name/description, `reference/**` read on demand); every RP agent from `agents/` is available by its RP name (`opencode2 api get /api/agent`); auto-update is disabled in config.
- **Traces to:** Acceptance criterion 40 (install), 41 (version surface).

### Flow 2: Version surface reports the installed RP version (automated + manual)

- **Steps:** With the plugin loaded, read `GET /api/plugin`; in a session, call `rp_status`.
- **Expected:** `/api/plugin` id embeds the exact `package.json` version; `rp_status` reports the plugin version and a pin-vs-running-build comparison.
- **Traces to:** Acceptance criterion 41 (version discoverability).

### Flow 3: Update to a newer RP release (manual smoke)

- **Steps:** From an install pinned at an older tag, change the specifier to a newer `#v<X.Y.Z>` tag; `opencode2 service restart`.
- **Expected:** `/api/plugin` reports the newer version; the skill and materialized agents in effect are the newer release's (materialization refreshed at plugin setup).
- **Traces to:** Acceptance criterion 42 (update).

### Flow 4: Setup writes a committed `.rp.md` (manual smoke)

- **Steps:** In a repo with no `.rp.md` under opencode, run RP setup; proceed through the flow.
- **Expected:** A committed `.rp.md` exists with the shared conventions plus an `## opencode conventions` section carrying Team spawning and Health monitoring (Agent models optional); the canonical per-tool values were informed, not asked; the worktree root is in `.gitignore`; setup's opencode Setup-actions verified the plugin is installed before writing conventions that reference `rp_*` tools.
- **Traces to:** Acceptance criterion 43 (setup).

### Flow 5: Tool-mismatch guard (manual smoke)

- **Steps:** In a repo whose committed `.rp.md` carries a `## Claude Code conventions` section, run RP under opencode.
- **Expected:** The run does not proceed under the Claude Code conventions; the owner is told the committed per-tool section targets Claude Code while the active tool is opencode, and is offered setup for opencode.
- **Traces to:** Acceptance criterion 44 (tool-mismatch guard).

### Flow 6: Spawn, seat, identifier, completion notification (automated)

- **Steps:** From an orchestrator session, call `rp_spawn` with a run-unique `name`, an RP `agent` profile name, a `provider/model[#variant]` string, an absolute worktree `directory`, an initial `prompt`, and the `run` branch; let the first turn complete.
- **Expected:** A session is created seated at `directory` (a relative shell/write inside the agent lands in the worktree); the tool returns the session ID as the stable identifier; the ledger records `sessionID → {name, run, spawner}`; on the child's first terminal event the spawner receives a completion message and the durable title `rp:<run>:<name>` is asserted. A bogus `agent` is rejected before session creation; a bogus `model` string is rejected at parse.
- **Traces to:** Acceptance criterion 45 (team spawning).

### Flow 7: Directed messaging in both directions (automated)

- **Steps:** Orchestrator `rp_send` to a spawned agent's session ID; the agent replies with its own `rp_send` to the embedded sender ID; a lead agent `rp_send`s a researcher agent and vice-versa.
- **Expected:** Exactly the addressed session receives each message as a user-role input prefixed with `[from <name> (<sid>)]`; the sender attribution is derived from the caller's `toolCtx.sessionID` (unspoofable by content); replies reach the original sender; the receiver's execution runs under its own persisted agent+model.
- **Traces to:** Acceptance criterion 46 (messaging).

### Flow 8: Health loop start / list / idle-only firing / cancel (automated)

- **Steps:** `rp_loop_start` with an interval and prompt (target defaults to the calling session); `rp_loop_list`; drive the target busy across several ticks, then idle; `rp_loop_cancel` with the loop id.
- **Expected:** The loop appears in `rp_loop_list`; ticks while the target is running are skipped (no overlapping turn); exactly one prompt injection fires on an idle tick; after cancel, zero further ticks and the registry entry is gone.
- **Traces to:** Acceptance criterion 47 (health loop).

### Flow 9: Leftover loop survives a restart and is cancellable from a fresh session (automated)

- **Steps:** Start a loop; `opencode2 service restart`; from a fresh project-scoped touch, `rp_loop_list`; `rp_loop_cancel` the leftover.
- **Expected:** The registry entry survives the restart; the first project-scoped touch re-arms it; `rp_loop_list` shows the leftover; cancel stops it and removes the entry before any new loop is launched.
- **Traces to:** Acceptance criterion 48 (leftover loop), supports 54 (resume).

### Flow 10: Stall recovery — ping then restart with identifier propagation (automated + manual)

- **Steps:** With an agent producing no output past the threshold, drive the monitor's recovery: `rp_send` status ping; on a second failure, interrupt (if running) + `rp_spawn` a fresh session (same agent/model/directory, catch-up prompt); `rp_send` the new session ID to peers that message it.
- **Expected:** The stall is observable via `time.updated` + `/active` + `rp_status`; the ping is delivered; the restart yields a new session ID; peers receive the new identifier.
- **Traces to:** Acceptance criterion 49 (stall recovery / identifier propagation), 45.

### Flow 11: Message-failure recovery — observable, re-send, restart target (automated)

- **Steps:** Send to a dead session ID; observe the synchronous 404; re-send; force an admitted-but-unpromoted input to linger in `/pending`; then a post-promotion `session.execution.failed`.
- **Expected:** All three delivery-failure stages are observable (404 at send, lingering `/pending`, `execution.failed`); the message is re-sent; a second failure escalates to restarting the target.
- **Traces to:** Acceptance criterion 50 (message-failure recovery).

### Flow 12: Auth-error recovery — model swap + re-spawn (automated)

- **Steps:** Spawn on a model whose provider key is bogus (injector → `provider.auth`); recovery retry 1 = `POST /api/session/{id}/model` with an authenticated provider-qualified `Model.Ref` + queue re-prompt; retry 2 = `rp_spawn` on the new model.
- **Expected:** The auth failure surfaces as a structured error `type === "provider.auth"` with the provider body verbatim; the same-session model switch applies from the next turn (non-disruptive); a re-spawn on the authenticated model runs.
- **Traces to:** Acceptance criterion 51 (auth recovery).

### Flow 13: Tool-call network-error surfacing and retry (automated probe + manual)

- **Steps:** Force a tool-call transient network failure inside an agent's turn (e.g. a webfetch to an unroutable address); record what surfaces (events, `/pending`, session state); apply retry-once, then wait-one-interval-and-retry.
- **Expected:** The failure is observable through the monitor's existing signals (agent report, worktree state, messaging state, stall backstop) even if no event-channel signal fires; the call is retried once and, on a second failure, retried again after one interval before escalation. (This flow also resolves the design's open network-error-surfacing question by recording the observed channel.)
- **Traces to:** Acceptance criterion 52 (network-error recovery).

### Flow 14: End-to-end five-phase run and close-out (manual smoke)

- **Steps:** On a pinned opencode install, take a test issue through all five phases autonomously; reach close-out.
- **Expected:** Every phase's required artifacts are committed on the run branch; close-out stops the monitor via `rp_loop_cancel`, pushes the run branch, and informs the owner.
- **Traces to:** Acceptance criterion 53 (end-to-end run).

### Flow 15: Resume after interruption (manual smoke)

- **Steps:** Interrupt a run mid-phase; in a fresh orchestrator session, open the run repo (the project-scoped touch), cancel the leftover loop, reuse or recreate the run worktree from the branch, and continue.
- **Expected:** The leftover loop re-arms on the touch, is listed, and is cancelled; the worktree is reused/recreated from committed state; the run continues to completion (in-flight sessions are not reattached — work re-runs from committed state).
- **Traces to:** Acceptance criterion 54 (resume).

### Flow 16: Pinned integration suite passes (automated)

- **Steps:** Run `npm run test:opencode` against exactly the pinned CLI in the XDG-isolated sandbox.
- **Expected:** Every covered mechanic passes (plugin load + version id, skill registration, agent materialization + collision reporting, spawn/seat/ledger/title, send/attribution/failure chain, loop start/skip-busy/list/cancel/restart-re-arm, interrupt, model switch, and the pin assertion).
- **Traces to:** Acceptance criterion 55 (pinned verification).

### Flow 17: Claude Code behavior unchanged (regression)

- **Steps:** Exercise the Claude Code install/setup/run path; run `npm test`.
- **Expected:** The generic skill's only changes are the tool-agnostic `load.md` rule (which preserves current behavior when `.rp.md`'s per-tool heading matches Claude Code) and the additive `setup.md` Tool→Read row; the Claude Code convention file, install flow, and runtime behavior are unchanged; `npm test` is green.
- **Traces to:** Acceptance criterion 56 (Claude Code unchanged).

## Tasks

All plugin source lives in a new `opencode/` directory (the packaging artifact, parallel to `.claude-plugin/`). The plugin module is `opencode/plugin.mjs` (ESM; `type: "module"` is already set), a zero-dependency single file that `export default {id, setup(ctx)}` and additionally named-exports its pure helpers so they are unit-testable offline. Offline unit tests live under `scripts/test/opencode/` so the `npm test` glob picks them up. The pin manifest is `opencode/pin.json`. The integration suite lives under `scripts/opencode-integration/` (outside `scripts/test/`, so `npm test` never runs it).

### Task 1: Pin manifest

- **Goal:** Declare the single source of truth for the pinned opencode build, consumed by the plugin (`rp_status`), the integration suite, and the future README procedure.
- **Type:** tdd
- **Files to change:** add `opencode/pin.json`; add `scripts/test/opencode/pin-manifest.test.mjs`.
- **Changes:** `opencode/pin.json` declares the exact `@opencode-ai/cli` build string and the `@opencode-ai/plugin` package version whose API surface the layer targets. Pin the CLI to the build validated by the Build-kickoff mechanics smoke; **default `0.0.0-next-15772`** (the newest build already smoke-verified in design research) if no fresher smoke is run. Record the `@opencode-ai/plugin` version present in that same build read from the installed build (do not assume lockstep with the CLI number — the `next`-tag packages advance independently). Shape (field names are the build-writer's to fix, but the file must expose both versions as plain strings), e.g. `{ "cli": "0.0.0-next-15772", "plugin": "0.0.0-next-<paired>" }`.
- **Depends on:** none
- **Traces to:** Design "Pin manifest" component; Decision "Pin manifest + hermetic integration suite"; Spec requirement 2 (pinned target), 3 (pinned verification), supports 4 (version discoverability).
- **Acceptance:**
  - `opencode/pin.json` exists and parses as JSON exposing an exact `@opencode-ai/cli` build string of the form `0.0.0-next-<NNNNN>` (never a moving tag) and an `@opencode-ai/plugin` version string.
  - The two versions are independent fields (the plan does not require them to be equal).
  - The manifest is the only place the pinned versions are declared (no duplicate literals elsewhere in `opencode/` or the suite).

### Task 2: Model-string parsing

- **Goal:** Parse the Agent-models convention string into the object form `session.create` requires.
- **Type:** tdd
- **Files to change:** add parsing helper to `opencode/plugin.mjs`; add `scripts/test/opencode/parse-model.test.mjs`.
- **Changes:** A pure exported function that parses `provider/model[#variant]` into `Model.Ref { providerID, id, variant? }` (variant defaults to `"default"` when omitted). It rejects malformed strings (missing provider or model) with a clear error; the API rejects the raw string form, so the plugin must always parse before `create`.
- **Depends on:** none
- **Traces to:** Design "Interfaces and Data Flow" (`rp_spawn` model parse); Topic 3 (Model.Ref requirement); Spec requirement 11, supports 14 (auth recovery model swap).
- **Acceptance:**
  - `provider/model` parses to `{ providerID: "provider", id: "model", variant: "default" }`.
  - `provider/model#variant` parses to `{ providerID: "provider", id: "model", variant: "variant" }`.
  - A model id containing slashes beyond the provider segment is preserved as the id (only the first `/` splits provider from id).
  - A string missing the provider segment or the model segment raises an error rather than returning a partial ref.

### Task 3: Ledger, attribution, and durable title

- **Goal:** The in-memory ledger, the unspoofable sender-attribution string, and the durable session-title format used for reconstruction.
- **Type:** tdd
- **Files to change:** add ledger/attribution/title helpers to `opencode/plugin.mjs`; add `scripts/test/opencode/ledger.test.mjs`.
- **Changes:** A module-singleton in-memory map keyed by `sessionID → { name, run, spawner }` with record/lookup/latest-wins-per-name semantics (a re-spawn of the same `name` supersedes the older entry). A pure function that builds the delivered-message prefix `[from <name> (<sessionID>)]` given a resolved sender. A pure pair of functions that format the durable title `rp:<run>:<name>` and parse `{ run, name }` back from a title with the `rp:` prefix (returning nothing for titles without it). The map lives behind a module-level singleton guard so it is shared across per-directory `setup(ctx)` re-runs and dies with the daemon.
- **Depends on:** none
- **Traces to:** Decision "The opencode session DB is the ledger; the session ID is the identifier"; Decision "Queue delivery and derived attribution"; Spec requirement 11, 12, 14, 16.
- **Acceptance:**
  - Recording a spawn then looking up by session ID returns its `{ name, run, spawner }`.
  - Recording a second spawn with the same `name` (new session ID) makes the newer entry the one resolved as current for that `name`, leaving the old session ID still individually resolvable.
  - The attribution prefix for a sender named `spec-lead` with session id `ses_x` is exactly `[from spec-lead (ses_x)]`.
  - Title format/parse round-trips: `rp:<run>:<name>` parses back to the same `run` and `name`; a title lacking the `rp:` prefix parses to nothing.

### Task 4: Loop registry

- **Goal:** The durable, restart-surviving registry backing `rp_loop_start`/`rp_loop_list`/`rp_loop_cancel` and the re-arm-on-setup behavior.
- **Type:** tdd
- **Files to change:** add registry helpers to `opencode/plugin.mjs`; add `scripts/test/opencode/loop-registry.test.mjs`.
- **Changes:** Pure file-backed registry functions over a JSON file at `$XDG_DATA_HOME/radical-pipelines/loops.json` (fallback `~/.local/share/radical-pipelines/loops.json`), with an injectable base path so tests use a temp dir. Operations: resolve the registry path (honoring `XDG_DATA_HOME`, else the fallback), read all entries, add an entry (loop id, interval, prompt, target session), list entries, and delete by loop id. Each entry carries enough to re-arm a `setInterval` after a restart. The timer/scheduler wiring itself is Task 7; this task is the durable state and its serialization only.
- **Depends on:** none
- **Traces to:** Decision "In-daemon scheduler with a durable registry"; Topic 5; Spec requirement 13, supports 16.
- **Acceptance:**
  - The registry path honors `XDG_DATA_HOME` when set and uses the `~/.local/share/radical-pipelines/` fallback when it is not.
  - Adding an entry then reading from a newly constructed registry over the same file returns the entry (survives across process/instance boundaries).
  - Listing returns all current entries; deleting by loop id removes exactly that entry and leaves the others.
  - Reading a missing registry file yields an empty list rather than an error.

### Task 5: Agent materialization

- **Goal:** Copy the RP agent profiles byte-for-byte into opencode's global agents directory, idempotently, overwriting only RP-owned files and reporting foreign collisions instead of clobbering.
- **Type:** tdd
- **Files to change:** add materialization helper to `opencode/plugin.mjs`; add `scripts/test/opencode/materialize-agents.test.mjs`.
- **Changes:** A function that, given a source agents directory (resolved from `import.meta.url` as `../agents` at runtime; injectable in tests) and a target directory (`~/.config/opencode/agents/`; injectable), copies each `*.md` profile byte-for-byte. Ownership is tracked via an RP-owned manifest written in the target (e.g. a list of RP-owned filenames): on materialize, overwrite files recorded as RP-owned; for a target filename that exists but is not RP-owned, report a collision and skip it (never overwrite a foreign agent); newly written files are added to the ownership record. Byte-for-byte means the extra `name:` frontmatter key is left intact (opencode ignores it; the filename governs the agent id).
- **Depends on:** none
- **Traces to:** Decision "Skill by reference; agents materialized byte-for-byte by the plugin"; Failure mode "Install-time collisions"; Spec requirement 7 (agents available), supports 1, 5.
- **Acceptance:**
  - Into an empty target, every source `*.md` is copied with byte-identical content and its filename preserved.
  - A second materialize with unchanged sources is a no-op diff (idempotent) and overwrites only RP-owned files.
  - A pre-existing target file of the same name that is not RP-owned is reported as a collision and left unmodified.
  - Updating a source profile and re-materializing overwrites the RP-owned target with the new bytes.

### Task 6: Status and pin comparison

- **Goal:** The `rp_status` payload shaping — plugin version, pin-vs-running-build comparison, ledger snapshot, and recent-errors log — as pure logic.
- **Type:** tdd
- **Files to change:** add status/pin-comparison helpers to `opencode/plugin.mjs`; add `scripts/test/opencode/status.test.mjs`.
- **Changes:** A pure function that compares a running build string against the pinned `cli` from `opencode/pin.json` and reports match vs "outside the verified surface." A pure function that shapes the `rp_status` result from inputs (plugin version, pin comparison, ledger entries mapped to `{ name, sessionID, agent, model, directory, updated, running, pending }`, and a bounded recent-errors log). The bounded error log is an in-memory ring (fixed cap) with an append helper. Reading the pinned version comes from Task 1's manifest.
- **Depends on:** Task 1
- **Traces to:** Decision "Pin manifest + hermetic integration suite" (`rp_status` pin warning); Topic 7 observable 5; Spec requirement 4 (version discoverability), 14 (liveness observables), supports 2.
- **Acceptance:**
  - A running build equal to the pinned `cli` reports a match; any other build reports a mismatch flagged as outside the verified surface.
  - The status payload includes the plugin version and one ledger row per provided ledger entry with the listed fields.
  - The recent-errors log is bounded: appending beyond the cap drops the oldest and keeps the most recent up to the cap.

### Task 7: Plugin module — tools, listener, and scheduler

- **Goal:** Assemble the zero-dependency plugin: the default export, the six registered tools, the skill-source registration, the singleton completion listener, and the loop scheduler — wiring the Task 2–6 helpers to opencode's `ctx`.
- **Type:** tdd
- **Files to change:** finalize `opencode/plugin.mjs` (`export default {id, setup(ctx)}`); add `scripts/test/opencode/plugin.test.mjs`.
- **Changes:**
  - `id = radical-pipelines@<version>` where `<version>` is read from the repo `package.json` at load (resolved via `import.meta.url`).
  - `setup(ctx)` registers, via `ctx.tool.transform(tools => tools.add(...))`, exactly six tools with JSON-schema args: `rp_spawn {name, agent, model, directory, prompt, run}`, `rp_send {to, message}`, `rp_loop_start {interval, prompt, target_session?}`, `rp_loop_list {}`, `rp_loop_cancel {id}`, `rp_status {}`.
  - `rp_spawn` validates `agent` against `ctx.agent.list()` (reject unknown before creating a dead session), parses `model` (Task 2), calls `ctx.session.create({agent, model, location:{directory}})`, records the ledger entry (Task 3) with `spawner = toolCtx.sessionID`, posts the initial `prompt`, and returns the session ID as the identifier.
  - `rp_send` resolves the sender from `toolCtx.sessionID` via the ledger, prefixes the text with the attribution (Task 3), delivers `ctx.session.prompt({sessionID: to, text, delivery: "queue"})` omitting `agents`/`resume`, and returns a dead-target 404 synchronously as the tool result.
  - `rp_loop_start` writes a registry entry (Task 4), arms a module-singleton `setInterval` that per tick checks `GET /api/session/active` (via `opencode2 api` from the shell), skips when the target is running, and otherwise injects the prompt with queue delivery; `target_session` defaults to `toolCtx.sessionID`. `rp_loop_list` reads the registry; `rp_loop_cancel` clears the timer and deletes the entry.
  - `rp_status` returns the Task 6 payload (running build read via `opencode2 --version` / the service record).
  - Registers the packaged `skills/` directory as a skill source by reference (resolved from `import.meta.url`), no copy.
  - Materializes the agent profiles (Task 5) during `setup`.
  - A **module-level singleton guard** wraps `ctx.event.subscribe` (subscribe exactly once across per-directory `setup` re-runs) and the loop re-arm from the registry; the listener watches terminal events (`session.execution.succeeded`/`.failed`) on ledger sessions and, **on the child's first terminal event only**, injects a completion message (queue) into the spawner's session and re-asserts the child's `rp:<run>:<name>` title. All terminal events feed the bounded error log (Task 6).
  - The module has no third-party imports (node builtins only); nothing connects to a server at import time.
  - Offline tests use a fake `ctx` (recording `tool.transform`, `event.subscribe`, `session.*`, `agent.list`, `skill` calls) and stub the shell/`opencode2 api` boundary.
- **Depends on:** Task 2, Task 3, Task 4, Task 5, Task 6
- **Traces to:** Decision "Plugin-centered hybrid coordination layer"; Decisions "session DB is the ledger", "Queue delivery and derived attribution", "Completion notifications fire on the first terminal event only", "In-daemon scheduler with a durable registry"; Spec requirement 6, 7, 11, 12, 13, 14; supports 15, 16.
- **Acceptance:**
  - The default export is `{ id, setup }` with `id` equal to `radical-pipelines@` + the `package.json` version, and `setup` a function; importing the module performs no network or server connection.
  - Calling `setup` with a fake `ctx` registers exactly the six named tools and registers the `skills/` directory as a skill source.
  - `rp_spawn` rejects an `agent` not in `ctx.agent.list()` before any `session.create`; on a valid agent it creates the session seated at `directory`, records the ledger entry with `spawner = toolCtx.sessionID`, and returns the created session ID.
  - `rp_send` delivers with `delivery: "queue"`, prefixes the attribution derived from `toolCtx.sessionID` (not from message content), and returns the 404 for a dead target as the tool result.
  - Calling `setup` twice subscribes to events exactly once (module singleton guard).
  - The completion listener notifies the spawner on a child's first terminal event only; a second terminal event on the same child produces no additional spawner notification.
  - `rp_loop_start` records a registry entry and defaults `target_session` to the caller; a busy target skips the tick and an idle target injects the prompt once; `rp_loop_cancel` stops further ticks and removes the entry.

### Task 8: Package entry point

- **Goal:** Make `opencode/plugin.mjs` the package's plugin entry so the github-specifier install resolves it.
- **Type:** tdd
- **Files to change:** `package.json` (`main`/`exports`); add `scripts/test/opencode/package-entry.test.mjs`.
- **Changes:** Add `main` and/or `exports` in `package.json` pointing at `opencode/plugin.mjs`. Do not touch `version` or `scripts` (except adding the `test:opencode` script in Task 12). Leave `sync-version` and `check-version-sync` targets unchanged.
- **Depends on:** Task 7
- **Traces to:** Decision "Distribute the repository itself via a pinned GitHub specifier"; Design "package.json gains the plugin entry point"; Spec requirement 1 (install), 8 (packaging artifact).
- **Acceptance:**
  - `package.json` `main`/`exports` resolve to `opencode/plugin.mjs` (the file exists at that path).
  - Importing the resolved entry yields the plugin object with `{ id, setup }`.
  - `package.json` `.version` is unchanged and `npm test` (including the version-sync checks) remains green.

### Task 9: opencode convention file

- **Goal:** The conditionally-loaded per-tool convention file with the canonical `.rp.md` blocks and the opencode Setup-actions check.
- **Type:** tdd (skill prose — see note)
- **Files to change:** add `skills/radical-pipelines/reference/conventions/opencode.md`.
- **Changes:** New per-tool convention file mirroring `claude-code.md`'s structure and inform-not-ask framing. Contents:
  - Canonical section heading `## opencode conventions` (the matchable value for the Task 11 guard, parallel to `## Claude Code conventions`).
  - **Team spawning** block: spawn each agent with `rp_spawn` — the run-unique instance name, the RP profile name, a `provider/model[#variant]` string, the absolute worktree path, the initial prompt, and the run branch; the session's working directory is fixed for its lifetime; the result's session ID is the identifier for addressing messages; message via `rp_send`; the spawner is notified automatically when a spawned agent's first turn completes, and agents report completion of later work themselves.
  - **Health monitoring** block: start `rp_loop_start` with the interval and the monitor prompt (target defaults to the calling session); list `rp_loop_list`; cancel `rp_loop_cancel` with the loop id.
  - **Agent models** (optional): opencode-native `provider/model[#variant]` strings, passed verbatim to `rp_spawn`.
  - **Worktree root** constraint: must be a path inside the repository (same sentence as `claude-code.md`).
  - **Setup actions** section: verify the RP opencode plugin is installed and loaded (via `/api/plugin` showing `radical-pipelines@<version>` or `rp_status`) before writing conventions that reference `rp_*` tools; if absent, stop setup and point the owner at the documented install procedure (the future README opencode section). A check, not a write.
  - Per the repo rule, the file may name opencode (it is a per-tool convention file); no generic skill file gains opencode content beyond the Task 10/11 surfaces.
- **Depends on:** Task 7 (tool names and signatures must match the shipped plugin)
- **Traces to:** Topic 8 (per-tool pattern artifacts); Spec requirement 8 (per-tool pattern), 9 (setup output), supports 44 (mismatch heading).
- **Acceptance:**
  - `opencode.md` exists with an `## opencode conventions` heading and canonical Team spawning, Health monitoring, and Agent models blocks whose tool names and argument lists match the shipped `rp_*` tools.
  - The Team spawning block states the seat is fixed for the session's lifetime and names the session ID as the addressing identifier.
  - A Setup-actions section instructs verifying the plugin is installed before writing `rp_*`-referencing conventions, as a check (no file write without confirmation).
  - The worktree-root-inside-the-repo constraint is stated.
- **Note:** Skill-prose change. Per the repository rule "the skill is prose, not software," no structural unit test asserts this file's content; the RED/GREEN cycle does not apply. Deliver the prose and confirm `npm test` stays green. Behavior is exercised end-to-end by Flow 4 (setup) and Flow 5 (mismatch).

### Task 10: setup.md Tool→Read row

- **Goal:** Route opencode setup to the new convention file.
- **Type:** tdd (skill prose — see note)
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md` (the Tool→Read table in step 1).
- **Changes:** Add one row to the Tool→Read table: `opencode` → `opencode.md`. No other change to `setup.md`; the table already lists Claude Code, and the Setup-actions step already consults the active tool's file (Task 9 provides the section).
- **Depends on:** Task 9
- **Traces to:** Topic 8 decision 1 (new Tool→Read row); Spec requirement 8, 9; supports 56 (additive, Claude Code row unchanged).
- **Acceptance:**
  - The Tool→Read table contains both the existing Claude Code → `claude-code.md` row and a new opencode → `opencode.md` row.
  - No existing row or other `setup.md` content is altered.
- **Note:** Skill-prose change; no structural unit test (repo rule). Confirm `npm test` stays green.

### Task 11: load.md tool-mismatch guard

- **Goal:** Make the loader treat a per-tool convention as present only when its section's tool matches the active tool, folding the mismatch into the existing missing-conventions flow — tool-agnostically.
- **Type:** tdd (skill prose — see note)
- **Files to change:** `skills/radical-pipelines/reference/conventions/load.md` (the "Missing conventions" logic).
- **Changes:** Add one tool-agnostic rule: a convention under a per-tool section counts as present only when that section's tool matches the active tool. When this makes required conventions unavailable, do not proceed under the other tool's conventions; the explanation names the mismatch (the committed per-tool section targets `<tool>`; running under `<active tool>` requires setup for it) and offers setup for the active tool. No tool name appears in the rule; it reuses the same active-tool identification `setup.md` step 1 already uses.
- **Depends on:** none
- **Traces to:** Decision "Tool-mismatch guard as a presence rule in the loader"; Spec requirement 10 (tool-mismatch guard); respects 8, and 56 (Claude Code behavior preserved when the section matches).
- **Acceptance:**
  - `load.md` states that a per-tool convention is present only when its section's tool matches the active tool, and that a mismatch reduces to the missing-conventions stop/explain/offer-setup flow with the mismatch named.
  - The rule contains no tool-specific names (stays tool-agnostic); when the section matches the active tool, the existing behavior is unchanged.
- **Note:** Skill-prose change; no structural unit test (repo rule). Behavior is exercised by Flow 5 (mismatch) and Flow 17 (Claude Code unchanged). Confirm `npm test` stays green.

### Task 12: opencode integration suite

- **Goal:** The hermetic, pinned integration suite that exercises the RP layer against exactly the pinned CLI (requirement 3), kept out of the fixed `npm test` gate.
- **Type:** e2e
- **Files to change:** add `scripts/opencode-integration/` (entry `run.mjs`, the OpenAI-compatible SSE stub provider, XDG-isolation harness, and per-mechanic checks); add a `test:opencode` script to `package.json`.
- **Changes:** Implement the E2E test plan's automated flows (Flows 2, 6–13, 16) as an executable suite:
  - Harness: a temp sandbox with all four XDG vars (`XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`, `XDG_STATE_HOME`) set on **every** opencode invocation (including `--version`); a non-global install of the pinned CLI (`opencode/pin.json`); `serve --port <fixed free port>` + `OPENCODE_PASSWORD`; API access via `api --server`/HTTP.
  - Model: an offline OpenAI-compatible stub provider in the sandbox config (`baseURL` → a localhost SSE-streaming stub, mandatory dummy `apiKey`) for all core flows; deterministic failure injectors (bogus `*_API_KEY` → `provider.auth`; bogus model id → `provider.no-route`); a tool-call network-failure probe (Flow 13). A release-cadence network smoke path uses free `opencode/*` models and the github-specifier channel install.
  - Coverage: plugin load + version id, skill registration, agent materialization + collision reporting, spawn/seat/ledger/title (including the auto-title-vs-re-assert race check), send/attribution/failure chain, loop start/skip-busy/list/cancel/restart-re-arm, interrupt, same-session model switch, and the pin assertion (`opencode2 --version` equals the pinned `cli`).
  - `package.json` gains `"test:opencode": "node scripts/opencode-integration/run.mjs"` (or equivalent). It is **not** referenced by the `test` script and its files are outside `scripts/test/**`, so `npm test` never runs it.
- **Depends on:** Task 1, Task 7, Task 8
- **Traces to:** Decision "Pin manifest + hermetic integration suite; the build number is fixed at Build kickoff"; Spec requirement 3 (pinned verification), and it is the automated verification vehicle for 11, 12, 13, 14.
- **Acceptance:**
  - `npm run test:opencode` exists and drives exactly the pinned CLI in an XDG-isolated sandbox; no suite file lives under `scripts/test/**`, and `npm test` does not run any part of the suite.
  - The suite covers each mechanic listed above with an explicit pass/fail assertion, and asserts the running build equals `opencode/pin.json`'s `cli`.
  - The stub provider serves `GET /v1/models` and `POST /v1/chat/completions` as streaming SSE so core-flow turns run offline at zero cost.
- **Note:** Executing the suite requires the pinned opencode binary and network access for the install step, so it runs in the Build-phase manual smoke / a dedicated environment, not under the offline `npm test`. The build-writer authors the suite so it runs green where the pinned binary is available; the exact pin number is confirmed by the Build-kickoff smoke (Task 1).

### Task 13: Changeset and changeset-pattern coverage

- **Goal:** Record the feature's changeset and ensure future changes to the opencode packaging artifact are changeset-gated.
- **Type:** tdd (repo-process prose — see note)
- **Files to change:** add `.changeset/<name>.md`; edit `.changeset/config.json` (`changedFilePatterns`).
- **Changes:** Add a `minor` changeset for `@automattic/radical-pipelines` describing opencode v2 support (plugin, per-tool conventions, pinned integration suite). Add `opencode/**` to `changedFilePatterns` in `.changeset/config.json` so changes to the new packaging artifact require a changeset, matching the existing `.claude-plugin/**` entry.
- **Depends on:** none
- **Traces to:** Repo rule "every change to the repository records a changeset"; Design "no build step / zero new dependencies" (the changeset documents the additive feature).
- **Acceptance:**
  - A `.changeset/*.md` file declares a `minor` bump for `@automattic/radical-pipelines` and summarizes opencode v2 support.
  - `changedFilePatterns` in `.changeset/config.json` includes `opencode/**` alongside the existing entries.
  - `npm test` remains green (the changeset validator tests operate on fixtures and are unaffected).
- **Note:** Repo-process change; no new structural unit test is added for the changeset content. Confirm `npm test` stays green.
