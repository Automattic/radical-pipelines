# Spec: Project conventions as data, and `rp` writes each role's assignment

## Overview

Today the orchestrator builds every role's assignment by hand. It reads `.rp.md` as prose, picks the guardrail and resource blocks whose `agents` include the role's profile, copies them and the commit format, fills in any value their text leaves to it, looks up the role's subagent model and resolves it for the active agentic tool, computes the role's paths, and fills the profile's template. `rp` reads no convention and writes no assignment.

After the change, the conventions an assignment carries are validated data entries in `.rp.md`, which a person still reads, and `rp` writes each role's whole assignment from them and from the pipeline, at the path the role reads it from today. Model names travel as the project or the owner writes them, and the orchestrator and the roles resolve them with their own tools. Guardrail, resource, and commit-format texts may hold variables, which `rp` expands from a fixed vocabulary of pipeline facts and from templates the project declares over it. Prose the orchestrator acts on with judgment stays prose. The conventions version increases, and setup migrates a version-6 `.rp.md`, this repository's included.

## Requirements

spec-requirement-1: When the orchestrator wakes or spawns a role for a turn, `rp` has written that role's whole assignment to the file the role's profile tells it to read, the one `git rev-parse --git-path rp/<profile>.md` resolves to in the role's worktree, replacing the one from the role's previous turn. This holds for `spec-producer` and `design-doc-producer` in produce, respond, and consolidate mode, at the root and in a production lane; for `implementer` in implement and respond mode; and for each review lane's `reviewer` on a first and a later turn. The assignment is the profile's template, or the reviewer's first-turn or later-turn request, with every slot filled, every optional part that has nothing dropped, and the headings and field names the role's profile refers to.

origin: from-intent intent-goal, intent-proposal-2

observed: `node skills/radical-pipelines/scripts/rp.mjs` lists `check`, `stamp`, `pipelines`, and `review`, none of which writes an assignment, and `rp.mjs` names neither `.rp.md` nor `.rp.local.md` (`1-spec/spec/rp-today.txt`). The orchestrator fills each template by hand (`skills/radical-pipelines/reference/run/loop.md` § Waking a role; `skills/radical-pipelines/templates/README.md`). Each profile reads its assignment at that path and refers to its sections by name, such as **Subagent model**, **Malformed files**, **Guardrails**, and **Commit format** (`agents/spec-producer.md` § Role, § Seat, § Protocol).

spec-requirement-2: Each slot an assignment fills from the pipeline holds the value the skill defines for it today:

- Turn commit: the tip of the role's worktree when the assignment is written; for a reviewer, the change `rp review` printed for its lane.
- Mode: the one the frontier calls for the role.
- Materials: explicit paths for the mode — the intent, the spec, the design doc, the later inputs, each changed input with the last commit that changed the role's artifact, and each lane's id with its candidate.
- Threads addressed to you: the threads `rp check` reports awaiting the role, or `none`.
- Malformed files: the `INVALID` lines `rp check` reports for the files the role writes — its artifact or candidate, and each thread it is a party to — and only those.
- Worktree, Branch, Supporting folder, and Write to: the role's, as the skill names them.
- The implementer's Base branch: `run-config.md`'s `base`.
- A reviewer's request: the first-turn request when its lane has no open review thread, else the later-turn request, naming the lane's branch and review base as `rp review` printed them, the intent, the later inputs, the lane's review thread, and on a later turn the diff of what changed since the reviewer's last message.

origin: from-intent intent-goal

observed: `templates/README.md` and `skills/radical-pipelines/templates/*.md` define the slots, and `loop.md` § Waking a role, § Production lanes, § Review lanes, and `skills/radical-pipelines/reference/run/state.md` § Names, § Terms define their values. `loop.md`'s frontier table wakes a file's author with **Malformed files** filled, and `rp check` reports a role-written file as `INVALID`, for example for an unquoted `#368` value (`state.md` § Frontmatter).

