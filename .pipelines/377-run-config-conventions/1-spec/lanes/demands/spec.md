# Spec: Keep .rp.md as prose and have rp read every convention from the run configuration

## Overview

Today `.rp.md` puts the conventions `rp` uses in a JSON frontmatter above its prose: the worktree folder root, the landing commit, the commit format, the guardrails, the resources, the agents, and the variables. A text of several lines becomes a list of JSON strings. `rp next` and `rp land` read `.rp.md` and `.rp.local.md` from the main checkout at every step, so editing either one changes a run already under way. Each pipeline also carries a format, which `rp` compares in order to refuse pipelines of an earlier format.

After the change, `.rp.md` is prose again. Its frontmatter is flat YAML holding only the conventions version, 7. At every run start the orchestrator copies what `rp` needs, verbatim, into the pipeline's `run-config.json`. It copies a developer's local overrides into `run-config.local.json` beside it, which is never committed. `rp` reads only those two files. A pipeline carries no version: a folder is a pipeline when it holds `run-config.json`, and what `rp` cannot read stops it, naming the file and the reason.

## Requirements

spec-requirement-1: `.rp.md` holds prose sections only. Its frontmatter is flat YAML holding one key, `conventions`, whose value is 7. Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables are prose sections like every other convention. Each guardrail and each resource is an entry under its name, giving its text and the profiles it binds. A text of several lines is written as those lines. Setup writes `.rp.md` in this form, and the orchestrator loads a complete `.rp.md` at version 7 without offering setup.

origin: from-intent intent-constraint-1

observed: setup writes these seven conventions as JSON data in the frontmatter and every other convention as a prose section (read `reference/conventions/setup.md` § Write). This repository's `.rp.md` holds them as JSON, with its commit format as a list of JSON strings, one per line (read `.rp.md`).
observed: before version 7 the same conventions were prose sections, with each guardrail and resource a `### <name>` block (read `git show fb2cc29c:.rp.md` and `git show fb2cc29c:skills/radical-pipelines/reference/conventions/guardrails.md`).

spec-requirement-2: `rp` reads every convention it needs from the pipeline's run configuration and reads neither `.rp.md` nor `.rp.local.md`. The run configuration supplies:

- the commit format, guardrails, resources, variables, and lane briefs each assignment carries;
- the worktree folder root that lane worktrees go under;
- the landing commit template of the commits `rp land` makes;
- the models, the target phase, and the base.

`rp next` and `rp land` run in a repository whose main checkout has no `.rp.md` and no `.rp.local.md`. No edit to either file changes what any `rp` command prints or writes.

origin: from-intent intent-constraint-2

observed: with `.rp.md` missing from the main checkout, `rp next` and `rp land` stop with `cannot read <main checkout>/.rp.md: missing`, and `rp check` runs. An assignment written again after `.rp.md` was edited mid-turn carries the edit. A guardrail in `.rp.local.md` replaces the committed one in the assignment. `rp land`'s commit message follows `.rp.md`'s `landing-commit` (ran `1-spec/lanes/demands/spec/probe-today.sh`; output in `1-spec/lanes/demands/spec/probe-today.txt`).

spec-requirement-3: Each pipeline's run configuration is `run-config.json` at its pipeline folder root. It is a JSON file with no prose body, and it holds the target phase, the base, the agents, the worktree folder root, the landing commit, the commit format, the guardrails, the resources, and the variables.

origin: from-intent intent-constraint-2

observed: today the run configuration is `run-config.md`: a JSON frontmatter holding `format`, `target-phase`, `base`, and `agents`, above a prose body (read `.pipelines/377-run-config-conventions/run-config.md` and `scripts/README.md` § `run-config.md`).

spec-requirement-4: `run-config.json` holds `owner-directions`, a list of strings. Each direction the owner gives for the run is one entry, added when the owner gives it, and earlier entries are kept. `rp` accepts the list, and what `rp` prints and writes is the same as without it.

origin: from-intent intent-constraint-3

observed: today the owner's directions are prose in the body of `run-config.md` (read this pipeline's `run-config.md`). A `run-config.md` whose frontmatter holds `owner-directions` stops `rp check` with `unexpected frontmatter key: owner-directions` (`1-spec/lanes/demands/spec/probe-today.txt`).

