/**
 * The native mechanics `skills/radical-pipelines/tools/opencode.md` relies on,
 * driven against the sandbox's running `serve` process: a child session
 * created for the orchestrator, moved into a worktree, and prompted through
 * the `subagent` tool runs there; a finished child is woken again by
 * `sessionID`; a background run notifies its parent when it ends; and
 * deleting the child terminates it.
 */

import assert from "node:assert/strict";
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getSession,
  pollMessages,
  pollToolResult,
  request,
  waitForIdle,
} from "../lib/api-client.mjs";
import { nativeToolPrompt } from "../lib/stub-provider.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** A profile from `agents/`, as its materialized subagent id. */
const PROFILE = `radical-pipelines/${readdirSync(join(REPO_ROOT, "agents"))
  .find((name) => name.endsWith(".md"))
  .replace(/\.md$/, "")}`;

const MODEL = "stub/stub-model";

/** A unique nonce for one driven tool call. */
const nonce = () => `n${Date.now()}${Math.random().toString(36).slice(2)}`;

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;
  const worktree = join(projectDir, ".worktrees", "seat");
  mkdirSync(worktree, { recursive: true });
  let orchestrator;
  let childID;

  await runCheck(results, "a child created for the orchestrator and moved into a worktree runs there through subagent", async () => {
    orchestrator = await createSession(server, {
      agent: "build",
      directory: projectDir,
      model: { providerID: "stub", id: "stub-model" },
    });
    const created = await request(server, "POST", "/api/session", { parentID: orchestrator.id, title: "seated role", agent: PROFILE });
    assert.equal(created.status, 200, `session create returned ${created.status}`);
    childID = created.body.data.id;
    const moved = await request(server, "POST", `/api/session/${childID}/move`, { directory: worktree });
    assert.ok(moved.status >= 200 && moved.status < 300, `move returned ${moved.status}`);

    const shellNonce = nonce();
    const result = await driveToolCall(server, orchestrator.id, "subagent", {
      agent: PROFILE,
      description: "seated role",
      sessionID: childID,
      model: MODEL,
      prompt: nativeToolPrompt("shell", { command: "pwd" }, shellNonce),
    });
    assert.equal(result.error, undefined, `subagent failed: ${result.error?.message}`);
    const pwd = await pollToolResult(server, childID, shellNonce, { label: "the child's pwd" });
    assert.equal(pwd.text?.trim(), worktree);
    assert.equal((await getSession(server, childID)).parentID, orchestrator.id);
  });

  await runCheck(results, "a finished child is woken by sessionID in the background and its end notifies the parent", async () => {
    await waitForIdle(server, orchestrator.id);
    const result = await driveToolCall(server, orchestrator.id, "subagent", {
      agent: PROFILE,
      description: "seated role",
      sessionID: childID,
      model: MODEL,
      background: true,
      prompt: "continue",
    });
    assert.equal(result.error, undefined, `subagent failed: ${result.error?.message}`);
    await pollMessages(
      server,
      orchestrator.id,
      (messages) =>
        messages.find((message) => JSON.stringify(message).includes(`<subagent sessionID=\\"${childID}\\" state=\\"completed\\"`)),
      { label: "the completion notification in the parent" },
    );
    assert.equal((await getSession(server, childID)).location?.directory, worktree, "the seat survives a wake");
  });

  await runCheck(results, "deleting the child terminates it", async () => {
    const deleted = await request(server, "DELETE", `/api/session/${childID}`);
    assert.ok(deleted.status >= 200 && deleted.status < 300, `delete returned ${deleted.status}`);
    const after = await request(server, "GET", `/api/session/${childID}`);
    assert.equal(after.status, 404);
  });
}
