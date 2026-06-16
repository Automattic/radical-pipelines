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
      "## Plan-completed guardrails",
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

  test("Plan-completed guardrails carries the floor-free bare-None comment and Gate | Command | Rationale table", () => {
    assert.doesNotMatch(
      planSkeleton,
      /floor/i,
      "Plan-completed guardrails comment must be floor-free",
    );
    assert.match(
      planSkeleton,
      /"None" when no gate is marked\./,
      "Plan-completed guardrails is missing the bare-None rule",
    );
    assert.match(
      planSkeleton,
      /Gate\s*\|\s*Command\s*\|\s*Rationale/,
      "Plan-completed guardrails is missing the Gate | Command | Rationale table",
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

  test("states the planner authors a feature command per marked gate and owns the e2e flows", () => {
    assert.doesNotMatch(ref, /floor/i);
    assert.doesNotMatch(ref, /required[- ]test[- ]commands/i);
    assert.doesNotMatch(ref, /Guardrails to complete:/);
    assert.match(ref, /for each gate you marked plan-completed in `\.rp\.md`, author a feature-scoped command/i);
    assert.match(ref, /e2e flows/i);
  });

  test("attributes turning Acceptance into unit tests to code-writer-tdd in phase 4", () => {
    assert.match(ref, /code-writer-tdd/);
  });
});

describe("assisted phase-3 step-4 self-check additions", () => {
  test("adds a Plan-completed-guardrails validation-plus-bind item", () => {
    assert.match(ref, /\*\*Plan-completed guardrails validate\*\*/);
    assert.match(ref, /resolve and terminate/i);
    const item = ref.slice(ref.indexOf("**Plan-completed guardrails validate**"));
    assert.match(
      item.slice(0, item.indexOf("\n- ")),
      /exactly the gates you marked plan-completed/i,
      "the self-check item must include the bind to the marked gates",
    );
  });

  test("adds an E2E coverage item", () => {
    assert.match(ref, /\*\*E2E coverage\*\*/);
  });
});
