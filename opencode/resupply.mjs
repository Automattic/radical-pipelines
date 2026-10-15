/**
 * Skill re-supply: keeping a session's activated skill across opencode's
 * context checkpoints.
 */

import { dirname } from "node:path";

import { requestServer, sessionReadError } from "./client.mjs";
import { recordError } from "./diagnostics.mjs";
import { resolveSession } from "./ledger.mjs";

/**
 * `globalThis` key backing the per-session record of activated skills.
 *
 * Shares the re-import rationale of `LEDGER_KEY`. Each entry lists the
 * packaged skills a session has been seen to activate, and whether what a
 * checkpoint sealed away has been recovered from its stored history.
 */
const SKILL_ACTIVATIONS_KEY = Symbol.for("radical-pipelines.opencode.skillActivations");

/**
 * Fetch the process-wide skill-activation records, creating them on first use.
 *
 * @returns {Map<string, { skills: string[], recovered: boolean }>} Session
 *   ID to the ids of the packaged skills it activated, in first-seen order,
 *   and whether its sealed history has been read.
 */
function getSkillActivations() {
  if (!globalThis[SKILL_ACTIVATIONS_KEY]) {
    globalThis[SKILL_ACTIVATIONS_KEY] = new Map();
  }
  return globalThis[SKILL_ACTIVATIONS_KEY];
}

/**
 * `globalThis` key backing the sealed-history reads in flight, one per
 * session, so concurrent requests of a session await the same read.
 */
const SKILL_RECOVERIES_KEY = Symbol.for("radical-pipelines.opencode.skillRecoveries");

/**
 * Fetch the in-flight sealed-history reads, creating the map on first use.
 *
 * @returns {Map<string, Promise<string[]>>}
 */
function getSkillRecoveries() {
  if (!globalThis[SKILL_RECOVERIES_KEY]) {
    globalThis[SKILL_RECOVERIES_KEY] = new Map();
  }
  return globalThis[SKILL_RECOVERIES_KEY];
}

/**
 * Upper bound on held skill-activation records. Every root session the hook
 * sees gets one; the oldest is evicted past this bound and, if it still
 * matters, derived again from the session's stored history.
 */
const SKILL_ACTIVATIONS_CAP = 4096;

/**
 * Hold a session's skill-activation record, evicting the oldest past the cap.
 *
 * @param {string} sessionID
 * @param {{ skills: string[], recovered: boolean }} record
 * @returns {void}
 */
function holdSkillActivations(sessionID, record) {
  const records = getSkillActivations();
  records.set(sessionID, record);
  while (records.size > SKILL_ACTIVATIONS_CAP) {
    records.delete(records.keys().next().value);
  }
}

/**
 * Drop a deleted session's skill-activation record.
 *
 * @param {object} event The event received from `ctx.event.subscribe`.
 * @returns {void}
 */
function forgetSkillActivations(event) {
  if (event?.type === "session.deleted" && typeof event.data?.sessionID === "string") {
    getSkillActivations().delete(event.data.sessionID);
  }
}

/**
 * The skill activations in a session's stored history, oldest first: a
 * completed `skill` tool call, a `skill` message, or a skill attached to a
 * user prompt.
 *
 * @param {Array<object>} messages `Session.Message.Info` records.
 * @returns {Generator<string>} The activated skill ids, repeats included.
 */
function* storedSkillActivations(messages) {
  for (const message of messages) {
    if (message.type === "skill") {
      yield message.skill;
    }
    if (message.type === "user") {
      for (const skill of message.skills ?? []) {
        yield skill.id;
      }
    }
    if (message.type === "assistant") {
      for (const part of message.content ?? []) {
        if (part.type === "tool" && part.name === "skill" && part.state?.status === "completed") {
          yield part.state.input.id;
        }
      }
    }
  }
}

/**
 * The skill activations in the messages a model request carries — the
 * active context, as the `context` hook sees it: a `skill` tool call whose
 * `tool-result` part has a `result.type` other than `error`, or a user text
 * part opening with the `<skill_content name="…">` tag opencode renders a
 * skill attached to a prompt with.
 *
 * @param {Array<{ role: string, content: string | Array<object> }>} messages
 * @param {Array<{ id: string, name: string }>} skills The packaged skills.
 * @returns {Generator<string>} The activated skill ids, repeats included.
 */
