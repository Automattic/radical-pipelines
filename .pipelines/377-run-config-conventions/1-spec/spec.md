# Spec: Keep .rp.md as prose and have rp read every convention from the run configuration

## Overview

Today `.rp.md` keeps some conventions as JSON in its frontmatter, above its prose. These are the ones `rp` uses: the worktree folder root, the landing commit, the commit format, the guardrails, the resources, the agents, and the variables. A text of several lines becomes a list of JSON strings, and Agents allows one table for every agentic tool. `rp next` and `rp land` read `.rp.md` and `.rp.local.md` from the main checkout at every step, so editing either file changes a run already under way. Each pipeline also carries a format, which `rp` compares in order to refuse pipelines of an earlier format.

After the change, `.rp.md` is prose again, and its frontmatter holds only the conventions version, 7. At every run start the orchestrator copies what `rp` needs, verbatim, into the pipeline's committed `run-config.json`. It copies what `.rp.local.md` overrides into `run-config.local.json` beside it, which is never committed. `rp` reads only those two files. A folder is a pipeline when it holds `run-config.json`. A pipeline carries no version, and what `rp` cannot read stops it, naming the file and the reason.

## Requirements

spec-requirement-1: `.rp.md` holds prose sections only. Its frontmatter is flat YAML holding one key, `conventions`, whose value is 7. Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables are prose sections like every other convention. Each guardrail and each resource is an entry under its name, giving its text and the profiles it binds, and each lane gives its brief. A text of several lines is written as those lines. Setup writes `.rp.md` in this form, and the orchestrator loads a complete `.rp.md` in this form without offering setup.

origin: from-intent intent-constraint-1

observed: this repository's `.rp.md` holds these seven conventions as JSON in its frontmatter, and its commit format is a list of JSON strings, one per line (read `.rp.md`). Setup writes them that way (read `reference/conventions/setup.md` § Write), and the loader reads a JSON frontmatter (read `reference/conventions/load.md` § Schema stamp).
observed: at version 6 the same conventions were prose sections, with each guardrail and resource a block under its name (`git show fb2cc29c:.rp.md`, in `1-spec/spec/observations.txt`).

spec-requirement-2: Setup's migration brings a `.rp.md` at an earlier conventions version to version 7. Every convention the file held as prose stays a prose section with its text unchanged. The migration offers Landing commit and Variables as prose sections.

