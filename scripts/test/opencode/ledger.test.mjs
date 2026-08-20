import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatAttribution,
  formatTitle,
  lookupSpawn,
  parseTitle,
  recordSpawn,
  resolveCurrentSpawn,
} from "../../../opencode/plugin.mjs";

describe("recordSpawn / lookupSpawn", () => {
  test("looking up a recorded spawn by session ID returns its entry", () => {
    recordSpawn("ses_lookup_1", {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    assert.deepEqual(lookupSpawn("ses_lookup_1"), {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
  });

  test("looking up a session ID that was never recorded returns nothing", () => {
    assert.equal(lookupSpawn("ses_never_recorded"), undefined);
  });
});

describe("resolveCurrentSpawn (latest-wins per name)", () => {
  test("a re-spawn under the same name supersedes the older entry as current, while the old session ID stays individually resolvable", () => {
    const name = "spec-reviewer-latest-wins";
    recordSpawn("ses_respawn_old", {
      name,
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    recordSpawn("ses_respawn_new", {
      name,
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    assert.deepEqual(resolveCurrentSpawn(name), {
      sessionID: "ses_respawn_new",
      name,
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    assert.deepEqual(lookupSpawn("ses_respawn_old"), {
      name,
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
  });

  test("a name that was never recorded resolves to nothing", () => {
    assert.equal(resolveCurrentSpawn("never-spawned-name"), undefined);
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

describe("formatTitle / parseTitle", () => {
  test("round-trips run and name through the durable title format", () => {
    const title = formatTitle({
      run: "144-opencode-support",
      name: "spec-lead",
    });

    assert.equal(title, "rp:144-opencode-support:spec-lead");
    assert.deepEqual(parseTitle(title), {
      run: "144-opencode-support",
      name: "spec-lead",
    });
  });

  test("parsing a title without the rp: prefix returns nothing", () => {
    assert.equal(parseTitle("some-other-title"), undefined);
  });
});