spec-requirement-5: `run-config.local.json`, beside `run-config.json`, holds what the orchestrator recorded from `.rp.local.md`. For every `rp` command on that clone, each entry it names overrides the entry of the same name in `run-config.json`:

- a guardrail, resource, or variable replaces the committed one of its name, or is added when there is none;
- a profile's model or subagent model replaces the committed one;
- its worktree folder root, landing commit, or commit format replaces the committed one.

origin: from-intent intent-constraint-4

observed: today the entries in `.rp.local.md`'s frontmatter replace `.rp.md`'s by name in the assignment (`1-spec/lanes/demands/spec/probe-today.txt`). `rp` reads both files from the main checkout (read `scripts/README.md` § Conventions data). This repository's main checkout has a `.rp.local.md` with no frontmatter whose one prose section overrides Artifact storage by its heading (read the main checkout's `.rp.local.md`).

spec-requirement-6: `run-config.local.json` is never committed. Setup adds its name to `.gitignore`. Every `rp` command that reads a pipeline's run configuration stops, naming the file, when Git tracks it.

origin: from-intent intent-constraint-4

observed: setup adds only the worktree folder root to `.gitignore` (read `reference/conventions/setup.md` § Write, step 4). This repository's `.gitignore` names `.rp.local.md` and not `run-config.local.json` (read `.gitignore`).

spec-requirement-7: `run-config.local.json` holds no target phase, no base, and no lane. A `run-config.local.json` that holds any of them stops `rp`, naming the file and the key. The frontier and the phase states `rp check` reports are the same with or without `run-config.local.json`, on every clone and at every commit.

origin: from-intent intent-constraint-4

observed: today the `agents` in `.rp.local.md` may declare lanes, which the orchestrator proposes when it asks the owner to confirm a run (read `reference/conventions/agents.md` and `reference/entries/triage.md` step 4). `rp check` reads no local file (read `contextOf` in `skills/radical-pipelines/scripts/rp.mjs`: only `next` and `land` read the conventions).

spec-requirement-8: The orchestrator copies each text into the run configuration verbatim: a guardrail's rule, a resource's text, the commit format, and a lane's brief, each as its prose section writes it. It selects each entry and associates it with its profiles; it never summarizes or rewords. Each value is copied as written: the worktree folder root, the landing commit template, and each variable's template. The skill states this to the orchestrator in plain words. Each role's assignment then carries each text as `.rp.md` or `.rp.local.md` writes it, with only its placeholders expanded.

origin: from-intent intent-constraint-5

observed: today `rp` copies each text from `.rp.md`'s frontmatter into the assignment as written (`1-spec/lanes/demands/spec/probe-today.txt`).
assumed: a run started in this repository after the change records `run-config.json` texts identical to the texts of `.rp.md`'s sections (spec-assumption-1).

spec-requirement-9: At every run start the orchestrator records the run configuration from `.rp.md` and `.rp.local.md` as they stand then, and commits `run-config.json` before the run's first step. `run-config.json`'s worktree folder root, landing commit, commit format, guardrails, resources, and variables are those `.rp.md` states. `run-config.local.json` holds what `.rp.local.md` states, and overrides nothing when `.rp.local.md` states none of these conventions. Neither file is rewritten from `.rp.md` or `.rp.local.md` at any other moment. An edit to either file during a run therefore reaches no assignment, lane worktree, or landing commit of that run, and a merged pipeline's `run-config.json` holds the conventions of its last run.

origin: from-intent intent-constraint-6

observed: today triage writes `run-config.md` at every run start, before `run-started` fires (read `reference/entries/triage.md` step 6). An edit to `.rp.md` reaches the next assignment written in the same turn (`1-spec/lanes/demands/spec/probe-today.txt`).

spec-requirement-10: The agents, the target phase, and the base in `run-config.json` change only when the owner asks. A run started on a pipeline that already has `run-config.json` keeps them, whatever `.rp.md`'s Agents section states then, unless the owner's request changes them. A new pipeline gets the ones the owner confirms.

origin: from-intent intent-constraint-6

observed: today a run needs the owner's confirmation when its pipeline has no run configuration or the request changes it, and otherwise starts under the recorded configuration (read `reference/entries/triage.md` step 4).

