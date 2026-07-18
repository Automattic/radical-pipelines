/**
 * Thin authenticated HTTP client for driving the sandbox's `serve` process,
 * plus the higher-level session operations the checks share.
 *
 * Every opencode HTTP GET (and most POST) response envelopes its payload as
 * `{ data: ... }` (some additionally carry `location`) — verified live
 * against the pinned build. This client unwraps that envelope once, here,
 * so no check has to re-derive it.
 */

import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { directivePrompt } from "./stub-provider.mjs";

/**
 * Issue one authenticated HTTP request against the sandbox's `serve`
 * process.
 *
 * @param {{ baseURL: string, password: string }} server
 * @param {"GET"|"POST"} method
 * @param {string} path
 * @param {*} [body] JSON-serializable request body (POST only).
 * @returns {Promise<{ status: number, body: * }>}
 */
export function request(server, method, path, body) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers = {
    Authorization: `Basic ${Buffer.from(`opencode:${server.password}`).toString("base64")}`,
  };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(path, server.baseURL), { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let parsedBody;
        try {
          parsedBody = raw ? JSON.parse(raw) : undefined;
        } catch {
          parsedBody = raw;
        }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on("error", reject);
    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

/** Unwrap the `{ data: ... }` envelope every opencode GET response carries. */
const data = (response) => response.body?.data;

/**
 * Build a `location[directory]=...` query string.
 *
 * opencode's query parser matches the literal `location[directory]` key —
 * verified live that percent-encoding the brackets (what `URLSearchParams`
 * does for any key given as a whole) makes it resolve an empty/different
 * scope instead. Only the value is percent-encoded here.
 *
 * @param {string} directory
 * @returns {string}
 */
const locationQuery = (directory) => `location[directory]=${encodeURIComponent(directory)}`;

/**
 * Create a session.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {{ agent: string, directory: string, model?: { providerID: string, id: string } }} options
 * @returns {Promise<object>} The created `SessionInfo`.
 */
export async function createSession(server, { agent, directory, model }) {
  const response = await request(server, "POST", "/api/session", {
    agent,
    location: { directory },
    ...(model ? { model } : {}),
  });
  return data(response);
}

/**
 * Post a durable input to a session (`delivery: "queue"` by default, so a
 * busy target admits it rather than steering the in-flight turn).
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @param {string} text
 * @param {{ delivery?: "steer" | "queue" }} [options]
 * @returns {Promise<object>} The admitted input record.
 */
export async function prompt(server, sessionID, text, { delivery = "queue" } = {}) {
  const response = await request(server, "POST", `/api/session/${sessionID}/prompt`, { text, delivery });
  return data(response);
}

/**
 * Read a session's current record.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @returns {Promise<object>}
 */
export async function getSession(server, sessionID) {
  const response = await request(server, "GET", `/api/session/${sessionID}`);
  return data(response);
}

/**
 * List a session's messages, newest first (opencode's own ordering).
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @returns {Promise<Array<object>>}
 */
export async function getMessages(server, sessionID) {
  const response = await request(server, "GET", `/api/session/${sessionID}/message`);
  return data(response) ?? [];
}

/**
 * Read the set of session IDs opencode currently reports as running.
 *
 * @param {{baseURL:string,password:string}} server
 * @returns {Promise<Set<string>>}
 */
export async function getActiveSessionIDs(server) {
  const response = await request(server, "GET", "/api/session/active");
  return new Set(Object.keys(data(response) ?? {}));
}

/**
 * Read a session's admitted-but-unpromoted pending inputs.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @returns {Promise<Array<object>>}
 */
export async function getPending(server, sessionID) {
  const response = await request(server, "GET", `/api/session/${sessionID}/pending`);
  return data(response) ?? [];
}

/**
 * Interrupt a session's in-flight execution.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @returns {Promise<number>} The HTTP status (204 on success).
 */
export async function interrupt(server, sessionID) {
  const response = await request(server, "POST", `/api/session/${sessionID}/interrupt`);
  return response.status;
}

/**
 * Switch a session's model in place (the auth-recovery retry-1 action):
 * applies from the next turn without disrupting the current one.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @param {{ providerID: string, id: string }} model
 * @returns {Promise<number>} The HTTP status (204 on success).
 */
export async function switchModel(server, sessionID, model) {
  const response = await request(server, "POST", `/api/session/${sessionID}/model`, { model });
  return response.status;
}

/**
 * List every plugin opencode currently reports loaded, in this project's
 * scope.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} directory
 * @returns {Promise<Array<{id: string}>>}
 */
export async function listPlugins(server, directory) {
  const response = await request(server, "GET", `/api/plugin?${locationQuery(directory)}`);
  return data(response) ?? [];
}

/**
 * List every agent opencode currently recognizes, in this project's scope.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} directory
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listAgents(server, directory) {
  const response = await request(server, "GET", `/api/agent?${locationQuery(directory)}`);
  return data(response) ?? [];
}

/**
 * List every skill source opencode currently recognizes, in this project's
 * scope.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} directory
 * @returns {Promise<Array<{id: string, location: string}>>}
 */
export async function listSkills(server, directory) {
  const response = await request(server, "GET", `/api/skill?${locationQuery(directory)}`);
  return data(response) ?? [];
}

/**
 * Poll until a predicate over a session's message list is satisfied, or
 * time out.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @param {(messages: Array<object>) => T | undefined} predicate Returns a
 *   truthy result once satisfied.
 * @param {{ timeoutMs?: number, intervalMs?: number, label?: string }} [options]
 * @returns {Promise<T>}
 * @template T
 */
export async function pollMessages(server, sessionID, predicate, { timeoutMs = 20_000, intervalMs = 300, label } = {}) {
  return pollUntil(async () => predicate(await getMessages(server, sessionID)), { timeoutMs, intervalMs, label });
}

/**
 * Poll an async predicate until it returns a truthy value, or time out.
 *
 * On a cold cache, opencode's own catalog build (agents/plugins/skills) runs
 * asynchronously after a session's creation response returns — verified
 * live that `/api/plugin`, `/api/agent`, and `/api/skill` can take a few
 * seconds to populate the first time, well after `session.create` itself
 * resolves. Every check that reads one of those endpoints polls rather than
 * asserting on a single immediate read.
 *
 * @param {() => Promise<T | undefined | null | false>} fn
 * @param {{ timeoutMs?: number, intervalMs?: number, label?: string }} [options]
 * @returns {Promise<T>}
 * @template T
 */
export async function pollUntil(fn, { timeoutMs = 20_000, intervalMs = 300, label } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result) {
      return result;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for: ${label ?? "predicate"}`);
    }
    await delay(intervalMs);
  }
}

/**
 * Find, within a session's messages, the Code Mode `execute` tool-call
 * result whose input code carries the given nonce, once it has completed
 * (`state.content` populated).
 *
 * @param {Array<object>} messages As returned by `getMessages`.
 * @param {string} nonce The nonce embedded via `directivePrompt`.
 * @returns {{ text: string, structuredJSON: * } | undefined} `text` is the
 *   tool result's raw rendered text (see the plugin's `toToolResult`);
 *   `structuredJSON` is `JSON.parse(text)` when `text` parses as JSON, else
 *   `undefined` (the tool returned a bare string, rendered verbatim).
 */
function findToolResult(messages, nonce) {
  for (const message of messages) {
    for (const part of message.content ?? []) {
      if (part.type !== "tool") continue;
      const input = part.state?.input;
      if (!input || typeof input.code !== "string" || !input.code.includes(nonce)) continue;
      const content = part.state?.content;
      // An in-progress tool call reports `content: []` (present but empty)
      // before it completes — verified live — so an empty array must be
      // treated the same as "not yet done", not as a completed result.
      if (!content || content.length === 0) continue;
      const text = content[0]?.text;
      let structuredJSON;
      try {
        structuredJSON = JSON.parse(text);
      } catch {
        structuredJSON = undefined;
      }
      return { text, structuredJSON };
    }
  }
  return undefined;
}

/**
 * Drive one Code Mode tool call deterministically: post a directive prompt
 * forcing the stub to emit an `execute` call running `code`, then wait for
 * it to complete.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID The session to drive (its model must be the
 *   stub provider's for the directive to be recognized).
 * @param {string} code Restricted-JS snippet, e.g.
 *   `return await tools.rp_status({});`.
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ text: string, structuredJSON: * }>} The tool result
 *   (see `findToolResult`).
 */
export async function driveToolCall(server, sessionID, code, { timeoutMs } = {}) {
  const nonce = `n${Date.now()}${Math.random().toString(36).slice(2)}`;
  await prompt(server, sessionID, directivePrompt(code, nonce));
  return pollMessages(server, sessionID, (messages) => findToolResult(messages, nonce), {
    timeoutMs,
    label: `Code Mode tool call to complete: ${code}`,
  });
}

/**
 * Wait until a session is no longer reported as running.
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<void>}
 */
export async function waitForIdle(server, sessionID, { timeoutMs = 20_000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const active = await getActiveSessionIDs(server);
    if (!active.has(sessionID)) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for session ${sessionID} to go idle.`);
    }
    await delay(intervalMs);
  }
}

/**
 * Poll a session's messages until it has at least one assistant message
 * with the given `finish` reason (e.g. `"stop"` for a completed plain turn,
 * `"error"` for a structured-error turn).
 *
 * @param {{baseURL:string,password:string}} server
 * @param {string} sessionID
 * @param {string} finish
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<object>} The matching message.
 */
export async function waitForAssistantFinish(server, sessionID, finish, { timeoutMs = 20_000 } = {}) {
  return pollMessages(
    server,
    sessionID,
    (messages) => messages.find((m) => m.type === "assistant" && m.finish === finish),
    { timeoutMs, label: `an assistant message with finish="${finish}"` },
  );
}
