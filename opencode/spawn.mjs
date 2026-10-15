/**
 * The `rp_spawn` tool: validating a spawn, seating the session, and handing it
 * the opencode session protocol.
 */

import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";

import { rpAgentID } from "./agents.mjs";
import { SPAWN_METADATA_KEY, parseModelString, recordSpawn } from "./ledger.mjs";
import { ANY_OUTPUT_SCHEMA, toToolResult } from "./tools.mjs";

/**
 * Check whether an agent name is one opencode currently recognizes.
 *
 * `rp_spawn` calls this against `ctx.agent.list()` before creating a session,
 * since `session.create` itself does not validate the agent name — an unknown
 * agent would otherwise create a dead session that can never execute a turn.
 *
 * @param {Array<string | { name: string }>} agentList The list opencode
 *   returns from `ctx.agent.list()` — entries may be plain agent-id strings
 *   or objects carrying a `name` field, so both shapes are accepted.
 * @param {string} agentID The agent ID to check for.
 * @returns {boolean} `true` when `agentID` appears in `agentList`.
 */
function agentExists(agentList, agentID) {
  return agentList.some((entry) =>
    typeof entry === "string" ? entry === agentID : entry?.name === agentID,
  );
}

/**
 * Append the opencode session protocol — messaging and turns — to a spawned
 * agent's initial prompt.
 *
 * The turn rule exists because an opencode session outlives its turn: an
 * idle session resumes only on an inbox item. Verified live against the
 * tested runtime: a `shell` call with `background: true` ends the turn and its
 * completion later arrives as an inbox item that starts a new execution — so
 * awaiting it is a legitimate reason to end the turn — but background
 * commands carry no timeout by default, so a hung one never completes and
 * the session is parked until someone nudges it. A detached process has no
 * wake source at all. Foreground waits keep the agent observing, and a
 * foreground command's timeout hands it the hang signal a detached process
 * never does.
 *
 * @param {string} prompt The caller-authored initial prompt.
 * @param {string} spawnerID The calling session's authoritative ID.
 * @returns {string} The original prompt followed by the runtime protocol.
 */
function appendSpawnProtocol(prompt, spawnerID) {
  return `${prompt}\n\n## RP messaging (opencode)\n\n**Spawner identifier:** ${spawnerID}\n\nOnly \`rp_send\` routes a message to another session. Send every message required by your profile with \`rp_send\`: your prompt's **Requester** is the agent ID to address what your profile sends to its requester; the orchestrator is the **Spawner identifier** above. Your own agent ID is this session's ID.\n\n## RP turns (opencode)\n\nEnding your turn is a stop: only a message resumes this session — a reply you await, or the completion notice of a background command you gave a \`timeout\`. Anything else you are waiting on holds your turn: wait with foreground commands that have a timeout, compare progress between checks, and treat unchanged progress as a stall to act on.`;
}

/**
 * Reject a value that is not a pipeline slug: one path segment, a valid git
 * ref, without `_`.
 *
 * @param {*} slug The `pipeline_slug` argument to check.
 * @param {typeof execFileSync} [exec] Runs `git check-ref-format`; defaults to
 *   `child_process.execFileSync`.
 * @returns {void}
 */
function assertPipelineSlug(slug, exec = execFileSync) {
  const validRef = () => {
    try {
      exec("git", ["check-ref-format", "--branch", slug], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  if (typeof slug !== "string" || slug.length === 0 || slug.includes("/") || slug.includes("_") || !validRef()) {
    throw new Error(`Invalid pipeline slug ${JSON.stringify(slug)}: one path segment, a valid git ref, without "_"`);
  }
}

/**
 * Resolve the root of the repository containing a directory — for a git
 * worktree, the main checkout's root, not the worktree's.
 *
 * @param {string} directory Absolute directory to resolve from (a spawn's
 *   seat).
 * @param {(command: string, args: string[], options: object) => string} [exec]
 *   Injectable process-execution function; defaults to
 *   `child_process.execFileSync`.
 * @returns {string | null} The repository root, or `null` when it cannot be
 *   resolved (not a git checkout, git missing, or a common dir not named
 *   `.git`).
 */
function resolveRepoRoot(directory, exec = execFileSync) {
  try {
    const commonDir = exec(
      "git",
      ["-C", directory, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8" },
    ).trim();
    return basename(commonDir) === ".git" ? dirname(commonDir) : null;
  } catch {
    return null;
  }
}

/**
 * Build the `rp_spawn` tool descriptor.
 *
 * @param {object} ctx The plugin's opencode context, as passed to `setup`.
 * @param {{ resolveRepoRootFn?: (directory: string) => string | null, now?: () => number }} [deps]
 *   `resolveRepoRootFn` defaults to `resolveRepoRoot`; injected in tests so
 *   no real `git` runs. `now` stamps the ledger entry's `spawnedAt` and
 *   defaults to `Date.now`.
 * @returns {{name: string, description: string, input: object, execute: Function}}
 *   The tool descriptor for `ctx.tool.transform(tools => tools.add(...))`.
 */
function buildSpawnTool(ctx, { resolveRepoRootFn = resolveRepoRoot, rpProfiles = new Set(), now = Date.now } = {}) {
  return {
    name: "rp_spawn",
    description:
      "Spawn a new named RP agent instance as an opencode session seated in a directory.",
    output: ANY_OUTPUT_SCHEMA,
    input: {
      type: "object",
      properties: {
        name: { type: "string", description: "Pipeline-unique instance name." },
        agent: { type: "string", description: "RP agent profile name." },
        model: { type: "string", description: "provider/model[#variant] convention string." },
        directory: { type: "string", description: "Absolute directory the session is seated in." },
        prompt: { type: "string", description: "Initial prompt posted to the spawned session." },
        pipeline_slug: { type: "string", description: "Pipeline slug." },
      },
      required: ["name", "agent", "model", "directory", "prompt", "pipeline_slug"],
    },
    async execute({ name, agent, model, directory, prompt, pipeline_slug }, toolCtx) {
      assertPipelineSlug(pipeline_slug);
      if (!rpProfiles.has(agent)) {
        throw new Error(`Unknown RP agent "${agent}"`);
      }
      const agentID = rpAgentID(agent);
      const agentList = await ctx.agent.list();
      if (!agentExists(agentList.data, agentID)) {
        throw new Error(`Unknown agent "${agentID}"`);
      }
      const identity = { name, pipelineSlug: pipeline_slug, spawner: toolCtx.sessionID };
      const session = await ctx.session.create({
        agent: agentID,
        model: parseModelString(model),
        location: { directory },
        metadata: { [SPAWN_METADATA_KEY]: identity },
      });
      recordSpawn(session.id, { ...identity, directory, repoRoot: resolveRepoRootFn(directory), spawnedAt: now() });
      await ctx.session.prompt({
        sessionID: session.id,
        text: appendSpawnProtocol(prompt, toolCtx.sessionID),
        delivery: "queue",
      });
      return toToolResult(session.id);
    },
  };
}

export {
  agentExists,
  appendSpawnProtocol,
  buildSpawnTool,
  resolveRepoRoot,
};
