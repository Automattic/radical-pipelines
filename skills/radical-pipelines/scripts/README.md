# `rp`

`rp` computes a pipeline's state from its files and names the frontier, discovers pipelines, plans and applies each step of the loop — its lane branches and worktrees and each woken role's assignment — and lands each turn, certifying what it landed. A role writes its threads and checks its own files with it. It needs Node and Git 2.38 or later (for `git merge-tree --write-tree`), nothing else. The path argument selects the repository and worktree, whatever the process directory, against which every relative path resolves. [State](../reference/run/state.md) is the specification; this file is the exact grammar.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
node rp.mjs next <pipeline folder> [--apply]
node rp.mjs land <pipeline folder> --role <role>
node rp.mjs thread open <pipeline folder> --role <role> --artifact <spec | design-doc | implementation> --body <file | ->
node rp.mjs thread reply <pipeline folder> --role <role> --thread <thread file> --body <file | ->
node rp.mjs thread close <pipeline folder> --role <role> --thread <thread file> --status <approved | withdrawn> [--body <file | ->]
node rp.mjs thread escalate <pipeline folder> --role <role> --cites <thread path | evidence path> --body <file | ->
node rp.mjs validate <pipeline folder> --role <role> [--file <path>]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. A command line the command does not take, such as an unknown option or a missing argument, is followed by the command's form; every other wrong use of `thread` and `validate` is followed by what to run instead. Otherwise it exits 0, whatever the frontier.

## Pipeline files

A pipeline folder is `<pipelines folder root>/<pipeline slug>`, a folder of the root that holds, at its top level, a phase folder `<digits>-<name>/` or `run-config.md` or `prompt.md`, or a phase folder under its `base/` folder, as each format kept its files; any other content of the root, such as tooling, is not a pipeline. `check`, `next`, and `land` take the pipelines folder root to be the parent of the pipeline folder they are given; `pipelines` is given it.

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Frontmatter keys |
| --- | --- | --- |
| `run-config.md` | Run configuration | JSON: `format`, `target-phase`, `base`, `agents` |
| `0-intent/intent.md` | Intent | `issue`, `starts-from`, `re-attempts`, each optional |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | `target`, required; `origin`, optional and not interpreted |
| `1-spec/spec.md` | Spec | no frontmatter |
| `1-spec/lanes/<id>/spec.md` | Spec candidate | no frontmatter |
| `2-design-doc/design-doc.md` | Design doc | no frontmatter |
| `2-design-doc/lanes/<id>/design-doc.md` | Design doc candidate | no frontmatter |
| `3-implementation/notes.md` | Implementation notes | `status` |
| `threads/<name>.md` | Thread | `status`, `opener`, `owner`, `artifact`; `cites` on a thread to `owner` (§ Threads) |
| `certification/<path>.json` | The certification of the file at `<path>` (§ Certification) | none: the file is JSON |

A key outside the table, or frontmatter on a file that carries none, makes the file `INVALID`. `rp` reads these values from the frontmatter alone; the body is free text.

### Frontmatter

A frontmatter is the lines between a first line `---` and the next line `---`; either may end in CRLF, and the closing one may end the file. `run-config.md`'s holds a JSON object. Every other file's holds this YAML subset, a flat map of single-line text values:

