/**
 * The plugin's bounded diagnostic log: listeners, loops, and hooks record
 * what failed here, and `rp_status` reports it.
 */

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
 * `globalThis` key backing the bounded, in-memory recent-errors ring the
 * terminal-event listener and loop scheduler append to.
 */
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

/**
 * Fetch the process-wide recent-errors ring, creating it on first use.
 *
 * @returns {Array<*>} The singleton log (see `appendToErrorLog`).
 */
function getErrorLog() {
  if (!globalThis[ERROR_LOG_KEY]) {
    globalThis[ERROR_LOG_KEY] = [];
  }
  return globalThis[ERROR_LOG_KEY];
}

/**
 * Record a diagnostic event with its severity and observation time.
 *
 * @param {*} entry The entry to append (see `appendToErrorLog`).
 * @param {"info" | "error"} [level] Successful lifecycle events default to info.
 * @returns {void}
 */
function recordDiagnostic(entry, level = "info") {
  globalThis[ERROR_LOG_KEY] = appendToErrorLog(getErrorLog(), { at: Date.now(), ...entry, level });
}

/** Record a failed operation in the diagnostic log. */
function recordError(entry) {
  recordDiagnostic(entry, "error");
}

/**
 * Render a structured error as one line for a notification.
 *
 * @param {*} error The value `terminalEventError` extracted.
 * @returns {string} `"<type>: <message>"` when both fields are present, the
 *   one present field otherwise, or a JSON rendering as the fallback for an
 *   unrecognized shape.
 */
function formatStructuredError(error) {
  if (typeof error === "string") {
    return error;
  }
  const parts = [error?.type, error?.message].filter(Boolean);
  return parts.length > 0 ? parts.join(": ") : JSON.stringify(error);
}

/**
 * Run one terminal-event report so a failure inside it can never escape to
 * its caller, recording it the way the event loop does.
 *
 * Both the event loop and the release path use this, so a report behaves
 * identically whichever reaches it: one failing report is logged and the next
 * still runs, and it cannot change what `rp_terminate` returns or raises.
 *
 * @param {() => Promise<void>} run The report to isolate.
 * @returns {Promise<void>} Always resolves.
 */
function isolateListener(run) {
  return run().catch((error) => recordError({ type: "listener.failed", error: String(error) }));
}

export {
  appendToErrorLog,
  formatStructuredError,
  getErrorLog,
  isolateListener,
  recordDiagnostic,
  recordError,
};
