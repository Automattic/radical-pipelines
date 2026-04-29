# Setting Up Project Conventions

Use this setup flow when required Radical Pipelines project conventions are missing before a workflow starts.

## 1. Stop and explain

Do not continue the pipeline. Tell the owner:

- Radical Pipelines requires project conventions before it can run.
- Which conventions were found and where they came from.
- Which required conventions are still missing.
- Shared cross-agent project instructions belong in project-root `AGENTS.md`.
- Agent tool-specific Radical Pipelines conventions belong in the active tool's conventions file, such as `.pi/rp.md` for Pi or `.claude/rp.md` for Claude Code.

Ask whether the owner wants to run setup now. If they decline or cancel, stop and summarize the missing conventions.

## 2. Identify the active agent tool target

Determine the active agent tool and target conventions file:

| Agent tool | Target file |
| --- | ----------- |
| Pi | `.pi/rp.md` |
| Claude Code | `.claude/rp.md` |

Create the parent configuration folder only after the owner confirms the setup answers should be written.

## 3. Inspect shared instruction files

Check whether project-root `AGENTS.md` exists and whether it already contains shared cross-agent guidance. Treat it as the canonical location for shared project instructions.

If `CLAUDE.md` exists and is a thin pointer such as `@AGENTS.md`, preserve that pointer. Do not replace it with copied instructions and do not write Radical Pipelines agent tool-specific conventions into it. If `CLAUDE.md` is missing and the owner wants Claude Code to load shared instructions, you may suggest creating a thin pointer to `AGENTS.md`, but only create it after explicit confirmation.

If `AGENTS.md` is missing and shared cross-agent instructions are needed, ask whether to create it. Do not create, overwrite, or replace `AGENTS.md` or `CLAUDE.md` without explicit confirmation.

## 4. Collect required conventions

Ask for the following information in a clear sequence. For each answer, identify whether it is shared project guidance for `AGENTS.md` or agent tool-specific Radical Pipelines guidance for the active `rp.md` file.

1. **Tasks:** Where tasks are tracked and how agents should access them.
2. **Pipeline slugs:** The slug format to use for pipeline names.
3. **Worktrees:** Whether worktrees are used and the exact commands or workflow for creating, entering, and removing them.
4. **Branch names:** How branch names are chosen or created.
5. **Pipeline artifact folders:** Where pipeline artifacts are stored.
6. **Spawning teams of agents:** How the active agent tool should spawn teams or agents.
7. **Commits:** Commit message format and any other commit rules.

If the owner provides general project guidance, recommend adding or updating `AGENTS.md` instead of copying that guidance into agent tool-specific conventions files.

## 5. Confirm writes before changing files

Before writing anything, summarize the proposed file changes and ask for explicit confirmation.

- If the active agent tool's `rp.md` file does not exist, ask before creating it.
- If it exists, ask before overwriting it. Offer to merge or append only when the owner explicitly chooses that approach.
- If `AGENTS.md` or `CLAUDE.md` would be created or changed, ask for separate explicit confirmation for each shared instruction file.

If any required answer is missing, do not create a misleading complete conventions file. Either stop and explain what is unresolved, or, only if the owner explicitly asks for a draft, write a file that clearly marks unresolved items and state that setup is incomplete.

## 6. Write human-readable Markdown

Write the active agent tool's `rp.md` file with only Radical Pipelines conventions needed by that tool. Use clear sections such as:

```markdown
## Managing tasks

...

## Pipeline slugs

...

## Worktrees

...

## Branch names

...

## Pipeline artifact folders

...

## Spawning teams of agents

...

## Commits

...
```

Do not duplicate general project instructions already present in `AGENTS.md`.

## 7. Finish safely

After setup completes, tell the owner:

- Which files were created or updated.
- That future Radical Pipelines runs with the same agent tool should read the generated `rp.md` and skip setup if all required conventions are present.
- To review and commit the generated agent tool-specific conventions file if it should be shared with the project.
- To review and commit any `AGENTS.md` or `CLAUDE.md` changes separately as shared agent instructions.

If setup was cancelled or incomplete, stop the pipeline and clearly list what remains missing.
