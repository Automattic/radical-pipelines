# Set up project conventions

Enter from `load.md`:

- `.rp.md` absent: Fresh setup.
- Stamp absent or older: Migration.
- Current stamp with missing required facts: interview only those facts, then Write.

Tell the owner what exists and what is missing. Offer setup. If declined, stop and list the missing facts.

## Fresh setup

Interview the required rows one at a time, then offer each optional row. Mark each as required or optional and provide a default or example. Record project facts only; use `tools/<tool>.md` for mechanics. When the skill ships no `tools/<tool>.md` for the active tool, interview its mechanics too — how to spawn, seat, address, and terminate an agent, and how to start and cancel the health loop — and record them in the tool section.

### Issues (required)

Where issues live; how to read the body and comments, create, modify, and comment; the canonical reference written in `Origin:` lines.

### Branch naming (required)

How the pipeline branch and slug derive from the issue. It must be a valid git ref, contain no `_`, and distinguish issues. Suggested: `<issue-id>-<short-description>`.

### Worktree folder root (required)

The root containing one worktree per branch. Suggested: `.worktrees/`. Apply the active tool's location rule.

### Pipelines folder root (optional)

The root containing pipeline folders. Default: `.pipelines/`.

### Artifact storage (optional)

How this project stores Radical Pipelines artifacts.

Running Radical Pipelines creates three kinds of files that need a home:

- The project-level `.rp.md` config file (the conventions captured during this setup).
- The pipelines folder containing the pipeline folders and their phase artifacts.
- A `.gitignore` entry for the worktree folder root.

They can live either in the project's repository alongside the code, or in a separate fork. The fork option is used when the project does not accept these kinds of commits, or when the owner wants to keep the pipeline workflow private.

Explain this and ask the owner:

> Can `.rp.md`, the pipelines folder, and any related `.gitignore` entries be committed directly to this repository?

**If yes**, the mode is `artifacts-in-repo`, the default. Everything lives in a single repository; the artifact base branch is the repository's main branch.

**If no** (the repository belongs to someone else, or upstream does not accept non-code changes), the mode is `artifacts-in-fork`. Before asking for any further information, explain how this mode works:

- A fork of the repository is required. All artifact-bearing pipeline work happens on branches in the fork.
- `.rp.md`, the pipelines folder, and per-phase commits live in the fork only. They are never pushed to `upstream`.
- The upstream PR is never opened without explicit owner approval.
- When the owner approves opening a PR, the orchestrator performs the upstream PR transformation in `../run/close-out.md`: artifact commits never reach `upstream`, and the PR ships from a clean branch — viewers of the PR never see the fork, and if the fork is private, its existence is hidden entirely.

Then collect the information needed to operate in fork mode:

**Identify the remotes.** Run `git remote -v` to list the configured remotes.

- If two or more remotes are configured, ask the owner to confirm which one is the upstream (canonical) repository and which one is the fork (where Radical Pipelines work happens).
- If only one remote is configured or no fork exists, a fork must be created. Ask the owner two things in sequence:
  - Whether the fork should be **public** or **private**. A private fork keeps the artifact-bearing branches out of public view; the PR itself reveals nothing about the fork either way.
  - To create the fork on the repository's hosting platform (private if that was chosen) and add it as a remote.

Wait for confirmation, then re-run `git remote -v` and confirm the assignment.

**Recommend the standard remote names.** Recommend naming the fork remote `origin` and the canonical repository's remote `upstream`, unless they already are. Never rename a remote without the owner's explicit approval; if they decline, record the current names.

**Declare the artifact base branch.** The fork's branch pipelines start from, merge into, and count their own commits after — declared explicitly, since it need not be the fork's main branch.

**Define the upstream PR transformation.** Ask the owner for:

- **Upstream branch format**: the name of the cherry-pick branch pushed to `upstream` as the PR source. Can be derived from the slug.
- **Upstream commit format**: the message format used for the cherry-picked clean commits. Should follow upstream's contribution guidelines. Can be derived from the fork's commit format.

These are consulted by the orchestrator only, at PR time. They are never passed down to agents.

Suggested defaults:

- Upstream branch: the slug.
- Upstream commit: `<commit-description>` (no agent attribution).

Capture:

- `mode`: `artifacts-in-repo` or `artifacts-in-fork`
- The artifact base branch
- For `artifacts-in-fork`:
  - `upstream`: name and URL of the upstream remote
  - `fork`: name and URL of the fork remote
  - Upstream branch format
  - Upstream commit format

### Commit format (optional)

The format placed in agent prompts. Capture one example. Suggested: `<commit-description> (<profile>)`.

### PR format (optional)

The pull request title and description template, required sections, style, and an example.

### Guardrails (optional)

Checks and judgment rules the project's work must satisfy. Offer to inspect the project and test each rule. Capture the blocks defined in `guardrails.md`.

### Lifecycle hooks (optional)

Show `lifecycle-hooks.md` § Hook points. Capture instructions for each hook the owner selects.

### Agents (optional)

Models per profile and named lanes, in the blocks `agents.md` defines.

### Thresholds (optional)

Audit and valve thresholds when overriding `rp check`'s defaults.

## Tool setup actions

Before writing, perform any **Setup actions** in `tools/<tool>.md`. Get the owner's confirmation before an action writes files.

## Write

1. Show the proposed changes and get the owner's confirmation. Resolve every required answer before writing a complete file.
2. Write human-readable `.rp.md` with frontmatter `conventions: 1`, shared fact sections, and a section headed by the active tool's name for its project facts.
3. With permission, add the worktree folder root to `.gitignore`.
4. Commit the files and report completion.

## Migration

1. Read `changelog.md`. The project's version is its stamp, or 0 when absent.
2. Walk every later entry in order. With owner confirmation for each action: apply heading renames mechanically; show removals, then delete them; interview new required facts; offer new optional facts.
3. Bump the stamp to the current version, then follow Write.
4. Warn that `.rp.local.md` is not rewritten; the owner must apply its corresponding changes.
