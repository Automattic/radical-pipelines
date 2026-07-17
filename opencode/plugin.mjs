/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM module supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, health monitoring, status).
 * Every pure helper is named-exported so it can be unit-tested offline,
 * without a running opencode daemon.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parse an Agent-models convention string into the `Model.Ref` object
 * opencode's `session.create` requires.
 *
 * The convention string has the form `provider/model[#variant]`. Only the
 * first `/` splits the provider segment from the model id, so a model id
 * that itself contains slashes (e.g. `openrouter/anthropic/claude-3-opus`)
 * is preserved verbatim as `id`. opencode's API rejects this raw string form
 * outright (`session.create` expects the parsed object), so callers must
 * always parse the convention string before calling `create`.
 *
 * @param {string} modelString Convention string, e.g. `"anthropic/claude-3-opus"`
 *   or `"anthropic/claude-3-opus#thinking"`.
 * @returns {{ providerID: string, id: string, variant: string }} The parsed
 *   `Model.Ref`. `variant` defaults to `"default"` when the string omits
 *   `#variant`.
 * @throws {Error} If the provider segment or the model segment is missing.
 */
function parseModelString(modelString) {
  const hashIndex = modelString.indexOf("#");
  const withoutVariant =
    hashIndex === -1 ? modelString : modelString.slice(0, hashIndex);
  const variant = hashIndex === -1 ? "default" : modelString.slice(hashIndex + 1);

  const slashIndex = withoutVariant.indexOf("/");
  const providerID = slashIndex === -1 ? "" : withoutVariant.slice(0, slashIndex);
  const id = slashIndex === -1 ? "" : withoutVariant.slice(slashIndex + 1);

  if (!providerID || !id) {
    throw new Error(
      `Invalid model string "${modelString}": expected "provider/model[#variant]"`,
    );
  }

  return { providerID, id, variant };
}

/**
 * `globalThis` key backing the process-wide spawn ledger.
 *
 * opencode may re-import this module under a distinct resolved URL for each
 * per-directory `setup(ctx)` re-run, which would otherwise give each re-run
 * its own module scope and a fresh, empty ledger. Storing the ledger on
 * `globalThis` under a stable key instead means every such re-import shares
 * one ledger for the lifetime of the daemon process; the ledger disappears
 * only when the process (and `globalThis` with it) does.
 */
const LEDGER_KEY = Symbol.for("radical-pipelines.opencode.ledger");

/**
 * Fetch the process-wide spawn ledger, creating it on first use.
 *
 * @returns {{
 *   bySessionID: Map<string, { name: string, run: string, spawner: string }>,
 *   currentByName: Map<string, string>,
 * }} The singleton ledger. `bySessionID` holds every recorded spawn keyed by
 *   session ID, so any session ID that was ever recorded stays individually
 *   resolvable. `currentByName` maps an instance name to the session ID of
 *   its most recently recorded spawn, implementing latest-wins-per-name.
 */
function getLedger() {
  if (!globalThis[LEDGER_KEY]) {
    globalThis[LEDGER_KEY] = {
      bySessionID: new Map(),
      currentByName: new Map(),
    };
  }
  return globalThis[LEDGER_KEY];
}

/**
 * Record a spawned session in the ledger.
 *
 * Recording a second spawn under the same `name` (a re-spawn) supersedes the
 * older entry as the name's current resolution (see `resolveCurrentSpawn`),
 * while the older session ID remains individually resolvable (see
 * `lookupSpawn`).
 *
 * @param {string} sessionID The session ID opencode assigned to the spawn.
 * @param {{ name: string, run: string, spawner: string }} entry The spawned
 *   instance's run-unique name, the run it belongs to, and the session ID
 *   of the agent that spawned it.
 * @returns {void}
 */
function recordSpawn(sessionID, entry) {
  const ledger = getLedger();
  ledger.bySessionID.set(sessionID, entry);
  ledger.currentByName.set(entry.name, sessionID);
}

/**
 * Look up a recorded spawn by its session ID.
 *
 * @param {string} sessionID The session ID to look up.
 * @returns {{ name: string, run: string, spawner: string } | undefined} The
 *   entry recorded for `sessionID`, or `undefined` if no spawn was ever
 *   recorded under that session ID.
 */
function lookupSpawn(sessionID) {
  return getLedger().bySessionID.get(sessionID);
}

/**
 * Resolve the session currently considered "the" instance for a name.
 *
 * When multiple spawns have shared the same `name` (a re-spawn), this
 * returns the most recently recorded one.
 *
 * @param {string} name The run-unique instance name to resolve.
 * @returns {{ sessionID: string, name: string, run: string, spawner: string } | undefined}
 *   The current entry for `name` (including its session ID), or `undefined`
 *   if no spawn has ever been recorded under that name.
 */
