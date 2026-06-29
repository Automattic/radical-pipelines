/**
 * End-to-end tests for the package-lock version-sync feature.
 *
 * These exercise the real mechanisms the feature relies on, not stand-ins:
 *
 * - The drift guard runs as a real `node scripts/check-version-sync.mjs`
 *   subprocess via `spawnSync` against throwaway temp-dir fixtures (Flows 1–4).
 * - The lockfile reconciliation runs the real
 *   `npm install --package-lock-only --no-audit --no-fund` subprocess against a
 *   dependency-consistent temp-dir fixture (Flows 5–6) — no function override.
 * - The release-script composition (Flow 7) and the committed lockfile/
 *   package.json version consistency (Flow 8) are asserted against the
 *   committed repository files, read-only.
 *
 * Built-in Node modules only; every temp fixture is created with `mkdtempSync`
 * and removed in `afterEach`; the real repository working tree is never mutated.
 */

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
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the committed drift-guard CLI under test. */
const GUARD_PATH = fileURLToPath(
  new URL("../check-version-sync.mjs", import.meta.url),
);

/** Absolute path to the committed repository root. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Build a throwaway repo-root fixture for the drift guard carrying all four
 * version-bearing values, each placed by structured JSON shape. The lockfile
 * additionally scatters unrelated version-shaped strings in dependency fields so
 * a structured-path reader (correct) and a naive text scanner (wrong) diverge.
 *
 * @param {object} versions The four version values to place.
 * @param {string} versions.pkg Root `package.json` `.version` (the baseline).
 * @param {string} versions.plugin `.claude-plugin/plugin.json` `.version`.
 * @param {string} versions.lockTop `package-lock.json` top-level `.version`.
 * @param {string} versions.lockRoot `package-lock.json` `.packages[""].version`.
 * @returns {string} Absolute path to the temp repo root.
 */
function makeGuardFixture({ pkg, plugin, lockTop, lockRoot }) {
  const root = mkdtempSync(join(tmpdir(), "version-sync-guard-"));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      { name: "@automattic/radical-pipelines", version: pkg, type: "module" },
      null,
      2,
    ) + "\n",
  );

  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "plugin", version: plugin }, null, 2) + "\n",
  );

  const lock = {
    name: "@automattic/radical-pipelines",
    version: lockTop,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "@automattic/radical-pipelines",
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

  return root;
}

/**
 * Run the committed drift-guard CLI as a real subprocess against a fixture.
 *
 * @param {string} cwd Fixture repo root to run the guard against.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} The result.
 */
function runGuard(cwd) {
  return spawnSync(process.execPath, [GUARD_PATH], { cwd, encoding: "utf8" });
}

/**
 * Build a minimal, dependency-consistent npm project whose lockfile can be
 * reconciled with no registry or `node_modules` access: no dependencies, so the
 * only thing `npm install --package-lock-only` has to update is the two version
 * fields. The seeded lockfile starts drifted at `0.1.1`.
 *
 * @param {string} version The `package.json` version (the reconciliation target).
 * @returns {string} Absolute path to the temp project root.
 */
function makeLockfileFixture(version) {
  const root = mkdtempSync(join(tmpdir(), "version-sync-lock-"));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      { name: "@automattic/radical-pipelines", version, private: true },
      null,
      2,
    ) + "\n",
  );

  const lock = {
    name: "@automattic/radical-pipelines",
    version: "0.1.1",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "@automattic/radical-pipelines",
        version: "0.1.1",
      },
    },
  };
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify(lock, null, 2) + "\n",
  );

  return root;
}

/**
 * Run the real lockfile-reconciliation command as a subprocess against a fixture.
 *
 * @param {string} cwd Project root to reconcile.
 * @returns {import("node:child_process").SpawnSyncReturns<string>} The result.
 */
function runLockfileSync(cwd) {
  return spawnSync(
    "npm",
    ["install", "--package-lock-only", "--no-audit", "--no-fund"],
    { cwd, encoding: "utf8" },
  );
}

