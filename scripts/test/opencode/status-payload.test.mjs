import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildLedgerRows,
  buildStatusPayload,
  extractLastText,
  lastSendFor,
  recordError,
  recordRawResponseStart,
  recordRawSessionProgress,
  recordSend,
  recordSessionEventActivity,
  recordSpawn,
  recordTurnEnd,
  turnsFor,
} from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

describe("extractLastText", () => {
  test("returns the newest assistant message's last non-empty text part, trimmed, stamped with the message's completion time", () => {
    // Newest first, as `getSessionMessages` returns them. Text parts carry no
    // time of their own in the session projection.
    const messages = [
      { type: "user", time: { created: 900 }, text: "[from orchestrator] status?" },
      {
        type: "assistant",
        time: { created: 700, completed: 800 },
        content: [
          { type: "text", text: "Seat verified." },
          { type: "tool", name: "shell", state: { status: "completed" } },
          { type: "text", text: "  Let me wait for the sweep to complete.\n" },
        ],
      },
      { type: "assistant", time: { created: 500, completed: 600 }, content: [{ type: "text", text: "Older." }] },
    ];

    assert.deepEqual(extractLastText(messages), { at: 800, excerpt: "Let me wait for the sweep to complete." });
  });

  test("skips tool-only and empty-text assistant messages back to the newest one that carries text", () => {
    const messages = [
      { type: "assistant", time: { created: 900 }, content: [{ type: "tool", name: "read", state: { status: "running" } }] },
      { type: "assistant", time: { created: 850, completed: 860 }, content: [{ type: "text", text: "   " }] },
      { type: "assistant", time: { created: 700, completed: 800 }, content: [{ type: "reasoning", text: "thinking" }, { type: "text", text: "Encoding counterexamples." }] },
    ];

    assert.deepEqual(extractLastText(messages), { at: 800, excerpt: "Encoding counterexamples." });
  });

  test("an in-flight message is stamped with its creation time, and a long text is truncated", () => {
    const long = "x".repeat(500);
    const result = extractLastText([{ type: "assistant", time: { created: 42 }, content: [{ type: "text", text: long }] }]);

    assert.equal(result.at, 42);
    assert.equal(result.excerpt.length, 201);
    assert.ok(result.excerpt.endsWith("…"));
  });

  test("yields nothing for an empty page or one with no assistant text", () => {
    assert.equal(extractLastText([]), undefined);
    assert.equal(extractLastText([{ type: "user", text: "hello" }, { type: "assistant", content: [] }]), undefined);
  });

  test("a full page without text is inconclusive and reports its depth; a short one proves the session never spoke", () => {
    const toolOnly = (n) =>
      Array.from({ length: n }, (_, i) => ({
        type: "assistant",
        time: { created: i },
        content: [{ type: "tool", name: "shell", state: { status: "completed" } }],
      }));

    assert.deepEqual(extractLastText(toolOnly(20), 20), { olderThan: 20 });
    assert.equal(extractLastText(toolOnly(7), 20), undefined, "the transcript is exhausted: no text exists");
    assert.equal(extractLastText(toolOnly(20)), undefined, "without a limit the page cannot be judged full");
  });
});

