import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import plugin, {
  agentExists,
  appendSpawnProtocol,
  armLoopTimer,
  buildBasicAuthHeader,
  buildLedgerRows,
  buildStatusPayload,
  disarmLoopTimer,
  formatStructuredError,
  getSessionInbox,
  getSessionMessages,
  getSessionUpdatedAt,
  interruptSession,
  isDeadStreamMessage,
  isSessionActive,
  isSessionNotFoundError,
  isTerminalEvent,
  lastRawSessionProgressAt,
  lastSessionEventAt,
  lookupSpawn,
  observeHttpResponse,
  promoteInboxItem,
  readCliVersion,
  readPackageVersion,
  recordRawResponseStart,
  recordSessionEventActivity,
  readServiceRecordFile,
  recordSpawn,
  requestServer,
  resolveDeadStreamConfirmMs,
  resolveLoopRegistryPath,
  resolveRunningBuild,
  resolveServer,
  runLoopTick,
  setup,
  superviseEvents,
  terminalEventError,
  withTargetInterruptLock,
  terminalEventSessionID,
  toToolResult,
} from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");
const NOTIFIED_CHILDREN_KEY = Symbol.for("radical-pipelines.opencode.notifiedChildren");
const LOOP_TIMERS_KEY = Symbol.for("radical-pipelines.opencode.loopTimers");
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");
const LOOP_TICK_LOG_KEY = Symbol.for("radical-pipelines.opencode.loopTickLog");

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
  agents = ["spec-lead", "spec-reviewer", "build-writer-tdd"],
  legacySkillDraft = false,
} = {}) {
  const tools = new Map();
  const addedSkills = [];
  const skillSources = [];
  const sessions = new Map();
  let nextID = 1;

  // Matches the real ctx.event.subscribe() contract: a zero-argument call
  // returning an AsyncIterable, consumed via `for await` — not a
  // callback-registration API. Verified live against the pinned build (a
  // callback-style stub masked the listener never actually running).
  let subscribeCalls = 0;
  let hookRegistrations = 0;
  let hookDisposals = 0;
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
    // Matches the real ctx.skill.transform() draft contract: current builds
    // take fully-formed skills through add(); builds up to the previously
    // pinned one exposed source() instead, and calling it on a current build
    // dies with "sources.source is not a function". `legacySkillDraft` models
    // the older shape so both paths stay covered.
    skill: {
      transform(fn) {
        const api = legacySkillDraft
          ? {
              source(src) {
                skillSources.push(src);
                return api;
              },
            }
          : {
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
      // pinned build (a synchronous plain-array stub masked a real TypeError).
      async list() {
        return { data: agents };
      },
    },
    session: {
      async create({ agent, model, location }) {
        const id = `ses_${nextID++}`;
        sessions.set(id, { id, agent, model, location, title: undefined });
        return { id };
      },
      async prompt({ sessionID, text, delivery }) {
        if (!sessions.has(sessionID)) {
          // Matches the real ctx.session.prompt rejection for a dead target:
          // name/_tag "Session.NotFoundError" (with a dot), no HTTP status —
          // verified live against the pinned build.
          const error = new Error("Session.NotFoundError");
          error.name = "Session.NotFoundError";
          error._tag = "Session.NotFoundError";
          throw error;
        }
        return { sessionID, text, delivery };
      },
      // Matches the real ctx.session.hook contract: registers a model hook
      // and resolves to a disposable Registration.
      async hook() {
        hookRegistrations += 1;
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
    skillSources,
    sessions,
    pushEvent,
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
    agentsSourceDir: freshDir(),
    agentsTargetDir: freshDir(),
    ...overrides,
  };
}

describe("default export", () => {
  test("is {id, setup} with id equal to radical-pipelines@<package.json version>", () => {
    assert.equal(typeof plugin.setup, "function");
    assert.equal(plugin.id, `radical-pipelines@${readPackageVersion()}`);
  });
});

describe("setup: tool and skill registration", () => {
  afterEach(clearAllLoopTimers);

  test("registers exactly the eight named tools and the packaged skills", () => {
    const { ctx, tools, addedSkills } = createFakeCtx();

    setup(ctx, isolatedDeps({ env: {} }));

    assert.deepEqual(
      [...tools.keys()].sort(),
      [
        "rp_loop_cancel",
        "rp_loop_list",
        "rp_loop_start",
        "rp_permission_reply",
        "rp_send",
        "rp_spawn",
        "rp_status",
        "rp_terminate",
      ],
    );
    assert.deepEqual(
      addedSkills.map((skill) => skill.id),
      ["radical-pipelines"],
    );
    const skill = addedSkills[0];
    assert.equal(skill.name, "radical-pipelines");
    assert.match(skill.description, /autonomous software engineering pipeline/);
    assert.ok(skill.location.endsWith("skills/radical-pipelines/SKILL.md"));
    assert.ok(skill.content.startsWith("# Radical Pipelines"));
  });

  test("falls back to the directory source on builds whose draft still offers it", () => {
    const { ctx, addedSkills, skillSources } = createFakeCtx({ legacySkillDraft: true });

    setup(ctx, isolatedDeps({ env: {} }));

    assert.equal(addedSkills.length, 0);
    assert.equal(skillSources.length, 1);
    assert.equal(skillSources[0].type, "directory");
    assert.ok(skillSources[0].path.endsWith("skills"));
  });

  test("calling setup twice subscribes to events exactly once", () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const second = createFakeCtx();

    setup(first.ctx, isolatedDeps({ env: {} }));
    setup(second.ctx, isolatedDeps({ env: {} }));

    assert.equal(first.subscribeCalls + second.subscribeCalls, 1);
  });

  test("setup returns a cleanup that tears the observers down and lets a reloaded setup re-arm", async () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const cleanup = setup(first.ctx, isolatedDeps({ env: {} }));
    assert.equal(typeof cleanup, "function", "the plugin API expects setup to return its cleanup");
    assert.ok(globalThis[SETUP_ONCE_KEY], "the once-guard must be armed after setup");

    await cleanup();
    assert.equal(globalThis[SETUP_ONCE_KEY], undefined, "cleanup must clear the once-guard");
    assert.equal(first.hookDisposals, 1, "the location's own hook must be disposed");

    // A reloaded plugin's setup must be able to re-arm the observers.
    const second = createFakeCtx();
    const secondCleanup = setup(second.ctx, isolatedDeps({ env: {} }));
    assert.equal(second.subscribeCalls, 1, "a post-cleanup setup must resubscribe");
    await secondCleanup();
  });

  test("every location registers its own raw-liveness hook, and cleanup ownership is reference-counted", async () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const second = createFakeCtx();
    const firstCleanup = setup(first.ctx, isolatedDeps({ env: {} }));
    const secondCleanup = setup(second.ctx, isolatedDeps({ env: {} }));

    // The hook is location-scoped: the once-guard must not swallow the
    // second location's registration.
    await delay(0);
    assert.equal(first.hookRegistrations, 1);
    assert.equal(second.hookRegistrations, 1, "the second location must get its own hook");

    // A non-owner location's cleanup disposes only its own hook, never the
    // shared observers or another location's registration.
    await secondCleanup();
    assert.equal(second.hookDisposals, 1);
    assert.equal(first.hookDisposals, 0, "another location's hook must survive");
    assert.ok(globalThis[SETUP_ONCE_KEY], "the shared observers must survive while a location is live");

    // Double-invoking one cleanup must not release another's reference.
    await secondCleanup();
    assert.ok(globalThis[SETUP_ONCE_KEY], "a repeated cleanup must not double-release");

    await firstCleanup();
    assert.equal(first.hookDisposals, 1);
    assert.equal(globalThis[SETUP_ONCE_KEY], undefined, "the last location's cleanup tears down the shared resources");
  });

  test("a materialization collision with a pre-existing foreign agent file is surfaced via rp_status's recentErrors", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const sourceDir = freshDir();
    const targetDir = freshDir();
    writeFileSync(join(sourceDir, "spec-lead.md"), "# RP spec-lead\n");
    writeFileSync(join(targetDir, "spec-lead.md"), "# foreign spec-lead, not RP-owned\n");

    const { ctx, tools } = createFakeCtx();
    setup(ctx, {
      env: {},
      agentsSourceDir: sourceDir,
      agentsTargetDir: targetDir,
      readServiceRecord: () => null,
      readCliVersion: () => null,
    });

    const result = (await tools.get("rp_status").execute({}, {})).output;
    assert.ok(
      result.recentErrors.some(
        (entry) => entry.type === "agent.materialize.collision" && entry.name === "spec-lead.md",
      ),
      `expected a materialize-collision entry for spec-lead.md, got: ${JSON.stringify(result.recentErrors)}`,
    );
  });
});

describe("rp_spawn", () => {
  afterEach(clearAllLoopTimers);

  test("rejects an agent not in ctx.agent.list() before any session.create", async () => {
    const { ctx, tools, sessions } = createFakeCtx({ agents: ["spec-lead"] });
    setup(ctx, isolatedDeps({ env: {} }));

    await assert.rejects(() =>
      tools.get("rp_spawn").execute(
        {
          name: "spec-reviewer-1",
          agent: "not-a-real-agent",
          model: "anthropic/claude-3-opus",
          directory: "/repo/worktree",
          prompt: "begin",
          run: "144-opencode-support",
        },
        { sessionID: "ses_orchestrator" },
      ),
    );
    assert.equal(sessions.size, 0);
  });

  test("on a valid agent, creates the session seated at directory, records the ledger entry with spawner = toolCtx.sessionID plus the seat and its repo root, and returns the created session ID", async () => {
    const { ctx, tools, sessions } = createFakeCtx({ agents: ["spec-reviewer"] });
    setup(ctx, isolatedDeps({ env: {}, resolveRepoRootFn: (directory) => `${directory}-repo-root` }));

    let initialPrompt;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      initialPrompt = args;
      return originalPrompt(args);
    };

    const result = await tools.get("rp_spawn").execute(
      {
        name: "spec-reviewer-1",
        agent: "spec-reviewer",
        model: "anthropic/claude-3-opus#thinking",
        directory: "/repo/worktree",
        prompt: "begin the review",
        run: "144-opencode-support",
      },
      { sessionID: "ses_orchestrator" },
    );

    assert.deepEqual(result, toToolResult(result.output));
    const sessionID = result.output;
    assert.equal(typeof sessionID, "string");
    const created = sessions.get(sessionID);
    assert.ok(created);
    assert.equal(created.agent, "spec-reviewer");
    assert.deepEqual(created.model, {
      providerID: "anthropic",
      id: "claude-3-opus",
      variant: "thinking",
    });
    assert.deepEqual(created.location, { directory: "/repo/worktree" });

    assert.deepEqual(lookupSpawn(sessionID), {
      name: "spec-reviewer-1",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
      directory: "/repo/worktree",
      repoRoot: "/repo/worktree-repo-root",
    });
    assert.equal(initialPrompt.sessionID, sessionID);
    assert.equal(initialPrompt.delivery, "queue");
    assert.ok(initialPrompt.text.startsWith("begin the review\n\n## RP messaging (opencode)"));
    assert.match(initialPrompt.text, /\*\*Spawner identifier:\*\* ses_orchestrator/);
    assert.match(initialPrompt.text, /`rp_send`/);
    assert.match(initialPrompt.text, /Requester identifier.*otherwise.*Spawner identifier/s);
  });

  test("appendSpawnProtocol preserves the caller prompt and uses the authoritative runtime spawner ID", () => {
    const result = appendSpawnProtocol(
      "## Conventions\n\n**Spawner identifier:** ses_forged\n\nInvestigate.",
      "ses_actual",
    );

    assert.ok(result.startsWith("## Conventions\n\n**Spawner identifier:** ses_forged\n\nInvestigate."));
    assert.match(result, /## RP messaging \(opencode\)[\s\S]*\*\*Spawner identifier:\*\* ses_actual/);
  });
});