origin: derived intent-constraint-1 projects set up with the released skill hold `.rp.md` at conventions version 5 (observed: `trunk`'s `.rp.md` and `reference/conventions/load.md`, in `1-spec/spec/observations.txt`)

observed: changelog entry 7 migrates a version-6 `.rp.md` by moving these sections into frontmatter data, and it offers the landing commit and variables (read `reference/conventions/changelog.md` § 7).

spec-requirement-3: `rp` reads every convention it needs from the pipeline's run configuration. It reads neither `.rp.md` nor `.rp.local.md`. The run configuration supplies:

- the commit format, guardrails, resources, variables, and lane briefs each assignment carries, with their placeholders expanded;
- the worktree folder root that lane worktrees go under;
- the landing commit template of the commits `rp land` makes;
- the models, the lanes, the target phase, and the base.

What any `rp` command prints, writes, and stops on is the same whatever `.rp.md` and `.rp.local.md` hold, and whether or not they exist.

origin: from-intent intent-constraint-2

observed: with `.rp.md` missing from the main checkout, `rp next` and `rp land` stop with `cannot read <repo>/.rp.md: missing`, while `rp check` runs. An assignment written again after `.rp.md` was edited carries the edit. A guardrail in `.rp.local.md` replaces the committed one in the assignment. `rp land`'s commit message follows `.rp.md`'s landing commit (`1-spec/spec/probe-today.txt`, from `1-spec/spec/probe-today.sh`).

spec-requirement-4: Each pipeline's run configuration is `run-config.json` at its pipeline folder root. It is a JSON file with no prose body. It holds the target phase, the base, the agents, the worktree folder root, the landing commit, the commit format, the guardrails, the resources, and the variables. A pipeline folder holds no `run-config.md`.

origin: from-intent intent-constraint-2

observed: today the run configuration is `run-config.md`: a JSON frontmatter holding `format`, `target-phase`, `base`, and `agents`, above a prose body (read this pipeline's `run-config.md` and `scripts/README.md` § `run-config.md`).

spec-requirement-5: `run-config.json` holds `owner-directions`, a list of strings. Each direction the owner gives for the run is one entry, added when the owner gives it, and earlier entries are kept. `rp` accepts the list, and its entries change nothing `rp` prints or writes.

origin: from-intent intent-constraint-3

observed: today the owner's directions are prose in the body of `run-config.md` (read this pipeline's `run-config.md`). A `run-config.md` whose frontmatter holds `owner-directions` stops `rp check` with `unexpected frontmatter key: owner-directions` (`1-spec/spec/probe-today.txt`).

spec-requirement-6: `run-config.local.json` sits beside `run-config.json` and holds what the orchestrator recorded from `.rp.local.md`. For every `rp` command on that clone, each entry it holds overrides the entry of the same name in `run-config.json`:

- its worktree folder root, landing commit, or commit format replaces the committed one;
- a guardrail, resource, or variable replaces the committed one of its name, or is added when there is none.

The entries it does not name keep their committed values.

origin: from-intent intent-constraint-4

observed: today an entry in `.rp.local.md`'s frontmatter replaces or adds `.rp.md`'s entry of the same name for these six conventions, and for no other (read `readConventions` in `rp.mjs`; `1-spec/spec/probe-today.txt`).

spec-requirement-7: `run-config.local.json` holds no target phase, no base, and no lane. A `run-config.local.json` that holds any of them stops `rp`, naming the file and the key. For a given commit, the frontier and the phase states `rp check` reports are the same on every clone, whether `run-config.local.json` is absent or present.

origin: from-intent intent-constraint-4

observed: today the `agents` in `.rp.local.md` may declare lanes, which the orchestrator proposes when it asks the owner to confirm a run (read `reference/conventions/agents.md` and `reference/entries/triage.md` step 4). `rp check` reads no convention: only `next` and `land` read them (read `contextOf` in `rp.mjs`).

spec-requirement-8: `run-config.local.json` holds no agents: no profile's model, and no subagent model. A `run-config.local.json` that holds agents stops `rp`, naming the file and the key. On every clone, each role's models are the ones `run-config.json` gives.

origin: derived intent-constraint-6 the orchestrator proposes `.rp.local.md`'s Agents entries as defaults when it asks the owner to confirm a run (observed: `reference/conventions/agents.md`), and this repository pins a developer's own model names in `.rp.local.md` for the orchestrator's tool (observed: `.rp.opencode.md`, in `1-spec/spec/observations.txt`), while the agents change only when the owner asks

observed: `rp` takes each role's models only from the run configuration's agents, never from `.rp.local.md` (read `modelsOf` and `readConventions` in `rp.mjs`).

spec-requirement-9: `run-config.local.json` is never committed. Setup adds its name to the project's `.gitignore`. When Git tracks `run-config.local.json`, `rp check`, `rp next`, and `rp land` stop, naming the file as tracked.

origin: from-intent intent-constraint-4

observed: setup adds only the worktree folder root to `.gitignore` (read `reference/conventions/setup.md` § Write, step 4).

spec-requirement-10: This repository's `.gitignore` ignores `run-config.local.json` in every pipeline folder.

origin: derived intent-constraint-4 this repository is set up at conventions version 7, so setup, which adds the name, does not run here again (observed: `.rp.md` holds `"conventions": 7`, and `reference/conventions/load.md` § Schema stamp loads a file at the current version without setup). Its main checkout holds a `.rp.local.md`, which every run start records from, and its `.gitignore` lacks the name (observed: `1-spec/spec/observations.txt`)

spec-requirement-11: The orchestrator copies each text into the run configuration verbatim: a guardrail's rule, a resource's text, the commit format, and a lane's brief, each as its prose section writes it, with its placeholders unexpanded. It copies each value as written: the worktree folder root, the landing commit template, and each variable's template. It selects the entries and associates each with its profiles. It never summarizes or rewords. The skill states this to the orchestrator in plain words. Each role's assignment then carries each text as `.rp.md` or `.rp.local.md` writes it, with only its placeholders expanded.

origin: from-intent intent-constraint-5

observed: today `rp` copies each text from `.rp.md`'s frontmatter into the assignment as written (read `assignmentOf` in `rp.mjs`; `1-spec/spec/probe-today.txt`).
assumed: a run started in this repository after the change records texts in `run-config.json` identical to the texts of `.rp.md`'s sections (spec-assumption-1).

spec-requirement-12: At every run start, whether triage starts or continues the run, the orchestrator records the run configuration from `.rp.md` and `.rp.local.md` as they stand then. It commits `run-config.json` before the run's first step.

- `run-config.json`'s worktree folder root, landing commit, commit format, guardrails, resources, and variables are the ones `.rp.md` states, replacing what an earlier run start recorded.
- `run-config.local.json` holds what `.rp.local.md` overrides of these conventions, and overrides nothing when `.rp.local.md` overrides none of them.

Neither file is rewritten from `.rp.md` or `.rp.local.md` at any other moment. An edit to either file during a run therefore reaches no assignment, lane worktree, or landing commit of that run. A merged pipeline's `run-config.json` holds the conventions of its last run start.

origin: from-intent intent-constraint-6

observed: today triage writes `run-config.md` at every run start, before `run-started` fires (read `reference/entries/triage.md` step 6). An edit to `.rp.md` reaches the next assignment written in the same turn (`1-spec/spec/probe-today.txt`).

spec-requirement-13: The agents, the target phase, and the base in `run-config.json` change only when the owner asks. A run started on a pipeline that already has `run-config.json` keeps them, whatever `.rp.md`'s Agents section states then, unless the owner's request changes them. A new pipeline gets the ones the owner confirms.

origin: from-intent intent-constraint-6

observed: today a run needs the owner's confirmation when its pipeline has no run configuration or the request changes it, and otherwise starts under the recorded configuration (read `reference/entries/triage.md` step 4).

spec-requirement-14: A pipeline carries no version. `run-config.json` holds no format, `rp pipelines` lists each pipeline without one, and no `rp` command compares a pipeline's version. When `rp` cannot read a file of a pipeline, it stops, naming the file and the reason. A pipeline folder without `run-config.json` is one such case: `rp check`, `rp next`, and `rp land` stop, naming `<pipeline folder>/run-config.json` as missing.

origin: from-intent intent-constraint-7

observed: `rp check` stops with `pipeline of an earlier format; it is not continued` on a `run-config.md` of format 6 or without one, and with `pipeline of a newer format 8; update the skill` on format 8. `rp pipelines` prints a format for each pipeline, and prints `earlier` for a folder holding `prompt.md`, a phase folder under `base/`, or a phase folder without `run-config.md` (`1-spec/spec/probe-today.txt`).

spec-requirement-15: The orchestrator distinguishes no pipeline by format. Triage, reporting, and setup's migration name no pipeline format and no pipeline of an earlier format. Triage runs `rp check` on every pipeline `rp pipelines` lists for an issue, and routes each through its Route table like any other.

origin: from-intent intent-constraint-7

observed: triage routes a pipeline of an earlier format as history and runs `rp check` only on each live pipeline of the current format (read `reference/entries/triage.md` steps 2 and 3). Reporting reports a pipeline of an earlier format as listed (read `reference/entries/report.md` step 2). Changelog entries 6 and 7 each state how discovery lists pipelines of an earlier format (read `reference/conventions/changelog.md`).

spec-requirement-16: `rp` runs with Node and Git 2.38 or later alone. It needs no installed package.

origin: from-intent intent-constraint-8

observed: `rp.mjs` imports only Node's built-in modules (read its imports). The package's only dependencies are development dependencies (read `package.json`). `rp` needs Node and Git 2.38 or later, nothing else (read `scripts/README.md`).

spec-requirement-17: The intent, later inputs, `notes.md`, and threads keep their flat YAML frontmatter. `rp` accepts and rejects each such file as it does today, with the same reason.

origin: from-intent intent-constraint-8

observed: that frontmatter is a flat map of single-line text values (read `scripts/README.md` § Frontmatter).

spec-requirement-18: This repository's `.rp.md` holds its conventions as prose sections at version 7, with each text and value as its frontmatter data holds them today. A run started in this repository therefore carries the same guardrail, resource, commit-format, and brief texts, landing commit, worktree folder root, and lanes as today.

origin: from-intent intent-constraint-9

observed: this repository's `.rp.md` holds as JSON a worktree folder root, a landing commit, a commit format of several lines, two guardrails, one resource, and agents with two production lanes and two review lanes (read `.rp.md`).

spec-requirement-19: A folder of the pipelines folder root is a pipeline folder when it holds `run-config.json`. No other folder is a pipeline, whether it holds `run-config.md`, a phase folder, `prompt.md`, `base/`, only an intent, or tooling, and `rp pipelines` lists none of them.

origin: from-intent intent-proposal-1

observed: today a folder is a pipeline when it holds a phase folder (directly or under `base/`), `run-config.md`, or `prompt.md` (read `reference/run/state.md` § Names). `rp pipelines` lists folders of each kind (`1-spec/spec/probe-today.txt`).
observed: the merged pipelines in `v4`'s tree hold a format-6 `run-config.md`, and their intents name their issues in `origin:` lines of the body (`1-spec/spec/observations.txt`).

spec-requirement-20: When triage starts a new pipeline, its slug names a folder that exists nowhere in the repository: not in the pipelines folder root of the commit its branch starts from, and not at the tip of any branch, local or fetched. The new pipeline's folder therefore holds only its own files. This holds when an issue's earlier work sits only in folders `rp pipelines` does not list, and triage routes that work as new intent.

origin: derived intent-proposal-1 issues get new pipelines while an earlier pipeline folder exists. `trunk`'s pipelines folder root holds re-attempt folders such as `122-plan-driven-test-selection-v2`, `v4`'s holds issue 371's merged folder, and issue 195's folder sits at 16 branch tips, local and fetched (observed: `1-spec/spec/observations.txt`)

observed: a new pipeline written into the folder of `v4`'s merged pipeline 371 makes `rp check` report that folder's older spec, lane candidates, design doc, notes, and threads as `INVALID` (`1-spec/spec/probe-today.txt`).
observed: today triage learns of an issue's earlier pipelines only from `rp pipelines`, and a second pipeline for the issue appends `-2` or `-3` to its slug (read `reference/entries/triage.md` steps 2 and 5, and `reference/run/state.md` § Names).

spec-requirement-21: When triage asks the owner to confirm a run, the confirmation lists, under each profile, the name of each guardrail and each resource the run configuration will carry for that profile.

origin: from-intent intent-proposal-2

observed: today the confirmation lists the target phase, the lanes, and the models, and no guardrail or resource. Every new pipeline's first run asks for it, because the pipeline has no run configuration yet (read `reference/entries/triage.md` step 4).
assumed: names listed under each profile show the owner, before the run starts, a guardrail or resource that `.rp.md` declares and the run would not carry (spec-assumption-2).

spec-requirement-22: Agents defaults may be written in `.rp.md`'s shared conventions, or in the section of each agentic tool. Triage proposes a new run's agents from the shared Agents section or the active tool's Agents section, and from no other tool's.

origin: derived intent-goal intent-context-1 names the use, one Agents table per agentic tool, and this repository's tool sections already adapt its single Agents table to each tool in prose: under Claude Code, lanes on `astra` are spawned on `sonnet` (observed: `.rp.claude-code.md`, in `1-spec/spec/observations.txt`)

observed: today `.rp.md` holds one `agents` entry for every tool (read `reference/conventions/agents.md`). The orchestrator reads `.rp.md`'s shared sections and the active tool's section, `## <Tool>` inline or its sidecar file, and ignores other tools' sections (read `reference/conventions/load.md` § Sources).

## Acceptance criteria

spec-acceptance-criterion-1: Given setup, fresh or migrating, has completed, when `.rp.md` is read, then its frontmatter is the one line `conventions: 7`. Each of Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables that the project sets is a prose section, and a text of several lines is written as its lines.

spec-acceptance-criterion-2: Given a complete `.rp.md` whose frontmatter is `conventions: 7` and whose conventions are prose sections, when the orchestrator loads the conventions, then it loads them without offering setup.

spec-acceptance-criterion-3: Given a `.rp.md` at conventions version 5 or 6, when setup migrates it, then `.rp.md` is at version 7 with flat YAML frontmatter. Every convention it held as prose is still a prose section with its text unchanged, and the owner was offered Landing commit and Variables.

spec-acceptance-criterion-4: Given a pipeline whose run configuration holds a commit format, guardrails, resources, variables, and lanes with briefs, in a main checkout without `.rp.md` or `.rp.local.md`, when `rp next --apply` wakes a role, then:

- the role's assignment carries the commit format, each guardrail and resource that binds the role's profile, and its lane's brief;
- each of those texts has its placeholders expanded from the variables and the role's facts;
- the plan names the role's model and resources as the run configuration gives them.

spec-acceptance-criterion-5: Given a run configuration whose worktree folder root is a relative folder, when `rp next` plans a lane's worktree, then the worktree's path is `<that folder>/<lane branch>` under the main checkout's root.

spec-acceptance-criterion-6: Given a run configuration with a landing commit template, when `rp land` commits, then each commit's message is its subject in that template. Given no template, each message is the subject alone.

spec-acceptance-criterion-7: Given a pipeline under way, when `.rp.md` or `.rp.local.md` is edited, removed, or added, then `rp check`, `rp next`, and `rp land` print the same as before, and `rp next --apply` writes the same.

spec-acceptance-criterion-8: Given the orchestrator has started a run, when the pipeline folder is read on the pipeline branch, then it holds `run-config.json` and no `run-config.md`. `run-config.json` is JSON with no prose. It holds the target phase, the base, and the agents, and the worktree folder root, landing commit, commit format, guardrails, resources, and variables that `.rp.md` sets.

spec-acceptance-criterion-9: Given the owner gives a direction for the run, at triage or during the run, when the orchestrator records it, then `owner-directions` in `run-config.json` gains one entry for it, and the earlier entries are unchanged.

spec-acceptance-criterion-10: Given a `run-config.json` whose `owner-directions` holds entries, holds none, or is absent, when `rp check`, `rp next`, or `rp land` runs, then each prints and writes the same in all three cases.

spec-acceptance-criterion-11: Given a `.rp.local.md` that rewrites a guardrail, resource, or variable of `.rp.md` under the same name, or sets another commit format, landing commit, or worktree folder root, when a run starts on that clone, then every assignment, lane worktree, and landing commit of the run follows the local value. `run-config.json` holds `.rp.md`'s value, and no file committed on the pipeline branch holds the local value.

spec-acceptance-criterion-12: Given a `.rp.local.md` that names a guardrail or resource `.rp.md` lacks, when a run starts on that clone, then the assignment of each profile it binds carries it alongside every committed guardrail and resource that binds that profile.

spec-acceptance-criterion-13: Given `.rp.local.md` is absent, or overrides none of the conventions the run configuration holds, when a run starts on that clone, then every assignment, lane worktree, and landing commit of the run follows `run-config.json` alone.

spec-acceptance-criterion-14: Given a `run-config.local.json` that holds the target phase, the base, a lane, or a profile's model or subagent model, when `rp next` or `rp land` runs, then it stops, naming the file and the key.

spec-acceptance-criterion-15: Given a pipeline with a `run-config.local.json`, when `rp check` runs on a commit, then the frontier and each phase's state are what it reports for that commit without the file, on this clone or any other.

spec-acceptance-criterion-16: Given setup has completed, when a `run-config.local.json` is written in any pipeline folder, then Git ignores it.

spec-acceptance-criterion-17: Given a pipeline whose `run-config.local.json` is committed or staged, when `rp check`, `rp next`, or `rp land` runs, then it stops, naming the file as tracked.

spec-acceptance-criterion-18: Given this repository, when a `run-config.local.json` is written in any of its pipeline folders, then Git does not list it as untracked.

spec-acceptance-criterion-19: Given a `.rp.md` whose guardrail rule, resource text, commit format, and lane brief each run several lines with Markdown and placeholders in them, when a run starts, then `run-config.json` holds each text character for character as its section writes it, with its placeholders unexpanded. Each woken role's assignment carries those texts with only their placeholders expanded.

spec-acceptance-criterion-20: Given the skill, when the orchestrator reads how to record the run configuration, then it is told in plain words to copy each text verbatim, only selecting entries and associating them with profiles, and never summarizing or rewording.

spec-acceptance-criterion-21: Given `.rp.md`'s conventions have been edited since a pipeline's last run start, when the owner continues the pipeline, then before the run's first step the pipeline branch holds a commit whose `run-config.json` carries the edited conventions. The first woken role's assignment carries them too.

spec-acceptance-criterion-22: Given a run under way, when the owner edits `.rp.md` or `.rp.local.md`, or the orchestrator resumes after its context is compacted, then `run-config.json` and `run-config.local.json` keep what the run start recorded until the next run start.

spec-acceptance-criterion-23: Given a merged pipeline, when its folder is read in the base branch's tree, then its `run-config.json` holds the conventions recorded at its last run start.

spec-acceptance-criterion-24: Given a pipeline whose agents in `run-config.json` differ from `.rp.md`'s Agents section, when the owner continues it without asking for a change, then its agents, target phase, and base are unchanged after the run start. When the owner asks for another target phase, only the target phase changes.

spec-acceptance-criterion-25: Given a pipeline folder without `run-config.json`, such as one holding `run-config.md`, when `rp check`, `rp next`, or `rp land` runs on it, then it stops, naming `<pipeline folder>/run-config.json` as missing.

spec-acceptance-criterion-26: Given a `run-config.json` that `rp` cannot read, when `rp check`, `rp next`, or `rp land` runs, then it stops, naming the file and the reason. No message refers to an earlier or a newer format.

spec-acceptance-criterion-27: Given any pipelines folder root, when `rp pipelines` lists its pipelines, with or without `--json`, then no entry carries a format.

spec-acceptance-criterion-28: Given the skill, when the orchestrator follows triage, reporting, or setup's migration, then no step names a pipeline format or a pipeline of an earlier format. Every pipeline `rp pipelines` lists for the issue is checked with `rp check` and routed through the Route table.

spec-acceptance-criterion-29: Given a checkout with no installed package, when `rp` runs any of its commands, then it runs with Node and Git alone.

spec-acceptance-criterion-30: Given an intent, later input, `notes.md`, or thread that `rp` accepts or rejects today, when `rp check` or `rp validate` reads it, then it accepts or rejects the file as it does today, with the same reason.

spec-acceptance-criterion-31: Given this repository's `.rp.md`, when it is read, then its frontmatter is `conventions: 7` alone and its conventions are prose sections. When a run starts in this repository, each assignment carries the same guardrail, resource, commit-format, and brief texts as the assignment `rp` writes today from the frontmatter data. The run's lane worktrees go under `.worktrees`, and its landing commits read `<subject> (orchestrator)`.

spec-acceptance-criterion-32: Given a pipelines folder root holding folders with `run-config.json`, and folders without it that hold `run-config.md`, a phase folder, `prompt.md`, `base/`, only an intent, or tooling, when `rp pipelines` lists it, then it lists only the folders holding `run-config.json`.

spec-acceptance-criterion-33: Given an issue whose only folders in the pipelines folder root lack `run-config.json`, when the owner brings work on it, then:

- triage routes the work as new intent;
- the new pipeline's folder exists neither in the tree its branch starts from nor at any branch tip;
- `rp check` on the new pipeline reports no file the new pipeline did not write.

spec-acceptance-criterion-34: Given guardrails and resources that each bind some profiles, when triage asks the owner to confirm a run, then the confirmation names, under each profile, every guardrail and resource the run configuration will carry for it.

spec-acceptance-criterion-35: Given a `.rp.md` whose active tool's section holds an Agents section, while another tool's section holds a different one, when triage proposes a new run's configuration, then the proposed models and lanes are the ones in the active tool's section.

## Exclusions

spec-exclusion-1: `rp` does not check that the texts and values of the run configuration match `.rp.md` or `.rp.local.md`.

spec-exclusion-2: Setup offers no migration for a version-7 `.rp.md` whose conventions are JSON data in its frontmatter.

spec-exclusion-3: Nothing migrates an existing pipeline. `rp` does not list, read, or continue a pipeline folder that holds `run-config.md` and no `run-config.json`. This includes the merged pipelines in this repository's base branch, and this pipeline.

spec-exclusion-4: `rp` does not stop on a project whose `.gitignore` lacks `run-config.local.json`. Only a tracked `run-config.local.json` stops it.

## Considered and not required

- A run confirmation without guardrail and resource names, because a confirmation is asked only at some run starts — not taken: every new pipeline's first run asks for one, and there the owner sees the selection that `rp` leaves unchecked before any role runs (read `reference/entries/triage.md` step 4).
- `run-config.local.json` overriding a profile's model or subagent model, the reading of intent-constraint-4 that bars only lanes — not taken: under intent-constraint-6 the agents change only when the owner asks, and this repository already pins a developer's own model names in `.rp.local.md` for the orchestrator's tool (observed: `.rp.opencode.md`).
- `owner-directions` recorded in `run-config.local.json` — the owner gives directions for a run directly, not in `.rp.local.md` (observed: the main checkout's `.rp.local.md` holds only an Artifact storage section, in `1-spec/spec/observations.txt`).
- Leaving this repository's `.gitignore` entry to setup — not taken: setup does not run here again at version 7 (spec-requirement-10).
- Leaving per-tool Agents to the loader's existing rule for tool sections, with no requirement of its own — not taken: today Agents is one frontmatter entry for every tool (read `reference/conventions/agents.md`), and intent-context-1 names the per-tool table as the use that was lost.
- Checking a new pipeline's slug only against the pipelines folder root of the commit its branch starts from — not taken: issue 195's folder and branch exist at 16 branch tips, local and fetched, and are not in `v4`'s tree (observed: `1-spec/spec/observations.txt`).
- Reading a folder that holds a phase folder or `run-config.md`, but no `run-config.json`, as a pipeline whose `run-config.json` is missing — not taken: intent-proposal-1 makes `run-config.json` the mark of a pipeline, and such a folder's intent names its issue in body `origin:` lines (observed: `v4`'s pipeline 371, in `1-spec/spec/observations.txt`).
- Listing a prepared pipeline whose run never started, with an intent committed and no `run-config.json` — no source shows a consumer continuing one. Triage writes the run configuration at the run start that follows preparation (read `reference/entries/triage.md` steps 5 and 6), and a later pipeline for the issue takes a folder at no branch tip (spec-requirement-20).
- An intent that names its issue only in body `origin:` lines, in a folder holding `run-config.json` — no pipeline started under the current skill writes one: the intent names its issue in its frontmatter (read `reference/entries/intent-format.md`).
- Offering the tip of an issue's older folder as the start of the new pipeline — the tips of the merged older folders are already in the base branch (observed: 368–371 in `v4`'s tree), and a request may still name any branch to start from (read `reference/entries/triage.md` step 3).
- A review lane's tree without the folders of the pipelines folder root that lack `run-config.json` — no intent item asks for it. Such folders become other content of the root and are kept like tooling (read `reviewBuildOf` and `pipelineFoldersIn` in `rp.mjs`).
- Asking the owner to confirm a run because the conventions recorded at its start differ from the last run's — triage asks for confirmation only for what the request changes (read `reference/entries/triage.md` step 4), and intent-constraint-6 rewrites the conventions at every run start.
- Listing the commit format, landing commit, worktree folder root, or variables in the run confirmation — intent-proposal-2 names guardrails and resources.
- An Agents section in both the shared conventions and the active tool's section — no `.rp.md` observed holds both (observed: this repository's `.rp.md` and `trunk`'s each hold one shared Agents table).
- Recording in the run configuration the conventions `rp` does not read: Issues, Pipeline slug, Pipeline branch format, Pipelines folder root, Artifact storage, PR format, Lifecycle hooks, and Health monitoring — `rp` reads none of them (read `rp.mjs`), and intent-constraint-2 lists what the run configuration holds.
- `rp thread` and `rp validate` reading `run-config.local.json` — neither reads a run configuration (read `scripts/README.md` § `thread` and § `validate`).
- Fixing the key names of `run-config.json` other than `owner-directions`, their JSON forms, and which keys are required — no intent item names them, so the design doc decides them.
- A requirement that `README.md`, `docs/`, and `scripts/README.md` describe the new split — the repository's rules already require it of every change that alters behavior (read `AGENTS.md` § Repository rules), and it is not an outcome of the software.

## Open assumptions

spec-assumption-1: The orchestrator, told in plain words to copy each text verbatim, records the texts of `.rp.md`'s prose sections unchanged — assumed: a run started in this repository after the change records `run-config.json` texts that equal `.rp.md`'s sections and today's frontmatter values.

spec-assumption-2: Guardrail and resource names listed under each profile in the run confirmation show the owner, before the run starts, one that `.rp.md` declares and the run would not carry — assumed: a confirmation in this repository that names its two guardrails and one resource under the profiles each binds.
