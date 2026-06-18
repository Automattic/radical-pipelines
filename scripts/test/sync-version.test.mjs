import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  readRootVersion,
  syncLockfileVersion,
  syncManifestVersion,
  syncVersion,
  TARGET_MANIFESTS,
} from "../sync-version.mjs";

/**
 * Build a throwaway repo-root fixture on disk with a root `package.json`, the
 * target manifests, and a canonical `package-lock.json`, each formatted with
 * 2-space indent and a trailing newline. Returns the temp root directory.
 *
 * @param {string} rootVersion Version to place in the root `package.json`.
 * @param {string} targetVersion Version to place in both target manifests and
 *   in the lockfile's version fields and dependency entry.
 * @returns {string} Absolute path to the temp repo root.
 */
function makeFixture(rootVersion, targetVersion) {
  const root = mkdtempSync(join(tmpdir(), "sync-version-"));

  const rootManifest = { name: "root-pkg", version: rootVersion, type: "module" };
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(rootManifest, null, 2) + "\n",
  );

  for (const target of TARGET_MANIFESTS) {
    const targetPath = join(root, target);
    mkdirSync(join(targetPath, ".."), { recursive: true });
    const manifest = {
      name: `target-${target}`,
      version: targetVersion,
      nested: { keep: ["these", "values"] },
    };
    writeFileSync(targetPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  const lock = {
    name: "root-pkg",
    version: targetVersion,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "root-pkg",
        version: targetVersion,
      },
      "node_modules/some-dep": {
        version: targetVersion,
        resolved: "https://registry.example/some-dep/-/some-dep.tgz",
      },
    },
  };
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify(lock, null, 2) + "\n",
  );

  return root;
}

describe("sync-version", () => {
  let root;

  beforeEach(() => {
    root = makeFixture("0.1.1", "0.1.0");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("copies the root version into every target manifest", () => {
    const result = syncVersion({ repoRoot: root });

    assert.equal(result.version, "0.1.1");
    for (const target of TARGET_MANIFESTS) {
      const manifest = JSON.parse(readFileSync(join(root, target), "utf8"));
      assert.equal(manifest.version, "0.1.1");
    }
  });

  test("reports which targets changed", () => {
    const result = syncVersion({ repoRoot: root });
    for (const target of TARGET_MANIFESTS) {
      assert.ok(result.changed.includes(target));
    }
  });

  test("preserves 2-space indent and trailing newline (only version line differs)", () => {
    const before = TARGET_MANIFESTS.map((target) =>
      readFileSync(join(root, target), "utf8"),
    );

    syncVersion({ repoRoot: root });

    TARGET_MANIFESTS.forEach((target, i) => {
      const after = readFileSync(join(root, target), "utf8");

      // 2-space indent retained.
      assert.match(after, /\n {2}"name"/);
      // Trailing newline retained, with no extra blank line.
      assert.ok(after.endsWith("}\n"));
      assert.ok(!after.endsWith("}\n\n"));

      // Every line is byte-identical except the single version line.
      const beforeLines = before[i].split("\n");
      const afterLines = after.split("\n");
      assert.equal(beforeLines.length, afterLines.length);
      const diffs = afterLines.filter((line, j) => line !== beforeLines[j]);
      assert.equal(diffs.length, 1);
      assert.match(diffs[0], /"version": "0\.1\.1"/);
    });
  });

  test("is idempotent: a second run produces no further diff", () => {
    syncVersion({ repoRoot: root });
    const afterFirst = TARGET_MANIFESTS.map((target) =>
      readFileSync(join(root, target), "utf8"),
    );

    const secondResult = syncVersion({ repoRoot: root });

    assert.deepEqual(secondResult.changed, []);
    TARGET_MANIFESTS.forEach((target, i) => {
      assert.equal(readFileSync(join(root, target), "utf8"), afterFirst[i]);
    });
  });

  test("readRootVersion returns the root version and never reads targets", () => {
    const version = readRootVersion(join(root, "package.json"));
    assert.equal(version, "0.1.1");
  });

  test("syncManifestVersion returns false when the version already matches", () => {
    const target = join(root, TARGET_MANIFESTS[0]);
    assert.equal(syncManifestVersion(target, "9.9.9"), true);
    assert.equal(syncManifestVersion(target, "9.9.9"), false);
  });

  test("sets both lockfile version fields to the root version", () => {
    syncVersion({ repoRoot: root });

    const lock = JSON.parse(
      readFileSync(join(root, "package-lock.json"), "utf8"),
    );
    assert.equal(lock.version, "0.1.1");
    assert.equal(lock.packages[""].version, "0.1.1");
  });

  test("reports package-lock.json among the changed targets", () => {
    const result = syncVersion({ repoRoot: root });
    assert.ok(result.changed.includes("package-lock.json"));
  });

  test("leaves the node_modules dependency entry at its stale version", () => {
    syncVersion({ repoRoot: root });

    const lock = JSON.parse(
      readFileSync(join(root, "package-lock.json"), "utf8"),
    );
    assert.equal(lock.packages["node_modules/some-dep"].version, "0.1.0");
  });

  test("changes only the two version lines of package-lock.json", () => {
    const before = readFileSync(join(root, "package-lock.json"), "utf8");

    syncVersion({ repoRoot: root });

    const after = readFileSync(join(root, "package-lock.json"), "utf8");

    // 2-space indent and trailing newline preserved.
    assert.match(after, /\n {2}"name"/);
    assert.ok(after.endsWith("}\n"));
    assert.ok(!after.endsWith("}\n\n"));

    // Exactly two lines differ: the top-level and self-entry version lines.
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    assert.equal(beforeLines.length, afterLines.length);
    const diffs = afterLines.filter((line, j) => line !== beforeLines[j]);
    assert.equal(diffs.length, 2);
    for (const diff of diffs) {
      assert.match(diff, /"version": "0\.1\.1"/);
    }
  });

  test("is idempotent for the lockfile: a second run reports no change", () => {
    syncVersion({ repoRoot: root });
    const afterFirst = readFileSync(join(root, "package-lock.json"), "utf8");

    const secondResult = syncVersion({ repoRoot: root });

    assert.ok(!secondResult.changed.includes("package-lock.json"));
    assert.equal(
      readFileSync(join(root, "package-lock.json"), "utf8"),
      afterFirst,
    );
  });

  test("syncLockfileVersion returns false when versions already match", () => {
    const lockfilePath = join(root, "package-lock.json");
    assert.equal(syncLockfileVersion(lockfilePath, "9.9.9"), true);
    assert.equal(syncLockfileVersion(lockfilePath, "9.9.9"), false);
  });

  test("syncLockfileVersion throws ENOENT when the lockfile is absent", () => {
    const missing = join(root, "no-such-lock.json");
    assert.throws(
      () => syncLockfileVersion(missing, "1.0.0"),
      (err) => err.code === "ENOENT",
    );
  });
});
