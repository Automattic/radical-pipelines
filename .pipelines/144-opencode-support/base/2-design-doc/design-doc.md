# Design Doc: opencode support (via opencode-ensemble)

## Overview

Radical Pipelines (RP) runs on two agentic coding tools today — Claude Code and Pi — using a fixed per-tool pattern: a conditionally-loaded convention file (`reference/conventions/<tool>.md`) plus a packaging artifact, while the generic skill stays tool-agnostic. This design adds **opencode** as a third supported tool at parity with the other two: an owner whose active tool is opencode can install RP, select opencode at setup, and run pipelines end-to-end through every phase (Intent → Spec → Design doc → Plan → Code → Docs) in both the autonomous and assisted workflows, producing the same set of inspectable artifacts (same filenames, same per-phase folder layout) as on Claude Code and Pi.

The team-coordination layer is the third-party `@hueyexe/opencode-ensemble` plugin, used strictly as a coordination layer — it supplies spawn-by-name, peer-to-peer messaging, a shared task board with dependencies, per-agent model selection, and always-on supervision. ensemble's native per-teammate-worktree + squash-merge behavior is structurally neutralized so RP's one-worktree/one-branch-per-pipeline model is preserved.

The change is deliberately minimal and follows the established pattern exactly:

- **One new conditionally-loaded convention file** — `reference/conventions/opencode.md` (mirrors `pi.md`).
- **One new packaging artifact** — a publishable workspace sub-package that re-exports ensemble as a meta-plugin and delivers RP's converted agents and skill tree.
- **Exactly two minimal, behavior-preserving edits to generic skill files** — `setup.md` (two edit sites in the one file: a new supported-tools-list row, and the context-window note in its Health-monitoring convention description reworded to "each tool's own mechanism") and `health-monitoring.md` (lifecycle and context-window wording made tool-agnostic).

Every other generic skill file stays literally true on opencode with no edit, because opencode's always-on supervision satisfies the generic monitor-lifecycle instructions as no-ops ("start" = nothing to start, "cancel" = nothing to cancel), and because the only two generic context-window assertions (one per edited file) are reworded to attribute handling to each tool's own mechanism rather than asserting opencode auto-compacts (which the spec marks unverified and not-relied-on). Claude Code and Pi behavior is unchanged.

This is a documentation-and-packaging design: the skill is prose, and RP's agent bodies are reusable verbatim. The only executable code is the meta-plugin entry that re-exports ensemble; everything else is convention text, a converted-frontmatter install, and build/release tooling.

## Approach

Reach parity by reasoning entirely by precedent. Each new piece is a direct analog of an existing, working Claude Code / Pi mechanism:

1. **Register opencode as a selectable tool.** Add one row (`| opencode | opencode.md |`) to the Step-1 supported-tools table in `setup.md`, and reword the context-window clause in `setup.md`'s Health-monitoring convention description (the second edit site in this same file — see Components). Setup's Step 3 ("consult the active tool's rules for a Setup actions section") is already generic and auto-discovers opencode.md's Setup actions, so no further `setup.md` edit is needed.

2. **Author `opencode.md`** following `pi.md`'s structure: a fenced canonical `.rp.md`-content block (Worktrees, Branch names, Team spawning, Agent models, Health monitoring) plus a Setup actions section. This file is the single home for all opencode-specific behavior.

3. **Preserve one worktree / one branch.** opencode's instance working directory is fixed at process launch and immutable for the session's life — there is no in-session re-root and no per-spawn directory override reachable through ensemble. So the orchestrator creates the worktree with plain `git worktree add -b worktree-<slug> <path> <base>`, then launches the opencode instance **rooted inside the worktree** (`opencode <path>` for the TUI, `opencode run --dir <path>` for automation). That instance is the lead/orchestrator; it spawns every teammate `worktree: false`, so every teammate inherits the worktree as its cwd. Cleanup is `git worktree remove <path>`. `worktree: false` is unconditional on every spawn — it is what neutralizes ensemble's per-teammate worktree and squash-merge.

