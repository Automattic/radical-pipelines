# Spec: Prose conventions, and a run configuration `rp` reads

## Overview

Today a project's conventions live as JSON in `.rp.md`'s frontmatter, mixed with prose: multi-line texts are lists of JSON strings and `agents` allows one table. `rp` reads `.rp.md` and `.rp.local.md` from the main checkout, `run-config.md`'s own frontmatter, and a pipeline `format` it compares and keeps earlier-format readers for.

After the change `.rp.md` is prose a person reads and edits. At every run start the orchestrator records the conventions `rp` needs into `run-config.json` (committed, from `.rp.md`) and `run-config.local.json` (never committed, from `.rp.local.md`). `rp` reads those, never `.rp.md` or `.rp.local.md`, and a pipeline carries no version: what `rp` cannot read stops it, naming the file and the reason.

## Requirements

spec-requirement-1: `.rp.md` holds prose sections only. Its frontmatter is flat YAML holding only `conventions: 7`. Worktree folder root, Landing commit, Commit format, Guardrails, Resources, Agents, and Variables are prose sections a person edits as text; a guardrail or resource names the profiles it binds, and a lane its brief. This repository's `.rp.md` is rewritten that way once, every text it holds today unchanged.

origin: from-intent intent-constraint-1, intent-constraint-9

observed: `.rp.md` opens with a JSON frontmatter holding `conventions`, `worktree-folder-root`, `landing-commit`, `commit-format` (a list of strings), `guardrails`, `resources`, and `agents` (read `.rp.md`).
observed: version 6 kept each guardrail and resource as prose naming its profiles (`git show 44345a11:skills/radical-pipelines/reference/conventions/guardrails.md`, `- agents: <profile names>`) and each profile's lanes and briefs as prose (`git show fb2cc29c:.rp.md`, § Agents).
assumed (spec-assumption-1): the prose sections carry every value the JSON holds today in a form from which the orchestrator copies each text unchanged; confirmed by recording from this repository's rewritten `.rp.md` and comparing with today's JSON values.

spec-requirement-2: Setup writes `.rp.md` as spec-requirement-1 describes and adds the name `run-config.local.json` to the project's `.gitignore`. Migrating a project from conventions version 6 stamps version 7 in that flat YAML frontmatter and leaves every convention the prose it was; no convention text moves into the frontmatter.

origin: from-intent intent-constraint-1, intent-constraint-4

observed: `setup.md` § Write and `changelog.md` entry 7 instruct moving those conventions into frontmatter data, and `.rp.local.md`'s likewise (read both).
observed: version 6's `.rp.md` frontmatter is JSON, `{ "conventions": 6 }` (`git show fb2cc29c:.rp.md`).

spec-requirement-3: `rp` reads neither `.rp.md` nor `.rp.local.md`: what any `rp` command prints, writes, and stops on is the same whatever those files hold or lack.

origin: from-intent intent-constraint-2

observed: `rp next` in a repository whose main checkout lacks `.rp.md` stops with `rp: cannot read <main>/.rp.md: missing` (`1-spec/lanes/omits/spec/probe.txt`); `rp next` and `rp land` read both files from the main checkout (read `rp.mjs`, `readConventions`).

spec-requirement-4: The run configuration is `run-config.json` at the pipeline folder root: a JSON file with no prose body, holding `target-phase`, `base`, `agents`, `worktree-folder-root`, `landing-commit`, `commit-format`, `guardrails`, `resources`, `variables`, and `owner-directions`. Each key keeps the meaning and form it has today in `run-config.md` or in `.rp.md`'s data: a text is a string or a list of strings that are its lines; a guardrail holds its `rule` and `profiles`, a resource its `resource` and `profiles`. `target-phase`, `base`, and `worktree-folder-root` are required; every other key is optional. `rp` reads no `run-config.md`.

origin: from-intent intent-constraint-2

observed: the keys, forms, and which are required are those of `parseConfig` and `parseConventions` (read `rp.mjs`; `scripts/README.md` § `run-config.md`, § Conventions data); today `worktree-folder-root` is required in `.rp.md`.

spec-requirement-5: `rp` takes every convention it needs from the run configuration: the commit format, the guardrails and resources bound to a role's profile, the variables, and a lane's brief, in the role's assignment, with placeholders expanded as today; the worktree folder root, for the path of each lane's worktree; the landing commit template, for the message of each commit `rp land` makes.

