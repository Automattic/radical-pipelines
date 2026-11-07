origin: issue 369
origin: starts-from 368-certification-out-of-files

# Make project conventions data and have rp write each role's assignment

## Goal

The orchestrator copies no project convention by hand. The conventions a role's assignment carries are data in `.rp.md`, and `rp` writes each role's whole assignment from them and from the pipeline.

## Constraints

intent-constraint-1: Prose stays prose where its reader acts on it with judgment: the Issues procedure, every lifecycle hook's instructions, and the PR format are read by the orchestrator, as today. The text of each guardrail and resource stays free prose inside its data entry.

intent-constraint-2: `rp` copies model names as the project writes them. The orchestrator resolves a model name with its tool when it spawns a role, and a role resolves its subagent model with its tool when it delegates. `rp` knows nothing of the active agentic tool.

intent-constraint-3: A convention's text may contain variables. `rp` expands a fixed vocabulary of pipeline facts — such as the pipeline slug, the role, its profile and lane, its worktree, its branch, and the base — and the variables a project declares as templates over that vocabulary. A placeholder that neither defines reaches the role unexpanded, with the vocabulary's values listed in its assignment, and the role substitutes it.

intent-constraint-4: `.rp.md` stays readable by a person. Its data part is validated: a malformed entry stops `rp`, naming the entry.

intent-constraint-5: The conventions version increases, and setup migrates a project's `.rp.md` from version 6, this repository's included.

intent-constraint-6: An agent profile still references no skill file: everything a role needs reaches it through its assignment.

## Context

intent-context-1: Today the orchestrator reads `.rp.md` as prose, picks the guardrail and resource blocks whose `agents` include the role's profile, copies them, looks up the profile's or lane's model and subagent model, computes the role's paths, and fills a template of a dozen slots. It is the costliest step of the loop in context and the one most exposed to error, and it is wholly mechanical once the data is structured.

intent-context-2: An earlier attempt had `rp` find those blocks by parsing the prose sections under their headings; it was reverted, because headings in prose are not a data format.

intent-context-3: Projects write variables into convention text that the orchestrator substitutes. One project's resources name a per-agent environment as `{agent}`, which one of its lifecycle hooks defines in prose as `<pipeline slug>-<profile>[-<lane>]`.

intent-context-4: The agentic tools find a model by a plain name such as `opus` or a provider's model name when a role delegates to a subagent.

intent-context-5: This change starts from the change that keeps `rp`'s certification out of the pipeline files and gives role-written files a flat YAML frontmatter.

## Proposals

intent-proposal-1: The data part of `.rp.md` is its JSON frontmatter, which already holds the conventions version, or a JSON file beside it.

intent-proposal-2: `rp` writes the assignment where the role reads it today, and fills every slot the templates define.
