#!/usr/bin/env node
// rp — state tooling for Radical Pipelines. Zero dependencies: everything it computes can be done with bare git.
// Commands: check, stamp, pipelines, review. README.md beside this file is the contract.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, lstatSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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
// A name is an object id or `<tree-ish>:<path>`; an object of a type outside `types` stops the command.
async function readObjects(root, names, types = ["blob"]) {
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
      if (!types.includes(metadata[2])) throw new Error(`not a ${types.join(" or ")}: ${metadata[2]}`);
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

// A raw tree object's entries: mode, name, and object id; `hexLength` is the repository's object id length.
function treeEntries(bytes, hexLength) {
  const entries = [];
  for (let at = 0; at < bytes.length;) {
    const space = bytes.indexOf(32, at), nul = bytes.indexOf(0, space);
    if (space === -1 || nul === -1 || nul + 1 + hexLength / 2 > bytes.length) fail("cannot read a tree object: truncated entry");
    entries.push({ mode: bytes.subarray(at, space).toString("ascii").padStart(6, "0"), name: bytes.subarray(space + 1, nul).toString("utf8"),
      oid: bytes.subarray(nul + 1, nul + 1 + hexLength / 2).toString("hex") });
    at = nul + 1 + hexLength / 2;
  }
  return entries;
}
// Each tree's entries by name, read through one batch; a missing tree has none.
async function readTrees(root, oids) {
  const distinct = [...new Set(oids)];
  const contents = await readObjects(root, distinct, ["tree"]);
  return new Map(distinct.map((oid, i) => [oid, new Map(contents[i] ? treeEntries(contents[i], oid.length).map((entry) => [entry.name, entry]) : [])]));
}
const REGULAR = ["100644", "100755"];

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

// A pipeline folder is `<pipelines folder root>/<pipeline slug>`: its parent is the pipelines folder root.
function pipelineFolder(folder, command) {
  const at = folder.lastIndexOf("/");
  if (at <= 0) fail(`${command}: a pipeline folder is <pipelines folder root>/<pipeline slug>: ${folder || "."}`);
  return { folder, pipelinesRoot: folder.slice(0, at) };
}
// A pipeline file: the pipeline folder holding it and its path inside, the longest suffix that names a pipeline file.
function pipelineFileOf(rel, command) {
  const parts = rel.split("/");
  for (let length = parts.length - 1; length >= 1; length--) {
    const inner = parts.slice(-length).join("/");
    if (kindOf(inner)) return { ...pipelineFolder(parts.slice(0, -length).join("/"), command), inner };
  }
  fail(`${command}: not a pipeline file: ${rel}`);
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
// The artifacts a thread names, each with the profile of the role that owns it; `owner` is the person.
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
      if (holdsFiles(child) && !stat.isDirectory()) fail(`cannot read ${folder}/${child}: a file where a folder belongs`);
      if (kindOf(child) && stat.isDirectory()) fail(`cannot read ${folder}/${child}: a folder where a pipeline file belongs`);
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

// The pipeline's files, by pipeline-relative path, from a commit. `reads`, when given, narrows them to the files an
// operation reads: only those, and the paths that hold them, are validated.
async function readCommit(root, commit, folder, reads = null) {
  const entries = lsTree(root, commit, `${folder}/`, true);
  if (!entries.length) fail(`cannot read ${commit}:${folder}: no such folder`);
  const wanted = [];
  for (const entry of entries) {
    const rel = entry.path.slice(folder.length + 1);
    const read = (path) => Boolean(kindOf(path)) && (!reads || reads(path));
    if (!reads && holdsFiles(rel)) fail(`cannot read ${commit}:${entry.path}: a file where a folder belongs`);
    const parts = rel.split("/");
    for (let length = 1; length < parts.length; length++)
      if (read(parts.slice(0, length).join("/"))) fail(`cannot read ${commit}:${folder}/${parts.slice(0, length).join("/")}: a folder where a pipeline file belongs`);
    if (!read(rel)) continue;
    if (!["100644", "100755"].includes(entry.mode)) fail(`cannot read ${commit}:${entry.path}: not a regular file`);
    wanted.push({ rel, oid: entry.oid });
  }
  const contents = await readObjects(root, wanted.map((entry) => entry.oid));
  return new Map(wanted.map((entry, i) => [entry.rel, contents[i]]));
}

// --- parsing ----------------------------------------------------------------------

// The conventions format this script reads and writes.
export const FORMAT = 6;
// The format a pipeline was written under: the integer `format` in run-config.md's JSON frontmatter, else `earlier`
// (no run-config.md, no frontmatter, unreadable frontmatter, or no integer `format`). Nothing else is read.
export function formatOf(bytes) {
  if (!bytes) return "earlier";
  const { json } = splitFrontmatter(bytes);
  try { const format = JSON.parse(json ?? "null")?.format; return Number.isInteger(format) ? format : "earlier"; }
  catch { return "earlier"; }
}
// Stops unless a pipeline is of the current format; `path` names its run-config.md.
function requireFormat(bytes, path) {
  const format = formatOf(bytes);
  if (format === "earlier" || format < FORMAT) fail(`${path}: pipeline of an earlier format; it is not continued`);
  if (format > FORMAT) fail(`${path}: pipeline of a newer format ${format}; update the skill`);
}

// run-config.md: format, target phase, base, and lanes. Its body is ignored.
export function parseConfig(bytes) {
  const { data, stamped } = frontmatterOf(bytes);
  if (!stamped) invalid("no frontmatter");
  onlyKeys(data, ["format", "target-phase", "base", "lanes"]);
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
    if ("brief" in lane && (typeof lane.brief !== "string" || !lane.brief.trim())) invalid(`lane ${lane.id}: a brief must be a non-empty string`);
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

// A thread role, `<profile>[-<lane>]`: its profile and lane, or null when the grammar does not hold.
export function parseRole(role) {
  if (["owner", "implementer", "spec-producer", "design-doc-producer"].includes(role)) return { profile: role, lane: null };
  const match = role.match(/^(spec-producer|design-doc-producer|reviewer)-([a-z0-9][a-z0-9-]*)$/);
  return match ? { profile: match[1], lane: match[2] } : null;
}

// A production lane's role: one that may name a closed thread of an earlier run, never a live one.
const isProductionLane = (role) => { const parsed = parseRole(role); return parsed.lane !== null && parsed.profile !== "reviewer"; };
// A review thread: one a review lane opens to the implementer.
export const isReview = (thread) => parseRole(thread.opener).profile === "reviewer" && thread.owner === IMPLEMENTATION.owner;
// An approval: a review thread closed approved.
const isApproval = (thread) => isReview(thread) && thread.status === "closed: approved";

// A thread: its header (the first lines of its body: four, and `cites` on a thread to owner) and its messages, or Invalid.
export function parseThread(name, body) {
  const number = name.match(/^([1-9]\d*)-.+\.md$/)?.[1];
  if (!number) invalid("thread file name must be <n>-<opener>-<owner>-<artifact>.md");
  const lines = body.split("\n").map((line) => line.replace(/\r$/, ""));
  const header = {};
  // A thread to owner extends the header with `cites`: the iteration reads the line it appends.
  const keys = ["status", "opener", "owner", "artifact"];
  for (const [at, key] of keys.entries()) {
    const match = lines[at]?.match(/^([a-z]+): (.*\S)$/);
    if (match?.[1] !== key) invalid(`thread header line ${at + 1} must be ${key}: <value>${key === "cites" ? " on a thread to owner" : ""}`);
    header[key] = match[2];
    if (key === "artifact" && header.owner === "owner") keys.push("cites");
  }
  const thread = { number: Number(number), ...header };
  const end = keys.length;
  if (lines[end] !== undefined && lines[end] !== "") invalid(`thread header must end with a blank line, got: ${lines[end]}`);
  if (!STATUSES.includes(thread.status)) invalid(`status must be one of ${STATUSES.join(" | ")}`);
  if (!Object.hasOwn(OWNERS, thread.artifact)) invalid(`artifact must be one of ${Object.keys(OWNERS).join(", ")}`);
  for (const key of ["opener", "owner"]) if (!parseRole(thread[key])) invalid(`${key} must be a role <profile>[-<lane>]: ${thread[key]}`);
  if (parseRole(thread.owner).profile !== OWNERS[thread.artifact]) invalid(`owner of ${thread.artifact} is ${OWNERS[thread.artifact]}[-<lane>]`);
  if (thread.opener === "owner") invalid("owner opens no thread");
  if (thread.opener === thread.owner) invalid("opener and owner must differ");
  if ((thread.owner === "owner") !== OWNER_STATUSES.includes(thread.status))
    invalid(`${OWNER_STATUSES.join(" and ")} are the statuses of a thread to owner, and only of it`);
  if (["open", "disagreement"].includes(thread.status) && [thread.opener, thread.owner].some(isProductionLane)) invalid("production lanes open no threads");
  if (name !== `${number}-${thread.opener}-${thread.owner}-${thread.artifact}.md`) invalid(`thread file name must be ${number}-${thread.opener}-${thread.owner}-${thread.artifact}.md`);
  thread.messages = [];
  let fence = null;
  for (const line of lines.slice(end)) {
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
// `where` names the pipeline folder in messages.
export function readState(files, where) {
  requireFormat(files.get("run-config.md"), `${where}/run-config.md`);
  if (!files.has(INTENT)) fail(`cannot read ${where}/${INTENT}: missing`);
  const config = parseOrFail(`${where}/run-config.md`, () => parseConfig(files.get("run-config.md")));
  const state = { config, docs: new Map(), threads: [], invalid: [] };
  for (const [path, bytes] of [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const kind = kindOf(path);
    if (kind.kind === "config") continue;
    try {
      const { data, body, stamped } = frontmatterOf(bytes);
      const text = body.toString("utf8");
      if (kind.kind === "thread") {
        const thread = { path, kind: "thread", ...parseThread(path.slice("threads/".length), text) };
        if (isApproval(thread)) {
          onlyKeys(data, ["inputs", "reviewed"]);
          if (!("inputs" in data) || !("reviewed" in data)) invalid("a review thread closed: approved needs inputs and reviewed: stamp it");
          if (typeof data.reviewed !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(data.reviewed)) invalid("reviewed must be a full commit hash");
        } else if (stamped) invalid("carries no frontmatter: only a review thread closed: approved is stamped");
        const awaited = awaitedRole(thread) && parseRole(awaitedRole(thread));
        if (awaited?.lane && !reviewLanes(config).some((lane) => lane.id === awaited.lane)) invalid("lane not configured; close the thread withdrawn");
        state.threads.push({ ...thread, inputs: parseInputs(data.inputs), reviewed: data.reviewed ?? null });
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

// The required inputs of what carries `inputs`. An artifact: its phase's upstream artifacts and every later input that
// targets it. A candidate: its phase's upstream artifacts, what its lane reads; the later inputs targeting its root are
// the root's. An approval: the intent and every later input.
export function requiredInputs(state, subject) {
  const consumes = (doc) => subject.kind === "thread" || (subject.kind === "artifact" && doc.targets.includes(subject.phase.artifact));
  const later = [...state.docs.values()].filter((doc) => doc.kind === "later" && consumes(doc));
  return [...upstreamOf(subject), ...later.map((doc) => doc.path)];
}
// The upstream artifacts a subject pins, before later inputs.
const upstreamOf = (subject) => subject.kind === "thread" ? [INTENT] : subject.phase.upstream;

// The required inputs of a subject that are unpinned, or pinned at an identity that differs from the current one.
export function staleInputs(state, subject) {
  return requiredInputs(state, subject).filter((input) => !subject.inputs.has(input) || subject.inputs.get(input) !== state.docs.get(input)?.identity);
}

// The implementation is done when the first line of `notes.md`'s body is `status: done`.
const implementationDone = (state) => /^status: done\r?$/.test(state.docs.get(IMPLEMENTATION.artifact)?.body.split("\n")[0] ?? "");

// A file's status: missing, stale (with the changed inputs), or fresh. `notes.md` is missing until it is done.
function statusOf(state, path) {
  if (!state.docs.has(path) || (path === IMPLEMENTATION.artifact && !implementationDone(state))) return { state: "missing" };
  const stale = staleInputs(state, state.docs.get(path));
  return stale.length ? { state: "stale", stale } : { state: "fresh" };
}

// The role an `open` thread awaits: its opener when its owner wrote the last message, its owner otherwise.
export function awaitedRole(thread) {
  if (thread.status !== "open") return null;
  return thread.messages.at(-1).author === thread.owner ? thread.opener : thread.owner;
}
const awaiting = (state, role) => state.threads.filter((thread) => awaitedRole(thread) === role).map((thread) => thread.path);
// The review lanes that threads await.
const awaitedReviewLanes = (state) => [...new Set(state.threads.map(awaitedRole).filter(Boolean).map(parseRole)
  .filter((role) => role.profile === "reviewer").map((role) => role.lane))].sort();
const roleOf = (profile, laneId) => `${profile}-${laneId}`;

// A review lane's approval: its highest-numbered review thread, approved when closed approved and fresh. An approval is
// stale on a changed required input, or when the tip's code is not the approved commit's plus clean merges of the base.
function approvalOf(state, lane) {
  const latest = state.threads.filter((thread) => isReview(thread) && thread.opener === roleOf("reviewer", lane.id)).sort((a, b) => b.number - a.number)[0];
  if (latest?.status !== "closed: approved") return { approved: false };
  const stale = staleInputs(state, latest);
  const codeChanged = state.codeChanged(latest.reviewed);
  return { approved: !stale.length && !codeChanged, ...(stale.length ? { stale } : {}), ...(codeChanged ? { codeChanged } : {}) };
}

// The base: the merge-base of the tip with `run-config.md`'s base, the latest base the tip holds.
export function baseOf(root, base, tip) {
  const baseCommit = requireCommit(root, base, "base");
  return gitText(root, ["merge-base", baseCommit, tip]) || fail(`no merge-base between ${base} and ${tip}`);
}

// Whether the tip's code outside the pipelines folder root differs from the approved commit's merged with the base:
// a merge conflicting outside the pipelines folder root, or any difference there from the merged tree. The approved
// commit need not be on the pipeline branch: a review lane's change holds none of the pipelines folder root.
export function codeChanged(root, approved, base, tip, pipelinesRoot) {
  const commit = requireCommit(root, approved, "reviewed");
  if (commit === tip) return false;
  let merged;
  try { merged = execFileSync("git", ["merge-tree", "--write-tree", "-z", "--name-only", "--no-messages", commit, base], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (error) {
    if (error.status !== 1 || !/^[0-9a-f]{40,64}\0/.test(error.stdout ?? "")) fail(`git merge-tree --write-tree (Git 2.38 or later) ${commit} ${base}: ${error.stderr?.toString().trim() || error.message}`);
    merged = error.stdout;
  }
  const [tree, ...conflicted] = merged.split(/[\0\n]/).filter(Boolean);
  if (conflicted.some((path) => path !== pipelinesRoot && !path.startsWith(`${pipelinesRoot}/`))) return true;
  try { execFileSync("git", ["diff", "--quiet", "--no-ext-diff", tree, tip, "--", ".", `:(top,exclude,literal)${pipelinesRoot}`], { cwd: root, stdio: ["ignore", "ignore", "pipe"] }); }
  catch (error) {
    if (error.status === 1) return true;
    fail(`git diff ${tree} ${tip}: ${error.stderr?.toString().trim() || error.message}`);
  }
  return false;
}

const candidateOf = (phase, laneId) => `${phase.folder}/lanes/${laneId}/${basename(phase.artifact)}`;
// A phase's configured candidates matter while its root is missing.
const lanesOpen = (state, phase) => statusOf(state, phase.artifact).state === "missing" ? productionLanes(state.config, phase) : [];

// The actions for a phase whose roles have work, or null. Threads awaiting a role are work in any phase; a missing or stale
// artifact only through the target. A lane's work is its candidate missing or stale while the root is missing; the root's
// is consolidate, produce, or respond.
function phaseActions(state, phase) {
  const inTarget = phase.n <= state.config.targetPhase;
  const status = statusOf(state, phase.artifact);
  const lanes = inTarget ? lanesOpen(state, phase) : [];
  const actions = lanes.map((lane) => ({ lane, status: statusOf(state, candidateOf(phase, lane.id)) })).filter((entry) => entry.status.state !== "fresh")
    .map(({ lane, status: candidate }) => ({ action: "lane", target: phase.artifact, lane: lane.id, ...(candidate.stale ? { changed: candidate.stale } : {}) }));
  const threads = awaiting(state, phase.owner);
  if (inTarget && status.state === "missing") {
    if (!lanes.length) actions.push({ action: "produce", target: phase.artifact, threads });
    else if (!actions.length) actions.push({ action: "consolidate", target: phase.artifact, threads });
  } else if ((inTarget && status.state === "stale") || threads.length)
    actions.push({ action: "respond", target: phase.artifact, threads, ...(inTarget && status.stale ? { changed: status.stale } : {}) });
  return actions.length ? actions : null;
}

// The review lanes with work: through the target, each configured lane not approved; in any phase, each lane a thread awaits.
function reviewActions(state) {
  const lanes = [...(state.config.targetPhase === REVIEW_PHASE ? reviewLanes(state.config) : []).map((lane) => ({ lane, ...approvalOf(state, lane) }))
    .filter((entry) => !entry.approved).map((entry) => [entry.lane.id, entry.stale, entry.codeChanged]), ...awaitedReviewLanes(state).map((id) => [id])];
  const ids = lanes.filter(([id], at) => lanes.findIndex(([other]) => other === id) === at);
  const actions = ids.map(([id, stale, changed]) => ({ action: "review", target: id, threads: awaiting(state, roleOf("reviewer", id)), ...(stale ? { changed: stale } : {}), ...(changed ? { codeChanged: true } : {}) }));
  return actions.length ? actions : null;
}

// The frontier: every action of the first rule that holds.
export function frontier(state) {
  if (state.invalid.length) return state.invalid.map(({ path, reason }) => ({ action: "INVALID", target: path, reason }));
  const escalations = state.threads.filter((thread) => thread.status === "disagreement");
  if (escalations.length) return escalations.map((thread) => ({ action: "escalate", target: thread.path }));
  for (const phase of PHASES) {
    const actions = phaseActions(state, phase);
    if (actions) return actions;
  }
  return reviewActions(state) ?? [{ action: "complete" }];
}

// --- check ------------------------------------------------------------------------

async function cmdCheck(args) {
  const { root, rel } = locate(args._[0] ?? fail("check: missing <pipeline folder>"));
  const { folder, pipelinesRoot } = pipelineFolder(rel, "check");
  const tip = args.ref ? requireCommit(root, args.ref, "--ref") : requireCommit(root, "HEAD", "HEAD");
  const state = readState(args.ref ? await readCommit(root, tip, folder) : readWorktree(root, folder), args.ref ? `${args.ref}:${folder}` : folder);
  const target = state.config.targetPhase;
  const base = target === REVIEW_PHASE ? baseOf(root, state.config.base, tip) : null;
  const judged = new Map();
  state.codeChanged = (approved) => {
    if (!judged.has(approved)) judged.set(approved, codeChanged(root, approved, base, tip, pipelinesRoot));
    return judged.get(approved);
  };
  const report = { pipeline: folder, tip, targetPhase: target, frontier: frontier(state) };
  if (!state.invalid.length) {
    report.phases = PHASES.filter((phase) => phase.n <= target).map((phase) => ({
      phase: phase.folder,
      artifact: phase.artifact,
      ...statusOf(state, phase.artifact),
      lanes: lanesOpen(state, phase).map((lane) => ({ id: lane.id, path: candidateOf(phase, lane.id), ...statusOf(state, candidateOf(phase, lane.id)) })),
    }));
    if (target === REVIEW_PHASE) {
      report.netChange = `${base}..${tip}`;
      report.reviews = reviewLanes(state.config).map((lane) => ({ lane: lane.id, ...approvalOf(state, lane) }));
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
  const approval = (review) => review.approved ? "approved" : review.stale || review.codeChanged ? ["stale", ...(review.stale ?? []), ...(review.codeChanged ? ["code"] : [])].join(" ") : "unapproved";
  for (const review of report.reviews ?? []) lines.push(`review ${review.lane} ${approval(review)}`);
  for (const thread of report.threads ?? []) lines.push(`thread ${thread.path} ${thread.status}${thread.awaits ? ` awaits ${thread.awaits}` : ""}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

// --- stamp ------------------------------------------------------------------------

// Pins a file's required inputs, derived from its kind, at their identities in the tree of the turn's commit `--at`.
// An artifact keeps the candidate pins it recorded, or records those `--pin` names; an approval also records the turn's
// commit as `reviewed`.
async function cmdStamp(args) {
  const { root, rel } = locate(args._[0] ?? fail("stamp: missing <file>"));
  const { folder, inner } = pipelineFileOf(rel, "stamp");
  const kind = kindOf(inner);
  if (!pins(kind) && kind.kind !== "thread") fail(`stamp: not an artifact or thread: ${rel}`);
  const commit = requireCommit(root, args.at ?? fail("stamp: --at <commit> names the turn's commit and is required"), "--at");
  const abs = join(root, rel);
  if (!existsSync(abs) || !lstatSync(abs).isFile()) fail(`stamp: cannot read ${rel}: not a regular file`);
  const bytes = readFileSync(abs);
  const { data, body } = parseOrFail(`stamp: ${rel}`, () => frontmatterOf(bytes));
  const subject = kind.kind === "thread" ? parseOrFail(`stamp: ${rel}`, () => ({ kind: "thread", ...parseThread(basename(inner), body.toString("utf8")) })) : kind;
  if (kind.kind === "thread" && !isApproval(subject)) fail(`stamp: ${rel}: only a review thread closed: approved is stamped`);
  parseOrFail(`stamp: ${rel}`, () => onlyKeys(data, kind.kind === "thread" ? ["inputs", "reviewed"] : ["inputs"]));
  const isCandidateOfRoot = (path) => kind.kind === "artifact" && kindOf(path)?.kind === "candidate" && kindOf(path).phase === kind.phase;
  if (args.pin.length && (kind.kind !== "artifact" || !kind.phase.lanes)) fail(`stamp: --pin applies to a spec or design doc: ${rel}`);
  // A `--pin` path is absolute or relative to the pipeline folder; it must be a file before it is classified.
  const pinned = args.pin.map((pin) => {
    const tried = isAbsolute(pin) ? pin : join(root, folder, pin);
    if (!existsSync(tried) || !statSync(tried).isFile()) fail(`stamp: cannot read --pin ${tried}: not a file`);
    const located = locate(tried);
    const path = located.root === root && located.rel.startsWith(`${folder}/`) ? located.rel.slice(folder.length + 1) : null;
    return path && isCandidateOfRoot(path) ? path : fail(`stamp: --pin must name a candidate of ${rel}: ${pin}`);
  });
  // What stamp reads at the turn's commit: the intent, every later input (its `target:` line says whether it applies),
  // the subject's upstream artifacts, and the candidates `--pin` names. The configuration is the working tree's, beside
  // the stamped file: a review lane's change holds none.
  const upstream = upstreamOf(subject);
  const reads = (path) => path === INTENT || kindOf(path).kind === "later" || upstream.includes(path) || pinned.includes(path);
  const files = await readCommit(root, commit, folder, reads);
  const config = join(root, folder, "run-config.md");
  if (!existsSync(config) || !lstatSync(config).isFile()) fail(`stamp: cannot read ${folder}/run-config.md: not a regular file in the working tree`);
  files.set("run-config.md", readFileSync(config));
  const state = readState(files, `${args.at}:${folder}`);
  if (state.invalid.length) fail(`stamp: ${commit}:${folder}/${state.invalid[0].path}: ${state.invalid[0].reason}`);
  if (kind.kind === "candidate" && !productionLanes(state.config, kind.phase).some((lane) => lane.id === kind.lane)) fail(`stamp: ${rel}: production lane is not configured: ${kind.phase.owner} ${kind.lane}`);
  const inputs = new Map();
  for (const path of [...requiredInputs(state, subject), ...pinned]) {
    if (!state.docs.has(path)) fail(`stamp: cannot pin ${commit}:${folder}/${path}: missing`);
    inputs.set(path, state.docs.get(path).identity);
  }
  if (!pinned.length) {
    const recorded = parseOrFail(`stamp: ${rel}`, () => parseInputs(data.inputs));
    for (const [path, id] of recorded) if (isCandidateOfRoot(path)) inputs.set(path, id);
  }
  data.inputs = [...inputs].sort(([a], [b]) => a < b ? -1 : 1).map(([path, id]) => `${path}@${id}`);
  if (kind.kind === "thread") data.reviewed = commit;
  const stamped = renderFrontmatter(data, body);
  if (!stamped.equals(bytes)) writeFileSync(abs, stamped);
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

// What discovery reads of a pipeline folder tree: its format and the origins its intent opens with. A pipeline of the
// current format without an intent is malformed and stops the command; any other file or key is never read.
async function discoverFolders(root, folders, where) {
  const trees = await readTrees(root, folders.map((folder) => folder.tree));
  const intentFolders = await readTrees(root, [...trees.values()].map((entries) => entries.get("0-intent")).filter((entry) => entry?.mode === "040000").map((entry) => entry.oid));
  const regular = (entry) => REGULAR.includes(entry?.mode) ? entry.oid : null;
  const oids = folders.map(({ tree }) => {
    const entries = trees.get(tree), intentFolder = entries.get("0-intent");
    return { config: regular(entries.get("run-config.md")), intent: intentFolder?.mode === "040000" ? regular(intentFolders.get(intentFolder.oid).get("intent.md")) : null };
  });
  const wanted = [...new Set(oids.flatMap(({ config, intent }) => [config, intent]).filter(Boolean))];
  const blobs = new Map((await readObjects(root, wanted)).map((content, i) => [wanted[i], content]));
  return folders.map((folder, i) => {
    const format = formatOf(oids[i].config && blobs.get(oids[i].config));
    const intent = oids[i].intent && blobs.get(oids[i].intent);
    if (!intent && format === FORMAT) fail(`pipelines: cannot read ${where(folder)}/${INTENT}: missing`);
    return { ...folder, format, origins: intent ? originsOf(splitFrontmatter(intent).body.toString("utf8")) : [] };
  });
}

// Every live pipeline folder at a branch tip, and every merged one in the base branch's tree, optionally filtered by issue.
async function cmdPipelines(args) {
  // The pipelines folder root: a folder inside a repository, which need not exist in its working tree.
  const given = args._[0] ?? fail("pipelines: missing <pipelines folder root>");
  const { root, rel: pipelinesRoot } = locate(given);
  if (!pipelinesRoot) fail(`pipelines: the pipelines folder root is a folder inside the repository, not its root: ${given}`);
  if (existsSync(join(root, pipelinesRoot)) && !statSync(join(root, pipelinesRoot)).isDirectory()) fail(`pipelines: not a folder: ${given}`);
  const baseCommit = requireCommit(root, args.base ?? fail("pipelines: --base <artifact base branch> is required"), "--base");
  const refs = gitText(root, ["for-each-ref", "--format=%(objectname) %(objecttype) %(symref) %(refname)", "refs/heads", "refs/remotes"])
    .split("\n").filter(Boolean).map((line) => line.split(" ")).filter(([, type, symref]) => type === "commit" && !symref)
    .map(([commit, , , refname]) => ({ commit, name: refname.replace(/^refs\/(?:heads|remotes)\//, "") }));
  // The pipelines folder root's tree at a list of commits, through one batch; a commit without it has none.
  const rootTrees = async (commits) => {
    const listing = gitText(root, ["cat-file", "--batch-check"], commits.map((commit) => `${commit}:${pipelinesRoot}\n`).join("")).split("\n");
    return commits.map((_, i) => listing[i]?.match(/^([0-9a-f]{40}|[0-9a-f]{64}) tree /)?.[1] ?? null);
  };
  // The pipeline folders under each root tree.
  const foldersOf = async (trees) => {
    const read = await readTrees(root, trees.filter(Boolean));
    return trees.map((tree) => tree ? [...read.get(tree).values()].filter((entry) => entry.mode === "040000") : []);
  };
  // Every tree id each folder had in the base branch's history.
  const history = gitText(root, ["log", "--full-history", "--format=%H", baseCommit, "--", `:(top,literal)${pipelinesRoot}`]).split("\n").filter(Boolean);
  const seen = new Set((await foldersOf(await rootTrees([baseCommit, ...history]))).flat().map((entry) => `${entry.name}\0${entry.oid}`));
  const live = [];
  const tipFolders = await foldersOf(await rootTrees(refs.map((ref) => ref.commit)));
  for (const [i, ref] of refs.entries())
    for (const entry of tipFolders[i])
      if (!seen.has(`${entry.name}\0${entry.oid}`)) live.push({ state: "live", ref: ref.name, commit: ref.commit, folder: `${pipelinesRoot}/${entry.name}`, tree: entry.oid });
  const [baseFolders] = await foldersOf(await rootTrees([baseCommit]));
  const merged = baseFolders.map((entry) => ({ state: "merged", ref: args.base, commit: baseCommit, folder: `${pipelinesRoot}/${entry.name}`, tree: entry.oid }));
  const pipelines = await discoverFolders(root, [...live, ...merged], (pipeline) => `${pipeline.ref}:${pipeline.folder}`);
  const result = pipelines.filter((pipeline) => args.issue === null || pipeline.origins.includes(`issue ${args.issue}`))
    .map(({ state, format, ref, commit, folder, origins }) => ({ state, format, ref, commit, folder, origins }))
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.state.localeCompare(b.state) || a.ref.localeCompare(b.ref));
  if (args.json) return process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.length) process.stdout.write(`${result.map((pipeline) => `${pipeline.state} ${pipeline.format} ${pipeline.ref} ${pipeline.folder}`).join("\n")}\n`);
}

// --- review -------------------------------------------------------------------------

// The messages of the two commits `review` builds; `review` recognizes them on a lane branch it rebuilds.
const REVIEW_BASE = "rp review base", REVIEW_CHANGE = "rp review change";

// Runs git with its own index file, so building a tree touches no worktree's index.
function gitWithIndex(root, index, args, input) {
  try { return execFileSync("git", args, { cwd: root, input, encoding: "utf8", env: { ...process.env, GIT_INDEX_FILE: index }, maxBuffer: Infinity, stdio: ["pipe", "pipe", "pipe"] }).trim(); }
  catch (error) { fail(`git ${args.join(" ")}: ${error.stderr?.toString().trim() || error.message}`); }
}

// The tree of `commit` outside the pipelines folder root, plus the review lane's view of the pipeline at the tip: its
// `0-intent/` folder and the lane's own threads.
function reviewTree(root, index, commit, pipelinesRoot, subset) {
  gitWithIndex(root, index, ["read-tree", commit]);
  gitWithIndex(root, index, ["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--", `:(top,literal)${pipelinesRoot}`]);
  if (subset.length) gitWithIndex(root, index, ["update-index", "--index-info"], subset.map((entry) => `${entry.mode} ${entry.oid}\t${entry.path}\n`).join(""));
  return gitWithIndex(root, index, ["write-tree"]);
}

// Builds a review lane's branch from the pipeline tip: a review base B, the merge-base with the configured base without
// the pipelines folder root plus the lane's view of the pipeline, and a change C on it, the tip's tree treated the same
// way, so `git diff B C` is the net change. The lane branch `<pipeline branch>-review-<lane>` moves to C, and its
// worktree with it, unless it holds review commits the pipeline branch lacks.
async function cmdReview(args) {
  const { root, rel } = locate(args._[0] ?? fail("review: missing <pipeline folder>"));
  const { folder, pipelinesRoot } = pipelineFolder(rel, "review");
  const laneId = args.lane ?? fail("review: --lane <lane> is required");
  const branch = (() => { try { return execFileSync("git", ["symbolic-ref", "--short", "-q", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } })()
    || fail(`review: ${root} has no branch checked out: the pipeline folder is read from the pipeline branch's worktree`);
  const tip = requireCommit(root, "HEAD", "HEAD");
  const files = await readCommit(root, tip, folder, (path) => path === "run-config.md");
  requireFormat(files.get("run-config.md"), `${folder}/run-config.md`);
  const config = parseOrFail(`${folder}/run-config.md`, () => parseConfig(files.get("run-config.md") ?? fail(`review: cannot read ${tip}:${folder}/run-config.md: missing`)));
  if (!reviewLanes(config).some((lane) => lane.id === laneId)) fail(`review: ${laneId} is not a review lane of ${folder}/run-config.md`);
  const mergeBase = baseOf(root, config.base, tip);
  const own = new RegExp(`^${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/threads/[1-9]\\d*-reviewer-${laneId}-(?:implementer-implementation|owner-intent)\\.md$`);
  const subset = lsTree(root, tip, `${folder}/`, true).filter((entry) => entry.type === "blob" && (entry.path.startsWith(`${folder}/0-intent/`) || own.test(entry.path)));
  const laneBranch = `${branch}-review-${laneId}`;
  const laneTip = commitOf(root, `refs/heads/${laneBranch}`);
  if (laneTip) {
    const unlanded = gitText(root, ["cherry", tip, laneTip]).split("\n").filter((line) => line.startsWith("+ ")).map((line) => line.slice(2))
      .filter((commit) => ![REVIEW_BASE, REVIEW_CHANGE].includes(gitText(root, ["log", "-1", "--format=%s", commit])));
    if (unlanded.length) fail(`review: ${laneBranch} has commits the pipeline branch lacks; land them first: ${unlanded.reverse().join(" ")}`);
  }
  const directory = mkdtempSync(join(tmpdir(), "rp-review-"));
  let base, change;
  try {
    const index = join(directory, "index");
    base = gitWithIndex(root, index, ["commit-tree", reviewTree(root, index, mergeBase, pipelinesRoot, subset), "-p", mergeBase, "-m", REVIEW_BASE]);
    change = gitWithIndex(root, index, ["commit-tree", reviewTree(root, index, tip, pipelinesRoot, subset), "-p", base, "-m", REVIEW_CHANGE]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
  const worktree = gitText(root, ["worktree", "list", "--porcelain"]).split("\n\n").map((record) => record.split("\n"))
    .find((lines) => lines.includes(`branch refs/heads/${laneBranch}`))?.find((line) => line.startsWith("worktree "))?.slice("worktree ".length);
  if (worktree) gitText(worktree, ["reset", "--hard", "-q", change]);
  else gitText(root, ["update-ref", `refs/heads/${laneBranch}`, change]);
  const result = { branch: laneBranch, tip, base, change, worktree: worktree ?? null };
  if (args.json) return process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`branch ${laneBranch}\ntip ${tip}\nbase ${base}\nchange ${change}\n`);
}

// --- cli --------------------------------------------------------------------------

const COMMANDS = {
  check: { run: cmdCheck, options: { "--ref": "value", "--json": "flag" } },
  stamp: { run: cmdStamp, options: { "--at": "value", "--pin": "list" } },
  pipelines: { run: cmdPipelines, options: { "--base": "value", "--issue": "value", "--json": "flag" } },
  review: { run: cmdReview, options: { "--lane": "value", "--json": "flag" } },
};

export function parseArgs(command, argv) {
  const { options } = COMMANDS[command];
  const args = { _: [], pin: [], json: false, ref: null, issue: null, at: null, base: null, lane: null };
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
  node rp.mjs stamp <file> --at <commit> [--pin <candidate>]...
  node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
  node rp.mjs review <pipeline folder> --lane <lane> [--json]

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
