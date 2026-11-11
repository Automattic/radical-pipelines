// Compares each value and text this repository's prose .rp.md holds with the conventions data `.rp.md` held as JSON
// at 1a43fc61, reading the prose by the entry form of load.md § Conventions. Run from the repository root:
//   node .pipelines/377-run-config-conventions/3-implementation/notes/rp-md-inspection.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const before = JSON.parse(execFileSync("git", ["show", "1a43fc61:.rp.md"], { encoding: "utf8" }).split("---\n")[1]);
const prose = readFileSync(".rp.md", "utf8");
const [, frontmatter, body] = prose.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

// The lines under a heading, up to the next heading of its level or above.
const section = (lines, heading) => {
  const level = heading.match(/^#+/)[0].length, start = lines.indexOf(heading);
  if (start === -1) throw new Error(`no ${heading}`);
  const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end === -1 ? lines.length : end);
};
const trim = (lines) => { const copy = [...lines]; while (copy.length && !copy[0].trim()) copy.shift(); while (copy.length && !copy.at(-1).trim()) copy.pop(); return copy; };
const value = (lines) => trim(lines).join("\n").match(/^`([^`]*)`$/)[1];
// An entry: its fields, the list items opening it, and its text, the lines after the blank line that ends them.
const entry = (lines) => {
  const rest = trim(lines), fields = {};
  while (rest.length && rest[0].startsWith("- ")) { const [, key, raw] = rest.shift().match(/^- ([a-z]+): (.*)$/); fields[key] = raw; }
  return { fields, text: trim(rest).join("\n") };
};
const subheadings = (lines, level) => lines.filter((line) => line.startsWith(`${"#".repeat(level)} `)).map((line) => line.slice(level + 1));

const lines = body.split("\n");
const after = {
  conventions: frontmatter,
  "worktree-folder-root": value(section(lines, "### Worktree folder root")),
  "landing-commit": value(section(lines, "### Landing commit")),
  "commit-format": trim(section(lines, "### Commit format")).join("\n"),
};
for (const [key, heading, field] of [["guardrails", "### Guardrails", "rule"], ["resources", "### Resources", "resource"]]) {
  const all = section(lines, heading);
  after[key] = Object.fromEntries(subheadings(all, 4).map((name) => {
    const { fields, text } = entry(section(all, `#### ${name}`));
    return [name, { [field]: text, profiles: fields.profiles.split(", ") }];
  }));
}
const agents = section(lines, "### Agents"), models = (fields) => Object.fromEntries(Object.entries(fields).map(([key, raw]) => [key, raw.match(/^`(.*)`$/)[1]]));
after.agents = Object.fromEntries(subheadings(agents, 4).map((profile) => {
  const all = section(agents, `#### ${profile}`), own = all.slice(0, all.findIndex((line) => line.startsWith("##### ")) >>> 0);
  const lanes = Object.fromEntries(subheadings(all, 5).map((id) => {
    const { fields, text } = entry(section(all, `##### ${id}`));
    return [id, { ...(text ? { brief: text } : {}), ...models(fields) }];
  }));
  return [profile, { ...models(entry(own).fields), ...(Object.keys(lanes).length ? { lanes } : {}) }];
}));

const expected = { ...before, conventions: "conventions: 7", "commit-format": before["commit-format"].join("\n") };
const report = (name, a, b) => `${JSON.stringify(a) === JSON.stringify(b) ? "equal" : "DIFFERENT"} ${name}`;
for (const key of Object.keys(expected)) {
  if (typeof expected[key] !== "object") { console.log(report(key, after[key], expected[key])); continue; }
  for (const name of Object.keys({ ...expected[key], ...after[key] })) console.log(report(`${key}.${name}`, after[key]?.[name], expected[key][name]));
}
