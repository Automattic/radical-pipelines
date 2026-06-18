#!/usr/bin/env node
/**
 * opencode sub-package build step.
 *
 * Populates this sub-package's published `agents/` and `skills/` trees from the
 * single shared source at the repo root, so the Setup action's file-based
 * install has the files to copy. The shared root `agents/` + `skills/` stay the
 * single edit point — this step copies and transforms, it never forks content.
 *
 * For each shared `agents/<name>.md` it emits a published `<name>.md` whose
 * frontmatter is converted for opencode:
 *   - `description` carried verbatim (the exact source line, never re-serialized),
 *   - `mode: subagent` added,
 *   - `name` dropped (the filename is the agent's identity),
 *   - no `model:` (the per-agent model is supplied at spawn time from `.rp.md`),
 *   - no `permission:` (intentionally omitted).
 * The agent body is copied byte-identically from the source.
 *
 * The skill tree under the shared `skills/` is copied verbatim so the Setup
 * action can install `.opencode/skill/radical-pipelines/` for an owner whose
 * repo lacks it.
 *
 * Uses only built-in Node modules; no external dependencies and no network.
 *
 * Usage:
 *   node packages/opencode/build.mjs
 */

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to this sub-package directory. */
const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repository root (two levels up from `packages/opencode/`). */
const REPO_ROOT = resolve(PACKAGE_DIR, "..", "..");

/** Shared source trees — the single edit point. */
const SOURCE_AGENTS_DIR = join(REPO_ROOT, "agents");
const SOURCE_SKILLS_DIR = join(REPO_ROOT, "skills");

/** Published trees inside this sub-package (listed in `package.json`'s `files`). */
const OUT_AGENTS_DIR = join(PACKAGE_DIR, "agents");
const OUT_SKILLS_DIR = join(PACKAGE_DIR, "skills");

/**
 * Split a shared agent file into its frontmatter lines and its body.
 *
 * The body is returned as the exact substring following the closing `---\n`
 * delimiter, so it round-trips byte-identically. Throws if the file has no
 * leading `---` frontmatter block.
 *
 * @param {string} source Raw file contents of a shared agent `.md`.
 * @returns {{ frontmatter: string[], body: string }} The frontmatter lines
 *   (between the delimiters, excluding them) and the verbatim body.
 */
function splitAgent(source) {
  const lines = source.split("\n");
  if (lines[0] !== "---") {
    throw new Error("agent file is missing its leading '---' frontmatter delimiter");
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    throw new Error("agent file is missing its closing '---' frontmatter delimiter");
  }
  const frontmatter = lines.slice(1, close);
  // Byte offset just past the closing `---` line and its newline: the lengths
  // of every line up to and including the delimiter, plus one `\n` per line.
  let bodyStart = 0;
  for (let i = 0; i <= close; i++) {
    bodyStart += lines[i].length + 1;
  }
  const body = source.slice(bodyStart);
  return { frontmatter, body };
}

/**
 * Convert a shared agent's contents into the opencode-published form.
 *
 * Carries the `description` frontmatter line verbatim, adds `mode: subagent`,
 * and drops every other field (notably `name`). The body is kept byte-identical.
 *
 * @param {string} source Raw file contents of a shared agent `.md`.
 * @returns {string} The converted file contents to publish.
 */
function convertAgent(source) {
  const { frontmatter, body } = splitAgent(source);
  const descriptionLine = frontmatter.find((line) => line.startsWith("description:"));
  if (!descriptionLine) {
    throw new Error("agent frontmatter is missing a 'description' field");
  }
  return `---\n${descriptionLine}\nmode: subagent\n---\n${body}`;
}

/**
 * Build the published `agents/` and `skills/` trees from the shared source.
 *
 * @param {object} [options] Optional overrides, primarily for testing.
 * @param {string} [options.sourceAgentsDir] Shared agents source dir.
 * @param {string} [options.sourceSkillsDir] Shared skills source dir.
 * @param {string} [options.outAgentsDir] Published agents output dir.
 * @param {string} [options.outSkillsDir] Published skills output dir.
 * @returns {{ agents: string[] }} The list of published agent filenames.
 */
function build(options = {}) {
  const sourceAgentsDir = options.sourceAgentsDir ?? SOURCE_AGENTS_DIR;
  const sourceSkillsDir = options.sourceSkillsDir ?? SOURCE_SKILLS_DIR;
  const outAgentsDir = options.outAgentsDir ?? OUT_AGENTS_DIR;
  const outSkillsDir = options.outSkillsDir ?? OUT_SKILLS_DIR;

  // Start each tree from scratch so removed source files never linger.
  rmSync(outAgentsDir, { recursive: true, force: true });
  rmSync(outSkillsDir, { recursive: true, force: true });
  mkdirSync(outAgentsDir, { recursive: true });

  const agents = readdirSync(sourceAgentsDir)
    .filter((name) => name.endsWith(".md"))
    .sort();
  for (const name of agents) {
    const source = readFileSync(join(sourceAgentsDir, name), "utf8");
    writeFileSync(join(outAgentsDir, name), convertAgent(source));
  }

  // The skill tree is bundled verbatim.
  cpSync(sourceSkillsDir, outSkillsDir, { recursive: true });

  return { agents };
}

export { build, convertAgent, splitAgent };

/**
 * Whether this module was executed directly as a CLI (rather than imported by
 * tests). Compares the module URL against the resolved entry path.
 *
 * @returns {boolean} `true` when run as `node packages/opencode/build.mjs`.
 */
function isMainModule() {
  const entry = process.argv[1];
  return entry ? fileURLToPath(import.meta.url) === resolve(entry) : false;
}

if (isMainModule()) {
  const { agents } = build();
  console.log(`Built ${agents.length} opencode agents and bundled the skill tree.`);
}