function* activeSkillActivations(messages, skills) {
  const succeeded = new Set();
  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const part of message.content) {
      if (part.type === "tool-result" && part.result?.type !== "error") {
        succeeded.add(part.id);
      }
    }
  }
  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const part of message.content) {
      if (message.role === "user" && part.type === "text") {
        const attached = skills.find((skill) => part.text?.startsWith(`<skill_content name="${skill.name}">`));
        if (attached) {
          yield attached.id;
        }
      }
      if (message.role === "assistant" && part.type === "tool-call" && part.name === "skill" && succeeded.has(part.id)) {
        yield part.input?.id;
      }
    }
  }
}

/**
 * Keep the packaged skills among activations, in first-seen order without
 * repeats.
 *
 * @param {Iterable<string>} activations Skill ids, as activated.
 * @param {Array<{ id: string }>} skills The packaged skills.
 * @returns {string[]}
 */
function packagedSkillActivations(activations, skills) {
  const ids = new Set(skills.map((skill) => skill.id));
  const result = [];
  for (const id of activations) {
    if (ids.has(id) && !result.includes(id)) {
      result.push(id);
    }
  }
  return result;
}

/**
 * Page size for `listSessionMessages`.
 */
const SESSION_MESSAGES_PAGE = 200;

/**
 * Read a session's whole stored history, oldest first, following the
 * server's cursors. Earlier messages remain stored after a checkpoint, so
 * this sees what the active context no longer does.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session to read.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 *   Injectable request function, forwarded to `requestServer`.
 * @returns {Promise<Array<object>>} Every `Session.Message.Info` record.
 * @throws {Error} On a non-2xx response or a malformed page.
 */
async function listSessionMessages(server, sessionID, requestFn) {
  const messages = [];
  let path = `/api/session/${sessionID}/message?order=asc&limit=${SESSION_MESSAGES_PAGE}`;
  while (path) {
    const response = await requestServer(server, "GET", path, undefined, requestFn);
    if (response.status < 200 || response.status >= 300) {
      throw sessionReadError(`GET /api/session/${sessionID}/message`, response.status);
    }
    const page = sessionMessagesPage(response.body, sessionID);
    messages.push(...page.data);
    const next = page.cursor?.next;
    path = next
      ? `/api/session/${sessionID}/message?cursor=${encodeURIComponent(next)}&limit=${SESSION_MESSAGES_PAGE}`
      : undefined;
  }
  return messages;
}

/**
 * Validate one page of `GET /api/session/:id/message`: a `data` array of
 * well-formed records, and a `cursor` that is absent or an object whose
 * `next` is absent, null, or a string. Anything else cannot be read.
 *
 * @param {*} body The parsed response body.
 * @param {string} sessionID The session read, for the error.
 * @returns {{ data: Array<object>, cursor?: { next?: string | null } }}
 * @throws {Error} On a malformed page.
 */
function sessionMessagesPage(body, sessionID) {
  const cursor = body?.cursor;
  const wellFormed =
    Array.isArray(body?.data) &&
    body.data.every(isWellFormedStoredMessage) &&
    (cursor === undefined ||
      (typeof cursor === "object" &&
        cursor !== null &&
        (cursor.next === undefined || cursor.next === null || typeof cursor.next === "string")));
  if (!wellFormed) {
    throw new Error(`GET /api/session/${sessionID}/message returned a malformed page`);
  }
  return body;
}

/**
 * Decide whether a stored message carries, well-formed, every field
 * `storedSkillActivations` and `readSealedSkillActivations` consume: a
 * string `type`; a `compaction` has a string `status`; a `skill` has a
 * string `skill`; a `user` has no `skills` or an array of objects with a
 * string `id`; an `assistant` has no `content` or an array of parts with a
 * string `type`, where a `tool` part has a string `name` and a `state`
 * object with a string `status`, and a completed `skill` call has an input
 * object with a string `id`.
 *
 * @param {*} message
 * @returns {boolean}
 */
function isWellFormedStoredMessage(message) {
  if (typeof message?.type !== "string") {
    return false;
  }
  if (message.type === "compaction") {
    return typeof message.status === "string";
  }
  if (message.type === "skill") {
    return typeof message.skill === "string";
  }
  if (message.type === "user") {
    return (
      message.skills === undefined ||
      (Array.isArray(message.skills) && message.skills.every((skill) => typeof skill?.id === "string"))
    );
  }
  if (message.type === "assistant") {
    return message.content === undefined || (Array.isArray(message.content) && message.content.every(isWellFormedStoredPart));
  }
  return true;
}

/**
 * The part clause of `isWellFormedStoredMessage`.
 *
 * @param {*} part
 * @returns {boolean}
 */
function isWellFormedStoredPart(part) {
  if (typeof part?.type !== "string") {
    return false;
  }
  if (part.type !== "tool") {
    return true;
  }
  const { name, state } = part;
  if (typeof name !== "string" || typeof state !== "object" || state === null || typeof state.status !== "string") {
    return false;
  }
  return name !== "skill" || state.status !== "completed" || typeof state.input?.id === "string";
}