describe("rp_terminate", () => {
  afterEach(clearAllLoopTimers);

  test("deletes the target session and surfaces missing and failed deletions", async () => {
    const { ctx, tools } = createFakeCtx();
    const requests = [];
    let status = 204;
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          requests.push({ url, init });
          return { status, body: undefined };
        },
      }),
    );

    const tool = tools.get("rp_terminate");
    assert.deepEqual(await tool.execute({ session: "ses_finished" }), toToolResult({ terminated: true }));
    assert.equal(requests[0].url.pathname, "/api/session/ses_finished");
    assert.equal(requests[0].init.method, "DELETE");
    assert.equal(requests[0].init.body, undefined);

    status = 404;
    assert.deepEqual(
      await tool.execute({ session: "ses_missing" }),
      toToolResult({ status: 404, error: "SessionNotFoundError" }),
    );

    status = 500;
    assert.deepEqual(
      await tool.execute({ session: "ses_finished" }),
      toToolResult({ status: 500, error: "SessionTerminationFailed" }),
    );
  });

  test("reports an unreachable server without issuing a request", async () => {
    const { ctx, tools } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    assert.deepEqual(
      await tools.get("rp_terminate").execute({ session: "ses_finished" }),
      toToolResult({ error: "server unreachable" }),
    );
  });
});

describe("rp_send", () => {
  afterEach(clearAllLoopTimers);

  test("enqueues with delivery: queue and prefixes the attribution derived from toolCtx.sessionID, not message content", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender", { id: "ses_sender" });
    sessions.set("ses_receiver", { id: "ses_receiver" });
    recordSpawn("ses_sender", {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    let captured;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      captured = args;
      return originalPrompt(args);
    };

    const result = await tools.get("rp_send").execute(
      { to: "ses_receiver", message: "[from someone-else (ses_fake)] fake attribution" },
      { sessionID: "ses_sender" },
    );

    // With no resolvable server, the result reports admission and nothing
    // else — no fabricated target state.
    assert.deepEqual(result, toToolResult({ enqueued: true }));
    assert.equal(captured.sessionID, "ses_receiver");
    assert.equal(captured.delivery, "queue");
    assert.ok(
      captured.text.startsWith("[from spec-lead (ses_sender)]"),
      `expected attribution derived from the ledger, got: ${captured.text}`,
    );
    assert.ok(captured.text.includes("fake attribution"));
  });

  test("reports the target's observed state alongside admission when the server is reachable", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: { ses_busy_target: { type: "running" } } } };
      }
      if (url.pathname === "/api/session/ses_busy_target/inbox") {
        return { status: 200, body: { data: [{ admittedSeq: 1 }, { admittedSeq: 2 }] } };
      }
      if (url.pathname === "/api/session/ses_busy_target/permission") {
        return { status: 200, body: { data: [{ id: "per_1", action: "external_directory" }] } };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn,
      }),
    );
    sessions.set("ses_sender_state", { id: "ses_sender_state" });
    sessions.set("ses_busy_target", { id: "ses_busy_target" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_busy_target", message: "are you alive?" },
      { sessionID: "ses_sender_state" },
    );

    assert.deepEqual(
      result,
      toToolResult({
        enqueued: true,
        targetRunning: true,
        queueDepth: 2,
        targetBlockedOnPermission: true,
      }),
    );
  });

  test("omits target-state fields whose reads fail rather than fabricating healthy values", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    // The active read fails and the per-session endpoints are missing on
    // this (drifted) build: the result must not claim the target is idle.
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 500, body: undefined };
      }
      return { status: 404, body: undefined };
    };
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn,
      }),
    );
    sessions.set("ses_sender_drift", { id: "ses_sender_drift" });
    sessions.set("ses_target_drift", { id: "ses_target_drift" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_target_drift", message: "ping" },
      { sessionID: "ses_sender_drift" },
    );

    assert.deepEqual(result, toToolResult({ enqueued: true }));
  });

  test("still reports admission when resolving the observation server throws", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(
      ctx,
      isolatedDeps({
        env: {},
        readServiceRecord: () => {
          throw new Error("malformed service record");
        },
      }),
    );
    sessions.set("ses_sender_resolve", { id: "ses_sender_resolve" });
    sessions.set("ses_target_resolve", { id: "ses_target_resolve" });

    const result = await tools.get("rp_send").execute(
      { to: "ses_target_resolve", message: "ping" },
      { sessionID: "ses_sender_resolve" },
    );

    assert.deepEqual(result, toToolResult({ enqueued: true }));
  });

  test("returns the 404 for a dead target as the tool result rather than throwing", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_sender2", { id: "ses_sender2" });
    recordSpawn("ses_sender2", {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    const result = await tools.get("rp_send").execute(
      { to: "ses_dead_target", message: "hello?" },
      { sessionID: "ses_sender2" },
    );

    assert.deepEqual(result, toToolResult({ status: 404, error: "SessionNotFoundError" }));
  });
});

describe("resolveServer", () => {
  test("returns the service record's {url, password} as {baseURL, password} when a record is present", () => {
    const result = resolveServer({
      env: {},
      readServiceRecord: () => ({ url: "http://127.0.0.1:4096", password: "record-pw" }),
    });
    assert.deepEqual(result, { baseURL: "http://127.0.0.1:4096", password: "record-pw" });
  });

  test("falls back to RP_OPENCODE_SERVER_URL + OPENCODE_PASSWORD when no record is present", () => {
    const result = resolveServer({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9000", OPENCODE_PASSWORD: "env-pw" },
      readServiceRecord: () => null,
    });
    assert.deepEqual(result, { baseURL: "http://127.0.0.1:9000", password: "env-pw" });
  });

  test("returns null when neither the service record nor both env vars resolve", () => {
    assert.equal(resolveServer({ env: {}, readServiceRecord: () => null }), null);
    assert.equal(
      resolveServer({ env: { RP_OPENCODE_SERVER_URL: "http://x" }, readServiceRecord: () => null }),
      null,
    );
  });
});

describe("readServiceRecordFile", () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "service-record-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("reads and parses the service-*.json file naming the current process under XDG_STATE_HOME/opencode", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service-abc123.json"),
      JSON.stringify({ url: "http://127.0.0.1:4096", password: "pw", version: "0.0.0-next-1", pid: 111 }),
    );

    assert.deepEqual(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), {
      url: "http://127.0.0.1:4096",
      password: "pw",
      version: "0.0.0-next-1",
      pid: 111,
    });
  });

  test("reads and parses the bare service.json file naming the current process", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49374", password: "pw", version: "0.0.0-next-2", pid: 222 }),
    );

    assert.deepEqual(readServiceRecordFile({ XDG_STATE_HOME: root }, 222), {
      url: "http://127.0.0.1:49374",
      password: "pw",
      version: "0.0.0-next-2",
      pid: 222,
    });
  });

  test("picks the record naming the current process among records of live sibling servers", () => {
    // The state directory is shared across concurrently running opencode
    // instances: records for other live processes routinely sit alongside,
    // and those siblings share on-disk session storage while holding
    // unrelated in-memory state. Identity turns on pid, never on mtime.
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    const own = join(stateDir, "service-abc123.json");
    writeFileSync(
      own,
      JSON.stringify({ url: "http://127.0.0.1:4096", password: "own", version: "0.0.0-next-1", pid: 111 }),
    );
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49375", password: "sibling", version: "local", pid: 222 }),
    );
    // Age the matching record so the assertion turns on pid rather than on
    // mtime or readdir order.
    const past = new Date(Date.now() - 60_000);
    utimesSync(own, past, past);

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111).password, "own");
  });

  test("picks the newest valid record when more than one record names the current pid", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    const stale = join(stateDir, "service-old.json");
    writeFileSync(
      stale,
      JSON.stringify({ url: "http://127.0.0.1:4000", password: "stale", version: "old", pid: 111 }),
    );
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:5000", password: "current", version: "new", pid: 111 }),
    );
    const past = new Date(Date.now() - 60_000);
    utimesSync(stale, past, past);

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111).password, "current");
  });

  test("returns null when no record names the current process", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "service.json"),
      JSON.stringify({ url: "http://127.0.0.1:49375", password: "sibling", version: "local", pid: 222 }),
    );

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });

  test("returns null when the service record directory does not exist", () => {
    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: join(root, "missing") }, 111), null);
  });

  test("returns null when the directory exists but holds no service record", () => {
    mkdirSync(join(root, "opencode"), { recursive: true });
    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });

  test("ignores a service record lock file left alongside the record", () => {
    const stateDir = join(root, "opencode");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "service-abc123.json.lock"), "");

    assert.equal(readServiceRecordFile({ XDG_STATE_HOME: root }, 111), null);
  });
});

describe("HTTP client over node:http", () => {
  test("buildBasicAuthHeader base64-encodes opencode:<password>", () => {
    assert.equal(
      buildBasicAuthHeader("secret"),
      `Basic ${Buffer.from("opencode:secret").toString("base64")}`,
    );
  });

  test("requestServer resolves the path against baseURL, sets the method, and sends the Basic-auth header built from the resolved password", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ url, init });
      return { status: 200, body: { ok: true } };
    };

    const result = await requestServer(
      { baseURL: "http://127.0.0.1:4096", password: "secret" },
      "GET",
      "/api/session",
      undefined,
      requestFn,
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.toString(), "http://127.0.0.1:4096/api/session");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, buildBasicAuthHeader("secret"));
    assert.deepEqual(result, { status: 200, body: { ok: true } });
  });

  test("requestServer JSON-encodes a POST body and uses only the injected request function (no real node:http call)", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ url, init });
      return { status: 204, body: undefined };
    };

    await requestServer(
      { baseURL: "http://127.0.0.1:4096", password: "secret" },
      "POST",
      "/api/session/ses_1/rename",
      { title: "rp:run:name" },
      requestFn,
    );

    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.body, JSON.stringify({ title: "rp:run:name" }));
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  });
});

