# Load project conventions

Tool mechanics live in the skill. Project facts live in the project files and reach agents only through filled prompt slots.

## Sources

Resolve the main root worktree-aware: `dirname(git rev-parse --git-common-dir)`. Read in this order, from lowest to highest precedence:

1. `tools/<active tool>.md` from the skill, when present: spawn, seat, address, terminate, health-loop, and model mechanics. Without it, the project's active tool section supplies them, and setup asks for them.
2. `.rp.md` from the main root: its shared sections and the active tool's section — `## <Tool>` inline, or the sidecar `.rp.<tool>.md` it names. Ignore other tools. A tool section written for a different tool than the active one counts as absent: offer setup for the active tool.
3. `.rp.local.md` from the main root, when present. Apply it only after the completeness check below.

## Conventions

| Convention            | What it covers                                                                                                                        | Required |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Issues                | Issue trackers; read, create, modify, and comment operations; the canonical issue-reference format for `Origin:` lines              | Yes      |
| Branch naming         | How the issue-derived slug in `../run/state.md` § Names is formed                                                                                  | Yes      |
| Pipelines folder root | The root containing pipeline folders; default `.pipelines/`                                                                           | No       |
| Artifact storage      | Whether `.rp.md` and the pipelines folder live in the project's repository (`artifacts-in-repo`) or a fork (`artifacts-in-fork`), and the artifact base branch: the branch pipelines start from and count their own commits after — the repository's main branch, or the fork's base branch, declared | Yes      |
| Worktree folder root  | The root containing worktrees                                                                                                         | Yes      |
| Commit format         | Commit message rules; absent, an imperative subject line                                                                              | No       |
| PR format             | Pull request title and description rules                                                                                               | No       |
| Guardrails            | Rules agents must satisfy                                                                                                              | No       |
| Lifecycle hooks       | Instructions run at defined moments                                                                                                    | No       |
| Agents                | Model per profile and the lanes it adds, with their briefs and materials (`agents.md`)                                                 | No       |
| Health monitoring     | Interval and stall threshold overriding the health loop's defaults (`health-monitoring.md`)                                          | No       |

## Schema stamp

The `.rp.md` frontmatter line `conventions: <N>` records the schema version. The current version is 1.

- Equal: check completeness.
- Absent or older: read `setup.md` § Migration. An absent `.rp.md` uses Fresh setup.
- Newer: stop and tell the owner to update the skill.

## Completeness

Check the committed `.rp.md` before merging local overrides. A complete file at the current version loads without setup. When a required row is missing, offer setup. If the owner declines, stop and explain what is missing.

After it passes, merge `.rp.local.md` over it in memory: matching project facts override it; unmentioned facts retain their committed values.

Finally, read `lifecycle-hooks.md`.
