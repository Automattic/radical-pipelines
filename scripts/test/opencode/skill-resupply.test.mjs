import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
  activeSkillActivations,
  forgetSkillActivations,
  getSkillActivations,
  holdSkillActivations,
  listSessionMessages,
  onContext,
  packagedSkillActivations,
  readSealedSkillActivations,
  recordSpawn,
  renderSkillResupply,
  storedSkillActivations,
} from "../../../opencode/plugin.mjs";

const ERROR_LOG_KEY = Symbol.for("radical-pipelines.opencode.errorLog");

const SKILL_DIR = "/skills/radical-pipelines";
const skills = [{ id: "radical-pipelines", name: "radical-pipelines", path: `${SKILL_DIR}/SKILL.md`, content: "# Radical Pipelines" }];
const server = { baseURL: "http://127.0.0.1:1", password: "pw" };

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
        result: outcome?.error ? { type: "error", value: { message: "failed" } } : { type: "text", value: "…" },
      })),
    },
  ];
}
const activeActivation = active(["skill", { id: "radical-pipelines" }]);
/** A skill attached to a prompt, as opencode renders it into the user message. */
const attachedSkill = { type: "text", text: '<skill_content name="radical-pipelines">\n# Skill: radical-pipelines\n\n# Radical Pipelines\n…\n</skill_content>' };
const checkpointed = { role: "user", content: "<conversation-checkpoint>…" };

/**
 * A `requestFn` serving one session's stored history in pages of
 * `pageSize`, as the API does: `order`, `limit`, and `cursor` only,
 * no type filter. Records request paths.
 */
function fakeServer(messages, { pageSize = 200, status = 200 } = {}) {
  const requests = [];
  const requestFn = async (url) => {
    requests.push(`${url.pathname}${url.search}`);
    if (status !== 200) {
      return { status, body: undefined };
    }
    const ordered = url.searchParams.get("order") === "desc" ? [...messages].reverse() : messages;
    const start = Number(url.searchParams.get("cursor") ?? 0);
    const page = ordered.slice(start, start + pageSize);
    const next = start + pageSize < ordered.length ? String(start + pageSize) : null;
    return { status: 200, body: { data: page, cursor: { next, previous: null } } };
  };
  return { requestFn, requests };
}

describe("packagedSkillActivations", () => {
  test("keeps packaged skills in first-seen order without repeats", () => {
    assert.deepEqual(
      packagedSkillActivations(["other", "radical-pipelines", undefined, "radical-pipelines"], skills),
      ["radical-pipelines"],
    );
  });
});

describe("storedSkillActivations", () => {
  test("yields every stored activation form, completed calls only", () => {
    const messages = [
      storedActivation,
      { type: "skill", skill: "radical-pipelines", name: "radical-pipelines", text: "…" },
      { type: "user", text: "work", skills: [{ id: "radical-pipelines", name: "radical-pipelines" }] },
      { type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "error", input: { id: "x" } } }] },
      { type: "assistant", content: [{ type: "tool", name: "read", state: { status: "completed", input: { path: "/p" } } }] },
      { type: "assistant", content: [{ type: "text", text: "no tools" }] },
      checkpoint,
    ];
    assert.deepEqual([...storedSkillActivations(messages)], ["radical-pipelines", "radical-pipelines", "radical-pipelines"]);
  });
});

describe("activeSkillActivations", () => {
  test("yields skill calls with a successful result and skill bodies attached to a prompt", () => {
    const [pending] = active(["skill", { id: "radical-pipelines" }]);
    const messages = [
      { role: "system", content: "…" },
      { role: "user", content: "hi" },
      { role: "user", content: [attachedSkill, { type: "text", text: "work on it" }] },
      { role: "user", content: [{ type: "text", text: "# Radical Pipelines" }] },
      ...activeActivation,
      { role: "assistant", content: "plain text" },
      ...active(["read", { path: "/repo/.rp.md" }]),
      ...active(["skill", { id: "radical-pipelines" }, { error: true }]),
      pending,
    ];
    assert.deepEqual([...activeSkillActivations(messages, skills)], ["radical-pipelines", "radical-pipelines"]);
  });
});

