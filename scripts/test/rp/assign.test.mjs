import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { DESIGN, INTENT, NOTES, P, PIPELINE, REVIEW, RP, SPEC, TO_OWNER, TO_SPEC, abs, commitAll, git, land, later, pipeline, read, revise, root, rp, run, thread, useRepo, withFrontmatter, write, writeFile } from "./fixture.mjs";

const TEMPLATES = join(dirname(RP), "../templates");

// `.rp.md` in the main checkout: a JSON frontmatter holding `data` at the current version, above a prose body.
const conventions = (data = {}, body = "\n# Conventions\n") => writeFile(".rp.md", `---\n${JSON.stringify({ conventions: 8, ...data }, null, 2)}\n---\n${body}`);
const local = (data, body = "\n# Local\n") => writeFile(".rp.local.md", `---\n${JSON.stringify(data, null, 2)}\n---\n${body}`);

// Runs `rp assign` for a role: the assignment's path, its contents, and the model it printed, or null.
function assign(role, at = abs(PIPELINE)) {
  const lines = rp("assign", at, "--role", role).trimEnd().split("\n");
  const path = lines[0].match(/^assignment (.+)$/)[1];
  assert.ok(lines.length === 1 || /^model .+$/.test(lines[1]), lines.join("\n"));
  return { path, text: readFileSync(path, "utf8"), model: lines[1]?.slice("model ".length) ?? null };
}
const refuse = (role, message, at = abs(PIPELINE)) => {
  const out = run("assign", at, "--role", role);
  assert.equal(out.status, 1, out.stdout);
  assert.equal(out.stdout, "");
  assert.match(out.stderr, message);
  return out;
};

