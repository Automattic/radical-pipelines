import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PIPELINE, abs, git, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

// A block convention: `## <title>` with `### <name>` blocks, each [name, text item, agents].
const convention = (title, key, blocks) => `## ${title}\n\n${blocks.map(([name, text, agents]) => `### ${name}\n\n- ${key}: ${text}\n- agents: ${agents}\n`).join("\n")}`;
const conventions = ({ guardrails = [], resources = [] }) => `# Conventions\n\n${convention("Guardrails", "rule", guardrails)}\n${convention("Resources", "resource", resources)}`;
const blocks = (role, ...options) => JSON.parse(rp("blocks", abs(PIPELINE), "--role", role, "--json", ...options));
const names = (role) => { const out = blocks(role); return { guardrails: out.guardrails.map((block) => block.name), resources: out.resources.map((block) => block.name) }; };

describe("blocks", () => {
  useRepo();

  // Which roles receive a block, by the profiles its `agents` names.
  const agentsCases = [
    ["one profile", "implementer", ["implementer"]],
    ["several profiles", "implementer, reviewer", ["implementer", "reviewer-default", "reviewer-b"]],
    ["every profile, in backticks", "`spec-producer`, `design-doc-producer`, `implementer`, `reviewer`", ["spec-producer", "spec-producer-a", "design-doc-producer", "design-doc-producer-a", "implementer", "reviewer-default", "reviewer-b"]],
  ];
  const roles = ["spec-producer", "spec-producer-a", "design-doc-producer", "design-doc-producer-a", "implementer", "reviewer-default", "reviewer-b"];
  for (const [what, agents, receivers] of agentsCases)
    for (const role of roles)
      it(`gives a block naming ${what} ${receivers.includes(role) ? "to" : "not to"} ${role}`, () => {
        writeFile(".rp.md", conventions({ guardrails: [["g", "Run it.", agents]], resources: [["r", "Use it.", agents]] }));
        const expected = receivers.includes(role) ? ["g"] : [];
        assert.deepEqual(names(role), { guardrails: expected, resources: expected.map(() => "r") });
      });

  it("keeps the blocks' order and text, continuation lines included, without the agents item", () => {
    writeFile(".rp.md", "## Guardrails\n\n### b\n\n-   rule: First.\n    - A detail.\n\n    - Another.\n\n-   agents: implementer\n\n### a\n\n- agents: implementer\n- rule: Second.\n");
    assert.deepEqual(blocks("implementer").guardrails, [
      { name: "b", text: "-   rule: First.\n    - A detail.\n\n    - Another." },
      { name: "a", text: "- rule: Second." },
    ]);
  });

  it("replaces every {agent} with the agent's name, <pipeline slug>-<role>", () => {
    writeFile(".rp.md", "## Resources\n\n### site\n\n- resource: Run `up --agent {agent}`.\n    - Then `down --agent {agent}`.\n- agents: reviewer, implementer\n");
    assert.deepEqual(blocks("reviewer-default").resources, [{ name: "site", text: "- resource: Run `up --agent demo-reviewer-default`.\n    - Then `down --agent demo-reviewer-default`." }]);
    assert.equal(blocks("implementer").agent, "demo-implementer");
  });

  it("prints none for a convention without a matching block, an absent convention, or no conventions file", () => {
    const none = "## Guardrails\n\nnone\n\n## Resources\n\nnone\n";
    assert.equal(rp("blocks", abs(PIPELINE), "--role", "implementer"), none);
    writeFile(".rp.md", conventions({ guardrails: [["g", "Run it.", "reviewer"]] }));
    assert.equal(rp("blocks", abs(PIPELINE), "--role", "implementer"), none);
  });

  it("prints each convention's blocks under its heading, ready for the assignment", () => {
    writeFile(".rp.md", conventions({ guardrails: [["g1", "One.", "implementer"], ["g2", "Two.", "implementer"]], resources: [["r", "Use it.", "reviewer"]] }));
    assert.equal(rp("blocks", abs(PIPELINE), "--role", "implementer"), "## Guardrails\n\n### g1\n\n- rule: One.\n\n### g2\n\n- rule: Two.\n\n## Resources\n\nnone\n");
  });

  it("reads a convention at any heading level, its blocks one level below", () => {
    writeFile(".rp.md", "## Shared conventions\n\n### Guardrails\n\n#### g\n\n- rule: Run it.\n- agents: implementer\n\n### Resources\n\n#### r\n\n- resource: Use it.\n- agents: implementer\n");
    assert.deepEqual(names("implementer"), { guardrails: ["g"], resources: ["r"] });
  });

  it("lets .rp.local.md replace a block of the same name and add others, in the main checkout", () => {
    writeFile(".git/info/exclude", ".rp.local.md\n.wt/\n");
    writeFile(".rp.md", conventions({ guardrails: [["a", "Committed a.", "implementer"], ["b", "Committed b.", "implementer"]] }));
    writeFile(".rp.local.md", conventions({ guardrails: [["a", "Local a.", "reviewer"], ["c", "Local c.", "implementer"]] }));
    git(root, "add", ".rp.md");
    git(root, "commit", "--quiet", "-m", "conventions");
    git(root, "worktree", "add", "--quiet", ".wt/demo", "-b", "wt");
    const out = JSON.parse(rp("blocks", `${root}/.wt/demo/${PIPELINE}`, "--role", "implementer", "--json"));
    assert.deepEqual(out.guardrails, [{ name: "b", text: "- rule: Committed b." }, { name: "c", text: "- rule: Local c." }]);
  });

  const malformed = [
    ["a block without agents", "## Guardrails\n\n### g\n\n- rule: Run it.\n", /\.rp\.md: Guardrails block g: needs exactly one - agents: item/],
    ["a block without its text item", "## Resources\n\n### r\n\n- agents: implementer\n", /Resources block r: needs exactly one - resource: item/],
    ["a guardrail written as a resource", "## Guardrails\n\n### g\n\n- resource: Use it.\n- agents: implementer\n", /Guardrails block g: unexpected item - resource:/],
    ["an empty text item", "## Guardrails\n\n### g\n\n- rule:\n- agents: implementer\n", /Guardrails block g: - rule: is empty/],
    ["an unknown profile", "## Guardrails\n\n### g\n\n- rule: Run it.\n- agents: implementer, build-worker\n", /agents must name profiles among .*: build-worker/],
    ["empty agents", "## Guardrails\n\n### g\n\n- rule: Run it.\n- agents:\n", /agents must name profiles among .*: \(empty\)/],
    ["agents over two lines", "## Guardrails\n\n### g\n\n- rule: Run it.\n- agents: implementer\n  reviewer\n", /- agents: is one line/],
    ["a line outside an item", "## Guardrails\n\n### g\n\nRun it.\n- agents: implementer\n", /Guardrails block g: expected - rule: or - agents:, got: Run it\./],
    ["two blocks with one name", "## Guardrails\n\n### g\n\n- rule: A.\n- agents: implementer\n\n### g\n\n- rule: B.\n- agents: implementer\n", /Guardrails block g: a second block with this name/],
    ["a heading inside a block", "## Guardrails\n\n### g\n\n- rule: A.\n- agents: implementer\n\n#### detail\n", /Guardrails block detail: a block heading is one level below Guardrails/],
    ["two Guardrails headings", "## Guardrails\n\n### g\n\n- rule: A.\n- agents: implementer\n\n## Tools\n\n### Guardrails\n", /\.rp\.md: more than one Guardrails heading/],
  ];
  for (const [what, text, message] of malformed)
    it(`stops on ${what}`, () => {
      writeFile(".rp.md", text);
      const out = run("blocks", abs(PIPELINE), "--role", "implementer");
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
      assert.equal(out.stdout, "");
    });

  it("stops on a malformed .rp.local.md even when .rp.md is well formed", () => {
    writeFile(".rp.md", conventions({ guardrails: [["g", "Run it.", "implementer"]] }));
    writeFile(".rp.local.md", "## Resources\n\n### r\n\n- resource: Use it.\n");
    const out = run("blocks", abs(PIPELINE), "--role", "implementer");
    assert.equal(out.status, 1);
    assert.match(out.stderr, /\.rp\.local\.md: Resources block r: needs exactly one - agents: item/);
  });

  it("ignores a heading inside fenced code", () => {
    writeFile(".rp.md", "## Notes\n\n```md\n## Guardrails\n```\n\n## Guardrails\n\n### g\n\n- rule: Run it.\n- agents: implementer\n");
    assert.deepEqual(names("implementer").guardrails, ["g"]);
  });

  const badRoles = [["no role", [], /--role <role> is required/], ["owner", ["--role", "owner"], /other than owner/], ["a reviewer without lane", ["--role", "reviewer"], /must be a role/], ["an unknown profile", ["--role", "worker"], /must be a role/]];
  for (const [what, args, message] of badRoles)
    it(`stops on ${what}`, () => {
      const out = run("blocks", abs(PIPELINE), ...args);
      assert.equal(out.status, 1);
      assert.match(out.stderr, message);
    });
});
