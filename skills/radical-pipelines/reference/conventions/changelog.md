# Conventions changelog

One entry per schema version. The delta migration in `load.md` walks the span between a project's `conventions:` stamp and the current version, applying each entry's actions with the owner's approval.

## Version 1

Baseline of the versioned schema. Migration from a pre-versioned `.rp.md`:

| Change | Action |
| --- | --- |
| Rename: **Branch name base** → **Branch naming** | Mechanical rename |
| Rename: **Pipeline family folder** → **Pipelines folder root** | Mechanical rename; the value becomes the root folder only (per-pipeline folders are labeled from the branch base) |
| Rename: **Worktree root** → **Worktree folder root** | Mechanical rename |
| Rename: **Team spawning** → **Agent spawning** | Mechanical rename |
| Rename: **Agent models** → **Policy defaults** | Mechanical rename; existing model tables remain valid values |
| New required: **Issues** gains the canonical issue-reference format | Interview: the exact string form written into origin frontmatter (for example `TEAM-123`) |
| Stamp | Add frontmatter `conventions: 1` |