function resolveCurrentSpawn(name) {
  const ledger = getLedger();
  const sessionID = ledger.currentByName.get(name);
  if (sessionID === undefined) {
    return undefined;
  }
  return { sessionID, ...ledger.bySessionID.get(sessionID) };
}

/**
 * Build the unspoofable attribution prefix for a delivered message.
 *
 * The prefix is derived entirely from the resolved sender (looked up from
 * the ledger by the caller's own session ID), never from message content,
 * so a sender cannot forge who a message is "from".
 *
 * @param {{ name: string, sessionID: string }} sender The resolved sender:
 *   its instance name and its session ID.
 * @returns {string} The delivered-message prefix, e.g.
 *   `"[from spec-lead (ses_x)]"`.
 */
function formatAttribution(sender) {
  return `[from ${sender.name} (${sender.sessionID})]`;
}

/** Prefix marking a session title as an RP-managed, reconstructible one. */
const TITLE_PREFIX = "rp:";

/**
 * Format the durable session title used to reconstruct ledger state.
 *
 * The title is asserted onto the session (surviving daemon restarts) so the
 * ledger can be rebuilt from `run` and `name` alone.
 *
 * @param {{ run: string, name: string }} identity The run identifier and the
 *   run-unique instance name.
 * @returns {string} The title, formatted as `"rp:<run>:<name>"`.
 */
function formatTitle({ run, name }) {
  return `${TITLE_PREFIX}${run}:${name}`;
}

/**
 * Parse a durable session title back into its run and instance name.
 *
 * @param {string} title The session title to parse.
 * @returns {{ run: string, name: string } | undefined} The parsed `{ run,
 *   name }`, or `undefined` when `title` lacks the `rp:` prefix.
 */
function parseTitle(title) {
  if (!title.startsWith(TITLE_PREFIX)) {
    return undefined;
  }
  const rest = title.slice(TITLE_PREFIX.length);
  const separatorIndex = rest.indexOf(":");
  if (separatorIndex === -1) {
    return undefined;
  }
  return {
    run: rest.slice(0, separatorIndex),
    name: rest.slice(separatorIndex + 1),
  };
}

/**
 * Resolve the absolute path to the durable loop registry file.
 *
 * The registry backs `rp_loop_start`/`rp_loop_list`/`rp_loop_cancel` and the
 * re-arm-on-setup behavior: it lives outside opencode's own data directory so
 * it survives independently of opencode's state, under RP's own XDG-style
 * location.
 *
 * @param {Record<string, string | undefined>} [env] Environment to read
 *   `XDG_DATA_HOME` from. Defaults to the real process environment; injectable
 *   so callers can resolve the path without depending on ambient process state.
 * @returns {string} Absolute path to `loops.json`, under
 *   `$XDG_DATA_HOME/radical-pipelines/` when `XDG_DATA_HOME` is set, else under
 *   `~/.local/share/radical-pipelines/`.
 */
function resolveLoopRegistryPath(env = process.env) {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "radical-pipelines", "loops.json");
}

/**
 * List every entry currently stored in the loop registry.
 *
 * Reads fresh from disk on every call (no in-memory cache), so a call made
 * from a newly constructed registry instance — including one in a different
 * process, after a restart — observes whatever the last writer persisted.
 *
 * @param {string} registryPath Absolute path to the registry JSON file, as
 *   returned by `resolveLoopRegistryPath` (or a test-injected path).
 * @returns {Array<{ id: string, interval: number, prompt: string, targetSession: string }>}
 *   Every entry in the registry, in insertion order, or `[]` when the file
 *   does not exist yet.
 */
function listLoopEntries(registryPath) {
  if (!existsSync(registryPath)) {
    return [];
  }
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

/**
 * Persist a full list of entries to the loop registry, creating the parent
 * directory first if it does not already exist.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {Array<{ id: string, interval: number, prompt: string, targetSession: string }>} entries
 *   The complete list of entries to persist, replacing whatever was there.
 * @returns {void}
 */
function writeLoopRegistry(registryPath, entries) {
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, JSON.stringify(entries, null, 2));
}

/**
 * Add an entry to the loop registry.
 *
 * Each entry carries enough to re-arm a `setInterval` after a restart: the
 * loop id, its tick interval, the prompt to inject, and the session it
 * targets.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {{ id: string, interval: number, prompt: string, targetSession: string }} entry
 *   The loop entry to add. `id` uniquely identifies the loop; `interval` is
 *   the tick period in milliseconds; `prompt` is the text injected on an idle
 *   tick; `targetSession` is the session ID the loop watches and prompts.
 * @returns {void}
 */
function addLoopEntry(registryPath, entry) {
  const entries = listLoopEntries(registryPath);
  entries.push(entry);
  writeLoopRegistry(registryPath, entries);
}

