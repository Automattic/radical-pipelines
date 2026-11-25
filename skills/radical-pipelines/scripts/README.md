# `rp`

`rp` computes a pipeline's state from its files and names the frontier, discovers pipelines, starts each run — the pipeline branch, its worktree, and the pipeline configuration — plans and applies each step of the loop — its lane branches and worktrees and each woken role's assignment — lands each turn, certifying what it landed, and removes the worktrees a stopped run or a closed pipeline leaves. A role writes its threads and checks its own files with it. It needs Node and Git 2.38 or later (for `git merge-tree --write-tree`), nothing else. The path argument selects the repository and worktree, whatever the process directory, against which every relative path resolves. [State](../reference/run/state.md) is the specification; this file is the exact grammar.

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
node rp.mjs start <pipeline folder> --branch <pipeline branch> --config <file | -> [--apply]
node rp.mjs next <pipeline folder> [--apply]
node rp.mjs land <pipeline folder> --role <role>
node rp.mjs stop <pipeline folder> --branch <pipeline branch> [--apply]
node rp.mjs close <pipeline folder> --branch <pipeline branch> [--apply]
node rp.mjs thread open <pipeline folder> --role <role> --about <spec | design-doc | implementation> --body <file | ->
node rp.mjs thread reply <pipeline folder> --role <role> --thread <thread file> --body <file | ->
node rp.mjs thread close <pipeline folder> --role <role> --thread <thread file> --status <approved | resolved | withdrawn> [--body <file | ->]
node rp.mjs thread escalate <pipeline folder> --role <role> --cites <thread path | evidence path> --body <file | ->
node rp.mjs validate <pipeline folder> --role <role> [--file <path>]
```

Each command accepts only its options and one positional argument. A command that cannot read what it needs, or is used wrongly, prints `rp: <reason>` to stderr and exits 1. A command line the command does not take, such as an unknown option or a missing argument, is followed by the command's form; every other wrong use of `thread` and `validate` is followed by what to run instead. Otherwise it exits 0, whatever the frontier.

## Pipeline files

A pipeline folder is `<pipelines folder root>/<pipeline slug>`, a folder of the root that holds `config.json` at its top level; any other content of the root, such as tooling, is not a pipeline. `check`, `next`, and `land` take the pipelines folder root to be the parent of the pipeline folder they are given; `pipelines` is given it.

`rp` reads these files of a pipeline folder and ignores every other file:

| Path | What it is | Frontmatter keys |
| --- | --- | --- |
| `config.json` | Pipeline configuration (§ `config.json`) | none: the file is JSON |
| `0-intent/intent.md` | Intent | `issue`, `starts-from`, `re-attempts`, each optional |
| `0-intent/constraint-<n>.md`, `proposal-<n>.md`, `failure-<n>.md` | Later input | `target`, required; `origin`, optional and not interpreted |
| `1-spec/spec.md` | Spec | no frontmatter |
| `1-spec/lanes/<lane>/spec.md` | Spec candidate | no frontmatter |
| `2-design-doc/design-doc.md` | Design doc | no frontmatter |
| `2-design-doc/lanes/<lane>/design-doc.md` | Design doc candidate | no frontmatter |
| `3-implementation/notes.md` | Implementation notes | `status` |
| `threads/<name>.md` | Thread | `status`, `opener`, `recipient`, `about`; `cites` on a thread to `owner` (§ Threads) |
| `certification/<path>.json` | The certification of the file at `<path>` (§ Certification) | none: the file is JSON |

A key outside the table, or frontmatter on a file that carries none, makes the file malformed. `rp` reads these values from the frontmatter alone; the body is free text.

### Frontmatter

A frontmatter is the lines between a first line `---` and the next line `---`; either may end in CRLF, and the closing one may end the file. It holds this YAML subset, a flat map of single-line text values:

- Each line is blank or `<key>: <value>`, starting at column 0. `<key>` starts with a letter or digit.
- A plain value is the text written, without surrounding spaces and tabs. A value in single or double quotes is the text between them. Every value is text, including one YAML would read as a number, a boolean, or null, such as `368` or `true`; an empty value is empty text.
- A file whose frontmatter has no closing line, an indented line (a nested map or a multi-line value), a list item, a comment line, a line that is no `<key>: <value>`, or a key given twice is malformed. So is a value YAML would read as other text or as structure: one holding a comment (` #`, or `#` first, as in an unquoted issue reference `#368`), a flow collection (`[`, `{`), an anchor (`&`), an alias (`*`), a tag (`!`), a block scalar (`|`, `>`), a quoted value holding an escape (`\` in double quotes, `''` in single quotes) or followed by text, or a plain value YAML rejects: one starting with `%`, `@`, `` ` ``, `,`, `]`, or `}`, starting with `-`, `?`, or `:` followed by a space or alone, or holding `: ` or ending with `:`. The reason names the key and the construct, or the line.

Quote a value that starts with one of those characters, such as `issue: "#368"`.

### Identity

A file's identity is the first 12 hexadecimal characters of the git blob id of the whole file, frontmatter included: at a commit, the id its tree records; in the working tree, the id `git add` would store for the file at its path, after the clean filters and line-ending conversion its attributes, configuration, and index entry select, so a file committed with CRLF keeps it under `core.autocrlf`. Git computes it on a copy of the worktree's index, writing no object and leaving the index untouched. An unmodified working tree has the identities of `HEAD`'s tree.

### `config.json`

The pipeline configuration (`../reference/run/state.md` § Pipeline configuration), one JSON object:

