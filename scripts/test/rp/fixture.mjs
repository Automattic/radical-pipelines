import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach } from "node:test";

export const RP = fileURLToPath(new URL("../../../skills/radical-pipelines/scripts/rp.mjs", import.meta.url));
export const PIPELINE = ".pipelines/demo";
export const P = (rel) => `${PIPELINE}/${rel}`;

export const INTENT = "0-intent/intent.md";
export const SPEC = "1-spec/spec.md";
export const DESIGN = "2-design-doc/design-doc.md";
export const NOTES = "3-implementation/notes.md";

export let root;

export function git(at, ...args) {
  return execFileSync("git", args, { cwd: at, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// Runs rp from a directory outside the repository: the path argument alone selects it.
export function run(...args) {
  const result = spawnSync(process.execPath, [RP, ...args], { cwd: tmpdir(), encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
export function rp(...args) {
  const result = run(...args);
  if (result.status !== 0) throw new Error(`rp ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}
export const abs = (rel) => join(root, rel);
export const check = (...args) => JSON.parse(rp("check", abs(PIPELINE), "--json", ...args));
// The frontier as `<action> <target>` lines.
export const frontier = (...args) => check(...args).frontier.map((entry) => [entry.action, entry.target].filter(Boolean).join(" "));

export function writeFile(rel, contents) {
  mkdirSync(dirname(abs(rel)), { recursive: true });
  writeFileSync(abs(rel), contents);
}
export const write = (rel, contents) => writeFile(P(rel), contents);
export const read = (rel) => readFileSync(abs(P(rel)), "utf8");
export const remove = (rel) => rmSync(abs(P(rel)), { force: true, recursive: true });

export function configure({ targetPhase = 4, base = "main", lanes } = {}) {
  write("run-config.md", `---\n${JSON.stringify({ "target-phase": targetPhase, base, ...(lanes ? { lanes } : {}) }, null, 2)}\n---\n`);
}
export const lane = (profile, id) => ({ profile, id, brief: `${id} brief` });

export function stamp(rel, ...pins) {
  return rp("stamp", abs(P(rel)), ...pins.flatMap((pin) => ["--pin", abs(P(pin))]));
}
export const UPSTREAM = { [SPEC]: [INTENT], [DESIGN]: [SPEC], [NOTES]: [SPEC, DESIGN] };

export function commitAll(subject = "work") {
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--allow-empty", "-m", subject);
  return git(root, "rev-parse", "HEAD").trim();
}

// A thread file; messages are [author, commit] pairs.
export function thread(name, { status = "open", opener, owner, artifact, lane: laneId, territory, messages, frontmatter } = {}) {
  const header = [`status: ${status}`, `opener: ${opener}`, `owner: ${owner}`, `artifact: ${artifact}`, ...(laneId ? [`lane: ${laneId}`] : []), ...(territory ? [`territory: ${territory}`] : [])];
  const body = (messages ?? [[opener, "abc1234"]]).map(([author, commit]) => `## ${author} — ${commit}\n\nFindings.\n`).join("\n");
  write(`threads/${name}`, `${frontmatter ? `---\n${JSON.stringify(frontmatter)}\n---\n` : ""}${header.join("\n")}\n\n${body}`);
}

// A repository on `main` with code, then a `demo` branch carrying the pipeline through `upTo`:
// 0 the intent, 1 the spec, 2 the design doc, 3 notes done.
export function pipeline(upTo = 3, config = {}) {
  configure(config);
  write(INTENT, "origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n");
  if (upTo >= 1) { write(SPEC, "# Spec\n\nRequirement.\n"); stamp(SPEC, INTENT); }
  if (upTo >= 2) { write(DESIGN, "# Design doc\n\nDecision.\n"); stamp(DESIGN, SPEC); }
  if (upTo >= 3) { write(NOTES, "status: done\n\n# Notes\n"); stamp(NOTES, SPEC, DESIGN); }
  return commitAll("pipeline");
}

export function newRepo() {
  const at = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(at, "init", "--quiet", "--initial-branch=main");
  git(at, "config", "user.email", "rp-test@example.com");
  git(at, "config", "user.name", "RP Test");
  git(at, "config", "commit.gpgsign", "false");
  return at;
}

export function useRepo() {
  beforeEach(() => {
    root = newRepo();
    writeFile("src/app.js", "export const a = 1;\n");
    commitAll("base");
    git(root, "checkout", "--quiet", "-b", "demo");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
}
