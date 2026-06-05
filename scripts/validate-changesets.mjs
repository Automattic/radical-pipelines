#!/usr/bin/env node
/**
 * Changeset shape validator.
 *
 * Enforces the changeset shape rules for `.changeset/*.md` files: a well-formed
 * front-matter fence, a YAML mapping of package name to bump, a known package
 * name, a valid bump value, and the repository's pre-1.0 policy (no `major`
 * bump while the version is still in the `0.x` series).
 *
 * Uses only built-in Node modules — no `tsx`, no YAML parser, no external
 * dependencies and no network. The front matter is parsed line-by-line with a
 * single entry regex rather than a YAML library; this deliberately mirrors only
 * the subset of YAML that `@changesets/write` emits (quoted key, scalar bump)
 * and rejects everything else (lists, scalars, bare `@`-scoped keys) as a
 * non-mapping — which matches what the real changesets parser can consume.
 *
 * Mirrors the export + `isMainModule()` shape of `scripts/sync-version.mjs`.
 *
 * Usage:
 *   node scripts/validate-changesets.mjs
 */

import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Err
 * @property {string} file The changeset file the error pertains to.
 * @property {number} line The 1-based line number to report the error at.
 * @property {string} msg Human-readable error message.
 */

/** The package name every changeset entry must reference. */
const EXPECTED_NAME = "@automattic/radical-pipelines";

/** The set of valid changeset bump values. */
const VALID_BUMPS = new Set(["patch", "minor", "major", "none"]);

/**
 * Splits a changeset into its front matter and body. Group 1 is the front
 * matter, group 2 the body. Tolerates CRLF line endings and an optional final
 * newline after the closing fence.
 */
const FENCE_RE = /^---\r?\n([\s\S]*?)(?:\r?\n)?---\r?\n?([\s\S]*)$/;

/**
 * Matches a single `key: bump` front-matter line. Three key alternatives:
 *   1. a double-quoted key (what `@changesets/write` always emits),
 *   2. a single-quoted key,
 *   3. a legal *bare* key whose first character excludes the YAML reserved
 *      indicators `@ \` ! & * ? | > % # " '` and whitespace.
 * Group 4 is the bump value. A bare `@`-scoped key fails alt 3 (its first-char
 * class excludes `@`), so an unquoted `@automattic/...` key is rejected as
 * malformed YAML — matching the real changesets parser.
 */
const ENTRY_RE = /^\s*(?:"([^"]+)"|'([^']+)'|([^@`!&*?|>%#"'\s][^:#\s]*))\s*:\s*(\S+)\s*$/;

/**
 * Validate a single changeset file's shape.
 *
 * @param {string} file The changeset file name (used in returned errors).
 * @param {string} raw The full file contents.
 * @param {string} pkgName The expected package name.
 * @param {string} version The current root version (drives the pre-1.0 guard).
 * @returns {Err[]} An array of errors; empty when the changeset is valid.
 */
function validateChangesetFile(file, raw, pkgName, version) {
  const match = FENCE_RE.exec(raw);
  if (!match) {
    return [
      {
        file,
        line: 1,
        msg: "missing or unterminated front matter (expected two '---' fences)",
      },
    ];
  }

  const frontMatter = match[1];
  const body = match[2];

  // Canonical empty changeset (`changeset --empty`), with or without a trailing
  // newline, is valid.
  if (frontMatter.trim() === "" && body.trim() === "") {
    return [];
  }

  // Front matter is present but the body is empty.
  if (body.trim() === "") {
    return [
      {
        file,
        line: 4,
        msg: "empty body (changeset has front matter but no summary)",
      },
    ];
  }

  // Parse the front matter line-by-line into a `{ name: bump }` map. Any
  // non-blank line that fails ENTRY_RE — or finding no entries at all — means
  // the front matter is not a mapping.
  const entries = [];
  for (const fmLine of frontMatter.split(/\r?\n/)) {
    if (fmLine.trim() === "") {
      continue;
    }
    const entry = ENTRY_RE.exec(fmLine);
    if (!entry) {
      return [
        {
          file,
          line: 2,
          msg: "front matter must be a YAML mapping of package name to bump",
        },
      ];
    }
    const name = entry[1] ?? entry[2] ?? entry[3];
    const bump = entry[4];
    entries.push({ name, bump });
  }

  if (entries.length === 0) {
    return [
      {
        file,
        line: 2,
        msg: "front matter must be a YAML mapping of package name to bump",
      },
    ];
  }

  const errors = [];
  for (const { name, bump } of entries) {
    if (name !== pkgName) {
      errors.push({
        file,
        line: 2,
        msg: `unknown package "${name}" (expected "${pkgName}")`,
      });
    }
    if (!VALID_BUMPS.has(bump)) {
      errors.push({
        file,
        line: 2,
        msg: `invalid bump "${bump}" (expected one of patch, minor, major, none)`,
      });
    }
    if (version.startsWith("0.") && bump === "major") {
      errors.push({
        file,
        line: 2,
        msg: `'major' is forbidden while pre-1.0 (version=${version}). Use 'minor' with a 'BREAKING:' prefix; see CONTRIBUTING.md#pre-10-policy.`,
      });
    }
  }

  return errors;
}

/**
 * Validate every changeset in the CWD `.changeset/` directory against the root
 * `package.json`'s name and version. Prints `.changeset/<file>:<line>: <msg>`
 * per error to stderr and writes nothing to stdout.
 *
 * @returns {0 | 1} `1` if any changeset has errors, else `0`.
 */
function main() {
  const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));

  const files = readdirSync(".changeset").filter(
    (n) => n.endsWith(".md") && n !== "README.md",
  );

  let hasErrors = false;
  for (const file of files) {
    const raw = readFileSync(join(".changeset", file), "utf8");
    for (const err of validateChangesetFile(file, raw, name, version)) {
      hasErrors = true;
      console.error(`.changeset/${err.file}:${err.line}: ${err.msg}`);
    }
  }

  return hasErrors ? 1 : 0;
}

export { validateChangesetFile, main };

/**
 * Whether this module was executed directly as a CLI (rather than imported,
 * e.g. by tests). Compares the resolved real paths of this module and the
 * entry script so symlinked invocations (such as macOS temp dirs) still match.
 *
 * @returns {boolean} `true` when run as `node scripts/validate-changesets.mjs`.
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
