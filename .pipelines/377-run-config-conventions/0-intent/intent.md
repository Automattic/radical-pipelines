---
issue: 377
---

# Keep .rp.md as prose and have rp read every convention from the run configuration

## Goal

A project's `.rp.md` is prose a person reads and edits, and `rp` reads every convention it needs from the run configuration, which the orchestrator records from that prose when a run starts.

## Constraints

intent-constraint-1: `.rp.md` holds prose sections only. Its frontmatter is flat YAML holding only `conventions`, the conventions version, which stays 7. Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables return to prose sections.

intent-constraint-2: The run configuration is `run-config.json`, a JSON file with no prose body, at the pipeline folder root. It holds everything `rp` reads about the run: the target phase, the base, the agents, the worktree folder root, the landing commit, the commit format, the guardrails, the resources, and the variables. `rp` reads neither `.rp.md` nor `.rp.local.md`.

intent-constraint-3: `run-config.json` holds `owner-directions`, a list of strings: the owner's directions for the run, one entry per direction, added as they are given. `rp` accepts it and does not act on it.

intent-constraint-4: `run-config.local.json`, beside `run-config.json`, holds what the orchestrator recorded from `.rp.local.md` and overrides `run-config.json` by name. It is never committed: setup adds its name to `.gitignore`, and `rp` stops when it is tracked. It cannot hold the target phase, the base, or a lane, so the frontier is the same on every clone and at every commit.

intent-constraint-5: The orchestrator copies each text into the run configuration verbatim: a guardrail's rule, a resource's text, the commit format, a lane's brief. It selects and associates; it never summarizes or rewords. The skill states this plainly. `rp` does not check it.

intent-constraint-6: The orchestrator records the run configuration at every run start: what it derives from `.rp.md` and `.rp.local.md` is rewritten then, and at no other moment. The agents, the target phase, and the base change only when the owner asks.

intent-constraint-7: A pipeline carries no version. `rp` reads a pipeline as the current skill defines it, and what it cannot read stops it, naming the file and the reason. The pipeline `format`, the notion of an earlier format, and every reader of one are removed.

intent-constraint-8: `rp` gains no dependency and no new parser. The flat YAML frontmatter of role-written files stays as it is.

intent-constraint-9: Nothing migrates the conventions data that version 7 held in `.rp.md`'s frontmatter, which was never released, nor any existing pipeline. This repository's `.rp.md` is rewritten as prose once.

## Context

intent-context-1: #369 moved the conventions an assignment carries into `.rp.md`'s JSON frontmatter so `rp` could write each role's assignment. That half holds: `rp` still writes every assignment and expands placeholders. The other half cost readability and flexibility: multi-line texts became lists of JSON strings, the file mixes JSON and prose, and `agents` allows one table where a project used to keep one per agentic tool.

intent-context-2: `run-config.md` already carries JSON frontmatter with the run's `agents`, and `rp` already takes each role's models and lanes from it, not from `.rp.md`. Of `.rp.md`'s `agents`, `rp` only validates.

intent-context-3: Recording the conventions per run also means editing `.rp.md` cannot silently change a run under way, and a pipeline keeps the configuration it ran under.

intent-context-4: Today `rp next` and `rp land` read `.rp.local.md` from the main checkout, uncommitted. Recorded in the committed run configuration, its values would reach the pipeline branch; hence the local file.

intent-context-5: The owner has continued and declined old pipelines without ever needing the version comparison: the error of a file that cannot be read was enough.

intent-context-6: #372 removes the readers of obsolete formats. Removing the pipeline version here covers the same readers.

<details>
<summary>Agent notes</summary>

Observed on `v4`, tip `e2fc6d9e`:

- `skills/radical-pipelines/scripts/rp.mjs`: `parseConventions` and `readConventions` read `.rp.md` and `.rp.local.md` from the main checkout and merge them by name; `parseConfig` reads `run-config.md`'s JSON frontmatter (`format`, `target-phase`, `base`, `agents`); `formatOf`, `requireFormat`, and `FORMAT` implement the pipeline version; `pipelineFoldersIn` recognizes folders of earlier formats.
- `rp` uses the conventions in three places: the assignment (commit format, guardrails, resources, variables, brief), the lane worktree paths (`worktree-folder-root`), and the landing commit message (`landing-commit`).
- The body of `run-config.md` is free prose today: the target in words and the owner's directions.
- Prose that describes the current split: `reference/conventions/load.md`, `setup.md`, `agents.md`, `guardrails.md`, `resources.md`, `changelog.md` entry 7; `reference/entries/triage.md` step 4; `reference/run/state.md` § Run configuration and § Discovery; `scripts/README.md` § `run-config.md`, § `pipelines`, § Conventions data; `templates/README.md`; `docs/`; `README.md`; the changeset `conventions-as-data.md`.

</details>

## Proposals

intent-proposal-1: A folder of the pipelines folder root is a pipeline folder when it holds `run-config.json`; any other folder is not a pipeline for `rp`. Observe what triage then does for an issue that has only an older pipeline folder, and when a new pipeline's slug names a folder that already exists.

intent-proposal-2: The run confirmation lists each guardrail and resource by name under the profiles it binds, so the owner sees an omission before the run starts.