```json
{
  "target-phase": 4,
  "base-branch": "main",
  "worktree-folder-root": ".worktrees",
  "landing-commit-format": "{subject} (orchestrator)",
  "commit-format": "Use imperative mood.\n\n- `Add spec (spec-producer)`",
  "guardrails": { "tests": { "text": "Run `npm test` and confirm it passes.", "profiles": ["implementer", "reviewer"] } },
  "resources": { "staging": { "text": "The staging site `{agent}.example.com`.", "profiles": ["implementer", "reviewer"] } },
  "variables": { "agent": "{pipeline-slug}-{role}" },
  "lanes": {
    "spec-producer": { "demands": { "brief": "Read the intent for what it demands." }, "omits": { "brief": "…" } },
    "design-doc-producer": { "direct": {}, "alternative": { "after": ["direct"] } },
    "reviewer": { "default": {}, "security": { "brief": "…" } }
  },
  "consolidation-briefs": { "design-doc-producer": "…" },
  "models": {
    "spec-producer": { "model": "large", "subagent-model": "small" },
    "spec-producer-demands": { "model": "other-large" },
    "implementer": { "model": "large" },
    "reviewer-security": { "model": "other-large", "subagent-model": "other-small" }
  },
  "orchestrator-directions": ["Keep the pipeline branch local."]
}
```

- `target-phase`, required: an integer from 1 to 4. Phase 4 is review.
- `base-branch`, required: a revision that resolves to a commit.
- `worktree-folder-root`, required: the folder holding one worktree per branch, at `<folder>/<branch>`, a non-empty string; a relative one resolves against the main checkout's root, the first worktree `git worktree list` records.
- `landing-commit-format`: the template of each commit `rp land` makes, a non-empty string holding `{subject}` and no other placeholder (§ Placeholders); `{subject}` is replaced by the commit's subject. Without it, the commit's message is its subject alone.
- A **text** is a string holding more than whitespace, its lines separated by newlines: `commit-format`, a guardrail's or a resource's `text`, a lane's `brief`, and a consolidation brief. An assignment carries it as written, its placeholders expanded.
- `guardrails` and `resources`, by name: each entry holds its text and `profiles`, a non-empty list of `spec-producer`, `design-doc-producer`, `implementer`, and `reviewer`.
- `variables`, by name: each a template, a non-empty string whose placeholders name pipeline facts only. A name matches `[a-z][a-z0-9-]*` and is no pipeline fact.
- `lanes`, by `spec-producer`, `design-doc-producer`, or `reviewer`: each a non-empty object of the profile's lanes by lane id, each lane holding an optional `brief`. A lane id matches `[a-z0-9][a-z0-9-]*`.
- A `design-doc-producer` lane may also hold `after`: a non-empty list of other lanes of its profile, each named once, whose candidates are its **previous candidates**. No lane comes after itself, directly or through others.
- `consolidation-briefs`, by `spec-producer` or `design-doc-producer`: the text the profile's consolidation carries as its brief.
- A profile's lanes are production lanes for `spec-producer` and `design-doc-producer`, and review lanes for `reviewer`. Without a `reviewer` lane there is one review lane, `default`. A configuration may declare `default` itself alongside other review lanes.
- `models`, by profile, or by the role name `<profile>-<lane>` of a lane the run has: one `lanes` declares, or the review lane `default` while `lanes` declares no `reviewer` lane. Each entry holds an optional `model` and `subagent-model`, each a non-empty model name.
- A role's model is the `model` of its role name's entry, else of its profile's; its subagent model is the `subagent-model` of its role name's entry, else of its profile's. Either may be none.
- `orchestrator-directions`: a list of strings, the owner's directions to the orchestrator about its own part of the pipeline's runs. `rp` validates it and otherwise ignores it: no assignment carries it.

No other key exists at any level. `check`, `next`, and `land` read the file where they read every pipeline file, and validate it whole. A missing `config.json` stops them, `rp: cannot read <path>: missing`, as does a missing intent. A file that is not one JSON object, or that breaks these rules, stops them with `rp: <path>: <reason>`, naming a malformed entry as `<key>.<name>…`.

### Certification

`land` alone writes `certification/<path>.json`, the certification of the artifact, candidate, or approval at `<path>`, relative to the pipeline folder. It is a JSON object holding only:

- `inputs`: a list of `<path>@<identity>`, one per pinned file, with paths relative to the pipeline folder. A pin may name the intent, a later input, an artifact, a candidate, or a thread.
- `approved-commit`, on an approval only (§ Threads): the full hash of its approved commit (§ Net change and approval).

| What is certified | Required inputs |
| --- | --- |
| `1-spec/spec.md` | `0-intent/intent.md`; every later input targeting it; every `answered` thread its owner opened |
| A spec candidate | `0-intent/intent.md` |
| `2-design-doc/design-doc.md` | `1-spec/spec.md`; every later input targeting it; every `answered` thread its owner opened |
| A design doc candidate | `1-spec/spec.md`; its lane's previous candidates |
| `3-implementation/notes.md` | `1-spec/spec.md`, `2-design-doc/design-doc.md`; every later input targeting it; every `answered` thread its owner opened |
| An approval | `0-intent/intent.md`; every later input |

- **Stale**: a required input is unpinned, or pinned at an identity that differs from the current one. A file without a certification is stale on each required input. Pins of other files are checked for grammar only. At target phase 3 or 4, `notes.md` is also stale while `git merge-tree --write-tree --name-only <tip> <base branch>` conflicts on a path outside the pipelines folder root; conflicts inside it are ignored. A merge's conflicts are the files it leaves unmerged and the paths its `CONFLICT` messages name.
- **Missing**: the file is absent. `notes.md` is also missing until its `status` is `done`.
- **Fresh**: neither.