/**
 * Delete a loop registry entry by loop id.
 *
 * Deleting an id that is not present is a no-op: the registry is left
 * unchanged rather than raising an error.
 *
 * @param {string} registryPath Absolute path to the registry JSON file.
 * @param {string} id The loop id to remove.
 * @returns {void}
 */
function deleteLoopEntry(registryPath, id) {
  const entries = listLoopEntries(registryPath).filter(
    (entry) => entry.id !== id,
  );
  writeLoopRegistry(registryPath, entries);
}

/**
 * Absolute path to RP's own agent profile sources, resolved relative to this
 * module's location so it resolves correctly regardless of the process's
 * working directory.
 *
 * Serves as `materializeAgents`'s default `sourceDir`; tests inject their own
 * directory instead of relying on this constant.
 */
const DEFAULT_AGENTS_SOURCE_DIR = fileURLToPath(
  new URL("../agents", import.meta.url),
);

/**
 * Filename of the ownership manifest `materializeAgents` writes into the
 * target agents directory.
 *
 * Records which filenames in the target were materialized by RP, as opposed
 * to pre-existing, foreign agents of the same name, so a later materialize
 * knows which target files it may safely overwrite.
 */
const OWNERSHIP_MANIFEST_NAME = ".rp-owned.json";

/**
 * Read the set of filenames recorded as RP-owned in a target agents
 * directory.
 *
 * @param {string} targetDir Absolute path to the target agents directory.
 * @returns {Set<string>} The recorded RP-owned filenames, or an empty set
 *   when the directory has no manifest yet (e.g. it was never materialized
 *   into before).
 */
function readOwnershipManifest(targetDir) {
  const manifestPath = join(targetDir, OWNERSHIP_MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    return new Set();
  }
  return new Set(JSON.parse(readFileSync(manifestPath, "utf8")));
}

/**
 * Persist the set of RP-owned filenames to a target agents directory's
 * ownership manifest, replacing whatever was recorded before.
 *
 * @param {string} targetDir Absolute path to the target agents directory.
 * @param {Set<string>} owned The complete set of RP-owned filenames.
 * @returns {void}
 */
function writeOwnershipManifest(targetDir, owned) {
  writeFileSync(
    join(targetDir, OWNERSHIP_MANIFEST_NAME),
    JSON.stringify([...owned].sort(), null, 2),
  );
}

/**
 * Materialize RP's agent profiles into opencode's global agents directory.
 *
 * Copies every `*.md` profile from `sourceDir` into `targetDir` byte for
 * byte — including the extra `name:` frontmatter key the profiles carry,
 * which opencode ignores since the filename governs the agent id. The copy
 * is idempotent and ownership-aware, tracked via a manifest written into
 * `targetDir`:
 *  - a target filename recorded as RP-owned (from a previous materialize) is
 *    always overwritten with the current source bytes;
 *  - a target filename that already exists but is *not* recorded as
 *    RP-owned — a foreign file of the same name — is left untouched and
 *    reported as a collision instead of being clobbered;
 *  - every filename written is (re)recorded as RP-owned.
 *
 * @param {string} [sourceDir] Absolute path to the directory of source agent
 *   profiles. Defaults to `../agents` resolved relative to this module (the
 *   repository's `agents/` directory at runtime).
 * @param {string} [targetDir] Absolute path to the target agents directory.
 *   Defaults to opencode's global agents directory, `~/.config/opencode/agents/`.
 * @returns {{ written: string[], collisions: string[] }} `written` lists the
 *   source filenames copied into `targetDir` this run; `collisions` lists
 *   filenames that already existed under `targetDir` as foreign (non-RP-owned)
 *   files, and so were left unmodified.
 */
function materializeAgents(
  sourceDir = DEFAULT_AGENTS_SOURCE_DIR,
  targetDir = join(homedir(), ".config", "opencode", "agents"),
) {
  mkdirSync(targetDir, { recursive: true });

  const owned = readOwnershipManifest(targetDir);
  const written = [];
  const collisions = [];

  const profiles = readdirSync(sourceDir).filter((name) =>
    name.endsWith(".md"),
  );
  for (const name of profiles) {
    const targetPath = join(targetDir, name);
    if (existsSync(targetPath) && !owned.has(name)) {
      collisions.push(name);
      continue;
    }
    copyFileSync(join(sourceDir, name), targetPath);
    owned.add(name);
    written.push(name);
  }

  writeOwnershipManifest(targetDir, owned);

  return { written, collisions };
}

/**
 * Absolute path to the pin manifest, resolved relative to this module's
 * location so it resolves correctly regardless of the process's working
 * directory.
 *
 * Serves as `readPinManifest`'s default `manifestPath`; tests inject their
 * own path instead of relying on this constant.
 */
const DEFAULT_PIN_MANIFEST_PATH = fileURLToPath(
  new URL("./pin.json", import.meta.url),
);

