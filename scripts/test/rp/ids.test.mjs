import assert from "node:assert/strict";
import { appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { identity, parseFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { git, P, write, read, rp, root, standard, configure, check, SPEC, review, pairs, registered, registeredVerdict, stampSpec, approveSpec, stampDesign, approveDesign, report, proposal, useFixture } from "./fixture.mjs";

describe("rp id declarations and history", () => {
  useFixture();

  // A line opening with an id the artifact declares is its declaration, `<id>: <text>`, whatever
  // the file recorded before; an id it originates occurs only once declared, now or at an earlier
  // stamp; a longer token or a fenced line declares nothing.
  const FORMS = {
    declaration: [(id) => `${id}: Item.\n`, null],
    "declaration with content": [(id) => `${id}: Item.\n\nDetail.\n\n- A point.\n`, null],
    bullet: [(id) => `- ${id}: Item.\n`, /INVALID IDS/],
    numbered: [(id) => `1. ${id} — Item.\n`, /INVALID IDS/],
    heading: [(id) => `## ${id}: Item\n`, /INVALID IDS/],
    "bold paragraph": [(id) => `**${id} — Item.** Detail.\n`, /INVALID IDS/],
    italic: [(id) => `_${id}_: Item.\n`, /INVALID IDS/],
    code: [(id) => `\`${id}\`: Item.\n`, /INVALID IDS/],
    indented: [(id) => `  ${id}: Item.\n`, /INVALID IDS/],
    "extra space": [(id) => `${id}:  Item.\n`, /INVALID IDS/],
    "without text": [(id) => `${id}:\n`, /INVALID IDS/],
    mention: [(id) => `See ${id}.\n`, /INVALID IDS/, /INVALID TARGET/],
    "cited by path": [(id, artifact) => `See ${artifact}#${id}.\n`, /INVALID TARGET/],
    "longer token": [(id) => `${id}-old: Former item.\n`, /INVALID TARGET/],
    fenced: [(id) => `\`\`\`markdown\n${id}: Item.\n\`\`\`\n`, /INVALID TARGET/],
  };
  // Every form, fresh and recorded, on one target; every artifact's vocabulary accepted and rejected.
  const TARGETS = [
    ["1-spec/spec.md", "spec-requirement-1"],
    ["0-intent/intent.md", "intent-constraint-1"],
    ["1-spec/spec.md", "spec-acceptance-criterion-1"],
    ["1-spec/spec.md", "spec-assumption-1"],
    ["2-design-doc/design-doc.md", "design-doc-decision-1"],
    ["2-design-doc/design-doc.md", "design-doc-assumption-1"],
    ["3-build/build-plan.md", "build-assumption-1"],
    ["4-document/document-plan.md", "document-assumption-1"],
  ];
  const DECLARATIONS = [
    ...Object.keys(FORMS).flatMap((form) => [false, true].map((recorded) => [TARGETS[0], form, recorded])),
    ...TARGETS.slice(1).flatMap((target) => ["declaration", "bullet"].map((form) => [target, form, false])),
  ];
  for (const [[artifact, id], form, recorded] of DECLARATIONS)
    test(`target declaration: ${artifact}#${id}, ${form}${recorded ? ", recorded" : ""}`, () => {
      const [body, fresh, recordedError = fresh] = FORMS[form];
      const target = `${artifact}#${id}`, claim = "1-spec/spec-review-1.md";
      const error = recorded ? recordedError : fresh;
      if (recorded) registered(artifact, { ids: [id] }, `# Artifact\n\n${body(id, artifact)}`);
      else write(root, artifact, `# Artifact\n\n${body(id, artifact)}`);
      write(root, claim, `# Review\n\nverdict: unsatisfiable\ntarget: ${target}\n`);
      if (!error) {
        rp(root, "stamp", P(claim), "--mirror");
        assert.deepEqual(parseFrontmatter(read(root, claim)).data.get("target"), [target]);
      } else assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), error);
    });

  test("the first intent stamp records only declared item ids, preserving body identity", () => {
    const intent = "0-intent/intent.md";
    registered(intent, { origin: "issue 7", ids: undefined }, "origin: issue 7\n\n# Intent\n\n## Goal\n\nSee intent-constraint-1.\n\n## Constraints\n\nintent-constraint-1: Boundary.\n\n## Context\n\nintent-context-1: Motivation.\n\n## Proposals\n\nintent-proposal-1: Direction.\n\n```markdown\nintent-constraint-2: Example.\n```\n");
    const before = identity(read(root, intent));
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, `stamp ${intent}`);
    assert.deepEqual(state.artifacts, []);
    rp(root, "stamp", P(intent));
    const { data } = parseFrontmatter(read(root, intent));
    assert.deepEqual(data.get("ids"), ["intent-constraint-1", "intent-context-1", "intent-proposal-1"]);
    assert.equal(data.has("retired-ids"), false);
    assert.equal(identity(read(root, intent)), before);
  });

  // Every artifact keeps the history of the ids it originates, numbered per kind.
  const ORIGINATED = [
    ["0-intent/intent.md", "intent", "constraint"], ["1-spec/spec.md", "spec", "requirement"],
    ["2-design-doc/design-doc.md", "design-doc", "decision"], ["3-build/build-plan.md", "build", "assumption"],
    ["4-document/document-plan.md", "document", "assumption"],
  ];
  const KINDS = [
    ["0-intent/intent.md", "intent", "context"], ["0-intent/intent.md", "intent", "proposal"],
    ["1-spec/spec.md", "spec", "acceptance-criterion"], ["1-spec/spec.md", "spec", "assumption"],
    ["2-design-doc/design-doc.md", "design-doc", "assumption"],
  ];
  const HISTORY = [
    ...ORIGINATED.flatMap((kind) => ["retire", "reuse", "add", "skip"].map((change) => [kind, change])),
    ...KINDS.map((kind) => [kind, "skip"]),
  ];
  for (const [[artifact, prefix, kind], change] of HISTORY)
    test(`id history: ${artifact} ${kind}, ${change}`, () => {
      const id = (n) => `${prefix}-${kind}-${n}`;
      const seen = [id(1), id(2)];
      const retired = change === "retire" ? [id(1)] : [id(2)];
      const items = change === "retire" ? `See ${id(2)}.\n`
        : `${id(1)}: Kept.\n${id({ reuse: 2, add: 3, skip: 4 }[change])}: Added.\n`;
      const fields = artifact === "0-intent/intent.md" ? { origin: "issue 7" } : {};
      registered(artifact, { ...fields, "ids": seen, "retired-ids": retired }, `# Artifact\n\n## Goal\n\nOriginal.\n\n${items}`);
      const before = read(root, artifact);
      const invalid = change === "reuse" ? /retired id .* is declared again/
        : change === "skip" ? new RegExp(`${id(3)} is missing`) : null;
      if (invalid) {
        assert.throws(() => rp(root, "stamp", P(artifact), "--mirror"), new RegExp(`INVALID IDS ${artifact}: .*${invalid.source}`));
        assert.equal(read(root, artifact), before);
        const state = JSON.parse(check(root, "--json"));
        assert.equal(state.frontier, `INVALID IDS ${artifact}`);
        assert.deepEqual(state.artifacts, []);
        assert.deepEqual(state.claims, []);
      } else {
        rp(root, "stamp", P(artifact), "--mirror");
        const stamped = read(root, artifact), { data } = parseFrontmatter(stamped);
        assert.deepEqual(data.get("ids"), change === "add" ? [...seen, id(3)] : seen);
        assert.deepEqual(data.get("retired-ids") ?? [], change === "retire" ? seen : retired);
        assert.equal(identity(stamped), identity(before));
        assert.deepEqual(JSON.parse(check(root, "--json")).contradictions, []);
        rp(root, "stamp", P(artifact));
        assert.equal(read(root, artifact), stamped);
      }
    });

  test("a body that declares an id twice is invalid", () => {
    write(root, "1-spec/spec.md", "# Spec\n\nspec-requirement-1: One.\nspec-requirement-1: Again.\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--mirror"), /INVALID IDS 1-spec\/spec\.md: spec-requirement-1 is declared more than once/);
    assert.match(check(root), /frontier INVALID IDS 1-spec\/spec\.md/);
  });

  // An assumption keeps its id downstream: carried with its id from the upstream artifact, beside the artifact's own.
  for (const [artifact, prefix, upstream] of [["2-design-doc/design-doc.md", "design-doc", "1-spec/spec.md"], ["3-build/build-plan.md", "build", "2-design-doc/design-doc.md"], ["4-document/document-plan.md", "document", "3-build/build-plan.md"]])
    for (const [form, declared, invalid] of [
      ["carried", ["spec-assumption-2"], null],
      ["carried after the upstream retired it", ["spec-assumption-3"], null],
      ["carried beside its own", ["spec-assumption-1", "OWN-1"], null],
      ["own only", ["OWN-1", "OWN-2"], null],
      ["never declared upstream", ["spec-assumption-4"], "spec-assumption-4 is not declared by UPSTREAM"],
      ["closed before the upstream", ["design-doc-assumption-9"], "design-doc-assumption-9 is not declared by UPSTREAM"],
      ["skipping its own", ["OWN-2"], "OWN-1 is missing"],
    ].filter(([form]) => form !== "closed before the upstream" || prefix !== "design-doc"))
      test(`carried assumptions: ${artifact}, ${form}`, () => {
        const own = (s) => s.replace(/OWN/g, `${prefix}-assumption`).replace(/UPSTREAM/g, upstream);
        const items = (ids) => ids.map((id) => `${id}: Claim.\n`).join("");
        // Upstream of every artifact: spec-assumption-1..3 originated by the spec; 3 retired downstream.
        for (const path of ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md"]) {
          if (path === artifact) break;
          const origin = path === "1-spec/spec.md";
          const carried = ["spec-assumption-1", "spec-assumption-2", "spec-assumption-3"];
          registered(path, { ids: carried, "retired-ids": origin ? [] : ["spec-assumption-3"] }, `# Artifact\n\n${items(origin ? carried : carried.slice(0, 2))}`);
        }
        const ids = declared.map(own);
        write(root, artifact, `# Artifact\n\n${items(ids)}`);
        if (!invalid) {
          rp(root, "stamp", P(artifact), "--mirror");
          assert.deepEqual(parseFrontmatter(read(root, artifact)).data.get("ids"), ids);
          assert.doesNotMatch(check(root), /INVALID IDS/);
        } else {
          assert.throws(() => rp(root, "stamp", P(artifact), "--mirror"), new RegExp(`INVALID IDS ${artifact}: ${own(invalid)}`));
          assert.match(check(root), new RegExp(`frontier INVALID IDS ${artifact}`));
        }
      });

  // A plan declares its tasks by their files: numbered from 1, never reused once retired.
  for (const [phase, prefix] of [["3-build", "build"], ["4-document", "document"]])
    for (const [form, files, invalid] of [
      ["one task", ["1"], null],
      ["two tasks", ["1", "2"], null],
      ["a gap", ["1", "3"], `${prefix}-task-2 is missing`],
      ["from two", ["2"], `${prefix}-task-1 is missing`],
    ])
      test(`task ids: ${phase}, ${form}`, () => {
        const plan = `${phase}/${prefix === "build" ? "build-plan" : "document-plan"}.md`;
        for (const n of files) write(root, `${phase}/tasks/${prefix}-task-${n}.md`, `# ${prefix}-task-${n}: work\n\ndepends-on: none\n`);
        write(root, plan, "# Plan\n");
        if (!invalid) {
          rp(root, "stamp", P(plan), "--mirror");
          assert.deepEqual(parseFrontmatter(read(root, plan)).data.get("ids"), files.map((n) => `${prefix}-task-${n}`));
          assert.doesNotMatch(check(root), /INVALID IDS/);
        } else {
          assert.throws(() => rp(root, "stamp", P(plan), "--mirror"), new RegExp(`INVALID IDS ${plan}: ${invalid}`));
          assert.match(check(root), new RegExp(`frontier INVALID IDS ${plan}`));
        }
      });

  test("a retired task id is never reused", () => {
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1: first\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/build-plan.md"), "--mirror");
    rmSync(join(root, P("3-build/tasks/build-task-1.md")));
    rp(root, "stamp", P("3-build/build-plan.md"), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, "3-build/build-plan.md")).data.get("retired-ids"), ["build-task-1"]);
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1: again\n\ndepends-on: none\n");
    assert.throws(() => rp(root, "stamp", P("3-build/build-plan.md"), "--mirror"), /INVALID IDS 3-build\/build-plan\.md: retired id build-task-1 is declared again/);
  });

  test("a new task file makes a recorded plan's ids stale", () => {
    write(root, "3-build/tasks/build-task-1.md", "# build-task-1: first\n\ndepends-on: none\n");
    rp(root, "stamp", P("3-build/build-plan.md"), "--mirror");
    write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: none\n", false);
    assert.match(check(root), /mirror\s+3-build\/build-plan\.md\s+differs from the body: ids[\s\S]*frontier stamp 3-build\/build-plan\.md/);
  });

  test("a misnamed file in a plan's tasks folder is invalid", () => {
    write(root, "4-document/document-plan.md", "# Plan\n");
    write(root, "4-document/tasks/build-task-1-report-1.md", "# Report\noutcome: completed\n");
    assert.throws(() => rp(root, "stamp", P("4-document/tasks/build-task-1-report-1.md"), "--mirror"), /INVALID IDS 4-document\/tasks\/build-task-1-report-1\.md: build-task-1-report-1\.md is not a document task or its report/);
    assert.match(check(root), /frontier INVALID IDS 4-document\/tasks\/build-task-1-report-1\.md/);
  });

  test("a record keeps the history of its questions", () => {
    const record = "1-spec/spec-research.md";
    write(root, record, "# Research\n\nspec-question-1: First?\n");
    rp(root, "stamp", P(record), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, record)).data.get("ids"), ["spec-question-1"]);
    registered(record, { ...Object.fromEntries(parseFrontmatter(read(root, record)).data) }, "# Research\n");
    rp(root, "stamp", P(record), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, record)).data.get("retired-ids"), ["spec-question-1"]);
    registered(record, { ...Object.fromEntries(parseFrontmatter(read(root, record)).data), ids: ["spec-question-1"] }, "# Research\n\nspec-question-1: Another?\n");
    assert.throws(() => rp(root, "stamp", P(record), "--mirror"), /INVALID IDS 1-spec\/spec-research\.md: retired id spec-question-1 is declared again/);
  });

  test("a prior finding names a review of its phase that declares the finding", () => {
    write(root, "1-spec/spec-review-1.md", "# Review\n\nverdict: rejected\n\nspec-finding-1: Gap\n");
    rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror");
    write(root, "1-spec/spec-review-2.md", "# Review\n\nverdict: rejected\nprior-finding: 1-spec/spec.md#spec-finding-1, resolution failed\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror"), /INVALID prior-finding: expected <an earlier review of this kind>#<finding id of its phase>/);
    write(root, "1-spec/spec-review-2.md", "# Review\n\nverdict: rejected\nprior-finding: 1-spec/spec-review-1.md#spec-finding-2, resolution failed\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror"), /INVALID PRIOR FINDING 1-spec\/spec-review-1\.md#spec-finding-2: the review declares no such finding/);
    for (const value of ["1-spec/spec-review-2.md#spec-finding-1", "1-spec/spec-review-3.md#spec-finding-1", "1-spec/../1-spec/spec-review-1.md#spec-finding-1", "1-spec/build-review-1.md#spec-finding-1"]) {
      write(root, "1-spec/spec-review-2.md", `# Review\n\nverdict: rejected\nprior-finding: ${value}, resolution failed\n`);
      assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror"), /INVALID prior-finding: expected <an earlier review of this kind>/);
    }
    write(root, "1-spec/spec-review-2.md", "# Review\n\nverdict: rejected\nprior-finding: 1-spec/spec-review-1.md#spec-finding-1, resolution failed\n");
    rp(root, "stamp", P("1-spec/spec-review-2.md"), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, "1-spec/spec-review-2.md")).data.get("prior-finding"), ["1-spec/spec-review-1.md#spec-finding-1"]);
  });

  test("a review's wave is a canonical positive number", () => {
    stampSpec();
    registered("1-spec/spec-review-01.md", { verdict: "approved", reviewed: pairs(SPEC) }, "# Review\n\nverdict: approved\n");
    registered("1-spec/spec-review-0.md", { verdict: "rejected", reviewed: pairs(SPEC) }, "# Review\n\nverdict: rejected\n");
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier review wave 1-spec\/spec\.md/);
  });

  test("a non-Markdown file in a tasks folder is outside the tree", () => {
    write(root, "3-build/tasks/notes.txt", "scratch\n");
    assert.match(rp(root, "stamp", P("3-build/tasks/notes.txt"), "--mirror"), /nothing to mirror/);
    assert.doesNotMatch(check(root), /INVALID IDS/);
  });

  test("a task target is declared by its file, under its phase's prefix", () => {
    write(root, "3-build/tasks/build-task-1.md", "# Any heading\n\ndepends-on: none\n");
    write(root, "4-document/tasks/build-task-1.md", "# build-task-1\n\ndepends-on: none\n");
    write(root, "4-document/document-plan.md", "# Plan\n");
    assert.throws(() => proposal("4-document/document-plan.md#build-task-1"), /INVALID TARGET 4-document\/document-plan\.md#build-task-1/);
    proposal("3-build/build-plan.md#build-task-1");
    write(root, "4-document/tasks/build-task-1-report-1.md", "# Report\noutcome: completed\n");
    assert.deepEqual(JSON.parse(check(root, "--json")).tasks["4-document"] ?? null, null);
  });

  test("a review of a phase without tasks stamps beside stray files in its tasks folder", () => {
    write(root, "1-spec/tasks/build-task-9.md", "# Historical input\n");
    stampSpec();
    approveSpec();
    configure({ targetPhase: 1 });
    assert.match(check(root), /frontier complete/);
  });

  for (const [rel, prefix, word] of [["1-spec/spec-review-1.md", "spec", "finding"], ["2-design-doc/design-doc-research.md", "design-doc", "question"]])
    for (const [form, ids, invalid] of [
      ["numbered", [1, 2], null],
      ["a gap", [1, 3], `${prefix}-${word}-2 is missing`],
      ["twice", [1, 1], `${prefix}-${word}-1 is declared more than once`],
      ["another phase's", null, null],
    ])
      test(`${word}s in ${rel}: ${form}`, () => {
        const items = ids ? ids.map((n) => `${prefix}-${word}-${n}: Entry\n`).join("") : `build-${word}-1: Entry\n`;
        write(root, rel, `# File\n\n${word === "finding" ? "verdict: approved\n" : ""}\n${items}`);
        if (invalid) assert.throws(() => rp(root, "stamp", P(rel), "--mirror"), new RegExp(`INVALID IDS ${rel}: ${invalid}`));
        else rp(root, "stamp", P(rel), "--mirror");
        const output = check(root);
        if (invalid) assert.match(output, new RegExp(`INVALID IDS ${rel}: ${invalid}`));
        else assert.doesNotMatch(output, /INVALID IDS/);
      });

  test("ids and retired-ids are recorded on an artifact with history only", () => {
    registered("1-spec/spec-review-1.md", { verdict: "approved", "ids": ["spec-finding-1"] }, "# Review\n\nverdict: approved\n\nspec-finding-1: Entry\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror"), /INVALID FRONTMATTER.*recorded ids/);
  });

  test("a prior finding names a finding of the review's phase", () => {
    write(root, "1-spec/spec-review-1.md", "# Review\n\nverdict: rejected\nprior-finding: 1-spec/spec-review-1.md#build-finding-1, resolution failed\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/spec-review-1.md"), "--mirror"), /INVALID prior-finding: expected <an earlier review of this kind>#<finding id of its phase>/);
  });

  test("a lane artifact declares ids like its root", () => {
    configure({ lanes: [standard.a] });
    write(root, "1-spec/a/spec.md", "# Spec\n\nspec-requirement-2: Second only.\n");
    assert.throws(() => rp(root, "stamp", P("1-spec/a/spec.md"), "--mirror"), /INVALID IDS 1-spec\/a\/spec\.md: spec-requirement-1 is missing/);
    write(root, "1-spec/a/spec.md", "# Spec\n\nspec-requirement-1: First.\n");
    rp(root, "stamp", P("1-spec/a/spec.md"), "--mirror");
    assert.deepEqual(parseFrontmatter(read(root, "1-spec/a/spec.md")).data.get("ids"), ["spec-requirement-1"]);
  });

  for (const kind of ["constraint", "context", "proposal"])
    for (const change of ["add", "retire"])
      for (const stamped of [false, true])
        test(`intent history projection: ${kind}, ${change}, ${stamped ? "stamped" : "unstamped"}`, () => {
          const intent = "0-intent/intent.md";
          const before = [`intent-${kind}-1`, ...(change === "retire" ? [`intent-${kind}-2`] : [])];
          const current = [`intent-${kind}-1`, ...(change === "add" ? [`intent-${kind}-2`] : [])];
          registered(intent, {
            origin: "issue 7",
            "ids": stamped ? [`intent-${kind}-1`, `intent-${kind}-2`] : before,
            "retired-ids": stamped && change === "retire" ? [`intent-${kind}-2`] : [],
          }, `origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n${current.map((id) => `${id}: Item.\n`).join("")}`);
          registered("1-spec/spec.md", { pins: pairs([intent]) });
          registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
          const recorded = read(root, intent);
          configure({ targetPhase: 1 });
          const state = JSON.parse(check(root, "--json"));
          assert.equal(read(root, intent), recorded);
          if (stamped) {
            assert.equal(state.frontier, "complete");
            assert.deepEqual(state.contradictions, []);
            assert.equal(state.artifacts[0].approved, true);
          } else {
            assert.equal(state.frontier, `stamp ${intent}`);
            assert.equal(state.contradictions[0].path, intent);
            assert.deepEqual(state.artifacts, []);
            assert.deepEqual(state.claims, []);
            assert.deepEqual(state.challenges, []);
            assert.deepEqual(state.lanes, []);
            assert.deepEqual(state.tasks, {});
          }
        });

  for (const change of ["add", "retire"])
    test(`intent history projection at a ref: unstamped ${change}`, () => {
      const intent = "0-intent/intent.md";
      const ids = ["intent-constraint-1", "intent-constraint-2"];
      registered(intent, { origin: "issue 7", "ids": change === "add" ? ids.slice(0, 1) : ids }, `origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n${(change === "add" ? ids : ids.slice(0, 1)).map((id) => `${id}: Item.\n`).join("")}`);
      registered("1-spec/spec.md", { pins: pairs([intent]) });
      registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
      configure({ targetPhase: 1 });
      git(root, "add", "-A");
      git(root, "commit", "--quiet", "-m", "intent body awaiting stamp");
      const ref = git(root, "rev-parse", "HEAD").trim();
      rp(root, "stamp", P(intent));
      configure({ targetPhase: 1 });
      assert.equal(JSON.parse(check(root, "--json")).frontier, "complete");
      const state = JSON.parse(check(root, "--ref", ref, "--json"));
      assert.equal(state.frontier, `stamp ${intent}`);
      assert.deepEqual(state.artifacts, []);
    });

  test("intent history projection compares id sets independently of list and body order", () => {
    const intent = "0-intent/intent.md";
    registered(intent, {
      origin: "issue 7", "ids": ["intent-constraint-3", "intent-context-1", "intent-constraint-2", "intent-constraint-1"], "retired-ids": ["intent-constraint-2", "intent-constraint-3"],
    }, "origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\nintent-constraint-1: Kept.\nintent-context-1: Kept.\n");
    registered("1-spec/spec.md", { pins: pairs([intent]) });
    registeredVerdict("1-spec/spec-review-1.md", pairs(SPEC));
    configure({ targetPhase: 1 });
    const state = JSON.parse(check(root, "--json"));
    assert.equal(state.frontier, "complete");
    assert.deepEqual(state.contradictions, []);
  });

  for (const [label, fields] of [
    ["scalar seen ids", { "ids": "intent-constraint-1" }],
    ["scalar retired ids", { "ids": ["intent-constraint-1"], "retired-ids": "intent-constraint-1" }],
    ["invalid id", { "ids": ["intent-constraint-0"] }],
    ["duplicate seen id", { "ids": ["intent-constraint-1", "intent-constraint-1"] }],
    ["duplicate retired id", { "ids": ["intent-constraint-1"], "retired-ids": ["intent-constraint-1", "intent-constraint-1"] }],
    ["unseen retired id", { "ids": ["intent-constraint-1"], "retired-ids": ["intent-constraint-2"] }],
  ])
    test(`invalid intent id history stops stamp and check: ${label}`, () => {
      const intent = "0-intent/intent.md";
      registered(intent, { origin: "issue 7", ...fields });
      assert.throws(() => rp(root, "stamp", P(intent), "--mirror"), /INVALID FRONTMATTER/);
      const state = JSON.parse(check(root, "--json"));
      assert.equal(state.frontier, `INVALID FRONTMATTER ${intent}`);
      assert.deepEqual(state.artifacts, []);
    });

  test("a retired id remains invalid at a ref and when a new claim tries to land", () => {
    const intent = "0-intent/intent.md", claim = "1-spec/spec-review-1.md";
    registered(intent, { origin: "issue 7", "ids": ["intent-constraint-1"], "retired-ids": ["intent-constraint-1"] }, "origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal.\n\n## Constraints\n\nintent-constraint-1: Reused.\n");
    git(root, "add", "-A");
    git(root, "commit", "--quiet", "-m", "recorded invalid intent");
    const ref = git(root, "rev-parse", "HEAD").trim();
    write(root, claim, "# Review\n\nverdict: unsatisfiable\ntarget: 0-intent/intent.md#intent-constraint-1\n");
    assert.throws(() => rp(root, "stamp", P(claim), "--mirror"), /INVALID IDS.*retired id intent-constraint-1/);
    const state = JSON.parse(check(root, "--ref", ref, "--json"));
    assert.equal(state.frontier, `INVALID IDS ${intent}`);
    assert.deepEqual(state.claims, []);
  });

  test("landed proposal resolves after its target id is removed", () => {
    stampSpec();
    approveSpec();
    proposal();
    registered("1-spec/spec.md", { ...Object.fromEntries(parseFrontmatter(read(root, "1-spec/spec.md")).data), ids: ["spec-requirement-1", "spec-requirement-2"], "retired-ids": ["spec-requirement-1"] }, "# Spec\n\nspec-requirement-2: New requirement.\n");
    rp(root, "stamp", P("0-intent/proposal-1.md"), "--mirror");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("0-intent/proposal-1.md"));
    review("1-spec/spec-review-2.md", "approved", [...SPEC, "0-intent/proposal-1.md"]);
    configure({ targetPhase: 1 });
    const output = check(root);
    assert.match(output, /challenge .*spec\.md#spec-requirement-1\s+resolved/);
    assert.doesNotMatch(output, /INVALID TARGET/);
  });

  test("spec and design assumptions are valid targets when their ids exist", () => {
    write(root, "1-spec/spec.md", "# Spec\n\nspec-requirement-1: Requirement.\nspec-assumption-1: Assumption.\n");
    write(root, "2-design-doc/design-doc.md", "# Design doc\n\ndesign-doc-decision-1: Decision.\ndesign-doc-assumption-1: Assumption.\n");
    rp(root, "stamp", P("2-design-doc/design-doc.md"), "--mirror");
    stampSpec();
    approveSpec();
    proposal("1-spec/spec.md#spec-assumption-1");
    let output = check(root);
    assert.match(output, /challenge .*spec\.md#spec-assumption-1\s+PENDING/);
    write(root, "0-intent/proposal-1.md", "# Proposal 1\n\ntarget: 2-design-doc/design-doc.md#design-doc-assumption-1\norigin: 0-intent/constraint-1.md\n");
    rp(root, "stamp", P("0-intent/proposal-1.md"), "--mirror");
    output = check(root);
    assert.match(output, /challenge .*design-doc\.md#design-doc-assumption-1\s+PENDING/);
  });

  test("a sealed artifact becomes stale when its required package changes membership", () => {
    stampSpec();
    approveSpec();
    stampDesign();
    approveDesign();
    approveSpec(2);
    configure({ targetPhase: 2 });
    const output = check(root);
    assert.match(output, /artifact 2-design-doc\/design-doc\.md\s+STALE — package members/);
    assert.match(output, /frontier converge 2-design-doc\/design-doc\.md/);
  });

  test("every recorded member remains consumed regardless of its filename class", () => {
    write(root, "1-spec/tasks/build-task-9.md", "# Historical input\n");
    rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/tasks/build-task-9.md"));
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+FRESH/);
    appendFileSync(join(root, P("1-spec/tasks/build-task-9.md")), "\nChanged.\n");
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE — package identities: 1-spec\/tasks\/build-task-9\.md/);
  });

  test("an artifact cannot consume its sibling record", () => {
    assert.throws(() => rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec-research.md")), /never pins its sibling record/);
    stampSpec();
    const forged = parseFrontmatter(read(root, "1-spec/spec.md"));
    forged.data.get("pins").push(`1-spec/spec-research.md@${identity(read(root, "1-spec/spec-research.md"))}`);
    registered("1-spec/spec.md", Object.fromEntries(forged.data), forged.body);
    configure({ targetPhase: 1 });
    assert.match(check(root), /artifact 1-spec\/spec\.md\s+STALE — package members/);
  });

  test("challenges and claims beyond the target phase are reported, not the frontier", () => {
    stampSpec();
    approveSpec();
    proposal("2-design-doc/design-doc.md#design-doc-decision-1");
    configure({ targetPhase: 1 });
    const output = check(root);
    assert.match(output, /pending, beyond the target phase/);
    assert.match(output, /frontier complete/);
  });
});
