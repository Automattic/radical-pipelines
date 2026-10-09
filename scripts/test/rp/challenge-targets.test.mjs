import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, parseFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { git, P, write, read, rp, root, lane, standard, configure, check, SPEC, DESIGN, review, checkWithoutBase, pairs, registered, registeredVerdict, stampSpec, approveSpec, stampDesign, report, approveChain, proposal, useFixture } from "./fixture.mjs";

describe("rp challenge targets and claims", () => {
  useFixture();

  for (const clause of [false, true])
    test(`challenge targets: direct two-target lifecycle with ${clause ? "clauses" : "whole artifacts"}`, () => {
      const build = "3-build/build-plan.md", document = "4-document/document-plan.md";
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
      registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
      const inputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
      const task = "3-build/tasks/build-task-1.md", report = "3-build/tasks/build-task-1-report-1.md";
      registered(task, { "depends-on": [] }, "# Task\ndepends-on: none\n");
      registered(report, { reviewed: pairs([task]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
      registered(build, { pins: pairs(inputs) }, "# Plan\nbuild-assumption-1: Assumption.\n");
      const buildPackage = [build, "3-build/build-plan-research.md", ...inputs, task];
      registeredVerdict("3-build/build-plan-review-1.md", pairs(buildPackage));
      registeredVerdict("3-build/build-review-1.md", pairs([...buildPackage, report]));
      const documentInputs = [...inputs, build, "3-build/build-plan-review-1.md", "3-build/build-review-1.md", task, report];
      registered(document, { pins: pairs(documentInputs) }, "# Plan\ndocument-assumption-1: Assumption.\n");
      write(root, "4-document/document-plan-research.md", "# Record\n");
      const documentPackage = [document, "4-document/document-plan-research.md", ...documentInputs];
      registeredVerdict("4-document/document-plan-review-1.md", pairs(documentPackage));
      const state = () => JSON.parse(check(root, "--json"));
      assert.equal(state().artifacts[3].approved, true);

      const challenge = "0-intent/proposal-1.md";
      const targets = [document, build].map((path) => `${path}${clause ? `#${path.startsWith("3-build") ? "build" : "document"}-assumption-1` : ""}`);
      registered(challenge, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
      const pending = state();
      assert.equal(pending.frontier, `converge ${build}`);
      assert.deepEqual(pending.challenges.map((t) => [t.target, t.state, t.challengeResolved]), [[targets[0], "pending", false], [targets[1], "pending", false]]);
      configure({ targetPhase: 3 });
      assert.equal(state().challenges.find((t) => t.target === targets[0]).inScope, false);
      configure();

      registered(build, { pins: pairs([...inputs, challenge]) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["pending", "adjudicated"]);
      registeredVerdict("3-build/build-plan-review-2.md", pairs([...buildPackage, challenge]));
      const built = state();
      assert.deepEqual(built.challenges.map((t) => t.state), ["pending", "resolved"]);
      assert.equal(built.frontier, "build review");
      assert.deepEqual(built.artifacts[3].materials.challenges, [challenge]);
      assert.equal(built.artifacts[3].state, "stale");
      assert.deepEqual(built.artifacts[3].stale, ["package members"]);
      assert.equal(built.challenges.every((t) => !t.challengeResolved), true);

      registeredVerdict("3-build/build-review-2.md", pairs([...buildPackage, report, challenge]));
      configure({ targetPhase: 3 });
      assert.equal(state().complete, true);
      configure();
      assert.equal(state().frontier, `converge ${document}`);
      assert.deepEqual(state().artifacts[3].materials.challenges, [challenge]);
      const repinned = [...inputs, build, "3-build/build-plan-review-2.md", "3-build/build-review-2.md", task, report, challenge];
      registered(document, { pins: pairs(repinned) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["adjudicated", "resolved"]);
      registeredVerdict("4-document/document-plan-review-2.md", pairs([document, "4-document/document-plan-research.md", ...repinned]));
      const resolved = state();
      assert.deepEqual(resolved.challenges.map((t) => t.state), ["resolved", "resolved"]);
      assert.equal(resolved.challenges.every((t) => t.challengeResolved), true);
      assert.equal(resolved.artifacts[3].approved, true);
      assert.doesNotMatch(resolved.frontier, /^challenge /);
    });

  for (const targets of [["3-build/build-plan.md"], ["3-build/build-plan.md", "1-spec/spec.md#spec-requirement-1"]])
    test(`challenge targets: stamp retains ${targets.length} proposal targets after clauses change`, () => {
      proposal(targets.join(", "));
      const rel = "0-intent/proposal-1.md";
      const data = () => parseFrontmatter(read(root, rel)).data;
      assert.deepEqual(data().get("target"), targets);
      assert.equal(data().has("target-identity"), false);
      write(root, "1-spec/spec.md", "# Spec\nClause removed.\n");
      write(root, "3-build/build-plan.md", "# Plan changed\n");
      write(root, rel, read(root, rel).replace(`target: ${targets.join(", ")}`, `target: ${[...targets].reverse().join(", ")}`));
      rp(root, "stamp", P(rel), "--mirror");
      assert.equal(data().has("target-identity"), false);
      assert.deepEqual(data().get("target"), [...targets].reverse());
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "land targets");
      const { ref: workingRef, ...working } = JSON.parse(check(root, "--json"));
      const { ref: committedRef, ...committed } = JSON.parse(check(root, "--ref", "HEAD", "--json"));
      assert.deepEqual(working, committed);
    });

  test("challenge targets: corroboration resolves only the target whose wave names the origin", () => {
    const challenge = "0-intent/proposal-1.md", targets = ["1-spec/spec.md", "2-design-doc/design-doc.md"];
    registered(challenge, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", challenge]) });
    registered("1-spec/spec-review-1.md", {
      reviewed: pairs([...SPEC, challenge]), verdict: "unsatisfiable", target: ["0-intent/intent.md#intent-goal"],
      "target-identity": [identity(read(root, "0-intent/intent.md"), "0-intent/intent.md")], origin: challenge,
    }, `# Review\nverdict: unsatisfiable\ntarget: 0-intent/intent.md#intent-goal\norigin: ${challenge}\n`);
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(state.challenges.map((t) => t.state), ["resolved", "pending"]);
    assert.match(state.challenges[0].detail, /^escalated by/);
    assert.equal(state.challenges.every((t) => !t.challengeResolved), true);
    assert.equal(state.frontier, "claim 1-spec/spec-review-1.md → 0-intent/intent.md#intent-goal (owner escalation)");
    assert.deepEqual(state.artifacts[1].materials.challenges, [challenge]);
  });

  test("challenge targets: new targets validate atomically while retained targets keep landing facts", () => {
    const rel = "0-intent/proposal-1.md";
    proposal("1-spec/spec.md#spec-requirement-1");
    write(root, "1-spec/spec.md", "# Changed\nClause removed.\n");
    const invalid = read(root, rel).replace("target: 1-spec/spec.md#spec-requirement-1", "target: 1-spec/spec.md#spec-requirement-1, 2-design-doc/design-doc.md#design-doc-decision-99");
    write(root, rel, invalid);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET 2-design-doc\/design-doc.md#design-doc-decision-99/);
    assert.equal(read(root, rel), invalid);
    write(root, rel, invalid.replace("#design-doc-decision-99", "#design-doc-decision-1"));
    rp(root, "stamp", P(rel), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, rel)).data.get("target"), ["1-spec/spec.md#spec-requirement-1", "2-design-doc/design-doc.md#design-doc-decision-1"]);
  });

  for (const targets of ["3-build/build-plan.md, 1-spec/spec.md#spec-requirement-99", "3-build/build-plan.md, 0-intent/intent.md#intent-goal", "3-build/build-plan.md, 2-design-doc/design-doc-research.md"])
    test(`challenge targets: rejects the whole proposal list containing ${targets.split(", ")[1]}`, () => {
      const rel = "0-intent/proposal-1.md", body = `# Proposal\ntarget: ${targets}\norigin: issue 9\n`;
      write(root, rel, body);
      assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET/);
      assert.equal(read(root, rel), body);
    });

  for (const target of ["1-spec/spec.md", "1-spec/spec.md#spec-requirement-1, 0-intent/intent.md#intent-goal"])
    test(`challenge targets: a claim rejects ${target}`, () => {
      const rel = "1-spec/spec-review-1.md", body = `# Review\nverdict: unsatisfiable\ntarget: ${target}\n`;
      write(root, rel, body);
      assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID TARGET/);
      assert.equal(read(root, rel), body);
    });

  test("challenge targets: failed reports land on one clause and reject whole-artifact targets", () => {
    const rel = "3-build/tasks/build-task-1-report-1.md", task = "3-build/tasks/build-task-1.md";
    registered(task, { "depends-on": [] }, "# build-task-1\ndepends-on: none\n");
    write(root, rel, "# Report\noutcome: failed\ntarget: 3-build/build-plan.md\n");
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET/);
    write(root, rel, "# Report\noutcome: failed\n");
    rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task));
    assert.deepEqual(parseFrontmatter(read(root, rel)).data.get("target"), ["3-build/build-plan.md#build-task-1"]);
    assert.equal(JSON.parse(check(root, "--json")).challenges[0].target, "3-build/build-plan.md#build-task-1");
  });

  test("challenge fields: a review may name a target after declaring unsatisfiable", () => {
    stampSpec();
    const rel = "1-spec/spec-review-1.md";
    write(root, rel, "# Review\nverdict: approved\ntarget: 0-intent/intent.md#intent-goal\n");
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror", ...SPEC.flatMap((path) => ["--reviewed", P(path)])), /only challenges may carry target fields/);
    const body = read(root, rel).replace(/^verdict: approved$/m, "verdict: unsatisfiable");
    write(root, rel, body);
    rp(root, "stamp", P(rel), "--mirror", ...SPEC.flatMap((path) => ["--reviewed", P(path)]));
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(state.contradictions, []);
    assert.match(state.claims[0].state, /^PENDING — owner escalation$/);
  });

  for (const kind of ["approved review", "rejected review", "artifact", "record", "task"])
    for (const representation of ["declaration", "mirrored", "target", "target-identity"])
      test(`challenge fields: ${kind} rejects ${representation} at stamp and check`, () => {
        const review = kind.endsWith("review");
        const rel = review ? "1-spec/spec-review-1.md" : { artifact: "1-spec/spec.md", record: "1-spec/spec-research.md", task: "3-build/tasks/build-task-1.md" }[kind];
        const fields = review ? { verdict: kind.split(" ")[0], reviewed: pairs(SPEC) } : kind === "artifact" ? { pins: pairs(["0-intent/intent.md"]) } : kind === "task" ? { "depends-on": [] } : {};
        const target = "1-spec/spec.md#spec-requirement-1";
        const body = `# File\n${review ? `verdict: ${fields.verdict}\n` : kind === "task" ? "depends-on: none\n" : ""}${["declaration", "mirrored"].includes(representation) ? `target: ${target}\n` : ""}`;
        if (["target", "mirrored"].includes(representation)) fields.target = [target];
        if (["target-identity", "mirrored"].includes(representation)) fields["target-identity"] = [identity(read(root, "1-spec/spec.md"), "1-spec/spec.md")];
        if (representation === "declaration") {
          write(root, rel, body);
          const unstamped = checkWithoutBase();
          assert.equal(unstamped.frontier, `stamp ${rel}`);
          assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /only challenges may carry target fields/);
          assert.equal(read(root, rel), body);
        }
        registered(rel, fields, body);
        const before = read(root, rel);
        assert.throws(() => rp(root, "stamp", P(rel), ...(representation === "mirrored" ? ["--mirror"] : [])), /only challenges may carry target fields/);
        assert.equal(read(root, rel), before);
        const state = checkWithoutBase();
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /only challenges may carry target fields/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.claims, []);
        assert.deepEqual(state.artifacts, []);
      });

  for (const [phase, tp] of [["3-build", "build-task"], ["4-document", "document-task"]])
    for (const destination of ["spec", "design", "other phase", "other task"])
      test(`challenge review: ${phase} report rejects ${destination} at stamp and check`, () => {
        write(root, "4-document/document-plan.md", "# Plan\n");
        for (const folder of ["3-build", "4-document"])
          for (const id of [1, 2].map((n) => `${folder === "3-build" ? "build-task" : "document-task"}-${n}`)) registered(`${folder}/tasks/${id}.md`, { "depends-on": [] }, `# ${id}\ndepends-on: none\n`);
        const task = `${phase}/tasks/${tp}-1.md`, rel = `${phase}/tasks/${tp}-1-report-1.md`;
        const plan = phase === "3-build" ? "3-build/build-plan.md" : "4-document/document-plan.md";
        const other = phase === "3-build" ? "4-document/document-plan.md" : "3-build/build-plan.md";
        const target = { spec: "1-spec/spec.md#spec-requirement-1", design: "2-design-doc/design-doc.md#design-doc-decision-1", "other phase": `${other}#${phase === "3-build" ? "document-task" : "build-task"}-1`, "other task": `${plan}#${tp}-2` }[destination];
        const body = `# Report\noutcome: failed\ntarget: ${target}\n`;
        write(root, rel, body);
        assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET.*expected its own task/);
        assert.equal(read(root, rel), body);
        registered(rel, { outcome: "failed", attempt: "1", reviewed: pairs([task]), target: [target], "target-identity": [identity(read(root, target.split("#")[0]), target.split("#")[0])] }, body);
        const state = checkWithoutBase();
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target: expected its own task/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.artifacts, []);
      });

  for (const [phase, tp] of [["3-build", "build-task"], ["4-document", "document-task"]])
    for (const outcome of ["completed", "blocked"])
      test(`challenge re-review: ${phase} ${outcome} report cannot have a target`, () => {
        const plan = phase === "3-build" ? "3-build/build-plan.md" : "4-document/document-plan.md";
        const task = `${phase}/tasks/${tp}-1.md`, rel = `${phase}/tasks/${tp}-1-report-1.md`;
        write(root, plan, "# Plan\n");
        registered(task, { "depends-on": [] }, "# Task\ndepends-on: none\n");
        const target = `${plan}#${tp}-1`, body = `# Report\noutcome: ${outcome}\ntarget: ${target}\n`;
        write(root, rel, body);
        assert.throws(() => rp(root, "stamp", P(rel), "--mirror", "--reviewed", P(task)), /INVALID TARGET.*only challenges/);
        assert.equal(read(root, rel), body);
        registered(rel, { outcome, attempt: "1", reviewed: pairs([task]), target: [target], "target-identity": [identity(read(root, plan), plan)] }, body);
        const state = checkWithoutBase();
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target: only challenges/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.tasks, {});
      });

  for (const frontmatter of ["absent", "empty"])
    test(`challenge re-review: proposal with ${frontmatter} frontmatter has the correct repair frontier`, () => {
      const rel = "0-intent/proposal-1.md", body = "# Proposal\ntarget: 1-spec/spec.md#spec-requirement-1\norigin: issue 9\n";
      if (frontmatter === "absent") write(root, rel, body);
      else registered(rel, frontmatter === "empty" ? {} : { target: ["1-spec/spec.md#spec-requirement-1"], origin: "issue 9" }, body);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "record proposal before stamp");
      const state = checkWithoutBase();
      assert.equal(state.frontier, `${frontmatter === "absent" ? "stamp" : "INVALID FRONTMATTER"} ${rel}`);
      assert.deepEqual(state.challenges, []);
      assert.deepEqual(state.artifacts, []);
      if (frontmatter === "absent") {
        assert.deepEqual(state.contradictions[0].mirrors, ["target", "origin"]);
        assert.equal(state.contradictions[0].invalid, undefined);
      } else assert.match(state.contradictions[0].invalid, /target/);
      rp(root, "stamp", P(rel), "--mirror");
      const stamped = JSON.parse(check(root, "--json"));
      assert.deepEqual(stamped.contradictions, []);
      assert.equal(stamped.frontier, "stamp 1-spec/spec.md");
      assert.deepEqual(stamped.artifacts[0].materials.challenges, [rel]);
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      assert.equal(JSON.parse(check(root, "--json")).frontier, "converge 1-spec/spec.md");
    });

  for (const kind of ["claim", "failed report"])
    for (const defect of ["absent", "short", "long", "invalid"])
      test(`challenge review: ${kind} rejects ${defect} target identities before facts`, () => {
        const task = "3-build/tasks/build-task-1.md";
        registered(task, { "depends-on": [] }, "# Task\ndepends-on: none\n");
        const rel = { proposal: "0-intent/proposal-1.md", claim: "1-spec/spec-review-1.md", "failed report": "3-build/tasks/build-task-1-report-1.md" }[kind];
        const targets = { proposal: ["1-spec/spec.md", "2-design-doc/design-doc.md"], claim: ["0-intent/intent.md#intent-goal"], "failed report": ["3-build/build-plan.md#build-task-1"] }[kind];
        const identities = targets.map((t) => identity(read(root, t.split("#")[0]), t.split("#")[0]));
        const fields = { target: targets, ...(kind === "claim" ? { verdict: "unsatisfiable", reviewed: pairs(SPEC) } : kind === "failed report" ? { outcome: "failed", attempt: "1", reviewed: pairs([task]) } : { origin: "issue 9" }) };
        if (defect !== "absent") fields["target-identity"] = { short: identities.slice(1), long: [...identities, identities[0]], invalid: identities.map(() => "not-a-hash") }[defect];
        const declaration = kind === "claim" ? "verdict: unsatisfiable" : kind === "failed report" ? "outcome: failed" : "origin: issue 9";
        registered(rel, fields, `# Challenge\n${declaration}\ntarget: ${targets.join(", ")}\n`);
        const before = read(root, rel);
        const state = checkWithoutBase();
        assert.equal(state.frontier, `INVALID FRONTMATTER ${rel}`);
        assert.match(state.contradictions[0].invalid, /target-identity/);
        assert.deepEqual(state.challenges, []);
        assert.deepEqual(state.claims, []);
        assert.deepEqual(state.artifacts, []);
        assert.equal(state.base, undefined);
        assert.throws(() => rp(root, "stamp", P(rel)), /INVALID FRONTMATTER.*target-identity/);
        assert.equal(read(root, rel), before);
      });

  for (const targets of [["1-spec/spec.md", "1-spec/spec.md#spec-requirement-1"], ["1-spec/spec.md#spec-requirement-1", "1-spec/spec.md#spec-requirement-2"]])
    test(`challenge review: one artifact adjudicates ${targets.join(", ")} together`, () => {
      const artifact = "1-spec/spec.md", challenge = "0-intent/proposal-1.md";
      write(root, artifact, "# Spec\nspec-requirement-1: Requirement.\nspec-requirement-2: Requirement.\n");
      rp(root, "stamp", P(artifact), "--mirror");
      registered(challenge, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
      assert.doesNotThrow(() => rp(root, "stamp", P(challenge), "--mirror"));
      configure({ targetPhase: 1 });
      const state = () => JSON.parse(check(root, "--json"));
      assert.deepEqual(state().challenges.map((t) => t.state), ["pending", "pending"]);
      assert.deepEqual(state().artifacts[0].materials.challenges, [challenge]);
      registered(artifact, { pins: pairs(["0-intent/intent.md", challenge]) });
      assert.deepEqual(state().challenges.map((t) => t.state), ["adjudicated", "adjudicated"]);
      registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, challenge]));
      const resolved = state();
      assert.deepEqual(resolved.challenges.map((t) => t.state), ["resolved", "resolved"]);
      assert.equal(resolved.challenges.every((t) => t.challengeResolved), true);
      assert.equal(resolved.complete, true);
      assert.equal(resolved.frontier, "complete");
    });

  test("challenge review: an exact repeated target is rejected atomically", () => {
    const rel = "0-intent/proposal-1.md", body = "# Proposal\ntarget: 1-spec/spec.md#spec-requirement-1, 1-spec/spec.md#spec-requirement-1\norigin: issue 9\n";
    write(root, rel, body);
    assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), /INVALID target/);
    assert.equal(read(root, rel), body);
  });

  test("challenge review: reversed design and spec targets follow the dependency chain", () => {
    const spec = "1-spec/spec.md", design = "2-design-doc/design-doc.md", challenge = "0-intent/proposal-1.md";
    registered(spec, { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    const inputs = ["0-intent/intent.md", spec, "1-spec/spec-review-1.md"];
    registered(design, { pins: pairs(inputs) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    const targets = [design, spec];
    registered(challenge, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
    configure({ targetPhase: 2 });
    const state = () => JSON.parse(check(root, "--json"));
    assert.equal(state().frontier, `converge ${spec}`);
    registered(spec, { pins: pairs(["0-intent/intent.md", challenge]) });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, challenge]));
    const first = state();
    assert.equal(first.artifacts[0].approved, true);
    assert.equal(first.artifacts[1].state, "stale");
    assert.deepEqual(first.artifacts[1].stale, ["package members"]);
    assert.deepEqual(first.challenges.map((t) => t.state), ["pending", "resolved"]);
    assert.equal(first.frontier, `converge ${design}`);
    assert.deepEqual(first.artifacts[1].materials.challenges, [challenge]);
    const current = ["0-intent/intent.md", spec, "1-spec/spec-review-2.md", challenge];
    registered(design, { pins: pairs(current) });
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs([design, "2-design-doc/design-doc-research.md", ...current]));
    const final = state();
    assert.deepEqual(final.challenges.map((t) => t.state), ["resolved", "resolved"]);
    assert.equal(final.challenges.every((t) => t.challengeResolved), true);
    assert.equal(final.complete, true);
    assert.equal(final.frontier, "complete");
  });

  test("a challenge is pending, then adjudicated when its target pins it, then resolved when the target is approved carrying the pin", () => {
    stampSpec();
    approveSpec();
    proposal();
    assert.match(check(root), /challenge .*proposal-1\.md .*PENDING/);
    assert.match(check(root), /frontier converge 1-spec\/spec\.md/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/proposal-1.md"));
    assert.match(check(root), /adjudicated \(by 1-spec\/spec\.md, awaiting approval\)/);
    appendFileSync(join(root, P("1-spec/spec-research.md")), "\n## Adjudications\n\nAdopted.\n");
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/proposal-1.md"]);
    configure({ targetPhase: 1 });
    assert.match(check(root), /resolved \(1-spec\/spec\.md approved carrying it\)[\s\S]*frontier complete/);
  });

  test("a changed input withdraws challenge resolution until the target wave is current", () => {
    stampSpec();
    approveSpec();
    proposal();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/proposal-1.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/proposal-1.md"]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    configure({ targetPhase: 1 });
    const state = JSON.parse(check(root, "--json"));
    assert.match(state.challenges[0].state, /^adjudicated/);
    assert.equal(state.frontier, "converge 1-spec/spec.md");
  });

  test("a changed input makes a claim moot before upstream routing", () => {
    approveChain(2);
    review("2-design-doc/design-doc-review-2.md", "unsatisfiable", DESIGN, "target: 1-spec/spec.md#spec-requirement-1\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    configure({ targetPhase: 2 });
    const state = JSON.parse(check(root, "--json"));
    assert.match(state.claims[0].state, /^moot/);
    assert.equal(state.frontier, "converge 1-spec/spec.md");
  });

  test("a claim escalated one layer up resolves the challenge below it; intent targets are owner escalations", () => {
    stampSpec();
    proposal();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/proposal-1.md"));
    review("1-spec/spec-review-1.md", "unsatisfiable", [...SPEC, "0-intent/proposal-1.md"], "target: 0-intent/intent.md#intent-goal\norigin: 0-intent/proposal-1.md\n");
    const output = check(root);
    assert.match(output, /challenge .*resolved \(escalated by 1-spec\/spec-review-1\.md\)/);
    assert.match(output, /claim .*#intent-goal\s+PENDING — owner escalation/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#intent-goal \(owner escalation\)/);
  });

  test("a claim stands only when its wave closed without a rejection; consumers lacking its approval are moot", () => {
    stampSpec();
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"));
    const DESIGN_NO_APPROVAL = DESIGN.filter((f) => !f.includes("spec-review"));
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-goal\n");
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN_NO_APPROVAL, "target: 1-spec/spec.md#spec-requirement-1\n");
    let output = check(root);
    assert.match(output, /design-doc-review-1\.md → 1-spec\/spec\.md#spec-requirement-1\s+moot/);
    assert.match(output, /frontier claim 1-spec\/spec-review-1\.md → 0-intent\/intent\.md#intent-goal \(owner escalation\)/);
    assert.deepEqual(JSON.parse(check(root, "--json")).claims.map((c) => c.state), ["PENDING — owner escalation", "moot (claiming artifact changed)"]);
    // A second lane still to report keeps a claim open; a rejecting lane holds it.
    configure({ lanes: [standard.a11y] });
    output = check(root);
    assert.match(output, /spec-review-1\.md .*wave open/);
    review("1-spec/spec-review-a11y-1.md", "rejected", SPEC);
    assert.match(check(root), /spec-review-1\.md .*held \(a lane rejected/);
  });

  test("a claim about a changed artifact is moot; a changed target supersedes it", () => {
    stampSpec();
    review("1-spec/spec-review-1.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-goal\n");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAnswered.\n");
    assert.match(check(root), /superseded \(target changed\)/);
  });

  test("a changed target supersedes a stamped claim after its id is removed", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    review("2-design-doc/design-doc-review-1.md", "unsatisfiable", DESIGN, "target: 1-spec/spec.md#spec-requirement-1\n");
    registered("1-spec/spec.md", { ...Object.fromEntries(parseFrontmatter(read(root, "1-spec/spec.md")).data), "retired-ids": ["spec-requirement-1"] }, "# Spec\n\nThe target is gone.\n");
    assert.match(check(root), /design-doc-review-1\.md .*superseded \(target changed\)/);
  });

  test("stamp rejects challenge targets whose id is absent or outside their territory", () => {
    stampSpec();
    approveSpec();
    assert.throws(() => proposal("1-spec/spec.md#spec-requirement-9"), /INVALID TARGET 1-spec\/spec\.md#spec-requirement-9/);
    assert.throws(() => proposal("3-build/build-plan.md#build-task-9"), /INVALID TARGET 3-build\/build-plan\.md#build-task-9/);
    assert.throws(() => proposal("0-intent/intent.md#intent-goal"), /INVALID TARGET 0-intent\/intent\.md#intent-goal/);
    write(root, "0-intent/intent.md", "origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## Constraints\n\nintent-constraint-1: First.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-2.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-constraint-2\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-3.md", "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-constraint-0\n"), /INVALID TARGET/);
    assert.throws(() => review("1-spec/spec-review-4.md", "unsatisfiable", SPEC), /INVALID TARGET \?/);
  });

  for (const [kind, section] of [["constraint", "Constraints"]])
    for (const presence of ["declared", "absent", "backtick fence", "tilde fence"])
      test(`intent intent-${kind}-2 landing uses its explicit token: ${presence}`, () => {
        const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
        const target = `${intent}#intent-${kind}-2`;
        const item = `intent-${kind}-2: Owner item.\n`;
        const items = `intent-${kind}-1: First item.\n` + (presence === "declared" ? item
          : presence === "absent" ? ""
          : presence === "backtick fence" ? `\`\`\`markdown\n${item}\`\`\`\n`
          : `~~~markdown\n${item}~~~\n`);
        const ids = [`intent-${kind}-1`, ...(presence === "declared" ? [`intent-${kind}-2`] : [])];
        registered(intent, { origin: "issue 7", "ids": ids }, `origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## ${section}\n\n${items}`);
        registered("1-spec/spec.md", { pins: pairs([intent]) });
        registered(claim, { reviewed: pairs(SPEC) }, `# Review\n\nverdict: unsatisfiable\ntarget: ${target}\n`);
        if (presence === "declared") {
          rp(root, "stamp", P(claim), "--mirror");
          assert.deepEqual(parseFrontmatter(read(root, claim)).data.get("target"), [target]);
          configure({ targetPhase: 1 });
          const state = JSON.parse(check(root, "--json"));
          assert.equal(state.claims[0].target, target);
          assert.equal(state.claims[0].state, "PENDING — owner escalation");
        } else {
          assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#intent-constraint-2/);
        }
      });

  for (const [presence, body, valid] of [
    ["section", "## Goal\n\nOriginal.\n", true],
    ["fenced section", "```markdown\n## Goal\n```\n", false],
    ["word only", "The goal is an outcome.\n", false],
  ])
    test(`#intent-goal landing addresses its section: ${presence}`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      registered(intent, { origin: "issue 7" }, `origin: issue 7\n\n# Intent\n\n${body}`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, { reviewed: pairs(SPEC) }, "# Review\n\nverdict: unsatisfiable\ntarget: 0-intent/intent.md#intent-goal\n");
      if (valid) {
        rp(root, "stamp", P(claim), "--mirror");
        configure({ targetPhase: 1 });
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.claims[0].state, "PENDING — owner escalation");
      } else {
        assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#intent-goal/);
      }
    });

  for (const [kind, section] of [["context", "Context"], ["proposal", "Proposals"]])
    test(`intent ${kind} ids remain outside claim territory`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      registered(intent, { origin: "issue 7" }, `origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## ${section}\n\nintent-${kind}-1: Owner item.\n`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, { reviewed: pairs(SPEC) }, `# Review\n\nverdict: unsatisfiable\ntarget: ${intent}#intent-${kind}-1\n`);
      assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET 0-intent\/intent\.md#intent-(?:context|proposal)-1/);
    });

  for (const [kind, section] of [["constraint", "Constraints"]])
    test(`a landed claim follows the ${kind} lifecycle when its target item is removed`, () => {
      const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
      const target = `${intent}#intent-${kind}-1`;
      const body = "origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n";
      const fields = { origin: "issue 7", "ids": [`intent-${kind}-1`] };
      registered(intent, fields, `${body}\n## ${section}\n\nintent-${kind}-1: Owner item.\n`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registered(claim, {
        reviewed: pairs(SPEC), verdict: "unsatisfiable", target: [target], "target-identity": [identity(read(root, intent), intent)],
      }, `# Review\n\nverdict: unsatisfiable\ntarget: ${target}\n`);
      const landed = read(root, claim);
      configure({ targetPhase: 1 });
      assert.equal(JSON.parse(check(root, "--json")).claims[0].state, "PENDING — owner escalation");
      registered(intent, { ...fields, "retired-ids": [`intent-${kind}-1`] }, body);
      configure({ targetPhase: 1 });
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.claims[0].target, target);
      assert.equal(state.claims[0].state, "superseded (target changed)");
      assert.equal(read(root, claim), landed);
    });

  for (const [artifact, id] of [["1-spec/spec.md", "spec-requirement-1"], ["2-design-doc/design-doc.md", "design-doc-decision-1"]])
    test(`textual target ${id} must occur outside fences in ${artifact}`, () => {
      const proposal = "0-intent/proposal-1.md";
      write(root, artifact, `# Artifact\n\n\`\`\`markdown\n${id}\n\`\`\`\n`);
      write(root, proposal, `# Proposal\n\ntarget: ${artifact}#${id}\norigin: 0-intent/constraint-1.md\n`);
      assert.throws(() => rp(root, "stamp", P(proposal), "--mirror"), /INVALID TARGET/);
      appendFileSync(join(root, P(artifact)), `\n${id}: Target item.\n`);
      rp(root, "stamp", P(proposal), "--mirror");
      assert.deepEqual(parseFrontmatter(read(root, proposal)).data.get("target"), [`${artifact}#${id}`]);
    });
});
