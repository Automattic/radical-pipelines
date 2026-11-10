# Design Doc: Keep .rp.md as prose and have rp read every convention from the run configuration

## Overview

Today `rp next` and `rp land` read the worktree folder root, the landing commit, the commit format, the guardrails, the resources, and the variables from the JSON frontmatter of the main checkout's `.rp.md` and `.rp.local.md`, at every step. Every pipeline also carries a format, which `rp` compares. The change moves that boundary. At every run start the orchestrator copies those conventions verbatim from a prose-only `.rp.md` into the pipeline's committed `run-config.json`. It copies what `.rp.local.md` overrides, a developer's model pins among it, into an uncommitted `run-config.local.json` beside it. `rp` reads only those two files: `check` reads the committed one, and `next` and `land` read the committed one with the local one overlaid by name.

A pipeline is a folder holding `run-config.json`. No file carries or compares a version, and what `rp` cannot read stops it, naming the file and the reason. The skill's prose changes to match. Conventions become prose entries whose texts copy as one block. The recording rules are stated once, in `state.md`, and applied at triage's run start. The notion of an earlier pipeline format goes.

## Architecture

**New**

- `run-config.json`, at the pipeline folder root: the run configuration. The orchestrator writes and commits it. `check`, `next`, and `land` read it.
- `run-config.local.json`, beside it in the pipeline worktree: what this clone overrides. The orchestrator writes it, and no commit holds it. `next` and `land` read it. `check` reads only whether Git tracks it.

**Modified: `rp` (`skills/radical-pipelines/scripts/rp.mjs`)**

- Run configuration reader: parses and validates `run-config.json`, taking over the schema checks of today's conventions data, and with them `run-config.md`'s role.
- Run view of `next` and `land`: `run-config.json` with `run-config.local.json` overlaid. It feeds the assignments, the plan's model and resource lines, the lane worktree paths, and the landing commit messages. The main checkout gives only its root, against which a relative worktree folder root resolves.
- Pipeline reading: recognizes `run-config.json` as the run configuration, and stops when Git tracks `run-config.local.json`.
- Discovery (`pipelines`) and the review-lane build: mark a pipeline folder by `run-config.json` alone, and list no format.

**Modified: skill prose**

- `reference/conventions/` `load.md`, `setup.md`, `changelog.md`, `guardrails.md`, `resources.md`, and `agents.md`: conventions as prose entries, and setup and migration writing them.
- `reference/run/state.md`: the Files table, § Run configuration, § Names, and § Discovery.
- `reference/entries/triage.md` steps 2 to 6, and `reference/entries/report.md` step 2.
- `reference/run/loop.md` and `SKILL.md`: the file's name.
- `templates/README.md`: where values come from.
- `scripts/README.md`: the contract of every `rp` change below.

**Modified: repository**

- `.rp.md` and `.gitignore`.
- The tests under `scripts/test/rp/`.
- `README.md`, `docs/`, and a changeset, per `AGENTS.md` § Repository rules.

**Removed from `rp`.** The change leaves these without a purpose:

- `.rp.md` and `.rp.local.md` reading and their parser (`parseConventions`, `readConventions`, `CONVENTIONS`).
- The JSON-frontmatter reader of `run-config.md`.
- The pipeline format (`FORMAT`, `formatOf`, `requireFormat`) and the format-dependent origins reading (`ORIGINS_IN_FRONTMATTER`, and the leading `origin:` body lines).
- The older pipeline marks: a phase folder, `base/`, `run-config.md`, and `prompt.md`.
- The list-of-lines form of a text.

**Untouched but relevant**

- The flat-YAML frontmatter reader and the file grammar of the intent, later inputs, `notes.md`, and threads.
- Certification, the step record, the frontier rules, and `rp thread` and `rp validate`, which read no run configuration.
- `tools/<tool>.md` § Models, which resolves whatever model name a plan names.
- The `.rp.<tool>.md` sidecars.

**Data flow.** The owner edits `.rp.md`, and a developer edits `.rp.local.md`, in the main checkout. At a run start, triage's step 6 records `run-config.json`, commits it on the pipeline branch, and records `run-config.local.json` in the pipeline worktree. From then until the next run start, `check` reads `run-config.json`, and `next` and `land` read both files. Neither `.rp.md` nor `.rp.local.md` is read by `rp`, or by the orchestrator for the run, until the next run start.

## Decisions

design-doc-decision-1: `run-config.json` is the run configuration and `rp`'s only source of what it reads about a run

**Serves:** spec-requirement-3, spec-requirement-4, spec-requirement-5, spec-requirement-14, spec-requirement-16, spec-requirement-17, spec-acceptance-criterion-4, spec-acceptance-criterion-5, spec-acceptance-criterion-6, spec-acceptance-criterion-7, spec-acceptance-criterion-10, spec-acceptance-criterion-25, spec-acceptance-criterion-26, spec-acceptance-criterion-29, spec-acceptance-criterion-30

**Decision:**