describe("isSessionActive", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns true when the session ID is a key of /api/session/active's data envelope", async () => {
    const requestFn = async () => ({ status: 200, body: { data: { ses_1: { type: "running" } } } });
    assert.equal(await isSessionActive(server, "ses_1", requestFn), true);
  });

  test("returns false when the session ID is absent from the data envelope", async () => {
    const requestFn = async () => ({ status: 200, body: { data: {} } });
    assert.equal(await isSessionActive(server, "ses_1", requestFn), false);
  });

  test("throws on a non-2xx response instead of reporting the session idle", async () => {
    // A failed read means "unknown", not "idle": defaulting to idle is how a
    // health-loop tick ends up injecting into a busy session.
    const requestFn = async () => ({ status: 500, body: undefined });
    await assert.rejects(
      () => isSessionActive(server, "ses_1", requestFn),
      /returned 500/,
    );
  });
});

describe("getSessionUpdatedAt", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the session's time.updated timestamp", async () => {
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1");
      return { status: 200, body: { data: { time: { updated: 123456 } } } };
    };

    assert.equal(await getSessionUpdatedAt(server, "ses_1", requestFn), 123456);
  });

  test("throws when the session read fails or omits time.updated", async () => {
    await assert.rejects(
      () => getSessionUpdatedAt(server, "ses_1", async () => ({ status: 500 })),
      /returned 500/,
    );
    await assert.rejects(
      () => getSessionUpdatedAt(server, "ses_1", async () => ({ status: 200, body: { data: {} } })),
      /missing time.updated/,
    );
  });
});

describe("getSessionInbox", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the pending inbox items, defaulting to empty", async () => {
    const items = [{ id: "inb_1", delivery: "steer", payload: { text: "check" } }];
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1/inbox");
      return { status: 200, body: { data: items } };
    };

    assert.deepEqual(await getSessionInbox(server, "ses_1", requestFn), items);
    assert.deepEqual(await getSessionInbox(server, "ses_1", async () => ({ status: 200 })), []);
  });

  test("throws on a failed read rather than reporting an empty inbox", async () => {
    await assert.rejects(() => getSessionInbox(server, "ses_1", async () => ({ status: 500 })), /returned 500/);
  });
});

describe("getSessionMessages", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("returns the newest-first message list, defaulting to empty", async () => {
    const messages = [
      { id: "msg_2", type: "assistant", finish: "error" },
      { id: "msg_1", type: "user", text: "check" },
    ];
    const requestFn = async (url) => {
      assert.equal(url.pathname, "/api/session/ses_1/message");
      assert.equal(url.search, "?limit=200", "the read must out-page the server's default so anchors age slowly");
      return { status: 200, body: { data: messages } };
    };

    assert.deepEqual(await getSessionMessages(server, "ses_1", requestFn), messages);
    assert.deepEqual(await getSessionMessages(server, "ses_1", async () => ({ status: 200 })), []);
  });

  test("throws on a failed read", async () => {
    await assert.rejects(() => getSessionMessages(server, "ses_1", async () => ({ status: 500 })), /returned 500/);
  });
});

describe("interruptSession", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("posts an interrupt that resumes execution with pending steering input", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ path: url.pathname + url.search, method: init.method });
      return { status: 204 };
    };

    await interruptSession(server, "ses_1", requestFn);
    assert.deepEqual(calls, [{ path: "/api/session/ses_1/interrupt?continue=true", method: "POST" }]);
  });

  test("throws on a non-2xx response", async () => {
    await assert.rejects(() => interruptSession(server, "ses_1", async () => ({ status: 404 })), /returned 404/);
  });
});

describe("promoteInboxItem", () => {
  const server = { baseURL: "http://127.0.0.1:4096", password: "pw" };

  test("posts the queue-to-steer promotion for the given inbox item", async () => {
    const calls = [];
    const requestFn = async (url, init) => {
      calls.push({ path: url.pathname, method: init.method });
      return { status: 204 };
    };

    await promoteInboxItem(server, "ses_1", "inb_1", requestFn);
    assert.deepEqual(calls, [{ path: "/api/session/ses_1/inbox/inb_1/steer", method: "POST" }]);
  });

  test("throws on a non-2xx response", async () => {
    await assert.rejects(() => promoteInboxItem(server, "ses_1", "inb_1", async () => ({ status: 404 })), /returned 404/);
  });
});

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
    assert.ok(returned, "teardown must close the pinned iterator via return()");
  });
});

describe("resolveDeadStreamConfirmMs", () => {
  test("defaults to one hour and honors a positive numeric override", () => {
    assert.equal(resolveDeadStreamConfirmMs({}), 3_600_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "4000" }), 4_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "bogus" }), 3_600_000);
    assert.equal(resolveDeadStreamConfirmMs({ RP_LOOP_DEAD_STREAM_CONFIRM_MS: "-5" }), 3_600_000);
  });
});

describe("recordSessionEventActivity / lastSessionEventAt", () => {
  test("records execution-progress events only, keeping the newest observation per session", () => {
    recordSessionEventActivity({ type: "session.tool.input.started", data: { sessionID: "ses_activity_test" } }, 1_000);
    recordSessionEventActivity({ type: "session.text.ended", data: { sessionID: "ses_activity_test" } }, 2_000);
    // Inbox and metadata traffic can surround a hung session indefinitely
    // and must never defer its recovery.
    recordSessionEventActivity({ type: "session.inbox.delivered", data: { sessionID: "ses_activity_test" } }, 3_000);
    recordSessionEventActivity({ type: "permission.asked", data: { sessionID: "ses_activity_test" } }, 4_000);
    recordSessionEventActivity({ type: "server.heartbeat", data: {} }, 5_000);
    recordSessionEventActivity({ data: { sessionID: "ses_activity_test" } }, 6_000);

    assert.equal(lastSessionEventAt("ses_activity_test"), 2_000);
    assert.equal(lastSessionEventAt("ses_activity_never_seen"), undefined);
  });

  test("a delayed event is stamped with its own creation time, not the consumption time", () => {
    // An old event draining from a lagged queue must not masquerade as
    // fresh progress and re-arm the dead-stream window.
    recordSessionEventActivity({
      type: "session.text.delta",
      created: 1_234,
      data: { sessionID: "ses_activity_delayed" },
    });
    assert.equal(lastSessionEventAt("ses_activity_delayed"), 1_234);
  });

  test("an older event refreshing the entry never regresses a newer timestamp", () => {
    recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: "ses_activity_order" } }, 5_000);
    recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: "ses_activity_order" } }, 3_000);
    assert.equal(lastSessionEventAt("ses_activity_order"), 5_000);
  });

  test("evidence ages out but is never crowded out", () => {
    // Aged entries are pruned once the map grows...
    for (let i = 0; i < 300; i++) {
      recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: `ses_aged_${i}` } }, i);
    }
    recordSessionEventActivity(
      { type: "session.text.delta", data: { sessionID: "ses_aged_fresh" } },
      86_400_000 + 1_000,
    );
    assert.equal(lastSessionEventAt("ses_aged_0"), undefined, "aged entries must be pruned");
    assert.equal(lastSessionEventAt("ses_aged_fresh"), 86_400_000 + 1_000);

    // ...but volume alone never evicts recent liveness: converting an
    // observed byte into apparent silence could authorize interrupting a
    // live stream.
    const base = 86_400_000 + 2_000;
    for (let i = 0; i < 300; i++) {
      recordSessionEventActivity({ type: "session.text.delta", data: { sessionID: `ses_recent_${i}` } }, base + i);
    }
    assert.equal(lastSessionEventAt("ses_recent_0"), base, "recent entries must survive any volume");
    assert.equal(lastSessionEventAt("ses_recent_299"), base + 299);
  });
});

describe("observeHttpResponse / lastRawSessionProgressAt", () => {
  test("tees the provider response so each streamed chunk records raw progress, bytes untouched", async () => {
    const encoder = new TextEncoder();
    const chunks = ["data: one\n\n", "data: two\n\n"];
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    const input = {
      sessionID: "ses_raw_progress_test",
      response: new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }),
    };

    const before = Date.now();
    observeHttpResponse(input);
    const arrival = lastRawSessionProgressAt("ses_raw_progress_test");
    assert.equal(arrival.open.length, 1, "the arrival must open a response generation");
    assert.ok(arrival.open[0].startedAt >= before);

    const received = await input.response.text();
    assert.equal(received, chunks.join(""), "the tee must pass the bytes through untouched");
    const record = lastRawSessionProgressAt("ses_raw_progress_test");
    assert.ok(record.lastAt >= before, "each streamed chunk must refresh the raw-progress timestamp");
    assert.equal(record.open.length, 0, "a completed stream must close its generation — identity, not history");
    assert.equal(input.response.status, 200);
  });

  test("captures identifier values from consumed bytes, across chunk boundaries", async () => {
    const encoder = new TextEncoder();
    // The id value is split across two chunks: the tail carry must join it.
    const chunks = ['data: {"id":"call_', 'boundary_test","choices":[]}\n\n'];
    const body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        // Held open: the generation must stay open with its ids readable.
      },
    });
    const input = {
      sessionID: "ses_raw_ids_test",
      response: new Response(body, { status: 200 }),
    };
    observeHttpResponse(input);
    const reader = input.response.body.getReader();
    await reader.read();
    await reader.read();

    const record = lastRawSessionProgressAt("ses_raw_ids_test");
    assert.equal(record.open.length, 1);
    assert.ok(
      record.open[0].ids.includes("call_boundary_test"),
      `expected the split id to be captured, got: ${JSON.stringify(record.open[0].ids)}`,
    );
  });

  test("a session reusing an aged record cannot prune it out from under its own new response", () => {
    // Seed enough aged sessions to trigger pruning, including an aged
    // record for the session about to be reused.
    const base = 10_000_000_000;
    recordRawResponseStart("ses_reuse_detach", base - 90_000_000);
    for (let i = 0; i < 300; i++) {
      recordRawResponseStart(`ses_reuse_filler_${i}`, base - 89_000_000);
    }
    // The reused session's new response must land in the *live* record.
    recordRawResponseStart("ses_reuse_detach", base);
    const record = lastRawSessionProgressAt("ses_reuse_detach");
    assert.ok(record, "the reused record must survive its own arrival's pruning");
    assert.equal(
      record.open.filter((generation) => generation.startedAt === base).length,
      1,
      "the new generation must be attached to the live record",
    );
  });

  test("open generations are pruned by age only, never by count", () => {
    const base = 20_000_000_000;
    for (let i = 0; i < 12; i++) {
      recordRawResponseStart("ses_gen_volume", base + i);
    }
    assert.equal(
      lastRawSessionProgressAt("ses_gen_volume").open.length,
      12,
      "volume alone must never evict a live generation",
    );

    // Aged-out generations do get pruned on the next observation.
    recordRawResponseStart("ses_gen_volume", base + 86_400_000 + 1_000);
    assert.equal(
      lastRawSessionProgressAt("ses_gen_volume").open.length,
      1,
      "generations older than the retention must age out",
    );
  });

  test("a body-less response records the arrival without opening a generation", () => {
    const input = { sessionID: "ses_raw_progress_nobody", response: { status: 204, body: null } };
    observeHttpResponse(input);
    const record = lastRawSessionProgressAt("ses_raw_progress_nobody");
    assert.ok(record?.lastAt !== undefined);
    assert.deepEqual(record.open, [], "nothing can hang mid-stream without a body");
    assert.equal(input.response.status, 204, "the response must be left as-is");
  });

});

