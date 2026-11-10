# Load project conventions

Tool mechanics live in the skill. Project facts live in the project files and reach agents only through the assignments `rp next --apply` writes.

## Sources

Find the repository's main root, even when running inside a worktree. Read in this order, from lowest to highest precedence:

1. `tools/<active tool>.md` from the skill, when present: spawn, seat, address, terminate, health-loop, and model mechanics. When the skill has no file for the active tool, those mechanics come from the tool's section in `.rp.md`, and setup asks the owner for them.
2. `.rp.md` from the main root: its frontmatter, its shared sections, and the active tool's section — `## <Tool>` inline, or the sidecar `.rp.<tool>.md` it names. Ignore other tools. A tool section written for a different tool than the active one counts as absent: offer setup for the active tool.
3. `.rp.local.md` from the main root, when present. Apply it only after the completeness check below.

## Conventions

| Convention             | What it covers                                                                                                                                                                                                                                                                                        | Required |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Issues                 | Issue trackers; read, create, modify, and comment operations; the canonical issue-reference format the intent and later inputs name as their origin                                                                                                                                                   | Yes      |
| Pipeline slug          | How the pipeline slug in `../run/state.md` § Names is derived from the issue                                                                                                                                                                                                                          | Yes      |
| Pipeline branch format | The pipeline branch as a template over `<pipeline slug>`; default `<pipeline slug>`                                                                                                                                                                                                                   | No       |
| Pipelines folder root  | The root containing pipeline folders; default `.pipelines/`                                                                                                                                                                                                                                           | No       |
| Artifact storage       | Whether `.rp.md` and the pipelines folder live in the project's repository (`artifacts-in-repo`) or a fork (`artifacts-in-fork`), and the artifact base branch — where pipelines start: the repository's main branch in `artifacts-in-repo`, or an explicitly declared branch of the fork in `artifacts-in-fork` | Yes      |
| Worktree folder root   | The root containing worktrees                                                                                                                                                                                                                                                                         | Yes      |
| Landing commit         | The template of the commits `rp land` makes; absent, their subject alone                                                                                                                                                                                                                              | No       |
| Commit format          | Commit message rules; absent, an imperative subject line                                                                                                                                                                                                                                              | No       |
| PR format              | Pull request title and description rules                                                                                                                                                                                                                                                              | No       |
| Guardrails             | Rules agents must satisfy                                                                                                                                                                                                                                                                             | No       |
| Resources              | What agents have available and how to use it                                                                                                                                                                                                                                                          | No       |
| Lifecycle hooks        | Instructions run at defined moments                                                                                                                                                                                                                                                                   | No       |
| Agents                 | Defaults for profile models and lanes (`agents.md`)                                                                                                                                                                                                                                                    | No       |
| Variables              | Placeholders the guardrail, resource, commit-format, and brief texts use, each a template over the vocabulary (`../../scripts/README.md` § Placeholders)                                                                                                                                                 | No       |
| Health monitoring      | Interval and stall threshold overriding the health loop's defaults (`health-monitoring.md`)                                                                                                                                                                                                           | No       |

Every convention is a prose section. The run configuration copies some of them verbatim (`../run/state.md` § Run configuration), so their sections bound each value and text:

- A value is one code span, whose content is the value: the worktree folder root, the landing commit template, a variable's template, and a model name.
- A text is written as its own lines, unindented and unquoted: the commit format, a guardrail's rule, a resource's text, and a lane's brief.
- An entry is a heading naming it, then its fields, one list item each — `- profiles: <profile>, <profile>…`, the profile names separated by commas, or `- model: <value>` and `- subagents: <value>` — then, when it has a text, a blank line and the text, the entry's remaining lines. Guardrails and resources (`guardrails.md`, `resources.md`), and profiles and lanes (`agents.md`), are entries.
- Worktree folder root and Landing commit: the section's body is the value. Commit format: the section's body is the text. Variables: one list item per variable, `- <name>: <template>`.

## Schema stamp

`.rp.md`'s frontmatter records the schema version in `conventions`, as the line `conventions: 7`; a file of an older version holds it in a JSON object. The current version is 7.

- Equal: check completeness.
- Absent or older: read `setup.md` § Migration. An absent `.rp.md` uses Fresh setup.
- Newer: stop and tell the owner to update the skill.

## Completeness

Check the committed `.rp.md` before merging local overrides. A complete file at the current version loads without setup. When a required row is missing, offer setup. If the owner declines, stop and explain what is missing.

After it passes, merge `.rp.local.md` over it in memory: each section and entry it holds, in the same form, overrides the committed one of its name, or adds it; unmentioned facts retain their committed values. The run configuration records the two files apart (`../run/state.md` § Run configuration).

## Tool requirements

Before the first run, perform the **Setup actions** of `tools/<tool>.md`, when it lists any; get the owner's confirmation before an action writes files. When a requirement is missing, tell the owner what to enable and stop.

Finally, read `lifecycle-hooks.md`.