origin: from-intent intent-constraint-2, intent-context-1

observed: those are the three places `rp` uses conventions: `assignmentOf`, `planOf` (`<worktree folder root>/<lane branch>`), and `landingMessage` (read `rp.mjs`); `rp next` on this pipeline names `wake spec-producer-omits resource test suite and scripts`, the resource `.rp.md` holds today.

spec-requirement-6: `run-config.json` holds `owner-directions`, a list of strings: the owner's directions for the run, one entry per direction, added as they are given. `rp` accepts it absent, empty, or with entries, and its content changes nothing `rp` prints, writes, or stops on. A value that is not a list of strings is a file `rp` cannot read (spec-requirement-12).

origin: from-intent intent-constraint-3

observed: today the owner's directions are free prose in `run-config.md`'s body, which `rp` ignores (`run-config.md` of this pipeline, lines 49–52; `scripts/README.md` § `run-config.md`).

spec-requirement-7: `run-config.local.json`, beside `run-config.json`, holds what the orchestrator recorded from `.rp.local.md` and overrides `run-config.json` by name. `rp next` and `rp land` read it when it exists: a `worktree-folder-root`, `landing-commit`, or `commit-format` it holds replaces the run configuration's, and each guardrail, resource, and variable it names replaces or adds the run configuration's of that name; those it does not name stay. It cannot hold the target phase, the base, or a lane: a file that does is a file `rp` cannot read, naming the key. For a given commit, `rp check` prints the same frontier on every clone, whether the file is absent, present, or holds anything it may hold.

origin: from-intent intent-constraint-4

observed: `.rp.local.md`'s entries replace or add `.rp.md`'s by name for `worktree-folder-root`, `landing-commit`, `commit-format`, `guardrails`, `resources`, and `variables` today (`readConventions`); the frontier is computed from the pipeline files alone (`rp check` reads no convention).

spec-requirement-8: `run-config.local.json` holds no `agents` and no `owner-directions`: a file that holds either is a file `rp` cannot read, naming the key.

origin: derived intent-constraint-6, `.rp.local.md`'s `Agents` entries are proposed as defaults when the owner confirms a run (`agents.md`), `rp` takes each role's models from the run's `agents` only (`modelsOf`), and nothing in `.rp.local.md` is an owner's direction for a run

observed: `readConventions` merges no `agents` from `.rp.local.md`; `modelsOf` reads `run-config.md`'s `agents` (read `rp.mjs`).

spec-requirement-9: `run-config.local.json` is never committed. `rp check`, `rp next`, and `rp land` stop, naming the file and that it is tracked, when Git tracks it in the tree they read.

origin: from-intent intent-constraint-4

observed: `.rp.local.md` is git-ignored today (`.gitignore`) and its values would reach the pipeline branch if recorded in the committed run configuration (intent-context-4).

spec-requirement-10: The orchestrator records the run configuration at every run start, each time triage starts or continues a run: it rewrites in `run-config.json`, replacing what the previous run start recorded, what it derives from `.rp.md` (`worktree-folder-root`, `landing-commit`, `commit-format`, `guardrails`, `resources`, `variables`), and in `run-config.local.json`, never in `run-config.json`, what it derives from `.rp.local.md`; it commits `run-config.json` when it changed. It records at no other moment. `agents`, `target-phase`, and `base` change only when the owner asks. Editing `.rp.md` or `.rp.local.md` while a run is under way therefore changes no assignment, plan, or landing message until the next run start, and a pipeline keeps the configuration it ran under.

origin: from-intent intent-constraint-6, intent-context-3, intent-context-4

observed: today a change to `.rp.md` changes the next assignment, because `rp next` reads it at every step (`contextOf` calls `readConventions` on each `next` and `land`); triage writes `run-config.md` at step 6 of each run, holding the target, the base, and the agents the owner confirmed (`triage.md` § 6).

spec-requirement-11: The orchestrator copies each text into the run configuration verbatim — a guardrail's rule, a resource's text, the commit format, a lane's brief — character for character, placeholders unexpanded. It selects which entries go in and associates each guardrail and resource with the profiles it binds; it never summarizes or rewords. The skill states this plainly.

origin: from-intent intent-constraint-5

observed: placeholders are expanded in the assignment, from the stored text (`assignmentOf`, `expandText`).