spec-requirement-11: A pipeline carries no version. `run-config.json` holds no format, `rp pipelines` lists each pipeline without one, and no `rp` command compares a pipeline's version. When `rp` cannot read something in a pipeline, it stops, naming the file and the reason. A pipeline folder without `run-config.json` is one such case: `rp check`, `rp next`, and `rp land` stop, naming that file as missing.

origin: from-intent intent-constraint-7

observed: `rp check` stops with `pipeline of an earlier format; it is not continued` on a `run-config.md` of format 6 or with none, and with `pipeline of a newer format 8; update the skill` on format 8. `rp pipelines` prints a format column: `earlier` for a folder holding `prompt.md`, a phase folder under `base/`, or a phase folder without `run-config.md` (`1-spec/lanes/demands/spec/probe-today.txt`).

spec-requirement-12: The orchestrator distinguishes no pipeline by format. Triage, reporting, and setup's migration name no pipeline format and no pipeline of an earlier format. Triage checks every pipeline `rp pipelines` lists for an issue and routes it through its Route table like any other.

origin: from-intent intent-constraint-7

observed: triage routes "a pipeline of an earlier format" as history and runs `rp check` only on "each live pipeline of the current format" (read `reference/entries/triage.md` steps 2 and 3). Reporting reports "a pipeline of an earlier format as listed" (read `reference/entries/report.md`). Changelog entries 6 and 7 each state how discovery lists pipelines of an earlier format (read `reference/conventions/changelog.md`).

spec-requirement-13: `rp` runs with Node and Git 2.38 or later alone; it needs no installed package.

origin: from-intent intent-constraint-8

observed: `rp.mjs` imports only Node's built-in modules (read its imports). The package's only dependencies are the changesets tools, as devDependencies (read `package.json`).

spec-requirement-14: The intent, later inputs, `notes.md`, and threads keep their flat YAML frontmatter grammar: `rp` accepts and rejects each such file as it does today, with the same reason.

origin: from-intent intent-constraint-8

observed: that grammar is a flat map of single-line text values (read `scripts/README.md` § Frontmatter).

spec-requirement-15: This repository's `.rp.md` holds its conventions as prose sections at version 7, each text and value as its frontmatter data holds it today. A run started in this repository therefore writes assignments carrying the same guardrail, resource, commit-format, and brief texts as today.

origin: from-intent intent-constraint-9

observed: this repository's `.rp.md` holds as JSON data a worktree folder root, a landing commit, a commit format, two guardrails, one resource, and agents with two production lanes and two review lanes (read `.rp.md`).

spec-requirement-16: This repository's `.gitignore` ignores `run-config.local.json` in every pipeline folder.

origin: derived intent-constraint-4: this repository runs its pipelines from its own pipelines folder (observed: `.pipelines/377-run-config-conventions/` on this branch), and its `.gitignore` has no such entry (observed: read `.gitignore`)

spec-requirement-17: Setup's migration brings a `.rp.md` at an earlier conventions version to version 7 with every convention as a prose section. Worktree folder root, Commit format, Guardrails, Resources, and Agents stay prose sections with their texts unchanged, and the migration offers Landing commit and Variables as prose sections.

origin: derived intent-constraint-1: projects set up with the released skill hold `.rp.md` at version 5 (observed: `trunk`'s `reference/conventions/load.md` names 5 as the current version, and `trunk`'s `.rp.md` holds `"conventions": 5`, in `1-spec/lanes/demands/spec/pipeline-folders.txt`)

observed: changelog entry 7 migrates a version-6 `.rp.md` by moving these sections into frontmatter data (read `reference/conventions/changelog.md` § 7).

spec-requirement-18: A folder of the pipelines folder root is a pipeline folder when it holds `run-config.json`. `rp` treats every other folder as no pipeline, and `rp pipelines` lists none of them.

origin: from-intent intent-proposal-1

observed: today a folder is a pipeline when it holds a phase folder (directly or under `base/`), `run-config.md`, or `prompt.md` (read `scripts/README.md` § Pipeline files). `rp pipelines` lists folders of each kind (`1-spec/lanes/demands/spec/probe-today.txt`).
observed: the merged pipelines in `v4`'s tree hold a format-6 `run-config.md` and an intent that names its issue in `origin:` lines of its body, the earlier-format reading that intent-constraint-7 removes (`1-spec/lanes/demands/spec/pipeline-folders.txt`).

