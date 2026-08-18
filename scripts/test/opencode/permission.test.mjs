import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";

import {
  currentToolFor,
  formatPermissionForward,
  formatRedirectMessage,
  onPermissionAsked,
  onToolEvent,
  parsePermissionAsked,
  recordSpawn,
  redirectTargets,
  replyToPermission,
  resolveRepoRoot,
  setup,
  toToolResult,
  toolTarget,
} from "../../../opencode/plugin.mjs";

/** Well-known globalThis symbols the module keys its singletons under. */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");
const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");
const HANDLED_PERMISSIONS_KEY = Symbol.for("radical-pipelines.opencode.handledPermissions");
const TOOL_STATE_KEY = Symbol.for("radical-pipelines.opencode.toolState");
const LOOP_TIMERS_KEY = Symbol.for("radical-pipelines.opencode.loopTimers");

/**
 * Baseline env for every `setup()` call: an isolated XDG_DATA_HOME keeps the
 * loop-registry re-arm off the real registry (whose entries would arm real
 * timers and hang the test process).
 */
function isolatedEnv(overrides = {}) {
  return { XDG_DATA_HOME: mkdtempSync(join(tmpdir(), "rp-perm-data-")), ...overrides };
}

/** Server-resolving env used by every test that needs a reachable server. */
const SERVER_ENV = { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" };

/** Clear every armed real timer, guarding against a test leaking one. */
function clearAllLoopTimers() {
  const timers = globalThis[LOOP_TIMERS_KEY];
  if (timers) {
    for (const timer of timers.values()) {
      clearInterval(timer);
    }
    timers.clear();
  }
}

let sequence = 0;

/** Mint IDs unique across the whole file, since the ledger has no reset API. */
function uniqueID(prefix) {
  return `${prefix}_${++sequence}`;
}

/** Build the deps for a direct onPermissionAsked call, recording effects. */
function permissionDeps({ env = SERVER_ENV, exists = () => true, replyStatus = 204, replyError } = {}) {
  const prompts = [];
  const requests = [];
  return {
    prompts,
    requests,
    deps: {
      ctx: {
        session: {
          async prompt(args) {
            prompts.push(args);
            return args;
          },
        },
      },
      env,
      readServiceRecord: () => null,
      requestFn: async (url, init) => {
        requests.push({ url, init });
        if (replyError) throw replyError;
        return { status: replyStatus, body: undefined };
      },
      exists,
    },
  };
}

/** A permission.v2.asked event carried in `properties`. */
function askedEvent({ requestID, sessionID, action = "external_directory", resources }) {
  return {
    type: "permission.v2.asked",
    properties: { id: requestID, sessionID, action, resources },
  };
}

beforeEach(() => {
  globalThis[ERROR_LOG_KEY] = [];
  delete globalThis[HANDLED_PERMISSIONS_KEY];
  delete globalThis[TOOL_STATE_KEY];
  clearAllLoopTimers();
});

describe("parsePermissionAsked", () => {
  test("parses a properties-carried ask into requestID, sessionID, action, and resources", () => {
    assert.deepEqual(
      parsePermissionAsked(
        askedEvent({
          requestID: "per_1",
          sessionID: "ses_1",
          resources: ["/main/.agents/skills/testing/*"],
        }),
      ),
      {
        requestID: "per_1",
        sessionID: "ses_1",
        action: "external_directory",
        resources: ["/main/.agents/skills/testing/*"],
      },
    );
  });

  test("also accepts a data-carried ask", () => {
    const parsed = parsePermissionAsked({
      type: "permission.v2.asked",
      data: { id: "per_2", sessionID: "ses_2", action: "read", resources: ["x"] },
    });
    assert.equal(parsed.requestID, "per_2");
    assert.equal(parsed.sessionID, "ses_2");
  });

  test("returns undefined for a non-permission event or an ask missing its id or session", () => {
    assert.equal(parsePermissionAsked({ type: "session.tool.called", properties: {} }), undefined);
    assert.equal(
      parsePermissionAsked({ type: "permission.v2.asked", properties: { sessionID: "ses_1" } }),
      undefined,
    );
    assert.equal(
      parsePermissionAsked({ type: "permission.v2.asked", properties: { id: "per_1" } }),
      undefined,
    );
  });
});

describe("resolveRepoRoot", () => {
  test("resolves the main checkout root from the git common dir, from a worktree seat", () => {
    const exec = (command, args) => {
      assert.equal(command, "git");
      assert.deepEqual(args, [
        "-C",
        "/main/.worktrees/wt",
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
      ]);
      return "/main/.git\n";
    };
    assert.equal(resolveRepoRoot("/main/.worktrees/wt", exec), "/main");
  });

  test("returns null for a common dir not named .git", () => {
    assert.equal(resolveRepoRoot("/somewhere", () => "/bare-repo\n"), null);
  });

  test("returns null when git fails", () => {
    assert.equal(
      resolveRepoRoot("/not-a-repo", () => {
        throw new Error("not a git repository");
      }),
      null,
    );
  });
});

describe("redirectTargets", () => {
  const seat = "/main/.worktrees/wt";
  const repoRoot = "/main";

  test("maps a repo-internal resource onto its existing seat counterpart, stripping the /* suffix", () => {
    assert.deepEqual(
      redirectTargets({
        resources: ["/main/.agents/skills/testing/*"],
        seat,
        repoRoot,
        exists: (path) => path === "/main/.worktrees/wt/.agents/skills/testing",
      }),
      [
        {
          external: "/main/.agents/skills/testing",
          internal: "/main/.worktrees/wt/.agents/skills/testing",
        },
      ],
    );
  });

  test("returns undefined when any resource falls outside the repo root", () => {
    assert.equal(
      redirectTargets({
        resources: ["/main/.agents/*", "/etc/*"],
        seat,
        repoRoot,
        exists: () => true,
      }),
      undefined,
    );
  });

  test("returns undefined when the seat has no counterpart for a resource", () => {
    assert.equal(
      redirectTargets({
        resources: ["/main/.pipelines/other-fork/*"],
        seat,
        repoRoot,
        exists: () => false,
      }),
      undefined,
    );
  });

  test("returns undefined for an ask carrying no resources", () => {
    assert.equal(redirectTargets({ resources: [], seat, repoRoot, exists: () => true }), undefined);
  });
});

describe("onPermissionAsked", () => {
  test("rejects a redirect-eligible external_directory ask with feedback naming the worktree copy, without prompting the spawner", async () => {
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "build-writer-1",
      run: "run-a",
      spawner: "ses_orch",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, requests, deps } = permissionDeps();

    await onPermissionAsked(
      askedEvent({ requestID, sessionID, resources: ["/main/.agents/skills/testing/*"] }),
      deps,
    );

    assert.equal(prompts.length, 0);
    assert.equal(requests.length, 1);
    assert.equal(
      requests[0].url.toString(),
      `http://127.0.0.1:9999/api/session/${sessionID}/permission/${requestID}/reply`,
    );
    const body = JSON.parse(requests[0].init.body);
    assert.equal(body.reply, "reject");
    assert.match(body.message, /\/main\/\.worktrees\/wt\/\.agents\/skills\/testing/);
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) => entry.type === "permission.redirected" && entry.requestID === requestID,
      ),
    );
  });

  test("forwards an ask outside the repo to the spawner and leaves it pending", async () => {
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "build-writer-2",
      run: "run-a",
      spawner: "ses_orch_fwd",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, requests, deps } = permissionDeps();

    await onPermissionAsked(askedEvent({ requestID, sessionID, resources: ["/etc/*"] }), deps);

    assert.equal(requests.length, 0, "a forwarded ask must not be replied to");
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].sessionID, "ses_orch_fwd");
    assert.equal(prompts[0].delivery, "queue");
    assert.match(prompts[0].text, new RegExp(requestID));
    assert.match(prompts[0].text, /rp_permission_reply/);
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) => entry.type === "permission.forwarded" && entry.requestID === requestID,
      ),
    );
  });

  test("forwards a repo-internal ask whose content is missing from the worktree (e.g. another fork's artifacts)", async () => {
    const sessionID = uniqueID("ses_child");
    recordSpawn(sessionID, {
      name: "build-writer-3",
      run: "run-a",
      spawner: "ses_orch_fork",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, requests, deps } = permissionDeps({ exists: () => false });

    await onPermissionAsked(
      askedEvent({ requestID: uniqueID("per"), sessionID, resources: ["/main/.pipelines/x/*"] }),
      deps,
    );

    assert.equal(requests.length, 0);
    assert.equal(prompts.length, 1);
  });

  test("falls back to forwarding when the redirect reject comes back non-2xx, recording the failed reply", async () => {
    // A reply that did not land (e.g. sent to a server that does not hold
    // the ask) leaves the session blocked; treating it as handled would
    // leave it blocked with nobody told.
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "build-writer-replyfail",
      run: "run-a",
      spawner: "ses_orch_replyfail",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, requests, deps } = permissionDeps({ replyStatus: 404 });

    await onPermissionAsked(
      askedEvent({ requestID, sessionID, resources: ["/main/.agents/skills/testing/*"] }),
      deps,
    );

    assert.equal(requests.length, 1, "the reject is still attempted first");
    assert.equal(prompts.length, 1, "the failed reject falls through to the spawner forward");
    assert.equal(prompts[0].sessionID, "ses_orch_replyfail");
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) =>
          entry.type === "permission.redirect.failed" &&
          entry.requestID === requestID &&
          entry.status === 404,
      ),
    );
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) => entry.type === "permission.forwarded" && entry.requestID === requestID,
      ),
    );
  });

  test("falls back to forwarding when the redirect reject request throws", async () => {
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "build-writer-transport",
      run: "run-a",
      spawner: "ses_orch_transport",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, deps } = permissionDeps({ replyError: new Error("connection refused") });

    await onPermissionAsked(
      askedEvent({ requestID, sessionID, resources: ["/main/.agents/skills/testing/*"] }),
      deps,
    );

    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].sessionID, "ses_orch_transport");
    assert.ok(
      globalThis[ERROR_LOG_KEY].some(
        (entry) =>
          entry.type === "permission.redirect.failed" &&
          entry.requestID === requestID &&
          entry.status === "transport",
      ),
    );
  });

  test("falls back to forwarding a redirect-eligible ask when no server is reachable to deliver the reject", async () => {
    const sessionID = uniqueID("ses_child");
    recordSpawn(sessionID, {
      name: "build-writer-4",
      run: "run-a",
      spawner: "ses_orch_nosrv",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, requests, deps } = permissionDeps({ env: {} });

    await onPermissionAsked(
      askedEvent({ requestID: uniqueID("per"), sessionID, resources: ["/main/.agents/*"] }),
      deps,
    );

    assert.equal(requests.length, 0);
    assert.equal(prompts.length, 1);
  });

  test("ignores an ask on a session RP never spawned", async () => {
    const { prompts, requests, deps } = permissionDeps();

    await onPermissionAsked(
      askedEvent({ requestID: uniqueID("per"), sessionID: "ses_foreign", resources: ["/etc/*"] }),
      deps,
    );

    assert.equal(prompts.length, 0);
    assert.equal(requests.length, 0);
  });

  test("handles a duplicate delivery of the same request once", async () => {
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "build-writer-5",
      run: "run-a",
      spawner: "ses_orch_dup",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });
    const { prompts, deps } = permissionDeps();
    const event = askedEvent({ requestID, sessionID, resources: ["/etc/*"] });

    await onPermissionAsked(event, deps);
    await onPermissionAsked(event, deps);

    assert.equal(prompts.length, 1);
  });
});

