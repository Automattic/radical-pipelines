import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the code-writer-tdd agent, resolved relative to this test file. */
const AGENT_PATH = fileURLToPath(
  new URL("../../agents/code-writer-tdd.md", import.meta.url),
);

const agent = readFileSync(AGENT_PATH, "utf8");

/** The YAML frontmatter block at the head of the agent file. */
const frontmatter = agent.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

describe("code-writer-tdd frontmatter", () => {
  test("declares name: code-writer-tdd", () => {
    assert.match(
      frontmatter,
      /^name:\s*code-writer-tdd\s*$/m,
      "frontmatter is missing name: code-writer-tdd",
    );
  });

  test("description names unit tests via TDD", () => {
    assert.match(
      frontmatter,
      /^description:.*\bunit tests?\b/im,
      "description must name unit tests",
    );
    assert.match(
      frontmatter,
      /^description:.*(TDD|test-driven)/im,
      "description must name TDD / test-driven development",
    );
  });
});

describe("code-writer-tdd workflow steps", () => {
  test("has the four collapsed steps in order", () => {
    const order = [
      "Gather context",
      "Implement with TDD",
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

  test("has no Derive end-to-end tests step", () => {
    assert.doesNotMatch(
      agent,
      /Derive end-to-end tests/i,
      "agent must not contain a Derive end-to-end tests step",
    );
  });
});

describe("code-writer-tdd Implement with TDD", () => {
  test("keeps RED / GREEN / REFACTOR", () => {
    for (const phase of ["RED", "GREEN", "REFACTOR"]) {
      assert.ok(
        agent.includes(phase),
        `Implement with TDD is missing the ${phase} phase`,
      );
    }
  });

  test("states it writes unit tests only", () => {
    assert.match(
      agent,
      /unit tests only/i,
      "agent must state it writes unit tests only",
    );
  });

  test("carries the UI-conventions duty conditionally", () => {
    assert.match(
      agent,
      /if your task involves UI, follow the host project's UI conventions/i,
      "agent must carry the UI-conventions duty conditionally",
    );
  });

  test("documents public symbols", () => {
    assert.match(
      agent,
      /public symbol/i,
      "agent must instruct documenting public symbols",
    );
  });
});

describe("code-writer-tdd Gather context", () => {
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

  test("names the Required test commands section as an input", () => {
    assert.match(
      section,
      /Required test commands section of `code-plan\.md`/,
      "Gather context must name the Required test commands section of code-plan.md",
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

describe("code-writer-tdd Run the guardrails", () => {
  /** The Run the guardrails section, sliced up to the next ### heading. */
  const section =
    agent.match(/###[^\n]*Run the guardrails[\s\S]*?(?=\n### )/)?.[0] ?? "";

  test("runs both the gates and the required-test-commands floor", () => {
    assert.match(section, /floor/i, "must run the required-test-commands floor");
    assert.match(
      section,
      /gate/i,
      "must run the guardrails convention's gates",
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

describe("code-writer-tdd guidelines", () => {
  test("self-containment guideline names the task block plus Required test commands", () => {
    assert.match(
      agent,
      /The task block plus the Required test commands section of `code-plan\.md` are your inputs/,
      "self-containment guideline must name the task block plus Required test commands section",
    );
  });
});

describe("code-writer-tdd removed vocabulary", () => {
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
