/**
 * Skill reload across a context checkpoint, driven against the sandbox's
 * running `serve` process: a session activates the skill and reads a
 * convention file, is compacted, and is then re-supplied both on the next
 * turn — observed in the requests the stub provider actually receives.
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

/** The text of every system-role message in one recorded chat request. */
function systemText(chatRequest) {
  return chatRequest.messages
    .filter((message) => message.role === "system")
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : (message.content ?? []).map((part) => part.text ?? "").join("\n"),
    )
    .join("\n");
}

/** The text of every user-role message in one recorded chat request. */
function userText(chatRequest) {
  return chatRequest.messages
    .filter((message) => message.role === "user")
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : (message.content ?? []).map((part) => part.text ?? "").join("\n"),
    )
    .join("\n");
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
  const conventionsBody = "---\nconventions: 2\n---\n\n# RP_STUB_CONVENTIONS\n";
  let sessionID;

  await runCheck(results, "skill reload: the compaction request of a session that activated the skill asks for the pipeline run section", async () => {
    writeFileSync(conventionsPath, conventionsBody);
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

    const compactionRequest = stub
      .chatRequests()
      .slice(before)
      .find((chatRequest) => userText(chatRequest).includes("## Objective"));
    assert.ok(compactionRequest, "the stub must have received the compaction request");
    assert.match(systemText(compactionRequest), /## Pipeline run/);
  });

  await runCheck(results, "skill reload: every request after the checkpoint carries the skill and the files read, current as on disk", async () => {
    // The file changes after the checkpoint: the block carries what is on
    // disk now, not what the session read.
    writeFileSync(conventionsPath, `${conventionsBody}\nRP_STUB_CONVENTIONS_UPDATED\n`);
    const before = stub.chatRequests().length;
    const nonce = `n${Date.now()}`;
    await prompt(server, sessionID, `plain turn ${nonce}`);
    await waitForIdle(server, sessionID);

    const turn = stub
      .chatRequests()
      .slice(before)
      .find((chatRequest) => chatRequest.tools.length > 0 && userText(chatRequest).includes(nonce));
    assert.ok(turn, "the stub must have received the turn after the checkpoint");
    const system = systemText(turn);
    assert.match(system, /This session's context was checkpointed/);
    assert.match(system, /Skill: radical-pipelines\nBase directory: .*skills\/radical-pipelines\n\n# Radical Pipelines/);
    assert.match(system, new RegExp(`File: ${conventionsPath.replaceAll(".", "\\.")}\\n[\\s\\S]*RP_STUB_CONVENTIONS_UPDATED`));
    assert.match(system, /Agents spawned by this session: \(none\)/);
  });

  await runCheck(results, "skill reload: rp_status lists the re-supplied session with its files", async () => {
    const status = await driveToolCall(server, sessionID, "rp_status", {});
    assert.equal(status.error, undefined, `rp_status failed: ${status.error?.message}`);
    const reloads = status.structuredJSON?.skillReloads ?? [];
    const own = reloads.find((entry) => entry.sessionID === sessionID);
    assert.ok(own, `expected ${sessionID} among ${JSON.stringify(reloads)}`);
    assert.deepEqual(own.skills, ["radical-pipelines"]);
    assert.deepEqual(own.files, [conventionsPath]);
  });
}