describe("withTargetInterruptLock", () => {
  test("serializes critical sections per target while leaving other targets unblocked", async () => {
    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const first = withTargetInterruptLock("ses_lock_a", async () => {
      order.push("a1:start");
      await firstGate;
      order.push("a1:end");
    });
    const second = withTargetInterruptLock("ses_lock_a", async () => {
      order.push("a2");
    });
    const other = withTargetInterruptLock("ses_lock_b", async () => {
      order.push("b");
    });

    await other;
    assert.deepEqual(order, ["a1:start", "b"], "a different target must not wait behind the lock");
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(order, ["a1:start", "b", "a1:end", "a2"], "same-target sections must serialize in order");
  });
});

describe("isDeadStreamMessage", () => {
  test("matches only an unfinished message whose last part is a tool call stuck streaming", () => {
    assert.equal(
      isDeadStreamMessage({
        content: [{ type: "text", text: "spawning" }, { type: "tool", state: { status: "streaming" } }],
      }),
      true,
    );
  });

  test("an executing tool anywhere in the message vetoes, even behind a trailing streaming part", () => {
    // Completed tool calls execute concurrently with the remaining stream,
    // so `[running, streaming]` is legitimate work in flight: interrupting
    // it would kill the running tool.
    assert.equal(
      isDeadStreamMessage({
        content: [
          { type: "tool", id: "call_1", name: "shell", state: { status: "running" } },
          { type: "tool", id: "call_2", name: "rp_spawn", state: { status: "streaming", input: "" } },
        ],
      }),
      false,
    );
  });

  test("rejects finished, errored, executing-tool, and absent messages", () => {
    assert.equal(isDeadStreamMessage(null), false);
    assert.equal(
      isDeadStreamMessage({ finish: "error", content: [{ type: "tool", state: { status: "streaming" } }] }),
      false,
    );
    assert.equal(
      isDeadStreamMessage({ error: { type: "aborted" }, content: [{ type: "tool", state: { status: "streaming" } }] }),
      false,
    );
    assert.equal(isDeadStreamMessage({ content: [{ type: "tool", state: { status: "running" } }] }), false);
    assert.equal(isDeadStreamMessage({ content: [{ type: "text", text: "thinking" }] }), false);
    assert.equal(isDeadStreamMessage({ content: [] }), false);
  });
});

