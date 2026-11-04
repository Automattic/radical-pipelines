import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

import { NOTES, P, abs, check, commitAll, configure, frontier, git, pipeline, root, rp, run, thread, useRepo, writeFile } from "./fixture.mjs";

// The net change computed with bare git, as the README states it.
function expected(base = "main", exclude = ".pipelines") {
  const diff = execFileSync("git", ["diff", "--binary", `${base}...HEAD`, "--", ".", `:(exclude)${exclude}`], { cwd: root });
  if (!diff.length) return "0".repeat(40);
  return execFileSync("git", ["patch-id", "--stable"], { cwd: root, input: diff, encoding: "utf8" }).split(" ")[0];
}
function approve() {
  thread("1-reviewer-implementer-notes.md", { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
  rp("stamp", abs(P("threads/1-reviewer-implementer-notes.md")), "--reviewed");
  commitAll("approve");
}

describe("net change", () => {
  useRepo();

  it("is the all-zero id when the branch changes nothing outside the pipelines folder root", () => {
    pipeline(3);
    assert.equal(check().netChange, "0".repeat(40));
  });

  it("is the stable patch id of the diff from the merge-base, outside the pipelines folder root", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    writeFile("docs/new.md", "# New\n");
    writeFile(".pipelines/other/notes.md", "other pipeline\n");
    commitAll("change");
    assert.equal(check().netChange, expected());
    assert.notEqual(check().netChange, "0".repeat(40));
  });

  it("is unchanged by commits inside the pipelines folder root", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    const before = check().netChange;
    writeFile(".pipelines/demo/threads/notes.txt", "x\n");
    writeFile(".pipelines/other/x.md", "x\n");
    commitAll("pipeline only");
    assert.equal(check().netChange, before);
  });

  it("is unchanged by a merge from the base, so an approval stays current", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    approve();
    assert.deepEqual(frontier(), ["complete"]);
    const before = check().netChange;
    git(root, "checkout", "--quiet", "main");
    writeFile("src/other.js", "export const b = 1;\n");
    writeFile("src/app2.js", "export const c = 1;\n");
    commitAll("base moves");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--quiet", "--no-edit", "main");
    assert.equal(check().netChange, before);
    assert.equal(check().netChange, expected());
    assert.deepEqual(frontier(), ["complete"]);
  });

  it("changes with a conflict resolution, so the approval goes stale", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    approve();
    const before = check().netChange;
    git(root, "checkout", "--quiet", "main");
    writeFile("src/app.js", "export const a = 5;\n");
    commitAll("base conflicts");
    git(root, "checkout", "--quiet", "demo");
    assert.throws(() => git(root, "merge", "--quiet", "--no-edit", "main"));
    writeFile("src/app.js", "export const a = 7;\n");
    commitAll("resolve");
    assert.notEqual(check().netChange, before);
    assert.equal(check().netChange, expected());
    assert.deepEqual(frontier(), ["review review"]);
  });

  it("changes when the branch changes code", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    const before = check().netChange;
    writeFile("src/app.js", "export const a = 3;\n");
    commitAll("again");
    assert.notEqual(check().netChange, before);
  });

  it("uses the base run-config.md names", () => {
    pipeline(3);
    git(root, "branch", "release", "main");
    git(root, "checkout", "--quiet", "release");
    writeFile("src/release.js", "x\n");
    commitAll("release");
    git(root, "checkout", "--quiet", "demo");
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    configure({ base: "release" });
    assert.equal(check().netChange, expected("release"));
  });

  it("stops the check when the base does not resolve", () => {
    pipeline(3);
    configure({ base: "missing" });
    const out = run("check", abs(P("")));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /base does not resolve to a commit: missing/);
  });

  it("excludes the pipelines folder root that .rp.md names", () => {
    writeFile(".rp.md", "# Conventions\n\n### Pipelines folder root\n\n`work/pipes/`\n\n### Other\n\nx\n");
    commitAll("conventions");
    for (const [rel, contents] of [["run-config.md", '---\n{"target-phase": 4, "base": "main"}\n---\n'], ["0-intent/intent.md", "# I\n"]]) writeFile(`work/pipes/demo/${rel}`, contents);
    writeFile("src/app.js", "export const a = 2;\n");
    writeFile(".pipelines/x.md", "outside the root\n");
    commitAll("pipeline");
    const report = JSON.parse(rp("check", abs("work/pipes/demo"), "--json"));
    assert.equal(report.pipeline, "work/pipes/demo");
    assert.equal(report.netChange, expected("main", "work/pipes"));
    const out = run("check", abs(".pipelines/demo"));
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not inside the pipelines folder root work\/pipes/);
  });
});
