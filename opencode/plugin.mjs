/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM module supplying the coordination layer opencode lacks
 * natively (team spawning, directed messaging, health monitoring, status).
 * Every pure helper is named-exported so it can be unit-tested offline,
 * without a running opencode daemon.
 */

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

export {
  formatAttribution,
  formatTitle,
  lookupSpawn,
  parseModelString,
  parseTitle,
  recordSpawn,
  resolveCurrentSpawn,
};