describe("runLoopTick", () => {
  const entry = { id: "loop_1", interval: 1000, prompt: "check", targetSession: "ses_target" };

  test("a null server resolution records a no-server outcome without checking activity or injecting", async () => {
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: null,
      isSessionActive: () => {
        throw new Error("must not be called when server is null");
      },
      getSessionUpdatedAt: () => {
        throw new Error("must not be called when server is null");
      },
      injectPrompt: () => {
        throw new Error("must not be called when server is null");
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });

    assert.deepEqual(result, { outcome: "no-server" });
    assert.deepEqual(outcomes, [result]);
  });

  test("a target updated no more than two intervals ago records busy with its last activity", async () => {
    let injected = 0;
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 8_000,
      injectPrompt: async () => {
        injected++;
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "busy", lastActivity: 8_000 });
    assert.deepEqual(outcomes, [result]);
    assert.equal(injected, 0);
  });

  test("a target still active more than two intervals after its last activity receives a steer prompt", async () => {
    const calls = [];
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 7_999,
      getInbox: async () => [],
      getMessages: async () => [],
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push({ sessionID, text, delivery });
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      now: () => 10_000,
    });

    assert.deepEqual(result, {
      outcome: "injected",
      reason: "stale-running",
      lastActivity: 7_999,
    });
    assert.deepEqual(outcomes, [result]);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { sessionID: "ses_target", text: "check", delivery: "steer" });
  });

  test("an idle target receives one queued prompt without a session-record read", async () => {
    const calls = [];
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getSessionUpdatedAt: () => {
        throw new Error("must not read activity for an idle target");
      },
      getInbox: async () => [],
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push({ sessionID, text, delivery });
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.deepEqual(outcomes, [result]);
    assert.deepEqual(calls, [{ sessionID: "ses_target", text: "check", delivery: "queue" }]);
  });

  test("a failed tick records the failure before rejecting", async () => {
    const outcomes = [];

    await assert.rejects(
      () =>
        runLoopTick(entry, {
          server: { baseURL: "http://x", password: "y" },
          isSessionActive: async () => {
            throw new Error("active read failed");
          },
          getSessionUpdatedAt: async () => 0,
          injectPrompt: async () => {},
          onOutcome: (outcome) => outcomes.push(outcome),
        }),
      /active read failed/,
    );

    assert.deepEqual(outcomes, [{ outcome: "failed", error: "Error: active read failed" }]);
  });

  test("cancellation during a state read records cancellation without injecting", async () => {
    const outcomes = [];
    let cancelled = false;
    let injected = false;
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => {
        cancelled = true;
        return false;
      },
      getSessionUpdatedAt: async () => 0,
      injectPrompt: async () => {
        injected = true;
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      isCancelled: () => cancelled,
    });

    assert.deepEqual(result, { outcome: "cancelled" });
    assert.deepEqual(outcomes, [result]);
    assert.equal(injected, false);
  });

  test("an idle target with this loop's prompt still pending in its inbox is not injected again", async () => {
    const outcomes = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: () => {
        throw new Error("must not read messages while the prompt is pending");
      },
      injectPrompt: () => {
        throw new Error("must not duplicate a pending prompt");
      },
      onOutcome: (outcome) => outcomes.push(outcome),
      state: {},
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "pending-delivery" });
    assert.deepEqual(outcomes, [result]);
  });

  test("an injection answered only by an error-finish turn backs off, then probes again", async () => {
    const state = {};
    const calls = [];
    let messages = [];
    let nextID = 0;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push(delivery);
        nextID += 1;
        return { data: { id: `usr_${nextID}` } };
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    // Tick 1: first injection, anchored on the admitted input's ID.
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.deepEqual(state.lastInjection, { id: "usr_1", at: 10_000, evaluated: false });

    // The injected turn fails instantly (network down, quota exhausted...).
    messages = [
      { id: "as_1", type: "assistant", finish: "error", time: { created: 10_500 } },
      { id: "usr_1", type: "user", text: "check" },
    ];

    // Tick 2: the failed probe is detected once and starts the backoff.
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });

    // Tick 3: the injection is suppressed by the backoff, but the target is
    // still inspected (the tick reaches the idle branch's own reads).
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "backoff",
      remaining: 0,
    });

    // Tick 4: the backoff expired — the loop probes again.
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.deepEqual(calls, ["queue", "queue"]);
  });

  test("consecutive failed probes double the backoff up to its cap", async () => {
    const state = { lastInjection: { id: "usr_1", at: 10_000, evaluated: false }, backoffLevel: 2 };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", finish: "error", time: { created: 10_500 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject while backing off");
      },
      onOutcome: () => {},
      now: () => 20_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 3,
      skips: 7,
    });

    // A fourth consecutive failure stays at the cap.
    state.backoffSkips = 0;
    state.lastInjection = { id: "usr_1", at: 10_000, evaluated: false };
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 4,
      skips: 7,
    });
  });

  test("a successful turn after an injection ends the backoff and injects normally", async () => {
    const state = { lastInjection: { id: "usr_1", at: 10_000, evaluated: false }, backoffLevel: 3, backoffSkips: 5 };
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", finish: "stop", time: { created: 10_500 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: async (sessionID, text, delivery) => calls.push(delivery),
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.equal(state.backoffLevel, 0);
    assert.equal(state.backoffSkips, 0, "a success must end a pending skip window");
    assert.deepEqual(calls, ["queue"]);
  });

  test("with only timestamp anchoring, an error turn older than the injection does not trigger the backoff", async () => {
    const state = { lastInjection: { at: 10_000, evaluated: false } };
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [{ id: "as_1", type: "assistant", finish: "error", time: { created: 9_000 } }],
      injectPrompt: async (sessionID, text, delivery) => calls.push(delivery),
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.deepEqual(calls, ["queue"]);
  });

  test("a busy target whose probe is still in flight leaves the backoff and the evaluation untouched", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false }, backoffLevel: 3 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 9_500,
      getMessages: async () => [
        { id: "as_1", type: "assistant", time: { created: 9_100 }, content: [{ type: "text", text: "..." }] },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a busy target");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "busy", lastActivity: 9_500 });
    assert.equal(state.backoffLevel, 3, "an unresolved probe must not reset the backoff");
    assert.equal(state.lastInjection.evaluated, false, "an in-flight responding turn yields no verdict");
  });

  test("a busy target whose probe finished as an error engages the backoff without waiting for idle", async () => {
    // The slow-failure chain: the probe turn errors and follow-up activity
    // keeps the session active, so the target is never observed idle. The
    // busy path itself must classify the finished responding turn.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 9_500,
      getMessages: async () => [
        { id: "as_2", type: "assistant", time: { created: 9_600 } },
        { id: "as_1", type: "assistant", finish: "error", time: { created: 9_400 } },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a busy target");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "failed-probe", level: 1, skips: 1 });
  });

  test("an unrelated turn that started during the admission round trip is never classified as the probe", async () => {
    // A concurrent prompt can start — and fail — while the probe's admission
    // round trip is still in flight. ID anchoring attributes only the turn
    // that actually responded to the injected input.
    const state = { lastInjection: { id: "usr_9", at: 10_000, evaluated: false }, backoffLevel: 0 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getMessages: async () => [
        // Newest first: our input was delivered, but no turn has responded
        // to it yet; the newest *finished* turn is an unrelated failure
        // from after the injection timestamp.
        { id: "usr_9", type: "user", text: "check" },
        { id: "as_5", type: "assistant", finish: "error", time: { created: 10_010 } },
        { id: "usr_5", type: "user", text: "unrelated" },
      ],
      getInbox: async () => [],
      injectPrompt: () => {
        throw new Error("must not inject while the probe's response is pending");
      },
      onOutcome: () => {},
      now: () => 20_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response", lastActivity: 5_000 });
    assert.equal(state.backoffLevel, 0, "an unrelated failure must not engage the backoff");
    assert.equal(state.lastInjection.evaluated, false);
  });

  test("a failed evaluation read does not consume the evaluation", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => {
        throw new Error("message read failed");
      },
      injectPrompt: () => {
        throw new Error("must not inject before the probe is classified");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    await assert.rejects(() => runLoopTick(entry, deps), /message read failed/);
    assert.equal(state.lastInjection.evaluated, false, "a failed read must leave the probe evaluable");

    // The next tick, with the read working again, classifies the probe.
    deps.getMessages = async () => [
      { id: "as_1", type: "assistant", finish: "error", time: { created: 9_500 } },
      { id: "usr_1", type: "user", text: "check" },
    ];
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
  });

  test("a turn failing during the admission round trip is still classified as a failed probe", async () => {
    // The server admits and schedules without joining execution, so a fast
    // failure can complete before the injection call resolves. ID anchoring
    // attributes it regardless of timestamps.
    let clock = 10_000;
    let messages = [];
    const state = {};
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async () => {
        // The admission round trip takes 50ms, during which the scheduled
        // turn starts and fails instantly.
        messages = [
          { id: "as_1", type: "assistant", finish: "error", time: { created: clock + 10 } },
          { id: "usr_1", type: "user", text: "check" },
        ];
        clock += 50;
        return { data: { id: "usr_1" } };
      },
      onOutcome: () => {},
      now: () => clock,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "injected", reason: "idle" });
    assert.equal(state.lastInjection.at, 10_000, "the fallback marker must predate the admission round trip");

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
  });

  test("a stale steer is gated by the backoff", async () => {
    // Steering a stale target is an injection like any other: during a
    // skip window it is suppressed — hung-target recovery does not depend
    // on it, because the dead-stream interrupt fires directly.
    const state = { backoffSkips: 5, backoffLevel: 3 };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [],
      injectPrompt: () => {
        throw new Error("must not inject during backoff");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "backoff", remaining: 4 });
  });

  test("the dead-stream interrupt fires with no pending steer, even during a backoff window, and clears it", async () => {
    const interrupts = [];
    const state = { backoffSkips: 5, backoffLevel: 3 };
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject during backoff");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
    assert.equal(state.backoffSkips, 0, "the freed target must be re-probed on the next tick, not after the window");
  });

  test("an idle target whose delivered probe got no response records a failed probe instead of flooding", async () => {
    // A missing model (or a crash before any assistant record) admits the
    // input and produces nothing: the session is idle, so no response is
    // coming, and re-injecting every tick would flood.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => false,
      getInbox: async () => [],
      getMessages: async () => [{ id: "usr_1", type: "user", text: "check" }],
      injectPrompt: () => {
        throw new Error("must not re-inject over an unanswered probe");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "failed-probe",
      level: 1,
      skips: 1,
    });
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "skipped", reason: "backoff", remaining: 0 });
  });

  test("a probe anchor found in neither the inbox nor the transcript page is superseded, not waited on", async () => {
    // The anchor aged past the read page (or was cancelled): waiting on it
    // would suppress monitoring forever.
    const idleState = { lastInjection: { id: "usr_gone", at: 1_000, evaluated: false } };
    const idleCalls = [];
    assert.deepEqual(
      await runLoopTick(entry, {
        server: { baseURL: "http://x", password: "y" },
        isSessionActive: async () => false,
        getInbox: async () => [],
        getMessages: async () => [{ id: "as_50", type: "assistant", finish: "stop", time: { created: 9_000 } }],
        injectPrompt: async (sessionID, text, delivery) => {
          idleCalls.push(delivery);
          return { data: { id: "usr_2" } };
        },
        onOutcome: () => {},
        now: () => 10_000,
        state: idleState,
      }),
      { outcome: "injected", reason: "idle" },
    );
    assert.deepEqual(idleCalls, ["queue"]);

    const staleState = { lastInjection: { id: "usr_gone", at: 1_000, evaluated: false } };
    const staleCalls = [];
    assert.deepEqual(
      await runLoopTick(entry, {
        server: { baseURL: "http://x", password: "y" },
        isSessionActive: async () => true,
        getSessionUpdatedAt: async () => 5_000,
        getInbox: async () => [],
        getMessages: async () => [{ id: "as_50", type: "assistant", finish: "stop", time: { created: 9_000 } }],
        injectPrompt: async (sessionID, text, delivery) => {
          staleCalls.push(delivery);
          return { data: { id: "usr_2" } };
        },
        onOutcome: () => {},
        now: () => 10_000,
        state: staleState,
      }),
      { outcome: "injected", reason: "stale-running", lastActivity: 5_000 },
    );
    assert.deepEqual(staleCalls, ["steer"]);
  });

  test("a frozen stream is suspected, held for the confirmation window, then interrupted", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 2_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, [], "the first observation must not interrupt");

    // Frozen, but the wall-clock window has not elapsed: still suspected.
    clock = 11_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, [], "an unelapsed window must not authorize the interrupt");

    clock = 12_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 2_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a stream that progressed between observations is never interrupted", async () => {
    const state = {};
    let args = "";
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", name: "rp_spawn", state: { status: "streaming", input: args } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: () => {
        throw new Error("a healthy, progressing stream must never be interrupted");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    };

    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });

    // The arguments grew between ticks: same message, live stream.
    args = '{"name":"rev8-doc';
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-suspected",
      lastActivity: 5_000,
    });
  });

  test("an unchanged fingerprint with events still flowing is not confirmed dead", async () => {
    // The projection keeps a streaming tool call's input empty while its
    // arguments arrive, so an identical fingerprint proves nothing by
    // itself; only event silence since the suspicion confirms death.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let lastEvent;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getLastEventAt: () => lastEvent,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // Progress events veto the confirmation and re-arm the window even
    // though the projection is static.
    clock = 11_100;
    lastEvent = 10_500;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    assert.deepEqual(interrupts, [], "a stream emitting events must never be interrupted");

    // A full window of true silence later, the confirmation fires.
    clock = 12_200;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("raw response chunks veto the interrupt indefinitely, even past the confirmation window", async () => {
    // The reviewer's boundary case: a healthy stream trickling argument
    // chunks with a frozen projection, outliving the window. The raw
    // liveness signal must keep vetoing for as long as bytes arrive.
    const state = {};
    let clock = 10_000;
    let lastRawChunk;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () =>
        lastRawChunk === undefined ? undefined : { lastAt: lastRawChunk, open: [{ startedAt: 0, lastAt: lastRawChunk, ids: ["call_1"] }] },
      injectPrompt: () => {
        throw new Error("must not inject into a streaming target");
      },
      interruptSession: () => {
        throw new Error("a stream producing bytes must never be interrupted");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // Chunks keep arriving; every tick far beyond the window stays a veto.
    for (let tick = 0; tick < 5; tick++) {
      clock += 1_500;
      lastRawChunk = clock - 100;
      assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    }
  });

  test("two loops confirming the same dead target produce exactly one interrupt", async () => {
    const interrupts = [];
    let interruptedAt;
    const messages = [
      {
        id: "as_1",
        type: "assistant",
        content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
      },
    ];
    let clock = 10_000;
    const makeDeps = (state) => ({
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => messages,
      getLastInterruptAt: () => interruptedAt,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      recordInterrupt: (sessionID, at) => {
        interruptedAt = at;
      },
      withTargetLock: withTargetInterruptLock,
      injectPrompt: () => {
        throw new Error("must not inject");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    });
    const stateA = {};
    const stateB = {};

    // Both loops suspect the same frozen stream...
    assert.equal((await runLoopTick(entry, makeDeps(stateA))).reason, "dead-stream-suspected");
    assert.equal((await runLoopTick(entry, makeDeps(stateB))).reason, "dead-stream-suspected");

    // ...and confirm concurrently after the window. Serialization plus the
    // last-interrupt guard must yield a single interrupt: the second loop's
    // evidence describes the execution the first one already interrupted.
    clock = 11_100;
    const results = await Promise.all([runLoopTick(entry, makeDeps(stateA)), runLoopTick(entry, makeDeps(stateB))]);
    assert.deepEqual(interrupts, ["ses_target"], "the successor execution must never be interrupted on old evidence");
    assert.deepEqual(results.map((result) => result.outcome).sort(), ["interrupted", "skipped"]);
  });

  test("a target with no raw-progress record has unknown coverage and is never escalated", async () => {
    // Silence can only be measured where bytes were once observed: a
    // missing raw record (uncovered location, failed hook, or eviction)
    // must disable escalation, not authorize it.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("unknown coverage must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 15_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("a historical raw record from an earlier turn does not count as coverage of the current stream", async () => {
    // The reviewer's replay: raw timestamp 100 from a prior response, an
    // uncovered current stream suspected at 10000 — session history must
    // not authorize interrupting a stream that was never observed.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 100, open: [{ startedAt: 100, lastAt: 100, ids: ["call_old"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("historical coverage must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("identity holds across any time-to-first-token gap: headers long before the row still cover", async () => {
    // The row is created from the first model event, not the headers, so
    // the gap between response start and row creation is provider-sized —
    // seconds, not milliseconds. Identity is by carried call id, so the
    // gap cannot matter in either direction.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 8_600, open: [{ startedAt: 2_000, lastAt: 8_600, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("coverage pinned at suspicion survives a later record eviction, so a genuine stall still recovers", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let raw = { lastAt: 9_200, open: [{ startedAt: 9_100, lastAt: 9_200, ids: ["call_1"] }] };
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => raw,
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // Suspicion establishes coverage of the current stream...
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");

    // ...then 256 busier sessions evict the record. The pinned verdict must
    // hold: eviction is not a retraction, and the stall still recovers.
    raw = undefined;
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("coverage returns with the next response a late-landing hook actually observes", async () => {
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    let raw;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => raw,
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // Uncovered at suspicion: escalation disabled.
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-unobserved");

    // A hook cannot retroactively tee a response whose headers already
    // passed; what it observes is the *next* response for the session — a
    // provider retry here — opening a fresh generation whose bytes are
    // stale by the following tick, so silence finally becomes measurable.
    raw = { lastAt: 11_200, open: [{ startedAt: 11_200, lastAt: 11_200, ids: ["call_1"] }] };
    clock = 11_150 + 1_000;
    // First covered tick vetoes on the fresh bytes and re-arms...
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    // ...then a silent window authorizes.
    clock += 1_500;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_500,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a completed response milliseconds before the suspected message is never coverage for it", async () => {
    // The reviewer's identity counterexample: consecutive assistant rows
    // 215 ms apart. The prior turn's response closed its generation, so it
    // cannot impersonate the current, unobserved stream — slack or no
    // slack.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_2",
          type: "assistant",
          time: { created: 9_215 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
        { id: "as_1", type: "assistant", finish: "stop", time: { created: 9_000 } },
      ],
      // The prior response: started within the slack window but *closed* —
      // its bytes are history, not the current stream.
      getRawProgressAt: () => ({ lastAt: 9_210, open: [] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("a closed prior response must never authorize interrupting an unobserved stream");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("an abandoned generation that never consumed bytes can never claim identity", async () => {
    // A later hook can replace the teed response; the abandoned wrapper's
    // generation stays open but transforms nothing, so it carries no ids —
    // coverage must come from the response path actually consumed.
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 9_100, open: [{ startedAt: 9_050, lastAt: 9_050, ids: [] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: () => {
        throw new Error("an unconsumed wrapper must never authorize an interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_000;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "skipped",
      reason: "dead-stream-unobserved",
      lastActivity: 5_000,
    });
  });

  test("bytes on unrelated same-session responses do not veto the suspected stream forever", async () => {
    // The veto is scoped to the matched generation: a concurrent response
    // (e.g. session.generate) trickling bytes must not defer recovery of
    // the hung agent turn indefinitely.
    const interrupts = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          time: { created: 9_000 },
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      // The matched generation is silent; an unrelated concurrent one keeps
      // producing bytes (session-wide lastAt stays fresh).
      getRawProgressAt: () => ({
        lastAt: clock,
        open: [
          { startedAt: 9_050, lastAt: 9_100, ids: ["call_1"] },
          { startedAt: 9_500, lastAt: clock, ids: ["call_unrelated"] },
        ],
      }),
      injectPrompt: () => {
        throw new Error("must not inject into a suspected target");
      },
      interruptSession: async (server, sessionID) => interrupts.push(sessionID),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
  });

  test("a failed interrupt request is not recorded, leaving the next confirmation free to retry", async () => {
    let recorded;
    const state = {};
    let clock = 10_000;
    let failInterrupt = true;
    const interrupts = [];
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      getLastInterruptAt: () => recorded,
      recordInterrupt: (sessionID, at) => {
        recorded = at;
      },
      injectPrompt: () => {
        throw new Error("must not inject");
      },
      interruptSession: async (server, sessionID) => {
        if (failInterrupt) {
          throw new Error("interrupt request failed");
        }
        interrupts.push(sessionID);
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    await assert.rejects(() => runLoopTick(entry, deps), /interrupt request failed/);
    assert.equal(recorded, undefined, "a failed request must record nothing");

    // The next confirmation retries instead of skipping on a phantom record.
    failInterrupt = false;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 12_300;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_200,
      lastActivity: 5_000,
    });
    assert.deepEqual(interrupts, ["ses_target"]);
    assert.equal(recorded, 12_300);
  });

  test("cancellation during the confirming tick's reads prevents the interrupt", async () => {
    let cancelled = false;
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => {
        cancelled = true;
        return [];
      },
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject after cancellation");
      },
      interruptSession: () => {
        throw new Error("a cancelled loop must never interrupt its target");
      },
      onOutcome: () => {},
      isCancelled: () => cancelled,
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), { outcome: "cancelled" });
  });

  test("a target that became active during the idle reads coalesces instead of failing the probe", async () => {
    // The idleness sample ages while the inbox and transcript are read; if
    // execution started in the meantime, the probe's response may still be
    // coming and must not be written off.
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    const activeAnswers = [false, true];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => activeAnswers.shift(),
      getInbox: async () => [],
      getMessages: async () => [{ id: "usr_1", type: "user", text: "check" }],
      injectPrompt: () => {
        throw new Error("must not inject while the probe's response may be starting");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response" });
    assert.equal(state.lastInjection.evaluated, false, "the probe must remain evaluable");
    assert.equal(state.backoffLevel ?? 0, 0, "no failure may be recorded for a possibly-starting response");
  });

  test("a parked queue copy is promoted before the confirming interrupt so the freed session receives it", async () => {
    const calls = [];
    const state = {};
    let clock = 10_000;
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
        },
      ],
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject into a dead-stream target");
      },
      promoteInboxItem: async (server, sessionID, inboxID) => calls.push(`promote:${inboxID}`),
      interruptSession: async () => calls.push("interrupt"),
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    // First observation only suspects; the parked copy must not be
    // promoted yet (the session may still be alive).
    const first = await runLoopTick(entry, deps);
    assert.equal(first.reason, "dead-stream-suspected");
    assert.deepEqual(calls, []);

    clock = 11_100;
    assert.deepEqual(await runLoopTick(entry, deps), {
      outcome: "interrupted",
      reason: "dead-stream",
      silenceMs: 1_100,
      lastActivity: 5_000,
    });
    assert.deepEqual(calls, ["promote:inb_1", "interrupt"], "the copy must be steerable before the claim is released");
  });

  test("progress during the confirming tick's own reads vetoes the interrupt at the last moment", async () => {
    const state = {};
    let clock = 10_000;
    let messages = [
      {
        id: "as_1",
        type: "assistant",
        content: [{ type: "tool", id: "call_1", name: "rp_spawn", state: { status: "streaming", input: "" } }],
      },
    ];
    const deps = {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => {
        // The stream completes while the confirming tick reads the inbox.
        messages = [{ id: "as_1", type: "assistant", finish: "tool-calls", time: { created: clock } }];
        return [];
      },
      getMessages: async () => messages,
      getRawProgressAt: () => ({ lastAt: 1, open: [{ startedAt: 0, lastAt: 1, ids: ["call_1"] }] }),
      injectPrompt: () => {
        throw new Error("must not inject during confirmation");
      },
      interruptSession: () => {
        throw new Error("progress during the confirming reads must veto the interrupt");
      },
      onOutcome: () => {},
      now: () => clock,
      deadStreamConfirmMs: 1_000,
      state,
    };

    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
    clock = 11_100;
    assert.equal((await runLoopTick(entry, deps)).reason, "dead-stream-suspected");
  });

  test("a fast successful probe finishing between the snapshot and the idle recheck is classified from the fresh read", async () => {
    const state = { lastInjection: { id: "usr_1", at: 9_000, evaluated: false } };
    let messages = [{ id: "usr_1", type: "user", text: "check" }];
    let activeReads = 0;
    const calls = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => {
        activeReads += 1;
        if (activeReads === 2) {
          // The successful turn ran to completion between the transcript
          // snapshot and this idleness recheck.
          messages = [
            { id: "as_1", type: "assistant", finish: "stop", time: { created: 9_800 } },
            { id: "usr_1", type: "user", text: "check" },
          ];
        }
        return false;
      },
      getInbox: async () => [],
      getMessages: async () => messages,
      injectPrompt: async (sessionID, text, delivery) => {
        calls.push(delivery);
        return { data: { id: "usr_2" } };
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "injected", reason: "idle" });
    assert.equal(state.backoffLevel, 0, "a successful response must never be recorded as a failed probe");
    assert.deepEqual(calls, ["queue"]);
  });

  test("a stale target with an unconsumed steer but an executing tool call is left alone", async () => {
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "steer", payload: { text: "check" } }],
      getMessages: async () => [
        {
          id: "as_1",
          type: "assistant",
          content: [{ type: "tool", name: "shell", state: { status: "running" } }],
        },
      ],
      injectPrompt: () => {
        throw new Error("must not duplicate the pending steer");
      },
      interruptSession: () => {
        throw new Error("must never interrupt an executing tool call");
      },
      onOutcome: () => {},
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "pending-delivery", lastActivity: 5_000 });
  });

  test("a stale target with a parked queue copy has it promoted to steer instead of receiving a duplicate", async () => {
    const promotions = [];
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [{ id: "inb_1", delivery: "queue", payload: { text: "check" } }],
      getMessages: async () => [],
      injectPrompt: () => {
        throw new Error("must not duplicate the parked prompt");
      },
      promoteInboxItem: async (server, sessionID, inboxID) => promotions.push({ sessionID, inboxID }),
      onOutcome: () => {},
      now: () => 10_000,
    });

    assert.deepEqual(result, { outcome: "promoted", reason: "stale-running", lastActivity: 5_000 });
    assert.deepEqual(promotions, [{ sessionID: "ses_target", inboxID: "inb_1" }]);
  });

  test("a stale target whose probe response is still in flight is not steered on top", async () => {
    // The slow-failure chain's steady state: the previous steer was
    // consumed and its responding turn is failing slowly. Re-steering here
    // is what floods; the tick waits for the responding turn's verdict.
    const state = { lastInjection: { id: "usr_1", at: 4_000, evaluated: false } };
    const result = await runLoopTick(entry, {
      server: { baseURL: "http://x", password: "y" },
      isSessionActive: async () => true,
      getSessionUpdatedAt: async () => 5_000,
      getInbox: async () => [],
      getMessages: async () => [
        { id: "as_1", type: "assistant", time: { created: 4_100 }, content: [] },
        { id: "usr_1", type: "user", text: "check" },
      ],
      injectPrompt: () => {
        throw new Error("must not steer while the probe's response is in flight");
      },
      onOutcome: () => {},
      now: () => 10_000,
      state,
    });

    assert.deepEqual(result, { outcome: "skipped", reason: "awaiting-response", lastActivity: 5_000 });
    assert.equal(state.lastInjection.evaluated, false);
  });
});