describe("E2E Flows 1–4: drift guard CLI via the real subprocess", () => {
  let root;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  test("Flow 1: passes (exit 0, empty stdout/stderr) when all four agree", () => {
    root = makeGuardFixture({
      pkg: "1.2.3",
      plugin: "1.2.3",
      lockTop: "1.2.3",
      lockRoot: "1.2.3",
    });

    const result = runGuard(root);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  });

  test("Flow 2: fails naming both lockfile fields when they disagree", () => {
    root = makeGuardFixture({
      pkg: "0.4.0",
      plugin: "0.4.0",
      lockTop: "0.1.1",
      lockRoot: "0.1.1",
    });

    const result = runGuard(root);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    // Baseline reported, then both lockfile paths disambiguated, with the
    // conflicting 0.1.1 value against the 0.4.0 package.json baseline.
    assert.match(result.stderr, /package\.json: 0\.4\.0 \(source of truth\)/);
    assert.match(result.stderr, /package-lock\.json \(\.version\): 0\.1\.1/);
    assert.match(
      result.stderr,
      /package-lock\.json \(\.packages\[""\]\.version\): 0\.1\.1/,
    );
    assert.match(result.stderr, /does not match package\.json/);
  });

  test("Flow 3: fails naming .claude-plugin/plugin.json when it disagrees", () => {
    root = makeGuardFixture({
      pkg: "0.4.0",
      plugin: "0.3.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });

    const result = runGuard(root);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /package\.json: 0\.4\.0 \(source of truth\)/);
    assert.match(
      result.stderr,
      /\.claude-plugin\/plugin\.json \(\.version\): 0\.3\.0/,
    );
    assert.match(result.stderr, /does not match package\.json/);
    // The lockfile fields agree, so they must NOT be reported.
    assert.doesNotMatch(result.stderr, /package-lock\.json/);
  });

  test("Flow 4: fails when package.json is hand-edited away from the other three", () => {
    root = makeGuardFixture({
      pkg: "9.9.9",
      plugin: "0.4.0",
      lockTop: "0.4.0",
      lockRoot: "0.4.0",
    });

    const result = runGuard(root);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    // package.json is the baseline at 9.9.9; the other three are reported as
    // not matching it, all carrying the conflicting 0.4.0 value.
    assert.match(result.stderr, /package\.json: 9\.9\.9 \(source of truth\)/);
    assert.match(
      result.stderr,
      /\.claude-plugin\/plugin\.json \(\.version\): 0\.4\.0/,
    );
    assert.match(result.stderr, /package-lock\.json \(\.version\): 0\.4\.0/);
    assert.match(
      result.stderr,
      /package-lock\.json \(\.packages\[""\]\.version\): 0\.4\.0/,
    );
  });
});

describe("E2E Flows 5–6: real `npm install --package-lock-only` reconciliation", () => {
  let root;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  test("Flow 5: brings both lockfile version fields to package.json's version", () => {
    root = makeLockfileFixture("0.4.0");
    const before = readFileSync(join(root, "package-lock.json"), "utf8");

    const result = runLockfileSync(root);
    assert.equal(result.status, 0, `npm failed: ${result.stderr}`);

    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const after = JSON.parse(
      readFileSync(join(root, "package-lock.json"), "utf8"),
    );

    // The guaranteed invariant: both lockfile version fields equal the
    // package.json version after the real command completes.
    assert.equal(after.version, pkg.version);
    assert.equal(after.packages[""].version, pkg.version);
    assert.equal(after.version, "0.4.0");
    assert.equal(after.packages[""].version, "0.4.0");

    // Two-field-only diff: asserted ONLY because this fixture's dependency tree
    // is constructed consistent (no dependencies). Re-parse `before`, overwrite
    // just the two version fields, and require structural equality with `after`.
    const beforeParsed = JSON.parse(before);
    beforeParsed.version = pkg.version;
    beforeParsed.packages[""].version = pkg.version;
    assert.deepEqual(after, beforeParsed);
  });

  test("Flow 6: re-running on the in-sync lockfile is byte-identical (empty diff)", () => {
    root = makeLockfileFixture("0.4.0");

    // First run reconciles to the in-sync state (the end of Flow 5).
    const first = runLockfileSync(root);
    assert.equal(first.status, 0, `first npm run failed: ${first.stderr}`);

    const snapshot = readFileSync(join(root, "package-lock.json"), "utf8");

    // Second run with no version change must leave the bytes untouched.
    const second = runLockfileSync(root);
    assert.equal(second.status, 0, `second npm run failed: ${second.stderr}`);

    const after = readFileSync(join(root, "package-lock.json"), "utf8");
    assert.equal(after, snapshot);
  });
});

describe("E2E Flow 7: the committed release:version chain reaches the lockfile sync", () => {
  test("release:version ends with the appended lockfile-sync command in order", () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
    );
    const releaseVersion = pkg.scripts["release:version"];

    // The single composition point both the CI path and the manual escape hatch
    // funnel through: bump → propagate to manifests → reconcile the lockfile.
    assert.equal(
      releaseVersion,
      "changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund",
    );
    assert.match(
      releaseVersion,
      /&& npm install --package-lock-only --no-audit --no-fund$/,
    );
    assert.match(
      releaseVersion,
      /changeset version && node scripts\/sync-version\.mjs && /,
    );
  });
});

describe("E2E Flow 8: the committed lockfile stays in sync with package.json", () => {
  test("both committed lockfile version fields equal the committed package.json version", () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
    );
    const lock = JSON.parse(
      readFileSync(join(REPO_ROOT, "package-lock.json"), "utf8"),
    );

    // Read by structured JSON path, never by text search.
    // Tie the assertion to the source of truth, not a hardcoded literal, so it
    // survives every version bump.
    assert.equal(lock.version, pkg.version);
    assert.equal(lock.packages[""].version, pkg.version);
  });
});
