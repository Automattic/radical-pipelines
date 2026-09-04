/**
 * rp_status's version and pin-comparison surface, its ledger rows' liveness
 * facts, and the suite's own pin assertion: the suite reads the running build
 * directly via `opencode2 --version` (the same XDG-isolated invocation the
 * harness uses everywhere) and asserts it equals `opencode/pin.json`'s `cli`.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getActiveSessionIDs,
  getSession,
  interrupt,
  pollUntil,
  prompt,
  waitForIdle,
} from "../lib/api-client.mjs";
import { PLAIN_REPLY_TEXT, slowPrompt } from "../lib/stub-provider.mjs";

const execFileAsync = promisify(execFile);
const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, env: object, opencodeBin: string, pin: object, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, env, opencodeBin, pin, results } = ctx;

  await runCheck(results, "the pin assertion: the running build (read directly) equals opencode/pin.json's cli", async () => {
    // Every opencode invocation in the sandbox — including this one-off
    // --version call — uses the sandbox's XDG env, per the harness's
    // log-leak rule.
    const { stdout } = await execFileAsync(opencodeBin, ["--version"], { env: { ...process.env, ...env } });
    const runningBuild = stdout.trim().replace(/^opencode2\s+v/, "");
    assert.equal(runningBuild, pin.cli, `expected the running build to equal the pinned cli ${pin.cli}, got: ${stdout}`);
  });

  await runCheck(results, "rp_status reports the plugin version and a pin comparison", async () => {
    const session = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const result = await driveToolCall(server, session.id, "rp_status");
    const status = JSON.parse(result.text);

    const pkgVersion = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).version;
    assert.equal(status.pluginVersion, `radical-pipelines@${pkgVersion}`);

    // Under `serve` (no service record), rp_status falls back to
    // `opencode2 --version`, which the sandbox's serve process can resolve
    // since the pinned install's bin dir is on its PATH — so the
    // comparison should resolve to "match" rather than "not determinable".
    assert.equal(status.pin, "match", `expected rp_status's pin comparison to be "match", got: ${status.pin}`);
    assert.ok(Array.isArray(status.ledger));
    assert.ok(Array.isArray(status.recentErrors));
    assert.ok(Array.isArray(status.recentLoopTicks));
  });

  await runCheck(results, "rp_status's ledger reflects a spawned session recognized via its durable title", async () => {
    const orchestrator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const spawnResult = await driveToolCall(server, orchestrator.id, "rp_spawn", { name: "status-check-child", agent: "researcher", model: "stub/stub-model", directory: projectDir, prompt: "say hello", run: "status-check-run" });
    const childID = spawnResult.text;

    // Wait for the child's first turn so the durable rp: title is asserted
    // (rp_status recognizes restart-surviving sessions via that title).
    await pollForTitle(server, childID, "rp:status-check-run:status-check-child");

    const statusResult = await driveToolCall(server, orchestrator.id, "rp_status");
    const status = JSON.parse(statusResult.text);
    const row = status.ledger.find((r) => r.sessionID === childID);
    assert.ok(row, `expected rp_status's ledger to include the spawned child ${childID}`);
    assert.equal(row.name, "status-check-child");
    assert.equal(row.agent, "researcher");
    assert.equal(row.directory, projectDir);
  });

  await runCheck(results, "rp_status's ledger row carries the child's liveness facts: activity, last turn, newest text, last send", async () => {
    const orchestrator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const spawnResult = await driveToolCall(server, orchestrator.id, "rp_spawn", { name: "liveness-check-child", agent: "researcher", model: "stub/stub-model", directory: projectDir, prompt: "say hello", run: "liveness-check-run" });
    const childID = spawnResult.text;
    await pollForTitle(server, childID, "rp:liveness-check-run:liveness-check-child");
    // The child's plain first turn has ended (the title is asserted on its
    // first terminal event); it has messaged nobody yet.
    await waitForIdle(server, childID);

    const idle = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status")).text);
    const idleRow = idle.ledger.find((r) => r.sessionID === childID);
    assert.ok(idleRow, `expected rp_status's ledger to include the spawned child ${childID}`);
    assert.equal(idleRow.run, "liveness-check-run", "the row names its run, so an orchestrator can filter the ledger to its own");
    assert.equal(idleRow.running, false);
    assert.equal(idleRow.lastTurn?.outcome, "succeeded", `expected a succeeded last turn, got: ${JSON.stringify(idleRow.lastTurn)}`);
    assert.ok(idleRow.turns >= 1, `expected at least one ended turn, got: ${idleRow.turns}`);
    assert.ok(Number.isFinite(idleRow.lastTurn.endedAt));
    assert.ok(
      idleRow.activity >= idleRow.updated,
      `expected activity (${idleRow.activity}) to be no earlier than updated (${idleRow.updated})`,
    );
    assert.equal(idleRow.lastText?.excerpt, PLAIN_REPLY_TEXT, `expected the newest assistant text, got: ${JSON.stringify(idleRow.lastText)}`);
    assert.ok(Number.isFinite(idleRow.lastText.at));
    assert.equal(idleRow.lastSend, undefined, "a child that has messaged nobody carries no lastSend");

    // The child reports to its spawner: the row records the admitted send.
    await driveToolCall(server, childID, "rp_send", { to: orchestrator.id, message: "Completion declared." });
    await waitForIdle(server, childID);

    const reported = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status")).text);
    const reportedRow = reported.ledger.find((r) => r.sessionID === childID);
    assert.equal(reportedRow.lastSend?.to, orchestrator.id, `expected lastSend to name the spawner, got: ${JSON.stringify(reportedRow.lastSend)}`);
    assert.ok(Number.isFinite(reportedRow.lastSend.at));
    assert.ok(reportedRow.turns > idleRow.turns, "the reporting turn ended too");

    // An interrupted turn ends too, with its own outcome: `POST /interrupt`
    // emits `session.execution.interrupted`, never succeeded/failed.
    const slowTurn = prompt(server, childID, slowPrompt(6_000, `liveness-interrupt-${Date.now()}`), { delivery: "steer" });
    await pollUntil(async () => (await getActiveSessionIDs(server)).has(childID), { label: "the child to start its slow turn" });
    await delay(300);
    assert.equal(await interrupt(server, childID), 200);
    await slowTurn.catch(() => {});
    await waitForIdle(server, childID);

    const interrupted = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status")).text);
    const interruptedRow = interrupted.ledger.find((r) => r.sessionID === childID);
    assert.equal(interruptedRow.lastTurn?.outcome, "interrupted", `expected an interrupted last turn, got: ${JSON.stringify(interruptedRow.lastTurn)}`);
    assert.equal(interruptedRow.turns, reportedRow.turns + 1);
  });
}

/**
 * Poll a session's title until it matches, or time out.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} expectedTitle
 * @returns {Promise<void>}
 */
async function pollForTitle(server, sessionID, expectedTitle) {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const session = await getSession(server, sessionID);
    if (session.title === expectedTitle) return;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for session ${sessionID}'s title to become "${expectedTitle}" (last seen: "${session.title}")`);
    }
    await delay(300);
  }
}