describe("formatting", () => {
  test("formatRedirectMessage names each internal path with its external origin", () => {
    const message = formatRedirectMessage([{ external: "/main/docs", internal: "/wt/docs" }]);
    assert.match(message, /\/wt\/docs/);
    assert.match(message, /\/main\/docs/);
  });

  test("formatPermissionForward names the instance, request, action, resources, and the reply tool", () => {
    const text = formatPermissionForward(
      { name: "build-writer-1" },
      {
        requestID: "per_9",
        sessionID: "ses_9",
        action: "external_directory",
        resources: ["/etc/hosts/*"],
      },
    );
    assert.match(text, /build-writer-1/);
    assert.match(text, /per_9/);
    assert.match(text, /external_directory/);
    assert.match(text, /\/etc\/hosts/);
    assert.match(text, /rp_permission_reply/);
  });
});

describe("replyToPermission", () => {
  const server = { baseURL: "http://127.0.0.1:9999", password: "pw" };

  test("POSTs the reply to the session's permission reply route, including the message only when given", async () => {
    const requests = [];
    const requestFn = async (url, init) => {
      requests.push({ url, init });
      return { status: 204, body: undefined };
    };

    await replyToPermission(
      server,
      { sessionID: "ses_1", requestID: "per_1", reply: "reject", message: "use the worktree" },
      requestFn,
    );
    await replyToPermission(server, { sessionID: "ses_1", requestID: "per_2", reply: "once" }, requestFn);

    assert.equal(requests[0].url.pathname, "/api/session/ses_1/permission/per_1/reply");
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      reply: "reject",
      message: "use the worktree",
    });
    assert.deepEqual(JSON.parse(requests[1].init.body), { reply: "once" });
  });
});

