import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Absolute path to the repository root, resolved relative to this test file. */
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Absolute path to the root `package.json`. */
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");

/** Parsed root `package.json`. */
const PKG = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));

/** Absolute path the packaged plugin entry point must resolve to. */
const PLUGIN_ENTRY_PATH = join(REPO_ROOT, "opencode", "plugin.mjs");

/**
 * Resolve `package.json`'s declared package entry point to an absolute path,
 * preferring `exports` over `main` — matching Node's own module-resolution
 * precedence when both fields are present.
 *
 * @param {object} pkg Parsed `package.json`.
 * @returns {string} Absolute path the declared entry resolves to.
 */
function resolveDeclaredEntry(pkg) {
  const declared =
    (typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."]) ??
    pkg.main;
  assert.ok(declared, "package.json declares neither exports nor main");
  return join(REPO_ROOT, declared);
}

describe("package.json plugin entry point", () => {
  test("main/exports resolves to opencode/plugin.mjs, which exists on disk", () => {
    const resolved = resolveDeclaredEntry(PKG);

    assert.ok(existsSync(resolved));
    assert.equal(realpathSync(resolved), realpathSync(PLUGIN_ENTRY_PATH));
  });

  test("importing the resolved entry yields the plugin object {id, setup}", async () => {
    const resolved = resolveDeclaredEntry(PKG);
    const mod = await import(pathToFileURL(resolved).href);

    assert.deepEqual(Object.keys(mod.default).sort(), ["id", "setup"]);
    assert.equal(typeof mod.default.id, "string");
    assert.equal(typeof mod.default.setup, "function");
  });

  test("package.json still declares a version, untouched by the entry-point addition", () => {
    assert.equal(typeof PKG.version, "string");
    assert.ok(PKG.version.length > 0);
  });
});
