/**
 * Offline OpenAI-compatible SSE stub provider.
 *
 * Serves `GET /v1/models` and `POST /v1/chat/completions` (streaming SSE) so
 * every core-flow turn runs at zero cost, fully offline.
 *
 * To drive a directly invocable tool (opencode's `skill`, `subagent`, or
 * `shell`) deterministically from a scripted "model", this stub recognizes a
 * directive embedded in the driving prompt's text —
 * `__RP_NATIVE_TOOL__:<base64 {name, args, nonce}>:__END__` — and, on a match
 * it has not already answered, emits a tool_call for exactly that tool.
 *
 * Any other turn (no directive, or a directive already answered once) gets a
 * fixed plain-text reply, ending the turn normally.
 */

import http from "node:http";

/**
 * Directive embedded in a driving prompt's text —
 * `__RP_NATIVE_TOOL__:<base64 {name, args, nonce}>:__END__` — that forces a
 * tool_call for a directly invocable tool, named in the request's own `tools`
 * array.
 *
 * The `{name, args, nonce}` triple is carried as one base64 blob rather than
 * as delimited fields or raw JSON. A tool name and a URL both routinely
 * contain colons, which broke a naive `name:args` split; and an argument may
 * itself carry a directive meant to fire later rather than now (a subagent's
 * prompt, say), whose own `:__END__` would otherwise terminate this match
 * early. base64's alphabet contains no colon or underscore, so no
 * argument can close the directive it travels in.
 */
const NATIVE_TOOL_RE = /__RP_NATIVE_TOOL__:([A-Za-z0-9+/=]*):__END__/;

/**
 * Decode a native directive's base64 payload.
 *
 * @param {string} payload The directive's captured base64 blob.
 * @returns {{ name: string, args: object, nonce: string | undefined }}
 */
function decodeNativeDirective(payload) {
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}

/** Text returned for any turn that carries no (or an already-answered) directive. */
export const PLAIN_REPLY_TEXT = "RP_STUB_TURN_COMPLETE";

/** Text returned for a compaction request: the smallest summary opencode accepts. */
export const COMPACTION_REPLY_TEXT = "## Objective\n- RP_STUB_CHECKPOINT\n\n## Next Move\n1. Continue.";

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
 * @returns {{ server: import("node:http").Server, offeredToolNames: () => Set<string>, close: () => Promise<void> }}
 *   `offeredToolNames` reports every tool name offered to the stub so far;
 *   `close` stops listening and resolves once fully closed.
 */
export function startStubProvider({ port }) {
  const firedDirectives = new Set();
  const offeredToolNames = new Set();
  const chatRequests = [];

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
      chatRequests.push({ messages: parsed.messages ?? [], tools: parsed.tools ?? [] });

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
      for (const name of offered) {
        offeredToolNames.add(name);
      }

      const nativeCandidate = text.match(NATIVE_TOOL_RE);
      const nativeMatch =
        nativeCandidate && offered.has(decodeNativeDirective(nativeCandidate[1]).name)
          ? nativeCandidate
          : null;
      const nativeAlreadyAnswered = nativeMatch && firedDirectives.has(nativeMatch[0]);

      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });

      if (nativeMatch && !nativeAlreadyAnswered) {
        firedDirectives.add(nativeMatch[0]);
        const { name: toolName, args, nonce } = decodeNativeDirective(nativeMatch[1]);
        res.write(
          sseChunk(parsed.model ?? "stub-model", {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                index: 0,
                // The call id becomes the tool part's `id`, which is how a
                // check correlates a result with the call it drove — two
                // calls to the same tool with identical arguments are
                // otherwise indistinguishable in the transcript.
                id: nonce ? `call_${nonce}` : `call_${firedDirectives.size}`,
                type: "function",
                function: { name: toolName, arguments: JSON.stringify(args) },
              },
            ],
          }),
        );
        res.write(sseChunk(parsed.model ?? "stub-model", {}, "tool_calls"));
      } else {
        // A compaction request ends with opencode's summary prompt, which
        // carries its own template; the reply must contain one of the
        // template's headings or the checkpoint is rejected.
        const reply = text.includes("## Objective") ? COMPACTION_REPLY_TEXT : PLAIN_REPLY_TEXT;
        res.write(sseChunk(parsed.model ?? "stub-model", { role: "assistant", content: "" }));
        res.write(sseChunk(parsed.model ?? "stub-model", { content: reply }));
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
        // Every tool name this stub has been offered across all requests —
        // the model's own view of the catalogue, and so the evidence of
        // which tools are callable by name rather than only through Code
        // Mode's `execute` wrapper.
        offeredToolNames: () => new Set(offeredToolNames),
        // Every chat request this stub has received, in arrival order, with
        // the messages and tools opencode sent — the evidence of what the
        // model was actually given on a turn.
        chatRequests: () => [...chatRequests],
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/**
 * Build a driving prompt that forces a tool_call for a directly invocable
 * tool.
 *
 * A per-call `nonce` keeps every directive's exact text unique, so the stub's
 * already-answered dedup never mistakes two calls carrying identical
 * arguments for a repeat of the same one, and becomes the emitted call's id
 * so the result can be correlated back (see `NATIVE_TOOL_RE`).
 *
 * @param {string} toolName e.g. `"skill"` or `"subagent"`.
 * @param {object} args The tool's arguments (JSON-serialized verbatim).
 * @param {string} [nonce] A value unique to this call.
 * @returns {string} The prompt text to post as the driving session's input.
 */
export function nativeToolPrompt(toolName, args, nonce) {
  const payload = Buffer.from(
    JSON.stringify({ name: toolName, args, nonce }),
    "utf8",
  ).toString("base64");
  return `__RP_NATIVE_TOOL__:${payload}:__END__`;
}
