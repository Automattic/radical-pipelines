#!/usr/bin/env node
// rp — minimal state tooling for Radical Pipelines v3.
// Zero dependencies. Serves the spec in ../reference/run/state.md; everything
// it does can be done with bare git. Commands: stamp, check.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

function blob(root, relPath) {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) return null;
  return execFileSync("git", ["hash-object", abs], { encoding: "utf8" }).trim().slice(0, SHORT);
}

// --- frontmatter (subset: scalars and lists of strings) ---------------------

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: null, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { data: null, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(text.indexOf("\n", end + 1) + 1);
  const data = new Map();
  let currentList = null;
  for (const line of raw.split("\n")) {
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
  out += "---\n";
  return out + body;
}

function readDoc(abs) {
  return parseFrontmatter(readFileSync(abs, "utf8"));
}

// --- stamp ------------------------------------------------------------------

function cmdStamp(args) {
  const root = repoRoot();
  const file = args._[0] || die("stamp: missing <artifact>");
  const abs = resolve(root, file);
  if (!existsSync(abs)) die(`stamp: no such file: ${file}`);

  const { data, body } = readDoc(abs);
  const fm = data ?? new Map();

  const pinList = (paths) =>
    paths.map((p) => {
      const rel = relative(root, resolve(root, p));
      const sha = blob(root, rel) ?? die(`stamp: cannot pin missing file: ${rel}`);
      return `${rel}@${sha}`;
    });

  if (args.pin.length) fm.set("pins", pinList(args.pin));
  if (args.reviewed.length) fm.set("reviewed", pinList(args.reviewed));
  for (const s of args.set) {
    const i = s.indexOf("=");
    if (i < 1) die(`stamp: --set expects key=value, got: ${s}`);
    fm.set(s.slice(0, i), s.slice(i + 1));
  }
  if (!fm.size) die("stamp: nothing to write (use --pin, --reviewed, --set)");

  writeFileSync(abs, renderFrontmatter(fm, body));
  process.stdout.write(`stamped ${relative(root, abs)}\n`);
}

// --- check ------------------------------------------------------------------

function pinState(root, entry) {
  const at = entry.lastIndexOf("@");
  if (at === -1) return { entry, state: "malformed" };
  const path = entry.slice(0, at);
  const pinned = entry.slice(at + 1).split("#")[0];
  const current = blob(root, path);
  if (current === null) return { entry, state: "target-missing" };
  return { entry, state: current.startsWith(pinned) || pinned.startsWith(current) ? "fresh" : "stale" };
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

function cmdCheck(args) {
  const root = repoRoot();
  const folder = args._[0] || die("check: missing <pipeline-folder>");
  const abs = resolve(root, folder);
  if (!existsSync(abs)) die(`check: no such folder: ${folder}`);

  const files = walk(abs).sort();
  const reviews = [];
  const lines = [];

  for (const f of files) {
    const rel = relative(root, f);
    const name = rel.split("/").pop();
    const { data } = readDoc(f);

    if (/-review-/.test(name)) {
      reviews.push({ rel, name, data });
      continue;
    }

    if (!data) {
      lines.push(`  ${rel}  UNSTAMPED`);
      continue;
    }
    const pins = data.get("pins");
    if (!Array.isArray(pins) || pins.length === 0) {
      lines.push(`  ${rel}  stamped · no pins`);
      continue;
    }
    const states = pins.map((p) => pinState(root, p));
    const bad = states.filter((s) => s.state !== "fresh");
    lines.push(
      bad.length === 0
        ? `  ${rel}  stamped · fresh (${pins.length} pin${pins.length > 1 ? "s" : ""})`
        : `  ${rel}  STALE — ${bad.map((b) => `${b.entry} (${b.state})`).join("; ")}`,
    );
  }

  process.stdout.write(`${relative(root, abs)}\n${lines.join("\n")}\n`);

  if (reviews.length) {
    process.stdout.write("reviews:\n");
    // latest iteration per (prefix, lane)
    const latest = new Map();
    for (const r of reviews) {
      const lane = r.data?.get("lane") ?? "—";
      const iter = Number(r.data?.get("iteration") ?? 0);
      const key = `${r.rel.replace(/-(?:r[^-]+-)?\d+\.md$/, "")}|${lane}`;
      if (!latest.has(key) || Number(latest.get(key).data?.get("iteration") ?? 0) < iter) latest.set(key, r);
    }
    for (const r of latest.values()) {
      const d = r.data ?? new Map();
      const verdict = d.get("verdict") ?? "UNSTAMPED";
      const lane = d.get("lane") ?? "—";
      const iter = d.get("iteration") ?? "?";
      const reviewed = Array.isArray(d.get("reviewed")) ? d.get("reviewed") : [];
      const states = reviewed.map((p) => pinState(root, p));
      const fresh = states.length > 0 && states.every((s) => s.state === "fresh");
      let extra = "";
      if (verdict === "unsatisfiable") {
        const target = d.get("target");
        if (target) {
          const t = pinState(root, target);
          extra = t.state === "fresh" ? `  → PENDING against ${target}` : `  → superseded (target changed)`;
        }
      }
      if (d.get("adjudicates")) extra += `  adjudicates: ${d.get("adjudicates")}`;
      process.stdout.write(
        `  ${r.rel}  lane ${lane} #${iter}  ${verdict}  ${reviewed.length ? (fresh ? "fresh" : "STALE") : "no reviewed pins"}${extra}\n`,
      );
    }
  }
}

// --- cli --------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [], pin: [], reviewed: [], set: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pin") args.pin.push(argv[++i]);
    else if (a === "--reviewed") args.reviewed.push(argv[++i]);
    else if (a === "--set") args.set.push(argv[++i]);
    else args._.push(a);
  }
  return args;
}

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
      `rp — Radical Pipelines state tooling (v3, minimal)

Usage:
  node rp.mjs stamp <file> [--pin <path>]... [--reviewed <path>]... [--set key=value]...
  node rp.mjs check <pipeline-folder>

stamp writes frontmatter (the machine's lane): derivation pins, review pins,
and scalar keys (verdict, lane, iteration, target, adjudicates, origins).
check is descriptive: per-file pin freshness, latest review per lane, and
pending unsatisfiable claims. Spec: ../reference/run/state.md
`,
    );
}
