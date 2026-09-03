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
 * The specifier defaults to this package's own release tag
 * (`github:Automattic/radical-pipelines#v<package.json version>`); override
 * with `RP_OPENCODE_SMOKE_SPECIFIER` to smoke-test an unreleased ref.
 */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, listPlugins, prompt, waitForAssistantFinish } from "../lib/api-client.mjs";
import { startServe, stopServe } from "../lib/sandbox.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * Resolve the github specifier to smoke-test: an explicit override, else
 * this package's own release tag.
 *
 * @returns {string}
 */
function resolveSpecifier() {
  if (process.env.RP_OPENCODE_SMOKE_SPECIFIER) {
    return process.env.RP_OPENCODE_SMOKE_SPECIFIER;
  }
  const version = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")).version;
  return `github:Automattic/radical-pipelines#v${version}`;
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
        autoupdate: false,
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

    await runCheck(results, "network smoke: rp_spawn works end to end against the github-installed plugin", async () => {
      const orchestrator = await createSession(server, {
        agent: "build",
        directory: smokeProjectDir,
        model: { providerID: "opencode", id: "hy3-free" },
      });
      const result = await driveViaRealModel(
        server,
        orchestrator.id,
        "Call the rp_spawn tool with name=\"smoke-child\", agent=\"researcher\", model=\"opencode/hy3-free\", directory=" +
          JSON.stringify(smokeProjectDir) +
          ", prompt=\"say hello\", run=\"smoke-run\". Report only the returned session id, nothing else.",
      );
      assert.ok(result.includes("ses_"), `expected a spawned session id in the reply, got: ${result}`);
    });
  } finally {
    stopServe(child);
  }
}

/**
 * Drive a real (non-stub) model with a natural-language instruction and
 * return its final text reply. Unlike the core suite's deterministic
 * directive mechanism, this relies on the free model's own reasoning to
 * decide to call the named tool — appropriate only for this
 * network-dependent smoke path.
 *
 * @param {object} server
 * @param {string} sessionID
 * @param {string} instruction
 * @returns {Promise<string>}
 */
async function driveViaRealModel(server, sessionID, instruction) {
  await prompt(server, sessionID, instruction);
  const done = await waitForAssistantFinish(server, sessionID, "stop", { timeoutMs: 60_000 });
  return done.content?.find((c) => c.type === "text")?.text ?? "";
}
