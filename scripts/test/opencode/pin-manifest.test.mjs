import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the pin manifest under test. */
const PIN_PATH = fileURLToPath(
  new URL("../../../opencode/pin.json", import.meta.url),
);

/** Absolute path to the directory the pin manifest lives in. */
const OPENCODE_DIR = fileURLToPath(
  new URL("../../../opencode/", import.meta.url),
);

/**
 * Recursively collect every regular file under a directory.
 *
 * @param {string} dir Absolute directory path to walk.
 * @returns {string[]} Absolute paths of every regular file found, recursively.
 */
function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

describe("opencode/pin.json", () => {
  test("exists and parses as JSON", () => {
    const raw = readFileSync(PIN_PATH, "utf8");
    assert.doesNotThrow(() => JSON.parse(raw));
  });

  test("declares an exact @opencode-ai/cli build string, never a moving tag", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    assert.match(pin.cli, /^0\.0\.0-next-\d+$/);
    assert.notEqual(pin.cli, "next");
    assert.notEqual(pin.cli, "latest");
  });

  test("declares an @opencode-ai/plugin version string", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    assert.equal(typeof pin.plugin, "string");
    assert.ok(pin.plugin.length > 0);
  });

  test("pins cli to the exact confirmed build", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    assert.equal(pin.cli, "0.0.0-next-16573");
  });

  test("pins plugin to the exact confirmed version", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    assert.equal(pin.plugin, "0.0.0-next-16573");
  });

  test("declares cli and plugin as independent fields (no shared or derived field)", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    assert.deepEqual(Object.keys(pin).sort(), ["cli", "plugin"]);
  });

  test("is the only file in opencode/ declaring the pinned version literals", () => {
    const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
    const literals = [...new Set([pin.cli, pin.plugin])];

    const otherFiles = collectFiles(OPENCODE_DIR).filter(
      (file) => file !== PIN_PATH,
    );
    for (const file of otherFiles) {
      const contents = readFileSync(file, "utf8");
      for (const literal of literals) {
        assert.ok(
          !contents.includes(literal),
          `${file} duplicates the pinned literal ${literal}`,
        );
      }
    }
  });
});
