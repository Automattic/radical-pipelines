#!/usr/bin/env node
/**
 * Version-sync drift guard.
 *
 * Compares the `version` field of the root `package.json` (the single source of
 * truth) against the three secondary version fields that `scripts/sync-version.mjs`
 * keeps in step with it:
 *   1. `package-lock.json` `.version`,
 *   2. `package-lock.json` `.packages[""].version`,
 *   3. `.claude-plugin/plugin.json` `.version`.
 *
 * This is the read-only counterpart to `scripts/sync-version.mjs`: it never
 * writes any file. It reports every drifted field (it does not stop at the
 * first) and exits `1` when any field disagrees with the root, so CI can fail a
 * pull request whose secondary versions were not re-synced.
 *
 * Uses only built-in Node modules; no external dependencies and no network.
 *
 * Mirrors the export + `isMainModule()` shape of `scripts/validate-changesets.mjs`.
 *
 * Usage:
 *   node scripts/check-version-sync.mjs
 */

import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Mismatch
 * @property {string} file The manifest the drifted field lives in.
 * @property {string} field A path identifying the field within that manifest.
 * @property {string} expected The root version the field should equal.
 * @property {string} actual The field's current, drifted value.
 */

/**
 * @typedef {object} VersionSyncInputs
 * @property {string} rootVersion The root `package.json` version (source of truth).
 * @property {string} lockVersion The `package-lock.json` top-level `.version`.
 * @property {string} lockPackageVersion The `package-lock.json`
 *   `.packages[""].version` self-entry.
 * @property {string} pluginVersion The `.claude-plugin/plugin.json` `.version`.
 */

/**
 * Compare each checked version field against the root version, collecting a
 * mismatch for every field that differs.
 *
 * Pure: it derives its result solely from `inputs` and never touches the file
 * system. It evaluates all three fields unconditionally, so callers always
 * receive the complete set of drifts rather than just the first.
 *
 * @param {VersionSyncInputs} inputs The root version and the three checked fields.
 * @returns {Mismatch[]} One entry per field that differs from `rootVersion`;
 *   empty when all three match.
 *
 * @example
 * checkVersionSync({
 *   rootVersion: "0.4.0",
 *   lockVersion: "0.4.0",
 *   lockPackageVersion: "0.1.1",
 *   pluginVersion: "0.4.0",
 * });
 * // → [{ file: "package-lock.json", field: '.packages[""].version',
 * //      expected: "0.4.0", actual: "0.1.1" }]
 */
function checkVersionSync(inputs) {
  const { rootVersion, lockVersion, lockPackageVersion, pluginVersion } = inputs;

  const checks = [
    { file: "package-lock.json", field: ".version", actual: lockVersion },
    {
      file: "package-lock.json",
      field: '.packages[""].version',
      actual: lockPackageVersion,
    },
    {
      file: ".claude-plugin/plugin.json",
      field: ".version",
      actual: pluginVersion,
    },
  ];

  const mismatches = [];
  for (const { file, field, actual } of checks) {
    if (actual !== rootVersion) {
      mismatches.push({ file, field, expected: rootVersion, actual });
    }
  }
  return mismatches;
}

/**
 * Read the three manifests from the current working directory, check each
 * checked version field against the root version, and report any drift.
 *
 * Reads `package.json`, `package-lock.json`, and `.claude-plugin/plugin.json`
 * via `node:fs` only. Prints one line per mismatch to stderr — naming the file,
 * field, expected (root) value, and actual value — and writes nothing to stdout.
 *
 * @returns {0 | 1} `1` if any checked field differs from the root, else `0`.
 */
function main() {
  const rootVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const plugin = JSON.parse(
    readFileSync(join(".claude-plugin", "plugin.json"), "utf8"),
  );

  const mismatches = checkVersionSync({
    rootVersion,
    lockVersion: lock.version,
    lockPackageVersion: lock.packages[""].version,
    pluginVersion: plugin.version,
  });

  for (const { file, field, expected, actual } of mismatches) {
    console.error(
      `${file} ${field}: expected ${expected} (root package.json) but found ${actual}`,
    );
  }

  return mismatches.length > 0 ? 1 : 0;
}

export { checkVersionSync, main };

/**
 * Whether this module was executed directly as a CLI (rather than imported,
 * e.g. by tests). Compares the resolved real paths of this module and the
 * entry script so symlinked invocations (such as macOS temp dirs) still match.
 *
 * @returns {boolean} `true` when run as `node scripts/check-version-sync.mjs`.
 */
function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
}

// Run as a CLI when invoked directly (not when imported by tests).
if (isMainModule()) {
  process.exit(main());
}
