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
  write("run-config.md", `---\n${JSON.stringify({ format: 7, "target-phase": targetPhase, base, ...(lanes ? { lanes } : {}) }, null, 2)}\n---\n`);
}
export const lane = (profile, id) => ({ profile, id, brief: `${id} brief` });

// A file with a YAML frontmatter holding `values`, one `<key>: <value>` line each, above `body`.
export const withFrontmatter = (values, body = "") => `---\n${Object.entries(values).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n${body}`;
// A later input targeting `target`.
export const later = (target, body = "") => withFrontmatter({ target }, body);
// The certification `rp stamp` wrote for a file, parsed, or null when it has none.
export function certification(rel) {
  try { return JSON.parse(readFileSync(abs(P(`certification/${rel}.json`)), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

// Certifies a file with its derived required inputs at a turn's commit.
export const stampAt = (at, rel) => rp("stamp", abs(P(rel)), "--at", at);
export const stamp = (rel) => stampAt("HEAD", rel);
// Lands a role's turn: commits the working tree, then certifies the file at that commit.
export function land(rel) {
  commitAll(`land ${rel}`);
  return stamp(rel);
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

// A thread file, named from its frontmatter; messages are [author, commit] pairs. A thread to owner cites `cites`.
// Returns its pipeline-relative path.
export function thread({ n = 1, status = "open", opener, owner, artifact, messages, name, cites = "threads/0-cited.md" } = {}) {
  const path = `threads/${name ?? `${n}-${opener}-${owner}-${artifact}.md`}`;
  const body = (messages ?? [[opener, "abc1234"]]).map(([author, commit]) => `## ${author} — ${commit}\n\nFindings.\n`).join("\n");
  write(path, withFrontmatter({ status, opener, owner, artifact, ...(owner === "owner" ? { cites } : {}) }, `\n${body}`));
  return path;
}
// The parties of each thread kind used across tests.
export const TO_SPEC = { opener: "design-doc-producer", owner: "spec-producer", artifact: "spec" };
export const TO_DESIGN = { opener: "implementer", owner: "design-doc-producer", artifact: "design-doc" };
export const REVIEW = (lane = "default") => ({ opener: `reviewer-${lane}`, owner: "implementer", artifact: "implementation" });
export const TO_OWNER = { opener: "spec-producer", owner: "owner", artifact: "intent", status: "disagreement" };
// A review thread closed approved by a turn that started at HEAD, landed, certified at that commit, and committed.
export function approve(laneId = "default", n = 1) {
  const head = git(root, "rev-parse", "HEAD").trim();
  const path = thread({ n, status: "approved", ...REVIEW(laneId), messages: [[`reviewer-${laneId}`, head]] });
  commitAll(`approve ${laneId}`);
  stampAt(head, path);
  commitAll(`stamp ${path}`);
  return path;
}

// A repository on `main` with code, then a `demo` branch carrying the pipeline through `upTo`:
// 0 the intent, 1 the spec, 2 the design doc, 3 notes done.
export function pipeline(upTo = 3, config = {}) {
  configure(config);
  write(INTENT, withFrontmatter({ issue: 7 }, "\n# Intent\n\n## Goal\n\nUsers can export.\n"));
  const artifacts = [[SPEC, "# Spec\n\nRequirement.\n"], [DESIGN, "# Design doc\n\nDecision.\n"], [NOTES, withFrontmatter({ status: "done" }, "\n# Notes\n")]].slice(0, upTo);
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
