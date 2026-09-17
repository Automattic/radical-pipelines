import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
  activeSkillEvents,
  collectSkillReload,
  forgetSkillReload,
  getSkillReloads,
  hasCheckpoint,
  holdSkillReload,
  isCompactionRequest,
  listSessionMessages,
  onContext,
  readSealedSkillReload,
  recordSpawn,
  renderSkillReload,
  storedSkillEvents,
} from "../../../opencode/plugin.mjs";

const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

const SKILL_DIR = "/skills/radical-pipelines";
const skills = [{ id: "radical-pipelines", location: `${SKILL_DIR}/SKILL.md`, content: "# Radical Pipelines" }];
const server = { baseURL: "http://127.0.0.1:1", password: "pw" };

/** A stored assistant message holding one `read` (or other tool) call. */
function storedRead(path, { status = "completed", tool = "read" } = {}) {
  return { type: "assistant", content: [{ type: "tool", name: tool, state: { status, input: { path } } }] };
}
const storedActivation = {
  type: "assistant",
  content: [{ type: "tool", name: "skill", state: { status: "completed", input: { id: "radical-pipelines" } } }],
};
const checkpoint = { type: "compaction", status: "completed", summary: "…", recent: "" };

let callID = 0;
/**
 * The lowered messages of tool calls with their results, as the context hook
 * sees them: one assistant message holding the calls, one tool message
 * holding the results. A call given `{ error: true }` failed.
 */
function active(...calls) {
  const ids = calls.map(() => `call_${(callID += 1)}`);
  return [
    { role: "assistant", content: calls.map(([name, input], index) => ({ type: "tool-call", id: ids[index], name, input })) },
    {
      role: "tool",
      content: calls.map(([name, , outcome], index) => ({
        type: "tool-result",
        id: ids[index],
        name,
        result: { type: "text", value: "…" },
        ...(outcome?.error ? { resultType: "error" } : {}),
      })),
    },
  ];
}
const activeActivation = active(["skill", { id: "radical-pipelines" }]);
const activeRead = (path, outcome) => active(["read", { path }, outcome]);
const summaryPrompt = {
  role: "user",
  content: [{ type: "text", text: "You MUST summarize…\n<template>\n## Objective\n</template>\nDo not continue the task or call tools." }],
};

/**
 * A `requestFn` serving one session's stored history, oldest first, in
 * pages of `pageSize`, honoring the `type` filter. Records request paths.
 */
function fakeServer(messages, { pageSize = 200, status = 200 } = {}) {
  const requests = [];
  const requestFn = async (url) => {
    requests.push(`${url.pathname}${url.search}`);
    if (status !== 200) {
      return { status, body: undefined };
    }
    const type = url.searchParams.get("type");
    const filtered = type ? messages.filter((message) => message.type === type) : messages;
    const ordered = url.searchParams.get("order") === "desc" ? [...filtered].reverse() : filtered;
    const start = Number(url.searchParams.get("cursor") ?? 0);
    const page = ordered.slice(start, start + pageSize);
    const next = start + pageSize < ordered.length ? String(start + pageSize) : null;
    return { status: 200, body: { data: page, cursor: { next, previous: null } } };
  };
  return { requestFn, requests };
}

describe("collectSkillReload", () => {
  test("keeps packaged activations and skill or convention reads, in first-seen order without repeats", () => {
    const events = [
      { file: `${SKILL_DIR}/reference/conventions/load.md` },
      { skill: "other" },
      { skill: "radical-pipelines" },
      { file: "/repo/.rp.md" },
      { file: "/repo/.rp.opencode.md" },
      { file: "/repo/.rp.local.md" },
      { file: "/repo/src/app.mjs" },
      { file: "/repo/.rp.md.bak" },
      { file: ".rp.md" },
      { file: "reference/run/loop.md" },
      { file: undefined },
      { skill: "radical-pipelines" },
      { file: `${SKILL_DIR}/reference/conventions/load.md` },
      { file: `${SKILL_DIR}/reference/run/state.md` },
    ];
    assert.deepEqual(collectSkillReload(events, skills), {
      skills: ["radical-pipelines"],
      files: [
        `${SKILL_DIR}/reference/conventions/load.md`,
        "/repo/.rp.md",
        "/repo/.rp.opencode.md",
        "/repo/.rp.local.md",
        `${SKILL_DIR}/reference/run/state.md`,
      ],
    });
  });
});

