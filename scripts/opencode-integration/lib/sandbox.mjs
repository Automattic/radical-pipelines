/**
 * XDG-isolated sandbox harness for the opencode integration suite.
 *
 * Installs the pinned `@opencode-ai/cli` (non-globally, cached by exact
 * version so repeat runs skip the network) and drives it entirely inside a
 * fresh temp directory: all four XDG vars point inside the sandbox on every
 * invocation, including `--version`, so nothing this suite runs ever touches
 * the real user's opencode state.
 *
 * `serve` (not the auto-discovered daemon) backs the sandbox, since the suite
 * needs a private, disposable server per run. `serve` writes no service
 * record, so `RP_OPENCODE_SERVER_URL` + `OPENCODE_PASSWORD` are set on its own
 * environment — the same override contract the plugin's `resolveServer`
 * reads — and the cached install's bin directory is put on `PATH` so the
 * plugin's `opencode2 --version` fallback (used when no service record is
 * present) resolves.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INVALID_AUTH_KEY } from "./stub-provider.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PLUGIN_ENTRY = join(REPO_ROOT, "opencode", "plugin.mjs");
const PIN_MANIFEST_PATH = join(REPO_ROOT, "opencode", "pin.json");

/** Fixed local port the sandbox's `serve` process listens on. */
const SERVE_PORT = 46177;

/** Fixed dummy Basic-auth password the sandbox's `serve` process requires. */
const SERVE_PASSWORD = "rp-opencode-integration-suite";

/** Fixed localhost port the offline SSE stub provider listens on. */
const STUB_PORT = 46178;

/**
 * Read and parse the pin manifest (the single source of truth for the exact
 * `@opencode-ai/cli` build and `@opencode-ai/plugin` version this suite
 * targets).
 *
 * @returns {{ cli: string, plugin: string }} The parsed manifest.
 */
export function readPinManifest() {
  return JSON.parse(readFileSync(PIN_MANIFEST_PATH, "utf8"));
}

/**
 * Resolve (installing on first use) a non-global, version-pinned install of
 * `@opencode-ai/cli` and `@opencode-ai/plugin`, cached by exact version under
 * the OS temp directory so a repeat run with the same pin never touches the
 * network.
 *
 * @param {{ cli: string, plugin: string }} pin The pin manifest.
 * @returns {Promise<{ cacheDir: string, binDir: string, opencodeBin: string }>}
 *   `cacheDir` is the install root; `binDir` is its `node_modules/.bin`
 *   (added to `PATH` for the sandbox's processes); `opencodeBin` is the
 *   resolved `opencode2` executable path.
 */
export async function ensurePinnedCli(pin) {
  const cacheDir = join(tmpdir(), "rp-opencode-integration-cache", pin.cli);
  const binDir = join(cacheDir, "node_modules", ".bin");
  const opencodeBin = join(binDir, "opencode2");

  if (!existsSync(opencodeBin)) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(
      join(cacheDir, "package.json"),
      JSON.stringify({ name: "rp-opencode-integration-cache", private: true, version: "0.0.0" }, null, 2),
    );
    await runCommand(
      "npm",
      [
        "install",
        "--no-audit",
        "--no-fund",
        `@opencode-ai/cli@${pin.cli}`,
        `@opencode-ai/plugin@${pin.plugin}`,
      ],
      { cwd: cacheDir },
    );
  }

  if (!existsSync(opencodeBin)) {
    throw new Error(
      `Pinned opencode CLI did not install as expected: ${opencodeBin} not found after \`npm install\` in ${cacheDir}.`,
    );
  }

  return { cacheDir, binDir, opencodeBin };
}

/**
 * Run a command to completion, rejecting on a non-zero exit code.
 *
 * @param {string} command The executable to run.
 * @param {string[]} args Arguments.
 * @param {{ cwd?: string, env?: object }} [options] Spawn options.
 * @returns {Promise<{ stdout: string, stderr: string }>} Captured output.
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stderr}`));
      }
    });
  });
}

/**
 * Build the XDG-isolated environment every opencode invocation in the
 * sandbox must use — including one-off `--version` calls, per the harness's
 * log-leak rule (no invocation may fall back to the real user's directories).
 *
 * @param {string} sandboxDir The sandbox's root temp directory.
 * @returns {Record<string, string>} `XDG_CONFIG_HOME`, `XDG_DATA_HOME`,
 *   `XDG_CACHE_HOME`, `XDG_STATE_HOME`, each rooted under `sandboxDir/xdg`.
 */
function xdgEnv(sandboxDir) {
  const xdg = join(sandboxDir, "xdg");
  return {
    XDG_CONFIG_HOME: join(xdg, "config"),
    XDG_DATA_HOME: join(xdg, "data"),
    XDG_CACHE_HOME: join(xdg, "cache"),
    XDG_STATE_HOME: join(xdg, "state"),
  };
}