- The run configuration is `<pipeline folder>/run-config.json`. The whole file is one JSON object, with no frontmatter and no prose. It replaces `run-config.md` as the run configuration. A `run-config.md` is no longer a pipeline file, and is ignored like any other file in the folder.
- It holds `target-phase`, `base`, `worktree-folder-root`, `agents`, `landing-commit`, `commit-format`, `guardrails`, `resources`, `variables`, and `owner-directions` (§ Interfaces). `target-phase`, `base`, and `worktree-folder-root` are required, and every other key is optional. Each entry is validated as `.rp.md`'s conventions data is validated today, the reason naming `run-config.json` and the entry. No other key exists at any level.
- `owner-directions` is a list of strings. `rp` checks only its form. Whether it holds entries, holds none, or is absent, no command prints or writes anything different.
- `check`, `next`, and `land` read the file where they read every pipeline file: the working tree, or a commit with `--ref` and when landing.
  - A missing file stops them, naming `<pipeline folder>/run-config.json` as missing, in the form `rp` uses for a missing intent.
  - A file that is not JSON, not an object, or outside the schema stops them, naming the file and the reason.
  - `check` validates the whole file, conventions included, so the three commands accept and reject the same files.
- `next` and `land` take everything they use from the run view (design-doc-decision-3): the commit format, guardrails, resources, variables, and briefs; the worktree folder root; the landing commit; the models and lanes; and the target phase and base. From the main checkout they take only its root, against which a relative worktree folder root resolves. No command reads `.rp.md` or `.rp.local.md`.
- The flat-YAML frontmatter reader stays as it is. Node's built-in JSON parser reads both run configuration files, and no package is added.

**Alternatives:**

- Keep `run-config.md`, with a JSON frontmatter and a prose body for the owner's directions. Rejected: intent-constraint-2 makes the run configuration a JSON file with no prose body, and intent-constraint-3 puts the directions in it.
- `check` validates only what it uses (target phase, base, agents), leaving the conventions to `next` and `land`. Rejected: that puts two criteria on one file, so a run configuration `check` accepts could still stop `next`. intent-constraint-7 asks that what `rp` cannot read stop it.
- `worktree-folder-root` optional, stopping only when a plan must create a lane worktree. Rejected: the convention is required (`load.md` § Conventions), so every run start records it, and a file without it is malformed.

**Trade-offs:** `check` now stops on a malformed guardrail, resource, variable, commit format, or landing commit, which today stops only `next` and `land`. The orchestrator meets such a stop at triage's scan rather than at the first step. A folder holding only `run-config.md` can no longer be read by `check`, `next`, or `land` (spec-exclusion-3).

**Claims:**

- observed: `contextOf` reads `.rp.md` and `.rp.local.md` from the first worktree `git worktree list` records, and `planOf` resolves the worktree folder root against that checkout's root (read `rp.mjs`: `contextOf`, `readConventions`, `planOf`). With `.rp.md` missing, `next` and `land` stop (`1-spec/spec/probe-today.txt`).
- observed: `readState` checks the format, then `parseConfig` reads `run-config.md`'s frontmatter as JSON with strict keys. The conventions-data checks are in `parseConventions` (read `rp.mjs`).
- observed: `rp.mjs` imports only `node:` modules (read its imports).
- assumed: the tests in § Verification for this decision pass.

design-doc-decision-2: A text in the run configuration is one JSON string

**Serves:** spec-requirement-11, spec-acceptance-criterion-19

**Decision:** A text is one JSON string holding its characters, its lines separated by newlines, and more than whitespace. The texts are the commit format, a guardrail's rule, a resource's text, and a lane's brief. `rp` no longer reads the list-of-lines form. An assignment carries the string's characters with only the placeholders expanded, rendered as today.

**Alternatives:** Keep accepting a string or a list of lines. Rejected: the list form let a person edit a multi-line text in JSON. The orchestrator writes the run configuration and no person edits it, so the second form has no producer, and it gives a verbatim copy two shapes to check.

**Trade-offs:** In `run-config.json` and its diffs, a multi-line text reads as one line with escaped newlines.

**Claims:**

- observed: `textAt` accepts a string or a list of strings, which it joins with newlines. Only `.rp.md`'s frontmatter and the tests write the list form (read `rp.mjs`, `.rp.md`, and `scripts/test/rp/assignments.test.mjs`).
- assumed: the assignment tests in § Verification carrying a multi-line text pass.

design-doc-decision-3: `run-config.local.json` overlays the run configuration by name for `next` and `land`

**Serves:** spec-requirement-3, spec-requirement-6, spec-requirement-7, spec-requirement-8, spec-acceptance-criterion-4, spec-acceptance-criterion-11, spec-acceptance-criterion-12, spec-acceptance-criterion-13, spec-acceptance-criterion-14, spec-acceptance-criterion-15, spec-acceptance-criterion-36

**Decision:**

- `next` and `land` read `run-config.local.json` beside `run-config.json` in the pipeline worktree's working tree. An absent file overrides nothing. `check` reads only whether Git tracks it (design-doc-decision-4), so the frontier and the phase states never depend on its contents. `pipelines`, `thread`, and `validate` do not read it.
- It may hold, each key optional:
  - `worktree-folder-root`, `landing-commit`, `commit-format`, `guardrails`, `resources`, and `variables`, in `run-config.json`'s schema;
  - `agents`: for each profile only `model` and `subagents`, and for a lane profile `lanes`. Each lane is one `run-config.json` declares for that profile, and holds only `model` and `subagents`.