- Each line is blank or `<key>: <value>`, starting at column 0. `<key>` starts with a letter or digit.
- A plain value is the text written, without surrounding spaces and tabs. A value in single or double quotes is the text between them. Every value is text, including one YAML would read as a number, a boolean, or null, such as `368` or `true`; an empty value is empty text.
- A file whose frontmatter has no closing line, an indented line (a nested map or a multi-line value), a list item, a comment line, a line that is no `<key>: <value>`, or a key given twice is `INVALID`. So is a value YAML would read as other text or as structure: one holding a comment (` #`, or `#` first, as in an unquoted issue reference `#368`), a flow collection (`[`, `{`), an anchor (`&`), an alias (`*`), a tag (`!`), a block scalar (`|`, `>`), a quoted value holding an escape (`\` in double quotes, `''` in single quotes) or followed by text, or a plain value YAML rejects: one starting with `%`, `@`, `` ` ``, `,`, `]`, or `}`, starting with `-`, `?`, or `:` followed by a space or alone, or holding `: ` or ending with `:`. The reason names the key and the construct, or the line.

Quote a value that starts with one of those characters, such as `issue: "#368"`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob id of the whole file, frontmatter included: at a commit, the id its tree records; in the working tree, the id `git add` would store for the file at its path, after the clean filters and line-ending conversion its attributes, configuration, and index entry select, so a file committed with CRLF keeps it under `core.autocrlf`. Git computes it on a copy of the worktree's index, writing no object and leaving the index untouched. An unmodified working tree has the identities of `HEAD`'s tree.

### `run-config.md`

```json
{
  "format": 8,
  "target-phase": 4,
  "base": "main",
  "agents": {
    "spec-producer": { "model": "large", "subagents": "small", "lanes": { "a": { "brief": "…" }, "b": { "model": "small" } } },
    "implementer": { "model": "large" },
    "reviewer": { "lanes": { "default": { "model": "large" }, "security": { "brief": ["…", "…"], "model": "other-large", "subagents": "other-small" } } }
  }
}
```

- `format`: the conventions format the pipeline was written under, an integer; the current one is `8`. A `run-config.md` that is absent, has no JSON frontmatter, or has no integer `format` is of an **earlier** format. `check`, `next`, and `land` read only format 8 and stop otherwise, before reading anything else: `rp: <path>: pipeline of an earlier format; it is not continued`, or `rp: <path>: pipeline of a newer format <n>; update the skill`.
- `target-phase`: an integer from 1 to 4. Phase 4 is review.
- `base`: a revision that resolves to a commit.
- `agents` (optional): the run's agents, in the schema of `.rp.md`'s `agents` (§ Conventions data).
- A profile's `lanes` are its lanes: production lanes for `spec-producer` and `design-doc-producer`, review lanes for `reviewer`. Without a `reviewer` lane there is one review lane, `default`. A configuration may declare `default` itself alongside other review lanes.
- A role's model is its lane's `model`, else its profile's; its subagent model is its lane's `subagents`, else its profile's. Either may be none.

The body is ignored. A missing `run-config.md` or one that breaks these rules stops `check`, as does a missing intent.

### Certification

`land` alone writes `certification/<path>.json`, the certification of the artifact, candidate, or approval at `<path>`, relative to the pipeline folder. It is a JSON object holding only:

- `inputs`: a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. A pin may name the intent, a later input, an artifact, or a candidate.
- `reviewed`, on an approval only (§ Threads): the full hash of its approved commit (§ Net change and approval).

| What is certified | Required inputs |
| --- | --- |
| `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it |
| A spec candidate | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it |
| A design doc candidate | `1-spec/spec.md` |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`; every later input targeting it |
| An approval | `0-intent/intent.md`; every later input |

- **Stale**: a required input is unpinned, or pinned at an identity that differs from the current one. A file without a certification is stale on each required input. Pins of other files are checked for grammar only.
- **Missing**: the file is absent. `notes.md` is also missing until its `status` is `done`.
- **Fresh**: neither.

`check` reads the certification of each artifact, candidate, and approval present, in the working tree or at `--ref` alike, and never another file under `certification/`, such as a dropped lane's. A certification that is a symlink or not a regular file, a folder where it belongs, a file where its folder belongs, invalid JSON, a key outside those above or a missing one, an ill-formed or repeated pin, a pin naming no pinnable path, or a `reviewed` that is no full commit hash stops the command: `rp: <path>: <reason>`, with no frontier.

### Later input

A later input's `target` is `<artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is `1-spec/spec.md`, `2-design-doc/design-doc.md`, or `3-implementation/notes.md`. A missing `target` or any other path makes the file `INVALID`.

## Threads

A thread file is named `<n>-<opener>-<owner>-<artifact>.md` after its frontmatter, with `<n>` a positive integer. Threads may share `<n>`. Roles write threads with `thread` (§ `thread`).

Its frontmatter holds four keys, five on a thread to `owner`:

```yaml
---
status: open | approved | withdrawn | answered | disagreement
opener: <role>
owner: <role>
artifact: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
---
```

- `<role>` is `<profile>[-<lane id>]`: `owner`, `implementer`, `spec-producer`, `design-doc-producer`, `spec-producer-<lane id>`, `design-doc-producer-<lane id>`, or `reviewer-<lane id>`, with `<lane id>` matching `[a-z0-9][a-z0-9-]*`. Roles are checked by this grammar only, never against `run-config.md`, so closed threads of a removed lane stay valid. Production lanes open no threads: an `open` or `disagreement` thread whose opener or owner is `spec-producer-<lane id>` or `design-doc-producer-<lane id>` is `INVALID <thread>: production lanes open no threads`; the grammar keeps those roles so closed threads stay readable. An `open` thread awaiting a review lane that `run-config.md` does not declare is `INVALID <thread>: lane not configured; close the thread withdrawn`; `default` is declared while no `reviewer` lane is, or when a lane declares it.
- `artifact` pairs with the owner's profile: `intent`–`owner`, `spec`–`spec-producer`, `design-doc`–`design-doc-producer`, `implementation`–`implementer`.
- The opener is any role but `owner`, and differs from the owner.
- A thread to `owner` has status `disagreement` or `answered`, and `cites` with a non-empty value; no other thread has either status or the key. The value is not resolved.

In the body, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener, the thread's owner, or `owner`, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

An `open` thread awaits its opener when the thread's owner wrote the last message, and its owner otherwise. No other thread awaits anyone.

A **review thread** is one opened by `reviewer-<lane id>` to `implementer`. An **approval** is a review thread closed `approved`.

## Net change and approval

The **base** is the merge-base of the tip with `run-config.md`'s `base`: the latest base the tip holds. A `base` that does not resolve, or has no merge-base with the tip, stops `check`. The **net change** is the diff `<base>..<tip>` outside the pipelines folder root: what the reviewer reads.

An approval's `reviewed` is its approved commit: the pipeline-branch commit that held the approval when it was certified, whose code is the change its reviewer read (§ `land`). The approval is **fresh** when no required input changed (§ Certification) and the tip's code is the approved commit's plus clean merges of the base:

1. When `reviewed` is the tip, the code is the approved code.
2. Otherwise, `git merge-tree --write-tree --name-only <reviewed> <base>`. A conflict on a path outside the pipelines folder root changes the code; conflicts inside it are ignored.
3. Then `git diff --quiet <merged tree> <tip> -- . ':(top,exclude,literal)<pipelines folder root>'`. Any difference changes the code.

An approval without a certification is stale on its required inputs, and its code is not judged. An approval whose `reviewed` does not resolve to a commit in the clone, as after a squash merge or a deleted branch, is no approval: `unapproved`. A review lane is **approved** when its highest-numbered review thread is a fresh approval. Approval is computed for the configured review lanes.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files and their certifications from the working tree, or with `--ref` from that commit. The tip is `HEAD`, or the `--ref` commit. A pipeline file that is a symlink or not a regular file, a folder where a pipeline file belongs, or a file where a pipeline folder belongs stops `check`, in the working tree and at a ref alike. `check` validates every pipeline file.

### Frontier

The frontier is every action of the first rule that holds:

1. **`INVALID <path>: <reason>`** for each malformed file.
2. **`escalate <thread>`** for each `disagreement` thread.
3. The lowest phase whose roles have work. Phases 1 to 3 belong to their artifact's profile, its production lanes included, and phase 4 to the reviewers. Work is an `open` thread awaiting the role, in any phase, or the artifact missing or stale, through the target:
   - **`lane <artifact> <lane id>`**, while the root is missing, for each configured lane whose candidate is missing or stale.
   - Production lanes configured, the root missing, and no lane action: **`consolidate <artifact>`**.
   - The artifact missing, without production lanes: **`produce <artifact>`**.
   - The artifact stale, or a thread awaiting the artifact's owner: **`respond <artifact>`**. Beyond the target, only the thread counts.
   - Phase 4: **`review <lane id>`** for each lane a thread awaits, and, at target phase 4, each configured lane not approved.
4. **`complete`**.

### Complete phases

A phase from 1 through the target is **complete** when every phase below it is complete and its work is done:

- Phase 1 or 2: its artifact is fresh, and no `open` thread awaits its producer.
- Phase 3: `notes.md` is fresh, its `status` `done`, and no `open` thread awaits the implementer.
- Phase 4: every review lane is approved, and no `open` thread awaits a reviewer.

On an `INVALID` frontier no phase is complete.

### Output

Without `--json`, the frontier comes first, one line per action, then one line per fact:

```text
frontier <action>[ <target>][ <lane id>][: <reason>]
lane <artifact> <lane id> <state>              for each production lane while its root is missing
artifact <artifact> <state>                    for each phase through the target, after its lanes
net-change <base>..<tip>                       at target phase 4
review <lane id> <approval>                    at target phase 4, for each review lane
thread <thread> <status>[ awaits <role>]
```

`<state>` is `missing`, `fresh`, or `stale <changed input>[ <changed input>]...`. `<approval>` is `approved`, `unapproved` when the latest review thread is no approval, or `stale` followed by the changed inputs and, when the code changed, `code`. On `INVALID`, only the frontier lines are printed. Paths are relative to the pipeline folder.

`--json` prints one object:

- `pipeline`, `tip`, `targetPhase`, `frontier`: always. Each frontier entry has `action`, and where they apply `target`, `lane`, `reason`, `threads` (the threads awaiting the woken role; not on `lane`), and `changed` (the changed inputs of a stale artifact, candidate, or approval).
- `phases`, `complete`, `threads`: unless `INVALID`. Each phase has `phase`, `artifact`, `state`, `stale` when stale, and `lanes` (`id`, `path`, `state`, `stale`) while its root is missing. `complete` lists the numbers of the complete phases (§ Complete phases), ascending. Each thread has `path`, `status`, `opener`, `owner`, `artifact`, `awaits`, and `reviewed`, from an approval's certification, else `null`.
- `netChange` (`<base>..<tip>`), `reviews` (`lane`, `approved`, `stale` with the changed inputs, `codeChanged` when the code changed): at target phase 4, unless `INVALID`. A `review` frontier entry carries `changed` and `codeChanged` the same way.

## `pipelines`

```text
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
```

Fetching is the caller's job. The pipelines folder root, absolute or relative to the process directory, selects the repository and names the folder of every pipeline, as a path inside it; it need not exist in the working tree. A path that is a file, the repository's root, or outside any repository stops the command. `pipelines` reads every local branch and remote-tracking branch tip:

1. Collect each pipeline folder (§ Pipeline files) of the pipelines folder root at each tip, with its tree id.
2. The pipeline is **live** at that tip when the folder's tree id differs from every tree id that folder had in the history of `--base`.
3. Every folder in the tree of `--base` is **merged**, reported once from `--base`.
4. With `--issue`, keep those whose intent names `issue <ref>` among its origins.

Of each pipeline folder, discovery reads only two things, so pipelines of every format are listed and none is validated:

- **`format`** (§ `run-config.md`): the integer `format` of `run-config.md` when it is a regular file with JSON frontmatter carrying one, else `earlier`.
- **Origins**: of `0-intent/intent.md` when it is a regular file. From format 7, its frontmatter's `issue`, `starts-from`, and `re-attempts`, each as `<key> <value>`, in the order written; an intent whose frontmatter cannot be read (§ Frontmatter) has no origins. In an earlier format, the values of the leading `origin:` lines of its body, below any frontmatter; an intent with unclosed frontmatter has no origins.

A pipeline of format 8 without a regular `0-intent/intent.md` is malformed and stops the command; one of an earlier format is listed with no origins. A missing or unresolving `--base`, or a git failure, stops the command. Branch and folder names are never matched. A pipeline at a local branch and its remote-tracking branch is listed for each.

Without `--json`, one line per pipeline: `<live|merged> <format> <ref> <pipeline folder>`. `--json` prints a list of `{state, format, ref, commit, folder, origins}`.

## `next`

```text
node rp.mjs next <pipeline folder> [--apply]
```

`<pipeline folder>` is in the **pipeline worktree**, the worktree that has the pipeline branch checked out; its `HEAD` is the **tip**. `next` reads the pipeline as `check` reads it from the working tree, the conventions data of the repository's main checkout (§ Conventions data), every configured lane's branch and the worktree that has it checked out, and the step record (§ Step record), and prints the step's plan. It writes no ref, worktree, file in a worktree, assignment, or step record; like `check`, it may add objects no ref names to the object store.

### Plan

The plan names everything applying it does and everything the orchestrator acts on, one line each. `<role>` is a role's name (§ Threads), every path is absolute, and a value that may hold spaces ends its line.

```text
frontier <action>[ <target>][ <lane>][: <reason>]
land <role>
fix INVALID <path>: <reason>
repair <role> INVALID <path>: <reason>
terminate <role> profile <profile>
terminate <role> lane <lane>
remove-worktree <role> <path>
delete-branch <branch>
create-branch <branch> <commit | change>
move-branch <branch> <commit | change>
create-worktree <role> <branch> <path>
wake <role> profile <profile>
wake <role> lane <lane>
wake <role> model <model name>
wake <role> phase <phase>
wake <role> worktree <path>
wake <role> assignment <path>
wake <role> resource <name>
wake <role> fresh
hook <hook> <role>[ <path>]
hook phase-started <phase>
```

| Line | What it names |
| --- | --- |
| `frontier` | Each frontier line, as `check` prints it |
| `land` | A lane's turn that ended without landing, to land before anything else |
| `fix` | A rejected file no role writes |
| `repair` | A file a lane's landing would reject, which the lane's role repairs |
| `terminate` | A role to terminate before applying, by its profile and its lane |
| `remove-worktree`, `create-worktree` | A worktree applying removes or creates, with the role it is for |
| `delete-branch`, `create-branch`, `move-branch` | A branch applying deletes, creates, or moves, and where it leaves it: a commit, or `change`, the change built from the tip (§ Review lanes) |
| `wake` | A role to wake, one line per fact: its profile; its lane, for a lane's role; its model name, when the run gives it one; its phase; its worktree; the assignment applying writes for it; each resource its assignment carries; and `fresh` when its turn needs a fresh instance |
| `hook` | A lifecycle hook the step fires: a worktree's with the role the worktree is for and its path, an agent's or a merging one's with its role, `phase-started` with its phase. No hook names a branch |

The lines come in the order the orchestrator acts on them. A plan that names a turn to land holds only the frontier and each turn to land between `before-merging-lanes` and `after-merging-lanes`. Any other plan lists the frontier; the files to fix and to repair; each termination between `before-terminating-agent` and `after-terminating-agent`; the `before-removing-worktree` and `before-creating-worktree` hooks; the actions; the matching `after-` hooks and each `phase-started`; and each role to wake between `before-spawning-agent` and `after-spawning-agent`, which fire only when the orchestrator spawns the role. A lane's role is followed by `before-merging-lanes` and `after-merging-lanes`, which fire around its landing, once its turn ends.

1. **Unlanded commits.** A lane's **unlanded commits** are the commits of its branch that `git cherry <tip> <lane branch>` marks `+`, other than a review base or a change. For every configured lane whose branch holds some, whatever the frontier, `next` computes its landing (§ `land`) from commits alone:
   - When the landing would reject no file it brings, the lane holds a turn that ended without landing: the plan names it to land.
   - Otherwise the lane is **under repair**: on any frontier but `escalate`, its role is woken in its worktree as it stands, its branch not moved, with each rejected file's line among its malformed files, and the plan names each line with `repair`. A lane under repair is dispatched for nothing else.

   A lane holding unlanded commits is never moved back, rebuilt, or removed.
2. **Dispatch.** Each frontier line:

   | Frontier line | Plan |
   | --- | --- |
   | `lane <artifact> <lane>` | The lane's branch at the tip, with a worktree; its producer woken there |
   | `consolidate <artifact>` | Each production lane of the phase whose worktree or branch exists terminated, its worktree removed and its branch deleted; the root producer woken in the pipeline worktree on a fresh instance |
   | `produce <artifact>`, `respond <artifact>` | Its owner woken in the pipeline worktree |
   | `review <lane>` | The lane's branch at the change built from the tip, with a worktree; its reviewer woken there |
   | `INVALID <path>: <reason>` | Each role that writes a rejected file (§ Assignments), seated as for its lane's line or in the pipeline worktree; each rejected file no role writes, to fix |
   | `escalate <thread>`, `complete` | Nothing |
3. **Seats.** A role without a lane sits in the pipeline worktree, on the pipeline branch. A lane's role sits in the worktree that has its lane branch checked out, `<pipeline branch>-<spec | design-doc>-<lane>` or `<pipeline branch>-review-<lane>`; when none has, the plan creates one at `<worktree folder root>/<lane branch>`. A production lane's branch is created at the tip or moved forward to it. A review lane's branch is created at the change built from the tip (§ Review lanes), or moved to it unless it is at a change that already holds what building it would give: each of the change and its review base holding the tree building gives, the review base on the current base. A worktree that exists is not created and a branch at its target is not moved, so while the tip stays, a plan printed after the plan was applied names nothing to create, remove, or move.
4. **Woken roles.** Each is named with its profile, its lane, its model name as the run gives it (§ `run-config.md`), its phase, its worktree, its assignment, `rp/<profile>.md` in the worktree's private git directory, and the names of the resources its assignment carries: those whose `profiles` hold its profile, none on a reviewer's repair request. Only a consolidation needs a fresh instance.
5. **`phase-started`** is named for each phase of the woken roles that the last applied step woke no role of.

### Applying

With `--apply`, `next` prints the plan and, unless it names a turn to land, carries it out in this order:

1. It removes each worktree with `git worktree remove`, which stops on an untracked file.
2. It deletes, creates, and moves each branch, building a review lane's change first. A branch a worktree has checked out moves with `git reset --keep` there, which stops on local changes it would overwrite.
3. It creates each worktree.
4. It writes each woken role's assignment (§ Assignments), its turn commit the tip of its worktree, and then the step record.

It changes no other ref or worktree, leaves the pipeline branch where it is, changes no file in the pipeline worktree's tree, and starts, messages, or stops no agent. A failed action stops it with `rp: next --apply: <action>: <reason>`; the actions before it stay done, and applying again, once the cause is repaired, plans and applies only what remains. An assignment written again for an unchanged turn is byte-identical.

### Review lanes

The **lane's view** of the pipeline is, at the tip, every file under `<pipeline folder>/0-intent/` and every thread `threads/<n>-reviewer-<lane>-implementer-implementation.md` or `threads/<n>-reviewer-<lane>-owner-intent.md`. The change built from the tip is two commits, built through a temporary index from commits alone, so no worktree's index, `HEAD`, or files affect them:

1. **Review base**: the base's tree (§ Net change and approval) with the pipelines folder root replaced by the **lane's root**: the tip's root without its pipeline folders (§ Pipeline files), plus the lane's view; its parent is the base; its message is `rp review base`.
2. **Change**: the tip's tree with the root replaced by the same lane's root; its parent is the review base; its message is `rp review change`.

`git diff <review base> <change>` is the net change; the root's tooling stays, at the tip's version, and the lane's tree and history hold no other pipeline.

### Step record

The step record is `rp/step.json` in the pipeline worktree's private git directory, beside its assignments: a JSON object holding `turns`, each woken role's latest turn by its name, with its `worktree`, `branch`, turn `commit`, and a review lane's `change`, each commit a full hash; `woke`, the phases of the roles the last applied step woke; `complete`, the phases complete when it was applied; and `reported`, the phases its landings reported. Applying writes it, and landing adds to `reported`.

Everything `check` stops on, conventions data that is missing or malformed, a detached pipeline worktree, a step record that cannot be read or is malformed, a `base` that does not resolve, an unreadable or malformed template, and a git failure stop `next`.

## `land`

```text
node rp.mjs land <pipeline folder> --role <role>
```

`<pipeline folder>` is in the pipeline worktree, as for `next`. `land` lands the turn the step record holds for `<role>`:

1. **Verify.** The role's branch exists and holds its turn commit; otherwise `land` stops, naming the role's worktree.
2. **Bring.** From commits alone. A production lane's branch, when it holds unlanded commits (§ `next`), is merged into the tip. A review lane's unlanded commits after its change are picked onto the tip one by one, keeping their authors and messages, and none of the commits that built the change. A role in the pipeline worktree has its commits on the tip already. A conflict stops `land`.
3. **Validate.** The pipeline files the turn's unlanded commits change, or for a role in the pipeline worktree its commits after its turn commit, are validated as `check` validates them, as the pipeline branch would hold them after the landing. A rejected one stops `land` with `rp: land: <worktree>: rp check rejects files the turn brings:`, then each `INVALID <path>: <reason>` line as `check` prints it. Whatever stops `check` on the pipeline after the landing, such as a `base` that does not resolve, stops `land` too.
4. **Certify.** It writes `certification/<path>.json` (§ Certification) for the role's artifact or candidate when it exists, at the turn commit, and for each approval among the files the turn brings, at the commit its reviewer's last message names, with `reviewed` the last commit brought, the pipeline commit holding it. An approval whose named commit does not resolve, or whose code outside the pipelines folder root differs from that pipeline commit's, lands uncertified, any certification its path held removed, so its lane is not approved. `inputs` are the file's required inputs at their identities in that commit's tree, whether or not the turn changed the file, so a response that leaves its artifact unchanged becomes fresh, and an input committed after that commit is not certified. Only what certifying reads at that commit is validated there: the intent, every later input (its `target` says whether it applies), and the file's upstream artifacts; one of them malformed, or a required input missing, stops `land`.
5. **Commit.** It commits the merge and then the certifications that change or are removed, each subject naming what it landed, such as `Merge spec lane a` or `Certify spec`, in the conventions' `landing-commit` template when they declare one. A landing that changes no certification and brings no commit makes no commit.
6. **Move.** It fast-forwards the pipeline worktree to its last commit with `git merge --ff-only`, which stops on local changes it would overwrite.
7. **Report.** It prints `hook phase-completed <phase>` for each phase complete after the landing (§ Complete phases) that was not complete when the step was applied and that no earlier landing of the step reported, in phase order, and adds them to the step record.

Every check comes before the pipeline branch moves, so a stop leaves the pipeline branch, the pipeline worktree, and every certification as they were. A role with no recorded turn, everything `check` stops on, conventions data that is missing or malformed, a detached pipeline worktree, a step record that cannot be read or is malformed, and a git failure also stop `land`.

## `thread`

```text
node rp.mjs thread open <pipeline folder> --role <role> --artifact <spec | design-doc | implementation> --body <file | ->
node rp.mjs thread reply <pipeline folder> --role <role> --thread <thread file> --body <file | ->
node rp.mjs thread close <pipeline folder> --role <role> --thread <thread file> --status <approved | withdrawn> [--body <file | ->]
node rp.mjs thread escalate <pipeline folder> --role <role> --cites <thread path | evidence path> --body <file | ->
```

`thread` writes a thread (§ Threads) in the working tree of the worktree that holds `<pipeline folder>`, as `--role`, around each message's body: the bytes of the file `--body` names, or of standard input for `-`, written as given. It reads only the thread it writes and the names in `threads/`, never `run-config.md`, so it works alike in a review lane's tree, a production lane's worktree, and the pipeline worktree.

- `open` writes `threads/<n>-<role>-<owner>-<artifact>.md`, `<owner>` the artifact's owner, with status `open` and the role's message. `<n>` is one more than the highest number among the names `threads/<n>-….md` in the working tree, or 1 when it holds none; `threads/` is created when absent, and an existing file is never replaced.
- `escalate` writes `threads/<n>-<role>-owner-intent.md`, numbered the same way, with status `disagreement`, `cites` the text given, quoted when the frontmatter needs it (§ Frontmatter), and the role's message.
- `reply` adds the role's message at the end of an `open` thread that awaits it.
- `close` sets the status of an `open` thread the role opened to `approved` or `withdrawn`, and with `--body` adds the role's closing message at the end. A review thread is closed `approved` without `--body` only when its last message is the reviewer's and names the commit its worktree stands on, the commit `land` certifies the approval at.

A message is its heading `## <role> — <commit>` on a line of its own after a blank line, `<commit>` the full hash of the worktree's `HEAD`, then a blank line and the body. Every other byte of the file stays as it was, but for the status `close` sets. The command writes the file only when the file grammar (§ `validate`) accepts it and reads in it the messages the command means, the role's last, and would read a message written after the role's; it then prints the file's absolute path. It writes nothing else: no certification, ref, or other file. Every other use is wrong, and writes nothing:

- `open` or `escalate` by a production lane's role; `open` about the intent, or about the artifact the role owns; `escalate` whose `--cites` is empty;
- a `--thread` that names no thread file of the pipeline folder, or a file the file grammar rejects;
- `reply` to a thread that does not await the role; `close` of a thread that is not `open`, by a role other than its opener, or with another status; an approval without `--body` that the last message does not name;
- a body of whitespace alone, a body holding a line the grammar reads as a message heading, or one leaving fenced code open, which hides every heading after it.

The owner's answer on a thread to `owner` is written by hand (`../reference/run/loop.md` § Owner escalation).

## `validate`

```text
node rp.mjs validate <pipeline folder> --role <role> [--file <path>]
```

`validate` checks the role's files (§ Assignments) as they stand in the working tree of the worktree that holds `<pipeline folder>`, committed or not, or with `--file` that one of them alone. It applies the **file grammar**, every check `check` makes of a pipeline file that reads the file alone, and prints `INVALID <path>: <reason>` for each file it rejects, as `check` prints it; otherwise `accepted: every file of <role>`, or `accepted: <path>` with `--file`. It reads no `run-config.md` and no other file, so it works in every seat, and changes nothing. The two checks that read `run-config.md`, of an `open` thread awaiting a review lane it does not declare and of a candidate of a production lane it does not declare, reach a role through `land` alone. A `--file` outside the pipeline folder, or none of the role's files, is a wrong use; a role's file that cannot be read, a path of the wrong kind where a role's file or a folder holding one belongs, or a `--file` that is missing, stops it, as it stops `check`.

## Assignments

`next --apply` writes the assignment of each role it wakes, from the main checkout's `.rp.md` and `.rp.local.md`, the first worktree `git worktree list` records, whichever worktree the role sits in.

1. **Turn.** The frontier line that wakes the role gives its turn:

   | Frontier line | Role and turn |
   | --- | --- |
   | `produce <artifact>` | Its owner, mode Produce; Implement for the implementer |
   | `respond <artifact>` | Its owner, mode Respond |
   | `consolidate <artifact>` | Its owner, mode Consolidate |
   | `lane <artifact> <lane>` | The lane, mode Produce while its candidate is missing, else Respond |
   | `review <lane>` | The lane's reviewer |
   | `INVALID <path>: <reason>` | Each role that writes a rejected file; a producer or the implementer in Respond, a reviewer with the repair request |

   A role writes its artifact or candidate, and every thread whose file name names it as opener or owner: its **files**. The `INVALID` lines of those files, and only those, are its malformed files. A lane under repair (§ `next`) gets the turn of an `INVALID` line for each file its landing would reject.
2. **Request.** A reviewer with malformed files gets the repair request. Otherwise its review thread is its highest-numbered `threads/<n>-reviewer-<lane>-implementer-implementation.md`. While that thread is `open`, the request is the later-turn one, and `reviewer.diff` is written beside the assignment: the diff from the commit the reviewer's last message names to the change, outside the pipelines folder root. Otherwise it is the first-turn one.
3. **Write.** The template (`../templates/README.md`) is filled and written at the path `git rev-parse --git-path rp/<profile>.md` gives in the role's worktree, replacing the previous turn's. Every model name is written as the run writes it, and each assignment states the command that runs `rp` as its role from its worktree (`../templates/README.md` § Values). Each path on that command line is one POSIX shell word, quoted when a character in it is one a shell does not take literally; each path an assignment shows for reading is as written.

### Conventions data

`.rp.md`'s frontmatter is a JSON object holding the conventions `rp` reads: where worktrees go, how landing commits read, and what an assignment carries. Its body is prose `rp` never reads.

```json
{
  "conventions": 9,
  "worktree-folder-root": ".worktrees",
  "landing-commit": "{subject} (orchestrator)",
  "commit-format": ["Use imperative mood.", "", "- `Add spec (spec-producer)`"],
  "guardrails": { "tests": { "rule": "Run `npm test` and confirm it passes.", "profiles": ["implementer", "reviewer"] } },
  "resources": { "staging": { "resource": "The staging site `{agent}.example.com`.", "profiles": ["implementer", "reviewer"] } },
  "agents": { "spec-producer": { "model": "large", "subagents": "small", "lanes": { "a": { "brief": "…" } } } },
  "variables": { "agent": "{pipeline-slug}-{role}" }
}
```

- `conventions`, required: the version, `9`.
- `worktree-folder-root`, required: the folder holding one worktree per branch, at `<folder>/<branch>`, a non-empty string; a relative one resolves against the main checkout's root.
- `landing-commit`: the template of each commit `rp land` makes, a non-empty string holding `{subject}` and no other placeholder (§ Placeholders); `{subject}` is replaced by the commit's subject. Without it, the commit's message is its subject alone.
- A **text** is a string, or a list of strings that are its lines, holding more than whitespace: `commit-format`, a guardrail's `rule`, a resource's `resource`, and a lane's `brief`.
- `guardrails` and `resources`, by name: each entry holds its text and `profiles`, a non-empty list of `spec-producer`, `design-doc-producer`, `implementer`, and `reviewer`.
- `agents`, by profile: optional `model` and `subagents`, each a non-empty model name, and for `spec-producer`, `design-doc-producer`, and `reviewer` optional `lanes`, a non-empty object of lanes by id, each with an optional `brief`, `model`, and `subagents`. A lane id matches `[a-z0-9][a-z0-9-]*`. `run-config.md`'s `agents` has this schema.
- `variables`, by name: each a template, a non-empty string whose placeholders name vocabulary facts only. A name matches `[a-z][a-z0-9-]*` and is no vocabulary fact.

Every key but `conventions` and `worktree-folder-root` is optional, and no other key exists at any level. `.rp.local.md`'s frontmatter, when it has one, holds the same keys but `conventions`, each optional: each guardrail, resource, and variable it names replaces or adds the committed one by name, its `agents` entry each profile's, and its `worktree-folder-root`, `landing-commit`, and `commit-format` the committed ones. A `.rp.local.md` without frontmatter overrides no data. Data that does not parse stops `next` and `land`, naming the file and where parsing failed; a malformed entry stops it naming the file and the entry, as `<key>.<name>…`.

### Placeholders

A placeholder is `{<name>}` in a guardrail's, a resource's, or the commit format's text, or in a lane's brief, `<name>` matching `[a-z][a-z0-9-]*`, with no brace beside either of its braces; every other brace is text. In an assignment, each placeholder that names a vocabulary fact or a variable is replaced by its value for the role, in one pass; a variable's value is its template with each fact replaced.

| Vocabulary fact | Value |
| --- | --- |
| `pipeline-slug` | The pipeline folder's name |
| `role` | `<profile>` or `<profile>-<lane>` |
| `profile` | The role's profile |
| `lane` | The lane id; empty for a role without a lane |
| `worktree` | The absolute path of the role's worktree |
| `branch` | The role's branch |
| `base` | The Base: the merge-base of the role's turn commit with `run-config.md`'s `base` |

A placeholder that names neither stays as written, and the assignment then lists every vocabulary fact with its value.

## Decisions

These fill details the specification leaves open; the prose aligns with them.

- **A thread to `owner`** opens as `disagreement` and closes `answered`; `open`, `approved`, and `withdrawn` are `INVALID` there.
- **A message by `owner`** on any thread leaves it awaiting the thread's owner.
- **A woken opener** gets `produce` when its artifact is missing and `respond` otherwise, with the threads awaiting it. Beyond the target, a thread's owner gets `respond` even when its artifact is missing.
- **The base an approval is merged with** is the merge-base of the tip with the base branch, not the base branch's tip, so a base that moved without being merged leaves approvals fresh.
- **Strict keys**: unknown frontmatter, `run-config.md`, agents, conventions data, and certification keys are `INVALID` or stop the command.