describe("current-tool tracking", () => {
  test("tracks a ledger session's tool from input.started through called, exposing name, target, and start time, and clears it on success", () => {
    const sessionID = uniqueID("ses_tool");
    recordSpawn(sessionID, { name: "w", run: "r", spawner: "s" });

    onToolEvent({
      type: "session.tool.input.started",
      properties: { sessionID, callID: "call_1", name: "read" },
    });
    assert.equal(currentToolFor(sessionID), undefined, "input streaming is not yet execution");

    onToolEvent(
      {
        type: "session.tool.called",
        properties: { sessionID, callID: "call_1", input: { path: "/wt/references/jest.md" } },
      },
      { now: () => 1234 },
    );
    assert.deepEqual(currentToolFor(sessionID), {
      callID: "call_1",
      tool: "read",
      target: "/wt/references/jest.md",
      since: 1234,
    });

    onToolEvent({
      type: "session.tool.success",
      properties: { sessionID, callID: "call_1" },
    });
    assert.equal(currentToolFor(sessionID), undefined);
  });

  test("a failed call clears the current tool too, and a stale completion for another call does not", () => {
    const sessionID = uniqueID("ses_tool");
    recordSpawn(sessionID, { name: "w", run: "r", spawner: "s" });

    onToolEvent({
      type: "session.tool.called",
      properties: { sessionID, callID: "call_2", input: { command: "npm test" } },
    });
    onToolEvent({
      type: "session.tool.success",
      properties: { sessionID, callID: "call_other" },
    });
    assert.equal(currentToolFor(sessionID).target, "npm test");

    onToolEvent({
      type: "session.tool.failed",
      properties: { sessionID, callID: "call_2" },
    });
    assert.equal(currentToolFor(sessionID), undefined);
  });

  test("ignores tool events on sessions RP never spawned", () => {
    onToolEvent({
      type: "session.tool.called",
      properties: { sessionID: "ses_untracked", callID: "call_3", input: {} },
    });
    assert.equal(currentToolFor("ses_untracked"), undefined);
  });

  test("toolTarget extracts the first known input field and truncates long values", () => {
    assert.equal(toolTarget({ path: "/a" }), "/a");
    assert.equal(toolTarget({ command: "ls" }), "ls");
    assert.equal(toolTarget({ other: 1 }), undefined);
    const long = "x".repeat(200);
    assert.equal(toolTarget({ command: long }).length, 121);
  });
});

