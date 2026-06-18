# Code Plan: opencode support (via opencode-ensemble)

## Overview

Add opencode as a third supported agentic coding tool at parity with Claude Code and Pi, following the established per-tool pattern exactly: one new conditionally-loaded convention file, one new publishable packaging artifact, and exactly two minimal behavior-preserving edits to generic skill files. The work is ordered so the generic edits land first (they are independent and low-risk), then the new `opencode.md` convention file that those edits and the setup flow point at, then the packaging sub-package (its own manifest, the meta-plugin entry, and the agent/skill bundling), and finally the build/release tooling edits that keep the new sub-package's version in lockstep with the root. No task plans tests, documentation, or design decisions — every decision is taken from the design doc.

This repository **is** the Radical Pipelines skill, so "implementation" here means editing skill prose (`skills/radical-pipelines/reference/...`), authoring a convention file, creating a workspace sub-package with a small meta-plugin entry, and extending two tooling files. The 17 agent bodies in `agents/*.md` are reused verbatim — no task edits them.

Scope boundary the plan honors strictly (from spec Req 17–19 and the design's Components section):

- Exactly two generic skill files are edited: `reference/conventions/setup.md` (two edit sites in the one file) and `reference/health-monitoring.md` (two rewordings). No other generic skill file is touched.
- One new generic-adjacent convention file is created: `reference/conventions/opencode.md` (conditionally loaded, like `pi.md` — not a generic file in the scope-boundary sense).
- The packaging artifact (a workspace sub-package) and the build/release tooling edits (`package.json`, `scripts/sync-version.mjs`, `.changeset/config.json`) are non-generic and do not touch `skills/` content.

## Tasks

### Task 1: Generalize the context-window clause in `setup.md`'s Health-monitoring convention description

- **Goal:** Reword the one context-window assertion in `setup.md` so it no longer claims every supported tool (which will include opencode) handles context-window limits *by auto-compaction* — the behavior the spec puts Out of Scope as unverified and not-relied-on.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md` (the **Health monitoring (required)** convention description, currently line 102).
- **Changes:** Replace the sentence `Context-window limits are handled by each tool's own auto-compaction, not by the monitor.` with `Context-window limits are handled by each tool's own mechanism, not by the monitor.` (the source sentence has no bold markers; the design doc's Decision 5 / edit-site-2 quote shows them in error). Change only this sentence; leave the rest of the Health-monitoring description and every other part of `setup.md` untouched by this task.
- **Depends on:** none
- **Traces to:** Spec Req 17 (second authorized edit site), spec Out-of-Scope (opencode context-window handling unverified, spec:59); Design Decision 5; Design Components → MODIFIED `setup.md` edit site 2.
- **Acceptance:**
  - `setup.md`'s Health-monitoring convention description attributes context-window handling to "each tool's own mechanism," not to "auto-compaction."
  - The sentence names no fixed set of tools and asserts nothing about opencode's specific context-window behavior.
  - No other sentence in `setup.md` is changed by this task.

### Task 2: Add opencode to the supported-tools table in `setup.md`

- **Goal:** Register opencode as a selectable, supported tool whose convention file is loaded when selected, with no opencode-specific awareness leaking into the generic flow.
- **Files to change:** `skills/radical-pipelines/reference/conventions/setup.md` (the Step-1 supported-tools table, currently lines 21–24).
- **Changes:** Add one new row to the supported-tools table so it reads, in order, Claude Code → `claude-code.md`, Pi → `pi.md`, opencode → `opencode.md`. The new row is `| opencode    | opencode.md      |` (matching the table's column alignment). Make no other change to `setup.md` in this task. Step 3 ("consult the active tool's rules for a **Setup actions** section") is already generic and will auto-discover `opencode.md`'s Setup actions — do not edit Step 3.
- **Depends on:** none (the row may be added before `opencode.md` exists; Task 4 creates the file it points at)
- **Traces to:** Spec Req 2, Req 17 (first authorized edit site); acceptance "Tool selection and end-to-end runs" (opencode appears alongside Claude Code and Pi); Design Approach step 1; Design Components → MODIFIED `setup.md` edit site 1.
- **Acceptance:**
  - The supported-tools table in `setup.md` lists three tools — Claude Code, Pi, and opencode — with opencode pointing at `opencode.md`.
  - The Claude Code and Pi rows are unchanged.
  - No part of `setup.md` outside the table and the Task-1 sentence is changed; the table addition introduces no opencode-specific branching or behavior into the generic flow.

### Task 3: Reword `health-monitoring.md` to a tool-agnostic monitor lifecycle and generic context-window note

- **Goal:** Make the health-monitoring file's monitor lifecycle a tool-agnostic outcome whose start/cancel mechanics are deferred to the active tool's convention (so a tool with always-on supervision satisfies them as no-ops), and generalize its context-window note to "each tool's own mechanism," naming no fixed pair of tools — while keeping Claude Code and Pi behavior unchanged.
- **Files to change:** `skills/radical-pipelines/reference/health-monitoring.md`.
- **Changes:**
  1. **Lifecycle-as-outcome.** Reword the launch/cancel-presupposing prose so the file states that a recurring health monitor watches the autonomous run for its full duration, and that the active tool's convention describes how the monitor is provided and, *if applicable*, started and stopped — so a tool whose supervision is always-on satisfies start and cancel as no-ops. Specifically:
     - In `## When to launch`, replace the sentence asserting "The active tool's rules (see `conventions/claude-code.md` or `conventions/pi.md`) provide the exact slash command to start the loop." with wording that defers the start mechanics to the active tool's convention and explicitly allows an always-on-supervision tool to have nothing to start. Do not name a fixed set of convention files.
     - In `## Stopping the monitor`, replace "Use the tool's loop cancellation command (see `conventions/claude-code.md` or `conventions/pi.md`)." with wording that defers cancellation mechanics to the active tool's convention and explicitly allows an always-on-supervision tool to have nothing to cancel. Keep the surrounding "Leftover loops … must be cancelled before launching a new one" guidance true for tools that do have a cancellation command; it resolves as a no-op where there is nothing to cancel.
     - The CC/Pi-specific 5-minute interval / 10-minute no-output-threshold defaults are loop-tuning carried by the CC/Pi conventions; the generic file must no longer assert that a cancellation command always exists. (Keep the no-output-threshold value where it is used to describe the watched signal; the change is to the lifecycle assertions, not to the watched-signal definitions.)
  2. **Context-window note.** Reword the full sentence currently at line 24 — `Context-window limits are not watched here. Both Claude Code and Pi auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it.` — so it names no fixed pair and asserts nothing about opencode: e.g. `Context-window limits are not watched here. They are handled by each tool's own mechanism, not by the monitor.` Replace the entire assertion including the trailing "…so the monitor would only react after the tool has already handled it" clause; do not leave a prefix of the old sentence.
  3. **Loop prompt template framing.** Keep the `## Loop prompt template` section, the four watched signals, the 2-retry recovery table, the escalation payload, and "assisted runs use no monitor" in place. Apply at most a light framing touch so the template reads as "what the monitor checks" rather than presupposing a launched loop on every tool — without removing it or moving it (default placement decision: keep in `health-monitoring.md` per the design's Open Question default).
- **Depends on:** none
- **Traces to:** Spec Req 17 (the health-monitoring file edit), Req 18, Req 19; acceptance "Scope boundary" (reworded health-monitoring file names no fixed tool set; start/cancel deferred to the active tool's convention; other generic monitor-lifecycle files stay literally true unedited); Design Decision 5; Design Components → MODIFIED `health-monitoring.md`.
- **Acceptance:**
  - `health-monitoring.md`'s monitor lifecycle is stated as a tool-agnostic outcome; start and cancel mechanics are deferred to the active tool's convention, and a tool whose supervision is always-on can satisfy start and cancel as no-ops.
  - The file names no fixed set of supported tools for either the monitor lifecycle or the context-window note.
  - The context-window note attributes handling to "each tool's own mechanism" and asserts nothing about opencode's behavior; the full original sentence (including its trailing clause) is replaced.
  - The watched signals, the 2-retry recovery table, the escalation payload, the "assisted runs use no monitor" statement, and the Loop prompt template are all still present.
  - Read on Claude Code or Pi, the file still supports launching and cancelling a `/loop` monitor via their conventions (their behavior is unchanged).

### Task 4: Author the `opencode.md` convention file

- **Goal:** Create the single conditionally-loaded home for all opencode-specific behavior, mirroring `pi.md`'s structure: a fenced canonical `.rp.md`-content block (Worktrees, Branch names, Team spawning, Agent models, Health monitoring) followed by a **Setup actions** section.
- **Files to change:** `skills/radical-pipelines/reference/conventions/opencode.md` (new file).
- **Changes:** Author the file mirroring `pi.md`. Top: a one-line statement that when the active tool is opencode, use the opencode-specific worktree, team, model, and supervision mechanics below. Then a fenced ` ```markdown ` block titled **Canonical `.rp.md` content for opencode** containing these `##` sub-headers:
  - **Worktrees** — create + enter via plain git: `git worktree add -b worktree-<pipeline-slug> <path> <base>`. Because opencode's instance working directory is fixed at process launch and immutable for the session, the worktree-creating session at the main checkout cannot itself become the worktree-rooted lead: after creating the worktree, launch a fresh opencode instance **rooted inside the worktree** (`opencode <path>` for the interactive TUI; `opencode run --dir <path>` for automation) — that instance is the lead/orchestrator and all spawned teammates inherit the worktree as their cwd. Remove at close-out with `git worktree remove <path>`. State plainly that spawned teammates use the worktree as cwd and never the main checkout.
  - **Branch names** — `worktree-<pipeline-slug>`, the branch argument passed to `git worktree add -b`.
  - **Team spawning** — one ensemble team per pipeline. Spawn each agent with `team_spawn({ name, agent, prompt, model, worktree: false })`, with `worktree: false` stated as **unconditional for every agent type** (it is what neutralizes ensemble's per-teammate worktree and squash-merge; ensemble's read-only auto-detection only matches the literal agent strings `plan`/`explore`, which no RP agent satisfies). Include: the no-relay + orchestrator-intervention paragraph (agents address each other directly via `team_message` (direct) / `team_broadcast` (all); the orchestrator only spawns, monitors, and waits, and intervenes only to repair a failed exchange, after which agents resume direct messaging) — mirroring `pi.md`'s equivalent paragraph; the shared-task-board awareness note (`team_tasks_add` / `team_tasks_list` / `team_tasks_complete` / `team_claim`, with `depends_on` for dependencies; the board exists and idle teammates may be nudged to claim from it, but track phase progress in the per-phase artifact subfolders, never on the board) — mirroring the shared-task-list caution in `claude-code.md` (`claude-code.md:33`); the auth-recovery rule (on an auth/login or fast-idle escalation for a spawned agent, run `opencode models`, pick an authenticated `provider/model` **other than the one that just failed**, and re-spawn with that model and `worktree: false`; never run interactive login (`opencode auth login` / `opencode providers login`); this recovery model is distinct from the per-agent **Agent models** config; escalate to the owner if no authenticated alternative is available) — mirroring `pi.md`'s `pi --list-models` recovery paragraph.
  - **Agent models** — provider-qualified `provider/model` strings, read by the orchestrator from `.rp.md`'s Agent-models table and passed as the `model` argument of each `team_spawn` (highest-precedence path in ensemble's model resolution), falling back to the project-wide default when no per-agent value is set.
  - **Health monitoring** — ensemble supervision is always-on for spawned teammates (stalls, message failures, auth/login, network); there is nothing to launch, list, or cancel. Conditions surface to the lead session; the orchestrator reacts within the 2-retry budget defined in `reference/health-monitoring.md` and escalates on the 3rd occurrence. Supervision thresholds live in `.opencode/ensemble.json`. State the accepted observability notes from the design: the lead session's own auth/network failures are not auto-supervised (they surface in the owner's own session); the hard-timeout path aborts/toasts but does not message the lead (the orchestrator covers detection by monitoring completion signals).
  - Close the fenced block, then add a **Setup actions** section (outside the fence, like `pi.md`):
    - **Runtime prerequisite check (first).** Check Node ≥ 24 (for `node:sqlite`) or Bun ≥ 1.0. If unmet, surface the prerequisite to the owner and do **not** declare opencode ready.
    - **Check existing agent installations.** Check whether the required agents are already discoverable by opencode; report which are present and which are missing. If all present, this step is a no-op. Mirror `pi.md`'s present/missing reporting.
    - **Install missing agents** only after confirming the destination with the owner, choosing the destination by the **Artifact storage** convention: `artifacts-in-repo` (and `artifacts-in-fork`) → recommend the committed `.opencode/agent/` (offer `~/.config/opencode/agent/` as a per-user fallback); mirror `pi.md`'s committed-vs-per-user logic and its fork-mode note.
    - **Install the bundled skill tree** to `.opencode/skill/radical-pipelines/` (committed) or `~/.config/opencode/skill/radical-pipelines/` (per-user), matching the agent destination, so an owner whose repo lacks RP's skill tree obtains it.
    - **Write `.opencode/ensemble.json`** to tune ensemble for RP: `mergeOnCleanup: false` and explicit supervision thresholds `stallThresholdMs: 300000` and `timeoutMs: 1800000` (RP's intended thresholds, not ensemble's stock defaults).
    - **Install rule:** list **only** the RP meta-plugin in opencode's plugin configuration, never ensemble alongside it (listing both double-initializes ensemble — two watchdogs, dashboard port collision).
    - **Verify discovery.** After install, direct the owner to verify the agents are discoverable by opencode before proceeding.
- **Depends on:** none (the file is referenced by Task 2's table row; Task 2 and Task 4 may land in either order, but both must land for selection to resolve)
- **Traces to:** Spec Req 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 19; acceptance "Named agents and collaboration," "One worktree, one branch," "Health monitoring," "Per-agent model selection," "Setup actions," "Installation and packaging" (skill obtainable; RP-tuned config); Design Approach steps 2–6, Decisions 2, 3, 4, 5, 7; Design Components → NEW `opencode.md`.
- **Acceptance:**
  - `opencode.md` exists and mirrors `pi.md`'s shape: a one-line intro, a fenced canonical `.rp.md`-content block with `##` Worktrees / Branch names / Team spawning / Agent models / Health monitoring sub-headers, and a **Setup actions** section.
  - Worktrees specifies plain `git worktree add -b worktree-<slug> <path> <base>`, the launch-rooted-in-worktree hand-off (`opencode <path>` TUI / `opencode run --dir <path>` automation), and `git worktree remove <path>` removal; it directs teammates to use the worktree as cwd.
  - Branch names specifies `worktree-<pipeline-slug>`.
  - Team spawning specifies `team_spawn` with `worktree: false` unconditional for every agent type; describes peer-to-peer messaging (`team_message`/`team_broadcast`) with orchestrator intervention only for repair; notes the shared task board (`team_tasks_*`/`team_claim`) with the "track progress in artifact subfolders, not the board" caution; and gives the auth-recovery rule (`opencode models`, pick a different authenticated `provider/model`, re-spawn with `worktree: false`, never interactive login, escalate if none).
  - Agent models specifies provider-qualified `provider/model` passed per `team_spawn` from `.rp.md`, with project-wide-default fallback.
  - Health monitoring states always-on ensemble supervision with nothing to launch/list/cancel, the 2-retry budget and 3rd-occurrence escalation via `reference/health-monitoring.md`, thresholds in `.opencode/ensemble.json`, and the two accepted observability notes (lead-session failures not auto-supervised; hard-timeout does not message the lead).
  - Setup actions: checks the Node ≥ 24 / Bun prerequisite first and blocks declaring opencode ready if unmet; reports present-vs-missing agents; installs missing agents only after destination confirmation, keyed to artifact-storage mode (committed `.opencode/agent/` vs. per-user `~/.config/opencode/agent/`); installs the bundled skill tree to the matching destination; writes `.opencode/ensemble.json` with `mergeOnCleanup: false`, `stallThresholdMs: 300000`, `timeoutMs: 1800000`; states "list only the meta-plugin, never ensemble alongside"; and directs the owner to verify discovery before proceeding.
  - The file contains no instruction that would create a per-agent worktree or squash-merge the branch.

### Task 5: Create the opencode packaging sub-package manifest and meta-plugin entry

- **Goal:** Add the opencode analog of Pi's packaging block as a non-private, publishable workspace sub-package whose plugin entry re-exports ensemble as a meta-plugin (the single team-layer entry), depending on a pinned ensemble plus its shared deps and declaring the Node/Bun runtime prerequisite.
- **Files to change:**
  - New sub-package directory (use `packages/opencode/` — a code-phase path choice consistent with the design's "exact sub-package path is an implementation detail"): `packages/opencode/package.json` (new), the meta-plugin entry source file (new, e.g. `packages/opencode/src/plugin.ts` or the package's declared entry), and any minimal package-internal files the entry needs.
  - This task touches only files under `packages/opencode/`. It does not edit the root `package.json` — all root/workspace wiring (the `workspaces` field, keeping `private: true`) is owned solely by Task 7.
- **Changes:**
  - Author `packages/opencode/package.json` as a non-private (publishable) manifest: a distinct package `name` (e.g. `@automattic/radical-pipelines-opencode`), `version` initialized to the current root version (`0.3.0`) so the version-sync in Task 7 keeps it in lockstep, `type: "module"`, `engines: { "node": ">=24", "bun": ">=1.0" }`, dependencies on `@hueyexe/opencode-ensemble` **pinned to an exact version** (no `^`/`~`, per opencode's plugin-cache bug), `@opencode-ai/plugin`, and `@opencode-ai/sdk`, and a `files` list / build step that bundles the shared root `agents/` and skill tree into the published tarball (see Task 6).
  - Author the **meta-plugin entry**: it imports ensemble, calls it once with the plugin input, and merges its hooks with RP additions — `const h = await ensemble(input); return { ...h, ...RP }` — exporting that as the plugin. This is the single `plugin:[]` entry the owner lists; it must not also cause ensemble to be listed separately. Keep RP additions minimal (the design specifies only the re-export and hook merge; no extra behavior is in scope).
  - When verifying the spawn/messaging tool names the convention references, confirm the registered ensemble tool ids against ensemble's source at the pinned version (the design flags `team_spawn`/`team_message`/`team_broadcast`/`team_tasks_*`/`team_claim` as verified @ HEAD but to be re-confirmed at implementation). This task only needs the meta-plugin to re-export ensemble's hooks unchanged, so the names are consumed by `opencode.md`, not hard-coded here.
- **Depends on:** none (this task authors only the sub-package's own files under `packages/opencode/`; Task 7 then adds the root `workspaces` wiring that makes the sub-package resolve, depending on this task).
- **Traces to:** Spec Req 11, 12, 13, 14; acceptance "Installation and packaging" (agents + skill + team layer available; RP-tuned config; prerequisite surfaced); Design Decision 6; Design Components → NEW packaging artifact; Design Dependencies.
- **Acceptance:**
  - `packages/opencode/package.json` exists, is non-private (publishable), declares `engines: { node: ">=24", bun: ">=1.0" }`, and depends on a **pinned** `@hueyexe/opencode-ensemble` plus `@opencode-ai/plugin` and `@opencode-ai/sdk`.
  - The sub-package's `version` equals the root `package.json` version.
  - The meta-plugin entry imports ensemble, initializes it once, and exports the merge of ensemble's hooks with RP additions, such that listing only this meta-plugin delivers the team layer (one watchdog, one dashboard — no double-init).
  - This task changes no file outside `packages/opencode/`; the root `package.json` is untouched here (root/workspace wiring is Task 7's).

### Task 6: Bundle the shared agents and skill tree into the opencode sub-package with converted agent frontmatter

- **Goal:** Deliver RP's 17 agents (with opencode-converted frontmatter and byte-identical bodies) and the skill tree from the shared root `agents/` + `skills/` into the published sub-package, so the Setup action's file-based install has the files to copy.
- **Files to change:**
  - The sub-package build/bundle mechanism declared in `packages/opencode/package.json` (e.g. a build script under `packages/opencode/` and/or its `files` field) that sources from the repo-root `agents/` and `skills/`.
  - No edits to the source `agents/*.md` bodies or `skills/` content — they are reused verbatim; only the **frontmatter** of each agent is converted at packaging/build time into the published copy.
- **Changes:**
  - Provide a build/packaging step that, for each of the 17 `agents/<name>.md`, emits a published `<name>.md` whose frontmatter is converted for opencode — `description` carried verbatim, optional `mode: subagent`, and **dropped** `name` (filename is identity), no `model:`, and no `permission:` — with the agent **body byte-identical** to the source. (Per-agent model is supplied at spawn time from `.rp.md`, not baked into the file; permissions are intentionally omitted.)
  - Bundle the skill tree (the contents under `skills/`) into the published tarball so the Setup action can install `.opencode/skill/radical-pipelines/` (or the per-user path).
  - Keep the shared source as the single edit point — the build copies/transforms; it does not fork the agent or skill content.
- **Depends on:** Task 5
- **Traces to:** Spec Req 3, 11; acceptance "Named agents and collaboration" (each spawned agent runs its own RP definition), "Installation and packaging" (skill obtainable through install); Design Approach step 4, Decision 3; Design Components → NEW packaging artifact (converted agents + bundled skill).
- **Acceptance:**
  - Building/packing the sub-package produces 17 agent `.md` files whose frontmatter is the converted form (`description` verbatim, optional `mode: subagent`; no `name`, no `model:`, no `permission:`) and whose bodies are byte-identical to the corresponding `agents/<name>.md` source.
  - The published sub-package includes the RP skill tree so the Setup action can install it for an owner whose repo lacks it.
  - The source `agents/*.md` and `skills/` files are unchanged (no body edits, no source frontmatter edits).

### Task 7: Make the repo a workspace root and keep the sub-package version in lockstep

- **Goal:** Turn the flat repo into a workspace root that contains the new sub-package, and extend the version-sync and changeset tooling so the sub-package's version stays in lockstep with the root without becoming an independent changeset target. This task is the sole owner of every root `package.json` change (the `workspaces` field and keeping `private: true`); Task 5 touches no root file.
- **Files to change:**
  - `package.json` (root) — add the `workspaces` declaration covering the sub-package (e.g. `"workspaces": ["packages/*"]`); keep `private: true`.
  - `scripts/sync-version.mjs` — extend `TARGET_MANIFESTS`.
  - `.changeset/config.json` — extend `changedFilePatterns`.
- **Changes:**
  - Root `package.json`: add `workspaces` including the new sub-package path so the sub-package resolves as a workspace member. Do not remove `private: true` (only the sub-package publishes). Do not add opencode runtime deps to the root (its peer-deps are Pi's; opencode deps live only in the sub-package, per the design's dep-isolation property).
  - `scripts/sync-version.mjs`: add the new sub-package manifest path (`packages/opencode/package.json`) to the `TARGET_MANIFESTS` array, so `release:version` copies the root version into it (idempotent outward-only flow, as the script already does for `.claude-plugin/plugin.json`). This is what keeps the sub-package in lockstep and means changesets never need to name the sub-package — the existing single-package changeset validator (`scripts/validate-changesets.mjs`, which enforces the single name `@automattic/radical-pipelines`) needs no edit.
  - `.changeset/config.json`: extend `changedFilePatterns` to cover the new sub-package manifest/source (e.g. add `packages/**`) so changes there are recognized by the changeset tooling, consistent with how `skills/**`, `agents/**`, and `.claude-plugin/**` are already covered.
- **Depends on:** Task 5 (the sub-package and its manifest must exist to be targeted)
- **Traces to:** Spec Req 12 (delivered via a packaging artifact; generic skill gains no opencode awareness); Design Components → MODIFIED build/release tooling; Design Dependencies (workspace root; sync-version + changeset config extended); Design Risks/Open Questions (workspace tooling, version lockstep).
- **Acceptance:**
  - The root `package.json` declares a `workspaces` field that includes the opencode sub-package and remains `private: true`.
  - `scripts/sync-version.mjs`'s `TARGET_MANIFESTS` includes the sub-package manifest path, so running the version-sync writes the root version into the sub-package manifest and a second run is a no-op.
  - `.changeset/config.json`'s `changedFilePatterns` covers the new sub-package path.
  - No opencode runtime dependency is added to the root `package.json`; opencode deps remain confined to the sub-package.
  - The changeset validator continues to enforce the single package name with no edit (the sub-package is version-synced, not changeset-targeted).
