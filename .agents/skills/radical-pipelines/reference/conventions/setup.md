# Setup Conventions

Use this setup flow when required conventions are missing before a workflow starts.

Do not continue the workflow. Tell the owner:

- Radical Pipelines requires project conventions before it can run.
- Which conventions were found.
- Which required conventions are still missing.

Ask whether the owner wants to run setup now. If they decline or cancel, stop and summarize the missing conventions.

To run the setup, follow these steps:

## 1. Read the specific agentic coding tool rules

Determine the active agentic coding tool used in this conversation and read the relevant file first.

Radical Pipelines supports the following agentic coding tools:

| Tool        | Read             |
| ----------- | ---------------- |
| Claude Code | `claude-code.md` |
| Pi          | `pi.md`          |

## 2. Collect required conventions

Ask for the required information in a clear sequence, one convention at a time. Specify if they are required or optional, and provide examples or suggestions when possible.

If a convention must be of a specific form due to the agentic coding tool's rules and does not require user input, simply inform the owner with a message explaining that convention and proceed to the next one.

### Pipeline slug (required)

The unique identifier for each pipeline. It is usually incorporated in the worktree name, the branch name, the artifacts folder name, etc, so it must be a valid filesystem and git identifier (lowercase, hyphens, no spaces).

The relationship between the issue and the pipeline slug must be deterministic: given an issue, the orchestrator must be able to enumerate every pipeline created for it by inspecting slugs alone.

The slug format must also be robust against collisions between similar identifiers, so the pipelines of one issue can never be confused with those of another.

Suggested default: `<issue-id>-<short-description>`.

### Artifact folder (required)

Where each pipeline's artifacts (`prompt.md`, `spec.md`, `design-doc.md`, `code-plan.md`, `doc-plan.md`, etc.) are stored. One folder per pipeline.

Ask the owner for the location and naming pattern.

Suggested default: `.pipelines/<pipeline-slug>/`.

### Commit format

The project's commit message format. Passed verbatim to every spawned agent so all commits in a pipeline match the project's style.

Ask the owner for the format and capture at least one concrete example.

Suggested default: `<commit-description> (<agent-name>)`.

### Issues (required)

Where the project tracks issues. Each pipeline pulls its initial prompt from an issue, so the orchestrator needs a way to read, comment on, and update them.

Ask the owner which tracker is used (GitHub Issues, Linear, Jira, GitLab, plain Markdown files in a folder, etc.) and how to access it (CLI like `gh`, MCP server, API token, etc.).

### Worktrees (required)

How worktrees are created, entered, and removed for each pipeline.

Suggested default: `git worktree add .worktrees/<pipeline-slug> && cd .worktrees/<pipeline-slug>` to create and enter, `cd .. && git worktree remove .worktrees/<pipeline-slug>` to exit and remove.

### Branch names (required)

How git branches are named per pipeline.

Ask the owner for the format.

Suggested default: `<pipeline-slug>`.

### Spawning teams of agents

How agents are organized into teams, spawned, and addressed across orchestrator sessions.

This is highly dependent on the agentic coding tool but you can document the existing tools and store them as a convention so the research doesn't need to be done on each run.

### Health monitoring (required)

How the orchestrator launches a recurring loop to detect stalls, message failures, login / token / network errors, and session-time-limit during a run.

This is highly dependent on the agentic coding tool. Document the slash commands to start, list, and cancel a loop. The skill ships defaults for both supported tools — `/loop` (bundled) for Claude Code and `@pi-agents/loop` for Pi. See the active tool's rules file for the canonical block and `reference/health-monitoring.md` for the loop prompt templates.

### Artifact storage (required)

How this project stores Radical Pipelines artifacts.

Running Radical Pipelines creates three kinds of files that need a home:

- The project-level `.rp.md` config file (the conventions captured during this setup).
- A per-pipeline artifact folder containing `prompt.md`, `spec.md`, `design-doc.md`, etc. — one folder per pipeline run, per the **Artifact folder** convention.
- A `.gitignore` entry for the worktree folder used by the active agentic coding tool.

They can live either in the project's repository alongside the code, or in a separate fork. The fork option is used when the project does not accept these kinds of commits, or when the owner wants to keep the pipeline workflow private.

Explain this and ask the owner:

> Can `.rp.md`, the artifact folder, and any related `.gitignore` entries be committed directly to this repository?

