import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the assisted phase-3 reference, resolved relative to this test file. */
const REF_PATH = fileURLToPath(
  new URL(
    "../../skills/radical-pipelines/reference/assisted-phases/3 - plan.md",
    import.meta.url,
  ),
);

const ref = readFileSync(REF_PATH, "utf8");

/** The fenced code-plan.md skeleton (the one carrying the Tasks structure). */
const planSkeleton =
  [...ref.matchAll(/```markdown\n([\s\S]*?)\n```/g)]
    .map((m) => m[1])
    .find((block) => block.includes("# Code Plan:")) ?? "";

describe("assisted phase-3 code-plan skeleton", () => {
  test("declares the four top-level sections in autonomous order", () => {
    const order = [
      "## Overview",
      "## Required test commands",
      "## E2E test plan",
      "## Tasks",
    ];
    let cursor = -1;
    for (const heading of order) {
      const at = planSkeleton.indexOf(heading);
      assert.notEqual(at, -1, `skeleton is missing "${heading}"`);
      assert.ok(at > cursor, `"${heading}" is out of order in the skeleton`);
      cursor = at;
    }
  });

  test("Required test commands carries the Name | Command | Covers table", () => {
    assert.match(
      planSkeleton,
      /Name\s*\|\s*Command\s*\|\s*Covers/,
      "Required test commands is missing the Name | Command | Covers table",
    );
  });

  test("E2E test plan carries Flow blocks with Steps / Expected / Traces to", () => {
    assert.match(
      planSkeleton,
      /### Flow N: /,
      "E2E test plan is missing ### Flow N blocks",
    );
    for (const field of ["**Steps:**", "**Expected:**", "**Traces to:**"]) {
      assert.ok(planSkeleton.includes(field), `Flow block is missing ${field}`);
    }
  });

  test("Type field sits between Goal and Files to change", () => {
    const goal = planSkeleton.indexOf("- **Goal:**");
    const type = planSkeleton.indexOf("- **Type:** tdd | e2e");
    const files = planSkeleton.indexOf("- **Files to change:**");
    assert.notEqual(type, -1, "skeleton is missing - **Type:** tdd | e2e");
    assert.ok(
      goal < type && type < files,
      "Type must sit between Goal and Files to change",
    );
  });
});

describe("assisted phase-3 inverted test-planning boundary", () => {
  test("drops the blanket no-test-planning prohibition", () => {
    assert.doesNotMatch(ref, /You MUST NOT plan tests in the code plan/);
    assert.doesNotMatch(ref, /No test planning/);
  });

  test("states the planner owns the required-test-commands floor and e2e flows", () => {
    assert.match(ref, /required[- ]test[- ]commands floor/i);
    assert.match(ref, /e2e flows/i);
  });

  test("attributes turning Acceptance into unit tests to the tdd writer in phase 4", () => {
    assert.match(ref, /tdd writer/);
  });
});

describe("assisted phase-3 step-4 self-check additions", () => {
  test("adds a Required-test-commands validation item", () => {
    assert.match(ref, /Required-test-commands validate/);
    assert.match(ref, /resolve and terminate/i);
  });

  test("adds an E2E coverage item", () => {
    assert.match(ref, /\*\*E2E coverage\*\*/);
  });
});
