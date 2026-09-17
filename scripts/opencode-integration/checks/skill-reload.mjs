/**
 * Skill reload across a context checkpoint, driven against the sandbox's
 * running `serve` process: a session activates the skill and reads a
 * convention file, is compacted, is then told to load them again, and once
 * it does the instruction stops — observed in the requests the stub
 * provider actually receives.
 */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  pollMessages,
  prompt,
  request,
  waitForIdle,
} from "../lib/api-client.mjs";

/** The text of every message of `role` in one recorded chat request. */
function roleText(chatRequest, role) {
  return chatRequest.messages
    .filter((message) => message.role === role)
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : (message.content ?? []).map((part) => part.text ?? "").join("\n"),
    )
    .join("\n");
}

/** The agent-turn request (tools offered) carrying `nonce` in its user text. */
function turnRequest(chatRequests, nonce) {
  return chatRequests.find((chatRequest) => chatRequest.tools.length > 0 && roleText(chatRequest, "user").includes(nonce));
}

/**
 * Run every check in this group.
 *
 * @param {{ server: object, stub: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, stub, projectDir, results } = ctx;
  const conventionsPath = join(projectDir, ".rp.md");
  let sessionID;

  await runCheck(results, "skill reload: the checkpoint summary request of a session that activated the skill asks for the pipeline run section", async () => {
    writeFileSync(conventionsPath, "---\nconventions: 2\n---\n\n# RP_STUB_CONVENTIONS\n");
    const session = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });
    sessionID = session.id;

    const activation = await driveToolCall(server, sessionID, "skill", { id: "radical-pipelines" });
    assert.equal(activation.error, undefined, `skill activation failed: ${activation.error?.message}`);
    const read = await driveToolCall(server, sessionID, "read", { path: conventionsPath });
    assert.equal(read.error, undefined, `read failed: ${read.error?.message}`);
    await waitForIdle(server, sessionID);

    const before = stub.chatRequests().length;
    const compact = await request(server, "POST", `/api/session/${sessionID}/compact`, {});
    assert.ok(compact.status >= 200 && compact.status < 300, `compact returned ${compact.status}`);
    await pollMessages(
      server,
      sessionID,
      (messages) => messages.find((message) => message.type === "compaction" && message.status === "completed"),
      { label: "a completed checkpoint" },
    );

    const summaryRequest = stub
      .chatRequests()
      .slice(before)
      .find((chatRequest) => roleText(chatRequest, "user").includes("## Objective"));
    assert.ok(summaryRequest, "the stub must have received the summary request");
    assert.match(roleText(summaryRequest, "system"), /## Pipeline run/);
  });

  await runCheck(results, "skill reload: every request after the checkpoint tells the session to load the skill and read its files again", async () => {
    const before = stub.chatRequests().length;
    const nonce = `n${Date.now()}`;
    await prompt(server, sessionID, `plain turn ${nonce}`);
    await waitForIdle(server, sessionID);

    const turn = turnRequest(stub.chatRequests().slice(before), nonce);
    assert.ok(turn, "the stub must have received the turn after the checkpoint");
    const system = roleText(turn, "system");
    assert.match(system, /This session's context was checkpointed/);
    assert.match(system, /load the skill again with the `skill` tool: `radical-pipelines`/);
    assert.match(system, new RegExp(`  - ${conventionsPath.replaceAll(".", "\\.")}`));
  });

  await runCheck(results, "skill reload: once the session loads the skill and reads the file again, the instruction stops", async () => {
    const activation = await driveToolCall(server, sessionID, "skill", { id: "radical-pipelines" });
    assert.equal(activation.error, undefined, `skill activation failed: ${activation.error?.message}`);
    const read = await driveToolCall(server, sessionID, "read", { path: conventionsPath });
    assert.equal(read.error, undefined, `read failed: ${read.error?.message}`);
    await waitForIdle(server, sessionID);

    const before = stub.chatRequests().length;
    const nonce = `n${Date.now()}`;
    await prompt(server, sessionID, `plain turn ${nonce}`);
    await waitForIdle(server, sessionID);

    const turn = turnRequest(stub.chatRequests().slice(before), nonce);
    assert.ok(turn, "the stub must have received the turn after the reload");
    assert.doesNotMatch(roleText(turn, "system"), /context was checkpointed/);
  });

  await runCheck(results, "skill reload: rp_status lists the session with its skill and files", async () => {
    const status = await driveToolCall(server, sessionID, "rp_status", {});
    assert.equal(status.error, undefined, `rp_status failed: ${status.error?.message}`);
    const reloads = status.structuredJSON?.skillReloads ?? [];
    const own = reloads.find((entry) => entry.sessionID === sessionID);
    assert.ok(own, `expected ${sessionID} among ${JSON.stringify(reloads)}`);
    assert.deepEqual(own.skills, ["radical-pipelines"]);
    assert.deepEqual(own.files, [conventionsPath]);
  });
}