describe("wired through setup", () => {
  test("a permission ask arriving on the event stream reaches the spawner as a forwarded notification", async () => {
    delete globalThis[SETUP_ONCE_KEY];
    const sessionID = uniqueID("ses_child");
    const requestID = uniqueID("per");
    recordSpawn(sessionID, {
      name: "spec-researcher-1",
      run: "run-a",
      spawner: "ses_orch_wired",
      directory: "/main/.worktrees/wt",
      repoRoot: "/main",
    });

    const prompts = [];
    const eventWaiters = [];
    const eventQueue = [];
    const ctx = {
      tool: { transform() {} },
      skill: { transform() {} },
      agent: { async list() { return { data: [] }; } },
      session: {
        async prompt(args) {
          prompts.push(args);
          return args;
        },
      },
      event: {
        subscribe() {
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

    setup(ctx, {
      env: isolatedEnv(),
      readServiceRecord: () => null,
      agentsSourceDir: mkdtempSync(join(tmpdir(), "rp-perm-src-")),
      agentsTargetDir: mkdtempSync(join(tmpdir(), "rp-perm-tgt-")),
    });

    const event = askedEvent({ requestID, sessionID, resources: ["/etc/*"] });
    if (eventWaiters.length > 0) {
      eventWaiters.shift()({ value: event, done: false });
    } else {
      eventQueue.push(event);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].sessionID, "ses_orch_wired");
    assert.match(prompts[0].text, new RegExp(requestID));
  });

  test("rp_permission_reply replies over HTTP, surfaces a 404 as the tool result, and reports an unreachable server", async () => {
    delete globalThis[SETUP_ONCE_KEY];
    const tools = new Map();
    const requests = [];
    let status = 204;
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
      skill: { transform() {} },
      agent: { async list() { return { data: [] }; } },
      session: { async prompt(args) { return args; } },
      event: {
        subscribe() {
          return {
            [Symbol.asyncIterator]() {
              return { next: () => new Promise(() => {}) };
            },
          };
        },
      },
    };

    setup(ctx, {
      env: isolatedEnv(SERVER_ENV),
      readServiceRecord: () => null,
      requestFn: async (url, init) => {
        requests.push({ url, init });
        return { status, body: undefined };
      },
      agentsSourceDir: mkdtempSync(join(tmpdir(), "rp-perm-src-")),
      agentsTargetDir: mkdtempSync(join(tmpdir(), "rp-perm-tgt-")),
    });

    const tool = tools.get("rp_permission_reply");
    const ok = await tool.execute({ session: "ses_1", request: "per_1", reply: "once" });
    assert.deepEqual(ok, toToolResult({ replied: true }));
    assert.equal(requests[0].url.pathname, "/api/session/ses_1/permission/per_1/reply");
    assert.deepEqual(JSON.parse(requests[0].init.body), { reply: "once" });

    status = 404;
    const missing = await tool.execute({ session: "ses_1", request: "per_gone", reply: "reject" });
    assert.deepEqual(missing, toToolResult({ status: 404, error: "PermissionNotFoundError" }));

    status = 500;
    const failed = await tool.execute({ session: "ses_1", request: "per_1", reply: "once" });
    assert.deepEqual(failed, toToolResult({ status: 500, error: "PermissionReplyFailed" }));

    delete globalThis[SETUP_ONCE_KEY];
    const unreachable = createUnreachableReplyTool();
    const result = await unreachable.execute({ session: "s", request: "r", reply: "once" });
    assert.deepEqual(result, toToolResult({ error: "server unreachable" }));
  });
});

/** Register the tools with no resolvable server and return rp_permission_reply. */
function createUnreachableReplyTool() {
  const tools = new Map();
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
    skill: { transform() {} },
    agent: { async list() { return { data: [] }; } },
    session: { async prompt(args) { return args; } },
    event: {
      subscribe() {
        return {
          [Symbol.asyncIterator]() {
            return { next: () => new Promise(() => {}) };
          },
        };
      },
    },
  };
  setup(ctx, {
    env: isolatedEnv(),
    readServiceRecord: () => null,
    agentsSourceDir: mkdtempSync(join(tmpdir(), "rp-perm-src-")),
    agentsTargetDir: mkdtempSync(join(tmpdir(), "rp-perm-tgt-")),
  });
  return tools.get("rp_permission_reply");
}
