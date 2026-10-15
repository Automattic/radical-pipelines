import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  toToolResult,
} from "../../../opencode/plugin.mjs";

describe("toToolResult", () => {
  test("wraps a bare string as output, rendering it verbatim as text content", () => {
    assert.deepEqual(toToolResult("ses_abc123"), {
      output: "ses_abc123",
      content: [{ type: "text", text: "ses_abc123" }],
    });
  });

  test("wraps a plain object as output, rendering its JSON form as text content", () => {
    assert.deepEqual(toToolResult({ delivered: true }), {
      output: { delivered: true },
      content: [{ type: "text", text: JSON.stringify({ delivered: true }) }],
    });
  });

  test("drops undefined-valued keys so output is always a JSON value", () => {
    // opencode validates a tool's output against its declared schema and
    // fails the whole call on a non-JSON value; ledger rows carry `undefined`
    // whenever a session record omits a field.
    const result = toToolResult({ name: "spec-lead", currentTool: undefined, pending: 0 });

    assert.deepEqual(result.output, { name: "spec-lead", pending: 0 });
    assert.ok(!("currentTool" in result.output));
    assert.deepEqual(JSON.parse(result.content[0].text), result.output);
  });

  test("renders a nested undefined the same way in output and content", () => {
    const result = toToolResult({ ledger: [{ sessionID: "ses_1", model: undefined }] });

    assert.deepEqual(result.output, { ledger: [{ sessionID: "ses_1" }] });
    assert.deepEqual(JSON.parse(result.content[0].text), result.output);
  });
});
