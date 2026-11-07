import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";

import { parseThread } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import {
  P, PIPELINE, RP, TO_SPEC,
  abs, apply, check, commitAll, commitIn, conventions, frontier, git, laneWorktree, pipeline, read, remove, root, thread, useRepo, write, writeFile,
} from "./fixture.mjs";

const head = (at = root) => git(at, "rev-parse", "HEAD").trim();
// Runs rp from outside the repository, `input` on its standard input.
function rpWith(args, input) {
  const out = spawnSync(process.execPath, [RP, ...args], { cwd: tmpdir(), encoding: "utf8", input });
  return { status: out.status, stdout: out.stdout, stderr: out.stderr };
}
// `rp thread <subcommand>` as `role` on the pipeline folder in `worktree`, with `options`, and `body` on standard input
// through `--body -` when given.
const threadAs = (role, subcommand, options, body, worktree = root) =>
  rpWith(["thread", subcommand, join(worktree, PIPELINE), "--role", role, ...options, ...(body === undefined ? [] : ["--body", "-"])], body);
// The pipeline-relative path of the thread file a command that succeeded printed.
function written(out, worktree = root) {
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stderr, "");
  return relative(realpathSync(join(worktree, PIPELINE)), out.stdout.trimEnd()).split(sep).join("/");
}
const open = (role, artifact, body, worktree) => written(threadAs(role, "open", ["--artifact", artifact], body, worktree), worktree);
const reply = (role, path, body, worktree = root) => written(threadAs(role, "reply", ["--thread", join(worktree, PIPELINE, path)], body, worktree), worktree);
const close = (role, path, status, body, worktree = root) => written(threadAs(role, "close", ["--thread", join(worktree, PIPELINE, path), "--status", status], body, worktree), worktree);
const escalate = (role, cites, body, worktree) => written(threadAs(role, "escalate", ["--cites", cites], body, worktree), worktree);
const readIn = (worktree, rel) => readFileSync(join(worktree, PIPELINE, rel), "utf8");