- Any other key, at any level, stops `next` and `land`, naming the file and the key's path. Such keys include `target-phase`, `base`, `owner-directions`, a lane's `brief`, and a lane `run-config.json` does not declare. A malformed entry stops them as it does in `run-config.json`, naming this file.
- The run view applies the local file over `run-config.json`:
  - Each of the worktree folder root, the landing commit, and the commit format it holds replaces the committed one.
  - Each guardrail, resource, and variable replaces the committed entry of its name, or is added.
  - Each model and subagent model replaces the committed one of the same profile or lane.
- A role's models then follow today's rule over the overlaid agents: its lane's, else its profile's. A lane pin therefore wins for its lane's role. A profile pin reaches the profile's roles whose lane gives no model of its own. Every profile and lane the file does not name keeps its committed models.
- The plan's `wake <role> model` and `wake <role> resource` lines, and the assignment's carried texts and subagent model, come from the run view.

**Alternatives:**

- `check` also reads and validates the local file. Rejected: `check` uses none of its values, and the frontier is the same on every clone (spec-acceptance-criterion-15). Reading it would only let one clone's file stop the report.
- A profile pin replaces the model a lane of that profile gives of its own. Rejected: the spec considered and did not take this, and overriding by name keeps one rule for every entry.
- The local file overrides a profile's whole agents entry, as `.rp.local.md`'s `agents` does today. Rejected: it would declare lanes and briefs, which intent-constraint-4 forbids.
- The orchestrator merges the local values into `run-config.json`. Rejected: by intent-constraint-4 and intent-context-4, local values would reach the pipeline branch.

**Trade-offs:** A malformed local file stops `next` and `land` but not `check`, so the orchestrator learns of it at the step. On a clone with a local file, a role runs under the committed file plus one that no commit holds.

**Claims:**

- observed: `modelsOf` takes a role's lane's model, else its profile's, from the run configuration's agents. `readConventions` merges `.rp.local.md`'s entries over `.rp.md`'s by name for the six conventions (read `rp.mjs`).
- observed: `check` prints no model, resource, or carried text (read `cmdCheck`).
- assumed: the overlay tests in § Verification pass.

design-doc-decision-4: A tracked `run-config.local.json` stops `rp`

**Serves:** spec-requirement-9, spec-acceptance-criterion-17

**Decision:** `check`, `next`, and `land` stop, naming `<pipeline folder>/run-config.local.json` and that Git tracks it, in these cases:

- reading the working tree, the index or the tip's tree holds that path;
- reading a commit, which is `check --ref` or the pipeline a landing would leave, that commit's tree holds it.

The stop comes before anything is computed, wherever these commands read a pipeline. A `.gitignore` without the name never stops `rp` (spec-exclusion-4).

**Alternatives:**

- Check only the index. Rejected: after `git rm --cached` without a commit, the tip still holds the file, so the branch carries it. spec-acceptance-criterion-17's "committed" covers that case.
- Stop on a local file that is untracked and not ignored. Rejected: spec-exclusion-4.

**Trade-offs:** In a project without the ignore entry, a role that commits the file in the pipeline worktree stops the landing until the owner removes the file with a commit.

**Claims:**

- observed: a bare-name `.gitignore` entry ignores `run-config.local.json` under a pipeline folder. Without that entry, `git add -A` stages it. `git add -f` stages it and a commit holds it. After `git rm --cached`, the index lacks it while the tip still holds it (`2-design-doc/design-doc/probe-git.txt`, from `probe-git.sh`).
- observed: `land` reads the pipeline its landing would leave the same way `check --ref` reads a commit (read `landingOf` and `inspect`).
- assumed: the tracked-file tests in § Verification pass.

design-doc-decision-5: A pipeline is a folder holding `run-config.json`, and carries no version

**Serves:** spec-requirement-14, spec-requirement-15, spec-requirement-19, spec-acceptance-criterion-25, spec-acceptance-criterion-27, spec-acceptance-criterion-28, spec-acceptance-criterion-32, spec-acceptance-criterion-33

**Decision:**

- In `rp`, a folder of the pipelines folder root is a pipeline folder when it holds `run-config.json` at its top level, and nothing else makes one.
- `rp pipelines` lists only those folders, and reads only each one's intent origins, from the intent's frontmatter.
  - An intent whose frontmatter cannot be read has no origins.
  - A listed folder without a regular intent stops the command.
  - Each entry carries no format: `<live|merged> <ref> <pipeline folder>`, or with `--json` an object of `state`, `ref`, `commit`, `folder`, and `origins`.
- A review lane's root drops only the pipeline folders by the same mark. A folder without `run-config.json` stays as other content, like tooling.
- In the skill, no file names a pipeline format or a pipeline of an earlier format.
  - Triage runs `rp check` on every live pipeline `rp pipelines` lists for the issue, and routes each through its Route table. The paragraph routing earlier-format pipelines goes.
  - Reporting reports every listed pipeline alike.
  - The changelog's `Pipelines` subsections of entries 1, 6, and 7 go.
  - `state.md` § Names and § Discovery define the pipeline folder by `run-config.json` and list no format.
