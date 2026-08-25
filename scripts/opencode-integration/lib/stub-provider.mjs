/**
 * Offline OpenAI-compatible SSE stub provider.
 *
 * Serves `GET /v1/models` and `POST /v1/chat/completions` (streaming SSE) so
 * every core-flow turn runs at zero cost, fully offline.
 *
 * opencode exposes plugin-registered (`jsonSchema`-based) tools to a model
 * not as individually callable functions, but wrapped behind a single
 * "Code Mode" `execute` tool: the model writes a snippet of restricted
 * JavaScript that calls `tools.<name>(input)`, and `execute`'s arguments
 * carry that snippet as a `code` string — verified live against the pinned
 * build. To drive `rp_spawn`/`rp_send`/`rp_terminate`/`rp_loop_*`/`rp_status`
 * deterministically from a scripted "model", this stub recognizes a directive
 * embedded in the driving prompt's text — `__RP_CODE__:<code>:__END__` — and, on a match it
 * has not already answered, emits a tool_call for `execute` running exactly
 * that code. Any other turn (no directive, or a directive already answered
 * once) gets a fixed plain-text reply, ending the turn normally.
 */

import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const DIRECTIVE_RE = /__RP_CODE__:([\s\S]*?):__END__/;

/**
 * Directive embedded in a driving prompt's text — `__RP_SLOW__:<ms>:__END__`
 * — that makes the stub delay `<ms>` milliseconds before replying, so a
 * check can rely on the session being genuinely "running" for a known
 * window (interrupt, busy-skip).
 */
const SLOW_RE = /__RP_SLOW__:(\d+):__END__/;

/**
 * Directive embedded in a driving prompt's text — `__RP_STALL__:<ms>:__END__`
 * — that makes the stub emit a tool_call header whose arguments never finish
 * streaming, then hold the connection open for `<ms>` (or until the client
 * aborts): a deterministic reproduction of a provider stream dying
 * mid-tool-call, leaving the session's newest assistant message with a tool
 * part stuck in `streaming` state. Answered once per distinct directive
 * text, like `DIRECTIVE_RE`.
 */
const STALL_RE = /__RP_STALL__:(\d+):__END__/;

/**
 * Directive embedded in a driving prompt's text —
 * `__RP_NATIVE_TOOL__:<json {name, args}>:__END__` — that forces a native
 * (non-Code-Mode) tool_call for one of opencode's own built-in tools (e.g.
 * `webfetch`), which are listed directly in the request's `tools` array and
 * called by name, unlike plugin-registered tools (see `DIRECTIVE_RE`). The
 * whole `{name, args}` pair is carried as one JSON blob rather than
 * colon-delimited fields: a tool name and a URL both routinely contain
 * colons, which broke a naive `name:args` split.
 */
const NATIVE_TOOL_RE = /__RP_NATIVE_TOOL__:([\s\S]*?):__END__/;

/** API key the sandbox uses to trigger a deterministic HTTP 401. */
export const INVALID_AUTH_KEY = "rp-invalid-auth-key";

/** Text returned for any turn that carries no (or an already-answered) directive. */
export const PLAIN_REPLY_TEXT = "RP_STUB_TURN_COMPLETE";

/**
 * Build one OpenAI-compatible streaming chunk.
 *
 * @param {string} model
 * @param {object} delta
 * @param {string | null} [finishReason]
 * @returns {string} One `data: ...\n\n` SSE frame.
 */
