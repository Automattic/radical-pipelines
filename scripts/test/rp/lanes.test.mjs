import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { identity, laneFingerprint, parseFrontmatter, renderFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { PIPELINE, git, P, write, read, rp, root, lane, standard, FPS, configure, check, SPEC, DESIGN, PLAN_BASE, review, registeredReview, pairs, registered, registeredVerdict, registeredRoot, commitAll, buildDone, proposal, useFixture } from "./fixture.mjs";

describe("rp production lanes", () => {
  useFixture();

  function approveSpecLaneA(reviewed = ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "0-intent/intent.md"]) {
    configure({ targetPhase: 1, lanes: [standard.a] });
    write(root, "1-spec/lanes/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/lanes/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/lanes/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/lanes/a/spec-review-1.md", "approved", reviewed);
  }

  const LANE_A_PACKAGE = ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "1-spec/lanes/a/spec-review-1.md"];

  function approvalMatrixCase(context, complete, concordant, allLanes) {
    configure({ targetPhase: 1, lanes: [standard.security, ...(context === "closed lane" ? [standard.a] : [])] });
    write(root, "0-intent/context.md", "# Context\n");
    const scope = context === "closed lane" ? "1-spec/lanes/a/" : "1-spec/";
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
    if (context === "closed lane") {
      const laneReviews = [implicit, ...(allLanes ? [named] : [])];
      registeredRoot(artifact, pairs(full), laneReviews, FPS.security);
      const state = JSON.parse(check(root, "--json"));
      return state.lanes[0].closed && state.artifacts[0].approved && state.complete;
    }
    const state = JSON.parse(check(root, "--json"));
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
          configure({ targetPhase: 1, lanes: [standard.security, ...(context === "closed lane" ? [standard.a] : [])] });
          const sc = context === "closed lane" ? "1-spec/lanes/a/" : "1-spec/";
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
          const state = JSON.parse(check(root, "--json"));
          const valid = change === "equal";
          assert.equal(state.complete, valid);
          if (context === "closed lane") assert.equal(state.lanes[0].closed, valid);
          else assert.equal(state.artifacts[0].approved, valid);
          assert.equal(state.frontier === "complete", valid);
          if (who !== "all lanes equal before reference change") assert.equal(state.frontier.startsWith("consolidate"), false);
        });

  test("a closed lane stays closed while a lane added after it converges and consolidates", () => {
    configure({ targetPhase: 1, lanes: [standard.a] });
    const a = ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "1-spec/lanes/a/spec-review-1.md"];
    write(root, a[0], "# A\n"); write(root, a[1], "# A record\n");
    registered(a[0], { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    const reference = pairs([...a.slice(0, 2), "0-intent/intent.md"]);
    registeredVerdict(a[2], reference); registeredRoot(a[0], reference, [a[2]]);
    const original = parseFrontmatter(read(root, "1-spec/spec.md")).data.get("lane-packages");
    appendFileSync(join(root, P("0-intent/intent.md")), "\nAdd b after a.\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a]), "lane-packages": original });
    registeredVerdict("1-spec/spec-review-2.md", pairs([...SPEC, ...a]));
    const reconfirmed = JSON.parse(check(root, "--json"));
    assert.equal(reconfirmed.artifacts[0].state, "fresh");
    assert.equal(reconfirmed.complete, true);
    const bLane = { ...standard.b, after: ["a"] };
    configure({ targetPhase: 1, lanes: [standard.a, bLane] });
    const state = () => JSON.parse(check(root, "--json"));
    assert.equal(state().lanes[0].closed, true);
    assert.equal(state().frontier, "converge 1-spec/lanes/b/spec.md");
    const b = ["1-spec/lanes/b/spec.md", "1-spec/lanes/b/spec-research.md", "1-spec/lanes/b/spec-review-1.md"];
    write(root, b[0], "# B\n"); write(root, b[1], "# B record\n");
    registered(b[0], { pins: pairs(["0-intent/intent.md", ...a]), lane: laneFingerprint(bLane) });
    const bReference = pairs([...b.slice(0, 2), "0-intent/intent.md", ...a]);
    registeredVerdict(b[2], bReference);
    assert.equal(state().frontier, "consolidate 1-spec/spec.md");
    assert.deepEqual(state().artifacts[0].laneCandidates.map((lane) => lane.package), [a, b]);
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...a, ...b]), "lane-packages": [...original, [b[0], pairs(b), bReference]] });
    registeredVerdict("1-spec/spec-review-3.md", pairs([...SPEC, ...a, ...b]));
    assert.equal(state().complete, true);
    assert.deepEqual(state().lanes.map((lane) => lane.closed), [true, true]);
  });

  test("review materials outside the artifact's package are rejected by check and stamp", () => {
    write(root, "0-intent/context.md", "# Context\n");
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    configure({ targetPhase: 1, lanes: [{ ...standard.security, materials: ["0-intent/context.md"] }] });
    assert.throws(() => check(root), /outside the .* package/);
    write(root, "1-spec/spec-review-security-1.md", "# Review\n\nverdict: approved\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-security-1.md"), "--mirror"), /outside the .* package/);
  });

  test("review materials expand only the production artifact into its lane scope", () => {
    const reviewer = { ...standard.security, materials: ["1-spec/spec.md", "0-intent/intent.md"] };
    configure({ targetPhase: 1, lanes: [reviewer, standard.a] });
    write(root, "1-spec/lanes/a/spec.md", "# Candidate\n");
    write(root, "1-spec/lanes/a/spec-research.md", "# Record\n");
    write(root, "1-spec/lanes/a/intent.md", "# Coincidental local file\n");
    rp(root, "stamp", P("1-spec/lanes/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/lanes/a/spec-review-1.md", "approved", ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/lanes/a/spec-review-security-1.md", "approved", ["1-spec/lanes/a/spec.md", "0-intent/intent.md"]);
    const state = JSON.parse(check(root, "--json"));
    const candidate = state.lanes.find((entry) => entry.lane === "1-spec/lanes/a/");
    assert.equal(candidate.approved, true);
    assert.equal(candidate.lanes.find((entry) => entry.lane === "security").fresh, true);
  });

  test("a closed lane validates materials against the root's preserved reference", () => {
    const context = "0-intent/context.md";
    const artifact = "1-spec/lanes/a/spec.md", record = "1-spec/lanes/a/spec-research.md";
    const implicit = "1-spec/lanes/a/spec-review-1.md", named = "1-spec/lanes/a/spec-review-security-1.md";
    const reviewer = { ...standard.security, materials: [context] };
    configure({ targetPhase: 1, lanes: [reviewer, standard.a] });
    write(root, context, "# Context\n");
    write(root, artifact, "# Candidate\n");
    write(root, record, "# Record\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md", context]), lane: FPS.a });
    const reference = pairs([artifact, record, "0-intent/intent.md", context]);
    registeredVerdict(implicit, reference);
    registeredVerdict(named, pairs([context]), "approved", laneFingerprint(reviewer));

    const binding = pairs([artifact, record, implicit, named]);
    const rootPins = pairs(["0-intent/intent.md", context, artifact, record, implicit, named]);
    registered("1-spec/spec.md", { pins: rootPins, "lane-packages": [[artifact, binding, reference]] });
    const judged = pairs(["1-spec/spec.md", "1-spec/spec-research.md", ...rootPins.map((pin) => pin.slice(0, pin.lastIndexOf("@")))]);
    registeredVerdict("1-spec/spec-review-1.md", judged);
    registeredVerdict("1-spec/spec-review-security-1.md", pairs([context]), "approved", laneFingerprint(reviewer));
    let state = JSON.parse(check(root, "--json"));
    assert.equal(state.lanes[0].closed, true);
    assert.equal(state.complete, true);

    registered(artifact, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    rp(root, "stamp", P(named), "--mirror");
    state = JSON.parse(check(root, "--json"));
    assert.equal(state.lanes[0].closed, true);
    assert.equal(state.complete, true);
  });

  test("an unstamped consumed review cannot approve a lane and can be stamped", () => {
    const artifact = "1-spec/lanes/a/spec.md", record = "1-spec/lanes/a/spec-research.md";
    const implicit = "1-spec/lanes/a/spec-review-1.md", named = "1-spec/lanes/a/spec-review-focus-1.md";
    const focus = lane("spec-reviewer", "focus", { materials: ["0-intent/intent.md"] });
    configure({ targetPhase: 1, lanes: [focus, standard.a] });
    write(root, artifact, "# Candidate\n");
    write(root, record, "# Record\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    const reference = pairs([artifact, record, "0-intent/intent.md"]);
    registeredVerdict(implicit, reference);
    write(root, named, "# Review\n\nverdict: approved\n");
    const binding = pairs([artifact, record, implicit, named]);
    registered("1-spec/spec.md", {
      pins: pairs(["0-intent/intent.md", artifact, record, implicit, named]),
      "lane-packages": [[artifact, binding, reference]],
    });

    let state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `stamp ${named}`);
    assert.deepEqual(state.artifacts, []);

    rp(root, "stamp", P(named), "--reviewed", P("0-intent/intent.md"), "--mirror");
    state = JSON.parse(check(root, "--json"));
    assert.equal(state.lanes[0].closed, true);
  });

  for (const scope of ["root", "production lane"])
    for (const update of ["later input wave", "new input review lane"])
      for (const verdict of ["approved", "unsatisfiable"])
        test(`a newer input wave stales a consumer until it pins the complete required package: ${scope}, ${update}, ${verdict}`, () => {
          registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
          registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/lanes/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          write(root, artifact, "# Design\ndesign-doc-decision-1: Decision.\n"); write(root, record, "# Record\n");
          const inputs = ["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
          const laneFields = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...laneFields });
          const judged = pairs([artifact, record, ...inputs]);
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, judged);
          else registered(review, {
            reviewed: judged, verdict, target: ["0-intent/intent.md#intent-goal"], "target-identity": [identity(read(root, "0-intent/intent.md"))],
          }, "# Review\nverdict: unsatisfiable\ntarget: 0-intent/intent.md#intent-goal\n");
          let configuredLanes = scope === "root" ? [] : [lane("design-doc-producer", "a")];
          configure({ targetPhase: 2, lanes: configuredLanes });
          const checkState = () => JSON.parse(check(root, "--json"));
          const consumer = (state) => scope === "root" ? state.artifacts[1] : state.lanes[0];
          const before = checkState();
          assert.equal(consumer(before).state, "fresh");
          assert.equal(consumer(before).approved, verdict === "approved");
          if (verdict === "unsatisfiable") assert.match(before.claims[0].state, /^PENDING/);

          // Bodies and identities of both artifacts stay unchanged; only approval paths change.
          const newReviews = ["1-spec/spec-review-2.md"];
          registeredVerdict(newReviews[0], pairs(SPEC));
          if (update === "new input review lane") {
            configuredLanes = [...configuredLanes, standard.security];
            configure({ targetPhase: 2, lanes: configuredLanes });
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
          assert.equal(changed.frontier, `converge ${artifact}`);
          assert.equal(changed.complete, false);
          assert.match(check(root), /STALE — package members/);
          if (verdict === "unsatisfiable") assert.match(changed.claims[0].state, /^moot/);

          // Reconfirmation includes every lane of the input's current wave.
          const currentInputs = ["0-intent/intent.md", "1-spec/spec.md", ...newReviews];
          registered(artifact, { pins: pairs(currentInputs), ...laneFields });
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
        test(`a consumer waits for a current input approval: ${scope}, ${inputState}, ${verdict}`, () => {
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
          const sc = scope === "root" ? "2-design-doc/" : "2-design-doc/lanes/a/";
          const artifact = `${sc}design-doc.md`, record = `${sc}design-doc-research.md`;
          const laneFields = scope === "root" ? {} : { lane: FPS.a };
          registered(artifact, { pins: pairs(inputs), ...laneFields }, "# Design\ndesign-doc-decision-1: Decision.\n");
          write(root, record, "# Record\n");
          const review = `${sc}design-doc-review-1.md`;
          if (verdict === "approved") registeredVerdict(review, pairs([artifact, record, ...inputs]));
          else registered(review, {
            reviewed: pairs([artifact, record, ...inputs]), verdict, target: [`${intent}#intent-goal`], "target-identity": [identity(read(root, intent))],
          }, `# Review\nverdict: unsatisfiable\ntarget: ${intent}#intent-goal\n`);
          let configuredLanes = scope === "root" ? [] : [lane("design-doc-producer", "a")];
          configure({ targetPhase: 2, lanes: configuredLanes });
          const state = () => JSON.parse(check(root, "--json"));
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
            configuredLanes = [...configuredLanes, standard.security];
            configure({ targetPhase: 2, lanes: configuredLanes });
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
          const action = ["rejected new lane", "stale approval"].includes(inputState) ? "converge" : "review wave";
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
          assert.equal(restored.frontier, `converge ${artifact}`);
          if (verdict === "unsatisfiable") assert.match(restored.claims[0].state, /^moot/);
          const repinned = [intent, spec, ...approvals];
          registered(artifact, { pins: pairs(repinned), ...laneFields });
          registeredVerdict(`${sc}design-doc-review-2.md`, pairs([artifact, record, ...repinned]));
          const confirmed = state();
          assert.equal(consumer(confirmed).state, "fresh");
          assert.equal(consumer(confirmed).approved, true);
          assert.equal(consumer(confirmed).episode, 0);
        });

  test("another consumer wave with the same pair set preserves currency", () => {
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
    registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
    configure({ targetPhase: 2 });
    const before = JSON.parse(check(root, "--json"));
    registeredVerdict("2-design-doc/design-doc-review-2.md", pairs(DESIGN).reverse());
    configure({ targetPhase: 2 });
    const after = JSON.parse(check(root, "--json"));
    assert.equal(after.frontier, before.frontier);
    assert.equal(after.complete, true);
    assert.equal(after.artifacts[1].state, "fresh");
    assert.equal(after.artifacts[1].approved, true);
    assert.equal(after.artifacts[1].episode, 0);
    assert.deepEqual(after.artifacts[1].stale, []);
    // Reordering an input approval's identical pairs changes no requirement either.
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC).reverse());
    configure({ targetPhase: 2 });
    assert.deepEqual(JSON.parse(check(root, "--json")), after);
  });

  for (const phase of ["build-plan", "document-plan"])
    test(`the ${phase} package includes every required approval lane and adjudicated challenge`, () => {
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      registered("2-design-doc/design-doc.md", { pins: pairs(["0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"]) });
      registeredVerdict("2-design-doc/design-doc-review-1.md", pairs(DESIGN));
      const buildPins = ["1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];
      registered("3-build/build-plan.md", { pins: pairs(buildPins) });
      registered("3-build/tasks/build-task-1.md", { "depends-on": [] }, "# Task\ndepends-on: none\n");
      const planPackage = [...PLAN_BASE, "3-build/tasks/build-task-1.md"];
      registeredVerdict("3-build/build-plan-review-1.md", pairs(planPackage));
      registered("3-build/tasks/build-task-1-report-1.md", { reviewed: pairs(["3-build/tasks/build-task-1.md"]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
      const buildPackage = [...planPackage, "3-build/tasks/build-task-1-report-1.md"];
      registeredVerdict("3-build/build-review-1.md", pairs(buildPackage));

      const artifact = phase === "build-plan" ? "3-build/build-plan.md" : "4-document/document-plan.md";
      const prefix = phase === "build-plan" ? "build" : "document";
      const record = phase === "build-plan" ? "3-build/build-plan-research.md" : "4-document/document-plan-research.md";
      const proposal = "0-intent/proposal-1.md";
      write(root, artifact, `# Plan\nAssumption ${prefix}-assumption-1.\n`);
      registered(proposal, { target: [`${artifact}#${prefix}-assumption-1`], origin: "issue 8" }, `# Proposal\ntarget: ${artifact}#${prefix}-assumption-1\norigin: issue 8\n`);
      const inputs = phase === "build-plan" ? [...buildPins, proposal] : [
        "1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md",
        "3-build/build-plan-review-1.md", "3-build/tasks/build-task-1.md", "3-build/tasks/build-task-1-report-1.md", "3-build/build-review-1.md", proposal,
      ];
      registered(artifact, { pins: pairs(inputs) }, `# Plan\n${prefix}-assumption-1: Assumption.\n`);
      write(root, record, "# Record\n");
      const judged = [artifact, record, ...inputs, ...(phase === "build-plan" ? ["3-build/tasks/build-task-1.md"] : [])];
      registeredVerdict(`${dirname(artifact)}/${phase}-review-1.md`, pairs(judged));
      const targetPhase = phase === "build-plan" ? 3 : 4;
      configure({ targetPhase });
      const before = JSON.parse(check(root, "--json"));
      assert.equal(before.artifacts.at(-1).approved, true);
      assert.equal(before.challenges[0].state, "resolved");
      const inputPrefix = phase === "build-plan" ? "design-doc" : "build";
      const inputPhase = phase === "build-plan" ? "2-design-doc" : "3-build";
      const inputPackage = phase === "build-plan" ? DESIGN : buildPackage;
      const securityLane = lane(phase === "build-plan" ? "design-doc-reviewer" : "build-reviewer", "security");
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-2.md`, pairs(inputPackage));
      registeredVerdict(`${inputPhase}/${inputPrefix}-review-security-2.md`, pairs(inputPackage), "approved", laneFingerprint(securityLane));
      configure({ targetPhase, lanes: [securityLane] });
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.artifacts.at(-1).state, "stale");
      assert.deepEqual(state.artifacts.at(-1).stale, ["package members"]);
      assert.equal(state.artifacts.at(-1).approved, false);
      assert.equal(state.artifacts.at(-1).episode, 1);
      assert.equal(state.challenges[0].state, "adjudicated");
      assert.equal(state.frontier, `converge ${artifact}`);
      assert.equal(state.complete, false);
    });

  test("root pins alone do not replace an independent consolidation reference", () => {
    configure({ targetPhase: 1, lanes: [standard.a] });
    const artifact = "1-spec/lanes/a/spec.md", record = "1-spec/lanes/a/spec-research.md";
    write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
    registered(artifact, { pins: pairs(["0-intent/intent.md"]), lane: FPS.a });
    registeredVerdict("1-spec/lanes/a/spec-review-1.md", pairs([artifact, record, "0-intent/intent.md"]));
    const binding = [artifact, record, "1-spec/lanes/a/spec-review-1.md"];
    registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", ...binding]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs([...SPEC, ...binding]));
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.complete, false);
    assert.equal(state.frontier, "consolidate 1-spec/spec.md");
  });

  test("a registered task report cannot omit its dependency from the reference", () => {
    buildDone();
    registered("3-build/tasks/build-task-2-report-1.md", { reviewed: pairs(["3-build/tasks/build-task-2.md"]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
    configure({ targetPhase: 3 });
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(state.tasks["3-build"].done, ["build-task-1"]);
    assert.equal(state.frontier, "task 3-build/build-task-2");
    assert.equal(state.complete, false);
  });

  for (const change of ["add member", "remove member", "change identity"])
    test(`a closed lane survives a candidate ${change}`, () => {
      configure({ targetPhase: 1, lanes: [standard.a] });
      const artifact = "1-spec/lanes/a/spec.md", record = "1-spec/lanes/a/spec-research.md";
      write(root, artifact, "# Candidate\n"); write(root, record, "# Record\n");
      write(root, "0-intent/context.md", "# Context v1\n");
      write(root, "0-intent/extra.md", "# Extra\n");
      let inputs = ["0-intent/intent.md", "0-intent/context.md"];
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      const reference = pairs([artifact, record, ...inputs]);
      registeredVerdict("1-spec/lanes/a/spec-review-1.md", reference);
      registeredRoot(artifact, reference, ["1-spec/lanes/a/spec-review-1.md"]);
      const before = read(root, "1-spec/spec.md");
      if (change === "add member") inputs.push("0-intent/extra.md");
      if (change === "remove member") inputs.pop();
      if (change === "change identity") write(root, "0-intent/context.md", "# Context v2\n");
      registered(artifact, { pins: pairs(inputs), lane: FPS.a });
      registeredVerdict("1-spec/lanes/a/spec-review-2.md", pairs([artifact, record, ...inputs]), "rejected");
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.lanes[0].closed, true);
      assert.equal(state.lanes[0].episode, 1);
      assert.equal(state.artifacts[0].state, "fresh");
      assert.equal(state.artifacts[0].approved, true);
      assert.equal(state.complete, true);
      assert.equal(read(root, "1-spec/spec.md"), before);
    });

  test("a root cannot complete from a lane review omitting consumed context", () => {
    configure({ targetPhase: 1, lanes: [standard.a] });
    write(root, "0-intent/context.md", "# Context\n");
    write(root, "1-spec/lanes/a/spec.md", "# Candidate a\n");
    write(root, "1-spec/lanes/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/lanes/a/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/context.md"));
    write(root, "1-spec/lanes/a/spec-review-1.md", "# Review\n\nverdict: approved\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/lanes/a/spec-review-1.md"), "--reviewed", P("1-spec/lanes/a/spec.md"), "--reviewed", P("1-spec/lanes/a/spec-research.md"), "--reviewed", P("0-intent/intent.md"), "--mirror"), /INVALID REVIEW PACKAGE/);
    const lanePackage = ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "1-spec/lanes/a/spec-review-1.md"];
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...lanePackage.flatMap((path) => ["--pin", P(path)]));
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...lanePackage]);
    const state = JSON.parse(check(root, "--json"));
    assert.notEqual(state.complete, true);
    assert.equal(state.frontier, "stamp 1-spec/lanes/a/spec-review-1.md");
  });

  test("declared production lanes are sub-pipelines; `after` waits; the root must pin every lane", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    rmSync(join(root, P("1-spec/spec-research.md")));
    configure({ targetPhase: 1, lanes: [standard.event, standard.contrarian] });
    let output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/event-driven\/spec\.md\s+MISSING/);
    assert.match(output, /lane\s+1-spec\/lanes\/contrarian\/spec\.md\s+MISSING\s+waiting for event-driven/);
    assert.match(output, /frontier converge 1-spec\/lanes\/event-driven\/spec\.md/);
    for (const id of ["event-driven"]) {
      write(root, `1-spec/lanes/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/lanes/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/lanes/${id}/spec.md`), "--pin", P("0-intent/intent.md"));
      review(`1-spec/lanes/${id}/spec-review-1.md`, "approved", [`1-spec/lanes/${id}/spec.md`, `1-spec/lanes/${id}/spec-research.md`, "0-intent/intent.md"]);
    }
    output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/event-driven\/spec\.md\s+FRESH\s+reviews: ·:approved\s+APPROVED/);
    assert.match(output, /frontier converge 1-spec\/lanes\/contrarian\/spec\.md/);
    write(root, "1-spec/lanes/contrarian/spec.md", "# Spec contrarian\n");
    write(root, "1-spec/lanes/contrarian/spec-research.md", "# Record contrarian\n");
    rp(root, "stamp", P("1-spec/lanes/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/lanes/event-driven/spec.md"));
    output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/contrarian\/spec\.md\s+STALE — package members/);
    assert.match(output, /frontier converge 1-spec\/lanes\/contrarian\/spec\.md/);
    rp(root, "stamp", P("1-spec/lanes/contrarian/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/lanes/event-driven/spec.md"), "--pin", P("1-spec/lanes/event-driven/spec-research.md"), "--pin", P("1-spec/lanes/event-driven/spec-review-1.md"));
    review("1-spec/lanes/contrarian/spec-review-1.md", "approved", ["1-spec/lanes/contrarian/spec.md", "1-spec/lanes/contrarian/spec-research.md", "0-intent/intent.md", "1-spec/lanes/event-driven/spec.md", "1-spec/lanes/event-driven/spec-research.md", "1-spec/lanes/event-driven/spec-review-1.md"]);
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+MISSING — every lane approved: consolidate/);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    write(root, "1-spec/spec-research.md", "# Consolidated record\n");
    // A lane closes only when the root records its complete package.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/lanes/event-driven/spec.md"));
    output = check(root);
    assert.doesNotMatch(output, /closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    // One complete lane closes independently while an incomplete one stays open.
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/lanes/event-driven/spec.md"), "--pin", P("1-spec/lanes/event-driven/spec-research.md"), "--pin", P("1-spec/lanes/event-driven/spec-review-1.md"), "--pin", P("1-spec/lanes/contrarian/spec.md"), "--pin", P("1-spec/lanes/contrarian/spec-review-1.md"));
    output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/event-driven\/spec\.md\s+closed/);
    assert.doesNotMatch(output, /lane\s+1-spec\/lanes\/contrarian\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+STALE — package members/);
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/lanes/event-driven/spec.md"), "--pin", P("1-spec/lanes/event-driven/spec-research.md"), "--pin", P("1-spec/lanes/event-driven/spec-review-1.md"), "--pin", P("1-spec/lanes/contrarian/spec.md"), "--pin", P("1-spec/lanes/contrarian/spec-research.md"), "--pin", P("1-spec/lanes/contrarian/spec-review-1.md"));
    output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:none/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/event-driven\/spec\.md\s+closed/);
    assert.match(output, /frontier converge 1-spec\/spec\.md/);
    assert.doesNotMatch(output, /frontier converge 1-spec\/(?:event-driven|contrarian)\/spec\.md/);
  });

  test("production-lane closure preserves the concordant approved package consumed by the root", () => {
    configure({ targetPhase: 1, lanes: [standard.security, standard.a] });
    write(root, "1-spec/lanes/a/spec.md", "# Spec a v1\n");
    write(root, "1-spec/lanes/a/spec-research.md", "# Record a\n");
    rp(root, "stamp", P("1-spec/lanes/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/lanes/a/spec-review-1.md", "approved", ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "0-intent/intent.md"]);
    write(root, "1-spec/lanes/a/spec.md", "# Spec a v2\n");
    rp(root, "stamp", P("1-spec/lanes/a/spec.md"), "--pin", P("0-intent/intent.md"));
    review("1-spec/lanes/a/spec-review-security-1.md", "approved", ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "0-intent/intent.md"]);
    write(root, "1-spec/spec.md", "# Consolidated spec\n");
    const lanePackage = ["0-intent/intent.md", "1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md"];
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/lanes/a/spec-review-1.md", "1-spec/lanes/a/spec-review-security-1.md"].flatMap((path) => ["--pin", P(path)]));
    assert.doesNotMatch(check(root), /lane\s+1-spec\/lanes\/a\/spec\.md\s+closed/);

    review("1-spec/lanes/a/spec-review-2.md", "approved", lanePackage);
    review("1-spec/lanes/a/spec-review-security-2.md", "approved", lanePackage);
    rp(root, "stamp", P("1-spec/spec.md"), ...[...lanePackage, "1-spec/lanes/a/spec-review-2.md", "1-spec/lanes/a/spec-review-security-2.md"].flatMap((path) => ["--pin", P(path)]));
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged upstream.\n");
    assert.match(check(root), /lane\s+1-spec\/lanes\/a\/spec\.md\s+closed/);
  });

  test("an incomplete approval package cannot close a production lane", () => {
    assert.throws(() => approveSpecLaneA(["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md"]), /INVALID REVIEW PACKAGE/);
  });

  test("a root reconfirmation preserves its closed lane package", () => {
    approveSpecLaneA();
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    const lanePackages = parseFrontmatter(read(root, "1-spec/spec.md")).data.get("lane-packages");
    assert.equal(Array.isArray(lanePackages[0]), true);
    assert.equal(typeof lanePackages[0][0], "string");
    assert.equal(Array.isArray(lanePackages[0][1]), true);
    assert.equal(Array.isArray(lanePackages[0][2]), true);
    review("1-spec/spec-review-1.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    appendFileSync(join(root, P("0-intent/intent.md")), "\n## Proposals\n\nintent-proposal-1: New input.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), ...LANE_A_PACKAGE.flatMap((path) => ["--pin", P(path)]));
    assert.deepEqual(parseFrontmatter(read(root, "1-spec/spec.md")).data.get("lane-packages"), lanePackages);
    review("1-spec/spec-review-2.md", "approved", [...SPEC, ...LANE_A_PACKAGE]);
    const output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/a\/spec\.md\s+closed/);
    assert.match(output, /artifact 1-spec\/spec\.md\s+FRESH[\s\S]*frontier complete/);
  });

  test("an after lane waits for each dependency's recursively complete package", () => {
    configure({ targetPhase: 1, lanes: [
      lane("spec-producer", "z"),
      lane("spec-producer", "b", { after: ["z"] }),
      lane("spec-producer", "c", { after: ["b"] }),
    ] });
    for (const id of ["z", "b"]) {
      write(root, `1-spec/lanes/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/lanes/${id}/spec-research.md`, `# Record ${id}\n`);
      const dependencyPins = id === "b" ? ["1-spec/lanes/z/spec.md", "1-spec/lanes/z/spec-research.md"] : [];
      rp(root, "stamp", P(`1-spec/lanes/${id}/spec.md`), "--pin", P("0-intent/intent.md"), ...dependencyPins.flatMap((path) => ["--pin", P(path)]));
    }
    review("1-spec/lanes/b/spec-review-1.md", "approved", ["1-spec/lanes/b/spec.md", "1-spec/lanes/b/spec-research.md", "0-intent/intent.md", "1-spec/lanes/z/spec.md", "1-spec/lanes/z/spec-research.md"]);
    const output = check(root);
    assert.match(output, /lane\s+1-spec\/lanes\/c\/spec\.md\s+MISSING\s+waiting for b/);
    assert.match(output, /frontier review wave 1-spec\/lanes\/z\/spec\.md/);
    assert.doesNotMatch(output, /frontier converge 1-spec\/lanes\/c\/spec\.md/);
  });

  test("a claim raised inside a production lane reaches the frontier, and lanes have counters", () => {
    rmSync(join(root, P("1-spec/spec.md")));
    configure({ targetPhase: 1, lanes: [standard.a, standard.b] });
    for (const id of ["a", "b"]) {
      write(root, `1-spec/lanes/${id}/spec.md`, `# Spec ${id}\n`);
      write(root, `1-spec/lanes/${id}/spec-research.md`, `# Record ${id}\n`);
      rp(root, "stamp", P(`1-spec/lanes/${id}/spec.md`), "--pin", P("0-intent/intent.md"));
    }
    review("1-spec/lanes/a/spec-review-1.md", "unsatisfiable", ["1-spec/lanes/a/spec.md", "1-spec/lanes/a/spec-research.md", "0-intent/intent.md"], "target: 0-intent/intent.md#intent-goal\n");
    review("1-spec/lanes/b/spec-review-1.md", "rejected", ["1-spec/lanes/b/spec.md", "1-spec/lanes/b/spec-research.md", "0-intent/intent.md"]);
    review("1-spec/lanes/b/spec-review-2.md", "approved", ["1-spec/lanes/b/spec.md", "1-spec/lanes/b/spec-research.md", "0-intent/intent.md"]);
    const output = check(root);
    assert.match(output, /claim\s+1-spec\/lanes\/a\/spec-review-1\.md → 0-intent\/intent\.md#intent-goal\s+PENDING — owner escalation/);
    assert.match(output, /counter\s+1-spec\/lanes\/a\/spec: 1 wave this episode/);
    assert.doesNotMatch(output, /counter\s+1-spec\/lanes\/b\/spec/);
  });

  // A pipeline recorded with each production lane at `<phase>/<lane>/` migrates by relocating the lane
  // folders, rewriting every lane path rp reads — frontmatter, run-config.md's included, and fixed
  // lines — and re-stamping each file whose body changed. It then matches the pipeline recorded at the
  // new paths, except where a rewritten lane declaration reopens what it reviewed.
  const LANE_PHASES = { "spec-producer": "1-spec", "design-doc-producer": "2-design-doc" };
  function migrateLanes(lanes) {
    const production = lanes.filter((l) => LANE_PHASES[l.profile]);
    for (const phase of new Set(production.map((l) => LANE_PHASES[l.profile]))) {
      const present = production.filter((l) => LANE_PHASES[l.profile] === phase && existsSync(join(root, P(`${phase}/${l.id}`))));
      if (!present.length) continue;
      mkdirSync(join(root, P(`${phase}/.lanes`)));
      for (const l of present) git(root, "mv", P(`${phase}/${l.id}`), P(`${phase}/.lanes/${l.id}`));
      git(root, "mv", P(`${phase}/.lanes`), P(`${phase}/lanes`));
    }
    const relocate = (path) => {
      const l = production.find((candidate) => path.startsWith(`${LANE_PHASES[candidate.profile]}/${candidate.id}/`));
      return l ? path.replace(`${LANE_PHASES[l.profile]}/`, `${LANE_PHASES[l.profile]}/lanes/`) : path;
    };
    const deep = (value) => typeof value === "string" ? relocate(value) : Array.isArray(value) ? value.map(deep) :
      value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deep(item)])) : value;
    for (const file of git(root, "ls-files", PIPELINE).split("\n").filter((path) => path.endsWith(".md"))) {
      const { data, body } = parseFrontmatter(readFileSync(join(root, file), "utf8"), null);
      const rewritten = body.replace(/^([a-z][a-z0-9-]*):([^\S\n]*)(\S+)/gm, (_, key, space, value) => `${key}:${space}${relocate(value)}`);
      writeFileSync(join(root, file), data ? renderFrontmatter(new Map([...data].map(([key, value]) => [key, deep(value)])), rewritten) : rewritten);
      if (rewritten !== body) rp(root, "stamp", file, "--mirror");
    }
    commitAll("move production lanes under lanes/");
  }
  const oldLane = (phase, id) => `${phase}/${id}/`;
  const newLane = (phase, id) => `${phase}/lanes/${id}/`;
  function recordedArtifact(scope, prefix, inputs, decl = null, extra = {}) {
    const path = `${scope}${prefix}.md`, record = `${scope}${prefix}-research.md`;
    write(root, record, "# Record\n");
    registered(path, { pins: pairs(inputs), ...(decl ? { lane: laneFingerprint(decl) } : {}), ...extra }, `# ${prefix}\n`);
    return [path, record, ...inputs];
  }
  function recordedReview(scope, prefix, pkg, { wave = 1, verdict = "approved", fields = {}, body = "", named = null } = {}) {
    const path = `${scope}${prefix}-review-${named ? `${named.id}-` : ""}${wave}.md`;
    registered(path, { reviewed: pairs(pkg), verdict, ...(named ? { lane: laneFingerprint(named) } : {}), ...fields }, `# Review\nverdict: ${verdict}\n${body}`);
    return path;
  }
  // Consolidated Spec lanes: each lane approved, the root pinning every lane package, approved.
  function recordedConsolidation(at, lanes, filter = null) {
    const packages = [];
    for (const l of lanes) {
      const scope = at("1-spec", l.id);
      const pkg = recordedArtifact(scope, "spec", ["0-intent/intent.md", ...(l.after ?? []).flatMap((id) => packages.find((p) => p.id === id).binding)], l);
      const reviews = [recordedReview(scope, "spec", pkg), ...(filter ? [recordedReview(scope, "spec", filter.materials, { named: filter })] : [])];
      packages.push({ id: l.id, binding: [pkg[0], pkg[1], ...reviews], reference: pairs(pkg) });
    }
    const pkg = recordedArtifact("1-spec/", "spec", ["0-intent/intent.md", ...packages.flatMap((p) => p.binding)], null,
      { "lane-packages": packages.map((p) => [p.binding[0], pairs(p.binding), p.reference]) });
    recordedReview("1-spec/", "spec", pkg);
    if (filter) recordedReview("1-spec/", "spec", filter.materials, { named: filter });
  }
  const migrationScenarios = {
    "consolidated dependent lanes": (at) => {
      const lanes = [standard.a, lane("spec-producer", "b", { after: ["a"] })];
      configure({ targetPhase: 1, lanes });
      recordedConsolidation(at, lanes);
      return lanes;
    },
    "a lane named lanes": (at) => {
      const lanes = [lane("spec-producer", "lanes")];
      configure({ targetPhase: 1, lanes });
      recordedConsolidation(at, lanes);
      return lanes;
    },
    "a prior finding citing a lane review": (at) => {
      configure({ targetPhase: 1, lanes: [standard.a] });
      const scope = at("1-spec", "a");
      const pkg = recordedArtifact(scope, "spec", ["0-intent/intent.md"], standard.a);
      const first = recordedReview(scope, "spec", pkg, { verdict: "rejected", body: "spec-finding-1: Gap.\n" });
      const prior = `${first}#spec-finding-1`;
      recordedReview(scope, "spec", pkg, { wave: 2, verdict: "rejected", fields: { "prior-finding": [prior] }, body: `prior-finding: ${prior}, resolution failed\n` });
      return [standard.a];
    },
    "a root review escalating a lane claim": (at) => {
      const designLane = lane("design-doc-producer", "a");
      configure({ targetPhase: 2, lanes: [designLane] });
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md"]) });
      const approval = "1-spec/spec-review-1.md";
      registeredVerdict(approval, pairs(SPEC));
      const scope = at("2-design-doc", "a");
      const pkg = recordedArtifact(scope, "design-doc", ["0-intent/intent.md", "1-spec/spec.md", approval], designLane);
      const targetFields = (target) => ({ target: [target], "target-identity": [identity(read(root, target.split("#")[0]))] });
      const claim = recordedReview(scope, "design-doc", pkg, { verdict: "unsatisfiable", fields: targetFields("1-spec/spec.md#spec-requirement-1"), body: "target: 1-spec/spec.md#spec-requirement-1\n" });
      registered("1-spec/spec.md", { pins: pairs(["0-intent/intent.md", claim]) });
      recordedReview("1-spec/", "spec", [...SPEC, claim], { wave: 2, verdict: "unsatisfiable", fields: { ...targetFields("0-intent/intent.md#intent-goal"), origin: claim },
        body: `target: 0-intent/intent.md#intent-goal\norigin: ${claim}\n` });
      return [designLane];
    },
  };
  const comparable = (state) => ({ ...state, base: undefined });
  // The fixture repository returns to its starting commit, untracked files removed.
  const restart = (start) => {
    git(root, "reset", "--quiet", "--hard", start);
    git(root, "clean", "--quiet", "-fd");
  };
  for (const [label, scenario] of Object.entries(migrationScenarios))
    test(`lane migration: ${label} matches the pipeline recorded at the new paths`, () => {
      const start = git(root, "rev-parse", "HEAD").trim();
      scenario(newLane);
      commitAll("recorded at the new paths");
      const native = comparable(JSON.parse(check(root, "--json")));
      restart(start);
      const lanes = scenario(oldLane);
      commitAll("recorded at the old paths");
      migrateLanes(lanes);
      assert.deepEqual(comparable(JSON.parse(check(root, "--json"))), native);
    });

  test("lane migration: a rewritten review-lane materials path is a new lane declaration that reopens its waves", () => {
    const start = git(root, "rev-parse", "HEAD").trim();
    const at = (old) => old ? oldLane : newLane;
    const focus = (old) => lane("spec-reviewer", "focus", { materials: [`${at(old)("1-spec", "a")}spec.md`] });
    configure({ targetPhase: 1, lanes: [standard.a, focus(false)] });
    recordedConsolidation(newLane, [standard.a], focus(false));
    commitAll("recorded at the new paths");
    assert.equal(JSON.parse(check(root, "--json")).frontier, "complete");
    restart(start);
    configure({ targetPhase: 1, lanes: [standard.a, focus(true)] });
    recordedConsolidation(oldLane, [standard.a], focus(true));
    commitAll("recorded at the old paths");
    migrateLanes([standard.a, focus(true)]);
    const state = JSON.parse(check(root, "--json"));
    assert.deepEqual(parseFrontmatter(read(root, "run-config.md"), null).data.get("lanes")[1].materials, ["1-spec/lanes/a/spec.md"]);
    assert.equal(state.lanes[0].closed, false);
    assert.equal(state.frontier, "review wave 1-spec/lanes/a/spec.md");
  });
});
