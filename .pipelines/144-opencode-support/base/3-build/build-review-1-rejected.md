# Build Review

## Verdict: rejected

## Batch scope

Expected new work: Task 1 (Pin manifest), Task 2 (Model-string parsing), Task 3 (Ledger, attribution, and durable title), Task 4 (Loop registry), Task 5 (Agent materialization), Task 6 (Status and pin comparison), Task 7 (Plugin module — tools, listener, scheduler, and server reach), Task 8 (Package entry point), Task 9 (opencode convention file), Task 10 (setup.md Tool→Read row), Task 11 (load.md tool-mismatch guard), Task 12 (opencode integration suite), Task 13 (Changeset and changeset-pattern coverage)
Diff reviewed: `f9740b9^` → HEAD (the phase's whole work)

## Summary

The phase is substantially complete and high quality. All thirteen tasks landed; the plugin module is zero-dependency, thoroughly documented, and its pure helpers are unit-tested against every per-task Acceptance bullet of Tasks 1–8; the skill-surface prose (Tasks 9–11) matches the plan exactly and stays tool-agnostic where required; the changeset and pattern coverage (Task 13) are correct; and I independently re-ran the pinned integration suite in this review — 26/26 checks green against `@opencode-ai/cli@0.0.0-next-15772`, confirming Task 12's in-phase execution requirement. The runtime-contract corrections in commit `d64cb07` are consistent with live verification and covered by tests. The `scripts/test/release-version-script.test.mjs` edit, though not listed in any task's files, is a forced adaptation of a test that pinned `package.json`'s scripts object before Task 12 added `test:opencode`; it maps to Task 12 and is not scope creep. The rejection rests on five concrete issues: shipped suite files cite the build plan's flow numbering (software-only-output violation), the completion notification affirmatively claims success when a child's first turn failed, the materialization collision report is discarded at runtime with no observable surface, the message-failure chain's `/pending` stage has no suite coverage, and one vacuous unit-test assertion.

## Checks

| Check | Command | Result |
| ----- | ------- | ------ |
| tests | `npm test` (from the worktree root) | skipped (verdict is rejected; gates are skipped by protocol and re-run at the approval iteration) |

## Behavior verification

- **Automated flows (Flows 2, 6–9, 12, 13, 16 — core stub-provider path):** I ran `npm run test:opencode` myself from the worktree root. Result: **26/26 checks passed** against the pinned CLI (`Pinned opencode build: 0.0.0-next-15772`), in an XDG-isolated sandbox (`serve` on `127.0.0.1:46177`, offline SSE stub provider). The transcript covered: plugin load + `/api/plugin` version id; skill registration by reference; agent materialization (byte-identical, filename-derived ids) with foreign-file collision safety; `rp_spawn` bogus-agent and bogus-model rejection, seat-at-directory, session-ID return; spawner completion notification and the durable `rp:` title winning the auto-title race; `rp_send` attribution derived from the caller (forged in-body attribution never becomes the prefix), reply path, dead-target 404 as tool result; loop start/list with caller default target, busy-tick skip, idle-tick injection, cancel, and leftover survival + re-arm + cancel across a `serve` restart; the pin assertion (`opencode2 --version` equals `pin.json.cli`); `rp_status` version/pin/ledger; interrupt; same-session model switch; `provider.auth` structured error with model-swap and re-spawn recovery; and the tool-call network-error probe (failure surfaces in the tool's own result; the turn terminates rather than hanging).
- **Skill-surface flows (Flows 4, 5, 17 prose surface):** verified statically — `setup.md`'s Tool→Read table carries both rows unchanged otherwise; `opencode.md`'s canonical blocks name exactly the shipped `rp_*` tools and arguments; `load.md`'s added rule is tool-agnostic and reduces a mismatch to the existing missing-conventions stop/explain/offer-setup flow, preserving behavior when the section matches (this repo's own `.rp.md` `## Claude Code conventions` section matches under Claude Code).
- **Manual smoke flows (Flows 1, 3, 4, 5, 10 manual part, 14, 15):** not re-driven in this iteration — they require a live interactive orchestrator session on a pinned install with real models. Since this iteration ends in rejection, they remain open for the approval iteration.

## Issues

### Issue 1: Shipped integration-suite files cite the build plan's e2e flow numbering

**Task:** Task 12: opencode integration suite
**What's wrong:** Seven shipped repository files reference the run's planning artifact by its flow numbers — e.g. "Flow 6 (spawn, seat, identifier, completion notification)", "Flow 12 (auth-error recovery — model swap + re-spawn)". Task outputs are software-only: they must not reference a specific e2e flow, task, requirement, or acceptance criterion from the run's artifacts. To a repository reader without `.pipelines/`, "Flow 12" is meaningless.
**Where:** `scripts/opencode-integration/checks/spawn-and-messaging.mjs:2`, `scripts/opencode-integration/checks/health-loop.mjs:2`, `scripts/opencode-integration/checks/status-and-pin.mjs:2`, `scripts/opencode-integration/checks/plugin-and-materialization.mjs:2`, `scripts/opencode-integration/checks/auth-recovery.mjs:2`, `scripts/opencode-integration/checks/network-error-probe.mjs:2`, `scripts/opencode-integration/checks/interrupt-and-model-switch.mjs:3`
**Expected:** Each file's header describes the covered behavior in repo-standalone terms (e.g. "spawn, seat, identifier, and completion-notification mechanics") with no flow-number citations.

### Issue 2: The completion notification claims success when the child's first turn failed

**Task:** Task 7: Plugin module — tools, listener, scheduler, and server reach
**What's wrong:** The listener fires on both `session.execution.succeeded` and `session.execution.failed`, but the injected message is always `"[rp] <name> (<sid>) completed its first turn."`. The design's failure-mode mapping routes first-turn spawn failures (residual bad model, provider auth, etc.) through exactly this notification — "surface as `session.execution.failed` on the child's first turn, which the completion listener reports to the spawner". As shipped, an orchestrator whose child died on its first turn is told it "completed its first turn" and has no reason to consult `rp_status`; the report is factually wrong in the failure case.
**Where:** `opencode/plugin.mjs:877-881` (the `ctx.session.prompt` text in `onTerminalEvent`)
**Expected:** The notification text conveys the terminal outcome — distinguishing succeeded from failed (e.g. derived from `event.type`) — with a unit test asserting both texts. The suite's success-path assertion (`scripts/opencode-integration/checks/spawn-and-messaging.mjs:84`) needs the matching update.

### Issue 3: The materialization collision report is discarded — no runtime surface ever reports a collision

**Task:** Task 7: Plugin module — tools, listener, scheduler, and server reach (coverage follow-up: Task 12: opencode integration suite)
**What's wrong:** `materializeAgents` returns `{ written, collisions }`, but `setup()` drops the return value. The design requires materialization to "report a collision with a pre-existing same-named foreign agent instead of clobbering it" — as shipped, a collision is silent: the RP agent is quietly absent and the owner first learns of it when `rp_spawn` rejects an "unknown agent". The plan's suite-coverage list also names "agent materialization + collision reporting", but the suite can only assert collision *safety* (the foreign file untouched — which it does) because no report surface exists to assert against.
**Where:** `opencode/plugin.mjs:1486` (`materializeAgents(...)` call in `setup`, result discarded)
**Expected:** Collisions are surfaced through an observable channel — e.g. appended to the bounded error log so `rp_status`'s `recentErrors` reports them — with a unit test; and a Task 12 check asserting the seeded `spec-lead.md` collision appears on that surface.

### Issue 4: The message-failure chain's `/pending` stage has no suite coverage

**Task:** Task 12: opencode integration suite
**What's wrong:** The plan's automated message-failure coverage spans three observable stages: the synchronous 404 (covered), an admitted-but-unpromoted input lingering in `/pending` (uncovered), and a post-promotion execution failure (covered via the structured-error path). No check ever forces an input to linger and observes it through `/pending` — `lib/api-client.mjs` exports `getPending` but nothing calls it, and `rp_status`'s per-session `pending` count is never driven to a nonzero value end-to-end.
**Where:** `scripts/opencode-integration/checks/spawn-and-messaging.mjs` (the failure-chain checks); `scripts/opencode-integration/lib/api-client.mjs:146` (unused `getPending`)
**Expected:** A check that queues a message into a busy target (e.g. during a slow-prompt window), asserts the admitted input is observable via `GET /api/session/{id}/pending` (directly and/or as a nonzero `pending` in `rp_status`'s ledger row) before promotion, and observes it drain after.

### Issue 5: Vacuous self-comparison assertion in the plugin unit tests

**Task:** Task 7: Plugin module — tools, listener, scheduler, and server reach
**What's wrong:** `assert.deepEqual(result.recentErrors, result.recentErrors)` compares a value to itself — it passes unconditionally (including when the field is `undefined`) and asserts nothing, while reading as coverage of the status payload's `recentErrors` field.
**Where:** `scripts/test/opencode/plugin.test.mjs:817`
**Expected:** A real expectation — e.g. `assert.ok(Array.isArray(result.recentErrors))` or an equality check against the known error-log state.
