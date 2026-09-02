import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  appendToErrorLog,
  comparePinnedBuild,
  readPinManifest,
  shapeStatus,
} from "../../../opencode/plugin.mjs";

describe("comparePinnedBuild", () => {
  test("a running build equal to the pinned cli reports a match", () => {
    assert.equal(
      comparePinnedBuild("0.0.0-next-15772", "0.0.0-next-15772"),
      "match",
    );
  });

  test("any other running build reports a mismatch flagged as outside the verified surface", () => {
    assert.equal(
      comparePinnedBuild("0.0.0-next-99999", "0.0.0-next-15772"),
      "outside the verified surface",
    );
  });

  test("a null running build reports not determinable rather than throwing", () => {
    assert.doesNotThrow(() => comparePinnedBuild(null, "0.0.0-next-15772"));
    assert.equal(
      comparePinnedBuild(null, "0.0.0-next-15772"),
      "not determinable",
    );
  });

  test("an undefined running build reports not determinable rather than throwing", () => {
    assert.doesNotThrow(() =>
      comparePinnedBuild(undefined, "0.0.0-next-15772"),
    );
    assert.equal(
      comparePinnedBuild(undefined, "0.0.0-next-15772"),
      "not determinable",
    );
  });

  test("an unknown running build reports not determinable", () => {
    assert.equal(
      comparePinnedBuild("unknown", "0.0.0-next-15772"),
      "not determinable",
    );
  });
});

describe("readPinManifest", () => {
  let root;
  let manifestPath;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pin-manifest-"));
    manifestPath = join(root, "pin.json");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("reads and parses the manifest at a given path", () => {
    writeFileSync(
      manifestPath,
      JSON.stringify({ cli: "0.0.0-next-1", plugin: "0.0.0-next-1" }),
    );

    assert.deepEqual(readPinManifest(manifestPath), {
      cli: "0.0.0-next-1",
      plugin: "0.0.0-next-1",
    });
  });

  test("defaults to this repository's opencode/pin.json", () => {
    const pin = readPinManifest();
    assert.equal(typeof pin.cli, "string");
    assert.equal(typeof pin.plugin, "string");
  });
});

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
  test("includes the plugin version, pin comparison, mapped ledger rows, recent errors, and loop ticks", () => {
    const result = shapeStatus({
      pluginVersion: "radical-pipelines@1.2.3",
      pinComparison: "match",
      ledgerEntries: [
        {
          name: "spec-lead",
          sessionID: "ses_1",
          agent: "spec-lead",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          updated: 123456,
          activity: 123999,
          running: true,
          pending: 0,
          permissions: [{ id: "per_1", action: "external_directory", resources: ["/repo/.agents/*"] }],
          currentTool: { callID: "call_1", tool: "read", target: "/repo/worktree/x.md", since: 5 },
          lastTurn: { endedAt: 123000, outcome: "succeeded" },
          turns: 2,
          lastSend: { at: 122000, to: "ses_orchestrator" },
          lastText: { at: 123900, excerpt: "Reading the review." },
        },
      ],
      errorLog: ["boom"],
      loopTickLog: [{ loopID: "loop_1", outcome: "busy", at: 123 }],
    });

    assert.deepEqual(result, {
      pluginVersion: "radical-pipelines@1.2.3",
      pin: "match",
      ledger: [
        {
          name: "spec-lead",
          sessionID: "ses_1",
          agent: "spec-lead",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          updated: 123456,
          activity: 123999,
          running: true,
          pending: 0,
          permissions: [{ id: "per_1", action: "external_directory", resources: ["/repo/.agents/*"] }],
          currentTool: { callID: "call_1", tool: "read", target: "/repo/worktree/x.md", since: 5 },
          lastTurn: { endedAt: 123000, outcome: "succeeded" },
          turns: 2,
          lastSend: { at: 122000, to: "ses_orchestrator" },
          lastText: { at: 123900, excerpt: "Reading the review." },
        },
      ],
      recentErrors: ["boom"],
      recentLoopTicks: [{ loopID: "loop_1", outcome: "busy", at: 123 }],
      readFailures: [],
    });
  });

  test("carries provided read failures through to the shaped result", () => {
    const result = shapeStatus({
      pluginVersion: "v",
      pinComparison: "match",
      ledgerEntries: [],
      errorLog: [],
      readFailures: [{ endpoint: "active", status: 500, count: 1 }],
    });

    assert.deepEqual(result.readFailures, [{ endpoint: "active", status: 500, count: 1 }]);
  });

  test("maps one ledger row per provided ledger entry, preserving order", () => {
    const result = shapeStatus({
      pluginVersion: "v",
      pinComparison: "not determinable",
      ledgerEntries: [
        {
          name: "a",
          sessionID: "1",
          agent: "agent-a",
          model: "m",
          directory: "/d",
          updated: 1,
          running: false,
          pending: 1,
        },
        {
          name: "b",
          sessionID: "2",
          agent: "agent-b",
          model: "m",
          directory: "/d",
          updated: 2,
          running: true,
          pending: 0,
        },
      ],
      errorLog: [],
    });

    assert.equal(result.ledger.length, 2);
    assert.deepEqual(
      result.ledger.map((row) => row.name),
      ["a", "b"],
    );
  });

  test("an empty ledger and error log shape an empty ledger and empty recent-errors log", () => {
    const result = shapeStatus({
      pluginVersion: "v",
      pinComparison: "match",
      ledgerEntries: [],
      errorLog: [],
    });

    assert.deepEqual(result.ledger, []);
    assert.deepEqual(result.recentErrors, []);
    assert.deepEqual(result.recentLoopTicks, []);
  });
});