`check` reads the certification of each artifact, candidate, and approval present, in the working tree or at `--ref` alike, and never another file under `certification/`, such as a dropped lane's. A certification that is a symlink or not a regular file, a folder where it belongs, a file where its folder belongs, invalid JSON, a key outside those above or a missing one, an ill-formed or repeated pin, a pin naming no pinnable path, or an `approved-commit` that is no full commit hash stops the command: `rp: <path>: <reason>`, with no frontier.

### Later input

A later input's `target` is `<artifact>[#<id>][, <artifact>[#<id>]]...`. Each `<artifact>` is an artifact's name: `spec` for `1-spec/spec.md`, `design-doc` for `2-design-doc/design-doc.md`, or `implementation` for `3-implementation/notes.md`. A missing `target` or any other name makes the file malformed.

## Threads

A thread file is named `<n>-<opener>-<recipient>-<about>.md` after its frontmatter, with `<n>` a positive integer. Threads may share `<n>`. Roles write threads with `thread` (§ `thread`).

Its frontmatter holds four keys, five on a thread to `owner`:

```yaml
---
status: open | approved | resolved | withdrawn | escalated | answered
opener: <role>
recipient: <role>
about: intent | spec | design-doc | implementation
cites: <thread path | evidence path>
---
```

- `<role>` is `<profile>[-<lane>]`: `owner`, `implementer`, `spec-producer`, `design-doc-producer`, or `reviewer-<lane>`, with `<lane>` matching `[a-z0-9][a-z0-9-]*`. Roles are checked by this grammar only, never against `config.json`, so closed threads of a removed lane stay valid. Production lanes open no threads: a thread whose opener or recipient is `spec-producer-<lane>` or `design-doc-producer-<lane>` is `malformed <thread>: production lanes open no threads`. An `open` thread awaiting a review lane that `config.json` does not declare is `malformed <thread>: lane not configured; close the thread withdrawn`; `default` is declared while no `reviewer` lane is, or when a lane declares it.
- `about` pairs with the recipient's profile: `intent`–`owner`, `spec`–`spec-producer`, `design-doc`–`design-doc-producer`, `implementation`–`implementer`.
- The opener is any role but `owner`, and differs from the recipient.
- A thread to `owner` has status `escalated` or `answered`, and `cites` with a non-empty value; no other thread has either status or the key. The value is not resolved.
- A review thread closes `approved` and any other thread `resolved`; neither status is valid on the other.

In the body, every line that starts with `## ` outside fenced code is a message heading: `## <author> — <commit>`, with `<author>` the opener, the recipient, or `owner`, an em dash, and 7 to 64 hexadecimal characters. Text before the first heading and between headings is free. A thread has at least one message, and the first is the opener's.

An `open` thread awaits its opener when its recipient wrote the last message, and its recipient otherwise. No other thread awaits anyone.

A **review thread** is one opened by `reviewer-<lane>` to `implementer`. An **approval** is a review thread closed `approved`.

## Net change and approval

The **merge-base** is the merge-base of the tip with `config.json`'s `base-branch`: the latest of the base branch the tip holds. A `base-branch` that does not resolve, or has no merge-base with the tip, stops `check`. The **net change** is the diff `<merge-base>..<tip>` outside the pipelines folder root: what the reviewer reads.

An approval's `approved-commit` is the pipeline-branch commit that held the approval when it was certified, whose code is the review head its reviewer read (§ `land`). The approval is **fresh** when no required input changed (§ Certification) and the tip's code is the approved commit's plus clean merges of the merge-base:

1. When the approved commit is the tip, the code is the approved code.
2. Otherwise, `git merge-tree --write-tree --name-only <approved commit> <merge-base>`. A conflict on a path outside the pipelines folder root changes the code; conflicts inside it are ignored.
3. Then `git diff --quiet <merged tree> <tip> -- . ':(top,exclude,literal)<pipelines folder root>'`. Any difference changes the code.

An approval without a certification is stale on its required inputs, and its code is not judged. An approval whose approved commit does not resolve to a commit in the clone, as after a squash merge or a deleted branch, is no approval: `unapproved`. A review lane is **approved** when its highest-numbered review thread is a fresh approval. Approval is computed for the configured review lanes.

## `check`

```text
node rp.mjs check <pipeline folder> [--ref <commit>] [--json]
```

`check` reads the pipeline files and their certifications from the working tree, or with `--ref` from that commit. The tip is `HEAD`, or the `--ref` commit. A pipeline file that is a symlink or not a regular file, a folder where a pipeline file belongs, or a file where a pipeline folder belongs stops `check`, in the working tree and at a ref alike. `check` validates every pipeline file.

### Frontier

The frontier is every action of the first rule that holds:

1. **`malformed <path>: <reason>`** for each malformed file.
2. **`escalate <thread>`** for each `escalated` thread.
3. The lowest phase whose roles have work. Phases 1 to 3 belong to their artifact's profile, its production lanes included, and phase 4 to the reviewers. Work is an `open` thread awaiting the role, in any phase, or the artifact missing or stale, through the target. `<artifact>` is the artifact's name:
   - While the artifact is missing, for each configured lane whose previous candidates are all fresh: **`produce <artifact> <lane>`** when its candidate is missing, **`respond <artifact> <lane>`** when it is stale.
   - Production lanes configured, the artifact missing, and every candidate fresh: **`consolidate <artifact>`**.
   - The artifact missing, without production lanes: **`produce <artifact>`**.
   - The artifact stale, or a thread awaiting the artifact's owner: **`respond <artifact>`**. Beyond the target, only the thread counts.
   - Phase 4: **`review <lane>`** for each lane a thread awaits, and, at target phase 4, each configured lane not approved; a lane whose approval is stale only once no review thread is `open`.
4. **`complete`**.

### Complete phases

