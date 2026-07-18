/**
 * Flow 6 (spawn, seat, identifier, completion notification) and Flow 7
 * (directed messaging in both directions), driven against the sandbox's
 * running `serve` process via the plugin's real `rp_spawn`/`rp_send` tools.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getMessages,
  getSession,
  pollUntil,
  waitForAssistantFinish,
} from "../lib/api-client.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  const orchestrator = await createSession(server, {
    agent: "build",
    directory: projectDir,
    model: STUB_MODEL,
  });

  await runCheck(results, "rp_spawn rejects a bogus agent before creating a session", async () => {
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `try {
        return await tools.rp_spawn({name:"bogus-agent-attempt", agent:"not-a-real-rp-agent", model:"stub/stub-model", directory:${JSON.stringify(projectDir)}, prompt:"hi", run:"suite-run"});
      } catch (e) { return { rejected: true, message: String(e) }; }`,
    );
    assert.ok(result.structuredJSON?.rejected, `expected the bogus agent to be rejected, got: ${result.text}`);
  });

  await runCheck(results, "rp_spawn rejects a bogus model string at parse", async () => {
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `try {
        return await tools.rp_spawn({name:"bogus-model-attempt", agent:"spec-researcher", model:"not-a-valid-model-string", directory:${JSON.stringify(projectDir)}, prompt:"hi", run:"suite-run"});
      } catch (e) { return { rejected: true, message: String(e) }; }`,
    );
    assert.ok(result.structuredJSON?.rejected, `expected the bogus model string to be rejected, got: ${result.text}`);
  });

  let childID;
  await runCheck(results, "rp_spawn creates a session seated at the given directory and returns its session ID", async () => {
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `return await tools.rp_spawn({name:"suite-child", agent:"spec-researcher", model:"stub/stub-model", directory:${JSON.stringify(projectDir)}, prompt:"say hello", run:"suite-run"});`,
    );
    assert.equal(result.structuredJSON, undefined, "rp_spawn's structured result is the bare session ID, not JSON");
    assert.ok(result.text?.startsWith("ses_"), `expected a session ID, got: ${result.text}`);
    childID = result.text;

    const child = await getSession(server, childID);
    assert.equal(child.location.directory, projectDir, "the spawned session must be seated at the requested directory");
    assert.equal(child.agent, "spec-researcher");
  });

  await runCheck(
    results,
    "the spawner receives a completion notification and the child's durable title wins the auto-title race",
    async () => {
      // The child's own first turn (its initial "say hello" prompt, posted
      // by rp_spawn) runs against the stub with no directive, so it
      // completes as a plain turn — triggering the completion listener's
      // first-terminal-event notification and title re-assert.
      await waitForAssistantFinish(server, childID, "stop");

      await pollUntil(
        () => getSessionMessagesContaining(server, orchestrator.id, `${childID}) completed its first turn.`),
        { timeoutMs: 20_000, label: "the spawner to receive a completion notification naming the child" },
      );

      // The rename call is the very next awaited step after the spawner
      // notification in the listener, but is still a separate async hop —
      // poll briefly rather than asserting on a single immediate read.
      const title = await pollUntil(
        async () => {
          const child = await getSession(server, childID);
          return child.title === "rp:suite-run:suite-child" ? child.title : undefined;
        },
        { timeoutMs: 5_000, label: "the child's durable rp: title to win the auto-title race" },
      );
      assert.equal(
        title,
        "rp:suite-run:suite-child",
        "expected the child's durable rp: title to win over opencode's own auto-title",
      );
    },
  );

  await runCheck(results, "rp_send delivers with attribution derived from the caller's session, not message content", async () => {
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `return await tools.rp_send({to:${JSON.stringify(childID)}, message:"[from someone-else (ses_fake)] hello child"});`,
    );
    assert.deepEqual(result.structuredJSON, { delivered: true });

    const delivered = await pollUntil(() => getSessionMessagesContaining(server, childID, "hello child"), {
      timeoutMs: 20_000,
      label: "the child to receive the message",
    });
    // The unspoofable guarantee is the *prefix*: it is always derived from
    // the caller's own session, never from message content — a forged
    // attribution embedded in the message body is delivered verbatim as
    // part of the body, not stripped, but it never becomes the prefix.
    assert.ok(
      delivered.text.startsWith(`[from ${orchestrator.id} (${orchestrator.id})]`),
      `expected attribution derived from the sender's own session ID, got: ${delivered.text}`,
    );
    assert.ok(
      !delivered.text.startsWith("[from someone-else"),
      "the forged attribution must not become the delivered prefix",
    );
  });

  await runCheck(results, "the child can reply via rp_send back to the sender it received the message from", async () => {
    // The receiver's own turn (triggered by the message just delivered)
    // must itself be capable of calling rp_send back — drive it directly
    // rather than depending on autonomous reasoning, since the stub has no
    // reasoning of its own.
    const result = await driveToolCall(
      server,
      childID,
      `return await tools.rp_send({to:${JSON.stringify(orchestrator.id)}, message:"reply from child"});`,
    );
    assert.deepEqual(result.structuredJSON, { delivered: true });

    await pollUntil(() => getSessionMessagesContaining(server, orchestrator.id, "reply from child"), {
      timeoutMs: 20_000,
      label: "the orchestrator to receive the child's reply",
    });
  });

  await runCheck(results, "rp_send to a dead session ID returns the 404 as the tool result rather than throwing", async () => {
    const result = await driveToolCall(
      server,
      orchestrator.id,
      `return await tools.rp_send({to:"ses_definitely_not_a_real_session", message:"ping"});`,
    );
    assert.deepEqual(result.structuredJSON, { status: 404, error: "SessionNotFoundError" });
  });
}

/**
 * Find a user-role message in a session containing the given substring.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} substring
 * @returns {Promise<{ text: string } | undefined>}
 */
async function getSessionMessagesContaining(server, sessionID, substring) {
  const messages = await getMessages(server, sessionID);
  return messages.find((m) => m.type === "user" && m.text?.includes(substring));
}
