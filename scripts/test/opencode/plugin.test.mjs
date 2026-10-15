import assert from "node:assert/strict";
import { dirname } from "node:path";
import { afterEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import plugin, {
  readPackageVersion,
  recordSessionParent,
  recordSpawn,
  setup,
} from "../../../opencode/plugin.mjs";

import {
  clearAllLoopTimers,
  createFakeCtx,
  freshDir,
  isolatedDeps,
} from "./fixture.mjs";

// The owner's session: opencode announces every session it creates, so
// registering ses_owner as a root session is what the running daemon does
// before any tool call reaches the access boundary.
for (const id of ["ses_owner", "ses_caller"]) {
  recordSessionParent({ type: "session.created", data: { sessionID: id } });
}

/** Well-known globalThis symbols the module keys its singletons under. */
const SETUP_ONCE_KEY = Symbol.for("radical-pipelines.opencode.setupOnce");

describe("default export", () => {
  test("is {id, setup} with id equal to radical-pipelines@<package.json version>", () => {
    assert.equal(typeof plugin.setup, "function");
    assert.equal(plugin.id, `radical-pipelines@${readPackageVersion()}`);
  });
});

describe("setup: tool and skill registration", () => {
  afterEach(clearAllLoopTimers);

  test("registers exactly the eight named tools, each directly invocable, and the packaged skills", async () => {
    const { ctx, tools, addedSkills } = createFakeCtx();

    await setup(ctx, isolatedDeps({ env: {} }));

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
    // opencode exposes only `codemode: false` tools to the model directly;
    // every other tool is reachable solely inside the Code Mode wrapper.
    for (const [name, tool] of tools) {
      assert.equal(tool.options?.codemode, false, `${name} must be registered as directly invocable`);
    }
    assert.deepEqual(
      addedSkills.map((skill) => skill.id),
      ["radical-pipelines"],
    );
    const skill = addedSkills[0];
    assert.equal(skill.name, "radical-pipelines");
    assert.match(skill.description, /autonomous software engineering pipeline/);
    assert.ok(skill.path.endsWith("skills/radical-pipelines/SKILL.md"));
    assert.ok(skill.content.startsWith("# Radical Pipelines"));
  });

  test("the registered context hook re-supplies the packaged skill to a session continuing from a checkpoint", async () => {
    globalThis[Symbol.for("radical-pipelines.opencode.skillActivations")]?.clear();
    const { ctx, hooks, addedSkills } = createFakeCtx();
    await setup(
      ctx,
      isolatedDeps({
        env: {},
        readServiceRecord: () => ({ url: "http://127.0.0.1:1", password: "pw" }),
        requestFn: async () => ({ status: 200, body: { data: [], cursor: { next: null } } }),
      }),
    );
    await delay(0);

    const loaded = {
      sessionID: "ses_wired_orchestrator",
      system: [],
      messages: [
        { role: "assistant", content: [{ type: "tool-call", id: "c1", name: "skill", input: { id: "radical-pipelines" } }] },
        { role: "tool", content: [{ type: "tool-result", id: "c1", name: "skill", result: { type: "text", value: "…" } }] },
      ],
    };
    await hooks.get("context")(loaded);
    assert.deepEqual(loaded.system, [], "nothing to re-supply while the activation is in the active context");

    const after = { sessionID: "ses_wired_orchestrator", system: [], messages: [] };
    await hooks.get("context")(after);
    const [block] = after.system;
    const skill = addedSkills.find((candidate) => candidate.id === "radical-pipelines");
    assert.ok(block.text.includes(`Skill: radical-pipelines\nBase directory: ${dirname(skill.path)}\n\n${skill.content}`));
  });

  test("calling setup twice subscribes to events exactly once", async () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const second = createFakeCtx();

    await setup(first.ctx, isolatedDeps({ env: {} }));
    await setup(second.ctx, isolatedDeps({ env: {} }));

    assert.equal(first.subscribeCalls + second.subscribeCalls, 1);
  });

  test("setup returns a cleanup that tears the observers down and lets a reloaded setup re-arm", async () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const cleanup = await setup(first.ctx, isolatedDeps({ env: {} }));
    assert.equal(typeof cleanup, "function", "the plugin API expects setup to resolve to its cleanup");
    assert.ok(globalThis[SETUP_ONCE_KEY], "the once-guard must be armed after setup");

    await cleanup();
    assert.equal(globalThis[SETUP_ONCE_KEY], undefined, "cleanup must clear the once-guard");
    assert.equal(first.hookDisposals, 2, "every one of the location's own hooks must be disposed");

    // A reloaded plugin's setup must be able to re-arm the observers.
    const second = createFakeCtx();
    const secondCleanup = await setup(second.ctx, isolatedDeps({ env: {} }));
    assert.equal(second.subscribeCalls, 1, "a post-cleanup setup must resubscribe");
    await secondCleanup();
  });

  test("every location registers its own session hooks, and cleanup ownership is reference-counted", async () => {
    delete globalThis[SETUP_ONCE_KEY];

    const first = createFakeCtx();
    const second = createFakeCtx();
    const firstCleanup = await setup(first.ctx, isolatedDeps({ env: {} }));
    const secondCleanup = await setup(second.ctx, isolatedDeps({ env: {} }));

    // The hooks are location-scoped: the once-guard must not swallow the
    // second location's registrations.
    await delay(0);
    assert.deepEqual([...first.hooks.keys()].sort(), ["context", "http.response"]);
    assert.equal(second.hookRegistrations, 2, "the second location must get its own hooks");

    // A non-owner location's cleanup disposes only its own hooks, never the
    // shared observers or another location's registrations.
    await secondCleanup();
    assert.equal(second.hookDisposals, 2);
    assert.equal(first.hookDisposals, 0, "another location's hooks must survive");
    assert.ok(globalThis[SETUP_ONCE_KEY], "the shared observers must survive while a location is live");

    // Double-invoking one cleanup must not release another's reference.
    await secondCleanup();
    assert.ok(globalThis[SETUP_ONCE_KEY], "a repeated cleanup must not double-release");

    await firstCleanup();
    assert.equal(first.hookDisposals, 2);
    assert.equal(globalThis[SETUP_ONCE_KEY], undefined, "the last location's cleanup tears down the shared resources");
  });
});