A phase from 1 through the target is **complete** when every phase below it is complete and its work is done:

- Phase 1 or 2: its artifact is fresh, and no `open` thread awaits its producer.
- Phase 3: `notes.md` is fresh, its `status` `done`, and no `open` thread awaits the implementer.
- Phase 4: every review lane is approved, and no `open` thread awaits a reviewer.

On a `malformed` frontier no phase is complete.

### Output

Without `--json`, the frontier comes first, one line per action, then one line per fact:

```text
frontier <action>[ <target>][ <lane>][: <reason>]
candidate <artifact> <lane> <state>            for each production lane while its artifact is missing
artifact <artifact> <state>                    for each phase through the target, after its candidates
net-change <merge-base>..<tip>                 at target phase 4
review <lane> <approval>                       at target phase 4, for each review lane
thread <thread> <status>[ awaits <role>]
```

`<state>` is `missing`, `fresh`, or `stale` followed by the changed inputs and, when the base branch conflicts, `base`. `<approval>` is `approved`, `unapproved` when the latest review thread is no approval, or `stale` followed by the changed inputs and, when the code changed, `code`. On a `malformed` frontier, only the frontier lines are printed. Paths are relative to the pipeline folder; `base-conflicts` holds paths from the repository root.

`--json` prints one object:

