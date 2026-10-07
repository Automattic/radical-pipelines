import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach } from "node:test";

import { identity, laneFingerprint, parseFrontmatter, renderFrontmatter } from "../../../skills/radical-pipelines/scripts/rp.mjs";

export const RP = fileURLToPath(new URL("../../../skills/radical-pipelines/scripts/rp.mjs", import.meta.url));
export const PIPELINE = ".pipelines/demo";

export function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
export const P = (rel) => `${PIPELINE}/${rel}`;

export function write(root, rel, contents, refresh = true) {
  const path = join(root, P(rel));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  if (refresh) refreshPlan(root, rel);
}
// A plan declares its tasks by their files: a recorded plan keeps its ids current as task files land.
export function refreshPlan(root, rel) {
  const m = rel.match(/^(3-build|4-document)\/tasks\/(build|document)-task-[1-9]\d*\.md$/);
  if (!m) return;
  const plan = m[1] === "3-build" ? "3-build/build-plan.md" : "4-document/document-plan.md";
  const file = join(root, P(plan));
  if (!existsSync(file)) return;
  const { data, body } = parseFrontmatter(readFileSync(file, "utf8"));
  const ids = declaredIn(root, plan, body);
  const fields = Object.fromEntries(data ?? []);
  if (ids.length) fields.ids = ids; else delete fields.ids;
  writeFileSync(file, `---\n${JSON.stringify(fields, null, 2)}\n---\n${body}`);
}
// The prefix and words each artifact originates; a recorded artifact carries its declared ids, its
// task files, and, downstream, any upstream assumption it names.
export const DECLARES = {
  "0-intent/intent.md": ["intent", ["constraint", "context", "proposal"]],
  "1-spec/spec.md": ["spec", ["requirement", "acceptance-criterion", "assumption"]],
  "2-design-doc/design-doc.md": ["design-doc", ["decision", "assumption"]],
  "3-build/build-plan.md": ["build", ["assumption"]],
  "4-document/document-plan.md": ["document", ["assumption"]],
  "1-spec/spec-research.md": ["spec", ["question"]],
  "2-design-doc/design-doc-research.md": ["design-doc", ["question"]],
  "3-build/build-plan-research.md": ["build", ["question"]],
  "4-document/document-plan-research.md": ["document", ["question"]],
};
export function declaredIn(root, rel, body) {
  const parts = rel.split("/");
  const [prefix, words] = DECLARES[`${parts[0]}/${parts.at(-1)}`] ?? [null, []];
  if (!prefix) return [];
  const prose = body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[\t ]*$/gm, "");
  const items = [...prose.matchAll(/^((intent|spec|design-doc|build|document)-([a-z-]+?)-[1-9]\d*): \S/gm)];
  const own = items.filter((m) => m[2] === prefix && words.includes(m[3])).map((m) => m[1]);
  const carried = prefix === "intent" || prefix === "spec" ? [] : items.filter((m) => m[2] !== prefix && m[3] === "assumption").map((m) => m[1]);
  const folder = join(root, P(`${parts[0]}/tasks`));
  const tasks = ["build", "document"].includes(prefix) && existsSync(folder) ? readdirSync(folder).filter((n) => new RegExp(`^${prefix}-task-[1-9]\\d*\\.md$`).test(n)).map((n) => n.replace(/\.md$/, "")) : [];
  return [...new Set([...own, ...carried, ...tasks])];
}
export const read = (root, rel) => readFileSync(join(root, P(rel)), "utf8");

export function writeRunConfig(root, { workflow = "autonomous", targetPhase = 4, base = "main", lanes = [], body = "" } = {}) {
  write(root, "run-config.md", `---\n${JSON.stringify({ workflow, "target-phase": targetPhase, base, ...(lanes.length ? { lanes } : {}) }, null, 2)}\n---\n${body}`);
}