describe("buildLedgerRows", () => {
  test("maps session records carrying a spawn identity into ledger rows and omits the others", () => {
    const rows = buildLedgerRows(
      [
        {
          id: "ses_ledger_1",
          agent: "radical-pipelines/spec-lead",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/repo/worktree" },
          time: { updated: 123 },
          metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-lead", spawner: "ses_orchestrator" } },
        },
        {
          id: "ses_unrelated",
          agent: "Build",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/other" },
          time: { updated: 456 },
          title: "some other title",
        },
      ],
      new Set(["ses_ledger_1"]),
      () => 2,
    );

    assert.deepEqual(rows, [
      {
        name: "spec-lead",
        pipelineSlug: "144-opencode-support",
        sessionID: "ses_ledger_1",
        agent: "spec-lead",
        model: "anthropic/claude-3-opus",
        directory: "/repo/worktree",
        activity: 123,
        running: true,
        pending: 2,
        permissions: [],
        currentTool: undefined,
        lastTurn: undefined,
        lastSend: undefined,
        lastText: undefined,
      },
    ]);
  });

  test("activity is the later of the record's updated and the session's last observed progress event", () => {
    const record = (id, updated) => ({
      id,
      agent: "spec-reviewer",
      model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
      location: { directory: "/repo" },
      time: { updated },
      metadata: { rp: { pipelineSlug: "144-opencode-support", name: id, spawner: "ses_orchestrator" } },
    });
    // opencode moves `time.updated` only when the session receives
    // input — verified live: a 6-second tool call and the turn's end left it
    // untouched — so a long working turn looks frozen through `updated`
    // alone.
    const stamps = new Map([
      ["ses_tooling", 5_000],
      ["ses_stale_event", 50],
    ]);
    // A streaming tool call's partial arguments emit no progress event, but
    // every provider byte is recorded raw (see `observeHttpResponse`).
    const rawStamps = new Map([["ses_trickling", 9_000]]);
    const rows = buildLedgerRows(
      [
        record("ses_tooling", 100),
        record("ses_stale_event", 100),
        record("ses_unobserved", 100),
        record("ses_no_time", undefined),
        record("ses_trickling", 100),
      ],
      new Set(),
      () => 0,
      () => [],
      () => undefined,
      {
        lastEventAtFor: (id) => (id === "ses_no_time" ? 7 : stamps.get(id)),
        rawProgressAtFor: (id) => rawStamps.get(id),
      },
    );

    assert.deepEqual(
      rows.map((row) => [row.sessionID, row.activity]),
      [
        ["ses_tooling", 5_000],
        ["ses_stale_event", 100],
        ["ses_unobserved", 100],
        ["ses_no_time", 7],
        ["ses_trickling", 9_000],
      ],
    );
  });

  test("maps the plugin's own per-session observations — last turn, last send, last text — onto the row", () => {
    const rows = buildLedgerRows(
      [
        {
          id: "ses_observed",
          agent: "spec-producer",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/repo" },
          time: { updated: 1 },
          metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-producer-1", spawner: "ses_orchestrator" } },
        },
      ],
      new Set(),
      () => 0,
      () => [],
      () => undefined,
      {
        turnsFor: () => ({ turns: 3, lastTurn: { endedAt: 900, outcome: "succeeded" } }),
        lastSendFor: () => ({ at: 800, to: "ses_orchestrator" }),
        lastTextFor: () => ({ at: 899, excerpt: "Let me wait for the sweep to complete." }),
      },
    );

    assert.deepEqual(rows[0].lastTurn, { endedAt: 900, outcome: "succeeded" });
    assert.deepEqual(rows[0].lastSend, { at: 800, to: "ses_orchestrator" });
    assert.deepEqual(rows[0].lastText, { at: 899, excerpt: "Let me wait for the sweep to complete." });
  });

  test("recognizes a session by the identity it carries, whatever its title and whether or not this process recorded it", () => {
    const rows = buildLedgerRows(
      [
        {
          id: "ses_after_restart",
          agent: "radical-pipelines/spec-lead",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/repo" },
          time: { updated: 1 },
          title: "Build task 89 execution report",
          metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-lead-2", spawner: "ses_orchestrator" } },
        },
        {
          id: "ses_titled_only",
          agent: "radical-pipelines/spec-lead",
          time: { updated: 1 },
          title: "rp:144-opencode-support:spec-lead-3",
        },
      ],
      new Set(),
      () => 0,
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].sessionID, "ses_after_restart");
    assert.equal(rows[0].name, "spec-lead-2");
    assert.equal(rows[0].agent, "spec-lead");
  });
});

