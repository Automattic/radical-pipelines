import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, RP, SPEC, TO_OWNER, TO_SPEC,
  abs, commitAll, commitIn, conventions, git, ignore, land, landRole, lane, laneWorktree, later, pipeline, read, remove, revise, root, thread, useRepo, wakeOf, withFrontmatter, write, writeFile,
} from "./fixture.mjs";

// The pipeline worktree's run-config.local.json, holding `data`.
const local = (data) => write("run-config.local.json", `${JSON.stringify(data, null, 2)}\n`);

// A copy of `rp` in a skill folder of its own, beside `templates` by name. The tests own these templates, so they
// assert the values `rp` fills, never the delivered templates' wording.
const skills = [];
function skillWith(templates, name = null) {
  const temporary = mkdtempSync(join(tmpdir(), "rp-skill-")), folder = name ? join(temporary, name) : temporary;
  skills.push(temporary);
  if (name) mkdirSync(folder);
  mkdirSync(join(folder, "scripts"));
  copyFileSync(RP, join(folder, "scripts/rp.mjs"));
  mkdirSync(join(folder, "templates"));
  for (const [name, text] of Object.entries(templates)) writeFileSync(join(folder, `templates/${name}.md`), text);
  return join(folder, "scripts/rp.mjs");
}
// A template naming itself under `## template`, then each flag that holds as a `## <flag>` heading, and each value
// alone under its own `## <name>` heading.
const COMMON = ["pipeline-slug", "role", "profile", "lane", "worktree", "branch", "base", "turn-commit", "rp", "base-branch", "subagent-model", "brief",
  "pipeline-folder", "pipeline-folder-arg", "intent", "spec", "design-doc", "later-inputs", "malformed-files", "guardrails", "resources", "commit-format", "vocabulary"];
const PRODUCER = [...COMMON, "mode", "supporting-folder", "changed-inputs", "lane-candidates", "threads", "write-to"];
const FLAGS = ["produce", "respond", "consolidate", "implement"];
const echo = (name, values, flags = []) => `${["## template", name, ...flags.flatMap((flag) => [`{{#${flag}}}`, `## ${flag}`, `{{/${flag}}}`]),
  ...values.flatMap((value) => [`## ${value}`, `{{${value}}}`])].join("\n")}\n`;
let ECHO;
before(() => {
  ECHO = skillWith({
    ...Object.fromEntries(["spec-producer", "design-doc-producer", "implementer"].map((name) => [name, echo(name, PRODUCER, FLAGS)])),
    "reviewer-first": echo("reviewer-first", [...COMMON, "review-base"]),
    "reviewer-later": echo("reviewer-later", [...COMMON, "review-base", "thread", "thread-arg", "diff"]),
    "reviewer-repair": echo("reviewer-repair", [...COMMON, "review-base"]),
  });
});
after(() => { for (const folder of skills) rmSync(folder, { recursive: true, force: true }); });

// Runs a copy of `rp` from outside the repository.
const runWith = (script, args, env = process.env) => spawnSync(process.execPath, [script, ...args], { cwd: tmpdir(), encoding: "utf8", env });
// An echoed text's sections by `## ` heading, each its lines without the blank ones at its edges.
function sections(text) {
  const result = {};
  let heading = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) { heading = line.slice(3); result[heading] = []; continue; }
    result[heading]?.push(line);
  }
  for (const lines of Object.values(result)) {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
  }
  return result;
}
// Applies the step's plan and reads a role it wakes: its assignment's path, contents, and echoed values, and its model
// in the plan, or null.
function assign(role, at = abs(PIPELINE), script = ECHO) {
  const out = runWith(script, ["next", at, "--apply"]);
  assert.equal(out.status, 0, out.stderr);
  const fields = wakeOf(out.stdout.trimEnd().split("\n"), role);
  assert.ok(fields.assignment, `the plan wakes no ${role}:\n${out.stdout}`);
  const text = readFileSync(fields.assignment, "utf8");
  return { path: fields.assignment, text, values: sections(text), model: fields.model ?? null };
}
// The flags that hold in an echoed text.
const flagsOf = (values) => FLAGS.filter((flag) => flag in values);

const head = (at = root) => git(at, "rev-parse", "HEAD").trim();
const in_ = (at, rel) => join(at, PIPELINE, rel);

