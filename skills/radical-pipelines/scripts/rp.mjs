#!/usr/bin/env node
// rp — state tooling for Radical Pipelines.
// Zero dependencies. Serves the spec in ../reference/run/state.md; everything
// it does can be done with bare git. Commands: stamp, check, diff.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, realpathSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const SHORT = 12;

function die(msg) {
  process.stderr.write(`rp: ${msg}\n`);
  process.exit(1);
}

function repositoryFor(argument) {
  const requested = resolve(process.cwd(), argument);
  let at = existsSync(requested) && lstatSync(requested).isDirectory() ? requested : dirname(requested);
  while (!existsSync(at)) {
    const parent = dirname(at);
    if (parent === at) break;
    at = parent;
  }
  try {
    execFileSync("git", ["-C", at, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
    let root = at;
    while (!existsSync(join(root, ".git"))) {
      const parent = dirname(root);
      if (parent === root) die(`cannot locate a git repository for: ${argument}`);
      root = parent;
    }
    return { root, abs: requested };
  } catch {
    die(`cannot locate a git repository for: ${argument}`);
  }
}

// --- frontmatter ------------------------------------------------------------

// The body is every byte after the closing delimiter line, exactly as git hashes it: nothing is
// normalized. The delimiter lines alone tolerate a trailing `\r`; the closing one may end the file.
export function parseFrontmatter(raw, validate = validateFrontmatter) {
  const open = raw.match(/^---\r?\n/);
  if (!open) return { data: null, body: raw };
  const rest = raw.slice(open[0].length);
  const close = rest.match(/(?:^|\n)---\r?(?:\n|$)/);
  if (!close) return { data: null, body: raw, error: "missing closing --- delimiter" };
  const body = rest.slice(close.index + close[0].length);
  let object;
  try {
    object = JSON.parse(rest.slice(0, close.index));
  } catch (error) {
    return { data: null, body, error: `invalid JSON: ${error.message}` };
  }
  if (object === null || Array.isArray(object) || typeof object !== "object" || Object.getPrototypeOf(object) !== Object.prototype)
    return { data: null, body, error: "frontmatter must be a JSON object" };
  const data = new Map(Object.entries(object));
  const error = validate?.(data);
  if (error) return { data: null, body, error };
  return { data, body };
}

function validateFrontmatter(data) {
  const lists = new Set(["pins", "reviewed", "recurs", "depends", "commits", "changes", "target", "target-identity", "ids", "retired-ids"]);
  const scalars = new Set(["verdict", "brief", "outcome", "head", "lane", "attempt"]);
  const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
  const errors = [];
  for (const [key, value] of data) {
    if (lists.has(key) && !strings(value)) errors.push(`${key} must be a list of strings`);
    else if (scalars.has(key) && typeof value !== "string") errors.push(`${key} must be a string`);
    else if (key === "origin" && !(typeof value === "string" || (strings(value) && value.length))) errors.push("origin must be a string or non-empty list of strings");
    else if (key === "lane-packages") {
      const error = lanePackagesError(value);
      if (error) errors.push(error);
    }
    else if (!lists.has(key) && !scalars.has(key) && key !== "origin" && key !== "lane-packages" && !(typeof value === "string" || strings(value)))
      errors.push(`${key} must be a string or list of strings`);
    if ((key === "target" || key === "target-identity") && strings(value) && !value.length) errors.push(`${key} must be a non-empty list`);
    if (key === "changes" && strings(value) && value.some((pin) => !occurrencePinParts(pin))) errors.push("changes must contain occurrence pins");
  }
  return errors.join("; ") || null;
}

function lanePackagesError(value) {
  if (!Array.isArray(value)) return "lane-packages must be a list of [artifact path, consumed lane pins, reference pins]";
  const artifacts = new Set();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 3 || typeof entry[0] !== "string" || !entry[0])
      return "lane-packages must be a list of [artifact path, consumed lane pins, reference pins]";
    const [artifact, binding, reference] = entry;
    if (artifacts.has(artifact)) return `lane-packages has duplicate artifact path: ${artifact}`;
    if (!pinPackage(binding)) return `lane-packages consumed lane pins for ${artifact} must be a non-empty pin package`;
    if (!pinPackage(reference)) return `lane-packages reference pins for ${artifact} must be a non-empty pin package`;
    artifacts.add(artifact);
  }
  return null;
}

export function renderFrontmatter(data, body) {
  const object = Object.fromEntries([...data].filter(([, value]) => !Array.isArray(value) || value.length));
  return `---\n${JSON.stringify(object, null, 2)}\n---\n${body}`;
}

// --- identity: hash of the body only ----------------------------------------

// Computed in process as git computes a blob hash — `sha1("blob <bytes>\0" + bytes)` — so it
// equals `git hash-object --stdin` of the body, byte for byte, without spawning anything.
export function identity(text) {
  const { body } = parseFrontmatter(text);
  const bytes = Buffer.from(body, "utf8");
  return blobIdentity(bytes);
}

function blobIdentity(bytes) {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex").slice(0, SHORT);
}

function byteIdentity(bytes) {
  const raw = bytes.toString("latin1");
  const open = raw.match(/^---\r?\n/);
  if (!open) return blobIdentity(bytes);
  const rest = raw.slice(open[0].length);
  const close = rest.match(/(?:^|\n)---\r?(?:\n|$)/);
  return blobIdentity(close ? bytes.subarray(open[0].length + close.index + close[0].length) : bytes);
}

function readPipelineFile(abs) {
  if (!existsSync(abs) || !lstatSync(abs).isFile()) return null;
  const bytes = readFileSync(abs);
  const text = bytes.toString("utf8");
  return { ...parseFrontmatter(text), text, identity: byteIdentity(bytes) };
}

const IDENTITY = /^[0-9a-f]{12}$/;
const PATCH_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const changeMember = (patchId, occurrence) => `${patchId}:${occurrence}`;
const MATERIAL_PATH = /^changes\/([0-9a-f]{40}|[0-9a-f]{64})\.json$/;
const OCCURRENCE_PATH = /^changes\/occurrences\/([0-9a-f]{12})\.json$/;
const changeFile = (path) => path === CHANGE_CHECKPOINT || MATERIAL_PATH.test(path) || OCCURRENCE_PATH.test(path);
const changePackage = (changes, checkpoint) => new Map([
  ...(checkpoint === undefined ? [] : [[CHANGE_CHECKPOINT, checkpoint]]),
  ...changes.flatMap(({ occurrencePin, materialPin }) => [occurrencePin, materialPin].map((pin) => { const p = pinParts(pin); return [p.path, p.sha]; })),
]);
const publicChange = ({ commit, patchId, occurrence, occurrencePin, observation, material }) => ({ commit, patchId, occurrence, material: changePath(patchId), ...(occurrencePin ? { path: pinParts(occurrencePin).path } : {}), source: observation?.source ?? material.source });
const materialReferences = (data) => [
  data.get("pins"), data.get("reviewed"), data.get("changes"),
  ...(data.get("lane-packages") ?? []).flatMap(([, binding, reference]) => [binding, reference]),
].flatMap((pins) => pins ?? []).filter((pin) => { const p = typeof pin === "string" && pinParts(pin); return p && (MATERIAL_PATH.test(p.path) || OCCURRENCE_PATH.test(p.path)); });
function materialPinParts(pin) {
  if (typeof pin !== "string") return null;
  const parts = pinParts(pin);
  const path = parts && MATERIAL_PATH.exec(parts.path);
  return path && IDENTITY.test(parts.sha) ? { ...parts, patchId: path[1] } : null;
}

function occurrencePinParts(pin) {
  const p = typeof pin === "string" && pinParts(pin);
  const path = p && OCCURRENCE_PATH.exec(p.path);
  return path && path[1] === p.sha ? p : null;
}

const artifactFiles = (paths) => paths.filter((path) => path !== "run-config.md");
function readChangePins(read, paths) {
  return artifactFiles(paths).flatMap((path) => {
    const raw = read(path);
    if (raw === null) throw new Error(`${path}: missing recorded file`);
    const parsed = parseFrontmatter(raw.toString("utf8"));
    if (parsed.error) throw new Error(`${path}: INVALID FRONTMATTER: ${parsed.error}`);
    return materialReferences(parsed.data ?? new Map());
  });
}

function changeDelta(changes, reviewed) {
  const current = changePackage(changes);
  return {
    added: changes.filter(({ occurrencePin }) => { const p = pinParts(occurrencePin); return reviewed?.get(p.path) !== p.sha; }).map(publicChange),
    removed: [...(reviewed ?? [])].filter(([path, id]) => OCCURRENCE_PATH.test(path) && current.get(path) !== id).map(([path, id]) => `${path}@${id}`),
  };
}