spec-requirement-3: The conventions an assignment carries are data entries in `.rp.md`, which `rp` reads: each guardrail and each resource, with its name, its text, and the profiles it is for; the commit format; each profile's and each lane's model and subagent model; each profile's lanes with their briefs; and the variables the project declares.

origin: from-intent intent-goal

observed: `.rp.md` holds the Commit format, Agents, Guardrails, and Resources as prose under headings, and its JSON frontmatter holds only `"conventions": 6` (`.rp.md`).

spec-requirement-4: A role's assignment carries, each under its name and with its text, every guardrail and every resource whose profiles include the role's profile, the same in every lane of that profile, or `none` when no entry does. Its commit format is the project's commit format text, or an imperative subject line when the project sets none. A lane's brief reaches its assignment verbatim.

origin: from-intent intent-goal

observed: this is what the orchestrator copies today (`loop.md` § Waking a role; `templates/README.md`; `skills/radical-pipelines/reference/conventions/load.md` § Conventions, Commit format "absent, an imperative subject line"; `skills/radical-pipelines/reference/conventions/agents.md` § Fields, "A brief is copied verbatim into the lane's assignment"). The hand-filled assignment of spec-producer lane `demands` carries Guardrails `none`, the `test suite and scripts` resource with its text, and `.rp.md`'s commit format text (`1-spec/spec/assignment-today.md`).

spec-requirement-5: Every model name reaches an assignment exactly as the project or the owner wrote it, such as `sonnet`, `luna`, or `openai/gpt-6-astra#high`. `rp` resolves no model name, and it writes the same assignment for a role whichever agentic tool runs the pipeline and whatever the conventions' sections for particular tools say.

origin: from-intent intent-constraint-2

observed: today the Subagent model arrives resolved for the active tool: the `demands` lane's assignment reads `claude-agent/sonnet#xhigh` where `.rp.md` § Agents writes `sonnet` and `.rp.opencode.md` maps `sonnet` to that string (`1-spec/spec/assignment-today.md`; `skills/radical-pipelines/tools/opencode.md` § Models).

spec-requirement-6: The subagent model a role's assignment names is the one the owner confirmed for the role's lane, else for its profile, when confirming the run; by default it is the Agents convention's, where a lane without its own takes its profile's. When the run gives the role none, the assignment tells the role to run its subagents on its own model.

origin: derived intent-goal: the owner confirms or changes a run's models when confirming it (`skills/radical-pipelines/reference/entries/triage.md` § 4, "the configuration to confirm or change: … models"), the run configuration records a model and a subagent model for each profile and lane (this pipeline's `run-config.md` § Models), and a project may name no model for a profile (`load.md` § Conventions marks Agents optional; `agents.md`, "A profile without defaults uses your model").

observed: `agents.md` § Fields: a lane inherits its profile's subagent model unless it has its own, and without one the subagent model is the role's own model.

spec-requirement-7: The orchestrator spawns and wakes each role on the model name the run gives its lane, else its profile, resolving that name for the active tool when it spawns or wakes the role. When the run gives the role none, the role runs on the orchestrator's own model.

origin: from-intent intent-constraint-2

