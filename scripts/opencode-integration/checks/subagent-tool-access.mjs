/**
 * The caller gate on RP's tools, exercised against a real subagent: a child
 * session opencode creates when an agent delegates inside its own turn is
 * refused, while a root session's identical call is served.
 *
 * The subagent is real, not simulated. opencode's built-in `subagent` tool
 * creates the child with `parentID` set to the calling session, and the
 * child's turn is driven by the directive nested inside that call's `prompt`
 * argument — so the `rp_loop_list` call the plugin sees comes from the
 * child's own session ID, which is the only thing the gate reads.
 *
 * Both sides are asserted together: a check that only watched the refusal
 * would pass just as well with the tools broken for every caller.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import { createSession, driveToolCall, getSession, pollToolResult } from "../lib/api-client.mjs";
import { nativeToolPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * The child runs as opencode's built-in `general` subagent: it declares
 * `mode: "subagent"` (which the `subagent` tool requires) and no model of its
 * own, so it inherits the parent's — the stub provider, without which the
 * nested directive would never be interpreted.
 */
const SUBAGENT = "general";

/**
 * Run every check in this group.
 *
 * @param {{ server: object, projectDir: string, results: Array }} ctx
 * @returns {Promise<void>}
 */
export async function run(ctx) {
  const { server, projectDir, results } = ctx;

  await runCheck(
    results,
    "a real subagent's direct rp_loop_list call is refused, while a root session's is served",
    async () => {
      const root = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });

      // A registry entry of this check's own making, so the served side is
      // recognizably the real registry rather than an empty list that an
      // equally broken tool could return. The interval is far longer than
      // the check, so no tick fires while it runs.
      const marker = `suite-subagent-access-${Date.now()}`;
      const started = await driveToolCall(server, root.id, "rp_loop_start", {
        interval: 600_000,
        prompt: marker,
        target_session: root.id,
      });
      const loopID = started.structuredJSON?.id;
      assert.ok(loopID, `expected rp_loop_start to return { id }, got: ${started.text}`);

      try {
        // Nested directives: the outer drives the root's `subagent` call, and
        // the inner becomes the child's own prompt, so the child is what
        // emits `rp_loop_list`.
        const childNonce = `subagent-access-${Date.now()}`;
        const delegated = await driveToolCall(
          server,
          root.id,
          "subagent",
          {
            agent: SUBAGENT,
            description: "RP tool access probe",
            prompt: nativeToolPrompt("rp_loop_list", {}, childNonce),
          },
          { timeoutMs: 60_000 },
        );
        assert.equal(delegated.error, undefined, `expected the subagent call to succeed, got: ${delegated.error?.message}`);

        // The `subagent` tool reports the child it created, which is how the
        // child's transcript is located: its id is not knowable in advance.
        const childID = /sessionID="([^"]+)"/.exec(delegated.text ?? "")?.[1];
        assert.ok(childID, `expected the subagent result to name its child session, got: ${delegated.text}`);

        // The gate reads parentage, so the caller is only a subagent if
        // opencode really recorded it as the root's child.
        const child = await getSession(server, childID);
        assert.equal(child.parentID, root.id, `expected ${childID} to be a child of ${root.id}`);

        // Settled in the child's own transcript — the foreground `subagent`
        // call above already returned, so the child's turn is over.
        const refused = await pollToolResult(server, childID, childNonce, { timeoutMs: 20_000 });
        assert.equal(
          refused.structuredJSON?.error,
          "SubagentNotPermitted",
          `expected the subagent's rp_loop_list to be refused, got: ${refused.text ?? refused.error?.message}`,
        );

        const served = await driveToolCall(server, root.id, "rp_loop_list");
        assert.ok(
          Array.isArray(served.structuredJSON) && served.structuredJSON.some((entry) => entry.id === loopID),
          `expected the root session's rp_loop_list to return the real registry including ${loopID}, got: ${served.text}`,
        );
      } finally {
        await driveToolCall(server, root.id, "rp_loop_cancel", { id: loopID });
      }
    },
  );
}