describe("storedSkillEvents", () => {
  test("yields activations in every stored form and completed reads only", () => {
    const messages = [
      storedActivation,
      { type: "skill", skill: "radical-pipelines", name: "radical-pipelines", text: "…" },
      { type: "user", text: "work", skills: [{ id: "radical-pipelines", name: "radical-pipelines" }] },
      storedRead("/repo/.rp.md"),
      storedRead("/repo/a.md", { status: "error" }),
      storedRead("/repo/b.md", { tool: "glob" }),
      { type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "error", input: { id: "x" } } }] },
      { type: "assistant", content: [{ type: "text", text: "no tools" }] },
      checkpoint,
    ];
    assert.deepEqual([...storedSkillEvents(messages)], [
      { skill: "radical-pipelines" },
      { skill: "radical-pipelines" },
      { skill: "radical-pipelines" },
      { file: "/repo/.rp.md" },
    ]);
  });
});

describe("activeSkillEvents", () => {
  test("yields skill and read calls that have a successful result, and a skill body attached to a prompt", () => {
    const [pending] = active(["read", { path: "/repo/still-running.md" }]);
    const messages = [
      { role: "system", content: "…" },
      { role: "user", content: "hi" },
      { role: "user", content: [{ type: "text", text: "# Radical Pipelines" }, { type: "text", text: "work on it" }] },
      ...activeActivation,
      { role: "assistant", content: "plain text" },
      ...active(["read", { path: "/repo/.rp.md" }], ["glob", { pattern: "*" }]),
      ...activeRead("/repo/gone.md", { error: true }),
      ...active(["skill", { id: "radical-pipelines" }, { error: true }]),
      pending,
    ];
    assert.deepEqual([...activeSkillEvents(messages, skills)], [
      { skill: "radical-pipelines" },
      { skill: "radical-pipelines" },
      { file: "/repo/.rp.md" },
    ]);
  });
});

describe("isCompactionRequest", () => {
  test("recognizes the summary prompt opencode appends, whether as text or as parts", () => {
    assert.equal(isCompactionRequest([...activeActivation, summaryPrompt]), true);
    assert.equal(isCompactionRequest([{ role: "user", content: summaryPrompt.content[0].text }]), true);
    assert.equal(isCompactionRequest([{ role: "user", content: "<template> please" }]), false);
    assert.equal(isCompactionRequest([summaryPrompt, ...activeActivation]), false);
    assert.equal(isCompactionRequest([]), false);
  });
});

describe("readSealedSkillReload", () => {
  test("a session without a checkpoint has nothing sealed and is not paged", async () => {
    const { requestFn, requests } = fakeServer([storedActivation, storedRead("/repo/.rp.md")]);
    assert.deepEqual(await readSealedSkillReload(server, "ses_1", skills, requestFn), { skills: [], files: [] });
    assert.equal(requests.length, 1);
    assert.match(requests[0], /type=compaction/);
  });

  test("only what precedes the last completed checkpoint is sealed", async () => {
    const { requestFn } = fakeServer([
      storedActivation,
      storedRead("/repo/.rp.md"),
      checkpoint,
      storedRead(`${SKILL_DIR}/reference/run/state.md`),
      { type: "compaction", status: "failed" },
    ]);
    assert.deepEqual(await readSealedSkillReload(server, "ses_1", skills, requestFn), {
      skills: ["radical-pipelines"],
      files: ["/repo/.rp.md"],
    });
  });

  test("an activation after the checkpoint is in the active context, not sealed", async () => {
    const { requestFn } = fakeServer([storedRead("/repo/.rp.md"), checkpoint, storedActivation]);
    assert.deepEqual(await readSealedSkillReload(server, "ses_1", skills, requestFn), {
      skills: [],
      files: ["/repo/.rp.md"],
    });
  });
});

describe("renderSkillReload", () => {
  test("tells the session to load each skill again, read again the files it lacks, and recompute state", () => {
    const text = renderSkillReload({ skills: ["radical-pipelines"], files: ["/repo/.rp.md", `${SKILL_DIR}/reference/run/loop.md`] });
    assert.equal(
      text,
      [
        "This session's context was checkpointed and no longer holds what it had loaded. Before doing anything else:",
        "- load the skill again with the `skill` tool: `radical-pipelines`",
        "- read again the files you had read while loading it:",
        "  - /repo/.rp.md",
        `  - ${SKILL_DIR}/reference/run/loop.md`,
        "- recompute state with `rp_status` and `rp check`.",
      ].join("\n"),
    );
  });

  test("omits the file list when there is nothing to read again", () => {
    const text = renderSkillReload({ skills: ["radical-pipelines"], files: [] });
    assert.doesNotMatch(text, /read again/);
    assert.match(text, /`radical-pipelines`/);
  });
});

