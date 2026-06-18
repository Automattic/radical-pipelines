import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

/** Repository root (the parent of this `scripts/test/` dir's grandparent). */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const ROOT_MANIFEST = JSON.parse(
  readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
);
const OPENCODE_MANIFEST = JSON.parse(
  readFileSync(join(REPO_ROOT, "packages/opencode/package.json"), "utf8"),
);

describe("opencode sub-package manifest", () => {
  test("is publishable (not private)", () => {
    // The root stays private; only the sub-package publishes.
    assert.notEqual(OPENCODE_MANIFEST.private, true);
  });

  test("version is in lockstep with the root", () => {
    assert.equal(OPENCODE_MANIFEST.version, ROOT_MANIFEST.version);
  });

  test("declares the Node/Bun runtime prerequisite", () => {
    assert.deepEqual(OPENCODE_MANIFEST.engines, {
      node: ">=24",
      bun: ">=1.0",
    });
  });

  test("pins @hueyexe/opencode-ensemble to an exact version", () => {
    const ensemble = OPENCODE_MANIFEST.dependencies?.["@hueyexe/opencode-ensemble"];
    assert.ok(ensemble, "ensemble must be a dependency");
    // opencode caches unpinned plugins, so the version must be exact: no
    // range prefix (^, ~, >=, etc.) and no wildcard.
    assert.match(ensemble, /^\d+\.\d+\.\d+$/);
  });

  test("depends on ensemble's shared opencode deps", () => {
    assert.ok(OPENCODE_MANIFEST.dependencies?.["@opencode-ai/plugin"]);
    assert.ok(OPENCODE_MANIFEST.dependencies?.["@opencode-ai/sdk"]);
  });

  test("is an ES module", () => {
    assert.equal(OPENCODE_MANIFEST.type, "module");
  });
});
