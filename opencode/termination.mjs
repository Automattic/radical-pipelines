/**
 * The `rp_terminate` tool and the terminal-event listener: announcing failed
 * and silent turns to a spawner, and withholding what a termination explains.
 */

import { requestServer, resolveServer } from "./client.mjs";
import { formatStructuredError, isolateListener, recordError } from "./diagnostics.mjs";
import { resolveSession } from "./ledger.mjs";
import { terminalEventError, terminalEventSessionID, turnsFor } from "./observations.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";

/**
 * `globalThis` key backing the per-session termination state `rp_terminate`
 * maintains for the terminal-event listener.
 */
const TERMINATED_SESSIONS_KEY = Symbol.for("radical-pipelines.opencode.terminatedSessions");

/**
 * Fetch the process-wide map of per-session termination state, creating it on
 * first use.
 *
 * A session is present while at least one `rp_terminate` call for it is in
 * flight, and remains present once any call has confirmed the deletion.
 *
 * @returns {Map<string, {inFlight: number, confirmed: boolean, deferred: Array<() => Promise<void>>, releasing: boolean}>}
 *   The singleton map.
 */
function getTerminationState() {
  if (!globalThis[TERMINATED_SESSIONS_KEY]) {
    globalThis[TERMINATED_SESSIONS_KEY] = new Map();
  }
  return globalThis[TERMINATED_SESSIONS_KEY];
}

/**
 * Record that a termination attempt for a session has started.
 *
 * @param {string} sessionID The session being terminated.
 * @returns {void}
 */
function beginTermination(sessionID) {
  const state = getTerminationState();
  const entry = state.get(sessionID) ?? {
    inFlight: 0,
    confirmed: false,
    deferred: [],
    releasing: false,
  };
  entry.inFlight += 1;
  state.set(sessionID, entry);
}

/**
 * Record how one termination attempt ended, and release whatever the pending
 * outcome was holding.
 *
 * Suppression lasts forever once some attempt confirmed the deletion, so a
 * failing attempt can never withdraw the suppression a successful one depends
 * on. Otherwise nothing was terminated and the session may still be alive, so
 * the caller releases: `releaseTermination` decides there whether every peer
 * has settled, since it must re-check that after each await regardless.
 *
 * @param {string} sessionID The session the attempt targeted.
 * @param {boolean} confirmed Whether this attempt deleted the session.
 * @returns {boolean} `true` when the caller must now call
 *   `releaseTermination` — that is, when no attempt on this session has
 *   confirmed a deletion, whether this one or an earlier one.
 */
function endTermination(sessionID, confirmed) {
  const state = getTerminationState();
  const entry = state.get(sessionID);
  if (!entry) {
    return false;
  }
  entry.inFlight -= 1;
  entry.confirmed = entry.confirmed || confirmed;
  if (entry.confirmed) {
    // The session is gone; anything it emitted on the way out was the
    // shutdown. Drop it as soon as that is known rather than after the last
    // attempt settles, so a peer that stalls cannot strand it.
    entry.deferred = [];
    return false;
  }
  // Whether a peer is still in flight is `releaseTermination`'s gate, which it
  // has to re-check after every await anyway; repeating it here would be a
  // second copy of the same rule that no behaviour depends on.
  return true;
}

/**
 * Report everything a failed termination was holding, then forget the session.
 *
 * The state stays in place for the whole drain, so an event arriving partway
 * through joins the end of the queue instead of overtaking what is already
 * held — the listener's arrival order survives the release. Each report is
 * isolated, so one failure neither stops the rest nor reaches `rp_terminate`.
 *
 * A release owns the session's state only while that state stays the one it
 * started on, unclaimed and unconfirmed. A termination beginning during a
 * report hands ownership to that newer attempt: draining its events would
 * report an outcome nobody knows yet, and deleting its state would lose the
 * marker it is about to earn. Every condition is therefore re-checked after
 * each await, and one release runs at a time, since a second would interleave
 * with this drain and could delete state this one still owns.
 *
 * @param {string} sessionID The session whose termination failed.
 * @returns {Promise<void>}
 */
async function releaseTermination(sessionID) {
  const state = getTerminationState();
  const entry = state.get(sessionID);
  if (!entry || entry.releasing) {
    return;
  }
  entry.releasing = true;
  while (state.get(sessionID) === entry && entry.inFlight === 0 && !entry.confirmed) {
    const next = entry.deferred.shift();
    if (!next) {
      state.delete(sessionID);
      break;
    }
    await isolateListener(next);
  }
  entry.releasing = false;
}

/**
 * Decide what a terminal event's arrival during a termination means.
 *
 * A confirmed deletion discards it: the session is gone, and the plugin
 * cannot tell a failure the delete provoked from one the session raised on
 * its own moments earlier — both carry the same type on the same session, and
 * `created` is a millisecond wall clock that cannot separate them. Suppressing
 * is the safe side of that ambiguity, since the spawner asked for this agent
 * to stop and a report about a session it just destroyed is not actionable.
 *
 * An unknown outcome holds it instead. Discarding on the mere intent to
 * terminate would lose a genuine failure for good when the delete turns out to
 * fail and the agent is still alive.
 *
 * @param {string} sessionID The session the event pertains to.
 * @param {() => Promise<void>} run Reports the event.
 * @returns {boolean} `true` when the termination took the event over.
 */
function withheldByTermination(sessionID, run) {
  const entry = getTerminationState().get(sessionID);
  if (!entry) {
    return false;
  }
  if (entry.confirmed) {
    return true;
  }
  entry.deferred.push(run);
  return true;
}

