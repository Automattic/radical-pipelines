#!/usr/bin/env node
/**
 * Version-sync script.
 *
 * Copies the `version` field from the root `package.json` (the single source of
 * truth) into every secondary manifest in the repository, keeping each target
 * file's formatting (2-space indent + trailing newline) intact apart from the
 * version line.
 *
 * Data flows strictly outward from the root: the script never computes its own
 * version bump and never reads a target version back into the root. Running it
 * is idempotent — a second run with an unchanged root produces no further diff,
 * which lets the same script serve both normal propagation and one-time drift
 * correction.
 *
 * Uses only built-in Node modules; no external dependencies and no network.
 *
 * Usage:
 *   node scripts/sync-version.mjs
 */

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the repository root (the parent of this `scripts/` dir). */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Path to the root `package.json`, the single source of truth for the version. */
const SOURCE_MANIFEST = join(REPO_ROOT, "package.json");

/**
 * Secondary manifests that receive the root version, relative to the repo root.
 *
 * @type {string[]}
 */
const TARGET_MANIFESTS = [
  ".claude-plugin/plugin.json",
  "packages/opencode/package.json",
];

/**
 * Read the `version` field from the root `package.json`.
 *
 * @param {string} sourcePath Absolute path to the root `package.json`.
 * @returns {string} The root version string (the single source of truth).
 */
function readRootVersion(sourcePath) {
  const root = JSON.parse(readFileSync(sourcePath, "utf8"));
  return root.version;
}

/**
 * Set a manifest's `version` to the given value, preserving its formatting.
 *
 * The file is re-serialized with `JSON.stringify(obj, null, 2) + "\n"`, which
 * round-trips the current manifests byte-identically apart from the version
 * line. Returns whether the file content actually changed, so callers can
 * report a no-op (the idempotent re-run case).
 *
 * @param {string} manifestPath Absolute path to the target manifest.
 * @param {string} version Version string to write into the manifest.
 * @returns {boolean} `true` if the file content changed, `false` if unchanged.
 */
function syncManifestVersion(manifestPath, version) {
  const original = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(original);
  manifest.version = version;
  const updated = JSON.stringify(manifest, null, 2) + "\n";
  if (updated === original) {
    return false;
  }
  writeFileSync(manifestPath, updated);
  return true;
}

/**
 * Propagate the root `package.json` version to all secondary manifests.
 *
 * @param {object} [options] Optional overrides, primarily for testing.
 * @param {string} [options.repoRoot] Repository root to resolve paths against.
 * @param {string} [options.sourceManifest] Absolute path to the source manifest.
 * @param {string[]} [options.targetManifests] Target manifest paths, relative
 *   to `repoRoot`.
 * @returns {{ version: string, changed: string[] }} The synced version and the
 *   list of target paths whose content changed.
 */
function syncVersion(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const sourceManifest = options.sourceManifest ?? join(repoRoot, "package.json");
  const targetManifests = options.targetManifests ?? TARGET_MANIFESTS;

  const version = readRootVersion(sourceManifest);
  const changed = [];
  for (const target of targetManifests) {
    if (syncManifestVersion(join(repoRoot, target), version)) {
      changed.push(target);
    }
  }
  return { version, changed };
}

export { readRootVersion, syncManifestVersion, syncVersion, TARGET_MANIFESTS };

/**
 * Whether this module was executed directly as a CLI (rather than imported,
 * e.g. by tests). Compares the resolved real paths of this module and the
 * entry script so symlinked invocations (such as macOS temp dirs) still match.
 *
 * @returns {boolean} `true` when run as `node scripts/sync-version.mjs`.
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
  const { version, changed } = syncVersion();
  if (changed.length === 0) {
    console.log(`Version ${version} already in sync; no changes.`);
  } else {
    for (const target of changed) {
      console.log(`Updated ${target} to version ${version}.`);
    }
  }
}