describe("armLoopTimer / disarmLoopTimer", () => {
  afterEach(clearAllLoopTimers);

  test("arms a recurring timer invoking tick repeatedly until disarmed", async () => {
    let calls = 0;
    const entry = { id: "loop_timer_test_1", interval: 15 };

    await armLoopTimer(entry, () => {
      calls++;
    });

    // Wait for ticks rather than a fixed duration: a loaded runner can
    // starve the interval long enough that a fixed wait sees a single tick.
    const deadline = Date.now() + 2000;
    while (calls < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);
    const callsAtDisarm = calls;

    assert.ok(callsAtDisarm >= 2, `expected multiple ticks before disarm, got ${callsAtDisarm}`);

    await delay(70);
    assert.equal(calls, callsAtDisarm, "no further ticks after disarm");
  });

  test("passes one mutable runtime object to every tick of an armed loop", async () => {
    const runtimes = [];
    const entry = { id: "loop_timer_test_runtime", interval: 10 };

    await armLoopTimer(entry, (tickEntry, isCancelled, runtime) => {
      runtime.count = (runtime.count ?? 0) + 1;
      runtimes.push(runtime);
    });

    const deadline = Date.now() + 2_000;
    while (runtimes.length < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(runtimes.length >= 2, `expected multiple ticks, got ${runtimes.length}`);
    assert.equal(runtimes[0], runtimes[1], "each tick must receive the same runtime object");
    assert.equal(runtimes[0].count, runtimes.length, "tick-to-tick mutations must persist");
  });

  test("serializes slow ticks instead of overlapping them", async () => {
    let calls = 0;
    let running = 0;
    let maxRunning = 0;
    const entry = { id: "loop_timer_test_serial", interval: 5 };

    await armLoopTimer(entry, async () => {
      calls++;
      running++;
      maxRunning = Math.max(maxRunning, running);
      await delay(30);
      running--;
    });

    const deadline = Date.now() + 2_000;
    while (calls < 2 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(calls >= 2, `expected multiple ticks, got ${calls}`);
    assert.equal(maxRunning, 1);
  });

  test("disarm waits for an in-flight tick and exposes cancellation to it", async () => {
    let started;
    let release;
    let effect = false;
    const startedPromise = new Promise((resolve) => {
      started = resolve;
    });
    const releasePromise = new Promise((resolve) => {
      release = resolve;
    });
    const entry = { id: "loop_timer_test_cancel", interval: 5 };

    await armLoopTimer(entry, async (_entry, isCancelled) => {
      started();
      await releasePromise;
      if (!isCancelled()) effect = true;
    });
    await startedPromise;

    let firstStopped = false;
    let secondStopped = false;
    const firstStopping = disarmLoopTimer(entry.id).then(() => {
      firstStopped = true;
    });
    const secondStopping = disarmLoopTimer(entry.id).then(() => {
      secondStopped = true;
    });
    await delay(10);
    assert.equal(firstStopped, false, "disarm must wait for the in-flight tick");
    assert.equal(secondStopped, false, "concurrent disarm must wait for the same tick");
    release();
    await Promise.all([firstStopping, secondStopping]);

    assert.equal(effect, false);
  });

  test("replacing a loop ID waits for its prior tick before arming the replacement", async () => {
    let active = 0;
    let maxActive = 0;
    let replacementCalls = 0;
    let firstStarted;
    let releaseFirst;
    const firstStartedPromise = new Promise((resolve) => {
      firstStarted = resolve;
    });
    const releaseFirstPromise = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const entry = { id: "loop_timer_test_replace", interval: 5 };

    await armLoopTimer(entry, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      firstStarted();
      await releaseFirstPromise;
      active--;
    });
    await firstStartedPromise;

    const replacementArmed = armLoopTimer(entry, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      replacementCalls++;
      active--;
    });
    await delay(15);
    assert.equal(replacementCalls, 0, "replacement must wait for the prior tick");
    releaseFirst();
    await replacementArmed;

    const deadline = Date.now() + 2_000;
    while (replacementCalls === 0 && Date.now() < deadline) {
      await delay(10);
    }
    await disarmLoopTimer(entry.id);

    assert.ok(replacementCalls > 0, "expected the replacement loop to tick");
    assert.equal(maxActive, 1);
  });
});

