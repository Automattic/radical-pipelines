/**
 * Shared fixture for the opencode plugin's tests: a fake plugin context that
 * records every call, and the helpers that keep `setup()` off the real home
 * directory and free of leaked loop timers.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { disarmLoopTimer } from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const LOOP_TIMERS_KEY = Symbol.for("radical-pipelines.opencode.loopTimers");

/** Create a fresh, empty temp directory (used for materializeAgents overrides). */
function freshDir() {
  return mkdtempSync(join(tmpdir(), "rp-oc-plugin-"));
}

/** Clear every armed real timer, guarding against a test leaking one. */
async function clearAllLoopTimers() {
  const timers = globalThis[LOOP_TIMERS_KEY];
  if (timers) {
    await Promise.all([...timers.keys()].map((id) => disarmLoopTimer(id)));
  }
}

/**
 * Build a minimal fake opencode `ctx`, recording every call the plugin makes
 * against it, matching the restricted plugin ctx surface (`tool`, `skill`,
 * `agent`, `session`, `event`).
 */
function createFakeCtx({
  agents = [
    "radical-pipelines/spec-reviewer",
    "radical-pipelines/helper",
    "radical-pipelines/build-worker",
  ],
} = {}) {
  const tools = new Map();
  const addedSkills = [];
  const sessions = new Map();
  let nextID = 1;

  // Matches the real ctx.event.subscribe() contract: a zero-argument call
  // returning an AsyncIterable, consumed via `for await` — not a
  // callback-registration API. Verified live against opencode (a
  // callback-style stub masked the listener never actually running).
  let subscribeCalls = 0;
  let hookRegistrations = 0;
  let hookDisposals = 0;
  const hooks = new Map();
  const eventQueue = [];
  const eventWaiters = [];

  function pushEvent(event) {
    if (eventWaiters.length > 0) {
      eventWaiters.shift()({ value: event, done: false });
    } else {
      eventQueue.push(event);
    }
  }

  const ctx = {
    tool: {
      transform(fn) {
        const api = {
          add(descriptor) {
            tools.set(descriptor.name, descriptor);
            return api;
          },
        };
        fn(api);
      },
    },
    skill: {
      transform(fn) {
        const api = {
          list: () => [...addedSkills],
          add(skill) {
            addedSkills.push(skill);
            return api;
          },
          update() {
            return api;
          },
          remove() {
            return api;
          },
        };
        fn(api);
      },
    },
    agent: {
      // Matches the real ctx.agent.list() contract: async, envelope-wrapped
      // ({ location, data: Array<AgentInfo> }), verified live against the
      // tested runtime (a synchronous plain-array stub masked a real TypeError).
      async list() {
        return { data: agents };
      },
    },
    session: {
      async create({ agent, model, location, metadata }) {
        const id = `ses_${nextID++}`;
        sessions.set(id, { id, agent, model, location, metadata, title: undefined });
        return { id };
      },
      async prompt({ sessionID, text, delivery }) {
        if (!sessions.has(sessionID)) {
          // Matches the real ctx.session.prompt rejection for a dead target:
          // name/_tag "Session.NotFoundError" (with a dot), no HTTP status —
          // verified live against opencode.
          const error = new Error("Session.NotFoundError");
          error.name = "Session.NotFoundError";
          error._tag = "Session.NotFoundError";
          throw error;
        }
        return { sessionID, text, delivery };
      },
      // Matches the real ctx.session.hook contract: registers a model hook
      // by name and resolves to a disposable Registration.
      async hook(name, callback) {
        hookRegistrations += 1;
        hooks.set(name, callback);
        return {
          dispose: async () => {
            hookDisposals += 1;
          },
        };
      },
    },
    event: {
      subscribe() {
        subscribeCalls++;
        return {
          [Symbol.asyncIterator]() {
            return {
              next() {
                if (eventQueue.length > 0) {
                  return Promise.resolve({ value: eventQueue.shift(), done: false });
                }
                return new Promise((resolve) => eventWaiters.push(resolve));
              },
            };
          },
        };
      },
    },
  };

  return {
    ctx,
    tools,
    addedSkills,
    sessions,
    pushEvent,
    hooks,
    get subscribeCalls() {
      return subscribeCalls;
    },
    get hookRegistrations() {
      return hookRegistrations;
    },
    get hookDisposals() {
      return hookDisposals;
    },
  };
}

/** Options that keep every `setup()` call in this file off the real home dir. */
function isolatedDeps(overrides = {}) {
  return {
    agentsTargetDir: freshDir(),
    ...overrides,
  };
}

export { clearAllLoopTimers, createFakeCtx, freshDir, isolatedDeps };
