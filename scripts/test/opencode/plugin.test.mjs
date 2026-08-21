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
  getSessionUpdatedAt,
  isSessionActive,
  isSessionNotFoundError,
  isTerminalEvent,
  lookupSpawn,
  readCliVersion,
  readPackageVersion,
  readServiceRecordFile,
  recordSpawn,
  requestServer,
  resolveLoopRegistryPath,
  resolveRunningBuild,
  resolveServer,
  runLoopTick,
  setup,
  terminalEventError,
  terminalEventSessionID,
  toToolResult,
} from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");
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

  test("registers exactly the nine named tools and the packaged skills", () => {
    const { ctx, tools, addedSkills } = createFakeCtx();

    setup(ctx, isolatedDeps({ env: {} }));

    assert.deepEqual(
      [...tools.keys()].sort(),
      [
        "rp_loop_cancel",
        "rp_loop_list",
        "rp_loop_start",
        "rp_permission_reply",
        "rp_request_termination",
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
    assert.match(initialPrompt.text, /declare your completion by calling `rp_request_termination`/);
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

describe("rp_request_termination", () => {
  afterEach(clearAllLoopTimers);

  test("notifies the caller's spawner once; a repeated declaration reports success without a second notification", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_done_spawner", { id: "ses_done_spawner" });
    sessions.set("ses_done_child", { id: "ses_done_child" });
    recordSpawn("ses_done_child", {
      name: "spec-researcher-1",
      run: "258-agent-declared-completion",
      spawner: "ses_done_spawner",
    });

    const promptCalls = [];
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return originalPrompt(args);
    };

    const tool = tools.get("rp_request_termination");
    const result = await tool.execute({}, { sessionID: "ses_done_child" });

    assert.deepEqual(result, toToolResult({ requested: true }));
    assert.equal(promptCalls.length, 1);
    assert.equal(promptCalls[0].sessionID, "ses_done_spawner");
    assert.equal(promptCalls[0].delivery, "queue");
    assert.match(
      promptCalls[0].text,
      /\[rp\] spec-researcher-1 \(ses_done_child\) declares its work complete/,
    );
    assert.match(promptCalls[0].text, /rp_terminate/);

    const repeated = await tool.execute({}, { sessionID: "ses_done_child" });
    assert.deepEqual(repeated, toToolResult({ requested: true }));
    assert.equal(promptCalls.length, 1, "the spawner is notified once per agent");
  });

  test("reports an unrecognized caller session as an error without notifying anyone", async () => {
    const { ctx, tools } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {} }));

    const promptCalls = [];
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return args;
    };

    const result = await tools
      .get("rp_request_termination")
      .execute({}, { sessionID: "ses_never_spawned" });

    assert.deepEqual(result, toToolResult({ error: "not an RP-spawned session" }));
    assert.equal(promptCalls.length, 0);
  });

  test("a declaration whose notification fails is retriable: the next call notifies again", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    setup(ctx, isolatedDeps({ env: {} }));
    sessions.set("ses_retry_child", { id: "ses_retry_child" });
    recordSpawn("ses_retry_child", {
      name: "spec-researcher-2",
      run: "258-agent-declared-completion",
      spawner: "ses_retry_spawner",
    });

    const tool = tools.get("rp_request_termination");
    // The spawner session does not exist yet: the notification prompt throws.
    await assert.rejects(() => tool.execute({}, { sessionID: "ses_retry_child" }));

    sessions.set("ses_retry_spawner", { id: "ses_retry_spawner" });
    const promptCalls = [];
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      promptCalls.push(args);
      return originalPrompt(args);
    };

    const result = await tool.execute({}, { sessionID: "ses_retry_child" });
    assert.deepEqual(result, toToolResult({ requested: true }));
    assert.equal(promptCalls.length, 1);
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

describe("terminal-event listener", () => {
  beforeEach(() => {
    delete globalThis[SETUP_ONCE_KEY];
  });

  afterEach(clearAllLoopTimers);

  test("a succeeded terminal event produces no spawner notification; every failed terminal event announces the failure", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_evt", { id: "ses_spawner_evt" });
    sessions.set("ses_child_evt", { id: "ses_child_evt" });
    recordSpawn("ses_child_evt", {
      name: "worker",
      run: "258-agent-declared-completion",
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
    assert.equal(
      promptCalls.length,
      0,
      "a successful turn is not a completion signal and must not notify the spawner",
    );

    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    pushEvent({ type: "session.execution.failed", data: { sessionID: "ses_child_evt" } });
    await delay(10);
    assert.equal(promptCalls.length, 2, "every failed turn must be announced, not just the first");
    for (const call of promptCalls) {
      assert.equal(call.sessionID, "ses_spawner_evt");
      assert.equal(call.delivery, "queue");
      assert.match(call.text, /worker \(ses_child_evt\) failed a turn/);
      assert.doesNotMatch(call.text, /succeeded/i);
    }
  });

  test("re-asserts the child's durable rp: title on its first terminal event only", async () => {
    const fakeCtx = createFakeCtx();
    const { ctx, pushEvent, sessions } = fakeCtx;
    sessions.set("ses_spawner_title", { id: "ses_spawner_title" });
    sessions.set("ses_child_title", { id: "ses_child_title" });
    recordSpawn("ses_child_title", {
      name: "worker-title",
      run: "258-agent-declared-completion",
      spawner: "ses_spawner_title",
    });

    const renames = [];
    setup(
      ctx,
      isolatedDeps({
        env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async (url, init) => {
          renames.push({ url, init });
          return { status: 204, body: undefined };
        },
      }),
    );

    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_title" } });
    await delay(10);
    assert.equal(renames.length, 1);
    assert.equal(renames[0].url.pathname, "/api/session/ses_child_title/rename");
    assert.equal(
      renames[0].init.body,
      JSON.stringify({ title: "rp:258-agent-declared-completion:worker-title" }),
    );

    pushEvent({ type: "session.execution.succeeded", data: { sessionID: "ses_child_title" } });
    await delay(10);
    assert.equal(renames.length, 1, "a later terminal event must not re-assert the title again");
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
