# Load project conventions

Tool mechanics live in the skill. Project facts live in the project files and reach roles only through the assignments `rp next --apply` writes.

## Sources

Find the repository's main root, even when running inside a worktree. Read:

1. `tools/<active tool>.md` from the skill, when present: spawn, seat, address, terminate, health-loop, and model mechanics. When the skill has no file for the active tool, those mechanics come from `.rp.md`, and setup asks the owner for the ones it lacks.
2. `.rp.md` from the main root.
3. `.rp.local.md` from the main root, when present: overrides of `.rp.md`. Apply them only after the completeness check below.

## Conventions

| Convention             | What it covers                                                                                                                                                                                                                                                                                        | Required |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Issues                 | Issue trackers; read, create, modify, and comment operations; the canonical issue-reference format the intent and later inputs name as their origin                                                                                                                                                   | Yes      |
| Pipeline slug          | How the pipeline slug in `../run/state.md` § Names is derived from the issue                                                                                                                                                                                                                          | Yes      |
| Pipeline branch format | The pipeline branch as a template over `<pipeline slug>`; default `<pipeline slug>`                                                                                                                                                                                                                   | No       |
| Pipelines folder root  | The root containing pipeline folders; default `.pipelines/`                                                                                                                                                                                                                                           | No       |
| Artifact storage       | Whether `.rp.md` and the pipelines folder live in the project's repository (`artifacts-in-repo`) or a fork (`artifacts-in-fork`), and the artifact base branch — where pipelines start: the repository's main branch in `artifacts-in-repo`, or an explicitly declared branch of the fork in `artifacts-in-fork` | Yes      |
| Worktree folder root   | The root containing worktrees                                                                                                                                                                                                                                                                         | Yes      |
| Commit format          | Commit message rules; absent, an imperative subject line                                                                                                                                                                                                                                              | No       |
| PR format              | Pull request title and description rules                                                                                                                                                                                                                                                              | No       |
| Guardrails             | Rules roles must satisfy                                                                                                                                                                                                                                                                              | No       |
| Resources              | What roles have available and how to use it                                                                                                                                                                                                                                                           | No       |
| Lifecycle hooks        | Instructions run at defined moments                                                                                                                                                                                                                                                                   | No       |
| Lanes                  | The lanes each profile runs and their briefs (`lanes.md`)                                                                                                                                                                                                                                             | No       |
| Models                 | The model and subagent model of each profile and lane (`models.md`)                                                                                                                                                                                                                                   | No       |
| Variables              | Placeholders the guardrail, resource, commit-format, and brief texts use, each a template over the pipeline facts (`../../scripts/README.md` § Placeholders)                                                                                                                                            | No       |
| Health monitoring      | Interval and stall threshold overriding the health loop's defaults (`health-monitoring.md`)                                                                                                                                                                                                           | No       |

## Conventions version

`.rp.md`'s frontmatter records the conventions version in `conventions`. The current version is 7, written as the line `conventions: 7`.

- Equal: check completeness.
- Absent or older: read `setup.md` § Migration. An absent `.rp.md` uses Fresh setup.
- Newer: stop and tell the owner to update the skill.

## Completeness

Check `.rp.md` before applying `.rp.local.md`. A complete file at the current version loads without setup. When a required row is missing, offer setup. If the owner declines, stop and explain what is missing.

## Tool requirements

Before the first run, perform the **Setup actions** of `tools/<tool>.md`, when it lists any; get the owner's confirmation before an action writes files. When a requirement is missing, tell the owner what to enable and stop.

Finally, read `lifecycle-hooks.md`.
