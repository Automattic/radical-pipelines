import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, parseFrontmatter, renderFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { PIPELINE, git, P, write, read, rp, root, lane, standard, configure, check, SPEC, checkWithoutBase, pairs, registered, registeredVerdict, stampSpec, approveSpec, useFixture } from "./fixture.mjs";

describe("rp identity and stamps", () => {
  useFixture();

  test("identity is the body's hash: stamping never changes it", () => {
    const before = identity(read(root, "1-spec/spec.md"), "1-spec/spec.md");
    stampSpec();
    rp(root, "stamp", P("1-spec/spec.md"), "--mirror");
    assert.equal(identity(read(root, "1-spec/spec.md"), "1-spec/spec.md"), before);
    assert.match(read(root, "1-spec/spec.md"), /"pins": \[\n    "0-intent\/intent\.md@[0-9a-f]{12}"/);
  });

  test("empty frontmatter preserves a dependency-free task's body identity", () => {
    const body = "# build-task-1\n\ndepends-on: none\n";
    const expected = execFileSync("git", ["hash-object", "--stdin"], { input: body, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "3-build/tasks/build-task-1.md", body);

    rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");

    const stamped = read(root, "3-build/tasks/build-task-1.md");
    const parsed = parseFrontmatter(stamped);
    assert.deepEqual(parsed.data, new Map());
    assert.equal(parsed.body, body);
    assert.equal(identity(stamped), expected);
  });

  for (const [name, rel, body, flags] of [
    ["no declarations", "3-build/tasks/build-task-1.md", "# build-task-1\n\nImplement the change.\n", ["--mirror"]],
    ["empty frontmatter", "3-build/tasks/build-task-1.md", "---\n{}\n---\n# build-task-1\n", ["--mirror"]],
    ["fenced declarations", "0-intent/notes.md", "# Notes\n\n```text\nverdict: not a verdict\n```\n", ["--mirror"]],
    ["no flags", "0-intent/notes.md", "# Notes\n", []],
  ]) test(`empty stamp projection: ${name} succeeds without writing`, () => {
    write(root, rel, body);
    const path = join(root, P(rel));
    const before = statSync(path, { bigint: true });
    assert.equal(rp(root, "stamp", P(rel), ...flags), `nothing to mirror ${P(rel)}\n`);
    assert.equal(read(root, rel), body);
    const after = statSync(path, { bigint: true });
    assert.equal(after.mtimeNs, before.mtimeNs);
    assert.equal(after.ctimeNs, before.ctimeNs);
  });

  test("empty stamp projection: declared dependencies still produce mirrors", () => {
    const rel = "3-build/tasks/build-task-2.md", body = "# build-task-2\n\ndepends-on: build-task-1\n";
    write(root, rel, body);
    assert.equal(rp(root, "stamp", P(rel), "--mirror"), `stamped ${P(rel)}\n`);
    const parsed = parseFrontmatter(read(root, rel));
    assert.deepEqual(parsed.data.get("depends-on"), ["build-task-1"]);
    assert.equal(parsed.body, body);
  });

  test("empty stamp projection: invalid fixed lines still fail without writing", () => {
    const rel = "3-build/tasks/build-task-1.md", body = "# build-task-1\n\ndepends-on: maybe\n";
    write(root, rel, body);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /INVALID depends-on:/);
      assert.doesNotMatch(error.stdout, /nothing to mirror/);
      return true;
    });
    assert.equal(read(root, rel), body);
  });

  test("a body edit makes a pin stale; a frontmatter edit does not", () => {
    stampSpec();
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    const intent = parseFrontmatter(read(root, "0-intent/intent.md"));
    intent.data.set("note", "frontmatter only");
    write(root, "0-intent/intent.md", renderFrontmatter(intent.data, intent.body));
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  const INTENT = "0-intent/intent.md";
  const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
  const ISSUE = "origin: issue 7\n", STARTS_FROM = "origin: starts-from feature\n", RE_ATTEMPTS = "origin: re-attempts earlier\n";
  const BELOW = "\n# Intent\n\n## Goal\n\nOriginal intent.\n";

  for (const [name, origins] of [["no origin lines", ""], ["the issue line", ISSUE], ["every origin line", ISSUE + STARTS_FROM + RE_ATTEMPTS], ["CRLF origin lines", ISSUE.replace("\n", "\r\n") + RE_ATTEMPTS.replace("\n", "\r\n")]])
    test(`intent identity with ${name} hashes only the bytes below them`, () => {
      assert.equal(identity(`${origins}${BELOW}`, INTENT), gitHash(BELOW));
      assert.equal(identity(`---\n{}\n---\n${origins}${BELOW}`, INTENT), gitHash(BELOW));
    });

  test("intent identity: origin lines are outside it; every other byte is inside", () => {
    const base = identity(`${ISSUE}${BELOW}`, INTENT);
    for (const origins of [ISSUE + RE_ATTEMPTS, ISSUE + STARTS_FROM + RE_ATTEMPTS, "origin: issue 8\n", `${ISSUE}origin: re-attempts other\n`])
      assert.equal(identity(`${origins}${BELOW}`, INTENT), base, origins);
    for (const text of [
      `${ISSUE}${BELOW}Changed.\n`,
      `${ISSUE}${BELOW}${RE_ATTEMPTS}`,
      `${ISSUE}\n# Intent\n${RE_ATTEMPTS}\n## Goal\n\nOriginal intent.\n`,
      `${ISSUE}origin: elsewhere\n${BELOW}`,
      `\n${ISSUE}${BELOW}`,
    ]) assert.notEqual(identity(text, INTENT), base, text);
    assert.equal(identity(`${ISSUE}${BELOW}`, "0-intent/context.md"), gitHash(`${ISSUE}${BELOW}`));
  });

  test("an origin line added to the intent leaves its pins fresh; a body edit makes them stale", () => {
    stampSpec();
    approveSpec();
    const before = check(root);
    assert.match(before, /artifact 1-spec\/spec\.md\s+FRESH/);
    const intent = read(root, INTENT);
    write(root, INTENT, intent.replace(ISSUE, ISSUE + RE_ATTEMPTS));
    rp(root, "stamp", P(INTENT), "--mirror");
    assert.equal(check(root), before);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "re-attempt");
    assert.match(check(root, "--ref", "HEAD"), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P(INTENT)), "\nChanged.\n");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  test("--mirror copies verdict, brief, target, outcome, prior-finding, depends-on, and every origin line", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nverdict: rejected\n\nspec-finding-1: One\n\nspec-finding-2: Two\n");
    write(root, "1-spec/spec-review-2.md", "# Review\n\nverdict: unsatisfiable\nbrief: security\ntarget: 0-intent/intent.md#intent-goal\n\nspec-finding-1: Recurring\n\nprior-finding: 1-spec/spec-review-1.md#spec-finding-2, resolution failed\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const fm = read(root, "1-spec/spec-review-2.md");
    assert.match(fm, /"verdict": "unsatisfiable"/);
    assert.match(fm, /"brief": "security"/);
    assert.deepEqual(parseFrontmatter(fm).data.get("target"), ["0-intent/intent.md#intent-goal"]);
    assert.deepEqual(parseFrontmatter(fm).data.get("target-identity"), [identity(read(root, "0-intent/intent.md"), "0-intent/intent.md")]);
    assert.match(fm, /"prior-finding": \[\n    "1-spec\/spec-review-1\.md#spec-finding-2"/);
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /"origin": "issue 7"/);
    write(root, "0-intent/intent.md", "origin: issue 7\norigin: starts-from 6-other\n\n# Intent\n\n## Goal\n\nx\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /"origin": \[\n    "issue 7",\n    "starts-from 6-other"/);
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2\n\ndepends-on: build-task-1\n");
    rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror");
    assert.match(read(root, "3-build/tasks/build-task-2.md"), /"depends-on": \[\n    "build-task-1"/);
  });

  test("reviewed pins are immutable; head moves only with pins", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "one");
    stampSpec();
    const head1 = parseFrontmatter(read(root, "1-spec/spec.md")).data.get("head");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "two");
    rp(root, "stamp", P("1-spec/spec.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "1-spec/spec.md")).data.get("head"), head1);
    stampSpec();
    assert.notEqual(parseFrontmatter(read(root, "1-spec/spec.md")).data.get("head"), head1);
  });

  test("malformed frontmatter is reported before its fields are read", () => {
    const cases = [
      ['---\n{"pins":["0-intent/intent.md@abc"]}\n# no close\n', /missing closing --- delimiter/],
      ["---\nnot JSON\n---\n# Spec\n", /invalid JSON/],
      ['---\n{"pins":"one"}\n---\n# Spec\n', /pins must be a list of strings/],
      ['---\n{"pins":[1]}\n---\n# Spec\n', /pins must be a list of strings/],
      ['---\n{"head":[]}\n---\n# Spec\n', /head must be a string/],
      ['---\n{"origin":[]}\n---\n# Spec\n', /origin must be a string or non-empty list of strings/],
      ['---\n{"lane-packages":[["1-spec/lanes/a/spec.md",[],"pins"]]}\n---\n# Spec\n', /consumed lane pins/],
    ];
    for (const [text, reason] of cases) {
      write(root, "1-spec/spec.md", text);
      configure({ targetPhase: 1 });
      const output = check(root);
      assert.match(output, /frontier INVALID FRONTMATTER 1-spec\/spec\.md/);
      assert.match(output, reason);
      assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--mirror"), /INVALID FRONTMATTER/);
    }
    write(root, "0-intent/intent.md", '---\n{"origin":"starts-from main"}\n# no close\n');
    const output = rp(root, "check", PIPELINE);
    assert.match(output, /frontier INVALID FRONTMATTER 0-intent\/intent\.md/);
    assert.doesNotMatch(output, /complete through|commits\s/);
  });

  test("frontmatter accepts only a JSON object with valid field types", () => {
    const valid = parseFrontmatter('---\n{"pins":["a@111111111111"],"head":"222222222222"}\n---\nbody\n');
    assert.deepEqual(valid, {
      data: new Map([["pins", ["a@111111111111"]], ["head", "222222222222"]]),
      body: "body\n",
    });
    for (const value of ["[1]", '"text"', "1", "true", "false", "null"]) {
      const parsed = parseFrontmatter(`---\n${value}\n---\nbody\n`);
      assert.equal(parsed.data, null);
      assert.equal(parsed.body, "body\n");
      assert.match(parsed.error, /frontmatter must be a JSON object/);
    }
    for (const [object, error] of [
      [{ head: 1 }, /head must be a string/],
      [{ head: {} }, /head must be a string/],
      [{ head: false }, /head must be a string/],
      [{ pins: [["a@111111111111"]] }, /pins must be a list of strings/],
      [{ target: [1] }, /target must be a list of strings/],
      [{ origin: [["issue 1"]] }, /origin must be a string or non-empty list of strings/],
      [{ note: 1 }, /note must be a string or list of strings/],
      [{ note: {} }, /note must be a string or list of strings/],
    ]) {
      const parsed = parseFrontmatter(`---\n${JSON.stringify(object)}\n---\nbody\n`);
      assert.equal(parsed.data, null);
      assert.equal(parsed.body, "body\n");
      assert.match(parsed.error, error);
    }
    assert.deepEqual(parseFrontmatter('---\n{"head":"111111111111","head":"222222222222"}\n---\n').data,
      new Map([["head", "222222222222"]]));
  });

  test("stamp rejects malformed frontmatter in every consumed document", () => {
    const malformed = '---\n{"origin":123}\n---\n# Malformed\n';
    const cases = [
      ["pins", "1-spec/spec.md", ["--pin", P("0-intent/bad.md")], "# Spec\n"],
      ["reviewed", "0-intent/notes.md", ["--reviewed", P("0-intent/bad.md")], "# Notes\n"],
      ["targets", "0-intent/proposal-1.md", ["--mirror"], "# Proposal\n\ntarget: 1-spec/spec.md\norigin: issue 8\n"],
    ];
    for (const [name, rel, args, body] of cases) {
      const consumed = name === "targets" ? "1-spec/spec.md" : "0-intent/bad.md";
      write(root, consumed, malformed);
      write(root, rel, body);
      assert.throws(() => rp(root, "stamp", P(rel), ...args), new RegExp(`INVALID FRONTMATTER ${consumed.replaceAll("/", "\\/")}`));
      assert.equal(read(root, rel), body);
    }
  });

  test("invalid lane packages are frontmatter errors", () => {
    const artifact = "1-spec/lanes/a/spec.md";
    const pins = ["0-intent/intent.md@111111111111"];
    const valid = [artifact, pins, pins];
    const cases = [
      ["empty consumed package", [[artifact, [], pins]], /consumed lane pins/],
      ["empty reference package", [[artifact, pins, []]], /reference pins/],
      ["invalid consumed pin", [[artifact, ["bad"], pins]], /consumed lane pins/],
      ["invalid reference pin", [[artifact, pins, ["bad"]]], /reference pins/],
      ["nested consumed value", [[artifact, [["bad"]], pins]], /consumed lane pins/],
      ["nested reference value", [[artifact, pins, [["bad"]]]], /reference pins/],
      ["duplicate artifact", [valid, valid], /duplicate artifact path/],
      ["one invalid entry", [valid, ["1-spec/lanes/b/spec.md", ["bad"], pins]], /consumed lane pins/],
      ["supporting-folder artifact", [["1-spec/spec/evidence.md", pins, pins]], /must name a production lane artifact/],
      ["root artifact", [["1-spec/spec.md", pins, pins]], /must name a production lane artifact/],
      ["supporting-folder consumed pin", [[artifact, ["1-spec/spec/evidence.md@111111111111"], pins]], /consumed lane pins/],
      ["supporting-folder reference pin", [[artifact, pins, ["1-spec/spec/evidence.md@111111111111"]]], /reference pins/],
    ];
    for (const [name, lanePackages, error] of cases) {
      registered("1-spec/spec.md", { "lane-packages": lanePackages }, "# Spec\n");
      configure({ targetPhase: 1 });
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.frontier, "INVALID FRONTMATTER 1-spec/spec.md", name);
      assert.deepEqual(state.artifacts, [], name);
      assert.match(state.contradictions[0].invalid, error, name);
      assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--mirror"), error, name);
    }

    write(root, artifact, "# Candidate\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md"]) }, "# Candidate\n");
    const destination = "# Spec\n";
    write(root, "1-spec/spec.md", destination);
    assert.throws(
      () => rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P(artifact)),
      /INVALID FRONTMATTER 1-spec\/spec\.md: lane-packages reference pins/,
    );
    assert.equal(read(root, "1-spec/spec.md"), destination);
  });

  test("representation contradictions are reported before base-dependent state", () => {
    write(root, "1-spec/spec.md", "# Spec\n\noutcome: not-an-outcome\n");
    const state = checkWithoutBase();
    assert.equal(state.frontier, "INVALID LINE 1-spec/spec.md");
    assert.deepEqual(state.artifacts, []);
    assert.equal("base" in state, false);
  });

  test("stamped strings with punctuation round-trip through frontmatter", () => {
    const brief = "Check: all [paths] # deeply";
    stampSpec();
    write(root, "1-spec/spec-review-1.md", `# Review\n\nverdict: rejected\nbrief: ${brief}\n`);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const stamped = read(root, "1-spec/spec-review-1.md");
    assert.match(stamped, /"brief": "Check: all \[paths\] # deeply"/);
    assert.equal(parseFrontmatter(stamped).data.get("brief"), brief);
    configure({ targetPhase: 1 });
    assert.doesNotMatch(check(root), /INVALID FRONTMATTER/);
  });

  test("pins to non-Markdown files are checked in the working tree and at a ref", () => {
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x61]));
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.txt"));
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin context");
    git(root, "branch", "pinned-context");
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x62]));
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
    assert.match(check(root, "--ref", "pinned-context"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("ref reads preserve non-ASCII paths and tabs", () => {
    writeFileSync(join(root, P("0-intent/café.txt")), "context\n");
    writeFileSync(join(root, P("0-intent/with\ttab.txt")), "context\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/café.txt"), "--pin", P("0-intent/with\ttab.txt"));
    configure({ targetPhase: 1 });
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin path context");
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    assert.match(check(root, "--ref", "HEAD"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("pipeline state: every package member is state, recorded or stamped", () => {
    configure({ targetPhase: 1, lanes: [standard.a] });
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    write(root, "1-spec/spec/evidence.md", "# Evidence\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec/evidence.md")), /not pipeline state: 1-spec\/spec\/evidence\.md/);
    write(root, "1-spec/spec-review-2.md", "# Review\n\nverdict: approved\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-2.md"), ...[...SPEC, "1-spec/spec/evidence.md"].flatMap((path) => ["--reviewed", P(path)]), "--mirror"), /not pipeline state: 1-spec\/spec\/evidence\.md/);
    rmSync(join(root, P("1-spec/spec-review-2.md")));
    const outside = `1-spec/spec/evidence.md@${identity(read(root, "1-spec/spec/evidence.md"), "1-spec/spec/evidence.md")}`;
    for (const [file, fields] of [
      ["1-spec/spec.md", { pins: [...pairs(["0-intent/intent.md"]), outside] }],
      ["1-spec/spec-review-1.md", { reviewed: [...pairs(SPEC), outside], verdict: "approved" }],
      ["1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]), "lane-packages": [["1-spec/lanes/a/spec.md", [outside], [outside]]] }],
    ]) {
      const original = read(root, file);
      registered(file, fields);
      assert.equal(JSON.parse(check(root, "--json")).frontier, `INVALID FRONTMATTER ${file}`, Object.keys(fields).join(", "));
      write(root, file, original);
    }
  });
});
