import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { P, write, read, rp, root, lane, standard, configure, check, SPEC, review, pairs, registered, stampSpec, approveSpec, useFixture } from "./fixture.mjs";

describe("rp reviews, waves, inputs", () => {
  useFixture();

  test("a review names its artifact, its record, and the artifact's inputs; a changed input stales the approval", () => {
    stampSpec();
    assert.throws(() => review("1-spec/spec-review-1.md", "approved", ["1-spec/spec.md", "1-spec/spec-research.md"]), /INVALID REVIEW PACKAGE/);
    approveSpec();
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier complete/);
    appendFileSync(join(root, P("0-intent/intent.md")), "\nNew constraint.\n");
    stampSpec(); // a re-synthesis that needed no edit refreshes the pins
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH\s+reviews: ·:approved \(stale\)/);
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier review wave 1-spec\/spec\.md/);
  });

  test("a changed input makes an approval non-current before artifact reconfirmation", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("0-intent/intent.md")), "\nChanged.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    configure({ targetPhase: 1 });
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.artifacts[0].state, "stale");
    assert.equal(state.artifacts[0].lanes[0].fresh, false);
    assert.equal(state.artifacts[0].lanes[0].waveApproved, false);
    assert.equal(state.artifacts[0].approved, false);
    assert.equal(state.frontier, "converge 1-spec/spec.md");
  });

  test("waves are per artifact and shared by lanes; the implicit lane needs no id", () => {
    configure({ targetPhase: 1, lanes: [standard.security] });
    stampSpec();
    review("1-spec/spec-review-1.md", "approved", SPEC);
    review("1-spec/spec-review-security-1.md", "rejected", SPEC);
    assert.match(check(root), /reviews: ·:approved security:rejected/);
    assert.match(check(root), /frontier converge 1-spec\/spec\.md/);
    review("1-spec/spec-review-security-2.md", "approved", SPEC);
    // wave 2 is open until the implicit lane reports it
    assert.match(check(root), /frontier review wave 1-spec\/spec\.md/);
    review("1-spec/spec-review-2.md", "approved", SPEC);
    assert.match(check(root), /APPROVED[\s\S]*frontier complete/);
  });

  test("the episode counts waves since every lane approved together; it is a counter, never a gate", () => {
    configure({ targetPhase: 1, lanes: [standard.security] });
    stampSpec();
    for (let w = 1; w <= 3; w++) {
      review(`1-spec/spec-review-${w}.md`, w % 2 ? "approved" : "rejected", SPEC);
      review(`1-spec/spec-review-security-${w}.md`, w % 2 ? "rejected" : "approved", SPEC);
    }
    const out = check(root);
    assert.match(out, /counter\s+spec: 3 waves this episode/);
    assert.match(out, /frontier converge 1-spec\/spec\.md/);
    assert.doesNotMatch(out, /AUDIT|VALVE/);
  });

  test("an episode counts only approvals current on the live reference", () => {
    stampSpec();
    approveSpec();
    appendFileSync(join(root, P("1-spec/spec.md")), "\nspec-requirement-2: Requirement.\n");
    stampSpec();
    review("1-spec/spec-review-2.md", "rejected", SPEC);
    configure({ targetPhase: 1 });
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.counters.spec.episode, 2);
    assert.equal(state.frontier, "converge 1-spec/spec.md");
  });

  test("an unstamped review is the frontier, never a new wave", () => {
    stampSpec();
    write(root, "1-spec/spec-review-1.md", "# Review\n\nverdict: approved\n");
    assert.match(check(root), /frontier stamp 1-spec\/spec-review-1\.md/);
  });

  test("a review counts only in its artifact's phase and lane scope", () => {
    configure({ targetPhase: 1, lanes: [lane("design-doc-producer", "a")] });
    stampSpec();
    review("2-design-doc/spec-review-1.md", "approved", SPEC);
    const output = check(root);
    assert.doesNotMatch(output, /artifact 1-spec\/spec\.md[\s\S]*APPROVED/);
    assert.doesNotMatch(output, /claim\s+2-design-doc\/lanes\/a\/spec-review-1\.md/);
    assert.match(output, /frontier review wave 1-spec\/spec\.md/);
    const misplaced = "2-design-doc/lanes/a/spec-review-1.md";
    assert.throws(() => review(misplaced, "unsatisfiable", SPEC, "target: 0-intent/intent.md#intent-goal\n"), /only challenges may carry target fields/);
    registered(misplaced, { verdict: "unsatisfiable", reviewed: pairs(SPEC), target: ["0-intent/intent.md#intent-goal"], "target-identity": [identity(read(root, "0-intent/intent.md"), "0-intent/intent.md")] }, "# Review\nverdict: unsatisfiable\ntarget: 0-intent/intent.md#intent-goal\n");
    const invalid = JSON.parse(check(root, "--json"));
    assert.equal(invalid.frontier, `INVALID FRONTMATTER ${misplaced}`);
    assert.deepEqual(invalid.claims, []);
  });
});