spec-requirement-12: A pipeline carries no version. `run-config.json` has no `format`, no `rp` output names a pipeline format, and `rp` reads a pipeline as the current skill defines it. A file `rp` cannot read — absent, not JSON, with a key or value the skill does not define, or missing a required key — stops the command with `rp: <file>: <reason>`, naming the file and the reason. A pipeline folder with a `run-config.md` and no `run-config.json` stops `rp check`, `rp next`, and `rp land` the same way, naming `<folder>/run-config.json` as missing. Intent origins are read from the intent's frontmatter only.

origin: from-intent intent-constraint-7

observed: `rp check` on a folder with a format-6 `run-config.md` prints `rp: .pipelines/1-old/run-config.md: pipeline of an earlier format; it is not continued`; `rp pipelines` prints a format per pipeline and in `--json`, and reads an earlier-format intent's origins from its leading `origin:` body lines (`probe.txt`; `scripts/README.md` § `pipelines`).

spec-requirement-13: `rp pipelines` lists a folder of the pipelines folder root only when it holds `run-config.json`. Every other folder, whatever it holds — an intent, phase folders, a `run-config.md`, a `prompt.md`, tooling — is not a pipeline for `rp`. A listing carries its state, ref, commit, folder, and origins, and no format. A folder that holds `run-config.json` and no readable `0-intent/intent.md` stops the command, naming that path.

origin: derived intent-constraint-7, triage and the report entry find an issue's pipelines through `rp pipelines` (`triage.md` § 2, `report.md` step 2), and it recognizes folders of earlier layouts today (`pipelineFoldersIn`: a phase folder, `run-config.md`, `prompt.md`, or `base/`); this adopts intent-proposal-1, the one definition of a pipeline folder that reads no earlier format

observed: `rp pipelines` lists an intent-only folder as `merged earlier` and a folder holding nothing but `tooling/a.txt` not at all (`probe.txt`).
assumed (spec-assumption-2): every pipeline triage starts after the change is listed by `rp pipelines` from its run start; confirmed by starting a run through triage and listing it.

spec-requirement-14: When an issue's only folders in the pipelines folder root are ones `rp pipelines` does not list, triage routes the request as new intent from the base branch, with no pipeline to continue. A new pipeline's slug names no folder that already exists in the pipelines folder root of the branch it starts from: it takes the next suffix (`-2`, `-3`).

origin: derived intent-proposal-1, intent-constraint-7; triage learns that an issue has an earlier pipeline, so that the next slug takes `-2` (`state.md` § Names), only from `rp pipelines`, which listed the older folders as `merged earlier`; and `rp` reads every file of a folder it takes as a pipeline (`scripts/README.md` § Pipeline files), so a new pipeline in an old folder would read the old folder's files as its own

observed: `git ls-tree trunk .pipelines/` lists 25 folders and `rp pipelines --base v4` lists the format-6 folders 368 to 371 as `merged 6` (`probe.txt`); triage step 5 names the slug "per `../run/state.md` § Names" and checks no folder.

spec-requirement-15: The skill, `scripts/README.md`, `README.md`, and `docs/` describe `.rp.md` as prose and `rp` as reading the run configuration; they carry the rule of spec-requirement-11, describe no pipeline format or earlier format, and name the files and keys this spec names.

origin: from-intent Goal, intent-constraint-2, intent-constraint-7

observed: the prose that describes the current split is in `reference/conventions/{load,setup,agents,guardrails,resources,changelog}.md`, `reference/entries/{triage,report}.md`, `reference/run/state.md`, `scripts/README.md`, `templates/README.md`, `docs/model.md`, `docs/glossary.md`, and `README.md` (grep for `Conventions data`, `earlier format`, `format 7`).

## Acceptance criteria

spec-acceptance-criterion-1: Given a repository whose main checkout holds no `.rp.md` and no `.rp.local.md`, and a pipeline folder with a valid `run-config.json`, when `rp next` and `rp land` run, then each prints and writes what it does when both files exist with any content, on standard output and in the files written.

spec-acceptance-criterion-2: Given `run-config.json` with a commit format, a guardrail bound to `reviewer`, a resource bound to `reviewer` and `implementer`, a variable used in a text, and a lane with a brief, when `rp next --apply` wakes the implementer and that lane's role, then each assignment file carries the commit format and only the guardrails and resources bound to its profile, the lane's role carries its brief, the variable and the vocabulary placeholders are expanded, and `rp next` prints a `wake <role> resource <name>` line for each resource carried.

