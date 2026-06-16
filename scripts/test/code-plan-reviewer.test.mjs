import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

/** Absolute path to the code-plan-reviewer agent, resolved relative to this test file. */
const AGENT_PATH = fileURLToPath(
  new URL("../../agents/code-plan-reviewer.md", import.meta.url),
);

const agent = readFileSync(AGENT_PATH, "utf8");

/** Extract the body of a `### N. <title>` workflow step up to the next `### ` heading or EOF. */
function step(heading) {
  const start = agent.indexOf(heading);
  if (start === -1) return "";
  const after = agent.indexOf("\n### ", start + heading.length);
  return agent.slice(start, after === -1 ? undefined : after);
}

describe("code-plan-reviewer execution step", () => {
  const exec = step("### 2.");

  test("an execution step is inserted as step 2 and the review step moves to step 3", () => {
    assert.match(agent, /### 2\. /, "missing a step 2");
    assert.match(
      agent,
      /### 3\. Review the plan/,
      'the "Review the plan" step must move to step 3',
    );
    const step2 = agent.indexOf("### 2. ");
    const step3 = agent.indexOf("### 3. Review the plan");
    assert.ok(step2 < step3, "step 2 must precede the review step");
  });

  test("step 2 instructs executing each command in Plan-completed guardrails exactly as written", () => {
    assert.match(exec, /Plan-completed guardrails/);
    assert.match(exec, /exactly as written/);
  });

  test("step 2 asks only whether the runner resolves and terminates", () => {
    assert.match(exec, /resolve[ds]? and terminate[ds]?/i);
  });

  test("step 2 treats zero/missing tests at plan time as legitimate, not a rejection", () => {
    assert.match(exec, /not implemented yet|is not implemented yet/i);
    assert.match(exec, /zero or missing tests/i);
    assert.match(exec, /NOT a rejection/);
  });

  test("step 2 rejects an unrunnable command", () => {
    assert.match(exec, /cannot run/i);
    assert.match(exec, /IS a rejection/);
  });

  test("step 2 states validation is per-command and independent", () => {
    assert.match(exec, /per-command and independent/i);
  });

  test("step 2 carries the judge-before-running-destructive caveat", () => {
    assert.match(exec, /writes,? deploys,? or destroys|writes\/deploys\/destroys/i);
    assert.match(exec, /judge before running/i);
  });

  test("step 2 does not reference setup.md", () => {
    assert.doesNotMatch(exec, /setup\.md/);
  });
});

describe("code-plan-reviewer review checklist", () => {
  test("contains a plan-completed-guardrails-coverage item", () => {
    assert.match(agent, /\*\*Plan-completed-guardrails coverage\*\*/);
  });

  test("contains a plan-completed-guardrails-bind item", () => {
    assert.match(agent, /\*\*Plan-completed-guardrails bind\*\*/);
    const bind = agent.slice(
      agent.indexOf("**Plan-completed-guardrails bind**"),
    );
    assert.match(
      bind.slice(0, bind.indexOf("\n- ")),
      /Guardrails to complete:/,
      "bind check must require each row's Gate to match a gate in Guardrails to complete:",
    );
    assert.match(
      bind.slice(0, bind.indexOf("\n- ")),
      /exactly one row|every passed marked gate have exactly one row/i,
      "bind check must require every passed marked gate to have exactly one row",
    );
  });

  test("contains an e2e-coverage item", () => {
    assert.match(agent, /\*\*E2E coverage\*\*/);
  });
});

describe("code-plan-reviewer scoped unit-test check", () => {
  test("the old broad 'No test planning' check is reworked to a scoped unit-test check", () => {
    assert.doesNotMatch(agent, /\*\*No test planning\*\*/);
    assert.match(agent, /\*\*No unit-test planning\*\*/);
  });

  test("the scoped check flags only prescribing specific unit tests", () => {
    const check = agent.slice(agent.indexOf("**No unit-test planning**"));
    assert.match(check, /\bunit\b/);
    assert.match(check, /prescrib/i);
  });

  test("the scoped check does not treat the planner-owned guardrails section or e2e plan as a violation", () => {
    const check = agent.slice(
      agent.indexOf("**No unit-test planning**"),
      agent.indexOf("**No documentation planning**"),
    );
    assert.match(check, /Plan-completed guardrails/);
    assert.match(check, /e2e test plan/i);
    assert.match(check, /not a violation/i);
  });

  test("removes the 'derived from browser verification' phrase", () => {
    assert.doesNotMatch(agent, /derived from browser verification/);
  });
});
