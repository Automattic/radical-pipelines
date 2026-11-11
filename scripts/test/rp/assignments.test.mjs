import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, RP, SPEC, TO_OWNER, TO_SPEC,
  abs, commitAll, commitIn, configure, conventions, git, ignore, land, landRole, lane, laneWorktree, later, pipeline, read, remove, revise, root, thread, useRepo, wakeOf, withFrontmatter, write, writeFile,
} from "./fixture.mjs";

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
const COMMON = ["pipeline-slug", "role", "profile", "lane", "worktree", "branch", "merge-base", "turn-commit", "rp", "base-branch", "subagent-model", "brief",
  "pipeline-folder", "pipeline-folder-arg", "intent", "spec", "design-doc", "later-inputs", "malformed-files", "guardrails", "resources", "commit-format", "facts"];
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
    it("produce: its template, the mode, the artifact's later inputs, and the pipeline worktree's seat and tip", () => {
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
      assert.deepEqual(values["merge-base"], [git(root, "merge-base", "main", tip).trim()]);
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

    it("consolidate: every lane's candidate in the pipeline worktree, and the artifact to write", () => {
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
      ["a base that does not resolve", () => pipeline(1, { targetPhase: 3, base: "gone" }), /base-branch does not resolve to a commit: gone/],
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

    it("first turn: the branch, the review base and review head built from the tip, every later input, the brief or none, and no thread", () => {
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

    it("later turn: the lane's open review thread awaiting it, and the diff from the commit its last message names to this turn's review head", () => {
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

  it("lists as malformed files the malformed lines of the files each role writes, wakes only those roles, and gives a reviewer the repair template", () => {
    pipeline(3);
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    const rejected = thread({ n: 2, ...REVIEW("default"), status: "pending" });
    const toOwner = thread({ n: 3, ...TO_OWNER, status: "pending" });
    const tip = commitAll("malformed files");
    const STATUS = "status must be one of open | approved | resolved | withdrawn | escalated | answered";
    const implementer = assign("implementer").values;
    assert.deepEqual(implementer["malformed-files"], [`malformed ${NOTES}: unexpected frontmatter key: owner`, `malformed ${rejected}: ${STATUS}`]);
    assert.deepEqual([implementer.mode, implementer.threads, implementer["changed-inputs"]], [["Respond"], ["none"], ["none"]]);
    assert.deepEqual(assign("spec-producer").values["malformed-files"], [`malformed ${toOwner}: ${STATUS}`]);
    const wt = laneWorktree("demo-review-default"), change = git(root, "rev-parse", "demo-review-default").trim();
    const { path, values: request } = assign("reviewer-default");
    assert.deepEqual([request.template, request["malformed-files"]], [["reviewer-repair"], [`malformed ${rejected}: ${STATUS}`]]);
    assert.deepEqual([request["turn-commit"], request["pipeline-folder"]], [[change], [in_(wt, "")]]);
    assert.notEqual(change, tip);
    assert.equal(existsSync(join(dirname(path), "reviewer.diff")), false);
    const out = runWith(ECHO, ["next", abs(PIPELINE)]);
    assert.equal(wakeOf(out.stdout.split("\n"), "design-doc-producer").assignment, undefined);
  });

  describe("carries the run's conventions", () => {
    const GUARDRAILS = { tests: { text: "Run the tests.", profiles: ["implementer", "reviewer"] }, docs: { text: "Follow the glossary.\n\n- Every term.", profiles: ["implementer"] } };
    const RESOURCES = { suite: { text: "The suite.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } };
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

    it("the worktree folder root, the commit format, and the landing commit format it records, in lane worktrees, assignments, and landing commits", () => {
      conventions({ "worktree-folder-root": ".elsewhere", "commit-format": "Committed.", "landing-commit-format": "{subject} (committed)" });
      ignore(".elsewhere/");
      pipeline(0, { lanes: [lane("spec-producer", "a")] });
      const values = assign("spec-producer-a").values, wt = join(realpathSync(root), ".elsewhere/demo-spec-a");
      assert.deepEqual([values.worktree, values["commit-format"]], [[wt], ["Committed."]]);
      commitIn(wt, { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "candidate");
      landRole("spec-producer-a");
      assert.deepEqual(git(root, "log", "--first-parent", "-2", "--format=%s").trim().split("\n"), ["Certify spec lane a candidate (committed)", "Merge spec lane a (committed)"]);
    });
  });

  describe("names models as config.json writes them", () => {
    // A woken role's model and subagent model, null where it has none.
    const models = (role) => { const { model, values } = assign(role); return [model, values["subagent-model"][0] ?? null]; };

    it("for each of a role's model and subagent model, its role name's entry, else its profile's, or none and no model line", () => {
      const lanes = ["a", "b", "c", "d"].map((id) => lane("spec-producer", id));
      const config = {
        lanes: [...lanes, lane("reviewer", "x"), lane("reviewer", "y")],
        models: {
          "spec-producer": { model: "opus", "subagent-model": "sonnet" },
          "spec-producer-a": { model: "astra" }, "spec-producer-b": { "subagent-model": "openai/gpt-6-astra#high" }, "spec-producer-c": { model: "astra", "subagent-model": "luna" },
          implementer: { model: "opus" }, "reviewer-x": { model: "astra", "subagent-model": "luna" },
        },
      };
      pipeline(0, config);
      assert.deepEqual(["a", "b", "c", "d"].map((id) => models(`spec-producer-${id}`)),
        [["astra", "sonnet"], ["opus", "openai/gpt-6-astra#high"], ["astra", "luna"], ["opus", "sonnet"]]);
      pipeline(1, config);
      assert.deepEqual(models("design-doc-producer"), [null, null]);
      pipeline(2, config);
      assert.deepEqual(models("implementer"), ["opus", null]);
      pipeline(3, config);
      assert.deepEqual([models("reviewer-x"), models("reviewer-y")], [["astra", "luna"], [null, null]]);
      pipeline(3, { models: { reviewer: { model: "opus" }, "reviewer-default": { "subagent-model": "luna" } } });
      assert.deepEqual(models("reviewer-default"), ["opus", "luna"]);
    });

    it("config.json's, and the same plan and assignment under every agentic tool, whatever .rp.md and its tool sections say", () => {
      writeFile(".rp.md", "---\nconventions: 7\n---\n\n## Shared conventions\n\n### Models\n\n#### implementer\n\n- model: `sonnet`\n\n## opencode\n\n`sonnet` is `claude-agent/sonnet#xhigh`.\n");
      pipeline(2, { models: { implementer: { model: "opus", "subagent-model": "haiku" } } });
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
    const FACTS = "{pipeline-slug} {role} {profile} [{lane}] {worktree} {branch} {merge-base}";

    it("each pipeline fact, the merge-base of the role's turn commit, and each declared variable to the role's value, a lane's brief included, and lists no facts", () => {
      conventions({
        variables: { agent: "{pipeline-slug}-{role}" },
        guardrails: { facts: { text: FACTS, profiles: ["implementer", "reviewer", "spec-producer"] } },
        resources: { env: { text: "The environment `{agent}`.", profiles: ["implementer", "reviewer", "spec-producer"] } },
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
      assert.deepEqual([spec["commit-format"], spec.facts], [["End with (spec-producer-a)."], ["none"]]);
      pipeline(2, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const implementer = assign("implementer").values, at = realpathSync(root);
      assert.deepEqual(implementer.guardrails.at(-1), `- rule: demo implementer implementer [] ${at} demo ${baseOf(head())}`);
      assert.deepEqual([implementer.resources.at(-1), implementer.facts], ["- resource: The environment `demo-implementer`.", ["none"]]);
      pipeline(3, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const request = assign("reviewer-astra").values, wt = laneWorktree("demo-review-astra");
      assert.deepEqual(request.guardrails.at(-1), `- rule: demo reviewer-astra reviewer [astra] ${wt} demo-review-astra ${baseOf(head(wt))}`);
      assert.deepEqual([request.resources.at(-1), request.facts], ["- resource: The environment `demo-reviewer-astra`.", ["none"]]);
    });

    it("keeps a placeholder that names neither as written, and then lists each pipeline fact with the role's value", () => {
      conventions({ resources: { ticket: { text: "Open {ticket} for {role}.", profiles: ["implementer", "reviewer"] } } });
      pipeline(2);
      const values = assign("implementer").values, at = realpathSync(root);
      assert.deepEqual(values.resources.at(-1), "- resource: Open {ticket} for implementer.");
      assert.deepEqual(values.facts, ["- `{pipeline-slug}`: demo", "- `{role}`: implementer", "- `{profile}`: implementer", "- `{lane}`:", `- \`{worktree}\`: ${at}`, "- `{branch}`: demo",
        `- \`{merge-base}\`: ${git(root, "merge-base", "main", "HEAD").trim()}`]);
      pipeline(3);
      assert.ok(assign("reviewer-default").values.facts.includes("- `{lane}`: default"));
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: "Explore {ticket}." }] });
      remove(SPEC);
      commitAll("a lane whose brief alone keeps a placeholder");
      const lane = assign("spec-producer-a").values;
      assert.deepEqual([lane.brief, lane.resources, lane.facts[1]], [["Explore {ticket}."], ["none"], "- `{role}`: spec-producer-a"]);
    });

    it("leaves text outside the placeholder grammar as written, template syntax included, and lists no facts", () => {
      const text = "{{agent}} {Agent} { role } {agent_name} {{#guardrails}} {{/guardrails}} {{^brief}} $1 {";
      conventions({ variables: { agent: "{role}" }, guardrails: { raw: { text: `${text}\n{{commit-format}}`, profiles: ["implementer"] } }, "commit-format": "{{facts}}" });
      pipeline(2);
      const values = assign("implementer").values;
      assert.deepEqual(values.guardrails, ["### raw", "", `- rule: ${text}`, "  {{commit-format}}"]);
      assert.deepEqual([values["commit-format"], values.facts], [["{{facts}}"], ["none"]]);
    });
  });

  describe("stop on a malformed pipeline configuration, writing nothing", () => {
    // config.json in the pipeline worktree with `changes` over it, a key given as undefined removed.
    const configWith = (changes) => write("config.json", JSON.stringify({ ...JSON.parse(read("config.json")), ...changes }));
    const entry = (key, name, value) => configWith({ [key]: { [name]: value } });
    // [what, how config.json is broken, what the message names]: each stops rp check, rp next, and rp land.
    const configurations = [
      ["an empty worktree folder root", () => configWith({ "worktree-folder-root": " " }), /config\.json: worktree-folder-root: must be a folder/],
      ["a landing commit template without {subject}", () => configWith({ "landing-commit-format": "(orchestrator)" }), /config\.json: landing-commit-format: must hold \{subject\}/],
      ["a landing commit template naming another placeholder", () => configWith({ "landing-commit-format": "{subject} ({role})" }), /config\.json: landing-commit-format: \{role\} names no part of a landing commit/],
      ["an empty commit format", () => configWith({ "commit-format": "" }), /config\.json: commit-format: must be a text/],
      ["a guardrail without its text", () => entry("guardrails", "tests", { profiles: ["implementer"] }), /config\.json: guardrails\.tests\.text: must be a text/],
      ["a resource whose text holds no line", () => entry("resources", "suite", { text: " \n ", profiles: ["implementer"] }), /config\.json: resources\.suite\.text: must be a text/],
      ["a resource whose text is a list of lines", () => entry("resources", "test suite", { text: ["a", "b"], profiles: ["implementer"] }), /config\.json: resources\."test suite"\.text: must be a text/],
      ["a guardrail whose profiles name another", () => entry("guardrails", "tests", { text: "Run.", profiles: ["implementer", "implementor"] }), /config\.json: guardrails\.tests\.profiles: "implementor" is no profile/],
      ["a guardrail without profiles", () => entry("guardrails", "tests", { text: "Run." }), /config\.json: guardrails\.tests\.profiles: must be a non-empty list of profiles/],
      ["a resource with an empty profiles list", () => entry("resources", "suite", { text: "The suite.", profiles: [] }), /config\.json: resources\.suite\.profiles: must be a non-empty list/],
      ["a guardrail with an unknown key", () => entry("guardrails", "tests", { text: "Run.", profile: ["implementer"] }), /config\.json: guardrails\.tests: unexpected key: profile/],
      ["a lane's model that is no name", () => configWith({ models: { "reviewer-a": { model: "" } } }), /config\.json: models\.reviewer-a\.model: must be a model name/],
      ["models for a lane the run does not have", () => configWith({ models: { "reviewer-b": { model: "opus" } } }), /config\.json: models\.reviewer-b: names no profile and no lane the run has/],
      ["a variable named like a pipeline fact", () => entry("variables", "role", "{profile}"), /config\.json: variables\.role: a pipeline fact is not declared/],
      ["a variable whose template names no pipeline fact", () => entry("variables", "agent", "{pipeline-slug}-{agent}"), /config\.json: variables\.agent: \{agent\} names no pipeline fact/],
      ["a variable name outside the grammar", () => entry("variables", "Agent", "{role}"), /config\.json: variables\."Agent": a variable name must match/],
      ["a variable with an empty template", () => entry("variables", "agent", ""), /config\.json: variables\.agent: must be a template/],
    ];
    for (const [what, breakIt, message] of configurations)
      it(`on ${what}`, () => {
        conventions({ guardrails: { tests: { text: "Run.", profiles: ["implementer"] } } });
        pipeline(2, { lanes: [lane("reviewer", "a")] });
        const { path, text } = assign("implementer");
        breakIt();
        for (const args of [["next", abs(PIPELINE), "--apply"], ["land", abs(PIPELINE), "--role", "implementer"], ["check", abs(PIPELINE)]]) {
          const out = runWith(ECHO, args);
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

  it("are written for every role from a pipeline configuration and the delivered templates, for every kind of turn", () => {
    const data = {
      "commit-format": "Use imperative mood.\n\nExamples:\n\n- `Add spec (spec-producer)`\n- `Fix bug Y (assisted)`",
      guardrails: {
        tests: { text: "Run `npm test` and confirm it passes.", profiles: ["implementer", "reviewer"] },
        documentation: { text: "Follow `AGENTS.md` and `docs/glossary.md`, the canonical vocabulary.", profiles: ["implementer", "reviewer"] },
      },
      resources: { "test suite and scripts": { text: "The repository's test suite and scripts.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } },
    };
    const demandsBrief = "Read the intent for what it demands.";
    const config = {
      lanes: [{ profile: "spec-producer", id: "demands", brief: demandsBrief }, { profile: "spec-producer", id: "omits", brief: "Read the intent for what it leaves out." },
        { profile: "reviewer", id: "default" }, { profile: "reviewer", id: "astra" }],
      models: {
        "spec-producer": { model: "opus", "subagent-model": "sonnet" }, "spec-producer-omits": { model: "sonnet" },
        "design-doc-producer": { model: "opus", "subagent-model": "sonnet" },
        implementer: { model: "opus", "subagent-model": "sonnet" },
        "reviewer-default": { model: "opus", "subagent-model": "sonnet" }, "reviewer-astra": { model: "astra", "subagent-model": "luna" },
      },
    };
    conventions(data);
    const commitFormat = data["commit-format"].split("\n");
    const carried = (key, field, name) => `- ${field}: ${data[key][name].text}`;
    // The delivered template's assignment for a role: written, holding the command that runs rp and each of `values`.
    const delivered = (role, values, at = abs(PIPELINE)) => {
      const { text, model } = assign(role, at, RP);
      for (const value of [`node ${RP} `, ...values]) assert.ok(text.includes(value), `${role}: ${value} in:\n${text}`);
      return model;
    };
    pipeline(0, config);
    const demands = assign("spec-producer-demands").values;
    assert.deepEqual([demands.brief, demands.guardrails, demands["subagent-model"]], [[demandsBrief], ["none"], ["sonnet"]]);
    assert.deepEqual([demands.resources.at(-1), demands["commit-format"]], [carried("resources", "resource", "test suite and scripts"), commitFormat]);
    assert.equal(delivered("spec-producer-demands", [demandsBrief, ...commitFormat.filter(Boolean)]), "opus");
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
    thread({ n: 1, ...TO_SPEC, opener: "implementer", about: "spec", recipient: "spec-producer", messages: [["implementer", head()], ["spec-producer", head()]] });
    commitAll("a stale notes and an answered thread");
    delivered("implementer", [`${in_(realpathSync(root), DESIGN)} — changed since`, in_(realpathSync(root), "threads/1-implementer-spec-producer-spec.md")]);
    conventions({ ...data, resources: { ...data.resources, ticket: { text: "Open {ticket}.", profiles: ["implementer"] } } });
    configure(config);
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    commitAll("a malformed notes and a resource with a placeholder");
    delivered("implementer", [`malformed ${NOTES}: unexpected frontmatter key: owner`, "Open {ticket}.", "`{pipeline-slug}`: demo"]);
    conventions(data);
    thread({ n: 1, ...TO_SPEC, opener: "implementer", status: "resolved", messages: [["implementer", head()], ["spec-producer", head()]] });
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
    delivered("reviewer-default", [`malformed ${review}: status must be`, in_(wt, "")]);
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

  it("state the command that runs rp, which runs from the role's worktree as written and acts as the role, in each seat and each reviewer template, and show each path to read as written", () => {
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
    const opened = asStated(implementer, "thread open --about spec --body -", "Findings.\n").trimEnd();
    assert.deepEqual([dirname(opened), readFileSync(opened, "utf8").match(/^opener: (.*)$/m)[1]], [in_(realpathSync(root), "threads"), "implementer"]);
    assert.equal(asStated(implementer, "validate"), "accepted: every file of implementer\n");
    rmSync(opened);
    pipeline(3);
    const first = assign("reviewer-default", abs(PIPELINE), script).values, wt = laneWorktree("demo-review-default");
    assert.deepEqual(first.template, ["reviewer-first"]);
    const review = asStated(first, "thread open --about implementation --body -", "Findings.\n").trimEnd();
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
    assert.match(asStated(repair, "validate"), /^malformed threads\/1-reviewer-default-implementer-implementation\.md: status must be one of /);
  });
});