4. **Register RP's agents with full fidelity.** opencode resolves a spawned agent by pure on-disk name lookup (filename → name, frontmatter → config, body → system prompt), with no mode filtering. RP's 17 agent bodies are already tool-agnostic prose (no hard-coded tool names). So each agent installs to opencode's agent directory as `<name>.md` with converted frontmatter (`description` verbatim, optional `mode: subagent`, no `name`, no `model:`, no `permission:`) and a **byte-identical body**.

5. **Per-agent model via the spawn arg.** The orchestrator reads `.rp.md`'s Agent-models table and passes the provider-qualified `provider/model` string as `team_spawn({ model })`. `.rp.md` stays the single source of truth, exactly as on the other tools, and the explicit spawn arg is the highest-precedence path in ensemble's model resolution.

6. **Always-on supervision replaces the launched monitor.** ensemble continuously supervises spawned teammates (stalls, message failures, auth/login, network) and surfaces conditions to the lead session. The orchestrator reacts within the same **2-retry budget** RP uses on the other tools and escalates on the 3rd occurrence. There is no recurring orchestrator action — nothing to launch, list, or cancel. The `health-monitoring.md` edits reword the launch/cancel-presupposing prose into a tool-agnostic outcome and generalize its context-window note, so the four other generic monitor-lifecycle sentences remain literally true as no-ops. The matching context-window clause in `setup.md`'s Health-monitoring convention description is generalized the same way — the second of the two authorized edits' two edit sites in `setup.md` — so no generic file is left asserting opencode auto-compacts.

7. **Package as a publishable meta-plugin.** A non-private workspace sub-package depends on ensemble (pinned), `@opencode-ai/plugin`, and `@opencode-ai/sdk`, declares `engines: { node: ">=24", bun: ">=1.0" }`, and its plugin entry imports ensemble and merges its hooks (`const h = await ensemble(input); return { ...h, ...RP }`). The owner lists **only** this meta-plugin (never ensemble alongside it, which would double-init). Agents and the skill tree are delivered file-based via the Setup action, with destinations keyed to the artifact-storage mode, exactly as Pi does. RP writes `.opencode/ensemble.json` at setup to tune ensemble (`mergeOnCleanup: false`, explicit thresholds).

## Components

### NEW — `skills/radical-pipelines/reference/conventions/opencode.md`

The conditionally-loaded opencode convention file, mirroring `pi.md`. Contains a fenced **canonical `.rp.md` content for opencode** block with these `##` sub-headers, followed by a **Setup actions** section:

- **Worktrees** — create + enter = `git worktree add -b worktree-<slug> <path> <base>`, then launch the opencode instance rooted in the worktree (`opencode <path>` TUI / `opencode run --dir <path>` automation); the orchestrator runs from that worktree-rooted instance; remove = `git worktree remove <path>` at close-out. Makes the re-launch hand-off explicit (the worktree-creating session at the main checkout cannot itself become the worktree-rooted lead).
- **Branch names** — `worktree-<pipeline-slug>` (the branch arg to `git worktree add -b`).
- **Team spawning** — one ensemble team per pipeline; spawn each agent `team_spawn({ name, agent, prompt, model, worktree: false })` with `worktree: false` **unconditional for every agent type**; the no-relay + orchestrator-intervention paragraph (peer-to-peer via `team_message`/`team_broadcast`, orchestrator repairs only); the shared-task-board awareness note (`team_tasks_*`/`team_claim`); the auth-recovery rule (on an auth/login or fast-idle escalation, run `opencode models`, pick an authenticated `provider/model` other than the failed one, re-spawn with that model and `worktree: false`; never interactive login; escalate if none).
- **Agent models** — provider-qualified `provider/model`, passed per `team_spawn` from `.rp.md`.
- **Health monitoring** — always-on ensemble supervision; nothing to launch, list, or cancel; thresholds live in `.opencode/ensemble.json`.
- **Setup actions** — Node ≥ 24 / Bun prerequisite check that blocks declaring opencode ready if unmet; check-existing-agents-then-install keyed to artifact-storage mode (`.opencode/agent/` committed vs. `~/.config/opencode/agent/` per-user); bundled-skill install (`.opencode/skill/radical-pipelines/` vs. `~/.config/opencode/skill/radical-pipelines/`); write `.opencode/ensemble.json`; direct the owner to verify agent discovery before proceeding.