describe("listSessionMessages", () => {
  test("follows the server's cursors and returns the whole history oldest first", async () => {
    const messages = Array.from({ length: 5 }, (_, index) => ({ type: "user", text: String(index) }));
    const { requestFn, requests } = fakeServer(messages, { pageSize: 2 });

    const result = await listSessionMessages(server, "ses_1", requestFn);

    assert.deepEqual(
      result.map((message) => message.text),
      ["0", "1", "2", "3", "4"],
    );
    assert.equal(requests.length, 3);
    assert.match(requests[0], /order=asc/);
    assert.match(requests[1], /cursor=2/);
  });

  test("a non-2xx or malformed page is an error, not an empty history", async () => {
    const { requestFn } = fakeServer([], { status: 500 });
    await assert.rejects(listSessionMessages(server, "ses_1", requestFn), /500/);
    for (const body of [undefined, {}, { data: "x" }, { data: [{}] }, { data: [], cursor: { next: 3 } }]) {
      const malformed = async () => ({ status: 200, body });
      await assert.rejects(listSessionMessages(server, "ses_1", malformed), /malformed/, JSON.stringify(body));
      await assert.rejects(hasCheckpoint(server, "ses_1", malformed), /malformed/, JSON.stringify(body));
    }
  });
});

describe("the skill-reload records", () => {
  beforeEach(() => getSkillReloads().clear());

  test("a deleted session's record is dropped", () => {
    holdSkillReload("ses_1", { skills: ["radical-pipelines"], files: [] });
    forgetSkillReload({ type: "session.deleted", data: { sessionID: "ses_1" } });
    forgetSkillReload({ type: "session.created", data: { sessionID: "ses_2" } });
    forgetSkillReload({ type: "session.deleted" });
    assert.equal(getSkillReloads().size, 0);
  });

  test("the oldest record is evicted past the cap", () => {
    for (let index = 0; index < 4097; index += 1) {
      holdSkillReload(`ses_${index}`, { skills: [], files: [] });
    }
    assert.equal(getSkillReloads().size, 4096);
    assert.equal(getSkillReloads().has("ses_0"), false);
    assert.equal(getSkillReloads().has("ses_4096"), true);
  });
});