observed: today `run-config.md`'s body records each role's model already resolved for the active tool, such as `claude-agent/opus#xhigh`, and the orchestrator passes it as recorded (`loop.md` § Waking a role; `tools/opencode.md` § Models; this pipeline's `run-config.md` § Models); a profile without a model uses the orchestrator's (`agents.md`, "A profile without defaults uses your model").

spec-requirement-8: A role that delegates resolves the subagent model name its assignment gives with its own tool, and runs its subagents on the model the tool finds.

origin: from-intent intent-constraint-2, intent-context-4

observed: on opencode, a role's model search finds `claude-agent/sonnet` and `github-copilot/claude-sonnet-5.5` by `sonnet`, `openai/gpt-6-luna` and `github-copilot/gpt-6-luna` by `luna`, and `openai/gpt-6-astra` by `astra` (`1-spec/spec/opencode-models-lookup.json`). Today each profile passes the Subagent model as each subagent's model, as given (`agents/spec-producer.md` § Seat).

spec-requirement-9: When a role's tool finds no model by the subagent model name its assignment gives, the role's subagents run on the role's own model.

origin: derived intent-constraint-2: this repository runs reviewer lane `astra` with subagents `luna` (`.rp.md` § Agents), and for Claude Code, which runs only the aliases `opus`, `sonnet`, `haiku`, and `fable` (`skills/radical-pipelines/tools/claude-code.md` § Models), `.rp.claude-code.md` directs: "`astra` and `luna` name OpenAI models, which Claude Code cannot run: use `sonnet` for both".

spec-requirement-10: In every guardrail, resource, and commit-format text an assignment carries, a placeholder is a name in braces, as a project writes `{agent}`. `rp` replaces each placeholder that names a vocabulary fact with that fact's value for the role and its turn, and each placeholder that names a variable the project declares with the value of the variable's template over the vocabulary for that role. The vocabulary holds the pipeline slug; the role, `<profile>` or `<profile>-<lane>`; its profile; its lane; its worktree's absolute path; its branch; and the base, `run-config.md`'s `base`. A declared template gives a role with a lane and a role without one each its own value: `<pipeline slug>-<profile>[-<lane>]` gives `369-conventions-as-data-implementer` for this pipeline's implementer and `369-conventions-as-data-reviewer-astra` for its reviewer lane `astra`.

origin: from-intent intent-constraint-3, intent-context-3

observed: today the orchestrator fills such values by hand, "filling in any value the block's text leaves to you" (`loop.md` § Waking a role), and `rp` expands nothing (`1-spec/spec/rp-today.txt`).

spec-requirement-11: A placeholder in a carried text that names neither a vocabulary fact nor a declared variable reaches the role as written. The role's assignment then lists every vocabulary fact with its value for that role and turn, and the role substitutes the placeholder from them. An assignment whose carried texts hold no such placeholder lists no vocabulary.

origin: from-intent intent-constraint-3

spec-requirement-12: Whenever `rp` reads the conventions' data, it validates all of it: every entry, whichever roles it concerns, and every entry of a developer's `.rp.local.md`. On a malformed entry, such as a guardrail or resource without its text, or one whose profiles name anything but `spec-producer`, `design-doc-producer`, `implementer`, or `reviewer`, it writes no assignment, exits with a non-zero status, and names the entry and what is malformed. Data that cannot be parsed stops it the same way, naming the file and where parsing failed.

origin: from-intent intent-constraint-4

observed: the profiles each guardrail and resource is for are hand-written lists (`.rp.md` § Guardrails, § Resources). `rp` stops the same way on its other inputs: a missing or invalid run configuration stops `rp check` (`state.md` § The frontier).

spec-requirement-13: `.rp.md` stays a file a person reads and edits in a text editor: each data entry reads under its name, and each guardrail's and resource's text is free prose inside its entry. The Issues procedure, every lifecycle hook's instructions, and the PR format stay prose sections of `.rp.md` that the orchestrator reads and acts on as today.

origin: from-intent intent-constraint-1, intent-constraint-4

observed: today `.rp.md` is Markdown prose under a JSON frontmatter that holds only the version (`.rp.md`).

spec-requirement-14: The current conventions version is higher than 7, the one the skill records today. With the owner confirming each action, setup migrates a `.rp.md` at version 6: it records the current version, moves every convention an assignment carries into data entries with its values and texts unchanged, and leaves every other section as it was. This repository's `.rp.md` migrates this way, and `rp` then writes every role's assignment from it without stopping.

origin: from-intent intent-constraint-5

observed: `load.md` § Schema stamp names 7 as current and sends an older stamp to setup's migration, and `skills/radical-pipelines/reference/conventions/changelog.md` § 7 migrates from 6 without changing any section. This repository's `.rp.md` records `"conventions": 6` and writes its Agents convention as free-form lists and sentences, with lanes `demands` and `omits` carrying briefs and reviewer lanes `default` and `astra` without (`.rp.md` § Agents).

spec-requirement-15: When a version-6 `.rp.md` carries guardrail, resource, or commit-format text that uses a placeholder, migration offers the owner to declare it as a variable, proposing as its template the definition another section of `.rp.md` gives it in prose when one does. Once the owner declares it, every role receives that text expanded as the orchestrator expanded it before.

origin: derived intent-constraint-5 intent-context-3: a project's resources name a per-agent environment as `{agent}`, which one of its lifecycle hooks defines in prose as `<pipeline slug>-<profile>[-<lane>]`.

spec-requirement-16: When setup writes a new `.rp.md`, or adds a missing convention to one, it writes each convention an assignment carries as data entries, from which `rp` writes every role's assignment.

origin: derived intent-goal: a project without `.rp.md` goes through Fresh setup, which offers Commit format, Guardrails, Resources, and Agents (`load.md` § Schema stamp; `skills/radical-pipelines/reference/conventions/setup.md` § Fresh setup).

spec-requirement-17: To wake or spawn a role, the orchestrator has `rp` write the role's assignment and sends the message that starts the turn. It copies no convention, model name, brief, path, or other slot value into an assignment, and leaves the file `rp` wrote unedited.

origin: from-intent intent-goal

observed: today the orchestrator writes every slot (`loop.md` § Waking a role).

spec-requirement-18: No agent profile references a skill file or `.rp.md`. A role acts on its turn from its profile and its assignment alone, including the vocabulary listing and what to do with its subagent model name.

origin: from-intent intent-constraint-6

observed: today each profile names only its assignment's path and the assignment's sections (`agents/*.md`).

spec-requirement-19: `rp` writes an assignment from the conventions the orchestrator loads: the main checkout's `.rp.md`, with a developer's `.rp.local.md` there overriding it entry by entry, by name, whichever worktree the role is seated in. Entries `.rp.local.md` does not name keep their committed values.

origin: derived intent-goal: a developer's git-ignored `.rp.local.md` overrides conventions for their working copy, "the local file wins per named unit" (`README.md`; `load.md` § Sources, § Completeness), and only the main checkout holds one: this repository's overrides Artifact storage there, and none of its worktrees has one (`1-spec/spec/rp-local-md.txt`).

spec-requirement-20: `rp` writes assignments on a machine with Node and Git and no package installed for the skill.

origin: derived intent-goal: the skill runs `rp` as `node <this skill's folder>/scripts/rp.mjs` (`state.md`), and the Claude Code plugin installs the skill from the repository with no package-install step (`README.md` § Claude Code plugin install).

observed: `skills/radical-pipelines/scripts/README.md`: "It needs Node and Git 2.38 or later …, nothing else"; `rp.mjs` imports only `node:` modules (`1-spec/spec/rp-today.txt`); `package.json` declares only `devDependencies`.

## Acceptance criteria

spec-acceptance-criterion-1: Given this repository's conventions after migration, and a frontier that wakes spec-producer lane `demands` in produce mode, when the lane is woken, then its assignment file holds every section and field of the assignment the orchestrator filled by hand for that lane (`1-spec/spec/assignment-today.md`), with the same brief, Guardrails `none`, the `test suite and scripts` resource with its text, the same commit format, and Subagent model `sonnet`.

spec-acceptance-criterion-2: Given any frontier action that wakes a role, when the role is woken, then its assignment file holds that turn's assignment only: its profile's template, or the reviewer's first-turn or later-turn request, with no slot left unfilled, every optional part that has nothing dropped, and as turn commit its worktree's tip, or for a reviewer the change `rp review` printed.

spec-acceptance-criterion-3: Given a frontier that calls `respond spec` with a thread awaiting the spec-producer and a changed input, when the spec-producer is woken, then its assignment's Mode is Respond, its Threads addressed to you lists that thread, and its Changed inputs lists that input with the last commit that changed the spec. Given a frontier `INVALID 1-spec/spec.md: <reason>`, when the spec-producer is woken, then its Malformed files lists that line.

spec-acceptance-criterion-4: Given a frontier that calls `consolidate spec`, when the root spec-producer is woken, then its assignment's Mode is Consolidate, its Lane candidates lists each lane's id with its candidate's path, and its Write to is the root spec's path.

spec-acceptance-criterion-5: Given a review lane with no open review thread, when its reviewer is woken, then its assignment is the first-turn request naming the branch, review base, and change `rp review` printed for the lane, the intent, the later inputs, and the lane's brief or, without one, the default request. Given the lane's open review thread awaiting it, then its assignment is the later-turn request naming that thread and the diff of what changed since the reviewer's last message.

spec-acceptance-criterion-6: Given this repository's conventions after migration, when the assignments of `implementer` and of reviewer lanes `default` and `astra` are written, then each carries the guardrails `tests` and `documentation` and the resource `test suite and scripts`, by name and with their texts, and the assignments of `spec-producer` and `design-doc-producer` carry Guardrails `none` and that resource.

spec-acceptance-criterion-7: Given a project whose conventions set no commit format, when any role's assignment is written, then its commit format is an imperative subject line.

spec-acceptance-criterion-8: Given this repository's conventions after migration and a run confirmed with the Agents defaults, when the assignments are written, then the Subagent model is `sonnet` for both `spec-producer` lanes, `design-doc-producer`, `implementer`, and reviewer lane `default`, and `luna` for reviewer lane `astra`. Given Agents that write `openai/gpt-6-astra#high` as a profile's subagent model, then that profile's assignments name `openai/gpt-6-astra#high`.

spec-acceptance-criterion-9: Given the same conventions and pipeline, when a role's assignment is written under any agentic tool, whatever the conventions' sections for particular tools say, then the assignment is the same.

spec-acceptance-criterion-10: Given a run whose owner set the `implementer`'s subagent model to `haiku` when confirming it, where the Agents convention names `sonnet`, when the implementer's assignment is written, then its Subagent model is `haiku`.

spec-acceptance-criterion-11: Given a project whose conventions name no model for `implementer`, when the implementer is woken, then its assignment tells it to run its subagents on its own model, and it runs on the orchestrator's model.

spec-acceptance-criterion-12: Given this repository's conventions after migration and a run confirmed with the Agents defaults, when the orchestrator spawns spec-producer lane `omits` on opencode, then the lane runs on a model opencode finds by `sonnet`.

spec-acceptance-criterion-13: Given an assignment whose Subagent model is `sonnet`, when the role delegates on opencode or on Claude Code, then its subagent runs on a model that tool finds by `sonnet`. Given `luna` on Claude Code, when the role delegates, then its subagents run on the role's own model.

spec-acceptance-criterion-14: Given conventions that declare a variable `agent` as the pipeline slug and the role joined by `-`, and a resource for `implementer` and `reviewer` whose text uses `{agent}`, when the assignments of pipeline `369-conventions-as-data`'s `implementer` and reviewer lane `astra` are written, then their resource text reads `369-conventions-as-data-implementer` and `369-conventions-as-data-reviewer-astra` where it used `{agent}`, and neither assignment lists the vocabulary.

spec-acceptance-criterion-15: Given a guardrail or resource text that uses the vocabulary's pipeline slug, role, profile, lane, worktree, branch, or base, when a role's assignment is written, then each reads that role's value for its turn.

spec-acceptance-criterion-16: Given a carried text holding a placeholder that names neither a vocabulary fact nor a declared variable, such as `{ticket}`, when a role's assignment is written, then the text keeps `{ticket}` as written, and the assignment lists each vocabulary fact with the role's value.

spec-acceptance-criterion-17: Given conventions data in `.rp.md` or in `.rp.local.md` with a malformed entry, such as a guardrail without its text or one whose profiles name `implementor`, or data that does not parse, when `rp` is asked to write any role's assignment, then it exits with a non-zero status, writes no assignment, and its message names the entry and what is malformed, or the file and where parsing failed.

spec-acceptance-criterion-18: Given this repository's `.rp.md` at version 6, when the skill loads its conventions and the owner confirms each migration action, then the written `.rp.md` records a version higher than 7. It holds as data every model, subagent model, lane, and brief its Agents section names, its two guardrails and its resource with their profiles and texts unchanged, and its commit format text. Its Issues, Pipeline slug, Pipelines folder root, Artifact storage, Worktree folder root, PR format, and Lifecycle hooks sections are as they were. A person opening it reads each convention, and each guardrail's and resource's text under its name. `rp` writes every role's assignment from it.

spec-acceptance-criterion-19: Given a version-6 `.rp.md` whose resource text uses `{agent}` and one of whose lifecycle hooks defines it as `<pipeline slug>-<profile>[-<lane>]`, when setup migrates it and the owner accepts declaring `agent`, then the implementer's assignment carries the resource with `<pipeline slug>-implementer` in that place, and reviewer lane `default`'s with `<pipeline slug>-reviewer-default`.

spec-acceptance-criterion-20: Given a project without `.rp.md`, when Fresh setup writes it with guardrails, resources, a commit format, and Agents, then those are data entries from which `rp` writes every role's assignment.

spec-acceptance-criterion-21: Given a frontier that wakes a role, when the orchestrator follows the skill to wake it, then the role's assignment is, byte for byte, the file `rp` wrote for that turn, and the skill's procedure gives the orchestrator no convention, model name, brief, or path to copy into it.

spec-acceptance-criterion-22: Given the agent profiles after the change, when they are read, then none references a skill file or `.rp.md`.

spec-acceptance-criterion-23: Given a `.rp.local.md` in the main checkout that gives guardrail `tests` other text and adds a resource for `implementer`, when the implementer's assignment is written in its worktree under `.worktrees/`, then its Guardrails carry the local `tests` text and the committed `documentation` guardrail, and its Resources carry the committed resource and the added one.

spec-acceptance-criterion-24: Given `rp check` reports `INVALID` lines for `3-implementation/notes.md` and for a review thread `reviewer-default` opened to `implementer`, when the implementer's assignment is written, then its Malformed files lists both lines; when reviewer lane `default`'s is written, it lists only the thread's line.

spec-acceptance-criterion-25: Given a machine with Node and Git and no package installed for the skill, when `rp` writes an assignment, then it runs to completion.

## Exclusions

spec-exclusion-1: `rp` does not spawn, wake, seat, or terminate a role, create a branch or worktree, fire a lifecycle hook, or land a turn; the orchestrator keeps each of them.

spec-exclusion-2: The conventions no assignment carries — Issues, Pipeline slug, Pipeline branch format, Pipelines folder root, Artifact storage, Worktree folder root, PR format, Lifecycle hooks, Health monitoring, and the sections for particular tools — do not become data, and `rp` expands no variable in them.

spec-exclusion-3: A role's subagents do not run on the model a section of the conventions for a particular tool maps their name to, such as `.rp.opencode.md`'s `sonnet` to `claude-agent/sonnet#xhigh`: the role's tool resolves the name as the assignment gives it.

spec-exclusion-4: `rp check`, `rp stamp`, `rp pipelines`, and `rp review` do not read the conventions, and a malformed conventions entry does not change what they print.

## Considered and not required

- The data in a JSON file beside `.rp.md` (intent-proposal-1) — reading not taken: the Goal puts the data in `.rp.md`; whether it sits in the JSON frontmatter or elsewhere in the file is how it is built.
- `rp` reporting to the orchestrator the model a role runs on — reading of intent-goal not taken: the role's own model is not in its assignment, and intent-constraint-2 has the orchestrator resolve that name when it spawns the role.
- The subagent model taken from the Agents convention alone, whatever the run says — reading not taken: the owner sets a run's models when confirming it (`triage.md` § 4).
- A role stopping with a blocker when its tool finds no model by its subagent model name — not taken: `.rp.claude-code.md` keeps reviewer lane `astra` delegating on `sonnet` under Claude Code, which running on the role's own model delivers.
- The vocabulary listed in every assignment — reading of intent-constraint-3 not taken: the intent ties the listing to a placeholder that reaches the role unexpanded.
- The vocabulary's base as the merge-base commit — reading of intent-constraint-3 not taken: the implementer's assignment already names `run-config.md`'s `base` as its Base branch (`templates/implementer.md`).
- A placeholder in a lane's brief or a model name — no intended use produces one: observed: no brief or model name in `.rp.md` or this pipeline's `run-config.md` holds braces.
- A declared variable whose template uses another declared variable, a conditional, or an escape for a literal `{name}` — no intended use produces one: observed: `.rp.md` holds no braces outside its frontmatter, and intent-context-3's `{agent}` is a template over vocabulary facts alone.
- A guardrail or resource for a lane rather than a profile — no intended use produces one: observed: `guardrails.md` and `resources.md` § Format list profile names only.
- Two guardrails or two resources with one name — no intended use produces them: observed: `.rp.md`'s entries have distinct names, and `.rp.local.md` overrides by name.
- An assignment for a role the frontier does not wake — the orchestrator wakes only the roles of the frontier lines it dispatches: observed: `loop.md` § One step.
- `rp` stopping on a `.rp.md` of an older version, naming it — the skill's loader migrates an older `.rp.md`, or stops, before any run: observed: `load.md` § Schema stamp, § Completeness.
- A validation of the conventions when the skill loads them — intent-constraint-4 has `rp` stop on a malformed entry, which it does wherever it reads the data; no source describes a load-time check by `rp`.
- A `.rp.md` at version 5 or earlier, or at 7 — migration walks every later changelog entry in order: observed: `setup.md` § Migration step 2.
- A pipeline whose `run-config.md` records format 7, continued or stopped after the change — no such pipeline exists: observed: every `run-config.md` at every branch tip records format 6, and format 7 is unreleased, its changeset pending and absent from `CHANGELOG.md` (`1-spec/spec/run-config-formats.txt`).
- The change committing this repository's migrated `.rp.md` — reading of intent-constraint-5 not taken: the constraint names setup as what migrates it, setup writes `.rp.md` on the owner's confirmation (`setup.md` § Write), and the base left this repository's `.rp.md` at version 6 the same way (`.pipelines/368-certification-out-of-files/3-implementation/notes.md`).
- Migrating a developer's `.rp.local.md` — setup warns that it is not rewritten (`setup.md` § Migration step 4), and the only one observed overrides Artifact storage, which no assignment carries (`1-spec/spec/rp-local-md.txt`).
- `rp` writing the diff a reviewer reads on a later turn — it is a prepared file beside the assignment, not the assignment or a convention: observed: `state.md` § Names, Prepared files; `loop.md` § Review lanes step 2.
- README and `docs/` passages that describe the orchestrator filling assignments or `rp` never reading the conventions — reading of intent-goal not taken: the intent asks for no outcome of its own there, and the project's `documentation` guardrail has the implementer keep them true (`AGENTS.md` § Repository rules).

## Open assumptions

spec-assumption-1: On Claude Code, a role that passes `sonnet` as a subagent's model runs that subagent on Sonnet — assumed: a role delegating on Claude Code with Subagent model `sonnet`; `tools/claude-code.md` § Models documents the aliases, and this seat cannot run Claude Code.

spec-assumption-2: Where its tool finds several models by one name, such as `sonnet` or `luna` on opencode, a role runs its subagents on the one its tool directs it to, its own provider's — assumed: a role on a `claude-agent` model delegating with `sonnet` on opencode runs `claude-agent/sonnet`, as the model search's "Check your own provider first" directs (`1-spec/spec/opencode-models-lookup.json`).