### NEW — the opencode packaging artifact (workspace sub-package)

A non-private, publishable workspace sub-package in this repo (the opencode analog of Pi's `pi` block in the root `package.json`). Comprises:

- Its own `package.json` — deps `@hueyexe/opencode-ensemble` (pinned), `@opencode-ai/plugin`, `@opencode-ai/sdk`; `engines: { node: ">=24", bun: ">=1.0" }`; a `files`/build step that bundles the shared root `agents/` + skill into the published tarball.
- The **meta-plugin entry** — imports ensemble, calls it once, and merges its hooks with RP additions; the single `plugin:[]` entry that delivers the team layer.
- The **converted agent `.md` files** and the **bundled skill tree**, sourced from the shared root `agents/` + `skills/` (frontmatter converted at packaging/build time; bodies unchanged).

### MODIFIED (generic — the two authorized edits)

Exactly two generic files are edited. `setup.md` carries **two edit sites** but is still one of the two files; `health-monitoring.md` carries two rewordings. Both files stay tool-agnostic and name no fixed set of tools.

- **`reference/conventions/setup.md`** (one file, two edit sites):
  1. **Supported-tools row.** One new row in the Step-1 supported-tools table: `| opencode | opencode.md |`.
  2. **Context-window clause.** In the Step-1 **Health monitoring (required)** convention description (`setup.md:102`), reword "Context-window limits are handled by **each tool's own auto-compaction**, not by the monitor." → "Context-window limits are handled by each tool's own mechanism, not by the monitor." This sentence universally quantifies over every supported tool, so once opencode is a supported tool the original wording asserts opencode handles context-window limits *by auto-compaction* — precisely the behavior the spec puts Out of Scope as "unverified … and not relied on" (spec:59). It is the same authorized context-window rewording as the `health-monitoring.md` one below — applied at the second place a generic file makes this assertion — so it stays within Req 17's "exactly two existing generic files" rather than introducing a third file. This is the reviewer-blocking counterexample to "every other generic file stays literally true unedited," now resolved by folding it into the authorized edit.
- **`reference/health-monitoring.md`** — two rewordings:
  1. **Lifecycle-as-outcome.** Replace the launch/cancel-presupposing prose (`## When to launch`'s "the active tool's rules provide the exact slash command to start the loop"; `## Stopping the monitor`'s "Use the tool's loop cancellation command") with: a recurring health monitor watches the autonomous run for its full duration; the active tool's convention describes how the monitor is provided and, *if applicable*, started and stopped — so a tool whose supervision is always-on satisfies start/cancel as no-ops. The CC/Pi-specific interval/threshold defaults (5-min / 10-min) are loop-tuning that the CC/Pi conventions carry; the generic file no longer asserts a cancellation command always exists.
  2. **Context-window note.** Reword the whole sentence at `health-monitoring.md:24` — "Both Claude Code and Pi auto-compact agent context near the limit, so the monitor would only react after the tool has already handled it." → "Context-window limits are handled by each tool's own mechanism, not by the monitor." — naming no fixed pair and asserting nothing about opencode's behavior. (The replacement edits the full sentence including the trailing "…so the monitor would only react after the tool has already handled it" clause, not a prefix of it.)

  The content sections (the 4 watched signals, the 2-retry recovery table, the escalation payload, "assisted runs use no monitor") and the Loop prompt template stay in place. The template is the monitor's *content*, already generic; CC/Pi keep referencing it from their `/loop` command, and on opencode the orchestrator simply never launches a loop, so it is unused (the no-op the spec relies on). It needs at most a framing touch so it reads as "what the monitor checks" rather than "the loop's prompt."

### MODIFIED (build/release tooling — not generic skill)

- Root `package.json` becomes a workspace root (stays `private: true`; only the sub-package publishes).
- `scripts/sync-version.mjs` `TARGET_MANIFESTS` and `.changeset/config.json` `changedFilePatterns` extended to cover the new sub-package manifest so its version stays in lockstep with the root.

These edits do not touch `skills/` content, so they do not breach the "exactly two generic files" boundary; they are the mechanical cost of adding a publishable sub-package.

### UNTOUCHED-but-relevant

- The 17 `agents/*.md` bodies (reused verbatim; only frontmatter converted at packaging/build time — source files unchanged).
- `conventions/claude-code.md` and `conventions/pi.md` (no edit under the scope-minimal template decision).
- Every other generic skill file (i.e. all except the two edited files, with `setup.md`'s context-window clause now counted among the authorized edits above, not here), including the four that reference the monitor lifecycle: `autonomous-workflow.md` (run-start "Start a recurring health monitor" / close-out "stop the health monitor"), `resume-pipeline.md` ("Cancel any health-monitor loop still registered"), `review-pipeline.md` ("cancel any leftover monitor, launch a fresh one"), and `load.md` (the conventions-table "launch and cancel" row). Each defers its mechanics to the Health monitoring convention, which on opencode answers "always-on; nothing to launch, list, or cancel" — so each resolves as a no-op and stays literally true unedited. No other generic file makes a context-window assertion: the only two such assertions live in the two edited files, both reworded above.

## Interfaces and Data Flow

These are the public interfaces the design depends on. All belong to ensemble's tool surface and opencode's CLI; the generic skill references them only through `opencode.md`.

- **Spawn (orchestrator → teammate):** `team_spawn({ name, agent, prompt, model: "<provider/model>", worktree: false })`. `agent` is the RP agent filename, resolving to the registered `.opencode/agent/<name>.md` persona by pure name lookup; `model` comes from `.rp.md`'s Agent-models table; `worktree: false` is always passed.

- **Peer-to-peer messaging (Req 4):** spawned agents address each other directly via `team_message` (direct) / `team_broadcast` (all). An agent body's tool-agnostic "send a message to the orchestrator" maps to a `team_message` to the lead. The orchestrator only spawns, monitors, and waits; it intervenes only to repair a failed exchange, after which agents resume direct messaging.

- **Shared task board:** `team_tasks_add` / `team_tasks_list` / `team_tasks_complete` / `team_claim` (with `depends_on` for dependencies). The board exists and idle teammates may be nudged to claim from it, but RP tracks phase progress in the per-phase artifact subfolders, **not** on the board — the same caution the other conventions carry.

- **Supervision → orchestrator:** ensemble surfaces stalls, message failures, auth (`session.error` + fast-idle < 15 s), and network conditions to the lead session as persisted system `team_message`s (plus TUI toast and the dashboard at :4747). The orchestrator reacts; there is no recurring orchestrator action.

- **Auth-model enumeration:** `opencode models` prints the authenticated `provider/model` strings (auth/env-gated — only usable providers appear), the direct analog of Pi's `pi --list-models`. Interactive login (`opencode auth login` / `opencode providers login`) is the thing recovery must **not** run.

- **Artifact data flow (Req 1 — the central acceptance oracle):** unchanged from CC/Pi. Each phase agent reads/writes the same per-phase artifact files in the same subfolder structure (`0-intent/intent.md`, `1-spec/spec.md`, `2-design-doc/design-doc.md`, `3-plan/code-plan.md`, `5-docs/doc-plan.md`, …) in the single shared worktree. Only tool-native value formats inside artifacts differ (provider-qualified models, opencode install destinations).

**Tool-name forms.** The underscore tool-name forms used above (`team_spawn`, `team_message` / `team_broadcast`, `team_tasks_add` / `team_tasks_list` / `team_tasks_complete` / `team_claim`) match the ensemble tool files verified at HEAD (`src/tools/team-spawn.ts`, `team-message.ts`, `team-broadcast.ts`, `team-tasks-{add,list,complete}.ts`, `team-claim.ts`). Because the orchestrator invokes them by name, the exact registered tool ids (the underscore form opencode exposes) must be confirmed against ensemble's registered tool ids at implementation time.

## Key Decisions

### Decision 1 — Follow the existing per-tool pattern: one convention file + one packaging artifact + two generic edits

- **Choice:** Add opencode exactly as Claude Code and Pi are added — a conditionally-loaded `opencode.md`, a packaging artifact, and the two minimal generic edits the spec authorizes — keeping the generic skill tool-agnostic and every other generic file unedited.
- **Alternatives:** Make the generic skill aware of opencode (branch on tool); build a bespoke recurring health-monitor loop for opencode.
- **Trade-offs:** The pattern-following choice is the smallest design that reaches parity while honoring the spec's hard scope boundary and the project's anti-tool-coupling rule. Tool-aware branching and a bespoke loop both add generic-skill coupling the spec forbids and the latter has no opencode primitive to build on.
- **Traces to:** Requirements 1–4, 11, 12, 17–19; acceptance "Scope boundary."

### Decision 2 — One worktree / one branch via a fresh instance rooted in the worktree, all teammates `worktree: false`

- **Choice:** Create the worktree with plain `git worktree add -b worktree-<slug> <path> <base>`, launch the opencode instance rooted in that worktree to act as orchestrator, and spawn every teammate `worktree: false` so all share the worktree cwd; remove with `git worktree remove <path>`.
- **Alternatives:** (a) Re-root the current instance mid-session — no chdir/re-root primitive exists in source. (b) Per-spawn directory override — unsupported through ensemble or public `session.create`; the only per-directory mechanism (`x-opencode-directory` header) is unreachable without forking ensemble and would split state across two instances, degrading ensemble's supervision (which skips non-main/worktree instances).
- **Trade-offs:** Option chosen is the only source-supported path and keeps ensemble's supervision, recovery, and dashboard intact. Its one cost is an extra launch step (the worktree-creating session cannot itself become the lead) — idiomatic with CC's `EnterWorktree` and Pi's worktree-enter step. `worktree: false` is load-bearing on **every** spawn: ensemble's read-only auto-detection is a literal `plan`/`explore` name match that no RP agent satisfies, so omitting it on any single spawn silently arms a per-agent worktree + squash-merge.
- **Traces to:** Requirements 5, 6; acceptance "One worktree, one branch."

### Decision 3 — Register agents by name-lookup with converted frontmatter and verbatim bodies

- **Choice:** Install each agent to opencode's agent dir as `<name>.md` with frontmatter = `description` (verbatim) + optional `mode: subagent`; drop `name` (filename is identity); no `model:`; no `permission:`; body byte-identical.
- **Alternatives:** Bake `model:` into each converted file (splits the source of truth, forces tool-specific file variants, diverges from CC/Pi); add per-agent `permission` locks (new behavior no other tool imposes, risks blocking the commits reviewers/researchers/analysts legitimately make).
- **Trade-offs:** Full fidelity is achieved with zero body changes because opencode loads the Markdown body as the system prompt and resolves the name without mode filtering, and the bodies are already tool-agnostic prose. Omitting `permission` keeps the one-worktree + prose-role model as the existing safety boundary (the same one every tool relies on) rather than introducing a lock that could block `git commit`.
- **Traces to:** Requirement 3; acceptance "Named agents and collaboration," "Setup actions."

### Decision 4 — Per-agent model passed as the `team_spawn` arg from `.rp.md`

- **Choice:** The orchestrator reads `.rp.md`'s Agent-models table and passes the provider-qualified `provider/model` as `team_spawn({ model })`, falling back to the project-wide default when no per-agent value is set.
- **Alternatives:** Bake the model into the agent file (Decision 3); use ensemble's `config.modelsByAgent` in `.opencode/ensemble.json` (a second competing config surface, not needed for parity).
- **Trade-offs:** The chosen path keeps the orchestrator the single reader of `.rp.md`, keeps agent files model-free (so they stay shared source with CC), and is the highest-precedence path in ensemble's model resolution (explicit arg wins). The alternatives fragment the source of truth.
- **Traces to:** Requirement 10; acceptance "Per-agent model selection."

### Decision 5 — Always-on supervision; the two authorized health-monitoring edits; model-swap auth recovery

- **Choice:** Treat ensemble's always-on supervision as the monitor — nothing to launch/list/cancel. Reword `health-monitoring.md` (a) into a tool-agnostic lifecycle outcome that defers start/cancel mechanics to the active tool's convention (so always-on satisfies them as no-ops), and (b) so its context-window note attributes handling to "each tool's own mechanism." The **same** context-window generalization is also applied to the matching clause in `setup.md`'s Health-monitoring convention description (`setup.md:102`) — it is the second edit site of the `setup.md` edit, not a third file, and is needed because that clause likewise universally quantifies over every supported tool and would otherwise assert opencode auto-compacts (spec Out-of-Scope, spec:59). On an auth/login or fast-idle escalation for a spawned agent, the orchestrator runs `opencode models`, picks an authenticated `provider/model` other than the failed one, and re-spawns `team_spawn({ agent, model, worktree: false })` — never interactive login, distinct from the agent's configured model; escalate if no authenticated alternative.
- **Alternatives:** Build a bespoke `/loop`-style monitor for opencode (no loop primitive; rejected, out of scope); recover via interactive `opencode auth login` (the spec forbids it); relocate the Loop prompt template (and interval/threshold defaults) into a shared file referenced by cc.md+pi.md (structurally cleaner against the anti-duplication rule, but edits the tool conventions — recorded as an open question, default keep-in-place to honor "exactly two generic edits").
- **Trade-offs:** The chosen wording keeps all four other generic monitor-lifecycle sentences literally true as no-ops and leaves CC/Pi behavior unchanged (their sentences still resolve to launching/cancelling a `/loop` monitor). The 2-retry budget is the orchestrator's, applied reactively to ensemble's escalations — identical count and contract to the other tools. ensemble supplies agent name + verbatim error + suggested step but not "last-known progress," so the orchestrator derives that from the artifact folder / last commit / last message when assembling the full escalation payload. Two observability gaps are accepted by design: the hard-timeout (`timeoutMs`) path aborts and toasts but does **not** message the lead (covered by the orchestrator monitoring completion signals); and the lead session's own auth/network failures are not auto-supervised (they surface in the owner's own session — the spec's acceptance note).
- **Traces to:** Requirements 7, 8, 9, 17, 18; acceptance "Health monitoring," "Scope boundary."

### Decision 6 — Package as a publishable workspace sub-package re-exporting ensemble as a meta-plugin

- **Choice:** A non-private workspace sub-package in this repo (publishable, `engines: { node: ">=24", bun: ">=1.0" }`, deps = pinned ensemble + `@opencode-ai/plugin` + `@opencode-ai/sdk`), referencing the shared root `agents/` + skill. Its plugin entry re-exports ensemble (`const h = await ensemble(input); return { ...h, ...RP }`) as the single `plugin:[]` entry; agents and skill are delivered file-based via the Setup action; RP writes `.opencode/ensemble.json` with `mergeOnCleanup: false` and explicit `stallThresholdMs: 300000` + `timeoutMs: 1800000`; runtime prerequisite enforced by both the `engines` gate and a setup-time Node/Bun check.
- **Alternatives:** A root-package key like the Pi block (impossible — the root is `private: true` and carries Pi peer-deps that collide with opencode's deps; a plugin must be publishable); a fully separate sibling repo (breaks shared source — agent/skill edits would not flow without a sync step — and diverges from the in-repo multi-artifact pattern).
- **Trade-offs:** The sub-package isolates the disjoint Pi/opencode dep sets structurally, is publishable, and preserves single-edit-point shared source — exactly how the Pi block + CC manifest already share `skills/` + `agents/`. Cost: it introduces a workspace where the repo is currently flat (and requires the sync-version / changeset tooling edits). The **double-init hazard** is the key constraint: listing ensemble in `plugin:[]` alongside the meta-plugin inits it twice (two watchdogs + dashboard EADDRINUSE on 4747), so the install rule is "list ONLY the meta-plugin, never ensemble alongside," verified by a one-watchdog/one-dashboard smoke test. The file-based agent/skill install is the verified path (config-hook injection is unverified and not relied on), mirrors Pi, and is needed anyway for the Req 15/16 Setup flow.
- **Traces to:** Requirements 11, 12, 13, 14; acceptance "Installation and packaging."

### Decision 7 — Setup actions mirror Pi: discover → install (destination by storage mode) → verify

- **Choice:** In opencode.md's Setup actions, check whether RP's agents are already discoverable, report present vs. missing, and install missing ones only after confirming the destination — chosen by the artifact-storage mode (`.opencode/agent/` committed for `artifacts-in-repo`/fork vs. `~/.config/opencode/agent/` per-user), exactly as Pi chooses `.pi/agents/` vs. `~/.pi/agent/agents/`. After install, direct the owner to verify discovery before proceeding. The Node ≥ 24 / Bun prerequisite is checked first and blocks declaring opencode ready if unmet.
- **Alternatives:** Inject agents/skill via a config hook (unverified; result ignored by opencode); a single fixed install location (ignores the committed-vs-per-user distinction the storage mode encodes).
- **Trade-offs:** Mirroring Pi's flow reuses a proven, owner-confirmed pattern and slots into setup.md's already-generic Step 3 with no extra setup.md edit. The bundled-skill copy satisfies Req 11 for an owner whose repo lacks RP's skill tree.
- **Traces to:** Requirements 13, 15, 16; acceptance "Setup actions," and the Req-11 "skill obtainable even if repo lacks it" criterion.

## Dependencies

New external dependencies, all confined to the new opencode sub-package — the generic skill and the CC/Pi artifacts gain none:

- `@hueyexe/opencode-ensemble` — the team-coordination layer. **Pinned version** (opencode has a known bug caching unpinned plugins; ensemble's README recommends pinning).
- `@opencode-ai/plugin`, `@opencode-ai/sdk` — ensemble's transitive deps, shared by the meta-plugin.
- Runtime: **Node ≥ 24** (for `node:sqlite`) **or Bun ≥ 1.0**. Enforced by the package `engines` and a setup-time check.

opencode itself (the host tool) and its CLI surface — `git worktree`, `opencode models`, `opencode <path>` / `opencode run --dir` — are runtime dependencies of the convention, not npm deps.

Build/release tooling dependency: the repo becomes an npm/pnpm workspace root (tool choice is an implementation detail; the dep-isolation property holds either way), with `sync-version.mjs` and the changeset config extended to cover the sub-package manifest.

## Failure Modes and Observability

| Failure mode | How it surfaces | How the design handles it |
| --- | --- | --- |
| Spawned-agent **stall** / **message failure** / **network** | ensemble always-on supervision → persisted system `team_message` to lead (+ TUI toast + dashboard :4747) | Orchestrator reacts within the 2-retry budget; escalates on the 3rd occurrence with the full payload. |
| Spawned-agent **auth/login failure** | ensemble `session.error` + fast-idle < 15 s → lead message | Re-spawn on a different authenticated `provider/model` via `opencode models`; never interactive login; escalate if no alternative. |
| **Hard timeout** (`timeoutMs`) | ensemble aborts the session and toasts but does **NOT** message the lead (known gap); visible via member status / dashboard | Orchestrator's monitoring of completion signals + last-known progress covers detection. Flagged so the implementer does not assume a lead message on this path. |
| **Orchestrator (lead) auth/network failure** | Surfaces in the owner's own session (which the owner watches) — NOT auto-supervised by the team layer | Honored by design intent (spec acceptance note); the design does not attempt to supervise the lead. |
| **ensemble double-init** | Two watchdog intervals + dashboard EADDRINUSE on :4747 | Prevented by the "list ONLY the meta-plugin, never ensemble alongside" install rule + a one-watchdog/one-dashboard smoke test. |
| **Runtime prerequisite unmet** (Node < 24, no Bun) | ensemble fails at runtime without `node:sqlite` | Caught at install by `engines` and at setup by the Node/Bun check, which blocks declaring opencode ready and surfaces the prerequisite to the owner. |

Escalation payload (all paths, identical contract to the other tools): **agent name** (from ensemble) + **verbatim error** (from ensemble) + **last-known progress** (orchestrator-derived from artifact folder / last commit / last message) + **suggested next step**.

## Risks and Open Questions

**Risks**

- **`worktree: false` is load-bearing on every spawn.** ensemble auto-applies read-only/worktree:false only for the literal agent strings `plan`/`explore`, which no RP agent matches. Omitting it on any single spawn silently gives that agent its own worktree and re-arms squash-merge, violating Req 5. Mitigation: opencode.md's Team spawning convention states `worktree: false` as unconditional for all RP agents.
- **ensemble double-initialization.** Re-exporting ensemble and *also* listing it in `plugin:[]` inits it twice (two watchdogs, dashboard port collision). Mitigation: install guidance + opencode.md state "list ONLY the meta-plugin"; smoke-test one watchdog + one dashboard with no port error.
- **Worktree re-launch hand-off.** Because the instance directory is immutable, the worktree-creating session (rooted at the main checkout) cannot itself spawn the worktree-rooted team — a new instance must be launched inside the worktree as the lead. Mitigation: opencode.md's Worktrees convention states the launch-rooted-in-worktree step plainly (TUI `opencode <path>`; automation `opencode run --dir <path>`).
- **Pinned ensemble version.** opencode's plugin-cache bug requires pinning; the meta-plugin must depend on a pinned ensemble version, and install guidance must reflect it.
- **Lead-session auth/network not auto-supervised.** ensemble supervises spawned teammates only; a lead-level auth/network failure surfaces in the owner's own session. Stated in opencode.md/docs so it is not mistaken for a gap (spec Out-of-Scope + acceptance note).
- **Stale-credential caveat on `opencode models`.** A listed credential can be expired/revoked at call time — the same caveat as `pi --list-models`; the 2-retry budget absorbs a stale pick.

**Open Questions (deferred to implementation phases)**

- **Loop prompt template placement.** Default: keep the template in `health-monitoring.md` (scope-minimal, honors "exactly two generic edits," touches no CC/Pi file). The writer may relocate it (and the interval/threshold defaults) into a shared file referenced by cc.md+pi.md only if it judges the template genuinely CC/Pi-launch-specific *and* confirms the move stays within the spec's scope boundary (moving content into convention files, not adding opencode-awareness to generic files).
- **opencode interval/threshold default values.** The CC/Pi 5-min interval / 10-min no-output threshold are loop-tuning; opencode's equivalents are ensemble's `stallThresholdMs` / `timeoutMs` in `.opencode/ensemble.json`. The plan must ensure the values RP writes there reflect RP's intended thresholds, not ensemble's stock defaults (note ensemble's real `stallThresholdMs` default is 5 min despite a stale 3-min JSDoc).
- **Workspace tooling choice.** npm vs. pnpm workspaces, the exact sub-package path (e.g. `packages/opencode/`), and the build step that copies the shared `agents/` + skill into the published tarball are code-phase implementation details; the dep-isolation property holds under either tool. The plan should also extend `sync-version.mjs` `TARGET_MANIFESTS` and the changeset `changedFilePatterns` to cover the new manifest so the version stays in lockstep.
- **opencode `models`/`auth` command-surface stability.** The recovery rule names `opencode models`; the output format and command name are verified @ HEAD but are a CLI surface that could shift across opencode releases. The plan/docs should treat the command as the documented mechanism while keeping the rule's *intent* (enumerate authenticated models, pick a different one) primary.
