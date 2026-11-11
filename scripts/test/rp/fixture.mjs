import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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
// Has Git ignore `pattern` in the repository, as a line of its exclude file.
export const ignore = (pattern) => appendFileSync(abs(".git/info/exclude"), `${pattern}\n`);

// The run's `agents`: `agents` with each of `lanes`, `{ profile, id, ...members }`, under its profile's `lanes`.
export function agentsOf(lanes = [], agents = {}) {
  const result = structuredClone(agents);
  for (const { profile, id, ...members } of lanes) {
    result[profile] ??= {};
    (result[profile].lanes ??= {})[id] = members;
  }
  return result;
}
// The conventions each run configuration records: worktrees under `.worktrees`, which every test repository's Git
// ignores, with `data` over them by key. Each test starts with none but the worktree folder root.
let recorded = {};
export function conventions(data = {}) { recorded = data; }
// The run configuration, `run-config.json`: the target phase, the base, the recorded conventions, the run's agents, and
// `extra` keys, written as given.
export function configure({ targetPhase = 4, base = "main", lanes, agents, ...extra } = {}) {
  const runAgents = lanes || agents ? { agents: agentsOf(lanes, agents) } : {};
  write("run-config.json", `${JSON.stringify({ "target-phase": targetPhase, base, "worktree-folder-root": ".worktrees", ...recorded, ...runAgents, ...extra }, null, 2)}\n`);
}
export const lane = (profile, id) => ({ profile, id, brief: `${id} brief` });

// A file with a YAML frontmatter holding `values`, one `<key>: <value>` line each, above `body`.
export const withFrontmatter = (values, body = "") => `---\n${Object.entries(values).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n${body}`;
// A later input targeting `target`.
export const later = (target, body = "") => withFrontmatter({ target }, body);
// The certification of a file in the working tree, parsed, or null when it has none.
export function certification(rel) {
  try { return JSON.parse(readFileSync(abs(P(`certification/${rel}.json`)), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export const UPSTREAM = { [SPEC]: [INTENT], [DESIGN]: [SPEC], [NOTES]: [SPEC, DESIGN] };
const LATER = /^0-intent\/(?:constraint|proposal|failure)-[1-9]\d*\.md$/;
// Certifies the file at `rel`, built directly as landing certifies it, in the working tree of `worktree`: each required
// input of its kind pinned at its identity in the tree of the commit `at`, and on an approval, a thread, the commit
// holding it, `worktree`'s HEAD, as its approved commit. Returns the certification.
export function certifyAt(at, rel, { folder = PIPELINE, worktree = root } = {}) {
  const id = (path) => git(worktree, "rev-parse", `${at}:${folder}/${path}`).trim().slice(0, 12);
  const laterInputs = git(worktree, "ls-tree", "-r", "--name-only", at, "--", `${folder}/0-intent/`).split("\n").filter(Boolean)
    .map((path) => path.slice(folder.length + 1)).filter((path) => LATER.test(path));
  const targets = (path) => (git(worktree, "show", `${at}:${folder}/${path}`).match(/^target:(.*)$/m)?.[1] ?? "").split(",")
    .map((target) => target.trim().replace(/^["']|["']$/g, "").replace(/#.*$/, ""));
  const approval = rel.startsWith("threads/");
  const root_ = Object.keys(UPSTREAM).find((artifact) => rel === artifact || rel.startsWith(`${artifact.split("/")[0]}/lanes/`));
  const required = approval ? [INTENT, ...laterInputs] : [...UPSTREAM[root_], ...(rel === root_ ? laterInputs.filter((path) => targets(path).includes(rel)) : [])];
  const certified = { inputs: required.map((path) => `${path}@${id(path)}`).sort(), ...(approval ? { reviewed: git(worktree, "rev-parse", "HEAD").trim() } : {}) };
  const path = join(worktree, folder, `certification/${rel}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(certified, null, 2)}\n`);
  return certified;
}
export const certify = (rel) => certifyAt("HEAD", rel);
// Lands a role's turn: commits the working tree, then certifies the file at that commit.
export function land(rel) {
  commitAll(`land ${rel}`);
  return certify(rel);
}
// A role revises a file's body and its turn lands.
export function revise(rel, text = "Revised.") {
  write(rel, `${read(rel)}${text}\n`);
  return land(rel);
}
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
  certifyAt(head, path);
  commitAll(`certify ${path}`);
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
  for (const [rel] of artifacts) certify(rel);
  return commitAll("certifications");
}

// A repository in a new temporary folder, or in its subfolder `folder` when given.
export function newRepo(folder = null) {
  const temporary = mkdtempSync(join(tmpdir(), "rp-test-")), at = folder ? join(temporary, folder) : temporary;
  if (folder) mkdirSync(at);
  git(at, "init", "--quiet", "--initial-branch=main");
  git(at, "config", "user.email", "rp-test@example.com");
  git(at, "config", "user.name", "RP Test");
  git(at, "config", "commit.gpgsign", "false");
  return at;
}

// Each test in a new repository on `demo`, in the subfolder `folder` of its temporary folder when given, whose Git
// ignores `.worktrees` and `run-config.local.json`, as setup has a project's ignore them, with no conventions recorded.
export function useRepo(folder = null) {
  beforeEach(() => {
    root = newRepo(folder);
    writeFile(".git/info/exclude", ".worktrees/\nrun-config.local.json\n");
    recorded = {};
    writeFile("src/app.js", "export const a = 1;\n");
    commitAll("base");
    git(root, "checkout", "--quiet", "-b", "demo");
  });
  afterEach(() => rmSync(folder ? dirname(root) : root, { recursive: true, force: true }));
}

// The plan `rp next` prints, with `args`, as its lines.
export function plan(...args) {
  const out = run("next", abs(PIPELINE), ...args);
  if (out.status !== 0) throw new Error(`rp next ${args.join(" ")} failed: ${out.stderr}`);
  return out.stdout.trimEnd().split("\n");
}
export const apply = () => plan("--apply");
// A woken role's fields in a plan's lines: each `wake <role> <key> [<value>]` as `key: value`, a flag as true, and its
// resources as a list.
export function wakeOf(lines, role) {
  const fields = { resources: [] };
  for (const line of lines.filter((each) => each.startsWith(`wake ${role} `))) {
    const [key, ...value] = line.slice(`wake ${role} `.length).split(" ");
    if (key === "resource") fields.resources.push(value.join(" "));
    else fields[key] = value.length ? value.join(" ") : true;
  }
  return fields;
}
// Runs `rp land` for a role, failing on a stop; prints the phases it completed.
export const landRole = (role) => rp("land", abs(PIPELINE), "--role", role);
// The worktree of a lane branch under `.worktrees`, and a commit there of each [path, contents], pipeline-relative.
export const laneWorktree = (branch) => join(realpathSync(root), ".worktrees", branch);
export function commitIn(worktree, files, subject = "work") {
  for (const [rel, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(worktree, PIPELINE, rel)), { recursive: true });
    writeFileSync(join(worktree, PIPELINE, rel), contents);
  }
  git(worktree, "add", "-A");
  git(worktree, "commit", "--quiet", "--allow-empty", "-m", subject);
  return git(worktree, "rev-parse", "HEAD").trim();
}
