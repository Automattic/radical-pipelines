# Spec: Project conventions as data, and `rp` writes each role's assignment

## Overview

Today the orchestrator builds every role's assignment by hand. It reads `.rp.md` as prose, picks the guardrail and resource blocks whose `agents` include the role's profile, copies them and the commit format, fills in any value their text leaves to it, looks up the profile's or lane's models in the run configuration, computes the role's paths, and fills the profile's template. `rp` reads no convention. The subagent model reaches the role already resolved for the active agentic tool.

After the change, the conventions an assignment carries are entries in a validated data part of the project's conventions, and `rp` writes each role's whole assignment from them and from the pipeline, at the path the role reads it from today. Model names travel as the project or the owner writes them. The orchestrator and the roles resolve them with their own tools. Convention text may hold variables: a fixed vocabulary of pipeline facts, and templates over it that the project declares. Prose the orchestrator acts on with judgment stays prose, `.rp.md` stays readable by a person, and setup migrates a version-6 `.rp.md`, this repository's included, to a conventions version above 7.

## Requirements

spec-requirement-1: Whenever a role is woken for a turn, `rp` writes that role's whole assignment to the file its profile tells it to read, `git rev-parse --git-path rp/<profile>.md` in the role's worktree, replacing the one from its previous turn. This covers `spec-producer` and `design-doc-producer` in produce, respond, and consolidate mode, at the root and in a production lane; `implementer` in implement and respond mode; and each review lane's `reviewer` on a first and a later turn. The assignment is the profile's template, or the reviewer's first-turn or later-turn request, with every slot filled as the templates and `state.md` § Names define it, every optional part with nothing dropped, and the headings and field names the role's profile refers to.

origin: from-intent intent-goal, intent-proposal-2

observed: today the orchestrator fills each template by hand (`skills/radical-pipelines/reference/run/loop.md` § Waking a role; `skills/radical-pipelines/templates/README.md`). `rp` has no command that writes an assignment or reads `.rp.md` (`1-spec/lanes/demands/spec/rp-today.txt`). Every profile reads its assignment at that path (opening lines of `agents/spec-producer.md`, `agents/design-doc-producer.md`, `agents/implementer.md`, `agents/reviewer.md`), and its profile refers to its sections by name, such as **Guardrails**, **Resources**, **Commit format**, **Subagent model**, and **Malformed files** (`agents/spec-producer.md` § Seat, § Turn, § Protocol).

spec-requirement-2: A role's assignment carries, each by name and with its text, every guardrail and every resource entry whose profiles include the role's profile, in every lane of that profile, or `none` when no entry does. Its commit format is the project's commit format text, or an imperative subject line when the project sets none. Its brief is its lane's brief, verbatim.

origin: from-intent intent-goal

observed: this is what the orchestrator copies today (`loop.md` § Waking a role; `templates/README.md`; `skills/radical-pipelines/reference/conventions/load.md` § Conventions: Commit format "absent, an imperative subject line"). This lane's hand-filled assignment carries Guardrails `none`, the `test suite and scripts` resource with its text, and `.rp.md`'s Commit format text (`1-spec/lanes/demands/spec/assignment-today.md`).

spec-requirement-3: The conventions an assignment carries are entries in a data part of the project's conventions, which `rp` reads: the guardrails, the resources, the commit format, and, for each profile and lane, its model, its subagent model, its lanes, and their briefs.

origin: from-intent intent-goal

observed: today they are prose sections of `.rp.md` (§ Agents, § Guardrails, § Resources, § Commit format), and `.rp.md`'s JSON frontmatter holds only `"conventions": 6` (`.rp.md`).

spec-requirement-4: A model name reaches the assignment exactly as the project or the owner wrote it, such as `sonnet` or `luna`. `rp` writes the same assignment for a role whichever agentic tool runs the pipeline and whatever the conventions' sections for particular tools say.

origin: from-intent intent-constraint-2

observed: today the Subagent model arrives resolved for the active tool: this lane's assignment reads `claude-agent/sonnet#xhigh` where `.rp.md` § Agents writes `sonnet` (`1-spec/lanes/demands/spec/assignment-today.md`; `.rp.opencode.md`; `skills/radical-pipelines/tools/opencode.md` § Models).

spec-requirement-5: The subagent model an assignment names is the one the run uses for the role's lane, else for its profile: the owner's choice when confirming the run, else the Agents convention's. When neither the lane nor the profile has one, it is the role's own model as the run names it. When the run names no model for the role at all, the assignment tells the role to run its subagents on its own model.

