import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  appendToErrorLog,
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