/**
 * Handle one event delivered to the terminal-event listener.
 *
 * Announces to the spawner of an RP-spawned session every failed turn and
 * every successful turn that sent no message (`messaged: false`, recorded by
 * `recordTurnEnd` before this runs): an agent reports in a message, so a
 * turn that ends without one leaves its spawner waiting on nothing. An
 * interrupt is a deliberate stop, not a fault. An event on a session
 * `rp_terminate` is deleting goes to `withheldByTermination`, which discards
 * it once a delete has confirmed — the end of a deliberate shutdown, not a
 * fault to report — and holds it while the outcome is unknown, so a delete
 * that fails still reports what the surviving session raised.
 * A failed turn is also recorded in the bounded error log (including the
 * structured error it carries, so `rp_status`'s `recentErrors` reports the
 * cause), and its announcement carries that cause. Announcements use steer
 * delivery, as agents' own messages do, so a working spawner still receives
 * them.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @param {{ ctx: object, readSession: Function }} deps `ctx` supplies
 *   `ctx.session.prompt` for the announcement; `readSession` reaches
 *   `resolveSession`.
 * @returns {Promise<void>}
 */
async function onTerminalEvent(event, { ctx, readSession }) {
  const sessionID = terminalEventSessionID(event);
  if (typeof sessionID !== "string") {
    return;
  }
  const failed = event?.type === "session.execution.failed";
  const unmessaged =
    event?.type === "session.execution.succeeded" && turnsFor(sessionID)?.lastTurn.messaged === false;
  if (!failed && !unmessaged) {
    return;
  }
  const entry = (await resolveSession(sessionID, { readSession })).spawn;
  if (!entry) {
    return;
  }
  const announce = (text) =>
    ctx.session.prompt({ sessionID: entry.spawner, text: `[rp] ${entry.name} (${sessionID}) ${text}`, delivery: "steer" });
  const report = async () => {
    if (!failed) {
      await announce("ended a turn without sending a message.");
      return;
    }
    const error = terminalEventError(event);
    const logEntry = { type: event.type, sessionID, at: Date.now() };
    if (error !== undefined) {
      logEntry.error = error;
    }
    recordError(logEntry);

    const cause = error !== undefined ? ` Cause: ${formatStructuredError(error)}` : "";
    await announce(`failed a turn.${cause}`);
  };

  if (withheldByTermination(sessionID, report)) {
    return;
  }
  await report();
}

/**
 * Build the `rp_terminate` tool descriptor.
 *
 * Marks the session as terminating *before* issuing the delete, because a
 * delete-associated `session.execution.failed` has been observed in the same
 * second as the request: marking on success would land too late to suppress
 * it. What produces that failure is not established — a clean interrupt
 * publishes `session.execution.interrupted`, which this plugin ignores, so it
 * is not the interrupt — and the suppression deliberately does not depend on
 * knowing.
 *
 * Suppression lasts forever once any attempt confirms the deletion, and
 * `releaseTermination` holds it in place while a peer attempt is still in
 * flight, so no failing attempt can withdraw what a concurrent successful one
 * depends on. A delete that terminated nothing and raced nothing leaves no
 * marker behind.
 *
 * While the outcome is unknown a terminal event is *held*, not dropped:
 * intent to terminate is not termination, and a delete that fails leaves a
 * live session whose failure its spawner still needs. Settling releases what
 * was held unless some attempt confirmed the deletion, and every released
 * report is isolated, so nothing that happens inside one can change what this
 * tool returns or raises.
 *
 * A transport throw is ambiguous — the server may have committed the delete
 * before the socket failed — and is treated as "not terminated", so anything
 * held is reported: a visible surplus report beats an invisible missing one.
 *
 * @param {{
 *   env: Record<string, string | undefined>,
 *   readServiceRecordOverride?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 * }} deps `env`/`readServiceRecordOverride` reach `resolveServer`;
 *   `requestFn` reaches the HTTP client.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildTerminateTool({ env, readServiceRecordOverride, requestFn }) {
  return {
    name: "rp_terminate",
    description: "Terminate a finished RP agent by deleting its opencode session.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        session: { type: "string", description: "Session ID of the finished agent." },
      },
      required: ["session"],
    },
    async execute({ session }) {
      const server = resolveServer({ env, readServiceRecord: readServiceRecordOverride });
      if (!server) {
        return toToolResult({ error: "server unreachable" });
      }
      // A terminal event that arrives while this delete is in flight is held
      // rather than dropped, so settling has to release it: the session is
      // still alive whenever nothing was terminated, and its failures are
      // still its spawner's business.
      const settle = async (confirmed) => {
        if (endTermination(session, confirmed)) {
          await releaseTermination(session);
        }
      };
      beginTermination(session);
      let response;
      try {
        response = await requestServer(
          server,
          "DELETE",
          `/api/session/${session}`,
          undefined,
          requestFn,
        );
      } catch (error) {
        await settle(false);
        throw error;
      }
      if (response.status === 404) {
        await settle(false);
        return toToolResult({ status: 404, error: "SessionNotFoundError" });
      }
      if (response.status < 200 || response.status >= 300) {
        await settle(false);
        return toToolResult({ status: response.status, error: "SessionTerminationFailed" });
      }
      await settle(true);
      return toToolResult({ terminated: true });
    },
  };
}

export {
  buildTerminateTool,
  onTerminalEvent,
};