describe("buildStatusPayload", () => {
  test("reports unavailable status without touching the network when the server cannot be resolved", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const result = await buildStatusPayload({
      env: {},
      readServiceRecord: () => null,
    });

    assert.equal(result.ledger.length, 0);
    assert.equal(Object.hasOwn(result, "pin"), false);
    assert.equal(typeof result.pluginVersion, "string");
    assert.deepEqual(result.recentErrors, []);
    assert.deepEqual(result.readFailures, [{ endpoint: "server", status: "unreachable", count: 1 }]);
  });

  test("a session scope reads the session list, active set, and that session's pending count, permissions, and newest text through the reach helper and the injected HTTP client", async () => {
    recordSpawn("ses_status_1", {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    // Every opencode HTTP GET response envelopes its payload as
    // `{ data: ... }` — verified live against opencode.
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              {
                id: "ses_status_1",
                agent: "spec-lead",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 42 },
                metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-lead", spawner: "ses_orchestrator" } },
              },
              // The list spans every project the server knows; a session RP
              // does not recognize gets no per-session reads (any would hit
              // the `unexpected request` throw below and surface as a
              // transport failure).
              {
                id: "ses_someone_elses",
                agent: "build",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/elsewhere" },
                time: { updated: 7 },
                title: "Fix the flaky test",
              },
            ],
          },
        };
      }
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: { ses_status_1: { type: "running" } } } };
      }
      if (url.pathname === "/api/session/ses_status_1/inbox") {
        return { status: 200, body: { data: [{ admittedSeq: 1, delivery: "queue", text: "x" }] } };
      }
      if (url.pathname === "/api/session/ses_status_1/permission") {
        return {
          status: 200,
          body: {
            data: [
              {
                id: "per_1",
                sessionID: "ses_status_1",
                action: "external_directory",
                resources: ["/repo-main/.agents/skills/testing/*"],
                save: ["/repo-main/*"],
              },
            ],
          },
        };
      }
      if (url.pathname === "/api/session/ses_status_1/message") {
        assert.equal(url.searchParams.get("limit"), "20", "a bounded page, newest first");
        return {
          status: 200,
          body: {
            data: [
              {
                id: "msg_2",
                type: "assistant",
                time: { created: 900, completed: 950 },
                content: [{ type: "text", text: "Reading the review now.\n" }],
              },
              { id: "msg_1", type: "user", time: { created: 100 }, text: "start" },
            ],
          },
        };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };

    const result = await buildStatusPayload({
      session: "ses_status_1",
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
    });

    assert.equal(result.ledger.length, 1);
    assert.deepEqual(result.ledger[0], {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      sessionID: "ses_status_1",
      agent: "spec-lead",
      model: "anthropic/claude-3-opus",
      directory: "/repo",
      activity: 42,
      running: true,
      pending: 1,
      permissions: [
        {
          id: "per_1",
          action: "external_directory",
          resources: ["/repo-main/.agents/skills/testing/*"],
        },
      ],
      currentTool: undefined,
      lastTurn: undefined,
      lastSend: undefined,
      lastText: { at: 950, excerpt: "Reading the review now." },
    });
    assert.deepEqual(result.readFailures, []);
  });

  test("a pipeline scope reports that pipeline's sessions alone, reading no transcript, and narrows the errors to them plus those naming no session", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    recordSpawn("ses_scope_a1", { name: "spec-lead", pipelineSlug: "pipeline-a", spawner: "ses_orch_a" });
    recordSpawn("ses_scope_a2", { name: "spec-reviewer-1", pipelineSlug: "pipeline-a", spawner: "ses_orch_a" });
    recordSpawn("ses_scope_b1", { name: "spec-lead", pipelineSlug: "pipeline-b", spawner: "ses_orch_b" });
    // Recorded, then gone from the server: a dead agent whose failure the
    // pipeline still needs.
    recordSpawn("ses_scope_a_gone", { name: "helper-1", pipelineSlug: "pipeline-a", spawner: "ses_orch_a" });
    recordError({ type: "session.execution.failed", sessionID: "ses_scope_a1", at: 1 });
    recordError({ type: "session.execution.failed", sessionID: "ses_scope_b1", at: 2 });
    recordError({ type: "listener.lost", error: "boom", at: 3 });
    recordError({ type: "session.execution.failed", sessionID: "ses_scope_a_gone", at: 4 });
    // Known by its stored identity alone, as after a daemon restart.
    recordError({ type: "session.execution.failed", sessionID: "ses_scope_a_titled", at: 5 });
    // Not RP's: neither recorded nor carrying an identity.
    recordError({ type: "skill.resupply.unreadable", sessionID: "ses_someone_elses", at: 6 });
    // Naming a session, however malformed, is never sessionless.
    recordError({ type: "session.execution.failed", sessionID: 42, at: 7 });

    const record = (id, slug, name) => ({
      id,
      agent: "spec-lead",
      model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
      location: { directory: `/${slug}` },
      time: { updated: 1 },
      metadata: { rp: { pipelineSlug: slug, name, spawner: "ses_orchestrator" } },
    });
    const reads = [];
    const requestFn = async (url) => {
      reads.push(url.pathname);
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              record("ses_scope_a1", "pipeline-a", "spec-lead"),
              record("ses_scope_b1", "pipeline-b", "spec-lead"),
              record("ses_scope_a2", "pipeline-a", "spec-reviewer-1"),
              record("ses_scope_a_titled", "pipeline-a", "spec-reviewer-2"),
              { ...record("ses_someone_elses", "x", "y"), metadata: undefined },
            ],
          },
        };
      }
      return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    };
    const env = { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" };

    const scoped = await buildStatusPayload({ pipelineSlug: "pipeline-a", env, readServiceRecord: () => null, requestFn, now: () => 6_001 });
    assert.deepEqual(
      scoped.ledger,
      [
        { sessionID: "ses_scope_a1", running: false, secondsSinceActivity: 6, pending: 0, permissions: [] },
        { sessionID: "ses_scope_a2", running: false, secondsSinceActivity: 6, pending: 0, permissions: [] },
        { sessionID: "ses_scope_a_titled", running: false, secondsSinceActivity: 6, pending: 0, permissions: [] },
      ],
    );
    assert.equal(Object.hasOwn(scoped, "pluginVersion"), false);
    assert.ok(scoped.ledger.every((row) => !Object.hasOwn(row, "lastText")));
    assert.deepEqual(
      reads.filter((path) => path.includes("ses_scope_b1") || path.endsWith("/message")),
      [],
      "no per-session read for another pipeline's session, and no transcript read at all",
    );
    assert.deepEqual(
      scoped.recentErrors.map((entry) => entry.sessionID),
      ["ses_scope_a1", undefined, "ses_scope_a_gone", "ses_scope_a_titled"],
      "the pipeline's errors — of live, gone, and unrecorded sessions — and the sessionless ones",
    );

    const one = await buildStatusPayload({ session: "ses_scope_a_gone", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(one.ledger, [], "a session the server no longer lists has no row");
    assert.deepEqual(
      one.recentErrors.map((entry) => entry.sessionID),
      [undefined, "ses_scope_a_gone"],
      "but keeps its errors",
    );

    const titled = await buildStatusPayload({ session: "ses_scope_a_titled", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(titled.ledger.map((row) => row.sessionID), ["ses_scope_a_titled"]);
    assert.deepEqual(titled.recentErrors.map((entry) => entry.sessionID), [undefined, "ses_scope_a_titled"]);

    const foreign = await buildStatusPayload({ session: "ses_someone_elses", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(foreign.ledger, [], "a session RP does not recognize has no row");
    assert.deepEqual(foreign.recentErrors.map((entry) => entry.type), ["listener.lost"], "and no errors");

    const unscoped = await buildStatusPayload({ env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(
      unscoped.ledger.map((row) => row.sessionID),
      ["ses_scope_a1", "ses_scope_b1", "ses_scope_a2", "ses_scope_a_titled"],
    );
    assert.equal(unscoped.recentErrors.length, 7, "an unscoped call reports every error");

    const missing = await buildStatusPayload({ pipelineSlug: "pipeline-c", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(missing.ledger, []);
    assert.deepEqual(missing.recentErrors.map((entry) => entry.type), ["listener.lost"]);

    const unlisted = await buildStatusPayload({
      pipelineSlug: "pipeline-a",
      env,
      readServiceRecord: () => null,
      requestFn: async (url) => (url.pathname === "/api/session" ? { status: 500, body: undefined } : requestFn(url)),
    });
    assert.deepEqual(unlisted.ledger, []);
    assert.deepEqual(unlisted.readFailures, [{ endpoint: "session", status: 500, count: 1 }]);
    assert.deepEqual(
      unlisted.recentErrors.map((entry) => entry.sessionID),
      ["ses_scope_a1", undefined, "ses_scope_a_gone"],
      "a failed session list still yields the recorded sessions' errors",
    );

    await assert.rejects(
      () => buildStatusPayload({ pipelineSlug: "pipeline-a", session: "ses_scope_a1", env, readServiceRecord: () => null, requestFn }),
      /pipeline_slug or session, not both/,
    );
  });

  test("folds the plugin's in-process observations — progress events, turn ends, sends — into the row", async () => {
    recordSpawn("ses_status_obs", {
      name: "spec-reviewer-1",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    recordSessionEventActivity(
      { type: "session.tool.called", data: { sessionID: "ses_status_obs" } },
      5_000,
    );
    recordTurnEnd({ type: "session.execution.succeeded", data: { sessionID: "ses_status_obs" } }, 4_000);
    recordSend("ses_status_obs", "ses_orchestrator", 3_000);

    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              {
                id: "ses_status_obs",
                agent: "spec-reviewer",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 1_000 },
                metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-reviewer-1", spawner: "ses_orchestrator" } },
              },
            ],
          },
        };
      }
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: {} } };
      }
      return { status: 200, body: { data: [] } };
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
    });

    const row = result.ledger[0];
    assert.equal(row.activity, 5_000, "a tool event newer than `updated` is the liveness signal");
    assert.deepEqual(row.lastTurn, { endedAt: 4_000, outcome: "succeeded" });
    assert.deepEqual(row.lastSend, { at: 3_000, to: "ses_orchestrator" });
    assert.equal(Object.hasOwn(row, "lastText"), false, "the transcript is read only for a session scope");
    const health = await buildStatusPayload({
      pipelineSlug: "144-opencode-support",
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null, requestFn, now: () => 10_000,
    });
    assert.equal(health.ledger[0].secondsSinceActivity, 5);
  });

  test("folds raw provider progress into activity when it is the newest evidence", async () => {
    recordSpawn("ses_status_raw", {
      name: "build-writer-1",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    const generation = recordRawResponseStart("ses_status_raw", 6_000);
    recordRawSessionProgress("ses_status_raw", generation, 9_000);

    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              {
                id: "ses_status_raw",
                agent: "build-writer",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 1_000 },
                metadata: { rp: { pipelineSlug: "144-opencode-support", name: "build-writer-1", spawner: "ses_orchestrator" } },
              },
            ],
          },
        };
      }
      return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
    });

    assert.equal(result.ledger[0].activity, 9_000);
    const health = await buildStatusPayload({
      pipelineSlug: "144-opencode-support",
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null, requestFn, now: () => 10_000,
    });
    assert.equal(health.ledger[0].secondsSinceActivity, 1);
  });

  test("reads the deeper message page only when the first is full and textless, and reports the searched depth when both are", async () => {
    recordSpawn("ses_status_deep", {
      name: "build-writer-2",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    const toolStep = (i) => ({
      id: `msg_${i}`,
      type: "assistant",
      time: { created: i },
      content: [{ type: "tool", name: "shell", state: { status: "completed" } }],
    });
    const messageReads = [];
    let deepPageHasText = true;
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              {
                id: "ses_status_deep",
                agent: "build-writer",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 1 },
                metadata: { rp: { pipelineSlug: "144-opencode-support", name: "build-writer-2", spawner: "ses_orchestrator" } },
              },
            ],
          },
        };
      }
      if (url.pathname === "/api/session/ses_status_deep/message") {
        const limit = Number(url.searchParams.get("limit"));
        messageReads.push(limit);
        // 25 consecutive tool-only steps, then the text the reviewer's probe
        // found in the full transcript but the first page missed.
        const page = Array.from({ length: limit }, (_, i) => toolStep(1_000 - i));
        if (limit > 20 && deepPageHasText) {
          page[25] = { id: "msg_text", type: "assistant", time: { created: 900, completed: 901 }, content: [{ type: "text", text: "Tests green." }] };
        }
        return { status: 200, body: { data: page } };
      }
      return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    };
    const env = { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" };

    const found = await buildStatusPayload({ session: "ses_status_deep", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(messageReads, [20, 100], "the deeper page is read only after a full, textless first page");
    assert.deepEqual(found.ledger[0].lastText, { at: 901, excerpt: "Tests green." });

    messageReads.length = 0;
    deepPageHasText = false;
    const silent = await buildStatusPayload({ session: "ses_status_deep", env, readServiceRecord: () => null, requestFn });
    assert.deepEqual(messageReads, [20, 100]);
    assert.deepEqual(silent.ledger[0].lastText, { olderThan: 100 }, "a textless deep page reports how far the search reached");
    assert.deepEqual(silent.readFailures, []);

    messageReads.length = 0;
    const emptyPage = (url) =>
      url.pathname === "/api/session" ? requestFn(url) : { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    const mute = await buildStatusPayload({ session: "ses_status_deep", env, readServiceRecord: () => null, requestFn: emptyPage });
    assert.equal(mute.ledger[0].lastText, null, "a short, textless transcript holds no text");
  });

  test("reports failed server reads in readFailures, aggregated per endpoint and status, instead of rendering them as idle and healthy", async () => {
    recordSpawn("ses_status_f1", {
      name: "spec-researcher-1",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    recordSpawn("ses_status_f2", {
      name: "spec-researcher-2",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    const sessionRecord = (id, name) => ({
      id,
      agent: "spec-researcher",
      model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
      location: { directory: "/repo" },
      time: { updated: 42 },
      metadata: { rp: { pipelineSlug: "144-opencode-support", name, spawner: "ses_orchestrator" } },
    });
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              sessionRecord("ses_status_f1", "spec-researcher-1"),
              sessionRecord("ses_status_f2", "spec-researcher-2"),
            ],
          },
        };
      }
      if (url.pathname === "/api/session/active") {
        return { status: 500, body: undefined };
      }
      // Per-session endpoints missing on a drifted build.
      return { status: 404, body: undefined };
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
    });

    assert.equal(result.ledger.length, 2);
    for (const row of result.ledger) {
      assert.equal(row.running, undefined);
      assert.equal(row.pending, undefined);
      assert.equal(row.permissions, undefined);
      assert.equal(row.lastText, undefined);
    }
    assert.deepEqual(
      result.readFailures.sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1)),
      [
        { endpoint: "active", status: 500, count: 1 },
        { endpoint: "inbox", status: 404, count: 2 },
        { endpoint: "permission", status: 404, count: 2 },
      ],
    );
  });

  test("health and diagnostic scopes preserve unknown facts for HTTP, transport, and malformed reads", async () => {
    const id = "ses_status_unknown";
    const env = { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" };
    const record = { id, agent: "worker", metadata: { rp: { pipelineSlug: "status-unknown", name: "worker", spawner: "ses_orchestrator" } }, time: { updated: 42 } };
    const endpoints = [
      ["active", "running", "/api/session/active"],
      ["inbox", "pending", `/api/session/${id}/inbox`],
      ["permission", "permissions", `/api/session/${id}/permission`],
    ];
    for (const pipeline of [true, false]) {
      const scope = pipeline ? { pipelineSlug: "status-unknown" } : { session: id };
      for (const [endpoint, field, path] of endpoints) {
        for (const failure of [503, "transport", "malformed"]) {
          const requestFn = async (url) => {
            if (url.pathname === path) {
              if (failure === "transport") throw new Error("connection lost");
              return failure === "malformed" ? { status: 200, body: {} } : { status: failure };
            }
            const data = url.pathname === "/api/session" ? [record] : url.pathname === "/api/session/active" ? {} : [];
            return { status: 200, body: { data, cursor: { previous: null, next: null } } };
          };
          const result = await buildStatusPayload({ ...scope, env, readServiceRecord: () => null, requestFn });
          assert.equal(result.ledger[0][field], pipeline ? null : undefined, `${endpoint}: ${failure}`);
          assert.deepEqual(result.readFailures, [{ endpoint, status: failure, count: 1 }]);
        }
      }
    }
  });

  test("malformed health sources and an unreachable server are explicit failures rather than healthy defaults", async () => {
    const scope = { pipelineSlug: "status-malformed", readServiceRecord: () => null, now: () => 10_000 };
    const unreachable = await buildStatusPayload({ ...scope, env: {} });
    assert.deepEqual(unreachable.readFailures, [{ endpoint: "server", status: "unreachable", count: 1 }]);
    const record = { id: "ses_malformed", agent: "worker", metadata: { rp: { pipelineSlug: "status-malformed", name: "worker", spawner: "ses_orchestrator" } }, time: { updated: 1000 } };
    const cases = [
      ["session", {}, null],
      ["session", [null], null],
      ["session", [{ ...record, id: null }], null],
      ["active", [], "running"],
      ["inbox", { length: 0 }, "pending"],
      ["permission", [null], "permissions"],
      ["permission", [{ id: "per_1", action: "read", resources: "not an array" }], "permissions"],
      ["activity", [{ ...record, time: {} }], "secondsSinceActivity"],
    ];
    for (const [endpoint, malformed, field] of cases) {
      const result = await buildStatusPayload({
        ...scope, env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        requestFn: async (url) => {
          const path = url.pathname.split("/").at(-1);
          const data = path === endpoint || (endpoint === "activity" && path === "session")
            ? malformed : path === "session" ? [record] : path === "active" ? {} : [];
          return { status: 200, body: { data, cursor: { previous: null, next: null } } };
        },
      });
      if (field) assert.equal(result.ledger[0][field], null, endpoint);
      else assert.deepEqual(result.ledger, []);
      assert.deepEqual(result.readFailures, [{ endpoint, status: "malformed", count: 1 }]);
    }
  });

  test("reports thrown server reads as transport failures while preserving the partial ledger", async () => {
    recordSpawn("ses_status_transport", {
      name: "spec-researcher-transport",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            cursor: { previous: null, next: null },
            data: [
              {
                id: "ses_status_transport",
                agent: "spec-researcher",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 42 },
                metadata: { rp: { pipelineSlug: "144-opencode-support", name: "spec-researcher-transport", spawner: "ses_orchestrator" } },
              },
            ],
          },
        };
      }
      throw new Error("connection lost");
    };

    const result = await buildStatusPayload({
      session: "ses_status_transport",
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
    });

    assert.equal(result.ledger.length, 1);
    assert.equal(result.ledger[0].running, undefined);
    assert.equal(result.ledger[0].pending, undefined);
    assert.equal(result.ledger[0].permissions, undefined);
    assert.equal(result.ledger[0].lastText, undefined);
    assert.deepEqual(
      result.readFailures.sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1)),
      [
        { endpoint: "active", status: "transport", count: 1 },
        { endpoint: "inbox", status: "transport", count: 1 },
        { endpoint: "message", status: "transport", count: 1 },
        { endpoint: "permission", status: "transport", count: 1 },
      ],
    );
  });
});

