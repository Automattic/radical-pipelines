import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute paths to the three lockstep files, resolved relative to this test file. */
const PHASE4_PATH = fileURLToPath(
  new URL(
    "../../skills/radical-pipelines/reference/autonomous-phases/4 - code.md",
    import.meta.url,
  ),
);
const SETUP_PATH = fileURLToPath(
  new URL(
    "../../skills/radical-pipelines/reference/conventions/setup.md",
    import.meta.url,
  ),
);
const LOAD_PATH = fileURLToPath(
  new URL(
    "../../skills/radical-pipelines/reference/conventions/load.md",
    import.meta.url,
  ),
);
const README_PATH = fileURLToPath(new URL("../../README.md", import.meta.url));

const phase4 = readFileSync(PHASE4_PATH, "utf8");
const setup = readFileSync(SETUP_PATH, "utf8");
const load = readFileSync(LOAD_PATH, "utf8");
const readme = readFileSync(README_PATH, "utf8");

/**
 * A bare `code-writer` reference: the backticked agent name not immediately
 * followed by a `-tdd` / `-e2e` suffix and not part of the plural
 * sequencing prose ("code-writers" / "code-writer in the batch").
 */
function hasBareCodeWriter(text) {
  return /`code-writer`/.test(text);
}

describe("phase-4 reference dispatches by Type", () => {
  test("overview routes tdd→code-writer-tdd and e2e→code-writer-e2e", () => {
    const overview = phase4.split("\n").slice(0, 4).join("\n");
    assert.match(overview, /`Type`/, "overview must dispatch by Type");
    assert.match(
      overview,
      /`code-writer-tdd`/,
      "overview must name code-writer-tdd",
    );
    assert.match(
      overview,
      /`code-writer-e2e`/,
      "overview must name code-writer-e2e",
    );
  });

  test("Required-agents table has two writer rows", () => {
    assert.match(
      phase4,
      /\|\s*`code-writer-tdd`\s*\|/,
      "Required-agents table must have a code-writer-tdd row",
    );
    assert.match(
      phase4,
      /\|\s*`code-writer-e2e`\s*\|/,
      "Required-agents table must have a code-writer-e2e row",
    );
  });

  test("neither writer row attributes behavior verification to the writer", () => {
    const tddRow = phase4.match(/\|\s*`code-writer-tdd`[^\n]*/)?.[0] ?? "";
    const e2eRow = phase4.match(/\|\s*`code-writer-e2e`[^\n]*/)?.[0] ?? "";
    assert.doesNotMatch(
      tddRow,
      /verif/i,
      "code-writer-tdd row must not attribute behavior verification",
    );
    assert.doesNotMatch(
      e2eRow,
      /verif/i,
      "code-writer-e2e row must not attribute behavior verification",
    );
  });

  test("writer rows say 'runs the gates', not 'validates'", () => {
    const tddRow = phase4.match(/\|\s*`code-writer-tdd`[^\n]*/)?.[0] ?? "";
    const e2eRow = phase4.match(/\|\s*`code-writer-e2e`[^\n]*/)?.[0] ?? "";
    assert.match(tddRow, /runs the gates/i, "tdd row must say runs the gates");
    assert.match(e2eRow, /runs the gates/i, "e2e row must say runs the gates");
    assert.doesNotMatch(tddRow, /validates/i, "tdd row must not say validates");
    assert.doesNotMatch(e2eRow, /validates/i, "e2e row must not say validates");
  });

  test("step 3.1 launch is type-conditional with Type in the field list", () => {
    const step31 =
      phase4.match(/3\.\s*For each task[\s\S]*?(?=\n\d+\. )/)?.[0] ?? phase4;
    assert.match(
      step31,
      /`code-writer-tdd`/,
      "step 3.1 launch must route tdd→code-writer-tdd",
    );
    assert.match(
      step31,
      /`code-writer-e2e`/,
      "step 3.1 launch must route e2e→code-writer-e2e",
    );
    assert.match(
      step31,
      /Type/,
      "step 3.1 launch field list must include Type",
    );
  });

  test("no required-agents row or step names a bare code-writer", () => {
    assert.ok(
      !hasBareCodeWriter(phase4),
      "phase-4 reference must not name a bare `code-writer`",
    );
  });

  test("keeps the plural code-writers sequencing prose and the mermaid node", () => {
    assert.match(
      phase4,
      /code-writers?\b/,
      "phase-4 must keep the plural sequencing prose",
    );
    assert.match(
      phase4,
      /Code Writer/,
      "phase-4 must keep the mermaid Code Writer node",
    );
  });
});

describe("setup.md gate-running enumeration names both writers", () => {
  /** Line 183: the gate-running-agents enumeration. */
  const enumeration =
    setup.match(/one or more of[^\n]*code-writer[^\n]*/)?.[0] ?? "";
  /** Line 185: the per-task / per-pipeline reminder. */
  const reminder = setup.match(/[^\n]*run once per task[^\n]*/)?.[0] ?? "";

  test("line 183 names code-writer-tdd and code-writer-e2e", () => {
    assert.match(enumeration, /`code-writer-tdd`/, "must name code-writer-tdd");
    assert.match(enumeration, /`code-writer-e2e`/, "must name code-writer-e2e");
    assert.match(enumeration, /`code-reviewer`/, "must keep code-reviewer");
    assert.match(enumeration, /`doc-writer`/, "must keep doc-writer");
    assert.match(enumeration, /`doc-reviewer`/, "must keep doc-reviewer");
  });

  test("line 185 names code-writer-tdd and code-writer-e2e", () => {
    assert.match(reminder, /`code-writer-tdd`/, "must name code-writer-tdd");
    assert.match(reminder, /`code-writer-e2e`/, "must name code-writer-e2e");
  });

  test("neither line 183 nor line 185 names a bare code-writer", () => {
    assert.ok(
      !hasBareCodeWriter(enumeration),
      "line 183 must not name a bare `code-writer`",
    );
    assert.ok(
      !hasBareCodeWriter(reminder),
      "line 185 must not name a bare `code-writer`",
    );
  });

  test("setup.md as a whole no longer names a bare code-writer", () => {
    assert.ok(
      !hasBareCodeWriter(setup),
      "setup.md must not name a bare `code-writer`",
    );
  });
});

describe("load.md carries no gate-running enumeration and is untouched", () => {
  test("load.md does not name code-writer in any form", () => {
    assert.doesNotMatch(
      load,
      /code-writer/,
      "load.md must carry no code-writer enumeration",
    );
  });
});

describe("README roster names both writers", () => {
  test("roster names code-writer-tdd and code-writer-e2e", () => {
    assert.match(readme, /`code-writer-tdd`/, "roster must name code-writer-tdd");
    assert.match(readme, /`code-writer-e2e`/, "roster must name code-writer-e2e");
  });

  test("roster no longer names a bare code-writer", () => {
    assert.ok(
      !hasBareCodeWriter(readme),
      "README must not name a bare `code-writer`",
    );
  });
});

describe("no migration or backward-compatibility text", () => {
  for (const [name, text] of [
    ["phase-4 reference", phase4],
    ["setup.md", setup],
    ["README", readme],
  ]) {
    test(`${name} introduces no migration text`, () => {
      assert.doesNotMatch(
        text,
        /backward[- ]compat|migrat(e|ion)|formerly|previously|renamed|used to be/i,
        `${name} must not introduce migration / backward-compatibility text`,
      );
    });
  }
});
