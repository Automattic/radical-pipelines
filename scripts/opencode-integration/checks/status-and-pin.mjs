/**
 * rp_status's version and pin-comparison surface, and the suite's own pin
 * assertion: the suite reads the running build directly via
 * `opencode2 --version` (the same XDG-isolated invocation the harness uses
 * everywhere) and asserts it equals `opencode/pin.json`'s `cli`.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, driveToolCall, getSession } from "../lib/api-client.mjs";

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
    const result = await driveToolCall(server, session.id, `return await tools.rp_status({});`);
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
    const spawnResult = await driveToolCall(
      server,
      orchestrator.id,
      `return await tools.rp_spawn({name:"status-check-child", agent:"researcher", model:"stub/stub-model", directory:${JSON.stringify(projectDir)}, prompt:"say hello", run:"status-check-run"});`,
    );
    const childID = spawnResult.text;

    // Wait for the child's first turn so the durable rp: title is asserted
    // (rp_status recognizes restart-surviving sessions via that title).
    await pollForTitle(server, childID, "rp:status-check-run:status-check-child");

    const statusResult = await driveToolCall(server, orchestrator.id, `return await tools.rp_status({});`);
    const status = JSON.parse(statusResult.text);
    const row = status.ledger.find((r) => r.sessionID === childID);
    assert.ok(row, `expected rp_status's ledger to include the spawned child ${childID}`);
    assert.equal(row.name, "status-check-child");
    assert.equal(row.agent, "researcher");
    assert.equal(row.directory, projectDir);
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
