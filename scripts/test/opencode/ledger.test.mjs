import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatAttribution,
  lookupSpawn,
  recordSpawn,
  spawnIdentity,
} from "../../../opencode/plugin.mjs";

describe("recordSpawn / lookupSpawn", () => {
  test("looking up a recorded spawn by session ID returns its entry", () => {
    recordSpawn("ses_lookup_1", {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    assert.deepEqual(lookupSpawn("ses_lookup_1"), {
      name: "spec-lead",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
  });

  test("looking up a session ID that was never recorded returns nothing", () => {
    assert.equal(lookupSpawn("ses_never_recorded"), undefined);
  });
});

describe("formatAttribution", () => {
  test("builds the unspoofable delivered-message prefix from the resolved sender", () => {
    assert.equal(
      formatAttribution({ name: "spec-lead", sessionID: "ses_x" }),
      "[from spec-lead (ses_x)]",
    );
  });
});

describe("spawnIdentity", () => {
  const identity = { name: "spec-lead", pipelineSlug: "144-opencode-support", spawner: "ses_orchestrator" };

  test("reads the identity rp_spawn stored in the session's metadata, whatever the title", () => {
    assert.deepEqual(
      spawnIdentity({ id: "ses_meta", title: "An automatic title", metadata: { rp: identity, other: 1 } }),
      identity,
    );
  });

  for (const [label, metadata] of [
    ["no metadata", undefined],
    ["null metadata", null],
    ["metadata without an rp key", { other: { name: "x" } }],
  ]) {
    test(`a session with ${label} carries no identity`, () => {
      assert.equal(spawnIdentity({ id: "ses_plain", metadata }), undefined);
    });
  }

  for (const [label, rp] of [
    ["a null identity", null],
    ["a missing name", { pipelineSlug: "p", spawner: "ses_s" }],
    ["a missing pipeline slug", { name: "n", spawner: "ses_s" }],
    ["a missing spawner", { name: "n", pipelineSlug: "p" }],
    ["a non-string field", { name: 1, pipelineSlug: "p", spawner: "ses_s" }],
  ]) {
    test(`RP metadata with ${label} is an error, not an absent identity`, () => {
      assert.throws(() => spawnIdentity({ id: "ses_bad", metadata: { rp } }), /ses_bad carries malformed RP metadata/);
    });
  }
});