describe("readSealedSkillActivations", () => {
  test("a session without a completed checkpoint has nothing sealed", async () => {
    const { requestFn } = fakeServer([storedActivation, { type: "compaction", status: "failed" }]);
    assert.deepEqual(await readSealedSkillActivations(server, "ses_1", skills, requestFn), []);
  });

  test("the history is read once, across its pages", async () => {
    const failures = Array.from({ length: 5 }, () => ({ type: "compaction", status: "failed" }));
    const { requestFn, requests } = fakeServer([storedActivation, ...failures, checkpoint], { pageSize: 2 });
    assert.deepEqual(await readSealedSkillActivations(server, "ses_1", skills, requestFn), ["radical-pipelines"]);
    assert.equal(requests.length, 4);
  });

  test("only what precedes the last completed checkpoint is sealed", async () => {
    const { requestFn } = fakeServer([storedActivation, checkpoint, { type: "compaction", status: "failed" }]);
    assert.deepEqual(await readSealedSkillActivations(server, "ses_1", skills, requestFn), ["radical-pipelines"]);
    const after = fakeServer([{ type: "user", text: "hi" }, checkpoint, storedActivation]);
    assert.deepEqual(await readSealedSkillActivations(server, "ses_1", skills, after.requestFn), []);
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

  test("a page of well-formed records is accepted, including unfinished or failed calls without input and other tools", async () => {
    const body = {
      data: [
        { type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "running" } }] },
        { type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "error", input: {} } }] },
        { type: "assistant", content: [{ type: "tool", name: "read", state: { status: "completed", input: {} } }] },
        { type: "user", text: "hi" },
        { type: "shell" },
      ],
      cursor: { previous: null },
    };
    const requestFn = async () => ({ status: 200, body });
    assert.equal((await listSessionMessages(server, "ses_1", requestFn)).length, 5);
  });

  test("a non-2xx or malformed page is an error, not an empty history", async () => {
    const { requestFn } = fakeServer([], { status: 500 });
    await assert.rejects(listSessionMessages(server, "ses_1", requestFn), /500/);
    for (const body of [
      undefined,
      {},
      { data: "x" },
      { data: [{}] },
      { data: [], cursor: { next: 3 } },
      { data: [], cursor: "invalid" },
      { data: [{ type: "compaction" }] },
      { data: [{ type: "skill" }] },
      { data: [{ type: "user", skills: [{}] }] },
      { data: [{ type: "assistant", content: "x" }] },
      { data: [{ type: "assistant", content: [{ type: "tool", name: "skill" }] }] },
      { data: [{ type: "assistant", content: [{ type: "tool", state: { status: "completed" } }] }] },
      { data: [{ type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "completed" } }] }] },
      { data: [{ type: "assistant", content: [{ type: "tool", name: "skill", state: { status: "completed", input: { id: 42 } } }] }] },
    ]) {
      const malformed = async () => ({ status: 200, body });
      await assert.rejects(listSessionMessages(server, "ses_1", malformed), /malformed/, JSON.stringify(body));
    }
  });
});

describe("the skill-activation records", () => {
  beforeEach(() => getSkillActivations().clear());

  test("a deleted session's record is dropped", () => {
    holdSkillActivations("ses_1", { skills: ["radical-pipelines"], recovered: true });
    forgetSkillActivations({ type: "session.deleted", data: { sessionID: "ses_1" } });
    forgetSkillActivations({ type: "session.created", data: { sessionID: "ses_2" } });
    forgetSkillActivations({ type: "session.deleted" });
    assert.equal(getSkillActivations().size, 0);
  });

  test("the oldest record is evicted past the cap", () => {
    for (let index = 0; index < 4097; index += 1) {
      holdSkillActivations(`ses_${index}`, { skills: [], recovered: true });
    }
    assert.equal(getSkillActivations().size, 4096);
    assert.equal(getSkillActivations().has("ses_0"), false);
    assert.equal(getSkillActivations().has("ses_4096"), true);
  });
});

