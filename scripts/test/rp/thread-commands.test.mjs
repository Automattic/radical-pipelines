import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";

import { parseThread } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import {
  P, PIPELINE, REVIEW, RP, TO_OWNER, TO_SPEC,
  abs, apply, check, commitAll, commitIn, frontier, git, landRole, laneWorktree, pipeline, plan, read, remove, root, thread, useRepo, wakeOf, write, writeFile,
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

  describe("refuses each wrong use, saying what was wrong and what to run instead, and changes no file", () => {
    const F = () => abs(PIPELINE), T = (n) => abs(P(`threads/${n}`));
    const AWAITS_SPEC = "1-design-doc-producer-spec-producer-spec.md", AWAITS_REVIEWER = "2-reviewer-default-implementer-implementation.md";
    const CLOSED = "3-implementer-design-doc-producer-design-doc.md", TO_THE_OWNER = "4-spec-producer-owner-intent.md", REJECTED = "5-reviewer-default-implementer-implementation.md";
    // [what, the arguments, what was wrong, what to run instead, and the standard input when not a body]
    const uses = [
      ["an unknown subcommand", () => ["thread", "shut", F(), "--role", "implementer"], /^rp: thread: unknown subcommand: shut$/m, /^ {2}node rp\.mjs thread close <pipeline folder>/m],
      ["no subcommand", () => ["thread"], /^rp: thread: missing subcommand$/m, /^ {2}node rp\.mjs thread open <pipeline folder>/m],
      ["an unknown option", () => ["thread", "open", F(), "--role", "implementer", "--artifact", "spec", "--owner", "spec-producer", "--body", "-"], /^rp: thread open: unknown option: --owner$/m,
        /^usage: node rp\.mjs thread open <pipeline folder> --role <role> --artifact <spec \| design-doc \| implementation> --body <file \| ->$/m],
      ["a missing argument", () => ["thread", "reply", F(), "--role", "spec-producer", "--thread", T(AWAITS_SPEC)], /^rp: thread reply: missing --body <file \| ->$/m, /^usage: node rp\.mjs thread reply /m],
      ["a missing pipeline folder", () => ["validate", "--role", "implementer"], /^rp: validate: missing <pipeline folder>$/m, /^usage: node rp\.mjs validate <pipeline folder> --role <role> \[--file <path>\]$/m],
      ["a --role that names no role", () => ["thread", "open", F(), "--role", "reviewer", "--artifact", "implementation", "--body", "-"], /^rp: thread open: --role names a role, <profile>\[-<lane>\]: reviewer$/m, /^usage: /m],
      ["a --thread outside the pipeline's threads", () => ["thread", "reply", F(), "--role", "spec-producer", "--thread", abs("src/app.js"), "--body", "-"],
        /^rp: thread reply: no thread file of \.pipelines\/demo: .*src\/app\.js$/m, /^give --thread a thread file in \.pipelines\/demo\/threads, as rp thread open prints it$/m],
      ["a --thread naming no file", () => ["thread", "close", F(), "--role", "implementer", "--thread", T("9-implementer-spec-producer-spec.md"), "--status", "withdrawn"],
        /^rp: thread close: no thread file of \.pipelines\/demo: .*9-implementer-spec-producer-spec\.md$/m, /^give --thread a thread file in /m],
      ["a --file none of the role's files", () => ["validate", F(), "--role", "implementer", "--file", abs(P("1-spec/spec.md"))],
        /^rp: validate: .*1-spec\/spec\.md is no file of implementer, whose files are its artifact or candidate and the threads naming it$/m, /^run rp validate without --file to check them all$/m],
      ["a --file outside the pipeline folder", () => ["validate", F(), "--role", "reviewer-default", "--file", `threads/${AWAITS_REVIEWER}`],
        new RegExp(`^rp: validate: threads/${AWAITS_REVIEWER} lies outside \\.pipelines/demo, as --file resolves against the process directory$`, "m"),
        /^give --file \/.*\/\.pipelines\/demo\/<its path in the pipeline folder>$/m],
      ["an open by a production lane", () => ["thread", "open", F(), "--role", "spec-producer-a", "--artifact", "implementation", "--body", "-"],
        /^rp: thread open: spec-producer-a is a production lane, which opens no thread$/m, /^state it in your candidate: the consolidator resolves where lanes differ$/m],
      ["an escalation by a production lane", () => ["thread", "escalate", F(), "--role", "design-doc-producer-b", "--cites", T(AWAITS_SPEC), "--body", "-"],
        /^rp: thread escalate: design-doc-producer-b is a production lane, which opens no thread$/m, /^state it in your candidate/m],
      ["an open about the artifact the implementer owns", () => ["thread", "open", F(), "--role", "implementer", "--artifact", "implementation", "--body", "-"],
        /^rp: thread open: implementer owns implementation$/m, /^open a thread about an artifact you consume: --artifact spec or design-doc$/m],
      ["an open about the artifact the design-doc-producer owns", () => ["thread", "open", F(), "--role", "design-doc-producer", "--artifact", "design-doc", "--body", "-"],
        /^rp: thread open: design-doc-producer owns design-doc$/m, /^open a thread about an artifact you consume: --artifact spec$/m],
      ["an open about the artifact the spec-producer owns", () => ["thread", "open", F(), "--role", "spec-producer", "--artifact", "spec", "--body", "-"],
        /^rp: thread open: spec-producer owns spec, and consumes the intent alone$/m, /^raise a disagreement on what the intent means or demands with rp thread escalate --cites <thread path \| evidence path> --body <file \| ->$/m],
      ["an open about the intent", () => ["thread", "open", F(), "--role", "implementer", "--artifact", "intent", "--body", "-"],
        /^rp: thread open: the intent is the owner's$/m, /^raise a disagreement on what the intent means or demands with rp thread escalate --cites <thread path \| evidence path> --body <file \| ->$/m],
      ["a close with another status", () => ["thread", "close", F(), "--role", "design-doc-producer", "--thread", T(AWAITS_SPEC), "--status", "answered"],
        /^rp: thread close: --status is approved or withdrawn: answered$/m, /^close it --status approved when its findings are resolved, or --status withdrawn when you drop them$/m],
      ["a close of a thread to owner", () => ["thread", "close", F(), "--role", "spec-producer", "--thread", T(TO_THE_OWNER), "--status", "withdrawn"],
        new RegExp(`^rp: thread close: threads/${TO_THE_OWNER} awaits the owner's answer$`, "m"), /^write nothing in it: it is closed answered with the owner's answer$/m],
      ["a reply to a thread that awaits the other party", () => ["thread", "reply", F(), "--role", "design-doc-producer", "--thread", T(AWAITS_SPEC), "--body", "-"],
        new RegExp(`^rp: thread reply: threads/${AWAITS_SPEC} awaits spec-producer$`, "m"), /^only spec-producer writes in it now: check --role and --thread$/m],
      ["a reply to a closed thread", () => ["thread", "reply", F(), "--role", "design-doc-producer", "--thread", T(CLOSED), "--body", "-"],
        new RegExp(`^rp: thread reply: threads/${CLOSED} is approved, and a closed thread is history$`, "m"), /^open a new thread with rp thread open$/m],
      ["a close by a role other than the opener", () => ["thread", "close", F(), "--role", "spec-producer", "--thread", T(AWAITS_SPEC), "--status", "withdrawn"],
        new RegExp(`^rp: thread close: only its opener, design-doc-producer, closes threads/${AWAITS_SPEC}$`, "m"), /^answer it with rp thread reply$/m],
      ["an empty body", () => ["thread", "reply", F(), "--role", "spec-producer", "--thread", T(AWAITS_SPEC), "--body", "-"],
        /^rp: thread reply: the body on standard input is empty$/m, /^write the message on standard input, or in the file --body names, and run the command again$/m, " \n\n"],
      ["an escalation citing nothing", () => ["thread", "escalate", F(), "--role", "implementer", "--cites", " ", "--body", "-"],
        /^rp: thread escalate: --cites names the thread the disagreement comes from or the path of its evidence$/m, /^usage: node rp\.mjs thread escalate /m],
      ["a reply to a thread file rp validate rejects", () => ["thread", "reply", F(), "--role", "implementer", "--thread", T(REJECTED), "--body", "-"],
        new RegExp(`^rp: thread reply: INVALID threads/${REJECTED}: status must be one of open \\| approved`, "m"), /^repair the file, check it with rp validate, and run the command again$/m],
      ["an approval without a closing message after the author's answer", () => ["thread", "close", F(), "--role", "reviewer-default", "--thread", T(AWAITS_REVIEWER), "--status", "approved"],
        new RegExp(`^rp: thread close: an approval names the commit it approves in its reviewer's last message, and the last message of threads/${AWAITS_REVIEWER} is implementer's at [0-9a-f]{40}$`, "m"),
        /^run the same command with --body <file \| ->: your closing message names the commit you approve$/m],
    ];
    for (const [what, args, wrong, instead, input = "A body.\n"] of uses)
      it(what, () => {
        pipeline(3);
        thread({ n: 1, ...TO_SPEC });
        thread({ n: 2, ...REVIEW(), messages: [["reviewer-default", head()], ["implementer", head()]] });
        thread({ n: 3, opener: "implementer", owner: "design-doc-producer", artifact: "design-doc", status: "approved" });
        thread({ n: 4, ...TO_OWNER });
        thread({ n: 5, ...REVIEW(), status: "pending" });
        commitAll("threads");
        const before = snapshot(), out = rpWith(args(), input);
        assert.deepEqual([out.status, out.stdout], [1, ""]);
        assert.match(out.stderr, wrong);
        assert.match(out.stderr, instead);
        assert.deepEqual(snapshot(), before);
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
      pipeline(3);
      apply();
      const wt = laneWorktree("demo-review-default");
      close("reviewer-default", open("reviewer-default", "implementation", FINDINGS, wt), "approved", undefined, wt);
      commitIn(wt, {}, "review");
      assert.deepEqual(check().reviews, [{ lane: "default", approved: false }]);
      assert.deepEqual(readdirSync(join(wt, PIPELINE)).sort(), ["0-intent", "threads"]);
    });
  });

  describe("through a review, as the delivered assignments state", () => {
    // Every command an assignment states for rp: each code block that runs it, as written.
    const statedIn = (text) => [...text.matchAll(/^```\n(node [^`]*?)\n```$/gm)].map((match) => match[1]);
    // Runs a stated command from `worktree` with `body` in place of its `<…>` line, or on its standard input.
    const sh = (command, worktree, body = "") => spawnSync("sh", ["-c", command.replace(/^<[^>\n]+>$/m, () => body.trimEnd())], { cwd: worktree, encoding: "utf8", input: body });
    // Applies the step and reads the assignment of `role`, which it wakes: its worktree and its text.
    function woken(role) {
      const fields = wakeOf(apply(), role);
      return { worktree: fields.worktree, text: readFileSync(fields.assignment, "utf8") };
    }
    const REVIEW_THREAD = "threads/1-reviewer-default-implementer-implementation.md";
    const threads = () => check().threads.map(({ path, status, awaits }) => [path, status, awaits]);
    // What the next step's plan names to fix or repair.
    const rejects = () => plan().filter((line) => /^(?:frontier INVALID|fix|repair) /.test(line));
    function reviewable() {
      pipeline(3);
      writeFile("src/app.js", "export const a = 2;\n");
      commitAll("code");
    }

    it("a reviewer that approves on its first turn lands its lane approved", () => {
      reviewable();
      const { worktree, text } = woken("reviewer-default");
      const [opening, approving] = statedIn(text);
      const opened = sh(opening, worktree, FINDINGS);
      assert.equal(opened.status, 0, opened.stderr);
      const approved = sh(approving.replace("<that path>", opened.stdout.trimEnd()), worktree);
      assert.equal(approved.status, 0, approved.stderr);
      commitIn(worktree, {}, "Approve the change (reviewer)");
      landRole("reviewer-default");
      assert.ok(read(REVIEW_THREAD).endsWith(`\n\n${FINDINGS}`));
      assert.deepEqual([check().reviews, threads(), rejects()], [[{ lane: "default", approved: true }], [[REVIEW_THREAD, "approved", null]], []]);
    });

    it("a reviewer approves after the implementer's answer only with a closing message, and its lane lands approved", () => {
      reviewable();
      const first = woken("reviewer-default");
      assert.equal(sh(statedIn(first.text)[0], first.worktree, FINDINGS).status, 0);
      commitIn(first.worktree, {}, "Open review thread (reviewer)");
      landRole("reviewer-default");
      assert.deepEqual(threads(), [[REVIEW_THREAD, "open", "implementer"]]);
      const implementer = woken("implementer");
      const command = implementer.text.match(/^- rp: `([^`]+)`/m)[1], awaiting = implementer.text.match(/^## Threads addressed to you\n\n(.+)$/m)[1];
      const answered = sh(command.replace("<command>", `thread reply --thread ${awaiting} --body -`), implementer.worktree, "### Finding 1: changed\n\nFixed.\n");
      assert.equal(answered.status, 0, answered.stderr);
      commitAll("Answer the review (implementer)");
      landRole("implementer");
      assert.deepEqual(threads(), [[REVIEW_THREAD, "open", "reviewer-default"]]);
      const later = woken("reviewer-default");
      const [approving] = statedIn(later.text);
      const refused = sh(approving.replace(" --body -", ""), later.worktree, "The answer resolves it.\n");
      assert.equal(refused.status, 1);
      assert.match(refused.stderr, /^run the same command with --body <file \| ->/m);
      const approved = sh(approving, later.worktree, "The answer resolves it.\n");
      assert.equal(approved.status, 0, approved.stderr);
      commitIn(later.worktree, {}, "Approve review (reviewer)");
      landRole("reviewer-default");
      assert.deepEqual([check().reviews, threads(), rejects()], [[{ lane: "default", approved: true }], [[REVIEW_THREAD, "approved", null]], []]);
    });
  });

  describe("in each seat, from the file grammar alone", () => {
    it("a review lane's tree, with no run-config.json and no threads folder: the reviewer opens, escalates, and closes its threads", () => {
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
