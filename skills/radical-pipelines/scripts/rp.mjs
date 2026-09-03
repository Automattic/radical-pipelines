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
  // A plan's task blocks: `### T<n>: …` with `- **Depends on:** none | T<a>, T<b>`.
  const tasks = [];
  for (const block of body.split(/^### (?=T\d+:)/m).slice(1)) {
    const id = block.match(/^(T\d+):/)[1];
    const dep = block.match(/^\s*-\s*\*\*Depends on:\*\*\s*(.+)$/m);
    const deps = dep ? [...dep[1].matchAll(/T\d+/g)].map((m) => m[0]) : [];
    tasks.push(deps.length ? `${id} <- ${deps.join(",")}` : id);
  }
  if (tasks.length) fm.set("tasks", tasks);
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

const ARTIFACTS = [
  { path: "1-spec/spec.md", prefix: "spec", phase: "1-spec", requires: ["0-intent/intent.md"] },
  { path: "2-design-doc/design-doc.md", prefix: "design-doc", phase: "2-design-doc", requires: ["0-intent/intent.md", "1-spec/spec.md"] },
  { path: "3-build/build-plan.md", prefix: "build-plan", phase: "3-build", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md"], review: "build", summary: "3-build/build-summary.md" },
  { path: "4-document/document-plan.md", prefix: "document-plan", phase: "4-document", requires: ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-summary.md"], review: "document", summary: "4-document/document-summary.md" },
];
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
        const prefix = r.name.replace(/-review-(?:r[^-]+-|owner-)?\d+\.md$/, "");
        const key = `${prefix}|${lane}`;
        if (!m.has(key) || m.get(key).iter < iter) m.set(key, { ...r, lane, iter, prefix });
      }
      return [sc, m];
    }),
  );
  const allLatest = [...reviewsOf.values()].flatMap((m) => [...m.values()]);
  const pinsByPath = new Map(all.filter((d) => Array.isArray(d.data.get("pins"))).map((d) => [d.rel, d.data.get("pins")]));

  // Lanes of one artifact in one scope: latest review per declared lane.
  const laneStates = (prefix, sc) => {
    const reviews = reviewsOf.get(sc) ?? new Map();
    const declared = lanesFor(prefix) ?? [...new Set([...reviews.values()].filter((r) => r.prefix === prefix).map((r) => r.lane))];
    return declared.map((lane) => {
      const r = reviews.get(`${prefix}|${lane}`);
      return r
        ? { lane, verdict: r.data.get("verdict") ?? "unstamped", charter: r.data.get("charter") ?? "full scope", fresh: pinsFresh(r.data.get("reviewed")), iter: r.iter, review: r }
        : { lane, verdict: "none" };
    });
  };
  const approvedBy = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict === "approved" && l.fresh);
  // A wave is closed when every declared lane reported on the current identities.
  const waveClosed = (lanes) => lanes.length > 0 && lanes.every((l) => l.verdict !== "none" && l.fresh);
  const episodeOf = (prefix, sc) => {
    const rs = docsOf(sc).filter((d) => d.name.startsWith(`${prefix}-review-`));
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
    const floor = byLane.size ? Math.min(...[...byLane.values()].map((e) => e.approved)) : 0;
    const recurs = rs.filter((r) => Number(r.data.get("iteration") ?? 0) > floor).flatMap((r) => [].concat(r.data.get("recurs") ?? []));
    return { episode, recurs };
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
  const resolutionOf = (item) => {
    const targetArtifact = ARTIFACTS.find((x) => x.path === item.targetPath);
    const pinned = (pinsByPath.get(item.targetPath) ?? []).some((p) => pinParts(p)?.path === item.rel);
    for (const r of allLatest) {
      const covers = [].concat(r.data.get("reviewed") ?? []).some((p) => pinParts(p)?.path === item.targetPath);
      const cites = [].concat(r.data.get("origin") ?? []).includes(item.rel);
      if (covers && cites && r.data.get("verdict") === "unsatisfiable") return `escalated by ${r.rel}`;
    }
    if (!pinned) return null;
    const approved = targetArtifact ? approvedBy(laneStates(targetArtifact.prefix, "")) : false;
    return approved ? `resolved (${item.targetPath} approved carrying it)` : `adjudicated by ${item.targetPath}, awaiting approval`;
  };

  // 1. Triggers: external amendments and failed task reports (the latest attempt).
  const tasks = new Map();
  for (const t of all.filter((d) => /^task-.+-\d+\.md$/.test(d.name) && d.rel.includes("tasks/"))) {
    const phase = t.rel.split("/")[0];
    const id = t.data.get("task") ?? t.name.replace(/^task-(.+)-\d+\.md$/, "$1");
    const attempt = Number(t.data.get("attempt") ?? t.name.match(/-(\d+)\.md$/)[1]);
    const key = `${phase}/${id}`;
    if (!tasks.has(key) || tasks.get(key).attempt < attempt) tasks.set(key, { rel: t.rel, phase, id, attempt, outcome: t.data.get("outcome") ?? "unstamped" });
  }
  const triggers = [
    ...all.filter((d) => /^0-intent\/\d+-amendment\.md$/.test(d.rel)).map((d) => ({ rel: d.rel, kind: "amendment", target: d.data.get("target") ?? "?" })),
    ...[...tasks.values()].filter((t) => t.outcome === "failed").map((t) => ({ rel: t.rel, kind: `failed task ${t.id}`, target: ARTIFACTS.find((x) => x.phase === t.phase)?.path ?? "?" })),
  ].map((t) => ({ ...t, targetPath: t.target.split("#")[0] }));
  for (const t of triggers) {
    const res = resolutionOf(t);
    out.triggers.push({ path: t.rel, kind: t.kind, target: t.target, state: res ?? "PENDING" });
    lines.push(`trigger  ${t.rel} (${t.kind}) → ${t.target}  ${res ?? "PENDING"}`);
    if (!res) take(`trigger ${t.rel} → ${t.target}`);
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
      const cur = identityOf(c.targetPath);
      const unchanged = c.targetIdentity && cur && (cur.startsWith(c.targetIdentity) || c.targetIdentity.startsWith(cur));
      const res = resolutionOf(c);
      if (c.targetIdentity && !unchanged) c.state = "superseded (target changed)";
      else if (res && (res.startsWith("resolved") || res.startsWith("escalated"))) c.state = res.startsWith("resolved") ? res : `resolved (${res})`;
      else if (!c.fresh) c.state = "moot (claiming artifact changed)";
      else if (c.waveOpen) c.state = "wave open";
      else if (c.rejected) c.state = "held (a lane rejected; adjudicate first)";
      else if (res) c.state = res;
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
    if (c.state.startsWith("PENDING")) take(`claim ${c.rel} → ${c.target}${c.state.includes("owner") ? " (owner escalation)" : ""}`);
  }

  // 3. Phases in order, up to the target; a phase's production lanes come before its root artifact.
  const render = (ls) => (ls.length ? ls.map((l) => `${l.lane}:${l.verdict}${l.verdict !== "none" ? (l.fresh ? "" : " (stale)") : ""}`).join(" ") : "none");
  const artifactLine = (doc, art, sc) => {
    const pins = doc?.data.get("pins");
    const stale = staleOf(pins);
    const missingPins = art.requires.filter((req) => !(pins ?? []).some((p) => pinParts(p)?.path === req));
    const state = !Array.isArray(pins) || pins.length === 0 ? "unstamped" : stale.length ? "stale" : missingPins.length ? "incomplete pins" : "fresh";
    const lanes = laneStates(art.prefix, sc);
    const { episode, recurs } = episodeOf(art.prefix, sc);
    const approved = approvedBy(lanes);
    const gate = !approved && episode >= valve ? "VALVE" : !approved && episode === audit ? "AUDIT" : null;
    return { state, stale, missingPins, lanes, approved, episode, recurs, gate };
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
      if (!rootExists && !ok) take(st.gate ? `${st.gate} ${sc}${name}` : st.state === "missing" ? `synthesize ${sc}${name}` : st.state === "stale" ? `re-synthesize ${sc}${name}` : waveClosed(st.lanes) ? `adjudicate ${sc}${name}` : `review wave ${sc}${name}`);
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
      take(st.gate ? `${st.gate} ${art.path}` : waveClosed(st.lanes) ? `adjudicate ${art.path}` : `review wave ${art.path}`);
      stopped = true;
    }
    if (!art.review) {
      if (st.state === "fresh" && st.approved) phaseDone(phaseNo);
      continue;
    }
    // Build and document: tasks from the plan's mirrored task list, then the phase review.
    const planTasks = [].concat(all.find((d) => d.rel === art.path)?.data.get("tasks") ?? []).map((t) => {
      const [id, deps] = t.split("<-").map((x) => x.trim());
      return { id, deps: deps ? deps.split(",").map((x) => x.trim()) : [] };
    });
    const phaseTasks = [...tasks.values()].filter((t) => t.phase === art.phase);
    const done = new Set(phaseTasks.filter((t) => t.outcome === "completed").map((t) => t.id));
    const open = phaseTasks.filter((t) => t.outcome !== "completed").map((t) => `${t.id}:${t.outcome}`);
    const next = planTasks.find((t) => !done.has(t.id) && t.deps.every((d) => done.has(d)) && !phaseTasks.some((x) => x.id === t.id && x.outcome === "failed"));
    const remaining = planTasks.filter((t) => !done.has(t.id)).map((t) => t.id);
    out.tasks[art.phase] = { planned: planTasks.map((t) => t.id), done: [...done], open, next: next?.id ?? null };
    lines.push(`tasks    ${art.phase}: planned ${planTasks.length}  done [${[...done].join(", ")}]${open.length ? `  open [${open.join(", ")}]` : ""}${next ? `  next ${next.id}` : ""}`);
    if (!planTasks.length) {
      take(`stamp ${art.path} --mirror (no tasks mirrored)`);
      stopped = true;
    } else if (remaining.length) {
      take(next ? `task ${art.phase}/${next.id}` : `tasks blocked in ${art.phase}: ${remaining.join(", ")}`);
      stopped = true;
    }
    // Phase review: pins the plan and every task report; fresh iff those match the current set.
    const reportSet = phaseTasks.map((t) => t.rel).sort();
    const rl = laneStates(art.review, "").map((l) => {
      if (!l.review) return l;
      const reviewed = [].concat(l.review.data.get("reviewed") ?? []);
      const reviewedReports = reviewed.map((p) => pinParts(p)?.path).filter((x) => x && x.includes("tasks/")).sort();
      return { ...l, fresh: pinsFresh(reviewed) && JSON.stringify(reviewedReports) === JSON.stringify(reportSet) };
    });
    const { episode, recurs } = episodeOf(art.review, "");
    const rApproved = approvedBy(rl);
    const gate = !rApproved && episode >= valve ? "VALVE" : !rApproved && episode === audit ? "AUDIT" : null;
    out[`${art.review}Review`] = { lanes: rl.map(({ review, ...x }) => x), approved: rApproved, episode, recurs, gate };
    if (episode || recurs.length) out.counters[art.review] = { episode, recurs };
    lines.push(`${art.review.padEnd(8)} review: ${render(rl)}${rApproved ? "  APPROVED" : ""}${gate ? `  ${gate}` : ""}`);
    if (!rApproved) {
      take(gate ? `${gate} ${art.review} review` : waveClosed(rl) ? `adjudicate ${art.path} (${art.review} review)` : `${art.review} review`);
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
  out.complete = !frontier && through >= args.targetPhase;
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
  node rp.mjs check <pipeline-folder> [--lanes r1,r2 | --lanes spec=owner;design-doc=r1,r2] [--target-phase <n>] [--ref <branch>] [--audit 3] [--valve 6] [--json]

stamp writes frontmatter (the machine's lane): pins, review pins (immutable),
scalar keys, --mirror copies of body declarations (Verdict, Charter, Target,
Origin, Outcome, Prior finding, a plan's task blocks), and head — the commit
the stamp observed. Identity is the hash of a file's body: stamping never
changes it. check reports the frontier: triggers, claims, then phases in order
up to the target — lanes, artifacts, tasks, phase reviews, audit/valve gates —
and completion. Spec: ../reference/run/state.md
`,
      );
  }
}
