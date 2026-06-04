import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { validateChangesetFile } from "../validate-changesets.mjs";

/** The package name every changeset entry must reference. */
const PKG = "@automattic/radical-pipelines";

/** Absolute path to the validator CLI, resolved relative to this test file. */
const VALIDATOR_PATH = fileURLToPath(
  new URL("../validate-changesets.mjs", import.meta.url),
);

describe("validateChangesetFile", () => {
  test("B1 valid minor → []", () => {
    const raw = `---\n"${PKG}": minor\n---\n\nAdd a thing\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "0.1.0"), []);
  });

  test("B2a canonical empty (trailing newline) → []", () => {
    assert.deepEqual(
      validateChangesetFile("c.md", "---\n---\n", PKG, "0.1.0"),
      [],
    );
  });

  test("B2b canonical empty (no trailing newline) → []", () => {
    assert.deepEqual(
      validateChangesetFile("c.md", "---\n---", PKG, "0.1.0"),
      [],
    );
  });

  test("B3 missing closing fence → err line 1", () => {
    const raw = `---\n"${PKG}": minor\n\nAdd a thing\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 1);
    assert.match(errs[0].msg, /missing or unterminated front matter/);
  });

  test("B4 invalid bump → err line 2", () => {
    const raw = `---\n"${PKG}": superminor\n---\n\nBody\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 2);
    assert.match(errs[0].msg, /invalid bump "superminor"/);
  });

  test("B5 wrong package → err line 2 with expected name", () => {
    const raw = `---\n"some-other-package": minor\n---\n\nBody\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 2);
    assert.match(errs[0].msg, /unknown package "some-other-package"/);
    assert.match(errs[0].msg, /expected "@automattic\/radical-pipelines"/);
  });

  test("B6 empty body → err line 4", () => {
    const raw = `---\n"${PKG}": minor\n---\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 4);
    assert.match(errs[0].msg, /empty body/);
  });

  test("B7a pre-1.0 major → err line 2 with #pre-10-policy anchor", () => {
    const raw = `---\n"${PKG}": major\n---\n\nBody\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 2);
    assert.match(errs[0].msg, /'major' is forbidden while pre-1\.0/);
    assert.match(errs[0].msg, /#pre-10-policy/);
  });

  test("B7b major accepted at 1.0.0 → []", () => {
    const raw = `---\n"${PKG}": major\n---\n\nBody\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "1.0.0"), []);
  });

  test("CRLF valid input → []", () => {
    const raw = `---\r\n"${PKG}": minor\r\n---\r\n\r\nBody\r\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "0.1.0"), []);
  });

  test("KEYS double-quoted → []", () => {
    const raw = `---\n"${PKG}": minor\n---\n\nBody\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "0.1.0"), []);
  });

  test("KEYS single-quoted → []", () => {
    const raw = `---\n'${PKG}': minor\n---\n\nBody\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "0.1.0"), []);
  });

  test("KEYS bare-@ rejected → err line 2 non-mapping message", () => {
    const raw = `---\n${PKG}: minor\n---\n\nBody\n`;
    const errs = validateChangesetFile("c.md", raw, PKG, "0.1.0");
    assert.equal(errs.length, 1);
    assert.equal(errs[0].line, 2);
    assert.match(errs[0].msg, /front matter must be a YAML mapping/);
  });

  test("none bump → []", () => {
    const raw = `---\n"${PKG}": none\n---\n\nBody\n`;
    assert.deepEqual(validateChangesetFile("c.md", raw, PKG, "0.1.0"), []);
  });
});

describe("validate-changesets CLI", () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "validate-changesets-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: PKG, version: "0.1.0" }, null, 2) + "\n",
    );
    mkdirSync(join(dir, ".changeset"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("a bad changeset → exit 1, stderr matches the error format, empty stdout", () => {
    writeFileSync(
      join(dir, ".changeset", "bad.md"),
      `---\n"${PKG}": superminor\n---\n\nBody\n`,
    );

    const result = spawnSync(process.execPath, [VALIDATOR_PATH], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.changeset\/[^:]+:\d+: invalid bump/);
    assert.equal(result.stdout, "");
  });

  test("a good changeset → exit 0, empty stderr", () => {
    writeFileSync(
      join(dir, ".changeset", "good.md"),
      `---\n"${PKG}": minor\n---\n\nBody\n`,
    );

    const result = spawnSync(process.execPath, [VALIDATOR_PATH], {
      cwd: dir,
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
  });
});
