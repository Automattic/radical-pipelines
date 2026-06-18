import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkVersionSync } from "../check-version-sync.mjs";

/** Absolute path to the drift-guard CLI, resolved relative to this test file. */
const CHECK_PATH = fileURLToPath(
  new URL("../check-version-sync.mjs", import.meta.url),
);

/**
 * Build a `checkVersionSync` input where every checked field defaults to the
 * root version, with selective overrides for the fields under test.
 *
 * @param {object} [overrides] Per-field overrides.
 * @param {string} [overrides.rootVersion] Root `package.json` version.
 * @param {string} [overrides.lockVersion] `package-lock.json` `.version`.
 * @param {string} [overrides.lockPackageVersion] `package-lock.json`
 *   `.packages[""].version`.
 * @param {string} [overrides.pluginVersion] `.claude-plugin/plugin.json`
 *   `.version`.
 * @returns {object} A complete `checkVersionSync` input object.
 */
function inputs(overrides = {}) {
  const root = overrides.rootVersion ?? "0.4.0";
  return {
    rootVersion: root,
    lockVersion: overrides.lockVersion ?? root,
    lockPackageVersion: overrides.lockPackageVersion ?? root,
    pluginVersion: overrides.pluginVersion ?? root,
  };
}

describe("checkVersionSync", () => {
  test("all three fields match → []", () => {
    assert.deepEqual(checkVersionSync(inputs()), []);
  });

  test("one field differs → exactly one mismatch with correct fields", () => {
    const mismatches = checkVersionSync(inputs({ pluginVersion: "0.3.0" }));
    assert.equal(mismatches.length, 1);
    assert.deepEqual(mismatches[0], {
      file: ".claude-plugin/plugin.json",
      field: ".version",
      expected: "0.4.0",
      actual: "0.3.0",
    });
  });

  test("both lockfile fields differ → a mismatch for each (collect-all)", () => {
    const mismatches = checkVersionSync(
      inputs({ lockVersion: "0.1.1", lockPackageVersion: "0.2.0" }),
    );
    assert.equal(mismatches.length, 2);
    assert.deepEqual(mismatches, [
      {
        file: "package-lock.json",
        field: ".version",
        expected: "0.4.0",
        actual: "0.1.1",
      },
      {
        file: "package-lock.json",
        field: '.packages[""].version',
        expected: "0.4.0",
        actual: "0.2.0",
      },
    ]);
  });

  test("all three fields differ → three mismatches (never short-circuits)", () => {
    const mismatches = checkVersionSync(
      inputs({
        lockVersion: "0.1.1",
        lockPackageVersion: "0.1.1",
        pluginVersion: "0.1.1",
      }),
    );
    assert.equal(mismatches.length, 3);
    for (const m of mismatches) {
      assert.equal(m.expected, "0.4.0");
      assert.equal(m.actual, "0.1.1");
    }
  });
});

describe("check-version-sync CLI", () => {
  let dir;

  /**
   * Write the three manifests into the temp dir with the given versions.
   *
   * @param {object} versions Versions per file.
   * @param {string} versions.root Root `package.json` version.
   * @param {string} versions.lock `package-lock.json` `.version`.
   * @param {string} versions.lockPackage `package-lock.json`
   *   `.packages[""].version`.
   * @param {string} versions.plugin `.claude-plugin/plugin.json` `.version`.
   */
  function writeManifests({ root, lock, lockPackage, plugin }) {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "@automattic/radical-pipelines", version: root }, null, 2) +
        "\n",
    );
    writeFileSync(
      join(dir, "package-lock.json"),
      JSON.stringify(
        {
          name: "@automattic/radical-pipelines",
          version: lock,
          lockfileVersion: 3,
          packages: { "": { name: "@automattic/radical-pipelines", version: lockPackage } },
        },
        null,
        2,
      ) + "\n",
    );
    mkdirSync(join(dir, ".claude-plugin"));
    writeFileSync(
      join(dir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "radical-pipelines", version: plugin }, null, 2) + "\n",
    );
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "check-version-sync-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("all fields in sync → exit 0, empty stderr, empty stdout", () => {
    writeManifests({
      root: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
      plugin: "0.4.0",
    });

    const result = spawnSync(process.execPath, [CHECK_PATH], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "");
  });

  test("one field drifts → exit 1, one stderr line naming all parts, empty stdout", () => {
    writeManifests({
      root: "0.4.0",
      lock: "0.4.0",
      lockPackage: "0.4.0",
      plugin: "0.3.0",
    });

    const result = spawnSync(process.execPath, [CHECK_PATH], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const lines = result.stderr.trim().split("\n");
    assert.equal(lines.length, 1);
    assert.match(lines[0], /\.claude-plugin\/plugin\.json/);
    assert.match(lines[0], /\.version/);
    assert.match(lines[0], /0\.4\.0/);
    assert.match(lines[0], /0\.3\.0/);
  });

  test("multiple fields drift → exit 1, one stderr line per mismatch, empty stdout", () => {
    writeManifests({
      root: "0.4.0",
      lock: "0.1.1",
      lockPackage: "0.1.1",
      plugin: "0.1.1",
    });

    const result = spawnSync(process.execPath, [CHECK_PATH], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const lines = result.stderr.trim().split("\n");
    assert.equal(lines.length, 3);
  });
});