// Every file of the repository's working trees but those under `.git`, with its contents, and every ref.
function snapshot() {
  const files = readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name))).filter((path) => path.split(sep)[0] !== ".git").sort();
  return { files: Object.fromEntries(files.map((path) => [path, readFileSync(join(root, path), "utf8")])), refs: git(root, "for-each-ref", "--format=%(refname) %(objectname)") };
}
// The paths whose contents differ between two snapshots, or that only one holds.
const changed = (before, after) => [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter((path) => before.files[path] !== after.files[path]).sort();

const FINDINGS = "### Finding 1: `spec-requirement-2` has no input\n\nObserved: `$HOME` is unset.\n";

describe("rp thread", () => {
  useRepo();

  describe("open and escalate", () => {
    it("open: the role's thread to the artifact's owner, numbered one past the highest thread number its folder holds, or 1 without the folder, its one message the role's at HEAD", () => {
      pipeline(3);
      const first = open("implementer", "spec", FINDINGS);
      assert.equal(first, "threads/1-implementer-spec-producer-spec.md");
      assert.equal(read(first), `---\nstatus: open\nopener: implementer\nowner: spec-producer\nartifact: spec\n---\n\n## implementer — ${head()}\n\n${FINDINGS}`);
      write("threads/6-spec-producer-owner-intent.md", "a malformed thread of another role\n");
      write("threads/notes.md", "no thread\n");
      assert.equal(open("implementer", "design-doc", FINDINGS), "threads/7-implementer-design-doc-producer-design-doc.md");
      assert.equal(open("reviewer-default", "implementation", FINDINGS), "threads/8-reviewer-default-implementer-implementation.md");
      for (const rel of ["threads/6-spec-producer-owner-intent.md", "threads/notes.md"]) remove(rel);
      commitAll("threads");
      assert.deepEqual(check().threads.map(({ path, status, opener, owner, artifact, awaits }) => [path, status, opener, owner, artifact, awaits]), [
        [first, "open", "implementer", "spec-producer", "spec", "spec-producer"],
        ["threads/7-implementer-design-doc-producer-design-doc.md", "open", "implementer", "design-doc-producer", "design-doc", "design-doc-producer"],
        ["threads/8-reviewer-default-implementer-implementation.md", "open", "reviewer-default", "implementer", "implementation", "implementer"],
      ]);
    });

    it("escalate: the role's thread to owner about the intent, citing what it was given as the frontmatter reads it back, numbered as open numbers, and the frontier escalates it", () => {
      pipeline(3);
      const cited = thread(TO_SPEC);
      for (const [cites, n] of [[cited, 2], ["#12: the evidence", 3], ["it's \"quoted\"", 4]]) {
        const path = escalate("design-doc-producer", cites, "Does the intent demand X?\n");
        assert.equal(path, `threads/${n}-design-doc-producer-owner-intent.md`);
        const parsed = parseThread(path.slice("threads/".length), readFileSync(abs(P(path))));
        assert.deepEqual([parsed.status, parsed.opener, parsed.owner, parsed.artifact, parsed.cites, parsed.messages], ["disagreement", "design-doc-producer", "owner", "intent", cites, [{ author: "design-doc-producer", commit: head() }]]);
        assert.ok(read(path).endsWith(`\n## design-doc-producer — ${head()}\n\nDoes the intent demand X?\n`));
      }
      commitAll("escalations");
      assert.deepEqual(frontier(), [2, 3, 4].map((n) => `escalate threads/${n}-design-doc-producer-owner-intent.md`));
    });
  });

  describe("reply and close", () => {
    it("reply: the header and every earlier message byte for byte, the role's message at the end, and the thread awaiting the other party", () => {
      pipeline(3);
      const path = thread(TO_SPEC);
      commitAll("thread");
      const before = read(path);
      reply("spec-producer", path, "### Finding 1: stands\n\nObserved.\n");
      assert.equal(read(path), `${before}\n## spec-producer — ${head()}\n\n### Finding 1: stands\n\nObserved.\n`);
      assert.equal(check().threads[0].awaits, "design-doc-producer");
      reply("design-doc-producer", path, "New evidence.\n");
      assert.equal(check().threads[0].awaits, "spec-producer");
    });

    it("close: the status set, a closing message at the end only when given, and every other byte as it was", () => {
      pipeline(3);
      const quiet = thread({ n: 1, ...TO_SPEC, messages: [["design-doc-producer", "abc1234"], ["spec-producer", "def5678"]] });
      write("threads/2-design-doc-producer-spec-producer-spec.md", `---\nstatus:   "open"  \nopener: design-doc-producer\nowner: spec-producer\nartifact: spec\n---\n## design-doc-producer — abc1234\nNo final newline`);
      const closing = "threads/2-design-doc-producer-spec-producer-spec.md";
      commitAll("threads");
      const [quietBefore, closingBefore] = [read(quiet), read(closing)];
      close("design-doc-producer", quiet, "withdrawn");
      assert.equal(read(quiet), quietBefore.replace("status: open", "status: withdrawn"));
      close("design-doc-producer", closing, "approved", "Resolved.\n");
      assert.equal(read(closing), `${closingBefore.replace(`status:   "open"  `, "status: approved")}\n\n## design-doc-producer — ${head()}\n\nResolved.\n`);
      assert.deepEqual(check().threads.map((each) => [each.status, each.awaits]), [["withdrawn", null], ["approved", null]]);
    });
  });

  describe("bodies", () => {
    const BODY = "### Finding 1: `x` costs $HOME\n\n- a list\n  - nested\n\n```md\n## not a message\n```\n\n~~~~\n## nor this\n```\n~~~~\n\nNo final newline";

    it("each reads byte for byte as given, level-3 headings, lists, and fenced code holding ## lines included, after an open, a reply, and a close", () => {
      pipeline(3);
      const path = open("reviewer-default", "implementation", BODY);
      assert.equal(read(path), `---\nstatus: open\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — ${head()}\n\n${BODY}`);
      let before = read(path);
      reply("implementer", path, BODY);
      assert.equal(read(path), `${before}\n\n## implementer — ${head()}\n\n${BODY}`);
      before = read(path);
      close("reviewer-default", path, "approved", BODY);
      assert.equal(read(path), `${before.replace("status: open", "status: approved")}\n\n## reviewer-default — ${head()}\n\n${BODY}`);
      assert.deepEqual(parseThread(path.slice("threads/".length), readFileSync(abs(P(path)))).messages.map((each) => each.author), ["reviewer-default", "implementer", "reviewer-default"]);
    });

    it("are refused, writing nothing, when the grammar would read one as holding a message heading or as hiding the next", () => {
      pipeline(3);
      const path = thread(TO_SPEC);
      commitAll("thread");
      const refused = [
        ["## Summary\n", /^rp: thread (?:open|reply): the thread grammar rejects what it would write: message heading must be ## <role> — <commit>: ## Summary$/m],
        ["Quoting it:\n\n## spec-producer — abc1234\n", /^rp: thread (?:open|reply): the body holds a line the thread grammar reads as a message heading: ## spec-producer — abc1234$/m],
        ["```\nleft open\n## inside\n", /^rp: thread (?:open|reply): the body leaves fenced code open, which hides every message heading after it$/m],
      ];
      for (const [body, message] of refused)
        for (const run of [() => threadAs("implementer", "open", ["--artifact", "spec"], body), () => threadAs("spec-producer", "reply", ["--thread", abs(P(path))], body)]) {
          const before = snapshot(), out = run();
          assert.deepEqual([out.status, out.stdout], [1, ""]);
          assert.match(out.stderr, message);
          assert.match(out.stderr, /\n.*run the command again\n$/);
          assert.deepEqual(snapshot(), before);
        }
    });

    it("read from the file --body names, against the process directory", () => {
      pipeline(3);
      writeFileSync(join(root, "body.md"), FINDINGS);
      const out = spawnSync(process.execPath, [RP, "thread", "open", PIPELINE, "--role", "implementer", "--artifact", "spec", "--body", "body.md"], { cwd: root, encoding: "utf8" });
      assert.equal(read(written(out)), `---\nstatus: open\nopener: implementer\nowner: spec-producer\nartifact: spec\n---\n\n## implementer — ${head()}\n\n${FINDINGS}`);
    });
  });

  describe("changes", () => {
    it("only the thread file each command writes, and rp validate no file: no certification, ref, or other file", () => {
      pipeline(3);
      writeFile("src/app.js", "export const a = 2;\n");
      commitAll("code");
      const path = "threads/1-implementer-spec-producer-spec.md";
      for (const step of [() => open("implementer", "spec", FINDINGS), () => reply("spec-producer", path, "Stands.\n"), () => close("implementer", path, "approved"), () => escalate("implementer", path, "Which?\n")]) {
        const before = snapshot(), rel = step(), after = snapshot();
        assert.deepEqual([changed(before, after), after.refs], [[P(rel)], before.refs]);
      }
      const before = snapshot();
      assert.equal(rpWith(["validate", abs(PIPELINE), "--role", "implementer"]).status, 0);
      assert.deepEqual(snapshot(), before);
    });

    it("no approval in the pipeline from a review thread closed approved in a lane whose turn has not landed", () => {
      conventions();
      pipeline(3);
      apply();
      const wt = laneWorktree("demo-review-default");
      close("reviewer-default", open("reviewer-default", "implementation", FINDINGS, wt), "approved", undefined, wt);
      commitIn(wt, {}, "review");
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false }]);
      assert.deepEqual(readdirSync(join(wt, PIPELINE)).sort(), ["0-intent", "threads"]);
    });
  });

  describe("in each seat, from the file grammar alone", () => {
    it("a review lane's tree, with no run-config.md and no threads folder: the reviewer opens, escalates, and closes its threads", () => {
      conventions();
      pipeline(3);
      apply();
      const wt = laneWorktree("demo-review-default");
      assert.deepEqual(readdirSync(join(wt, PIPELINE)), ["0-intent"]);
      const review = open("reviewer-default", "implementation", FINDINGS, wt);
      assert.equal(review, "threads/1-reviewer-default-implementer-implementation.md");
      assert.equal(readIn(wt, review), `---\nstatus: open\nopener: reviewer-default\nowner: implementer\nartifact: implementation\n---\n\n## reviewer-default — ${head(wt)}\n\n${FINDINGS}`);
      assert.equal(escalate("reviewer-default", review, "Does the issue demand X?\n", wt), "threads/2-reviewer-default-owner-intent.md");
      close("reviewer-default", review, "withdrawn", "Asked the owner.\n", wt);
      assert.match(readIn(wt, review), /^---\nstatus: withdrawn\n/);
    });

    it("the pipeline worktree, where another role's file is malformed and another pipeline folder's files are of an earlier grammar", () => {
      pipeline(3);
      thread({ n: 4, ...TO_SPEC, status: "pending" });
      writeFile(".pipelines/other/threads/9-implementer-spec-producer-spec.md", "status: open\nopener: implementer\n");
      commitAll("malformed files");
      assert.deepEqual(frontier(), ["INVALID threads/4-design-doc-producer-spec-producer-spec.md"]);
      const path = open("implementer", "design-doc", FINDINGS);
      assert.equal(path, "threads/5-implementer-design-doc-producer-design-doc.md");
      reply("design-doc-producer", path, "Stands.\n");
      assert.deepEqual(parseThread(path.slice("threads/".length), readFileSync(abs(P(path)))).messages.map((each) => each.author), ["implementer", "design-doc-producer"]);
    });
  });
});