spec-requirement-19: When triage starts a new pipeline, its slug names a folder that exists neither in the pipelines folder root of the commit its branch starts from nor at any branch tip, so the new pipeline's folder holds only its own files. This holds when an issue's earlier work sits only in a folder without `run-config.json`: `rp pipelines` does not list that folder, and triage routes the work as new intent.

origin: derived intent-proposal-1: issues get new pipelines while an earlier pipeline folder exists. `trunk`'s pipelines folder holds re-attempt folders such as `122-plan-driven-test-selection-v2` and `71-normalize-prompt-format-v3`; `v4`'s holds issue 371's merged folder; and issue 195's folder sits at 16 branch tips (observed: `1-spec/lanes/demands/spec/pipeline-folders.txt`)

observed: a new pipeline written into the folder of `v4`'s merged pipeline 371 makes `rp check` report that pipeline's older spec, lane candidates, design doc, notes, and threads as `INVALID` (`1-spec/lanes/demands/spec/probe-today.txt`).
observed: today discovery lists such older folders, and a second pipeline for an issue gets the slug suffix `-2`, `-3` (read `reference/run/state.md` § Names and `reference/entries/triage.md` step 3).

spec-requirement-20: When triage asks the owner to confirm a run, the confirmation lists, under each profile, the name of each guardrail and each resource the run configuration will carry for that profile.

origin: from-intent intent-proposal-2

observed: today the confirmation lists the target phase, the lanes, and the models, and no guardrail or resource (read `reference/entries/triage.md` step 4).
assumed: names listed under each profile show the owner, before the run starts, a guardrail or resource that `.rp.md` declares and the run would not carry (spec-assumption-2).

spec-requirement-21: Agents defaults may be written per agentic tool, in each tool's section of `.rp.md`. Triage proposes a new run's agents from the active tool's Agents section, and from no other tool's.

origin: derived intent-goal: a project keeps one Agents table per agentic tool, a use intent-context-1 names

observed: today `.rp.md` holds one `agents` entry in its frontmatter for every tool (read `reference/conventions/agents.md`). The orchestrator reads only `.rp.md`'s shared sections and the active tool's section, `## <Tool>` inline or its sidecar file (read `reference/conventions/load.md` § Sources).

## Acceptance criteria

spec-acceptance-criterion-1: Given setup, fresh or migrating, has completed, when `.rp.md` is read, then its frontmatter is the one line `conventions: 7`, and each of Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables that the project sets is a prose section, with a text of several lines written as its lines.

spec-acceptance-criterion-2: Given a `.rp.md` with frontmatter `conventions: 7` and every required convention, when the orchestrator loads the conventions, then it loads them without offering setup. With `conventions: 8`, it stops and tells the owner to update the skill.

spec-acceptance-criterion-3: Given a pipeline whose run configuration holds a commit format, guardrails, resources, variables, and lanes with briefs, and a main checkout without `.rp.md` or `.rp.local.md`, when `rp next --apply` wakes a role, then:

- the role's assignment carries the commit format, each guardrail and resource whose profiles include the role's profile, and the brief of its lane;
- each of those texts has its placeholders expanded from the variables and the role's facts;
- the plan names the role's model and resources as the run configuration gives them.

spec-acceptance-criterion-4: Given a run configuration whose worktree folder root is a relative folder, when `rp next` plans a lane's worktree, then the worktree's path is `<that folder>/<lane branch>` under the main checkout's root.

spec-acceptance-criterion-5: Given a run configuration with a landing commit template, when `rp land` commits, then each commit's message is its subject in that template. Without a template, the message is the subject alone.

spec-acceptance-criterion-6: Given a pipeline under way, when `.rp.md` or `.rp.local.md` is edited, removed, or added, then `rp check`, `rp next`, and `rp land` print the same as before, and `rp next --apply` writes the same.

spec-acceptance-criterion-7: Given the orchestrator has started a run, when the pipeline folder is read on the pipeline branch, then it holds `run-config.json` and no `run-config.md`. That file is JSON with no prose, holding the target phase, the base, the agents, and the worktree folder root, landing commit, commit format, guardrails, resources, and variables that `.rp.md` sets.

spec-acceptance-criterion-8: Given the owner gives a direction for the run, at triage or during the run, when the orchestrator records it, then `owner-directions` in `run-config.json` gains one entry for it, and the earlier entries are unchanged.

