import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

/**
 * Absolute path to the repository's default pull-request template, resolved
 * relative to this test file (scripts/test/ -> repo root -> .github/...).
 */
const TEMPLATE_PATH = fileURLToPath(
  new URL("../../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url),
);

/** Raw template contents, read once for every structural/content assertion. */
const raw = readFileSync(TEMPLATE_PATH, "utf8");
/** Template split into lines (trailing newline yields a final empty entry). */
const lines = raw.split("\n");

describe("pull-request template — headings and order (AC2)", () => {
  test("first line is the What? heading, no leading blank/intro", () => {
    assert.equal(lines[0], "## What?");
  });

  test("the three concept headings appear in order, all question-form", () => {
    const headings = lines.filter((line) => line.startsWith("## "));
    assert.deepEqual(headings.slice(0, 3), ["## What?", "## Why?", "## How?"]);
  });

  test("a fourth ## Changeset heading appears after ## How?", () => {
    const headings = lines.filter((line) => line.startsWith("## "));
    assert.equal(headings.length, 4);
    assert.equal(headings[3], "## Changeset");
    assert.ok(raw.indexOf("## How?") < raw.indexOf("## Changeset"));
  });
});

describe("pull-request template — What block (AC3, AC4)", () => {
  test("Closes # sits directly under ## What? with no blank line", () => {
    assert.equal(lines[1], "Closes #");
  });

  test("Closes # has no trailing whitespace and no trailing comment", () => {
    // The exact line is "Closes #": no spaces after, no inline <!-- ... -->.
    assert.equal(lines[1], "Closes #");
    assert.doesNotMatch(lines[1], /\s$/);
    assert.doesNotMatch(lines[1], /<!--/);
  });

  test("the What hint comment follows Closes # on its own line", () => {
    assert.equal(lines[2], "<!-- What does this change do? -->");
  });
});

describe("pull-request template — section hints (AC3, AC7)", () => {
  test("each section hint is present, exactly once, as a single-line comment", () => {
    const hints = [
      "<!-- What does this change do? -->",
      "<!-- What problem does it solve, or why is it needed? -->",
      "<!-- How does it work? Key implementation details or approach. -->",
    ];
    for (const hint of hints) {
      assert.ok(lines.includes(hint), `missing hint line: ${hint}`);
      const count = lines.filter((line) => line === hint).length;
      assert.equal(count, 1, `hint should appear once: ${hint}`);
    }
  });

  test("every HTML comment is well-formed and self-contained on one line", () => {
    // No comment spans a heading or multiple lines: opens and closes per line,
    // and the count of openers matches closers across the whole file.
    const openers = (raw.match(/<!--/g) ?? []).length;
    const closers = (raw.match(/-->/g) ?? []).length;
    assert.equal(openers, closers);
    assert.equal(openers, 3);
    for (const line of lines) {
      if (line.includes("<!--")) {
        assert.match(line, /^<!--.*-->$/, `malformed comment line: ${line}`);
      }
    }
  });
});

describe("pull-request template — Changeset footer (AC5)", () => {
  test("contains exactly one literal `npx changeset` reminder", () => {
    const occurrences = (raw.match(/npx changeset/g) ?? []).length;
    assert.equal(occurrences, 1);
  });

  test("the reminder is visible prose, not inside an HTML comment", () => {
    const changesetLine = lines.find((line) => line.includes("npx changeset"));
    assert.ok(changesetLine);
    assert.doesNotMatch(changesetLine, /<!--/);
  });

  test("names all five release-relevant paths", () => {
    for (const path of [
      "`skills/**`",
      "`agents/**`",
      "`.claude-plugin/**`",
      "`package.json`",
      "`README.md`",
    ]) {
      assert.ok(raw.includes(path), `missing path token: ${path}`);
    }
  });

  test("links the full CONTRIBUTING.md blob URL", () => {
    assert.ok(
      raw.includes(
        "https://github.com/Automattic/radical-pipelines/blob/trunk/CONTRIBUTING.md",
      ),
    );
  });

  test("does not restate bump-type or version rules", () => {
    assert.doesNotMatch(raw, /\b(major|minor|patch)\b/i);
    assert.doesNotMatch(raw, /bump/i);
  });
});

describe("pull-request template — exclusions (AC6, AC7)", () => {
  test("contains zero checkbox items", () => {
    assert.doesNotMatch(raw, /^\s*-\s*\[[ xX]\]/m);
  });

  test("no Gutenberg / WordPress-specific content", () => {
    assert.doesNotMatch(raw, /gutenberg/i);
    assert.doesNotMatch(raw, /wordpress/i);
    assert.doesNotMatch(raw, /block[- ]editor/i);
    assert.doesNotMatch(raw, /Testing Instructions for Keyboard/i);
    assert.doesNotMatch(raw, /screencast/i);
    assert.doesNotMatch(raw, /AI Guidelines/i);
  });

  test("no extra Testing or AI-disclosure section", () => {
    const headings = lines.filter((line) => line.startsWith("## "));
    assert.deepEqual(headings, [
      "## What?",
      "## Why?",
      "## How?",
      "## Changeset",
    ]);
  });
});

describe("pull-request template — file shape", () => {
  test("ends with a single trailing newline", () => {
    assert.ok(raw.endsWith("\n"));
    assert.ok(!raw.endsWith("\n\n"));
  });

  test("each section block is separated by exactly one blank line", () => {
    // Blank lines precede each ## heading after the first, and nowhere doubles.
    assert.doesNotMatch(raw, /\n\n\n/);
  });
});
