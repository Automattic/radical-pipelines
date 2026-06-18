import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { syncVersion } from "../sync-version.mjs";

/**
 * End-to-end flows for the version-sync feature (`## E2E test plan`).
 *
 * Each flow drives the real scripts the way the user/CI would and asserts the
 * documented Expected outcome. The two scripts are driven by different
 * mechanisms because they locate their files differently (E2E test plan intro):
 *
 *   - `sync-version.mjs` resolves `repoRoot` from `options.repoRoot`, never from
 *     `process.cwd()`; its CLI accepts no fixture argument. So Flows 1–4 drive it
 *     through the supported `syncVersion({ repoRoot: <fixture> })` override.
 *   - `check-version-sync.mjs`'s `main()` reads its files from the current
 *     working directory. So Flows 5–7 drive it as a real CLI subprocess via
 *     `spawnSync(process.execPath, [scriptPath], { cwd: <fixture> })`.
 */

/** Absolute path to the drift-guard CLI, resolved relative to this test file. */
const CHECK_PATH = fileURLToPath(
  new URL("../check-version-sync.mjs", import.meta.url),
);

/** Absolute path to the real repository root (the parent of `scripts/`). */
const REAL_REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Absolute path to the Changeset Gate workflow, resolved from this test file. */
const WORKFLOW_PATH = fileURLToPath(
  new URL("../../.github/workflows/changeset-gate.yml", import.meta.url),
);

/**
 * Build a throwaway repo-root fixture on disk with a root `package.json`, the
 * `.claude-plugin/plugin.json` target manifest, and a canonical
 * `package-lock.json` (`lockfileVersion: 3`, top-level `.version`, a
 * `.packages[""]` self-entry, and a `node_modules/...` dependency entry whose
 * version equals the lockfile version). Each file is formatted with 2-space
 * indent and a trailing newline, matching the scripts' canonical write path.
 *
 * @param {object} versions Versions to place in the fixture.
 * @param {string} versions.root Root `package.json` version (source of truth).
 * @param {string} versions.plugin `.claude-plugin/plugin.json` `.version`.
 * @param {string} versions.lock `package-lock.json` top-level `.version`.
 * @param {string} versions.lockPackage `package-lock.json`
 *   `.packages[""].version` self-entry.
 * @returns {string} Absolute path to the temp repo root.
 */
function makeFixture({ root, plugin, lock, lockPackage }) {
  const dir = mkdtempSync(join(tmpdir(), "version-sync-e2e-"));

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: "@automattic/radical-pipelines", version: root, type: "module" },
      null,
      2,
    ) + "\n",
  );

  mkdirSync(join(dir, ".claude-plugin"));
  writeFileSync(
    join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "radical-pipelines", version: plugin }, null, 2) +
      "\n",
  );

  const lockfile = {
    name: "@automattic/radical-pipelines",
    version: lock,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "@automattic/radical-pipelines",
        version: lockPackage,
        dependencies: { "some-dep": "^1.0.0" },
      },
      // A dependency pinned at the *stale package version* — it must NOT be
      // touched by the sync (the structured-patch correctness guard).
      "node_modules/some-dep": {
        version: lock,
        resolved: "https://registry.example/some-dep/-/some-dep-1.0.0.tgz",
      },
    },
  };
  writeFileSync(
    join(dir, "package-lock.json"),
    JSON.stringify(lockfile, null, 2) + "\n",
  );

  return dir;
}

/**
 * Read and parse a fixture's `package-lock.json`.
 *
 * @param {string} dir Fixture repo root.
 * @returns {object} The parsed lockfile.
 */
function readLock(dir) {
  return JSON.parse(readFileSync(join(dir, "package-lock.json"), "utf8"));
}