**If yes**, the mode is `artifacts-in-repo`. Everything lives in a single repository — no further information needed for this convention.

**If no** (the repository belongs to someone else, or upstream does not accept non-code changes), the mode is `artifacts-in-fork`. Before asking for any further information, explain how this mode works:

- A fork of the repository is required. All artifact-bearing pipeline work happens on branches in the fork.
- `.rp.md`, the artifact folder, and per-phase commits live in the fork only. They are never pushed to `upstream`.
- The upstream PR is never opened without explicit owner approval.
- When the owner approves opening a PR, the orchestrator always:
  1. Generates a clean branch name for `upstream` (separate from the fork branch).
  2. Cherry-picks only the code commits from the fork branch — artifact commits are excluded.
  3. Rewrites the cherry-picked commit messages to an upstream-friendly format.
  4. Pushes the clean branch directly to `upstream`.
  5. Opens the PR in `upstream` from that clean branch, using `pr-description.md` as the body.
- The PR's source branch lives in `upstream`, not in the fork — viewers of the PR never see the fork. If the fork is private, its existence is hidden entirely.

Then collect the information needed to operate in fork mode:

**Identify the remotes.** Run `git remote -v` to list the configured remotes.

- If two or more remotes are configured, ask the owner to confirm which one is the upstream (canonical) repository and which one is the fork (where Radical Pipelines work happens). By GitHub convention `origin` is usually the fork and `upstream` the canonical repo, but do not assume — always confirm.
- If only one remote is configured or no fork exists, a fork must be created. Ask the owner two things in sequence:
  - Whether the fork should be **public** or **private**. A private fork keeps the artifact-bearing branches out of public view; the PR itself reveals nothing about the fork either way.
  - To create the fork (e.g. via `gh repo fork`, then `gh repo edit <owner>/<repo> --visibility private` if private was chosen) and add it as a remote.

  Wait for confirmation, then re-run `git remote -v` and confirm the assignment.

**Define the upstream PR transformation.** Ask the owner for:

- **Upstream branch format**: the name of the cherry-pick branch pushed to `upstream` as the PR source. Can be derived from the fork's branch name format.
- **Upstream commit format**: the message format used for the cherry-picked clean commits. Should follow upstream's contribution guidelines. Can be derived from the fork's commit format.

These are consulted by the orchestrator only, at PR time. They are never passed down to agents.

Suggested defaults:

- Upstream branch: `<pipeline-slug>`.
- Upstream commit: `<commit-description>` (no agent attribution).

Capture:

- `mode`: `artifacts-in-repo` or `artifacts-in-fork`
- For `artifacts-in-fork`:
  - `upstream`: name and URL of the upstream remote
  - `fork`: name and URL of the fork remote
  - Upstream branch format
  - Upstream commit format

## 3. Apply agentic coding tool setup actions

Some agentic coding tools require setup actions beyond conventions.

Consult the active tool's rules file (read in Step 1) for a **Setup actions** section. If it has one, perform the actions described.

Do not create or copy files without explicit confirmation from the owner.

## 4. Confirm writes before changing files

Before writing anything, summarize the proposed `.rp.md` content and ask for explicit confirmation.

- If `.rp.md` does not exist, ask before creating it.
- If it exists, ask before overwriting it. Offer to merge or append only when the owner explicitly chooses that approach.

If any required answer is missing, do not create a misleading complete conventions file. Either stop and explain what is unresolved, or, only if the owner explicitly asks for a draft, write a file that clearly marks unresolved items and state that setup is incomplete.

## 5. Write human-readable Markdown

Write project-root `.rp.md` with the conventions and commit it to the main branch:

- `artifacts-in-repo`: the project's main branch.
- `artifacts-in-fork`: the fork's main branch only — never push it to upstream.

## 6. Set up git ignore

Add the worktree folder to `.gitignore` so local working copies are not tracked. This is the only entry Radical Pipelines requires.

Ask the owner for permission, append the entry, and commit it alongside `.rp.md` in the main branch.

Remind the owner that for `artifacts-in-fork`, the `.gitignore` change lives on the fork.

## 7. Finish safely

After setup completes, tell the owner:

- That `.rp.md` was created or updated.
- That future Radical Pipelines runs should read `.rp.md` and skip setup if all required conventions are present.

If setup was cancelled or incomplete, stop the pipeline and clearly list what remains missing.
