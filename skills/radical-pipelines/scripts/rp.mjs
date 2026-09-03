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
  try {
    fm.set("head", execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim().slice(0, SHORT));
  } catch {
    /* no commits yet: no head to record */
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

// A scope is one frontier: the pipeline root, or one production lane
// (`<phase>/lane-<k>/`). The same computation runs over each.

function readDocs(root, abs) {
  return walk(abs)
    .sort()
    .map((f) => {
      const rel = relative(abs, f);
      const { data } = parseFrontmatter(readFileSync(f, "utf8"));
      const laneMatch = rel.match(/^([^/]+)\/(lane-\d+)\//);
      return { rel, name: rel.split("/").pop(), data: data ?? new Map(), scope: laneMatch ? `${laneMatch[1]}/${laneMatch[2]}/` : "" };
    });
}

// Latest review per artifact prefix and lane within one scope.
function latestReviews(docs) {
  const m = new Map();
  for (const r of docs.filter((d) => /-review-/.test(d.name))) {
    const lane = r.data.get("lane") ?? "r1";
    const iter = Number(r.data.get("iteration") ?? 0);
    const prefix = r.name.replace(/-review-(?:r[^-]+-)?\d+\.md$/, "");
    const key = `${prefix}|${lane}`;
    if (!m.has(key) || m.get(key).iter < iter) m.set(key, { ...r, lane, iter, prefix });
  }
  return m;
}

function pinsFresh(abs, pins) {
  return Array.isArray(pins) && pins.length > 0 && pins.every((p) => pinState(abs, p).state === "fresh");
}

// Freshness and approval of one artifact from its own scope's reviews.
function artifactState(abs, doc, prefix, reviews, lanesFor) {
  const pins = doc?.data.get("pins");
  const states = Array.isArray(pins) ? pins.map((p) => pinState(abs, p)) : [];
  const stale = states.filter((x) => x.state !== "fresh").map((x) => `${x.entry} (${x.state})`);
  const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : "fresh";
  const declared = lanesFor(prefix) ?? [...new Set([...reviews.values()].filter((r) => r.prefix === prefix).map((r) => r.lane))];
  const lanes = declared.map((lane) => {
    const r = reviews.get(`${prefix}|${lane}`);
    return r ? { lane, verdict: r.data.get("verdict") ?? "unstamped", fresh: pinsFresh(abs, r.data.get("reviewed")), review: r.rel } : { lane, verdict: "none" };
  });
  const approved = lanes.length > 0 && lanes.every((l) => l.verdict === "approved" && l.fresh);
  return { state, stale, lanes, approved };
}

// Waves since the last approval, per lane, max across lanes; recurring findings.
function counters(docs, prefix) {
  const rs = docs.filter((r) => r.name.startsWith(`${prefix}-review-`));
  if (!rs.length) return null;
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
  const recurs = rs.flatMap((r) => [].concat(r.data.get("recurs") ?? []));
  return { episode, recurs };
}

// The state of one claim (an unsatisfiable review), as a decision table:
//   target changed            → superseded
//   target pinned it / a review of the target cites it → resolved
//   the claiming artifact changed → moot
//   the target has a pending claim of its own → suspended
//   the target is the intent  → owner escalation
//   otherwise                 → pending
// A trigger (amendment, failed task report, claim) is resolved when its target
// pins it, or when a review of its target cites it as origin: approved refutes
// it, unsatisfiable escalates it one layer up.
function resolutionOf(item, pinsByPath, allLatest) {
  for (const p of pinsByPath.get(item.targetPath) ?? []) if (pinParts(p)?.path === item.rel) return `pinned by ${item.targetPath}`;
  for (const r of allLatest) {
    const covers = [].concat(r.data.get("reviewed") ?? []).some((p) => pinParts(p)?.path === item.targetPath);
    const cites = [].concat(r.data.get("origin") ?? []).includes(item.rel);
    const v = r.data.get("verdict");
    if (covers && cites && (v === "approved" || v === "unsatisfiable")) return `${v === "approved" ? "refuted" : "escalated"} by ${r.rel}`;
  }
  return null;
}

function claimStates(abs, claims, pinsByPath, allLatest) {
  for (const c of claims) {
    const current = fileIdentity(resolve(abs, c.targetPath));
    const unchanged = c.targetIdentity && current && (current.startsWith(c.targetIdentity) || c.targetIdentity.startsWith(current));
    const res = resolutionOf(c, pinsByPath, allLatest);
    if (c.targetIdentity && !unchanged) c.state = "superseded (target changed)";
    else if (res) c.state = `resolved (${res})`;
    else if (!c.fresh) c.state = "moot (claiming artifact changed)";
    else c.state = c.targetIdentity ? "pending" : "pending (no target-identity)";
  }
  const pending = claims.filter((c) => c.state === "pending");
  for (const c of pending) {
    const above = pending.find((o) => o !== c && o.claiming.includes(c.targetPath));
    if (above) c.state = `suspended (behind ${above.rel})`;
  }
  for (const c of claims) {
    if (c.state === "pending") c.state = c.targetPath.endsWith("0-intent/intent.md") ? "PENDING — owner escalation" : "PENDING";
  }
}

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

  const all = readDocs(root, abs);
  const scopes = [...new Set(all.map((d) => d.scope))].sort((x, y) => (x === "" ? 1 : y === "" ? -1 : x.localeCompare(y)));
  const docsOf = (scope) => all.filter((d) => d.scope === scope);
  const reviewsOf = new Map(scopes.map((sc) => [sc, latestReviews(docsOf(sc))]));
  const allLatest = [...reviewsOf.values()].flatMap((m) => [...m.values()]);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  const out = { pipeline: pipelineRel, triggers: [], claims: [], lanes: [], artifacts: [], tasks: {}, counters: {} };
  const lines = [pipelineRel];

  // 1. Triggers: external amendments and failed task reports.
  const tasks = new Map();
  for (const t of all.filter((d) => /^task-.+-\d+\.md$/.test(d.name) && d.rel.includes("tasks/"))) {
    const phase = t.rel.split("/")[0];
    const id = t.data.get("task") ?? t.name.replace(/^task-(.+)-\d+\.md$/, "$1");
    const attempt = Number(t.data.get("attempt") ?? t.name.match(/-(\d+)\.md$/)[1]);
    const key = `${phase}/${id}`;
    if (!tasks.has(key) || tasks.get(key).attempt < attempt) tasks.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? "unstamped" });
  }
  const planOf = (phase) => ARTIFACTS.find(([p]) => p.startsWith(`${phase}/`))?.[0] ?? `${phase}/plan.md`;
  const triggers = [
    ...all.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel)).map((a) => ({ rel: a.rel, kind: "amendment", targetPath: (a.data.get("target") ?? "?").split("#")[0], target: a.data.get("target") ?? "?" })),
    ...[...tasks.values()].filter((t) => t.outcome === "failed").map((t) => ({ rel: t.rel, kind: `failed task ${t.id}`, targetPath: planOf(t.phase), target: planOf(t.phase) })),
  ];
  const claims = allLatest
    .filter((r) => r.data.get("verdict") === "unsatisfiable")
    .map((r) => ({
      rel: r.rel,
      target: r.data.get("target") ?? "?",
      targetPath: (r.data.get("target") ?? "?").split("#")[0],
      targetIdentity: r.data.get("target-identity"),
      fresh: pinsFresh(abs, r.data.get("reviewed")),
      claiming: [].concat(r.data.get("reviewed") ?? []).map((p) => pinParts(p)?.path),
    }));
  claimStates(abs, claims, pinsByPath, allLatest);
  for (const t of triggers) {
    const res = resolutionOf(t, pinsByPath, allLatest);
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, resolved: res });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${res ?? "PENDING"}`);
  }

  // 2. Claims.
  for (const c of claims) {
    out.claims.push({ review: c.rel, target: c.target, state: c.state });
    lines.push(`claim    ${c.rel} → ${c.target}  ${c.state}`);
  }

  // 3. Artifacts, phase by phase; a phase's production lanes come before its root artifact.
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane}:${l.verdict}${l.verdict !== "none" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  for (const [relPath, prefix] of ARTIFACTS) {
    const phase = relPath.split("/")[0];
    const name = relPath.split("/")[1];
    const rootExists = existsSync(resolve(abs, relPath));
    const laneScopes = scopes.filter((sc) => sc.startsWith(`${phase}/`));
    let lanesReady = laneScopes.length > 0;
    for (const sc of laneScopes) {
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      const st = doc ? artifactState(abs, doc, prefix, reviewsOf.get(sc), lanesFor) : { state: "missing", stale: [], lanes: [], approved: false };
      if (!(st.approved && st.state === "fresh")) lanesReady = false;
      out.lanes.push({ lane: sc, artifact: `${sc}${name}`, ...st, closed: rootExists });
      lines.push(`lane     ${sc}${name}  ${rootExists ? "closed" : st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}`);
    }
    if (!rootExists) {
      const entry = { artifact: relPath, state: "missing" };
      if (laneScopes.length) entry.consolidate = lanesReady;
      out.artifacts.push(entry);
      lines.push(`artifact ${relPath}  MISSING${laneScopes.length ? (lanesReady ? " — every lane approved: consolidate" : " — lanes in progress") : ""}`);
      continue;
    }
    const entry = { artifact: relPath, ...artifactState(abs, all.find((d) => d.rel === relPath), prefix, reviewsOf.get(""), lanesFor) };
    out.artifacts.push(entry);
    lines.push(`artifact ${relPath}  ${entry.state.toUpperCase()}${entry.stale.length ? ` — ${entry.stale.join("; ")}` : ""}  reviews: ${render(entry.lanes)}${entry.approved ? "  APPROVED" : ""}`);
  }

  // Build and document: tasks per phase and the phase review.
  for (const [phase, prefix] of PHASE_REVIEWS) {
    const phaseTasks = [...tasks.values()].filter((t) => t.phase === phase);
    if (phaseTasks.length) {
      const done = phaseTasks.filter((t) => t.outcome === "completed").map((t) => t.id);
      const open = phaseTasks.filter((t) => t.outcome !== "completed").map((t) => `${t.id}:${t.outcome}`);
      out.tasks[phase] = { done, open };
      lines.push(`tasks    ${phase}: done [${done.join(", ")}]${open.length ? `  open [${open.join(", ")}]` : ""}`);
    }
    for (const r of [...reviewsOf.get("")?.values() ?? []].filter((r) => r.prefix === prefix)) {
      const head = r.data.get("head");
      const codeFresh = head ? codeUnchangedSince(root, head, pipelinesRoot) : false;
      out[`${prefix}Review`] = { review: r.rel, verdict: r.data.get("verdict"), head, codeFresh };
      lines.push(`${prefix.padEnd(8)} ${r.rel}  ${r.data.get("verdict") ?? "unstamped"}  ${head ? (codeFresh ? "code unchanged" : "CODE CHANGED since head") : "no head"}`);
    }
  }

  // 4. Counters, per scope.
  for (const [relPath, prefix] of ARTIFACTS) {
    const phase = relPath.split("/")[0];
    for (const sc of scopes.filter((x) => x === "" || x.startsWith(`${phase}/`))) {
      const c = counters(docsOf(sc), prefix);
      if (!c || (!c.episode && !c.recurs.length)) continue;
      const label = `${sc}${prefix}`;
      out.counters[label] = c;
      lines.push(`counter  ${label}: ${c.episode} wave${c.episode === 1 ? "" : "s"} this episode${c.recurs.length ? `  recurs: ${c.recurs.join(", ")}` : ""}`);
    }
  }

  // 5. Completion: consecutive complete phases from 1.
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
        `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set key=value]... [--mirror] [--force]
  node rp.mjs check <pipeline-folder> [--lanes r1,r2 | --lanes spec=owner;design-doc=r1,r2] [--target-phase <n>] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, --mirror copies of body declarations (Verdict, Target, Origin,
Outcome, Prior finding), and head — the commit the stamp observed. Identity is
the hash of a file's body: stamping never changes it. check is descriptive: triggers and their resolution, pending
claims, per-artifact freshness and approval, the done-set, build review
freshness, and episode counters. Spec: ../reference/run/state.md
`,
      );
  }
}