describe("buildStatusPayload: the session list", () => {
  const env = { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" };
  const record = (id, identity = { pipelineSlug: "paged-run", name: id, spawner: "ses_orchestrator" }) => ({
    id,
    agent: "worker",
    time: { updated: 1 },
    ...(identity && { metadata: { rp: identity } }),
  });

  /** A paged session list: each cursor names the page after it, as opencode's does. */
  const pagedList = (pages, { failAt } = {}) => {
    const listed = [];
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        const index = Number(url.searchParams.get("cursor") ?? 0);
        listed.push({ cursor: url.searchParams.get("cursor"), limit: url.searchParams.get("limit") });
        if (index === failAt) return { status: 500, body: undefined };
        const page = pages[index] ?? [];
        return { status: 200, body: { data: page, cursor: { previous: null, next: page.length > 0 ? String(index + 1) : null } } };
      }
      return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    };
    return { listed, requestFn };
  };

  test("reads every page, so an agent past the newest page is still reported", async () => {
    const { listed, requestFn } = pagedList([
      [record("ses_paged_1"), record("ses_paged_foreign", null)],
      [record("ses_paged_2")],
    ]);

    const result = await buildStatusPayload({ pipelineSlug: "paged-run", env, readServiceRecord: () => null, requestFn });

    assert.deepEqual(result.ledger.map((row) => row.sessionID), ["ses_paged_1", "ses_paged_2"]);
    assert.deepEqual(listed, [
      { cursor: null, limit: "500" },
      { cursor: "1", limit: "500" },
      { cursor: "2", limit: "500" },
    ], "pages are followed until one comes back empty");
    assert.deepEqual(result.readFailures, []);
  });

  test("a page that cannot be read is a failure, not the end of the list", async () => {
    const { requestFn } = pagedList([[record("ses_paged_before")], [record("ses_paged_lost")]], { failAt: 1 });

    const result = await buildStatusPayload({ pipelineSlug: "paged-run", env, readServiceRecord: () => null, requestFn });

    assert.deepEqual(result.ledger.map((row) => row.sessionID), ["ses_paged_before"]);
    assert.deepEqual(result.readFailures, [{ endpoint: "session", status: 500, count: 1 }]);
  });

  test("a page naming no next page ends the list", async () => {
    const listed = [];
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        listed.push(url.searchParams.get("cursor"));
        return { status: 200, body: { data: [record("ses_paged_last")], cursor: { previous: null, next: null } } };
      }
      return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
    };

    const result = await buildStatusPayload({ pipelineSlug: "paged-run", env, readServiceRecord: () => null, requestFn });

    assert.deepEqual(result.ledger.map((row) => row.sessionID), ["ses_paged_last"]);
    assert.deepEqual(listed, [null]);
    assert.deepEqual(result.readFailures, []);
  });

  for (const [label, cursor] of [
    ["no cursor", undefined],
    ["a cursor without next", { previous: null }],
    ["a next that is not a cursor", { previous: null, next: 2 }],
  ]) {
    test(`a page with ${label} is a failure, not the end of the list, and its sessions are still reported`, async () => {
      const requestFn = async (url) => {
        if (url.pathname === "/api/session") {
          return { status: 200, body: { data: [record("ses_paged_uncertain")], ...(cursor && { cursor }) } };
        }
        return { status: 200, body: { data: url.pathname === "/api/session/active" ? {} : [] } };
      };

      const result = await buildStatusPayload({ pipelineSlug: "paged-run", env, readServiceRecord: () => null, requestFn });

      assert.deepEqual(result.ledger.map((row) => row.sessionID), ["ses_paged_uncertain"]);
      assert.deepEqual(result.readFailures, [{ endpoint: "session", status: "malformed", count: 1 }]);
    });
  }

  test("a session carrying malformed RP metadata is a failure, and the others are still reported", async () => {
    const { requestFn } = pagedList([[record("ses_paged_bad", { name: "no slug" }), record("ses_paged_good")]]);

    const result = await buildStatusPayload({ pipelineSlug: "paged-run", env, readServiceRecord: () => null, requestFn });

    assert.deepEqual(result.ledger.map((row) => row.sessionID), ["ses_paged_good"]);
    assert.deepEqual(result.readFailures, [{ endpoint: "session", status: "malformed", count: 1 }]);
  });
});
