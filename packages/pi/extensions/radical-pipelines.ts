import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packagedAgentsDir = path.join(packageRoot, "agents");
const packagedTeamsYaml = path.join(packageRoot, "teams.yaml");

const expectedAgents = [
  "prompt-writer",
  "spec-writer",
  "designer",
  "planner",
  "implementer",
  "documenter",
];
const expectedTeams = ["radical-pipelines", "radical-pipelines-spec"];

function readText(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function sameFile(a: string, b: string): boolean {
  return readText(a) === readText(b);
}

function agentPath(cwd: string, name: string): string {
  return path.join(cwd, ".pi", "agents", `${name}.md`);
}

function parseTeams(content: string): Set<string> {
  const teams = new Set<string>();
  for (const line of content.split("\n")) {
    if (line.trim() && !line.startsWith(" ") && !line.startsWith("\t") && line.trim().endsWith(":")) {
      teams.add(line.trim().slice(0, -1));
    }
  }
  return teams;
}

function extractTeamBlock(content: string, teamName: string): string | undefined {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${teamName}:` && !line.startsWith(" ") && !line.startsWith("\t"));
  if (start === -1) return undefined;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim() && !line.startsWith(" ") && !line.startsWith("\t") && line.trim().endsWith(":")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trimEnd();
}

function simpleDiff(existing: string, replacement: string, label = "file"): string {
  if (existing === replacement) return "No changes.";

  const existingLines = existing.split("\n");
  const replacementLines = replacement.split("\n");
  const max = Math.max(existingLines.length, replacementLines.length);
  const diff: string[] = [`--- current ${label}`, `+++ packaged ${label}`];

  for (let index = 0; index < max; index++) {
    if (existingLines[index] === replacementLines[index]) continue;
    if (existingLines[index] !== undefined) diff.push(`- ${existingLines[index]}`);
    if (replacementLines[index] !== undefined) diff.push(`+ ${replacementLines[index]}`);
    if (diff.length >= 42) {
      diff.push("... diff truncated ...");
      break;
    }
  }

  return diff.join("\n");
}

function backupPath(filePath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${filePath}.rp-backup-${stamp}`;
}

function availableCommandNames(pi: ExtensionAPI): string[] {
  try {
    return pi.getCommands().map((command) => command.name);
  } catch {
    return [];
  }
}

function availableToolNames(pi: ExtensionAPI): string[] {
  const api = pi as unknown as { getAllTools?: () => Array<{ name: string }> };
  try {
    return api.getAllTools?.().map((tool) => tool.name) ?? [];
  } catch {
    return [];
  }
}

function hasAnyPrefix(values: string[], prefixes: string[]): boolean {
  return values.some((value) => prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}:`)));
}

function doctorReport(pi: ExtensionAPI, cwd: string): string {
  const commands = availableCommandNames(pi);
  const tools = availableToolNames(pi);
  const projectAgents = expectedAgents.filter((name) => fs.existsSync(agentPath(cwd, name)));
  const projectTeamsPath = path.join(cwd, ".pi", "teams.yaml");
  const teamContent = readText(projectTeamsPath) ?? "";
  const presentTeams = parseTeams(teamContent);

  const checks = [
    ["Package root", packageRoot],
    ["Radical Pipelines skill", commands.includes("skill:radical-pipelines") || commands.includes("radical-pipelines") ? "ok" : "missing"],
    ["pi-teams commands/tools", hasAnyPrefix(commands, ["team", "teams"]) || tools.some((tool) => tool.includes("team") || tool.includes("teammate")) ? "ok" : "missing"],
    ["worktree commands", hasAnyPrefix(commands, ["worktree"]) ? "ok" : "missing"],
    ["Project agents", `${projectAgents.length}/${expectedAgents.length} present`],
    ["Project team templates", `${expectedTeams.filter((team) => presentTeams.has(team)).length}/${expectedTeams.length} present`],
    ["Bundled pi-teams", fs.existsSync(path.join(packageRoot, "node_modules", "pi-teams")) ? "ok" : "missing; run npm install in the package before local-path testing"],
    ["Bundled pi-worktrees", fs.existsSync(path.join(packageRoot, "node_modules", "@zenobius", "pi-worktrees")) ? "ok" : "missing; run npm install in the package before local-path testing"],
  ];

  return [
    "Radical Pipelines doctor",
    "",
    ...checks.map(([label, value]) => `- ${label}: ${value}`),
    "",
    projectAgents.length === expectedAgents.length && expectedTeams.every((team) => presentTeams.has(team))
      ? "Project-local pi-teams setup looks ready."
      : "Run /rp-init from the repository root to install missing project-local agents and team templates.",
  ].join("\n");
}

async function installFile(source: string, target: string, ctx: { ui: { confirm: (title: string, message: string) => Promise<boolean>; notify: (message: string, level?: string) => void } }): Promise<"created" | "updated" | "skipped"> {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
    return "created";
  }
  if (sameFile(source, target)) return "skipped";

  const existing = readText(target) ?? "";
  const packaged = readText(source) ?? "";
  const ok = await ctx.ui.confirm(
    "Update Radical Pipelines file?",
    `${target} already exists and differs from the packaged version. A backup will be written before replacing it.\n\n${simpleDiff(existing, packaged, path.basename(target))}`
  );
  if (!ok) return "skipped";

  const backup = backupPath(target);
  fs.copyFileSync(target, backup);
  fs.copyFileSync(source, target);
  ctx.ui.notify(`Backed up existing file to ${backup}`, "info");
  return "updated";
}

async function mergeTeamsYaml(cwd: string, ctx: { ui: { confirm: (title: string, message: string) => Promise<boolean>; notify: (message: string, level?: string) => void } }): Promise<"created" | "updated" | "skipped"> {
  const target = path.join(cwd, ".pi", "teams.yaml");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const packaged = readText(packagedTeamsYaml) ?? "";
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, packaged);
    return "created";
  }

  const existing = readText(target) ?? "";
  const existingTeams = parseTeams(existing);
  const missingTeams = expectedTeams.filter((team) => !existingTeams.has(team));
  if (missingTeams.length === 0) return "skipped";

  const missingBlocks = missingTeams
    .map((team) => extractTeamBlock(packaged, team))
    .filter((block): block is string => Boolean(block));
  const replacement = `${existing.trimEnd()}\n\n${missingBlocks.join("\n\n")}\n`;
  const ok = await ctx.ui.confirm(
    "Update .pi/teams.yaml?",
    `${target} is missing ${missingTeams.join(", ")}. A backup will be written before appending only those packaged templates.\n\n${simpleDiff(existing, replacement, "teams.yaml")}`
  );
  if (!ok) return "skipped";

  const backup = backupPath(target);
  fs.copyFileSync(target, backup);
  fs.writeFileSync(target, replacement);
  ctx.ui.notify(`Backed up existing teams.yaml to ${backup}`, "info");
  return "updated";
}

export default function radicalPipelinesExtension(pi: ExtensionAPI) {
  pi.registerCommand("rp-doctor", {
    description: "Verify Radical Pipelines Pi package, skills, teams, agents, and worktree setup",
    handler: async (_args, ctx) => {
      const report = doctorReport(pi, ctx.cwd);
      if (!ctx.hasUI) console.log(report);
      ctx.ui.notify(report, "info");
    },
  });

  pi.registerCommand("rp-init", {
    description: "Install or update project-local Radical Pipelines pi-teams agents and team templates",
    handler: async (_args, ctx) => {
      const ok = await ctx.ui.confirm(
        "Initialize Radical Pipelines?",
        `This will create missing files under ${path.join(ctx.cwd, ".pi", "agents")} and update ${path.join(ctx.cwd, ".pi", "teams.yaml")} when needed. Existing differing files require another confirmation and are backed up before replacement.`
      );
      if (!ok) {
        ctx.ui.notify("Radical Pipelines initialization cancelled.", "info");
        return;
      }

      const results: string[] = [];
      for (const name of expectedAgents) {
        const result = await installFile(path.join(packagedAgentsDir, `${name}.md`), agentPath(ctx.cwd, name), ctx);
        results.push(`${name}.md: ${result}`);
      }
      results.push(`teams.yaml: ${await mergeTeamsYaml(ctx.cwd, ctx)}`);
      const report = ["Radical Pipelines initialization complete:", ...results.map((line) => `- ${line}`), "Run /rp-doctor to verify."].join("\n");
      if (!ctx.hasUI) console.log(report);
      ctx.ui.notify(report, "success");
    },
  });
}
