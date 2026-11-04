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
export const frontier = (...args) => check(...args).frontier.map((entry) => [entry.action, entry.target, entry.lane].filter(Boolean).join(" "));

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

// Stamps a file with its derived required inputs; `candidates` are the extra pins of a consolidated root.
export function stamp(rel, ...candidates) {
  return rp("stamp", abs(P(rel)), ...candidates.flatMap((pin) => ["--pin", abs(P(pin))]));
}
// Lands a role's turn: commits the working tree, then stamps the file.
export function land(rel, ...candidates) {
  commitAll(`land ${rel}`);
  return stamp(rel, ...candidates);
}
// A role revises a file's body and its turn lands.
export function revise(rel, text = "Revised.") {
  write(rel, `${read(rel)}${text}\n`);
  return land(rel);
}
export const UPSTREAM = { [SPEC]: [INTENT], [DESIGN]: [SPEC], [NOTES]: [SPEC, DESIGN] };

export function commitAll(subject = "work") {
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--allow-empty", "-m", subject);
  return git(root, "rev-parse", "HEAD").trim();
}

// A thread file, named from its header; messages are [author, commit] pairs. Returns its pipeline-relative path.
export function thread({ n = 1, status = "open", opener, owner, artifact, messages, frontmatter, name } = {}) {
  const path = `threads/${name ?? `${n}-${opener}-${owner}-${artifact}.md`}`;
  const header = [`status: ${status}`, `opener: ${opener}`, `owner: ${owner}`, `artifact: ${artifact}`];
  const body = (messages ?? [[opener, "abc1234"]]).map(([author, commit]) => `## ${author} — ${commit}\n\nFindings.\n`).join("\n");
  write(path, `${frontmatter ? `---\n${JSON.stringify(frontmatter)}\n---\n` : ""}${header.join("\n")}\n\n${body}`);
  return path;
}
// The parties of each thread kind used across tests.
export const TO_SPEC = { opener: "design-doc-producer", owner: "spec-producer", artifact: "spec" };
export const TO_DESIGN = { opener: "implementer", owner: "design-doc-producer", artifact: "design-doc" };
export const REVIEW = (lane = "default") => ({ opener: `reviewer-${lane}`, owner: "implementer", artifact: "implementation" });
export const TO_OWNER = { opener: "spec-producer", owner: "owner", artifact: "intent", status: "disagreement" };
// A review thread closed approved at HEAD, landed and stamped.
export function approve(laneId = "default", n = 1) {
  const head = git(root, "rev-parse", "HEAD").trim();
  const path = thread({ n, status: "closed: approved", ...REVIEW(laneId), messages: [[`reviewer-${laneId}`, head]] });
  land(path);
  return path;
}

// A repository on `main` with code, then a `demo` branch carrying the pipeline through `upTo`:
// 0 the intent, 1 the spec, 2 the design doc, 3 notes done.
export function pipeline(upTo = 3, config = {}) {
  configure(config);
  write(INTENT, "origin: issue 7\n\n# Intent\n\n## Goal\n\nUsers can export.\n");
  const artifacts = [[SPEC, "# Spec\n\nRequirement.\n"], [DESIGN, "# Design doc\n\nDecision.\n"], [NOTES, "status: done\n\n# Notes\n"]].slice(0, upTo);
  for (const [rel, body] of artifacts) write(rel, body);
  commitAll("pipeline");
  for (const [rel] of artifacts) stamp(rel);
  return commitAll("stamps");
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
