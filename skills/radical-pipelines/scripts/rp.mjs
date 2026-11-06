#!/usr/bin/env node
// rp — state tooling for Radical Pipelines. Zero dependencies: everything it computes can be done with bare git.
// Commands: check, stamp, pipelines, review, assign. README.md beside this file is the contract.

import { execFileSync, spawn } from "node:child_process";
import { closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

// The repository's worktrees, its main checkout first: each one's path and the branch it has checked out, or null.
function worktreesOf(root) {
  return gitText(root, ["worktree", "list", "--porcelain"]).split("\n\n").map((record) => record.split("\n")).map((lines) => ({
    path: lines.find((line) => line.startsWith("worktree "))?.slice("worktree ".length) ?? null,
    branch: lines.find((line) => line.startsWith("branch refs/heads/"))?.slice("branch refs/heads/".length) ?? null,
  }));
}
// The pipeline branch: the branch checked out in the worktree `root` that holds the pipeline folder. A detached HEAD
// there stops `command`.
function pipelineBranchOf(root, command) {
  let branch = "";
  try { branch = execFileSync("git", ["symbolic-ref", "--short", "-q", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { /* detached */ }
  return branch || fail(`${command}: ${root} has no branch checked out: the pipeline folder is read from the pipeline branch's worktree`);
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

// The frontmatter is the text between a first line `---` and the next line `---`; the body is every byte after it.
// The delimiter lines alone tolerate a trailing `\r`; the closing one may end the file.
export function splitFrontmatter(bytes) {
  const raw = bytes.toString("latin1");
  const open = raw.match(/^---\r?\n/);
  if (!open) return { text: null, body: bytes };
  const close = raw.slice(open[0].length).match(/(?:^|\n)---\r?(?:\n|$)/);
  if (!close) return { text: null, body: bytes, error: "frontmatter has no closing --- line" };
  const start = open[0].length;
  return { text: bytes.subarray(start, start + close.index).toString("utf8"), body: bytes.subarray(start + close.index + close[0].length) };
}

// The constructs a plain YAML value can open with that YAML reads as something other than its text.
const PLAIN_FIRST = [[/^#/, "a comment"], [/^[[{]/, "a flow collection"], [/^&/, "an anchor"], [/^\*/, "an alias"], [/^!/, "a tag"],
  [/^[|>]/, "a block scalar"], [/^(?:[-?:](?:[ \t]|$)|[%@`,\]}])/, "a plain value YAML rejects"]];

// A frontmatter value: a plain value as written, without surrounding whitespace, or a quoted one without its quotes.
// Whatever YAML would read as other text, or as structure, is Invalid, naming the key and the construct.
function frontmatterValue(key, raw) {
  const value = raw.replace(/^[ \t]+|[ \t]+$/g, "");
  const reject = (construct) => invalid(`frontmatter ${key}: ${construct}`);
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const close = value.indexOf(quote, 1);
    if (close === -1) reject("an unclosed quote");
    const text = value.slice(1, close), rest = value.slice(close + 1);
    if ((quote === '"' && text.includes("\\")) || (quote === "'" && rest.startsWith("'"))) reject("a quoted value with an escape");
    if (rest.trim()) reject("text after the closing quote");
    return text;
  }
  for (const [pattern, construct] of PLAIN_FIRST) if (pattern.test(value)) reject(construct);
  if (/[ \t]#/.test(value)) reject("a comment");
  if (/:(?:[ \t]|$)/.test(value)) reject("a plain value YAML rejects");
  return value;
}

// A file's frontmatter, the YAML subset that is a flat map of single-line text values, by key in the order written
// (empty when it has none), and its body; or Invalid, naming the key or the construct outside the subset.
export function frontmatterOf(bytes) {
  const { text, body, error } = splitFrontmatter(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, "utf8"));
  if (error) invalid(error);
  const values = new Map();
  if (text === null) return { values, body, present: false };
  let key = null;
  for (const [at, raw] of text.split("\n").entries()) {
    const line = raw.replace(/\r$/, "");
    const where = key ? `frontmatter ${key}` : `frontmatter line ${at + 2}`;
    if (!line.trim()) continue;
    if (/^[ \t]/.test(line)) invalid(`${where}: a nested map or a multi-line value`);
    if (/^-(?:[ \t]|$)/.test(line)) invalid(`${where}: a list`);
    if (line.startsWith("#")) invalid(`frontmatter line ${at + 2}: a comment`);
    const match = line.match(/^([A-Za-z0-9][\w.-]*):((?:[ \t].*)?)$/);
    if (!match) invalid(`frontmatter line ${at + 2} is not <key>: <value>`);
    key = match[1];
    if (values.has(key)) invalid(`frontmatter ${key}: given twice`);
    values.set(key, frontmatterValue(key, match[2]));
  }
  return { values, body, present: true };
}

// A frontmatter holding JSON: run-config.md's. Its fields, or Invalid.
function jsonFrontmatterOf(bytes) {
  const { text, error } = splitFrontmatter(bytes);
  if (error) invalid(error);
  if (text === null) invalid("no frontmatter");
  let data;
  try { data = JSON.parse(text); } catch (parseError) { invalid(`frontmatter is not valid JSON: ${parseError.message}`); }
  if (data === null || typeof data !== "object" || Array.isArray(data)) invalid("frontmatter must be a JSON object");
  return data;
}

function onlyKeys(keys, allowed) {
  for (const key of keys) if (!allowed.includes(key)) invalid(`unexpected frontmatter key: ${key}`);
}

// Identity: the first 12 hexadecimal characters of the git blob id of the whole file.
const identityOf = (oid) => oid.slice(0, 12);

// The blob ids `git add` would store for working-tree files at their repository-relative paths in `folder`: after the
// clean filters and line-ending conversion their attributes, configuration, and index entries select, as when an entry
// already holding CRLF keeps it. Git computes them on a copy of the worktree's index, keeping its timestamps so stat
// data is trusted as Git trusts it; no object is written and the index itself is untouched.
function hashWorktree(root, folder, paths) {
  if (!paths.length) return [];
  const real = gitText(root, ["rev-parse", "--path-format=absolute", "--git-path", "index"]);
  const directory = mkdtempSync(join(tmpdir(), "rp-index-"));
  try {
    const index = join(directory, "index");
    if (existsSync(real)) {
      copyFileSync(real, index);
      const { atime, mtime } = statSync(real);
      utimesSync(index, atime, mtime);
    }
    gitWithIndex(root, index, ["-c", "core.splitIndex=false", "update-index", "--add", "--info-only", "-z", "--stdin"], paths.map((path) => `${path}\0`).join(""));
    const staged = new Map(gitWithIndex(root, index, ["ls-files", "--stage", "-z", "--", `:(top,literal)${folder}/`]).split("\0").filter(Boolean)
      .map((entry) => entry.match(/^\d{6} ([0-9a-f]{40}|[0-9a-f]{64}) 0\t(.+)$/s)).filter(Boolean).map((match) => [match[2], match[1]]));
    return paths.map((path) => staged.get(path) ?? fail(`git update-index: no blob id for ${path}`));
  } finally { rmSync(directory, { recursive: true, force: true }); }
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
// What is certified beside an approval: an artifact or a lane candidate.
const pins = (kind) => ["artifact", "candidate"].includes(kind?.kind);

// The certification of a landed file: `certification/<its pipeline-relative path>.json`, written by `rp stamp` alone.
const CERTIFICATION = "certification";
const certificationPath = (rel) => `${CERTIFICATION}/${rel}.json`;

const lstatOf = (path) => { try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return null; throw error; } };

// The bytes certifying the landed file at `rel` in the working tree of the pipeline folder `folder`, found at `base`,
// or null when it has none. A certification path of the wrong kind stops the command.
function worktreeCertification(base, folder, rel) {
  const parts = certificationPath(rel).split("/");
  for (let length = 1; length < parts.length; length++) {
    const stat = lstatOf(join(base, ...parts.slice(0, length)));
    if (!stat) return null;
    if (!stat.isDirectory()) fail(`cannot read ${folder}/${parts.slice(0, length).join("/")}: a file where a folder belongs`);
  }
  const stat = lstatOf(join(base, ...parts));
  if (!stat) return null;
  if (stat.isDirectory()) fail(`cannot read ${folder}/${parts.join("/")}: a folder where a certification belongs`);
  if (!stat.isFile()) fail(`cannot read ${folder}/${parts.join("/")}: not a regular file`);
  return readFileSync(join(base, ...parts));
}

// A pipeline, as read from the working tree or a commit: its files by pipeline-relative path, the identity of each
// pinnable one, and `certification(rel)`, the certification of the landed file at `rel` (§ worktreeCertification).
// This one is the working tree's.
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
  const hashed = [...files.keys()].filter(pinnable);
  const oids = hashWorktree(root, folder, hashed.map((rel) => `${folder}/${rel}`));
  return { files, identities: new Map(hashed.map((rel, i) => [rel, identityOf(oids[i])])), certification: (rel) => worktreeCertification(base, folder, rel) };
}

// The pipeline from a commit. `reads`, when given, narrows it to the files an operation reads, without
// certifications: only those files, and the paths that hold them, are validated.
async function readCommit(root, commit, folder, reads = null) {
  const entries = lsTree(root, commit, `${folder}/`, true);
  if (!entries.length) fail(`cannot read ${commit}:${folder}: no such folder`);
  const wanted = [], certifications = new Map();
  for (const entry of entries) {
    const rel = entry.path.slice(folder.length + 1);
    if (!reads && (rel === CERTIFICATION || rel.startsWith(`${CERTIFICATION}/`))) { certifications.set(rel, entry); continue; }
    const read = (path) => Boolean(kindOf(path)) && (!reads || reads(path));
    if (!reads && holdsFiles(rel)) fail(`cannot read ${commit}:${entry.path}: a file where a folder belongs`);
    const parts = rel.split("/");
    for (let length = 1; length < parts.length; length++)
      if (read(parts.slice(0, length).join("/"))) fail(`cannot read ${commit}:${folder}/${parts.slice(0, length).join("/")}: a folder where a pipeline file belongs`);
    if (!read(rel)) continue;
    if (!REGULAR.includes(entry.mode)) fail(`cannot read ${commit}:${entry.path}: not a regular file`);
    wanted.push({ rel, oid: entry.oid });
  }
  const regular = [...certifications.values()].filter((entry) => REGULAR.includes(entry.mode));
  const contents = await readObjects(root, [...wanted, ...regular].map((entry) => entry.oid));
  const bytes = new Map(regular.map((entry, i) => [entry.oid, contents[wanted.length + i]]));
  const certification = (rel) => {
    const path = certificationPath(rel), parts = path.split("/");
    for (let length = 1; length < parts.length; length++)
      if (certifications.has(parts.slice(0, length).join("/"))) fail(`cannot read ${commit}:${folder}/${parts.slice(0, length).join("/")}: a file where a folder belongs`);
    const entry = certifications.get(path);
    if (!entry) {
      if ([...certifications.keys()].some((other) => other.startsWith(`${path}/`))) fail(`cannot read ${commit}:${folder}/${path}: a folder where a certification belongs`);
      return null;
    }
    if (!REGULAR.includes(entry.mode)) fail(`cannot read ${commit}:${folder}/${path}: not a regular file`);
    return bytes.get(entry.oid);
  };
  return { files: new Map(wanted.map((entry, i) => [entry.rel, contents[i]])), identities: new Map(wanted.map((entry) => [entry.rel, identityOf(entry.oid)])), certification };
}

// --- parsing ----------------------------------------------------------------------

// The conventions format this script reads and writes: the version of `.rp.md` and the format of `run-config.md`.
export const FORMAT = 8;
// The format a pipeline was written under: the integer `format` in run-config.md's JSON frontmatter, else `earlier`
// (no run-config.md, no frontmatter, unreadable frontmatter, or no integer `format`). Nothing else is read.
export function formatOf(bytes) {
  if (!bytes) return "earlier";
  const { text } = splitFrontmatter(bytes);
  try { const format = JSON.parse(text ?? "null")?.format; return Number.isInteger(format) ? format : "earlier"; }
  catch { return "earlier"; }
}
// Stops unless a pipeline is of the current format; `path` names its run-config.md.
function requireFormat(bytes, path) {
  const format = formatOf(bytes);
  if (format === "earlier" || format < FORMAT) fail(`${path}: pipeline of an earlier format; it is not continued`);
  if (format > FORMAT) fail(`${path}: pipeline of a newer format ${format}; update the skill`);
}

// The data `.rp.md` and `run-config.md` share. Each check names what is malformed through `malformed(reason)`, which
// throws; `at` names the entry, as `<key>.<name>…`.
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const entryName = (at, name) => `${at}.${/^[a-z0-9][a-z0-9-]*$/.test(name) ? name : JSON.stringify(name)}`;
// A JSON object, holding only `keys` when given.
function objectAt(value, at, malformed, keys = null) {
  if (!isObject(value)) malformed(`${at}: must be a JSON object`);
  if (keys) for (const key of Object.keys(value)) if (!keys.includes(key)) malformed(`${at}: unexpected key: ${key}`);
  return value;
}
// A text: a string, or a list of strings that are its lines, holding more than whitespace. The string it reads as.
function textAt(value, at, malformed) {
  const lines = typeof value === "string" ? [value] : Array.isArray(value) && value.every((line) => typeof line === "string") ? value : null;
  if (!lines?.some((line) => /\S/.test(line))) malformed(`${at}: must be a text: a non-empty string, or a list of strings that are its lines`);
  return lines.join("\n");
}
// A model name, as the project or the owner writes it.
function modelAt(value, at, malformed) {
  if (typeof value !== "string" || !value.trim()) malformed(`${at}: must be a model name, a non-empty string`);
  return value;
}

// The profiles a role is an instance of.
export const PROFILES = ["spec-producer", "design-doc-producer", "implementer", "reviewer"];
const MODELS = ["model", "subagents"];
// The agents of `.rp.md` and of `run-config.md`: by profile, its model, its subagent model, and its lanes, by lane id, each
// with its brief, model, and subagent model; every member optional. Each brief is read as its string.
export function parseAgents(value, malformed) {
  const agents = {};
  for (const [profile, entry] of Object.entries(objectAt(value, "agents", malformed, PROFILES))) {
    const at = `agents.${profile}`;
    objectAt(entry, at, malformed, [...MODELS, ...(LANE_PROFILES.includes(profile) ? ["lanes"] : [])]);
    const parsed = agents[profile] = {};
    for (const key of MODELS) if (key in entry) parsed[key] = modelAt(entry[key], `${at}.${key}`, malformed);
    if (!("lanes" in entry)) continue;
    if (!Object.keys(objectAt(entry.lanes, `${at}.lanes`, malformed)).length) malformed(`${at}.lanes: must name a lane`);
    parsed.lanes = {};
    for (const [id, lane] of Object.entries(entry.lanes)) {
      const laneAt = entryName(`${at}.lanes`, id);
      if (!LANE_ID.test(id)) malformed(`${laneAt}: a lane id must match ${LANE_ID.source}`);
      objectAt(lane, laneAt, malformed, ["brief", ...MODELS]);
      parsed.lanes[id] = {};
      if ("brief" in lane) parsed.lanes[id].brief = textAt(lane.brief, `${laneAt}.brief`, malformed);
      for (const key of MODELS) if (key in lane) parsed.lanes[id][key] = modelAt(lane[key], `${laneAt}.${key}`, malformed);
    }
  }
  return agents;
}

// run-config.md: format, target phase, base, and the run's agents, in the schema of `.rp.md`'s. Its body is ignored.
export function parseConfig(bytes) {
  const data = jsonFrontmatterOf(bytes);
  onlyKeys(Object.keys(data), ["format", "target-phase", "base", "agents"]);
  const targetPhase = data["target-phase"];
  if (!Number.isInteger(targetPhase) || targetPhase < 1 || targetPhase > REVIEW_PHASE) invalid("target-phase must be an integer from 1 to 4");
  if (typeof data.base !== "string" || !data.base.trim()) invalid("base must be a branch name");
  const agents = "agents" in data ? parseAgents(data.agents, invalid) : {};
  const lanes = Object.entries(agents).flatMap(([profile, entry]) => Object.entries(entry.lanes ?? {}).map(([id, lane]) => ({ profile, id, ...lane })));
  return { targetPhase, base: data.base, agents, lanes };
}

// A role's models in the run: its lane's model and subagent model, else its profile's; null where neither names one.
export function modelsOf(config, profile, laneId) {
  const entry = config.agents[profile] ?? {}, lane = laneId ? entry.lanes?.[laneId] ?? {} : {};
  return Object.fromEntries(MODELS.map((key) => [key, lane[key] ?? entry[key] ?? null]));
}

// The production lanes configured for a phase.
const productionLanes = (config, phase) => phase.lanes ? config.lanes.filter((lane) => lane.profile === phase.owner) : [];
// The review lanes: the configured ones, or one lane `default`.
export function reviewLanes(config) {
  const lanes = config.lanes.filter((lane) => lane.profile === "reviewer");
  return lanes.length ? lanes : [{ profile: "reviewer", id: "default" }];
}

// A certification: a JSON object holding `inputs`, a list of `<path>@<identity>`, one per pinned file, and on an
// approval `reviewed`, the full hash of its approved commit. One that is malformed stops the command, naming `path`.
function parseCertification(bytes, path, approval) {
  const malformed = (reason) => fail(`${path}: ${reason}`);
  let data;
  try { data = JSON.parse(bytes.toString("utf8")); } catch (error) { malformed(`not valid JSON: ${error.message}`); }
  if (data === null || typeof data !== "object" || Array.isArray(data)) malformed("must be a JSON object");
  const keys = approval ? ["inputs", "reviewed"] : ["inputs"];
  for (const key of Object.keys(data)) if (!keys.includes(key)) malformed(`unexpected key: ${key}`);
  for (const key of keys) if (!Object.hasOwn(data, key)) malformed(`missing ${key}`);
  if (!Array.isArray(data.inputs)) malformed("inputs must be a list");
  const inputs = new Map();
  for (const entry of data.inputs) {
    const match = typeof entry === "string" && entry.match(/^(.+)@([0-9a-f]{12})$/);
    if (!match) malformed(`inputs entry must be <path>@<identity>: ${JSON.stringify(entry)}`);
    if (!pinnable(match[1])) malformed(`inputs entry names no pipeline input: ${match[1]}`);
    if (inputs.has(match[1])) malformed(`inputs pins ${match[1]} twice`);
    inputs.set(match[1], match[2]);
  }
  if (approval && (typeof data.reviewed !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(data.reviewed))) malformed("reviewed must be a full commit hash");
  return { inputs, reviewed: approval ? data.reviewed : null };
}

// A later input's `target`: the artifacts it targets.
export function parseTargets(value) {
  const targets = value.split(",").map((item) => item.trim().replace(/#.*$/, ""));
  for (const target of targets)
    if (!PHASES.some((phase) => phase.artifact === target)) invalid(`target must name ${PHASES.map((phase) => phase.artifact).join(", ")}: ${target || "(empty)"}`);
  return [...new Set(targets)];
}

const STATUSES = ["open", "approved", "withdrawn", "answered", "disagreement"];
// The statuses of a thread addressed to the person: opened as `disagreement`, closed `answered`.
const OWNER_STATUSES = ["disagreement", "answered"];
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
// An approval: an approved review thread.
const isApproval = (thread) => isReview(thread) && thread.status === "approved";
// A review lane's thread, by its pipeline-relative path: `threads/<n>-reviewer-<lane>-implementer-implementation.md`, a
// review thread, or `threads/<n>-reviewer-<lane>-owner-intent.md`. Its number and whether it is a review thread, or null.
function laneThreadOf(rel, laneId) {
  const match = rel.match(new RegExp(`^threads/([1-9]\\d*)-reviewer-${laneId}-(implementer-implementation|owner-intent)\\.md$`));
  return match && { number: Number(match[1]), review: match[2] === "implementer-implementation" };
}
// A review lane's review thread: the highest-numbered of its review threads among `paths`; undefined when it has none.
const reviewThreadOf = (paths, laneId) => paths.filter((rel) => laneThreadOf(rel, laneId)?.review)
  .sort((a, b) => laneThreadOf(b, laneId).number - laneThreadOf(a, laneId).number)[0];
// A lane's branch: `<pipeline branch>-<artifact>-<lane>` for a production lane of `phase`, `<pipeline branch>-review-<lane>`
// for a review lane.
const laneBranchOf = (pipelineBranch, phase, laneId) => `${pipelineBranch}-${phase ? phase.token : "review"}-${laneId}`;

// The frontmatter keys of a thread: each required, and `cites` on a thread to owner only.
const THREAD_KEYS = ["status", "opener", "owner", "artifact"];

// A thread, from its file's contents: the values of its frontmatter and the messages of its body, or Invalid.
export function parseThread(name, contents) {
  const number = name.match(/^([1-9]\d*)-.+\.md$/)?.[1];
  if (!number) invalid("thread file name must be <n>-<opener>-<owner>-<artifact>.md");
  const { values, body } = frontmatterOf(contents);
  onlyKeys(values.keys(), [...THREAD_KEYS, "cites"]);
  for (const key of THREAD_KEYS) if (!values.has(key)) invalid(`frontmatter has no ${key}`);
  const thread = { number: Number(number), ...Object.fromEntries(THREAD_KEYS.map((key) => [key, values.get(key)])) };
  if (thread.owner === "owner") {
    if (!values.get("cites")) invalid("a thread to owner names in cites the thread or evidence it comes from");
    thread.cites = values.get("cites");
  } else if (values.has("cites")) invalid("cites is only on a thread to owner");
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
  for (const line of body.toString("utf8").split("\n").map((text) => text.replace(/\r$/, ""))) {
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

// The intent's origins: the issue it addresses, the branch it starts from, the pipeline it re-attempts.
const ORIGIN_KEYS = ["issue", "starts-from", "re-attempts"];
// The frontmatter keys a pipeline file other than run-config.md and a thread (§ THREAD_KEYS) carries: none on the
// spec, the design doc, and candidates.
function frontmatterKeys(kind) {
  if (kind.kind === "intent") return ORIGIN_KEYS;
  if (kind.kind === "later") return ["target", "origin"];
  return kind.phase === IMPLEMENTATION ? ["status"] : [];
}

// A pipeline file other than run-config.md, parsed under the run configuration, or Invalid.
function parseFile(path, kind, bytes, config) {
  if (kind.kind === "thread") {
    const thread = { path, kind: "thread", ...parseThread(path.slice("threads/".length), bytes), reviewed: null };
    const awaited = awaitedRole(thread) && parseRole(awaitedRole(thread));
    if (awaited?.lane && !reviewLanes(config).some((lane) => lane.id === awaited.lane)) invalid("lane not configured; close the thread withdrawn");
    return thread;
  }
  const { values, present } = frontmatterOf(bytes);
  const keys = frontmatterKeys(kind);
  if (present && !keys.length) invalid("carries no frontmatter");
  onlyKeys(values.keys(), keys);
  if (kind.kind === "later" && !values.has("target")) invalid("frontmatter has no target");
  if (kind.kind === "candidate" && !productionLanes(config, kind.phase).some((lane) => lane.id === kind.lane))
    invalid(`production lane is not configured: ${kind.phase.owner} ${kind.lane}`);
  return { ...kind, path, values, targets: kind.kind === "later" ? parseTargets(values.get("target")) : [] };
}

// A pipeline's files, parsed under `config`, with each file's identity. A malformed file is collected as invalid, never
// computed from. With `certified`, each artifact, candidate, and approval carries its certification: its pins as
// `inputs` and an approval's `reviewed`, none (and no pins) when it has none; a certification that cannot be read or is
// malformed stops the command. `where` names the pipeline folder in messages.
function parseFiles(pipeline, where, config, certified) {
  const state = { config, docs: new Map(), threads: [], invalid: [] };
  for (const [path, bytes] of [...pipeline.files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const kind = kindOf(path);
    if (kind.kind === "config") continue;
    try {
      const file = parseFile(path, kind, bytes, config);
      if (file.kind === "thread") state.threads.push(file);
      else state.docs.set(path, { ...file, identity: pipeline.identities.get(path) });
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      state.invalid.push({ path, reason: error.message });
    }
  }
  if (certified)
    for (const subject of [...[...state.docs.values()].filter(pins), ...state.threads.filter(isApproval)]) {
      const bytes = pipeline.certification(subject.path);
      Object.assign(subject, bytes ? parseCertification(bytes, `${where}/${certificationPath(subject.path)}`, subject.kind === "thread") : { inputs: new Map(), reviewed: null });
    }
  return state;
}

// A pipeline, parsed and certified. A missing or invalid run-config.md, or a missing intent, stops the command.
export function readState(pipeline, where) {
  const { files } = pipeline;
  requireFormat(files.get("run-config.md"), `${where}/run-config.md`);
  if (!files.has(INTENT)) fail(`cannot read ${where}/${INTENT}: missing`);
  const config = parseOrFail(`${where}/run-config.md`, () => parseConfig(files.get("run-config.md")));
  return parseFiles(pipeline, where, config, true);
}
function parseOrFail(path, parse) {
  try { return parse(); } catch (error) { if (error instanceof Invalid) fail(`${path}: ${error.message}`); throw error; }
}

// --- state ------------------------------------------------------------------------

// The required inputs of what is certified. An artifact: its phase's upstream artifacts and every later input that
// targets it. A candidate: its phase's upstream artifacts, what its lane reads; the later inputs targeting its root are
// the root's. An approval: the intent and every later input.
export function requiredInputs(state, subject) {
  const consumes = (doc) => subject.kind === "thread" || (subject.kind === "artifact" && doc.targets.includes(subject.phase.artifact));
  const later = [...state.docs.values()].filter((doc) => doc.kind === "later" && consumes(doc));
  return [...upstreamOf(subject), ...later.map((doc) => doc.path)];
}
// The upstream artifacts a subject pins, before later inputs.
const upstreamOf = (subject) => subject.kind === "thread" ? [INTENT] : subject.phase.upstream;

// The required inputs of a subject that its certification leaves unpinned, or pins at an identity that differs from the
// current one.
export function staleInputs(state, subject) {
  return requiredInputs(state, subject).filter((input) => !subject.inputs.has(input) || subject.inputs.get(input) !== state.docs.get(input)?.identity);
}

// The implementation is done when `notes.md`'s frontmatter `status` is `done`.
const implementationDone = (state) => state.docs.get(IMPLEMENTATION.artifact)?.values.get("status") === "done";

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

// A review lane's approval: its highest-numbered review thread, approved when it is an approval and fresh. An approval is
// stale on a changed required input, or when the tip's code is not the approved commit's plus clean merges of the base.
// One without certification has no code judged; one whose approved commit the clone lacks is no approval.
function approvalOf(state, lane) {
  const path = reviewThreadOf(state.threads.map((thread) => thread.path), lane.id);
  const latest = state.threads.find((thread) => thread.path === path);
  if (!latest || !isApproval(latest)) return { approved: false };
  const codeChanged = latest.reviewed !== null && state.codeChanged(latest.reviewed);
  if (codeChanged === null) return { approved: false };
  const stale = staleInputs(state, latest);
  return { approved: !stale.length && !codeChanged, ...(stale.length ? { stale } : {}), ...(codeChanged ? { codeChanged } : {}) };
}

// The base: the merge-base of the tip with `run-config.md`'s base, the latest base the tip holds.
export function baseOf(root, base, tip) {
  const baseCommit = requireCommit(root, base, "base");
  return gitText(root, ["merge-base", baseCommit, tip]) || fail(`no merge-base between ${base} and ${tip}`);
}

// Whether the tip's code outside the pipelines folder root differs from the approved commit's merged with the base: a
// conflict outside the root, or any difference from the merged tree outside it. Null when the clone lacks the commit.
export function codeChanged(root, approved, base, tip, pipelinesRoot) {
  const commit = commitOf(root, approved);
  if (!commit) return null;
  if (commit === tip) return false;
  let merged;
  try { merged = execFileSync("git", ["merge-tree", "--write-tree", "--no-messages", "--name-only", "-z", commit, base], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (error) {
    if (error.status !== 1 || !/^[0-9a-f]{40,64}\0/.test(error.stdout ?? "")) fail(`git merge-tree --write-tree (Git 2.38 or later) ${commit} ${base}: ${error.stderr?.toString().trim() || error.message}`);
    merged = error.stdout;
  }
  const [tree, ...conflicts] = merged.split("\0").filter(Boolean);
  if (conflicts.some((path) => !path.startsWith(`${pipelinesRoot}/`))) return true;
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

// The phases from 1 through the target that are complete, ascending: each with every phase below it complete and its
// work done. Phases 1 to 3: the artifact fresh (`notes.md` done) and no thread awaiting its owner. Phase 4: every review
// lane approved and no thread awaiting a reviewer. None on an INVALID frontier.
export function completePhases(state, entries) {
  if (entries[0].action === "INVALID") return [];
  const done = (n) => {
    const phase = PHASES.find((each) => each.n === n);
    if (phase) return statusOf(state, phase.artifact).state === "fresh" && !awaiting(state, phase.owner).length;
    return reviewLanes(state.config).every((lane) => approvalOf(state, lane).approved) && !awaitedReviewLanes(state).length;
  };
  const complete = [];
  for (let n = 1; n <= state.config.targetPhase && done(n); n++) complete.push(n);
  return complete;
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

// A pipeline as `check` reads it, from the working tree or the commit `ref`: its files, its state, the tip, the base at
// target phase 4, and the frontier.
async function inspect(root, folder, pipelinesRoot, ref) {
  const tip = ref ? requireCommit(root, ref, "--ref") : requireCommit(root, "HEAD", "HEAD");
  const pipeline = ref ? await readCommit(root, tip, folder) : readWorktree(root, folder);
  const state = readState(pipeline, ref ? `${ref}:${folder}` : folder);
  const base = state.config.targetPhase === REVIEW_PHASE ? baseOf(root, state.config.base, tip) : null;
  const judged = new Map();
  state.codeChanged = (approved) => {
    if (!judged.has(approved)) judged.set(approved, codeChanged(root, approved, base, tip, pipelinesRoot));
    return judged.get(approved);
  };
  return { pipeline, state, tip, base, frontier: frontier(state) };
}

async function cmdCheck(args) {
  const { root, rel } = locate(args._[0] ?? fail("check: missing <pipeline folder>"));
  const { folder, pipelinesRoot } = pipelineFolder(rel, "check");
  const { state, tip, base, frontier: entries } = await inspect(root, folder, pipelinesRoot, args.ref);
  const target = state.config.targetPhase;
  const report = { pipeline: folder, tip, targetPhase: target, frontier: entries };
  if (!state.invalid.length) {
    report.phases = PHASES.filter((phase) => phase.n <= target).map((phase) => ({
      phase: phase.folder,
      artifact: phase.artifact,
      ...statusOf(state, phase.artifact),
      lanes: lanesOpen(state, phase).map((lane) => ({ id: lane.id, path: candidateOf(phase, lane.id), ...statusOf(state, candidateOf(phase, lane.id)) })),
    }));
    report.complete = completePhases(state, entries);
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

// Certifies a landed file: writes `certification/<file>.json` with the file's required inputs, derived from its kind, at
// their identities in the tree of the turn's commit `--at`, and on an approval its approved commit, the `HEAD` where it
// lies; an approval's `--at` must be the change its reviewer's last heading names. The landed file is never written.
async function cmdStamp(args) {
  const { root, rel } = locate(args._[0] ?? fail("stamp: missing <file>"));
  const { folder, inner, pipelinesRoot } = pipelineFileOf(rel, "stamp");
  const kind = kindOf(inner);
  if (!pins(kind) && kind.kind !== "thread") fail(`stamp: not an artifact or thread: ${rel}`);
  const commit = requireCommit(root, args.at ?? fail("stamp: --at <commit> names the turn's commit and is required"), "--at");
  // From the working tree: run-config.md and the landed file.
  const readRegular = (path) => {
    const stat = lstatOf(join(root, path));
    return stat?.isFile() ? readFileSync(join(root, path)) : stat ? fail(`stamp: cannot read ${path}: not a regular file`) : null;
  };
  const configBytes = readRegular(`${folder}/run-config.md`);
  requireFormat(configBytes, `${folder}/run-config.md`);
  const config = parseOrFail(`${folder}/run-config.md`, () => parseConfig(configBytes));
  const bytes = readRegular(rel) ?? fail(`stamp: cannot read ${rel}: not a regular file`);
  const subject = parseOrFail(`stamp: ${rel}`, () => parseFile(inner, kind, bytes, config));
  if (kind.kind === "thread" && !isApproval(subject)) fail(`stamp: ${rel}: only an approved review thread is stamped`);
  // An approval is certified `--at` the change its reviewer read, the commit its last heading names; its approved commit
  // is the HEAD that holds it, whose code must be that change's.
  const reviewed = kind.kind === "thread" ? requireCommit(root, "HEAD", "HEAD") : null;
  if (reviewed) {
    const named = subject.messages.findLast((message) => message.author === subject.opener).commit;
    if (requireCommit(root, named, `stamp: ${rel}: the commit the reviewer's last heading names`) !== commit)
      fail(`stamp: ${rel}: --at ${args.at} is not ${named}, the change the reviewer's last heading names`);
    try { execFileSync("git", ["diff", "--quiet", "--no-ext-diff", commit, reviewed, "--", ".", `:(top,exclude,literal)${pipelinesRoot}`], { cwd: root, stdio: ["ignore", "ignore", "pipe"] }); }
    catch (error) {
      if (error.status !== 1) fail(`git diff ${commit} ${reviewed}: ${error.stderr?.toString().trim() || error.message}`);
      fail(`stamp: ${rel}: HEAD differs from ${args.at}, the change it reviewed, outside ${pipelinesRoot}`);
    }
  }
  // What stamp reads at the turn's commit: the intent, every later input (its `target` says whether it applies), and the
  // subject's upstream artifacts.
  const upstream = upstreamOf(subject);
  const reads = (path) => path === INTENT || kindOf(path).kind === "later" || upstream.includes(path);
  const state = parseFiles(await readCommit(root, commit, folder, reads), `${args.at}:${folder}`, config, false);
  if (state.invalid.length) fail(`stamp: ${commit}:${folder}/${state.invalid[0].path}: ${state.invalid[0].reason}`);
  const inputs = requiredInputs(state, subject).map((path) => `${path}@${(state.docs.get(path) ?? fail(`stamp: cannot pin ${commit}:${folder}/${path}: missing`)).identity}`).sort();
  const certification = Buffer.from(`${JSON.stringify({ inputs, ...(reviewed ? { reviewed } : {}) }, null, 2)}\n`);
  const base = join(root, folder), path = join(base, certificationPath(inner));
  const existing = worktreeCertification(base, folder, inner);
  if (existing) parseCertification(existing, `stamp: ${folder}/${certificationPath(inner)}`, kind.kind === "thread");
  if (!existing?.equals(certification)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, certification);
  }
}

// --- pipelines --------------------------------------------------------------------

// The first format whose intent names its origins in its frontmatter.
const ORIGINS_IN_FRONTMATTER = 7;
// The origins an intent of a pipeline of `format` names. From ORIGINS_IN_FRONTMATTER, those of its frontmatter, each as
// `<key> <value>` in the order written; before, the values of the `origin:` lines that open its body. Nothing is
// validated: an intent whose frontmatter cannot be read has none.
export function originsOf(bytes, format) {
  if (format === "earlier" || format < ORIGINS_IN_FRONTMATTER) {
    const origins = [];
    for (const line of splitFrontmatter(bytes).body.toString("utf8").split("\n")) {
      const match = line.replace(/\r$/, "").match(/^origin:[\t ]*(.*\S)[\t ]*$/);
      if (!match) break;
      origins.push(match[1]);
    }
    return origins;
  }
  try { return [...frontmatterOf(bytes).values].filter(([key]) => ORIGIN_KEYS.includes(key)).map(([key, value]) => `${key} ${value}`); }
  catch (error) { if (error instanceof Invalid) return []; throw error; }
}

// A pipeline folder is a folder of the pipelines folder root that holds a pipeline file of some format: a phase folder
// `<n>-<name>/`, directly or, in an earlier format, under `base/`; or `run-config.md`, or an earlier format's
// `prompt.md`. Any other content of the root, such as a project's pipeline tooling, is not a pipeline.
const isPhaseFolder = ([name, entry]) => entry.mode === "040000" && /^\d+-[^/]+$/.test(name);
async function pipelineFoldersIn(root, entries) {
  const folders = entries.filter((entry) => entry.mode === "040000");
  const trees = await readTrees(root, folders.map((folder) => folder.oid));
  const bases = await readTrees(root, folders.map((folder) => trees.get(folder.oid).get("base")).filter((entry) => entry?.mode === "040000").map((entry) => entry.oid));
  return folders.filter((folder) => {
    const tree = trees.get(folder.oid), base = tree.get("base");
    return [...tree].some(isPhaseFolder) || ["run-config.md", "prompt.md"].some((name) => tree.has(name)) || (base?.mode === "040000" && [...bases.get(base.oid)].some(isPhaseFolder));
  });
}

// What discovery reads of a pipeline folder tree: its format and its intent's origins. A pipeline of the
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
    return { ...folder, format, origins: intent ? originsOf(intent, format) : [] };
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
  // The folders under each root tree, every one or only the pipeline folders.
  const foldersOf = async (trees, pipelinesOnly = true) => {
    const read = await readTrees(root, trees.filter(Boolean));
    const all = trees.map((tree) => tree ? [...read.get(tree).values()].filter((entry) => entry.mode === "040000") : []);
    return pipelinesOnly ? Promise.all(all.map((entries) => pipelineFoldersIn(root, entries))) : all;
  };
  // Every tree id each folder had in the base branch's history.
  const history = gitText(root, ["log", "--full-history", "--format=%H", baseCommit, "--", `:(top,literal)${pipelinesRoot}`]).split("\n").filter(Boolean);
  const seen = new Set((await foldersOf(await rootTrees([baseCommit, ...history]), false)).flat().map((entry) => `${entry.name}\0${entry.oid}`));
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

// Runs git plumbing with its own index file, which never consults a working tree: building a tree depends on no
// worktree's index, HEAD, or files.
function gitWithIndex(root, index, args, input) {
  try { return execFileSync("git", args, { cwd: root, input, encoding: "utf8", env: { ...process.env, GIT_INDEX_FILE: index }, maxBuffer: Infinity, stdio: ["pipe", "pipe", "pipe"] }).trim(); }
  catch (error) { fail(`git ${args.join(" ")}: ${error.stderr?.toString().trim() || error.message}`); }
}
// `update-index --index-info` lines: each entry at its path, or removed with mode 0.
const indexInfo = (entries, remove = false) => entries.map((entry) => `${remove ? "0" : entry.mode} ${remove ? "0".repeat(entry.oid.length) : entry.oid}\t${entry.path}\n`).join("");

// The tree of `commit` with the pipelines folder root replaced by `rootEntries`, every file it holds.
function treeWithRoot(root, index, commit, pipelinesRoot, rootEntries) {
  gitWithIndex(root, index, ["read-tree", commit]);
  const removed = lsTree(root, commit, `${pipelinesRoot}/`, true);
  const input = indexInfo(removed, true) + indexInfo(rootEntries);
  if (input) gitWithIndex(root, index, ["update-index", "--index-info"], input);
  return gitWithIndex(root, index, ["write-tree"]);
}

// Builds a review lane's branch from the pipeline tip: a review base B, the merge-base with the configured base, and a
// change C on it, the tip; in both, the pipelines folder root is the tip's without its pipeline folders, plus the
// lane's view of the pipeline, so `git diff B C` is the net change and the root's tooling stays. The lane branch `<pipeline branch>-review-<lane>` moves to C, and its
// worktree with it, unless it holds review commits the pipeline branch lacks.
async function cmdReview(args) {
  const { root, rel } = locate(args._[0] ?? fail("review: missing <pipeline folder>"));
  const { folder, pipelinesRoot } = pipelineFolder(rel, "review");
  const laneId = args.lane ?? fail("review: --lane <lane> is required");
  const branch = pipelineBranchOf(root, "review");
  const tip = requireCommit(root, "HEAD", "HEAD");
  const { files } = await readCommit(root, tip, folder, (path) => path === "run-config.md");
  requireFormat(files.get("run-config.md"), `${folder}/run-config.md`);
  const config = parseOrFail(`${folder}/run-config.md`, () => parseConfig(files.get("run-config.md") ?? fail(`review: cannot read ${tip}:${folder}/run-config.md: missing`)));
  if (!reviewLanes(config).some((lane) => lane.id === laneId)) fail(`review: ${laneId} is not a review lane of ${folder}/run-config.md`);
  const mergeBase = baseOf(root, config.base, tip);
  const subset = lsTree(root, tip, `${folder}/`, true).filter((entry) => entry.type === "blob"
    && (entry.path.startsWith(`${folder}/0-intent/`) || laneThreadOf(entry.path.slice(folder.length + 1), laneId)));
  const laneBranch = laneBranchOf(branch, null, laneId);
  const laneTip = commitOf(root, `refs/heads/${laneBranch}`);
  if (laneTip) {
    const unlanded = gitText(root, ["cherry", tip, laneTip]).split("\n").filter((line) => line.startsWith("+ ")).map((line) => line.slice(2))
      .filter((commit) => ![REVIEW_BASE, REVIEW_CHANGE].includes(gitText(root, ["log", "-1", "--format=%s", commit])));
    if (unlanded.length) fail(`review: ${laneBranch} has commits the pipeline branch lacks; land them first: ${unlanded.reverse().join(" ")}`);
  }
  // The pipelines folder root both commits hold: the tip's, without its pipeline folders, plus the lane's view.
  const rootEntries = lsTree(root, tip, `${pipelinesRoot}/`, false).map((entry) => ({ ...entry, name: entry.path.slice(pipelinesRoot.length + 1) }));
  const pipelines = new Set((await pipelineFoldersIn(root, rootEntries)).map((entry) => `${entry.path}/`));
  const kept = [...lsTree(root, tip, `${pipelinesRoot}/`, true).filter((entry) => ![...pipelines].some((prefix) => entry.path.startsWith(prefix))), ...subset];
  const directory = mkdtempSync(join(tmpdir(), "rp-review-"));
  let base, change;
  try {
    const index = join(directory, "index");
    base = gitWithIndex(root, index, ["commit-tree", treeWithRoot(root, index, mergeBase, pipelinesRoot, kept), "-p", mergeBase, "-m", REVIEW_BASE]);
    change = gitWithIndex(root, index, ["commit-tree", treeWithRoot(root, index, tip, pipelinesRoot, kept), "-p", base, "-m", REVIEW_CHANGE]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
  const worktree = worktreesOf(root).find((record) => record.branch === laneBranch)?.path;
  if (worktree) gitText(worktree, ["reset", "--hard", "-q", change]);
  else gitText(root, ["update-ref", `refs/heads/${laneBranch}`, change]);
  const result = { branch: laneBranch, base, change, worktree: worktree ?? null };
  if (args.json) return process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`branch ${laneBranch}\nbase ${base}\nchange ${change}\n`);
}

// --- conventions --------------------------------------------------------------------

// The facts a placeholder may name, each valued for a role and its turn.
export const VOCABULARY = ["pipeline-slug", "role", "profile", "lane", "worktree", "branch", "base"];
// A placeholder: a name in single braces, in a guardrail's, a resource's, or the commit format's text, or a lane's brief.
const PLACEHOLDER = /(?<!\{)\{([a-z][a-z0-9-]*)\}(?!\})/g;
const VARIABLE = /^[a-z][a-z0-9-]*$/;
// What a guardrail and a resource hold as their text.
const CARRIED = [["guardrails", "rule"], ["resources", "resource"]];

// The conventions data of `.rp.md`'s JSON frontmatter or, with `local`, of `.rp.local.md`'s, which may have none and
// holds no `conventions`: the commit format, the guardrails and resources by name, each with its text and profiles, the
// agents, and the variables by name, each with its template. Whatever is malformed goes to `malformed(reason)`.
export function parseConventions(bytes, local, malformed) {
  const { text, error } = splitFrontmatter(bytes);
  if (error) malformed(error);
  if (text === null) return local ? {} : malformed("no frontmatter: the conventions data is a JSON object between --- lines");
  let data;
  try { data = JSON.parse(text); } catch (parseError) { malformed(`frontmatter is not valid JSON: ${parseError.message}`); }
  objectAt(data, "frontmatter", malformed, [...(local ? [] : ["conventions"]), "commit-format", ...CARRIED.map(([key]) => key), "agents", "variables"]);
  if (!local && data.conventions !== FORMAT) malformed(`conventions: ${JSON.stringify(data.conventions ?? null)} is not the current version, ${FORMAT}`);
  const conventions = {};
  if ("commit-format" in data) conventions.commitFormat = textAt(data["commit-format"], "commit-format", malformed);
  for (const [key, field] of CARRIED) {
    if (!(key in data)) continue;
    conventions[key] = {};
    for (const [name, entry] of Object.entries(objectAt(data[key], key, malformed))) {
      const at = entryName(key, name);
      objectAt(entry, at, malformed, [field, "profiles"]);
      const text = textAt(entry[field], `${at}.${field}`, malformed);
      if (!Array.isArray(entry.profiles) || !entry.profiles.length) malformed(`${at}.profiles: must be a non-empty list of profiles`);
      const other = entry.profiles.find((profile) => !PROFILES.includes(profile));
      if (other !== undefined) malformed(`${at}.profiles: ${JSON.stringify(other)} is no profile: ${PROFILES.join(", ")}`);
      conventions[key][name] = { text, profiles: entry.profiles };
    }
  }
  if ("agents" in data) conventions.agents = parseAgents(data.agents, malformed);
  if ("variables" in data) {
    conventions.variables = {};
    for (const [name, template] of Object.entries(objectAt(data.variables, "variables", malformed))) {
      const at = entryName("variables", name);
      if (!VARIABLE.test(name)) malformed(`${at}: a variable name must match ${VARIABLE.source}`);
      if (VOCABULARY.includes(name)) malformed(`${at}: a vocabulary fact is not declared: ${VOCABULARY.join(", ")}`);
      if (typeof template !== "string" || !template.trim()) malformed(`${at}: must be a template, a non-empty string`);
      for (const [placeholder, fact] of template.matchAll(PLACEHOLDER))
        if (!VOCABULARY.includes(fact)) malformed(`${at}: ${placeholder} names no vocabulary fact: ${VOCABULARY.join(", ")}`);
      conventions.variables[name] = template;
    }
  }
  return conventions;
}

// The conventions an assignment carries: the main checkout's `.rp.md`, with each entry its `.rp.local.md` names replacing
// or adding the committed one by name. Both files are validated whole; either malformed, or `.rp.md` missing, stops.
function readConventions(main) {
  const read = (name) => {
    const path = join(main, name);
    let stat;
    try { stat = statSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    if (!stat.isFile()) fail(`cannot read ${path}: not a regular file`);
    return parseConventions(readFileSync(path), name === ".rp.local.md", (reason) => fail(`${path}: ${reason}`));
  };
  const committed = read(".rp.md") ?? fail(`cannot read ${join(main, ".rp.md")}: missing`);
  const local = read(".rp.local.md") ?? {};
  return {
    commitFormat: local.commitFormat ?? committed.commitFormat ?? null,
    ...Object.fromEntries([...CARRIED.map(([key]) => key), "variables"].map((key) => [key, { ...committed[key], ...local[key] }])),
  };
}

// The guardrails or resources a profile's assignment carries, each as `### <name>` over `- <field>: <text>`, with the
// text's later lines indented under its first and its placeholders expanded by `expand`.
function carriedOf(conventions, key, profile, expand) {
  const field = CARRIED.find(([name]) => name === key)[1];
  return Object.entries(conventions[key]).filter(([, entry]) => entry.profiles.includes(profile))
    .map(([name, entry]) => `### ${name}\n\n- ${field}: ${expand(entry.text).split("\n").map((line, i) => i && line ? `  ${line}` : line).join("\n")}`);
}

// A text with each placeholder that names a vocabulary fact or a declared variable replaced by its value in `values`, in
// one pass; each placeholder it keeps is added to `kept`.
const expandText = (text, values, kept) => text.replace(PLACEHOLDER, (placeholder, name) => {
  if (Object.hasOwn(values, name)) return values[name];
  kept.add(placeholder);
  return placeholder;
});

// --- templates ----------------------------------------------------------------------

// The assignment templates, in the skill folder beside this script.
const TEMPLATES = fileURLToPath(new URL("../templates/", import.meta.url));
const SLOT = /\{\{([#^/]?)([^{}]*)\}\}/g;
const MARKER = /^\{\{([#^/])([a-z][a-z0-9-]*)\}\}$/;

// A value has something: a true flag, a non-empty text, or a list with an item.
const hasSomething = (value) => Array.isArray(value) ? value.length > 0 : Boolean(value);

// A template filled with `values`, each a text, a list of texts, or a flag (templates/README.md). Values are inserted
// as written and never read as template syntax. A template line that breaks the syntax, or a name without a value,
// stops the command, naming `where` and the line.
export function fill(template, values, where) {
  const lines = template.endsWith("\n") ? template.slice(0, -1).split("\n") : template.split("\n");
  const output = [], open = [];
  for (const [index, line] of lines.entries()) {
    const malformed = (reason) => fail(`${where}:${index + 1}: ${reason}`);
    const valueOf = (name) => Object.hasOwn(values, name) ? values[name] : malformed(`{{${name}}} has no value`);
    const marker = line.match(MARKER);
    if (marker) {
      const [, kind, name] = marker;
      if (kind !== "/") open.push({ name, kept: hasSomething(valueOf(name)) === (kind === "#") });
      else if (open.at(-1)?.name === name) open.pop();
      else malformed(`{{/${name}}} closes no open part`);
      continue;
    }
    let filled = "", last = 0;
    for (const slot of line.matchAll(SLOT)) {
      const [token, kind, name] = slot;
      if (kind) malformed(`${token} marks a part, which stands alone on its line`);
      if (!/^[a-z][a-z0-9-]*$/.test(name)) malformed(`${token} is no slot`);
      const value = valueOf(name), before = line.slice(last, slot.index);
      last = slot.index + token.length;
      if (typeof value === "string") { filled += before + value; continue; }
      if (!Array.isArray(value)) malformed(`{{${name}}} is a flag, which only a part tests`);
      if (last !== line.length) malformed(`{{${name}}} is a list, which ends its line`);
      const items = value.length ? value : ["none"];
      if (!`${filled}${before}`.trim()) filled += before + items.join(items.some((item) => item.includes("\n")) ? "\n\n" : "\n");
      else if (items.length === 1) filled += before + items[0];
      else filled = `${`${filled}${before}`.trimEnd()}\n${items.map((item) => `  - ${item.split("\n").join("\n    ")}`).join("\n")}`;
    }
    if (open.every((part) => part.kept)) output.push(filled + line.slice(last));
  }
  if (open.length) fail(`${where}: {{${open.at(-1).name}}} opens a part that is never closed`);
  return `${output.join("\n")}\n`;
}

// --- assign -------------------------------------------------------------------------

// The roles a thread file name names: both parties of each reading of `<n>-<opener>-<owner>-<artifact>.md`.
function partiesOf(path) {
  const middle = basename(path).match(new RegExp(`^[1-9]\\d*-(.+)-(?:${Object.keys(OWNERS).join("|")})\\.md$`))?.[1] ?? "";
  const parties = new Set();
  for (let at = middle.indexOf("-"); at !== -1; at = middle.indexOf("-", at + 1))
    if (parseRole(middle.slice(0, at)) && parseRole(middle.slice(at + 1))) [middle.slice(0, at), middle.slice(at + 1)].forEach((party) => parties.add(party));
  return parties;
}
// A role's artifact: its phase and the path it writes, the phase's artifact or its lane's candidate; null for a reviewer.
function artifactOf(role) {
  const phase = PHASES.find((each) => each.owner === role.profile);
  return phase ? { phase, path: role.lane ? candidateOf(phase, role.lane) : phase.artifact } : null;
}
// The pipeline files a role writes: its artifact or candidate, and every thread whose file name names it.
const writes = (role, path) => path === artifactOf(role)?.path || (kindOf(path)?.kind === "thread" && partiesOf(path).has(role.name));

// The turn the frontier gives a role: a producer's or the implementer's mode, the threads awaiting it, the changed
// inputs of its artifact, and the INVALID entries of the files it writes; null when no entry wakes it. An INVALID
// frontier wakes only the roles that write a rejected file, a producer or the implementer in Respond.
function turnOf(state, entries, role) {
  const turn = (mode, entry = {}) => ({ mode, threads: entry.threads ?? [], changed: entry.changed ?? [], malformed: [] });
  if (entries[0].action === "INVALID") {
    const malformed = entries.filter((entry) => writes(role, entry.target));
    return malformed.length ? { ...turn("Respond"), malformed } : null;
  }
  const artifact = artifactOf(role);
  for (const entry of entries) {
    if (!artifact) { if (entry.action === "review" && entry.target === role.lane) return turn(null, entry); continue; }
    if (entry.target !== artifact.phase.artifact) continue;
    if (role.lane && entry.action === "lane" && entry.lane === role.lane) return turn(statusOf(state, artifact.path).state === "missing" ? "Produce" : "Respond", entry);
    if (!role.lane && entry.action === "produce") return turn(artifact.phase === IMPLEMENTATION ? "Implement" : "Produce", entry);
    if (!role.lane && entry.action === "respond") return turn("Respond", entry);
    if (!role.lane && entry.action === "consolidate") return turn("Consolidate", entry);
  }
  return null;
}

// A review lane's request off an INVALID frontier: a later turn on its review thread while that is open, which then awaits
// the reviewer, with the commit the reviewer's last message names; else a first turn on a new review thread, numbered one
// past the highest in `threads/`.
function requestOf(pipeline, state, role) {
  const path = reviewThreadOf(state.threads.map((thread) => thread.path), role.lane);
  const latest = state.threads.find((thread) => thread.path === path);
  if (latest?.status === "open") return { thread: latest.path, last: latest.messages.findLast((message) => message.author === role.name).commit };
  const highest = Math.max(0, ...[...pipeline.files.keys()].map((rel) => Number(rel.match(/^threads\/([1-9]\d*)-/)?.[1] ?? 0)));
  return { thread: `threads/${highest + 1}-${role.name}-implementer-implementation.md`, last: null };
}

// Writes a role's assignment for the turn the frontier gives it (README.md § `assign`), and on a review lane's later turn
// the diff it reads beside it; prints the assignment's path and the role's model. Everything is read and checked before
// anything is written.
async function cmdAssign(args) {
  const { root, rel } = locate(args._[0] ?? fail("assign: missing <pipeline folder>"));
  const { folder, pipelinesRoot } = pipelineFolder(rel, "assign");
  const parsedRole = parseRole(args.role ?? fail("assign: --role <role> is required"));
  if (!parsedRole || parsedRole.profile === "owner") fail(`assign: --role names no role <profile>[-<lane>]: ${args.role}`);
  const role = { name: args.role, ...parsedRole };
  const conventions = readConventions(worktreesOf(root)[0].path ?? fail("assign: the repository has no main checkout"));
  const pipelineBranch = pipelineBranchOf(root, "assign");
  const { pipeline, state, frontier: entries } = await inspect(root, folder, pipelinesRoot, null);
  const turn = turnOf(state, entries, role)
    ?? fail(`assign: the frontier does not wake ${role.name}: ${entries.map((entry) => [entry.action, entry.target, entry.lane].filter(Boolean).join(" ")).join("; ")}`);

  // The seat: a role without a lane in the pipeline worktree, a lane in the worktree that has its lane branch checked out.
  const artifact = artifactOf(role);
  const branch = role.lane ? laneBranchOf(pipelineBranch, artifact?.phase, role.lane) : pipelineBranch;
  const seated = role.lane ? worktreesOf(root).find((record) => record.branch === branch)?.path : root;
  const worktree = seated ? realpathSync(seated) : fail(`assign: no worktree has ${branch} checked out`);
  const tip = requireCommit(worktree, "HEAD", "HEAD");
  const at = (path) => join(worktree, folder, path);

  // The carried texts, expanded for the role. Its base is the Base: the merge-base of its turn commit with `base`.
  const vocabulary = { "pipeline-slug": basename(folder), role: role.name, profile: role.profile, lane: role.lane ?? "", worktree, branch, base: baseOf(worktree, state.config.base, tip) };
  const variables = Object.fromEntries(Object.entries(conventions.variables).map(([name, template]) => [name, template.replace(PLACEHOLDER, (_, fact) => vocabulary[fact])]));
  const keeps = {};
  const expand = (key) => (text) => expandText(text, { ...vocabulary, ...variables }, keeps[key] ??= new Set());
  const laneEntry = role.lane ? state.config.lanes.find((lane) => lane.profile === role.profile && lane.id === role.lane) : null;
  const carried = {
    guardrails: carriedOf(conventions, "guardrails", role.profile, expand("guardrails")),
    resources: carriedOf(conventions, "resources", role.profile, expand("resources")),
    "commit-format": conventions.commitFormat === null ? "An imperative subject line." : expand("commit-format")(conventions.commitFormat),
    brief: laneEntry?.brief ? expand("brief")(laneEntry.brief) : "",
  };
  // A reviewer's repair request carries the commit format alone; every other assignment, every carried text.
  const repair = !artifact && entries[0].action === "INVALID";
  const carries = repair ? ["commit-format"] : Object.keys(carried);
  const models = modelsOf(state.config, role.profile, role.lane);
  const laterInputs = [...state.docs.values()].filter((doc) => doc.kind === "later" && (!artifact || doc.targets.includes(artifact.phase.artifact))).map((doc) => at(doc.path));
  const values = {
    ...vocabulary, ...carried,
    vocabulary: carries.some((key) => keeps[key]?.size) ? VOCABULARY.map((name) => `- \`{${name}}\`: ${vocabulary[name]}`.trimEnd()) : [],
    "turn-commit": tip,
    "base-branch": state.config.base,
    "subagent-model": models.subagents ?? "",
    "pipeline-folder": at(""), intent: at(INTENT), spec: at(PHASES[0].artifact), "design-doc": at(PHASES[1].artifact),
    "later-inputs": laterInputs,
    "malformed-files": turn.malformed.map((entry) => `INVALID ${entry.target}: ${entry.reason}`),
  };
  const prepared = [];
  let templateName;
  if (artifact) {
    templateName = role.profile;
    const changedSince = turn.changed.length && (gitText(worktree, ["log", "-1", "--format=%H", "HEAD", "--", `:(top,literal)${folder}/${artifact.path}`])
      || fail(`assign: no commit in ${worktree} changed ${folder}/${artifact.path}`));
    Object.assign(values, {
      mode: turn.mode,
      ...Object.fromEntries(["produce", "respond", "consolidate", "implement"].map((mode) => [mode, turn.mode.toLowerCase() === mode])),
      "supporting-folder": `${at(artifact.path.replace(/\.md$/, ""))}/`,
      "changed-inputs": turn.changed.map((input) => `${at(input)} — changed since ${changedSince}`),
      "lane-candidates": productionLanes(state.config, artifact.phase).map((lane) => `${lane.id} — ${join(root, folder, candidateOf(artifact.phase, lane.id))}`),
      threads: turn.threads.map(at),
      "write-to": at(artifact.path),
    });
  } else {
    // A review lane's worktree is at the change `rp review` built, on the review base.
    const subject = (commit) => gitText(worktree, ["log", "-1", "--format=%s", commit]);
    const reviewBase = commitOf(worktree, `${tip}^`);
    if (subject(tip) !== REVIEW_CHANGE || !reviewBase || subject(reviewBase) !== REVIEW_BASE)
      fail(`assign: ${worktree} is at ${tip}, not at a change rp review built: run rp review --lane ${role.lane}`);
    values["review-base"] = reviewBase;
    const request = repair ? null : requestOf(pipeline, state, role);
    templateName = repair ? "reviewer-repair" : request.last ? "reviewer-later" : "reviewer-first";
    if (request) values.thread = at(request.thread);
    if (request?.last) {
      const diff = gitText(worktree, ["rev-parse", "--path-format=absolute", "--git-path", "rp/reviewer.diff"]);
      const from = requireCommit(worktree, request.last, `assign: the commit ${role.name}'s last message names`);
      prepared.push([diff, gitBytes(worktree, ["diff", "--no-ext-diff", from, tip, "--", ".", `:(top,exclude,literal)${pipelinesRoot}`])]);
      values.diff = diff;
    }
  }
  const templatePath = join(TEMPLATES, `${templateName}.md`);
  let template;
  try { template = readFileSync(templatePath, "utf8"); } catch (error) { fail(`cannot read ${templatePath}: ${error.message}`); }
  const assignment = gitText(worktree, ["rev-parse", "--path-format=absolute", "--git-path", `rp/${role.profile}.md`]);
  prepared.unshift([assignment, fill(template, values, templatePath)]);
  for (const [path, contents] of prepared) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
  process.stdout.write(`assignment ${assignment}\n${models.model ? `model ${models.model}\n` : ""}`);
}

// --- cli --------------------------------------------------------------------------

const COMMANDS = {
  check: { run: cmdCheck, options: { "--ref": "value", "--json": "flag" } },
  stamp: { run: cmdStamp, options: { "--at": "value" } },
  pipelines: { run: cmdPipelines, options: { "--base": "value", "--issue": "value", "--json": "flag" } },
  review: { run: cmdReview, options: { "--lane": "value", "--json": "flag" } },
  assign: { run: cmdAssign, options: { "--role": "value" } },
};

export function parseArgs(command, argv) {
  const { options } = COMMANDS[command];
  const args = { _: [], json: false, ref: null, issue: null, at: null, base: null, lane: null, role: null };
  const used = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { args._.push(arg); continue; }
    const type = options[arg] ?? fail(`${command}: unknown option: ${arg}`);
    if (used.has(arg)) fail(`${command}: ${arg} may appear only once`);
    used.add(arg);
    const key = arg.slice(2);
    if (type === "flag") { args[key] = true; continue; }
    args[key] = i + 1 < argv.length ? argv[++i] : fail(`${command}: ${arg} expects a value`);
  }
  if (args._.length > 1) fail(`${command}: unexpected argument: ${args._[1]}`);
  return args;
}

const USAGE = `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
  node rp.mjs stamp <file> --at <commit>
  node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
  node rp.mjs review <pipeline folder> --lane <lane> [--json]
  node rp.mjs assign <pipeline folder> --role <role>

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