describe("renderSkillResupply", () => {
  test("re-supplies each skill with its base directory and body", () => {
    assert.equal(
      renderSkillResupply(skills),
      [
        "This session's context was checkpointed. The skill it had loaded is re-supplied here.",
        `Skill: radical-pipelines\nBase directory: ${SKILL_DIR}\n\n# Radical Pipelines`,
      ].join("\n\n"),
    );
  });
});

describe("the context hook", () => {
  const unreachable = async () => assert.fail("the stored history must not be read");
  /** Defaults to an empty stored history: a session's first sighting reads it once. */
  const deps = (requestFn = fakeServer([]).requestFn) => ({ server, skills, requestFn });
  const record = (sessionID) => getSkillActivations().get(sessionID);

  beforeEach(() => {
    getSkillActivations().clear();
    globalThis[ERROR_LOG_KEY] = [];
  });

  test("a session's record follows what its requests show; the skill is re-supplied while its activation is missing", async () => {
    // The activation in the active context: recorded, nothing to say.
    const loaded = { sessionID: "ses_o", system: [], messages: activeActivation };
    await onContext(loaded, deps());
    assert.deepEqual(loaded.system, []);
    assert.deepEqual(record("ses_o"), { skills: ["radical-pipelines"], recovered: true });

    // A later request; the history is not read again.
    await onContext({ sessionID: "ses_o", system: [], messages: activeActivation }, deps(unreachable));

    // After the checkpoint the activation is gone: re-supplied on every request.
    for (let request = 0; request < 2; request += 1) {
      const after = { sessionID: "ses_o", system: [], messages: [checkpointed] };
      await onContext(after, deps(unreachable));
      assert.equal(after.system.length, 1);
      assert.match(after.system[0].text, /context was checkpointed/);
      assert.match(after.system[0].text, /Skill: radical-pipelines\nBase directory: \/skills\/radical-pipelines\n\n# Radical Pipelines/);
    }

    // The session loaded it again: nothing to say.
    const reloaded = { sessionID: "ses_o", system: [], messages: [checkpointed, ...activeActivation] };
    await onContext(reloaded, deps(unreachable));
    assert.deepEqual(reloaded.system, []);
  });

  test("a skill attached to a prompt counts as its activation in the active context", async () => {
    const attached = { role: "user", content: [attachedSkill, { type: "text", text: "go" }] };
    const loaded = { sessionID: "ses_a", system: [], messages: [attached] };
    await onContext(loaded, deps());
    assert.deepEqual(loaded.system, []);
    assert.deepEqual(record("ses_a").skills, ["radical-pipelines"]);

    const after = { sessionID: "ses_a", system: [], messages: [checkpointed] };
    await onContext(after, deps(unreachable));
    assert.match(after.system[0].text, /Skill: radical-pipelines/);
  });

  test("a session that never activated a packaged skill is left alone", async () => {
    const { requestFn, requests } = fakeServer([{ type: "user", text: "hi" }]);
    const plain = { sessionID: "ses_plain", system: [], messages: [{ role: "user", content: "hi" }] };
    await onContext(plain, deps(requestFn));
    assert.deepEqual(plain.system, []);
    assert.equal(requests.length, 1, "read once");
    await onContext({ ...plain, system: [] }, deps(unreachable));
    assert.deepEqual(plain.system, []);
  });

  test("a session without a record is read from its stored history, whatever its request shows", async () => {
    const history = [storedActivation, checkpoint];
    const restarted = { sessionID: "ses_restarted", system: [], messages: [checkpointed] };
    await onContext(restarted, deps(fakeServer(history).requestFn));
    assert.equal(restarted.system.length, 1);
    assert.match(restarted.system[0].text, /Skill: radical-pipelines/);

    const reloaded = { sessionID: "ses_reloaded", system: [], messages: [checkpointed, ...activeActivation] };
    await onContext(reloaded, deps(fakeServer(history).requestFn));
    assert.deepEqual(reloaded.system, []);
    assert.deepEqual(record("ses_reloaded"), { skills: ["radical-pipelines"], recovered: true });
  });

  test("concurrent requests of one session await the same history read", async () => {
    let reads = 0;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const requestFn = async () => {
      reads += 1;
      await gate;
      return { status: 200, body: { data: [storedActivation, checkpoint], cursor: { next: null } } };
    };
    const first = { sessionID: "ses_c", system: [], messages: [checkpointed] };
    const second = { sessionID: "ses_c", system: [], messages: [checkpointed] };
    const pending = Promise.all([onContext(first, deps(requestFn)), onContext(second, deps(requestFn))]);
    await new Promise((resolve) => setImmediate(resolve));
    release();
    await pending;
    assert.equal(reads, 1, "one read of the history, shared");
    assert.equal(first.system.length, 1);
    assert.equal(second.system.length, 1, "the second request waited for the sealed activation");
  });

  test("a session deleted while its history is being read is not held", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const requestFn = async () => {
      await gate;
      return { status: 200, body: { data: [storedActivation, checkpoint], cursor: { next: null } } };
    };
    const pending = onContext({ sessionID: "ses_gone", system: [], messages: [] }, deps(requestFn));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getSkillActivations().has("ses_gone"), true, "held while the read is in flight");
    forgetSkillActivations({ type: "session.deleted", data: { sessionID: "ses_gone" } });
    release();
    await pending;
    assert.equal(getSkillActivations().has("ses_gone"), false);
  });

  test("a spawned agent is skipped without a read", async () => {
    recordSpawn("ses_agent", { name: "researcher slug-1", run: "slug", spawner: "ses_o" });
    const context = { sessionID: "ses_agent", system: [], messages: [] };
    await onContext(context, deps(unreachable));
    assert.deepEqual(context.system, []);
    assert.equal(getSkillActivations().has("ses_agent"), false);
  });

  test("a history that cannot be read is reported once, read again next time, and does not hide what is known", async () => {
    const { requestFn, requests } = fakeServer([], { status: 500 });
    const context = { sessionID: "ses_o", system: [], messages: [] };
    await onContext(context, deps(requestFn));
    assert.deepEqual(context.system, []);
    assert.deepEqual(record("ses_o"), { skills: [], recovered: false });
    assert.deepEqual(globalThis[ERROR_LOG_KEY].map((entry) => entry.type), ["skill.resupply.unreadable"]);

    await onContext({ sessionID: "ses_o", system: [], messages: [] }, deps(requestFn));
    assert.equal(requests.length, 2, "read again");

    // An activation seen before is served while the history stays unreadable.
    await onContext({ sessionID: "ses_o", system: [], messages: activeActivation }, deps(requestFn));
    const after = { sessionID: "ses_o", system: [], messages: [checkpointed] };
    await onContext(after, deps(requestFn));
    assert.equal(after.system.length, 1);
    assert.deepEqual(record("ses_o"), { skills: ["radical-pipelines"], recovered: false });
  });

  test("without a server, a session is known through its requests until the server is reachable", async () => {
    const loaded = { sessionID: "ses_o", system: [], messages: activeActivation };
    await onContext(loaded, { ...deps(), server: null });
    assert.deepEqual(record("ses_o"), { skills: ["radical-pipelines"], recovered: false });
    const after = { sessionID: "ses_o", system: [], messages: [] };
    await onContext(after, { ...deps(), server: null });
    assert.equal(after.system.length, 1);

    // The server is back: the sealed history is read then.
    const unknown = { sessionID: "ses_u", system: [], messages: [checkpointed] };
    await onContext(unknown, { ...deps(), server: null });
    assert.deepEqual(unknown.system, []);
    const { requestFn, requests } = fakeServer([storedActivation, checkpoint]);
    const recovered = { sessionID: "ses_u", system: [], messages: [checkpointed] };
    await onContext(recovered, deps(requestFn));
    assert.ok(requests.length > 0, "the history is read once the server is reachable");
    assert.equal(recovered.system.length, 1);
    assert.deepEqual(record("ses_u"), { skills: ["radical-pipelines"], recovered: true });
  });
});