// An assignment's sections by `## ` heading, each the lines under it without the blank ones at its edges; the lines
// above the first heading under "".
function sections(text) {
  const result = {};
  let heading = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) { heading = line.slice(3); result[heading] = []; continue; }
    (result[heading] ??= []).push(line);
  }
  for (const [key, lines] of Object.entries(result)) {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    if (key === "" && !lines.length) delete result[key];
  }
  return result;
}
// A section's fields: each `- <label>: <value>` line, its nested `  - <item>` lines as a list.
function fields(lines) {
  const result = {};
  let last = null;
  for (const line of lines) {
    const item = line.match(/^ {2}- (.*)$/);
    if (item) { result[last] = [...(Array.isArray(result[last]) ? result[last] : []), item[1]]; continue; }
    const field = line.match(/^- ([^:]+):(?: (.*))?$/);
    if (field) { last = field[1]; result[last] = field[2] ?? []; }
  }
  return result;
}
const parse = (text) => {
  assert.doesNotMatch(text, /\{\{/);
  const parsed = sections(text);
  return { headings: Object.keys(parsed), seat: fields(parsed.Seat ?? []), materials: fields(parsed.Materials ?? []), ...parsed };
};
// The lines a template holds between a part's markers, as written.
const partOf = (template, marker) => {
  const lines = readFileSync(join(TEMPLATES, template), "utf8").split("\n");
  const start = lines.indexOf(`{{${marker}}}`), name = marker.slice(1);
  return lines.slice(start + 1, lines.indexOf(`{{/${name}}}`, start)).join("\n");
};

const head = (at = root) => git(at, "rev-parse", "HEAD").trim();
// A worktree at `${root}/.wt-<name>` with `branch` checked out, created from `from` when the branch is new.
function worktree(name, branch, from = null) {
  writeFile(".git/info/exclude", ".wt-*/\n");
  git(root, "worktree", "add", "--quiet", ...(from ? ["-b", branch] : []), `${root}/.wt-${name}`, ...(from ? [from] : [branch]));
  return realpathSync(`${root}/.wt-${name}`);
}
const reviewLane = (id) => JSON.parse(rp("review", abs(PIPELINE), "--lane", id, "--json"));
const in_ = (at, rel) => join(at, PIPELINE, rel);

const PROFILE_HEADINGS = ["Seat", "Mode", "Materials", "Threads addressed to you", "Write to", "Guardrails", "Resources", "Commit format"];

describe("assign", () => {
  useRepo();

  describe("writes a producer's or the implementer's assignment for the turn the frontier gives it", () => {
    it("produce: the mode, the root's later inputs, the pipeline worktree's seat and tip, and no optional part", () => {
      conventions();
      pipeline(1);
      write("0-intent/constraint-1.md", later(DESIGN));
      write("0-intent/proposal-2.md", later(DESIGN));
      write("0-intent/failure-3.md", later(NOTES));
      const tip = commitAll("later inputs");
      const { path, text, model } = assign("design-doc-producer");
      const at = realpathSync(root), parsed = parse(text);
      assert.equal(path, git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/design-doc-producer.md").trim());
      assert.deepEqual(parsed.headings, PROFILE_HEADINGS);
      assert.deepEqual(Object.keys(parsed.seat), ["Worktree", "Branch", "Turn commit", "Supporting folder", "Subagent model"]);
      assert.deepEqual([parsed.seat.Worktree, parsed.seat.Branch, parsed.seat["Turn commit"], parsed.seat["Supporting folder"]], [at, "demo", tip, `${in_(at, "2-design-doc/design-doc")}/`]);
      assert.deepEqual(parsed.Mode, ["Produce"]);
      assert.deepEqual(parsed.materials, { Intent: in_(at, INTENT), Spec: in_(at, SPEC), "Later inputs": [in_(at, "0-intent/constraint-1.md"), in_(at, "0-intent/proposal-2.md")] });
      assert.deepEqual(parsed["Threads addressed to you"], ["none"]);
      assert.deepEqual(parsed["Write to"], [in_(at, DESIGN)]);
      assert.equal(model, null);
    });

    it("implement, then respond: each turn replaces the last, with the threads awaiting the role and each changed input since the artifact last changed", () => {
      conventions();
      pipeline(2);
      write("0-intent/constraint-1.md", later(NOTES));
      commitAll("constraint");
      const first = parse(assign("implementer").text);
      assert.deepEqual(first.Mode, ["Implement"]);
      assert.deepEqual(Object.keys(first.materials), ["Intent", "Spec", "Design doc", "Later inputs"]);
      write(NOTES, withFrontmatter({ status: "done" }, "\n# Notes\n"));
      land(NOTES);
      const notesChanged = git(root, "log", "-1", "--format=%H", "--", P(NOTES)).trim();
      revise(DESIGN);
      const awaiting = thread({ n: 1, ...REVIEW("default"), messages: [["reviewer-default", "abc1234"]] });
      const tip = commitAll("work");
      const { path, text } = assign("implementer");
      const at = realpathSync(root), second = parse(text);
      assert.equal(readFileSync(path, "utf8"), text);
      assert.deepEqual(second.headings, PROFILE_HEADINGS);
      assert.equal(second.seat["Turn commit"], tip);
      assert.equal(second.seat["Base branch"], "main");
      assert.deepEqual(second.Mode, ["Respond"]);
      assert.deepEqual(second.materials, {
        Intent: in_(at, INTENT), Spec: in_(at, SPEC), "Design doc": in_(at, DESIGN), "Later inputs": in_(at, "0-intent/constraint-1.md"),
        "Changed inputs": `${in_(at, DESIGN)} — changed since ${notesChanged}`,
      });
      assert.deepEqual(second["Threads addressed to you"], [in_(at, awaiting)]);
    });

    it("respond without changed inputs: the thread alone, and Changed inputs none", () => {
      conventions();
      pipeline(3);
      const awaiting = thread(TO_SPEC);
      commitAll("thread");
      const parsed = parse(assign("spec-producer").text), at = realpathSync(root);
      assert.deepEqual(parsed.Mode, ["Respond"]);
      assert.deepEqual(parsed.materials, { Intent: in_(at, INTENT), "Later inputs": "none", "Changed inputs": "none" });
      assert.deepEqual(parsed["Threads addressed to you"], [in_(at, awaiting)]);
    });

    it("a production lane: its brief, its worktree's seat and tip, its candidate, and the intent alone, in produce and respond", () => {
      conventions();
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a", brief: ["Read for what it demands.", "", "Every outcome."] }, { profile: "spec-producer", id: "b" }] });
      write("0-intent/constraint-1.md", later(SPEC));
      const tip = commitAll("constraint");
      const wt = worktree("a", "demo-spec-a", tip);
      writeFile(`.wt-a/${PIPELINE}/scratch.txt`, "x\n");
      git(wt, "add", "-A");
      git(wt, "commit", "--quiet", "-m", "lane work");
      const { path, text } = assign("spec-producer-a");
      const parsed = parse(text);
      assert.equal(path, git(wt, "rev-parse", "--path-format=absolute", "--git-path", "rp/spec-producer.md").trim());
      assert.deepEqual(parsed.headings, ["Seat", "Mode", "Brief", ...PROFILE_HEADINGS.slice(2)]);
      assert.deepEqual([parsed.seat.Worktree, parsed.seat.Branch, parsed.seat["Turn commit"]], [wt, "demo-spec-a", head(wt)]);
      assert.equal(parsed.seat["Supporting folder"], `${in_(wt, "1-spec/lanes/a/spec")}/`);
      assert.deepEqual(parsed.Brief, ["Read for what it demands.", "", "Every outcome."]);
      assert.deepEqual(parsed.Mode, ["Produce"]);
      assert.deepEqual(parsed.materials, { Intent: in_(wt, INTENT) });
      assert.deepEqual(parsed["Write to"], [in_(wt, "1-spec/lanes/a/spec.md")]);
      writeFile(`.wt-a/${PIPELINE}/1-spec/lanes/a/spec.md`, "# Candidate\n");
      git(wt, "add", "-A");
      git(wt, "commit", "--quiet", "-m", "candidate");
      rp("stamp", in_(wt, "1-spec/lanes/a/spec.md"), "--at", "HEAD");
      git(wt, "add", "-A");
      git(wt, "commit", "--quiet", "-m", "land");
      const candidateChanged = git(wt, "log", "-1", "--format=%H", "--", P("1-spec/lanes/a/spec.md")).trim();
      git(root, "merge", "--quiet", "--no-edit", "demo-spec-a");
      write(INTENT, `${read(INTENT)}More.\n`);
      commitAll("intent changes");
      git(wt, "merge", "--quiet", "--no-edit", "demo");
      const respond = parse(assign("spec-producer-a").text);
      assert.deepEqual(respond.Mode, ["Respond"]);
      assert.deepEqual(respond.materials, { Intent: in_(wt, INTENT), "Changed inputs": `${in_(wt, INTENT)} — changed since ${candidateChanged}` });
      worktree("b", "demo-spec-b", head());
      assert.equal(parse(assign("spec-producer-b").text).headings.includes("Brief"), false, "a lane without a brief");
    });

    it("consolidate: every lane's candidate in the pipeline worktree, the root's later inputs, and the root as Write to", () => {
      conventions();
      pipeline(1, { lanes: [{ profile: "design-doc-producer", id: "x" }, { profile: "design-doc-producer", id: "y" }] });
      for (const id of ["x", "y"]) {
        write(`2-design-doc/lanes/${id}/design-doc.md`, `# ${id}\n`);
        land(`2-design-doc/lanes/${id}/design-doc.md`);
      }
      const parsed = parse(assign("design-doc-producer").text), at = realpathSync(root);
      assert.deepEqual(parsed.Mode, ["Consolidate"]);
      assert.deepEqual(parsed.materials, {
        Intent: in_(at, INTENT), Spec: in_(at, SPEC), "Later inputs": "none",
        "Lane candidates": [`x — ${in_(at, "2-design-doc/lanes/x/design-doc.md")}`, `y — ${in_(at, "2-design-doc/lanes/y/design-doc.md")}`],
      });
      assert.deepEqual(parsed["Write to"], [in_(at, DESIGN)]);
    });

    const refusals = [
      ["a role the frontier does not wake", () => pipeline(1), "implementer", /assign: the frontier does not wake implementer: produce 2-design-doc\/design-doc.md/],
      ["a lane whose worktree is missing", () => pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] }), "spec-producer-a", /assign: no worktree has demo-spec-a checked out/],
      ["a role outside the grammar", () => pipeline(1), "implementer-a", /assign: --role names no role <profile>\[-<lane>\]: implementer-a/],
      ["owner", () => pipeline(1), "owner", /assign: --role names no role/],
      ["a detached pipeline worktree", () => { pipeline(1); git(root, "checkout", "--quiet", "--detach"); }, "design-doc-producer", /has no branch checked out/],
    ];
    for (const [what, setup, role, message] of refusals)
      it(`stops on ${what}, writing nothing`, () => {
        conventions();
        setup();
        refuse(role, message);
        assert.equal(existsSync(join(root, ".git/rp")), false);
      });
  });

  describe("writes a review lane's request", () => {
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

    it("first turn: the branch, review base, and change rp review built, every later input, the brief or none, and a new thread", () => {
      reviewable();
      thread({ n: 4, status: "withdrawn", ...REVIEW("a"), messages: [["reviewer-a", "abc1234"]] });
      commitAll("an earlier review, withdrawn");
      const built = reviewLane("a");
      const wt = worktree("a", built.branch);
      const { path, text, model } = assign("reviewer-a");
      assert.equal(path, git(wt, "rev-parse", "--path-format=absolute", "--git-path", "rp/reviewer.md").trim());
      for (const value of [`\`${built.branch}\``, `\`${built.base}\``, `## reviewer-a — ${built.change}`, in_(wt, INTENT), in_(wt, "0-intent/constraint-2.md"), in_(wt, "0-intent/proposal-1.md"),
        "Look for security holes.", in_(wt, "threads/5-reviewer-a-implementer-implementation.md")])
        assert.ok(text.includes(value), `${value} in:\n${text}`);
      assert.doesNotMatch(text, /\{\{|reviewer\.diff/);
      assert.equal(model, null);
      assert.equal(existsSync(join(dirname(path), "reviewer.diff")), false);
      const wtB = worktree("b", reviewLane("b").branch);
      const other = assign("reviewer-b").text;
      assert.ok(other.includes(partOf("reviewer-first.md", "^brief")), "the default request");
      assert.ok(other.includes(in_(wtB, "threads/5-reviewer-b-implementer-implementation.md")));
    });

    it("later turn: the lane's open review thread awaiting it, and the diff from the change its last message names to this turn's change", () => {
      reviewable();
      const first = reviewLane("a");
      const wt = worktree("a", first.branch);
      const reviewThread = thread({ n: 2, ...REVIEW("a"), messages: [["reviewer-a", first.change], ["implementer", head()]] });
      writeFile("src/app.js", "export const a = 3;\n");
      write("1-spec/spec/evidence.txt", "pipeline-only\n");
      commitAll("answer");
      const second = reviewLane("a");
      const { path, text } = assign("reviewer-a");
      const diff = join(dirname(path), "reviewer.diff");
      for (const value of [in_(wt, reviewThread), diff, `## reviewer-a — ${second.change}`, `\`${second.base}\``]) assert.ok(text.includes(value), `${value} in:\n${text}`);
      assert.equal(readFileSync(diff, "utf8"), git(root, "diff", first.change, second.change, "--", ".", ":(exclude).pipelines"));
      assert.match(readFileSync(diff, "utf8"), /export const a = 3/);
      thread({ n: 2, status: "approved", ...REVIEW("a"), messages: [["reviewer-a", first.change], ["implementer", head()], ["reviewer-a", second.change]] });
      thread({ n: 3, ...REVIEW("a"), messages: [["reviewer-a", second.change]] });
      commitAll("approved, then reopened as a new thread awaiting the implementer");
      thread({ n: 3, ...REVIEW("a"), messages: [["reviewer-a", second.change], ["implementer", head()]] });
      commitAll("answered");
      reviewLane("a");
      assert.ok(assign("reviewer-a").text.includes(in_(wt, "threads/3-reviewer-a-implementer-implementation.md")));
    });

    it("stops when the lane worktree is not at a change rp review built", () => {
      reviewable();
      const wt = worktree("a", reviewLane("a").branch);
      git(wt, "commit", "--quiet", "--allow-empty", "-m", "not a change");
      refuse("reviewer-a", new RegExp(`assign: ${wt} is at ${head(wt)}, not at a change rp review built: run rp review --lane a`));
    });
  });

  it("lists under Malformed files the INVALID lines of the files each role writes, and wakes only those roles", () => {
    conventions();
    pipeline(3);
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    const rejected = thread({ n: 2, ...REVIEW("default"), status: "pending" });
    const toOwner = thread({ n: 3, ...TO_OWNER, status: "pending" });
    commitAll("malformed files");
    const implementer = parse(assign("implementer").text);
    assert.deepEqual(implementer.headings, [...PROFILE_HEADINGS.slice(0, 4), "Malformed files", ...PROFILE_HEADINGS.slice(4)]);
    assert.deepEqual(implementer["Malformed files"], [`INVALID ${NOTES}: unexpected frontmatter key: owner`, `INVALID ${rejected}: status must be one of open | approved | withdrawn | answered | disagreement`]);
    assert.deepEqual([implementer.Mode, implementer["Threads addressed to you"], implementer.materials["Changed inputs"]], [["Respond"], ["none"], "none"]);
    assert.deepEqual(parse(assign("spec-producer").text)["Malformed files"], [`INVALID ${toOwner}: status must be one of open | approved | withdrawn | answered | disagreement`]);
    const wt = worktree("default", reviewLane("default").branch);
    const request = assign("reviewer-default").text;
    assert.ok(request.includes(`INVALID ${rejected}: status must be`));
    assert.doesNotMatch(request, /INVALID 3-implementation|INVALID threads\/3-/);
    assert.ok(request.includes(in_(wt, rejected)), "the lane's rejected review thread is its review thread");
    refuse("design-doc-producer", /assign: the frontier does not wake design-doc-producer: INVALID 3-implementation\/notes.md; INVALID threads\/2-[^;]+; INVALID threads\/3-/);
  });

  describe("carries the project's conventions", () => {
    const GUARDRAILS = { tests: { rule: "Run the tests.", profiles: ["implementer", "reviewer"] }, docs: { rule: ["Follow the glossary.", "", "- Every term."], profiles: ["implementer"] } };
    const RESOURCES = { suite: { resource: "The suite.", profiles: ["spec-producer", "design-doc-producer", "implementer", "reviewer"] } };

    it("each guardrail and resource whose profiles include the role's, under its name with its text, the same in every lane, or none", () => {
      conventions({ guardrails: GUARDRAILS, resources: RESOURCES, "commit-format": ["Imperative.", "", "- `Add spec (spec-producer)`"] });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] });
      const tip = commitAll("lanes");
      worktree("a", "demo-spec-a", tip);
      const lane = parse(assign("spec-producer-a").text);
      assert.deepEqual(lane.Guardrails, ["none"]);
      assert.deepEqual(lane.Resources, ["### suite", "", "- resource: The suite."]);
      assert.deepEqual(lane["Commit format"], ["Imperative.", "", "- `Add spec (spec-producer)`"]);
      pipeline(2);
      const implementer = parse(assign("implementer").text);
      assert.deepEqual(implementer.Guardrails, ["### tests", "", "- rule: Run the tests.", "", "### docs", "", "- rule: Follow the glossary.", "", "  - Every term."]);
      assert.deepEqual(implementer.Resources, lane.Resources);
    });

    it("an imperative subject line as the commit format when the project sets none", () => {
      conventions();
      pipeline(2);
      assert.deepEqual(parse(assign("implementer").text)["Commit format"], ["An imperative subject line."]);
    });

    it("the main checkout's conventions, with .rp.local.md overriding and adding entries by name, for a role seated in a linked worktree", () => {
      pipeline(2);
      git(root, "checkout", "--quiet", "main");
      conventions({ guardrails: GUARDRAILS, resources: RESOURCES, "commit-format": "Committed." });
      local({ guardrails: { tests: { rule: "Run the local tests.", profiles: ["implementer"] } }, resources: { browser: { resource: "A local browser.", profiles: ["implementer"] } } });
      const wt = worktree("pipeline", "demo");
      writeFile(".wt-pipeline/.rp.md", "---\n{\"conventions\": 8, \"commit-format\": \"The worktree's own.\"}\n---\n");
      const parsed = parse(assign("implementer", in_(wt, "")).text);
      assert.equal(parsed.seat.Worktree, wt);
      assert.deepEqual(parsed.Guardrails, ["### tests", "", "- rule: Run the local tests.", "", "### docs", "", "- rule: Follow the glossary.", "", "  - Every term."]);
      assert.deepEqual(parsed.Resources, ["### suite", "", "- resource: The suite.", "", "### browser", "", "- resource: A local browser."]);
      assert.deepEqual(parsed["Commit format"], ["Committed."]);
    });
  });

  describe("names models as the run writes them", () => {
    const AGENTS = {
      "spec-producer": { model: "opus", subagents: "sonnet", lanes: { a: { model: "sonnet" }, b: { subagents: "openai/gpt-6-astra#high" } } },
      reviewer: { model: "opus", lanes: { astra: { model: "astra", subagents: "luna" }, default: {} } },
    };

    it("a lane's model and subagent model, else its profile's, or none: no model line, and the role's own model for its subagents", () => {
      conventions();
      pipeline(0, { agents: AGENTS });
      const tip = commitAll("lanes");
      worktree("a", "demo-spec-a", tip);
      worktree("b", "demo-spec-b", tip);
      const a = assign("spec-producer-a"), b = assign("spec-producer-b");
      assert.deepEqual([a.model, parse(a.text).seat["Subagent model"]], ["sonnet", "sonnet"]);
      assert.deepEqual([b.model, parse(b.text).seat["Subagent model"]], ["opus", "openai/gpt-6-astra#high"]);
      pipeline(2, { agents: AGENTS });
      const implementer = assign("implementer");
      assert.equal(implementer.model, null);
      assert.ok(implementer.text.includes(partOf("implementer.md", "^subagent-model")));
      pipeline(3, { agents: AGENTS });
      for (const [id, model, subagents] of [["astra", "astra", "luna"], ["default", "opus", null]]) {
        worktree(id, reviewLane(id).branch);
        const request = assign(`reviewer-${id}`);
        assert.equal(request.model, model);
        if (subagents) assert.ok(request.text.includes(partOf("reviewer-first.md", "#subagent-model").replace("{{subagent-model}}", subagents)));
        else assert.ok(request.text.includes(partOf("reviewer-first.md", "^subagent-model")));
      }
    });

    it("a run's model over the Agents convention's, and the same assignment whatever the conventions say for particular tools", () => {
      conventions({ agents: { implementer: { model: "opus", subagents: "sonnet" } } }, "\n## opencode\n\n`sonnet` is `claude-agent/sonnet#xhigh`.\n");
      writeFile(".rp.opencode.md", "| `haiku` | `claude-agent/haiku#xhigh` |\n");
      writeFile(".rp.claude-code.md", "Use `sonnet` for `haiku`.\n");
      pipeline(2, { agents: { implementer: { model: "opus", subagents: "haiku" } } });
      const env = (extra) => ({ ...process.env, OPENCODE: "1", CLAUDECODE: "", ...extra });
      const under = (extra) => {
        const out = spawnSync(process.execPath, [RP, "assign", abs(PIPELINE), "--role", "implementer"], { cwd: tmpdir(), encoding: "utf8", env: env(extra) });
        assert.equal(out.status, 0, out.stderr);
        return [out.stdout, readFileSync(out.stdout.split("\n")[0].slice("assignment ".length))];
      };
      const [opencode, claudeCode] = [under({}), under({ OPENCODE: "", CLAUDECODE: "1" })];
      assert.equal(opencode[0], claudeCode[0]);
      assert.ok(opencode[1].equals(claudeCode[1]));
      assert.equal(parse(opencode[1].toString()).seat["Subagent model"], "haiku");
      assert.match(opencode[0], /^model opus$/m);
    });
  });

  describe("expands placeholders in the texts it carries", () => {
    const FACTS = "{pipeline-slug} {role} {profile} [{lane}] {worktree} {branch} {base}";

    it("each vocabulary fact and declared variable to the role's value, and lists no vocabulary", () => {
      conventions({
        variables: { agent: "{pipeline-slug}-{role}" },
        guardrails: { facts: { rule: FACTS, profiles: ["implementer", "reviewer", "spec-producer"] } },
        resources: { env: { resource: "The environment `{agent}`.", profiles: ["implementer", "reviewer", "spec-producer"] } },
        "commit-format": "End with ({role}).",
      });
      pipeline(0, { lanes: [{ profile: "spec-producer", id: "a" }] });
      const lane = worktree("a", "demo-spec-a", commitAll("lanes"));
      const spec = parse(assign("spec-producer-a").text);
      assert.deepEqual(spec.Guardrails.at(-1), `- rule: demo spec-producer-a spec-producer [a] ${lane} demo-spec-a main`);
      assert.deepEqual(spec.Resources.at(-1), "- resource: The environment `demo-spec-producer-a`.");
      assert.deepEqual(spec["Commit format"], ["End with (spec-producer-a)."]);
      pipeline(2, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const implementer = parse(assign("implementer").text), at = realpathSync(root);
      assert.deepEqual(implementer.Guardrails.at(-1), `- rule: demo implementer implementer [] ${at} demo main`);
      assert.deepEqual(implementer.Resources.at(-1), "- resource: The environment `demo-implementer`.");
      assert.equal(implementer.headings.at(-1), "Commit format");
      pipeline(3, { lanes: [{ profile: "reviewer", id: "astra" }] });
      const wt = worktree("astra", reviewLane("astra").branch);
      const request = assign("reviewer-astra").text;
      assert.ok(request.includes(`- rule: demo reviewer-astra reviewer [astra] ${wt} demo-review-astra main`));
      assert.ok(request.includes("The environment `demo-reviewer-astra`."));
      assert.equal(request.includes(partOf("reviewer-first.md", "#vocabulary").split("\n").find(Boolean)), false);
    });

    it("keeps a placeholder that names neither as written, and then lists each vocabulary fact with the role's value", () => {
      conventions({ resources: { ticket: { resource: "Open {ticket} for {role}.", profiles: ["implementer", "reviewer"] } } });
      pipeline(2);
      const parsed = parse(assign("implementer").text), at = realpathSync(root);
      assert.deepEqual(parsed.Resources.at(-1), "- resource: Open {ticket} for implementer.");
      assert.equal(parsed.headings.at(-1), "Placeholders");
      assert.deepEqual(fields(parsed.Placeholders), {
        "`{pipeline-slug}`": "demo", "`{role}`": "implementer", "`{profile}`": "implementer", "`{lane}`": [], "`{worktree}`": at, "`{branch}`": "demo", "`{base}`": "main",
      });
      pipeline(3);
      worktree("default", reviewLane("default").branch);
      assert.match(assign("reviewer-default").text, /Open \{ticket\} for reviewer-default\.[\s\S]*- `\{lane\}`: default\n/);
    });

    it("leaves text outside the placeholder grammar as written, template syntax included, and lists no vocabulary", () => {
      const text = "{{agent}} {Agent} { role } {agent_name} {{#guardrails}} {{/guardrails}} {{^brief}} $1 {";
      conventions({ variables: { agent: "{role}" }, guardrails: { raw: { rule: [text, "{{commit-format}}"], profiles: ["implementer"] } }, "commit-format": "{{vocabulary}}" });
      pipeline(2);
      const parsed = parse(assign("implementer").text.replace(/\{\{/g, "<<"));
      assert.deepEqual(parsed.Guardrails, ["### raw", "", `- rule: ${text.replace(/\{\{/g, "<<")}`, "  <<commit-format}}"]);
      assert.deepEqual(parsed["Commit format"], ["<<vocabulary}}"]);
      assert.equal(parsed.headings.at(-1), "Commit format");
    });
  });

  describe("stops on malformed conventions data, writing nothing", () => {
    const VALID = { guardrails: { tests: { rule: "Run.", profiles: ["implementer"] } } };
    // [what, how the main checkout's files are broken, what the message names]
    const malformations = [
      [".rp.md missing", () => rmSync(abs(".rp.md")), /cannot read .*\/\.rp\.md: missing/],
      [".rp.md without frontmatter", () => writeFile(".rp.md", "# Conventions\n"), /\.rp\.md: no frontmatter/],
      ["frontmatter that does not parse", () => writeFile(".rp.md", "---\n{\n  \"conventions\": 8,\n}\n---\n"), /\.rp\.md: frontmatter is not valid JSON: .+/],
      ["an earlier version", () => conventions({ conventions: 7 }), /\.rp\.md: conventions: 7 is not the current version, 8/],
      ["no version", () => writeFile(".rp.md", "---\n{}\n---\n"), /\.rp\.md: conventions: null is not the current version, 8/],
      ["an unknown key", () => conventions({ guardrail: {} }), /\.rp\.md: frontmatter: unexpected key: guardrail/],
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
      [".rp.local.md naming the version", () => local({ conventions: 8 }), /\.rp\.local\.md: frontmatter: unexpected key: conventions/],
      [".rp.local.md with a malformed entry", () => local({ resources: { browser: { resource: "A browser.", profiles: ["builder"] } } }), /\.rp\.local\.md: resources\.browser\.profiles: "builder" is no profile/],
      [".rp.local.md whose frontmatter does not parse", () => writeFile(".rp.local.md", "---\nartifact-storage: fork\n---\n"), /\.rp\.local\.md: frontmatter is not valid JSON/],
    ];
    for (const [what, breakIt, message] of malformations)
      it(`on ${what}`, () => {
        conventions(VALID);
        pipeline(2);
        const { path, text } = assign("implementer");
        breakIt();
        refuse("implementer", message);
        assert.equal(readFileSync(path, "utf8"), text);
      });

    it("accepts a .rp.local.md without frontmatter, which overrides no entry", () => {
      conventions(VALID);
      writeFile(".rp.local.md", "# Local\n\nArtifact storage: a fork.\n");
      pipeline(2);
      assert.deepEqual(parse(assign("implementer").text).Guardrails, ["### tests", "", "- rule: Run."]);
    });
  });

  it("writes every role's assignment from this repository's .rp.md and a run confirmed with its Agents defaults", () => {
    const committed = readFileSync(join(dirname(RP), "../../../.rp.md"));
    const data = JSON.parse(committed.toString("utf8").split("---\n")[1]);
    writeFile(".rp.md", committed);
    const config = { agents: data.agents };
    const carried = (key, field, name) => [`### ${name}`, "", `- ${field}: ${data[key][name][field]}`];
    pipeline(0, config);
    const tip = commitAll("lanes");
    const lanes = Object.fromEntries(Object.keys(data.agents["spec-producer"].lanes).map((id) => [id, worktree(id, `demo-spec-${id}`, tip)]));
    assert.deepEqual(Object.keys(lanes), ["demands", "omits"]);
    const demands = assign("spec-producer-demands"), parsed = parse(demands.text);
    assert.deepEqual(parsed.headings, ["Seat", "Mode", "Brief", ...PROFILE_HEADINGS.slice(2)]);
    assert.deepEqual(Object.keys(parsed.seat), ["Worktree", "Branch", "Turn commit", "Supporting folder", "Subagent model"]);
    assert.deepEqual([demands.model, parsed.seat["Subagent model"]], ["opus", "sonnet"]);
    assert.deepEqual(parsed.Brief, [data.agents["spec-producer"].lanes.demands.brief]);
    assert.deepEqual(parsed.materials, { Intent: in_(lanes.demands, INTENT) });
    assert.deepEqual(parsed.Guardrails, ["none"]);
    assert.deepEqual(parsed.Resources, carried("resources", "resource", "test suite and scripts"));
    assert.deepEqual(parsed["Commit format"], data["commit-format"]);
    assert.deepEqual([assign("spec-producer-omits").model, parse(assign("spec-producer-omits").text).seat["Subagent model"]], ["sonnet", "sonnet"]);
    for (const id of Object.keys(lanes)) {
      write(`1-spec/lanes/${id}/spec.md`, `# ${id}\n`);
      land(`1-spec/lanes/${id}/spec.md`);
    }
    assert.equal(assign("spec-producer").model, "opus");
    pipeline(1, config);
    assert.equal(parse(assign("design-doc-producer").text).seat["Subagent model"], "sonnet");
    pipeline(2, config);
    const implementer = parse(assign("implementer").text);
    assert.deepEqual(implementer.Guardrails, [...carried("guardrails", "rule", "tests"), "", ...carried("guardrails", "rule", "documentation")]);
    assert.deepEqual(implementer.Resources, carried("resources", "resource", "test suite and scripts"));
    pipeline(3, config);
    for (const [id, model, subagents] of [["default", "opus", "sonnet"], ["astra", "astra", "luna"]]) {
      worktree(id, reviewLane(id).branch);
      const request = assign(`reviewer-${id}`);
      assert.equal(request.model, model);
      for (const line of [`\`${subagents}\``, ...carried("guardrails", "rule", "documentation"), ...carried("resources", "resource", "test suite and scripts")]) assert.ok(request.text.includes(line), line);
    }
  });

  it("renders lists, parts, and flags as the template syntax defines them", () => {
    const copy = mkdtempSync(join(tmpdir(), "rp-skill-"));
    try {
      mkdirSync(join(copy, "scripts"));
      copyFileSync(RP, join(copy, "scripts/rp.mjs"));
      mkdirSync(join(copy, "templates"));
      writeFileSync(join(copy, "templates/implementer.md"), [
        "inline-one: {{later-inputs}}", "inline-none: {{threads}}", "inline-many: {{changed-inputs}}",
        "{{#brief}}", "kept when something", "{{/brief}}", "{{^brief}}", "kept when nothing", "{{/brief}}",
        "{{#respond}}", "kept on the flag", "{{/respond}}", "{{#implement}}", "dropped on the flag", "{{/implement}}", "",
      ].join("\n"));
      conventions();
      pipeline(3);
      write("0-intent/constraint-1.md", later(NOTES));
      revise(DESIGN);
      const at = realpathSync(root), notesChanged = git(root, "log", "-1", "--format=%H", "--", P(NOTES)).trim();
      const out = spawnSync(process.execPath, [join(copy, "scripts/rp.mjs"), "assign", abs(PIPELINE), "--role", "implementer"], { cwd: tmpdir(), encoding: "utf8" });
      assert.equal(out.status, 0, out.stderr);
      assert.equal(readFileSync(out.stdout.split("\n")[0].slice("assignment ".length), "utf8"), [
        `inline-one: ${in_(at, "0-intent/constraint-1.md")}`, "inline-none: none", "inline-many:",
        `  - ${in_(at, DESIGN)} — changed since ${notesChanged}`, `  - ${in_(at, "0-intent/constraint-1.md")} — changed since ${notesChanged}`,
        "kept when nothing", "kept on the flag", "",
      ].join("\n"));
    } finally { rmSync(copy, { recursive: true, force: true }); }
  });

  it("stops on a template a slot of which has no value, naming it and writing nothing", () => {
    const copy = mkdtempSync(join(tmpdir(), "rp-skill-"));
    try {
      mkdirSync(join(copy, "scripts"));
      copyFileSync(RP, join(copy, "scripts/rp.mjs"));
      mkdirSync(join(copy, "templates"));
      for (const name of readdirSync(TEMPLATES)) copyFileSync(join(TEMPLATES, name), join(copy, "templates", name));
      writeFileSync(join(copy, "templates/implementer.md"), `${readFileSync(join(TEMPLATES, "implementer.md"), "utf8")}\n{{ticket}}\n`);
      conventions();
      pipeline(2);
      const out = spawnSync(process.execPath, [join(copy, "scripts/rp.mjs"), "assign", abs(PIPELINE), "--role", "implementer"], { cwd: tmpdir(), encoding: "utf8" });
      assert.equal(out.status, 1);
      assert.match(out.stderr, /templates\/implementer\.md:\d+: \{\{ticket\}\} has no value/);
      assert.equal(existsSync(git(root, "rev-parse", "--path-format=absolute", "--git-path", "rp/implementer.md").trim()), false);
    } finally { rmSync(copy, { recursive: true, force: true }); }
  });
});