origin: derived intent-goal: the owner may change a run's models when confirming it (`skills/radical-pipelines/reference/entries/triage.md` § 4, "the configuration to confirm or change: … models"), the run configuration records them (this pipeline's `run-config.md` § Models), and a project may name no model for a profile (`load.md` § Conventions marks Agents optional; `skills/radical-pipelines/reference/conventions/agents.md`: "A profile without defaults uses your model").

observed: `agents.md` § Fields: a lane inherits its profile's subagent model unless it has its own, and without one the subagent model is the role's own model.

spec-requirement-6: When `rp` writes a role's assignment, it also tells the orchestrator which model name the role runs on for the run, as written and chosen as the subagent model is in spec-requirement-5, or that none is named. The orchestrator resolves that name with its tool when it spawns or wakes the role.

origin: derived intent-goal intent-context-1: every spawn and every wake passes the role's model (`tools/opencode.md` § Spawn, § Wake; `skills/radical-pipelines/tools/claude-code.md` § Spawn).

observed: today the orchestrator looks the model up in `run-config.md`'s body (`loop.md` § Waking a role).

spec-requirement-7: A role that delegates resolves the subagent model name its assignment gives with its own tool, and runs its subagents on the model the tool finds.

origin: from-intent intent-constraint-2, intent-context-4

observed: on opencode, a role's model lookup finds `claude-agent/sonnet` and `github-copilot/claude-sonnet-5.5` for `sonnet`, and `openai/gpt-6-luna` and `github-copilot/gpt-6-luna` for `luna` (`1-spec/lanes/demands/spec/opencode-models-lookup.json`). Today each profile passes the Subagent model as each subagent's model, unresolved (`agents/spec-producer.md` § Seat).

spec-requirement-8: When a role's tool finds no model by the subagent model name its assignment gives, the role's subagents run on the role's own model.

origin: derived intent-constraint-2: this repository runs reviewer lane `astra`, with subagents `luna`, under Claude Code, which runs only the aliases `opus`, `sonnet`, `haiku`, and `fable` (`.rp.claude-code.md`: "`astra` and `luna` name OpenAI models, which Claude Code cannot run: use `sonnet` for both"; `tools/claude-code.md` § Models).

spec-requirement-9: In every convention text an assignment carries, `rp` replaces each variable that names a vocabulary fact with that fact's value for the role and its turn, and each variable the project declares with the value of its template over the vocabulary for that role. The vocabulary holds at least the pipeline slug, the role (`<profile>[-<lane>]`), its profile, its lane, its worktree's absolute path, its branch, and the base, `run-config.md`'s `base`. A declared template gives a role with a lane and a role without one their own values: `<pipeline slug>-<profile>[-<lane>]` gives `369-conventions-as-data-implementer` for this pipeline's implementer and `369-conventions-as-data-reviewer-astra` for its reviewer lane `astra`.

origin: from-intent intent-constraint-3, intent-context-3

observed: today the orchestrator fills these values by hand, "filling in any value the block's text leaves to you" (`loop.md` § Waking a role).

spec-requirement-10: A placeholder in a carried convention text that names neither a vocabulary fact nor a declared variable reaches the role as written. The role's assignment then lists every vocabulary fact with its value for that role and turn, and the role substitutes the placeholder from them.

origin: from-intent intent-constraint-3

spec-requirement-11: Every `rp` command that reads the conventions' data part validates all of it, including entries that concern other roles and a local override's entries. On a malformed entry, it stops with a non-zero exit, writes no assignment, and names the entry: its convention, its name, and what is malformed. A data part that cannot be parsed stops it the same way, naming the file and where parsing failed.

origin: from-intent intent-constraint-4

observed: today `rp` reads no convention (`1-spec/lanes/demands/spec/rp-today.txt`). Its other inputs follow the same rule: a missing or malformed `run-config.md` stops `check` (`skills/radical-pipelines/scripts/README.md` § `run-config.md`).

spec-requirement-12: `.rp.md` stays a document a person reads without a tool. Each data entry reads in the file under its name, and each guardrail's and resource's text is free prose inside its entry. The Issues procedure, every lifecycle hook's instructions, and the PR format stay prose sections of `.rp.md` that the orchestrator reads and acts on as today.

origin: from-intent intent-constraint-1, intent-constraint-4

observed: today `.rp.md` is Markdown prose under a JSON frontmatter that holds only the version (`.rp.md`).

