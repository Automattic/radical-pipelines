# Set up project conventions

Enter from `load.md`:

- `.rp.md` absent: Fresh setup.
- Stamp absent or older: Migration.
- Current stamp with missing required facts: interview only those facts, then Write.

Tell the owner what exists and what is missing. Offer setup. If declined, stop and list the missing facts.

## Fresh setup

Interview the required rows one at a time, then offer each optional row. Mark each as required or optional and provide a default or example. Record project facts only; use `tools/<tool>.md` for mechanics.

### Issues (required)

Where issues live; how to read the body and comments, create, modify, and comment; the canonical reference written in `Origin:` lines.

### Branch naming (required)

How the pipeline branch and slug derive from the issue. It must be a valid git ref, contain no `_`, and distinguish issues. Suggested: `<issue-id>-<short-description>`.

### Worktree folder root (required)

The root containing one worktree per branch. Suggested: `.worktrees/`. Apply the active tool's location rule.

### Artifact storage (required)

Confirm that `.rp.md`, the pipelines folder, and the worktree root's ignore entry are committed to the project's repository, and record it.

### Pipelines folder root (optional)

The root containing pipeline folders. Default: `.pipelines/`.

### Commit format (optional)

The format placed in agent prompts. Capture one example. Suggested: `<commit-description> (<profile>)`.

### PR format (optional)

The pull request title and description template, required sections, style, and an example.

### Guardrails (optional)

Checks and judgment rules the project's work must satisfy. Offer to inspect the project and test each rule. Capture the blocks defined in `guardrails.md`.

### Lifecycle hooks (optional)

Show `lifecycle-hooks.md` § Hook points. Capture instructions for each hook the owner selects.

### Policy defaults (optional)

Review lanes and their charters per artifact. Audit and valve thresholds when overriding the loop's defaults.

### Agent models (optional)

In the active tool's section, capture `**Default:**` and any `**<profile>:**` overrides, or a profile-by-difficulty table whose tier the owner selects at run start. Use the value form in `tools/<tool>.md`.

## Tool setup actions

Before writing, perform any **Setup actions** in `tools/<tool>.md`. Get the owner's confirmation before an action writes files.

## Write

1. Show the proposed changes and get the owner's confirmation. Resolve every required answer before writing a complete file.
2. Write human-readable `.rp.md` with frontmatter `conventions: 1`, shared fact sections, and a section headed by the active tool's name for its project facts.
3. With permission, add the worktree folder root to `.gitignore`.
4. Commit the files to the repository selected for artifacts and report completion.

## Migration

1. Read `changelog.md`. The project's version is its stamp, or 0 when absent.
2. Walk every later entry in order. With owner confirmation for each action: apply heading renames mechanically; show removals, then delete them; interview new required facts; offer new optional facts.
3. Bump the stamp to the current version, then follow Write.
4. Warn that `.rp.local.md` is not rewritten; the owner must apply its corresponding changes.