spec-acceptance-criterion-9: Given a `run-config.json` holding `owner-directions`, when `rp check`, `rp next`, or `rp land` runs, then none stops on it, and each prints and writes what it would without the list.

spec-acceptance-criterion-10: Given a `.rp.local.md` that rewrites a guardrail, resource, or variable of `.rp.md` under the same name, or sets another commit format, landing commit, or worktree folder root, when a run starts on that clone, then every assignment, lane worktree, and landing commit of the run follows the local value. No commit on the pipeline branch holds that value.

spec-acceptance-criterion-11: Given a `.rp.local.md` that names a guardrail `.rp.md` lacks, when a run starts on that clone, then the assignment of each profile it binds carries it alongside every committed guardrail.

spec-acceptance-criterion-12: Given setup has completed, when a `run-config.local.json` is written in any pipeline folder, then Git ignores it.

spec-acceptance-criterion-13: Given a pipeline whose `run-config.local.json` is committed or staged, when `rp check`, `rp next`, or `rp land` runs, then it stops, naming the file as tracked.

spec-acceptance-criterion-14: Given a `run-config.local.json` that holds the target phase, the base, or a lane, when `rp` reads the pipeline, then it stops, naming the file and the key.

spec-acceptance-criterion-15: Given a pipeline with a `run-config.local.json`, when `rp check` runs, then the frontier and each phase's state are what it reports without the file.

spec-acceptance-criterion-16: Given a `.rp.md` holding a guardrail rule, a resource text, a commit format, and a lane brief, each several lines long with Markdown in it, when a run starts, then `run-config.json` holds each text character for character as its section writes it. Each woken role's assignment carries those texts with only their placeholders expanded.

spec-acceptance-criterion-17: Given the skill, when the orchestrator reads how to record the run configuration, then it is told in plain words to copy each text verbatim, only selecting entries and associating them with profiles, and never summarizing or rewording.

spec-acceptance-criterion-18: Given `.rp.md`'s conventions have been edited since a pipeline's last run, when the owner continues the pipeline, then before the run's first step the pipeline branch holds a commit whose `run-config.json` carries the edited conventions. The first woken role's assignment carries them too.

spec-acceptance-criterion-19: Given `.rp.local.md` is absent, or overrides none of the conventions the run configuration holds, when a run starts on that clone, then `run-config.local.json` overrides nothing in the run.

spec-acceptance-criterion-20: Given a run under way, when the owner edits `.rp.md` or `.rp.local.md`, or the orchestrator resumes after its context is compacted, then `run-config.json` and `run-config.local.json` keep what the run start recorded until the next run start.

spec-acceptance-criterion-21: Given a merged pipeline, when its folder is read in the base branch's tree, then its `run-config.json` holds the conventions recorded at its last run start.

spec-acceptance-criterion-22: Given a pipeline whose agents in `run-config.json` differ from `.rp.md`'s Agents section, when the owner continues it without asking for a change, then its agents, target phase, and base are unchanged after the run start. When the owner asks for another target phase, only the target phase changes.

spec-acceptance-criterion-23: Given a pipeline folder without `run-config.json`, such as one holding `run-config.md`, when `rp check`, `rp next`, or `rp land` runs on it, then it stops, naming `<pipeline folder>/run-config.json` as missing.

spec-acceptance-criterion-24: Given any pipelines folder root, when `rp pipelines` lists its pipelines, with or without `--json`, then no entry carries a format.

spec-acceptance-criterion-25: Given the skill, when the orchestrator follows triage, reporting, or setup's migration, then no step names a pipeline format or a pipeline of an earlier format. Every pipeline `rp pipelines` lists for the issue is checked with `rp check` and routed through the Route table.

spec-acceptance-criterion-26: Given a checkout with no installed package, when `rp` runs any of its commands, then it runs with Node and Git alone.

spec-acceptance-criterion-27: Given an intent, later input, `notes.md`, or thread that `rp` accepts or rejects today, when `rp check` or `rp validate` reads it, then it accepts or rejects the file as it does today, with the same reason.

spec-acceptance-criterion-28: Given this repository's `.rp.md`, when it is read, then its frontmatter holds `conventions: 7` alone and its conventions are prose sections. When a run starts in this repository, each assignment carries the same guardrail, resource, commit-format, and brief texts as the assignment `rp` writes today from the frontmatter data.

spec-acceptance-criterion-29: Given this repository, when a `run-config.local.json` is written in any of its pipeline folders, then Git does not list it as untracked.

