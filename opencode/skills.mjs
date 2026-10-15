/**
 * Skill registration: reading the packaged skills into the records opencode's
 * skill registry accepts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path to the packaged `skills/` directory, resolved relative to
 * this module's location so it resolves correctly regardless of the
 * process's working directory. Read by reference — never copied — in
 * `setup`.
 */
const SKILLS_SOURCE_DIR = fileURLToPath(new URL("../skills", import.meta.url));

/**
 * Split a skill file into its YAML frontmatter fields and its markdown body.
 *
 * Only the scalar fields opencode reads off a skill are recognized (`name`,
 * `description`, `autoinvoke`); anything else in the block is ignored. A file
 * without a leading `---` fence has no frontmatter and is all body.
 *
 * @param {string} source Raw file contents.
 * @returns {{ frontmatter: Record<string, string>, content: string }}
 */
function parseSkillFrontmatter(source) {
  const normalized = source.replace(/^﻿/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(normalized);
  if (!match) return { frontmatter: {}, content: normalized.trim() };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    frontmatter[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }

  return {
    frontmatter,
    content: normalized.slice(match[0].length).trim(),
  };
}

/**
 * Read a directory of skills into the `Skill.Info` records opencode's
 * `ctx.skill.transform` draft accepts.
 *
 * opencode v2 dropped the directory *source* registration a plugin used to
 * hand over (`sources.source({ type: "directory", ... })` — removed, so
 * calling it dies with "sources.source is not a function"); the draft now
 * takes fully-formed skills. Both packaging layouts core supports are read
 * here: `<dir>/<id>/SKILL.md` (RP's own) and a flat `<dir>/<id>.md`, with the
 * id taken from the containing directory or the file's basename to match how
 * core derives it.
 *
 * @param {string} directory Absolute path to the skills directory.
 * @param {{ exists?: (path: string) => boolean, read?: (path: string) => string, list?: (path: string) => string[] }} [io]
 *   Injection seam for tests; defaults to the real filesystem.
 * @returns {Array<{ id: string, name: string, description?: string, autoinvoke?: boolean, path: string, content: string }>}
 *   Skills sorted by id. An absent or unreadable directory yields `[]`.
 */
function readSkillDirectory(
  directory,
  {
    exists = existsSync,
    read = (path) => readFileSync(path, "utf8"),
    list = (path) => readdirSync(path),
  } = {},
) {
  if (!exists(directory)) return [];

  const files = [];
  for (const entry of list(directory)) {
    const nested = join(directory, entry, "SKILL.md");
    if (exists(nested)) {
      files.push({ id: entry, path: nested });
      continue;
    }
    if (entry.endsWith(".md") && entry !== "SKILL.md") {
      files.push({ id: basename(entry, ".md"), path: join(directory, entry) });
    }
  }

  const skills = [];
  for (const file of files) {
    const { frontmatter, content } = parseSkillFrontmatter(read(file.path));
    skills.push({
      id: file.id,
      name: frontmatter.name ?? file.id,
      ...(frontmatter.description === undefined
        ? {}
        : { description: frontmatter.description }),
      ...(frontmatter.autoinvoke === undefined
        ? {}
        : { autoinvoke: frontmatter.autoinvoke === "true" }),
      path: file.path,
      content,
    });
  }

  return skills.sort((left, right) => (left.id < right.id ? -1 : 1));
}

export {
  SKILLS_SOURCE_DIR,
  parseSkillFrontmatter,
  readSkillDirectory,
};
