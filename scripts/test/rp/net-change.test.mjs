import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { P, abs, approve, check, commitAll, configure, frontier, git, pipeline, root, rp, run, useRepo, writeFile } from "./fixture.mjs";

// The net change id computed with bare git, as the README states it.
function expected(base = "main", exclude = ".pipelines") {
  const diff = execFileSync("git", ["diff", "-U0", "--no-renames", "--binary", `${base}...HEAD`, "--", ".", `:(top,exclude,literal)${exclude}`], { cwd: root, encoding: "latin1" });
  const changed = diff.split("\n").filter((line) => !line.startsWith("@@") && !line.startsWith("index ")).join("\n");
  return createHash("sha1").update(Buffer.from(changed, "latin1")).digest("hex");
}
function approveAndCommit() {
  approve();
  commitAll("approve");
}
const LINES = (changed = {}) => `${Array.from({ length: 12 }, (_, i) => changed[i] ?? `line ${i}`).join("\n")}\n`;
function mergeBase(change) {
  git(root, "checkout", "--quiet", "main");
  change();
  commitAll("base moves");
  git(root, "checkout", "--quiet", "demo");
  git(root, "merge", "--quiet", "--no-edit", "main");
}

describe("net change", () => {
  useRepo();

  it("is the hash of an empty diff when the branch changes nothing outside the pipelines folder root", () => {
    pipeline(3);
    assert.equal(check().netChange, createHash("sha1").update("").digest("hex"));
  });

  it("is the sha1 of the changed lines from the merge-base, outside the pipelines folder root", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    writeFile("docs/new.md", "# New\n");
    writeFile(".pipelines/other/notes.md", "other pipeline\n");
    commitAll("change");
    assert.equal(check().netChange, expected());
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

  for (const [what, change] of [
    ["in other files", () => writeFile("src/other.js", "export const b = 1;\n")],
    ["in the context of the changed line", () => writeFile("src/lines.txt", LINES({ 4: "base edit" }))],
    ["far away in the same file, shifting line numbers", () => writeFile("src/lines.txt", `prepended\n${LINES()}`)],
  ])
    it(`is unchanged by a merge from the base that changes ${what}, so an approval stays current`, () => {
      git(root, "checkout", "--quiet", "main");
      writeFile("src/lines.txt", LINES());
      commitAll("lines");
      git(root, "checkout", "--quiet", "demo");
      git(root, "merge", "--quiet", "--no-edit", "main");
      pipeline(3);
      writeFile("src/lines.txt", LINES({ 6: "pipeline edit" }));
      commitAll("change");
      approveAndCommit();
      const before = check().netChange;
      mergeBase(change);
      assert.equal(check().netChange, before);
      assert.deepEqual(frontier(), ["complete"]);
    });

  it("changes with a conflict resolution, so the approval goes stale", () => {
    pipeline(3);
    writeFile("src/app.js", "export const a = 2;\n");
    commitAll("change");
    approveAndCommit();
    const before = check().netChange;
    git(root, "checkout", "--quiet", "main");
    writeFile("src/app.js", "export const a = 5;\n");
    commitAll("base conflicts");
    git(root, "checkout", "--quiet", "demo");
    assert.throws(() => git(root, "merge", "--quiet", "--no-edit", "main"));
    writeFile("src/app.js", "export const a = 7;\n");
    commitAll("resolve");
    assert.notEqual(check().netChange, before);
    assert.deepEqual(frontier(), ["review default"]);
  });

  it("changes with a whitespace-only change", () => {
    pipeline(3);
    writeFile("src/app.js", "a b\n");
    commitAll("spaced");
    const spaced = check().netChange;
    writeFile("src/app.js", "ab\n");
    commitAll("unspaced");
    assert.notEqual(check().netChange, spaced);
    writeFile("src/app.js", "a  b\n");
    commitAll("double");
    assert.notEqual(check().netChange, spaced);
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

  it("excludes the pipelines folder root that is the pipeline folder's parent, whatever .rp.md says", () => {
    writeFile(".rp.md", "### Pipelines folder root\n\n`elsewhere/`\n");
    for (const [rel, contents] of [["run-config.md", '---\n{"target-phase": 4, "base": "main"}\n---\n'], ["0-intent/intent.md", "# I\n"]]) writeFile(`work/pipes/demo/${rel}`, contents);
    writeFile("src/app.js", "export const a = 2;\n");
    writeFile("work/pipes/other.md", "inside the root\n");
    writeFile(".pipelines/x.md", "outside the root\n");
    commitAll("pipeline");
    const report = JSON.parse(rp("check", abs("work/pipes/demo"), "--json"));
    assert.equal(report.pipeline, "work/pipes/demo");
    assert.equal(report.netChange, expected("main", "work/pipes"));
  });
});
