import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { TARGET_MANIFESTS } from "../sync-version.mjs";

/** Absolute path to the repository root `package.json`, the release entry point. */
const ROOT_MANIFEST = fileURLToPath(
  new URL("../../package.json", import.meta.url),
);

/** Raw text of the root `package.json` (formatting-preserving read). */
const RAW = readFileSync(ROOT_MANIFEST, "utf8");

/** Parsed root `package.json`. */
const PKG = JSON.parse(RAW);

describe("release:version npm script", () => {
  test("appends the lockfile sync as the last step of the && chain", () => {
    assert.equal(
      PKG.scripts["release:version"],
      "changeset version && node scripts/sync-version.mjs && npm install --package-lock-only --no-audit --no-fund",
    );
  });

  test("preserves fail-fast ordering: bump → propagate → reconcile lockfile", () => {
    const steps = PKG.scripts["release:version"].split(" && ");
    assert.deepEqual(steps, [
      "changeset version",
      "node scripts/sync-version.mjs",
      "npm install --package-lock-only --no-audit --no-fund",
    ]);
  });

  test("sync scope is unchanged: TARGET_MANIFESTS still lists only the plugin manifest", () => {
    assert.deepEqual(TARGET_MANIFESTS, [".claude-plugin/plugin.json"]);
  });

  test("root package.json stays valid JSON with 2-space indent and a trailing newline", () => {
    // Re-serializing the parse round-trips byte-identically only if the file
    // already uses 2-space indent and ends in a single trailing newline.
    assert.equal(JSON.stringify(PKG, null, 2) + "\n", RAW);
  });

  test("no other script is altered, aside from the additive test:opencode entry", () => {
    assert.deepEqual(Object.keys(PKG.scripts).sort(), [
      "release:version",
      "test",
      "test:opencode",
    ]);
    assert.equal(PKG.scripts.test, "node --test 'scripts/test/**/*.test.mjs'");
  });

  test("test:opencode is not referenced by the fixed test script, and its glob excludes the opencode integration suite", () => {
    assert.equal(PKG.scripts["test:opencode"], "node scripts/opencode-integration/run.mjs");
    assert.ok(
      !PKG.scripts.test.includes("test:opencode") && !PKG.scripts.test.includes("opencode-integration"),
      "the fixed npm test gate must never run the opencode integration suite",
    );
  });
});
