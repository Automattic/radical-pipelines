#!/usr/bin/env node
// rp — state tooling for Radical Pipelines.
// Zero dependencies. Serves the spec in ../reference/run/state.md; everything
// it does can be done with bare git. Commands: stamp, check.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, realpathSync } from "node:fs";
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

// --- frontmatter (subset: scalars and lists of strings) ---------------------

// The body is every byte after the closing delimiter line, exactly as git hashes it: nothing is
// normalized. The delimiter lines alone tolerate a trailing `\r`; the closing one may end the file.
export function parseFrontmatter(raw) {
  const open = raw.match(/^---\r?\n/);
  if (!open) return { data: null, body: raw };
  const rest = raw.slice(open[0].length);
  const close = rest.match(/(?:^|\n)---\r?(?:\n|$)/);
  if (!close) return { data: null, body: raw, error: "missing closing --- delimiter" };
  const body = rest.slice(close.index + close[0].length);
  const data = new Map();
  const errors = [];
  const collectionValue = (value) => /^[\[{#&*!|>@`%]/.test(value) || /^(?:-|\?|:)\s/.test(value) || /[\]}]$/.test(value) || /:\s/.test(value) || /\s#/.test(value);
  const scalar = (rawValue) => {
    const value = rawValue.trim();
    if (value.startsWith('"')) {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === "string" ? { value: parsed } : { error: "quoted scalar must be a string" };
      } catch {
        return { error: "malformed double-quoted scalar" };
      }
    }
    if (value.startsWith("'")) {
      if (!/^'(?:[^']|'')*'$/.test(value)) return { error: "malformed single-quoted scalar" };
      return { value: value.slice(1, -1).replace(/''/g, "'") };
    }
    if (collectionValue(value)) return { error: "must be a scalar" };
    return { value };
  };
  const flowItems = (inner) => {
    if (!inner) return [];
    const items = [];
    let start = 0;
    let quote = null;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (quote === '"' && ch === "\\") i++;
      else if (quote === "'" && ch === "'" && inner[i + 1] === "'") i++;
      else if (quote && ch === quote) quote = null;
      else if (!quote && (ch === '"' || ch === "'") && !inner.slice(start, i).trim()) quote = ch;
      else if (!quote && ch === ",") {
        items.push(inner.slice(start, i));
        start = i + 1;
      }
    }
    if (quote) return null;
    items.push(inner.slice(start));
    return items;
  };
  let currentList = null;
  for (const rawLine of rest.slice(0, close.index).split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;
    const item = line.match(/^  -\s+(.*)$/);
    if (item && currentList) {
      const parsed = scalar(item[1]);
      if (parsed.error) errors.push(`list item under ${currentList} ${parsed.error}`);
      else if (parsed.value) data.get(currentList).push(parsed.value);
      else errors.push(`empty list item under ${currentList}`);
      continue;
    }
    if (/^\s+-/.test(line)) {
      errors.push(`malformed list item: ${line}`);
      continue;
    }
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) {
      errors.push(`malformed line: ${line}`);
      continue;
    }
    if (data.has(kv[1])) {
      errors.push(`duplicate field: ${kv[1]}`);
      continue;
    }
    if (kv[2] === "") {
      data.set(kv[1], []);
      currentList = kv[1];
    } else if (kv[2].trim().startsWith("[")) {
      // Inline flow list: `key: [a, b]`, `key: []`.
      const flow = kv[2].trim();
      if (!flow.endsWith("]")) {
        errors.push(`malformed inline list under ${kv[1]}`);
        currentList = null;
        continue;
      }
      const inner = flow.slice(1, -1);
      const items = flowItems(inner);
      if (!items) errors.push(`malformed inline list under ${kv[1]}`);
      const values = (items ?? []).map(scalar);
      if (values.some((x) => x.error)) errors.push(`list item under ${kv[1]} ${values.find((x) => x.error).error}`);
      if (values.some((x) => !x.error && !x.value)) errors.push(`empty list item under ${kv[1]}`);
      data.set(kv[1], values.filter((x) => !x.error).map((x) => x.value));
      currentList = null;
    } else {
      const parsed = scalar(kv[2]);
      if (parsed.error) errors.push(`${parsed.error} under ${kv[1]}`);
      else data.set(kv[1], parsed.value);
      currentList = null;
    }
  }
  const lists = new Set(["pins", "reviewed", "recurs", "depends", "commits"]);
  const scalars = new Set(["verdict", "brief", "target", "target-identity", "outcome", "head", "lane", "attempt"]);
  for (const [key, value] of data) {
    if (lists.has(key) && !Array.isArray(value)) errors.push(`${key} must be a list`);
    if (scalars.has(key) && Array.isArray(value)) errors.push(`${key} must be a scalar`);
    if (key === "origin" && Array.isArray(value) && value.length === 0) errors.push("origin must be a scalar or non-empty list");
  }
  if (errors.length) return { data: null, body, error: errors.join("; ") };
  return { data, body };
}

