# Setting Up Project Conventions

Use this setup flow when required Radical Pipelines project conventions are missing before a workflow starts.

## 1. Stop and explain

Do not continue the pipeline. Tell the owner:

- Radical Pipelines requires project conventions before it can run.
- Which conventions were found and where they came from.
- Which required conventions are still missing.
- Shared cross-agent project instructions belong in project-root `AGENTS.md`.
- CLI-specific Radical Pipelines conventions belong in the active CLI conventions file, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.
- In Pi, phase agent definitions must also be discoverable before a pipeline can launch agents.

Ask whether the owner wants to run setup now. If they decline or cancel, stop and summarize the missing conventions or missing Pi agents.

## 2. Identify the active CLI target

Determine the active CLI and target conventions file:

| CLI | Target file |
| --- | ----------- |
| Pi | `.pi/rp.md` |
| Claude Code | `.claude/rp.md` |

Create the parent configuration folder only after the owner confirms the setup answers should be written.

## 3. Inspect shared instruction files

Check whether project-root `AGENTS.md` exists and whether it already contains shared cross-agent guidance. Treat it as the canonical location for shared project instructions.

If `CLAUDE.md` exists and is a thin pointer such as `@AGENTS.md`, preserve that pointer. Do not replace it with copied instructions and do not write Radical Pipelines CLI-specific conventions into it. If `CLAUDE.md` is missing and the owner wants Claude Code to load shared instructions, you may suggest creating a thin pointer to `AGENTS.md`, but only create it after explicit confirmation.

If `AGENTS.md` is missing and shared cross-agent instructions are needed, ask whether to create it. Do not create, overwrite, or replace `AGENTS.md` or `CLAUDE.md` without explicit confirmation.

## 4. Check Pi agent definitions

When the active CLI is Pi, check for the agent definitions required by the target phase and selected execution mode before collecting or writing conventions:

1. Check repository-local Pi agents first: `.pi/agents/<agent-name>.md` or `.pi/agents/<agent-name>/SKILL.md`.
2. If any required agent is not found in the repository, check user-local/global Pi agents: `~/.pi/agent/agents/<agent-name>.md` or `~/.pi/agent/agents/<agent-name>/SKILL.md`.
3. Report which required agents were found in the repository, which were found globally, and which are missing.

If all required agents are present across those locations, continue setup. If no required agents are available in either location, stop and ask the owner which Radical Pipelines agents they want to copy/paste and install. Ask whether to install them repository-locally under `.pi/agents/` or user-locally/globally under `~/.pi/agent/agents/`. Do not create or copy agent files without explicit confirmation.

If only some required agents are missing, ask whether to copy/paste and install the missing agents, again confirming the destination before writing. After installation, tell the owner to verify discovery with the Pi/pi-teams predefined-agent listing for the target project.

## 5. Collect required conventions

Ask for the required information in a clear sequence, but keep shared project conventions separate from CLI-specific conventions.

### Shared project conventions

Shared conventions describe the project regardless of which agent CLI runs the pipeline. Prefer `AGENTS.md` for reusable shared guidance, or include only the Radical Pipelines-specific subset in each CLI's `rp.md` when the owner does not want shared files changed.

1. **Tasks:** Where tasks are tracked and how agents should access them.
2. **Pipeline slugs:** The slug format to use for pipeline names.
3. **Pipeline artifact folders:** Where pipeline artifacts are stored.
4. **Commits:** Commit message format and any other commit rules.

### Claude Code conventions

Collect these only when the active CLI is Claude Code, and write them only to `.claude/rp.md`:

1. **Claude Code worktrees:** The exact Claude Code command or tool flow for creating, entering, exiting, and removing worktrees.
2. **Claude Code branch names:** How Claude Code chooses or creates branch names.
3. **Claude Code team spawning:** The exact Claude Code command, tool, or plugin used to spawn teams or agents.
4. **Claude Code prerequisites:** Any Claude Code plugin, marketplace, hook, or command setup required before running Radical Pipelines.

### Pi conventions

Collect these only when the active CLI is Pi, and write them only to `.pi/rp.md`:

1. **Pi prerequisites:** Required Pi packages, plugins, or one-time setup commands.
2. **Pi worktrees:** The exact Pi command or tool flow for creating, entering, and removing worktrees.
3. **Pi branch names:** How Pi chooses or creates branch names.
4. **Pi team spawning:** The exact Pi tool or `pi-teams` workflow used to spawn teams or agents.
5. **Pi agent setup:** The required agents, where they were found or installed, and whether future runs should prefer repository-local `.pi/agents/` definitions or user-local/global `~/.pi/agent/agents/` definitions when both exist.

If the owner provides general project guidance, recommend adding or updating `AGENTS.md` instead of copying that guidance into CLI-specific conventions files. Never write Claude Code conventions into `.pi/rp.md`, and never write Pi conventions into `.claude/rp.md`.

## 6. Confirm writes before changing files

Before writing anything, summarize the proposed file changes and ask for explicit confirmation.

- If the active CLI `rp.md` file does not exist, ask before creating it.
- If it exists, ask before overwriting it. Offer to merge or append only when the owner explicitly chooses that approach.
- If `AGENTS.md` or `CLAUDE.md` would be created or changed, ask for separate explicit confirmation for each shared instruction file.

If any required answer is missing, do not create a misleading complete conventions file. Either stop and explain what is unresolved, or, only if the owner explicitly asks for a draft, write a file that clearly marks unresolved items and state that setup is incomplete.

## 7. Write human-readable Markdown

Write the active CLI `rp.md` file with only Radical Pipelines conventions needed by that CLI. Do not include sections for inactive CLIs.

For Claude Code, use clear sections such as:

```markdown
## Managing tasks

...

## Pipeline slugs

...

## Claude Code worktrees

...

## Claude Code branch names

...

## Pipeline artifact folders

...

## Claude Code team spawning

...

## Commits

...
```

For Pi, use clear sections such as:

```markdown
## Pi prerequisites

...

## Managing tasks

...

## Pipeline slugs

...

## Pi worktrees

...

## Pi branch names

...

## Pipeline artifact folders

...

## Pi team spawning

...

## Pi agent setup

...

## Commits

...
```

Do not duplicate general project instructions already present in `AGENTS.md`. Never write Claude Code-only sections to `.pi/rp.md`; never write Pi-only sections to `.claude/rp.md`.

## 8. Finish safely

After setup completes, tell the owner:

- Which files were created or updated.
- That future Radical Pipelines runs with the same CLI should read the generated `rp.md` and skip setup if all required conventions are present.
- To review and commit the generated CLI-specific conventions file if it should be shared with the project.
- To review and commit any `AGENTS.md` or `CLAUDE.md` changes separately as shared agent instructions.

If setup was cancelled or incomplete, stop the pipeline and clearly list what remains missing.