- An issue whose only folders lack `run-config.json` therefore has no listed pipeline, and triage routes its work as new intent, with a slug per design-doc-decision-8.

**Alternatives:**

- Read a folder holding a phase folder or `run-config.md` as a pipeline whose `run-config.json` is missing. Rejected: the spec considered and did not take this, since intent-proposal-1 makes `run-config.json` the mark.
- Mark a pipeline by `run-config.json` or an intent. Rejected: no source shows a prepared pipeline holding only an intent being continued (spec, Considered and not required).

**Trade-offs:** Merged pipelines holding `run-config.md` leave discovery and triage's view of their issue. Their files stay in the base branch's tree and in review lanes' trees.

**Claims:**

- observed: `pipelineFoldersIn` marks a folder by a phase folder, `base/`, `run-config.md`, or `prompt.md`. `discoverFolders` reads `run-config.md` for the format, and reads the intent's leading `origin:` body lines below format 7. `reviewBuildOf` drops the folders `pipelineFoldersIn` marks (read `rp.mjs`).
- observed: `rp pipelines` prints a format for each entry, and `earlier` for folders of every older kind (`1-spec/spec/probe-today.txt`).
- observed: triage steps 2 and 3, report step 2, and changelog entries 1, 6, and 7 name earlier-format pipelines (read `triage.md`, `report.md`, and `changelog.md`).
- assumed: the discovery and review-lane tests in § Verification pass.

design-doc-decision-6: `.rp.md` holds every convention as prose entries that copy as written

**Serves:** spec-requirement-1, spec-requirement-2, spec-requirement-9, spec-requirement-22, spec-acceptance-criterion-1, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-16, spec-acceptance-criterion-35

**Decision:**

- `.rp.md`'s frontmatter is the flat YAML `conventions: 7` alone, and every convention is a prose section. The loader reads the stamp from `conventions`, which an older file holds in a JSON frontmatter, and checks completeness on the prose sections.
- The sections the run configuration copies give each text and value unambiguous bounds:
  - A text is written as its own lines, unindented and unquoted. The texts are the commit format, a guardrail's rule, a resource's text, and a lane's brief.
  - A value is one code span, whose content is the value. The values are the worktree folder root, the landing commit template, and a variable's template.
  - Commit format: its text is the section's body.
  - Guardrails and Resources: each is an entry under a heading that names it. The profiles it binds are on a line of their own, and its text is the entry's remaining lines.
  - Variables: each entry names the variable and gives its template.
  - Agents: an entry per profile, naming its model and subagent model. Each lane is an entry beneath its profile, naming its id, its model, and its subagent model, with its brief as its remaining lines.
- The Agents section may sit in the shared conventions or in a tool's section. The loader reads the active tool's section and no other tool's, as `load.md` § Sources already does.
- `.rp.local.md` has no frontmatter. It overrides with the same sections and entries, by name, and its Agents entries pin models only.
- Setup writes `.rp.md` in this form, and appends the bare name `run-config.local.json` to `.gitignore` beside the worktree folder root's entry.
- Changelog entry 7 migrates a version 5 or 6 `.rp.md`:
  - it rewrites the frontmatter as `conventions: 7`;
  - it rewrites each Guardrails, Resources, and Agents entry into the entry form, with its text unchanged, the `agents` list becoming the profiles line;
  - it keeps every other prose section as it is;
  - it offers Landing commit and Variables as prose sections. Write then appends the ignore entry.
- `load.md`, `setup.md`, `guardrails.md`, `resources.md`, `agents.md`, and changelog entry 7 state this form. None of them mentions conventions data in a frontmatter any more.

**Alternatives:**

- Keep the version 5 and 6 entry form, `- rule: <text>` and `- agents: <profiles>` list items. Rejected: a text of several lines must be indented under its item, so the recorded text would differ from the lines the section writes (spec-requirement-1: "written as those lines"). The entry form copies one block as written. Reading spec-requirement-2's "text unchanged" as every byte of the section would force the keyed form. The spec's own term "text" (spec-requirement-11) names the rule, the resource text, the commit format, and the brief, and the migration keeps each of those unchanged.
- Agents in any human-readable layout the orchestrator interprets, as at version 6. Rejected: a brief is a text the orchestrator copies verbatim (intent-constraint-5), so it needs the same bounds as a guardrail's rule.
- An ignore entry scoped to the pipelines folder root. Rejected: the bare name ignores the file under any pipeline folder (observed), wherever the root is.

**Trade-offs:** The migration reformats every migrated project's Guardrails, Resources, and Agents entries. Lane headings nest one level deeper than profile headings.

**Claims:**

- observed: version 5 and 6 `.rp.md` files hold each guardrail and resource as `- rule:` or `- resource:` and `- agents:` items under a name heading. The version 6 Agents section writes each brief inline in its lane's list item (`git show trunk:.rp.md` and `git show fb2cc29c:.rp.md`).
- observed: setup appends only the worktree folder root's entry (read `setup.md` § Write, step 4).
- observed: a bare-name entry ignores the file under a pipeline folder (`2-design-doc/design-doc/probe-git.txt`).
- assumed: spec-assumption-1.

