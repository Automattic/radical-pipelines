/**
 * Release-cadence network smoke path.
 *
 * Unlike the core (stub-provider) checks, this path is network-dependent and
 * intentionally excluded from the suite's default, in-phase run: it
 * installs the plugin through the github-specifier channel (rather than a
 * local path) and drives real turns against opencode's free `opencode/*`
 * models — the two mechanics the core hermetic path cannot exercise
 * (network installation, and the `provider.no-route` failure classification,
 * which was verified live only against a real hosted provider — an entirely
 * unconfigured model against the offline stub instead admits its input and
 * never produces any visible turn, event, or error at all).
 *
 * Run only at release cadence, with network access, via:
 *   node scripts/opencode-integration/run.mjs --network-smoke
 *
 * The specifier defaults to `github:Automattic/radical-pipelines`; override
 * with `RP_OPENCODE_SMOKE_SPECIFIER` to smoke-test an unreleased ref.
 */

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, listPlugins, prompt, waitForAssistantFinish } from "../lib/api-client.mjs";
import { startServe, stopServe } from "../lib/sandbox.mjs";

/**
 * Resolve the github specifier to smoke-test: an explicit override, else
 * the documented installation source.
 *
 * @returns {string}
 */
function resolveSpecifier() {
  if (process.env.RP_OPENCODE_SMOKE_SPECIFIER) {
    return process.env.RP_OPENCODE_SMOKE_SPECIFIER;
  }
  return "github:Automattic/radical-pipelines";
}

/**
 * Run the network smoke path against its own fresh sandbox (a github-specifier
 * plugin install needs its own project config, distinct from the core
 * suite's local-path config).
 *
 * @param {{ projectDir: string, env: object, binDir: string, opencodeBin: string, results: Array }} ctx
 *   Reuses the core sandbox's XDG/env/binaries, but writes its own project
 *   config and starts its own `serve` process pointed at a fresh project dir.
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { env, binDir, opencodeBin, results } = ctx;
  const specifier = resolveSpecifier();

  const smokeProjectDir = join(ctx.sandboxDir, "network-smoke-project");
  mkdirSync(smokeProjectDir, { recursive: true });

  writeFileSync(
    join(env.XDG_CONFIG_HOME, "opencode", "opencode.json"),
    JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        plugins: [specifier],
      },
      null,
      2,
    ),
  );

  const { child, baseURL, password } = await startServe({
    projectDir: smokeProjectDir,
    env,
    binDir,
    opencodeBin,
  });
  const server = { baseURL, password };

  try {
    await runCheck(results, `network smoke: the plugin installs via the github specifier ${specifier}`, async () => {
      const plugins = await listPlugins(server, smokeProjectDir);
      assert.ok(
        plugins.some((p) => p.id.startsWith("radical-pipelines@")),
        `expected a radical-pipelines@* plugin id among: ${JSON.stringify(plugins.map((p) => p.id))}`,
      );
    });

    await runCheck(results, "network smoke: a real turn runs on a free opencode/* model at zero cost", async () => {
      const session = await createSession(server, {
        agent: "build",
        directory: smokeProjectDir,
        model: { providerID: "opencode", id: "hy3-free" },
      });
      await prompt(server, session.id, "Reply with exactly the text OK and nothing else.");
      const done = await waitForAssistantFinish(server, session.id, "stop", { timeoutMs: 60_000 });
      assert.equal(done.cost, 0, "expected the free model to run at zero cost");
    });

    await runCheck(results, "network smoke: a bogus model id on a real provider surfaces provider.no-route", async () => {
      const session = await createSession(server, {
        agent: "build",
        directory: smokeProjectDir,
        model: { providerID: "opencode", id: "definitely-not-a-real-model-xyz" },
      });
      await prompt(server, session.id, "hello");
      const failed = await waitForAssistantFinish(server, session.id, "error", { timeoutMs: 60_000 });
      assert.equal(failed.error?.type, "provider.no-route");
    });

  } finally {
    stopServe(child);
  }
}
