import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  addLoopEntry,
  deleteLoopEntry,
  listLoopEntries,
  resolveLoopRegistryPath,
} from "../../../opencode/plugin.mjs";

describe("resolveLoopRegistryPath", () => {
  test("honors XDG_DATA_HOME when set", () => {
    const path = resolveLoopRegistryPath({ XDG_DATA_HOME: "/custom/data-home" });
    assert.equal(
      path,
      join("/custom/data-home", "radical-pipelines", "loops.json"),
    );
  });

  test("falls back to ~/.local/share/radical-pipelines/ when XDG_DATA_HOME is unset", () => {
    const path = resolveLoopRegistryPath({});
    assert.equal(
      path,
      join(homedir(), ".local", "share", "radical-pipelines", "loops.json"),
    );
  });

  test("defaults to the real process environment when none is given", () => {
    const path = resolveLoopRegistryPath();
    assert.ok(path.endsWith(join("radical-pipelines", "loops.json")));
  });
});

describe("loop registry (file-backed CRUD)", () => {
  let dir;
  let registryPath;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "loop-registry-"));
    registryPath = join(dir, "loops.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("reading a missing registry file yields an empty list rather than an error", () => {
    assert.deepEqual(listLoopEntries(registryPath), []);
  });

  test("adding an entry then reading from a newly constructed registry over the same file returns the entry", () => {
    const entry = {
      id: "loop_1",
      interval: 300000,
      prompt: "check status",
      targetSession: "ses_target",
    };
    addLoopEntry(registryPath, entry);

    // "a newly constructed registry" is exercised here by calling
    // listLoopEntries as an independent read of the same path: it holds no
    // in-memory state carried over from the add call, only the file on disk.
    assert.deepEqual(listLoopEntries(registryPath), [entry]);
  });

  test("listing returns all current entries", () => {
    const first = {
      id: "loop_1",
      interval: 60000,
      prompt: "first",
      targetSession: "ses_a",
    };
    const second = {
      id: "loop_2",
      interval: 120000,
      prompt: "second",
      targetSession: "ses_b",
    };
    addLoopEntry(registryPath, first);
    addLoopEntry(registryPath, second);

    assert.deepEqual(listLoopEntries(registryPath), [first, second]);
  });

  test("deleting by loop id removes exactly that entry and leaves the others", () => {
    const first = {
      id: "loop_1",
      interval: 60000,
      prompt: "first",
      targetSession: "ses_a",
    };
    const second = {
      id: "loop_2",
      interval: 120000,
      prompt: "second",
      targetSession: "ses_b",
    };
    const third = {
      id: "loop_3",
      interval: 180000,
      prompt: "third",
      targetSession: "ses_c",
    };
    addLoopEntry(registryPath, first);
    addLoopEntry(registryPath, second);
    addLoopEntry(registryPath, third);

    deleteLoopEntry(registryPath, "loop_2");

    assert.deepEqual(listLoopEntries(registryPath), [first, third]);
  });

  test("deleting a loop id that isn't present leaves the registry unchanged", () => {
    const entry = {
      id: "loop_1",
      interval: 60000,
      prompt: "solo",
      targetSession: "ses_a",
    };
    addLoopEntry(registryPath, entry);

    deleteLoopEntry(registryPath, "loop_never_added");

    assert.deepEqual(listLoopEntries(registryPath), [entry]);
  });

  test("the registry directory is created if it does not already exist", () => {
    const nestedPath = join(dir, "nested", "loops.json");
    const entry = {
      id: "loop_nested",
      interval: 30000,
      prompt: "nested dir",
      targetSession: "ses_nested",
    };

    assert.doesNotThrow(() => addLoopEntry(nestedPath, entry));
    assert.deepEqual(listLoopEntries(nestedPath), [entry]);
  });
});
