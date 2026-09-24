import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  appendToErrorLog,
  recordDiagnostic,
  recordError,
  shapeStatus,
} from "../../../opencode/plugin.mjs";

describe("appendToErrorLog", () => {
  test("appends within the cap without dropping anything", () => {
    let log = [];
    log = appendToErrorLog(log, "a", 3);
    log = appendToErrorLog(log, "b", 3);

    assert.deepEqual(log, ["a", "b"]);
  });

  test("appending beyond the cap drops the oldest and keeps the most recent up to the cap", () => {
    let log = [];
    for (const entry of ["a", "b", "c", "d"]) {
      log = appendToErrorLog(log, entry, 3);
    }

    assert.deepEqual(log, ["b", "c", "d"]);
  });

  test("does not mutate the input log", () => {
    const log = ["a"];
    const next = appendToErrorLog(log, "b", 3);

    assert.deepEqual(log, ["a"]);
    assert.deepEqual(next, ["a", "b"]);
  });

  test("uses a default cap when none is given", () => {
    let log = [];
    for (let i = 0; i < 25; i++) {
      log = appendToErrorLog(log, `entry-${i}`);
    }

    assert.ok(log.length <= 25);
    assert.equal(log[log.length - 1], "entry-24");
  });
});

describe("shapeStatus", () => {
  test("pipeline health preserves decision signals while detailed status preserves diagnostic context", () => {
    const permissions = [{ id: "per_1", action: "external_directory", resources: ["/shared/*"] }];
    const entries = [
      {
        sessionID: "ses_active", name: "worker run-1", pipelineSlug: "run", agent: "worker",
        model: "provider/model", directory: "/repo/worktree", activity: 100_001,
        running: true, pending: 0, permissions: [],
        currentTool: { tool: "shell", target: "npm test", since: 100_000 },
        lastTurn: { outcome: "succeeded", endedAt: 80_000 },
        lastSend: { to: "ses_orchestrator", at: 90_000 },
        lastText: { at: 100_000, excerpt: "Running tests." },
      },
      { sessionID: "ses_stale", activity: 0, running: true, pending: 1, permissions: [] },
      { sessionID: "ses_stopped", activity: 110_000, running: false, pending: 0, permissions: [] },
      { sessionID: "ses_blocked", activity: 0, running: true, pending: 0, permissions },
    ];
    const input = { pluginVersion: "v", ledgerEntries: entries, errorLog: [], now: 112_000 };
    const health = shapeStatus({ ...input, pipelineSlug: "run" });
    assert.deepEqual(health, {
      ledger: [
        { sessionID: "ses_active", running: true, secondsSinceActivity: 11, pending: 0, permissions: [] },
        { sessionID: "ses_stale", running: true, secondsSinceActivity: 112, pending: 1, permissions: [] },
        { sessionID: "ses_stopped", running: false, secondsSinceActivity: 2, pending: 0, permissions: [] },
        { sessionID: "ses_blocked", running: true, secondsSinceActivity: 112, pending: 0, permissions },
      ],
      recentErrors: [],
      readFailures: [],
    });
    const detailed = shapeStatus(input);
    assert.equal(detailed.pluginVersion, "v");
    assert.deepEqual(detailed.ledger[0], entries[0]);
  });

  test("health activity age distinguishes missing evidence from recent activity and tolerates clock skew", () => {
    const readFailures = [{ endpoint: "active", status: 500, count: 1 }];
    const result = shapeStatus({
      pipelineSlug: "run", now: 10_000, errorLog: [], readFailures,
      ledgerEntries: [undefined, null, NaN, Infinity, "1000", 9_999, 10_000, 10_001].map((activity, i) => ({
        sessionID: `ses_${i}`, activity,
      })),
    });
    assert.deepEqual(result.ledger.map((row) => row.secondsSinceActivity), [null, null, null, null, null, 0, 0, 0]);
    assert.ok(result.ledger.every((row) => row.running === null && row.pending === null && row.permissions === null));
    assert.deepEqual(result.readFailures, readFailures);
  });

  test("health includes bounded failure summaries while detailed scopes retain every diagnostic event", () => {
    const logKey = Symbol.for("radical-pipelines.opencode.errorLog");
    globalThis[logKey] = [];
    const events = [
      { type: "permission.forwarded", sessionID: "ses_a", at: 1, requestID: "per_1", resources: ["/shared/*"] },
      { type: "session.execution.failed", sessionID: "ses_a", at: 2, error: { type: "auth", message: "Sign in\nagain", detail: "full details" } },
      { type: "listener.lost", at: 3, error: "x".repeat(300), internal: "full details" },
      { type: "permission.redirect.failed", sessionID: "ses_a", at: 4, status: 503, requestID: "per_1" },
      { type: "loop.tick.skipped", at: 5, reason: "server unreachable", loopID: "loop_1" },
      { type: "loop.tick.timeout", at: 6, timeoutMs: 120_000 },
    ];
    recordDiagnostic(events[0]);
    events.slice(1).forEach(recordError);
    const errorLog = globalThis[logKey];
    const input = { pluginVersion: "v", ledgerEntries: [], errorLog };
    assert.deepEqual(shapeStatus({ ...input, pipelineSlug: "run" }).recentErrors, [
      { type: "session.execution.failed", sessionID: "ses_a", at: 2, error: "auth: Sign in again" },
      { type: "listener.lost", at: 3, error: `${"x".repeat(200)}…` },
      { type: "permission.redirect.failed", sessionID: "ses_a", at: 4, error: "503" },
      { type: "loop.tick.skipped", at: 5, error: "server unreachable" },
      { type: "loop.tick.timeout", at: 6 },
    ]);
    assert.deepEqual(shapeStatus(input).recentErrors, events.map((event, i) => ({
      ...event, level: i === 0 ? "info" : "error",
    })));
  });

  test("includes the plugin version, mapped ledger rows, recent errors, and read failures", () => {
    const result = shapeStatus({
      pluginVersion: "radical-pipelines@1.2.3",
      ledgerEntries: [
        {
          name: "spec-lead",
          pipelineSlug: "144-opencode-support",
          sessionID: "ses_1",
          agent: "spec-lead",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          activity: 123999,
          running: true,
          pending: 0,
          permissions: [{ id: "per_1", action: "external_directory", resources: ["/repo/.agents/*"] }],
          currentTool: { callID: "call_1", tool: "read", target: "/repo/worktree/x.md", since: 5 },
          lastTurn: { endedAt: 123000, outcome: "succeeded" },
          lastSend: { at: 122000, to: "ses_orchestrator" },
          lastText: { at: 123900, excerpt: "Reading the review." },
        },
      ],
      errorLog: ["boom"],
      readFailures: [{ endpoint: "active", status: 500, count: 1 }],
    });

    assert.deepEqual(result, {
      pluginVersion: "radical-pipelines@1.2.3",
      ledger: [
        {
          name: "spec-lead",
          pipelineSlug: "144-opencode-support",
          sessionID: "ses_1",
          agent: "spec-lead",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          activity: 123999,
          running: true,
          pending: 0,
          permissions: [{ id: "per_1", action: "external_directory", resources: ["/repo/.agents/*"] }],
          currentTool: { callID: "call_1", tool: "read", target: "/repo/worktree/x.md", since: 5 },
          lastTurn: { endedAt: 123000, outcome: "succeeded" },
          lastSend: { at: 122000, to: "ses_orchestrator" },
          lastText: { at: 123900, excerpt: "Reading the review." },
        },
      ],
      recentErrors: ["boom"],
      readFailures: [{ endpoint: "active", status: 500, count: 1 }],
    });
  });

  test("a row carries lastText only when the transcript was read: absent when unread, null when it holds no text", () => {
    const entry = { name: "a", pipelineSlug: "p", sessionID: "1", agent: "agent-a", model: "m", directory: "/d", activity: 1 };
    const result = shapeStatus({
      pluginVersion: "v",
      ledgerEntries: [entry, { ...entry, sessionID: "2", lastText: null }],
      errorLog: [],
    });

    assert.equal(Object.hasOwn(result.ledger[0], "lastText"), false);
    assert.equal(result.ledger[1].lastText, null);
  });

  test("maps one ledger row per provided ledger entry, preserving order", () => {
    const result = shapeStatus({
      pluginVersion: "v",
      ledgerEntries: [
        { name: "a", sessionID: "1", agent: "agent-a", model: "m", directory: "/d", activity: 1, running: false, pending: 1 },
        { name: "b", sessionID: "2", agent: "agent-b", model: "m", directory: "/d", activity: 2, running: true, pending: 0 },
      ],
      errorLog: [],
    });

    assert.deepEqual(
      result.ledger.map((row) => row.name),
      ["a", "b"],
    );
  });

  test("an empty ledger and error log shape an empty ledger, empty recent errors, and no read failures", () => {
    const result = shapeStatus({
      pluginVersion: "v",
      ledgerEntries: [],
      errorLog: [],
    });

    assert.deepEqual(result, { pluginVersion: "v", ledger: [], recentErrors: [], readFailures: [] });
  });
});
