/**
 * rp_status's version surface, its ledger rows' liveness
 * facts, and the suite's runtime assertion: the suite reads the running build
 * directly via `opencode --version` (the same XDG-isolated invocation the
 * harness uses everywhere) and asserts it equals the resolved CLI version.
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
 * @param {{ server: object, projectDir: string, env: object, opencodeBin: string, version: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, env, opencodeBin, version, results } = ctx;

  await runCheck(results, "the running CLI matches the resolved stable release", async () => {
    // Every opencode invocation in the sandbox — including this one-off
    // --version call — uses the sandbox's XDG env, per the harness's
    // log-leak rule.
    const { stdout } = await execFileAsync(opencodeBin, ["--version"], { env: { ...process.env, ...env } });
    const runningBuild = stdout.trim().replace(/^opencode\s+v/, "");
    assert.equal(runningBuild, version, `expected CLI ${version}, got: ${stdout}`);
  });

  await runCheck(results, "rp_status reports the plugin version without a runtime pin", async () => {
    const session = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const result = await driveToolCall(server, session.id, "rp_status");
    const status = JSON.parse(result.text);

    const pkgVersion = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).version;
    assert.equal(status.pluginVersion, `radical-pipelines@${pkgVersion}`);

    assert.equal(Object.hasOwn(status, "pin"), false);
    assert.ok(Array.isArray(status.ledger));
    assert.ok(Array.isArray(status.recentErrors));
    assert.ok(Array.isArray(status.readFailures));
  });

  await runCheck(results, "rp_status's ledger reflects a spawned session recognized via its durable title", async () => {
    const orchestrator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const spawnResult = await driveToolCall(server, orchestrator.id, "rp_spawn", { name: "status-check-child", agent: "helper", model: "stub/stub-model", directory: projectDir, prompt: "say hello", pipeline_slug: "status-check-run" });
    const childID = spawnResult.text;

    // Wait for the child's first turn so the durable rp: title is asserted
    // (rp_status recognizes restart-surviving sessions via that title).
    await pollForTitle(server, childID, "rp:status-check-run:status-check-child");

    const statusResult = await driveToolCall(server, orchestrator.id, "rp_status");
    const status = JSON.parse(statusResult.text);
    const row = status.ledger.find((r) => r.sessionID === childID);
    assert.ok(row, `expected rp_status's ledger to include the spawned child ${childID}`);
    assert.equal(row.name, "status-check-child");
    assert.equal(row.agent, "helper");
    assert.equal(row.directory, projectDir);
    assert.equal(row.pipelineSlug, "status-check-run");
  });

  await runCheck(results, "rp_status scoped to a pipeline slug reports that pipeline's sessions alone", async () => {
    const orchestrator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const spawn = async (name, pipeline_slug) => {
      const result = await driveToolCall(server, orchestrator.id, "rp_spawn", { name, agent: "helper", model: "stub/stub-model", directory: projectDir, prompt: "say hello", pipeline_slug });
      await pollForTitle(server, result.text, `rp:${pipeline_slug}:${name}`);
      return result.text;
    };
    const mine = await spawn("scope-child", "scope-pipeline-a");
    const theirs = await spawn("scope-child", "scope-pipeline-b");

    const scoped = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status", { pipeline_slug: "scope-pipeline-a" })).text);
    assert.ok(scoped.ledger.some((r) => r.sessionID === mine), "the pipeline's own session is reported");
    assert.ok(scoped.ledger.every((r) => r.pipelineSlug === "scope-pipeline-a"), `expected only scope-pipeline-a rows, got: ${JSON.stringify(scoped.ledger.map((r) => r.pipelineSlug))}`);
    assert.ok(!scoped.ledger.some((r) => r.sessionID === theirs), "another pipeline's session is not");
    assert.ok(scoped.ledger.every((r) => !Object.hasOwn(r, "lastText")), "a pipeline scope reads no transcript");

    const one = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status", { session: theirs })).text);
    assert.deepEqual(one.ledger.map((r) => r.sessionID), [theirs]);
    assert.ok(Object.hasOwn(one.ledger[0], "lastText"), "a session scope reads the transcript");
  });

  await runCheck(results, "rp_status's ledger row carries the child's liveness facts: activity, last turn, newest text, last send", async () => {
    const orchestrator = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });
    const spawnResult = await driveToolCall(server, orchestrator.id, "rp_spawn", { name: "liveness-check-child", agent: "helper", model: "stub/stub-model", directory: projectDir, prompt: "say hello", pipeline_slug: "liveness-check-run" });
    const childID = spawnResult.text;
    await pollForTitle(server, childID, "rp:liveness-check-run:liveness-check-child");
    // The child's plain first turn has ended (the title is asserted on its
    // first terminal event); it has messaged nobody yet.
    await waitForIdle(server, childID);

    const status = async () => {
      const payload = JSON.parse((await driveToolCall(server, orchestrator.id, "rp_status", { session: childID })).text);
      return payload.ledger.find((r) => r.sessionID === childID);
    };
    const idleRow = await status();
    assert.ok(idleRow, `expected rp_status's ledger to include the spawned child ${childID}`);
    assert.equal(idleRow.running, false);
    assert.equal(idleRow.lastTurn?.outcome, "succeeded", `expected a succeeded last turn, got: ${JSON.stringify(idleRow.lastTurn)}`);
    assert.ok(Number.isFinite(idleRow.lastTurn.endedAt));
    assert.ok(Number.isFinite(idleRow.activity));
    assert.equal(idleRow.lastText?.excerpt, PLAIN_REPLY_TEXT, `expected the newest assistant text, got: ${JSON.stringify(idleRow.lastText)}`);
    assert.ok(Number.isFinite(idleRow.lastText.at));
    assert.equal(idleRow.lastSend, undefined, "a child that has messaged nobody carries no lastSend");

    // The child reports to its spawner: the row records the admitted send.
    await driveToolCall(server, childID, "rp_send", { to: orchestrator.id, message: "Completion declared." });
    await waitForIdle(server, childID);

    const reportedRow = await status();
    assert.equal(reportedRow.lastSend?.to, orchestrator.id, `expected lastSend to name the spawner, got: ${JSON.stringify(reportedRow.lastSend)}`);
    assert.ok(Number.isFinite(reportedRow.lastSend.at));
    assert.ok(reportedRow.lastTurn.endedAt > idleRow.lastTurn.endedAt, "the reporting turn ended too");

    // An interrupted turn ends too, with its own outcome: `POST /interrupt`
    // emits `session.execution.interrupted`, never succeeded/failed.
    const slowTurn = prompt(server, childID, slowPrompt(6_000, `liveness-interrupt-${Date.now()}`), { delivery: "steer" });
    await pollUntil(async () => (await getActiveSessionIDs(server)).has(childID), { label: "the child to start its slow turn" });
    await delay(300);
    assert.equal(await interrupt(server, childID), 200);
    await slowTurn.catch(() => {});
    await waitForIdle(server, childID);

    const interruptedRow = await status();
    assert.equal(interruptedRow.lastTurn?.outcome, "interrupted", `expected an interrupted last turn, got: ${JSON.stringify(interruptedRow.lastTurn)}`);
    assert.ok(interruptedRow.lastTurn.endedAt > reportedRow.lastTurn.endedAt);
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
