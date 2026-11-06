---
{
  "inputs": [
    "0-intent/intent.md@78e4eef7fa09"
  ]
}
---
# Spec: Project conventions as data, assignments written by rp

## Overview

Today the orchestrator builds every role's assignment by hand. It reads `.rp.md` as prose, picks the guardrail and resource blocks whose `agents` include the role's profile, copies them with the commit format, looks up the model the role's subagents run on, computes the role's paths, and fills a template of a dozen slots. `rp` reads none of `.rp.md`, and no `rp` command writes an assignment.

The change makes the conventions an assignment carries data in `.rp.md`: validated, readable by a person, with the text of each guardrail and resource staying free prose inside its entry. `rp` writes each role's whole assignment from that data and from the pipeline. Convention text may contain variables, which `rp` expands from a fixed vocabulary and from templates the project declares. Everything the orchestrator reads with judgment stays prose. The conventions version increases, and setup migrates older files.

## Requirements

spec-requirement-1: Asked for a role's assignment, given the role's profile, its lane when it has one, and its worktree, `rp` writes the whole assignment to the role's assignment path in that worktree (`git rev-parse --git-path rp/<profile>.md`), replacing any previous one, with every slot of the role's template filled. The orchestrator fills and copies nothing into it.

origin: from-intent Goal; intent-proposal-2 adopted

