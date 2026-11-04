import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Invalid, parseThread, turnOf } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { NOTES, SPEC, check, frontier, lane, pipeline, thread, useRepo, write } from "./fixture.mjs";

const NAME = "1-implementer-spec-producer-spec.md";
const HEADER = "status: open\nopener: implementer\nowner: spec-producer\nartifact: 1-spec/spec.md\n";
const MESSAGE = "## implementer — abc1234\n\nspec-requirement-2 has no observed input.\n";
const valid = `${HEADER}\n${MESSAGE}`;
const rejects = (name, body, reason) => assert.throws(() => parseThread(name, body), (error) => error instanceof Invalid && reason.test(error.message));

describe("thread parsing", () => {
  it("reads the header and the messages", () => {
    const body = `${HEADER.replace("open", "disagreement")}lane: x\nterritory: owner\n\n# Title\n\n${MESSAGE}\n## spec-producer — 0123456789abcdef0123456789abcdef01234567\n\nStands: observed.\n`;
    assert.throws(() => parseThread(NAME, body), /lane: is required on a reviewer's thread and only there/);
    const reviewer = body.replace(/implementer/g, "reviewer");
    assert.deepEqual(parseThread("1-reviewer-spec-producer-spec.md", reviewer), {
      number: 1, status: "disagreement", opener: "reviewer", owner: "spec-producer", artifact: SPEC, lane: "x", territory: "owner",
      messages: [{ author: "reviewer", commit: "abc1234" }, { author: "spec-producer", commit: "0123456789abcdef0123456789abcdef01234567" }],
    });
  });

  it("accepts CRLF line endings and every status", () => {
    for (const status of ["open", "closed: approved", "closed: withdrawn", "disagreement"])
      assert.equal(parseThread(NAME, valid.replace("open", status).replace(/\n/g, "\r\n")).status, status);
  });

  it("ignores ## lines inside fenced code", () => {
    const body = `${valid}\n\`\`\`md\n## not a message\n\`\`\`\n\n~~~~\n## spec-producer - nope\n~~~~\n`;
    assert.equal(parseThread(NAME, body).messages.length, 1);
  });

  const malformed = [
    ["a file name without number", "implementer-spec-producer-spec.md", valid, /file name/],
    ["a file name not matching opener and owner", "1-spec-producer-implementer-spec.md", valid, /file name must be 1-implementer-spec-producer-/],
    ["a file name without artifact part", "1-implementer-spec-producer-.md", valid, /file name/],
    ["a missing status line", NAME, valid.replace("status: open\n", ""), /line 1 must be status/],
    ["header lines out of order", NAME, valid.replace("opener: implementer\nowner: spec-producer\n", "owner: spec-producer\nopener: implementer\n"), /line 2 must be opener/],
    ["a missing artifact line", NAME, valid.replace("artifact: 1-spec/spec.md\n", ""), /line 4 must be artifact/],
    ["an unknown status", NAME, valid.replace("status: open", "status: closed"), /status must be one of/],
    ["an unknown role", NAME, valid.replace("opener: implementer", "opener: spec-reviewer"), /opener must be one of/],
    ["opener equal to owner", "1-spec-producer-spec-producer-spec.md", valid.replace("opener: implementer", "opener: spec-producer"), /must differ/],
    ["an artifact that is not addressable", NAME, valid.replace("artifact: 1-spec/spec.md", "artifact: 1-spec/lanes/a/spec.md"), /artifact must be/],
    ["an owner that does not own the artifact", NAME, valid.replace("artifact: 1-spec/spec.md", `artifact: ${NOTES}`), /owner of 3-implementation\/notes.md is implementer/],
    ["a reviewer's thread without lane", "1-reviewer-spec-producer-spec.md", valid.replace(/implementer/g, "reviewer"), /lane: is required/],
    ["a malformed lane", "1-reviewer-spec-producer-spec.md", valid.replace(/implementer/g, "reviewer").replace("spec.md\n", "spec.md\nlane: Security\n"), /lane must match/],
    ["a territory other than owner", NAME, valid.replace("spec.md\n", "spec.md\nterritory: agents\n"), /territory must be owner/],
    ["an extra header line", NAME, valid.replace("spec.md\n", "spec.md\nround: 2\n"), /header must end with a blank line/],
    ["a header not followed by a blank line", NAME, `${HEADER}${MESSAGE}`, /header must end with a blank line/],
    ["no message", NAME, `${HEADER}\nFindings without heading.\n`, /no message/],
    ["a first message by the owner", NAME, valid.replace("## implementer", "## spec-producer"), /first message must be the opener's/],
    ["a message by a third role", NAME, `${valid}\n## reviewer — abc1234\n`, /author must be the opener or the owner/],
    ["a heading without commit", NAME, `${valid}\n## spec-producer\n`, /message heading must be/],
    ["a heading with a hyphen instead of an em dash", NAME, `${valid}\n## spec-producer - abc1234\n`, /message heading must be/],
    ["a heading with a non-hex commit", NAME, `${valid}\n## spec-producer — main\n`, /message heading must be/],
  ];
  for (const [what, name, body, reason] of malformed) it(`rejects ${what}`, () => rejects(name, body, reason));
});

describe("thread turn", () => {
  const base = { opener: "implementer", owner: "spec-producer", territory: null };
  const cases = [
    ["open", ["implementer"], null, "owner"],
    ["open", ["implementer", "spec-producer"], null, "opener"],
    ["open", ["implementer", "spec-producer", "implementer"], "owner", "owner"],
    ["disagreement", ["implementer", "spec-producer"], null, "opener"],
    ["disagreement", ["implementer"], null, "owner"],
    ["disagreement", ["implementer", "spec-producer"], "owner", "escalation"],
    ["closed: approved", ["implementer"], "owner", null],
    ["closed: withdrawn", ["implementer", "spec-producer"], null, null],
  ];
  for (const [status, authors, territory, turn] of cases)
    it(`${status}${territory ? " on owner territory" : ""} after ${authors.at(-1)} is ${turn ?? "nobody's"}`, () => {
      assert.equal(turnOf({ ...base, status, territory, messages: authors.map((author) => ({ author, commit: "abc1234" })) }), turn);
    });
});

describe("threads in a pipeline", () => {
  useRepo();
  const invalidPaths = () => frontier().filter((line) => line.startsWith("INVALID"));

  it("rejects two threads with the same number", () => {
    pipeline(3);
    thread("1-implementer-spec-producer-spec.md", { opener: "implementer", owner: "spec-producer", artifact: SPEC });
    thread("1-design-doc-producer-spec-producer-spec.md", { opener: "design-doc-producer", owner: "spec-producer", artifact: SPEC });
    assert.deepEqual(invalidPaths(), ["INVALID threads/1-implementer-spec-producer-spec.md"]);
  });

  it("rejects a review lane that is not configured", () => {
    pipeline(3, { lanes: [lane("reviewer", "security")] });
    thread("1-reviewer-implementer-notes.md", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" });
    assert.deepEqual(invalidPaths(), ["INVALID threads/1-reviewer-implementer-notes.md"]);
  });

  const reviewedCases = [
    ["a reviewer's approved thread without reviewed", { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review" }, true],
    ["reviewed on an open reviewer's thread", { opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", frontmatter: { reviewed: "0".repeat(40) } }, true],
    ["reviewed on another role's approved thread", { status: "closed: approved", opener: "implementer", owner: "spec-producer", artifact: SPEC, frontmatter: { reviewed: "0".repeat(40) } }, true],
    ["reviewed that is not a patch id", { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", frontmatter: { reviewed: "abc" } }, true],
    ["any other frontmatter key", { opener: "implementer", owner: "spec-producer", artifact: SPEC, frontmatter: { inputs: [] } }, true],
    ["another role's approved thread without reviewed", { status: "closed: approved", opener: "implementer", owner: "spec-producer", artifact: SPEC }, false],
    ["a reviewer's approved thread with reviewed", { status: "closed: approved", opener: "reviewer", owner: "implementer", artifact: NOTES, lane: "review", frontmatter: { reviewed: "0".repeat(40) } }, false],
  ];
  for (const [what, fields, isInvalid] of reviewedCases)
    it(`${isInvalid ? "rejects" : "accepts"} ${what}`, () => {
      pipeline(3);
      thread(`1-${fields.opener}-${fields.owner}-x.md`, fields);
      assert.deepEqual(invalidPaths(), isInvalid ? [`INVALID threads/1-${fields.opener}-${fields.owner}-x.md`] : []);
    });

  it("reports each thread with whom it awaits", () => {
    pipeline(3);
    thread("1-implementer-spec-producer-spec.md", { opener: "implementer", owner: "spec-producer", artifact: SPEC, messages: [["implementer", "aaaaaaa"], ["spec-producer", "bbbbbbb"]] });
    write("threads/notes.txt", "not a thread\n");
    assert.deepEqual(check().threads, [{
      path: "threads/1-implementer-spec-producer-spec.md", status: "open", opener: "implementer", owner: "spec-producer", artifact: SPEC,
      lane: null, territory: null, awaits: "implementer", reviewed: null,
    }]);
  });
});