describe("the context hook", () => {
  const unreachable = async () => assert.fail("the stored history must not be read");
  const deps = (requestFn = unreachable, exists = () => true) => ({ server, skills, requestFn, exists });
  const checkpointed = { role: "user", content: "<conversation-checkpoint>…" };

  beforeEach(() => {
    getSkillReloads().clear();
    globalThis[ERROR_LOG_KEY] = [];
  });

  test("a session's record follows what its requests show; the instruction lists what is lacking until nothing is", async () => {
    // Activation and a read in the active context: recorded, nothing to say.
    const loaded = { sessionID: "ses_o", system: [], messages: [...activeActivation, ...activeRead("/repo/.rp.md")] };
    await onContext(loaded, deps());
    assert.deepEqual(loaded.system, []);
    assert.deepEqual(getSkillReloads().get("ses_o"), { skills: ["radical-pipelines"], files: ["/repo/.rp.md"] });

    // A later request adds a read.
    const more = {
      sessionID: "ses_o",
      system: [],
      messages: [...activeActivation, ...activeRead(`${SKILL_DIR}/reference/run/state.md`)],
    };
    await onContext(more, deps());
    assert.deepEqual(getSkillReloads().get("ses_o").files, ["/repo/.rp.md", `${SKILL_DIR}/reference/run/state.md`]);

    // The checkpoint summary request: asked for the run section, nothing else.
    const summary = { sessionID: "ses_o", system: [], messages: [...activeActivation, summaryPrompt] };
    await onContext(summary, deps());
    assert.equal(summary.system.length, 1);
    assert.match(summary.system[0].text, /## Pipeline run/);

    // After the checkpoint everything is lacking: told on every request.
    for (let request = 0; request < 2; request += 1) {
      const after = { sessionID: "ses_o", system: [], messages: [checkpointed] };
      await onContext(after, deps());
      assert.equal(after.system.length, 1);
      assert.match(after.system[0].text, /load the skill again with the `skill` tool: `radical-pipelines`/);
      assert.match(after.system[0].text, /  - \/repo\/\.rp\.md\n  - \/skills\/radical-pipelines\/reference\/run\/state\.md/);
    }

    // The skill is back but the files are not: only the files are asked for.
    const partial = { sessionID: "ses_o", system: [], messages: [checkpointed, ...activeActivation] };
    await onContext(partial, deps());
    assert.equal(partial.system.length, 1);
    assert.doesNotMatch(partial.system[0].text, /load the skill again/);
    assert.match(partial.system[0].text, /read again the files/);
    assert.match(partial.system[0].text, /\/repo\/\.rp\.md/);

    // One file is back: only the other is asked for.
    const oneRead = { sessionID: "ses_o", system: [], messages: [checkpointed, ...activeActivation, ...activeRead("/repo/.rp.md")] };
    await onContext(oneRead, deps());
    assert.doesNotMatch(oneRead.system[0].text, /\/repo\/\.rp\.md/);
    assert.match(oneRead.system[0].text, /reference\/run\/state\.md/);

    // Everything is back: nothing to say.
    const complete = {
      sessionID: "ses_o",
      system: [],
      messages: [checkpointed, ...activeActivation, ...activeRead("/repo/.rp.md"), ...activeRead(`${SKILL_DIR}/reference/run/state.md`)],
    };
    await onContext(complete, deps());
    assert.deepEqual(complete.system, []);
  });

  test("a skill attached to a prompt counts as its activation in the active context", async () => {
    const attached = { role: "user", content: [{ type: "text", text: "# Radical Pipelines" }, { type: "text", text: "go" }] };
    const loaded = { sessionID: "ses_a", system: [], messages: [attached] };
    await onContext(loaded, deps());
    assert.deepEqual(loaded.system, []);
    assert.deepEqual(getSkillReloads().get("ses_a").skills, ["radical-pipelines"]);

    const after = { sessionID: "ses_a", system: [], messages: [checkpointed] };
    await onContext(after, deps());
    assert.match(after.system[0].text, /`radical-pipelines`/);
  });

  test("a recorded file no longer on disk is not asked for", async () => {
    holdSkillReload("ses_o", { skills: ["radical-pipelines"], files: ["/repo/.rp.md", "/repo/gone.md"] });
    const after = { sessionID: "ses_o", system: [], messages: [checkpointed, ...activeActivation] };
    await onContext(after, deps(unreachable, (path) => path !== "/repo/gone.md"));
    assert.match(after.system[0].text, /\/repo\/\.rp\.md/);
    assert.doesNotMatch(after.system[0].text, /gone\.md/);

    const onlyGone = { sessionID: "ses_o", system: [], messages: [checkpointed, ...activeActivation, ...activeRead("/repo/.rp.md")] };
    await onContext(onlyGone, deps(unreachable, (path) => path !== "/repo/gone.md"));
    assert.deepEqual(onlyGone.system, [], "nothing readable is lacking");
  });

  test("a session that never activated a packaged skill is left alone", async () => {
    const { requestFn, requests } = fakeServer([{ type: "user", text: "hi" }]);
    const plain = { sessionID: "ses_plain", system: [], messages: [{ role: "user", content: "hi" }] };
    await onContext(plain, deps(requestFn));
    assert.deepEqual(plain.system, []);
    assert.equal(requests.length, 1, "read once");

    await onContext({ ...plain, system: [] }, deps());
    const summary = { sessionID: "ses_plain", system: [], messages: [summaryPrompt] };
    await onContext(summary, deps());
    assert.deepEqual(summary.system, []);
  });

  test("a session without a record whose request shows no activation is read from its stored history", async () => {
    const { requestFn } = fakeServer([storedActivation, storedRead("/repo/.rp.md"), checkpoint]);
    const restarted = { sessionID: "ses_restarted", system: [], messages: [checkpointed] };
    await onContext(restarted, deps(requestFn));
    assert.equal(restarted.system.length, 1);
    assert.match(restarted.system[0].text, /`radical-pipelines`/);
    assert.deepEqual(getSkillReloads().get("ses_restarted").files, ["/repo/.rp.md"]);
  });

  test("a spawned agent is skipped without a read", async () => {
    recordSpawn("ses_agent", { name: "researcher slug-1", run: "slug", spawner: "ses_o" });
    const context = { sessionID: "ses_agent", system: [], messages: [] };
    await onContext(context, deps());
    assert.deepEqual(context.system, []);
    assert.equal(getSkillReloads().has("ses_agent"), false);
  });

  test("a history that cannot be read leaves no record, is reported, and is read again next time", async () => {
    const { requestFn } = fakeServer([], { status: 500 });
    const context = { sessionID: "ses_o", system: [], messages: [] };
    await onContext(context, deps(requestFn));
    assert.deepEqual(context.system, []);
    assert.equal(getSkillReloads().has("ses_o"), false);
    assert.equal(globalThis[ERROR_LOG_KEY][0].type, "skill.reload.unreadable");
  });

  test("without a server, a session is known only through what its requests show", async () => {
    const loaded = { sessionID: "ses_o", system: [], messages: activeActivation };
    await onContext(loaded, { ...deps(), server: null });
    const after = { sessionID: "ses_o", system: [], messages: [] };
    await onContext(after, { ...deps(), server: null });
    assert.equal(after.system.length, 1);

    const unknown = { sessionID: "ses_u", system: [], messages: [] };
    await onContext(unknown, { ...deps(), server: null });
    assert.deepEqual(unknown.system, []);
  });
});