function artifactBase(root, tip, intent, baseRef, command) {
  const startsFrom = [].concat(intent?.get("origin") ?? []).map((o) => o.match(/^starts-from\s+(\S+)$/)?.[1]).find(Boolean);
  const reference = startsFrom || baseRef || die(`${command}: --base <ref> is required — the artifact base branch — unless the intent declares starts-from`);
  let base;
  try {
    base = execFileSync("git", ["rev-parse", "--verify", "--quiet", `${reference}^{commit}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { die(`${command}: ${startsFrom ? "the starts-from branch" : "--base"} does not resolve: ${reference}`); }
  try {
    return execFileSync("git", ["merge-base", base, tip], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { die(`${command}: no merge-base between ${reference} and ${tip}`); }
}

const CHANGE_FOLDER = "changes";
const CHANGE_CHECKPOINT = `${CHANGE_FOLDER}/index.json`;
const renderJSON = (value) => `${JSON.stringify(value, null, 2)}\n`;
const renderCheckpoint = (changes) => renderJSON(changes.map((change) => change.occurrencePin));
const changePath = (patchId) => `${CHANGE_FOLDER}/${patchId}.json`;
const occurrencePath = (id) => `${CHANGE_FOLDER}/occurrences/${id}.json`;
const jsonObject = (value, keys) => value && !Array.isArray(value) && typeof value === "object" && Object.keys(value).every((key) => keys.includes(key));
const encodedBytes = (value) => typeof value === "string" && Buffer.from(value, "base64").toString("base64") === value;
const validSource = (source) => jsonObject(source, ["commit", "parents", "base"]) && typeof source.commit === "string" && PATCH_ID.test(source.commit) && Array.isArray(source.parents) && source.parents.every((oid) => typeof oid === "string" && PATCH_ID.test(oid)) && (source.base === null || (typeof source.base === "string" && PATCH_ID.test(source.base)));
const gitBytes = (root, args, input, env = process.env) => execFileSync("git", args, { cwd: root, input, env, maxBuffer: Infinity, stdio: ["pipe", "pipe", "pipe"] });
const DIFF_OPTIONS = ["-c", "core.quotePath=true", "diff-tree", "--no-commit-id", "--no-ext-diff", "--no-textconv", "--no-color", "--no-renames", "--no-relative", "--ignore-submodules=none", "--src-prefix=a/", "--dst-prefix=b/", "--diff-algorithm=myers", "--no-indent-heuristic", "--inter-hunk-context=0", "--binary", "--full-index", "--no-abbrev", "--unified=3", "-r"];

const objectStores = new Map();
function optionalBytes(path) {
  if (path === null) return null;
  try { return readFileSync(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function mergeEnvironment(root) {
  let raw;
  try { raw = gitBytes(root, ["config", "--null", "--get-regexp", "^(merge\\.|filter\\.|core\\.(autocrlf|eol|safecrlf|checkroundtripencoding)$)"]); }
  catch (error) { if (error.status !== 1 || error.stderr?.length) throw error; raw = Buffer.alloc(0); }
  const settings = raw.toString("utf8").split("\0").filter(Boolean).map((entry) => {
    const at = entry.indexOf("\n");
    return at < 0 ? [entry, "true"] : [entry.slice(0, at), entry.slice(at + 1)];
  });
  const pathBytes = (args) => {
    let value;
    try { value = gitBytes(root, args); }
    catch (error) { if (args[0] === "var" && error.status === 1 && !error.stdout?.length && !error.stderr?.length) return null; throw error; }
    if (value.at(-1) !== 10) throw new Error("invalid Git attribute path");
    const path = value.subarray(0, -1);
    if (!path.length) return null;
    return isAbsolute(path.toString("utf8")) ? path : Buffer.concat([Buffer.from(`${root}${sep}`), path]);
  };
  const global = ["GIT_ATTR_SYSTEM", "GIT_ATTR_GLOBAL"].map((name) => optionalBytes(pathBytes(["var", name]))).filter((bytes) => bytes !== null);
  return {
    settings,
    globalAttributes: Buffer.concat(global.flatMap((bytes) => [bytes, Buffer.from("\n")])),
    infoAttributes: optionalBytes(pathBytes(["rev-parse", "--git-path", "info/attributes"])),
  };
}

function isolatedGit(root, action, configuration = {}) {
  if (!objectStores.has(root)) objectStores.set(root, {
    objects: resolve(root, gitBytes(root, ["rev-parse", "--git-path", "objects"]).toString("utf8").trim()),
    format: gitBytes(root, ["rev-parse", "--show-object-format"]).toString("ascii").trim(),
  });
  const { objects, format } = objectStores.get(root);
  if (!["sha1", "sha256"].includes(format)) throw new Error("unsupported Git object format");
  const directory = mkdtempSync(join(tmpdir(), "rp-change-"));
  const env = {
    ...process.env, GIT_DIR: join(directory, ".git"), GIT_WORK_TREE: directory,
    GIT_INDEX_FILE: undefined, GIT_COMMON_DIR: undefined, GIT_NAMESPACE: undefined,
    GIT_OBJECT_DIRECTORY: objects, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_COUNT: "0", GIT_CONFIG_PARAMETERS: undefined, GIT_ATTR_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "RP", GIT_AUTHOR_EMAIL: "rp@example.invalid", GIT_COMMITTER_NAME: "RP", GIT_COMMITTER_EMAIL: "rp@example.invalid",
  };
  const git = (args, input) => gitBytes(directory, ["-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", "-c", "commit.gpgsign=false", ...args], input, env);
  const trace = join(directory, ".git", "merge-driver-status");
  try {
    git(["init", "--quiet", `--object-format=${format}`]);
    git(["config", "core.attributesFile", "/dev/null"]);
    for (const [key, value] of configuration.settings ?? []) {
      const quotedTrace = `'${trace.replace(/'/g, `'"'"'`).replace(/%/g, "%%")}'`;
      const setting = /^merge\..+\.driver$/i.test(key) ? `echo start >>${quotedTrace}\n(\n${value}\n)\nstatus=$?\necho end:$status >>${quotedTrace}\nexit $status` : value;
      git(["config", "--add", key, setting]);
    }
    if (configuration.globalAttributes !== undefined) {
      const path = join(directory, ".git", "global-attributes");
      writeFileSync(path, configuration.globalAttributes);
      git(["config", "core.attributesFile", path]);
    }
    if (configuration.infoAttributes) {
      const path = join(directory, ".git", "info", "attributes");
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, configuration.infoAttributes);
    }
    return action(git);
  } finally {
    try {
      const events = optionalBytes(trace)?.toString("ascii").trim().split("\n") ?? [];
      const starts = events.filter((event) => event === "start").length;
      const ends = events.filter((event) => /^end:\d+$/.test(event));
      if (events.length !== starts + ends.length || starts !== ends.length || ends.some((event) => Number(event.slice(4)) >= 126)) throw new Error("automatic merge unavailable: merge driver execution failed");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
}

function patchIdentity(root, patch) {
  const output = gitBytes(root, ["patch-id", "--verbatim"], patch).toString("ascii").trim().split(" ");
  if (output.length !== 2 || !output.every((oid) => PATCH_ID.test(oid))) throw new Error("invalid patch-id output");
  return output[0];
}

// Git's default automatic merge of the same ordered parents, without running hooks.
function automaticMerge(root, parents) {
  return isolatedGit(root, (git) => {
    git(["checkout", "--quiet", "--force", "--detach", parents[0]]);
    let tree;
    if (parents.length === 2) {
      let output;
      try { output = git(["-c", "merge.conflictStyle=merge", "merge-tree", "--write-tree", ...parents]); }
      catch (error) {
        if (error.status !== 1 || !error.stdout) throw error;
        output = error.stdout;
      }
      tree = output.toString("ascii").split("\n")[0];
    } else {
      try { git(["merge", "--no-commit", "--no-ff", "--no-edit", ...parents.slice(1)]); }
      catch (error) { throw new Error(`automatic merge unavailable: ${error.stderr?.toString("utf8").trim() || error.message}`); }
      tree = git(["write-tree"]).toString("ascii").trim();
    }
    if (!PATCH_ID.test(tree)) throw new Error("invalid automatic merge tree");
    return tree;
  }, mergeEnvironment(root));
}

function materialPatch(root, files) {
  return isolatedGit(root, (git) => {
    const trees = ["before", "after"].map((side) => {
      git(["read-tree", "--empty"]);
      const entries = files.filter((file) => file[side]).map((file) => {
        const entry = file[side];
        const oid = entry.mode === "160000" ? entry.oid : git(["hash-object", "-w", "--stdin"], Buffer.from(entry.bytes, "base64")).toString("ascii").trim();
        if (oid !== entry.oid) throw new Error(`change material blob differs: ${file.path} (${side})`);
        return Buffer.concat([Buffer.from(`${entry.mode} ${oid}\t`), Buffer.from(file.path, "base64"), Buffer.from([0])]);
      });
      git(["update-index", "-z", "--index-info"], Buffer.concat(entries));
      return git(["write-tree"]).toString("ascii").trim();
    });
    git(["read-tree", "--empty"]);
    return git([...DIFF_OPTIONS, "-p", ...trees]);
  });
}

const materialDigest = (payload) => createHash("sha256").update(JSON.stringify(payload)).digest("hex");

function changeMaterial(root, base, commit, pipelinesRoot, parents = []) {
  const raw = gitBytes(root, [...DIFF_OPTIONS, "--no-patch", "--raw", "-z", ...(base ? [base, commit] : ["--root", commit]), "--", ".", `:(top,exclude,literal)${pipelinesRoot}`]);
  if (!raw.length) return null;
  const records = raw.toString("latin1").split("\0");
  if (records.pop() !== "" || records.length % 2) throw new Error("invalid change paths");
  const files = [];
  for (let i = 0; i < records.length; i += 2) {
    const metadata = records[i].match(/^:(000000|100644|100755|120000|160000) (000000|100644|100755|120000|160000) ([0-9a-f]+) ([0-9a-f]+) [AMDT]$/);
    if (!metadata || !metadata.slice(3).every((oid) => PATCH_ID.test(oid))) throw new Error("invalid change metadata");
    const path = Buffer.from(records[i + 1], "latin1").toString("base64");
    const entry = (mode, oid, before) => {
      if (mode === "000000") return null;
      if (mode === "160000") return { mode, oid };
      let bytes = gitBytes(root, ["cat-file", "blob", oid]);
      if (before && parents.length > 1) {
        let text = bytes.toString("latin1");
        for (const [index, parent] of parents.entries()) text = text.replace(new RegExp(`^(<+|>+) ${parent}$`, "gm"), `$1 parent-${index + 1}`);
        bytes = Buffer.from(text, "latin1");
        oid = gitBytes(root, ["hash-object", "-w", "--stdin"], bytes).toString("ascii").trim();
      }
      return { mode, oid, bytes: bytes.toString("base64") };
    };
    files.push({ path, before: entry(metadata[1], metadata[3], true), after: entry(metadata[2], metadata[4], false) });
  }
  const patch = materialPatch(root, files);
  if (!patch.length) return null;
  const payload = { patchId: patchIdentity(root, patch), patch: patch.toString("base64"), files, source: { commit, parents, base } };
  return { ...payload, digest: materialDigest(payload) };
}

// One authored-change computation serves review packages, deltas, and report landing facts.
function authoredChanges(base, tip, { root, pipelinesRoot, observed = new Map() }) {
  try {
    const history = gitBytes(root, ["rev-list", "--reverse", "--topo-order", "--parents", tip, "--not", base]).toString("ascii").trim();
    return (history ? history.split("\n") : []).flatMap((line) => {
      const [commit, ...parents] = line.split(" ");
      if (![commit, ...parents].every((oid) => PATCH_ID.test(oid))) throw new Error("invalid commit history");
      const recorded = observed.get(commit);
      if (recorded) {
        if (JSON.stringify(recorded.source.parents) !== JSON.stringify(parents)) throw new Error(`${commit}: recorded parents differ`);
        return [{ commit, patchId: recorded.patchId, material: recorded.material, source: recorded.source }];
      }
      const from = parents.length > 1 ? automaticMerge(root, parents) : parents[0] ?? null;
      const material = changeMaterial(root, from, commit, pipelinesRoot, parents);
      return material ? [{ commit, patchId: material.patchId, material, source: material.source }] : [];
    });
  } catch (error) { throw new Error(`authored changes ${base}..${tip}: ${error.message}`); }
}

function changeStore(root, read, pins = []) {
  const cache = new Map();
  const identities = new Map();
  const observed = new Map();
  const observe = (source, patchId, material) => {
    const prior = observed.get(source.commit);
    if (prior && (prior.patchId !== patchId || prior.source.base !== source.base || JSON.stringify(prior.source.parents) !== JSON.stringify(source.parents))) throw new Error(`${source.commit}: conflicting recorded observations`);
    observed.set(source.commit, { source, patchId, material });
  };
  const get = (patchId, required = true) => {
    if (cache.has(patchId)) return cache.get(patchId);
    const path = changePath(patchId);
    const raw = read(path);
    if (raw === null && !required) return null;
    try {
      if (raw === null) throw new Error("missing material");
      const data = JSON.parse(raw.toString("utf8"));
      if (!jsonObject(data, ["patchId", "patch", "files", "source", "digest"]) || data.patchId !== patchId || !encodedBytes(data.patch) || !Array.isArray(data.files) || !data.files.length) throw new Error("invalid material");
      if (!validSource(data.source)) throw new Error("invalid provenance");
      const paths = new Set();
      for (const file of data.files) {
        const path = encodedBytes(file?.path) ? Buffer.from(file.path, "base64").toString("latin1") : "";
        if (!jsonObject(file, ["path", "before", "after"]) || !path || path.includes("\0") || path.split("/").some((part) => !part || part === "." || part === "..") || paths.has(file.path) || (!file.before && !file.after)) throw new Error("invalid material path");
        paths.add(file.path);
        for (const entry of [file.before, file.after]) {
          if (entry === null) continue;
          if (!jsonObject(entry, ["mode", "oid", "bytes"]) || !["100644", "100755", "120000", "160000"].includes(entry.mode) || typeof entry.oid !== "string" || !PATCH_ID.test(entry.oid) || (entry.mode === "160000" ? Object.hasOwn(entry, "bytes") : !encodedBytes(entry.bytes))) throw new Error("invalid material entry");
        }
      }
      const payload = { patchId: data.patchId, patch: data.patch, files: data.files, source: data.source };
      if (data.digest !== materialDigest(payload)) throw new Error("material digest differs");
      const patch = Buffer.from(data.patch, "base64");
      if (patchIdentity(root, patch) !== patchId || !materialPatch(root, data.files).equals(patch)) throw new Error("material patch differs");
      cache.set(patchId, data);
      identities.set(patchId, byteIdentity(raw));
      return data;
    } catch (error) { throw new Error(`${path}: ${error.message}`); }
  };
  const materialPin = (patchId) => { get(patchId); return `${changePath(patchId)}@${identities.get(patchId)}`; };
  const materialAt = (pin) => {
    const p = materialPinParts(pin);
    if (!p) throw new Error(`invalid material pin: ${pin}`);
    const material = get(p.patchId);
    if (materialPin(p.patchId) !== pin) throw new Error(`${p.path}: material differs from its pin`);
    observe(material.source, p.patchId, material);
    return material;
  };
  const occurrenceAt = (pin) => {
    const p = occurrencePinParts(pin);
    if (!p) throw new Error(`invalid occurrence pin: ${pin}`);
    const raw = read(p.path);
    if (raw === null) throw new Error(`${p.path}: missing occurrence`);
    if (byteIdentity(raw) !== p.sha) throw new Error(`${p.path}: occurrence differs from its pin`);
    let observation;
    try { observation = JSON.parse(raw.toString("utf8")); }
    catch (error) { throw new Error(`${p.path}: ${error.message}`); }
    if (!jsonObject(observation, ["patchId", "occurrence", "source", "material"]) || typeof observation.patchId !== "string" || !PATCH_ID.test(observation.patchId) || !Number.isSafeInteger(observation.occurrence) || observation.occurrence < 1 || !validSource(observation.source) || materialPinParts(observation.material)?.patchId !== observation.patchId) throw new Error(`${p.path}: invalid occurrence`);
    const material = materialAt(observation.material);
    observe(observation.source, observation.patchId, material);
    return { commit: observation.source.commit, patchId: observation.patchId, occurrence: observation.occurrence, source: observation.source, material, materialPin: observation.material, observation, occurrencePin: pin };
  };
  const resolve = (pin) => OCCURRENCE_PATH.test(pinParts(pin)?.path ?? "") ? occurrenceAt(pin) : materialAt(pin);
  for (const pin of pins) resolve(pin);
  return { get, materialPin, materialAt, occurrenceAt, resolve, observed };
}

function changeCheckpoint(read, path, stored) {
  const raw = read(path);
  if (raw === null) return [];
  try {
    const pins = JSON.parse(raw.toString("utf8"));
    if (!Array.isArray(pins)) throw new Error("expected occurrence pins");
    const counts = new Map();
    return pins.map((pin) => {
      const change = stored.occurrenceAt(pin);
      const next = (counts.get(change.patchId) ?? 0) + 1;
      if (change.occurrence !== next) throw new Error("occurrences must be numbered in sequence per patch");
      counts.set(change.patchId, next);
      return change;
    });
  } catch (error) { throw new Error(`${path}: invalid change checkpoint: ${error.message}`); }
}

function materialSelection(stored) {
  const selected = new Map();
  return (change) => {
    if (!selected.has(change.patchId)) {
      const existing = stored.get(change.patchId, false);
      const material = existing ?? change.material;
      const materialPin = existing ? stored.materialPin(change.patchId) : `${changePath(change.patchId)}@${identity(renderJSON(material))}`;
      selected.set(change.patchId, { material, materialPin });
    }
    return selected.get(change.patchId);
  };
}

async function currentChanges(root, abs, tip, intent, baseRef, command, read, pins = []) {
  const base = artifactBase(root, tip, intent, baseRef, command);
  const stored = changeStore(root, read, pins);
  const recorded = new Map(changeCheckpoint(read, CHANGE_CHECKPOINT, stored).map((change) => [changeMember(change.patchId, change.occurrence), change]));
  const history = await treeReader(root, join(abs, CHANGE_FOLDER), base, true);
  const historyRead = (path) => history?.read(path, true) ?? null;
  const historyStore = changeStore(root, (path) => historyRead(path.slice(CHANGE_FOLDER.length + 1)));
  const retained = changeCheckpoint(historyRead, "index.json", historyStore).map((change) => stored.occurrenceAt(change.occurrencePin));
  const live = authoredChanges(base, tip, { root, pipelinesRoot: relative(root, dirname(abs)) || ".", observed: stored.observed });
  const occurrences = new Map();
  const select = materialSelection(stored);
  const byCommit = new Map(retained.map((change) => [change.commit, change]));
  const changes = [...retained, ...live].map((change) => {
    const occurrence = (occurrences.get(change.patchId) ?? 0) + 1;
    occurrences.set(change.patchId, occurrence);
    if (change.occurrencePin) return change;
    const { material, materialPin } = select(change);
    const observation = { patchId: change.patchId, occurrence, source: change.source, material: materialPin };
    const id = identity(renderJSON(observation));
    const current = { ...change, occurrence, material, materialPin, observation, occurrencePin: `${occurrencePath(id)}@${id}` };
    byCommit.set(change.commit, current);
    const prior = recorded.get(changeMember(change.patchId, occurrence));
    return prior ? { ...prior, commit: change.commit } : current;
  });
  return { base, changes, stored, byCommit };
}

function recordChanges(root, abs, changes, checkpoint = false) {
  const stored = changeStore(root, (path) => {
    const file = containedPath("stamp", root, join(abs, path));
    return existsSync(file) ? readFileSync(file) : null;
  });
  for (const change of changes) {
    const path = containedPath("stamp", root, join(abs, changePath(change.patchId)));
    if (!stored.get(change.patchId, false)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, renderJSON(change.material), { flag: "wx" });
    }
    if (change.materialPin) stored.materialAt(change.materialPin);
    if (change.occurrencePin) {
      const entry = containedPath("stamp", root, join(abs, pinParts(change.occurrencePin).path));
      if (!existsSync(entry)) {
        mkdirSync(dirname(entry), { recursive: true });
        writeFileSync(entry, renderJSON(change.observation), { flag: "wx" });
      }
      stored.occurrenceAt(change.occurrencePin);
    }
  }
  if (checkpoint) {
    const path = containedPath("stamp", root, join(abs, CHANGE_CHECKPOINT));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, renderCheckpoint(changes));
  }
}
const VERDICTS = new Set(["approved", "rejected", "unsatisfiable"]);
let REPORT, reportOf; // `<phase>/tasks/<task id>-report-<k>.md`, defined with the id vocabulary below.
// Mirrors: the projection of a body's declarations, rewritten whole by every `--mirror`.
const MIRRORS = ["verdict", "brief", "target", "origin", "outcome", "recurs", "depends", "commits", "attempt"];
// The artifacts, in phase order, with what each one requires as pins.
const ARTIFACTS = [
  { path: "1-spec/spec.md", record: "1-spec/spec-research.md", prefix: "spec", phase: "1-spec", requires: ["0-intent/intent.md"] },
  { path: "2-design-doc/design-doc.md", record: "2-design-doc/design-doc-research.md", prefix: "design-doc", phase: "2-design-doc", requires: ["0-intent/intent.md", "1-spec/spec.md"] },
  { path: "3-build/build-plan.md", record: "3-build/build-plan-research.md", prefix: "build-plan", phase: "3-build", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md"], review: "build" },
  { path: "4-document/document-plan.md", record: "4-document/document-plan-research.md", prefix: "document-plan", phase: "4-document", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md"], requiresReview: "build", review: "document" },
];
const LANE_ID = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED_LANE_IDS = new Set(["tasks"]);
const LANE_PROFILES = new Map([
  ["spec-reviewer", { prefix: "spec", kind: "review" }],
  ["design-doc-reviewer", { prefix: "design-doc", kind: "review" }],
  ["build-plan-reviewer", { prefix: "build-plan", kind: "review" }],
  ["build-reviewer", { prefix: "build", kind: "review" }],
  ["document-plan-reviewer", { prefix: "document-plan", kind: "review" }],
  ["document-reviewer", { prefix: "document", kind: "review" }],
  ["spec-producer", { prefix: "spec", kind: "production" }],
  ["design-doc-producer", { prefix: "design-doc", kind: "production" }],
]);
function reviewArtifact(rel) {
  const name = basename(rel);
  for (const art of ARTIFACTS) {
    for (const prefix of [art.prefix, art.review].filter(Boolean)) {
      const match = name.match(new RegExp(`^${prefix}-review-(?:(.+)-)?([1-9]\\d*)\\.md$`));
      if (match) return { art, prefix, lane: match[1] ?? "", wave: Number(match[2]) };
    }
  }
  return null;
}

const laneProfile = (prefix, kind) => [...LANE_PROFILES].find(([, value]) => value.prefix === prefix && value.kind === kind)?.[0] ?? null;

// One path classifier supplies scopes, review identity, and lane-bearing files.
function pipelineFileRole(rel) {
  const parts = rel.split("/");
  const art = ARTIFACTS.find((candidate) => candidate.phase === parts[0]);
  if (!art) return { scope: "" };
  const review = reviewArtifact(rel);
  const scoped = parts.length === 3 && parts[1] !== "tasks";
  const scope = scoped ? `${parts[0]}/${parts[1]}/` : "";
  const placedReview = review && review.art === art && ((parts.length === 2) || scoped) ? review : null;
  const productionLane = scoped ? { id: parts[1], profile: laneProfile(art.prefix, "production") } : null;
  const namedReview = placedReview?.lane ? { id: placedReview.lane, profile: laneProfile(placedReview.prefix, "review") } : null;
  return {
    art,
    scope,
    productionLane,
    productionArtifact: scoped && parts[2] === basename(art.path),
    review: placedReview,
    namedReview,
  };
}

// The fingerprint of a lane: the identity of its whole declaration — id, brief, materials, after.
export function laneFingerprint({ id, brief = "", materials = "", after = "" }) {
  const list = (value, separator) => (Array.isArray(value) ? value : String(value).split(separator)).map((item) => String(item).trim()).filter(Boolean).join(separator);
  return identity(`${id}\n${String(brief).trim()}\n${list(materials, ",")}\n${list(after, "+")}\n`);
}

function runConfiguration(read, command) {
  const raw = read("run-config.md");
  if (raw === null || raw === undefined) throw new Error(`${command}: missing run-config.md`);
  const parsed = parseFrontmatter(raw, null);
  const invalid = (reason) => { throw new Error(`${command}: INVALID RUN CONFIG run-config.md: ${reason}`); };
  if (parsed.error) invalid(parsed.error);
  if (parsed.data === null) invalid("frontmatter is required");
  const object = Object.fromEntries(parsed.data);
  const optionalList = (container, key, label) => {
    if (!Object.hasOwn(container, key)) return null;
    if (!Array.isArray(container[key])) invalid(`${label} must be an array`);
    if (!container[key].length) invalid(`${label} must be non-empty when present`);
    return container[key];
  };
  const keys = new Set(["workflow", "target-phase", "lanes"]);
  const unknown = Object.keys(object).find((key) => !keys.has(key));
  if (unknown !== undefined) invalid(`unknown key: ${unknown}`);
  if (!["autonomous", "assisted"].includes(object.workflow)) invalid('workflow must be "autonomous" or "assisted"');
  if (!Number.isInteger(object["target-phase"]) || object["target-phase"] < 1 || object["target-phase"] > ARTIFACTS.length)
    invalid(`target-phase must be an integer from 1 to ${ARTIFACTS.length}`);
  const declaredLanes = optionalList(object, "lanes", "lanes") ?? [];
  const lanes = [];
  for (const [index, value] of declaredLanes.entries()) {
    const at = `lanes[${index}]`;
    if (value === null || Array.isArray(value) || typeof value !== "object") invalid(`${at} must be an object`);
    const allowed = new Set(["profile", "id", "brief", "materials", "after"]);
    const extra = Object.keys(value).find((key) => !allowed.has(key));
    if (extra !== undefined) invalid(`${at} has unknown key: ${extra}`);
    if (typeof value.profile !== "string") invalid(`${at}.profile must be a string`);
    const profile = LANE_PROFILES.get(value.profile);
    if (!profile) invalid(`${at}.profile is unknown: ${value.profile}`);
    if (typeof value.id !== "string") invalid(`${at}.id must be a string`);
    if (!LANE_ID.test(value.id)) invalid(`${at}.id is invalid: ${value.id}`);
    if (RESERVED_LANE_IDS.has(value.id)) invalid(`${at}.id uses the reserved name "${value.id}"`);
    if (typeof value.brief !== "string" || !value.brief.trim()) invalid(`${at}.brief must be a non-empty string`);
    if (profile.kind === "review" && Object.hasOwn(value, "after")) invalid(`${at}.after applies to production lanes only`);
    if (profile.kind === "production" && Object.hasOwn(value, "materials")) invalid(`${at}.materials applies to review lanes only`);
    const materials = optionalList(value, "materials", `${at}.materials`);
    const after = optionalList(value, "after", `${at}.after`);
    if (Object.hasOwn(value, "materials")) {
      if (materials.some((path) => typeof path !== "string")) invalid(`${at}.materials must be an array of paths`);
      for (const path of materials) {
        const parts = path.split("/");
        if (parts.length < 2 || parts.some((part) => !part || part === "." || part === "..") || path.startsWith("/") || path.includes("@"))
          invalid(`${at}.materials has invalid path: ${path}`);
      }
      if (new Set(materials).size !== materials.length) invalid(`${at}.materials has duplicate paths`);
    }
    if (Object.hasOwn(value, "after")) {
      if (after.some((id) => typeof id !== "string" || !LANE_ID.test(id))) invalid(`${at}.after must be an array of lane ids`);
      if (new Set(after).size !== after.length) invalid(`${at}.after has duplicate lane ids`);
    }
    const lane = {
      profile: value.profile,
      id: value.id,
      brief: value.brief,
      ...(Object.hasOwn(value, "materials") ? { materials: value.materials } : {}),
      ...(Object.hasOwn(value, "after") ? { after: value.after } : {}),
    };
    lanes.push({ ...lane, ...profile, fingerprint: laneFingerprint(lane) });
  }
  if (object.workflow === "assisted" && lanes.length) invalid("assisted workflow cannot declare lanes");
  for (const profile of LANE_PROFILES.keys()) {
    const declared = lanes.filter((lane) => lane.profile === profile);
    const duplicate = declared.find((lane, index) => declared.findIndex((other) => other.id === lane.id) !== index);
    if (duplicate) invalid(`duplicate lane id "${duplicate.id}" for profile "${profile}"`);
    if (LANE_PROFILES.get(profile).kind !== "production") continue;
    const ids = new Set(declared.map((lane) => lane.id));
    for (const lane of declared) for (const dependency of lane.after ?? [])
      if (!ids.has(dependency)) invalid(`lane "${lane.id}" comes after undeclared lane "${dependency}" of profile "${profile}"`);
    const visited = new Set();
    const visit = (id, stack = new Set()) => {
      if (stack.has(id)) invalid(`production lanes of profile "${profile}" depend on each other in a cycle`);
      if (visited.has(id)) return;
      visited.add(id);
      const lane = declared.find((candidate) => candidate.id === id);
      for (const dependency of lane?.after ?? []) visit(dependency, new Set([...stack, id]));
    };
    for (const lane of declared) visit(lane.id);
  }
  const decl = {};
  for (const lane of lanes) {
    decl[lane.prefix] ??= { review: [], production: [] };
    decl[lane.prefix][lane.kind].push({
      id: lane.id,
      fingerprint: lane.fingerprint,
      materials: lane.materials ?? null,
      after: lane.after ?? [],
    });
  }
  for (const [prefix, declaration] of Object.entries(decl)) {
    const branches = [
      ...declaration.review.map((lane) => `review-${lane.id}`),
      ...declaration.production.map((lane) => lane.id),
      ...declaration.production.flatMap((producer) => declaration.review.map((reviewer) => `${producer.id}-review-${reviewer.id}`)),
    ];
    const collision = branches.find((branch, index) => branches.indexOf(branch) !== index);
    if (collision) invalid(`lanes for "${prefix}" expand to the same auxiliary branch: ${collision}`);
  }
  return {
    workflow: object.workflow,
    targetPhase: object["target-phase"],
    lanes,
    decl,
  };
}
function reviewPackageMembers(art, prefix, scope, pinned, tasks, reports) {
  const path = (rel) => (scope ? `${scope}${basename(rel)}` : rel);
  const base = [path(art.path), path(art.record), ...pinned];
  const members = art.review && prefix === art.prefix ? [...base, ...tasks] : art.review && prefix === art.review ? [...base, ...tasks, ...reports] : base;
  return [...new Set(members)];
}

function pinPackage(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const parts = entries.map((entry) => typeof entry === "string" ? pinParts(entry) : null);
  if (parts.some((p) => !p?.path || !IDENTITY.test(p.sha)) || new Set(parts.map((p) => p.path)).size !== parts.length) return null;
  return new Map(parts.map((p) => [p.path, p.sha]));
}

// The only package comparison: equality of sets of (member, identity) pairs.
// Diagnostics are collected during the same comparison, never used as another predicate.
function equalPackages(a, b, differences = null) {
  if (!a || !b) {
    if (differences) differences.members = true;
    return false;
  }
  const pairs = (p) => new Set([...p].map((pair) => JSON.stringify(pair)));
  const left = pairs(a), right = pairs(b);
  let equal = true;
  for (const [source, other, otherPairs] of [[a, b, right], [b, a, left]]) {
    for (const pair of source) {
      if (!IDENTITY.test(pair[1]) || !otherPairs.has(JSON.stringify(pair))) {
        equal = false;
        if (differences) {
          if (!other.has(pair[0])) differences.members = true;
          else differences.identities.add(pair[0]);
        }
      }
    }
  }
  return equal;
}

const packagePins = (p) => [...p].map(([path, sha]) => `${path}@${sha}`);
const projectPackage = (p, paths) => p && new Map(paths.map((path) => [path, p.get(path)]));
const reviewProjection = (p, paths) => paths === null ? p : p && new Map([...projectPackage(p, paths), ...[...p].filter(([path]) => changeFile(path))]);
const inScope = (sc, rel) => (sc ? `${sc}${rel.split("/").pop()}` : rel);

function artifactReviewPackage(art, prefix, scope, consumed, identityOf, tasks = [], reports = [], changes = []) {
  if (!consumed) return null;
  const record = scope ? `${scope}${basename(art.record)}` : art.record;
  const inputs = new Map([...consumed].filter(([path]) => path !== record));
  const members = reviewPackageMembers(art, prefix, scope, [...new Set([...inputs.keys(), ...art.requires])], tasks, reports);
  return new Map([...members.map((path) => [path, inputs.has(path) || art.requires.includes(path) ? inputs.get(path) : identityOf(path)]), ...(prefix === art.review ? changePackage(changes, identityOf(CHANGE_CHECKPOINT)) : [])]);
}

const reviewLanesFor = (configuration, prefix) => [{ id: "", fingerprint: null, materials: null }, ...(configuration.decl[prefix]?.review ?? [])];
const laneMatches = (doc, fingerprint) => fingerprint === null || doc?.data.get("lane") === fingerprint;

function materialPathsFor(configuration, prefix, scope, lane) {
  const art = ARTIFACTS.find((candidate) => candidate.prefix === prefix || candidate.review === prefix);
  const materials = reviewLanesFor(configuration, prefix).find((candidate) => candidate.id === lane)?.materials ?? null;
  if (materials === null) return null;
  return materials.map((path) => scope && (path === art.path || path === art.record) ? inScope(scope, path) : path);
}

function reviewDocuments(inspect, prefix, scope) {
  return inspect.list().flatMap((path) => {
    const role = pipelineFileRole(path);
    if (role.scope !== scope || role.review?.prefix !== prefix) return [];
    const document = inspect.document(path);
    return document ? [{ ...document, data: document.data ?? new Map(), rel: path, lane: role.review.lane, wave: role.review.wave }] : [];
  });
}

function evaluateWave(configuration, prefix, scope, wave, { reference, required }, inspect) {
  const invalid = { valid: false, current: false, closed: false, reviews: [] };
  if (!wave || !reference) return invalid;
  const available = reviewDocuments(inspect, prefix, scope).filter((review) => review.wave === wave);
  const lanes = reviewLanesFor(configuration, prefix);
  const reviews = lanes.map((lane) => available.find((review) => review.lane === lane.id));
  for (let index = 0; index < reviews.length; index++) {
    const review = reviews[index];
    if (!review || !VERDICTS.has(review.data.get("verdict")) || !laneMatches(review, lanes[index].fingerprint)) return invalid;
    const paths = materialPathsFor(configuration, prefix, scope, lanes[index].id);
    if (!equalPackages(pinPackage(review.data.get("reviewed")), reviewProjection(reference, paths))) return invalid;
  }
  const valid = reviews.every((review) => review.data.get("verdict") === "approved");
  const applicable = equalPackages(reference, required);
  return { valid, current: valid && applicable, closed: applicable, reviews, package: reference };
}

function authoritativeReviewContext(configuration, prefix, scope, inspect) {
  const art = ARTIFACTS.find((candidate) => candidate.prefix === prefix || candidate.review === prefix);
  if (scope && art?.prefix === prefix) {
    const root = inspect.document(art.path);
    const recorded = laneReferences(root?.data).get(inScope(scope, art.path));
    const rootPins = pinPackage(root?.data?.get("pins"));
    const binding = rootPins && new Map([...rootPins].filter(([path]) => path.startsWith(scope)));
    const product = [inScope(scope, art.path), inScope(scope, art.record)];
    if (recorded && equalPackages(recorded.binding, binding) && equalPackages(projectPackage(binding, product), projectPackage(recorded.reference, product))) {
      const reviews = reviewDocuments(inspect, prefix, scope);
      const waves = new Set(reviews.filter((review) => recorded.binding.has(review.rel)).map((review) => review.wave));
      for (const wave of waves) {
        const state = evaluateWave(configuration, prefix, scope, wave, { reference: recorded.reference, required: recorded.reference }, inspect);
        if (!state.current) continue;
        const consumed = new Map([
          ...projectPackage(recorded.reference, product),
          ...state.reviews.map((review) => [review.rel, inspect.identityOf(review.rel)]),
        ]);
        if (equalPackages(consumed, recorded.binding)) return { reference: recorded.reference, binding: recorded.binding, closed: true };
      }
    }
  }
  const artifact = inspect.document(inScope(scope, art.path));
  const markdown = inspect.list();
  const plan = planOf(art.phase);
  const tasks = plan ? markdown.filter((path) => path.startsWith(`${art.phase}/tasks/`) && taskFile(plan).test(basename(path))) : [];
  const reports = markdown.filter((path) => reportOf(path) && path.startsWith(`${art.phase}/`));
  return {
    reference: artifactReviewPackage(art, prefix, scope, pinPackage(artifact?.data?.get("pins")), inspect.identityOf, tasks, reports, inspect.changesOf?.() ?? []),
    binding: null,
    closed: false,
  };
}

function validateRunConfiguration(configuration, inspect, command) {
  const invalid = (reason) => { throw new Error(`${command}: INVALID RUN CONFIG run-config.md: ${reason}`); };
  for (const lane of configuration.lanes.filter((candidate) => candidate.kind === "review" && candidate.materials)) {
    const art = ARTIFACTS.find((candidate) => candidate.prefix === lane.prefix || candidate.review === lane.prefix);
    const production = configuration.decl[lane.prefix]?.production ?? [];
    for (const scope of ["", ...production.map((candidate) => `${art.phase}/${candidate.id}/`)]) {
      const artifactPath = inScope(scope, art.path);
      const reference = authoritativeReviewContext(configuration, lane.prefix, scope, inspect).reference;
      if (!reference) continue;
      const selected = materialPathsFor(configuration, lane.prefix, scope, lane.id);
      const packagePaths = new Set(reference?.keys() ?? []);
      const outside = selected.filter((path) => !packagePaths.has(path));
      if (outside.length) invalid(`materials for review lane "${lane.id}" are outside the ${artifactPath} package: ${outside.join(", ")}`);
    }
  }
  return configuration;
}

// The pins-by-file table, shared by stamp and every live currency predicate.
function requiredPackageOf(prefix, sc, { identityOf, dependsOf, pinsByPath, taskFilesOf, reportFilesOf, waveValidity, latestWaveOf, productionLanesOf, lanePackageOf, changesOf = () => [] }) {
  const currentPackage = (paths) => new Map([...new Set(paths)].map((path) => [path, identityOf(path)]));
  const report = reportOf(prefix);
  if (report) {
    const [, phase, id] = report;
    const task = `${phase}/tasks/${id}.md`;
    const inputs = currentPackage([task, ...dependsOf(task).map((dep) => `${phase}/tasks/${dep}.md`)]);
    return { inputs, review: inputs, ready: true };
  }
  const art = ARTIFACTS.find((a) => a.prefix === prefix || a.review === prefix);
  const recorded = pinPackage(pinsByPath.get(inScope(sc, art.path)));
  const record = inScope(sc, art.record);
  // Retention includes adjudicated challenges until the producer replaces its package.
  const retained = [...(recorded?.keys() ?? [])].filter((path) => path !== record);
  const build = art.requiresReview ? [...taskFilesOf("3-build"), ...reportFilesOf("3-build")] : [];
  const inputs = currentPackage([...art.requires, ...build, ...retained]);
  let ready = true;
  const approvals = art.requires.map((path) => ARTIFACTS.find((a) => a.path === path)?.prefix).filter(Boolean);
  if (art.requiresReview) approvals.push(art.requiresReview);
  for (const input of approvals) {
    const wave = waveValidity(input, "", latestWaveOf(input, ""));
    if (wave.current) for (const pair of currentPackage(wave.reviews.map((r) => r.rel))) inputs.set(...pair);
    else ready = false;
  }
  const lanes = productionLanesOf(art.prefix);
  const dependencies = sc ? lanes.find((lane) => `${art.phase}/${lane.id}/` === sc)?.after ?? [] : lanes.map((lane) => lane.id);
  for (const lane of dependencies) {
    const dependency = lanePackageOf(art, `${art.phase}/${lane}/`);
    for (const pair of dependency.package) inputs.set(...pair);
    if (!dependency.ready) ready = false;
  }
  return {
    inputs,
    review: ready ? artifactReviewPackage(art, prefix, sc, inputs, identityOf, taskFilesOf(art.phase), reportFilesOf(art.phase), changesOf()) : null,
    ready,
  };
}

// A root records independent references, bound to the lane pins it consumed.
function laneReferences(data) {
  return new Map((data?.get("lane-packages") ?? []).map(([artifact, binding, reference]) =>
    [artifact, { binding: pinPackage(binding), reference: pinPackage(reference) }]));
}
// Ids are `<prefix>-<word>-<n>`: the prefix names the artifact class that originates the id, the
// word its concept. An artifact originates the words under its prefix, numbered from 1 without gaps
// and never reused; an id under another prefix is carried and must exist in the upstream artifact.
// A challenge targets an artifact's claimable ids. A plan declares a task by its file.
const IDS = {
  "0-intent/intent.md": { prefix: "intent", declares: ["constraint", "context", "proposal"], claimable: ["goal", "constraint"] },
  "1-spec/spec.md": { prefix: "spec", declares: ["requirement", "acceptance-criterion", "assumption"] },
  "2-design-doc/design-doc.md": { prefix: "design-doc", declares: ["decision", "assumption"], upstream: "1-spec/spec.md", carries: ["assumption"] },
  "3-build/build-plan.md": { prefix: "build", declares: ["assumption", "task"], upstream: "2-design-doc/design-doc.md", carries: ["assumption"] },
  "4-document/document-plan.md": { prefix: "document", declares: ["assumption", "task"], upstream: "3-build/build-plan.md", carries: ["assumption"] },
};
const PREFIX = Object.values(IDS).map((e) => e.prefix).join("|");
const ID = new RegExp(String.raw`^(${PREFIX})-([a-z]+(?:-[a-z]+)*)-([1-9]\d*)$`);
function parseId(id) {
  if (id === "intent-goal") return { prefix: "intent", word: "goal" };
  const m = id.match(ID);
  return m ? { prefix: m[1], word: m[2], n: Number(m[3]) } : null;
}
const numberOf = (id) => parseId(id).n;
// The vocabulary entry of a root or lane artifact, review, or record.
function idsEntry(rel) {
  const m = rel.match(/^([^/]+)\/(?:([^/]+)\/)?([^/]+)$/);
  if (!m || m[2] === "tasks") return null;
  const root = IDS[`${m[1]}/${m[3]}`];
  if (root) return root;
  const prefix = prefixOf(m[1]);
  if (prefix && reviewArtifact(rel)?.art.phase === m[1]) return { prefix, declares: ["finding"], history: false };
  if (prefix && ARTIFACTS.some((a) => a.phase === m[1] && basename(a.record) === m[3])) return { prefix, declares: ["question"] };
  return null;
}
// A Markdown file in a plan's tasks folder is a task or a report of that plan, or it is misnamed.
function strayTaskFile(rel) {
  const m = rel.match(/^([^/]+)\/tasks\/([^/]+\.md)$/);
  const plan = m && planOf(m[1]);
  return plan && !taskFile(plan).test(m[2]) && !reportOf(rel) ? `${m[2]} is not a ${plan.prefix} task or its report` : null;
}
const planOf = (phase) => Object.entries(IDS).find(([path, e]) => path.startsWith(`${phase}/`) && e.declares.includes("task"))?.[1] ?? null;
const taskFile = (entry) => new RegExp(String.raw`^${entry.prefix}-task-[1-9]\d*\.md$`);
const TASK_ID = String.raw`(?:${PREFIX})-task-[1-9]\d*`;
REPORT = new RegExp(String.raw`^([^/]+)/tasks/(${TASK_ID})-report-([1-9]\d*)\.md$`);
// The match of a report path whose task the phase's plan declares.
reportOf = (rel) => { const m = rel.match(REPORT); return m && planOf(m[1]) && taskFile(planOf(m[1])).test(`${m[2]}.md`) ? m : null; };
const prefixOf = (phase) => Object.entries(IDS).find(([path]) => path.startsWith(`${phase}/`))?.[1].prefix ?? null;
const claimableWords = (entry) => entry.claimable ?? entry.declares;
// The owner's files after synthesis: a constraint (its targets satisfy it) or a proposal (its
// targets adopt or refute it). Each is a challenge; a constraint is also owner territory.
const ownerFile = (rel) => rel.match(/^0-intent\/(constraint|proposal)-[1-9]\d*\.md$/)?.[1] ?? null;
// Owner territory: what the work must satisfy — the intent's Goal or a constraint.
function ownerTerritory(target) {
  const found = targetItem(target);
  return Boolean(found) && (found.path === "0-intent/intent.md" ? Boolean(found.item) : !found.item && ownerFile(found.path) === "constraint");
}
// A target's item, when its path and id are in the vocabulary.
function targetItem(target) {
  const [path, item] = target.split("#");
  const entry = IDS[path];
  if (!entry) return item === undefined && ownerFile(path) === "constraint" ? { path, item } : null;
  if (item === undefined) return { path, item };
  const id = parseId(item);
  return id && id.prefix === entry.prefix && claimableWords(entry).includes(id.word) ? { path, item } : null;
}

// Inline formatting marks that may wrap a declared value without being part of it.
const MARKS = "[*_`]*";
const ITEM = new RegExp(String.raw`^ {0,3}(?:#{1,6}|[-*+]|\d+[.)])[\t ]+${MARKS}([a-z][a-z-]*-[1-9]\d*)(?![A-Za-z0-9-])`, "gm");
// Every id the body declares, with how many times each is declared.
function declaredIds(body) {
  const counts = new Map();
  for (const [, id] of outsideFences(body).matchAll(ITEM)) if (parseId(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

// What an artifact declares now: the ids under its prefix and words in its body — a task by its
// file — and the ids it carries.
function currentIds(entry, body, tasks) {
  const own = (id) => parseId(id).prefix === entry.prefix && parseId(id).word !== "task" && entry.declares.includes(parseId(id).word);
  const carried = (id) => parseId(id).prefix !== entry.prefix && (entry.carries ?? []).includes(parseId(id).word);
  const declared = declaredIds(body);
  const duplicate = [...declared].find(([id, n]) => n > 1 && (own(id) || carried(id)));
  if (duplicate) return { invalid: `${duplicate[0]} is declared more than once` };
  const ids = [...declared.keys()].filter((id) => own(id) || carried(id));
  const files = entry.declares.includes("task") ? tasks.filter((name) => taskFile(entry).test(name)).map((name) => name.replace(/\.md$/, "")) : [];
  return { ids: new Set([...ids, ...files]) };
}

// Every id an artifact has declared: those recorded by a stamp and those it declares now.
function knownIds(data, body, rel, tasks) {
  const current = currentIds(idsEntry(rel), body, tasks);
  return new Set([...(data?.get("ids") ?? []), ...(current.ids ?? [])]);
}

// A review's findings: declared once, numbered from 1, recorded nowhere — a wave is a new file.
function declaredOnce(entry, body) {
  const current = currentIds(entry, body, []);
  if (current.invalid) return current;
  for (const word of entry.declares) {
    const own = [...current.ids].filter((id) => parseId(id).word === word).map(numberOf).sort((a, b) => a - b);
    const gap = own.findIndex((n, i) => n !== i + 1);
    if (gap !== -1) return { invalid: `${entry.prefix}-${word}-${gap + 1} is missing: ids are numbered from 1 without gaps` };
  }
  return {};
}

// The `ids` and `retired-ids` projection of an artifact, or why its declarations are invalid:
// `error` when the recorded fields are malformed, `invalid` when the declarations are.
// `read(path)` returns a pipeline file's text; `list(dir)` the file names of a pipeline folder.
function artifactIds(data, body, rel, read, list) {
  const entry = idsEntry(rel);
  const fields = ["ids", "retired-ids"];
  const stray = strayTaskFile(rel);
  if (stray) return { invalid: stray };
  if (!entry || entry.history === false) return fields.some((key) => data?.has(key)) ? { error: "ids and retired-ids belong to an artifact with recorded ids" } : entry ? declaredOnce(entry, body) : {};
  const accepted = (id) => {
    const p = parseId(id);
    return p && p.word !== "goal" && (p.prefix === entry.prefix ? entry.declares.includes(p.word) : (entry.carries ?? []).includes(p.word));
  };
  for (const key of fields) {
    const ids = data?.get(key) ?? [];
    if (ids.some((id) => !accepted(id)) || new Set(ids).size !== ids.length) return { error: `${key} must be a list of unique declared ids` };
  }
  const tasksOf = (path) => list(`${path.split("/")[0]}/tasks`) ?? [];
  const current = currentIds(entry, body, tasksOf(rel));
  if (current.invalid) return current;
  const seen = new Set(data?.get("ids") ?? []);
  const retired = new Set(data?.get("retired-ids") ?? []);
  for (const id of seen) if (!current.ids.has(id)) retired.add(id);
  for (const id of retired) {
    if (!seen.has(id)) return { error: `retired id ${id} is absent from ids` };
    if (current.ids.has(id)) return { invalid: `retired id ${id} is declared again` };
  }
  const known = new Set([...seen, ...current.ids]);
  const carried = [...known].filter((id) => parseId(id).prefix !== entry.prefix);
  if (carried.length) {
    const text = read(entry.upstream);
    const parsed = text === null || text === undefined ? null : parseFrontmatter(text);
    const upstream = parsed ? knownIds(parsed.data, parsed.body, entry.upstream, tasksOf(entry.upstream)) : new Set();
    const missing = carried.find((id) => !upstream.has(id));
    if (missing) return { invalid: `${missing} is not declared by ${entry.upstream}` };
  }
  for (const word of entry.declares) {
    const own = [...known].filter((id) => parseId(id).prefix === entry.prefix && parseId(id).word === word).map(numberOf).sort((a, b) => a - b);
    const gap = own.findIndex((n, i) => n !== i + 1);
    if (gap !== -1) return { invalid: `${entry.prefix}-${word}-${gap + 1} is missing: ids are numbered from 1 without gaps` };
  }
  const projection = new Map([["ids", [...known]], ["retired-ids", [...retired]]]);
  const drift = fields.filter((key) => {
    const stored = data?.get(key) ?? [];
    const expected = projection.get(key);
    return stored.length !== expected.length || expected.some((id) => !stored.includes(id));
  });
  return { projection, drift };
}

function targetAllowed(target, kind) {
  const found = targetItem(target);
  if (!found) return false;
  const { path, item } = found;
  if (kind === "claim") return Boolean(item) || ownerTerritory(target);
  return ARTIFACTS.some((a) => a.path === path) && (kind !== "failed report" || Boolean(item));
}

function targetExists(target, read, list, kind) {
  if (!targetAllowed(target, kind)) return false;
  const { path, item } = targetItem(target);
  const artifact = read(path);
  if (artifact === null || artifact === undefined) return !item && kind !== "claim";
  const source = item && parseId(item).word === "task" ? `${path.split("/")[0]}/tasks/${item}.md` : path;
  const text = source === path ? artifact : read(source);
  if (text === null || text === undefined) return false;
  const parsed = parseFrontmatter(text);
  const ids = parsed.error ? {} : artifactIds(parsed.data, parsed.body, source, read, list);
  const error = parsed.error ?? ids.error;
  if (error) die(`stamp: INVALID FRONTMATTER ${source}: ${error}`);
  if (ids.invalid) die(`stamp: INVALID IDS ${source}: ${ids.invalid}`);
  if (!item || source !== path) return true;
  // intent-goal addresses a section; other ids address items.
  if (item === "intent-goal") return /^## Goal[^\S\n]*$/mi.test(outsideFences(parsed.body));
  return declaredIds(parsed.body).has(item);
}

function challengeKind(rel, data) {
  const owner = ownerFile(rel);
  if (owner) return owner;
  const review = reviewArtifact(rel);
  if (review && rel.startsWith(`${review.art.phase}/`) && data.get("verdict") === "unsatisfiable") return "claim";
  if (reportOf(rel) && data.get("outcome") === "failed") return "failed report";
  return null;
}

function reportTarget(rel) {
  const report = reportOf(rel);
  return report ? `${ARTIFACTS.find((a) => a.phase === report[1]).path}#${report[2]}` : null;
}

// Field representation rules shared by stamp and check; existence belongs to landing.
function targetRepresentationErrors(rel, data, body) {
  if (data === null) return [];
  const kind = challengeKind(rel, data);
  const targets = data.get("target"), identities = data.get("target-identity");
  const errors = [];
  const invalid = (field, reason) => errors.push({ field, reason });
  if (!kind && (targets !== undefined || identities !== undefined || projectBody(body, rel).has("target"))) invalid("target", "only challenges may carry target fields");
  if (kind || targets !== undefined || identities !== undefined) {
    if (!Array.isArray(targets) || !targets.length) invalid("target", "expected a non-empty list");
    else {
      if (new Set(targets).size !== targets.length) invalid("target", "duplicate entries");
      if (kind === "claim" && targets.length !== 1) invalid("target", "a claim names one clause or constraint file");
      if (targets.some((target) => !targetAllowed(target, kind))) invalid("target", "outside the challenge's target territory");
      const ownTask = reportTarget(rel);
      if (ownTask && (targets.length !== 1 || targets[0] !== ownTask)) invalid("target", `expected its own task: ${ownTask}`);
    }
    if (ownerFile(rel)) {
      if (identities !== undefined) invalid("target-identity", "only claims and failed reports record target identities");
      if (!data.has("origin")) invalid("origin", "a constraint or proposal names its source");
    } else if (!Array.isArray(identities) || !identities.length) invalid("target-identity", "expected a non-empty list aligned with target");
    else {
      if (identities.length !== targets?.length) invalid("target-identity", "must have one identity per target");
      if (identities.some((id) => !IDENTITY.test(id))) invalid("target-identity", "expected 12-character hexadecimal identities");
    }
  }
  return errors;
}

function targetPairs(rel, data) {
  return (data.get("target") ?? ["?"]).map((target, i) => ({
    rel, target, targetPath: target.split("#")[0], targetIdentity: data.get("target-identity")?.[i],
  }));
}

function ownerAnswer(review, documents) {
  const artifact = reviewArtifact(review)?.art.path;
  return documents.find((doc) => ownerFile(doc.rel) === "constraint"
    && [].concat(doc.data.get("origin") ?? []).includes(review)
    && targetPairs(doc.rel, doc.data).some(({ targetPath }) => targetPath === artifact));
}

// Keep line positions while hiding Markdown fenced code from structural readers.
function outsideFences(text) {
  let fence = null;
  return text
    .split("\n")
    .map((line) => {
      if (fence) {
        const close = line.match(/^ {0,3}(`+|~+)[\t ]*\r?$/);
        if (close && close[1][0] === fence.character && close[1].length >= fence.length) fence = null;
        return "";
      }
      const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (open && (open[1][0] === "~" || !open[2].includes("`"))) {
        fence = { character: open[1][0], length: open[1].length };
        return "";
      }
      return line;
    })
    .join("\n");
}

// The projection of a body: every declaration in its fixed form, keyed as the frontmatter mirrors it.
export function projectBody(body, rel = "") {
  const structural = outsideFences(body);
  const p = new Map();
  const malformed = (message) => p.set("malformed", [...(p.get("malformed") ?? []), message]);
  const fixed = (name) => [...structural.matchAll(new RegExp(`^${name}:[^\\S\\n]*(.*)$`, "gm"))].map((m) => m[1].trim());
  const singleton = (name, key, accept, expectation) => {
    const lines = fixed(name);
    if (lines.length > 1) malformed(`${name}: repeated singleton declaration`);
    for (const value of lines) {
      if (accept(value)) p.set(key, value);
      else malformed(`${name}: expected ${expectation}, got: ${value}`);
    }
  };
  singleton("Verdict", "verdict", (value) => ["approved", "rejected", "unsatisfiable"].includes(value), "approved | rejected | unsatisfiable");
  singleton("Brief", "brief", Boolean, "text");
  singleton("Target", "target", (value) => {
    const targets = value.split(",").map((t) => t.trim());
    return targets.every((t) => /^[^#,\s]+(?:#[^#,\s]+)?$/.test(t)) && new Set(targets).size === targets.length;
  }, "<path>[#<id>][, …]");
  if (p.has("target")) p.set("target", p.get("target").split(",").map((t) => t.trim()));
  const originValid = (value) => /^(?:starts-from|re-attempts)\s+\S+$/.test(value) || /^issue\s+\S(?:.*\S)?$/.test(value) || /^(?:\S+\/\S+|\S+\.md(?:#\S+)?)$/.test(value);
  const origins = [];
  for (const value of fixed("Origin")) {
    if (originValid(value)) origins.push(value);
    else malformed(`Origin: expected issue <reference>, a source declaration, or a path, got: ${value}`);
  }
  if (origins.length === 1) p.set("origin", origins[0]);
  else if (origins.length > 1) p.set("origin", origins);
  singleton("Outcome", "outcome", (value) => ["completed", "failed", "blocked"].includes(value), "completed | failed | blocked");
  const recurs = [];
  for (const value of fixed("Prior finding")) {
    const match = value.match(new RegExp(String.raw`^(([^/#\s.][^/#\s]*(?:/[^/#\s.][^/#\s]*){1,2})#((?:${PREFIX})-finding-[1-9]\d*)),\s*resolution failed$`));
    const cited = match && reviewArtifact(match[2]), citing = reviewArtifact(rel);
    const prior = cited && match[2].startsWith(`${cited.art.phase}/`) && prefixOf(cited.art.phase) === parseId(match[3]).prefix
      && (!citing || (cited.prefix === citing.prefix && cited.wave < citing.wave));
    if (prior) recurs.push(match[1]);
    else malformed(`Prior finding: expected <an earlier review of this kind>#<finding id of its phase>, resolution failed, got: ${value}`);
  }
  if (recurs.length) p.set("recurs", recurs);
  // A task file's `Depends on:` line is a fixed line with a grammar: `none`, or task ids
  // separated by commas — nothing else on the line. Anything else is malformed, never mined.
  const dependencies = [...structural.matchAll(new RegExp(String.raw`^[\t ]*(?:[-*+][\t ]+)?${MARKS}Depends on:${MARKS}[\t ]*(.*)$`, "gm"))];
  for (const dep of dependencies) {
    const value = dep[1].trim();
    if (/^none$/i.test(value)) p.set("depends", []);
    else if (new RegExp(String.raw`^${TASK_ID}(\s*,\s*${TASK_ID})*$`).test(value)) {
      const ids = value.split(",").map((x) => x.trim());
      if (new Set(ids).size !== ids.length) malformed(`Depends on: duplicate ids: ${value}`);
      else p.set("depends", ids);
    } else malformed(`Depends on: expected none or task ids, got: ${value}`);
  }
  // A task report's `## Commits` section, up to the next heading: every line that starts with a
  // commit hash — after a bullet or a backtick — whatever follows it.
  const commits = structural.match(/^## Commits[^\S\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (commits) {
    const hashes = [...commits[1].matchAll(new RegExp(String.raw`^[\t ]*(?:[-*+][\t ]+)?${MARKS}([0-9a-f]{7,40})\b`, "gm"))].map((m) => m[1]);
    if (hashes.length) p.set("commits", hashes);
  }
  const report = reportOf(rel);
  if (report) {
    p.set("attempt", report[3]);
    if (challengeKind(rel, p) === "failed report" && !p.has("target"))
      p.set("target", [reportTarget(rel)]);
  }
  return p;
}

// The mirrors whose frontmatter value differs from the body's projection.
export function mirrorDrift(data, body, rel) {
  const p = projectBody(body, rel);
  const norm = (v) => JSON.stringify(v === undefined ? [] : [].concat(v));
  return MIRRORS.filter((k) => (k === "commits" ? !commitsMatch(p.get(k), data.get(k)) : norm(p.get(k)) !== norm(data.get(k))));
}

// Commits are stored canonical; a body may name the same commits by abbreviation.
function commitsMatch(bodyHashes = [], stored = []) {
  return bodyHashes.length === stored.length && bodyHashes.every((h, i) => stored[i].startsWith(h));
}

// A command path: lexically inside the repository, with no symlinked component.
function containedPath(command, root, abs) {
  const rel = relative(root, abs);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) die(`${command}: outside the repository: ${rel}`);
  let current = root;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) die(`${command}: refusing a symlinked path: ${rel}`);
  }
  return abs;
}

// The pipeline folder is the nearest ancestor of `file` that contains `0-intent`.
function pipelineFolder(root, file) {
  let dir = resolve(file, "..");
  while (dir.startsWith(root)) {
    if (existsSync(join(dir, "0-intent"))) return dir;
    const up = resolve(dir, "..");
    if (up === dir) break;
    dir = up;
  }
  die(`cannot locate the pipeline folder (no 0-intent ancestor) for ${relative(root, file)}`);
}

// --- stamp ------------------------------------------------------------------

// Replace every mirror with the body's projection. `target-identity` is what the stamp observed
// when the target landed: it is kept while the target stays the same.
function mirrorBody(body, fm, rel, identityOf) {
  const p = projectBody(body, rel);
  if (p.has("malformed")) die(`stamp: INVALID ${p.get("malformed").join("; ")} — a fixed line is mirrored whole or not at all; its author fixes it`);
  const previous = new Map(challengeKind(rel, fm) === challengeKind(rel, p) ? (fm.get("target") ?? []).map((target, i) => [target, fm.get("target-identity")?.[i]]) : []);
  for (const k of MIRRORS) fm.delete(k);
  for (const [k, v] of p) fm.set(k, v);
  if (!p.has("target") || ownerFile(rel)) fm.delete("target-identity");
  else fm.set("target-identity", p.get("target").map((target) => previous.get(target) || identityOf(target.split("#")[0]) || ""));
}

async function cmdStamp(args) {
  const file = args._[0] || die("stamp: missing <file>");
  const { root, abs } = repositoryFor(file);
  if (!existsSync(abs)) die(`stamp: no such file: ${file}`);
  containedPath("stamp", root, abs);

  const parsedFrontmatter = readPipelineFile(abs);
  if (!parsedFrontmatter) die(`stamp: no such file: ${file}`);
  if (parsedFrontmatter.error) die(`stamp: INVALID FRONTMATTER ${relative(root, abs)}: ${parsedFrontmatter.error}`);
  const { data, body } = parsedFrontmatter;
  const fm = data ?? new Map();
  const landedCommits = fm.get("commits") ?? [];
  const landedChanges = fm.get("changes") ?? [];
  const base = pipelineFolder(root, abs);
  const rel = relative(base, abs);
  const landedTargets = new Map((fm.get("target") ?? []).map((target, i) => [target, ownerFile(rel) || fm.get("target-identity")?.[i]]));
  const readAt = (path) => {
    const source = readPipelineFile(join(base, path));
    if (source?.error) die(`stamp: INVALID FRONTMATTER ${path}: ${source.error}`);
    return source;
  };
  const previousKind = challengeKind(rel, fm);
  const listAt = (dir) => (existsSync(join(base, dir)) ? readdirSync(join(base, dir)) : null);
  const ids = artifactIds(data, body, rel, (path) => readAt(path)?.text ?? null, listAt);
  if (ids.error) die(`stamp: INVALID FRONTMATTER ${rel}: ${ids.error}`);
  if (ids.invalid) die(`stamp: INVALID IDS ${rel}: ${ids.invalid}`);
  const report = reportOf(rel);
  const relParts = rel.split("/");
  const role = pipelineFileRole(rel);
  const phaseReview = role.review?.prefix === role.art?.review && Boolean(role.review);
  const changeContext = { root, pipelinesRoot: relative(root, dirname(base)) || "." };
  const readChanges = (path) => {
    const file = containedPath("stamp", root, join(base, path));
    return existsSync(file) ? readFileSync(file) : null;
  };
  let changeState;
  const inspectChanges = async () => changeState ??= await currentChanges(root, base, "HEAD", readAt("0-intent/intent.md")?.data, args.base, "stamp", readChanges,
    readChangePins(readChanges, walk(base).filter((entry) => entry.type === "blob" && entry.rel.endsWith(".md")).map((entry) => entry.rel)));
  const materials = [];
  let checkpoint = null;
  const artifact = ARTIFACTS.find((a) => relParts[0] === a.phase && relParts.at(-1) === basename(a.path) && relParts.length <= 3);
  const siblingRecord = artifact ? `${relParts.slice(0, -1).join("/")}/${basename(artifact.record)}` : null;

  const laneForPath = () => {
    const needsConfiguration = role.namedReview || role.productionArtifact || (role.review && role.productionLane);
    if (!needsConfiguration) return null;
    const config = runConfiguration((path) => readPipelineFile(join(base, path))?.text ?? null, "stamp");
    validateRunConfiguration(config, {
      list: () => walk(base).filter((entry) => entry.type === "blob" && entry.rel.endsWith(".md")).map((entry) => entry.rel),
      document: (path) => readAt(path),
      identityOf: (path) => readAt(path)?.identity ?? null,
    }, "stamp");
    const production = role.productionLane && config.lanes.find((lane) => lane.profile === role.productionLane.profile && lane.id === role.productionLane.id);
    if (role.productionLane && !production) die(`stamp: path names an undeclared lane: ${rel}`);
    if (role.namedReview) {
      return config.lanes.find((lane) => lane.profile === role.namedReview.profile && lane.id === role.namedReview.id) ??
        die(`stamp: path names an undeclared lane: ${rel}`);
    }
    return role.productionArtifact ? production : null;
  };
  const priorLane = fm.get("lane");
  fm.delete("lane");
  const pathLane = laneForPath();
  if (pathLane) fm.set("lane", pathLane.fingerprint);
  const laneChanged = priorLane !== fm.get("lane") || Boolean(data?.has("lane")) !== fm.has("lane");

  const pinList = (paths) =>
    paths.map((p) => {
      const target = containedPath("stamp", root, resolve(root, p));
      if (!target.startsWith(base + "/")) die(`stamp: a pin stays inside the pipeline folder: ${p}`);
      const path = relative(base, target);
      const sha = readAt(path)?.identity ?? die(`stamp: cannot pin missing file: ${p}`);
      return `${path}@${sha}`;
    });

  let consumed = false;
  if (args.pin.length) {
    const pins = pinList(args.pin);
    if (pins.some((pin) => pinParts(pin)?.path === siblingRecord)) die(`stamp: an artifact never pins its sibling record: ${siblingRecord}`);
    if (artifact && rel === artifact.path) {
      const previous = laneReferences(fm);
      const recorded = pinPackage(pins);
      const references = [];
      for (const path of recorded?.keys() ?? []) {
        const parts = path.split("/");
        if (parts.length !== 3 || parts[0] !== artifact.phase || parts[1] === "tasks" || parts[2] !== basename(artifact.path)) continue;
        const scope = `${dirname(path)}/`;
        const binding = new Map([...recorded].filter(([member]) => member.startsWith(scope)));
        const prior = previous.get(path);
        const input = readAt(path).data;
        const reference = prior && equalPackages(prior.binding, binding) ? prior.reference :
          artifactReviewPackage(artifact, artifact.prefix, scope, pinPackage(input?.get("pins")), (member) => readAt(member)?.identity ?? null);
        if (reference) references.push([path, packagePins(binding), packagePins(reference)]);
      }
      fm.delete("lane-packages");
      if (references.length) fm.set("lane-packages", references);
    }
    fm.set("pins", pins);
    consumed = true;
  }
  if (args.reviewed.length) {
    if (fm.has("reviewed")) die("stamp: reviewed pins are immutable; a changed review is a new file");
    const changes = phaseReview ? (await inspectChanges()).changes : [];
    if (phaseReview) {
      materials.push(...changes);
      checkpoint = changes;
    }
    const checkpointIdentity = phaseReview ? identity(renderCheckpoint(changes)) : undefined;
    const reviewed = [...pinList(args.reviewed), ...packagePins(changePackage(changes, checkpointIdentity))];
    const review = reviewArtifact(rel);
    if (review && rel.startsWith(`${review.art.phase}/`) && !review.lane) {
      const scope = rel.split("/").length === 3 ? `${dirname(rel)}/` : "";
      const artifactPath = scope ? `${scope}${basename(review.art.path)}` : review.art.path;
      const artifactFile = join(base, artifactPath);
      const artifactData = existsSync(artifactFile) ? readAt(artifactPath).data : null;
      const consumed = pinPackage(artifactData?.get("pins"));
      if (!consumed)
        die(`stamp: INVALID REVIEW PACKAGE ${rel}: artifact package is unrecorded or invalid`);
      const taskFolder = join(base, review.art.phase, "tasks");
      const names = existsSync(taskFolder) ? readdirSync(taskFolder) : [];
      const tasks = names.filter((name) => planOf(review.art.phase) && taskFile(planOf(review.art.phase)).test(name)).map((name) => `${review.art.phase}/tasks/${name}`);
      const reports = names.filter((name) => reportOf(`${review.art.phase}/tasks/${name}`)).map((name) => `${review.art.phase}/tasks/${name}`);
      const expected = artifactReviewPackage(review.art, review.prefix, scope, consumed, (path) => path === CHANGE_CHECKPOINT && phaseReview ? checkpointIdentity : readAt(path)?.identity ?? null, tasks, reports, changes);
      if (!equalPackages(pinPackage(reviewed), expected)) die(`stamp: INVALID REVIEW PACKAGE ${rel}: reviewed must equal the complete artifact package`);
    }
    fm.set("reviewed", reviewed);
    if (report) {
      const expected = requiredPackageOf(rel, "", {
        identityOf: (path) => readAt(path)?.identity ?? null,
        dependsOf: (task) => {
          return [].concat(readAt(task)?.data?.get("depends") ?? []);
        },
      }).review;
      if (!equalPackages(pinPackage(reviewed), expected)) die(`stamp: a task report reviews exactly its task and its dependencies: --reviewed ${[...expected.keys()].join(" --reviewed ")}`);
    }
    if (report) {
      const prior = readdirSync(join(base, report[1], "tasks"))
        .map((name) => ({ name, match: name.match(new RegExp(`^${report[2]}-report-(\\d+)\\.md$`)) }))
        .filter(({ match }) => match && Number(match[1]) !== Number(report[3]))
        .filter(({ name, match }) => {
          const priorRel = `${report[1]}/tasks/${name}`;
          const parsed = readAt(priorRel);
          return pinPackage(parsed.data?.get("reviewed")) && parsed.data.get("attempt") === match[1] && ["completed", "failed", "blocked"].includes(parsed.data.get("outcome")) && mirrorDrift(parsed.data, parsed.body, priorRel).length === 0;
        })
        .map(({ match }) => Number(match[1]));
      const next = Math.max(0, ...prior) + 1;
      if (Number(report[3]) !== next) die(`stamp: INVALID REPORT ${rel}: expected attempt ${next}`);
    }
    consumed = true;
  }
  if (args.mirror) {
    mirrorBody(body, fm, rel, (path) => readAt(path)?.identity ?? null);
    const kind = challengeKind(rel, fm);
    const targets = fm.get("target") ?? [];
    const readable = (path) => {
      return readAt(path)?.text ?? null;
    };
    if (kind) {
      for (const target of targets)
        if (!(previousKind === kind && landedTargets.get(target)) && !targetExists(target, readable, listAt, kind)) die(`stamp: INVALID TARGET ${target}`);
    }
    for (const prior of fm.get("recurs") ?? []) {
      const [path, id] = prior.split("#");
      const text = readable(path);
      if (text === null || !declaredIds(parseFrontmatter(text).body).has(id)) die(`stamp: INVALID PRIOR FINDING ${prior}: the review declares no such finding`);
    }
  }
  const targetError = targetRepresentationErrors(rel, fm, body)[0];
  if (targetError) die(`stamp: ${targetError.field === "target" ? `INVALID TARGET ${(fm.get("target") ?? []).join(", ") || "?"}` : `INVALID FRONTMATTER ${rel}: ${targetError.field}`}: ${targetError.reason}`);
  // Preserve observed changes while the commit declaration remains the same.
  if (report && landedCommits.length && commitsMatch(fm.get("commits"), landedCommits)) {
    fm.set("commits", landedCommits);
    fm.set("changes", landedChanges);
  } else if (fm.has("commits")) {
    const canonical = [].concat(fm.get("commits") ?? []).map((h) => {
      try {
        return execFileSync("git", ["rev-parse", "--verify", "--quiet", `${h}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
      } catch {
        die(`stamp: ## Commits names a commit that does not exist or is ambiguous: ${h}`);
      }
    });
    fm.set("commits", canonical);
    if (report) {
      const state = await inspectChanges();
      const observed = canonical.flatMap((commit) => {
        const change = state.byCommit.get(commit);
        if (change) return [change];
        if (authoredChanges(`${commit}^@`, commit, { ...changeContext, observed: state.stored.observed }).length) die(`stamp: reported change is outside the current pipeline: ${commit}`);
        return [];
      });
      materials.push(...observed);
      fm.set("changes", observed.map((change) => change.occurrencePin));
    }
  } else if (report) fm.delete("changes");
  if (report) {
    fm.set("attempt", report[3]);
  }
  if (phaseReview || report) fm.delete("head");
  else if (consumed) {
    try {
      fm.set("head", execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim().slice(0, SHORT));
    } catch {
      /* no commits yet: no head to record */
    }
  }
  for (const [key, value] of ids.projection ?? []) {
    if (value.length) fm.set(key, value);
    else fm.delete(key);
  }
  const frontmatterError = validateFrontmatter(fm);
  if (frontmatterError) die(`stamp: INVALID FRONTMATTER ${rel}: ${frontmatterError}`);
  if (!fm.size && !laneChanged) {
    process.stdout.write(`nothing to mirror ${relative(root, abs)}\n`);
    return;
  }

  const stored = changeStore(root, readChanges);
  for (const pin of materialReferences(fm))
    if (!materials.some((change) => change.materialPin === pin || change.occurrencePin === pin)) stored.resolve(pin);
  recordChanges(root, base, materials, checkpoint !== null);
  writeFileSync(abs, renderFrontmatter(fm, body));
  process.stdout.write(`stamped ${relative(root, abs)}\n`);
}

// --- check ------------------------------------------------------------------

function pinParts(entry) {
  const at = entry.lastIndexOf("@");
  return at === -1 ? null : { path: entry.slice(0, at), sha: entry.slice(at + 1) };
}

// The pipeline tree holds files and folders only: a symlink is never followed, it is reported.
function walk(dir, rel = "", out = []) {
  const st = lstatSync(dir);
  const type = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "tree" : st.isFile() ? "blob" : "other";
  out.push({ rel, type });
  if (type === "tree") for (const name of readdirSync(dir)) walk(join(dir, name), rel ? `${rel}/${name}` : name, out);
  return out;
}

// The manifest is the boundary: unlisted members may be unwritten; listed members must be readable.
function indexedTreeReader(entries, load, context) {
  const members = new Map(entries.map((entry) => [entry.rel, entry]));
  const fail = (rel, reason) => new Error(`check: cannot read ${context}${rel ? `/${rel}` : ""}: ${reason}`);
  if (members.get("")?.type !== "tree") throw fail("", "expected a pipeline tree");
  for (const entry of entries)
    if (!["tree", "blob", "symlink"].includes(entry.type)) throw fail(entry.rel, `not a regular blob or directory: ${entry.type}`);
  const contents = new Map(), texts = new Map();
  return {
    list: () => entries.filter((e) => e.type !== "symlink" && e.rel.endsWith(".md")).map((e) => e.rel),
    symlinks: () => entries.filter((e) => e.type === "symlink").map((e) => e.rel),
    read: (rel, bytes = false) => {
      const entry = members.get(rel);
      if (!entry) return null;
      try {
        if (entry.type !== "blob") throw new Error(`not a regular blob: ${entry.type}`);
        if (!contents.has(rel)) {
          const content = load(entry);
          if (!Buffer.isBuffer(content)) throw new Error("listed entry has no readable content");
          contents.set(rel, content);
        }
        if (bytes) return contents.get(rel);
        if (!texts.has(rel)) texts.set(rel, contents.get(rel).toString("utf8"));
        return texts.get(rel);
      } catch (error) { throw fail(rel, error.message); }
    },
  };
}

function gitStream(root, args, input) {
  const child = spawn("git", args, { cwd: root, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
  const errors = [];
  child.stderr.on("data", (chunk) => errors.push(chunk));
  let failure;
  const finished = new Promise((resolve) => {
    child.on("error", (error) => { failure = error; });
    child.on("close", (code, signal) => resolve(failure ?? (code === 0 ? null : new Error(`git ${args[0]} exited ${signal ?? code}: ${Buffer.concat(errors).toString("utf8").trim()}`))));
  });
  if (input !== undefined) {
    child.stdin.on("error", (error) => { failure = error; });
    child.stdin.end(input);
  }
  return { child, finished };
}

// A tree to read the pipeline from: the working tree, or a ref (`--ref`).
async function treeReader(root, abs, ref, optional = false) {
  const pipelineRel = relative(root, abs);
  if (!ref) {
    let entries;
    try { entries = walk(abs); }
    catch (error) { throw new Error(`check: cannot read worktree:${pipelineRel}: ${error.message}`); }
    return indexedTreeReader(entries, ({ rel }) => {
      const path = join(abs, rel);
      if (!lstatSync(path).isFile()) throw new Error("listed entry is no longer a regular file");
      return readFileSync(path);
    }, `worktree:${pipelineRel}`);
  }
  const listing = gitStream(root, ["ls-tree", "-rtz", ref, "--", pipelineRel]);
  const entries = [];
  let pending = Buffer.alloc(0);
  let reading = pipelineRel;
  try {
    for await (const chunk of listing.child.stdout) {
      pending = Buffer.concat([pending, chunk]);
      let end;
      while ((end = pending.indexOf(0)) !== -1) {
        const line = pending.subarray(0, end).toString("utf8");
        const tab = line.indexOf("\t");
        const path = line.slice(tab + 1);
        reading = path || pipelineRel;
        const metadata = line.slice(0, tab).match(/^(040000|100644|100755|120000|160000) (tree|blob|commit) ([0-9a-f]{40}|[0-9a-f]{64})(?![\s\S])/);
        if (tab === -1 || !metadata || !path) throw new Error("invalid ls-tree entry");
        const [, mode, type, oid] = metadata;
        if (type !== ({ "040000": "tree", "100644": "blob", "100755": "blob", "120000": "blob", "160000": "commit" })[mode]) throw new Error("invalid ls-tree mode/type");
        const scoped = path === pipelineRel || path.startsWith(`${pipelineRel}/`);
        if (!scoped && !(type === "tree" && pipelineRel.startsWith(`${path}/`))) throw new Error("ls-tree entry outside the pipeline");
        if (scoped) entries.push({ type: mode === "120000" ? "symlink" : type, oid, rel: path === pipelineRel ? "" : path.slice(pipelineRel.length + 1) });
        pending = pending.subarray(end + 1);
      }
    }
    const failure = await listing.finished;
    if (failure) throw failure;
    if (pending.length) throw new Error("truncated ls-tree entry");
  } catch (error) {
    listing.child.kill();
    await listing.finished;
    throw new Error(`check: cannot read ${ref}:${reading}: ${error.message}`);
  }
  if (!entries.length && optional) return null;
  const contents = new Map();
  const reader = indexedTreeReader(entries, ({ rel }) => contents.get(rel), `${ref}:${pipelineRel}`);
  const regular = entries.filter((e) => e.type === "blob");
  // Object ids keep tabs and newlines in paths out of the line-oriented batch protocol.
  const batch = gitStream(root, ["cat-file", "--batch"], regular.map((e) => `${e.oid}\n`).join(""));
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
      if (end !== -1) return Buffer.concat(parts).toString("ascii");
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
  reading = pipelineRel;
  try {
    for (const entry of regular) {
      reading = `${pipelineRel}/${entry.rel}`;
      const header = await line();
      const metadata = header.match(/^([0-9a-f]{40}|[0-9a-f]{64}) blob (\d+)(?![\s\S])/);
      if (!metadata || metadata[1] !== entry.oid || !Number.isSafeInteger(Number(metadata[2]))) throw new Error(`invalid batch response: ${header}`);
      const size = Number(metadata[2]);
      const content = await bytes(size);
      if ((await bytes(1))[0] !== 10) throw new Error("invalid batch object terminator");
      contents.set(entry.rel, content);
    }
    if (await available()) throw new Error("unexpected trailing batch output");
    const failure = await batch.finished;
    if (failure) throw failure;
  } catch (error) {
    batch.child.kill();
    batch.child.stdout.destroy();
    batch.child.stdin.destroy();
    await batch.finished;
    throw new Error(`check: cannot read ${ref}:${reading}: ${error.message}`);
  }
  return reader;
}

// The pipeline folder's name is the pipeline slug: one segment, a valid git ref, without `_`.
function pipelineSlugOf(abs) {
  const slug = basename(abs);
  const validRef = () => {
    try {
      execFileSync("git", ["check-ref-format", "--branch", slug], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  if (!slug || slug.includes("_") || !validRef()) die(`check: pipeline slug must be a valid git ref without _: ${slug}`);
  return slug;
}

async function cmdCheck(args) {
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const { root, abs } = repositoryFor(folder);
  containedPath("check", root, abs);
  pipelineSlugOf(abs);
  const pipelineRel = relative(root, abs);
  const rev = (r, what) => {
    try {
      return execFileSync("git", ["rev-parse", "--verify", "--quiet", `${r}^{commit}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      die(`check: ${what} does not resolve: ${r}`);
    }
  };
  const ref = args.ref ? rev(args.ref, "--ref") : null;
  const tree = await treeReader(root, abs, ref);
  const configuration = runConfiguration((path) => tree.read(path), "check");
  const decl = configuration.decl;
  const reviewLanesOf = (prefix) => reviewLanesFor(configuration, prefix);
  const productionLanesOf = (prefix) => decl[prefix]?.production ?? [];

  // Documents, each in its scope: the root ("") or a production lane ("<phase>/<id>/").
  // A file whose recorded fields differ from its body's projection contradicts the tree.
  const texts = new Map();
  const listIn = (dir) => tree.list().filter((rel) => rel.startsWith(`${dir}/`) && !rel.slice(dir.length + 1).includes("/")).map((rel) => basename(rel));
  const all = artifactFiles(tree.list())
    .sort()
    .map((rel) => {
      const text = tree.read(rel);
      texts.set(rel, text);
      const { data: parsed, body, error: parseError } = parseFrontmatter(text);
      const ids = parseError ? {} : artifactIds(parsed, body, rel, (path) => tree.read(path), listIn);
      const data = parsed ?? new Map();
      const frontmatterError = parseError || ids.error || targetRepresentationErrors(rel, parsed, body).map(({ field, reason }) => `${field}: ${reason}`).join("; ") || null;
      const drift = frontmatterError ? [] : [...new Set([...mirrorDrift(data, body, rel), ...(ids.drift ?? []), ...(!parsed && ownerFile(rel) ? ["target", "origin"] : [])])];
      if (drift.length) for (const k of MIRRORS) data.delete(k);
      const role = pipelineFileRole(rel);
      return { rel, name: rel.split("/").pop(), data, scope: role.scope, role, drift, frontmatterError, invalidIds: ids.invalid ?? null, malformed: projectBody(body, rel).get("malformed") ?? [] };
    });

  const identityOf = (rel) => {
    const bytes = tree.read(rel, true);
    return bytes === null ? null : byteIdentity(bytes);
  };
  const currentPackage = (paths) => new Map([...new Set(paths)].map((path) => [path, identityOf(path)]));
  const docsOf = (sc) => all.filter((d) => d.scope === sc);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  // Reviews: `<prefix>-review-[<lane>-]<wave>.md`; the implicit lane has no id. Only declared lanes review.
  const allReviewsOf = (sc) => docsOf(sc).filter((doc) => doc.role.review).map((doc) => ({
    ...doc,
    prefix: doc.role.review.prefix,
    lane: doc.role.review.lane,
    wave: doc.role.review.wave,
  }));
  const declaredReview = (r) => reviewLanesOf(r.prefix).some((l) => l.id === r.lane);
  const reviewsOf = (sc) => allReviewsOf(sc).filter(declaredReview);
  // Lane scopes are the declared production lanes; a folder the declaration lacks is a defect, never a lane.
  const scopes = ["", ...new Set(all.filter((doc) => doc.role.productionLane).map((doc) => doc.scope))];
  const declaredScopes = new Set(ARTIFACTS.flatMap((a) => productionLanesOf(a.prefix).map((l) => `${a.phase}/${l.id}/`)));
  const undeclared = [
    ...scopes.filter((sc) => sc && !declaredScopes.has(sc)),
    ...scopes.flatMap((sc) => allReviewsOf(sc).filter((r) => !declaredReview(r)).map((r) => r.rel)),
  ];

  // Task files and their latest reports.
  const taskFiles = all
    .filter((d) => d.rel.split("/")[1] === "tasks" && d.rel.split("/").length === 3 && planOf(d.rel.split("/")[0]) && taskFile(planOf(d.rel.split("/")[0])).test(d.name))
    .map((d) => ({ rel: d.rel, phase: d.rel.split("/")[0], id: d.name.replace(/\.md$/, ""), deps: [].concat(d.data.get("depends") ?? []) }));
  const taskFilesOf = (phase) => taskFiles.filter((t) => t.phase === phase).map((t) => t.rel);
  const reports = new Map();
  let changes = [];
  const reportFilesOf = (phase) => all.filter((d) => reportOf(d.rel) && d.rel.startsWith(`${phase}/`)).map((d) => d.rel);

  const inspection = {
    list: () => all.map((doc) => doc.rel),
    document: (path) => all.find((doc) => doc.rel === path) ?? null,
    identityOf,
    changesOf: () => changes,
  };
  validateRunConfiguration(configuration, inspection, "check");

  // What a review judges: the artifact package; plans add tasks, phase reviews add reports.
  const contextOf = (prefix, sc) => {
    const context = authoritativeReviewContext(configuration, prefix, sc, inspection);
    return context.closed ? { reference: context.reference, required: context.reference } :
      { reference: context.reference, required: requiredPackageOf(prefix, sc, packageContext).review };
  };
  const reviewFresh = (r, prefix, sc) => {
    const { required: packageMap } = contextOf(prefix, sc);
    const paths = materialPathsFor(configuration, prefix, sc, r.lane);
    return equalPackages(pinPackage(r.data.get("reviewed")), reviewProjection(packageMap, paths));
  };
  const waveValidity = (prefix, sc, wave, context = contextOf(prefix, sc)) => {
    return evaluateWave(configuration, prefix, sc, wave, context, inspection);
  };
  const latestWaveOf = (prefix, sc) => Math.max(0, ...reviewsOf(sc).filter((r) => r.prefix === prefix).map((r) => r.wave));
  const closedLanePackage = (prefix, sc) => {
    const context = authoritativeReviewContext(configuration, prefix, sc, inspection);
    return context.closed ? context.binding : null;
  };
  const lanePackageOf = (art, sc) => {
    const closed = closedLanePackage(art.prefix, sc);
    if (closed) return { package: closed, ready: true };
    const approval = waveValidity(art.prefix, sc, latestWaveOf(art.prefix, sc));
    return {
      package: currentPackage([inScope(sc, art.path), inScope(sc, art.record), ...(approval.current ? approval.reviews.map((r) => r.rel) : [])]),
      ready: approval.current,
    };
  };

  const packageContext = {
    identityOf, pinsByPath, taskFilesOf, reportFilesOf, waveValidity, latestWaveOf, productionLanesOf, lanePackageOf,
    dependsOf: (task) => taskFiles.find((t) => t.rel === task)?.deps ?? [],
    changesOf: () => changes,
  };
  for (const t of all.filter((d) => reportOf(d.rel))) {
    const [, phase, id, k] = reportOf(t.rel);
    const key = `${phase}/${id}`;
    const attempt = Number(k);
    if (!reports.has(key) || reports.get(key).attempt < attempt)
      reports.set(key, { rel: t.rel, data: t.data, phase, id, attempt, outcome: t.data.get("outcome") ?? (t.data.has("reviewed") ? "invalid" : "unstamped"), fresh: equalPackages(pinPackage(t.data.get("reviewed")), requiredPackageOf(t.rel, "", packageContext).review) });
  }

  // Lanes of one artifact in one scope: each declared lane's latest review (by wave).
  const laneStates = (prefix, sc) => {
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix);
    const currentWave = latestWaveOf(prefix, sc);
    const wave = waveValidity(prefix, sc, currentWave);
    return reviewLanesOf(prefix).map(({ id: lane, fingerprint }) => {
      const mine = rs.filter((r) => r.lane === lane);
      const r = mine.length ? mine.reduce((a, b) => (a.wave >= b.wave ? a : b)) : null;
      if (!r) return { lane, verdict: "none", current: false };
      return {
        lane,
        verdict: !r.data.has("reviewed") ? "unstamped" : (r.data.get("verdict") ?? "invalid"),
        brief: r.data.get("brief") ?? "",
        fresh: reviewFresh(r, prefix, sc) && laneMatches(r, fingerprint),
        wave: r.wave,
        current: r.wave === currentWave,
        waveApproved: wave.current,
        waveClosed: wave.closed,
        review: r,
      };
    });
  };
  // A wave is closed when every declared lane has a stamped, fresh review in the current wave.
  const waveClosed = (lanes) => lanes.length > 0 && lanes.every((l) => l.current && l.waveClosed);
  // A review landed without its pins is stamped; one stamped without a verdict is invalid.
  const unstampedReview = (lanes) => {
    const l = lanes.find((l) => l.verdict === "unstamped" || l.verdict === "invalid");
    return l && (l.verdict === "unstamped" ? `stamp ${l.review.rel}` : `INVALID REVIEW ${l.review.rel}: no Verdict line`);
  };

  // Waves since every declared lane approved together — a counter for the owner, never a gate.
  const episodeOf = (prefix, sc) => {
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix);
    const waves = [...new Set(rs.map((r) => r.wave))];
    const last = waves.length ? Math.max(...waves) : 0;
    const approvedAll = (w) => waveValidity(prefix, sc, w).current;
    const lastApproved = Math.max(0, ...waves.filter(approvedAll));
    const start = lastApproved;
    const episode = Math.max(0, last - start);
    const recurs = rs.filter((r) => r.wave > start).flatMap((r) => [].concat(r.data.get("recurs") ?? []));
    return { episode, recurs, last };
  };

  const out = {
    pipeline: pipelineRel,
    ref,
    configuration: {
      workflow: configuration.workflow,
      targetPhase: configuration.targetPhase,
      lanes: configuration.lanes.map(({ prefix, kind, ...lane }) => lane),
    },
    contradictions: [], challenges: [], claims: [], lanes: [], artifacts: [], tasks: {}, counters: {}, frontier: null,
  };
  const lines = [ref ? `${pipelineRel} @ ${args.ref} (${ref.slice(0, SHORT)})` : pipelineRel];
  let frontier = null;
  const take = (item) => {
    if (!frontier) frontier = item;
  };

  // 0. Contradictions: malformed files (their author fixes them); mirrors that no longer project
  // their body; lanes the declaration lacks.
  for (const d of all.filter((d) => d.frontmatterError)) {
    out.contradictions.push({ path: d.rel, invalid: d.frontmatterError });
    lines.push(`INVALID FRONTMATTER ${d.rel}: ${d.frontmatterError}`);
    take(`INVALID FRONTMATTER ${d.rel}`);
  }
  for (const d of all.filter((d) => d.malformed.length)) {
    out.contradictions.push({ path: d.rel, invalid: d.malformed });
    lines.push(`INVALID LINE ${d.rel}: ${d.malformed.join("; ")}`);
    take(`INVALID LINE ${d.rel}`);
  }
  for (const d of all.filter((d) => d.invalidIds)) {
    out.contradictions.push({ path: d.rel, invalid: [d.invalidIds] });
    lines.push(`INVALID IDS ${d.rel}: ${d.invalidIds}`);
    take(`INVALID IDS ${d.rel}`);
  }
  for (const d of all.filter((d) => d.drift.length)) {
    out.contradictions.push({ path: d.rel, mirrors: d.drift });
    lines.push(`mirror   ${d.rel}  differs from the body: ${d.drift.join(", ")}`);
    take(`stamp ${d.rel}`);
  }
  for (const path of undeclared) {
    out.contradictions.push({ path, lane: "undeclared" });
    lines.push(`lane     ${path}  UNDECLARED`);
    take(`undeclared lane ${path}`);
  }
  for (const path of tree.symlinks()) {
    out.contradictions.push({ path, symlink: true });
    lines.push(`symlink  ${path}`);
    take(`symlink ${path}`);
  }
  if (out.contradictions.length) {
    out.frontier = frontier;
    lines.push(`frontier ${frontier}`);
    process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
    return;
  }

  // Facts about branch commits require a valid representation and a real merge-base.
  const tip = ref ?? rev("HEAD", "HEAD");
  const authored = await currentChanges(root, abs, tip, all.find((d) => d.rel === "0-intent/intent.md")?.data, args.base, "check", (path) => tree.read(path, true), all.flatMap((doc) => materialReferences(doc.data)));
  const base = authored.base;
  changes = authored.changes;
  out.base = base.slice(0, SHORT);
  out.authoredChanges = changes.map(publicChange);
  const phaseOfTarget = (targetPath) => ARTIFACTS.findIndex((a) => a.path === targetPath) + 1;
  const inScopePhase = (targetPath) => targetPath.startsWith("0-intent/") || phaseOfTarget(targetPath) <= configuration.targetPhase;
  const inputStateOf = (doc, art, sc, fingerprint = null) => {
    const pins = doc?.data.get("pins");
    const recorded = pinPackage(pins);
    const { inputs: requiredPackage, ready: requirementsReady } = requiredPackageOf(art.prefix, sc, packageContext);
    const diff = { members: false, identities: new Set() };
    equalPackages(recorded, requiredPackage, diff);
    const stale = !Array.isArray(pins) || pins.length === 0 ? [] : [
      ...(diff.members || !requirementsReady ? ["package members"] : []),
      ...(diff.identities.size ? [`package identities: ${[...diff.identities].join(", ")}`] : []),
      ...(!laneMatches(doc, fingerprint) ? ["lane declaration"] : []),
    ];
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : "fresh";
    const inputChanges = state === "stale" ? {
      added: [...requiredPackage.keys()].filter((path) => !recorded?.has(path)),
      removed: [...(recorded?.keys() ?? [])].filter((path) => !requiredPackage.has(path)),
      changed: [...diff.identities],
      ready: requirementsReady,
    } : null;
    return { state, stale, inputChanges };
  };

  // pending → adjudicated (the target pins it) → resolved (the target approved
  // carrying the pin), or resolved by escalation (a closed wave of the target
  // corroborated an unsatisfiable verdict citing it). Owner territory resolves through its answer.
  const resolutionOf = (item) => {
    if (ownerTerritory(item.target)) {
      const answer = ownerAnswer(item.rel, all);
      return answer ? { state: "resolved", detail: `answered by ${answer.rel}` } : { state: "pending" };
    }
    const targetArtifact = ARTIFACTS.find((x) => x.path === item.targetPath);
    if (!targetArtifact) return { state: "pending" };
    const lanes = laneStates(targetArtifact.prefix, "");
    for (const l of lanes)
      if (l.review && challengeKind(l.review.rel, l.review.data) === "claim" && l.fresh && waveClosed(lanes) && !lanes.some((x) => x.verdict === "rejected") && [].concat(l.review.data.get("origin") ?? []).includes(item.rel))
        return { state: "resolved", detail: `escalated by ${l.review.rel}` };
    const pinned = pinPackage(pinsByPath.get(item.targetPath))?.has(item.rel);
    if (!pinned) return { state: "pending" };
    const approved = waveValidity(targetArtifact.prefix, "", latestWaveOf(targetArtifact.prefix, "")).current;
    return approved ? { state: "resolved", detail: `${item.targetPath} approved carrying it` } : { state: "adjudicated", detail: `by ${item.targetPath}, awaiting approval` };
  };

  // 1. Challenges: constraints, proposals, and fresh failed task reports.
  const challenges = [
    ...all.filter((d) => ownerFile(d.rel)).flatMap((d) => targetPairs(d.rel, d.data).map((t) => ({ ...t, kind: ownerFile(d.rel) }))),
    ...[...reports.values()].filter((t) => challengeKind(t.rel, t.data) === "failed report" && t.fresh).flatMap((t) => targetPairs(t.rel, t.data).map((pair) => ({ ...pair, kind: `failed task ${t.id}` }))),
  ].map((t) => ({ ...t, resolution: resolutionOf(t) }));
  let unresolvedInScope = false;
  for (const t of challenges) {
    const res = t.resolution;
    const scoped = inScopePhase(t.targetPath);
    const label = res.state === "pending" ? (scoped ? "PENDING" : "pending, beyond the target phase") : `${res.state}${res.detail ? ` (${res.detail})` : ""}`;
    const challengeResolved = challenges.filter((pair) => pair.rel === t.rel).every((pair) => pair.resolution.state === "resolved");
    out.challenges.push({ path: t.rel, kind: t.kind, target: t.target, state: res.state, detail: res.detail ?? null, inScope: scoped, challengeResolved });
    lines.push(`challenge ${t.rel} (${t.kind}) → ${t.target}  ${label}`);
    if (res.state !== "resolved" && scoped) unresolvedInScope = true;
  }

  // 2. Claims: an unsatisfiable verdict whose wave closed with no rejection.
  const claims = [];
  for (const sc of scopes)
    for (const r of reviewsOf(sc)) {
      if (challengeKind(r.rel, r.data) !== "claim") continue;
      // A claim is its lane's verdict: the lane's latest review is the one that stands.
      const lanes = laneStates(r.prefix, sc);
      const mine = lanes.find((l) => l.review?.rel === r.rel);
      const later = reviewsOf(sc).some((x) => x.prefix === r.prefix && x.lane === r.lane && x.wave > r.wave);
      for (const pair of targetPairs(r.rel, r.data)) {
        const c = {
          ...pair,
          fresh: mine ? mine.fresh : reviewFresh(r, r.prefix, sc),
          waveOpen: !waveClosed(lanes),
          rejected: lanes.some((l) => l.verdict === "rejected"),
        };
        const cur = identityOf(c.targetPath);
        const unchanged = equalPackages(new Map([[c.targetPath, c.targetIdentity]]), new Map([[c.targetPath, cur]]));
        const res = resolutionOf(c);
        if (later) c.state = "superseded (its lane reviewed again)";
        else if (c.targetIdentity && !unchanged) c.state = "superseded (target changed)";
        else if (res.state === "resolved") c.state = `resolved (${res.detail})`;
        else if (!c.fresh) c.state = "moot (claiming artifact changed)";
        else if (c.waveOpen) c.state = "wave open";
        else if (c.rejected) c.state = "held (a lane rejected; adjudicate first)";
        else if (res.state === "adjudicated") c.state = `adjudicated (${res.detail})`;
        else c.state = c.targetIdentity ? "pending" : "pending (no target-identity)";
        claims.push(c);
      }
    }
  for (const c of claims) {
    const scoped = inScopePhase(c.targetPath);
    if (c.state === "pending") c.state = !scoped ? "pending, beyond the target phase" : ownerTerritory(c.target) ? "PENDING — owner escalation" : "PENDING";
    out.claims.push({ review: c.rel, target: c.target, state: c.state, inScope: scoped });
    lines.push(`claim    ${c.rel} → ${c.target}  ${c.state}`);
    if (c.state === "PENDING — owner escalation") take(`claim ${c.rel} → ${c.target} (owner escalation)`);
    if (!/^(resolved|superseded|moot|pending, beyond)/.test(c.state) && scoped) unresolvedInScope = true;
  }

  // 3. Phases in order, up to the target; a phase's production lanes come before its root artifact.
  const pendingChallenges = [...challenges.filter((t) => t.resolution.state === "pending"), ...claims.filter((c) => c.state.startsWith("PENDING"))];
  const convergenceOf = (art, sc, st) => {
    const path = inScope(sc, art.path);
    const consumed = pinPackage(pinsByPath.get(path));
    const pending = [...new Set(pendingChallenges.filter((c) => c.targetPath === art.path && (!sc || !consumed?.has(c.rel))).map((c) => c.rel))];
    const taskReports = pending.filter((rel) => challengeKind(rel, all.find((d) => d.rel === rel).data) === "failed report");
    const challenges = pending.filter((rel) => !taskReports.includes(rel));
    const rejectedReviews = (prefix) => {
      const lanes = laneStates(prefix, sc);
      const complete = waveValidity(prefix, sc, latestWaveOf(prefix, sc)).reviews.length > 0;
      return complete && lanes.some((l) => l.verdict === "rejected") ? lanes.map((l) => ({ lane: l.lane, path: l.review.rel })) : [];
    };
    const artifactReviews = rejectedReviews(art.prefix);
    const phaseReviews = !sc && art.review ? rejectedReviews(art.review) : [];
    const reviewLanes = [...artifactReviews, ...phaseReviews];
    const materials = { inputChanges: st.inputChanges ?? null, reviewLanes, challenges, taskReports };
    const needed = st.state === "missing" || st.state === "stale" || pending.length > 0 || artifactReviews.length > 0;
    const inputText = materials.inputChanges ? [
      ...["added", "removed", "changed"].filter((key) => materials.inputChanges[key].length).map((key) => `${key} [${materials.inputChanges[key].join(", ")}]`),
      ...(!materials.inputChanges.ready ? ["input approvals pending"] : []),
    ].join("; ") || st.stale.join("; ") : "";
    const text = [
      ...(materials.inputChanges ? [`Input changes: ${inputText}`] : []),
      ...(reviewLanes.length ? [`Review lanes: ${reviewLanes.map((r) => `${r.lane || "·"} — ${r.path}`).join(", ")}`] : []),
      ...(challenges.length ? [`Challenges: ${challenges.join(", ")}`] : []),
      ...(taskReports.length ? [`Task reports: ${taskReports.join(", ")}`] : []),
    ].map((part) => `  ${part}`).join("");
    return { needed, phaseRejected: phaseReviews.length > 0, materials, text };
  };
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane || "·"}:${l.verdict}${l.verdict !== "none" && l.verdict !== "unstamped" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  const artifactState = (doc, art, sc, fingerprint = null) => {
    const { state, stale, inputChanges } = inputStateOf(doc, art, sc, fingerprint);
    const lanes = laneStates(art.prefix, sc);
    const e = episodeOf(art.prefix, sc);
    const approved = waveValidity(art.prefix, sc, latestWaveOf(art.prefix, sc)).current;
    return { state, stale, inputChanges, lanes, approved, episode: e.episode, recurs: e.recurs };
  };
  const nextFor = (path, st, convergence) =>
    st.state === "unstamped" ? `stamp ${path}` : convergence.needed ? `converge ${path}` : (unstampedReview(st.lanes) ?? `review wave ${path}`);
  let through = 0;
  let stopped = false;
  const phaseDone = (phaseNo) => {
    if (!stopped && phaseNo === through + 1) through = phaseNo;
  };
  for (const [i, art] of ARTIFACTS.entries()) {
    const phaseNo = i + 1;
    if (phaseNo > configuration.targetPhase) break;
    const name = art.path.split("/")[1];
    const rootExists = texts.has(art.path);
    const declaredLanes = productionLanesOf(art.prefix);
    const laneScopes = declaredLanes.map((l) => `${art.phase}/${l.id}/`).sort();
    const laneOf = (sc) => declaredLanes.find((l) => l.id === sc.split("/")[1]);
    const closedPackage = (sc) => closedLanePackage(art.prefix, sc);
    const lanePackage = (sc) => lanePackageOf(art, sc).package;
    const laneApproved = (sc) => {
      if (closedPackage(sc)) return true;
      const lane = laneOf(sc);
      if (lane.after.some((dep) => !laneApproved(`${art.phase}/${dep}/`))) return false;
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      return !!doc && (() => {
        const st = artifactState(doc, art, sc, lane.fingerprint);
        return st.state === "fresh" && st.approved;
      })();
    };
    let lanesReady = laneScopes.length > 0;
    for (const sc of laneScopes) {
      const { after, fingerprint } = laneOf(sc);
      const waiting = after.filter((dep) => !laneApproved(`${art.phase}/${dep}/`));
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      const st = doc ? artifactState(doc, art, sc, fingerprint) : { state: "missing", stale: [], lanes: [], approved: false, episode: 0, recurs: [] };
      const closed = !!closedPackage(sc);
      const convergence = convergenceOf(art, sc, st);
      const ok = closed || (st.approved && st.state === "fresh" && !waiting.length && !convergence.needed);
      if (!ok) lanesReady = false;
      const { inputChanges, ...laneState } = st;
      out.lanes.push({ lane: sc, artifact: `${sc}${name}`, ...laneState, materials: closed ? undefined : convergence.materials, lanes: st.lanes.map(({ review, ...x }) => x), after, waiting, closed });
      lines.push(`lane     ${sc}${name}  ${closed ? "closed" : st.state.toUpperCase()}${!closed && st.stale.length ? ` — ${st.stale.join("; ")}` : ""}${!closed && waiting.length ? `  waiting for ${waiting.join(", ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${closed ? "" : convergence.text}`);
      if (!closed && !ok && !waiting.length) take(nextFor(`${sc}${name}`, st, convergence));
      if (st.episode || st.recurs.length) out.counters[`${sc}${art.prefix}`] = { episode: st.episode, recurs: st.recurs };
    }
    const laneCandidates = laneScopes.filter(laneApproved).map((sc) => ({ lane: sc, package: [...lanePackage(sc).keys()] }));
    const needsConsolidation = laneScopes.some((sc) => !closedPackage(sc) && laneApproved(sc));
    const renderCandidates = () => lines.push(`Lane candidates  ${laneCandidates.map((candidate) => `${candidate.lane}: ${candidate.package.join(", ")}`).join("; ")}`);
    if (!rootExists) {
      const convergence = convergenceOf(art, "", { state: "missing" });
      out.artifacts.push({ artifact: art.path, state: "missing", materials: convergence.materials, consolidate: laneScopes.length ? lanesReady : undefined, ...(lanesReady ? { laneCandidates } : {}) });
      lines.push(`artifact ${art.path}  MISSING${laneScopes.length ? (lanesReady ? " — every lane approved: consolidate" : " — lanes in progress") : ""}${convergence.text}`);
      if (laneScopes.length && lanesReady) {
        renderCandidates();
        take(`consolidate ${art.path}`);
      }
      else if (!laneScopes.length) take(`converge ${art.path}`);
      stopped = true;
      continue;
    }
    const st = artifactState(all.find((d) => d.rel === art.path), art, "");
    const convergence = convergenceOf(art, "", st);
    const { inputChanges, ...artifact } = st;
    out.artifacts.push({ artifact: art.path, ...artifact, materials: convergence.materials, lanes: st.lanes.map(({ review, ...x }) => x), ...(lanesReady && needsConsolidation ? { consolidate: true, laneCandidates } : {}) });
    if (st.episode || st.recurs.length) out.counters[art.prefix] = { episode: st.episode, recurs: st.recurs };
    lines.push(`artifact ${art.path}  ${st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${convergence.text}`);
    if (st.state !== "fresh" || !st.approved || needsConsolidation || convergence.needed) {
      if (lanesReady && needsConsolidation) {
        renderCandidates();
        take(`consolidate ${art.path}`);
      } else take(nextFor(art.path, st, convergence));
      stopped = true;
    }
    if (!art.review) {
      if (st.state === "fresh" && st.approved) phaseDone(phaseNo);
      continue;
    }
    // Build and document: the phase's task files, their latest reports, then the phase review.
    const planTasks = taskFiles.filter((t) => t.phase === art.phase).sort((x, y) => numberOf(x.id) - numberOf(y.id));
    const phaseReports = [...reports.values()].filter((t) => t.phase === art.phase);
    const latestOf = (id) => phaseReports.find((t) => t.id === id);
    const isDone = (id) => {
      const r = latestOf(id);
      return !!r && r.outcome === "completed" && r.fresh;
    };
    // A fresh blocked report leaves its task pending: the environment, not the plan, is what changes before the next attempt.
    const blockedBy = (id) => {
      const r = latestOf(id);
      return !!r && r.outcome === "blocked" && r.fresh;
    };
    const done = planTasks.filter((t) => isDone(t.id)).map((t) => t.id);
    const open = phaseReports.filter((t) => !isDone(t.id)).map((t) => `${t.id}:${t.outcome}${t.outcome === "completed" ? " (stale)" : ""}`);
    // Every attempt is a report: landed without its pins it is stamped; stamped without an outcome it is invalid.
    const reportDocs = all.filter((d) => reportOf(d.rel) && d.rel.startsWith(`${art.phase}/`));
    const badReport = reportDocs.map((d) => (!d.data.has("reviewed") ? `stamp ${d.rel}` : !d.data.has("outcome") ? `INVALID REPORT ${d.rel}: no Outcome line` : null)).find(Boolean);
    const cyclic = (() => {
      const byId = new Map(planTasks.map((t) => [t.id, t]));
      const seen = new Set();
      const visit = (id, stack) => {
        if (stack.has(id)) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return (byId.get(id)?.deps ?? []).some((d) => !byId.has(d) || visit(d, new Set([...stack, id])));
      };
      return planTasks.find((t) => visit(t.id, new Set()))?.id ?? null;
    })();
    const next = planTasks.find((t) => !isDone(t.id) && t.deps.every(isDone));
    const remaining = planTasks.filter((t) => !isDone(t.id)).map((t) => t.id);
    out.tasks[art.phase] = { planned: planTasks.map((t) => t.id), done, open, next: next?.id ?? null, blocked: next && blockedBy(next.id) ? next.id : null };
    lines.push(`tasks    ${art.phase}: planned ${planTasks.length}  done [${done.join(", ")}]${open.length ? `  open [${open.join(", ")}]` : ""}${next ? `  next ${next.id}` : ""}`);
    if (!planTasks.length) {
      take(`no tasks in ${art.phase}/tasks/`);
      stopped = true;
    } else if (cyclic) {
      take(`invalid plan: ${art.phase}/tasks/${cyclic}.md depends on a cycle or a missing task`);
      stopped = true;
    } else if (badReport) {
      take(badReport);
      stopped = true;
    } else if (remaining.length) {
      take(`${blockedBy(next.id) ? "blocked" : "task"} ${art.phase}/${next.id}`);
      stopped = true;
    }
    // Phase review: the plan package, reports, and authored changes.
    const rl = laneStates(art.review, "");
    const e = episodeOf(art.review, "");
    const rApproved = waveValidity(art.review, "", latestWaveOf(art.review, "")).current;
    out[`${art.review}Review`] = { lanes: rl.map(({ review, ...x }) => ({ ...x, diff: changeDelta(changes, pinPackage(review?.data.get("reviewed"))) })), approved: rApproved, episode: e.episode, recurs: e.recurs };
    if (e.episode || e.recurs.length) out.counters[art.review] = { episode: e.episode, recurs: e.recurs };
    lines.push(`${art.review.padEnd(8)} review: ${render(rl)}${rApproved ? "  APPROVED" : ""}`);
    if (!rApproved) {
      take(unstampedReview(rl) ?? (convergence.phaseRejected ? `converge ${art.path}` : `${art.review} review`));
      stopped = true;
    } else {
      phaseDone(phaseNo);
    }
  }

  // 4. Counters and completion.
  for (const [label, c] of Object.entries(out.counters))
    lines.push(`counter  ${label}: ${c.episode} wave${c.episode === 1 ? "" : "s"} this episode${c.recurs.length ? `  recurs: ${c.recurs.join(", ")}` : ""}`);
  out.completeThrough = through;
  out.complete = !frontier && !unresolvedInScope && through >= configuration.targetPhase;
  if (!frontier && unresolvedInScope) frontier = "challenges or claims still adjudicated, awaiting approval";
  if (!frontier && !out.complete) die(`check: no frontier before target phase ${configuration.targetPhase}`);
  if (!frontier) frontier = "complete";
  out.frontier = frontier;
  lines.push(`complete through phase ${through}${out.complete ? " — target reached" : ` (target ${configuration.targetPhase})`}`);
  lines.push(`frontier ${frontier}`);
  process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
}

function physicalPath(path) {
  let parent = path;
  while (!existsSync(parent)) parent = dirname(parent);
  return resolve(realpathSync(parent), relative(parent, path));
}

// Read-only review material; derived files are written only to an explicit output directory.
async function cmdDiff(args) {
  const folder = args._[0] || die("diff: missing <pipeline-folder>");
  if (args.review && args.liveNet) die("diff: --review and --live-net select different diffs");
  const { root, abs } = repositoryFor(folder);
  containedPath("diff", root, abs);
  pipelineSlugOf(abs);
  const tip = gitBytes(root, ["rev-parse", "--verify", `${args.ref ?? "HEAD"}^{commit}`]).toString("ascii").trim();
  const tree = await treeReader(root, abs, args.ref ? tip : null);
  const raw = tree.read("0-intent/intent.md");
  const intent = raw === null ? { data: null } : parseFrontmatter(raw);
  if (intent.error || (intent.data && mirrorDrift(intent.data, intent.body, "0-intent/intent.md").length)) die("diff: intent must have valid current frontmatter");
  const read = (path) => tree.read(path, true);
  const state = await currentChanges(root, abs, tip, intent.data, args.base, "diff", read, readChangePins(read, tree.list()));
  let selected = state.changes.map((change) => ({ ...change, status: "added" }));
  if (args.review) {
    const file = containedPath("diff", root, resolve(root, args.review));
    const path = relative(abs, file);
    if (path.startsWith("../") || isAbsolute(path)) die("diff: review must be inside the pipeline");
    const role = pipelineFileRole(path);
    const text = tree.read(path);
    const review = text === null ? null : parseFrontmatter(text);
    const reviewed = pinPackage(review?.data?.get("reviewed"));
    if (role.scope || !role.review || role.review.prefix !== role.art.review || !reviewed || !VERDICTS.has(review.data.get("verdict")) || mirrorDrift(review.data, review.body, path).length) die(`diff: invalid phase review: ${path}`);
    const delta = changeDelta(state.changes, reviewed);
    const added = new Set(delta.added.map(({ path }) => path));
    selected = [
      ...state.changes.filter(({ occurrencePin }) => added.has(pinParts(occurrencePin).path)).map((change) => ({ ...change, status: "added" })),
      ...delta.removed.map((pin) => ({ ...state.stored.occurrenceAt(pin), status: "removed" })),
    ];
  } else if (args.liveNet) {
    const material = changeMaterial(root, state.base, tip, relative(root, dirname(abs)) || ".");
    selected = material ? [{ commit: tip, patchId: material.patchId, occurrence: 1, material, status: "net" }] : [];
  }
  const rows = selected.map((change) => ({ ...publicChange(change), member: change.occurrencePin ?? null, status: change.status, content: change.material }));
  const patches = rows.map((row) => Buffer.concat([
    ...(args.liveNet ? [] : [Buffer.from(`# ${row.status} ${row.member}\n`)]),
    Buffer.from(row.content.patch, "base64"),
  ]));
  if (args.output) {
    const output = physicalPath(resolve(args.output));
    const pipeline = physicalPath(abs);
    if (output === pipeline || output.startsWith(`${pipeline}/`)) die("diff: output must be outside the pipeline");
    if (existsSync(output)) die(`diff: output already exists: ${output}`);
    mkdirSync(output, { recursive: true });
    for (const [index, row] of rows.entries()) {
      const directory = join(output, String(index + 1));
      mkdirSync(directory);
      writeFileSync(join(directory, "change.json"), `${JSON.stringify(row.content, null, 2)}\n`);
      writeFileSync(join(directory, "change.patch"), Buffer.from(row.content.patch, "base64"));
      for (const file of row.content.files) for (const side of ["before", "after"]) {
        const entry = file[side];
        if (!entry) continue;
        const parts = Buffer.from(file.path, "base64").toString("latin1").split("/").map((part) => Buffer.from(part, "latin1"));
        let parent = Buffer.from(join(directory, side));
        mkdirSync(parent, { recursive: true });
        for (const [index, part] of parts.entries()) {
          if (part.includes(Buffer.from(sep))) throw new Error("diff: material path cannot be represented on this filesystem");
          const path = Buffer.concat([parent, Buffer.from(sep), part]);
          if (index === parts.length - 1) writeFileSync(path, entry.mode === "160000" ? `${entry.oid}\n` : Buffer.from(entry.bytes, "base64"), { mode: entry.mode === "100755" ? 0o755 : 0o644 });
          else mkdirSync(path, { recursive: true });
          parent = path;
        }
      }
    }
    writeFileSync(join(output, "diff.patch"), Buffer.concat(patches));
    writeFileSync(join(output, "index.json"), `${JSON.stringify(rows.map(({ content, ...row }, index) => ({ ...row, material: `${index + 1}/change.json` })), null, 2)}\n`);
  }
  process.stdout.write(args.json ? `${JSON.stringify(rows, null, 2)}\n` : Buffer.concat(patches));
}

// --- cli --------------------------------------------------------------------

const COMMAND_OPTIONS = {
  stamp: new Set(["--pin", "--reviewed", "--mirror", "--base"]),
  check: new Set(["--json", "--ref", "--base"]),
  diff: new Set(["--json", "--ref", "--base", "--review", "--live-net", "--output"]),
};

function parseArgs(command, argv) {
  const args = { _: [], pin: [], reviewed: [], mirror: false, json: false, ref: null, base: null };
  const used = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // Every option is validated here: an unknown one, a missing value, or a value out of range is an error.
    const value = () => (i + 1 < argv.length ? argv[++i] : die(`${a} expects a value`));
    if (a.startsWith("--") && !COMMAND_OPTIONS[command].has(a)) die(`${command}: option ${a} is not allowed`);
    if (a.startsWith("--") && !["--pin", "--reviewed"].includes(a) && used.has(a)) die(`${command}: ${a} may appear only once`);
    if (a.startsWith("--")) used.add(a);
    if (a === "--pin") args.pin.push(value());
    else if (a === "--reviewed") args.reviewed.push(value());
    else if (a === "--mirror") args.mirror = true;
    else if (a === "--json") args.json = true;
    else if (a === "--ref") args.ref = value();
    else if (a === "--base") args.base = value();
    else if (a === "--review") args.review = value();
    else if (a === "--live-net") args.liveNet = true;
    else if (a === "--output") args.output = value();
    else if (a.startsWith("--")) die(`unknown option: ${a}`);
    else args._.push(a);
  }
  if (args._.length > 1) die(`${command}: unexpected positional argument: ${args._[1]}`);
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const help = () =>
    process.stdout.write(
      `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--mirror] [--base <ref>]
  node rp.mjs check <pipeline-folder> --base <ref> [--ref <branch>] [--json]
  node rp.mjs diff <pipeline-folder> --base <ref> [--ref <branch>] [--review <file> | --live-net] [--output <folder>] [--json]

stamp writes frontmatter: pins, review pins (immutable), the lane derived from
the path and run-config.md, --mirror copies of body declarations (Verdict, Brief, Target,
Origin, Outcome — completed | failed | blocked — Prior finding, a task's
Depends on, a report's Commits), authored changes, and head — the diff base
for artifact reviews and convergence. Phase review stamps add authored changes
using --base unless the intent declares starts-from. Identity is the first 12 hexadecimal characters of
git's blob hash of every body byte: stamping never
changes it. check reports the frontier: contradictions, owner escalations,
then phases in order up to the target — converge artifacts, review waves, tasks,
and completion. --base names the artifact base branch used for the merge-base
with the inspected ref; the intent's starts-from branch prevails when declared.
run-config.md supplies the
workflow, target phase, and named lanes. Each named lane's fingerprint derives
from its id, brief, materials, and after fields.
diff renders authored-change material; --review selects added and removed members,
--live-net selects the net change from the base. --output writes patches and both
sides of changed files outside the pipeline. Stamps retain change material and
phase reviews record the checkpoint inherited by a continuation from the base.
Spec: ../reference/run/state.md
`,
    );
  if (!cmd || cmd === "--help" || cmd === "-h") {
    help();
  } else if (!COMMAND_OPTIONS[cmd]) {
    die(`unknown command: ${cmd}`);
  } else {
    const args = parseArgs(cmd, rest);
  switch (cmd) {
    case "stamp":
      try { await cmdStamp(args); }
      catch (error) { die(error.message); }
      break;
    case "check":
      try { await cmdCheck(args); }
      catch (error) { die(error.message); }
      break;
    case "diff":
      try { await cmdDiff(args); }
      catch (error) { die(error.message); }
      break;
  }
  }
}
