/**
 * Plumbing shared by every RP tool: the result shape opencode requires, the
 * direct-invocation marker, and the guard that turns away a caller who may not
 * use a tool.
 */

import { AGENT_TOOL, resolveToolAccess } from "./ledger.mjs";

/**
 * Wrap a tool's computed result into the shape opencode's tool contract
 * requires: `{ output, content }`. Any other return shape from `execute` —
 * a bare string, a plain object missing both keys — leaves the calling agent
 * with a null result, regardless of the value actually computed.
 *
 * `output` is round-tripped through JSON so it is always a JSON value:
 * opencode validates a tool's output against its declared schema and rejects
 * the whole call with "Tool returned a non-JSON value for its output schema"
 * if it is not. Ledger rows carry `undefined` whenever opencode's session
 * record omits a field — no current tool, no model, no recorded update time —
 * and the round-trip drops those keys exactly as the rendering already did.
 *
 * @param {*} value The tool's computed result.
 * @returns {{ output: *, content: Array<{ type: "text", text: string }> }}
 *   `output` is the JSON form of the value calling code receives back;
 *   `content` is its human-readable rendering (the string itself when `value`
 *   already is one, else its JSON form).
 */
function toToolResult(value) {
  if (typeof value === "string") {
    return { output: value, content: [{ type: "text", text: value }] };
  }
  const text = JSON.stringify(value) ?? "null";
  return { output: JSON.parse(text), content: [{ type: "text", text }] };
}

/**
 * Wrap an RP tool so a caller that may not use it is turned away.
 *
 * opencode builds its tool registry once per process, before any session
 * calls into it, so which tools exist cannot vary by caller (see
 * `resolveToolAccess` for who the callers are). The decision therefore
 * belongs at the call, where the caller's own session ID is available and
 * unspoofable.
 *
 * The refusal is a returned result rather than a thrown error: the caller is
 * a model, and it needs to read what to do instead — otherwise it retries
 * the same call, or invents a way around it.
 *
 * @param {{name: string, execute: Function}} tool The tool descriptor to wrap.
 * @param {{ readSession: Function }} deps Forwarded to `resolveToolAccess`.
 * @returns {object} The same descriptor with a guarded `execute`.
 */
function guardTool(tool, { readSession }) {
  return {
    ...tool,
    async execute(input, toolCtx) {
      const access = await resolveToolAccess(toolCtx.sessionID, { readSession });
      if (access === "none") {
        return toToolResult({
          status: 403,
          error: "SubagentNotPermitted",
          message: `${tool.name} is not available to a subagent. Return your findings to the session that delegated this task, which is what it is waiting for.`,
        });
      }
      if (access === "send-only" && tool.name !== AGENT_TOOL) {
        return toToolResult({
          status: 403,
          error: "AgentNotPermitted",
          message: `${tool.name} is not available to a spawned agent. Use ${AGENT_TOOL} to reach your requester or the orchestrator.`,
        });
      }
      return tool.execute(input, toolCtx);
    },
  };
}

/**
 * The output schema every RP tool declares.
 *
 * opencode only carries a tool's `output` back to its caller when the tool
 * declares an output schema, so a tool without one resolves to `null` however
 * much it computed. RP's tools return whatever shape their operation produced
 * (a bare session ID, a status payload, a loop registry listing), so the
 * declared schema is the permissive one that accepts any JSON value rather
 * than a per-tool shape.
 */
const ANY_OUTPUT_SCHEMA = {};

/**
 * Mark a tool descriptor as directly invocable.
 *
 * opencode splits a registered tool by its `options.codemode`: only
 * `codemode: false` reaches the model as a tool of its own, while every other
 * tool is reachable solely inside the `execute` Code Mode wrapper. RP's tools
 * coordinate a run and must be callable in their own right, so each one
 * declares the direct form — as opencode's own built-in tools do.
 *
 * @param {object} tool The tool descriptor to register.
 * @returns {object} The same descriptor, marked for direct invocation.
 */
function asDirectTool(tool) {
  return { ...tool, options: { ...tool.options, codemode: false } };
}

export {
  ANY_OUTPUT_SCHEMA,
  asDirectTool,
  guardTool,
  toToolResult,
};
