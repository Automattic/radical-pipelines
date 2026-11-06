import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Invalid, awaitedRole, isReview, parseRole, parseThread } from "../../../skills/radical-pipelines/scripts/rp.mjs";
import { REVIEW, TO_SPEC, check, frontier, lane, pipeline, thread as writeThread, useRepo, write } from "./fixture.mjs";

const NAME = "1-implementer-spec-producer-spec.md";
const HEADER = "status: open\nopener: implementer\nowner: spec-producer\nartifact: spec\n";
const MESSAGE = "## implementer — abc1234\n\nspec-requirement-2 has no observed input.\n";
const thread = (header, body = MESSAGE) => `---\n${header}---\n\n${body}`;
const valid = thread(HEADER);
const parse = (name, contents) => parseThread(name, contents);
const rejects = (name, contents, reason) => assert.throws(() => parse(name, contents), (error) => error instanceof Invalid && reason.test(error.message));

describe("thread parsing", () => {
  it("reads the frontmatter and the messages", () => {
    const contents = thread(HEADER, `# Title\n\n${MESSAGE}\n## spec-producer — 0123456789abcdef0123456789abcdef01234567\n\nStands: observed.\n\n## owner — abcdef0\n`);
    assert.deepEqual(parse(NAME, contents), {
      number: 1, status: "open", opener: "implementer", owner: "spec-producer", artifact: "spec",
      messages: [{ author: "implementer", commit: "abc1234" }, { author: "spec-producer", commit: "0123456789abcdef0123456789abcdef01234567" }, { author: "owner", commit: "abcdef0" }],
    });
  });

  it("reads the values from the frontmatter alone, whatever the body says", () => {
    const contents = thread("status: approved\nopener: implementer\nowner: spec-producer\nartifact: spec\n", `status: open\nopener: reviewer-a\n\n${MESSAGE}`);
    assert.deepEqual([parse(NAME, contents).status, parse(NAME, contents).opener], ["approved", "implementer"]);
  });

  for (const [owner, artifact] of [["owner", "intent"], ["spec-producer", "spec"], ["design-doc-producer", "design-doc"], ["implementer", "implementation"]])
    it(`pairs ${owner} with ${artifact}`, () => {
      const status = owner === "owner" ? "disagreement" : "open";
      const name = `1-reviewer-default-${owner}-${artifact}.md`;
      const cites = owner === "owner" ? "cites: threads/1-reviewer-default-implementer-implementation.md\n" : "";
      const contents = thread(`status: ${status}\nopener: reviewer-default\nowner: ${owner}\nartifact: ${artifact}\n${cites}`, "## reviewer-default — abc1234\n");
      assert.equal(parse(name, contents).artifact, artifact);
    });

  it("accepts CRLF line endings and every status of a thread to a role", () => {
    for (const status of ["open", "approved", "withdrawn"])
      assert.equal(parse(NAME, valid.replace("open", status).replace(/\n/g, "\r\n")).status, status);
  });

  it("ignores ## lines inside fenced code", () => {
    const contents = `${valid}\n\`\`\`md\n## not a message\n\`\`\`\n\n~~~~\n## spec-producer - nope\n~~~~\n`;
    assert.equal(parse(NAME, contents).messages.length, 1);
  });

  const CITES = "cites: threads/1-implementer-spec-producer-spec.md\n";
  const toOwner = (status, cites = CITES) => thread(`status: ${status}\nopener: implementer\nowner: owner\nartifact: intent\n${cites}`);
  const malformed = [
    ["a file name without number", "implementer-spec-producer-spec.md", valid, /file name/],
    ["a file name not matching the frontmatter", "1-implementer-spec-producer-design-doc.md", valid, /file name must be 1-implementer-spec-producer-spec\.md/],
    ["the values as body lines, without frontmatter", NAME, `${HEADER}\n${MESSAGE}`, /^frontmatter has no status$/],
    ["a missing status", NAME, valid.replace("status: open\n", ""), /^frontmatter has no status$/],
    ["a missing artifact", NAME, valid.replace("artifact: spec\n", ""), /^frontmatter has no artifact$/],
    ["another key", NAME, valid.replace("artifact: spec\n", "artifact: spec\nlane: x\n"), /^unexpected frontmatter key: lane$/],
    ["an unknown status", NAME, valid.replace("status: open", "status: closed"), /status must be one of/],
    ["an artifact path instead of a token", NAME, valid.replace("artifact: spec", "artifact: 1-spec/spec.md"), /artifact must be one of/],
    ["an owner that does not own the artifact", NAME, valid.replace("artifact: spec", "artifact: implementation"), /owner of implementation is implementer\[-<lane>\]/],
    ["an unknown opener", "1-spec-reviewer-spec-producer-spec.md", valid.replace("opener: implementer", "opener: spec-reviewer"), /opener must be a role/],
    ["a reviewer without lane", "1-reviewer-spec-producer-spec.md", valid.replace(/implementer/g, "reviewer"), /opener must be a role/],
    ["an implementer with a lane", "1-implementer-a-spec-producer-spec.md", valid.replace(/implementer/g, "implementer-a"), /opener must be a role/],
    ["a malformed lane", "1-reviewer-A-spec-producer-spec.md", valid.replace(/implementer/g, "reviewer-A"), /opener must be a role/],
    ["an unknown owner", NAME.replace("spec-producer", "spec-writer"), valid.replace("owner: spec-producer", "owner: spec-writer"), /owner must be a role/],
    ["a lane owner of another profile's artifact", "1-implementer-design-doc-producer-a-spec.md", valid.replace("owner: spec-producer", "owner: design-doc-producer-a"), /owner of spec is spec-producer\[-<lane>\]/],
    ["owner as opener", "1-owner-spec-producer-spec.md", valid.replace(/implementer/g, "owner"), /owner opens no thread/],
    ["opener equal to owner", "1-spec-producer-spec-producer-spec.md", valid.replace(/implementer/g, "spec-producer"), /must differ/],
    ["disagreement on a thread to a role", NAME, valid.replace("open", "disagreement"), /statuses of a thread to owner/],
    ["answered on a thread to a role", NAME, valid.replace("open", "answered"), /statuses of a thread to owner/],
    ["open on a thread to owner", "1-implementer-owner-intent.md", toOwner("open"), /statuses of a thread to owner/],
    ["withdrawn on a thread to owner", "1-implementer-owner-intent.md", toOwner("withdrawn"), /statuses of a thread to owner/],
    ["a thread to owner without cites", "1-implementer-owner-intent.md", toOwner("disagreement", ""), /a thread to owner names in cites/],
    ["a thread to owner with an empty cites", "1-implementer-owner-intent.md", toOwner("disagreement", "cites: \n"), /a thread to owner names in cites/],
    ["cites on a thread to a role", NAME, valid.replace("artifact: spec\n", `artifact: spec\n${CITES}`), /cites is only on a thread to owner/],
    ["no message", NAME, thread(HEADER, "Findings without heading.\n"), /no message/],
    ["a first message by the owner", NAME, valid.replace("## implementer", "## spec-producer"), /first message must be the opener's/],
    ["a message by a third role", NAME, `${valid}\n## reviewer-default — abc1234\n`, /author must be the opener, the owner, or owner/],
    ["a heading without commit", NAME, `${valid}\n## spec-producer\n`, /message heading must be/],
    ["a heading with a hyphen instead of an em dash", NAME, `${valid}\n## spec-producer - abc1234\n`, /message heading must be/],
    ["a heading with a non-hex commit", NAME, `${valid}\n## spec-producer — main\n`, /message heading must be/],
  ];
  for (const [what, name, body, reason] of malformed) it(`rejects ${what}`, () => rejects(name, body, reason));

  it("accepts disagreement and answered on a thread to owner, with what it cites", () => {
    for (const status of ["disagreement", "answered"]) {
      const parsed = parse("1-implementer-owner-intent.md", toOwner(status));
      assert.deepEqual([parsed.status, parsed.cites, parsed.messages.length], [status, "threads/1-implementer-spec-producer-spec.md", 1]);
    }
  });
});

describe("thread roles", () => {
  const roles = [
    ["owner", { profile: "owner", lane: null }],
    ["implementer", { profile: "implementer", lane: null }],
    ["spec-producer", { profile: "spec-producer", lane: null }],
    ["design-doc-producer", { profile: "design-doc-producer", lane: null }],
    ["spec-producer-a", { profile: "spec-producer", lane: "a" }],
    ["design-doc-producer-fast-1", { profile: "design-doc-producer", lane: "fast-1" }],
    ["reviewer-security", { profile: "reviewer", lane: "security" }],
    ["reviewer", null],
    ["reviewer-", null],
    ["reviewer--x", null],
    ["implementer-a", null],
    ["owner-a", null],
    ["orchestrator", null],
  ];
  for (const [role, parsed] of roles) it(`${role} is ${parsed ? `${parsed.profile}${parsed.lane ? ` lane ${parsed.lane}` : ""}` : "not a role"}`, () => assert.deepEqual(parseRole(role), parsed));

  it("production lane owners of closed threads pair with their profile's artifact", () => {
    const contents = thread("status: withdrawn\nopener: design-doc-producer\nowner: design-doc-producer-a\nartifact: design-doc\n", "## design-doc-producer — abc1234\n");
    assert.equal(parse("1-design-doc-producer-design-doc-producer-a-design-doc.md", contents).owner, "design-doc-producer-a");
  });
});

describe("awaited role", () => {
  const base = { opener: "implementer", owner: "spec-producer" };
  const cases = [
    ["open", ["implementer"], "spec-producer"],
    ["open", ["implementer", "spec-producer"], "implementer"],
    ["open", ["implementer", "spec-producer", "implementer"], "spec-producer"],
    ["open", ["implementer", "owner"], "spec-producer"],
    ["approved", ["implementer"], null],
    ["withdrawn", ["implementer", "spec-producer"], null],
    ["answered", ["implementer"], null],
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
    writeThread(TO_SPEC);
    writeThread({ ...REVIEW(), owner: "spec-producer", artifact: "spec" });
    assert.deepEqual(invalidPaths(), []);
  });

  it("accepts a reviewer of a lane that is not configured", () => {
    pipeline(3, { lanes: [lane("reviewer", "security")] });
    writeThread({ opener: "reviewer-security", owner: "implementer", artifact: "implementation" });
    writeThread({ n: 2, ...REVIEW("gone"), status: "withdrawn" });
    assert.deepEqual(invalidPaths(), []);
  });

  it("reports each thread with the role it awaits", () => {
    pipeline(3);
    writeThread({ ...TO_SPEC, messages: [["design-doc-producer", "aaaaaaa"], ["spec-producer", "bbbbbbb"]] });
    write("threads/notes.txt", "not a thread\n");
    assert.deepEqual(check().threads, [{
      path: "threads/1-design-doc-producer-spec-producer-spec.md", status: "open", opener: "design-doc-producer", owner: "spec-producer", artifact: "spec",
      awaits: "design-doc-producer", reviewed: null,
    }]);
  });
});
