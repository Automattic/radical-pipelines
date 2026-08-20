import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseModelString } from "../../../opencode/plugin.mjs";

describe("parseModelString", () => {
  test("parses provider/model with the default variant", () => {
    assert.deepEqual(parseModelString("provider/model"), {
      providerID: "provider",
      id: "model",
      variant: "default",
    });
  });

  test("parses provider/model#variant with the explicit variant", () => {
    assert.deepEqual(parseModelString("provider/model#variant"), {
      providerID: "provider",
      id: "model",
      variant: "variant",
    });
  });

  test("preserves a model id containing slashes beyond the provider segment", () => {
    assert.deepEqual(parseModelString("openrouter/anthropic/claude-3-opus"), {
      providerID: "openrouter",
      id: "anthropic/claude-3-opus",
      variant: "default",
    });
  });

  test("preserves slashes in the model id together with an explicit variant", () => {
    assert.deepEqual(
      parseModelString("openrouter/anthropic/claude-3-opus#thinking"),
      {
        providerID: "openrouter",
        id: "anthropic/claude-3-opus",
        variant: "thinking",
      },
    );
  });

  test("rejects a string with no provider/model separator at all", () => {
    assert.throws(() => parseModelString("model-without-provider"));
  });

  test("rejects a string with an empty provider segment", () => {
    assert.throws(() => parseModelString("/model"));
  });

  test("rejects a string with an empty model segment", () => {
    assert.throws(() => parseModelString("provider/"));
  });

  test("rejects an empty string", () => {
    assert.throws(() => parseModelString(""));
  });
});
