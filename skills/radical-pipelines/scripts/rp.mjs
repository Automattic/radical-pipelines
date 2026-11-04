#!/usr/bin/env node
// rp — state tooling for Radical Pipelines. Zero dependencies: everything it computes can be done with bare git.
// Commands: check, stamp, pipelines. README.md beside this file is the contract.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, lstatSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

// What cannot be read, or a command used wrongly: stops the command.
class RpError extends Error {}
const fail = (message) => { throw new RpError(message); };
// A malformed pipeline file: the frontier is INVALID and nothing is computed from it.
export class Invalid extends Error {}
const invalid = (reason) => { throw new Invalid(reason); };

// --- git ----------------------------------------------------------------------

// Git reads its input from a file: a synchronous child can stall reading piped input to its end.
function gitBytes(root, args, input) {
  const run = (stdin) => execFileSync("git", args, { cwd: root, maxBuffer: Infinity, stdio: [stdin, "pipe", "pipe"] });
  try {
    if (input === undefined) return run("ignore");
    const directory = mkdtempSync(join(tmpdir(), "rp-input-"));
    try {
      const path = join(directory, "input");
      writeFileSync(path, input);
      const fd = openSync(path, "r");
      try { return run(fd); } finally { closeSync(fd); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  } catch (error) {
    fail(`git ${args.join(" ")}: ${error.stderr?.toString("utf8").trim() || error.message}`);
  }
}
const gitText = (root, args, input) => gitBytes(root, args, input).toString("utf8").trim();

// The commit a revision names, or null when it names none.
function commitOf(root, revision) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "--quiet", "--end-of-options", `${revision}^{commit}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch { return null; }
}
function requireCommit(root, revision, what) {
  return commitOf(root, revision) ?? fail(`${what} does not resolve to a commit: ${revision}`);
}

function gitStream(root, args, input) {
  const child = spawn("git", args, { cwd: root, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
  const errors = [];
  child.stderr.on("data", (chunk) => errors.push(chunk));
  let failure;
  const finished = new Promise((done) => {
    child.on("error", (error) => { failure = error; });
    child.on("close", (code, signal) => done(failure ?? (code === 0 ? null : new Error(`git ${args[0]} exited ${signal ?? code}: ${Buffer.concat(errors).toString("utf8").trim()}`))));
  });
  if (input !== undefined) {
    child.stdin.on("error", (error) => { failure = error; });
    child.stdin.end(input);
  }
  return { child, finished };
}

// Object contents through one streamed `git cat-file --batch`: a Buffer per name, or null when the name is missing.
// A name is an object id or `<tree-ish>:<path>`; any object other than a blob stops the command.
async function readObjects(root, names) {
  if (!names.length) return [];
  for (const name of names) if (/[\n\r]/.test(name)) fail(`cannot read object with a newline in its name: ${JSON.stringify(name)}`);
  const batch = gitStream(root, ["cat-file", "--batch"], names.map((name) => `${name}\n`).join(""));
  const stream = batch.child.stdout[Symbol.asyncIterator]();
  let chunk = Buffer.alloc(0), offset = 0;
  const available = async () => {
    if (offset < chunk.length) return true;
    const next = await stream.next();
    chunk = next.value ?? Buffer.alloc(0);
    offset = 0;
    return !next.done;
  };
  const line = async () => {
    const parts = [];
    while (await available()) {
      const end = chunk.indexOf(10, offset);
      parts.push(chunk.subarray(offset, end === -1 ? chunk.length : end));
      offset = end === -1 ? chunk.length : end + 1;
      if (end !== -1) return Buffer.concat(parts).toString("utf8");
    }
    throw new Error("unexpected end of batch header");
  };
  const bytes = async (length) => {
    const result = Buffer.allocUnsafe(length);
    let copied = 0;
    while (copied < length) {
      if (!await available()) throw new Error("unexpected end of batch object");
      const count = Math.min(length - copied, chunk.length - offset);
      chunk.copy(result, copied, offset, offset + count);
      copied += count;
      offset += count;
    }
    return result;
  };
  const contents = [];
  let reading = names[0];
  try {
    for (const name of names) {
      reading = name;
      const header = await line();
      if (header === `${name} missing`) { contents.push(null); continue; }
      const metadata = header.match(/^([0-9a-f]{40}|[0-9a-f]{64}) ([a-z]+) (\d+)$/);
      if (!metadata) throw new Error(`invalid batch response: ${header}`);
      const content = await bytes(Number(metadata[3]));
      if ((await bytes(1))[0] !== 10) throw new Error("invalid batch object terminator");
      if (metadata[2] !== "blob") throw new Error(`not a file: ${metadata[2]}`);
      contents.push(content);
    }
    if (await available()) throw new Error("unexpected trailing batch output");
    const failure = await batch.finished;
    if (failure) throw failure;
  } catch (error) {
    batch.child.kill();
    batch.child.stdout.destroy();
    batch.child.stdin?.destroy();
    await batch.finished;
    fail(`cannot read ${reading}: ${error.message}`);
  }
  return contents;
}

// `git ls-tree -z` entries under a tree-ish, with their mode, type, object id, and path.
function lsTree(root, treeish, path, recursive) {
  const output = gitBytes(root, ["ls-tree", ...(recursive ? ["-r"] : []), "-z", treeish, "--", path]).toString("utf8");
  return output.split("\0").filter(Boolean).map((entry) => {
    const match = entry.match(/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40}|[0-9a-f]{64})\t(.+)$/s);
    if (!match) fail(`cannot read ${treeish}:${path}: invalid ls-tree entry`);
    return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
  });
}

// --- repository -----------------------------------------------------------------

const posix = (path) => path.split(sep).join("/");

// The repository and the repository-relative path of a command argument, which need not exist.
function locate(argument) {
  const requested = resolve(process.cwd(), argument);
  let existing = requested;
  const missing = [];
  while (!existsSync(existing)) {
    missing.unshift(basename(existing));
    const parent = dirname(existing);
    if (parent === existing) fail(`cannot locate a git repository for: ${argument}`);
    existing = parent;
  }
  const found = realpathSync(existing);
  const real = join(found, ...missing);
  let root;
  try { root = realpathSync(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: statSync(found).isDirectory() ? found : dirname(found), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()); }
  catch { fail(`cannot locate a git repository for: ${argument}`); }
  const rel = posix(relative(root, real));
  if (rel.startsWith("..") || resolve(root, rel) !== real) fail(`outside the repository ${root}: ${argument}`);
  return { root, rel };
}

// The pipelines folder root: the first line under `### Pipelines folder root` in the repository's `.rp.md`, else `.pipelines`.
export function pipelinesFolderRoot(root) {
  const conventions = join(root, ".rp.md");
  if (!existsSync(conventions)) return ".pipelines";
  const lines = readFileSync(conventions, "utf8").split(/\r?\n/);
  const heading = lines.findIndex((line) => /^### Pipelines folder root[\t ]*$/.test(line));
  if (heading === -1) return ".pipelines";
  const value = lines.slice(heading + 1).find((line) => line.trim())?.trim();
  if (!value || /^#{1,6} /.test(value)) fail(".rp.md: Pipelines folder root has no value");
  const path = value.replace(/^`(.*)`$/, "$1").replace(/\/+$/, "").replace(/^\.\//, "");
  if (!path || path === "." || path.startsWith("/") || path.split("/").some((segment) => !segment || segment === "." || segment === ".."))
    fail(`.rp.md: Pipelines folder root must be a relative folder inside the repository: ${value}`);
  return path;
}

// A pipeline folder is `<pipelines folder root>/<pipeline slug>`; `inner` is a path inside it.
function pipelineOf(root, rel, command) {
  const pipelinesRoot = pipelinesFolderRoot(root);
  if (!rel.startsWith(`${pipelinesRoot}/`)) fail(`${command}: not inside the pipelines folder root ${pipelinesRoot}: ${rel}`);
  const [slug, ...inner] = rel.slice(pipelinesRoot.length + 1).split("/");
  if (!slug) fail(`${command}: not a pipeline folder: ${rel}`);
  return { pipelinesRoot, folder: `${pipelinesRoot}/${slug}`, inner: inner.join("/") };
}

// --- frontmatter and identity ---------------------------------------------------

// The frontmatter is the JSON between a first line `---` and the next line `---`; the body is every byte after it,
// exactly as git hashes it. The delimiter lines alone tolerate a trailing `\r`; the closing one may end the file.
export function splitFrontmatter(bytes) {
  const raw = bytes.toString("latin1");
  const open = raw.match(/^---\r?\n/);
  if (!open) return { json: null, body: bytes };
  const close = raw.slice(open[0].length).match(/(?:^|\n)---\r?(?:\n|$)/);
  if (!close) return { json: null, body: bytes, error: "frontmatter has no closing --- line" };
  const start = open[0].length;
  return { json: bytes.subarray(start, start + close.index).toString("utf8"), body: bytes.subarray(start + close.index + close[0].length) };
}

// A file's frontmatter fields (empty when it has none) and its body, or Invalid.
export function frontmatterOf(bytes) {
  const { json, body, error } = splitFrontmatter(bytes);
  if (error) invalid(error);
  if (json === null) return { data: {}, body, stamped: false };
  let data;
  try { data = JSON.parse(json); } catch (parseError) { invalid(`frontmatter is not valid JSON: ${parseError.message}`); }
  if (data === null || typeof data !== "object" || Array.isArray(data)) invalid("frontmatter must be a JSON object");
  return { data, body, stamped: true };
}

function onlyKeys(data, allowed) {
  for (const key of Object.keys(data)) if (!allowed.includes(key)) invalid(`unexpected frontmatter key: ${key}`);
}

// Identity: the first 12 hexadecimal characters of the git blob hash of the body below the frontmatter.
export function identity(bytes) {
  const { body } = splitFrontmatter(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, "utf8"));
  return createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex").slice(0, 12);
}

export function renderFrontmatter(data, body) {
  return Buffer.concat([Buffer.from(`---\n${JSON.stringify(data, null, 2)}\n---\n`, "utf8"), body]);
}

// --- pipeline files -------------------------------------------------------------

const INTENT = "0-intent/intent.md";
// The phases with an artifact, in order: its path, the token a thread names it by, its owner, and its upstream artifacts.
export const PHASES = [
  { n: 1, folder: "1-spec", artifact: "1-spec/spec.md", token: "spec", owner: "spec-producer", upstream: [INTENT], lanes: true },
  { n: 2, folder: "2-design-doc", artifact: "2-design-doc/design-doc.md", token: "design-doc", owner: "design-doc-producer", upstream: ["1-spec/spec.md"], lanes: true },
  { n: 3, folder: "3-implementation", artifact: "3-implementation/notes.md", token: "implementation", owner: "implementer", upstream: ["1-spec/spec.md", "2-design-doc/design-doc.md"] },
];
const IMPLEMENTATION = PHASES[2];
const REVIEW_PHASE = 4;
// The artifacts a thread names, each with the role that owns it; `owner` is the person.
const OWNERS = { intent: "owner", ...Object.fromEntries(PHASES.map((phase) => [phase.token, phase.owner])) };
const LANE_PROFILES = ["spec-producer", "design-doc-producer", "reviewer"];
const LANE_ID = /^[a-z0-9][a-z0-9-]*$/;
const LATER_INPUT = /^0-intent\/(?:constraint|proposal|failure)-[1-9]\d*\.md$/;
const THREAD = /^threads\/[^/]+\.md$/;

// What a pipeline-relative path is: run-config, the intent, a later input, an artifact, a lane candidate, a thread, or nothing.
export function kindOf(rel) {
  if (rel === "run-config.md") return { kind: "config" };
  if (rel === INTENT) return { kind: "intent" };
  if (LATER_INPUT.test(rel)) return { kind: "later" };
  if (THREAD.test(rel)) return { kind: "thread" };
  for (const phase of PHASES) {
    if (rel === phase.artifact) return { kind: "artifact", phase };
    const prefix = `${phase.folder}/lanes/`, name = `/${basename(phase.artifact)}`;
    if (phase.lanes && rel.startsWith(prefix) && rel.endsWith(name)) {
      const lane = rel.slice(prefix.length, -name.length);
      if (!lane.includes("/")) return { kind: "candidate", phase, lane };
    }
  }
  return null;
}
// The folders that can hold pipeline files.
const holdsFiles = (rel) => rel === "" || rel === "threads" || rel === "0-intent" || PHASES.some((phase) =>
  rel === phase.folder || (phase.lanes && (rel === `${phase.folder}/lanes` || new RegExp(`^${phase.folder}/lanes/[^/]+$`).test(rel))));
// What a pin may name: the intent, a later input, an artifact, or a lane candidate.
const pinnable = (rel) => ["intent", "later", "artifact", "candidate"].includes(kindOf(rel)?.kind);
// What carries `inputs`: an artifact or a lane candidate.
const pins = (kind) => ["artifact", "candidate"].includes(kind?.kind);

// The pipeline's files, by pipeline-relative path, from the working tree.
function readWorktree(root, folder) {
  const base = join(root, folder);
  if (!existsSync(base) || !lstatSync(base).isDirectory()) fail(`cannot read ${folder}: not a folder in the working tree`);
  const files = new Map();
  const visit = (rel) => {
    for (const name of readdirSync(join(base, rel)).sort()) {
      const child = rel ? `${rel}/${name}` : name;
      const stat = lstatSync(join(base, child));
      if (holdsFiles(child) && !stat.isDirectory()) fail(`cannot read ${folder}/${child}: not a folder`);
      if (stat.isDirectory()) { if (holdsFiles(child)) visit(child); }
      else if (kindOf(child)) {
        if (!stat.isFile()) fail(`cannot read ${folder}/${child}: not a regular file`);
        files.set(child, readFileSync(join(base, child)));
      }
    }
  };
  visit("");
  return files;
}

// The pipeline's files, by pipeline-relative path, from a commit.
async function readCommit(root, commit, folder) {
  const entries = lsTree(root, commit, `${folder}/`, true);
  if (!entries.length) fail(`cannot read ${commit}:${folder}: no such folder`);
  const wanted = [];
  for (const entry of entries) {
    const rel = entry.path.slice(folder.length + 1);
    if (holdsFiles(rel)) fail(`cannot read ${commit}:${entry.path}: not a folder`);
    if (!kindOf(rel)) continue;
    if (!["100644", "100755"].includes(entry.mode)) fail(`cannot read ${commit}:${entry.path}: not a regular file`);
    wanted.push({ rel, oid: entry.oid });
  }
  const contents = await readObjects(root, wanted.map((entry) => entry.oid));
  return new Map(wanted.map((entry, i) => [entry.rel, contents[i]]));
}

// --- parsing ----------------------------------------------------------------------

// run-config.md: target phase, base, and lanes. Its body is ignored.
export function parseConfig(bytes) {
  const { data, stamped } = frontmatterOf(bytes);
  if (!stamped) invalid("no frontmatter");
  onlyKeys(data, ["target-phase", "base", "lanes"]);
  const targetPhase = data["target-phase"];
  if (!Number.isInteger(targetPhase) || targetPhase < 1 || targetPhase > REVIEW_PHASE) invalid("target-phase must be an integer from 1 to 4");
  if (typeof data.base !== "string" || !data.base.trim()) invalid("base must be a branch name");
  const lanes = data.lanes ?? [];
  if (!Array.isArray(lanes) || ("lanes" in data && !lanes.length)) invalid("lanes must be a non-empty list");
  const seen = new Set();
  for (const lane of lanes) {
    if (lane === null || typeof lane !== "object" || Array.isArray(lane)) invalid("a lane must be an object");
    for (const key of Object.keys(lane)) if (!["profile", "id", "brief"].includes(key)) invalid(`unexpected lane key: ${key}`);
    if (!LANE_PROFILES.includes(lane.profile)) invalid(`lane profile must be one of ${LANE_PROFILES.join(", ")}`);
    if (typeof lane.id !== "string" || !LANE_ID.test(lane.id)) invalid(`lane id must match ${LANE_ID.source}`);
    if (typeof lane.brief !== "string" || !lane.brief.trim()) invalid(`lane ${lane.id} needs a brief`);
    const key = `${lane.profile}/${lane.id}`;
    if (seen.has(key)) invalid(`duplicate lane: ${key}`);
    seen.add(key);
  }
  return { targetPhase, base: data.base, lanes };
}

// The production lanes configured for a phase.
const productionLanes = (config, phase) => phase.lanes ? config.lanes.filter((lane) => lane.profile === phase.owner) : [];
// The review lanes: the configured ones, or one lane `default`.
export function reviewLanes(config) {
  const lanes = config.lanes.filter((lane) => lane.profile === "reviewer");
  return lanes.length ? lanes : [{ profile: "reviewer", id: "default" }];
}
const reviewer = (lane) => `reviewer-${lane.id}`;

// `inputs`: a list of `<path>@<identity>`, one per pinned file.
function parseInputs(value) {
  if (value === undefined) return new Map();
  if (!Array.isArray(value)) invalid("inputs must be a list");
  const inputs = new Map();
  for (const entry of value) {
    const match = typeof entry === "string" && entry.match(/^(.+)@([0-9a-f]{12})$/);
    if (!match) invalid(`inputs entry must be <path>@<identity>: ${JSON.stringify(entry)}`);
    if (!pinnable(match[1])) invalid(`inputs entry names no pipeline artifact: ${match[1]}`);
    if (inputs.has(match[1])) invalid(`inputs pins ${match[1]} twice`);
    inputs.set(match[1], match[2]);
  }
  return inputs;
}

// A later input's `target:` line: the artifacts it targets.
export function parseTargets(body) {
  const line = body.match(/^target:[\t ]*(.*?)[\t ]*\r?$/m);
  if (!line) invalid("later input has no target: line");
  const targets = line[1].split(",").map((item) => item.trim().replace(/#.*$/, ""));
  for (const target of targets)
    if (!PHASES.some((phase) => phase.artifact === target)) invalid(`target must name ${PHASES.map((phase) => phase.artifact).join(", ")}: ${target || "(empty)"}`);
  return [...new Set(targets)];
}

const STATUSES = ["open", "closed: approved", "closed: withdrawn", "closed: answered", "disagreement"];
// The statuses of a thread addressed to the person: opened as `disagreement`, closed `closed: answered`.
const OWNER_STATUSES = ["disagreement", "closed: answered"];
const MESSAGE = /^## (\S+) — ([0-9a-f]{7,64})$/;

// A review thread: one a review lane opens to the implementer about the implementation.
export const isReview = (thread) => thread.opener.startsWith("reviewer-") && thread.owner === IMPLEMENTATION.owner;

// A thread: its header (the first four lines of its body) and its messages, or Invalid.
// `reviewers` are the roles of the configured review lanes.
export function parseThread(name, body, reviewers) {
  const number = name.match(/^([1-9]\d*)-.+\.md$/)?.[1];
  if (!number) invalid("thread file name must be <n>-<opener>-<owner>-<artifact>.md");
  const lines = body.split("\n").map((line) => line.replace(/\r$/, ""));
  const header = {};
  ["status", "opener", "owner", "artifact"].forEach((key, at) => {
    const match = lines[at]?.match(/^([a-z]+): (.*\S)$/);
    if (match?.[1] !== key) invalid(`thread header line ${at + 1} must be ${key}: <value>`);
    header[key] = match[2];
  });
  const thread = { number: Number(number), ...header };
  if (lines[4] !== undefined && lines[4] !== "") invalid(`thread header must end with a blank line, got: ${lines[4]}`);
  if (!STATUSES.includes(thread.status)) invalid(`status must be one of ${STATUSES.join(" | ")}`);
  if (!Object.hasOwn(OWNERS, thread.artifact)) invalid(`artifact must be one of ${Object.keys(OWNERS).join(", ")}`);
  if (OWNERS[thread.artifact] !== thread.owner) invalid(`owner of ${thread.artifact} is ${OWNERS[thread.artifact]}`);
  const roles = [...new Set(Object.values(OWNERS).filter((role) => role !== "owner")), ...reviewers];
  if (!roles.includes(thread.opener)) invalid(`opener must be one of ${roles.join(", ")}`);
  if (thread.opener === thread.owner) invalid("opener and owner must differ");
  if ((thread.owner === "owner") !== OWNER_STATUSES.includes(thread.status))
    invalid(`${OWNER_STATUSES.join(" and ")} are the statuses of a thread to owner, and only of it`);
  if (name !== `${number}-${thread.opener}-${thread.owner}-${thread.artifact}.md`) invalid(`thread file name must be ${number}-${thread.opener}-${thread.owner}-${thread.artifact}.md`);
  thread.messages = [];
  let fence = null;
  for (const line of lines.slice(4)) {
    const marker = line.match(/^(`{3,}|~{3,})/)?.[1];
    if (marker && (!fence || (marker[0] === fence[0] && marker.length >= fence.length))) { fence = fence ? null : marker; continue; }
    if (fence || !line.startsWith("## ")) continue;
    const match = line.match(MESSAGE);
    if (!match) invalid(`message heading must be ## <role> — <commit>: ${line}`);
    if (![thread.opener, thread.owner, "owner"].includes(match[1])) invalid(`message author must be the opener, the owner, or owner: ${match[1]}`);
    thread.messages.push({ author: match[1], commit: match[2] });
  }
  if (!thread.messages.length) invalid("thread has no message");
  if (thread.messages[0].author !== thread.opener) invalid("the first message must be the opener's");
  return thread;
}

// Every file of a pipeline, parsed. A malformed file is collected as invalid, never computed from;
// a missing or invalid run-config.md, or a missing intent, stops the command.
export function readState(files) {
  if (!files.has("run-config.md")) fail("cannot read run-config.md: missing");
  if (!files.has(INTENT)) fail(`cannot read ${INTENT}: missing`);
  const config = parseOrFail("run-config.md", () => parseConfig(files.get("run-config.md")));
  const reviewers = reviewLanes(config).map(reviewer);
  const state = { config, docs: new Map(), threads: [], invalid: [] };
  for (const [path, bytes] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const kind = kindOf(path);
    if (kind.kind === "config") continue;
    try {
      const { data, body, stamped } = frontmatterOf(bytes);
      const text = body.toString("utf8");
      if (kind.kind === "thread") {
        onlyKeys(data, ["reviewed"]);
        const thread = { path, ...parseThread(path.slice("threads/".length), text, reviewers) };
        const approval = isReview(thread) && thread.status === "closed: approved";
        if ("reviewed" in data && (typeof data.reviewed !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(data.reviewed))) invalid("reviewed must be a patch id");
        if ("reviewed" in data && !approval) invalid("reviewed is recorded only on a review thread closed: approved");
        if (approval && !("reviewed" in data)) invalid("a review thread closed: approved needs reviewed: stamp it with --reviewed");
        state.threads.push({ ...thread, reviewed: data.reviewed ?? null });
        continue;
      }
      if (!pins(kind) && stamped) invalid("carries no frontmatter");
      onlyKeys(data, ["inputs"]);
      if (kind.kind === "candidate" && !productionLanes(config, kind.phase).some((lane) => lane.id === kind.lane))
        invalid(`production lane is not configured: ${kind.phase.owner} ${kind.lane}`);
      state.docs.set(path, { ...kind, path, identity: identity(bytes), inputs: parseInputs(data.inputs), body: text, targets: kind.kind === "later" ? parseTargets(text) : [] });
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      state.invalid.push({ path, reason: error.message });
    }
  }
  return state;
}
function parseOrFail(path, parse) {
  try { return parse(); } catch (error) { if (error instanceof Invalid) fail(`${path}: ${error.message}`); throw error; }
}

// --- state ------------------------------------------------------------------------

// The inputs a phase's artifact and its candidates must pin: its upstream artifacts and every later input that targets it.
export function requiredInputs(state, phase) {
  const later = [...state.docs.values()].filter((doc) => doc.kind === "later" && doc.targets.includes(phase.artifact)).map((doc) => doc.path);
  return [...phase.upstream, ...later];
}

// The required inputs of a file that are unpinned, or pinned at an identity that differs from the current one.
export function staleInputs(state, path) {
  const doc = state.docs.get(path);
  return requiredInputs(state, doc.phase).filter((input) => !doc.inputs.has(input) || doc.inputs.get(input) !== state.docs.get(input)?.identity);
}

// The implementation is done when the first line of `notes.md`'s body is `status: done`.
const implementationDone = (state) => /^status: done\r?$/.test(state.docs.get(IMPLEMENTATION.artifact)?.body.split("\n")[0] ?? "");

// A file's status: missing, stale (with the changed inputs), or fresh. `notes.md` is missing until it is done.
function statusOf(state, path) {
  if (!state.docs.has(path) || (path === IMPLEMENTATION.artifact && !implementationDone(state))) return { state: "missing" };
  const stale = staleInputs(state, path);
  return stale.length ? { state: "stale", stale } : { state: "fresh" };
}

// The role an `open` thread awaits: its opener when its owner wrote the last message, its owner otherwise.
export function awaitedRole(thread) {
  if (thread.status !== "open") return null;
  return thread.messages.at(-1).author === thread.owner ? thread.opener : thread.owner;
}
const awaiting = (state, role) => state.threads.filter((thread) => awaitedRole(thread) === role).map((thread) => thread.path);

// A review lane is approved when its highest-numbered review thread is closed approved at the current net change.
function approved(state, lane) {
  const latest = state.threads.filter((thread) => isReview(thread) && thread.opener === reviewer(lane)).sort((a, b) => b.number - a.number)[0];
  return latest?.status === "closed: approved" && latest.reviewed === state.netChange;
}

// The net change: the patch id of the diff from the merge-base with the base to the tip, outside the pipelines folder root.
// An empty diff has the all-zero id.
export function netChange(root, base, tip, pipelinesRoot) {
  const baseCommit = requireCommit(root, base, "base");
  if (!gitText(root, ["merge-base", "--all", baseCommit, tip])) fail(`no merge-base between ${base} and ${tip}`);
  const diff = gitBytes(root, ["diff", "--binary", "--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--src-prefix=a/", "--dst-prefix=b/",
    `${baseCommit}...${tip}`, "--", ".", `:(top,exclude,literal)${pipelinesRoot}`]);
  if (!diff.length) return "0".repeat(40);
  const id = gitText(root, ["patch-id", "--stable"], diff).split(/\s+/)[0];
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(id)) fail("git patch-id produced no id");
  return id;
}

const candidateOf = (phase, lane) => `${phase.folder}/lanes/${lane.id}/${basename(phase.artifact)}`;
// A phase's candidates matter while its root is missing.
const lanesOpen = (state, phase) => statusOf(state, phase.artifact).state === "missing" ? productionLanes(state.config, phase) : [];

// The actions for a phase whose role has work, or null: lanes then consolidate, produce, or respond.
function phaseActions(state, phase) {
  const threads = awaiting(state, phase.owner);
  const status = statusOf(state, phase.artifact);
  if (status.state === "missing") {
    const lanes = lanesOpen(state, phase);
    if (!lanes.length) return [{ action: "produce", target: phase.artifact, threads }];
    const pending = lanes.map((lane) => ({ lane, ...statusOf(state, candidateOf(phase, lane)) })).filter((entry) => entry.state !== "fresh");
    return pending.length
      ? pending.map(({ lane, stale }) => ({ action: "lane", target: phase.artifact, lane: lane.id, ...(stale ? { changed: stale } : {}) }))
      : [{ action: "consolidate", target: phase.artifact, threads }];
  }
  if (status.state === "stale" || threads.length) return [{ action: "respond", target: phase.artifact, threads, ...(status.stale ? { changed: status.stale } : {}) }];
  return null;
}

// The review lanes with work: not approved, or with a thread awaiting their reviewer.
function reviewActions(state) {
  const actions = reviewLanes(state.config).map((lane) => ({ lane, threads: awaiting(state, reviewer(lane)) }))
    .filter(({ lane, threads }) => !approved(state, lane) || threads.length)
    .map(({ lane, threads }) => ({ action: "review", target: lane.id, threads }));
  return actions.length ? actions : null;
}

// The frontier: every action of the first rule that holds.
export function frontier(state) {
  if (state.invalid.length) return state.invalid.map(({ path, reason }) => ({ action: "INVALID", target: path, reason }));
  const escalations = state.threads.filter((thread) => thread.status === "disagreement");
  if (escalations.length) return escalations.map((thread) => ({ action: "escalate", target: thread.path }));
  for (const phase of PHASES.filter((phase) => phase.n <= state.config.targetPhase)) {
    const actions = phaseActions(state, phase);
    if (actions) return actions;
  }
  return (state.config.targetPhase === REVIEW_PHASE && reviewActions(state)) || [{ action: "complete" }];
}

// --- check ------------------------------------------------------------------------

async function cmdCheck(args) {
  const { root, rel } = locate(args._[0] ?? fail("check: missing <pipeline folder>"));
  const { pipelinesRoot, folder, inner } = pipelineOf(root, rel, "check");
  if (inner) fail(`check: not a pipeline folder: ${rel}`);
  const tip = args.ref ? requireCommit(root, args.ref, "--ref") : requireCommit(root, "HEAD", "HEAD");
  const state = readState(args.ref ? await readCommit(root, tip, folder) : readWorktree(root, folder));
  const target = state.config.targetPhase;
  if (target === REVIEW_PHASE) state.netChange = netChange(root, state.config.base, tip, pipelinesRoot);
  const report = { pipeline: folder, tip, targetPhase: target, frontier: frontier(state) };
  if (!state.invalid.length) {
    report.phases = PHASES.filter((phase) => phase.n <= target).map((phase) => ({
      phase: phase.folder,
      artifact: phase.artifact,
      ...statusOf(state, phase.artifact),
      lanes: lanesOpen(state, phase).map((lane) => ({ id: lane.id, path: candidateOf(phase, lane), ...statusOf(state, candidateOf(phase, lane)) })),
    }));
    if (target === REVIEW_PHASE) {
      report.netChange = state.netChange;
      report.reviews = reviewLanes(state.config).map((lane) => ({ lane: lane.id, approved: approved(state, lane) }));
    }
    report.threads = state.threads.map((thread) => ({ path: thread.path, status: thread.status, opener: thread.opener, owner: thread.owner,
      artifact: thread.artifact, awaits: awaitedRole(thread), reviewed: thread.reviewed }));
  }
  if (args.json) return process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const lines = report.frontier.map((entry) => `frontier ${[entry.action, entry.target, entry.lane].filter(Boolean).join(" ")}${entry.reason ? `: ${entry.reason}` : ""}`);
  const status = (entry) => entry.state === "stale" ? `stale ${entry.stale.join(" ")}` : entry.state;
  for (const phase of report.phases ?? []) {
    for (const lane of phase.lanes) lines.push(`lane ${phase.artifact} ${lane.id} ${status(lane)}`);
    lines.push(`artifact ${phase.artifact} ${status(phase)}`);
  }
  if (report.netChange) lines.push(`net-change ${report.netChange}`);
  for (const review of report.reviews ?? []) lines.push(`review ${review.lane} ${review.approved ? "approved" : "unapproved"}`);
  for (const thread of report.threads ?? []) lines.push(`thread ${thread.path} ${thread.status}${thread.awaits ? ` awaits ${thread.awaits}` : ""}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

// --- stamp ------------------------------------------------------------------------

function cmdStamp(args) {
  const { root, rel } = locate(args._[0] ?? fail("stamp: missing <file>"));
  const { pipelinesRoot, folder, inner } = pipelineOf(root, rel, "stamp");
  const kind = kindOf(inner);
  if (!pins(kind) && kind?.kind !== "thread") fail(`stamp: not an artifact or thread: ${rel}`);
  if (!args.pin.length && !args.reviewed) fail("stamp: nothing to stamp: pass --pin or --reviewed");
  const read = (path) => {
    const abs = join(root, path);
    if (!existsSync(abs) || !lstatSync(abs).isFile()) fail(`stamp: cannot read ${path}: not a regular file`);
    return readFileSync(abs);
  };
  const parsed = (path, parse) => parseOrFail(`stamp: ${path}`, parse);
  const bytes = read(rel);
  const { data, body } = parsed(rel, () => frontmatterOf(bytes));
  if (args.pin.length) {
    if (!pins(kind)) fail(`stamp: --pin applies to an artifact: ${rel}`);
    const inputs = new Map();
    for (const pin of args.pin) {
      const located = locate(pin);
      if (located.root !== root) fail(`stamp: --pin outside the repository: ${pin}`);
      if (!located.rel.startsWith(`${folder}/`)) fail(`stamp: --pin outside the pipeline folder ${folder}: ${pin}`);
      const path = located.rel.slice(folder.length + 1);
      if (!pinnable(path)) fail(`stamp: --pin names no pipeline artifact: ${pin}`);
      if (inputs.has(path)) fail(`stamp: --pin names ${path} twice`);
      const pinned = read(located.rel);
      parsed(located.rel, () => frontmatterOf(pinned));
      inputs.set(path, identity(pinned));
    }
    data.inputs = [...inputs].sort(([a], [b]) => a < b ? -1 : 1).map(([path, id]) => `${path}@${id}`);
  }
  if (args.reviewed) {
    if (kind.kind !== "thread") fail(`stamp: --reviewed applies to a thread: ${rel}`);
    const configPath = `${folder}/run-config.md`;
    const config = parsed(configPath, () => parseConfig(read(configPath)));
    const thread = parsed(rel, () => parseThread(basename(inner), body.toString("utf8"), reviewLanes(config).map(reviewer)));
    if (!isReview(thread) || thread.status !== "closed: approved") fail(`stamp: --reviewed applies to a review thread closed: approved: ${rel}`);
    const commit = requireCommit(root, thread.messages.at(-1).commit, "the last message's commit");
    data.reviewed = netChange(root, config.base, commit, pipelinesRoot);
  }
  const stamped = renderFrontmatter(data, body);
  if (!stamped.equals(bytes)) writeFileSync(join(root, rel), stamped);
}

// --- pipelines --------------------------------------------------------------------

// The origin lines that open an intent's body.
export function originsOf(body) {
  const origins = [];
  for (const line of body.split("\n")) {
    const match = line.replace(/\r$/, "").match(/^origin:[\t ]*(.*\S)[\t ]*$/);
    if (!match) break;
    origins.push(match[1]);
  }
  return origins;
}

// Every live pipeline folder at a branch tip, and every merged one in a base branch's tree, optionally filtered by issue.
async function cmdPipelines(args) {
  const { root } = locate(args._[0] ?? fail("pipelines: missing <repo path>"));
  const pipelinesRoot = pipelinesFolderRoot(root);
  const refs = gitText(root, ["for-each-ref", "--format=%(objectname) %(objecttype) %(symref) %(refname)", "refs/heads", "refs/remotes"])
    .split("\n").filter(Boolean).map((line) => line.split(" ")).filter(([, type, symref]) => type === "commit" && !symref)
    .map(([commit, , , refname]) => ({ commit, name: refname.replace(/^refs\/(?:heads|remotes)\//, "") }));
  // Pipeline folders at each tip, with the files discovery reads.
  const found = [];
  for (const ref of refs)
    for (const entry of lsTree(root, ref.commit, `${pipelinesRoot}/`, false))
      if (entry.type === "tree") found.push({ ref, folder: entry.path, tree: entry.oid });
  const files = await readObjects(root, found.flatMap(({ tree }) => [`${tree}:run-config.md`, `${tree}:0-intent/intent.md`]));
  const parse = (where, parser) => parseOrFail(`pipelines: ${where}`, parser);
  const history = new Map();
  // Every tree id a folder had in a base branch's history.
  const treesInHistory = async (base, folder) => {
    const key = `${base}\0${folder}`;
    if (!history.has(key)) {
      const commits = gitText(root, ["log", "--full-history", "--format=%H", base, "--", `:(top,literal)${folder}`]).split("\n").filter(Boolean);
      const trees = gitText(root, ["cat-file", "--batch-check"], [base, ...commits].map((commit) => `${commit}:${folder}\n`).join(""))
        .split("\n").map((line) => line.match(/^([0-9a-f]{40}|[0-9a-f]{64}) tree /)?.[1]).filter(Boolean);
      history.set(key, new Set(trees));
    }
    return history.get(key);
  };
  const pipelines = new Map();
  for (const [i, { ref, folder, tree }] of found.entries()) {
    const [config, intent] = [files[2 * i], files[2 * i + 1]];
    if (!config) fail(`pipelines: cannot read ${ref.name}:${folder}/run-config.md`);
    const { base } = parse(`${ref.name}:${folder}/run-config.md`, () => parseConfig(config));
    const baseCommit = requireCommit(root, base, `base of ${ref.name}:${folder}`);
    if (!(await treesInHistory(baseCommit, folder)).has(tree)) {
      if (!intent) fail(`pipelines: cannot read ${ref.name}:${folder}/0-intent/intent.md`);
      pipelines.set(`${ref.name}\0${folder}`, { state: "live", ref: ref.name, commit: ref.commit, folder, origins: originsOf(parse(`${ref.name}:${folder}/0-intent/intent.md`, () => frontmatterOf(intent)).body.toString("utf8")) });
    } else if (!pipelines.has(`${base}\0${folder}`)) {
      const [merged] = await readObjects(root, [`${baseCommit}:${folder}/0-intent/intent.md`]);
      if (merged) pipelines.set(`${base}\0${folder}`, { state: "merged", ref: base, commit: baseCommit, folder, origins: originsOf(parse(`${base}:${folder}/0-intent/intent.md`, () => frontmatterOf(merged)).body.toString("utf8")) });
    }
  }
  const result = [...pipelines.values()].filter((pipeline) => args.issue === null || pipeline.origins.includes(`issue ${args.issue}`))
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.state.localeCompare(b.state) || a.ref.localeCompare(b.ref));
  if (args.json) return process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.length) process.stdout.write(`${result.map((pipeline) => `${pipeline.state} ${pipeline.ref} ${pipeline.folder}`).join("\n")}\n`);
}

// --- cli --------------------------------------------------------------------------

const COMMANDS = {
  check: { run: cmdCheck, options: { "--ref": "value", "--json": "flag" } },
  stamp: { run: cmdStamp, options: { "--pin": "list", "--reviewed": "flag" } },
  pipelines: { run: cmdPipelines, options: { "--issue": "value", "--json": "flag" } },
};

export function parseArgs(command, argv) {
  const { options } = COMMANDS[command];
  const args = { _: [], pin: [], reviewed: false, json: false, ref: null, issue: null };
  const used = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { args._.push(arg); continue; }
    const type = options[arg] ?? fail(`${command}: unknown option: ${arg}`);
    if (type !== "list" && used.has(arg)) fail(`${command}: ${arg} may appear only once`);
    used.add(arg);
    const key = arg.slice(2);
    if (type === "flag") { args[key] = true; continue; }
    const value = i + 1 < argv.length ? argv[++i] : fail(`${command}: ${arg} expects a value`);
    if (type === "list") args[key].push(value); else args[key] = value;
  }
  if (args._.length > 1) fail(`${command}: unexpected argument: ${args._[1]}`);
  return args;
}

const USAGE = `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed]
  node rp.mjs pipelines <repo path> [--issue <ref>] [--json]

See README.md beside this script.
`;

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (!command || command === "--help" || command === "-h") process.stdout.write(USAGE);
    else if (!Object.hasOwn(COMMANDS, command)) fail(`unknown command: ${command}`);
    else await COMMANDS[command].run(parseArgs(command, rest));
  } catch (error) {
    if (!(error instanceof RpError)) throw error;
    process.stderr.write(`rp: ${error.message}\n`);
    process.exitCode = 1;
  }
}
