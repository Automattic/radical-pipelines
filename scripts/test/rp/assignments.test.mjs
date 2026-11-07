import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, RP, SPEC, TO_OWNER, TO_SPEC,
  abs, commitAll, commitIn, conventions, git, land, landRole, laneWorktree, later, pipeline, read, remove, revise, root, thread, useRepo, wakeOf, withFrontmatter, write, writeFile,
} from "./fixture.mjs";

const local = (data, body = "\n# Local\n") => writeFile(".rp.local.md", `---\n${JSON.stringify(data, null, 2)}\n---\n${body}`);

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
      conventions();
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
      conventions();
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
      conventions();
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
      conventions();
      pipeline(3);
      const awaiting = thread(TO_SPEC);
      commitAll("thread");
      const { values } = assign("spec-producer");
      assert.deepEqual([values.mode, values["changed-inputs"], values.threads], [["Respond"], ["none"], [in_(realpathSync(root), awaiting)]]);
    });

    it("a production lane: its brief, its worktree's seat and tip, its candidate, and its changed inputs, in produce and respond", () => {
      conventions();
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: ["Read for what it demands.", "", "Every outcome."] }, { profile: "spec-producer", id: "b" }] });
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
      conventions();
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
        conventions();
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
      conventions();
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
    conventions();
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

  describe("carries the project's conventions", () => {
    const GUARDRAILS = { tests: { rule: "Run the tests.", profiles: ["implementer", "reviewer"] }, docs: { rule: ["Follow the glossary.", "", "- Every term."], profiles: ["implementer"] } };
    const RESOURCES = { suite: { resource: "The suite.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } };
    const BOTH_GUARDRAILS = ["### tests", "", "- rule: Run the tests.", "", "### docs", "", "- rule: Follow the glossary.", "", "  - Every term."];

    it("each guardrail and resource whose profiles include the role's, under its name with its text, the same in every lane, or none", () => {
      conventions({ guardrails: GUARDRAILS, resources: RESOURCES, "commit-format": ["Imperative.", "", "- `Add spec (spec-producer)`"] });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] });
      const lane = assign("spec-producer-a").values;
      assert.deepEqual([lane.guardrails, lane.resources], [["none"], ["### suite", "", "- resource: The suite."]]);
      assert.deepEqual(lane["commit-format"], ["Imperative.", "", "- `Add spec (spec-producer)`"]);
      pipeline(2);
      const implementer = assign("implementer").values;
      assert.deepEqual([implementer.guardrails, implementer.resources], [BOTH_GUARDRAILS, lane.resources]);
    });

    it("an imperative subject line as the commit format when the project sets none", () => {
      conventions();
      pipeline(2);
      assert.deepEqual(assign("implementer").values["commit-format"], ["An imperative subject line."]);
    });

    it("the main checkout's conventions, with .rp.local.md overriding and adding entries by name, for a role seated in a linked worktree", () => {
      pipeline(2);
      git(root, "checkout", "--quiet", "main");
      conventions({ guardrails: GUARDRAILS, resources: RESOURCES, "commit-format": "Committed." });
      local({ guardrails: { tests: { rule: "Run the local tests.", profiles: ["implementer"] } }, resources: { browser: { resource: "A local browser.", profiles: ["implementer"] } } });
      writeFileSync(abs(".git/info/exclude"), `${readFileSync(abs(".git/info/exclude"), "utf8")}.wt-pipeline/\n`);
      git(root, "worktree", "add", "--quiet", `${root}/.wt-pipeline`, "demo");
      const wt = realpathSync(`${root}/.wt-pipeline`);
      writeFile(".wt-pipeline/.rp.md", "---\n{\"conventions\": 7, \"worktree-folder-root\": \".elsewhere\", \"commit-format\": \"The worktree's own.\"}\n---\n");
      const values = assign("implementer", in_(wt, "")).values;
      assert.deepEqual(values.worktree, [wt]);
      assert.deepEqual(values.guardrails, ["### tests", "", "- rule: Run the local tests.", ...BOTH_GUARDRAILS.slice(3)]);
      assert.deepEqual(values.resources, ["### suite", "", "- resource: The suite.", "", "### browser", "", "- resource: A local browser."]);
      assert.deepEqual(values["commit-format"], ["Committed."]);
    });
  });

  describe("names models as the run writes them", () => {
    const AGENTS = {
      "spec-producer": { model: "opus", subagents: "sonnet", lanes: { a: { model: "sonnet" }, b: { subagents: "openai/gpt-6-astra#high" } } },
      reviewer: { model: "opus", lanes: { astra: { model: "astra", subagents: "luna" }, default: {} } },
    };

    it("a lane's model and subagent model, else its profile's, or none and no model line", () => {
      conventions();
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

    it("a run's model over the Agents convention's, and the same plan and assignment whatever the conventions say for particular tools", () => {
      conventions({ agents: { implementer: { model: "opus", subagents: "sonnet" } } }, "\n## opencode\n\n`sonnet` is `claude-agent/sonnet#xhigh`.\n");
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
      conventions({ variables: { agent: "{role}" }, guardrails: { raw: { rule: [text, "{{commit-format}}"], profiles: ["implementer"] } }, "commit-format": "{{vocabulary}}" });
      pipeline(2);
      const values = assign("implementer").values;
      assert.deepEqual(values.guardrails, ["### raw", "", `- rule: ${text}`, "  {{commit-format}}"]);
      assert.deepEqual([values["commit-format"], values.vocabulary], [["{{vocabulary}}"], ["none"]]);
    });
  });

  describe("stop rp next and rp land on malformed conventions data, writing nothing", () => {
    const VALID = { guardrails: { tests: { rule: "Run.", profiles: ["implementer"] } } };
    // [what, how the main checkout's files are broken, what the message names]
    const malformations = [
      [".rp.md missing", () => rmSync(abs(".rp.md")), /cannot read .*\/\.rp\.md: missing/],
      [".rp.md without frontmatter", () => writeFile(".rp.md", "# Conventions\n"), /\.rp\.md: no frontmatter/],
      ["frontmatter that does not parse", () => writeFile(".rp.md", "---\n{\n  \"conventions\": 7,\n}\n---\n"), /\.rp\.md: frontmatter is not valid JSON: .+/],
      ["an earlier version", () => conventions({ conventions: 6 }), /\.rp\.md: conventions: 6 is not the current version, 7/],
      ["no version", () => writeFile(".rp.md", "---\n{}\n---\n"), /\.rp\.md: conventions: null is not the current version, 7/],
      ["an unknown key", () => conventions({ guardrail: {} }), /\.rp\.md: frontmatter: unexpected key: guardrail/],
      ["no worktree folder root", () => conventions({ "worktree-folder-root": undefined }), /\.rp\.md: worktree-folder-root: missing/],
      ["an empty worktree folder root", () => conventions({ "worktree-folder-root": " " }), /\.rp\.md: worktree-folder-root: must be a folder/],
      ["a landing commit template without {subject}", () => conventions({ "landing-commit": "(orchestrator)" }), /\.rp\.md: landing-commit: must hold \{subject\}/],
      ["a landing commit template naming another placeholder", () => conventions({ "landing-commit": "{subject} ({role})" }), /\.rp\.md: landing-commit: \{role\} names no part of a landing commit/],
      ["a guardrail without its text", () => conventions({ guardrails: { tests: { profiles: ["implementer"] } } }), /\.rp\.md: guardrails\.tests\.rule: must be a text/],
      ["a resource whose text holds no line", () => conventions({ resources: { suite: { resource: ["", " "], profiles: ["implementer"] } } }), /\.rp\.md: resources\.suite\.resource: must be a text/],
      ["a resource whose text is a list holding other than strings", () => conventions({ resources: { "test suite": { resource: ["a", 2], profiles: ["implementer"] } } }), /\.rp\.md: resources\."test suite"\.resource: must be a text/],
      ["a guardrail whose profiles name another", () => conventions({ guardrails: { tests: { rule: "Run.", profiles: ["implementer", "implementor"] } } }), /\.rp\.md: guardrails\.tests\.profiles: "implementor" is no profile/],
      ["a guardrail without profiles", () => conventions({ guardrails: { tests: { rule: "Run." } } }), /\.rp\.md: guardrails\.tests\.profiles: must be a non-empty list of profiles/],
      ["a resource with an empty profiles list", () => conventions({ resources: { suite: { resource: "The suite.", profiles: [] } } }), /\.rp\.md: resources\.suite\.profiles: must be a non-empty list/],
      ["a guardrail with an unknown key", () => conventions({ guardrails: { tests: { rule: "Run.", profile: ["implementer"] } } }), /\.rp\.md: guardrails\.tests: unexpected key: profile/],
      ["an empty commit format", () => conventions({ "commit-format": "" }), /\.rp\.md: commit-format: must be a text/],
      ["agents of a profile no role here is", () => conventions({ agents: { reviewer: { lanes: { astra: { model: "" } } } } }), /\.rp\.md: agents\.reviewer\.lanes\.astra\.model: must be a model name/],
      ["a variable named like a vocabulary fact", () => conventions({ variables: { role: "{profile}" } }), /\.rp\.md: variables\.role: a vocabulary fact is not declared/],
      ["a variable whose template names no vocabulary fact", () => conventions({ variables: { agent: "{pipeline-slug}-{agent}" } }), /\.rp\.md: variables\.agent: \{agent\} names no vocabulary fact/],
      ["a variable name outside the grammar", () => conventions({ variables: { Agent: "{role}" } }), /\.rp\.md: variables\."Agent": a variable name must match/],
      ["a variable with an empty template", () => conventions({ variables: { agent: "" } }), /\.rp\.md: variables\.agent: must be a template/],
      [".rp.local.md naming the version", () => local({ conventions: 7 }), /\.rp\.local\.md: frontmatter: unexpected key: conventions/],
      [".rp.local.md with a malformed entry", () => local({ resources: { browser: { resource: "A browser.", profiles: ["builder"] } } }), /\.rp\.local\.md: resources\.browser\.profiles: "builder" is no profile/],
      [".rp.local.md with an empty landing commit template", () => local({ "landing-commit": "" }), /\.rp\.local\.md: landing-commit: must be a template/],
      [".rp.local.md whose frontmatter does not parse", () => writeFile(".rp.local.md", "---\nartifact-storage: fork\n---\n"), /\.rp\.local\.md: frontmatter is not valid JSON/],
    ];
    for (const [what, breakIt, message] of malformations)
      it(`on ${what}`, () => {
        conventions(VALID);
        pipeline(2);
        const { path, text } = assign("implementer");
        breakIt();
        for (const args of [["next", abs(PIPELINE), "--apply"], ["land", abs(PIPELINE), "--role", "implementer"]]) {
          const out = runWith(ECHO, args);
          assert.deepEqual([out.status, out.stdout], [1, ""]);
          assert.match(out.stderr, message);
        }
        assert.equal(readFileSync(path, "utf8"), text);
      });

    it("accepts a .rp.local.md without frontmatter, which overrides no entry", () => {
      conventions(VALID);
      writeFile(".rp.local.md", "# Local\n\nArtifact storage: a fork.\n");
      pipeline(2);
      assert.deepEqual(assign("implementer").values.guardrails, ["### tests", "", "- rule: Run."]);
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
      conventions();
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
        conventions();
        pipeline(2);
        const out = runWith(script, ["next", abs(PIPELINE), "--apply"]);
        assert.equal(out.status, 1);
        assert.match(out.stderr, message);
        assert.equal(existsSync(git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/implementer.md").trim()), false);
      });
  });

  it("are written for every role from this repository's .rp.md, a run confirmed with its Agents defaults, and the delivered templates, for every kind of turn", () => {
    const committed = readFileSync(join(dirname(RP), "../../../.rp.md"));
    const data = JSON.parse(committed.toString("utf8").split("---\n")[1]);
    writeFile(".rp.md", committed);
    writeFile(".git/info/exclude", `${data["worktree-folder-root"]}/\n`);
    const config = { agents: data.agents };
    const carried = (key, field, name) => `- ${field}: ${data[key][name][field]}`;
    // The delivered template's assignment for a role: written, holding the command that runs rp and each of `values`.
    const delivered = (role, values, at = abs(PIPELINE)) => {
      const { text, model } = assign(role, at, RP);
      for (const value of [`node ${RP} `, ...values]) assert.ok(text.includes(value), `${role}: ${value} in:\n${text}`);
      return model;
    };
    pipeline(0, config);
    assert.deepEqual(Object.keys(data.agents["spec-producer"].lanes), ["demands", "omits"]);
    const demands = assign("spec-producer-demands").values;
    assert.deepEqual([demands.brief, demands.guardrails, demands["subagent-model"]], [[data.agents["spec-producer"].lanes.demands.brief], ["none"], ["sonnet"]]);
    assert.deepEqual([demands.resources.at(-1), demands["commit-format"]], [carried("resources", "resource", "test suite and scripts"), data["commit-format"]]);
    assert.equal(delivered("spec-producer-demands", [data.agents["spec-producer"].lanes.demands.brief, ...data["commit-format"].filter(Boolean)]), "opus");
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
    rmSync(abs(".rp.local.md"));
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
    conventions();
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