spec-requirement-13: The current conventions version is higher than 7, the version the base records. The skill's loader treats a `.rp.md` at version 6 or 7 as older and runs setup's migration. With the owner confirming each action, migration writes the new version, moves every convention an assignment carries into the data part with its values and texts unchanged, and leaves every other section as it was. This repository's `.rp.md`, at version 6, migrates this way, and `rp` then writes every role's assignment from it without stopping.

origin: from-intent intent-constraint-5

observed: `load.md` § Schema stamp names 7 as current, and `skills/radical-pipelines/reference/conventions/changelog.md` § 7 migrates from 6 without changing any section. This repository's `.rp.md` records `"conventions": 6` and writes its Agents convention as free-form lists and sentences, with lanes `demands` and `omits` carrying briefs and reviewer lanes `default` and `astra` without (`.rp.md` § Agents).

spec-requirement-14: When a version-6 `.rp.md` carries convention text that uses a variable another of its sections defines in prose, migration offers the owner to declare that variable with the prose definition as its template. Once it is declared, every role receives that text expanded as the orchestrator expanded it before.

origin: derived intent-constraint-5 intent-context-3: a project's resources name a per-agent environment as `{agent}`, which one of its lifecycle hooks defines in prose as `<pipeline slug>-<profile>[-<lane>]`.

spec-requirement-15: When setup writes a new `.rp.md`, or adds a missing convention to one, it writes each convention an assignment carries as data entries.

origin: derived intent-goal: a project without `.rp.md` goes through Fresh setup, which offers Guardrails, Resources, Commit format, and Agents (`skills/radical-pipelines/reference/conventions/setup.md` § Fresh setup).

spec-requirement-16: To wake or spawn a role, the orchestrator has `rp` write the role's assignment and sends the wake message. It copies no convention, model name, brief, path, or other slot value into an assignment, and leaves the file `rp` wrote unedited.

origin: from-intent intent-goal

observed: today the orchestrator writes every slot (`loop.md` § Waking a role).

spec-requirement-17: No agent profile references a skill file or `.rp.md`. A role acts on its turn from its profile and its assignment alone, including the vocabulary values and how to use its subagent model name.

origin: from-intent intent-constraint-6

observed: today each profile names only its assignment's path and the assignment's sections (`agents/*.md`).

spec-requirement-18: `rp` writes an assignment from the conventions the orchestrator loads: the main checkout's `.rp.md`, with a developer's `.rp.local.md` there overriding it entry by entry, whichever worktree the role is seated in.

origin: derived intent-goal: a developer's git-ignored `.rp.local.md` overrides conventions for their working copy (`README.md`: "the local file wins per named unit"; `load.md` § Sources, § Completeness), and it exists only in the main checkout: this repository's overrides Artifact storage there, and no worktree has one (`1-spec/lanes/demands/spec/rp-local-md-main-checkout.md`; `1-spec/lanes/demands/spec/rp-today.txt`).

spec-requirement-19: `rp` keeps running with Node and Git alone: reading the conventions' data needs no installed package.

origin: derived intent-goal: the skill runs `rp` as `node <this skill's folder>/scripts/rp.mjs` wherever the skill is installed (`skills/radical-pipelines/reference/run/state.md`), and the package declares no runtime dependency (`package.json` has only `devDependencies`).

observed: `scripts/README.md`: "It needs Node and Git 2.38 or later …, nothing else"; `rp.mjs` imports only `node:` modules.

spec-requirement-20: The Malformed files of a role's assignment are the `INVALID` lines `rp check` reports for the files that role writes, and only those: its artifact or candidate, and each thread it opened or owns.

origin: derived intent-goal: `rp check` reports a role-written file as `INVALID`, for example a frontmatter value outside the YAML subset `rp` reads, such as an unquoted `#368` (`scripts/README.md` § Frontmatter), and the orchestrator then wakes the file's author (`loop.md` § One step, frontier table).

## Acceptance criteria

spec-acceptance-criterion-1: Given this repository's conventions after migration, and a pipeline whose frontier wakes `spec-producer` lane `demands` in produce mode, when the lane is woken, then the file `git rev-parse --git-path rp/spec-producer.md` resolves to in the lane's worktree holds every section and field of today's hand-filled assignment for that lane (`1-spec/lanes/demands/spec/assignment-today.md`), with the same brief, Guardrails `none`, the `test suite and scripts` resource with its text, and the same commit format, and Subagent model `sonnet`.

spec-acceptance-criterion-2: Given any frontier action that wakes a role, when the role is woken, then its assignment file holds its profile's template, or the reviewer's first-turn or later-turn request, with no slot left unfilled and every optional part with nothing dropped, and its turn commit is its worktree's tip, or for a reviewer the change `rp review` printed.