describe("assignments", () => {
  useRepo();

  describe("of a producer or the implementer, for the turn the frontier gives it", () => {
    it("produce: its template, the mode, the root's later inputs, and the pipeline worktree's seat and tip", () => {
      pipeline(1);
      write("0-intent/constraint-1.md", later(DESIGN));
      write("0-intent/proposal-2.md", later(DESIGN));
      write("0-intent/failure-3.md", later(NOTES));
      const tip = commitAll("later inputs");
      const { path, values, model } = assign("design-doc-producer");
      const at = realpathSync(root);
      assert.equal(path, git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/design-doc-producer.md").trim());
      assert.deepEqual([values.template, values.mode, flagsOf(values)], [["design-doc-producer"], ["Produce"], ["produce"]]);
      assert.deepEqual([values.worktree, values.branch, values["turn-commit"], values.lane], [[at], ["demo"], [tip], []]);
      assert.deepEqual(values["supporting-folder"], [`${in_(at, "2-design-doc/design-doc")}/`]);
      assert.deepEqual([values.intent, values.spec], [[in_(at, INTENT)], [in_(at, SPEC)]]);
      assert.deepEqual(values["later-inputs"], [in_(at, "0-intent/constraint-1.md"), in_(at, "0-intent/proposal-2.md")]);
      assert.deepEqual([values.threads, values["changed-inputs"], values["malformed-files"]], [["none"], ["none"], ["none"]]);
      assert.deepEqual(values["write-to"], [in_(at, DESIGN)]);
      assert.equal(model, null);
    });

    it("implement, then respond: each turn replaces the last, with the threads awaiting the role and its changed inputs", () => {
      pipeline(2);
      write("0-intent/constraint-1.md", later(NOTES));
      commitAll("constraint");
      const first = assign("implementer").values;
      assert.deepEqual([first.template, first.mode, flagsOf(first)], [["implementer"], ["Implement"], ["implement"]]);
      write(NOTES, withFrontmatter({ status: "done" }, "\n# Notes\n"));
      land(NOTES);
      const notesChanged = git(root, "log", "-1", "--format=%H", "--", P(NOTES)).trim();
      revise(DESIGN);
      const awaiting = thread({ n: 1, ...REVIEW("default"), messages: [["reviewer-default", "abc1234"]] });
      const tip = commitAll("work");
      const { path, text, values } = assign("implementer");
      const at = realpathSync(root);
      assert.equal(readFileSync(path, "utf8"), text);
      assert.deepEqual([values.mode, flagsOf(values), values["turn-commit"], values["base-branch"]], [["Respond"], ["respond"], [tip], ["main"]]);
      assert.deepEqual(values.base, [git(root, "merge-base", "main", tip).trim()]);
      assert.deepEqual(values["later-inputs"], [in_(at, "0-intent/constraint-1.md")]);
      assert.deepEqual(values["changed-inputs"], [`${in_(at, DESIGN)} — changed since ${notesChanged}`]);
      assert.deepEqual(values.threads, [in_(at, awaiting)]);
    });

    it("respond: each changed input since the commit at which it is as its artifact's certification pins it, after a landing that left the artifact unchanged too", () => {
      pipeline(2);
      const version = (n) => `# Spec\n\nRequirement.\n\nVersion ${n}.\n`;
      write(SPEC, version(2));
      land(SPEC);
      commitAll("spec v2");
      assign("design-doc-producer");
      landRole("design-doc-producer");
      write(SPEC, version(3));
      write("0-intent/proposal-1.md", later(DESIGN));
      land(SPEC);
      const tip = commitAll("spec v3, a proposal");
      const changed = assign("design-doc-producer").values["changed-inputs"].map((line) => line.match(/^(.+) — changed since ([0-9a-f]{40})$/).slice(1));
      const at = realpathSync(root);
      assert.deepEqual(changed.map(([path]) => path), [in_(at, SPEC), in_(at, "0-intent/proposal-1.md")]);
      const [[, spec], [, proposal]] = changed;
      assert.equal(git(root, "show", `${spec}:${P(SPEC)}`), version(2));
      assert.match(git(root, "diff", spec, tip, "--", P(SPEC)), /^-Version 2\.\n\+Version 3\.$/m);
      assert.equal(git(root, "diff", "--numstat", spec, tip, "--", P(SPEC)).trim(), `1\t1\t${P(SPEC)}`);
      assert.throws(() => git(root, "cat-file", "-e", `${proposal}:${P("0-intent/proposal-1.md")}`));
      assert.equal(git(root, "cat-file", "-e", `${proposal}~0`), "");
    });

    it("respond without changed inputs: the thread alone", () => {
      pipeline(3);
      const awaiting = thread(TO_SPEC);
      commitAll("thread");
      const { values } = assign("spec-producer");
      assert.deepEqual([values.mode, values["changed-inputs"], values.threads], [["Respond"], ["none"], [in_(realpathSync(root), awaiting)]]);
    });

    it("a production lane: its brief, its worktree's seat and tip, its candidate, and its changed inputs, in produce and respond", () => {
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: "Read for what it demands.\n\nEvery outcome." }, { profile: "spec-producer", id: "b" }] });
      write("0-intent/constraint-1.md", later(SPEC));
      const tip = commitAll("constraint");
      const { path, values } = assign("spec-producer-a");
      const wt = laneWorktree("demo-spec-a");
      assert.equal(path, git(wt, "rev-parse", "--path-format=absolute", "--git-path", "rp/spec-producer.md").trim());
      assert.deepEqual([values.worktree, values.branch, values["turn-commit"], values.lane, values.role], [[wt], ["demo-spec-a"], [tip], ["a"], ["spec-producer-a"]]);
      assert.deepEqual(values["supporting-folder"], [`${in_(wt, "1-spec/lanes/a/spec")}/`]);
      assert.deepEqual(values.brief, ["Read for what it demands.", "", "Every outcome."]);
      assert.deepEqual([values.mode, values.intent, values["write-to"]], [["Produce"], [in_(wt, INTENT)], [in_(wt, "1-spec/lanes/a/spec.md")]]);
      commitIn(wt, { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "candidate");
      landRole("spec-producer-a");
      const landed = head();
      write(INTENT, `${read(INTENT)}More.\n`);
      commitAll("intent changes");
      const respond = assign("spec-producer-a").values;
      assert.deepEqual([respond.mode, respond["changed-inputs"]], [["Respond"], [`${in_(wt, INTENT)} — changed since ${landed}`]]);
      assert.deepEqual(assign("spec-producer-b").values.brief, []);
    });

    it("consolidate: every lane's candidate in the pipeline worktree, and the root to write", () => {
      pipeline(1, { lanes: [{ profile: "design-doc-producer", id: "x" }, { profile: "design-doc-producer", id: "y" }] });
      for (const id of ["x", "y"]) {
        write(`2-design-doc/lanes/${id}/design-doc.md`, `# ${id}\n`);
        land(`2-design-doc/lanes/${id}/design-doc.md`);
      }
      const { values } = assign("design-doc-producer"), at = realpathSync(root);
      assert.deepEqual([values.mode, flagsOf(values)], [["Consolidate"], ["consolidate"]]);
      assert.deepEqual(values["lane-candidates"], [`x — ${in_(at, "2-design-doc/lanes/x/design-doc.md")}`, `y — ${in_(at, "2-design-doc/lanes/y/design-doc.md")}`]);
      assert.deepEqual(values["write-to"], [in_(at, DESIGN)]);
    });

    const refusals = [
      ["a detached pipeline worktree", () => { pipeline(1); git(root, "checkout", "--quiet", "--detach"); }, /has no branch checked out/],
      ["a base that does not resolve", () => pipeline(1, { targetPhase: 3, base: "gone" }), /base does not resolve to a commit: gone/],
    ];
    for (const [what, setup, message] of refusals)
      it(`stops on ${what}, writing no assignment`, () => {
        setup();
        const out = runWith(ECHO, ["next", abs(PIPELINE), "--apply"]);
        assert.equal(out.status, 1, out.stdout);
        assert.match(out.stderr, message);
        assert.equal(existsSync(join(root, ".git/rp")), false);
      });
  });

  describe("of a review lane", () => {
    // A pipeline whose implementation is done, with a code change, a later input, and two review lanes, one with a brief.
    function reviewable() {
      pipeline(3, { lanes: [{ profile: "reviewer", id: "a", brief: "Look for security holes." }, { profile: "reviewer", id: "b" }] });
      writeFile("src/app.js", "export const a = 2;\n");
      write("0-intent/proposal-1.md", later(SPEC));
      write("0-intent/constraint-2.md", later(NOTES));
      land(SPEC);
      land(NOTES);
      commitAll("code and later inputs, landed");
    }
    const changeOf = (id) => git(root, "rev-parse", `demo-review-${id}`).trim();

    it("first turn: the branch, the review base and change built from the tip, every later input, the brief or none, and no thread", () => {
      reviewable();
      thread({ n: 4, status: "withdrawn", ...REVIEW("a"), messages: [["reviewer-a", "abc1234"]] });
      commitAll("an earlier review, withdrawn");
      const { path, values, model } = assign("reviewer-a");
      const wt = laneWorktree("demo-review-a"), change = changeOf("a");
      assert.equal(path, git(wt, "rev-parse", "--path-format=absolute", "--git-path", "rp/reviewer.md").trim());
      assert.deepEqual([values.template, values.branch, values["review-base"], values["turn-commit"]], [["reviewer-first"], ["demo-review-a"], [git(root, "rev-parse", `${change}^`).trim()], [change]]);
      assert.deepEqual([values.intent, values["later-inputs"]], [[in_(wt, INTENT)], [in_(wt, "0-intent/constraint-2.md"), in_(wt, "0-intent/proposal-1.md")]]);
      assert.deepEqual([values.brief, model], [["Look for security holes."], null]);
      assert.equal(existsSync(join(dirname(path), "reviewer.diff")), false);
      assert.deepEqual(assign("reviewer-b").values.brief, []);
      const out = runWith(skillWith({ "reviewer-first": "{{thread}}\n" }), ["next", abs(PIPELINE), "--apply"]);
      assert.equal(out.status, 1);
      assert.match(out.stderr, /templates\/reviewer-first\.md:1: \{\{thread\}\} has no value/);
    });

    it("later turn: the lane's open review thread awaiting it, and the diff from the change its last message names to this turn's change", () => {
      reviewable();
      assign("reviewer-a");
      const wt = laneWorktree("demo-review-a"), first = changeOf("a");
      const reviewThread = "threads/2-reviewer-a-implementer-implementation.md";
      commitIn(wt, { [reviewThread]: withFrontmatter({ status: "open", ...REVIEW("a") }, `\n## reviewer-a — ${first}\n\nFindings.\n`) }, "review");
      landRole("reviewer-a");
      write(reviewThread, `${read(reviewThread)}\n## implementer — ${head()}\n\nAnswered.\n`);
      writeFile("src/app.js", "export const a = 3;\n");
      write("1-spec/spec/evidence.txt", "pipeline-only\n");
      commitAll("answer");
      const { path, values } = assign("reviewer-a");
      const second = changeOf("a"), diff = join(dirname(path), "reviewer.diff");
      assert.notEqual(second, first);
      assert.deepEqual([values.template, values.thread, values.diff, values["turn-commit"]], [["reviewer-later"], [in_(wt, reviewThread)], [diff], [second]]);
      assert.equal(readFileSync(diff, "utf8"), git(root, "diff", first, second, "--", ".", ":(exclude).pipelines"));
      assert.match(readFileSync(diff, "utf8"), /export const a = 3/);
      thread({ n: 2, status: "approved", ...REVIEW("a"), messages: [["reviewer-a", first], ["implementer", head()], ["reviewer-a", second]] });
      thread({ n: 3, ...REVIEW("a"), messages: [["reviewer-a", second], ["implementer", head()]] });
      commitAll("approved, then a new review thread answered");
      assert.deepEqual(assign("reviewer-a").values.thread, [in_(wt, "threads/3-reviewer-a-implementer-implementation.md")]);
    });
  });

  it("lists as malformed files the INVALID lines of the files each role writes, wakes only those roles, and gives a reviewer the repair request", () => {
    pipeline(3);
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    const rejected = thread({ n: 2, ...REVIEW("default"), status: "pending" });
    const toOwner = thread({ n: 3, ...TO_OWNER, status: "pending" });
    const tip = commitAll("malformed files");
    const STATUS = "status must be one of open | approved | withdrawn | answered | disagreement";
    const implementer = assign("implementer").values;
    assert.deepEqual(implementer["malformed-files"], [`INVALID ${NOTES}: unexpected frontmatter key: owner`, `INVALID ${rejected}: ${STATUS}`]);
    assert.deepEqual([implementer.mode, implementer.threads, implementer["changed-inputs"]], [["Respond"], ["none"], ["none"]]);
    assert.deepEqual(assign("spec-producer").values["malformed-files"], [`INVALID ${toOwner}: ${STATUS}`]);
    const wt = laneWorktree("demo-review-default"), change = git(root, "rev-parse", "demo-review-default").trim();
    const { path, values: request } = assign("reviewer-default");
    assert.deepEqual([request.template, request["malformed-files"]], [["reviewer-repair"], [`INVALID ${rejected}: ${STATUS}`]]);
    assert.deepEqual([request["turn-commit"], request["pipeline-folder"]], [[change], [in_(wt, "")]]);
    assert.notEqual(change, tip);
    assert.equal(existsSync(join(dirname(path), "reviewer.diff")), false);
    const out = runWith(ECHO, ["next", abs(PIPELINE)]);
    assert.equal(wakeOf(out.stdout.split("\n"), "design-doc-producer").assignment, undefined);
  });

  describe("carries the run's conventions", () => {
    const GUARDRAILS = { tests: { rule: "Run the tests.", profiles: ["implementer", "reviewer"] }, docs: { rule: "Follow the glossary.\n\n- Every term.", profiles: ["implementer"] } };
    const RESOURCES = { suite: { resource: "The suite.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } };
    const BOTH_GUARDRAILS = ["### tests", "", "- rule: Run the tests.", "", "### docs", "", "- rule: Follow the glossary.", "", "  - Every term."];

    it("each guardrail and resource whose profiles include the role's, under its name with its text, the same in every lane, or none", () => {
      conventions({ guardrails: GUARDRAILS, resources: RESOURCES, "commit-format": "Imperative.\n\n- `Add spec (spec-producer)`" });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] });
      const lane = assign("spec-producer-a").values;
      assert.deepEqual([lane.guardrails, lane.resources], [["none"], ["### suite", "", "- resource: The suite."]]);
      assert.deepEqual(lane["commit-format"], ["Imperative.", "", "- `Add spec (spec-producer)`"]);
      pipeline(2);
      const implementer = assign("implementer").values;
      assert.deepEqual([implementer.guardrails, implementer.resources], [BOTH_GUARDRAILS, lane.resources]);
    });

    it("an imperative subject line as the commit format when the project sets none", () => {
      pipeline(2);
      assert.deepEqual(assign("implementer").values["commit-format"], ["An imperative subject line."]);
    });

    it("with each one run-config.local.json holds replacing the committed one or added by name, in assignments, lane worktrees, and landing commits, and run-config.json's alone without it", () => {
      const bothRules = ["### tests", "", "- rule: Run the tests.", "", "### docs", "", "- rule: Follow the glossary."];
      conventions({
        guardrails: { tests: { rule: "Run the tests.", profiles: ["spec-producer"] }, docs: { rule: "Follow the glossary.", profiles: ["spec-producer"] } },
        resources: { env: { resource: "Use {agent} at {host}.", profiles: ["spec-producer"] } },
        variables: { agent: "{pipeline-slug}-{role}", host: "{role}.example" },
        "commit-format": "Committed.", "landing-commit": "{subject} (committed)",
      });
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      ignore(".local-worktrees/");
      local({
        "worktree-folder-root": ".local-worktrees", "landing-commit": "{subject} (local)", "commit-format": "Local.",
        guardrails: { tests: { rule: "Run the local tests.", profiles: ["spec-producer"] } },
        resources: { browser: { resource: "A local browser.", profiles: ["spec-producer"] } },
        variables: { agent: "local-{role}" },
      });
      const values = assign("spec-producer-a").values, wt = join(realpathSync(root), ".local-worktrees/demo-spec-a");
      assert.deepEqual(values.worktree, [wt]);
      assert.deepEqual(values.guardrails, ["### tests", "", "- rule: Run the local tests.", ...bothRules.slice(3)]);
      assert.deepEqual(values.resources, ["### env", "", "- resource: Use local-spec-producer-a at spec-producer-a.example.", "", "### browser", "", "- resource: A local browser."]);
      assert.deepEqual(values["commit-format"], ["Local."]);
      commitIn(wt, { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "candidate");
      landRole("spec-producer-a");
      assert.deepEqual(git(root, "log", "--first-parent", "-2", "--format=%s").trim().split("\n"), ["Certify spec lane a candidate (local)", "Merge spec lane a (local)"]);
      remove("run-config.local.json");
      const consolidation = assign("spec-producer").values;
      assert.deepEqual([consolidation.guardrails, consolidation.resources, consolidation["commit-format"]],
        [bothRules, ["### env", "", "- resource: Use demo-spec-producer at spec-producer.example."], ["Committed."]]);
      write(SPEC, "# Spec\n");
      commitAll("Consolidate the spec");
      landRole("spec-producer");
      assert.equal(git(root, "log", "-1", "--format=%s").trim(), "Certify spec (committed)");
    });
  });

  describe("names models as the run writes them", () => {
    const AGENTS = {
      "spec-producer": { model: "opus", subagents: "sonnet", lanes: { a: { model: "sonnet" }, b: { subagents: "openai/gpt-6-astra#high" } } },
      reviewer: { model: "opus", lanes: { astra: { model: "astra", subagents: "luna" }, default: {} } },
    };

    it("a lane's model and subagent model, else its profile's, or none and no model line", () => {
      pipeline(0, { agents: AGENTS });
      const a = assign("spec-producer-a"), b = assign("spec-producer-b");
      assert.deepEqual([a.model, a.values["subagent-model"]], ["sonnet", ["sonnet"]]);
      assert.deepEqual([b.model, b.values["subagent-model"]], ["opus", ["openai/gpt-6-astra#high"]]);
      pipeline(2, { agents: AGENTS });
      const implementer = assign("implementer");
      assert.deepEqual([implementer.model, implementer.values["subagent-model"]], [null, []]);
      pipeline(3, { agents: AGENTS });
      for (const [id, model, subagents] of [["astra", "astra", ["luna"]], ["default", "opus", []]]) {
        const request = assign(`reviewer-${id}`);
        assert.deepEqual([request.model, request.values["subagent-model"]], [model, subagents]);
      }
    });

    it("the run's, and the same plan and assignment under every agentic tool, whatever .rp.md and its tool sections say", () => {
      writeFile(".rp.md", "---\nconventions: 7\n---\n\n## Shared conventions\n\n### Agents\n\n#### implementer\n\n- model: `sonnet`\n\n## opencode\n\n`sonnet` is `claude-agent/sonnet#xhigh`.\n");
      writeFile(".rp.opencode.md", "| `haiku` | `claude-agent/haiku#xhigh` |\n");
      writeFile(".rp.claude-code.md", "Use `sonnet` for `haiku`.\n");
      pipeline(2, { agents: { implementer: { model: "opus", subagents: "haiku" } } });
      const under = (extra) => {
        const out = runWith(ECHO, ["next", abs(PIPELINE), "--apply"], { ...process.env, OPENCODE: "1", CLAUDECODE: "", ...extra });
        assert.equal(out.status, 0, out.stderr);
        return [out.stdout, readFileSync(wakeOf(out.stdout.split("\n"), "implementer").assignment)];
      };
      under({});
      const [opencode, claudeCode] = [under({}), under({ OPENCODE: "", CLAUDECODE: "1" })];
      assert.equal(opencode[0], claudeCode[0]);
      assert.ok(opencode[1].equals(claudeCode[1]));
      assert.deepEqual(sections(opencode[1].toString())["subagent-model"], ["haiku"]);
      assert.match(opencode[0], /^wake implementer model opus$/m);
    });

    it("with each model and subagent model run-config.local.json pins replacing the committed one of its lane or profile, and the committed ones where it pins none", () => {
      const agents = { "spec-producer": { model: "opus", subagents: "sonnet", lanes: { a: { model: "sonnet" }, b: {}, c: { subagents: "luna" } } }, implementer: { model: "opus", subagents: "sonnet" } };
      const pins = { agents: { "spec-producer": { model: "pinned-opus", subagents: "pinned-sonnet", lanes: { b: { model: "pinned-b", subagents: "pinned-b-sub" } } } } };
      const models = (role) => { const { model, values } = assign(role); return [model, values["subagent-model"][0] ?? null]; };
      const lanes = () => ["a", "b", "c"].map((id) => models(`spec-producer-${id}`));
      local(pins);
      pipeline(0, { agents });
      assert.deepEqual(lanes(), [["sonnet", "pinned-sonnet"], ["pinned-b", "pinned-b-sub"], ["pinned-opus", "luna"]]);
      remove("run-config.local.json");
      assert.deepEqual(lanes(), [["sonnet", "sonnet"], ["opus", "sonnet"], ["opus", "luna"]]);
      local(pins);
      pipeline(2, { agents });
      assert.deepEqual(models("implementer"), ["opus", "sonnet"]);
      assert.equal(spawnSync("git", ["grep", "--quiet", "pinned", "HEAD"], { cwd: root }).status, 1);
    });
  });

  describe("expands placeholders in the texts they carry", () => {
    const FACTS = "{pipeline-slug} {role} {profile} [{lane}] {worktree} {branch} {base}";

    it("each vocabulary fact, the base as the Base of the role's turn commit, and each declared variable to the role's value, a lane's brief included, and lists no vocabulary", () => {
      conventions({
        variables: { agent: "{pipeline-slug}-{role}" },
        guardrails: { facts: { rule: FACTS, profiles: ["implementer", "reviewer", "spec-producer"] } },
        resources: { env: { resource: "The environment `{agent}`.", profiles: ["implementer", "reviewer", "spec-producer"] } },
        "commit-format": "End with ({role}).",
      });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: "Read {branch} for {agent}." }] });
      const spec = assign("spec-producer-a").values, lane = laneWorktree("demo-spec-a");
      assert.deepEqual(spec.brief, ["Read demo-spec-a for demo-spec-producer-a."]);
      const baseOf = (commit) => git(root, "merge-base", "main", commit).trim();
      git(root, "checkout", "--quiet", "main");
      writeFile("src/later.js", "export const later = 1;\n");
      commitAll("main moves past the pipeline's base");
      git(root, "checkout", "--quiet", "demo");
      assert.notEqual(baseOf(head(lane)), git(root, "rev-parse", "main").trim());
      assert.deepEqual(assign("spec-producer-a").values.guardrails.at(-1), `- rule: demo spec-producer-a spec-producer [a] ${lane} demo-spec-a ${baseOf(head(lane))}`);
      assert.deepEqual(spec.resources.at(-1), "- resource: The environment `demo-spec-producer-a`.");
      assert.deepEqual([spec["commit-format"], spec.vocabulary], [["End with (spec-producer-a)."], ["none"]]);
      pipeline(2, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const implementer = assign("implementer").values, at = realpathSync(root);
      assert.deepEqual(implementer.guardrails.at(-1), `- rule: demo implementer implementer [] ${at} demo ${baseOf(head())}`);
      assert.deepEqual([implementer.resources.at(-1), implementer.vocabulary], ["- resource: The environment `demo-implementer`.", ["none"]]);
      pipeline(3, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const request = assign("reviewer-astra").values, wt = laneWorktree("demo-review-astra");
      assert.deepEqual(request.guardrails.at(-1), `- rule: demo reviewer-astra reviewer [astra] ${wt} demo-review-astra ${baseOf(head(wt))}`);
      assert.deepEqual([request.resources.at(-1), request.vocabulary], ["- resource: The environment `demo-reviewer-astra`.", ["none"]]);
    });

    it("keeps a placeholder that names neither as written, and then lists each vocabulary fact with the role's value", () => {
      conventions({ resources: { ticket: { resource: "Open {ticket} for {role}.", profiles: ["implementer", "reviewer"] } } });
      pipeline(2);
      const values = assign("implementer").values, at = realpathSync(root);
      assert.deepEqual(values.resources.at(-1), "- resource: Open {ticket} for implementer.");
      assert.deepEqual(values.vocabulary, ["- `{pipeline-slug}`: demo", "- `{role}`: implementer", "- `{profile}`: implementer", "- `{lane}`:", `- \`{worktree}\`: ${at}`, "- `{branch}`: demo",
        `- \`{base}\`: ${git(root, "merge-base", "main", "HEAD").trim()}`]);
      pipeline(3);
      assert.ok(assign("reviewer-default").values.vocabulary.includes("- `{lane}`: default"));
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: "Explore {ticket}." }] });
      remove(SPEC);
      commitAll("a lane whose brief alone keeps a placeholder");
      const lane = assign("spec-producer-a").values;
      assert.deepEqual([lane.brief, lane.resources, lane.vocabulary[1]], [["Explore {ticket}."], ["none"], "- `{role}`: spec-producer-a"]);
    });

    it("leaves text outside the placeholder grammar as written, template syntax included, and lists no vocabulary", () => {
      const text = "{{agent}} {Agent} { role } {agent_name} {{#guardrails}} {{/guardrails}} {{^brief}} $1 {";
      conventions({ variables: { agent: "{role}" }, guardrails: { raw: { rule: `${text}\n{{commit-format}}`, profiles: ["implementer"] } }, "commit-format": "{{vocabulary}}" });
      pipeline(2);
      const values = assign("implementer").values;
      assert.deepEqual(values.guardrails, ["### raw", "", `- rule: ${text}`, "  {{commit-format}}"]);
      assert.deepEqual([values["commit-format"], values.vocabulary], [["{{vocabulary}}"], ["none"]]);
    });
  });

  describe("stop on a malformed run configuration, writing nothing", () => {
    // run-config.json in the pipeline worktree with `changes` over it, a key given as undefined removed.
    const configWith = (changes) => write("run-config.json", JSON.stringify({ ...JSON.parse(read("run-config.json")), ...changes }));
    const entry = (key, name, value) => configWith({ [key]: { [name]: value } });
    // [what, how run-config.json is broken, what the message names]: each stops rp check, rp next, and rp land.
    const committed = [
      ["an empty worktree folder root", () => configWith({ "worktree-folder-root": " " }), /run-config\.json: worktree-folder-root: must be a folder/],
      ["a landing commit template without {subject}", () => configWith({ "landing-commit": "(orchestrator)" }), /run-config\.json: landing-commit: must hold \{subject\}/],
      ["a landing commit template naming another placeholder", () => configWith({ "landing-commit": "{subject} ({role})" }), /run-config\.json: landing-commit: \{role\} names no part of a landing commit/],
      ["an empty commit format", () => configWith({ "commit-format": "" }), /run-config\.json: commit-format: must be a text/],
      ["a commit format given as a list of lines", () => configWith({ "commit-format": ["Imperative.", "", "- `Add spec`"] }), /run-config\.json: commit-format: must be a text/],
      ["a guardrail without its text", () => entry("guardrails", "tests", { profiles: ["implementer"] }), /run-config\.json: guardrails\.tests\.rule: must be a text/],
      ["a resource whose text holds no line", () => entry("resources", "suite", { resource: " \n ", profiles: ["implementer"] }), /run-config\.json: resources\.suite\.resource: must be a text/],
      ["a resource whose text is a list of lines", () => entry("resources", "test suite", { resource: ["a", "b"], profiles: ["implementer"] }), /run-config\.json: resources\."test suite"\.resource: must be a text/],
      ["a guardrail whose profiles name another", () => entry("guardrails", "tests", { rule: "Run.", profiles: ["implementer", "implementor"] }), /run-config\.json: guardrails\.tests\.profiles: "implementor" is no profile/],
      ["a guardrail without profiles", () => entry("guardrails", "tests", { rule: "Run." }), /run-config\.json: guardrails\.tests\.profiles: must be a non-empty list of profiles/],
      ["a resource with an empty profiles list", () => entry("resources", "suite", { resource: "The suite.", profiles: [] }), /run-config\.json: resources\.suite\.profiles: must be a non-empty list/],
      ["a guardrail with an unknown key", () => entry("guardrails", "tests", { rule: "Run.", profile: ["implementer"] }), /run-config\.json: guardrails\.tests: unexpected key: profile/],
      ["a lane model that is no name", () => configWith({ agents: { reviewer: { lanes: { astra: { model: "" } } } } }), /run-config\.json: agents\.reviewer\.lanes\.astra\.model: must be a model name/],
      ["a variable named like a vocabulary fact", () => entry("variables", "role", "{profile}"), /run-config\.json: variables\.role: a vocabulary fact is not declared/],
      ["a variable whose template names no vocabulary fact", () => entry("variables", "agent", "{pipeline-slug}-{agent}"), /run-config\.json: variables\.agent: \{agent\} names no vocabulary fact/],
      ["a variable name outside the grammar", () => entry("variables", "Agent", "{role}"), /run-config\.json: variables\."Agent": a variable name must match/],
      ["a variable with an empty template", () => entry("variables", "agent", ""), /run-config\.json: variables\.agent: must be a template/],
    ];
    // [what run-config.local.json holds, what the message names]: each stops rp next and rp land, and rp check reads none.
    const locals = [
      ["the target phase", { "target-phase": 3 }, /run-config\.local\.json: unexpected key: target-phase/],
      ["the base", { base: "main" }, /run-config\.local\.json: unexpected key: base/],
      ["owner directions", { "owner-directions": ["Keep it local."] }, /run-config\.local\.json: unexpected key: owner-directions/],
      ["a lane's brief", { agents: { reviewer: { lanes: { a: { brief: "Look closer." } } } } }, /run-config\.local\.json: agents\.reviewer\.lanes\.a: unexpected key: brief/],
      ["a model for a lane run-config.json does not declare", { agents: { reviewer: { lanes: { b: { model: "opus" } } } } }, /run-config\.local\.json: agents\.reviewer\.lanes\.b: a lane run-config\.json does not declare/],
      ["a malformed entry", { resources: { browser: { resource: "A browser.", profiles: ["builder"] } } }, /run-config\.local\.json: resources\.browser\.profiles: "builder" is no profile/],
      ["no JSON", "artifact-storage: fork\n", /run-config\.local\.json: not valid JSON/],
    ];
    const cases = [...committed.map(([what, breakIt, message]) => [`on ${what}`, breakIt, message, true]),
      ...locals.map(([what, data, message]) => [`on a run-config.local.json holding ${what}`, () => typeof data === "string" ? write("run-config.local.json", data) : local(data), message, false])];
    for (const [what, breakIt, message, checkStops] of cases)
      it(what, () => {
        conventions({ guardrails: { tests: { rule: "Run.", profiles: ["implementer"] } } });
        pipeline(2, { lanes: [lane("reviewer", "a")] });
        const { path, text } = assign("implementer");
        breakIt();
        for (const args of [["next", abs(PIPELINE), "--apply"], ["land", abs(PIPELINE), "--role", "implementer"], ["check", abs(PIPELINE)]]) {
          const out = runWith(ECHO, args);
          if (args[0] === "check" && !checkStops) { assert.equal(out.status, 0, out.stderr); continue; }
          assert.deepEqual([out.status, out.stdout], [1, ""]);
          assert.match(out.stderr, message);
        }
        assert.equal(readFileSync(path, "utf8"), text);
      });
  });

  describe("fill their templates by their syntax", () => {
    it("renders lists, parts, and flags as the syntax defines them", () => {
      const script = skillWith({
        implementer: [
          "inline-one: {{later-inputs}}", "inline-none: {{threads}}", "inline-many: {{changed-inputs}}",
          "{{#brief}}", "kept when something", "{{/brief}}", "{{^brief}}", "kept when nothing", "{{/brief}}",
          "{{#respond}}", "kept on the flag", "{{/respond}}", "{{#implement}}", "dropped on the flag", "{{/implement}}", "",
        ].join("\n"),
      });
      const landed = pipeline(3);
      write("0-intent/constraint-1.md", later(NOTES));
      revise(DESIGN);
      const at = realpathSync(root);
      assert.equal(assign("implementer", abs(PIPELINE), script).text, [
        `inline-one: ${in_(at, "0-intent/constraint-1.md")}`, "inline-none: none", "inline-many:",
        `  - ${in_(at, DESIGN)} — changed since ${landed}`, `  - ${in_(at, "0-intent/constraint-1.md")} — changed since ${landed}`,
        "kept when nothing", "kept on the flag", "",
      ].join("\n"));
    });

    // [what, the implementer template, what the message names]
    const broken = [
      ["a slot without a value", "## seat\n{{ticket}}\n", /templates\/implementer\.md:2: \{\{ticket\}\} has no value/],
      ["a slot naming no value", "{{Ticket}}\n", /templates\/implementer\.md:1: \{\{Ticket\}\} is no slot/],
      ["a flag in a slot", "{{implement}}\n", /templates\/implementer\.md:1: \{\{implement\}\} is a flag/],
      ["a list with text after it", "- {{later-inputs}} more\n", /templates\/implementer\.md:1: \{\{later-inputs\}\} is a list, which ends its line/],
      ["a marker beside text", "a {{#brief}}\n", /templates\/implementer\.md:1: \{\{#brief\}\} marks a part, which stands alone on its line/],
      ["a part never closed", "{{#brief}}\nx\n", /templates\/implementer\.md: \{\{brief\}\} opens a part that is never closed/],
      ["a part closed out of order", "{{#brief}}\n{{#lane}}\n{{/brief}}\n", /templates\/implementer\.md:3: \{\{\/brief\}\} closes no open part/],
    ];
    for (const [what, template, message] of broken)
      it(`stop on ${what}, naming the template and writing nothing`, () => {
        const script = skillWith({ implementer: template });
        pipeline(2);
        const out = runWith(script, ["next", abs(PIPELINE), "--apply"]);
        assert.equal(out.status, 1);
        assert.match(out.stderr, message);
        assert.equal(existsSync(git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/implementer.md").trim()), false);
      });
  });

  it("are written for every role from a run configuration and the delivered templates, for every kind of turn", () => {
    const data = {
      "commit-format": "Use imperative mood.\n\nExamples:\n\n- `Add spec (spec-producer)`\n- `Fix bug Y (assisted)`",
      guardrails: {
        tests: { rule: "Run `npm test` and confirm it passes.", profiles: ["implementer", "reviewer"] },
        documentation: { rule: "Follow `AGENTS.md` and `docs/glossary.md`, the canonical vocabulary.", profiles: ["implementer", "reviewer"] },
      },
      resources: { "test suite and scripts": { resource: "The repository's test suite and scripts.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } },
    };
    const agents = {
      "spec-producer": { model: "opus", subagents: "sonnet", lanes: { demands: { brief: "Read the intent for what it demands.", model: "opus" }, omits: { brief: "Read the intent for what it leaves out.", model: "sonnet" } } },
      "design-doc-producer": { model: "opus", subagents: "sonnet" },
      implementer: { model: "opus", subagents: "sonnet" },
      reviewer: { lanes: { default: { model: "opus", subagents: "sonnet" }, astra: { model: "astra", subagents: "luna" } } },
    };
    conventions(data);
    const config = { agents };
    const commitFormat = data["commit-format"].split("\n");
    const carried = (key, field, name) => `- ${field}: ${data[key][name][field]}`;
    // The delivered template's assignment for a role: written, holding the command that runs rp and each of `values`.
    const delivered = (role, values, at = abs(PIPELINE)) => {
      const { text, model } = assign(role, at, RP);
      for (const value of [`node ${RP} `, ...values]) assert.ok(text.includes(value), `${role}: ${value} in:\n${text}`);
      return model;
    };
    pipeline(0, config);
    const demands = assign("spec-producer-demands").values;
    assert.deepEqual([demands.brief, demands.guardrails, demands["subagent-model"]], [[agents["spec-producer"].lanes.demands.brief], ["none"], ["sonnet"]]);
    assert.deepEqual([demands.resources.at(-1), demands["commit-format"]], [carried("resources", "resource", "test suite and scripts"), commitFormat]);
    assert.equal(delivered("spec-producer-demands", [agents["spec-producer"].lanes.demands.brief, ...commitFormat.filter(Boolean)]), "opus");
    assert.equal(delivered("spec-producer-omits", ["sonnet"]), "sonnet");
    for (const id of ["demands", "omits"]) {
      commitIn(laneWorktree(`demo-spec-${id}`), { [`1-spec/lanes/${id}/spec.md`]: `# ${id}\n` }, `Add ${id} candidate (spec-producer)`);
      landRole(`spec-producer-${id}`);
    }
    delivered("spec-producer", [`demands — ${in_(realpathSync(root), "1-spec/lanes/demands/spec.md")}`]);
    pipeline(1, config);
    delivered("design-doc-producer", [carried("resources", "resource", "test suite and scripts")]);
    pipeline(2, config);
    delivered("implementer", [carried("guardrails", "rule", "tests"), carried("guardrails", "rule", "documentation")]);
    write(NOTES, withFrontmatter({ status: "done" }, "\n# Notes\n"));
    land(NOTES);
    revise(DESIGN);
    thread({ n: 1, ...TO_SPEC, opener: "implementer", artifact: "spec", owner: "spec-producer", messages: [["implementer", head()], ["spec-producer", head()]] });
    commitAll("a stale notes and an answered thread");
    delivered("implementer", [`${in_(realpathSync(root), DESIGN)} — changed since`, in_(realpathSync(root), "threads/1-implementer-spec-producer-spec.md")]);
    local({ resources: { ticket: { resource: "Open {ticket}.", profiles: ["implementer"] } } });
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    commitAll("a malformed notes");
    delivered("implementer", [`INVALID ${NOTES}: unexpected frontmatter key: owner`, "Open {ticket}.", "`{pipeline-slug}`: demo"]);
    remove("run-config.local.json");
    thread({ n: 1, ...TO_SPEC, opener: "implementer", status: "approved", messages: [["implementer", head()], ["spec-producer", head()]] });
    pipeline(3, config);
    for (const [id, model, subagents] of [["default", "opus", "sonnet"], ["astra", "astra", "luna"]])
      assert.equal(delivered(`reviewer-${id}`, [`\`${subagents}\``, carried("guardrails", "rule", "documentation"), carried("resources", "resource", "test suite and scripts")]), model);
    const wt = laneWorktree("demo-review-default"), change = head(wt);
    const review = "threads/2-reviewer-default-implementer-implementation.md";
    commitIn(wt, { [review]: withFrontmatter({ status: "open", ...REVIEW("default") }, `\n## reviewer-default — ${change}\n\nFindings.\n`) }, "Open review thread (reviewer)");
    landRole("reviewer-default");
    write(review, `${read(review)}\n## implementer — ${head()}\n\nAnswered.\n`);
    commitAll("an answered review");
    delivered("reviewer-default", ["reviewer.diff", in_(wt, review)]);
    write(review, read(review).replace("status: open", "status: pending"));
    commitAll("a rejected review thread");
    delivered("reviewer-default", [`INVALID ${review}: status must be`, in_(wt, "")]);
    assert.match(readFileSync(git(wt, "rev-parse", "--path-format=absolute", "--git-path", "rp/reviewer.md").trim(), "utf8"), new RegExp(`, at \`${head(wt)}\``));
  });
});

describe("assignments in a repository and a skill whose paths hold a space and a quote", () => {
  useRepo("the repo's folder");
  let script;
  before(() => {
    script = skillWith({
      ...Object.fromEntries(["spec-producer", "design-doc-producer", "implementer"].map((name) => [name, echo(name, PRODUCER, FLAGS)])),
      "reviewer-first": echo("reviewer-first", [...COMMON, "review-base"]),
      "reviewer-later": echo("reviewer-later", [...COMMON, "review-base", "thread", "thread-arg", "diff"]),
      "reviewer-repair": echo("reviewer-repair", [...COMMON, "review-base"]),
    }, "the skill's folder");
  });

  it("state the command that runs rp, which runs from the role's worktree as written and acts as the role, in each seat and each reviewer request, and show each path to read as written", () => {
    // `rp <command>` run from the role's worktree as its assignment's values state it, `input` on its standard input.
    const asStated = (values, command, input) => {
      const out = spawnSync("sh", ["-c", `${values.rp[0]} ${command} ${values["pipeline-folder-arg"][0]} --role ${values.role[0]}`], { cwd: values.worktree[0], encoding: "utf8", input });
      assert.equal(out.status, 0, out.stderr);
      return out.stdout;
    };
    // A path as one shell word: in single quotes, each quote in it closed, escaped, and reopened.
    const word = (path) => `'${path.replaceAll("'", "'\\''")}'`;
    pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] });
    const lane = assign("spec-producer-a", abs(PIPELINE), script).values, wt0 = laneWorktree("demo-spec-a");
    assert.deepEqual([lane.rp, lane.worktree, lane["pipeline-folder"], lane["pipeline-folder-arg"]], [[`node ${word(realpathSync(script))}`], [wt0], [in_(wt0, "")], [word(in_(wt0, ""))]]);
    assert.equal(asStated(lane, "validate"), "accepted: every file of spec-producer-a\n");
    pipeline(2);
    const implementer = assign("implementer", abs(PIPELINE), script).values;
    const opened = asStated(implementer, "thread open --artifact spec --body -", "Findings.\n").trimEnd();
    assert.deepEqual([dirname(opened), readFileSync(opened, "utf8").match(/^opener: (.*)$/m)[1]], [in_(realpathSync(root), "threads"), "implementer"]);
    assert.equal(asStated(implementer, "validate"), "accepted: every file of implementer\n");
    rmSync(opened);
    pipeline(3);
    const first = assign("reviewer-default", abs(PIPELINE), script).values, wt = laneWorktree("demo-review-default");
    assert.deepEqual(first.template, ["reviewer-first"]);
    const review = asStated(first, "thread open --artifact implementation --body -", "Findings.\n").trimEnd();
    assert.equal(review, in_(wt, "threads/1-reviewer-default-implementer-implementation.md"));
    commitIn(wt, {}, "review");
    landRole("reviewer-default");
    write("threads/1-reviewer-default-implementer-implementation.md", `${read("threads/1-reviewer-default-implementer-implementation.md")}\n## implementer — ${head()}\n\nAnswered.\n`);
    commitAll("answer");
    const later = assign("reviewer-default", abs(PIPELINE), script).values;
    assert.deepEqual([later.template, later.thread, later["thread-arg"]], [["reviewer-later"], [review], [word(review)]]);
    assert.equal(asStated(later, `validate --file ${later["thread-arg"][0]}`), "accepted: threads/1-reviewer-default-implementer-implementation.md\n");
    write("threads/1-reviewer-default-implementer-implementation.md", read("threads/1-reviewer-default-implementer-implementation.md").replace("status: open", "status: pending"));
    commitAll("a rejected review thread");
    const repair = assign("reviewer-default", abs(PIPELINE), script).values;
    assert.deepEqual(repair.template, ["reviewer-repair"]);
    assert.match(asStated(repair, "validate"), /^INVALID threads\/1-reviewer-default-implementer-implementation\.md: status must be one of /);
  });
});
