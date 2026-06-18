import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkVersionSync, main } from "../check-version-sync.mjs";

/** Absolute path to the drift-guard CLI, resolved relative to this test file. */
const GUARD_PATH = fileURLToPath(
  new URL("../check-version-sync.mjs", import.meta.url),
);

/**
 * Build a throwaway repo-root fixture on disk carrying all four version-bearing
 * values, each placed by structured JSON shape (never as a bare string). The
 * lockfile additionally embeds unrelated `0.4.0`/`0.1.1` strings in dependency
 * fields, and a `CHANGELOG.md` carries a version heading, so a structured-path
 * reader and a naive text scanner diverge.
 *
 * @param {object} versions The four version values to place.
 * @param {string} versions.pkg Root `package.json` `.version` (the baseline).
 * @param {string} versions.plugin `.claude-plugin/plugin.json` `.version`.
 * @param {string} versions.lockTop `package-lock.json` top-level `.version`.
 * @param {string} versions.lockRoot `package-lock.json` `.packages[""].version`.
 * @returns {string} Absolute path to the temp repo root.
 */
function makeFixture({ pkg, plugin, lockTop, lockRoot }) {
  const root = mkdtempSync(join(tmpdir(), "check-version-sync-"));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "root-pkg", version: pkg, type: "module" }, null, 2) +
      "\n",
  );

  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "plugin", version: plugin }, null, 2) + "\n",
  );

  // The lockfile deliberately scatters unrelated version-shaped strings: a
  // dependency pinned to one of the version numbers and a nested package whose
  // own `version` differs from every baseline. A correct structured read of the
  // two target paths must ignore all of these.
  const lock = {
    name: "root-pkg",
    version: lockTop,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "root-pkg",
        version: lockRoot,
        dependencies: { "some-dep": "0.4.0" },
      },
      "node_modules/some-dep": { version: "0.1.1" },
    },
  };
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify(lock, null, 2) + "\n",
  );

  writeFileSync(join(root, "CHANGELOG.md"), `# Changelog\n\n## 0.4.0\n\n- A change\n`);

  return root;
}

describe("checkVersionSync", () => {
  let root;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  test("returns [] when all four version-bearing values agree", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    assert.deepEqual(checkVersionSync({ repoRoot: root }), []);
  });

  test("flags both lockfile fields, disambiguated by path", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.1.1",
      lockRoot: "0.1.1",
    });
    const errs = checkVersionSync({ repoRoot: root });

    assert.equal(errs.length, 2);
    const lockErrs = errs.filter((e) => e.file === "package-lock.json");
    assert.equal(lockErrs.length, 2);
    const paths = lockErrs.map((e) => e.jsonPath).sort();
    assert.deepEqual(paths, ['.packages[""].version', ".version"]);
    for (const err of lockErrs) {
      assert.equal(err.value, "0.1.1");
    }
  });

  test("flags the plugin manifest with its conflicting value", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.3.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    const errs = checkVersionSync({ repoRoot: root });

    assert.equal(errs.length, 1);
    assert.equal(errs[0].file, ".claude-plugin/plugin.json");
    assert.equal(errs[0].value, "0.3.0");
  });

  test("treats package.json as the baseline: when it is the lone outlier, the other three are flagged", () => {
    root = makeFixture({
      pkg: "9.9.9",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    const errs = checkVersionSync({ repoRoot: root });

    assert.equal(errs.length, 3);
    const files = errs.map((e) => e.file).sort();
    assert.deepEqual(files, [
      ".claude-plugin/plugin.json",
      "package-lock.json",
      "package-lock.json",
    ]);
    for (const err of errs) {
      assert.equal(err.value, "0.4.0");
    }
  });

  test("reads by structured JSON path, not text: unrelated version strings never cause a false flag", () => {
    // All four targets agree at 0.4.0, yet the lockfile holds an unrelated
    // `0.1.1` dependency string and the CHANGELOG holds a `0.4.0` heading.
    // A substring scanner would trip; a structured-path reader stays silent.
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    assert.deepEqual(checkVersionSync({ repoRoot: root }), []);
  });

  test("reads by structured JSON path, not text: a lockfile dep string matching the baseline cannot mask a real drift", () => {
    // The lockfile's `.packages[""].version` drifts to 0.1.1, but a sibling
    // dependency is pinned to the 0.4.0 baseline. A text scanner that found the
    // 0.4.0 string could falsely pass; the structured read still flags drift.
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.1.1",
    });
    const errs = checkVersionSync({ repoRoot: root });

    assert.equal(errs.length, 1);
    assert.equal(errs[0].file, "package-lock.json");
    assert.equal(errs[0].jsonPath, '.packages[""].version');
    assert.equal(errs[0].value, "0.1.1");
  });
});

describe("main()", () => {
  let root;
  let cwd;
  let stdout;
  let stderr;
  let restoreOut;
  let restoreErr;

  beforeEach(() => {
    cwd = process.cwd();
    stdout = "";
    stderr = "";
    restoreOut = process.stdout.write.bind(process.stdout);
    restoreErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk) => {
      stdout += chunk;
      return true;
    };
    process.stderr.write = (chunk) => {
      stderr += chunk;
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = restoreOut;
    process.stderr.write = restoreErr;
    process.chdir(cwd);
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  test("returns 0 and writes nothing when all four agree", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    process.chdir(root);

    assert.equal(main(), 0);
    assert.equal(stdout, "");
    assert.equal(stderr, "");
  });

  test("returns 1 and names both lockfile paths on lockfile drift", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.1.1",
      lockRoot: "0.1.1",
    });
    process.chdir(root);

    assert.equal(main(), 1);
    assert.equal(stdout, "");
    assert.match(stderr, /package\.json: 0\.4\.0 \(source of truth\)/);
    assert.match(stderr, /package-lock\.json \(\.version\): 0\.1\.1/);
    assert.match(
      stderr,
      /package-lock\.json \(\.packages\[""\]\.version\): 0\.1\.1/,
    );
    assert.match(stderr, /does not match package\.json/);
  });

  test("returns 1 and names the plugin manifest on plugin drift", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.3.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    process.chdir(root);

    assert.equal(main(), 1);
    assert.match(stderr, /\.claude-plugin\/plugin\.json \(\.version\): 0\.3\.0/);
    assert.match(stderr, /does not match package\.json/);
  });

  test("returns 1 and reports the other three against the baseline when package.json is the outlier", () => {
    root = makeFixture({
      pkg: "9.9.9",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });
    process.chdir(root);

    assert.equal(main(), 1);
    assert.match(stderr, /package\.json: 9\.9\.9 \(source of truth\)/);
    assert.match(stderr, /\.claude-plugin\/plugin\.json \(\.version\): 0\.4\.0/);
    assert.match(stderr, /package-lock\.json \(\.version\): 0\.4\.0/);
    assert.match(
      stderr,
      /package-lock\.json \(\.packages\[""\]\.version\): 0\.4\.0/,
    );
  });
});

describe("check-version-sync CLI", () => {
  let root;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  test("running directly with all in sync → exit 0, empty stderr and stdout", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });

    const result = spawnSync(process.execPath, [GUARD_PATH], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "");
  });

  test("running directly with drift → exit 1, drift reported on stderr", () => {
    root = makeFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.1.1",
      lockRoot: "0.1.1",
    });

    const result = spawnSync(process.execPath, [GUARD_PATH], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /package-lock\.json \(\.version\): 0\.1\.1/);
    assert.match(
      result.stderr,
      /package-lock\.json \(\.packages\[""\]\.version\): 0\.1\.1/,
    );
  });
});