describe("rp_loop_start / rp_loop_list / rp_loop_cancel (wired through setup)", () => {
  afterEach(clearAllLoopTimers);

  test("records a registry entry defaulting target_session to the caller; a busy target skips the tick and an idle target injects the prompt once; rp_loop_cancel stops further ticks and removes the entry", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });

    let active = true;
    const requestFn = async (url) => {
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: active ? { ses_caller: { type: "running" } } : {} } };
      }
      if (url.pathname === "/api/session/ses_caller") {
        return { status: 200, body: { data: { time: { updated: Date.now() } } } };
      }
      if (url.pathname === "/api/session/ses_caller/inbox") {
        return { status: 200, body: { data: [] } };
      }
      if (url.pathname === "/api/session/ses_caller/message") {
        return { status: 200, body: { data: [] } };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };

    const promptCalls = [];
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return originalPrompt(args);
    };

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn,
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 25, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    assert.ok(loopID);

    const entries = (await tools.get("rp_loop_list").execute({}, {})).output;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, loopID);
    assert.equal(entries[0].targetSession, "ses_caller");
    assert.equal(entries[0].prompt, "check status");

    await delay(60);
    assert.equal(promptCalls.length, 0, "a busy target must not receive an injected prompt");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) => tick.loopID === loopID && tick.outcome === "busy" && typeof tick.lastActivity === "number",
      ),
      `expected an observable busy tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );

    active = false;
    await delay(60);
    assert.ok(promptCalls.length >= 1, "an idle target must receive the injected prompt");
    assert.equal(promptCalls[0].sessionID, "ses_caller");
    assert.equal(promptCalls[0].text, "check status");
    assert.equal(promptCalls[0].delivery, "queue");
    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) => tick.loopID === loopID && tick.outcome === "injected" && tick.reason === "idle",
      ),
      `expected an observable injected tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );

    await tools.get("rp_loop_cancel").execute({ id: loopID }, {});
    assert.deepEqual((await tools.get("rp_loop_list").execute({}, {})).output, []);

    const countAfterCancel = promptCalls.length;
    await delay(60);
    assert.equal(promptCalls.length, countAfterCancel, "a cancelled loop must not tick again");
  });

  test("records a failed outcome when server resolution throws before the tick starts", async () => {
    globalThis[LOOP_TICK_LOG_KEY] = [];
    globalThis[ERROR_LOG_KEY] = [];
    const dataHome = freshDir();
    const { ctx, tools } = createFakeCtx();

    setup(
      ctx,
      isolatedDeps({
        env: { XDG_DATA_HOME: dataHome },
        readServiceRecord: () => {
          throw new Error("server resolution failed");
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 15, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    const deadline = Date.now() + 2_000;
    while (globalThis[LOOP_TICK_LOG_KEY].length === 0 && Date.now() < deadline) {
      await delay(10);
    }

    assert.ok(
      globalThis[LOOP_TICK_LOG_KEY].some(
        (tick) =>
          tick.loopID === loopID &&
          tick.outcome === "failed" &&
          tick.error === "Error: server resolution failed",
      ),
      `expected an observable failed tick, got: ${JSON.stringify(globalThis[LOOP_TICK_LOG_KEY])}`,
    );
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) => entry.type === "loop.tick.failed" && entry.loopID === loopID,
      ),
      `expected the failure in recentErrors, got: ${JSON.stringify(globalThis[ERROR_LOG_KEY])}`,
    );

    await tools.get("rp_loop_cancel").execute({ id: loopID }, {});
  });

  test("waits for an in-flight tick even when deleting the registry entry fails", async () => {
    const dataHome = freshDir();
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_caller", { id: "ses_caller" });
    let readStarted;
    let releaseRead;
    const readStartedPromise = new Promise((resolve) => {
      readStarted = resolve;
    });
    const readResponse = new Promise((resolve) => {
      releaseRead = resolve;
    });

    setup(
      ctx,
      isolatedDeps({
        env: {
          XDG_DATA_HOME: dataHome,
          RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999",
          OPENCODE_PASSWORD: "pw",
        },
        readServiceRecord: () => null,
        requestFn: async (url) => {
          assert.equal(url.pathname, "/api/session/active");
          readStarted();
          return readResponse;
        },
      }),
    );

    const startResult = await tools.get("rp_loop_start").execute(
      { interval: 5, prompt: "check status" },
      { sessionID: "ses_caller" },
    );
    const loopID = startResult.output.id;
    await readStartedPromise;
    writeFileSync(resolveLoopRegistryPath({ XDG_DATA_HOME: dataHome }), "{");

    let settled = false;
    const cancellation = tools.get("rp_loop_cancel").execute({ id: loopID }, {});
    cancellation.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    const rejected = assert.rejects(cancellation, SyntaxError);
    await delay(10);
    assert.equal(settled, false, "cancellation must await the in-flight tick before rejecting");

    releaseRead({ status: 200, body: { data: {} } });
    await rejected;
  });
});

describe("completion listener (first-terminal-event-only notification)", () => {
  beforeEach(() => {
    delete globalThis[SETUP_ONCE_KEY];
  });

  afterEach(clearAllLoopTimers);

  test("notifies the spawner on the child's first terminal event only; a second terminal event on the same child produces no additional notification", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_evt", { id: "ses_spawner_evt" });
    sessions.set("ses_child_evt", { id: "ses_child_evt" });
    recordSpawn("ses_child_evt", {
      name: "worker",
      run: "144-opencode-support",
      spawner: "ses_spawner_evt",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    setup(
      ctx,
      isolatedDeps({ env: {}, readServiceRecord: () => null }),
    );

    assert.equal(fakeCtx.subscribeCalls, 1);

    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    assert.equal(promptCalls.length, 1);
    assert.equal(promptCalls[0].sessionID, "ses_spawner_evt");
    assert.equal(promptCalls[0].delivery, "queue");

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    assert.equal(
      promptCalls.length,
      1,
      "a second terminal event on the same child must not notify the spawner again",
    );
  });

  test("the notification text conveys the terminal outcome, distinguishing succeeded from failed", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_outcome", { id: "ses_spawner_outcome" });
    sessions.set("ses_child_ok", { id: "ses_child_ok" });
    sessions.set("ses_child_bad", { id: "ses_child_bad" });
    recordSpawn("ses_child_ok", {
      name: "worker-ok",
      run: "144-opencode-support",
      spawner: "ses_spawner_outcome",
    });
    recordSpawn("ses_child_bad", {
      name: "worker-bad",
      run: "144-opencode-support",
      spawner: "ses_spawner_outcome",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_ok" } });
    await delay(10);
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_bad" } });
    await delay(10);

    assert.equal(promptCalls.length, 2);
    assert.match(
      promptCalls[0].text,
      /succeeded/i,
      `expected the succeeded outcome in the text, got: ${promptCalls[0].text}`,
    );
    assert.doesNotMatch(promptCalls[0].text, /failed/i);
    assert.match(
      promptCalls[1].text,
      /failed/i,
      `expected the failed outcome in the text, got: ${promptCalls[1].text}`,
    );
    assert.doesNotMatch(promptCalls[1].text, /succeeded/i);
  });

  test("a successful terminal event does not enter the recent-errors log", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_success_log", { id: "ses_spawner_success_log" });
    sessions.set("ses_child_success_log", { id: "ses_child_success_log" });
    recordSpawn("ses_child_success_log", {
      name: "worker-success-log",
      run: "247-observable-health-loops",
      spawner: "ses_spawner_success_log",
    });

    setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));
    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_success_log" } });
    await delay(10);

    assert.deepEqual(globalThis[ERROR_LOG_KEY], []);
  });

  test("a failed event's structured error reaches both the spawner notification and the error log", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_cause", { id: "ses_spawner_cause" });
    sessions.set("ses_child_cause", { id: "ses_child_cause" });
    recordSpawn("ses_child_cause", {
      name: "worker-cause",
      run: "144-opencode-support",
      spawner: "ses_spawner_cause",
    });

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    setup(ctx, isolatedDeps({ env: {}, readServiceRecord: () => null }));

    const structuredError = {
      type: "provider.auth",
      message: "Invalid API key",
    };
    pushEvent({
      type: "session.execution.failed",
      data: { sessionID: "ses_child_cause", error: structuredError },
    });
    await delay(10);

    assert.equal(promptCalls.length, 1);
    assert.match(
      promptCalls[0].text,
      /provider\.auth/,
      `expected the error type in the text, got: ${promptCalls[0].text}`,
    );
    assert.match(
      promptCalls[0].text,
      /Invalid API key/,
      `expected the error message in the text, got: ${promptCalls[0].text}`,
    );

    const logged = globalThis[ERROR_LOG_KEY].find(
      (entry) => entry.sessionID === "ses_child_cause",
    );
    assert.ok(logged, "expected an error-log entry for the failed child");
    assert.deepEqual(logged.error, structuredError);
  });

  test("ignores non-terminal events and terminal events on sessions RP never spawned", () => {
    assert.equal(isTerminalEvent({ type: "session.created" }), false);
    assert.equal(isTerminalEvent({ type: "session.execution.succeeded" }), true);
    assert.equal(isTerminalEvent({ type: "session.execution.failed" }), true);
  });

  test("terminalEventSessionID reads the session ID from the event's data (the shape opencode's terminal events actually carry)", () => {
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", data: { sessionID: "ses_x" } }),
      "ses_x",
    );
  });

  test("terminalEventSessionID also accepts a properties-carried or durable-aggregate-carried session ID", () => {
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", properties: { sessionID: "ses_x" } }),
      "ses_x",
    );
    assert.equal(
      terminalEventSessionID({ type: "session.execution.succeeded", durable: { aggregateID: "ses_x" } }),
      "ses_x",
    );
  });

  test("terminalEventError reads the structured error from the event's data or properties, and tolerates its absence", () => {
    const error = { type: "provider.auth", message: "HTTP 401" };
    assert.deepEqual(
      terminalEventError({ type: "session.execution.failed", data: { sessionID: "ses_x", error } }),
      error,
    );
    assert.deepEqual(
      terminalEventError({ type: "session.execution.failed", properties: { sessionID: "ses_x", error } }),
      error,
    );
    assert.equal(
      terminalEventError({ type: "session.execution.failed", data: { sessionID: "ses_x" } }),
      undefined,
    );
  });

  test("formatStructuredError renders type and message, a lone field, a bare string, and an unrecognized shape", () => {
    assert.equal(
      formatStructuredError({ type: "provider.auth", message: "HTTP 401" }),
      "provider.auth: HTTP 401",
    );
    assert.equal(formatStructuredError({ message: "HTTP 401" }), "HTTP 401");
    assert.equal(formatStructuredError("boom"), "boom");
    assert.equal(formatStructuredError({ code: 7 }), '{"code":7}');
  });
});