spec-acceptance-criterion-3: Given this repository's conventions after migration, when the assignments of `implementer` and of reviewer lanes `default` and `astra` are written, then each carries the guardrails `tests` and `documentation` and the resource `test suite and scripts`, by name and with their texts, and the assignments of `spec-producer` and `design-doc-producer` carry Guardrails `none` and that resource.

spec-acceptance-criterion-4: Given a project whose conventions set no commit format, when any role's assignment is written, then its commit format is an imperative subject line.

spec-acceptance-criterion-5: Given this repository's conventions after migration and a run confirmed with the Agents defaults, when the assignments are written, then the Subagent model is `sonnet` for both `spec-producer` lanes, `design-doc-producer`, `implementer`, and reviewer lane `default`, and `luna` for reviewer lane `astra`. `rp` names `opus` as the model of lane `demands`, `sonnet` as that of lane `omits`, and `astra` as that of reviewer lane `astra`.

spec-acceptance-criterion-6: Given the same conventions and pipeline, when a role's assignment is written under any agentic tool, whatever the conventions' sections for particular tools say, then the assignment is the same.

spec-acceptance-criterion-7: Given a run whose owner set the `implementer`'s subagent model to `haiku` when confirming it, where the Agents convention names `sonnet`, when the implementer's assignment is written, then its Subagent model is `haiku`.

spec-acceptance-criterion-8: Given a project whose conventions name no model for `implementer`, when the implementer's assignment is written, then it tells the role to run its subagents on its own model, and `rp` names no model for the role.

spec-acceptance-criterion-9: Given an assignment whose Subagent model is `sonnet`, when the role delegates on opencode or on Claude Code, then its subagent runs a model that tool finds by `sonnet`. Given `luna` on Claude Code, when the role delegates, then its subagents run on the role's own model.

spec-acceptance-criterion-10: Given conventions that declare a variable `agent` as `<pipeline slug>-<profile>[-<lane>]`, and a resource for `implementer` and `reviewer` whose text uses it, when the assignments of pipeline `369-conventions-as-data`'s `implementer` and reviewer lane `astra` are written, then their resource text reads `369-conventions-as-data-implementer` and `369-conventions-as-data-reviewer-astra` where it used `agent`.

spec-acceptance-criterion-11: Given a guardrail or resource text that uses the vocabulary's pipeline slug, role, profile, lane, worktree, branch, or base, when a role's assignment is written, then each reads that role's value for its turn.

spec-acceptance-criterion-12: Given a carried text holding a placeholder that names neither a vocabulary fact nor a declared variable, such as `agent` in a project that has not declared it, when a role's assignment is written, then the text keeps the placeholder as written, and the assignment lists each vocabulary fact with the role's value.

spec-acceptance-criterion-13: Given conventions data in `.rp.md` or in `.rp.local.md` with a malformed entry, such as a guardrail whose profiles name one that does not exist, or with data that does not parse, when `rp` is asked to write any role's assignment, then it exits non-zero, writes no assignment, and its message names the entry, or the file and where parsing failed.

spec-acceptance-criterion-14: Given this repository's `.rp.md` at version 6, when the skill loads its conventions and the owner confirms each migration action, then the written `.rp.md` records a version higher than 7. It holds as data every model, subagent model, lane, and brief its Agents section names, its two guardrails and its resource with their profiles and texts unchanged, and its commit format text. Its Issues, Pipeline slug, Pipelines folder root, Artifact storage, Worktree folder root, PR format, and Lifecycle hooks sections are as they were. A person opening it reads each convention, each guardrail's and resource's text under its name.

spec-acceptance-criterion-15: Given a version-6 `.rp.md` whose resource text uses `{agent}` and one of whose lifecycle hooks defines it as `<pipeline slug>-<profile>[-<lane>]`, when setup migrates it and the owner accepts declaring `agent`, then the implementer's assignment carries the resource with `<pipeline slug>-implementer` in that place, and reviewer lane `default`'s with `<pipeline slug>-reviewer-default`.

spec-acceptance-criterion-16: Given a project without `.rp.md`, when Fresh setup writes it with guardrails, resources, a commit format, and Agents, then those are data entries from which `rp` writes every role's assignment.

spec-acceptance-criterion-17: Given a frontier that wakes a role, when the orchestrator follows the skill to wake it, then the role's assignment is, byte for byte, the file `rp` wrote for that turn, and the skill's procedure gives the orchestrator no convention, model, brief, or path to copy into it.

