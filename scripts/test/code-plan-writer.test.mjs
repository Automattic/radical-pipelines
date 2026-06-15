import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the code-plan-writer agent, resolved relative to this test file. */
const AGENT_PATH = fileURLToPath(
  new URL("../../agents/code-plan-writer.md", import.meta.url),
);

const agent = readFileSync(AGENT_PATH, "utf8");

/** The fenced plan-structure template the agent embeds for code-plan.md. */
const planTemplate = agent.match(/```markdown\n([\s\S]*?)\n```/)?.[1] ?? "";

describe("code-plan-writer plan template", () => {
  test("declares the four top-level sections in order", () => {
    const order = ["## Overview", "## Required test commands", "## E2E test plan", "## Tasks"];
    let cursor = -1;
    for (const heading of order) {
      const at = planTemplate.indexOf(heading);
      assert.notEqual(at, -1, `template is missing "${heading}"`);
      assert.ok(
        at > cursor,
        `"${heading}" is out of order in the plan template`,
      );
      cursor = at;
    }
  });

  test("Required test commands carries the floor comment and Name | Command | Covers table", () => {
    assert.match(
      planTemplate,
      /A floor, not the full set\. "None" is valid\./,
      "Required test commands is missing the floor / None-is-valid comment",
    );
    assert.match(
      planTemplate,
      /Name\s*\|\s*Command\s*\|\s*Covers/,
      "Required test commands is missing the Name | Command | Covers table",
    );
    assert.doesNotMatch(
      planTemplate,
      /Name\s*\|\s*Command\s*\|\s*Covers\s*\|\s*Agents/,
      "Required test commands must not add an Agents column",
    );
  });

  test("E2E test plan carries the acceptance-flow comment and Flow blocks", () => {
    assert.match(
      planTemplate,
      /acceptance criteria and edge cases as explicit end-to-end flows/,
      "E2E test plan is missing its descriptive comment",
    );
    assert.match(
      planTemplate,
      /### Flow N: /,
      "E2E test plan is missing ### Flow N blocks",
    );
    for (const field of ["**Steps:**", "**Expected:**", "**Traces to:**"]) {
      assert.ok(
        planTemplate.includes(field),
        `Flow block is missing ${field}`,
      );
    }
  });
});

describe("code-plan-writer task-block template", () => {
  test("Type field sits between Goal and Files to change", () => {
    const goal = planTemplate.indexOf("- **Goal:**");
    const type = planTemplate.indexOf("- **Type:** tdd | e2e");
    const files = planTemplate.indexOf("- **Files to change:**");
    assert.notEqual(type, -1, "task-block template is missing - **Type:** tdd | e2e");
    assert.ok(goal < type && type < files, "Type must sit between Goal and Files to change");
  });
});

describe("code-plan-writer guidelines", () => {
  test("removes the inverted prohibition phrasing", () => {
    assert.doesNotMatch(agent, /Do NOT plan tests/);
    assert.doesNotMatch(agent, /derived from browser verification/);
  });

  test("attributes turning Acceptance into unit tests to code-writer-tdd's RED phase", () => {
    assert.match(agent, /code-writer-tdd/);
    assert.match(agent, /RED phase/);
  });
});
