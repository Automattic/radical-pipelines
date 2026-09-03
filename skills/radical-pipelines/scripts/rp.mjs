#!/usr/bin/env node
// rp — state tooling for Radical Pipelines v3.
// Zero dependencies. Serves the spec in ../reference/run/state.md; everything
// it does can be done with bare git. Commands: stamp, check.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const SHORT = 12;

function die(msg) {
  process.stderr.write(`rp: ${msg}\n`);
  process.exit(1);
}

function repoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    die("not inside a git repository");
  }
}

// --- frontmatter (subset: scalars and lists of strings) ---------------------

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: null, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { data: null, body: text };
  const body = text.slice(text.indexOf("\n", end + 1) + 1);
  const data = new Map();
  let currentList = null;
  for (const line of text.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && currentList) {
      data.get(currentList).push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === "") {
      data.set(kv[1], []);
      currentList = kv[1];
    } else {
      data.set(kv[1], kv[2].trim());
      currentList = null;
    }
  }
  return { data, body };
}

function renderFrontmatter(data, body) {
  let out = "---\n";
  for (const [k, v] of data) {
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out += `${k}:\n`;
      for (const item of v) out += `  - ${item}\n`;
    } else {
      out += `${k}: ${v}\n`;
    }
  }
  return out + "---\n" + body;
}

// --- identity: hash of the body only ----------------------------------------

export function identity(text) {
  const { body } = parseFrontmatter(text);
  return execFileSync("git", ["hash-object", "--stdin"], { input: body, encoding: "utf8" })
    .trim()
    .slice(0, SHORT);
}