spec-acceptance-criterion-18: Given the agent profiles after the change, then none references a skill file or `.rp.md`.

spec-acceptance-criterion-19: Given a `.rp.local.md` in the main checkout that overrides the `tests` guardrail's text, when the implementer's assignment is written in its worktree under `.worktrees/`, then its Guardrails carry the local `tests` text and the committed `documentation` guardrail.

spec-acceptance-criterion-20: Given `rp check` reports `INVALID 3-implementation/notes.md: …` and `INVALID threads/<n>-reviewer-default-implementer-implementation.md: …`, when the implementer's assignment is written, then its Malformed files lists both lines; when reviewer lane `default`'s is written, it lists only the thread's line.

spec-acceptance-criterion-21: Given a machine with Node and Git and no package installed for the skill, when `rp` writes an assignment, then it runs to completion.

## Exclusions

spec-exclusion-1: `rp` does not spawn, wake, seat, or terminate roles, create branches or worktrees, or fire lifecycle hooks; the orchestrator still does all of these.

spec-exclusion-2: `rp` resolves no model name to a model of any agentic tool.

## Considered and not required

- A pipeline whose `run-config.md` records format 7, continued after the change — no such pipeline exists: observed: format 7 is unreleased, its changeset pending in `.changeset/certification-out-of-files.md` and absent from `CHANGELOG.md`, and both pipelines in `.pipelines/` record format 6.
- A `.rp.md` at version 5 or earlier — it reaches version 6 through the existing changelog entries, which migration walks in order: observed: `setup.md` § Migration step 2; `changelog.md` § 6.
- `rp check`, `rp stamp`, `rp pipelines`, and `rp review` stopping on a malformed conventions entry — reading of intent-constraint-4 not taken: none of them reads a convention (`1-spec/lanes/demands/spec/rp-today.txt`; `scripts/README.md`), so a malformed entry stops `rp` wherever the data is read.
- Data for the conventions no assignment carries as text — Issues, Pipeline slug, Pipeline branch format, Pipelines folder root, Artifact storage, Worktree folder root, Health monitoring, and the sections for particular tools — the Goal names only the conventions an assignment carries, and spec-requirement-1 covers the values an assignment derives from them.
- The vocabulary's base as the merge-base commit rather than `run-config.md`'s `base` — reading of intent-constraint-3 not taken: the implementer's assignment already names `run-config.md`'s `base` as its Base branch (`skills/radical-pipelines/templates/implementer.md`).
- A declared variable whose template uses another declared variable — no project shows one: intent-context-3's `agent` uses vocabulary facts only.
- `rp` writing the diff a reviewer reads on a later turn — it is a prepared file beside the assignment, not the assignment or a convention: observed: `state.md` § Names, Prepared files; `loop.md` § Review lanes step 2.
- The change committing this repository's migrated `.rp.md` — reading of intent-constraint-5 not taken: the constraint names setup as what migrates it, and setup writes `.rp.md` on the artifact base branch on the owner's confirmation (`setup.md` § Write); the base left this repository's `.rp.md` at version 6 the same way (`.pipelines/368-certification-out-of-files/3-implementation/notes.md`).
- A role stopping with a blocker when its tool finds no model by its subagent model name — not taken: this repository runs reviewer lane `astra` with subagents `luna` under Claude Code, which cannot run `luna`, and running on the role's own model keeps that lane delegating as `.rp.claude-code.md` intends.
- The subagent model taken from the Agents convention alone, whatever the run says — reading not taken: the owner sets a run's models when confirming it (`triage.md` § 4).
- Migrating a developer's `.rp.local.md` — setup warns that it is not rewritten (`setup.md` § Migration step 4), and the only one observed overrides Artifact storage, which no assignment carries (`1-spec/lanes/demands/spec/rp-local-md-main-checkout.md`).

## Open assumptions

spec-assumption-1: On Claude Code, a role that passes `sonnet` as a subagent's model runs that subagent on Sonnet — assumed: a role delegating on Claude Code with Subagent model `sonnet`; `tools/claude-code.md` § Models documents the aliases, and this seat cannot run Claude Code.

spec-assumption-2: Where its tool finds several models by one name, such as `sonnet` or `luna` on opencode, a role runs the one its tool points it to — assumed: a role on a `claude-agent` model delegating with `sonnet` on opencode runs `claude-agent/sonnet`, as the lookup's "Check your own provider first" directs (`1-spec/lanes/demands/spec/opencode-models-lookup.json`).
