import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { PIPELINE, git, P, write, read, rp, root, lane, configure, SPEC, review, stampSpec, approveSpec, stampDesign, approveDesign, buildDone, commitAll, useFixture } from "./fixture.mjs";

const metrics = (...args) => rp(root, "metrics", PIPELINE, ...args);
const json = (...args) => JSON.parse(metrics("--json", ...args));
const commitAt = (date, subject) => {
  git(root, "add", "-A");
  execFileSync("git", ["commit", "--quiet", "--allow-empty", "-m", subject], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
};
const constraint = (n, target, origin = "issue 7") => {
  write(root, `0-intent/constraint-${n}.md`, `# Constraint ${n}\n\ntarget: ${target}\norigin: ${origin}\n\nRuling.\n`);
  rp(root, "stamp", P(`0-intent/constraint-${n}.md`), "--mirror");
};
const SPEC_WITH = (inputs) => [...SPEC, ...inputs];

describe("rp metrics", () => {
  useFixture();

  test("elapsed spans the commit adding the intent to the last commit touching the pipeline", () => {
    const added = git(root, "log", "--format=%aI", "--diff-filter=A", "-1", "HEAD", "--", P("0-intent/intent.md")).trim();
    const at = (seconds) => `${new Date((Date.parse(added) / 1000 + seconds + 7200) * 1000).toISOString().replace(/\.000Z$/, "")}+02:00`;
    stampSpec();
    approveSpec();
    commitAt(at(3600), "spec");
    configure({ targetPhase: 1 });
    commitAt(at(86400 + 7200 + 180), "target");
    const state = json();
    assert.deepEqual(state.elapsed, { from: added, to: at(86400 + 7200 + 180), seconds: 86400 + 7200 + 180 });
    assert.match(metrics(), new RegExp(`^elapsed   1d 2h 3m  \\(${added.replace(/\+/g, "\\+")} → ${at(86400 + 7200 + 180).replace(/\+/g, "\\+")}\\)$`, "m"));
  });

  test("a correction costs the waves carrying it through the first valid one; earlier and later waves are not counted", () => {
    stampSpec();
    approveSpec(1);
    constraint(1, "1-spec/spec.md#spec-requirement-1", "1-spec/spec-review-1.md");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/constraint-1.md"));
    const carried = SPEC_WITH(["0-intent/constraint-1.md"]);
    review("1-spec/spec-review-2.md", "rejected", carried);
    let state = json();
    assert.deepEqual(state.laterInputs, [{ path: "0-intent/constraint-1.md", kind: "constraint", origin: "1-spec/spec-review-1.md", corrections: [{ artifact: "1-spec/spec.md", waves: 1, accepted: false }] }]);
    assert.match(metrics(), /^input     0-intent\/constraint-1\.md \(constraint, origin: 1-spec\/spec-review-1\.md\) → 1-spec\/spec\.md  1 wave so far$/m);
    review("1-spec/spec-review-3.md", "approved", carried);
    review("1-spec/spec-review-4.md", "rejected", carried);
    state = json();
    assert.deepEqual(state.laterInputs[0].corrections, [{ artifact: "1-spec/spec.md", waves: 2, accepted: true }]);
    assert.match(metrics(), /→ 1-spec\/spec\.md  accepted after 2 waves$/m);
  });

  test("acceptance needs every declared lane's approval in one carrying wave", () => {
    configure({ targetPhase: 1, lanes: [lane("spec-reviewer", "security")] });
    constraint(1, "1-spec/spec.md");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/constraint-1.md"));
    const carried = SPEC_WITH(["0-intent/constraint-1.md"]);
    review("1-spec/spec-review-1.md", "approved", carried);
    review("1-spec/spec-review-security-1.md", "rejected", carried);
    assert.deepEqual(json().laterInputs[0].corrections, [{ artifact: "1-spec/spec.md", waves: 1, accepted: false }]);
    review("1-spec/spec-review-2.md", "approved", carried);
    review("1-spec/spec-review-security-2.md", "approved", carried);
    assert.deepEqual(json().laterInputs[0].corrections, [{ artifact: "1-spec/spec.md", waves: 2, accepted: true }]);
  });

  test("a later input naming several clauses of one artifact is one correction; one naming two artifacts is two", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    approveDesign();
    constraint(1, "1-spec/spec.md#spec-requirement-1, 1-spec/spec.md, 2-design-doc/design-doc.md");
    const [input] = json().laterInputs;
    assert.deepEqual(input.corrections, [
      { artifact: "1-spec/spec.md", waves: 0, accepted: false },
      { artifact: "2-design-doc/design-doc.md", waves: 0, accepted: false },
    ]);
    assert.deepEqual(json().phases.map((p) => p.laterInputs), [["0-intent/constraint-1.md"], ["0-intent/constraint-1.md"], [], []]);
  });

  test("a phase ran autonomously under the autonomous workflow with no later input targeting its artifact", () => {
    buildDone();
    constraint(1, "2-design-doc/design-doc.md");
    const state = json();
    assert.deepEqual(state.phases.map(({ phase, ran, autonomous, laterInputs }) => ({ phase, ran, autonomous, laterInputs })), [
      { phase: "1-spec", ran: true, autonomous: true, laterInputs: [] },
      { phase: "2-design-doc", ran: true, autonomous: false, laterInputs: ["0-intent/constraint-1.md"] },
      { phase: "3-build", ran: true, autonomous: true, laterInputs: [] },
      { phase: "4-document", ran: false, autonomous: null, laterInputs: [] },
    ]);
    assert.deepEqual(state.phases[2], { phase: "3-build", ran: true, workflow: "autonomous", autonomous: true, laterInputs: [], waves: 1, tasks: 2, attempts: 2, reviewWaves: 1 });
    assert.equal(state.phases[3].workflow, null);
    assert.equal("tasks" in state.phases[0], false);
    assert.deepEqual(state.autonomy, { autonomous: 2, ran: 3 });
    const text = metrics();
    assert.match(text, /^phase     1-spec        autonomous  waves 1$/m);
    assert.match(text, /^phase     2-design-doc  intervened  waves 1  inputs: 0-intent\/constraint-1\.md$/m);
    assert.match(text, /^phase     3-build       autonomous  waves 1  tasks 2  attempts 2  build review waves 1$/m);
    assert.match(text, /^phase     4-document    not run$/m);
    assert.match(text, /^autonomy  2\/3 phases ran autonomously$/m);
  });

  test("phases are listed through the target phase", () => {
    stampSpec();
    approveSpec();
    configure({ targetPhase: 2 });
    assert.deepEqual(json().phases.map((p) => p.phase), ["1-spec", "2-design-doc"]);
  });

  test("completion is autonomous only when the target is reached under the autonomous workflow with no later input", () => {
    stampSpec();
    approveSpec();
    configure({ targetPhase: 1 });
    let state = json();
    assert.deepEqual(state.completion, { complete: true, through: 1, targetPhase: 1, autonomous: true });
    assert.match(metrics(), /^complete  through phase 1 — target reached  autonomous$/m);
    constraint(1, "1-spec/spec.md");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/constraint-1.md"));
    review("1-spec/spec-review-2.md", "approved", SPEC_WITH(["0-intent/constraint-1.md"]));
    state = json();
    assert.deepEqual(state.completion, { complete: true, through: 1, targetPhase: 1, autonomous: false });
    assert.match(metrics(), /^complete  through phase 1 — target reached  intervened  inputs: 0-intent\/constraint-1\.md$/m);
    configure({ targetPhase: 2 });
    state = json();
    assert.deepEqual(state.completion, { complete: false, through: 1, targetPhase: 2, autonomous: false });
    assert.match(metrics(), /^complete  through phase 1 \(target 2\)$/m);
  });

  test("a phase is assisted when a commit touching its folder ran under the assisted workflow; a later configuration keeps it", () => {
    configure({ workflow: "assisted", targetPhase: 1 });
    commitAll("assisted");
    constraint(1, "1-spec/spec.md");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/constraint-1.md"));
    review("1-spec/spec-review-1.md", "approved", SPEC_WITH(["0-intent/constraint-1.md"]));
    commitAll("spec approved by the owner");
    let state = json();
    assert.deepEqual(state.phases.map(({ workflow, autonomous }) => ({ workflow, autonomous })), [{ workflow: "assisted", autonomous: false }]);
    assert.equal(state.completion.autonomous, false);
    let text = metrics();
    assert.match(text, /^phase     1-spec        assisted    waves 1  inputs: 0-intent\/constraint-1\.md$/m);
    assert.match(text, /^complete  through phase 1 — target reached  assisted  inputs: 0-intent\/constraint-1\.md$/m);
    configure({ targetPhase: 2 });
    commitAll("autonomous");
    stampDesign();
    approveDesign();
    commitAll("design approved");
    state = json();
    assert.deepEqual(state.phases.map(({ workflow, autonomous }) => ({ workflow, autonomous })), [{ workflow: "assisted", autonomous: false }, { workflow: "autonomous", autonomous: true }]);
    assert.deepEqual(state.autonomy, { autonomous: 1, ran: 2 });
    assert.equal(state.completion.autonomous, false);
  });

  // A side branch touches the spec folder; the merge keeps the mainline's tree.
  const mergeDiscarding = (side) => {
    git(root, "checkout", "--quiet", "-b", "side");
    side();
    write(root, "1-spec/spec-research.md", "# Spec research\n\nOn the side.\n");
    commitAll("side");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--quiet", "--no-ff", "-s", "ours", "-m", "merge side", "side");
  };

  test("every side of a merge counts: a merge discarding a phase's assisted work leaves it assisted", () => {
    mergeDiscarding(() => configure({ workflow: "assisted" }));
    assert.equal(json().phases[0].workflow, "assisted");
  });

  test("every side of a merge is read: a discarded commit without a run configuration stops metrics", () => {
    mergeDiscarding(() => rmSync(join(root, P("run-config.md"))));
    const side = git(root, "rev-parse", "side").trim();
    assert.throws(() => metrics(), new RegExp(`metrics: ${side.slice(0, 12)}: missing run-config\\.md`));
  });

  test("a phase no commit touches runs under the current configuration; a committed one under its history", () => {
    configure({ workflow: "assisted", targetPhase: 4 });
    write(root, "4-document/document-plan.md", "# Document plan\n");
    assert.deepEqual(json().phases.map((p) => p.workflow), ["autonomous", "autonomous", "autonomous", "assisted"]);
  });

  test("a correction is accepted by the first valid wave carrying it: every lane approves the reference, filtered by its materials", () => {
    const filtered = ["1-spec/spec.md", "1-spec/spec-research.md"];
    configure({ targetPhase: 1, lanes: [lane("spec-reviewer", "security"), lane("spec-reviewer", "focus", { materials: filtered })] });
    constraint(1, "1-spec/spec.md");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/constraint-1.md"));
    const carried = SPEC_WITH(["0-intent/constraint-1.md"]);
    const corrections = () => json().laterInputs[0].corrections;
    review("1-spec/spec-review-1.md", "approved", carried);
    review("1-spec/spec-review-security-1.md", "approved", SPEC);
    review("1-spec/spec-review-focus-1.md", "approved", filtered);
    assert.deepEqual(corrections(), [{ artifact: "1-spec/spec.md", waves: 1, accepted: false }]);
    review("1-spec/spec-review-2.md", "approved", carried);
    review("1-spec/spec-review-security-2.md", "approved", carried);
    assert.deepEqual(corrections(), [{ artifact: "1-spec/spec.md", waves: 2, accepted: false }]);
    review("1-spec/spec-review-3.md", "approved", carried);
    review("1-spec/spec-review-security-3.md", "approved", carried);
    review("1-spec/spec-review-focus-3.md", "approved", filtered);
    assert.deepEqual(corrections(), [{ artifact: "1-spec/spec.md", waves: 3, accepted: true }]);
  });

  test("--ref reads the pipeline and its history from a commit", () => {
    stampSpec();
    approveSpec();
    configure({ targetPhase: 1 });
    commitAll("spec approved");
    git(root, "branch", "other");
    write(root, "1-spec/spec.md", "# Spec\n\nChanged on the working tree.\n");
    constraint(1, "1-spec/spec.md");
    const state = json("--ref", "other");
    assert.equal(state.ref, git(root, "rev-parse", "other").trim());
    assert.deepEqual(state.laterInputs, []);
    assert.equal(state.completion.complete, true);
    assert.match(metrics("--ref", "other"), new RegExp(`^${PIPELINE.replace(".", "\\.")} @ other \\([0-9a-f]{12}\\)$`, "m"));
    assert.equal(json().completion.complete, false);
  });

  test("a contradiction or an unrecorded history stops metrics", () => {
    stampSpec();
    approveSpec();
    write(root, "1-spec/spec-review-1.md", "---\nnot json\n---\n# Review\n\nverdict: approved\n");
    assert.throws(() => metrics(), /metrics: INVALID FRONTMATTER 1-spec\/spec-review-1\.md/);
    write(root, "../other/run-config.md", '---\n{ "workflow": "autonomous", "target-phase": 1, "base": "main" }\n---\n');
    write(root, "../other/0-intent/intent.md", "origin: issue 8\n\n# Intent\n\n## Goal\n\nUncommitted.\n");
    rp(root, "stamp", ".pipelines/other/0-intent/intent.md", "--mirror");
    assert.throws(() => rp(root, "metrics", ".pipelines/other"), /metrics: no commit adds \.pipelines\/other\/0-intent\/intent\.md/);
  });

  test("a commit touching a phase without a readable run configuration stops metrics", () => {
    const config = read(root, "run-config.md");
    rmSync(join(root, P("run-config.md")));
    write(root, "1-spec/spec-research.md", "# Spec research\n\nRevised.\n");
    const commit = commitAll("record without configuration");
    write(root, "run-config.md", config);
    assert.throws(() => metrics(), new RegExp(`metrics: ${commit.slice(0, 12)}: missing run-config\\.md`));
  });

  test("metrics accepts only its documented options", () => {
    assert.throws(() => metrics("--review", "x"), /metrics: option --review is not allowed/);
    assert.throws(() => metrics("--json", "--json"), /--json may appear only once/);
    assert.throws(() => rp(root, "metrics", PIPELINE, "extra"), /unexpected positional argument/);
  });
});