spec-acceptance-criterion-30: Given a `.rp.md` at conventions version 5 or 6 with Commit format, Guardrails, Resources, and Agents sections, when setup migrates it, then `.rp.md` is at version 7 with flat YAML frontmatter, and each of those sections is prose with its texts unchanged. The migration offers Landing commit and Variables.

spec-acceptance-criterion-31: Given a pipelines folder root holding folders with `run-config.json`, folders without `run-config.json` (holding `run-config.md`, a phase folder, `prompt.md`, or `base/`), and tooling, when `rp pipelines` lists it, then it lists only the folders holding `run-config.json`.

spec-acceptance-criterion-32: Given an issue whose only folder in the pipelines folder root lacks `run-config.json`, when the owner brings work on it, then:

- triage routes the work as new intent;
- the new pipeline's folder exists neither in the tree its branch starts from nor at any branch tip;
- `rp check` on the new pipeline reports no file the new pipeline did not write.

spec-acceptance-criterion-33: Given `.rp.md`'s guardrails and resources, each binding some profiles, when triage asks the owner to confirm a run, then the confirmation names, under each profile, every guardrail and resource that binds it.

spec-acceptance-criterion-34: Given a `.rp.md` whose active tool's section holds an Agents section while another tool's section holds a different one, when triage proposes a new run's configuration, then the proposed models and lanes are those of the active tool's section.

## Exclusions

spec-exclusion-1: `rp` does not check that the texts and values of the run configuration match `.rp.md` or `.rp.local.md`.

spec-exclusion-2: Nothing migrates the conventions data that a version-7 `.rp.md` holds in its JSON frontmatter.

spec-exclusion-3: Nothing migrates an existing pipeline. `rp` does not list, read, or continue a pipeline folder that holds `run-config.md` and no `run-config.json`. That includes the merged pipelines in this repository's base branch and this pipeline.

## Considered and not required

- Reading a folder that holds a phase folder or `run-config.md`, but no `run-config.json`, as a pipeline whose `run-config.json` is missing: not taken. Intent-proposal-1 makes `run-config.json` the mark of a pipeline, and such a folder's intent names its issue in body `origin:` lines that discovery no longer reads, so `--issue` would not find it either (observed: `v4`'s pipeline 371, in `1-spec/lanes/demands/spec/pipeline-folders.txt`).
- Offering the owner, at triage, the tip of an issue's older folder as the start of the new pipeline: the merged older folders' tips are already in the base branch (observed: 368–371 in `v4`'s tree), and a request may name any branch to start from.
- A review lane's tree without the folders of the pipelines folder root that lack `run-config.json`: no intent item asks for it. Such folders become other content of the root, kept like tooling (observed: `v4`'s tree holds four such folders, which today's review build strips; read `reviewBuildOf` and `pipelineFoldersIn` in `rp.mjs`).
- `run-config.local.json` overriding a lane's model or brief: not taken, because intent-constraint-4 says it holds no lane.
- `owner-directions` recorded in `run-config.local.json`: the owner gives directions for a run directly, not in `.rp.local.md` (observed: the main checkout's `.rp.local.md` holds only an Artifact storage section).
- Asking the owner to confirm a run because the conventions recorded at its start differ from the last run's: intent-constraint-6 rewrites them at every run start, and triage asks for confirmation only for what the request changes (read `reference/entries/triage.md` step 4).
- Listing the commit format, landing commit, worktree folder root, or variables in the run confirmation: intent-proposal-2 names guardrails and resources.
- An Agents section in both the shared conventions and the active tool's section: no `.rp.md` observed holds both (observed: this repository's `.rp.md` and `trunk`'s each hold one shared Agents section).
- Recording the run configuration again when a run resumes after compaction: not taken, because intent-constraint-6 records it at run start and at no other moment.

## Open assumptions

spec-assumption-1: The orchestrator, told in plain words to copy each text verbatim, records the texts of `.rp.md`'s sections unchanged — assumed: a run started in this repository after the change records `run-config.json` texts that equal `.rp.md`'s.

spec-assumption-2: Guardrail and resource names listed under each profile in the run confirmation show the owner one that `.rp.md` declares and the run would not carry, before the run starts — assumed: a confirmation in this repository that names its two guardrails and one resource under the profiles each binds.
