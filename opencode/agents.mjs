/**
 * RP's agent profiles in opencode: the namespace they register under and their
 * materialization into opencode's global agents directory.
 */

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path to RP's own agent profile sources, resolved relative to this
 * module's location so it resolves correctly regardless of the process's
 * working directory.
 *
 * Serves as `materializeAgents`'s default `sourceDir`; tests inject their own
 * directory instead of relying on this constant.
 */
const DEFAULT_AGENTS_SOURCE_DIR = fileURLToPath(
  new URL("../agents", import.meta.url),
);

/** Directory name and agent-id prefix RP owns under opencode's global agents directory. */
const RP_AGENT_NAMESPACE = "radical-pipelines";

/**
 * Resolve a plain RP profile name to its opencode agent ID.
 *
 * @param {string} profile Plain RP profile name.
 * @returns {string} The namespaced opencode agent ID.
 */
function rpAgentID(profile) {
  return `${RP_AGENT_NAMESPACE}/${profile}`;
}

/**
 * Render RP's namespaced opencode agent ID as its plain profile name.
 *
 * @param {string} agentID An opencode agent ID.
 * @returns {string} The plain RP profile name, or the unchanged ID for an
 *   agent outside RP's namespace.
 */
function displayAgentName(agentID) {
  const prefix = `${RP_AGENT_NAMESPACE}/`;
  return agentID.startsWith(prefix) ? agentID.slice(prefix.length) : agentID;
}

/**
 * Resolve RP's directory under opencode's global agents folder.
 *
 * Mirrors `resolveLoopRegistryPath`/`resolveServiceRecordDir`: opencode
 * itself resolves its global config directory from `XDG_CONFIG_HOME` when
 * set, so the materialization target must honor the same variable — writing
 * to the unqualified `~/.config` under an XDG-isolated environment would
 * materialize agents into a directory opencode never scans.
 *
 * @param {Record<string, string | undefined>} [env] Environment to read
 *   `XDG_CONFIG_HOME` from. Defaults to the real process environment.
 * @returns {string} `$XDG_CONFIG_HOME/opencode/agents/radical-pipelines` when
 *   `XDG_CONFIG_HOME` is set, else
 *   `~/.config/opencode/agents/radical-pipelines`.
 */
function resolveAgentsTargetDir(env = process.env) {
  const configHome = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "opencode", "agents", RP_AGENT_NAMESPACE);
}

/**
 * Materialize RP's agent profiles into its opencode agents directory.
 *
 * Copies every `*.md` profile from `sourceDir` into `targetDir` byte for
 * byte — including the extra `name:` frontmatter key the profiles carry,
 * which opencode ignores since the path below `agents/` governs the agent
 * id. `targetDir` is replaced whole on every call.
 *
 * @param {string} [sourceDir] Absolute path to the directory of source agent
 *   profiles. Defaults to `../agents` resolved relative to this module (the
 *   repository's `agents/` directory at runtime).
 * @param {string} [targetDir] Absolute path to RP's target agents directory.
 *   Defaults to its folder under opencode's global agents directory (see
 *   `resolveAgentsTargetDir`).
 * @returns {{ written: string[] }} `written` lists the source filenames
 *   copied into `targetDir` this run.
 */
function materializeAgents(
  sourceDir = DEFAULT_AGENTS_SOURCE_DIR,
  targetDir = resolveAgentsTargetDir(),
) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const written = [];

  const profiles = readdirSync(sourceDir).filter((name) =>
    name.endsWith(".md"),
  );
  for (const name of profiles) {
    copyFileSync(join(sourceDir, name), join(targetDir, name));
    written.push(name);
  }

  return { written };
}

export {
  displayAgentName,
  materializeAgents,
  resolveAgentsTargetDir,
  rpAgentID,
};
