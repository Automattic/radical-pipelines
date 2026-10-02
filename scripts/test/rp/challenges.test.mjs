import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, laneFingerprint, parseFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { RP, PIPELINE, git, P, write, read, rp, root, lane, standard, FPS, configure, check, SPEC, DESIGN, PLAN_BASE, review, checkWithoutBase, pairs, registered, registeredVerdict, registeredRoot, stampSpec, report, proposal, frontierChain, useFixture } from "./fixture.mjs";

describe("rp challenges and claims", () => {
  useFixture();

  function checkWithClassification(excluded) {
    // Change only the classifier in an isolated executable; exercise the real checker.
    const script = join(root, ".git", "classified-rp.mjs");
    const source = readFileSync(RP, "utf8");
    writeFileSync(script, excluded ? source.replace("function challengeKind(rel, data) {", `function challengeKind(rel, data) { if (rel === ${JSON.stringify(excluded)}) return null;`) : source);
    return JSON.parse(execFileSync(process.execPath, [script, "check", PIPELINE, "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  }

  for (const enabled of [true, false])
    for (const fresh of [true, false])
      test(`challenge classifier: report enabled=${enabled}, fresh=${fresh} governs collection and convergence`, () => {
        registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
        registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
        registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
        registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
        const inputs = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
        registered("3-build/build-plan.md", { pins: pairs(inputs) });
        const task = "3-build/tasks/build-task-1.md", report = "3-build/tasks/build-task-1-report-1.md";
        registered(task, { "depends-on": [] }, "# Task\ndepends-on: none\n");
        registered(report, { outcome: "failed", attempt: "1", reviewed: pairs([task]), ...(enabled ? { target: ["3-build/build-plan.md#build-task-1"], "target-identity": [identity(read(root, "3-build/build-plan.md"))] } : {}) }, "# Report\noutcome: failed\n");
        registeredVerdict("3-build/build-plan-review-1.md", pairs([...PLAN_BASE, task]));
        if (!fresh) registered(task, { "depends-on": [] }, "# Changed task\ndepends-on: none\n");
        configure({ targetPhase: 3 });
        const state = checkWithClassification(enabled ? null : report);
        assert.deepEqual(state.contradictions, []);
        assert.equal(state.challenges.length, enabled && fresh ? 1 : 0);
        assert.equal(state.tasks["3-build"].next, "build-task-1");
        assert.deepEqual(state.artifacts[2].materials.taskReports, enabled && fresh ? [report] : []);
        if (fresh) assert.equal(state.frontier, enabled ? "converge 3-build/build-plan.md" : "task 3-build/build-task-1");
      });

  for (const enabled of [true, false])
    for (const fresh of [true, false])
      for (const escalation of [true, false])
        test(`challenge classifier: claim enabled=${enabled}, fresh=${fresh}, origin=${escalation} governs claims and resolution`, () => {
          const challenge = "0-intent/proposal-1.md", review = "1-spec/spec-review-1.md";
          const inputs = ["0-intent/intent.md", ...(escalation ? [challenge] : [])];
          if (escalation) registered(challenge, { target: ["1-spec/spec.md#spec-requirement-1"], origin: "issue 9" }, "# Proposal\ntarget: 1-spec/spec.md#spec-requirement-1\norigin: issue 9\n");
          registered("1-spec/spec.md", { pins: pairs(inputs) });
          registered(review, { verdict: "unsatisfiable", reviewed: pairs(["1-spec/spec.md", "1-spec/spec-research.md", ...inputs]), ...(enabled ? { target: ["0-intent/intent.md#intent-goal"], "target-identity": [identity(read(root, "0-intent/intent.md"))] } : {}), ...(escalation ? { origin: challenge } : {}) }, `# Review\nverdict: unsatisfiable\n${enabled ? "target: 0-intent/intent.md#intent-goal\n" : ""}${escalation ? `origin: ${challenge}\n` : ""}`);
          if (!fresh) write(root, "1-spec/spec-research.md", "# Changed record\n");
          configure({ targetPhase: 1 });
          const state = checkWithClassification(enabled ? null : review);
          assert.deepEqual(state.contradictions, []);
          assert.equal(state.claims.length, enabled ? 1 : 0);
          if (enabled) assert.match(state.claims[0].state, fresh ? /^PENDING/ : /^moot/);
          if (escalation) assert.equal(state.challenges[0].state, enabled && fresh ? "resolved" : "adjudicated");
          if (!enabled) assert.doesNotMatch(state.frontier, /^claim /);
        });


  function ownerInput(kind, n, targets, origin = "issue 9") {
    const path = `0-intent/${kind}-${n}.md`;
    const origins = [].concat(origin);
    registered(path, { target: targets, origin }, `# ${kind} ${n}\n\ntarget: ${targets.join(", ")}\n${origins.map((source) => `origin: ${source}\n`).join("")}\nThe incoming work.\n`);
    return path;
  }

  for (const kind of ["constraint", "proposal"])
    for (const phase of [0, 1, 2, 3])
      test(`owner input lifecycle: ${kind} targeting phase ${phase + 1} preserves earlier approvals`, () => {
        const chain = frontierChain();
        const target = chain.artifacts[phase];
        const before = chain.artifacts.slice(0, phase).map((path) => read(root, path));
        const input = ownerInput(kind, 1, [target]);
        const state = () => JSON.parse(check(root, "--json"));
        assert.equal(state().frontier, `converge ${target}`);
        assert.equal(state().challenges[0].state, "pending");
        // Consumption by a different artifact is not adjudication by the target.
        if (phase > 0) {
          registered(chain.artifacts[0], { pins: pairs([...chain.inputs[0], input]) });
          assert.equal(state().challenges[0].state, "pending");
          write(root, chain.artifacts[0], before[0]);
        }
        const pins = [...chain.inputs[phase], input];
        registered(target, { pins: pairs(pins) });
        assert.equal(state().challenges[0].state, "adjudicated");
        const wave = chain.reviews[phase].replace("review-1", "review-2");
        registeredVerdict(wave, pairs([...chain.packages[phase], input]));
        assert.equal(state().challenges[0].state, "resolved");
        assert.equal(state().challenges[0].challengeResolved, true);
        assert.deepEqual(chain.artifacts.slice(0, phase).map((path) => read(root, path)), before);
        assert.ok(state().artifacts.slice(0, phase).every((a) => a.approved));
        // A changed ruling/request requires a new target review, even with the same target.
        appendFileSync(join(root, P(input)), "\nChanged incoming work.\n");
        assert.equal(state().challenges[0].state, "adjudicated");
        assert.equal(state().frontier, `converge ${target}`);
      });

  for (const kind of ["constraint", "proposal"])
    test(`owner input landing: ${kind} may target an artifact before it exists`, () => {
      const target = "4-document/document-plan.md", path = `0-intent/${kind}-1.md`;
      write(root, path, `# Input\ntarget: ${target}\norigin: issue 9\n`);
      rp(root, "stamp", P(path), "--mirror");
      assert.equal(existsSync(join(root, P(target))), false);
      assert.deepEqual(parseFrontmatter(read(root, path)).data.get("target"), [target]);
      assert.equal(parseFrontmatter(read(root, path)).data.has("target-identity"), false);
      configure({ targetPhase: 2 });
      const snapshot = JSON.parse(check(root, "--json"));
      assert.equal(snapshot.challenges[0].state, "pending");
      assert.equal(snapshot.challenges[0].inScope, false);
      const landed = read(root, path);
      rp(root, "stamp", P(path), "--mirror");
      assert.equal(read(root, path), landed);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "record incoming work");
      assert.deepEqual(JSON.parse(check(root, "--ref", "HEAD", "--json")).challenges, snapshot.challenges);
    });

  for (const kind of ["constraint", "proposal"])
    for (const defect of ["source absent", "target absent", "wrong territory", "target identities"])
      test(`owner input validation: ${kind}, ${defect}`, () => {
        const target = defect === "wrong territory" ? "0-intent/intent.md#intent-goal" : "1-spec/spec.md";
        const path = `0-intent/${kind}-1.md`;
        const fields = {
          ...(defect === "target absent" ? {} : { target: [target] }),
          ...(defect === "source absent" ? {} : { origin: "issue 9" }),
          ...(defect === "target identities" ? { "target-identity": ["123456abcdef"] } : {}),
        };
        const body = `# Input\n${fields.target ? `target: ${target}\n` : ""}${fields.origin ? "origin: issue 9\n" : ""}`;
        registered(path, fields, body);
        const snapshot = checkWithoutBase();
        assert.equal(snapshot.frontier, `INVALID FRONTMATTER ${path}`);
        assert.deepEqual(snapshot.challenges, []);
        assert.deepEqual(snapshot.claims, []);
        assert.throws(() => rp(root, "stamp", P(path)), /INVALID (TARGET|FRONTMATTER)/);
      });

  for (const territory of ["intent", "constraint"])
    for (const answer of ["none", "proposal", "unrelated constraint", "constraint", "unstamped constraint"])
      test(`owner claim answer: ${territory}, ${answer}`, () => {
        const chain = frontierChain();
        const plan = chain.artifacts[2], claim = "3-build/build-plan-review-2.md";
        const source = territory === "intent" ? "0-intent/intent.md" : ownerInput("constraint", 1, [plan]);
        const target = territory === "intent" ? `${source}#intent-goal` : source;
        const materials = [...chain.packages[2], ...(territory === "constraint" ? [source] : [])];
        registered(plan, { pins: pairs([...chain.inputs[2], ...(territory === "constraint" ? [source] : [])]) });
        registered(claim, { reviewed: pairs(materials), verdict: "unsatisfiable", target: [target], "target-identity": [identity(read(root, source))] }, `# Review\nverdict: unsatisfiable\ntarget: ${target}\n`);
        const original = read(root, "0-intent/intent.md");
        if (answer !== "none") {
          const input = ownerInput(answer === "proposal" ? "proposal" : "constraint", 2, [plan], answer === "unrelated constraint" ? "issue 9" : ["issue 9", claim]);
          if (answer === "unstamped constraint") write(root, input, parseFrontmatter(read(root, input)).body);
        }
        const snapshot = JSON.parse(check(root, "--json"));
        if (answer === "unstamped constraint") {
          assert.equal(snapshot.frontier, "stamp 0-intent/constraint-2.md");
          assert.deepEqual(snapshot.claims, []);
        } else if (answer === "constraint") {
          assert.equal(snapshot.claims[0].state, "resolved (answered by 0-intent/constraint-2.md)");
          assert.equal(snapshot.frontier, `converge ${plan}`);
          assert.ok(snapshot.artifacts.slice(0, 2).every((a) => a.approved));
          assert.equal(snapshot.challenges.find((c) => c.path === "0-intent/constraint-2.md").state, "pending");
        } else {
          assert.equal(snapshot.claims[0].state, "PENDING — owner escalation");
          assert.equal(snapshot.frontier, `claim ${claim} → ${target} (owner escalation)`);
        }
        assert.equal(read(root, "0-intent/intent.md"), original);
      });

  for (const phase of [0, 1, 2, 3])
    for (const placement of ["whole artifact", "clause", "multiple targets", "other artifact"])
      test(`owner answer targets: phase ${phase + 1}, ${placement}`, () => {
        const chain = frontierChain();
        const artifact = chain.artifacts[phase], otherPhase = (phase + 1) % 4;
        const other = chain.artifacts[otherPhase], intent = "0-intent/intent.md";
        const claim = chain.reviews[phase].replace("review-1", "review-2");
        const ownerTarget = `${intent}#intent-goal`;
        registered(claim, {
          reviewed: pairs(chain.packages[phase]), verdict: "unsatisfiable",
          target: [ownerTarget], "target-identity": [identity(read(root, intent))],
        }, `# Review\nverdict: unsatisfiable\ntarget: ${ownerTarget}\n`);
        const clause = `${artifact}#${["spec-requirement-1", "design-doc-decision-1", "build-assumption-1", "document-assumption-1"][phase]}`;
        const targets = {
          "whole artifact": [artifact], clause: [clause],
          "multiple targets": [other, clause], "other artifact": [other],
        }[placement];
        const answer = ownerInput("constraint", 1, targets, claim);
        configure({ targetPhase: phase + 1 });
        const state = JSON.parse(check(root, "--json"));
        if (placement === "other artifact") {
          assert.equal(state.claims[0].state, "PENDING — owner escalation");
          assert.equal(state.frontier, `claim ${claim} → ${ownerTarget} (owner escalation)`);
          assert.deepEqual(state.artifacts[phase].materials.challenges, []);
          assert.equal(state.challenges[0].inScope, otherPhase < phase);
        } else {
          assert.equal(state.claims[0].state, `resolved (answered by ${answer})`);
          const first = placement === "multiple targets" ? Math.min(phase, otherPhase) : phase;
          assert.equal(state.frontier, `converge ${chain.artifacts[first]}`);
          assert.deepEqual(state.artifacts[phase].materials.challenges, [answer]);
        }
        git(root, "add", "-A");
        git(root, "commit", "--quiet", "-m", "record owner answer targets");
        const atRef = JSON.parse(check(root, "--ref", "HEAD", "--json"));
        assert.deepEqual(atRef.claims, state.claims);
        assert.equal(atRef.frontier, state.frontier);
      });

  test("answering one owner's claim leaves the other lane's claim pending", () => {
    const chain = frontierChain(), plan = chain.artifacts[2];
    const first = ownerInput("constraint", 1, [plan]), second = ownerInput("constraint", 2, [plan]);
    const audit = lane("build-plan-reviewer", "audit");
    configure({ lanes: [audit] });
    registered(plan, { pins: pairs([...chain.inputs[2], first, second]) });
    const materials = [...chain.packages[2], first, second];
    const claims = ["3-build/build-plan-review-2.md", "3-build/build-plan-review-audit-2.md"];
    for (const [i, path] of claims.entries()) {
      const target = [first, second][i];
      registered(path, { reviewed: pairs(materials), verdict: "unsatisfiable", target: [target], "target-identity": [identity(read(root, target))], ...(i ? { lane: laneFingerprint(audit) } : {}) }, `# Review\nverdict: unsatisfiable\ntarget: ${target}\n`);
    }
    ownerInput("constraint", 3, [plan], claims[0]);
    const snapshot = JSON.parse(check(root, "--json"));
    assert.deepEqual(snapshot.claims.map((c) => c.state), ["resolved (answered by 0-intent/constraint-3.md)", "PENDING — owner escalation"]);
    assert.equal(snapshot.frontier, `claim ${claims[1]} → ${second} (owner escalation)`);
  });

  for (const kind of ["constraint", "proposal"])
    test(`claim landing distinguishes owner territory from an open ${kind} file`, () => {
      stampSpec();
      const target = ownerInput(kind, 1, ["1-spec/spec.md"]);
      const claim = "1-spec/spec-review-1.md";
      write(root, claim, `# Review\nverdict: unsatisfiable\ntarget: ${target}\n`);
      if (kind === "constraint") {
        rp(root, "stamp", P(claim), "--mirror");
        assert.deepEqual(parseFrontmatter(read(root, claim)).data.get("target"), [target]);
      } else assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID TARGET/);
    });

  for (const kind of ["constraint", "proposal"])
    test(`root ${kind} reaches every open production lane once before consolidation`, () => {
      configure({ targetPhase: 1, lanes: [standard.a, standard.b] });
      const rootArtifact = "1-spec/spec.md", intent = "0-intent/intent.md";
      const sourceClaim = "1-spec/lanes/a/spec-review-1.md";
      for (const id of ["a", "b"]) {
        const artifact = `1-spec/lanes/${id}/spec.md`, record = `1-spec/lanes/${id}/spec-research.md`;
        registered(artifact, { pins: pairs([intent]), lane: FPS[id] }, "# Spec\nspec-requirement-1: Outcome.\n");
        write(root, record, "# Research\n");
        const verdict = id === "a" && kind === "constraint" ? "unsatisfiable" : "approved";
        registered(`1-spec/lanes/${id}/spec-review-1.md`, { verdict, reviewed: pairs([artifact, record, intent]), ...(verdict === "unsatisfiable" ? { target: [`${intent}#intent-goal`], "target-identity": [identity(read(root, intent))] } : {}) }, `# Review\nverdict: ${verdict}\n${verdict === "unsatisfiable" ? `target: ${intent}#intent-goal\n` : ""}`);
      }
      const input = ownerInput(kind, 1, [rootArtifact], kind === "constraint" ? sourceClaim : "issue 9");
      for (const id of ["a", "b"]) {
        const state = JSON.parse(check(root, "--json"));
        const artifact = `1-spec/lanes/${id}/spec.md`, record = `1-spec/lanes/${id}/spec-research.md`;
        assert.equal(state.frontier, `converge ${artifact}`);
        assert.deepEqual(state.lanes.find((lane) => lane.artifact === artifact).materials.challenges, [input]);
        registered(artifact, { pins: pairs([intent, input]), lane: FPS[id] });
        registeredVerdict(`1-spec/lanes/${id}/spec-review-2.md`, pairs([artifact, record, intent, input]));
      }
      assert.equal(JSON.parse(check(root, "--json")).frontier, `consolidate ${rootArtifact}`);
    });

  test("phase order combines an earlier proposal's input changes with a design constraint", () => {
    const chain = frontierChain(), spec = chain.artifacts[0], design = chain.artifacts[1];
    const request = ownerInput("proposal", 1, [spec]);
    const ruling = ownerInput("constraint", 1, [design]);
    assert.equal(JSON.parse(check(root, "--json")).frontier, `converge ${spec}`);
    registered(spec, { pins: pairs([...chain.inputs[0], request]) });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...chain.packages[0], request]));
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `converge ${design}`);
    assert.deepEqual(state.artifacts[1].materials.challenges, [ruling]);
    assert.ok(state.artifacts[1].materials.inputChanges.added.includes("1-spec/spec-review-2.md"));
  });

  for (const kind of ["constraint", "proposal", "claim"])
    for (const targetIndex of [0, 1, 2, 3])
      for (const currency of ["current", "stale input", "missing input approval"])
        test(`phase-ordered convergence: ${kind}, phase ${targetIndex + 1}, ${currency}`, () => {
          const paths = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "4-document/document-plan.md"];
          const chain = frontierChain(targetIndex > 0 ? paths[targetIndex - 1] : null);
          const artifact = chain.artifacts[targetIndex];
          let lanes = [];
          if (targetIndex === 0) {
            const lane = "1-spec/lanes/a/spec.md", record = "1-spec/lanes/a/spec-research.md", review = "1-spec/lanes/a/spec-review-1.md";
            registered(lane, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a }, "# Candidate\nspec-requirement-1: Clause.\n");
            write(root, record, "# Record\n");
            registeredVerdict(review, pairs([lane, record, "0-intent/intent.md"]));
            registeredRoot(lane, pairs([lane, record, "0-intent/intent.md"]), [review]);
            lanes = [standard.a];
          }
          const sourceIndex = Math.min(targetIndex + 1, 3);
          const challenge = kind !== "claim" ? `0-intent/${kind}-1.md`
            : targetIndex === 3 ? "4-document/document-review-1.md" : chain.reviews[sourceIndex];
          const target = kind !== "claim" ? artifact : `${artifact}#${["spec-requirement-1", "design-doc-decision-1", "build-assumption-1", "document-assumption-1"][targetIndex]}`;
          registered(challenge, {
            target: [target],
            ...(kind !== "claim" ? { origin: "issue 9" } : { "target-identity": [identity(read(root, artifact))], verdict: "unsatisfiable", reviewed: pairs(targetIndex === 3 ? chain.phasePackages[sourceIndex] : chain.packages[sourceIndex]) }),
          }, `# Challenge\n${kind !== "claim" ? "origin: issue 9" : "verdict: unsatisfiable"}\ntarget: ${target}\n`);
          if (currency === "stale input") appendFileSync(join(root, P(targetIndex === 0 ? "0-intent/intent.md" : chain.context)), "\nChanged evidence.\n");
          if (currency === "missing input approval") rmSync(join(root, P(targetIndex === 0 ? "1-spec/lanes/a/spec-review-1.md" : targetIndex === 3 ? "3-build/build-review-1.md" : chain.reviews[targetIndex - 1])));
          configure({ lanes });
          const state = JSON.parse(check(root, "--json"));
          assert.deepEqual(state.contradictions, []);
          const expected = currency === "current" ? `converge ${artifact}`
            : currency === "stale input" ? `converge ${chain.artifacts[Math.max(0, targetIndex - 1)]}`
            : targetIndex === 0 && kind !== "claim" ? "converge 1-spec/lanes/a/spec.md"
            : ["review wave 1-spec/lanes/a/spec.md", "review wave 1-spec/spec.md", "review wave 2-design-doc/design-doc.md", "build review"][targetIndex];
          assert.equal(state.frontier, expected);
          const reported = kind !== "claim" ? state.challenges[0] : state.claims[0];
          assert.equal(reported.target, target);
          if (kind !== "claim" || currency === "current") {
            assert.match(reported.state, /^(pending|PENDING)$/);
            assert.deepEqual(state.artifacts.find((a) => a.artifact === artifact).materials.challenges, [challenge]);
          } else assert.match(reported.state, /^moot/);
        });

  for (const targetIndex of [2, 3])
    for (const currency of ["current", "stale input", "missing input approval"])
      test(`phase-ordered convergence: failed report, phase ${targetIndex + 1}, ${currency}`, () => {
        const chain = frontierChain(targetIndex === 2 ? "2-design-doc/design-doc.md" : "3-build/build-plan.md");
        const artifact = chain.artifacts[targetIndex], task = chain.tasks[targetIndex - 2], report = chain.reports[targetIndex - 2];
        registered(report, { reviewed: pairs([task]), outcome: "failed", attempt: "1", target: [`${artifact}#${targetIndex === 2 ? "build" : "document"}-task-1`], "target-identity": [identity(read(root, artifact))] }, "# Report\noutcome: failed\n");
        if (currency === "stale input") appendFileSync(join(root, P(chain.context)), "\nChanged evidence.\n");
        if (currency === "missing input approval") rmSync(join(root, P(targetIndex === 2 ? chain.reviews[1] : "3-build/build-review-1.md")));
        const state = JSON.parse(check(root, "--json"));
        assert.deepEqual(state.contradictions, []);
        assert.equal(state.challenges[0].state, "pending");
        const expected = currency === "current" ? `converge ${artifact}`
          : currency === "stale input" ? `converge ${chain.artifacts[targetIndex - 1]}`
          : targetIndex === 2 ? "review wave 2-design-doc/design-doc.md" : "build review";
        assert.equal(state.frontier, expected);
        assert.deepEqual(state.artifacts.find((a) => a.artifact === artifact).materials.taskReports, [report]);
      });

  test("a pending non-owner claim follows the earlier phase's review wave", () => {
    const chain = frontierChain();
    const claim = "1-spec/spec-review-2.md", target = `${chain.artifacts[1]}#design-doc-decision-1`;
    registered(claim, { verdict: "unsatisfiable", reviewed: pairs(chain.packages[0]), target: [target], "target-identity": [identity(read(root, chain.artifacts[1]))] }, `# Review\nverdict: unsatisfiable\ntarget: ${target}\n`);
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.claims[0].state, "PENDING");
    assert.equal(state.frontier, "review wave 1-spec/spec.md");
    assert.deepEqual(state.artifacts[1].materials.challenges, [claim]);
    assert.match(check(root).split("\n").find((line) => line.startsWith("artifact 2-design-doc/design-doc.md ")), /Challenges: 1-spec\/spec-review-2\.md/);
  });

  for (const verdict of ["absent", "rejected"])
    test(`a pending proposal makes its target converge without target approval: ${verdict}`, () => {
      const chain = frontierChain();
      const challenge = "0-intent/proposal-1.md", target = chain.artifacts[1];
      registered(challenge, { target: [target], origin: "issue 9" }, `# Proposal\ntarget: ${target}\norigin: issue 9\n`);
      if (verdict === "absent") rmSync(join(root, P(chain.reviews[1])));
      else registeredVerdict(chain.reviews[1], pairs(chain.packages[1]), verdict);
      assert.equal(JSON.parse(check(root, "--json")).frontier, `converge ${target}`);
    });

  test("proposal along spec, design and plan is carried by each target's convergence", () => {
    const chain = frontierChain();
    const [spec, design, plan] = chain.artifacts;
    const proposal = "0-intent/proposal-1.md";
    const targets = [spec, design, plan];
    registered(proposal, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
    configure({ targetPhase: 3 });
    const state = () => JSON.parse(check(root, "--json"));
    const pendingOn = (path) => {
      const snapshot = state();
      assert.equal(snapshot.frontier, `converge ${path}`);
      assert.deepEqual(snapshot.artifacts.find((a) => a.artifact === path).materials.challenges, [proposal]);
      configure({ targetPhase: 3 });
      const line = check(root).split("\n").find((line) => line.startsWith(`artifact ${path} `));
      assert.match(line, /Challenges: 0-intent\/proposal-1\.md/);
    };
    assert.equal(state().frontier, `converge ${spec}`);
    registered(spec, { pins: pairs(["0-intent/intent.md", proposal]) }, "# Spec\nspec-requirement-1: Revised.\n");
    assert.equal(state().frontier, `review wave ${spec}`);
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, proposal]));
    pendingOn(design);
    const designInputs = ["0-intent/intent.md", spec, "1-spec/spec-review-2.md", proposal];
    registered(design, { pins: pairs(designInputs) }, "# Design\ndesign-doc-decision-1: Revised.\n");
    assert.equal(state().frontier, `review wave ${design}`);
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs([design, chain.records[1], ...designInputs]));
    pendingOn(plan);
    const planInputs = [spec, design, "1-spec/spec-review-2.md", "2-design-doc/design-doc-review-2.md", proposal];
    registered(plan, { pins: pairs(planInputs) }, "# Plan\nbuild-assumption-1: Revised.\n");
    assert.equal(state().frontier, `review wave ${plan}`);
    const planPackage = [plan, chain.records[2], ...planInputs, chain.tasks[0]];
    registeredVerdict("3-build/build-plan-review-2.md", pairs(planPackage));
    assert.equal(state().frontier, "build review");
    registeredVerdict("3-build/build-review-2.md", pairs([...planPackage, chain.reports[0]]));
    const complete = state();
    assert.equal(complete.frontier, "complete");
    assert.equal(complete.complete, true);
    assert.deepEqual(complete.challenges.map((c) => [c.state, c.challengeResolved]), targets.map(() => ["resolved", true]));
  });

  for (const reason of ["missing", "stale", "challenged", "rejected"])
    test(`one production frontier for an artifact that is ${reason}`, () => {
      const chain = frontierChain();
      const spec = chain.artifacts[0], proposal = "0-intent/proposal-1.md";
      if (reason === "missing") rmSync(join(root, P(spec)));
      if (reason === "stale") appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged context.\n");
      if (reason === "challenged") registered(proposal, { target: [spec], origin: "issue 9" }, `# Proposal\ntarget: ${spec}\norigin: issue 9\n`);
      if (reason === "rejected") registeredVerdict("1-spec/spec-review-2.md", pairs(chain.packages[0]), "rejected");
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.frontier, `converge ${spec}`);
      assert.equal(state.completeThrough, 0);
      const materials = state.artifacts[0].materials;
      assert.deepEqual(materials.challenges, reason === "challenged" ? [proposal] : []);
      assert.deepEqual(materials.taskReports, []);
      assert.deepEqual(materials.reviewLanes, reason === "rejected" ? [{ lane: "", path: "1-spec/spec-review-2.md" }] : []);
      assert.deepEqual(materials.inputChanges, reason === "stale" ? { added: [], removed: [], changed: ["0-intent/intent.md"], ready: true } : null);
    });

  test("one plan convergence carries input changes, challenges and failed reports together", () => {
    const chain = frontierChain("3-build/build-plan.md");
    const plan = chain.artifacts[2], report = chain.reports[0], proposal = "0-intent/proposal-1.md";
    const targets = [plan, `${plan}#build-assumption-1`];
    registered(proposal, { target: targets, origin: "issue 9" }, `# Proposal\ntarget: ${targets.join(", ")}\norigin: issue 9\n`);
    registered(report, { outcome: "failed", attempt: "1", reviewed: pairs([chain.tasks[0]]), target: [`${plan}#build-task-1`], "target-identity": [identity(read(root, plan))] }, "# Report\noutcome: failed\n");
    appendFileSync(join(root, P(chain.context)), "\nChanged input.\n");
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `converge ${plan}`);
    assert.deepEqual(state.artifacts[2].materials, {
      inputChanges: { added: [], removed: [], changed: [chain.context], ready: true },
      reviewLanes: [], challenges: [proposal], taskReports: [report],
    });
    const lines = check(root).split("\n");
    assert.deepEqual(lines.filter((line) => line.startsWith("frontier ")), [`frontier converge ${plan}`]);
    const line = lines.find((line) => line.startsWith(`artifact ${plan} `));
    assert.match(line, /Input changes: changed \[0-intent\/context\.md\]/);
    assert.match(line, /Challenges: 0-intent\/proposal-1\.md/);
    assert.match(line, /Task reports: 3-build\/tasks\/build-task-1-report-1\.md/);
  });

  for (const targetIndex of [2, 3])
    for (const phaseReview of [false, true])
      test(`convergence carries the complete rejected ${phaseReview ? "phase" : "plan"} wave in phase ${targetIndex + 1}`, () => {
        const chain = frontierChain(), plan = chain.artifacts[targetIndex];
        const prefix = phaseReview ? `${targetIndex === 2 ? "3-build/build" : "4-document/document"}` : plan.replace(/\.md$/, "");
        const profile = phaseReview ? (targetIndex === 2 ? "build-reviewer" : "document-reviewer") : (targetIndex === 2 ? "build-plan-reviewer" : "document-plan-reviewer");
        const focus = lane(profile, "focus");
        const implicit = `${prefix}-review-2.md`, named = `${prefix}-review-focus-2.md`;
        const judged = pairs((phaseReview ? chain.phasePackages : chain.packages)[targetIndex]);
        registeredVerdict(implicit, judged);
        registeredVerdict(named, judged, "rejected", laneFingerprint(focus));
        configure({ lanes: [focus] });
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.frontier, `converge ${plan}`);
        assert.deepEqual(state.artifacts[targetIndex].materials, {
          inputChanges: null,
          reviewLanes: [{ lane: "", path: implicit }, { lane: "focus", path: named }],
          challenges: [], taskReports: [],
        });
        const line = check(root).split("\n").find((line) => line.startsWith(`artifact ${plan} `));
        assert.ok(line.includes(`Review lanes: · — ${implicit}, focus — ${named}`));
      });

  test("convergence carries a rejected wave together with input changes when both apply", () => {
    const chain = frontierChain();
    const spec = chain.artifacts[0];
    registeredVerdict("1-spec/spec-review-2.md", pairs(chain.packages[0]), "rejected");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged context.\n");
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `converge ${spec}`);
    assert.deepEqual(state.artifacts[0].materials, {
      inputChanges: { added: [], removed: [], changed: ["0-intent/intent.md"], ready: true },
      reviewLanes: [{ lane: "", path: "1-spec/spec-review-2.md" }],
      challenges: [], taskReports: [],
    });
    const line = check(root).split("\n").find((l) => l.startsWith(`artifact ${spec} `));
    assert.match(line, /Input changes: changed \[0-intent\/intent\.md\]/);
    assert.match(line, /Review lanes: · — 1-spec\/spec-review-2\.md/);
  });
});
