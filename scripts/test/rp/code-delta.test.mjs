import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, parseFrontmatter, renderFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { RP, PIPELINE, git, P, write, read, rp, root, lane, configure, check, review, commitAll, pairs, registered, stampSpec, approveSpec, report, approveChain, gitShim, frontierChain, useFixture } from "./fixture.mjs";

describe("rp code delta", () => {
  useFixture();

  function codeFixture(targetPhase = 3) {
    writeFileSync(join(root, "source.txt"), "top\ncontext\nvalue\nfooter\n");
    writeFileSync(join(root, "README.md"), "Documentation.\n");
    commitAll("base content");
    git(root, "branch", "-f", "main", "HEAD");
    const chain = frontierChain();
    configure({ targetPhase });
    commitAll("configured pipeline");
    return chain;
  }
  const codeState = () => JSON.parse(check(root, "--json"));
  const codeDeltaOf = (rel, ...args) => rp(root, "diff", PIPELINE, "--review", P(rel), ...args);
  const netChange = (...args) => rp(root, "diff", PIPELINE, ...args);
  const changedFiles = (patch) => [...patch.matchAll(/^diff --git a\/(\S+) /gm)].map((m) => m[1]);
  function change(file, text, subject = `change ${file}`) {
    writeFileSync(join(root, file), text);
    return commitAll(subject);
  }
  function onMain(action) {
    git(root, "checkout", "--quiet", "main");
    const result = action();
    git(root, "checkout", "--quiet", "demo");
    return result;
  }
  const patchIdOf = (sha) => execFileSync("git", ["patch-id", "--stable"], { cwd: root, input: git(root, "show", sha), encoding: "utf8" }).split(" ")[0];

  for (const scenario of ["fresh", "clean base merge", "conflicting base merge", "clean rebase", "rebase and prune", "manual edit", "cherry-picked base fix", "cherry-picked base fix then base merge", "change and revert", "code in the review commit"])
    test(`code delta: ${scenario}`, () => {
      const chain = codeFixture();
      let latest = "3-build/build-review-1.md", expected = [];
      const reviewOwnWork = () => {
        change("source.txt", "top\ncontext\nown\nfooter\n");
        latest = "3-build/build-review-2.md";
        review(latest, "approved", chain.phasePackages[2]);
      };
      if (scenario === "clean base merge") {
        onMain(() => change("upstream.txt", "upstream\n"));
        git(root, "merge", "--no-ff", "main", "-m", "integrate");
      }
      if (scenario === "conflicting base merge") {
        reviewOwnWork();
        onMain(() => change("source.txt", "top\ncontext\ntheirs\nfooter\n"));
        assert.throws(() => git(root, "merge", "--no-ff", "main", "-m", "integrate"));
        change("source.txt", "top\ncontext\nresolved\nfooter\n", "resolve");
        expected = ["source.txt"];
      }
      if (scenario === "clean rebase" || scenario === "rebase and prune") {
        reviewOwnWork();
        const old = git(root, "rev-parse", "HEAD").trim();
        onMain(() => change("upstream.txt", "upstream\n"));
        git(root, "rebase", "--quiet", "main");
        if (scenario === "rebase and prune") {
          git(root, "reflog", "expire", "--expire=now", "--all");
          git(root, "gc", "--quiet", "--prune=now");
          assert.throws(() => git(root, "cat-file", "-e", old));
        }
      }
      if (scenario === "manual edit") {
        change("manual.txt", "manual\n");
        expected = ["manual.txt"];
      }
      if (scenario.startsWith("cherry-picked base fix")) {
        const fix = onMain(() => change("fix.txt", "fix\n"));
        git(root, "cherry-pick", fix);
        if (scenario.endsWith("merge")) git(root, "merge", "--no-ff", "main", "-m", "integrate");
        else expected = ["fix.txt"];
      }
      if (scenario === "change and revert") {
        const temporary = change("source.txt", "temporary\n");
        git(root, "revert", "--no-edit", temporary);
      }
      if (scenario === "code in the review commit") {
        latest = "3-build/build-review-2.md";
        writeFileSync(join(root, "source.txt"), "together\n");
        write(root, latest, "# Review\n\nverdict: approved\n");
        commitAll("code and review together");
        rp(root, "stamp", P(latest), ...chain.phasePackages[2].flatMap((f) => ["--reviewed", P(f)]), "--mirror");
        commitAll("stamp");
        expected = ["source.txt"];
      }
      const state = codeState(), patch = codeDeltaOf(latest);
      assert.deepEqual(changedFiles(patch), expected);
      assert.equal(state.buildReview.approved, !expected.length);
      assert.equal(state.complete, !expected.length);
      assert.equal(state.frontier, expected.length ? "build review" : "complete");
      if (scenario === "conflicting base merge") assert.match(patch, /^-<<<<<<< [\s\S]*^\+resolved$/m);
      const { ref, ...atRef } = JSON.parse(check(root, "--ref", "HEAD", "--json"));
      const { ref: worktreeRef, ...atWorktree } = state;
      assert.deepEqual(atRef, atWorktree);
      assert.equal(codeDeltaOf(latest, "--ref", "HEAD"), patch);
      if (!expected.length) return;
      review("3-build/build-review-3.md", "approved", chain.phasePackages[2]);
      assert.equal(codeState().complete, true);
    });

  test("code delta: the net change is the pipeline's code since its base", () => {
    codeFixture();
    assert.equal(netChange(), "");
    change("source.txt", "top\ncontext\nown\nfooter\n");
    onMain(() => change("upstream.txt", "upstream\n"));
    git(root, "merge", "--no-ff", "main", "-m", "integrate");
    write(root, "0-intent/context.md", "Other evidence.\n");
    commitAll("pipeline state");
    const patch = netChange();
    assert.deepEqual(changedFiles(patch), ["source.txt"]);
    assert.match(patch, /^-value\n\+own$/m);
    assert.equal(netChange("--ref", "HEAD~1"), patch);
  });

  for (const merge of ["merge", "squash"])
    test(`code delta: a pipeline integrated into its base by ${merge} continues with only new work`, () => {
      const chain = codeFixture();
      change("source.txt", "shipped\n");
      review("3-build/build-review-2.md", "approved", chain.phasePackages[2]);
      git(root, "checkout", "--quiet", "main");
      if (merge === "merge") git(root, "merge", "--no-ff", "demo", "-m", "integrate pipeline");
      else {
        git(root, "merge", "--squash", "demo");
        commitAll("integrate pipeline");
      }
      git(root, "checkout", "--quiet", "-b", "continuation");
      assert.equal(codeState().complete, true);
      assert.equal(codeDeltaOf("3-build/build-review-2.md"), "");
      assert.equal(netChange(), "");
      change("source.txt", "next\n");
      const state = codeState(), patch = codeDeltaOf("3-build/build-review-2.md");
      assert.equal(state.frontier, "build review");
      assert.deepEqual(changedFiles(patch), ["source.txt"]);
      assert.match(patch, /^-shipped\n\+next$/m);
      assert.equal(netChange(), patch);
      review("3-build/build-review-3.md", "approved", chain.phasePackages[2]);
      assert.equal(codeState().complete, true);
    });

  test("code delta: a stacked pipeline's base is its parent branch, then the branch the parent merged into", () => {
    writeFileSync(join(root, "source.txt"), "base\n");
    commitAll("base content");
    git(root, "branch", "-f", "main", "HEAD");
    git(root, "checkout", "--quiet", "-b", "parent");
    change("parent.txt", "parent\n");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--quiet", "--ff-only", "parent");
    const chain = frontierChain();
    configure({ targetPhase: 3, base: "parent" });
    change("child.txt", "child\n");
    review("3-build/build-review-2.md", "approved", chain.phasePackages[2]);
    const settled = () => {
      assert.equal(codeState().complete, true);
      assert.equal(codeDeltaOf("3-build/build-review-2.md"), "");
      assert.deepEqual(changedFiles(netChange()), ["child.txt"]);
    };
    settled();
    git(root, "checkout", "--quiet", "parent");
    change("parent-more.txt", "more\n");
    git(root, "checkout", "--quiet", "demo");
    git(root, "merge", "--no-ff", "parent", "-m", "integrate parent");
    settled();
    onMain(() => git(root, "merge", "--no-ff", "parent", "-m", "integrate parent into main"));
    settled();
    configure({ targetPhase: 3, base: "main" });
    commitAll("base is main");
    settled();
    git(root, "merge", "--no-ff", "main", "-m", "integrate main");
    settled();
  });

  test("code delta: base commits merged past the base branch are reviewed until it is fast-forwarded", () => {
    codeFixture();
    const remote = join(root, ".git", "remote.git");
    git(root, "init", "--quiet", "--bare", remote);
    git(root, "remote", "add", "origin", remote);
    git(root, "push", "--quiet", "-u", "origin", "main");
    const upstream = onMain(() => {
      const commit = change("upstream.txt", "upstream\n");
      git(root, "push", "--quiet", "origin", "main");
      git(root, "reset", "--quiet", "--hard", "HEAD~1");
      return commit;
    });
    git(root, "fetch", "--quiet", "origin");
    git(root, "merge", "--no-ff", upstream, "-m", "integrate upstream");
    assert.deepEqual(changedFiles(netChange()), ["upstream.txt"]);
    assert.deepEqual(changedFiles(codeDeltaOf("3-build/build-review-1.md")), ["upstream.txt"]);
    assert.equal(codeState().complete, false);
    git(root, "branch", "-f", "main", "origin/main");
    assert.equal(netChange(), "");
    assert.equal(codeState().complete, true);
  });

  for (const scenario of ["document task commit", "build task commit", "manual edit during Document", "rebased document commit", "conflicting document replay"])
    test(`phase order: ${scenario}`, () => {
      const chain = codeFixture(4);
      assert.equal(codeState().complete, true);
      const recordCommits = (index, commits) => {
        registered(chain.reports[index], { reviewed: pairs([chain.tasks[index]]), outcome: "completed", attempt: "1" }, `# Report\noutcome: completed\n\n${commits.map((c) => `commit: ${c}\n`).join("")}`);
        rp(root, "stamp", P(chain.reports[index]), "--mirror");
        commitAll("report");
      };
      let build = [], document = [];
      if (scenario === "document task commit") {
        recordCommits(1, [change("README.md", "Documented.\n")]);
        document = ["README.md"];
      }
      if (scenario === "build task commit") {
        recordCommits(0, [change("source.txt", "built\n")]);
        build = document = ["source.txt"];
      }
      if (scenario === "manual edit during Document") {
        recordCommits(1, [change("README.md", "Documented.\n")]);
        change("manual.txt", "manual\n");
        build = ["manual.txt"];
        document = ["README.md", "manual.txt"];
      }
      if (scenario === "rebased document commit") {
        const documented = change("README.md", "Documented.\n");
        recordCommits(1, [documented]);
        onMain(() => change("upstream.txt", "upstream\n"));
        git(root, "rebase", "--quiet", "main");
        assert.throws(() => git(root, "merge-base", "--is-ancestor", documented, "HEAD"));
        document = ["README.md"];
      }
      if (scenario === "conflicting document replay") {
        change("README.md", "Manual.\n");
        recordCommits(1, [change("README.md", "Documented.\n")]);
        build = document = ["README.md"];
      }
      const state = codeState();
      const buildPatch = codeDeltaOf("3-build/build-review-1.md");
      assert.deepEqual(changedFiles(buildPatch), build);
      assert.deepEqual(changedFiles(codeDeltaOf("4-document/document-review-1.md")), document);
      if (scenario === "conflicting document replay") assert.match(buildPatch, /^-Documentation\.\n\+Documented\.$/m);
      if (scenario !== "build task commit") assert.equal(state.buildReview.approved, !build.length);
      else assert.equal(state.buildReview.approved, false);
      assert.equal(state.documentReview.approved, false);
      assert.deepEqual(changedFiles(netChange()).sort(), [...new Set([...build, ...document])].sort());
    });

  for (const filtered of [false, true])
    test(`code delta: every review lane's code governs, filtered=${filtered}`, () => {
      const chain = codeFixture();
      const security = lane("build-reviewer", "security", filtered ? { materials: [chain.artifacts[2]] } : {});
      const material = filtered ? [chain.artifacts[2]] : chain.phasePackages[2];
      configure({ targetPhase: 3, lanes: [security] });
      commitAll("security lane");
      review("3-build/build-review-security-1.md", "approved", material);
      assert.equal(codeState().complete, true);
      change("source.txt", "changed\n");
      const stale = codeState();
      assert.equal(stale.buildReview.approved, false);
      assert.deepEqual(stale.buildReview.lanes.map((l) => l.fresh), [false, false]);
      review("3-build/build-review-2.md", "approved", chain.phasePackages[2]);
      assert.equal(codeState().complete, false);
      review("3-build/build-review-security-2.md", "approved", material);
      assert.equal(codeState().complete, true);
      change("source.txt", "changed again\n");
      assert.deepEqual(codeState().buildReview.lanes.map((l) => l.fresh), [false, false]);
    });

  test("code delta: an unresolvable base, missing merge-base, or failed merge stops the computation", () => {
    const chain = codeFixture();
    const run = (...args) => rp(root, ...args);
    configure({ targetPhase: 3, base: "absent" });
    assert.throws(() => run("check", PIPELINE), /base does not resolve: absent/);
    assert.throws(() => run("diff", PIPELINE), /base does not resolve: absent/);
    const island = git(root, "commit-tree", git(root, "mktree").trim() || "4b825dc642cb6eb9a060e54bf8d69288fbee4904", "-m", "island").trim();
    git(root, "branch", "island", island);
    configure({ targetPhase: 3, base: "island" });
    assert.throws(() => run("check", PIPELINE), /no merge-base between island/);
    configure({ targetPhase: 3 });
    const { env } = gitShim(`case " $* " in *" merge-tree "*) echo 'merge failure' >&2; exit 2;; esac`);
    const shimmed = (...args) => execFileSync(process.execPath, [RP, ...args], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.throws(() => shimmed("check", PIPELINE), /merge-tree .*merge failure/);
    assert.throws(() => shimmed("diff", PIPELINE, "--review", P("3-build/build-review-1.md")), /merge-tree .*merge failure/);
    write(root, "3-build/build-review-2.md", `---\n${JSON.stringify({ reviewed: pairs(chain.phasePackages[2]), verdict: "approved" })}\n---\n# Review\n\nverdict: approved\n`);
    assert.throws(() => run("check", PIPELINE), /3-build\/build-review-2\.md: no commit adds this review/);
    assert.throws(() => run("diff", PIPELINE, "--review", P("3-build/build-review-2.md")), /no commit adds this review/);
    assert.throws(() => run("diff", PIPELINE, "--review", P("3-build/build-plan-review-1.md")), /not a phase review of this pipeline/);
  });

  test("code delta: malformed recorded patch ids stop the computation", () => {
    const chain = codeFixture(4);
    const commit = change("README.md", "Documented.\n");
    registered(chain.reports[1], { reviewed: pairs([chain.tasks[1]]), outcome: "completed", attempt: "1", commit: [commit], "patch-ids": ["not-a-patch-id"] }, `# Report\noutcome: completed\n\ncommit: ${commit}\n`);
    assert.match(codeState().frontier, /^INVALID FRONTMATTER 4-document\/tasks\/document-task-1-report-1\.md/);
    assert.throws(() => codeDeltaOf("3-build/build-review-1.md"), /INVALID FRONTMATTER .*patch-ids/);
    assert.throws(() => rp(root, "stamp", P(chain.reports[1]), "--mirror"), /INVALID FRONTMATTER .*patch-ids/);
  });

  test("report landing facts: patch ids follow the commit declaration in order and survive a rebase", () => {
    const chain = codeFixture();
    const first = change("a.txt", "a\n"), second = change("b.txt", "b\n");
    onMain(() => change("m.txt", "m\n"));
    git(root, "merge", "--no-ff", "main", "-m", "integrate");
    const merge = git(root, "rev-parse", "HEAD").trim();
    const empty = commitAll("empty");
    const declare = (commits) => write(root, chain.reports[0], `# Report\noutcome: completed\n\n${commits.map((c) => `commit: ${c.slice(0, 10)}\n`).join("")}`);
    declare([second, first, second, merge, empty]);
    rp(root, "stamp", P(chain.reports[0]), "--reviewed", P(chain.tasks[0]), "--mirror");
    const recorded = parseFrontmatter(read(root, chain.reports[0])).data;
    assert.deepEqual(recorded.get("commit"), [second, first, second, merge, empty]);
    assert.deepEqual(recorded.get("patch-ids"), [second, first, second].map(patchIdOf));
    commitAll("report");
    onMain(() => change("upstream.txt", "upstream\n"));
    git(root, "rebase", "--quiet", "main");
    const clone = join(root, ".git", "rebased-clone");
    git(root, "clone", "--quiet", "--no-local", "--branch", "demo", root, clone);
    assert.throws(() => git(clone, "cat-file", "-e", first));
    const before = read(clone, chain.reports[0]);
    rp(clone, "stamp", P(chain.reports[0]), "--mirror");
    assert.deepEqual(parseFrontmatter(read(clone, chain.reports[0])), parseFrontmatter(before));
    const rebased = git(root, "log", "--format=%H", "-1", "--", "a.txt").trim();
    assert.notEqual(rebased, first);
    declare([rebased]);
    rp(root, "stamp", P(chain.reports[0]), "--mirror");
    const redeclared = parseFrontmatter(read(root, chain.reports[0])).data;
    assert.deepEqual(redeclared.get("commit"), [rebased]);
    assert.deepEqual(redeclared.get("patch-ids"), [patchIdOf(first)]);
    declare(["0badc0ffee"]);
    assert.throws(() => rp(root, "stamp", P(chain.reports[0]), "--mirror"), /names a commit that does not exist/);
  });

  test("code delta: check reads no history the reviews do not bound", () => {
    const chain = codeFixture();
    const start = git(root, "rev-parse", "HEAD").trim();
    const { log, env } = gitShim();
    const calls = [];
    for (const length of [3, 300]) {
      git(root, "reset", "--quiet", "--hard", start);
      const commits = Array.from({ length }, (_, n) => `commit refs/heads/demo\ncommitter RP <rp@example.com> ${n} +0000\ndata 7\nhistory\n${n ? "" : `from ${start}\n`}M 100644 inline history.txt\ndata ${String(n).length + 1}\n${n}\n\n`).join("");
      execFileSync("git", ["fast-import", "--quiet", "--force"], { cwd: root, input: commits });
      git(root, "reset", "--quiet", "--hard", "demo");
      review("3-build/build-review-2.md", "approved", chain.phasePackages[2]);
      rmSync(log, { force: true });
      assert.equal(JSON.parse(execFileSync(process.execPath, [RP, "check", PIPELINE, "--json"], { cwd: root, env, encoding: "utf8" })).complete, true);
      calls.push(readFileSync(log, "utf8").trim().split("\n").length);
    }
    assert.equal(calls[0], calls[1]);
  });

  test("a fixed line is mirrored whole or not at all: prose after depends-on is INVALID, never mined", () => {
    approveChain(3);
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1, build-task-3 (build-task-1's fence work is shipped; build-task-3 …)\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror"), /INVALID depends-on: expected none or task ids/);
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1, build-task-1\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror"), /INVALID depends-on: duplicate ids/);
    configure({ targetPhase: 3 });
    assert.match(check(root), /INVALID LINE 3-build\/tasks\/build-task-2.md: depends-on: duplicate ids/);
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1\ndepends-on: later\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror"), /INVALID depends-on: expected none or task ids/);
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1\n");
    rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror");
    configure({ targetPhase: 3 });
    assert.doesNotMatch(check(root), /INVALID LINE/);
  });

  test("every fixed line is validated against its grammar", () => {
    const cases = [
      ["verdict: approved with caveats", /verdict: expected approved \| rejected \| unsatisfiable/],
      ["outcome: done", /outcome: expected completed \| failed \| blocked/],
      ["target: 1-spec\/spec.md##spec-requirement-1", /target: expected <path>\[#<id>\]/],
      ["prior-finding: 1-spec\/spec-review-1.md#spec-finding-1 resolved", /prior-finding: expected <an earlier review of this kind>#<finding id of its phase>, resolution failed/],
      ["origin: owner request", /origin: expected issue <reference>, a source declaration, or a path/],
      ["origin: PROJECT-42", /origin: expected issue <reference>, a source declaration, or a path/],
      ["brief:", /brief: expected text/],
    ];
    for (const [line, error] of cases) {
      write(root, "1-spec/bad.md", `# Bad\n\n${line}\n`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), error);
      configure({ targetPhase: 1 });
      assert.match(check(root), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
    rmSync(join(root, P("1-spec/bad.md")));
    write(root, "1-spec/spec-review-1.md", "# Earlier\n\nverdict: rejected\n\nspec-finding-1: Gap\n");
    write(root, "1-spec/spec-review-2.md", "# Good\n\nverdict: unsatisfiable\noutcome: failed\ntarget: 1-spec/spec.md#spec-requirement-1\nprior-finding: 1-spec/spec-review-1.md#spec-finding-1, resolution failed\norigin: 0-intent/constraint-1.md\norigin: 0-intent/proposal-1.md\nbrief: focused\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    configure({ targetPhase: 1 });
    assert.doesNotMatch(check(root), /INVALID LINE/);

    write(root, "0-intent/intent.md", "origin: issue PROJECT-42 canonical reference\n\n# Intent\n\n## Goal\n\nOriginal.\n");
    rp(root, "stamp", P("0-intent/intent.md"), "--mirror");
    assert.equal(parseFrontmatter(read(root, "0-intent/intent.md")).data.get("origin"), "issue PROJECT-42 canonical reference");
  });

  test("fixed lines stay on one line and singleton declarations occur once", () => {
    for (const body of [
      "brief:\norigin: 0-intent/constraint-1.md\n",
      "target:\n1-spec/spec.md#spec-requirement-1\n",
      "depends-on:\nT1\n",
      "verdict: approved\nverdict: rejected\n",
      "brief: one\nbrief: two\n",
      "target: 1-spec/spec.md#spec-requirement-1\ntarget: 1-spec/spec.md#spec-requirement-1\n",
      "outcome: completed\noutcome: failed\n",
    ]) {
      write(root, "1-spec/bad.md", `# Bad\n\n${body}`);
      assert.throws(() => rp(root, "stamp", P("1-spec/bad.md"), "--mirror"), /INVALID/);
      configure({ targetPhase: 1 });
      assert.match(check(root), /frontier INVALID LINE 1-spec\/bad\.md/);
    }
  });

  test("a --- block inside a body is ordinary body text", () => {
    approveChain(1);
    const text = "# Spec Research\n\n---\nkey: value\n---\n\nBody.\n";
    write(root, "1-spec/spec-research.md", text);
    configure({ targetPhase: 1 });
    const out = check(root);
    assert.doesNotMatch(out, /INVALID FRONTMATTER 1-spec\/spec-research.md|differs from the body/);
    assert.deepEqual(parseFrontmatter(text), { data: null, body: text });
  });

  test("frontmatter delimiters and fixed lines inside fenced code are ordinary body text", () => {
    approveChain(1);
    write(root, "1-spec/example.md", "# Example\n\n```text\n---\nkey: value\n---\n```\n");
    write(root, "1-spec/long-fence.md", "# Example\n\n````markdown\n```\n---\nkey: value\n---\noutcome: success\n```\n````\n");
    write(root, "1-spec/tilde-fence.md", "# Example\n\n~~~text\n---\noutcome: success\n---\n~~~\n");
    configure({ targetPhase: 1 });
    const output = check(root);
    assert.doesNotMatch(output, /INVALID FRONTMATTER 1-spec\/(?:example|long-fence|tilde-fence)\.md/);
    assert.doesNotMatch(output, /INVALID LINE 1-spec\/(?:long-fence|tilde-fence)\.md/);
  });

  test("identity equals git's blob hash of the body, computed without git", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    for (const body of ["", "x", "# Spec\n", "ñ — unicode\n", "a\r\nb"]) assert.equal(identity(`---\n{"pins":["a@b"]}\n---\n${body}`), gitHash(body));
  });

  test("a report's commit lines are mirrored whole, each a hash, and name only commits that exist", () => {
    approveChain(3);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "pipeline");
    const shas = [];
    for (const [i, subject] of ["first", "second", "third"].entries()) {
      writeFileSync(join(root, `src${i}.js`), `${i}\n`);
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", subject);
      shas.push(git(root, "rev-parse", "--short=10", "HEAD").trim());
    }
    const reportPath = "3-build/tasks/build-task-1-report-1.md";
    const stampReport = () => rp(root, "stamp", P(reportPath), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror");
    for (const line of [`commit: \`${shas[0]}\``, `commit: ${shas[0]} — first`]) {
      write(root, reportPath, `# Task report\n\noutcome: completed\n${line}\n`);
      assert.throws(stampReport, /INVALID commit: expected a commit hash/);
    }
    write(root, reportPath, `# Task report\n\noutcome: completed\n${shas.map((s) => `commit: ${s}\n`).join("")}\n## Checks\n\n- 1234567 is not a commit: prose stays prose\n`);
    stampReport();
    // Short hashes in the body are stored canonical: the full hash.
    const full = shas.map((s) => git(root, "rev-parse", s).trim());
    assert.deepEqual(parseFrontmatter(read(root, "3-build/tasks/build-task-1-report-1.md")).data.get("commit"), full);
    const patchId = (sha) => execFileSync("git", ["patch-id", "--stable"], { cwd: root, input: git(root, "show", sha), encoding: "utf8" }).split(" ")[0];
    assert.deepEqual(parseFrontmatter(read(root, "3-build/tasks/build-task-1-report-1.md")).data.get("patch-ids"), full.map(patchId));
    write(root, "3-build/tasks/build-task-2-report-1.md", "# Task report\n\noutcome: completed\ncommit: 0badc0ffee1\n");
    assert.throws(() => rp(root, "stamp", P("3-build/tasks/build-task-2-report-1.md"), "--reviewed", P("3-build/tasks/build-task-2.md"), "--reviewed", P("3-build/tasks/build-task-1.md"), "--mirror"), /names a commit that does not exist or is ambiguous: 0badc0ffee1/);
  });

  test("frontmatter renders and parses nested data without changing the body", () => {
    const body = "# Body\n\nExact bytes.\r\n";
    const data = new Map([
      ["pins", ["a,b", "c: d"]],
      ["lane-packages", [["1-spec/lanes/a/spec.md", ["a@111111111111"], ["b@222222222222"]]]],
      ["brief", "Check: all [paths] # deeply"],
      ["depends", []],
    ]);
    const rendered = renderFrontmatter(data, body);
    const parsed = parseFrontmatter(rendered);
    assert.equal(parsed.body, body);
    assert.deepEqual(parsed.data, new Map([...data].filter(([, value]) => !Array.isArray(value) || value.length)));
    assert.equal(renderFrontmatter(parsed.data, parsed.body), rendered);
  });

  test("identity is the body's exact bytes as git hashes them: CRLF is never normalized; only delimiter lines tolerate a \\r", () => {
    const gitHash = (text) => execFileSync("git", ["hash-object", "--stdin"], { input: text, encoding: "utf8" }).trim().slice(0, 12);
    write(root, "1-spec/spec.md", "# Spec\r\n");
    assert.equal(identity(read(root, "1-spec/spec.md")), gitHash("# Spec\r\n"));
    assert.notEqual(identity("# Spec\r\n"), identity("# Spec\n"));
    stampSpec();
    const text = read(root, "1-spec/spec.md");
    assert.match(text, /^---\n\{\n[\s\S]*\n\}\n---\n# Spec\r\n$/);
    assert.equal(identity(text), gitHash("# Spec\r\n"));
    // Delimiter lines may carry a \r; the closing one may end the file.
    assert.equal(identity('---\r\n{"note":"x"}\r\n---\r\n# Spec\r\n'), gitHash("# Spec\r\n"));
    assert.deepEqual(parseFrontmatter('---\n{"note":"x"}\n---'), { data: new Map([["note", "x"]]), body: "" });
    assert.deepEqual(parseFrontmatter("---\n{}\n---\nbody\n"), { data: new Map(), body: "body\n" });
  });

  test("the pipeline tree holds no symlinks: stamp refuses them, check reports them without following", () => {
    stampSpec();
    approveSpec();
    const victim = join(root, "victim.md");
    writeFileSync(victim, "# Victim\n");
    execFileSync("ln", ["-sf", victim, join(root, P("1-spec/link.md"))]);
    assert.throws(() => rp(root, "stamp", P("1-spec/link.md"), "--mirror"), /symlinked/);
    // A cyclic folder symlink never aborts the walk.
    execFileSync("ln", ["-s", "..", join(root, P("1-spec/loop"))]);
    const parsed = parseFrontmatter(read(root, "1-spec/spec.md"));
    parsed.data.get("pins").unshift("1-spec/loop@aaaaaaaaaaaa");
    registered("1-spec/spec.md", Object.fromEntries(parsed.data), parsed.body);
    configure({ targetPhase: 1 });
    let output = check(root);
    assert.match(output, /symlink\s+1-spec\/link\.md\n/);
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "with symlinks");
    output = check(root, "--ref", "demo");
    assert.match(output, /symlink\s+1-spec\/loop\n/);
    assert.match(output, /frontier symlink 1-spec\/link\.md/);
    execFileSync("ln", ["-s", "1-spec", join(root, PIPELINE, "alias")]);
    assert.throws(() => rp(root, "stamp", P("alias/spec.md"), "--mirror"), /symlinked/);
  });

  test("the CLI validates its inputs and fails aloud: no gate is silently disabled, no option silently ignored", () => {
    stampSpec();
    approveSpec();
    for (const bad of ["0", "5", "abc", "1.5", "-1"]) {
      configure({ targetPhase: bad });
      assert.throws(() => check(root), /target-phase must be an integer from 1 to 4/);
    }
    configure({ targetPhase: 1 });
    assert.throws(() => check(root, "--force"), /option --force is not allowed/);
    assert.throws(() => check(root, "--assign", "verdict=garbage"), /check: option --assign is not allowed/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--json"), /stamp: option --json is not allowed/);
    assert.throws(() => rp(root, "check", PIPELINE, "extra"), /unexpected positional argument/);
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin"), /--pin expects a value/);
    for (const invalid of [".pipelines/bad_name", ".pipelines/bad..name", ".pipelines/-bad"]) {
      mkdirSync(join(root, invalid, "0-intent"), { recursive: true });
      writeFileSync(join(root, invalid, "0-intent/intent.md"), "# Intent\n");
      assert.throws(() => rp(root, "check", invalid), /pipeline slug must be a valid git ref without _/);
    }
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier complete/);
  });

  test("--help defines body identity and recorded run configuration", () => {
    const help = rp(root, "--help");
    assert.match(help, /first 12 hexadecimal characters of\ngit's blob hash of every body byte/);
    assert.match(help, /run-config\.md supplies the workflow, target phase, base branch,\nand named lanes/);
  });

  test("check --json carries the state", () => {
    configure({ body: "Models and owner directions.\n" });
    const state = JSON.parse(rp(root, "check", PIPELINE, "--json"));
    for (const key of ["pipeline", "challenges", "claims", "lanes", "artifacts", "tasks", "counters", "frontier", "completeThrough", "complete"]) {
      assert.ok(key in state, `missing ${key}`);
    }
    assert.equal("targetPhase" in state, false);
    assert.deepEqual(state.configuration, { workflow: "autonomous", targetPhase: 4, base: "main", lanes: [] });
  });
});