describe("the access boundary is wired into what setup registers", () => {
  afterEach(clearAllLoopTimers);

  // Guarding the descriptors and registering them are separate steps, and a
  // registration that forgot the guard would leave every tool open to every
  // caller while each tool still behaved correctly in isolation. These drive
  // the tools opencode is actually handed.
  const registerTools = () => {
    const { ctx, tools } = createFakeCtx();
    setup(
      ctx,
      isolatedDeps({
        env: { XDG_DATA_HOME: freshDir(), RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        requestFn: async () => ({ status: 200, body: { data: {} } }),
      }),
    );
    return tools;
  };

  test("every registered tool refuses a subagent", async () => {
    const tools = registerTools();
    recordSessionParent({
      type: "session.created",
      data: { sessionID: "ses_wired_child", parentID: "ses_wired_parent" },
    });

    for (const name of [
      "rp_send",
      "rp_spawn",
      "rp_terminate",
      "rp_status",
      "rp_loop_start",
      "rp_loop_list",
      "rp_loop_cancel",
      "rp_permission_reply",
    ]) {
      const result = await tools.get(name).execute({}, { sessionID: "ses_wired_child" });
      assert.equal(result.output.error, "SubagentNotPermitted", `${name} must refuse a subagent`);
    }
  });

  // The durable read `setup` wires in reaches the server the way every other
  // RP tool does, and the installed daemon takes the service-record route
  // while the `serve`/harness process takes the env one. A wiring covered on
  // one route only would leave the other free to be disconnected.
  const serverRoutes = [
    {
      route: "the service record a running daemon writes",
      sessionID: "ses_wired_unobserved_record",
      env: {},
      readServiceRecord: () => ({
        url: "http://127.0.0.1:9999",
        password: "pw",
        version: "0.0.0-next-1",
        pid: process.pid,
      }),
    },
    {
      route: "the env overrides a serve process carries",
      sessionID: "ses_wired_unobserved_env",
      env: { RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
      readServiceRecord: () => null,
    },
  ];

  for (const { route, sessionID, env, readServiceRecord } of serverRoutes) {
    test(`a caller whose creation event was never seen is read from the durable store over ${route}, and refused on its answer`, async () => {
      // The session is cold: no `session.created` was ever recorded for it, so
      // the only route to a verdict is the durable read `setup` wires in. Unit
      // tests of `resolveToolAccess` inject that reader, so this is the only
      // place the wiring itself is exercised.
      const { ctx, tools } = createFakeCtx();
      const reads = [];
      setup(
        ctx,
        isolatedDeps({
          env: { XDG_DATA_HOME: freshDir(), ...env },
          readServiceRecord,
          requestFn: async (url) => {
            reads.push(url.pathname);
            if (url.pathname === `/api/session/${sessionID}`) {
              return { status: 200, body: { data: { id: sessionID, parentID: "ses_wired_delegator" } } };
            }
            return { status: 200, body: { data: {} } };
          },
        }),
      );

      const result = await tools.get("rp_loop_list").execute({}, { sessionID });

      assert.equal(result.output.error, "SubagentNotPermitted");
      assert.ok(
        reads.includes(`/api/session/${sessionID}`),
        `expected the durable store to be read for an unobserved caller, saw: ${JSON.stringify(reads)}`,
      );
    });
  }

  test("every registered tool but rp_send refuses a spawned agent", async () => {
    const tools = registerTools();
    recordSpawn("ses_wired_agent", {
      name: "build-worker wired",
      pipelineSlug: "144-opencode-support",
      spawner: "ses_wired_orchestrator",
    });
    recordSessionParent({ type: "session.created", data: { sessionID: "ses_wired_agent" } });

    for (const name of ["rp_spawn", "rp_status", "rp_loop_list", "rp_permission_reply"]) {
      const result = await tools.get(name).execute({}, { sessionID: "ses_wired_agent" });
      assert.equal(result.output.error, "AgentNotPermitted", `${name} must refuse a spawned agent`);
    }

    const sent = await tools
      .get("rp_loop_list")
      .execute({}, { sessionID: "ses_owner" });
    assert.ok(Array.isArray(sent.output), "a root session still reaches the tool it registered");
  });

  test("an agent spawned before a restart is restricted and attributed by the identity its stored record carries", async () => {
    const { ctx, tools, sessions } = createFakeCtx();
    sessions.set("ses_wired_restart_spawner", { id: "ses_wired_restart_spawner" });
    const reads = [];
    setup(
      ctx,
      isolatedDeps({
        env: { XDG_DATA_HOME: freshDir(), RP_OPENCODE_SERVER_URL: "http://127.0.0.1:9999", OPENCODE_PASSWORD: "pw" },
        readServiceRecord: () => null,
        resolveRepoRootFn: () => null,
        requestFn: async (url) => {
          reads.push(url.pathname);
          if (url.pathname === "/api/session/ses_wired_survivor") {
            return {
              status: 200,
              body: {
                data: {
                  id: "ses_wired_survivor",
                  title: "An automatic title",
                  metadata: { rp: { name: "build-worker survivor", pipelineSlug: "restart-run", spawner: "ses_wired_restart_spawner" } },
                  location: { directory: "/repo" },
                },
              },
            };
          }
          return { status: 200, body: { data: [] } };
        },
      }),
    );
    let delivered;
    const originalPrompt = ctx.session.prompt.bind(ctx.session);
    ctx.session.prompt = async (args) => {
      delivered = args;
      return originalPrompt(args);
    };

    const refused = await tools.get("rp_spawn").execute({}, { sessionID: "ses_wired_survivor" });
    assert.equal(refused.output.error, "AgentNotPermitted");

    await tools.get("rp_send").execute(
      { to: "ses_wired_restart_spawner", message: "Completion declared." },
      { sessionID: "ses_wired_survivor" },
    );
    assert.equal(delivered.text, "[from build-worker survivor (ses_wired_survivor)] Completion declared.");
    assert.equal(reads.filter((path) => path === "/api/session/ses_wired_survivor").length, 1, "read once, then remembered");
  });
});

describe("importing the module", () => {
  test("performs no network or server connection (import already completed above without hanging or throwing)", () => {
    assert.equal(typeof plugin.setup, "function");
  });
});
