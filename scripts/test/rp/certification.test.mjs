import assert from "node:assert/strict";
import { symlinkSync } from "node:fs";
import { describe, it } from "node:test";

import { INTENT, NOTES, P, PIPELINE, REVIEW, SPEC, abs, approve, check, commitAll, configure, lane, land, pipeline, remove, rp, run, thread, useRepo, write } from "./fixture.mjs";

const SPEC_CERTIFICATION = `certification/${SPEC}.json`;
const APPROVAL_CERTIFICATION = `certification/threads/1-reviewer-default-implementer-implementation.md.json`;
const certify = (rel, data) => write(rel, typeof data === "string" ? data : JSON.stringify(data));
const PIN = `${INTENT}@0123456789ab`;
const HASH = "1".repeat(40);

describe("a certification that cannot be read stops the command", () => {
  useRepo();

  // [what, how the spec's certification path is made, the reason]
  const structural = [
    ["a symlink", () => { remove(SPEC_CERTIFICATION); symlinkSync("../../0-intent/intent.md", abs(P(SPEC_CERTIFICATION))); }, `${SPEC_CERTIFICATION}: not a regular file`],
    ["a folder where it belongs", () => { remove(SPEC_CERTIFICATION); write(`${SPEC_CERTIFICATION}/x`, "x\n"); }, `${SPEC_CERTIFICATION}: a folder where a certification belongs`],
    ["a file where its folder belongs", () => { remove("certification"); write("certification", "x\n"); }, "certification: a file where a folder belongs"],
  ];
  for (const [what, make, reason] of structural)
    for (const ref of [false, true])
      it(`on ${what}${ref ? " at a ref" : " in the working tree"}`, () => {
        pipeline(1);
        make();
        if (ref) commitAll("broken certification");
        const out = run("check", abs(PIPELINE), ...(ref ? ["--ref", "HEAD"] : []));
        assert.deepEqual([out.status, out.stdout], [1, ""]);
        assert.match(out.stderr, new RegExp(`^rp: cannot read (?:[0-9a-f]+:)?${PIPELINE.replace(".", "\\.")}/${reason.replace(/\./g, "\\.")}\\n$`));
      });

  // [what, the certification it writes, the reason]
  const malformed = [
    ["invalid JSON", [SPEC_CERTIFICATION, "{"], /not valid JSON/],
    ["JSON that is not an object", [SPEC_CERTIFICATION, "[]"], /must be a JSON object/],
    ["a key outside inputs", [SPEC_CERTIFICATION, { inputs: [PIN], "approved-commit": HASH }], /unexpected key: approved-commit/],
    ["no inputs", [SPEC_CERTIFICATION, {}], /missing inputs/],
    ["inputs that are not a list", [SPEC_CERTIFICATION, { inputs: PIN }], /inputs must be a list/],
    ["an ill-formed pin", [SPEC_CERTIFICATION, { inputs: [INTENT] }], /inputs entry must be <path>@<identity>/],
    ["a duplicated pin", [SPEC_CERTIFICATION, { inputs: [PIN, `${INTENT}@0123456789ac`] }], /inputs pins 0-intent\/intent.md twice/],
    ["a pin naming no pinnable path", [SPEC_CERTIFICATION, { inputs: ["notes.txt@0123456789ab"] }], /inputs entry names no pipeline input: notes.txt/],
    ["an approval's without an approved commit", [APPROVAL_CERTIFICATION, { inputs: [PIN] }], /missing approved-commit/],
    ["an approval's approved commit that is no full commit hash", [APPROVAL_CERTIFICATION, { inputs: [PIN], "approved-commit": "abc1234" }], /approved-commit must be a full commit hash/],
  ];
  for (const [what, [path, data], reason] of malformed)
    it(`on ${what}`, () => {
      pipeline(3);
      approve();
      certify(path, data);
      const out = run("check", abs(PIPELINE));
      assert.deepEqual([out.status, out.stdout], [1, ""]);
      assert.match(out.stderr, new RegExp(`^rp: ${PIPELINE.replace(".", "\\.")}/${path.replace(/\./g, "\\.")}: `));
      assert.match(out.stderr, reason);
    });

  it("on a malformed certification at a ref, naming it there", () => {
    pipeline(1);
    certify(SPEC_CERTIFICATION, { inputs: [INTENT] });
    commitAll("malformed certification");
    remove(SPEC_CERTIFICATION);
    const out = run("check", abs(PIPELINE), "--ref", "HEAD");
    assert.deepEqual([out.status, out.stdout], [1, ""]);
    assert.match(out.stderr, new RegExp(`^rp: HEAD:${PIPELINE.replace(".", "\\.")}/certification/1-spec/spec\\.md\\.json: inputs entry must be`));
  });
});

describe("a certification no present file needs", () => {
  useRepo();

  it("is not read: a dropped lane's, left without its candidate, changes no state", () => {
    const lanes = [lane("spec-producer", "a"), lane("spec-producer", "b")];
    pipeline(0, { lanes });
    for (const id of ["a", "b"]) { write(`1-spec/lanes/${id}/spec.md`, `# ${id}\n`); land(`1-spec/lanes/${id}/spec.md`); }
    configure({ lanes: [lanes[0]] });
    remove("1-spec/lanes/b");
    commitAll("drop lane b");
    const before = rp("check", abs(PIPELINE));
    certify("certification/1-spec/lanes/b/spec.md.json", "{ malformed");
    assert.equal(rp("check", abs(PIPELINE)), before);
    assert.deepEqual(check().frontier, [{ action: "consolidate", target: "spec", threads: [] }]);
  });

  it("is not read for a review thread that is no approval", () => {
    pipeline(3);
    thread(REVIEW());
    certify(APPROVAL_CERTIFICATION, "{ malformed");
    assert.deepEqual(check().frontier, [{ action: "respond", target: "implementation", threads: ["threads/1-reviewer-default-implementer-implementation.md"] }]);
  });
});