design-doc-decision-7: The orchestrator records the run configuration verbatim at every run start

**Serves:** spec-requirement-5, spec-requirement-8, spec-requirement-11, spec-requirement-12, spec-requirement-13, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-19, spec-acceptance-criterion-20, spec-acceptance-criterion-21, spec-acceptance-criterion-22, spec-acceptance-criterion-23, spec-acceptance-criterion-24, spec-acceptance-criterion-37, spec-acceptance-criterion-38

**Decision:** `state.md` § Run configuration defines both files and how the orchestrator writes them. Triage step 6 applies it at every run start, before `run-started` and the first `rp next`.

- `run-config.json`, committed when it changes:
  - Its worktree folder root, landing commit, commit format, guardrails, resources, and variables are what `.rp.md` states at that moment, replacing what an earlier run start recorded. A convention `.rp.md` does not set is absent.
  - Its target phase, base, and agents stay as they are, or are what the owner confirmed for a new pipeline. They change only when the owner's request changes them.
  - `owner-directions` keeps every entry, and gains one for each direction the owner gives for the run, at triage or during the run, committed when given.
- `run-config.local.json`, in the pipeline worktree and never committed:
  - It holds what `.rp.local.md` overrides of those six conventions, and the models and subagent models it pins for profiles and for lanes `run-config.json` declares.
  - It leaves out the pins of each profile or lane whose model the owner asked for in this run's request.
  - When nothing remains, the file is absent, and an existing one is removed.
- The skill tells the orchestrator in plain words to copy each text and value character for character as its section writes it, with its placeholders unexpanded. The orchestrator selects the entries and associates each with its profiles. It never summarizes or rewords.
- At no other moment does the orchestrator rewrite either file from `.rp.md` or `.rp.local.md`. A session resumed after compaction already skips triage (`SKILL.md`), and the loop writes neither file.
- `loop.md`, `SKILL.md`, and `state.md`'s Files table name `run-config.json` and `run-config.local.json`.

**Alternatives:**

- An `rp` command that records the run configuration from `.rp.md`. Rejected: it needs a prose parser in `rp` (intent-constraint-8), and intent-constraint-5 has the orchestrator copy.
- Record the owner's asked model in `run-config.local.json` over the pin, instead of leaving the pin out. Rejected: it writes one model in two files. Leaving the pin out lets the committed model through by the one overlay rule.
- Write `run-config.local.json` at every run start, `{}` when nothing is overridden. Rejected: it puts an untracked file in every pipeline worktree of every clone. Where `.gitignore` lacks the name, a role's `git add -A` would commit it.

**Trade-offs:** `rp` never checks the copy (spec-exclusion-1), so a reworded text reaches every assignment of the run. On a pinned clone, the owner's asked model holds for that run only, and the next run start records the pin again.

**Claims:**

