import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NOTES, P, PIPELINE, REVIEW, TO_SPEC, abs, apply, commitAll, commitIn, conventions, lane, laneWorktree, pipeline, rp, run, thread, useRepo, withFrontmatter, write, writeFile } from "./fixture.mjs";

// What `rp validate` prints for `role` on the pipeline folder in `worktree`, with `options`, as its lines.
const validate = (role, options = [], worktree = abs("")) => rp("validate", `${worktree}/${PIPELINE}`, "--role", role, ...options).trimEnd().split("\n");
// The INVALID lines `rp check` prints for the pipeline, without their `frontier ` prefix.
const checkRejects = () => rp("check", abs(PIPELINE)).split("\n").filter((line) => line.startsWith("frontier INVALID ")).map((line) => line.slice("frontier ".length));

describe("rp validate", () => {
  useRepo();

  it("prints the line rp check prints for each of the role's rejected files, committed or not, and none for another role's file or another pipeline folder's", () => {
    pipeline(3);
    const review = thread({ n: 2, ...REVIEW(), status: "pending" });
    write(`threads/3-implementer-spec-producer-spec.md`, withFrontmatter({ status: "open", opener: "implementer", owner: "spec-producer", artifact: "spec" }, "\n## implementer — abc1234\n\n## Summary\n"));
    const another = thread({ n: 4, ...TO_SPEC, status: "pending" });
    writeFile(".pipelines/other/threads/1-implementer-spec-producer-spec.md", "status: open\nopener: implementer\n");
    commitAll("rejected files");
    write(NOTES, withFrontmatter({ status: "done", owner: "me" }, "\n# Notes\n"));
    const lines = validate("implementer");
    assert.deepEqual(lines, [
      `INVALID ${NOTES}: unexpected frontmatter key: owner`,
      `INVALID ${review}: status must be one of open | approved | withdrawn | answered | disagreement`,
      "INVALID threads/3-implementer-spec-producer-spec.md: message heading must be ## <role> — <commit>: ## Summary",
    ]);
    assert.deepEqual(checkRejects().filter((line) => !line.includes(another)), lines);
    assert.deepEqual(validate("design-doc-producer"), [checkRejects().find((line) => line.includes(another))]);
  });

  it("says the role's files are accepted when none is rejected, and with --file reports that file alone", () => {
    pipeline(3);
    const rejected = thread({ n: 1, ...REVIEW(), status: "pending" });
    commitAll("a rejected review thread");
    assert.deepEqual(validate("implementer", ["--file", abs(P(NOTES))]), [`accepted: ${NOTES}`]);
    assert.deepEqual(validate("reviewer-default", ["--file", abs(P(rejected))]), [`INVALID ${rejected}: status must be one of open | approved | withdrawn | answered | disagreement`]);
    assert.deepEqual(validate("spec-producer"), ["accepted: every file of spec-producer"]);
    const out = run("validate", abs(PIPELINE), "--role", "implementer", "--file", abs(P("threads/9-implementer-spec-producer-spec.md")));
    assert.deepEqual([out.status, out.stderr], [1, "rp: cannot read .pipelines/demo/threads/9-implementer-spec-producer-spec.md: missing\n"]);
  });

  it("applies neither check that reads run-config.md: a thread awaiting an undeclared review lane, and an undeclared lane's candidate", () => {
    pipeline(0);
    write("1-spec/lanes/zz/spec.md", "# Candidate\n");
    thread({ n: 1, ...REVIEW("gone"), messages: [["reviewer-gone", "abc1234"], ["implementer", "abc1234"]] });
    commitAll("files only the run configuration rejects");
    assert.deepEqual(checkRejects(), ["INVALID 1-spec/lanes/zz/spec.md: production lane is not configured: spec-producer zz",
      "INVALID threads/1-reviewer-gone-implementer-implementation.md: lane not configured; close the thread withdrawn"]);
    assert.deepEqual(validate("spec-producer-zz"), ["accepted: every file of spec-producer-zz"]);
    assert.deepEqual(validate("reviewer-gone"), ["accepted: every file of reviewer-gone"]);
  });

  it("reports a production lane's candidate in the lane's worktree", () => {
    conventions();
    pipeline(0, { lanes: [lane("spec-producer", "a")] });
    apply();
    const wt = laneWorktree("demo-spec-a");
    commitIn(wt, { "1-spec/lanes/a/spec.md": withFrontmatter({ status: "draft" }, "\n# Candidate\n") }, "a candidate");
    assert.deepEqual(validate("spec-producer-a", [], wt), ["INVALID 1-spec/lanes/a/spec.md: carries no frontmatter"]);
    commitIn(wt, { "1-spec/lanes/a/spec.md": "# Candidate\n" }, "the candidate repaired");
    assert.deepEqual(validate("spec-producer-a", [], wt), ["accepted: every file of spec-producer-a"]);
  });
});
