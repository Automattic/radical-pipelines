# Load project conventions

Tool mechanics live in the skill. Project facts live in the project files and reach agents only through filled prompt slots.

## Sources

Resolve the main root worktree-aware: `dirname(git rev-parse --git-common-dir)`. Read in this order, from lowest to highest precedence:

1. `tools/<active tool>.md` from the skill: spawn, seat, address, terminate, health-loop, and model mechanics.
2. `.rp.md` from the main root: its shared sections and the active tool's section. Ignore other tool sections.
3. `.rp.local.md` from the main root, when present. This git-ignored file overrides matching project facts in memory; unmentioned facts retain their `.rp.md` values.

## Conventions

| Convention            | What it covers                                                                                                                        | Required |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Issues                | Issue trackers; read, create, modify, and comment operations; the canonical issue-reference format for `Origin:` lines              | Yes      |
| Branch naming         | How a pipeline branch and slug derive from its issue; a valid git ref containing no `_`                                               | Yes      |
| Pipelines folder root | The root containing pipeline folders; default `.pipelines/`                                                                           | No       |
| Worktree folder root  | The root containing worktrees                                                                                                         | Yes      |
| Commit format         | Commit message rules                                                                                                                   | No       |
| PR format             | Pull request title and description rules                                                                                               | No       |
| Guardrails            | Rules agents must satisfy                                                                                                              | No       |
| Lifecycle hooks       | Instructions run at defined moments                                                                                                    | No       |
| Policy defaults       | Review lanes and charters per artifact; audit and valve thresholds overriding the loop's defaults                                     | No       |
| Agent models          | Model and settings per profile, inside the active tool's section                                                                       | No       |

## Schema stamp

The `.rp.md` frontmatter line `conventions: <N>` records the schema version. The current version is 1.

- Equal: check completeness.
- Absent or older: read `setup.md` § Migration. An absent `.rp.md` uses Fresh setup.
- Newer: stop and tell the owner to update the skill.

## Completeness

Check the merged project facts. When a required row is missing, offer setup. If the owner declines, stop and explain what is missing.

Finally, read `lifecycle-hooks.md`.
