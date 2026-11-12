/**
 * RP's opencode v2 plugin.
 *
 * Zero-dependency ESM entry supplying only what opencode lacks natively (see
 * docs/opencode-plugin.md): the packaged skill, its re-supply after context
 * compaction, and RP's agent profiles registered as subagents. Each concern
 * lives in its own module beside this file; `setup` wires them to opencode's
 * plugin context, and every pure helper is re-exported here so it can be
 * unit-tested offline, without a running opencode daemon.
 */

import { materializeAgents, resolveAgentsTargetDir } from "./agents.mjs";
import { resolveServer } from "./client.mjs";
import { onContext } from "./resupply.mjs";
import { SKILLS_SOURCE_DIR, readSkillDirectory } from "./skills.mjs";
import { PLUGIN_ID } from "./version.mjs";

/**
 * The RP opencode plugin's `setup` function, run once per directory scope.
 *
 * Materializes the agent profiles, registers the packaged skills, and
 * registers this location's `context` hook, which re-supplies the skill to a
 * session continuing from a checkpoint.
 *
 * @param {object} ctx The plugin context opencode supplies: `ctx.skill`,
 *   `ctx.session`.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readServiceRecord?: (env: object) => object | null,
 *   requestFn?: (url: URL, init: object) => Promise<{status: number, body: *}>,
 *   agentsSourceDir?: string,
 *   agentsTargetDir?: string,
 * }} [deps] Injectable dependencies, absent in opencode's real invocation
 *   (`setup(ctx)`) and supplied only by offline tests: `env` and
 *   `readServiceRecord` reach `resolveServer`; `requestFn` reaches the HTTP
 *   client; `agentsSourceDir`/`agentsTargetDir` reach `materializeAgents`.
 * @returns {Promise<() => Promise<void>>} Resolves once this location's
 *   skills and hook are registered, to the location's cleanup, which
 *   disposes the hook.
 */
async function setup(ctx, deps = {}) {
  const { env = process.env, readServiceRecord, requestFn, agentsSourceDir, agentsTargetDir } = deps;

  materializeAgents(agentsSourceDir, agentsTargetDir ?? resolveAgentsTargetDir(env));

  const packagedSkills = readSkillDirectory(SKILLS_SOURCE_DIR);
  await ctx.skill.transform((skills) => {
    for (const skill of packagedSkills) {
      skills.add(skill);
    }
    return skills;
  });

  const registration = await Promise.resolve()
    .then(() =>
      ctx.session.hook("context", (event) =>
        onContext(event, {
          server: resolveServer({ env, readServiceRecord }),
          skills: packagedSkills,
          requestFn,
        }),
      ),
    )
    .catch(() => undefined);

  let cleaned = false;
  return async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await Promise.resolve(registration?.dispose?.()).catch(() => {});
  };
}

export default { id: PLUGIN_ID, setup };

export { setup };

export {
  buildBasicAuthHeader,
  fetchRequest,
  readServiceRecordFile,
  requestServer,
  resolveServer,
} from "./client.mjs";

export {
  materializeAgents,
  renderSubagentProfile,
  resolveAgentsTargetDir,
} from "./agents.mjs";

export {
  readPackageVersion,
} from "./version.mjs";

export {
  parseSkillFrontmatter,
  readSkillDirectory,
} from "./skills.mjs";

export {
  activeSkillActivations,
  getSkillActivations,
  holdSkillActivations,
  listSessionMessages,
  onContext,
  packagedSkillActivations,
  readSealedSkillActivations,
  renderSkillResupply,
  storedSkillActivations,
} from "./resupply.mjs";
