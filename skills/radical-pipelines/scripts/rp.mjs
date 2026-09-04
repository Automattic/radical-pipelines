#!/usr/bin/env node
// rp — state tooling for Radical Pipelines.
// Zero dependencies. Serves the spec in ../reference/run/state.md; everything
// it does can be done with bare git. Commands: stamp, check.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
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

export function parseFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return { data: null, body: text };
  const end = text.indexOf("\n---", 3);
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

const IDENTITY = /^[0-9a-f]{12}$/;
const MIRRORS = new Set(["verdict", "brief", "target", "target-identity", "origin", "outcome", "recurs", "depends", "attempt", "commits"]);

// A path the orchestrator may stamp: inside the repository, inside a pipeline folder, not through a symlink.
function containedPath(root, abs) {
  const real = realpathSync(abs);
  if (real !== abs) die(`stamp: refusing a symlinked path: ${relative(root, abs)}`);
  if (!real.startsWith(root + "/")) die(`stamp: outside the repository: ${relative(root, abs)}`);
  return real;
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
  const brief = body.match(/^Brief:\s*(.+)$/m);
  if (brief) fm.set("brief", brief[1].trim());
  const target = body.match(/^Target:\s*(\S+)\s*$/m);
  if (target) {
    fm.set("target", target[1]);
    const id = fileIdentity(resolve(base, target[1].split("#")[0]));
    if (id) fm.set("target-identity", id);
  }
  const origins = [...body.matchAll(/^Origin:\s*(.+)$/gm)].map((m) => m[1].trim());
  if (origins.length === 1) fm.set("origin", origins[0]);
  else if (origins.length > 1) fm.set("origin", origins);
  const outcome = body.match(/^Outcome:\s*(completed|failed|blocked)\s*$/m);
  if (outcome) fm.set("outcome", outcome[1]);
  const recurs = [...body.matchAll(/^Prior finding:\s*(\S+#[^,\s]+),\s*resolution failed\s*$/gm)].map((m) => m[1]);
  if (recurs.length) fm.set("recurs", recurs);
  // A task file's `Depends on:` line: `none`, or task ids.
  const dep = body.match(/^\s*(?:-\s*)?\*?\*?Depends on:\*?\*?\s*(.+)$/m);
  if (dep) fm.set("depends", [...dep[1].matchAll(/T\d+/g)].map((m) => m[0]));
  // A task report's `## Commits` section: one commit hash per line.
  const commits = body.match(/^## Commits\s*\n([\s\S]*?)(?=^## |\s*$)/m);
  if (commits) {
    const hashes = [...commits[1].matchAll(/^\s*(?:-\s*)?([0-9a-f]{7,40})\b/gm)].map((m) => m[1]);
    if (hashes.length) fm.set("commits", hashes);
  }
}

const REPORT = /^([^/]+)\/tasks\/(T\d+)-report-(\d+)\.md$/;

function cmdStamp(args) {
  const root = repoRoot();
  const file = args._[0] || die("stamp: missing <file>");
  const abs = resolve(root, file);
  if (!existsSync(abs)) die(`stamp: no such file: ${file}`);
  containedPath(root, abs);

  const { data, body } = parseFrontmatter(readFileSync(abs, "utf8"));
  const fm = data ?? new Map();
  const base = pipelineFolder(root, abs);
  const rel = relative(base, abs);

  const pinList = (paths) =>
    paths.map((p) => {
      const target = containedPath(root, resolve(root, p));
      if (!target.startsWith(base + "/")) die(`stamp: a pin stays inside the pipeline folder: ${p}`);
      const sha = fileIdentity(target) ?? die(`stamp: cannot pin missing file: ${p}`);
      return `${relative(base, target)}@${sha}`;
    });

  let consumed = false;
  if (args.pin.length) {
    fm.set("pins", pinList(args.pin));
    consumed = true;
  }
  if (args.reviewed.length) {
    if (fm.has("reviewed")) die("stamp: reviewed pins are immutable; a changed review is a new file");
    fm.set("reviewed", pinList(args.reviewed));
    consumed = true;
  }
  for (const s of args.set) {
    const i = s.indexOf("=");
    if (i < 1) die(`stamp: --set expects key=value, got: ${s}`);
    const key = s.slice(0, i);
    if (MIRRORS.has(key) || key === "pins" || key === "reviewed" || key === "head") die(`stamp: ${key} is written from the body or by the stamp itself, never by --set`);
    fm.set(key, s.slice(i + 1));
  }
  if (args.mirror) mirrorBody(body, fm, base, abs);
  const report = rel.match(REPORT);
  if (report) {
    // A report reviews its task and the tasks it depends on; its attempt is its filename's.
    const task = `${report[1]}/tasks/${report[2]}.md`;
    const taskText = existsSync(join(base, task)) ? readFileSync(join(base, task), "utf8") : "";
    const deps = [].concat(parseFrontmatter(taskText).data?.get("depends") ?? []).map((d) => `${report[1]}/tasks/${d}.md`);
    const named = [].concat(fm.get("reviewed") ?? []).map((p) => p.split("@")[0]).sort();
    const expected = [task, ...deps].sort();
    if (JSON.stringify(named) !== JSON.stringify(expected)) die(`stamp: a task report reviews exactly its task and its dependencies: --reviewed ${expected.join(" --reviewed ")}`);
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

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// A tree to read the pipeline from: the working tree, or a ref (`--ref`).
function treeReader(root, abs, ref) {
  const pipelineRel = relative(root, abs);
  if (!ref) {
    return {
      list: () => walk(abs).map((f) => relative(abs, f)),
      read: (rel) => (existsSync(join(abs, rel)) ? readFileSync(join(abs, rel), "utf8") : null),
    };
  }
  return {
    list: () =>
      execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", pipelineRel], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((l) => l.endsWith(".md"))
        .map((l) => l.slice(pipelineRel.length + 1)),
    read: (rel) => {
      try {
        return execFileSync("git", ["show", `${ref}:${pipelineRel}/${rel}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      } catch {
        return null;
      }
    },
  };
}

// The artifacts, in phase order, with what each one requires as pins.
const ARTIFACTS = [
  { path: "1-spec/spec.md", record: "1-spec/spec-research.md", prefix: "spec", phase: "1-spec", requires: ["0-intent/intent.md"] },
  { path: "2-design-doc/design-doc.md", record: "2-design-doc/design-doc-research.md", prefix: "design-doc", phase: "2-design-doc", requires: ["0-intent/intent.md", "1-spec/spec.md"] },
  { path: "3-build/build-plan.md", record: "3-build/build-plan-research.md", prefix: "build-plan", phase: "3-build", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md"], review: "build" },
  { path: "4-document/document-plan.md", record: "4-document/document-plan-research.md", prefix: "document-plan", phase: "4-document", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md"], requiresReview: "build", review: "document" },
];
const TARGET_ID = /^(?:0-intent\/intent\.md#(?:goal|constraint-\d+|decision-\d+)|(?:1-spec\/spec|2-design-doc\/design-doc|3-build\/build-plan|4-document\/document-plan)\.md#\S+)$/;
const AUDIT = 3;
const VALVE = 6;

// `--lanes spec=security,a11y|event-driven,contrarian<event-driven;build=fresh`:
// per artifact, the named review lanes (the implicit lane is always present)
// and, after `|`, the production lanes with their `after` dependencies.
// A lane is `<id>[@<brief fingerprint>]`; a production lane may add `<dep+dep`.
function parseLanes(text) {
  const decl = {};
  if (!text) return decl;
  const LANE_ID = /^[a-z0-9][a-z0-9-]*$/;
  const laneOf = (x) => {
    const [head, after = ""] = x.split("<");
    const [id, brief = null] = head.split("@");
    if (!LANE_ID.test(id)) die(`check: invalid lane id "${id}" in --lanes`);
    if (brief !== null && !IDENTITY.test(brief)) die(`check: invalid brief fingerprint for lane "${id}"`);
    return { id, brief, after: after.split("+").map((y) => y.trim()).filter(Boolean) };
  };
  for (const entry of text.split(";")) {
    const [prefix, rest = ""] = entry.split("=").map((x) => x.trim());
    const art = ARTIFACTS.find((a) => a.prefix === prefix || a.review === prefix);
    if (!art) die(`check: unknown artifact "${prefix}" in --lanes`);
    const [reviews = "", production = ""] = rest.split("|");
    const d = { review: reviews.split(",").map((x) => x.trim()).filter(Boolean).map(laneOf), production: production.split(",").map((x) => x.trim()).filter(Boolean).map(laneOf) };
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
    decl[prefix] = d;
  }
  return decl;
}

// The fingerprint of a brief: the identity of its text.
function cmdFingerprint(args) {
  process.stdout.write(`${identity(args._.join(" "))}\n`);
}

function cmdCheck(args) {
  const root = repoRoot();
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const abs = resolve(root, folder);
  if (!args.ref && !existsSync(abs)) die(`check: no such folder: ${folder}`);
  const pipelineRel = relative(root, abs);
  const ref = args.ref ? execFileSync("git", ["rev-parse", "--verify", `${args.ref}^{commit}`], { cwd: root, encoding: "utf8" }).trim() : null;
  const tree = treeReader(root, abs, ref);
  const decl = parseLanes(args.lanes);
  const reviewLanesOf = (prefix) => [{ id: "", brief: null }, ...(decl[prefix]?.review ?? [])];
  const productionLanesOf = (prefix) => decl[prefix]?.production ?? [];
  const audit = args.audit ?? AUDIT;
  const valve = args.valve ?? VALVE;

  // Documents, each in its scope: the root ("") or a production lane ("<phase>/<id>/").
  const texts = new Map();
  const all = tree
    .list()
    .sort()
    .map((rel) => {
      const text = tree.read(rel) ?? "";
      texts.set(rel, text);
      const { data } = parseFrontmatter(text);
      const lane = rel.match(/^([^/]+)\/([^/]+)\/(?!tasks\/)[^/]+$/);
      const scope = lane && lane[2] !== "tasks" ? `${lane[1]}/${lane[2]}/` : "";
      return { rel, name: rel.split("/").pop(), data: data ?? new Map(), scope };
    });
  const identityOf = (rel) => (texts.has(rel) ? identity(texts.get(rel)) : null);
  const pinFresh = (entry) => {
    const p = pinParts(entry);
    if (!p || !IDENTITY.test(p.sha)) return false;
    return identityOf(p.path) === p.sha;
  };
  const pinsFresh = (pins) => Array.isArray(pins) && pins.length > 0 && pins.every(pinFresh);
  const staleOf = (pins) => (Array.isArray(pins) ? pins.filter((e) => !pinFresh(e)) : []);
  const docsOf = (sc) => all.filter((d) => d.scope === sc);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  // Reviews: `<prefix>-review-[<lane>-]<wave>.md`; the implicit lane has no id.
  const reviewsOf = (sc) => {
    const m = [];
    for (const r of docsOf(sc)) {
      const mm = r.name.match(/^(.+?)-review-(?:(.+)-)?(\d+)\.md$/);
      if (!mm) continue;
      m.push({ ...r, prefix: mm[1], lane: mm[2] ?? "", wave: Number(mm[3]) });
    }
    return m;
  };
  const scopes = [...new Set(all.map((d) => d.scope))];

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
      reports.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? "unstamped", fresh: pinsFresh(t.data.get("reviewed")), stamped: t.data.has("reviewed") });
  }
  const reportFilesOf = (phase) => all.filter((d) => REPORT.test(d.rel) && d.rel.startsWith(`${phase}/`)).map((d) => d.rel);

  // What a review must name: the artifact, its record, and its inputs; a plan
  // review, every task too; a phase review, the plan package, every task, every report.
  const inScope = (sc, rel) => (sc ? `${sc}${rel.split("/").pop()}` : rel);
  const isTrigger = (rel) => /^0-intent\/\d+-amendment\.md$/.test(rel) || REPORT.test(rel) || (/-review-.*\.md$/.test(rel) && all.find((d) => d.rel === rel)?.data.get("verdict") === "unsatisfiable");
  // A review names the artifact, its record, and everything the artifact pins
  // (its inputs, their approvals, the triggers it adjudicated, lane inputs);
  // a plan review, every task too; a phase review, every task and report.
  const schemaOf = (prefix, sc) => {
    const art = ARTIFACTS.find((a) => a.prefix === prefix) ?? ARTIFACTS.find((a) => a.review === prefix);
    if (!art) return [];
    const artifactPath = inScope(sc, art.path);
    const pinned = (pinsByPath.get(artifactPath) ?? []).map((p) => pinParts(p)?.path).filter(Boolean);
    const base = [artifactPath, inScope(sc, art.record), ...pinned];
    if (art.review && prefix === art.prefix) return [...base, ...taskFilesOf(art.phase)];
    if (art.review && prefix === art.review) return [...base, ...taskFilesOf(art.phase), ...reportFilesOf(art.phase)];
    return base;
  };
  const reviewFresh = (r, prefix, sc) => {
    const reviewed = [].concat(r.data.get("reviewed") ?? []);
    if (!pinsFresh(reviewed)) return false;
    const named = reviewed.map((p) => pinParts(p)?.path).sort();
    return JSON.stringify(named) === JSON.stringify([...schemaOf(prefix, sc)].sort());
  };

  // Lanes of one artifact in one scope: each declared lane's latest review (by wave).
  const laneStates = (prefix, sc) => {
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix);
    const currentWave = Math.max(0, ...rs.map((r) => r.wave));
    return reviewLanesOf(prefix).map(({ id: lane, brief }) => {
      const mine = rs.filter((r) => r.lane === lane);
      const r = mine.length ? mine.reduce((a, b) => (a.wave >= b.wave ? a : b)) : null;
      if (!r) return { lane, verdict: "none", current: false };
      const briefMatches = brief === null || identity(r.data.get("brief") ?? "") === brief;
      return {
        lane,
        verdict: r.data.has("reviewed") ? (r.data.get("verdict") ?? "unstamped") : "unstamped",
        brief: r.data.get("brief") ?? "",
        fresh: reviewFresh(r, prefix, sc) && briefMatches,
        wave: r.wave,
        current: r.wave === currentWave,
        review: r,
      };
    });
  };
  const approvedBy = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict === "approved" && l.fresh && l.current);
  // A wave is closed when every declared lane has a stamped, fresh review in the current wave.
  const waveClosed = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict !== "none" && l.verdict !== "unstamped" && l.fresh && l.current);
  const unstampedReview = (lanes) => lanes.find((l) => l.verdict === "unstamped")?.review?.rel;

  // Waves since every declared lane approved together, or since `episode-start-<prefix>`.
  const episodeOf = (prefix, sc, artifactDoc) => {
    const rs = reviewsOf(sc).filter((r) => r.prefix === prefix);
    const lanes = reviewLanesOf(prefix).map((l) => l.id);
    const waves = [...new Set(rs.map((r) => r.wave))];
    const last = waves.length ? Math.max(...waves) : 0;
    const approvedAll = (w) => lanes.every((lane) => rs.some((r) => r.lane === lane && r.wave === w && r.data.get("verdict") === "approved"));
    const lastApproved = Math.max(0, ...waves.filter(approvedAll));
    const start = Math.max(lastApproved, Number(artifactDoc?.data.get(`episode-start-${prefix}`) ?? 0));
    const episode = Math.max(0, last - start);
    const recurs = rs.filter((r) => r.wave > start).flatMap((r) => [].concat(r.data.get("recurs") ?? []));
    const audited = Number(artifactDoc?.data.get(`audited-${prefix}`) ?? 0) >= last;
    return { episode, recurs, audited, last };
  };
  const gateOf = (e, approved, closed) => {
    if (approved || !closed) return null;
    if (e.episode >= valve) return "VALVE";
    if (e.episode >= audit && !e.audited) return "AUDIT";
    return null;
  };

  const out = { pipeline: pipelineRel, ref, triggers: [], claims: [], lanes: [], artifacts: [], tasks: {}, counters: {}, frontier: null };
  const lines = [ref ? `${pipelineRel} @ ${args.ref} (${ref.slice(0, SHORT)})` : pipelineRel];
  let frontier = null;
  const take = (item) => {
    if (!frontier) frontier = item;
  };
  const phaseOfTarget = (targetPath) => ARTIFACTS.findIndex((a) => a.path === targetPath) + 1;
  const inScopePhase = (targetPath) => targetPath === "0-intent/intent.md" || phaseOfTarget(targetPath) <= args.targetPhase;

  // pending → adjudicated (the target pins it) → resolved (the target approved
  // carrying the pin), or resolved by escalation (a closed wave of the target
  // corroborated an unsatisfiable verdict citing it).
  const resolutionOf = (item) => {
    if (item.targetPath === "0-intent/intent.md") return { state: "pending" };
    const targetArtifact = ARTIFACTS.find((x) => x.path === item.targetPath);
    if (!targetArtifact) return { state: "invalid target", detail: item.targetPath };
    const lanes = laneStates(targetArtifact.prefix, "");
    for (const l of lanes)
      if (l.review && l.verdict === "unsatisfiable" && l.fresh && waveClosed(lanes) && !lanes.some((x) => x.verdict === "rejected") && [].concat(l.review.data.get("origin") ?? []).includes(item.rel))
        return { state: "resolved", detail: `escalated by ${l.review.rel}` };
    const pinned = (pinsByPath.get(item.targetPath) ?? []).some((p) => pinParts(p)?.path === item.rel);
    if (!pinned) return { state: "pending" };
    return approvedBy(lanes) ? { state: "resolved", detail: `${item.targetPath} approved carrying it` } : { state: "adjudicated", detail: `by ${item.targetPath}, awaiting approval` };
  };

  // 1. Triggers: external amendments and fresh failed task reports.
  const triggers = [
    ...all.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel)).map((d) => ({ rel: d.rel, kind: "amendment", target: d.data.get("target") ?? "?" })),
    ...[...reports.values()].filter((t) => t.outcome === "failed" && t.fresh).map((t) => ({ rel: t.rel, kind: `failed task ${t.id}`, target: ARTIFACTS.find((x) => x.phase === t.phase)?.path ?? "?" })),
  ].map((t) => ({ ...t, targetPath: t.target.split("#")[0] }));
  let unresolvedInScope = false;
  for (const t of triggers) {
    const valid = t.kind === "amendment" ? TARGET_ID.test(t.target) && t.targetPath !== "0-intent/intent.md" : true;
    const res = valid ? resolutionOf(t) : { state: "invalid target", detail: t.target };
    const scoped = inScopePhase(t.targetPath);
    const label = res.state === "pending" ? (scoped ? "PENDING" : "pending, beyond the target phase") : res.state === "invalid target" ? `INVALID TARGET (${res.detail})` : `${res.state}${res.detail ? ` (${res.detail})` : ""}`;
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, state: res.state, detail: res.detail ?? null, inScope: scoped });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${label}`);
    if (res.state === "invalid target") take(`trigger ${t.rel} → ${t.target} (invalid target)`);
    else if (res.state === "pending" && scoped) take(`trigger ${t.rel} → ${t.target}`);
    if (res.state !== "resolved" && scoped) unresolvedInScope = true;
  }

  // 2. Claims: an unsatisfiable verdict whose wave closed with no rejection.
  const claims = [];
  for (const sc of scopes)
    for (const r of reviewsOf(sc)) {
      if (r.data.get("verdict") !== "unsatisfiable") continue;
      const lanes = laneStates(r.prefix, sc);
      const mine = lanes.find((l) => l.review?.rel === r.rel);
      const c = {
        rel: r.rel,
        target: r.data.get("target") ?? "?",
        targetPath: (r.data.get("target") ?? "?").split("#")[0],
        targetIdentity: r.data.get("target-identity"),
        fresh: mine ? mine.fresh : reviewFresh(r, r.prefix, sc),
        claiming: [].concat(r.data.get("reviewed") ?? []).map((p) => pinParts(p)?.path),
        waveOpen: mine ? !waveClosed(lanes) : false,
        rejected: mine ? lanes.some((l) => l.verdict === "rejected") : false,
      };
      const cur = identityOf(c.targetPath);
      const unchanged = c.targetIdentity && cur && cur === c.targetIdentity;
      const res = TARGET_ID.test(c.target) ? resolutionOf(c) : { state: "invalid target" };
      if (res.state === "invalid target") c.state = `INVALID TARGET (${c.target})`;
      else if (c.targetIdentity && !unchanged) c.state = "superseded (target changed)";
      else if (res.state === "resolved") c.state = `resolved (${res.detail})`;
      else if (!c.fresh) c.state = "moot (claiming artifact changed)";
      else if (c.waveOpen) c.state = "wave open";
      else if (c.rejected) c.state = "held (a lane rejected; adjudicate first)";
      else if (res.state === "adjudicated") c.state = `adjudicated (${res.detail})`;
      else c.state = c.targetIdentity ? "pending" : "pending (no target-identity)";
      claims.push(c);
    }
  const pending = claims.filter((c) => c.state === "pending");
  for (const c of pending) {
    const above = pending.find((o) => o !== c && o.claiming.includes(c.targetPath));
    if (above) c.state = `suspended (behind ${above.rel})`;
  }
  const ownerTerritory = (target) => /^0-intent\/intent\.md#(goal|constraint-\d+|decision-\d+)$/.test(target);
  for (const c of claims) {
    const scoped = inScopePhase(c.targetPath);
    if (c.state === "pending") c.state = !scoped ? "pending, beyond the target phase" : ownerTerritory(c.target) ? "PENDING — owner escalation" : "PENDING";
    out.claims.push({ review: c.rel, target: c.target, state: c.state, inScope: scoped });
    lines.push(`claim    ${c.rel} → ${c.target}  ${c.state}`);
    if (c.state.startsWith("PENDING") || c.state.startsWith("INVALID")) take(`claim ${c.rel} → ${c.target}${c.state.includes("owner") ? " (owner escalation)" : c.state.startsWith("INVALID") ? " (invalid target)" : ""}`);
    if (!/^(resolved|superseded|moot|pending, beyond)/.test(c.state) && scoped) unresolvedInScope = true;
  }

  // 3. Phases in order, up to the target; a phase's production lanes come before its root artifact.
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane || "·"}:${l.verdict}${l.verdict !== "none" && l.verdict !== "unstamped" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  const artifactState = (doc, art, sc, extraRequires = []) => {
    const pins = doc?.data.get("pins");
    const stale = staleOf(pins);
    const required = [...art.requires, ...extraRequires];
    const missingPins = required.filter((req) => !(pins ?? []).some((p) => pinParts(p)?.path === req));
    // Each required input is consumed with its current approval: every lane's review of the wave that approved it.
    for (const req of required) {
      const inputArt = ARTIFACTS.find((a) => a.path === req) ?? ARTIFACTS.find((a) => a.review && req === a.path && false);
      if (!inputArt) continue;
      const lanes = laneStates(inputArt.prefix, "");
      if (!approvedBy(lanes)) continue;
      for (const l of lanes) if (!(pins ?? []).some((p) => pinParts(p)?.path === l.review.rel)) missingPins.push(`the approving review ${l.review.rel}`);
    }
    if (art.requiresReview) {
      const lanes = laneStates(art.requiresReview, "");
      if (approvedBy(lanes)) {
        for (const l of lanes) if (!(pins ?? []).some((p) => pinParts(p)?.path === l.review.rel)) missingPins.push(`the approving review ${l.review.rel}`);
      } else {
        missingPins.push(`an approved ${art.requiresReview} review`);
      }
    }
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : missingPins.length ? "incomplete pins" : "fresh";
    const lanes = laneStates(art.prefix, sc);
    const e = episodeOf(art.prefix, sc, doc);
    const approved = approvedBy(lanes);
    const gate = gateOf(e, approved, waveClosed(lanes));
    return { state, stale, missingPins, lanes, approved, episode: e.episode, recurs: e.recurs, gate };
  };
  const nextFor = (path, st) =>
    st.state === "stale" ? `re-synthesize ${path}` : st.state !== "fresh" ? `stamp ${path}` : unstampedReview(st.lanes) ? `stamp ${unstampedReview(st.lanes)}` : waveClosed(st.lanes) ? `adjudicate ${path}` : `review wave ${path}`;
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
    const laneScopes = [...new Set([...declaredLanes.map((l) => `${art.phase}/${l.id}/`), ...scopes.filter((sc) => sc.startsWith(`${art.phase}/`))])].sort();
    const laneApproved = (sc) => {
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      return !!doc && (() => { const st = artifactState(doc, art, sc); return st.approved && st.state === "fresh"; })();
    };
    const laneReviewPaths = (sc) => laneStates(art.prefix, sc).map((l) => l.review?.rel).filter(Boolean);
    const rootPins = (pinsByPath.get(art.path) ?? []).map((p) => pinParts(p)?.path);
    const consolidated = rootExists && laneScopes.length > 0 && laneScopes.every((sc) => laneApproved(sc) && rootPins.includes(`${sc}${name}`) && laneReviewPaths(sc).every((r) => rootPins.includes(r)));
    let lanesReady = laneScopes.length > 0;
    for (const sc of laneScopes) {
      const id = sc.split("/")[1];
      const after = declaredLanes.find((l) => l.id === id)?.after ?? [];
      const waiting = after.filter((dep) => !laneApproved(`${art.phase}/${dep}/`));
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      const st = doc ? artifactState(doc, art, sc, after.map((dep) => `${art.phase}/${dep}/${name}`)) : { state: "missing", stale: [], missingPins: [], lanes: [], approved: false, episode: 0, recurs: [], gate: null };
      const ok = st.approved && st.state === "fresh";
      if (!ok) lanesReady = false;
      out.lanes.push({ lane: sc, artifact: `${sc}${name}`, ...st, lanes: st.lanes.map(({ review, ...x }) => x), after, waiting, closed: consolidated });
      lines.push(`lane     ${sc}${name}  ${consolidated ? "closed" : st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}${waiting.length ? `  waiting for ${waiting.join(", ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${st.gate ? `  ${st.gate}` : ""}`);
      if (!consolidated && !ok && !waiting.length) take(`${st.gate ? `${st.gate} → ` : ""}${st.state === "missing" ? `synthesize ${sc}${name}` : nextFor(`${sc}${name}`, st)}`);
      if (st.episode || st.recurs.length) out.counters[`${sc}${art.prefix}`] = { episode: st.episode, recurs: st.recurs };
    }
    if (!rootExists) {
      out.artifacts.push({ artifact: art.path, state: "missing", consolidate: laneScopes.length ? lanesReady : undefined });
      lines.push(`artifact ${art.path}  MISSING${laneScopes.length ? (lanesReady ? " — every lane approved: consolidate" : " — lanes in progress") : ""}`);
      if (laneScopes.length && lanesReady) take(`consolidate ${art.path}`);
      else if (!laneScopes.length) take(`synthesize ${art.path}`);
      stopped = true;
      continue;
    }
    // A consolidated root pins every lane's artifact, record, and approving reviews.
    const laneRequires = laneScopes.flatMap((sc) => [`${sc}${name}`, `${sc}${art.record.split("/").pop()}`, ...laneReviewPaths(sc)]);
    const st = artifactState(all.find((d) => d.rel === art.path), art, "", laneRequires);
    out.artifacts.push({ artifact: art.path, ...st, lanes: st.lanes.map(({ review, ...x }) => x) });
    if (st.episode || st.recurs.length) out.counters[art.prefix] = { episode: st.episode, recurs: st.recurs };
    lines.push(`artifact ${art.path}  ${st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}${st.missingPins.length ? ` — missing pins: ${st.missingPins.join(", ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${st.gate ? `  ${st.gate}` : ""}`);
    if (st.state !== "fresh" || !st.approved) {
      take(`${st.gate ? `${st.gate} → ` : ""}${nextFor(art.path, st)}`);
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
    const unstampedReport = phaseReports.find((t) => !t.stamped || t.outcome === "unstamped");
    const attempts = new Map();
    for (const d of all.filter((d) => REPORT.test(d.rel) && d.rel.startsWith(`${art.phase}/`))) {
      const [, , id, k] = d.rel.match(REPORT);
      attempts.set(id, [...(attempts.get(id) ?? []), Number(k)].sort((x, y) => x - y));
    }
    const gappy = [...attempts.entries()].find(([, ks]) => ks.some((k, i) => k !== i + 1));
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
    } else if (gappy) {
      take(`invalid reports: attempts of ${art.phase}/tasks/${gappy[0]} are not 1..n`);
      stopped = true;
    } else if (unstampedReport) {
      take(`stamp ${unstampedReport.rel}`);
      stopped = true;
    } else if (remaining.length) {
      take(next ? `${blockedBy(next.id) ? "blocked" : "task"} ${art.phase}/${next.id}` : `tasks held in ${art.phase}: ${remaining.join(", ")}`);
      stopped = true;
    }
    // Phase review: names the plan, its record, its inputs, every task, and every report.
    const rl = laneStates(art.review, "");
    const e = episodeOf(art.review, "", all.find((d) => d.rel === art.path));
    const rApproved = approvedBy(rl);
    const gate = gateOf(e, rApproved, waveClosed(rl));
    out[`${art.review}Review`] = { lanes: rl.map(({ review, ...x }) => x), approved: rApproved, episode: e.episode, recurs: e.recurs, gate };
    if (e.episode || e.recurs.length) out.counters[art.review] = { episode: e.episode, recurs: e.recurs };
    lines.push(`${art.review.padEnd(8)} review: ${render(rl)}${rApproved ? "  APPROVED" : ""}${gate ? `  ${gate}` : ""}`);
    if (!rApproved) {
      take(`${gate ? `${gate} → ` : ""}${unstampedReview(rl) ? `stamp ${unstampedReview(rl)}` : waveClosed(rl) ? `adjudicate ${art.path} (${art.review} review)` : `${art.review} review`}`);
      stopped = true;
    } else {
      phaseDone(phaseNo);
    }
  }

  // Every commit on the branch outside the pipelines folder is claimed by a task report.
  if (!ref) {
    try {
      const mainRef = ["main", "trunk", "master"].find((b) => { try { execFileSync("git", ["rev-parse", "--verify", `${b}^{commit}`], { cwd: root, stdio: "ignore" }); return true; } catch { return false; } });
      if (mainRef) {
        const base = execFileSync("git", ["merge-base", mainRef, "HEAD"], { cwd: root, encoding: "utf8" }).trim();
        const pipelinesRoot = pipelineRel.split("/").slice(0, -1).join("/") || ".";
        const onBranch = execFileSync("git", ["log", "--format=%H", `${base}..HEAD`, "--", ".", `:(exclude)${pipelinesRoot}`], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
        const claimed = all.filter((d) => REPORT.test(d.rel)).flatMap((d) => [].concat(d.data.get("commits") ?? []));
        const unclaimed = onBranch.filter((h) => !claimed.some((c) => h.startsWith(c)));
        if (unclaimed.length) {
          out.unclaimedCommits = unclaimed;
          lines.push(`commits  unclaimed by any task report: ${unclaimed.map((h) => h.slice(0, 7)).join(", ")}`);
          take(`unclaimed commits: ${unclaimed.map((h) => h.slice(0, 7)).join(", ")}`);
        }
      }
    } catch {
      /* no main branch or no commits: nothing to compare */
    }
  }

  // 4. Counters and completion.
  for (const [label, c] of Object.entries(out.counters))
    lines.push(`counter  ${label}: ${c.episode} wave${c.episode === 1 ? "" : "s"} this episode${c.recurs.length ? `  recurs: ${c.recurs.join(", ")}` : ""}`);
  out.completeThrough = through;
  out.targetPhase = args.targetPhase;
  out.complete = !frontier && !unresolvedInScope && through >= args.targetPhase;
  if (!frontier && unresolvedInScope) frontier = "triggers or claims still adjudicated, awaiting approval";
  if (!frontier) frontier = out.complete ? "complete" : `complete through phase ${through}`;
  out.frontier = frontier;
  lines.push(`complete through phase ${through}${out.complete ? " — target reached" : ` (target ${args.targetPhase})`}`);
  lines.push(`frontier ${frontier}`);
  process.stdout.write(args.json ? JSON.stringify(out, null, 2) + "\n" : lines.join("\n") + "\n");
}

// --- cli --------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], pin: [], reviewed: [], set: [], mirror: false, json: false, lanes: null, targetPhase: 4, ref: null, audit: null, valve: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pin") args.pin.push(argv[++i]);
    else if (a === "--reviewed") args.reviewed.push(argv[++i]);
    else if (a === "--set") args.set.push(argv[++i]);
    else if (a === "--mirror") args.mirror = true;
    else if (a === "--json") args.json = true;
    else if (a === "--lanes") args.lanes = argv[++i];
    else if (a === "--target-phase") args.targetPhase = Number(argv[++i]);
    else if (a === "--ref") args.ref = argv[++i];
    else if (a === "--audit") args.audit = Number(argv[++i]);
    else if (a === "--valve") args.valve = Number(argv[++i]);
    else args._.push(a);
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
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
    default:
      process.stdout.write(
        `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set key=value]... [--mirror]
  node rp.mjs fingerprint <text>
  node rp.mjs check <pipeline-folder> [--lanes "spec=security|event-driven,contrarian<event-driven;build=fresh"] [--target-phase <n>] [--ref <branch>] [--audit 3] [--valve 6] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, --mirror copies of body declarations (Verdict, Brief, Target,
Origin, Outcome — completed | failed | blocked — Prior finding, a task's
Depends on, a report's Commits), and head — the commit
a stamp with pins observed. Identity is the hash of a file's body: stamping never
changes it. check reports the frontier: triggers, claims, then phases in order
up to the target — production lanes, artifacts, tasks, phase reviews,
audit/valve gates — and completion. --lanes declares, per artifact, the named
review lanes (the implicit lane always exists) and, after |, the production
lanes with their after-dependencies (<, joined by +). Spec: ../reference/run/state.md
`,
      );
  }
}
