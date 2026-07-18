# Document Plan: Support opencode as an agentic coding tool

## Overview

The build phase shipped opencode v2 as a second supported agentic coding tool alongside Claude Code: a zero-dependency plugin (`opencode/plugin.mjs`) exposing the `rp_spawn` / `rp_send` / `rp_loop_start` / `rp_loop_list` / `rp_loop_cancel` / `rp_status` tools, a pin manifest (`opencode/pin.json`), a per-tool convention file (`skills/radical-pipelines/reference/conventions/opencode.md`), the setup Tool→Read row and the `load.md` tool-mismatch rule, the package entry points and `test:opencode` script in `package.json`, a hermetic integration suite under `scripts/opencode-integration/`, and a changeset. The build deliberately deferred the owner-facing **install / update / version-surface procedures** and every prose documentation surface to this phase. This plan adds them. The core deliverable is a new README opencode section; the rest keep the repository's existing prose (README framing, CONTRIBUTING, the website, the package description) in sync with the now-two-tool reality.

**Sweep (repository-wide, what references the shipped behavior):**

- **README.md** — no opencode mention anywhere (the largest gap). Singles out Claude Code as the only plugin at the Project Usage opening (L65), the `## Claude Code plugin install` section (L67-102), the Configuration per-tool paragraph (L110), and the Why-now tooling note (L54). The shipped `opencode.md` convention (L29) already points readers at "the README's opencode section" — a dangling reference this plan resolves. → Tasks 1, 2.
- **CONTRIBUTING.md** — no opencode mention. Describes distribution as solely "a Claude Code plugin" (L21); the "Running tests and checks locally" section (L11-17) documents only `npm test`, not the shipped `npm run test:opencode`; the release-relevant changeset path list (L41-45) omits `opencode/**`, now out of sync with `.changeset/config.json`; the "Integrating an agentic coding tool" section (L230-248) is generic and never names opencode as the realized second tool. → Task 3.
- **website/index.html** — no opencode mention; states "Runs on Claude Code" (meta L9), keywords (L12), the CLI lede (L205), the terminal card (L214), the Why-now card (L280), and a single Claude-Code "Install in one line" block (L287-300) with a caption link to `#claude-code-plugin-install` (L233). → Task 4.
- **package.json** — `description` (L5) still reads "distributed as a Claude Code plugin and a standalone agent skill"; the shipped `main`/`exports`/`test:opencode` (L10-15) make RP also an opencode plugin, but the prose does not say so. → Task 5.
- **Empty / no-action surfaces (searched, confirmed):**
  - `website/demo.js`, `website/styles.css`, `website/robots.txt`, `website/sitemap.xml`, `website/assets/*` — no tool references; nothing to change.
  - `CHANGELOG.md` — no opencode entry; it is generated from `.changeset/opencode-support.md` at release and is immutable history, not a sync target. No action.
  - `GLOSSARY.md` — tool-agnostic; names no tool and introduces no new RP concept (its "Seating" term already covers opencode via the generic Team spawning convention). No action.
  - Generic skill tree — tool-agnostic by design; the only per-tool surfaces (the `setup.md` Tool→Read row, the `load.md` mismatch rule, the new `opencode.md`) already shipped. `reference/health-monitoring.md` and `reference/pipeline-versioning.md` are tool-agnostic and unchanged. No action.
  - This repository's own `.rp.md` — carries the Claude Code section by design (the repo dogfoods on Claude Code; spec Out of Scope 5 rules out one `.rp.md` serving two tools). No action.
  - `.claude-plugin/marketplace.json` / `plugin.json` — Claude Code's own install mechanism; expected to stay Claude-Code-framed. No action.
  - No README exists inside `opencode/`, `scripts/`, `scripts/opencode-integration/`, or `scripts/test/opencode/`; the plugin and suite are self-documented via header/JSDoc comments, and contributor guidance for the suite lands in CONTRIBUTING (Task 3). No new subdirectory README is planned.
  - `.pipelines/**` artifacts (this feature's own spec/design/build, plus older pipelines) — immutable pipeline record, not documentation. No action.

**Changeset note for writers:** the build-phase changeset `.changeset/opencode-support.md` (a `minor` bump for the whole opencode feature) already accompanies this branch and covers the release-relevant paths these tasks touch (README.md and package.json). No task adds a new changeset. CONTRIBUTING.md and `website/**` are not release-relevant paths (see CONTRIBUTING L47-56), so they require none either.

## Guardrail scopes

No scoped guardrail gates were passed to the document phase.

| Gate | Scope |
| ---- | ----- |
| None | — |

## Tasks

### Task 1: README — opencode install, update, and version-surface section

- **Goal:** Give an opencode owner a documented procedure to install RP, update it, and determine the installed RP version — the mechanics the build phase shipped but left undocumented.
- **Audience:** An owner running opencode v2 who wants to install, update, or operate RP.
- **Files to change:** `README.md`.
- **Sections / scope:** A new opencode section under `# Project Usage`, sibling to `## Claude Code plugin install`, at a stable heading/anchor (mirroring the Claude Code heading, e.g. `## opencode plugin install`). Ground every value in the shipped code: the install config shape and `opencode2 service restart` (design "Install configuration"; the sandbox in `scripts/opencode-integration/lib/sandbox.mjs`), `opencode/pin.json`, and `rp_status` / the `radical-pipelines@<version>` plugin id in `opencode/plugin.mjs`.
- **Depends on:** none
- **Traces to:** Spec requirements 1 (Install), 2 (Pinned target), 4 (Version discoverability), 5 (Update); acceptance criteria for install, update, and the version surface; resolves the `opencode.md` (L29) "README's opencode section" reference; shipped `opencode/pin.json`, `rp_status`, and `GET /api/plugin` id.
- **Acceptance:**
  - A reader on the pinned opencode v2 build can install RP by following the section: add the pinned `github:Automattic/radical-pipelines#v<X.Y.Z>` specifier and `autoupdate: false` to the global opencode config, then run `opencode2 service restart` once — after which the RP skill is invokable and every RP agent is available by its RP name, with opencode auto-update disabled.
  - The section documents the update procedure: bump the pinned tag and restart, and states that only pinned tags refresh (moving refs never do).
  - The section documents the version surface: `rp_status` reports the installed RP version and the pin comparison (including the "outside the verified surface" drift outcome and "not determinable" when the build cannot be read), and notes `GET /api/plugin` reports the `radical-pipelines@<version>` plugin id.
  - The section names the pinned target (`opencode/pin.json`, carrying the `@opencode-ai/cli` and `@opencode-ai/plugin` build) and states that builds other than the pin are outside the verified surface.
  - The section exists at a stable heading/anchor so the `opencode.md` convention's "README's opencode section" pointer and the website install link (Task 4) resolve to it.

### Task 2: README — reflect two supported tools in Project Usage and Configuration

- **Goal:** Remove the single-tool framing so the README presents opencode and Claude Code as peer supported tools.
- **Audience:** A prospective or current owner reading how RP is distributed and configured.
- **Files to change:** `README.md`.
- **Sections / scope:** The Project Usage opening sentence (L65); the `## Configuration` per-tool paragraph (L108-118); optionally the Why-now tooling note (L54). Ground the opencode convention details in `skills/radical-pipelines/reference/conventions/opencode.md` and the mismatch behavior in `load.md`.
- **Depends on:** Task 1 (same file; this task points readers to the opencode section Task 1 adds).
- **Traces to:** Spec requirements 6 (Skill loads unchanged), 7 (Agents available), 8 (Per-tool pattern), 9 (Setup), 10 (Tool-mismatch guard); shipped `opencode.md`, the `setup.md` Tool→Read row, and the `load.md` tool-mismatch rule.
- **Acceptance:**
  - The Project Usage opening no longer describes Claude Code as the sole plugin; it presents RP as installable under both Claude Code and opencode (plus the standalone skill).
  - The Configuration per-tool description covers the opencode conventions — `rp_spawn` team spawning, the `rp_loop_*` health monitor, and the optional Agent models (`provider/model[#variant]`) — alongside the Claude Code ones.
  - The Configuration text notes the tool-mismatch guard: a run under a tool whose committed `.rp.md` per-tool section names a different tool does not proceed and offers setup for the active tool.
  - No tool-agnostic claim in these sections contradicts the two-supported-tools reality.

### Task 3: CONTRIBUTING — opencode integration suite, changeset paths, and distribution wording

- **Goal:** Give contributors the facts they need for the opencode layer: how to run its integration suite, that `opencode/**` is now changeset-gated, and that RP distributes as an opencode plugin too.
- **Audience:** A contributor or maintainer of the RP repository.
- **Files to change:** `CONTRIBUTING.md`.
- **Sections / scope:** `## Running tests and checks locally` (L11-17); `### When a changeset is required` release-relevant path list (L39-46); the distribution sentence (L21); optionally `## Integrating an agentic coding tool` (L230-248). Ground the suite behavior in `scripts/opencode-integration/run.mjs` (header + `--network-smoke`) and `package.json`'s `test:opencode` script; ground the path list in `.changeset/config.json`'s `changedFilePatterns`.
- **Depends on:** none
- **Traces to:** Spec requirement 3 (Pinned verification — the integration tests); shipped `npm run test:opencode` / `scripts/opencode-integration/`; the `opencode/**` addition to `.changeset/config.json`; CONTRIBUTING's "Integrating an agentic coding tool" section.
- **Acceptance:**
  - "Running tests and checks locally" documents `npm run test:opencode`: the hermetic pinned integration suite that runs outside the fixed `npm test` gate, installs the pinned CLI on first use (cached by exact version), runs offline against a stub provider, with the `--network-smoke` release-cadence path requiring network access.
  - The release-relevant changeset path list includes `opencode/**`, matching `.changeset/config.json`.
  - The distribution description no longer calls RP solely "a Claude Code plugin"; it acknowledges the opencode plugin entry point.
  - (Optional) "Integrating an agentic coding tool" cites opencode (`opencode.md` + `opencode/plugin.mjs`) as the realized second tool.

### Task 4: Website — present opencode as a second supported tool

- **Goal:** Bring the public landing page in sync so it no longer states RP runs only on Claude Code.
- **Audience:** A prospective user or visitor evaluating RP.
- **Files to change:** `website/index.html`.
- **Sections / scope:** The meta description (L9) and keywords (L12); the CLI lede (L205); the Why-now tooling card (L280); the `## Install in one line` area (L287-300) and its caption link (L233); the terminal card label (L214) as fits. Mirror the install procedure from the README opencode section (Task 1).
- **Depends on:** Task 1 (mirrors the shipped opencode install procedure and links the new README opencode anchor).
- **Traces to:** Spec overview and requirement 1 (opencode is a supported tool an owner can install); mirrors the shipped install procedure; external-doc sync for the behavior the site describes.
- **Acceptance:**
  - The supported-tool copy (meta description, CLI lede, Why-now card) no longer states RP runs only on Claude Code; it presents opencode as a second supported tool.
  - The "Install in one line" area presents an opencode install path alongside the Claude Code one, consistent with the README opencode procedure (pinned specifier + `autoupdate: false` + `opencode2 service restart`).
  - An opencode install link resolves to the README opencode section, and the existing Claude Code install link remains valid.
  - The meta keywords include opencode.

### Task 5: package.json — describe RP as an opencode plugin too

- **Goal:** Correct the package's self-description so it matches the shipped opencode entry point.
- **Audience:** Anyone reading the package metadata (tooling, registry consumers, contributors inspecting `package.json`).
- **Files to change:** `package.json` — the `description` string only.
- **Sections / scope:** The `description` field (L5). No behavioral fields (`main`, `exports`, `scripts`, version) change.
- **Depends on:** none
- **Traces to:** Shipped `package.json` `main`/`exports` pointing at `opencode/plugin.mjs` (RP is now also an opencode plugin).
- **Acceptance:**
  - The `description` names RP as distributed as a Claude Code plugin, an opencode plugin, and a standalone agent skill (or equivalent phrasing), consistent with the shipped `main`/`exports`.
  - Only the `description` string is edited; every other `package.json` field is unchanged.
