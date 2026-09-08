import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { identity, parseFrontmatter } from "../../skills/radical-pipelines/scripts/rp.mjs";

const RP = fileURLToPath(new URL("../../skills/radical-pipelines/scripts/rp.mjs", import.meta.url));
const PIPELINE = ".pipelines/demo";

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
const P = (rel) => `${PIPELINE}/${rel}`;

function write(root, rel, contents) {
  const path = join(root, P(rel));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
const read = (root, rel) => readFileSync(join(root, P(rel)), "utf8");

function rp(root, ...args) {
  return execFileSync(process.execPath, [RP, ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
// The artifact base branch is `main`; the pipeline branch, `demo`, is cut from it.
const check = (root, ...args) => rp(root, "check", PIPELINE, "--base", "main", ...args);

function initRepo() {
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(root, "init", "--quiet", "--initial-branch=main");
  git(root, "config", "user.email", "rp-test@example.com");
  git(root, "config", "user.name", "RP Test");
  write(root, "0-intent/intent.md", "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal intent.\n");
  write(root, "1-spec/spec.md", "# Spec\n\nRequirement R1.\n");
  write(root, "1-spec/spec-research.md", "# Spec research\n");
  write(root, "2-design-doc/design-doc.md", "# Design doc\n\nDecision D1.\n");
  write(root, "2-design-doc/design-doc-research.md", "# Design research\n");
  write(root, "3-build/build-plan.md", "# Build plan\n\n## Order\n\n- T1\n- T2 <- T1\n");
  write(root, "3-build/build-plan-research.md", "# Plan research\n");
  rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "-m", "intent");
  git(root, "checkout", "--quiet", "-b", "demo");
  return root;
}

describe("rp state tooling", () => {
  let root;
  const FPS = {
    security: "111111111111",
    a11y: "222222222222",
    event: "333333333333",
    contrarian: "444444444444",
    a: "aaaaaaaaaaaa",
    b: "bbbbbbbbbbbb",
    c: "cccccccccccc",
  };
  beforeEach(() => {
    root = initRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // --- helpers over the model -------------------------------------------------

  const SPEC = ["1-spec/spec.md", "1-spec/spec-research.md", "0-intent/intent.md"];
  // A review names the artifact, its record, and everything the artifact pins.
  const DESIGN = ["2-design-doc/design-doc.md", "2-design-doc/design-doc-research.md", "0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
  const PLAN_BASE = ["3-build/build-plan.md", "3-build/build-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];

  function review(rel, verdict, reviewed, sets = [], extra = "") {
    write(root, rel, `# Review\n\nVerdict: ${verdict}\n${extra}`);
    rp(root, "stamp", P(rel), ...reviewed.flatMap((f) => ["--reviewed", P(f)]), ...sets.flatMap((kv) => ["--set", kv]), "--mirror");
  }
  function registeredReview(rel, reviewed, lane = null) {
    const pins = reviewed.map((path) => `${path}@${identity(parseFrontmatter(read(root, path)).body)}`);
    write(root, rel, `---\nreviewed:\n${pins.map((pin) => `  - ${pin}`).join("\n")}\nverdict: approved\n${lane ? `lane: ${lane}\n` : ""}---\n# Review\n\nVerdict: approved\n`);
  }
  function pairs(paths) {
    return paths.map((path) => `${path}@${identity(read(root, path))}`);
  }
  function registered(rel, fields, body = parseFrontmatter(read(root, rel)).body) {
    write(root, rel, `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}\n`).join("")}---\n${body}`);
  }
  function registeredVerdict(rel, pins, verdict = "approved", lane = null) {
    registered(rel, { reviewed: pins, verdict, ...(lane ? { lane } : {}) }, `# Review\n\nVerdict: ${verdict}\n`);
  }
  function registeredRoot(artifact, reference, reviews, lane = null) {
    const scope = dirname(artifact);
    const binding = pairs([artifact, `${scope}/spec-research.md`, ...reviews]);
    const pins = [...pairs(["0-intent/intent.md"]), ...binding];
    registered("1-spec/spec.md", { pins, "lane-packages": [JSON.stringify([artifact, binding, reference])] });
    const judged = [...pairs(["1-spec/spec.md", "1-spec/spec-research.md"]), ...pins];
    registeredVerdict("1-spec/spec-review-1.md", judged);
    if (lane) registeredVerdict("1-spec/spec-review-security-1.md", judged, "approved", lane);
  }
  function stampSpec() {
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"));
  }
  function approveSpec(wave = 1) {
    review(`1-spec/spec-review-${wave}.md`, "approved", SPEC);
  }
  function stampDesign() {
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"), "--pin", P("1-spec/spec-review-1.md"));
  }
  function approveDesign(wave = 1) {
    review(`2-design-doc/design-doc-review-${wave}.md`, "approved", DESIGN);
  }
  function writeTasks() {
    write(root, "3-build/tasks/T1.md", "# T1: first\n\n- **Depends on:** none\n");
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
  }
  function stampPlan(extraPins = []) {
    rp(root, "stamp", P("3-build/build-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), ...extraPins.flatMap((f) => ["--pin", P(f)]));
  }
  const TASKS = ["3-build/tasks/T1.md", "3-build/tasks/T2.md"];
  function approvePlan(wave = 1) {
    review(`3-build/build-plan-review-${wave}.md`, "approved", [...PLAN_BASE, ...TASKS]);
  }
  function report(id, k, outcome, deps = []) {
    write(root, `3-build/tasks/${id}-report-${k}.md`, `# Task report\n\nOutcome: ${outcome}\n`);
    rp(root, "stamp", P(`3-build/tasks/${id}-report-${k}.md`), "--reviewed", P(`3-build/tasks/${id}.md`), ...deps.flatMap((d) => ["--reviewed", P(`3-build/tasks/${d}.md`)]), "--mirror");
  }
  function approveChain(upTo) {
    stampSpec();
    approveSpec();
    if (upTo < 2) return;
    stampDesign();
    approveDesign();
    if (upTo < 3) return;
    writeTasks();
    stampPlan();
    approvePlan();
  }
  function buildDone() {
    approveChain(3);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    review("3-build/build-review-1.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/T1-report-1.md", "3-build/tasks/T2-report-1.md"]);
  }

  // --- identity and stamps -----------------------------------------------------

  test("identity is the body's hash: stamping never changes it", () => {
    const before = identity(read(root, "1-spec/spec.md"));
    stampSpec();
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=111111111111");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=222222222222");
    assert.equal(identity(read(root, "1-spec/spec.md")), before);
    assert.match(read(root, "1-spec/spec.md"), /pins:\n  - 0-intent\/intent\.md@[0-9a-f]{12}/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "note=no"), /--set accepts only lane/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=no"), /12-character hexadecimal fingerprint/);
  });

  test("empty frontmatter preserves a dependency-free task's body identity", () => {
    const body = "# T1\n\n- **Depends on:** none\n";
    const expected = execFileSync("git", ["hash-object", "--stdin"], { input: body, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "3-build/tasks/T1.md", body);

    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");

    const stamped = read(root, "3-build/tasks/T1.md");
    const parsed = parseFrontmatter(stamped);
    assert.deepEqual(parsed.data, new Map());
    assert.equal(parsed.body, body);
    assert.equal(identity(stamped), expected);
  });

  test("a body edit makes a pin stale; a frontmatter edit does not", () => {
    stampSpec();
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    rp(root, "stamp", P("0-intent/intent.md"), "--set", "lane=111111111111");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE/);
  });

  test("--mirror copies Verdict, Brief, Target, Outcome, Prior finding, Depends on, and every Origin line", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: unsatisfiable\nBrief: security\nTarget: 0-intent/intent.md#goal\n\n### Issue 1\n\nPrior finding: 1-spec/spec-review-0.md#Issue-2, resolution failed\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const fm = read(root, "1-spec/spec-review-1.md");
    assert.match(fm, /verdict: unsatisfiable/);
    assert.match(fm, /brief: security/);
    assert.match(fm, /target: 0-intent\/intent\.md#goal/);
    assert.match(fm, /target-identity: [0-9a-f]{12}/);
    assert.match(fm, /recurs:\n  - 1-spec\/spec-review-0\.md#Issue-2/);
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /origin: issue 7/);
    write(root, "0-intent/intent.md", "Origin: issue 7\nOrigin: starts-from 6-other\n\n# Intent\n\n## Goal\n\nx\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.match(read(root, "0-intent/intent.md"), /origin:\n  - issue 7\n  - starts-from 6-other/);
    write(root, "3-build/tasks/T2.md", "# T2\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.match(read(root, "3-build/tasks/T2.md"), /depends:\n  - T1/);
  });

  test("reviewed pins are immutable; head moves only with pins", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "one");
    stampSpec();
    const head1 = read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1];
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "two");
    rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=abc123def456");
    assert.equal(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
    stampSpec();
    assert.notEqual(read(root, "1-spec/spec.md").match(/head: ([0-9a-f]{12})/)[1], head1);
  });

  test("malformed frontmatter is reported before its fields are read", () => {
    const cases = [
      ["---\npins:\n  - 0-intent/intent.md@abc\n# no close\n", /missing closing --- delimiter/],
      ["---\npins:\nnot yaml\n---\n# Spec\n", /malformed line: not yaml/],
      ["---\npins: one\n---\n# Spec\n", /pins must be a list/],
      ["---\nhead: [unterminated\n---\n# Spec\n", /malformed inline list under head/],
      ["---\npins:\n  - 0-intent\/intent.md@abc\n    - nested\n---\n# Spec\n", /malformed list item/],
      ["---\npins: [[nested]]\n---\n# Spec\n", /list item under pins must be a scalar/],
      ["---\npins:\n  - path: nested\n---\n# Spec\n", /list item under pins must be a scalar/],
      ['---\nhead: "unterminated\n---\n# Spec\n', /malformed double-quoted scalar/],
    ];
    for (const [text, reason] of cases) {
      write(root, "1-spec/spec.md", text);
      const output = check(root, "--target-phase", "1");
      assert.match(output, /frontier INVALID FRONTMATTER 1-spec\/spec\.md/);
      assert.match(output, reason);
      assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--mirror"), /INVALID FRONTMATTER/);
    }
    write(root, "0-intent/intent.md", "---\norigin: starts-from main\n# no close\n");
    const output = rp(root, "check", PIPELINE, "--target-phase", "1");
    assert.match(output, /frontier INVALID FRONTMATTER 0-intent\/intent\.md/);
    assert.doesNotMatch(output, /complete through|commits\s/);
  });

  test("representation contradictions are reported before base-dependent state", () => {
    write(root, "1-spec/spec.md", "# Spec\n\nOutcome: not-an-outcome\n");
    const output = rp(root, "check", PIPELINE, "--base", "missing-branch", "--target-phase", "1", "--json");
    const state = JSON.parse(output);
    assert.equal(state.frontier, "INVALID LINE 1-spec/spec.md");
    assert.deepEqual(state.artifacts, []);
    assert.equal("base" in state, false);
  });

  test("stamped scalars with YAML punctuation round-trip through frontmatter", () => {
    const brief = "Check: all [paths] # deeply";
    stampSpec();
    write(root, "1-spec/spec-review-1.md", `# Review\n\nVerdict: rejected\nBrief: ${brief}\n`);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((path) => ["--reviewed", P(path)]), "--mirror");
    const stamped = read(root, "1-spec/spec-review-1.md");
    assert.match(stamped, /brief: "Check: all \[paths\] # deeply"/);
    assert.equal(parseFrontmatter(stamped).data.get("brief"), brief);
    assert.deepEqual(parseFrontmatter("---\npins: ['a,b', \"c: d\"]\n---\nbody\n").data.get("pins"), ["a,b", "c: d"]);
    assert.doesNotMatch(check(root, "--target-phase", "1"), /INVALID FRONTMATTER/);
  });

  test("pins to non-Markdown files are checked in the working tree and at a ref", () => {
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x61]));
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.txt"));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin context");
    git(root, "branch", "pinned-context");
    writeFileSync(join(root, P("0-intent/context.txt")), Buffer.from([0xff, 0x00, 0x62]));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE/);
    assert.match(check(root, "--ref", "pinned-context", "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  test("ref reads preserve non-ASCII paths and tabs", () => {
    writeFileSync(join(root, P("0-intent/café.txt")), "context\n");
    writeFileSync(join(root, P("0-intent/with\ttab.txt")), "context\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/café.txt"), "--pin", P("0-intent/with\ttab.txt"));
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pin path context");
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    assert.match(check(root, "--ref", "HEAD", "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
  });

  // --- reviews, waves, inputs --------------------------------------------------

  test("a review names its artifact, its record, and the artifact's inputs; a changed input stales the approval", () => {
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-1.md", "approved", ["1-spec/spec.md", "1-spec/spec-research.md"]), /INVALID REVIEW PACKAGE/);
    approveSpec();
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nNew constraint.\n");
    stampSpec(); // a re-synthesis that needed no edit refreshes the pins
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:approved \(stale\)/);
    assert.match(check(root, "--target-phase", "1"), /frontier review wave 1-spec\/spec\.md/);
  });

  test("a changed input makes an approval non-current before artifact reconfirmation", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.artifacts[0].state, "stale");
    assert.equal(state.artifacts[0].lanes[0].fresh, false);
    assert.equal(state.artifacts[0].lanes[0].waveApproved, false);
    assert.equal(state.artifacts[0].approved, false);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("waves are per artifact and shared by lanes; the implicit lane needs no id", () => {
    stampSpec();
    const lanes = `spec=security@${FPS.security}`;
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "rejected", SPEC, [`lane=${FPS.security}`]);
    assert.match(check(root, "--lanes", lanes), /reviews: ·:approved security:rejected/);
    assert.match(check(root, "--lanes", lanes), /frontier adjudicate 1-spec\/spec\.md/);
    review("1-spec/spec-review-security-2.md", "approved", SPEC, [`lane=${FPS.security}`]);
    // wave 2 is open until the implicit lane reports it
    assert.match(check(root, "--lanes", lanes), /frontier review wave 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /APPROVED[\s\S]*frontier complete/);
  });

  test("the episode counts waves since every lane approved together; it is a counter, never a gate", () => {
    stampSpec();
    const lanes = `spec=security@${FPS.security}`;
    for (let w = 1; w <= 3; w++) {
      review(`1-spec/spec-review-${w}.md`, w % 2 ? "approved" : "rejected", SPEC);
      review(`1-spec/spec-review-security-${w}.md`, w % 2 ? "rejected" : "approved", SPEC, [`lane=${FPS.security}`]);
    }
    const out = check(root, "--lanes", lanes);
    assert.match(out, /counter\s+spec: 3 waves this episode/);
    assert.match(out, /frontier adjudicate 1-spec\/spec\.md/);
    assert.doesNotMatch(out, /AUDIT|VALVE/);
  });

  test("an episode counts only approvals current on the live reference", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("1-spec/spec.md")), "\nRequirement R2.\n");
    stampSpec();
    review("1-spec/spec-review-2.md", "rejected", SPEC);
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.counters.spec.episode, 2);
    assert.equal(state.frontier, "adjudicate 1-spec/spec.md");
  });

  test("an unstamped review is the frontier, never a new wave", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    assert.match(check(root), /frontier stamp 1-spec\/spec-review-1\.md/);
  });

  test("a review counts only in its artifact's phase and lane scope", () => {
    stampSpec();
    review("2-design-doc/spec-review-1.md", "approved", SPEC);
    review("1-spec/archive/old/spec-review-1.md", "approved", SPEC);
    review("2-design-doc/a/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    const output = check(root, "--lanes", `design-doc=|a@${FPS.a}`, "--target-phase", "1");
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md[\s\S]*APPROVED/);
    assert.doesNotMatch(output, /claim\s+2-design-doc\/a\/spec-review-1\.md/);
    assert.match(output, /frontier review wave 1-spec\/spec\.md/);
  });

  // --- triggers and claims -----------------------------------------------------

  function amendment(target = "1-spec/spec.md#R1") {
    write(root, "0-intent/1-amendment.md", `# Amendment 1\n\nTarget: ${target}\nOrigin: decision-1\n\n## Request\n\nFix R1.\n`);
    rp(root, "stamp", P("0-intent/1-amendment.md"), "--mirror");
  }

  test("a trigger is pending, then adjudicated when its target pins it, then resolved when the target is approved carrying the pin", () => {
    stampSpec();
    approveSpec();
    amendment();
    assert.match(check(root), /trigger .*1-amendment\.md .*PENDING/);
    assert.match(check(root), /frontier trigger 0-intent\/1-amendment\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    assert.match(check(root), /adjudicated \(by 1-spec\/spec\.md, awaiting approval\)/);
    appendFileSync(join(root, P("1-spec/spec-research.md")), "\n## Adjudications\n\nAdopted.\n");
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/1-amendment.md"]);
    assert.match(check(root, "--target-phase", "1"), /resolved \(1-spec\/spec\.md approved carrying it\)[\s\S]*frontier complete/);
  });

  test("a changed input withdraws trigger resolution until the target wave is current", () => {
    stampSpec();
    approveSpec();
    amendment();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/1-amendment.md"]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.match(state.triggers[0].state, /^adjudicated/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("a changed input makes a claim moot before upstream routing", () => {
    approveChain(2);
    review("2-design-doc/design-doc-review-2.md", "unsatisfiable", DESIGN, [], "Target: 1-spec/spec.md#R1\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const state = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.match(state.claims[0].state, /^moot/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  test("a claim escalated one layer up resolves the trigger below it; intent targets are owner escalations", () => {
    stampSpec();
    amendment();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    review("1-spec/spec-review-1.md", "unsatisfiable", [...SPEC, "0-intent/1-amendment.md"], [], "Target: 0-intent/intent.md#goal\nOrigin: 0-intent/1-amendment.md\n");
    const output = check(root);
    assert.match(output, /trigger .*resolved \(escalated by 1-spec\/spec-review-1\.md\)/);
    assert.match(output, /claim .*#goal\s+PENDING — owner escalation/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal \(owner escalation\)/);
  });

  test("a claim stands only when its wave closed without a rejection; consumers lacking its approval are moot", () => {
    stampSpec();
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"));
    const DESIGN_NO_APPROVAL = DESIGN.filter((f) => !f.includes("spec-review"));
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN_NO_APPROVAL, [], "Target: 1-spec/spec.md#R1\n");
    let output = check(root);
    assert.match(output, /design-doc-review-1\.md → 1-spec\/spec\.md#R1\s+moot/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#goal \(owner escalation\)/);
    // A second lane still to report keeps a claim open; a rejecting lane holds it.
    output = check(root, "--lanes", `spec=a11y@${FPS.a11y}`);
    assert.match(output, /spec-review-1\.md .*wave open/);
    review("1-spec/spec-review-a11y-1.md", "rejected", SPEC, [`lane=${FPS.a11y}`]);
    assert.match(check(root, "--lanes", `spec=a11y@${FPS.a11y}`), /spec-review-1\.md .*held \(a lane rejected/);
  });

  test("a claim about a changed artifact is moot; a changed target supersedes it", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAnswered.\n");
    assert.match(check(root), /superseded \(target changed\)/);
  });

  test("a changed target supersedes a stamped claim after its id is removed", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN, [], "Target: 1-spec/spec.md#R1\n");
    write(root, "1-spec/spec.md", "# Spec\n\nRequirement R2 replaces the target.\n");
    assert.match(check(root), /design-doc-review-1\.md .*superseded \(target changed\)/);
  });

  test("stamp rejects trigger targets whose id is absent or outside their territory", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => amendment("1-spec/spec.md#R9"), /INVALID TARGET 1-spec\/spec\.md#R9/);
    assert.throws(() => amendment("3-build/build-plan.md#T9"), /INVALID TARGET 3-build\/build-plan\.md#T9/);
    assert.throws(() => amendment("0-intent/intent.md#goal"), /INVALID TARGET 0-intent\/intent\.md#goal/);
    write(root, "0-intent/intent.md", "Origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## Constraints\n\n- First.\n\n## Decisions\n\n1. Later.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#constraint-2\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-3.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#constraint-0\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-4.md", "unsatisfiable", SPEC), /INVALID TARGET \?/);
  });

  test("a landed amendment resolves after its target id is removed", () => {
    stampSpec();
    approveSpec();
    amendment();
    write(root, "1-spec/spec.md", "# Spec\n\nNew requirement R2.\n");
    rp(root, "stamp", P("0-intent/1-amendment.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/1-amendment.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/1-amendment.md"]);
    const output = check(root, "--target-phase", "1");
    assert.match(output, /trigger .*spec\.md#R1\s+resolved/);
    assert.doesNotMatch(output, /INVALID TARGET/);
  });

  test("spec and design assumptions are valid targets when their A ids exist", () => {
    write(root, "1-spec/spec.md", "# Spec\n\nRequirement R1. Assumption A1.\n");
    write(root, "2-design-doc/design-doc.md", "# Design doc\n\nDecision D1. Assumption A1.\n");
    stampSpec();
    approveSpec();
    amendment("1-spec/spec.md#A1");
    let output = check(root);
    assert.match(output, /trigger .*spec\.md#A1\s+PENDING/);
    write(root, "0-intent/1-amendment.md", "# Amendment 1\n\nTarget: 2-design-doc/design-doc.md#A1\nOrigin: decision-1\n");
    rp(root, "stamp", P("0-intent/1-amendment.md"), "--mirror");
    output = check(root);
    assert.match(output, /trigger .*design-doc\.md#A1\s+PENDING/);
  });

  test("a sealed artifact becomes stale when its required package changes membership", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    approveDesign();
    approveSpec(2);
    const output = check(root, "--target-phase", "2");
    assert.match(output, /artifact 2-design-doc\/design-doc\.md\s+STALE — package members/);
    assert.match(output, /frontier re-synthesize 2-design-doc\/design-doc\.md/);
  });

  test("every recorded member remains consumed regardless of its filename class", () => {
    write(root, "1-spec/tasks/T9.md", "# Historical input\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/tasks/T9.md"));
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("1-spec/tasks/T9.md")), "\nChanged.\n");
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE — package identities: 1-spec\/tasks\/T9\.md/);
  });

  test("an artifact cannot consume its sibling record", () => {
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec-research.md")), /never pins its sibling record/);
    stampSpec();
    const forged = read(root, "1-spec/spec.md").replace(/^head:/m, `  - 1-spec/spec-research.md@${identity(read(root, "1-spec/spec-research.md"))}\nhead:`);
    write(root, "1-spec/spec.md", forged);
    assert.match(check(root, "--target-phase", "1"), /artifact 1-spec\/spec\.md\s+STALE — package members/);
  });

  test("triggers and claims beyond the target phase are reported, not the frontier", () => {
    stampSpec();
    approveSpec();
    amendment("2-design-doc/design-doc.md#D1");
    const output = check(root, "--target-phase", "1");
    assert.match(output, /pending, beyond the target phase/);
    assert.match(output, /frontier complete/);
  });

  // --- tasks, reports, phase reviews ------------------------------------------

  test("the frontier walks phases in order and names the next task from the task files", () => {
    assert.match(check(root), /frontier stamp 1-spec\/spec\.md/);
    approveChain(1);
    assert.match(check(root), /frontier stamp 2-design-doc\/design-doc\.md/);
    approveChain(3);
    assert.match(check(root), /tasks\s+3-build: planned 2\s+done \[\]\s+next T1[\s\S]*frontier task 3-build\/T1/);
    report("T1", 1, "completed");
    assert.match(check(root), /frontier task 3-build\/T2/);
    report("T2", 1, "completed", ["T1"]);
    assert.match(check(root), /frontier build review/);
  });

  test("a report reviews its task and its dependencies, immutably; a replan reopens completed work by computation", () => {
    approveChain(3);
    assert.throws(() => report("T2", 1, "completed"), /reviews exactly its task and its dependencies/);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    assert.match(read(root, "3-build/tasks/T2-report-1.md"), /attempt: 1/);
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md")), /immutable/);
    write(root, "3-build/tasks/T1.md", "# T1: revised\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    const output = check(root);
    assert.match(output, /open \[T1:completed \(stale\), T2:completed \(stale\)\]/);
    assert.match(output, /build-plan\.md .*approved \(stale\)/);
  });

  test("a later task report stamp preserves its recorded package", () => {
    approveChain(3);
    report("T1", 1, "completed");
    report("T2", 1, "completed", ["T1"]);
    write(root, "3-build/tasks/T2.md", "# T2: replanned\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.doesNotThrow(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--mirror"));
    assert.match(read(root, "3-build/tasks/T2-report-1.md"), /reviewed:\n  - 3-build\/tasks\/T2\.md@[0-9a-f]{12}\n  - 3-build\/tasks\/T1\.md@[0-9a-f]{12}/);
  });

  for (const phase of ["3-build", "4-document"])
    test(`verify-7: ${phase} report stamp and check share task dependency requirements`, () => {
      if (phase === "4-document") write(root, "4-document/document-plan.md", "# Plan\n");
      const task = `${phase}/tasks/T2.md`, report = `${phase}/tasks/T2-report-1.md`;
      const dependency = `${phase}/tasks/T1.md`, extra = `${phase}/tasks/T3.md`;
      registered(dependency, { depends: [] }, "# Task\nDepends on: none\n");
      registered(extra, { depends: [] }, "# Extra\nDepends on: none\n");
      registered(task, { depends: ["T1"] }, "# Task\nDepends on: T1\n");
      for (const paths of [[task], [task, dependency, extra]]) {
        write(root, report, "# Report\nOutcome: completed\n");
        assert.throws(() => rp(root, "stamp", P(report), "--mirror", ...paths.flatMap((path) => ["--reviewed", P(path)])), /reviews exactly its task and its dependencies/);
        registered(report, { reviewed: pairs(paths), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.tasks[phase].done.includes("T2"), false);
      }
      write(root, report, "# Report\nOutcome: completed\n");
      rp(root, "stamp", P(report), "--mirror", "--reviewed", P(dependency), "--reviewed", P(task));
      assert.deepEqual(parseFrontmatter(read(root, report)).data.get("reviewed"), pairs([dependency, task]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), true);
      registered(task, { depends: ["T1", "T3"] }, "# Task\nDepends on: T1, T3\n");
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), false);
      const next = `${phase}/tasks/T2-report-2.md`;
      write(root, next, "# Report\nOutcome: completed\n");
      assert.throws(() => rp(root, "stamp", P(next), "--mirror", "--reviewed", P(task), "--reviewed", P(dependency)), /reviews exactly its task and its dependencies/);
      rp(root, "stamp", P(next), "--mirror", ...[extra, task, dependency].flatMap((path) => ["--reviewed", P(path)]));
      assert.equal(JSON.parse(check(root, "--json")).tasks[phase].done.includes("T2"), true);
    });

  test("a failed report blocks its task only until adjudicated or the task changes", () => {
    approveChain(3);
    report("T1", 1, "failed");
    assert.match(check(root), /frontier trigger 3-build\/tasks\/T1-report-1\.md/);
    stampPlan(["3-build/tasks/T1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/T1-report-1.md"]);
    let output = check(root);
    assert.match(output, /T1-report-1\.md .*resolved/);
    assert.match(output, /frontier task 3-build\/T1/);
    report("T1", 2, "failed");
    write(root, "3-build/tasks/T1.md", "# T1: replanned\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    output = check(root);
    assert.doesNotMatch(output, /trigger .*T1-report-2/);
  });

  test("a phase-review schema deduplicates a failed report pinned by its plan", () => {
    approveChain(3);
    report("T1", 1, "failed");
    stampPlan(["3-build/tasks/T1-report-1.md"]);
    review("3-build/build-plan-review-2.md", "approved", [...PLAN_BASE, "3-build/tasks/T1-report-1.md", ...TASKS]);
    report("T1", 2, "completed");
    report("T2", 1, "completed", ["T1"]);
    review("3-build/build-review-1.md", "approved", [...PLAN_BASE, "3-build/tasks/T1-report-1.md", ...TASKS, "3-build/tasks/T1-report-2.md", "3-build/tasks/T2-report-1.md"]);
    assert.match(check(root, "--target-phase", "3"), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
  });

  test("a blocked report is never a trigger: its task stays pending for the orchestrator until a later attempt lands", () => {
    approveChain(3);
    report("T1", 1, "blocked");
    assert.match(read(root, "3-build/tasks/T1-report-1.md"), /outcome: blocked/);
    let output = check(root);
    assert.doesNotMatch(output, /trigger/);
    assert.match(output, /open \[T1:blocked\]/);
    assert.match(output, /frontier blocked 3-build\/T1/);
    assert.equal(JSON.parse(check(root, "--json")).tasks["3-build"].blocked, "T1");
    report("T1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[T1\]/);
    assert.match(output, /frontier task 3-build\/T2/);
  });

  test("a phase review names the plan package, its inputs, every task and report, and goes stale when a report lands", () => {
    buildDone();
    assert.match(check(root, "--target-phase", "3"), /build\s+review: ·:approved\s+APPROVED[\s\S]*frontier complete/);
    report("T2", 2, "completed", ["T1"]);
    const output = check(root, "--target-phase", "3");
    assert.match(output, /build\s+review: ·:approved \(stale\)/);
    assert.match(output, /frontier build review/);
  });

  test("the document phase runs on the build's approval: plan requires the build plan and its approving review", () => {
    buildDone();
    write(root, "4-document/document-plan.md", "# Document plan\n\n## Order\n\n- T1\n");
    write(root, "4-document/document-plan-research.md", "# Doc research\n");
    write(root, "4-document/tasks/T1.md", "# T1: guide\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("4-document/tasks/T1.md"), "--mirror");
    const BUILD_WORK = [...TASKS, "3-build/tasks/T1-report-1.md", "3-build/tasks/T2-report-1.md"];
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"));
    assert.match(check(root), /document-plan\.md\s+STALE — package members/);
    assert.match(check(root), /frontier re-synthesize 4-document\/document-plan\.md/);
    rp(root, "stamp", P("4-document/document-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("3-build/build-plan.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), "--pin", P("3-build/build-plan-review-1.md"), "--pin", P("3-build/build-review-1.md"), ...BUILD_WORK.flatMap((f) => ["--pin", P(f)]));
    const DOC = ["4-document/document-plan.md", "4-document/document-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md", "3-build/build-plan-review-1.md", "3-build/build-review-1.md", ...BUILD_WORK];
    review("4-document/document-plan-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md"]);
    assert.match(check(root), /frontier task 4-document\/T1/);
    write(root, "4-document/tasks/T1-report-1.md", "# Task report\n\nOutcome: completed\n");
    rp(root, "stamp", P("4-document/tasks/T1-report-1.md"), "--reviewed", P("4-document/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier document review/);
    review("4-document/document-review-1.md", "approved", [...DOC, "4-document/tasks/T1.md", "4-document/tasks/T1-report-1.md"]);
    assert.match(check(root), /complete through phase 4 — target reached[\s\S]*frontier complete/);
  });

  // --- production lanes ---------------------------------------------------------

  function approveSpecLaneA(reviewed = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]) {
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", reviewed);
  }

  const LANE_A_PACKAGE = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];

  function approvalMatrixCase(context, complete, concordant, allLanes) {
    write(root, "0-intent/context.md", "# Context\n");
    const scope = context === "closed lane" ? "1-spec/a/" : "1-spec/";
    const artifact = `${scope}spec.md`;
    const record = `${scope}spec-research.md`;
    if (context === "closed lane") {
      write(root, artifact, "# Candidate a\n");
      write(root, record, "# Record a\n");
    }
    registered(artifact, { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]), ...(context === "closed lane" ? { lane: FPS.a } : {}) });
    const full = [artifact, record, "0-intent/intent.md", "0-intent/context.md"];
    const judged = complete ? full : full.slice(0, -1);
    const implicit = `${scope}spec-review-1.md`;
    registeredReview(implicit, judged);
    const named = `${scope}spec-review-security-1.md`;
    if (allLanes) registeredReview(named, concordant ? judged : (judged.includes("0-intent/context.md") ? judged.slice(0, -1) : [...judged, "0-intent/context.md"]), FPS.security);
    const declaration = context === "closed lane" ? `spec=security@${FPS.security}|a@${FPS.a}` : `spec=security@${FPS.security}`;
    if (context === "closed lane") {
      const laneReviews = [implicit, ...(allLanes ? [named] : [])];
      registeredRoot(artifact, pairs(full), laneReviews, FPS.security);
      const state = JSON.parse(check(root, "--lanes", declaration, "--target-phase", "1", "--json"));
      return state.lanes[0].closed && state.artifacts[0].approved && state.complete;
    }
    const state = JSON.parse(check(root, "--lanes", declaration, "--target-phase", "1", "--json"));
    return state.artifacts[0].approved && state.complete;
  }

  for (const context of ["closed lane", "root"])
    for (const complete of [true, false])
      for (const concordant of [true, false])
        for (const allLanes of [true, false]) {
          const name = `wave matrix: ${complete ? "complete" : "incomplete"} pins, ${concordant ? "concordant" : "discordant"} pins, ${allLanes ? "all lanes" : "missing lane"}, ${context}`;
          test(name, () => assert.equal(approvalMatrixCase(context, complete, concordant, allLanes), complete && concordant && allLanes));
        }

  // 4 pair-set changes × 2 independent references × 3 disagreement arrangements.
  // The third arrangement keeps reviewers concordant while changing their reference.
  for (const change of ["add member", "remove member", "change identity", "equal"])
    for (const context of ["live artifact", "closed lane"])
      for (const who of ["one lane vs reference", "two lanes differ", "all lanes equal before reference change"])
        test(`pair-set matrix: ${change}; ${context}; ${who}`, () => {
          const sc = context === "closed lane" ? "1-spec/a/" : "1-spec/";
          const artifact = `${sc}spec.md`, record = `${sc}spec-research.md`;
          write(root, artifact, "# Candidate\n");
          write(root, record, "# Record\n");
          write(root, "0-intent/context.md", "# Context v1\n");
          write(root, "0-intent/extra.md", "# Extra\n");
          write(root, "0-intent/other.md", "# Other\n");
          const input = pairs(["0-intent/intent.md", "0-intent/context.md"]);
          registered(artifact, { pins: input, ...(context === "closed lane" ? { lane: FPS.a } : {}) });
          let reference = [...pairs([artifact, record]), ...input];
          const reviews = [`${sc}spec-review-1.md`, `${sc}spec-review-security-1.md`];
          const mutate = (pins, salt = "v2") => {
            if (change === "add member") return [...pins, ...pairs([salt === "v2" ? "0-intent/extra.md" : "0-intent/other.md"])];
            if (change === "remove member") return pins.filter((p) => !p.startsWith(salt === "v2" ? "0-intent/context.md@" : "0-intent/intent.md@"));
            if (change === "change identity") return pins.map((p) => p.startsWith("0-intent/context.md@") ? `0-intent/context.md@${identity(`# Context ${salt}\n`)}` : p);
            return [...pins].reverse();
          };
          let first = [...reference], second = [...reference];
          if (who === "one lane vs reference") first = mutate(first);
          else if (who === "two lanes differ") {
            first = mutate(first);
            second = mutate(second, "v3");
          } else {
            reference = mutate(reference);
            if (context === "live artifact") {
              const inputs = reference.filter((p) => !p.startsWith(`${artifact}@`) && !p.startsWith(`${record}@`));
              if (change === "change identity") write(root, "0-intent/context.md", "# Context v2\n");
              registered(artifact, { pins: inputs });
            }
          }
          registeredVerdict(reviews[0], first);
          registeredVerdict(reviews[1], second, "approved", FPS.security);
          if (context === "closed lane") registeredRoot(artifact, reference, reviews, FPS.security);
          const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=security@${FPS.security}${context === "closed lane" ? `|a@${FPS.a}` : ""}`, "--json"));
          const valid = change === "equal";
          assert.equal(state.complete, valid);
          if (context === "closed lane") assert.equal(state.lanes[0].closed, valid);
          else assert.equal(state.artifacts[0].approved, valid);
          assert.equal(state.frontier === "complete", valid);
          if (who !== "all lanes equal before reference change") assert.equal(state.frontier.startsWith("consolidate"), false);
        });

  test("verify-5: concordant reviews of an unconsumed identity cannot close a lane", () => {
    const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
    write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
    write(root, "0-intent/context.md", "# Context v1\n");
    const pins = pairs(["0-intent/intent.md", "0-intent/context.md"]);
    registered(artifact, { pins, lane: FPS.a });
    const reference = [...pairs([artifact, record]), ...pins];
    write(root, "0-intent/context.md", "# Context v2\n");
    const reviews = ["1-spec/a/spec-review-1.md", "1-spec/a/spec-review-security-1.md"];
    const judged = pairs([artifact, record, "0-intent/intent.md", "0-intent/context.md"]);
    registeredVerdict(reviews[0], judged);
    registeredVerdict(reviews[1], judged, "approved", FPS.security);
    registeredRoot(artifact, reference, reviews, FPS.security);
    const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=security@${FPS.security}|a@${FPS.a}`, "--json"));
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.lanes[0].approved, false);
    assert.equal(state.complete, false);
  });

  for (const omitted of ["0-intent/intent.md", "0-intent/context.md"])
    test(`F01 / verify-2: a registered review omitting ${omitted} cannot close`, () => {
      const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
      write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
      write(root, "0-intent/context.md", "# Context\n");
      registered(artifact, { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]), lane: FPS.a });
      const reference = pairs([artifact, record, "0-intent/intent.md", "0-intent/context.md"]);
      registeredVerdict("1-spec/a/spec-review-1.md", reference.filter((pin) => !pin.startsWith(`${omitted}@`)));
      registeredRoot(artifact, reference, ["1-spec/a/spec-review-1.md"]);
      const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
      assert.equal(state.lanes[0].closed, false);
      assert.equal(state.frontier, "review wave 1-spec/a/spec.md");
      assert.equal(state.complete, false);
    });

  test("F02 / R7.1.3 / verify #1: registered roots retain a and consolidate b", () => {
    const a = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];
    write(root, a[0], "# A\n"); write(root, a[1], "# A record\n");
    registered(a[0], { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    const reference = pairs([...a.slice(0, 2), "0-intent/intent.md"]);
    registeredVerdict(a[2], reference); registeredRoot(a[0], reference, [a[2]]);
    const original = parseFrontmatter(read(root, "1-spec/spec.md")).data.get("lane-packages");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAdd b after a.\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a]), "lane-packages": original });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, ...a]));
    const reconfirmed = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
    assert.equal(reconfirmed.artifacts[0].state, "fresh");
    assert.equal(reconfirmed.complete, true);
    const state = () => JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a},b@${FPS.b}<a`, "--json"));
    assert.equal(state().lanes[0].closed, true);
    assert.equal(state().frontier, "synthesize 1-spec/b/spec.md");
    const b = ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "1-spec/b/spec-review-1.md"];
    write(root, b[0], "# B\n"); write(root, b[1], "# B record\n");
    registered(b[0], { pins: pairs(["0-intent/intent.md", ...a]), lane: FPS.b });
    const bReference = pairs([...b.slice(0, 2), "0-intent/intent.md", ...a]);
    registeredVerdict(b[2], bReference);
    assert.equal(state().frontier, "consolidate 1-spec/spec.md");
    assert.deepEqual(state().artifacts[0].laneCandidates.map((lane) => lane.package), [a, b]);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a, ...b]), "lane-packages": [...original, JSON.stringify([b[0], pairs(b), bReference])] });
    registeredVerdict("1-spec/spec-review-3.md", pairs([...SPEC, ...a, ...b]));
    assert.equal(state().complete, true);
    assert.deepEqual(state().lanes.map((lane) => lane.closed), [true, true]);
  });

  test("verify #2/#3: registered sibling records stale; materials stay within the package", () => {
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec-research.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    let state = JSON.parse(check(root, "--target-phase", "1", "--json"));
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
    assert.equal(state.complete, false);
    write(root, "0-intent/context.md", "# Context\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    const lanes = `spec=security@${FPS.security}[materials=0-intent/context.md]`;
    assert.throws(() => check(root, "--target-phase", "1", "--lanes", lanes), /outside the .* package/);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", "0-intent/context.md"]) });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, "0-intent/context.md"]));
    registeredVerdict("1-spec/spec-review-security-2.md", pairs(["0-intent/context.md"]), "approved", FPS.security);
    state = JSON.parse(check(root, "--target-phase", "1", "--lanes", lanes, "--json"));
    assert.equal(state.complete, true);
  });

  test("verify-3: registered claims become moot and resolutions adjudicated on input change", () => {
    const amendment = "0-intent/1-amendment.md";
    registered(amendment, { target: "1-spec/spec.md#R1", origin: "issue 8" }, "# Amendment\nTarget: 1-spec/spec.md#R1\nOrigin: issue 8\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", amendment]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, amendment]));
    const designPins = ["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
    registered("2-design-doc/design-doc.md", { pins: pairs(designPins) });
    registered("2-design-doc/design-doc-review-1.md", {
      reviewed: pairs(["2-design-doc/design-doc.md", "2-design-doc/design-doc-research.md", ...designPins]),
      verdict: "unsatisfiable", target: "1-spec/spec.md#R1", "target-identity": identity(read(root, "1-spec/spec.md")),
    }, "# Review\nVerdict: unsatisfiable\nTarget: 1-spec/spec.md#R1\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged input.\n");
    const state = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.equal(state.artifacts[0].approved, false);
    assert.equal(state.triggers[0].state, "adjudicated");
    assert.match(state.claims[0].state, /^moot/);
    assert.equal(state.frontier, "re-synthesize 1-spec/spec.md");
  });

  for (const scope of ["root", "production lane"])
    for (const update of ["later input wave", "new input review lane"])
      for (const verdict of ["approved", "unsatisfiable"])
        test(`verify-6: ${scope}, ${update}, ${verdict} uses the complete required package`, () => {
          registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
          registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          write(root, artifact, "# Design\nDecision D1.\n"); write(root, record, "# Record\n");
          const inputs = ["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
          const lane = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...lane });
          const judged = pairs([artifact, record, ...inputs]);
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, judged);
          else registered(review, {
            reviewed: judged, verdict, target: "0-intent/intent.md#goal", "target-identity": identity(read(root, "0-intent/intent.md")),
          }, "# Review\nVerdict: unsatisfiable\nTarget: 0-intent/intent.md#goal\n");
          const declarations = scope === "root" ? [] : [`design-doc=|a@${FPS.a}`];
          const checkState = () => JSON.parse(check(root, "--target-phase", "2", "--lanes", declarations.join(";"), "--json"));
          const consumer = (state) => scope === "root" ? state.artifacts[1] : state.lanes[0];
          const before = checkState();
          assert.equal(consumer(before).state, "fresh");
          assert.equal(consumer(before).approved, verdict === "approved");
          if (verdict === "unsatisfiable") assert.match(before.claims[0].state, /^PENDING/);

          // Bodies and identities of both artifacts stay unchanged; only approval paths change.
          const newReviews = ["1-spec/spec-review-2.md"];
          registeredVerdict(newReviews[0], pairs(SPEC));
          if (update === "new input review lane") {
            declarations.push(`spec=security@${FPS.security}`);
            newReviews.push("1-spec/spec-review-security-2.md");
            registeredVerdict(newReviews[1], pairs(SPEC), "approved", FPS.security);
          }
          const changed = checkState();
          assert.equal(changed.artifacts[0].approved, true);
          assert.equal(consumer(changed).state, "stale");
          assert.deepEqual(consumer(changed).stale, ["package members"]);
          assert.equal(consumer(changed).approved, false);
          assert.equal(consumer(changed).lanes[0].fresh, false);
          assert.equal(consumer(changed).episode, 1);
          assert.equal(changed.frontier, `re-synthesize ${artifact}`);
          assert.equal(changed.complete, false);
          assert.match(check(root, "--target-phase", "2", "--lanes", declarations.join(";")), /STALE — package members/);
          if (verdict === "unsatisfiable") assert.match(changed.claims[0].state, /^moot/);

          // Reconfirmation includes every lane of the input's current wave.
          const currentInputs = ["0-intent/intent.md", "1-spec/spec.md", ...newReviews];
          registered(artifact, { pins: pairs(currentInputs), ...lane });
          registeredVerdict(`${sc}design-doc-review-2.md`, pairs([artifact, record, ...currentInputs]));
          const confirmed = checkState();
          assert.equal(consumer(confirmed).state, "fresh");
          assert.equal(consumer(confirmed).approved, true);
          assert.equal(consumer(confirmed).episode, 0);
          assert.equal(confirmed.claims.some((claim) => claim.state.startsWith("PENDING")), false);
        });

  for (const scope of ["root", "production lane"])
    for (const inputState of ["changed package", "stale approval", "no approval", "rejected new lane"])
      for (const verdict of ["approved", "unsatisfiable"])
        test(`verify-7: ${scope}, ${inputState}, ${verdict} waits for a current input approval`, () => {
          const intent = "0-intent/intent.md", spec = "1-spec/spec.md";
          const specInputs = [intent];
          if (inputState === "stale approval") {
            write(root, "0-intent/context.md", "# Context\nOriginal evidence.\n");
            specInputs.push("0-intent/context.md");
          }
          let specPackage = ["1-spec/spec.md", "1-spec/spec-research.md", ...specInputs];
          registered(spec, { pins: pairs(specInputs) });
          const inputs = [intent, spec];
          if (inputState !== "no approval") {
            registeredVerdict("1-spec/spec-review-1.md", pairs(specPackage));
            inputs.push("1-spec/spec-review-1.md");
          }
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          const lane = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...lane }, "# Design\nDecision D1.\n");
          write(root, record, "# Record\n");
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, pairs([artifact, record, ...inputs]));
          else registered(review, {
            reviewed: pairs([artifact, record, ...inputs]), verdict, target: `${intent}#goal`, "target-identity": identity(read(root, intent)),
          }, `# Review\nVerdict: unsatisfiable\nTarget: ${intent}#goal\n`);
          const declarations = scope === "root" ? [] : [`design-doc=|a@${FPS.a}`];
          const state = () => JSON.parse(check(root, "--target-phase", "2", "--lanes", declarations.join(";"), "--json"));
          const consumer = (s) => scope === "root" ? s.artifacts[1] : s.lanes[0];
          if (inputState !== "no approval") {
            const before = state();
            assert.equal(consumer(before).state, "fresh");
            assert.equal(consumer(before).approved, verdict === "approved");
            if (verdict === "unsatisfiable") assert.match(before.claims[0].state, /^PENDING/);
          }
          if (inputState === "changed package") {
            write(root, "0-intent/context.md", "# Context\nNew evidence.\n");
            registered(spec, { pins: pairs([intent, "0-intent/context.md"]) });
            specPackage = [...SPEC, "0-intent/context.md"];
          } else if (inputState === "stale approval") {
            write(root, "0-intent/context.md", "# Context\nRevised evidence.\n");
          } else if (inputState === "rejected new lane") {
            declarations.push(`spec=security@${FPS.security}`);
            registeredVerdict("1-spec/spec-review-2.md", pairs(SPEC));
            registeredVerdict("1-spec/spec-review-security-2.md", pairs(SPEC), "rejected", FPS.security);
          }
          const blocked = state();
          assert.equal(blocked.artifacts[0].approved, false);
          assert.equal(consumer(blocked).state, "stale");
          assert.equal(consumer(blocked).approved, false);
          assert.equal(consumer(blocked).lanes[0].fresh, false);
          assert.equal(consumer(blocked).episode, 1);
          assert.equal(blocked.complete, false);
          const action = inputState === "rejected new lane" ? "adjudicate" : inputState === "stale approval" ? "re-synthesize" : "review wave";
          assert.equal(blocked.frontier, `${action} 1-spec/spec.md`);
          assert.equal(blocked.claims.some((c) => c.state.startsWith("PENDING")), false);
          if (verdict === "unsatisfiable") assert.match(blocked.claims[0].state, /^moot/);

          const wave = inputState === "rejected new lane" ? 3 : 2;
          if (inputState === "stale approval") registered(spec, { pins: pairs(specInputs) });
          const approvals = [`1-spec/spec-review-${wave}.md`];
          registeredVerdict(approvals[0], pairs(specPackage));
          if (inputState === "rejected new lane") {
            approvals.push(`1-spec/spec-review-security-${wave}.md`);
            registeredVerdict(approvals[1], pairs(specPackage), "approved", FPS.security);
          }
          const restored = state();
          assert.equal(restored.artifacts[0].approved, true);
          assert.equal(consumer(restored).approved, false);
          assert.deepEqual(consumer(restored).stale, ["package members"]);
          assert.equal(restored.frontier, `re-synthesize ${artifact}`);
          if (verdict === "unsatisfiable") assert.match(restored.claims[0].state, /^moot/);
          const repinned = [intent, spec, ...approvals];
          registered(artifact, { pins: pairs(repinned), ...lane });
          registeredVerdict(`${sc}design-doc-review-2.md`, pairs([artifact, record, ...repinned]));
          const confirmed = state();
          assert.equal(consumer(confirmed).state, "fresh");
          assert.equal(consumer(confirmed).approved, true);
          assert.equal(consumer(confirmed).episode, 0);
        });

  test("verify-6: another consumer wave with the same pair set preserves currency", () => {
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const before = JSON.parse(check(root, "--target-phase", "2", "--json"));
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs(DESIGN).reverse());
    const after = JSON.parse(check(root, "--target-phase", "2", "--json"));
    assert.equal(after.frontier, before.frontier);
    assert.equal(after.complete, true);
    assert.equal(after.artifacts[1].state, "fresh");
    assert.equal(after.artifacts[1].approved, true);
    assert.equal(after.artifacts[1].episode, 0);
    assert.deepEqual(after.artifacts[1].stale, []);
    // Reordering an input approval's identical pairs changes no requirement either.
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC).reverse());
    assert.deepEqual(JSON.parse(check(root, "--target-phase", "2", "--json")), after);
  });

  for (const phase of ["build-plan", "document-plan"])
    test(`verify-6: the ${phase} table includes every required approval lane and adjudicated trigger`, () => {
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
      registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
      const buildPins = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
      registered("3-build/build-plan.md", { pins: pairs(buildPins) });
      registered("3-build/tasks/T1.md", { depends: [] }, "# Task\nDepends on: none\n");
      const planPackage = [...PLAN_BASE, "3-build/tasks/T1.md"];
      registeredVerdict("3-build/build-plan-review-1.md", pairs(planPackage));
      registered("3-build/tasks/T1-report-1.md", { reviewed: pairs(["3-build/tasks/T1.md"]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
      const buildPackage = [...planPackage, "3-build/tasks/T1-report-1.md"];
      registeredVerdict("3-build/build-review-1.md", pairs(buildPackage));

      const artifact = phase === "build-plan" ? "3-build/build-plan.md" : "4-document/document-plan.md";
      const record = phase === "build-plan" ? "3-build/build-plan-research.md" : "4-document/document-plan-research.md";
      const amendment = "0-intent/1-amendment.md";
      registered(amendment, { target: `${artifact}#A1`, origin: "issue 8" }, `# Amendment\nTarget: ${artifact}#A1\nOrigin: issue 8\n`);
      const inputs = phase === "build-plan" ? [...buildPins, amendment] : [
        "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md",
        "3-build/build-plan-review-1.md", "3-build/tasks/T1.md", "3-build/tasks/T1-report-1.md", "3-build/build-review-1.md", amendment,
      ];
      registered(artifact, { pins: pairs(inputs) }, "# Plan\nAssumption A1.\n");
      write(root, record, "# Record\n");
      const judged = [artifact, record, ...inputs, ...(phase === "build-plan" ? ["3-build/tasks/T1.md"] : [])];
      registeredVerdict(`${dirname(artifact)}/${phase}-review-1.md`, pairs(judged));
      const targetPhase = phase === "build-plan" ? "3" : "4";
      const before = JSON.parse(check(root, "--target-phase", targetPhase, "--json"));
      assert.equal(before.artifacts.at(-1).approved, true);
      assert.equal(before.triggers[0].state, "resolved");
      const inputPrefix = phase === "build-plan" ? "design-doc" : "build";
      const inputPhase = phase === "build-plan" ? "2-design-doc" : "3-build";
      const inputPackage = phase === "build-plan" ? DESIGN : buildPackage;
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-2.md`, pairs(inputPackage));
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-security-2.md`, pairs(inputPackage), "approved", FPS.security);
      const state = JSON.parse(check(root, "--target-phase", targetPhase, "--lanes", `${inputPrefix}=security@${FPS.security}`, "--json"));
      assert.equal(state.artifacts.at(-1).state, "stale");
      assert.deepEqual(state.artifacts.at(-1).stale, ["package members"]);
      assert.equal(state.artifacts.at(-1).approved, false);
      assert.equal(state.artifacts.at(-1).episode, 1);
      assert.equal(state.triggers[0].state, "adjudicated");
      assert.equal(state.frontier, `re-synthesize ${artifact}`);
      assert.equal(state.complete, false);
    });

  test("root pins alone do not replace an independent consolidation reference", () => {
    const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
    write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    registeredVerdict("1-spec/a/spec-review-1.md", pairs([artifact, record, "0-intent/intent.md"]));
    const binding = [artifact, record, "1-spec/a/spec-review-1.md"];
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...binding]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, ...binding]));
    const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.complete, false);
    assert.equal(state.frontier, "consolidate 1-spec/spec.md");
  });

  test("a registered task report cannot omit its dependency from the reference", () => {
    buildDone();
    registered("3-build/tasks/T2-report-1.md", { reviewed: pairs(["3-build/tasks/T2.md"]), outcome: "completed", attempt: "1" }, "# Report\nOutcome: completed\n");
    const state = JSON.parse(check(root, "--target-phase", "3", "--json"));
    assert.deepEqual(state.tasks["3-build"].done, ["T1"]);
    assert.equal(state.frontier, "task 3-build/T2");
    assert.equal(state.complete, false);
  });

  for (const change of ["add member", "remove member", "change identity"])
    test(`verify-4/5: closed reference survives candidate ${change}`, () => {
      const artifact = "1-spec/a/spec.md", record = "1-spec/a/spec-research.md";
      write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
      write(root, "0-intent/context.md", "# Context v1\n");
      write(root, "0-intent/extra.md", "# Extra\n");
      let inputs = ["0-intent/intent.md", "0-intent/context.md"];
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      const reference = pairs([artifact, record, ...inputs]);
      registeredVerdict("1-spec/a/spec-review-1.md", reference);
      registeredRoot(artifact, reference, ["1-spec/a/spec-review-1.md"]);
      const before = read(root, "1-spec/spec.md");
      if (change === "add member") inputs.push("0-intent/extra.md");
      if (change === "remove member") inputs.pop();
      if (change === "change identity") write(root, "0-intent/context.md", "# Context v2\n");
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      registeredVerdict("1-spec/a/spec-review-2.md", pairs([artifact, record, ...inputs]), "rejected");
      const state = JSON.parse(check(root, "--target-phase", "1", "--lanes", `spec=|a@${FPS.a}`, "--json"));
      assert.equal(state.lanes[0].closed, true);
      assert.equal(state.lanes[0].episode, 1);
      assert.equal(state.artifacts[0].state, "fresh");
      assert.equal(state.artifacts[0].approved, true);
      assert.equal(state.complete, true);
      assert.equal(read(root, "1-spec/spec.md"), before);
    });

  test("a root cannot complete from a lane review omitting consumed context", () => {
    write(root, "0-intent/context.md", "# Context\n");
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.md"), "--set", `lane=${FPS.a}`);
    write(root, "1-spec/a/spec-review-1.md", "# Review\n\nVerdict: approved\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/a/spec-review-1.md"), "--reviewed", P("1-spec/a/spec.md"), "--reviewed", P("1-spec/a/spec-research.md"), "--reviewed", P("0-intent/intent.md"), "--mirror"), /INVALID REVIEW PACKAGE/);
    const lanePackage = ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "1-spec/a/spec-review-1.md"];
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...lanePackage.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...lanePackage]);
    const state = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json"));
    assert.notEqual(state.complete, true);
    assert.equal(state.frontier, "stamp 1-spec/a/spec-review-1.md");
  });

  test("declared production lanes are sub-pipelines; `after` waits; the root must pin every lane", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    rmSync(join(root, P("1-spec/spec-research.md")));
    const lanes = `spec=|event-driven@${FPS.event},contrarian@${FPS.contrarian}<event-driven`;
    let output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+MISSING/);
    assert.match(output, /lane\s+1-spec\/contrarian\/spec\.md\s+MISSING\s+waiting for event-driven/);
    assert.match(output, /frontier synthesize 1-spec\/event-driven\/spec\.md/);
    for (const id of ["event-driven"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.event}`);
      review(`1-spec/${id}/spec-review-1.md`, "approved", [`1-spec/${id}/spec.md`, `1-spec/${id}/spec-research.md`, "0-intent/intent.md"]);
    }
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier synthesize 1-spec\/contrarian\/spec\.md/);
    write(root, "1-spec/contrarian/spec.md", "# Spec contrarian\n");
    write(root, "1-spec/contrarian/spec-research.md", "# Record contrarian\n");
    rp(root, "stamp", P("1-spec/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--set", `lane=${FPS.contrarian}`);
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/contrarian\/spec\.md\s+STALE — package members/);
    assert.match(output, /frontier re-synthesize 1-spec\/contrarian\/spec\.md/);
    rp(root, "stamp", P("1-spec/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--set", `lane=${FPS.contrarian}`);
    review("1-spec/contrarian/spec-review-1.md", "approved", ["1-spec/contrarian/spec.md", "1-spec/contrarian/spec-research.md", "0-intent/intent.md", "1-spec/event-driven/spec.md", "1-spec/event-driven/spec-research.md", "1-spec/event-driven/spec-review-1.md"]);
    assert.match(check(root, "--lanes", lanes), /artifact 1-spec\/spec\.md\s+MISSING — every lane approved: consolidate/);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    write(root, "1-spec/spec-research.md", "# Consolidated record\n");
    // A lane closes only when the root records its complete package.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"));
    output = check(root, "--lanes", lanes);
    assert.doesNotMatch(output, /closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    // One complete lane closes independently while an incomplete one stays open.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--pin", P("1-spec/contrarian/spec.md"), "--pin", P("1-spec/contrarian/spec-review-1.md"));
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.doesNotMatch(output, /lane\s+1-spec\/contrarian\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/event-driven/spec.md"), "--pin", P("1-spec/event-driven/spec-research.md"), "--pin", P("1-spec/event-driven/spec-review-1.md"), "--pin", P("1-spec/contrarian/spec.md"), "--pin", P("1-spec/contrarian/spec-research.md"), "--pin", P("1-spec/contrarian/spec-review-1.md"));
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:none/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    output = check(root, "--lanes", lanes);
    assert.match(output, /lane\s+1-spec\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /frontier re-synthesize 1-spec\/spec\.md/);
    assert.doesNotMatch(output, /frontier re-synthesize 1-spec\/(?:event-driven|contrarian)\/spec\.md/);
  });

  test("production-lane closure preserves the concordant approved package consumed by the root", () => {
    const lanes = `spec=security@${FPS.security}|a@${FPS.a}`;
    write(root, "1-spec/a/spec.md", "# Spec a v1\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    write(root, "1-spec/a/spec.md", "# Spec a v2\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-security-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"], [`lane=${FPS.security}`]);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    const lanePackage = ["0-intent/intent.md", "1-spec/a/spec.md", "1-spec/a/spec-research.md"];
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/a/spec-review-1.md", "1-spec/a/spec-review-security-1.md"].flatMap((path) => ["--pin", P(path)]));
    assert.doesNotMatch(check(root, "--lanes", lanes, "--target-phase", "1"), /lane\s+1-spec\/a\/spec\.md\s+closed/);

    review("1-spec/a/spec-review-2.md", "approved", lanePackage);
    review("1-spec/a/spec-review-security-2.md", "approved", lanePackage, [`lane=${FPS.security}`]);
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/a/spec-review-2.md", "1-spec/a/spec-review-security-2.md"].flatMap((path) => ["--pin", P(path)]));
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /lane\s+1-spec\/a\/spec\.md\s+closed/);
  });

  test("an incomplete approval package cannot close a production lane", () => {
    assert.throws(() => approveSpecLaneA(["1-spec/a/spec.md", "1-spec/a/spec-research.md"]), /INVALID REVIEW PACKAGE/);
  });

  test("a root reconfirmation preserves its closed lane package", () => {
    approveSpecLaneA();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\n## Decisions\n\n1. New input.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    const output = check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH[\s\S]*frontier complete/);
  });

  test("repinning a closed lane candidate preserves its package and episode", () => {
    write(root, "0-intent/context.md", "# Context v1\n");
    write(root, "1-spec/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    const inputs = ["0-intent/intent.md", "0-intent/context.md"];
    rp(root, "stamp", P("1-spec/a/spec.md"), ...inputs.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", ...inputs]);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    assert.equal(JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json")).frontier, "complete");
    write(root, "0-intent/context.md", "# Context v2\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), ...inputs.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-2.md", "rejected", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", ...inputs]);
    const state = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1", "--json"));
    assert.equal(state.lanes[0].closed, true);
    assert.equal(state.counters["1-spec/a/spec"].episode, 1);
    assert.equal(state.artifacts[0].state, "fresh");
    assert.equal(state.artifacts[0].approved, true);
    assert.equal(state.frontier, "complete");
  });

  test("a new production lane leaves closed lanes outside the frontier", () => {
    approveSpecLaneA();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    assert.match(check(root, "--lanes", `spec=|a@${FPS.a}`, "--target-phase", "1"), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\n## Decisions\n\n1. Add lane b.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    const output = check(root, "--lanes", `spec=|a@${FPS.a},b@${FPS.b}`, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+closed/);
    assert.match(output, /lane\s+1-spec\/b\/spec\.md\s+MISSING/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE/);
    assert.match(output, /frontier synthesize 1-spec\/b\/spec\.md/);
    write(root, "1-spec/b/spec.md", "# Candidate b\n");
    write(root, "1-spec/b/spec-research.md", "# Record b\n");
    rp(root, "stamp", P("1-spec/b/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${FPS.b}`);
    review("1-spec/b/spec-review-1.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md", ...LANE_A_PACKAGE]);
    const ready = JSON.parse(check(root, "--lanes", `spec=|a@${FPS.a},b@${FPS.b}<a`, "--target-phase", "1", "--json"));
    assert.equal(ready.frontier, "consolidate 1-spec/spec.md");
    assert.deepEqual(ready.artifacts[0].laneCandidates, [
      { lane: "1-spec/a/", package: LANE_A_PACKAGE },
      { lane: "1-spec/b/", package: ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "1-spec/b/spec-review-1.md"] },
    ]);
  });

  test("an after lane waits for each dependency's recursively complete package", () => {
    const lanes = `spec=|z@999999999999,b@${FPS.b}<z,c@${FPS.c}<b`;
    for (const [id, fp] of [["z", "999999999999"], ["b", FPS.b]]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      const dependencyPins = id === "b" ? ["1-spec/z/spec.md", "1-spec/z/spec-research.md"] : [];
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), ...dependencyPins.flatMap((path) => ["--pin", P(path)]), "--set", `lane=${fp}`);
    }
    review("1-spec/b/spec-review-1.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md", "1-spec/z/spec.md", "1-spec/z/spec-research.md"]);
    const output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/c\/spec\.md\s+MISSING\s+waiting for b/);
    assert.match(output, /frontier review wave 1-spec\/z\/spec\.md/);
    assert.doesNotMatch(output, /frontier synthesize 1-spec\/c\/spec\.md/);
  });

  test("a claim raised inside a production lane reaches the frontier, and lanes have counters", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    const lanes = `spec=|a@${FPS.a},b@${FPS.b}`;
    for (const id of ["a", "b"]) {
      write(root, `1-spec/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/${id}/spec.md`), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS[id]}`);
    }
    review("1-spec/a/spec-review-1.md", "unsatisfiable", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"], [], "Target: 0-intent/intent.md#goal\n");
    review("1-spec/b/spec-review-1.md", "rejected", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/b/spec-review-2.md", "approved", ["1-spec/b/spec.md", "1-spec/b/spec-research.md", "0-intent/intent.md"]);
    const output = check(root, "--lanes", lanes);
    assert.match(output, /claim\s+1-spec\/a\/spec-review-1\.md → 0-intent\/intent\.md#goal\s+PENDING — owner escalation/);
    assert.match(output, /counter\s+1-spec\/a\/spec: 1 wave this episode/);
    assert.doesNotMatch(output, /counter\s+1-spec\/b\/spec/);
  });

  // --- refs and output ----------------------------------------------------------

  test("check --ref reads a pipeline from a branch without checking it out", () => {
    approveChain(1);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "spec approved");
    git(root, "branch", "other");
    write(root, "1-spec/spec.md", "# Spec\n\nChanged on the working tree.\n");
    assert.match(check(root, "--ref", "other", "--target-phase", "1"), /frontier complete/);
    assert.match(check(root, "--target-phase", "1"), /approved \(stale\)/);
  });

  test("stamp and check derive the worktree repository from their argument", () => {
    const seat = `${root}-seat`;
    git(root, "worktree", "add", "--quiet", "-b", "seat-branch", seat);
    try {
      writeFileSync(join(seat, "seat-work.js"), "export default 1;\n");
      git(seat, "add", "-A");
      git(seat, "commit", "--quiet", "-m", "seat work");
      const seatHead = git(seat, "rev-parse", "--short=12", "HEAD").trim();
      rp(root, "stamp", join(seat, P("1-spec/spec.md")), "--pin", P("0-intent/intent.md"));
      assert.match(readFileSync(join(seat, P("1-spec/spec.md")), "utf8"), new RegExp(`head: ${seatHead}`));
      assert.match(rp(root, "check", join(seat, PIPELINE), "--base", "main", "--target-phase", "1"), new RegExp(`unclaimed by any task report: ${seatHead.slice(0, 7)}`));
    } finally {
      git(root, "worktree", "remove", "--force", seat);
    }
  });

  test("state cannot be forged: mirrors come from the body, reviewed is immutable, identities are exact", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nVerdict: rejected\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md"), "--set", "verdict=approved"), /--set accepts only lane/);
    rp(root, "stamp", P("1-spec/spec-review-1.md"), ...SPEC.flatMap((f) => ["--reviewed", P(f)]), "--mirror");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--reviewed", P("1-spec/spec.md")), /immutable/);
    // A hand-written pin with an empty or short identity is never fresh.
    write(root, "2-design-doc/design-doc.md", "---\npins:\n  - 0-intent/intent.md@\n  - 1-spec/spec.md@abc\n---\n# Design doc\n");
    assert.match(check(root), /artifact 2-design-doc\/design-doc\.md\s+STALE/);
  });

  test("mirrors are the body's projection: a declaration the body lost never survives in the frontmatter", () => {
    stampSpec();
    approveSpec();
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
    // The verdict is deleted from the body; the frontmatter still says approved.
    const stamped = read(root, "1-spec/spec-review-1.md");
    write(root, "1-spec/spec-review-1.md", stamped.replace(/^Verdict: approved\n/m, ""));
    let output = check(root, "--target-phase", "1");
    assert.match(output, /mirror\s+1-spec\/spec-review-1\.md\s+differs from the body: verdict/);
    assert.doesNotMatch(output, /APPROVED|frontier complete/);
    assert.match(output, /frontier stamp 1-spec\/spec-review-1\.md/);
    // Re-mirroring a stamped file is legitimate: reviewed stays, the mirror set is recomputed whole.
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    const text = read(root, "1-spec/spec-review-1.md");
    assert.doesNotMatch(text, /verdict:/);
    assert.match(text, /reviewed:/);
    output = check(root, "--target-phase", "1");
    assert.doesNotMatch(output, /mirror\s/);
    assert.match(output, /frontier INVALID REVIEW 1-spec\/spec-review-1\.md: no Verdict line/);
    // A claim keeps the target identity it landed with while its target is the same.
    review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    const landed = read(root, "1-spec/spec-review-2.md").match(/target-identity: ([0-9a-f]{12})/)[1];
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.equal(read(root, "1-spec/spec-review-2.md").match(/target-identity: ([0-9a-f]{12})/)[1], landed);
    write(root, "1-spec/spec-review-2.md", read(root, "1-spec/spec-review-2.md").replace(/^Verdict: unsatisfiable\n/m, "Verdict: approved\n").replace(/^Target:.*\n/m, ""));
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.doesNotMatch(read(root, "1-spec/spec-review-2.md"), /target/);
  });

  test("every attempt is validated: a report without an outcome is invalid until its body declares one and is re-mirrored", () => {
    approveChain(3);
    write(root, "3-build/tasks/T1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    let output = check(root);
    assert.match(output, /frontier INVALID REPORT 3-build\/tasks\/T1-report-1\.md: no Outcome line/);
    appendFileSync(join(root, P("3-build/tasks/T1-report-1.md")), "\nOutcome: blocked\n");
    output = check(root);
    assert.match(output, /mirror\s+3-build\/tasks\/T1-report-1\.md\s+differs from the body: outcome/);
    assert.match(output, /frontier stamp 3-build\/tasks\/T1-report-1\.md/);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--mirror");
    report("T1", 2, "completed");
    output = check(root);
    assert.match(output, /done \[T1\]/);
    assert.match(output, /frontier task 3-build\/T2/);
    // An unstamped task file is a contradiction too: its dependencies are declared in the body.
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    assert.match(check(root), /frontier stamp 3-build\/tasks\/T2\.md/);
  });

  test("a lane's identity is its whole declaration: the fingerprint covers id, brief, materials, and after", () => {
    const fp = (...args) => rp(root, "fingerprint", ...args).trim();
    const base = fp("security", "--brief", "Verify security surfaces in depth");
    assert.match(base, /^[0-9a-f]{12}$/);
    assert.equal(fp("security", "--brief", "  Verify security surfaces in depth "), base);
    assert.notEqual(fp("a11y", "--brief", "Verify security surfaces in depth"), base);
    assert.notEqual(fp("security", "--brief", "Verify accessibility"), base);
    assert.notEqual(fp("security", "--brief", "Verify security surfaces in depth", "--materials", "intent,diff"), base);
    assert.notEqual(fp("security", "--brief", "Verify security surfaces in depth", "--after", "event-driven"), base);
    assert.throws(() => rp(root, "fingerprint"), /missing <lane id>/);
  });

  test("a declared fingerprint must match the `lane` a review or lane artifact was stamped with", () => {
    stampSpec();
    const fp = rp(root, "fingerprint", "security", "--brief", "Verify security surfaces in depth").trim();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "approved", SPEC, [`lane=${fp}`], "Brief: Verify security surfaces in depth\n");
    assert.match(check(root, "--lanes", `spec=security@${fp}`, "--target-phase", "1"), /frontier complete/);
    const other = rp(root, "fingerprint", "security", "--brief", "Verify accessibility").trim();
    assert.match(check(root, "--lanes", `spec=security@${other}`, "--target-phase", "1"), /security:approved \(stale\)/);
    // A review stamped without `lane` never satisfies a declared fingerprint.
    review("1-spec/spec-review-security-2.md", "approved", SPEC);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root, "--lanes", `spec=security@${fp}`, "--target-phase", "1"), /security:approved \(stale\)/);
    // Production lanes alike: the lane artifact carries the fingerprint it was produced under.
    for (const f of ["1-spec/spec.md", "1-spec/spec-review-security-1.md", "1-spec/spec-review-security-2.md"]) rmSync(join(root, P(f)));
    const pfp = rp(root, "fingerprint", "a", "--brief", "Explore an event-driven design").trim();
    write(root, "1-spec/a/spec.md", "# Spec a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    const lanes = `spec=|a@${pfp}`;
    let output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+STALE — lane declaration/);
    assert.match(output, /frontier re-synthesize 1-spec\/a\/spec\.md/);
    rp(root, "stamp", P("1-spec/a/spec.md"), "--set", `lane=${pfp}`);
    output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier consolidate 1-spec\/spec\.md/);
  });

  test("a review lane names exactly its declared material paths", () => {
    stampSpec();
    approveSpec();
    const materials = ["1-spec/spec.md", "0-intent/intent.md"];
    const fp = rp(root, "fingerprint", "security", "--materials", materials.join(",")).trim();
    review("1-spec/spec-review-security-1.md", "approved", materials, [`lane=${fp}`]);
    const lanes = `spec=security@${fp}[materials=${materials.join("+")}]`;
    assert.match(check(root, "--lanes", lanes, "--target-phase", "1"), /security:approved[\s\S]*frontier complete/);
    assert.throws(() => check(root, "--lanes", `spec=security@${fp}[materials=1-spec/spec.md+1-spec/spec.md]`), /duplicate material path/);
    assert.throws(() => check(root, "--lanes", `spec=security@${fp}[materials=diff]`), /invalid material path/);
  });

  test("review material paths expand only inside the production lane's declared scope", () => {
    const fp = rp(root, "fingerprint", "security", "--materials", "1-spec/spec.md,0-intent/intent.md").trim();
    const lanes = `spec=security@${fp}[materials=1-spec/spec.md+0-intent/intent.md]|a@${FPS.a}`;
    write(root, "1-spec/a/spec.md", "# Spec a\n");
    write(root, "1-spec/a/spec-research.md", "# Record a\n");
    write(root, "1-spec/a/intent.md", "# Coincidental local name\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--pin", P("0-intent/intent.md"), "--set", `lane=${FPS.a}`);
    review("1-spec/a/spec-review-1.md", "approved", ["1-spec/a/spec.md", "1-spec/a/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/a/spec-review-security-1.md", "approved", ["1-spec/a/spec.md", "0-intent/intent.md"], [`lane=${fp}`]);
    const output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/a\/spec\.md\s+FRESH[\s\S]*security:approved\s+APPROVED/);
  });

  test("a lane the declaration lacks is a defect, never an implicit lane; reserved names are refused", () => {
    stampSpec();
    approveSpec();
    write(root, "1-spec/rogue/spec.md", "# Rogue\n");
    let output = check(root, "--target-phase", "1");
    assert.match(output, /lane\s+1-spec\/rogue\/\s+UNDECLARED/);
    assert.match(output, /frontier undeclared lane 1-spec\/rogue\//);
    rmSync(join(root, P("1-spec/rogue")), { recursive: true });
    // An undeclared review lane is diagnosed before wave state.
    review("1-spec/spec-review-extra-2.md", "rejected", SPEC);
    output = check(root, "--target-phase", "1");
    assert.match(output, /frontier undeclared lane 1-spec\/spec-review-extra-2\.md/);
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md/);
    assert.throws(() => check(root, "--lanes", "spec=|tasks"), /reserved name/);
    assert.throws(() => check(root, "--lanes", "spec=tasks"), /reserved name/);
  });

  test("a claim is pending only while it is its lane's latest verdict; a held claim ends with the wave that approved", () => {
    stampSpec();
    const lanes = `spec=b@${FPS.b}`;
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, [], "Target: 0-intent/intent.md#goal\n");
    review("1-spec/spec-review-b-1.md", "rejected", SPEC, [`lane=${FPS.b}`]);
    let output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*held \(a lane rejected/);
    assert.match(output, /frontier adjudicate 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    review("1-spec/spec-review-b-2.md", "approved", SPEC, [`lane=${FPS.b}`]);
    output = check(root, "--lanes", lanes, "--target-phase", "1");
    assert.match(output, /claim\s+1-spec\/spec-review-1\.md .*superseded \(its lane reviewed again\)/);
    assert.doesNotMatch(output, /PENDING|held|wave open/);
    assert.match(output, /frontier complete/);
  });

  test("invalid lane declarations are rejected before any state is computed", () => {
    assert.throws(() => check(root, "--lanes", "sepc=security"), /unknown artifact/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<missing`), /undeclared lane/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<b,b@${FPS.b}<a`), /cycle/);
    assert.throws(() => check(root, "--lanes", `build-plan=|a@${FPS.a}`), /spec and design doc only/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a};spec=b@${FPS.b}`), /duplicate artifact declaration/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a},a@${FPS.a}`), /duplicate lane declaration/);
    assert.throws(() => check(root, "--lanes", `spec=a@${FPS.a}|a@${FPS.a}`), /duplicate lane declaration/);
    for (const declaration of ["spec=a@abc@def", "spec=|a<b<c", "spec=a=b", "spec=a|b|c"]) {
      assert.throws(() => check(root, "--lanes", declaration), /invalid (?:lane|artifact) declaration/);
    }
    assert.throws(() => check(root, "--lanes", "spec=a<b"), /review lane .* cannot declare after/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<b++c,b@${FPS.b},c@${FPS.c}`), /invalid after dependency/);
    assert.throws(() => check(root, "--lanes", `spec=|a@${FPS.a}<`), /empty after dependency list/);
    assert.throws(() => check(root, "--lanes", "spec=security"), /requires a fingerprint/);
    assert.throws(() => check(root, "--lanes", `spec=security@${FPS.security}|a@${FPS.a},a-review-security@${FPS.b}`), /same auxiliary branch/);
    assert.throws(() => check(root, "--lanes", `spec=security@${FPS.security}|review-security@${FPS.a}`), /same auxiliary branch/);
    approveChain(2);
    writeTasks();
    report("T1", 1, "completed");
    stampPlan();
    assert.throws(() => check(root, "--lanes", `build-plan=focus@${FPS.a}[materials=3-build/tasks/T1-report-1.md]`), /materials .* outside the 3-build\/build-plan\.md package/);
  });

  test("an unfinished report and cyclic plan are flagged; an invalid attempt is rejected before publication", () => {
    approveChain(3);
    write(root, "3-build/tasks/T1-report-1.md", "# Task report\n\nno outcome yet\n");
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.match(check(root), /frontier INVALID REPORT 3-build\/tasks\/T1-report-1\.md: no Outcome line/);
    rmSync(join(root, P("3-build/tasks/T1-report-1.md")));
    assert.throws(() => report("T1", 2, "completed"), /INVALID REPORT .*expected attempt 1/);
    rmSync(join(root, P("3-build/tasks/T1-report-2.md")));
    write(root, "3-build/tasks/T1.md", "# T1\n\n- **Depends on:** T2\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    approvePlan(2);
    assert.match(check(root), /frontier invalid plan: 3-build\/tasks\/T1\.md depends on a cycle/);
  });

  test("attempt numbering counts landed reports, not draft filenames", () => {
    write(root, "3-build/tasks/T1.md", "# T1\n\n- **Depends on:** none\n");
    rp(root, "stamp", P("3-build/tasks/T1.md"), "--mirror");
    for (const attempt of [1, 2]) write(root, `3-build/tasks/T1-report-${attempt}.md`, `# Report ${attempt}\n\nOutcome: blocked\n`);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    rp(root, "stamp", P("3-build/tasks/T1-report-2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/T1-report-1.md")).data.get("attempt"), "1");
    assert.equal(parseFrontmatter(read(root, "3-build/tasks/T1-report-2.md")).data.get("attempt"), "2");
  });

  test("a commit outside the pipelines folder that no task report claims is the frontier", () => {
    buildDone();
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    writeFileSync(join(root, "src.js"), "console.log(1);\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "hand-made change");
    const output = check(root, "--target-phase", "3");
    assert.match(output, /commits\s+unclaimed by any task report/);
    assert.match(output, /frontier unclaimed commits/);
    const sha = git(root, "rev-parse", "--short", "HEAD").trim();
    write(root, "3-build/tasks/T2-report-2.md", `# Task report\n\nOutcome: completed\n\n## Commits\n\n- ${sha} — hand-made change\n`);
    rp(root, "stamp", P("3-build/tasks/T2-report-2.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "3"), /unclaimed/);
  });

  test("a pipeline's own commits follow its base: the starts-from branch when the intent declares one, else --base; an unresolvable base is an error", () => {
    buildDone();
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    writeFileSync(join(root, "lib.js"), "1\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "work of demo");
    assert.match(check(root, "--target-phase", "3"), /frontier unclaimed commits/);
    // A stacked pipeline starts from demo's tip: demo's commits are not its own.
    const S = ".pipelines/stacked";
    git(root, "checkout", "--quiet", "-b", "stacked");
    mkdirSync(join(root, S, "0-intent"), { recursive: true });
    writeFileSync(join(root, S, "0-intent/intent.md"), "Origin: issue 8\nOrigin: starts-from demo\n\n# Intent\n\n## Goal\n\nStacked.\n");
    rp(root, "stamp", `${S}/0-intent/intent.md`, "--mirror");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "stacked intent");
    assert.doesNotMatch(rp(root, "check", S, "--target-phase", "1"), /unclaimed/);
    writeFileSync(join(root, "more.js"), "2\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "work of stacked");
    const sha = git(root, "rev-parse", "--short=7", "HEAD").trim();
    const own = new RegExp(`unclaimed by any task report: ${sha}\\n`);
    assert.match(rp(root, "check", S, "--target-phase", "1"), own);
    assert.match(rp(root, "check", S, "--base", "main", "--target-phase", "1"), own);
    assert.match(rp(root, "check", S, "--base", "main", "--ref", "stacked", "--target-phase", "1"), own);
    // Without starts-from, --base is required and must resolve; a starts-from branch must too.
    assert.throws(() => rp(root, "check", PIPELINE, "--target-phase", "3"), /--base <ref> is required/);
    assert.throws(() => rp(root, "check", PIPELINE, "--base", "nope", "--target-phase", "3"), /--base does not resolve: nope/);
    git(root, "branch", "-D", "demo");
    assert.throws(() => rp(root, "check", S, "--base", "main", "--target-phase", "1"), /the starts-from branch does not resolve: demo/);
  });

  test("a fixed line is mirrored whole or not at all: prose after Depends on is INVALID, never mined", () => {
    approveChain(3);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1, T3 (T1's fence work is shipped; T3 …)\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: expected none or task ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1, T1\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: duplicate ids/);
    assert.match(check(root, "--target-phase", "3"), /INVALID LINE 3-build\/tasks\/T2.md: Depends on: duplicate ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n- **Depends on:** later\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror"), /INVALID Depends on: expected none or task ids/);
    write(root, "3-build/tasks/T2.md", "# T2: second\n\n- **Depends on:** T1\n");
    rp(root, "stamp", P("3-build/tasks/T2.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "3"), /INVALID LINE/);
  });

  test("every fixed line is validated against its grammar", () => {
    const cases = [
      ["Verdict: approved with caveats", /Verdict: expected approved \| rejected \| unsatisfiable/],
      ["Outcome: done", /Outcome: expected completed \| failed \| blocked/],
      ["Target: 1-spec\/spec.md", /Target: expected <path>#<id>/],
      ["Prior finding: 1-spec\/spec-review-1.md#Issue-1 resolved", /Prior finding: expected <review>#<issue>, resolution failed/],
      ["Origin: owner request", /Origin: expected issue <reference>, a source declaration, or a path/],
      ["Origin: PROJECT-42", /Origin: expected issue <reference>, a source declaration, or a path/],
      ["Brief:", /Brief: expected text/],
    ];
    for (const [line, error] of cases) {
      write(root, "1-spec/bad.md", `# Bad\n\n${line}\n`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), error);
      assert.match(check(root, "--target-phase", "1"), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
    write(root, "1-spec/bad.md", "# Good\n\nVerdict: approved\nOutcome: failed\nTarget: 1-spec/spec.md#R1\nPrior finding: 1-spec/spec-review-1.md#Issue-1, resolution failed\nOrigin: decision-1\nOrigin: 0-intent/1-amendment.md\nBrief: focused\n");
    rp(root, "stamp", P("1-spec/bad.md"), "--mirror");
    assert.doesNotMatch(check(root, "--target-phase", "1"), /INVALID LINE/);

    write(root, "0-intent/intent.md", "Origin: issue PROJECT-42 canonical reference\n\n# Intent\n\n## Goal\n\nOriginal.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "0-intent/intent.md")).data.get("origin"), "issue PROJECT-42 canonical reference");
  });

  test("fixed lines stay on one line and singleton declarations occur once", () => {
    for (const body of [
      "Brief:\nOrigin: decision-1\n",
      "Target:\n1-spec/spec.md#R1\n",
      "Depends on:\nT1\n",
      "Verdict: approved\nVerdict: rejected\n",
      "Brief: one\nBrief: two\n",
      "Target: 1-spec/spec.md#R1\nTarget: 1-spec/spec.md#R1\n",
      "Outcome: completed\nOutcome: failed\n",
    ]) {
      write(root, "1-spec/bad.md", `# Bad\n\n${body}`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), /INVALID/);
      assert.match(check(root, "--target-phase", "1"), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
  });

  test("a --- block inside a body is ordinary body text", () => {
    approveChain(1);
    const text = "# Spec Research\n\n---\nkey: value\n---\n\nBody.\n";
    write(root, "1-spec/spec-research.md", text);
    const out = check(root, "--target-phase", "1");
    assert.doesNotMatch(out, /INVALID FRONTMATTER 1-spec\/spec-research.md|differs from the body/);
    assert.deepEqual(parseFrontmatter(text), { data: null, body: text });
  });

  test("frontmatter delimiters and fixed lines inside fenced code are ordinary body text", () => {
    approveChain(1);
    write(root, "1-spec/example.md", "# Example\n\n```yaml\n---\nkey: value\n---\n```\n");
    write(root, "1-spec/long-fence.md", "# Example\n\n````markdown\n```\n---\nkey: value\n---\nOutcome: success\n```\n````\n");
    write(root, "1-spec/tilde-fence.md", "# Example\n\n~~~yaml\n---\nOutcome: success\n---\n~~~\n");
    const output = check(root, "--target-phase", "1");
    assert.doesNotMatch(output, /INVALID FRONTMATTER 1-spec\/(?:example|long-fence|tilde-fence)\.md/);
    assert.doesNotMatch(output, /INVALID LINE 1-spec\/(?:long-fence|tilde-fence)\.md/);
  });

  test("identity equals git's blob hash of the body, computed without git", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    for (const body of ["", "x", "# Spec\n", "ñ — unicode\n", "a\r\nb"]) assert.equal(identity(`---\npins:\n  - a@b\n---\n${body}`), gitHash(body));
  });

  test("a report's Commits section is mirrored whole, whatever the line format, and names only commits that exist", () => {
    approveChain(3);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    const shas = [];
    for (const [i, subject] of ["first", "second", "third"].entries()) {
      writeFileSync(join(root, `src${i}.js`), `${i}\n`);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", subject);
      shas.push(git(root, "rev-parse", "--short=10", "HEAD").trim());
    }
    write(root, "3-build/tasks/T1-report-1.md", `# Task report\n\nOutcome: completed\n\n## Commits\n\n- ${shas[0]} — first\n\`${shas[1]}\` second, in backticks\n${shas[2]} third, plain\n\n## Checks\n\n- 1234567 is not a commit: prose stays prose\n`);
    rp(root, "stamp", P("3-build/tasks/T1-report-1.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror");
    // Short hashes in the body are stored canonical: the full hash.
    const full = shas.map((s) => git(root, "rev-parse", s).trim());
    assert.match(read(root, "3-build/tasks/T1-report-1.md"), new RegExp(`commits:\\n  - ${full[0]}\\n  - ${full[1]}\\n  - ${full[2]}\\n`));
    assert.doesNotMatch(check(root, "--target-phase", "3"), /unclaimed/);
    write(root, "3-build/tasks/T2-report-1.md", "# Task report\n\nOutcome: completed\n\n## Commits\n\n- 0badc0ffee1 — never made\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/T2-report-1.md"), "--reviewed", P("3-build/tasks/T2.md"), "--reviewed", P("3-build/tasks/T1.md"), "--mirror"), /names a commit that does not exist or is ambiguous: 0badc0ffee1/);
  });

  test("frontmatter lists are read in block and inline form; an empty inline list is empty", () => {
    assert.deepEqual(parseFrontmatter("---\ncommits: [abc1234, def5678]\n---\n").data.get("commits"), ["abc1234", "def5678"]);
    assert.deepEqual(parseFrontmatter("---\ncommits: []\n---\n").data.get("commits"), []);
    assert.deepEqual(parseFrontmatter("---\ncommits:\n  - abc1234\n---\n").data.get("commits"), ["abc1234"]);
    assert.deepEqual(parseFrontmatter("---\norigin: [owner's-note.md]\n---\n").data.get("origin"), ["owner's-note.md"]);
  });

  test("identity is the body's exact bytes as git hashes them: CRLF is never normalized; only delimiter lines tolerate a \\r", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "1-spec/spec.md", "# Spec\r\n");
    assert.equal(identity(read(root, "1-spec/spec.md")), gitHash("# Spec\r\n"));
    assert.notEqual(identity("# Spec\r\n"), identity("# Spec\n"));
    stampSpec();
    const text = read(root, "1-spec/spec.md");
    assert.match(text, /^---\npins:\n[\s\S]*---\n# Spec\r\n$/);
    assert.equal(identity(text), gitHash("# Spec\r\n"));
    // Delimiter lines may carry a \r; the closing one may end the file.
    assert.equal(identity("---\r\nnote: x\r\n---\r\n# Spec\r\n"), gitHash("# Spec\r\n"));
    assert.deepEqual(parseFrontmatter("---\nnote: x\n---"), { data: new Map([["note", "x"]]), body: "" });
    assert.deepEqual(parseFrontmatter("---\n---\nbody\n"), { data: new Map(), body: "body\n" });
  });

  test("the pipeline tree holds no symlinks: stamp refuses them, check reports them without following", () => {
    stampSpec();
    approveSpec();
    const victim = join(root, "victim.md");
    writeFileSync(victim, "# Victim\n");
    execFileSync("ln", ["-sf", victim, join(root, P("1-spec/link.md"))]);
    assert.throws(() => rp(root, "stamp", P("1-spec/link.md"), "--mirror"), /symlinked/);
    // A cyclic folder symlink never aborts the walk.
    execFileSync("ln", ["-s", "..", join(root, P("1-spec/loop"))]);
    const pinned = read(root, "1-spec/spec.md").replace("pins:\n", "pins:\n  - 1-spec/loop@aaaaaaaaaaaa\n");
    write(root, "1-spec/spec.md", pinned);
    let output = check(root, "--target-phase", "1");
    assert.match(output, /symlink\s+1-spec\/link\.md\n/);
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "with symlinks");
    output = check(root, "--ref", "demo", "--target-phase", "1");
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    execFileSync("ln", ["-s", "1-spec", join(root, PIPELINE, "alias")]);
    assert.throws(() => rp(root, "stamp", P("alias/spec.md"), "--mirror"), /symlinked/);
  });

  test("the CLI validates its inputs and fails aloud: no gate is silently disabled, no option silently ignored", () => {
    stampSpec();
    approveSpec();
    for (const bad of ["0", "5", "abc", "1.5", "-1"]) assert.throws(() => check(root, "--target-phase", bad), /--target-phase expects an integer from 1 to 4/);
    assert.throws(() => check(root, "--force"), /option --force is not allowed/);
    assert.throws(() => check(root, "--set", "verdict=garbage"), /check: option --set is not allowed/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--json"), /stamp: option --json is not allowed/);
    assert.throws(() => rp(root, "fingerprint", "security", "extra"), /unexpected positional argument/);
    assert.throws(() => rp(root, "check", PIPELINE, "extra", "--base", "main"), /unexpected positional argument/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin"), /--pin expects a value/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--set", "lane=111111111111", "--set", "lane=222222222222"), /--set may appear only once/);
    const invalid = ".pipelines/bad_name";
    mkdirSync(join(root, invalid, "0-intent"), { recursive: true });
    writeFileSync(join(root, invalid, "0-intent/intent.md"), "# Intent\n");
    assert.throws(() => rp(root, "check", invalid, "--base", "main"), /pipeline folder name must be one segment without \/ or _/);
    assert.match(check(root, "--target-phase", "1"), /frontier complete/);
  });

  test("--help defines body identity and mandatory named-lane fingerprints", () => {
    const help = rp(root, "--help");
    assert.match(help, /first 12 hexadecimal characters of\ngit's blob hash of every body byte/);
    assert.match(help, /each named\nlane carries the fingerprint/);
  });

  test("check --json carries the state", () => {
    const state = JSON.parse(check(root, "--json"));
    for (const key of ["pipeline", "triggers", "claims", "lanes", "artifacts", "tasks", "counters", "frontier", "completeThrough", "complete"]) {
      assert.ok(key in state, `missing ${key}`);
    }
  });
});