/**
 * Derive a session's activations from its stored history: what the last
 * completed checkpoint has sealed away from the active context. A session
 * without a checkpoint has nothing sealed.
 *
 * @param {{ baseURL: string, password: string }} server A resolved server.
 * @param {string} sessionID The session to read.
 * @param {Array<{ id: string }>} skills The packaged skills.
 * @param {(url: URL, init: object) => Promise<{status: number, body: *}>} [requestFn]
 * @returns {Promise<string[]>}
 * @throws {Error} When the history cannot be read.
 */
async function readSealedSkillActivations(server, sessionID, skills, requestFn) {
  const messages = await listSessionMessages(server, sessionID, requestFn);
  const last = messages.findLastIndex((message) => message.type === "compaction" && message.status === "completed");
  return packagedSkillActivations(storedSkillActivations(messages.slice(0, Math.max(last, 0))), skills);
}

/**
 * Render the skills re-supplied to a session that continues from a
 * checkpoint, each as the `skill` tool presented it: its body and its base
 * directory, current as registered.
 *
 * @param {Array<{ id: string, path: string, content: string }>} skills
 * @returns {string}
 */
function renderSkillResupply(skills) {
  return [
    "This session's context was checkpointed. The skill it had loaded is re-supplied here.",
    ...skills.map((skill) => `Skill: ${skill.id}\nBase directory: ${dirname(skill.path)}\n\n${skill.content}`),
  ].join("\n\n");
}

/**
 * The context hook: keep a session's skill across checkpoints.
 *
 * Compaction summarizes the transcript and drops instructions the assistant
 * was given rather than told — an activated skill among them — so a session
 * that continues from a checkpoint has lost it. Every request shows its
 * active context; the activations it shows are added to the session's
 * record. A request that no longer carries a recorded activation is
 * continuing from a checkpoint: the skill's body is re-supplied in
 * `system`, as the tool's own compaction re-supplies invoked skills.
 *
 * What a checkpoint sealed is not in any request: until a session's stored
 * history has been read, it is read — once, shared by the requests that
 * arrive meanwhile, and again on the next request when it fails or the
 * server is unreachable; meanwhile the record serves as far as it goes. A
 * spawned agent never activates the skill and is skipped.
 *
 * @param {{ sessionID: string, system: Array<{ type: string, text: string }>, messages: Array<object> }} event
 *   The `context` hook event.
 * @param {{ server: { baseURL: string, password: string } | null, skills: Array<object>, requestFn?: Function, readSession: Function }} deps
 *   `readSession` reaches `resolveSession`.
 * @returns {Promise<void>}
 */
async function onContext(event, { server, skills, requestFn, readSession }) {
  const { sessionID } = event;
  if ((await resolveSession(sessionID, { readSession })).spawn) {
    return;
  }
  const observed = packagedSkillActivations(activeSkillActivations(event.messages, skills), skills);
  const records = getSkillActivations();
  let record = records.get(sessionID);
  if (!record) {
    record = { skills: [], recovered: false };
    holdSkillActivations(sessionID, record);
  }
  record.skills = packagedSkillActivations([...record.skills, ...observed], skills);
  if (!record.recovered && server) {
    const recoveries = getSkillRecoveries();
    let recovery = recoveries.get(sessionID);
    if (!recovery) {
      recovery = readSealedSkillActivations(server, sessionID, skills, requestFn)
        .catch((error) => {
          recordError({ type: "skill.resupply.unreadable", sessionID, error: String(error), at: Date.now() });
          throw error;
        })
        .finally(() => recoveries.delete(sessionID));
      recoveries.set(sessionID, recovery);
    }
    const sealed = await recovery.catch(() => undefined);
    // The session may have been deleted meanwhile; its record is gone and
    // stays gone.
    record = records.get(sessionID);
    if (!record) {
      return;
    }
    if (sealed) {
      record.skills = packagedSkillActivations([...sealed, ...record.skills], skills);
      record.recovered = true;
    }
  }
  const lacking = record.skills.filter((id) => !observed.includes(id));
  if (lacking.length === 0) {
    return;
  }
  event.system.push({
    type: "text",
    text: renderSkillResupply(skills.filter((skill) => lacking.includes(skill.id))),
  });
}

export {
  activeSkillActivations,
  forgetSkillActivations,
  getSkillActivations,
  holdSkillActivations,
  listSessionMessages,
  onContext,
  packagedSkillActivations,
  readSealedSkillActivations,
  renderSkillResupply,
  storedSkillActivations,
};