- `pipeline`, `tip`, `target-phase`, `frontier`: always. Each frontier entry has `action`, and where they apply `target`, `lane`, `reason`, `threads` (the threads awaiting the woken role; not on a lane's entry), `changed` (the changed inputs of a stale artifact, candidate, or approval), and `base-conflicts` (the paths that conflict when the base branch is merged into the tip, from the repository root).
- `phases`, `complete`, `threads`: unless the frontier is `malformed`. Each phase has `phase`, its number, `artifact`, its artifact's name, `path`, `state`, `stale` when stale, `base-conflicts` when the base branch conflicts, and `lanes` (`lane`, `path`, `state`, `stale`) while its artifact is missing. `complete` lists the numbers of the complete phases (§ Complete phases), ascending. Each thread has `path`, `status`, `opener`, `recipient`, `about`, `awaits`, and `approved-commit`, from an approval's certification, else `null`.
- `net-change` (`<merge-base>..<tip>`), `reviews` (`lane`, `approved`, `stale` with the changed inputs, `code-changed` when the code changed): at target phase 4, unless the frontier is `malformed`. A `review` frontier entry carries `changed` and `code-changed` the same way.

## `pipelines`

```text
node rp.mjs pipelines <pipelines folder root> --base <artifact base branch> [--issue <ref>] [--json]
```

Fetching is the caller's job. The pipelines folder root, absolute or relative to the process directory, selects the repository and names the folder of every pipeline, as a path inside it; it need not exist in the working tree. A path that is a file, the repository's root, or outside any repository stops the command. `pipelines` reads every local branch and remote-tracking branch tip:

1. Collect each pipeline folder (§ Pipeline files) of the pipelines folder root at each tip, with its tree id.
2. The pipeline is **live** at that tip when the folder's tree id differs from every tree id that folder had in the history of `--base`.
3. Every pipeline folder in the tree of `--base` is **merged**, reported once from `--base`.
4. With `--issue`, keep those whose intent names `issue <ref>` among its origins.

Of each pipeline folder, discovery reads only `0-intent/intent.md`, through the file grammar (§ `validate`): its origins are its frontmatter's `issue`, `starts-from`, and `re-attempts`, each as `<key> <value>`, in the order written. A pipeline whose intent is missing, not a regular file, or rejected by the file grammar stops the command, naming the intent and the reason, with or without `--issue`; no other file of a pipeline is read or validated. A missing or unresolving `--base`, or a git failure, stops the command. Branch and folder names are never matched. A pipeline at a local branch and its remote-tracking branch is listed for each.

Without `--json`, one line per pipeline: `<live|merged> <ref> <pipeline folder>`. `--json` prints a list of `{state, ref, commit, folder, origins}`.

## `start`

```text
node rp.mjs start <pipeline folder> --branch <pipeline branch> --config <file | -> [--apply]
```

`<pipeline folder>` is the pipeline folder's path in any worktree of the repository, such as the main checkout; it need not exist. `--config` names a file holding the pipeline configuration (§ `config.json`), against the process directory, or `-` for standard input. `start` prints the plan that starts a run, in the lines of § Plan and two of its own, and changes nothing. `pipeline` stands where a lane's line names its role:

```text
hook before-creating-branch pipeline
hook before-creating-worktree pipeline <path>
create-branch <pipeline branch> <commit>
create-worktree pipeline <pipeline branch> <path>
write-config <path>
hook after-creating-branch pipeline
hook after-creating-worktree pipeline <path>
pipeline-folder <path>
```

1. **Branch.** A pipeline branch that does not exist is created: at the remote-tracking branch of the one remote that holds it, where that remote's fetch refspecs map it and none excludes it, which it then tracks; else at the configuration's `base-branch`, tracking nothing. Several remotes holding it, or a `--branch` no remote holds that names a remote-tracking branch, stop the command.
2. **Worktree.** The pipeline worktree is the worktree that has the pipeline branch checked out; when none has, the plan creates one at `<worktree folder root>/<pipeline branch>`, the root being the configuration's.
3. **`write-config`** names `config.json` in the pipeline folder of the pipeline worktree, when it does not hold the bytes given. A path there that is no folder where a folder belongs, or no regular file where `config.json` belongs, such as a symbolic link, stops the command.
4. **`pipeline-folder`** names the pipeline folder in the pipeline worktree, which `next` and `land` take.

With `--apply`, `start` prints the plan and carries it out: it creates the branch and the worktree, creates the pipeline branch's turn record (§ Turn record) naming the pipeline folder when it has none, then writes `config.json` byte for byte, committing nothing. A failed action stops it with `rp: start --apply: <action>: <reason>`; the actions before it stay done, and applying again plans and applies only what remains. A branch name Git rejects, a turn record that names another pipeline folder, a configuration that cannot be read or is malformed, a `base-branch` the branch would start at that does not resolve, and a worktree Git records whose folder is missing stop `start` before it creates anything.

## `next`

```text
node rp.mjs next <pipeline folder> [--apply]
```

`<pipeline folder>` is in the **pipeline worktree**, the worktree that has the pipeline branch checked out; its `HEAD` is the **tip**. `next` reads the pipeline as `check` reads it from the working tree, every configured lane's branch and the worktree that has it checked out, and the turn record (§ Turn record), and prints the step's plan. It writes no ref, worktree, file in a worktree, assignment, or turn record; like `check`, it may add objects no ref names to the object store.

### Plan

The plan names everything applying it does and everything the orchestrator acts on, one line each. `<role>` is a role's name (§ Threads), every path is absolute, and a value that may hold spaces ends its line.

```text
frontier <action>[ <target>][ <lane>][: <reason>]
land <role>
fix malformed <path>: <reason>
repair <role> malformed <path>: <reason>
remove-worktree <role> <path>
delete-branch <branch>
create-branch <branch> <commit | review-head>
move-branch <branch> <commit | review-head>
create-worktree <role> <branch> <path>
wake <role> profile <profile>
wake <role> lane <lane>
wake <role> model <model name>
wake <role> phase <phase>
wake <role> worktree <path>
wake <role> assignment <path>
wake <role> resource <name>
wake <role> new
hook <hook> <role>[ <path>]
hook phase-started <phase>
```

| Line | What it names |
| --- | --- |
| `frontier` | Each frontier line, as `check` prints it |
| `land` | A lane's turn that ended without landing, to land before anything else |
| `fix` | A malformed file no role writes |
| `repair` | A malformed file a lane's landing would bring, which the lane's role repairs |
| `remove-worktree`, `create-worktree` | A worktree applying removes or creates, with the role it is for |
| `delete-branch`, `create-branch`, `move-branch` | A branch applying deletes, creates, or moves, and where it leaves it: a commit, or `review-head`, the review head built from the tip (§ Review lanes) |
| `wake` | A role to wake, one line per fact: its profile; its lane, for a lane's role; its model name, when `config.json` gives it one; its phase; its worktree; the assignment applying writes for it; each resource its assignment carries; and `new` when its turn needs a new instance |
| `hook` | A lifecycle hook the step fires: a branch's with what the branch is for, a worktree's with what the worktree is for and its path, a spawning or landing one's with its role, `phase-started` with its phase. No hook line holds a branch's name |

No plan removes a worktree that holds a file Git does not ignore that its branch lacks, modified or untracked: such a worktree stops the command while it plans, before any hook fires, with `rp: <command>: worktrees to remove hold files their branches lack: commit or delete them, then plan again:` and a line `<path>: <files>` for each. `stop` keeps such a lane instead (§ `stop` and `close`).

The lines come in the order the orchestrator acts on them. A plan that names a turn to land holds only the frontier and each turn to land between `before-landing-lane` and `after-landing-lane`. Any other plan lists the frontier; the files to fix and to repair; the `before-removing-worktree` and `before-creating-worktree` hooks; the actions; the matching `after-` hooks and each `phase-started`; and each role to wake between `before-spawning-agent` and `after-spawning-agent`, which fire only when the orchestrator spawns the role. A lane's role is followed by `before-landing-lane` and `after-landing-lane`, which fire around its landing, once its turn ends.

1. **Unlanded commits.** A lane's **unlanded commits** are the commits of its branch that landing has not brought onto the tip. A production lane lands by merge: each commit of its branch the tip does not reach. A review lane lands by cherry-pick: each commit `git cherry <tip> <lane branch>` marks `+`, other than a review base or a review head, and each merge commit the tip does not reach. For every configured lane whose branch holds some, whatever the frontier, `next` computes its landing (§ `land`) from commits alone; a lane whose turn the turn record does not hold on that branch (§ `land`) stops `next`:
   - When the landing would bring no malformed file, the lane holds a turn that ended without landing: the plan names it to land.
   - Otherwise the lane is **under repair**: on any frontier but `escalate`, its role is woken in its worktree as it stands, its branch not moved, with each such file's line among its malformed files, and the plan names each line with `repair`. A lane under repair is dispatched for nothing else.

   A lane holding unlanded commits is never moved back, rebuilt, or removed.
2. **Frontier lines.** Each frontier line:

   | Frontier line | Plan |
   | --- | --- |
   | `produce <artifact> <lane>`, `respond <artifact> <lane>` | The lane's branch at the tip, with a worktree; its producer woken there |
   | `consolidate <artifact>` | The worktrees of the phase's production lanes removed and their branches deleted; the artifact's producer woken in the pipeline worktree on a new instance |
   | `produce <artifact>`, `respond <artifact>` | Its owner woken in the pipeline worktree |
   | `review <lane>` | The lane's branch at the review head built from the tip, with a worktree; its reviewer woken there |
   | `malformed <path>: <reason>` | Each role that writes a malformed file (§ Assignments), seated as for its lane's line or in the pipeline worktree; each malformed file no role writes, to fix |
   | `escalate <thread>`, `complete` | Nothing |
3. **Seats.** A role without a lane sits in the pipeline worktree, on the pipeline branch. A lane's role sits in the worktree that has its lane branch checked out, `<pipeline branch>-<spec | design-doc>-<lane>` or `<pipeline branch>-review-<lane>`; when none has, the plan creates one at `<worktree folder root>/<lane branch>`. A production lane's branch is created at the tip or moved forward to it. A review lane's branch is created at the review head built from the tip (§ Review lanes), or moved to it unless it is at a review head that already holds what building it would give: each of the review head and its review base holding the tree building gives, the review base on the current merge-base. A worktree that exists is not created and a branch at its target is not moved, so while the tip stays, a plan printed after the plan was applied names nothing to create, remove, or move.
4. **Woken roles.** Each is named with its profile, its lane, its model name as `config.json` gives it, its phase, its worktree, its assignment, `rp/<profile>.md` in the worktree's private git directory, and the names of the resources its assignment carries: those whose `profiles` hold its profile, none on a reviewer's repair turn. Only a consolidation needs a new instance.
5. **`phase-started`** is named for each phase of the woken roles that the last applied step woke no role of.

### Applying

With `--apply`, `next` prints the plan and, unless it names a turn to land, carries it out in this order:

1. It removes each worktree with `git worktree remove`, stopping on one that has come to hold a file Git does not ignore that its branch lacks since it was planned.
2. It deletes, creates, and moves each branch, building a review lane's review head first. Each turn on a branch it deletes leaves the turn record as the branch goes. A branch a worktree has checked out moves with `git reset --keep` there, which stops on local changes it would overwrite.
3. It creates each worktree.
4. It writes each woken role's assignment (§ Assignments), its turn commit the tip of its worktree, and then the turn record.

It changes no other ref or worktree, leaves the pipeline branch where it is, changes no file in the pipeline worktree's tree, and starts, messages, or stops no role. A failed action stops it with `rp: next --apply: <action>: <reason>`; the actions before it stay done, and applying again, once the cause is repaired, plans and applies only what remains. An assignment written again for an unchanged turn is byte-identical.

### Review lanes

The **lane's view** of the pipeline is, at the tip, every file under `<pipeline folder>/0-intent/` and every thread `threads/<n>-reviewer-<lane>-implementer-implementation.md` or `threads/<n>-reviewer-<lane>-owner-intent.md`. The review head built from the tip is the second of two commits, built through a temporary index from commits alone, so no worktree's index, `HEAD`, or files affect them:

1. **Review base**: the merge-base's tree (§ Net change and approval) with the pipelines folder root replaced by the **lane's root**: the tip's root without its pipeline folders (§ Pipeline files), plus the lane's view; its parent is the merge-base; its message is `rp review base`.
2. **Review head**: the tip's tree with the root replaced by the same lane's root; its parent is the review base; its message is `rp review head`.

`git diff <review base> <review head>` is the net change; the root's tooling stays, at the tip's version, and the lane's tree and history hold no other pipeline.

### Turn record

The turn record is `rp-turns/<pipeline branch>.json` in the repository's common git directory, so it outlives the pipeline worktree: a JSON object holding `folder`, the pipeline folder; `turns`, each woken role's latest turn by its name, with its `worktree`, `branch`, turn `commit`, and a review lane's `review-head`, each commit a full hash; `woke`, the phases of the roles the last applied step woke; `complete`, the phases complete when it was applied; and `reported`, the phases its landings reported. `start` creates it, applying writes it, landing adds to `reported`, and `close` removes it: while it exists, the pipeline is this machine's. A turn record that names another pipeline folder stops every command that reads it.

Everything `check` stops on, a detached pipeline worktree, a turn record that cannot be read or is malformed, a `base-branch` that does not resolve, an unreadable or malformed template, and a git failure stop `next`.

## `land`

```text
node rp.mjs land <pipeline folder> --role <role>
```

`<pipeline folder>` is in the pipeline worktree, as for `next`. `land` lands the turn the turn record holds for `<role>`:

1. **Verify.** The turn record holds the role's turn on the branch the pipeline branch gives the role (§ Plan), and that branch exists and holds the turn commit; otherwise `land` stops, naming the role's worktree when the record holds its turn.
2. **Bring.** From commits alone. A production lane's branch, when it holds unlanded commits (§ `next`), is merged into the tip. A review lane's unlanded commits after its review head are picked onto the tip one by one, keeping their authors and messages, and none of the commits that built the review head. A role in the pipeline worktree has its commits on the tip already. A conflict, or a merge commit among a review lane's unlanded commits, stops `land`.
3. **Validate.** The pipeline files the turn's unlanded commits change, or for a role in the pipeline worktree its commits after its turn commit, are validated as `check` validates them, as the pipeline branch would hold them after the landing. A malformed one stops `land` with `rp: land: <worktree>: the turn brings malformed files:`, then each `malformed <path>: <reason>` line as `check` prints it. Whatever stops `check` on the pipeline after the landing, such as a `base-branch` that does not resolve, stops `land` too.
4. **Certify.** It writes `certification/<path>.json` (§ Certification) for the role's artifact or candidate when it exists, at the turn commit, and for each approval among the files the turn brings, at the commit its reviewer's last message names, with `approved-commit` the last commit brought, the pipeline commit holding it. An approval whose named commit does not resolve, or whose code outside the pipelines folder root differs from that pipeline commit's, lands uncertified, any certification its path held removed, so its lane is not approved. A review thread the turn brings `open` or `withdrawn` loses its certification the same way. `inputs` are the file's required inputs at their identities in that commit's tree, whether or not the turn changed the file, so a response that leaves its artifact unchanged becomes fresh, and an input committed after that commit is not certified. Only what certifying reads at that commit is validated there: the intent, every later input (its `target` says whether it applies), the file's upstream artifacts, and a candidate's previous candidates; one of them malformed, or a required input missing, stops `land`. The threads an artifact's owner opened to `owner` are read there too. While one is malformed there, the artifact's required inputs are not known and its certification is left as it is: the turn that follows the thread's repair certifies it.
5. **Commit.** It commits the merge and then the certifications that change or are removed, each subject naming what it landed, such as `Merge spec lane a` or `Certify spec`, in the `landing-commit-format` template when one is set. A landing that changes no certification and brings no commit makes no commit.
6. **Move.** It fast-forwards the pipeline worktree to its last commit with `git merge --ff-only`, which stops on local changes it would overwrite.
7. **Report.** It prints `hook phase-completed <phase>` for each phase complete after the landing (§ Complete phases) that was not complete when the step was applied and that no earlier landing of the step reported, in phase order, and adds them to the turn record.

Every check comes before the pipeline branch moves, so a stop leaves the pipeline branch, the pipeline worktree, and every certification as they were. A role with no recorded turn, everything `check` stops on, a detached pipeline worktree, a turn record that cannot be read or is malformed, and a git failure also stop `land`.

## `stop` and `close`

```text
node rp.mjs stop <pipeline folder> --branch <pipeline branch> [--apply]
node rp.mjs close <pipeline folder> --branch <pipeline branch> [--apply]
```

`<pipeline folder>` and `--branch` are as for `start`: the pipeline is read from its branch and its turn record, whichever worktree, if any, has the branch checked out. A pipeline branch with no turn record has nothing `start` made on this machine, so both print nothing. `stop` prints what a stopped run leaves to remove, and `close` what a pipeline that is merged or closed without merging does, in the lines of § Plan: the `before-removing-worktree` hooks, each lane's `remove-worktree`, each `delete-branch`, the pipeline worktree's `remove-worktree`, and the `after-removing-worktree` hooks. Neither changes anything without `--apply`, and a pipeline with nothing to remove prints nothing.

A lane is the pipeline's here while the turn record holds its turn as `land` verifies it, whether or not `config.json` still declares the lane; a branch or worktree that only bears a lane's name is left alone. A lane **holds work that has not landed** while its branch holds unlanded commits (§ `next`) or its worktree holds a file Git does not ignore that its branch lacks, modified or untracked.

| | `stop` | `close` |
| --- | --- | --- |
| A lane's worktree | Removed unless the lane holds work that has not landed | Removed |
| A lane's branch | Deleted unless the lane holds work that has not landed | Deleted unless it holds unlanded commits |
| The pipeline worktree | Kept | Removed, named with `pipeline` where a lane's line names its role, unless it is the main checkout |
| The pipeline branch | Kept | Kept |

With `--apply`, each first takes out of the turn record each turn of the pipeline's lanes whose branch is gone, then removes the lanes' worktrees and deletes the branches as `next --apply` does (§ Applying), and last removes the pipeline worktree. `close` then keeps in the turn record only the turns of the lanes whose branches it keeps, and removes the record when none remain. Neither changes another ref, worktree, or remote. A failed action stops it with `rp: <command> --apply: <action>: <reason>`; the actions before it stay done, and applying again plans and applies only what remains, so a closed pipeline closed again prints nothing. A turn record whose pipeline branch does not exist, one that cannot be read, is malformed, or names another pipeline folder, a worktree Git records whose folder is missing, a lane's recorded worktree that Git still records and no longer has its branch checked out, and a git failure stop both; a worktree to remove that holds a file its branch lacks stops `close` (§ Plan).

## `thread`

```text
node rp.mjs thread open <pipeline folder> --role <role> --about <spec | design-doc | implementation> --body <file | ->
node rp.mjs thread reply <pipeline folder> --role <role> --thread <thread file> --body <file | ->
node rp.mjs thread close <pipeline folder> --role <role> --thread <thread file> --status <approved | resolved | withdrawn> [--body <file | ->]
node rp.mjs thread escalate <pipeline folder> --role <role> --cites <thread path | evidence path> --body <file | ->
```

`thread` writes a thread (§ Threads) in the working tree of the worktree that holds `<pipeline folder>`, as `--role`, around each message's body: the bytes of the file `--body` names, or of standard input for `-`, written as given. It reads only the thread it writes and the names in `threads/`, never the pipeline configuration, so it works alike in a review lane's tree, a production lane's worktree, and the pipeline worktree.

- `open` writes `threads/<n>-<role>-<recipient>-<about>.md`, `<recipient>` the owner of the artifact `--about` names, with status `open` and the role's message. `<n>` is one more than the highest number among the names `threads/<n>-….md` in the working tree, or 1 when it holds none; `threads/` is created when absent, and an existing file is never replaced.
- `escalate` writes `threads/<n>-<role>-owner-intent.md`, numbered the same way, with status `escalated`, `cites` the text given, quoted when the frontmatter needs it (§ Frontmatter), and the role's message.
- `reply` adds the role's message at the end of an `open` thread that awaits it, or of the role's **own approval**, its lane's review thread while that is an approval, which it sets `open`.
- `close` sets the status of an `open` thread the role opened to `approved` for a review thread or `resolved` for any other, or to `withdrawn`, and with `--body` adds the role's closing message at the end. A review thread is closed `approved` without `--body` only when its last message is the reviewer's and names the commit its worktree stands on, the commit `land` certifies the approval at. It closes the role's own approval `approved` again.

A message is its heading `## <role> — <commit>` on a line of its own after a blank line, `<commit>` the full hash of the worktree's `HEAD`, then a blank line and the body. Every other byte of the file stays as it was, but for the status the command sets. The command writes the file only when the file grammar (§ `validate`) accepts it and reads in it the messages the command means, the role's last, and would read a message written after the role's; it then prints the file's absolute path. It writes nothing else: no certification, ref, or other file. Every other use is wrong, and writes nothing:

- `open` or `escalate` by a production lane's role; `open` about the intent, or about the artifact the role owns; `escalate` whose `--cites` is empty;
- a `--thread` that names no thread file of the pipeline folder, or a file the file grammar rejects;
- `reply` to a thread that neither awaits the role nor is its own approval; `close` of a thread that is neither `open` nor the role's own approval, by a role other than its opener, or with another status, such as `approved` on a thread other than a review thread, or any but `approved` on its own approval; an approval without `--body` that the last message does not name;
- a body of whitespace alone, a body holding a line the grammar reads as a message heading, or one leaving fenced code open, which hides every heading after it.

The owner's answer on a thread to `owner` is written by hand (`../reference/run/loop.md` § Owner escalation).

## `validate`

```text
node rp.mjs validate <pipeline folder> --role <role> [--file <path>]
```

`validate` checks the role's files (§ Assignments) as they stand in the working tree of the worktree that holds `<pipeline folder>`, committed or not, or with `--file` that one of them alone. It applies the **file grammar**, every check `check` makes of a pipeline file that reads the file alone, and prints `malformed <path>: <reason>` for each file it rejects, as `check` prints it; otherwise `accepted: every file of <role>`, or `accepted: <path>` with `--file`. It reads no pipeline configuration and no other file, so it works in every seat, and changes nothing. The two checks that read `config.json`, of an `open` thread awaiting a review lane it does not declare and of a candidate of a production lane it does not declare, reach a role through `land` alone. A `--file` outside the pipeline folder, or none of the role's files, is a wrong use; a role's file that cannot be read, a path of the wrong kind where a role's file or a folder holding one belongs, or a `--file` that is missing, stops it, as it stops `check`.

## Assignments

`next --apply` writes the assignment of each role it wakes, from `config.json`, whichever worktree the role sits in.

1. **Turn.** The frontier line that wakes the role gives its turn:

   | Frontier line | Role and turn |
   | --- | --- |
   | `produce <artifact>` | Its owner, mode Produce; Implement for the implementer |
   | `respond <artifact>` | Its owner, mode Respond |
   | `consolidate <artifact>` | Its owner, mode Consolidate |
   | `produce <artifact> <lane>` | The lane, mode Produce |
   | `respond <artifact> <lane>` | The lane, mode Respond |
   | `review <lane>` | The lane's reviewer |
   | `malformed <path>: <reason>` | Each role that writes a malformed file; a producer or the implementer in Respond, a reviewer on its repair turn |

   A role writes its artifact or candidate, and every thread whose file name names it as opener or recipient: its **files**. The `malformed` lines of those files, and only those, are its malformed files. A lane under repair (§ `next`) gets the turn of a `malformed` line for each malformed file its landing would bring.
2. **Template.** A reviewer with malformed files gets the repair template. Otherwise its review thread is its highest-numbered `threads/<n>-reviewer-<lane>-implementer-implementation.md`. While that thread is `open` or an approval, the template is the later-turn one, and `reviewer.diff` is written beside the assignment: the diff to the review head from the commit the lane last reviewed merged with the merge-base (§ Net change and approval), outside the pipelines folder root, so it holds what the lane has not reviewed: nothing a clean merge of the base branch brought, and a conflict's markers where its resolution is. The assignment lists the paths that conflict outside the pipelines folder root. That commit is an approval's approved commit, else the one the reviewer's last message names. The assignment lists the inputs that changed since the lane read them: the changed inputs of a certified approval, else the intent and later inputs that differ from that commit. Otherwise, as with an approval whose commit does not resolve, it is the first-turn one.
3. **Write.** The template (`../templates/README.md`) is filled and written at the path `git rev-parse --git-path rp/<profile>.md` gives in the role's worktree, replacing the previous turn's. Every model name is written as `config.json` writes it, and each assignment states the command that runs `rp` as its role from its worktree (`../templates/README.md` § Values). Each path on that command line is one POSIX shell word, quoted when a character in it is one a shell does not take literally; each path an assignment shows for reading is as written.

### Placeholders

A placeholder is `{<name>}` in a guardrail's, a resource's, or the commit format's text, or in a lane's or a consolidation brief, `<name>` matching `[a-z][a-z0-9-]*`, with no brace beside either of its braces; every other brace is text. In an assignment, each placeholder that names a pipeline fact or a variable is replaced by its value for the role, in one pass; a variable's value is its template with each fact replaced.

| Pipeline fact | Value |
| --- | --- |
| `pipeline-slug` | The pipeline folder's name |
| `role` | `<profile>` or `<profile>-<lane>` |
| `profile` | The role's profile |
| `lane` | The lane id; empty for a role without a lane |
| `worktree` | The absolute path of the role's worktree |
| `branch` | The role's branch |
| `merge-base` | The merge-base of the role's turn commit with `config.json`'s `base-branch` |

A placeholder that names neither stays as written, and the assignment then lists every pipeline fact with its value.

## Decisions

These fill details the specification leaves open; the prose aligns with them.

- **A thread to `owner`** opens as `escalated` and closes `answered`; `open`, `approved`, `resolved`, and `withdrawn` are malformed there.
- **A message by `owner`** on any thread leaves it awaiting the thread's recipient.
- **A woken opener** gets `produce` when its artifact is missing and `respond` otherwise, with the threads awaiting it. Beyond the target, a thread's recipient gets `respond` even when its artifact is missing.
- **An approval is merged with the merge-base**, not the base branch's tip, so a base branch that moved without being merged leaves approvals fresh.
- **Strict keys**: unknown frontmatter, pipeline configuration, and certification keys make a file malformed or stop the command.