/**
 * Read and parse the pin manifest declaring the exact `@opencode-ai/cli`
 * build (and `@opencode-ai/plugin` version) this layer targets.
 *
 * @param {string} [manifestPath] Absolute path to the manifest JSON file.
 *   Defaults to `opencode/pin.json` alongside this module.
 * @returns {{ cli: string, plugin: string }} The parsed manifest.
 */
function readPinManifest(manifestPath = DEFAULT_PIN_MANIFEST_PATH) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

/**
 * Compare a running opencode build against the pinned build.
 *
 * @param {string | null | undefined} runningBuild The build string reported
 *   by the running installation (e.g. from `opencode2 --version` or the
 *   service record), or a nullish value or the literal `"unknown"` when it
 *   could not be read (e.g. a `serve` process exposes no service record).
 * @param {string} pinnedCli The pinned `@opencode-ai/cli` build string (the
 *   pin manifest's `cli` field, see `readPinManifest`).
 * @returns {"match" | "outside the verified surface" | "not determinable"}
 *   `"match"` when `runningBuild` equals `pinnedCli`; `"not determinable"`
 *   when `runningBuild` is nullish or `"unknown"` rather than a real build
 *   string; otherwise `"outside the verified surface"`.
 */
function comparePinnedBuild(runningBuild, pinnedCli) {
  if (runningBuild == null || runningBuild === "unknown") {
    return "not determinable";
  }
  return runningBuild === pinnedCli ? "match" : "outside the verified surface";
}

/**
 * Default cap for the in-memory recent-errors ring `appendToErrorLog`
 * maintains.
 */
const DEFAULT_ERROR_LOG_CAP = 20;

/**
 * Append an entry to a bounded, in-memory error log ring.
 *
 * Pure: returns a new array rather than mutating `log`, leaving the caller
 * in control of where the resulting log is stored (e.g. a module-singleton
 * held by the event listener).
 *
 * @param {Array<*>} log Existing log entries, oldest first.
 * @param {*} entry The entry to append (e.g. a captured structured error).
 * @param {number} [cap] Maximum number of entries the ring retains. Defaults
 *   to `DEFAULT_ERROR_LOG_CAP`.
 * @returns {Array<*>} `log` with `entry` appended; once the result would
 *   exceed `cap` entries, the oldest are dropped so at most `cap` remain,
 *   newest last.
 */
function appendToErrorLog(log, entry, cap = DEFAULT_ERROR_LOG_CAP) {
  const next = [...log, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/**
 * Shape the `rp_status` tool result from its component inputs.
 *
 * Pure: every input is supplied by the caller — the plugin's `rp_status`
 * handler gathers the plugin version, the pin comparison (see
 * `comparePinnedBuild`), the ledger snapshot, and the error log (see
 * `appendToErrorLog`) from their respective sources — so this function
 * performs no I/O of its own.
 *
 * @param {{
 *   pluginVersion: string,
 *   pinComparison: "match" | "outside the verified surface" | "not determinable",
 *   ledgerEntries: Array<{
 *     name: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     running: boolean,
 *     pending: number,
 *   }>,
 *   errorLog: Array<*>,
 * }} input The status payload's components. `pluginVersion` identifies the
 *   running plugin build; `pinComparison` is the result of comparing the
 *   running opencode build against the pin; `ledgerEntries` is one row per
 *   live spawn; `errorLog` is the bounded recent-errors ring.
 * @returns {{
 *   pluginVersion: string,
 *   pin: "match" | "outside the verified surface" | "not determinable",
 *   ledger: Array<{
 *     name: string,
 *     sessionID: string,
 *     agent: string,
 *     model: string,
 *     directory: string,
 *     updated: string | number,
 *     running: boolean,
 *     pending: number,
 *   }>,
 *   recentErrors: Array<*>,
 * }} The shaped `rp_status` result.
 */
function shapeStatus({ pluginVersion, pinComparison, ledgerEntries, errorLog }) {
  return {
    pluginVersion,
    pin: pinComparison,
    ledger: ledgerEntries.map((entry) => ({
      name: entry.name,
      sessionID: entry.sessionID,
      agent: entry.agent,
      model: entry.model,
      directory: entry.directory,
      updated: entry.updated,
      running: entry.running,
      pending: entry.pending,
    })),
    recentErrors: errorLog,
  };
}

export {
  addLoopEntry,
  appendToErrorLog,
  comparePinnedBuild,
  deleteLoopEntry,
  formatAttribution,
  formatTitle,
  listLoopEntries,
  lookupSpawn,
  materializeAgents,
  parseModelString,
  parseTitle,
  readPinManifest,
  recordSpawn,
  resolveCurrentSpawn,
  resolveLoopRegistryPath,
  shapeStatus,
};
