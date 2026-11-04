import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DESIGN, INTENT, SPEC, check, frontier, lane, pipeline, read, remove, stamp, useRepo, write } from "./fixture.mjs";

const SPEC_LANES = [lane("spec-producer", "a"), lane("spec-producer", "b"), lane("reviewer", "security")];
const candidate = (id, folder = "1-spec", name = "spec.md") => `${folder}/lanes/${id}/${name}`;
function produce(id, ...pins) {
  write(candidate(id), `# Spec candidate ${id}\n`);
  stamp(candidate(id), ...(pins.length ? pins : [INTENT]));
}

describe("production lanes", () => {
  useRepo();

  it("wake every configured lane of the lowest missing artifact", () => {
    pipeline(0, { lanes: SPEC_LANES });
    assert.deepEqual(frontier(), ["lane 1-spec/a", "lane 1-spec/b"]);
  });

  it("wake only the lanes whose candidate is missing", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    assert.deepEqual(frontier(), ["lane 1-spec/b"]);
  });

  it("wake a lane whose candidate is stale", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    write("0-intent/constraint-1.md", `target: ${SPEC}\n`);
    assert.deepEqual(frontier(), ["lane 1-spec/a", "lane 1-spec/b"]);
    stamp(candidate("a"), INTENT, "0-intent/constraint-1.md");
    assert.deepEqual(frontier(), ["lane 1-spec/b"]);
    assert.deepEqual(check().phases[1].lanes.map((entry) => [entry.id, entry.state]), [["a", "fresh"], ["b", "stale"]]);
  });

  it("consolidate once every candidate exists and is fresh", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    assert.deepEqual(frontier(), [`consolidate ${SPEC}`]);
  });

  it("are done once the root exists: a stale root is responded to, not re-laned", () => {
    pipeline(0, { lanes: SPEC_LANES });
    produce("a");
    produce("b");
    write(SPEC, "# Spec\n");
    stamp(SPEC, INTENT, candidate("a"), candidate("b"));
    assert.deepEqual(frontier(), [`produce ${DESIGN}`]);
    write(INTENT, `${read(INTENT)}More.\n`);
    assert.deepEqual(frontier(), [`respond ${SPEC}`]);
    remove(candidate("b"));
    assert.deepEqual(check().phases[1].lanes.map((entry) => entry.state), ["stale", "missing"]);
  });

  it("apply to the design doc with its own profile", () => {
    pipeline(1, { lanes: [...SPEC_LANES, lane("design-doc-producer", "x")] });
    assert.deepEqual(frontier(), ["lane 2-design-doc/x"]);
    write(candidate("x", "2-design-doc", "design-doc.md"), "# Design candidate\n");
    stamp(candidate("x", "2-design-doc", "design-doc.md"), SPEC);
    assert.deepEqual(frontier(), [`consolidate ${DESIGN}`]);
  });

  it("are not configured by a review lane", () => {
    pipeline(0, { lanes: [lane("reviewer", "a")] });
    assert.deepEqual(frontier(), [`produce ${SPEC}`]);
  });

  it("candidates of a lane not configured for that profile are INVALID", () => {
    pipeline(0, { lanes: [lane("design-doc-producer", "a")] });
    write(candidate("a"), "# C\n");
    assert.deepEqual(frontier(), [`INVALID ${candidate("a")}`]);
  });

  it("files deeper in a lane folder are not pipeline files", () => {
    pipeline(0, { lanes: SPEC_LANES });
    write("1-spec/lanes/a/notes/spec.md", "# scratch\n");
    write("1-spec/lanes/a/evidence.txt", "x\n");
    assert.deepEqual(frontier(), ["lane 1-spec/a", "lane 1-spec/b"]);
  });
});
