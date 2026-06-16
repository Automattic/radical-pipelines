import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the code-writer-e2e agent, resolved relative to this test file. */
const AGENT_PATH = fileURLToPath(
  new URL("../../agents/code-writer-e2e.md", import.meta.url),
);

const agent = readFileSync(AGENT_PATH, "utf8");

/** The YAML frontmatter block at the head of the agent file. */
const frontmatter = agent.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

describe("code-writer-e2e frontmatter", () => {
  test("declares name: code-writer-e2e", () => {
    assert.match(
      frontmatter,
      /^name:\s*code-writer-e2e\s*$/m,
      "frontmatter is missing name: code-writer-e2e",
    );
  });

  test("description names implementing the planner's e2e test specs from code-plan.md", () => {
    assert.match(
      frontmatter,
      /^description:.*\be2e\b/im,
      "description must name e2e test specs",
    );
    assert.match(
      frontmatter,
      /^description:.*code-plan\.md/im,
      "description must name code-plan.md as the source of the specs",
    );
  });
});

describe("code-writer-e2e workflow steps", () => {
  test("has the four collapsed steps in order", () => {
    const order = [
      "Gather context",
      "Implement the planned e2e flows",
      "Run the guardrails",
      "Commit and report",
    ];
    let cursor = -1;
    for (const heading of order) {
      const at = agent.indexOf(heading);
      assert.notEqual(at, -1, `agent is missing step "${heading}"`);
      assert.ok(at > cursor, `"${heading}" is out of order`);
      cursor = at;
    }
  });

  test("has no Behavior verification step", () => {
    assert.doesNotMatch(
      agent,
      /Behavior verification/i,
      "agent must not contain a Behavior verification step",
    );
  });

  test("has no Derive end-to-end tests self-derivation step", () => {
    assert.doesNotMatch(
      agent,
      /Derive end-to-end/i,
      "agent must not contain a Derive end-to-end tests self-derivation step",
    );
  });
});

describe("code-writer-e2e Implement the planned e2e flows", () => {
  /** The Implement step, sliced up to the next ### heading. */
  const section =
    agent.match(
      /###[^\n]*Implement the planned e2e flows[\s\S]*?(?=\n### )/,
    )?.[0] ?? "";

  test("reads each named flow's spec from the E2E test plan section", () => {
    assert.match(
      section,
      /### Flow N/,
      "must instruct reading each named flow's `### Flow N` spec",
    );
    assert.match(
      section,
      /E2E test plan/,
      "must name the E2E test plan section as the source of the flows",
    );
  });

  test("realizes Steps and asserts Expected as an automated e2e test", () => {
    assert.match(section, /Steps/, "must realize the flow's Steps");
    assert.match(section, /Expected/, "must assert the flow's Expected");
    assert.match(
      section,
      /automated e2e test/i,
      "must write an automated e2e test",
    );
  });

  test("confirms the test genuinely exercises the flow and passes (no RED/GREEN/REFACTOR)", () => {
    assert.match(
      section,
      /genuinely exercises the flow and passes/i,
      "must confirm the test genuinely exercises the flow and passes",
    );
    for (const phase of ["RED", "GREEN", "REFACTOR"]) {
      assert.ok(
        !section.includes(phase),
        `Implement step must not use the ${phase} phase`,
      );
    }
  });

  test("carries no public-symbol documentation block, but a one-line test-code-convention guideline", () => {
    assert.doesNotMatch(
      agent,
      /public symbol/i,
      "agent must not carry the public-symbol documentation block",
    );
    assert.match(
      agent,
      /follow project conventions for test code/i,
      "agent must have a one-line test-code-convention guideline",
    );
  });
});

describe("code-writer-e2e Gather context", () => {
  /** The Gather context section, sliced up to the next ### heading. */
  const section =
    agent.match(/###[^\n]*Gather context[\s\S]*?(?=\n### )/)?.[0] ?? "";

  test("names the assigned task block as an input", () => {
    assert.match(
      section,
      /assigned task block/i,
      "Gather context must name the assigned task block",
    );
  });

  test("names the E2E test plan section as an input", () => {
    assert.match(
      section,
      /E2E test plan section of `code-plan\.md`/,
      "Gather context must name the E2E test plan section of code-plan.md",
    );
  });

  test("does not name a Required test commands section as an input", () => {
    assert.doesNotMatch(
      section,
      /Required test commands/,
      "Gather context must not name a Required test commands section",
    );
  });

  test("has no self-naming guardrail-read line", () => {
    assert.doesNotMatch(
      section,
      /guardrail/i,
      "Gather context must not name a guardrail-read line",
    );
  });
});

describe("code-writer-e2e Run the guardrails", () => {
  /** The Run the guardrails section, sliced up to the next ### heading. */
  const section =
    agent.match(/###[^\n]*Run the guardrails[\s\S]*?(?=\n### )/)?.[0] ?? "";

  test("runs one unified gate set with no floor", () => {
    assert.doesNotMatch(
      section,
      /floor/i,
      "must not reference a required-test-commands floor",
    );
    assert.match(
      section,
      /every gate in the guardrails convention/i,
      "must run every gate in the guardrails convention",
    );
  });

  test("sorts via the three-bullet model", () => {
    assert.match(
      section,
      /No guardrails convention/i,
      "missing the no-guardrails-convention → proceed bullet",
    );
    assert.match(
      section,
      /blocker/i,
      "missing the cannot-execute → blocker bullet",
    );
    assert.match(
      section,
      /work/i,
      "missing the runs-and-fails → work bullet",
    );
  });

  test("forbids bypassing gates", () => {
    assert.match(
      section,
      /--no-verify|bypass/i,
      "must forbid bypassing gates",
    );
  });
});

describe("code-writer-e2e guidelines", () => {
  test("self-containment guideline names the task block and the E2E test plan section", () => {
    assert.match(
      agent,
      /The task block and the E2E test plan section of `code-plan\.md` are your inputs/,
      "self-containment guideline must name the task block and the E2E test plan section",
    );
    assert.doesNotMatch(
      agent,
      /Required test commands/,
      "self-containment guideline must not reference Required test commands",
    );
  });
});

describe("code-writer-e2e removed vocabulary", () => {
  test("does not contain 'guardrail selection'", () => {
    assert.doesNotMatch(
      agent,
      /guardrail selection/i,
      "agent must not contain the removed 'guardrail selection' vocabulary",
    );
  });

  test("does not contain 'two-question' / 'two questions'", () => {
    assert.doesNotMatch(
      agent,
      /two[\s-]questions?/i,
      "agent must not contain the removed 'two-question' vocabulary",
    );
  });
});
