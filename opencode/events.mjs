/**
 * Consuming opencode's event stream for the daemon's lifetime, resubscribing
 * when it ends or fails.
 */

import { isolateListener, recordError } from "./diagnostics.mjs";

/**
 * Drive the plugin's event listeners from opencode's event stream.
 *
 * `ctx.event.subscribe()` takes no handler argument — it returns an
 * `AsyncIterable` that must itself be consumed with `for await`; it is not a
 * callback-registration API. Runs for the lifetime of the daemon process
 * (never resolves under real use), so callers invoke this without awaiting it.
 *
 * @param {object} ctx The plugin's opencode context (supplies `ctx.event`).
 * @param {(event: object) => Promise<void>} onEvent Called with each event
 *   the stream yields; a rejection is caught per event so one failing event
 *   never stops the loop from consuming the next.
 * @returns {Promise<void>} Resolves only if the stream itself ends.
 */
async function consumeEvents(ctx, onEvent, onIterator) {
  const iterator = ctx.event.subscribe()[Symbol.asyncIterator]();
  onIterator?.(iterator);
  try {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        return;
      }
      await isolateListener(() => onEvent(value));
    }
  } finally {
    onIterator?.(null);
  }
}

/**
 * Keep the event subscription alive for the daemon's lifetime, resubscribing
 * whenever the stream ends or fails, until the signal aborts.
 *
 * Teardown retains the live iterator and closes it with `return()` when the signal
 * aborts — otherwise a cleaned-up supervisor would stay blocked on `next()`
 * forever while a reloaded plugin starts another.
 *
 * The subscription feeds the progress-veto signal (see
 * `recordSessionEventActivity`); an unsupervised loss would silently stop
 * observation. Because the signal is veto-only, a gap can never *authorize*
 * an interrupt — resubscription just restores the protection.
 *
 * @param {object} ctx The plugin's opencode context.
 * @param {(event: object) => Promise<void>} onEvent Forwarded to `consumeEvents`.
 * @param {{ delayMs?: number, maxRestarts?: number, signal?: AbortSignal }} [options]
 *   Retry pacing; `maxRestarts` bounds the loop in tests (unbounded by
 *   default); `signal` tears the supervisor down (plugin cleanup).
 * @returns {Promise<void>} Resolves when `signal` aborts or `maxRestarts`
 *   is exhausted.
 */
async function superviseEvents(ctx, onEvent, { delayMs = 1_000, maxRestarts = Infinity, signal } = {}) {
  let activeIterator = null;
  const closeActive = () => {
    void activeIterator?.return?.().catch(() => {});
  };
  signal?.addEventListener("abort", closeActive, { once: true });
  try {
    for (let restarts = 0; restarts <= maxRestarts && !signal?.aborted; restarts++) {
      try {
        await consumeEvents(ctx, onEvent, (iterator) => {
          activeIterator = iterator;
          if (signal?.aborted) {
            closeActive();
          }
        });
        if (!signal?.aborted) {
          recordError({ type: "listener.ended", at: Date.now() });
        }
      } catch (error) {
        if (!signal?.aborted) {
          recordError({ type: "listener.lost", error: String(error), at: Date.now() });
        }
      }
      if (signal?.aborted) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  } finally {
    signal?.removeEventListener("abort", closeActive);
  }
}

export {
  superviseEvents,
};