function renderFrontmatter(data, body) {
  const scalar = (value) => {
    const text = String(value);
    const quote = !text || text.trim() !== text || /^[\[{#&*!|>@`%"']/.test(text) || /^(?:-|\?|:)\s/.test(text) || /[\]}]$/.test(text) || /:\s|\s#|[\r\n]/.test(text);
    return quote ? JSON.stringify(text) : text;
  };
  let out = "---\n";
  for (const [k, v] of data) {
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out += `${k}:\n`;
      for (const item of v) out += `  - ${scalar(item)}\n`;
    } else {
      out += `${k}: ${scalar(v)}\n`;
    }
  }
  return out + "---\n" + body;
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

function fileIdentity(abs) {
  if (!existsSync(abs) || !lstatSync(abs).isFile()) return null;
  return byteIdentity(readFileSync(abs));
}

const IDENTITY = /^[0-9a-f]{12}$/;
const REPORT = /^([^/]+)\/tasks\/(T\d+)-report-(\d+)\.md$/;
// Mirrors: the projection of a body's declarations, rewritten whole by every `--mirror`.
const MIRRORS = ["verdict", "brief", "target", "origin", "outcome", "recurs", "depends", "commits", "attempt"];
// The artifacts, in phase order, with what each one requires as pins.
const ARTIFACTS = [
  { path: "1-spec/spec.md", record: "1-spec/spec-research.md", prefix: "spec", phase: "1-spec", requires: ["0-intent/intent.md"] },
  { path: "2-design-doc/design-doc.md", record: "2-design-doc/design-doc-research.md", prefix: "design-doc", phase: "2-design-doc", requires: ["0-intent/intent.md", "1-spec/spec.md"] },
  { path: "3-build/build-plan.md", record: "3-build/build-plan-research.md", prefix: "build-plan", phase: "3-build", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md"], review: "build" },
  { path: "4-document/document-plan.md", record: "4-document/document-plan-research.md", prefix: "document-plan", phase: "4-document", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md"], requiresReview: "build", review: "document" },
];
function reviewArtifact(rel) {
  const name = basename(rel);
  for (const art of ARTIFACTS) {
    for (const prefix of [art.prefix, art.review].filter(Boolean)) {
      const match = name.match(new RegExp(`^${prefix}-review-(?:(.+)-)?(\\d+)\\.md$`));
      if (match) return { art, prefix, lane: match[1] ?? "", wave: Number(match[2]) };
    }
  }
  return null;
}
function reviewPackageMembers(art, prefix, scope, pinned, tasks, reports) {
  const path = (rel) => (scope ? `${scope}${basename(rel)}` : rel);
  const base = [path(art.path), path(art.record), ...pinned];
  const members = art.review && prefix === art.prefix ? [...base, ...tasks] : art.review && prefix === art.review ? [...base, ...tasks, ...reports] : base;
  return [...new Set(members)];
}
const TARGET_ID = /^(?:0-intent\/intent\.md#(?:goal|constraint-[1-9]\d*|decision-[1-9]\d*)|1-spec\/spec\.md#(?:R|A)[1-9]\d*|2-design-doc\/design-doc\.md#(?:D|A)[1-9]\d*|(?:3-build\/build-plan|4-document\/document-plan)\.md#(?:A|T)[1-9]\d*)$/;

function targetExists(target, read) {
  if (!TARGET_ID.test(target)) return false;
  const [path, item] = target.split("#");
  const text = read(path);
  if (text === null || text === undefined) return false;
  const body = parseFrontmatter(text).body;
  if (path === "0-intent/intent.md") {
    if (item === "goal") return /^## Goal[^\S\n]*$/mi.test(body);
    const m = item.match(/^(constraint|decision)-(\d+)$/);
    const section = m ? body.match(new RegExp(`^## ${m[1]}s?[^\\S\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "mi"))?.[1] ?? "" : "";
    return !!m && [...section.matchAll(/^\s*(?:[-*+]|\d+[.)])\s+/gm)].length >= Number(m[2]);
  }
  if (/^T\d+$/.test(item)) return read(`${path.split("/")[0]}/tasks/${item}.md`) != null;
  return new RegExp(`(?:^|[^A-Za-z0-9])${item}(?=$|[^A-Za-z0-9])`).test(body);
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
  singleton("Target", "target", (value) => /^[^#\s]+#[^#\s]+$/.test(value), "<path>#<id>");
  const originValid = (value) => /^(?:starts-from|re-attempts)\s+\S+$/.test(value) || /^issue\s+\S(?:.*\S)?$/.test(value) || /^decision-\d+$/.test(value) || /^(?:\S+\/\S+|\S+\.md(?:#\S+)?)$/.test(value);
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
    const match = value.match(/^(\S+#[^,\s]+),\s*resolution failed$/);
    if (match) recurs.push(match[1]);
    else malformed(`Prior finding: expected <review>#<issue>, resolution failed, got: ${value}`);
  }
  if (recurs.length) p.set("recurs", recurs);
  // A task file's `Depends on:` line is a fixed line with a grammar: `none`, or task ids
  // separated by commas — nothing else on the line. Anything else is malformed, never mined.
  const dependencies = [...structural.matchAll(/^[^\S\n]*(?:-[^\S\n]*)?\*?\*?Depends on:\*?\*?[^\S\n]*(.*)$/gm)];
  for (const dep of dependencies) {
    const value = dep[1].trim();
    if (/^none$/i.test(value)) p.set("depends", []);
    else if (/^T\d+(\s*,\s*T\d+)*$/.test(value)) {
      const ids = value.split(",").map((x) => x.trim());
      if (new Set(ids).size !== ids.length) malformed(`Depends on: duplicate ids: ${value}`);
      else p.set("depends", ids);
    } else malformed(`Depends on: expected none or task ids, got: ${value}`);
  }
  // A task report's `## Commits` section, up to the next heading: every line that starts with a
  // commit hash — after a bullet or a backtick — whatever follows it.
  const commits = structural.match(/^## Commits[^\S\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (commits) {
    const hashes = [...commits[1].matchAll(/^[^\S\n]*(?:[-*][^\S\n]*)?`?([0-9a-f]{7,40})\b/gm)].map((m) => m[1]);
    if (hashes.length) p.set("commits", hashes);
  }
  const report = rel.match(REPORT);
  if (report) p.set("attempt", report[3]);
  return p;
}

// The mirrors whose frontmatter value differs from the body's projection.
export function mirrorDrift(data, body, rel) {
  const p = projectBody(body, rel);
  const norm = (v) => JSON.stringify(v === undefined ? [] : [].concat(v));
  // Commits are stored canonical; the body may name them short. A body hash matches by prefix.
  const commitsMatch = () => {
    const bodyHashes = [].concat(p.get("commits") ?? []);
    const stored = [].concat(data.get("commits") ?? []);
    return bodyHashes.length === stored.length && bodyHashes.every((h, i) => stored[i].startsWith(h));
  };
  return MIRRORS.filter((k) => (k === "commits" ? !commitsMatch() : norm(p.get(k)) !== norm(data.get(k))));
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
function mirrorBody(body, fm, base, rel) {
  const p = projectBody(body, rel);
  if (p.has("malformed")) die(`stamp: INVALID ${p.get("malformed").join("; ")} — a fixed line is mirrored whole or not at all; its author fixes it`);
  const previousTarget = fm.get("target");
  for (const k of MIRRORS) fm.delete(k);
  for (const [k, v] of p) fm.set(k, v);
  if (!p.has("target")) fm.delete("target-identity");
  else if (p.get("target") !== previousTarget || !fm.has("target-identity")) {
    const id = fileIdentity(resolve(base, p.get("target").split("#")[0]));
    if (id) fm.set("target-identity", id);
    else fm.delete("target-identity");
  }
}

function cmdStamp(args) {
  const file = args._[0] || die("stamp: missing <file>");
  const { root, abs } = repositoryFor(file);
  if (!existsSync(abs)) die(`stamp: no such file: ${file}`);
  containedPath("stamp", root, abs);

  const parsedFrontmatter = parseFrontmatter(readFileSync(abs, "utf8"));
  if (parsedFrontmatter.error) die(`stamp: INVALID FRONTMATTER ${relative(root, abs)}: ${parsedFrontmatter.error}`);
  const { data, body } = parsedFrontmatter;
  const fm = data ?? new Map();
  const previousTarget = fm.get("target");
  const previousTargetIdentity = fm.get("target-identity");
  const base = pipelineFolder(root, abs);
  const rel = relative(base, abs);
  const report = rel.match(REPORT);
  const relParts = rel.split("/");
  const artifact = ARTIFACTS.find((a) => relParts[0] === a.phase && relParts.at(-1) === basename(a.path) && relParts.length <= 3);
  const siblingRecord = artifact ? `${relParts.slice(0, -1).join("/")}/${basename(artifact.record)}` : null;

  const pinList = (paths) =>
    paths.map((p) => {
      const target = containedPath("stamp", root, resolve(root, p));
      if (!target.startsWith(base + "/")) die(`stamp: a pin stays inside the pipeline folder: ${p}`);
      const sha = fileIdentity(target) ?? die(`stamp: cannot pin missing file: ${p}`);
      return `${relative(base, target)}@${sha}`;
    });

  for (const s of args.set) {
    const i = s.indexOf("=");
    if (i < 1) die(`stamp: --set expects key=value, got: ${s}`);
    const key = s.slice(0, i);
    const value = s.slice(i + 1);
    if (key !== "lane") die(`stamp: --set accepts only lane, got: ${key}`);
    if (!IDENTITY.test(value)) die(`stamp: lane must be a 12-character hexadecimal fingerprint, got: ${value}`);
  }

  let consumed = false;
  if (args.pin.length) {
    const pins = pinList(args.pin);
    if (pins.some((pin) => pinParts(pin)?.path === siblingRecord)) die(`stamp: an artifact never pins its sibling record: ${siblingRecord}`);
    fm.set("pins", pins);
    consumed = true;
  }
  if (args.reviewed.length) {
    if (fm.has("reviewed")) die("stamp: reviewed pins are immutable; a changed review is a new file");
    const reviewed = pinList(args.reviewed);
    const review = reviewArtifact(rel);
    if (review && rel.startsWith(`${review.art.phase}/`) && !review.lane) {
      const scope = rel.split("/").length === 3 ? `${dirname(rel)}/` : "";
      const artifactPath = scope ? `${scope}${basename(review.art.path)}` : review.art.path;
      const artifactFile = join(base, artifactPath);
      const artifactData = existsSync(artifactFile) ? parseFrontmatter(readFileSync(artifactFile, "utf8")).data : null;
      const artifactPins = artifactData?.get("pins");
      const parts = Array.isArray(artifactPins) ? artifactPins.map(pinParts) : [];
      if (!parts.length || parts.some((part) => !part || !IDENTITY.test(part.sha)) || new Set(parts.map((part) => part.path)).size !== parts.length)
        die(`stamp: INVALID REVIEW PACKAGE ${rel}: artifact package is unrecorded or invalid`);
      const consumed = new Map(parts.map((part) => [part.path, part.sha]));
      if (review.art.requires.some((path) => !consumed.has(path))) die(`stamp: INVALID REVIEW PACKAGE ${rel}: artifact package is incomplete`);
      const taskFolder = join(base, review.art.phase, "tasks");
      const names = existsSync(taskFolder) ? readdirSync(taskFolder) : [];
      const tasks = names.filter((name) => /^T\d+\.md$/.test(name)).map((name) => `${review.art.phase}/tasks/${name}`);
      const reports = names.filter((name) => /^T\d+-report-\d+\.md$/.test(name)).map((name) => `${review.art.phase}/tasks/${name}`);
      const expected = new Map(reviewPackageMembers(review.art, review.prefix, scope, [...consumed.keys()], tasks, reports).map((path) => [path, consumed.get(path) ?? fileIdentity(join(base, path))]));
      const actual = new Map(reviewed.map((entry) => { const part = pinParts(entry); return [part.path, part.sha]; }));
      if (expected.size !== actual.size || [...expected].some(([path, sha]) => actual.get(path) !== sha)) die(`stamp: INVALID REVIEW PACKAGE ${rel}: reviewed must equal the complete artifact package`);
    }
    fm.set("reviewed", reviewed);
    if (report) {
      const task = `${report[1]}/tasks/${report[2]}.md`;
      const taskText = existsSync(join(base, task)) ? readFileSync(join(base, task), "utf8") : "";
      const deps = [].concat(parseFrontmatter(taskText).data?.get("depends") ?? []).map((d) => `${report[1]}/tasks/${d}.md`);
      const named = fm.get("reviewed").map((p) => p.split("@")[0]).sort();
      const expected = [task, ...deps].sort();
      if (JSON.stringify(named) !== JSON.stringify(expected)) die(`stamp: a task report reviews exactly its task and its dependencies: --reviewed ${expected.join(" --reviewed ")}`);
    }
    if (report) {
      const prior = readdirSync(join(base, report[1], "tasks"))
        .map((name) => ({ name, match: name.match(new RegExp(`^${report[2]}-report-(\\d+)\\.md$`)) }))
        .filter(({ match }) => match && Number(match[1]) !== Number(report[3]))
        .filter(({ name, match }) => {
          const priorRel = `${report[1]}/tasks/${name}`;
          const parsed = parseFrontmatter(readFileSync(join(base, priorRel), "utf8"));
          const reviewed = parsed.data?.get("reviewed");
          const parts = Array.isArray(reviewed) ? reviewed.map(pinParts) : [];
          return !parsed.error && parts.length > 0 && parts.every((p) => p && IDENTITY.test(p.sha)) && new Set(parts.map((p) => p.path)).size === parts.length && parsed.data.get("attempt") === match[1] && ["completed", "failed", "blocked"].includes(parsed.data.get("outcome")) && IDENTITY.test(parsed.data.get("head")) && mirrorDrift(parsed.data, parsed.body, priorRel).length === 0;
        })
        .map(({ match }) => Number(match[1]));
      const next = Math.max(0, ...prior) + 1;
      if (Number(report[3]) !== next) die(`stamp: INVALID REPORT ${rel}: expected attempt ${next}`);
    }
    consumed = true;
  }
  for (const s of args.set) {
    const i = s.indexOf("=");
    const key = s.slice(0, i);
    const value = s.slice(i + 1);
    fm.set(key, value);
  }
  if (args.mirror) {
    mirrorBody(body, fm, base, rel);
    const review = basename(rel).match(/^(.+?)-review-(?:(.+)-)?\d+\.md$/);
    const claim = fm.get("verdict") === "unsatisfiable" && review && ARTIFACTS.some((a) => a.prefix === review[1] || a.review === review[1]);
    const amendment = /^0-intent\/\d+-amendment\.md$/.test(rel);
    const target = fm.get("target");
    const validated = target === previousTarget && previousTargetIdentity;
    const readable = (path) => {
      const file = join(base, path);
      return existsSync(file) && lstatSync(file).isFile() ? readFileSync(file, "utf8") : null;
    };
    if ((amendment || claim) && !validated && (!targetExists(target, readable) || (amendment && target.startsWith("0-intent/")))) die(`stamp: INVALID TARGET ${target ?? "?"}`);
  }
  // A report names commits that already exist; they are stored canonical (full hash).
  if (fm.has("commits")) {
    const canonical = [].concat(fm.get("commits") ?? []).map((h) => {
      try {
        return execFileSync("git", ["rev-parse", "--verify", "--quiet", `${h}^{commit}`], { cwd: root, encoding: "utf8" }).trim();
      } catch {
        die(`stamp: ## Commits names a commit that does not exist or is ambiguous: ${h}`);
      }
    });
    fm.set("commits", canonical);
  }
  if (report) {
    fm.set("attempt", report[3]);
  }
  if (consumed) {
    try {
      fm.set("head", execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim().slice(0, SHORT));
    } catch {
      /* no commits yet: no head to record */
    }
  }
  if (!fm.size) die("stamp: nothing to write (use --pin, --reviewed, --set, --mirror)");

  writeFileSync(abs, renderFrontmatter(fm, body));
  process.stdout.write(`stamped ${relative(root, abs)}\n`);
}

// --- check ------------------------------------------------------------------

function pinParts(entry) {
  const at = entry.lastIndexOf("@");
  return at === -1 ? null : { path: entry.slice(0, at), sha: entry.slice(at + 1) };
}

// The pipeline tree holds files and folders only: a symlink is never followed, it is reported.
function walk(dir) {
  const out = { files: [], symlinks: [] };
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) out.symlinks.push(p);
    else if (st.isDirectory()) {
      const sub = walk(p);
      out.files.push(...sub.files);
      out.symlinks.push(...sub.symlinks);
    } else if (name.endsWith(".md")) out.files.push(p);
  }
  return out;
}

// A tree to read the pipeline from: the working tree, or a ref (`--ref`).
function treeReader(root, abs, ref) {
  const pipelineRel = relative(root, abs);
  if (!ref) {
    const tree = walk(abs);
    return {
      list: () => tree.files.map((f) => relative(abs, f)),
      symlinks: () => tree.symlinks.map((f) => relative(abs, f)),
      read: (rel, bytes = false) => {
        const path = join(abs, rel);
        return existsSync(path) && lstatSync(path).isFile() ? readFileSync(path, bytes ? undefined : "utf8") : null;
      },
    };
  }
  const entries = execFileSync("git", ["ls-tree", "-rz", ref, "--", pipelineRel], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map((l) => {
      const tab = l.indexOf("\t");
      const meta = l.slice(0, tab);
      const path = l.slice(tab + 1);
      return { mode: meta.split(" ")[0], rel: path.slice(pipelineRel.length + 1) };
    });
  const regular = new Set(entries.filter((e) => /^100\d{3}$/.test(e.mode)).map((e) => e.rel));
  return {
    list: () => entries.filter((e) => e.mode !== "120000" && e.rel.endsWith(".md")).map((e) => e.rel),
    symlinks: () => entries.filter((e) => e.mode === "120000").map((e) => e.rel),
    read: (rel, bytes = false) => {
      if (!regular.has(rel)) return null;
      try {
        return execFileSync("git", ["show", `${ref}:${pipelineRel}/${rel}`], { cwd: root, encoding: bytes ? undefined : "utf8", stdio: ["ignore", "pipe", "ignore"] });
      } catch {
        return null;
      }
    },
  };
}

// `--lanes spec=security@<fingerprint>[materials=<path>+<path>]|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven`:
// per artifact, the named review lanes (the implicit lane is always present)
// and, after `|`, the production lanes with their `after` dependencies.
// A lane is `<id>@<fingerprint>` and may declare its material paths; a production lane may add `<dep+dep`.
const RESERVED_LANE_IDS = new Set(["tasks"]);
function parseLanes(text) {
  const decl = {};
  if (!text) return decl;
  const LANE_ID = /^[a-z0-9][a-z0-9-]*$/;
  const laneOf = (x, production) => {
    const afterParts = x.split("<");
    if (afterParts.length > 2) die(`check: invalid lane declaration "${x}" in --lanes`);
    const [head, after = ""] = afterParts;
    if (!production && afterParts.length > 1) die(`check: review lane "${head}" cannot declare after dependencies`);
    if (production && afterParts.length > 1 && !after.trim()) die(`check: lane "${head}" has an empty after dependency list`);
    const lane = head.match(/^([^@\[]+)(?:@([^@\[]+))?(?:\[materials=([^\]]+)\])?$/);
    if (!lane) die(`check: invalid lane declaration "${x}" in --lanes`);
    const [, id, fingerprint = null, materialText = null] = lane;
    if (!LANE_ID.test(id)) die(`check: invalid lane id "${id}" in --lanes`);
    if (RESERVED_LANE_IDS.has(id)) die(`check: "${id}" is a reserved name, not a lane id`);
    if (fingerprint === null) die(`check: named lane "${id}" requires a fingerprint`);
    if (!IDENTITY.test(fingerprint)) die(`check: invalid fingerprint for lane "${id}"`);
    const materials = materialText === null ? null : materialText.split("+").map((y) => y.trim());
    if (production && materials) die(`check: materials apply to review lanes only, not production lane "${id}"`);
    if (materials?.some((material) => {
      const parts = material.split("/");
      return parts.length < 2 || parts.some((part) => !part || part === "." || part === "..") || material.startsWith("/") || material.includes("@");
    }))
      die(`check: invalid material path for lane "${id}"`);
    if (materials && new Set(materials).size !== materials.length) die(`check: duplicate material path for lane "${id}"`);
    const deps = after ? after.split("+").map((y) => y.trim()) : [];
    if (deps.some((dep) => !LANE_ID.test(dep))) die(`check: invalid after dependency for lane "${id}"`);
    if (new Set(deps).size !== deps.length) die(`check: duplicate after dependency for lane "${id}"`);
    return { id, fingerprint, materials, after: deps };
  };
  for (const entry of text.split(";")) {
    const equal = entry.indexOf("=");
    if (equal < 1) die(`check: invalid artifact declaration "${entry}" in --lanes`);
    const prefix = entry.slice(0, equal).trim();
    const rest = entry.slice(equal + 1).trim();
    if (rest.replace(/\[materials=[^\]]+\]/g, "").includes("=")) die(`check: invalid artifact declaration "${entry}" in --lanes`);
    const art = ARTIFACTS.find((a) => a.prefix === prefix || a.review === prefix);
    if (!art) die(`check: unknown artifact "${prefix}" in --lanes`);
    if (Object.hasOwn(decl, prefix)) die(`check: duplicate artifact declaration "${prefix}" in --lanes`);
    const groups = rest.split("|");
    if (groups.length > 2) die(`check: invalid artifact declaration "${entry}" in --lanes`);
    const [reviews = "", production = ""] = groups;
    const list = (value, isProduction) => {
      if (!value) return [];
      const items = value.split(",").map((x) => x.trim());
      if (items.some((x) => !x)) die(`check: empty lane declaration for "${prefix}" in --lanes`);
      return items.map((x) => laneOf(x, isProduction));
    };
    const d = { review: list(reviews, false), production: list(production, true) };
    const laneIds = [...d.review, ...d.production].map((l) => l.id);
    if (new Set(laneIds).size !== laneIds.length) die(`check: duplicate lane declaration for "${prefix}" in --lanes`);
    if (d.production.length && (art.review || prefix === art.review)) die(`check: production lanes apply to the spec and design doc only, not ${prefix}`);
    const ids = new Set(d.production.map((l) => l.id));
    for (const l of d.production) for (const dep of l.after) if (!ids.has(dep)) die(`check: lane "${l.id}" comes after undeclared lane "${dep}"`);
    const visiting = new Set();
    const visit = (id, stack) => {
      if (stack.has(id)) die(`check: production lanes of ${prefix} depend on each other in a cycle`);
      if (visiting.has(id)) return;
      visiting.add(id);
      for (const dep of d.production.find((l) => l.id === id)?.after ?? []) visit(dep, new Set([...stack, id]));
    };
    for (const l of d.production) visit(l.id, new Set());
    const branches = [
      ...d.review.map((l) => `review-${l.id}`),
      ...d.production.map((l) => l.id),
      ...d.production.flatMap((p) => d.review.map((r) => `${p.id}-review-${r.id}`)),
    ];
    const collision = branches.find((branch, i) => branches.indexOf(branch) !== i);
    if (collision) die(`check: lane declarations for "${prefix}" expand to the same auxiliary branch: ${collision}`);
    decl[prefix] = d;
  }
  return decl;
}

// The fingerprint of a lane: the identity of its whole declaration — id, brief, materials, after.
export function laneFingerprint({ id, brief = "", materials = "", after = "" }) {
  const list = (s, sep) => String(s).split(sep).map((x) => x.trim()).filter(Boolean).join(sep);
  return identity(`${id}\n${String(brief).trim()}\n${list(materials, ",")}\n${list(after, "+")}\n`);
}
function cmdFingerprint(args) {
  const id = args._[0] || die("fingerprint: missing <lane id>");
  process.stdout.write(`${laneFingerprint({ id, brief: args.brief ?? "", materials: args.materials ?? "", after: args.after ?? "" })}\n`);
}

function cmdCheck(args) {
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const { root, abs } = repositoryFor(folder);
  containedPath("check", root, abs);
  const pipelineName = basename(abs);
  if (!/^[^/_]+$/.test(pipelineName)) die(`check: pipeline folder name must be one segment without / or _: ${pipelineName || folder}`);
  if (!args.ref && !existsSync(abs)) die(`check: no such folder: ${folder}`);
  const pipelineRel = relative(root, abs);
  const rev = (r, what) => {
    try {
      return execFileSync("git", ["rev-parse", "--verify", "--quiet", `${r}^{commit}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      die(`check: ${what} does not resolve: ${r}`);
    }
  };
  const ref = args.ref ? rev(args.ref, "--ref") : null;
  const tree = treeReader(root, abs, ref);
  const decl = parseLanes(args.lanes);
  const reviewLanesOf = (prefix) => [{ id: "", fingerprint: null }, ...(decl[prefix]?.review ?? [])];
  const productionLanesOf = (prefix) => decl[prefix]?.production ?? [];
  // A stamped file carries the fingerprint of the lane it was dispatched under; a declared fingerprint must match it.
  const laneMatches = (doc, fingerprint) => fingerprint === null || doc?.data.get("lane") === fingerprint;

  // Documents, each in its scope: the root ("") or a production lane ("<phase>/<id>/").
  // A file whose mirrors differ from its body's projection contradicts the tree: none of its
  // mirrors is read until it is stamped again.
  const texts = new Map();
  const all = tree
    .list()
    .sort()
    .map((rel) => {
      const text = tree.read(rel) ?? "";
      texts.set(rel, text);
      const { data: parsed, body, error: frontmatterError } = parseFrontmatter(text);
      const data = parsed ?? new Map();
      const drift = frontmatterError ? [] : mirrorDrift(data, body, rel);
      if (drift.length) for (const k of MIRRORS) data.delete(k);
      const lane = rel.match(/^([^/]+)\/([^/]+)\/(?!tasks\/)[^/]+$/);
      const scope = lane && lane[2] !== "tasks" ? `${lane[1]}/${lane[2]}/` : "";
      return { rel, name: rel.split("/").pop(), data, scope, drift, frontmatterError, malformed: projectBody(body, rel).get("malformed") ?? [] };
    });

  const identityOf = (rel) => {
    const bytes = tree.read(rel, true);
    return bytes === null ? null : byteIdentity(bytes);
  };
  const pinFresh = (entry) => {
    const p = pinParts(entry);
    if (!p || !IDENTITY.test(p.sha)) return false;
    return identityOf(p.path) === p.sha;
  };
  const pinsFresh = (pins) => Array.isArray(pins) && pins.length > 0 && pins.every(pinFresh);
  const docsOf = (sc) => all.filter((d) => d.scope === sc);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  // Reviews: `<prefix>-review-[<lane>-]<wave>.md`; the implicit lane has no id. Only declared lanes review.
  const PREFIXES = new Set(ARTIFACTS.flatMap((a) => [a.prefix, a.review]).filter(Boolean));
  const allReviewsOf = (sc) => {
    const m = [];
    for (const r of docsOf(sc)) {
      const mm = r.name.match(/^(.+?)-review-(?:(.+)-)?(\d+)\.md$/);
      if (!mm || !PREFIXES.has(mm[1])) continue;
      const artifact = ARTIFACTS.find((a) => a.prefix === mm[1] || a.review === mm[1]);
      const artifactScope = sc ? `${artifact.phase}/${sc.split("/")[1]}/` : `${artifact.phase}/`;
      if (r.rel !== `${artifactScope}${r.name}`) continue;
      m.push({ ...r, prefix: mm[1], lane: mm[2] ?? "", wave: Number(mm[3]) });
    }
    return m;
  };
  const declaredReview = (r) => reviewLanesOf(r.prefix).some((l) => l.id === r.lane);
  const reviewsOf = (sc) => allReviewsOf(sc).filter(declaredReview);
  // Lane scopes are the declared production lanes; a folder the declaration lacks is a defect, never a lane.
  const scopes = [...new Set(all.map((d) => d.scope))];
  const declaredScopes = new Set(ARTIFACTS.flatMap((a) => productionLanesOf(a.prefix).map((l) => `${a.phase}/${l.id}/`)));
  const undeclared = [
    ...scopes.filter((sc) => sc && !declaredScopes.has(sc)),
    ...scopes.flatMap((sc) => allReviewsOf(sc).filter((r) => !declaredReview(r)).map((r) => r.rel)),
  ];

  // Task files and their latest reports.
  const taskFiles = all
    .filter((d) => /^[^/]+\/tasks\/T\d+\.md$/.test(d.rel))
    .map((d) => ({ rel: d.rel, phase: d.rel.split("/")[0], id: d.name.replace(/\.md$/, ""), deps: [].concat(d.data.get("depends") ?? []) }));
  const taskFilesOf = (phase) => taskFiles.filter((t) => t.phase === phase).map((t) => t.rel);
  const reports = new Map();
  for (const t of all.filter((d) => REPORT.test(d.rel))) {
    const [, phase, id, k] = t.rel.match(REPORT);
    const key = `${phase}/${id}`;
    const attempt = Number(k);
    if (!reports.has(key) || reports.get(key).attempt < attempt)
      reports.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? (t.data.has("reviewed") ? "invalid" : "unstamped"), fresh: pinsFresh(t.data.get("reviewed")) });
  }
  const reportFilesOf = (phase) => all.filter((d) => REPORT.test(d.rel) && d.rel.startsWith(`${phase}/`)).map((d) => d.rel);

  const pinPackage = (entries) => {
    if (!Array.isArray(entries) || !entries.length) return null;
    const parts = entries.map(pinParts);
    if (parts.some((p) => !p || !IDENTITY.test(p.sha)) || new Set(parts.map((p) => p.path)).size !== parts.length) return null;
    return new Map(parts.map((p) => [p.path, p.sha]));
  };
  const currentPackage = (paths) => new Map([...new Set(paths)].map((path) => [path, identityOf(path)]));
  const packageDiff = (recorded, required) => {
    if (!recorded) return { members: true, identities: [] };
    const members = [...new Set([...recorded.keys(), ...required.keys()])].filter((path) => !recorded.has(path) || !required.has(path));
    const identities = [...required].filter(([path, sha]) => recorded.has(path) && recorded.get(path) !== sha).map(([path]) => path);
    return { members: members.length > 0, identities };
  };
  const samePackage = (a, b) => {
    const diff = packageDiff(a, b);
    return !diff.members && !diff.identities.length;
  };

  // What a review judges: the artifact package; plans add tasks, phase reviews add reports.
  const inScope = (sc, rel) => (sc ? `${sc}${rel.split("/").pop()}` : rel);
  const materialPaths = (prefix, sc, lane) => {
    const art = ARTIFACTS.find((a) => a.prefix === prefix) ?? ARTIFACTS.find((a) => a.review === prefix);
    const materials = reviewLanesOf(prefix).find((l) => l.id === lane)?.materials ?? null;
    if (materials === null) return null;
    return materials.map((path) => (sc && (path === art.path || path === art.record) ? inScope(sc, path) : path));
  };
  const packageSchemaOf = (prefix, sc) => {
    const art = ARTIFACTS.find((a) => a.prefix === prefix) ?? ARTIFACTS.find((a) => a.review === prefix);
    if (!art) return [];
    const artifactPath = inScope(sc, art.path);
    const pinned = (pinsByPath.get(artifactPath) ?? []).map((p) => pinParts(p)?.path).filter(Boolean);
    return reviewPackageMembers(art, prefix, sc, pinned, taskFilesOf(art.phase), reportFilesOf(art.phase));
  };
  const registeredReviewPackageOf = (prefix, sc, packageMap) => {
    const art = ARTIFACTS.find((a) => a.prefix === prefix) ?? ARTIFACTS.find((a) => a.review === prefix);
    const consumed = pinPackage(all.find((d) => d.rel === inScope(sc, art.path))?.data.get("pins"));
    if (!consumed || art.requires.some((path) => !consumed.has(path))) return null;
    return new Map(packageSchemaOf(prefix, sc).map((path) => [path, consumed.get(path) ?? packageMap.get(path)]));
  };
  const reviewFresh = (r, prefix, sc) => {
    const packageMap = currentPackage(packageSchemaOf(prefix, sc));
    const paths = materialPaths(prefix, sc, r.lane);
    const expected = paths === null ? packageMap : new Map(paths.map((path) => [path, packageMap.get(path)]));
    return samePackage(pinPackage(r.data.get("reviewed")), expected);
  };
  const waveValidity = (prefix, sc, wave, packageMap) => {
    if (!wave || !packageMap) return { valid: false, closed: false, reviews: [] };
    const registered = registeredReviewPackageOf(prefix, sc, packageMap);
    if (!registered || !samePackage(packageMap, registered)) return { valid: false, closed: false, reviews: [] };
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix && r.wave === wave);
    const lanes = reviewLanesOf(prefix);
    const reviews = lanes.map((lane) => rs.find((r) => r.lane === lane.id));
    if (reviews.some((r, i) => !r || !r.data.has("reviewed") || !VERDICTS.has(r.data.get("verdict")) || !laneMatches(r, lanes[i].fingerprint))) return { valid: false, closed: false, reviews: [] };
    const packages = reviews.map((r) => pinPackage(r.data.get("reviewed")));
    if (packages.some((p) => !p)) return { valid: false, closed: false, reviews };
    for (let i = 0; i < packages.length; i++) {
      const paths = materialPaths(prefix, sc, lanes[i].id);
      const expected = paths === null ? packageMap : new Map(paths.map((path) => [path, packageMap.get(path)]));
      if ([...expected.values()].some((sha) => !sha) || !samePackage(packages[i], expected)) return { valid: false, closed: false, reviews };
    }
    return { valid: reviews.every((r) => r.data.get("verdict") === "approved"), closed: true, reviews, package: packageMap };
  };
  const latestWaveOf = (prefix, sc) => Math.max(0, ...reviewsOf(sc).filter((r) => r.prefix === prefix).map((r) => r.wave));
  const certifiedPackageOf = (prefix, sc, wave) => pinPackage(reviewsOf(sc).find((r) => r.prefix === prefix && r.wave === wave && r.lane === "")?.data.get("reviewed"));

  // Lanes of one artifact in one scope: each declared lane's latest review (by wave).
  const laneStates = (prefix, sc) => {
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix);
    const currentWave = latestWaveOf(prefix, sc);
    const wave = waveValidity(prefix, sc, currentWave, currentPackage(packageSchemaOf(prefix, sc)));
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
        waveApproved: wave.valid,
        waveClosed: wave.closed,
        review: r,
      };
    });
  };
  const VERDICTS = new Set(["approved", "rejected", "unsatisfiable"]);
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
    const approvedAll = (w) => waveValidity(prefix, sc, w, certifiedPackageOf(prefix, sc, w)).valid;
    const lastApproved = Math.max(0, ...waves.filter(approvedAll));
    const start = lastApproved;
    const episode = Math.max(0, last - start);
    const recurs = rs.filter((r) => r.wave > start).flatMap((r) => [].concat(r.data.get("recurs") ?? []));
    return { episode, recurs, last };
  };

  const out = { pipeline: pipelineRel, ref, contradictions: [], triggers: [], claims: [], lanes: [], artifacts: [], tasks: {}, counters: {}, frontier: null };
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

  for (const [prefix, lanes] of Object.entries(decl)) {
    const art = ARTIFACTS.find((a) => a.prefix === prefix || a.review === prefix);
    const scopes = ["", ...lanes.production.map((lane) => `${art.phase}/${lane.id}/`)];
    for (const lane of lanes.review.filter((candidate) => candidate.materials !== null)) {
      for (const sc of scopes.filter((scope) => pinsByPath.has(inScope(scope, art.path)))) {
        const packagePaths = new Set(packageSchemaOf(prefix, sc));
        const outside = materialPaths(prefix, sc, lane.id).filter((path) => !packagePaths.has(path));
        if (outside.length) die(`check: materials for review lane "${lane.id}" are outside the ${inScope(sc, art.path)} package: ${outside.join(", ")}`);
      }
    }
  }

  // Facts about branch commits require a valid representation and a real merge-base.
  const tip = ref ?? rev("HEAD", "HEAD");
  const startsFrom = [].concat(all.find((d) => d.rel === "0-intent/intent.md")?.data.get("origin") ?? []).map((o) => o.match(/^starts-from\s+(\S+)$/)?.[1]).find(Boolean);
  const baseRef = startsFrom ? rev(startsFrom, "the starts-from branch") : args.base ? rev(args.base, "--base") : die("check: --base <ref> is required — the artifact base branch — unless the intent declares starts-from");
  let base;
  try {
    base = execFileSync("git", ["merge-base", baseRef, tip], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    die(`check: no merge-base between ${startsFrom ?? args.base} and ${args.ref ?? "HEAD"}`);
  }
  const phaseOfTarget = (targetPath) => ARTIFACTS.findIndex((a) => a.path === targetPath) + 1;
  const inScopePhase = (targetPath) => targetPath === "0-intent/intent.md" || phaseOfTarget(targetPath) <= args.targetPhase;

  // pending → adjudicated (the target pins it) → resolved (the target approved
  // carrying the pin), or resolved by escalation (a closed wave of the target
  // corroborated an unsatisfiable verdict citing it).
  const resolutionOf = (item) => {
    if (item.targetPath === "0-intent/intent.md") return { state: "pending" };
    const targetArtifact = ARTIFACTS.find((x) => x.path === item.targetPath);
    if (!targetArtifact) return { state: "pending" };
    const lanes = laneStates(targetArtifact.prefix, "");
    for (const l of lanes)
      if (l.review && l.verdict === "unsatisfiable" && l.fresh && waveClosed(lanes) && !lanes.some((x) => x.verdict === "rejected") && [].concat(l.review.data.get("origin") ?? []).includes(item.rel))
        return { state: "resolved", detail: `escalated by ${l.review.rel}` };
    const pinned = (pinsByPath.get(item.targetPath) ?? []).some((p) => pinParts(p)?.path === item.rel);
    if (!pinned) return { state: "pending" };
    const approved = waveValidity(targetArtifact.prefix, "", latestWaveOf(targetArtifact.prefix, ""), currentPackage(packageSchemaOf(targetArtifact.prefix, ""))).valid;
    return approved ? { state: "resolved", detail: `${item.targetPath} approved carrying it` } : { state: "adjudicated", detail: `by ${item.targetPath}, awaiting approval` };
  };

  // 1. Triggers: external amendments and fresh failed task reports.
  const triggers = [
    ...all.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel)).map((d) => ({ rel: d.rel, kind: "amendment", target: d.data.get("target") ?? "?" })),
    ...[...reports.values()].filter((t) => t.outcome === "failed" && t.fresh).map((t) => ({ rel: t.rel, kind: `failed task ${t.id}`, target: ARTIFACTS.find((x) => x.phase === t.phase)?.path ?? "?" })),
  ].map((t) => ({ ...t, targetPath: t.target.split("#")[0] }));
  let unresolvedInScope = false;
  for (const t of triggers) {
    const res = resolutionOf(t);
    const scoped = inScopePhase(t.targetPath);
    const label = res.state === "pending" ? (scoped ? "PENDING" : "pending, beyond the target phase") : `${res.state}${res.detail ? ` (${res.detail})` : ""}`;
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, state: res.state, detail: res.detail ?? null, inScope: scoped });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${label}`);
    if (res.state === "pending" && scoped) take(`trigger ${t.rel} → ${t.target}`);
    if (res.state !== "resolved" && scoped) unresolvedInScope = true;
  }

  // 2. Claims: an unsatisfiable verdict whose wave closed with no rejection.
  const claims = [];
  for (const sc of scopes)
    for (const r of reviewsOf(sc)) {
      if (r.data.get("verdict") !== "unsatisfiable") continue;
      // A claim is its lane's verdict: the lane's latest review is the one that stands.
      const lanes = laneStates(r.prefix, sc);
      const mine = lanes.find((l) => l.review?.rel === r.rel);
      const later = reviewsOf(sc).some((x) => x.prefix === r.prefix && x.lane === r.lane && x.wave > r.wave);
      const c = {
        rel: r.rel,
        target: r.data.get("target") ?? "?",
        targetPath: (r.data.get("target") ?? "?").split("#")[0],
        targetIdentity: r.data.get("target-identity"),
        fresh: mine ? mine.fresh : reviewFresh(r, r.prefix, sc),
        waveOpen: !waveClosed(lanes),
        rejected: lanes.some((l) => l.verdict === "rejected"),
      };
      const cur = identityOf(c.targetPath);
      const unchanged = c.targetIdentity && cur && cur === c.targetIdentity;
      const res = resolutionOf(c);
      if (later) c.state = "superseded (its lane reviewed again)";
      else if (c.targetIdentity && !unchanged) c.state = "superseded (target changed)";
      else if (res.state === "resolved") c.state = `resolved (${res.detail})`;
      else if (!c.fresh) c.state = "moot (claiming artifact changed)";
      else if (c.waveOpen) c.state = "wave open";
      else if (c.rejected) c.state = "held (a lane rejected; adjudicate first)";
      else if (res.state === "adjudicated") c.state = `adjudicated (${res.detail})`;
      else c.state = c.targetIdentity ? "pending" : "pending (no target-identity)";
      const source = ARTIFACTS.find((a) => a.prefix === r.prefix || a.review === r.prefix);
      c.claimArtifactPath = source ? inScope(sc, source.path) : null;
      claims.push(c);
    }
  const pending = claims.filter((c) => c.state === "pending");
  for (const c of pending) {
    const above = pending.find((o) => o !== c && o.claimArtifactPath === c.targetPath);
    if (above) c.state = `suspended (behind ${above.rel})`;
  }
  const ownerTerritory = (target) => /^0-intent\/intent\.md#(goal|constraint-\d+|decision-\d+)$/.test(target);
  for (const c of claims) {
    const scoped = inScopePhase(c.targetPath);
    if (c.state === "pending") c.state = !scoped ? "pending, beyond the target phase" : ownerTerritory(c.target) ? "PENDING — owner escalation" : "PENDING";
    out.claims.push({ review: c.rel, target: c.target, state: c.state, inScope: scoped });
    lines.push(`claim    ${c.rel} → ${c.target}  ${c.state}`);
    if (c.state.startsWith("PENDING")) take(`claim ${c.rel} → ${c.target}${c.state.includes("owner") ? " (owner escalation)" : ""}`);
    if (!/^(resolved|superseded|moot|pending, beyond)/.test(c.state) && scoped) unresolvedInScope = true;
  }

  // 3. Phases in order, up to the target; a phase's production lanes come before its root artifact.
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane || "·"}:${l.verdict}${l.verdict !== "none" && l.verdict !== "unstamped" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  const artifactState = (doc, art, sc, extraPackage = new Map(), fingerprint = null) => {
    const pins = doc?.data.get("pins");
    const buildPackage = art.prefix === "document-plan" ? [...taskFilesOf("3-build"), ...reportFilesOf("3-build")] : [];
    const required = [...new Set([...art.requires, ...buildPackage])];
    let requirementsReady = true;
    // Each required input is consumed with its current approval: every lane's review of the wave that approved it.
    for (const req of required) {
      const inputArt = ARTIFACTS.find((a) => a.path === req) ?? ARTIFACTS.find((a) => a.review && req === a.path && false);
      if (!inputArt) continue;
      const lanes = laneStates(inputArt.prefix, "");
      if (waveValidity(inputArt.prefix, "", latestWaveOf(inputArt.prefix, ""), currentPackage(packageSchemaOf(inputArt.prefix, ""))).valid) required.push(...lanes.map((l) => l.review.rel));
      else requirementsReady = false;
    }
    if (art.requiresReview) {
      const lanes = laneStates(art.requiresReview, "");
      if (waveValidity(art.requiresReview, "", latestWaveOf(art.requiresReview, ""), currentPackage(packageSchemaOf(art.requiresReview, ""))).valid) required.push(...lanes.map((l) => l.review.rel));
      else requirementsReady = false;
    }
    const recorded = pinPackage(pins);
    const siblingRecord = inScope(sc, art.record);
    const retained = [...(recorded?.keys() ?? [])].filter((path) => path !== siblingRecord);
    const requiredPackage = currentPackage([...required, ...retained]);
    for (const [path, sha] of extraPackage) requiredPackage.set(path, sha);
    const diff = packageDiff(recorded, requiredPackage);
    const stale = !Array.isArray(pins) || pins.length === 0 ? [] : [
      ...(diff.members || !requirementsReady ? ["package members"] : []),
      ...(diff.identities.length ? [`package identities: ${diff.identities.join(", ")}`] : []),
      ...(!laneMatches(doc, fingerprint) ? ["lane declaration"] : []),
    ];
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : "fresh";
    const lanes = laneStates(art.prefix, sc);
    const e = episodeOf(art.prefix, sc);
    const approved = waveValidity(art.prefix, sc, latestWaveOf(art.prefix, sc), currentPackage(packageSchemaOf(art.prefix, sc))).valid;
    return { state, stale, lanes, approved, episode: e.episode, recurs: e.recurs };
  };
  const nextFor = (path, st) =>
    st.state === "stale" ? `re-synthesize ${path}` : st.state !== "fresh" ? `stamp ${path}` : (unstampedReview(st.lanes) ?? (waveClosed(st.lanes) ? `adjudicate ${path}` : `review wave ${path}`));
  let through = 0;
  let stopped = false;
  const phaseDone = (phaseNo) => {
    if (!stopped && phaseNo === through + 1) through = phaseNo;
  };
  for (const [i, art] of ARTIFACTS.entries()) {
    const phaseNo = i + 1;
    if (phaseNo > args.targetPhase) break;
    const name = art.path.split("/")[1];
    const rootExists = texts.has(art.path);
    const declaredLanes = productionLanesOf(art.prefix);
    const laneScopes = declaredLanes.map((l) => `${art.phase}/${l.id}/`).sort();
    const laneOf = (sc) => declaredLanes.find((l) => l.id === sc.split("/")[1]);
    const rootPinParts = (pinsByPath.get(art.path) ?? []).map(pinParts).filter(Boolean);
    const rootPinMap = new Map(rootPinParts.map((p) => [p.path, p.sha]));
    const consumedApproval = (sc) => {
      const waves = [...new Set(reviewsOf(sc).filter((r) => r.prefix === art.prefix && rootPinMap.has(r.rel)).map((r) => r.wave))];
      return waves.map((wave) => waveValidity(art.prefix, sc, wave, certifiedPackageOf(art.prefix, sc, wave))).find((state) => {
        if (!state.valid || state.reviews.some((r) => !rootPinMap.has(r.rel))) return false;
        return [`${sc}${name}`, `${sc}${art.record.split("/").pop()}`].every((path) => rootPinMap.get(path) === state.package.get(path));
      });
    };
    const closedPackage = (sc) => {
      if (!rootExists) return null;
      const approval = consumedApproval(sc);
      const paths = approval ? [`${sc}${name}`, `${sc}${art.record.split("/").pop()}`, ...approval.reviews.map((r) => r.rel)] : [];
      return paths.length && paths.every((path) => rootPinMap.has(path)) ? new Map(paths.map((path) => [path, rootPinMap.get(path)])) : null;
    };
    const lanePackage = (sc) => {
      const closed = closedPackage(sc);
      if (closed) return closed;
      const approval = waveValidity(art.prefix, sc, latestWaveOf(art.prefix, sc), currentPackage(packageSchemaOf(art.prefix, sc)));
      const paths = [`${sc}${name}`, `${sc}${art.record.split("/").pop()}`, ...(approval.valid ? approval.reviews.map((r) => r.rel) : [])];
      return currentPackage(paths);
    };
    const dependencyPackage = (sc) => {
      const packageMap = new Map();
      for (const dep of laneOf(sc).after) for (const entry of lanePackage(`${art.phase}/${dep}/`)) packageMap.set(...entry);
      return packageMap;
    };
    const laneApproved = (sc) => {
      if (closedPackage(sc)) return true;
      const lane = laneOf(sc);
      if (lane.after.some((dep) => !laneApproved(`${art.phase}/${dep}/`))) return false;
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      return !!doc && (() => {
        const st = artifactState(doc, art, sc, dependencyPackage(sc), lane.fingerprint);
        return st.state === "fresh" && waveValidity(art.prefix, sc, latestWaveOf(art.prefix, sc), currentPackage(packageSchemaOf(art.prefix, sc))).valid;
      })();
    };
    let lanesReady = laneScopes.length > 0;
    for (const sc of laneScopes) {
      const { after, fingerprint } = laneOf(sc);
      const waiting = after.filter((dep) => !laneApproved(`${art.phase}/${dep}/`));
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      const st = doc ? artifactState(doc, art, sc, dependencyPackage(sc), fingerprint) : { state: "missing", stale: [], lanes: [], approved: false, episode: 0, recurs: [] };
      const closed = !!closedPackage(sc);
      const ok = closed || (st.approved && st.state === "fresh" && !waiting.length);
      if (!ok) lanesReady = false;
      out.lanes.push({ lane: sc, artifact: `${sc}${name}`, ...st, lanes: st.lanes.map(({ review, ...x }) => x), after, waiting, closed });
      lines.push(`lane     ${sc}${name}  ${closed ? "closed" : st.state.toUpperCase()}${!closed && st.stale.length ? ` — ${st.stale.join("; ")}` : ""}${!closed && waiting.length ? `  waiting for ${waiting.join(", ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}`);
      if (!closed && !ok && !waiting.length) take(`${st.state === "missing" ? `synthesize ${sc}${name}` : nextFor(`${sc}${name}`, st)}`);
      if (st.episode || st.recurs.length) out.counters[`${sc}${art.prefix}`] = { episode: st.episode, recurs: st.recurs };
    }
    const laneCandidates = laneScopes.filter(laneApproved).map((sc) => ({ lane: sc, package: [...lanePackage(sc).keys()] }));
    const needsConsolidation = laneScopes.some((sc) => !closedPackage(sc) && laneApproved(sc));
    const renderCandidates = () => lines.push(`Lane candidates  ${laneCandidates.map((candidate) => `${candidate.lane}: ${candidate.package.join(", ")}`).join("; ")}`);
    if (!rootExists) {
      out.artifacts.push({ artifact: art.path, state: "missing", consolidate: laneScopes.length ? lanesReady : undefined, ...(lanesReady ? { laneCandidates } : {}) });
      lines.push(`artifact ${art.path}  MISSING${laneScopes.length ? (lanesReady ? " — every lane approved: consolidate" : " — lanes in progress") : ""}`);
      if (laneScopes.length && lanesReady) {
        renderCandidates();
        take(`consolidate ${art.path}`);
      }
      else if (!laneScopes.length) take(`synthesize ${art.path}`);
      stopped = true;
      continue;
    }
    const rootLanePackage = new Map();
    for (const sc of laneScopes) for (const entry of lanePackage(sc)) rootLanePackage.set(...entry);
    const st = artifactState(all.find((d) => d.rel === art.path), art, "", rootLanePackage);
    out.artifacts.push({ artifact: art.path, ...st, lanes: st.lanes.map(({ review, ...x }) => x), ...(lanesReady && needsConsolidation ? { consolidate: true, laneCandidates } : {}) });
    if (st.episode || st.recurs.length) out.counters[art.prefix] = { episode: st.episode, recurs: st.recurs };
    lines.push(`artifact ${art.path}  ${st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}`);
    if (st.state !== "fresh" || !st.approved) {
      if (lanesReady && needsConsolidation) {
        renderCandidates();
        take(`consolidate ${art.path}`);
      } else take(nextFor(art.path, st));
      stopped = true;
    }
    if (!art.review) {
      if (st.state === "fresh" && st.approved) phaseDone(phaseNo);
      continue;
    }
    // Build and document: the phase's task files, their latest reports, then the phase review.
    const planTasks = taskFiles.filter((t) => t.phase === art.phase).sort((x, y) => Number(x.id.slice(1)) - Number(y.id.slice(1)));
    const phaseReports = [...reports.values()].filter((t) => t.phase === art.phase);
    const latestOf = (id) => phaseReports.find((t) => t.id === id);
    const isDone = (id) => {
      const r = latestOf(id);
      return !!r && r.outcome === "completed" && r.fresh;
    };
    // A fresh failed report holds its task until the plan adjudicates it (pins it).
    const held = (id) => {
      const r = latestOf(id);
      if (!r || r.outcome !== "failed" || !r.fresh) return false;
      return !(pinsByPath.get(art.path) ?? []).some((p) => pinParts(p)?.path === r.rel);
    };
    // A fresh blocked report leaves its task pending: the environment, not the plan, is what changes before the next attempt.
    const blockedBy = (id) => {
      const r = latestOf(id);
      return !!r && r.outcome === "blocked" && r.fresh;
    };
    const done = planTasks.filter((t) => isDone(t.id)).map((t) => t.id);
    const open = phaseReports.filter((t) => !isDone(t.id)).map((t) => `${t.id}:${t.outcome}${t.outcome === "completed" ? " (stale)" : ""}`);
    // Every attempt is a report: landed without its pins it is stamped; stamped without an outcome it is invalid.
    const reportDocs = all.filter((d) => REPORT.test(d.rel) && d.rel.startsWith(`${art.phase}/`));
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
    const next = planTasks.find((t) => !isDone(t.id) && t.deps.every(isDone) && !held(t.id));
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
      take(next ? `${blockedBy(next.id) ? "blocked" : "task"} ${art.phase}/${next.id}` : `tasks held in ${art.phase}: ${remaining.join(", ")}`);
      stopped = true;
    }
    // Phase review: names the plan, its record, its inputs, every task, and every report.
    const rl = laneStates(art.review, "");
    const e = episodeOf(art.review, "");
    const rApproved = waveValidity(art.review, "", latestWaveOf(art.review, ""), currentPackage(packageSchemaOf(art.review, ""))).valid;
    out[`${art.review}Review`] = { lanes: rl.map(({ review, ...x }) => x), approved: rApproved, episode: e.episode, recurs: e.recurs };
    if (e.episode || e.recurs.length) out.counters[art.review] = { episode: e.episode, recurs: e.recurs };
    lines.push(`${art.review.padEnd(8)} review: ${render(rl)}${rApproved ? "  APPROVED" : ""}`);
    if (!rApproved) {
      take(`${unstampedReview(rl) ?? (waveClosed(rl) ? `adjudicate ${art.path} (${art.review} review)` : `${art.review} review`)}`);
      stopped = true;
    } else {
      phaseDone(phaseNo);
    }
  }

  // Every commit after the base outside the pipelines folder is claimed by a task report.
  const pipelinesRoot = pipelineRel.split("/").slice(0, -1).join("/") || ".";
  const onBranch = execFileSync("git", ["log", "--format=%H", `${base}..${tip}`, "--", ".", `:(exclude)${pipelinesRoot}`], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  const claimed = all.filter((d) => REPORT.test(d.rel)).flatMap((d) => [].concat(d.data.get("commits") ?? []));
  const unclaimed = onBranch.filter((h) => !claimed.some((c) => h.startsWith(c)));
  out.base = base.slice(0, SHORT);
  out.unclaimedCommits = unclaimed;
  if (unclaimed.length) {
    lines.push(`commits  unclaimed by any task report: ${unclaimed.map((h) => h.slice(0, 7)).join(", ")}`);
    take(`unclaimed commits: ${unclaimed.map((h) => h.slice(0, 7)).join(", ")}`);
  }

  // 4. Counters and completion.
  for (const [label, c] of Object.entries(out.counters))
    lines.push(`counter  ${label}: ${c.episode} wave${c.episode === 1 ? "" : "s"} this episode${c.recurs.length ? `  recurs: ${c.recurs.join(", ")}` : ""}`);
  out.completeThrough = through;
  out.targetPhase = args.targetPhase;
  out.complete = !frontier && !unresolvedInScope && through >= args.targetPhase;
  if (!frontier && unresolvedInScope) frontier = "triggers or claims still adjudicated, awaiting approval";
  if (!frontier && !out.complete) die(`check: no frontier before target phase ${args.targetPhase}`);
  if (!frontier) frontier = "complete";
  out.frontier = frontier;
  lines.push(`complete through phase ${through}${out.complete ? " — target reached" : ` (target ${args.targetPhase})`}`);
  lines.push(`frontier ${frontier}`);
  process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
}

// --- cli --------------------------------------------------------------------

const COMMAND_OPTIONS = {
  stamp: new Set(["--pin", "--reviewed", "--set", "--mirror"]),
  check: new Set(["--json", "--lanes", "--target-phase", "--ref", "--base"]),
  fingerprint: new Set(["--brief", "--materials", "--after"]),
};

function parseArgs(command, argv) {
  const args = { _: [], pin: [], reviewed: [], set: [], mirror: false, json: false, lanes: null, targetPhase: ARTIFACTS.length, ref: null, base: null };
  const used = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // Every option is validated here: an unknown one, a missing value, or a value out of range is an error.
    const value = () => (i + 1 < argv.length ? argv[++i] : die(`${a} expects a value`));
    const integer = (min, max) => {
      const raw = value();
      const n = Number(raw);
      if (!/^\d+$/.test(raw) || n < min || n > max) die(`${a} expects an integer from ${min} to ${max}, got: ${raw}`);
      return n;
    };
    if (a.startsWith("--") && !COMMAND_OPTIONS[command].has(a)) die(`${command}: option ${a} is not allowed`);
    if (a.startsWith("--") && !["--pin", "--reviewed"].includes(a) && used.has(a)) die(`${command}: ${a} may appear only once`);
    if (a.startsWith("--")) used.add(a);
    if (a === "--pin") args.pin.push(value());
    else if (a === "--reviewed") args.reviewed.push(value());
    else if (a === "--set") args.set.push(value());
    else if (a === "--mirror") args.mirror = true;
    else if (a === "--json") args.json = true;
    else if (a === "--lanes") args.lanes = value();
    else if (a === "--target-phase") args.targetPhase = integer(1, ARTIFACTS.length);
    else if (a === "--ref") args.ref = value();
    else if (a === "--base") args.base = value();
    else if (a === "--brief") args.brief = value();
    else if (a === "--materials") args.materials = value();
    else if (a === "--after") args.after = value();
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
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set lane=<fingerprint>] [--mirror]
  node rp.mjs fingerprint <lane id> [--brief <text>] [--materials <a,b>] [--after <lane+lane>]
  node rp.mjs check <pipeline-folder> --base <ref> [--lanes "spec=security@<fingerprint>[materials=<path>+<path>]|event-driven@<fingerprint>,contrarian@<fingerprint><event-driven;build=fresh@<fingerprint>"] [--target-phase <n>] [--ref <branch>] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, --mirror copies of body declarations (Verdict, Brief, Target,
Origin, Outcome — completed | failed | blocked — Prior finding, a task's
Depends on, a report's Commits), and head — the commit
a stamp with pins observed. Identity is the first 12 hexadecimal characters of
git's blob hash of every body byte: stamping never
changes it. check reports the frontier: triggers, claims, then phases in order
up to the target — production lanes, artifacts, tasks, phase reviews,
and completion. --base names the artifact base branch: the
pipeline's own commits follow its merge-base with the inspected ref, or with the
branch the intent starts-from when it declares one. --lanes declares, per
artifact, the named review lanes (the implicit lane always exists) and, after |,
the production lanes with their after-dependencies (<, joined by +); each named
lane carries the fingerprint of its whole declaration (fingerprint), which the
lane's artifact and reviews must carry as \`lane\`, set at their stamp. Optional
materials= lists the pipeline-relative paths a filtered review lane reviews.
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
      cmdStamp(args);
      break;
    case "check":
      cmdCheck(args);
      break;
    case "fingerprint":
      cmdFingerprint(args);
      break;
  }
  }
}