observed: `node skills/radical-pipelines/scripts/rp.mjs` lists four commands, `check`, `stamp`, `pipelines`, and `review`, and none writes an assignment. The orchestrator fills the template (`loop.md` § Waking a role; `templates/README.md`). The role reads it at `git rev-parse --git-path rp/<profile>.md` in its worktree (`state.md` § Names; this role's assignment is there).

spec-requirement-2: Each slot that comes from the pipeline holds the value the orchestrator computes for it today:

- The turn commit is the tip of the role's worktree when `rp` is asked.
- The mode is the one the frontier calls for the role.
- The brief is the role's lane's, verbatim.
- The materials, later inputs, changed inputs (each with the last commit that changed the role's artifact), and lane candidates are explicit paths.
- The threads addressed to the role are those `rp check` reports awaiting it.
- The malformed files are the `INVALID` lines `rp check` reports for files the role wrote.
- Write to and the supporting folder are the role's paths.
- The implementer's base branch is the run's base.

A reviewer lane's assignment is its first-turn request when the lane has no open review thread and its later-turn request otherwise. It names the lane's branch, review base, and change as `rp review` builds them, the intent, the later inputs, the lane's brief, and on a later turn where the reviewer reads what changed since its last message.

origin: from-intent Goal

observed: `templates/README.md` and `templates/*.md` define the slots; `loop.md` § Waking a role and § Review lanes define their values.

spec-requirement-3: The conventions an assignment carries are data in `.rp.md`, kept apart from its prose: the commit format, each guardrail, each resource, the `Agents` defaults (each profile's model and subagent model, and its lanes, each with an id and optionally a brief, a model, and a subagent model), and the project's declared variables. A person reads and edits them in `.rp.md`. The text of a guardrail or resource is free prose inside its entry. The Issues procedure, every lifecycle hook's instructions, the PR format, and the conventions no assignment carries stay prose, as today.

origin: from-intent Goal, intent-constraint-1, intent-constraint-4

observed: `.rp.md` holds the commit format, `Agents`, guardrails, and resources as prose under headings; `rp.mjs` reads no `.rp.md` (`grep -n "\.rp" skills/radical-pipelines/scripts/rp.mjs`).

spec-requirement-4: The assignment's Guardrails and Resources each carry, by name with its text, every entry whose `agents` include the role's profile, the same for every lane of a profile, or `none`. Its Commit format carries the commit format's text.

origin: from-intent Goal

observed: `loop.md` § Waking a role: "the blocks of that `.rp.md` section whose `agents` include the profile". In this repository `tests` and `documentation` name `implementer` and `reviewer`, and `test suite and scripts` names all four profiles (`.rp.md`).

spec-requirement-5: `rp` copies every model name as the project wrote it. It does not map, resolve, or check a name, and it behaves the same under every agentic tool.

origin: from-intent intent-constraint-2

observed: the Subagent model of this role's assignment is `claude-agent/sonnet#xhigh`, while `.rp.md` writes `sonnet`; the orchestrator mapped it through `.rp.opencode.md`.

spec-requirement-6: The assignment's Subagent model is the first of these that exists, copied as written: the subagent model the owner set for the role when confirming the run, then the one the project's `Agents` defaults give it. Within each, the role's lane comes before its profile. When none exists, the assignment names none and the role delegates on its own model.

origin: derived Goal the owner confirms or changes models while confirming a run, and the run configuration records each profile's and lane's model and subagent model (`triage.md` step 4)

observed: `loop.md` § Waking a role fills the Subagent model from what the run configuration records; this pipeline's `run-config.md` records a model and a subagent model per profile and lane; `agents.md` makes a lane inherit its profile's subagent model unless it has its own, and without one the subagent model is the role's own.

spec-requirement-7: In the commit format, guardrail, and resource text an assignment carries, a placeholder is a name in braces, `{name}`. `rp` replaces each placeholder that names a vocabulary variable or a variable the project declares with its value for the role. The vocabulary is:

- `pipeline-slug`;
- `role`, which is `<profile>` or `<profile>-<lane>`;
- `profile`;
- `lane`, empty for a role without a lane;
- `worktree`, an absolute path;
- `branch`;
- `base`, the run's base branch.

A project declares a variable by a name and a template that holds only vocabulary placeholders. The model names, the brief, and the prose conventions are not expanded.

origin: from-intent intent-constraint-3; the vocabulary names are derived from its list and from `{agent}` in intent-context-3, which `{pipeline-slug}-{role}` expresses

observed: intent-context-3: a project's resources name `{agent}`, which one of its hooks defines as `<pipeline slug>-<profile>[-<lane>]`; no `rp` command expands a variable today.

spec-requirement-8: A placeholder that neither the vocabulary nor the project defines reaches the role unchanged in its text, and the assignment then lists every vocabulary variable with its value for the role. An assignment with no such placeholder lists none.

origin: from-intent intent-constraint-3

spec-requirement-9: When an `rp` command reads the data part of `.rp.md` and an entry is malformed, the command writes nothing, prints `rp: <reason>` naming the entry to stderr, and exits 1. An entry is malformed when it lacks a field it needs, holds a field of the wrong kind or an empty one, has an `agents` that names anything but `spec-producer`, `design-doc-producer`, `implementer`, or `reviewer`, or declares a variable named like a vocabulary variable or with a template holding a placeholder outside the vocabulary. A `.rp.md` whose conventions version is not the current one also stops the command, naming the version found.

origin: from-intent intent-constraint-4 for a malformed entry; derived intent-constraint-4 the owner writes entries by hand, where a mistyped profile in `agents` would drop a guardrail from every assignment unnoticed, and this repository's `.rp.md` carries version 6 under a skill at 7 (`load.md` § Schema stamp) for the rest

observed: `agents:` lines in `.rp.md` are hand-written lists of profile names.

spec-requirement-10: A developer's git-ignored `.rp.local.md` overrides, by name, the commit format, a guardrail, a resource, a profile's `Agents` entry, or a declared variable. Entries it does not mention keep their committed values, and its entries are validated like the committed ones.

origin: derived Goal a developer overrides conventions in their working copy (README § Configuration; CHANGELOG 0.14.0 "Allow `.rp.local.md` to override any convention"); the assignment now carries those conventions

observed: `README.md` documents `.rp.local.md`; `.gitignore` lists it; `load.md` § Completeness merges it over the committed file.

spec-requirement-11: The conventions version is one more than today's, 8. Setup migrates a `.rp.md` at version 6, this repository's included, to it. The commit format, guardrails, resources, and `Agents` become data with their text unchanged, setup offers to declare as a variable each placeholder that text uses, and the prose conventions are untouched. A fresh setup writes a `.rp.md` at version 8 whose data part `rp` reads. This repository's `.rp.md` is at version 8 after the change, and the assignments `rp` writes for it carry the guardrail, resource, and commit-format text it holds today.

origin: from-intent intent-constraint-5, intent-constraint-1

observed: `load.md` § Schema stamp: the current version is 7; `changelog.md`'s newest entry is 7; this repository's `.rp.md` is stamped 6.

spec-requirement-12: No agent profile references a skill file or `.rp.md`. Everything a role needs, a subagent model's name and the vocabulary listing included, reaches it through its assignment.

origin: from-intent intent-constraint-6

observed: `grep -rn "skill\|\.rp" agents/` finds no reference to a skill file or `.rp.md`.

spec-requirement-13: The skill's references, the README, and `docs/` tell the orchestrator to ask `rp` for each assignment. None tells it to fill a slot, pick blocks, or look up models by hand, or says `rp` never reads the conventions. They define the data entries, the vocabulary, and the changelog's entry 8.

origin: from-intent Goal

observed: `docs/model.md` says "`rp` never reads the conventions"; `templates/README.md` says "Build every assignment from its template: fill every slot"; `loop.md` § Waking a role tells the orchestrator to carry the blocks by name.

spec-requirement-14: The run configuration's `format` follows the conventions version. A pipeline written under 7 is listed by `rp pipelines` with its format and stopped by `rp check` as of an earlier format, and a pipeline started after the change records 8.

origin: derived intent-constraint-5 the owner continues a pipeline after updating the skill, where a pipeline of an earlier format is history and never continued (`triage.md` step 3)

observed: `state.md` § Run configuration: `format` is "the conventions format it was written under"; `node skills/radical-pipelines/scripts/rp.mjs check .pipelines/368-certification-out-of-files` stops with `pipeline of an earlier format; it is not continued`.

## Acceptance criteria

spec-acceptance-criterion-1: Given a pipeline whose frontier calls `respond spec`, with a thread awaiting the spec-producer and a `rp check` `INVALID` line for a file it wrote, when `rp` is asked for the spec-producer's assignment in its worktree, then the file at `git rev-parse --git-path rp/spec-producer.md` there holds every heading of the producer template, Mode is Respond, Threads addressed to you lists the awaiting thread, Malformed files lists the `INVALID` line, Turn commit is the worktree's tip, and no slot holds template placeholder text. Asked again after the frontier changes, the file holds the new assignment only.

spec-acceptance-criterion-2: Given a `run-config.md` that declares a spec-producer lane with a brief whose candidate is missing, when `rp` is asked for that lane's assignment in the lane's worktree, then Mode is Produce, Brief is the lane's brief verbatim, Write to is the lane's candidate path, and the Seat names the lane's worktree, branch, and supporting folder.

spec-acceptance-criterion-3: Given a review lane with no open review thread, when `rp` is asked for its assignment, then it is the first-turn request naming the branch, review base, and change `rp review` prints for the lane, the intent, the later inputs, and the lane's brief. Given the lane's open thread awaiting the reviewer, it is the later-turn request naming that thread and where the reviewer reads what changed since its last message.

spec-acceptance-criterion-4: Given this repository's migrated `.rp.md`, when `rp` is asked for the assignments of the implementer, the design-doc-producer, and each reviewer lane, then the implementer's and the reviewer's Guardrails carry `tests` and `documentation` with their text, the design-doc-producer's Guardrails is `none`, all four carry the Resource `test suite and scripts`, and each Commit format holds the commit format's text.

spec-acceptance-criterion-5: Given `Agents` that writes subagent model `luna` for reviewer lane `astra`, `sonnet` for `spec-producer`, and `openai/gpt-6-astra#high` for another profile, when `rp` is asked for their assignments, then each Subagent model is exactly as written. Given the confirmed run sets `haiku` for lane `astra`, then astra's is `haiku`. Given a role with no subagent model anywhere, then its assignment names none.

spec-acceptance-criterion-6: Given a project that declares `agent` as `{pipeline-slug}-{role}` and a resource whose text uses `{agent}` and `{branch}`, when `rp` is asked for the assignment of lane `omits` of the spec-producer in pipeline `369-conventions-as-data`, then the resource text reads `369-conventions-as-data-spec-producer-omits` and the lane's branch name, and the assignment lists no vocabulary.

spec-acceptance-criterion-7: Given a guardrail whose text holds `{ticket}`, which nothing defines, when `rp` is asked for an assignment that carries it, then the text still holds `{ticket}` and the assignment lists each vocabulary variable with the role's value.

spec-acceptance-criterion-8: Given a guardrail without its rule, or an `agents` that names `implementor`, or a declared variable whose template holds `{ticket}`, when `rp` is asked for any assignment, then it writes nothing, stderr holds `rp: <reason>` naming that entry, and the exit status is 1. Given this repository's `.rp.md` at version 6, then it stops the same way, naming version 6.

spec-acceptance-criterion-9: Given a `.rp.local.md` that gives guardrail `tests` other text and adds a resource, when `rp` is asked for the implementer's assignment, then Guardrails carries the local text of `tests` and the committed `documentation`, and Resources carries the committed resource and the added one.

spec-acceptance-criterion-10: Given this repository's `.rp.md` at version 6, when setup migrates it, then it is at version 8, the text of each migrated guardrail, resource, and the commit format equals what it was, its prose conventions are unchanged, and `rp` writes assignments from it without error. Given a project with no `.rp.md`, when setup completes, then its `.rp.md` is at version 8 and `rp` writes assignments from it.

spec-acceptance-criterion-11: Given the shipped profiles, the skill's references, the README, and `docs/`, when read, then no profile references a skill file or `.rp.md`, none of the documents tells the orchestrator to fill a slot, pick blocks, or look up models by hand or says `rp` never reads the conventions, and the data entries, the vocabulary, and changelog entry 8 are defined.

spec-acceptance-criterion-12: Given a pipeline whose `run-config.md` has `format` 7, when `rp check` runs on it, then it stops with `pipeline of an earlier format; it is not continued`, and `rp pipelines` lists it with format 7. Given a pipeline started after the change, its `run-config.md` records 8.

## Exclusions

spec-exclusion-1: `rp` does not spawn, wake, seat, or terminate a role, create a worktree or branch, fire a hook, or land a turn. The orchestrator keeps each of them.

spec-exclusion-2: `rp` knows nothing of the active agentic tool, and the tool sections of `.rp.md` and the skill's `tools/` files keep their present role: the orchestrator resolves a model name when it spawns, and a role when it delegates.

spec-exclusion-3: The Issues procedure, every lifecycle hook's instructions, the PR format, and the conventions no assignment carries are not converted to data and are not expanded.

spec-exclusion-4: The frontier rules and the output of `rp check`, `rp stamp`, `rp pipelines`, and `rp review` are unchanged apart from the format number, and none of them reads `.rp.md`.

spec-exclusion-5: The headings of the producers' and the implementer's assignments, and the wording of the reviewer's requests, are unchanged.

## Considered and not required

- The data held in `.rp.md`'s JSON frontmatter or in a file beside it (intent-proposal-1) — where the data is stored is how it is built; the spec requires only that a person reads and edits it and that it is validated (requirements 3 and 9), and the design doc chooses.
- A declared variable that refers to another declared variable, a conditional, or an escape for a literal `{name}` — no intended use produces them: observed: `.rp.md` holds no braces outside its frontmatter, and `{agent}` in intent-context-3 is a template over the vocabulary alone.
- The vocabulary listed in every assignment, as a second reading of intent-constraint-3 — the role needs it only to substitute a placeholder that reached it unexpanded; with none, no one reads the listing.
- The subagent model taken from the project's `Agents` alone — the owner changes models while confirming a run and the run configuration records them (`triage.md` step 4), which that reading would drop.
- A guardrail or resource scoped to a lane rather than a profile — `agents` lists profile names only: observed: `guardrails.md`, `resources.md`.
- Two entries of one kind with the same name — both reach the assignments; no flow in the skill depends on the name being unique.
- Asked for the assignment of a role the frontier does not wake — the orchestrator wakes only the roles of the frontier lines it dispatches: observed: `loop.md` § One step.
- A command that validates `.rp.md` when the skill loads it — intent-constraint-4 has `rp` stop on a malformed entry, and the first assignment request does that; no source describes a load-time validation step.
- The Pipeline slug, Pipeline branch format, folder roots, Artifact storage, and Health monitoring conventions as data — the Goal limits data to what an assignment carries, and the orchestrator passes `rp` the roots it needs as arguments (`state.md`: `rp pipelines <pipelines folder root> --base <artifact base branch>`).
- A run configuration's `format` that stays 7 while the conventions version becomes 8 — `state.md`, `README.md`, and the glossary define `format` as the conventions format a pipeline was written under, so the other reading would make those definitions false.

## Open assumptions

spec-assumption-1: A role in each supported tool resolves a subagent model given by its plain name, as `.rp.md` writes it, to the model the project means. In opencode the `subagent` tool takes `provider/model[#variant]`, and the name map that `.rp.opencode.md` holds today is one no profile reads — assumed: a role in Claude Code and one in opencode each delegate on a name copied from `.rp.md`, such as `sonnet` and `astra`.