describe("toToolResult", () => {
  test("wraps a bare string as output, rendering it verbatim as text content", () => {
    assert.deepEqual(toToolResult("ses_abc123"), {
      output: "ses_abc123",
      content: [{ type: "text", text: "ses_abc123" }],
    });
  });

  test("wraps a plain object as output, rendering its JSON form as text content", () => {
    assert.deepEqual(toToolResult({ delivered: true }), {
      output: { delivered: true },
      content: [{ type: "text", text: JSON.stringify({ delivered: true }) }],
    });
  });

  test("drops undefined-valued keys so output is always a JSON value", () => {
    // opencode validates a tool's output against its declared schema and
    // fails the whole call on a non-JSON value; ledger rows carry `undefined`
    // whenever a session record omits a field.
    const result = toToolResult({ name: "spec-lead", currentTool: undefined, pending: 0 });

    assert.deepEqual(result.output, { name: "spec-lead", pending: 0 });
    assert.ok(!("currentTool" in result.output));
    assert.deepEqual(JSON.parse(result.content[0].text), result.output);
  });

  test("renders a nested undefined the same way in output and content", () => {
    const result = toToolResult({ ledger: [{ sessionID: "ses_1", model: undefined }] });

    assert.deepEqual(result.output, { ledger: [{ sessionID: "ses_1" }] });
    assert.deepEqual(JSON.parse(result.content[0].text), result.output);
  });
});

describe("agentExists / isSessionNotFoundError", () => {
  test("accepts both a plain string list and an object list carrying name", () => {
    assert.equal(agentExists(["spec-lead", "spec-reviewer"], "spec-lead"), true);
    assert.equal(agentExists(["spec-lead"], "unknown-agent"), false);
    assert.equal(agentExists([{ name: "spec-lead" }], "spec-lead"), true);
  });

  test("recognizes a dead-target session error by HTTP status or by tag, in either observed shape", () => {
    assert.equal(isSessionNotFoundError({ status: 404 }), true);
    // The in-process ctx.session.prompt rejection: dotted tag, no status.
    assert.equal(isSessionNotFoundError({ name: "Session.NotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ _tag: "Session.NotFoundError" }), true);
    // The raw HTTP response body: undotted tag, alongside a 404 status.
    assert.equal(isSessionNotFoundError({ name: "SessionNotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ _tag: "SessionNotFoundError" }), true);
    assert.equal(isSessionNotFoundError({ status: 500 }), false);
    assert.equal(isSessionNotFoundError(new Error("boom")), false);
  });
});

describe("buildLedgerRows", () => {
  test("maps recognized session records into ledger rows and omits unrecognized ones", () => {
    recordSpawn("ses_ledger_1", {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    const rows = buildLedgerRows(
      [
        {
          id: "ses_ledger_1",
          agent: "spec-lead",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/repo/worktree" },
          time: { updated: 123 },
          title: "rp:144-opencode-support:spec-lead",
        },
        {
          id: "ses_unrelated",
          agent: "Build",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/other" },
          time: { updated: 456 },
          title: "some other title",
        },
      ],
      (id) => (id === "ses_ledger_1" ? { name: "spec-lead", run: "144-opencode-support", spawner: "x" } : undefined),
      new Set(["ses_ledger_1"]),
      () => 2,
    );

    assert.deepEqual(rows, [
      {
        name: "spec-lead",
        sessionID: "ses_ledger_1",
        agent: "spec-lead",
        model: "anthropic/claude-3-opus",
        directory: "/repo/worktree",
        updated: 123,
        running: true,
        pending: 2,
        permissions: [],
        currentTool: undefined,
      },
    ]);
  });

  test("recognizes a restart-surviving session via its rp: title when the ledger has no entry for it", () => {
    const rows = buildLedgerRows(
      [
        {
          id: "ses_after_restart",
          agent: "spec-lead",
          model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
          location: { directory: "/repo" },
          time: { updated: 1 },
          title: "rp:144-opencode-support:spec-lead-2",
        },
      ],
      () => undefined,
      new Set(),
      () => 0,
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "spec-lead-2");
  });
});

describe("resolveRunningBuild", () => {
  test("prefers the service record's version and never calls the CLI fallback", () => {
    const result = resolveRunningBuild({ version: "0.0.0-next-1" }, () => {
      throw new Error("must not be called");
    });
    assert.equal(result, "0.0.0-next-1");
  });

  test("falls back to the injected CLI-version reader when there is no service record", () => {
    assert.equal(resolveRunningBuild(null, () => "0.0.0-next-2"), "0.0.0-next-2");
  });

  test("reports unknown when neither the record nor the CLI fallback yield a version", () => {
    assert.equal(resolveRunningBuild(null, () => null), "unknown");
  });
});

describe("readCliVersion", () => {
  test("strips the real CLI's leading 'opencode2 v' and trims the output", () => {
    // The real `opencode2 --version` prints "opencode2 v<build>\n" — verified
    // live against the pinned build — not the bare build string alone.
    assert.equal(readCliVersion(() => "opencode2 v0.0.0-next-15772\n"), "0.0.0-next-15772");
  });

  test("returns the output unchanged when it carries no 'opencode2 v' prefix", () => {
    assert.equal(readCliVersion(() => "0.0.0-next-15772\n"), "0.0.0-next-15772");
  });

  test("returns null when exec throws (e.g. the binary is missing)", () => {
    assert.equal(
      readCliVersion(() => {
        throw new Error("command not found");
      }),
      null,
    );
  });
});

describe("buildStatusPayload", () => {
  test("returns an empty ledger and a pin comparison without touching the network when the server cannot be resolved", async () => {
    globalThis[ERROR_LOG_KEY] = [];
    const result = await buildStatusPayload({
      env: {},
      readServiceRecord: () => null,
      readCliVersion: () => "0.0.0-next-unknown-build",
    });

    assert.equal(result.ledger.length, 0);
    assert.equal(result.pin, "outside the verified surface");
    assert.equal(typeof result.pluginVersion, "string");
    assert.deepEqual(result.recentErrors, []);
  });

  test("reads the session list, active set, and per-session pending counts through the reach helper and the injected HTTP client", async () => {
    recordSpawn("ses_status_1", {
      name: "spec-lead",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    // Every opencode HTTP GET response envelopes its payload as
    // `{ data: ... }` — verified live against the pinned build.
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            data: [
              {
                id: "ses_status_1",
                agent: "spec-lead",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 42 },
                title: "rp:144-opencode-support:spec-lead",
              },
            ],
          },
        };
      }
      if (url.pathname === "/api/session/active") {
        return { status: 200, body: { data: { ses_status_1: { type: "running" } } } };
      }
      if (url.pathname === "/api/session/ses_status_1/inbox") {
        return { status: 200, body: { data: [{ admittedSeq: 1, delivery: "queue", text: "x" }] } };
      }
      if (url.pathname === "/api/session/ses_status_1/permission") {
        return {
          status: 200,
          body: {
            data: [
              {
                id: "per_1",
                sessionID: "ses_status_1",
                action: "external_directory",
                resources: ["/repo-main/.agents/skills/testing/*"],
                save: ["/repo-main/*"],
              },
            ],
          },
        };
      }
      throw new Error(`unexpected request: ${url.pathname}`);
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
      readCliVersion: () => "0.0.0-next-15772",
    });

    assert.equal(result.ledger.length, 1);
    assert.deepEqual(result.ledger[0], {
      name: "spec-lead",
      sessionID: "ses_status_1",
      agent: "spec-lead",
      model: "anthropic/claude-3-opus",
      directory: "/repo",
      updated: 42,
      running: true,
      pending: 1,
      permissions: [
        {
          id: "per_1",
          action: "external_directory",
          resources: ["/repo-main/.agents/skills/testing/*"],
        },
      ],
      currentTool: undefined,
    });
    assert.deepEqual(result.readFailures, []);
  });

  test("reports failed server reads in readFailures, aggregated per endpoint and status, instead of rendering them as idle and healthy", async () => {
    recordSpawn("ses_status_f1", {
      name: "spec-researcher-1",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    recordSpawn("ses_status_f2", {
      name: "spec-researcher-2",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });

    const sessionRecord = (id, name) => ({
      id,
      agent: "spec-researcher",
      model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
      location: { directory: "/repo" },
      time: { updated: 42 },
      title: `rp:144-opencode-support:${name}`,
    });
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            data: [
              sessionRecord("ses_status_f1", "spec-researcher-1"),
              sessionRecord("ses_status_f2", "spec-researcher-2"),
            ],
          },
        };
      }
      if (url.pathname === "/api/session/active") {
        return { status: 500, body: undefined };
      }
      // Per-session endpoints missing on a drifted build.
      return { status: 404, body: undefined };
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
      readCliVersion: () => "0.0.0-next-15772",
    });

    assert.equal(result.ledger.length, 2);
    for (const row of result.ledger) {
      assert.equal(row.running, undefined);
      assert.equal(row.pending, undefined);
      assert.equal(row.permissions, undefined);
    }
    assert.deepEqual(
      result.readFailures.sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1)),
      [
        { endpoint: "active", status: 500, count: 1 },
        { endpoint: "inbox", status: 404, count: 2 },
        { endpoint: "permission", status: 404, count: 2 },
      ],
    );
  });

  test("reports thrown server reads as transport failures while preserving the partial ledger", async () => {
    recordSpawn("ses_status_transport", {
      name: "spec-researcher-transport",
      run: "144-opencode-support",
      spawner: "ses_orchestrator",
    });
    const requestFn = async (url) => {
      if (url.pathname === "/api/session") {
        return {
          status: 200,
          body: {
            data: [
              {
                id: "ses_status_transport",
                agent: "spec-researcher",
                model: { providerID: "anthropic", id: "claude-3-opus", variant: "default" },
                location: { directory: "/repo" },
                time: { updated: 42 },
              },
            ],
          },
        };
      }
      throw new Error("connection lost");
    };

    const result = await buildStatusPayload({
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
      requestFn,
      readCliVersion: () => "0.0.0-beta-17595",
    });

    assert.equal(result.ledger.length, 1);
    assert.equal(result.ledger[0].running, undefined);
    assert.equal(result.ledger[0].pending, undefined);
    assert.equal(result.ledger[0].permissions, undefined);
    assert.deepEqual(
      result.readFailures.sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1)),
      [
        { endpoint: "active", status: "transport", count: 1 },
        { endpoint: "inbox", status: "transport", count: 1 },
        { endpoint: "permission", status: "transport", count: 1 },
      ],
    );
  });
});

describe("importing the module", () => {
  test("performs no network or server connection (import already completed above without hanging or throwing)", () => {
    assert.equal(typeof plugin.setup, "function");
  });
});
