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
  const charter = body.match(/^Charter:\s*(.+)$/m);
  if (charter) fm.set("charter", charter[1].trim());
  const target = body.match(/^Target:\s*(\S+)\s*$/m);
  if (target) {
    fm.set("target", target[1]);
    const id = fileIdentity(resolve(base, target[1].split("#")[0]));
    if (id) fm.set("target-identity", id);
  }
  const origins = [...body.matchAll(/^Origin:\s*(.+)$/gm)].map((m) => m[1].trim());
  if (origins.length === 1) fm.set("origin", origins[0]);
  else if (origins.length > 1) fm.set("origin", origins);
  const outcome = body.match(/^Outcome:\s*(completed|failed)\s*$/m);
  if (outcome) fm.set("outcome", outcome[1]);
  const recurs = [...body.matchAll(/^Prior finding:\s*(\S+#[^,\s]+),\s*resolution failed\s*$/gm)].map((m) => m[1]);
  if (recurs.length) fm.set("recurs", recurs);
  // A task file's `Depends on:` line: `none`, or task ids.
  const dep = body.match(/^\s*(?:-\s*)?\*?\*?Depends on:\*?\*?\s*(.+)$/m);
  if (dep) fm.set("depends", [...dep[1].matchAll(/T\d+/g)].map((m) => m[0]));
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
    if (fm.has("reviewed") && !args.force) die("stamp: reviewed pins are immutable (use --force to override)");
    fm.set("reviewed", pinList(args.reviewed));
  }
  const report = relative(base, abs).match(/^([^/]+)\/tasks\/(T\d+)-report-(\d+)\.md$/);
  if (report) {
    const task = `${report[1]}/tasks/${report[2]}.md`;
    const named = [].concat(fm.get("reviewed") ?? []).map((p) => p.split("@")[0]);
    if (named.length !== 1 || named[0] !== task) die(`stamp: a task report reviews exactly its task: --reviewed ${task}`);
    fm.set("attempt", report[3]);
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

// What each review must name (`reviewed`), beyond the artifact and its record:
// a plan review, every task; a phase review, every task and every report.
const ARTIFACTS = [
  { path: "1-spec/spec.md", record: "1-spec/spec-research.md", prefix: "spec", phase: "1-spec", requires: ["0-intent/intent.md"] },
  { path: "2-design-doc/design-doc.md", record: "2-design-doc/design-doc-research.md", prefix: "design-doc", phase: "2-design-doc", requires: ["0-intent/intent.md", "1-spec/spec.md"] },
  { path: "3-build/build-plan.md", record: "3-build/build-plan-research.md", prefix: "build-plan", phase: "3-build", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md"], review: "build", summary: "3-build/build-summary.md" },
  { path: "4-document/document-plan.md", record: "4-document/document-plan-research.md", prefix: "document-plan", phase: "4-document", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-summary.md"], review: "document", summary: "4-document/document-summary.md" },
];
const TARGET_ID = /^(?:0-intent\/intent\.md#(?:goal|constraint-\d+|decision-\d+)|(?:1-spec\/spec|2-design-doc\/design-doc|3-build\/build-plan|4-document\/document-plan)\.md#\S+)$/;
const AUDIT = 3;
const VALVE = 6;

function cmdCheck(args) {
  const root = repoRoot();
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const abs = resolve(root, folder);
  if (!args.ref && !existsSync(abs)) die(`check: no such folder: ${folder}`);
  const pipelineRel = relative(root, abs);
  const tree = treeReader(root, abs, args.ref);
  const laneSpec = args.lanes
    ? args.lanes.includes("=")
      ? Object.fromEntries(args.lanes.split(";").map((e) => [e.split("=")[0], e.split("=")[1].split(",")]))
      : { "*": args.lanes.split(",") }
    : null;
  const lanesFor = (prefix) => (laneSpec ? laneSpec[prefix] ?? laneSpec["*"] ?? null : null);
  const audit = args.audit ?? AUDIT;
  const valve = args.valve ?? VALVE;

  // Documents, each in its scope: the root ("") or a production lane ("<phase>/lane-<k>/").
  const texts = new Map();
  const all = tree
    .list()
    .sort()
    .map((rel) => {
      const text = tree.read(rel) ?? "";
      texts.set(rel, text);
      const { data } = parseFrontmatter(text);
      const lane = rel.match(/^([^/]+)\/(lane-\d+)\//);
      return { rel, name: rel.split("/").pop(), data: data ?? new Map(), scope: lane ? `${lane[1]}/${lane[2]}/` : "" };
    });
  const identityOf = (rel) => (texts.has(rel) ? identity(texts.get(rel)) : null);
  const pinFresh = (entry) => {
    const p = pinParts(entry);
    if (!p) return false;
    const cur = identityOf(p.path);
    return !!cur && (cur.startsWith(p.sha) || p.sha.startsWith(cur));
  };
  const pinsFresh = (pins) => Array.isArray(pins) && pins.length > 0 && pins.every(pinFresh);
  const staleOf = (pins) => (Array.isArray(pins) ? pins.filter((e) => !pinFresh(e)) : []);
  const scopes = [...new Set(all.map((d) => d.scope))].sort((x, y) => (x === "" ? 1 : y === "" ? -1 : x.localeCompare(y)));
  const docsOf = (sc) => all.filter((d) => d.scope === sc);
  const reviewsOf = new Map(
    scopes.map((sc) => {
      const m = new Map();
      for (const r of docsOf(sc).filter((d) => /-review-/.test(d.name))) {
        const lane = r.data.get("lane") ?? "r1";
        const iter = Number(r.data.get("iteration") ?? 0);
        const prefix = r.name.replace(/-review-[^-]+-\d+\.md$/, "");
        const key = `${prefix}|${lane}`;
        if (!m.has(key) || m.get(key).iter < iter) m.set(key, { ...r, lane, iter, prefix });
      }
      return [sc, m];
    }),
  );
  const allLatest = [...reviewsOf.values()].flatMap((m) => [...m.values()]);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  // Lanes of one artifact in one scope: latest review per declared lane.
  // What a review of `prefix` in scope `sc` must name: the artifact and its record;
  // a plan review, every task; a phase review, the plan, its record, every task and report.
  const taskFilesOf = (phase) => taskFiles.filter((t) => t.phase === phase).map((t) => t.rel);
  const reportFilesOf = (phase) => all.filter((d) => /^[^/]+\/tasks\/T\d+-report-\d+\.md$/.test(d.rel) && d.rel.startsWith(`${phase}/`)).map((d) => d.rel);
  const schemaOf = (prefix, sc) => {
    const art = ARTIFACTS.find((a) => a.prefix === prefix) ?? ARTIFACTS.find((a) => a.review === prefix);
    if (!art) return [];
    const inScope = (rel) => (sc ? `${sc}${rel.split("/").pop()}` : rel);
    const base = [inScope(art.path), inScope(art.record)];
    if (art.review && prefix === art.prefix) return [...base, ...taskFilesOf(art.phase)];
    if (art.review && prefix === art.review) return [...base, ...taskFilesOf(art.phase), ...reportFilesOf(art.phase)];
    return base;
  };
  // A review is fresh when its reviewed pins are fresh and name exactly its schema.
  const reviewFresh = (r, prefix, sc) => {
    const reviewed = [].concat(r.data.get("reviewed") ?? []);
    if (!pinsFresh(reviewed)) return false;
    const named = reviewed.map((p) => pinParts(p)?.path).sort();
    return JSON.stringify(named) === JSON.stringify([...schemaOf(prefix, sc)].sort());
  };
  const laneStates = (prefix, sc) => {
    const reviews = reviewsOf.get(sc) ?? new Map();
    const declared = lanesFor(prefix) ?? [...new Set([...reviews.values()].filter((r) => r.prefix === prefix).map((r) => r.lane))];
    return declared.map((lane) => {
      const r = reviews.get(`${prefix}|${lane}`);
      return r
        ? { lane, verdict: r.data.get("verdict") ?? "unstamped", charter: r.data.get("charter") ?? "full scope", fresh: reviewFresh(r, prefix, sc), iter: r.iter, review: r }
        : { lane, verdict: "none" };
    });
  };
  const approvedBy = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict === "approved" && l.fresh);
  // A wave is closed when every declared lane reported on the current identities.
  const waveClosed = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict !== "none" && l.fresh);
  // Waves since the last wave every declared lane approved, or since the
  // artifact's `episode-start` (stamped when new input reopens it); `audited`
  // records the wave an audit already covered.
  const episodeOf = (prefix, sc, artifactDoc) => {
    const rs = docsOf(sc).filter((d) => d.name.startsWith(`${prefix}-review-`));
    const declared = lanesFor(prefix) ?? [...new Set(rs.map((r) => r.data.get("lane") ?? "r1"))];
    const iters = [...new Set(rs.map((r) => Number(r.data.get("iteration") ?? 0)))];
    const last = iters.length ? Math.max(...iters) : 0;
    const approvedAll = (i) => declared.length > 0 && declared.every((lane) => rs.some((r) => (r.data.get("lane") ?? "r1") === lane && Number(r.data.get("iteration") ?? 0) === i && r.data.get("verdict") === "approved"));
    const lastApproved = Math.max(0, ...iters.filter(approvedAll));
    const start = Math.max(lastApproved, Number(artifactDoc?.data.get("episode-start") ?? 0));
    const episode = Math.max(0, last - start);
    const recurs = rs.filter((r) => Number(r.data.get("iteration") ?? 0) > start).flatMap((r) => [].concat(r.data.get("recurs") ?? []));
    const audited = Number(artifactDoc?.data.get("audited") ?? 0) >= last;
    return { episode, recurs, audited, last };
  };
  const gateOf = (e, approved, closed) => {
    if (approved || !closed) return null;
    if (e.episode >= valve) return "VALVE";
    if (e.episode >= audit && !e.audited) return "AUDIT";
    return null;
  };

  const out = { pipeline: pipelineRel, ref: args.ref ?? null, triggers: [], claims: [], lanes: [], artifacts: [], tasks: {}, counters: {}, frontier: null };
  const lines = [args.ref ? `${pipelineRel} @ ${args.ref}` : pipelineRel];
  let frontier = null;
  const take = (item) => {
    if (!frontier) frontier = item;
  };

  // A trigger is adjudicated when its target pins it; resolved when the target
  // is approved at an identity carrying that pin, or a review of the target
  // cites it as origin with an unsatisfiable verdict (escalated one layer up).
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

  // 1. Triggers: external amendments and failed task reports (the latest attempt).
  // Tasks are files `<phase>/tasks/T<n>.md`; attempts are `<phase>/tasks/T<n>-report-<k>.md`, pinning the task.
  const taskFiles = all.filter((d) => /^[^/]+\/tasks\/T\d+\.md$/.test(d.rel)).map((d) => ({
    rel: d.rel,
    phase: d.rel.split("/")[0],
    id: d.name.replace(/\.md$/, ""),
    deps: [].concat(d.data.get("depends") ?? []),
  }));
  const tasks = new Map();
  for (const t of all.filter((d) => /^[^/]+\/tasks\/T\d+-report-\d+\.md$/.test(d.rel))) {
    const [, id, k] = t.name.match(/^(T\d+)-report-(\d+)\.md$/);
    const phase = t.rel.split("/")[0];
    const attempt = Number(t.data.get("attempt") ?? k);
    const key = `${phase}/${id}`;
    if (!tasks.has(key) || tasks.get(key).attempt < attempt)
      tasks.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? "unstamped", fresh: pinsFresh(t.data.get("reviewed")) });
  }
  const triggers = [
    ...all.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel)).map((d) => ({ rel: d.rel, kind: "amendment", target: d.data.get("target") ?? "?" })),
    ...[...tasks.values()].filter((t) => t.outcome === "failed").map((t) => ({ rel: t.rel, kind: `failed task ${t.id}`, target: ARTIFACTS.find((x) => x.phase === t.phase)?.path ?? "?" })),
  ].map((t) => ({ ...t, targetPath: t.target.split("#")[0] }));
  const phaseOfTarget = (targetPath) => ARTIFACTS.findIndex((a) => a.path === targetPath) + 1;
  let unresolvedInScope = false;
  for (const t of triggers) {
    const res = resolutionOf(t);
    const label = res.state === "pending" ? "PENDING" : `${res.state}${res.detail ? ` (${res.detail})` : ""}`;
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, state: res.state, detail: res.detail ?? null });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${label}`);
    if (res.state === "pending") take(`trigger ${t.rel} → ${t.target}`);
    if (res.state !== "resolved" && phaseOfTarget(t.targetPath) <= args.targetPhase) unresolvedInScope = true;
  }

  // 2. Claims: an unsatisfiable verdict whose wave closed with no rejection.
  const claims = [];
  for (const sc of scopes)
    for (const r of reviewsOf.get(sc).values()) {
      if (r.data.get("verdict") !== "unsatisfiable") continue;
      const lanes = laneStates(r.prefix, sc);
      const c = {
        rel: r.rel,
        target: r.data.get("target") ?? "?",
        targetPath: (r.data.get("target") ?? "?").split("#")[0],
        targetIdentity: r.data.get("target-identity"),
        fresh: pinsFresh(r.data.get("reviewed")),
        claiming: [].concat(r.data.get("reviewed") ?? []).map((p) => pinParts(p)?.path),
        waveOpen: !waveClosed(lanes),
        rejected: lanes.some((l) => l.verdict === "rejected"),
      };
      c.fresh = !!r.data.get("reviewed") && lanes.some((l) => l.review === r && l.fresh);
      const cur = identityOf(c.targetPath);
      const unchanged = c.targetIdentity && cur && (cur.startsWith(c.targetIdentity) || c.targetIdentity.startsWith(cur));
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
    if (c.state === "pending") c.state = ownerTerritory(c.target) ? "PENDING — owner escalation" : "PENDING";
    out.claims.push({ review: c.rel, target: c.target, state: c.state });
    lines.push(`claim    ${c.rel} → ${c.target}  ${c.state}`);
    if (c.state.startsWith("PENDING") || c.state.startsWith("INVALID")) take(`claim ${c.rel} → ${c.target}${c.state.includes("owner") ? " (owner escalation)" : c.state.startsWith("INVALID") ? " (invalid target)" : ""}`);
    if (!/^(resolved|superseded|moot)/.test(c.state) && phaseOfTarget(c.targetPath) <= args.targetPhase) unresolvedInScope = true;
  }

  // 3. Phases in order, up to the target; a phase's production lanes come before its root artifact.
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane}:${l.verdict}${l.verdict !== "none" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  const artifactLine = (doc, art, sc) => {
    const pins = doc?.data.get("pins");
    const stale = staleOf(pins);
    const missingPins = art.requires.filter((req) => !(pins ?? []).some((p) => pinParts(p)?.path === req));
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : missingPins.length ? "incomplete pins" : "fresh";
    const lanes = laneStates(art.prefix, sc);
    const e = episodeOf(art.prefix, sc, doc);
    const approved = approvedBy(lanes);
    const gate = gateOf(e, approved, waveClosed(lanes));
    return { state, stale, missingPins, lanes, approved, episode: e.episode, recurs: e.recurs, gate };
  };
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
    const laneScopes = scopes.filter((sc) => sc.startsWith(`${art.phase}/`));
    let lanesReady = laneScopes.length > 0;
    for (const sc of laneScopes) {
      const doc = all.find((d) => d.rel === `${sc}${name}`);
      const st = doc ? artifactLine(doc, art, sc) : { state: "missing", stale: [], missingPins: [], lanes: [], approved: false, episode: 0, recurs: [], gate: null };
      const ok = st.approved && st.state === "fresh";
      if (!ok) lanesReady = false;
      out.lanes.push({ lane: sc, artifact: `${sc}${name}`, ...st, lanes: st.lanes.map(({ review, ...x }) => x), closed: rootExists });
      lines.push(`lane     ${sc}${name}  ${rootExists ? "closed" : st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${st.gate ? `  ${st.gate}` : ""}`);
      if (!rootExists && !ok) take(`${st.gate ? `${st.gate} → ` : ""}${st.state === "missing" ? `synthesize ${sc}${name}` : st.state === "stale" ? `re-synthesize ${sc}${name}` : st.state !== "fresh" ? `stamp ${sc}${name}` : waveClosed(st.lanes) ? `adjudicate ${sc}${name}` : `review wave ${sc}${name}`}`);
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
    const st = artifactLine(all.find((d) => d.rel === art.path), art, "");
    out.artifacts.push({ artifact: art.path, ...st, lanes: st.lanes.map(({ review, ...x }) => x) });
    if (st.episode || st.recurs.length) out.counters[art.prefix] = { episode: st.episode, recurs: st.recurs };
    lines.push(`artifact ${art.path}  ${st.state.toUpperCase()}${st.stale.length ? ` — ${st.stale.join("; ")}` : ""}${st.missingPins.length ? ` — missing pins: ${st.missingPins.join(", ")}` : ""}  reviews: ${render(st.lanes)}${st.approved ? "  APPROVED" : ""}${st.gate ? `  ${st.gate}` : ""}`);
    if (st.state !== "fresh") {
      take(st.state === "stale" ? `re-synthesize ${art.path}` : `stamp ${art.path}`);
      stopped = true;
    } else if (!st.approved) {
      take(`${st.gate ? `${st.gate} → ` : ""}${waveClosed(st.lanes) ? `adjudicate ${art.path}` : `review wave ${art.path}`}`);
      stopped = true;
    }
    if (!art.review) {
      if (st.state === "fresh" && st.approved) phaseDone(phaseNo);
      continue;
    }
    // Build and document: the phase's task files, their latest reports, then the phase review.
    const planTasks = taskFiles.filter((t) => t.phase === art.phase).sort((x, y) => Number(x.id.slice(1)) - Number(y.id.slice(1)));
    const phaseTasks = [...tasks.values()].filter((t) => t.phase === art.phase);
    const latestOf = (id) => phaseTasks.find((t) => t.id === id);
    const isDone = (id) => {
      const r = latestOf(id);
      return !!r && r.outcome === "completed" && r.fresh;
    };
    const done = planTasks.filter((t) => isDone(t.id)).map((t) => t.id);
    const open = phaseTasks.filter((t) => !isDone(t.id)).map((t) => `${t.id}:${t.outcome}${t.outcome === "completed" ? " (stale)" : ""}`);
    const blocked = (id) => {
      const r = latestOf(id);
      if (!r || r.outcome !== "failed" || !r.fresh) return false;
      return !(pinsByPath.get(art.path) ?? []).some((p) => pinParts(p)?.path === r.rel);
    };
    const next = planTasks.find((t) => !isDone(t.id) && t.deps.every(isDone) && !blocked(t.id));
    const remaining = planTasks.filter((t) => !isDone(t.id)).map((t) => t.id);
    out.tasks[art.phase] = { planned: planTasks.map((t) => t.id), done, open, next: next?.id ?? null };
    lines.push(`tasks    ${art.phase}: planned ${planTasks.length}  done [${done.join(", ")}]${open.length ? `  open [${open.join(", ")}]` : ""}${next ? `  next ${next.id}` : ""}`);
    if (!planTasks.length) {
      take(`no tasks in ${art.phase}/tasks/`);
      stopped = true;
    } else if (remaining.length) {
      take(next ? `task ${art.phase}/${next.id}` : `tasks blocked in ${art.phase}: ${remaining.join(", ")}`);
      stopped = true;
    }
    // Phase review: names the plan, its record, every task, and every report.
    const rl = laneStates(art.review, "");
    const e = episodeOf(art.review, "", all.find((d) => d.rel === art.path));
    const rApproved = approvedBy(rl);
    const gate = gateOf(e, rApproved, waveClosed(rl));
    out[`${art.review}Review`] = { lanes: rl.map(({ review, ...x }) => x), approved: rApproved, episode: e.episode, recurs: e.recurs, gate };
    if (e.episode || e.recurs.length) out.counters[art.review] = { episode: e.episode, recurs: e.recurs };
    lines.push(`${art.review.padEnd(8)} review: ${render(rl)}${rApproved ? "  APPROVED" : ""}${gate ? `  ${gate}` : ""}`);
    if (!rApproved) {
      take(`${gate ? `${gate} → ` : ""}${waveClosed(rl) ? `adjudicate ${art.path} (${art.review} review)` : `${art.review} review`}`);
      stopped = true;
    } else if (!texts.has(art.summary)) {
      take(`missing ${art.summary}`);
      stopped = true;
    } else {
      phaseDone(phaseNo);
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
  const args = { _: [], pin: [], reviewed: [], set: [], mirror: false, force: false, json: false, lanes: null, targetPhase: 4, ref: null, audit: null, valve: null };
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
    default:
      process.stdout.write(
        `rp — Radical Pipelines state tooling

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set key=value]... [--mirror] [--force]
  node rp.mjs check <pipeline-folder> [--lanes r1,r2 | --lanes spec=owner;design-doc=r1,r2] [--target-phase <n>] [--ref <branch>] [--audit 3] [--valve 6] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, --mirror copies of body declarations (Verdict, Charter, Target,
Origin, Outcome, Prior finding, a task's Depends on), and head — the commit
the stamp observed. Identity is the hash of a file's body: stamping never
changes it. check reports the frontier: triggers, claims, then phases in order
up to the target — lanes, artifacts, tasks, phase reviews, audit/valve gates —
and completion. Spec: ../reference/run/state.md
`,
      );
  }
}
