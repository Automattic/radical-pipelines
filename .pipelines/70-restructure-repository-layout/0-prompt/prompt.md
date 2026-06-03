# Restructure the repository to clearly scope distribution, providers, and consumer state

> Source: GitHub issue [Automattic/radical-pipelines#70](https://github.com/Automattic/radical-pipelines/issues/70).
> This document is self-contained: it captures the original request and the full discussion that followed, including the constraints surfaced and the questions that are still open. Treat the proposed layouts below as **directions the owner wants explored**, not as settled requirements — later phases do their own research and decide the design.

## Goal

Reorganize the repository so that, at a glance, anyone landing in it can tell:

- What is **shared** across all agentic coding tools (the methodology, the agent profiles).
- What is **specific to a given tool** (Claude Code, Pi, future tools like Codex).
- What is **project-level Radical Pipelines state** (conventions, pipeline artifacts).

The end state should make adding a new tool a mechanical operation that touches only that tool's folder plus a single conventions file — never the shared core.

## Context

The repo currently ships both a Claude Code plugin and a Pi extension side by side. It also includes files and folders that exist as a result of using Radical Pipelines on itself (dogfooding). For the owner, this makes the layout harder to read than it needs to be:

- A hidden `.agents/` directory holds the canonical skill + agents, exposed at the root via symlinks. The hiding is believed to be a workaround for Claude Code expecting `agents/` and `skills/` at the plugin root.
- `.claude-plugin/` sits at the repo root because Claude Code requires that name; `.pi-extension/` sits at the root for symmetry, but it doesn't have to.
- A pointer `.rp.md` at the root routes to `.claude/.rp.md` or `.pi/.rp.md` — three files for one concept.
- Pipeline artifacts live in `.pipelines/`, separate from the conventions file, even though both are project-level Radical Pipelines state.
- `.claude/` and `.pi/` dotdirs exist mostly for dogfooding shortcuts, even though installed plugins/extensions can handle the same job.

The project is still at v0.1. Doing this cleanup now is cheap; doing it later — once external users have memorized the current install paths and layout — gets harder.

## Directions to explore

The potential shape the owner originally had in mind:

```
radical-pipelines/
├── skill/                          # distribution: methodology
├── agents/                         # distribution: 15 agent profiles
├── providers/                      # distribution: per-tool packaging
│   ├── claude-code/
│   └── pi/
├── .rp/                            # consumer state (for this repo's own dogfood)
│   ├── CONVENTIONS.md
│   └── pipelines/
├── README.md
├── AGENTS.md
├── LICENSE
├── assets/
└── landing/
```

### Consolidated into `.rp/CONVENTIONS.md`

The three files below would merge into one. Common conventions (slug format, issues source, commit format) live in a shared top section; tool-specific conventions (worktrees, team spawning, health monitoring, provider/model recovery) each become a `## When using <tool>` section.

- `.rp.md` (root pointer)
- `.claude/.rp.md`
- `.pi/.rp.md`

**Result for a normal user's project**: exactly one new directory induced by Radical Pipelines, named `.rp/`. Today they have 2–3.

### Removed (as originally proposed)

| Path                        | Reason                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/`                  | Hiding workaround no longer needed; canonical sources move to root `skill/` + `agents/`.                                               |
| `agents` (root symlink)     | Replaced by canonical root-level `agents/` directory.                                                                                  |
| `skills` (root symlink)     | Replaced by canonical root-level `skill/` directory.                                                                                   |
| `.claude/`                  | Dogfooding shortcut; replaced by `claude --plugin-dir ./providers/claude-code`. The folder's `.rp.md` merges into `.rp/CONVENTIONS.md`. |
| `.pi/`                      | Dogfooding shortcut; one-time `pi install ./providers/pi -l` replaces it. The folder's `.rp.md` merges into `.rp/CONVENTIONS.md`.       |
| `.rp.md` (root pointer)     | Single root `.rp/CONVENTIONS.md` replaces it.                                                                                          |
| `package.json` (root)       | Pi git-install shim. Pi manifest lives under `providers/pi/`. *(See open question 1.)*                                                  |
| `CLAUDE.md` (root)          | One-line `@AGENTS.md` pointer. Modern Claude Code reads `AGENTS.md` natively.                                                          |

### Moved or renamed (as originally proposed)

| From                                | To                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `.agents/skills/radical-pipelines/` | `skill/`                                                                               |
| `.agents/agents/`                   | `agents/`                                                                              |
| `.claude-plugin/` (root)            | `providers/claude-code/.claude-plugin/`                                                |
| `.pi-extension/`                    | `providers/pi/` (internal symlink targets updated to point at canonical root sources) |
| `.pipelines/<slug>/`                | `.rp/pipelines/<slug>/`                                                                |

A `providers/` folder for tool-specific packaging, so each tool is self-contained and symmetric:

```
providers/
├── claude-code/
│   ├── .claude-plugin/                       # required name by Claude Code
│   ├── skills/radical-pipelines → ../../../skill
│   ├── agents → ../../agents
│   └── README.md
└── pi/
    ├── package.json
    ├── package-lock.json
    ├── teams.yaml
    ├── skills/radical-pipelines → ../../../skill
    ├── agents → ../../agents
    └── README.md
```

Adding a future provider (e.g. Codex) would become one new folder under `providers/`, plus one conventions file inside the skill, plus one row in the supported-tools table.

Drop dotdirs that installed tools can handle themselves:

- `.claude/` entirely — local plugin development uses `claude --plugin-dir ./providers/claude-code`; everyone else has the plugin in their CLI cache.
- `.pi/` entirely — developers run `pi install ./providers/pi -l` once after cloning instead of relying on `.pi/settings.json` auto-install.

## Discussion and refinements

The proposal was discussed and refined. The following points emerged.

### Constraints — things that cannot move today

From the owner (luisherranz):

- **Root `package.json` of the Pi extension.** `pi install git:github.com/Automattic/radical-pipelines` resolves at the cloned repo root, so a Pi manifest must live there. (It was confirmed in discussion that `install` cannot be pointed at a subfolder.)
- **Root `.rp.md`.** The skill reads it from the project root. Its contents can still point wherever the project wants. (Open question: whether the skill could instead be changed to read it from `.rp/`.)
- **`.claude-plugin/marketplace.json` at the repo root.** `/plugin marketplace add Automattic/radical-pipelines` looks for it there. The plugin's own `plugin.json` *can* move (e.g. into `providers/claude-code/.claude-plugin/plugin.json`) as long as the marketplace's `source` field points at the new location.

### Implications the owner raised

- The marketplace catalog could later be moved out of this repo into a future `Automattic/claude-plugins` (tracked in issue #73). Once that happens this constraint disappears entirely, and the whole `.claude-plugin/` directory could live under `providers/claude-code/`.
- Alternatively, if `.claude-plugin/plugin.json` stays at the root, no symlink is needed — the root `skills/` and `agents/` folders are fine as-is.
- The same goes for the Pi extension: since `package.json` has to be at the root, no symlink is needed there either.
- Taken together, those last two points mean the `providers/` folder could potentially be dropped entirely.

### Confirmed deletable / movable by the owner

- `.claude/`: its `.rp.md` content folds into the merged `.rp/CONVENTIONS.md`.
- `.pipelines/`: moves to `.rp/pipelines/`.
- `.agents/`: canonical contents move to root `skills/` and `agents/`.
- `.pi/` (including `settings.json`): losing it means the dogfood install becomes a one-time `pi install . -l` after cloning instead of Pi's auto-install. Considered an acceptable trade-off for the layout simplification.
- `assets/` *can* be merged into `landing/assets/`, but the two `radical-pipelines.png` files there today are **not** byte-identical (different MD5s). One would need to be picked and the README's `./assets/radical-pipelines.png` reference updated.

### Open questions about Pi (originally directed at @cbravobernal)

Today there are two Pi install paths, and they use different `package.json` files:

1. **Local dogfood:** `.pi/settings.json` says `{"packages": ["../.pi-extension"]}`, so Pi auto-installs `.pi-extension/` here → uses `.pi-extension/package.json`.
2. **End-user git install:** `pi install git:github.com/Automattic/radical-pipelines` reads the root `package.json`. Its `pi.skills` entry currently points at `.pi-extension/skills`.

Given that, can the whole `.pi-extension/` folder be deleted, assuming the project also:

- drops `.pi/` (so dogfood install becomes a one-time `pi install . -l` after cloning), and
- updates the root `package.json`'s `pi.skills` to point at the new `skills/` location at the repo root?

Specifically:

- `.pi-extension/package.json` looks like a duplicate of the root manifest, and its only consumer is the dogfood auto-install path. Is it safe to remove if the one-time install step is accepted?
- The `agents` symlink in `.pi-extension/` doesn't appear in either manifest's `pi` section. It is listed in `.pi-extension/package.json`'s `files` field, but `files` is an npm-publish convention and the project installs from git/local path, so it's effectively dead. With agents at root `agents/`, do they need to be declared anywhere in the root `pi` manifest, or does pi-teams discover agents from `.pi/agents/` / `~/.pi/agent/agents/` only?
- `teams.yaml` is documented as needing to be registered globally in `~/.pi/teams.yaml`; pi-teams doesn't read package-local team files. So nothing automatic points at it today; it's source-of-truth content. Is it really needed?

### A simpler candidate end state (raised by SantosGuillamot)

Pending the Pi answers and the question of whether `.rp.md` must stay at the root, the project might end up looking like this — flatter, with no `providers/` folder:

```
radical-pipelines/
├── .claude-plugin/
│   └── plugin.json                ← marketplace.json gone (#73)
│
├── .rp/                           ← new namespace
│   ├── RP.md                      ← current root .rp.md (name TBD)
│   └── pipelines/                 ← renamed from .pipelines/
│
├── agents/                        ← real directory, no symlink
├── skills/                        ← real directory, no symlinks
├── landing/                       ← root assets/ merged into landing/assets/
│
├── package.json                   ← pi.skills updated to "skills"
│
├── AGENTS.md                      ← source of truth for project instructions
├── CLAUDE.md                      ← one-line `@AGENTS.md` import (required)
├── README.md
└── LICENSE
```

It was also raised that a consumer using Radical Pipelines in their own project might prefer everything related to it to live under a single `.rp/` folder.

## What a successful outcome looks like

A repository layout where the three concerns — shared distribution, per-tool packaging, and project-level Radical Pipelines state — are immediately legible, the install paths for Claude Code and Pi still work, and adding a new tool is a localized, mechanical change. The exact final shape (whether `providers/` exists, whether `.rp.md` stays at the root, and the resolution of the Pi questions above) is to be decided in the later phases.
