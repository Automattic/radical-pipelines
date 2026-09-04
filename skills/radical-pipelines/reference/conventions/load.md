# Load project conventions

Tool mechanics live in the skill. Project facts live in the project files and reach agents only through filled prompt slots.

## Sources

Resolve the main root worktree-aware: `dirname(git rev-parse --git-common-dir)`. Read in this order, from lowest to highest precedence:

1. `tools/<active tool>.md` from the skill: spawn, seat, address, terminate, health-loop, and model mechanics.
2. `.rp.md` from the main root: its shared sections and the active tool's section — `## <Tool>` inline, or the sidecar `.rp.<tool>.md` it names. Ignore other tools.
3. `.rp.local.md` from the main root, when present. This git-ignored file overrides matching project facts in memory; unmentioned facts retain their `.rp.md` values.

## Conventions

| Convention            | What it covers                                                                                                                        | Required |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Issues                | Issue trackers; read, create, modify, and comment operations; the canonical issue-reference format for `Origin:` lines              | Yes      |
| Branch naming         | How a pipeline branch and slug derive from its issue; a valid git ref containing no `_`                                               | Yes      |
| Pipelines folder root | The root containing pipeline folders; default `.pipelines/`                                                                           | No       |
| Artifact storage      | Whether `.rp.md` and the pipelines folder live in the project's repository (`artifacts-in-repo`, the default) or a fork (`artifacts-in-fork`), and the artifact base branch: the branch pipelines start from and count their own commits after — the repository's main branch, or the fork's base branch, declared | No       |
| Worktree folder root  | The root containing worktrees                                                                                                         | Yes      |
| Commit format         | Commit message rules; absent, an imperative subject line                                                                              | No       |
| PR format             | Pull request title and description rules                                                                                               | No       |
| Guardrails            | Rules agents must satisfy                                                                                                              | No       |
| Lifecycle hooks       | Instructions run at defined moments                                                                                                    | No       |
| Agents                | Model per profile and the lanes it adds, with their briefs and materials (`agents.md`)                                                 | No       |
| Thresholds            | Audit and valve thresholds overriding `rp check`'s defaults                                                                           | No       |

## Schema stamp

The `.rp.md` frontmatter line `conventions: <N>` records the schema version. The current version is 1.

- Equal: check completeness.
- Absent or older: read `setup.md` § Migration. An absent `.rp.md` uses Fresh setup.
- Newer: stop and tell the owner to update the skill.

## Completeness

Check the merged project facts. When a required row is missing, offer setup. If the owner declines, stop and explain what is missing.

Finally, read `lifecycle-hooks.md`.
