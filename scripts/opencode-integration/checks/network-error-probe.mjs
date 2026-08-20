/**
 * Tool-call network-error surfacing: forces a transient network failure
 * inside a tool call (a `webfetch` to an address that cannot resolve) and
 * records what surfaces — the tool's own result and the turn's terminal
 * state — rather than asserting a single predetermined channel. A tool-call
 * failure ordinarily returns an error result to the model and the turn
 * continues, rather than reaching `session.execution.failed`; this probe
 * confirms that observation still holds and that the turn is not left
 * hanging.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, pollMessages, prompt } from "../lib/api-client.mjs";
import { nativeToolPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  await runCheck(
    results,
    "a tool-call network failure surfaces in the tool's own result and the turn completes rather than hanging",
    async () => {
      const session = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });

      // `.invalid` is reserved (RFC 2606) to never resolve — a fast,
      // deterministic DNS failure rather than a slow connect-timeout.
      await prompt(
        server,
        session.id,
        nativeToolPrompt("webfetch", { url: "http://rp-suite-unroutable.invalid/", format: "text" }),
      );

      // The turn must reach a terminal state either way (the "does not
      // hang" half of the observation); any finish reason is an
      // acceptable outcome for a tool-level failure.
      const messages = await pollMessages(
        server,
        session.id,
        (msgs) => (msgs.some((m) => m.type === "assistant" && m.finish !== undefined) ? msgs : undefined),
        { timeoutMs: 20_000, label: "the turn to reach a terminal state after the tool-call network failure" },
      );

      const toolCall = messages
        .flatMap((m) => m.content ?? [])
        .find((part) => part.type === "tool" && part.name === "webfetch");
      assert.ok(toolCall, "expected the webfetch tool call to appear in the session's messages");

      // Record what the tool call's own result shows — the channel the
      // design record identifies as the fallback observable when no
      // execution-level event fires.
      const toolText = toolCall.state?.content?.[0]?.text ?? "";
      const sawErrorInToolResult = /error|fail|resolve|enotfound|dns/i.test(toolText);
      assert.ok(
        toolCall.state?.status === "error" || sawErrorInToolResult,
        `expected the tool call's own result to reflect the network failure (status/content), got status=${toolCall.state?.status} content=${toolText.slice(0, 200)}`,
      );
    },
  );
}
