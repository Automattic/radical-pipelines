#!/usr/bin/env node
// rp — state tooling for Radical Pipelines.
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
  const origins = [...body.matchAll(/^Origin:\s*(.+)$/gm)].map((m) => m[1].trim());
  if (origins.length === 1) fm.set("origin", origins[0]);
  else if (origins.length > 1) fm.set("origin", origins);
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
  // --lanes r1,r2  or  --lanes spec=r1,r2;build-plan=r1
  const laneSpec = args.lanes
    ? args.lanes.includes("=")
      ? Object.fromEntries(args.lanes.split(";").map((e) => [e.split("=")[0], e.split("=")[1].split(",")]))
      : { "*": args.lanes.split(",") }
    : null;
  const lanesFor = (prefix) => (laneSpec ? laneSpec[prefix] ?? laneSpec["*"] ?? null : null);

  const files = walk(abs).sort();
  const allDocs = files.map((f) => {
    const rel = relative(abs, f);
    const { data } = parseFrontmatter(readFileSync(f, "utf8"));
    const laneMatch = rel.match(/^([^/]+)\/(lane-\d+)\//);
    return { rel, name: rel.split("/").pop(), data: data ?? new Map(), lane: laneMatch ? `${laneMatch[1]}/${laneMatch[2]}` : null };
  });
  const docs = allDocs.filter((d) => !d.lane);
  const laneDocs = allDocs.filter((d) => d.lane);

  const reviews = docs.filter((d) => /-review-/.test(d.name));
  const laneReviews = laneDocs.filter((d) => /-review-/.test(d.name));
  const amendments = docs.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel));
  const reports = docs.filter((d) => /^task-.+-\d+\.md$/.test(d.name) && d.rel.includes("tasks/"));

  // Latest review per artifact-prefix + lane.
  const latestOf = (rs, scope = "") => {
    const m = new Map();
    for (const r of rs) {
      const lane = r.data.get("lane") ?? "r1";
      const iter = Number(r.data.get("iteration") ?? 0);
      const prefix = r.name.replace(/-review-(?:r[^-]+-)?\d+\.md$/, "");
      const key = `${scope}${prefix}|${lane}`;
      const prev = m.get(key);
      if (!prev || Number(prev.data.get("iteration") ?? 0) < iter) m.set(key, { ...r, lane, iter, prefix });
    }
    return m;
  };
  const latest = latestOf(reviews);

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
  for (const r of [...latest.values(), ...latestOf(laneReviews).values()])
    if (r.data.get("verdict") === "unsatisfiable")
      triggers.push({ rel: r.rel, kind: "claim", target: r.data.get("target") ?? "?", targetIdentity: r.data.get("target-identity"), review: r });

  const allPins = new Map(); // artifact rel -> pin entries
  for (const d of docs) {
    const pins = d.data.get("pins");
    if (Array.isArray(pins)) allPins.set(d.rel, pins);
  }

  const resolvedBy = (trigger) => {
    const targetPath = trigger.target.split("#")[0];
    const pins = allPins.get(targetPath);
    if (pins) for (const p of pins) if (pinParts(p)?.path === trigger.rel) return `pinned by ${targetPath}`;
    for (const r of latest.values()) {
      const reviewed = r.data.get("reviewed");
      if (!Array.isArray(reviewed)) continue;
      const coversTarget = reviewed.some((p) => pinParts(p)?.path === targetPath);
      const origins = [].concat(r.data.get("origin") ?? []);
      const verdict = r.data.get("verdict");
      if (coversTarget && origins.includes(trigger.rel) && (verdict === "approved" || verdict === "unsatisfiable"))
        return `${verdict === "approved" ? "refuted" : "escalated"} by ${r.rel}`;
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
  const claims = triggers.filter((t) => t.kind === "claim").map((t) => {
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
    else state = !pinned ? "pending (no target-identity)" : "PENDING";
    const claimingPaths = Array.isArray(reviewedPins) ? reviewedPins.map((p) => pinParts(p)?.path) : [];
    return { t, targetPath, state, claimingPaths };
  });
  for (const c of claims) {
    if (c.state !== "PENDING") continue;
    const above = claims.find((o) => o !== c && o.state === "PENDING" && o.claimingPaths.includes(c.targetPath));
    if (above) c.state = `suspended (behind ${above.t.rel})`;
    else if (c.targetPath.endsWith("0-intent/intent.md")) c.state = "PENDING — owner escalation";
  }
  for (const c of claims) {
    out.claims.push({ review: c.t.rel, target: c.t.target, state: c.state });
    lines.push(`claim    ${c.t.rel} → ${c.t.target}  ${c.state}`);
  }

  // 3. Artifacts — production lanes first, as sub-pipelines of the root artifact.
  out.lanes = [];
  const artifactState = (doc, relPath, reviewsMap, prefix, scope) => {
    const pins = doc?.data.get("pins");
    const states = Array.isArray(pins) ? pins.map((p) => pinState(abs, p)) : [];
    const stale = states.filter((s) => s.state !== "fresh");
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : "fresh";
    const lanesDeclared = lanesFor(prefix) ?? [...new Set([...reviewsMap.values()].filter((r) => r.prefix === prefix && r.rel.startsWith(scope)).map((r) => r.lane))];
    const laneStates = lanesDeclared.map((lane) => {
      const r = reviewsMap.get(`${prefix}|${lane}`);
      if (!r || !r.rel.startsWith(scope)) return { lane, verdict: "none" };
      const reviewed = r.data.get("reviewed");
      const fresh = Array.isArray(reviewed) && reviewed.length > 0 && reviewed.every((p) => pinState(abs, p).state === "fresh");
      return { lane, verdict: r.data.get("verdict") ?? "unstamped", fresh, review: r.rel };
    });
    const ownerLane = reviewsMap.get(`${prefix}|owner`);
    const ownerApproved = ownerLane && ownerLane.rel.startsWith(scope) && ownerLane.data.get("verdict") === "approved" && [].concat(ownerLane.data.get("reviewed") ?? []).every((p) => pinState(abs, p).state === "fresh");
    if (ownerApproved && !laneStates.some((l) => l.lane === "owner")) laneStates.push({ lane: "owner", verdict: "approved", fresh: true, review: ownerLane.rel });
    const approved = ownerApproved || (laneStates.length > 0 && laneStates.every((l) => l.verdict === "approved" && l.fresh));
    return { state, stale: stale.map((s) => `${s.entry} (${s.state})`), lanes: laneStates, approved };
  };
  const renderLanes = (ls) => (ls.length ? ls.map((l) => `${l.lane}:${l.verdict}${l.verdict !== "none" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");

  for (const [relPath, prefix] of ARTIFACTS) {
    const absPath = resolve(abs, relPath);
    const entry = { artifact: relPath };
    const phase = relPath.split("/")[0];
    const artifactName = relPath.split("/")[1];
    const laneFolders = [...new Set(laneDocs.filter((d) => d.lane.startsWith(`${phase}/`)).map((d) => d.lane))].sort();
    const rootExists = existsSync(absPath);
    let allLanesReady = laneFolders.length > 0;
    for (const lf of laneFolders) {
      const laneArtifact = `${lf}/${artifactName}`;
      const doc = laneDocs.find((d) => d.rel === laneArtifact);
      const laneReviewsMap = latestOf(laneReviews.filter((r) => r.lane === lf));
      const st = doc ? artifactState(doc, laneArtifact, laneReviewsMap, prefix, `${lf}/`) : { state: "missing", stale: [], lanes: [], approved: false };
      const closed = rootExists;
      out.lanes.push({ lane: lf, artifact: laneArtifact, ...st, closed });
      if (!(st.approved && st.state === "fresh")) allLanesReady = false;
      lines.push(`lane     ${laneArtifact}  ${closed ? "closed" : st.state.toUpperCase()}${st.stale?.length ? ` — ${st.stale.join("; ")}` : ""}  reviews: ${renderLanes(st.lanes)}${st.approved ? "  APPROVED" : ""}`);
    }
    if (!rootExists) {
      entry.state = "missing";
      if (laneFolders.length) entry.consolidate = allLanesReady;
      out.artifacts.push(entry);
      lines.push(`artifact ${relPath}  MISSING${laneFolders.length ? (allLanesReady ? " — every lane approved: consolidate" : " — lanes in progress") : ""}`);
      continue;
    }
    const doc = docs.find((d) => d.rel === relPath);
    Object.assign(entry, artifactState(doc, relPath, latest, prefix, ""));
    out.artifacts.push(entry);
    lines.push(`artifact ${relPath}  ${entry.state.toUpperCase()}${entry.stale?.length ? ` — ${entry.stale.join("; ")}` : ""}  reviews: ${renderLanes(entry.lanes)}${entry.approved ? "  APPROVED" : ""}`);
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
    const byLane = new Map();
    for (const r of rs) {
      const lane = r.data.get("lane") ?? "r1";
      const iter = Number(r.data.get("iteration") ?? 0);
      const e = byLane.get(lane) ?? { last: 0, approved: 0 };
      e.last = Math.max(e.last, iter);
      if (r.data.get("verdict") === "approved") e.approved = Math.max(e.approved, iter);
      byLane.set(lane, e);
    }
    const episode = Math.max(0, ...[...byLane.values()].map((e) => e.last - e.approved));
    const recurs = rs.flatMap((r) => (Array.isArray(r.data.get("recurs")) ? r.data.get("recurs") : []));
    out.counters[prefix] = { episode, recurs };
    if (episode || recurs.length)
      lines.push(`counter  ${prefix}: ${episode} wave${episode === 1 ? "" : "s"} this episode${recurs.length ? `  recurs: ${recurs.join(", ")}` : ""}`);
  }

  // Completion: consecutive complete phases from 1.
  const phaseComplete = (i) => {
    const a = out.artifacts[i];
    if (!a || !a.approved || a.state !== "fresh") return false;
    const phase = ARTIFACTS[i][0].split("/")[0];
    const pr = PHASE_REVIEWS.find(([p]) => p === phase);
    if (!pr) return true;
    const t = out.tasks[phase];
    const rv = out[`${pr[1]}Review`];
    return !!t && t.open.length === 0 && !!rv && rv.verdict === "approved" && rv.codeFresh;
  };
  let through = 0;
  while (through < ARTIFACTS.length && phaseComplete(through)) through++;
  out.completeThrough = through;
  out.targetPhase = args.targetPhase;
  out.complete = through >= args.targetPhase;
  lines.push(`complete through phase ${through}${out.complete ? " — target reached" : ` (target ${args.targetPhase})`}`);
  process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
}

// --- cli --------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], pin: [], reviewed: [], set: [], mirror: false, force: false, json: false, lanes: null, targetPhase: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pin") args.pin.push(argv[++i]);
    else if (a === "--reviewed") args.reviewed.push(argv[++i]);
    else if (a === "--set") args.set.push(argv[++i]);
    else if (a === "--mirror") args.mirror = true;
    else if (a === "--force") args.force = true;
    else if (a === "--json") args.json = true;
    else if (a === "--lanes") args.lanes = argv[++i];
    else if (a === "--target-phase") args.targetPhase = Number(argv[++i]);
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
