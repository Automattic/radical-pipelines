/**
 * The caller gate on RP's tools, exercised against real callers of all three
 * tiers: a subagent gets nothing, an agent spawned with `rp_spawn` gets
 * `rp_send` alone, and anything else gets every tool.
 *
 * The two refused tiers are decided by different facts — parentage for the
 * subagent, presence in RP's in-memory ledger for the spawned agent — so
 * neither check stands in for the other. Both facts are ones only a running
 * daemon produces: opencode sets the child's `parentID`, and the ledger is
 * populated by a real `rp_spawn` registering a session opencode actually
 * created.
 *
 * Every check asserts the served side as well as the refused one: an
 * assertion that only watched a refusal would pass just as well with the
 * tools broken for every caller.
 */

import assert from "node:assert/strict";
import { runCheck } from "../lib/check-runner.mjs";
import {
  createSession,
  driveToolCall,
  getMessages,
  getSession,
  pollToolResult,
  pollUntil,
  waitForAssistantFinish,
} from "../lib/api-client.mjs";
import { nativeToolPrompt } from "../lib/stub-provider.mjs";

const STUB_MODEL = { providerID: "stub", id: "stub-model" };

/**
 * The subagent runs as opencode's built-in `general` agent: it declares
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

  // Neither spawned nor parented, so this session is the widest tier: the
  // served side both checks below compare their refusals against.
  const root = await createSession(server, { agent: "build", directory: projectDir, model: STUB_MODEL });

  await runCheck(
    results,
    "a real subagent's direct rp_loop_list call is refused, while a root session's is served",
    async () => {
      // A registry entry of this check's own making, so the served side is
      // recognizably the real registry rather than an empty list that an
      // equally broken tool could return. The interval is far longer than
      // the check, so no tick fires while it runs.
      const marker = `suite-tool-access-${Date.now()}`;
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

        // This tier is decided by parentage, so the caller is only a subagent
        // if opencode really recorded it as the root's child.
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

  await runCheck(
    results,
    "an agent spawned with rp_spawn is refused rp_status but served rp_send",
    async () => {
      const spawned = await driveToolCall(server, root.id, "rp_spawn", {
        name: "suite-tool-access-agent",
        agent: "researcher",
        model: "stub/stub-model",
        directory: projectDir,
        prompt: "report readiness",
        run: "suite-run",
      });
      const agentID = spawned.text;
      assert.ok(agentID?.startsWith("ses_"), `expected rp_spawn to return a session ID, got: ${agentID}`);

      // This tier is decided by the ledger, not by parentage: the session
      // `rp_spawn` created is parentless, so a lingering subagent
      // classification could not be what refuses it below.
      const agentSession = await getSession(server, agentID);
      assert.equal(agentSession.parentID, undefined, "an rp_spawn'd agent is a root-level session, not a child");

      // The launch prompt rp_spawn posted runs first; letting it finish keeps
      // the driven calls below from queueing behind a turn still in flight.
      await waitForAssistantFinish(server, agentID, "stop");

      const refused = await driveToolCall(server, agentID, "rp_status");
      assert.equal(
        refused.structuredJSON?.error,
        "AgentNotPermitted",
        `expected the spawned agent's rp_status to be refused, got: ${refused.text ?? refused.error?.message}`,
      );

      // The served side of this tier is one tool, so it has to actually
      // work: a send that merely failed differently would satisfy a check
      // that only looked for the absence of a refusal.
      const payload = `suite-tool-access-send-${Date.now()}`;
      const sent = await driveToolCall(server, agentID, "rp_send", { to: root.id, message: payload });
      assert.equal(
        sent.structuredJSON?.enqueued,
        true,
        `expected the spawned agent's rp_send to be served, got: ${sent.text ?? sent.error?.message}`,
      );

      const delivered = await pollUntil(
        async () => (await getMessages(server, root.id)).find((m) => m.type === "user" && m.text?.includes(payload)),
        { timeoutMs: 20_000, label: "the spawned agent's message to reach the root session" },
      );
      assert.ok(
        delivered.text.startsWith(`[from suite-tool-access-agent (${agentID})]`),
        `expected the delivered message to carry the spawned agent's attribution, got: ${delivered.text}`,
      );
    },
  );
}
