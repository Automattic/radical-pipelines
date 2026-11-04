import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Invalid, awaitedRole, isReview, parseThread } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { REVIEW, TO_SPEC, check, frontier, lane, pipeline, thread, useRepo, write } from "./fixture.mjs";

const REVIEWERS = ["reviewer-default"];
const NAME = "1-implementer-spec-producer-spec.md";
const HEADER = "status: open\nopener: implementer\nowner: spec-producer\nartifact: spec\n";
const MESSAGE = "## implementer — abc1234\n\nspec-requirement-2 has no observed input.\n";
const valid = `${HEADER}\n${MESSAGE}`;
const parse = (name, body) => parseThread(name, body, REVIEWERS);
const rejects = (name, body, reason) => assert.throws(() => parse(name, body), (error) => error instanceof Invalid && reason.test(error.message));

describe("thread parsing", () => {
  it("reads the header and the messages", () => {
    const body = `${HEADER}\n# Title\n\n${MESSAGE}\n## spec-producer — 0123456789abcdef0123456789abcdef01234567\n\nStands: observed.\n\n## owner — abcdef0\n`;
    assert.deepEqual(parse(NAME, body), {
      number: 1, status: "open", opener: "implementer", owner: "spec-producer", artifact: "spec",
      messages: [{ author: "implementer", commit: "abc1234" }, { author: "spec-producer", commit: "0123456789abcdef0123456789abcdef01234567" }, { author: "owner", commit: "abcdef0" }],
    });
  });

  for (const [owner, artifact] of [["owner", "intent"], ["spec-producer", "spec"], ["design-doc-producer", "design-doc"], ["implementer", "implementation"]])
    it(`pairs ${owner} with ${artifact}`, () => {
      const status = owner === "owner" ? "disagreement" : "open";
      const name = `1-reviewer-default-${owner}-${artifact}.md`;
      const body = `status: ${status}\nopener: reviewer-default\nowner: ${owner}\nartifact: ${artifact}\n\n## reviewer-default — abc1234\n`;
      assert.equal(parse(name, body).artifact, artifact);
    });

  it("accepts CRLF line endings and every status of a thread to a role", () => {
    for (const status of ["open", "closed: approved", "closed: withdrawn"])
      assert.equal(parse(NAME, valid.replace("open", status).replace(/\n/g, "\r\n")).status, status);
  });

  it("ignores ## lines inside fenced code", () => {
    const body = `${valid}\n\`\`\`md\n## not a message\n\`\`\`\n\n~~~~\n## spec-producer - nope\n~~~~\n`;
    assert.equal(parse(NAME, body).messages.length, 1);
  });

  const toOwner = (status) => `status: ${status}\nopener: implementer\nowner: owner\nartifact: intent\n\n${MESSAGE}`;
  const malformed = [
    ["a file name without number", "implementer-spec-producer-spec.md", valid, /file name/],
    ["a file name not matching the header", "1-implementer-spec-producer-design-doc.md", valid, /file name must be 1-implementer-spec-producer-spec\.md/],
    ["a missing status line", NAME, valid.replace("status: open\n", ""), /line 1 must be status/],
    ["header lines out of order", NAME, valid.replace("opener: implementer\nowner: spec-producer\n", "owner: spec-producer\nopener: implementer\n"), /line 2 must be opener/],
    ["a missing artifact line", NAME, valid.replace("artifact: spec\n", ""), /line 4 must be artifact/],
    ["a fifth header line", NAME, valid.replace("artifact: spec\n", "artifact: spec\nlane: x\n"), /header must end with a blank line/],
    ["a header not followed by a blank line", NAME, `${HEADER}${MESSAGE}`, /header must end with a blank line/],
    ["an unknown status", NAME, valid.replace("status: open", "status: closed"), /status must be one of/],
    ["an artifact path instead of a token", NAME, valid.replace("artifact: spec", "artifact: 1-spec/spec.md"), /artifact must be one of/],
    ["an owner that does not own the artifact", NAME, valid.replace("artifact: spec", "artifact: implementation"), /owner of implementation is implementer/],
    ["an unknown opener", "1-spec-reviewer-spec-producer-spec.md", valid.replace("opener: implementer", "opener: spec-reviewer"), /opener must be one of/],
    ["a reviewer of an unconfigured lane", "1-reviewer-x-spec-producer-spec.md", valid.replace(/implementer/g, "reviewer-x"), /opener must be one of/],
    ["owner as opener", "1-owner-spec-producer-spec.md", valid.replace(/implementer/g, "owner"), /opener must be one of/],
    ["opener equal to owner", "1-spec-producer-spec-producer-spec.md", valid.replace(/implementer/g, "spec-producer"), /must differ/],
    ["disagreement on a thread to a role", NAME, valid.replace("open", "disagreement"), /statuses of a thread to owner/],
    ["closed: answered on a thread to a role", NAME, valid.replace("open", "closed: answered"), /statuses of a thread to owner/],
    ["open on a thread to owner", "1-implementer-owner-intent.md", toOwner("open"), /statuses of a thread to owner/],
    ["closed: withdrawn on a thread to owner", "1-implementer-owner-intent.md", toOwner("closed: withdrawn"), /statuses of a thread to owner/],
    ["no message", NAME, `${HEADER}\nFindings without heading.\n`, /no message/],
    ["a first message by the owner", NAME, valid.replace("## implementer", "## spec-producer"), /first message must be the opener's/],
    ["a message by a third role", NAME, `${valid}\n## reviewer-default — abc1234\n`, /author must be the opener, the owner, or owner/],
    ["a heading without commit", NAME, `${valid}\n## spec-producer\n`, /message heading must be/],
    ["a heading with a hyphen instead of an em dash", NAME, `${valid}\n## spec-producer - abc1234\n`, /message heading must be/],
    ["a heading with a non-hex commit", NAME, `${valid}\n## spec-producer — main\n`, /message heading must be/],
  ];
  for (const [what, name, body, reason] of malformed) it(`rejects ${what}`, () => rejects(name, body, reason));

  it("accepts disagreement and closed: answered on a thread to owner", () => {
    for (const status of ["disagreement", "closed: answered"]) assert.equal(parse("1-implementer-owner-intent.md", toOwner(status)).status, status);
  });
});

describe("awaited role", () => {
  const base = { opener: "implementer", owner: "spec-producer" };
  const cases = [
    ["open", ["implementer"], "spec-producer"],
    ["open", ["implementer", "spec-producer"], "implementer"],
    ["open", ["implementer", "spec-producer", "implementer"], "spec-producer"],
    ["open", ["implementer", "owner"], "spec-producer"],
    ["closed: approved", ["implementer"], null],
    ["closed: withdrawn", ["implementer", "spec-producer"], null],
    ["closed: answered", ["implementer"], null],
    ["disagreement", ["implementer"], null],
  ];
  for (const [status, authors, role] of cases)
    it(`${status} after ${authors.join(", ")} awaits ${role ?? "nobody"}`, () => {
      assert.equal(awaitedRole({ ...base, status, messages: authors.map((author) => ({ author, commit: "abc1234" })) }), role);
    });

  it("a review thread is a reviewer's thread to the implementer", () => {
    assert.equal(isReview({ opener: "reviewer-a", owner: "implementer" }), true);
    assert.equal(isReview({ opener: "reviewer-a", owner: "spec-producer" }), false);
    assert.equal(isReview({ opener: "design-doc-producer", owner: "implementer" }), false);
  });
});

describe("threads in a pipeline", () => {
  useRepo();
  const invalidPaths = () => frontier().filter((line) => line.startsWith("INVALID"));

  it("accepts threads that share a number with different openers", () => {
    pipeline(3);
    thread(TO_SPEC);
    thread({ ...REVIEW(), owner: "spec-producer", artifact: "spec" });
    assert.deepEqual(invalidPaths(), []);
  });

  it("accepts the reviewer role of each configured review lane and no other", () => {
    pipeline(3, { lanes: [lane("reviewer", "security")] });
    thread({ opener: "reviewer-security", owner: "implementer", artifact: "implementation" });
    thread({ n: 2, ...REVIEW("default") });
    assert.deepEqual(invalidPaths(), ["INVALID threads/2-reviewer-default-implementer-implementation.md"]);
  });

  const reviewedCases = [
    ["a review thread closed approved without reviewed", { status: "closed: approved", ...REVIEW() }, true],
    ["reviewed on an open review thread", { ...REVIEW(), frontmatter: { reviewed: "0".repeat(40) } }, true],
    ["reviewed on a reviewer's approved thread to another owner", { status: "closed: approved", ...REVIEW(), owner: "spec-producer", artifact: "spec", frontmatter: { reviewed: "0".repeat(40) } }, true],
    ["reviewed on another role's approved thread", { status: "closed: approved", ...TO_SPEC, frontmatter: { reviewed: "0".repeat(40) } }, true],
    ["reviewed that is not a patch id", { status: "closed: approved", ...REVIEW(), frontmatter: { reviewed: "abc" } }, true],
    ["any other frontmatter key", { ...TO_SPEC, frontmatter: { inputs: [] } }, true],
    ["another role's approved thread without reviewed", { status: "closed: approved", ...TO_SPEC }, false],
    ["a reviewer's approved thread to another owner without reviewed", { status: "closed: approved", ...REVIEW(), owner: "spec-producer", artifact: "spec" }, false],
    ["a review thread closed approved with reviewed", { status: "closed: approved", ...REVIEW(), frontmatter: { reviewed: "0".repeat(40) } }, false],
  ];
  for (const [what, fields, isInvalid] of reviewedCases)
    it(`${isInvalid ? "rejects" : "accepts"} ${what}`, () => {
      pipeline(3);
      const path = thread(fields);
      assert.deepEqual(invalidPaths(), isInvalid ? [`INVALID ${path}`] : []);
    });

  it("reports each thread with the role it awaits", () => {
    pipeline(3);
    thread({ ...TO_SPEC, messages: [["design-doc-producer", "aaaaaaa"], ["spec-producer", "bbbbbbb"]] });
    write("threads/notes.txt", "not a thread\n");
    assert.deepEqual(check().threads, [{
      path: "threads/1-design-doc-producer-spec-producer-spec.md", status: "open", opener: "design-doc-producer", owner: "spec-producer", artifact: "spec",
      awaits: "design-doc-producer", reviewed: null,
    }]);
  });
});