/**
 * Write the sandbox's `opencode.json`: the plugin loaded from this
 * repository's actual `opencode/plugin.mjs` (a local path, so no npm/git
 * install is needed for the core suite), and the offline OpenAI-compatible
 * stub provider(s) core flows run against.
 *
 * @param {{ xdgConfigHome: string, stubPort: number }} options Where to
 *   write the config, and the stub provider's port.
 * @returns {void}
 */
function writeSandboxConfig({ xdgConfigHome, stubPort }) {
  const configDir = join(xdgConfigHome, "opencode");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "opencode.json"),
    JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        autoupdate: false,
        plugins: [PLUGIN_ENTRY],
        providers: {
          // The core suite's provider: a mandatory (if dummy) apiKey, so
          // turns run offline against the local stub — verified live that
          // the invalid-key provider below is the deterministic auth-failure
          // injector.
          stub: {
            name: "RP integration stub",
            package: "@opencode-ai/ai/providers/openai-compatible",
            settings: { baseURL: `http://127.0.0.1:${stubPort}/v1`, apiKey: "hermetic-dummy-key" },
            models: { "stub-model": { name: "Stub Model" } },
          },
          // Deterministic auth-failure injector: the local provider returns
          // HTTP 401 for this known-invalid bearer token.
          stubnoauth: {
            name: "RP integration stub (no auth)",
            package: "@opencode-ai/ai/providers/openai-compatible",
            settings: { baseURL: `http://127.0.0.1:${stubPort}/v1`, apiKey: INVALID_AUTH_KEY },
            models: { "stub-model": { name: "Stub Model" } },
          },
        },
      },
      null,
      2,
    ),
  );
}

/**
 * Set up a fresh sandbox: a temp directory with XDG isolation, a project
 * directory to seat sessions in, and the sandbox's `opencode.json`. Does not
 * yet start any process.
 *
 * @returns {{ sandboxDir: string, projectDir: string, xdgConfigHome: string, env: Record<string,string> }}
 *   `env` is the XDG env block every subsequent invocation in this sandbox
 *   must be given.
 */
export function createSandbox() {
  // Resolved through realpath: the OS temp dir can itself be a symlink
  // (macOS's TMPDIR resolves under `/var`, itself a symlink to `/private/var`)
  // — verified live that opencode normalizes a session's project scope to
  // the realpath, so an unresolved directory here silently queries a
  // different (empty) scope than the one sessions are actually seated in.
  const sandboxDir = realpathSync(mkdtempSync(join(tmpdir(), "rp-opencode-integration-")));
  const projectDir = join(sandboxDir, "project");
  mkdirSync(projectDir, { recursive: true });

  const env = xdgEnv(sandboxDir);
  writeSandboxConfig({ xdgConfigHome: env.XDG_CONFIG_HOME, stubPort: STUB_PORT });

  return { sandboxDir, projectDir, xdgConfigHome: env.XDG_CONFIG_HOME, env };
}

/**
 * Remove a sandbox's temp directory tree.
 *
 * @param {string} sandboxDir As returned by `createSandbox`.
 * @returns {void}
 */
export function destroySandbox(sandboxDir) {
  rmSync(sandboxDir, { recursive: true, force: true });
}

/**
 * Start the sandbox's `serve` process.
 *
 * Sets `RP_OPENCODE_SERVER_URL` + `OPENCODE_PASSWORD` on the process's own
 * environment (the harness's server-reach contract, mirroring the plugin's
 * `resolveServer`), and prepends the pinned install's bin directory to
 * `PATH` so the plugin's `opencode2 --version` fallback resolves.
 *
 * @param {{ projectDir: string, env: Record<string,string>, binDir: string, opencodeBin: string }} options
 * @returns {Promise<{ child: import("node:child_process").ChildProcess, baseURL: string, password: string }>}
 *   Resolves once the server reports it is listening.
 */
export function startServe({ projectDir, env, binDir, opencodeBin }) {
  const baseURL = `http://127.0.0.1:${SERVE_PORT}`;
  const serveEnv = {
    ...process.env,
    ...env,
    PATH: `${binDir}:${process.env.PATH ?? ""}`,
    OPENCODE_PASSWORD: SERVE_PASSWORD,
    RP_OPENCODE_SERVER_URL: baseURL,
  };

  return new Promise((resolve, reject) => {
    const child = spawn(opencodeBin, ["serve", "--port", String(SERVE_PORT)], {
      cwd: projectDir,
      env: serveEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("Timed out waiting for the sandbox's `serve` process to start listening."));
      }
    }, 30_000);

    const onData = (chunk) => {
      if (!settled && String(chunk).includes("listening")) {
        settled = true;
        clearTimeout(timeout);
        resolve({ child, baseURL, password: SERVE_PASSWORD });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
  });
}

/**
 * Stop a `serve` process started by `startServe`.
 *
 * @param {import("node:child_process").ChildProcess} child
 * @returns {void}
 */
export function stopServe(child) {
  child.kill();
}

export { STUB_PORT };
