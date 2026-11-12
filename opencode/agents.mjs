/**
 * RP's agent profiles in opencode: their materialization into opencode's
 * global agents directory as subagents.
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSkillFrontmatter } from "./skills.mjs";

/**
 * Absolute path to RP's own agent profile sources, resolved relative to this
 * module's location so it resolves correctly regardless of the process's
 * working directory.
 */
const DEFAULT_AGENTS_SOURCE_DIR = fileURLToPath(
  new URL("../agents", import.meta.url),
);

/** Directory name and agent-id prefix RP owns under opencode's global agents directory. */
const RP_AGENT_NAMESPACE = "radical-pipelines";

/**
 * Resolve RP's directory under opencode's global agents folder.
 *
 * opencode resolves its global config directory from `XDG_CONFIG_HOME` when
 * set, so the target honors the same variable.
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
 * Render a source profile as an opencode subagent definition.
 *
 * opencode registers an agent file without `mode` as a primary agent, which
 * its `subagent` tool refuses to launch, so the frontmatter is rewritten to
 * the profile's `description` and `mode: subagent`. Every other field is
 * dropped: the agent id comes from the file's path, and the model is chosen
 * per call. The body is kept verbatim.
 *
 * @param {string} source The source profile's raw contents.
 * @returns {string} The opencode agent file's contents.
 */
function renderSubagentProfile(source) {
  const { frontmatter, content } = parseSkillFrontmatter(source);
  const lines = ["---"];
  if (frontmatter.description !== undefined) {
    lines.push(`description: ${JSON.stringify(frontmatter.description)}`);
  }
  lines.push("mode: subagent", "---", "", content, "");
  return lines.join("\n");
}

/**
 * Materialize RP's agent profiles into its opencode agents directory.
 *
 * Writes every `*.md` profile from `sourceDir` into `targetDir` as rendered
 * by `renderSubagentProfile`. `targetDir` is replaced whole on every call.
 *
 * @param {string} [sourceDir] Absolute path to the directory of source agent
 *   profiles. Defaults to the repository's `agents/` directory.
 * @param {string} [targetDir] Absolute path to RP's target agents directory.
 *   Defaults to its folder under opencode's global agents directory (see
 *   `resolveAgentsTargetDir`).
 * @returns {{ written: string[] }} The source filenames written this run.
 */
function materializeAgents(
  sourceDir = DEFAULT_AGENTS_SOURCE_DIR,
  targetDir = resolveAgentsTargetDir(),
) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const written = [];
  for (const name of readdirSync(sourceDir).filter((entry) => entry.endsWith(".md"))) {
    writeFileSync(
      join(targetDir, name),
      renderSubagentProfile(readFileSync(join(sourceDir, name), "utf8")),
    );
    written.push(name);
  }

  return { written };
}

export {
  materializeAgents,
  renderSubagentProfile,
  resolveAgentsTargetDir,
};