spec-acceptance-criterion-3: Given a `worktree-folder-root` and a configured lane with no worktree, when `rp next` runs, then the plan's `create-worktree` line names `<worktree folder root>/<lane branch>`.

spec-acceptance-criterion-4: Given a `landing-commit` template holding `{subject}`, when `rp land` commits a certification, then the commit's message is the subject in that template; given none, the subject alone.

spec-acceptance-criterion-5: Given `run-config.json` with `owner-directions` holding entries, empty, or absent, when `rp check`, `rp next`, and `rp land` run, then each prints and writes the same; given `owner-directions` that is a string or a list holding a non-string, then each stops with `rp: <path>: …` naming `owner-directions`.

spec-acceptance-criterion-6: Given `run-config.local.json` holding a guardrail with the name of one in `run-config.json`, another guardrail with a new name, and a `commit-format`, when `rp next --apply` writes the assignment of a profile both bind, then the assignment carries the local guardrail's text in place of the committed one's, the new guardrail, the committed guardrails the local file does not name, and the local commit format.

spec-acceptance-criterion-7: Given the same pipeline commit, when `rp check` runs with `run-config.local.json` absent, present, and absent on another clone, then its output is the same.

spec-acceptance-criterion-8: Given `run-config.local.json` holding `target-phase`, `base`, `agents`, or `owner-directions`, when `rp next` runs, then it stops with `rp: <path>: …` naming that key and writes nothing.

spec-acceptance-criterion-9: Given `run-config.local.json` tracked by Git, when `rp check`, `rp next`, and `rp land` run, then each stops with `rp: <path>: …` saying it is tracked; once it is untracked they run.

spec-acceptance-criterion-10: Given a run under way and `.rp.md`'s guardrail text edited, when no run starts, then `rp next --apply` writes the same assignments; when the next run starts, then `run-config.json` at the commit that records it holds the edited text, and its `target-phase`, `base`, and `agents` are as they were unless the owner asked.

spec-acceptance-criterion-11: Given `.rp.local.md` holding a guardrail `g` and `.rp.md` holding `g` and another guardrail `h`, when a run starts, then `run-config.local.json` holds `g` with `.rp.local.md`'s text, `run-config.json` holds `g` with `.rp.md`'s text and `h`, and no commit holds `run-config.local.json`.

spec-acceptance-criterion-12: Given a guardrail in `.rp.md` whose rule has several paragraphs, a list, and a placeholder, when a run starts, then the rule `run-config.json` holds reads character for character as it does in `.rp.md`, the placeholder unexpanded; the same holds for a resource's text, the commit format, and a lane's brief; and the skill's prose states the copy is verbatim.

spec-acceptance-criterion-13: Given a pipeline folder with no `run-config.json`, whatever else it holds, when `rp check`, `rp next`, and `rp land` run on it, then each stops with `rp: <folder>/run-config.json: …` saying it is missing. Given a `run-config.json` that is not JSON, one with a `format` key, one without `target-phase` or `worktree-folder-root`, or one with a text after the JSON, then each command stops naming the file and the reason, and no message names a format or an earlier format. Given a folder holding both `run-config.json` and `run-config.md`, then the commands read `run-config.json` alone.

spec-acceptance-criterion-14: Given a pipelines folder root holding a folder with `run-config.json`, a folder with an intent only, a folder with phase folders and a `run-config.md`, and a tooling folder, when `rp pipelines` runs, then it lists the first alone, in text and in `--json`, with no format; given an issue's intent with no frontmatter origin, then `--issue` does not list it; given a folder with `run-config.json` and no intent, then it stops naming `0-intent/intent.md`.

spec-acceptance-criterion-15: Given an issue whose only folder in the pipelines folder root is one with a `run-config.md` and phase folders, when triage scans it, then `rp pipelines --issue` lists nothing, the request routes as new intent from the base branch, and the new pipeline's slug is not that folder's name.

spec-acceptance-criterion-16: Given this repository after the change, when `.rp.md` is read, then its frontmatter is `conventions: 7` alone in flat YAML, its Worktree folder root, Landing commit, Commit format, Guardrails, Resources, and Agents are prose sections whose texts equal the values it held as JSON, and a run start that records from it yields a `run-config.json` whose commit format, guardrails, resources, landing commit, worktree folder root, and lanes equal those values.

