#!/usr/bin/env node
/**
 * opencode integration suite.
 *
 * The hermetic, pinned integration suite that exercises the RP coordination
 * layer against exactly the pinned `@opencode-ai/cli` build, in an
 * XDG-isolated sandbox, offline (an OpenAI-compatible SSE stub provider
 * backs every core-flow turn at zero cost). Lives outside `scripts/test/`,
 * so the fixed `npm test` gate never runs it.
 *
 * Usage:
 *   node scripts/opencode-integration/run.mjs                 # core suite (offline, hermetic)
 *   node scripts/opencode-integration/run.mjs --network-smoke # + the release-cadence network smoke path
 *
 * The core suite requires no network access beyond the pinned CLI's
 * one-time install (cached by exact version under the OS temp directory —
 * a repeat run with the same pin never touches the network again). The
 * `--network-smoke` path additionally requires network access to GitHub and
 * to opencode's hosted free-model endpoint.
 */

import { reportSummary } from "./lib/check-runner.mjs";
import { createSandbox, destroySandbox, ensurePinnedCli, readPinManifest, startServe, stopServe, STUB_PORT } from "./lib/sandbox.mjs";
import { startStubProvider } from "./lib/stub-provider.mjs";

import * as pluginAndMaterialization from "./checks/plugin-and-materialization.mjs";
import * as spawnAndMessaging from "./checks/spawn-and-messaging.mjs";
import * as healthLoop from "./checks/health-loop.mjs";
import * as statusAndPin from "./checks/status-and-pin.mjs";
import * as interruptAndModelSwitch from "./checks/interrupt-and-model-switch.mjs";
import * as authRecovery from "./checks/auth-recovery.mjs";
import * as networkErrorProbe from "./checks/network-error-probe.mjs";
import * as networkSmoke from "./checks/network-smoke.mjs";

/** Check groups run in every invocation: the hermetic, offline core path. */
const CORE_CHECK_GROUPS = [
  ["Plugin load, skill registration, agent materialization", pluginAndMaterialization],
  ["Spawn, seat, ledger, title, messaging, termination", spawnAndMessaging],
  ["Health loop", healthLoop],
  ["Status and pin comparison", statusAndPin],
  ["Interrupt and model switch", interruptAndModelSwitch],
  ["Auth-error recovery", authRecovery],
  ["Tool-call network-error probe", networkErrorProbe],
];

async function main() {
  const networkSmokeRequested = process.argv.includes("--network-smoke");
  const keepSandbox = process.env.RP_OPENCODE_SUITE_KEEP_SANDBOX === "1";

  const pin = readPinManifest();
  console.log(`Pinned opencode build: ${pin.cli} (plugin API ${pin.plugin})`);
  console.log("Resolving pinned CLI (installing on first use, cached by exact version)...");
  const { binDir, opencodeBin } = await ensurePinnedCli(pin);

  const { sandboxDir, projectDir, xdgConfigHome, env } = createSandbox();
  console.log(`Sandbox: ${sandboxDir}`);

  const stub = await startStubProvider({ port: STUB_PORT });
  const { child: serveChild, baseURL, password } = await startServe({ projectDir, env, binDir, opencodeBin });
  console.log(`Sandbox 'serve' listening at ${baseURL}`);

  const results = [];
  const ctx = {
    server: { baseURL, password },
    serveChild,
    sandboxDir,
    projectDir,
    xdgConfigHome,
    env,
    binDir,
    opencodeBin,
    pin,
    results,
  };

  try {
    for (const [label, group] of CORE_CHECK_GROUPS) {
      console.log(`\n${label}:`);
      await group.run(ctx);
    }

    if (networkSmokeRequested) {
      console.log(`\nNetwork smoke path:`);
      await networkSmoke.run(ctx);
    } else {
      console.log(`\n(Skipping the network smoke path — pass --network-smoke to include it.)`);
    }
  } finally {
    stopServe(ctx.serveChild);
    await stub.close();
    if (keepSandbox) {
      console.log(`\nRP_OPENCODE_SUITE_KEEP_SANDBOX=1 set — leaving sandbox at ${sandboxDir}`);
    } else {
      destroySandbox(sandboxDir);
    }
  }

  const exitCode = reportSummary(results);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error("opencode integration suite crashed before completing:");
  console.error(error);
  process.exit(1);
});