function fileIdentity(abs) {
  if (!existsSync(abs)) return null;
  return identity(readFileSync(abs, "utf8"));
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

function mirrorBody(body, fm, base, abs) {
  const verdict = body.match(/^Verdict:\s*(approved|rejected|unsatisfiable)\s*$/m);
  if (verdict) fm.set("verdict", verdict[1]);
  const target = body.match(/^Target:\s*(\S+)\s*$/m);
  if (target) {
    fm.set("target", target[1]);
    const targetPath = target[1].split("#")[0];
    const id = fileIdentity(resolve(base, targetPath));
    if (id) fm.set("target-identity", id);
  }
  const origin = body.match(/^Origin:\s*(.+)$/m);
  if (origin) fm.set("origin", origin[1].trim());
  const outcome = body.match(/^Outcome:\s*(completed|failed)\s*$/m);
  if (outcome) fm.set("outcome", outcome[1]);
  const recurs = [...body.matchAll(/^Prior finding:\s*(\S+#[^,\s]+),\s*resolution failed\s*$/gm)].map((m) => m[1]);
  if (recurs.length) fm.set("recurs", recurs);
}

function cmdStamp(args) {
  const root = repoRoot();
  const file = args._[0] || die("stamp: missing <file>");
  const abs = resolve(root, file);
  if (!existsSync(abs)) die(`stamp: no such file: ${file}`);

  const { data, body } = parseFrontmatter(readFileSync(abs, "utf8"));
  const fm = data ?? new Map();
  const base = pipelineFolder(root, abs);

  const pinList = (paths) =>
    paths.map((p) => {
      const target = resolve(root, p);
      const sha = fileIdentity(target) ?? die(`stamp: cannot pin missing file: ${p}`);
      return `${relative(base, target)}@${sha}`;
    });

  if (args.pin.length) fm.set("pins", pinList(args.pin));
  if (args.reviewed.length) {
    if (fm.has("reviewed") && !args.force) die("stamp: review pins are immutable (use --force to override)");
    fm.set("reviewed", pinList(args.reviewed));
  }
  for (const s of args.set) {
    const i = s.indexOf("=");
    if (i < 1) die(`stamp: --set expects key=value, got: ${s}`);
    fm.set(s.slice(0, i), s.slice(i + 1));
  }
  if (args.mirror) mirrorBody(body, fm, base, abs);
  if (!fm.size) die("stamp: nothing to write (use --pin, --reviewed, --set, --mirror)");

  writeFileSync(abs, renderFrontmatter(fm, body));
  process.stdout.write(`stamped ${relative(root, abs)}\n`);
}

// --- check ------------------------------------------------------------------

function pinParts(entry) {
  const at = entry.lastIndexOf("@");
  return at === -1 ? null : { path: entry.slice(0, at), sha: entry.slice(at + 1) };
}

function pinState(base, entry) {
  const p = pinParts(entry);
  if (!p) return { entry, state: "malformed" };
  const current = fileIdentity(resolve(base, p.path));
  if (current === null) return { entry, state: "target-missing" };
  return { entry, state: current.startsWith(p.sha) || p.sha.startsWith(current) ? "fresh" : "stale" };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function codeUnchangedSince(root, head, pipelinesRoot) {
  try {
    execFileSync("git", ["diff", "--quiet", head, "HEAD", "--", ".", `:(exclude)${pipelinesRoot}`], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

const ARTIFACTS = [
  ["1-spec/spec.md", "spec"],
  ["2-design-doc/design-doc.md", "design-doc"],
  ["3-build/build-plan.md", "build-plan"],
  ["4-document/document-plan.md", "document-plan"],
];
const PHASE_REVIEWS = [
  ["3-build", "build"],
  ["4-document", "document"],
];

function cmdCheck(args) {
  const root = repoRoot();
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const abs = resolve(root, folder);
  if (!existsSync(abs)) die(`check: no such folder: ${folder}`);
  const pipelineRel = relative(root, abs);
  const pipelinesRoot = pipelineRel.split("/").slice(0, -1).join("/") || ".";
  const lanes = args.lanes ? args.lanes.split(",") : null;

  const files = walk(abs).sort();
  const docs = files.map((f) => {
    const rel = relative(abs, f);
    const { data } = parseFrontmatter(readFileSync(f, "utf8"));
    return { rel, name: rel.split("/").pop(), data: data ?? new Map() };
  });

  const reviews = docs.filter((d) => /-review-/.test(d.name));
  const amendments = docs.filter((d) => /(^|\/)0-intent\/(\d+-amendment|amendment-\d+)\.md$/.test(d.rel));
  const reports = docs.filter((d) => /^task-.+-\d+\.md$/.test(d.name) && d.rel.includes("tasks/"));

  // Latest review per artifact-prefix + lane.
  const latest = new Map();
  for (const r of reviews) {
    const lane = r.data.get("lane") ?? "r1";
    const iter = Number(r.data.get("iteration") ?? 0);
    const prefix = r.name.replace(/-review-(?:r[^-]+-)?\d+\.md$/, "");
    const key = `${prefix}|${lane}`;
    const prev = latest.get(key);
    if (!prev || Number(prev.data.get("iteration") ?? 0) < iter) latest.set(key, { ...r, lane, iter, prefix });
  }

  // Latest attempt per task, keyed by phase folder + task id.
  const tasks = new Map();
  for (const t of reports) {
    const phase = t.rel.split("/")[0];
    const id = t.data.get("task") ?? t.name.replace(/^task-(.+)-\d+\.md$/, "$1");
    const attempt = Number(t.data.get("attempt") ?? t.name.match(/-(\d+)\.md$/)[1]);
    const key = `${phase}/${id}`;
    const prev = tasks.get(key);
    if (!prev || prev.attempt < attempt)
      tasks.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? "unstamped" });
  }
  const planOf = (phase) => ARTIFACTS.find(([p]) => p.startsWith(`${phase}/`))?.[0] ?? `${phase}/plan.md`;

  // Triggers.
  const triggers = [];
  for (const a of amendments) triggers.push({ rel: a.rel, kind: "amendment", target: a.data.get("target") ?? "?" });
  for (const t of tasks.values()) if (t.outcome === "failed") triggers.push({ rel: t.rel, kind: `failed task ${t.id}`, target: planOf(t.phase) });
  for (const r of latest.values())
    if (r.data.get("verdict") === "unsatisfiable")
      triggers.push({ rel: r.rel, kind: "claim", target: r.data.get("target") ?? "?", targetIdentity: r.data.get("target-identity"), review: r });

  const allPins = new Map(); // artifact rel -> pin entries
  for (const d of docs) {
    const pins = d.data.get("pins");
    if (Array.isArray(pins)) allPins.set(d.rel, pins);
  }

  const resolvedBy = (trigger) => {
    const targetPath = trigger.target.split("#")[0];
    for (const [holder, pins] of allPins)
      if (holder === targetPath || targetPath === holder)
        for (const p of pins) if (pinParts(p)?.path === trigger.rel) return `pinned by ${holder}`;
    for (const r of latest.values()) {
      const reviewed = r.data.get("reviewed");
      if (!Array.isArray(reviewed)) continue;
      const coversTarget = reviewed.some((p) => pinParts(p)?.path === targetPath);
      if (coversTarget && r.data.get("origin") === trigger.rel && r.data.get("verdict") === "approved")
        return `adjudicated by ${r.rel}`;
    }
    return null;
  };

  const out = { pipeline: pipelineRel, triggers: [], claims: [], artifacts: [], tasks: {}, counters: {} };
  const lines = [`${pipelineRel}`];

  // 1. Triggers.
  const claimTargets = new Set();
  for (const t of triggers) {
    if (t.kind === "claim") continue; // reported under claims
    const res = resolvedBy(t);
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, resolved: res });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${res ?? "PENDING"}`);
  }

  // 2. Claims.
  for (const t of triggers) {
    if (t.kind !== "claim") continue;
    const targetPath = t.target.split("#")[0];
    const reviewedPins = t.review?.data.get("reviewed");
    const claimFresh = Array.isArray(reviewedPins) && reviewedPins.length > 0 && reviewedPins.every((p) => pinState(abs, p).state === "fresh");
    const res = resolvedBy(t);
    const current = fileIdentity(resolve(abs, targetPath));
    const pinned = t.targetIdentity;
    const unchanged = pinned && current && (current.startsWith(pinned) || pinned.startsWith(current));
    let state;
    if (pinned && !unchanged) state = "superseded (target changed)";
    else if (res) state = `resolved (${res})`;
    else if (!claimFresh) state = "moot (claiming artifact changed)";
    else {
      state = !pinned ? "pending (no target-identity)" : "PENDING";
      if (state === "PENDING") {
        if (targetPath.endsWith("0-intent/intent.md")) state = "PENDING — owner escalation";
        if (claimTargets.has(t.rel.split("#")[0])) state = "suspended";
        claimTargets.add(targetPath);
      }
    }
    out.claims.push({ review: t.rel, target: t.target, state });
    lines.push(`claim    ${t.rel} → ${t.target}  ${state}`);
  }

  // 3. Artifacts.
  for (const [relPath, prefix] of ARTIFACTS) {
    const absPath = resolve(abs, relPath);
    const entry = { artifact: relPath };
    if (!existsSync(absPath)) {
      entry.state = "missing";
      out.artifacts.push(entry);
      lines.push(`artifact ${relPath}  MISSING`);
      continue;
    }
    const doc = docs.find((d) => d.rel === relPath);
    const pins = doc?.data.get("pins");
    const states = Array.isArray(pins) ? pins.map((p) => pinState(abs, p)) : [];
    const stale = states.filter((s) => s.state !== "fresh");
    entry.state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : "fresh";
    entry.stale = stale.map((s) => `${s.entry} (${s.state})`);

    const artifactLanes = lanes ?? [...new Set([...latest.values()].filter((r) => r.prefix === prefix).map((r) => r.lane))];
    const laneStates = artifactLanes.map((lane) => {
      const r = latest.get(`${prefix}|${lane}`);
      if (!r) return { lane, verdict: "none" };
      const reviewed = r.data.get("reviewed");
      const fresh = Array.isArray(reviewed) && reviewed.length > 0 && reviewed.every((p) => pinState(abs, p).state === "fresh");
      return { lane, verdict: r.data.get("verdict") ?? "unstamped", fresh, review: r.rel };
    });
    entry.lanes = laneStates;
    entry.approved = laneStates.length > 0 && laneStates.every((l) => l.verdict === "approved" && l.fresh);
    out.artifacts.push(entry);
    lines.push(
      `artifact ${relPath}  ${entry.state.toUpperCase()}${entry.stale?.length ? ` — ${entry.stale.join("; ")}` : ""}  reviews: ${
        laneStates.length ? laneStates.map((l) => `${l.lane}:${l.verdict}${l.verdict !== "none" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none"
      }${entry.approved ? "  APPROVED" : ""}`,
    );
  }

  // Build and document: tasks per phase + the phase review.
  for (const [phase, prefix] of PHASE_REVIEWS) {
    const phaseTasks = [...tasks.values()].filter((t) => t.phase === phase);
    if (phaseTasks.length) {
      const done = phaseTasks.filter((t) => t.outcome === "completed").map((t) => t.id);
      const open = phaseTasks.filter((t) => t.outcome !== "completed").map((t) => `${t.id}:${t.outcome}`);
      out.tasks[phase] = { done, open };
      lines.push(`tasks    ${phase}: done [${done.join(", ")}]${open.length ? `  open [${open.join(", ")}]` : ""}`);
    }
    for (const r of [...latest.values()].filter((r) => r.prefix === prefix)) {
      const head = r.data.get("head");
      const codeFresh = head ? codeUnchangedSince(root, head, pipelinesRoot) : false;
      out[`${prefix}Review`] = { review: r.rel, verdict: r.data.get("verdict"), head, codeFresh };
      lines.push(`${prefix.padEnd(8)} ${r.rel}  ${r.data.get("verdict") ?? "unstamped"}  ${head ? (codeFresh ? "code unchanged" : "CODE CHANGED since head") : "no head"}`);
    }
  }

  // 4. Counters.
  for (const [relPath, prefix] of ARTIFACTS) {
    const rs = reviews.filter((r) => r.name.startsWith(`${prefix}-review-`));
    if (!rs.length) continue;
    const approvedIters = rs.filter((r) => r.data.get("verdict") === "approved").map((r) => Number(r.data.get("iteration") ?? 0));
    const lastApproved = approvedIters.length ? Math.max(...approvedIters) : 0;
    const episode = rs.filter((r) => Number(r.data.get("iteration") ?? 0) > lastApproved).length;
    const recurs = rs.flatMap((r) => (Array.isArray(r.data.get("recurs")) ? r.data.get("recurs") : []));
    out.counters[prefix] = { episode, recurs };
    if (episode || recurs.length)
      lines.push(`counter  ${prefix}: ${episode} wave${episode === 1 ? "" : "s"} this episode${recurs.length ? `  recurs: ${recurs.join(", ")}` : ""}`);
  }

  process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
}

// --- cli --------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], pin: [], reviewed: [], set: [], mirror: false, force: false, json: false, lanes: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pin") args.pin.push(argv[++i]);
    else if (a === "--reviewed") args.reviewed.push(argv[++i]);
    else if (a === "--set") args.set.push(argv[++i]);
    else if (a === "--mirror") args.mirror = true;
    else if (a === "--force") args.force = true;
    else if (a === "--json") args.json = true;
    else if (a === "--lanes") args.lanes = argv[++i];
    else if (a === "--target-phase") ++i; // reserved
    else args._.push(a);
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (cmd) {
    case "stamp":
      cmdStamp(args);
      break;
    case "check":
      cmdCheck(args);
      break;
    default:
      process.stdout.write(
        `rp — Radical Pipelines state tooling (v3)

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set key=value]... [--mirror] [--force]
  node rp.mjs check <pipeline-folder> [--lanes r1,r2] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, and --mirror copies of body declarations (Verdict, Target, Origin,
Outcome, Prior finding). Identity is the hash of a file's body: stamping never
changes it. check is descriptive: triggers and their resolution, pending
claims, per-artifact freshness and approval, the done-set, build review
freshness, and episode counters. Spec: ../reference/run/state.md
`,
      );
  }
}
