# Native primitives: Claude Code and opencode v2 (November 2026)

Research for the v4 redesign. Sources are official docs. For opencode, some facts were also observed in the installed **opencode v2.2.5** binary (its tool schemas and strings) and in its published OpenAPI document; those facts are marked *(binary)* or *(OpenAPI)*. Anything **unconfirmed** is marked as such.

## Claude Code

### 1. Subagents
- **Delegation.** The `Agent` tool takes a `subagent_type`, a prompt, and optionally `name`, `model`, `effort`, `isolation`, and `run_in_background`. By default, subagents spawned from the main conversation start in the background. [sub-agents](https://code.claude.com/docs/en/sub-agents)
- **Model.** The model is resolved in this order: the per-call `model` (an alias only: `sonnet`/`opus`/`haiku`/`fable`), then the frontmatter `model` (alias, full ID, or `inherit`), then `CLAUDE_CODE_SUBAGENT_MODEL`, then the parent's model. The per-call model persists across resumes.
- **Working directory.** A subagent starts in the parent's current working directory, and `cd` does not persist between its commands. `isolation: worktree` (in frontmatter or per call) creates a **temporary new worktree**. It branches from the default branch, or from `HEAD` with `worktree.baseRef: "head"`. It is auto-removed if unchanged and swept after `cleanupPeriodDays`. I found no native way to seat a subagent in an **existing, chosen** worktree. Background subagents do have `EnterWorktree`, but whether it moves only the subagent is **unconfirmed**. [worktrees](https://code.claude.com/docs/en/worktrees#isolate-subagents-with-worktrees)
- **Follow-up and resume.** `SendMessage` with the agent ID or name resumes a finished or stopped subagent in the background, with its full history. It also delivers mid-task direction to a running subagent. Agent teams do not need to be enabled for this. Explore and Plan are one-shot and cannot be resumed. A name survives a restart only if it was given since the last compaction; an ID always works. [sub-agents#resume-subagents](https://code.claude.com/docs/en/sub-agents#resume-subagents)
- **Parallelism.** Yes. Subagents can nest up to 3 layers by default (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`).
- **Tools.** A subagent inherits the parent's tools, narrowed by `tools`/`disallowedTools`. A **background** subagent keeps only a reduced built-in set (Read, Grep, Glob, LSP, Bash, Edit, Write, WebFetch, WebSearch, TodoWrite, Skill, ToolSearch, EnterWorktree, ExitWorktree, Monitor, TaskStop, SendMessage, Artifact) plus all MCP tools. It does **not** keep the Cron tools; only teammates do. [sub-agents#available-tools](https://code.claude.com/docs/en/sub-agents#available-tools)
- **Failure reporting.** A background subagent that ends on an API error is marked failed. The parent's completion notification names the error and includes the last output.

### 2. Long-lived agents and agent teams
- **Agent teams** are **experimental** and off by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), and need an interactive session (not `-p`/SDK). An `Agent` call with `name` launches a teammate, unless the call passes `isolation` or is a fork. Teammates are addressed by name through `SendMessage`. Idle notifications reach the lead automatically with the final answer, and an API-error end is reported as a failure. Shutdown is a `shutdown_request` that the teammate approves. [agent-teams](https://code.claude.com/docs/en/agent-teams)
- **Agent team limits.** In-process teammates are **not restored** by `/resume`. A session has one team, teams cannot nest, and there are no per-teammate permission modes. Teammates run in the lead's working directory with **no worktree isolation**. A teammate's model is fixed at spawn: the model named in the spawn prompt, else the definition's `model`.
- **Background sessions** ([agent view](https://code.claude.com/docs/en/agent-view), research preview) are separate long-lived agents. They start with `claude --bg [--agent <profile>] [--name <n>] "<prompt>"` from a shell. A supervisor process runs them, so they survive closing the terminal, auto-updates, and supervisor restarts. A session started inside a linked worktree stays there instead of creating one. Whether `--model` combines with `--bg` is **unconfirmed** (it is a normal CLI flag). They are stopped with `claude stop` and removed with `claude rm`.
- **Cross-session messaging** is on by default since v2.1.224. `ListAgents` and `SendMessage` reach the user's other sessions. `SendMessage`'s `notify_when_idle` gives a one-shot notice when the target goes idle or exits. A message to an idle session starts a turn. [cross-session-messaging](https://code.claude.com/docs/en/cross-session-messaging)
- **Compaction.** Subagent transcripts live in separate files and are unaffected by the parent's compaction.

### 3. Agent definitions
- **Format.** Markdown with YAML frontmatter, in `.claude/agents/`, `~/.claude/agents/`, or a plugin's `agents/`. Fields include `name`, `description` (both required), `tools`, `disallowedTools`, `model`, `permissionMode`, `hooks`, `maxTurns`, `skills` (preloads the full skill body), `background`, `effort`, and `isolation`. The body is the system prompt.
- **Plugin agents** are registered as `<plugin>:<subdir>:<name>`. They **ignore** `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`. [plugins/components#agents](https://code.claude.com/docs/en/plugins/components)

### 4. Skills
- **Shipping.** A plugin ships `skills/<name>/SKILL.md`, invocable as `/<plugin>:<name>`.
- **After compaction.** Claude Code **re-attaches the most recent invocation of each skill automatically**, keeping its first 5,000 tokens, within a 25,000-token combined budget filled from the most recent skill. Older skills can drop out. Supporting files the skill told Claude to read are not re-attached. [skills#skill-content-lifecycle](https://code.claude.com/docs/en/skills)

### 5. Scheduling and health
- **Session-scoped timers.** `/loop`, `CronCreate`/`CronList`/`CronDelete` (5-field cron, recurring or one-shot, up to 50 per session, minimum 1 minute, jittered), and `ScheduleWakeup` (self-paced). A task fires between turns. It expires after **7 days** and is restored on `--resume`. [scheduled-tasks](https://code.claude.com/docs/en/scheduled-tasks)
- **Event-driven alternatives.** The `Monitor` tool and plugin monitors (background commands whose output arrives as notifications).
- **Observing other agents.** `/tasks` (for the user). Background-subagent completion and failure notifications. Hooks: `SubagentStart`, `SubagentStop`, `TeammateIdle`, `Stop`, `StopFailure`, `Notification`. `notify_when_idle` for other sessions. A mod's `$.agent.list()` returns each subagent or teammate with a status of `pending`, `running`, `waiting`, `idle`, `completed`, `failed`, or `killed`. [mods reference](https://code.claude.com/docs/en/plugins/mods/reference)

### 6. Worktrees
- `--worktree`, `EnterWorktree`/`ExitWorktree` (these move the **whole session**), subagent `isolation: worktree`, and `WorktreeCreate`/`WorktreeRemove` hooks to replace git. Isolation is enforced: edits and git commands that target the main checkout are blocked. [worktrees](https://code.claude.com/docs/en/worktrees)

### 7. Permissions
- **Per agent.** `tools`/`disallowedTools` and `permissionMode`. If the parent is in `bypassPermissions`, `acceptEdits`, or `auto`, that mode overrides the subagent's.
- **Who answers prompts.** Prompts from background subagents and teammates surface **in the main session, to the user**, naming the asker. No agent message counts as approval, so the parent *agent* cannot answer them. [sub-agents#permission-modes](https://code.claude.com/docs/en/sub-agents)

### 8. Plugins
- **Distribution.** Through marketplaces (`/plugin install <name>@<marketplace>`, with user, project, or local scope). [plugins/install](https://code.claude.com/docs/en/plugins/install)
- **Components.** Skills, commands, agents, hooks (`hooks/hooks.json`), MCP servers, monitors, channels, default settings, and more. [plugins/components](https://code.claude.com/docs/en/plugins/components)
- **Mods** are JS/TS plugins with event handlers. They can:
  - add tools and commands;
  - run timers (`$.clock.every`) that can start turns (`$.prompt.submit`);
  - send messages (`$.session.send` to `sessionId` or `agentId`);
  - list and spawn agents (`$.agent.list`, `$.agent.spawn`);
  - intercept `agent.spawn` to set a model or deny a resume;
  - hook `session.compact`, `tool.check`, and other events.

  [mods api](https://code.claude.com/docs/en/plugins/mods/api)

## opencode v2 (v2.2.5)

### 1. Subagents
- **Delegation.** The `subagent` tool takes an agent ID, `description`, and `prompt`. *(binary)* It also accepts:
  - `model` (`provider/model#variant`);
  - `sessionID` ("Send a follow-up to an existing subagent, running or finished");
  - `background` (returns immediately and notifies the parent).

  The notification is a synthetic message `<subagent sessionID=… state=completed|error|cancelled>` posted to the parent, so it covers both finishing and failing. Only `mode: subagent` or `mode: all` agents can be launched. [tools#subagent](https://opencode.ai/v2/docs/tools/)
- **Model.** The per-call `model` overrides the agent's configured `model`, which overrides the parent's model. [agents](https://opencode.ai/v2/docs/agents/)
- **Working directory.** A child session is created **at its parent's location** *(OpenAPI: "A parentID creates a linked child session at its parent's location")*. The `subagent` tool has no directory or worktree parameter. The Code Mode tool `opencode.session_move` can move **another session by `sessionID`** to a directory. Whether that is allowed for a running child subagent is **unconfirmed**.
- **Parallelism and depth.** Several background subagents can run at once. Nesting depth defaults to 1 (`experimental.subagent_depth`).
- **Tools and permissions.** The child uses **its own agent's permissions**, not a subset of the parent's. [permissions](https://opencode.ai/v2/docs/permissions/)
- **Messaging.** There is **no peer-to-peer tool**: a child can report only through its final result. The parent can follow up with `sessionID`.
- **Restart.** On a server restart, sessions that were working are resumed with "The server restarted while you were working…" (capped at 10 attempts), and running background subagents are recovered. *(binary)*

### 2. Long-lived agents and agent teams
- opencode has no team feature and no named agents. A session ID is the address.
- **Server API.** Persistent sessions come from the server API and plugin context:
  - `session.create({parentID, agent, model, location, permissions, metadata})`;
  - `session.prompt` / `session.synthetic` (with `steer`/`queue` delivery);
  - `session.move`, `session.interrupt`, `session.remove` (recursive);
  - `session.wait`.

  Events: `session.execution.started|succeeded|failed|interrupted`, `session.idle`, `session.deleted`, `permission.asked`, and others. Sessions are durable in the database. [build/plugins/server](https://opencode.ai/v2/docs/build/plugins/server/)
- **Reaching them without a plugin.** An agent can call these endpoints through its shell with `opencode api <method> <path>`. [api](https://opencode.ai/v2/docs/api/)

### 3. Agent definitions
- **Format.** Markdown in `~/.config/opencode/agents/` or `.opencode/agents/` (a nested path becomes part of the ID), or JSONC under `agents`. Fields: `description`, `mode`, `model` (with `#variant`), `permissions` (ordered rules), `steps`, `hidden`, `color`, `disabled`. The body is the system prompt.
- **From a plugin.** The plugin API's `ctx.agent.transform` editor exposes `list`, `get`, `default`, `update`, and `remove`, but **no `add`** in the docs. Registering a new agent from code is **unconfirmed**, so a plugin still writes files, as the current one does. [agents](https://opencode.ai/v2/docs/agents/)

### 4. Skills
- **Shipping.** Through a `skills` config entry (local path or HTTP catalog), skill directories (including `~/.claude/skills`), or `ctx.skill.transform(editor.add(...))` from a plugin. [skills](https://opencode.ai/v2/docs/skills/)
- **After compaction.** Compaction replaces older conversation with a summary and keeps about 15k tokens of recent conversation. The docs describe **no re-injection of loaded skills**, so a skill loaded earlier is lost unless it falls in the kept tail. [compaction](https://opencode.ai/v2/docs/compaction/)
- **Minimal re-supply primitives:**
  - the `context` hook can push system text;
  - `ctx.session.instructions.entry.put` (experimental) adds durable keyed entries to a session's instructions. Instructions are not compacted, so these probably survive compaction; **unconfirmed**;
  - `POST /api/experimental/session/{id}/skill` re-activates a skill *(OpenAPI)*.

### 5. Scheduling and health
- **Schedules** *(binary; experimental; absent from the public docs)*. With `experimental.schedules` enabled, a schedule tool wakes **the calling session** with a prompt:
  - triggers: `{in}`, `{at}`, `{every}`, `{cron}`;
  - optional `until`/`ends` limits;
  - `if`/`until` gates, either a shell command (`{run}`) or a Code Mode script (`{code}`), checked with no model call;
  - list, pause, resume, and delete operations.

  Schedules are stored in the database, cascading on session delete.
- **Health observation.**
  - `GET /api/session/active` lists running sessions;
  - `Session.Info` carries `outcome` (`succeeded`/`failed`/`interrupted`) and `time.busy`/`time.idle`;
  - `GET /api/session/{id}/inbox` shows pending input;
  - the event stream covers the rest *(OpenAPI)*.

  No built-in model tool exposes these; the agent uses `opencode api` through the shell, or a plugin.
- **Plugin timers.** Plain `setInterval` inside `setup`.

### 6. Worktrees
- Code Mode tools `opencode.worktree_create`/`worktree_list`/`worktree_remove` and `opencode.session_move`. The `worktree.directory` setting chooses the parent folder. Plugins can register worktree strategies. [tools#worktrees](https://opencode.ai/v2/docs/tools/), [config](https://opencode.ai/v2/docs/config/)
- **Seating.** A session is seated by creating it at a `location` (API or plugin) or by moving it.

### 7. Permissions
- **Rules.** Per-agent ordered `{action, resource, effect}` rules. Actions include `shell`, `edit`, `read`, `subagent`, `skill`, `external_directory`, and `<server>_<tool>`. Session-scoped rules can be set with `session.update({permissions})`, and children inherit the rules in effect when they are created. `external_directory` is **allowed by default**.
- **Who answers prompts.** Pending requests are listed by `GET /api/permission/request` and answered with `POST /api/session/{id}/permission/{req}/reply` (`once`/`always`/`reject` plus feedback). The UI shows them to the user. Whether the **parent agent** is told about a child's request is **unconfirmed**; no doc says so.
- **Plugin hooks.** `ctx.permission.hook("evaluate")` can change an `allow` or `ask` decision. [permissions](https://opencode.ai/v2/docs/permissions/)

### 8. Plugins
- **Package shape.** An npm package or local directory with server, TUI, GUI, and RPC parts, built on `@opencode/plugin` with `Plugin.define({id, setup(ctx)})`. [build/plugins](https://opencode.ai/v2/docs/build/plugins/)
- **Server API surface:**
  - transforms for `tool`, `agent`, `skill`, `provider`, `model`, `worktree`, and others;
  - hooks: `session.hook` (`prompt`, `context`, `compaction`, `title`, `model.request`, `http.request`/`http.response`, `retry`), `permission.hook("evaluate")`, `shell.hook("create.before")`, `tool.hook("execute.before"|"execute.after")`;
  - `ctx.event.subscribe`;
  - the full server client: sessions, permissions, worktrees, storage.

  [server](https://opencode.ai/v2/docs/build/plugins/server/)
- **Stability.** `instructions.entry`, `session.wait`, and schedules are experimental.

### What the current plugin built that is now native
- **Native in opencode now:** follow-ups to a running or finished child (`subagent` with `sessionID`), completion and failure notices to the parent (`<subagent state=…>`), per-call model, restart recovery, worktree tools, `session_move`, and scheduled wakes (experimental).
- **Still not native:** directed messages *from* a child or between peers (`rp_send`), seating a child in a chosen directory at spawn, skill re-supply after compaction, permission requests announced to the spawner, and a tool-level health and status view (`rp_status`). The dead-stream watchdog, flood protection, and backoff are also still plugin code.

## What the redesign can rely on natively

### Claude Code

| Need | Native primitive |
| --- | --- |
| Spawn a role with a model and profile | `Agent` with `subagent_type` = plugin agent and `model` (alias only; a full ID only via frontmatter) and `name`. Or a teammate (experimental). Or `claude --bg --agent` (model flag with `--bg` unconfirmed). |
| Seat it in a worktree | `isolation: worktree`, but only a **new temporary** worktree from the default branch or `HEAD`. For a chosen existing worktree: `claude --bg` launched from inside it. Not available for subagents (unconfirmed via `EnterWorktree`). |
| Wake it later with a message, same context | `SendMessage` to the agent ID or name (resumes with full history). Cross-session `SendMessage` for `--bg` sessions. |
| Know when it finished or failed | Background completion notification (includes API-error failures). Teammate idle notification. `notify_when_idle`. `SubagentStop`/`TeammateIdle` hooks. |
| Terminate it | `TaskStop` (a later message can resume it). Teammate `shutdown_request`. `claude stop`/`claude rm`. No permanent delete of a subagent. |
| Periodic health tick | `/loop`, `CronCreate` (session-scoped, 7-day expiry), `ScheduleWakeup`, `Monitor`, plugin monitors. |
| Scope its tools | Frontmatter `tools`/`disallowedTools` (plugin agents cannot set `permissionMode`). Permission prompts go to the user. |
| Ship profiles and the skill | A plugin's `agents/` and `skills/` through a marketplace. |
| Re-supply the skill after compaction | Native: re-attaches the first 5k tokens of each invoked skill (25k total budget). |

### opencode v2

| Need | Native primitive |
| --- | --- |
| Spawn a role with a model and profile | `subagent` tool with an agent ID, `model`, and `background: true`. Profiles are agent files with `mode: subagent`. |
| Seat it in a worktree | `worktree_create` plus `session_move(sessionID)` on the child (unconfirmed for a running child). Otherwise none: plugin needed (`session.create` at a location). |
| Wake it later with a message, same context | `subagent` with `sessionID` (running or finished). |
| Know when it finished or failed | Automatic `<subagent state=completed\|error\|cancelled>` message to the parent. |
| Terminate it | None as a model tool. `opencode api POST /api/session/{id}/interrupt` through the shell stops a run and keeps the session (`session.interrupt`); `DELETE /api/session/{id}` (`session.remove`) also destroys the transcript. |
| Periodic health tick | Experimental schedule tool (`experimental.schedules`; wakes the calling session; cron, interval, and gated checks). Otherwise none: plugin needed. |
| Scope its tools | Agent `permissions` rules (also for children). Child permission requests reach the user; relay to the parent is unconfirmed, so a plugin is needed for that. |
| Ship profiles and the skill | Skill: a `skills` config path or `ctx.skill.transform`. Profiles: agent files. Registration from code is unconfirmed (no `add` in the agent editor), so a plugin or install step writes the files. |
| Re-supply the skill after compaction | None native: plugin needed. Minimal options are the `context` hook or `instructions.entry.put` (experimental). |
| Child → parent or peer messages mid-run | None: plugin needed (or reliance on the final result only). |
