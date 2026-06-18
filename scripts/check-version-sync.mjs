#!/usr/bin/env node
/**
 * Version-sync drift guard.
 *
 * Reads the four version-bearing values across the repository's manifests and
 * lockfile, takes the root `package.json` `.version` as the single source of
 * truth, and reports any of the other three that disagree with it. Intended for
 * the pull-request gate: a non-zero exit blocks a merge whose versions have
 * drifted out of sync (the failure `scripts/sync-version.mjs` is meant to
 * prevent).
 *
 * Each value is read by structured JSON path — parse the file, then access the
 * field — never by text or substring search. Unrelated version-shaped strings
 * (a pinned dependency in `package-lock.json`, a version heading in a
 * `CHANGELOG.md`) therefore cannot cause a false pass or a false fail.
 *
 * Uses only built-in Node modules; no external dependencies and no network.
 *
 * Usage:
 *   node scripts/check-version-sync.mjs
 */

import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Location
 * @property {string} file Repo-root-relative path to the file holding the value.
 * @property {string} jsonPath Human-readable JSON path of the value within the
 *   file, used to disambiguate two fields living in the same file.
 * @property {(parsed: object) => string} read Extracts the value from the
 *   already-parsed file contents by structured access.
 */

/**
 * @typedef {object} Err
 * @property {string} file Repo-root-relative path to the offending file.
 * @property {string} jsonPath JSON path of the offending value within the file.
 * @property {string} value The conflicting value found at that location.
 */

/**
 * The exactly four `(file, JSON-path)` locations the guard compares. The first
 * entry — `package.json` `.version` — is the baseline / source of truth; the
 * other three are compared against it. The literal is kept local rather than
 * imported from `sync-version.mjs`, because that module's `TARGET_MANIFESTS`
 * lists whole files to overwrite, whereas the guard must address individual
 * fields (two of which share `package-lock.json`).
 *
 * @type {Location[]}
 */
const VERSION_LOCATIONS = [
  {
    file: "package.json",
    jsonPath: ".version",
    read: (parsed) => parsed.version,
  },
  {
    file: ".claude-plugin/plugin.json",
    jsonPath: ".version",
    read: (parsed) => parsed.version,
  },
  {
    file: "package-lock.json",
    jsonPath: ".version",
    read: (parsed) => parsed.version,
  },
  {
    file: "package-lock.json",
    jsonPath: '.packages[""].version',
    read: (parsed) => parsed.packages[""].version,
  },
];

/**
 * Compare the three secondary version-bearing values against the root
 * `package.json` `.version` baseline.
 *
 * Each file is parsed once and its target value(s) read by structured access,
 * never by text search. Returns one error entry per location whose value
 * disagrees with the baseline, and an empty array when all four agree.
 *
 * @param {object} options Options.
 * @param {string} options.repoRoot Repository root to resolve the locations
 *   against. Parameterized so tests can point at a temp-dir fixture.
 * @returns {Err[]} One entry per disagreeing location; empty when all agree.
 */
function checkVersionSync({ repoRoot }) {
  const parsedByFile = new Map();
  const valueAt = (location) => {
    if (!parsedByFile.has(location.file)) {
      parsedByFile.set(
        location.file,
        JSON.parse(readFileSync(join(repoRoot, location.file), "utf8")),
      );
    }
    return location.read(parsedByFile.get(location.file));
  };

  const [baseline, ...rest] = VERSION_LOCATIONS;
  const baselineValue = valueAt(baseline);

  const errors = [];
  for (const location of rest) {
    const value = valueAt(location);
    if (value !== baselineValue) {
      errors.push({
        file: location.file,
        jsonPath: location.jsonPath,
        value,
      });
    }
  }
  return errors;
}

/**
 * Run the drift guard against the current working directory's repository.
 *
 * On success writes nothing to stdout and returns `0`. On drift writes one line
 * per disagreeing location to stderr — first the baseline line, then one line
 * per offending location naming its file (and JSON path) and conflicting value
 * — and returns `1`.
 *
 * @returns {0 | 1} `1` when any of the four values disagree, else `0`.
 */
function main() {
  const repoRoot = process.cwd();
  const errors = checkVersionSync({ repoRoot });
  if (errors.length === 0) {
    return 0;
  }

  const baseline = VERSION_LOCATIONS[0];
  const baselineValue = baseline.read(
    JSON.parse(readFileSync(join(repoRoot, baseline.file), "utf8")),
  );
  console.error(`${baseline.file}: ${baselineValue} (source of truth)`);
  for (const err of errors) {
    console.error(
      `${err.file} (${err.jsonPath}): ${err.value} — does not match package.json`,
    );
  }
  return 1;
}

export { checkVersionSync, main, VERSION_LOCATIONS };

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