spec-acceptance-criterion-17: Given a project with no `.rp.md`, and a project whose `.rp.md` is at conventions version 6, when setup runs, then each ends with a prose `.rp.md` stamped `conventions: 7` in flat YAML, the migrated one with every convention text unchanged, and `.gitignore` names `run-config.local.json`.

spec-acceptance-criterion-18: Given the skill, `scripts/README.md`, `README.md`, and `docs/` after the change, when read, then none says `rp` reads `.rp.md` or `.rp.local.md`, that conventions are data in `.rp.md`'s frontmatter, that `run-config.md` is the run configuration, or that a pipeline has a format or an earlier format, and they state the verbatim copy.

## Exclusions

spec-exclusion-1: `rp` does not check that a text in the run configuration equals the prose it was recorded from.

spec-exclusion-2: `rp` does not act on `owner-directions`.

spec-exclusion-3: Nothing converts the conventions data a version-7 `.rp.md` held in its frontmatter, which was never released, nor any existing pipeline: a pipeline whose run configuration is `run-config.md` is not converted and stops `rp`.

spec-exclusion-4: `rp` gains no dependency, and the frontmatter of role-written files (the intent, later inputs, `notes.md`, threads) is accepted and rejected as before.

spec-exclusion-5: `rp` does not read `.gitignore`; it stops on a tracked `run-config.local.json`, not on a missing ignore entry.

## Considered and not required

- Each guardrail and resource listed by name under its profiles in the run confirmation (intent-proposal-2) — a confirmation is given only for a run that writes an intent, constraint, or proposal, has no run configuration, changes it, or leaves a question open (observed: `triage.md` § 4), while the recording happens at every run start (intent-constraint-6), so the list could not show an omission at most run starts; the recorded texts are committed in `run-config.json` and readable at the commit that records them; no omission is observed, because `rp` read these as JSON data until this change and the orchestrator has not yet recorded them from prose.
- `agents` or `owner-directions` in `run-config.local.json`, the reading of intent-constraint-4 that bars only the target phase, the base, and lanes — not taken: intent-constraint-6 has the agents change only when the owner asks, and observed `rp` never took a role's models from `.rp.local.md`; stated in spec-requirement-8.
- Conventions other than the ten keys recorded in the run configuration — Issues, Pipeline slug, Pipeline branch format, Pipelines folder root, Artifact storage, PR format, Lifecycle hooks, Health monitoring — observed: `rp` reads none (`rp.mjs` reads the worktree folder root, landing commit, commit format, guardrails, resources, and variables), and intent-constraint-2 lists the keys.
- A folder holding an intent and no `run-config.json` listed by discovery — observed: today it is listed `merged earlier` and `rp check` calls it an earlier format (`probe.txt`); triage prepares it and writes the run configuration at the same run start (`triage.md` §§ 5–6), and no document shows a consumer continuing a prepared pipeline that never started.
- Offering to start a new pipeline from an older pipeline's tip, which discovery offered by listing it — observed: intent-context-5, the owner declined old pipelines on the error of a file that cannot be read; the owner may still name a branch as `starts-from`.
- A review lane's tree without the folders `rp pipelines` no longer lists — observed: the lane's tree keeps what discovery does not recognize as a pipeline, at the tip's version in both its commits (`reviewBuildOf`), so the net change it reads is unaffected.
- `rp thread` and `rp validate` reading `run-config.local.json` — observed: they read no run configuration (`scripts/README.md` § `thread`, § `validate`).
- Reading `run-config.local.json` at `rp check --ref <commit>` — the file is never committed, and `rp check` reads no convention.
- This repository's `.gitignore` gaining `run-config.local.json` — intent-constraint-4 gives the entry to setup and intent-constraint-9 rewrites only `.rp.md`; observed: the main checkout's `.rp.local.md` holds no convention data, only `Artifact storage` (`probe.txt`), so no local file is recorded here.
- A separate Agents section per agentic tool — observed: the loader already reads `.rp.md` and the active tool's section and ignores the others (`load.md` § Sources); that rule covers every prose convention, so no requirement of its own.

## Open assumptions

spec-assumption-1: The prose sections carry every value the JSON holds today in a form from which the orchestrator copies each text unchanged — assumed: recording from this repository's rewritten `.rp.md` and comparing the result with today's JSON values (spec-acceptance-criterion-16).

spec-assumption-2: Every pipeline triage starts after the change is listed by `rp pipelines` from its run start, so no pipeline in use falls outside discovery — assumed: starting a run through triage and listing it.
