/**
 * Skill re-supply across a context checkpoint, driven against the sandbox's
 * running `serve` process: a session activates the skill, is compacted,
 * receives the skill body on every turn after, and stops receiving it once
 * it activates the skill again — observed in the requests the stub provider
 * actually receives.
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSkillDirectory } from "../../../opencode/plugin.mjs";
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

/** Compact a session and wait for its completed checkpoint. */
async function compact(server, sessionID) {
  const response = await request(server, "POST", `/api/session/${sessionID}/compact`, {});
  assert.ok(response.status >= 200 && response.status < 300, `compact returned ${response.status}`);
  await pollMessages(
    server,
    sessionID,
    (messages) => messages.find((message) => message.type === "compaction" && message.status === "completed"),
    { label: "a completed checkpoint" },
  );
}

/** Drive a plain turn and return the request the stub received for it. */
async function plainTurn(server, stub, sessionID) {
  const before = stub.chatRequests().length;
  const nonce = `n${Date.now()}`;
  await prompt(server, sessionID, `plain turn ${nonce}`);
  await waitForIdle(server, sessionID);
  const turn = turnRequest(stub.chatRequests().slice(before), nonce);
  assert.ok(turn, "the stub must have received the turn");
  return turn;
}

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The re-supplied form of the packaged skill: its id, base directory, and registered body. */
const RESUPPLIED = (() => {
  const skill = readSkillDirectory(join(REPO_ROOT, "skills")).find((candidate) => candidate.id === "radical-pipelines");
  return `Skill: radical-pipelines\nBase directory: ${dirname(skill.location)}\n\n${skill.content}`;
})();

/**
 * Run every check in this group.
 *
 * @param {{ server: object, stub: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, stub, projectDir, results } = ctx;
  let sessionID;

  await runCheck(results, "skill re-supply: every turn after the checkpoint carries the skill body of a session that activated it", async () => {
    const session = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });
    sessionID = session.id;
    const activation = await driveToolCall(server, sessionID, "skill", { id: "radical-pipelines" });
    assert.equal(activation.error, undefined, `skill activation failed: ${activation.error?.message}`);
    await waitForIdle(server, sessionID);
    assert.ok(!roleText(await plainTurn(server, stub, sessionID), "system").includes(RESUPPLIED));

    await compact(server, sessionID);

    for (let turn = 0; turn < 2; turn += 1) {
      const system = roleText(await plainTurn(server, stub, sessionID), "system");
      assert.match(system, /context was checkpointed/);
      assert.ok(system.includes(RESUPPLIED), "the registered skill body must be re-supplied verbatim");
    }
  });

  await runCheck(results, "skill re-supply: once the session activates the skill again, the body is no longer re-supplied", async () => {
    const activation = await driveToolCall(server, sessionID, "skill", { id: "radical-pipelines" });
    assert.equal(activation.error, undefined, `skill activation failed: ${activation.error?.message}`);
    await waitForIdle(server, sessionID);
    assert.doesNotMatch(roleText(await plainTurn(server, stub, sessionID), "system"), /context was checkpointed/);
  });

  await runCheck(results, "skill re-supply: rp_status lists the session with its activated skill", async () => {
    const status = await driveToolCall(server, sessionID, "rp_status", {});
    assert.equal(status.error, undefined, `rp_status failed: ${status.error?.message}`);
    const activations = status.structuredJSON?.skillActivations ?? [];
    assert.deepEqual(
      activations.find((entry) => entry.sessionID === sessionID),
      { sessionID, skills: ["radical-pipelines"] },
      `expected ${sessionID} among ${JSON.stringify(activations)}`,
    );
  });

  await runCheck(results, "skill re-supply: a skill attached to the prompt is an activation too", async () => {
    const session = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });
    const attached = await request(server, "POST", `/api/session/${session.id}/prompt`, {
      text: "start with the skill attached",
      skills: [{ id: "radical-pipelines" }],
      delivery: "queue",
    });
    assert.ok(attached.status >= 200 && attached.status < 300, `prompt returned ${attached.status}`);
    await waitForIdle(server, session.id);
    // A second turn gives the checkpoint an older exchange to summarize.
    await prompt(server, session.id, "one more turn");
    await waitForIdle(server, session.id);

    await compact(server, session.id);
    assert.ok(roleText(await plainTurn(server, stub, session.id), "system").includes(RESUPPLIED));
  });
}
