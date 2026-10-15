import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import {
  superviseEvents,
} from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

describe("superviseEvents", () => {
  test("resubscribes after the stream fails and after it ends, recording each loss", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    let subscriptions = 0;
    const ctx = {
      event: {
        subscribe() {
          subscriptions += 1;
          if (subscriptions === 1) {
            // eslint-disable-next-line require-yield
            return (async function* () {
              throw new Error("stream lost");
            })();
          }
          return (async function* () {})();
        },
      },
    };

    await superviseEvents(ctx, async () => {}, { delayMs: 1, maxRestarts: 1 });

    assert.equal(subscriptions, 2, "a lost subscription must be replaced");
    assert.ok(globalThis[ERROR_LOG_KEY].some((entry) => entry.type === "listener.lost"));
    assert.ok(globalThis[ERROR_LOG_KEY].some((entry) => entry.type === "listener.ended"));
  });
});

describe("superviseEvents teardown", () => {
  test("aborting the signal closes the retained iterator instead of leaving next() blocked", async () => {
    let returned = false;
    let releaseNext;
    const blockedNext = new Promise((resolve) => {
      releaseNext = resolve;
    });
    const ctx = {
      event: {
        subscribe() {
          return {
            [Symbol.asyncIterator]() {
              return {
                next: () => blockedNext,
                return: async () => {
                  returned = true;
                  releaseNext({ value: undefined, done: true });
                  return { value: undefined, done: true };
                },
              };
            },
          };
        },
      },
    };

    const abort = new AbortController();
    const supervisor = superviseEvents(ctx, async () => {}, { delayMs: 1, signal: abort.signal });
    await delay(5);
    abort.abort();
    await supervisor;
    assert.ok(returned, "teardown must close the live iterator via return()");
  });
});