describe("E2E: sync-version against a fixture (Flows 1–4)", () => {
  let dir;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  test("Flow 1: release version step syncs the lockfile end to end", () => {
    // package.json at the new version N; plugin + lockfile at the older M.
    dir = makeFixture({
      root: "0.5.0",
      plugin: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    const result = syncVersion({ repoRoot: dir });

    // Both lockfile version fields now equal N.
    const lock = readLock(dir);
    assert.equal(lock.version, "0.5.0");
    assert.equal(lock.packages[""].version, "0.5.0");

    // plugin.json's version equals N.
    const plugin = JSON.parse(
      readFileSync(join(dir, ".claude-plugin", "plugin.json"), "utf8"),
    );
    assert.equal(plugin.version, "0.5.0");

    // The call succeeds and reports both the lockfile and the plugin target.
    assert.equal(result.version, "0.5.0");
    assert.ok(result.changed.includes("package-lock.json"));
    assert.ok(result.changed.includes(".claude-plugin/plugin.json"));
  });

  test("Flow 2: sync is idempotent on the lockfile", () => {
    // All three files already record the same version → a no-op run.
    dir = makeFixture({
      root: "0.4.0",
      plugin: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    const before = readFileSync(join(dir, "package-lock.json"), "utf8");

    const first = syncVersion({ repoRoot: dir });
    const afterFirst = readFileSync(join(dir, "package-lock.json"), "utf8");

    const second = syncVersion({ repoRoot: dir });
    const afterSecond = readFileSync(join(dir, "package-lock.json"), "utf8");

    // Byte-identical to the pre-run content after both runs (no change at all).
    assert.equal(afterFirst, before);
    assert.equal(afterSecond, before);

    // Neither run reports the lockfile among its changed targets.
    assert.ok(!first.changed.includes("package-lock.json"));
    assert.ok(!second.changed.includes("package-lock.json"));
  });

  test("Flow 3: sync changes only the two version fields, no other churn", () => {
    // Canonical lockfile at M, package.json at N; one dependency pinned at M.
    dir = makeFixture({
      root: "0.5.0",
      plugin: "0.5.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    const before = readFileSync(join(dir, "package-lock.json"), "utf8");

    syncVersion({ repoRoot: dir });

    const after = readFileSync(join(dir, "package-lock.json"), "utf8");

    // Formatting preserved: 2-space indent and a single trailing newline.
    assert.match(after, /\n {2}"name"/);
    assert.ok(after.endsWith("}\n"));
    assert.ok(!after.endsWith("}\n\n"));

    // Exactly two lines differ — both now N — and lockfileVersion / the
    // dependency tree / ordering are otherwise byte-identical.
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    assert.equal(beforeLines.length, afterLines.length);
    const diffs = afterLines.filter((line, i) => line !== beforeLines[i]);
    assert.equal(diffs.length, 2);
    for (const diff of diffs) {
      assert.match(diff, /"version": "0\.5\.0"/);
    }

    // lockfileVersion is unchanged; the dependency pinned at the stale package
    // version is NOT corrected.
    const lock = readLock(dir);
    assert.equal(lock.lockfileVersion, 3);
    assert.equal(lock.packages["node_modules/some-dep"].version, "0.4.0");
  });

  test("Flow 4: sync makes no registry request (offline success)", () => {
    // The sync uses only node:fs/node:path/node:url and performs no network
    // I/O, so it succeeds regardless of registry reachability. We assert it
    // both completes and updates the two version fields; the no-network
    // guarantee is structural (the source imports only Node built-ins).
    dir = makeFixture({
      root: "0.5.0",
      plugin: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    let result;
    assert.doesNotThrow(() => {
      result = syncVersion({ repoRoot: dir });
    });

    const lock = readLock(dir);
    assert.equal(lock.version, "0.5.0");
    assert.equal(lock.packages[""].version, "0.5.0");
    assert.equal(result.version, "0.5.0");

    // The script imports only Node built-ins (no network-capable dependency).
    const source = readFileSync(
      fileURLToPath(new URL("../sync-version.mjs", import.meta.url)),
      "utf8",
    );
    const imports = source.match(/^import .* from "([^"]+)";$/gm) ?? [];
    for (const line of imports) {
      assert.match(line, /from "node:/, `unexpected import: ${line}`);
    }
  });
});

describe("E2E: check-version-sync CLI against a fixture (Flows 5–7)", () => {
  let dir;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  /**
   * Run the real drift-guard CLI with the fixture as the working directory.
   *
   * @param {string} cwd Fixture repo root.
   * @returns {import("node:child_process").SpawnSyncReturns<string>} Result.
   */
  function runCheck(cwd) {
    return spawnSync(process.execPath, [CHECK_PATH], { cwd, encoding: "utf8" });
  }

  test("Flow 5: drift check passes when all three files agree", () => {
    dir = makeFixture({
      root: "0.4.0",
      plugin: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    const result = runCheck(dir);

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "");
  });

  test("Flow 6: drift check fails on a single mismatch, naming the file and field", () => {
    // Exactly one checked field differs: plugin.json's version.
    dir = makeFixture({
      root: "0.4.0",
      plugin: "0.3.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
    });

    const result = runCheck(dir);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");

    const lines = result.stderr.trim().split("\n");
    assert.equal(lines.length, 1);
    // The one line names the mismatched file, field, expected, and actual.
    assert.match(lines[0], /\.claude-plugin\/plugin\.json/);
    assert.match(lines[0], /\.version/);
    assert.match(lines[0], /0\.4\.0/);
    assert.match(lines[0], /0\.3\.0/);
  });

  test("Flow 7: drift check fails on multiple simultaneous mismatches, reporting every one", () => {
    // Reproduce the live drift: package.json at 0.4.0; BOTH lockfile fields at
    // 0.1.1 (plugin matches). Both lockfile mismatches must be reported.
    dir = makeFixture({
      root: "0.4.0",
      plugin: "0.4.0",
      lock: "0.1.1",
      lockPackage: "0.1.1",
    });

    const result = runCheck(dir);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");

    const lines = result.stderr.trim().split("\n");
    assert.equal(lines.length, 2);

    // A line for the top-level `.version` mismatch.
    const topLevel = lines.find(
      (l) => /package-lock\.json/.test(l) && !/packages\[""\]/.test(l),
    );
    assert.ok(topLevel, "expected a line for the top-level .version mismatch");
    assert.match(topLevel, /0\.4\.0/);
    assert.match(topLevel, /0\.1\.1/);

    // A line for the `.packages[""].version` self-entry mismatch.
    const selfEntry = lines.find((l) => /packages\[""\]/.test(l));
    assert.ok(selfEntry, 'expected a line for the .packages[""].version mismatch');
    assert.match(selfEntry, /0\.4\.0/);
    assert.match(selfEntry, /0\.1\.1/);
  });
});

describe("E2E: CI wiring and live correction (Flows 8–9)", () => {
  test("Flow 8: the drift check is wired into the changeset job under its trigger and bot-PR `if`", () => {
    const workflow = readFileSync(WORKFLOW_PATH, "utf8");

    // The workflow triggers on pull_request to trunk.
    assert.match(workflow, /pull_request:/);
    assert.match(workflow, /branches:\s*\[trunk\]/);

    // Scope to the single `changeset` job block so a step in another job cannot
    // satisfy the assertions.
    const lines = workflow.split("\n");
    const start = lines.findIndex((l) => l === "  changeset:");
    assert.notEqual(start, -1, "expected a `changeset` job");
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^ {2}\S/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const block = lines.slice(start, end).join("\n");

    // The job carries the bot-PR exemption and runs the drift check as a step.
    assert.match(block, /if:\s*github\.head_ref != 'changeset-release\/trunk'/);
    assert.match(block, /run:\s*node scripts\/check-version-sync\.mjs/);
  });

  test("Flow 9: the real package-lock.json is in sync and the check passes against the real root", () => {
    // The live drift has been corrected: both lockfile version fields equal the
    // root package.json version (0.4.0, matching plugin.json).
    const root = JSON.parse(
      readFileSync(join(REAL_REPO_ROOT, "package.json"), "utf8"),
    ).version;
    const lock = JSON.parse(
      readFileSync(join(REAL_REPO_ROOT, "package-lock.json"), "utf8"),
    );
    assert.equal(lock.version, root);
    assert.equal(lock.packages[""].version, root);

    // The real drift check exits 0 against the real repository root.
    const result = spawnSync(process.execPath, [CHECK_PATH], {
      cwd: REAL_REPO_ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "");
  });
});