export function rp(root, ...args) {
  return execFileSync(process.execPath, [RP, ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
export function buildTemplate() {
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  git(root, "init", "--quiet", "--initial-branch=main");
  git(root, "config", "user.email", "rp-test@example.com");
  git(root, "config", "user.name", "RP Test");
  write(root, "0-intent/intent.md", "origin: issue 7\n\n# Intent\n\n## Goal\n\nOriginal intent.\n");
  write(root, "1-spec/spec.md", "# Spec\n\nspec-requirement-1: Requirement.\n");
  write(root, "1-spec/spec-research.md", "# Spec research\n");
  write(root, "2-design-doc/design-doc.md", "# Design doc\n\ndesign-doc-decision-1: Decision.\n");
  write(root, "2-design-doc/design-doc-research.md", "# Design research\n");
  write(root, "3-build/build-plan.md", "# Build plan\n\n## Overview\n\nWhat is implemented.\n");
  write(root, "3-build/build-plan-research.md", "# Plan research\n");
  writeRunConfig(root);
  for (const rel of ["0-intent/intent.md", "1-spec/spec.md", "2-design-doc/design-doc.md"]) rp(root, "stamp", P(rel), "--mirror");
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "-m", "intent");
  git(root, "checkout", "--quiet", "-b", "demo");
  return root;
}
// Every test starts from a copy of one fixture repository, built once per file.
let template;
export function initRepo() {
  template ??= buildTemplate();
  const root = mkdtempSync(join(tmpdir(), "rp-test-"));
  cpSync(template, root, { recursive: true });
  return root;
}
process.on("exit", () => template && rmSync(template, { recursive: true, force: true }));

export let root;
export const lane = (profile, id, fields = {}) => ({ profile, id, brief: `${id} brief`, ...fields });
export const standard = {
  security: lane("spec-reviewer", "security"),
  a11y: lane("spec-reviewer", "a11y"),
  event: lane("spec-producer", "event-driven"),
  contrarian: lane("spec-producer", "contrarian", { after: ["event-driven"] }),
  focus: lane("spec-reviewer", "focus"),
  a: lane("spec-producer", "a"),
  b: lane("spec-producer", "b"),
  c: lane("spec-producer", "c"),
};
export const FPS = Object.fromEntries(Object.entries(standard).map(([key, value]) => [key, laneFingerprint(value)]));
export const configure = ({ workflow = "autonomous", targetPhase = 4, base = "main", lanes = [], body = "" } = {}) => writeRunConfig(root, { workflow, targetPhase, base, lanes, body });
export const check = (fixtureRoot, ...args) => rp(fixtureRoot, "check", PIPELINE, ...args);

// --- helpers over the model -------------------------------------------------

export const SPEC = ["1-spec/spec.md", "1-spec/spec-research.md", "0-intent/intent.md"];
// A review names the artifact, its record, and everything the artifact pins.
export const DESIGN = ["2-design-doc/design-doc.md", "2-design-doc/design-doc-research.md", "0-intent/intent.md", "1-spec/spec.md", "1-spec/spec-review-1.md"];
export const PLAN_BASE = ["3-build/build-plan.md", "3-build/build-plan-research.md", "1-spec/spec.md", "2-design-doc/design-doc.md", "1-spec/spec-review-1.md", "2-design-doc/design-doc-review-1.md"];

// A phase reviewer commits its review on top of the landed work.
export function writeReview(rel, contents) {
  const phase = /^(?:3-build\/build|4-document\/document)-review-/.test(rel);
  if (phase) commitAll("landed work");
  write(root, rel, contents);
  if (phase) commitAll(`review ${rel}`);
}
export function review(rel, verdict, reviewed, extra = "") {
  writeReview(rel, `# Review\n\nverdict: ${verdict}\n${extra}`);
  rp(root, "stamp", P(rel), ...reviewed.flatMap((f) => ["--reviewed", P(f)]), "--mirror");
  if (/^(?:3-build\/build|4-document\/document)-review-/.test(rel)) commitAll(`stamp ${rel}`);
}
// A check whose base does not resolve: representation contradictions come first.
export function checkWithoutBase() {
  const config = read(root, "run-config.md");
  write(root, "run-config.md", config.replace('"base": "main"', '"base": "missing-branch"'));
  try { return JSON.parse(check(root, "--json")); } finally { write(root, "run-config.md", config); }
}
export function commitAll(subject) {
  git(root, "add", "-A");
  git(root, "commit", "--quiet", "--allow-empty", "-m", subject);
  return git(root, "rev-parse", "HEAD").trim();
}
export function registeredReview(rel, reviewed, lane = null) {
  const pins = reviewed.map((path) => `${path}@${identity(read(root, path), path)}`);
  registered(rel, { reviewed: pins, verdict: "approved", ...(lane ? { lane } : {}) }, "# Review\n\nverdict: approved\n");
}
export function pairs(paths) {
  return paths.map((path) => `${path}@${identity(read(root, path), path)}`);
}
export function registered(rel, fields, body = parseFrontmatter(read(root, rel)).body) {
  const ids = declaredIn(root, rel, body);
  const data = ids.length && !("ids" in fields) ? { ...fields, ids } : fields;
  (existsSync(join(root, P(rel))) ? (path, contents) => write(root, path, contents) : writeReview)(rel, `---\n${JSON.stringify(data, null, 2)}\n---\n${body}`);
}
export function registeredVerdict(rel, pins, verdict = "approved", lane = null) {
  registered(rel, { reviewed: pins, verdict, ...(lane ? { lane } : {}) }, `# Review\n\nverdict: ${verdict}\n`);
}
export function registeredRoot(artifact, reference, reviews, lane = null) {
  const scope = dirname(artifact);
  const binding = pairs([artifact, `${scope}/spec-research.md`, ...reviews]);
  const pins = [...pairs(["0-intent/intent.md"]), ...binding];
  registered("1-spec/spec.md", { pins, "lane-packages": [[artifact, binding, reference]] });
  const judged = [...pairs(["1-spec/spec.md", "1-spec/spec-research.md"]), ...pins];
  registeredVerdict("1-spec/spec-review-1.md", judged);
  if (lane) registeredVerdict("1-spec/spec-review-security-1.md", judged, "approved", lane);
}
export function stampSpec() {
  rp(root, "stamp", P("1-spec/spec.md"), "--pin", P("0-intent/intent.md"));
}
export function approveSpec(wave = 1) {
  review(`1-spec/spec-review-${wave}.md`, "approved", SPEC);
}
export function stampDesign() {
  rp(root, "stamp", P("2-design-doc/design-doc.md"), "--pin", P("0-intent/intent.md"), "--pin", P("1-spec/spec.md"), "--pin", P("1-spec/spec-review-1.md"));
}
export function approveDesign(wave = 1) {
  review(`2-design-doc/design-doc-review-${wave}.md`, "approved", DESIGN);
}
export function writeTasks() {
  write(root, "3-build/tasks/build-task-1.md", "# build-task-1: first\n\ndepends-on: none\n");
  write(root, "3-build/tasks/build-task-2.md", "# build-task-2: second\n\ndepends-on: build-task-1\n");
  rp(root, "stamp", P("3-build/tasks/build-task-1.md"), "--mirror");
  rp(root, "stamp", P("3-build/tasks/build-task-2.md"), "--mirror");
}
export function stampPlan(extraPins = []) {
  rp(root, "stamp", P("3-build/build-plan.md"), "--pin", P("1-spec/spec.md"), "--pin", P("2-design-doc/design-doc.md"), "--pin", P("1-spec/spec-review-1.md"), "--pin", P("2-design-doc/design-doc-review-1.md"), ...extraPins.flatMap((f) => ["--pin", P(f)]));
}
export const TASKS = ["3-build/tasks/build-task-1.md", "3-build/tasks/build-task-2.md"];
export function approvePlan(wave = 1) {
  review(`3-build/build-plan-review-${wave}.md`, "approved", [...PLAN_BASE, ...TASKS]);
}
export function report(id, k, outcome, deps = []) {
  write(root, `3-build/tasks/${id}-report-${k}.md`, `# Task report\n\noutcome: ${outcome}\n`);
  rp(root, "stamp", P(`3-build/tasks/${id}-report-${k}.md`), "--reviewed", P(`3-build/tasks/${id}.md`), ...deps.flatMap((d) => ["--reviewed", P(`3-build/tasks/${d}.md`)]), "--mirror");
}
export function approveChain(upTo) {
  stampSpec();
  approveSpec();
  if (upTo < 2) return;
  stampDesign();
  approveDesign();
  if (upTo < 3) return;
  writeTasks();
  stampPlan();
  approvePlan();
}
export function buildDone() {
  approveChain(3);
  report("build-task-1", 1, "completed");
  report("build-task-2", 1, "completed", ["build-task-1"]);
  review("3-build/build-review-1.md", "approved", [...PLAN_BASE, ...TASKS, "3-build/tasks/build-task-1-report-1.md", "3-build/tasks/build-task-2-report-1.md"]);
}

export function gitShim(action = "") {
  const bin = join(root, ".git", "test-bin"), log = join(root, ".git", "git-calls");
  mkdirSync(bin);
  const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
  writeFileSync(join(bin, "git"), `#!/bin/sh\nprintf '%s\\n' "$*" >> "$RP_GIT_LOG"\n${action}\nexec "$RP_REAL_GIT" "$@"\n`, { mode: 0o755 });
  return { log, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RP_REAL_GIT: realGit, RP_GIT_LOG: log } };
}

export function proposal(target = "1-spec/spec.md#spec-requirement-1") {
  write(root, "0-intent/proposal-1.md", `# Proposal 1\n\ntarget: ${target}\norigin: 0-intent/constraint-1.md\n\n## Request\n\nFix spec-requirement-1.\n`);
  rp(root, "stamp", P("0-intent/proposal-1.md"), "--mirror");
}

export function frontierChain(extraArtifact = null) {
  const artifacts = ["1-spec/spec.md", "2-design-doc/design-doc.md", "3-build/build-plan.md", "4-document/document-plan.md"];
  const records = artifacts.map((path) => path.replace(/\.md$/, "-research.md"));
  const reviews = artifacts.map((path) => path.replace(/\.md$/, "-review-1.md"));
  const tasks = ["3-build/tasks/build-task-1.md", "4-document/tasks/document-task-1.md"];
  const reports = tasks.map((path) => path.replace(/\.md$/, "-report-1.md"));
  for (const [i, task] of tasks.entries()) {
    registered(task, { "depends-on": [] }, `# ${task.split("/").at(-1).replace(/\.md$/, "")}\ndepends-on: none\n`);
    registered(reports[i], { reviewed: pairs([task]), outcome: "completed", attempt: "1" }, "# Report\noutcome: completed\n");
  }
  const inputs = [
    ["0-intent/intent.md"],
    ["0-intent/intent.md", artifacts[0], reviews[0]],
    [artifacts[0], artifacts[1], reviews[0], reviews[1]],
    [artifacts[0], artifacts[1], artifacts[2], reviews[0], reviews[1], reviews[2], "3-build/build-review-1.md", tasks[0], reports[0]],
  ];
  const context = "0-intent/context.md";
  write(root, context, "# Context\nOriginal evidence.\n");
  const packages = [];
  const phasePackages = [];
  for (const [i, artifact] of artifacts.entries()) {
    if (artifact === extraArtifact) inputs[i].push(context);
    registered(artifact, { pins: pairs(inputs[i]) }, `# Artifact\n\n${["spec-requirement-1", "design-doc-decision-1", "build-assumption-1", "document-assumption-1"][i]}: Clause.\n`);
    write(root, records[i], "# Record\n");
    packages[i] = [artifact, records[i], ...inputs[i], ...(i >= 2 ? [tasks[i - 2]] : [])];
    phasePackages[i] = [...packages[i], ...(i >= 2 ? [reports[i - 2]] : [])];
    registeredVerdict(reviews[i], pairs(packages[i]));
    if (i >= 2) registeredVerdict(`${i === 2 ? "3-build/build" : "4-document/document"}-review-1.md`, pairs(phasePackages[i]));
  }
  commitAll("pipeline");
  return { artifacts, records, reviews, inputs, packages, phasePackages, tasks, reports, context };
}

export function useFixture() {
  beforeEach(() => {
    root = initRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });
}