function sseChunk(model, delta, finishReason) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-stub",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason ?? null }],
  })}\n\n`;
}

/**
 * Extract the plain-text content of the conversation's last user-role
 * message (the driving prompt), tolerating both the plain-string and
 * array-of-parts content shapes.
 *
 * @param {Array<{role: string, content: *}>} messages
 * @returns {string}
 */
function lastUserText(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (typeof lastUser?.content === "string") {
    return lastUser.content;
  }
  if (Array.isArray(lastUser?.content)) {
    return lastUser.content.map((part) => part.text ?? "").join("\n");
  }
  return "";
}

/**
 * Start the stub provider.
 *
 * @param {{ port: number }} options
 * @returns {{ server: import("node:http").Server, close: () => Promise<void> }}
 *   `close` stops listening and resolves once fully closed.
 */
export function startStubProvider({ port }) {
  const firedDirectives = new Set();

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      if (req.url.includes("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            object: "list",
            data: [{ id: "stub-model", object: "model", owned_by: "rp-integration-stub" }],
          }),
        );
        return;
      }

      if (!req.url.includes("/chat/completions")) {
        res.writeHead(404);
        res.end("not found");
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        parsed = {};
      }

      const text = lastUserText(parsed.messages ?? []);

      if (req.headers.authorization === `Bearer ${INVALID_AUTH_KEY}`) {
        // A slow directive delays the failure, turning the instant 401 into
        // a slow-failing turn — the shape that keeps a session active while
        // its probes fail.
        const slowFailMatch = text.match(SLOW_RE);
        if (slowFailMatch) {
          await delay(Number(slowFailMatch[1]));
        }
        res.writeHead(401, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message: "Invalid API key",
              type: "invalid_request_error",
              code: "invalid_api_key",
            },
          }),
        );
        return;
      }

      // A driven turn reaches this provider more than once: opencode also
      // generates the session title from the same user text, on a request
      // that offers no tools and discards whatever comes back. The two
      // arrive in either order depending on the build, so a directive is
      // answered only on a request that actually offers the tool it needs —
      // otherwise the title request would consume the one-shot dedup below
      // and leave the real turn with a plain reply.
      const offered = new Set(
        (parsed.tools ?? []).map((tool) => tool.function?.name ?? tool.name),
      );

      const match = offered.has("execute") ? text.match(DIRECTIVE_RE) : null;
      const alreadyAnswered = match && firedDirectives.has(match[0]);
      const nativeCandidate = text.match(NATIVE_TOOL_RE);
      const nativeMatch =
        nativeCandidate && offered.has(JSON.parse(nativeCandidate[1]).name) ? nativeCandidate : null;
      const nativeAlreadyAnswered = nativeMatch && firedDirectives.has(nativeMatch[0]);

      // Held open only for the agent turn, for the same reason: stalling the
      // title request instead would leave the session idle over the window a
      // caller asked to keep it busy.
      const slowMatch = offered.size > 0 ? text.match(SLOW_RE) : null;
      if (slowMatch) {
        await delay(Number(slowMatch[1]));
      }

      // Matched only on the agent turn (see `offered` above); the title
      // request must never be the one that hangs.
      const stallMatch = offered.size > 0 ? text.match(STALL_RE) : null;
      if (stallMatch && !firedDirectives.has(stallMatch[0])) {
        firedDirectives.add(stallMatch[0]);
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        res.write(
          sseChunk(parsed.model ?? "stub-model", {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                index: 0,
                id: `call_stall_${firedDirectives.size}`,
                type: "function",
                function: { name: "execute", arguments: "" },
              },
            ],
          }),
        );
        // Dead stream: no more frames. The held-open window is bounded so a
        // leaked stall can never wedge the suite; the client aborting first
        // (the expected interrupt) just ends the response early. The abort
        // signal must be the *response's* close (connection terminated) —
        // the request's own close fires as soon as its body completes,
        // which would end the stall immediately.
        await Promise.race([delay(Number(stallMatch[1])), new Promise((r) => res.on("close", r))]);
        res.end();
        return;
      }

      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });

      if (nativeMatch && !nativeAlreadyAnswered) {
        firedDirectives.add(nativeMatch[0]);
        const { name: toolName, args } = JSON.parse(nativeMatch[1]);
        res.write(
          sseChunk(parsed.model ?? "stub-model", {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                index: 0,
                id: `call_${firedDirectives.size}`,
                type: "function",
                function: { name: toolName, arguments: JSON.stringify(args) },
              },
            ],
          }),
        );
        res.write(sseChunk(parsed.model ?? "stub-model", {}, "tool_calls"));
      } else if (match && !alreadyAnswered) {
        firedDirectives.add(match[0]);
        const code = match[1];
        res.write(
          sseChunk(parsed.model ?? "stub-model", {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                index: 0,
                id: `call_${firedDirectives.size}`,
                type: "function",
                function: { name: "execute", arguments: JSON.stringify({ code }) },
              },
            ],
          }),
        );
        res.write(sseChunk(parsed.model ?? "stub-model", {}, "tool_calls"));
      } else {
        res.write(sseChunk(parsed.model ?? "stub-model", { role: "assistant", content: "" }));
        res.write(sseChunk(parsed.model ?? "stub-model", { content: PLAIN_REPLY_TEXT }));
        res.write(sseChunk(parsed.model ?? "stub-model", {}, "stop"));
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        server,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/**
 * Build a directive-embedding driving prompt: forces the stub to emit a
 * Code Mode `execute` tool_call running `code` on the turn that receives
 * this text.
 *
 * A per-call `nonce` (the suite always supplies a fresh one, e.g. a random
 * id) keeps every directive's exact text unique, so the stub's
 * already-answered dedup never mistakes two distinct calls for a repeat of
 * the same one.
 *
 * @param {string} code Restricted-JS snippet, e.g. `return await tools.rp_status({});`.
 * @param {string} nonce A value unique to this call.
 * @returns {string} The prompt text to post as the driving session's input.
 */
export function directivePrompt(code, nonce) {
  return `__RP_CODE__:${code} // ${nonce}:__END__`;
}

/**
 * Build a driving prompt that forces a native (non-Code-Mode) tool_call for
 * one of opencode's own built-in tools.
 *
 * @param {string} toolName e.g. `"webfetch"`.
 * @param {object} args The tool's arguments (JSON-serialized verbatim).
 * @returns {string} The prompt text to post as the driving session's input.
 */
export function nativeToolPrompt(toolName, args) {
  return `__RP_NATIVE_TOOL__:${JSON.stringify({ name: toolName, args })}:__END__`;
}

/**
 * Build a driving prompt that makes the stub delay `delayMs` before
 * replying with a plain-text turn, so the session is genuinely observable
 * as "running" for that window.
 *
 * @param {number} delayMs
 * @param {string} nonce A value unique to this call (delay directives are
 *   not deduplicated, but a nonce keeps each call's prompt text distinct in
 *   the session's message history for easier debugging).
 * @returns {string} The prompt text to post as the driving session's input.
 */
export function slowPrompt(delayMs, nonce) {
  return `__RP_SLOW__:${delayMs}:__END__ // ${nonce}`;
}

/**
 * Build a driving prompt that makes the stub die mid-tool-call: it emits a
 * tool_call header whose arguments never arrive, then goes silent for up to
 * `holdMs`, leaving the session hung on a provably dead stream (a tool part
 * stuck in `streaming` state) until something interrupts it.
 *
 * @param {number} holdMs Upper bound on the held-open window; the expected
 *   interrupt ends it earlier.
 * @param {string} nonce A value unique to this call, keeping the one-shot
 *   directive dedup from mistaking two distinct calls for a repeat.
 * @returns {string} The prompt text to post as the driving session's input.
 */
export function stallPrompt(holdMs, nonce) {
  return `__RP_STALL__:${holdMs}:__END__ // ${nonce}`;
}