- observed: triage writes the run configuration at step 6 of every run, before `run-started`. It asks for confirmation only when the pipeline has no run configuration or the request changes it (read `triage.md` steps 4 and 6).
- observed: a session resumed after compaction recomputes state with `rp check` and runs `rp next` without triage (read `SKILL.md`).
- observed: today the owner's directions are prose in `run-config.md`'s body (read this pipeline's `run-config.md`).
- assumed: spec-assumption-1 and design-doc-assumption-1.

design-doc-decision-8: Triage gives a new pipeline an unused folder, names guardrails and resources in the confirmation, and proposes agents from `.rp.md`

**Serves:** spec-requirement-20, spec-requirement-21, spec-requirement-22, spec-acceptance-criterion-33, spec-acceptance-criterion-34, spec-acceptance-criterion-35

**Decision:**

- `state.md` § Names, Pipeline slug: a new pipeline's slug names no folder in the pipelines folder root of the commit its branch starts from. While it names one, the slug takes the next suffix, `-2`, `-3`, as it does for a second pipeline of the same issue. Triage step 5 already applies § Names.
- Triage step 4's confirmation lists, under each profile, the names of the guardrails and resources the run will carry for that profile: `.rp.md`'s entries that bind it, with `.rp.local.md`'s over them by name.
- Triage step 4 proposes a new pipeline's agents from `.rp.md`'s Agents section, the shared one or the active tool's, and from no other tool's. `.rp.local.md`'s pins go to `run-config.local.json`, never into the proposal. `agents.md` states this.

**Alternatives:**

- `rp` refuses a new pipeline folder that exists in the start tree. Rejected: triage chooses the folder before any pipeline file exists to read, so `rp` would need a new command for a rule the orchestrator applies once.
- Check the slug against every branch tip. Rejected: not needed, since a branch whose name is taken cannot be created (spec, Considered and not required).
- Propose agents with `.rp.local.md`'s entries over them, as today. Rejected: local models would be committed in `run-config.json` (spec-requirement-8).

**Trade-offs:** The confirmation grows by a line per profile.

**Claims:**

- observed: a new pipeline written into the folder of `v4`'s merged pipeline 371 makes `rp check` report that folder's older files as `INVALID` (`1-spec/spec/probe-today.txt`). Triage learns of an issue's earlier pipelines only from `rp pipelines` (read `triage.md` steps 2 and 5).
- observed: today the confirmation lists the target phase, the lanes, and the models (read `triage.md` step 4).
- assumed: spec-assumption-2 and design-doc-assumption-2.

design-doc-decision-9: This repository's `.rp.md` and `.gitignore`

**Serves:** spec-requirement-10, spec-requirement-18, spec-acceptance-criterion-18, spec-acceptance-criterion-31

**Decision:**

- `.rp.md` is rewritten once, in the form of design-doc-decision-6, at version 7. It holds the worktree folder root, the landing commit, the commit format's lines, the two guardrails and the resource with their profiles, and Agents with today's models, lanes, and briefs. Each text and value equals its frontmatter data at `1a43fc61`.
- `.gitignore` gains `run-config.local.json`.
- `.rp.claude-code.md` and `.rp.opencode.md` stay as they are.

**Alternatives:** Leave the ignore entry to setup. Rejected: setup does not run here again (spec-requirement-10).

**Trade-offs:** none beyond design-doc-decision-6's.

**Claims:**

- observed: `.rp.md` holds these conventions as JSON data, its commit format a list of lines (read `.rp.md`). `.gitignore` lacks the name (`1-spec/spec/observations.txt`).
- assumed: the inspections in § Verification for this decision.

## Interfaces

**`run-config.json`**, one JSON object, committed:

```json
{
  "target-phase": 4,
  "base": "main",
  "worktree-folder-root": ".worktrees",
  "landing-commit": "{subject} (orchestrator)",
  "commit-format": "<text>",
  "guardrails": { "<name>": { "rule": "<text>", "profiles": ["implementer", "reviewer"] } },
  "resources": { "<name>": { "resource": "<text>", "profiles": ["implementer"] } },
  "variables": { "<name>": "<template>" },
  "agents": { "<profile>": { "model": "<name>", "subagents": "<name>", "lanes": { "<id>": { "brief": "<text>", "model": "<name>", "subagents": "<name>" } } } },
  "owner-directions": ["<direction>"]
}
```

- `target-phase`, required: an integer from 1 to 4.
- `base`, required: a revision that resolves to a commit.
- `worktree-folder-root`, required: a non-empty string. A relative one resolves against the main checkout's root, and each lane worktree is `<it>/<lane branch>`.
- `landing-commit`: a string holding `{subject}` and no other placeholder.
- A text: a string holding more than whitespace (design-doc-decision-2).
- `guardrails` and `resources`, by name: each holds its text and `profiles`, a non-empty list of profiles.
- `variables`, by name: each name matches today's grammar and is no vocabulary fact. Each template is a non-empty string naming vocabulary facts only.
- `agents`: today's schema.
- `owner-directions`: a list of strings.
- No other key exists at any level.

**`run-config.local.json`**, one JSON object, never committed, in the pipeline worktree:

```json
{
  "commit-format": "<text>",
  "guardrails": { "<name>": { "rule": "<text>", "profiles": ["implementer"] } },
  "agents": { "<profile>": { "model": "<name>", "subagents": "<name>", "lanes": { "<declared id>": { "model": "<name>", "subagents": "<name>" } } } }
}
```

- It may hold `worktree-folder-root`, `landing-commit`, `commit-format`, `guardrails`, `resources`, and `variables`, in `run-config.json`'s schema, and `agents` holding only models. Every key is optional.
- Each lane it names is one `run-config.json` declares for that profile.
- Overlay rules: design-doc-decision-3.

**Stops** (stderr `rp: <reason>`, exit 1, nothing written):

| Cause | Commands | Names |
| --- | --- | --- |
| `run-config.json` missing | `check`, `next`, `land` | `<pipeline folder>/run-config.json` as missing |
| `run-config.json` unreadable or outside its schema | `check`, `next`, `land` | the file and the reason, as `<key>.<name>…` for an entry |
| `run-config.local.json` with a key outside its schema, or a malformed entry | `next`, `land` | the file and the key's path |
| `run-config.local.json` tracked | `check`, `next`, `land` | the file, as tracked |

No message refers to a format.

**`rp pipelines`.** The text output is `<live|merged> <ref> <pipeline folder>`. The `--json` output is a list of `{state, ref, commit, folder, origins}`. Only folders holding `run-config.json` are listed.

**`.rp.md` ↔ orchestrator.** The frontmatter is `conventions: 7`. The prose entry form is design-doc-decision-6's, and `.rp.local.md` overrides with the same entries.

**Orchestrator ↔ owner.** A run confirmation lists, under each profile, the guardrail and resource names the run will carry.

## Dependencies

- Node built-ins only (`node:` modules, `JSON`), and Git 2.38 or later, as today. Nothing new.
- Git's index and tree listing, through commands `rp` already runs, give whether `run-config.local.json` is tracked.
- `.gitignore`'s bare-name matching ignores `run-config.local.json` in every pipeline folder (observed: `2-design-doc/design-doc/probe-git.txt`).

## Failure modes and observability

- **The orchestrator writes invalid JSON or breaks the schema while recording.** `rp check` at triage and the first `rp next` stop, naming the file and the reason. The orchestrator tells the owner, as `loop.md` does on any stop.
- **`.rp.md` states a convention the schema rejects**, such as a landing commit without `{subject}` or a profile that does not exist. It is recorded and committed at the run start, and then `check`, `next`, and `land` stop, naming `run-config.json` and the entry. The owner fixes `.rp.md`, and the next run start records it again.
- **A malformed `run-config.local.json`, or one holding a forbidden key.** `next` and `land` stop, naming the file and the key. `check` is unaffected.
- **A tracked `run-config.local.json`.** `check`, `next`, and `land` stop, naming the file as tracked, until a commit removes it from the branch.
- **A folder holding only `run-config.md`, given to `check`, `next`, or `land`.** It stops them, naming `run-config.json` as missing.
- **A listed pipeline without a regular intent.** `rp pipelines` stops, naming the intent's path.
- **A text the orchestrator did not copy verbatim.** Nothing in `rp` detects it (spec-exclusion-1). It is visible in `run-config.json`'s diff in the run-start commit.

## Verification

- existing test group "a configuration that cannot be read stops the command" (`frontier.test.mjs`), now of `run-config.json` — design-doc-decision-1, spec-acceptance-criterion-25, spec-acceptance-criterion-26 — `check` stops on a `run-config.json` that is missing, not JSON, not an object, or outside the schema, naming the file and the reason. It stops on a folder holding `run-config.md` alone, naming `run-config.json` as missing. No message names a format.
- existing test group "stop rp next and rp land on malformed conventions data, writing nothing" (`assignments.test.mjs`), now of `run-config.json` — design-doc-decision-1, design-doc-decision-2 — each entry check stops `check`, `next`, and `land`, naming `run-config.json` and the entry, and writes nothing. A text given as a list of lines is rejected.
- existing test groups "carries the project's conventions", "names models as the run writes them", and "expands placeholders in the texts they carry" (`assignments.test.mjs`), now reading the run configuration — design-doc-decision-1, design-doc-decision-2, spec-acceptance-criterion-4, spec-acceptance-criterion-19 — an assignment carries the commit format, each guardrail and resource binding the role's profile, and its lane's brief. A multi-line text holding Markdown is carried as written, with its placeholders expanded. The plan names the model and resources the run configuration gives.
- existing test "are written for every role from this repository's .rp.md, a run confirmed with its Agents defaults, and the delivered templates, for every kind of turn" (`assignments.test.mjs`), now reading the run configuration — design-doc-decision-1 — the delivered templates fill for every kind of turn from the run configuration alone.
- new test at the `rp check`, `rp next --apply`, and `rp land` boundary — design-doc-decision-1, spec-acceptance-criterion-7, spec-acceptance-criterion-38 — each prints and writes the same whether the main checkout's `.rp.md` and `.rp.local.md` are absent, present, or edited between commands.
- new test at the same boundary — design-doc-decision-1, spec-acceptance-criterion-10 — the output and the assignments are the same with `owner-directions` holding entries, empty, or absent.
- existing test "lane: each lane's branch at the tip and its worktree under the worktree folder root…" (`next.test.mjs`), now reading the run configuration — design-doc-decision-1, spec-acceptance-criterion-5 — a lane worktree is `<worktree folder root>/<lane branch>` under the main checkout's root.
- existing landing-commit tests of `land.test.mjs`, including "with each commit's subject alone without a landing commit template", now reading the run configuration — design-doc-decision-1, spec-acceptance-criterion-6 — each landing commit's message is its subject in the template, or the subject alone without one.
- new test at the `rp next --apply` and `rp land` boundary — design-doc-decision-3, spec-acceptance-criterion-11, spec-acceptance-criterion-12, spec-acceptance-criterion-13 — each convention in the local file replaces or adds by name in assignments, lane worktree paths, and landing commits. Every other convention keeps its committed value, and without the file `run-config.json` alone applies.
- new test at the `rp next --apply` boundary — design-doc-decision-3, spec-acceptance-criterion-36 — with model and subagent model pins for a lane and for a profile: the lane's role runs on its lane's pins; the profile's other roles run on the profile's pins unless their lane gives its own model; and every role the pins do not name runs on its committed models. `wake <role> model` and the assignment's subagent model show this.
- new test at the `rp next` and `rp land` boundary — design-doc-decision-3, spec-acceptance-criterion-14 — a local file holding any key spec-acceptance-criterion-14 names stops both, naming the file and the key, and writes nothing.
- new test at the `rp check` boundary — design-doc-decision-3, spec-acceptance-criterion-15 — `check`'s report, with and without `--json`, is the same with the local file present and absent.
- new test at the `rp check`, `rp next`, and `rp land` boundary — design-doc-decision-4, spec-acceptance-criterion-17 — a staged or committed local file stops each, naming it as tracked, as does one the tip still holds after its removal from the index. `check --ref` on a commit holding it stops. An untracked local file stops none.
- existing test groups of `pipelines.test.mjs`, rewritten for the mark — design-doc-decision-5, spec-acceptance-criterion-27, spec-acceptance-criterion-32 — only folders holding `run-config.json` are listed, live and merged, filtered by issue. Folders holding `run-config.md`, a phase folder, `prompt.md`, `base/`, only an intent, or tooling are not listed. No entry carries a format, with or without `--json`. A listed folder without a regular intent stops the command.
- existing test "keeping the root's tooling at the tip's version in both commits, and dropping pipelines of every format" (`review-lanes.test.mjs`) — design-doc-decision-5 — the lane's root drops the folders holding `run-config.json` and keeps every other folder.
- existing tests `frontier.test.mjs` § "1. INVALID", `validate.test.mjs`, and `thread-commands.test.mjs`, unchanged — design-doc-decision-1, spec-acceptance-criterion-30 — the intent, later inputs, `notes.md`, and threads are accepted and rejected as today, with the same reasons.
- inspection of `rp.mjs`'s imports and `package.json` — design-doc-decision-1, spec-acceptance-criterion-29 — `rp` needs Node and Git alone.
- inspection of `load.md`, `setup.md`, `changelog.md`, `guardrails.md`, `resources.md`, and `agents.md` — design-doc-decision-6, spec-acceptance-criterion-1, spec-acceptance-criterion-2, spec-acceptance-criterion-3, spec-acceptance-criterion-16, spec-acceptance-criterion-35 — fresh setup and migration write the entry form under `conventions: 7`, migration keeps every text, Write appends the ignore entry, and Agents is read from the shared section or the active tool's.
- inspection of the skill for pipeline formats — design-doc-decision-5, spec-acceptance-criterion-28 — no step of triage, reporting, or setup's migration names a pipeline format or an earlier pipeline. Triage checks every listed live pipeline and routes every listed pipeline through the Route table.
- inspection of `state.md` § Run configuration and § Names, triage steps 4 to 6, `loop.md`, and `SKILL.md` — design-doc-decision-7, design-doc-decision-8, spec-acceptance-criterion-8, spec-acceptance-criterion-9, spec-acceptance-criterion-20, spec-acceptance-criterion-21, spec-acceptance-criterion-22, spec-acceptance-criterion-23, spec-acceptance-criterion-24, spec-acceptance-criterion-33, spec-acceptance-criterion-34, spec-acceptance-criterion-37, spec-acceptance-criterion-38 — the recording moment and contents, the plain-words verbatim instruction, the slug rule, the confirmation's names, and the source of the proposed agents.
- inspection of this repository's `.rp.md` against `git show 1a43fc61:.rp.md` — design-doc-decision-9, spec-acceptance-criterion-31 — the frontmatter is `conventions: 7` alone, and each text and value equals its frontmatter data character for character.
- inspection with `git check-ignore` of a `run-config.local.json` in a pipeline folder of this repository — design-doc-decision-9, spec-acceptance-criterion-18 — Git ignores it.
- end-to-end flow: the first run started in this repository after the change — design-doc-decision-7, design-doc-decision-8, spec-acceptance-criterion-19, spec-acceptance-criterion-21, spec-acceptance-criterion-31, spec-acceptance-criterion-34 — the texts in its `run-config.json` equal `.rp.md`'s sections, its assignments carry them, and its confirmation names the guardrails and resources under each profile. This confirms spec-assumption-1 and spec-assumption-2.

## Risks

- **The orchestrator rewords or drops a text while copying it** (spec-assumption-1). Every assignment of the run carries the altered rule, and `rp` does not detect it (spec-exclusion-1). It shows only in `run-config.json`'s diff at the run-start commit.
- **An omission goes unseen on runs that ask no confirmation** (spec-assumption-2). A guardrail or resource missing from the record is shown to the owner only when triage asks for a confirmation.
- **A project's `.gitignore` lacks `run-config.local.json`** (spec-exclusion-4). A role's `git add -A` in the pipeline worktree commits the file, and `check`, `next`, and `land` stop until a commit removes it.
- **Pipelines holding `run-config.md` stop being listed or continued** (spec-exclusion-3), this pipeline included, once the orchestrator runs the changed skill. Further work on their issues starts new pipelines.
- **Folders without `run-config.json` stay in review lanes' trees** as other content of the pipelines folder root. The net change is unaffected.
- **The owner's asked model holds for one run only** on a clone that pins that profile or lane (design-doc-assumption-1). From the next run start, that clone runs on the pin again unless the owner asks again.

## Open assumptions

spec-assumption-1: The orchestrator, told in plain words to copy each text verbatim, records the texts of `.rp.md`'s prose sections unchanged — assumed: a run started in this repository after the change records `run-config.json` texts that equal `.rp.md`'s sections and today's frontmatter values.

spec-assumption-2: Guardrail and resource names listed under each profile in the run confirmation show the owner, before the run starts, one that `.rp.md` declares and the run would not carry — assumed: a confirmation in this repository that names its two guardrails and one resource under the profiles each binds.

design-doc-assumption-1: When the owner asks for a model for a profile or lane that `.rp.local.md` pins, the orchestrator leaves that pin out of `run-config.local.json` for the run — assumed: on a clone pinning a profile's model, a run whose request asks for another model for that profile has `rp next` name the asked model.

design-doc-assumption-2: Applying § Names, triage finds a folder that already exists in the start tree before it creates a new pipeline's branch — assumed: a new pipeline for an issue whose older folder, without `run-config.json`, is in the base branch's tree takes a suffixed slug, and `rp check` on it reports only the new pipeline's files.
