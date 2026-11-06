---
"@automattic/radical-pipelines": minor
---

BREAKING: Make the conventions an assignment carries data in `.rp.md`, and have `rp assign` write each role's whole assignment.

The commit format, guardrails, resources, agents, and variables are named entries in `.rp.md`'s JSON frontmatter, with each guardrail's and resource's text free prose inside its entry; every other convention stays a prose section the orchestrator reads. Before every spawn and wake, the orchestrator runs `rp assign <pipeline folder> --role <role>`, which validates all of that data, with a developer's `.rp.local.md` overriding it entry by entry, computes the role's turn from the frontier, fills its template, writes the assignment where the role reads it, and prints its path and the role's model. On a reviewer's later turn it also writes the diff the reviewer reads. A malformed entry stops it, naming the file and the entry, and it writes nothing. The orchestrator copies no convention, path, or model into an assignment.

Model names travel as the project writes them, such as `sonnet`: the orchestrator resolves a role's model through its tool when it spawns it, and a role runs its subagents on the model its tool finds by its subagent model name, or on its own model when the tool finds none.

Guardrail, resource, commit-format, and brief texts may name pipeline facts in braces — `{pipeline-slug}`, `{role}`, `{profile}`, `{lane}`, `{worktree}`, `{branch}`, `{base}` — and variables a project declares over them, such as `"agent": "{pipeline-slug}-{role}"`, which `rp assign` expands for each role. A placeholder that names neither reaches the role as written, with those facts listed in its assignment.

The conventions version and the pipeline format become 8. Setup migrates a `.rp.md` by moving those conventions into the frontmatter and offering a variable for each placeholder their texts use; apply the same move to `.rp.local.md` by hand. `run-config.md` replaces `lanes` with `agents`, in the schema of `.rp.md`'s, and records the models the owner confirmed. Pipelines of format 7 are history: `rp pipelines` lists them, and work on their issue starts a new pipeline.
